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

/** Amplitude opens; measured spectral balance rounds (dark voice) or widens (bright voice). Not phonemes. */
export function applyAudioMouth(mesh: THREE.Mesh | null, amplitude: number, round = 0, wide = 0) {
  if (!mesh?.morphTargetInfluences) return;
  const a = clamp(amplitude), r = clamp(round), w = clamp(wide);
  const m = mesh.morphTargetInfluences;
  m.fill(0);
  m[0] = a * (1 - 0.6 * r - 0.5 * w); // jawOpen
  m[1] = a * w * 0.6; // mouthClose: wide, flat
  m[2] = a * r * 0.7; // mouthFunnel: rounded
  m[3] = a * r * 0.3; // mouthPucker
}