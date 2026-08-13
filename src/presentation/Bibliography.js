/**
 * SC-13 bibliography.
 *
 * The registry is already the single source of citations; this only groups and
 * orders it for display. Resolution goes through resolveSources so a record that
 * cannot produce a link fails here exactly as it fails everywhere else, rather
 * than rendering a dead entry in a reference list.
 */
import { resolveSources } from './AnnotationCatalog.js';

/**
 * @param {Record<string, any>} references
 * @param {{citedIds?: Array<string>}} [opts]
 * @returns {Array<{id:string, citation:string, href:string, title:string, cited:boolean}>}
 */
export function createBibliography(references, { citedIds = [] } = {}) {
  const ids = Object.keys(references || {}).sort((a, b) => a.localeCompare(b));
  const cited = new Set(citedIds);
  return resolveSources(references, ids)
    .map((source) => ({ ...source, cited: cited.has(source.id) }))
    // Two records can share a citation — the same authors, year and journal —
    // so the record ID breaks the tie and the order cannot depend on the
    // iteration order of the object the registry arrived in.
    .sort((a, b) => a.citation.localeCompare(b.citation) || a.id.localeCompare(b.id));
}

function descriptorAvailable(descriptor) {
  return Boolean(descriptor && (
    (Array.isArray(descriptor.claimIds) && descriptor.claimIds.length)
    || (Array.isArray(descriptor.sourceRows) && descriptor.sourceRows.length)
    || (Array.isArray(descriptor.sourceIds) && descriptor.sourceIds.length)
  ));
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function supportRowsForClaims(claimSupport, claimIds) {
  const byId = new Map((claimSupport?.claims || []).map((claim) => [claim.id, claim]));
  const rows = [];
  for (const claimId of claimIds || []) {
    const claim = byId.get(claimId);
    if (!claim) throw new Error(`resolveSourceContext: unknown canonical claim '${claimId}'.`);
    for (const support of claim.support || []) rows.push({ ...support, claim_id: claimId });
  }
  return rows;
}

function sourceEntry(references, sourceId, supports, cited = true) {
  const resolved = references?.[sourceId]
    ? resolveSources(references, [sourceId])[0]
    : {
      id: sourceId,
      title: sourceId,
      citation: `Local record · ${sourceId}`,
      href: null,
    };
  const normalized = supports.map((row) => {
    const subject = row.source_subject || {};
    return Object.freeze({
      claimId: text(row.claim_id, 'Registry record'),
      species: text(subject.species, 'Not specified'),
      muscleOrTissue: text(subject.muscle_or_tissue, 'Not specified'),
      preparation: text(subject.preparation, 'Not specified'),
      locator: text(row.locator, text(references?.[sourceId]?.identifier, sourceId)),
      relationship: text(row.relationship, 'Registry metadata'),
      extractionNote: text(
        row.extraction_note,
        text(references?.[sourceId]?.relevance,
          text(references?.[sourceId]?.used_for, text(references?.[sourceId]?.caveat,
            'No claim-specific extraction note is registered for this bibliography record.'))),
      ),
    });
  });
  if (!normalized.length) {
    normalized.push(Object.freeze({
      claimId: 'Registry record',
      species: 'Not specified',
      muscleOrTissue: 'Not specified',
      preparation: text(references?.[sourceId]?.method, 'Not specified'),
      locator: text(references?.[sourceId]?.identifier, sourceId),
      relationship: 'Registry metadata',
      extractionNote: text(references?.[sourceId]?.relevance,
        text(references?.[sourceId]?.used_for, text(references?.[sourceId]?.caveat,
          'No claim-specific extraction note is registered for this bibliography record.'))),
    }));
  }
  return Object.freeze({
    ...resolved,
    cited,
    support: Object.freeze(normalized),
  });
}

function entriesForDescriptor(references, claimSupport, descriptor) {
  const rows = [
    ...supportRowsForClaims(claimSupport, descriptor?.claimIds || []),
    ...(descriptor?.sourceRows || []),
  ];
  for (const sourceId of descriptor?.sourceIds || []) {
    if (!rows.some((row) => row.source_id === sourceId)) rows.push({ source_id: sourceId });
  }
  const grouped = new Map();
  for (const row of rows) {
    const sourceId = text(row.source_id);
    if (!sourceId) throw new Error('resolveSourceContext: contextual source row lacks source_id.');
    if (!grouped.has(sourceId)) grouped.set(sourceId, []);
    grouped.get(sourceId).push(row);
  }
  return [...grouped.entries()]
    .map(([sourceId, supports]) => sourceEntry(references, sourceId, supports))
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

function allSourceEntries(references, claimSupport) {
  const allRows = supportRowsForClaims(
    claimSupport, (claimSupport?.claims || []).map((claim) => claim.id),
  );
  const grouped = new Map();
  for (const row of allRows) {
    if (!grouped.has(row.source_id)) grouped.set(row.source_id, []);
    grouped.get(row.source_id).push(row);
  }
  const ids = new Set([...Object.keys(references || {}), ...grouped.keys()]);
  return [...ids]
    .map((sourceId) => sourceEntry(references, sourceId, grouped.get(sourceId) || [],
      grouped.has(sourceId)))
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

/**
 * Resolve the Sources drawer without consulting DOM or future semantic scenes.
 * Automatic precedence is value -> object/region -> chapter -> all. If a
 * requested context disappears, the same precedence selects the next available
 * context rather than returning an empty result.
 *
 * @param {{references:Record<string, any>, claimSupport:any}} registry
 * @param {{requestedScope?:'auto'|'value'|'object'|'chapter'|'all',
 * selectedValue?:any, selectedObject?:any, currentChapter?:any}} [context]
 */
export function resolveSourceContext(registry, context = {}) {
  const references = registry?.references || {};
  const claimSupport = registry?.claimSupport;
  if (claimSupport?.schema !== 'titin-claim-support/1') {
    throw new Error('resolveSourceContext: a titin-claim-support/1 registry is required.');
  }
  const descriptors = {
    value: context.selectedValue || null,
    object: context.selectedObject || null,
    chapter: context.currentChapter || null,
  };
  const available = Object.freeze({
    value: descriptorAvailable(descriptors.value),
    object: descriptorAvailable(descriptors.object),
    chapter: descriptorAvailable(descriptors.chapter),
    all: true,
  });
  const requested = context.requestedScope || 'auto';
  if (!['auto', 'value', 'object', 'chapter', 'all'].includes(requested)) {
    throw new Error(`resolveSourceContext: unknown requested scope '${requested}'.`);
  }
  const automatic = ['value', 'object', 'chapter'].find((scope) => available[scope]) || 'all';
  const scope = requested === 'all'
    ? 'all'
    : (requested !== 'auto' && available[requested] ? requested : automatic);
  const descriptor = scope === 'all' ? null : descriptors[scope];
  const labels = {
    value: `Sources for this value — ${text(descriptor?.label, 'selected value')}`,
    object: `Sources for this object — ${text(descriptor?.label, 'selected object or region')}`,
    chapter: `Sources for this chapter — ${text(descriptor?.label, 'current chapter')}`,
    all: 'All sources',
  };
  const entries = scope === 'all'
    ? allSourceEntries(references, claimSupport)
    : entriesForDescriptor(references, claimSupport, descriptor);
  if (!entries.length) {
    throw new Error(`resolveSourceContext: '${scope}' resolved to an empty source set.`);
  }
  return Object.freeze({
    requestedScope: requested,
    scope,
    label: labels[scope],
    available,
    entries: Object.freeze(entries),
  });
}
