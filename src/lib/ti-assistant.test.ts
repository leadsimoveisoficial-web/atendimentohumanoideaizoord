import { describe, expect, it, vi } from "vitest";

const groqChat = vi.fn();
const openaiChat = vi.fn();

vi.mock("./groq.server", () => ({
  groqChat: (options: unknown) => groqChat(options),
  groqKey: vi.fn(),
  GROQ_MODEL: "llama-3.3-70b-versatile",
}));
vi.mock("./openai.server", () => ({
  openaiChat: (options: unknown) => openaiChat(options),
}));

import { devAssistantChat } from "./dev-assistant.server";
import { groqKey } from "./groq.server";

const call = { system: "sistema", messages: [{ role: "user" as const, content: "olá" }] };

describe("cérebro do assistente de TI", () => {
  it("usa Groq primeiro quando a chave própria existe", async () => {
    vi.mocked(groqKey).mockReturnValue("gsk_test");
    groqChat.mockResolvedValue("resposta groq");
    openaiChat.mockResolvedValue("resposta openai");
    await expect(devAssistantChat(call)).resolves.toBe("resposta groq");
    expect(openaiChat).not.toHaveBeenCalled();
  });

  it("cai para OpenAI quando Groq falha, sem trocar de chave no cliente", async () => {
    vi.mocked(groqKey).mockReturnValue("gsk_test");
    groqChat.mockRejectedValue(new Error("Groq 429"));
    openaiChat.mockResolvedValue("resposta openai");
    await expect(devAssistantChat(call)).resolves.toBe("resposta openai");
  });

  it("vai direto para OpenAI quando não há chave Groq", async () => {
    vi.mocked(groqKey).mockReturnValue("");
    openaiChat.mockResolvedValue("resposta openai");
    await expect(devAssistantChat(call)).resolves.toBe("resposta openai");
    expect(groqChat).not.toHaveBeenCalled();
  });

  it("repropaga o erro de OpenAI quando nenhuma das duas responde", async () => {
    vi.mocked(groqKey).mockReturnValue("");
    openaiChat.mockRejectedValue(new Error("OpenAI não configurada."));
    await expect(devAssistantChat(call)).rejects.toThrow("OpenAI não configurada.");
  });
});
