import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFreeListener } from "./free-listen";

class Recognition {
  static instances: Recognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
}
beforeEach(() => { Recognition.instances = []; vi.useFakeTimers(); vi.stubGlobal("window", { SpeechRecognition: Recognition }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("voice listening lifecycle", () => {
  it("resumes an ended listening session after 80ms without overlapping recognizers", () => {
    const listener = createFreeListener({ lang: "pt-BR", onFinal: vi.fn(), onError: vi.fn() });
    listener.start();
    Recognition.instances[0]?.onend?.();
    vi.advanceTimersByTime(79);
    expect(Recognition.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(Recognition.instances).toHaveLength(2);
    expect(Recognition.instances[0]?.abort).toHaveBeenCalledTimes(1);
  });
  it("ignores retired sessions after stop and restart", () => {
    const onFinal = vi.fn();
    const listener = createFreeListener({ lang: "pt-BR", onFinal, onError: vi.fn() });
    listener.start();
    const old = Recognition.instances[0];
    listener.stop(); listener.start();
    old?.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "oi" } }] });
    old?.onend?.(); vi.runAllTimers();
    expect(onFinal).not.toHaveBeenCalled();
    expect(Recognition.instances[1]?.start).toHaveBeenCalledTimes(1);
  });
  it("does not reopen the mic when a language change triggers an answer", () => {
    let listener: ReturnType<typeof createFreeListener>;
    const onFinal = vi.fn(() => listener.stop());
    listener = createFreeListener({ lang: "pt-BR", onFinal, onError: vi.fn() });
    listener.start();
    const current = Recognition.instances[0];
    current?.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "hello please" } }] });
    current?.onend?.(); vi.runAllTimers();
    expect(onFinal).toHaveBeenCalledWith("hello please", "pt-BR");
    expect(Recognition.instances).toHaveLength(1);
    expect(current?.start).toHaveBeenCalledTimes(1);
  });
  it("retries network errors 3 times, then stops with one error", () => {
    const onError = vi.fn();
    const listener = createFreeListener({ lang: "pt-BR", onFinal: vi.fn(), onError });
    listener.start();
    for (let i = 0; i < 4; i++) { Recognition.instances.at(-1)?.onerror?.({ error: "network" }); vi.runAllTimers(); }
    expect(onError).toHaveBeenCalledTimes(1);
    expect(Recognition.instances).toHaveLength(4);
    Recognition.instances.at(-1)?.onend?.(); vi.runAllTimers();
    expect(Recognition.instances).toHaveLength(4);
  });
});