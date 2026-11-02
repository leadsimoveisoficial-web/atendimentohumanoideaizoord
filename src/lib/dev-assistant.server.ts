// TI dev-assistant brain. Server-side only: secrets are read at request time
// and never reach the browser bundle. Chain: OpenRouter (own key) → Groq (own
// key) → OpenAI (project key) as the last reserve.
import { groqChat, groqKey, type GroqMessage } from "./groq.server";
import { openRouterChat, openRouterKey } from "./openrouter.server";
import { openaiChat } from "./openai.server";

export async function devAssistantChat(options: {
  system: string;
  messages: GroqMessage[];
  maxTokens?: number;
}): Promise<string> {
  const maxTokens = options.maxTokens ?? 700;
  if (openRouterKey()) {
    try {
      return await openRouterChat({
        system: options.system,
        messages: options.messages,
        maxTokens,
      });
    } catch {
      // OpenRouter indisponível/sem saldo: tenta a próxima reserva.
    }
  }
  if (groqKey()) {
    try {
      return await groqChat({
        system: options.system,
        messages: options.messages,
        maxTokens,
      });
    } catch {
      // Groq indisponível/sem saldo: cai para a chave OpenAI do projeto.
    }
  }
  return openaiChat({
    system: options.system,
    messages: options.messages,
    maxTokens,
  });
}
