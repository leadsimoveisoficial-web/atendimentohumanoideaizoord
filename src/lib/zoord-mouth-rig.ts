import * as THREE from "three";

/** Real blend shapes for the LED overlay; jawOpen is audio-driven, not inferred speech phonemes. */
export const MOUTH_TARGETS = ["jawOpen", "mouthClose", "mouthFunnel", "mouthPucker"] as const;

export function createMouthGeometry(cavity = false) {
  const geometry = cavity ? new THREE.CircleGeometry(0.98, 48) : new THREE.TorusGeometry(1, 0.075, 8, 48);
  const neutral = geometry.getAttribute("position").clone();
  const deform = (width: number, height: number) => {
    const positions = neutral.clone();
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i, neutral.getX(i) * width, neutral.getY(i) * height, neutral.getZ(i) * (cavity ? 1 : 0.6));
    }
    return positions;
  };
  geometry.setAttribute("position", deform(2.35, 0.10));
  geometry.morphAttributes.position = [deform(2, 1.15), deform(2.35, 0.06), deform(1.6, 0.85), deform(1.4, 0.35)];
  geometry.morphAttributes.position.forEach((attribute, i) => { attribute.name = MOUTH_TARGETS[i] ?? ""; });
  geometry.morphTargetsRelative = false;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function applyAudioMouth(mesh: THREE.Mesh | null, amplitude: number) {
  if (!mesh?.morphTargetInfluences) return;
  // Only amplitude can be measured here. Other shapes await actual Audio2Face weights.
  const safe = Number.isFinite(amplitude) ? Math.max(0, Math.min(1, amplitude)) : 0;
  mesh.morphTargetInfluences.fill(0);
  mesh.morphTargetInfluences[0] = safe;
}