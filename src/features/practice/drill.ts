import { gradable } from '../../domain/examDraw';
import type { Area, Question } from '../../domain/types';

// Kept apart from the DrillSetup screen so Study, Stats and the quiz can link to a drill without loading
// the setup screen and its select menus.

export interface DrillParams {
  area: Area;
  sub: string;
  topic: string;
  n: number;
  ai: boolean;
}

export const drillUrl = (p: DrillParams) =>
  `/session?${new URLSearchParams({ mode: 'drill', area: p.area, sub: p.sub, topic: p.topic, n: String(p.n), ai: p.ai ? '1' : '0' })}`;

export function drillMatches(q: Question, p: Pick<DrillParams, 'area' | 'sub' | 'topic' | 'ai'>) {
  return (
    gradable(q) &&
    q.area === p.area &&
    (!p.sub || q.subarea === p.sub) &&
    (!p.topic || q.topic === p.topic) &&
    (p.ai || q.source === 'review-center')
  );
}
