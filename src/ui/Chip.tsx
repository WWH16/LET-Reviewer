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

const STATUS: Record<string, { label: string; icon: IconName; tone: Tone }> = {
  verified: { label: 'Verified', icon: 'check', tone: 'success' },
  unverified: { label: 'Unverified', icon: 'alert', tone: 'secondary' },
  'needs-key': { label: 'Needs key', icon: 'key', tone: 'secondary' },
  flagged: { label: 'Flagged', icon: 'flag', tone: 'secondary' },
};

/** Text badge for a question's status. Never a colored dot alone (a11y R10). */
export function StatusChip({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, icon: 'alert' as IconName, tone: 'secondary' as Tone };
  return (
    <Chip icon={s.icon} tone={s.tone}>
      {s.label}
    </Chip>
  );
}
