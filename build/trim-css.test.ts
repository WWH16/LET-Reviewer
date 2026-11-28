// The build trims Kumo's layered Tailwind rules to the classes the bundle uses, and never touches unlayered CSS.
import { describe, expect, it } from 'vitest';
import { trimLayeredRules, usedTokens } from './trim-css';

describe('trimLayeredRules', () => {
  const css = `@layer utilities{.flex{display:flex}.grid{display:grid}.data-\\[state\\=open\\]\\:opacity-100[data-state=open]{opacity:1}.w-1\\.5{width:.375rem}.unused-a,.flex>.unused-b{color:red}@media (min-width:40rem){.sm\\:hidden{display:none}}}
@layer base{button{font:inherit}}
.tile{padding:1rem}.not-in-bundle{color:blue}`;
  const used = usedTokens([`jsx("div",{className:"flex data-[state=open]:opacity-100 w-1.5"})`, '<div id="root" class="isolate">']);
  const out = trimLayeredRules(css, used);

  it('keeps the layered rules the bundle uses, escaped variants included', () => {
    expect(out).toContain('.flex{display:flex}');
    expect(out).toContain('opacity-100');
    expect(out).toContain('.w-1\\.5');
  });
  it('drops layered rules no class string uses, and an emptied media block', () => {
    expect(out).not.toContain('.grid');
    expect(out).not.toContain('unused-a');
    expect(out).not.toContain('sm\\:hidden');
    expect(out).not.toContain('@media');
  });
  it('keeps layered rules without classes, and every unlayered rule', () => {
    expect(out).toContain('button{font:inherit}');
    expect(out).toContain('.tile{padding:1rem}');
    expect(out).toContain('.not-in-bundle{color:blue}');
  });
});
