/**
 * The presenter key bindings, in one place.
 *
 * SC-17 bound the three shortcuts `data/presentation.json` has declared since
 * SC-2. The map lived in `src/index.template.html`, which meant the release
 * pack could only restate the keys by hand — and a printed script that names a
 * key the page does not bind is worse than one that names no key at all,
 * because it fails at a lectern rather than in CI. Both the page and
 * `ReleasePack` read this module instead.
 *
 * Keyed by ACTION rather than by shortcut id, deliberately. The record decides
 * which actions exist — `validate_presentation.py` and `StoryController` both
 * reject one that names no chapter — and this map decides which letter reaches
 * them. Keyed by id, a record that retargeted a shortcut would silently move an
 * established key; keyed by action it leaves a visible hole, and
 * `test/showcase_phase17.test.js` is that hole.
 */

/** @typedef {{id: string, label: string, action: string}} PresenterShortcut */
/** @typedef {{presenter_shortcuts: PresenterShortcut[], guided_chapters: {id: string}[]}} PresentationRecord */

/** One letter per declared presenter action. */
export const PRESENTER_KEY_BY_ACTION = Object.freeze({
  'story.orientation': 'r',
  'story.elastic_regions': 'x',
  'mode.evidence': 'e',
});

/**
 * The two stage verbs no shortcut record declares: the way back out of
 * Evidence, and the sweep, which IS the demonstration.
 */
export const STAGE_KEYS = Object.freeze([
  Object.freeze({ key: 'g', action: 'mode.guided', label: 'Return to Guided' }),
  Object.freeze({ key: ' ', action: 'sweep.toggle', label: 'Run the stretch sweep' }),
]);

/** How a key is written for a reader. Space has no glyph of its own. */
const KEY_LABEL = { ' ': 'space' };

/**
 * key → action, resolved from the validated presentation record.
 *
 * @param {PresentationRecord} presentation
 * @returns {Record<string, string>}
 */
export function presenterKeys(presentation) {
  const keys = Object.fromEntries(
    (presentation.presenter_shortcuts || [])
      .filter((shortcut) => PRESENTER_KEY_BY_ACTION[shortcut.action])
      .map((shortcut) => [PRESENTER_KEY_BY_ACTION[shortcut.action], shortcut.action]),
  );
  for (const { key, action } of STAGE_KEYS) keys[key] = action;
  return keys;
}

/**
 * Every declared shortcut a letter does NOT reach.
 *
 * Empty is the only acceptable answer, and it is asserted rather than assumed:
 * a shortcut the record declares and nothing binds is content that ships
 * without arriving.
 *
 * @param {PresentationRecord} presentation
 * @returns {string[]} shortcut ids
 */
export function unboundShortcutIds(presentation) {
  return (presentation.presenter_shortcuts || [])
    .filter((shortcut) => !PRESENTER_KEY_BY_ACTION[shortcut.action])
    .map((shortcut) => shortcut.id);
}

/**
 * One readable row per bound key, for the release pack and any other reader
 * that has to print them. The labels come from the record, so the script a
 * presenter holds says what the page actually does.
 *
 * @param {PresentationRecord} presentation
 * @returns {{keys: string, action: string, label: string}[]}
 */
export function presenterKeyGuide(presentation) {
  const chapters = (presentation.guided_chapters || []).length;
  const rows = chapters
    ? [{ keys: `1–${chapters}`, action: 'story.step', label: 'Jump to a chapter by number' }]
    : [];
  for (const shortcut of presentation.presenter_shortcuts || []) {
    const key = PRESENTER_KEY_BY_ACTION[shortcut.action];
    if (key) rows.push({ keys: KEY_LABEL[key] || key, action: shortcut.action, label: shortcut.label });
  }
  for (const { key, action, label } of STAGE_KEYS) {
    rows.push({ keys: KEY_LABEL[key] || key, action, label });
  }
  return rows;
}
