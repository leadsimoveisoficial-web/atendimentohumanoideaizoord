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
      ? "Com enorme prazer, apresento o nosso cardápio."
      : `Com enorme prazer, apresento a categoria ${sections[0]!.t}.`,
  );
  for (const s of sections) {
    parts.push(`${s.t}: ` + s.items.map((it) => `${it.n}, ${it.p}`).join("; ") + ".");
  }
  parts.push("Para fechar o seu pedido, toque em Pedir no WhatsApp. Será um prazer servir você.");
  return parts.join(" ");
}

/** Best-effort menu lookup for a question; null when nothing in the menu matches. */
export function menuMatch(question: string): { section: string; items: { n: string; p: string }[] } | null {
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
    return { s, items: items.map(({ it }) => ({ n: it.n, p: it.p })), score };
  })
    .sort((a, b) => b.score - a.score)[0];
  if (!scored || scored.score < 2 || !scored.items.length) return null;
  return { section: scored.s.t, items: scored.items };
}

export function menuAnswerScript(question: string): string | null {
  const match = menuMatch(question);
  if (!match) return null;
  const list = match.items.map((it) => `${it.n}, ${it.p}`).join("; ");
  return `Encontrei em ${match.section}: ${list}. Para fechar o seu pedido, toque em Pedir no WhatsApp.`;
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
