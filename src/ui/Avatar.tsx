import { useEffect, useState } from 'react';
import type { Settings } from '../domain/types';

type Who = Pick<Settings, 'avatarBase' | 'avatarParts'>;
/** `choices` are the style's own ids, in order; `names` says each one in words, for the captions and screen readers. */
export type AvatarPart = { key: string; label: string; choices: string[]; names: Record<string, string>; colour?: boolean };

const part = (key: string, label: string, options: [id: string, name: string][], colour = false): AvatarPart => ({
  key,
  label,
  colour,
  choices: options.map(([id]) => id),
  names: Object.fromEntries(options),
});

/**
 * The Avataaars parts she can change, curated: options that look odd on a study profile (vomit, eyepatch,
 * skull shirts) are left out. A part whose first choice is 'none' can be left off. Colours are hex, no '#'.
 * Names were read off the drawings, not the ids (frida is a flower crown, sides is bald on top).
 */
export const AVATAR_PARTS: AvatarPart[] = [
  part('skinColor', 'Skin tone', [['ffdbb4', 'Light'], ['edb98a', 'Medium light'], ['d08b5b', 'Medium'], ['ae5d29', 'Medium dark'], ['614335', 'Dark']], true),
  part(
    'hairColor',
    'Hair colour',
    [['2c1b18', 'Black'], ['4a312c', 'Dark brown'], ['724133', 'Brown'], ['a55728', 'Auburn'], ['b58143', 'Light brown'], ['d6b370', 'Blonde'], ['c93305', 'Red'], ['e8e1e1', 'Grey']],
    true,
  ),
  part('top', 'Hair', [
    ['none', 'Bald'], ['bob', 'Bob'], ['bun', 'Bun'], ['curly', 'Curly'], ['curvy', 'Long wavy'], ['bigHair', 'Big hair'],
    ['longButNotTooLong', 'Shoulder length'], ['straight01', 'Long straight'], ['straight02', 'Straight'], ['straightAndStrand', 'Side strand'],
    ['miaWallace', 'Bangs'], ['frida', 'Flower crown'], ['fro', 'Afro'], ['froBand', 'Afro with band'], ['dreads', 'Long dreads'],
    ['dreads01', 'Short dreads'], ['dreads02', 'Twists'], ['frizzle', 'Quiff'], ['shaggy', 'Shaggy'], ['shaggyMullet', 'Mullet'],
    ['shortCurly', 'Short curly'], ['shortFlat', 'Short'], ['shortRound', 'Short round'], ['shortWaved', 'Short wavy'], ['sides', 'Bald top'],
    ['shavedSides', 'Shaved sides'], ['theCaesar', 'Crew cut'], ['theCaesarAndSidePart', 'Side part'], ['hijab', 'Hijab'], ['turban', 'Turban'],
    ['hat', 'Wide-brim hat'], ['winterHat1', 'Trapper hat'], ['winterHat02', 'Knit hat'], ['winterHat03', 'Beanie'], ['winterHat04', 'Cat-ear beanie'],
  ]),
  part('eyebrows', 'Eyebrows', [
    ['defaultNatural', 'Natural'], ['flatNatural', 'Flat'], ['raisedExcitedNatural', 'Raised'], ['upDownNatural', 'One raised'], ['sadConcernedNatural', 'Worried'],
    ['unibrowNatural', 'Unibrow'], ['default', 'Thin'], ['raisedExcited', 'Thin raised'], ['upDown', 'Thin, one raised'],
  ]),
  part('eyes', 'Eyes', [['default', 'Open'], ['happy', 'Happy'], ['side', 'Side glance'], ['squint', 'Squint'], ['wink', 'Wink'], ['surprised', 'Wide'], ['closed', 'Closed']]),
  part('mouth', 'Mouth', [['smile', 'Big smile'], ['default', 'Smile'], ['twinkle', 'Small smile'], ['serious', 'Serious'], ['concerned', 'Worried'], ['disbelief', 'Gasp']]),
  part('accessories', 'Glasses', [['none', 'None'], ['prescription01', 'Oval'], ['prescription02', 'Rectangle'], ['round', 'Round'], ['kurt', 'Tinted'], ['wayfarers', 'Wayfarers'], ['sunglasses', 'Sunglasses']]),
  part('facialHair', 'Facial hair', [['none', 'None'], ['beardLight', 'Light beard'], ['beardMedium', 'Beard'], ['beardMajestic', 'Full beard'], ['moustacheFancy', 'Curled moustache'], ['moustacheMagnum', 'Thick moustache']]),
  part('clothing', 'Clothes', [
    ['blazerAndShirt', 'Blazer and shirt'], ['blazerAndSweater', 'Blazer and sweater'], ['collarAndSweater', 'Collared sweater'], ['hoodie', 'Hoodie'],
    ['overall', 'Overalls'], ['shirtCrewNeck', 'Crew neck'], ['shirtScoopNeck', 'Scoop neck'], ['shirtVNeck', 'V-neck'],
  ]),
  part(
    'clothesColor',
    'Clothes colour',
    [
      ['262e33', 'Black'], ['3c4f5c', 'Slate'], ['25557c', 'Navy'], ['5199e4', 'Blue'], ['65c9ff', 'Sky blue'], ['929598', 'Grey'], ['e6e6e6', 'Light grey'],
      ['ffffff', 'White'], ['a7ffc4', 'Mint'], ['ffffb1', 'Pale yellow'], ['ffafb9', 'Pink'], ['ff5c5c', 'Red'], ['ff488e', 'Hot pink'],
    ],
    true,
  ),
];

/** The two starting faces. Every part has a value, so the editor always knows which choice is showing. */
export const AVATAR_BASES: Record<Settings['avatarBase'], { label: string; parts: Record<string, string> }> = {
  girl: {
    label: 'Woman',
    parts: { skinColor: 'd08b5b', hairColor: '2c1b18', top: 'straight01', eyebrows: 'defaultNatural', eyes: 'default', mouth: 'smile', accessories: 'none', facialHair: 'none', clothing: 'blazerAndShirt', clothesColor: '262e33' },
  },
  boy: {
    label: 'Man',
    parts: { skinColor: 'd08b5b', hairColor: '2c1b18', top: 'shortFlat', eyebrows: 'defaultNatural', eyes: 'default', mouth: 'smile', accessories: 'none', facialHair: 'none', clothing: 'collarAndSweater', clothesColor: '262e33' },
  },
};

/** The parts the two starting faces differ in. Switching face replaces only these, so her other choices stay. */
export const BASE_KEYS = Object.keys(AVATAR_BASES.girl.parts).filter((k) => AVATAR_BASES.girl.parts[k] !== AVATAR_BASES.boy.parts[k]);

/**
 * Choices each starting face leaves out, so the editor and Shuffle offer only what suits it. The woman keeps
 * the long styles, the hijab and the hats, with no facial hair; the man keeps the short cuts, bald, long
 * dreads, the afro, the turban and the hats. Avataaars draws "shaved sides" as a long style with one side shaved.
 */
const HIDDEN: Record<Settings['avatarBase'], Partial<Record<string, string[]>>> = {
  girl: {
    top: ['none', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'shortFlat', 'shortRound', 'shortWaved', 'shortCurly', 'frizzle', 'shaggy', 'shaggyMullet', 'dreads01', 'dreads02', 'turban'],
    facialHair: ['beardLight', 'beardMedium', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'],
  },
  boy: {
    top: ['bob', 'bun', 'curly', 'curvy', 'bigHair', 'longButNotTooLong', 'straight01', 'straight02', 'straightAndStrand', 'miaWallace', 'frida', 'froBand', 'shavedSides', 'hijab', 'winterHat04'],
  },
};

/** A part's choices for this face. */
export const choicesFor = (p: AvatarPart, base: Settings['avatarBase']) => p.choices.filter((c) => !HIDDEN[base][p.key]?.includes(c));

/** The parts this face can change: a part left with one choice (facial hair on the woman) is not offered. */
export const partsFor = (base: Settings['avatarBase']) => AVATAR_PARTS.filter((p) => choicesFor(p, base).length > 1);

/** What a part shows: her choice when it still suits this face (old styles stored other names), else the face's own. */
export function partValue(who: Who, p: AvatarPart): string {
  const v = who.avatarParts[p.key];
  return v !== undefined && choicesFor(p, who.avatarBase).includes(v) ? v : AVATAR_BASES[who.avatarBase].parts[p.key];
}

// Drawn faces by base and parts. The editor's strips draw about 80 small faces; reopening them costs nothing.
// ponytail: unbounded, but one person makes at most a few hundred faces in a session.
const drawn = new Map<string, string>();

// The Avataaars renderer is most of a megabyte of drawings, so it loads on first use instead of with the app.
type Draw = (options: Record<string, unknown>) => string;
let renderer: Promise<Draw> | undefined;
const loadRenderer = () =>
  (renderer ??= Promise.all([import('@dicebear/core'), import('@dicebear/avataaars')]).then(
    ([core, style]) => (options) => core.createAvatar(style, options).toDataUri(),
  ));

function optionsFor(who: Who): Record<string, unknown> {
  const options: Record<string, unknown> = { seed: 'LET', backgroundColor: ['transparent'] };
  for (const p of AVATAR_PARTS) {
    const v = partValue(who, p);
    if (p.choices[0] === 'none') options[`${p.key}Probability`] = v === 'none' ? 0 : 100;
    if (v !== 'none') options[p.key] = [v];
  }
  options.facialHairColor = options.hairColor;
  return options;
}

/** The reviewer's face. Decorative, so her name sits beside it in text. A blank disc holds its place while the
    renderer loads the first time. */
export function Avatar({ who, size = 32 }: { who: Who; size?: number }) {
  const parts = JSON.stringify(who.avatarParts);
  const key = `${who.avatarBase} ${parts}`;
  const [src, setSrc] = useState(() => drawn.get(key));
  useEffect(() => {
    const hit = drawn.get(key);
    if (hit) return setSrc(hit);
    let live = true;
    const options = optionsFor({ avatarBase: who.avatarBase, avatarParts: JSON.parse(parts) });
    loadRenderer().then((draw) => {
      const uri = drawn.get(key) ?? draw(options);
      drawn.set(key, uri);
      if (live) setSrc(uri);
    });
    return () => {
      live = false;
    };
  }, [key, who.avatarBase, parts]);
  return src ? (
    <img className="avatar" src={src} width={size} height={size} alt="" />
  ) : (
    <span className="avatar" style={{ display: 'inline-block', width: size, height: size }} />
  );
}
