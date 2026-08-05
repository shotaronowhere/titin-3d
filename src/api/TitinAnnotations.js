/**
 * SC-4 canonical object-linked annotations.
 *
 * Copy lives in data/annotations.json, scientific region records live in
 * data/titin.json, and bibliography lives in data/references.json. This module
 * resolves those sources into one UI-ready descriptor without restating a DOI,
 * evidence class, or source relationship in HTML constants.
 */

import {
  baseEvidence, resolveSources,
} from '../presentation/AnnotationCatalog.js';

/** @typedef {import('../model/TitinModel.js').TitinModel} TitinModel */

const EVIDENCE_ORDER = Object.freeze([
  'UNKNOWN', 'SCHEMATIC', 'INFERRED', 'MODELED', 'STRONGLY INFERRED', 'MEASURED',
]);

function evidenceHead(value) { return baseEvidence(value) || 'UNKNOWN'; }

function weakestEvidence(claims) {
  const heads = Object.values(claims || {}).map(evidenceHead);
  if (!heads.length) return 'UNKNOWN';
  return heads.reduce((weakest, current) => (
    EVIDENCE_ORDER.indexOf(current) < EVIDENCE_ORDER.indexOf(weakest)
      ? current : weakest
  ), 'MEASURED');
}

function centreOfTransform(transform = {}) {
  if (Number.isFinite(transform.position_nm)) return transform.position_nm;
  if (Number.isFinite(transform.X)) return transform.X;
  if (Number.isFinite(transform.start_nm) && Number.isFinite(transform.end_nm)) {
    return (transform.start_nm + transform.end_nm) / 2;
  }
  if (Number.isFinite(transform.X_start) && Number.isFinite(transform.X_end)) {
    return (transform.X_start + transform.X_end) / 2;
  }
  return 0;
}

function disclosures(record, evidenceByClaim) {
  const result = [];
  for (const [claim, evidence] of Object.entries(evidenceByClaim || {})) {
    const head = evidenceHead(evidence);
    if (head === 'UNKNOWN' || head === 'SCHEMATIC') {
      result.push(`${claim.replaceAll('_', ' ')}: ${evidence}`);
    }
  }
  const lateral = record.dimensions_nm?.lateral_extent_note;
  if (typeof lateral === 'string' && /unknown/i.test(lateral)) result.push(lateral);
  return [...new Set(result)];
}

function scopeText(record) {
  return [record.species, record.muscle_type, record.isoform]
    .filter((value) => typeof value === 'string' && value.trim() && value !== '—')
    .join(' · ');
}

function freezeAnnotation(record) {
  return Object.freeze({
    ...record,
    anchor_nm: Object.freeze({ ...record.anchor_nm }),
    evidence: Object.freeze({
      ...record.evidence,
      by_claim: Object.freeze({ ...(record.evidence?.by_claim || {}) }),
    }),
    evidence_by_claim: Object.freeze({ ...(record.evidence_by_claim || {}) }),
    source_ids: Object.freeze([...(record.source_ids || [])]),
    sources: Object.freeze([...(record.sources || [])]),
    not_claimed: Object.freeze([...(record.not_claimed || [])]),
  });
}

function componentAnchors(model, sl) {
  const scene = model.contextSceneAt(sl, { rings: 1 });
  const descriptors = new Map(scene.sarcomere.map((item) => [item.id, item]));
  const thinSite = [...scene.lattice.thin_sites]
    .sort((a, b) => Math.hypot(a.y, a.z) - Math.hypot(b.y, b.z))[0] || { y: 0, z: 0 };
  const strand = scene.lattice.titin_strands.offsets[0] || { y: 0, z: 0 };
  const geometry = model.geometryAt(sl);
  const backbone = model.backboneAt(sl);
  const middle = backbone.points[Math.floor(backbone.points.length / 2)] || { x: sl / 4 };
  const thick = descriptors.get('thick_filament')?.transform || {};
  const thin = descriptors.get('thin_filament')?.transform || {};
  const zdisc = descriptors.get('zdisc')?.transform || {};
  const mline = descriptors.get('mline')?.transform || {};
  const anchors = {
    titin: { x: middle.x, y: 0, z: 0 },
    titin_domains: { x: middle.x, y: 0, z: 0 },
    thick_filament: { x: centreOfTransform(thick), y: 0, z: 0 },
    thin_filament: { x: centreOfTransform(thin), y: thinSite.y, z: thinSite.z },
    thin_filament_twist: { x: Math.max(geometry.zdisc.width + 20, geometry.I_A_junction_X * 0.5), y: thinSite.y, z: thinSite.z },
    zdisc: { x: centreOfTransform(zdisc), y: 0, z: 0 },
    mline: { x: centreOfTransform(mline), y: 0, z: 0 },
    mband_crosslinks: { x: centreOfTransform(mline), y: 0, z: 0 },
    alpha_actinin: { x: geometry.zdisc.width / 2, y: thinSite.y / 2, z: thinSite.z / 2 },
    telethonin: { x: geometry.zdisc.width / 2, y: 0, z: 0 },
    myosin_heads: { x: geometry.overlap_zone_nm.start_nm + geometry.overlap_zone_nm.length * 0.35, y: strand.y, z: strand.z },
  };
  return { anchors, strand, aBandStart: thick.start_nm };
}

function componentAnnotation(model, copy, anchor) {
  const sourceIds = [...copy.source_ids];
  const sources = resolveSources(model.spec.references, sourceIds);
  return freezeAnnotation({
    id: copy.id,
    label: copy.label,
    target_type: 'component',
    target_id: copy.target_id,
    anchor_nm: anchor,
    lay_text: copy.lay_text,
    expert_text: copy.expert_text,
    scope: copy.scope,
    evidence_class: copy.render_evidence_class,
    evidence: {
      claim_class: copy.claim_evidence_class,
      render_class: copy.render_evidence_class,
      by_claim: {},
    },
    evidence_by_claim: {},
    source_ids: sourceIds,
    sources,
    short_citation: sources[0].citation,
    resolved_link: sources[0].href,
    render_meaning: copy.render_meaning,
    not_claimed: copy.not_claimed,
    binding: { ...copy.binding },
  });
}

function regionAnnotation(model, region, segment, anchor) {
  const claims = region.evidence_by_claim || {};
  const sourceIds = [...(region.primary_references || [])];
  const sources = resolveSources(model.spec.references, sourceIds);
  const strategy = model.spec.geometryStrategy?.titin_primitives?.[region.id] || {};
  const renderClass = evidenceHead(claims.render_geometry_proxy || 'SCHEMATIC');
  const biologicalRole = String(region.biological_role || '').replace(/;\s*/g, '; ');
  return freezeAnnotation({
    id: `titin-${region.id}`,
    label: region.name,
    target_type: 'titin_region',
    target_id: region.id,
    anchor_nm: anchor,
    lay_text: `${region.name} is part of titin. ${biologicalRole}.`,
    expert_text: [region.relationships, region.state_dependence].filter(Boolean).join(' '),
    scope: scopeText(region),
    evidence_class: weakestEvidence(claims),
    evidence: {
      claim_class: evidenceHead(region.evidence_class),
      render_class: renderClass,
      by_claim: claims,
    },
    evidence_by_claim: claims,
    source_ids: sourceIds,
    sources,
    short_citation: sources[0].citation,
    resolved_link: sources[0].href,
    render_meaning: `Canonical ${segment.X_start.toFixed(1)}–${segment.X_end.toFixed(1)} nm axial span rendered with the '${strategy.assembly || region.geometry_proxy}' strategy; display width and unresolved linkers are presentation proxies.`,
    not_claimed: disclosures(region, claims),
    band: region.band,
    mechanical_class: region.mechanical_class,
  });
}

/**
 * @param {TitinModel} model
 * @param {number} sarcomereLengthNm
 * @param {{scale?:'context'|'detail'}} [opts]
 */
export function createAnnotations(model, sarcomereLengthNm, opts = {}) {
  const { min, max } = model.slRange();
  if (!Number.isFinite(sarcomereLengthNm)
      || sarcomereLengthNm < min || sarcomereLengthNm > max) {
    throw new Error(`createAnnotations: length must be inside ${min}–${max} nm; got ${sarcomereLengthNm}`);
  }
  const scale = opts.scale || 'context';
  if (!['context', 'detail'].includes(scale)) {
    throw new Error(`createAnnotations: unknown scale '${scale}'.`);
  }

  const { anchors, strand, aBandStart } = componentAnchors(model, sarcomereLengthNm);
  const componentCopies = model.spec.annotations.components.filter((record) => (
    scale === 'context' || ['titin', 'titin_domains'].includes(record.target_id)
  ));
  const componentRecords = componentCopies.map((copy) => (
    componentAnnotation(model, copy, scale === 'detail'
      ? { ...anchors[copy.target_id], y: 0, z: 0 }
      : anchors[copy.target_id])
  ));

  const path = model.backboneAt(sarcomereLengthNm);
  const segments = new Map(path.segments.map((segment) => [segment.region_id, segment]));
  const regionRecords = model.spec.titin.regions.map((region) => {
    const segment = segments.get(region.id);
    if (!segment) throw new Error(`createAnnotations: no canonical segment for '${region.id}'.`);
    const x = (segment.X_start + segment.X_end) / 2;
    const f = x >= aBandStart ? 1 : x / aBandStart;
    const anchor = scale === 'detail'
      ? { x, y: 0, z: 0 }
      : { x, y: (strand.y || 0) * f, z: (strand.z || 0) * f };
    return regionAnnotation(model, region, segment, anchor);
  });
  return Object.freeze([...componentRecords, ...regionRecords]);
}

export function annotationForTarget(annotations, targetType, targetId) {
  return annotations.find((annotation) => (
    annotation.target_type === targetType && annotation.target_id === targetId
  )) || null;
}
