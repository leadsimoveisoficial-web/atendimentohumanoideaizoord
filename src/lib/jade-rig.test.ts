import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyJadeJaw, jadeJaws, jadeJawOpening, limbLength, prepareJade } from "./jade-rig";

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
  it("drives the two jaw parents without double-driving the auxiliary child", () => {
    const scene = new THREE.Group();
    const right = new THREE.Bone(); right.name = "Jaw_R_049";
    const left = new THREE.Bone(); left.name = "Jaw_L_058";
    const helper = new THREE.Bone(); helper.name = "Jaw_L_058_0";
    scene.add(right, left); left.add(helper);
    expect(jadeJaws(scene).map(({ bone }) => bone.name)).toEqual(["Jaw_R_049", "Jaw_L_058"]);
  });
  it("restores the original jaw in silence without accumulating rotation", () => {
    const head = new THREE.Bone(), jaw = new THREE.Bone(); head.add(jaw);
    const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.4, -0.1));
    for (let i = 0; i < 20; i++) applyJadeJaw(jaw, rest, 0.14);
    expect(jaw.quaternion.angleTo(rest)).toBeCloseTo(0.14);
    applyJadeJaw(jaw, rest, 0);
    expect(jaw.quaternion.angleTo(rest)).toBeCloseTo(0);
  });
  it("uses the authored head basis for a horizontal jaw hinge", () => {
    const head = new THREE.Bone(), jaw = new THREE.Bone(); head.add(jaw);
    head.rotation.z = Math.PI / 2;
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(head.quaternion.clone().invert());
    applyJadeJaw(jaw, new THREE.Quaternion(), 0.14, axis);
    const expected = new THREE.Quaternion().setFromAxisAngle(axis, 0.14);
    expect(jaw.quaternion.angleTo(expected)).toBeCloseTo(0);
    expect(axis.clone().applyQuaternion(head.quaternion).distanceTo(new THREE.Vector3(1, 0, 0))).toBeCloseTo(0);
  });
});