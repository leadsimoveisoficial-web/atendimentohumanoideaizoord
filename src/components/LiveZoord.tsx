import { useEffect, useRef, useState } from "react";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { meter } from "@/lib/voice-level";

export function LiveZoord({ onPoint }: { onPoint: (i: number | null) => void }) {
  const [caption, setCaption] = useState("");
  const [thinking, setThinking] = useState(false);
  const [cam, setCam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const call = useLiveVoice({
    onEvent: (e: LiveEvent) => {
      if (e.type === "app.point" && typeof e["category"] === "number") onPoint(e["category"] as number);
      if (e.type === "app.delegation.pending") setThinking(true);
      if (e.type === "session.output_transcript.delta" && typeof e["delta"] === "string") {
        setThinking(false);
        setCaption((c) => (c + (e["delta"] as string)).slice(-180));
      }
      if (e.type === "session.input_transcript.delta") setCaption("");
      if (e.type === "app.closed") { setThinking(false); setCaption(""); onPoint(null); }
    },
  });
  const live = call.status === "connecting" || call.status === "connected";

  // Mouth: meter Zoord's voice from the call audio
  useEffect(() => {
    if (call.status !== "connected") return;
    const audio = call.audioRef.current;
    const stream = audio?.srcObject as MediaStream | null;
    if (!stream || !stream.getAudioTracks().length) return;
    const ctx = new AudioContext();
    const stop = meter(ctx, ctx.createMediaStreamSource(stream));
    return () => { stop(); void ctx.close(); };
  }, [call.status, call.audioRef]);

  // Camera: send a small snapshot every 2s to Zoord's brain
  useEffect(() => {
    if (!cam || call.status !== "connected") return;
    const canvas = document.createElement("canvas");
    const t = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      const w = 384, h = Math.round((v.videoHeight / v.videoWidth) * w);
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(v, 0, 0, w, h);
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
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = s;
      setCam(true);
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = s; });
    } catch {
      alert("Não consegui acessar a câmera. Verifique a permissão do navegador.");
    }
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <audio ref={call.audioRef} autoPlay className="hidden" />
      {cam && (
        <video ref={videoRef} autoPlay muted playsInline className="fixed bottom-6 right-6 h-28 w-36 rounded-lg border border-border object-cover shadow-lg" />
      )}
      {live && (caption || thinking) && (
        <p className="max-w-xl rounded-lg bg-background/70 px-4 py-2 text-center text-sm text-foreground backdrop-blur">
          {thinking && !caption ? "Zoord pensando…" : caption}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!live ? (
          <button onClick={call.start} className="stage-chip stage-chip-red">🎙️ Falar com o Zoord</button>
        ) : (
          <>
            <button onClick={call.stop} className="stage-chip stage-chip-active">
              {call.status === "connecting" ? "Conectando… (encerrar)" : "● Ao vivo — encerrar"}
            </button>
            <button onClick={() => call.setMuted(!call.muted)} className="stage-chip">{call.muted ? "Ativar microfone" : "Silenciar"}</button>
          </>
        )}
        <button onClick={toggleCam} className={`stage-chip ${cam ? "stage-chip-active" : ""}`}>{cam ? "Câmera ligada" : "📷 Câmera"}</button>
        {call.playbackBlocked && <button onClick={call.resumePlayback} className="stage-chip">Tocar som</button>}
      </div>
      {call.error && <p className="text-xs text-dakkai">{call.error}</p>}
    </div>
  );
}
