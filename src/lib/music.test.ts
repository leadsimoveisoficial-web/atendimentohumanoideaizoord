import { describe, it, expect } from "vitest";
import { musicCommand, rhythmEnergy } from "./music";
describe("free radio requests", () => {
  it.each([
    ["Rock nacional clássico", "br-rock"], ["blues jazz", "jazz"],
    ["eletrônico clássico", "electronic"], ["hits do momento", "hits"],
    ["rock internacional", "rock"],
  ])("selects requested genre %s", (text, genre) => {
    expect(musicCommand(text)).toEqual({ action: "play", genre });
  });
  it("stops when asked to stop music", () => expect(musicCommand("pare a música")).toEqual({ action: "stop" }));
  it("offers genre choice for an unspecified request", () => expect(musicCommand("quero ouvir música")).toEqual({ action: "choose" }));
  it("does not turn menu requests into music", () => expect(musicCommand("quero Hot Roll")).toBeNull());
  it("has no rhythm in silence", () => expect(rhythmEnergy(new Float32Array(32))).toBe(0));
  it("responds to measured music amplitude", () => expect(rhythmEnergy(new Float32Array(32).fill(0.1))).toBeCloseTo(0.5));
});