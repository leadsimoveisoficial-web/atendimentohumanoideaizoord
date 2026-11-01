import { beforeEach, describe, expect, it, vi } from "vitest";
const playback = vi.hoisted(() => vi.fn());
vi.mock("./stream-speech", () => ({ streamSpeech: playback }));
import { speakZoord, splitSpeech } from "./zoord-voice";
beforeEach(() => { playback.mockReset(); });
describe("one OpenAI narrator", () => {
  it("keeps a normal answer in one streaming request instead of separate sentence requests", async () => {
    playback.mockResolvedValue(undefined);
    const text = "Uma seleção de ingredientes frescos e texturas delicadas. ".repeat(24);
    expect(text.length).toBeGreaterThan(600);
    expect(splitSpeech(text)).toHaveLength(1);
    await speakZoord(text);
    expect(playback).toHaveBeenCalledTimes(1);
  });
  it("does not retry terminal voice configuration errors", async () => {
    playback.mockRejectedValue(Object.assign(new Error("OpenAI não configurada"), { status: 401 }));
    await expect(speakZoord("Olá.")).rejects.toThrow("OpenAI não configurada");
    expect(playback).toHaveBeenCalledTimes(1);
  });
  it("uses only the direct OpenAI endpoint for speech", async () => {
    playback.mockResolvedValue(undefined);
    expect(await speakZoord("Permita-me apresentar nossa seleção." )).toBe("openai");
    expect(playback.mock.calls[0]?.[0]).toBe("/api/zoord-openai");
  });
  it("reports unavailability instead of substituting a browser or paid narrator", async () => {
    vi.useFakeTimers();
    playback.mockRejectedValue(new Error("Unavailable"));
    const result = expect(speakZoord("Olá.")).rejects.toThrow("voz OpenAI");
    await vi.runAllTimersAsync();
    await result;
    expect(playback).toHaveBeenCalledTimes(3);
    expect(playback.mock.calls.every(call => call[0] === "/api/zoord-openai")).toBe(true);
    vi.useRealTimers();
  });
});