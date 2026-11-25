// Subjects: she names the subjects in each part herself (Settings, Subjects). A subject keeps the id it
// was given when added, so renaming it never detaches its quizzes, misses or stats.

import { slug } from './ids';
import type { Area, Subject, Subjects } from './types';

/** Names of the subjects the app listed before they were hers to set, so older questions keep a name. */
const OLD_NAMES: Record<string, string> = Object.fromEntries(
  [
    'English',
    'Filipino',
    'Mathematics',
    'Science',
    'Social Science',
    'Philippine History',
    'Information and Communication Technology',
    'Literature',
    'Ethics',
    'Contemporary Issues',
    'Foundations of Education',
    'The Teaching Profession',
    'Child and Adolescent Development',
    'Facilitating Learning',
    'Principles of Teaching',
    'Curriculum Development',
    'Assessment of Learning',
    'Educational Technology',
    'Social Dimensions of Education',
    'Specialization',
  ].map((n) => [slug(n), n]),
);

// ponytail: one module-level name table, filled from her settings each time they are read (repo.getSettings),
// so any screen can show a name without passing settings down. Make it a context if names ever need to differ per screen.
let names = new Map<string, string>();
export function setSubjectNames(subjects: Subjects) {
  names = new Map(Object.values(subjects).flatMap((list) => list.map((s): [string, string] => [s.id, s.name])));
}

/** A subject's name: hers, else the old built-in one, else its id made readable. */
export const subareaName = (id: string): string => names.get(id) ?? OLD_NAMES[id] ?? readable(id);

const readable = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replace(/-/g, ' ');

/**
 * Her subjects for a part, in her order, then any subject her questions still use that is not on her list
 * (questions from before subjects were hers), so no quiz is ever hidden.
 */
export function subjectsOf(area: Area, subjects: Subjects, used: Iterable<{ area: Area; subarea: string; deleted?: boolean }>): Subject[] {
  const list = [...subjects[area]];
  const have = new Set(list.map((s) => s.id));
  for (const q of used)
    if (q.area === area && !q.deleted && !have.has(q.subarea)) {
      have.add(q.subarea);
      list.push({ id: q.subarea, name: subareaName(q.subarea) });
    }
  return list;
}

/** A new subject's id: its name as a slug, made unique among the ids already taken. */
export function subjectId(name: string, taken: ReadonlySet<string>): string {
  const base = slug(name) || 'subject';
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}
