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
      say: chapter.lay_summary,
      show: `${move}; ${scene.sarcomere_length_nm} nm, ${scene.scale} scale`,
      if_asked: chapter.expert_expansion,
      not_claimed: [...chapter.not_claimed],
      source_ids: [...chapter.source_ids],
      words: wordCount(chapter.lay_summary),
      estimated_seconds: Number(
        ((wordCount(chapter.lay_summary) / pacing.reading_words_per_minute) * 60
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

/**
 * The static fallback deck, as descriptors. Each slide reads the same canonical
 * output the 3-D scene reads, so the deck cannot say something the application
 * would not.
 */
function fallbackSlides(model, referenceLengthNm, comparisonLengthNm) {
  const presentation = model.spec.presentation;
  const badge = presentation.scope_badges[0];
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
      subtitle: badge.label,
      lines: [
        `Species: ${presentation.scope.species}`,
        `Reference: ${presentation.scope.accession} — ${presentation.scope.isoform}`,
        `Muscle type: ${presentation.scope.muscle_type}`,
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

  const pack = {
    schema: 'titin-release-pack/1',
    identity: { ...identity },
    generated_from: [
      'data/showcase_claims.json', 'data/references.json', 'data/presentation.json',
      'data/annotations.json', 'data/sarcomere.json', 'data/titin.json',
      'data/structural_states.json',
    ],
    reference_length_nm: referenceLengthNm,
    comparison_length_nm: comparisonLengthNm,
    claim_matrix: claimMatrix(model),
    limitations: limitations(model),
    presenter_script: presenterScript(model),
    preflight: PREFLIGHT_STEPS.map(([id, action, expected], index) => ({
      step: index + 1, id, action, expected,
    })),
    fallback_slides: fallbackSlides(model, referenceLengthNm, comparisonLengthNm),
  };
  return validateReleasePack(pack);
}

/** Structural gate: an artifact that is missing its provenance is not a handoff. */
export function validateReleasePack(pack) {
  if (!pack || pack.schema !== 'titin-release-pack/1') {
    throw new Error('validateReleasePack: unsupported record.');
  }
  if (!pack.claim_matrix.length) throw new Error('validateReleasePack: the claim matrix is empty.');
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
