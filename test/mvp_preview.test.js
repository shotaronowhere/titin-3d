import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';
import { renderedSceneNotes } from '../src/render/Viewer.js';

const model = await TitinModel.create(nodeReader());

test('MVP rendered notes describe local, patch and isolated builds without adopting diagnostic copy counts', () => {
  for (const scope of ['local', 'patch', 'isolated']) {
    const descriptor = scope === 'isolated'
      ? model.sceneAt(2200) : model.contextSceneAt(2200, { rings: 2 });
    const scene = new SarcomereScene();
    try {
      scene.build(descriptor, model.domainInstancesAt(2200), {
        latticeScope: scope === 'isolated' ? 'local' : scope,
        titinStrands: false, mirror: false, showDomains: false,
        presentationMode: 'evidence', titinPath: model.backboneAt(2200),
      });
      const manifest = scene.manifest;
      const notes = renderedSceneNotes(descriptor, manifest).join('\n');
      assert.match(notes, /1 representative titin path\(s\) built per half-sarcomere/);
      assert.match(notes, /biological copy number is not depicted/);
      assert.doesNotMatch(notes, /6 of|patch thin:thick ratio|strands drawn on the central/);
      if (manifest.lattice) {
        assert.ok(notes.includes(`${manifest.lattice.thick_drawn} thick filament(s), `
          + `${manifest.lattice.thin_drawn} thin filament(s)`));
        assert.ok(notes.includes(descriptor.lattice.provenance.idealization));
      } else assert.doesNotMatch(notes, /filament context|Extended lattice/);
      assert.deepEqual(model.verifyScene(descriptor).errors, []);
    } finally { scene.clear(); }
  }
});
