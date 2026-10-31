import { createFileRoute } from "@tanstack/react-router";
import { MENU } from "@/components/menu";
import { openaiChat } from "@/lib/openai.server";
import { menuAnswerScript, FREE_FALLBACK_ANSWER, requestsMenuPrice } from "@/lib/menu-script";
import { OPEN_CONVERSATION } from "@/lib/zoord-conversation";

const menuText = (includePrices: boolean) =>
  MENU.map((s) => `## ${s.t}\n` + s.items.map((i) => `- ${i.n}${includePrices ? `: ${i.p}` : ""}${i.d ? ` (${i.d})` : ""}`).join("\n")).join("\n\n");

const SYSTEM = `Você é o Zoord, o robô maître de alta tecnologia do DAKKAI Sushi (Sambaqui, Florianópolis): um garçom de altíssimo padrão, que recebe moradores e turistas que visitam a Ilha da Magia.
${OPEN_CONVERSATION}
Idioma: detecte o idioma da fala do cliente (português, inglês ou espanhol) e responda SEMPRE no mesmo idioma, com fluência nativa. Se ele trocar de idioma, troque junto.
Boas-vindas a turistas: em inglês, "Welcome to Dakkai Sushi!"; em espanhol, "¡Bienvenidos a Dakkai Sushi!".
Tom cortês e sofisticado de maître de alto padrão; em português use "o senhor"/"a senhora"; em inglês "sir"/"madam"; em espanhol "señor"/"señora".
Responda com frases naturais, prontas para serem faladas em voz alta: sem markdown, sem listas, sem emojis. Quando o assunto for comida, descreva os pratos de forma sensorial e detalhada; prefira duas recomendações por vez, explicando diferenças conforme os gostos do cliente.
Para informações do Dakkai, use somente o cardápio abaixo e nunca invente preços. Explique combinados, hots (sushi empanado e frito) e temakis (cone de alga) para estrangeiros.
Quando o cliente quiser pedir, convide-o a tocar em "Pedir no WhatsApp".

CARDÁPIO:
`;

export const Route = createFileRoute("/api/zoord-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { message?: string; history?: { role?: string; content?: string }[] };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Pedido inválido" }, { status: 400 });
        }
        const message = (body.message ?? "").toString().trim().slice(0, 800);
        if (!message) return Response.json({ error: "Mensagem vazia" }, { status: 400 });
        const history = (Array.isArray(body.history) ? body.history : [])
          .map((m) => ({ role: m?.role === "assistant" ? "assistant" : "user", content: String(m?.content ?? "").slice(0, 500) }))
          .filter((m) => m.content) as { role: "user" | "assistant"; content: string }[];

        try {
          const text = await openaiChat({
            system: SYSTEM + menuText(requestsMenuPrice(message)),
            messages: [...history, { role: "user", content: message }],
            signal: request.signal,
            maxTokens: 700,
          });
          return Response.json({ text, source: "openai" });
        } catch {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          // Verified local reply only; never call another paid provider.
        }

        const answer = menuAnswerScript(message) ?? FREE_FALLBACK_ANSWER;
        return Response.json({ text: answer, source: "local" });
      },
    },
  },
});
