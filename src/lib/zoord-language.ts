// Single source of truth for Zoord's conversation language. The selected language locks the
// LLM prompt, the TTS accent and speech recognition together, so nothing auto-switches mid-sentence.
export type ZoordLanguage = "pt" | "en" | "es";

export const ZOORD_LANGUAGES: { id: ZoordLanguage; label: string; short: string; recognition: "pt-BR" | "en-US" | "es-ES" }[] = [
  { id: "pt", label: "Português", short: "PT", recognition: "pt-BR" },
  { id: "en", label: "English", short: "EN", recognition: "en-US" },
  { id: "es", label: "Español", short: "ES", recognition: "es-ES" },
];

export function parseLanguage(value: unknown): ZoordLanguage {
  return value === "en" || value === "es" ? value : "pt";
}

export function recognitionLang(lang: ZoordLanguage) {
  return ZOORD_LANGUAGES.find((l) => l.id === lang)!.recognition;
}

const NAMES: Record<ZoordLanguage, string> = { pt: "português do Brasil", en: "inglês (English)", es: "espanhol (español)" };

/** Appended last to the system prompt so it overrides any earlier language guidance. */
export function languageDirective(lang: ZoordLanguage): string {
  const name = NAMES[lang];
  return `\n\nTRAVA DE IDIOMA (prioridade máxima, substitui qualquer instrução anterior sobre idioma): o idioma selecionado na interface é ${name}. Escreva a resposta inteira, do início ao fim, somente em ${name}. Nunca troque de idioma no meio de uma frase nem entre frases, mesmo que o cliente fale em outra língua ou que o histórico contenha outro idioma. Termos culinários japoneses (sushi, nigiri, sashimi, omakase) são permitidos.\n`;
}

const TTS_ACCENT: Record<ZoordLanguage, string> = {
  pt: "Fale somente em português brasileiro, com sotaque brasileiro natural e o jeitinho caloroso de um anfitrião carioca/paulistano educado: entonação que sobe e desce com naturalidade, sorriso na voz, ligando as palavras como numa conversa de verdade (pra, tá, né soam naturais). Nada de sílabas separadas, ênfase mecânica ou ritmo de leitura.",
  en: "Speak only in natural American English.",
  es: "Habla solo en español latinoamericano natural.",
};

export function ttsInstructions(lang: ZoordLanguage): string {
  return `Você é a atendente do Dakkai Sushi. Voz feminina doce, leve e calorosa, com sorriso na voz. ${TTS_ACCENT[lang]} Fale de forma humana e conversacional, sem soar como locutor, sem exagero teatral e sem monotonia robótica. Ritmo ágil e fluente, um pouco mais rápido que uma leitura, levemente animado, como quem conversa olhando nos olhos; pausas curtas e naturais só onde há vírgula ou ponto, sem travar entre frases. Pronuncie nomes japoneses com cuidado. Não traduza, não acrescente informações nem preços ao texto fornecido.`;
}

/** Barge-in: true when what the mic heard is the customer, not Zoord's own voice echoing back. */
const normWords = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
/** How long after Zoord stops talking a transcript is still checked against his last words. */
export const ECHO_TAIL_MS = 3000;
/** Share of heard words that also appear in what Zoord said (0..1). */
function echoRatio(heard: string, speaking: string) {
  const words = normWords(heard);
  if (!words.length) return 1;
  const spoken = new Set(normWords(speaking));
  return words.filter((w) => spoken.has(w)).length / words.length;
}
/** Mostly Zoord's own recent words: ignore instead of answering himself. */
export function isEchoOf(heard: string, spoken: string): boolean {
  if (!spoken.trim()) return false;
  // Short answers ("salmão", "o primeiro") often repeat offered options; never drop them as echo.
  if (normWords(heard).length < 4) return false;
  return echoRatio(heard, spoken) >= 0.5;
}
/** Interrupt only for 3+ words that are clearly not his own voice, so misheard echo can't cut him off. */
export function isCustomerBargeIn(heard: string, speaking: string): boolean {
  if (normWords(heard).length < 3) return false;
  return echoRatio(heard, speaking) < 0.34;
}
