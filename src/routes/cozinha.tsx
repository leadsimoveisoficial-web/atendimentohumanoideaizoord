import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, type OrderItem } from "@/lib/orders";

export const Route = createFileRoute("/cozinha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cozinha — Comandas DAKKAI × ZOORD" },
      { name: "description", content: "Painel da cozinha do Dakkai Sushi com os pedidos anotados pelo Zoord em tempo real." },
      { property: "og:title", content: "Cozinha — Comandas DAKKAI × ZOORD" },
      { property: "og:description", content: "Pedidos anotados pelo Zoord chegando na cozinha em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Kitchen,
});

type Order = { id: string; table_number: string; customer_name: string; items: OrderItem[]; total: number; notes: string; status: string; created_at: string };
const NEXT: Record<string, string> = { novo: "preparando", preparando: "pronto", pronto: "entregue" };
const LABEL: Record<string, string> = { novo: "Começar preparo", preparando: "Marcar pronto", pronto: "Entregue" };

function Kitchen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const load = async () => {
    const { data } = await supabase.from("orders").select("*").neq("status", "entregue").order("created_at", { ascending: true });
    setOrders((data ?? []) as unknown as Order[]);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("orders-kitchen").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const advance = async (o: Order) => {
    const next = NEXT[o.status];
    if (!next) return;
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status: next } : x)).filter((x) => x.status !== "entregue"));
    await supabase.from("orders").update({ status: next }).eq("id", o.id);
  };
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <h1 className="mb-6 font-display text-xl tracking-[0.4em]">COZINHA <span className="text-dakkai">•</span> COMANDAS</h1>
      {orders.length === 0 && <p className="text-muted-foreground">Nenhum pedido em aberto.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <article key={o.id} className={`rounded-xl border p-4 ${o.status === "novo" ? "border-dakkai" : o.status === "pronto" ? "border-primary" : "border-border"}`}>
            <header className="mb-2 flex justify-between">
              <strong className="text-lg">Mesa {o.table_number || "—"}</strong>
              <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </header>
            <p className="mb-2 text-sm text-muted-foreground">{o.customer_name || "Cliente"} • {o.status.toUpperCase()}</p>
            <ul className="mb-2 space-y-1 text-base">
              {o.items.map((i) => <li key={i.name}><strong>{i.quantity}×</strong> {i.name}</li>)}
            </ul>
            {o.notes && <p className="mb-2 text-sm text-dakkai">Obs: {o.notes}</p>}
            <p className="mb-3 text-sm text-muted-foreground">Total {brl(Number(o.total))}</p>
            <button onClick={() => advance(o)} className="stage-chip w-full justify-center">{LABEL[o.status]}</button>
          </article>
        ))}
      </div>
    </main>
  );
}
