import { useState } from 'react';
import { Page } from '../../ui/Page';
import { Chip, StatusChip } from '../../ui/Chip';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { Stem } from '../../ui/Stem';
import { Dialog } from '../../ui/Dialog';
import { BubbleGrid } from '../../ui/BubbleGrid';
import { useAnnounce } from '../../ui/Status';
import { btn } from '../../ui/btn';

const CHOICES = [
  { key: 'A', text: 'Knowledge' },
  { key: 'B', text: 'Comprehension' },
  { key: 'C', text: 'Application' },
  { key: 'D', text: 'Evaluation' },
];

/** Every visual state on one page, for contrast and screen-reader checks (a11y N5). */
export function States() {
  const announce = useAnnounce();
  const [dialog, setDialog] = useState(false);
  const [value, setValue] = useState<string | null>('B');
  const [elim, setElim] = useState(new Set(['D']));
  const [sheet, setSheet] = useState<Record<string, string | null>>({ '1': 'A', '2': null });
  const setTheme = (t: string) => {
    const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.mode = dark ? 'dark' : 'light';
  };

  const group = (title: string, el: React.ReactNode) => (
    <section className="stack-sm">
      <h2 className="label">{title}</h2>
      {el}
    </section>
  );

  return (
    <Page title="States">
      <div className="row">
        {['system', 'light', 'dark'].map((t) => (
          <button key={t} className={btn.secondary} onClick={() => setTheme(t)}>
            Theme: {t}
          </button>
        ))}
      </div>

      {group(
        'Type',
        <div className="stack-sm">
          <p className="display num">74.2%</p>
          <Stem
            text={
              'Teacher Ana ends each unit by asking her Grade 6 class to compare two solutions to the same problem and defend the better one in writing. She grades the defence, not the choice.\n\nWhich level of Bloom\u2019s taxonomy is she assessing?'
            }
          />
          <p className="muted">Muted secondary text, 4.5:1 or better.</p>
          <p className="row">
            <span className="timer">01:59:42</span>
            <span className="mono">GE-1115-A</span>
          </p>
        </div>,
      )}

      {group(
        'Buttons',
        <div className="row">
          <button className={btn.primary}>Primary</button>
          <button className={btn.secondary}>Secondary</button>
          <button className={btn.quiet}>Quiet</button>
          <button className={btn.secondary} aria-pressed="true">
            Pressed
          </button>
          <button className={btn.secondary} disabled>
            Disabled
          </button>
        </div>,
      )}

      {group(
        'Chips',
        <div className="row">
          {['verified', 'unverified', 'needs-key', 'flagged'].map((s) => (
            <StatusChip key={s} status={s} />
          ))}
          <Chip solid>Review center</Chip>
        </div>,
      )}

      {group(
        'Choice: interactive (selected, eliminated)',
        <>
          <p id="st-q1">Interactive group. Use the arrow keys.</p>
          <ChoiceGroup
            name="st-q1"
            labelledBy="st-q1"
            choices={CHOICES}
            value={value}
            onChange={setValue}
            eliminated={elim}
            onToggleEliminate={(k) =>
              setElim((s) => {
                const n = new Set(s);
                if (n.has(k)) n.delete(k);
                else n.add(k);
                return n;
              })
            }
          />
        </>,
      )}

      {group(
        'Choice: checked, wrong pick',
        <>
          <p id="st-q2">Her pick was B, the answer is D.</p>
          <ChoiceGroup name="st-q2" labelledBy="st-q2" choices={CHOICES} value="B" locked correct="D" />
        </>,
      )}

      {group(
        'Choice: checked, correct pick',
        <>
          <p id="st-q3">Her pick was D, the answer is D.</p>
          <ChoiceGroup name="st-q3" labelledBy="st-q3" choices={CHOICES} value="D" locked correct="D" />
        </>,
      )}

      {group(
        'Choice: disabled',
        <>
          <p id="st-q4">Disabled group.</p>
          <ChoiceGroup name="st-q4" labelledBy="st-q4" choices={CHOICES} value={null} disabled />
        </>,
      )}

      {group(
        'Answer sheet',
        <BubbleGrid
          label="Sample answer sheet"
          count={4}
          answers={sheet}
          flags={[3]}
          current={2}
          withBlank
          onSelect={(n, k) => setSheet((s) => ({ ...s, [n]: k }))}
        />,
      )}

      {group(
        'Feedback and status',
        <div className="row">
          <button className={btn.secondary} onClick={() => setDialog(true)}>
            Open dialog
          </button>
          <button className={btn.secondary} onClick={() => announce('Imported 48 items')}>
            Show status message
          </button>
        </div>,
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} title="Submit exam? 12 unanswered, 5 flagged">
        <p className="muted">You can still change any answer.</p>
        <div className="row">
          <button className={btn.primary} data-autofocus onClick={() => setDialog(false)}>
            Keep answering
          </button>
          <button className={btn.secondary} onClick={() => setDialog(false)}>
            Submit now
          </button>
        </div>
      </Dialog>
    </Page>
  );
}
