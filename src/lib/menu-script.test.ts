import { describe, expect, it } from "vitest";
import { MENU } from "@/components/menu";
import { categoryScript, menuAnswerScript, requestsMenuPrice } from "./menu-script";

describe("prices only when explicitly requested", () => {
  it("never quotes money in category or full menu presentations", () => {
    for (const category of [null, ...MENU.map((_, index) => index)]) {
      expect(categoryScript(category)).not.toMatch(/R\$|\d+[,.]\d{2}/);
    }
  });
  it("describes dishes without spontaneously quoting their price", () => {
    const answer = menuAnswerScript("Apresente o Ebi Holl");
    expect(answer).not.toBeNull();
    expect(answer).not.toMatch(/R\$|49,00/);
  });
  it("reveals the verified item price on an explicit financial question", () => {
    expect(menuAnswerScript("Qual o preço do Ebi Holl?")).toContain("R$ 49,00");
  });
  it.each(["Quanto custa o Ebi Holl?", "Qual o valor do Ebi Holl?", "How much is Ebi Holl?", "¿Cuánto cuesta Ebi Holl?"])("recognizes explicit price question: %s", (question) => {
    expect(requestsMenuPrice(question)).toBe(true);
  });
  it.each(["Apresente os combinados", "Quero pedir Ebi Holl", "Quantas peças tem?", "Apresente o Ebi Holl sem preços"])("does not treat presentations, orders or quantities as price questions: %s", (question) => {
    expect(requestsMenuPrice(question)).toBe(false);
  });
});