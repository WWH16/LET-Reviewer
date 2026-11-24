// LET facts the app encodes (plan §3).
//
// The subjects inside each part are hers to name (Settings, Subjects; `subjects.ts`).

import type { Area, Level, TimerSetting } from './types';

export interface PartConfig {
  area: Area;
  name: string;
  items: number;
  minutes: number;
}

export const PARTS: Record<Area, PartConfig> = {
  GenEd: {
    area: 'GenEd',
    name: 'General Education',
    items: 150,
    minutes: 120,
  },
  ProfEd: {
    area: 'ProfEd',
    name: 'Professional Education',
    items: 150,
    minutes: 180,
  },
  Major: {
    area: 'Major',
    name: 'Specialization',
    items: 150, // 120 for Math, 100 for TVTEd (plan §3)
    minutes: 210,
  },
};

/** Part weights for the rating (plan §3). */
export const LEVEL_WEIGHTS: Record<Level, Partial<Record<Area, number>>> = {
  elementary: { GenEd: 0.4, ProfEd: 0.6 },
  secondary: { GenEd: 0.2, ProfEd: 0.4, Major: 0.4 },
};

export const PASSING_AVERAGE = 75;
export const PART_FLOOR = 50;

export const partsFor = (level: Level): Area[] => Object.keys(LEVEL_WEIGHTS[level]) as Area[];

/** Kept here for the screens that already import it; the names live in `subjects.ts`. */
export { subareaName } from './subjects';

/** Real LET time per item, in ms (2 h / 150 items = 48 s for GenEd). */
export const paceMs = (area: Area) => (PARTS[area].minutes * 60000) / PARTS[area].items;

/** Minutes allowed for an n-item exam, scaled from the real LET time and the timer setting. */
export function timeLimit(area: Area, timer: TimerSetting, n: number): number | null {
  if (timer === 'off') return null;
  const base = (PARTS[area].minutes * n) / PARTS[area].items;
  return Math.round(base * (timer === 'real' ? 1 : Number(timer)));
}
