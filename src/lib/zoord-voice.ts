import { streamSpeech } from "./stream-speech";

// One single voice (own-account OpenAI) for every utterance, so the tone never changes
// mid-conversation or mid-menu. Long texts are split into sentence chunks; each chunk is retried
// with the same voice. No provider or browser narrator switch on failure.

export function splitSpeech(text: string, max = 2200): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*\s*/g) ?? [];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current && (current + s).length > max) { chunks.push(current.trim()); current = ""; }
    current += s;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function speakZoord(text: string, options: { lang?: string; signal?: AbortSignal } = {}): Promise<"openai"> {
  const signal = options.signal;
  signal?.throwIfAborted();
  const chunks = splitSpeech(text);
  for (let i = 0; i < chunks.length; i++) {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const chunk = chunks[i];
        if (!chunk) continue;
        await streamSpeech("/api/zoord-openai", chunk, signal);
        ok = true;
      } catch (e) {
        if (signal?.aborted) throw e;
        const status = (e as { status?: number }).status;
        if (status && status < 500 && status !== 429) throw e;
        // Never replay audio that already played; skip to the next sentence with the same voice.
        if ((e as { audioStarted?: boolean }).audioStarted) ok = true;
        else await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    if (!ok) throw new Error("A voz OpenAI não está disponível agora. Confira o saldo e os limites da sua conta OpenAI.");
  }
  return "openai";
}
