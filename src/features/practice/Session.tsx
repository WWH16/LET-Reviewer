import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { useAnnounce } from '../../ui/Status';
import { db } from '../../db/db';
import { useQuestionMap, useSettings } from '../../db/hooks';
import { recordAttempt, setFlag } from '../../db/repo';
import { buildCards, dueCards } from '../../domain/leitner';
import { KEY_LOOKS_WRONG, gradable } from '../../domain/examDraw';
import { dayKey } from '../../domain/dates';
import { subareaName } from '../../domain/let-config';
import { KEYS, type Area, type Key, type Mode, type Question } from '../../domain/types';
import { drillMatches } from './DrillSetup';

const TITLES: Record<string, string> = { drill: 'Practice', review: 'Review', quick: 'Quick 10' };
const FLAGGED = 'Flagged during practice';

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Picks the session's items once, when it opens. */
async function pickItems(mode: string, params: URLSearchParams, qmap: Map<string, Question>): Promise<string[]> {
  const live = [...qmap.values()].filter(gradable);
  if (mode === 'drill') {
    const p = {
      area: params.get('area') as Area,
      sub: params.get('sub') ?? '',
      topic: params.get('topic') ?? '',
      ai: params.get('ai') === '1',
    };
    return shuffle(live.filter((q) => drillMatches(q, p))).slice(0, Number(params.get('n')) || 20).map((q) => q.id);
  }
  const due = dueCards(buildCards(await db.attempts.toArray(), qmap), dayKey(new Date()))
    .map((c) => c.questionId)
    .filter((id) => {
      const q = qmap.get(id);
      return q && gradable(q);
    });
  if (mode === 'review') return due;
  // Quick 10: reviews due first, then random questions.
  const first = due.slice(0, 10);
  const rest = shuffle(live.filter((q) => !first.includes(q.id))).map((q) => q.id);
  return [...first, ...rest].slice(0, 10);
}

interface Result {
  id: string;
  chosen: Key;
  correct: boolean;
}

export function Session() {
  const [params] = useSearchParams();
  const mode = params.get('mode') ?? 'drill';
  const qmap = useQuestionMap();
  const settings = useSettings();
  const [items, setItems] = useState<string[] | null>(null);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<Key | null>(null);
  const [checked, setChecked] = useState(false);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);
  const shownAt = useRef(Date.now());
  const qHeading = useRef<HTMLHeadingElement>(null);
  const fbHeading = useRef<HTMLHeadingElement>(null);
  const resHeading = useRef<HTMLHeadingElement>(null);
  const announce = useAnnounce();

  useEffect(() => {
    if (!qmap || items) return;
    pickItems(mode, params, qmap).then(setItems);
  }, [qmap, items, mode, params, run]);

  useEffect(() => {
    shownAt.current = Date.now();
    if (i > 0) qHeading.current?.focus();
  }, [i]);

  useEffect(() => {
    if (checked) fbHeading.current?.focus();
  }, [checked]);

  useEffect(() => {
    if (done) resHeading.current?.focus();
  }, [done]);

  const title = TITLES[mode] ?? 'Practice';
  if (!items || !qmap || !settings) return <Page title={title}>{null}</Page>;

  if (!items.length)
    return (
      <Page title={title}>
        <p>{mode === 'review' ? 'No reviews due. Questions you miss come back here on schedule.' : 'No questions to practice yet.'}</p>
        <div className="row">
          <Link className="btn btn-primary" to="/drill">
            Practice by topic
          </Link>
          <Link className="btn" to="/">
            Home
          </Link>
        </div>
      </Page>
    );

  const restart = () => {
    setItems(null);
    setI(0);
    setChosen(null);
    setChecked(false);
    setEliminated(new Set());
    setResults([]);
    setDone(false);
    setRun((r) => r + 1);
  };

  if (done) {
    const correct = results.filter((r) => r.correct).length;
    const wrong = results.filter((r) => !r.correct);
    return (
      <Page title={`${title} results`}>
        <div className="stack-sm">
          <h2 ref={resHeading} tabIndex={-1}>
            <span className="display num">
              {correct}/{results.length}
            </span>
            <span className="sr-only"> correct, </span>
            <span className="muted"> · {results.length ? Math.round((correct / results.length) * 100) : 0}%</span>
          </h2>
          {wrong.length > 0 && <p className="muted">Wrong answers were added to Review. They come back tomorrow.</p>}
        </div>
        {wrong.length > 0 && (
          <section className="stack-sm" aria-labelledby="res-wrong">
            <h2 id="res-wrong">To review</h2>
            <ul className="list">
              {wrong.map((r) => {
                const q = qmap.get(r.id)!;
                return (
                  <li key={r.id} lang={q.lang}>
                    <details>
                      <summary className="stack-sm">
                        <span>{q.stem}</span>
                        <span className="label">
                          Your answer {r.chosen} · Correct {q.answer}
                        </span>
                      </summary>
                      <p style={{ marginTop: 'var(--s2)' }}>{q.explanation || 'No explanation saved.'}</p>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={restart}>
            {mode === 'review' ? 'Check for more reviews' : 'Practice again'}
          </button>
          <Link className="btn" to="/">
            Home
          </Link>
        </div>
      </Page>
    );
  }

  const q = qmap.get(items[i])!;
  const isLast = i === items.length - 1;
  const correct = chosen === q.answer;

  const check = async () => {
    if (!chosen || checked) return;
    setChecked(true);
    setResults((r) => [...r, { id: q.id, chosen, correct: chosen === q.answer }]);
    await recordAttempt({ questionId: q.id, chosen, ms: Date.now() - shownAt.current, mode: mode as Mode });
  };
  const next = () => {
    if (isLast) return setDone(true);
    setI(i + 1);
    setChosen(null);
    setChecked(false);
    setEliminated(new Set());
  };
  const toggleFlag = async () => {
    const on = q.flag?.reason !== FLAGGED;
    await setFlag(q.id, on ? FLAGGED : null);
    announce(on ? 'Flagged. Find it in Bank under Flagged.' : 'Flag removed');
  };
  const reportKey = async () => {
    await setFlag(q.id, KEY_LOOKS_WRONG);
    announce('Reported. It is in Bank under Flagged and left out of mock exams until you fix it.');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!settings.shortcuts || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement;
    if (t.matches('textarea, [contenteditable], input:not([type=radio])')) return;
    const k = e.key.toUpperCase();
    const idx = '1234'.indexOf(k);
    const key = (KEYS as readonly string[]).includes(k) ? (k as Key) : idx >= 0 ? KEYS[idx] : null;
    if (key && !checked) {
      e.preventDefault();
      setChosen(key);
    } else if (e.key === 'Enter' && t.tagName !== 'BUTTON' && t.tagName !== 'A') {
      e.preventDefault();
      if (checked) next();
      else check();
    } else if (k === 'F') {
      e.preventDefault();
      toggleFlag();
    }
  };

  return (
    <Page title={title}>
      <div className="stack" onKeyDown={onKeyDown}>
        <div className="spread">
          <h2 ref={qHeading} tabIndex={-1} className="label">
            Question <span className="num">{i + 1}</span> of <span className="num">{items.length}</span>
          </h2>
          <button type="button" className="btn btn-quiet" onClick={() => setDone(true)}>
            End session
          </button>
        </div>
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${((i + (checked ? 1 : 0)) / items.length) * 100}%` }} />
        </div>
        <div className="row">
          <span className="label">
            {subareaName(q.subarea)}
            {q.topic ? ` · ${q.topic}` : ''}
          </span>
          {q.status === 'unverified' && <Chip icon="alert">Unverified</Chip>}
        </div>

        <p id={`stem-${q.id}`} className="stem" lang={q.lang}>
          {q.stem}
        </p>
        {q.media && <p className="notice">Figure: {q.media.alt}</p>}

        <ChoiceGroup
          name={`q-${q.id}`}
          labelledBy={`stem-${q.id}`}
          lang={q.lang}
          choices={q.choices}
          value={chosen}
          onChange={(k) => setChosen(k as Key)}
          locked={checked}
          correct={q.answer}
          eliminated={eliminated}
          onToggleEliminate={(k) =>
            setEliminated((s) => {
              const n = new Set(s);
              if (n.has(k)) n.delete(k);
              else n.add(k);
              return n;
            })
          }
        />

        {!checked ? (
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={!chosen} onClick={check}>
              Check answer
            </button>
            {!chosen && <span className="muted">Choose an answer first.</span>}
          </div>
        ) : (
          <div className="feedback stack">
            <h3 ref={fbHeading} tabIndex={-1} className="row">
              <Icon name={correct ? 'check' : 'cross'} size={20} />
              {correct ? 'Correct' : `Incorrect. The answer is ${q.answer}.`}
            </h3>
            <p lang={q.lang}>{q.explanation || 'No explanation saved for this question.'}</p>
            <p className="sr-only">The choices are locked.</p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={next}>
                {isLast ? 'See results' : 'Next'}
              </button>
              <button type="button" className="btn" aria-pressed={q.flag?.reason === FLAGGED} onClick={toggleFlag}>
                <Icon name="flag" /> Flag
              </button>
              <button type="button" className="btn btn-quiet" onClick={reportKey} disabled={q.flag?.reason === KEY_LOOKS_WRONG}>
                {q.flag?.reason === KEY_LOOKS_WRONG ? 'Key reported' : 'Key looks wrong'}
              </button>
            </div>
          </div>
        )}

        {settings.shortcuts && (
          <p className="muted" style={{ fontSize: '0.8125rem' }}>
            Keys: A–D or 1–4 choose · Enter checks, then goes next · F flags
          </p>
        )}
      </div>
    </Page>
  );
}
