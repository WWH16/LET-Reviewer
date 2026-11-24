import type { ReactNode } from 'react';
import { Badge } from '@cloudflare/kumo/components/badge';
import { Icon, type IconName } from './Icon';

// Kumo's warning badge text is under 4.5:1, so flags stay on the neutral badge with their icon and word.
type Tone = 'secondary' | 'success';

export function Chip({ icon, solid, tone, children }: { icon?: IconName; solid?: boolean; tone?: Tone; children: ReactNode }) {
  return (
    <Badge variant={tone ?? 'secondary'} className={solid && !tone ? 'chip-accent' : undefined} icon={icon && <Icon name={icon} size={12} />}>
      {children}
    </Badge>
  );
}
