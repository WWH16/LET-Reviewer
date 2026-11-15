import { Icon } from '../../ui/Icon';
import { PARTS, PASSING_AVERAGE, PART_FLOOR } from '../../domain/let-config';
import type { Rating } from '../../domain/scoring';

/** Projected rating with both passing rules spelled out in words (plan §2 goal 3). */
export function RatingCard({ rating }: { rating: Rating }) {
  const names = (list: string[]) => list.map((a) => PARTS[a as keyof typeof PARTS].name).join(' and ');
  return (
    <section className="card stack-sm" aria-labelledby="rating-title">
      <h2 id="rating-title" className="label">
        Projected LET rating
      </h2>
      {rating.rating === null ? (
        <p>Not enough answers yet. Answer at least 20 questions in {names(rating.missing)} to see a rating.</p>
      ) : (
        <>
          <p className="display num">{rating.rating.toFixed(1)}%</p>
          <p>
            {rating.passes
              ? `At or above ${PASSING_AVERAGE}%, with no part below ${PART_FLOOR}%.`
              : rating.rating < PASSING_AVERAGE
                ? `Below the ${PASSING_AVERAGE}% passing average.`
                : `Average passes, but a part is below ${PART_FLOOR}%.`}
          </p>
        </>
      )}
      {rating.belowFloor.length > 0 && (
        <p className="rating-warn">
          <Icon name="alert" />
          {names(rating.belowFloor)} {rating.belowFloor.length > 1 ? 'are' : 'is'} below {PART_FLOOR}%. Any part under {PART_FLOOR}% fails the
          exam, whatever the average.
        </p>
      )}
      {rating.nearFloor.length > 0 && (
        <p className="rating-warn">
          <Icon name="alert" />
          {names(rating.nearFloor)} {rating.nearFloor.length > 1 ? 'are' : 'is'} close to the {PART_FLOOR}% floor.
        </p>
      )}
    </section>
  );
}
