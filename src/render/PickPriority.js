/**
 * SC-25 pick priority: which of several ray hits a click actually means.
 *
 * Pure arithmetic over plain candidate records — no Three.js, no DOM, no camera.
 * That is the point: "which object did the user mean?" is a rule, and a rule that
 * only exists inside a raycast loop can be neither reviewed nor tested. The
 * Viewer measures; this decides; the reason code says which clause decided.
 *
 * The reviewed order lives in `data/render_style.json` → `titin.picking`
 * (`priority_order`) and is restated nowhere. It reads:
 *
 *   1. `explicit_target`                    — a label, legend entry, or keyboard
 *      target names the structure outright. A ray was not the question.
 *   2. `emphasized_titin_within_tolerance`  — the pointer is within the approved
 *      screen-space tolerance of the titin the Learn depth emphasises.
 *   3. `nearest_visible_surface`            — otherwise the nearest thing that is
 *      actually drawn at that pixel.
 *   4. `pick_proxy_only`                    — otherwise a hit area with no drawn
 *      surface behind it.
 *
 * Clause 2 is the load-bearing one and deserves its reasoning stated. A direct
 * ray hit on geometry has no "tolerance"; it either intersects or it does not.
 * The tolerance in the reviewed policy is therefore a property of titin's HIT
 * AREA — the screen-space continuity trace and the non-rendering proxy that
 * shadows it — so clause 2 asks "is the pointer within the approved tolerance of
 * the emphasised molecule?", and a proxy hit qualifies. Reading it the other way
 * (proxies excluded from clause 2) would leave the proxy able to win only where
 * nothing at all is drawn, which is precisely where titin was already easy to
 * hit, and would make the whole affordance inert across the A-band. Between two
 * hits at the same place, clause 2 still answers with the drawn molecule.
 *
 * Two properties this module is written to make provable rather than promised:
 *
 * - **Selection is inert.** `selected` is carried on every candidate because the
 *   plan's candidate record names it, and it is read by nothing. A resolution can
 *   therefore never become sticky: the same ray resolves the same way whether or
 *   not its answer is already pinned.
 * - **Decoration is unreachable.** Halos and other presentation-channel objects
 *   are already `raycast`-disabled in the scene. If one ever reaches this
 *   function anyway it is dropped and counted, never returned.
 */

/** Reason codes, in the reviewed priority order. */
export const PICK_REASON = Object.freeze({
  explicit_target: 'explicit_target',
  emphasized_titin: 'emphasized_titin_within_tolerance',
  nearest_visible_surface: 'nearest_visible_surface',
  pick_proxy_only: 'pick_proxy_only',
  no_target: 'no_target',
});

/** The order this module implements, for comparison against the reviewed record. */
export const PICK_PRIORITY_ORDER = Object.freeze([
  PICK_REASON.explicit_target,
  PICK_REASON.emphasized_titin,
  PICK_REASON.nearest_visible_surface,
  PICK_REASON.pick_proxy_only,
]);

/** Biological classes a candidate may carry. */
export const PICK_CLASS = Object.freeze({
  titin: 'titin',
  context: 'context',
  decorative: 'decorative',
});

const CLASSES = new Set(Object.values(PICK_CLASS));

/**
 * @typedef {object} PickCandidate
 * @property {'titin_region'|'component'} target_type canonical target vocabulary
 * @property {string} target_id canonical target identifier
 * @property {'titin'|'context'|'decorative'} biological_class
 * @property {boolean} pick_proxy whether the hit was a non-rendering hit area
 * @property {boolean} visible whether the hit geometry is currently drawn
 * @property {number} screen_distance_px pointer-to-candidate distance, CSS pixels
 * @property {number} ray_distance_nm distance along the ray to the hit
 * @property {boolean} [selected] whether this target is the current selection
 * @property {boolean} [mirrored] whether the hit was in the mirrored half
 * @property {string|null} [domain_id] canonical folded-domain instance, when picked
 * @property {number|null} [instance_id] instance index inside its batch
 * @property {string|null} [archetype] geometry archetype of a picked domain
 */

/**
 * @typedef {object} PickIntent
 * @property {{target_type:string, target_id:string}|null} [explicit_target]
 * @property {'titin'|null} [emphasis] which class the current depth emphasises
 * @property {number} [tolerance_px] approved screen-space tolerance for clause 2
 * @property {{target_type:string, target_id:string}|null} [selection] inert
 */

function requireCandidate(candidate, index) {
  const where = `resolvePick: candidate ${index}`;
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`${where} is not a record.`);
  }
  if (!['titin_region', 'component'].includes(candidate.target_type)) {
    throw new Error(`${where} has an unknown target_type '${candidate.target_type}'.`);
  }
  if (typeof candidate.target_id !== 'string' || !candidate.target_id) {
    throw new Error(`${where} has no canonical target_id.`);
  }
  if (!CLASSES.has(candidate.biological_class)) {
    throw new Error(`${where} has an unknown biological_class '${candidate.biological_class}'.`);
  }
  if (typeof candidate.pick_proxy !== 'boolean' || typeof candidate.visible !== 'boolean') {
    throw new Error(`${where} must state pick_proxy and visible as booleans.`);
  }
  for (const key of ['screen_distance_px', 'ray_distance_nm']) {
    if (!Number.isFinite(candidate[key]) || candidate[key] < 0) {
      throw new Error(`${where} has a non-finite or negative ${key}.`);
    }
  }
  return candidate;
}

/** Named comparators, each returning a lower-is-better number. */
const RANK = Object.freeze({
  screen: (candidate) => candidate.screen_distance_px,
  ray: (candidate) => candidate.ray_distance_nm,
  drawn: (candidate) => (candidate.pick_proxy ? 1 : 0),
});

/**
 * Ordering within one clause, by the measures that clause is actually about.
 *
 * The clauses ask different questions and must not share one answer. "What is in
 * front of the pointer" (clause 3) is a question about the RAY. "Which part of the
 * molecule is the pointer nearest" (clauses 2 and 4) is a question about the
 * SCREEN: ranking those by ray distance first lets a neighbouring region whose hit
 * area happens to lie a little closer to the camera win a click that landed
 * squarely on its neighbour — a region boundary that moves with the camera. For
 * the same reason `drawn` is a tie-break inside clause 2 rather than its first
 * key: preferring the drawn molecule is right between two hits at the same place,
 * and wrong when it means answering with a region 9 px away.
 *
 * Every remaining tie falls through to the canonical identifier, so two candidates
 * that are geometrically indistinguishable resolve the same way on every run and
 * every platform. Selection is deliberately absent from all of it: a tie broken by
 * "what is already pinned" is a sticky selection.
 *
 * @param {Array<'screen'|'ray'|'drawn'>} keys measures in deciding order
 */
function betterThan(candidate, incumbent, keys) {
  if (!incumbent) return true;
  for (const key of keys) {
    const a = RANK[key](candidate);
    const b = RANK[key](incumbent);
    if (a !== b) return a < b;
  }
  return candidate.target_id < incumbent.target_id;
}

function best(candidates, keys, accept) {
  let winner = null;
  for (const candidate of candidates) {
    if (!accept(candidate)) continue;
    if (betterThan(candidate, winner, keys)) winner = candidate;
  }
  return winner;
}

/**
 * Resolve one set of ray candidates to a single canonical target.
 *
 * @param {PickCandidate[]} candidates hits, in any order
 * @param {PickIntent} intent
 * @returns {{
 *   reason: string,
 *   target: PickCandidate|null,
 *   considered: number,
 *   dropped_decorative: number,
 *   titin_within_tolerance: number,
 * }}
 */
export function resolvePick(candidates, intent = {}) {
  if (!Array.isArray(candidates)) throw new Error('resolvePick: expected a candidate array.');
  const tolerancePx = Number(intent.tolerance_px);
  if (!Number.isFinite(tolerancePx) || tolerancePx < 0) {
    throw new Error('resolvePick: intent.tolerance_px must be a non-negative number.');
  }
  if (intent.emphasis !== undefined && intent.emphasis !== null
      && intent.emphasis !== PICK_CLASS.titin) {
    throw new Error(`resolvePick: unknown emphasis '${intent.emphasis}'.`);
  }
  const checked = candidates.map(requireCandidate);
  const usable = checked.filter((candidate) => candidate.biological_class !== PICK_CLASS.decorative);
  const droppedDecorative = checked.length - usable.length;
  const withinTolerance = usable.filter((candidate) => (
    candidate.visible
    && candidate.biological_class === PICK_CLASS.titin
    && candidate.screen_distance_px <= tolerancePx
  ));
  const report = {
    considered: checked.length,
    dropped_decorative: droppedDecorative,
    titin_within_tolerance: withinTolerance.length,
  };

  // 1. A named target. The pointer was never the question, so no ray result —
  //    including no ray result at all — can override it.
  const explicit = intent.explicit_target;
  if (explicit) {
    if (!['titin_region', 'component'].includes(explicit.target_type)
        || typeof explicit.target_id !== 'string' || !explicit.target_id) {
      throw new Error('resolvePick: intent.explicit_target is not a canonical target.');
    }
    return {
      ...report,
      reason: PICK_REASON.explicit_target,
      target: {
        target_type: /** @type {'titin_region'|'component'} */ (explicit.target_type),
        target_id: explicit.target_id,
        biological_class: explicit.target_type === 'titin_region'
          ? PICK_CLASS.titin : PICK_CLASS.context,
        pick_proxy: false,
        visible: true,
        screen_distance_px: 0,
        ray_distance_nm: 0,
      },
    };
  }

  // 2. The emphasised molecule, when the pointer is inside the approved
  //    tolerance of it. Occlusion deliberately does not veto this: the Learn
  //    continuity trace is drawn over its occluders on purpose, so "what is in
  //    front along the ray" is not what the reader sees at that pixel.
  if (intent.emphasis === PICK_CLASS.titin) {
    const emphasised = best(withinTolerance, ['screen', 'drawn', 'ray'], () => true);
    if (emphasised) return { ...report, reason: PICK_REASON.emphasized_titin, target: emphasised };
  }

  // 3. Whatever is actually drawn there, nearest first.
  const surface = best(usable, ['ray', 'screen'],
    (candidate) => candidate.visible && !candidate.pick_proxy);
  if (surface) return { ...report, reason: PICK_REASON.nearest_visible_surface, target: surface };

  // 4. A hit area with nothing drawn behind it.
  const proxy = best(usable, ['screen', 'ray'],
    (candidate) => candidate.visible && candidate.pick_proxy);
  if (proxy) return { ...report, reason: PICK_REASON.pick_proxy_only, target: proxy };

  return { ...report, reason: PICK_REASON.no_target, target: null };
}
