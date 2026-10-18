export type CameraStatus = "pending" | "connecting" | "live" | "unavailable" | "external";
export type CameraKind = "pending" | "rtsp" | "hls" | "image" | "video" | "external";

export function cameraKind(value: string): CameraKind {
  if (!value) return "pending";
  if (/^rtsp:\/\//i.test(value)) return "rtsp";
  if (/\.m3u8(\?|$)/i.test(value)) return "hls";
  if (/\.(jpe?g|png|mjpe?g|cgi)(\?|$)/i.test(value) || /mjpeg|snapshot/i.test(value)) return "image";
  if (/\.(mp4|webm)(\?|$)/i.test(value)) return "video";
  return "external";
}

/** Credentials belong to a protected local bridge, never camera URLs in this panel. */
export function validateCameraUrl(value: string): string {
  if (!value.trim()) return "";
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Informe um link HTTPS válido."); }
  if (url.protocol !== "https:") throw new Error("Use um link HTTPS protegido. O endereço RTSP fica somente na rede local.");
  if (url.username || url.password) throw new Error("Não coloque usuário ou senha no link da câmera.");
  return url.href;
}

export function tapoLocalStream(ip: string): string {
  const parts = ip.trim().split(".");
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) throw new Error("Informe o IP local da Tapo C200, como 192.168.1.50.");
  const nums = parts.map(Number);
  const [a, b] = nums;
  if (!(a === 10 || (a === 192 && b === 168) || (a === 172 && b !== undefined && b >= 16 && b <= 31))) throw new Error("Use o IP privado da câmera na rede da pousada.");
  return `rtsp://${nums.join(".")}:554/stream1`;
}

export function mergeSecurityEvents<T extends { id: string; created_at: string }>(current: T[], incoming: T[]): T[] {
  return Array.from(new Map([...current, ...incoming].map(event => [event.id, event])).values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
}