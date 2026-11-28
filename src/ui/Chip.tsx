import type { ReactNode } from 'react';

/** A small tag beside a row, such as a mock's form (Digital, Printed): a cream pill in small capitals. */
export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}
