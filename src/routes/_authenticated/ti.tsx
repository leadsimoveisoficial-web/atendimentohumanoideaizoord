import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Bot, Check, Copy, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { amIAdmin } from "@/lib/security.functions";
import { askDevAssistant } from "@/lib/ti.functions";

export const Route = createFileRoute("/_authenticated/ti")({
  head: () => ({ meta: [
    { title: "Painel de TI — Zoord Dakkai" },
    { name: "description", content: "Painel restrito da equipe de TI: tarefas, correções e assistente de IA para criar prompts." },
    { property: "og:title", content: "Painel de TI — Zoord Dakkai" },
    { property: "og:description", content: "Controle de melhorias e assistente de desenvolvimento da equipe de TI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: TiPage,
});

type Task = { id: string; text: string; kind: "melhoria" | "erro"; done: boolean };
type Msg = { role: "user" | "assistant"; content: string };
const PROJECTS = ["Zoord Dakkai AI", "Projeto 2"];
const QUICK = [
  "Crie um prompt para corrigir um erro que vou descrever",
  "Liste melhorias prioritárias para este projeto",
  "Crie um prompt para uma nova funcionalidade",
];

function TiPage() {
  const checkAdmin = useServerFn(amIAdmin), ask = useServerFn(askDevAssistant);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [project, setProject] = useState(PROJECTS[0]!);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState(""), [kind, setKind] = useState<Task["kind"]>("melhoria");
  const [msgs, setMsgs] = useState<Msg[]>([]), [input, setInput] = useState(""), [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(-1);
  const key = `ti-tasks:${project}`;

  useEffect(() => { checkAdmin().then((r) => setAdmin(r.admin)).catch(() => setAdmin(false)); }, [checkAdmin]);
  useEffect(() => { try { setTasks(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { setTasks([]); } setMsgs([]); }, [key]);
  const save = (next: Task[]) => { setTasks(next); localStorage.setItem(key, JSON.stringify(next)); };

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text.trim() }];
    setMsgs(next); setInput(""); setBusy(true);
    try { const r = await ask({ data: { project, messages: next } }); setMsgs([...next, { role: "assistant", content: r.text }]); }
    catch (e) { setMsgs([...next, { role: "assistant", content: `Não consegui responder: ${e instanceof Error ? e.message : "erro"}` }]); }
    finally { setBusy(false); }
  }

  if (admin === null) return <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">Verificando acesso…</main>;
  if (!admin) return <main className="grid min-h-screen place-items-center bg-background p-6 text-center text-foreground"><div><h1 className="text-xl font-semibold">Acesso restrito à equipe de TI</h1><Link to="/" className="mt-4 inline-block text-primary underline">Voltar</Link></div></main>;

  const open = tasks.filter((t) => !t.done).length;
  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <header className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-semibold tracking-tight">Painel de TI</h1>
        <div className="ml-auto flex gap-2">
          {PROJECTS.map((p) => <Button key={p} size="sm" variant={p === project ? "default" : "outline"} onClick={() => setProject(p)}>{p}</Button>)}
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Melhorias e erros <span className="text-sm text-muted-foreground">({open} abertos)</span></h2>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; save([{ id: crypto.randomUUID(), text: draft.trim(), kind, done: false }, ...tasks]); setDraft(""); }}>
            <select value={kind} onChange={(e) => setKind(e.target.value as Task["kind"])} className="rounded-md border border-input bg-background px-2 text-sm"><option value="melhoria">Melhoria</option><option value="erro">Erro</option></select>
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Descreva a tarefa" />
            <Button type="submit" size="icon" aria-label="Adicionar"><Plus className="h-4 w-4" /></Button>
          </form>
          <ul className="mt-4 space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <button aria-label="Concluir" onClick={() => save(tasks.map((x) => x.id === t.id ? { ...x, done: !x.done } : x))} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${t.done ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{t.done && <Check className="h-3 w-3" />}</button>
                <div className="flex-1"><span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] uppercase ${t.kind === "erro" ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"}`}>{t.kind}</span><span className={t.done ? "text-muted-foreground line-through" : ""}>{t.text}</span></div>
                <button aria-label="Pedir prompt à IA" className="text-xs text-primary hover:underline" onClick={() => send(`Crie um prompt de comando para ${t.kind === "erro" ? "corrigir este erro" : "implementar esta melhoria"}: ${t.text}`)}>Prompt</button>
                <button aria-label="Excluir" onClick={() => save(tasks.filter((x) => x.id !== t.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {!tasks.length && <li className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</li>}
          </ul>
        </section>
        <section className="flex min-h-[560px] flex-col rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Bot className="h-5 w-5 text-primary" /> Assistente de desenvolvimento</h2>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
            {!msgs.length && <div className="flex flex-wrap gap-2">{QUICK.map((q) => <Button key={q} variant="outline" size="sm" onClick={() => send(q)}>{q}</Button>)}</div>}
            {msgs.map((m, i) => (
              <div key={i} className={`whitespace-pre-wrap rounded-xl p-3 text-sm ${m.role === "user" ? "ml-10 bg-primary/15" : "mr-6 bg-muted"}`}>
                {m.content}
                {m.role === "assistant" && <button className="mt-2 flex items-center gap-1 text-xs text-primary" onClick={() => { navigator.clipboard.writeText(m.content); setCopied(i); setTimeout(() => setCopied(-1), 1500); }}><Copy className="h-3 w-3" />{copied === i ? "Copiado" : "Copiar"}</button>}
              </div>
            ))}
            {busy && <p className="text-sm text-muted-foreground">Pensando…</p>}
          </div>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Peça um prompt, descreva um erro…" />
            <Button type="submit" size="icon" disabled={busy} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
          </form>
        </section>
      </div>
    </main>
  );
}
