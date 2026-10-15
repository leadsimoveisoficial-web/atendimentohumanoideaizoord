import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const amIAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: Boolean(data) };
  });

/** Owner promotes an already-registered manager account by e-mail. */
export const addManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => ({ email: String(d.email).trim().toLowerCase() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error("Não foi possível consultar as contas.");
    const user = list.users.find((u) => u.email?.toLowerCase() === data.email);
    if (!user) return { ok: false, message: "Essa pessoa ainda não criou conta em /auth." };
    await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true, message: "Gerente liberado." };
  });

function spHour() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return parts; // "HH:MM"
}

/** Analyze one camera frame with the Zoord vision brain and store the event. */
export const analyzeCamera = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cameraId: string; frame?: string | undefined }) => ({ cameraId: String(d.cameraId), frame: typeof d.frame === "string" && d.frame.startsWith("data:image/") && d.frame.length < 3_000_000 ? d.frame : undefined }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const { data: cam } = await sb.from("security_cameras").select("*").eq("id", data.cameraId).single();
    if (!cam) throw new Error("Câmera não encontrada");
    const { data: settings } = await sb.from("security_settings").select("*").eq("id", 1).single();
    if (settings && !settings.enabled) return { skipped: true };

    let image: string | URL | undefined = data.frame;
    if (!image && /^https:\/\//i.test(cam.snapshot_url)) {
      const res = await fetch(cam.snapshot_url);
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.startsWith("image/")) {
        const buf = new Uint8Array(await res.arrayBuffer());
        let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
        image = `data:${type};base64,${btoa(bin)}`;
      }
    }
    if (!image) return { skipped: true, reason: "Sem imagem: informe um link de foto (snapshot) ou use um vídeo que permita captura." };

    const now = spHour();
    const open = String(settings?.open_time ?? "11:00").slice(0, 5);
    const close = String(settings?.close_time ?? "23:30").slice(0, 5);
    const closed = open <= close ? !(now >= open && now <= close) : !(now >= open || now <= close);

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const key = process.env["LOVABLE_API_KEY"] ?? "";
    const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      maxRetries: 0,
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low" } },
      system:
        "Você é o Zoord em modo segurança do restaurante DAKKAI Sushi. Analise a imagem da câmera sem identificar pessoas (nunca descreva rostos, nomes ou traços pessoais). " +
        "Responda em UMA linha no formato exato: NIVEL|PESSOAS|RESUMO, onde NIVEL é info, atencao ou alerta; PESSOAS é um número; RESUMO tem até 25 palavras em português. " +
        "Use alerta para invasão, fogo, fumaça, briga, objeto suspeito ou movimento com o restaurante fechado; atencao para aglomeração, porta aberta ou algo incomum.",
      messages: [{ role: "user", content: [
        { type: "text", text: `Câmera: ${cam.name} (área: ${cam.zone}). Hora local ${now}. Restaurante ${closed ? "FECHADO" : "aberto"}.` },
        { type: "image", image },
      ] }],
    });
    const text = (await result.text).trim().split("\n")[0] ?? "";
    const [lvl, ppl, ...rest] = text.split("|");
    const level = ["info", "atencao", "alerta"].includes((lvl ?? "").trim()) ? lvl!.trim() : "info";
    const people = Number.parseInt(ppl ?? "", 10);
    const summary = rest.join("|").trim() || text || "Sem descrição.";
    const { error } = await sb.from("security_events").insert({ camera_id: cam.id, camera_name: cam.name, level, summary, people_count: Number.isFinite(people) ? people : null });
    if (error) throw new Error("Falha ao salvar o evento");
    return { level, summary, people: Number.isFinite(people) ? people : null };
  });
