import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';

/**
 * One screen. Sets the tab title and moves focus to the heading when the screen opens,
 * so keyboard and screen-reader users land at the top of the new content.
 * A screen still loading passes `null` children and gets a skeleton.
 * `titleHidden` keeps the h1 for screen readers but hides it where the screen's first
 * block already says where you are (the Home greeting, the quiz bar).
 * `crumbs` are the screens above this one, top first, shown as a breadcrumb trail over the title.
 */
export function Page({
  title,
  wide,
  titleHidden,
  crumbs,
  children,
}: {
  title: string;
  wide?: boolean;
  titleHidden?: boolean;
  crumbs?: { to: string; label: string }[];
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · LET Prep`;
    heading.current?.focus();
  }, [title]);
  return (
    <main id="main" className={wide ? 'wide' : undefined}>
      <div className="stack-lg">
        {crumbs && (
          <>
            {/* Phones and tablets: one back link to the nearest parent, a left chevron as on iOS and Android.
                Wide screens keep the full trail, the web's own convention. */}
            <Link className="back-link only-narrow" to={crumbs[crumbs.length - 1].to} aria-label={`Back to ${crumbs[crumbs.length - 1].label}`}>
              <Icon name="caret" size={18} />
              {crumbs[crumbs.length - 1].label}
            </Link>
            <nav className="back only-wide" aria-label="Breadcrumb">
              <ol>
                {crumbs.map((c) => (
                  <li key={c.to}>
                    <Link to={c.to}>{c.label}</Link>
                    <Icon name="caret" size={14} />
                  </li>
                ))}
              </ol>
            </nav>
          </>
        )}
        <h1 ref={heading} tabIndex={-1} className={titleHidden ? 'sr-only' : undefined}>
          {title}
        </h1>
        {children ?? <Skeleton />}
      </div>
    </main>
  );
}
