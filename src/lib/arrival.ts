/** Local, privacy-safe arrival detection from camera motion (no identification, nothing sent). */
export const ARRIVAL = { quietMs: 8000, sustain: 3, cooldownMs: 45000 } as const;

export function createArrivalDetector(cfg = ARRIVAL) {
  let lastMotion = -Infinity, streak = 0, quietSince = 0, lastArrival = -Infinity;
  return (moving: boolean, now: number): boolean => {
    if (!moving) {
      streak = 0;
      if (now - lastMotion > 400 && quietSince === 0) quietSince = now;
      return false;
    }
    const wasQuiet = quietSince !== 0 && now - quietSince >= cfg.quietMs || lastMotion === -Infinity;
    lastMotion = now;
    streak++;
    if (streak === 1 && !wasQuiet) quietSince = 0;
    if (streak >= cfg.sustain && quietSince !== -1 && (wasQuiet || quietSince === -2) && now - lastArrival >= cfg.cooldownMs) {
      lastArrival = now; quietSince = 0; streak = 0;
      return true;
    }
    if (streak === 1) quietSince = wasQuiet ? -2 : 0;
    return false;
  };
}
