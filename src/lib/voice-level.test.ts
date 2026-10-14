import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlaybackMeter, speechLevel, voiceLevel } from "./voice-level";

afterEach(() => { vi.unstubAllGlobals(); voiceLevel.v = 0; });

describe("Zoord playback synchronization", () => {
  it("closes on silence and preserves soft and loud syllables", () => {
    expect(speechLevel(new Float32Array(256))).toBe(0);
    expect(speechLevel(new Float32Array(256).fill(0.002))).toBe(0);
    expect(speechLevel(new Float32Array(256).fill(0.02))).toBeGreaterThan(0);
    expect(speechLevel(new Float32Array(256).fill(0.2))).toBeGreaterThan(speechLevel(new Float32Array(256).fill(0.02)));
    expect(speechLevel(new Float32Array(256).fill(1))).toBe(1);
  });

  it("uses one playback graph, gates unheard speech, and resets on Stop", async () => {
    const analyser = { connect: vi.fn(), disconnect: vi.fn(), getFloatTimeDomainData: (data: Float32Array) => data.fill(0.1), fftSize: 0, smoothingTimeConstant: 1 };
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const createSource = vi.fn(() => source);
    const close = vi.fn(async () => {});
    const construct = vi.fn();
    vi.stubGlobal("AudioContext", class {
      state = "running";
      destination = {};
      constructor() { construct(); }
      createMediaStreamSource = createSource;
      createAnalyser = () => analyser;
      resume = async () => {};
      close = close;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
    });
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const audio = document.createElement("audio");
    vi.stubGlobal("MediaStream", class { getAudioTracks() { return [{}]; } });
    audio.srcObject = new MediaStream();
    let paused = true;
    Object.defineProperty(audio, "paused", { get: () => paused });
    const meter = createPlaybackMeter(audio);
    expect(construct).not.toHaveBeenCalled();
    meter.resume();
    await Promise.resolve();
    expect(voiceLevel.v).toBe(0);
    paused = false;
    audio.dispatchEvent(new Event("playing"));
    expect(voiceLevel.v).toBeGreaterThan(0);
    meter.resume();
    await Promise.resolve();
    expect(createSource).toHaveBeenCalledTimes(1);
    audio.muted = true;
    audio.dispatchEvent(new Event("volumechange"));
    expect(voiceLevel.v).toBe(0);
    audio.muted = false;
    audio.dispatchEvent(new Event("playing"));
    expect(voiceLevel.v).toBeGreaterThan(0);
    paused = true;
    audio.dispatchEvent(new Event("pause"));
    expect(voiceLevel.v).toBe(0);
    meter.dispose();
    expect(close).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
  });
});