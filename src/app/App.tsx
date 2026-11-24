import { Link, Navigate, Route, Routes, useLocation, useMatch } from 'react-router-dom';
import { Page } from '../ui/Page';
import { StatusProvider } from '../ui/Status';
import { Icon } from '../ui/Icon';
import { Home } from '../features/home/Home';
import { useSettings } from '../db/hooks';
import { CommandMenu } from './CommandMenu';
import { PLACES, SETTINGS_PAGES } from './nav';
import { Welcome } from '../features/home/Welcome';
import { lazy, Suspense, useEffect } from 'react';
import { Skeleton } from '../ui/Skeleton';

// Study (the first screen) and Welcome load with the app; every other screen loads when first opened, so
// the date picker, the select menus and the exam screens stay out of the first download. The service
// worker precaches every chunk, so this costs nothing offline.
const Bank = lazy(() => import('../features/bank/Bank').then((m) => ({ default: m.Bank })));
const Import = lazy(() => import('../features/bank/Import').then((m) => ({ default: m.Import })));
const EditQuestion = lazy(() => import('../features/bank/EditQuestion').then((m) => ({ default: m.EditQuestion })));
const DrillSetup = lazy(() => import('../features/practice/DrillSetup').then((m) => ({ default: m.DrillSetup })));
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
const Missed = lazy(() => import('../features/practice/Missed').then((m) => ({ default: m.Missed })));
const States = lazy(() => import('../features/states/States').then((m) => ({ default: m.States })));
import { Empty } from '../ui/Empty';
import { btn } from '../ui/btn';
import { requestSync } from '../sync/trigger';

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
  // A tab stays lit on the screens it leads to (Quizzes on a quiz session, Missed questions on a review).
  const { pathname, search } = useLocation();
  const textSize = settings?.textSize;
  useEffect(() => {
    if (!textSize) return;
    document.documentElement.style.fontSize = `${textSize}%`;
    // Mirrored for the inline script in index.html, which applies it before the first paint.
    try {
      localStorage.setItem('let-display', JSON.stringify({ textSize }));
    } catch {
      /* storage blocked: the next load just applies it a moment later */
    }
  }, [textSize]);

  // Signed in: bring this device up to date when the app opens and whenever the network comes back.
  useEffect(() => {
    const sync = () => requestSync();
    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

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
            <h2 className="nav-group only-wide" id="nav-settings">
              Settings
            </h2>
            <ul className="only-wide" aria-labelledby="nav-settings">
              {SETTINGS_PAGES.map((pg) => (
                <li key={pg.id}>
                  <Link to={`/settings/${pg.id}`} aria-current={pathname === `/settings/${pg.id}` ? 'page' : undefined}>
                    {pg.label}
                  </Link>
                </li>
              ))}
            </ul>
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
          <Route path="/drill" element={<DrillSetup />} />
          <Route path="/session" element={<Session />} />
          <Route path="/missed" element={<Missed />} />
          <Route path="/review" element={<Navigate to="/missed" replace />} />
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
          <Route path="/bank" element={<Bank />} />
          <Route path="/bank/import" element={<Import />} />
          <Route path="/bank/:id" element={<EditQuestion />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/:section" element={<Settings />} />
          <Route path="/states" element={<States />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </StatusProvider>
  );
}
