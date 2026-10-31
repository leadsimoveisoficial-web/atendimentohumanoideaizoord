import { createFileRoute } from "@tanstack/react-router";
import { MENU } from "@/components/menu";
import { openaiChat } from "@/lib/openai.server";
import { categoryScript, menuAnswerScript, FREE_FALLBACK_ANSWER, requestsMenuPrice } from "@/lib/menu-script";
import { OPEN_CONVERSATION } from "@/lib/zoord-conversation";

const menuText = (includePrices: boolean) =>
  MENU.map((s) => `## ${s.t}\n` + s.items.map((i) => `- ${i.n}${includePrices ? `: ${i.p}` : ""}${i.d ? ` (${i.d})` : ""}`).join("\n")).join("\n\n");

const INSTRUCTIONS = `Você é o Zoord, robô humanoide e inteligência do DAKKAI Sushi (Sambaqui, Florianópolis).
${OPEN_CONVERSATION}
Detecte o idioma do visitante (português, inglês ou espanhol) e responda SEMPRE no mesmo idioma, com fluência nativa.
Em inglês dê boas-vindas com "Welcome to Dakkai Sushi!"; em espanhol, "¡Bienvenidos a Dakkai Sushi!".
Fale com tom caloroso, natural e animado, como um apresentador num palco.
Responda com frases naturais, prontas para serem faladas em voz alta: sem markdown, sem listas, sem emojis.
Somente quando o cliente perguntar explicitamente o preço, fale o valor por extenso de forma natural (ex.: "quarenta e nove e noventa").
Explique termos do cardápio (combinado, hot, temaki, uramaki) quando o visitante for estrangeiro.
Ao apresentar pratos do Dakkai, use somente o cardápio abaixo. Se um prato solicitado não estiver no cardápio, diga com gentileza que não temos e sugira algo parecido. Essa regra não restringe conversas gerais.
Convide a pedir pelo WhatsApp somente quando houver intenção de pedido.

CARDÁPIO:
`;

export const Route = createFileRoute("/api/zoord-present")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { category?: number; question?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Pedido inválido" }, { status: 400 });
        }
        const question = (body.question ?? "").toString().trim().slice(0, 500);
        const catIndex = typeof body.category === "number" ? body.category : null;
        const cat = catIndex !== null ? MENU[catIndex] : undefined;
        if (!question && !cat) return Response.json({ error: "Escolha uma categoria ou faça uma pergunta" }, { status: 400 });

        const prompt = cat
          ? `Apresente a categoria "${cat.t}" de forma personalizada, destacando ingredientes e texturas de 2 ou 3 pratos, com explicações culturais pertinentes. Não mencione valores sem uma pergunta explícita de preço.${question ? ` O visitante também disse: "${question}".` : ""}`
          : `Pergunta do visitante: "${question}"`;

        try {
          const text = await openaiChat({
            system: INSTRUCTIONS + menuText(requestsMenuPrice(question)),
            messages: [{ role: "user", content: prompt }],
            signal: request.signal,
            maxTokens: 700,
          });
          return Response.json({ text, source: "openai" });
        } catch {
          if (request.signal.aborted) return new Response(null, { status: 499 });
        }

        // 3) Free local script from the verified menu — no AI, no credits.
        if (catIndex !== null && !question) {
          return Response.json({ text: categoryScript(catIndex), source: "local" });
        }
        const answer = (question ? menuAnswerScript(question) : null) ?? (catIndex !== null ? categoryScript(catIndex) : FREE_FALLBACK_ANSWER);
        return Response.json({ text: answer, source: "local" });
      },
    },
  },
});
