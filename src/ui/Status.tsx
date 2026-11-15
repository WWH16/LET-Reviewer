import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const Ctx = createContext<(message: string) => void>(() => {});

/**
 * One persistent status region for short confirmations ("Imported 48 items").
 * It stays in the DOM so screen readers always hear it (a11y R8).
 * Messages stay at least 5 seconds. Errors are never sent here: they are shown inline.
 */
export function StatusProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const announce = useCallback((m: string) => {
    window.clearTimeout(timer.current);
    setMessage('');
    // A fresh write makes screen readers repeat an identical message.
    requestAnimationFrame(() => setMessage(m));
    timer.current = window.setTimeout(() => setMessage(''), 6000);
  }, []);
  return (
    <Ctx.Provider value={announce}>
      {children}
      <div className="toast" role="status" aria-live="polite">
        {message}
      </div>
    </Ctx.Provider>
  );
}

export const useAnnounce = () => useContext(Ctx);
