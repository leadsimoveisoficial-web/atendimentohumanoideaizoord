import { useState } from "react";
import { faceDebug } from "@/lib/zoord-face";
import { Button } from "@/components/ui/button";

const CONTROLS = [
  ["open", "Abertura da boca"], ["a", "Vogal A"], ["e", "Vogal E"], ["i", "Vogal I"], ["o", "Vogal O"], ["u", "Vogal U"],
  ["blinkL", "Piscada esquerda"], ["blinkR", "Piscada direita"], ["smile", "Sorriso"], ["surprise", "Surpresa"],
] as const;

/** Facial diagnostics: independent sliders that override the automatic face while open. */
export function FaceDiagnostics() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});
  const toggle = () => {
    const next = !open;
    setOpen(next);
    faceDebug.enabled = next;
    if (!next) { faceDebug.values = {}; setValues({}); }
  };
  const set = (k: string, v: number) => {
    const nv = { ...values, [k]: v };
    setValues(nv);
    faceDebug.values = nv;
  };
  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-30 text-xs">
      <Button size="sm" variant="outline" onClick={toggle}>{open ? "Fechar rosto" : "Teste do rosto"}</Button>
      {open && (
        <div className="stage-glass mt-2 w-60 space-y-1.5 rounded-lg border border-border p-3 text-foreground">
          {CONTROLS.map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-2">
              <span className="w-28">{label}</span>
              <input type="range" min={0} max={1} step={0.01} value={values[k] ?? 0} onChange={(e) => set(k, Number(e.target.value))} className="flex-1 accent-primary" aria-label={label} />
            </label>
          ))}
          <Button size="sm" variant="ghost" className="w-full" onClick={() => { setValues({}); faceDebug.values = {}; }}>Zerar</Button>
        </div>
      )}
    </div>
  );
}
