import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, Plus, Trash2, LogOut, Radar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addManager, amIAdmin, analyzeCamera } from "@/lib/security.functions";

export const Route = createFileRoute("/_authenticated/seguranca")({
  head: () => ({
    meta: [
      { title: "Segurança 24h — Zoord Dakkai" },
      { name: "description", content: "Painel restrito de câmeras e alertas do Zoord no Dakkai Sushi." },
      { property: "og:title", content: "Segurança 24h — Zoord Dakkai" },
      { property: "og:description", content: "Painel restrito de câmeras e alertas do Zoord no Dakkai Sushi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

type Camera = { id: string; name: string; zone: string; stream_url: string; snapshot_url: string };
type Event = { id: string; camera_name: string; level: string; summary: string; people_count: number | null; created_at: string };
type Settings = { enabled: boolean; interval_minutes: number; open_time: string; close_time: string };
const INTERVALS = [5, 10, 15, 20, 30, 120, 180, 240, 360, 480, 720];
const ZONES: Record<string, string> = { entrada: "Entrada", salao: "Salão", balcao: "Balcão de entrega", cozinha: "Cozinha" };

function CameraTile({ cam, register }: { cam: Camera; register: (id: string, grab: () => string | undefined) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const url = cam.stream_url;
  const isHls = /\.m3u8(\?|$)/i.test(url);
  const isImage = /\.(jpe?g|png|mjpe?g|cgi)(\?|$)/i.test(url) || /mjpeg|snapshot/i.test(url);
  const isVideo = isHls || /\.(mp4|webm)(\?|$)/i.test(url);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isHls || !videoRef.current) return;
    const v = videoRef.current;
    if (v.canPlayType("application/vnd.apple.mpegurl")) { v.src = url; return; }
    let hls: { destroy: () => void } | undefined;
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) return;
      const h = new Hls(); h.loadSource(url); h.attachMedia(v); hls = h;
    });
    return () => hls?.destroy();
  }, [url, isHls]);
  useEffect(() => { if (!isImage) return; const t = setInterval(() => setTick((n) => n + 1), 2000); return () => clearInterval(t); }, [isImage]);
  useEffect(() => {
    register(cam.id, () => {
      const el = videoRef.current ?? imgRef.current;
      if (!el) return undefined;
      try {
        const w = 640, h = 360; const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(el, 0, 0, w, h);
        return c.toDataURL("image/jpeg", 0.7);
      } catch { return undefined; } // camera blocks capture; server uses the snapshot link
    });
  }, [cam.id, register]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-video bg-muted">
        {!url ? <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem link de vídeo</div>
          : isVideo ? <video ref={videoRef} src={isHls ? undefined : url} crossOrigin="anonymous" autoPlay muted playsInline className="h-full w-full object-cover" />
          : isImage ? <img ref={imgRef} crossOrigin="anonymous" src={`${url}${url.includes("?") ? "&" : "?"}t=${tick}`} alt={cam.name} className="h-full w-full object-cover" />
          : <iframe src={url} title={cam.name} allow="autoplay; fullscreen" className="h-full w-full border-0" />}
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span className="font-semibold">{cam.name}</span>
        <span className="text-muted-foreground">{ZONES[cam.zone] ?? cam.zone}</span>
      </div>
    </div>
  );
}

function SecurityPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const analyze = useServerFn(analyzeCamera);
  const promote = useServerFn(addManager);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [cams, setCams] = useState<Camera[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ name: "", zone: "salao", stream_url: "", snapshot_url: "" });
  const [managerEmail, setManagerEmail] = useState("");
  const [note, setNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const grabbers = useRef(new Map<string, () => string | undefined>());
  const register = useCallback((id: string, grab: () => string | undefined) => { grabbers.current.set(id, grab); }, []);

  const load = useCallback(async () => {
    const [c, e, s] = await Promise.all([
      supabase.from("security_cameras").select("*").order("created_at"),
      supabase.from("security_events").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("security_settings").select("*").eq("id", 1).single(),
    ]);
    setCams((c.data as Camera[]) ?? []); setEvents((e.data as Event[]) ?? []); setSettings(s.data as Settings);
  }, []);

  useEffect(() => { checkAdmin().then((r) => { setAdmin(r.admin); if (r.admin) load(); }).catch(() => setAdmin(false)); }, [checkAdmin, load]);
  useEffect(() => {
    if (!admin) return;
    const ch = supabase.channel("security-events").on("postgres_changes", { event: "INSERT", schema: "public", table: "security_events" }, (p) => {
      const ev = p.new as Event;
      setEvents((list) => [ev, ...list].slice(0, 50));
      if (ev.level === "alerta" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(`Atenção. Zoord detectou um alerta na câmera ${ev.camera_name}. ${ev.summary}`);
        u.lang = "pt-BR"; window.speechSynthesis.speak(u);
      }
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [admin]);

  const scanAll = useCallback(async () => {
    setScanning(true);
    for (const cam of cams) {
      try {
        const r = await analyze({ data: { cameraId: cam.id, frame: grabbers.current.get(cam.id)?.() } });
        if ("reason" in r && r.reason) setNote(`${cam.name}: ${r.reason}`);
      } catch (err) { setNote(`${cam.name}: análise indisponível agora.`); if (String(err).includes("402") || String(err).includes("403")) break; }
    }
    setScanning(false);
  }, [cams, analyze]);

  // Periodic analysis while this panel is open on some device.
  useEffect(() => {
    if (!admin || !settings?.enabled || cams.length === 0) return;
    const t = setInterval(scanAll, settings.interval_minutes * 60_000);
    return () => clearInterval(t);
  }, [admin, settings?.enabled, settings?.interval_minutes, cams.length, scanAll]);

  async function saveSettings(patch: Partial<Settings>) {
    const next = { ...settings!, ...patch }; setSettings(next);
    await supabase.from("security_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  }
  async function addCam(e: React.FormEvent) {
    e.preventDefault(); if (!form.name) return;
    await supabase.from("security_cameras").insert(form); setForm({ name: "", zone: "salao", stream_url: "", snapshot_url: "" }); load();
  }
  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/auth", search: { redirect: "/seguranca" }, replace: true }); }

  if (admin === null) return <main className="p-8 text-foreground">Carregando…</main>;
  if (!admin) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center text-foreground">
      <ShieldAlert className="h-10 w-10 text-primary" />
      <p>Sua conta ainda não tem acesso. Peça ao dono para liberar seu e-mail como gerente.</p>
      <Button variant="outline" onClick={signOut}>Sair</Button>
    </main>
  );

  const levelClass = (l: string) => l === "alerta" ? "border-destructive text-destructive" : l === "atencao" ? "border-primary text-primary" : "border-border text-muted-foreground";
  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-lg tracking-widest"><ShieldCheck className="text-primary" /> SEGURANÇA 24H · ZOORD</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={scanAll} disabled={scanning || cams.length === 0}><Radar />{scanning ? "Analisando…" : "Analisar agora"}</Button>
          <Button variant="ghost" onClick={signOut}><LogOut />Sair</Button>
        </div>
      </header>

      {settings && (
        <section className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.enabled} onChange={(e) => saveSettings({ enabled: e.target.checked })} /> Modo Segurança 24h ativo</label>
          <label className="flex items-center gap-2">Analisar a cada
            <select value={settings.interval_minutes} onChange={(e) => saveSettings({ interval_minutes: Number(e.target.value) })} className="rounded border border-border bg-background px-2 py-1">
              {INTERVALS.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">Abre <Input type="time" value={settings.open_time.slice(0, 5)} onChange={(e) => saveSettings({ open_time: e.target.value })} className="w-28" /></label>
          <label className="flex items-center gap-2">Fecha <Input type="time" value={settings.close_time.slice(0, 5)} onChange={(e) => saveSettings({ close_time: e.target.value })} className="w-28" /></label>
          <span className="text-xs text-muted-foreground">A análise roda enquanto este painel estiver aberto.</span>
        </section>
      )}
      {note && <p className="mb-4 text-sm text-primary">{note}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cams.map((c) => (
              <div key={c.id} className="relative">
                <CameraTile cam={c} register={register} />
                <button aria-label="Remover câmera" onClick={async () => { await supabase.from("security_cameras").delete().eq("id", c.id); load(); }} className="absolute right-2 top-2 rounded bg-background/80 p-1"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <form onSubmit={addCam} className="mt-6 grid gap-2 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
            <Input placeholder="Nome (ex.: Entrada principal)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className="rounded border border-border bg-background px-2">
              {Object.entries(ZONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Input placeholder="Link do vídeo (HLS .m3u8, MJPEG ou página da câmera)" value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} />
            <Input placeholder="Link de foto/snapshot (https, para a IA)" value={form.snapshot_url} onChange={(e) => setForm({ ...form, snapshot_url: e.target.value })} />
            <Button type="submit" className="sm:col-span-2"><Plus />Adicionar câmera</Button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Alertas do Zoord</h2>
            <ul className="max-h-[60vh] space-y-2 overflow-auto">
              {events.length === 0 && <li className="text-xs text-muted-foreground">Nenhum evento ainda.</li>}
              {events.map((e) => (
                <li key={e.id} className={`rounded border-l-2 px-3 py-2 text-xs ${levelClass(e.level)}`}>
                  <div className="flex justify-between"><b>{e.camera_name}</b><span>{new Date(e.created_at).toLocaleString("pt-BR")}</span></div>
                  <p className="text-foreground">{e.summary}</p>
                  {e.people_count !== null && <p>Pessoas: {e.people_count}</p>}
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={async (e) => { e.preventDefault(); const r = await promote({ data: { email: managerEmail } }); setNote(r.message); setManagerEmail(""); }} className="space-y-2 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Liberar gerente</h2>
            <p className="text-xs text-muted-foreground">O gerente cria a conta em /auth e você libera o e-mail aqui.</p>
            <Input type="email" required placeholder="email@gerente.com" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
            <Button type="submit" variant="outline" className="w-full">Liberar acesso</Button>
          </form>
        </aside>
      </div>
    </main>
  );
}
