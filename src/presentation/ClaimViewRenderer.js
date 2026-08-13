/** SC-22's only ClaimView DOM boundary. Scientific resolution happens upstream. */

function element(document, name, className = '') {
  const node = document.createElement(name);
  if (className) node.className = className;
  return node;
}

function labelledList(document, headingText, values, className) {
  const section = element(document, 'div', className);
  const heading = element(document, 'h4');
  heading.textContent = headingText;
  const list = element(document, 'ul');
  for (const value of values) {
    const item = element(document, 'li');
    item.textContent = value;
    list.append(item);
  }
  section.append(heading, list);
  return section;
}

/**
 * Render already-resolved plain data. This function performs no lookup,
 * evidence classification, or filtering.
 *
 * @param {any} viewModel
 * @param {Document} document
 * @returns {HTMLElement}
 */
export function renderClaimView(viewModel, document) {
  if (!document?.createElement || !viewModel || typeof viewModel !== 'object') {
    throw new Error('renderClaimView: a view model and document are required.');
  }
  const root = element(document, 'article', 'claim-view');
  const title = element(document, 'h3', 'claim-view-title');
  title.textContent = viewModel.title;
  const plain = element(document, 'p', 'claim-view-plain');
  plain.textContent = viewModel.plain;
  const specialist = element(document, 'details', 'claim-view-specialist');
  const specialistSummary = element(document, 'summary');
  specialistSummary.textContent = 'For specialists';
  const specialistCopy = element(document, 'p');
  specialistCopy.textContent = viewModel.specialist;
  specialist.append(specialistSummary, specialistCopy);

  const fields = element(document, 'dl', 'claim-view-fields');
  for (const field of viewModel.fields || []) {
    const term = element(document, 'dt');
    term.dataset.claimId = field.claimId;
    term.dataset.sourceIds = (field.sourceIds || []).join(' ');
    term.textContent = field.label;
    const status = element(document, 'span', 'claim-field-status');
    status.dataset.evidenceClass = field.evidenceClass;
    if (field.statusKind === 'finding') {
      status.classList.add('finding-status', `finding-${field.evidenceClass}`);
    }
    status.textContent = field.evidenceClass;
    term.append(document.createTextNode(' '), status);
    const value = element(document, 'dd');
    value.dataset.claimId = field.claimId;
    value.dataset.sourceIds = (field.sourceIds || []).join(' ');
    value.textContent = field.value;
    fields.append(term, value);
  }

  root.append(title, plain, specialist, fields);
  if (viewModel.limitations?.length) {
    root.append(labelledList(
      document, 'Limitations', viewModel.limitations, 'claim-view-limitations',
    ));
  }
  if (viewModel.notClaimed?.length) {
    root.append(labelledList(
      document, 'Not claimed', viewModel.notClaimed, 'claim-view-not-claimed',
    ));
  }

  // Citations are deliberately last. The ID/title/citation remain readable with
  // no network; an external link is an enhancement, not the citation record.
  const citations = element(document, 'div', 'claim-view-sources');
  const sourceLabel = element(document, 'h4');
  sourceLabel.textContent = 'Sources';
  citations.append(sourceLabel);
  for (const source of viewModel.sources || []) {
    const row = element(document, 'div', 'claim-view-source');
    const copy = source.href ? element(document, 'a') : element(document, 'span');
    if (source.href) {
      copy.href = source.href;
      copy.target = '_blank';
      copy.rel = 'noopener noreferrer';
    }
    copy.textContent = `${source.title} — ${source.citation}`;
    const offline = element(document, 'span', 'claim-source-id');
    offline.textContent = ` [${source.id}]`;
    row.append(copy, offline);
    citations.append(row);
  }
  root.append(citations);
  return root;
}
