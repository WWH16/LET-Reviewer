import { Link, Route, Routes, useLocation, useMatch } from 'react-router-dom';
import { Page } from '../ui/Page';
import { StatusProvider } from '../ui/Status';
import { Icon } from '../ui/Icon';
import { Home } from '../features/home/Home';
import { useMeta, useSettings } from '../db/hooks';
import { CommandMenu } from './CommandMenu';
import { PLACES, SETTINGS_PAGES } from './nav';
import { Welcome } from '../features/home/Welcome';
import { lazy, Suspense, useEffect } from 'react';
import { Skeleton } from '../ui/Skeleton';

// Study (the first screen) and Welcome load with the app; every other screen loads when first opened, so
// the date picker, the select menus and the exam screens stay out of the first download. The service
// worker precaches every chunk, so this costs nothing offline.
const EditQuestion = lazy(() => import('../features/quizzes/EditQuestion').then((m) => ({ default: m.EditQuestion })));
const Session = lazy(() => import('../features/practice/Session').then((m) => ({ default: m.Session })));
const Settings = lazy(() => import('../features/settings/Settings').then((m) => ({ default: m.Settings })));
const Progress = lazy(() => import('../features/progress/Progress').then((m) => ({ default: m.Progress })));
const MockSetup = lazy(() => import('../features/mock/MockSetup').then((m) => ({ default: m.MockSetup })));
const MockExam = lazy(() => import('../features/mock/MockExam').then((m) => ({ default: m.MockExam })));
const MockResults = lazy(() => import('../features/mock/MockResults').then((m) => ({ default: m.MockResults })));
const MockPrint = lazy(() => import('../features/mock/MockPrint').then((m) => ({ default: m.MockPrint })));
const MockEntry = lazy(() => import('../features/mock/MockEntry').then((m) => ({ default: m.MockEntry })));
const Quizzes = lazy(() => import('../features/quizzes/Quizzes').then((m) => ({ default: m.Quizzes })));
const Subject = lazy(() => import('../features/quizzes/Subject').then((m) => ({ default: m.Subject })));
const QuizPage = lazy(() => import('../features/quizzes/QuizPage').then((m) => ({ default: m.QuizPage })));
const NewQuiz = lazy(() => import('../features/quizzes/NewQuiz').then((m) => ({ default: m.NewQuiz })));
const Unfinished = lazy(() => import('../features/practice/Unfinished').then((m) => ({ default: m.Unfinished })));
const States = lazy(() => import('../features/states/States').then((m) => ({ default: m.States })));
import { Empty } from '../ui/Empty';
import { btn } from '../ui/btn';
import { EMPTY_STATE, requestSync, syncAvailable, type SyncState } from '../sync/trigger';
import { AccountSection } from '../features/settings/AccountSection';

function NotFound() {
  return (
    <Page title="Not found">
      <Empty icon="study" title="This page does not exist" text="The link may be old or mistyped.">
        <Link className={btn.primary} to="/">
          Back to Study
        </Link>
      </Empty>
    </Page>
  );
}

export function App() {
  const settings = useSettings();
  // A running mock exam (finished and printed ones redirect away from this route).
  const inExam = useMatch('/mock/:id') !== null;
  // A tab stays lit on the screens it leads to (Quizzes on a quiz session and a question's edit).
  const { pathname, search } = useLocation();

  // Signed in: bring this device up to date when the app opens and whenever the network comes back.
  useEffect(() => {
    const sync = () => requestSync();
    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

  // Signing in comes first: the app opens on the account form until she signs in or creates an account.
  // A build with no account service (no Supabase project) skips it and works on this device alone.
  const sync = useMeta<SyncState>('sync', EMPTY_STATE);
  if (syncAvailable && sync === undefined) return null;
  if (syncAvailable && !sync?.signedIn)
    return (
      <StatusProvider>
        <Page title="Sign in to LET Reviewer">
          <AccountSection required />
        </Page>
      </StatusProvider>
    );

  // Then, once: name, avatar, level and major, before the app itself. The shell stays out of the way until she is done.
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
              {PLACES.map((item) => {
                const on = item.here(pathname, search);
                return (
                  <li key={item.to} className={item.wideOnly ? 'only-wide' : item.narrowOnly ? 'only-narrow' : undefined}>
                    <Link to={item.to} aria-current={on ? 'page' : undefined}>
                      <Icon name={item.icon} size={20} filled={on} />
                      {item.short ? (
                        <>
                          <span className="only-wide">{item.label}</span>
                          <span className="only-narrow">{item.short}</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {/* Wide screens list the Settings pages themselves; phones reach them from the Settings tab. */}
            {/* As in Cloudflare's dashboard: Settings is one item with a chevron; its pages fold out beneath it,
                indented, and it opens by itself on a settings page. */}
            <details className="nav-group only-wide" open={pathname.startsWith('/settings') || undefined}>
              <summary>
                <Icon name="settings" size={18} filled={pathname.startsWith('/settings')} />
                Settings
                <Icon name="caret" size={14} />
              </summary>
              <ul>
                {SETTINGS_PAGES.map((pg) => (
                  <li key={pg.id}>
                    <Link to={`/settings/${pg.id}`} aria-current={pathname === `/settings/${pg.id}` ? 'page' : undefined}>
                      {pg.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </nav>
          <CommandMenu />
        </div>
      </header>
      <Suspense
        fallback={
          <main id="main">
            <Skeleton />
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session" element={<Session />} />
          <Route path="/unfinished" element={<Unfinished />} />
          <Route path="/mock" element={<MockSetup />} />
          <Route path="/mock/:id" element={<MockExam />} />
          <Route path="/mock/:id/print" element={<MockPrint />} />
          <Route path="/mock/:id/entry" element={<MockEntry />} />
          <Route path="/mock/:id/results" element={<MockResults />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/quizzes/new" element={<NewQuiz />} />
          <Route path="/quizzes/:area/:sub" element={<Subject />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/question/:id" element={<EditQuestion />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/:section" element={<Settings />} />
          <Route path="/states" element={<States />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </StatusProvider>
  );
}
