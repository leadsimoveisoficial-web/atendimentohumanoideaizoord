export const MUSIC_GENRES = [
  { id: "br-rock", name: "Rock nacional clássico" },
  { id: "jazz", name: "Blues / Jazz" },
  { id: "electronic", name: "Eletrônico" },
  { id: "hits", name: "Hits do momento" },
  { id: "rock", name: "Rock internacional" },
] as const;
export type MusicGenre = typeof MUSIC_GENRES[number]["id"];
export type MusicCommand = { action: "play"; genre: MusicGenre } | { action: "stop" | "choose" };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function musicCommand(text: string): MusicCommand | null {
  const t = normalize(text);
  if (/\b(parar|pare|pausar|pause|desligar|stop)\b.*\b(musica|radio|music)\b/.test(t)) return { action: "stop" };
  if (/\b(rock nacional|rock brasileiro)\b/.test(t)) return { action: "play", genre: "br-rock" };
  if (/\b(blues|jazz)\b/.test(t)) return { action: "play", genre: "jazz" };
  if (/\b(eletronico|eletronica|electronic|dance music)\b/.test(t)) return { action: "play", genre: "electronic" };
  if (/\b(hits|sucessos|pop music)\b/.test(t)) return { action: "play", genre: "hits" };
  if (/\b(rock internacional|classic rock|rock)\b/.test(t)) return { action: "play", genre: "rock" };
  if (/\b(musica|radio|music)\b/.test(t)) return { action: "choose" };
  return null;
}
export function dispatchMusic(command: MusicCommand) {
  window.dispatchEvent(new CustomEvent("zoord:music", { detail: command }));
}

// Separate from speech: radio must never open the mouth.
export const musicLevel = { energy: 0, pulse: 0, playing: false };
export function rhythmEnergy(samples: Float32Array) {
  let sum = 0;
  for (const value of samples) sum += value * value;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return rms < 0.008 ? 0 : Math.min(1, rms * 5);
}