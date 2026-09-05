# Distribution package record — 2026-09-06

External record for the assembled scientist-feedback package. It lives **outside** the
archive on purpose: a ZIP cannot honestly carry its own hash.

## The archive

| | |
|---|---|
| Path | `/Users/shotaro/Downloads/titin-sarcomere-preview-2026-09-06-557f09a.zip` |
| Bytes | 570,600 |
| SHA-256 | `70a9d4b12439b141405869cff0c0ce29f67ce2c90ade48ce8a146735eaf9be21` |
| Entries | 26 files in one top-level `titin-sarcomere-preview/` directory |

The archive is **not** committed. It is fully derivable from this repository at
`codex/mvp-preview`, and re-zipping produces different bytes because ZIP records file
timestamps — so the hash above identifies *these delivered bytes*, while the reproducible
identity is the extracted content verified below. Rebuild with:

```sh
mkdir -p /tmp/stage/titin-sarcomere-preview && cd /Users/shotaro/Downloads/artifacts
cp index.html LICENSE /tmp/stage/titin-sarcomere-preview/
cp -R release /tmp/stage/titin-sarcomere-preview/release
cp evidence/mvp-preview/2026-09-05/SCIENTIST_NOTE.md evidence/mvp-preview/2026-09-05/DELIVERY.md /tmp/stage/titin-sarcomere-preview/
cd /tmp/stage && COPYFILE_DISABLE=1 zip -r -X -q titin-sarcomere-preview.zip titin-sarcomere-preview
```

## Contents

`index.html` (the standalone build), the entire 22-file `release/` tree, `LICENSE`, and the
two note files at the package root, where their own instructions assume they are. The
standalone retains its bundled third-party notice — three.js carries its `@license` /
`SPDX-License-Identifier: MIT` header inside `index.html`, preserved byte-for-byte. No
`node_modules`, no tests, no repository working metadata, no evidence directory.

## Checks on the extracted package

Extracted to a fresh temporary directory, then:

- **26/26 files byte-identical** to their repository sources (`cmp` on every file).
- **Identity verified** with the repository's own verifier against the extracted paths:

  ```sh
  node scripts/verify_artifact_identity.mjs \
    --file /abs/extracted/titin-sarcomere-preview/index.html \
    --manifest /abs/extracted/titin-sarcomere-preview/release/MANIFEST.json
  ```

  Exit 0, reporting model `7badc8e2…f329ef6`, app revision `557f09aaa6f663b4e…`, build
  inputs `d7970b23…dd33f`, `index.html` `b5ee9beb…86f4f5e`, manifest `13cb66e6…d6c4ac` —
  every value equal to the frozen candidate in [DELIVERY.md](DELIVERY.md).
- **All 20 manifest-listed artifacts verified** inside the extracted tree by SHA-256 and
  byte length; the standalone matches `standalone.sha256`; `release/MANIFEST.sha256` agrees
  with the manifest it names. The verifier itself checks identity but not the artifact list,
  so that comparison was run separately.
- **Offline route completed** from the extracted `index.html` over `file://` — all five
  beats by headline, the Stretch sweep to 2,400 nm with `↻ Replay stretch` and the
  "Stretch complete" announcement, the force route focusing Passive force with its
  sensitivity wording, and a `titin-state.json` download carrying the frozen fingerprints
  and `candidate_manifest_verified: true`. All six static fallback SVGs render readable text
  at 1920×1080. **Zero non-`file:` requests and zero page errors**, so "offline" is measured
  rather than assumed. See [package_walkthrough.json](package_walkthrough.json),
  [package_walkthrough.mjs](package_walkthrough.mjs) and `package-frames/`.

## Known limitation shipped in this package

The static fallback deck has four measured layout defects — one text overprint on
`scope.svg`, one on `extension.svg`, and two labels clipped at the slide edge. They are
described in [FALLBACK_SLIDE_FINDINGS.md](FALLBACK_SLIDE_FINDINGS.md) and named in the
`DELIVERY.md` that ships inside the archive, so a recipient is told before opening the deck.
Fixing them regenerates manifest artifacts and therefore re-issues this candidate's
manifest; that decision was left to the owner.

## Not done

No hosting destination and no recipients were supplied, so nothing was published or sent.
If publishing is later authorized to a specific destination, fetch the hosted bytes back
with `scripts/verify_artifact_identity.mjs --url` and exercise the route at that URL; a
`file://` or localhost pass is not hosted parity.
