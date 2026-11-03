import { describe, expect, it } from "vitest";
import { guestDirective } from "./guest-memory";

describe("guestDirective", () => {
  it("is empty for unknown visitors", () => expect(guestDirective({})).toBe(""));
  it("remembers name, address and notes", () => {
    const d = guestDirective({ name: "Natan", address: "senhor", notes: "sem camarão" });
    expect(d).toContain("Natan");
    expect(d).toContain('"senhor"');
    expect(d).toContain("sem camarão");
  });
  it("drops unknown forms of address", () => expect(guestDirective({ address: "majestade" })).toBe(""));
});
