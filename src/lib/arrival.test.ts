import { describe, expect, it } from "vitest";
import { createArrivalDetector } from "./arrival";

const run = (d: ReturnType<typeof createArrivalDetector>, samples: [boolean, number][]) => samples.map(([m, t]) => d(m, t));

describe("arrival detector", () => {
  it("greets after 3 sustained motion samples", () => {
    expect(run(createArrivalDetector(), [[true, 0], [true, 120], [true, 240]])).toEqual([false, false, true]);
  });
  it("ignores a single flicker", () => {
    expect(run(createArrivalDetector(), [[true, 0], [false, 120], [true, 240], [false, 360]]).some(Boolean)).toBe(false);
  });
  it("does not greet again while the person keeps moving", () => {
    const d = createArrivalDetector();
    run(d, [[true, 0], [true, 120], [true, 240]]);
    expect(run(d, [[true, 50000], [true, 50120], [true, 50240]]).some(Boolean)).toBe(false);
  });
  it("greets a new arrival after 8s quiet and 45s cooldown", () => {
    const d = createArrivalDetector();
    run(d, [[true, 0], [true, 120], [true, 240]]);
    d(false, 50000);
    expect(run(d, [[true, 50100], [true, 50200], [true, 50300]])).toEqual([false, false, true]);
  });
});
