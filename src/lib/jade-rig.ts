import * as THREE from "three";

const JADE_BONES: Record<string, string> = {
  Hips: "Root_M_01", Spine: "Spine1_M_010", Spine1: "Spine1Part1_M_011", Spine2: "Chest_M_013",
  Neck: "Neck_M_043", Head: "Head_M_046",
  RightShoulder: "Scapula_R_014", RightArm: "Shoulder_R_015", RightForeArm: "Elbow_R_018", RightHand: "Wrist_R_021",
  LeftShoulder: "Scapula_L_065", LeftArm: "Shoulder_L_066", LeftForeArm: "Elbow_L_069", LeftHand: "Wrist_L_072",
};

/** Keep the authored node transforms; Skeleton.pose ignores this export's scaled parent hierarchy. */
export function prepareJade(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);
  const bones = new Map<string, THREE.Object3D>();
  for (const [role, name] of Object.entries(JADE_BONES)) {
    const bone = scene.getObjectByName(name);
    if (bone) bones.set(role, bone);
  }
  return bones;
}

/** Twist/helper bones sit between joints; measure the actual descendant in world space. */
export function limbLength(bone: THREE.Object3D, child: THREE.Object3D) {
  bone.updateWorldMatrix(true, true);
  return bone.getWorldPosition(new THREE.Vector3()).distanceTo(child.getWorldPosition(new THREE.Vector3()));
}

export function jadeJawOpening(level: number) {
  return Number.isFinite(level) ? THREE.MathUtils.clamp(level, 0, 1) * 0.14 : 0;
}