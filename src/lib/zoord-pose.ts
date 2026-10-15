import * as THREE from "three";

/** Remove only our own last layer; never overwrite a fresh animation pose. */
export class PoseLayer {
  private bones = new Map<THREE.Object3D, { base: THREE.Quaternion; last: THREE.Quaternion }>();

  restore() {
    for (const [bone, pose] of this.bones) {
      if (bone.quaternion.angleTo(pose.last) < 0.00001) bone.quaternion.copy(pose.base);
    }
    this.bones.clear();
  }

  apply(bone: THREE.Object3D, change: () => void) {
    const pose = this.bones.get(bone) ?? { base: bone.quaternion.clone(), last: bone.quaternion.clone() };
    change();
    pose.last.copy(bone.quaternion);
    this.bones.set(bone, pose);
  }
}