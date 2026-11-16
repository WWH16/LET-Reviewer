import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useAnnounce } from '../../ui/Status';
import { copyText } from '../../ui/clipboard';
import { useMeta, useQuestions, useSettings } from '../../db/hooks';
import { setMeta } from '../../db/repo';
import { PARTS, partsFor, subareaName } from '../../domain/let-config';
import { gradable } from '../../domain/examDraw';
import { templateB } from '../../domain/prompts';
import type { Area, Question } from '../../domain/types';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';
import { useStats } from '../progress/useStats';

export interface DrillParams {
  area: Area;
  sub: string;
  topic: string;
  n: number;
  ai: boolean;
}

export const drillUrl = (p: DrillParams) =>
  `/session?${new URLSearchParams({ mode: 'drill', area: p.area, sub: p.sub, topic: p.topic, n: String(p.n), ai: p.ai ? '1' : '0' })}`;

export function drillMatches(q: Question, p: Pick<DrillParams, 'area' | 'sub' | 'topic' | 'ai'>) {
  return (
    gradable(q) &&
    q.area === p.area &&
    (!p.sub || q.subarea === p.sub) &&
    (!p.topic || q.topic === p.topic) &&
    (p.ai || q.source === 'review-center')
  );
}

export function DrillSetup() {
  const questions = useQuestions();
  const settings = useSettings();
  const stats = useStats();
  const due = stats?.due.length;
  const last = useMeta<DrillParams | null>('lastDrill', null);
  const [edited, setP] = useState<DrillParams | null>(null);
  const navigate = useNavigate();
  const announce = useAnnounce();

  // Until she changes a field, the form shows the last drill, or the first part of her level.
  const p: DrillParams | null =
    edited ?? (last === undefined || !settings ? null : (last ?? { area: partsFor(settings.level)[0], sub: '', topic: '', n: 20, ai: false }));
  const area = p?.area;
  const sub = p?.sub;

  const topics = useMemo(() => {
    if (!area) return [];
    const s = new Set((questions ?? []).filter((q) => q.area === area && (!sub || q.subarea === sub) && q.topic).map((q) => q.topic));
    return [...s].sort();
  }, [questions, area, sub]);

  // Waits for the due count too, so Review mistakes never flashes its empty state first.
  if (!p || !questions || !settings || !stats) return <Page title="Practice">{null}</Page>;

  const available = questions.filter((q) => drillMatches(q, p)).length;
  const set = (patch: Partial<DrillParams>) => setP({ ...p, ...patch });

  const start = async () => {
    await setMeta('lastDrill', p);
    navigate(drillUrl(p));
  };

  return (
    <Page title="Practice">
      {/* The two one-tap sessions are whole tiles; the drill below is the one that needs choices. */}
      <div className="bento">
        <Link className="tile tile-action pair span-3" to="/session?mode=quick">
          <span className="tile-title">Quick 10</span>
          <span className="meta">Due reviews first, then a random mix.</span>
        </Link>
        {due ? (
          <Link className="tile tile-action pair span-3" to="/review">
            <span className="tile-title">Review mistakes</span>
            <span className="meta">{due} due today.</span>
          </Link>
        ) : (
          <div className="tile tile-quiet pair span-3">
            <span className="tile-title">Review mistakes</span>
            <span className="meta">{due === 0 ? 'Nothing due today. Missed questions come back the next day.' : ''}</span>
          </div>
        )}
      </div>

      <form
        className="tile"
        onSubmit={(e) => {
          e.preventDefault();
          if (available) start();
        }}
      >
        <h2>Drill by topic</h2>
        <div className="field">
          <label htmlFor="d-area">Part</label>
          <Select id="d-area" value={p.area} onChange={(v) => set({ area: v as Area, sub: '', topic: '' })}>
            {partsFor(settings.level).map((a) => (
              <option key={a} value={a}>
                {PARTS[a].name}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="d-sub">Sub-area</label>
          <Select id="d-sub" value={p.sub} onChange={(v) => set({ sub: v, topic: '' })}>
            <option value="">All sub-areas</option>
            {PARTS[p.area].subareas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="d-topic">Topic</label>
          <Select id="d-topic" value={p.topic} onChange={(v) => set({ topic: v })}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="d-n">Number of questions</label>
          <Select id="d-n" value={p.n} onChange={(v) => set({ n: Number(v) })}>
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <label className="check">
          <input type="checkbox" checked={p.ai} onChange={(e) => set({ ai: e.target.checked })} />
          Include AI questions (shown as Unverified)
        </label>

        <p role="status">
          {available
            ? `${available} question${available === 1 ? '' : 's'} match.${available < p.n ? ` The drill will have ${available}.` : ''}`
            : p.ai
              ? 'No questions match. Choose another sub-area or topic.'
              : 'No review-center questions match. Include AI questions or choose another sub-area.'}
        </p>

        <div>
          <button type="submit" className={btn.primary} disabled={!available}>
            Start
          </button>
        </div>
        {/* Making new questions is the bank's job; it is offered here only once a sub-area names what to ask for. */}
        {p.sub && (
          <div className="row">
            <span className="muted">Need more questions here?</span>
            <button
              type="button"
              className={btn.quiet}
              onClick={async () => {
                await copyText(
                  templateB({ area: p.area, subarea: subareaName(p.sub), topic: p.topic, level: settings.level, major: settings.major }),
                );
                announce('Prompt copied. Paste it into Claude with your notes.');
              }}
            >
              Copy a prompt for Claude
            </button>
          </div>
        )}
      </form>
    </Page>
  );
}
