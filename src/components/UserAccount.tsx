import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { UserRound, LogOut, Save, X } from "lucide-react";
import { MUSIC_GENRES } from "@/lib/music";
import { profilePreferences } from "@/lib/profile";

type Profile = Tables<"profiles">;
type Account = { user: User | null; profile: Profile | null; save: (patch: Partial<Pick<Profile, "display_name" | "music_genre" | "music_volume">>) => Promise<void> };
const AccountContext = createContext<Account>({ user: null, profile: null, save: async () => {} });
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const revision = useRef(0);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    const load = async (next: User | null) => {
      const version = ++revision.current;
      if (!active) return;
      setUser(next); setProfile(null);
      if (!next) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", next.id).single();
      if (active && version === revision.current) setProfile(data);
    };
    void supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      // Run database reads outside the auth callback's session lock.
      setTimeout(() => { if (active) void load(session?.user ?? null); }, 0);
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => { active = false; revision.current++; data.subscription.unsubscribe(); };
  }, [router, queryClient]);
  const save: Account["save"] = async (patch) => {
    if (!user) throw new Error("Entre para salvar suas preferências.");
    const id = user.id;
    const { data, error } = await supabase.from("profiles").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw new Error("Não foi possível salvar. Tente novamente.");
    if (revision.current && data) setProfile(data);
  };
  return <AccountContext.Provider value={{ user, profile, save }}>{children}</AccountContext.Provider>;
}

export function UserAccount() {
  const { user, profile, save } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("br-rock");
  const [volume, setVolume] = useState(0.35);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const show = () => { setName(profile?.display_name ?? ""); setGenre(profile?.music_genre ?? "br-rock"); setVolume(Number(profile?.music_volume ?? 0.35)); setMessage(""); setOpen(true); };
  return <>
    <Button variant="ghost" className="stage-chip" aria-label={user ? "Minha conta" : "Entrar"} onClick={() => user ? show() : void navigate({ to: "/auth", search: { redirect: "/" } })}><UserRound /><span className="hidden lg:inline">{user ? profile?.display_name || "Minha conta" : "Entrar"}</span></Button>
    {open && user && <aside aria-label="Minha conta" className="fixed right-3 top-20 z-50 w-[calc(100vw-24px)] max-w-sm rounded-lg border border-glow/30 bg-background/95 p-5 text-foreground backdrop-blur-xl">
      <header className="mb-4 flex items-center justify-between"><h2 className="font-display text-sm">Minha conta</h2><Button variant="ghost" size="icon" aria-label="Fechar conta" onClick={() => setOpen(false)}><X /></Button></header>
      <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await save(profilePreferences(name, genre, volume)); setMessage("Preferências salvas."); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setBusy(false); } }}>
        <label className="block text-sm">Nome<Input aria-label="Nome" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-sm">Gênero musical<select aria-label="Gênero preferido" className="mt-1 w-full rounded-md border border-input bg-background p-2" value={genre} onChange={(e) => setGenre(e.target.value)}>{MUSIC_GENRES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block text-sm">Volume<input aria-label="Volume preferido" className="mt-2 w-full accent-glow" type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label>
        <Button disabled={busy || !profile} variant="outline" type="submit" className="w-full"><Save />Salvar preferências</Button>
        {message && <p role="status" className="text-sm text-glow">{message}</p>}
      </form>
      <Button variant="ghost" className="mt-4 w-full" onClick={async () => { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); setOpen(false); await navigate({ to: "/auth", search: { redirect: "/" }, replace: true }); }}><LogOut />Sair</Button>
    </aside>}
  </>;
}