/** Own-account OpenAI only. Secrets are read at request time and never returned. */
export async function openaiChat({ system, messages, signal, maxTokens = 700 }: { system: string; messages: { role: "user" | "assistant"; content: string }[]; signal?: AbortSignal; maxTokens?: number }) {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("OpenAI não configurada.");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4.1-mini", messages: [{ role: "system", content: system }, ...messages], max_tokens: maxTokens, store: false }),
    signal: signal ?? null,
  });
  if (!response.ok) throw new Error(`OpenAI indisponível (${response.status}).`);
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI não retornou uma resposta.");
  return text;
}

export async function openaiSpeech(request: Request, format: "pcm" | "mp3" = "pcm") {
  let text = "";
  try { const body = await request.json(); text = String(body?.text ?? body?.prompt ?? "").trim().slice(0, 2500); }
  catch { return Response.json({ error: "Pedido inválido" }, { status: 400 }); }
  if (!text) return Response.json({ error: "Texto vazio" }, { status: 400 });
  const key = process.env["OPENAI_API_KEY"];
  if (!key) return Response.json({ error: "A chave da OpenAI não está disponível." }, { status: 503 });
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", input: text, voice: "onyx", instructions: "Você é Zoord, maître de alta gastronomia do Dakkai Sushi. Voz masculina aveludada, suave e calorosa, português brasileiro natural. Fale de forma humana e conversacional, sem soar como locutor, sem exagero teatral e sem monotonia robótica. Ritmo tranquilo e fluido, pausas leves entre ideias, entusiasmo contido ao descrever ingredientes, frescor e texturas. Pronuncie nomes japoneses com cuidado. Não acrescente informações nem preços ao texto fornecido.", response_format: format }),
      signal: request.signal,
    });
    if (!response.ok) {
      const status = [401, 403, 429].includes(response.status) ? response.status : 503;
      return Response.json({ error: "A OpenAI não conseguiu gerar a voz. Confira o saldo e os limites na sua conta OpenAI." }, { status });
    }
    return new Response(response.body, { headers: { "Content-Type": format === "pcm" ? "audio/pcm" : "audio/mpeg", "Cache-Control": "no-store" } });
  } catch {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return Response.json({ error: "Não foi possível conectar à OpenAI agora." }, { status: 503 });
  }
}