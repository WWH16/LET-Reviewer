import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Chip, StatusChip } from '../../ui/Chip';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { useQuestions } from '../../db/hooks';
import { removeBatch, restoreQuestions } from '../../db/repo';
import { subareaName } from '../../domain/let-config';
import type { Question } from '../../domain/types';
import { btn } from '../../ui/btn';
import { CopyTemplateA, FirstRun } from '../home/FirstRun';

type Queue = 'all' | 'needs-key' | 'unverified' | 'flagged';
const QUEUES: { id: Queue; label: string; test: (q: Question) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'needs-key', label: 'Needs key', test: (q) => q.status === 'needs-key' },
  { id: 'unverified', label: 'Unverified', test: (q) => q.status === 'unverified' },
  { id: 'flagged', label: 'Flagged', test: (q) => q.status === 'flagged' || !!q.flag },
];
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
  const [queue, setQueue] = useState<Queue>('all');
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<{ id: string; count: number } | null>(null);
  const announce = useAnnounce();

  // The box updates at once; the list filters at lower priority, so typing stays smooth on a big bank.
  const deferredSearch = useDeferredValue(search);
  const counts = useMemo(() => QUEUES.map((x) => (questions ?? []).filter(x.test).length), [questions]);

  const filtered = useMemo(() => {
    const s = deferredSearch.trim().toLowerCase();
    const test = QUEUES.find((x) => x.id === queue)!.test;
    return (questions ?? []).filter(
      (q) =>
        test(q) &&
        (!s || [q.stem, q.topic, q.sourceRef, subareaName(q.subarea)].some((f) => f.toLowerCase().includes(s))),
    );
  }, [questions, queue, deferredSearch]);

  const batches = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions ?? []) m.set(q.importBatchId, (m.get(q.importBatchId) ?? 0) + 1);
    return [...m].sort((a, b) => b[0].localeCompare(a[0]));
  }, [questions]);

  if (!questions) return <Page title="Bank">{null}</Page>;

  if (!questions.length)
    return (
      <Page title="Bank">
        <FirstRun />
      </Page>
    );

  return (
    <Page title="Bank">
      <div className="row">
        <Link className={btn.primary} to="/bank/import">
          Import questions
        </Link>
        <CopyTemplateA />
      </div>

      <div className="stack bank-filters">
        <div className="field">
          <label htmlFor="bank-search">Search questions</label>
          <input id="bank-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="row" role="group" aria-label="Queue">
          {QUEUES.map((x, i) => (
            <button key={x.id} type="button" className={btn.secondary} aria-pressed={queue === x.id} onClick={() => setQueue(x.id)}>
              {x.label} <span className="num">{counts[i]}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="stack-sm" aria-labelledby="bank-list">
        <h2 id="bank-list">
          {filtered.length > SHOW ? `Showing ${SHOW} of ${filtered.length}. Search to narrow.` : `${filtered.length} questions`}
        </h2>
        <ul className="list">
          {filtered.slice(0, SHOW).map((q) => (
            <li key={q.id}>
              <Link className="list-link stack-sm" to={`/bank/${encodeURIComponent(q.id)}`}>
                <span className="meta">
                  {subareaName(q.subarea)}
                  {q.topic ? `, ${q.topic}` : ''}
                </span>
                <span className="clamp-2" lang={q.lang}>
                  {q.stem}
                </span>
                <span className="row">
                  {q.status !== 'verified' && <StatusChip status={q.status} />}
                  {q.flag && <Chip icon="flag">{q.flag.reason}</Chip>}
                  {q.source === 'ai' && <Chip>AI</Chip>}
                  {q.lang === 'fil' && <Chip>Filipino</Chip>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
