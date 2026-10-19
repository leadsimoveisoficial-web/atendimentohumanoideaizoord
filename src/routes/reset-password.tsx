import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Redefinir senha — DAKKAI × ZOORD" },
    { name: "description", content: "Recupere o acesso à sua conta Dakkai e às suas preferências." },
    { property: "og:title", content: "Redefinir senha — DAKKAI × ZOORD" },
    { property: "og:description", content: "Redefinição segura da senha da sua conta Dakkai." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") setAllowed(true);
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setAllowed(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return <main className="flex min-h-screen items-center justify-center p-6"><form className="w-full max-w-sm space-y-4 rounded-lg border border-glow/30 p-6" onSubmit={async (e) => { e.preventDefault(); if (password !== confirm) { setMessage("As senhas não coincidem."); return; } setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setMessage(error ? "O link expirou ou a senha não foi aceita. Solicite outro link." : "Senha atualizada."); setBusy(false); }}>
    <h1 className="font-display text-lg">Redefinir senha</h1>
    {allowed ? <><Input aria-label="Nova senha" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha" /><Input aria-label="Confirmar senha" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar senha" /><Button type="submit" disabled={busy} className="stage-chip stage-chip-red w-full">Salvar senha</Button></> : <p className="text-sm text-muted-foreground">Abra o link de recuperação enviado ao seu e-mail.</p>}
    {message && <p role="status" className="text-sm text-glow">{message}</p>}
    <Button type="button" variant="ghost" className="w-full" onClick={() => navigate({ to: "/auth", search: { redirect: "/" } })}>Voltar ao login</Button>
  </form></main>;
}