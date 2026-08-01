/**
 * Phase 5 — Repeated Domain Strategy.
 *
 * The plan's rule: "Do not create unique high-resolution geometry for every titin
 * domain." Instead identify structural domain classes, select representative
 * experimental structures, build a small number of lightweight archetypes,
 * instance them, and apply individual transforms "where evidence supports
 * differences".
 *
 *     representative experimental structure
 *                     v
 *           validated archetype
 *                     v
 *            Three.js InstancedMesh
 *                     v
 *     individual scientifically defined transforms
 *
 * This module is the third arrow: it turns the Level-1 domain instances into
 * per-archetype BATCHES, each of which a renderer can upload as exactly one
 * InstancedMesh. It produces no meshes and imports no renderer — the data layer
 * stays renderer-agnostic (Phase 2), and Three.js only consumes this.
 *
 * "Most structural information should live in the arrangement and transforms, not
 * in excessive mesh complexity" — so the archetype geometry stays a primitive and
 * every scientific difference is expressed as a per-instance transform.
 */

const EPS = 1e-6;

/**
 * Azimuth policy for tilted folded domains.
 *
 * Level 1 reports `tilt_deg_from_axis` (from axial rise vs folded length) but
 * leaves `azimuth_deg` null — the rotation of that tilt about the filament axis
 * is genuinely UNKNOWN. A renderer nevertheless has to choose one, and the choice
 * is NOT free, because titin is a single continuous polypeptide:
 *
 *  - Constant azimuth: every domain leans the same way, so the chain walks off
 *    axis — for prox_Ig, 77 domains x 4.0 nm x sin(50.7 deg) = ~238 nm of
 *    transverse drift inside a ~1100 nm half-sarcomere. Physically impossible.
 *  - Alternating azimuth (0 deg / 180 deg): consecutive domains lean opposite
 *    ways, so the chain zig-zags about the axis with amplitude
 *    (L/2)*sin(tilt) ~ 1.5 nm and the junction gap between consecutive domains is
 *    exactly zero — the chain stays connected and stays on axis.
 *
 * The alternation is therefore forced by chain continuity, not chosen for looks.
 * It is still SCHEMATIC: the real azimuths are unknown and are not claimed to
 * alternate in a plane. What IS claimed is only that the chain is continuous and
 * does not drift off axis.
 */
export const AZIMUTH_POLICY = Object.freeze({
  id: 'alternating_planar',
  values_deg: Object.freeze([0, 180]),
  evidence_class: 'SCHEMATIC',
  claims: 'chain continuity and no net transverse drift',
  does_not_claim: 'the true azimuth of any domain, or that the zig-zag is planar in vivo',
});

export class InstancingPlan {
  constructor(spec, representation) {
    this.spec = spec;
    this.representation = representation;
    this.archetypes = spec.geometryStrategy.domain_archetypes;
  }

  /**
   * Phase 5 steps 3-5 for one sarcomere length.
   *
   * Returns `{ batches, unbatched, azimuth_policy, totals }` where each batch is
   * one InstancedMesh: a shared archetype + N per-instance transforms.
   */
  batchesAt(sarcomereLengthNm) {
    const { instances } = this.representation.domainInstancesAt(sarcomereLengthNm);
    const byArchetype = new Map();
    const unbatched = [];

    for (const d of instances) {
      // A domain with no folded archetype (PEVK, N2A) must NOT be instanced as a
      // folded primitive. It is reported separately so a renderer cannot silently
      // draw a disordered region as a row of capsules.
      if (!d.geometry_archetype) {
        unbatched.push({
          domain_id: d.domain_id,
          domain_class: d.domain_class,
          reason: 'no folded archetype — disordered/extensible region',
          render_hint: 'draw as a variable-length path, never as folded domain primitives',
          span_nm: d.span_nm,
          evidence_class: d.evidence_class,
        });
        continue;
      }
      if (!byArchetype.has(d.geometry_archetype)) byArchetype.set(d.geometry_archetype, []);
      byArchetype.get(d.geometry_archetype).push(d);
    }

    const batches = [];
    for (const [key, members] of byArchetype) {
      batches.push(this._batch(key, members));
    }
    // Deterministic order: largest batch first, then by name. A renderer's
    // InstancedMesh indices must be reproducible across runs.
    batches.sort((a, b) => b.count - a.count || a.archetype.localeCompare(b.archetype));

    return {
      sarcomere_length_nm: sarcomereLengthNm,
      batches,
      unbatched,
      azimuth_policy: AZIMUTH_POLICY,
      totals: {
        instances: instances.length,
        batched: batches.reduce((a, b) => a + b.count, 0),
        unbatched: unbatched.length,
        draw_calls: batches.length,
      },
    };
  }

  /** One archetype -> one InstancedMesh payload. */
  _batch(key, members) {
    const a = this.archetypes[key] || {};
    const rep = a.representative_structure || null;

    const transforms = members.map((d, i) => this._transform(d, i, a));

    // Which per-instance channels actually vary. A renderer can skip uploading a
    // constant channel, and a reviewer can see at a glance that `scale` never
    // varies — the archetype is instanced, never deformed.
    const varies = {
      position: true,
      tilt_deg: new Set(transforms.map((t) => t.rotation.tilt_deg_from_axis)).size > 1,
      azimuth_deg: new Set(transforms.map((t) => t.rotation.azimuth_deg)).size > 1,
      scale: new Set(transforms.map((t) => t.scale)).size > 1,
    };

    return {
      archetype: key,
      count: members.length,
      // --- shared geometry: uploaded ONCE for the whole batch ---
      geometry: {
        primitive: a.primitive || null,
        axial_length_nm: a.axial_length_nm != null ? a.axial_length_nm : null,
        lateral_diameter_nm: a.lateral_diameter_nm != null ? a.lateral_diameter_nm : null,
        ellipsoid_semi_axes_nm: a.ellipsoid_semi_axes_nm || null,
        preserves: a.preserves || [],
        not_claimed: a.not_claimed || [],
        evidence_by_claim: a.evidence_by_claim || {},
        rationale: a.rationale || null,
      },
      representative_structure: rep
        ? {
          pdb_id: rep.pdb_id,
          method: rep.method,
          resolution_A: rep.resolution_A != null ? rep.resolution_A : null,
          uniprot_span: rep.uniprot_span,
          claims: rep.claims,
          does_not_claim: rep.does_not_claim,
        }
        : null,
      // Phase 6 provenance is carried from the archetype. This flag means at
      // least one rendered geometric dimension was measured from deposited
      // coordinates; it does NOT claim that the primitive reproduces atomistic
      // surface detail (see geometry.not_claimed).
      geometry_derived_from_coordinates: Boolean(a.geometry_derived_from_coordinates),
      transforms,
      varies,
      regions: [...new Set(members.map((d) => d.domain_id.split('.')[0]))],
    };
  }

  /**
   * Per-instance transform — the plan's step 5, "individual position, orientation,
   * scale, and spacing where evidence supports differences".
   *
   * Every channel carries its own evidence class, because they are not equally
   * well known: axial position is derived from sourced spans, tilt from the
   * rise/length ratio, azimuth is a rendering convention, and scale is fixed at 1
   * by policy.
   */
  _transform(d, indexInBatch, arche) {
    const tilt = d.orientation ? d.orientation.tilt_deg_from_axis : null;
    // Azimuth only means anything for a tilted domain: at tilt 0 the rotation
    // about the axis is degenerate, so claiming an azimuth there would be noise.
    const tilted = tilt != null && Math.abs(tilt) > EPS;
    const az = tilted
      ? AZIMUTH_POLICY.values_deg[indexInBatchParity(d)]
      : null;

    return {
      instance_index: indexInBatch,
      domain_id: d.domain_id,
      domain_class: d.domain_class,
      region: d.domain_id.split('.')[0],
      zone: d.zone,
      position_nm: d.position_nm,
      rotation: {
        axis: 'X',
        tilt_deg_from_axis: tilt,
        azimuth_deg: az,
        azimuth_policy: tilted ? AZIMUTH_POLICY.id : 'not applicable (untilted)',
        azimuth_evidence_class: tilted ? AZIMUTH_POLICY.evidence_class : 'N/A',
      },
      // Uniform 1. The archetype is INSTANCED, never stretched to fit a span:
      // stretching a folded domain would depict unfolding as ordinary geometry.
      scale: 1,
      scale_policy: 'archetype never deformed; length differences are expressed as spacing, not scale',
      spacing: {
        axial_rise_nm: d.axial_rise_nm,
        folded_length_nm: d.folded_length_nm,
        interdomain_linker_nm: d.interdomain_linker_nm,
      },
      evidence: {
        domain: d.domain_evidence_class,
        placement: d.placement_evidence_class,
        effective: d.evidence_class,
      },
      source: d.source,
      representative_pdb_id: d.representative_pdb_id,
    };
  }

  /**
   * Declared-vs-instanced domain audit.
   *
   * `titin.json` declares a per-region `domain_composition` with evidence class
   * MEASURED. Every declared folded domain should therefore reach the renderer as
   * an instance — or its absence must be an explicitly recorded gap, never a
   * silent omission. This catches the case where a region's assembly strategy
   * (`tube`, `single`) cannot express the domains its own composition declares.
   */
  declaredVsInstanced(sarcomereLengthNm) {
    const { instances } = this.representation.domainInstancesAt(sarcomereLengthNm);
    const documented = this.spec.geometryStrategy.undepicted_declared_domains || {};
    const rows = [];

    for (const region of this.representation.regions) {
      const declared = region.domain_composition || {};
      for (const [cls, n] of Object.entries(declared)) {
        if (!n) continue;
        const emitted = instances.filter(
          (d) => d.domain_id.split('.')[0] === region.id
                 && d.geometry_archetype && d.domain_class === cls,
        ).length;
        if (emitted === n) continue;
        const doc = (documented[region.id] || {})[cls] || null;
        rows.push({
          region: region.id,
          domain_class: cls,
          declared: n,
          instanced: emitted,
          missing: n - emitted,
          assembly: (this.representation.strategy.titin_primitives[region.id] || {}).assembly || null,
          documented: doc,
        });
      }
    }
    return rows;
  }

  /**
   * Junction-by-junction chain continuity, computed from the emitted transforms.
   *
   * Each domain is a segment of its archetype's folded length centred on
   * `position_nm`, tilted `tilt_deg_from_axis` from the filament axis and rotated
   * `azimuth_deg` about it. Consecutive domains within a region are joined
   * downstream-end to upstream-end; the 3D distance between those points is the
   * gap the polypeptide backbone has to span.
   */
  junctionContinuity(sarcomereLengthNm) {
    const plan = this.batchesAt(sarcomereLengthNm);
    const withL = plan.batches.flatMap((b) =>
      b.transforms.map((t) => ({ t, L: b.geometry.axial_length_nm })));

    const byRegion = new Map();
    for (const e of withL) {
      if (e.L == null) continue;
      if (!byRegion.has(e.t.region)) byRegion.set(e.t.region, []);
      byRegion.get(e.t.region).push(e);
    }

    const D = Math.PI / 180;
    const endPoint = (e, sign) => {
      const th = (e.t.rotation.tilt_deg_from_axis || 0) * D;
      const az = (e.t.rotation.azimuth_deg || 0) * D;
      const h = (sign * e.L) / 2;
      return {
        x: e.t.position_nm.x + h * Math.cos(th),
        y: (e.t.position_nm.y || 0) + h * Math.sin(th) * Math.cos(az),
        z: (e.t.position_nm.z || 0) + h * Math.sin(th) * Math.sin(az),
      };
    };

    const out = [];
    for (const list of byRegion.values()) {
      list.sort((a, b) => a.t.position_nm.x - b.t.position_nm.x);
      for (let i = 0; i + 1 < list.length; i++) {
        const p = endPoint(list[i], +1);
        const q = endPoint(list[i + 1], -1);
        const gap = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
        // Slack already accounted for by the model between these two domains.
        const budget = Math.max(list[i].t.spacing.interdomain_linker_nm || 0,
                                list[i + 1].t.spacing.interdomain_linker_nm || 0);
        const ev = `${list[i].t.evidence.placement} | ${list[i + 1].t.evidence.placement}`;
        out.push({
          from: list[i].t.domain_id,
          to: list[i + 1].t.domain_id,
          gap_nm: gap,
          linker_budget_nm: budget,
          overrun_nm: gap - budget,
          placement_evidence: ev,
          schematic: /SCHEMATIC|UNKNOWN/.test(ev),
          zone_boundary: list[i].t.zone !== list[i + 1].t.zone,
        });
      }
    }
    return out;
  }

  /**
   * Phase 5 conformance checks. These are FORBIDDEN-depiction guards, not style
   * checks: each one corresponds to a claim the model must not make.
   */
  verify(sarcomereLengthNm) {
    const errors = [];
    const notes = [];
    const plan = this.batchesAt(sarcomereLengthNm);

    // (1) Every folded instance must end up in exactly one batch.
    if (plan.totals.batched + plan.totals.unbatched !== plan.totals.instances) {
      errors.push(`instance accounting: ${plan.totals.batched} batched + ` +
                  `${plan.totals.unbatched} unbatched != ${plan.totals.instances} total`);
    }

    // (2) One draw call per archetype — the whole point of the phase. If this ever
    //     exceeds the archetype count, per-domain geometry has crept back in.
    const archetypeCount = new Set(plan.batches.map((b) => b.archetype)).size;
    if (plan.batches.length !== archetypeCount) {
      errors.push(`${plan.batches.length} batches for ${archetypeCount} archetypes — ` +
                  'batching is not collapsing to one draw call per archetype');
    }

    // (3) FORBIDDEN: deforming an archetype. Non-unit scale would render a folded
    //     domain longer or shorter than its measured folded length.
    for (const b of plan.batches) {
      for (const t of b.transforms) {
        if (t.scale !== 1) {
          errors.push(`${t.domain_id}: scale ${t.scale} != 1 — archetype deformed`);
        }
      }
      if (b.varies.scale) errors.push(`batch ${b.archetype}: scale varies across instances`);
    }

    // (4) FORBIDDEN: a disordered region rendered as folded primitives.
    for (const b of plan.batches) {
      for (const t of b.transforms) {
        if (t.domain_class === 'PEVK' || t.domain_class === 'N2A') {
          errors.push(`${t.domain_id}: disordered class ${t.domain_class} placed in a folded batch`);
        }
      }
    }

    // (5) The archetype must match the domain's own fold class whenever an
    //     archetype exists for that class — otherwise an Fn3 domain is silently
    //     drawn as the Ig exemplar.
    for (const b of plan.batches) {
      for (const t of b.transforms) {
        if (this.archetypes[t.domain_class] && t.domain_class !== b.archetype) {
          errors.push(`${t.domain_id}: class ${t.domain_class} batched as ${b.archetype} ` +
                      'although an archetype exists for its own class');
        }
      }
    }

    // (6) The azimuth must alternate WITHIN EACH REGION, which is the scale at which
    //     the chain has to stay on axis. Checking per batch is too weak: a batch
    //     spans several regions, so one region stuck at a constant azimuth still
    //     leaves two distinct values in the batch and slips through.
    for (const b of plan.batches) {
      const byRegion = new Map();
      for (const t of b.transforms) {
        if (t.rotation.azimuth_deg == null) continue;
        if (!byRegion.has(t.region)) byRegion.set(t.region, []);
        byRegion.get(t.region).push(t.rotation.azimuth_deg);
      }
      for (const [region, azs] of byRegion) {
        if (azs.length > 1 && new Set(azs).size < 2) {
          errors.push(`${region} (batch ${b.archetype}): ${azs.length} tilted instances share ` +
                      'one azimuth — the chain would drift off axis');
        }
      }
    }

    // (7) Every batch must name the experimental structure its archetype stands
    //     for, and its coordinate-derived flag must exactly match the archetype's
    //     Phase-6 provenance. Both false negatives and false positives are errors.
    for (const b of plan.batches) {
      if (!b.representative_structure) {
        errors.push(`batch ${b.archetype}: no representative experimental structure recorded`);
      }
      const expected = Boolean(this.archetypes[b.archetype]?.geometry_derived_from_coordinates);
      if (b.geometry_derived_from_coordinates !== expected) {
        errors.push(`batch ${b.archetype}: geometry_derived_from_coordinates=`
          + `${b.geometry_derived_from_coordinates} but archetype provenance requires ${expected}`);
      }
      if (expected) {
        const ev = b.geometry.evidence_by_claim || {};
        const hasMeasuredDimension = Object.entries(ev).some(([claim, cls]) =>
          /axial|lateral|diameter|axes|size/i.test(claim) && /^MEASURED/i.test(String(cls)));
        if (!hasMeasuredDimension) {
          errors.push(`batch ${b.archetype}: coordinate-derived flag has no MEASURED dimension claim`);
        }
      }
    }

    // (8) Chain continuity in 3D under the emitted transforms. Titin is one
    //     polypeptide, so consecutive domains must either touch or be separated by
    //     no more than the inter-domain linker the model already reports.
    //
    //     A junction whose 3D gap exceeds that linker budget is a real break — BUT
    //     only if the placement claims to be measured. Inside a zone whose spacing
    //     is SCHEMATIC the discontinuity is a known consequence of an unsourced
    //     spacing choice, so it is reported as a note, not silently tolerated and
    //     not misreported as a measured result.
    for (const c of this.junctionContinuity(sarcomereLengthNm)) {
      if (c.overrun_nm <= 1e-3) continue;
      const msg = `${c.from} -> ${c.to}: 3D gap ${c.gap_nm.toFixed(3)} nm exceeds ` +
                  `linker budget ${c.linker_budget_nm.toFixed(3)} nm by ${c.overrun_nm.toFixed(3)} nm`;
      if (c.schematic) {
        notes.push(`KNOWN LIMITATION — ${msg}. Placement evidence is SCHEMATIC ` +
                   `(${c.placement_evidence}), so this discontinuity is an artefact of an ` +
                   'unsourced spacing choice, not a structural claim.');
      } else {
        errors.push(`chain break ${msg} (placement claims ${c.placement_evidence})`);
      }
    }

    // (9) Every MEASURED declared domain must be instanced, or its omission must be
    //     documented in the spec. An undocumented shortfall is a silent omission —
    //     the model would be quietly dropping a domain the spec says exists.
    for (const r of this.declaredVsInstanced(sarcomereLengthNm)) {
      const what = `${r.region}: declares ${r.declared} ${r.domain_class} domain(s) but ` +
                   `instances ${r.instanced} (assembly '${r.assembly}')`;
      if (r.documented) {
        notes.push(`DECLARED-NOT-DEPICTED — ${what}. ${r.documented.reason}`);
      } else {
        errors.push(`${what} — undocumented omission; either instance it or record it in ` +
                    'geometry_strategy.undepicted_declared_domains');
      }
    }

    notes.push(`${plan.totals.instances} domain instances -> ${plan.totals.draw_calls} draw calls ` +
               `(+${plan.totals.unbatched} non-instanced disordered region(s)).`);
    notes.push('Archetype geometry combines literature axial constraints with Phase-6 coordinate ' +
               'measurements where recorded; primitive surface shape remains SCHEMATIC.');
    notes.push(`Azimuth is ${AZIMUTH_POLICY.evidence_class}: ${AZIMUTH_POLICY.claims}; ` +
               `does not claim ${AZIMUTH_POLICY.does_not_claim}.`);

    return { errors, notes, totals: plan.totals };
  }
}

/**
 * Parity for the alternating azimuth.
 *
 * Taken from the domain's index WITHIN ITS REGION (parsed from `domain_id`), not
 * from its index in the batch: the batch interleaves several regions, so batch
 * order would alternate arbitrarily across a region boundary and break the
 * zig-zag exactly where the chain must stay connected.
 */
function indexInBatchParity(d) {
  const n = Number(d.domain_id.split('.')[1]);
  return Number.isFinite(n) ? (n - 1) % 2 : 0;
}
