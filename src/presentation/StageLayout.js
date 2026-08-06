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
  // Horizontal room one band label needs to itself. Measured from the shipped
  // .science-label style: 9 px semibold, and the longest bracket label,
  // "M-band center", is ~78 px wide with its halo stroke. Two labels closer
  // together than this collide, which is the case the occlusion rule exists for.
  label_box_px: 88,
});

/** Viewport classes the reviewed attention budget distinguishes. */
const BUDGET_KEY = Object.freeze({
  desktop: 'guided_secondary_context_labels_desktop_max',
  mobile: 'guided_secondary_context_labels_mobile_max',
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
 * The labels a guided frame is allowed to draw, in priority order.
 *
 * `data/showcase_claims.json` has declared an attention budget since SC-0 and
 * `scripts/validate_showcase_claims.py` pins it byte-for-byte — but nothing ever
 * checked the RENDER against it, and Guided mode drew all six band brackets at
 * every viewport. At 375 px they stacked into three overlapping rows and the
 * last one clipped off the right edge. A reviewed declaration the product
 * ignores is worse than no declaration.
 *
 * The budget is READ from that record and never restated here, so this function
 * cannot drift from the reviewed numbers and cannot be satisfied by editing a
 * constant in the layout module.
 *
 * Two rules, in the record's own order:
 *   1. `label_priority` — keep the highest-priority `n` for the viewport class;
 *   2. `occlusion_rule` — "hide a lower-priority label before allowing overlap",
 *      so a survivor whose box would collide with an already-kept, higher-
 *      priority box is dropped rather than drawn on top of it.
 *
 * Obstruction of the highlighted titin path, the rule's third clause, is
 * prevented by construction rather than here: {@link bracketLaneY} puts the
 * whole lane above the projected model.
 *
 * Evidence mode is deliberately exempt. The budget's own key is
 * `guided_secondary_context_labels_*`; Evidence is where a specialist asks for
 * everything at once, and clipping it there would be a regression, not a fix.
 *
 * @template {{id:string, priority:number, x:number, widthPx?:number}} T
 * @param {T[]} candidates
 * @param {'desktop'|'mobile'} viewportClass derived from the canvas width, not
 *   from a media query, so a narrow desktop window is governed like a phone
 * @param {Record<string, unknown>} budget `showcaseClaims.attention_budget`
 * @param {{audience?: string}} [opts]
 * @returns {T[]} the labels to draw, highest priority first
 */
export function labelBudget(candidates, viewportClass, budget, { audience = 'guided' } = {}) {
  const ordered = [...(candidates || [])].sort((a, b) => a.priority - b.priority);
  if (audience === 'evidence') return ordered;
  const key = BUDGET_KEY[viewportClass];
  if (!key) {
    throw new Error(
      `labelBudget: unknown viewport class '${viewportClass}'; expected `
      + `${Object.keys(BUDGET_KEY).join(' or ')}`,
    );
  }
  // Deliberately not Number(): Number(null) is 0, which would turn a missing
  // record into a silent "draw nothing" instead of a visible failure.
  const declared = budget?.[key];
  const max = typeof declared === 'number' ? declared : NaN;
  if (!Number.isInteger(max) || max < 0) {
    throw new Error(
      `labelBudget: the attention budget record has no integer '${key}'; `
      + 'refusing to draw an unbounded label set',
    );
  }
  const kept = [];
  for (const candidate of ordered) {
    if (kept.length >= max) break;
    const half = ((candidate.widthPx ?? STAGE_LAYOUT.label_box_px)) / 2;
    const collides = kept.some((other) => (
      Math.abs(other.x - candidate.x) < half + (other.widthPx ?? STAGE_LAYOUT.label_box_px) / 2
    ));
    if (!collides) kept.push(candidate);
  }
  return kept;
}

/**
 * Fraction of the model that has to be in view for band brackets to mean
 * anything. Below it a bracket is a line whose ends are both off-screen.
 */
const BRACKET_LANE_MIN_COVERAGE = 0.5;

/**
 * Whether the bracket lane should hold band brackets at this camera span.
 *
 * @param {number|null} cameraSpanNm width of the view, in nanometres
 * @param {number} modelSpanNm axial extent of the model being labelled
 * @returns {boolean}
 */
export function bracketLaneVisible(cameraSpanNm, modelSpanNm) {
  const span = Number(cameraSpanNm);
  const model = Number(modelSpanNm);
  if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(model) || model <= 0) return false;
  return span >= model * BRACKET_LANE_MIN_COVERAGE;
}

/**
 * Where the current close-up is looking, as a fraction of the whole model.
 *
 * The brackets are suppressed when the camera is too close for them to mean
 * anything — correctly, and observably: chapters 3, 4 and 5 of the tour draw
 * none. The result was that at exactly the moment a viewer most needs to know
 * where they are, the page told them least: chapter 3 frames a 70 nm PEVK
 * segment, chapter 4 a ~200 nm Z-disc, chapter 5 the C-zone, each arriving as an
 * unlabelled field with no relationship to the molecule the previous chapter
 * introduced.
 *
 * This adds no chrome. The locator occupies the lane the brackets vacate and is
 * drawn only when they are not — {@link bracketLaneVisible} is the single
 * decision both consult, which is why they cannot both appear or both vanish.
 *
 * @param {number|null} cameraSpanNm width of the view, in nanometres
 * @param {number} cameraCentreNm axial position the camera is looking at
 * @param {number} modelSpanNm axial extent of the model, from x = 0
 * @returns {{from01:number, to01:number, visible:boolean}}
 */
export function locatorExtent(cameraSpanNm, cameraCentreNm, modelSpanNm) {
  const span = Number(cameraSpanNm);
  const centre = Number(cameraCentreNm);
  const model = Number(modelSpanNm);
  const measurable = Number.isFinite(span) && span > 0
    && Number.isFinite(centre) && Number.isFinite(model) && model > 0;
  if (!measurable) return { from01: 0, to01: 1, visible: false };
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  return {
    from01: clamp01((centre - span / 2) / model),
    to01: clamp01((centre + span / 2) / model),
    visible: !bracketLaneVisible(span, model),
  };
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
 * SC-12 added the stage control bar along that same bottom rule, so the rule is
 * no longer at a fixed height: `bottomInsetPx` is how much of the stage the bar
 * occupies, measured in the page rather than assumed here, because the bar wraps
 * to more rows as the viewport narrows. It defaults to the bare stage's own
 * baseline, so a caller with no bar — and every existing test — is unaffected.
 *
 * @param {{
 *   barPx: number,
 *   canvas: {width:number, height:number},
 *   card: {top:number, right:number, bottom:number}|null,
 *   safeTopPx: number,
 *   bottomInsetPx?: number,
 * }} opts
 * @returns {{left:number, baseline:number}} container-local CSS pixels
 */
export function scaleBarPlacement({
  barPx, canvas, card, safeTopPx, bottomInsetPx = STAGE_LAYOUT.scale_bar_baseline_px,
}) {
  const pad = STAGE_LAYOUT.edge_padding_px + 4;
  const inset = Number.isFinite(bottomInsetPx) && bottomInsetPx > 0
    ? bottomInsetPx : STAGE_LAYOUT.scale_bar_baseline_px;
  const baseline = canvas.height - inset;
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
