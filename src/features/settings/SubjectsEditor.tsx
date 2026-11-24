import { useState, type FormEvent } from 'react';
import { useQuestionMap } from '../../db/hooks';
import { saveSettings } from '../../db/repo';
import { PARTS, partsFor } from '../../domain/let-config';
import { counts } from '../../domain/quiz';
import { subjectId, subjectsOf } from '../../domain/subjects';
import type { Area, Settings, Subject } from '../../domain/types';
import { btn } from '../../ui/btn';

/**
 * Her subjects in each part: add, rename, remove. Renaming keeps the subject's id, so its quizzes stay with it.
 * A subject that still has quizzes cannot be removed, so no question is left without one.
 */
export function SubjectsEditor({ s }: { s: Settings }) {
  const qmap = useQuestionMap();
  const [draft, setDraft] = useState<Partial<Record<Area, string>>>({});
  const [error, setError] = useState<{ area: Area; text: string } | null>(null);
  if (!qmap) return null;

  const save = (area: Area, list: Subject[]) => saveSettings({ subjects: { ...s.subjects, [area]: list } });

  return (
    <>
      <p className="muted">
        Name the subjects in each part. Quizzes, mock exams, Missed questions and Stats all use this list.
      </p>
      {partsFor(s.level).map((area) => {
        const list = subjectsOf(area, s.subjects, qmap.values());
        const used = new Map<string, number>();
        for (const q of qmap.values()) if (q.area === area && counts(q)) used.set(q.subarea, (used.get(q.subarea) ?? 0) + 1);

        const add = (e: FormEvent) => {
          e.preventDefault();
          const name = (draft[area] ?? '').trim();
          if (!name) return;
          if (list.some((x) => x.name.toLowerCase() === name.toLowerCase())) return setError({ area, text: `${name} is already in ${PARTS[area].name}.` });
          setError(null);
          setDraft({ ...draft, [area]: '' });
          save(area, [...list, { id: subjectId(name, new Set(list.map((x) => x.id))), name }]);
        };
        const rename = (id: string, name: string) => {
          const clean = name.trim();
          if (!clean || list.some((x) => x.id !== id && x.name.toLowerCase() === clean.toLowerCase())) return;
          save(area, list.map((x) => (x.id === id ? { ...x, name: clean } : x)));
        };

        return (
          <section key={area} className="tile stack-sm" aria-labelledby={`sj-${area}`}>
            <h2 id={`sj-${area}`}>{PARTS[area].name}</h2>
            {list.length === 0 && <p className="meta">No subjects yet.</p>}
            <ul className="list">
              {list.map((x) => {
                const n = used.get(x.id) ?? 0;
                return (
                  <li key={x.id} className="spread">
                    {/* Saved when she leaves the field, so a half-typed name never renames anything. */}
                    <input
                      key={x.name}
                      type="text"
                      aria-label={`Name of ${x.name}`}
                      defaultValue={x.name}
                      onBlur={(e) => rename(x.id, e.target.value)}
                    />
                    <span className="row">
                      <span className="meta">{n ? `${n} question${n === 1 ? '' : 's'}` : 'No quizzes'}</span>
                      <button
                        type="button"
                        className={btn.quiet}
                        disabled={n > 0}
                        title={n > 0 ? 'Remove its quizzes first' : undefined}
                        aria-label={`Remove ${x.name}`}
                        onClick={() => save(area, list.filter((y) => y.id !== x.id))}
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <form className="row" onSubmit={add}>
              <label className="sr-only" htmlFor={`sj-new-${area}`}>
                New subject in {PARTS[area].name}
              </label>
              <input
                id={`sj-new-${area}`}
                type="text"
                placeholder="New subject, e.g. English"
                value={draft[area] ?? ''}
                onChange={(e) => setDraft({ ...draft, [area]: e.target.value })}
              />
              <button type="submit" className={btn.secondary} disabled={!(draft[area] ?? '').trim()}>
                Add
              </button>
            </form>
            {error?.area === area && <p role="alert">{error.text}</p>}
          </section>
        );
      })}
    </>
  );
}
