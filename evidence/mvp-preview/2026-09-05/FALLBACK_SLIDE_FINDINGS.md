# Static fallback slide layout findings — 2026-09-06

Found while completing plan step 8.4, "open the static fallback slides too". Four measured
layout defects in the six generated SVGs. They are recorded and **not fixed in this pass**;
the reasoning is at the end. Reproduce with:

```sh
node evidence/mvp-preview/2026-09-05/fallback_audit.mjs
```

The audit renders each slide at its own 1920×1080 viewBox and reads real `getBBox()`
geometry, so every number below is measured, not estimated from character counts. Output:
[fallback_audit.json](fallback_audit.json).

## Findings

| # | Slide | Kind | Measurement | Effect |
|---|---|---|---|---|
| 1 | `scope.svg` | text collision | 400 × 20 px | `approximate passive pN per titin` is overprinted by `Declared working range: 2000–2400 nm`; both lines are hard to read where they cross |
| 2 | `extension.svg` | overflow | 83 px past the right edge | `235.4 nm · folded domains straighten` is clipped mid-phrase |
| 3 | `architecture.svg` | overflow | 23 px past the right edge | `bare zone · STRONGLY INFERRED` renders as `…STRONGLY INFERRE` |
| 4 | `extension.svg` | text collision | 299 × 9 px | `Evidence: MODELED …` and `2200 nm · total 275.0 nm` touch; still legible |

Finding 1 is the one that matters most, because [SCIENTIST_NOTE.md](SCIENTIST_NOTE.md) names
`release/fallback/scope.svg` as the first thing to open when 3D is unavailable, and the
overprinted line is a scope qualifier.

None of the four states anything false. They degrade legibility; they do not change a claim,
a number, or an evidence class — except that finding 3 truncates the final letter of an
evidence-class label, which still reads unambiguously as `STRONGLY INFERRE[D]`.

## Root cause

**Finding 1 is a plain bug**, in `scripts/build_release_pack.mjs:93-100`:

```js
return wrap(line, 108).map((part, offset) => text(90, 262 + index * 46 + offset * 34, part, …));
```

The baseline is `262 + index * 46`, where `index` is the position in `slide.lines` rather
than a running cursor. A line that wraps places its continuation at `+34`, but the next
source line still lands at `+46` — 12 px later, under a 28 px face. Only wrapped lines
collide, which is why five of the six slides are clean. The fix is a running cursor:

```js
function drawText(slide) {
  const parts = [];
  let y = 262;
  for (const line of slide.lines) {
    if (line.trim()) {
      const wrapped = wrap(line, 108);
      wrapped.forEach((part, offset) => parts.push(text(90, y + offset * 34, part,
        { size: 28, fill: line.startsWith('·') ? INK.text : INK.dim })));
      y += 46 + (wrapped.length - 1) * 34;
    } else y += 46;               // blank source lines still consume a row
  }
  return slideChrome(slide, parts.join(''));
}
```

**Findings 2-4 are a design limit, not a bug.** The generator states its own rule at
`scripts/build_release_pack.mjs:60` — "Deterministic greedy wrap; no measurement, so the
same input always wraps the same." Labels placed at a data-driven `x`, such as
`build_release_pack.mjs:167` (`left + barWidth + 14`), therefore have no way to know they
will run past 1920 px when the bar is long. Fixing these means giving the generator a width
estimate and a placement rule — flip the label inside the bar, or shrink it — which is a
layout decision for the deck, not a one-line correction, and it must stay deterministic.

## Why this pass did not fix them

The standing reopening bar, recorded in [DELIVERY.md](DELIVERY.md), is "a materially
misleading scientific statement, a broken Tour/Stretch/evidence/export path, inaccessible
core navigation on the promised platform, or mismatched/broken delivered bytes". The finish
plan repeats it as "record cosmetic issues for later" and "fix only if one prevents the
actual promised core demonstration". These four are legibility defects on the contingency
route; the interactive Tour, Stretch, evidence and export paths are intact, and nothing
false is displayed. So they are recorded here and named in the shipped `DELIVERY.md`, which
means a recipient is told before they open the deck.

Fixing finding 1 is a small edit with a large paper trail. `release/fallback/*.svg` are
manifest artifacts, so regenerating them changes `release/MANIFEST.json` and its SHA-256
(`13cb66e6…d4ac`) — the value the finish plan, `DELIVERY.md`, `PACKAGE.md`, the
reproducibility record and the assembled package all currently pin. `index.html` would
**not** change, because the release-pack generator is not one of its build inputs, so the
model fingerprint, app revision, build-input fingerprint and standalone hash all survive and
no browser suite needs rerunning.

The full sequence is: fix `drawText`; `npm run pack`; `npm run verify`;
`npm run verify:identity`; re-run this audit; **redo the clean detached-worktree
reproduction**, because [reproducibility.json](reproducibility.json) records a byte-for-byte
comparison of 23 files that would otherwise describe a superseded tree; update the four
records that pin the manifest hash; then reassemble, re-extract and re-verify the package.
The reproduction is the expensive step — a fresh worktree, a copy of the pinned
`node_modules`, a full build and pack — so this is an hour or so of careful work, not the
twenty minutes the one-line diff suggests. Doing it as its own small sprint, with a fresh
reproduction, is cleaner than bolting it onto this one.

That is an owner's call, not a junior engineer's, because it re-issues a frozen artifact.
