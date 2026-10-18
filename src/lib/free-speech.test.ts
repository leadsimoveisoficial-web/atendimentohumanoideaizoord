import { afterEach, expect, it, vi } from "vitest";
import { speakFree, stopFreeSpeech } from "./free-speech";
import { voiceLevel } from "./voice-level";

afterEach(() => { stopFreeSpeech(); vi.unstubAllGlobals(); });

it("keeps the mouth still before voice starts and during pauses, then clears it on end", async () => {
  let utterance: SpeechSynthesisUtterance | undefined;
  let frame: FrameRequestCallback | undefined;
  const engine = {
    speaking: false, paused: false,
    getVoices: () => [{ lang: "pt-BR", name: "Natural", localService: true }],
    cancel: vi.fn(), addEventListener: vi.fn(),
    speak: (u: SpeechSynthesisUtterance) => { utterance = u; },
  };
  vi.stubGlobal("speechSynthesis", engine);
  vi.stubGlobal("SpeechSynthesisUtterance", class {});
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const done = speakFree("Conheça nosso Hot Roll.");
  await Promise.resolve();
  expect(utterance).toBeDefined();
  expect(voiceLevel.v).toBe(0);
  expect(frame).toBeUndefined();
  engine.speaking = true;
  utterance?.onstart?.(new Event("start") as SpeechSynthesisEvent);
  frame?.(0);
  expect(voiceLevel.v).toBeGreaterThan(0);
  engine.paused = true;
  utterance?.onpause?.(new Event("pause") as SpeechSynthesisEvent);
  expect(voiceLevel.v).toBe(0);
  engine.paused = false;
  utterance?.onresume?.(new Event("resume") as SpeechSynthesisEvent);
  frame?.(0);
  expect(voiceLevel.v).toBeGreaterThan(0);
  utterance?.onend?.(new Event("end") as SpeechSynthesisEvent);
  await done;
  expect(voiceLevel).toEqual({ v: 0, round: 0, wide: 0 });
});