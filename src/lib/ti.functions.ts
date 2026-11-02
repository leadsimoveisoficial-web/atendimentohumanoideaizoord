import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `Você é o assistente técnico da equipe de TI. Ajuda a evoluir projetos web (React, TanStack Start, Three.js/React Three Fiber, backend com banco e autenticação, IA de voz).
Responda em português do Brasil, direto e organizado. Quando pedirem um prompt de comando, entregue um prompt pronto para colar no construtor do app, claro, com objetivo, regras do que preservar e critérios de aceite. Para erros, explique causa provável, passos para corrigir e um prompt de correção.`;

/** Admin-only development assistant; uses the project's own OpenAI key. */
export const askDevAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { project: string; messages: { role: "user" | "assistant"; content: string }[] }) => ({
    project: String(d.project).slice(0, 120),
    messages: (Array.isArray(d.messages) ? d.messages : []).slice(-16).map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: String(m.content).slice(0, 4000) })),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito à equipe de TI.");
    if (!data.messages.length) throw new Error("Mensagem vazia.");
    const { openaiChat } = await import("@/lib/openai.server");
    const text = await openaiChat({ system: `${SYSTEM}\nProjeto atual: ${data.project}.`, messages: data.messages, maxTokens: 1200 });
    return { text };
  });
