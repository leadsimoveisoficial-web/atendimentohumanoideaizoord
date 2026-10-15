import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speechLevel, voiceLevel } from "@/lib/voice-level";

/** Record the visitor, then Zoord replays it with the LED mouth driven by the recording's amplitude. */
export function RecordRepeat() {
  const [state, setState] = useState<"idle" | "recording" | "ready" | "playing">("idle");
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const url = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const raf = useRef(0);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    voiceLevel.v = 0;
    rec.current?.stream.getTracks().forEach((t) => t.stop());
    if (url.current) URL.revokeObjectURL(url.current);
    void ctx.current?.close().catch(() => {});
  }, []);

  const record = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(new Blob(chunks, { type: r.mimeType }));
        setState("ready");
      };
      r.start();
      rec.current = r;
      setState("recording");
    } catch {
      setError("Permita o microfone para gravar.");
    }
  };

  const play = async () => {
    if (!url.current) return;
    if (!ctx.current) ctx.current = new AudioContext();
    await ctx.current.resume();
    const el = new Audio(url.current);
    audio.current = el;
    const src = ctx.current.createMediaElementSource(el);
    const analyser = ctx.current.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ctx.current.destination);
    const samples = new Float32Array(256);
    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      voiceLevel.v = speechLevel(samples);
      raf.current = requestAnimationFrame(tick);
    };
    el.onended = () => {
      cancelAnimationFrame(raf.current);
      voiceLevel.v = 0;
      src.disconnect();
      setState("ready");
    };
    setState("playing");
    await el.play();
    tick();
  };

  return (
    <>
      {state === "recording" ? (
        <Button variant="ghost" className="stage-chip" onClick={() => rec.current?.stop()}><Square />Parar gravação</Button>
      ) : (
        <Button variant="ghost" className="stage-chip" onClick={record} disabled={state === "playing"}><Mic />Gravar minha voz</Button>
      )}
      {(state === "ready" || state === "playing") && (
        <Button variant="ghost" className="stage-chip" onClick={play} disabled={state === "playing"}><Play />Zoord repete</Button>
      )}
      {error && <span className="stage-chip" role="alert">{error}</span>}
    </>
  );
}
