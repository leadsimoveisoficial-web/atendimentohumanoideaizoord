import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPlaybackMeter } from "@/lib/voice-level";

/** Record the visitor, then Zoord replays it with the LED mouth driven by the recording's amplitude. */
export function RecordRepeat() {
  const [state, setState] = useState<"idle" | "recording" | "ready" | "playing">("idle");
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const url = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const meter = useRef<ReturnType<typeof createPlaybackMeter> | null>(null);

  useEffect(() => () => {
    audio.current?.pause();
    meter.current?.dispose();
    rec.current?.stream.getTracks().forEach((t) => t.stop());
    if (url.current) URL.revokeObjectURL(url.current);
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
    setError("");
    audio.current?.pause();
    meter.current?.dispose();
    const el = new Audio(url.current);
    audio.current = el;
    const output = createPlaybackMeter(el, "recording");
    meter.current = output;
    const finish = () => {
      output.dispose();
      if (meter.current === output) meter.current = null;
      setState("ready");
    };
    el.onended = finish;
    el.onerror = () => { setError("Não consegui tocar a gravação. Grave novamente e tente de novo."); finish(); };
    output.resume();
    setState("playing");
    try {
      await el.play();
    } catch {
      setError("Não consegui tocar o áudio. Toque em Jade repete para tentar novamente.");
      finish();
    }
  };

  return (
    <>
      {state === "recording" ? (
        <Button variant="ghost" className="stage-chip" onClick={() => rec.current?.stop()}><Square />Parar gravação</Button>
      ) : (
        <Button variant="ghost" className="stage-chip" onClick={record} disabled={state === "playing"}><Mic />Gravar minha voz</Button>
      )}
      {(state === "ready" || state === "playing") && (
        <Button variant="ghost" className="stage-chip" onClick={play} disabled={state === "playing"}><Play />Jade repete</Button>
      )}
      {error && <span className="stage-chip" role="alert">{error}</span>}
    </>
  );
}
