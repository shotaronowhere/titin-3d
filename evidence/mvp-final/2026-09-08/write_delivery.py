"""Write candidate-level delivery facts only after their checks have completed."""
from pathlib import Path
import hashlib
import json
import re
here = Path(__file__).resolve().parent
root = here.parents[2]
m = json.loads((root/'release/MANIFEST.json').read_text())
checks = json.loads((here/'final-check-results.json').read_text())
assert checks['app_revision'] == m['app_revision']
assert {r['name'] for r in checks['results']} == {'verify','identity','chromium','keyboard-picking','firefox','webkit'}
assert all(r['exit_code'] == 0 for r in checks['results'] if r['name'] != 'webkit')
webkit = next(r for r in checks['results'] if r['name'] == 'webkit')
coverage = json.loads((here/'coverage-decision.json').read_text())
assert coverage['app_revision'] == m['app_revision'] and coverage['webkit_status'] == 'not_verified'
assert webkit['exit_code'] != 0
reproduction = json.loads((here/'reproduction.json').read_text())
assert reproduction['byte_identical']
assert json.loads((root/'data/release_gates.json').read_text())['release_ready'] is False
counts = {}
for engine in ('chromium','keyboard-picking','firefox'):
    matches = re.findall(r'(\d+) passed', (here/f'final-{engine}.log').read_text())
    assert matches, engine
    counts[engine] = int(matches[-1])
node_log = (here/'final-verify.log').read_text()
assert '# tests 618' in node_log and '# pass 618' in node_log and '# fail 0' in node_log
retry_note = '\nWebKit verification is incomplete. Two runs encountered timeout stalls during basic element/click operations and were interrupted. The cause is unestablished; the second run used the same source, assertions, and timeouts with process-scoped idle-sleep prevention. Both runs and traces are retained. The approved final plan allows the verified Chromium/Firefox coverage fallback; no verified WebKit support is claimed.\n'
manifest_hash = hashlib.sha256((root/'release/MANIFEST.json').read_bytes()).hexdigest()
(here/'DELIVERY.md').write_text(f'''# Titin scientist-feedback preview — September 8, 2026

This is the bounded final preview for researcher feedback. It supersedes the September 6 preview. Start with **SCIENTIST_NOTE.md**, then open **index.html** beside this file. Keep the complete **release/** folder.

## Candidate identity

| Identity | Value |
|---|---|
| Application source revision | `{m['app_revision']}` |
| Scientific model fingerprint | `{m['model_fingerprint']}` |
| Build-input fingerprint | `{m['build_inputs_fingerprint']}` |
| index.html SHA-256 | `{m['standalone']['sha256']}` |
| release/MANIFEST.json SHA-256 | `{manifest_hash}` |

The model fingerprint is unchanged from the reviewed reference model. All 24 tracked scientific/data JSON and dependency files checked against the prior baseline remain byte-identical. Source, generated HTML, manifest, and ZIP identities are different concepts; the ZIP's own hash belongs outside the archive.

## What changed

Scope details now uses the canonical tissue-neutral reference wording. Architecture correctly recognizes Folded titin domains as a titin aggregate, with reference-wide metadata and no fabricated residue interval. The Stretch lesson begins in a stable comparison frame and preserves it through supported-range interaction; desktop labels identify the extensible I-band and the A-band span fixed in this model. Native keyboard controls and the final evidence route work without trapping the reader in the phone inspector. Intermediate force labels respect the existing precision policy. The final beat exposes titin's evidence directly, object sources appear above the long explanation, and the force result and graph precede the full audit prose. The six static fallback slides have been repaired and visually inspected.

## Completed candidate checks

- Full repository verification: **618/618 Node tests**, no failures or skips, plus TypeScript, generated-output currency, scientific validators, negative controls, export validation, gate consistency, and structure-pipeline checks.
- Chromium: **{counts['chromium']}/{counts['chromium']}** integrated checks across Tour, Stretch, evidence, workbench/exports, smoke, and UX suites. The large parameterized `@sweep` set is excluded; the dedicated Stretch interaction suite is included.
- Additional Chromium keyboard/touch picking checks: **{counts['keyboard-picking']}/{counts['keyboard-picking']}**.
- Firefox: **{counts['firefox']}/{counts['firefox']}**, across the preview, Stretch, Tour, and evidence suites. These are engine checks on this host, not physical-device or every-platform certifications. **WebKit is not verified**; see the coverage note below.
- A clean detached Git worktree, installed from the dependency lock, reproduced **{len(reproduction['files'])} candidate files byte-for-byte**, including the standalone and complete generated release tree.
- All six SVG fallback slides were rendered at 1920×1080 and inspected; their measured text audit reports **zero collisions and zero overflows**.

{retry_note}
The external package record binds the delivered ZIP to these candidate bytes and records the extracted-file, offline-walkthrough, and export checks. Archive identity and package-level evidence are retained outside the ZIP to avoid self-referential hashing.

## Scope and remaining limits

This is an AI-assisted educational reference model shared to solicit scientific corrections. Independent scientific validation, human learning outcomes, physical-device evidence, and hosting parity remain unestablished. **release_ready remains false.** Passing engineering checks does not prove every biological interpretation.

Q8WZ42-1 carries no assigned tissue-specific construct. The depiction is partly schematic and does not establish biological copy number. Force is a literature-parameter estimate per titin, with explicit preparation transfers and regime limits. Parameter sensitivity is not a confidence interval. Active contraction, calcium activation, and domain unfolding are not simulated. Detailed scientific limitations are in **release/LIMITATIONS.md** and the object/source records.

The recommended route is the five-beat Tour followed by its final evidence action, in desktop Chrome or Firefox with WebGL. WebKit verification is incomplete. Phone layouts were reviewed at 390×844 and the existing narrow Stretch cases; this is browser emulation. Extreme short-screen behavior, the broader Research Large type behavior, and unrelated object-invoker focus edge cases remain outside this bounded pass. Long Stretch span labels intentionally withdraw on narrow screens. The opening and scaffold use the established views without another anatomy or renderer redesign.

If 3D is unavailable, use the six SVGs in **release/fallback/** or **release/LEARN_TRANSCRIPT.md**. No hosting destination was published and no recipients were messaged as part of this handoff.
''')
print('Wrote verified candidate delivery record.', counts)
