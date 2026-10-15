import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Discreet public status: shows only whether 24h monitoring is on, never any camera data. */
export function SecurityBadge() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    supabase.rpc("security_mode_active").then(({ data }) => setActive(Boolean(data)));
  }, []);
  if (!active) return null;
  return (
    <span title="Segurança 24h ativa" className="hidden items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary sm:flex">
      <ShieldCheck className="h-3 w-3" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      24h
    </span>
  );
}
