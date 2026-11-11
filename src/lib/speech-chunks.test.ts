import { describe, expect, it } from "vitest";
import { takeSentences, wantsDetail } from "./speech-chunks";

describe("takeSentences", () => {
  it("starts a complete spoken answer before another token arrives", () => {
    expect(takeSentences("Recomendo o salmão.").ready).toEqual(["Recomendo o salmão."]);
    expect(takeSentences("São 49.").ready).toEqual([]);
    expect(takeSentences("São 49.90 reais.").ready).toEqual(["São 49.90 reais."]);
  });
  it("releases a completed question immediately without waiting for the next token", () => {
    expect(takeSentences("Qual é seu nome?").ready).toEqual(["Qual é seu nome?"]);
    expect(takeSentences("O preço é 49.").ready).toEqual([]);
  });
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
    expect(wantsDetail("quero uma explicação detalhada")).toBe(true);
    expect(wantsDetail("apresente os temakis")).toBe(true);
    expect(wantsDetail("prefiro salmão")).toBe(false);
  });
});
