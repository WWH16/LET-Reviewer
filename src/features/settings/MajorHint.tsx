import { Link } from 'react-router-dom';
import type { Level } from '../../domain/types';

/** Major is a part of the Secondary LET only. Where it is hidden, say how to turn it on. */
export function MajorHint({ level }: { level: Level }) {
  if (level === 'secondary') return null;
  return (
    <p className="meta">
      Taking a major? Your major and its topics show up once your level is Secondary.{' '}
      <Link to="/settings/exam" state={{ focus: 's-level' }}>
        Set your level and major
      </Link>
      .
    </p>
  );
}
