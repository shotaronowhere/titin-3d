const CANONICAL_CLASSES = Object.freeze([
  'STRONGLY INFERRED', 'MEASURED', 'MODELED', 'INFERRED', 'SCHEMATIC', 'UNKNOWN',
]);

/** @param {unknown} value */
export function canonicalEvidenceClass(value) {
  const label = String(value || '').trim();
  return CANONICAL_CLASSES.find((candidate) => (
    label === candidate || label.startsWith(`${candidate} `)
  )) || null;
}

/**
 * Resolve the single presentation-owned evidence mapping.
 * @param {any} presentation
 * @param {unknown} evidenceClass
 */
export function evidenceLanguage(presentation, evidenceClass) {
  const canonical = canonicalEvidenceClass(evidenceClass);
  const record = canonical ? presentation?.evidence_language?.classes?.[canonical] : null;
  if (!canonical || !record?.label || !record?.definition) {
    throw new Error(`EvidenceChip: unmapped canonical evidence class '${evidenceClass}'.`);
  }
  return Object.freeze({ canonical, label: record.label, definition: record.definition });
}

/**
 * One component shared by Tour cards and Research headers.
 * @param {Document} ownerDocument
 * @param {{canonical: string, label: string, definition: string}} language
 * @param {{research?: boolean, interactive?: boolean}} options
 */
export function createEvidenceChip(ownerDocument, language, options = {}) {
  const node = ownerDocument.createElement(options.interactive ? 'button' : 'span');
  node.className = 'evidence-chip';
  node.dataset.evidenceClass = language.canonical;
  node.title = language.definition;
  const raw = options.research && language.canonical !== language.label.toUpperCase()
    ? ` · scientific class: ${language.canonical.toLowerCase()}` : '';
  node.textContent = `${language.label}${raw}`;
  return node;
}
