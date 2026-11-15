import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useQuestions } from '../../db/hooks';
import { FirstRun } from './FirstRun';

export function Home() {
  const questions = useQuestions();
  if (!questions) return <Page title="Home">{null}</Page>;
  if (!questions.length)
    return (
      <Page title="Home">
        <FirstRun />
      </Page>
    );
  return (
    <Page title="Home">
      <p>
        <span className="num">{questions.length}</span> questions in your bank.
      </p>
      <div className="row">
        <Link className="btn btn-primary" to="/drill">
          Start practice
        </Link>
      </div>
    </Page>
  );
}
