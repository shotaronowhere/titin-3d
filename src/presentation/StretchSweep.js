/**
 * SC-12 stretch sweep.
 *
 * A pure function of elapsed time, so the demo motion is testable without a
 * timer, a browser, or a frame loop. The caller owns requestAnimationFrame and
 * therefore owns cancellation, which is what makes the sweep interruptible.
 *
 * It is a TRIANGLE, not a sine: the ends are the two states an audience is
 * being asked to compare, so the sweep spends its time travelling between them
 * rather than lingering at the midpoint.
 */
export const SWEEP = Object.freeze({
  period_ms: 6000,
  /** Reduced-motion users get the endpoints without the travel. */
  reduced_motion_period_ms: 2000,
});

/**
 * Sarcomere length at a point in the sweep.
 *
 * @param {number} elapsedMs
 * @param {{minNm:number, maxNm:number, periodMs?:number}} bounds
 * @returns {number} integer nanometres
 */
export function sweepLength(elapsedMs, { minNm, maxNm, periodMs = SWEEP.period_ms }) {
  if (!(periodMs > 0)) throw new Error('sweepLength: periodMs must be positive');
  if (!Number.isFinite(minNm) || !Number.isFinite(maxNm) || maxNm <= minNm) {
    throw new Error(`sweepLength: expected minNm < maxNm, got ${minNm}..${maxNm}`);
  }
  const phase = (((elapsedMs % periodMs) + periodMs) % periodMs) / periodMs;
  const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  return Math.round(minNm + (maxNm - minNm) * triangle);
}
