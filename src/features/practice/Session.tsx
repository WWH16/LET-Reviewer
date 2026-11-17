import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { Stem } from '../../ui/Stem';
import { useAnnounce } from '../../ui/Status';
import { db } from '../../db/db';
import { useQuestionMap, useSettings } from '../../db/hooks';
import { recordAttempt, setFlag } from '../../db/repo';
import { buildCards, dueCards } from '../../domain/leitner';
import { KEY_LOOKS_WRONG, gradable, questionOfTheDay, shuffle } from '../../domain/examDraw';
import { dayKey } from '../../domain/dates';
import { paceMs, subareaName } from '../../domain/let-config';
import { KEYS, type Area, type Key, type Mode, type Question } from '../../domain/types';
import { drillMatches } from './DrillSetup';
import { btn } from '../../ui/btn';
import { Empty } from '../../ui/Empty';

const TITLES: Record<string, string> = { drill: 'Practice', review: 'Missed questions', quick: 'Quick 10', qotd: 'Question of the Day', timed: 'Timed quiz' };
/** mm:ss for the timed quiz's clock. */
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const FLAGGED = 'Flagged during practice';

/** Picks the session's items once, when it opens. */
async function pickItems(mode: string, params: URLSearchParams, qmap: Map<string, Question>): Promise<string[]> {
  const live = [...qmap.values()].filter(gradable);
  if (mode === 'qotd') {
    const id = questionOfTheDay(dayKey(new Date()), qmap.values());
    return id ? [id] : [];
  }
  if (mode === 'timed') return shuffle(live).slice(0, 10).map((q) => q.id);
  if (mode === 'drill') {
    const p = {
      area: params.get('area') as Area,
      sub: params.get('sub') ?? '',
      topic: params.get('topic') ?? '',
      ai: params.get('ai') === '1',
    };
    return shuffle(live.filter((q) => drillMatches(q, p))).slice(0, Number(params.get('n')) || 20).map((q) => q.id);
  }
  const due = dueCards(buildCards(await db.attempts.orderBy('at').toArray(), qmap), dayKey(new Date()))
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
  // Timed quiz: the clock starts when the questions are picked and runs at the LET's own pace per item.
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [timeUp, setTimeUp] = useState(false);
  const shownAt = useRef(Date.now());
  const qHeading = useRef<HTMLHeadingElement>(null);
  const fbHeading = useRef<HTMLHeadingElement>(null);
  const resHeading = useRef<HTMLHeadingElement>(null);
  const announce = useAnnounce();

  useEffect(() => {
    if (!qmap || items) return;
    pickItems(mode, params, qmap).then((picked) => {
      setItems(picked);
      setStartedAt(Date.now());
      setNow(Date.now());
    });
  }, [qmap, items, mode, params, run]);

  const timed = mode === 'timed';
  const limitMs = timed && items && qmap ? items.reduce((s, id) => s + paceMs(qmap.get(id)!.area), 0) : 0;
  const leftMs = limitMs - (now - startedAt);
  useEffect(() => {
    if (!timed || !items?.length || done) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [timed, items, done]);
  useEffect(() => {
    if (timed && items?.length && !done && leftMs <= 0) {
      setTimeUp(true);
      setDone(true);
    }
  }, [timed, items, done, leftMs]);

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

  // Shortcuts listen on the window, so they work wherever focus is: on the page heading when
  // question 1 opens, or on the page after a click on empty space. Only a question screen sets a handler.
  const keyHandler = useRef<((e: KeyboardEvent) => void) | null>(null);
  keyHandler.current = null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current?.(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const title = TITLES[mode] ?? 'Practice';
  if (!items || !qmap || !settings) return <Page title={title} titleHidden>{null}</Page>;

  if (!items.length)
    return (
      <Page title={title}>
        {mode === 'review' ? (
          <Empty icon="check" title="Nothing due today" text="Questions you miss come back here the next day.">
            <Link className={btn.primary} to="/session?mode=quick">
              Start a Quick 10
            </Link>
            <Link className={btn.secondary} to="/">
              Back to Study
            </Link>
          </Empty>
        ) : (
          <Empty
            icon="study"
            title="No questions to practice"
            text={mode === 'drill' ? 'Nothing in the bank matches this part, sub-area and topic.' : 'The bank has no questions with an answer key yet.'}
          >
            <Link className={btn.primary} to={mode === 'drill' ? '/drill' : '/bank/import'}>
              {mode === 'drill' ? 'Change the drill' : 'Import questions'}
            </Link>
            <Link className={btn.secondary} to="/">
              Back to Study
            </Link>
          </Empty>
        )}
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
    setTimeUp(false);
    setRun((r) => r + 1);
  };

  if (done) {
    const correct = results.filter((r) => r.correct).length;
    const wrong = results.filter((r) => !r.correct);
    return (
      <Page title={`${title} results`}>
        {/* The score is the screen's navy block, as on a quiz app's results screen. */}
        <section className="tile tile-inverse quiz-score" aria-labelledby="res-score">
          <h2 id="res-score" className="label">
            {timeUp ? 'Time is up' : `${title} done`}
          </h2>
          <p ref={resHeading} tabIndex={-1} className="score">
            <span className="display">{results.length ? Math.round((correct / results.length) * 100) : 0}%</span>
            <span className="display-unit">
              {correct} of {results.length} correct
              {timeUp && results.length < items.length ? `, ${items.length - results.length} not reached` : ''}
            </span>
          </p>
          {wrong.length > 0 && <p className="well">Missed questions come back in Missed questions tomorrow.</p>}
        </section>
        {wrong.length > 0 && (
          <section className="stack-sm" aria-labelledby="res-wrong">
            <h2 id="res-wrong">To review</h2>
            <ul className="list review-list">
              {wrong.map((r) => {
                const q = qmap.get(r.id)!;
                return (
                  <li key={r.id} lang={q.lang}>
                    <details>
                      <summary className="review-row">
                        <span className="review-status is-wrong">
                          <Icon name="cross" size={14} />
                          <span className="sr-only">Incorrect: </span>
                        </span>
                        <span>{q.stem}</span>
                        <span className="meta">
                          You chose {r.chosen}. The answer is {q.answer}.
                        </span>
                      </summary>
                      <p style={{ marginTop: 'var(--space-xs)' }}>{q.explanation || 'No explanation saved.'}</p>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <div className="row">
          <button type="button" className={btn.primary} onClick={restart}>
            {mode === 'review' ? 'Check for more reviews' : 'Practice again'}
          </button>
          <Link className={btn.secondary} to="/">
            Back to Study
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
    const advance = () => {
      setI(i + 1);
      setChosen(null);
      setChecked(false);
      setEliminated(new Set());
    };
    // A short crossfade between questions where the browser supports view transitions and motion is welcome.
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      document.startViewTransition(() => flushSync(advance));
    else advance();
  };
  const toggleFlag = async () => {
    const on = q.flag?.reason !== FLAGGED;
    await setFlag(q.id, on ? FLAGGED : null);
    announce(on ? 'Flagged. Find it in Review under Flagged.' : 'Flag removed');
  };
  const reportKey = async () => {
    await setFlag(q.id, KEY_LOOKS_WRONG);
    announce('Reported. It is in Review under Flagged and left out of mock exams until you fix it.');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!settings.shortcuts || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    const t = e.target instanceof HTMLElement ? e.target : document.body;
    if (t.matches('textarea, select, [contenteditable], input:not([type=radio])')) return;
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
  keyHandler.current = onKeyDown;

  return (
    <Page title={title} titleHidden>
      <div className="stack">
        {/* The quiz bar: one segment per question (green right, red wrong, white the current one), the close
            button, the count and, on a timed quiz, the clock. */}
        <div className="quiz-bar">
          {items.length > 1 && (
            <ol className="quiz-steps" aria-hidden="true">
              {items.map((id, k) => (
                <li key={id} className={k < results.length ? (results[k].correct ? 'is-right' : 'is-wrong') : k === i ? 'is-now' : undefined} />
              ))}
            </ol>
          )}
          <div className="quiz-row">
            <button type="button" className="quiz-close" aria-label="End session" title="End session" onClick={() => setDone(true)}>
              <Icon name="cross" size={20} />
            </button>
            <h2 ref={qHeading} tabIndex={-1} className="quiz-count">
              {items.length > 1 ? (
                <>
                  Question <span className="num">{i + 1}</span> / <span className="num">{items.length}</span>
                </>
              ) : (
                title
              )}
            </h2>
            {timed ? (
              <span className={`quiz-timer num ${leftMs < 60000 ? 'is-low' : ''}`} role="timer" aria-label={`Time left ${mmss(leftMs)}`}>
                <Icon name="timer" size={16} /> {mmss(leftMs)}
              </span>
            ) : (
              <span className="quiz-timer" />
            )}
          </div>
        </div>
        <div className="row">
          <span className="meta">
            {subareaName(q.subarea)}
            {q.topic ? `, ${q.topic}` : ''}
          </span>
          {q.status === 'unverified' && <Chip icon="alert">Unverified</Chip>}
        </div>

        <Stem id={`stem-${q.id}`} lang={q.lang} text={q.stem} />
        {q.media && <p className="notice">Figure: {q.media.alt}</p>}

        <ChoiceGroup
          key={q.id}
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
            <button type="button" className={btn.primary} disabled={!chosen} onClick={check} aria-keyshortcuts={settings.shortcuts ? 'Enter' : undefined}>
              Check answer
              {settings.shortcuts && <kbd className="kbd-inline" aria-hidden="true">Enter</kbd>}
            </button>
          </div>
        ) : (
          <div className="feedback stack">
            <h3 ref={fbHeading} tabIndex={-1} className={correct ? "stamp" : "stamp is-miss"}>
              <Icon name={correct ? 'check' : 'cross'} size={20} />
              {correct ? 'Correct' : `Incorrect. The answer is ${q.answer}.`}
            </h3>
            <p lang={q.lang}>{q.explanation || 'No explanation saved for this question.'}</p>
            <p className="sr-only">The choices are locked.</p>
            <div className="row">
              <button type="button" className={btn.primary} onClick={next} aria-keyshortcuts={settings.shortcuts ? 'Enter' : undefined}>
                {isLast ? 'See results' : 'Next'}
                {settings.shortcuts && <kbd className="kbd-inline" aria-hidden="true">Enter</kbd>}
              </button>
              <button
                type="button"
                className={btn.secondary}
                aria-pressed={q.flag?.reason === FLAGGED}
                onClick={toggleFlag}
                aria-keyshortcuts={settings.shortcuts ? 'F' : undefined}
              >
                <Icon name="flag" /> Flag
                {settings.shortcuts && <kbd className="kbd-inline" aria-hidden="true">F</kbd>}
              </button>
              <button type="button" className={btn.quiet} onClick={reportKey} disabled={q.flag?.reason === KEY_LOOKS_WRONG}>
                {q.flag?.reason === KEY_LOOKS_WRONG ? 'Key reported' : 'Key looks wrong'}
              </button>
            </div>
          </div>
        )}

        {i === 0 && !checked && (
          <p className="muted">
            The{' '}
            <span className="inline-icon">
              <Icon name="strike" size={16} />
            </span>
            <span className="sr-only">Eliminate</span> button beside a choice crosses it out while you think.
          </p>
        )}
        {settings.shortcuts && i === 0 && !checked && (
          <p className="kbd-hint label">
            <kbd>A</kbd> to <kbd>D</kbd> or <kbd>1</kbd> to <kbd>4</kbd> choose. <kbd>Enter</kbd> checks, then goes next. <kbd>F</kbd> flags.
          </p>
        )}
      </div>
    </Page>
  );
}
