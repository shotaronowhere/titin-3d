# Mobile guide review fixes — 2026-09-10

Reviewed standalone SHA-256: `cabd8ee8391f53d10dd2318b4911c8f32442727535139a7613eb72d5643b7d51`.
Build inputs: `7622f3da5393`; scientific model: `7badc8e270e7`.

## Changes

- Guide defaults to collapsed on phones, portrait tablets and short screens. Explicit disclosure choice survives chapter changes and Research round trips.
- Explanation and mechanics share a keyboard-accessible scroll region when expanded content exceeds the available space. Navigation and the disclosure button remain outside that region; a visible scroll cue explains where the controls are.
- Short landscape and 640×360 zoom layouts place the guide beside the stage. Collapsed Stretch keeps the slider, playback and compact modeled-force route accessible.
- Manual camera manipulation survives disclosure, viewport resizing and Research round trips. Explicit semantic navigation restores automatic framing.
- The inspection invitation remains outside hidden explanation content. Floating placement protects comparison bars and the molecular span; short screens place the invitation in the guide header.
- Mobile comparison bars show the changing I-band and fixed A-band half on a stable scale. I-band extension appears beside sarcomere length, and the scale ruler remains visible. Terminus labels avoid the molecular span.
- Slider targets meet the 44 px floor on desktop as well as touch layouts. Control-budget and disclosure-sensitive tests follow the new UI.

## Verification

- Full Node suite: **618 passed** after the main fixes. Final standalone, presentation and phase-27A tests: **38 passed** after the last layout changes.
- Final guide matrix: **27 disclosure/layout/camera tests passed** across Chromium, Firefox and WebKit. Final corrected playback matrix: **3 passed**, one per engine.
- Existing controls, final-polish, MVP-preview and Stretch regression cases: **48 passed**. Existing shell, history, compact-height, zoom and accessibility cases: **18 passed**.
- Final capture matrix: **12 captures** covering collapsed and expanded Stretch at 320×568, 390×844, 768×1024, 844×390, 640×360 and 1280×720. No page errors, document overflow, unresolved overlay verdicts, or axe WCAG A/AA violations (including 2.1 and 2.2 tags).
- Build, release-pack freshness, TypeScript and git whitespace checks passed. Generated `index.html` and release identities are current.

The retained browser logs include superseded test failures: the first playback test allowed real animation time to complete during slow automation; its replacement freezes time. WebKit then exposed a race between host time and the installed browser clock before playback started. The final test uses an explicit clock epoch and passed in all three engines. No application assertion was removed to hide a failure.

Screenshots and `verification.json` are tied to the final standalone hash. The initial broad browser runs overlapped small layout refinements; the final guide matrix, playback rerun and all 12 captures exercised the final application build. Validation used automated desktop browser engines and emulated viewports, not physical phones.

## Committed build

The standalone and release pack were regenerated after source commit `1481235db6298b9c6055fa16e0d8f75936fe64f0`. The committed standalone SHA-256 is `f9e9039ac7641f3253b7d30c0e8d92a1ac23ef720ea9fa313d2c51d83754c2f4`. Its only change from the captured and tested candidate is the embedded app revision: replacing the clean commit ID with the previous development revision reproduces the reviewed file hash exactly. See `committed-build.json`.
