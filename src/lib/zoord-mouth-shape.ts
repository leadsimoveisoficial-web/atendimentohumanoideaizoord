/** Stylized lip opening from audible amplitude, not a phoneme recognizer. */
export function mouthShape(level: number) {
  const opening = Math.max(0, Math.min(1, level));
  return {
    width: 2.35 - opening * 0.35,
    height: 0.10 + opening * 1.05,
    opacity: 0.65 + opening * 0.3,
  };
}