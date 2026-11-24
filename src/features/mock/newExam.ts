import { nowIso, uuid } from '../../db/repo';
import { choiceOrder } from '../../domain/choices';
import { examLabel } from '../../domain/ids';
import { PARTS, timeLimit } from '../../domain/let-config';
import type { Area, MockExam, Question, Settings } from '../../domain/types';

/** A new mock, digital or printed, with each item's choices in a fresh shuffled order. Not saved yet. */
export function newExam(o: {
  part: Area;
  form: MockExam['form'];
  itemIds: string[];
  qmap: ReadonlyMap<string, Question>;
  subjects: string[];
  paper: MockExam['paper'];
  settings: Settings;
  labels: readonly string[];
}): MockExam {
  const n = o.itemIds.length;
  const now = nowIso();
  return {
    id: uuid(),
    label: examLabel(o.part, new Date(), o.labels),
    form: o.form,
    part: o.part,
    itemIds: o.itemIds,
    orders: o.itemIds.map((id) => choiceOrder(o.qmap.get(id)!)),
    subjects: o.subjects,
    timeLimitMin: o.form === 'digital' ? timeLimit(o.part, o.settings.timer, n) : PARTS[o.part].minutes * (n / PARTS[o.part].items),
    paper: o.form === 'printed' ? o.paper : null,
    answers: {},
    answeredAt: {},
    flags: [],
    drawNote: null,
    status: o.form === 'digital' ? 'in-progress' : 'printed',
    createdAt: now,
    elapsedMs: 0,
    submittedAt: null,
    totalMin: null,
    updatedAt: now,
    deleted: false,
  };
}

/** Where an exam continues: its results, its print page, or the exam itself. */
export function examLink(e: MockExam) {
  if (e.status === 'graded') return `/mock/${e.id}/results`;
  if (e.form === 'printed') return `/mock/${e.id}/print`;
  return `/mock/${e.id}`;
}
