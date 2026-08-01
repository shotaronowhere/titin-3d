/**
 * Biological annotation descriptors shared by the renderer and accessible UI.
 *
 * An annotation is a scientific record, not merely text: it identifies the
 * structure, anchors the label in model coordinates, carries per-claim evidence,
 * cites its sources, and states what the label does not establish.
 */

/** @typedef {import('../model/TitinModel.js').TitinModel} TitinModel */

const EVIDENCE_ORDER = Object.freeze([
  'UNKNOWN', 'SCHEMATIC', 'INFERRED', 'MODELED', 'STRONGLY INFERRED', 'MEASURED',
]);

function evidenceHead(value) {
  const upper = String(value || '').toUpperCase();
  return [...EVIDENCE_ORDER]
    .sort((a, b) => b.length - a.length)
    .find((name) => upper.startsWith(name)) || 'UNKNOWN';
}

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

/**
 * @param {TitinModel} model
 * @param {number} sarcomereLengthNm
 * @param {{scale?:'context'|'detail'}} [opts]
 */
export function createAnnotations(model, sarcomereLengthNm, opts = {}) {
  const { min, max } = model.slRange();
  if (!Number.isFinite(sarcomereLengthNm)
      || sarcomereLengthNm < min || sarcomereLengthNm > max) {
    throw new Error(
      `createAnnotations: length must be inside ${min}–${max} nm; got ${sarcomereLengthNm}`,
    );
  }
  const scale = opts.scale || 'context';
  if (scale !== 'context' && scale !== 'detail') {
    throw new Error(`createAnnotations: unknown scale '${scale}'.`);
  }

  if (scale === 'context') {
    const scene = model.sceneAt(sarcomereLengthNm);
    const descriptors = new Map(scene.sarcomere.map((item) => [item.id, item]));
    return model.spec.sarcomere.components
      .filter((component) => ['zdisc', 'thin_filament', 'thick_filament', 'mline'].includes(component.id))
      .map((component) => {
        const descriptor = /** @type {any} */ (descriptors.get(component.id) || {});
        const claims = component.evidence_by_claim || {};
        return {
          id: `context-${component.id}`,
          label: component.name,
          target_type: 'sarcomere_component',
          target_id: component.id,
          anchor_nm: { x: centreOfTransform(descriptor.transform), y: 0, z: 0 },
          evidence_class: weakestEvidence(claims),
          evidence_by_claim: { ...claims },
          sources: [...(component.primary_references || [])],
          not_claimed: disclosures(component, claims),
        };
      });
  }

  const path = model.backboneAt(sarcomereLengthNm);
  const segments = new Map(path.segments.map((segment) => [segment.region_id, segment]));
  return model.spec.titin.regions.map((region) => {
    const segment = segments.get(region.id);
    const claims = region.evidence_by_claim || {};
    return {
      id: `titin-${region.id}`,
      label: region.name,
      target_type: 'titin_region',
      target_id: region.id,
      anchor_nm: {
        x: segment ? (segment.X_start + segment.X_end) / 2 : 0,
        y: 0,
        z: 0,
      },
      evidence_class: weakestEvidence(claims),
      evidence_by_claim: { ...claims },
      sources: [...(region.primary_references || [])],
      not_claimed: disclosures(region, claims),
    };
  });
}
