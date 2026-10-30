import { useState } from "react";
import { createPortal } from "react-dom";
import { Hand, X, RotateCcw, UtensilsCrossed, Check, PersonStanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StagePresence } from "./StagePresence";

export type StageGesture = "wave" | "welcome" | "nod" | "point" | "rest";
export function GesturePanel({ onGesture, onOpen, hidden }: { onGesture: (gesture: StageGesture) => void; onOpen: () => void; hidden: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="ghost" className="stage-chip" onClick={() => { onOpen(); setOpen(!open); }}><Hand />Gestos</Button>
    {createPortal(<StagePresence show={open && !hidden} className="zoord-radio-panel pointer-events-auto z-40 w-[calc(100vw-32px)] max-w-sm"><section aria-label="Gestos do Zoord" className="stage-glass max-h-[55vh] overflow-y-auto p-4 text-foreground">
      <header className="mb-3 flex items-center justify-between"><h2 className="font-display text-sm">Gestos • Zoord</h2><Button variant="ghost" size="icon" aria-label="Fechar gestos" onClick={() => setOpen(false)}><X /></Button></header>
      <div className="grid grid-cols-2 gap-2">
        {([{ id: "wave", name: "Acenar / Tchau", icon: Hand }, { id: "welcome", name: "Boas-vindas", icon: PersonStanding }, { id: "nod", name: "Concordar", icon: Check }, { id: "point", name: "Apontar cardápio", icon: UtensilsCrossed }, { id: "rest", name: "Repouso", icon: RotateCcw }] as const).map(g => <Button key={g.id} variant="outline" onClick={() => { onGesture(g.id); setOpen(false); }}><g.icon />{g.name}</Button>)}
      </div>
    </section></StagePresence>, document.body)}
  </>;
}