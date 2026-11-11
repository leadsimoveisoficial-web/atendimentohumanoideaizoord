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

export const HEAD_POSTURE = { lift: Math.PI / 360, downMax: Math.PI / 90, upMax: Math.PI / 90, turnMax: Math.PI / 6 } as const;

/** World-space elevation: cursor cannot pull the chin below the customer's eye line. */
export function hostLookPitch(eyePitch: number, cursorY: number, nod = 0) {
  const finite = (value: number) => Number.isFinite(value) ? value : 0;
  const elevation = Math.max(0, Math.min(HEAD_POSTURE.lift, finite(eyePitch))) + HEAD_POSTURE.lift + Math.max(0, Math.min(1, -finite(cursorY))) * HEAD_POSTURE.lift - finite(nod);
  return Math.max(-HEAD_POSTURE.downMax, Math.min(HEAD_POSTURE.upMax, elevation));
}

export function hostBreathing(time: number, reduced: boolean, busy: boolean) {
  const amount = reduced || busy ? 0 : 1;
  return {
    // One full breath every 3 s: chest rises (pitch), with a gentle chest yaw and spine roll.
    pitch: Math.sin(time * BREATH_RATE) * HOST_MOTION.breathingPitch * amount,
    yaw: Math.sin(time * BREATH_RATE + 0.6) * HOST_MOTION.breathingPitch * 0.5 * amount,
    roll: Math.sin(time * BREATH_RATE) * HOST_MOTION.breathingRoll * amount,
  };
}

export function hostDanceTarget(speaking: boolean, listening: boolean, pointing: boolean, gesturing: boolean, reduced: boolean) {
  return reduced || listening || pointing || gesturing ? 0 : speaking ? 0.45 : 1;
}
/** Speech beat gestures: stress peaks in measured voice output (fast envelope above slow average) lift the hands briefly. */
export const SPEECH_BEAT = { max: 0.12, gain: 2, threshold: 0.03 } as const;
/** Asymmetric, small conversational movement; elbows stay down and hands stay outside the body. */
export function hostArmGesture(time: number, energy: number, side: number) {
  const amount = Math.max(0, Math.min(1, Number.isFinite(energy) ? energy : 0));
  const clock = Number.isFinite(time) ? time : 0;
  const emphasis = (0.5 + 0.5 * Math.sin(clock * 1.15 + side * 1.8)) * amount * (side < 0 ? 1 : 0.65);
  return { outward: 0.14 + emphasis * 0.12, down: 0.9 - emphasis * 0.4, forward: 0.26 + emphasis * 0.25 };
}
export function speechBeat(fast: number, slow: number, enabled: boolean) {
  if (!enabled) return 0;
  const accent = Math.max(0, fast - slow - SPEECH_BEAT.threshold);
  return Math.min(SPEECH_BEAT.max, accent * SPEECH_BEAT.gain);
}
