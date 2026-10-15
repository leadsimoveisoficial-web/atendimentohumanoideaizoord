// Shared, mutable loudness of Zoord's audible output (0..1), sampled by the 3D mouth.
// round: low-frequency dominance (O/U-like); wide: high-frequency dominance (E/I/S-like).
export const voiceLevel = { v: 0, round: 0, wide: 0 };
let playbackOwner: symbol | undefined;

export function speechLevel(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  // Ignore the noise floor; keep quiet syllables while avoiding clipping loud speech.
  return rms < 0.004 ? 0 : Math.min(1, Math.sqrt((rms - 0.004) * 4));
}

/** Measured spectral balance (dB bins) → mouth roundness/width. Not phoneme recognition. */
export function speechTimbre(freqDb: Float32Array, sampleRate: number): { round: number; wide: number } {
  const hz = sampleRate / 2 / freqDb.length;
  let low = 0, high = 0;
  for (let i = 0; i < freqDb.length; i++) {
    const f = i * hz;
    const p = Number.isFinite(freqDb[i] ?? NaN) ? Math.pow(10, (freqDb[i] ?? 0) / 10) : 0;
    if (f >= 200 && f < 900) low += p;
    else if (f >= 1800 && f < 5000) high += p;
  }
  const total = low + high;
  if (!(total > 0)) return { round: 0, wide: 0 };
  const ratio = high / total; // 0 = dark (O/U), 1 = bright (E/I/S)
  return { round: Math.max(0, Math.min(1, (0.25 - ratio) * 4)), wide: Math.max(0, Math.min(1, (ratio - 0.35) * 2.5)) };
}

export function sampleVoice(analyser: AnalyserNode, samples: Float32Array<ArrayBuffer>, freq: Float32Array<ArrayBuffer>, gain = 1) {
  analyser.getFloatTimeDomainData(samples);
  voiceLevel.v = speechLevel(samples) * gain;
  if (voiceLevel.v > 0 && typeof analyser.getFloatFrequencyData === "function") {
    analyser.getFloatFrequencyData(freq);
    const t = speechTimbre(freq, analyser.context?.sampleRate ?? 48000);
    // Light smoothing on shape only; loudness stays instant so pauses close the mouth.
    voiceLevel.round += (t.round - voiceLevel.round) * 0.5;
    voiceLevel.wide += (t.wide - voiceLevel.wide) * 0.5;
  } else {
    voiceLevel.round = 0;
    voiceLevel.wide = 0;
  }
}

/** Analyse the stream attached to the SAME element playing live and menu speech.
 * Lazy initialization must run from Start/menu/Play's user gesture.
 * One graph for the element's lifetime avoids duplicate audio and stream-arrival races.
 */
export function createPlaybackMeter(audio: HTMLAudioElement, mode: "stream" | "recording" = "stream") {
  const owner = Symbol("Zoord playback");
  let ctx: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | undefined;
  let stream: MediaStream | undefined;
  let analyser: AnalyserNode | undefined;
  let silentSink: GainNode | undefined;
  const samples = new Float32Array(1024);
  const freq = new Float32Array(512);
  let raf = 0;
  let disposed = false;
  const reset = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (playbackOwner === owner) {
      playbackOwner = undefined;
      voiceLevel.v = 0;
      voiceLevel.round = 0;
      voiceLevel.wide = 0;
    }
  };
  const tick = () => {
    if (disposed || !analyser || ctx?.state !== "running" || audio.paused || audio.ended || audio.muted || audio.volume === 0) {
      reset();
      return;
    }
    const playback = audio.srcObject;
    if (playback instanceof MediaStream && playback !== stream && playback.getAudioTracks().length) {
      source?.disconnect();
      stream = playback;
      source = ctx.createMediaStreamSource(playback);
      source.connect(analyser);
    }
    if ((mode === "stream" && !playback) || !source) {
      raf = requestAnimationFrame(tick);
      return;
    }
    playbackOwner = owner;
    sampleVoice(analyser, samples, freq, audio.volume);
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
        analyser = ctx.createAnalyser();
        analyser.fftSize = samples.length;
        analyser.smoothingTimeConstant = 0;
        if (mode === "recording") {
          source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(ctx.destination);
        } else {
          // Keep the analysis graph pulled by the audio renderer without a second speaker.
          silentSink = ctx.createGain();
          silentSink.gain.value = 0;
          analyser.connect(silentSink);
          silentSink.connect(ctx.destination);
        }
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
      stream = undefined;
      analyser?.disconnect();
      silentSink?.disconnect();
      if (ctx) void ctx.close().catch(() => {});
    },
  };
}
