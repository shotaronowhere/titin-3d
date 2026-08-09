# Titin 3D Visualization

A scientifically traceable Three.js visualization of titin in sarcomere context. The
JSON records in `data/` are the scientific source of truth; the renderer and public
API consume those records rather than restating biological constants.

**Project status:** the scoped MVP is complete through Phases 0–10 and Milestones
0–6. Phases 11–12 in `MASTER_PLAN.md` remain optional future extensions. Showcase
completion now follows
`docs/superpowers/plans/2026-08-09-titin-mvp-readiness-synthesis.md`. SC-18 is
`CODE_COMPLETE_BLOCKED_SCIENCE`: every repository-controlled implementation,
identity, boundary, release-gate, and Chromium check passes, while human recruitment
and physical/manual hardware evidence are explicitly deferred and remain `PENDING`.
SC-19 is `NOT_READY` until qualified SD-01–SD-05 reviewer candidates confirm
availability; SC-19 through SC-27 remain planned work. The immutable SC-18 candidate
and its evidence are summarized in `docs/sprint-reports/SC-18.md`.

The release pack in `release/` is generated and staleness-gated. The complete final
release definition is tracked in `data/release_gates.json`; scientific decisions,
claim entailment, mechanical validity, human/browser review, target-hardware evidence,
deployment parity, and final release work remain outstanding. The showcase is not yet
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

## Guided and Evidence modes

The application opens in **Guided** mode: the 3D stage remains full width, the
reference scope and current geometry stay visible above the fold, and a concise
seven-chapter card walks from locating titin to how the model was built, without
showing the raw evidence inventory. The route is paced to about two minutes.
Choose **Evidence** (or **Evidence & controls**) to open every existing control,
measurement, annotation, caveat, confidence group, and advanced close-up.

The four named length buttons are explicitly geometry presets. Sarcomere length
does not set calcium activation. The 1,900 nm and 3,000 nm reference states are
visibly marked outside the declared 2,000–2,400 nm working range; the 3,000 nm
state is illustrative. The URL hash records the supported presentation state, so
copying the browser address preserves audience mode, chapter, length, scale,
named camera, selected region/component, and evidence display. Invalid shared
state is reported visibly and replaced with a documented safe default.

Hover a visible structure for a concise explanation, or click/tap it to pin the
full evidence-linked annotation. A pinned card exposes claim and render evidence,
lay and expert explanations, scope, render meaning, non-claims, and human-readable
source links. Keyboard users can focus the 3D stage, move through currently visible
structures with Left/Right Arrow, pin with Enter or Space, and close with Escape.

## The stage and its controls

The primary controls sit on a **stage bar** below the model in both audience
modes, because Guided is a reduced set of explanations and not a reduced set of
controls: sarcomere length, the reviewed length presets, the named views, the
actin/myosin context toggle, and **▶ Stretch**, which sweeps the sarcomere across
the declared working range so the difference between regions that straighten and
regions that extend is something to watch rather than something to read. The
sweep stops on any other interaction and, under `prefers-reduced-motion`, moves
between the two endpoint states instead of animating between them. Beside it the
bar carries the **passive force** one titin molecule bears at the current length,
solved from sourced force–extension laws and labelled with its evidence class;
the Measure tab plots the same curve with the current length marked and the
compliance share of each I-band region.

A presenter can drive the whole route from the keyboard: digits 1–7 step the
chapters, `r` restarts, `x` shows regional extension, `e` opens Evidence, `g`
returns to Guided, and the space bar runs the stretch sweep. The keys are listed
on the stage, and the three the presenter script depends on are resolved from
`data/presentation.json` rather than written into the page.

The Evidence drawer is **tabbed** — Inspect, Measure, Evidence, and *Sources &
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

Run the complete Phase 10 release gate:

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
| `release/PRESENTER_SCRIPT.md` | the guided route as a presenter reads it, with per-chapter timings |
| `release/PREFLIGHT.md` | the demo-day checklist, including the build fingerprint to compare |
| `release/SCREENSHOT_PACK.md` | the 52-cell deterministic capture set, each a viewport plus a URL hash |
| `release/fallback/*.svg` | six static slides generated from this build; no GPU, browser engine, or network |
| `release/MANIFEST.json` | the build fingerprint and artifact inventory |

The Evidence drawer shows a build fingerprint. Before a demonstration, confirm the
hosted page and the offline `index.html` show the same one; a page served from
unpinned source says so instead.

## Public modules

- `src/api/titinApi.js` — headless biological API
- `src/api/TitinVisualization.js` — supported Three.js/browser facade
- `src/api/TitinAnnotations.js` — evidence-aware annotation descriptors
- `src/model/` — specification loading, provenance, and model state
- `src/geometry/` — representation, lattice, and mechanical geometry
- `src/geometry/ZDiscDetail.js` and `src/geometry/MBandDetail.js` — SC-3
  source-limited, target-gated terminal-anchor detail descriptors
- `src/geometry/MyBPCContext.js` — SC-5 optional schematic MyBP-C C-zone context;
  Evidence-only, off by default, and structurally unable to reach a thin filament,
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
- `data/presentation.json` — sourced SC-1/SC-2 presentation contract and SC-5 Evidence-mode expert cards (no authoritative geometry)
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
`PHASE0_REVIEW.md` records the completed research audit and the remaining scientific
uncertainties, which are model limits rather than unfinished provenance work.

The project content is licensed under CC BY 4.0; see `LICENSE`.
