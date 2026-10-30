import { X } from "lucide-react";
import { brl, orderWhatsapp, type NewOrder } from "@/lib/orders";
import { Button } from "./ui/button";

export type TicketState = { order: NewOrder; status: "sending" | "sent" | "failed" };

export function OrderTicket({ ticket, onClose }: { ticket: TicketState; onClose: () => void }) {
  const { order, status } = ticket;
  return (
    <section aria-label="Pedido anotado" className="stage-glass pointer-events-auto fixed left-3 top-20 z-50 w-[min(300px,calc(100vw-24px))] p-4 text-sm text-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-xs tracking-[0.3em] text-primary">COMANDA</h2>
        <Button variant="ghost" size="icon" aria-label="Fechar comanda" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></Button>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Mesa {order.table_number || "—"} • {order.customer_name || "Cliente"}</p>
      <ul className="mb-2 space-y-1">
        {order.items.map((i) => (
          <li key={i.name} className="flex justify-between gap-2">
            <span>{i.quantity}× {i.name}</span>
            <span className="shrink-0 text-muted-foreground">{i.price !== null ? brl(i.price * i.quantity) : "Consulte"}</span>
          </li>
        ))}
      </ul>
      {order.notes && <p className="mb-2 text-xs text-muted-foreground">Obs: {order.notes}</p>}
      <p className="mb-3 flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{brl(order.total)}</span></p>
      <p className="mb-2 text-xs" role="status">
        {status === "sending" ? "Enviando para a cozinha…" : status === "sent" ? "✓ Enviado para a cozinha" : "Não consegui enviar para a cozinha. Use o WhatsApp."}
      </p>
      <a href={orderWhatsapp(order)} target="_blank" rel="noreferrer" className="stage-chip stage-chip-red w-full justify-center">Enviar cópia no WhatsApp</a>
    </section>
  );
}
