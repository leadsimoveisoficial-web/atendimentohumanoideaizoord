import process from "node:process";

// Free text brain: Groq's free tier. Enabled as soon as the GROQ_API_KEY
// secret exists; server-side only, never exposed to the browser.

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export function groqKey(): string {
  return (process.env["GROQ_API_KEY"] ?? "").trim();
}

export type GroqMessage = { role: "user" | "assistant"; content: string };

export async function groqChat(options: {
  system: string;
  messages: GroqMessage[];
  signal?: AbortSignal;
  maxTokens?: number;
}): Promise<string> {
  const key = groqKey();
  if (!key) throw Object.assign(new Error("GROQ_API_KEY não configurada"), { statusCode: 401 });
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: options.system }, ...options.messages],
      max_tokens: options.maxTokens ?? 400,
      temperature: 0.6,
    }),
    signal: options.signal ?? null,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw Object.assign(new Error(`Groq ${response.status}: ${body.slice(0, 200)}`), { statusCode: response.status });
  }
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw Object.assign(new Error("Groq devolveu resposta vazia"), { statusCode: 502 });
  return text;
}
