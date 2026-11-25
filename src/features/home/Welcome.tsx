import { useState } from 'react';
import { Page } from '../../ui/Page';
import { saveSettings } from '../../db/repo';
import type { Level, Settings } from '../../domain/types';
import { ProfileEditor } from '../settings/ProfileEditor';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';

/**
 * Shown once, before anything else: who is reviewing, her avatar, and which LET she takes. Secondary
 * takers name their major here, so the Specialization part is ready from the start. All of it can be
 * changed later in Settings.
 */
export function Welcome({ settings }: { settings: Settings }) {
  const [level, setLevel] = useState<Level>(settings.level);
  const [major, setMajor] = useState(settings.major);
  const needsMajor = level === 'secondary' && !major.trim();

  return (
    <Page title="Welcome, LPT">
      <p className="muted">Set your name, avatar and the LET you are taking, then make your first quiz. All of it can change later in Settings.</p>
      <form
        className="stack-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (needsMajor) return;
          saveSettings({ onboarded: true, level, major: level === 'secondary' ? major.trim() : settings.major });
        }}
      >
        <ProfileEditor
          s={settings}
          footer={
            <>
              <fieldset className="stack-sm">
                <legend className="label">Your LET</legend>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="w-level">Level</label>
                    <Select id="w-level" value={level} onChange={(v) => setLevel(v as Level)}>
                      <option value="elementary">Elementary</option>
                      <option value="secondary">Secondary</option>
                    </Select>
                    <span className="meta">{level === 'secondary' ? 'Secondary adds your major as a third part.' : 'Pick Secondary if you take a major.'}</span>
                  </div>
                  {level === 'secondary' && (
                    <div className="field">
                      <label htmlFor="w-major">Major</label>
                      <input id="w-major" type="text" required placeholder="e.g. English" value={major} onChange={(e) => setMajor(e.target.value)} />
                    </div>
                  )}
                </div>
              </fieldset>
              <div className="welcome-action">
                <button type="submit" className={btn.primary} disabled={needsMajor}>
                  Start reviewing
                </button>
              </div>
            </>
          }
        />
      </form>
    </Page>
  );
}
