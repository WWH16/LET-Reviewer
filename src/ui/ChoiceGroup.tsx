import { Icon } from './Icon';

export interface ChoiceItem {
  key: string;
  text: string;
}

interface Props {
  name: string;
  /** Id of the element holding the question stem. It labels the group. */
  labelledBy: string;
  describedBy?: string;
  lang?: string;
  choices: ChoiceItem[];
  value: string | null;
  onChange?: (key: string) => void;
  /** After "Check answer": radios are disabled and the answer is revealed. */
  locked?: boolean;
  correct?: string | null;
  disabled?: boolean;
  eliminated?: ReadonlySet<string>;
  onToggleEliminate?: (key: string) => void;
}

/**
 * Answer choices as a native radio group inside a fieldset (a11y C1).
 * Arrow keys, "B, 2 of 4", and the checked state come from the browser.
 * Results are shown with inversion, icons, and words, never color (a11y C2, plan §13).
 */
export function ChoiceGroup(p: Props) {
  return (
    <fieldset aria-labelledby={p.labelledBy} aria-describedby={p.describedBy} lang={p.lang}>
      <div className="choices">
        {p.choices.map((c) => {
          const checked = p.value === c.key;
          const isCorrect = !!p.locked && p.correct === c.key;
          const isWrong = !!p.locked && checked && p.correct !== c.key;
          const isEliminated = !!p.eliminated?.has(c.key);
          const cls = ['choice', isCorrect && 'is-correct', isWrong && 'is-wrong', isEliminated && 'is-eliminated']
            .filter(Boolean)
            .join(' ');
          return (
            <div className="choice-row" key={c.key}>
              <label className={cls}>
                <input
                  type="radio"
                  name={p.name}
                  value={c.key}
                  checked={checked}
                  disabled={p.locked || p.disabled}
                  onChange={() => p.onChange?.(c.key)}
                />
                <span className="choice-letter" aria-hidden="true">
                  {isCorrect ? <Icon name="check" size={14} /> : isWrong ? <Icon name="cross" size={14} /> : c.key}
                </span>
                <span className="choice-text">
                  <span>
                    <span className="sr-only">{c.key}. </span>
                    {c.text}
                  </span>
                  {isCorrect && <span className="choice-note">Correct answer</span>}
                  {isWrong && <span className="choice-note">Your answer</span>}
                  {isEliminated && !isCorrect && <span className="choice-note">Eliminated</span>}
                </span>
              </label>
              {p.onToggleEliminate && !p.locked && (
                <button
                  type="button"
                  className="btn eliminate"
                  aria-pressed={isEliminated}
                  aria-label={`Eliminate choice ${c.key}`}
                  title={`Eliminate choice ${c.key}`}
                  onClick={() => p.onToggleEliminate?.(c.key)}
                >
                  <Icon name="strike" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
