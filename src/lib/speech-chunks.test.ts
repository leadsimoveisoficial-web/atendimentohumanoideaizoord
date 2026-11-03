import { describe, expect, it } from "vitest";
import { takeSentences, wantsDetail } from "./speech-chunks";

describe("takeSentences", () => {
  it("releases the first complete sentence before the stream ends", () => {
    const r = takeSentences("Boa noite, senhor. Recomendo o salm");
    expect(r.ready).toEqual(["Boa noite, senhor."]);
    expect(r.rest).toBe("Recomendo o salm");
  });
  it("joins very short fragments with the next sentence", () => {
    expect(takeSentences("Sim. Temos temaki de salmão hoje. ").ready).toEqual(["Sim. Temos temaki de salmão hoje."]);
  });
});

describe("wantsDetail", () => {
  it("is short for greetings and long when detail is requested", () => {
    expect(wantsDetail("oi, tudo bem?")).toBe(false);
    expect(wantsDetail("me explique a história do sushi")).toBe(true);
  });
});
