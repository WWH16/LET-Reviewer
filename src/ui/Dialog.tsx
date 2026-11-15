import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Native modal dialog (a11y C8). The background is inert, Escape closes it,
 * and focus returns to whatever opened it. The element marked `data-autofocus`
 * gets focus first, so put that on the safe action.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.showModal();
      d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={() => {
        onClose();
        opener.current?.focus();
      }}
    >
      {open && (
        <div className="stack">
          <h2 id={id}>{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
