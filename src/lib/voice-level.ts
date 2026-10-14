// Shared, mutable loudness of Zoord's audible output (0..1), sampled by the 3D mouth.
export const voiceLevel = { v: 0 };

export function speechLevel(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  // Ignore the noise floor; keep quiet syllables while avoiding clipping loud speech.
  return rms < 0.004 ? 0 : Math.min(1, Math.sqrt((rms - 0.004) * 4));
}

/** Route and analyse the SAME element that plays both live and menu speech.
 * Lazy initialization must run from Start/menu/Play's user gesture.
 * One graph for the element's lifetime avoids duplicate audio and stream-arrival races.
 */
export function createPlaybackMeter(audio: HTMLAudioElement) {
  let ctx: AudioContext | undefined;
  let source: MediaElementAudioSourceNode | undefined;
  let analyser: AnalyserNode | undefined;
  const samples = new Float32Array(256);
  let raf = 0;
  let disposed = false;
  const reset = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    voiceLevel.v = 0;
  };
  const tick = () => {
    if (disposed || !analyser || ctx?.state !== "running" || audio.paused || audio.ended || audio.muted || audio.volume === 0) {
      reset();
      return;
    }
    analyser.getFloatTimeDomainData(samples);
    voiceLevel.v = speechLevel(samples) * audio.volume;
    raf = requestAnimationFrame(tick);
  };
  const samplePlayback = () => {
    reset();
    tick();
  };
  const resume = () => {
    if (disposed) return;
    try {
      if (!ctx) {
        ctx = new AudioContext({ latencyHint: "interactive" });
        source = ctx.createMediaElementSource(audio);
        analyser = ctx.createAnalyser();
        analyser.fftSize = samples.length;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        ctx.addEventListener("statechange", samplePlayback);
      }
      void ctx.resume().then(samplePlayback).catch(reset);
    } catch {
      // Meter failure must never take down the stage or leave the mouth moving.
      reset();
    }
  };
  audio.addEventListener("playing", samplePlayback);
  audio.addEventListener("pause", reset);
  audio.addEventListener("ended", reset);
  audio.addEventListener("emptied", reset);
  audio.addEventListener("waiting", reset);
  audio.addEventListener("volumechange", samplePlayback);
  return {
    resume,
    dispose() {
      disposed = true;
      reset();
      audio.removeEventListener("playing", samplePlayback);
      audio.removeEventListener("pause", reset);
      audio.removeEventListener("ended", reset);
      audio.removeEventListener("emptied", reset);
      audio.removeEventListener("waiting", reset);
      audio.removeEventListener("volumechange", samplePlayback);
      ctx?.removeEventListener("statechange", samplePlayback);
      source?.disconnect();
      analyser?.disconnect();
      if (ctx) void ctx.close().catch(() => {});
    },
  };
}
