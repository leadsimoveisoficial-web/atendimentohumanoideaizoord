export const MUSIC_GENRES = [
  { id: "br-rock", name: "Rock nacional clássico" },
  { id: "jazz", name: "Blues / Jazz" },
  { id: "electronic", name: "Eletrônico" },
  { id: "hits", name: "Hits do momento" },
  { id: "rock", name: "Rock internacional" },
  { id: "forro", name: "Forró" },
  { id: "pagode", name: "Pagode" },
  { id: "sertanejo", name: "Sertanejo" },
  { id: "hip-hop", name: "Hip-hop" },
] as const;
export type MusicGenre = typeof MUSIC_GENRES[number]["id"];
export type MusicCommand = { action: "play"; genre: MusicGenre } | { action: "stop" | "choose" };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function musicCommand(text: string): MusicCommand | null {
  const t = normalize(text);
  // A question about a genre is conversation, not a playback command.
  if (/\b(o que|quem|como|por que|porque|qual a|historia|explique|what|why|who|how|que es|explica)\b/.test(t) && !/\b(toque|tocar|coloque|toca|ouvir|play|dance|dancar|pon|reproduce)\b/.test(t)) return null;
  if (/\b(parar|pare|pausar|pause|desligar|stop)\b.*\b(musica|radio|music)\b/.test(t)) return { action: "stop" };
  if (/\bforro\b/.test(t)) return { action: "play", genre: "forro" };
  if (/\b(pagode|samba)\b/.test(t)) return { action: "play", genre: "pagode" };
  if (/\bsertanejo\b/.test(t)) return { action: "play", genre: "sertanejo" };
  if (/\b(hip[ -]?hop|rap)\b/.test(t)) return { action: "play", genre: "hip-hop" };
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
export const musicLevel: { energy: number; pulse: number; playing: boolean; genre: MusicGenre } = { energy: 0, pulse: 0, playing: false, genre: "br-rock" };
if (typeof window !== "undefined") (window as unknown as { __musicLevel: typeof musicLevel }).__musicLevel = musicLevel;

// Stylized upper-body gestures, not full choreography: keep the standing rig planted.
const DANCE_STYLES = {
  forro: { name: "Forró", speed: 2.8, sway: 0.055, nod: 0.025, reach: 0.34, lift: 0.18, forward: 0.46 },
  pagode: { name: "Pagode", speed: 3.2, sway: 0.045, nod: 0.035, reach: 0.48, lift: 0.24, forward: 0.36 },
  sertanejo: { name: "Sertanejo", speed: 2.2, sway: 0.04, nod: 0.025, reach: 0.3, lift: 0.12, forward: 0.38 },
  electronic: { name: "Eletrônico", speed: 4, sway: 0.025, nod: 0.055, reach: 0.52, lift: 0.32, forward: 0.5 },
  "hip-hop": { name: "Hip-hop", speed: 2.4, sway: 0.035, nod: 0.065, reach: 0.44, lift: 0.28, forward: 0.6 },
} as const;
const DEFAULT_DANCE = { name: "Ritmo livre", speed: 2, sway: 0.04, nod: 0.045, reach: 0.4, lift: 0.2, forward: 0.4 };
export function danceStyle(genre: MusicGenre) {
  return genre in DANCE_STYLES ? DANCE_STYLES[genre as keyof typeof DANCE_STYLES] : DEFAULT_DANCE;
}
export function danceMotion(genre: MusicGenre, time: number, energy: number, pulse: number, side: number) {
  const style = danceStyle(genre);
  const amount = Math.max(0, Math.min(1, energy));
  const beat = Math.max(0, Math.min(1, pulse));
  const sway = Math.sin(time * style.speed);
  return {
    roll: amount === 0 ? 0 : sway * style.sway * amount * 1.8,
    nod: beat * style.nod * amount * 1.6,
    reach: style.reach,
    lift: (beat + (Math.sin(time * style.speed + side * Math.PI / 2) + 1) * 0.25) * style.lift * amount * 1.7,
    forward: style.forward,
    weight: Math.min(1, amount * 0.9),
  };
}
export function rhythmEnergy(samples: Float32Array) {
  let sum = 0;
  for (const value of samples) sum += value * value;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return rms < 0.008 ? 0 : Math.min(1, rms * 5);
}

export function danceBlend(speaking: boolean, listening: boolean, presenting: boolean, gesturing: boolean) {
  return listening || presenting || gesturing ? 0 : speaking ? 0.45 : 1;
}

export function genreIntroduction(genre: MusicGenre) {
  const selected = MUSIC_GENRES.find(g => g.id === genre);
  return `Vamos de ${selected?.name ?? "música"}! Vou acompanhar o ritmo. Pode conversar comigo enquanto ouvimos.`;
}