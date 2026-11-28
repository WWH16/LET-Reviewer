import { useEffect, useRef, useState, type ReactNode } from 'react';
import { saveSettings } from '../../db/repo';
import type { Settings } from '../../domain/types';
import { AVATAR_BASES, AVATAR_PARTS, Avatar, BASE_KEYS, choicesFor, partValue, partsFor, type AvatarPart } from '../../ui/Avatar';
import { useAnnounce } from '../../ui/Status';
import { btn } from '../../ui/btn';

const TOP_COLOURS = ['skinColor', 'hairColor'];
/** Parts too small to judge on a whole-body thumbnail: their strip zooms in on the face. */
const FACE_PARTS = ['eyebrows', 'eyes', 'mouth', 'accessories', 'facialHair'];
/** Her choices to carry over to another face: not the parts the faces differ in, and only what suits the new face. */
const carryOver = (parts: Record<string, string>, base: Settings['avatarBase']) =>
  Object.fromEntries(
    Object.entries(parts).filter(([k, v]) => {
      const p = AVATAR_PARTS.find((x) => x.key === k);
      return !BASE_KEYS.includes(k) && p !== undefined && choicesFor(p, base).includes(v);
    }),
  );

/**
 * Name and avatar, shared by the welcome screen and Settings. The avatar is shown large, starts from a
 * woman or man face, and every part can be changed from there. Each change is saved at once.
 * `footer` sits at the end of the fields column (the welcome screen's Start reviewing).
 */
export function ProfileEditor({ s, footer }: { s: Settings; footer?: ReactNode }) {
  const announce = useAnnounce();
  const [partsOpen, setPartsOpen] = useState(false);
  const strips = useRef<HTMLDivElement>(null);
  /** Shuffle and reset replace the whole face at once, so they offer the app's usual Undo. */
  const replaceFace = (avatarParts: Record<string, string>, said: string) => {
    const before = s.avatarParts;
    saveSettings({ avatarParts });
    announce(said, () => saveSettings({ avatarParts: before }));
  };
  const setPart = (key: string, value: string) => saveSettings({ avatarParts: { ...s.avatarParts, [key]: value } });

  // Opening the parts brings each strip's chosen option into view (hair has 34).
  useEffect(() => {
    if (!partsOpen) return;
    strips.current?.querySelectorAll<HTMLElement>('.part-strip').forEach((strip) => {
      const chosen = strip.querySelector<HTMLElement>('input:checked')?.closest('label');
      if (chosen) strip.scrollLeft = chosen.offsetLeft - (strip.clientWidth - chosen.offsetWidth) / 2;
    });
  }, [partsOpen]);

  /** The group's name, then the chosen option in words (hidden from screen readers: the checked radio says it). */
  const legend = (p: AvatarPart) => (
    <legend className="label">
      {p.label}
      <span className="legend-value" aria-hidden="true">
        {p.names[partValue(s, p)]}
      </span>
    </legend>
  );

  const swatches = (p: AvatarPart) => (
    <fieldset key={p.key} className="stack-sm">
      {legend(p)}
      <div className="swatches">
        {choicesFor(p, s.avatarBase).map((c) => (
          <label key={c} className="swatch" title={p.names[c]}>
            <input
              type="radio"
              name={p.key}
              className="sr-only"
              aria-label={p.names[c]}
              checked={partValue(s, p) === c}
              onChange={() => setPart(p.key, c)}
            />
            <span style={{ background: `#${c}` }} />
          </label>
        ))}
      </div>
    </fieldset>
  );

  // Thumbnails share her colours but not her other parts, so changing her eyes does not redraw every hair option.
  const colours = Object.fromEntries(AVATAR_PARTS.filter((p) => p.colour).map((p) => [p.key, partValue(s, p)]));

  /** One part as a row of small faces, each drawn with that one option, so she compares by looking. */
  const strip = (p: AvatarPart) => (
    <fieldset key={p.key} className="stack-sm">
      {legend(p)}
      <div className="part-strip">
        {choicesFor(p, s.avatarBase).map((c) => (
          <label key={c} className="part-option">
            <input type="radio" name={`part-${p.key}`} className="sr-only" checked={partValue(s, p) === c} onChange={() => setPart(p.key, c)} />
            <span className={FACE_PARTS.includes(p.key) ? 'part-thumb face' : 'part-thumb'}>
              <Avatar who={{ avatarBase: s.avatarBase, avatarParts: { ...colours, [p.key]: c } }} size={56} />
            </span>
            {p.names[c]}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="profile">
      <div className="profile-face">
        <Avatar who={s} size={208} />
        <div className="row">
          <button
            type="button"
            className={btn.secondary}
            onClick={() =>
              replaceFace(
                {
                  ...Object.fromEntries(
                    AVATAR_PARTS.map((p) => {
                      const choices = choicesFor(p, s.avatarBase);
                      return [p.key, choices[Math.floor(Math.random() * choices.length)]];
                    }),
                  ),
                  // Skin tone stays: shuffling it would change who she is, not how she looks today.
                  skinColor: partValue(s, AVATAR_PARTS[0]),
                },
                'Avatar shuffled',
              )
            }
          >
            Shuffle
          </button>
          {Object.keys(s.avatarParts).length > 0 && (
            <button type="button" className={btn.quiet} onClick={() => replaceFace({}, 'Avatar reset to the starting face')}>
              Back to default
            </button>
          )}
        </div>
      </div>

      <div className="stack profile-fields">
        <div className="field">
          <label htmlFor="s-name">Name</label>
          <input
            id="s-name"
            type="text"
            autoComplete="given-name"
            maxLength={40}
            aria-describedby="s-name-hint"
            value={s.name}
            onChange={(e) => saveSettings({ name: e.target.value })}
          />
          <p id="s-name-hint" className="muted">
            Study greets you by this name, with LPT after it.
          </p>
        </div>
        <fieldset className="stack-sm">
          <legend className="label">Start from</legend>
          <div className="row">
            {(Object.keys(AVATAR_BASES) as Settings['avatarBase'][]).map((b) => {
              // Only the hair and clothes that make the face change, and anything that does not suit the new face
              // (a beard on the woman): her skin tone, glasses and colours stay.
              const parts = carryOver(s.avatarParts, b);
              return (
                <label key={b} className="avatar-pick">
                  <input type="radio" name="avatar-base" className="sr-only" checked={s.avatarBase === b} onChange={() => saveSettings({ avatarBase: b, avatarParts: parts })} />
                  <Avatar who={{ avatarBase: b, avatarParts: parts }} size={56} />
                  {AVATAR_BASES[b].label}
                </label>
              );
            })}
          </div>
        </fieldset>
        {AVATAR_PARTS.filter((p) => TOP_COLOURS.includes(p.key)).map(swatches)}
        <details onToggle={(e) => setPartsOpen(e.currentTarget.open)}>
          <summary className="label">Change hair, eyes and other parts</summary>
          {/* Drawn only while open: every option is its own small avatar. */}
          {partsOpen && (
            <div ref={strips} className="stack part-strips">
              {partsFor(s.avatarBase).filter((p) => !TOP_COLOURS.includes(p.key)).map((p) => (p.colour ? swatches(p) : strip(p)))}
            </div>
          )}
        </details>
        {footer}
      </div>
    </div>
  );
}
