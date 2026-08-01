# Figure — Phase 8 I-band partition correction

**(a) Before.** Per-region implied force at each reference state, obtained by inverting
each region's own chain law at its recorded extension. The four I-band regions sit in
mechanical SERIES between the Z-disc and the thick-filament tip, so they must bear a
COMMON force; any vertical spread at a given sarcomere length is therefore a defect in
the partition, not a physical result. Spread reached 553x at `stretched`, where the
partition held N2A and PEVK exactly constant from `resting` so the whole +100 nm of
stretch fell on the two Ig tandems, driving distal Ig to 98.7% of contour = 277.5 pN
— inside the 150-300 pN AFM regime `domain_unfolding` classifies as EXTREME /
non-physiological and `transition_rules.forbidden` bars from depicting as ordinary
contraction. Open triangles mark regions AT their contour length, where no finite force
reproduces the value; the `extended_reference` spread is therefore computed from the two
reachable regions only and is labelled as such rather than quoted as agreement.

**(b) After.** Every state re-derived by solving for the single force that makes the four
regions sum to that state's (unchanged) I-band total. Spread is 1.0x everywhere by
construction; the dashed line is that common force. Values: contracted 0.116 pN, resting 0.517 pN, stretched 1.473 pN, extended_reference 10.359 pN.

**(c)** Each state's I-band total is preserved bit-exactly — only the internal partition
moved, so no filament, overlap, M-line or lattice geometry changed.

## Chain parameters (all sourced; no fitted constants)

| region | law | persistence length A | contour Lc | source |
|---|---|---|---|---|
| proximal Ig | WLC | 21 nm | 308.0 nm | poly-Ig, ref traced to primary |
| N2A | rigid folded Ig + WLC | 0.35 nm (coil) | 4.0 nm rigid + 35.0 nm coil | skeletal N2A isoform |
| PEVK | extensible WLC (K0 = 185 pN) | 0.55 nm | 542.1 nm | rat psoas, skeletal |
| distal Ig | WLC | 21 nm | 60.0 nm | poly-Ig, ref traced to primary |

The 4.0 nm folded-domain axial length is MEASURED in `geometry_sources.parameters[10]`
(uncertainty 4.0-4.4 nm), independently corroborated by the Phase 6 Ig measurement of
4.319 nm, and is the same figure already used to derive both Ig tandem contour lengths.

Evidence class of the corrected partitions: **`MODELED (series force balance over
MEASURED chain parameters)`**. `MODELED` was added to the plan's evidence vocabulary in
session 9 with the project owner's authorisation, as a sixth class defined for quantities
*computed* from an explicit physical law whose every parameter is itself MEASURED or
STRONGLY INFERRED and none of which was fitted to the value produced. It ranks **below**
`STRONGLY INFERRED` on the certainty ladder
(`UNKNOWN < SCHEMATIC < INFERRED < MODELED < STRONGLY INFERRED < MEASURED`), because a
derived consequence is not an observation. Relabelling from the previous
`STRONGLY INFERRED (MODELED: ...)` is therefore a small **downgrade** in declared
confidence — the honest direction. The class carries validator-enforced preconditions no
other class needs: `model_basis` (the law and its citation) and `modeled_from` (the
evidence class of every input) must be present, and if any input were weaker than
STRONGLY INFERRED the value would take that weaker class instead, so modelling can never
launder confidence upward. Superseded values, the reason, and the full `supersession_chain`
are retained in each state's `titin_I_band_extension_provenance`.

## Isoform scope, and one thing that is *not* validation

The chain parameters are measured on **rat psoas** titin; this spec is **human canonical
Q8WZ42** whose PEVK (1807 aa, Lc 542.1 nm) is substantially longer. Persistence length and
stretch modulus are per-unit-length material properties and transfer across isoforms;
contour lengths are *not* transferred — every Lc is computed from this spec's own domain
counts and residue spans.

This matters for how one datapoint may be read. The source states that at 2.9-3.0 um SL,
force per titin is near 10 pN with PEVK extension ~50%. The model, using no force datum
and no extension datum, predicts across that window:

| SL | I-band total | predicted force | PEVK % of contour |
|---|---|---|---|
| 2.90 um | 625.0 nm | 7.911 pN | 49.9% |
| 2.95 um | 650.0 nm | 9.052 pN | 53.9% |
| 3.00 um | 675.0 nm | 10.359 pN | 58.0% |

The I-band total at each SL follows from sarcomere geometry alone (SL, Z-disc width,
thick-filament half-length), so both columns are predictions rather than fits. But this is
recorded as a **cross-isoform plausibility check, not validation**: fractional extension
`z/Lc` depends on force alone and is isoform-independent (56.9% at 10 pN for Lc = 542.1,
300.0 or 240.0 nm alike) — so that half of the agreement is just the source's own
force-extension relation, already covered by `source_validation`. Absolute force *is*
isoform-sensitive: at SL 3.0 um it rises 10.4 -> 14.6 -> 25.8 -> 67.2 pN as PEVK contour
falls 542.1 -> 450 -> 350 -> 240 nm. Forces predicted for this long-PEVK canonical isoform
are therefore **lower bounds** relative to a short-PEVK psoas fibre at equal SL, and
agreement in absolute pN across different isoforms cannot be claimed as validation of this
spec's numbers.

One parameter deserves explicit note, since the source reports two persistence lengths for
PEVK. A = 0.65 nm belongs to the **purely entropic** fit (Eq. 1, valid below ~12 pN /
<60% extension); A = 0.55 nm pairs with K0 = 185 pN in the **entropic-enthalpic** fit
(Eq. 2), which the source says describes the full range of PEVK extension. The model uses
the Eq. 2 pair. Substituting 0.65 nm while retaining 185 pN would mix two different fits
and misattribute both.
