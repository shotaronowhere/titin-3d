# Titin 3D Visualization

A scientifically traceable Three.js visualization of titin in sarcomere context. The
JSON records in `data/` are the scientific source of truth; the renderer and public
API consume those records rather than restating biological constants.

**Project status:** the scoped MVP is complete through Phases 0–10 and Milestones
0–6. Phases 11–12 in `MASTER_PLAN.md` remain optional future extensions. Showcase
completion now follows
`docs/superpowers/plans/2026-08-09-titin-mvp-readiness-synthesis.md`. SC-18 and
SC-19 reached their required historical `CODE_COMPLETE_BLOCKED_SCIENCE` handoffs.
On 2026-08-12 the project owner authorized citation-backed AI adjudication of
SD-01–SD-05 without representing it as independent human review. SC-20 is complete:
SD-01, SD-03, and SD-05 were `APPROVED`; SD-02 and SD-04 were initially `DEFERRED` with
enforced public caveats. A later owner-authorized citation-backed ruling completed SC-21 mechanics,
and SC-22 completed the canonical responsive claim/source presenter. SC-23 through SC-26 are
**ENGINEERING COMPLETE**: the presentation curriculum and semantic scenes, responsive controls,
deterministic picking, and the expert/reproducible-research workbench are implemented. SC-27A is
**IMPLEMENTATION COMPLETE; FINAL FREEZE BLOCKED**: the public route is a five-beat Tour with
contextual mechanics and a four-tab Research workbench, and all automated engineering gates pass,
but its real-human target/formative prerequisites have not occurred.
On 2026-08-14 the project owner approved the evidence-backed opening sarcomere and actomyosin
claims; their provenance explicitly records that independent human review was not performed. The handoffs are
summarized in `docs/sprint-reports/SC-18.md`, `docs/sprint-reports/SC-19.md`,
`docs/sprint-reports/SC-20.md`, `docs/sprint-reports/SC-21.md`,
`docs/sprint-reports/SC-22.md`, `docs/sprint-reports/SC-23.md`,
`docs/sprint-reports/SC-24.md`, `docs/sprint-reports/SC-25.md`,
`docs/sprint-reports/SC-26.md`, and `docs/sprint-reports/SC-27A.md`.

The release pack in `release/` is generated and staleness-gated. The complete final
release definition is tracked in `data/release_gates.json`; claim entailment,
mechanical validity, human/browser review, target-hardware evidence, deployment
parity, and final release work remain outstanding. The showcase is not yet
release-ready, `release_ready` remains `false`, and `npm run validate:gates` rejects
any unsupported readiness claim.

## Open the visualization

`index.html` is the complete application. It embeds Three.js, the project modules,
and all scientific JSON records, so it makes no network requests and has no runtime
installation step.

On macOS:

```sh
open index.html
```

Alternatively, double-click `index.html`, or serve the repository and open
<http://localhost:8000/>:

```sh
npm run serve
```

The same committed root file can be published directly with GitHub Pages using
**Deploy from a branch → `main` → `/(root)`**. No Pages-specific build workflow is
required.

## Tour and Research modes

The application opens in **Tour** mode: the 3D stage remains the hero and a concise five-beat
card moves from the sarcomere through titin's route, passive spring, thick-filament scaffold,
and evidence-aware recap without dumping the raw inventory. Mechanics appear contextually in
the Stretch beat. Choose **Research** to open the full Inspect, Measure, Evidence, and Sources &
build workbench.

The four named length buttons are explicitly geometry presets. Sarcomere length
does not set calcium activation. The 1,900 nm and 3,000 nm reference states are
visibly marked outside the declared 2,000–2,400 nm working range; the 3,000 nm
state is illustrative. The URL hash records the supported presentation state, so
copying the browser address preserves audience mode, beat, length, scale,
named camera, selected region/component, and evidence display. Invalid shared
state is reported visibly and replaced with a documented safe default.

Hover a visible structure for a concise explanation, or click/tap it to pin the compact Tour
explanation. Its single “Why we know this” route opens the full evidence-linked record and exact
sources in Research. Keyboard users can focus the 3D stage, move through currently visible
structures with Left/Right Arrow, pin with Enter or Space, and close with Escape.

## The stage and its controls

Tour keeps Previous/Next and Research as its persistent controls. The Stretch beat adds the
sarcomere-length slider, **▶ Stretch**, and a status-bearing force route, while all scene, camera,
layer, region, measurement, and source controls remain in Research. Stretch sweeps the sarcomere
across the declared working range so the difference between regions that straighten and regions
that extend is something to watch rather than something to read. The
sweep stops on any other interaction and, under `prefers-reduced-motion`, moves
between the two endpoint states instead of animating between them. The Measure tab retains the
status-bearing force curve, regional extension, incremental compliance, and the exact SD-04
validity/non-claim disclosures.

A presenter can drive the route from the keyboard: digits 1–5 enter the matching beats, `r`
restarts, `x` enters the complete Stretch beat, `e` opens Research, `g` returns to Tour, and the
space bar runs the stretch sweep. The accelerators are included in the accessible canvas
description rather than painted as a second navigation vocabulary, and the presenter script
resolves them from `data/presentation.json`.

The Research workbench is **tabbed** — Inspect, Measure, Evidence, and *Sources &
build* last — so the controls are reachable without scrolling past two screens of
prose, and the bibliography, which lists every record in the canonical registry
and marks the ones this build actually cites, is where a reader looks for it
rather than where they first trip over it. The drawer head also carries a **Large
type** toggle for a projector or the back of a room.

## Development requirements

- Node.js 20.19 or newer
- Python 3.12 or newer

Install the exact JavaScript and Python environments:

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Run the complete repository gate:

```sh
npm run verify
```

This checks production JavaScript with strict TypeScript analysis, rejects a stale
generated `index.html`, tests the standalone artifact, runs the Node test suite,
validates the scientific specification, and exercises the Gemmi/NumPy
structural-coordinate pipeline with an offline synthetic fixture. It also runs the
destructive-in-memory/on-restored-copy negative controls that prove the scientific
guards reject invalid geometry.

For routine showcase work on a local laptop, use a bounded serial gate instead of the
exhaustive destructive suite:

```sh
npm run build
npm run verify:sc2
npm run verify:sc3
npm run verify:sc4
npm run verify:sc5
npm run verify:sc6
npm run verify:sc7
npm run verify:sc8
```

The exhaustive `npm run verify` command is intended for release/CI validation.
For the focused current gate, run `npm run verify:sc27a`; run `npm run test:browser:sc27a` for the
six-viewport Chromium Tour/Research browser surface.

To reproduce the coordinate-derived measurements from the pinned RCSB inputs, fetch
the optional raw-structure cache and verify it before running the measurement scripts:

```sh
npm run fetch:structures
npm run check:structures
```

`data/structures/manifest.json` records the URL, byte count, and SHA-256 digest of
every input. The large downloaded coordinate files are a reproducible cache and are
not required by the clean-checkout release gate.

The page uses `TitinVisualization`, the supported browser facade. Its biological
controls set sarcomere length, structural state, component visibility, scale,
close-up target, and titin-region selection/focus. Region selection is a separate
colour channel from evidence opacity, persists through rebuilds, and follows the
region's live mechanical span. Evidence-aware annotations are available through the
same facade. Camera moves are smooth and interruptible, while the operating-system
reduced-motion preference is honored immediately.
The default intermediate-length partition is the common-force mechanical solution;
the historical keyframe interpolation remains available only as an explicitly named
reference/audit mode. Interactive clamping and interpolation caveats are disclosed
in the visible readout.

After changing `src/index.template.html`, application modules, dependencies, or
scientific data, regenerate the committed application:

```sh
npm run build
```

`npm run check:build` verifies that `index.html` exactly matches its current inputs.
`npm run build:standalone` remains as a compatibility alias for `npm run build`.

## Release and handoff pack

`release/` is a generated package, not a written one. Regenerate it whenever the
scientific data, the narrative, or the standalone build changes:

```sh
npm run pack
```

`npm run check:pack` fails if the committed pack is stale, so the leave-behind
cannot drift away from the science it describes.

| Artifact | What it is |
|---|---|
| `release/CLAIM_MATRIX.md` | every reviewed claim with its decision, evidence classes, sources, and non-claims |
| `release/LIMITATIONS.md` | every recorded non-claim in the project, grouped by the record that holds it |
| `release/PRESENTER_SCRIPT.md` | the Tour route as a presenter reads it, with per-beat timings |
| `release/LEARN_TRANSCRIPT.md` | the complete text-only Tour generated from presentation v3 (the path is retained for compatibility) |
| `release/SCREEN_READER_TRANSCRIPT.md` | the same conceptual sequence with spoken state announcements and actions |
| `release/PREFLIGHT.md` | the demo-day checklist, including the build fingerprint to compare |
| `release/SCREENSHOT_PACK.md` | the 48-cell deterministic capture set, each a viewport plus a URL hash |
| `release/fallback/*.svg` | six static slides generated from this build; no GPU, browser engine, or network |
| `release/MANIFEST.json` | the build fingerprint and artifact inventory |

Research → Sources & build shows the candidate identity. Before a demonstration,
confirm the hosted page and the offline `index.html` show the same model, app, and
build-input fingerprints; a page served from unpinned source says so instead.

## Public modules

- `src/api/titinApi.js` — headless biological API
- `src/api/TitinVisualization.js` — supported Three.js/browser facade
- `src/api/TitinAnnotations.js` — evidence-aware annotation descriptors
- `src/model/` — specification loading, provenance, and model state
- `src/geometry/` — representation, lattice, and mechanical geometry
- `src/geometry/ZDiscDetail.js` and `src/geometry/MBandDetail.js` — SC-3
  source-limited, target-gated terminal-anchor detail descriptors
- `src/geometry/MyBPCContext.js` — SC-5 optional schematic MyBP-C C-zone context;
  Research-only, off by default, and structurally unable to reach a thin filament,
  depict a rigid thick-to-thin bridge, or claim a titin contact
- `src/geometry/LatticeCrossSection.js` — SC-6 two-panel orthographic lattice comparison;
  plane coordinates plus one shared scale, so the educational cross-section cannot
  foreshorten and the two panels cannot be normalised independently
- `src/render/` — Three.js scene and viewer
- `src/presentation/StoryController.js` — validated narrative state and URL codec
- `src/presentation/ShowcaseOverlay.js` — SC-2 continuity, landmark, and live extension descriptors derived from canonical geometry
- `src/presentation/ProvenancePipeline.js` — SC-7 build pipeline whose every figure is
  counted from the loaded records at render time rather than written into the copy
- `src/presentation/VisualMatrix.js` — SC-8 deterministic capture set; every cell is a
  viewport plus a URL hash that is round-trip checked, so a screenshot can be returned to
- `src/presentation/AnnotationCatalog.js` — SC-4 annotation validation and citation/link resolution
- `data/presentation.json` — sourced SC-1/SC-2 presentation contract and SC-5 Research-only expert cards (no authoritative geometry)
- `data/annotations.json` — validated SC-4 dual-audience object explanations and scientific bindings
- `data/geometry_strategy.json` — current defect/completion register
- `data/release_gates.json` — SC-8 release-gate record; a gate cannot be marked passed
  without the evidence that earned it (`npm run validate:gates`)

`placeDomainsAlongPath` accepts only canonical, already-computed paths. It rejects
partial, reordered, shifted, uniformly resampled, or otherwise caller-invented
geometry. Headless APIs reject out-of-range sarcomere lengths; the interactive facade
may clamp them only while disclosing the requested and applied values.

## Scientific scope

Every displayed claim carries an evidence class and source record. `MEASURED`,
`STRONGLY INFERRED`, `MODELED`, `INFERRED`, `SCHEMATIC`, and `UNKNOWN` are distinct
and must not be silently promoted. Every adopted quantitative geometry source has
been checked against its primary record; each row records whether that check used
full text, an abstract, a database record, coordinates, or an executable model.
`data/scientific_scope.json` is the sole public identity ledger: the displayed
sequence is the pinned human TTN reference sequence Q8WZ42-1, not a claimed
tissue-specific human isoform. Mechanics transferred from rat-psoas preparations
remain identified as development transfers, and absolute-pN output is withheld.
`data/claim_support.json` records exact locators and limitations separately from
human entailment status; all independent human entailment reviews are still pending.
`PHASE0_REVIEW.md` records the completed research audit and the remaining scientific
uncertainties, which are model limits rather than unfinished provenance work.

The project content is licensed under CC BY 4.0; see `LICENSE`.
