import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { MENU } from "@/components/menu";
import { GATEWAY_URL, apiKey, createRunIdFetch } from "@/server/gateway";
import { groqChat, groqKey } from "@/lib/groq.server";
import { categoryScript, menuAnswerScript, FREE_FALLBACK_ANSWER } from "@/lib/menu-script";

const menuText = () =>
  MENU.map((s) => `## ${s.t}\n` + s.items.map((i) => `- ${i.n}: ${i.p}${i.d ? ` (${i.d})` : ""}`).join("\n")).join("\n\n");

const INSTRUCTIONS = `Você é o Zoord, robô humanoide e inteligência do DAKKAI Sushi (Sambaqui, Florianópolis).
Detecte o idioma do visitante (português, inglês ou espanhol) e responda SEMPRE no mesmo idioma, com fluência nativa.
Em inglês dê boas-vindas com "Welcome to Dakkai Sushi!"; em espanhol, "¡Bienvenidos a Dakkai Sushi!".
Fale com tom caloroso, natural e animado, como um apresentador num palco.
Responda em 3 a 6 frases curtas, prontas para serem faladas em voz alta: sem markdown, sem listas, sem emojis.
Fale preços por extenso de forma natural (ex.: "quarenta e nove e noventa").
Explique termos do cardápio (combinado, hot, temaki, uramaki) quando o visitante for estrangeiro.
Use SOMENTE o cardápio abaixo. Se algo não estiver no cardápio, diga com gentileza que não temos e sugira algo parecido.
Termine convidando a pedir pelo WhatsApp.

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
          ? `Apresente a categoria "${cat.t}" de forma personalizada, destacando 2 ou 3 pratos com preço.${question ? ` O visitante também disse: "${question}".` : ""}`
          : `Pergunta do visitante: "${question}"`;

        // 1) Free brain first: Groq when the key exists.
        if (groqKey()) {
          try {
            const text = await groqChat({
              system: INSTRUCTIONS + menuText(),
              messages: [{ role: "user", content: prompt }],
              signal: request.signal,
              maxTokens: 450,
            });
            return Response.json({ text, source: "groq" });
          } catch (e) {
            if (request.signal.aborted || (e as Error)?.name === "AbortError") return new Response(null, { status: 499 });
            // Fall through to the gateway, then to the free local script.
          }
        }

        // 2) Lovable AI gateway (paid, premium voice quality chain).
        const key = apiKey();
        if (key) {
          const runIdFetch = createRunIdFetch(request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined);
          const provider = createOpenAI({
            baseURL: `${GATEWAY_URL}/v1`,
            apiKey: key,
            headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            fetch: runIdFetch.fetch,
          });
          try {
            const result = streamText({
              model: provider.responses("openai/gpt-6-astra"),
              instructions: INSTRUCTIONS + menuText(),
              messages: [{ role: "user", content: prompt }],
              abortSignal: request.signal,
              onError: () => {},
              providerOptions: {
                openai: {
                  store: false,
                  forceReasoning: true,
                  reasoningEffort: "low",
                  reasoningSummary: "auto",
                  include: ["reasoning.encrypted_content"],
                },
              },
            });
            for (const k of ["response", "usage", "totalUsage", "finishReason", "steps", "content", "reasoning", "reasoningText", "sources", "files", "toolCalls", "toolResults", "providerMetadata", "warnings", "request", "output"] as const) {
              const v = (result as unknown as Record<string, unknown>)[k];
              if (v && typeof (v as Promise<unknown>).then === "function") (v as Promise<unknown>).then(undefined, () => {});
            }
            const text = (await result.text).trim();
            if (text) return Response.json({ text, source: "gateway" });
          } catch (e: unknown) {
            if (request.signal.aborted || (e as Error)?.name === "AbortError") return new Response(null, { status: 499 });
            // Fall through to the free local script.
          }
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
