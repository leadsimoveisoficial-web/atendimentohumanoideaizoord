import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, type ModelMessage } from "ai";
import process from "node:process";
import { z } from "zod";
import { MENU } from "@/components/menu";
import { OPEN_CONVERSATION } from "@/lib/zoord-conversation";

export type LiveConfig = {
  baseURL: string;
  key: string;
  liveModel: string;
  backendModel: string;
  openingInstructions?: string;
};

// Fill from co-loaded knowledge: the gateway URL, the Live model and the resolved chat model.
const liveSettings = {
  baseURL: "https://ai.gateway.lovable.dev",
  liveModel: "openai/gpt-live-1",
  backendModel: "openai/gpt-6-astra",
  openingInstructions:
    "Comece agora em português do Brasil: dê boas-vindas ao cliente como Jade do DAKKAI Sushi e pergunte com naturalidade sobre o que gostaria de conversar ou como pode ajudar.",
};

export type LiveSocket = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  onError(handler: () => void): void;
};

export type LiveExecutionContext = { waitUntil(task: Promise<unknown>): void };
export type LiveConnector = (url: string, headers: Record<string, string>, signal: AbortSignal) => Promise<LiveSocket>;

type WorkerSocket = WebSocket & { accept(): void };
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };
type Transcript = {
  role: "user" | "assistant";
  text: string;
  start_ms: number;
  end_ms: number;
  listeningSound: boolean;
};
type ProviderEvent = {
  type: string;
  client_event_id?: string;
  error?: { client_event_id?: string; message?: string };
  session?: { id: string };
  delta?: string;
  start_ms?: number;
  end_ms?: number;
  offset_ms?: number;
  delegation?: { id: string; target: string };
};

export function getLiveConfig(): LiveConfig {
  // The mounted voice controller uses direct OpenAI chat + speech instead of this legacy relay.
  throw new Error("A conexão antiga de voz está desativada. Use a voz OpenAI do Zoord.");
}

function gatewayAPIBase(baseURL: string) {
  return `${baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`;
}

async function gatewayRejection(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "";
  return new Error(message || `Voice gateway rejected the connection (${response.status})`);
}

export function validateLiveUpgrade(request: Request, options: { allowMissingOrigin?: boolean } = {}): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null ? !options.allowMissingOrigin : origin !== new URL(request.url).origin) {
    return new Response("Voice connection origin rejected", { status: 403 });
  }
  if (request.method !== "GET" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket required", { status: 426 });
  }
  return null;
}

function workerSocket(socket: WorkerSocket): LiveSocket {
  return {
    get readyState() {
      return socket.readyState;
    },
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (handler) => socket.addEventListener("message", (event) => handler(event.data)),
    onClose: (handler) => socket.addEventListener("close", handler),
    onError: (handler) => socket.addEventListener("error", handler),
  };
}

export function handleLiveRequest(request: Request): Response {
  const waitUntil = (request as Request & Partial<LiveExecutionContext>).waitUntil;
  if (!waitUntil) return new Response("Live runtime unavailable", { status: 503 });
  const config = getLiveConfig();
  const rejected = validateLiveUpgrade(request);
  if (rejected) return rejected;
  const pair = new WebSocketPair();
  pair[1].accept();
  bindLiveConnection(workerSocket(pair[1]), config, { waitUntil }, async (url, headers, signal) => {
    const response = await fetch(url, { headers: { ...headers, Upgrade: "websocket" }, signal });
    const socket = (response as Response & { webSocket?: WorkerSocket | null }).webSocket;
    if (!socket) throw await gatewayRejection(response);
    socket.accept();
    return workerSocket(socket);
  });
  const response: ResponseInit & { webSocket: WebSocket } = { status: 101, webSocket: pair[0] };
  return new Response(null, response);
}

const conversationInstructions = `Você é a Atendente Jade, anfitriã humanoide do DAKKAI Sushi (Sambaqui, Florianópolis), que recebe moradores e turistas que visitam a Ilha da Magia.
${OPEN_CONVERSATION}
Idioma: detecte o idioma da fala do cliente (português, inglês ou espanhol) e responda SEMPRE no mesmo idioma, com fluência nativa e pronúncia natural. Se ele trocar de idioma, troque junto. Comece em português do Brasil até ouvir o cliente.
Boas-vindas a turistas: em inglês, "Welcome to Dakkai Sushi!"; em espanhol, "¡Bienvenidos a Dakkai Sushi!". Explique com simplicidade o que são combinados, hots (sushi empanado e frito), temakis (cone de alga) e uramakis, sem citar preços espontaneamente.
Voz calma, pausada, aveludada e confiante; tom cortês e sofisticado, nunca afetado nem robótico. Em português use o tratamento escolhido pelo cliente ("você", "o senhor" ou "a senhora"; até ele escolher, "o senhor"/"a senhora"); em inglês "sir"/"madam"; em espanhol "señor"/"señora".
Trate o cliente pelo nome e pela forma de tratamento que ele escolheu; use expressões como "será um prazer", "permita-me sugerir", "excelente escolha".
Descreva os pratos de forma sensorial e detalhada (frescor, textura, harmonia, técnicas e origens), recomende conforme os gostos do cliente e prefira duas opções por vez.
Explique com riqueza de detalhes em frases fluidas, com pausas naturais; sorria na voz e respeite interrupções.
Política de escuta: use sons de escuta moderados sem tomar a palavra.
Interrupções: pare de falar e escute quando o cliente interromper.
Delegação:
Ferramentas do backend: conhece o cardápio completo com preços, enxerga a câmera do cliente quando ela está ligada e aponta para a categoria no palco.
Delegue ao backend quando: o cliente fizer uma pergunta que exija explicação, raciocínio ou conhecimento geral, perguntar sobre pratos, preços, combos, recomendações, ou pedir para você olhar/ver algo ("o que você vê?", "quantos somos?", "o que estou segurando?").
Não delegue quando: cumprimentar, agradecer, conversa leve ou repetir uma resposta ainda válida. Espere o resultado do backend antes de citar pratos ou preços. Nunca invente preços.
Quando o cliente quiser pedir, convide-o a tocar em "Pedir no WhatsApp".`;

const menuText = MENU.map((s, i) => `## [${i}] ${s.t}\n` + s.items.map((it) => `- ${it.n}: ${it.p}${it.d ? ` (${it.d})` : ""}`).join("\n")).join("\n\n");

function validMenuCategory(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MENU.length);
}

function menuPresentation(category: number | null) {
  const sections = category === null ? MENU : MENU.filter((_, i) => i === category);
  return `O cliente escolheu ${category === null ? "a apresentação completa do cardápio" : sections[0]?.t}. Apresente os itens destas categorias pelos ingredientes, texturas e experiência gastronômica, com histórias culturais pertinentes, em português brasileiro, sem inventar informações nem mencionar preços. Faça pausas entre categorias e escute se o cliente interromper. Dados verificados: ` + sections.map((s) => `${s.t}: ` + s.items.map((it) => `${it.n}${it.d ? `, ${it.d}` : ""}`).join("; ")).join(". ");
}

const studyScheduleInput = z.object({ category: z.number().int() }).strict();

function planStudySchedule(args: z.infer<typeof studyScheduleInput>) {
  const category = Math.max(0, Math.min(MENU.length - 1, args.category));
  return { category, name: MENU[category]!.t };
}

function isListeningSound(text: string) {
  const normalized = text.toLowerCase().replace(/[\s\p{Pd}]/gu, "");
  return /^(?:m+hm+|uhhuh)[.,!]*$/.test(normalized);
}

export type KitchenOrder = {
  customer_name: string;
  table_number: string;
  notes: string;
  items: { name: string; quantity: number; price: number | null }[];
  total: number;
  unknown: string[];
};

const fold = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function buildOrder(args: { customer_name: string; table_number: string; notes?: string | undefined; items: { name: string; quantity: number }[] }): KitchenOrder {
  const all = MENU.flatMap((s) => s.items);
  const items: KitchenOrder["items"] = [];
  const unknown: string[] = [];
  for (const it of args.items) {
    const k = fold(it.name);
    const hit = all.find((m) => fold(m.n) === k) ?? all.find((m) => fold(m.n).includes(k) || k.includes(fold(m.n)));
    if (!hit) { unknown.push(it.name); continue; }
    const m = hit.p.match(/([\d.]+),(\d{2})/);
    const price = m ? Number(m[1]!.replace(/\./g, "") + "." + m[2]) : null;
    items.push({ name: hit.n, quantity: it.quantity, price });
  }
  const total = Math.round(items.reduce((t, i) => t + (i.price ?? 0) * i.quantity, 0) * 100) / 100;
  return { customer_name: args.customer_name.trim(), table_number: args.table_number.trim(), notes: (args.notes ?? "").trim(), items, total, unknown };
}

async function answerQuestion(
  messages: ModelMessage[],
  config: LiveConfig,
  correlation: { runID: string; sessionID: string | undefined; delegationID: string },
  signal: AbortSignal,
  consumeInput: () => void,
  onPlan: (plan: ReturnType<typeof planStudySchedule>) => void,
  getFrame: () => string | undefined,
  onOrder: (order: KitchenOrder) => void = () => {},
) {
  signal.throwIfAborted();
  const provider = createOpenAI({
    baseURL: gatewayAPIBase(config.baseURL),
    apiKey: config.key,
    headers: {
      "Lovable-API-Key": config.key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
  let responseCursor = 0;
  consumeInput();
  const result = streamText({
    model: provider.responses(config.backendModel),
    abortSignal: signal,
    maxRetries: 0,
    stopWhen: stepCountIs(50),
    includeRawChunks: true,
    prepareStep() {
      consumeInput();
      const frame = getFrame();
      return {
        messages: frame
          ? [...messages, { role: "user" as const, content: [{ type: "text" as const, text: "Imagem atual da câmera do cliente:" }, { type: "image" as const, image: frame }] }]
          : [...messages],
      };
    },
    onStepFinish(step) {
      messages.push(...step.response.messages.slice(responseCursor));
      responseCursor = step.response.messages.length;
    },
    headers: {
      "X-Lovable-AIG-Run-ID": correlation.runID,
      "X-Lovable-AIG-Metadata": JSON.stringify({
        live_session_id: correlation.sessionID,
        delegation_id: correlation.delegationID,
      }),
    },
    providerOptions: {
      openai: {
        store: false,
        ...(config.backendModel !== "openai/chat-latest"
          ? {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            }
          : {}),
      },
    },
    system:
      "Você auxilia a Atendente Jade do DAKKAI Sushi a responder a última fala do cliente. " +
      OPEN_CONVERSATION + "\n" +
      "As transcrições podem estar incompletas; use a correção mais recente. Responda NO MESMO IDIOMA da última fala do cliente (português do Brasil, inglês ou espanhol; turistas em Florianópolis), com naturalidade e cortesia, " +
      "explicando termos do cardápio (combinado, hot, temaki, uramaki) quando o cliente for estrangeiro, mantendo os nomes dos pratos e citando preços em reais somente se o cliente perguntar explicitamente, " +
      "pronto para ser falado (sem listas nem markdown). Para informações do Dakkai, use o cardápio abaixo e nunca invente preços. " +
      "Quando o cliente pedir uma categoria ou recomendação do Dakkai, chame point_to_category com o número dela para o Zoord apontar no palco; não chame em perguntas gerais. " +
      "Se houver uma imagem da câmera, ela mostra o cliente agora: descreva com gentileza o que for relevante, sem identificar pessoas. " +
      "Quando o cliente quiser fazer um pedido, pergunte o nome dele e o número da mesa se ainda não souber, confirme os itens e quantidades, " +
      "e então chame register_order com os nomes exatos dos itens do cardápio. Depois confirme que o pedido foi para a cozinha; só diga o total se o cliente perguntar explicitamente o valor. " +
      "Se não houver imagem e o cliente pedir para você olhar, diga que ele pode ligar a câmera.\n\nCARDÁPIO:\n" + menuText,
    messages,
    tools: {
      register_order: tool({
        description: "Anota o pedido confirmado do cliente e envia a comanda para a cozinha.",
        inputSchema: z.object({
          customer_name: z.string().max(60),
          table_number: z.string().max(10),
          items: z.array(z.object({ name: z.string().max(120), quantity: z.number().int().min(1).max(50) })).min(1).max(30),
          notes: z.string().max(300).optional(),
        }),
        execute: async (args) => {
          signal.throwIfAborted();
          const order = buildOrder(args);
          if (!order.items.length) return { ok: false, error: "Nenhum item corresponde ao cardápio", unknown: order.unknown };
          onOrder(order);
          return { ok: true, total: order.total, items: order.items, unknown: order.unknown };
        },
      }),
      point_to_category: tool({
        description: "Faz o Zoord apontar para a categoria do cardápio no palco. Use o número entre colchetes.",
        inputSchema: studyScheduleInput,
        execute: async (args) => {
          signal.throwIfAborted();
          const plan = planStudySchedule(args);
          onPlan(plan);
          return plan;
        },
      }),
    },
  });
  let completed = false;
  let stepCompleted = false;
  let failed = false;
  // Drain through HTTP EOF so successful work is not recorded as cancelled by the Gateway.
  for await (const part of result.fullStream) {
    if (part.type === "start-step") stepCompleted = false;
    if (part.type === "raw" && part.rawValue && typeof part.rawValue === "object" && "type" in part.rawValue) {
      if (part.rawValue.type === "response.completed") stepCompleted = true;
      if (part.rawValue.type === "response.failed" || part.rawValue.type === "response.incomplete") failed = true;
    }
    if (part.type === "finish-step" && !stepCompleted) failed = true;
    if (part.type === "error" || part.type === "abort") failed = true;
    if (part.type === "finish") completed = part.finishReason === "stop";
  }
  signal.throwIfAborted();
  if (failed || !completed) throw new Error("The backend response did not complete");
  const answer = await result.text;
  if (!answer.trim()) throw new Error("The backend response had no answer");
  return answer;
}

function* commentaryChunks(content: string) {
  const encoder = new TextEncoder();
  let chunk = "";
  let bytes = 0;
  for (const [word] of content.matchAll(/\S+\s*|\s+/gu)) {
    // Chunks stay well inside the provider's per-append size limit.
    if (chunk && bytes + encoder.encode(word).length > 480) {
      yield chunk;
      chunk = "";
      bytes = 0;
    }
    for (const character of word) {
      const size = encoder.encode(character).length;
      if (bytes + size > 480) {
        yield chunk;
        chunk = "";
        bytes = 0;
      }
      chunk += character;
      bytes += size;
    }
  }
  if (chunk) yield chunk;
}

export function bindLiveConnection(
  browser: LiveSocket,
  configuration: LiveConfig,
  execution: LiveExecutionContext,
  connect: LiveConnector,
): void {
  const config = { ...configuration };
  const runID = crypto.randomUUID();
  const setupAbort = new AbortController();
  let gateway: LiveSocket | undefined;
  let sessionID: string | undefined;
  let latestFrame: string | undefined;
  let selectedMenu: { category: number | null } | undefined;
  let starting = false;
  let closing = false;
  let finished = false;
  let revision = 0;
  let task: AbortController | undefined;
  const pendingDelegations: Array<{
    event: ProviderEvent;
    plan?: ReturnType<typeof planStudySchedule>;
  }> = [];
  let completedDelegation: (typeof pendingDelegations)[number] | undefined;
  const backendMessages: ModelMessage[] = [];
  let transcriptCursor = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let finishDrain: (() => void) | undefined;
  let browserReady = false;
  let greetingRequested = false;
  let greetingCommand: { id: string; type: "instructions" | "commentary" } | undefined;
  let greetingTimer: ReturnType<typeof setTimeout> | undefined;
  const startTimer = setTimeout(() => {
    emit({ type: "app.error", error: { message: "Voice startup message timed out" } });
    stop();
  }, 5000);
  const transcripts: Transcript[] = [];
  const delegations = new Set<string>();

  function emit(event: object) {
    if (browser.readyState !== 1) return;
    try {
      browser.send(JSON.stringify(event));
    } catch {
      stop();
    }
  }

  function close(socket?: LiveSocket) {
    if (!socket || socket.readyState === 3) return;
    try {
      socket.close(1000, "Call ended");
    } catch {
      return;
    }
  }

  function clearGreeting() {
    clearTimeout(greetingTimer);
    greetingCommand = undefined;
  }

  function requestGreeting() {
    const content = (
      config.openingInstructions ??
      "Start the conversation now in your configured language and role. Give a brief greeting suited to this app's purpose, ask one relevant opening question, then listen."
    ).trim();
    if (!content || !browserReady || !sessionID || greetingRequested || closing) return;
    greetingRequested = true;
    if (new TextEncoder().encode(content).length > 480) {
      emit({ type: "app.greeting.error", error: { message: "The opening instructions are too long" } });
      return;
    }
    greetingCommand = { id: crypto.randomUUID(), type: "instructions" };
    greetingTimer = setTimeout(() => {
      clearGreeting();
      emit({ type: "app.greeting.error", error: { message: "The opening could not be confirmed" } });
    }, 10_000);
    gateway?.send(
      JSON.stringify({
        type: "session.instructions.append",
        event_id: greetingCommand.id,
        delegation_id: null,
        content,
      }),
    );
  }

  function discardPendingWork() {
    pendingDelegations.length = 0;
    completedDelegation = undefined;
    clearTimeout(restartTimer);
    task?.abort();
  }

  function finish() {
    if (finished) return;
    finished = closing = true;
    clearTimeout(startTimer);
    clearTimeout(startupTimer);
    clearTimeout(closeTimer);
    clearTimeout(restartTimer);
    clearGreeting();
    discardPendingWork();
    setupAbort.abort();
    close(gateway);
    close(browser);
    finishDrain?.();
  }

  function stop() {
    if (closing) return;
    closing = true;
    discardPendingWork();
    clearTimeout(startupTimer);
    clearTimeout(startTimer);
    clearGreeting();
    if (gateway?.readyState === 1) {
      execution.waitUntil(
        new Promise<void>((resolve) => {
          finishDrain = resolve;
        }),
      );
      closeTimer = setTimeout(finish, 15_000);
      try {
        gateway.send(JSON.stringify({ type: "session.close" }));
      } catch {
        finish();
      }
    } else {
      finish();
    }
  }

  function scheduleDelegation() {
    clearTimeout(restartTimer);
    if (closing || task || pendingDelegations.length === 0) return;
    restartTimer = setTimeout(() => void runDelegation(), 300);
  }

  function deliverResult(delegationID: string, answer: string, plan?: ReturnType<typeof planStudySchedule>) {
    if (closing) return;
    if (gateway?.readyState !== 1) return stop();
    try {
      for (const content of commentaryChunks(answer)) {
        gateway.send(
          JSON.stringify({
            type: "session.commentary.append",
            event_id: crypto.randomUUID(),
            delegation_id: delegationID,
            content,
          }),
        );
      }
      
      completedDelegation = pendingDelegations.shift();
    } catch {
      stop();
    }
  }

  async function runDelegation() {
    const pending = pendingDelegations[0];
    const event = pending?.event;
    const id = event?.delegation?.id;
    if (!pending || !event || !id || closing || task) return;
    if (!transcripts.some(({ role, text }) => role === "user" && text.trim())) return;
    const controller = new AbortController();
    task = controller;
    let taskRevision = revision;
    try {
      const answer = await answerQuestion(
        backendMessages,
        config,
        { runID, sessionID, delegationID: id },
        controller.signal,
        () => {
          const updates = transcripts.slice(transcriptCursor);
          if (updates.some(({ role, listeningSound }) => role === "user" && !listeningSound)) delete pending.plan;
          backendMessages.push(...updates.map(({ role, text }) => ({ role, content: text })));
          transcriptCursor = transcripts.length;
          taskRevision = revision;
        },
        (plan) => {
          pending.plan = plan;
          emit({ type: "app.point", category: plan.category });
        },
        () => latestFrame,
        (order) => emit({ type: "app.order", order }),
      );
      if (closing || controller.signal.aborted) return;
      if (taskRevision !== revision) return;
      deliverResult(id, answer.trim(), pending.plan);
    } catch {
      if (closing || controller.signal.aborted) return;
      backendMessages.push({
        role: "assistant",
        content:
          "The backend attempt failed. Completed tool results remain valid; verify uncertain external actions before any retry.",
      });
      if (taskRevision !== revision) return;
      deliverResult(id, "The backend could not finish the answer. Ask whether the user wants to try again.");
    } finally {
      if (task === controller) task = undefined;
      scheduleDelegation();
    }
  }

  function queueDelegation(event: ProviderEvent) {
    pendingDelegations.push({ event });
    emit({ type: "app.delegation.pending", delegation_id: event.delegation?.id });
    scheduleDelegation();
  }

  function receiveGateway(data: unknown) {
    try {
      if (typeof data !== "string" || data.length > 1024 * 1024) throw new Error("Invalid voice event");
      const event: ProviderEvent = JSON.parse(data);
      if (browser.readyState === 1) browser.send(data);
      if (event.type === "session.closed") return finish();
      if (event.type === "gateway.session.closing" || event.type === "gateway.error" || event.type === "app.error") {
        return stop();
      }
      if (closing) return;
      if (event.type === "gateway.session.created") {
        sessionID = event.session?.id;
        clearTimeout(startupTimer);
        requestGreeting();
      }
      if (
        greetingCommand &&
        event.type === `session.${greetingCommand.type}.appended` &&
        event.client_event_id === greetingCommand.id
      ) {
        if (greetingCommand.type === "instructions") {
          greetingCommand = { id: crypto.randomUUID(), type: "commentary" };
          gateway?.send(
            JSON.stringify({
              type: "session.commentary.append",
              event_id: greetingCommand.id,
              delegation_id: null,
              content: selectedMenu ? "Apresente agora o cardápio selecionado, usando os dados verificados fornecidos no início. Use sua voz natural, acolhedora e pausas elegantes." : "Comece a conversa agora, seguindo as instruções fornecidas.",
            }),
          );
        } else {
          clearGreeting();
          emit({ type: "app.greeting.accepted" });
        }
      } else if (greetingCommand && event.type === "error" && event.error?.client_event_id === greetingCommand.id) {
        clearGreeting();
        emit({ type: "app.greeting.error", error: { message: event.error.message ?? "The opening was rejected" } });
      }
      if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
        const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
        if (!event.delta?.trim()) return;
        const listeningSound = role === "user" && Boolean(task) && isListeningSound(event.delta);
        transcripts.push({
          role,
          text: event.delta,
          start_ms: event.start_ms ?? 0,
          end_ms: event.end_ms ?? 0,
          listeningSound,
        });
        if (listeningSound) return;
        if (role === "user") {
          revision++;
          const offset = completedDelegation?.event.offset_ms;
          // Live has no transcript watermark; completed handoffs can receive late context.
          if (
            pendingDelegations.length === 0 &&
            completedDelegation &&
            typeof offset === "number" &&
            Number.isFinite(offset) &&
            offset >= 0 &&
            typeof event.start_ms === "number" &&
            Number.isFinite(event.start_ms) &&
            event.start_ms >= 0 &&
            event.start_ms <= offset
          ) {
            pendingDelegations.push(completedDelegation);
            completedDelegation = undefined;
          }
          if (pendingDelegations.length) {
            emit({ type: "app.delegation.pending", delegation_id: pendingDelegations[0]?.event.delegation?.id });
          }
        }
        scheduleDelegation();
      } else if (event.type === "session.delegation.created") {
        const id = event.delegation?.id;
        if (id && event.delegation?.target === "client" && !delegations.has(id)) {
          delegations.add(id);
          queueDelegation(event);
        }
      }
    } catch {
      emit({ type: "app.error", error: { message: "Invalid voice event or lost connection" } });
      stop();
    }
  }

  async function startSession(sdp: string) {
    if (closing || browser.readyState !== 1) return;
    clearTimeout(startTimer);
    startupTimer = setTimeout(() => {
      emit({ type: "app.error", error: { message: "Voice startup timed out" } });
      stop();
    }, 40_000);
    const accepted = await connect(
      new URL(`${gatewayAPIBase(config.baseURL)}/live/sessions`).href,
      {
        "Lovable-API-Key": config.key,
        "X-Lovable-AIG-SDK": "fetch",
        "X-Lovable-AIG-Run-ID": runID,
      },
      setupAbort.signal,
    );
    if (closing || browser.readyState !== 1) {
      close(accepted);
      return;
    }
    gateway = accepted;
    gateway.onMessage(receiveGateway);
    gateway.onClose(finish);
    gateway.onError(() => {
      emit({ type: "app.error", error: { message: "Voice gateway connection failed" } });
      stop();
    });
    gateway.send(
      JSON.stringify({
        type: "session.start",
        session: {
          model: config.liveModel,
          instructions: conversationInstructions,
          audio: { output: { voice: "cedar" } },
          delegation: { type: "client" },
          ...(selectedMenu ? { input: [{ role: "developer", content: [{ type: "input_text", text: menuPresentation(selectedMenu.category) }] }] } : {}),
        },
        transport: { type: "webrtc", sdp },
      }),
    );
  }

  browser.onMessage((data) => {
    try {
      if (typeof data !== "string" || data.length > 512 * 1024) throw new Error("Invalid client message");
      const event = JSON.parse(data);
      if (event.type === "session.close") return stop();
      if (closing) return;
      if (!gateway) {
        if (starting || event.type !== "app.start" || typeof event.sdp !== "string" || !event.sdp.trim()) {
          throw new Error("Voice startup message required");
        }
        starting = true;
        if (event.menu !== undefined) {
          if (!event.menu || !validMenuCategory(event.menu.category)) throw new Error("Invalid menu selection");
          selectedMenu = { category: event.menu.category };
          config.openingInstructions = "Comece em português do Brasil apresentando o cardápio escolhido nos dados verificados de entrada, sem uma saudação longa. Seja natural, caloroso e detalhado sobre ingredientes e texturas, sem mencionar preços. Não use outra voz.";
        }
        execution.waitUntil(
          startSession(event.sdp).catch((error) => {
            if (!closing)
              emit({
                type: "app.error",
                error: { message: error instanceof Error ? error.message : "Voice startup failed" },
              });
            stop();
          }),
        );
        return;
      }
      if (event.type === "app.frame") {
        if (event.image === null) latestFrame = undefined;
        else if (typeof event.image === "string" && event.image.startsWith("data:image/jpeg;base64,")) latestFrame = event.image;
        return;
      }
      if (event.type === "app.menu") {
        if (!browserReady || !validMenuCategory(event.category)) throw new Error("Invalid menu selection");
        emit({ type: "app.point", category: event.category });
        for (const content of commentaryChunks(menuPresentation(event.category))) {
          gateway.send(JSON.stringify({ type: "session.commentary.append", event_id: crypto.randomUUID(), delegation_id: null, content }));
        }
        return;
      }
      if (event.type === "app.ready") {
        browserReady = true;
        requestGreeting();
        return;
      }
      if (event.type !== "gateway.heartbeat") {
        throw new Error("Unsupported client event");
      }
      if (gateway.readyState !== 1) return stop();
      gateway.send(data);
    } catch {
      emit({ type: "app.error", error: { message: "Voice connection could not be started or continued" } });
      stop();
    }
  });
  browser.onClose(stop);
  browser.onError(stop);
}
