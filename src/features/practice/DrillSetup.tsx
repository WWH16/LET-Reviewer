import { useEffect, useMemo, useState } from 'react';
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
  const last = useMeta<DrillParams | null>('lastDrill', null);
  const [p, setP] = useState<DrillParams | null>(null);
  const navigate = useNavigate();
  const announce = useAnnounce();

  useEffect(() => {
    if (p || last === undefined || !settings) return;
    setP(last ?? { area: partsFor(settings.level)[0], sub: '', topic: '', n: 20, ai: false });
  }, [last, settings, p]);

  const topics = useMemo(() => {
    if (!p) return [];
    const s = new Set((questions ?? []).filter((q) => q.area === p.area && (!p.sub || q.subarea === p.sub) && q.topic).map((q) => q.topic));
    return [...s].sort();
  }, [questions, p]);

  if (!p || !questions || !settings) return <Page title="Practice">{null}</Page>;

  const available = questions.filter((q) => drillMatches(q, p)).length;
  const set = (patch: Partial<DrillParams>) => setP({ ...p, ...patch });

  const start = async () => {
    await setMeta('lastDrill', p);
    navigate(drillUrl(p));
  };

  return (
    <Page title="Practice">
      <div className="row">
        <Link className="btn" to="/session?mode=quick">
          Quick 10
        </Link>
        <Link className="btn" to="/review">
          Review mistakes
        </Link>
      </div>

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (available) start();
        }}
      >
        <h2>Drill by topic</h2>
        <div className="field">
          <label htmlFor="d-area">Part</label>
          <select id="d-area" value={p.area} onChange={(e) => set({ area: e.target.value as Area, sub: '', topic: '' })}>
            {partsFor(settings.level).map((a) => (
              <option key={a} value={a}>
                {PARTS[a].name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d-sub">Sub-area</label>
          <select id="d-sub" value={p.sub} onChange={(e) => set({ sub: e.target.value, topic: '' })}>
            <option value="">All sub-areas</option>
            {PARTS[p.area].subareas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d-topic">Topic</label>
          <select id="d-topic" value={p.topic} onChange={(e) => set({ topic: e.target.value })}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d-n">Number of questions</label>
          <select id="d-n" value={p.n} onChange={(e) => set({ n: Number(e.target.value) })}>
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
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

        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={!available}>
            Start
          </button>
          <button
            type="button"
            className="btn"
            disabled={!p.sub}
            onClick={async () => {
              await copyText(
                templateB({ area: p.area, subarea: subareaName(p.sub), topic: p.topic, level: settings.level, major: settings.major }),
              );
              announce('Prompt copied. Paste it into Claude with your notes.');
            }}
          >
            Copy prompt
          </button>
        </div>
        {!p.sub && <p className="muted">Choose a sub-area to copy a prompt for new questions.</p>}
      </form>
    </Page>
  );
}
