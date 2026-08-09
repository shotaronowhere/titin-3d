# Demo-day preflight

Generated — model `8234f36bad39a916b1428dc082c72dff0f7762d2b8404f50dbccc97eefe01cbe`; app `53a071e85d0df4d1d57af41617ec6f0a9f0d14e3`; build inputs `b2baf9914e9ca458864ad1f360f57c0c80f51235a64966ce4450f60f10d40605`.

Run this on the presenting machine, on the presenting display.

1. **Open the deployed GitHub Pages URL and the offline standalone index.html.**
   - Expect: Both load without a network request after first paint.

2. **Compare the model, application, and build-input identities shown in the Evidence drawer of each.**
   - Expect: All three identities are identical.

3. **Run the guided route once, end to end, on the actual display.**
   - Expect: Every chapter reaches its camera and reads legibly from the back of the room.

4. **Check typography, colour, animation, WebGL, and pointer behaviour.**
   - Expect: No clipping, no missing geometry, no dropped frames on orbit.

5. **Use Restart and the presenter keys listed at the head of the presenter script.**
   - Expect: Restart returns to chapter one; each key lands on its own deterministic state.

6. **Confirm the static fallback deck is on the presenting machine.**
   - Expect: release/fallback/*.svg open without a browser engine or a network.

7. **Do not plan to open external citations during the narrative.**
   - Expect: Every source is reachable afterwards from the Evidence drawer.

## Fallback package

- `release/fallback/` — 6 static SVG slides generated from this build. They need no GPU, no browser engine, and no network.
- `release/SCREENSHOT_PACK.md` — the 52-cell review set, if you need to show a specific state you cannot reach live.

## Candidate identity

The Evidence drawer of both the hosted page and the offline file must report model `8234f36bad39a916b1428dc082c72dff0f7762d2b8404f50dbccc97eefe01cbe`; app `53a071e85d0df4d1d57af41617ec6f0a9f0d14e3`; build inputs `b2baf9914e9ca458864ad1f360f57c0c80f51235a64966ce4450f60f10d40605`.
A mismatch in any field means the candidates differ. Prefer the manifest-verified offline file; production parity is proved only at final release.

