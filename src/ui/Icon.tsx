// Phosphor icons, Kumo's icon set, drawn in the current text color. Always decorative:
// every icon sits next to words that say the same thing.
import {
  ArrowCounterClockwiseIcon,
  BookOpenIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  BookOpenTextIcon,
  CalendarBlankIcon,
  CheckIcon,
  ClockIcon,
  ExamIcon,
  FireIcon,
  FlagIcon,
  GearSixIcon,
  LightningIcon,
  ListChecksIcon,
  TargetIcon,
  TextStrikethroughIcon,
  TimerIcon,
  WarningIcon,
  XIcon,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

const ICONS = {
  check: CheckIcon,
  cross: XIcon,
  flag: FlagIcon,
  alert: WarningIcon,
  strike: TextStrikethroughIcon,
  clock: ClockIcon,
  practice: BookOpenTextIcon,
  mock: ExamIcon,
  settings: GearSixIcon,
  fire: FireIcon,
  calendar: CalendarBlankIcon,
  // tabs
  study: BookOpenIcon,
  stats: ChartLineUpIcon,
  review: ListChecksIcon,
  // Study tiles
  lightning: LightningIcon,
  retry: ArrowCounterClockwiseIcon,
  target: TargetIcon,
  timer: TimerIcon,
  caret: CaretRightIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

/** `filled` draws the solid cut of the icon (a done day, a flag that is set). */
export function Icon({ name, size = 16, filled }: { name: IconName; size?: number; filled?: boolean }) {
  const Glyph = ICONS[name];
  return <Glyph aria-hidden="true" focusable="false" size={size} weight={filled ? 'fill' : 'regular'} />;
}
