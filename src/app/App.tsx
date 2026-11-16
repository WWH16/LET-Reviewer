import { Link, Navigate, NavLink, Route, Routes, useMatch } from 'react-router-dom';
import { Page } from '../ui/Page';
import { StatusProvider } from '../ui/Status';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { States } from '../features/states/States';
import { Home } from '../features/home/Home';
import { Bank } from '../features/bank/Bank';
import { Import } from '../features/bank/Import';
import { EditQuestion } from '../features/bank/EditQuestion';
import { DrillSetup } from '../features/practice/DrillSetup';
import { Session } from '../features/practice/Session';
import { Settings } from '../features/settings/Settings';
import { Progress } from '../features/progress/Progress';
import { MockSetup } from '../features/mock/MockSetup';
import { MockExam } from '../features/mock/MockExam';
import { MockResults } from '../features/mock/MockResults';
import { MockPrint } from '../features/mock/MockPrint';
import { MockEntry } from '../features/mock/MockEntry';
import { useSettings } from '../db/hooks';
import { CommandMenu } from './CommandMenu';
import { Welcome } from '../features/home/Welcome';
import { useEffect } from 'react';

const NAV = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/drill', label: 'Practice', icon: 'practice' },
  { to: '/mock', label: 'Mock', icon: 'mock' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/bank', label: 'Bank', icon: 'bank' },
] as const;

function NotFound() {
  return (
    <Page title="Not found">
      <p>
        This page does not exist. <Link to="/">Go to Home</Link>
      </p>
    </Page>
  );
}

export function App() {
  const settings = useSettings();
  // A running mock exam (finished and printed ones redirect away from this route).
  const inExam = useMatch('/mock/:id') !== null;
  const theme = settings?.theme;
  const textSize = settings?.textSize;
  useEffect(() => {
    if (!theme || !textSize) return;
    const root = document.documentElement;
    root.style.fontSize = `${textSize}%`;
    // Mirrored for the inline script in index.html, which applies both before the first paint.
    try {
      localStorage.setItem('let-display', JSON.stringify({ theme, textSize }));
    } catch {
      /* storage blocked: the next load just applies them a moment later */
    }
    // Kumo switches light and dark on data-mode; "system" follows the device and keeps following it.
    if (theme !== 'system') {
      root.dataset.mode = theme;
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => (root.dataset.mode = media.matches ? 'dark' : 'light');
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [theme, textSize]);

  // First launch: name and avatar before the app itself. The shell stays out of the way until she is done.
  if (settings && !settings.onboarded)
    return (
      <StatusProvider>
        <Welcome settings={settings} />
      </StatusProvider>
    );

  return (
    <StatusProvider>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header className={inExam ? 'shell-top in-exam' : 'shell-top'}>
        <div className="top">
          <Link className="brand" to="/" aria-label="LET Reviewer, home">
            <span className="brand-mark" aria-hidden="true" />
            LET Reviewer
          </Link>
          <nav className="nav" aria-label="Main">
            <ul>
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.to === '/'}>
                    <Icon name={item.icon} size={22} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <CommandMenu />
          <NavLink className="top-settings" to="/settings">
            {settings ? <Avatar who={settings} size={24} /> : <Icon name="settings" size={18} />}
            {settings?.name.trim() ? (
              <>
                <span className="top-name">{settings.name.trim()}</span>
                <span className="sr-only">, Settings</span>
              </>
            ) : (
              'Settings'
            )}
          </NavLink>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/drill" element={<DrillSetup />} />
        <Route path="/session" element={<Session />} />
        <Route path="/review" element={<Navigate to="/session?mode=review" replace />} />
        <Route path="/mock" element={<MockSetup />} />
        <Route path="/mock/:id" element={<MockExam />} />
        <Route path="/mock/:id/print" element={<MockPrint />} />
        <Route path="/mock/:id/entry" element={<MockEntry />} />
        <Route path="/mock/:id/results" element={<MockResults />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/bank" element={<Bank />} />
        <Route path="/bank/import" element={<Import />} />
        <Route path="/bank/:id" element={<EditQuestion />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/states" element={<States />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </StatusProvider>
  );
}
