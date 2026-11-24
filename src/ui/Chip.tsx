import type { ReactNode } from 'react';
import { Badge } from '@cloudflare/kumo/components/badge';

/** A small neutral label beside a row, such as a mock's form (Digital, Printed). */
export function Chip({ children }: { children: ReactNode }) {
  return <Badge variant="secondary">{children}</Badge>;
}
