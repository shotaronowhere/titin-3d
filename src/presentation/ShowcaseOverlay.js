/**
 * SC-2 presentation descriptors derived from the existing scientific model.
 *
 * This module creates no geometry and owns no biological constants. It turns
 * canonical model outputs into render-only continuity, landmark, and chart
 * records so the 3D trace, DOM labels, and extension story cannot drift apart.
 */

import { IBAND_REGIONS } from '../api/titinApi.js';
import { EVIDENCE_CLASSES } from '../model/SpecLoader.js';

export const OVERLAY_LONGITUDINAL_LIMITS = Object.freeze({
  min_span_px: 96,
  max_abs_slope: 0.25,
});

export const EXTENSION_MECHANISM = Object.freeze({
  prox_Ig: Object.freeze({ kind: 'folded', label: 'folded domains straighten' }),
  N2A: Object.freeze({ kind: 'composite', label: 'rigid Ig + disordered chain' }),
  PEVK: Object.freeze({ kind: 'disordered', label: 'disordered chain extends' }),
  dist_Ig: Object.freeze({ kind: 'folded', label: 'folded domains straighten' }),
});

const REGION_LABEL = Object.freeze({
  prox_Ig: 'proximal Ig',
  N2A: 'N2A',
  PEVK: 'PEVK',
  dist_Ig: 'distal Ig',
});

function requireFiniteRange(startNm, endNm, id) {
  if (!Number.isFinite(startNm) || !Number.isFinite(endNm) || endNm < startNm) {
    throw new Error(`createShowcaseOverlay: invalid '${id}' range ${startNm}..${endNm}`);
  }
  return Object.freeze({ start_nm: startNm, end_nm: endNm });
}

function requireEvidence(spec, label, id) {
  const evidence = spec._baseClass(String(label || ''));
  if (!EVIDENCE_CLASSES.includes(evidence)) {
    throw new Error(`createShowcaseOverlay: '${id}' has invalid evidence '${label}'.`);
  }
  return evidence;
}

function requireSourceIds(records, id) {
  const sourceIds = [...new Set((records || []).map((record) => (
    typeof record === 'string' ? record : record?.id ?? record?.key
  )).filter(Boolean))];
  if (!sourceIds.length) {
    throw new Error(`createShowcaseOverlay: '${id}' has no canonical source metadata.`);
  }
  return Object.freeze(sourceIds);
}

/**
 * Whether a projected sarcomere axis is sufficiently horizontal and resolved for
 * horizontal band brackets to remain spatially honest. OrbitControls can move the
 * camera without changing the named preset, so this must use live projections.
 */
export function isLongitudinalProjection(start, end, limits = {}) {
  const minSpanPx = limits.min_span_px ?? OVERLAY_LONGITUDINAL_LIMITS.min_span_px;
  const maxAbsSlope = limits.max_abs_slope
    ?? OVERLAY_LONGITUDINAL_LIMITS.max_abs_slope;
  const values = [start?.x_px, start?.y_px, end?.x_px, end?.y_px, minSpanPx, maxAbsSlope];
  if (!start?.visible || !end?.visible || !values.every(Number.isFinite)
      || minSpanPx < 0 || maxAbsSlope < 0) return false;
  const dx = Math.abs(end.x_px - start.x_px);
  const dy = Math.abs(end.y_px - start.y_px);
  return dx >= minSpanPx && dy / Math.max(dx, Number.EPSILON) <= maxAbsSlope;
}

/**
 * @param {import('../model/TitinModel.js').TitinModel} model
 * @param {number} sarcomereLengthNm
 */
export function createShowcaseOverlay(model, sarcomereLengthNm) {
  const { min, max } = model.slRange();
  if (!Number.isFinite(sarcomereLengthNm)
      || sarcomereLengthNm < min || sarcomereLengthNm > max) {
    throw new Error(
      `createShowcaseOverlay: length must be inside ${min}–${max} nm; `
      + `got ${sarcomereLengthNm}`,
    );
  }

  const geometry = model.geometryAt(sarcomereLengthNm);
  const backbone = model.backboneAt(sarcomereLengthNm);
  const segmentById = new Map(backbone.segments.map((segment) => [segment.region_id, segment]));
  const components = new Map(model.spec.sarcomere.components.map((component) => [component.id, component]));
  const claims = new Map(model.spec.showcaseClaims.objects.map((claim) => [claim.id, claim]));
  const zdisc = components.get('zdisc');
  const thickFilament = components.get('thick_filament');
  const zdiscWidth = model.provenance.forParameter('zdisc', 'Width (super-resolution)');
  const zWidth = components.get('zdisc')?.dimensions_nm?.width_X;
  const bareZoneWidth = components.get('thick_filament')?.dimensions_nm?.bare_zone_center;
  const superRepeat = model.spec.geometryStrategy?.geometric_relationships
    ?.titin_Aband_super_repeat;
  const repeat = superRepeat?.values;
  const bandClaim = claims.get('band_and_zone_brackets');
  const bareZoneClaim = claims.get('bare_zone_head_absence');
  const mBandClaim = claims.get('mband_midpoint_and_crosslinks');
  const aband = segmentById.get('Aband_super');
  if (![zWidth, bareZoneWidth].every(Number.isFinite) || !repeat || !aband
      || !zdisc || !thickFilament || !zdiscWidth.found
      || !bandClaim || !bareZoneClaim || !mBandClaim) {
    throw new Error('createShowcaseOverlay: required canonical band descriptors are unavailable.');
  }

  const bandEvidence = Object.freeze({
    zdisc: requireEvidence(model.spec, zdiscWidth.class, 'zdisc'),
    iband: requireEvidence(model.spec, bandClaim.claim_evidence_class, 'iband'),
    aband: requireEvidence(model.spec,
      thickFilament.evidence_by_claim?.dimensions_and_positions, 'aband'),
    czone: requireEvidence(model.spec, superRepeat.evidence_class, 'czone'),
    bare_zone: requireEvidence(model.spec, bareZoneClaim.claim_evidence_class, 'bare_zone'),
    mband: requireEvidence(model.spec, mBandClaim.claim_evidence_class, 'mband'),
  });
  const bandSources = Object.freeze({
    zdisc: requireSourceIds(zdiscWidth.sources, 'zdisc'),
    iband: requireSourceIds(bandClaim.sources, 'iband'),
    aband: requireSourceIds(thickFilament.primary_references, 'aband'),
    czone: requireSourceIds(superRepeat.sources, 'czone'),
    bare_zone: requireSourceIds(bareZoneClaim.sources, 'bare_zone'),
    mband: requireSourceIds(mBandClaim.sources, 'mband'),
  });

  const cZoneLength = repeat.n_C_zone_super_repeats * repeat.super_repeat_periodicity_nm;
  const cZoneStart = aband.X_end - cZoneLength;
  const mlineX = geometry.mline.X;
  const brackets = [
    {
      id: 'zdisc', label: 'Z-disc', lane: 'major', kind: 'range',
      ...requireFiniteRange(-zWidth / 2, zWidth / 2, 'zdisc'),
      evidence_class: bandEvidence.zdisc, source_ids: bandSources.zdisc,
    },
    {
      id: 'iband', label: 'I-band', lane: 'major', kind: 'range',
      ...requireFiniteRange(zWidth / 2, geometry.thick_filament.X_start, 'iband'),
      evidence_class: bandEvidence.iband, source_ids: bandSources.iband,
    },
    {
      id: 'aband', label: 'A-band · half', lane: 'major', kind: 'range',
      ...requireFiniteRange(geometry.thick_filament.X_start, mlineX, 'aband'),
      evidence_class: bandEvidence.aband, source_ids: bandSources.aband,
    },
    {
      id: 'czone', label: 'C-zone', lane: 'minor', kind: 'range',
      ...requireFiniteRange(cZoneStart, aband.X_end, 'czone'),
      evidence_class: bandEvidence.czone, source_ids: bandSources.czone,
    },
    {
      id: 'bare_zone', label: 'bare zone', lane: 'minor', kind: 'range',
      ...requireFiniteRange(mlineX - bareZoneWidth / 2, mlineX + bareZoneWidth / 2, 'bare_zone'),
      evidence_class: bandEvidence.bare_zone, source_ids: bandSources.bare_zone,
    },
    {
      // The current model has no independently resolved M-line substructure.
      // A point marker is more honest than inventing a second axial extent on
      // top of the head-free bare-zone span. SC-3 replaced the old slab with this
      // coordinate marker plus separately scoped schematic crosslink context.
      id: 'mband', label: 'M-band center', lane: 'marker', kind: 'marker',
      ...requireFiniteRange(mlineX, mlineX, 'mband'),
      evidence_class: bandEvidence.mband, source_ids: bandSources.mband,
      not_claimed: 'a resolved M1 line or independently measured M-band sub-width',
    },
  ];

  const extensions = IBAND_REGIONS.map((id) => {
    const segment = segmentById.get(id);
    const extension = geometry.titin_iband_extension_nm[id];
    if (!segment || !Number.isFinite(extension)) {
      throw new Error(`createShowcaseOverlay: I-band region '${id}' is unavailable.`);
    }
    return Object.freeze({
      id,
      label: REGION_LABEL[id],
      extension_nm: extension,
      start_nm: segment.X_start,
      end_nm: segment.X_end,
      mechanism: EXTENSION_MECHANISM[id],
      evidence_class: geometry.titin_partition_evidence_class,
    });
  });
  const extensionTotal = extensions.reduce((sum, region) => sum + region.extension_nm, 0);
  if (Math.abs(extensionTotal - geometry.titin_iband_total_nm) > 1e-6) {
    throw new Error(
      `createShowcaseOverlay: region total ${extensionTotal} does not match `
      + `canonical I-band total ${geometry.titin_iband_total_nm}.`,
    );
  }

  return Object.freeze({
    schema: 'titin-showcase-overlay/1',
    sarcomere_length_nm: geometry.sarcomere_length_nm,
    continuity: Object.freeze({
      points: backbone.points.map((point) => Object.freeze({ ...point })),
      segments: backbone.segments.map((segment) => Object.freeze({ ...segment })),
      render_only: true,
      coordinate_basis: 'exact canonical Level-0 backbone points; no offset or resampling',
    }),
    termini: Object.freeze([
      Object.freeze({
        id: 'n_terminus', label: 'N · Z-disc anchor', direction: 'N → C',
        anchor_nm: Object.freeze({ ...backbone.points[0] }),
      }),
      Object.freeze({
        id: 'c_terminus', label: 'C · M-band anchor', direction: 'N → C',
        anchor_nm: Object.freeze({ ...backbone.points.at(-1) }),
      }),
    ]),
    brackets: Object.freeze(brackets.map((bracket) => Object.freeze(bracket))),
    extension_chart: Object.freeze({
      total_nm: extensionTotal,
      evidence_class: geometry.titin_partition_evidence_class,
      source: 'GeometryEngine.geometryAt().titin_iband_extension_nm',
      regions: Object.freeze(extensions),
    }),
  });
}
