// Phosphor icons, Kumo's icon set, drawn in the current text color. Always decorative:
// every icon sits next to words that say the same thing.
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  ExamIcon,
  FlagIcon,
  GearSixIcon,
  HouseIcon,
  KeyIcon,
  StackIcon,
  TextStrikethroughIcon,
  WarningIcon,
  XIcon,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

const ICONS = {
  check: CheckIcon,
  cross: XIcon,
  flag: FlagIcon,
  alert: WarningIcon,
  key: KeyIcon,
  strike: TextStrikethroughIcon,
  clock: ClockIcon,
  arrow: ArrowRightIcon,
  copy: CopyIcon,
  home: HouseIcon,
  practice: BookOpenTextIcon,
  mock: ExamIcon,
  progress: ChartBarIcon,
  bank: StackIcon,
  settings: GearSixIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const Glyph = ICONS[name];
  return <Glyph aria-hidden="true" focusable="false" size={size} />;
}
