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

export function hostBreathing(time: number, reduced: boolean, busy: boolean) {
  const amount = reduced || busy ? 0 : 1;
  return {
    pitch: Math.sin(time * 1.25) * HOST_MOTION.breathingPitch * amount,
    roll: Math.sin(time * 0.65) * HOST_MOTION.breathingRoll * amount,
  };
}

export function hostDanceTarget(speaking: boolean, listening: boolean, pointing: boolean, gesturing: boolean, reduced: boolean) {
  return reduced || listening || pointing || gesturing ? 0 : speaking ? 0.45 : 1;
}