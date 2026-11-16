import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { db } from '../../db/db';
import { removeQuestion, restoreQuestions, saveQuestion } from '../../db/repo';
import { PARTS } from '../../domain/let-config';
import { KEYS, type Area, type Key, type Question } from '../../domain/types';
import { btn } from '../../ui/btn';
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
        <p>
          This question is not in your bank. <Link to="/bank">Back to Bank</Link>
        </p>
      </Page>
    );

  const set = (patch: Partial<Question>) => setQ({ ...q, ...patch });
  const setAnswer = (v: string) => {
    const answer = (v || null) as Key | null;
    // Filling in a missing key means she checked it against the paper.
    let status = q.status;
    if (answer && status === 'needs-key') status = q.source === 'ai' ? 'unverified' : 'verified';
    if (!answer && status !== 'flagged') status = 'needs-key';
    set({ answer, status });
  };

  const save = async () => {
    if (!q.stem.trim()) return setError('The question text is empty.');
    const empty = q.choices.filter((c) => !c.text.trim()).map((c) => c.key);
    if (empty.length) return setError(`Choice ${empty.join(', ')} has no text.`);
    await saveQuestion(q);
    announce('Question saved');
    navigate(-1);
  };

  return (
    <Page title="Edit question">
      <p className="muted">
        {q.source === 'ai' ? `AI-generated from ${q.sourceRef.replace(/^AI from:\s*/i, '')}` : `Review center: ${q.sourceRef}`}
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
          <div className="grid-2">
            <div className="field">
              <label htmlFor="eq-answer">Answer key</label>
              <Select id="eq-answer" value={q.answer ?? ''} onChange={(v) => setAnswer(v)}>
                <option value="">No key yet</option>
                {KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label htmlFor="eq-status">Status</label>
              <Select id="eq-status" value={q.status} onChange={(v) => set({ status: v as Question['status'] })}>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="needs-key">Needs key</option>
                <option value="flagged">Flagged</option>
              </Select>
            </div>
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
          <h2 id="eq-h-file">Filed under</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="eq-area">Part</label>
              <Select
                id="eq-area"
                value={q.area}
                onChange={(v) => {
                  const area = v as Area;
                  set({ area, subarea: PARTS[area].subareas[0].id });
                }}
              >
                {Object.values(PARTS).map((p) => (
                  <option key={p.area} value={p.area}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label htmlFor="eq-sub">Sub-area</label>
              <Select id="eq-sub" value={q.subarea} onChange={(v) => set({ subarea: v })}>
                {PARTS[q.area].subareas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label htmlFor="eq-topic">Topic</label>
              <input id="eq-topic" type="text" value={q.topic} onChange={(e) => set({ topic: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="eq-lang">Language</label>
              <Select id="eq-lang" value={q.lang} onChange={(v) => set({ lang: v as Question['lang'] })}>
                <option value="en">English</option>
                <option value="fil">Filipino</option>
              </Select>
            </div>
          </div>
        </section>

        {q.flag && (
          <div className="notice spread">
            <span>Flagged: {q.flag.reason}</span>
            <button type="button" className={btn.secondary} onClick={() => set({ flag: null })}>
              Clear flag
            </button>
          </div>
        )}

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
        <p>Your past answers to it stay in your history.</p>
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
              navigate('/bank');
            }}
          >
            Remove question
          </button>
        </div>
      </Dialog>
    </Page>
  );
}
