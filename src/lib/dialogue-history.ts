export type DialogueTurn = { role: "user" | "assistant"; content: string };

/** Retain reception plus recent exchanges without storing anything outside this session. */
export function conversationHistory(turns: DialogueTurn[]): DialogueTurn[] {
  if (turns.length <= 24) return [...turns];
  return [...turns.slice(0, 4), ...turns.slice(-20)];
}