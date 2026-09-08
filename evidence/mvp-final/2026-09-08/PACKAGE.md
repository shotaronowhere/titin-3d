# Verified distribution — September 8 candidate, finalized September 9, 2026 (JST)

The scientist-feedback preview is [titin-sarcomere-preview-2026-09-08-dcdb403.zip](/Users/shotaro/Downloads/titin-sarcomere-preview-2026-09-08-dcdb403.zip). Use the **desktop Chrome/Firefox** preview route. This supersedes the September 6 archive. No external publication or recipient message was performed.

| Property | Verified value |
|---|---|
| ZIP bytes | 568,963 |
| ZIP SHA-256 | `0cd5139013767d8dae4df297a4c42cf7ab057c6a0cc72a8b065296b36e8488aa` |
| Application source | `dcdb403a759bd3df1f7d7bc821f3a73aeeb10caa` |
| Model fingerprint, unchanged | `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` |
| Build inputs | `0d4877e8a7ce243caa7f8222cbb5d6d11101c0f0c7c756c4cda58408a8aef907` |
| Standalone SHA-256 | `d04fbf3b9298829821d89e7fcbd9616b67d1291f3886ac9d15617764b9c4e27c` |
| Manifest SHA-256 | `9463727da702b0f69a2b51a45eeaf53720247fd8c68c78efde1b95f9f6b6145e` |

All **26 freshly extracted files** match staging bytes, and all **21 manifest entries** match their declared sizes and hashes. The detached manifest checksum and standalone identity verifier pass. A clean detached checkout with `npm ci` reproduced the standalone and complete release tree byte-for-byte. Exact inventories: [package.json](package.json), [reproduction.json](reproduction.json).

Completed frozen-candidate checks: **618 Node tests, 85 integrated Chromium checks, 2 Chromium keyboard/touch checks, and 34 Firefox checks**. WebKit verification remains **incomplete** after two timeout-stalled runs. The final plan's section 9.C permits this two-engine coverage fallback; no verified WebKit support is claimed. Logs and both sets of traces are retained. No application assertion or timeout was weakened. See [coverage-decision.json](coverage-decision.json) and [final-check-results.json](final-check-results.json).

The complete offline visual review contains **22 native-click captures**, at 1280×720 and 390×844, covering all five Tour beats, Stretch entry/endpoint, force, evidence, an expanded source, Scope, and Architecture. **The raw standalone and manifest hashes match this ZIP exactly.** That capture reports resolved/hidden overlay layouts, zero page errors, and zero non-file requests. All 22 images were inspected. See [capture-index.json](scroll-corrected-frames/capture-index.json) and [visual review](candidate-visual-review.json).

The extracted ZIP's core desktop route was also exercised directly over `file://`: all five Tour beats, Stretch endpoint, force, final evidence action, an expanded source, and Scope. **Ten new desktop images** are retained in [extracted capture record](extracted-frames/capture-index.json). Native input automation stalled during the first extracted capture; a second capture using DOM activation completed the same core route, then timed out taking the Architecture screenshot. Thus **a complete fresh extracted phone/Architecture screenshot set is not claimed**; those visuals are covered by the earlier complete review of identical bytes. The two capture failure logs and first-attempt images remain in the evidence directory. This is automated and AI visual review, not independent human usability or physical-device evidence.

All four research exports were downloaded from the extracted candidate at **2000, 2200, 2400, 2450, and 1900 nm**: **20 verified files**. Identity and regime checks pass. The first three states are supported, 2450 nm is extrapolated, and 1900 nm is not evaluated with blank force cells. After one download timed out, three complete states were preserved and revalidated; the two unfinished states were downloaded in a fresh browser. No timeout was changed. See [exports.json](exports.json), `offline-export-first-attempt.log`, and `offline-export-resume.log`.

The packaged [delivery record](DELIVERY.md) and [researcher guide](SCIENTIST_NOTE.md) give the recommended route, candidate identity, and biological limits. `release_ready` remains false; independent scientific validation and human usability review are pending. The next step is feedback on this bounded preview. This external record carries the ZIP hash and subsequent rehearsal results without modifying the archive or creating a self-referential hash.
