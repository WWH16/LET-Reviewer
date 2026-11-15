import { useEffect, useState } from 'react';

/**
 * Loading placeholder in the rough shape of a screen: a heading bar and a few card blocks.
 * It appears only after 200 ms, so the usual local load (a few milliseconds) never flashes it.
 */
export function Skeleton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 200);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="skeleton" aria-busy="true">
      <span className="sr-only">Loading</span>
      {show && (
        <>
          <div className="sk sk-line" />
          <div className="sk sk-card" />
          <div className="sk sk-card" />
          <div className="sk sk-card sk-short" />
        </>
      )}
    </div>
  );
}
