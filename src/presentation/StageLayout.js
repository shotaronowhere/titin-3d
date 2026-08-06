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
  // Declared by the SC-11 plan for a vertical framing bias and deliberately NOT
  // consumed. Nothing reads it because a fixed bias is the wrong shape for the
  // problem: how far the model should sit above centre depends on whether the
  // guided chapter card is on the stage, and Evidence mode, which has no card,
  // wants it centred. Kept as the declared value so a later task that solves
  // that properly has the plan's number to start from.
  vertical_bias_fraction: 0.08,
  min_region_view_span_nm: 140,
  bracket_lane_gap_px: 18,
  bracket_drop_tick_px: 8,
  card_gap_px: 24,
  edge_padding_px: 8,
  // Height of the stage's bottom rule, where the ruler and the orbit hint live.
  scale_bar_baseline_px: 42,
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
 * Screen scale of the stage, in CSS pixels per nanometre.
 *
 * `viewSpanNm` is the width of the scene at the depth the camera is looking at,
 * so this number is a property of the CAMERA and not of anything in the scene.
 * That is the whole point. Deriving it instead from how far apart two model
 * points land on screen sounds more direct and is wrong: it measures the
 * projection of that interval, which collapses as the interval turns toward the
 * camera. Down the filament axis that method labelled a 96 px rule
 * "50000000000000 µm".
 *
 * @param {number|null} viewSpanNm scene width at the orbit target, or null
 * @param {number} viewportPx canvas width in CSS pixels
 * @returns {number|null} null when the stage has no measurable scale
 */
export function stagePxPerNm(viewSpanNm, viewportPx) {
  if (!Number.isFinite(viewSpanNm) || Number(viewSpanNm) <= 0) return null;
  if (!Number.isFinite(viewportPx) || viewportPx <= 0) return null;
  return viewportPx / Number(viewSpanNm);
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
 * Where the scale bar can sit without being covered or wandering.
 *
 * The stage's bottom rule is the conventional home for a ruler, but the guided
 * chapter card owns the bottom-left corner and its height is set by the
 * chapter's copy — chapter 7's pipeline card is several times the height of
 * chapter 1's. Placing the bar simply above the card therefore made it jump
 * vertically on every Next, which is exactly the wrong behaviour for the one
 * thing on screen a viewer uses as a fixed reference.
 *
 * So: the bottom rule, beside the card when the bar fits there; only when it
 * does not — a phone, where the card is nearly the full width — does the bar
 * move above the card, and never under the page header.
 *
 * @param {{
 *   barPx: number,
 *   canvas: {width:number, height:number},
 *   card: {top:number, right:number, bottom:number}|null,
 *   safeTopPx: number,
 * }} opts
 * @returns {{left:number, baseline:number}} container-local CSS pixels
 */
export function scaleBarPlacement({ barPx, canvas, card, safeTopPx }) {
  const pad = STAGE_LAYOUT.edge_padding_px + 4;
  const baseline = canvas.height - STAGE_LAYOUT.scale_bar_baseline_px;
  if (!card || card.bottom <= baseline - pad) return { left: pad, baseline };
  const beside = card.right + pad;
  if (beside + barPx <= canvas.width - pad) return { left: beside, baseline };
  return { left: pad, baseline: Math.max(safeTopPx + 20, card.top - pad) };
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
