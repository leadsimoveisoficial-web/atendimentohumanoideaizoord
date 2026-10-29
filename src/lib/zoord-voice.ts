import { speakFree } from "./free-speech";
import { streamSpeech } from "./stream-speech";

// One single voice (OpenAI via the AI gateway) for every utterance, so the tone never changes
// mid-conversation or mid-menu. Long texts are split into sentence chunks; each chunk is retried
// with the same voice. The browser voice is used only if the main voice never started at all.

export function splitSpeech(text: string, max = 600): string[] {
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

export async function speakZoord(text: string, options: { lang?: string; signal?: AbortSignal } = {}): Promise<"lovable" | "browser"> {
  const signal = options.signal;
  signal?.throwIfAborted();
  const chunks = splitSpeech(text);
  let spoken = false;
  for (let i = 0; i < chunks.length; i++) {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        await streamSpeech("/api/zoord-openai", chunks[i]!, signal);
        ok = true;
      } catch (e) {
        if (signal?.aborted) throw e;
        // Never replay audio that already played; skip to the next sentence with the same voice.
        if ((e as { audioStarted?: boolean }).audioStarted) ok = true;
        else await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    if (ok) { spoken = true; continue; }
    // Main voice unavailable: only switch to the browser voice if nothing was spoken yet,
    // so a presentation never changes tone halfway through.
    if (!spoken) { await speakFree(chunks.slice(i).join(" "), options); return "browser"; }
  }
  return "lovable";
}
