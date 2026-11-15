import { useRef, useState, type KeyboardEvent } from 'react';

const KEYS = ['A', 'B', 'C', 'D'];

interface Props {
  label: string;
  count: number;
  /** Item number (1-based, as a string) to the shaded key. `null` = left blank on purpose. */
  answers: Record<string, string | null | undefined>;
  onSelect: (item: number, key: string | null) => void;
  flags?: readonly number[];
  current?: number;
  /** Adds a "Blank" target per row (tap entry). */
  withBlank?: boolean;
  className?: string;
}

/**
 * The bubble answer sheet. It is one Tab stop: arrow keys move between bubbles,
 * Home and End jump to the first and last item (a11y C7, plan §8.7).
 */
export function BubbleGrid({ label, count, answers, onSelect, flags, current, withBlank, className }: Props) {
  const cols = withBlank ? [...KEYS, null] : KEYS;
  const [pos, setPos] = useState({ row: (current ?? 1) - 1, col: 0 });
  const root = useRef<HTMLDivElement>(null);
  const flagSet = new Set(flags);

  const row = Math.min(pos.row, count - 1);
  const move = (r: number, c: number) => {
    const next = { row: Math.max(0, Math.min(count - 1, r)), col: Math.max(0, Math.min(cols.length - 1, c)) };
    setPos(next);
    root.current?.querySelector<HTMLElement>(`[data-cell="${next.row}-${next.col}"]`)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, () => void> = {
      ArrowRight: () => move(row, pos.col + 1),
      ArrowLeft: () => move(row, pos.col - 1),
      ArrowDown: () => move(row + 1, pos.col),
      ArrowUp: () => move(row - 1, pos.col),
      Home: () => move(0, pos.col),
      End: () => move(count - 1, pos.col),
    };
    const f = map[e.key];
    if (f) {
      e.preventDefault();
      f();
    }
  };

  return (
    <div ref={root} role="group" aria-label={label} className={className ?? 'bubbles'} onKeyDown={onKeyDown}>
      {Array.from({ length: count }, (_, r) => {
        const n = r + 1;
        const value = answers[String(n)];
        const cls = ['bubble-row', current === n && 'is-current', flagSet.has(n) && 'is-flagged'].filter(Boolean).join(' ');
        return (
          <div className={cls} key={n} data-item={n}>
            <span className="num" aria-hidden="true">
              {n}
            </span>
            {cols.map((k, c) => (
              <button
                key={k ?? 'blank'}
                type="button"
                className={k ? 'bubble' : 'bubble bubble-blank'}
                data-cell={`${r}-${c}`}
                tabIndex={r === row && c === pos.col ? 0 : -1}
                aria-pressed={k ? value === k : value === null}
                aria-label={`Item ${n}, ${k ?? 'blank'}${flagSet.has(n) ? ', flagged' : ''}`}
                onFocus={() => setPos({ row: r, col: c })}
                onClick={() => onSelect(n, k)}
              >
                {k ?? 'Blank'}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
