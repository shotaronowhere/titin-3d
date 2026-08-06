# Demo-day preflight

Generated — build `905fc379518d`.

Run this on the presenting machine, on the presenting display.

1. **Open the deployed GitHub Pages URL and the offline standalone index.html.**
   - Expect: Both load without a network request after first paint.

2. **Compare the build fingerprint shown in the Evidence drawer of each.**
   - Expect: The two fingerprints are identical.

3. **Run the guided route once, end to end, on the actual display.**
   - Expect: Every chapter reaches its camera and reads legibly from the back of the room.

4. **Check typography, colour, animation, WebGL, and pointer behaviour.**
   - Expect: No clipping, no missing geometry, no dropped frames on orbit.

5. **Use Restart and the chapter shortcuts.**
   - Expect: Restart returns to chapter one; each shortcut lands on its own deterministic state.

6. **Confirm the static fallback deck is on the presenting machine.**
   - Expect: release/fallback/*.svg open without a browser engine or a network.

7. **Do not plan to open external citations during the narrative.**
   - Expect: Every source is reachable afterwards from the Evidence drawer.

## Fallback package

- `release/fallback/` — 6 static SVG slides generated from this build. They need no GPU, no browser engine, and no network.
- `release/SCREENSHOT_PACK.md` — the 52-cell review set, if you need to show a specific state you cannot reach live.

## Build identity

The Evidence drawer of both the hosted page and the offline file must read `905fc379518d`.
A mismatch means one of them is stale; prefer the offline file and re-deploy afterwards.

