/** SC-11 gates: the tour reaches the cameras it declares. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { StoryController } from '../src/presentation/StoryController.js';

const model = await TitinModel.create(nodeReader());
const { min, max } = model.slRange();
// The second constructor argument is a RUNTIME CAPABILITY descriptor, not the
// model: StoryController deliberately knows nothing about geometry, and it
// throws if a chapter names a camera, scale or target the runtime cannot offer.
// Built here exactly as test/presentation.test.js and the page build it, so this
// file exercises the same controller the browser gets.
const story = new StoryController(model.spec.presentation, {
  views: Object.keys(VIEWS),
  closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES),
  targets: [...model.titinRegions().map((region) => region.id), ...Object.keys(COMPONENTS)],
  hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
  minLength: min,
  maxLength: max,
});

// `story.chapters` is an array property, not a method — assigned at StoryController:383.
test('SC11-0: a step-only hash adopts that chapter\'s declared camera', () => {
  for (const chapter of story.chapters) {
    const decoded = story.parse(`#mode=guided&step=${chapter.id}`);
    assert.equal(decoded.state.camera_preset, chapter.recommended_state.camera_preset,
      `step=${chapter.id} must frame ${chapter.id}, not whatever was on screen before`);
  }
});

test('SC11-0: an explicit camera still wins over the chapter default', () => {
  const decoded = story.parse('#mode=guided&step=anchors&camera=view.oblique');
  assert.equal(decoded.state.camera_preset, 'view.oblique');
});

// A close-up chapter that leaves the context-detail layer off renders the bare
// cylinder that src/index.template.html:1224 describes as "a rendering failure".
test('SC11-0: every close-up chapter enables its detail layer', () => {
  for (const chapter of story.chapters) {
    const scene = chapter.recommended_state;
    if (!scene.camera_preset.startsWith('closeup.')) continue;
    assert.equal(scene.visibility.show_context_detail, true,
      `chapter '${chapter.id}' frames a close-up; without context detail it shows a bare cylinder`);
  }
});

// A close-up chapter must be describable by a URL that survives a reload.
test('SC11-0: a close-up chapter round-trips through its own URL', () => {
  for (const chapter of story.chapters) {
    const scene = chapter.recommended_state;
    if (!scene.camera_preset.startsWith('closeup.')) continue;
    const hash = story.serialize(story.stateForChapter(chapter.id));
    assert.equal(story.parse(hash).state.camera_preset, scene.camera_preset);
  }
});
