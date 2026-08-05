/**
 * SC-8 deterministic visual matrix.
 *
 * The plan asks for a screenshot set that covers every guided chapter, Evidence
 * mode, the reference keyframes and working-range endpoints, the close-ups, the
 * optional MyBP-C layer both ways, selection, reduced motion, and a colour-vision
 * review — captured at four declared viewports.
 *
 * The thing that makes such a matrix worth anything is REPRODUCIBILITY: a cell
 * nobody can return to is a screenshot, not a control. Every cell here is
 * therefore expressed as a viewport plus the SC-1 URL hash, and each hash is
 * round-tripped through the same StoryController the browser uses. A cell that
 * cannot be decoded back to the state it names is rejected at construction, so
 * the matrix cannot drift away from the application it is supposed to audit.
 *
 * Two axes are deliberately NOT URL state, because neither is a biological or
 * presentation state the application owns: the optional MyBP-C display option and
 * the viewer's reduced-motion preference. They travel beside the hash as capture
 * options, and the colour-vision axis is a post-capture filter over an ordinary
 * cell rather than a different application state.
 *
 * This module renders nothing. It emits a manifest; capture is a separate step
 * that needs a browser, and the plan is explicit that pixel comparison
 * supplements human review rather than determining scientific correctness.
 */

import { StoryController } from './StoryController.js';

/** The four capture viewports the plan names, in descending width. */
export const VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'projector', width: 1920, height: 1080, label: 'Presentation / projector' }),
  Object.freeze({ id: 'desktop', width: 1440, height: 900, label: 'Desktop' }),
  Object.freeze({ id: 'laptop', width: 1280, height: 720, label: 'Compact laptop' }),
  Object.freeze({ id: 'mobile', width: 390, height: 844, label: 'Mobile' }),
]);

/** Post-capture review filters. These re-render no state; they re-read one. */
export const COLOR_FILTERS = Object.freeze([
  'protanopia', 'deuteranopia', 'tritanopia', 'grayscale',
]);

/** The viewport every single-viewport group is captured at. */
const PRIMARY_VIEWPORT = 'projector';

const defaultOptions = Object.freeze({
  mybpc: false,
  reduced_motion: false,
  color_filter: null,
});

export function validateVisualMatrix(matrix) {
  if (!matrix || matrix.schema !== 'titin-visual-matrix/1') {
    throw new Error('validateVisualMatrix: unsupported record.');
  }
  const ids = new Set();
  for (const cell of matrix.cells) {
    if (ids.has(cell.id)) throw new Error(`validateVisualMatrix: duplicate cell '${cell.id}'.`);
    ids.add(cell.id);
    if (!matrix.viewports.some((viewport) => viewport.id === cell.viewport_id)) {
      throw new Error(`validateVisualMatrix: cell '${cell.id}' uses an undeclared viewport.`);
    }
    if (!cell.url_hash?.startsWith('#') || !cell.label?.trim() || !cell.group?.trim()) {
      throw new Error(`validateVisualMatrix: cell '${cell.id}' is incomplete.`);
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
  // Every declared viewport must actually be captured, or "at minimum these four"
  // would be a list rather than a requirement.
  for (const viewport of matrix.viewports) {
    if (!matrix.cells.some((cell) => cell.viewport_id === viewport.id)) {
      throw new Error(`validateVisualMatrix: viewport '${viewport.id}' is never captured.`);
    }
  }
  return matrix;
}

/**
 * @param {import('../model/TitinModel.js').TitinModel} model
 * @param {{views: string[], closeups: string[], scales: string[], targets: string[],
 *   hiddenTargetsByScale: Record<string, string[]>, minLength: number, maxLength: number}} capabilities
 */
export function createVisualMatrix(model, capabilities) {
  const presentation = model.spec.presentation;
  const controller = new StoryController(presentation, capabilities);
  const cells = [];

  /**
   * Build one cell and prove it is reachable. `serialize` already refuses to
   * encode an unsupported state, and the decode check catches the subtler failure
   * where a hash encodes cleanly but decodes to something else.
   */
  const cell = (id, group, viewportId, state, label, options = {}) => {
    const hash = controller.serialize(state);
    const decoded = controller.parse(hash);
    if (decoded.issues.length) {
      throw new Error(`createVisualMatrix: cell '${id}' is not reproducible: ${decoded.issues.join(' ')}`);
    }
    for (const [key, value] of Object.entries(state)) {
      if (decoded.state[key] !== value) {
        throw new Error(`createVisualMatrix: cell '${id}' decodes '${key}' as '${decoded.state[key]}', not '${value}'.`);
      }
    }
    cells.push({
      id,
      group,
      viewport_id: viewportId,
      url_hash: hash,
      state: { ...state },
      options: { ...defaultOptions, ...options },
      label,
    });
  };

  // Every guided chapter, at every declared viewport: the guided route is what a
  // first-time viewer sees, so it is the part that has to survive every screen.
  for (const chapter of controller.chapters) {
    for (const viewport of VIEWPORTS) {
      cell(`chapter_${chapter.id}_${viewport.id}`, 'guided_chapters', viewport.id,
        controller.stateForChapter(chapter.id),
        `${chapter.title} — ${viewport.label}`);
    }
  }

  // Evidence mode at every viewport: the drawer is the layout most at risk on a
  // narrow screen, where it becomes a bottom sheet.
  const evidenceBase = {
    ...controller.stateForChapter(controller.chapters[0].id),
    audience_mode: 'evidence',
    evidence_display: true,
  };
  for (const viewport of VIEWPORTS) {
    cell(`evidence_${viewport.id}`, 'evidence_mode', viewport.id,
      evidenceBase, `Evidence mode — ${viewport.label}`);
  }

  // Reference keyframes and the lower working-range endpoint. 2,400 nm is already
  // the `stretched` keyframe, so only 2,000 nm is additional.
  const states = model.spec.states.states;
  const workingRange = presentation.scope.working_range_nm;
  const lengths = [
    ...Object.entries(states).map(([id, state]) => [id, state.sarcomere_length_nm]),
    ['working_range_low', workingRange[0]],
  ];
  for (const [id, sarcomereLengthNm] of lengths) {
    if (cells.some((existing) => existing.state.sarcomere_length_nm === sarcomereLengthNm
        && existing.group === 'length_states')) continue;
    cell(`length_${id}`, 'length_states', PRIMARY_VIEWPORT,
      { ...evidenceBase, sarcomere_length_nm: sarcomereLengthNm },
      `Evidence at ${sarcomereLengthNm} nm (${id})`);
  }

  // Close-ups: the anchors, the lattice, the C-zone, and the two disordered
  // I-band regions the extension story turns on.
  for (const name of ['zdisc', 'mline', 'lattice', 'czone']) {
    cell(`closeup_${name}`, 'closeups', PRIMARY_VIEWPORT,
      { ...evidenceBase, camera_preset: `closeup.${name}`, selected_component_or_region: null },
      `Close-up: ${name}`);
  }
  for (const region of ['PEVK', 'N2A']) {
    cell(`region_${region}`, 'closeups', PRIMARY_VIEWPORT,
      {
        ...evidenceBase,
        scale: 'detail',
        camera_preset: `region.${region}`,
        selected_component_or_region: region,
      },
      `Region close-up: ${region}`);
  }

  // The optional MyBP-C layer, both ways, on the view that carries it. The two
  // cells are the same application state; only the display option differs, which
  // is what makes them a usable before/after pair.
  const scaffold = controller.stateForChapter('anchored_scaffold');
  const scaffoldEvidence = { ...scaffold, audience_mode: 'evidence', evidence_display: true };
  for (const enabled of [false, true]) {
    cell(`mybpc_${enabled ? 'on' : 'off'}`, 'mybpc_context', PRIMARY_VIEWPORT,
      scaffoldEvidence, `A-band scaffold — MyBP-C ${enabled ? 'enabled' : 'disabled'}`,
      { mybpc: enabled });
  }

  // Selected versus unselected, so the selection channel can be reviewed against
  // the identity and evidence channels it must stay separate from.
  cell('selection_none', 'selection', PRIMARY_VIEWPORT,
    { ...evidenceBase, selected_component_or_region: null }, 'No selection');
  cell('selection_region', 'selection', PRIMARY_VIEWPORT,
    { ...evidenceBase, selected_component_or_region: 'PEVK', camera_preset: 'region.PEVK' },
    'Selected titin region');

  // Reduced motion is a viewer preference, not application state: the same cell,
  // captured with the preference on, must be scientifically identical.
  cell('reduced_motion', 'reduced_motion', PRIMARY_VIEWPORT,
    controller.stateForChapter(controller.chapters[0].id),
    'Opening chapter under prefers-reduced-motion', { reduced_motion: true });

  // Colour-vision and grayscale review filters over the densest identity scene.
  for (const filter of COLOR_FILTERS) {
    cell(`vision_${filter}`, 'colour_vision', PRIMARY_VIEWPORT,
      evidenceBase, `Identity palette under ${filter}`, { color_filter: filter });
  }

  return validateVisualMatrix({
    schema: 'titin-visual-matrix/1',
    purpose: 'Deterministic capture set for the SC-8 visual review. Each cell is a '
      + 'viewport plus a reproducible URL state; pixel comparison supplements human '
      + 'review and does not determine scientific correctness.',
    viewports: VIEWPORTS.map((viewport) => ({ ...viewport })),
    color_filters: [...COLOR_FILTERS],
    required_groups: [
      'guided_chapters', 'evidence_mode', 'length_states', 'closeups',
      'mybpc_context', 'selection', 'reduced_motion', 'colour_vision',
    ],
    capture_rules: [
      'fixed camera state from the named preset in each cell',
      'device pixel ratio pinned to 1',
      'animation disabled for capture',
      'the standalone build, not a development server',
    ],
    cells,
  });
}
