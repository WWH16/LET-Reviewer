// Question IDs come from the content, so the same handout imported on two devices
// produces the same IDs and merges cleanly (plan §5, Import rules).

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** cyrb53: a fast 53-bit string hash. Not cryptographic, only for stable IDs. */
export function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function questionId(q: { source: string; sourceRef: string; stem: string }): string {
  if (q.source === 'review-center' && slug(q.sourceRef)) return `rc-${slug(q.sourceRef)}`;
  return `ai-${hash(q.stem.toLowerCase().replace(/\s+/g, ' ').trim())}`;
}

/** Exam label: part prefix, month and day, then A..Z, AA.. for each exam that day (DX N5). */
export function examLabel(part: string, date: Date, existing: readonly string[]): string {
  const prefix = { GenEd: 'GE', ProfEd: 'PE', Major: 'MJ' }[part] ?? 'EX';
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const base = `${prefix}-${mmdd}-`;
  const used = new Set(existing);
  for (let i = 0; ; i++) {
    let n = i;
    let suffix = '';
    do {
      suffix = String.fromCharCode(65 + (n % 26)) + suffix;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    if (!used.has(base + suffix)) return base + suffix;
  }
}
