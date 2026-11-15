import { useEffect, useRef, type ReactNode } from 'react';

/**
 * One screen. Sets the tab title and moves focus to the heading when the screen opens,
 * so keyboard and screen-reader users land at the top of the new content.
 * `titleHidden` keeps the h1 for screen readers but hides it where the screen's first
 * block already says where you are (Home's tray, a practice question).
 */
export function Page({
  title,
  wide,
  titleHidden,
  children,
}: {
  title: string;
  wide?: boolean;
  titleHidden?: boolean;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · LET Reviewer`;
    heading.current?.focus();
  }, [title]);
  return (
    <main id="main" className={wide ? 'wide' : undefined}>
      <div className="stack-lg">
        <h1 ref={heading} tabIndex={-1} className={titleHidden ? 'sr-only' : undefined}>
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
