# SD-05 — preliminary depiction review (SC-25)

- Decision: `SD-05` — terminal anchoring, stoichiometry, and depiction semantics
- Scope of this record: a **preliminary** review of the irregular N2A/PEVK treatment,
  the representative-molecule wording, and the interaction surfaces SC-25 adds. It
  covers depiction only.
- Reviewed model fingerprint: `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6`
- Evidence: `evidence/scientific/SC-25/render-audit.json`,
  `evidence/scientific/SC-25/picking-audit.json`, and the five byte-digested
  captures listed in `evidence/scientific/SC-25/manifest.json`.

## What this record is, and is not

This review is conducted under the project's existing
`owner_authorized_citation_backed_ai_adjudication` policy
(`data/scientific_decisions.json` → `review_policy`), the same authority under
which SD-01 through SD-05 were adjudicated in SC-20. It is **not** an independent
human specialist attestation, and it does not claim one: `reviewer` remains
`null`, `independent_human_review_status` remains `NOT_PERFORMED`, and the final
human depiction and release review remains SC-27's gate.

The plan's SC-25 contract names SD-05 as a human decision blocker for two things
in particular. Both are addressed here as follows:

| Blocker | Disposition in SC-25 |
| --- | --- |
| A multiplicity view (more than one drawn molecule) | **Not included.** SC-25 adds no molecule copies. The only object it adds per region is a non-rendering hit area, which is never drawn and cannot be mistaken for a second chain. |
| "The disordered depiction does not imply an ordered or measured conformation" | Reviewed below against measured properties of the drawn chain, and left standing. This is the semantic claim the named SD-05 reviewer owns; SC-27 remains its gate. |

## 1. The irregular N2A / PEVK treatment

The SC-20 depiction rule is that the disordered regions are drawn as a seeded,
bounded, endpoint-preserving irregular ribbon that claims no conformation. SC-25
changes no coordinate, no seed, no amplitude, and no endpoint. What it adds is a
measurement of whether the drawing actually reads as irregular, taken from the
rendered control points rather than asserted:

| Region | Mean transverse radius (nm) | Relative radius spread | Angular-step spread (rad) |
| --- | ---: | ---: | ---: |
| `N2A` | 1.977 | 0.633 | 0.796 |
| `post_N2A_unknown` | 2.756 | 0.600 | 0.792 |
| `PEVK` | 2.695 | 0.629 | 1.201 |

A regular helix has a constant radius (relative spread 0) and a constant angular
step (spread 0). Every disordered region is far from both, at every sarcomere
length the gate exercises (2,000 / 2,200 / 2,400 / 2,600 nm). The maximum
transverse offset stays inside the declared envelope
(`maximum_transverse_envelope_radius_scale`), and the canonical endpoints are
reproduced exactly, so the irregularity remains transverse-only.

**Assessment: the treatment continues to support SD-05's rule.** The drawing reads
as "an unresolved chain with slack", not as a measured or predicted conformation.
No wording change is required.

One caveat worth recording for SC-27: the drawn chain of `post_N2A_unknown` is
visually indistinguishable from those of `N2A` and `PEVK`, while its evidence
status is different in kind — it is an explicitly unadjudicated sequence interval,
not a region with an unresolved conformation. The distinction is carried by the
annotation text and the evidence class, not by the depiction. That is consistent
with SD-01's ruling and is not a new SC-25 defect, but a human depiction reviewer
should decide whether the render itself ought to distinguish "unresolved shape"
from "unadjudicated sequence".

## 2. Representative-molecule wording

SD-05's approved rules are that one representative Q8WZ42-1 molecule is shown per
primary half-sarcomere path, that the six-strand rendering is not a public view,
and that the representative path is not a copy-number claim. The render audit
records `titin_strands_drawn: 1`, `copy_number_claimed: false`, and the unchanged
`depiction_policy` string. SC-25 adds no path, no strand, and no copy.

The interaction surfaces SC-25 adds were reviewed against the same rules:

| SC-25 surface | Depiction status |
| --- | --- |
| Non-rendering pick proxies | One per drawn region, on a layer the camera never renders, excluded from bounds, screenshots, and object counts. Declared `not_claimed`: not an envelope, surface, transverse dimension, or second copy. Resolves to the same canonical annotation as the visible region. |
| One-time identity pulse | Colour channel only. Evidence opacity is neither read nor written, and the pulse yields to a real selection rather than competing with it. It ends on the base identity colour exactly. |
| Direct-label and legend selection | Routes to existing canonical annotations. It adds no label that names a structure the model does not draw, and band labels with no annotatable target stay inert rather than becoming controls that resolve to a nearby protein. |
| Reading-width statement | New public wording: titin's drawn line is compared to the measured 2.636 nm folded-domain cross-section and declared a reading width rather than a scale. This *narrows* what the render claims and is consistent with the existing `render_width_meaning` declaration. |

**Assessment: no representative-molecule wording change is required, and no new
claim is introduced.** The reading-width statement is a new public sentence that
restates an existing non-claim in the place a viewer meets it.

## 3. Findings returned to SC-20/25

Per the plan, a finding here returns to SC-20/25 rather than being deferred as
cosmetic polish. Two were found and both were fixed inside SC-25:

1. The stage colour key — the surface that answers "which one is titin" — was
   rendered on every frame and never displayed, because an id selector does not
   beat the user agent's `[hidden] { display: none !important }`. Fixed; the key
   is visible and its entries select the structures they name.
2. At 1280x720 the cold open's story card covered the whole I-band, so no point of
   the PEVK spring could be reached by pointer at all. Fixed by framing every
   Learn camera against the measured unobscured stage band.

Neither changed a coordinate, an evidence class, or a claim.

## 4. What remains for SC-27

- Independent human specialist review of the depiction semantics above.
- Projector, grayscale, and colour-vision review of the tuned line weight and halo.
- Physical-device touch review.
- The `post_N2A_unknown` depiction question in section 1.

Sources: `data/render_style.json`, `data/scientific_decisions.json`,
`docs/scientific-decisions/SC-19/SD-05.md`,
`docs/scientific-decisions/SC-20/OWNER-AUTHORIZED-RULINGS.md`,
`evidence/scientific/SC-25/`.
