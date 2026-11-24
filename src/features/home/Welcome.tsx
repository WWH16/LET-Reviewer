import { Page } from '../../ui/Page';
import { saveSettings } from '../../db/repo';
import type { Settings } from '../../domain/types';
import { ProfileEditor } from '../settings/ProfileEditor';
import { btn } from '../../ui/btn';

/** Shown once, before anything else: who is reviewing, and her avatar. Both can be changed later in Settings. */
export function Welcome({ settings }: { settings: Settings }) {
  return (
    <Page title="Welcome, LPT">
      <p className="muted">Set your name and avatar, then make your first quiz. Both can change later in Settings.</p>
      <form
        className="stack-lg"
        onSubmit={(e) => {
          e.preventDefault();
          saveSettings({ onboarded: true });
        }}
      >
        <ProfileEditor
          s={settings}
          footer={
            <div className="welcome-action">
              <button type="submit" className={btn.primary}>
                Start reviewing
              </button>
            </div>
          }
        />
      </form>
    </Page>
  );
}
