import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useAnnounce } from '../../ui/Status';
import { copyText } from '../../ui/clipboard';
import { useSettings } from '../../db/hooks';
import { importQuestions, nowIso, protectStorage } from '../../db/repo';
import { PARTS, partsFor } from '../../domain/let-config';
import { quizPrompt } from '../../domain/prompts';
import { newQuizId } from '../../domain/quiz';
import { parsePasted, previewQuiz } from '../../domain/validate';
import type { Area } from '../../domain/types';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';

/**
 * Making a quiz is where questions come from: pick the subject, copy the prompt to Claude, paste the reply.
 * Nothing is saved until she confirms.
 */
export function NewQuiz() {
  const settings = useSettings();
  const [params] = useSearchParams();
  const [picked, setPicked] = useState<{ area: Area; sub: string } | null>(null);
  const [topic, setTopic] = useState(() => params.get('topic') ?? '');
  const [n, setN] = useState(10);
  const [text, setText] = useState('');
  const [clipError, setClipError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const announce = useAnnounce();

  const parts = settings ? partsFor(settings.level) : [];
  const area = picked?.area ?? (parts.find((a) => a === params.get('area')) || parts[0]);
  const subs = area ? PARTS[area].subareas : [];
  const sub = subs.find((s) => s.id === (picked ? picked.sub : params.get('sub'))) ?? subs[0];

  const parsed = useMemo(() => parsePasted(text), [text]);
  const preview = useMemo(
    () => (parsed.kind === 'questions' && area && sub ? previewQuiz(parsed.items, { id: 'quiz-new', area, subarea: sub.id }, nowIso()) : null),
    [parsed, area, sub],
  );

  if (!settings || !area || !sub) return <Page title="New quiz">{null}</Page>;
  const prompt = quizPrompt({ area, subject: sub.name, topic: topic.trim(), level: settings.level, major: settings.major, n });
  const back = `/quizzes/${area}/${sub.id}`;

  const pasteClipboard = async () => {
    setClipError('');
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      setClipError('The browser blocked clipboard access. Long-press the box below and choose Paste.');
    }
  };

  const save = async (start: boolean) => {
    if (parsed.kind !== 'questions') return;
    setBusy(true);
    const now = nowIso();
    const id = newQuizId(now);
    const { ready } = previewQuiz(parsed.items, { id, area, subarea: sub.id }, now);
    await importQuestions(ready);
    protectStorage(); // first real data: ask the browser not to evict it
    announce(`${sub.name} quiz saved with ${ready.length} questions`);
    navigate(start ? `/session?mode=quiz&quiz=${encodeURIComponent(id)}` : back);
  };

  return (
    <Page title="New quiz" back={{ to: back, label: `${sub.name} quizzes` }}>
      <section className="tile stack" aria-labelledby="nq-1">
        <h2 id="nq-1">1. Pick the subject</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="nq-area">Part</label>
            <Select id="nq-area" value={area} onChange={(v) => setPicked({ area: v as Area, sub: PARTS[v as Area].subareas[0].id })}>
              {parts.map((a) => (
                <option key={a} value={a}>
                  {PARTS[a].name}
                </option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label htmlFor="nq-sub">Subject</label>
            <Select id="nq-sub" value={sub.id} onChange={(v) => setPicked({ area, sub: v })}>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label htmlFor="nq-topic">Topic (optional)</label>
            <input id="nq-topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="nq-n">Number of questions</label>
            <Select id="nq-n" value={n} onChange={(v) => setN(Number(v))}>
              {[5, 10, 15, 20, 30].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
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
            className={btn.secondary}
            onClick={async () => {
              await copyText(prompt);
              announce('Prompt copied. Send it to Claude, then paste the reply below.');
            }}
          >
            Copy prompt
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
          <button type="button" className={btn.primary} disabled={!preview?.ready.length || busy} onClick={() => save(true)}>
            Save and take it
          </button>
          <button type="button" className={btn.secondary} disabled={!preview?.ready.length || busy} onClick={() => save(false)}>
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
