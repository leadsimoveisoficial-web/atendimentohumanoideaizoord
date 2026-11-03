/** Local, privacy-safe arrival detection from camera motion (no identification, nothing sent). */
export const ARRIVAL = { quietMs: 8000, sustain: 3, cooldownMs: 45000 } as const;

export function createArrivalDetector(cfg: { quietMs: number; sustain: number; cooldownMs: number } = ARRIVAL) {
  let lastMotion = -Infinity, lastArrival = -Infinity, streak = 0, armed = true;
  return (moving: boolean, now: number): boolean => {
    if (!moving) {
      streak = 0;
      if (now - lastMotion >= cfg.quietMs) armed = true;
      return false;
    }
    lastMotion = now;
    streak++;
    if (armed && streak >= cfg.sustain && now - lastArrival >= cfg.cooldownMs) {
      armed = false;
      lastArrival = now;
      return true;
    }
    return false;
  };
}
