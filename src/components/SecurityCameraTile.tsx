import { useEffect, useRef, useState } from "react";
import { Camera, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cameraKind, validateCameraUrl, type CameraStatus } from "@/lib/security-camera";

export type SecurityCamera = { id: string; name: string; zone: string; stream_url: string; snapshot_url: string };
export const SECURITY_ZONES: Record<string, string> = { entrada: "Entrada", recepcao: "Recepção", corredor: "Corredor", estacionamento: "Estacionamento", externo: "Área externa", salao: "Salão", balcao: "Balcão de entrega", cozinha: "Cozinha" };
const STATUS: Record<CameraStatus, string> = { pending: "Aguardando integração", connecting: "Conectando", live: "Vídeo recebido", unavailable: "Sem sinal", external: "Visualização externa" };

export function SecurityCameraTile({ cam, register, onStatus }: {
  cam: SecurityCamera;
  register: (id: string, grab?: () => string | undefined) => void;
  onStatus: (id: string, status: CameraStatus) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [retry, setRetry] = useState(0);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<CameraStatus>("pending");
  const raw = cam.stream_url || cam.snapshot_url;
  const kind = cameraKind(raw);
  let url = "";
  try { if (kind !== "rtsp") url = validateCameraUrl(raw); } catch { /* legacy insecure links are not loaded */ }

  useEffect(() => { onStatus(cam.id, status); }, [cam.id, status, onStatus]);
  useEffect(() => {
    setStatus(!url ? "pending" : kind === "external" ? "external" : "connecting");
    if (!url || kind === "external") return;
    const timer = window.setTimeout(() => setStatus(s => s === "connecting" ? "unavailable" : s), 15000);
    return () => window.clearTimeout(timer);
  }, [url, kind, retry]);
  useEffect(() => {
    if (kind !== "hls" || !url || !videoRef.current) return;
    const video = videoRef.current;
    if (video.canPlayType("application/vnd.apple.mpegurl")) { video.src = url; return; }
    let disposed = false;
    let player: { destroy: () => void } | undefined;
    import("hls.js").then(({ default: Hls }) => {
      if (disposed) return;
      if (!Hls.isSupported()) { setStatus("unavailable"); return; }
      const hls = new Hls(); player = hls;
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setStatus("unavailable"); });
      hls.loadSource(url); hls.attachMedia(video);
    }).catch(() => { if (!disposed) setStatus("unavailable"); });
    return () => { disposed = true; player?.destroy(); };
  }, [url, kind, retry]);
  useEffect(() => {
    if (kind !== "image" || !url) return;
    const timer = window.setInterval(() => setTick(n => n + 1), 5000);
    return () => window.clearInterval(timer);
  }, [kind, url]);
  useEffect(() => {
    register(cam.id, () => {
      const el = videoRef.current ?? imageRef.current;
      if (!el || (el instanceof HTMLVideoElement && el.readyState < 2) || (el instanceof HTMLImageElement && !el.naturalWidth)) return;
      try {
        const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
        const context = canvas.getContext("2d"); if (!context) return;
        context.drawImage(el, 0, 0, 640, 360);
        return canvas.toDataURL("image/jpeg", 0.7);
      } catch { return; }
    });
    return () => register(cam.id);
  }, [cam.id, register]);

  return <article className="overflow-hidden rounded-lg border border-border bg-background">
    <div className="relative aspect-video bg-muted/10">
      {!url || kind === "external" ? <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Camera className="size-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{kind === "rtsp" ? "Tapo C200 · ponte local pendente" : url ? "Abrir câmera no serviço protegido" : "Câmera cadastrada, sem vídeo"}</span>
        {url && <Button asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink />Abrir câmera</a></Button>}
      </div> : kind === "image" ? <img key={retry} ref={imageRef} src={`${url}${url.includes("?") ? "&" : "?"}zoord_frame=${tick}`} crossOrigin="anonymous" alt={cam.name} onLoad={() => setStatus("live")} onError={() => setStatus("unavailable")} className="h-full w-full object-contain" />
        : <video key={retry} ref={videoRef} src={kind === "hls" ? undefined : url} crossOrigin="anonymous" autoPlay muted playsInline onPlaying={() => setStatus("live")} onStalled={() => setStatus("connecting")} onWaiting={() => setStatus("connecting")} onError={() => setStatus("unavailable")} className="h-full w-full object-contain" />}
      {url && kind !== "external" && status === "unavailable" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90"><span className="text-sm">Não foi possível receber o vídeo</span><Button size="sm" variant="outline" onClick={() => setRetry(n => n + 1)}><RefreshCw />Tentar novamente</Button></div>}
    </div>
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-start justify-between gap-2"><h3 className="break-words text-sm font-semibold">{cam.name}</h3><span className="shrink-0 text-xs text-muted-foreground">{SECURITY_ZONES[cam.zone] ?? cam.zone}</span></div>
      <p className={`flex items-center gap-2 text-xs ${status === "live" ? "text-glow" : status === "unavailable" ? "text-destructive" : "text-muted-foreground"}`}><span className="size-1.5 rounded-full bg-current" />{STATUS[status]}</p>
    </div>
  </article>;
}