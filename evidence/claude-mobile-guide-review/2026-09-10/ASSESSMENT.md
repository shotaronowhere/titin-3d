# Assessment of Claude's review

Claude's review is useful and identifies real regressions that the targeted passing test subset missed. I recommend addressing the camera reset, inspection-hint visibility/placement, and affected browser-test expectations before treating the UX patch as finished. Application source was not changed during this review.

## Confirmed or directly supported

- **M4, manual camera reset:** independently reproduced in Chromium; see VERIFICATION.md and manual-camera-check.json. Toggling the guide after orbiting resets the viewing direction. The new unconditional resize reframe has the same source-level risk, but that variant was not separately reproduced.
- **M1, short-phone hint hidden:** directly supported by the screenshot and source: the hint is moved into the hidden guide body. Existing compact-height tests require it to remain visible.
- **S2, hint obscures comparison bars:** confirmed by visually inspecting guide-390-expanded.png. The pill covers the central section of the bars even though their text labels remain clear. Layout checks must account for meaningful graphics, not just text.
- **M3 and the test portion of M2:** inspected controls.spec.js and final-polish.spec.js. They retain old control-count limits or click the now-hidden force button without expanding the guide. These are source-predicted failures; those specs were not rerun as part of this review.
- **Landscape limitation:** independently reproduced at 844×390. Playback and slider are below the fold with the guide collapsed. The fixed 680 px document layout predates this patch, but remains relevant to the mobile request.

## Recommendations that need qualification

- **M2, force readout:** hiding a secondary force readout was intentional and is documented. Restoring it is a design option, not automatically a functional requirement: the expanded guide and Research Measure still expose the force evaluation. Existing tests need to follow the intended route. Claude's claim that restoring the chip costs no height is too categorical on narrow phones, where wrapping increases the row height.
- **S1, zero extension:** the supplied collapsed screenshots were explicitly set to 2,000 nm; ordinary Stretch entry is 2,200 nm, where the readout reports +100 nm. Therefore +0 is not the universal entry state. Reinstating a ruler only when delta is zero also needs collision checks, because the comparison bars remain in the same lane.
- **M4's suggested test/fix:** preserving a manual camera is the right contract, but absolute screen coordinates naturally change on resize. A resize test should compare camera orientation/zoom or account for changed viewport projection. A guard based only on sceneId should be checked against other legitimate Custom states rather than copied blindly.
- **Default collapsed, persistence and scroll affordance:** useful design suggestions, with no physical-device or human usability evidence establishing one mandatory solution.

The complete external review, including its suggested fixes and validation limits, is preserved verbatim in REVIEW.md.
