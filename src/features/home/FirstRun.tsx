import { Link } from 'react-router-dom';
import { useAnnounce } from '../../ui/Status';
import { loadSampleQuestions } from '../../db/repo';
import { CopyTemplateA } from '../bank/Bank';
import { btn } from '../../ui/btn';

/** Home when the bank is empty (DX R11): one job, add questions. */
export function FirstRun() {
  const announce = useAnnounce();
  return (
    <div className="stack-lg">
      <section className="stack" aria-labelledby="fr-title">
        <h2 id="fr-title">Add your first questions</h2>
        <ol className="stack-sm" style={{ paddingLeft: '1.25rem', margin: 0 }}>
          <li>Photograph one page of a review-center handout.</li>
          <li>Copy Template A, and send it to Claude with the photo. Fill in the handout name and page.</li>
          <li>Copy Claude&rsquo;s reply and paste it on the Import screen.</li>
        </ol>
        <div className="row">
          <CopyTemplateA />
          <Link className={btn.primary} to="/bank/import">
            Import questions
          </Link>
        </div>
      </section>
      <hr />
      <section className="stack-sm" aria-labelledby="fr-try">
        <h2 id="fr-try">Just looking?</h2>
        <p className="muted">Load 16 sample questions to try the app. You can remove them later from Bank.</p>
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
