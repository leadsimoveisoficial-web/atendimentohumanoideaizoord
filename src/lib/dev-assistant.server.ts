// TI dev-assistant brain. Server-side only: secrets are read at request time
// and never reach the browser bundle. Groq (own GROQ_API_KEY, free tier) first,
// then the project's OpenAI key as reserve.
import { groqChat, groqKey, type GroqMessage } from "./groq.server";
import { openaiChat } from "./openai.server";

export async function devAssistantChat(options: {
  system: string;
  messages: GroqMessage[];
  maxTokens?: number;
}): Promise<string> {
  if (groqKey()) {
    try {
      return await groqChat({
        system: options.system,
        messages: options.messages,
        maxTokens: options.maxTokens,
      });
    } catch {
      // Groq indisponível/sem saldo: cai para a chave OpenAI do projeto.
    }
  }
  return openaiChat({
    system: options.system,
    messages: options.messages,
    maxTokens: options.maxTokens,
  });
}
