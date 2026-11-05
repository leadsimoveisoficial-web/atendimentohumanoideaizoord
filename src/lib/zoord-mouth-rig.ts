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

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

/** One bounded blend shared by the cavity, lip rim and internal mouth details. */
export function audioMouthPose(amplitude: number, round = 0, wide = 0) {
  const a = clamp(amplitude), r = clamp(round), w = clamp(wide);
  const weights = [a * Math.max(0, 1 - 0.6 * r - 0.5 * w), a * w * 0.6, a * r * 0.7, a * r * 0.3];
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total > a && total > 0) for (let i = 0; i < weights.length; i++) weights[i] = (weights[i] ?? 0) * a / total;
  const neutral = 1 - weights.reduce((sum, value) => sum + value, 0);
  return {
    weights,
    width: neutral * 2.35 + (weights[0] ?? 0) * 2 + (weights[1] ?? 0) * 2.35 + (weights[2] ?? 0) * 1.6 + (weights[3] ?? 0) * 1.4,
    height: neutral * 0.10 + (weights[0] ?? 0) * 1.15 + (weights[1] ?? 0) * 0.06 + (weights[2] ?? 0) * 0.85 + (weights[3] ?? 0) * 0.35,
    visible: a > 0.04,
  };
}

/** Amplitude opens; measured spectral balance rounds (dark voice) or widens (bright voice). Not phonemes. */
export function applyAudioMouth(mesh: THREE.Mesh | null, amplitude: number, round = 0, wide = 0) {
  if (!mesh?.morphTargetInfluences) return;
  const { weights } = audioMouthPose(amplitude, round, wide);
  const m = mesh.morphTargetInfluences;
  m.fill(0);
  weights.forEach((weight, index) => { m[index] = weight; });
}