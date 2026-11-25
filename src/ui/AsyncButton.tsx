import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> & {
  onClick: (e: MouseEvent<HTMLButtonElement>) => unknown;
};

/** Spinner only for work slower than this, so a quick save does not flicker. */
const SLOW_MS = 150;

/**
 * Wraps work so that a call made while an earlier one is still running is dropped, not queued.
 * `onRunning` hears when a run starts and ends, also when the work fails.
 */
export function dropWhileRunning<A extends unknown[]>(work: (...args: A) => unknown, onRunning: (running: boolean) => void) {
  let running = false;
  return async (...args: A) => {
    if (running) return;
    running = true;
    onRunning(true);
    try {
      await work(...args);
    } finally {
      running = false;
      onRunning(false);
    }
  };
}

/**
 * A button whose press starts work that takes a moment: saving, loading, removing, erasing. A second press
 * while the work runs does nothing, so nothing is added or removed twice. Work slower than a blink also disables
 * the button and shows the spinner (`aria-busy`); quick work is done before either shows.
 */
export function AsyncButton({ onClick, disabled, ...rest }: Props) {
  const [running, setRunning] = useState(false);
  const [slow, setSlow] = useState(false);
  const latest = useRef(onClick);
  latest.current = onClick;
  const press = useMemo(() => dropWhileRunning((e: MouseEvent<HTMLButtonElement>) => latest.current(e), setRunning), []);

  useEffect(() => {
    if (!running) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, [running]);

  return <button type="button" {...rest} disabled={disabled || slow} aria-busy={slow || undefined} onClick={press} />;
}
