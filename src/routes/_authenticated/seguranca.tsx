import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, Plus, Trash2, LogOut, Radar, Camera, Activity, ArrowLeft, Bell, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addManager, amIAdmin, analyzeCamera } from "@/lib/security.functions";
import { SecurityCameraTile, SECURITY_ZONES, type SecurityCamera } from "@/components/SecurityCameraTile";
import { mergeSecurityEvents, tapoLocalStream, validateCameraUrl, type CameraStatus } from "@/lib/security-camera";

export const Route = createFileRoute("/_authenticated/seguranca")({
  head: () => ({ meta: [
    { title: "ZOORD SECURITY — Câmeras e eventos" },
    { name: "description", content: "Painel restrito Zoord Security: cadastro Tapo C200, comunicação das câmeras e eventos de segurança." },
    { property: "og:title", content: "ZOORD SECURITY — Câmeras e eventos" },
    { property: "og:description", content: "Monitoramento privado e integração de câmeras por etapas, preservando o atendimento Zoord." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: SecurityPage,
});

type Event = { id: string; camera_name: string; level: string; summary: string; people_count: number | null; created_at: string };
type Settings = { enabled: boolean; interval_minutes: number; open_time: string; close_time: string };
const INTERVALS = [5, 10, 15, 20, 30, 120, 180, 240, 360, 480, 720];
const EMPTY_FORM = { name: "", zone: "entrada", stream_url: "", snapshot_url: "", ip: "", model: "tapo" };

function SecurityPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin), analyze = useServerFn(analyzeCamera), promote = useServerFn(addManager);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [cams, setCams] = useState<SecurityCamera[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [managerEmail, setManagerEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState("all");
  const [realtime, setRealtime] = useState("Conectando eventos");
  const [statuses, setStatuses] = useState<Record<string, CameraStatus>>({});
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  const scanLock = useRef(false);
  const grabbers = useRef(new Map<string, () => string | undefined>());
  const register = useCallback((id: string, grab?: () => string | undefined) => { if (grab) grabbers.current.set(id, grab); else grabbers.current.delete(id); }, []);
  const onStatus = useCallback((id: string, status: CameraStatus) => setStatuses(prev => prev[id] === status ? prev : { ...prev, [id]: status }), []);
  const load = useCallback(async () => {
    const [c, e, s] = await Promise.all([
      supabase.from("security_cameras").select("*").order("created_at"),
      supabase.from("security_events").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("security_settings").select("*").eq("id", 1).single(),
    ]);
    if (c.error || e.error || s.error) { setNote("Não foi possível atualizar o painel. Tente novamente."); return; }
    setCams(c.data ?? []); setEvents(prev => mergeSecurityEvents(prev, e.data ?? [])); setSettings(s.data);
  }, []);
  useEffect(() => { checkAdmin().then(r => { setAdmin(r.admin); if (r.admin) void load(); }).catch(() => setAdmin(false)); }, [checkAdmin, load]);
  useEffect(() => {
    if (!admin) return;
    const channel = supabase.channel("zoord-security-events").on("postgres_changes", { event: "INSERT", schema: "public", table: "security_events" }, p => {
      const ev = p.new as Event;
      setEvents(list => mergeSecurityEvents(list, [ev]));
      if (ev.level === "alerta") {
        setNote(`Alerta · ${ev.camera_name}: ${ev.summary}`);
        if (soundRef.current && "speechSynthesis" in window && !window.speechSynthesis.speaking) {
          const utterance = new SpeechSynthesisUtterance(`Alerta de segurança. ${ev.camera_name}. ${ev.summary}`);
          utterance.lang = "pt-BR"; window.speechSynthesis.speak(utterance);
        }
      }
    }).subscribe(status => {
      setRealtime(status === "SUBSCRIBED" ? "Eventos ao vivo" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "Reconectando · atualização a cada 30 s" : "Conectando eventos");
      if (status === "SUBSCRIBED") void load();
    });
    const timer = window.setInterval(() => void load(), 30000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [admin, load]);

  const scanAll = useCallback(async () => {
    if (scanLock.current || !settings?.enabled) return;
    scanLock.current = true; setScanning(true); setNote("");
    try {
      for (const cam of cams) {
        try {
          const result = await analyze({ data: { cameraId: cam.id, frame: grabbers.current.get(cam.id)?.() } });
          if ("reason" in result && result.reason) setNote(`${cam.name}: ${result.reason}`);
        } catch { setNote("Análise indisponível. Confira a imagem e os créditos de IA; o painel continua funcionando."); break; }
      }
      await load();
    } finally { scanLock.current = false; setScanning(false); }
  }, [cams, settings?.enabled, analyze, load]);
  useEffect(() => {
    if (!admin || !settings?.enabled || !cams.length) return;
    const timer = window.setInterval(() => void scanAll(), settings.interval_minutes * 60000);
    return () => window.clearInterval(timer);
  }, [admin, settings?.enabled, settings?.interval_minutes, cams.length, scanAll]);

  async function saveSettings(patch: Partial<Settings>) {
    if (!settings || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("security_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) { setNote("Não foi possível salvar a configuração."); return; }
      setSettings(prev => prev ? { ...prev, ...patch } : prev);
    } finally { setBusy(false); }
  }
  async function addCam(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setNote("");
    try {
      const name = form.name.trim(); if (!name) throw new Error("Informe o nome da câmera.");
      const local = form.model === "tapo" && form.ip.trim() ? tapoLocalStream(form.ip) : "";
      const stream_url = validateCameraUrl(form.stream_url) || local;
      const snapshot_url = validateCameraUrl(form.snapshot_url);
      const { error } = await supabase.from("security_cameras").insert({ name, zone: form.zone, stream_url, snapshot_url });
      if (error) throw new Error("Não foi possível cadastrar a câmera. Tente novamente.");
      setForm(EMPTY_FORM); await load(); setNote("Câmera cadastrada. A conexão real só será confirmada quando uma imagem for recebida.");
    } catch (error) { setNote(error instanceof Error ? error.message : "Não foi possível cadastrar a câmera."); }
    finally { setBusy(false); }
  }
  async function removeCamera(cam: SecurityCamera) {
    if (!window.confirm(`Remover ${cam.name}? O histórico de eventos será preservado.`)) return;
    const { error } = await supabase.from("security_cameras").delete().eq("id", cam.id);
    if (error) { setNote("Não foi possível remover a câmera."); return; }
    await load();
  }
  async function signOut() { await supabase.auth.signOut(); await navigate({ to: "/auth", search: { redirect: "/seguranca" }, replace: true }); }
  if (admin === null) return <main className="flex min-h-screen items-center justify-center bg-background text-foreground"><Activity className="mr-2 size-5 animate-pulse text-glow" />Verificando acesso…</main>;
  if (!admin) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center text-foreground"><ShieldAlert className="size-10 text-glow" /><h1 className="font-display text-lg">ZOORD SECURITY</h1><p>Sua conta ainda não tem acesso. Peça ao responsável para liberar seu e-mail.</p><Button asChild variant="outline"><Link to="/">Voltar ao Zoord</Link></Button><Button variant="ghost" onClick={signOut}>Sair</Button></main>;
  const live = cams.filter(c => statuses[c.id] === "live").length;
  const alerts = events.filter(e => e.level === "alerta").length;
  const visibleEvents = events.filter(e => filter === "all" || e.level === filter);
  return <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-6">
        <div><p className="mb-2 text-xs uppercase tracking-widest text-glow">Security intelligence · acesso restrito</p><h1 className="flex items-center gap-3 font-display text-xl md:text-2xl"><ShieldCheck className="size-7 text-glow" />ZOORD SECURITY</h1></div>
        <nav className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/"><ArrowLeft />Zoord</Link></Button><Button variant="outline" onClick={() => void load()} title="Atualizar painel" aria-label="Atualizar painel" size="icon"><RefreshCw /></Button><Button variant="ghost" onClick={signOut}><LogOut />Sair</Button></nav>
      </header>
      <section className="mb-8 grid grid-cols-2 gap-5 border-b border-border/30 pb-6 md:grid-cols-4" aria-label="Resumo de segurança">
        {[{ icon: Camera, label: "Câmeras cadastradas", value: cams.length }, { icon: Activity, label: "Recebendo imagem", value: live }, { icon: Bell, label: "Alertas nos últimos 50 eventos", value: alerts }, { icon: ShieldCheck, label: "Análise de IA", value: settings?.enabled ? "Ativada" : "Pausada" }].map(item => <div key={item.label}><item.icon className="mb-3 size-5 text-glow" /><p className="text-2xl font-semibold">{item.value}</p><p className="mt-1 text-xs text-muted-foreground">{item.label}</p></div>)}
      </section>
      {note && <p role="status" className="mb-6 border-l-2 border-glow bg-glow/5 px-4 py-3 text-sm">{note}</p>}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <section className="mb-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Câmeras</h2><Button variant="outline" onClick={() => void scanAll()} disabled={scanning || !settings?.enabled || !cams.length}><Radar />{scanning ? "Analisando…" : "Analisar agora"}</Button></div>
            {!cams.length ? <div className="flex min-h-56 flex-col items-center justify-center gap-3 border-y border-dashed border-border/40 py-8 text-center"><Camera className="size-10 text-muted-foreground" /><h3 className="font-semibold">A primeira câmera começa aqui</h3><p className="text-sm text-muted-foreground">Nenhuma câmera cadastrada.</p></div> : <div className="grid gap-4 md:grid-cols-2">{cams.map(cam => <div key={cam.id} className="relative"><SecurityCameraTile cam={cam} register={register} onStatus={onStatus} /><Button size="icon" variant="outline" title={`Remover ${cam.name}`} aria-label={`Remover ${cam.name}`} onClick={() => void removeCamera(cam)} className="absolute right-2 top-2 size-8 bg-background/90"><Trash2 /></Button></div>)}</div>}
          </section>
          <section className="border-t border-border/30 pt-6"><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="size-5 text-glow" />Cadastrar câmera</h2>
            <form onSubmit={addCam} className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-xs text-muted-foreground">Modelo<select aria-label="Modelo" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="tapo">Tapo C200</option><option value="other">Outra câmera</option></select></label>
              <label className="space-y-2 text-xs text-muted-foreground">Local<select aria-label="Local" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">{Object.entries(SECURITY_ZONES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className="space-y-2 text-xs text-muted-foreground">Nome<Input aria-label="Nome da câmera" required maxLength={80} placeholder="Entrada da pousada" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
              {form.model === "tapo" && <label className="space-y-2 text-xs text-muted-foreground">IP local da Tapo · opcional<Input aria-label="IP local da Tapo" placeholder="192.168.1.50" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} /></label>}
              <label className="space-y-2 text-xs text-muted-foreground">Vídeo protegido · opcional<Input aria-label="Link do vídeo" placeholder="https://…/live.m3u8" value={form.stream_url} onChange={e => setForm({ ...form, stream_url: e.target.value })} /></label>
              <label className="space-y-2 text-xs text-muted-foreground">Imagem protegida · opcional<Input aria-label="Link de imagem" placeholder="https://…/snapshot.jpg" value={form.snapshot_url} onChange={e => setForm({ ...form, snapshot_url: e.target.value })} /></label>
              <Button type="submit" disabled={busy} className="sm:col-span-2"><Plus />{busy ? "Salvando…" : "Cadastrar câmera"}</Button>
            </form>
            <details className="mt-5 border-l-2 border-glow/40 pl-4 text-sm"><summary className="cursor-pointer text-glow">Tapo C200 · comunicação local</summary><div className="mt-3 space-y-3 text-muted-foreground"><p>Crie a conta da câmera no aplicativo Tapo. Ela é diferente da conta TP-Link. Não informe a senha neste painel.</p><p>RTSP: porta 554, /stream1 ou /stream2. ONVIF: porta 2020. O navegador precisa de uma ponte local protegida para receber o vídeo por HTTPS.</p><p>Não abra portas da câmera para a internet. Primeiro validaremos uma câmera na rede da pousada.</p><a href="https://www.tp-link.com/us/support/faq/2680/" target="_blank" rel="noopener noreferrer" className="inline-block text-glow underline">Orientações oficiais TP-Link</a></div></details>
          </section>
          {settings && <section className="mt-8 border-t border-border/30 pt-6"><h2 className="mb-4 text-lg font-semibold">Análise e horários</h2><div className="flex flex-wrap items-center gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" disabled={busy} checked={settings.enabled} onChange={e => void saveSettings({ enabled: e.target.checked })} />Análise de IA ativa</label><label className="flex items-center gap-2">Intervalo<select aria-label="Intervalo da análise" disabled={busy} value={settings.interval_minutes} onChange={e => void saveSettings({ interval_minutes: Number(e.target.value) })} className="rounded-md border border-input bg-background px-2 py-1">{INTERVALS.map(m => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}</select></label><label className="flex items-center gap-2">Abre<Input aria-label="Horário de abertura" type="time" disabled={busy} value={settings.open_time.slice(0, 5)} onChange={e => void saveSettings({ open_time: e.target.value })} className="w-28" /></label><label className="flex items-center gap-2">Fecha<Input aria-label="Horário de fechamento" type="time" disabled={busy} value={settings.close_time.slice(0, 5)} onChange={e => void saveSettings({ close_time: e.target.value })} className="w-28" /></label></div><p className="mt-4 text-xs text-muted-foreground">A análise usa créditos de IA e só roda com este painel aberto. Esta etapa não oferece vigilância autônoma 24h.</p></section>}
        </div>
        <aside className="min-w-0 border-t border-border/30 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <section><h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><Bell className="size-5 text-glow" />Eventos de segurança</h2><p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"><span className={`size-1.5 rounded-full ${realtime === "Eventos ao vivo" ? "bg-glow" : "bg-muted-foreground"}`} />{realtime}</p><div className="mb-4 flex flex-wrap items-center gap-3"><select aria-label="Filtrar eventos" value={filter} onChange={e => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs"><option value="all">Todos os eventos</option><option value="alerta">Alertas</option><option value="atencao">Atenção</option><option value="info">Informações</option></select><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={sound} onChange={e => { setSound(e.target.checked); soundRef.current = e.target.checked; }} />Aviso por voz</label></div>
            <ul aria-live="polite" className="max-h-[650px] space-y-4 overflow-y-auto">{!visibleEvents.length && <li className="border-y border-border/30 py-8 text-sm text-muted-foreground">Nenhum evento registrado{filter === "all" ? "." : " neste filtro."}</li>}{visibleEvents.map(e => <li key={e.id} className={`border-l-2 py-1 pl-3 ${e.level === "alerta" ? "border-destructive" : e.level === "atencao" ? "border-glow" : "border-border"}`}><div className="flex flex-wrap justify-between gap-2 text-xs"><b>{e.camera_name}</b><span className={e.level === "alerta" ? "text-destructive" : "text-glow"}>{e.level === "alerta" ? "Alerta" : e.level === "atencao" ? "Atenção" : "Informação"}</span></div><p className="my-2 break-words text-sm">{e.summary}</p><p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}{e.people_count !== null ? ` · ${e.people_count} pessoas` : ""}</p></li>)}</ul>
          </section>
          <section className="mt-8 border-t border-border/30 pt-6"><h2 className="mb-4 text-sm font-semibold">Liberar gerente</h2><form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); try { const result = await promote({ data: { email: managerEmail } }); setNote(result.message); if (result.ok) setManagerEmail(""); } catch { setNote("Não foi possível liberar o gerente."); } finally { setBusy(false); } }}><Input aria-label="E-mail do gerente" type="email" required placeholder="E-mail da conta já cadastrada" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} /><Button type="submit" variant="outline" disabled={busy} className="w-full">Liberar acesso</Button></form></section>
        </aside>
      </div>
    </div>
  </main>;
}
