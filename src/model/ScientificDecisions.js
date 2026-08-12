/** Pure SC-20 decision-ledger normalization for runtime and presentation use. */

const IDS = Object.freeze(['SD-01', 'SD-02', 'SD-03', 'SD-04', 'SD-05']);
const STATUSES = new Set(['PENDING', 'APPROVED', 'DEFERRED']);

function cloneFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneFreeze(child)]),
    ));
  }
  return value;
}

export function decisionLedger(spec) {
  const record = spec?.scientificDecisions || spec;
  if (record?.schema !== 'titin-scientific-decisions/2') {
    throw new Error('scientific_decisions.json must use titin-scientific-decisions/2');
  }
  const rows = IDS.map((id) => {
    const row = record.decisions?.[id];
    if (!row || !STATUSES.has(row.status)) {
      throw new Error(`scientific_decisions.json is missing a valid ${id} status`);
    }
    return Object.freeze({
      id,
      status: row.status,
      question: String(row.question || ''),
      requiredReviewerRole: String(row.required_reviewer_role || ''),
      adjudicationType: String(row.adjudicator?.type || ''),
      independentlyHumanReviewed: row.independent_human_review_status === 'COMPLETED',
    });
  });
  const counts = Object.freeze(Object.fromEntries(
    [...STATUSES].map((status) => [status, rows.filter((row) => row.status === status).length]),
  ));
  return Object.freeze({
    sprintStatus: String(record.sprint_status || ''),
    rows: Object.freeze(rows),
    counts,
    reviewPolicy: cloneFreeze(record.review_policy),
    badgeText: rows.map((row) => `${row.id} ${row.status.toLowerCase()}`).join(' · '),
    summaryText: `${counts.PENDING} pending · ${counts.APPROVED} approved · ${counts.DEFERRED} deferred`,
    raw: cloneFreeze(record),
  });
}
