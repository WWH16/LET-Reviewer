import { useEffect, useRef, type ReactNode } from 'react';

/**
 * One screen. Sets the tab title and moves focus to the heading when the screen opens,
 * so keyboard and screen-reader users land at the top of the new content.
 */
export function Page({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · LET Reviewer`;
    heading.current?.focus();
  }, [title]);
  return (
    <main id="main" className={wide ? 'wide' : undefined}>
      <div className="stack-lg">
        <h1 ref={heading} tabIndex={-1}>
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
