import { useState, type FormEvent, type ReactNode } from 'react';
import { useQuestionMap } from '../../db/hooks';
import { saveSettings } from '../../db/repo';
import { PARTS, partsFor } from '../../domain/let-config';
import { counts } from '../../domain/quiz';
import { itemWord, subjectId, subjectsOf } from '../../domain/subjects';
import type { Area, Settings, Subject } from '../../domain/types';
import { btn } from '../../ui/btn';

/**
 * Her subjects in each part, and the topics inside each Gen Ed and Prof Ed subject. In Major, her
 * specialization, the list is its topics. Renaming keeps the id, so quizzes stay attached; anything that
 * still has questions cannot be removed.
 */
export function SubjectsEditor({ s }: { s: Settings }) {
  const qmap = useQuestionMap();
  if (!qmap) return null;

  const live = [...qmap.values()].filter(counts);
  const save = (area: Area, list: Subject[]) => saveSettings({ subjects: { ...s.subjects, [area]: list } });

  return (
    <>
      <p className="muted">
        Name the subjects in General Education and Professional Education, and the topics inside any of them. Your major is
        listed by topic. Quizzes, mock exams, Missed questions and Stats all follow this list.
      </p>
      {partsFor(s.level).map((area) => {
        const list = subjectsOf(area, s.subjects, live);
        const word = itemWord(area);
        return (
          <section key={area} className="tile stack-sm" aria-labelledby={`sj-${area}`}>
            <h2 id={`sj-${area}`}>
              {PARTS[area].name}
              {area === 'Major' && s.major ? `: ${s.major}` : ''}
            </h2>
            <NameList
              id={`sj-${area}`}
              word={word}
              items={list}
              used={(x) => live.filter((q) => q.area === area && q.subarea === x.id).length}
              onChange={(next) => save(area, next)}
              inside={
                area === 'Major'
                  ? undefined
                  : (subject) => (
                      <div className="topics">
                        <NameList
                          id={`sj-${area}-${subject.id}`}
                          word="topic"
                          small
                          items={subject.topics ?? []}
                          used={(t) => live.filter((q) => q.subarea === subject.id && q.topicId === t.id).length}
                          onChange={(topics) => save(area, list.map((x) => (x.id === subject.id ? { ...x, topics } : x)))}
                        />
                      </div>
                    )
              }
            />
          </section>
        );
      })}
    </>
  );
}

/** One editable list of names: add, rename on leaving the field, remove when nothing uses it. */
function NameList({
  id,
  word,
  items,
  used,
  onChange,
  inside,
  small,
}: {
  id: string;
  word: string;
  items: Subject[];
  used: (x: Subject) => number;
  onChange: (next: Subject[]) => void;
  inside?: (x: Subject) => ReactNode;
  small?: boolean;
}) {
  const [draft, setDraft] = useState('');
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
  const rename = (x: Subject, name: string) => {
    const clean = name.trim();
    if (clean && clean !== x.name && !taken(clean, x.id)) onChange(items.map((y) => (y.id === x.id ? { ...y, name: clean } : y)));
  };

  return (
    <div className="stack-sm">
      {items.length === 0 && !small && <p className="meta">No {word}s yet.</p>}
      {items.length > 0 && (
        <ul className="list">
          {items.map((x) => {
            const n = used(x);
            return (
              <li key={x.id} className="stack-sm">
                <div className="spread">
                  {/* Saved when she leaves the field, so a half-typed name never renames anything. */}
                  <input key={x.name} type="text" aria-label={`Name of ${word} ${x.name}`} defaultValue={x.name} onBlur={(e) => rename(x, e.target.value)} />
                  <span className="row">
                    <span className="meta">{n ? `${n} question${n === 1 ? '' : 's'}` : 'No quizzes'}</span>
                    <button
                      type="button"
                      className={btn.quiet}
                      disabled={n > 0}
                      title={n > 0 ? 'Remove its quizzes first' : undefined}
                      aria-label={`Remove ${word} ${x.name}`}
                      onClick={() => onChange(items.filter((y) => y.id !== x.id))}
                    >
                      Remove
                    </button>
                  </span>
                </div>
                {inside?.(x)}
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
