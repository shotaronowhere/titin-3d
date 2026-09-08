# Final MVP self-review — September 9, 2026

## Decision

The bounded Chrome/Firefox scientist-feedback preview is complete and suitable for a small private researcher review, preferably introduced through its short Tour. The wider aspiration—exceptional visual impact and independently demonstrated lay understanding—is not yet established. Engineering completion and audience impact are different acceptance criteria.

No application, scientific data, generated release, or ZIP was changed during this review. Do not reopen the scientific model or commission another broad sprint on the strength of these design judgments. Treat actual reader feedback as the next decision input.

## What was reviewed

- The application/controller, inspection metadata, Tour, standalone builder, and fallback generator changes since baseline `32e8941`.
- The exact candidate's desktop and phone screenshots, including opening, Stretch, scaffold, finale, force, evidence, and source records.
- Final verification records, their failed attempts and coverage limits, and the delivered ZIP's current hash.
- Fresh Chromium scope and finale-to-source regressions: **3/3 passed in 42.4 seconds**, including desktop and phone, Measure-before-finale scroll restoration, native keyboard activation, source visibility, and focus return. See `focused-chromium.log`.

The earlier full matrix remains 618 Node tests, 87 Chromium checks, and 34 Firefox checks. Those results were read, not all rerun for this review. WebKit remains unverified. The earlier native-click 22-view capture has exactly the same standalone and manifest hashes as the delivered ZIP. Later extracted-capture and download timeouts are retained in the package record; this review does not establish their cause or erase them. It does not constitute independent biological adjudication, physical-device certification, or a human learning study.

## Audience assessment

| Question | Assessment |
|---|---|
| Is the agreed MVP implemented? | Yes, within the documented private-preview scope and browser coverage. |
| Can leading researchers usefully review it? | Yes. Selected claims, evidence classes, preparation/locator records, model limitations, and deterministic exports give them concrete material to inspect and challenge. |
| Will they be impressed? | The provenance and reproducibility workflow is the strongest demonstration. Their reaction cannot be established by self-review or test counts. |
| Is it scientifically validated? | No independent validation is claimed. The presentation fixes match canonical records; preserving those records does not prove the complete biological model. |
| Is the guided UX intuitive? | It has a coherent five-beat sequence, visible continuation, a stable Stretch comparison, and a clear final evidence action. This is a heuristic assessment, not observed novice success. |
| Is Research intuitive? | It is navigable and traceable but dense. Build identifiers, decision codes, and repeated qualifications compete with the selected scientific question. |
| Is it visually attractive? | The interface has consistent typography, spacing, dark surfaces, and a useful pink identity accent. The molecular composition has only moderate impact: narrow overview, substantial unused stage area, and a dim close-up with insufficient structure identification. |
| Does it educate laypeople? | The intended lesson is coherent. Actual comprehension and misconception rates remain unknown. A reader can follow Next without necessarily understanding the depicted relationships. |

## Remaining findings and priorities

### 1. Large type does not enlarge much of Research — concrete UI defect, P2

`src/index.template.html:521–527` sets large-mode `.sub`, `.note`, list and table-cell text to 13 px. Research's ordinary text is also fixed at 13 px (`:556`). The parent size change therefore does not enlarge those explicitly sized descendants. The control promises projector/back-of-room readability (`:820`) that it does not reliably supply.

This was a documented pre-existing deadline cut, not a new regression. Fix its actual Research sizes and verify overflow, or hide the control until it works. For an immediate private demonstration, do not rely on it; rehearse using browser zoom on the actual display. It is not a reason to rebuild the scientific model.

### 2. Scaffold close-up does not sufficiently identify its structures — visual/educational finding, P2

The close-up has more molecular detail than the overview, but a newcomer must infer which surfaces belong to which structures. Its gray components have limited separation. The rendered screenshot, rather than the declared palette contrast ratios alone, supports this judgment. `data/render_style.json:20–30` shows the deliberate subdued palette; it should not be reported as a measured accessibility failure of the 3D scene.

If one more presentation patch is justified, prioritize two unobtrusive labels for the already displayed titin and myosin, with enough presentation contrast to distinguish them. Bind to existing anchors and retain the schematic-placement caveat. Do not invent molecular coordinates, add partners, stretch geometry vertically, or redesign lighting during this finish. On narrow screens, preserve the narrative rather than crowding the image.

Evidence: [desktop scaffold](../../mvp-final/2026-09-08/scroll-corrected-frames/desktop-beat-4.png).

### 3. The source destination leads with build hashes — discovery friction, P2

`src/index.template.html:981–990` puts Build identity before Sources. In the phone screenshot, a reader following “Sources for this object” sees three hashes before the paper records. The values are useful for reproducibility but are not the first answer to the reader's source question.

A bounded improvement would move this existing identity block below the bibliography or place it in a collapsed build-details section. Preserve the identifiers, export content, and verification contract. This is a content-ordering improvement, not a launch blocker for specialist feedback.

Evidence: [phone source destination](../../mvp-final/2026-09-08/scroll-corrected-frames/phone-source.png).

### 4. The overview is accurate in proportion but weak as a visual centerpiece — defer broader layout work

The long thin subject, similar views in beats 1 and 2, and unused lower-right canvas mean much of the teaching happens through prose. `unobscuredFrameOptions` (`src/index.template.html:5198`) places the model in a horizontal band above the story card, even on desktop where that card occupies only the left portion. This is an understandable collision-avoidance tradeoff, but it limits composition.

Do not solve this by distorting the biological aspect ratio. The existing close-up and locator are safer teaching tools. A future composition change would touch shared framing and responsive behavior and is not the highest-return pre-feedback task. The stable Stretch frame is a real improvement and should be preserved.

Evidence: [opening](../../mvp-final/2026-09-08/scroll-corrected-frames/desktop-beat-1.png), [Stretch](../../mvp-final/2026-09-08/scroll-corrected-frames/desktop-beat-3.png).

### 5. Reliability coverage is bounded — operational requirement for a live demonstration

The final package discloses WebKit failures and incomplete fresh extracted phone/Architecture screenshot capture. A new three-test Chromium pass is encouraging but does not explain prior stalls or guarantee live performance. Before a high-stakes live presentation, rehearse the actual ZIP on the intended machine, display, and browser. If the primary route stalls there, that is a blocker for that demonstration. Retain the verified static slides and transcript as the documented fallback. Do not turn these unknowns into an unsupported all-browser claim.

## What is already working well

The canonical scope correction, titin-domain metadata correction, stable Stretch comparison, force precision/ordering, source action placement, final evidence action, and navigation/focus/scroll fixes directly address the original problems. The source diff keeps them in presentation and inspection code rather than changing the force laws or biological records. The standalone/manifest/ZIP identity chain is strong. Exported omitted force remains blank, and sensitivity is distinguished from a confidence interval. These are substantive strengths for an expert-facing prototype.

The Tour's limited choices and the improved force/evidence landings are more approachable than the Research inventory. The new final action makes the provenance demonstration much easier to discover. None of these observations establishes independent scientific accuracy or novice learning outcomes.

## Highest-return next step

Share the frozen package privately with a few researchers, using the short guide and asking for specific corrections to depiction, scope, source-to-claim mapping, and preparation transfers. For a live showcase, first complete one rehearsal on the actual presentation setup.

Separately, let two or three newcomers use the Tour without coaching and then ask:

1. Where does one titin molecule begin and end?
2. What changes during Stretch, and what stays fixed in this model?
3. Which molecule supplies the motor action described in the opening?
4. Is the displayed force measured directly or estimated by this model?

This is a quick formative check, not proof of educational efficacy. Use their answers to choose one caption or identification improvement. Do not add accounts, surveys, new simulations, new isoforms, or a new renderer before getting this feedback.

**Recommendation:** share as a traceable research-feedback preview. Describe the interface as coherent and the scientific workflow as inspectable. Reserve claims of exceptional visual polish and successful lay education for evidence that actually establishes them.
