# Developing Titin-3D

[Project introduction and demo](../README.md) · [Architecture](../ARCHITECTURE.md)

Titin-3D is a standalone Three.js application. Structured scientific records feed
its biological model; the public facade and renderer consume that model. The
five-beat Tour leads into a contextual Research workbench with Inspect, Measure,
Evidence, and Sources & build tabs.

Commands below run from the repository root.

## Setup

Use the recorded Node.js **20.19.2** from [.node-version](../.node-version)
(supported floor: 20.19), **npm 11.5.2** from
[package.json](../package.json), and **Python 3.12+**. Select the Node version
with your version manager, then install the locked environment:

```sh
node --version
npm --version
python3 --version
npm ci
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
npm run browser:install
```

Reuse an existing compatible `.venv` rather than replacing it. Activate it in
**every shell running checks**, including `npm test`: Node tests and npm scripts
also invoke bare `python3`. Confirm the interpreter:

```sh
. .venv/bin/activate
python3 -c 'import sys; print(sys.executable)'
```

The printed path must be inside this checkout's `.venv`. `npm ci` preserves
[package-lock.json](../package-lock.json); Python package versions are pinned in
[requirements.txt](../requirements.txt). Do not update locks as a side effect of
presentation work.

## View and edit

Open the committed [index.html](../index.html) directly, or serve the root:

```sh
npm run serve
```

Open [the local standalone](http://localhost:8000/). It embeds Three.js, the
project modules, and scientific JSON and works from `file://` without siblings.
External links use the network only when followed. The error panel offers online
recovery; offline diagrams need the companion `release/fallback/` files.

Edit [src/index.template.html](../src/index.template.html), never the generated
root HTML. For source-mode browser testing, the existing loopback test server
maps `/source.html` to the template with root-relative modules and data:

```sh
node scripts/serve_browser_tests.mjs --port 4173
```

Open [the source page](http://127.0.0.1:4173/source.html). Source mode needs HTTP,
installed dependencies, and sibling data files. Stop this manual server before
running Playwright, which starts its own server.

## Build and candidate identity

During iteration, regenerate the standalone and companion package in order:

```sh
npm run build
npm run pack
npm run check:build
npm run check:pack
```

`npm run build:standalone` is an alias for `npm run build`. The source template,
modules, package lock, build scripts, and scientific inputs determine the
standalone. Do not edit generated `index.html` or `release/` by hand.

For a final candidate, commit the reviewed application inputs first, then run:

```sh
npm run build:release
npm run pack
npm run check:build
npm run check:pack
npm run verify:identity
```

`build:release` rejects dirty application inputs. Its name describes artifact
generation, not a passed scientific release gate. Commit the generated outputs
before writing evidence that identifies their commit.

[Build identity rules](../scripts/build_identity.mjs) distinguish:

| Identity | What it binds |
|---|---|
| `model_fingerprint` | Primary quantitative and geometry input bytes |
| `app_revision` | Most recent Git commit affecting discovered application inputs |
| `build_inputs_fingerprint` | All deterministic standalone inputs, including bundled dependencies |
| `model_input_manifest_fingerprint` | Ordered model-input path/checksum rows, verifiable in the browser |
| HTML SHA-256 | Exact standalone bytes, held externally in the release manifest |

README, post-candidate evidence, and generated artifact commits do not advance
`app_revision`. Static portfolio media are outside the application graph and
have separate hashes in the readiness record. Research → Sources & build shows
the candidate's model, application, and build identities. Source mode explicitly
lacks a candidate manifest and cannot invent export checksums.

Preserve source-commit ancestry when integrating. Squashing, rebasing, or
cherry-picking can change `app_revision` even if source text is identical. If
history changes, regenerate and verify locally **before** publishing.

## Choose checks by the change

Keep Playwright serial (`workers: 1`) and run browser commands sequentially.
Do not change application inputs during a final validation run.

The bounded presentation check is:

```sh
. .venv/bin/activate
npm run check:build
npm run check:pack
npm run typecheck
npm test
npm run verify:identity
npm run validate:gates
npx playwright test test/browser/smoke.spec.js --project=chromium
npx playwright test test/browser/smoke.spec.js --project=firefox
npx playwright test test/browser/smoke.spec.js --project=webkit
npx playwright test test/browser/workbench.spec.js test/browser/evidence.spec.js --project=chromium
```

`validate:gates` checks truthful gate records; a pass does not imply
`release_ready: true`. Report failed engine setup separately from application
assertion failures. Automated WebKit is not physical Safari/iPhone certification.

| Change | Additional existing coverage |
|---|---|
| Guide, camera, Stretch or shared layout | `guide-disclosure.spec.js`, `guide-playback.spec.js`, `mvp-preview.spec.js`, `final-polish.spec.js` in affected engines |
| Tour/Research shell, history, overlays, viewport accessibility | Relevant `ux-overhaul.spec.js` cases; `--grep-invert @sweep` selects the bounded shell matrix |
| Exhaustive label matrix | `npx playwright test --project=chromium --grep @sweep` |
| Scientific model, source records, or a full scientific candidate | The full repository gate plus affected browser and human protocols |

The broader current engineering gate is `npm run verify:sc27a`; older
`verify:scN` commands remain available for their named subsystems. For exhaustive
repository validation:

```sh
npm run verify
```

That command adds scientific validators, generated-data currency checks,
negative controls that reject invalid inputs, and an offline synthetic fixture
for the Gemmi/NumPy structure pipeline. It does not perform independent human
claim review. Choose additional checks by affected behavior; do not carry old
test counts or timings into a new candidate's evidence.

The documentation-move contracts can be checked separately:

```sh
node --test --test-concurrency=1 test/showcase_phase9.test.js test/showcase_phase27a.test.js
```

## Generated companion materials

The [release/](../release/) package is generated and staleness-gated. Its main
reading routes are:

| Artifact | Purpose |
|---|---|
| [Claim matrix](../release/CLAIM_MATRIX.md) | Claims, decisions, evidence classes, sources, and non-claims |
| [Limitations](../release/LIMITATIONS.md) | Recorded non-claims, grouped by their source record |
| [Scientific authority](../release/SCIENTIFIC_AUTHORITY.md) | Provenance and interpretation boundaries |
| [Presenter script](../release/PRESENTER_SCRIPT.md) | Tour route, timing, and supported shortcuts |
| [Text Tour](../release/LEARN_TRANSCRIPT.md) | Generated Tour transcript; legacy filename retained for compatibility |
| [Screen-reader transcript](../release/SCREEN_READER_TRANSCRIPT.md) | Spoken sequence, state announcements, and actions |
| [Preflight](../release/PREFLIGHT.md) | Rehearsal checklist and identity to compare |
| [Screenshot matrix](../release/SCREENSHOT_PACK.md) | Deterministic viewport and URL-state manifest, not actual captured images |
| [Static diagrams](../release/fallback/) | Six SVG slides usable without WebGL |
| [Manifest](../release/MANIFEST.json) | Build identity and generated artifact inventory |

To reproduce optional coordinate measurements, fetch and verify the pinned raw
structure cache:

```sh
npm run fetch:structures
npm run check:structures
```

[data/structures/manifest.json](../data/structures/manifest.json) pins the source
URLs, byte counts, and SHA-256 values. The downloaded coordinate files are not
needed for ordinary viewing or the synthetic-fixture check.

## Public modules

- [src/api/titinApi.js](../src/api/titinApi.js) — headless biological API
- [src/api/TitinVisualization.js](../src/api/TitinVisualization.js) — supported Three.js/browser facade
- [src/api/TitinAnnotations.js](../src/api/TitinAnnotations.js) — evidence-aware annotation descriptors
- [src/model/](../src/model/) — specification loading, provenance, and model state
- [src/geometry/](../src/geometry/) — representation, lattice, and mechanical geometry
- [src/geometry/ZDiscDetail.js](../src/geometry/ZDiscDetail.js) and [src/geometry/MBandDetail.js](../src/geometry/MBandDetail.js) — SC-3
  source-limited, target-gated terminal-anchor detail descriptors
- [src/geometry/MyBPCContext.js](../src/geometry/MyBPCContext.js) — SC-5 optional schematic MyBP-C C-zone context;
  Research-only, off by default, and structurally unable to reach a thin filament,
  depict a rigid thick-to-thin bridge, or claim a titin contact
- [src/geometry/LatticeCrossSection.js](../src/geometry/LatticeCrossSection.js) — SC-6 two-panel orthographic lattice comparison;
  plane coordinates plus one shared scale, so the educational cross-section cannot
  foreshorten and the two panels cannot be normalised independently
- [src/render/](../src/render/) — Three.js scene and viewer
- [src/presentation/StoryController.js](../src/presentation/StoryController.js) — validated narrative state and URL codec
- [src/presentation/ShowcaseOverlay.js](../src/presentation/ShowcaseOverlay.js) — SC-2 continuity, landmark, and live extension descriptors derived from canonical geometry
- [src/presentation/ProvenancePipeline.js](../src/presentation/ProvenancePipeline.js) — SC-7 build pipeline whose every figure is
  counted from the loaded records at render time rather than written into the copy
- [src/presentation/VisualMatrix.js](../src/presentation/VisualMatrix.js) — SC-8 deterministic capture set; every cell is a
  viewport plus a URL hash that is round-trip checked, so a screenshot can be returned to
- [src/presentation/AnnotationCatalog.js](../src/presentation/AnnotationCatalog.js) — SC-4 annotation validation and citation/link resolution
- [data/presentation.json](../data/presentation.json) — sourced SC-1/SC-2 presentation contract and SC-5 Research-only expert cards (no authoritative geometry)
- [data/annotations.json](../data/annotations.json) — validated SC-4 dual-audience object explanations and scientific bindings
- [data/geometry_strategy.json](../data/geometry_strategy.json) — current defect/completion register
- [data/release_gates.json](../data/release_gates.json) — SC-8 release-gate record; a gate cannot be marked passed
  without the evidence that earned it (`npm run validate:gates`)

`placeDomainsAlongPath` accepts only canonical, already-computed paths. It rejects
partial, reordered, shifted, uniformly resampled, or otherwise caller-invented
geometry. Headless APIs reject out-of-range sarcomere lengths; the interactive facade
may clamp them only while disclosing the requested and applied values.

## Scientific and implementation history

The scientific identity is [human TTN reference Q8WZ42-1](../data/scientific_scope.json),
without an assigned tissue-specific construct. Evidence classes are not
interchangeable. Approximate passive force estimates and cross-preparation
transfers retain their stated ranges; sensitivity is not a confidence interval.
Independent human entailment review remains pending.

The scoped MVP covered Phases 0–10 and Milestones 0–6. Phases 11–12 of
[MASTER_PLAN.md](../MASTER_PLAN.md) remain optional extensions. The
[historical readiness synthesis](superpowers/plans/2026-08-09-titin-mvp-readiness-synthesis.md)
records the SC-18/SC-19 `CODE_COMPLETE_BLOCKED_SCIENCE` handoffs. Later
owner-authorized citation-backed AI adjudication is explicitly not independent
human scientific review. See the dated [sprint reports](sprint-reports/),
[PROGRESS.md](../PROGRESS.md), and [formal gates](../data/release_gates.json)
for the sequence, decisions, and outstanding human prerequisites.

[September 9 delivery](../evidence/mvp-final/2026-09-09/DELIVERY.md) and
[September 10 guide evidence](../evidence/ux/guide-fixes-2026-09-10/README.md)
identify their own candidates and coverage. Current presentation evidence lives
in the [September 20 readiness record](../evidence/linkedin-readiness/2026-09-20/READINESS.md).

## GitHub Pages and sharing

The existing GitHub Pages source is `main` at `/`, serving the committed
standalone at [the clean demo URL](https://shotaronowhere.github.io/titin-3d/).
A push to that branch publishes; do not substitute a new deployment system.
Preserve the prior publication commit for an ordinary corrective/revert commit.

After authorized publication, check actual served HTML against the local candidate:

```sh
node scripts/verify_artifact_identity.mjs \
  --file index.html \
  --manifest release/MANIFEST.json \
  --url https://shotaronowhere.github.io/titin-3d/
```

That command verifies HTML, not the whole hosted tree. Check social PNGs, fallback
SVGs, and the rendered README separately. The static `<head>` contains the Pages
preview metadata. The separate GitHub repository social image must be set in
repository settings; it is not configured by `og:image`. Owner review, deployment
parity, LinkedIn preview inspection, and a saved Featured item are distinct steps.
