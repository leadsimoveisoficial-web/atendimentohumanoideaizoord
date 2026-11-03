import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { createPlaybackMeter } from "@/lib/voice-level";
import { createFreeListener, recognitionSupported, type FreeListener } from "@/lib/free-listen";
import { isCustomerBargeIn, recognitionLang, ZOORD_LANGUAGES, type ZoordLanguage } from "@/lib/zoord-language";
import { stopFreeSpeech } from "@/lib/free-speech";
import { speakZoord } from "@/lib/zoord-voice";
import { takeSentences } from "@/lib/speech-chunks";
import { categoryScript, guessCategory } from "@/lib/menu-script";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { motionCentroid, setCameraGaze } from "@/lib/gaze";
import { createArrivalDetector } from "@/lib/arrival";
import type { NewOrder } from "@/lib/orders";
import { emptyReaction, reactToCustomer } from "@/lib/zoord-interaction";
import { dispatchMusic, musicCommand, type MusicCommand } from "@/lib/music";
import { StagePresence } from "./StagePresence";
import { useAccount } from "./UserAccount";

export type LiveZoordCommands = { present: (category: number | null) => void; say: (text: string) => void };

export const LiveZoord = forwardRef<LiveZoordCommands, { onPoint: (i: number | null) => void; onGreeting: () => void; onListening: (active: boolean) => void; onOrder?: (order: NewOrder) => void }>(function LiveZoord({ onPoint, onGreeting, onListening, onOrder }, ref) {
  const [caption, setCaption] = useState("");
  const [thinking, setThinking] = useState(false);
  const [cam, setCam] = useState(false);
  const [freeMode, setFreeMode] = useState(true);
  const [freeActive, setFreeActive] = useState(false);
  const [freeError, setFreeError] = useState("");
  const [phase, setPhase] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [camPending, setCamPending] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingMenu = useRef<{ category: number | null } | null>(null);
  const playbackMeter = useRef<ReturnType<typeof createPlaybackMeter> | null>(null);
  const reaction = useRef(emptyReaction());
  const listeningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // One consistent voice for the whole conversation: no mid-talk switch from the live voice.
  const freeModeRef = useRef(true);
  const freeConversationOn = useRef(false);
  const freeListener = useRef<FreeListener | null>(null);
  const freeBusy = useRef(false);
  const freeAbort = useRef<AbortController | null>(null);
  const freeHistory = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const lastMusic = useRef("");
  const [language, setLanguageState] = useState<ZoordLanguage>("pt");
  const languageRef = useRef<ZoordLanguage>("pt");
  const { profile } = useAccount();
  const guestRef = useRef<{ name?: string; address?: string; notes?: string } | undefined>(undefined);
  guestRef.current = profile ? { name: profile.display_name, address: profile.form_of_address, notes: profile.food_notes } : undefined;
  const speakingText = useRef("");

  // Barge-in: the customer started talking over Zoord → stop speech at once and listen.
  function interruptSpeech() {
    freeAbort.current?.abort();
    freeAbort.current = null;
    freeBusy.current = false;
    speakingText.current = "";
    stopFreeSpeech();
    onPoint(null);
    setPhase("listening");
  }

  function selectLanguage(next: ZoordLanguage) {
    if (next === languageRef.current) return;
    languageRef.current = next;
    setLanguageState(next);
    if (freeBusy.current) interruptSpeech();
    freeListener.current?.setLang(recognitionLang(next));
  }

  function handleMusic(text: string): MusicCommand | null {
    const command = musicCommand(text);
    if (command) dispatchMusic(command);
    return command;
  }

  const call = useLiveVoice({
    onEvent: (e: LiveEvent) => {
      if (e.type === "app.point") onPoint(typeof e["category"] === "number" ? e["category"] as number : null);
      if (e.type === "app.order" && e["order"] && typeof e["order"] === "object") onOrder?.(e["order"] as NewOrder);
      if (e.type === "app.delegation.pending") setThinking(true);
      if (e.type === "session.output_transcript.delta" && typeof e["delta"] === "string") {
        setThinking(false);
        setCaption((c) => (c + (e["delta"] as string)).slice(-180));
      }
      if (e.type === "session.input_transcript.delta" && typeof e["delta"] === "string") {
        setCaption("");
        const result = reactToCustomer(reaction.current, e["delta"], typeof e["start_ms"] === "number" ? e["start_ms"] : reaction.current.endMs, typeof e["end_ms"] === "number" ? e["end_ms"] : reaction.current.endMs);
        const newTurn = typeof e["start_ms"] === "number" && e["start_ms"] - reaction.current.endMs > 1800;
        reaction.current = result.state;
        const command = musicCommand(result.state.text);
        const signature = JSON.stringify(command);
        if (newTurn) lastMusic.current = "";
        if (command && signature !== lastMusic.current) { dispatchMusic(command); lastMusic.current = signature; }
        onListening(true);
        if (listeningTimer.current) clearTimeout(listeningTimer.current);
        listeningTimer.current = setTimeout(() => onListening(false), 1800);
        if (result.wave) { onPoint(null); onGreeting(); }
      }
      if (e.type === "session.output_transcript.delta" || e.type === "app.stopping" || e.type === "app.closed") {
        if (listeningTimer.current) clearTimeout(listeningTimer.current);
        onListening(false);
      }
      if (e.type === "app.closed") { reaction.current = emptyReaction(); lastMusic.current = ""; setThinking(false); setCaption(""); onPoint(null); }
    },
  });
  const live = call.status === "connecting" || call.status === "connected";
  const stopping = call.status === "stopping";

  // Out of credits → switch to the free voice automatically, no lost clicks.
  useEffect(() => {
    if (call.error && !freeModeRef.current && /crédito|credito|402|esgotad|microfone|permission/i.test(call.error)) enterFreeMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.error]);

  // A live call stuck connecting (credits out, gateway unreachable) → free mode.
  useEffect(() => {
    if (freeModeRef.current || call.status !== "connecting") return;
    const t = setTimeout(() => {
      if (!freeModeRef.current) {
        call.stop();
        enterFreeMode();
      }
    }, 12000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.status]);

  useEffect(() => () => {
    if (listeningTimer.current) clearTimeout(listeningTimer.current);
    freeListener.current?.stop();
    freeAbort.current?.abort();
    stopFreeSpeech();
  }, []);

  function enterFreeMode() {
    freeModeRef.current = true;
    setFreeMode(true);
    call.stop();
  }

  function stopFreeConversation() {
    freeConversationOn.current = false;
    freeListener.current?.stop();
    freeListener.current = null;
    freeAbort.current?.abort();
    freeAbort.current = null;
    freeBusy.current = false;
    setPhase("idle");
    stopFreeSpeech();
    setFreeActive(false);
    onListening(false);
    onPoint(null);
  }

  function freePresent(category: number | null) {
    stopFreeConversation();
    onPoint(category);
    const ac = new AbortController();
    freeAbort.current = ac;
    setFreeError("");
    setFreeActive(true);
    setPhase("speaking");
    speakZoord(categoryScript(category), { lang: languageRef.current, signal: ac.signal })
      .catch((error: unknown) => { if (!ac.signal.aborted) setFreeError(error instanceof Error ? error.message : "Não consegui reproduzir a voz agora."); })
      .finally(() => {
        if (freeAbort.current === ac) {
          freeAbort.current = null;
          setFreeActive(false);
          setPhase("idle");
          onPoint(null);
        }
      });
  }

  async function answerFree(text: string) {
    const lang = languageRef.current;
    if (freeBusy.current) return;
    freeBusy.current = true;
    setFreeError("");
    setPhase("thinking");
    onListening(false);
    // Listening stays on while Zoord speaks so the customer can interrupt (echo is filtered).
    const ac = new AbortController();
    freeAbort.current = ac;
    try {
      const command = handleMusic(text);
      if (command) {
        setPhase("speaking");
        speakingText.current = "rádio pausada selecionei estilo gostaria ouvir";
        await speakZoord(command.action === "choose"
          ? "Que estilo gostaria de ouvir? Forró, pagode, sertanejo, eletrônico, hip-hop, rock nacional clássico, blues e jazz, hits do momento ou rock internacional?"
          : command.action === "stop" ? "Rádio pausada, à sua disposição."
          : "Selecionei a rádio. Se o navegador pedir, toque no botão de tocar música.", { lang, signal: ac.signal });
        return;
      }
      const res = await fetch("/api/zoord-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: freeHistory.current.slice(-24), language: lang, guest: guestRef.current, image: captureFrame() }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error("Não consegui responder agora. Tente novamente.");
      const category = guessCategory(text);
      if (category !== null) onPoint(category);
      // Speak each sentence as soon as it arrives; playback stays sequential with the same voice.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      let pending = "";
      let queue: Promise<unknown> = Promise.resolve();
      const enqueue = (sentence: string) => {
        queue = queue.then(() => {
          ac.signal.throwIfAborted();
          setPhase("speaking");
          speakingText.current = answer;
          return speakZoord(sentence, { lang, signal: ac.signal });
        });
        queue.catch(() => undefined);
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        answer += chunk;
        const { ready, rest } = takeSentences(pending + chunk);
        pending = rest;
        ready.forEach(enqueue);
      }
      ac.signal.throwIfAborted();
      if (pending.trim()) enqueue(pending.trim());
      if (!answer.trim()) throw new Error("Não consegui responder agora. Tente novamente.");
      speakingText.current = answer;
      freeHistory.current = [...freeHistory.current, { role: "user" as const, content: text }, { role: "assistant" as const, content: answer.trim() }].slice(-24);
      await queue;
    } catch (e) {
      if (!ac.signal.aborted) setFreeError((e as Error).message || "Não consegui responder agora.");
    } finally {
      if (freeAbort.current === ac) {
        freeAbort.current = null;
        freeBusy.current = false;
        speakingText.current = "";
        onPoint(null);
        if (freeConversationOn.current) { freeListener.current?.start(); setPhase("listening"); }
        else setPhase("idle");
      }
    }
  }

  function startFreeConversation() {
    if (freeConversationOn.current) return;
    if (!recognitionSupported()) {
      setFreeError("Seu navegador não tem escuta de voz gratuita. Use o Chrome, ou toque em Apresentar cardápio.");
      return;
    }
    setFreeError("");
    freeConversationOn.current = true;
    setFreeActive(true);
    try {
      freeListener.current = createFreeListener({
        lang: recognitionLang(languageRef.current),
        onInterim: (heard) => {
          setFreeError("");
          if (freeBusy.current) {
            if (!isCustomerBargeIn(heard, speakingText.current)) return;
            interruptSpeech();
          }
          onListening(true);
        },
        onActive: (active) => { if (!freeBusy.current) setPhase(active ? "listening" : "idle"); onListening(active && !freeBusy.current); },
        onFinal: (text) => {
          if (freeBusy.current) {
            if (!isCustomerBargeIn(text, speakingText.current)) return;
            interruptSpeech();
          }
          const result = reactToCustomer(reaction.current, text, Date.now(), Date.now());
          reaction.current = result.state;
          onListening(true);
          if (listeningTimer.current) clearTimeout(listeningTimer.current);
          listeningTimer.current = setTimeout(() => onListening(false), 1800);
          if (result.wave) { onPoint(null); onGreeting(); }
          void answerFree(text);
        },
        onError: (message) => { freeConversationOn.current = false; setFreeActive(false); setPhase("idle"); onListening(false); setFreeError(message); },
      });
      freeListener.current.start();
    } catch (e) {
      freeConversationOn.current = false;
      setFreeActive(false);
      setFreeError((e as Error).message || "Não consegui ligar a escuta gratuita.");
    }
  }

  const onGreetingRef = useRef(onGreeting);
  onGreetingRef.current = onGreeting;
  const callStatusRef = useRef(call.status);
  callStatusRef.current = call.status;
  const welcomeRef = useRef(() => {});

  function sayText(text: string) {
      // All manual introductions belong to this controller; never open the microphone.
    call.stop();
    stopFreeConversation();
    const ac = new AbortController();
    freeAbort.current = ac;
    setFreeError("");
    setFreeActive(true);
    setPhase("speaking");
    void speakZoord(text, { lang: languageRef.current, signal: ac.signal })
      .catch(() => { if (!ac.signal.aborted) setFreeError("Não consegui falar agora. A música continua disponível."); })
      .finally(() => { if (freeAbort.current === ac) { freeAbort.current = null; setFreeActive(false); setPhase("idle"); } });
  }
  const WELCOME = { pt: "Seja bem-vindo ao Dakkai Sushi! Toque em Falar com o Zoord quando quiser conversar.", en: "Welcome to Dakkai Sushi! Tap Talk to Zoord whenever you like.", es: "¡Bienvenidos a Dakkai Sushi! Toque Hablar con Zoord cuando quiera." } as const;
  welcomeRef.current = () => sayText(WELCOME[languageRef.current]);

  useImperativeHandle(ref, () => ({
    say: sayText,
    present(category) {
      if (freeModeRef.current) {
        freePresent(category);
        return;
      }
      playbackMeter.current?.resume();
      setCaption("");
      onPoint(category);
      if (call.status === "connected") call.sendMenu(category);
      else if (call.status === "connecting" || stopping) pendingMenu.current = { category };
      else call.start({ category });
    },
  }), [call.status, call.sendMenu, call.start, onPoint, stopping]);

  useEffect(() => {
    if (call.status === "connected" && pendingMenu.current) {
      call.sendMenu(pendingMenu.current.category);
      pendingMenu.current = null;
    }
    if (call.status === "closed") pendingMenu.current = null;
  }, [call.status, call.sendMenu]);

  // One output graph stays mounted across connecting, captions, and menu changes.
  useEffect(() => {
    const audio = call.audioRef.current;
    if (!audio) return;
    const output = createPlaybackMeter(audio);
    playbackMeter.current = output;
    return () => { playbackMeter.current = null; output.dispose(); };
  }, [call.audioRef]);

  function captureFrame() {
    const video = videoRef.current;
    if (!streamRef.current || !video?.videoWidth || video.readyState < 2) return undefined;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = Math.round(video.videoHeight / video.videoWidth * 512);
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.65);
  }

  // Preview remains local; a frame is sent only with the customer's spoken turn.
  useEffect(() => {
    if (cam && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cam]);

  // Follow the customer's movement on camera with Zoord's head (runs locally, nothing is sent).
  useEffect(() => {
    if (!cam) return;
    const W = 32, H = 24;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let prev: Uint8ClampedArray | null = null;
    const arrival = createArrivalDetector();
    const t = setInterval(() => {
      const v = videoRef.current;
      if (!ctx || !v || !v.videoWidth) return;
      ctx.drawImage(v, 0, 0, W, H);
      const next = ctx.getImageData(0, 0, W, H).data;
      const c = prev && motionCentroid(prev, next, W, H);
      const hadPrev = prev !== null;
      prev = next;
      if (c) setCameraGaze(-(c.x * 2 - 1), c.y * 2 - 1);
      // Someone stepped in front after a quiet moment: wave and offer a short welcome when idle.
      if (hadPrev && arrival(Boolean(c), performance.now())) {
        onGreetingRef.current();
        const idle = !freeAbort.current && callStatusRef.current !== "connected" && callStatusRef.current !== "connecting";
        if (idle) welcomeRef.current();
      }
    }, 120);
    return () => clearInterval(t);
  }, [cam]);

  useEffect(() => {
    if (!cam || call.status !== "connected") return;
    const canvas = document.createElement("canvas");
    const t = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      const w = 384, h = Math.round((v.videoHeight / v.videoWidth) * w);
      canvas.width = w; canvas.height = h;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(v, 0, 0, w, h);
      call.sendFrame(canvas.toDataURL("image/jpeg", 0.6));
    }, 2000);
    return () => clearInterval(t);
  }, [cam, call.status, call.sendFrame]);

  const toggleCam = async () => {
    if (camPending) return;
    if (cam) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCam(false);
      call.sendFrame(null);
      return;
    }
    setCamPending(true);
    setFreeError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = s;
      s.getVideoTracks().forEach((track) => { track.onended = () => { streamRef.current = null; setCam(false); }; });
      setCam(true);
    } catch {
      setFreeError("Não consegui acessar a câmera. Confira a permissão e se ela está sendo usada em outro aplicativo.");
    } finally { setCamPending(false); }
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const freeListening = phase === "listening";

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <audio ref={call.audioRef} autoPlay className="hidden" />
      <StagePresence show={cam} className="fixed bottom-6 right-6 z-40">
        <video ref={videoRef} autoPlay muted playsInline className="stage-glass h-28 w-36 object-cover" />
      </StagePresence>
      
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!live ? (
          <Button
            variant="ghost"
            onClick={() => {
              if (freeModeRef.current) {
                if (freeConversationOn.current) stopFreeConversation();
                else startFreeConversation();
              } else {
                playbackMeter.current?.resume();
                call.start();
              }
            }}
            disabled={stopping}
            className="stage-chip stage-chip-red"
          >
            <Mic />
            {freeModeRef.current
              ? freeConversationOn.current ? freeListening ? "Ouvindo… (encerrar)" : phase === "thinking" ? "Pensando… (encerrar)" : "Falando… (encerrar)" : "Falar com o Zoord"
              : stopping ? "Encerrando…" : "Falar com o Zoord"}
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={call.stop} className="stage-chip stage-chip-active">
              <PhoneOff />{call.status === "connecting" ? "Conectando… (encerrar)" : "Ao vivo — encerrar"}
            </Button>
            <Button variant="ghost" disabled={call.status !== "connected"} onClick={() => call.setMuted(!call.muted)} className="stage-chip">{call.muted ? <MicOff /> : <Mic />}{call.muted ? "Ativar microfone" : "Silenciar"}</Button>
          </>
        )}
        <Button variant="ghost" onClick={toggleCam} disabled={camPending} className={`stage-chip ${cam ? "stage-chip-active" : ""}`}>{cam ? <CameraOff /> : <Camera />}{camPending ? "Abrindo câmera…" : cam ? "Câmera ligada" : "Câmera"}</Button>
        <div role="radiogroup" aria-label="Idioma do Zoord" className="stage-chip flex items-center gap-1 px-1">
          {ZOORD_LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={language === l.id}
              title={l.label}
              onClick={() => selectLanguage(l.id)}
              className={`min-w-9 rounded-full px-2 py-1 text-xs font-semibold transition-colors ${language === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l.short}
            </button>
          ))}
        </div>
        {call.playbackBlocked && <Button variant="ghost" onClick={() => { playbackMeter.current?.resume(); call.resumePlayback(); }} className="stage-chip"><Volume2 />Tocar som</Button>}
      </div>
      <StagePresence show={Boolean(call.error || freeError)}><p role="alert" className="stage-glass max-w-xl p-3 text-center text-xs text-dakkai">{call.error || freeError}</p></StagePresence>
    </div>
  );
});
