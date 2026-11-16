import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useAnnounce } from '../../ui/Status';
import { useQuestions } from '../../db/hooks';
import { importQuestions, nowIso, protectStorage } from '../../db/repo';
import { parsePasted, previewImport } from '../../domain/validate';
import { PARTS, subareaName } from '../../domain/let-config';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';
import { PromptBuilder } from './PromptBuilder';

/** Paste-first import with a preview. Nothing is written until she confirms (plan §5, DX C1). */
export function Import() {
  const [text, setText] = useState('');
  const [overrides, setOverrides] = useState<Record<number, { subarea: string }>>({});
  const [fixPick, setFixPick] = useState<Record<number, string>>({});
  const [clipError, setClipError] = useState('');
  const [busy, setBusy] = useState(false);
  const summary = useRef<HTMLHeadingElement>(null);
  const questions = useQuestions();
  const navigate = useNavigate();
  const announce = useAnnounce();

  const existing = useMemo(() => new Set((questions ?? []).map((q) => q.id)), [questions]);
  const parsed = useMemo(() => parsePasted(text), [text]);
  const preview = useMemo(
    () => (parsed.kind === 'questions' ? previewImport(parsed.items, existing, { now: nowIso(), batchId: '' }, overrides) : null),
    [parsed, existing, overrides],
  );

  const load = (t: string) => {
    setText(t);
    setOverrides({});
    setFixPick({});
    requestAnimationFrame(() => summary.current?.focus());
  };

  const pasteClipboard = async () => {
    setClipError('');
    try {
      load(await navigator.clipboard.readText());
    } catch {
      setClipError('The browser blocked clipboard access. Long-press the box below and choose Paste.');
    }
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) load(await f.text());
    e.target.value = '';
  };

  const commit = async () => {
    if (!preview?.ready.length) return;
    setBusy(true);
    const now = nowIso();
    const batchId = `batch-${now}`;
    const n = await importQuestions(preview.ready.map((q) => ({ ...q, importBatchId: batchId, updatedAt: now })));
    protectStorage(); // first real data: ask the browser not to evict it (DX R10)
    announce(`Imported ${n} question${n === 1 ? '' : 's'}`);
    navigate('/bank');
  };

  const distribution = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of preview?.ready ?? []) m.set(q.subarea, (m.get(q.subarea) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [preview]);

  return (
    <Page title="Import questions">
      <div className="stack">
        <p className="muted">
          In Claude, tap <strong>Copy</strong> on the code block with the questions, then paste it here. Extra text around it is fine.
        </p>
        <div className="row">
          <button type="button" className={btn.secondary} onClick={pasteClipboard}>
            Paste from clipboard
          </button>
          <label className={btn.secondary}>
            Choose file
            <input type="file" accept=".json,.txt,application/json,text/plain" className="sr-only" onChange={pickFile} />
          </label>
        </div>
        {clipError && <p role="alert">{clipError}</p>}
        <div className="field">
          <label htmlFor="paste">Claude&rsquo;s reply</label>
          <textarea
            id="paste"
            value={text}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              setOverrides({});
            }}
          />
        </div>
        <PromptBuilder />
      </div>

      {parsed.kind !== 'empty' && (
        <section className="stack" aria-labelledby="import-summary">
          <h2 id="import-summary" ref={summary} tabIndex={-1}>
            {parsed.kind === 'questions' && preview
              ? `${preview.ready.length} new, ${preview.duplicates.length} already in your bank, ${preview.invalid.length} with errors`
              : parsed.kind === 'not-json'
                ? 'No question list found in what you pasted.'
                : parsed.kind === 'backup'
                  ? 'This is a backup file, not a question list.'
                  : parsed.kind === 'answer-sheet'
                    ? 'This is an answer sheet, not a question list.'
                    : 'This is not a question list.'}
          </h2>

          {parsed.kind === 'not-json' && <p>In Claude, tap Copy on the code block, then paste here.</p>}
          {parsed.kind === 'backup' && (
            <p>
              To restore it, go to <Link to="/settings">Settings</Link> and choose Restore backup.
            </p>
          )}
          {parsed.kind === 'answer-sheet' && (
            <p>Photo grading is not built yet. Open the printed exam in Mock and use Enter answers.</p>
          )}
          {parsed.kind === 'unknown' && <p>A question list starts with [ and holds one object per question.</p>}

          {parsed.kind === 'questions' && parsed.truncatedAfter !== null && (
            <p className="notice">
              The list was cut off after item {parsed.truncatedAfter}. Items 1 to {parsed.truncatedAfter} were read and are
              checked below. Ask Claude to &ldquo;continue from item {parsed.truncatedAfter + 1}&rdquo;.
            </p>
          )}
          {parsed.kind === 'questions' && parsed.unreadable.length > 0 && (
            <p className="notice">
              Item{parsed.unreadable.length > 1 ? 's' : ''} {parsed.unreadable.join(', ')} could not be read and{' '}
              {parsed.unreadable.length > 1 ? 'were' : 'was'} left out. Ask Claude to resend {parsed.unreadable.length > 1 ? 'them' : 'it'}.
            </p>
          )}

          {preview && preview.invalid.length > 0 && (
            <div className="stack-sm">
              <h3>Needs fixing</h3>
              <ul className="list">
                {preview.invalid.map((r) => (
                  <li key={r.n} className="stack-sm">
                    <p>
                      <strong>{r.label}:</strong> {r.errors.join(' ')}
                    </p>
                    {r.subareaFix && (
                      <div className="row">
                        <label className="sr-only" htmlFor={`fix-${r.n}`}>
                          Sub-area for item {r.n}
                        </label>
                        <Select
                          id={`fix-${r.n}`}
                          value={fixPick[r.n] ?? r.subareaFix.suggestion}
                          onChange={(v) => setFixPick((p) => ({ ...p, [r.n]: v }))}
                        >
                          {PARTS[r.subareaFix.area].subareas.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Select>
                        <button
                          type="button"
                          className={btn.secondary}
                          onClick={() => setOverrides((o) => ({ ...o, [r.n]: { subarea: fixPick[r.n] ?? r.subareaFix!.suggestion } }))}
                        >
                          Use this sub-area
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="muted">Items with errors are left out. The others can still be imported.</p>
            </div>
          )}

          {preview && preview.duplicates.length > 0 && (
            <p className="muted">
              {preview.duplicates.length} item{preview.duplicates.length > 1 ? 's are' : ' is'} already in your bank and will be
              skipped. Your saved versions are not changed.
            </p>
          )}

          {preview && preview.ready.length > 0 && (
            <div className="stack-sm">
              <h3>Check the keys against the paper</h3>
              <p className="muted">
                {distribution.map(([id, n]) => `${n} ${subareaName(id)}`).join(', ')}
              </p>
              <table>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Key</th>
                    <th scope="col">Question</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.results
                    .filter((r) => r.question && !r.duplicate)
                    .map((r) => (
                      <tr key={r.n}>
                        <td className="num">{r.n}</td>
                        <td className="num">{r.question!.answer ?? 'None'}</td>
                        <td lang={r.question!.lang}>
                          {r.question!.stem.length > 90 ? `${r.question!.stem.slice(0, 90)}…` : r.question!.stem}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {preview && (
            <div className="row">
              <button type="button" className={btn.primary} disabled={!preview.ready.length || busy} onClick={commit}>
                Import {preview.ready.length} item{preview.ready.length === 1 ? '' : 's'}
              </button>
              <Link className={btn.quiet} to="/bank">
                Cancel
              </Link>
            </div>
          )}
        </section>
      )}
    </Page>
  );
}
