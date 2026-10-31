import { createFileRoute } from "@tanstack/react-router";
import { openaiSpeech } from "@/lib/openai.server";

export const Route = createFileRoute("/api/zoord-voice")({
  server: { handlers: { POST: ({ request }) => openaiSpeech(request, "mp3") } },
});
