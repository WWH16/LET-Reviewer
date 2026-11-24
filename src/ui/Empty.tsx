import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * A screen or list with nothing in it yet: what belongs here, why it is empty, and the way to fill it.
 * `children` are the actions.
 */
export function Empty({ icon, title, children, text }: { icon: IconName; title: string; text: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="mode-icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <div className="stack-sm">
        <h2>{title}</h2>
        <p className="meta">{text}</p>
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
