/** Pure SC-19 scientific-scope normalization. No UI fallback is permitted. */

function nonEmpty(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`scientific_scope.json is missing ${field}`);
  }
  return value;
}

function cloneFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneFreeze(child)]),
    ));
  }
  return value;
}

/**
 * @param {{scientificScope?: object}|object} spec
 * @returns {{publicBadge:string, publicBadgeStatus:string, sequence:object,
 *   mechanics:object, structuralContext:object, render:object,
 *   excludedClaims:readonly string[]}}
 */
export function scopeLedger(spec) {
  const record = spec?.scientificScope || spec;
  if (record?.schema !== 'titin-scientific-scope/1') {
    throw new Error('scientific_scope.json must use titin-scientific-scope/1');
  }
  const sequence = record.sequence || {};
  for (const field of ['species', 'gene', 'accession', 'isoform_id', 'coordinate_frame', 'construct_label']) {
    nonEmpty(sequence[field], `sequence.${field}`);
  }
  if (sequence.tissue_or_muscle_claim !== null) {
    throw new Error('unreviewed Q8WZ42-1 tissue identity must remain null');
  }
  const badge = nonEmpty(record.public_badge, 'public_badge');
  if (!badge.includes(sequence.isoform_id)) {
    throw new Error('public_badge must name the scoped isoform ID');
  }
  const excludedClaims = record.excluded_claims || [];
  if (!Array.isArray(excludedClaims) || !excludedClaims.length) {
    throw new Error('scientific_scope.json must declare excluded_claims');
  }
  return Object.freeze({
    publicBadge: badge,
    publicBadgeStatus: nonEmpty(record.public_badge_status, 'public_badge_status'),
    sequence: cloneFreeze(sequence),
    mechanics: cloneFreeze(record.mechanics || {}),
    structuralContext: cloneFreeze(record.structural_context || {}),
    render: cloneFreeze(record.render || {}),
    excludedClaims: Object.freeze([...excludedClaims]),
  });
}
