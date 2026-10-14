export type CustomerReaction = { text: string; endMs: number; greeted: boolean };
export const emptyReaction = (): CustomerReaction => ({ text: "", endMs: 0, greeted: false });

export function reactToCustomer(previous: CustomerReaction, delta: string, startMs: number, endMs: number) {
  const state = startMs - previous.endMs > 1800 ? emptyReaction() : previous;
  const text = (state.text + delta).slice(-300);
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const greeting = /\b(oi|ola|bom\s+dia|boa\s+tarde|boa\s+noite)\b/.test(normalized);
  return { state: { text, endMs, greeted: state.greeted || greeting }, wave: greeting && !state.greeted };
}