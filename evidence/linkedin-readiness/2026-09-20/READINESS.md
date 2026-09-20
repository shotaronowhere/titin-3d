# LinkedIn presentation readiness — September 20, 2026

Local implementation and engineering verification are complete.
GitHub/Pages publication is complete; LinkedIn Featured and human review remain
pending. This record does not claim a scientific
release, independent human validation, or a saved LinkedIn Featured item.

Tasks 1–3 and Task 4's local checks are complete. Task 5's review package and
local integration are complete. The owner authorized pushing the verified
repository, and its Pages deployment passed. Repository settings and LinkedIn
editing remain separate steps. The optional video was omitted from this still-image package.

## Candidate

- Source-input commit: `57154ebb183f61713561c03b4bc2e75dac042c88`.
- Generated artifact/media commit: `ade56a5cd174f17c90596409736d218310b30bb0`.
- README/development commit: `5d6a3c3e1fdae9161559a4e100dc91db6e10053e`.
- Final browser-harness commit: `f60f13ded96af38b1fa71347122a118261ab213b`.
- Prior public commit: `aaa069864187179bd03b54bbc3f59d898ef18c7a`.
- Model: `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6`.
- Build inputs: `24fdc3fd3b569f4d0ac45e03f36767a518deea55fa75065ab5d5a41b7477a2f5`.
- HTML SHA-256: `522ec60119db4d04c32147ad2ddee1ac6f764ffd6239e48767583c38a336fabb`.

The application changes are static sharing metadata, source/recovery links,
contrast/focus styling, preservation of startup diagnostics, and the opening title
“Titin: a muscle protein.” No renderer, camera, guide behavior, geometry,
mechanics, data record, or dependency lock changed. `release_ready` remains false.
The original supplied plan remains untouched; this record tracks execution.

## Verification

[verification.json](verification.json) records commands, candidate, timestamps,
exit statuses, and retained result logs. Final required checks passed:

| Check | Result |
|---|---|
| Build/pack freshness | Pass; 22 generated companion outputs current |
| Type analysis | Pass |
| Full Node suite | 618 passed, 0 failed |
| Artifact identity/boundary | Pass; clean application revision, unchanged model |
| Scientific gate consistency | Pass; `release_ready: false` |
| Smoke, Chromium | 12 passed |
| Smoke, Firefox | 12 passed |
| Smoke, WebKit | 12 passed |
| Research/evidence, Chromium | 16 passed |

The 52 required browser checks use the final candidate. The additional
[viewport walkthrough](route-review.json) passed at 1280 × 720, 390 × 844,
320 × 568, and 640 × 360. Each route exercised fresh load, keyboard Next/Previous,
both guide states, Stretch/replay, the object-to-source route, the initially
visible repository link, Research close/focus return, and browser Back.
The two smaller sizes used reduced motion. Titles fit and controls remained
reachable without horizontal overflow; no page errors occurred. No guide,
camera, or layout implementation changed, so no expanded scientific or renderer
suite was required.

The [offline check](offline-review.json) passed: standalone file loading made
zero HTTP requests. Activating the repository link opened its intended HTTPS
destination; that destination was intercepted for this navigation check, so it
does not establish remote availability. Both recovery links were visible at
320 × 568 without horizontal overflow.

The [package audit](package-audit.json) passed: 13 static metadata tags, canonical
and image URLs, opaque PNG dimensions/sizes/hashes, unchanged candidate/model,
and all 68 README/development local links, including heading fragments.
The [locally rendered README](readme-render.png), with both images loaded, was
inspected by the Codex implementer. This local Markdown rendering does not
establish how GitHub will render the unpublished commit.

Environment: Node 20.19.2, npm 11.5.2, Python 3.14.3 (inside this checkout's
activated `.venv` for every Node/Python verification subprocess), locked project
dependencies, and installed Playwright engines. Browser suites run serially with
one worker. Baseline build/pack/identity and all 618 Node tests passed before
implementation.

New regression checks first failed on the absent source/recovery anchors and then
passed after implementation: 4 focused Chromium checks and 45 phase9/phase18 Node
checks. The classic-script fake DOM was migrated to represent `#errMessage`;
its failure/success assertions remain. The relocated documentation contracts
passed 31/31; the README's negative-readiness guard is unchanged.

The initial full WebKit run passed 8 checks and failed 4 new link-focus checks.
A native button/anchor fixture reproduced the same behavior without any app code:
plain Tab skipped links, Option-Tab reached them, and clicking a button did not
focus it. The smoke harness now starts from explicit keyboard focus and uses
Option-Tab on macOS WebKit, retaining all contrast, focus, viewport, and recovery
assertions. See [the diagnosis](webkit-keyboard-diagnosis.json) and
[Apple's keyboard guide](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac).
The original failure log is retained in `checks/smoke-webkit.log`; the subsequent
full-engine results are identified separately. Application bytes did not change.

A [separate fresh-context AI code reviewer](code-review.json) inspected `aaa0698..f60f13d`, the images,
recorded hashes, and the evidence drafts, finding no actionable issues. This
review is distinct from independent scientific or human-usability review.

An owner-requested follow-up review found one gap in the supplemental rehearsal:
its Replay check accepted the unchanged 2,400 nm endpoint even if Replay did
nothing. A no-op click-handler control reproduced that false pass. The rehearsal
now observes the real click's reset to 2,000 nm and active playback before waiting
for 2,400 nm again, including under reduced motion. The new assertion rejects
the no-op control. [Follow-up review evidence](follow-up-review.json) records the
fresh code review, diagnosis, and checks; [follow-up route results](follow-up-route-review.json)
record each viewport's observed replay reset. The results-only rerun preserves
all earlier screenshots and their recorded hashes. All four repeated viewport
routes, 68 targeted Node checks, and the identity verifier passed. Application code, generated
bytes, media, and scientific status did not change in this follow-up.

## Media and review scope

[captures.json](captures.json) pins the HTML, browser, viewport, URL, camera,
reduced-motion setting, request log, raw filenames, and SHA-256 values.
[media.json](media.json) records output dimensions, sizes, hashes, crops, uniform
resizes, and composition operations. Reproduction scripts:
[capture.mjs](capture.mjs), [compose.py](compose.py).
[review-captures.json](review-captures.json) pins the additional walkthrough,
recovery, and local README screenshots. The walkthrough script is
[review-route.mjs](review-route.mjs); the offline check is
[inspect-offline.mjs](inspect-offline.mjs).

The two endpoint captures use the specified 2,000/2,400 nm Spring URLs at
1280×720, with identical camera, zoom, and crop and no manual camera operations.
The README comparison is a composition of two frames at identical pixel scale.
The social images use a real Architecture close-up, with a separate readable
educational-preview qualifier. No synthetic molecular detail, scale bar, or
force value was introduced. Both full social images and their 320 px thumbnails
were inspected by the Codex implementer.

The first phone inspection showed that the collapsed guide hid the only mention
of muscle. The shorter opening title now identifies titin as a muscle protein.
All captures were regenerated from the resulting clean source commit.

Owner review has not occurred. No unfamiliar human reviewer or participant was
recruited, and no human prompting/comprehension result is claimed. Physical-phone,
physical Safari/iPhone, and LinkedIn in-app-browser behavior remain untested.

The first additional walkthrough passed desktop but missed a phone object label
because its coordinate click occurred during the camera transition. A focused
reproduction showed `transition=true`, no inspector immediately, and a visible
inspector after the camera settled. The review script now waits for that
condition before the click; no application behavior was changed. The initial
failure remains in `checks/route-review.log`, with the corrected run recorded
separately.

## Publication

The owner authorized a push on September 20, 2026. Application candidate
`b215a87fe959e8c05988034718f52cd11b66a63b` was published to the existing `main` Pages
source at `/`. The [Pages deployment](https://github.com/shotaronowhere/titin-3d/actions/runs/35489211634)
succeeded. [Publication evidence](publication.json) records the clean public
HTML, both social PNGs, both linked fallback SVGs, and text Tour: each returned
HTTP 200 and matched the verified local bytes. Subsequent evidence-only commits
preserve this application candidate.

An unauthenticated Chromium inspection of the public repository loaded both
README images at their expected intrinsic dimensions; its
[rendered README](published-readme.png) was visually reviewed by the Codex
implementer. The public demo also passed a clean-load → Tour → Stretch →
Research → Sources check at 390 × 844 with reduced motion and no page errors.
This is desktop browser automation at a phone-sized viewport, not a physical
phone or human-comprehension review.

The implementation was previously fast-forwarded into local
`main` at `6cf5f530172032a7ccbaa9c4207d9f3f9f98e3ef`; source ancestry was retained.
[Integration evidence](integration.json) records fresh build, pack, and identity
passes from `/Users/shotaro/proj/titin-3d`. The app revision and HTML bytes remain
the candidate above. This integration record is a subsequent evidence-only
commit and is outside the application input boundary.

The first integrated pack check rejected a pre-existing, ignored
`release/.DS_Store` Finder metadata file. Only that file was moved to a temporary
backup. All three checks then passed; no generated file or checker was changed.
The initial failure and final results are retained in the integration record.

See [the publication package](PUBLICATION.md) for the reviewable files, exact
Featured copy, GitHub About fields, and remaining steps. The push did not change
repository settings or LinkedIn. Post Inspector, the actual Featured draft, and
the saved Featured item still require inspection and authorization. Local
engineering checks cannot establish those external results.

Scientific review and formal human-usability gates remain pending; portfolio
presentation readiness does not satisfy them.
