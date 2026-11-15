// Line icons, 1.5 px stroke, drawn in the current text color. Always decorative:
// every icon sits next to words that say the same thing.

const PATHS = {
  check: 'M4.5 12.5l4.5 4.5L19.5 6.5',
  cross: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  flag: 'M6 21V4.5h10.5l-2 3.75 2 3.75H6',
  alert: 'M12 8.5v4.5M12 16v.5M3 19.5L12 4l9 15.5z',
  key: 'M14.5 9.5a4 4 0 11-8 0 4 4 0 018 0zM13.5 12.5l7 7M17.5 16.5l2-2',
  strike: 'M4 12h16',
  clock: 'M12 7.5V12l3 2M20.5 12a8.5 8.5 0 11-17 0 8.5 8.5 0 0117 0z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  copy: 'M8.5 8.5h11v11h-11zM5.5 15.5h-1v-11h11v1',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
