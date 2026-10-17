import { useRef, useState } from "react";
import { MENU } from "./menu";
import { streamSpeech } from "@/lib/stream-speech";
import { speakZoord } from "@/lib/zoord-voice";
import { stopFreeSpeech } from "@/lib/free-speech";
import { guessCategory } from "@/lib/menu-script";

export function AskZoord({ onPoint }: { onPoint: (i: number | null) => void }) {
  const [openPanel, setOpenPanel] = useState(false);
  const [cat, setCat] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking" | "speaking">("idle");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopFreeSpeech();
    setStatus("idle");
    onPoint(null);
  };

  const run = async () => {
    if (cat === null && !q.trim()) return;
    stop();
    const ac = new AbortController();
    abortRef.current = ac;
    setError(""); setAnswer(""); setStatus("thinking");
    try {
      const res = await fetch("/api/zoord-present", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat ?? undefined, question: q }),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      setAnswer(data.text);
      onPoint(cat ?? guessCategory(data.text + " " + q));
      setStatus("speaking");
      try {
        await streamSpeech("/api/zoord-speak", data.text, ac.signal);
      } catch (speechError) {
        if (ac.signal.aborted) throw speechError;
        // Credits or network down → Grok voice, then the free browser voice.
        await speakZoord(data.text, { signal: ac.signal });
      }
    } catch (e) {
      if (!ac.signal.aborted) setError((e as Error).message || "Não consegui falar agora.");
    } finally {
      if (abortRef.current === ac) { abortRef.current = null; setStatus("idle"); onPoint(null); }
    }
  };

  if (!openPanel)
    return (
      <button onClick={() => setOpenPanel(true)} className="stage-chip stage-chip-red pointer-events-auto">
        Pergunte ao Zoord
      </button>
    );

  return (
    <div className="menu-sheet pointer-events-auto w-[min(92vw,420px)] !max-h-[70vh] text-left">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm tracking-[0.3em] text-foreground">PERGUNTE AO ZOORD</p>
        <button onClick={() => { stop(); setOpenPanel(false); }} className="stage-chip" aria-label="Fechar">✕</button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Escolha uma categoria</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MENU.map((s, i) => (
          <button key={s.t} onClick={() => setCat(cat === i ? null : i)} className={`stage-chip !px-2.5 !py-1 !text-[10px] ${cat === i ? "stage-chip-active" : ""}`}>{s.t}</button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">…ou faça uma pergunta</p>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
        placeholder="Ex.: o que vocês têm sem arroz? Qual combo serve 4 pessoas?"
        rows={2}
        className="mt-2 w-full resize-none rounded-md border border-border bg-background/60 p-2 text-sm text-foreground outline-none focus:border-primary"
      />
      <div className="mt-3 flex gap-2">
        {status === "idle" ? (
          <button onClick={run} disabled={cat === null && !q.trim()} className="stage-chip stage-chip-red disabled:opacity-40">Zoord, apresente!</button>
        ) : (
          <button onClick={stop} className="stage-chip stage-chip-active">{status === "thinking" ? "Pensando… (parar)" : "Falando… (parar)"}</button>
        )}
      </div>
      {answer && <p className="mt-3 text-sm leading-relaxed text-foreground">{answer}</p>}
      {error && <p className="mt-3 text-sm text-dakkai">{error}</p>}
    </div>
  );
}
