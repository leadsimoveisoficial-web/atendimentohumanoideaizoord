import { beforeEach, describe, expect, it, vi } from "vitest";

const openRouterChat = vi.fn();
const groqChat = vi.fn();
const openaiChat = vi.fn();

vi.mock("./openrouter.server", () => ({
  openRouterChat: (options: unknown) => openRouterChat(options),
  openRouterKey: vi.fn(),
  OPENROUTER_MODEL: "openai/gpt-4o",
}));
vi.mock("./groq.server", () => ({
  groqChat: (options: unknown) => groqChat(options),
  groqKey: vi.fn(),
  GROQ_MODEL: "llama-3.3-70b-versatile",
}));
vi.mock("./openai.server", () => ({
  openaiChat: (options: unknown) => openaiChat(options),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

import { devAssistantChat } from "./dev-assistant.server";
import { groqKey } from "./groq.server";
import { openRouterKey } from "./openrouter.server";

const call = { system: "sistema", messages: [{ role: "user" as const, content: "olá" }] };

describe("cérebro do assistente de TI", () => {
  it("usa OpenRouter primeiro quando a chave própria existe", async () => {
    vi.mocked(openRouterKey).mockReturnValue("sk-or-test");
    vi.mocked(groqKey).mockReturnValue("gsk_test");
    openRouterChat.mockResolvedValue("resposta openrouter");
    groqChat.mockResolvedValue("resposta groq");
    await expect(devAssistantChat(call)).resolves.toBe("resposta openrouter");
    expect(groqChat).not.toHaveBeenCalled();
    expect(openaiChat).not.toHaveBeenCalled();
  });

  it("cai para Groq quando OpenRouter falha", async () => {
    vi.mocked(openRouterKey).mockReturnValue("sk-or-test");
    vi.mocked(groqKey).mockReturnValue("gsk_test");
    openRouterChat.mockRejectedValue(new Error("OpenRouter 429"));
    groqChat.mockResolvedValue("resposta groq");
    openaiChat.mockResolvedValue("resposta openai");
    await expect(devAssistantChat(call)).resolves.toBe("resposta groq");
    expect(openaiChat).not.toHaveBeenCalled();
  });

  it("cai para OpenAI quando OpenRouter e Groq falham", async () => {
    vi.mocked(openRouterKey).mockReturnValue("sk-or-test");
    vi.mocked(groqKey).mockReturnValue("gsk_test");
    openRouterChat.mockRejectedValue(new Error("OpenRouter 429"));
    groqChat.mockRejectedValue(new Error("Groq 401"));
    openaiChat.mockResolvedValue("resposta openai");
    await expect(devAssistantChat(call)).resolves.toBe("resposta openai");
  });

  it("vai direto para OpenAI quando não há chaves próprias", async () => {
    vi.mocked(openRouterKey).mockReturnValue("");
    vi.mocked(groqKey).mockReturnValue("");
    openaiChat.mockResolvedValue("resposta openai");
    await expect(devAssistantChat(call)).resolves.toBe("resposta openai");
    expect(openRouterChat).not.toHaveBeenCalled();
    expect(groqChat).not.toHaveBeenCalled();
  });

  it("repropaga o erro de OpenAI quando nenhuma das três responde", async () => {
    vi.mocked(openRouterKey).mockReturnValue("");
    vi.mocked(groqKey).mockReturnValue("");
    openaiChat.mockRejectedValue(new Error("OpenAI não configurada."));
    await expect(devAssistantChat(call)).rejects.toThrow("OpenAI não configurada.");
  });
});
