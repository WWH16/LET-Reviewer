import type { ReactNode } from 'react';
import { Icon } from '../../ui/Icon';
import { PARTS, PASSING_AVERAGE, PART_FLOOR } from '../../domain/let-config';
import type { Rating } from '../../domain/scoring';

/**
 * Projected rating with both passing rules spelled out in words (plan §2 goal 3).
 * `warned` is a part the screen has already said is under the floor (a mock's own result), so it is not said twice.
 */
export function RatingCard({
  rating,
  warned,
  inverse,
  className = '',
  children,
}: {
  rating: Rating;
  warned?: string;
  /** The screen's one dark mass (Progress), when the rating is what the screen is for. */
  inverse?: boolean;
  /** Bento placement from the screen. */
  className?: string;
  /** A line about where the figure comes from (Mock results). */
  children?: ReactNode;
}) {
  const belowFloor = rating.belowFloor.filter((a) => a !== warned);
  const names = (list: string[]) => list.map((a) => PARTS[a as keyof typeof PARTS].name).join(' and ');
  return (
    <section className={`tile rating ${inverse ? 'tile-inverse' : ''} ${className}`} aria-labelledby="rating-title">
      <div className="stack-sm">
        <h2 id="rating-title" className="label">
          Projected LET rating
        </h2>
        {rating.rating === null ? (
          <p>Answer at least 20 questions in {names(rating.missing)} to see it.</p>
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
      </div>
      {(belowFloor.length > 0 || rating.nearFloor.length > 0) && (
        <div className="stack-sm">
          {belowFloor.length > 0 && (
            <p className="rating-warn">
              <Icon name="alert" />
              {names(belowFloor)} {belowFloor.length > 1 ? 'are' : 'is'} below {PART_FLOOR}%. Any part under {PART_FLOOR}% fails the
              exam, whatever the average.
            </p>
          )}
          {rating.nearFloor.length > 0 && (
            <p className="rating-warn">
              <Icon name="alert" />
              {names(rating.nearFloor)} {rating.nearFloor.length > 1 ? 'are' : 'is'} close to the {PART_FLOOR}% floor.
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
