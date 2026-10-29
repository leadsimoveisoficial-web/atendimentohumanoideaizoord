import process from "node:process";

// Grok (xAI) brain. Server-side only, never exposed to the browser.

export const XAI_CHAT_MODEL = "grok-4.7";
export const XAI_TTS_VOICE = "rex";

export function xaiKey(): string {
  return (process.env["XAI_API_KEY"] ?? "").trim();
}

export type XaiMessage = { role: "user" | "assistant"; content: string };

export async function xaiChat(options: {
  system: string;
  messages: XaiMessage[];
  signal?: AbortSignal;
  maxTokens?: number;
}): Promise<string> {
  const key = xaiKey();
  if (!key) throw Object.assign(new Error("XAI_API_KEY não configurada"), { statusCode: 401 });
  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: XAI_CHAT_MODEL,
      instructions: options.system,
      input: options.messages.map((m) => ({ role: m.role, content: m.content })),
      max_output_tokens: options.maxTokens ?? 400,
    }),
    signal: options.signal ?? null,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw Object.assign(new Error(`xAI ${response.status}: ${body.slice(0, 200)}`), { statusCode: response.status });
  }
  const data = (await response.json()) as {
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = (data.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw Object.assign(new Error("xAI devolveu resposta vazia"), { statusCode: 502 });
  return text;
}
