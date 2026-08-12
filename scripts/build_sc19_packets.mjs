#!/usr/bin/env node
/** Generate/check the five deterministic SC-19 scientific review packets. */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { modelFingerprint } from './build_identity.mjs';
import {
  CHAIN_PARAMETERS, IBAND_ORDER, MechanicalModel, ewlcExtension, wlcExtension,
} from '../src/geometry/MechanicalModel.js';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const OUT = join(ROOT, 'docs/scientific-decisions/SC-19');
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const titin = readJson('data/titin.json');
const sarcomere = readJson('data/sarcomere.json');
const features = readJson('data/titin_sequence_features.json');
const report = readJson('docs/scientific-decisions/SC-19/region-feature-report.json');
const mechanics = readJson('data/mechanical_model.json');
const claims = readJson('data/showcase_claims.json');
const annotations = readJson('data/annotations.json');
const scope = readJson('data/scientific_scope.json');
const structureMeasurements = readJson('data/structure_measurements.json');
const fingerprint = modelFingerprint({ root: ROOT });
const REVIEWER_ROLES = Object.freeze({
  'SD-01': 'Titin sequence annotation and isoform/domain-boundary specialist',
  'SD-02': 'Titin A-band/M-band ultrastructure specialist',
  'SD-03': 'Striated-muscle filament periodicity and structural-biology specialist',
  'SD-04': 'Titin passive-mechanics and single-molecule force-law specialist',
  'SD-05': 'Sarcomere terminal anchoring and titin-binding structural-biology specialist',
});

const fence = (value) => `\`${value}\``;
const table = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');
const header = (id, title, question) => [
  `# ${id} — ${title}`,
  '',
  `- Packet schema: \`titin-scientific-review-packet/1\``,
  `- Decision: \`${id}\``,
  `- Required reviewer role: ${REVIEWER_ROLES[id]}`,
  `- Model fingerprint: \`${fingerprint}\``,
  `- Generated from the repository-controlled records named below; no live service is used by verification.`,
  '',
  '## Bounded question',
  '',
  question,
  '',
].join('\n') + '\n';

function actualChain() {
  const regions = Object.fromEntries(titin.regions.map((row) => [row.id, row]));
  return Object.fromEntries(IBAND_ORDER.map((id) => {
    const row = { ...CHAIN_PARAMETERS[id] };
    if (row.Lc_from_spec) row.Lc_nm = regions[id].extension_model[row.Lc_from_spec];
    return [id, row];
  }));
}

function sensitivityForce(totalNm, modifiers = {}) {
  const chain = actualChain();
  const extension = (id, force) => {
    const base = chain[id];
    const A = base.A_nm * (modifiers.persistenceScale ?? 1);
    const Lc = base.Lc_nm * (modifiers.contourScale ?? 1);
    if (base.law === 'wlc') return wlcExtension(force, A, Lc);
    if (base.law === 'folded_plus_wlc') {
      return base.rigid_nm + wlcExtension(force, A, Lc - base.rigid_nm);
    }
    return ewlcExtension(force, A, Lc, base.K0_pN * (modifiers.pevkK0Scale ?? 1));
  };
  const chainExtension = (force) => IBAND_ORDER.reduce((sum, id) => sum + extension(id, force), 0);
  let lo = 0;
  let hi = 1e4;
  for (let i = 0; i < 400; i += 1) {
    const mid = (lo + hi) / 2;
    if (chainExtension(mid) < totalNm) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function sd01() {
  const rows = report.regions.map((row) => [
    fence(row.region_id),
    `${row.residue_span.start}–${row.residue_span.end}`,
    String(row.declared_domain_counts.Ig_like),
    String(row.contained_domain_counts.Ig_like),
    row.declared_minus_contained.Ig_like == null
      ? 'none' : String(row.declared_minus_contained.Ig_like),
  ]);
  return header('SD-01', 'Sequence construct, N2A definition, and region partition',
    'Which canonical coordinate frame and residue/domain partition should the model consume for Q8WZ42-1, especially across proximal-Ig, UN2A/N2A, PEVK, and distal-Ig?')
    + [
      '## Pinned feature snapshot', '',
      `- Record: \`data/titin_sequence_features.json\``,
      `- UniProt release: \`${features.source.release}\` (${features.source.release_date})`,
      `- Entry/sequence version: ${features.source.entry_version}/${features.source.sequence_version}`,
      `- Full upstream SHA-256: \`${features.source.upstream_sha256}\``,
      `- Coordinate frame: \`${features.source.coordinate_frame}\`; ${features.sequence_length_aa} aa`,
      `- Imported: ${features.features.length} DOMAIN, ${features.alternative_sequences.length} VAR_SEQ, ${features.variants.length} VARIANT, ${features.conflicts.length} CONFLICT rows.`,
      '', '## Region observations', '',
      table(['Region', 'Current residues', 'Current Ig count', 'Contained UniProt Ig', 'Declared − contained'], rows),
      '',
      'The zero/one/16/current-count discrepancy is deliberately presented as an observation:',
      'the current N2A interval declares one Ig-like domain but contains zero pinned Domain features;',
      'the current distal-Ig interval declares 15 but contains 16. This packet recommends neither',
      'moving the boundary nor changing either count.', '',
      '## Alternative definitions to adjudicate', '',
      '- The current model interval `9852–10215`, named N2A.',
      '- Direct containment of canonical UniProt Domain features in the current intervals.',
      '- The literature N2A element spanning multiple Ig domains plus the UN2A unique sequence; PDB 7NIP maps to canonical residues 9504–9544, currently inside `prox_Ig`.',
      '- Any alternative partition the reviewer can bind to exact upstream features and locators.',
      '', '## Required ruling payload', '',
      'Approve one coordinate frame and residue/domain partition, name the exact feature locators,',
      'state whether the current N2A/distal-Ig allocation is retained or changed, and record any',
      'dissent. There is no DEFERRED implementation path for SD-01.', '',
      'Sources: `data/titin.json`, `data/titin_sequence_features.json`,',
      '`docs/scientific-decisions/SC-19/region-feature-report.json`, UniProt Q8WZ42, PDB 7NIP,',
      '`10.1016/j.jmb.2021.166901`.', '',
    ].join('\n');
}

function sd02() {
  const thick = sarcomere.components.find((row) => row.id === 'thick_filament');
  const rows = titin.regions.filter((row) => ['Aband_super', 'kinase', 'Mline'].includes(row.id))
    .map((row) => {
      const span = row.resting_axial_position_nm.X_end - row.resting_axial_position_nm.X_start;
      const declared = row.dimensions_nm.axial_length_X;
      const foldedBudget = 4 * ((row.domain_composition.Ig_like || 0) + (row.domain_composition.Fn3 || 0));
      return [
        fence(row.id), `${row.residue_span.start}–${row.residue_span.end}`,
        `${row.resting_axial_position_nm.X_start}–${row.resting_axial_position_nm.X_end}`,
        span.toFixed(1), declared.toFixed(1), (declared - span).toFixed(1),
        foldedBudget ? `${foldedBudget} (${declared - foldedBudget >= 0 ? '+' : ''}${(declared - foldedBudget).toFixed(1)})` : 'n/a',
      ];
    });
  const kinase = structureMeasurements.entries['1TKI'].chains[0];
  return header('SD-02', 'A-band, kinase, bare-zone, and M-line axial budget',
    'Which A-band super-repeat, kinase, bare-zone, and M-line boundaries are supported, and should the current axial budget remain explicit schematic geometry or be corrected?')
    + [
      '## Every current interval and internal conflict (observations)', '',
      table(['Region', 'Residues', 'Resting X (nm)', 'X-span (nm)', 'Declared length (nm)', 'Declared − span (nm)', '4 nm/domain budget; declared − budget (nm)'], rows),
      '',
      `- Thick filament length: ${thick.dimensions_nm.length_X} nm; head-free interval: ${thick.dimensions_nm.bare_zone_center} nm.`,
      `- The current A-band record conflicts internally: its X interval spans 620 nm while its declared axial length is 595 nm.`,
      `- Its 179 folded Ig/Fn3 domains imply a 716 nm fully axial 4 nm/domain comparison budget, 121 nm above the declared 595 nm. This is an anomaly signal, not a claim that all domains form a straight chain.`,
      `- PDB 1TKI maps residues ${kinase.unp_start_aligned}–${kinase.unp_end_aligned}; that construct begins 6 residues before and ends 60 residues after the current 32178–32432 interval. Its measured longest extent is ${kinase.extent_long_nm.toFixed(2)} nm and N-to-C distance is ${kinase.n_to_c_nm.toFixed(2)} nm, versus the model's 30 nm kinase interval.`,
      `- The ten M-line Ig domains provide a 40 nm folded-domain comparison budget inside the model's 150 nm interval; the remaining 110 nm has no resolved molecular-path allocation.`,
      '- The M-band marker has zero adopted width in the retained rendering and is not the 160 nm bare zone.',
      '- Caremani et al. Fig. 7A/C places 49 myosin-head layers around the head-free zone and labels C1–C11; Table 1 and Figs. 4–7 separate the 43.1 nm H and 45.5 nm L periodicities.',
      '- Tonino et al. Fig. 8 places the bare-zone edge 77 nm from M1 and reports the last C-zone super-repeat ending about 33 nm before that edge in mouse myocardium.',
      '- Every conflicting length and boundary must be resolved together; this packet deliberately chooses none.',
      '', '## Reviewer ruling checklist', '',
      '- State which X boundaries and which declared axial lengths survive, with species/preparation and exact figure/table for each.',
      '- State whether the 4 nm/domain comparisons are admissible only as anomaly signals or constrain a corrected budget.',
      '- State how the isolated kinase extent and the unresolved remainder of the M-line interval may be depicted.',
      '- If deferred, supply exact public caveat text and a schematic representation that chooses no disputed boundary.',
      '', 'Sources: `data/titin.json`, `data/sarcomere.json`, `data/geometry_sources.json`,',
      '`data/geometry_strategy.json`, `data/structure_measurements.json`, `10.1016/j.jmb.2020.06.025` Figs. 1–6,',
      '`10.1085/jgp.202012713` Figs. 4–7 and Table 1, `10.1016/j.yjmcc.2019.05.026` Figs. 1–4, Fig. 8, and Table 1,',
      '`10.1083/jcb.134.6.1441` Figs. 1–8, PDB 1TKI, PDB 4JNW, and `10.1038/embor.2010.65` Figs. 1–2/PDB 3KNB.', '',
    ].join('\n');
}

function sd03() {
  return header('SD-03', 'A-band reported axial quantities and register',
    'What scientifically supported names, evidence classes, and relationships apply to the sequence repeat, each reported axial quantity, the myosin repeat, and any molecular-span/register hypothesis?')
    + [
      '## Side-by-side source observations — no cross-row identity is pre-assigned', '',
      table(['Record/source', 'Reported observation', 'Species/preparation', 'Exact locator'], [
        ['UniProt Q8WZ42 + Bennett et al.', 'Sequence pattern: 11 domains per C-zone super-repeat; this is a count, not an axial length', 'Human reference sequence; nomenclature compared with rabbit-psoas antibody map', 'UniProt DOMAIN features; Bennett Fig. 1 and Supplementary Table 1'],
        ['Bennett et al. `10.1016/j.jmb.2020.06.025`', 'Mean axial domain repeat 3.98 nm (95% CI 3.92–4.03); corresponding 11-domain interval 43.1–44.3 nm', 'Isolated fixed rabbit-psoas skeletal myofibrils; super-resolution antibody localization', 'Figs. 2–6 and Results; summarized explicitly in Caremani Discussion'],
        ['Tonino et al. `10.1016/j.yjmcc.2019.05.026`', 'A40–A41 to A165: 496.5 nm; inferred average axial domain spacing 3.94–4.04 nm; A165 to cMyBP-C stripe 1: 58 nm', 'Skinned WT/TtnΔC1–2 mouse papillary myocardium; IEM and SIM', 'Figs. 1–4, Fig. 8, Table 1, Discussion'],
        ['Caremani et al. `10.1085/jgp.202012713`', 'H periodicity 43.1 nm and purely axial L periodicity about 45.5 nm; 14.3 nm is the third-order crown spacing', 'Relaxed rabbit-psoas demembranated fibers and resting mouse EDL intact muscle; x-ray diffraction/interference', 'Figs. 4–7 and Table 1; Discussion “Origin of the L periodicity”'],
        ['Current model', '45.5 nm displayed as `titin_super_repeat_nm`; 43.1 nm as thick-filament repeat; 14.3 nm as crown spacing', 'Mixed source contexts above; tissue construct is pending', '`data/titin.json#/regions/5/repeating_geometry` and `data/sarcomere.json#/components/2/repeating_geometry`'],
      ]),
      '',
      'Possible interpretations to adjudicate, not observations: an 11-domain chain span; an x-ray density periodicity;',
      'a myosin-crown repeat; or a specific titin–myosin/cMyBP-C register. Similar magnitudes do not establish identity.', '',
      '## Required ruling payload', '',
      'Name each quantity, species, preparation, figure/table, evidence class, permitted comparison, and',
      'forbidden inference. If deferred, provide exact caveat and a representation that chooses no register.', '',
      'Sources: `data/titin.json`, `data/sarcomere.json`, `data/geometry_sources.json`,',
      '`10.1016/j.yjmcc.2019.05.026` Figs. 1–4/Fig. 8/Table 1, `10.1016/j.jmb.2020.06.025` Figs. 1–6/Supplementary Table 1,',
      'and `10.1085/jgp.202012713` Figs. 4–7/Table 1.', '',
    ].join('\n');
}

function sd04() {
  const model = new MechanicalModel(titin);
  const thick = sarcomere.reference_lengths_nm.half_thick;
  const zHalf = sarcomere.reference_lengths_nm.zdisc_width / 2;
  const outputs = [1900, 2000, 2200, 2400, 3000].map((sl) => {
    const total = sl / 2 - thick - zHalf;
    const solved = model.partition(total);
    return [String(sl), total.toFixed(1), solved.force_pN.toFixed(4),
      Object.entries(solved.extension_nm).map(([id, value]) => `${id} ${value.toFixed(2)}`).join('; ')];
  });
  const parameters = Object.entries(CHAIN_PARAMETERS).map(([id, row]) => [
    fence(id), row.law, row.A_nm == null ? '—' : String(row.A_nm),
    row.K0_pN == null ? '—' : String(row.K0_pN),
    row.Lc_nm == null ? `titin.json:${row.Lc_from_spec}` : String(row.Lc_nm), row.source,
  ]);
  const lengths = [1900, 2000, 2200, 2400, 3000];
  const scenarios = [
    ['baseline', {}],
    ['all persistence lengths −20%', { persistenceScale: 0.8 }],
    ['all persistence lengths +20%', { persistenceScale: 1.2 }],
    ['PEVK stretch modulus −20%', { pevkK0Scale: 0.8 }],
    ['PEVK stretch modulus +20%', { pevkK0Scale: 1.2 }],
    ['all contour lengths −5%', { contourScale: 0.95 }],
    ['all contour lengths +5%', { contourScale: 1.05 }],
  ];
  const sensitivity = scenarios.map(([name, modifiers]) => [name, ...lengths.map((sl) => {
    const total = sl / 2 - thick - zHalf;
    return sensitivityForce(total, modifiers).toFixed(4);
  })]);
  const validity = mechanics.source_validation.map((row) => [
    row.quantity, row.reported_pN == null ? '—' : String(row.reported_pN),
    row.model_pN == null ? '—' : String(row.model_pN),
    row.quantity.startsWith('poly-Ig')
      ? '`10.1073/pnas.95.14.8052` Discussion (poly-Ig comparison and cited ref. 20)'
      : '`10.1073/pnas.95.14.8052` Figs. 2–5, Methods Eqs. 1–2, Results/Discussion',
  ]);
  return header('SD-04', 'Force law, parameter transfers, and supported range',
    'Which force laws, parameters, transfers, validity range, uncertainty treatment, slack regime, and unfolding limit support public passive-force outputs?')
    + [
      '## Current parameter/law inventory', '',
      table(['Region', 'Law', 'A (nm)', 'K0 (pN)', 'Contour source/value (nm)', 'Current source'], parameters),
      '',
      `Temperature: ${mechanics.physics?.temperature_K ?? 300} K. No fitted parameters: ${mechanics.no_fitted_parameters}`,
      `Scope transfer: ${scope.mechanics.display_label}.`,
      '', '## Current outputs at the five named lengths (not approved)', '',
      table(['SL (nm)', 'I-band chain span (nm)', 'Force (pN)', 'Regional extension (nm)'], outputs),
      '',
      'These numbers reproduce the current implementation for review. They are not approved outputs.',
      '', '## Deterministic engineering sensitivity probe (force in pN)', '',
      table(['Scenario', ...lengths.map((sl) => `${sl} nm`)], sensitivity),
      '',
      'This probe varies declared inputs independently around the current parameter set. It is not a confidence',
      'interval, probability distribution, fitted uncertainty, or covariance analysis. The contour perturbation is',
      'especially consequential and is included to expose that dependence, not to endorse ±5% as biological uncertainty.',
      '', '## Source validity statements', '',
      table(['Check', 'Source-reported pN', 'Current model pN', 'Exact source locator'], validity),
      '',
      '- Linke et al. Figs. 2–5 and Discussion support rat-psoas PEVK fits; the paper states pure entropic behavior below about 12 pN or below 60% relative extension.',
      '- The current 3000 nm output is 10.3588 pN with PEVK at 57.97% of contour, near that source boundary; 3000 nm is an extended reference, not the declared 2000–2400 nm working range.',
      '- Poly-Ig WLC fitting is described to about 35 pN in the cited source chain; this does not validate human construct transfer.',
      '', '## Explicit omissions and consequences', '',
      table(['Omission', 'Current implementation', 'Consequence for public use'], [
        ['Slack/buckling/contact regime', 'No explicit slack length, compression, filament contact, or hysteresis state; the series law is solved immediately above its geometric floor', 'Very-short-length behavior is a model extrapolation, not a measured zero-force plateau'],
        ['Ig/N2A unfolding transitions', 'Folded domains remain folded; WLC chains approach their contour asymptotically; no stochastic unfolding/refolding transition exists', 'Do not interpret high-force behavior as domain-unfolding mechanics'],
        ['Parameter uncertainty/covariance', 'No uncertainty distribution or covariance matrix; the table above is one-at-a-time engineering sensitivity only', 'No confidence interval or probabilistic force claim is available'],
        ['Species/preparation transfer', 'Rat-psoas PEVK/poly-Ig parameters and recombinant-human N2A values are combined in a Q8WZ42-1 reference-sequence model', 'Displayed pN values remain MODELED and SD-04 PENDING'],
      ]),
      '', '## Required ruling payload', '',
      'Approve, replace, or defer each law/parameter/transfer; set a supported SL/force/extension range; state the',
      'slack and unfolding treatment; and define an uncertainty method or exact public caveat. No current number',
      'becomes release-approved merely because it reproduces the implementation.', '',
      'Sources: `data/mechanical_model.json`, `data/titin.json`, `data/structural_states.json`,',
      '`src/geometry/MechanicalModel.js`, `scripts/mechanical_model.py`, `10.1073/pnas.95.14.8052`,',
      '`10.3389/fphys.2020.00173` Figs. 1–6.', '',
    ].join('\n');
}

function sd05() {
  const ids = new Set(['zdisc_local_network', 'zdisc_alpha_actinin_doublets',
    'zdisc_telethonin_sandwich', 'mband_midpoint_and_crosslinks', 'mband_m1_density']);
  const rows = claims.objects.filter((row) => ids.has(row.id)).map((row) => [
    fence(row.id), row.claim, row.claim_evidence_class, row.render_evidence_class,
    row.not_claimed.join('; '),
  ]);
  const annotationRows = annotations.components.filter((row) => (
    ['zdisc', 'alpha_actinin', 'telethonin', 'mline', 'mband_crosslinks'].includes(row.target_id)
  )).map((row) => `${row.label}: ${row.render_meaning}`);
  return header('SD-05', 'Terminal anchoring, stoichiometry, and depiction semantics',
    'What Z-disc/M-line anchoring language, telethonin/alpha-actinin emphasis, representative-titin stoichiometry, and depiction semantics are supported?')
    + [
      '## Current claims and render', '',
      table(['Claim ID', 'Current claim', 'Claim class', 'Render class', 'Not claimed'], rows),
      '', 'Current render meanings:', '', ...annotationRows.map((row) => `- ${row}`), '',
      '## Exact anchoring and stoichiometry source inventory', '',
      table(['Question', 'Observation available to reviewer', 'Species/preparation', 'Exact locator', 'Unresolved limit'], [
        ['Telethonin topology', 'Two antiparallel titin Z1Z2 fragments form a 2:1 complex with one telethonin molecule', 'Recombinant human complex; crystallography', '`10.1038/nature04343` Fig. 1; PDB 1YA5 biological assembly', 'Does not establish the complete in-situ lateral route or that telethonin alone bears all tension'],
        ['α-Actinin/Z-disc network', 'Fast-psoas thin-form Z-disc contains heterogeneous α-actinin crosslink pairs including ~6 nm doublets', 'Native mouse fast-psoas myofibrils; cryo-ET', '`10.1016/j.cell.2021.02.047` Figs. 1–4 and Z-disc Results', 'Not a universal lattice, activation state, or exact human register'],
        ['M-band relationships', 'Titin C-termini and thick filaments participate in a heterogeneous M-band network', 'Mouse-psoas cryo-ET plus rat-psoas/bovine-sternomandibularis immunolocalization', '`10.1016/j.cell.2021.02.047` M-band Results; `10.1083/jcb.134.6.1441` Figs. 1–8', 'Individual crosslink identities/coordinates are unresolved'],
        ['Titin M10–OBSL1 topology', 'Isolated head-to-tail Ig-domain complex', 'Recombinant human proteins; crystallography', '`10.1038/embor.2010.65` Figs. 1–2; PDB 3KNB', 'Does not resolve the complete in-situ M-band network'],
        ['Whole-path titin copy number', 'No approved source in the current inventory establishes the copy count/azimuth for this construct', 'None admitted', 'No approved locator', 'The render therefore shows one representative sequence path; it makes no stoichiometry claim'],
      ]),
      '', '## Reviewer checks', '',
      '- Separate telethonin Z1Z2 topology from a claim that telethonin alone anchors all titin tension.',
      '- Approve or revise the alpha-actinin/Z-repeat wording against the exact source observations above.',
      '- Approve representative-molecule wording and rules that prevent unresolved attachments from being drawn as known.',
      '- If deferred, supply exact unknown/not-claimed wording and a depiction rule that implies no unresolved mechanism.',
      '', 'Sources: `data/titin.json`, `data/sarcomere.json`, `data/showcase_claims.json`,',
      '`data/annotations.json`, PDB 1YA5, PDB 3KNB, `10.1038/nature04343`,',
      '`10.1016/j.cell.2021.02.047`, `10.1083/jcb.134.6.1441`, `10.1038/embor.2010.65`.', '',
    ].join('\n');
}

const files = new Map([
  ['SD-01.md', sd01()], ['SD-02.md', sd02()], ['SD-03.md', sd03()],
  ['SD-04.md', sd04()], ['SD-05.md', sd05()],
]);
const check = process.argv.includes('--check');
const decisionLedger = readJson('data/scientific_decisions.json').decisions || {};
const adjudicated = [...files.keys()].every((name) => (
  decisionLedger[name.slice(0, 5)]?.status !== 'PENDING'
));

// These packets are the pre-adjudication evidence consumed by SC-20.  Once all
// five decisions are final, comparing them with text generated from the
// post-decision model would demand that the evidence rewrite itself.  Verify
// their immutable decision-ledger hashes instead, and refuse destructive
// regeneration.  A later scientific cycle must use a new packet directory.
if (adjudicated) {
  if (!check) {
    throw new Error('SC-19 evidence packets are frozen by adjudicated SD-01–SD-05');
  }
  const frozenProblems = [];
  for (const name of files.keys()) {
    const decisionId = name.slice(0, 5);
    const relative = `docs/scientific-decisions/SC-19/${name}`;
    const packet = (decisionLedger[decisionId]?.evidence_packet || [])
      .find((row) => row.path === relative);
    const path = join(OUT, name);
    const actual = existsSync(path)
      ? createHash('sha256').update(readFileSync(path)).digest('hex')
      : null;
    if (!packet || actual !== packet.sha256) frozenProblems.push(`${name} failed its decision-ledger digest`);
  }
  if (frozenProblems.length) {
    console.error(`Frozen SC-19 packet verification failed:\n  - ${frozenProblems.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`frozen SC-19 evidence packets are intact (${files.size}, decision-ledger SHA-256)`);
  process.exit(0);
}

const problems = [];
if (!check) mkdirSync(OUT, { recursive: true });
for (const [name, content] of files) {
  const text = content.endsWith('\n') ? content : `${content}\n`;
  const path = join(OUT, name);
  if (check) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) problems.push(`${name} is stale`);
  } else writeFileSync(path, text);
}
if (problems.length) {
  console.error(`SC-19 packets are stale:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`${check ? 'SC-19 packets are current' : 'wrote SC-19 packets'} (${files.size}, model ${fingerprint.slice(0, 12)})`);
