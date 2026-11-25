import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useAnnounce } from '../../ui/Status';
import { copyText } from '../../ui/clipboard';
import { useQuestionMap, useSettings } from '../../db/hooks';
import { importQuestions, nowIso, protectStorage, saveSettings } from '../../db/repo';
import { subjectId, subjectsOf } from '../../domain/subjects';
import { PARTS, partsFor } from '../../domain/let-config';
import { quizPrompt } from '../../domain/prompts';
import { newQuizId } from '../../domain/quiz';
import { parsePasted, previewQuiz } from '../../domain/validate';
import type { Area } from '../../domain/types';
import { btn } from '../../ui/btn';
import { Icon } from '../../ui/Icon';
import { Select } from '../../ui/Select';
import { MajorHint } from '../settings/MajorHint';

const NEW = '__new';
/** A quiz asks for 10 to 150 questions: 150 is the size of one part of the LET. */
const MIN = 10;
const MAX = 150;

/**
 * Making a quiz is where questions come from: pick the part and the subject, copy the prompt to Claude,
 * paste the reply.
 * Nothing is saved until she confirms.
 */
export function NewQuiz() {
  const settings = useSettings();
  const qmap = useQuestionMap();
  const [params] = useSearchParams();
  // Linked picks: the part, then a subject in it.
  // Her lists start empty, so each pick can also name a new one here.
  const [pickedArea, setArea] = useState<Area | null>(null);
  const [subPick, setSubPick] = useState(() => params.get('sub') ?? '');
  const [newSub, setNewSub] = useState('');
  // Digits only, never above MAX while she types; below MIN it is read as MIN and set to it when she leaves the field.
  const [nText, setNText] = useState(String(MIN));
  const n = Math.min(MAX, Math.max(MIN, Number(nText) || MIN));
  const [text, setText] = useState('');
  const [clipError, setClipError] = useState('');
  /** The save under way: `take` for Save and take it, `only` for Save only. That button shows the spinner. */
  const [busy, setBusy] = useState<'take' | 'only' | null>(null);
  /** The prompt last copied, so the button says Copied until the prompt changes or two seconds pass. */
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const navigate = useNavigate();
  const announce = useAnnounce();

  const parts = settings ? partsFor(settings.level) : [];
  const area = pickedArea ?? (parts.find((a) => a === params.get('area')) || parts[0]);
  const subs = area && settings && qmap ? subjectsOf(area, settings.subjects, qmap.values()) : [];
  const addingSub = subPick === NEW || !subs.length;
  const sub = addingSub ? null : (subs.find((s) => s.id === subPick) ?? subs[0]);
  const subjectName = sub?.name ?? newSub.trim();
  const ready = !!subjectName;

  const parsed = useMemo(() => parsePasted(text), [text]);
  const preview = useMemo(
    () => (parsed.kind === 'questions' && area ? previewQuiz(parsed.items, { id: 'quiz-new', area, subarea: sub?.id ?? 'new' }, nowIso()) : null),
    [parsed, area, sub],
  );

  if (!settings || !qmap || !area) return <Page title="New quiz">{null}</Page>;
  const prompt = quizPrompt({ area, subject: subjectName || '<subject>', level: settings.level, major: settings.major, n });
  const back = sub ? `/quizzes/${area}/${sub.id}` : '/quizzes';

  /** Adds a subject she named here to her list, reusing one with the same name. Returns its id. */
  const fileUnder = async (): Promise<string> => {
    if (sub) return sub.id;
    const same = subs.find((x) => x.name.toLowerCase() === subjectName.toLowerCase());
    if (same) return same.id;
    const subject = { id: subjectId(subjectName, new Set(subs.map((x) => x.id))), name: subjectName };
    await saveSettings({ subjects: { ...settings.subjects, [area]: [...settings.subjects[area], subject] } });
    return subject.id;
  };

  const pasteClipboard = async () => {
    setClipError('');
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      setClipError('The browser blocked clipboard access. Long-press the box below and choose Paste.');
    }
  };

  const save = async (start: boolean) => {
    if (parsed.kind !== 'questions' || !ready || busy) return;
    setBusy(start ? 'take' : 'only');
    try {
      const subarea = await fileUnder();
      const now = nowIso();
      const id = newQuizId(now);
      const { ready: qs } = previewQuiz(parsed.items, { id, area, subarea }, now);
      await importQuestions(qs);
      protectStorage(); // first real data: ask the browser not to evict it
      announce(`${subjectName} quiz saved with ${qs.length} questions`);
      navigate(start ? `/session?mode=quiz&quiz=${encodeURIComponent(id)}` : `/quizzes/${area}/${subarea}`);
    } catch {
      setBusy(null);
      announce('Could not save the quiz. Try again.');
    }
  };

  return (
    <Page title="New quiz" back={{ to: back, label: sub ? `${sub.name} quizzes` : 'Quizzes' }}>
      <section className="tile stack" aria-labelledby="nq-1">
        <h2 id="nq-1">1. Pick the subject</h2>
        <MajorHint level={settings.level} />
        <div className="grid-2">
          <div className="field">
            <label htmlFor="nq-area">Part</label>
            <Select
              id="nq-area"
              value={area}
              onChange={(v) => {
                setArea(v as Area);
                setSubPick('');
              }}
            >
              {parts.map((a) => (
                <option key={a} value={a}>
                  {PARTS[a].name}
                </option>
              ))}
            </Select>
          </div>
          {subs.length > 0 && (
            <div className="field">
              <label htmlFor="nq-sub">Subject</label>
              <Select
                id="nq-sub"
                value={sub?.id ?? NEW}
                onChange={(v) => setSubPick(v)}
              >
                {subs.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
                <option value={NEW}>Add a new subject…</option>
              </Select>
            </div>
          )}
          {addingSub && (
            <div className="field">
              <label htmlFor="nq-new">{subs.length ? 'New subject' : `Subject in ${PARTS[area].name}`}</label>
              <input id="nq-new" type="text" placeholder="e.g. English" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="nq-n">Number of questions</label>
            {/* Text, not type="number": a number field also takes "e", "-" and decimals. The arrow keys still step. */}
            <input
              id="nq-n"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              list="nq-n-sizes"
              aria-describedby="nq-n-help"
              value={nText}
              onChange={(e) => {
                // Stripped here rather than with maxLength, so a stray letter never blocks the next digit.
                const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                setNText(digits && Number(digits) > MAX ? String(MAX) : digits);
              }}
              onKeyDown={(e) => {
                const step = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                setNText(String(Math.min(MAX, Math.max(MIN, n + step))));
              }}
              onBlur={() => setNText(String(n))}
            />
            <datalist id="nq-n-sizes">
              {[10, 20, 50, 100, 150].map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
            <span id="nq-n-help" className="meta">
              Type any number from {MIN} to {MAX}, or pick a usual size.
            </span>
          </div>
        </div>
      </section>

      <section className="tile stack" aria-labelledby="nq-2">
        <h2 id="nq-2">2. Ask Claude</h2>
        <div className="field">
          <label htmlFor="nq-prompt">Prompt</label>
          <textarea id="nq-prompt" className="mono" readOnly rows={8} value={prompt} />
        </div>
        <div>
          <button
            type="button"
            className={copiedPrompt === prompt ? `${btn.secondary} is-copied` : btn.secondary}
            disabled={!ready}
            onClick={async () => {
              await copyText(prompt);
              setCopiedPrompt(prompt);
              setTimeout(() => setCopiedPrompt((p) => (p === prompt ? null : p)), 2000);
              announce('Prompt copied. Send it to Claude, then paste the reply below.');
            }}
          >
            {copiedPrompt === prompt ? (
              <>
                <Icon name="check" size={16} />
                Copied
              </>
            ) : (
              'Copy prompt'
            )}
          </button>
        </div>
      </section>

      <section className="tile stack" aria-labelledby="nq-3">
        <h2 id="nq-3">3. Paste the reply</h2>
        <div className="row">
          <button type="button" className={btn.secondary} onClick={pasteClipboard}>
            Paste from clipboard
          </button>
        </div>
        {clipError && <p role="alert">{clipError}</p>}
        <div className="field">
          <label htmlFor="nq-paste">Claude&rsquo;s reply</label>
          <textarea id="nq-paste" value={text} spellCheck={false} onChange={(e) => setText(e.target.value)} />
        </div>

        <div role="status" className="stack-sm">
          {parsed.kind === 'not-json' && <p>No question list found. In Claude, tap Copy on the code block, then paste here.</p>}
          {(parsed.kind === 'unknown' || parsed.kind === 'backup') && <p>This is not a question list. A question list starts with [.</p>}
          {preview && (
            <p>
              <strong>
                {preview.ready.length} question{preview.ready.length === 1 ? '' : 's'} ready
              </strong>
              {preview.invalid.length > 0 && `, ${preview.invalid.length} left out`}
              {preview.repeats > 0 && `, ${preview.repeats} repeated and kept once`}.
            </p>
          )}
        </div>
        {parsed.kind === 'questions' && parsed.truncatedAfter !== null && (
          <p className="notice">
            The reply was cut off after item {parsed.truncatedAfter}. Ask Claude to &ldquo;continue from item {parsed.truncatedAfter + 1}&rdquo; and
            make a second quiz from it.
          </p>
        )}
        {preview && preview.invalid.length > 0 && (
          <ul className="list">
            {preview.invalid.map((r) => (
              <li key={r.n}>
                <strong>Item {r.n}:</strong> {r.errors.join(' ')}
              </li>
            ))}
          </ul>
        )}

        <div className="row">
          <button
            type="button"
            className={btn.primary}
            disabled={!preview?.ready.length || !ready || !!busy}
            aria-busy={busy === 'take'}
            onClick={() => save(true)}
          >
            Save and take it
          </button>
          <button
            type="button"
            className={btn.secondary}
            disabled={!preview?.ready.length || !ready || !!busy}
            aria-busy={busy === 'only'}
            onClick={() => save(false)}
          >
            Save only
          </button>
          <Link className={btn.quiet} to={back}>
            Cancel
          </Link>
        </div>
      </section>
    </Page>
  );
}
