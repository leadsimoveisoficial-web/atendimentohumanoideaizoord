/** Splits streamed text into speakable sentences as soon as each one ends. */
export function takeSentences(buffer: string, minLength = 12): { ready: string[]; rest: string } {
  const ready: string[] = [];
  let start = 0;
  const re = /(?:[!?…]+["')\]]?(?:\s+|$)|\.+["')\]]?(?:\s+|$))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buffer))) {
    const end = m.index + m[0].length;
    const piece = buffer.slice(start, end).trim();
    // A period after a number may be the start of a decimal in the next token.
    if (end === buffer.length && /\d\.$/.test(piece)) continue;
    if (piece.length >= minLength) { ready.push(piece); start = end; }
  }
  return { ready, rest: buffer.slice(start) };
}

const DETAIL = /\b(expli\w*|detalh\w*|hist[óo]ria|como (é|e) feit[oa]|conte mais|fale mais|me fale sobre|apresent\w*|card[áa]pio completo|explain\w*|detail\w*|tell me more|history|cu[ée]ntame)\b/i;
/** Long answers only when the customer explicitly asks for detail. */
export function wantsDetail(message: string): boolean {
  return DETAIL.test(message);
}
