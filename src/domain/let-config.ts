// LET facts the app encodes (plan §3).
//
// PLACEHOLDER WARNING: the sub-area lists and their weights below are stand-ins with
// equal weights. Replace them with the review center's coverage and the current TOS
// (BPT Res. No. 11, s. 2025) once the user confirms her level and major (plan §12, q. 1–3).
// Changing a display `name` is safe. Never change an `id` once questions use it.

import type { Area, Level, TimerSetting } from './types';

export interface SubArea {
  /** Stable id stored on questions. */
  id: string;
  /** Display name. Safe to rename. */
  name: string;
  /** Share of the part's items, any positive number. Normalized when drawing an exam. */
  weight: number;
}

export interface PartConfig {
  area: Area;
  name: string;
  items: number;
  minutes: number;
  subareas: SubArea[];
}

const sub = (name: string, weight = 1): SubArea => ({
  id: name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  name,
  weight,
});

export const PARTS: Record<Area, PartConfig> = {
  GenEd: {
    area: 'GenEd',
    name: 'General Education',
    items: 150,
    minutes: 120,
    subareas: [
      sub('English'),
      sub('Filipino'),
      sub('Mathematics'),
      sub('Science'),
      sub('Social Science'),
      sub('Philippine History'),
      sub('Information and Communication Technology'),
      sub('Literature'),
      sub('Ethics'),
      sub('Contemporary Issues'),
    ],
  },
  ProfEd: {
    area: 'ProfEd',
    name: 'Professional Education',
    items: 150,
    minutes: 180,
    subareas: [
      sub('Foundations of Education'),
      sub('The Teaching Profession'),
      sub('Child and Adolescent Development'),
      sub('Facilitating Learning'),
      sub('Principles of Teaching'),
      sub('Curriculum Development'),
      sub('Assessment of Learning'),
      sub('Educational Technology'),
      sub('Social Dimensions of Education'),
    ],
  },
  Major: {
    area: 'Major',
    name: 'Specialization',
    items: 150, // 120 for Math, 100 for TVTEd (plan §3)
    minutes: 210,
    subareas: [sub('Specialization')],
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

export function subareaName(id: string): string {
  for (const p of Object.values(PARTS)) {
    const s = p.subareas.find((x) => x.id === id);
    if (s) return s.name;
  }
  return id;
}

export function timeLimit(area: Area, timer: TimerSetting, half: boolean): number | null {
  if (timer === 'off') return null;
  const base = PARTS[area].minutes * (half ? 0.5 : 1);
  return Math.round(base * (timer === 'real' ? 1 : Number(timer)));
}
