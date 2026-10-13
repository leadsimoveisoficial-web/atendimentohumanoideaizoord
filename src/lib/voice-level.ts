// Shared, mutable loudness of Zoord's voice (0..1). Read every frame by the 3D mouth.
export const voiceLevel = { v: 0 };

/** Meter a MediaStream or AudioNode into voiceLevel. Returns a cleanup. */
export function meter(ctx: AudioContext, source: AudioNode): () => void {
  const an = ctx.createAnalyser();
  an.fftSize = 512;
  source.connect(an);
  const buf = new Uint8Array(an.fftSize);
  let raf = 0;
  const tick = () => {
    an.getByteTimeDomainData(buf);
    let sum = 0;
    for (const b of buf) sum += ((b - 128) / 128) ** 2;
    voiceLevel.v = Math.min(1, Math.sqrt(sum / buf.length) * 5);
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => {
    cancelAnimationFrame(raf);
    voiceLevel.v = 0;
    try { source.disconnect(an); } catch { /* ignore */ }
  };
}
