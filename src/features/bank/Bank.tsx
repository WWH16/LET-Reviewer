import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Chip, StatusChip } from '../../ui/Chip';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { useAttempts, useQuestions } from '../../db/hooks';
import { removeBatch, restoreQuestions } from '../../db/repo';
import { subareaName } from '../../domain/let-config';
import { lastResults } from '../../domain/scoring';
import { Icon } from '../../ui/Icon';
import type { Question } from '../../domain/types';
import { btn } from '../../ui/btn';
import { CopyPhotoPrompt, FirstRun } from '../home/FirstRun';
import { Empty } from '../../ui/Empty';

type Queue = 'all' | 'incorrect' | 'correct' | 'flagged' | 'unanswered' | 'check';
type Last = ReadonlyMap<string, boolean>;
const isFlagged = (q: Question) => q.status === 'flagged' || !!q.flag;
/** The tabs: what you got wrong or right last time, what you flagged, what you have not tried, what needs fixing. */
const QUEUES: { id: Queue; label: string; test: (q: Question, last: Last) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'incorrect', label: 'Incorrect', test: (q, last) => last.get(q.id) === false },
  { id: 'correct', label: 'Correct', test: (q, last) => last.get(q.id) === true },
  { id: 'flagged', label: 'Flagged', test: isFlagged },
  { id: 'unanswered', label: 'Not answered', test: (q, last) => !last.has(q.id) },
  { id: 'check', label: 'To check', test: (q) => q.status === 'needs-key' || q.status === 'unverified' },
];
const STATUS = {
  right: { cls: 'is-right', icon: 'check', text: 'Last answer right' },
  wrong: { cls: 'is-wrong', icon: 'cross', text: 'Last answer wrong' },
  flag: { cls: 'is-flag', icon: 'flag', text: 'Flagged' },
  new: { cls: 'is-new', icon: 'study', text: 'Not answered yet' },
} as const;
/** Why a tab is empty, in the tab's own terms. */
const NONE: Record<Queue, [title: string, text: string]> = {
  all: ['No questions', 'Import some to start.'],
  incorrect: ['No wrong answers', 'A question lands here when your latest answer to it is wrong.'],
  correct: ['No right answers yet', 'A question lands here when your latest answer to it is right.'],
  flagged: ['Nothing flagged', 'Flag a question during practice to come back to it here.'],
  unanswered: ['You have answered every question', 'Import more to keep going.'],
  check: ['Nothing to check', 'Questions with no answer key, or not yet verified, wait here.'],
};
const SHOW = 100;

export function batchLabel(id: string): string {
  if (id === 'sample') return 'Sample questions';
  const at = id.startsWith('batch-') ? new Date(id.slice(6)) : null;
  return at && !isNaN(at.getTime())
    ? `Imported ${at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : 'Earlier import';
}

export function Bank() {
  const questions = useQuestions();
  const attempts = useAttempts();
  const [queue, setQueue] = useState<Queue>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(SHOW);
  const [removing, setRemoving] = useState<{ id: string; count: number } | null>(null);
  const announce = useAnnounce();

  // The box updates at once; the list filters at lower priority, so typing stays smooth on a big bank.
  const deferredSearch = useDeferredValue(search);
  const last = useMemo(
    () => lastResults(attempts ?? [], new Map((questions ?? []).map((q) => [q.id, q]))),
    [attempts, questions],
  );
  const counts = useMemo(() => QUEUES.map((x) => (questions ?? []).filter((q) => x.test(q, last)).length), [questions, last]);

  const filtered = useMemo(() => {
    const s = deferredSearch.trim().toLowerCase();
    const test = QUEUES.find((x) => x.id === queue)!.test;
    return (questions ?? []).filter(
      (q) =>
        test(q, last) &&
        (!s || [q.stem, q.topic, q.sourceRef, subareaName(q.subarea)].some((f) => f.toLowerCase().includes(s))),
    );
  }, [questions, queue, deferredSearch, last]);

  const batches = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions ?? []) m.set(q.importBatchId, (m.get(q.importBatchId) ?? 0) + 1);
    return [...m].sort((a, b) => b[0].localeCompare(a[0]));
  }, [questions]);

  if (!questions || !attempts) return <Page title="Review">{null}</Page>;

  if (!questions.length)
    return (
      <Page title="Review">
        <FirstRun />
      </Page>
    );

  return (
    <Page title="Review" wide>
      <div className="bank-layout">
        <div className="bank-rail">
          <div className="row">
            <Link className={btn.primary} to="/bank/import">
              Import questions
            </Link>
            <CopyPhotoPrompt />
        </div>

        <div className="stack bank-filters">
          <div className="field">
            <label htmlFor="bank-search">Search questions</label>
            <input
              id="bank-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(SHOW);
              }}
            />
          </div>
          <div className="review-tabs" role="group" aria-label="Show">
            {QUEUES.map((x, i) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={queue === x.id}
                onClick={() => {
                  setQueue(x.id);
                  setLimit(SHOW);
                }}
              >
                <span>{x.label}</span>
                <span className="num">{counts[i]}</span>
              </button>
            ))}
          </div>
        </div>
        </div>

        <section className="stack-sm" aria-labelledby="bank-list">
          <h2 id="bank-list">
            {filtered.length > limit ? `Showing ${limit} of ${filtered.length}` : `${filtered.length} questions`}
          </h2>
          {filtered.length === 0 &&
            (search.trim() ? (
              <Empty icon="review" title="No questions match" text={`Nothing under ${QUEUES.find((x) => x.id === queue)!.label} matches “${search.trim()}”.`}>
                <button type="button" className={btn.secondary} onClick={() => setSearch('')}>
                  Clear search
                </button>
              </Empty>
            ) : (
              <Empty icon="review" title={NONE[queue][0]} text={NONE[queue][1]}>
                {queue !== 'all' && (
                  <button type="button" className={btn.secondary} onClick={() => setQueue('all')}>
                    Show all questions
                  </button>
                )}
              </Empty>
            ))}
          <ul className="list" hidden={filtered.length === 0}>
            {filtered.slice(0, limit).map((q) => {
              const s = STATUS[isFlagged(q) ? 'flag' : last.get(q.id) === true ? 'right' : last.get(q.id) === false ? 'wrong' : 'new'];
              return (
                <li key={q.id}>
                  <Link className="list-link review-row" to={`/bank/${encodeURIComponent(q.id)}`}>
                    <span className={`review-status ${s.cls}`}>
                      <Icon name={s.icon} size={14} />
                      <span className="sr-only">{s.text}: </span>
                    </span>
                    <span className="meta">
                      {subareaName(q.subarea)}
                      {q.topic ? `, ${q.topic}` : ''}
                    </span>
                    <span className="clamp-2" lang={q.lang}>
                      {q.stem}
                    </span>
                    {(q.status !== 'verified' || q.source === 'ai' || q.lang === 'fil') && (
                      <span className="row">
                        {q.status !== 'verified' && <StatusChip status={q.status} />}
                        {q.flag && <Chip icon="flag">{q.flag.reason}</Chip>}
                        {q.source === 'ai' && <Chip>AI</Chip>}
                        {q.lang === 'fil' && <Chip>Filipino</Chip>}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          {filtered.length > limit && (
            <div>
              <button type="button" className={btn.secondary} onClick={() => setLimit(limit + SHOW)}>
                Show {Math.min(SHOW, filtered.length - limit)} more
              </button>
            </div>
          )}
        </section>

        <section className="stack-sm" aria-labelledby="bank-batches">
          <h2 id="bank-batches">Imports</h2>
          <ul className="list">
            {batches.map(([id, count]) => (
              <li key={id} className="spread">
                <span>
                  {batchLabel(id)} <span className="muted">({count} items)</span>
                </span>
                <button type="button" className={btn.quiet} onClick={() => setRemoving({ id, count })}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={removing ? `Remove ${removing.count} questions from “${batchLabel(removing.id)}”?` : ''}
      >
        <p>Your past answers to them stay in your history. You can import them again later.</p>
        <div className="row">
          <button type="button" className={btn.primary} data-autofocus onClick={() => setRemoving(null)}>
            Keep them
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={async () => {
              // Undo brings back only the questions this remove took out, not ones removed earlier.
              const ids = questions.filter((q) => q.importBatchId === removing!.id).map((q) => q.id);
              const n = await removeBatch(removing!.id);
              setRemoving(null);
              announce(`Removed ${n} questions`, () => restoreQuestions(ids));
            }}
          >
            Remove batch
          </button>
        </div>
      </Dialog>
    </Page>
  );
}
