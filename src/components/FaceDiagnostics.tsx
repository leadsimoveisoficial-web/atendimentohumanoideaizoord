import { useEffect, useState } from "react";
import { faceDebug, faceLive, type FaceTarget } from "@/lib/zoord-face";
import { Button } from "@/components/ui/button";

const CONTROLS = [
  ["blinkL", "Blink Left", "blinkLeft"], ["blinkR", "Blink Right", "blinkRight"], ["smile", "Smile", "happy"],
  ["open", "Jaw Open (aa)", "aa"], ["a", "Viseme AA", "aa"], ["e", "Viseme EE", "ee"], ["i", "Viseme IH", "ih"],
  ["o", "Viseme OH", "oh"], ["u", "Viseme OU", "ou"], ["surprise", "Surpresa", "surprised"],
] as const satisfies readonly (readonly [string, string, FaceTarget])[];

/** Facial diagnostics: sliders override the automatic face; real applied weights are shown live. */
export function FaceDiagnostics() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});
  const [live, setLive] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setLive({ ...faceLive }), 150);
    return () => clearInterval(id);
  }, [open]);
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
  const neutral = () => { setValues({}); faceDebug.values = {}; };
  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-30 text-xs">
      <Button size="sm" variant="outline" onClick={toggle}>{open ? "Fechar rosto" : "Teste do rosto"}</Button>
      {open && (
        <div className="stage-glass mt-2 w-72 space-y-1.5 p-3 text-foreground">
          {CONTROLS.map(([k, label, target]) => (
            <label key={k} className="flex items-center justify-between gap-2">
              <span className="w-24">{label}</span>
              <input type="range" min={0} max={1} step={0.01} value={values[k] ?? 0} onChange={(e) => set(k, Number(e.target.value))} className="flex-1 accent-primary" aria-label={label} />
              <span className="w-9 text-right tabular-nums text-muted-foreground">{(live[target] ?? 0).toFixed(2)}</span>
            </label>
          ))}
          <Button size="sm" variant="ghost" className="w-full" onClick={neutral}>Neutral</Button>
        </div>
      )}
    </div>
  );
}
