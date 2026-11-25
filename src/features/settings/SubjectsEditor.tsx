import { useState, type FormEvent } from 'react';
import { useQuestionMap } from '../../db/hooks';
import { saveSettings } from '../../db/repo';
import { PARTS, partsFor } from '../../domain/let-config';
import { counts } from '../../domain/quiz';
import { subjectId, subjectsOf } from '../../domain/subjects';
import type { Area, Settings, Subject } from '../../domain/types';
import { btn } from '../../ui/btn';
import { MajorHint } from './MajorHint';

/**
 * Her subjects in each part. Renaming keeps the id, so quizzes stay attached; a subject that still has
 * questions cannot be removed.
 */
export function SubjectsEditor({ s }: { s: Settings }) {
  const qmap = useQuestionMap();
  if (!qmap) return null;

  const live = [...qmap.values()].filter(counts);
  const save = (area: Area, list: Subject[]) => saveSettings({ subjects: { ...s.subjects, [area]: list } });

  return (
    <>
      <p className="muted">
        Name the subjects in each part. Quizzes, mock exams and Stats all follow this list.
      </p>
      <MajorHint level={s.level} />
      {partsFor(s.level).map((area) => {
        const list = subjectsOf(area, s.subjects, live);
        return (
          <section key={area} className="tile stack-sm" aria-labelledby={`sj-${area}`}>
            <h2 id={`sj-${area}`}>
              {PARTS[area].name}
              {area === 'Major' && s.major ? `: ${s.major}` : ''}
            </h2>
            <NameList
              id={`sj-${area}`}
              word="subject"
              items={list}
              used={(x) => live.filter((q) => q.area === area && q.subarea === x.id).length}
              onChange={(next) => save(area, next)}
            />
          </section>
        );
      })}
    </>
  );
}

/**
 * One list of names, read as plain rows: each name with its count, Rename and Remove. Rename opens a field on
 * that row only (Enter saves, Escape cancels); Remove is off while anything uses the name.
 */
function NameList({
  id,
  word,
  items,
  used,
  onChange,
}: {
  id: string;
  word: string;
  items: Subject[];
  used: (x: Subject) => number;
  onChange: (next: Subject[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const taken = (name: string, except?: string) => items.some((x) => x.id !== except && x.name.toLowerCase() === name.toLowerCase());

  const add = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (taken(name)) return setError(`${name} is already here.`);
    setError('');
    setDraft('');
    onChange([...items, { id: subjectId(name, new Set(items.map((x) => x.id))), name }]);
  };
  const rename = (e: FormEvent<HTMLFormElement>, x: Subject) => {
    e.preventDefault();
    const clean = String(new FormData(e.currentTarget).get('name') ?? '').trim();
    if (clean && clean !== x.name && taken(clean, x.id)) return setError(`${clean} is already here.`);
    setError('');
    setEditing(null);
    if (clean && clean !== x.name) onChange(items.map((y) => (y.id === x.id ? { ...y, name: clean } : y)));
  };

  return (
    <div className="stack-sm">
      {items.length === 0 && <p className="meta">No {word}s yet.</p>}
      {items.length > 0 && (
        <ul className="list">
          {items.map((x) => {
            const n = used(x);
            return (
              <li key={x.id}>
                {editing === x.id ? (
                  <form className="spread name-row" onSubmit={(e) => rename(e, x)}>
                    <input
                      name="name"
                      type="text"
                      aria-label={`New name for ${x.name}`}
                      defaultValue={x.name}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                    />
                    <span className="row">
                      <button type="submit" className={btn.secondary}>
                        Save
                      </button>
                      <button type="button" className={btn.quiet} onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </span>
                  </form>
                ) : (
                  <div className="spread name-row">
                    <span className="stack-sm">
                      <span className="subject-name">{x.name}</span>
                      <span className="meta">{n ? `${n} question${n === 1 ? '' : 's'}` : 'No quizzes yet'}</span>
                    </span>
                    <span className="row">
                      <button type="button" className={btn.quiet} aria-label={`Rename ${x.name}`} onClick={() => setEditing(x.id)}>
                        Rename
                      </button>
                      <button
                        type="button"
                        className={btn.quiet}
                        disabled={n > 0}
                        title={n > 0 ? 'Remove its quizzes first' : undefined}
                        aria-label={`Remove ${x.name}`}
                        onClick={() => onChange(items.filter((y) => y.id !== x.id))}
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form className="row" onSubmit={add}>
        <label className="sr-only" htmlFor={`${id}-new`}>
          New {word}
        </label>
        <input id={`${id}-new`} type="text" placeholder={`New ${word}`} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className={btn.secondary} disabled={!draft.trim()}>
          Add {word}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
