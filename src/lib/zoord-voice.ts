import { createPlaybackMeter } from "./voice-level";
import { speakFree } from "./free-speech";
import { streamSpeech } from "./stream-speech";

// Speak with the Grok (xAI) voice; the measured MP3 audio drives the LED mouth.
// Any failure falls back to the free browser voice, so Zoord always speaks.

export async function speakZoord(text: string, options: { lang?: string; signal?: AbortSignal } = {}): Promise<"lovable" | "xai" | "browser"> {
  const signal = options.signal;
  signal?.throwIfAborted();
  // Approved Lovable AI voice first; Grok and the browser voice are backups.
  for (const endpoint of ["/api/zoord-openai", "/api/zoord-speak"]) {
    try {
      await streamSpeech(endpoint, text, signal);
      return "lovable";
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }
  try {
    const response = await fetch("/api/zoord-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: (options.lang ?? "pt-BR").slice(0, 2) }),
      signal: signal ?? null,
    });
    if (!response.ok) throw new Error(`Voz do Grok falhou (${response.status})`);
    const blob = await response.blob();
    if (!blob.size) throw new Error("Voz do Grok vazia");
    const audio = new Audio(URL.createObjectURL(blob));
    const meter = createPlaybackMeter(audio, "recording");
    try {
      meter.resume();
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => { audio.onended = null; audio.onerror = null; signal?.removeEventListener("abort", abort); };
        const abort = () => { audio.pause(); cleanup(); reject(new DOMException("Reprodução interrompida", "AbortError")); };
        audio.onended = () => { cleanup(); resolve(); };
        audio.onerror = () => { cleanup(); reject(new Error("Não foi possível reproduzir a voz.")); };
        if (signal?.aborted) abort();
        else signal?.addEventListener("abort", abort, { once: true });
      });
    } finally {
      audio.pause();
      meter.dispose();
      URL.revokeObjectURL(audio.src);
    }
    return "xai";
  } catch (e) {
    if (signal?.aborted) throw e;
    await speakFree(text, options);
    return "browser";
  }
}
