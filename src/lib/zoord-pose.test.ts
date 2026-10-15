import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { PoseLayer } from "./zoord-pose";

describe("procedural posture layer", () => {
  it("returns a paused limb to its base pose without accumulating rotations", () => {
    const bone = new THREE.Object3D();
    const layer = new PoseLayer();
    for (let frame = 0; frame < 120; frame++) {
      layer.restore();
      layer.apply(bone, () => bone.rotateZ(0.2));
      expect(bone.rotation.z).toBeCloseTo(0.2);
    }
    layer.restore();
    expect(bone.rotation.z).toBeCloseTo(0);
  });

  it("preserves newly supplied animation poses", () => {
    const bone = new THREE.Object3D();
    const layer = new PoseLayer();
    layer.apply(bone, () => bone.rotateZ(0.2));
    bone.rotation.z = 0.5;
    layer.restore();
    expect(bone.rotation.z).toBeCloseTo(0.5);
  });

  it("restores the base after multiple gestures in one frame", () => {
    const bone = new THREE.Object3D();
    const layer = new PoseLayer();
    layer.apply(bone, () => bone.rotateZ(0.2));
    layer.apply(bone, () => bone.rotateZ(0.3));
    layer.restore();
    expect(bone.rotation.z).toBeCloseTo(0);
  });
});