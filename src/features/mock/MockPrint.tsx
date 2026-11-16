import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useExam, useExamQuestions } from '../../db/hooks';
import { PARTS } from '../../domain/let-config';
import { KEYS, type PaperSize } from '../../domain/types';
import { CORNERS, SHEET, TOP_MARK, bubbleAt, numberAt } from '../../domain/sheet';
import { btn } from '../../ui/btn';

const at = (x: number, y: number) => ({ left: `${x}mm`, top: `${y}mm` });

const PAGE_SIZE: Record<PaperSize, { css: string; name: string }> = {
  a4: { css: 'A4', name: 'A4' },
  letter: { css: 'letter', name: 'Letter (8.5×11)' },
  folio: { css: '8.5in 13in', name: 'Folio (8.5×13)' },
};

/**
 * Booklet, answer sheet, and optional key, laid out with print CSS (plan §8.3).
 * The browser's own print dialog makes the PDF or sends it to a printer.
 */
export function MockPrint() {
  const { id } = useParams();
  const exam = useExam(id);
  const qmap = useExamQuestions(exam);
  if (!exam || !qmap) return <Page title="Print exam">{null}</Page>;

  const paper = exam.paper ?? { size: 'a4' as const, columns: 2 as const, large: false, answerKey: true };
  const size = PAGE_SIZE[paper.size];
  const items = exam.itemIds.map((qid, i) => ({ n: i + 1, q: qmap.get(qid) }));
  const minutes = Math.round(exam.timeLimitMin ?? PARTS[exam.part].minutes);

  return (
    <Page title={`Print ${exam.label}`} wide>
      <style>{`@page { size: ${size.css}; margin: 10mm; @bottom-center { content: "${exam.label}, page " counter(page) " of " counter(pages); font: 9pt sans-serif; } }`}</style>

      <div className="stack no-print">
        <p>
          {PARTS[exam.part].name}, {items.length} items, {minutes} minutes. Printed on {size.name}, {paper.columns} column
          {paper.columns > 1 ? 's' : ''}
          {paper.large ? ', large print' : ''}
        </p>
        <p className="notice">In the print dialog, set the paper size to {size.name} and margins to Default. Choose Save as PDF to print at a shop.</p>
        <div className="row">
          <button type="button" className={btn.primary} onClick={() => window.print()}>
            Print
          </button>
          <Link className={btn.secondary} to={`/mock/${exam.id}/entry`}>
            Enter answers
          </Link>
        </div>
        <p className="label">Preview</p>
      </div>

      <div className={`paper${paper.large ? ' large' : ''}`}>
        <section className="page" aria-label="Test booklet">
          <header style={{ marginBottom: '1em' }}>
            <div className="spread">
              <span className="exam-id">{exam.label}</span>
              <span>
                {PARTS[exam.part].name}, {items.length} items, {minutes} minutes
              </span>
            </div>
            <p style={{ marginTop: '0.5em' }}>
              Choose the best answer for each item. Shade the matching bubble on the answer sheet. Do not write on this booklet.
            </p>
          </header>
          <div className={`items${paper.columns === 2 ? ' cols-2' : ''}`}>
            {items.map(({ n, q }) =>
              q ? (
                <div className="p-item" key={n} lang={q.lang}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    <strong>{n}.</strong> {q.stem}
                  </div>
                  {q.media && <div>[Figure: {q.media.alt}]</div>}
                  <ol>
                    {q.choices.map((c) => (
                      <li key={c.key}>
                        {c.key}. {c.text}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="p-item" key={n}>
                  <strong>{n}.</strong> (removed from bank)
                </div>
              ),
            )}
          </div>
        </section>

        <section className="page" aria-label="Answer sheet">
          <div className="spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2>Answer sheet</h2>
              <p style={{ marginTop: '0.75em' }}>
                Name <span className="blank-line" />
              </p>
              <p style={{ marginTop: '0.5em' }}>
                Date <span className="blank-line" />
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="exam-id">{exam.label}</div>
              <div>
                {PARTS[exam.part].name}, {items.length} items
              </div>
            </div>
          </div>
          <p style={{ marginTop: '0.75em' }}>Shade one bubble per item, completely. Erase cleanly to change an answer. Keep the black squares clean: the app reads the sheet from them.</p>
          <div className="p-sheet" style={{ width: `${SHEET.w}mm`, height: `${SHEET.h}mm` }}>
            {[...CORNERS, TOP_MARK].map(([x, y]) => (
              <span className="p-mark" key={`${x},${y}`} style={at(x, y)} />
            ))}
            {items.map(({ n }) => (
              <Fragment key={n}>
                <span className="p-num" style={at(numberAt(n).x, numberAt(n).y)}>
                  {n}
                </span>
                {KEYS.map((k, i) => (
                  <span className="p-bubble" key={k} style={at(bubbleAt(n, i).x, bubbleAt(n, i).y)}>
                    {k}
                  </span>
                ))}
              </Fragment>
            ))}
          </div>
        </section>

        {paper.answerKey && (
          <section className="page" aria-label="Answer key">
            <h2>
              Answer key for {exam.label} <span style={{ fontWeight: 400 }}>(fold away until you finish)</span>
            </h2>
            <div className="p-key" style={{ margin: '1em 0' }}>
              {items.map(({ n, q }) => (
                <span key={n}>
                  {n}. {q?.answer ?? 'none'}
                </span>
              ))}
            </div>
            <div className="p-expl">
              {items.map(({ n, q }) =>
                q?.explanation ? (
                  <p key={n} lang={q.lang}>
                    <strong>{n}.</strong> {q.explanation}
                  </p>
                ) : null,
              )}
            </div>
          </section>
        )}
      </div>
    </Page>
  );
}
