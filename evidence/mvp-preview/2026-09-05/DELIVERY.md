# Scientist-feedback preview delivery — 2026-09-05

**Handoff update, 2026-09-06: IMPLEMENTED; VERIFICATION AND PACKAGING INCOMPLETE.**
This is a candidate record, not a declaration that the preview is ready to distribute.
Finish instructions: `docs/superpowers/plans/2026-09-06-titin-mvp-preview-finish.md`.

Implementation of the bounded plan was authorized by the project owner on 2026-09-05.
This decision permits a scientist-feedback preview, not a formally validated public
release. `data/release_gates.json` remains unchanged with `release_ready: false`.
Historical SC-27A evidence remains historical; no human approval is inferred from AI work.

## Implemented scope

- Corrected the N2A summary; added the mixed-structure explanation and its existing primary
  sources to the stretch narration. Clarified muscle → sarcomere → one Z-to-M titin route.
- Displayed-scene notes now use built manifest counts. Full lattice verification still runs
  and its descriptor notes remain available internally as `lastVerificationNotes`.
- Explicit endpoint Replay stretch resets to the working-range minimum. Intermediate
  pause/resume, user interruption, URL restoration, and ordinary length preservation remain
  in the implementation; one integrated pause-test timeout needs diagnosis below.
- Beat 3 opens in the existing Spring composition. The paired lattice inset stays in Research.
- Tour force is labeled as a modeled estimate. Its action focuses/scrolls to Passive force;
  the detailed sensitivity disclosure sits with the number. Research precision is retained.
- Updated the README and generated transcripts/release pack. Prepared a draft scientist note
  and candidate-specific verification evidence. A distribution ZIP has **not** been assembled.

The nine model-input files, solver, numerical parameters, geometry construction, scientific
decisions, and formal release gates are unchanged. Presentation/build identities change.

## Candidate and verification

| Identity | Value |
|---|---|
| Branch | `codex/mvp-preview` |
| Application source commit | `557f09aaa6f663b4e1bf958ef6c44357861a4d16` |
| Generated artifact commit | `8674dd7` |
| Model fingerprint | `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` |
| Build-input fingerprint | `d7970b235a73ab1df2e93e26807cda95cb9b0d769b41eccd4ec2169747cbd33f` |
| `index.html` SHA-256 | `b5ee9beb2ea4f7b9c26dd25d5574018952a4f1518c6af12573e4b758086f4f5e` |
| `release/MANIFEST.json` SHA-256 | `13cb66e61e55cbbc4966219ce22ed35da5cf56b812987c6611d3d59ae6c0d4ac` |

- **PASS:** `npm run verify`, exit 0; **617/617 Node tests**, typecheck, generated-output
  currency, destructive negative controls, scientific/presentation/export/gate validators,
  matrix structure check, and Python structure-pipeline smoke. See [verify.log](verify.log).
- **PASS:** raw artifact identity and artifact-boundary verification. See [identity.log](identity.log).
- **PASS:** clean detached-worktree rebuild of the standalone and release pack; all **23 files**
  compared byte-for-byte and the worktree remained clean. See [reproducibility.json](reproducibility.json).
- **INCOMPLETE:** integrated Chromium run **69/70 passed**, exit 1. The pause test timed out
  waiting for length to exceed 2000 nm within 8000 ms, **before its pause assertion**. This is
  not established as either a product defect or infrastructure timing. See [chromium.log](chromium.log)
  and [preserved trace](pause-failure/trace.zip). All four new MVP regressions, nine smoke tests,
  evidence/learn tests, and the included UX/zoom/automated-accessibility checks passed.
- **CAPTURED:** 16 frames for all five beats at 1280×720 and 390×844, stretch endpoints,
  force details, and two 640×360 browser-zoom-equivalent states. See [captures.json](captures.json)
  and `frames/`. Captures use reduced motion; they are not physical-device or human evidence.
- **PENDING:** second-browser route on these bytes, final export/download walkthrough,
  actual offline/static-fallback walkthrough from the assembled ZIP, remaining image review,
  intended-device rehearsal, ZIP assembly, and any future hosted-byte fetchback.

The full historical SC-27A cross-engine/330-state matrix was not rerun for this candidate.
The integrated Chromium command explicitly excluded `@sweep` combinatorial UX tests; it
included the dedicated Stretch suite and the new replay regressions. A matrix **structure**
check is not a fresh screenshot-matrix capture.

## Explicit deferrals and limits

Formal SC-27B independent scientific sign-offs, confirmatory participant cohort, human
accessibility review, target-projector/device rehearsal, and repeated zero-finding AI closure
are deferred for this preview. No participant comprehension result or independent scientific
validation is claimed. No external deployment or scientist message was performed in this task.
Hosted-byte verification must be run against the actual URL when published, using the existing
`scripts/verify_artifact_identity.mjs --file index.html --manifest release/MANIFEST.json --url URL`.

Known minor issues retained from the review: Research Large type is ineffective; closing a
selected object does not restore its Research selection invoker; the overlay audit does not
cover the tooltip and invalid-URL notice. Ordinary browser zoom has separate route coverage.
These are recorded, not silently marked fixed. The actual intended demo hardware still needs
a short rehearsal, and independent novice comprehension remains untested.

No new isoforms, molecular dynamics, active contraction, signaling animation, uncertainty
model, rendering rewrite, broad redesign, or new review framework was added.

Only a materially misleading scientific statement, a broken Tour/Stretch/evidence/export
path, inaccessible core navigation on the promised platform, or mismatched/broken delivered
bytes reopens this preview. Cosmetic polish and speculative issues go to later work.
