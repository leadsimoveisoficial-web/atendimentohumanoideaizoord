import { voiceLevel } from "./voice-level";

// Free browser voice (Web Speech API speechSynthesis). Costs no credits.
// The browser does not expose the synthesized audio for measurement, so the
// mouth envelope below is gated on the engine's real speaking state and word
// boundaries — it never runs while the utterance is paused or stopped.

export function freeSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let speakingToken = 0;
let envelopeRaf = 0;
let wordAt = performance.now();

function stopEnvelope(token: number) {
  if (token !== speakingToken) return;
  speakingToken++;
  cancelAnimationFrame(envelopeRaf);
  envelopeRaf = 0;
  voiceLevel.v = 0;
  voiceLevel.round = 0;
  voiceLevel.wide = 0;
}

function runEnvelope(token: number) {
  cancelAnimationFrame(envelopeRaf);
  wordAt = performance.now();
  const loop = () => {
    if (token !== speakingToken) return;
    const now = performance.now();
    const t = now / 1000;
    // Gate: full motion right after a word boundary, gentle between words
    // (some engines never fire boundary events — speech must still move).
    const sinceWord = (now - wordAt) / 1000;
    const gate = sinceWord < 0.8 ? 1 : 0.3;
    const syllable = 0.55 + 0.45 * Math.sin(t * Math.PI * 2 * 6.2);
    const flutter = 0.85 + 0.15 * Math.sin(t * Math.PI * 2 * 0.9);
    voiceLevel.v = Math.min(1, gate * syllable * flutter * 0.9);
    voiceLevel.round = 0.3 + 0.25 * Math.sin(t * 1.7);
    voiceLevel.wide = 0.3 + 0.25 * Math.sin(t * 2.3 + 1);
    envelopeRaf = requestAnimationFrame(loop);
  };
  envelopeRaf = requestAnimationFrame(loop);
}

let voicesCache: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (!freeSpeechSupported()) return;
  voicesCache = window.speechSynthesis.getVoices();
}

if (freeSpeechSupported()) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

function voicesReady(): Promise<void> {
  if (voicesCache.length) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      refreshVoices();
      resolve();
    };
    const timer = setTimeout(done, 1500);
    window.speechSynthesis.addEventListener?.(
      "voiceschanged",
      () => {
        clearTimeout(timer);
        done();
      },
      { once: true },
    );
  });
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!voicesCache.length) refreshVoices();
  const wanted = lang.toLowerCase().replace("_", "-");
  const prefix = wanted.slice(0, 2);
  const score = (v: SpeechSynthesisVoice) => {
    const vl = v.lang.toLowerCase().replace("_", "-");
    if (!vl.startsWith(prefix)) return -1;
    let s = vl.startsWith(wanted) ? 2 : 1;
    if (/google|natural|premium|enhanced/i.test(v.name)) s += 1;
    if (v.localService) s += 0.5;
    return s;
  };
  const best = voicesCache
    .map((v) => ({ v, s: score(v) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)[0];
  return best?.v;
}

/** Split long text at sentence/comma boundaries — mobile engines are unreliable past ~200 chars. */
export function chunkForSpeech(text: string, limit = 180): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > limit) {
    let cut = -1;
    for (const re of [/[.!?…](\s|$)/g, /[;:](\s|$)/g, /,(\s|$)/g, /\s/g]) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(rest))) {
        if (match.index > limit) break;
        cut = match.index + match[0].length;
      }
      if (cut > 0) break;
    }
    if (cut <= 0) cut = limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function speakChunk(chunk: string, voice: SpeechSynthesisVoice | undefined, lang: string, token: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (token !== speakingToken) return resolve();
    const utterance = new SpeechSynthesisUtterance(chunk);
    if (voice) utterance.voice = voice;
    utterance.lang = lang;
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onboundary = () => {
      wordAt = performance.now();
    };
    const settle = () => {
      utterance.onend = null;
      utterance.onerror = null;
      resolve();
    };
    utterance.onend = settle;
    utterance.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") settle();
      else reject(new Error("A voz gratuita do navegador falhou."));
    };
    if (signal) {
      const abort = () => {
        window.speechSynthesis.cancel();
        settle();
      };
      if (signal.aborted) return abort();
      signal.addEventListener("abort", abort, { once: true });
      utterance.onend = () => {
        signal.removeEventListener("abort", abort);
        settle();
      };
    }
    runEnvelope(token);
    window.speechSynthesis.speak(utterance);
  });
}

export function stopFreeSpeech() {
  if (!freeSpeechSupported()) return;
  const token = speakingToken;
  window.speechSynthesis.cancel();
  stopEnvelope(token);
}

/** Speak text with the free browser voice; resolves when playback ends. */
export async function speakFree(text: string, options: { lang?: string; signal?: AbortSignal } = {}): Promise<void> {
  if (!freeSpeechSupported()) throw new Error("Este navegador não tem voz gratuita instalada.");
  const lang = options.lang ?? "pt-BR";
  const signal = options.signal;
  signal?.throwIfAborted();
  stopFreeSpeech();
  const token = ++speakingToken;
  try {
    await voicesReady();
    const voice = pickVoice(lang);
    const chunks = chunkForSpeech(text);
    for (const chunk of chunks) {
      signal?.throwIfAborted();
      await speakChunk(chunk, voice, lang, token, signal);
    }
  } finally {
    stopEnvelope(token);
  }
}
