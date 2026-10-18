import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Music2, Pause, Play, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MUSIC_GENRES, danceStyle, genreIntroduction, musicLevel, rhythmEnergy, type MusicCommand, type MusicGenre } from "@/lib/music";
import { voiceLevel } from "@/lib/voice-level";

const STATIONS: Record<MusicGenre, { name: string; url: string }> = {
  "br-rock": { name: "89 FM — rock nacional e internacional", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_89FM.mp3" },
  jazz: { name: "181.FM — Fusion Jazz", url: "https://listen.181fm.com/181-fusionjazz_128k.mp3" },
  electronic: { name: "181.FM — Energy 98 (dance / eletrônico)", url: "https://listen.181fm.com/181-energy98_128k.mp3" },
  hits: { name: "181.FM — The Beat", url: "https://listen.181fm.com/181-beat_128k.mp3" },
  rock: { name: "181.FM — The Eagle (classic rock)", url: "https://listen.181fm.com/181-eagle_128k.mp3" },
  forro: { name: "Riacho FM — forró e sertanejo", url: "https://stm23.srvaudio.com.br:10974/stream" },
  pagode: { name: "Pagode pra Valer — pagode e samba", url: "https://stm15.xcast.com.br:12534/;" },
  sertanejo: { name: "Sertaneja 106.7 — sertanejo", url: "https://sc4s.cdn.upx.com:8067/stream" },
  "hip-hop": { name: "100 Hip Hop and RNB FM", url: "https://streaming.shoutcast.com/100-hip-hop-and-rnb-fm" },
};

export function RadioPlayer({ listening, onSpeak, onOpen, hidden }: { listening: boolean; onSpeak: (text: string) => void; onOpen: () => void; hidden: boolean }) {
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState<MusicGenre>("br-rock");
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0.35);
  const audio = useRef<HTMLAudioElement>(null);
  const graph = useRef<{ ctx: AudioContext; analyser: AnalyserNode; source: MediaElementAudioSourceNode } | null>(null);
  const requestId = useRef(0);
  const level = useRef(volume);
  const attention = useRef(listening);
  level.current = volume; attention.current = listening;
  const clearRhythm = () => { musicLevel.energy = 0; musicLevel.pulse = 0; musicLevel.playing = false; };

  function stop() {
    requestId.current++;
    audio.current?.pause();
    clearRhythm(); setStatus("idle");
  }
  async function play(selected: MusicGenre = genre, introduce = false) {
    const el = audio.current;
    if (!el) return;
    const id = ++requestId.current;
    setOpen(true); setGenre(selected); musicLevel.genre = selected; setError(""); setStatus("loading"); clearRhythm();
    try {
      if (!graph.current) {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
        const source = ctx.createMediaElementSource(el);
        source.connect(analyser); analyser.connect(ctx.destination);
        graph.current = { ctx, analyser, source };
      }
      await graph.current.ctx.resume();
      if (id !== requestId.current) return;
      if (el.getAttribute("src") !== STATIONS[selected].url) { el.src = STATIONS[selected].url; el.load(); }
      await el.play();
      if (id !== requestId.current) return;
      setError(""); setStatus("playing");
      if (introduce) onSpeak(genreIntroduction(selected));
    } catch (e) {
      if (id !== requestId.current) return;
      el.pause(); clearRhythm(); setStatus("idle");
      setError(e instanceof DOMException && e.name === "NotAllowedError"
        ? "Toque em Tocar rádio para liberar o som."
        : "Esta rádio não conectou. Escolha outro gênero e toque em Tocar rádio.");
    }
  }
  const latestPlay = useRef(play); latestPlay.current = play;
  useEffect(() => {
    const receive = (e: Event) => {
      const cmd = (e as CustomEvent<MusicCommand>).detail;
      if (cmd.action === "stop") stop();
      else if (cmd.action === "choose") setOpen(true);
      else if (cmd.action === "play") void latestPlay.current(cmd.genre);
    };
    window.addEventListener("zoord:music", receive);
    return () => window.removeEventListener("zoord:music", receive);
  }, []);
  useEffect(() => {
    let frame = 0, average = 0;
    const samples = new Float32Array(1024);
    const tick = () => {
      const el = audio.current, meter = graph.current;
      if (el) el.volume = level.current * (attention.current || voiceLevel.v > 0.03 ? 0.12 : 1);
      if (el && meter && !el.paused && el.readyState >= 3 && meter.ctx.state === "running") {
        meter.analyser.getFloatTimeDomainData(samples);
        const energy = rhythmEnergy(samples) * (attention.current ? 0 : 1);
        average += (energy - average) * 0.04;
        musicLevel.playing = true; musicLevel.energy = energy;
        musicLevel.pulse = Math.max(0, Math.min(1, (energy - average) * 4));
      } else clearRhythm();
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(frame); audio.current?.pause(); clearRhythm(); graph.current?.source.disconnect(); void graph.current?.ctx.close(); graph.current = null; };
  }, []);
  useEffect(() => {
    if (status !== "loading") return;
    const t = setTimeout(() => { stop(); setError("A rádio demorou para conectar. Escolha outro gênero."); }, 15000);
    return () => clearTimeout(t);
  }, [status]);

  return <>
    <audio ref={audio} crossOrigin="anonymous" preload="none" onWaiting={clearRhythm}
      onPlaying={() => { setError(""); setStatus("playing"); }} onPause={clearRhythm} onEnded={() => { clearRhythm(); setStatus("idle"); }}
      onError={() => { clearRhythm(); setStatus("idle"); setError("Esta rádio está indisponível. Escolha outro gênero."); }} />
    <Button variant="ghost" className={`stage-chip ${status === "playing" ? "stage-chip-active" : ""}`} onClick={() => { onOpen(); setOpen(!open); }}><Music2 />Música e dança</Button>
    {open && !hidden && createPortal(<section aria-label="Rádio do Zoord" className="zoord-radio-panel pointer-events-auto z-40 max-h-[55vh] overflow-y-auto w-[calc(100vw-32px)] max-w-sm rounded-lg border border-border bg-background/95 p-4 text-foreground backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between"><h2 className="font-display text-sm">Rádio • Zoord</h2><Button size="icon" variant="ghost" aria-label="Fechar rádio" onClick={() => setOpen(false)}><X /></Button></header>
      <Select value={genre} onValueChange={(value) => { const selected = MUSIC_GENRES.find(g => g.id === value); if (!selected) return; void play(selected.id, true); }}>
        <SelectTrigger aria-label="Gênero musical" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{MUSIC_GENRES.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
      </Select>
      <p className="mt-2 text-xs text-muted-foreground">{STATIONS[genre].name}</p>
      <p className="mt-1 text-xs text-glow">Dança • {danceStyle(genre).name}</p>
      <div className="mt-3 flex items-center gap-3">
        <Button size="icon" variant="outline" aria-label={status !== "idle" ? "Pausar rádio" : "Tocar rádio"} onClick={() => status !== "idle" ? stop() : void play(genre, true)}>{status !== "idle" ? <Pause /> : <Play />}</Button>
        <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input aria-label="Volume da rádio" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} className="min-w-0 flex-1 accent-glow" />
        <span role="status" className="text-xs text-muted-foreground">{status === "loading" ? "Conectando…" : status === "playing" ? "Ao vivo" : "Pausada"}</span>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-dakkai">{error}</p>}
    </section>, document.body)}
  </>;
}