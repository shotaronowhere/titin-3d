/**
 * SC-22 atomic-claim presenter.
 *
 * This module turns one canonical claim-support record into plain display data.
 * It deliberately knows nothing about the DOM. All scientific classifications,
 * claim/source relationships, and contextual copy are resolved here before the
 * result reaches ClaimViewRenderer.
 */

import { baseEvidence, shortCitation, sourceHref } from './AnnotationCatalog.js';

/** @typedef {{id:string, claimId:string, label:string, value:string,
 * evidenceClass:string, statusKind:'evidence'|'finding',
 * sourceIds:ReadonlyArray<string>}} ClaimField */
/** @typedef {{claimId:string, species:string, muscleOrTissue:string|null,
 * preparation:string, locator:string, relationship:string, extractionNote:string}} ClaimSourceSupport */
/** @typedef {{id:string, title:string, citation:string, href:string|null,
 * species:string, muscleOrTissue:string|null, preparation:string, locator:string,
 * relationship:string, extractionNote:string, claimIds:ReadonlyArray<string>,
 * support:ReadonlyArray<ClaimSourceSupport>}} ClaimSource */
/** @typedef {{title:string, plain:string, specialist:string,
 * fields:ReadonlyArray<ClaimField>, limitations:ReadonlyArray<string>,
 * notClaimed:ReadonlyArray<string>, sources:ReadonlyArray<ClaimSource>}} ClaimView */

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function humanize(value) {
  const result = String(value || '').replaceAll('_', ' ').replace(/\s+/g, ' ').trim();
  return result ? result[0].toUpperCase() + result.slice(1) : 'Claim';
}

function uniqueText(...lists) {
  return [...new Set(lists.flat(2).map(text).filter(Boolean))];
}

const FINDING_STATUSES = Object.freeze(new Set(['ESTABLISHED', 'PROPOSED', 'OPEN']));

function findingStatus(value) {
  const status = text(value).toUpperCase();
  if (!FINDING_STATUSES.has(status)) {
    throw new Error(`claimViewModel: unknown expert finding status '${value}'.`);
  }
  return status;
}

function claimSourceIds(claim) {
  return Object.freeze([...new Set((claim?.support || []).map((row) => text(row.source_id))
    .filter(Boolean))]);
}

function claimRegistry(context) {
  const registry = context?.claimSupport;
  if (registry?.schema !== 'titin-claim-support/1' || !Array.isArray(registry.claims)) {
    throw new Error('claimViewModel: context.claimSupport must be a titin-claim-support/1 record.');
  }
  return registry;
}

function presentationRecord(context) {
  return context?.presentationRecord || context?.presentation || null;
}

function contextualClaimIds(claimId, context) {
  const annotationIds = context?.annotation?.claim_support_ids;
  const requested = context?.relatedClaimIds || annotationIds || [claimId];
  if (!Array.isArray(requested) || requested.some((id) => !text(id))) {
    throw new Error('claimViewModel: relatedClaimIds must be an array of claim IDs.');
  }
  const ids = [...new Set([claimId, ...requested])];
  if (annotationIds && (!Array.isArray(annotationIds)
      || ids.some((id) => !annotationIds.includes(id)))) {
    throw new Error(
      `claimViewModel: annotation is not canonically bound to every requested claim (${ids.join(', ')}).`,
    );
  }
  const presentation = presentationRecord(context);
  if (presentation?.target_claim_id && !ids.includes(presentation.target_claim_id)) {
    throw new Error(
      `claimViewModel: presentation record targets '${presentation.target_claim_id}', not '${claimId}'.`,
    );
  }
  return ids;
}

function contextualFields(claims, context) {
  const findings = presentationRecord(context)?.findings || [];
  /** @type {Array<ClaimField>} */
  const fields = [];

  for (const [index, finding] of findings.entries()) {
    if (!text(finding?.text) || !text(finding?.status)) continue;
    fields.push(Object.freeze({
      id: `finding-${index + 1}`,
      claimId: claims[0].id,
      label: `Finding ${index + 1}`,
      value: text(finding.text),
      evidenceClass: findingStatus(finding.status),
      statusKind: 'finding',
      sourceIds: Object.freeze([...(presentationRecord(context)?.source_ids || [])]),
    }));
  }

  // Object/component records often bind several distinct atomic claims. Showing
  // each one as its own row prevents a single object-wide badge from laundering
  // a weaker placement or rendering claim through a stronger structural claim.
  for (const claim of claims) {
    fields.push(Object.freeze({
      id: `claim-${claim.id}`,
      claimId: claim.id,
      label: claims.length === 1 ? 'Scientific claim' : humanize(claim.id),
      value: text(claim.statement),
      evidenceClass: baseEvidence(claim.claim_class) || 'UNKNOWN',
      statusKind: 'evidence',
      sourceIds: claimSourceIds(claim),
    }));
  }

  // The selected object owns exactly one picture. Multiple related claims may
  // classify different scientific propositions differently, but presenting one
  // identical depiction row per class made a single picture look simultaneously
  // SCHEMATIC and MODELED. The primary canonical claim owns the one render row.
  const renderClass = baseEvidence(claims[0].render_class) || 'UNKNOWN';
  fields.push(Object.freeze({
    id: `render-${claims[0].id}`,
    claimId: claims[0].id,
    label: 'Rendered depiction',
    value: 'The picture is classified separately from the scientific statement.',
    evidenceClass: renderClass,
    statusKind: 'evidence',
    sourceIds: claimSourceIds(claims[0]),
  }));
  return Object.freeze(fields);
}

function specialistCopy(claims) {
  const records = claims.map((claim) => (
    `${claim.id} [claim ${baseEvidence(claim.claim_class) || 'UNKNOWN'}; `
      + `render ${baseEvidence(claim.render_class) || 'UNKNOWN'}]`
  )).join('; ');
  const subject = claims[0].subject || {};
  const tissue = text(subject.muscle_or_tissue);
  return `Canonical records: ${records}. Subject: ${text(subject.species) || 'not specified'}`
    + `${tissue ? `; ${tissue}` : ''}; ${text(subject.preparation) || 'preparation not specified'}.`;
}

function contextualSources(claims, references, presentation) {
  /** @type {Map<string, any>} */
  const grouped = new Map();
  for (const claim of claims) {
    for (const row of claim.support || []) {
      const sourceId = text(row.source_id);
      if (!sourceId) continue;
      const reference = references?.[sourceId] || null;
      const subject = row.source_subject || {};
      const support = Object.freeze({
        claimId: claim.id,
        species: text(subject.species) || 'Not specified',
        muscleOrTissue: text(subject.muscle_or_tissue) || null,
        preparation: text(subject.preparation) || 'Not specified',
        locator: text(row.locator) || 'Not specified',
        relationship: text(row.relationship) || 'Not specified',
        extractionNote: text(row.extraction_note) || 'Not specified',
      });
      if (!grouped.has(sourceId)) {
        const href = reference ? sourceHref(sourceId, reference) : null;
        grouped.set(sourceId, {
          id: sourceId,
          title: text(reference?.title) || sourceId,
          citation: reference ? shortCitation(reference) : `Local record · ${sourceId}`,
          href,
          supports: [],
        });
      }
      grouped.get(sourceId).supports.push(support);
    }
  }
  // A chapter or expert card can cite contextual records for its own validated
  // narration/findings in addition to the target claim's atomic support. Preserve
  // those citations, but label them as presentation context instead of inventing
  // a claim-support relationship that the canonical registry does not contain.
  for (const sourceId of presentation?.source_ids || []) {
    if (grouped.has(sourceId)) continue;
    const reference = references?.[sourceId];
    if (!reference) {
      throw new Error(`claimViewModel: presentation source '${sourceId}' is unresolved.`);
    }
    grouped.set(sourceId, {
      id: sourceId,
      title: text(reference.title) || sourceId,
      citation: shortCitation(reference),
      href: sourceHref(sourceId, reference),
      supports: [Object.freeze({
        claimId: claims[0].id,
        species: 'Not specified',
        muscleOrTissue: null,
        preparation: text(reference.method) || 'See citation record',
        locator: text(reference.identifier) || text(reference.doi) || sourceId,
        relationship: 'presentation context',
        extractionNote: text(reference.relevance) || text(reference.used_for)
          || text(reference.caveat) || 'Context declared by the validated presentation record.',
      })],
    });
  }
  return Object.freeze([...grouped.values()].map((source) => {
    const first = source.supports[0];
    return Object.freeze({
      id: source.id,
      title: source.title,
      citation: source.citation,
      href: source.href,
      species: first.species,
      muscleOrTissue: first.muscleOrTissue,
      preparation: first.preparation,
      locator: first.locator,
      relationship: first.relationship,
      extractionNote: first.extractionNote,
      claimIds: Object.freeze([...new Set(source.supports.map((row) => row.claimId))]),
      support: Object.freeze(source.supports),
    });
  }));
}

/**
 * Resolve one canonical claim and its explicitly bound context into a DOM-free
 * display model.
 *
 * @param {string} claimId canonical ID from claim_support.json
 * @param {any} context explicit dependencies and optional annotation/presentation record
 * @returns {ClaimView}
 */
export function claimViewModel(claimId, context) {
  if (!text(claimId)) throw new Error('claimViewModel: claimId must be non-empty text.');
  const registry = claimRegistry(context);
  const ids = contextualClaimIds(claimId, context);
  const byId = new Map(registry.claims.map((claim) => [claim.id, claim]));
  const claims = ids.map((id) => {
    const claim = byId.get(id);
    if (!claim) throw new Error(`claimViewModel: unknown canonical claim '${id}'.`);
    return claim;
  });
  const primary = claims[0];
  const annotation = context?.annotation || null;
  const presentation = presentationRecord(context);
  const title = text(context?.title) || text(annotation?.label)
    || text(presentation?.title) || humanize(primary.id);
  // Annotation and presentation prose can be useful narrative, but it is not a
  // substitute for an atomic claim-support record. ClaimView therefore displays
  // canonical statements and metadata only. The surrounding story may retain its
  // separately validated narration without laundering it through this evidence UI.
  const plain = text(primary.statement);
  const specialist = specialistCopy(claims);
  if (!title || !plain || !specialist) {
    throw new Error(`claimViewModel: claim '${claimId}' cannot produce complete display copy.`);
  }

  return Object.freeze({
    title,
    plain,
    specialist,
    fields: contextualFields(claims, context),
    limitations: Object.freeze(uniqueText(
      claims.map((claim) => claim.limitations || []),
      context?.limitations || [],
    )),
    notClaimed: Object.freeze(uniqueText(
      claims.map((claim) => claim.not_claimed || []),
      annotation?.not_claimed || [],
      presentation?.not_claimed || [],
      context?.notClaimed || [],
    )),
    sources: contextualSources(claims, context?.references || {}, presentation),
  });
}
