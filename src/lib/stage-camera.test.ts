import { describe, expect, it } from "vitest";
import { STAGE_CAMERA, stageCameraTarget, cameraDrift } from "./stage-camera";

describe("Zoord camera framing", () => {
  it("keeps cinematic motion discreet and disables it for reduced motion", () => {
    for (let time = 0; time < 120; time += 0.1) {
      const drift = cameraDrift(time, false);
      expect(Math.abs(drift.x)).toBeLessThanOrEqual(0.025);
      expect(Math.abs(drift.y)).toBeLessThanOrEqual(0.008);
      expect(drift.z).toBeLessThanOrEqual(0.035);
    }
    expect(cameraDrift(10, true)).toEqual({ x: 0, y: 0, z: 0 });
  });
  it("starts at the waist with the head within the centered upper-body view", () => {
    const halfHeight = STAGE_CAMERA.near * Math.tan(STAGE_CAMERA.fov * Math.PI / 360);
    const target = stageCameraTarget(STAGE_CAMERA.near);
    expect(target - halfHeight).toBeGreaterThan(2.1);
    expect(target - halfHeight).toBeLessThan(2.3);
    expect(target + halfHeight).toBeGreaterThan(3.8);
  });
  it("reveals the whole body only after zooming out", () => {
    const target = stageCameraTarget(STAGE_CAMERA.fullBody);
    const halfHeight = STAGE_CAMERA.fullBody * Math.tan(STAGE_CAMERA.fov * Math.PI / 360);
    expect(target - halfHeight).toBeLessThan(0.3);
    expect(target + halfHeight).toBeGreaterThan(3.8);
    expect(stageCameraTarget(STAGE_CAMERA.far)).toBe(2.45);
  });
});