import { Link } from 'react-router-dom';
import { btn } from '../../ui/btn';

/** Study before any questions (DX R11): one job, make the first quiz. */
export function FirstRun() {
  return (
    <section className="stack" aria-labelledby="fr-title">
      <h2 id="fr-title">Make your first quiz</h2>
      <ol className="stack-sm" style={{ paddingLeft: '1.25rem', margin: 0 }}>
        <li>Pick a part and a subject, like General Education, English.</li>
        <li>Copy the prompt the app writes and send it to Claude.</li>
        <li>Paste Claude&rsquo;s reply back, then take the quiz.</li>
      </ol>
      <div className="row">
        <Link className={btn.primary} to="/quizzes/new">
          Make a quiz
        </Link>
      </div>
    </section>
  );
}
