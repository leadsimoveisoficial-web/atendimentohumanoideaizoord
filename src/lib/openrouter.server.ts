// Own-account OpenRouter brain. Secrets are read at request time and never
// exposed to the browser. Enabled as soon as OPENROUTER_API_KEY exists.
export const OPENROUTER_MODEL = "openai/gpt-4o";

export type OpenRouterMessage = { role: "user" | "assistant"; content: string };

export function openRouterKey(): string {
  return (process.env["OPENROUTER_API_KEY"] ?? "").trim();
}

export async function openRouterChat(options: {
  system: string;
  messages: OpenRouterMessage[];
  signal?: AbortSignal;
  maxTokens?: number;
}): Promise<string> {
  const key = openRouterKey();
  if (!key) throw Object.assign(new Error("OPENROUTER_API_KEY não configurada"), { statusCode: 401 });
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://atendimentohumanoideaizoord.lovable.app",
      "X-Title": "Zoord Dakkai AI",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "system", content: options.system }, ...options.messages],
      max_tokens: options.maxTokens ?? 400,
    }),
    signal: options.signal ?? null,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw Object.assign(new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`), { statusCode: response.status });
  }
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw Object.assign(new Error("OpenRouter devolveu resposta vazia"), { statusCode: 502 });
  return text;
}
