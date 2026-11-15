import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Chip({ icon, solid, children }: { icon?: IconName; solid?: boolean; children: ReactNode }) {
  return (
    <span className={solid ? 'chip chip-solid' : 'chip'}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

const STATUS: Record<string, { label: string; icon: IconName }> = {
  verified: { label: 'Verified', icon: 'check' },
  unverified: { label: 'Unverified', icon: 'alert' },
  'needs-key': { label: 'Needs key', icon: 'key' },
  flagged: { label: 'Flagged', icon: 'flag' },
};

/** Text chip for a question's status. Never a colored dot alone (a11y R10). */
export function StatusChip({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, icon: 'alert' as IconName };
  return <Chip icon={s.icon}>{s.label}</Chip>;
}
