import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { MENU } from "@/components/menu";
import { GATEWAY_URL, apiKey, createRunIdFetch } from "@/server/gateway";

const menuText = () =>
  MENU.map((s) => `## ${s.t}\n` + s.items.map((i) => `- ${i.n}: ${i.p}${i.d ? ` (${i.d})` : ""}`).join("\n")).join("\n\n");

const INSTRUCTIONS = `Você é o Zoord, robô humanoide e inteligência do DAKKAI Sushi (Sambaqui, Florianópolis).
Fale em português do Brasil, com tom caloroso, natural e animado, como um apresentador num palco.
Responda em 3 a 6 frases curtas, prontas para serem faladas em voz alta: sem markdown, sem listas, sem emojis.
Fale preços por extenso de forma natural (ex.: "quarenta e nove e noventa").
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
        const cat = typeof body.category === "number" ? MENU[body.category] : undefined;
        if (!question && !cat) return Response.json({ error: "Escolha uma categoria ou faça uma pergunta" }, { status: 400 });

        const prompt = cat
          ? `Apresente a categoria "${cat.t}" de forma personalizada, destacando 2 ou 3 pratos com preço.${question ? ` O visitante também disse: "${question}".` : ""}`
          : `Pergunta do visitante: "${question}"`;

        const key = apiKey();
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
          const text = (await result.text).trim();
          if (!text) return Response.json({ error: "O Zoord não conseguiu responder agora." }, { status: 502 });
          return Response.json({ text });
        } catch (e: unknown) {
          if (request.signal.aborted || (e as Error)?.name === "AbortError") return new Response(null, { status: 499 });
          const err = e as { statusCode?: number; message?: string };
          const status = err.statusCode ?? 500;
          const msg =
            status === 429 ? "Muitos pedidos agora, tente em instantes." :
            status === 402 ? "Créditos de IA esgotados." :
            err.message ?? "Erro ao gerar a apresentação";
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
