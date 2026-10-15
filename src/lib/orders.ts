export type OrderItem = { name: string; quantity: number; price: number | null };
export type NewOrder = { customer_name: string; table_number: string; notes: string; items: OrderItem[]; total: number };

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function orderWhatsapp(o: NewOrder) {
  const lines = [
    "*Comanda DAKKAI × ZOORD*",
    `Mesa: ${o.table_number || "-"}  •  Cliente: ${o.customer_name || "-"}`,
    ...o.items.map((i) => `${i.quantity}x ${i.name}${i.price !== null ? ` — ${brl(i.price * i.quantity)}` : ""}`),
    o.notes ? `Obs: ${o.notes}` : "",
    `Total: ${brl(o.total)}`,
  ].filter(Boolean);
  return `https://wa.me/5548996522594?text=${encodeURIComponent(lines.join("\n"))}`;
}
