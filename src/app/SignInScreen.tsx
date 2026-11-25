import type { CSSProperties } from 'react';
import { AccountSection } from '../features/settings/AccountSection';
import { Avatar } from '../ui/Avatar';
import type { Settings } from '../domain/types';

type Who = Pick<Settings, 'avatarBase' | 'avatarParts'>;
const cheer = { eyes: 'happy', mouth: 'smile', eyebrows: 'raisedExcitedNatural' };

// A crowd of future LPTs cheering, drawn with the same Avataaars parts she builds her own face from in Welcome.
// Listed from the centre out, so a narrow screen keeps the middle of the crowd.
const CROWD: Who[] = [
  { avatarBase: 'girl', avatarParts: { ...cheer, skinColor: 'd08b5b', top: 'hijab', clothing: 'blazerAndShirt', clothesColor: '25557c' } },
  { avatarBase: 'boy', avatarParts: { ...cheer, skinColor: 'ae5d29', top: 'shortCurly', accessories: 'round', clothing: 'collarAndSweater', clothesColor: 'ff5c5c' } },
  { avatarBase: 'girl', avatarParts: { ...cheer, skinColor: 'edb98a', top: 'bun', clothing: 'shirtScoopNeck', clothesColor: 'a7ffc4' } },
  { avatarBase: 'boy', avatarParts: { ...cheer, skinColor: 'ffdbb4', top: 'theCaesarAndSidePart', clothing: 'blazerAndSweater', clothesColor: '262e33' } },
  { avatarBase: 'girl', avatarParts: { ...cheer, skinColor: '614335', top: 'curly', accessories: 'prescription02', clothing: 'hoodie', clothesColor: 'ffafb9' } },
  { avatarBase: 'boy', avatarParts: { ...cheer, skinColor: 'd08b5b', top: 'shortWaved', facialHair: 'beardLight', clothing: 'shirtVNeck', clothesColor: '5199e4' } },
  { avatarBase: 'girl', avatarParts: { ...cheer, skinColor: 'edb98a', top: 'straight01', hairColor: '724133', clothing: 'overall', clothesColor: 'ffffb1' } },
  { avatarBase: 'boy', avatarParts: { ...cheer, skinColor: '614335', top: 'fro', clothing: 'hoodie', clothesColor: '3c4f5c' } },
  { avatarBase: 'girl', avatarParts: { ...cheer, skinColor: 'ffdbb4', top: 'bob', accessories: 'round', clothing: 'blazerAndSweater', clothesColor: 'ff488e' } },
  { avatarBase: 'boy', avatarParts: { ...cheer, skinColor: 'edb98a', top: 'shortFlat', accessories: 'prescription01', clothing: 'shirtCrewNeck', clothesColor: '65c9ff' } },
  { avatarBase: 'girl', avatarParts: { ...cheer, skinColor: 'ae5d29', top: 'longButNotTooLong', clothing: 'collarAndSweater', clothesColor: 'ff5c5c' } },
  { avatarBase: 'boy', avatarParts: { ...cheer, skinColor: 'ffdbb4', top: 'shaggy', hairColor: 'b58143', clothing: 'hoodie', clothesColor: 'a7ffc4' } },
  { avatarBase: 'girl', avatarParts: { ...cheer, skinColor: '614335', top: 'froBand', clothing: 'shirtVNeck', clothesColor: 'ffffb1' } },
];
// Centre out, laid left to right: odd places go left of the middle, even ones right (… 3 1 0 2 4 …).
const ROW = [...CROWD.keys()]
  .sort((a, b) => (a % 2 ? -a : a) - (b % 2 ? -b : b))
  .map((i) => CROWD[i]);
const MIDDLE = ROW.indexOf(CROWD[0]);

// Confetti: spread by the golden ratio so it scatters evenly without a random seed. Each piece falls once from
// above the screen to where it rests; the resting places are the still picture under reduced motion.
const SHAPES = ['strip', 'square', 'dot'];
const TONES = ['gold', 'ink', 'deep', 'butter'];
const CONFETTI = Array.from({ length: 72 }, (_, i) => {
  const f = (n: number) => (i * n) % 1;
  return {
    shape: SHAPES[i % 3],
    tone: TONES[i % 4],
    style: {
      '--x': `${(f(0.618034) * 100).toFixed(1)}%`,
      '--y': `${(2 + f(0.414214) * 74).toFixed(1)}vh`,
      '--turn': `${Math.round(f(0.732051) * 540 - 270)}deg`,
      '--drift': `${Math.round(f(0.236068) * 80 - 40)}px`,
      '--delay': `${Math.round(f(0.302776) * 900)}ms`,
      '--fall': `${Math.round(1900 + f(0.570796) * 1300)}ms`,
    } as CSSProperties,
  };
});

/**
 * The first screen of a build with an account service, until she signs in. The whole screen celebrates: confetti
 * comes down once across it, and a crowd of fellow reviewers cheers from a golden rise along the bottom edge,
 * behind the form. All of it is decoration, hidden from screen readers; the motion runs under five seconds and
 * not at all under reduced motion.
 */
export function SignInScreen() {
  return (
    <main id="main" className="auth">
      <div className="auth-party" aria-hidden="true">
        {CONFETTI.map((c, i) => (
          <i key={i} className={`confetti is-${c.shape} is-${c.tone}`} style={c.style} />
        ))}
        <div className="auth-rise" />
        <div className="auth-crowd">
          {ROW.map((who, i) => (
            <span key={i} className="auth-fan" style={{ '--i': Math.abs(i - MIDDLE) } as CSSProperties}>
              <Avatar who={who} size={200} />
            </span>
          ))}
        </div>
      </div>
      <div className="auth-col">
        <p className="auth-brand">
          <span className="auth-mark" aria-hidden="true" />
          LET Prep
        </p>
        <AccountSection required />
      </div>
    </main>
  );
}
