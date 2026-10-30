import { describe, expect, it } from "vitest";
import { HEAD_POSTURE, hostLookPitch, hostBreathing, hostDanceTarget, motionStep, smoothMotion } from "./zoord-motion";

describe("stationary host motion", () => {
  it("gives listening, pointing and explicit gestures priority over music", () => {
    expect(hostDanceTarget(false, true, false, false, false)).toBe(0);
    expect(hostDanceTarget(false, false, true, false, false)).toBe(0);
    expect(hostDanceTarget(false, false, false, true, false)).toBe(0);
    expect(hostDanceTarget(true, false, false, false, false)).toBe(0.45);
  });
  it("suppresses ambient movement and dance for reduced motion", () => {
    expect(hostDanceTarget(false, false, false, false, true)).toBe(0);
    expect(hostBreathing(1, true, false)).toEqual({ pitch: 0, yaw: 0, roll: 0 });
    expect(hostBreathing(1, false, true)).toEqual({ pitch: 0, yaw: 0, roll: 0 });
  });
  it("bounds breathing to the chest without positional or lower-body motion", () => {
    for (let time = 0; time < 600; time += 0.17) {
      const breath = hostBreathing(time, false, false);
      expect(Math.abs(breath.pitch)).toBeLessThanOrEqual(0.012);
      expect(Math.abs(breath.roll)).toBeLessThanOrEqual(0.008);
    }
  });
  it("blends consistently at different frame rates without jumping", () => {
    let slow = 0, fast = 0;
    for (let i = 0; i < 30; i++) slow = smoothMotion(slow, 1, 1 / 30);
    for (let i = 0; i < 120; i++) fast = smoothMotion(fast, 1, 1 / 120);
    expect(slow).toBeCloseTo(fast, 10);
    expect(smoothMotion(1, 0, 1 / 60)).toBeGreaterThan(0.9);
    expect(motionStep(10)).toBe(0.05);
    expect(motionStep(-1)).toBe(0);
  });
});
describe("breathing rhythm", () => {
  it("completes one breath every 3 seconds", async () => {
    const { BREATH_RATE } = await import("./zoord-motion");
    expect((Math.PI * 2) / BREATH_RATE).toBeCloseTo(3);
    expect(hostBreathing(0.75, false, false).pitch).toBeCloseTo(hostBreathing(3.75, false, false).pitch);
  });
});

describe("permanent elevated gaze", () => {
  it("keeps a 3 degree lift even with the mouse below the avatar", () => {
    expect(hostLookPitch(-1, 1)).toBeCloseTo(Math.PI / 60);
    expect(hostLookPitch(0, 1)).toBe(hostLookPitch(0, 0));
  });
  it("limits downward nods to 2 degrees", () => {
    expect(hostLookPitch(0, 1, 10)).toBeCloseTo(-2 * Math.PI / 180);
    expect(hostLookPitch(10, -10)).toBe(HEAD_POSTURE.upMax);
  });
});
