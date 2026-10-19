import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import "@lovable.dev/cloud-auth-js/styles.css";
import { safeRedirect } from "@/lib/profile";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: safeRedirect(s["redirect"]) }),
  head: () => ({
    meta: [
      { title: "Entrar — DAKKAI × ZOORD" },
      { name: "description", content: "Entre e salve seu nome e preferências no Dakkai." },
      { property: "og:title", content: "Entrar — DAKKAI × ZOORD" },
      { property: "og:description", content: "Sua conta pessoal Dakkai com preferências salvas." },
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
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setMsg(error ? "Não foi possível enviar agora." : "Se houver uma conta, enviaremos um link ao seu e-mail.");
    } else if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou senha incorretos.");
      else navigate({ to: redirect });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } } });
      setMsg(error ? "Não foi possível criar a conta. Confira os dados e tente novamente." : "Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.");
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-glow/30 bg-background p-6">
        <h1 className="font-display text-lg text-glow">DAKKAI × ZOORD</h1>
        <p className="text-sm text-muted-foreground">Sua conta Dakkai</p>
        {mode === "up" && <Input aria-label="Nome" required maxLength={80} placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />}
        <Input aria-label="E-mail" type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== "reset" && <Input aria-label="Senha" type="password" required minLength={8} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Aguarde…" : mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Enviar link"}</Button>
        <Button type="button" variant="link" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-xs text-muted-foreground underline">
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </Button>
        {mode === "in" && <Button type="button" variant="link" className="w-full text-muted-foreground" onClick={() => setMode("reset")}>Esqueci minha senha</Button>}
        {mode !== "reset" && <>{(["google", "lovable"] as const).map(provider => <Button key={provider} type="button" disabled={busy} variant="outline" className={provider === "lovable" ? "lovable-auth-button w-full" : "w-full"} onClick={async () => { setBusy(true); setMsg(""); sessionStorage.setItem("zoord:login-return", redirect); try { const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin }); if (result.error) setMsg("Não foi possível entrar. Tente novamente."); else if (!result.redirected) await navigate({ to: redirect }); } catch { setMsg("Não foi possível conectar."); } finally { setBusy(false); } }}>{provider === "google" ? "Continuar com Google" : "Continue with Lovable"}</Button>)}</>}
        {msg && <p role="status" className="text-sm text-glow">{msg}</p>}
        <Button type="button" variant="ghost" className="w-full" onClick={() => navigate({ to: "/" })}>Voltar ao Zoord</Button>
      </form>
    </main>
  );
}
