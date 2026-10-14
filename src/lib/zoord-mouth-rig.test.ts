import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyAudioMouth, createMouthGeometry, MOUTH_TARGETS } from "./zoord-mouth-rig";

describe("Zoord LED blend shapes", () => {
  it("exports named, matching morph vertex sets on lips and cavity", () => {
    for (const cavity of [false, true]) {
      const geometry = createMouthGeometry(cavity);
      expect(geometry.morphAttributes.position.map((target) => target.name)).toEqual([...MOUTH_TARGETS]);
      for (const target of geometry.morphAttributes.position) expect(target.count).toBe(geometry.getAttribute("position").count);
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