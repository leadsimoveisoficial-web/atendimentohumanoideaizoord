import { describe, it, expect } from "vitest";
import { musicCommand, rhythmEnergy, danceMotion, danceStyle } from "./music";
describe("free radio requests", () => {
  it.each([
    ["Rock nacional clássico", "br-rock"], ["blues jazz", "jazz"],
    ["eletrônico clássico", "electronic"], ["hits do momento", "hits"],
    ["rock internacional", "rock"],
    ["dance forró", "forro"], ["toque pagode", "pagode"],
    ["quero sertanejo", "sertanejo"], ["hip hop", "hip-hop"], ["hip-hop", "hip-hop"],
  ])("selects requested genre %s", (text, genre) => {
    expect(musicCommand(text)).toEqual({ action: "play", genre });
  });
  it("stops when asked to stop music", () => expect(musicCommand("pare a música")).toEqual({ action: "stop" }));
  it("offers genre choice for an unspecified request", () => expect(musicCommand("quero ouvir música")).toEqual({ action: "choose" }));
  it("does not turn menu requests into music", () => expect(musicCommand("quero Hot Roll")).toBeNull());
  it("has no rhythm in silence", () => expect(rhythmEnergy(new Float32Array(32))).toBe(0));
  it("responds to measured music amplitude", () => expect(rhythmEnergy(new Float32Array(32).fill(0.1))).toBeCloseTo(0.5));
});

describe("named audio-driven dance styles", () => {
  it.each(["forro", "pagode", "sertanejo", "electronic", "hip-hop"] as const)("stays still without sound for %s", (genre) => {
    const motion = danceMotion(genre, 1, 0, 0, 1);
    expect([motion.roll, motion.nod, motion.lift, motion.weight]).toEqual([0, 0, 0, 0]);
  });
  it("gives each requested style its own movement", () => {
    const genres = ["forro", "pagode", "sertanejo", "electronic", "hip-hop"] as const;
    expect(genres.map(g => danceStyle(g).name)).toEqual(["Forró", "Pagode", "Sertanejo", "Eletrônico", "Hip-hop"]);
    expect(new Set(genres.map(g => JSON.stringify(danceMotion(g, 1, 0.8, 0.5, 1)))).size).toBe(5);
  });
});