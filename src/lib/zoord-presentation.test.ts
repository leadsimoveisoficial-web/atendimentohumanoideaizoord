import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { plantedPresentationClip } from "./zoord-presentation";

describe("stationary menu presentation", () => {
  it("removes leg rotations and root motion while preserving the supplied hand gestures", () => {
    const tracks = ["mixamorigLeftUpLeg", "mixamorigRightLeg", "mixamorigLeftFoot", "mixamorigHips", "Armature", "mixamorigLeftArm", "mixamorigHead"].map((name) =>
      new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, [0, 1], [0, 0, 0, 1, 0, 1, 0, 0]),
    );
    const original = new THREE.AnimationClip("Talk_with_Hands_Open", 1, tracks);
    const safe = plantedPresentationClip(original);
    expect(safe.tracks.map((track) => track.name)).toEqual(["mixamorigLeftArm.quaternion", "mixamorigHead.quaternion"]);
    expect(original.tracks).toHaveLength(7);
  });
  it("keeps the new avatar's conversation stationary, including toe end bones", () => {
    const tracks = ["mixamorigHips", "mixamorigLeftToe_End", "mixamorigRightToe_End", "SmartRigArmature", "mixamorigLeftArm", "mixamorigHead"].map((name) =>
      new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, [0, 1], [0, 0, 0, 1, 0, 1, 0, 0]),
    );
    const safe = plantedPresentationClip(new THREE.AnimationClip("Stand_and_Chat", 1, tracks));
    expect(safe.tracks.map((track) => track.name)).toEqual(["mixamorigLeftArm.quaternion", "mixamorigHead.quaternion"]);
  });
});