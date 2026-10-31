import { afterEach, describe, expect, it, vi } from "vitest";
import { openaiChat, openaiSpeech } from "./openai.server";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("own-account OpenAI only", () => {
  it("sends reasoning directly to OpenAI, never the Lovable gateway", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    const send = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: "Resposta" } }] }));
    vi.stubGlobal("fetch", send);
    expect(await openaiChat({ system: "Maître", messages: [{ role: "user", content: "Olá" }] })).toBe("Resposta");
    expect(send.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/chat/completions");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("uses one masculine OpenAI narrator with PCM for the mouth meter", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    const send = vi.fn().mockResolvedValue(new Response(new Uint8Array([0, 1, 2, 3])));
    vi.stubGlobal("fetch", send);
    const response = await openaiSpeech(new Request("http://localhost/api/zoord-openai", { method: "POST", body: JSON.stringify({ text: "Excelente escolha." }) }));
    const payload = JSON.parse(send.mock.calls[0]?.[1].body);
    expect(send.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/audio/speech");
    expect(payload.voice).toBe("onyx");
    expect(payload.model).toBe("gpt-4o-mini-tts");
    expect(payload.response_format).toBe("pcm");
    expect(response.headers.get("content-type")).toBe("audio/pcm");
  });
  it.each([401, 403, 429])("does not switch paid providers when OpenAI returns %s", async status => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    const send = vi.fn().mockResolvedValue(new Response(null, { status }));
    vi.stubGlobal("fetch", send);
    const response = await openaiSpeech(new Request("http://localhost/api/zoord-openai", { method: "POST", body: JSON.stringify({ text: "Olá" }) }));
    expect(response.status).toBe(status);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("does not send any request when the own-account key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    await expect(openaiChat({ system: "Maître", messages: [] })).rejects.toThrow("OpenAI não configurada");
    expect(send).not.toHaveBeenCalled();
  });
});