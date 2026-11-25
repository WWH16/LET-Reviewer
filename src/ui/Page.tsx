import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';

/**
 * One screen. Sets the tab title and moves focus to the heading when the screen opens,
 * so keyboard and screen-reader users land at the top of the new content.
 * A screen still loading passes `null` children and gets a skeleton.
 * `titleHidden` keeps the h1 for screen readers but hides it where the screen's first
 * block already says where you are (the Study greeting, the quiz bar).
 * `back` puts a way up above the title on a screen reached from a tab (a quiz mode, an import).
 */
export function Page({
  title,
  wide,
  titleHidden,
  back,
  children,
}: {
  title: string;
  wide?: boolean;
  titleHidden?: boolean;
  back?: { to: string; label: string };
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
        {back && (
          <Link className="back" to={back.to}>
            <Icon name="caret" size={16} />
            {back.label}
          </Link>
        )}
        <h1 ref={heading} tabIndex={-1} className={titleHidden ? 'sr-only' : undefined}>
          {title}
        </h1>
        {children ?? <Skeleton />}
      </div>
    </main>
  );
}
