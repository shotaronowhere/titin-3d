# Transverse Lattice Geometry — Addendum to Phase 0

*Added in response to the direct question: "did we research the cross-sectional lattice spacing?" The honest prior answer was **no** — it was flagged as gap #5 in `PHASE0_REVIEW.md`. This addendum closes it, and verifies the constant-volume model in the referenced Desmos calculator.*

## The Desmos model, decoded and verified

The calculator (`desmos.com/calculator/36bbf0cb34`) implements the **isovolumetric (constant-volume) hexagonal-lattice model**:

```
d10 = sqrt( V_cell / ( (2/√3) · S_l · 1000 ) )      # inter-filament plane spacing
d_MA = (2/3) · d10                                   # myosin–actin centre-to-centre
d_y  = d_MA · cos(30°)                               # projected vertical offset
```

with `V_cell = 4.03×10⁶ nm³` held constant and `S_l` the sarcomere length (µm). I reproduced its outputs exactly:

| S_l (µm) | d₁₀ (nm) | d_MA (nm) | d_y (nm) |
|---|---|---|---|
| 2.85 (calculator default) | **34.99** | **23.33** | **20.20** |

These match the calculator's displayed values (34.994, 23.329, 20.204) to the digit. The core scaling is **d₁₀ ∝ 1/√(S_l)** — as the sarcomere lengthens, the lattice narrows so the unit-cell volume stays fixed (Poisson ratio 0.5).

## Is the constant-volume assumption correct? Partly — and this matters for the model.

This is a genuine, active scientific question, and the Granzier-adjacent lab (Irving/de Tombe) owns the primary data:

- **Yes, lattice spacing does shrink as SL increases** — the direction is robust. Irving, Konhilas, de Tombe et al. (2000) measured cardiac interfilament spacing by synchrotron X-ray diffraction across the working range and found spacing decreases significantly as sarcomere length increases; this underlies length-dependent activation (the molecular basis of Frank–Starling).
- **But real muscle is NOT strictly isovolumetric.** Cass, Williams, Irving, Lauga & Malingen (2021, *Biophys J*, "sarcomere breathing") used time-resolved X-ray diffraction and showed the contracting lattice is *neither constant-volume nor constant-spacing*: the effective Poisson ratio is **time-varying** — positive, zero, or even negative (auxetic) at different phases. Under ~10% axial strain the spacing changes only ~2.5% (≈1.2 nm on a 49 nm d₁₀), and not in exact antiphase with length. Skinned vs intact muscle also differ (intact is more tightly packed).

**Implication for the visualization (Phases 7–8):** the constant-volume relation is the correct, defensible *first-order* geometry for a passive/quasi-static sarcomere at different lengths — use it for the length-change animation, and it will look right. But it must be labelled an **idealization (STRONGLY INFERRED)**, not a measured law. During *active contraction* the true radial behavior is more complex and length-history-dependent (MEASURED, Cass 2021). Do not present the 1/√SL curve as exact instantaneous behavior during a contraction cycle.

## Values added to the geometry reference

Five rows are recorded in `titin_geometry_reference.csv` (component = "Myofilament lattice"):
- d₁₀ **decreases with SL** in relaxed intact and skinned rat cardiac trabeculae; intact values are approximately **7.5 nm below** skinned values (MEASURED, Irving 2000). The paper's plotted absolute values are not silently converted into a renderer constant.
- Hexagonal geometry, **1 thick : 2 thin** vertebrate ratio (MEASURED)
- Constant-volume scaling **d₁₀ ∝ 1/√SL** (STRONGLY INFERRED — the Desmos relation, numerically verified); its `4.03×10⁶ nm³` calibration and resulting absolute d₁₀ are **MODELED**, not attributed to Irving
- Real effective Poisson ratio **time-varying, not fixed 0.5** (MEASURED, Cass 2021) — the essential caveat
- Thick–thin surface separation **~8–15 nm** in rabbit psoas under the cited temperature/compression conditions (STRONGLY INFERRED, Caremani 2021). The renderer's value is independently derived from its own d10 and radii and is not fitted to this interval.

See `fig3_lattice.png` for the cross-section geometry and the three scaling curves.

## Primary sources
- Irving TC, Konhilas J, de Tombe PP, et al. *Am J Physiol Heart Circ Physiol* 2000. doi:10.1152/ajpheart.2000.279.5.h2568 — lattice spacing vs SL, cardiac.
- Cass JA, Williams CD, Irving TC, Lauga E, Malingen S, et al. *Biophys J* 2021. doi:10.1016/j.bpj.2021.08.006 — sarcomere breathing; time-varying Poisson ratio.
- Caremani M, et al. *J Gen Physiol* 2021. doi:10.1085/jgp.202012713 — 43.1 nm / 45.5 nm periodicities vs interfilament spacing.
- Farman GP, Irving TC, de Tombe PP, et al. *Biophys J* 2007. doi:10.1529/biophysj.107.104257 — spacing preserved during isometric contraction.
- Tanner BC, Farman GP, Irving TC, et al. *Biophys J* 2012. doi:10.1016/j.bpj.2012.08.014 — Drosophila flight-muscle surface distance and cross-bridge kinetics (context only; not a mammalian geometry source).
