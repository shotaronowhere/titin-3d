# Titin 3D Visualization

A scientifically traceable Three.js visualization of titin in sarcomere context. The
JSON records in `data/` are the scientific source of truth; the renderer and public
API consume those records rather than restating biological constants.

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

## Development requirements

- Node.js 20.19 or newer
- Python 3.12 or newer

Install the exact JavaScript and Python environments:

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Run the complete Phase 9 release gate:

```sh
npm run verify
```

This checks production JavaScript with strict TypeScript analysis, rejects a stale
generated `index.html`, tests the standalone artifact, runs the Node test suite,
validates the scientific specification, and exercises the Gemmi/NumPy
structural-coordinate pipeline with an offline synthetic fixture. It also runs the
destructive-in-memory/on-restored-copy negative controls that prove the scientific
guards reject invalid geometry.

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
controls set sarcomere length, structural state, component visibility, scale, and
close-up target. Evidence-aware annotations are available through the same facade.
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

## Public modules

- `src/api/titinApi.js` — headless biological API
- `src/api/TitinVisualization.js` — supported Three.js/browser facade
- `src/api/TitinAnnotations.js` — evidence-aware annotation descriptors
- `src/model/` — specification loading, provenance, and model state
- `src/geometry/` — representation, lattice, and mechanical geometry
- `src/render/` — Three.js scene and viewer
- `data/geometry_strategy.json` — current defect/completion register

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
