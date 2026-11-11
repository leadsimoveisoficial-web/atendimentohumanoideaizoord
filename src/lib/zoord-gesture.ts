import * as THREE from "three";

/** Aim the actual child-bone axis, preserving the animated limb's twist. */
export function aimLimb(bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3, weight: number) {
  if (!bone.parent || weight <= 0) return;
  bone.updateWorldMatrix(true, true);
  const world = bone.getWorldQuaternion(new THREE.Quaternion());
  const origin = bone.getWorldPosition(new THREE.Vector3());
  const axis = child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const direction = target.clone().sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(axis, direction);
  const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  const desired = parent.multiply(delta.multiply(world));
  bone.quaternion.slerp(desired, weight);
  bone.updateWorldMatrix(false, true);
}