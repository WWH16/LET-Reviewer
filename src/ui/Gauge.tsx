/** The LET's two lines: 75% average passes, and no part may fall under 50%. */
export const scoreTone = (pct: number) => (pct >= 75 ? 'is-pass' : pct >= 50 ? 'is-mid' : 'is-low');

const R = 52;
const ARC = 0.75; // three quarters of a circle, open at the bottom
const LEN = 2 * Math.PI * R * ARC;

/**
 * A ring gauge for one percentage, one near-black arc on the yellow block whatever the score.
 * The number is the accessible text; the ring is decoration.
 */
export function Gauge({ pct, label }: { pct: number | null; label: string }) {
  const value = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="gauge">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="gauge-track" cx="60" cy="60" r={R} strokeDasharray={`${LEN} 999`} />
        {pct !== null && <circle className="gauge-fill" cx="60" cy="60" r={R} strokeDasharray={`${(LEN * value) / 100} 999`} />}
      </svg>
      <p className="gauge-text">
        <span className="gauge-figure num">{pct === null ? '–' : `${Math.round(value)}%`}</span>
        <span className="gauge-label">{label}</span>
      </p>
    </div>
  );
}
