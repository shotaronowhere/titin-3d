/** Canonical SC-4 object-annotation validation and bibliography resolution. */

const EVIDENCE_RANK = Object.freeze({
  UNKNOWN: 0,
  SCHEMATIC: 1,
  INFERRED: 2,
  MODELED: 3,
  'STRONGLY INFERRED': 4,
  MEASURED: 5,
});

const REQUIRED_COMPONENT_FIELDS = Object.freeze([
  'id', 'target_id', 'label', 'lay_text', 'expert_text', 'scope',
  'claim_evidence_class', 'render_evidence_class', 'source_ids',
  'render_meaning', 'not_claimed', 'binding',
]);

export function baseEvidence(value) {
  const text = String(value || '').trim().toUpperCase();
  return Object.keys(EVIDENCE_RANK)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => text.startsWith(candidate)) || null;
}

function nonEmptyText(value) { return typeof value === 'string' && value.trim().length > 0; }

/** Runtime validation, mirrored independently by scripts/validate_annotations.py. */
export function checkAnnotationCatalog(catalog, context = {}) {
  const problems = [];
  const { references = {}, sarcomere = {}, titin = {}, claims = {} } = context;
  if (!catalog || typeof catalog !== 'object') return ['annotations.json missing or not an object'];
  if (catalog.schema !== 'titin-object-annotations/1') {
    problems.push(`annotation schema '${catalog.schema}' is unsupported`);
  }
  if (!nonEmptyText(catalog.meta?.scope) || !nonEmptyText(catalog.meta?.purpose)) {
    problems.push('annotation catalog needs explicit scope and purpose');
  }
  if (!Array.isArray(catalog.components) || !catalog.components.length) {
    return [...problems, 'annotation component records are missing or empty'];
  }

  const referenceIds = new Set(Object.keys(references));
  const componentIds = new Set((sarcomere.components || []).map((record) => record.id));
  const claimMap = new Map((claims.objects || []).map((record) => [record.id, record]));
  const seenIds = new Set();
  const seenTargets = new Set();
  for (const record of catalog.components) {
    const rid = record?.id || '(missing id)';
    for (const field of REQUIRED_COMPONENT_FIELDS) {
      if (!Object.hasOwn(record || {}, field)) problems.push(`${rid}: missing '${field}'`);
    }
    if (seenIds.has(record.id)) problems.push(`duplicate annotation id '${record.id}'`);
    if (seenTargets.has(record.target_id)) {
      problems.push(`duplicate annotation target '${record.target_id}'`);
    }
    seenIds.add(record.id); seenTargets.add(record.target_id);
    for (const field of ['label', 'lay_text', 'expert_text', 'scope', 'render_meaning']) {
      if (!nonEmptyText(record[field])) problems.push(`${rid}: '${field}' must be non-empty text`);
    }
    const claimClass = baseEvidence(record.claim_evidence_class);
    const renderClass = baseEvidence(record.render_evidence_class);
    if (!claimClass) problems.push(`${rid}: invalid claim evidence '${record.claim_evidence_class}'`);
    if (!renderClass) problems.push(`${rid}: invalid render evidence '${record.render_evidence_class}'`);
    if (claimClass && renderClass && EVIDENCE_RANK[renderClass] > EVIDENCE_RANK[claimClass]) {
      problems.push(`${rid}: render evidence is stronger than claim evidence`);
    }
    if (!Array.isArray(record.source_ids) || !record.source_ids.length) {
      problems.push(`${rid}: source_ids must be non-empty`);
    } else {
      for (const sourceId of record.source_ids) {
        if (!referenceIds.has(sourceId)) problems.push(`${rid}: unresolved source '${sourceId}'`);
      }
    }
    if (!Array.isArray(record.not_claimed) || !record.not_claimed.length
        || record.not_claimed.some((value) => !nonEmptyText(value))) {
      problems.push(`${rid}: not_claimed must contain explicit text`);
    }
    const binding = record.binding || {};
    if (binding.kind === 'sarcomere_component') {
      if (!componentIds.has(binding.id)) problems.push(`${rid}: unknown component binding '${binding.id}'`);
    } else if (binding.kind === 'showcase_claim') {
      const claim = claimMap.get(binding.id);
      if (!claim) problems.push(`${rid}: unknown showcase binding '${binding.id}'`);
      else {
        if (!String(claim.decision || '').startsWith('ADMIT')
            && claim.decision !== 'REPLACE_CURRENT') {
          problems.push(`${rid}: binding '${binding.id}' is not admitted`);
        }
        const admittedClaim = baseEvidence(claim.claim_evidence_class);
        const admittedRender = baseEvidence(claim.render_evidence_class);
        if (claimClass && admittedClaim
            && EVIDENCE_RANK[claimClass] > EVIDENCE_RANK[admittedClaim]) {
          problems.push(`${rid}: claim evidence exceeds binding '${binding.id}'`);
        }
        if (renderClass && admittedRender
            && EVIDENCE_RANK[renderClass] > EVIDENCE_RANK[admittedRender]) {
          problems.push(`${rid}: render evidence exceeds binding '${binding.id}'`);
        }
      }
    } else if (binding.kind === 'titin_architecture') {
      if (binding.id !== String(titin.meta?.uniprot || '')) {
        problems.push(`${rid}: titin architecture binding does not match titin.json`);
      }
    } else problems.push(`${rid}: unsupported binding kind '${binding.kind}'`);
  }
  return problems;
}

/** A plain, directly linkable RCSB accession — not a derived multi-entry record. */
const plainPdbId = (sourceId) => (
  sourceId.startsWith('PDB:') && !/[+(]/.test(sourceId) ? sourceId.slice(4) : null
);

export function sourceHref(sourceId, reference) {
  if (reference?.doi) return `https://doi.org/${encodeURI(reference.doi)}`;
  if (sourceId.startsWith('UniProt:')) {
    return `https://www.uniprot.org/uniprotkb/${encodeURIComponent(sourceId.split(':')[1])}/entry`;
  }
  const direct = plainPdbId(sourceId);
  if (direct) return `https://www.rcsb.org/structure/${encodeURIComponent(direct)}`;
  const doiDependency = reference?.depends_on?.find((id) => id.startsWith('10.'));
  if (doiDependency) return `https://doi.org/${encodeURI(doiDependency)}`;
  // A derived Phase-6 measurement depends on deposited entries rather than on a
  // DOI. Following the first of those leaves keeps the citation inspectable; the
  // record's title names every entry the measurement was taken from. Without this
  // route these sources resolved to null and threw the moment any UI cited one.
  const leaf = (reference?.depends_on || []).map(plainPdbId).find(Boolean);
  if (leaf) return `https://www.rcsb.org/structure/${encodeURIComponent(leaf)}`;
  return null;
}

export function shortCitation(reference) {
  if (!reference) return 'Unresolved source';
  const author = String(reference.authors || 'Source').replace(/\s+et al\.$/, ' et al.');
  const year = reference.year ?? 'n.d.';
  const venue = reference.journal ? ` · ${reference.journal}` : '';
  return `${author} (${year})${venue}`;
}

export function resolveSources(references, sourceIds) {
  return sourceIds.map((sourceId) => {
    const reference = references[sourceId];
    if (!reference) throw new Error(`annotation source '${sourceId}' is unresolved`);
    const href = sourceHref(sourceId, reference);
    if (!href) throw new Error(`annotation source '${sourceId}' has no resolved link`);
    return Object.freeze({
      id: sourceId,
      citation: shortCitation(reference),
      href,
      title: reference.title,
    });
  });
}
