import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { db } from '../../db/db';
import { removeQuestion, restoreQuestions, saveQuestion } from '../../db/repo';
import { PARTS, subareaName } from '../../domain/let-config';
import { topicName } from '../../domain/subjects';
import { KEYS, type Key, type Question } from '../../domain/types';
import { btn } from '../../ui/btn';
import { Empty } from '../../ui/Empty';
import { Select } from '../../ui/Select';

export function EditQuestion() {
  const { id = '' } = useParams();
  const [q, setQ] = useState<Question | null | undefined>(undefined);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const announce = useAnnounce();

  useEffect(() => {
    db.questions.get(id).then((x) => setQ(x && !x.deleted ? x : null));
  }, [id]);

  if (q === undefined) return <Page title="Edit question">{null}</Page>;
  if (q === null)
    return (
      <Page title="Question not found">
        <Empty icon="review" title="This question is not on this device" text="It may have been removed with its quiz.">
          <Link className={btn.primary} to="/quizzes">
            Back to Quizzes
          </Link>
        </Empty>
      </Page>
    );

  const set = (patch: Partial<Question>) => setQ({ ...q, ...patch });
  const quiz = `/quiz/${encodeURIComponent(q.quizId)}`;

  const save = async () => {
    if (!q.stem.trim()) return setError('The question text is empty.');
    const empty = q.choices.filter((c) => !c.text.trim()).map((c) => c.key);
    if (empty.length) return setError(`Choice ${empty.join(', ')} has no text.`);
    await saveQuestion(q);
    announce('Question saved');
    navigate(-1);
  };

  return (
    <Page title="Edit question" back={{ to: quiz, label: `${subareaName(q.subarea)} quiz` }}>
      <p className="muted">
        {PARTS[q.area].name}, {subareaName(q.subarea)}
      </p>

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {/* Four tiles: what is asked, how it is graded, why, and where it is filed. */}
        <section className="tile" aria-labelledby="eq-h-q">
          <h2 id="eq-h-q">Question and choices</h2>
          <div className="field">
            <label htmlFor="eq-stem">Question</label>
            <textarea id="eq-stem" className="prose" lang={q.lang} value={q.stem} onChange={(e) => set({ stem: e.target.value })} />
          </div>
          {q.choices.map((c, i) => (
            <div className="field" key={c.key}>
              <label htmlFor={`eq-c${c.key}`}>Choice {c.key}</label>
              <textarea
                id={`eq-c${c.key}`}
                className="choice-edit"
                rows={1}
                lang={q.lang}
                value={c.text}
                onChange={(e) => set({ choices: q.choices.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                onKeyDown={(e) => {
                  // A choice is one line of text: Enter still saves, as it did when this was a text input.
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
            </div>
          ))}
        </section>
        <section className="tile" aria-labelledby="eq-h-grade">
          <h2 id="eq-h-grade">Grading</h2>
          <div className="field">
            <label htmlFor="eq-answer">Answer key</label>
            <Select id="eq-answer" value={q.answer ?? 'A'} onChange={(v) => set({ answer: v as Key })}>
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </div>
        </section>
        <section className="tile" aria-labelledby="eq-h-expl">
          <div className="field">
            <h2 id="eq-h-expl">
              <label htmlFor="eq-expl">Explanation</label>
            </h2>
            <textarea
              id="eq-expl"
              className="prose"
              lang={q.lang}
              value={q.explanation}
              onChange={(e) => set({ explanation: e.target.value })}
            />
          </div>
        </section>
        <section className="tile" aria-labelledby="eq-h-file">
          <h2 id="eq-h-file">Details</h2>
          <div className="grid-2">
            {q.topicId ? (
              <p className="field">
                <span className="label">Topic</span>
                <span>{topicName(q.subarea, q.topicId)}</span>
                <span className="meta">Rename it in Settings, Subjects.</span>
              </p>
            ) : (
              <div className="field">
                <label htmlFor="eq-topic">Topic</label>
                <input id="eq-topic" type="text" value={q.topic} onChange={(e) => set({ topic: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label htmlFor="eq-lang">Language</label>
              <Select id="eq-lang" value={q.lang} onChange={(v) => set({ lang: v as Question['lang'] })}>
                <option value="en">English</option>
                <option value="fil">Filipino</option>
              </Select>
            </div>
          </div>
        </section>

        {error && <p role="alert">{error}</p>}

        <div className="spread">
          <div className="row">
            <button type="submit" className={btn.primary}>
              Save
            </button>
            <button type="button" className={btn.quiet} onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
          <button type="button" className={btn.secondary} onClick={() => setConfirm(true)}>
            Remove
          </button>
        </div>
      </form>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Remove this question?">
        <p>It leaves this quiz and future mocks. Your past answers to it stay in your history.</p>
        <div className="row">
          <button type="button" className={btn.primary} data-autofocus onClick={() => setConfirm(false)}>
            Keep it
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={async () => {
              await removeQuestion(q.id);
              announce('Question removed', () => restoreQuestions([q.id]));
              navigate(quiz);
            }}
          >
            Remove question
          </button>
        </div>
      </Dialog>
    </Page>
  );
}
