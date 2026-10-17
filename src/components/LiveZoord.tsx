import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { createPlaybackMeter } from "@/lib/voice-level";
import { createFreeListener, recognitionSupported, type FreeListener, type SpeechLang } from "@/lib/free-listen";
import { stopFreeSpeech } from "@/lib/free-speech";
import { speakZoord } from "@/lib/zoord-voice";
import { categoryScript, guessCategory } from "@/lib/menu-script";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { motionCentroid, setCameraGaze } from "@/lib/gaze";
import type { NewOrder } from "@/lib/orders";
import { emptyReaction, reactToCustomer } from "@/lib/zoord-interaction";

export type LiveZoordCommands = { present: (category: number | null) => void };

export const LiveZoord = forwardRef<LiveZoordCommands, { onPoint: (i: number | null) => void; onGreeting: () => void; onListening: (active: boolean) => void; onOrder?: (order: NewOrder) => void }>(function LiveZoord({ onPoint, onGreeting, onListening, onOrder }, ref) {
  const [caption, setCaption] = useState("");
  const [thinking, setThinking] = useState(false);
  const [cam, setCam] = useState(false);
  const [freeMode, setFreeMode] = useState(false);
  const [freeActive, setFreeActive] = useState(false);
  const [freeError, setFreeError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingMenu = useRef<{ category: number | null } | null>(null);
  const playbackMeter = useRef<ReturnType<typeof createPlaybackMeter> | null>(null);
  const reaction = useRef(emptyReaction());
  const listeningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const freeModeRef = useRef(false);
  const freeConversationOn = useRef(false);
  const freeListener = useRef<FreeListener | null>(null);
  const freeBusy = useRef(false);
  const freeAbort = useRef<AbortController | null>(null);
  const freeHistory = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

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
        reaction.current = result.state;
        onListening(true);
        if (listeningTimer.current) clearTimeout(listeningTimer.current);
        listeningTimer.current = setTimeout(() => onListening(false), 1800);
        if (result.wave) { onPoint(null); onGreeting(); }
      }
      if (e.type === "session.output_transcript.delta" || e.type === "app.stopping" || e.type === "app.closed") {
        if (listeningTimer.current) clearTimeout(listeningTimer.current);
        onListening(false);
      }
      if (e.type === "app.closed") { reaction.current = emptyReaction(); setThinking(false); setCaption(""); onPoint(null); }
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
    setFreeActive(true);
    speakZoord(categoryScript(category), { signal: ac.signal })
      .catch(() => {})
      .finally(() => {
        if (freeAbort.current === ac) {
          freeAbort.current = null;
          setFreeActive(false);
          onPoint(null);
        }
      });
  }

  async function answerFree(text: string, lang: SpeechLang) {
    if (freeBusy.current) return;
    freeBusy.current = true;
    // Pause listening while Zoord speaks so the microphone doesn't hear itself.
    freeListener.current?.stop();
    const ac = new AbortController();
    freeAbort.current = ac;
    try {
      const res = await fetch("/api/zoord-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: freeHistory.current }),
        signal: ac.signal,
      });
      const data = await res.json();
      const answer = res.ok && data.text ? String(data.text) : "Estou com um pico de energia nos circuitos, mas você pode conferir o cardápio no painel ao lado e pedir direto pelo WhatsApp!";
      freeHistory.current = ([...freeHistory.current, { role: "user" as const, content: text }, { role: "assistant" as const, content: answer }]).slice(-6);
      const category = guessCategory(answer + " " + text);
      if (category !== null) onPoint(category);
      await speakZoord(answer, { lang, signal: ac.signal });
    } catch (e) {
      if (!ac.signal.aborted) setFreeError((e as Error).message || "Não consegui responder agora.");
    } finally {
      freeBusy.current = false;
      onPoint(null);
      if (freeConversationOn.current) freeListener.current?.start();
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
        lang: "pt-BR",
        onInterim: () => {},
        onFinal: (text, lang) => {
          const result = reactToCustomer(reaction.current, text, Date.now(), Date.now());
          reaction.current = result.state;
          onListening(true);
          if (listeningTimer.current) clearTimeout(listeningTimer.current);
          listeningTimer.current = setTimeout(() => onListening(false), 1800);
          if (result.wave) { onPoint(null); onGreeting(); }
          void answerFree(text, lang);
        },
        onError: (message) => setFreeError(message),
      });
      freeListener.current.start();
    } catch (e) {
      freeConversationOn.current = false;
      setFreeActive(false);
      setFreeError((e as Error).message || "Não consegui ligar a escuta gratuita.");
    }
  }

  useImperativeHandle(ref, () => ({
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

  // Camera: send a small snapshot every 2s to Zoord's brain
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
    const t = setInterval(() => {
      const v = videoRef.current;
      if (!ctx || !v || !v.videoWidth) return;
      ctx.drawImage(v, 0, 0, W, H);
      const next = ctx.getImageData(0, 0, W, H).data;
      const c = prev && motionCentroid(prev, next, W, H);
      prev = next;
      if (c) setCameraGaze(-(c.x * 2 - 1), c.y * 2 - 1);
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
    if (cam) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCam(false);
      call.sendFrame(null);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = s;
      setCam(true);
    } catch {
      alert("Não consegui acessar a câmera. Verifique a permissão do navegador.");
    }
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const freeListening = freeActive && !freeBusy.current;

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <audio ref={call.audioRef} autoPlay className="hidden" />
      {cam && (
        <video ref={videoRef} autoPlay muted playsInline className="fixed bottom-6 right-6 h-28 w-36 rounded-lg border border-border object-cover shadow-lg" />
      )}
      {freeMode && <span className="stage-chip !cursor-default !px-2.5 !py-1 !text-[10px]">Voz grátis do navegador ativa</span>}
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
              ? freeListening ? "Ouvindo… (encerrar)" : "Falar com o Zoord"
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
        <Button variant="ghost" onClick={toggleCam} className={`stage-chip ${cam ? "stage-chip-active" : ""}`}>{cam ? <CameraOff /> : <Camera />}{cam ? "Câmera ligada" : "Câmera"}</Button>
        {call.playbackBlocked && <Button variant="ghost" onClick={() => { playbackMeter.current?.resume(); call.resumePlayback(); }} className="stage-chip"><Volume2 />Tocar som</Button>}
      </div>
      {call.error && <p role="alert" className="max-w-xl text-center text-xs text-dakkai">{call.error}</p>}
      {freeError && <p role="alert" className="max-w-xl text-center text-xs text-dakkai">{freeError}</p>}
    </div>
  );
});
