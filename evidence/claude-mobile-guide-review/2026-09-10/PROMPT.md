You are Claude, asked by the project owner for an independent review of the current mobile tutorial/guide UX change in a titin/sarcomere educational visualization.

The user's original request: "the tutorial guide window can be quite distracting, especially on mobile when it takes up most of the space and can't be minimized, also the stretch is hard to see and visualize on mobile. improve that ux, maybe make it collapsable."

Review only. Do not modify files, run commands/builds, publish, or delegate. You have Read, Glob and Grep tools only. Return the complete Markdown review in your final response; the caller saves it. Inspect only this project and the listed review evidence, not credentials or unrelated files. Be candid and specific; don't invent findings or treat passed tests as proof of good UX. Distinguish reproduced observations, source/screenshot inference, and validation gaps. You cannot claim to have run the app or tests yourself.

Workspace: /Users/shotaro/Downloads/artifacts
Evidence folder: /Users/shotaro/Downloads/artifacts/evidence/claude-mobile-guide-review/2026-09-10

Start with CHANGES.diff and the screenshots in the evidence folder to form your own assessment. Then inspect surrounding source and tests as needed:
- src/index.template.html (editable implementation; avoid reading the huge bundled index.html)
- src/presentation/TourView.js
- src/presentation/StageLayout.js and relevant rendering/frame code as needed
- test/browser/guide-disclosure.spec.js (NEW untracked test, not included in git diff)
- test/browser/stretch.spec.js
- test/browser/ux-overhaul.spec.js
- README.md

The change adds a Show guide / Hide guide control, starts collapsed on mobile/portrait tablets, retains explicit state through lesson navigation and Research round trips, leaves lesson navigation/slider/playback accessible, hides the secondary force route in the collapsed mobile view, makes expanded text independently scrollable, and reframes after disclosure changes. It also draws thicker proportional I-band and A-band teaching spans on mobile, reports I-band change from the working-minimum sarcomere length, and replaces the scale ruler on short screens when that comparison uses its lane. It rebuilds the standalone and generated release metadata; no biological model/data changes.

Screenshots: stretch-before.png is the PRE-CHANGE 390x844 Stretch view. guide-320.png/guide-390.png/guide-768.png are collapsed current Stretch views at 2000 nm. Their -expanded variants are expanded views at 2400 nm. guide-1280.png is desktop at 2000 nm. The captures are from the same implementation session; the 320 expanded capture includes the final 70dvh cap. Small accessibility-markup-only edits may follow captures without altering their visible layout. Compare honestly: do not describe 2000 vs 2400 nm images as equal-length geometry comparisons.

Test evidence: guide-unit-final.log reports 618/618 Node tests passed. guide-cross-browser.log reports 12/12 guide disclosure scenarios across Chromium, Firefox and WebKit. guide-shell-tests.log reports 2/2 existing phone/desktop Tour shell tests. guide-history-tests.log reports the direct-entry/history/custom-camera regression passed with a 120s test budget. guide-scroll-tests.log separately validates the final keyboard-scrolling assertion on 320px WebKit. guide-browser-tests.log is the EARLIER run with 14/16 passes: the initial 320px comparison bug was subsequently fixed and tested in the cross-browser run; the last direct-entry/history test hit its original 60s budget then passed on rerun. The other 11 Stretch scenarios passed. The implementer also ran axe WCAG2A/AA/2.1AA scans at 320,390,768,1280 with no violations, but those stdout results are not a saved report here. No physical-device or human usability study was conducted. Do not imply all existing browser tests were run.

Give a bounded, actionable review:
1. Verdict: does the change meaningfully address the user's request, and what (if anything) should block delivery?
2. Prioritized concrete findings with file:line references, affected viewport/state, reasoning, and a focused fix. Focus on real functionality/UX/accessibility regressions, incorrect scientific communication, and missing important tests. Check disclosure sizing, text scrolling/focus, short/landscape viewports, preserving playback and manually adjusted camera state, and clarity of the new comparison. Label judgments as judgments.
3. Distinguish must-fix findings from optional polish; do not propose a broad redesign or revalidation of unchanged scientific data.
4. Note the strongest aspects and the relevant validation limits briefly. If no actionable defects are found, say so explicitly.
