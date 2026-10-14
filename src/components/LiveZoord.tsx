import { useEffect, useRef, useState } from "react";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { meter } from "@/lib/voice-level";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";

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
  const stopping = call.status === "stopping";

  // Mouth: meter Zoord's voice from the call audio
  useEffect(() => {
    if (call.status !== "connected") return;
    const audio = call.audioRef.current;
    const stream = audio?.srcObject as MediaStream | null;
    if (!stream || !stream.getAudioTracks().length) return;
    const ctx = new AudioContext();
    const stop = meter(ctx, ctx.createMediaStreamSource(stream));
    void ctx.resume().catch(() => {});
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
          <Button variant="ghost" onClick={call.start} disabled={stopping} className="stage-chip stage-chip-red"><Mic />{stopping ? "Encerrando…" : "Falar com o Zoord"}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={call.stop} className="stage-chip stage-chip-active">
              <PhoneOff />{call.status === "connecting" ? "Conectando… (encerrar)" : "Ao vivo — encerrar"}
            </Button>
            <Button variant="ghost" disabled={call.status !== "connected"} onClick={() => call.setMuted(!call.muted)} className="stage-chip">{call.muted ? <MicOff /> : <Mic />}{call.muted ? "Ativar microfone" : "Silenciar"}</Button>
          </>
        )}
        <Button variant="ghost" onClick={toggleCam} className={`stage-chip ${cam ? "stage-chip-active" : ""}`}>{cam ? <CameraOff /> : <Camera />}{cam ? "Câmera ligada" : "Câmera"}</Button>
        {call.playbackBlocked && <Button variant="ghost" onClick={call.resumePlayback} className="stage-chip"><Volume2 />Tocar som</Button>}
      </div>
      {call.error && <p role="alert" className="max-w-xl text-center text-xs text-dakkai">{call.error}</p>}
    </div>
  );
}
