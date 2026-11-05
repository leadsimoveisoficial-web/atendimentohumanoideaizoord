import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyAudioMouth, audioMouthPose, createMouthGeometry, MOUTH_TARGETS } from "./zoord-mouth-rig";

describe("Zoord LED blend shapes", () => {
  it("keeps overlapping spectral blends nonnegative and within measured opening", () => {
    const pose = audioMouthPose(0.8, 1, 1);
    expect(pose.weights.every((weight) => weight >= 0)).toBe(true);
    expect(pose.weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(0.8);
  });
  it("derives interior dimensions from the actual blended cavity and closes in silence", () => {
    const pose = audioMouthPose(1, 1, 0);
    expect(pose.width).toBeCloseTo(0.4 * 2 + 0.42 * 1.6 + 0.18 * 1.4);
    expect(pose.height).toBeCloseTo(0.4 * 1.15 + 0.42 * 0.85 + 0.18 * 0.35);
    expect(audioMouthPose(0, 1, 1)).toMatchObject({ width: 2.35, height: 0.1, visible: false });
    expect(audioMouthPose(NaN, NaN, Infinity).visible).toBe(false);
  });
  it("exports named, matching morph vertex sets on lips and cavity", () => {
    for (const cavity of [false, true]) {
      const geometry = createMouthGeometry(cavity);
      const targets = geometry.morphAttributes.position ?? [];
      expect(targets.map((target) => target.name)).toEqual([...MOUTH_TARGETS]);
      for (const target of targets) expect(target.count).toBe(geometry.getAttribute("position").count);
      geometry.dispose();
    }
  });
  it("drives jawOpen from sound and restores neutral on silence without fabricating phonemes", () => {
    const geometry = createMouthGeometry();
    const mesh = new THREE.Mesh(geometry);
    applyAudioMouth(mesh, 0.8);
    expect(mesh.morphTargetInfluences).toEqual([0.8, 0, 0, 0]);
    applyAudioMouth(mesh, 0);
    expect(mesh.morphTargetInfluences).toEqual([0, 0, 0, 0]);
    applyAudioMouth(mesh, NaN);
    expect(mesh.morphTargetInfluences).toEqual([0, 0, 0, 0]);
    geometry.dispose();
  });
});