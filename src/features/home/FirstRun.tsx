import { Link } from 'react-router-dom';
import { useAnnounce } from '../../ui/Status';
import { loadSampleQuestions } from '../../db/repo';
import { btn } from '../../ui/btn';

/** Study before any questions (DX R11): one job, make the first quiz. */
export function FirstRun() {
  const announce = useAnnounce();
  return (
    <div className="stack-lg">
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
      <hr />
      <section className="stack-sm" aria-labelledby="fr-try">
        <h2 id="fr-try">Just looking?</h2>
        <p className="muted">Load 16 sample questions to try the app. They arrive as quizzes you can remove later.</p>
        <div>
          <button
            type="button"
            className={btn.secondary}
            onClick={async () => announce(`Loaded ${await loadSampleQuestions()} sample questions`)}
          >
            Load sample questions
          </button>
        </div>
      </section>
    </div>
  );
}
