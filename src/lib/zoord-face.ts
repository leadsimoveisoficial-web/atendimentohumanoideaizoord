/**
 * Facial weights for the VRM avatar's own 11 morph targets (aa, ih, ee, oh, ou, blinks, happy, angry, surprised).
 * Driven by measured playback audio (loudness opens, spectral balance picks rounded/wide vowels) — not phoneme recognition.
 * No jaw bone exists in the rig, so the opening comes only from the supplied visemes.
 */
export const FACE_TARGETS = ["aa", "ih", "ee", "oh", "ou", "blinkLeft", "blinkRight", "blink", "happy", "angry", "surprised"] as const;
export type FaceTarget = (typeof FACE_TARGETS)[number];
export type FaceWeights = Record<FaceTarget, number>;

/** Mouth total cap: the supplied aa/oh/ee targets deform nose and cheeks above ~0.3, so speech stays below it. */
export const FACE_LIMITS = { mouthMax: 0.3, smileMax: 0.3, attack: 22, release: 14 };

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
export const emptyFace = (): FaceWeights => Object.fromEntries(FACE_TARGETS.map((t) => [t, 0])) as FaceWeights;

/** Vowel mix from audio: rounded voice → O/U, bright → E/I, otherwise open A. Normalized to the mouth cap. */
export function visemesFromAudio(level: number, round: number, wide: number) {
  const a = clamp(level), r = clamp(round), w = clamp(wide);
  const raw = { aa: Math.max(0, 1 - r - w), oh: r * 0.65, ou: r * 0.35, ee: w * 0.6, ih: w * 0.4 };
  const total = raw.aa + raw.oh + raw.ou + raw.ee + raw.ih || 1;
  const open = a * FACE_LIMITS.mouthMax;
  return { aa: (raw.aa / total) * open, ih: (raw.ih / total) * open, ee: (raw.ee / total) * open, oh: (raw.oh / total) * open, ou: (raw.ou / total) * open };
}

/** Framerate-independent easing; faster attack than release keeps syllables crisp yet smooth. */
export function easeWeight(current: number, target: number, dt: number) {
  const k = target > current ? FACE_LIMITS.attack : FACE_LIMITS.release;
  const next = current + (target - current) * (1 - Math.exp(-k * Math.max(0, Math.min(dt, 0.1))));
  return next < 0.002 && target === 0 ? 0 : next;
}

/** Natural blink: ~150 ms close/open, every 2.5–6 s. Returns 0..1 closure. */
export function blinkCurve(sinceStart: number) {
  const d = 0.15;
  if (sinceStart < 0 || sinceStart > d) return 0;
  return Math.sin((sinceStart / d) * Math.PI);
}
export const nextBlinkDelay = (rand = Math.random()) => 2.5 + rand * 3.5;

/** Manual diagnostic overrides (0..1 each, null = automatic). */
export const faceDebug: { enabled: boolean; values: Partial<Record<"open" | "a" | "e" | "i" | "o" | "u" | "blinkL" | "blinkR" | "smile" | "surprise", number>> } = { enabled: false, values: {} };

export function debugWeights(v: typeof faceDebug.values): FaceWeights {
  const f = emptyFace();
  const open = clamp(v.open ?? 0);
  f.aa = clamp(Math.max(v.a ?? 0, open));
  f.ee = clamp(v.e ?? 0); f.ih = clamp(v.i ?? 0); f.oh = clamp(v.o ?? 0); f.ou = clamp(v.u ?? 0);
  // Combined vowels share the same cap as speech.
  const mouth = f.aa + f.ee + f.ih + f.oh + f.ou;
  if (mouth > 1) for (const k of ["aa", "ee", "ih", "oh", "ou"] as const) f[k] /= mouth;
  f.blinkLeft = clamp(v.blinkL ?? 0); f.blinkRight = clamp(v.blinkR ?? 0);
  f.happy = clamp(v.smile ?? 0); f.surprised = clamp(v.surprise ?? 0);
  return f;
}
