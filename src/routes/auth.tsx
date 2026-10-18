import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s["redirect"] === "string" && s["redirect"].startsWith("/") ? s["redirect"] : "/seguranca" }),
  head: () => ({
    meta: [
      { title: "Entrar — ZOORD SECURITY" },
      { name: "description", content: "Acesso restrito ao painel de câmeras e eventos Zoord Security." },
      { property: "og:title", content: "Entrar — ZOORD SECURITY" },
      { property: "og:description", content: "Entre na sua conta autorizada para acessar câmeras e eventos do Zoord Security." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou senha incorretos.");
      else navigate({ to: redirect as "/seguranca" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
      setMsg(error ? error.message : "Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.");
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-glow/30 bg-background p-6">
        <h1 className="font-display text-lg text-glow">ZOORD SECURITY</h1>
        <p className="text-sm text-muted-foreground">Acesso apenas para o dono e gerentes.</p>
        <Input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" required minLength={8} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" disabled={busy} className="w-full">{mode === "in" ? "Entrar" : "Criar conta"}</Button>
        <Button type="button" variant="link" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-xs text-muted-foreground underline">
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </Button>
        {msg && <p className="text-sm text-primary">{msg}</p>}
      </form>
    </main>
  );
}
