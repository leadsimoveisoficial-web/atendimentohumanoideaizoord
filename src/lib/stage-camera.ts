/** World-space framing for the supplied Zoord avatar (waist ≈ 2.2, head ≈ 3.4). */
export const STAGE_CAMERA = {
  near: 3.05,
  fullBody: 10.5,
  far: 28,
  closeTargetY: 3.25,
  fullTargetY: 2.45,
  fov: 40,
} as const;

export function stageCameraTarget(distance: number) {
  const t = Math.min(1, Math.max(0, (distance - STAGE_CAMERA.near) / (STAGE_CAMERA.fullBody - STAGE_CAMERA.near)));
  const blend = t * t * (3 - 2 * t);
  return STAGE_CAMERA.closeTargetY + (STAGE_CAMERA.fullTargetY - STAGE_CAMERA.closeTargetY) * blend;
}