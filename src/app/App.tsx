import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { Page } from '../ui/Page';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/drill', label: 'Practice' },
  { to: '/mock', label: 'Mock' },
  { to: '/progress', label: 'Progress' },
  { to: '/bank', label: 'Bank' },
];

function Todo({ title }: { title: string }) {
  return (
    <Page title={title}>
      <p className="muted">This screen is not built yet.</p>
    </Page>
  );
}

export function App() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header className="top">
        <Link className="brand" to="/">
          LET Reviewer
        </Link>
        <Link className="label" to="/settings">
          Settings
        </Link>
      </header>
      <Routes>
        <Route path="/" element={<Todo title="Home" />} />
        <Route path="/drill" element={<Todo title="Practice" />} />
        <Route path="/session" element={<Todo title="Session" />} />
        <Route path="/review" element={<Todo title="Review" />} />
        <Route path="/mock" element={<Todo title="Mock exam" />} />
        <Route path="/mock/:id" element={<Todo title="Mock exam" />} />
        <Route path="/mock/:id/print" element={<Todo title="Print exam" />} />
        <Route path="/mock/:id/entry" element={<Todo title="Enter answers" />} />
        <Route path="/mock/:id/results" element={<Todo title="Exam results" />} />
        <Route path="/progress" element={<Todo title="Progress" />} />
        <Route path="/bank" element={<Todo title="Bank" />} />
        <Route path="/bank/import" element={<Todo title="Import" />} />
        <Route path="/bank/:id" element={<Todo title="Edit question" />} />
        <Route path="/settings" element={<Todo title="Settings" />} />
        <Route path="/states" element={<Todo title="States" />} />
        <Route path="*" element={<Todo title="Not found" />} />
      </Routes>
      <nav className="nav" aria-label="Main">
        <ul>
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
