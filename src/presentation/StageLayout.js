/**
 * SC-11 stage composition arithmetic.
 *
 * Pure functions with no DOM and no Three.js, so the composition rules that
 * decide whether a figure reads correctly are unit-testable rather than being
 * inferred from a screenshot. The page imports these; it does not restate them.
 */

/**
 * Framing and overlay constants.
 *
 * `frame_margin_factor` is why the default view stopped looking unfitted: 1.35
 * left the structure occupying three quarters of the width in a frame that is
 * mostly empty anyway, because a sarcomere is ~2,200 nm long and ~50 nm across.
 */
export const STAGE_LAYOUT = Object.freeze({
  frame_margin_factor: 1.12,
  vertical_bias_fraction: 0.08,
  min_region_view_span_nm: 140,
  bracket_lane_gap_px: 18,
  bracket_drop_tick_px: 8,
  card_gap_px: 24,
  edge_padding_px: 8,
  // Rungs laid along the sarcomere axis to measure the projection's local scale.
  // 64 puts them ~34 nm apart on a 2,200 nm sarcomere, so even the tightest
  // declared close-up (200 nm) contains several adjacent pairs to choose from.
  scale_bar_rungs: 64,
});

/** Vertical offsets of the three bracket lanes, measured down from the lane origin. */
export const BRACKET_LANE_OFFSETS = Object.freeze({ major: 0, minor: 24, marker: 45 });

const LANE_STACK_PX = BRACKET_LANE_OFFSETS.marker;

/**
 * Y coordinate of the topmost bracket lane, in container-local CSS pixels.
 *
 * Anchored to the projected model rather than to the page header, so the labels
 * stay attached to the thing they measure at every camera distance.
 *
 * @param {Array<{y_px:number, visible:boolean}>} projected
 * @param {{canvasHeight:number, safeTopPx:number}} opts
 * @returns {number}
 */
export function bracketLaneY(projected, { canvasHeight, safeTopPx }) {
  const tops = (projected || [])
    .filter((point) => point && point.visible && Number.isFinite(point.y_px))
    .map((point) => point.y_px);
  if (!tops.length) return safeTopPx + STAGE_LAYOUT.bracket_lane_gap_px;
  const modelTop = Math.min(...tops);
  const lane = modelTop - STAGE_LAYOUT.bracket_lane_gap_px - LANE_STACK_PX;
  const floor = Math.max(safeTopPx, 0);
  const ceiling = Math.max(floor, canvasHeight - LANE_STACK_PX - 24);
  return Math.max(floor, Math.min(lane, ceiling));
}

/**
 * Screen scale of the sarcomere axis, in CSS pixels per nanometre.
 *
 * A perspective projection makes this a function of depth, so there is no single
 * number for the whole scene: at a 280 nm close-up the near and far ends of the
 * sarcomere differ by tens of percent. The rungs are axis points carried through
 * the overlay's own projection, and the pair used is the one whose screen
 * midpoint is nearest `centreXPx`, so the ruler describes the scale where the
 * subject actually is rather than an average of the whole model.
 *
 * Returns null when no adjacent pair is on screen. A ruler stating a wrong
 * number is worse than no ruler, so the caller draws nothing in that case.
 *
 * @param {Array<{x_nm:number, x_px:number, visible:boolean}>} rungs ascending in x_nm
 * @param {{centreXPx:number}} opts
 * @returns {number|null}
 */
export function axisPxPerNm(rungs, { centreXPx }) {
  let best = null;
  for (let i = 1; i < rungs.length; i += 1) {
    const near = rungs[i - 1];
    const far = rungs[i];
    // Both ends on screen: a rung behind the camera projects to a mirrored x,
    // and pairing with one would report a scale that is not merely imprecise.
    if (!near?.visible || !far?.visible) continue;
    const spanNm = far.x_nm - near.x_nm;
    const spanPx = Math.abs(far.x_px - near.x_px);
    if (!(spanNm > 0) || !Number.isFinite(spanPx) || spanPx <= 0) continue;
    const offset = Math.abs((near.x_px + far.x_px) / 2 - centreXPx);
    if (!best || offset < best.offset) best = { offset, px_per_nm: spanPx / spanNm };
  }
  return best ? best.px_per_nm : null;
}

/** The 1-2-5 sequence: spans a viewer can hold without doing arithmetic. */
const SCALE_BAR_MANTISSAS = Object.freeze([1, 2, 5]);

/** `1234 nm` reads worse than `1.234 µm`; the measurement is identical. */
function formatSpanNm(nm) {
  return nm >= 1000 ? `${Number((nm / 1000).toFixed(3))} µm` : `${Number(nm.toFixed(3))} nm`;
}

/**
 * A round bar span for the current projection, and the length to draw it at.
 *
 * `px` is `nm * pxPerNm` exactly. That is the whole discipline of the thing, and
 * the same one SC-6 applied to the d10 dimension line: the drawn length must BE
 * the measurement, not a tidied pixel count carrying a label that claims it.
 *
 * The largest 1-2-5 span that fits the budget is used. Because that sequence
 * never leaves a gap wider than 2.5x, the result is never shorter than 0.4 of
 * the budget, so a budget of 100 px or more cannot produce a bar below the 40 px
 * readability floor.
 *
 * @param {number} pxPerNm CSS pixels per nanometre where the bar is measured
 * @param {number} maxPx pixel budget for the bar
 * @returns {{nm:number, px:number, label:string}}
 */
export function scaleBar(pxPerNm, maxPx) {
  if (!Number.isFinite(pxPerNm) || pxPerNm <= 0 || !Number.isFinite(maxPx) || maxPx <= 0) {
    throw new Error(
      `scaleBar: expected positive finite inputs, got ${pxPerNm} px/nm and a ${maxPx} px budget`,
    );
  }
  const decade = Math.floor(Math.log10(maxPx / pxPerNm));
  let nm = 10 ** (decade - 1);
  for (let power = decade - 1; power <= decade + 1; power += 1) {
    for (const mantissa of SCALE_BAR_MANTISSAS) {
      const candidate = mantissa * 10 ** power;
      // Compared in pixels, not nanometres, so the budget cannot be exceeded by
      // a rounding error in the division that produced it.
      if (candidate * pxPerNm <= maxPx) nm = candidate;
    }
  }
  return { nm, px: nm * pxPerNm, label: formatSpanNm(nm) };
}

/**
 * Place a pinned explanation card so it never covers its own anchor.
 *
 * @param {{
 *   anchor: {x_px:number, y_px:number},
 *   card: {width:number, height:number},
 *   canvas: {width:number, height:number},
 *   safeTopPx: number,
 *   gapPx?: number,
 * }} opts
 * @returns {{left:number, top:number, side:'left'|'right', overlaps_anchor:boolean}}
 */
export function inspectorPlacement({
  anchor, card, canvas, safeTopPx, gapPx = STAGE_LAYOUT.card_gap_px,
}) {
  const pad = STAGE_LAYOUT.edge_padding_px;
  /** @param {number} left */
  const fits = (left) => left >= pad && left + card.width <= canvas.width - pad;
  const toLeft = anchor.x_px - card.width - gapPx;
  const toRight = anchor.x_px + gapPx;
  // Prefer the side with more room; fall back to the other before clamping, so
  // a clamp is the last resort rather than the first behaviour.
  const preferred = anchor.x_px > canvas.width / 2 ? toLeft : toRight;
  const alternate = preferred === toLeft ? toRight : toLeft;
  let left = fits(preferred) ? preferred : (fits(alternate) ? alternate : preferred);
  left = Math.max(pad, Math.min(canvas.width - card.width - pad, left));
  let top = anchor.y_px - card.height / 2;
  top = Math.max(safeTopPx, Math.min(canvas.height - card.height - pad, top));
  const overlapsAnchor = anchor.x_px >= left && anchor.x_px <= left + card.width
    && anchor.y_px >= top && anchor.y_px <= top + card.height;
  return {
    left,
    top,
    side: /** @type {'left'|'right'} */ (left > anchor.x_px ? 'right' : 'left'),
    overlaps_anchor: overlapsAnchor,
  };
}
