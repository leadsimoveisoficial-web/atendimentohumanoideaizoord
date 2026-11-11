import { describe, expect, it } from "vitest";
import { conversationHistory, type DialogueTurn } from "./dialogue-history";

describe("conversation context", () => {
  it("retains the reception and latest choice after a long conversation", () => {
    const turns: DialogueTurn[] = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: i === 0 ? "Meu nome é Ana, pode me chamar de você" : i === 38 ? "Prefiro salmão" : `turno ${i}`,
    }));
    const result = conversationHistory(turns);
    expect(result).toHaveLength(24);
    expect(result[0]?.content).toBe("Meu nome é Ana, pode me chamar de você");
    expect(result.at(-2)?.content).toBe("Prefiro salmão");
    expect(result.map((turn) => turn.content)).not.toContain("turno 4");
  });
  it("keeps short exchanges in order without mutating the caller", () => {
    const turns: DialogueTurn[] = [{ role: "assistant", content: "Salmão ou atum?" }, { role: "user", content: "Salmão" }];
    expect(conversationHistory(turns)).toEqual(turns);
    expect(conversationHistory(turns)).not.toBe(turns);
  });
});