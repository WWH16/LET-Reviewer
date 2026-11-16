import { useState } from 'react';
import { useAnnounce } from '../../ui/Status';
import { copyText } from '../../ui/clipboard';
import { useSettings } from '../../db/hooks';
import { PARTS, partsFor } from '../../domain/let-config';
import { templateB } from '../../domain/prompts';
import type { Area } from '../../domain/types';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';

/**
 * Builds the prompt that asks Claude for new questions (Template B) and shows it before it is copied.
 * Claude's reply comes back through the paste box on this same screen.
 */
export function PromptBuilder() {
  const settings = useSettings();
  const announce = useAnnounce();
  const [picked, setPicked] = useState<{ area: Area; sub: string } | null>(null);
  const [topic, setTopic] = useState('');
  const [n, setN] = useState(10);
  if (!settings) return null;

  const area = picked?.area ?? partsFor(settings.level)[0];
  const subareas = PARTS[area].subareas;
  const sub = subareas.find((s) => s.id === picked?.sub) ?? subareas[0];
  const prompt = templateB({ area, subarea: sub.name, topic: topic.trim(), level: settings.level, major: settings.major, n });

  return (
    <details>
      <summary className="label">Need new questions? Build a prompt for Claude</summary>
      <div className="stack" style={{ marginTop: 'var(--space-md)' }}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pb-area">Part</label>
            <Select id="pb-area" value={area} onChange={(v) => setPicked({ area: v as Area, sub: '' })}>
              {partsFor(settings.level).map((a) => (
                <option key={a} value={a}>
                  {PARTS[a].name}
                </option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label htmlFor="pb-sub">Sub-area</label>
            <Select id="pb-sub" value={sub.id} onChange={(v) => setPicked({ area, sub: v })}>
              {subareas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label htmlFor="pb-topic">Topic (optional)</label>
            <input id="pb-topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pb-n">Number of questions</label>
            <Select id="pb-n" value={n} onChange={(v) => setN(Number(v))}>
              {[5, 10, 20, 30].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pb-prompt">Prompt</label>
          <textarea id="pb-prompt" className="mono" readOnly rows={12} value={prompt} />
        </div>
        <p className="muted">Paste your notes where the prompt says so, send it to Claude, then paste the reply in the box above.</p>
        <div>
          <button
            type="button"
            className={btn.secondary}
            onClick={async () => {
              await copyText(prompt);
              announce('Prompt copied. Paste it into Claude with your notes.');
            }}
          >
            Copy prompt
          </button>
        </div>
      </div>
    </details>
  );
}
