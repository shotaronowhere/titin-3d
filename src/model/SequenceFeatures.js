/** Pure SC-19 sequence-feature/region reconciliation. */

function integer(value) { return Number.isInteger(value); }

function checkedSpan(record, label) {
  const start = record?.start ?? record?.residue_span?.start;
  const end = record?.end ?? record?.residue_span?.end;
  if (!integer(start) || !integer(end) || start < 1 || end < start) {
    throw new Error(`${label} has an invalid inclusive residue span`);
  }
  const length = record?.length_aa ?? record?.residue_span?.length_aa;
  if (length !== end - start + 1) {
    throw new Error(`${label} length_aa does not equal end - start + 1`);
  }
  return { start, end };
}

/**
 * @param {object} sequenceFeatures
 * @param {object[]} titinRegions
 * @param {{expectedCoordinateFrame?:string}} [options]
 */
export function mapFeaturesToRegions(sequenceFeatures, titinRegions, options = {}) {
  const { expectedCoordinateFrame } = options;
  const frame = sequenceFeatures?.source?.coordinate_frame;
  if (!frame || frame !== expectedCoordinateFrame) {
    throw new Error(`sequence coordinate frame '${frame || '(missing)'}' != '${expectedCoordinateFrame || '(missing)'}'`);
  }
  if (!Array.isArray(sequenceFeatures.features) || !Array.isArray(titinRegions)) {
    throw new Error('mapFeaturesToRegions requires feature and region arrays');
  }
  const boundaryProblems = [];
  const orderedRegions = [...titinRegions].sort((a, b) => (
    a.residue_span.start - b.residue_span.start
  ));
  let previousEnd = 0;
  for (const region of orderedRegions) {
    const span = checkedSpan(region, `region ${region.id}`);
    if (span.start !== previousEnd + 1) {
      boundaryProblems.push({
        type: span.start <= previousEnd ? 'region_overlap' : 'region_gap',
        previous_end: previousEnd,
        next_start: span.start,
        region_id: region.id,
      });
    }
    previousEnd = span.end;
  }
  if (previousEnd !== sequenceFeatures.sequence_length_aa) {
    boundaryProblems.push({
      type: 'sequence_end_mismatch', region_end: previousEnd,
      sequence_length_aa: sequenceFeatures.sequence_length_aa,
    });
  }

  /** @type {Map<string, {regionId:string, residueSpan:object, containedFeatures:object[], overlappingFeatures:object[]}>} */
  const result = new Map(orderedRegions.map((region) => [region.id, {
    regionId: region.id,
    residueSpan: Object.freeze({ ...region.residue_span }),
    containedFeatures: [],
    overlappingFeatures: [],
  }]));
  const unassignedFeatures = [];
  const multiplyAssignedFeatures = [];
  for (const feature of sequenceFeatures.features) {
    const span = checkedSpan(feature, `feature ${feature.id}`);
    const contained = [];
    const overlapping = [];
    for (const region of orderedRegions) {
      const regionSpan = region.residue_span;
      if (regionSpan.start <= span.start && span.end <= regionSpan.end) contained.push(region.id);
      if (!(span.end < regionSpan.start || span.start > regionSpan.end)) overlapping.push(region.id);
    }
    for (const regionId of contained) result.get(regionId)?.containedFeatures.push(feature);
    for (const regionId of overlapping) result.get(regionId)?.overlappingFeatures.push(feature);
    if (!contained.length) unassignedFeatures.push(feature);
    if (contained.length > 1) multiplyAssignedFeatures.push(feature);
    if (contained.length !== 1 || overlapping.length !== 1) {
      boundaryProblems.push({
        type: 'feature_boundary', feature_id: feature.id,
        contained_in: contained, overlaps: overlapping,
      });
    }
  }
  return Object.freeze({
    regions: Object.freeze([...result.values()].map((row) => Object.freeze({
      ...row,
      containedFeatures: Object.freeze([...row.containedFeatures]),
      overlappingFeatures: Object.freeze([...row.overlappingFeatures]),
    }))),
    unassignedFeatures: Object.freeze(unassignedFeatures),
    multiplyAssignedFeatures: Object.freeze(multiplyAssignedFeatures),
    boundaryProblems: Object.freeze(boundaryProblems),
  });
}
