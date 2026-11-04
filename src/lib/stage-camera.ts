/** World-space framing for the supplied Zoord avatar (waist ≈ 2.2, head ≈ 3.4). */
export const STAGE_CAMERA = {
  near: 3.05,
  fullBody: 10.5,
  far: 28,
  closeTargetY: 3.25,
  fullTargetY: 2.45,
  fov: 40,
  driftX: 0.025,
  driftY: 0.008,
  dolly: 0.035,
} as const;

export function cameraDrift(time: number, reduced: boolean) {
  if (reduced) return { x: 0, y: 0, z: 0 };
  return {
    x: STAGE_CAMERA.driftX * Math.sin(time * 0.16),
    y: STAGE_CAMERA.driftY * Math.sin(time * 0.21),
    z: STAGE_CAMERA.dolly * (1 - Math.cos(time * 0.13)) / 2,
  };
}

export function stageCameraTarget(distance: number) {
  const t = Math.min(1, Math.max(0, (distance - STAGE_CAMERA.near) / (STAGE_CAMERA.fullBody - STAGE_CAMERA.near)));
  const blend = t * t * (3 - 2 * t);
  return STAGE_CAMERA.closeTargetY + (STAGE_CAMERA.fullTargetY - STAGE_CAMERA.closeTargetY) * blend;
}