# Titin MVP: review and bounded completion plan

Review date: 2026-09-05. Status: recommendation for a scientist-feedback preview; implementation and publication have not been performed. This is an AI code/UX review with primary-source spot checks, not independent scientific validation or human usability research.

**2026-09-06 implementation supplement:** the owner subsequently authorized implementation.
Presentation and replay fixes are now committed, and the full repository verification passes.
One integrated Chromium pause-start timeout, second-browser validation, and packaging remain.
Continue with `docs/superpowers/plans/2026-09-06-titin-mvp-preview-finish.md` and the exact
candidate record at `evidence/mvp-preview/2026-09-05/DELIVERY.md`. The review below is retained
as the original baseline and scope decision; its old hashes/results are not the new candidate.

**Recommendation: replace the remaining release programme with one capped preview sprint, then share a clearly identified candidate with scientists for feedback.** Preserve the existing scientific model and Research workbench. Spend the remaining effort on scientific communication, a repeatable stretch demonstration, and reliable delivery. Retire “zero actionable findings from another AI review” as the stopping rule for this preview.

The deadline and sharing format were requested but were not supplied during this review. The planning assumption is one engineer, up to two working days, and a desktop-first link that also supports a short live demonstration. Estimates below are work budgets, not measured completion guarantees; external feedback and hosting access can add calendar time.

**What was actually reviewed**

The worktree was clean at review start. Repository HEAD is `b5ec722f6aebe5bff95693d4850170a67058f7c2`; the standalone application's source revision is `f40cc66e891c2843b2d8ecbe66a2fcded995ecae`. The difference is expected: the build identity follows application inputs, not subsequent reporting commits.

| Candidate identity | Value |
|---|---|
| Model fingerprint | `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` |
| Build-input fingerprint | `5ff8017125a9fbde0aedc693f11c13c0dbe17d163bc0a1cf1839b8af5fe02305` |
| Standalone SHA-256 | `f63157c6d5cbbf022ab375d444562eb1d0d40e4c3923d058df452186a1a0ee3b` |
| Detached manifest SHA-256 | `83bdf50ab47c2dd9c632ff245e8ebeba957611782fe60bb0a8b36f74b5576cfa` |

Read the SC-27A design, handoff and closure findings, SC-27B contract, scientific scope, mechanics policy, relevant model/render/presentation code, source presenter, build identity and browser tests. Walked all five Tour beats at 1280×720, ran Stretch to completion and attempted replay, opened the force route and Research evidence, and followed a fresh 390×844 mobile entry through Titin → Why we know this → Sources for this object → expanded source record. The latter exposes the Fig. 10 epitope-map locator, chicken-breast preparation and transfer limitation.

Fresh verification:

- `npm test`: **616/616 passed**, approximately 125 seconds. Full output: [node-tests.log](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-05/node-tests.log).
- Chromium standalone smoke: **9/9 passed**, approximately 1.1 minutes, including HTTP/source boot, `file://`, no-WebGL fallback messaging, tab/focus navigation and the critical-violation axe check. Full output: [chromium-smoke.log](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-05/chromium-smoke.log).
- Build/pack currency, TypeScript, raw artifact identity and artifact boundary: passed.
- Scope, sequence, claim-support, scientific-decision, citation-registry, mechanical-parameter and export validators: passed. Mechanical generated outputs reproduced byte-for-byte; the script reports 4/4 source checks.
- Release-gate validator: passed **with `release_ready: false`**. This verifies that pending evidence is represented honestly, not that release criteria have been satisfied.
- Direct model probes: 1900, 2500 and 3000 nm withhold force; 2000, 2200 and 2400 nm return supported estimates; 2450 nm is extrapolated. Rounded central estimates at 2000/2200/2400 nm are about 0.18/0.5/1.3 pN per titin. These are model outputs, not experimentally validated human-force values.

The complete destructive suite and Firefox/WebKit matrices were not rerun in this review. Their prior passes are documented in SC-27A and remain historical evidence. No target projector, physical phone, human accessibility review or participant session was performed. This review does not establish that every scientific claim is correct.

**What deserves to survive the deadline**

The strongest expert-facing feature is the chain from an actual selected structure to a claim, evidence class, source preparation, exact locator, limitation and reproducible export. It works. The mechanics implementation separates numerical solution from applicability: constants are injected from records; serial force balance determines regional extension; unsupported regimes suppress public force. Its cross-species/preparation transfers, reference-sequence identity and omissions are explicit. The standalone artifact and deterministic release pack already solve most of the delivery problem.

The major implementation risk is concentrated presentation complexity: `src/index.template.html` is 5,258 lines and owns substantial state, DOM, layout, navigation and animation orchestration. Rebuilding the scene also runs verification and multiple presenters. That makes a renderer rewrite or broad panel refactor a poor deadline bet. The existing tests are useful, but some heavily exercise source strings and layout contracts; neither those nor a 330-state label audit answer whether a novice learns the intended biology.

**Findings that materially affect the preview**

| Finding and evidence | Consequence | Smallest useful disposition |
|---|---|---|
| **Scientific copy error:** `data/presentation.json:298` calls N2A/PEVK “disordered” elements. The current Research text and model instead distinguish N2A's Ig domains and UN2A structure. | A scientist can spot an avoidable biological misstatement in the main lesson. | Correct the short summary; do not alter N2A geometry or mechanics to match the erroneous sentence. |
| **Stale rendered-scene claims:** `GeometryStrategy.js:398` constructs “6 of 42” strand notes from the lattice descriptor; `Viewer.js:423` retains them and `index.template.html:4820` displays them. The live local scene reports one representative titin path and one thick/six thin filaments. | Research contradicts both the visible scene and the one-representative-molecule policy. The patch ratio note is also inapplicable to the displayed local neighborhood. | Separate descriptor diagnostics from displayed-scene notes. Use the built manifest/display options for rendered counts; retain scientific lattice checks. Do not change biological copy-number records to repair UI copy. |
| **Stretch cannot replay:** after completion at 2400 nm, the enabled Stretch button produces no visible stretch. `toggleSweep` initializes elapsed time from the current endpoint (`index.template.html:5145` onward), and `stepSweep` immediately terminates at the same maximum (`:5069` onward). Reproduced live. | The central demonstration appears broken on a second attempt, including after returning to beat 3 with length preserved. | At the endpoint show “Replay stretch”; its explicit action resets to 2000 nm, announces the reset, then runs the same bounded comparison. Preserve pause/resume and ordinary navigation's length preservation. |
| **Force disclosure is too indirect:** the Tour presents `1.3 ± 0.8 pN · supported`; the explanation that this is literature-parameter sensitivity is in Research. Its force button merely opens Measure (`index.template.html:1358`), above a long geometry inventory. | “Supported” and ± can imply stronger biological validation or statistical uncertainty than intended; the promised explanation is below the first screen. | Identify the number as a model estimate on the Tour and distinguish parameter sensitivity from a confidence interval beside its detailed presentation. Make the force action land at the existing force heading/chart with its caveat. Keep regime limits intact. |
| **Opening mental model needs one explicit sentence:** the header says “One titin in one sarcomere” (`index.template.html:732`); the takeaway says “spanning the sarcomere” (`presentation.json:189`). The enlarged geometry is one half-route; the locator supplies the full unit. | A novice can miss the distinction between a Z-to-M titin molecule and the Z-to-Z sarcomere, and the connection to a muscle fiber remains thin. This is a comprehension risk, not a proven participant failure. | Say that muscle fibers contain repeated sarcomeres and the enlarged view follows one titin across a half-sarcomere. Keep the existing truthful full-unit locator. |
| **Tour spends attention on expert material:** beat 3 opens on a molecular detail view before Stretch switches to the Spring scene. Beat 4 includes a scrollable paired lattice comparison and its equations (`presentation.json:393`; `index.template.html:2903`). | The learner must decode extra imagery while trying to grasp spring versus scaffold. | Start beat 3 with the existing Spring composition; keep molecular detail accessible through Research. Remove the paired lattice inset from the Tour feature list while retaining it in Research Measure. |
| **Documentation contradicts current force policy:** `README.md:281` says absolute-pN output is withheld. | The leave-behind undermines what the live application just demonstrated. | Describe regime-bounded approximate force and the same transfers/omissions already used in the application. |

The N2A correction is supported by original research, not merely disagreement between local strings: [Lanzicher et al. (2020)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00173/full) describes four Ig domains and unique sequence; [Zhou et al. (2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8052292/) identifies a structured UN2A core with flexible flanks. Thus neither the complete N2A element nor all of UN2A should be flattened into “disordered.”

The transfer qualification also matters substantively: [Linke et al. (1998)](https://pmc.ncbi.nlm.nih.gov/articles/PMC20927/) studied rat-psoas myofibrils and fitted polymer-elasticity models. Those measurements are not measurements of this application's full human reference-sequence construct. The current [UniProt Q8WZ42 entry](https://www.uniprot.org/uniprotkb/Q8WZ42/entry) distinguishes multiple isoforms; retaining the precise reference identity is appropriate.

**The bounded execution plan**

Work in order. One engineer owns integration. Batch application edits before regenerating artifacts. The total budget is **16 engineering hours including verification and contingency**, normally spread over two working days. If a task exceeds its cap, use its stated cut rather than adding a sprint.

| Order | Work budget | Deliverable and acceptance |
|---|---:|---|
| 1. Lock the preview scope | 0.5 h | Record “scientist-feedback preview; independent validation pending,” the task cut line and known deferrals in an external release decision. Keep existing formal gates pending. No new gate schema or verification framework. |
| 2. Repair communication | 2 h | Correct N2A, full/half-sarcomere and stale count wording; align README; label the model force and sensitivity truthfully. Science records, solver parameters, units and omission boundaries are unchanged. Review the actual Tour and Research copy, not only validator output. |
| 3. Make the demonstration repeatable | 3 h | Endpoint replay works twice in succession; pause/resume, reduced motion, user interruption and URL-restored lengths behave deliberately. Add a behavioral regression for replay and a focused regression for notes matching actual displayed counts. |
| 4. Tighten the existing route | 2 h | Beat 3 begins in the existing Spring view; force details open at the relevant content; beat 4's lattice inset stays in Research. Keep all five beats, the existing theme and existing expert capabilities. Cut any camera/material/layout redesign that exceeds this budget. |
| 5. Produce and check one candidate | 4 h | Finalize source changes; build/pack a clean candidate; run existing full repository verification once, relevant Chromium stretch/UX/evidence tests and browser smoke. Check the promised route in a second intended browser. Recheck the changed beats at 1280×720 and 390×844 plus zoom/reduced motion. Capture the final main route and record hashes. |
| 6. Rehearse and package | 1.5 h | Complete the 3-minute story and 2-minute expert follow-through on the actual demo device; open offline and static fallback; verify the actual hosted bytes and primary route when publishing. Prepare a one-page scientist note. |
| Contingency | 3 h | Only reproducible scientific misstatements, broken core interactions, inaccessible core navigation or delivery failures. Optional polish is dropped first. |

The model-input fingerprint should remain unchanged for these presentation-level fixes; application/build fingerprints will change. A stable model-input hash does not excuse a renderer change from behavioral testing. Correct targeted fixtures to the intended behavior; retain science/identity guards. Rebuild generated transcripts and the release pack from the canonical inputs rather than editing generated files by hand.

SC-27A already contains substantial cross-engine coverage. Do not repeat the entire historical matrix after each small edit. Run affected tests during implementation; perform one final integrated verification. If a shared overlay/camera/CSS change affects all scenes, either budget the applicable broader matrix or omit that change. This plan does not describe previous screenshots as review evidence for new bytes.

**Five beats, one coherent explanation**

The visitor should leave knowing where titin is, how it differs from the motor, what stretches, and how to inspect evidence. The following are proposed short summaries, subject to the existing claim bindings and layout checks; they are not new scientific claims or implemented copy.

1. **Unit and muscle:** “Muscle fibers contain repeating sarcomeres between Z-discs. Myosin pulls actin; titin provides passive elasticity and support. This enlarged view shows one half-sarcomere.”
2. **Route:** “One titin runs from a Z-disc to the central M-line—half a sarcomere. Its elastic I-band region connects to its thick-filament-associated A-band region.”
3. **Stretch:** “Stretch the model: folded-domain chains straighten and flexible segments extend in the I-band. Titin's A-band span stays fixed here, while predicted passive force rises.”
4. **Scaffold:** “Along the thick filament, titin provides structural support and sites for molecular interactions. The close-up shows that association; precise partner arrangements remain uncertain.”
5. **Evidence:** “Titin contributes elasticity and organization. This view combines observations, model predictions, and illustrative geometry. Select titin to inspect the evidence and remaining uncertainties.”

Keep the evidence-class definitions available in beat 5. Expert nomenclature, N2A's mixed structure, force equations, preparation transfers and disputed mechanisms remain accessible in Research. Do not imply that titin's biological roles are exhausted by the passive model, that ATP-powered contraction is being simulated, or that schematic transverse paths are experimentally resolved structures.

For a live demonstration, allocate roughly 30 seconds to muscle/sarcomere orientation, 25 to the half-route, 45 to stretch and replay, 25 to scaffold and 35 to evidence. These are rehearsal targets. The generated script's current 181-second estimate is not an observed presentation duration. For the expert follow-through, choose one object and one model output, show their exact supporting records and preparation limits, then export the state. The inspectable chain is the strongest demonstration of the AI-assisted work.

**What to override in SC-27B, and what to retain**

| Existing requirement | Scientist-feedback preview disposition |
|---|---|
| Repeated zero-finding AI closure | Replace with the explicit severity/impact cut line below. Known minor defects remain recorded. |
| Historical target-frame approval before implementation | Record that it did not happen. Do not try to create retrospective evidence; inspect the actual final preview. |
| Preregistered five-person confirmatory cohort | Defer. Aim for two 10-minute uncoached novice walkthroughs if people are available. Treat these as formative feedback, with no statistical claim or formal PASS. |
| Two independent scientific sign-offs before sharing | Defer formal sign-off. The first scientist sharing requests precisely this feedback; label the artifact's current review status. Do not mark AI adjudication as independent human validation. |
| Comprehensive human accessibility/projector/device programme | Defer the certification-style claim; retain keyboard/zoom/reduced-motion checks and the actual intended-device rehearsal. Any defect preventing the promised core path remains a blocker. |
| New `verify:mvp` and deployment wrapper scripts | Use existing commands. The current identity verifier already supports hosted fetchback via `--url`; duplicating it is unnecessary. |
| Build reproducibility, honest scope, numeric boundaries, sources, actual delivery check | Retain. These directly protect the scientist's ability to assess and reproduce the preview. |

The formal `release_ready` flag remains false unless its existing conditions really pass. An external, dated preview decision explains the narrower purpose and which conditions are deferred. There is no need to weaken validators or rewrite pending evidence to authorize a preview.

Use novice walkthroughs to ask: “What is this unit?”, “Where does one titin start and end?”, “Which molecule supplies motor action?”, “What changes in the stretch?”, and “Where can you check the evidence?” Two people repeating the same consequential misunderstanding triggers a copy/route correction within contingency. If no participants are available, record that comprehension is untested and prefer a guided first sharing; do not substitute agent personas.

The scientist note should contain the candidate link/file identity, the short route, the reference-sequence and cross-preparation scope, the unresolved/omitted physics, and three feedback prompts: Which statement or depiction is misleading? Is the parameter transfer reasonable for this expressly limited preview? What is the single most important correction before broader educational use? Existing exports and source records are the supporting material. Do not build a new survey service or dashboard.

**Hard cut line and known deferrals**

After the planned changes, a finding blocks this preview only if it demonstrates materially false scientific communication, failure of the Tour/Stretch/evidence/export path, inability to operate that path on the promised platform, or mismatched/broken delivered artifacts. Classify the impact, not just an inherited P2/P3 label. A speculative possibility or a cosmetic imperfection is entered in the backlog and does not restart closure.

The previously documented Large type control, selection-invoker focus restoration, and tooltip/invalid-URL overlay-audit omissions remain known issues. Avoid promising the ineffective Large type feature for a projector; use and check ordinary browser zoom. If that is insufficient on the actual demo hardware, functional text enlargement becomes necessary. Fix a realized core-path collision or keyboard failure if observed; do not expand the entire overlay solver solely to obtain a zero-finding report.

Explicitly defer new isoforms, more structures/domains, molecular dynamics, active cross-bridge or calcium coupling, signaling animation, disease stories, new uncertainty models, GPU/worker refactors, an app rewrite, global visual redesign, new narration/media systems, analytics and a larger study platform. Do not bulk-delete old tests or expert functionality as deadline “cleanup.”

**Preview acceptance and emergency cut**

The preview is ready when the scientific copy/count contradictions are resolved, the main stretch can be repeated, one complete Tour and one object-to-locator route work, model-force limits remain enforced, the delivered build matches its manifest, and the intended device can complete the demonstration with an offline fallback. Minor known issues and absent independent validation are recorded accurately.

If fewer than one working day remains, cut step 4's route polish first, use the existing views with a rehearsed presenter, and spend the available time on the communication fixes, replay, a targeted smoke and exact-byte packaging. If code remediation cannot finish, use a prepared guided/static presentation that explicitly corrects the affected statements and counts; do not send the unchanged interactive artifact as though those findings were resolved. If performance fails on the actual device, use the existing static fallback or an accurately labeled endpoint comparison rather than starting a renderer rewrite.

This is the practical Pareto choice: preserve the expensive, valuable science/provenance machinery; repair small contradictions and the main interaction; gather feedback through the sharing itself. A formal public validation release can follow when independent evidence exists.
