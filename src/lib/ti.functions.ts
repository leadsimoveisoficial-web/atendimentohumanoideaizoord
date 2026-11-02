import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createTiProject, requireTiAdmin } from "./ti-projects";

const uuid = z.string().uuid();
const taskInput = z.object({ id: uuid, projectId: uuid, text: z.string().trim().min(1).max(4000), kind: z.enum(["melhoria", "erro"]), done: z.boolean() });

export const listTiProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireTiAdmin(admin);
    const { data, error } = await context.supabase.from("ti_projects").select("id,name,url").order("created_at");
    if (error) throw new Error("Não foi possível carregar os projetos.");
    return data ?? [];
  });

export const addTiProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string(), url: z.string() }))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireTiAdmin(admin);
    const clean = createTiProject([], data.name, data.url, crypto.randomUUID());
    const { data: row, error } = await context.supabase.from("ti_projects").insert({ name: clean.name, url: clean.url, created_by: context.userId }).select("id,name,url").single();
    if (error || !row) throw new Error(error?.code === "23505" ? "Já existe um projeto com esse nome." : "Não foi possível salvar o projeto.");
    return row;
  });

export const listTiTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: uuid }))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireTiAdmin(admin);
    const { data: rows, error } = await context.supabase.from("ti_tasks").select("id,text,kind,done").eq("project_id", data.projectId).order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar as tarefas.");
    return (rows ?? []).map((row) => ({ ...row, kind: row.kind === "erro" ? "erro" as const : "melhoria" as const }));
  });

export const saveTiTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(taskInput)
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireTiAdmin(admin);
    const { error } = await context.supabase.from("ti_tasks").upsert({ id: data.id, project_id: data.projectId, text: data.text, kind: data.kind, done: data.done, created_by: context.userId });
    if (error) throw new Error("Não foi possível salvar a tarefa.");
    return { ok: true };
  });

export const deleteTiTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid, projectId: uuid }))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireTiAdmin(admin);
    const { error } = await context.supabase.from("ti_tasks").delete().eq("id", data.id).eq("project_id", data.projectId);
    if (error) throw new Error("Não foi possível excluir a tarefa.");
    return { ok: true };
  });

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
    requireTiAdmin(isAdmin);
    if (!data.messages.length) throw new Error("Mensagem vazia.");
    const { openaiChat } = await import("@/lib/openai.server");
    const text = await openaiChat({ system: `${SYSTEM}\nProjeto atual: ${data.project}.`, messages: data.messages, maxTokens: 1200 });
    return { text };
  });
