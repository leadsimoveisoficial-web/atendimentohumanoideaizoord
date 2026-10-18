import { describe, expect, it } from "vitest";
import { emptyReaction, reactToCustomer } from "./zoord-interaction";

describe("customer greeting reactions", () => {
  it("waves when the customer requests goodbye", () => {
    expect(reactToCustomer(emptyReaction(), "Zoord, dá um tchau", 0, 500).wave).toBe(true);
    expect(reactToCustomer(emptyReaction(), "goodbye", 0, 500).wave).toBe(true);
  });
  it("recognizes greetings but not partial words", () => {
    for (const greeting of ["Oi!", "Olá", "Bom dia", "Boa tarde", "Boa noite"]) {
      expect(reactToCustomer(emptyReaction(), greeting, 0, 500).wave).toBe(true);
    }
    expect(reactToCustomer(emptyReaction(), "Quero oito peças", 0, 500).wave).toBe(false);
  });
  it("joins fragments and waves only once per greeting turn", () => {
    const first = reactToCustomer(emptyReaction(), "Bom ", 0, 400);
    const next = reactToCustomer(first.state, "dia!", 400, 800);
    expect(next.wave).toBe(true);
    expect(reactToCustomer(next.state, " Oi Zoord", 800, 1500).wave).toBe(false);
    expect(reactToCustomer(next.state, "Boa tarde", 4000, 4500).wave).toBe(true);
  });
});