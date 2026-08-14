/**
 * SC-1 presentation state and deterministic URL codec.
 *
 * This module owns no geometry. It validates presentation records against IDs
 * supplied by the scientific model and turns a compact URL hash into biological
 * state. Unknown values are returned as explicit issues with documented
 * fallbacks; they are never silently reinterpreted.
 */

export const AUDIENCE_MODES = Object.freeze({ guided: 'guided', evidence: 'evidence' });

const PRESENTATION_SCHEMA = 'titin-presentation/2';
const SCENES_SCHEMA = 'titin-semantic-scenes/1';

const EVIDENCE_RANK = Object.freeze({
  MEASURED: 0,
  'STRONGLY INFERRED': 1,
  MODELED: 2,
  INFERRED: 3,
  SCHEMATIC: 4,
  UNKNOWN: 5,
});

const URL_KEYS = Object.freeze([
  'mode', 'step', 'sl', 'scale', 'camera', 'target', 'evidence',
]);

const PRESENTATION_FEATURES = new Set([
  'continuity_trace', 'band_brackets', 'termini', 'region_extension_chart',
  // SC-6. Admitted for both audiences, so a guided chapter may request the
  // orthographic lattice comparison rather than it being Evidence-only.
  'lattice_cross_section',
  // SC-7. The closing chapter's counted, inspectable build pipeline.
  'provenance_pipeline',
]);

const SCENE_LAYERS = new Set([
  'show_lattice', 'show_domains', 'show_context_detail', 'mirror',
]);

const SCENE_FIELDS = new Set([
  'label', 'available_in', 'camera_preset', 'scale', 'context', 'layers',
  'selection', 'length_policy', 'claim_ids', 'source_filter',
]);

const SCENE_EVIDENCE_VALUES = new Set(Object.keys(EVIDENCE_RANK));

const CHAPTER_REQUIRED_FIELDS = Object.freeze([
  'id', 'legacy_ids', 'title', 'learning_objective', 'lay_summary', 'claim_ids',
  'semantic_scene_id', 'source_filter', 'state_change_announcement',
  'recommended_state', 'next_actions',
]);

const SC23_CHAPTER_IDS = Object.freeze([
  'meet_sarcomere', 'follow_titin', 'molecular_architecture', 'stretch_spring',
  'inspect_anchors', 'scaffold_thick_filament', 'knowledge_recap',
]);

const SC23_CONCEPT_PATTERNS = Object.freeze({
  meet_sarcomere: [
    /repeating contractile unit.*Z-discs/is,
    /adenosine triphosphate \(ATP\).*myosin.*actin/is,
    /titin.*passive spring.*scaffold.*not the motor/is,
  ],
  follow_titin: [/Z-disc.*M-line/is, /I-band.*elastic.*A-band.*thick filament/is],
  molecular_architecture: [
    /immunoglobulin-like \(Ig\)/i, /fibronectin type III \(Fn3\)/i,
    /disordered PEVK spring/i, /does not place Fn3.*elastic I-band/is,
  ],
  stretch_spring: [
    /I-band lengthens.*A-band.*approximately fixed/is,
    /model predicts rising passive force/is,
    /added length.*incremental compliance.*how readily/is,
  ],
  inspect_anchors: [/telethonin.*not the sole force path/is, /M-line.*unresolved/is],
  scaffold_thick_filament: [
    /A-band.*thick filament.*scaffold/is, /copy number.*azimuth.*register.*not encoded/is,
  ],
  knowledge_recap: [
    /full Z-disc-to-M-line route/is,
    /passive spring.*scaffold.*interaction\/signaling platform/is,
    /Measured comes from observations.*inferred from interpretation.*modeled from equations.*schematic means illustrative/is,
    /Replay the stretch.*inspect a region.*open its evidence/is,
  ],
});

/**
 * SC-7. Expert cards must separate what is established from what is proposed and
 * what is open, because the plan's gate is about that distinction rather than
 * about how carefully the prose hedges.
 */
const FINDING_STATUSES = new Set(['ESTABLISHED', 'PROPOSED', 'OPEN']);

/** Sentence count used by the "one main idea, not a dense paragraph" gate. */
function sentences(text) {
  return String(text || '').split(/[.!?](?=\s|$)/).map((part) => part.trim()).filter(Boolean);
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function targetValue(value) {
  return value === null || value === '' || value === 'none' ? null : String(value);
}

function baseEvidence(value) {
  const label = String(value || '').trim();
  return Object.keys(EVIDENCE_RANK)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => label.startsWith(candidate)) || null;
}

/**
 * Cross-file SC-1 contract validation used by SpecLoader. The Python validator
 * independently mirrors these rules, so browser runtime and CI fail closed.
 * @param {any} presentation
 * @param {any} context
 */
export function checkPresentationSpec(presentation, context = {}) {
  const {
    claims, claimSupport, references, sarcomere, titin, states, annotations, scenes,
  } = context;
  const problems = [];
  if (!presentation || typeof presentation !== 'object') {
    return ['presentation.json missing or not an object'];
  }
  if (presentation.schema !== PRESENTATION_SCHEMA || presentation.version !== 2) {
    problems.push(`presentation schema '${presentation.schema}' is unsupported`);
  }
  const collections = [
    ['audience mode', presentation.audience_modes],
    ['scope badge', presentation.scope_badges],
    ['length preset', presentation.length_presets],
    ['guided chapter', presentation.guided_chapters],
    // SC-5. Expert cards are Evidence-mode explanatory records. They are required,
    // not optional: the showcase must be able to say why an admitted layer is
    // schematic and what was deliberately not imported.
    ['expert card', presentation.expert_cards],
    ['presenter shortcut', presentation.presenter_shortcuts],
  ];
  const globallySeen = new Map();
  for (const [kind, records] of collections) {
    if (!Array.isArray(records) || !records.length) {
      problems.push(`presentation ${kind} records are missing or empty`);
      continue;
    }
    const local = new Set();
    for (const record of records) {
      if (!record?.id) problems.push(`presentation ${kind} is missing an id`);
      else if (local.has(record.id)) problems.push(`duplicate ${kind} id '${record.id}'`);
      else {
        local.add(record.id);
        if (globallySeen.has(record.id)) {
          problems.push(`presentation id '${record.id}' duplicates a ${globallySeen.get(record.id)}`);
        } else globallySeen.set(record.id, kind);
      }
      if (record && kind === 'audience mode' && (!record.label || !record.description)) {
        problems.push(`audience mode '${record.id}' needs a label and description`);
      }
    }
  }

  const modeIds = new Set((presentation.audience_modes || []).map((record) => record.id));
  for (const required of Object.values(AUDIENCE_MODES)) {
    if (!modeIds.has(required)) problems.push(`presentation audience mode '${required}' is missing`);
  }

  const claimMap = new Map((claims?.objects || []).map((claim) => [claim.id, claim]));
  const supportMap = new Map((claimSupport?.claims || []).map((claim) => [claim.id, claim]));
  // The two opening-thesis records may be approved either by named independent
  // review or by the explicitly provenance-bearing project-owner evidence path.
  // Until both are approved, the presentation must remain visibly blocked.
  const contentReviewClaims = ['sarcomere_definition', 'actomyosin_motor_function'];
  const pendingContentReview = contentReviewClaims.filter(
    (id) => supportMap.get(id)?.review?.status !== 'APPROVED',
  );
  if (pendingContentReview.length
      && presentation.meta?.status !== 'CODE_COMPLETE_BLOCKED_CONTENT_REVIEW') {
    problems.push(
      `presentation content review is pending for ${pendingContentReview.join(', ')}; `
      + "meta.status must be 'CODE_COMPLETE_BLOCKED_CONTENT_REVIEW'",
    );
  } else if (!pendingContentReview.length && presentation.meta?.status !== 'COMPLETE') {
    problems.push("approved SC-23 content requires meta.status 'COMPLETE'");
  }
  const referenceIds = new Set(Object.keys(references || {}));
  const componentIds = new Set((sarcomere?.components || []).map((component) => component.id));
  // Titin is specified in titin.json rather than sarcomere.components, but it is
  // a first-class selectable render component in the presentation vocabulary.
  componentIds.add('titin');
  // The selectable vocabulary the runtime actually offers is broader than
  // sarcomere.components: myosin heads, folded domains, the Z-disc details and the
  // C-zone context are each pickable and separately annotated. annotations.json
  // carries exactly one record per pickable component (SC-4 pins that equality
  // against the renderer), so it is the data-resident form of that vocabulary —
  // without it, narrative could not target a structure a user can click.
  for (const record of annotations?.components || []) componentIds.add(record.target_id);
  const regionIds = new Set((titin?.regions || []).map((region) => region.id));
  const stateMap = new Map(Object.entries(states?.states || {}));
  const scopeRange = presentation.scope?.working_range_nm;
  if (!Array.isArray(scopeRange) || scopeRange.length !== 2
      || !scopeRange.every(Number.isFinite) || scopeRange[0] >= scopeRange[1]) {
    problems.push('presentation working_range_nm must contain increasing finite bounds');
  }
  if (presentation.scope?.activation_independent !== true
      || !presentation.scope?.activation_statement) {
    problems.push('presentation must explicitly keep sarcomere length independent of activation');
  }

  const validateScientificRecord = (record, kind) => {
    const targetClaim = claimMap.get(record.target_claim_id);
    if (!targetClaim) problems.push(`${kind} '${record.id}' cites unknown target claim '${record.target_claim_id}'`);
    else if (!String(targetClaim.decision || '').startsWith('ADMIT')) {
      problems.push(`${kind} '${record.id}' targets non-admitted claim '${record.target_claim_id}'`);
    }
    const evidence = baseEvidence(record.evidence_class);
    if (!evidence) problems.push(`${kind} '${record.id}' has an invalid evidence class '${record.evidence_class}'`);
    const targetEvidence = baseEvidence(targetClaim?.claim_evidence_class);
    if (evidence && targetEvidence && EVIDENCE_RANK[evidence] < EVIDENCE_RANK[targetEvidence]) {
      problems.push(`${kind} '${record.id}' is stronger (${evidence}) than target claim '${record.target_claim_id}' (${targetEvidence})`);
    }
    const sources = record.source_ids || [];
    if (!sources.length && evidence !== 'SCHEMATIC') {
      problems.push(`${kind} '${record.id}' has scientific text but no source_ids or SCHEMATIC designation`);
    }
    for (const source of sources) {
      if (!referenceIds.has(source)) problems.push(`${kind} '${record.id}' cites unknown source '${source}'`);
    }
  };
  validateScientificRecord(presentation.scope || {}, 'scope');
  for (const badge of presentation.scope_badges || []) {
    validateScientificRecord(badge, 'scope badge');
    if (!badge.label_ref || badge.label_ref !== 'scientific_scope.json#/public_badge'
        || !badge.state_template) {
      problems.push(`scope badge '${badge.id}' needs the canonical label_ref and state_template`);
    }
  }

  const presetStates = new Set();
  for (const preset of presentation.length_presets || []) {
    validateScientificRecord(preset, 'length preset');
    const state = stateMap.get(preset.structural_state_id);
    if (!state) problems.push(`length preset '${preset.id}' cites unknown state '${preset.structural_state_id}'`);
    else if (state.sarcomere_length_nm !== preset.sarcomere_length_nm) {
      problems.push(`length preset '${preset.id}' length does not match state '${preset.structural_state_id}'`);
    }
    if (presetStates.has(preset.structural_state_id)) {
      problems.push(`structural state '${preset.structural_state_id}' has duplicate presentation presets`);
    }
    presetStates.add(preset.structural_state_id);
    const outside = Array.isArray(scopeRange)
      && (preset.sarcomere_length_nm < scopeRange[0] || preset.sarcomere_length_nm > scopeRange[1]);
    if (preset.outside_working_range !== outside) {
      problems.push(`length preset '${preset.id}' has an incorrect outside_working_range flag`);
    }
    if (outside && !String(preset.status_label || '').includes('OUTSIDE WORKING RANGE')) {
      problems.push(`length preset '${preset.id}' does not visibly label its out-of-range status`);
    }
    if (preset.activation_independent !== true || !preset.explanation) {
      problems.push(`length preset '${preset.id}' does not explicitly separate geometry from activation`);
    }
    if (!preset.label || !preset.status_label) {
      problems.push(`length preset '${preset.id}' needs visible label and status text`);
    }
  }
  for (const stateId of stateMap.keys()) {
    if (!presetStates.has(stateId)) problems.push(`state '${stateId}' has no presentation length preset`);
  }

  const chapterOrders = new Set();
  for (const chapter of presentation.guided_chapters || []) {
    for (const field of CHAPTER_REQUIRED_FIELDS) {
      if (!Object.hasOwn(chapter, field)) {
        problems.push(`guided chapter '${chapter.id}' lacks required field '${field}'`);
      }
    }
    validateScientificRecord(chapter, 'guided chapter');
    if (!Number.isInteger(chapter.order) || chapterOrders.has(chapter.order)) {
      problems.push(`guided chapter '${chapter.id}' has a missing or duplicate integer order`);
    }
    chapterOrders.add(chapter.order);
    if (!Array.isArray(chapter.legacy_ids)) {
      problems.push(`guided chapter '${chapter.id}' legacy_ids must be an array`);
    }
    if (!String(chapter.learning_objective || '').trim()) {
      problems.push(`guided chapter '${chapter.id}' needs a learning objective`);
    }
    if (!String(chapter.expected_learner_takeaway || '').trim()) {
      problems.push(`guided chapter '${chapter.id}' needs an expected learner takeaway`);
    }
    if (chapter.narration !== chapter.lay_summary) {
      problems.push(`guided chapter '${chapter.id}' narration must be the canonical lay summary`);
    }
    if (!Array.isArray(chapter.claim_ids) || !chapter.claim_ids.length
        || new Set(chapter.claim_ids).size !== chapter.claim_ids.length) {
      problems.push(`guided chapter '${chapter.id}' needs unique canonical claim_ids`);
    } else {
      for (const claimId of chapter.claim_ids) {
        if (!supportMap.has(claimId)) {
          problems.push(`guided chapter '${chapter.id}' cites unknown canonical claim '${claimId}'`);
        }
      }
      if (!chapter.claim_ids.includes(chapter.target_claim_id)) {
        problems.push(`guided chapter '${chapter.id}' claim_ids omit its target claim`);
      }
    }
    const sourceFilter = chapter.source_filter || {};
    if (sourceFilter.kind !== 'claims'
        || JSON.stringify(sourceFilter.claim_ids) !== JSON.stringify(chapter.claim_ids)) {
      problems.push(`guided chapter '${chapter.id}' source_filter must use its canonical claim_ids`);
    }
    if (!String(chapter.state_change_announcement || '').trim()
        || !/length/i.test(chapter.state_change_announcement)) {
      problems.push(`guided chapter '${chapter.id}' must announce its length policy`);
    }
    if (!Array.isArray(chapter.next_actions) || !chapter.next_actions.length) {
      problems.push(`guided chapter '${chapter.id}' needs at least one next action`);
    } else {
      const actionIds = new Set();
      for (const action of chapter.next_actions) {
        if (!String(action?.id || '').trim() || actionIds.has(action.id)
            || !String(action?.label || '').trim() || !String(action?.action || '').trim()) {
          problems.push(`guided chapter '${chapter.id}' has an invalid or duplicate next action`);
        }
        actionIds.add(action?.id);
      }
    }
    const targetSet = chapter.target?.kind === 'region' ? regionIds
      : (chapter.target?.kind === 'component' ? componentIds : null);
    if (!targetSet) problems.push(`guided chapter '${chapter.id}' has invalid target kind '${chapter.target?.kind}'`);
    else if (!targetSet.has(chapter.target?.id)) {
      problems.push(`guided chapter '${chapter.id}' targets unknown ${chapter.target.kind} '${chapter.target?.id}'`);
    }
    const words = String(chapter.lay_summary || '').trim().split(/\s+/).filter(Boolean).length;
    if (words < 25 || words > 45) {
      problems.push(`guided chapter '${chapter.id}' lay summary has ${words} words; expected 25–45`);
    }
    // "One main idea; no chapter depends on reading a dense paragraph." A word cap
    // alone permits one 45-word sentence, which is exactly the density the gate is
    // about, so sentence structure is checked too.
    const parts = sentences(chapter.lay_summary);
    if (parts.length < 2 || parts.length > 3) {
      problems.push(`guided chapter '${chapter.id}' lay summary has ${parts.length} sentences; expected 2–3`);
    }
    const longest = Math.max(0, ...parts.map((part) => part.split(/\s+/).filter(Boolean).length));
    if (longest > 30) {
      problems.push(`guided chapter '${chapter.id}' has a ${longest}-word sentence; expected at most 30`);
    }
    if (!chapter.expert_expansion || !(chapter.not_claimed || []).length) {
      problems.push(`guided chapter '${chapter.id}' needs expert expansion and not-claimed text`);
    }
    if (!Array.isArray(chapter.presentation_features)
        || !chapter.presentation_features.length
        || chapter.presentation_features.some((feature) => !PRESENTATION_FEATURES.has(feature))) {
      problems.push(`guided chapter '${chapter.id}' has invalid presentation_features`);
    }
    const scene = chapter.recommended_state || {};
    if (!Number.isFinite(scene.sarcomere_length_nm)
        || scene.sarcomere_length_nm < Math.min(...[...stateMap.values()].map((x) => x.sarcomere_length_nm))
        || scene.sarcomere_length_nm > Math.max(...[...stateMap.values()].map((x) => x.sarcomere_length_nm))) {
      problems.push(`guided chapter '${chapter.id}' has an out-of-model sarcomere length`);
    }
    if (!['context', 'detail'].includes(scene.scale)) {
      problems.push(`guided chapter '${chapter.id}' has invalid scale '${scene.scale}'`);
    }
    if (!/^(view|closeup|region)\.[A-Za-z0-9_]+$/.test(scene.camera_preset || '')) {
      problems.push(`guided chapter '${chapter.id}' has invalid named camera preset '${scene.camera_preset}'`);
    }
    if (scene.selected_component_or_region !== chapter.target?.id) {
      problems.push(`guided chapter '${chapter.id}' selected target differs from its narrative target`);
    }
    const visibility = scene.visibility || {};
    for (const field of ['show_lattice', 'show_domains', 'show_context_detail', 'mirror']) {
      if (typeof visibility[field] !== 'boolean') {
        problems.push(`guided chapter '${chapter.id}' visibility.${field} must be boolean`);
      }
    }
    if (!Number.isInteger(visibility.rings) || visibility.rings < 1) {
      problems.push(`guided chapter '${chapter.id}' visibility.rings must be a positive integer`);
    }
  }

  const chapterIds = new Set((presentation.guided_chapters || []).map((chapter) => chapter.id));
  const orderedChapters = [...(presentation.guided_chapters || [])].sort((a, b) => a.order - b.order);
  if (JSON.stringify(orderedChapters.map((chapter) => chapter.id))
      !== JSON.stringify(SC23_CHAPTER_IDS)) {
    problems.push('guided chapters must implement the ordered seven-outcome SC-23 curriculum');
  }
  for (const chapter of orderedChapters) {
    const text = chapter.narration || '';
    for (const pattern of SC23_CONCEPT_PATTERNS[chapter.id] || []) {
      if (!pattern.test(text)) {
        problems.push(`guided chapter '${chapter.id}' misses required SC-23 concept ${pattern}`);
      }
    }
  }
  const aliases = presentation.chapter_aliases;
  if (aliases?.schema !== 'titin-chapter-aliases/1'
      || !aliases.aliases || typeof aliases.aliases !== 'object'
      || Array.isArray(aliases.aliases)) {
    problems.push('presentation needs a titin-chapter-aliases/1 alias table');
  } else {
    const declaredLegacy = new Map();
    for (const chapter of presentation.guided_chapters || []) {
      for (const legacyId of chapter.legacy_ids || []) {
        if (chapterIds.has(legacyId)) {
          problems.push(`legacy chapter ID '${legacyId}' collides with a current chapter`);
        } else if (declaredLegacy.has(legacyId)) {
          problems.push(`legacy chapter ID '${legacyId}' is declared more than once`);
        } else declaredLegacy.set(legacyId, chapter.id);
      }
    }
    for (const [legacyId, chapterId] of Object.entries(aliases.aliases)) {
      if (!chapterIds.has(chapterId)) {
        problems.push(`legacy chapter alias '${legacyId}' targets unknown chapter '${chapterId}'`);
      }
      if (declaredLegacy.get(legacyId) !== chapterId) {
        problems.push(`legacy chapter alias '${legacyId}' disagrees with chapter legacy_ids`);
      }
    }
    if (declaredLegacy.size !== Object.keys(aliases.aliases).length) {
      problems.push('chapter legacy_ids and the v1 alias table are not one-to-one');
    }
  }

  for (const card of presentation.expert_cards || []) {
    validateScientificRecord(card, 'expert card');
    if (card.audience !== AUDIENCE_MODES.evidence) {
      problems.push(`expert card '${card.id}' must be Evidence-mode only`);
    }
    if (!String(card.title || '').trim() || !String(card.body || '').trim()) {
      problems.push(`expert card '${card.id}' needs a visible title and body`);
    }
    if (!Array.isArray(card.not_claimed) || !card.not_claimed.length
        || card.not_claimed.some((entry) => !String(entry || '').trim())) {
      problems.push(`expert card '${card.id}' needs explicit not-claimed text`);
    }
    // A card the reader cannot reach from the structure it explains is content
    // that ships but does not arrive. The binding is validated here so a card
    // cannot name a structure the runtime has no way to select.
    if (!Array.isArray(card.related_target_ids) || !card.related_target_ids.length) {
      problems.push(`expert card '${card.id}' must name at least one related target`);
    } else {
      for (const target of card.related_target_ids) {
        if (!componentIds.has(target) && !regionIds.has(target)) {
          problems.push(`expert card '${card.id}' names unknown related target '${target}'`);
        }
      }
    }
    if (!Array.isArray(card.findings) || !card.findings.length) {
      problems.push(`expert card '${card.id}' must separate its findings by status`);
    } else {
      for (const found of card.findings) {
        if (!FINDING_STATUSES.has(found?.status)) {
          problems.push(`expert card '${card.id}' has invalid finding status '${found?.status}'`);
        }
        if (!String(found?.text || '').trim()) {
          problems.push(`expert card '${card.id}' has a finding without text`);
        }
      }
      // A card built on a claim the audit itself classes as INFERRED is discussing a
      // proposal; it may not present every finding as established.
      const claimEvidence = baseEvidence(claimMap.get(card.target_claim_id)?.claim_evidence_class);
      const statuses = new Set(card.findings.map((found) => found.status));
      if (claimEvidence === 'INFERRED' && !statuses.has('PROPOSED')) {
        problems.push(`expert card '${card.id}' rests on an INFERRED claim but marks nothing PROPOSED`);
      }
    }
  }

  // SC-7 guided-tour pacing. The plan's "approximately two to three minutes" gate
  // is machine-checked here from the copy that is actually shipped, using an
  // explicitly declared and reviewable reading model.
  const pacing = presentation.tour_pacing;
  const rate = pacing?.reading_words_per_minute;
  const transition = pacing?.chapter_transition_seconds;
  const target = pacing?.target_seconds;
  if (!Number.isFinite(rate) || rate <= 0
      || !Number.isFinite(transition) || transition < 0
      || !Array.isArray(target) || target.length !== 2
      || !target.every(Number.isFinite) || target[0] >= target[1]
      || !String(pacing?.basis || '').trim()) {
    problems.push('presentation tour_pacing needs a positive reading model, an increasing target window, and a stated basis');
  } else {
    const chapterList = presentation.guided_chapters || [];
    const tourWords = chapterList.reduce((sum, chapter) => (
      sum + [chapter.narration, chapter.state_change_announcement]
        .reduce((chapterWords, text) => chapterWords
          + String(text || '').trim().split(/\s+/).filter(Boolean).length, 0)
    ), 0);
    const seconds = (tourWords / rate) * 60 + chapterList.length * transition;
    if (seconds < target[0] || seconds > target[1]) {
      problems.push(
        `guided tour runs ${seconds.toFixed(0)} s, outside the declared `
        + `${target[0]}–${target[1]} s window`,
      );
    }
  }
  // The MyBP-C layer is admitted only with a recorded reason for omitting the
  // cardiac coordinates. Without that card the layer would be schematic geometry
  // whose scope limit is nowhere visible to a reader.
  const mybpcClaim = claimMap.get('mybpc_czone_context');
  if (mybpcClaim && String(mybpcClaim.decision || '').startsWith('ADMIT')
      && !(presentation.expert_cards || [])
        .some((card) => card.target_claim_id === 'mybpc_czone_context')) {
    problems.push('an admitted MyBP-C layer requires an Evidence-mode expert card explaining its scope limits');
  }

  const initial = presentation.initial_state || {};
  if (!modeIds.has(initial.audience_mode)) problems.push('initial_state has an unknown audience_mode');
  if (!(presentation.guided_chapters || []).some((chapter) => chapter.id === initial.story_step)) {
    problems.push('initial_state has an unknown story_step');
  }
  if (initial.audience_mode === 'guided' && initial.evidence_display !== false) {
    problems.push('initial Guided state must not expose the evidence inventory');
  }
  const initialTarget = initial.selected_component_or_region;
  if (initialTarget !== null && !regionIds.has(initialTarget) && !componentIds.has(initialTarget)) {
    problems.push(`initial_state has unknown biological target '${initialTarget}'`);
  }
  const modelLengths = [...stateMap.values()].map((state) => state.sarcomere_length_nm);
  if (!Number.isFinite(initial.sarcomere_length_nm)
      || initial.sarcomere_length_nm < Math.min(...modelLengths)
      || initial.sarcomere_length_nm > Math.max(...modelLengths)) {
    problems.push('initial_state has an out-of-model sarcomere length');
  }
  if (!['context', 'detail'].includes(initial.scale)) problems.push('initial_state has an invalid scale');
  if (!/^(view|closeup|region)\.[A-Za-z0-9_]+$/.test(initial.camera_preset || '')) {
    problems.push('initial_state has an invalid named camera preset');
  }
  if (typeof initial.evidence_display !== 'boolean') {
    problems.push('initial_state evidence_display must be boolean');
  }
  for (const shortcut of presentation.presenter_shortcuts || []) {
    const action = shortcut.action || '';
    if (!shortcut.label) problems.push(`presenter shortcut '${shortcut.id}' needs a label`);
    if (!(action === 'mode.evidence'
      || (action.startsWith('story.') && chapterIds.has(action.slice('story.'.length))))) {
      problems.push(`presenter shortcut '${shortcut.id}' has invalid action '${action}'`);
    }
  }
  const sceneIds = new Set(Object.keys(scenes?.scenes || {}));
  for (const chapter of presentation.guided_chapters || []) {
    if (!sceneIds.has(chapter.semantic_scene_id)) {
      problems.push(`guided chapter '${chapter.id}' cites unknown semantic scene '${chapter.semantic_scene_id}'`);
    }
  }
  return problems;
}

/**
 * SC-23 declarative scene validation. Scenes can name only an admitted object,
 * claim, and presentation state; they cannot smuggle scientific numbers into a
 * second geometry source of truth.
 */
export function checkSemanticScenes(scenes, context = {}) {
  const { presentation, claimSupport, sarcomere, titin, annotations } = context;
  const problems = [];
  if (!scenes || typeof scenes !== 'object') return ['scenes.json missing or not an object'];
  if (scenes.schema !== SCENES_SCHEMA) {
    problems.push(`semantic scene schema '${scenes.schema}' is unsupported`);
  }
  const records = scenes.scenes;
  if (!records || typeof records !== 'object' || Array.isArray(records)
      || !Object.keys(records).length) {
    return [...problems, 'semantic scene records are missing or empty'];
  }
  const chapters = presentation?.guided_chapters || [];
  const chapterByScene = new Map(chapters.map((chapter) => [chapter.semantic_scene_id, chapter]));
  if (chapterByScene.size !== chapters.length) {
    problems.push('every guided chapter must own a unique semantic scene');
  }
  if (!chapterByScene.has(scenes.primary_presenter_scene_id)) {
    problems.push('primary_presenter_scene_id does not resolve to a guided chapter scene');
  }
  const claimIds = new Set((claimSupport?.claims || []).map((claim) => claim.id));
  const componentIds = new Set((sarcomere?.components || []).map((component) => component.id));
  componentIds.add('titin');
  for (const annotation of annotations?.components || []) componentIds.add(annotation.target_id);
  const regionIds = new Set((titin?.regions || []).map((region) => region.id));
  const forbiddenKey = /coordinate|force|evidence|(?:^|_)nm(?:$|_)/i;
  const exactKeys = (value, admitted, sceneId, field) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      problems.push(`semantic scene '${sceneId}' ${field} must be an object`);
      return false;
    }
    const actual = Object.keys(value);
    const missing = [...admitted].filter((key) => !Object.hasOwn(value, key));
    const unexpected = actual.filter((key) => !admitted.has(key));
    if (missing.length) {
      problems.push(`semantic scene '${sceneId}' ${field} lacks ${missing.join(', ')}`);
    }
    if (unexpected.length) {
      problems.push(`semantic scene '${sceneId}' ${field} has unexpected fields ${unexpected.join(', ')}`);
    }
    return missing.length === 0 && unexpected.length === 0;
  };
  const walkValues = (value, sceneId, key = '') => {
    if (key && forbiddenKey.test(key)) {
      problems.push(`semantic scene '${sceneId}' contains forbidden scientific field '${key}'`);
    }
    if (typeof value === 'number') {
      problems.push(`semantic scene '${sceneId}' contains a forbidden numeric scientific value`);
      return;
    }
    if (typeof value === 'string' && SCENE_EVIDENCE_VALUES.has(value)) {
      problems.push(`semantic scene '${sceneId}' contains forbidden evidence-class value '${value}'`);
      return;
    }
    if (Array.isArray(value)) {
      for (const child of value) walkValues(child, sceneId);
    } else if (value && typeof value === 'object') {
      for (const [childKey, child] of Object.entries(value)) {
        walkValues(child, sceneId, childKey);
      }
    }
  };
  for (const [sceneId, scene] of Object.entries(records)) {
    const chapter = chapterByScene.get(sceneId);
    if (!chapter) problems.push(`semantic scene '${sceneId}' is not owned by a guided chapter`);
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      problems.push(`semantic scene '${sceneId}' must be an object`);
      continue;
    }
    exactKeys(scene, SCENE_FIELDS, sceneId, 'record');
    if (typeof scene.label !== 'string' || !scene.label.trim()) {
      problems.push(`semantic scene '${sceneId}' needs a string label`);
    }
    if (!Array.isArray(scene.available_in)
        || scene.available_in.length !== 2
        || new Set(scene.available_in).size !== 2
        || !['LEARN', 'EXPLORE'].every((mode) => scene.available_in.includes(mode))) {
      problems.push(`semantic scene '${sceneId}' must be available in LEARN and EXPLORE only`);
    }
    if (!/^(view|closeup|region)\.[A-Za-z0-9_]+$/.test(scene.camera_preset || '')) {
      problems.push(`semantic scene '${sceneId}' has an invalid camera preset`);
    }
    if (!['context', 'detail'].includes(scene.scale)) {
      problems.push(`semantic scene '${sceneId}' has an invalid scale`);
    }
    if (typeof scene.context !== 'boolean') problems.push(`semantic scene '${sceneId}' context must be boolean`);
    if (exactKeys(scene.layers, SCENE_LAYERS, sceneId, 'layers')) {
      for (const [layer, visible] of Object.entries(scene.layers)) {
        if (typeof visible !== 'boolean') {
          problems.push(`semantic scene '${sceneId}' layer '${layer}' must be boolean`);
        }
      }
    }
    const selection = scene.selection;
    const selectionSet = selection?.kind === 'region' ? regionIds
      : selection?.kind === 'component' ? componentIds : null;
    if (selection !== null) {
      const selectionShape = exactKeys(selection, new Set(['kind', 'id']), sceneId, 'selection');
      if (!selectionShape || !selectionSet || typeof selection.id !== 'string'
          || !selectionSet.has(selection.id)) {
        problems.push(`semantic scene '${sceneId}' has an unknown selection`);
      }
    }
    const lengthPolicyShape = exactKeys(
      scene.length_policy, new Set(['kind']), sceneId, 'length_policy',
    );
    if (!lengthPolicyShape || scene.length_policy.kind !== 'preserve') {
      problems.push(`semantic scene '${sceneId}' must preserve the user's length`);
    }
    if (!Array.isArray(scene.claim_ids) || !scene.claim_ids.length
        || new Set(scene.claim_ids).size !== scene.claim_ids.length
        || scene.claim_ids.some((id) => typeof id !== 'string' || !claimIds.has(id))) {
      problems.push(`semantic scene '${sceneId}' has unresolved canonical claim_ids`);
    }
    const sourceFilterShape = exactKeys(
      scene.source_filter, new Set(['kind', 'claim_ids']), sceneId, 'source_filter',
    );
    if (!sourceFilterShape || scene.source_filter.kind !== 'claims'
        || JSON.stringify(scene.source_filter.claim_ids) !== JSON.stringify(scene.claim_ids)) {
      problems.push(`semantic scene '${sceneId}' source_filter must use its claim_ids`);
    }
    if (chapter) {
      const expectedLayers = Object.fromEntries([...SCENE_LAYERS]
        .map((key) => [key, chapter.recommended_state?.visibility?.[key]]));
      if (scene.camera_preset !== chapter.recommended_state?.camera_preset
          || scene.scale !== chapter.recommended_state?.scale
          || JSON.stringify(scene.selection) !== JSON.stringify(chapter.target)
          || JSON.stringify(scene.layers) !== JSON.stringify(expectedLayers)
          || JSON.stringify(scene.claim_ids) !== JSON.stringify(chapter.claim_ids)) {
        problems.push(`semantic scene '${sceneId}' drifts from its chapter presentation state`);
      }
    }
    walkValues(scene, sceneId);
  }
  if (Object.keys(records).length !== chapterByScene.size) {
    problems.push('semantic scene count must equal the guided chapter count');
  }
  return problems;
}

/** Runtime presentation controller. Geometry and render types stay outside it. */
export class StoryController {
  /**
   * @param {any} presentation
   * @param {any} capabilities
   * @param {any} scenes
   */
  constructor(presentation, capabilities, scenes = null) {
    if (!presentation || presentation.schema !== PRESENTATION_SCHEMA) {
      throw new Error('StoryController: presentation.json has an unsupported schema.');
    }
    if (!scenes || scenes.schema !== SCENES_SCHEMA) {
      throw new Error('StoryController: scenes.json has an unsupported schema.');
    }
    this.presentation = presentation;
    this.sceneCatalog = scenes;
    this.capabilities = {
      views: new Set(capabilities.views || []),
      closeups: new Set(capabilities.closeups || []),
      scales: new Set(capabilities.scales || []),
      targets: new Set(capabilities.targets || []),
      hiddenTargetsByScale: new Map(Object.entries(capabilities.hiddenTargetsByScale || {})
        .map(([scale, targets]) => [scale, new Set(targets)])),
      minLength: capabilities.minLength,
      maxLength: capabilities.maxLength,
    };
    this.chapters = [...presentation.guided_chapters].sort((a, b) => a.order - b.order);
    this.chapterMap = new Map(this.chapters.map((chapter) => [chapter.id, chapter]));
    this.aliasMap = new Map(Object.entries(presentation.chapter_aliases.aliases));
    this.sceneMap = new Map(Object.entries(scenes.scenes));
    if (this.chapterMap.size !== this.chapters.length) {
      throw new Error('StoryController: guided chapter IDs must be unique.');
    }
    this.defaults = Object.freeze(clone(presentation.initial_state));
    this._validateRuntimeTargets();
  }

  _validateRuntimeTargets() {
    const problems = [];
    for (const chapter of this.chapters) {
      const semanticScene = this.scene(chapter.semantic_scene_id);
      if (!semanticScene) {
        problems.push(`chapter '${chapter.id}' uses unavailable semantic scene '${chapter.semantic_scene_id}'`);
      }
      if (!this.capabilities.targets.has(chapter.target.id)) {
        problems.push(`chapter '${chapter.id}' targets unavailable ${chapter.target.kind} '${chapter.target.id}'`);
      }
      const scene = chapter.recommended_state;
      if (!this.capabilities.scales.has(scene.scale)) {
        problems.push(`chapter '${chapter.id}' uses unavailable scale '${scene.scale}'`);
      }
      if (!this._cameraKnown(scene.camera_preset)) {
        problems.push(`chapter '${chapter.id}' uses unavailable camera '${scene.camera_preset}'`);
      }
      if (!this._targetAvailableAtScale(scene.scale, scene.selected_component_or_region)) {
        problems.push(
          `chapter '${chapter.id}' selects '${scene.selected_component_or_region}' `
          + `which is unavailable at scale '${scene.scale}'`,
        );
      }
    }
    if (!this.capabilities.scales.has(this.defaults.scale)) {
      problems.push(`initial state uses unavailable scale '${this.defaults.scale}'`);
    }
    if (!this._cameraKnown(this.defaults.camera_preset)) {
      problems.push(`initial state uses unavailable camera '${this.defaults.camera_preset}'`);
    }
    if (this.defaults.selected_component_or_region !== null
        && !this.capabilities.targets.has(this.defaults.selected_component_or_region)) {
      problems.push(
        `initial state targets unavailable biology '${this.defaults.selected_component_or_region}'`,
      );
    }
    if (!this._targetAvailableAtScale(
      this.defaults.scale, this.defaults.selected_component_or_region,
    )) {
      problems.push(
        `initial state selects '${this.defaults.selected_component_or_region}' `
        + `which is unavailable at scale '${this.defaults.scale}'`,
      );
    }
    if (problems.length) throw new Error(`StoryController: ${problems.join('; ')}`);
  }

  _cameraKnown(camera) {
    const [kind, name, extra] = String(camera).split('.');
    if (extra || !name) return false;
    if (kind === 'view') return this.capabilities.views.has(name);
    if (kind === 'closeup') return this.capabilities.closeups.has(name);
    if (kind === 'region') return this.capabilities.targets.has(name);
    return false;
  }

  _targetAvailableAtScale(scale, target) {
    if (target === null) return true;
    return !this.capabilities.hiddenTargetsByScale.get(scale)?.has(target);
  }

  resolveChapterId(id) { return this.aliasMap.get(id) || id; }

  chapter(id) { return this.chapterMap.get(this.resolveChapterId(id)) || null; }

  scene(id) { return this.sceneMap.get(id) || null; }

  chapterIndex(id) {
    const canonical = this.resolveChapterId(id);
    return this.chapters.findIndex((chapter) => chapter.id === canonical);
  }

  stateForChapter(id, { currentLengthNm = null } = {}) {
    const chapter = this.chapter(id);
    if (!chapter) throw new Error(`StoryController: unknown chapter '${id}'.`);
    return {
      audience_mode: AUDIENCE_MODES.guided,
      story_step: chapter.id,
      sarcomere_length_nm: Number.isFinite(currentLengthNm)
        ? currentLengthNm : chapter.recommended_state.sarcomere_length_nm,
      scale: chapter.recommended_state.scale,
      camera_preset: chapter.recommended_state.camera_preset,
      selected_component_or_region: chapter.recommended_state.selected_component_or_region,
      evidence_display: false,
    };
  }

  /** Decode a compact hash, returning explicit fallback notices for every problem. */
  parse(hash) {
    const state = clone(this.defaults);
    const issues = [];
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw) return { state, issues };
    const params = new URLSearchParams(raw);
    const seen = new Set();
    for (const [key] of params) {
      if (!URL_KEYS.includes(key)) issues.push(`Unknown URL field '${key}' was ignored.`);
      if (seen.has(key)) issues.push(`Duplicate URL field '${key}' used its first value.`);
      seen.add(key);
    }
    const first = (key) => params.getAll(key)[0];
    const fallback = (field, value, why, replacement) => {
      issues.push(`Invalid ${field} '${value}': ${why}; using '${replacement}'.`);
    };

    if (params.has('mode')) {
      const value = first('mode');
      if (Object.hasOwn(AUDIENCE_MODES, value)) state.audience_mode = value;
      else fallback('mode', value, 'expected guided or evidence', state.audience_mode);
    }
    let resolvedStepChapter = null;
    if (params.has('step')) {
      const value = targetValue(first('step'));
      const canonical = value === null ? null : this.resolveChapterId(value);
      if (canonical === null || this.chapterMap.has(canonical)) {
        state.story_step = canonical;
        if (canonical !== null) resolvedStepChapter = this.chapterMap.get(canonical);
        if (value !== null && canonical !== value) {
          issues.push(`Legacy chapter '${value}' resolved to '${canonical}'.`);
        }
      } else fallback('step', value, 'unknown guided chapter', state.story_step);
    }
    // A chapter-bearing hash adopts the complete declared scene wherever the
    // URL omitted a scene field. Explicit scale, camera, and target fields are
    // parsed below and still win. Sarcomere length remains independently
    // supplied/defaulted because every SC-23 scene has a preserve policy.
    if (resolvedStepChapter) {
      const recommended = resolvedStepChapter.recommended_state;
      if (!params.has('scale')) state.scale = recommended.scale;
      if (!params.has('camera')) state.camera_preset = recommended.camera_preset;
      if (!params.has('target')) {
        state.selected_component_or_region = recommended.selected_component_or_region;
      }
    }
    if (params.has('sl')) {
      const value = first('sl');
      const number = Number(value);
      if (Number.isFinite(number) && Number.isInteger(number)
          && number >= this.capabilities.minLength && number <= this.capabilities.maxLength) {
        state.sarcomere_length_nm = number;
      } else {
        fallback('sl', value,
          `expected an integer from ${this.capabilities.minLength} to ${this.capabilities.maxLength} nm`,
          state.sarcomere_length_nm);
      }
    }
    if (params.has('scale')) {
      const value = first('scale');
      if (this.capabilities.scales.has(value)) state.scale = value;
      else fallback('scale', value, 'unavailable scale', state.scale);
    }
    if (params.has('camera')) {
      const value = first('camera');
      if (this._cameraKnown(value)) state.camera_preset = value;
      else fallback('camera', value, 'unavailable named camera preset', state.camera_preset);
    }
    if (params.has('target')) {
      const value = targetValue(first('target'));
      if (value === null || this.capabilities.targets.has(value)) {
        state.selected_component_or_region = value;
      } else fallback('target', value, 'unknown biological target', state.selected_component_or_region);
    }
    if (params.has('evidence')) {
      const value = first('evidence');
      if (value === '0' || value === '1') state.evidence_display = value === '1';
      else fallback('evidence', value, 'expected 0 or 1', Number(state.evidence_display));
    }
    if (state.audience_mode === AUDIENCE_MODES.guided && state.evidence_display) {
      issues.push('Evidence inventory cannot be displayed inside Guided mode; using hidden evidence.');
      state.evidence_display = false;
    }
    if (state.audience_mode === AUDIENCE_MODES.guided && !state.story_step) {
      issues.push(`Guided mode requires a story step; using '${this.defaults.story_step}'.`);
      state.story_step = this.defaults.story_step;
    }
    if (state.scale === 'detail' && state.camera_preset.startsWith('closeup.')) {
      issues.push(
        `Camera '${state.camera_preset}' targets context geometry unavailable at the detail scale; `
        + "using 'view.longitudinal'.",
      );
      state.camera_preset = 'view.longitudinal';
    }
    if (!this._targetAvailableAtScale(state.scale, state.selected_component_or_region)) {
      issues.push(
        `Target '${state.selected_component_or_region}' is unavailable at scale '${state.scale}'; `
        + 'using no selected target.',
      );
      state.selected_component_or_region = null;
    }
    return { state, issues };
  }

  /** Fixed field order makes copied links stable and diffable. */
  serialize(state) {
    const params = new URLSearchParams();
    params.set('mode', state.audience_mode);
    params.set('step', state.story_step || 'none');
    params.set('sl', String(state.sarcomere_length_nm));
    params.set('scale', state.scale);
    params.set('camera', state.camera_preset);
    params.set('target', state.selected_component_or_region || 'none');
    params.set('evidence', state.evidence_display ? '1' : '0');
    const hash = `#${params.toString()}`;
    const verified = this.parse(hash);
    if (verified.issues.length) {
      throw new Error(`StoryController: cannot serialize unsupported state: ${verified.issues.join(' ')}`);
    }
    return hash;
  }
}
