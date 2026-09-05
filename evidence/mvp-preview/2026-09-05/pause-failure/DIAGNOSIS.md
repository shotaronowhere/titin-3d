# Pause-start timeout — diagnosis, 2026-09-06

Failure under investigation: `test/browser/stretch.spec.js` ›
"SC24/27A Pause freezes the sweep at an exact slider value", the single failure in the
2026-09-05 integrated Chromium run (69/70, exit 1). See [chromium.log](../chromium.log).

**Finding: the page was correct. The assertion never got to run.**
This was a harness round-trip that outlasted its own budget on a loaded host, not a defect
in the sweep. The fix is test-only, so the candidate bytes and every identity are unchanged.

## What the preserved trace shows

Read from [trace.zip](trace.zip) (`0-trace.trace` / `test.trace`), times relative to the
start of the test:

| t (s) | Event |
|---|---|
| 0.129 → 2.207 | `goto /index.html` completes |
| 3.658 → 5.049 | first `#chapterNext` click action |
| 5.773 → 6.958 | second `#chapterNext` click action |
| 7.442 → 7.886 | `#sl` filled with `2000` |
| 9.550 → 10.471 | `#stagePlay` click action, then navigations settle |
| 11.507 | `expect.poll` starts; 8,000 ms budget begins |
| 11.511 | its **first** `#sl.inputValue()` call is issued |
| 17.977 | the driver logs `waiting for locator('#sl')` — 6.5 s after the call was issued |
| 20.015 | the poll fails: `Timeout 8000ms exceeded while waiting on the predicate` |
| 21.996 | the locator resolves |
| 22.010 | that same call returns **`"2053"`** |

The sweep had started and had already advanced 53 nm past the 2,000 nm minimum. The
predicate `> 2000` was satisfied by the poll's own first sample; that sample arrived 2.0 s
after the poll had given up, because one `#sl` read took **10.5 s** end to end.

Everything else in the trace is slow in the same way — a 2.1 s page load and 1.2–1.4 s
clicks, against ~0.1–0.3 s on an unloaded host — and the whole run took 20.6 minutes for 70
tests. Local build and review work was running concurrently. That is corroborating context
for host starvation; the trace timings above are the finding itself.

Ruled out by the trace, not by argument: the sweep never starting, `toggleSweep` returning
early on an out-of-range length, a disabled control, an immediate `stopSweep` from a
pointer/keyboard interruption, and a page error (`failOnPageErrors` recorded none).

## Reproduction

| Command | Result |
|---|---|
| `npx playwright test test/browser/stretch.spec.js --project=chromium --grep 'Pause freezes' --repeat-each=3` | **3/3 passed**, 1.4 m ([repeat3.log](repeat3.log)) |
| `npx playwright test test/browser/stretch.spec.js --project=chromium` | **9/9 passed**, 3.5 m ([stretch-chromium.log](stretch-chromium.log)) |
| `npx playwright test test/browser/mvp-preview.spec.js test/browser/stretch.spec.js --project=chromium` | **13/13 passed**, 4.9 m ([chromium-stretch-mvp.log](chromium-stretch-mvp.log)) |

The original failure did not reproduce. That is recorded as what it is: the isolated runs
were green, and the trace explains the one observation. It is not a claim that the same
starvation cannot recur on a host under equal load.

## Change made

Test-only, in `test/browser/stretch.spec.js`. `test/` is not a build input
(`scripts/build_identity.mjs`), so `app_revision`, the build-input fingerprint, the model
fingerprint and the artifact hashes are untouched.

1. Both "the sweep has started" polls now go through one `expectSweepStarted(page)` helper
   carrying an explicit `{ timeout: 30_000 }` and the trace evidence in a comment. This is
   the same local headroom the supported-maximum assertion twelve lines below has carried
   since SC-24, for the same reason. The predicate is unchanged, so a sweep that never
   starts still fails — later, not never. Global timeouts, retries and `expect.timeout`
   are untouched, and no assertion was removed.

   A 30 s wait is only usable if the enclosing test can hold it. On the host that produced
   the failure, boot and setup alone reached 11.5 s, so a 30 s poll inside the 60 s default
   test budget would have failed on the *test* timeout instead — a worse and far less
   diagnosable failure than the one being fixed. The helper therefore raises its test's
   ceiling to 90 s, using `Math.max(90_000, test.info().timeout)` because
   `test.setTimeout` sets rather than raises and must not cut back a caller that asked for
   more. This is the repository's existing idiom: `test.slow()` on the shell and handoff
   gates, `test.setTimeout(120_000)` on the `@sweep` matrices, `test.setTimeout(90_000)` on
   the MVP replay test. It is a ceiling, not a duration; the fast path is unchanged.
2. Added `SC24/27A resuming a paused stretch continues instead of resetting`. The
   pause/resume half of the reset contract had no browser coverage: nothing checked that
   resuming from a paused intermediate length keeps that length instead of resetting to the
   working minimum. It records every `#sl` write during the resumed sweep and requires the
   minimum of them to be at or above the paused length — reading only the endpoint would
   also pass a reset that raced back up to 2,400 nm. The instrumentation is the pattern
   already used by `mvp-preview.spec.js`'s reduced-motion replay test, which observes the
   `2000` written by an endpoint reset.

   Non-vacuity was demonstrated, not argued. A positive control ran the identical
   instrumentation and the identical `min(writes) >= paused` predicate against a real
   endpoint replay — the one path that *does* reset. It recorded 31 writes beginning
   `[2000, 2013, 2027]`, `min(writes)` of 2,000 against a start of 2,400, and the predicate
   evaluated **false**. So a resume that reset would fail this test. (Those first three
   writes also confirm `stepSweep`'s 100 ms per-frame cap: 100/3000 × 400 nm ≈ 13 nm a
   frame, which is what keeps the sweep from jumping start to finish on a slow host.)

Preserved behavioral assertions, all still green: motion begins, pause stops below the
maximum, the paused length stays fixed, the slider still accepts a manual length after a
pause, resume continues from an intermediate length, and endpoint replay remains explicit
and announced (`mvp-preview.spec.js`, twice-repeated traversal).
