import { describe, expect, it } from "vitest";
import { isCustomerBargeIn, isEchoOf, languageDirective, parseLanguage, recognitionLang } from "./zoord-language";

describe("zoord language lock", () => {
  it("defaults to Portuguese for unknown values", () => {
    expect(parseLanguage(undefined)).toBe("pt");
    expect(parseLanguage("fr")).toBe("pt");
    expect(parseLanguage("es")).toBe("es");
  });
  it("maps recognition languages", () => {
    expect(recognitionLang("pt")).toBe("pt-BR");
    expect(recognitionLang("en")).toBe("en-US");
  });
  it("directive names only the selected language", () => {
    expect(languageDirective("en")).toContain("somente em inglês");
    expect(languageDirective("pt")).toContain("somente em português do Brasil");
  });
  it("interrupts for customer speech but ignores own echo", () => {
    const speaking = "Hoje recomendo o nigiri de salmão maçaricado com toque cítrico";
    expect(isCustomerBargeIn("recomendo o nigiri de salmão", speaking)).toBe(false);
    expect(isCustomerBargeIn("espera quero um temaki", speaking)).toBe(true);
    expect(isCustomerBargeIn("oi", speaking)).toBe(false);
    // A misheard 2-word echo (1 of 2 matching) must not cut him off.
    expect(isCustomerBargeIn("salmão fresco", speaking)).toBe(false);
  });
  it("recognises his own last words arriving after he stops", () => {
    const said = "Recomendo o nigiri de salmão, ele é muito fresco.";
    expect(isEchoOf("ele é muito fresco", said)).toBe(true);
    expect(isEchoOf("quero um temaki de atum", said)).toBe(false);
    expect(isEchoOf("ele é muito fresco", "")).toBe(false);
  });
});
