# Claude senior review record

This is an automated senior code review, not a human scientific, accessibility,
visual, or formative disposition.

- Reviewer runtime: Claude Code 2.1.226
- Model/mode: Claude Opus, high effort, read-only plan mode
- Scope: the SC-27A working diff against the design and implementation plan
- Original review artifact: `/Users/shotaro/.claude/plans/act-as-the-senior-melodic-rivest.md`
- Result: 14 findings, no P0
- Boundary result: the exact model fingerprint, all 11 protected inputs,
  `release_ready: false`, and every human gate remained intact

## Finding disposition

| # | Priority | Finding | Final disposition |
|---:|---|---|---|
| 1 | P1 | `titin_hero` did not render declared band brackets | Fixed and browser-covered |
| 2 | P1 | protected legacy claim pointers could resolve to the wrong current beat | Fixed through one data-owned migration consumed by runtime, Python validation, inventory generation, and deterministic export; protected ledger unchanged |
| 3 | P1 | five v2 scientific non-claims were lost in the chapter merge | Restored and pinned by a v2 fixture |
| 4 | P1 | beat-3 force text overflowed and included a 9 px class | Fixed with containment/wrapping and a 12 px class; dense states covered at six viewports |
| 5 | P1 | report claimed a 200% gate that did not exist | Fixed with a 640×360 CSS viewport/2× DPR equivalent and browser reflow gate |
| 6 | P2 | SC-25 evidence generator froze live fields with historical halo opacity | Fixed; only the protected historical opacity stays pinned and all other fields derive live in a clean-room regeneration test |
| 7 | P2 | Guided palette had two authorities | Fixed; runtime and tests derive from the single JSON record |
| 8 | P2 | substring-only source validators could pass on comments | Removed; behavioral validators/tests cover consumption |
| 9 | P2 | no beat-3 narrow/dense automated coverage | Fixed at six viewports, including force and Next containment |
| 10 | P2 | axe coverage was cold-open/severe-only | Expanded across cold, beat 3, beat 5, and Research at mobile/desktop with zero WCAG violations required |
| 11 | P2 | chips were live regions and definitions were tooltip-only | Fixed; chips are not status regions and five definitions are visible in beat 5 |
| 12 | P2 | shortcut tests/reporting claimed visual visibility for an intentionally nonvisual guide | Corrected to the accessible nonvisual contract |
| 13 | P2 | geometry-share diagnostic measured chrome rather than composed geometry | Fixed through same-frame WebGL/SVG pixel differencing; both diagnostics are separately named |
| 14 | P3 | stale counts, narrow scope truncation, weak naming/coverage, unrecorded removals, permissive evidence parser | Fixed where actionable; the all-alias silent migration concern was rejected because the governing design requires removed IDs to migrate silently |

The review's residual requests for rendered canonical-class disclosure,
pointer single-fire behavior, and shipped Guided contour coverage were also added.
An expanded axe run subsequently found a real nested-interactive defect in the
reference strip; its container is now an accessible group rather than an image
role containing buttons.

## Post-remediation re-review attempt

A second Claude Opus/high-effort read-only review was requested after all fixes.
The first client process returned no response and was stopped after an extended
wait; a bounded retry exited with `Not logged in · Please run /login`. No second
verdict is claimed. The completed review and every disposition above remain
independently inspectable in the source, tests, report, and audit evidence.
