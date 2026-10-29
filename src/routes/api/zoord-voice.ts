import { createFileRoute } from "@tanstack/react-router";
import { XAI_TTS_VOICE, xaiKey } from "@/lib/xai.server";

// Grok (xAI) text-to-speech: returns real MP3 audio the browser can measure,
// so the LED mouth moves with the actual voice.

export const Route = createFileRoute("/api/zoord-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let text = "";
        let lang = "pt";
        try {
          const body = await request.json();
          text = String(body?.text ?? "").slice(0, 2500);
          lang = String(body?.lang ?? "pt").slice(0, 5);
        } catch {
          /* ignore */
        }
        if (!text) return Response.json({ error: "Texto vazio" }, { status: 400 });
        const key = xaiKey();
        if (!key) return Response.json({ error: "Voz do Grok não configurada" }, { status: 501 });
        try {
          const upstream = await fetch("https://api.x.ai/v1/tts", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice_id: XAI_TTS_VOICE, language: lang }),
            signal: request.signal,
          });
          if (!upstream.ok || !upstream.body) {
            const detail = await upstream.text().catch(() => "");
            console.error(`xAI TTS ${upstream.status}: ${detail.slice(0, 300)}`);
            return Response.json({ error: "A voz do Grok falhou agora." }, { status: 502 });
          }
          return new Response(upstream.body, {
            headers: {
              "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
              "Cache-Control": "no-cache",
            },
          });
        } catch (e) {
          if ((e as Error).name === "AbortError") return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
