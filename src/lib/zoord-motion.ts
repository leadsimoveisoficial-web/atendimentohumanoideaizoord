/** Shared timing for the existing stationary host, independent of renderer/audio transport. */
export const HOST_MOTION = {
  transition: 0.55,
  clipSpeed: 0.72,
  speechHold: 0.4,
  maxDelta: 0.05,
  breathingPitch: 0.012,
  breathingRoll: 0.008,
} as const;

export function motionStep(delta: number) {
  return Number.isFinite(delta) ? Math.max(0, Math.min(delta, HOST_MOTION.maxDelta)) : 0;
}

export function smoothMotion(current: number, target: number, delta: number, speed = 5) {
  return target + (current - target) * Math.exp(-speed * motionStep(delta));
}

export const BREATH_RATE = (Math.PI * 2) / 3;

export function hostBreathing(time: number, reduced: boolean, busy: boolean) {
  const amount = reduced || busy ? 0 : 1;
  return {
    // One full breath every 3 s: chest rises (pitch), with a gentle chest yaw and spine roll.
    pitch: Math.sin(time * BREATH_RATE) * HOST_MOTION.breathingPitch * amount,
    yaw: Math.sin(time * BREATH_RATE + 0.6) * HOST_MOTION.breathingPitch * 0.5 * amount,
    roll: Math.sin(time * 0.65) * HOST_MOTION.breathingRoll * amount,
  };
}

export function hostDanceTarget(speaking: boolean, listening: boolean, pointing: boolean, gesturing: boolean, reduced: boolean) {
  return reduced || listening || pointing || gesturing ? 0 : speaking ? 0.45 : 1;
}