// Free listening (Web Speech API SpeechRecognition) and client-side language
// detection for the free conversation mode.

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
}

export function recognitionSupported(): boolean {
  return Boolean(recognitionCtor());
}

export type SpeechLang = "pt-BR" | "en-US" | "es-ES";

const LANG_HINTS: Array<[SpeechLang, RegExp]> = [
  ["en-US", /\b(the|and|you|your|please|what|have|want|would|thanks|hello|hi|menu|combo|price|how much|good)\b/i],
  ["es-ES", /\b(el|la|los|las|por favor|gracias|hola|buenos|buenas|qué|cuánto|quiero|menú|precio|carta|para)\b/i],
  ["pt-BR", /\b(você|obrigad|bom dia|boa tarde|boa noite|por favor|quero|cardápio|quanto|preço|olá|oi|combinado|temaki)\b/i],
];

export function detectLang(text: string, fallback: SpeechLang = "pt-BR"): SpeechLang {
  let best: SpeechLang = fallback;
  let bestScore = 0;
  for (const [lang, re] of LANG_HINTS) {
    const score = (text.match(new RegExp(re.source, "gi")) ?? []).length;
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  return best;
}

export type FreeListener = {
  start(): void;
  stop(): void;
  setLang(lang: SpeechLang): void;
};

export function createFreeListener(options: {
  lang: SpeechLang;
  onFinal(text: string, lang: SpeechLang): void;
  onInterim?(text: string): void;
  onError(message: string): void;
}): FreeListener {
  const Ctor = recognitionCtor();
  if (!Ctor) throw new Error("Este navegador não tem reconhecimento de voz gratuito.");
  let recognition: SpeechRecognitionLike | undefined;
  let active = false;
  let lang = options.lang;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;

  const spawn = () => {
    const instance = new Ctor();
    instance.lang = lang;
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    instance.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? "";
        if (!text) continue;
        if (result?.isFinal) {
          const detected = detectLang(text, lang);
          if (detected !== lang) {
            lang = detected;
            options.onFinal(text, detected);
            restart();
            return;
          }
          options.onFinal(text, lang);
        } else interim += text;
      }
      if (interim) options.onInterim?.(interim);
    };
    instance.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        active = false;
        options.onError("Permita o acesso ao microfone no navegador para falar com o Zoord.");
        return;
      }
      if (event.error === "network") options.onError("A escuta gratuita caiu por um instante. Continuando…");
    };
    instance.onend = () => {
      if (active) {
        // Chrome ends the session periodically; restart to keep listening.
        restartTimer = setTimeout(() => {
          if (!active) return;
          try {
            recognition?.start();
          } catch {
            /* already started */
          }
        }, 250);
      }
    };
    return instance;
  };

  const restart = () => {
    if (!active) return;
    try {
      recognition?.abort();
    } catch {
      /* ignore */
    }
    recognition = spawn();
    try {
      recognition.start();
    } catch {
      /* ignore */
    }
  };

  return {
    start() {
      if (active) return;
      active = true;
      recognition = spawn();
      try {
        recognition.start();
      } catch {
        /* ignore */
      }
    },
    stop() {
      active = false;
      clearTimeout(restartTimer);
      try {
        recognition?.abort();
      } catch {
        /* ignore */
      }
      recognition = undefined;
    },
    setLang(next) {
      if (next === lang) return;
      lang = next;
      restart();
    },
  };
}
