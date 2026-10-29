import { createFileRoute } from "@tanstack/react-router";
import { GATEWAY_URL, apiKey } from "@/server/gateway";

// OpenAI natural voice (ChatGPT style) through the built-in AI gateway; streams PCM SSE
// so the measured audio drives Zoord's mouth.
export const Route = createFileRoute("/api/zoord-openai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let text = "";
        try {
          const body = await request.json();
          text = String(body?.text ?? body?.prompt ?? "").slice(0, 2500);
        } catch {
          /* ignore */
        }
        if (!text) return Response.json({ error: "Texto vazio" }, { status: 400 });
        try {
          const upstream = await fetch(`${GATEWAY_URL}/v1/audio/speech`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input: text,
              voice: "alloy",
              instructions: "Fale em português do Brasil com voz masculina suave, leve, calorosa e totalmente natural, ritmo fluido de conversa.",
              stream_format: "sse",
              response_format: "pcm",
            }),
            signal: request.signal,
          });
          if (!upstream.ok) console.error(`OpenAI voice ${upstream.status}`);
          return new Response(upstream.body, {
            status: upstream.status,
            headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream", "Cache-Control": "no-cache" },
          });
        } catch (e) {
          if ((e as Error).name === "AbortError") return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
