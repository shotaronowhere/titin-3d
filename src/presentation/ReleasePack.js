/**
 * SC-9 release pack.
 *
 * The plan's release artifacts are a claim/evidence matrix, a limitations sheet,
 * a presenter script, a preflight checklist, and a static fallback deck. Every
 * one of them restates something the repository already knows, which is exactly
 * how a handoff package goes stale: the science moves and the leave-behind does
 * not.
 *
 * So none of it is written here. This module DERIVES each artifact from the
 * canonical records — the SC-0 claim matrix, the bibliography, the guided route,
 * the mechanical solver, the lattice layer — and `scripts/build_release_pack.mjs`
 * has a `--check` mode that fails when the committed pack no longer matches. The
 * pack is a build product with a staleness gate, like the standalone page.
 *
 * The fallback deck matters for a specific failure the risk register names: WebGL
 * or the projector dies mid-demonstration. Slides generated from the same
 * descriptors the 3-D scene consumes are scientifically identical to it by
 * construction, and being plain SVG they need no GPU. They are emitted here as
 * descriptors; the script draws them.
 */

import { createShowcaseOverlay } from './ShowcaseOverlay.js';
import { createProvenancePipeline } from './ProvenancePipeline.js';
import { resolveSources } from './AnnotationCatalog.js';
import { presenterKeyGuide } from './PresenterKeys.js';

/** Slide canvas, matching the declared projector viewport. */
export const SLIDE = Object.freeze({ width: 1920, height: 1080 });

/** The seven preflight steps, in the plan's order. */
const PREFLIGHT_STEPS = Object.freeze([
  ['open_both', 'Open the deployed GitHub Pages URL and the offline standalone index.html.',
    'Both load without a network request after first paint.'],
  ['same_build', 'Compare the model, application, and build-input identities shown in the Evidence drawer of each.',
    'All three identities are identical.'],
  ['guided_route', 'Run the guided route once, end to end, on the actual display.',
    'Every chapter reaches its camera and reads legibly from the back of the room.'],
  ['rendering', 'Check typography, colour, animation, WebGL, and pointer behaviour.',
    'No clipping, no missing geometry, no dropped frames on orbit.'],
  ['reset', 'Use Restart and the presenter keys listed at the head of the presenter script.',
    'Restart returns to chapter one; each key lands on its own deterministic state.'],
  ['fallback', 'Confirm the static fallback deck is on the presenting machine.',
    'release/fallback/*.svg open without a browser engine or a network.'],
  ['no_live_citations', 'Do not plan to open external citations during the narrative.',
    'Every source is reachable afterwards from the Evidence drawer.'],
]);

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * One row per reviewed claim, with its sources resolved to readable citations.
 * The matrix is the SC-0 audit rendered for a reader, not a second copy of it.
 */
function claimMatrix(model) {
  const references = model.spec.references;
  return model.spec.showcaseClaims.objects.map((claim) => ({
    id: claim.id,
    name: claim.name,
    decision: claim.decision,
    release_tier: claim.release_tier,
    audience: [...claim.audience],
    object_kind: claim.object_kind,
    claim: claim.claim,
    scope: claim.scope,
    claim_evidence_class: claim.claim_evidence_class,
    render_evidence_class: claim.render_evidence_class,
    sources: claim.sources.map((source) => {
      if (source.kind !== 'REFERENCE') {
        return { id: source.id, citation: source.id, href: null, role: source.role,
          scope_compatibility: source.scope_compatibility };
      }
      const [resolved] = resolveSources(references, [source.id]);
      return { ...resolved, role: source.role, scope_compatibility: source.scope_compatibility };
    }),
    not_claimed: [...claim.not_claimed],
  }));
}

/**
 * Every explicit non-claim in the project, grouped by where it is recorded.
 * Duplicates are collapsed per group but kept across groups, because the same
 * sentence appearing in two records is two independent commitments.
 */
function limitations(model) {
  const groups = [];
  const push = (id, title, source, entries) => {
    const unique = [...new Set(entries.filter((entry) => String(entry || '').trim()))].sort();
    if (unique.length) groups.push({ id, title, source, entries: unique });
  };
  push('claims', 'Reviewed claim matrix', 'data/showcase_claims.json',
    model.spec.showcaseClaims.objects.flatMap((claim) => claim.not_claimed));
  push('global_controls', 'Global negative controls', 'data/showcase_claims.json',
    model.spec.showcaseClaims.global_negative_controls);
  push('annotations', 'Object annotations', 'data/annotations.json',
    model.spec.annotations.components.flatMap((record) => record.not_claimed));
  push('narrative', 'Guided route and expert cards', 'data/presentation.json',
    [
      ...model.spec.presentation.guided_chapters.flatMap((chapter) => chapter.not_claimed),
      ...model.spec.presentation.expert_cards.flatMap((card) => card.not_claimed),
      ...model.spec.presentation.scope_badges.flatMap((badge) => badge.not_claimed || []),
    ]);
  push('spec_unknowns', 'Specification unknowns', 'data/sarcomere.json; data/titin.json',
    model.unknowns().map((unknown) => (
      typeof unknown === 'string' ? unknown : unknown.item || unknown.question || '')));
  push('forbidden', 'Forbidden depictions', 'data/structural_states.json',
    model.forbiddenRules());
  return groups;
}

/** The guided route as a presenter would read it, with its declared pacing. */
function presenterScript(model) {
  const presentation = model.spec.presentation;
  const pacing = presentation.tour_pacing;
  const chapters = [...presentation.guided_chapters].sort((a, b) => a.order - b.order);
  const rows = chapters.map((chapter) => {
    const scene = chapter.recommended_state;
    const [kind, name] = scene.camera_preset.split('.');
    const move = kind === 'view' ? `frame the ${name.replace(/_/g, ' ')} view`
      : kind === 'closeup' ? `fly to the ${name} close-up`
        : `focus the ${name} region`;
    return {
      order: chapter.order,
      id: chapter.id,
      title: chapter.title,
      learning_objective: chapter.learning_objective,
      say: chapter.lay_summary,
      state_change_announcement: chapter.state_change_announcement,
      expected_learner_takeaway: chapter.expected_learner_takeaway,
      semantic_scene_id: chapter.semantic_scene_id,
      claim_ids: [...chapter.claim_ids],
      next_actions: chapter.next_actions.map((action) => ({ ...action })),
      show: `${move}; recommended ${scene.sarcomere_length_nm} nm, ${scene.scale} scale; `
        + "preserve the user's current sarcomere length",
      if_asked: chapter.expert_expansion,
      not_claimed: [...chapter.not_claimed],
      source_ids: [...chapter.source_ids],
      words: wordCount(chapter.lay_summary) + wordCount(chapter.state_change_announcement),
      estimated_seconds: Number(
        (((wordCount(chapter.lay_summary) + wordCount(chapter.state_change_announcement))
          / pacing.reading_words_per_minute) * 60
          + pacing.chapter_transition_seconds).toFixed(1),
      ),
    };
  });
  return {
    reading_words_per_minute: pacing.reading_words_per_minute,
    chapter_transition_seconds: pacing.chapter_transition_seconds,
    target_seconds: [...pacing.target_seconds],
    estimated_seconds: Number(
      rows.reduce((sum, row) => sum + row.estimated_seconds, 0).toFixed(1),
    ),
    chapters: rows,
    // Resolved from the same module the page binds, so a presenter holding this
    // page cannot be holding a key the build does not answer to.
    keys: presenterKeyGuide(presentation),
  };
}

/** Text-only and screen-reader routes generated from the same chapter record. */
function transcripts(model) {
  const presentation = model.spec.presentation;
  const chapters = [...presentation.guided_chapters].sort((a, b) => a.order - b.order);
  const rows = chapters.map((chapter) => ({
    order: chapter.order,
    id: chapter.id,
    title: chapter.title,
    learning_objective: chapter.learning_objective,
    narration: chapter.narration,
    state_change_announcement: chapter.state_change_announcement,
    expected_learner_takeaway: chapter.expected_learner_takeaway,
    claim_ids: [...chapter.claim_ids],
    next_actions: chapter.next_actions.map((action) => action.label),
  }));
  const word_count = rows.reduce((sum, row) => sum
    + wordCount(row.narration) + wordCount(row.state_change_announcement), 0);
  const estimated_seconds = Number((
    (word_count / presentation.tour_pacing.reading_words_per_minute) * 60
    + rows.length * presentation.tour_pacing.chapter_transition_seconds
  ).toFixed(1));
  return {
    schema: 'titin-transcripts/1',
    source: 'data/presentation.json',
    word_count,
    estimated_seconds,
    target_seconds: [...presentation.tour_pacing.target_seconds],
    text_only: rows.map((row) => ({ ...row })),
    screen_reader: rows.map((row) => ({
      ...row,
      spoken_sequence: [
        `Chapter ${row.order} of ${rows.length}: ${row.title}.`,
        row.state_change_announcement,
        row.narration,
        `Takeaway: ${row.expected_learner_takeaway}`,
        `Actions: ${row.next_actions.join('; ')}.`,
      ],
    })),
  };
}

/**
 * The static fallback deck, as descriptors. Each slide reads the same canonical
 * output the 3-D scene reads, so the deck cannot say something the application
 * would not.
 */
function fallbackSlides(model, referenceLengthNm, comparisonLengthNm) {
  const presentation = model.spec.presentation;
  const badge = presentation.scope_badges[0];
  const scope = model.scientificScope;
  const overlay = createShowcaseOverlay(model, referenceLengthNm);
  const stretched = createShowcaseOverlay(model, comparisonLengthNm);
  const lattice = model.latticeCrossSectionAt(referenceLengthNm);
  const pipeline = createProvenancePipeline(model);
  const backbone = model.backboneAt(referenceLengthNm);

  return [
    {
      id: 'scope',
      kind: 'text',
      title: 'Titin across the sarcomere',
      subtitle: scope.publicBadge,
      lines: [
        `Sequence species: ${scope.sequence.species}`,
        `Reference: ${scope.sequence.gene} — ${scope.sequence.isoform_id}`,
        'Tissue construct: not assigned; SD-01 citation-backed owner-authorized ruling',
        `Mechanics: ${scope.mechanics.display_label}`,
        `Declared working range: ${presentation.scope.working_range_nm.join('–')} nm`,
        `Shown here at ${overlay.sarcomere_length_nm} nm`,
        '',
        presentation.scope.activation_statement,
      ],
      footnote: 'Static fallback rendered from the same records as the interactive build.',
    },
    {
      id: 'architecture',
      kind: 'axial',
      title: 'One molecule, Z-disc to M-band',
      subtitle: `Half-sarcomere at ${overlay.sarcomere_length_nm} nm`,
      axis: { start_nm: 0, end_nm: model.geometryAt(referenceLengthNm).mline.X },
      brackets: overlay.brackets.map((bracket) => ({
        id: bracket.id, label: bracket.label, kind: bracket.kind,
        start_nm: bracket.start_nm, end_nm: bracket.end_nm, lane: bracket.lane,
        evidence_class: bracket.evidence_class,
      })),
      regions: backbone.segments.map((segment) => ({
        id: segment.region_id, start_nm: segment.X_start, end_nm: segment.X_end,
      })),
      termini: overlay.termini.map((terminus) => ({
        id: terminus.id, label: terminus.label, x_nm: terminus.anchor_nm.x,
      })),
      footnote: 'Band boundaries follow the same geometry the scene draws; the smooth '
        + 'three-dimensional path is a schematic proxy.',
    },
    {
      id: 'extension',
      kind: 'bars',
      title: 'Regions extend differently',
      subtitle: `I-band regions at ${overlay.sarcomere_length_nm} nm and `
        + `${stretched.sarcomere_length_nm} nm`,
      evidence_class: overlay.extension_chart.evidence_class,
      series: [
        { id: 'reference', label: `${overlay.sarcomere_length_nm} nm`,
          total_nm: overlay.extension_chart.total_nm,
          values: overlay.extension_chart.regions.map((region) => ({
            id: region.id, label: region.label, value_nm: region.extension_nm,
            mechanism: region.mechanism.label,
          })) },
        { id: 'comparison', label: `${stretched.sarcomere_length_nm} nm`,
          total_nm: stretched.extension_chart.total_nm,
          values: stretched.extension_chart.regions.map((region) => ({
            id: region.id, label: region.label, value_nm: region.extension_nm,
            mechanism: region.mechanism.label,
          })) },
      ],
      footnote: 'Solved at a common force from each region’s own force-extension law. '
        + 'A modelled partition, not a measured molecular trajectory.',
    },
    {
      id: 'lattice',
      kind: 'lattice',
      title: 'The lattice narrows as the sarcomere lengthens',
      subtitle: `d10 ${lattice.panels[0].d10_nm.toFixed(2)} nm at `
        + `${lattice.panels[0].sarcomere_length_nm} nm versus `
        + `${lattice.panels[1].d10_nm.toFixed(2)} nm at `
        + `${lattice.panels[1].sarcomere_length_nm} nm`,
      view: lattice,
      footnote: `${lattice.evidence_class} · ${lattice.caveat.scaling_law} `
        + `${lattice.caveat.text}`,
    },
    {
      id: 'provenance',
      kind: 'flow',
      title: 'How this model was built',
      subtitle: 'Every figure counted from the loaded records',
      stages: pipeline.stages.map((stage) => ({
        id: stage.id, label: stage.label, count: stage.count,
        count_label: stage.count_label, records: [...stage.records],
      })),
      footnote: `Not claimed: ${pipeline.not_claimed.join('; ')}.`,
    },
    {
      id: 'limitations',
      kind: 'text',
      title: 'What this model does not claim',
      subtitle: 'The full sheet ships as release/LIMITATIONS.md',
      lines: model.spec.showcaseClaims.global_negative_controls
        .map((entry) => `· ${entry.replace(/^Reject any /, 'No ')}`),
      footnote: 'Every rendered object also carries its own non-claims in the '
        + 'Evidence drawer.',
    },
  ];
}

/**
 * @param {import('../model/TitinModel.js').TitinModel} model
 * @param {{identity?: {model_fingerprint:string, app_revision:string,
 *   build_inputs_fingerprint:string}, referenceLengthNm?: number,
 *   comparisonLengthNm?: number}} [opts]
 */
export function createReleasePack(model, opts = {}) {
  const {
    identity = model.spec.identity,
    referenceLengthNm = model.spec.presentation.initial_state.sarcomere_length_nm,
    comparisonLengthNm = model.spec.presentation.scope.working_range_nm[1],
  } = opts;
  const sd04 = model.spec.scientificDecisions.decisions['SD-04'];
  const implementationReviewer = sd04.implementation_verification?.reviewer;
  const implementationAdjudicator = sd04.implementation_verification?.adjudicator;
  const humanImplementationMatches = implementationReviewer?.name
    && implementationReviewer.name === sd04.reviewer?.name;
  const citationImplementationMatches = !sd04.reviewer && !implementationReviewer
    && sd04.adjudicator?.type === 'AI_SYSTEM'
    && sd04.adjudicator?.authority_basis === 'project_owner_authorization'
    && sd04.adjudicator?.human_expert === false
    && implementationAdjudicator?.type === 'AI_SYSTEM'
    && implementationAdjudicator?.authority_basis === 'project_owner_authorization'
    && implementationAdjudicator?.human_expert === false;
  const mechanicsSprintStatus = sd04.status !== 'APPROVED'
    ? 'CODE_COMPLETE_BLOCKED_SCIENCE'
    : sd04.implementation_verification?.status === 'VERIFIED'
      && sd04.implementation_verification?.implemented_model_fingerprint
        === model.spec.identity.model_fingerprint
      && (humanImplementationMatches || citationImplementationMatches)
      ? 'COMPLETE'
      : 'APPROVED_PENDING_IMPLEMENTATION_VERIFICATION';
  const requiredContentClaims = ['sarcomere_definition', 'actomyosin_motor_function']
    .map((id) => model.spec.claimSupport.claims.find((row) => row.id === id));
  const contentApproved = requiredContentClaims.every(
    (claim) => claim?.review?.status === 'APPROVED',
  );

  const pack = {
    schema: 'titin-release-pack/1',
    identity: { ...identity },
    generated_from: [
      'data/showcase_claims.json', 'data/references.json', 'data/presentation.json',
      'data/scenes.json',
      'data/annotations.json', 'data/sarcomere.json', 'data/titin.json',
      'data/structural_states.json', 'data/scientific_scope.json',
      'data/titin_sequence_features.json', 'data/claim_support.json',
      'data/scientific_decisions.json', 'data/mechanical_parameters.json',
    ],
    reference_length_nm: referenceLengthNm,
    comparison_length_nm: comparisonLengthNm,
    claim_matrix: claimMatrix(model),
    limitations: limitations(model),
    presenter_script: presenterScript(model),
    transcripts: transcripts(model),
    preflight: PREFLIGHT_STEPS.map(([id, action, expected], index) => ({
      step: index + 1, id, action, expected,
    })),
    fallback_slides: fallbackSlides(model, referenceLengthNm, comparisonLengthNm),
    scientific_authority: {
      status: model.spec.scientificDecisions.sprint_status,
      mechanics_sprint_status: mechanicsSprintStatus,
      public_badge: model.scientificScope.publicBadge,
      sequence: {
        accession: model.scientificScope.sequence.accession,
        isoform_id: model.scientificScope.sequence.isoform_id,
        coordinate_frame: model.scientificScope.sequence.coordinate_frame,
        sequence_version: model.spec.sequenceFeatures.source.sequence_version,
        entry_version: model.spec.sequenceFeatures.source.entry_version,
        upstream_sha256: model.spec.sequenceFeatures.source.upstream_sha256,
        feature_count: model.spec.sequenceFeatures.features.length,
      },
      claim_count: model.spec.claimSupport.claims.length,
      presentation_content_review: {
        sprint_status: model.spec.presentation.meta.status,
        required_claims: requiredContentClaims.map((claim) => ({
          id: claim?.id || 'MISSING',
          review_status: claim?.review?.status || 'MISSING',
          approval_authority: claim?.review?.approval_authority?.type
            || (claim?.review?.reviewer ? 'NAMED_HUMAN_REVIEW' : null),
          independent_human_review_status:
            claim?.review?.independent_human_review_status || null,
        })),
        release_ready: contentApproved,
        note: model.spec.presentation.meta.content_review_status,
      },
      mechanics: {
        parameter_set_id: model.spec.mechanicalParameters.parameter_set_id,
        model_fingerprint: model.spec.identity.model_fingerprint,
        decision_id: model.spec.mechanicalParameters.decision.id,
        decision_status: model.spec.mechanicalParameters.decision.status,
        decision_reviewer: sd04.reviewer ? {
          name: sd04.reviewer.name,
          affiliation: sd04.reviewer.affiliation,
          role: sd04.reviewer.role,
        } : null,
        decision_adjudicator: sd04.adjudicator ? {
          type: sd04.adjudicator.type,
          name: sd04.adjudicator.name,
          authority_basis: sd04.adjudicator.authority_basis,
          human_expert: sd04.adjudicator.human_expert,
        } : null,
        independent_human_review_status: sd04.independent_human_review_status,
        implementation_verification: {
          status: sd04.implementation_verification?.status || 'PENDING',
          reviewer_name: implementationReviewer?.name || null,
          adjudicator_name: implementationAdjudicator?.name || null,
          adjudicator_authority_basis: implementationAdjudicator?.authority_basis || null,
          adjudicator_human_expert: implementationAdjudicator?.human_expert ?? null,
          implemented_model_fingerprint:
            sd04.implementation_verification?.implemented_model_fingerprint || null,
        },
        evaluation_status: model.spec.mechanicalParameters.output_policy.evaluation_status,
        public_force: model.spec.mechanicalParameters.output_policy.public_force,
        force_pN: model.spec.mechanicalParameters.output_policy.force_value,
        approved_supported_range_nm:
          model.spec.mechanicalParameters.regime_policy.approved_supported_range_nm,
        sensitivity_status: model.spec.mechanicalParameters.sensitivity_policy.status,
        caveat: model.spec.mechanicalParameters.output_policy.public_caveat,
      },
      decision_statuses: Object.fromEntries(Object.entries(model.spec.scientificDecisions.decisions)
        .map(([id, decision]) => [id, decision.status])),
      registry_closure_is_entailment: false,
    },
  };
  return validateReleasePack(pack);
}

/** Structural gate: an artifact that is missing its provenance is not a handoff. */
export function validateReleasePack(pack) {
  if (!pack || pack.schema !== 'titin-release-pack/1') {
    throw new Error('validateReleasePack: unsupported record.');
  }
  if (!pack.claim_matrix.length) throw new Error('validateReleasePack: the claim matrix is empty.');
  const transcript = pack.transcripts;
  const textRows = transcript?.text_only || [];
  const screenReaderRows = transcript?.screen_reader || [];
  const presenterRows = pack.presenter_script.chapters || [];
  const transcriptWords = textRows.reduce((sum, row) => sum
    + wordCount(row.narration) + wordCount(row.state_change_announcement), 0);
  const expectedTranscriptSeconds = Number((
    (transcriptWords / pack.presenter_script.reading_words_per_minute) * 60
    + textRows.length * pack.presenter_script.chapter_transition_seconds
  ).toFixed(1));
  const rowsMatch = textRows.every((row, index) => {
    const presenter = presenterRows[index];
    const spoken = screenReaderRows[index]?.spoken_sequence;
    return presenter
      && row.id === presenter.id
      && row.order === presenter.order
      && row.narration === presenter.say
      && row.state_change_announcement === presenter.state_change_announcement
      && JSON.stringify(row.claim_ids) === JSON.stringify(presenter.claim_ids)
      && Array.isArray(row.claim_ids) && row.claim_ids.length > 0
      && Array.isArray(spoken)
      && spoken.includes(row.state_change_announcement)
      && spoken.includes(row.narration)
      && spoken.indexOf(row.state_change_announcement) < spoken.indexOf(row.narration);
  });
  const transcriptText = textRows.map((row) => row.narration).join('\n');
  const transcriptConcepts = [
    /repeating contractile unit.*Z-discs/is,
    /adenosine triphosphate \(ATP\).*myosin.*actin.*titin.*not the motor/is,
    /Z-disc.*M-line.*I-band.*A-band/is,
    /immunoglobulin-like \(Ig\).*fibronectin type III \(Fn3\).*disordered PEVK spring/is,
    /added length.*incremental compliance.*how readily/is,
    /telethonin.*not the sole force path.*M-line.*unresolved/is,
    /copy number.*azimuth.*register.*not encoded/is,
    /Measured comes from observations.*schematic means illustrative/is,
  ];
  if (transcript?.schema !== 'titin-transcripts/1'
      || textRows.length !== presenterRows.length
      || screenReaderRows.length !== textRows.length
      || !rowsMatch
      || transcript.word_count !== transcriptWords
      || transcript.estimated_seconds !== expectedTranscriptSeconds
      || transcriptConcepts.some((pattern) => !pattern.test(transcriptText))
      || transcript.estimated_seconds < transcript.target_seconds?.[0]
      || transcript.estimated_seconds > transcript.target_seconds?.[1]) {
    throw new Error(
      'validateReleasePack: transcripts are missing concepts, inaccessible, drifted, or outside pacing.',
    );
  }
  if (!pack.scientific_authority || pack.scientific_authority.registry_closure_is_entailment !== false) {
    throw new Error('validateReleasePack: scientific authority summary is missing or conflates closure with entailment.');
  }
  const contentReview = pack.scientific_authority.presentation_content_review;
  const contentClaims = contentReview?.required_claims;
  const contentApproved = Array.isArray(contentClaims)
    && contentClaims.every((claim) => claim.review_status === 'APPROVED'
      && (claim.approval_authority === 'NAMED_HUMAN_REVIEW'
        || (claim.approval_authority === 'PROJECT_OWNER'
          && claim.independent_human_review_status === 'NOT_PERFORMED')));
  if (!Array.isArray(contentClaims)
      || contentClaims.map((claim) => claim.id).join('|')
        !== 'sarcomere_definition|actomyosin_motor_function'
      || contentReview.release_ready !== contentApproved
      || contentReview.sprint_status !== (contentApproved
        ? 'COMPLETE' : 'CODE_COMPLETE_BLOCKED_CONTENT_REVIEW')
      || contentClaims.some((claim) => !['PROJECT_OWNER', 'NAMED_HUMAN_REVIEW']
        .includes(claim.approval_authority))) {
    throw new Error('validateReleasePack: SC-23 content-review authority is missing or overstated.');
  }
  const mechanics = pack.scientific_authority.mechanics;
  if (!mechanics?.parameter_set_id || mechanics.model_fingerprint !== pack.identity.model_fingerprint
      || mechanics.force_pN !== null) {
    throw new Error('validateReleasePack: mechanics authority or identity is missing.');
  }
  if (mechanics.decision_status !== 'APPROVED') {
    if (mechanics.public_force !== 'SUPPRESSED'
        || mechanics.evaluation_status !== 'not_evaluated'
        || mechanics.approved_supported_range_nm !== null
        || mechanics.sensitivity_status !== 'not_evaluated') {
      throw new Error('validateReleasePack: deferred mechanics authority leaks quantitative output.');
    }
    if (pack.scientific_authority.mechanics_sprint_status
        !== 'CODE_COMPLETE_BLOCKED_SCIENCE') {
      throw new Error('validateReleasePack: deferred mechanics has an invalid sprint status.');
    }
  } else if (mechanics.public_force !== 'AUTHORIZED_BY_REGIME'
      || mechanics.evaluation_status !== 'status_by_length'
      || !Array.isArray(mechanics.approved_supported_range_nm)
      || mechanics.approved_supported_range_nm.length !== 2
      || mechanics.sensitivity_status !== 'approved') {
    throw new Error('validateReleasePack: approved mechanics authority is incomplete.');
  }
  if (pack.scientific_authority.decision_statuses?.['SD-04'] !== mechanics.decision_status) {
    throw new Error('validateReleasePack: SD-04 ledger and parameter authority disagree.');
  }
  if (mechanics.decision_status === 'APPROVED') {
    const reviewer = mechanics.decision_reviewer;
    const adjudicator = mechanics.decision_adjudicator;
    const humanAuthority = reviewer?.name?.trim() && reviewer?.affiliation?.trim()
      && reviewer?.role?.trim()
      && ['COMPLETE', 'COMPLETED', 'PERFORMED', 'VERIFIED']
        .includes(mechanics.independent_human_review_status);
    const citationAuthority = !reviewer && adjudicator?.type === 'AI_SYSTEM'
      && adjudicator?.authority_basis === 'project_owner_authorization'
      && adjudicator?.human_expert === false
      && mechanics.independent_human_review_status === 'NOT_PERFORMED';
    if (!humanAuthority && !citationAuthority) {
      throw new Error('validateReleasePack: approved mechanics lacks honest decision provenance.');
    }
    const sprintStatus = pack.scientific_authority.mechanics_sprint_status;
    if (!['APPROVED_PENDING_IMPLEMENTATION_VERIFICATION', 'COMPLETE'].includes(sprintStatus)) {
      throw new Error('validateReleasePack: approved mechanics has an invalid sprint status.');
    }
    if (sprintStatus === 'COMPLETE') {
      const verification = mechanics.implementation_verification;
      if (verification?.status !== 'VERIFIED'
          || verification.implemented_model_fingerprint !== pack.identity.model_fingerprint
          || (humanAuthority && verification.reviewer_name !== reviewer.name)
          || (citationAuthority && (verification.reviewer_name !== null
            || verification.adjudicator_authority_basis !== 'project_owner_authorization'
            || verification.adjudicator_human_expert !== false))) {
        throw new Error(
          'validateReleasePack: mechanics completion lacks matching implementation verification.',
        );
      }
    }
  }
  for (const field of ['model_fingerprint', 'app_revision', 'build_inputs_fingerprint']) {
    if (!pack.identity || typeof pack.identity[field] !== 'string' || !pack.identity[field]) {
      throw new Error(`validateReleasePack: identity is missing '${field}'.`);
    }
  }
  for (const row of pack.claim_matrix) {
    if (!row.claim?.trim() || !row.scope?.trim() || !row.not_claimed.length) {
      throw new Error(`validateReleasePack: claim '${row.id}' is missing claim, scope, or non-claims.`);
    }
    if (!row.sources.length) {
      throw new Error(`validateReleasePack: claim '${row.id}' cites no source.`);
    }
    for (const source of row.sources) {
      if (!source.citation?.trim()) {
        throw new Error(`validateReleasePack: claim '${row.id}' has an unreadable citation.`);
      }
    }
  }
  if (pack.limitations.length < 4) {
    throw new Error('validateReleasePack: the limitations sheet is too thin to be a handoff.');
  }
  const script = pack.presenter_script;
  if (!script.chapters.length) throw new Error('validateReleasePack: the presenter script is empty.');
  const [low, high] = script.target_seconds;
  if (script.estimated_seconds < low || script.estimated_seconds > high) {
    throw new Error(
      `validateReleasePack: the script runs ${script.estimated_seconds} s, outside ${low}-${high} s.`,
    );
  }
  for (const row of script.chapters) {
    if (!row.say?.trim() || !row.show?.trim() || !row.source_ids.length) {
      throw new Error(`validateReleasePack: script step '${row.id}' is incomplete.`);
    }
  }
  if (pack.preflight.length !== 7) {
    throw new Error('validateReleasePack: the preflight must keep its seven reviewed steps.');
  }
  const slideIds = pack.fallback_slides.map((slide) => slide.id);
  for (const required of ['scope', 'architecture', 'extension', 'lattice', 'provenance', 'limitations']) {
    if (!slideIds.includes(required)) {
      throw new Error(`validateReleasePack: the fallback deck is missing '${required}'.`);
    }
  }
  for (const slide of pack.fallback_slides) {
    if (!slide.title?.trim() || !slide.footnote?.trim()) {
      throw new Error(`validateReleasePack: slide '${slide.id}' lacks a title or its caveat.`);
    }
  }
  return pack;
}
