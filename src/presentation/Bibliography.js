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
