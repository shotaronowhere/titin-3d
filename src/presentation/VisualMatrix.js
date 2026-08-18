/**
 * Deterministic visual-review matrix, regenerated for SC-24 semantic scenes.
 *
 * Every cell is a viewport plus a canonical SceneController URL v2 hash. The
 * manifest retains the broad SC-8 coverage while making the seven biological
 * scene intentions first-class capture cells. Retired camera-inventory cells
 * carry an explicit old→new disposition instead of silently disappearing.
 */

import { SceneController } from './SceneController.js';

export const VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'projector', width: 1920, height: 1080, label: 'Presentation / projector' }),
  Object.freeze({ id: 'desktop', width: 1440, height: 900, label: 'Desktop' }),
  Object.freeze({ id: 'laptop', width: 1280, height: 720, label: 'Compact laptop' }),
  Object.freeze({ id: 'mobile', width: 390, height: 844, label: 'Mobile' }),
]);

export const COLOR_FILTERS = Object.freeze([
  'protanopia', 'deuteranopia', 'tritanopia', 'grayscale',
]);

const PRIMARY_VIEWPORT = 'projector';
const defaultOptions = Object.freeze({
  mybpc: false,
  reduced_motion: false,
  color_filter: null,
});

const clone = (value) => structuredClone(value);
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
};

function chapterLayers(visibility = {}) {
  return {
    show_lattice: Boolean(visibility.show_lattice),
    show_domains: Boolean(visibility.show_domains),
    show_context_detail: Boolean(visibility.show_context_detail),
    mirror: visibility.mirror !== false,
    extended_lattice: false,
    lattice_rings_1: true,
    lattice_rings_2: false,
    lattice_rings_3: false,
  };
}

export function validateVisualMatrix(matrix) {
  if (!matrix || matrix.schema !== 'titin-visual-matrix/2') {
    throw new Error('validateVisualMatrix: unsupported record.');
  }
  const ids = new Set();
  for (const cell of matrix.cells) {
    if (ids.has(cell.id)) throw new Error(`validateVisualMatrix: duplicate cell '${cell.id}'.`);
    ids.add(cell.id);
    if (!matrix.viewports.some((viewport) => viewport.id === cell.viewport_id)) {
      throw new Error(`validateVisualMatrix: cell '${cell.id}' uses an undeclared viewport.`);
    }
    if (!cell.url_hash?.startsWith('#v=2&') || !cell.label?.trim() || !cell.group?.trim()) {
      throw new Error(`validateVisualMatrix: cell '${cell.id}' is incomplete or is not URL v2.`);
    }
    if (cell.options.color_filter !== null
        && !COLOR_FILTERS.includes(cell.options.color_filter)) {
      throw new Error(`validateVisualMatrix: cell '${cell.id}' names an unknown colour filter.`);
    }
  }
  for (const required of matrix.required_groups) {
    if (!matrix.cells.some((cell) => cell.group === required)) {
      throw new Error(`validateVisualMatrix: no cell covers the required group '${required}'.`);
    }
  }
  for (const viewport of matrix.viewports) {
    if (!matrix.cells.some((cell) => cell.viewport_id === viewport.id)) {
      throw new Error(`validateVisualMatrix: viewport '${viewport.id}' is never captured.`);
    }
  }
  const retired = new Set();
  for (const row of matrix.legacy_disposition || []) {
    if (!row.old_cell_id || retired.has(row.old_cell_id) || ids.has(row.old_cell_id)) {
      throw new Error(`validateVisualMatrix: invalid retired cell '${row.old_cell_id}'.`);
    }
    retired.add(row.old_cell_id);
    if (row.disposition !== 'replaced' || !ids.has(row.new_cell_id) || !row.reason?.trim()) {
      throw new Error(`validateVisualMatrix: incomplete disposition for '${row.old_cell_id}'.`);
    }
  }
  return matrix;
}

/**
 * @param {import('../model/TitinModel.js').TitinModel} model
 * @param {{views: string[], closeups: string[], scales: string[], targets: string[],
 *   minLength: number, maxLength: number}} capabilities
 */
export function createVisualMatrix(model, capabilities) {
  const presentation = model.spec.presentation;
  const controller = new SceneController(model.spec.scenes, {
    ...capabilities,
    claimIds: model.spec.claimSupport.claims.map((claim) => claim.id),
  }, { presentation });
  const chapters = presentation.guided_chapters;
  const cells = [];

  const chapterState = (chapterId) => {
    const chapter = chapters.find((entry) => entry.id === chapterId);
    if (!chapter) throw new Error(`createVisualMatrix: unknown chapter '${chapterId}'.`);
    const recommended = chapter.recommended_state;
    const selectionId = recommended.selected_component_or_region ?? chapter.target?.id ?? null;
    const state = {
      ...controller.defaultState({ story_step: chapter.id }),
      story_step: chapter.id,
      camera_preset: recommended.camera_preset,
      scale: recommended.scale,
      context: recommended.scale === 'context',
      layers: chapterLayers(recommended.visibility),
      selection: selectionId === null ? null : {
        kind: chapter.target?.kind || 'component', id: selectionId,
      },
    };
    return controller.reconcile(state);
  };

  const custom = (state, patch = {}) => controller.update(
    { ...clone(state), ...clone(patch), scene_id: null }, {}, { infer: false },
  );

  const cell = (id, group, viewportId, state, label, options = {}) => {
    const hash = controller.serialize(state);
    const decoded = controller.parse(hash);
    if (decoded.issues.length
        || JSON.stringify(stable(decoded.state)) !== JSON.stringify(stable(state))) {
      throw new Error(`createVisualMatrix: cell '${id}' is not reproducible: `
        + `${decoded.issues.join(' ') || 'decoded state differs'}`);
    }
    cells.push({
      id,
      group,
      viewport_id: viewportId,
      url_hash: hash,
      state: clone(state),
      options: { ...defaultOptions, ...options },
      label,
    });
  };

  const opening = chapterState(chapters[0].id);
  for (const sceneId of controller.order) {
    const scene = controller.scene(sceneId);
    cell(`scene_${sceneId}`, 'semantic_scenes', PRIMARY_VIEWPORT,
      controller.resolveScene(sceneId, opening), `Semantic scene: ${scene.label}`);
  }

  for (const chapter of chapters) {
    for (const viewport of VIEWPORTS) {
      cell(`chapter_${chapter.id}_${viewport.id}`, 'guided_chapters', viewport.id,
        chapterState(chapter.id), `${chapter.title} — ${viewport.label}`);
    }
  }

  const evidenceBase = custom(opening, {
    depth: 'explore', drawer: 'inspect', confidence_display: true,
  });
  for (const viewport of VIEWPORTS) {
    cell(`evidence_${viewport.id}`, 'evidence_mode', viewport.id,
      evidenceBase, `Explore / Inspect — ${viewport.label}`);
  }

  const states = model.spec.states.states;
  const workingRange = presentation.scope.working_range_nm;
  const lengths = [
    ...Object.entries(states).map(([id, state]) => [id, state.sarcomere_length_nm]),
    ['working_range_low', workingRange[0]],
  ];
  for (const [id, sarcomereLengthNm] of lengths) {
    if (cells.some((entry) => entry.group === 'length_states'
        && entry.state.sarcomere_length_nm === sarcomereLengthNm)) continue;
    cell(`length_${id}`, 'length_states', PRIMARY_VIEWPORT,
      custom(evidenceBase, { sarcomere_length_nm: sarcomereLengthNm }),
      `Inspect at ${sarcomereLengthNm} nm (${id})`);
  }

  // The Z-disc, lattice, and C-zone raw close-up cells are retired below in
  // favour of semantic captures. M-line and exact-region states have no compact
  // equivalent and remain explicit Custom cells.
  cell('closeup_mline', 'closeups', PRIMARY_VIEWPORT,
    custom(evidenceBase, {
      camera_preset: 'closeup.mline', selection: null,
      layers: {
        ...evidenceBase.layers,
        show_lattice: true,
        show_context_detail: true,
        mirror: true,
      },
    }),
    'Custom close-up: M-line');
  for (const region of ['PEVK', 'N2A']) {
    cell(`region_${region}`, 'closeups', PRIMARY_VIEWPORT,
      custom(evidenceBase, {
        scale: 'detail', context: false, camera_preset: `region.${region}`,
        selection: { kind: 'region', id: region },
      }), `Custom region close-up: ${region}`);
  }

  const scaffold = controller.resolveScene(
    'a_band_scaffold', chapterState('scaffold_thick_filament'),
  );
  const scaffoldEvidence = custom(scaffold, {
    depth: 'explore', drawer: 'inspect', confidence_display: true,
  });
  for (const enabled of [false, true]) {
    cell(`mybpc_${enabled ? 'on' : 'off'}`, 'mybpc_context', PRIMARY_VIEWPORT,
      scaffoldEvidence, `A-band scaffold — MyBP-C ${enabled ? 'enabled' : 'disabled'}`,
      { mybpc: enabled });
  }

  cell('selection_none', 'selection', PRIMARY_VIEWPORT,
    custom(evidenceBase, { selection: null }), 'No selection');
  cell('selection_region', 'selection', PRIMARY_VIEWPORT,
    custom(evidenceBase, {
      selection: { kind: 'region', id: 'PEVK' }, camera_preset: 'region.PEVK',
    }), 'Selected titin region');

  cell('reduced_motion', 'reduced_motion', PRIMARY_VIEWPORT,
    opening, 'Opening chapter under prefers-reduced-motion', { reduced_motion: true });

  for (const filter of COLOR_FILTERS) {
    cell(`vision_${filter}`, 'colour_vision', PRIMARY_VIEWPORT,
      evidenceBase, `Identity palette under ${filter}`, { color_filter: filter });
  }

  return validateVisualMatrix({
    schema: 'titin-visual-matrix/2',
    purpose: 'Deterministic SC-24 capture set generated from semantic scenes and '
      + 'canonical URL v2 state. Pixel comparison supplements human review and does '
      + 'not determine scientific correctness.',
    viewports: VIEWPORTS.map((viewport) => ({ ...viewport })),
    color_filters: [...COLOR_FILTERS],
    required_groups: [
      'semantic_scenes', 'guided_chapters', 'evidence_mode', 'length_states',
      'closeups', 'mybpc_context', 'selection', 'reduced_motion', 'colour_vision',
    ],
    capture_rules: [
      'fixed camera state from the semantic scene or documented Custom state',
      'device pixel ratio pinned to 1',
      'animation disabled for capture',
      'the standalone build, not a development server',
    ],
    legacy_disposition: [
      {
        old_cell_id: 'closeup_zdisc', disposition: 'replaced', new_cell_id: 'scene_z_anchor',
        reason: 'The reviewed Z-anchor scene supersedes the raw Z-disc camera inventory cell.',
      },
      {
        old_cell_id: 'closeup_lattice', disposition: 'replaced', new_cell_id: 'scene_lattice',
        reason: 'The reviewed Lattice scene supersedes the raw lattice camera inventory cell.',
      },
      {
        old_cell_id: 'closeup_czone', disposition: 'replaced', new_cell_id: 'scene_a_band_scaffold',
        reason: 'The reviewed A-band scaffold scene supersedes the raw C-zone camera inventory cell.',
      },
    ],
    cells,
  });
}
