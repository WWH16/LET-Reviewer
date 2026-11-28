import postcss from 'postcss';

/**
 * Trims Kumo's stylesheet at build time. Kumo ships one pre-built Tailwind sheet for every component it has, all of it
 * inside cascade layers; the app uses four components. Every class a layered rule can match must appear as a string
 * in the bundled code or the HTML (Tailwind classes are always written out whole), so a layered rule whose classes
 * appear nowhere is dropped. The app's own CSS is unlayered and is never touched.
 */

/** Every class-like token in the bundle, split the way Tailwind reads class strings. */
export function usedTokens(sources: string[]): Set<string> {
  const set = new Set<string>();
  for (const s of sources) for (const t of s.match(/[^<>"'`\s]*[^<>"'`\s:]/g) ?? []) set.add(t);
  return set;
}

// A class in a selector, with Tailwind's escapes: \: \[ \. and hex escapes for a leading digit (\32 xl).
const CLASS = /\.((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g;
const unescape = (s: string) => s.replace(/\\([0-9a-fA-F]{1,6}) ?|\\(.)/g, (_, hex: string, ch: string) => (hex ? String.fromCodePoint(parseInt(hex, 16)) : ch));
const classesOf = (selector: string) => [...selector.matchAll(CLASS)].map((m) => unescape(m[1]));

const inLayer = (node: postcss.Node) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === 'atrule' && (p as postcss.AtRule).name === 'layer') return true;
  return false;
};

/** Drops the layered rules whose selectors name a class the bundle never uses; keeps everything else as it is. */
export function trimLayeredRules(css: string, used: Set<string>): string {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (!inLayer(rule) || rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).name === 'keyframes') return;
    const kept = rule.selectors.filter((sel) => classesOf(sel).every((c) => used.has(c)));
    if (!kept.length) rule.remove();
    else if (kept.length < rule.selectors.length) rule.selectors = kept;
  });
  // A media or supports block left with nothing in it goes too.
  root.walkAtRules((at) => {
    if (at.name !== 'layer' && at.nodes && at.nodes.length === 0) at.remove();
  });
  return root.toString();
}
