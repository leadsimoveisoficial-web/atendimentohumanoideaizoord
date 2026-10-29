import { MENU } from "@/components/menu";

// Free, deterministic presentation scripts built from the real menu.
// No AI and no credits: the wording is fixed, the data is verified.

const fold = (t: string) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const STOP = new Set([
  "de","da","do","das","dos","com","em","para","por","uma","um","uns","umas","que","qual","quais","quanto","quanta","quanto","os","as","e","o","a","no","na","nos","nas","tem","tem","voce","vocês","vcs","eu","quero","queria","gostaria","the","of","with","for","and","what","have","you","do","does","is","are","el","la","los","las","que","con","para","por","un","una","tiene","quiero","cuanto",
]);

export function categoryScript(category: number | null): string {
  const sections = category === null ? MENU : MENU.filter((_, i) => i === category);
  if (!sections.length) return categoryScript(null);
  const parts: string[] = [];
  parts.push(
    category === null
      ? "Permita-me apresentar a seleção especial do nosso chef, preparada com frescor e precisão a cada peça."
      : `Permita-me apresentar, com todo o cuidado da casa, a nossa seleção de ${sections[0]?.t}.`,
  );
  for (const s of sections) {
    parts.push(`${s.t}: ` + s.items.map((it) => `${it.n}${it.d ? `, ${it.d.replace(/\.{3}|…/g, "")}` : ""}`).join("; ") + ".");
  }
  parts.push("Prefere sabores delicados, o toque do maçarico ou uma textura crocante? Será uma honra conduzir a sua escolha.");
  return parts.join(" ");
}

/** Best-effort menu lookup for a question; null when nothing in the menu matches. */
export function menuMatch(question: string): { section: string; items: { n: string; p: string; d: string }[] } | null {
  const normalized = fold(question);
  const exactItems = MENU.flatMap((section) => section.items.map((item) => ({ section, item })))
    .filter(({ item }) => normalized.includes(fold(item.n)))
    .sort((a, b) => b.item.n.length - a.item.n.length);
  const exact = exactItems[0];
  if (exact) return { section: exact.section.t, items: [{ n: exact.item.n, p: exact.item.p, d: exact.item.d }] };
  const words = fold(question).split(" ").filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return null;
  const scored = MENU.map((s) => {
    let score = fold(s.t).includes(fold(question)) && question.length > 3 ? 5 : 0;
    const items = s.items
      .map((it) => {
        const name = fold(it.n);
        const desc = fold(it.d ?? "");
        let itemScore = words.reduce((acc, w) => acc + (name.includes(w) ? 2 : desc.includes(w) ? 1 : 0), 0);
        if (name.includes(fold(question)) || fold(question).includes(name)) itemScore += 3;
        return { it, itemScore };
      })
      .filter(({ itemScore }) => itemScore >= 2)
      .sort((a, b) => b.itemScore - a.itemScore)
      .slice(0, 4);
    score += items.reduce((acc, { itemScore }) => acc + itemScore, 0);
    return { s, items: items.map(({ it }) => ({ n: it.n, p: it.p, d: it.d })), score };
  })
    .sort((a, b) => b.score - a.score)[0];
  if (!scored || scored.score < 2 || !scored.items.length) return null;
  return { section: scored.s.t, items: scored.items };
}

export function menuAnswerScript(question: string): string | null {
  const match = menuMatch(question);
  if (!match) return null;
  const list = match.items.map((it) => `${it.n}${requestsMenuPrice(question) ? `, ${it.p}` : it.d ? `, ${it.d.replace(/\.{3}|…/g, "")}` : ""}`).join("; ");
  return `Encontrei em ${match.section}: ${list}.`;
}

/** Only explicit financial questions authorize quoting verified menu prices. */
export function requestsMenuPrice(question: string): boolean {
  const text = fold(question);
  if (/\b(?:sem|nao (?:fale|cite|mencione)|without|do not mention|sin|no menciones)\b.*\b(?:precos?|valor|valores|prices?|costs?|precios?)\b/.test(text)) return false;
  return /\b(?:precos?|valor|valores|custo|custa|custam|price|prices|cost|costs|precio|precios|cuesta|cuestan)\b/.test(text)
    || /\b(?:quanto (?:e|fica|pago|vou pagar)|how much|cuanto (?:vale|es|sale))\b/.test(text);
}

export const FREE_FALLBACK_ANSWER =
  "Podemos conversar sobre outros assuntos também. Neste momento minha conexão com a inteligência está indisponível, então não consigo responder a essa pergunta com confiança. Ainda posso apresentar o cardápio com os dados salvos.";

/** Rough category guess from free text, for the pointing gesture. */
export function guessCategory(text: string): number | null {
  const t = fold(text);
  let best: number | null = null;
  let score = 0;
  MENU.forEach((s, i) => {
    let sc = t.includes(fold(s.t)) ? 3 : 0;
    s.items.forEach((it) => {
      if (t.includes(fold(it.n))) sc += 2;
    });
    if (sc > score) {
      score = sc;
      best = i;
    }
  });
  return score >= 3 ? best : null;
}

/** Brief, refined comment when a guest taps a dish; never volunteers the price. */
export function choiceComment(name: string, description?: string): string {
  const note = description?.replace(/\.{3}|…/g, "").trim();
  return `Uma escolha primorosa: ${name}.${note ? ` ${note.charAt(0).toUpperCase()}${note.slice(1).replace(/\.$/, "")}.` : ""} Frescor e delicadeza em cada detalhe; tenho certeza de que será um momento memorável.`;
}
