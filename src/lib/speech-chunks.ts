/** Splits streamed text into speakable sentences as soon as each one ends. */
export function takeSentences(buffer: string, minLength = 12): { ready: string[]; rest: string } {
  const ready: string[] = [];
  let start = 0;
  const re = /[.!?…]+["')\]]?\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buffer))) {
    const end = m.index + m[0].length;
    const piece = buffer.slice(start, end).trim();
    if (piece.length >= minLength) { ready.push(piece); start = end; }
  }
  return { ready, rest: buffer.slice(start) };
}

const DETAIL = /\b(explique|explica|detalh|hist[óo]ria|como (é|e) feito|conte mais|fale mais|me fale sobre|apresent|card[áa]pio completo|explain|detail|tell me more|history|explica(r|me)|cu[ée]ntame)/i;
/** Long answers only when the customer explicitly asks for detail. */
export function wantsDetail(message: string): boolean {
  return DETAIL.test(message);
}
