import { describe, expect, it } from "vitest";
import { blinkCurve, debugWeights, easeWeight, FACE_LIMITS, visemesFromAudio } from "./zoord-face";

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe("zoord face", () => {
  it("silence closes the mouth", () => {
    expect(sum(visemesFromAudio(0, 0.5, 0.5))).toBe(0);
  });
  it("visemes never stack above the mouth cap", () => {
    expect(sum(visemesFromAudio(1, 1, 1))).toBeLessThanOrEqual(FACE_LIMITS.mouthMax + 1e-9);
  });
  it("rounded voice favours O/U, bright voice E/I", () => {
    const r = visemesFromAudio(1, 1, 0), w = visemesFromAudio(1, 0, 1);
    expect(r.oh + r.ou).toBeGreaterThan(r.ee + r.ih);
    expect(w.ee + w.ih).toBeGreaterThan(w.oh + w.ou);
  });
  it("easing reaches zero after speech ends", () => {
    let v = 0.8;
    for (let i = 0; i < 60; i++) v = easeWeight(v, 0, 1 / 60);
    expect(v).toBe(0);
  });
  it("blink closes and reopens", () => {
    expect(blinkCurve(0.075)).toBeCloseTo(1);
    expect(blinkCurve(0.2)).toBe(0);
  });
  it("combined debug vowels are normalized", () => {
    const f = debugWeights({ a: 1, o: 1 });
    expect(f.aa + f.oh).toBeCloseTo(1);
  });
});
