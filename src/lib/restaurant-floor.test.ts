import { describe, expect, it } from "vitest";
import { RESTAURANT_FLOOR_PIXELS } from "./restaurant-floor";

describe("baked restaurant floor intersections", () => {
  it("preserves the floor lights without runtime intersections", () => {
    expect(RESTAURANT_FLOOR_PIXELS).toHaveLength(240);
    expect(RESTAURANT_FLOOR_PIXELS.filter((pixel) => pixel.valid)).toHaveLength(237);
    for (const pixel of RESTAURANT_FLOOR_PIXELS) {
      expect(Number.isFinite(pixel.x + pixel.y + pixel.z)).toBe(true);
      expect(Math.abs(pixel.x)).toBeLessThanOrEqual(6.8);
    }
  });
});