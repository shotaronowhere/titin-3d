# Titin showcase — pre-review findings

> **2026-08-09 correction:** The proposed 22-domain distal-Ig remedy below was a density-based
> hypothesis, not an established count. A subsequent feature-level audit found that the currently
> declared N2A and distal-Ig intervals themselves require reconciliation. Do not implement 22 from
> this document. The governing remediation plan is
> [`docs/superpowers/plans/2026-08-09-titin-mvp-readiness-synthesis.md`](docs/superpowers/plans/2026-08-09-titin-mvp-readiness-synthesis.md).

Reviewed build: the deployed page at <https://shotaronowhere.github.io/titin-3d>, build
fingerprint `c079c03d56c4` (`main` @ `4375fee`, the SC-17 release point). The deployed
fingerprint was read from `window.__titinBuild.fingerprint` and matches the local build, so
what is reviewed here is what ships.

Date: 2026-08-07.

## What this document is — and what it is not

Two LLM agents were given personas and driven through the **live deployed site only**. Neither
was given access to this repository; each saw what a visitor sees.

**This is not the `lay_comprehension` gate and not the `expert_review` gate.** Those require, by
`data/release_gates.json`, at least three independent non-specialists and at least one named
specialist with an affiliation and a date. No result from this document has been written into
`data/release_gates.json`, and none should be. `scripts/validate_release_gates.py` would accept a
fabricated participant record; the reason it must not receive one is the same reason this project
exists.

What this document *is*: a defect list produced before spending a human's time, in the same spirit
as running the test suite before asking for code review. Its value is that every finding is
checkable, and the checkable ones were checked.

## Method

| | Lay persona | Expert persona |
|---|---|---|
| Brief | Curious adult, no biology past high school | Muscle physiologist / titin structural biologist, reviewing before a talk to peers |
| Protocol | The five `lay_comprehension` questions from `data/release_gates.json` | The seven `expert_review` questions from the same record |
| Instruction | Answer **only** from what the page shows; cite where; say NOT FOUND rather than answering from prior knowledge; list prior-knowledge leaks separately | Adversarial; verdict per question; check numbers against the literature; break the strongest claim |
| Work done | 7 chapters, 4 drawer tabs, object inspector, Stretch at two framings, 1566×1159 and 375×812 | 7 chapters, 4 tabs, 6 object cards, 8 region cards, model sampled at SL 1,900 / 2,200 / 2,400 / 3,000 |
| Cost | 117 tool calls, ~15 min | 91 tool calls, ~22 min |

The lay persona's contamination problem — an LLM already knows titin — was controlled by requiring
a page location for every answer and a separate declaration of what it knew that the page never
taught. That declaration is reproduced in full below, because it is the most useful part of the
exercise.

## Verification legend

Every finding carries one of:

- **VERIFIED** — independently confirmed against this repository's own files after the agent
  reported it. The file and line are given. These do not depend on trusting the agent.
- **VERIFIED (internal contradiction)** — the repository's own records disagree with each other.
  No external authority is needed to see it.
- **UNVERIFIED (literature)** — the agent's claim rests on external literature that was not
  checked against the sources here. Corroborating arithmetic from the repository is noted where it
  exists, but a specialist must rule.

---

## Verdict at a glance

| Question | Answer |
|---|---|
| Did the review find anything real? | **Yes.** One critical data error, four major, three shipping presentation defects. |
| Is the epistemic architecture sound? | **Yes.** All seven expert protocol questions came back DEFENSIBLE on their own terms. The framework survived an adversarial read. |
| Where are the problems, then? | **In the contents, not the framework.** Arithmetic and bookkeeping, not judgment. |
| Does a layman learn what titin *is*? | **Yes** — identity, anchors, and the I-band-stretches/A-band-doesn't behaviour all landed. |
| Does a layman learn why titin *matters*? | **No.** "Sarcomere" is never defined and "titin is not the motor" appears once, buried. |
| Would the expert persona sign off? | **Not as it stands.** Four named fixes; then yes, without reservation. |
| Does any shipped gate currently claim something untrue? | **Yes** — `accessibility.contrast` is `PASS` while a 1.84:1 text contrast ships. |

---

## Findings

Ordered by severity. Each is scoped to what would resolve it, not to who should do it.

### 1 — CRITICAL — `dist_Ig` declares 15 Ig domains

**Status:** VERIFIED (the declaration and its evidence class) / UNVERIFIED (literature: that the
correct count is 22).

**Where:** `data/titin.json` → `regions[dist_Ig]`:
`domain_composition.Ig_like: 15`, `repeating_geometry.n_units: 15`, `unit_axial_nm: 4.0`,
`evidence_by_claim.residue_span_and_domain_count: "MEASURED"`.

**Surfaces to the user as:** the Measure tab's compliance share, chapter 3's regional bars, and the
passive-force readout in the bottom bar at every sarcomere length.

**Evidence:** the same record declares the residue span as 12,023–14,018 = **1,996 aa**. At 15
domains that is **133 aa per domain**; at 22 it is **90.7**, which is ordinary for a tandem Ig
array with short linkers. For comparison the record's own `prox_Ig` is 9,051 aa over 77 domains =
117.5 aa/domain. The reviewer's literature claim is that the distal tandem Ig (I84–I105) is 22
domains and is constitutive in every isoform. No rationale for 15 appears anywhere in this
repository's documentation.

**Consequence if the reviewer is right:** contour becomes 22 × 4 = 88 nm rather than 60 nm.
Re-solving the series force balance moves the reference-length compliance split from roughly
61/27/12/1 to 61/21/17/1 and lowers the reference passive force by about 17–20% at every length.
The qualitative story — Ig straightens first, PEVK is recruited later — is unchanged.

**To resolve:** a specialist rules on the count. If 22, set `Ig_like` and `n_units`, re-run the
force balance, re-derive every downstream readout, and regenerate the artifact, pack and capture
matrix. Independently of the ruling, print the domain count on the region card so this class of
error becomes visible to readers rather than reachable only through the spec.

**Note:** this is a scientific-record change. It should carry a reviewer's name, not an agent's.

### 2 — MAJOR — the A-band axial budget is ~100 nm short, placing the kinase inside the cross-bridge zone

**Status:** VERIFIED (internal contradiction).

**Where:** `data/titin.json` → `regions[Aband_super].resting_axial_position_nm` (300.0 → 920.0),
`regions[kinase]` (920.0 → 950.0), `regions[Mline]` (950.0 → 1100.0). Surfaces as the Measure tab's
"A-band anchored span 620.0 nm".

**Evidence:** `data/sarcomere.json` → `reference_lengths_nm` declares `half_thick: 800.0` and
`thick_filament_bare_zone: 160.0`. With the A-band starting at 300 nm and the M-line centre at
1,100 nm, the head-bearing region runs 300 → 1,020 nm — **720 nm**, not 620. Corroborating: the
record's own A-band domain census is 47 Ig + 132 Fn3 = **179 domains**, and at the same 4.0 nm per
domain the record uses elsewhere that is **716 nm**.

As declared, the titin kinase sits about 100 nm proximal to the A/M junction its own card says it
occupies, and roughly 70 nm of the M-line region is drawn inside the cross-bridge-bearing zone.

**To resolve:** end the super-repeats at the bare-zone edge, place the kinase there, and give the
M-line region the bare-zone half. Every number required is already in the repository; no new
literature is needed.

### 3 — MAJOR — `Aband_super` states its own length twice, 25 nm apart

**Status:** VERIFIED (internal contradiction).

**Where:** `data/titin.json` → `regions[Aband_super]`:
`dimensions_nm.axial_length_X: 595.0` versus
`resting_axial_position_nm.axial_length_nm: 620.0`.

The renderer uses the 620; `axial_length_X: 595.0` is read by no source file (only by
`scripts/validate_geometry.py`). It is therefore stale metadata rather than a visible wrong number
— but it is stale metadata inside the scientific record.

**To resolve:** reconcile the two, in whichever direction finding 2 settles.

### 4 — MAJOR — the validator written to catch finding 3 does not cover the region it happened in

**Status:** VERIFIED.

**Where:** `scripts/validate_geometry.py:1171-1184`. The consistency loop is
`_IB8 = ["prox_Ig", "N2A", "PEVK", "dist_Ig"]` — the four I-band regions only. `Z1Z2`,
`Aband_super`, `kinase` and `Mline` are never checked.

The comment directly above that loop states the principle it enforces: *a spec whose two files
disagree about the same quantity is worse than one that is merely wrong, because each file
corroborates nothing.* The check was scoped to half the regions, and the contradiction landed in
the other half.

**To resolve:** extend the loop to every region. Note the ordering: the extended check **will fail**
until finding 3 is reconciled, which is the correct behaviour and the reason to do them together.

### 5 — MAJOR — the entire passive-force parameter set cites a DOI absent from the bibliography

**Status:** VERIFIED.

**Where:** `data/mechanical_model.json` and `data/structural_states.json` attribute the force law
and all persistence lengths and stretch moduli to `10.1073/pnas.95.14.8052`. That DOI does not
appear in `data/references.json`, which holds 46 records, and the string "Linke" appears nowhere in
the rendered page.

The Sources & build tab tells the reader that every quantitative claim traces to a citable record
with complete metadata. The single most quantitative claim on the site — the force readout present
in the bottom bar of every view — traces to a record that is not among the 46.

The source itself appears appropriate (Linke et al. 1998, PNAS 95:8052, on PEVK titin elasticity in
skeletal muscle). This is a bookkeeping failure, not a sourcing failure.

**To resolve:** promote it to a full bibliography record, cite it from the Measure tab's
passive-force block, and add a validator that fails on any DOI referenced in provenance but absent
from the registry.

### 6 — MAJOR — the 45.5 nm super-repeat is tagged MEASURED and cited to a paper the reviewer reads as concluding the opposite

**Status:** UNVERIFIED (literature).

**Where:** `data/titin.json` → `regions[Aband_super].repeating_geometry`:
`period_nm: 45.5`, `evidence_class: "MEASURED"`, `source: "10.1016/j.yjmcc.2019.05.026"`. Surfaces
as the Measure tab's "45.5 nm vs 43.1 nm · near-commensurate, 2.4 nm residual, not an exact
register."

**The reviewer's objection:** that DOI is Tonino et al. 2019, whose subject is *matching* MyBP-C
stripes to titin's super-repeats — i.e. registration — while the site cites it to assert a
per-repeat mismatch that compounds to ~26 nm across 11 super-repeats. A second tension: the site's
own evidence register lists the A-band super axial span as STRONGLY INFERRED while the expert card
calls the 45.5 nm periodicity ESTABLISHED. A third: Tonino 2019 is a cardiac study, and the MyBP-C
card elsewhere refuses cardiac coordinates on the explicit grounds that mixing isoforms is the
error the evidence classes exist to prevent.

**To resolve:** a specialist reads the cited paper and rules. Either adopt a period consistent with
the source and state the register, or retain 45.5 with the specific supporting figure identified
and an explicit note on where the site departs from the ruler/matching consensus. Reconcile
ESTABLISHED against STRONGLY INFERRED either way.

### 7 — MAJOR — a shipping WCAG failure under a gate recorded as PASS

**Status:** VERIFIED.

**Where:** `src/index.template.html:242` — `.object-sources a, #chapterSources a` sets the link
colour. `#bibliography a` matches neither selector, so all 46 bibliography links in the
Sources & build tab render at the browser default `#0000ee` on `#161b22`: **1.84:1**. Every other
source link on the site is `#a9c9f2` at 10.15:1.

`data/release_gates.json` → `accessibility.checks[contrast]` is recorded `PASS` with the
requirement "WCAG AA text and control contrast". The gate checks only the colours *declared* in
`contrast_pairs`, so an undeclared colour is invisible to it.

Of every finding here, this is the one that most contradicts the project's own thesis: a record
asserting a property the artifact does not have.

**To resolve:** style the bibliography links with the existing token, and add the pair to
`accessibility.contrast_pairs` so the gate covers it. Consider a check that no anchor in the
shipped page falls back to a browser default colour.

### 8 — MAJOR — the active extension row hides the word the chapter is teaching

**Status:** VERIFIED.

**Where:** `src/index.template.html:141` — `button.on { background: var(--accent); color: #0e1116; }`
— versus `:335` — `.extension-row.on { background: rgb(255 93 125 / 13%); … }`.

The extension rows are `<button>` elements. The selected row takes `.on`, which overrides the
background with a 13% pink wash but leaves `color: #0e1116` — near-black — in place. The result is
near-black text on a dark panel, roughly 1:1. In chapter 3 the selected row is PEVK, which is the
exact term the chapter's prose is pointing at.

**To resolve:** set an explicit foreground on `.extension-row.on`.

### 9 — MINOR — a raw internal identifier ships as a button label

**Status:** VERIFIED.

**Where:** `src/index.template.html` — the VIEW button loop sets `b.textContent = k`, where `k` is
the `VIEWS` key. The bar therefore reads `longitudinal · titin_story · side · transverse · oblique`.
The human-readable name (`v.label`, "Titin route — Z-disc to M-band") is only the tooltip.

### 10 — MINOR — narrow-viewport control clipping

**Status:** reported, not independently re-measured.

At 375×812 the `oblique` view button extends about 19 px past the right edge in a row whose
overflow is visible rather than scrollable, so it cannot be reached; and the preset row scrolls but
offers no affordance indicating that three of four presets are off-screen. The scale-bar caption
and the Z-disc anchor label were also observed colliding over the model.

### 11 — MINOR — mechanical model parameters are not auditable from the page

**Status:** VERIFIED (the absence).

Only the N2A card exposes chain parameters ("contour ~39 nm, Lp 0.35 nm"). The proximal Ig, PEVK
and distal Ig cards expose none, while the Measure tab asserts the model is "solved from sourced
force-extension laws with no fitted parameters". The reviewer recovered them by fitting the model's
own outputs at four sarcomere lengths — which is how finding 1 was found, and is not work a
reviewer should have to do.

**To resolve:** a parameter table in the Measure tab: region, contour length, persistence length,
stretch modulus, per-unit length, domain count, source DOI.

### 12 — MINOR — copy defects

**Status:** reported; all are one-sentence edits.

- Chapter 2's copy says folded Ig **and Fn3** domains alternate with disordered segments, while the
  frame is scoped to the I-band. True of the molecule; there are no Fn3 domains in the I-band.
- Chapter 4 is titled "Inspect its anchors" and narrates only the Z-disc anchor. The M-band end is
  a label and a card, never an explanation.
- Chapter 4 is tagged MEASURED but carries a functional inference — that the telethonin sandwich is
  *how* tension crosses the boundary — which under-weights the α-actinin/Z-repeat linkage.
- Chapter 3 silently overrides a presenter's chosen sarcomere length to 2,400 nm.
- The PEVK card's "31 PEVK repeats" cannot be reconciled by a reader with the 542 nm contour the
  engine uses.

### 13 — MINOR — model parameter questions for a specialist

**Status:** UNVERIFIED (literature). Raised, not adjudicated.

- Tandem Ig persistence length of 21 nm sits above the commonly cited 10–15 nm band.
- The PEVK contour implies 0.300 nm per residue exactly; the standard rise for an extended
  polypeptide is 0.34–0.38 nm. This shortens and stiffens PEVK, compounding finding 1 in the same
  direction.
- No slack length: the model solves a WLC at every length and reports 0.12 pN at SL 1,900, where
  skeletal titin should be slack at zero force.

---

## Comprehension results (lay persona)

Answers to the five `lay_comprehension` questions, restricted to what the page taught:

| Question | Result |
|---|---|
| `identify_titin` | **Answered, confident.** The pink strand. Chapter 1 copy, the legend, and the Titin object card all agree. |
| `identify_anchors` | **Answered, partial.** Z-disc and M-band, from the two in-scene labels; chapter 4 explains only the Z-disc end. |
| `length_change` | **Answered, confident.** I-band regions stretch, A-band does not, passive force rises. Chapter 3 plus the Stretch sweep plus the Measure tab. |
| `not_the_motor` | **Effectively NOT FOUND.** The word "motor" appears once on the site, in an Evidence-mode expert card's *Not claimed* list ("that titin is the actomyosin motor"). The guided route never says it, and nothing explains what does shorten muscle. |
| `measured_vs_schematic` | **Answered, confident.** The per-object `Claim … · render …` badge, the per-chapter evidence class, and chapter 6's statement of the rule. Described by the reviewer as the site's strongest feature. |

Four of the five are scored. One of the four scored questions is not answerable from the page.

### Prior-knowledge leak — what the persona knew that the page never taught

Reproduced because it is the part of this exercise a human participant cannot give you:

> That myosin pulling on actin shortens muscle · what a sarcomere is · that Ig = immunoglobulin-like
> and Fn3 = fibronectin type III · that N-terminus and C-terminus are the two ends of a protein,
> needed to parse the `N ·` and `C ·` anchor labels · that PEVK is named for its amino acid
> composition · that titin is the largest protein in the human body · that Lp means persistence
> length · that d10 is an X-ray lattice spacing · that "entropic spring" describes a disordered
> chain resisting extension · that titin is the main source of passive muscle tension.

The most consequential item is the first: **the site never explains contraction at all**, so
`not_the_motor` cannot be answered by a participant without prior knowledge.

The second is that **"sarcomere" is in the page title, the first sentence and every control label,
and is defined nowhere.**

### Terms used without expansion

`Ig` · `Fn3` · `N2A` · `PEVK` · `Z1Z2` · `N-termini` / `C-terminal` · `telethonin` / `T-cap` ·
`alpha-actinin` · `nebulin` · `super-repeat` · `C-zone` · `bare zone` · `d10 spacing` ·
`compliance share` · `Lp` · `contour` · `azimuth` · `MyBP-C` · `CARP` · `UN2A` · `isovolumetric` ·
`Poisson ratio` · and the raw identifiers `titin_story`, `prox_Ig`, `dist_Ig`, `zdisc`, `mline`,
`czone`, `mybpc`.

### Interaction observations

- **The Stretch sweep is the best teaching moment on the site and is nearly wasted.** Run from a
  zoomed-out chapter camera it teaches nothing; run at a framing that fits the half-sarcomere it
  delivers the whole of `length_change` visually. Nothing tells a viewer to watch the brackets, and
  the model grows off the right edge mid-sweep.
- Six of twelve component toggles are disabled on arrival, explained only by a `title` tooltip.
  Telethonin — the subject of chapter 4 — is among them, and reaching it requires discovering the
  `zdisc` close-up button first.
- Three differently-labelled controls ("Evidence", "Evidence & controls", "Evidence & sources")
  open the same drawer.
- The pinned object card can cover the structure it describes after a close-up flight, and its text
  is duplicated in the drawer.
- Chapters 6 and 7 pull the camera far enough back that the model is a hairline on black.

---

## Expert protocol verdicts

All seven returned **DEFENSIBLE**, with the reservations recorded as findings above.

| # | Question | Verdict |
|---|---|---|
| 1 | N2A reference visible without burdening the general story | DEFENSIBLE — reservation: Q8WZ42 canonical is the inferred-complete composite, which no muscle expresses; not flagged on the page |
| 2 | Titin continuous and correctly routed | DEFENSIBLE on continuity — the eight region spans tile the half-sarcomere exactly, 0 → 1,100 nm, no gap or overlap. Distal routing is finding 2 |
| 3 | Spring mechanics without normalizing domain unfolding | DEFENSIBLE — called the strongest part of the site. No domain ever unfolds; forces stay an order of magnitude below the Ig equilibrium band |
| 4 | Z-disc and M-band simplifications | DEFENSIBLE — the Not-claimed lists retire the common cartoon errors explicitly |
| 5 | MyBP-C without a false bridge or titin contact | DEFENSIBLE — described as exemplary restraint |
| 6 | Static evidence presented as a measured trajectory | DEFENSIBLE — the scope banner switches to "Computed intermediate geometry" during the sweep; the force tag stays MODELED |
| 7 | Artistic devices looking like observations | DEFENSIBLE — the render's own devices are enumerated as devices in the Not-claimed register |

---

## What the review affirmed

Recorded because a findings document that lists only defects misrepresents the artifact.

- **The mechanics engine is real.** The reviewer sampled it at four sarcomere lengths and
  reconstructed the force law from its outputs, reproducing the published compliance split exactly
  and regional spans to within 0.5%. Nothing is keyframed.
- **The force magnitudes are physiologically right** — 0.52 pN at SL 2,200 and 1.47 pN at 2,400,
  and the site correctly refuses to call them total passive tension.
- **The model documents having been wrong and fixed**, retaining the superseded partition and the
  reason for its rejection — an implied 6.86 pN inside the Ig fold/unfold band — and recording that
  re-labelling to MODELED was "a small DOWNGRADE in declared confidence, which is the honest
  direction."
- **The d10 handling is correct** including the constant-volume scaling, with the idealization
  confessed on screen.
- **All 46 bibliography records resolve** and were judged appropriate to the claims they back, with
  the exceptions at findings 5 and 6.
- **Invalid URL state is reported and replaced visibly**, with the reason.
- **The guided route's pacing is right.** Seven chapters, about two minutes; the lay persona said it
  would have finished voluntarily and was disappointed the route ends on a provenance dashboard
  rather than on titin.

The expert persona's summary: *"the framework is better than the field standard, and it is the
contents that have errors … What let it down is arithmetic, not judgment."*

---

## Recommended disposition

| Tier | Findings | Character | Who decides |
|---|---|---|---|
| 1 | 7, 8, 9 | Presentation defects, no science touched. Finding 7 also closes a gate that currently claims something untrue. | Implementer |
| 2 | 3, 4, 5 | Self-consistency and bookkeeping. Uses only numbers and sources already in the repository. Finding 4 must land with finding 3. | Implementer, with the ordering noted |
| 3 | 1, 2, 6, 13 | Scientific record changes with downstream effects on the force balance, the claim matrix, the fingerprint, the release pack and the capture matrix. | A named specialist |
| 4 | 12, and the two comprehension gaps | Copy. Defining "sarcomere" and stating plainly that titin is not the motor would close the one scored comprehension question the page cannot currently answer. | Author |

Tier 3 is the reason to run the real `expert_review` gate rather than to act on this document.
Findings 1 and 6 are exactly the kind of call that needs a name attached to it.

---

## Provenance

- Reviewed build `c079c03d56c4`, deployed, read from `window.__titinBuild.fingerprint`.
- Lay persona: agent `a04fad8ca6036b9fa`, 117 tool calls, 897 s.
- Expert persona: agent `ac27e9259d62f68a2`, 91 tool calls, 1,332 s.
- Neither agent had repository access. Findings marked VERIFIED were confirmed afterwards against
  the repository by the session that commissioned them; the file and line are given in each case.
- Nothing in this document has been written to `data/release_gates.json`. `visual_matrix`,
  `lay_comprehension`, `expert_review` and `demo_rehearsal` remain PENDING, and `release_ready`
  remains false.
