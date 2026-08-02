/**
 * TitinModel — top-level data-layer entry point.
 *
 * Wires the spec loader, provenance resolver, and geometry engine into one object
 * the viewer layer (Phase 9/10) consumes. This is the boundary the plan describes:
 * the renderer talks to TitinModel, never to raw biological constants.
 *
 *   const model = await TitinModel.create(nodeReader());     // or browserReader()
 *   model.geometryAt(2350);                                  // interpolated geometry
 *   model.provenance.forRegion('PEVK');                      // evidence + sources
 */
import { Spec } from './SpecLoader.js';
import { Provenance } from './Provenance.js';
import { GeometryEngine } from '../geometry/GeometryEngine.js';
import { GeometryStrategy } from '../geometry/GeometryStrategy.js';
import { TitinRepresentation } from '../geometry/TitinRepresentation.js';
import { InstancingPlan } from '../geometry/InstancingPlan.js';
import { StructuralProxies } from '../geometry/StructuralProxies.js';
import { LatticeGeometry } from '../geometry/LatticeGeometry.js';
import { ContextDetail } from '../geometry/ContextDetail.js';
import { ZDiscDetail } from '../geometry/ZDiscDetail.js';
import { MBandDetail } from '../geometry/MBandDetail.js';

export class TitinModel {
  constructor(spec) {
    this.spec = spec;
    this.provenance = new Provenance(spec);
    this.geometry = new GeometryEngine(spec);
    // Phase-3 strategy layer (present only if geometry_strategy.json loaded).
    this.strategy = spec.geometryStrategy
      ? new GeometryStrategy(spec, this.geometry, spec.geometryStrategy)
      : null;
    // Phase-6 structural proxies (level 2): fitted primitive parameters measured
    // from deposited coordinates. Built before the representation so it can be
    // injected rather than imported there.
    this.proxies = spec.geometryStrategy
      ? new StructuralProxies(spec.geometryStrategy)
      : null;
    // Phase-4 hierarchical titin representation (backbone + domain instances).
    this.representation = spec.geometryStrategy
      ? new TitinRepresentation(spec, this.geometry, spec.geometryStrategy, this.proxies)
      : null;
    // Phase-5 repeated-domain strategy (archetype batching + per-instance transforms).
    this.instancing = this.representation
      ? new InstancingPlan(spec, this.representation)
      : null;
  }

  static async create(reader, opts = {}) {
    const spec = await Spec.load(reader, opts);
    return new TitinModel(spec);
  }

  // --- geometry passthroughs ---
  geometryAt(sl) { return this.geometry.geometryAt(sl); }
  geometryAtPreset(name) { return this.geometry.geometryAtPreset(name); }
  presets() { return this.geometry.presets(); }
  slRange() { return { min: this.geometry.slMin, max: this.geometry.slMax }; }

  /** Renderable primitive-descriptor scene at a sarcomere length (Phase 3). */
  sceneAt(sl) {
    if (!this.strategy) throw new Error('geometry_strategy.json not loaded — no scene descriptors available');
    return this.strategy.sceneAt(sl);
  }
  /** Forbidden-rule verification over a generated scene → { errors, notes }. */
  verifyScene(scene) {
    if (!this.strategy) return { errors: ['strategy not loaded'], notes: [] };
    return this.strategy.verifyScene(scene);
  }

  // --- Phase 7: transverse lattice + sarcomere context scene ---
  _lattice() {
    if (!this.lattice) {
      if (!this.strategy) {
        throw new Error('geometry_strategy.json not loaded — no lattice layer available');
      }
      this.lattice = new LatticeGeometry(this.spec, this.geometry);
    }
    return this.lattice;
  }

  /** Full axial + transverse sarcomere context scene. */
  contextSceneAt(sl, { rings = 1 } = {}) {
    if (!this.strategy) {
      throw new Error('geometry_strategy.json not loaded — no scene descriptors available');
    }
    return this.strategy.sceneAt(sl, {
      lattice: this._lattice(),
      latticeRings: rings,
    });
  }

  latticePatchAt(sl, rings = 1) { return this._lattice().latticePatch(sl, rings); }
  latticeProvenance() { return this._lattice().provenance(); }

  // --- Phase 7b: crown/head and thin-filament context detail ---
  _contextDetail() {
    if (!this.contextDetail) {
      if (!this.spec.geometryStrategy) {
        throw new Error('geometry_strategy.json not loaded — no context-detail layer available');
      }
      if (!this.spec.contextMeasurements) {
        throw new Error(
          'context_measurements.json not loaded — context detail requires the Phase 6 measurements',
        );
      }
      this.contextDetail = new ContextDetail(
        this.spec,
        this.geometry,
        this.spec.geometryStrategy,
        this.spec.contextMeasurements,
      );
    }
    return this.contextDetail;
  }

  crownLevelsAt(sl, opts) { return this._contextDetail().crownLevels(sl, opts); }
  thinFilamentTwistAt(sl, opts) { return this._contextDetail().thinFilamentTwist(sl, opts); }
  contextDetailBudget(sl, nThick, nThin) {
    return this._contextDetail().instanceBudget(sl, nThick, nThin);
  }
  contextDetailProvenance() { return this._contextDetail().provenance(); }

  contextDetailSceneAt(sl, { rings = 1, phaseDeg = 0 } = {}) {
    const detail = this._contextDetail();
    const patch = this.latticePatchAt(sl, rings);
    const crowns = patch.thick.map(() => detail.crownLevels(sl, {
      phaseDeg,
      half: 'positive',
    }));
    return {
      crowns,
      twist: detail.thinFilamentTwist(sl, { phaseDeg }),
      budget: detail.instanceBudget(sl, patch.thick.length, patch.thin.length),
      azimuthal_phase_policy: {
        applied: 'identical phase on every thick filament',
        evidence_class: 'SCHEMATIC',
        why: 'inter-filament mutual rotations are statistical; a common phase asserts neither random disorder nor a regular progression',
      },
      provenance: detail.provenance(),
    };
  }

  // --- SC-3: target-gated terminal-anchor detail -------------------------
  _zdiscAnchorDetail() {
    if (!this.zdiscAnchorDetail) {
      this.zdiscAnchorDetail = new ZDiscDetail(this.spec, this.geometry);
    }
    return this.zdiscAnchorDetail;
  }

  _mbandAnchorDetail() {
    if (!this.mbandAnchorDetail) {
      this.mbandAnchorDetail = new MBandDetail(this.spec, this.geometry);
    }
    return this.mbandAnchorDetail;
  }

  /** Evidence-limited local Z-disc network; never a universal lattice. */
  zdiscDetailAt(sl, { rings = 1 } = {}) {
    return this._zdiscAnchorDetail().detailAt(sl, this.latticePatchAt(sl, rings).thin);
  }

  /** M-band midpoint and sparse relationship proxies; never an M-line slab. */
  mbandDetailAt(sl, { rings = 1 } = {}) {
    return this._mbandAnchorDetail().detailAt(sl, this.latticePatchAt(sl, rings).thick);
  }

  anchorDetailAt(sl, target, { rings = 1 } = {}) {
    if (target === 'zdisc') return this.zdiscDetailAt(sl, { rings });
    if (target === 'mline') return this.mbandDetailAt(sl, { rings });
    throw new Error(`anchorDetailAt: unknown target '${target}'. Expected zdisc or mline.`);
  }

  // --- Phase 4: hierarchical titin representation ---
  _rep() {
    if (!this.representation) throw new Error('geometry_strategy.json not loaded — no titin representation available');
    return this.representation;
  }
  /** Level 0 — titin backbone path at a sarcomere length. */
  backboneAt(sl) { return this._rep().backboneAt(sl); }
  /** Level 1 — per-domain instances along the backbone. */
  domainInstancesAt(sl, opts) { return this._rep().domainInstancesAt(sl, opts); }
  /** Level 2 — PDB/mmCIF-coordinate-derived structural proxy table. */
  structuralProxies() { return this._rep().structuralProxies(); }
  /** Level 3 — molecular reference policy (offline validation assets only). */
  molecularReference() { return this._rep().molecularReference(); }
  /** Representation-level invariant + forbidden-rule check → { errors, notes }. */
  verifyRepresentation(sl) { return this._rep().verifyRepresentation(sl); }

  /** Phase-6: guards on the level-2 structural proxies. */
  verifyStructuralProxies() { return this._rep().verifyStructuralProxies(); }

  /**
   * Phase-6: measured geometry BETWEEN consecutive domains (rise, bend, twist).
   * Evidence about the SCHEMATIC azimuth convention — never a coordinate.
   */
  interdomainGeometry() { return this._rep().interdomainGeometry(); }

  // --- Phase 5: repeated domain strategy (archetype instancing) ---
  _inst() {
    if (!this.instancing) throw new Error('geometry_strategy.json not loaded — no instancing plan available');
    return this.instancing;
  }

  /** InstancedMesh-ready batches: one shared archetype + N per-instance transforms. */
  instancingPlanAt(sl) { return this._inst().batchesAt(sl); }

  /** Phase-5 conformance guards (archetype never deformed, chain stays connected). */
  verifyInstancing(sl) { return this._inst().verify(sl); }

  // --- titin region metadata for the detail view (Milestone 3) ---
  titinRegions() {
    return this.spec.titin.regions.map((r) => ({
      id: r.id,
      name: r.name,
      band: r.band,
      residue_span: r.residue_span,
      domains: r.domain_composition,
      geometry_proxy: r.geometry_proxy,
      mechanical_class: r.mechanical_class,
      evidence: this.provenance.forRegion(r.id),
    }));
  }

  // --- sarcomere components for the context view (Milestone 2) ---
  sarcomereComponents() {
    return this.spec.sarcomere.components.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.biological_role,
      evidence: this.provenance.forComponent(c.id),
    }));
  }

  /** Explicit "what we do NOT know" list — honest-uncertainty panel. */
  unknowns() { return this.provenance.allUnknowns(); }

  /** Spec-level forbidden depiction rules the UI must honor. */
  forbiddenRules() { return this.spec.states.transition_rules.forbidden; }
}
