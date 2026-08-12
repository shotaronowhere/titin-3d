/**
 * Data-layer tests (Node built-in test runner, zero external deps).
 * Run: node --test  (from the project root)
 *
 * Verifies the Phase 2 contract: the model loads + validates the spec, exposes a
 * correct interpolatable geometry API, and structurally enforces the forbidden rules.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TitinModel } from '../src/model/TitinModel.js';
import { DOMAIN_CLASSES } from '../src/geometry/TitinRepresentation.js';
import { Spec, SpecValidationError } from '../src/model/SpecLoader.js';
import { nodeReader } from '../src/model/readNode.js';

const reader = nodeReader();
const model = await TitinModel.create(reader);
const eng = model.geometry;

test('spec loads and validates cleanly', async () => {
  const spec = await Spec.load(reader);
  const { ok, problems } = spec.check();
  assert.equal(ok, true, `validation problems: ${problems.join('; ')}`);
});

test('validation rejects a broken spec (dangling citation)', async () => {
  const bad = await Spec.load(reader, { validate: false });
  bad.titin.regions[0].primary_references = ['10.9999/does-not-exist'];
  const { ok, problems } = bad.check();
  assert.equal(ok, false);
  assert.ok(problems.some((p) => p.includes('does-not-exist')));
});

test('validation rejects domain-total mismatch', async () => {
  const bad = await Spec.load(reader, { validate: false });
  bad.titin.regions[0].domain_composition.Ig_like += 5;
  assert.throws(() => bad.validate(), SpecValidationError);
});

test('presets match the four spec keyframes', () => {
  const names = model.presets().map((p) => p.name).sort();
  assert.deepEqual(names, ['contracted', 'extended_reference', 'resting', 'stretched'].sort());
});

test('geometry at a preset reproduces the keyframe exactly', () => {
  for (const p of model.presets()) {
    const g = eng.geometryAtPreset(p.name);
    const kf = model.spec.states.states[p.name];
    assert.equal(g.sarcomere_length_nm, kf.sarcomere_length_nm);
    assert.ok(Math.abs(g.I_band_half_width_nm - kf.I_band_half_width_nm) < 1e-6);
    assert.ok(Math.abs(g.titin_iband_total_nm - kf.titin_I_band_total_nm) < 1e-6,
      `${p.name}: titin total ${g.titin_iband_total_nm} vs ${kf.titin_I_band_total_nm}`);
  }
});

test('INVARIANT: thick filament length never changes across the SL range', () => {
  const L = eng.thickLen;
  for (let sl = eng.slMin; sl <= eng.slMax; sl += 25) {
    const g = eng.geometryAt(sl);
    assert.ok(Math.abs(g.thick_filament.length - L) < 1e-9, `thick len drifted at SL=${sl}`);
  }
});

test('INVARIANT: titin extension confined to I-band (span == I-band half-width - Z-disc half-width)', () => {
  const zHalf = eng.zWidth / 2;
  for (let sl = eng.slMin; sl <= eng.slMax; sl += 25) {
    const g = eng.geometryAt(sl);
    // elastic titin spans the Z-disc edge -> A-band tip
    assert.ok(Math.abs(g.titin_iband_total_nm - (g.I_band_half_width_nm - zHalf)) < 1.0,
      `SL=${sl}: titin ${g.titin_iband_total_nm.toFixed(1)} vs (I-band ${g.I_band_half_width_nm.toFixed(1)} - zHalf ${zHalf})`);
    // and the distal end must reach exactly the A-band tip
    const distalEnd = g.titin_iband_layout_nm[eng.titinElements[eng.titinElements.length - 1]].X_end;
    assert.ok(Math.abs(distalEnd - g.thick_filament.X_start) < 1.0,
      `SL=${sl}: distal titin end ${distalEnd.toFixed(1)} != A-band tip ${g.thick_filament.X_start.toFixed(1)}`);
    assert.deepEqual(eng.checkForbidden(g), []);
  }
});

test('INVARIANT: half-sarcomere = SL/2 and I-band = SL/2 - halfThick', () => {
  for (let sl = eng.slMin; sl <= eng.slMax; sl += 37) {
    const g = eng.geometryAt(sl);
    assert.ok(Math.abs(g.half_sarcomere_nm - sl / 2) < 1e-9);
    assert.ok(Math.abs(g.I_band_half_width_nm - (sl / 2 - eng.halfThick)) < 1e-9);
  }
});

test('titin is NOT uniformly scaled: PEVK recruits nonlinearly vs prox_Ig', () => {
  // Between resting (2200) and extended (3000), PEVK should grow far more (fractionally)
  // than proximal Ig — the recruitment-order signature. A uniform scaler would grow both equally.
  const gRest = eng.geometryAt(2200);
  const gExt = eng.geometryAt(3000);
  const pevkFold = gExt.titin_iband_extension_nm.PEVK / gRest.titin_iband_extension_nm.PEVK;
  const igFold = gExt.titin_iband_extension_nm.prox_Ig / gRest.titin_iband_extension_nm.prox_Ig;
  assert.ok(pevkFold > igFold * 3, `PEVK fold ${pevkFold.toFixed(2)} not >> prox_Ig fold ${igFold.toFixed(2)}`);
});

test('lattice d10 follows constant-volume law: monotonic decrease with SL', () => {
  let prev = Infinity;
  for (let sl = eng.slMin; sl <= eng.slMax; sl += 50) {
    const d = eng.latticeD10(sl);
    assert.ok(d < prev, `d10 not decreasing at SL=${sl}`);
    prev = d;
  }
  // spot-check against spec keyframe values (law computed at exact SL)
  const g = eng.geometryAt(2200);
  assert.ok(Math.abs(g.lattice_d10_nm - model.spec.states.states.resting.lattice_d10_nm) < 0.2);
});

test('SL requests outside range are clamped and flagged', () => {
  const lo = eng.geometryAt(eng.slMin - 500);
  assert.equal(lo.was_clamped, true);
  assert.equal(lo.sarcomere_length_nm, eng.slMin);
  const inRange = eng.geometryAt(2300);
  assert.equal(inRange.was_clamped, false);
});

test('provenance: PEVK render proxy is SCHEMATIC, span is MEASURED', () => {
  const ev = model.provenance.forRegion('PEVK');
  assert.equal(ev.byClaim.residue_span_and_domain_count, 'MEASURED');
  assert.equal(ev.byClaim.render_geometry_proxy, 'SCHEMATIC');
  assert.ok(String(ev.byClaim.detailed_3D_conformation).startsWith('UNKNOWN'));
});

test('provenance: unknowns are explicit and non-empty', () => {
  const u = model.unknowns();
  assert.ok(u.length >= 4, `expected explicit unknowns, got ${u.length}`);
  assert.ok(u.every((x) => x.class && x.modeling_directive));
});

test('forbidden rules surface to the UI layer', () => {
  const rules = model.forbiddenRules();
  assert.ok(rules.some((r) => /I-band only/i.test(r)));
  assert.ok(rules.some((r) => /unfolding/i.test(r)));
});

test('forParameter resolves by component ID and by human name', () => {
  const params = model.provenance.parametersFor('thick_filament');
  assert.ok(params.length > 0, 'thick_filament should expose parameters');
  const byName = model.provenance.forParameter('Thick filament', params[0]);
  const byId = model.provenance.forParameter('thick_filament', params[0]);
  assert.equal(byName.found, true);
  assert.equal(byId.found, true);
  assert.equal(byName.class, byId.class);
});

test('forParameter miss returns found:false, NOT a fake UNKNOWN', () => {
  const miss = model.provenance.forParameter('thick_filament', 'no such parameter xyz');
  assert.equal(miss.found, false);
  assert.notEqual(miss.class, 'UNKNOWN');   // a miss must not masquerade as a scientific unknown
  assert.ok(Array.isArray(miss.available)); // and it tells the caller what IS available
});

test('every geometry_sources parameter is resolvable via forParameter', () => {
  for (const { component, parameter } of model.provenance.listParameters()) {
    const r = model.provenance.forParameter(component, parameter);
    assert.equal(r.found, true, `unresolved: ${component} :: ${parameter}`);
    assert.ok(r.sources.length >= 0);
  }
});

test('_baseClass reduces all real evidence strings to one of the six declared classes', () => {
  const FIVE = ['MEASURED', 'STRONGLY INFERRED', 'INFERRED', 'SCHEMATIC', 'UNKNOWN'];
  const strings = [
    'MEASURED',
    'MEASURED (dimensions); render shape SCHEMATIC — see evidence_by_claim',
    'MEASURED (physiological working range 2.0-2.4um; 3.0um illustrative)',
    'MEASURED (spring) / CONTESTED (active force)',
    'SCHEMATIC',
    'STRONGLY INFERRED',
    'STRONGLY INFERRED (constant-volume idealization)',
    'STRONGLY INFERRED (extension partition); MEASURED (filament lengths, SL states, lattice law)',
    'UNKNOWN',
    'UNKNOWN (intrinsically disordered — no folded structure exists)',
    'UNKNOWN (only end-to-end span constrained)',
  ];
  for (const s of strings) {
    const base = model.spec._baseClass(s);
    assert.ok(FIVE.includes(base), `"${s}" reduced to non-plan class "${base}"`);
  }
});

test('CONSISTENCY: engine-recomputed titin layout matches spec keyframe layout', () => {
  for (const name of model.presets().map((p) => p.name)) {
    const g = eng.geometryAtPreset(name);
    const specLay = model.spec.states.states[name].titin_iband_layout_nm;
    for (const el of Object.keys(specLay)) {
      assert.ok(Math.abs(g.titin_iband_layout_nm[el].X_end - specLay[el].X_end) < 0.5,
        `${name}/${el}: engine X_end diverges from spec`);
    }
  }
});

// ---- Phase 3 — Geometry Strategy ----

test('PHASE3: geometry strategy loads and the model exposes a strategy layer', () => {
  assert.ok(model.spec.geometryStrategy, 'geometry_strategy.json not loaded');
  assert.ok(model.strategy, 'model.strategy not constructed');
});

test('PHASE3: strategy covers every sarcomere component and titin region', () => {
  const GS = model.spec.geometryStrategy;
  for (const c of model.spec.sarcomere.components)
    assert.ok(GS.sarcomere_primitives[c.id], `no strategy for sarcomere ${c.id}`);
  for (const r of model.spec.titin.regions)
    assert.ok(GS.titin_primitives[r.id], `no strategy for titin ${r.id}`);
});

test('PHASE3: every strategy primitive/assembly is drawn from the declared vocabulary', () => {
  const GS = model.spec.geometryStrategy;
  const vocab = new Set(GS.primitive_vocabulary), asm = new Set(GS.assembly_vocabulary);
  for (const a of Object.values(GS.domain_archetypes)) assert.ok(vocab.has(a.primitive), a.primitive);
  for (const s of Object.values(GS.sarcomere_primitives)) assert.ok(vocab.has(s.primitive), s.primitive);
  for (const t of Object.values(GS.titin_primitives)) {
    assert.ok(asm.has(t.assembly), `assembly ${t.assembly}`);
    if (t.backbone_path_primitive)
      assert.ok(vocab.has(t.backbone_path_primitive.replace('_bound', '')), t.backbone_path_primitive);
  }
});

test('PHASE3: strategy validation fails loudly on an out-of-vocab primitive', async () => {
  // clone the loaded files, corrupt the strategy, confirm check() rejects it
  const raw = JSON.parse(JSON.stringify(model.spec._raw));
  raw['geometry_strategy.json'].sarcomere_primitives.zdisc.primitive = 'dodecahedron_of_doom';
  const bad = new Spec(raw);
  const { ok, problems } = bad.check();
  assert.equal(ok, false);
  assert.ok(problems.some((p) => /not in vocab/.test(p)), problems.join('; '));
});

test('PHASE3: scene descriptors — folded regions instance capsules, disordered regions are tubes', () => {
  const sc = model.sceneAt(2200);
  const prox = sc.titin.find((t) => t.id === 'prox_Ig');
  const pevk = sc.titin.find((t) => t.id === 'PEVK');
  assert.equal(prox.assembly, 'instanced_repeat');
  assert.ok(prox.instance_spec && prox.instance_spec.count === 74, 'prox_Ig should instance 74 capsules');
  assert.ok(!prox.tube_spec, 'folded region must not be a tube');
  assert.equal(pevk.assembly, 'tube');
  assert.ok(pevk.tube_spec && pevk.tube_spec.folded_domains === false, 'PEVK must be a disordered tube');
  assert.ok(!pevk.instance_spec, 'disordered region must carry no folded-domain instances');
});

test('PHASE3: thick filament length is SL-invariant across the scene range', () => {
  const specL = model.spec.sarcomere.components.find((c) => c.id === 'thick_filament').dimensions_nm.length_X;
  for (const sl of [1900, 2200, 2400, 3000]) {
    const tf = model.sceneAt(sl).sarcomere.find((s) => s.id === 'thick_filament');
    assert.equal(tf.transform.length_nm, specL, `thick filament length changed at SL ${sl}`);
  }
});

test('PHASE3: verifyScene reports zero errors and the distal titin end meets the A-band tip', () => {
  for (const sl of [1900, 2200, 2400, 3000]) {
    const sc = model.sceneAt(sl);
    const { errors } = model.verifyScene(sc);
    assert.equal(errors.length, 0, `scene errors at SL ${sl}: ${errors.join('; ')}`);
    // distal Ig end must equal the A-band (thick filament) tip
    const abTip = sc.sarcomere.find((s) => s.id === 'thick_filament').transform.start_nm;
    const distalEnd = Math.max(...sc.titin.filter((t) => t.band === 'I-band' && t.transform)
      .map((t) => t.transform.end_nm));
    assert.ok(Math.abs(distalEnd - abTip) < 1.0,
      `distal titin end ${distalEnd} != A-band tip ${abTip} at SL ${sl}`);
  }
});

test('PHASE3: titin elastic span equals I-band half-width minus Z-disc half-width (confinement)', () => {
  const zHalf = model.spec.sarcomere.components.find((c) => c.id === 'zdisc').dimensions_nm.width_X / 2;
  for (const sl of [1900, 2200, 2400, 3000]) {
    const sc = model.sceneAt(sl);
    const span = sc.titin.filter((t) => t.band === 'I-band' && t.transform)
      .reduce((a, t) => a + t.transform.span_nm, 0);
    const expected = model.geometryAt(sl).I_band_half_width_nm - zHalf;
    assert.ok(Math.abs(span - expected) < 1.0,
      `I-band titin span ${span} != (half-width - Z-disc half-width) ${expected} at SL ${sl}`);
  }
});

test('PHASE3: geometric relationships resolve to real spec params and references', () => {
  const GS = model.spec.geometryStrategy;
  const params = new Set(model.spec.geometrySources.parameters.map((p) => p.parameter));
  const refs = new Set(Object.keys(model.spec.references));
  for (const rel of Object.values(GS.geometric_relationships)) {
    for (const p of rel.source_params) assert.ok(params.has(p), `relationship cites unknown param ${p}`);
    for (const d of rel.sources) assert.ok(refs.has(d), `relationship cites unknown ref ${d}`);
  }
});

// ---------------------------------------------------------------------------
// Phase 4 — Titin Representation (hierarchical: backbone + domain instances)
// ---------------------------------------------------------------------------

test('PHASE4: titin is ONE continuous polypeptide — no gaps between regions', () => {
  for (const sl of [1900, 2000, 2200, 2400, 2700, 3000]) {
    const bb = model.backboneAt(sl);
    for (let i = 1; i < bb.segments.length; i++) {
      const gap = bb.segments[i].X_start - bb.segments[i - 1].X_end;
      assert.ok(Math.abs(gap) < 0.01,
        `chain gap ${gap.toFixed(2)} nm before ${bb.segments[i].region_id} at SL ${sl}`);
    }
  }
});

test('PHASE4: N-terminus starts in the Z-disc, C-terminus reaches the M-line centre', () => {
  for (const sl of [1900, 2200, 2400, 3000]) {
    const bb = model.backboneAt(sl);
    assert.equal(bb.terminus.X_start, 0, `titin N-terminus must start at Z-disc centre (SL ${sl})`);
    assert.ok(Math.abs(bb.terminus.X_end - sl / 2) < 0.5,
      `C-terminus ${bb.terminus.X_end} != half-sarcomere ${sl / 2} at SL ${sl}`);
  }
});

test('PHASE4: anchored titin spans exactly the half thick filament (SL-invariant)', () => {
  const halfThick = model.spec.sarcomere.components
    .find((c) => c.id === 'thick_filament').dimensions_nm.length_X / 2;
  for (const sl of [1900, 2200, 2400, 3000]) {
    const bb = model.backboneAt(sl);
    const anchored = bb.segments.filter((s) => s.region_id !== 'Z1Z2' && s.band !== 'I-band');
    const span = anchored.reduce((a, s) => a + (s.X_end - s.X_start), 0);
    assert.ok(Math.abs(span - halfThick) < 0.5,
      `anchored titin span ${span} != half thick filament ${halfThick} at SL ${sl}`);
  }
});

test('PHASE4: domain instance counts match the spec exactly', () => {
  const { instances } = model.domainInstancesAt(2200);
  const counts = {};
  for (const d of instances) {
    const rid = d.domain_id.slice(0, d.domain_id.lastIndexOf('.'));
    counts[rid] = (counts[rid] || 0) + 1;
  }
  for (const r of model.spec.titin.regions) {
    const strat = model.spec.geometryStrategy.titin_primitives[r.id];
    if (!strat || strat.assembly !== 'instanced_repeat') continue;
    assert.equal(counts[r.id], strat.n_units,
      `${r.id}: ${counts[r.id]} instances != spec n_units ${strat.n_units}`);
  }
});

test('PHASE4: every instance carries the plan-mandated Level-1 fields', () => {
  const REQ = ['domain_id', 'sequence_position', 'domain_class', 'position_nm',
               'orientation', 'scale', 'geometry_archetype', 'evidence_class', 'source'];
  const { instances } = model.domainInstancesAt(2200);
  for (const d of instances) {
    for (const f of REQ) assert.ok(f in d, `${d.domain_id} missing Level-1 field ${f}`);
  }
});

test('PHASE4: FORBIDDEN — no folded domain is stretched beyond its folded length', () => {
  // Extensible tandem-Ig regions extend by STRAIGHTENING. An axial rise exceeding
  // the folded domain length would depict Ig unfolding as ordinary length change.
  for (let sl = 1900; sl <= 3000; sl += 25) {
    const { instances } = model.domainInstancesAt(sl);
    const bad = instances.filter((d) => d.implies_unfolding);
    assert.equal(bad.length, 0,
      `${bad.length} domains imply unfolding at SL ${sl} (e.g. ${bad[0] && bad[0].domain_id})`);
  }
});

test('PHASE4: FORBIDDEN — disordered regions carry no folded-domain geometry', () => {
  const { instances } = model.domainInstancesAt(2200);
  for (const d of instances) {
    if (d.domain_class === 'PEVK' || d.domain_class === 'N2A') {
      assert.equal(d.geometry_archetype, null, `${d.domain_id} must not carry a folded archetype`);
      assert.equal(d.folded_domains, false, `${d.domain_id} must declare folded_domains:false`);
    }
  }
});

test('PHASE4: folded archetypes are never deformed (scale stays 1)', () => {
  for (const sl of [1900, 2200, 3000]) {
    const { instances } = model.domainInstancesAt(sl);
    for (const d of instances) {
      assert.equal(d.scale, 1, `${d.domain_id} archetype was scaled (${d.scale}) instead of reoriented`);
    }
  }
});

test('PHASE4: sequence positions tile each region without gaps or overlaps', () => {
  const { instances } = model.domainInstancesAt(2200);
  const byRegion = new Map();
  for (const d of instances) {
    const rid = d.domain_id.slice(0, d.domain_id.lastIndexOf('.'));
    if (!byRegion.has(rid)) byRegion.set(rid, []);
    if (d.sequence_position) byRegion.get(rid).push(d.sequence_position);
  }
  for (const r of model.spec.titin.regions) {
    const sp = byRegion.get(r.id) || [];
    if (!sp.length || !r.residue_span) continue;
    if (r.id === 'N2A') {
      assert.deepEqual(sp.map((row) => row.label), ['I80', 'UN2A', 'I81', 'I82', 'I83']);
      assert.ok(sp[2].end >= sp[3].start,
        'the experimental I81 / UniProt I82 source overlap must be preserved');
      assert.deepEqual(r.coordinate_accounting.unassigned_intra_N2A_linkers
        .map((row) => [row.start, row.end]), [[9471, 9471], [9756, 9759]]);
      assert.deepEqual(r.coordinate_accounting.preserved_source_overlap,
        { elements: ['I81', 'I82'], start: 9660, end: 9671, length_aa: 12,
          resolution: 'not arithmetically repaired' });
      const assigned = new Set();
      for (const row of [...sp, ...r.coordinate_accounting.unassigned_intra_N2A_linkers]) {
        for (let residue = row.start; residue <= row.end; residue += 1) assigned.add(residue);
      }
      assert.equal(assigned.size, r.residue_span.length_aa,
        'curated elements plus explicit linkers must account for every N2A residue');
      continue;
    }
    assert.equal(sp[0].start, r.residue_span.start, `${r.id} sequence start mismatch`);
    assert.equal(sp[sp.length - 1].end, r.residue_span.end, `${r.id} sequence end mismatch`);
    for (let i = 1; i < sp.length; i++) {
      assert.equal(sp[i].start, sp[i - 1].end + 1, `${r.id} sequence tiling break at ${i}`);
    }
  }
});

test('PHASE4: A-band titin uses the source-context derived 11-domain interval', () => {
  const rel = model.spec.geometryStrategy.geometric_relationships
    .titin_Aband_periodicities.values;
  const { instances } = model.domainInstancesAt(2200);
  const cz = instances.filter((d) => d.zone === 'C_zone');
  assert.equal(cz.length,
    rel.n_C_zone_super_repeats * rel.c_zone_sequence_super_repeat_domain_count,
    'C-zone domain count must equal super-repeats x domains-per-super-repeat');
  // axial extent of the C-zone == n_super_repeats * periodicity
  const extent = cz[cz.length - 1].position_nm.x - cz[0].position_nm.x;
  const interval = rel.derived_11_domain_interval_nm.value;
  const expected = interval * rel.n_C_zone_super_repeats
    - (interval / rel.c_zone_sequence_super_repeat_domain_count);
  assert.ok(Math.abs(extent - expected) < 0.5,
    `C-zone axial extent ${extent.toFixed(2)} != expected ${expected.toFixed(2)}`);
});

test('PHASE4: backbone must not claim to be a smooth tube', () => {
  const bb = model.backboneAt(2200);
  assert.equal(bb.render_as_tube, false);
  assert.equal(bb.transverse_placement.evidence_class, 'UNKNOWN');
});

test('PHASE4: Level 3 molecular structures never load in the browser', () => {
  // This must hold permanently: full mmCIF stays an offline validation asset at
  // every phase. Phase 6 fits primitives FROM those coordinates; it does not
  // ship them to the client.
  assert.equal(model.molecularReference().load_in_browser, false);
});

test('PHASE4/6: level-2 proxies are claimed only once measurements back them', () => {
  // Originally asserted `available` was empty, on the Phase-4 precondition that
  // no PDB-derived geometry existed yet. Phase 6 retired that precondition by
  // producing the measurements, so the durable claim is the conditional one:
  // a class appears at level 2 if and only if it carries measured geometry
  // derived from coordinates.
  const avail = model.structuralProxies().available;
  const strat = model.spec.geometryStrategy;
  const backed = Object.keys(strat.domain_archetypes).filter(
    (k) => strat.domain_archetypes[k].measured_geometry
      && strat.domain_archetypes[k].geometry_derived_from_coordinates === true,
  );
  assert.deepEqual(avail, backed,
    'a class may appear at level 2 only if measured geometry backs it');
});

test('PHASE4: representation verifies clean across the whole SL range', () => {
  for (let sl = 1900; sl <= 3000; sl += 50) {
    const v = model.verifyRepresentation(sl);
    assert.equal(v.errors.length, 0, `SL ${sl}: ${v.errors.join('; ')}`);
  }
});

test('PHASE4: instance shape is uniform — no undefined fields anywhere', () => {
  // A consumer must be able to group/filter every instance without special-casing.
  for (const sl of [1900, 2200, 3000]) {
    const { instances } = model.domainInstancesAt(sl);
    const keys = new Set();
    for (const d of instances) for (const k of Object.keys(d)) keys.add(k);
    for (const d of instances) {
      for (const k of keys) {
        assert.ok(k in d, `${d.domain_id} missing field ${k}`);
        assert.notEqual(d[k], undefined, `${d.domain_id}.${k} is undefined`);
      }
      assert.ok(d.mechanical_class, `${d.domain_id} has no mechanical_class`);
    }
  }
});

test('PHASE4: EVIDENCE — placement is tracked separately and never overclaimed', () => {
  const { instances } = model.domainInstancesAt(2200);
  const RANK = {
    UNKNOWN: 0, SCHEMATIC: 1, INFERRED: 2, MODELED: 3, STRONGLY: 4, MEASURED: 5,
  };
  const rank = (s) => {
    const h = String(s || '').toUpperCase().split(/[\s(—-]/)[0];
    return h in RANK ? RANK[h] : 2;
  };
  for (const d of instances) {
    assert.ok(d.placement_evidence_class, `${d.domain_id} lacks placement_evidence_class`);
    // The effective class may never be stronger than either component claim.
    assert.ok(rank(d.evidence_class) <= rank(d.domain_evidence_class),
      `${d.domain_id} effective evidence exceeds domain evidence`);
    assert.ok(rank(d.evidence_class) <= rank(d.placement_evidence_class),
      `${d.domain_id} effective evidence exceeds placement evidence`);
  }
});

test('PHASE4: EVIDENCE — only the C-zone may claim MEASURED placement', () => {
  // The spec records a super-repeat periodicity for the C-zone ONLY. Any other
  // group claiming MEASURED placement would be inventing a periodicity.
  const { instances } = model.domainInstancesAt(2200);
  for (const d of instances) {
    if (String(d.placement_evidence_class).startsWith('MEASURED')) {
      assert.equal(d.zone, 'C_zone',
        `${d.domain_id} claims MEASURED placement outside the C-zone`);
    }
  }
  const dz = instances.filter((d) => d.zone === 'D_zone');
  assert.ok(dz.length > 0, 'expected a D-zone');
  for (const d of dz) {
    assert.ok(String(d.placement_evidence_class).startsWith('SCHEMATIC'),
      'D-zone placement must be SCHEMATIC — no sourced periodicity exists');
  }
});

test('PHASE4: disordered regions declare rise/linker INAPPLICABLE, not zero', () => {
  const { instances } = model.domainInstancesAt(2200);
  const dis = instances.filter((d) => d.folded_domains === false);
  assert.equal(dis.length, 3, 'expected UN2A + explicit UNKNOWN interval + PEVK chains');
  for (const d of dis) {
    assert.equal(d.axial_rise_nm, null, `${d.domain_id} must not report an axial rise`);
    assert.equal(d.interdomain_linker_nm, null, `${d.domain_id} must not report a linker`);
    assert.equal(d.implies_unfolding, false);
    assert.equal(d.variable_length, d.domain_class !== 'unresolved_sequence');
  }
});

test('PHASE4: every instance source resolves to a reference or UniProt accession', () => {
  const refs = new Set(Object.keys(model.spec.references));
  const { instances } = model.domainInstancesAt(2200);
  for (const d of instances) {
    const ok = refs.has(d.source) || /^UniProt:[A-Z0-9]+$/.test(d.source);
    assert.ok(ok, `${d.domain_id} cites unresolvable source "${d.source}"`);
    if (d.placement_source) {
      assert.ok(refs.has(d.placement_source),
        `${d.domain_id} cites unresolvable placement_source "${d.placement_source}"`);
    }
  }
});

test('PHASE4: domain_class values stay inside the exported vocabulary', () => {
  const { instances } = model.domainInstancesAt(2200);
  for (const d of instances) {
    assert.ok(DOMAIN_CLASSES.includes(d.domain_class),
      `${d.domain_id} has out-of-vocabulary class ${d.domain_class}`);
  }
});

test('PHASE4: A-band titin geometry is SL-invariant (bound, translates only)', () => {
  const ref = model.domainInstancesAt(2200).instances.filter((d) => d.zone);
  for (const sl of [1900, 2000, 2400, 2700, 3000]) {
    const cur = model.domainInstancesAt(sl).instances.filter((d) => d.zone);
    assert.equal(cur.length, ref.length);
    const shift = cur[0].position_nm.x - ref[0].position_nm.x;
    for (let i = 0; i < cur.length; i++) {
      assert.equal(cur[i].axial_rise_nm, ref[i].axial_rise_nm,
        `A-band internal spacing changed at SL ${sl}`);
      assert.ok(Math.abs((cur[i].position_nm.x - ref[i].position_nm.x) - shift) < 1e-6,
        `A-band did not translate rigidly at SL ${sl}`);
    }
  }
});

test('PHASE4: excluding the A-band drops exactly the bound super-repeat domains', () => {
  const all = model.domainInstancesAt(2200).instances;
  const sub = model.domainInstancesAt(2200, { includeAband: false }).instances;
  const nAband = all.filter((d) => d.zone).length;
  assert.equal(sub.length, all.length - nAband);
  assert.ok(!sub.some((d) => d.zone), 'A-band instances leaked into the filtered set');
});

test('PHASE4: fold class and mechanical role are separate axes', () => {
  // Z1/Z2 and the M-line domains are genuine Ig folds that happen to be anchored.
  // domain_class must name the FOLD; the anchoring role lives in mechanical_class.
  // If either is ever reclassified, that is a decision — not a silent drift.
  const { instances } = model.domainInstancesAt(2200);
  for (const rid of ['Z1Z2', 'Mline']) {
    const rs = instances.filter((d) => d.domain_id.startsWith(`${rid}.`));
    assert.ok(rs.length > 0, `no instances for ${rid}`);
    for (const d of rs) {
      assert.equal(d.domain_class, 'Ig_like', `${d.domain_id} should be an Ig fold`);
      assert.equal(d.mechanical_class, 'anchored', `${d.domain_id} should be anchored`);
    }
  }
  // The two unreachable vocabulary members must stay unemitted; if one appears,
  // the fold/role separation above has been broken.
  const used = new Set(instances.map((d) => d.domain_class));
  for (const c of ['terminal_anchor', 'flexible_linker']) {
    assert.ok(!used.has(c), `${c} is documented as never emitted by this isoform`);
  }
});

test('PHASE4: plan Level-0 backbone spans the half-sarcomere Z-disc -> M-line', () => {
  for (const sl of [1900, 2200, 3000]) {
    const bb = model.backboneAt(sl);
    assert.equal(bb.render_as_tube, false, 'backbone must not claim to be a smooth tube');
    assert.equal(bb.points[0].x, 0, 'backbone must start at the Z-disc centre');
    assert.ok(Math.abs(bb.points[bb.points.length - 1].x - sl / 2) < 1e-6,
      `backbone must end at the half-sarcomere (${sl / 2} nm)`);
    assert.equal(bb.segments.length, bb.points.length - 1);
    assert.equal(bb.transverse_placement.evidence_class, 'UNKNOWN',
      'azimuthal placement must stay explicitly UNKNOWN');
  }
});

// ---------------------------------------------------------------------------
// Phase 5 — Repeated Domain Strategy
// ---------------------------------------------------------------------------

test('PHASE5: instances collapse to one draw call per archetype', () => {
  const p = model.instancingPlanAt(2200);
  const archetypes = new Set(p.batches.map((b) => b.archetype));
  assert.equal(p.batches.length, archetypes.size);
  // The whole point of the phase: 286 domains must NOT become 286 draw calls.
  assert.ok(p.totals.draw_calls < 10, `expected few draw calls, got ${p.totals.draw_calls}`);
  assert.equal(p.totals.batched + p.totals.unbatched, p.totals.instances);
});

test('PHASE5: archetype matches the domain fold class (Fn3 is not drawn as Ig)', () => {
  // Region-level archetype resolution silently drew all 132 A-band Fn3 domains
  // with the Ig exemplar and left the Fn3 archetype unreachable.
  const { instances } = model.domainInstancesAt(2200);
  const folded = instances.filter((d) => d.geometry_archetype);
  const mismatched = folded.filter((d) => d.domain_class !== d.geometry_archetype);
  assert.equal(mismatched.length, 0,
    `class/archetype mismatches: ${mismatched.slice(0, 3).map((d) => `${d.domain_id} ${d.domain_class}->${d.geometry_archetype}`)}`);
  const fn3 = folded.filter((d) => d.domain_class === 'Fn3');
  assert.ok(fn3.length > 0, 'expected Fn3 instances');
  assert.equal(new Set(fn3.map((d) => d.geometry_archetype)).size, 1);
});

test('PHASE5: archetype is instanced, never deformed', () => {
  const p = model.instancingPlanAt(2200);
  for (const b of p.batches) {
    assert.equal(b.varies.scale, false, `${b.archetype}: scale varies`);
    for (const t of b.transforms) assert.equal(t.scale, 1, `${t.domain_id}: scale != 1`);
  }
});

test('PHASE5: every batch names a real representative experimental structure', () => {
  const p = model.instancingPlanAt(2200);
  for (const b of p.batches) {
    const rep = b.representative_structure;
    assert.ok(rep && /^[0-9][A-Za-z0-9]{3}$/.test(rep.pdb_id),
      `${b.archetype}: bad or missing PDB id ${JSON.stringify(rep)}`);
    assert.ok(rep.uniprot_span.start > 0 && rep.uniprot_span.end > rep.uniprot_span.start);
    const archetype = model.spec.geometryStrategy.domain_archetypes[b.archetype];
    assert.equal(
      b.geometry_derived_from_coordinates,
      Boolean(archetype.geometry_derived_from_coordinates),
      `${b.archetype}: batch lost or invented Phase-6 coordinate provenance`,
    );
  }
});

test('PHASE5: disordered regions are never instanced as folded primitives', () => {
  const p = model.instancingPlanAt(2200);
  const ids = new Set(p.unbatched.map((u) => u.domain_class));
  assert.ok(ids.has('PEVK') && ids.has('N2A'), 'PEVK and N2A must be unbatched');
  for (const b of p.batches) {
    for (const t of b.transforms) {
      assert.ok(t.domain_class !== 'PEVK' && t.domain_class !== 'N2A',
        `${t.domain_id} disordered class in folded batch`);
    }
  }
});

test('PHASE5: azimuth alternates so the chain stays connected and on axis', () => {
  // A constant azimuth would walk prox_Ig ~238 nm off axis inside a ~1100 nm
  // half-sarcomere. Alternation is forced by chain continuity, not chosen.
  const p = model.instancingPlanAt(2200);
  for (const b of p.batches) {
    const tilted = b.transforms.filter((t) => t.rotation.azimuth_deg != null);
    if (tilted.length < 2) continue;
    assert.ok(new Set(tilted.map((t) => t.rotation.azimuth_deg)).size >= 2,
      `${b.archetype}: tilted instances share one azimuth`);
  }
  // An untilted domain has no meaningful azimuth — claiming one would be noise.
  for (const b of p.batches) {
    for (const t of b.transforms) {
      if (!t.rotation.tilt_deg_from_axis) assert.equal(t.rotation.azimuth_deg, null);
    }
  }
});

test('PHASE5: chain continuity — every folded-domain junction fits its linker budget', () => {
  for (const sl of [1900, 2200, 2400, 3000]) {
    const over = model.instancing.junctionContinuity(sl).filter((c) => c.overrun_nm > 1e-3);
    assert.deepEqual(over, [], `SL ${sl}: ${JSON.stringify(over)}`);
    assert.equal(model.verifyInstancing(sl).errors.length, 0);
  }
});

test('PHASE5: A-band D-zone joins the measured C-zone without a seam', () => {
  const boundary = model.instancing.junctionContinuity(2200)
    .find((c) => c.from === 'Aband_super.58' && c.to === 'Aband_super.59');
  assert.ok(boundary && boundary.zone_boundary);
  assert.ok(boundary.overrun_nm <= 1e-3, JSON.stringify(boundary));
});

test('PHASE5: instancing adds no geometry — positions match Level 1 exactly', () => {
  const { instances } = model.domainInstancesAt(2200);
  const byId = new Map(instances.map((d) => [d.domain_id, d]));
  const p = model.instancingPlanAt(2200);
  let n = 0;
  for (const b of p.batches) {
    for (const t of b.transforms) {
      const d = byId.get(t.domain_id);
      assert.ok(d, `${t.domain_id} not in Level 1`);
      assert.equal(t.position_nm.x, d.position_nm.x);
      n += 1;
    }
  }
  assert.equal(n, instances.filter((d) => d.geometry_archetype).length);
});

test('PHASE5: azimuth alternation is checked PER REGION, not per batch', () => {
  // A batch spans several regions, so a batch-level "has >1 distinct azimuth" test
  // passes even when one whole region is stuck at a constant azimuth.
  const p = model.instancingPlanAt(2200);
  for (const b of p.batches) {
    const byRegion = new Map();
    for (const t of b.transforms) {
      if (t.rotation.azimuth_deg == null) continue;
      if (!byRegion.has(t.region)) byRegion.set(t.region, []);
      byRegion.get(t.region).push(t.rotation.azimuth_deg);
    }
    for (const [region, azs] of byRegion) {
      if (azs.length < 2) continue;
      assert.ok(new Set(azs).size >= 2,
        `${region} in batch ${b.archetype}: ${azs.length} tilted instances share one azimuth`);
    }
  }
});

test('PHASE5: every declared domain is instanced or documented as undepicted', () => {
  // titin.json declares domain_composition with evidence MEASURED. A declared domain
  // that never reaches the renderer must be an explicit, reasoned gap.
  for (const sl of [1900, 2200, 2400, 3000]) {
    for (const r of model.instancing.declaredVsInstanced(sl)) {
      assert.ok(r.documented,
        `${r.region}/${r.domain_class}: declared ${r.declared}, instanced ${r.instanced}, undocumented`);
      for (const field of ['reason', 'what_is_depicted', 'why_not_fixed_here']) {
        assert.ok(r.documented[field], `${r.region}/${r.domain_class} lacks '${field}'`);
      }
    }
  }
});

test('PHASE5: N2A depicts its declared Ig in series with the mixed-structure UN2A envelope', () => {
  // Phase 8's folded_plus_wlc law requires the same two components in the render.
  // The fold count is measured; its coarse region-internal placement is INFERRED.
  const rows = model.instancing.declaredVsInstanced(2200).filter((r) => r.region === 'N2A');
  assert.equal(rows.length, 0, 'the declared N2A fold must not remain omitted');
  const { instances } = model.domainInstancesAt(2200);
  const n2a = instances.filter((d) => d.domain_id.split('.')[0] === 'N2A');
  assert.equal(n2a.length, 5, 'N2A must contain four folded instances and one coil');
  const folds = n2a.filter((d) => d.geometry_archetype === 'Ig_like');
  const coil = n2a.find((d) => d.geometry_archetype === null);
  assert.equal(folds.length, 4);
  assert.ok(folds.every((fold) => fold.folded_domains
    && /^INFERRED/.test(fold.placement_evidence_class)));
  assert.ok(coil && !coil.folded_domains && coil.variable_length);
  assert.equal(coil.contains_structured_core, true);
  assert.equal(coil.representative_pdb_id, '7NIP');
  assert.match(coil.folded_domains_semantics, /does not deny the 7NIP core/);
  assert.ok(Math.abs(folds.reduce((sum, fold) => sum + fold.span_nm, 0) + coil.span_nm
    - model.geometryAt(2200).titin_iband_extension_nm.N2A) < 1e-3);
});

// ---------------------------------------------------------------- PHASE 6
// Level-2 structural proxies measured from deposited coordinates. The claims
// under test are provenance claims, not rendering ones: a measured SIZE must
// not become a measured ORIENTATION, and a measurement must not silently
// replace a reviewed literature value that drives layout.

test('PHASE6: level 2 exposes measured proxies for every archetype class', async () => {
  const m = await TitinModel.create(nodeReader());
  const p = m.structuralProxies();
  assert.equal(p.level, 2);
  assert.deepEqual(p.available, ['Ig_like', 'Fn3', 'kinase']);
  for (const c of p.available) {
    const x = p.proxies[c];
    assert.ok(x.measured.n_independent_entries >= 2, `${c} needs >=2 independent entries`);
    assert.ok(Array.isArray(x.measured.entries_used) && x.measured.entries_used.length >= 2);
    assert.ok(x.lateral_diameter_nm > 0, `${c} lateral diameter`);
  }
});

test('PHASE6: every fitted primitive is a faithful envelope (>=95% heavy atoms)', async () => {
  const m = await TitinModel.create(nodeReader());
  const p = m.structuralProxies();
  for (const c of p.available) {
    const e = p.proxies[c].fit_quality.enclosure_of_chosen_primitive;
    assert.ok(e >= 0.95, `${c} encloses only ${e}`);
  }
});

test('PHASE6: proxy guards pass on the committed spec', async () => {
  const m = await TitinModel.create(nodeReader());
  const v = m.verifyStructuralProxies();
  assert.deepEqual(v.errors, [], `proxy errors: ${JSON.stringify(v.errors)}`);
  assert.ok(v.notes.length >= 3, 'non-adoption and orientation limits must be stated');
});

test('PHASE6: Ig/Fn3 axial length remains the literature value, not the measurement', async () => {
  const m = await TitinModel.create(nodeReader());
  const p = m.structuralProxies();
  for (const c of ['Ig_like', 'Fn3']) {
    const x = p.proxies[c];
    assert.equal(x.axial_length_nm, 4.0, `${c} must keep the literature 4.0 nm`);
    assert.equal(x.axial_length_from_this_pipeline, false);
    // the measurement must still be recorded, and must not be silently equal
    assert.ok(x.measured.n_to_c_axial_nm > 4.0, `${c} measurement should be retained`);
    assert.match(x.axial_length_provenance, /literature/);
  }
});

test('PHASE6: Ig and Fn3 still share one axial length (Phase-5 invariant)', async () => {
  const m = await TitinModel.create(nodeReader());
  const p = m.structuralProxies();
  assert.equal(p.proxies.Ig_like.axial_length_nm, p.proxies.Fn3.axial_length_nm);
});

test('PHASE6: measured lateral diameters differ per class and are not the placeholder', async () => {
  const m = await TitinModel.create(nodeReader());
  const p = m.structuralProxies();
  const ig = p.proxies.Ig_like.lateral_diameter_nm;
  const fn = p.proxies.Fn3.lateral_diameter_nm;
  assert.notEqual(ig, 2.0, 'Ig lateral must no longer be the SCHEMATIC 2.0 nm');
  assert.notEqual(fn, 2.0, 'Fn3 lateral must no longer be the SCHEMATIC 2.0 nm');
  assert.ok(fn > ig, 'Fn3 measures a wider cross-section than Ig');
});

test('PHASE6: kinase claims measured SIZE but explicitly not orientation', async () => {
  const m = await TitinModel.create(nodeReader());
  const k = m.structuralProxies().proxies.kinase;
  assert.equal(k.chain_aligned, false);
  assert.ok(k.measured.n_to_c_vs_long_axis_deg > 30);
  assert.match(k.orientation_claim, /UNKNOWN/);
  assert.ok(k.not_claimed.some((s) => /orientation/i.test(s)),
    'kinase must disclaim its long-axis orientation');
  // the long axis is NOT what gets used as the axial length
  assert.equal(k.axial_length_nm, k.measured.n_to_c_axial_nm);
  assert.notEqual(k.axial_length_nm, k.measured.longest_principal_extent_nm);
});

test('PHASE6: kinase instances no longer emit a null folded length', async () => {
  const m = await TitinModel.create(nodeReader());
  const inst = m.domainInstancesAt(2200).instances;
  const k = inst.filter((d) => d.domain_class === 'kinase');
  assert.equal(k.length, 1);
  assert.ok(k[0].folded_length_nm > 0, 'kinase folded_length_nm must be filled');
  // the only remaining nulls are the genuinely disordered regions
  const nulls = inst.filter((d) => d.folded_length_nm == null).map((d) => d.domain_class);
  assert.deepEqual(nulls.sort(), ['N2A', 'PEVK', 'unresolved_sequence']);
});

test('PHASE6: adopting measurements did not move any domain coordinate', async () => {
  const adopted = await TitinModel.create(nodeReader());
  const preAdoption = await TitinModel.create(patchedReader('geometry_strategy.json', (d) => {
    for (const archetype of Object.values(d.domain_archetypes)) {
      if (archetype.lateral_diameter_previous_schematic_nm != null) {
        archetype.lateral_diameter_nm = archetype.lateral_diameter_previous_schematic_nm;
      }
      delete archetype.measured_geometry;
      delete archetype.geometry_derived_from_coordinates;
    }
    delete d.domain_archetypes.kinase.axial_length_nm;
  }));
  for (const sl of [1900, 2200, 2400, 3000]) {
    const current = adopted.domainInstancesAt(sl).instances.map((d) => d.position_nm);
    const before = preAdoption.domainInstancesAt(sl).instances.map((d) => d.position_nm);
    assert.deepEqual(current, before, `SL=${sl} placement moved`);
  }
});

test('PHASE6: no mesh assets are claimed for level 2', async () => {
  const m = await TitinModel.create(nodeReader());
  const p = m.structuralProxies();
  assert.match(p.asset_format, /procedural/);
  assert.ok(p.asset_rationale && /mesh|GLB/i.test(p.asset_rationale));
});

// ---------------------------------------------------------------------------
// Phase 6 REVIEW — the two defects found reviewing Phase 6.
// (a) the pipeline asserted all entries were monomeric; 5JDJ is declared dimeric
// (b) plan step 5 requires interaction geometry, absent from single-domain entries
// ---------------------------------------------------------------------------

test('PHASE6-REVIEW: interaction geometry between consecutive domains exists', async () => {
  const m = await TitinModel.create(nodeReader());
  const inter = m.interdomainGeometry();
  assert.ok(inter, 'spec must record interdomain geometry; single-domain entries '
    + 'cannot supply the "interaction geometry" half of plan step 5');
  assert.ok(new Set(inter.entries_used).size >= 3,
    `must rest on >=3 independent entries (got ${inter.entries_used})`);
  assert.equal(inter.evidence_class, 'MEASURED');
});

test('PHASE6-REVIEW: flexible-linker twist is never adopted as a coordinate', async () => {
  const m = await TitinModel.create(nodeReader());
  const inter = m.interdomainGeometry();
  // An Ig-Ig linker is flexible: a crystal shows ONE conformation, chosen partly
  // by lattice packing. Adopting it would invent a per-domain azimuth.
  assert.equal(inter.adopted_as_coordinates, false);
  assert.match(inter.policy_evidence_class, /SCHEMATIC/,
    'measuring tandems must not upgrade the azimuth policy past SCHEMATIC');
  assert.ok(inter.not_claimed.some((x) => /azimuth/.test(x)),
    'must disclaim a canonical per-domain azimuth');
});

test('PHASE6-REVIEW: measurement excludes a constant azimuth', async () => {
  const m = await TitinModel.create(nodeReader());
  const inter = m.interdomainGeometry();
  // Previously the alternating policy rested only on a continuity argument.
  // Observed tandems now show consecutive domains genuinely rotate.
  assert.equal(inter.constant_azimuth_excluded, true);
  assert.ok(inter.abs_twist_deg.median > 20,
    `|twist| median ${inter.abs_twist_deg.median} deg must exclude 0 deg twist`);
  assert.equal(inter.constrains_policy, 'alternating_planar');
});

/** Reader that mutates one spec file after loading it from disk. */
function patchedReader(file, mutate) {
  const base = nodeReader();
  return async (name) => {
    const doc = await base(name);
    if (name === file) mutate(doc);
    return doc;
  };
}

test('PHASE6-REVIEW: adopting interdomain twist as coordinates fails verify()', async () => {
  const m = await TitinModel.create(patchedReader('geometry_strategy.json',
    (d) => { d.interdomain_geometry.adopted_as_coordinates = true; }));
  const errs = m.verifyStructuralProxies().errors;
  assert.ok(errs.some((e) => /flexible/.test(e)),
    `expected a flexibility error, got ${JSON.stringify(errs)}`);
});

test('PHASE6-REVIEW: upgrading the azimuth policy past SCHEMATIC fails verify()', async () => {
  const m = await TitinModel.create(patchedReader('geometry_strategy.json',
    (d) => {
      d.interdomain_geometry.what_it_constrains
        .policy_evidence_class_after_this = 'MEASURED per-domain azimuth';
    }));
  const errs = m.verifyStructuralProxies().errors;
  assert.ok(errs.some((e) => /SCHEMATIC/.test(e)),
    `expected a SCHEMATIC error, got ${JSON.stringify(errs)}`);
});

test('PHASE6-REVIEW: interdomain evidence moves no coordinate', async () => {
  // The whole point: this is evidence about a convention, not a layout input.
  const baseline = await TitinModel.create(nodeReader());
  const withoutInterdomain = await TitinModel.create(patchedReader('geometry_strategy.json',
    (d) => { delete d.interdomain_geometry; }));
  for (const sl of [1900, 2200, 2400, 3000]) {
    const current = baseline.domainInstancesAt(sl).instances.map((d) => d.position_nm);
    const without = withoutInterdomain.domainInstancesAt(sl).instances.map((d) => d.position_nm);
    assert.deepEqual(current, without, `SL=${sl} placement depends on an evidence-only record`);
  }
});

test('PHASE6-REVIEW: in-situ cross-check corroborates the retained literature value', async () => {
  const m = await TitinModel.create(nodeReader());
  const isc = m.interdomainGeometry().in_situ_cross_check;
  assert.ok(isc, 'the lattice-free in-situ entry must be recorded: it bounds the '
    + "crystal tandems' stated packing limitation");
  const d = isc.vs_crystal_and_literature;
  assert.ok(Math.abs(d.in_situ_minus_literature_nm) < 0.5,
    `in-situ spacing ${isc.centre_to_centre_nm.median} nm must corroborate the `
    + `retained literature ${d.literature_axial_length_nm} nm`);
  assert.ok(isc.centre_to_centre_nm.n >= 30,
    `expected many in-situ pairs, got ${isc.centre_to_centre_nm.n}`);
});

test('PHASE6-REVIEW: the 6.4 A in-situ entry never carries an angle', async () => {
  const m = await TitinModel.create(nodeReader());
  const isc = m.interdomainGeometry().in_situ_cross_check;
  assert.ok(isc.resolution_A > 4.0);
  for (const k of ['bend_deg', 'abs_twist_deg', 'twist_deg']) {
    assert.equal(isc[k], undefined,
      `${isc.pdb_id} at ${isc.resolution_A} A must not claim ${k}`);
  }
  assert.deepEqual(isc.measures_only, ['centroid spacing between consecutive domains']);
});

test('PHASE6-REVIEW: giving the in-situ entry a twist fails verify()', async () => {
  const m = await TitinModel.create(patchedReader('geometry_strategy.json',
    (d) => {
      d.interdomain_geometry.in_situ_cross_check.abs_twist_deg = { median: 160 };
    }));
  const errs = m.verifyStructuralProxies().errors;
  assert.ok(errs.some((e) => /centroid spacing only/.test(e)),
    `expected a resolution error, got ${JSON.stringify(errs)}`);
});
