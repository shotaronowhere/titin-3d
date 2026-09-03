# Codex independent closure review record

This is an automated senior code review by a non-Claude model, not a human
scientific, accessibility, visual, or formative disposition.

- Reviewer runtime: `codex-cli` 0.149.0, authenticated through ChatGPT
- Mode: `codex exec --sandbox read-only`; no file was created, edited, or
  deleted, and `git status --porcelain` was empty before and after
- Scope: the SC-27A candidate `cf8c1d02f398b2d42b852db50325625697e0c3fc`
  against the design, the implementation plan, and the sprint report
- Result: **engineering FAIL** — 0 P0, 0 P1, 4 P2, 2 P3

## Why this round exists

Every one of the eleven prior SC-27A closure reviews was performed by a Claude
model. Eleven rounds from one model family share one set of blind spots, and the
strict zero-actionable-finding rule had never been satisfied. This round asked a
different model family the same question.

It found six defects that eleven Claude rounds did not. The common thread is
instructive: the prior rounds converged on the scientific-label overlay and
drove it through an exhaustive 5 beats × 7 scenes × 6 viewports matrix, but no
gate in that matrix ever **selected an object** or **operated the accessibility
controls**. Codex went to both immediately.

## Finding disposition

| Priority | Finding | Disposition |
|---|---|---|
| P2 | Research collapsed the protected `SCHEMATIC` claim class into `Unknown` and rewrote `scientific_status` to match, contradicting the five-label curriculum beat 5 teaches | `Schematic` and `Not known` are separate groups carrying the canonical labels from `data/presentation.json`; the status rewrite is gone and the unit and browser gates pin both groups |
| P2 | The pinned object explanation was never an overlay obstacle, so a selected object could sit across the locator, band, and identity labels while `data-label-layout` still reported `resolved` | Stage chrome is now one named list shared by the terminus resolver, the hint placer, and the all-family audit; the projection signature sees a pin, so the pass actually re-runs; and the inspector treats fixed painted labels as obstacles it must clear |
| P2 | `Large type` set the pinned explanation to 14 px against its 15 px default, so the accessibility control made text smaller | The large-type rule is 17 px, and a regression compares every large-mode declaration against the base rule for the same selector and rejects any decrease |
| P2 | Escape always spent itself on the selection before the drawer regardless of which opened last, violating the plan's last-opened order, and then handed focus to an inert canvas | Monotonic open stamps give genuine last-opened order; the canvas is focused only when it is not inert |
| P3 | The `g` Tour-return accelerator bypassed the focus-restoring close path its own comment described | It routes through `closeEvidence()`, which is what the comment claimed |
| P3 | A permanently hidden Guided provenance band remained in markup, styles, scrim, camera input, and tests although no beat can declare the feature | The node, its styles, the scrim, the camera safe-area input, and the now-unreachable compact record option are removed; regressions reject their return |

## Adjacent defects the remediation exposed

- Making the inspector avoid labels was not sufficient. `inspectorPlacement`
  varied one axis at a time, so a stage whose free space is diagonally offset
  from the anchor had **no candidate at all** in the clear region and the scorer
  settled for the least-bad overlap. Both axes are now crossed, which is the same
  correction the inspection-hint placer received in an earlier round.
- The card is parked at `0,0` to measure its natural size before placement, so
  any overlay verdict taken during that measurement described the parked box.
  Chromium happened to land a later frame that corrected it; Firefox and WebKit
  did not, and both reported labels covered that the live geometry showed clear.
  The stage is now marked dirty once the card reaches its real position.
- Terminus labels are deliberately excluded from the card's obstacle list. The
  overlay moves termini around chrome, so if the card also moved around termini
  the two placers would chase each other every frame. Fixed families do not move,
  so avoiding only those terminates.

## Tests corrected rather than accommodated

Three existing tests asserted the defective behaviour and were updated to the
corrected contract, not loosened to pass: `showcase_phase26.test.js` pinned the
`SCHEMATIC → UNKNOWN` rewrite, `showcase_phase4.test.js` pinned the fixed Escape
order, and `workbench.spec.js` counted five evidence groups and read the fifth as
`Unknown`. A fourth, `showcase_phase25.test.js`, correctly rejected an edit that
separated `completeInspectionOnboarding()` from the pin it guards; that adjacency
is a real contract and the implementation was restructured to preserve it.

## Remediated candidate and verification

Application commits `5664016`, `b85a3cd`, and `0c67821` close all six findings.
The regenerated candidate is app revision
`0c67821b2cf82411b195dddc3f3dc95841fb6dea`, build-input fingerprint
`9454472a6c526dc039d47a6937207d570c705d7dd9800c3017bf1f79787e2788`,
standalone SHA-256
`476bf0ddd0d09fc86829e3ea34f7bc0928e2751bd7223c9c33490d4198055528`,
and detached-manifest SHA-256
`c772989d11bafcb026123f528f929eb6d76dfff3276caa576d56629b740f3751`.

Verification on this exact identity: 615/615 full Node tests; 184/184 focused
tests; all destructive controls and validators; 147/147 Chromium browser tests in
one uninterrupted pass (138 SC-27A plus 9 smoke); 80/80 Firefox UX tests; 80/80
WebKit UX tests; the 7,562-sample hit-grid fixture; the 48-cell visual matrix;
exact artifact identity; 25/25 unique hash-matching captures; and a
zero-collision 330-state Chromium overlay matrix. All 11 protected digests,
`docs/scientific-decisions/**`, and the model fingerprint are byte-identical to
the sprint baseline, and `release_ready` remains `false`.

The candidate-bound `final/selected-titin-1280x720.png` capture is the direct
before/after evidence for the second finding: the reviewed candidate showed the
explanation covering `I-band`, `A-band` and `Actin` and clipping `Titin`, and the
remediated one shows every label clear.

Status: **PENDING A ZERO-FINDING RERUN OF THIS REVIEW.** Release and candidate
freeze remain independently blocked on the declared human work.
