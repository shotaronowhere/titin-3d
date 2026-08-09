# Showcase Pre-Review Remediation Implementation Plan

> **SUPERSEDED — DO NOT EXECUTE.** On 2026-08-09 this plan was replaced by
> [`2026-08-09-titin-mvp-readiness-synthesis.md`](./2026-08-09-titin-mvp-readiness-synthesis.md).
> It is retained as historical analysis. In particular, its 22-domain example is an unapproved
> density inference, not an implementation value, and its mobile/control and evidence-routing
> dispositions do not meet the revised MVP requirements.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the thirteen findings in `SHOWCASE_PREREVIEW_FINDINGS.md`, and in each case also close the gate that let the finding through, so the same class of defect cannot ship again.

**Architecture:** Four sprints, ordered by what blocks them rather than by severity. SC-18 fixes what a visitor sees and repairs an accessibility gate that currently records a PASS the artifact does not earn. SC-19 makes the scientific record corroborate itself and makes the force model auditable *from the page*, which is what turns the critical finding from a thing an expert had to reverse-engineer into a thing a reader can check. SC-20 closes the two comprehension holes in the guided copy. SC-21 changes the science itself and is **blocked on a named specialist's ruling** — it is written so that it can be executed the day that ruling arrives, and so that SC-19's gates make it impossible to execute halfway.

**Dependencies between sprints:** SC-18, SC-19 and SC-20 are **mutually independent** and may be run in any order, or by different people. They touch disjoint parts of the template — CSS and the control loops; the Measure tab; the guided copy and the Inspect tab — and disjoint records. Only two orderings are load-bearing:

- **Task 19.1 before Task 19.2**, because 19.2's gate is written against a record 19.1 makes self-consistent.
- **SC-19 before SC-21**, because 19.2's contour gate is what stops SC-21's domain-count change from landing half-applied.

**Tech Stack:** Vanilla ES modules, Three.js r0.185.1, esbuild (standalone bundling), `node --test`, TypeScript in `checkJs` mode, Python 3.12 validators.

## Global Constraints

Every task's requirements implicitly include this section. Read it once, completely, before Sprint SC-18.

1. **Node 20.19+ and Python 3.12+.** Install with `npm ci` and `.venv/bin/python -m pip install -r requirements.txt`.
2. **Always run tests serially:** `node --test --test-concurrency=1 <files>`. The default parallel run has frozen this machine. As of SC-17 the `test` script itself carries the flag, so `npm test` and `npm run verify` are safe; a hand-typed bare `node --test` is not.
3. **`src/**/*.js` must pass `npm run typecheck`** (TypeScript `strict: true`, `checkJs: true`, JSDoc types). `src/index.template.html` is **not** typechecked — logic belongs in modules, the template gets wiring.
4. **The standalone bundle has a hardcoded binding list.** If the page module in `src/index.template.html` imports a *new* name, add it in **three** places in `scripts/build_standalone.mjs`: the `ENTRY` re-export block, the destructuring string, and the returned object literal. Miss one and the standalone page throws `X is not defined` **at runtime with no gate catching it**. Task 19.4 is the only task in this plan that adds an import.
5. **Rebuild and commit the artifact.** After any change to `src/`, `data/`, or `src/index.template.html`: `npm run build`, confirm `npm run check:build` prints `index.html is current`, and commit the regenerated `index.html` in the same commit.
6. **Size ceiling: 2,599,633 bytes for `index.html`** (baseline 2,166,361 × 1.20), enforced by `test/showcase_phase8.test.js`, which reads both factors from `data/release_gates.json` → `performance.baseline`. Nothing in this plan should move it; check with `ls -l index.html`.
7. **The evidence contract is inviolable.** Colour encodes identity; **opacity encodes confidence**; selection and emphasis are separate channels. `test/showcase_phase8.test.js` asserts region highlighting leaves opacity untouched.
8. **Every new visible claim needs metadata:** evidence class, source IDs resolvable in `data/references.json`, and an explicit `not_claimed` list. Reuse existing records rather than inventing new ones. `data/showcase_claims.json` is **byte-pinned** — `validate_showcase_claims.py` pins the payload digest, `scope_lock`, `visual_grammar`, `attention_budget` and the `admission_decisions` set, and `neg_control_showcase_claims.py` proves the pin. **No task in this plan edits it.**
9. **Accessibility gates:** no positive `tabindex`; every control is a real `<button>` or labelled `<input>`; `@media (pointer: coarse)` keeps a 44 px minimum. Any new colour that carries text must be added to `data/release_gates.json` → `accessibility.contrast_pairs` **and** appear literally (same lowercase hex) in `src/index.template.html`.
10. **Do not change the URL hash schema.** `URL_KEYS` in `src/presentation/StoryController.js` is closed and `test/presentation.test.js` asserts exact hash strings.
11. **Do not add a guided chapter.** `test/presentation.test.js` and `test/showcase_phase7.test.js` assert the exact list of seven chapter IDs. SC-20 works entirely inside those seven.
12. **The guided prose gates, exactly** (`scripts/validate_presentation.py:169-180`): each `lay_summary` is **25–45 words**, **2–3 sentences**, longest sentence **≤30 words**. `tour_pacing` is 160 words/minute + 5 s per chapter, gated to **110–190 s**. The route is currently 230 words / 121.2 s; the seven chapters at their 45-word cap would be 315 words / 153.1 s, so there is real headroom — but every rewrite must be counted, not estimated.
13. **The build fingerprint covers twelve `data/*.json` files** (`scripts/build_fingerprint.mjs`). `data/references.json`, `data/titin.json`, `data/presentation.json`, `data/structural_states.json` and `data/mechanical_model.json` are all inputs; `data/release_gates.json` is not. Any task touching a fingerprint input makes the release pack stale.
14. **Order at the end of every sprint: `npm run build` → `npm run pack` → `npm run verify`.** `verify` chains `check:pack`, which fails closed. The pack also goes stale on artifact *size* alone, because `release/MANIFEST.json` records it.
15. **Commit after every task**, with the regenerated `index.html` where applicable.

---

## Findings coverage

Every finding in `SHOWCASE_PREREVIEW_FINDINGS.md` maps to exactly one task.

| Finding | Severity | Task |
|---|---|---|
| 1 — `dist_Ig` declares 15 Ig domains | CRITICAL | 21.1 |
| 2 — A-band axial budget ~100 nm short | MAJOR | 21.2 |
| 3 — `Aband_super` states 595 and 620 | MAJOR | 19.1 |
| 4 — consistency validator covers I-band only | MAJOR | 19.1 |
| 5 — force-model DOI absent from the registry | MAJOR | 19.3 |
| 6 — 45.5 nm super-repeat vs its citation | MAJOR | 21.3 |
| 7 — bibliography links at 1.84:1 under a PASS gate | MAJOR | 18.1 |
| 8 — selected extension row is near-black on dark | MAJOR | 18.1 |
| 9 — `titin_story` ships as a button label | MINOR | 18.2 |
| 10 — narrow-viewport control clipping | MINOR | 18.3 |
| 11 — model parameters not auditable from the page | MINOR | 19.4 |
| 12 — copy defects (five) | MINOR | 20.4 |
| 13 — Ig persistence length, residue rise, slack length | MINOR | 21.4 |
| Comprehension: "sarcomere" undefined | — | 20.1 |
| Comprehension: "titin is not the motor" buried | — | 20.2 |
| Vocabulary never expanded | — | 20.3 |
| Interaction: the stretch sweep teaches nothing from a chapter camera | — | 20.5 |

Finding 12 carries five copy defects and they are split: the Fn3-over-an-I-band-frame
error is Task 20.3 (it is fixed by the same rewrite that expands the vocabulary); the
anchors chapter, its evidence tag and the silent length override are Task 20.4; and the
PEVK card's unreconcilable "31 repeats" is Task 19.4 Step 6, because what makes it
unreconcilable is that the contour it must be read against is not on the card.

The lay review's four remaining **interaction observations** — dead component toggles,
three names for one drawer, the pinned card covering its own subject, and chapters 6 and 7
framing the model as a hairline — are declined here with reasons. See *What this plan does
NOT do*.

---

## File Structure

**New files**

| File | Responsibility |
|---|---|
| `src/presentation/ChainParameters.js` | Pure. Joins `CHAIN_PARAMETERS` (the force law's constants) to `titin.json`'s per-region spans into display rows. No DOM. |
| `scripts/validate_citations.py` | Every DOI referenced anywhere in `data/` resolves in `data/references.json`. |
| `scripts/audit_domain_density.py` | Report-only. Residues per declared domain for every tandem-repeat region; the artifact a specialist rules on in SC-21. |
| `test/showcase_phase18.test.js` … `test/showcase_phase21.test.js` | One gate file per sprint. |

**Modified files**

| File | Change |
|---|---|
| `src/index.template.html` | Link colour rule; selected-row foreground; control labels from records; narrow-viewport view row; the parameter table's wiring; the glossary. |
| `src/render/Viewer.js` | `short` labels on `VIEWS` and `CLOSEUPS`. |
| `src/api/TitinVisualization.js` | `chainParameters()` accessor. |
| `scripts/build_standalone.mjs` | Bundle binding list — Task 19.4 only (Global Constraint 4). |
| `scripts/validate_geometry.py` | Region self-consistency across **all** regions; contour tied to declared domain count. |
| `scripts/validate_presentation.py` | Glossary record validation (Task 20.3). |
| `scripts/neg_control_phase6_spec.py` | Mutations proving the two new geometry gates fail closed. |
| `data/titin.json` | `Aband_super.axial_length_X` (19.1); the science changes (SC-21). |
| `data/references.json` | The force model's primary source (19.3). |
| `data/presentation.json` | Chapter copy (SC-20); the glossary (20.3). |
| `data/release_gates.json` | The link contrast pair; the sprint invariants. |
| `package.json` | `test:sc18` … `verify:sc21`; `validate:citations`. |
| `README.md`, `PROGRESS.md` | Status, at the end of SC-21 only. |

---

# Sprint SC-18 — What a visitor sees, and the gate that missed it

**Why:** Finding 7 is the most serious thing in the review that is not about titin. `data/release_gates.json` records `accessibility.contrast` as **PASS** — "WCAG AA text and control contrast" — while 46 bibliography links ship at the browser default `#0000ee` on `#161b22`, a ratio of **1.84:1**. The gate did not lie; it checked the colours the record *declares*, and an element with no colour rule declares nothing. For a project whose thesis is that records cannot drift from the artifact, a record asserting a property the artifact does not have is the first thing to fix.

**Done when:** no anchor in the shipped page resolves to a browser default; the selected extension row is readable; no control label is a spec identifier; every stage control is reachable at 375 px; and `accessibility.contrast` is PASS because it is true.

### Task 18.1: The links nobody styled, and the row that hid its own label

**Files:**
- Modify: `src/index.template.html` (the link colour rule ~`:242`; `.extension-row.on` ~`:335`)
- Modify: `data/release_gates.json` (`accessibility.contrast_pairs`)
- Test: `test/showcase_phase18.test.js` (create)

**Interfaces:**
- Produces: nothing consumed by later tasks.
- Consumes: nothing.

- [ ] **Step 1: Add the sprint scripts**

In `package.json`, after `verify:sc17`:

```json
"test:sc18": "node --test --test-concurrency=1 test/showcase_phase18.test.js test/showcase_phase8.test.js test/showcase_phase12.test.js test/standalone.test.js",
"verify:sc18": "npm run check:build && npm run typecheck && npm run test:sc18 && npm run validate:gates",
```

- [ ] **Step 2: Write the failing test**

Create `test/showcase_phase18.test.js`:

```js
/** SC-18 gates: what a visitor sees, and the checks that missed it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const gates = JSON.parse(
  readFileSync(new URL('../data/release_gates.json', import.meta.url), 'utf8'),
);

test('SC18: every container that builds a link states its colour', () => {
  // The defect was an ABSENT rule, not a wrong one, so the gate counts the
  // containers that create links and requires each to be named in the rule.
  // A new link container fails here rather than shipping at the UA default.
  const sites = [...page.matchAll(/createElement\('a'\)/g)].length;
  assert.equal(sites, 4,
    `${sites} link containers exist; add the new one to the link colour rule and to this list`);
  const rule = page.match(/([^{}]*\ba\b[^{}]*)\{\s*color: #a9c9f2/);
  assert.ok(rule, 'the link colour rule must exist');
  for (const container of ['.object-sources a', '#chapterSources a', '#bibliography a']) {
    assert.ok(rule[1].includes(container),
      `${container} is not covered by the link colour rule`);
  }
});

test('SC18: the link colour is a declared contrast pair', () => {
  const declared = gates.accessibility.contrast_pairs
    .map((pair) => pair.foreground.toLowerCase());
  assert.ok(declared.includes('#a9c9f2'),
    'the colour every citation link uses was never declared, so the contrast gate never saw it');
});

test('SC18: a translucent selected control does not inherit the solid-button foreground', () => {
  // button.on sets color: #0e1116 for solid accent buttons. .extension-row.on
  // replaces the background with a 13% wash and kept that foreground, which put
  // near-black text on a dark card and hid PEVK — the word chapter 3 teaches.
  assert.match(page, /\.extension-row\.on \{[\s\S]{0,400}color: var\(--text\)/,
    '.extension-row.on must state its own foreground');
});
```

- [ ] **Step 3: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase18.test.js
```

Expected: all three fail — the rule omits `#bibliography a`, `#a9c9f2` is undeclared, and `.extension-row.on` sets no colour.

- [ ] **Step 4: Style every link container**

Replace the rule at `src/index.template.html:242`:

```css
  /* SC-18. Every container that builds a link, in one rule. #bibliography was
     absent, so its 46 links shipped at the browser default #0000ee on #161b22 —
     1.84:1 — under an accessibility gate recorded as PASS. The gate was not
     wrong; it checks the colours the record declares, and an element with no
     rule declares nothing. */
  .object-sources a, #chapterSources a, #bibliography a {
    color: #a9c9f2; text-decoration: underline; text-underline-offset: 2px; }
```

- [ ] **Step 5: Give the selected row its own foreground**

Replace `src/index.template.html:335`:

```css
  .extension-row.on { background: rgb(255 93 125 / 13%); box-shadow: inset 2px 0 var(--titin);
    /* button.on sets color: #0e1116, which is right for a solid accent fill and
       invisible over a 13% wash on a dark card. The row carries selection with
       the inset bar and the wash; the text stays readable. */
    color: var(--text); }
```

- [ ] **Step 6: Declare the link pair**

In `data/release_gates.json` → `accessibility.contrast_pairs`, append:

```json
{
  "id": "source_link",
  "foreground": "#a9c9f2",
  "background": "#161b22",
  "role": "citation and bibliography links in the Evidence drawer",
  "min_ratio": 4.5
}
```

- [ ] **Step 7: Run the tests and the validators**

```sh
node --test --test-concurrency=1 test/showcase_phase18.test.js test/showcase_phase8.test.js
npm run validate:gates
```

All must pass. `validate_release_gates.py` independently requires `#a9c9f2` to appear literally in `src/index.template.html`, which step 4 satisfies.

- [ ] **Step 8: Prove it in a browser, because the defect was invisible to static analysis**

```sh
npm run build
```

Open the built `index.html` over `file://`, open Evidence → Sources & build, and run:

```js
[...document.querySelectorAll('a')]
  .map((a) => getComputedStyle(a).color)
  .filter((c) => c === 'rgb(0, 0, 238)').length
```

Expected: `0`. Then set a chapter-3 state, and confirm the selected extension row's label is legible:

```js
getComputedStyle(document.querySelector('.extension-row.on .extension-name')).color
```

Expected: `rgb(230, 235, 241)`, not `rgb(14, 17, 22)`.

- [ ] **Step 9: Commit**

```sh
git add -A && git commit -m "SC-18: style every link container and the row that hid its own label"
```

### Task 18.2: Control labels come from the record, not from the key

**Files:**
- Modify: `src/render/Viewer.js` (`VIEWS` ~`:21-31`, `CLOSEUPS`)
- Modify: `src/index.template.html` (the view button loop ~`:2005`, the close-up loop ~`:2031`)
- Test: `test/showcase_phase18.test.js` (extend)

**Interfaces:**
- Produces: `VIEWS[key].short` and `CLOSEUPS[key].short` — short human labels, no underscores, ≤20 characters. Consumed by nothing else in this plan, but the gate below requires every entry to have one.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase18.test.js`:

```js
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';

test('SC18: no spec identifier ships as a control label', () => {
  // The VIEW bar read `longitudinal · titin_story · side · transverse · oblique`.
  // A snake_case key among four English words is the most obviously unfinished
  // thing on the page, and the human label already existed — as the tooltip.
  for (const [key, view] of Object.entries(VIEWS)) {
    assert.ok(view.short, `view '${key}' needs a short label`);
    assert.doesNotMatch(view.short, /_/, `view '${key}' short label is an identifier`);
    assert.ok(view.short.length <= 20,
      `view '${key}' short label is ${view.short.length} characters; the stage bar has room for 20`);
  }
  for (const [key, closeup] of Object.entries(CLOSEUPS)) {
    assert.ok(closeup.short, `close-up '${key}' needs a short label`);
    assert.doesNotMatch(closeup.short, /_/, `close-up '${key}' short label is an identifier`);
    assert.ok(closeup.short.length <= 20, `close-up '${key}' short label is too long`);
  }
  assert.ok(!/b\.textContent = k;/.test(page),
    'a spec key must never be a button label');
  assert.match(page, /b\.textContent = v\.short;/);
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase18.test.js
```

Expected: FAIL — `view 'longitudinal' needs a short label`.

- [ ] **Step 3: Add the short labels**

In `src/render/Viewer.js`, add a `short` to every `VIEWS` entry, keeping `label` as the tooltip:

```js
export const VIEWS = Object.freeze({
  longitudinal: { dir: [0.15, 0.35, 1], label: 'Longitudinal (default)', short: 'longitudinal' },
  titin_story: {
    dir: [0.12, 0.25, 1],
    label: 'Titin route — Z-disc to M-band',
    short: 'titin route',
    focus: 'titin_half',
  },
  side: { dir: [0, 0, 1], label: 'Side — the sarcomere banding pattern', short: 'side' },
  transverse: { dir: [1, 0, 0], label: 'Transverse — down the filament axis', short: 'transverse' },
  oblique: { dir: [0.7, 0.5, 0.7], label: 'Oblique — 3-D lattice organization', short: 'oblique' },
});
```

Then add a `short` to every `CLOSEUPS` entry in the same file. Read the existing keys and `label` fields first and derive each short from the label, not from the key — for the seven current close-ups that is: `crowns` → `myosin crowns`, `twist` → `actin twist`, `junction` → `I/A junction`, `zdisc` → `Z-disc`, `mline` → `M-band`, `czone` → `C-zone`, `lattice` → `lattice`. If a key exists that is not in that list, give it a short label from its own `label` field.

- [ ] **Step 4: Render the short label**

In `src/index.template.html`, in the view loop (`:2007`) and the close-up loop (`:2033`), replace `b.textContent = k;` with:

```js
  b.textContent = v.short;
```

Both loops already destructure `[k, v]` and already set `b.title` from the long label, so the tooltip is unchanged. Those two are the **only** occurrences of `b.textContent = k;` in the file — the scale, component and region loops use different patterns, and the region buttons are deliberately left alone because `PEVK` and `N2A` are the domain's own vocabulary, not internal identifiers.

**Be surgical on the view loop.** Line 2007 is three statements on one line:

```js
  b.textContent = k; b.title = v.label; b.dataset.view = k;
```

`b.dataset.view` must keep the **key** — it is the state value the camera preset and the URL are built from. Replacing every `k` on that line breaks the view controls silently.

- [ ] **Step 5: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase18.test.js test/presentation.test.js test/showcase_phase2.test.js
npm run typecheck
```

No test currently asserts a view or close-up button's *text* — `test/showcase_phase2.test.js:270` asserts `VIEWS.titin_story.focus` and `test/presentation.test.js:18` uses `Object.keys(CLOSEUPS)`, neither of which this task touches. If one does fail on a label, it is asserting the defect; update it and note the change in the commit message.

- [ ] **Step 6: Build and commit**

```sh
npm run build && npm run check:build
git add -A && git commit -m "SC-18: label controls from the record, not from the spec key"
```

### Task 18.3: Every stage control reachable at 375 px

**Files:**
- Modify: `src/index.template.html` (the `@media (max-width: 767px)` block ~`:427-475`)
- Test: `test/showcase_phase18.test.js` (extend)

- [ ] **Step 1: Reproduce the defect and measure it**

Build, open the standalone over `file://`, **reload at 375 × 812** (resizing after load leaves a stale flex layout and will mislead you), and run:

```js
(() => {
  const row = document.querySelector('.stage-row-secondary');
  const views = document.getElementById('views');
  const last = views.lastElementChild;
  return JSON.stringify({
    viewport: window.innerWidth,
    rowScroll: [row.scrollWidth, row.clientWidth],
    viewsScroll: [views.scrollWidth, views.clientWidth],
    lastRight: Math.round(last.getBoundingClientRect().right),
    overflowX: getComputedStyle(views).overflowX,
  });
})()
```

Record the numbers in the commit message. The reported defect is that the last view button's right edge exceeds the viewport while the row it sits in reports no scrollable overflow, so it can never be reached.

- [ ] **Step 2: Write the failing test**

Append to `test/showcase_phase18.test.js`:

```js
test('SC18: every stage control strip scrolls on a narrow stage', () => {
  // The preset strip was given its own scroll container in SC-12; the view
  // strip was not, so at 375 px its last button hung off the edge in a row
  // that could not be scrolled to it.
  const narrow = page.match(/@media \(max-width: 767px\) \{([\s\S]*?)\n  \}/);
  assert.ok(narrow, 'the narrow-stage media query must exist');
  for (const strip of ['#presets', '#views']) {
    assert.match(narrow[1], new RegExp(`${strip}[^{]*\\{[^}]*overflow-x: auto`),
      `${strip} must be independently scrollable at 375 px`);
  }
});
```

- [ ] **Step 3: Give the view strip the treatment the preset strip already has**

Inside the `@media (max-width: 767px)` block, beside the existing `.stage-row-primary .stage-presets` rule, add:

```css
    /* SC-18. The preset strip got its own scroll container in SC-12 and the
       view strip did not, so at 375 px the last view button hung 19 px off the
       edge of a row whose overflow was visible — unreachable rather than merely
       cropped. Same treatment, same reason. */
    .stage-row-secondary #presets, .stage-row-secondary #views,
    .stage-row-primary .stage-presets, #views {
      overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; }
    #views::-webkit-scrollbar { display: none; }
```

- [ ] **Step 4: Verify in the browser at the size, not by resizing to it**

Rebuild, reload at 375 × 812, and re-run the Step 1 measurement. Acceptance: `viewsScroll[0] > viewsScroll[1]` (the strip genuinely scrolls) and every button reachable by scrolling the strip. Then confirm the 44 px coarse-pointer minimum still holds:

```js
[...document.querySelectorAll('#views button, #presets button')]
  .map((b) => Math.round(b.getBoundingClientRect().height))
```

Expected: every entry `44`.

- [ ] **Step 5: Say that a strip scrolls**

Finding 10's second part: the preset strip does scroll, but at 375 px it shows a
sliced "R" of the preset the app is *currently in* with nothing indicating three
more exist. Add a right-edge fade to any scrollable strip, inside the same media
query:

```css
    /* A strip that scrolls with no edge treatment reads as a strip that is
       broken. The mask fades the overflowing edge instead of adding a control,
       because the bar has no room for one. */
    .stage-row-primary .stage-presets, #views {
      -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 18px), transparent);
      mask-image: linear-gradient(to right, #000 calc(100% - 18px), transparent); }
```

Verify at 375 px that the fade appears only when the strip overflows — a strip
narrower than its container must not fade its last button. If it does, gate the
mask behind a class the page sets when `scrollWidth > clientWidth`.

- [ ] **Step 6: Measure the reported label collision before deciding anything about it**

Finding 10's third part is a collision between the scale-bar caption and the
`N · Z-disc anchor` label over the model at 375 px. Both are drawn into
`#scienceOverlay`, and SC-12 already built a label budget for exactly this class
of problem (`labelBudget` in `src/presentation/StageLayout.js`). Reload at
375 × 812 and run:

```js
(() => {
  const boxes = [...document.querySelectorAll('#scienceOverlay text')]
    .map((t) => ({ text: t.textContent, box: t.getBoundingClientRect() }));
  const hits = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i].box; const b = boxes[j].box;
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
        hits.push([boxes[i].text, boxes[j].text]);
      }
    }
  }
  return JSON.stringify({ labels: boxes.length, collisions: hits });
})()
```

If `collisions` is non-empty, the scale-bar caption is not participating in the
label budget; add it to the budget's input set in `StageLayout.js` rather than
nudging a coordinate, and gate the fix with a unit test on `labelBudget`. If
`collisions` is empty, record in the commit message that it did not reproduce at
this build and leave the overlay alone — the review saw it on the SC-17 build and
SC-18's other changes may have moved it.

- [ ] **Step 7: Run the tests, build, commit**

```sh
node --test --test-concurrency=1 test/showcase_phase18.test.js test/showcase_phase12.test.js test/showcase_phase11.test.js
npm run build && npm run check:build
git add -A && git commit -m "SC-18: make the view strip reachable on a narrow stage"
```

### Task 18.4: Record the sprint's invariants and regenerate

**Files:**
- Modify: `data/release_gates.json` (`automated.checks`)
- Regenerate: `index.html`, `release/`

- [ ] **Step 1: Append the invariants**

To `data/release_gates.json` → `automated.checks`:

```json
{
  "id": "every_link_container_declares_its_colour",
  "requirement": "every container that builds a link is named in the link colour rule, and that colour is a declared contrast pair, so no anchor can ship at a browser default",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase18.test.js; scripts/validate_release_gates.py"
},
{
  "id": "no_identifier_as_control_label",
  "requirement": "no view or close-up control is labelled with its spec key; every one declares a short human label",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase18.test.js"
},
{
  "id": "narrow_stage_strips_scroll",
  "requirement": "every stage control strip is independently scrollable at 375 px, so no control is unreachable",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase18.test.js"
}
```

- [ ] **Step 2: Build, pack, verify**

```sh
npm run build
npm run pack
npm run verify
```

The order is load-bearing (Global Constraint 14). Every step must pass.

- [ ] **Step 3: Commit**

```sh
git add -A && git commit -m "SC-18: record the sprint's three invariants and regenerate the pack"
```

---

# Sprint SC-19 — The record must corroborate itself

**Why:** Three findings share one cause. `Aband_super` states its own axial length twice, 25 nm apart, and survived because `validate_geometry.py`'s consistency loop covers the four I-band regions only — a check written for exactly this failure, scoped to half the regions. The whole force model cites a DOI that is not among the 46 bibliography records. And the chain parameters that produce every force number on screen are nowhere on screen, so the reviewer who found the critical error had to recover them by fitting the model's outputs at four sarcomere lengths. This sprint makes the record check itself and makes the model auditable by a reader.

**Done when:** every region's two length fields agree and a validator says so; every contour equals its declared domain count times its unit length; every DOI in `data/` resolves in the registry; and the Measure tab shows the parameter table.

### Task 19.1: Reconcile the A-band length and widen the consistency gate

**Files:**
- Modify: `data/titin.json` (`regions[Aband_super].dimensions_nm.axial_length_X`)
- Modify: `scripts/validate_geometry.py:1169-1184`
- Modify: `scripts/neg_control_phase6_spec.py`
- Test: `test/showcase_phase19.test.js` (create)

**Interfaces:**
- Produces: the invariant `dimensions_nm.axial_length_X == resting_axial_position_nm.axial_length_nm` for **every** region in `data/titin.json`. Task 21.2 depends on it: changing one field without the other becomes a failing build.

**This task changes a number in the scientific record.** It is included here rather than in SC-21 because it moves no geometry: `axial_length_X` for `Aband_super` is read by no source file — only by the validator — while the renderer uses `resting_axial_position_nm`. Setting the stale field to what actually renders makes the record agree with the artifact. Whether 620 is the *right* number is finding 2, which is Task 21.2.

- [ ] **Step 1: Add the sprint scripts**

```json
"test:sc19": "node --test --test-concurrency=1 test/showcase_phase19.test.js test/phase8.test.js test/standalone.test.js",
"verify:sc19": "npm run check:build && npm run typecheck && npm run test:sc19 && npm run validate && npm run validate:spec && npm run validate:citations",
```

- [ ] **Step 2: Write the failing test**

Create `test/showcase_phase19.test.js`:

```js
/** SC-19 gates: the record corroborates itself, and the model is auditable. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const titin = JSON.parse(readFileSync(new URL('../data/titin.json', import.meta.url), 'utf8'));

test('SC19: every region states one axial length, not two', () => {
  // Aband_super said 595.0 in dimensions_nm and 620.0 in resting_axial_position_nm.
  // validate_geometry.py checks exactly this — for the four I-band regions only,
  // which is why the fifth could disagree with itself indefinitely.
  for (const region of titin.regions) {
    const declared = region.dimensions_nm.axial_length_X;
    const spanned = region.resting_axial_position_nm.axial_length_nm;
    assert.ok(Math.abs(declared - spanned) < 0.05,
      `${region.id}: axial_length_X ${declared} vs resting span ${spanned}`);
  }
});
```

- [ ] **Step 3: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase19.test.js
```

Expected: FAIL — `Aband_super: axial_length_X 595 vs resting span 620`.

- [ ] **Step 4: Reconcile the record**

In `data/titin.json`, `regions[Aband_super].dimensions_nm.axial_length_X`: `595.0` → `620.0`.

- [ ] **Step 5: Widen the validator to every region**

In `scripts/validate_geometry.py`, replace the loop at `:1174-1184` with:

```python
# SC-19: EVERY region, not only the I-band four. The original loop's own comment
# says a spec whose two files disagree about the same quantity is worse than one
# that is merely wrong — and it was scoped to four of the eight regions, which is
# how Aband_super carried 595.0 and 620.0 for the same length.
for _rid in [_r["id"] for _r in _T8["regions"]]:
    _r = _by8[_rid]
    _a = _r["dimensions_nm"]["axial_length_X"]
    _b = _r["resting_axial_position_nm"]["axial_length_nm"]
    check(abs(_a - _b) < 0.05,
          "titin.json %s axial_length_X (%.1f) agrees with its own resting span (%.1f)"
          % (_rid, _a, _b))
# The I-band four additionally have to agree with the structural-states partition.
for _rid in _IB8:
    _r = _by8[_rid]
    _a = _r["dimensions_nm"]["axial_length_X"]
    _c = _rest8[_rid]
    check(abs(_a - _c) < 0.05,
          "titin.json %s axial_length_X (%.1f) agrees with structural_states resting "
          "partition (%.1f)" % (_rid, _a, _c))
```

- [ ] **Step 6: Prove the gate fails closed**

In `scripts/neg_control_phase6_spec.py`, add a mutation alongside the existing ones that sets `Aband_super`'s `axial_length_X` to `595.0` and asserts `validate_geometry.py` reports a failure. Follow the file's existing mutation idiom exactly.

- [ ] **Step 7: Run everything this touches**

```sh
node --test --test-concurrency=1 test/showcase_phase19.test.js
npm run validate && npm run validate:spec
python3 scripts/neg_control_phase6_spec.py
```

- [ ] **Step 8: Commit**

```sh
git add -A && git commit -m "SC-19: one region, one axial length — and a gate that covers all eight"
```

### Task 19.2: Tie the contour to the declared domain count

**Files:**
- Modify: `scripts/validate_geometry.py`
- Modify: `scripts/neg_control_phase6_spec.py`
- Test: `test/showcase_phase19.test.js` (extend)

**Why this task exists and why it is here:** `scripts/mechanical_model.py:129` reads each region's contour from `extension_model.max_end2end_nm`, a field *separate* from `repeating_geometry.n_units`. Today they agree — `prox_Ig` 77 × 4.0 = 308, `dist_Ig` 15 × 4.0 = 60 — but nothing enforces it. Task 21.1 changes a domain count; without this gate, changing the count and forgetting the contour would leave the force model silently solving the old chain. This gate makes that half-fix impossible, and it passes on today's data, so it can land now rather than waiting on the specialist.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase19.test.js`:

```js
test('SC19: a repeat region\'s contour equals its declared domain count', () => {
  // scripts/mechanical_model.py reads the contour from extension_model, and the
  // domain count from repeating_geometry — two fields that must not drift, because
  // the force law is solved over the contour while the page displays the count.
  let checked = 0;
  for (const region of titin.regions) {
    const repeat = region.repeating_geometry || {};
    const extension = region.extension_model || {};
    if (!(repeat.n_units && repeat.unit_axial_nm && extension.max_end2end_nm)) continue;
    checked += 1;
    const implied = repeat.n_units * repeat.unit_axial_nm;
    assert.ok(Math.abs(extension.max_end2end_nm - implied) < 0.05,
      `${region.id}: contour ${extension.max_end2end_nm} nm vs ${repeat.n_units} units `
      + `x ${repeat.unit_axial_nm} nm = ${implied} nm`);
    const domains = (region.domain_composition.Ig_like || 0) + (region.domain_composition.Fn3 || 0);
    assert.equal(repeat.n_units, domains,
      `${region.id}: n_units ${repeat.n_units} vs declared domain count ${domains}`);
  }
  assert.ok(checked >= 2, `expected at least the two tandem Ig regions, checked ${checked}`);
});
```

- [ ] **Step 2: Run it**

```sh
node --test --test-concurrency=1 test/showcase_phase19.test.js
```

Expected: PASS. This gate is written to hold on today's data — its job is to constrain Task 21.1. Confirm it genuinely runs by checking `checked` is at least 2; if the assertion count is 0 the `continue` guard is wrong.

- [ ] **Step 3: Mirror it in the Python validator**

In `scripts/validate_geometry.py`, after the loop from Task 19.1:

```python
# SC-19: the contour the force law integrates and the domain count the page
# displays are separate fields. Task 21.1 changes a count; this makes changing
# it without the contour a build failure rather than a silent half-fix.
for _rid in [_r["id"] for _r in _T8["regions"]]:
    _r = _by8[_rid]
    _rep = _r.get("repeating_geometry") or {}
    _ext = _r.get("extension_model") or {}
    if not (_rep.get("n_units") and _rep.get("unit_axial_nm") and _ext.get("max_end2end_nm")):
        continue
    _implied = _rep["n_units"] * _rep["unit_axial_nm"]
    check(abs(_ext["max_end2end_nm"] - _implied) < 0.05,
          "titin.json %s contour (%.1f nm) equals n_units x unit_axial_nm (%.1f nm)"
          % (_rid, _ext["max_end2end_nm"], _implied))
    _dom = _r["domain_composition"].get("Ig_like", 0) + _r["domain_composition"].get("Fn3", 0)
    check(_rep["n_units"] == _dom,
          "titin.json %s n_units (%d) equals its declared domain count (%d)"
          % (_rid, _rep["n_units"], _dom))
```

- [ ] **Step 4: Prove it fails closed**

Add a mutation to `scripts/neg_control_phase6_spec.py` that changes `dist_Ig`'s `domain_composition.Ig_like` to `22` **without** touching `n_units` or the contour, and asserts `validate_geometry.py` fails. That mutation is a rehearsal of Task 21.1's failure mode.

- [ ] **Step 5: Run and commit**

```sh
npm run validate && python3 scripts/neg_control_phase6_spec.py
node --test --test-concurrency=1 test/showcase_phase19.test.js
git add -A && git commit -m "SC-19: bind the contour to the domain count so a count change cannot half-land"
```

### Task 19.3: Close the citation registry

**Files:**
- Create: `scripts/validate_citations.py`
- Modify: `data/references.json`
- Modify: `package.json` (`validate:citations`, and add it to `verify`)
- Test: `test/showcase_phase19.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase19.test.js`:

```js
import { readdirSync } from 'node:fs';

test('SC19: every DOI the data cites resolves in the registry', () => {
  const dataDir = new URL('../data/', import.meta.url);
  const registry = JSON.parse(readFileSync(new URL('references.json', dataDir), 'utf8'));
  const known = new Set(JSON.stringify(registry).match(/10\.\d{4,9}\/[^\s"'),;]+/g) || []);
  const missing = new Map();
  for (const file of readdirSync(dataDir).filter((name) => name.endsWith('.json'))) {
    if (file === 'references.json') continue;
    const text = readFileSync(new URL(file, dataDir), 'utf8');
    for (const raw of text.match(/10\.\d{4,9}\/[^\s"'),;]+/g) || []) {
      // A DOI at the end of a sentence carries the full stop into the match.
      const doi = raw.replace(/[.,;]+$/, '');
      if (!known.has(doi)) missing.set(doi, file);
    }
  }
  assert.deepEqual([...missing], [],
    'a DOI cited by the data is not a citable record: '
    + [...missing].map(([doi, file]) => `${doi} (${file})`).join(', '));
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase19.test.js
```

Expected: FAIL naming exactly one DOI — `10.1073/pnas.95.14.8052`, cited nine times in `data/mechanical_model.json` and nine times in `data/structural_states.json`. That count was measured against the current data while writing this plan: the registry holds 33 distinct DOIs (the other 13 of its 46 records are PDB, UniProt and similar identifiers), and this is the only cited DOI absent from it. **If the test names more than one, the data has moved since this plan was written — record the full list and add every one of them.**

- [ ] **Step 3: Add the missing record or records**

For each DOI the test names, resolve it at `https://doi.org/<doi>` and add a record to `data/references.json` in the file's existing shape. For the force model's source that is Linke et al. 1998, *PNAS* 95(14):8052–8057, "Nature of PEVK-titin elasticity in skeletal muscle" — **verify this against doi.org before writing it**; a bibliography entry that is wrong is worse than one that is missing.

Match the existing record shape exactly (`doi`, `authors`, `year`, `title`, `journal`, `identifier`), and follow whatever `scripts/validate_spec.py` requires of a reference record.

- [ ] **Step 4: Add the Python validator and wire it in**

Create `scripts/validate_citations.py` implementing the same rule as Step 1 (scan every `data/*.json` except `references.json` for `10.\d{4,9}/…`, require membership in the registry), printing one PASS/FAIL line per DOI and exiting non-zero on any miss. Follow the print idiom of `scripts/validate_presentation.py`.

Add to `package.json`:

```json
"validate:citations": "python3 scripts/validate_citations.py",
```

and insert `&& npm run validate:citations` into the `verify` chain immediately after `npm run validate:spec`.

- [ ] **Step 5: Cite it where the number is**

In `src/index.template.html`, the Measure tab's passive-force block currently reads *"One force, shared by the four I-band regions in series, solved from sourced force-extension laws with no fitted parameters."* Extend that `.sub` to name the source, rendering the citation through the existing `sourceLine` helper so the link is resolved from the registry rather than typed. The force readout's own source must be one click from the force readout.

- [ ] **Step 6: Run everything**

```sh
node --test --test-concurrency=1 test/showcase_phase19.test.js
npm run validate:citations && npm run validate:spec && npm run validate
npm run build && npm run check:build
```

Note: `data/references.json` is a fingerprint input, so the pack is now stale. It is regenerated in Task 19.5.

- [ ] **Step 7: Commit**

```sh
git add -A && git commit -m "SC-19: put the force model's source in the bibliography, and gate every DOI"
```

### Task 19.4: Make the model auditable from the page

**Files:**
- Create: `src/presentation/ChainParameters.js`
- Modify: `src/api/TitinVisualization.js`
- Modify: `src/index.template.html` (Measure tab)
- Modify: `scripts/build_standalone.mjs` (**three** places — Global Constraint 4)
- Test: `test/showcase_phase19.test.js` (extend)

**Interfaces:**
- Produces: `chainParameterRows(model)` → `Array<{region: string, law: string, contour_nm: number, persistence_nm: number, stretch_modulus_pN: number|null, units: number|null, unit_axial_nm: number|null, residues: number, residues_per_unit: number|null, source: string}>`, ordered Z-disc → thick-filament tip.
- Produces: `TitinVisualization.prototype.chainParameters()` → the same array.
- Consumes: `CHAIN_PARAMETERS` from `src/geometry/MechanicalModel.js` (already exported) and `model.spec.titin`.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase19.test.js`:

```js
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { chainParameterRows } from '../src/presentation/ChainParameters.js';
import { CHAIN_PARAMETERS } from '../src/geometry/MechanicalModel.js';

const model = await TitinModel.create(nodeReader());

test('SC19: every parameter the force law uses is displayable, with its source', () => {
  const rows = chainParameterRows(model);
  assert.deepEqual(rows.map((row) => row.region),
    ['prox_Ig', 'N2A', 'PEVK', 'dist_Ig'],
    'the table is ordered Z-disc to thick-filament tip, like the chain');
  for (const row of rows) {
    const declared = CHAIN_PARAMETERS[row.region];
    assert.equal(row.law, declared.law);
    assert.equal(row.persistence_nm, declared.A_nm);
    assert.ok(row.contour_nm > 0, `${row.region} has no contour`);
    assert.ok(row.source.trim(), `${row.region} states no source`);
    assert.ok(row.residues > 0, `${row.region} has no residue span`);
  }
  // The reviewer had to recover these by fitting four sarcomere lengths. The
  // residues-per-unit column is the specific number that exposed finding 1.
  const distal = rows.find((row) => row.region === 'dist_Ig');
  assert.ok(distal.residues_per_unit > 0);
});

test('SC19: the page renders the parameter table rather than restating numbers', () => {
  assert.match(page, /chainParameters\(\)/);
  assert.match(page, /id="chainParameters"/);
  // Not one parameter value may be typed into the template.
  assert.ok(!/21\.0 nm|persistence length of 21/.test(page),
    'the parameter values must arrive from the record at render time');
});
```

(`page` is already defined at the top of the file from Task 19.1's header; if not, add the same `readFileSync` of `src/index.template.html` used in `test/showcase_phase18.test.js`.)

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase19.test.js
```

Expected: FAIL — `Cannot find module '../src/presentation/ChainParameters.js'`.

- [ ] **Step 3: Write the module**

Create `src/presentation/ChainParameters.js`:

```js
/**
 * The force model's chain parameters, arranged for display.
 *
 * The passive-force readout is the most quantitative claim the page makes, and
 * until SC-19 none of the parameters behind it were on screen: an expert
 * reviewing the model had to recover them by fitting its outputs at four
 * sarcomere lengths. That is how a wrong domain count survived — the number
 * that exposed it, residues per declared domain, was computable only from the
 * spec and never displayed.
 *
 * Nothing here is a constant. `CHAIN_PARAMETERS` owns the sourced law
 * constants; `titin.json` owns the spans and counts; this module joins them.
 */
import { CHAIN_PARAMETERS } from '../geometry/MechanicalModel.js';

/** Z-disc -> thick-filament tip, the order the chain is in. */
const ORDER = ['prox_Ig', 'N2A', 'PEVK', 'dist_Ig'];

/**
 * @param {{spec: {titin: {regions: any[]}}}} model
 * @returns {{region: string, law: string, contour_nm: number, persistence_nm: number,
 *   stretch_modulus_pN: number|null, units: number|null, unit_axial_nm: number|null,
 *   residues: number, residues_per_unit: number|null, source: string}[]}
 */
export function chainParameterRows(model) {
  const byId = new Map(model.spec.titin.regions.map((region) => [region.id, region]));
  return ORDER.map((id) => {
    const declared = CHAIN_PARAMETERS[id];
    if (!declared) throw new Error(`chainParameterRows: no chain parameters for '${id}'`);
    const region = byId.get(id);
    if (!region) throw new Error(`chainParameterRows: titin.json has no region '${id}'`);
    const repeat = region.repeating_geometry || {};
    const units = repeat.n_units || null;
    const residues = region.residue_span.length_aa;
    return {
      region: id,
      law: declared.law,
      // Lc_from_spec is how the law reaches the record rather than restating it.
      contour_nm: declared.Lc_nm ?? region.extension_model[declared.Lc_from_spec],
      persistence_nm: declared.A_nm,
      stretch_modulus_pN: declared.K0_pN ?? null,
      units,
      unit_axial_nm: repeat.unit_axial_nm || null,
      residues,
      residues_per_unit: units ? Number((residues / units).toFixed(1)) : null,
      source: declared.source,
    };
  });
}
```

- [ ] **Step 4: Add the accessor**

In `src/api/TitinVisualization.js`, beside `forceCurve()`:

```js
  /**
   * The force model's parameters, for the Measure tab's audit table.
   * @returns {ReturnType<typeof chainParameterRows>}
   */
  chainParameters() { return chainParameterRows(this.model); }
```

with the matching import at the top of the file.

- [ ] **Step 5: Render the table**

In `src/index.template.html`, in the Measure tab after the `#forceCurve` block:

```html
      <h2>Model parameters</h2>
      <div class="sub" style="margin:0 0 6px">Every constant the force law uses,
        with the record it came from. Nothing here is typed into the page.</div>
      <table id="chainParameters"></table>
```

and a render function called from the same place `renderForceCurve()` is called, building one row per entry of `visualization.chainParameters()` with columns: region, law, contour, persistence length, stretch modulus, units × unit length, residues, residues per unit, source. Render the source through the existing `sourceLine` helper where the string is a resolvable DOI.

- [ ] **Step 6: Put the contour on the region card that contradicts it**

Finding 12's fifth item: the PEVK region card says "31 PEVK repeats", and a reader
who multiplies 31 repeats × ~28 residues × 0.38 nm gets ≈ 330 nm and concludes
PEVK is near contour at long sarcomere lengths. The engine uses 542.1 nm. Neither
number is wrong; they are simply never shown together, so the card invites an
arithmetic a reader cannot complete.

In the region card's specialist disclosure, render the region's own
`extension_model.max_end2end_nm` beside the repeat count, from the record. Add to
`test/showcase_phase19.test.js`:

```js
test('SC19: a region that states a repeat count also states its contour', () => {
  // "31 PEVK repeats" against a 542.1 nm contour is unreconcilable by a reader
  // unless both are on the card.
  assert.match(page, /max_end2end_nm/,
    'the region card must show the contour the force law actually integrates');
});
```

- [ ] **Step 7: Add the bundle bindings — all three places**

In `scripts/build_standalone.mjs` add `chainParameterRows` to the `ENTRY` re-export block, the destructuring string, and the returned object literal. **Miss one and the standalone throws at runtime with no gate catching it.**

If the page module reaches the rows only through `visualization.chainParameters()` and never imports `chainParameterRows` directly, no binding is needed — confirm which is true before editing, and prefer the accessor.

- [ ] **Step 8: Run the tests and typecheck**

```sh
node --test --test-concurrency=1 test/showcase_phase19.test.js test/standalone.test.js
npm run typecheck
npm run build && npm run check:build
```

- [ ] **Step 9: Verify in the browser, over `file://`**

Open the built page, Evidence → Measure, and confirm the table renders four rows with non-empty sources. This also proves the bundle binding list is complete, which no gate does.

- [ ] **Step 10: Commit**

```sh
git add -A && git commit -m "SC-19: show the force model's parameters, with their sources"
```

### Task 19.5: The domain-density audit, and regenerate

**Files:**
- Create: `scripts/audit_domain_density.py`
- Modify: `data/release_gates.json` (`automated.checks`)
- Regenerate: `index.html`, `release/`

**Why report-only:** this script computes the number that exposed finding 1 — residues per declared domain. Turning it into a gate requires deciding the acceptable band, and for `dist_Ig` that decision *is* finding 1, which belongs to a specialist. So SC-19 ships the audit and SC-21 promotes it. Written this way it is also the artifact the specialist rules on.

- [ ] **Step 1: Write the script**

Create `scripts/audit_domain_density.py`:

```python
#!/usr/bin/env python3
"""Residues per declared domain, for every tandem-repeat region.

REPORT ONLY. This prints the number that exposed the SC-19 review's critical
finding and does not fail: the acceptable band for a tandem Ig array is a
scientific judgement, and recording one is a reviewer's decision, not a
script's. SC-21 promotes this to a gate once that decision exists.

    python3 scripts/audit_domain_density.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# A folded Ig or Fn3 domain is on the order of 90-100 residues. Regions far
# outside that are flagged for a human, not rejected.
TYPICAL_AA_PER_DOMAIN = (80.0, 120.0)


def main() -> int:
    titin = json.loads((ROOT / "data" / "titin.json").read_text(encoding="utf-8"))
    print("region          residues  domains  aa/domain  contour_nm  flag")
    for region in titin["regions"]:
        repeat = region.get("repeating_geometry") or {}
        units = repeat.get("n_units")
        if not units:
            continue
        residues = region["residue_span"]["length_aa"]
        density = residues / units
        contour = (region.get("extension_model") or {}).get("max_end2end_nm")
        low, high = TYPICAL_AA_PER_DOMAIN
        flag = "" if low <= density <= high else "REVIEW"
        print("%-14s %8d %8d %10.1f %11s  %s"
              % (region["id"], residues, units, density,
                 "-" if contour is None else "%.1f" % contour, flag))
    print("\nReport only; nothing above fails the build. See "
          "SHOWCASE_PREREVIEW_FINDINGS.md finding 1.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Run it and record what it says**

```sh
python3 scripts/audit_domain_density.py
```

Paste the output into the commit message. On today's data `dist_Ig` prints `REVIEW` at 133.1 aa/domain and `prox_Ig` prints 117.5.

- [ ] **Step 3: Record the sprint's invariants**

To `data/release_gates.json` → `automated.checks`:

```json
{
  "id": "region_states_one_length",
  "requirement": "every titin region's declared axial length equals its own resting span, and the four I-band regions also equal the structural-states partition",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase19.test.js; scripts/validate_geometry.py"
},
{
  "id": "contour_matches_domain_count",
  "requirement": "a repeat region's modelled contour equals its declared domain count times its unit axial length, so a count change cannot land without the chain it implies",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase19.test.js; scripts/validate_geometry.py"
},
{
  "id": "every_cited_doi_resolves",
  "requirement": "every DOI referenced by any data record exists in the canonical reference registry",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase19.test.js; scripts/validate_citations.py"
},
{
  "id": "force_parameters_are_displayed",
  "requirement": "every constant the passive-force law uses is rendered on the page from the record, with its source",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase19.test.js"
}
```

- [ ] **Step 4: Build, pack, verify**

```sh
npm run build
npm run pack
npm run verify
```

`data/references.json` changed in Task 19.3, so the fingerprint has moved and the pack **must** be regenerated here.

- [ ] **Step 5: Commit**

```sh
git add -A && git commit -m "SC-19: add the domain-density audit and record the sprint's invariants"
```

---

# Sprint SC-20 — Say what it is, and what it is not

**Why:** The lay review answered four of the five comprehension questions from the page. The fifth — *is titin the motor that shortens muscle?* — is a **scored** question, and the word "motor" appears exactly once on the site, inside an Evidence-mode expert card's not-claimed list. Separately, "sarcomere" is in the page title, the first sentence and every control label, and is defined nowhere. Both are writing problems, and both are inside the existing seven chapters.

**Done when:** a reader who walks only the guided route can answer all five protocol questions, and no chapter names a structure the frame it is shown over does not contain.

**Constraint, restated because it binds every task here:** 25–45 words, 2–3 sentences, longest sentence ≤30 words, per `scripts/validate_presentation.py`. Count every rewrite; do not estimate. The route has 85 words of headroom before it reaches 153.1 s against a 190 s ceiling.

### Task 20.1: Define the sarcomere where the visitor first meets it

**Files:**
- Modify: `data/presentation.json` (`guided_chapters[orientation].lay_summary`)
- Test: `test/showcase_phase20.test.js` (create)

- [ ] **Step 1: Add the sprint scripts**

```json
"test:sc20": "node --test --test-concurrency=1 test/showcase_phase20.test.js test/showcase_phase7.test.js test/showcase_phase17.test.js test/presentation.test.js",
"verify:sc20": "npm run check:build && npm run typecheck && npm run test:sc20 && npm run validate:presentation && python3 scripts/neg_control_presentation.py",
```

- [ ] **Step 2: Write the failing test**

Create `test/showcase_phase20.test.js`:

```js
/** SC-20 gates: the guided route answers its own comprehension protocol. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';

const model = await TitinModel.create(nodeReader());
const chapters = model.spec.presentation.guided_chapters;
const chapter = (id) => chapters.find((entry) => entry.id === id);
const guidedProse = chapters.map((entry) => entry.lay_summary).join(' ');

test('SC20: the guided route defines the word it is built on', () => {
  // "Sarcomere" is in the page title, the first sentence, and every control
  // label. A visitor who does not already know the word is never told it.
  assert.match(guidedProse, /sarcomere is the repeating unit/i,
    'the guided route must define a sarcomere before relying on it');
});
```

- [ ] **Step 3: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js
```

- [ ] **Step 4: Rewrite chapter one**

In `data/presentation.json`, `guided_chapters[orientation].lay_summary`, replace with exactly:

```
A sarcomere is the repeating unit that muscle contracts with, bounded by two Z-discs. Titin is one continuous giant protein running from the Z-disc toward its centre, shown in pink beside actin and myosin so its full half-sarcomere route stays visible.
```

41 words, 2 sentences, longest 27. It keeps "pink" (`test/showcase_phase17.test.js` asserts it) and keeps the chapter's existing claim — it adds a definition, not a claim.

- [ ] **Step 5: Run the prose gates**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js test/showcase_phase7.test.js test/showcase_phase17.test.js
npm run validate:presentation
```

`validate_presentation.py` prints the word and sentence counts on failure; if it objects, adjust wording rather than relaxing the gate.

- [ ] **Step 6: Build and commit**

```sh
npm run build && npm run check:build
git add -A && git commit -m "SC-20: define the sarcomere in the chapter that first uses the word"
```

### Task 20.2: Say plainly that titin is not the motor

**Files:**
- Modify: `data/presentation.json` (`guided_chapters[elastic_regions].lay_summary`)
- Test: `test/showcase_phase20.test.js` (extend)

**Scope note — read before writing:** the new sentence must not introduce a *positive* claim the record does not carry. "Myosin pulling on actin shortens the muscle" would be a new claim needing a source in `data/references.json` and, arguably, a claim record — and `data/showcase_claims.json` is byte-pinned (Global Constraint 8). The phrasing below states only the negative already present in the not-claimed register, plus titin's role as already claimed. That answers the protocol question and adds nothing new to defend.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase20.test.js`:

```js
test('SC20: the scored "is titin the motor" question is answerable from the route', () => {
  // The word "motor" appeared once on the whole site, inside an Evidence-mode
  // expert card's not-claimed list. This is a SCORED question in
  // data/release_gates.json -> lay_comprehension.protocol.
  assert.match(guidedProse, /titin is not the motor/i,
    'a visitor who walks only the guided route must be told this');
});

test('SC20: saying what titin is not does not add a claim to defend', () => {
  // The sentence states the negative the not-claimed register already carries.
  // If a future edit asserts what DOES shorten muscle, it needs a source.
  const step = chapter('elastic_regions');
  assert.ok(step.source_ids.length > 0);
  assert.doesNotMatch(step.lay_summary, /myosin (heads )?pull/i,
    'a positive mechanism claim needs a source record and a claim audit');
});
```

- [ ] **Step 2: Run it and watch the first test fail**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js
```

- [ ] **Step 3: Rewrite chapter three**

In `data/presentation.json`, `guided_chapters[elastic_regions].lay_summary`, replace with exactly:

```
Stretch does not scale every part of titin equally. Folded Ig chains mainly straighten, while disordered regions such as PEVK take a larger share of extension. Titin is not the motor that shortens muscle; it is the spring that resists being pulled apart.
```

43 words, 3 sentences, longest 17. The dropped phrase "in the force-balanced model" is not a loss of framing: the chapter's evidence class renders as `MODELED` in the card's own header, and the extension chart's header states the series force balance.

- [ ] **Step 4: Run the gates**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js test/showcase_phase7.test.js test/presentation.test.js
npm run validate:presentation && python3 scripts/neg_control_presentation.py
```

- [ ] **Step 5: Confirm the pacing still holds**

```sh
python3 -c "
import json; d = json.load(open('data/presentation.json'))
p = d['tour_pacing']; w = sum(len(c['lay_summary'].split()) for c in d['guided_chapters'])
s = w / p['reading_words_per_minute'] * 60 + p['chapter_transition_seconds'] * len(d['guided_chapters'])
print(f'{w} words -> {s:.1f}s, target {p[\"target_seconds\"]}')"
```

Expected: 252 words → 129.5 s, inside 110–190.

- [ ] **Step 6: Build and commit**

```sh
npm run build && npm run check:build
git add -A && git commit -m "SC-20: answer the scored question the route could not answer"
```

### Task 20.3: Expand the vocabulary on first use

**Files:**
- Modify: `data/presentation.json` (chapter two's copy; a `glossary` array)
- Modify: `scripts/validate_presentation.py` (validate the glossary)
- Modify: `src/index.template.html` (render the glossary in the Inspect tab)
- Test: `test/showcase_phase20.test.js` (extend)

**Interfaces:**
- Produces: `presentation.glossary` — `[{term: string, expansion: string, note: string}]`. Validated by both `StoryController`'s Python mirror and the JS gate.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase20.test.js`:

```js
test('SC20: the terms the route uses are expanded somewhere a reader can reach', () => {
  const glossary = model.spec.presentation.glossary;
  assert.ok(Array.isArray(glossary) && glossary.length >= 6,
    'the route uses Ig, Fn3, PEVK, N2A and the two termini without ever expanding them');
  for (const entry of glossary) {
    assert.ok(entry.term && entry.expansion && entry.note,
      `glossary entry ${JSON.stringify(entry)} is incomplete`);
  }
  const terms = new Set(glossary.map((entry) => entry.term));
  for (const required of ['Ig', 'Fn3', 'PEVK', 'N-terminus', 'C-terminus']) {
    assert.ok(terms.has(required), `'${required}' is used on the page and never expanded`);
  }
});

test('SC20: a chapter does not name a structure its own frame excludes', () => {
  // Chapter 2 named Fn3 domains while framed on the I-band, which contains none.
  const architecture = chapter('architecture');
  assert.doesNotMatch(architecture.lay_summary, /Fn3(?![^.]*thick filament)/,
    'Fn3 domains are A-band only; naming them over an I-band frame is wrong for the frame');
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js
```

- [ ] **Step 3: Add the glossary record**

In `data/presentation.json`, add a top-level `glossary` array. Every entry is `{term, expansion, note}`; the note is one clause a non-specialist can use. Cover at least: `Ig`, `Fn3`, `PEVK`, `N2A`, `N-terminus`, `C-terminus`. Example shape:

```json
{
  "term": "Ig",
  "expansion": "immunoglobulin-like domain",
  "note": "A small folded module about 4 nm long; titin's elastic segments are chains of them."
}
```

- [ ] **Step 4: Rewrite chapter two so the frame and the words agree**

In `data/presentation.json`, `guided_chapters[architecture].lay_summary`, replace with exactly:

```
Titin is not one uniform coil. Folded immunoglobulin-like (Ig) domains alternate with disordered segments here in the elastic I-band, and the order is fixed by the sequence: elastic parts near the Z-disc, scaffold further in.
```

35 words, 2 sentences, longest 29. It expands `Ig` on first use and stops naming Fn3 over a frame that contains none.

- [ ] **Step 5: Mirror the validation in Python**

In `scripts/validate_presentation.py`, require `glossary` to be a non-empty list in which every entry has a non-empty `term`, `expansion` and `note`, and in which terms are unique. Follow the file's `require(...)` idiom, and add the check to the same summary line the other collections report on.

- [ ] **Step 6: Render it**

In `src/index.template.html`, in the Inspect tab after "Inspect structures", add a `<h2>Terms</h2>` section with a `.sub` line and a container the page fills from `presentation.glossary` — term in bold, expansion, then the note. No term may be typed into the template.

- [ ] **Step 7: Run everything**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js test/showcase_phase7.test.js test/presentation.test.js
npm run validate:presentation && python3 scripts/neg_control_presentation.py
npm run build && npm run check:build
```

- [ ] **Step 8: Commit**

```sh
git add -A && git commit -m "SC-20: expand the vocabulary, and stop naming Fn3 over an I-band frame"
```

### Task 20.4: The remaining copy defects

**Files:**
- Modify: `data/presentation.json` (`anchors` chapter copy; its evidence class)
- Modify: `src/index.template.html` (the chapter card's length statement)
- Test: `test/showcase_phase20.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase20.test.js`:

```js
test('SC20: the anchors chapter covers both anchors', () => {
  const anchors = chapter('anchors');
  assert.match(anchors.lay_summary, /Z-disc/);
  assert.match(anchors.lay_summary, /M-band/,
    'the chapter is titled "anchors" and narrated only the Z-disc end');
});

test('SC20: a chapter that moves the length says so', () => {
  // Chapter 3 sets 2,400 nm. A presenter who set 2,200 and pressed Next saw it
  // change with no statement anywhere that the chapter owns that length.
  const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
  assert.match(page, /chapterLength/,
    'the card must state the length its chapter selected');
});
```

Add `import { readFileSync } from 'node:fs';` at the top of the file if it is not already there.

- [ ] **Step 2: Rewrite the anchors chapter**

In `data/presentation.json`, `guided_chapters[anchors].lay_summary`, replace with exactly:

```
A spring only works if both ends are held. At the Z-disc, two titin N-termini from neighbouring half-sarcomeres clamp a telethonin molecule between them; at the far end titin integrates into the M-band.
```

33 words, 2 sentences, longest 24. This also resolves the review's separate objection that the previous clause — *"which is how tension passes across the sarcomere boundary"* — is a functional inference carried under a `MEASURED` chapter tag. If the chapter's `evidence_class` was justified by the structural claim alone, it may now stay `MEASURED`; confirm against the chapter's `source_ids` and downgrade it if it is not.

- [ ] **Step 3: State the chapter's length on the card**

In `src/index.template.html`, in `renderChapter()`, add a `#chapterLength` element to the chapter card's meta line reading the chapter's own `recommended_state.sarcomere_length_nm`, e.g. `at 2,400 nm`. The chapter already owns that value deterministically; the card simply stops changing it silently.

- [ ] **Step 4: Run everything**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js test/showcase_phase7.test.js test/presentation.test.js
npm run validate:presentation
npm run build && npm run check:build
```

- [ ] **Step 5: Record the sprint's invariants**

To `data/release_gates.json` → `automated.checks`:

```json
{
  "id": "route_answers_its_own_protocol",
  "requirement": "the guided route defines the sarcomere and states that titin is not the motor, so every scored comprehension question is answerable without the Evidence drawer",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase20.test.js"
},
{
  "id": "chapter_names_only_what_its_frame_contains",
  "requirement": "no chapter names a structure absent from the frame it is shown over",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase20.test.js"
}
```

- [ ] **Step 6: Build and commit**

```sh
npm run build && npm run check:build
git add -A && git commit -m "SC-20: cover both anchors and state the chapter's length"
```

### Task 20.5: Frame the sweep so it can teach

**Files:**
- Modify: `src/index.template.html` (`toggleSweep`, the stage bar)
- Test: `test/showcase_phase20.test.js` (extend)

**Why:** the lay review's single strongest positive was also its most wasted. *"The Stretch sweep is the best teaching moment on the site and is nearly wasted."* Run from chapter 3's region-focus camera — which frames tens of nanometres of an 1,100 nm model — the numbers tick and the picture does not move. Run at a framing that fits the half-sarcomere, it delivers the whole of comprehension question 3 visually: the I-band bracket widens, the A-band bracket does not, the force climbs. The sweep does not need new content. It needs to be pointed at something.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase20.test.js`:

```js
test('SC20: the sweep frames what it is about to change', () => {
  const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
  // A sweep run at a close-up framing changes only numbers. The half-sarcomere
  // is half the current sarcomere length, so the test is on the arithmetic, not
  // on a magic constant.
  assert.match(page, /function frameForSweep/);
  assert.match(page, /Number\(slider\.value\) \/ 2/,
    'the required span is half the sarcomere, read from the control that sets it');
  assert.match(page, /frameForSweep\(\);?\n?[\s\S]{0,200}requestAnimationFrame\(stepSweep\)/,
    'the reframe must happen before the sweep starts, not during it');
});

test('SC20: the sweep says what to watch', () => {
  const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
  assert.match(page, /id="sweepHint"/,
    'nothing told a viewer that the brackets are the thing that moves');
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js
```

- [ ] **Step 3: Frame before sweeping**

In `src/index.template.html`, above `toggleSweep`:

```js
/**
 * A sweep is a comparison between two lengths, and a comparison you cannot see
 * is not one. Chapter cameras legitimately frame tens of nanometres; starting
 * the sweep there ticks the readouts and moves nothing on screen, which is the
 * one outcome that teaches a viewer the control does not work.
 *
 * Only when the titin path does not already fit: a presenter who has framed the
 * model deliberately keeps their framing.
 */
function frameForSweep() {
  const requiredNm = Number(slider.value) / 2;
  if (visualization.viewer.visibleWidthNm() >= requiredNm) return false;
  state.cameraPreset = 'view.titin_story';
  applyCameraPreset({ animate: true });
  syncViews(); syncCloseups(null);
  return true;
}
```

and call it as the first line of `toggleSweep`'s start branch, before
`sweepStartedAt` is set:

```js
function toggleSweep() {
  if (sweepHandle !== null) { stopSweep(); return; }
  if ($('stagePlay').disabled) return;
  frameForSweep();
  sweepStartedAt = performance.now();
  ...
```

- [ ] **Step 4: Say what to watch**

Add a `#sweepHint` element to the stage bar, hidden by default, shown while
`sweepHandle !== null` and cleared by `stopSweep()`. One line, no new colour —
reuse `.stage-label`'s token so Global Constraint 9 is not engaged:

```html
          <span id="sweepHint" class="stage-label" hidden>watch the I-band bracket</span>
```

- [ ] **Step 5: Verify it teaches, in the browser**

Build, open over `file://`, press `3` to reach the region-focus chapter, note
`visualization.viewer.visibleWidthNm()`, then start the sweep and confirm the
camera pulls back once and the brackets visibly move. Then frame the whole
half-sarcomere by hand and confirm the sweep does **not** reframe — a presenter's
deliberate framing must survive.

- [ ] **Step 6: Run the gates**

```sh
node --test --test-concurrency=1 test/showcase_phase20.test.js test/showcase_phase12.test.js test/presentation.test.js
```

`test/showcase_phase12.test.js` asserts the sweep never starts itself; this task
adds a camera move *inside* a user-initiated start, which does not change that.
If it fails, read the failure before changing the gate — SC-17 hit this and the
gate was right.

- [ ] **Step 7: Record this task's invariant**

Task 20.4 Step 5 already appended the sprint's other two. Append one more to
`data/release_gates.json` → `automated.checks`:

```json
{
  "id": "sweep_frames_what_it_changes",
  "requirement": "the stretch sweep reframes to the half-sarcomere when the current camera cannot show the change it is about to make, and leaves a deliberate framing alone",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase20.test.js"
}
```

- [ ] **Step 8: Build, pack, verify, commit**

```sh
npm run build && npm run pack && npm run verify
git add -A && git commit -m "SC-20: frame the sweep so the demonstration is visible, and record the invariants"
```

---

# Sprint SC-21 — The science, on a specialist's ruling

> **BLOCKED. Do not start this sprint without Task 21.0.**
>
> Every other sprint in this plan is a defect an implementer can settle. This one
> changes what the model claims about titin, and the reason to change it is a
> reading of the literature that no one in this repository has authority over. The
> arithmetic corroborating finding 1 is strong — 1,996 residues over 15 declared
> domains is 133 aa each, against roughly 90 for a tandem Ig array — but strong
> corroboration is why you ask a specialist, not a substitute for asking one.
>
> SC-19's gates are what make this sprint safe to execute quickly once the ruling
> lands: `contour_matches_domain_count` turns a half-applied change into a build
> failure, and `region_states_one_length` does the same for the axial budget.

**Done when:** the ruling is recorded in `data/release_gates.json` → `expert_review.findings` with the reviewer's name; the record reflects it; the force balance has been re-solved by its own script rather than by hand; and every generated artifact has been regenerated and re-checked.

### Task 21.0: Obtain the ruling and record it

**Files:**
- Modify: `data/release_gates.json` (`expert_review`)

- [ ] **Step 1: Give the reviewer the audit, not the argument**

Send: `SHOWCASE_PREREVIEW_FINDINGS.md`, the output of `python3 scripts/audit_domain_density.py`, and the Measure tab's parameter table from Task 19.4. Ask for a ruling on findings 1, 2, 6 and 13 specifically.

- [ ] **Step 2: Record it**

For each finding, append to `expert_review.findings` a record carrying at minimum an `id`, a `severity`, the finding as stated, the reviewer's ruling, and a `resolution`. `scripts/validate_release_gates.py` requires every finding to record a resolution and refuses a passing expert gate with an unresolved `CRITICAL`. Add the reviewer to `expert_review.reviewers` with `name`, `affiliation` and `reviewed_on` **only if** they consider the review complete — the gate's status is theirs to move, not yours.

- [ ] **Step 3: Run the gate validator and commit**

```sh
npm run validate:gates && python3 scripts/neg_control_release_gates.py
git add -A && git commit -m "SC-21: record the specialist's ruling on the pre-review findings"
```

### Task 21.1: The domain count, the contour, and the force balance

**Files:**
- Modify: `data/titin.json` (`regions[dist_Ig]`)
- Regenerate: `data/mechanical_model.json`, `data/structural_states.json`, `data/titin.json` axial lengths
- Test: `test/showcase_phase21.test.js` (create)

**Only execute this task if Task 21.0's ruling is that the count is wrong.** If the ruling upholds 15, the work is instead to record *why* on the region card, and this task becomes a documentation change.

**The pipeline, exactly:** `scripts/mechanical_model.py` reads `data/titin.json` (contour per region, via `extension_model.max_end2end_nm`) and `data/structural_states.json`, solves the series force balance, and **writes `data/mechanical_model.json`**. It exits non-zero if source validation or the continuity probe fails. `src/geometry/MechanicalModel.js` is the JS port the browser runs; its `CHAIN_PARAMETERS` carries the sourced law constants and reaches the contour through `Lc_from_spec: 'max_end2end_nm'`, so a contour change propagates to the page without a code change.

- [ ] **Step 1: Add the sprint scripts**

```json
"test:sc21": "node --test --test-concurrency=1 test/showcase_phase21.test.js test/showcase_phase19.test.js test/phase8.test.js test/standalone.test.js",
"verify:sc21": "npm run verify",
```

- [ ] **Step 2: Write the failing test**

Create `test/showcase_phase21.test.js`:

```js
/** SC-21 gates: the record matches the specialist's ruling. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const titin = JSON.parse(readFileSync(new URL('../data/titin.json', import.meta.url), 'utf8'));
const gates = JSON.parse(
  readFileSync(new URL('../data/release_gates.json', import.meta.url), 'utf8'),
);
const region = (id) => titin.regions.find((entry) => entry.id === id);

test('SC21: the ruled domain count is the one the record carries', () => {
  // Replace 22 with whatever Task 21.0 recorded. The point of the assertion is
  // that a number this consequential is pinned to a named ruling.
  const RULED_DIST_IG_DOMAINS = 22;
  const distal = region('dist_Ig');
  assert.equal(distal.domain_composition.Ig_like, RULED_DIST_IG_DOMAINS);
  assert.equal(distal.repeating_geometry.n_units, RULED_DIST_IG_DOMAINS);
  assert.equal(distal.extension_model.max_end2end_nm,
    RULED_DIST_IG_DOMAINS * distal.repeating_geometry.unit_axial_nm);
});

test('SC21: the ruling that moved it is recorded with a name against it', () => {
  const findings = gates.expert_review.findings || [];
  const ruled = findings.find((entry) => /dist_Ig|distal tandem/i.test(JSON.stringify(entry)));
  assert.ok(ruled, 'a scientific record change must cite the review that authorised it');
  assert.ok(String(ruled.resolution || '').trim());
});
```

- [ ] **Step 3: Apply the ruling to the record**

In `data/titin.json`, `regions[dist_Ig]`, set `domain_composition.Ig_like`, `repeating_geometry.n_units`, and `extension_model.max_end2end_nm` together — SC-19's gate rejects any subset. Record the ruling's authority in the region's own note field, replacing nothing that is still true.

- [ ] **Step 4: Re-solve the force balance with its own script**

```sh
python3 scripts/mechanical_model.py
```

Read the printed report before accepting it: the per-state forces, `worst deviation from the spec partition`, the source-validation count and the continuity probe. A large worst-deviation means the spec partition in `data/structural_states.json` is now stale against the physics and must be re-derived from the model's own partition — which is what the "Phase 8: re-derived by series force balance" notes in `data/titin.json` record having been done before. Re-derive it the same way, then re-run the script until the deviation is small and the probe passes.

- [ ] **Step 5: Propagate the resting partition**

`data/titin.json`'s I-band `dimensions_nm.axial_length_X` and `resting_axial_position_nm` values MUST equal `structural_states.json`'s resting partition — `validate_geometry.py` gates all three, and SC-19 widened that gate. Update them together and re-lay the resting block end to end from the Z-disc edge.

- [ ] **Step 6: Run every gate that touches geometry**

```sh
npm run validate && npm run validate:spec
node --test --test-concurrency=1 test/showcase_phase21.test.js test/showcase_phase19.test.js test/phase8.test.js
python3 scripts/audit_domain_density.py
```

The audit should no longer print `REVIEW` for `dist_Ig`.

- [ ] **Step 7: Build and commit**

```sh
npm run build && npm run check:build
git add -A && git commit -m "SC-21: correct the distal tandem Ig domain count and re-solve the chain"
```

### Task 21.2: The A-band axial budget

**Files:**
- Modify: `data/titin.json` (`Aband_super`, `kinase`, `Mline` positions and lengths)
- Test: `test/showcase_phase21.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase21.test.js`:

```js
import { readFileSync as read } from 'node:fs';
const sarcomere = JSON.parse(read(new URL('../data/sarcomere.json', import.meta.url), 'utf8'));

// As in Task 21.1, this test encodes the RULING, not the reviewer's proposal.
// The assertion below is the pre-review's recommendation; if Task 21.0 ruled
// otherwise, rewrite the assertion to the ruled budget before touching the data.
test('SC21: the super-repeats end where the cross-bridge zone does', () => {
  // The record declares half_thick 800 nm and a 160 nm bare zone, so the
  // head-bearing region ends one bare-zone half short of the M-line centre.
  // The A-band super-repeats bind the head-bearing region; ending them 100 nm
  // early put the titin kinase inside it.
  const lengths = sarcomere.reference_lengths_nm;
  const mLineCentre = region('Mline').resting_axial_position_nm.X_end;
  const headBearingEnd = mLineCentre - lengths.thick_filament_bare_zone / 2;
  assert.equal(region('Aband_super').resting_axial_position_nm.X_end, headBearingEnd,
    'the super-repeats must end at the bare-zone edge');
  assert.equal(region('kinase').resting_axial_position_nm.X_start, headBearingEnd,
    'the kinase sits at the A/M junction its own card claims');
});
```

- [ ] **Step 2: Run it and watch it fail**

Expected: `620 + 300 = 920` against an expected `1020`.

- [ ] **Step 3: Apply the ruled budget**

Move `Aband_super`'s `X_end`, and `kinase` and `Mline` after it, so the regions still tile 300 → 1,100 nm end to end with no gap. Update each region's `dimensions_nm.axial_length_X` in the same edit — SC-19's gate requires it. These regions are anchored, so no force balance is involved; the I-band partition is untouched.

- [ ] **Step 4: Run the geometry gates**

```sh
npm run validate && npm run validate:spec
node --test --test-concurrency=1 test/showcase_phase21.test.js test/showcase_phase19.test.js test/showcase_phase3.test.js test/closeup.test.js
```

`test/showcase_phase3.test.js` and `test/closeup.test.js` exercise the A-band and the close-ups this moves; expect to find assertions that pin the old positions and update them deliberately, naming the ruling in the commit.

- [ ] **Step 5: Build, verify visually, commit**

```sh
npm run build && npm run check:build
```

Open the built page at the `czone` close-up and confirm the super-repeat band and the kinase marker sit where the ruling says. Then:

```sh
git add -A && git commit -m "SC-21: end the super-repeats at the bare-zone edge and move the kinase with them"
```

### Task 21.3: The super-repeat period and its citation

**Files:**
- Modify: `data/titin.json` (`Aband_super.repeating_geometry`), `data/presentation.json` (the expert card, if the class changes)
- Test: `test/showcase_phase21.test.js` (extend)

- [ ] **Step 1: Write the test that encodes the ruling**

Append to `test/showcase_phase21.test.js`:

```js
test('SC21: the super-repeat period and its evidence class agree with the ruling', () => {
  const repeat = region('Aband_super').repeating_geometry;
  const ruled = (gates.expert_review.findings || [])
    .find((entry) => /super-repeat/i.test(JSON.stringify(entry)));
  assert.ok(ruled, 'the period is contested; the record must cite the ruling that settled it');
  // One class for one quantity: the register and the expert card disagreed,
  // one saying STRONGLY INFERRED and the other ESTABLISHED.
  assert.ok(repeat.evidence_class);
  assert.ok(String(ruled.resolution || '').trim());
});
```

- [ ] **Step 2: Apply the ruling**

Either adopt the period the reviewer rules for and state the register against the myosin repeat, or retain 45.5 nm and add the specific supporting figure or table to the source note. Either way, reconcile `repeating_geometry.evidence_class` with the class the Evidence register and the expert card show for the same quantity, so one number does not carry two confidences.

- [ ] **Step 3: Run and commit**

```sh
npm run validate && npm run validate:spec && npm run validate:presentation
node --test --test-concurrency=1 test/showcase_phase21.test.js test/showcase_phase7.test.js
npm run build && npm run check:build
git add -A && git commit -m "SC-21: settle the super-repeat period against its source"
```

### Task 21.4: Promote the density gate and settle the parameter questions

**Files:**
- Modify: `scripts/audit_domain_density.py` → a gate
- Modify: `package.json` (`validate:density`, added to `verify`)
- Modify: `data/mechanical_model.json` inputs per the ruling on finding 13
- Test: `test/showcase_phase21.test.js` (extend)

- [ ] **Step 1: Promote the audit**

Change `scripts/audit_domain_density.py` to exit non-zero when a region falls outside the band the reviewer ruled for, replacing `TYPICAL_AA_PER_DOMAIN` with the ruled values and citing the ruling in the docstring. Rename the entry point to reflect that it now gates rather than reports, add:

```json
"validate:density": "python3 scripts/audit_domain_density.py",
```

and insert it into the `verify` chain after `npm run validate:citations`.

- [ ] **Step 2: Apply the ruling on the remaining parameters**

For each of finding 13's three items — the tandem Ig persistence length, the PEVK residue rise, and the absence of a slack length — apply the reviewer's ruling or record their decision to leave it. A decision to leave it must be recorded in `expert_review.findings` with its reasoning; silence is not a resolution.

Any change to `A_nm`, `K0_pN` or a contour must be made in **both** `scripts/mechanical_model.py` and `src/geometry/MechanicalModel.js`'s `CHAIN_PARAMETERS`, which are independent ports of the same law. Add a test asserting the two agree if one does not already exist.

- [ ] **Step 3: Re-solve and re-propagate**

```sh
python3 scripts/mechanical_model.py
npm run validate && npm run validate:spec
node --test --test-concurrency=1 test/showcase_phase21.test.js test/phase8.test.js
```

- [ ] **Step 4: Commit**

```sh
git add -A && git commit -m "SC-21: gate domain density and settle the chain parameters"
```

### Task 21.5: Regenerate everything and re-run the human-facing sets

**Files:**
- Regenerate: `index.html`, `release/`, the capture matrix
- Modify: `README.md`, `PROGRESS.md`, `data/release_gates.json`

- [ ] **Step 1: Regenerate in the load-bearing order**

```sh
npm run build
npm run pack
npm run verify
```

Every `data/*.json` this sprint touched is a fingerprint input, so the pack is stale twice over — by fingerprint and by artifact size.

- [ ] **Step 2: Re-run the capture matrix**

```sh
node scripts/capture_visual_matrix.mjs --check
node scripts/capture_visual_matrix.mjs > /tmp/capture-checklist.txt
```

The geometry moved, so any previously captured cells are invalid. `visual_matrix` stays `PENDING` with no captured cells recorded unless a human has actually walked them.

- [ ] **Step 3: Rebaseline the size record if the artifact moved materially**

```sh
ls -l index.html
```

If the artifact has grown past a few percent, update `data/release_gates.json` → `performance.baseline` as SC-17 did, and restate the derived ceiling in this plan's Global Constraint 6 so the two do not drift.

- [ ] **Step 4: Update the trackers**

`PROGRESS.md`: add SC-18 … SC-21 to the showcase table and update the outstanding-work section — in particular, `expert_review` may now hold real findings and a real reviewer. `README.md`: keep the status paragraph honest about which gates remain outstanding.

Update `SHOWCASE_PREREVIEW_FINDINGS.md` with a short disposition line per finding — resolved where, or upheld and why. A findings document that is never closed out is a document nobody trusts next time.

- [ ] **Step 5: Commit**

```sh
git add -A && git commit -m "SC-21: regenerate the artifact, the pack and the capture set"
```

---

## Self-review notes for the implementer

Four failure modes will cost the most time.

1. **The standalone page works from `npm run serve` but breaks when opened as a file.** Task 19.4 is the only task that can add an import; if it does, all three places in `scripts/build_standalone.mjs` must change. No gate catches a miss — the browser console says `X is not defined`. Prefer routing the parameter rows through `visualization.chainParameters()` so no new binding is needed at all.
2. **A prose rewrite fails a gate you did not know existed.** `validate_presentation.py` enforces 25–45 words, 2–3 sentences and a 30-word longest sentence; `test/showcase_phase7.test.js` additionally pins specific phrases in specific chapters, and `test/showcase_phase17.test.js` requires chapter one to keep the word "pink". Run `npm run validate:presentation` after every copy edit, not at the end of the sprint.
3. **A geometry change lands halfway.** SC-19's two gates exist precisely to stop this, and they will fail loudly rather than subtly — treat a failure as the gate doing its job, not as an obstacle. Never edit `domain_composition` without `n_units` and `max_end2end_nm`, and never edit `resting_axial_position_nm` without `dimensions_nm.axial_length_X`.
4. **SC-18's link gate counts link containers, and later sprints render links.**
   `test/showcase_phase18.test.js` asserts there are exactly four
   `createElement('a')` sites, so that a new link container has to join the
   colour rule rather than shipping at the browser default. Tasks 19.3, 19.4 and
   20.3 all render sources — each is specified to reuse the existing `sourceLine`
   helper, which adds no site. If you add one anyway, update the rule, the
   container list and the count together, in that order. A failing count is the
   gate working.
5. **The pack goes stale for a reason you did not expect.** `release/MANIFEST.json` records the artifact's byte size, so *any* template edit makes it stale even when no data record moved; and the fingerprint moves when any of the twelve fingerprint inputs change. `npm run pack` after the build, before `npm run verify`, at the end of every sprint.

Three changes in this plan deliberately touch an existing contract. Each is recorded in the commit that makes it:

- **Task 18.2** changes the visible text of the view and close-up controls. The URL schema, the camera preset names and the keys themselves are untouched, so no shared link and no capture-matrix cell changes.
- **Task 19.1** edits a number in `data/titin.json`. It is stale metadata read by no renderer, and the edit makes the record agree with what already ships; whether that number is *right* is Task 21.2.
- **Task 20.2** removes the phrase "in the force-balanced model" from chapter three. The MODELED framing survives in the chapter's own evidence badge and in the extension chart's header; the word budget did not allow both that phrase and the answer to a scored comprehension question.

## What this plan does NOT do, and why

- **No new guided chapter.** The lay review's suggestion of a framing chapter at each end is the right instinct, but two test files pin the seven chapter IDs and the pacing gate is 110–190 s. SC-20 delivers both missing ideas inside the existing seven, with 63 words of headroom left over.
- **No positive claim about what does shorten muscle.** Saying "myosin heads pulling on actin" would need a source record and a claim audit, and `data/showcase_claims.json` is byte-pinned by a reviewer. Task 20.2 states the negative that the not-claimed register already carries, which is what the scored question asks.
- **No science changed on an agent's authority.** Findings 1, 2, 6 and 13 are all in SC-21, behind Task 21.0. The corroborating arithmetic is strong enough to make the question sharp and not strong enough to answer it.
- **No human gate marked passed.** `lay_comprehension`, `expert_review`, `visual_matrix` and `demo_rehearsal` still need people. SC-20 makes the lay protocol answerable; it does not answer it. SC-21 begins to populate `expert_review.findings`, which is the first real content that gate has ever had — but its status stays where the reviewer puts it.
- **No relaxation of a gate to make a fix land.** Every gate this plan touches gets stricter. If one blocks a change, the change is wrong or the gate needs a reviewer's decision, and both of those are recorded rather than worked around.

**Four of the lay review's interaction observations are declined**, each for a stated reason rather than by omission. They are real observations; they are not defects this plan is the right vehicle for.

- **Six of twelve component toggles are disabled on arrival, explained only by a tooltip.** This is the SC-5 attention budget behaving as designed: those layers are not built at the opening zoom, and `syncDepictionToggles` disables rather than hides them so the inventory stays honest. The fix a visitor actually wants — reaching telethonin without first discovering the `zdisc` close-up — is a navigation design question, not a bug, and it would touch the reviewed attention budget in `data/showcase_claims.json`, which is byte-pinned. It needs a claim-audit decision with a reviewer's name, exactly like SC-21's findings.
- **Three differently-labelled controls open the same drawer.** "Evidence", "Evidence & controls" and "Evidence & sources" are three deliberate SC-12/SC-13 entry points, each labelled for what the reader was looking at when they reached it. Renaming them to one string is a plausible improvement and an untested hypothesis; it belongs to a comprehension study, not to a remediation plan.
- **The pinned object card can cover the structure it describes.** Real, and already half-solved: SC-13 added `inspectorPlacement` in `src/presentation/StageLayout.js` for precisely this. Fixing the remaining case means changing placement arithmetic that the SC-8 capture matrix pins, so it would invalidate capture cells this plan is otherwise careful not to disturb. Defer to a sprint that owns the matrix.
- **Chapters 6 and 7 frame the model as a hairline on black.** Both are argument chapters — the evidence audit and the provenance pipeline — where the stage is deliberately backdrop and the payload is the overlay. SC-13 made that explicit by dimming the scene behind the pipeline band. Reframing them is a narrative decision about what chapters 6 and 7 are *for*, and the honest place to settle it is the `lay_comprehension` gate, whose participants can say whether the frames read as empty or as background.
