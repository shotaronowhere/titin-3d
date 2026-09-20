# Publication package — GitHub/Pages published; Featured pending

Use the [readiness record](READINESS.md) to check local verification and review
scope. Owner review of the desktop/phone opening, README account, and images is
still required before featuring. The owner authorized pushing the verified
repository on September 20, 2026. Commit `b215a87fe959e8c05988034718f52cd11b66a63b`
was pushed to `main` and its existing Pages deployment succeeded; the public
application and linked assets match the local candidate. See
[publication evidence](publication.json). Repository settings and LinkedIn were
not changed by this push.

## Reviewable material

- [README](../../../README.md) and [development reference](../../../docs/DEVELOPMENT.md)
- [LinkedIn/Pages image](../../../assets/social/titin-3d-linkedin-v1.png)
- [GitHub image](../../../assets/social/titin-3d-github-v1.png)
- [Stretch comparison](../../../docs/media/titin-stretch-comparison.png)
- [Desktop opening](raw/default-desktop.png) and [phone opening](raw/default-phone.png)
- Source-input commits: `b17f3637a8e6988478686d6dd80920f704397eaf`
  (metadata, source/recovery links) and `57154ebb183f61713561c03b4bc2e75dac042c88`
  (plain-language opening title).

## Featured item draft

**Title:** Titin-3D: Explore muscle structure and stretch

**Description:**

An interactive Three.js visualization of titin in muscle structure.
Stretch the model and inspect the scientific sources and assumptions behind it.
Developed with AI assistance; independent scientific validation is pending.

**Link:** [Titin-3D](https://shotaronowhere.github.io/titin-3d/)

## GitHub About draft

**Description:** Interactive 3D visualization of titin in sarcomere context, with a
stretch demonstration and inspectable scientific sources. Educational research preview.

**Website:** [https://shotaronowhere.github.io/titin-3d/](https://shotaronowhere.github.io/titin-3d/)

**Topics:** `scientific-visualization`, `threejs`, `titin`, `sarcomere`, `biomechanics`

**Repository social image:** `assets/social/titin-3d-github-v1.png`

This setting is separate from the demo's static Open Graph image.

## Publication progress and remaining steps

1. **Complete:** published the locally verified, ancestry-preserving integration
   to the existing `main` Pages source at `/`. Prior publication commit:
   `aaa069864187179bd03b54bbc3f59d898ef18c7a`. Do not change Pages configuration.
2. **Pending:** apply the About fields and separate repository social image above
   under the applicable authorization.
3. **Complete:** Pages deployment succeeded. The HTML identity verifier passed
   against the clean demo URL; both social images, both linked fallback diagrams,
   and the text transcript returned HTTP 200 and matched local bytes.
4. **Complete:** inspected GitHub's actual rendered README and both images in a
   fresh unauthenticated Chromium context. The public demo's Tour, Stretch, and
   Sources route also passed at a phone-sized viewport.
5. **Pending:** inspect the clean URL in LinkedIn Post Inspector, then inspect the actual
   Featured draft. A cached preview or Post Inspector result alone does not prove
   the personal Featured card. Use a custom image only if that editor offers it.
6. **Pending:** save the owner-approved Featured item and check its card, destination,
   Stretch, source route, and public repository access.
7. Record remaining actual LinkedIn preview observations,
   reviewers and prompting, and any physical-phone/in-app-browser results in
   READINESS.md. Do not change scientific gates as a side effect.

If any source commit is rewritten during integration, regenerate from that clean
input commit, reverify, and recapture before pushing. Never publish a stale
artifact and repair its identity afterward.
