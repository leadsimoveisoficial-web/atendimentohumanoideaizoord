import { createFileRoute } from "@tanstack/react-router";
import { GATEWAY_URL, apiKey } from "@/server/gateway";

export const Route = createFileRoute("/api/zoord-speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let text = "";
        try {
          text = String((await request.json()).text ?? "").slice(0, 2500);
        } catch {
          /* ignore */
        }
        if (!text) return Response.json({ error: "Texto vazio" }, { status: 400 });
        const key = apiKey();
        try {
          const upstream = await fetch(`${GATEWAY_URL}/v1/audio/speech`, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-tts-preview",
              contents: [{ role: "user", parts: [{ text: `Fale em português do Brasil, com voz calorosa, animada e natural de apresentador: ${text}` }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
              },
              stream_format: "sse",
            }),
            signal: request.signal,
          });
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
