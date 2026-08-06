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
