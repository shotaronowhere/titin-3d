# Independent final review request

You are Claude, asked explicitly by the project owner for an independent final review of a titin/sarcomere educational visualization. The owner wants an impressive, beautiful, intuitive, scientifically honest MVP for world-class titin researchers and interested laypeople, with a hard deadline and no scope creep. Review only. Do not modify files, run builds, publish anything, or delegate. Return your complete review in your final response; the caller will save it verbatim.

Work in /Users/shotaro/Downloads/artifacts. Use Read, Glob and Grep to inspect source, JSON, reports, and PNG images. You have read-only tools. Do not inspect credentials or unrelated personal files. Be rigorous and candid: do not rubber-stamp, and do not invent defects. Separate observed defects, aesthetic/educational judgments, and missing validation. State when a claim is inferred from code or screenshots rather than reproduced interactively. You cannot claim to have run the app or tests. This is an AI review, not independent scientific validation or human user testing.

First inspect the actual source and representative final screenshots to form your own view, THEN read the existing self-review to compare. Do not anchor on that review's recommendations. Assess both the novice journey and the expert evidence path, visible scientific wording, modeled-versus-measured distinctions, interaction code, accessibility/readability, camera composition, visual hierarchy, responsive layout, and delivery evidence. Review enough underlying scientific configuration and claim/source presentation to detect inconsistencies without pretending to revalidate the scientific model.

Frozen candidate: app source revision dcdb403a759bd3df1f7d7bc821f3a73aeeb10caa. Current HEAD includes only later generated artifacts and documentation. The standalone index.html is large; inspect modular sources instead. Exact candidate index.html SHA256 d04fbf3b9298829821d89e7fcbd9616b67d1291f3886ac9d15617764b9c4e27c. Scientific model fingerprint 7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6. No scientific model/data/dependency changes are proposed. release_ready remains false. The distributable ZIP is /Users/shotaro/Downloads/titin-sarcomere-preview-2026-09-08-dcdb403.zip.

Start with these sources (use targeted searches and reads rather than dumping everything):
- src/index.template.html (main UI, styles, state transitions, guided tour and Research destinations)
- src/presentation/ParameterTable.js
- src/presentation/TourView.js
- src/render/SarcomereScene.js
- src/render/Viewer.js
- src/api/TitinVisualization.js
- data/scientific_scope.json
- data/mechanical_parameters.json
- data/render_style.json
- data/presentation.json
- data/claim_support.json
- data/references.json
- data/release_gates.json
- test/browser/mvp-preview.spec.js
- scripts/build_standalone.mjs and scripts/build_release_pack.mjs if needed

Read PNGs directly with your image-capable Read tool. The final verified screenshot set is evidence/mvp-final/2026-09-08/scroll-corrected-frames/ and contains desktop-beat-1.png through desktop-beat-5.png, desktop-stretch-endpoint.png, desktop-force.png, desktop-evidence.png, desktop-source.png, desktop-scope.png, desktop-architecture.png, plus the equivalent 11 phone-* PNGs. Inspect at least opening, scaffold close-up, stretch, finale, force, evidence, and sources at both sizes; ideally all 22. Desktop 1280x720, phone 390x844. capture-index.json binds these native-click captures to the exact final HTML/manifest bytes. Avoid superseded frames. The separate extracted-frames set is incomplete and should not be treated as a completed device matrix.

After your independent inspection, read:
- evidence/mvp-final/2026-09-08/PACKAGE.md
- evidence/mvp-final/2026-09-08/DELIVERY.md
- evidence/mvp-final/2026-09-08/SCIENTIST_NOTE.md
- evidence/mvp-final/2026-09-08/coverage-decision.json
- evidence/mvp-final/2026-09-08/final-check-results.json
- evidence/mvp-final-review/2026-09-09/REVIEW.md (previous AI self-review)
- docs/superpowers/plans/2026-09-08-titin-mvp-final-implementation.md as needed for bounded acceptance

Known evidence boundaries, to assess honestly: 618 Node tests and 121 Chromium/Firefox checks passed in the final package evidence, with a further focused 3/3 Chromium regression check in the latest self-review. Clean rebuild reproduced delivered bytes. The large parameterized Chromium sweep was explicitly excluded; dedicated stretch coverage exists. WebKit attempts had timeouts and were interrupted, so Safari support remains unverified. Some extraction/export harness operations also stalled; completed captures and exports have recorded provenance/recovery. No physical presentation-device rehearsal, external scientist validation, human novice learning study, or hosted deployment certification. Do not attribute stalls conclusively to the host or app without evidence.

Return a detailed but bounded Markdown review with:
1. Clear verdict distinguishing private researcher-feedback readiness, public lay education readiness, and a high-stakes live demo. Is the bounded MVP complete? Is it visually impressive? Give reasons, without promises about actual researchers' reactions.
2. Prioritized actionable findings, each with severity, precise file/line or screenshot evidence, impact, confidence, and smallest practical fix. Separate blockers from optional polish. If a finding is only aesthetic, say so. Do not pad the list with hypothetical problems. Verify any claim against relevant source rather than guessing.
3. Scientific communication review: accurate/helpful features, wording or presentation risks, and validation limits.
4. UX/visual review for desktop and phone: what succeeds and what weakens learning or visual impact.
5. A Pareto-optimal final recommendation: at most three small changes worth doing before sharing, explicitly indicate whether each is mandatory, and a clear stop line. Reject further scope creep.
6. Where you agree/disagree with the prior AI self-review and why.
7. Exactly what you inspected and what you could not verify. Do not claim new runtime verification.

Use your strongest reasoning and be independent. The owner asks for accuracy over reassurance. Do not edit the app.
