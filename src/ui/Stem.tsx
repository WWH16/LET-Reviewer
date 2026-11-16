/**
 * Question text. A long item is a passage or scenario followed by the question itself, so blank lines
 * split it into paragraphs: they read at body weight, and the last one (the question) is set heavier.
 * A one-paragraph item is all question.
 */
export function Stem({ id, lang, text }: { id?: string; lang?: string; text: string }) {
  return (
    <div id={id} className="stem" lang={lang}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
