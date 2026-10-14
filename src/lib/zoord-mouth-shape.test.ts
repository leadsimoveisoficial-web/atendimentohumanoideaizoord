import { describe, expect, it } from "vitest";
import { mouthShape } from "./zoord-mouth-shape";

describe("Zoord lip shape", () => {
  it("rests as a closed line, opens with speech, and closes without a timer", () => {
    const rest = mouthShape(0);
    const speech = mouthShape(0.8);
    expect(rest.height).toBe(0.10);
    expect(speech.height).toBeGreaterThan(rest.height);
    expect(speech.width).toBeLessThan(rest.width);
    expect(mouthShape(0)).toEqual(rest);
  });
  it("clamps input to stable geometry", () => {
    expect(mouthShape(-1)).toEqual(mouthShape(0));
    expect(mouthShape(4)).toEqual(mouthShape(1));
  });
});