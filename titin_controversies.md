# Open Controversies & Lab Positions — Titin in the Sarcomere

*Requested review item: "what is the consensus opinion of the Granzier and Gotthardt labs?" This document captures the positions relevant to what the model should — and should not — assert. It closes gap #4 (open-controversies section) from `PHASE0_REVIEW.md`.*

## Why this matters for the visualization

The master plan forbids inventing structure and forbids presenting contested mechanisms as settled. Two questions about titin are genuinely unresolved in the field, and the model must stay agnostic on both:
1. Does titin contribute to **active** force (beyond passive elasticity)?
2. Is the lattice **constant-volume** during contraction? (covered in `titin_lattice_addendum.md`)

## Granzier lab (Henk Granzier, U. Arizona) — consensus position

The dominant, well-supported view of titin as the **passive elastic element** of the sarcomere, plus a **calcium-modulated** stiffness:

- **Titin is the primary source of passive tension** in cardiac and skeletal muscle (alongside collagen at longer lengths). Established across the lab's foundational work (passive tension contributions, 1995; titin as myocardial mechanics player, 2004).
- **Passive stiffness is tuned by isoform expression and phosphorylation.** Differential expression of compliant (N2BA) vs stiff (N2B) cardiac isoforms sets myocardial stiffness; PKA/PKG phosphorylation of N2B and PKCα phosphorylation of PEVK modulate it. This is central to the lab's HFpEF (heart failure with preserved ejection fraction) work (2015).
- **Titin participates in length-dependent activation** via lattice spacing — the Cazorla/Fukuda/Irving/Granzier papers (2001, 2005) show titin-based modulation of Ca²⁺ sensitivity and interfilament spacing, linking titin to the Frank–Starling mechanism (Ait-Mou et al. 2016, "titin strain contributes to Frank–Starling").
- **On active force / "calcium-dependent stiffening":** Granzier's group has shown titin's PEVK/N2A can bind actin and that Ca²⁺ increases titin-based stiffness ("calcium-dependent molecular spring elements", 2003) — but the lab is **measured about claiming titin generates active force**. The consensus Granzier position is titin as a *tunable spring whose stiffness is Ca²⁺- and phosphorylation-modulated*, not an independent motor.

## Gotthardt lab (Michael Gotthardt, MDC Berlin) — consensus position

Focus on titin as a **signaling and splicing-regulated** element and its role in **diastolic function**:

- **Titin splicing is actively regulated and disease-relevant.** The lab's RBM20 work (Guo et al. 2012; 2014) established that RBM20 represses splicing to control titin isoform size — a direct genetic lever on passive stiffness and a cause of hereditary cardiomyopathy.
- **The N2B element is functionally required for diastole.** Targeted deletion of the titin N2B region causes diastolic dysfunction and cardiac atrophy (Radke et al. 2007) — direct in vivo evidence that specific spring elements set diastolic mechanics.
- **Titin truncating variants cause myopathy/cardiomyopathy** through defined mechanisms (recessive TTN truncations, core myopathy, 2014).
- Position converges with Granzier on titin as the **passive/diastolic stiffness determinant tuned by isoform composition**; Gotthardt emphasizes the *transcriptional/splicing control layer* and *signaling*, less the active-force question.

## Where the two labs agree (safe to model as consensus)

- Titin spans the **half-sarcomere Z-disc → M-line** and is the **molecular ruler + passive spring**.
- **Passive stiffness is set by isoform (N2B/N2BA) composition and phosphorylation state** — a real, adjustable parameter, not fixed.
- Titin contributes to **length-dependent activation / Frank–Starling** via strain sensing and lattice effects.

## The genuinely contested claim (model must stay neutral)

**Does titin actively generate force during contraction?** A separate community (Herzog, Nishikawa — "winding filament hypothesis"; Rivas-Pardo & Fernández 2016 — "titin folding assists contraction") argues titin contributes *active* contractile energy: Ig-domain refolding at 6–8 pN delivers ~105 zJ/domain, and Ca²⁺-dependent PEVK–actin binding could let titin wind on the thin filament. This is **not settled**. The Granzier/Gotthardt mainstream treats titin's Ca²⁺ effects as *stiffness modulation*, not motor action.

**Modeling directive:** represent titin as a **passive, Ca²⁺-/phosphorylation-tunable spring** (consensus). Do **not** animate titin actively shortening or "winding" as if established. If the active-force hypothesis is shown, label it explicitly as a *hypothesis* with a distinct visual treatment. Never depict rare Ig-domain unfolding (6–8 pN physiological; 150–300 pN only under AFM fast-pulling) as part of ordinary contraction.

## Primary sources
- Granzier & Irving, passive tension contributions, *Biophys J* 1995.
- Cazorla, Wu, Irving, Granzier. Titin-based modulation of Ca²⁺ sensitivity. *Circ Res* 2001. doi:10.1161/hh1001.090876
- Labeit et al. Calcium-dependent molecular spring elements in titin. *PNAS* 2003.
- Ait-Mou, de Tombe, et al. Titin strain and Frank–Starling. *PNAS* 2016. doi:10.1073/pnas.1516732113
- Guo et al. RBM20 regulates titin splicing. *Nat Med* 2012. doi (in corpus).
- Radke et al. Targeted deletion of titin N2B. *PNAS* 2007.
- Rivas-Pardo, Fernández et al. Work done by titin folding. *Cell Rep* 2016. doi:10.1016/j.celrep.2016.01.025 (the ACTIVE-force side; cite as hypothesis).
