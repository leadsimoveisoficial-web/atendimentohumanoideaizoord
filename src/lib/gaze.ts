// Shared look-at target in normalized screen space (-1..1). Camera tracking overrides the mouse while active.
export const gaze = { x: 0, y: 0, source: "mouse" as "mouse" | "camera", cameraAt: 0 };

export function setMouseGaze(x: number, y: number) {
  if (gaze.source === "camera" && performance.now() - gaze.cameraAt < 1500) return;
  gaze.source = "mouse";
  gaze.x = x;
  gaze.y = y;
}

export function setCameraGaze(x: number, y: number) {
  gaze.source = "camera";
  gaze.cameraAt = performance.now();
  gaze.x = x;
  gaze.y = y;
}

/** Centroid of pixels that changed between two small grayscale frames; null when nothing moved. */
export function motionCentroid(prev: Uint8ClampedArray, next: Uint8ClampedArray, w: number, h: number) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const d = Math.abs(next[i]! - prev[i]!) + Math.abs(next[i + 1]! - prev[i + 1]!) + Math.abs(next[i + 2]! - prev[i + 2]!);
    if (d > 60) { sx += x; sy += y; n++; }
  }
  if (n < w * h * 0.01) return null;
  return { x: sx / n / w, y: sy / n / h };
}
