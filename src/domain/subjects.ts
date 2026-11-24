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
let topicNames = new Map<string, string>();
export function setSubjectNames(subjects: Subjects) {
  const all = Object.values(subjects).flat();
  names = new Map(all.map((s): [string, string] => [s.id, s.name]));
  topicNames = new Map(all.flatMap((s) => (s.topics ?? []).map((t): [string, string] => [`${s.id}/${t.id}`, t.name])));
}

/** Major is her specialization, so what sits inside it is called a topic; Gen Ed and Prof Ed hold subjects. */
export const itemWord = (area: Area) => (area === 'Major' ? 'topic' : 'subject');

/** A topic's name inside its subject. */
export const topicName = (subarea: string, topicId: string): string => topicNames.get(`${subarea}/${topicId}`) ?? readable(topicId);

/** What a question is about inside its subject: her topic's name, else the topic Claude wrote. */
export const topicOf = (q: { subarea: string; topic: string; topicId?: string }) => (q.topicId ? topicName(q.subarea, q.topicId) : q.topic);

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
