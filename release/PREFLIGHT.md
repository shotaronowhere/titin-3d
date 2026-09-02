# Demo-day preflight

Generated — model `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6`; app `6029da7d46cbad98d9ea036087cfd30284c385b7`; build inputs `93efeccf9bbc041c60e5b2f194e469e5ca28884cd129f64ea860f811f7867cd5`.

Run this on the presenting machine, on the presenting display.

1. **Open the deployed GitHub Pages URL and the offline standalone index.html.**
   - Expect: Both load without a network request after first paint.

2. **Compare the model, application, and build-input identities shown in Research → Sources & build on each.**
   - Expect: All three identities are identical.

3. **Run the Tour once, end to end, on the actual display.**
   - Expect: Every beat reaches its camera and reads legibly from the back of the room.

4. **Check typography, colour, animation, WebGL, and pointer behaviour.**
   - Expect: No clipping, no missing geometry, no dropped frames on orbit.

5. **Use final-beat Replay and the presenter keys listed at the head of the presenter script.**
   - Expect: Replay returns to beat one; each key lands on its own deterministic state.

6. **Confirm the static fallback deck is on the presenting machine.**
   - Expect: release/fallback/*.svg open without a browser engine or a network.

7. **Do not plan to open external citations during the narrative.**
   - Expect: Every source is reachable afterwards from Research → Sources & build.

## Fallback package

- `release/fallback/` — 6 static SVG slides generated from this build. They need no GPU, no browser engine, and no network.
- `release/SCREENSHOT_PACK.md` — the 48-cell review set, if you need to show a specific state you cannot reach live.

## Candidate identity

Research → Sources & build in both the hosted page and the offline file must report model `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6`; app `6029da7d46cbad98d9ea036087cfd30284c385b7`; build inputs `93efeccf9bbc041c60e5b2f194e469e5ca28884cd129f64ea860f811f7867cd5`.
A mismatch in any field means the candidates differ. Prefer the manifest-verified offline file; production parity is proved only at final release.

