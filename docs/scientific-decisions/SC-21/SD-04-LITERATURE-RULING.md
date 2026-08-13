# SD-04 citation-backed literature ruling

- Decision: `SD-04`
- Date: 2026-08-12
- Authority: project-owner-authorized citation-backed AI adjudication
- Human expert review claimed: **no**
- Result: **APPROVED WITH EXPLICIT MODEL AND REGIME LIMITS**

## Question adjudicated

Whether the repository may display an approximate passive force per titin from its serial
Marko-Siggia WLC/eWLC model after auditing its force-law parameters, cross-preparation transfers,
validity interval, parameter sensitivity, slack/contact omission, and Ig-domain unfolding omission.

## Primary-literature basis

The ruling uses primary studies from established titin-mechanics groups and peer-reviewed journals:

1. Linke, Ivemeyer, Mundel, Stockmeier, and Kolmerer, *PNAS* (1998),
   [doi:10.1073/pnas.95.14.8052](https://doi.org/10.1073/pnas.95.14.8052). Rat-psoas
   PEVK was fit with an extensible WLC using persistence length 0.55 nm and stretch modulus 185 pN.
   Its contour construction used 1,400 residues times 0.34 nm/residue. The reported contour-length
   sensitivity (450–500 nm) produced persistence lengths 0.60–0.53 nm and stretch moduli
   150–250 pN. This is the central source parameterization, not a direct human-tissue measurement.
2. Linke, Stockmeier, Ivemeyer, Hosser, and Mundel, *Journal of Cell Science* (1998),
   [doi:10.1242/jcs.111.11.1567](https://doi.org/10.1242/jcs.111.11.1567). Rat-psoas
   tandem-Ig WLC fits gave 21 or 42 nm depending on the assumed number of titin strands.
3. Trombitás, Greaser, Labeit, Jin, Kellermayer, Helmes, and Granzier, *Journal of Cell Biology*
   (1998), [doi:10.1083/jcb.140.4.853](https://doi.org/10.1083/jcb.140.4.853). In-situ
   immunoelectron microscopy identified about 2.0 µm as slack and showed tandem-Ig straightening
   followed by PEVK extension while the measured Ig segments remained folded in the studied range.
4. Lanzicher, Zhou, Saripalli, Keschrumrus, Smith, Mayans, Sbaizero, and Granzier,
   *Frontiers in Physiology* (2020),
   [doi:10.3389/fphys.2020.00173](https://doi.org/10.3389/fphys.2020.00173). Recombinant
   human N2A unique sequence without CARP had persistence length 0.34 ± 0.01 nm and an observed
   distribution of approximately 0.1–1.0 nm; the 104-residue construct had about 39 nm contour.
5. Leake, Wilson, Gautel, and Simmons, *Biophysical Journal* (2004),
   [doi:10.1529/biophysj.103.033571](https://doi.org/10.1529/biophysj.103.033571). Direct
   optical-tweezers measurements showed PEVK persistence length depends materially on ionic strength
   and temperature, spanning roughly 0.4–2.7 nm across the reported conditions. This range is used
   for sensitivity, not represented as population uncertainty.
6. Nagy, Grama, Huber, Bianco, Trombitás, Granzier, and Kellermayer, *Biophysical Journal* (2005),
   [doi:10.1529/biophysj.104.057737](https://doi.org/10.1529/biophysj.104.057737). The
   in-situ/single-molecule analysis used 0.38 nm/residue for PEVK contour and 15 nm for tandem-Ig
   persistence, supporting the alternate sensitivity endpoints.
7. Trombitás, Wu, Labeit, Labeit, and Granzier, *Biophysical Journal* (2003),
   [doi:10.1016/S0006-3495(03)74732-8](https://doi.org/10.1016/S0006-3495(03)74732-8).
   Human-soleus fibers had slack length near 2.0 µm; the measurements made large-scale Ig unfolding
   unlikely but did not establish that all Ig transitions are absent.
8. Rivas-Pardo, Eckels, Popa, Kosuri, Linke, and Fernández, *Cell Reports* (2016),
   [doi:10.1016/j.celrep.2016.01.025](https://doi.org/10.1016/j.celrep.2016.01.025).
   Titin Ig folding/unfolding can occur at physiological forces. The present solver omits those
   transitions, so its upper boundary must be conservative.
9. Tiessen, Leonard, and Herzog, *American Journal of Physiology—Cell Physiology* (2026),
   [doi:10.1152/ajpcell.00469.2025](https://doi.org/10.1152/ajpcell.00469.2025). A rabbit-psoas
   in-situ fit used PEVK persistence length 0.65 nm and 0.36 nm/residue and estimated stretch modulus
   62.88 pN (95% CI 56.37–69.62 pN). Its difference from the older 185 pN central value is treated as
   cross-preparation parameter sensitivity.

## Corrections and parameter ruling

The prior record's PEVK residue rise of 0.30 nm/residue was not supported by its cited locator.
The central value is corrected to 0.34 nm/residue to reproduce Linke et al. (1998), giving a
Q8WZ42-1 sequence-derived PEVK contour proxy of 1,807 × 0.34 = 614.38 nm. The 0.38 nm/residue
convention is retained as a sensitivity endpoint, not silently averaged with the central source.

The approved central values are therefore 21 nm tandem-Ig persistence, 0.34 nm N2A persistence,
0.55 nm PEVK persistence, 185 pN PEVK stretch modulus, 0.34 nm/residue PEVK rise, and 300 K.
Sequence-derived contours remain bound to `data/titin.json`. Literature sensitivity endpoints are:

| Quantity | Central | Sensitivity endpoints | Interpretation |
|---|---:|---:|---|
| proximal/distal tandem-Ig persistence | 21 nm | 15, 42 nm | fit/strand-assumption and preparation spread |
| N2A persistence | 0.34 nm | 0.1, 1.0 nm | observed recombinant-fragment distribution |
| PEVK persistence | 0.55 nm | 0.4, 2.7 nm | condition/preparation spread |
| PEVK stretch modulus | 185 pN | 56.37, 250 pN | modern fit lower CI endpoint through older contour sensitivity |
| PEVK residue rise | 0.34 nm/residue | 0.38 nm/residue | documented contour conventions |

These endpoints are evaluated one at a time. Their output envelope is a **parameter sensitivity
range**, not a confidence interval, biological population variance, error bar, or covariance model.

## Regime ruling

- `not_evaluated` below 2,000 nm: slack, buckling, filament contact, and compression are absent from
  the tensile-chain solver.
- `supported` from 2,000 through 2,400 nm: the cited in-situ studies support the qualitative serial
  extension regime, and the central laws reproduce published force-law parameterizations. This is
  model support, not validation against a human Q8WZ42-1 tissue measurement.
- `extrapolated` above 2,400 and below 2,500 nm: PEVK increasingly contributes and cross-preparation
  transfer becomes more consequential.
- `not_evaluated` at or above 2,500 nm: this is a conservative project cutoff, not a measured
  biological transition. It prevents the no-unfolding solver from being used where the conflicting
  in-situ and single-molecule Ig evidence becomes materially important.

## Approved claim and mandatory caveat

The application may report a regime-labelled **approximate passive force per titin** for this
tissue-neutral Q8WZ42-1 reference-sequence model. It must state the rat/rabbit/recombinant-human
transfers, expose the parameter sensitivity range, and keep force null in `not_evaluated` regimes.
It may not call the result a measured human force, tissue prediction, confidence interval, active
force, total myofibril force, or model of Ig unfolding/refolding.

This ruling satisfies the project owner's stated scientific-review criterion. It does not claim an
independent human expert reviewed the repository, and the separate human release-review requirement
in the project policy remains unchanged.
