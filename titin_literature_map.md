# Titin & Sarcomere Structural Literature — Subfield Map (2015–2026)

*Phase 0 research deliverable for the titin 3D visualization project. Corpus: 728 unique peer-reviewed papers retrieved from Europe PMC (MED + PMC), 2015–2026, across eight structural and five contextual facets. Of these, 356 are structural/geometric. This map is optimized for one purpose: identifying the evidence and quantitative parameters that constrain a scientifically defensible 3D model.*

---

## 1. How the field is shaped

The titin literature over the past decade is dominated by **disease genetics** — skeletal myopathy (283 papers) and cardiomyopathy (256 papers) together account for the largest share, driven by the discovery that *TTN* truncating variants are the leading genetic cause of dilated cardiomyopathy. This literature is **context, not geometry**: it validates which domains matter functionally but rarely reports structural dimensions.

The **structural/geometric strand** (356 papers) is smaller but is what your model must be built on. It has a clear inflection point: the **2023 cryo-EM structures of the native cardiac myosin filament** (Nature) resolved, for the first time, how titin, myosin, and MyBP-C are arranged within the intact thick filament — the single most important recent advance for an accurate A-band model.

Two structural facts recur across the corpus and should anchor the model's topology:
- **One titin molecule spans a half-sarcomere**, running continuously from the Z-disc to the M-line. The *TTN* gene has 363 coding exons encoding this single giant polypeptide.
- Titin is increasingly described as a **third filament** with distinct mechanical roles per region: an extensible entropic spring in the I-band, and a ruler/scaffold rigidly bound to the thick filament in the A-band.

## 2. Thematic breakdown

🔵 = structural/geometric theme (direct model input). Papers can belong to multiple themes.

| Theme | Papers | Relevance to model |
|---|---|---|
| Skeletal muscle disease / myopathy | 283 | Context (validation of domain functions via mutation); not geometry |
| Cardiac disease / cardiomyopathy | 256 | Context; TTN truncation biology; not geometry |
| Isoforms & splicing | 127 | **Critical** — N2B vs N2BA vs skeletal isoforms set I-band spring length |
| 🔵 Thick filament / myosin | 105 | **Core** — A-band geometry, myosin crown periodicity, titin binding |
| 🔵 Sarcomere lattice & mechanics | 101 | **Core** — sarcomere length ranges, passive tension, lattice |
| 🔵 Thin filament / actin-tropomyosin | 98 | **Core** — I-band thin-filament geometry, Z-disc anchoring |
| Titin signaling / kinase / N2B-N2A | 94 | Region identity (N2A/N2B spring elements); some geometry |
| 🔵 Z-disc / Z-band | 92 | **Core** — Z-disc lattice, α-actinin, titin Z-anchoring |
| 🔵 M-band / M-line | 78 | **Core** — M-line, myomesin, titin C-terminal anchoring |
| Phosphorylation / PTM | 75 | Mechanistic (spring stiffness modulation); not geometry |
| 🔵 Titin elasticity & PEVK spring | 66 | **Core** — PEVK/Ig spring mechanics, extension behaviour |
| 🔵 Cryo-EM / structural biology | 53 | **Core** — atomic/near-atomic structures = ground truth |
| 🔵 Titin domain architecture (Ig/Fn3) | 36 | **Core** — domain fold, size, tandem arrangement |


## 3. Canonical geometric parameters extracted from the corpus

These are quantitative candidates for the geometric specification, each traced to a source DOI. The original values were extracted from abstracts and hand-curated; the canonical `data/geometry_sources.json` record now states the verification depth for every adopted value. Abstract-supported values remain explicitly provisional and must not be upgraded to full-text-verified without a figure/table check.

| Component | Region | Parameter | Value | Source (DOI) |
|---|---|---|---|---|
| Sarcomere | whole | Tested working pair in rat myocardium | 2.0–2.4 µm | 10.1073/pnas.1516732113 |
| Sarcomere | whole | Cross-study tested span (not one physiological range) | 1.51–4.4 µm | 10.1152/ajpcell.00156.2015 + 10.1152/ajpcell.00183.2017 |
| Titin | whole | Molecular span within half-sarcomere | half-sarcomere (Z-disc → M-line) — | 10.1083/jcb.106.5.1563 |
| Thick filament | A-band | Axial repeat period (myosin crowns) | 42.9–43.0 nm | 10.1073/pnas.2311883121 |
| Thick filament | A-band | Myosin crowns per axial repeat | 3 count | 10.1073/pnas.2311883121 |
| Thick filament | A-band (C-zone) | Titin super-repeat axial periodicity | 45.5 nm | 10.1085/jgp.202012713 |
| Thick filament | A-band | Axial repeat (recent cryo/X-ray) | 43.0 nm | 10.1016/j.bpj.2025.09.019 |
| Titin | A-band (C-zone) | Ig/Fn3 domains per super-repeat | 11 count | 10.1016/j.yjmcc.2019.05.026 |
| Titin | A-band (C-zone) | Number of C-zone super-repeats | 11 count | 10.1016/j.yjmcc.2019.05.026 |
| Titin | general | Axial spacing per folded Ig/Fn3 domain | ~4 nm | 10.1016/j.jmb.2020.06.025 |
| Titin | I-band (N2A) | N2A unique-sequence contour length | 39 nm | 10.3389/fphys.2020.00173 |
| Titin | I-band (N2A) | N2A unique-sequence persistence length | 0.35 nm | 10.3389/fphys.2020.00173 |
| Titin | I-band (UN2A) | UN2A three-helix bundle length | 45 residues | 10.1016/j.jmb.2021.166901 |
| Z-disc | Z-disc | Width (super-resolution) | 62 nm | 10.1371/journal.pone.0300348 |
| Z-disc | Z-disc | α-actinin cross-linked actin doublet spacing | 6 nm | 10.1016/j.cell.2021.02.047 |
| Thin filament | I-band | Actin tip region devoid of α-actinin links | 5–7 nm | 10.1016/j.jmb.2015.08.018 |
| Thin filament | I-band | Thin-filament length (max, at SL 3.0 µm) | 1.05 µm | 10.1016/j.yjmcc.2016.04.013 |


**Coverage gaps** (where the corpus abstracts did *not* yield firm geometry — flag as "explicitly unknown" per your Phase 0 principle, or seek from primary structural databases):
- Absolute I-band contour length per titin isoform at defined sarcomere lengths (partially covered; isoform-dependent).
- PEVK segment length/persistence-length in cardiac vs skeletal isoforms (mechanics well-studied; exact dimensions sparse in abstracts).
- M-line titin (M-is domains) 3D arrangement and myomesin cross-link geometry.
- Radial lattice spacing (thick–thin inter-filament distance) — reported in X-ray diffraction literature, thin in this abstract-level corpus.

## 4. Landmark papers for the model (most-cited structural work)

| Cites | Year | Paper | DOI |
|---|---|---|---|
| 539 | 2015 | Myocardial stiffness in patients with heart failure and a preserved ejection fraction: contributions of collagen and titin. | 10.1161/circulationaha.114.013215 |
| 169 | 2018 | Titin Gene and Protein Functions in Passive and Active Muscle. | 10.1146/annurev-physiol-021317-121234 |
| 156 | 2017 | Muscle structure, sarcomere length and influences on meat quality: A review. | 10.1016/j.meatsci.2017.04.261 |
| 154 | 2016 | Titin strain contributes to the Frank-Starling law of the heart by structural rearrangements of both thin- and thick-filament proteins. | 10.1073/pnas.1516732113 |
| 147 | 2023 | Cryo-EM structure of the human cardiac myosin filament. | 10.1038/s41586-023-06691-4 |
| 143 | 2016 | Work Done by Titin Protein Folding Assists Muscle Contraction. | 10.1016/j.celrep.2016.01.025 |
| 140 | 2018 | Force Generation via β-Cardiac Myosin, Titin, and α-Actinin Drives Cardiac Sarcomere Assembly from Cell-Matrix Adhesions. | 10.1016/j.devcel.2017.12.012 |
| 129 | 2023 | Structure of the native myosin filament in the relaxed cardiac sarcomere. | 10.1038/s41586-023-06690-5 |
| 125 | 2021 | The molecular basis for sarcomere organization in vertebrate skeletal muscle. | 10.1016/j.cell.2021.02.047 |
| 111 | 2018 | The multiple roles of titin in muscle contraction and force production. | 10.1007/s12551-017-0395-y |
| 108 | 2016 | Thick filament mechano-sensing is a calcium-independent regulatory mechanism in skeletal muscle. | 10.1038/ncomms13281 |
| 106 | 2016 | Increasing Role of Titin Mutations in Neuromuscular Disorders. | 10.3233/jnd-160158 |
| 105 | 2022 | Titin (TTN): from molecule to modifications, mechanics, and medical significance. | 10.1093/cvr/cvab328 |
| 105 | 2021 | Truncated titin proteins and titin haploinsufficiency are targets for functional recovery in human cardiomyopathy due to <i>TTN</i> mutations. | 10.1126/scitranslmed.abd3079 |
| 102 | 2015 | Dynamics of equilibrium folding and unfolding transitions of titin immunoglobulin domain under constant forces. | 10.1021/ja5119368 |


## 5. Recommended structural ground-truth sources (beyond this corpus)

The corpus points repeatedly to primary structures that should be pulled directly from databases for the geometric spec:
- **PDB / EMDB** — 2023 cardiac myosin filament cryo-EM (EMDB entries associated with doi:10.1038/s41586-023-06691-4 and 10.1038/s41586-023-06690-5); individual titin Ig/Fn3 domain crystal & NMR structures (e.g., I27/I91).
- **AlphaFold DB** — full-length titin domain-by-domain models for regions lacking experimental structures (use with explicit confidence/uncertainty flags — per your "unknown remains unknown" principle).
- **UniProt Q8WZ42** (human titin) — domain architecture, region boundaries (Z / I / A / M), isoform definitions (N2B, N2BA, novex).

## 6. How this maps to your pipeline

| Pipeline stage | What this map provides |
|---|---|
| Peer-reviewed evidence | 728-paper corpus; 23 landmark structural papers; theme map |
| Scientific synthesis | Section 1–2 narrative; region topology (Z→I→A→M, one titin per half-sarcomere) |
| Machine-readable geometric spec | `titin_geometry_reference.csv` — 17 sourced parameters ready to encode |
| Known-unknowns | Section 3 coverage gaps — regions to mark explicitly unknown |

---

*Method note: retrieval via Europe PMC REST API (keyless), faceted title/abstract queries restricted to 2015–2026, deduplicated by DOI/PMID. Thematic tagging by keyword rules; geometric parameters by LLM extraction over 131 structural abstracts (228 raw params → 17 curated). Citation counts are Europe PMC `citedByCount` at retrieval time. All parameter values require verification against source figures/tables before use in the model.*
