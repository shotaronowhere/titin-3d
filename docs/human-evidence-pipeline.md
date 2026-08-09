# Human-evidence pipeline

Snapshot: 2026-08-09 (Asia/Tokyo)

Integration owner: repository owner/operator `@shotaronowhere`, taken from the local Git
configuration. The handle and accountability assignment require owner confirmation before any
external invitation is sent or the handle is published outside this repository.

This file is a status register, not evidence that recruitment happened. No personal contact
information belongs here. At this snapshot there was no authorized contact channel or supplied
candidate roster, so no outreach was performed and no availability was invented. Private
recruitment records should be created only when outreach begins.

Status vocabulary: `NOT_CONTACTED`, `CONTACTED`, `CONFIRMED`, `DECLINED`, or `WITHDRAWN`.
`UNASSESSED` means the relevant independence, conflict, or consent check has not happened.

## Required people

| Role ID | Required role | Earliest consumer | Contact status | Expected availability | Independence / conflicts | Publication consent |
|---|---|---:|---|---|---|---|
| SD-01-R | Scientific reviewer for SD-01 | SC-19 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| SD-02-R | Scientific reviewer for SD-02 | SC-19 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| SD-03-R | Scientific reviewer for SD-03 | SC-19 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| SD-04-R | Scientific reviewer for SD-04 | SC-19 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| SD-05-R | Scientific reviewer for SD-05 | SC-19 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| SC27-R1 | Independent release reviewer 1 | SC-27 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| SC27-R2 | Independent release reviewer 2 | SC-27 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| A11Y-R1 | Accessibility reviewer | SC-27.2 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| LC-R1 | Learning-content/product reviewer for contract migration | SC-23 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| LAY-01 | One-candidate-only lay participant 1 | SC-27.3 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| LAY-02 | One-candidate-only lay participant 2 | SC-27.3 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| LAY-03 | One-candidate-only lay participant 3 | SC-27.3 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| LAY-04 | One-candidate-only lay participant 4 | SC-27.3 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |
| LAY-05 | One-candidate-only lay participant 5 | SC-27.3 | NOT_CONTACTED | UNCONFIRMED | UNASSESSED | NOT_REQUESTED |

The SC-27 reviewers must be independent of implementation and of one another. Expert review must
cover both `sequence/structure` and `mechanics`; every conflict must be disclosed, and a scientific
decision authored by a reviewer requires the protocol's same-specialty countersignature. Lay
participants require informed consent and the preregistered `titin-lay-comprehension/2` protocol;
publication consent is separate from participation consent.

## Readiness and next action

SC-19 is **NOT_READY**. None of SD-01 through SD-05 has a qualified candidate with confirmed
availability. The integration owner must supply or authorize a private recruitment channel, screen
qualifications and conflicts, obtain an availability date, and update each row to `CONFIRMED` before
SC-19 starts. A hoped-for reviewer does not satisfy that prerequisite.

## Target-hardware baseline

The locally observable configuration is recorded without machine identifiers or serial numbers:

| Item | Recorded target |
|---|---|
| Laptop | MacBook Air (MacBookAir10,1, 2020 generation) |
| OS | macOS 26.6.1 (25G76), Darwin 25.6.0 |
| CPU / GPU / memory | Apple M1; 8 CPU cores (4 performance + 4 efficiency); 7 GPU cores; 8 GB unified memory; Metal 4 |
| Browser used for the reproducible sample | Playwright Chromium 151.0.7922.34, headless |
| Physical touch device | **UNASSIGNED**; no physical coarse-pointer/touch device was attached or exercised |
| Projector/display | PHL 499P9, main external display, 5120×1440 at 70 Hz, mirroring off |
| Connection path | **UNCONFIRMED**; macOS reported the display but did not expose a trustworthy cable/adapter path, so no path is inferred |
| Automated review viewports | 1280×720 desktop and 375×812 responsive |

Raw measurement: [`evidence/performance/SC-18-baseline.json`](../evidence/performance/SC-18-baseline.json).
Reproduce with `node scripts/capture_sc18_performance.mjs` from the candidate worktree. The sample
measures a loopback-served standalone at 1280×720: startup to the ready marker, 120 animation-frame
intervals, Measure-entry latency, and Chromium heap samples. It is an automation baseline, not a
claim about visible performance on the 70 Hz display. The observed result was 1,088.259 ms startup,
24.828 average frames/s (p95 50.1 ms; max 50.6 ms), 519 ms Measure-entry latency, 14,300,000 bytes
peak observed JavaScript heap, and 2,178,874 standalone bytes. There were no captured page or console
errors.

The `performance.target_hardware` gate remains `PENDING`: a physical target-browser run on the named
display, an owner-confirmed connection path, an OS-level process-memory high-water measurement, and
a named physical touch device are still required. Browser emulation is not evidence that a physical
touch device passed.
