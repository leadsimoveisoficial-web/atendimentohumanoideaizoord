import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { jadeJawOpening, limbLength, prepareJade } from "./jade-rig";

describe("Jade rig", () => {
  it("uses the supplied Jade head and arm bones", () => {
    const scene = new THREE.Group();
    const head = new THREE.Bone(); head.name = "Head_M_046"; scene.add(head);
    expect(prepareJade(scene).get("Head")).toBe(head);
  });
  it("measures the full limb across intermediate twist bones", () => {
    const arm = new THREE.Bone(), twist = new THREE.Bone(), elbow = new THREE.Bone();
    arm.add(twist); twist.add(elbow); twist.position.x = 2; elbow.position.x = 1; arm.scale.setScalar(0.5);
    expect(limbLength(arm, elbow)).toBeCloseTo(1.5);
  });
  it("closes the native jaw in silence and caps its opening", () => {
    expect(jadeJawOpening(0)).toBe(0);
    expect(jadeJawOpening(4)).toBe(0.14);
    expect(jadeJawOpening(Number.NaN)).toBe(0);
  });
});