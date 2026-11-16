/**
 * Kumo's button classes, for links and native buttons that keep their own markup and handlers.
 * They are Kumo 2.18.1's buttonVariants() output, written out: importing buttonVariants also bundles
 * Kumo's Button, Tooltip and popup code. btn.test.ts fails if a Kumo upgrade changes them.
 * The trailing `btn` is the app's hook for the touch target and the pressed state (app.css).
 */
export const KUMO = {
  primary:
    'group flex w-max shrink-0 items-center font-medium select-none border-0 shadow-xs focus:outline-hidden focus-visible:ring-2 cursor-pointer disabled:cursor-not-allowed disabled:text-kumo-subtle h-9 gap-1.5 rounded-lg px-3 text-base leading-5 relative overflow-hidden bg-(--kumo-button-emphasis-bg) !text-white ring ring-(--kumo-button-emphasis-ring) focus:ring-(--kumo-button-emphasis-ring) focus-visible:ring-(--kumo-button-emphasis-ring) active:ring-(--kumo-button-emphasis-ring) disabled:opacity-50',
  secondary:
    'group flex w-max shrink-0 items-center font-medium select-none border-0 shadow-xs focus:ring-kumo-focus/50 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-kumo-brand cursor-pointer disabled:cursor-not-allowed disabled:text-kumo-subtle h-9 gap-1.5 rounded-lg px-3 text-base leading-5 bg-kumo-base !text-kumo-default ring not-disabled:hover:bg-kumo-tint disabled:bg-kumo-base/50 disabled:!text-kumo-default/70 ring-kumo-line data-[state=open]:bg-kumo-base',
  ghost:
    'group flex w-max shrink-0 items-center font-medium select-none border-0 focus:ring-kumo-focus/50 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-kumo-brand cursor-pointer disabled:cursor-not-allowed disabled:text-kumo-subtle h-9 gap-1.5 rounded-lg px-3 text-base leading-5 text-kumo-default hover:bg-kumo-tint shadow-none',
} as const;

export const btn = {
  // Kumo's primary forces a white label; the blue primary needs a dark label in dark mode, so it wears the secondary.
  primary: `${KUMO.secondary} btn btn-primary`,
  secondary: `${KUMO.secondary} btn`,
  quiet: `${KUMO.ghost} btn`,
};
