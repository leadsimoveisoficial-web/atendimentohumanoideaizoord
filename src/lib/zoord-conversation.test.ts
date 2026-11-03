import { describe, expect, it, vi } from "vitest";
import { OPEN_CONVERSATION } from "@/lib/zoord-conversation";

const brain = vi.hoisted(() => vi.fn());
vi.mock("@/lib/openai.server", () => ({ openaiChat: brain }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (config: unknown) => config }));
import { Route } from "@/routes/api/zoord-chat";

const handler = (Route as unknown as { server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
describe("open-ended Zoord conversation", () => {
  it("does not give the brain financial menu values for a dish presentation", async () => {
    brain.mockResolvedValueOnce("O Ebi Holl combina camarão empanado na panko e lâminas de salmão.");
    await handler({ request: new Request("http://localhost/api/zoord-chat", { method: "POST", body: JSON.stringify({ message: "Apresente o Ebi Holl" }) }) });
    expect(brain.mock.calls.at(-1)?.[0].system).not.toMatch(/R\$|49,00/);
  });
  it("provides verified financial menu values when the customer asks the price", async () => {
    brain.mockResolvedValueOnce("O Ebi Holl custa quarenta e nove reais.");
    await handler({ request: new Request("http://localhost/api/zoord-chat", { method: "POST", body: JSON.stringify({ message: "Qual o preço do Ebi Holl?" }) }) });
    expect(brain.mock.calls.at(-1)?.[0].system).toContain("Ebi Holl: R$ 49,00");
  });
  it("sends a general science question to the brain instead of a menu lookup", async () => {
    brain.mockResolvedValueOnce("O céu parece azul porque a atmosfera espalha mais a luz azul.");
    const response = await handler({ request: new Request("http://localhost/api/zoord-chat", { method: "POST", body: JSON.stringify({ message: "Por que o céu é azul?" }) }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "O céu parece azul porque a atmosfera espalha mais a luz azul.", source: "openai" });
    expect(brain.mock.calls.at(-1)?.[0].messages).toEqual([{ role: "user", content: "Por que o céu é azul?" }]);
  });
  it("keeps earlier turns available for follow-up questions", async () => {
    const history = Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: i === 0 ? "Meu nome é Ana e gosto de astronomia" : `turno ${i}` }));
    brain.mockResolvedValueOnce("Ana, podemos falar sobre estrelas.");
    await handler({ request: new Request("http://localhost/api/zoord-chat", { method: "POST", body: JSON.stringify({ history, message: "Lembra do assunto que eu gosto?" }) }) });
    expect(brain.mock.calls.at(-1)?.[0].messages).toEqual([...history, { role: "user", content: "Lembra do assunto que eu gosto?" }]);
  });
  it("instructs Portuguese-only speech unless the customer asks another language", () => {
    expect(OPEN_CONVERSATION).toContain("fale exclusivamente em português do Brasil");
    expect(OPEN_CONVERSATION).toContain("Só use outro idioma quando o cliente pedir explicitamente");
    expect(OPEN_CONVERSATION).toContain("responda em português do Brasil");
  });
});