#!/usr/bin/env python3
"""
Phase 6 — PDB / Structural Data Pipeline.

Treats mmCIF files as scientific SOURCE DATA, not runtime assets. For each
selected structure:

    mmCIF -> biological assembly -> chain/domain extraction
          -> UniProt-verified residue mapping (alignment, not trust)
          -> principal axes + dimensions -> bends / interaction geometry
          -> primitive fit -> VALIDATION of the approximation

Writes data/structure_measurements.json. Does NOT modify the spec: adopting a
measurement into geometry_strategy.json is a separate, explicit step so that a
measured number can never silently overwrite a reviewed literature value.

STATISTICAL NOTE. Chains within one crystal are NOT independent observations —
they are copies related by crystal packing, often with differently disordered
termini. Class statistics are therefore computed over ONE primary (maximum
coverage) chain PER ENTRY; within-entry spread is reported separately as a
crystallographic precision estimate. Pooling all chains would be
pseudo-replication and would understate the true uncertainty.

Run:  python3 scripts/measure_structures.py
"""
import json
import os
import sys

import numpy as np

try:
    import gemmi
except ImportError:
    sys.exit("gemmi required:  pip install gemmi")

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
RAW = os.path.join(APP, "data", "structures")
OUT = os.path.join(APP, "data", "structure_measurements.json")
ACC = "Q8WZ42"

# Which entries measure which archetype. Primary = the Phase-5 selection;
# alternates were recorded in Phase 5 precisely so Phase 6 could test whether
# folded geometry is region-invariant.
ENTRIES = {
    "Ig_like": [("3PUC", "primary"), ("5JDJ", "alternate"), ("1TIT", "alternate")],
    "Fn3":     [("8OMW", "primary"), ("8OT5", "alternate")],
    "kinase":  [("1TKI", "primary"), ("4JNW", "alternate")],
}

# Sequence positions where a deposited structure genuinely differs from the
# canonical Q8WZ42 sequence, each verified against the RCSB entity record.
# Keyed (pdb_id, chain, uniprot_position). An UNDOCUMENTED internal mismatch is
# a hard validator failure — it may mean a mis-registered chain, and measuring a
# mis-registered chain would silently describe the wrong protein. Listing a
# position here asserts only that the difference has been checked and explained.
DOCUMENTED_VARIANTS = {
    ("1TIT", "A", 12679): (
        "Observed GLU where canonical Q8WZ42 has LYS. RCSB reports "
        "rcsb_mutation_count 0 for entity 1, so this is not an annotated "
        "engineered mutation; 1TIT is a 1996 NMR structure of the I91 (I27) "
        "domain, predating the current canonical sequence. Single conservative "
        "surface position, 1 of 89 residues, with no effect on the fitted "
        "envelope: the domain remains a valid Ig exemplar."),
}


# ---------------------------------------------------------------- data fetch
def fetch(pid):
    """Return exact manifest-pinned mmCIF + SIFTS inputs."""
    cif = os.path.join(RAW, pid + ".cif")
    sif = os.path.join(RAW, pid + "_sifts.json")
    missing = [path for path in (cif, sif) if not os.path.exists(path)]
    if missing:
        raise FileNotFoundError(
            "missing manifest-pinned structural source(s): " + ", ".join(missing)
            + "; run python3 scripts/fetch_structures.py"
        )
    return cif, sif


def uniprot_sequence():
    p = os.path.join(RAW, ACC + ".fasta")
    if not os.path.exists(p):
        raise FileNotFoundError(
            f"missing manifest-pinned {p}; run python3 scripts/fetch_structures.py"
        )
    return "".join(l.strip() for l in open(p) if not l.startswith(">"))


# ------------------------------------------------------- residue-level mapping
def one_letter(resname):
    info = gemmi.find_tabulated_residue(resname)
    return info.one_letter_code.upper() if info and info.is_amino_acid() else None


def align_offset(obs, guess, seq, window=25):
    """
    Find the UniProt start that maximises identity with the observed sequence.

    SIFTS is authoritative for correspondence but both SIFTS and the UniProt
    cross-reference proved off-by-one for constructs carrying an expression-tag
    remnant (3PUC starts 'GP...', 8OMW 'S...'). Verifying by alignment rather
    than trusting either number is what catches that; a silent one-residue
    frame shift would drop identity to ~8% and corrupt every measurement.
    """
    best = (None, -1)
    for k in range(max(1, guess - window), guess + window + 1):
        cand = seq[k - 1:k - 1 + len(obs)]
        if len(cand) < len(obs):
            continue
        ident = sum(1 for a, b in zip(obs, cand) if a == b)
        if ident > best[1]:
            best = (k, ident)
    return best


def assembly_note(st, assemblies):
    """Is a declared multimer a biological interface, or crystal packing?

    Counts heavy-atom contacts (<4 A) between every chain pair, then checks
    whether the DECLARED assembly partners are the largest interfaces. If the
    biggest contacts are between chains that are not declared partners, the
    annotation reflects lattice packing. Monomeric entries need no check.

    This exists because the pipeline previously asserted in prose that all
    selected entries were monomeric, which was false for 5JDJ.
    """
    multimeric = [a for a in assemblies
                  if a["oligomeric_details"] not in ("monomeric", "?", None)]
    if not multimeric or len(st[0]) < 2:
        return {"declared": "monomeric",
                "affects_measurements": False,
                "note": "single-chain assembly; nothing to disambiguate"}

    ns = gemmi.NeighborSearch(st, 5.0).populate()
    contacts = {}
    for ch in st[0]:
        for res in ch:
            for at in res:
                for mark in ns.find_atoms(at.pos, "\0", radius=4.0):
                    other = mark.to_cra(st[0]).chain.name
                    if other != ch.name:
                        key = tuple(sorted((ch.name, other)))
                        contacts[key] = contacts.get(key, 0) + 1
    contacts = {k: v // 2 for k, v in contacts.items()}

    # asm.generators list label_asym_id (including ligand/water subchains); the
    # model's chains are auth_asym_id. Map between them and keep POLYMER only,
    # or every declared pair is missed and the check becomes vacuous.
    lab2auth = {}
    for ch in st[0]:
        for res in ch:
            if res.het_flag == "A":
                lab2auth.setdefault(res.subchain, ch.name)
    declared_pairs = set()
    for asm in st.assemblies:
        chs = sorted({lab2auth[s] for g in asm.generators for s in g.subchains
                      if s in lab2auth})
        if len(chs) == 2:
            declared_pairs.add(tuple(chs))
    ranked = sorted(contacts.items(), key=lambda kv: -kv[1])
    top = ranked[:3]
    top_undeclared = [k for k, _ in top if k not in declared_pairs]

    return {
        "declared": sorted({a["oligomeric_details"] for a in multimeric}),
        "n_declared_assemblies": len(multimeric),
        "largest_interfaces": [{"chains": list(k), "contacts_lt_4A": v,
                                "is_declared_partner": k in declared_pairs}
                               for k, v in top],
        "declared_partners_are_largest": len(top_undeclared) == 0,
        "affects_measurements": False,
        "note": ("declared multimer is NOT supported by the largest observed "
                 "interfaces — consistent with crystal packing, not a biological "
                 "dimer. Titin Ig/Fn3 domains are tandem beads on one "
                 "polypeptide. Each chain is fitted individually, so this does "
                 "not affect any reported dimension."
                 if top_undeclared else
                 "declared partners are the largest observed interfaces"),
    }


# ------------------------------------------------------------- geometry / fits
def heavy_atom_coords(residues):
    P = []
    for r in residues:
        for a in r:
            if a.element == gemmi.Element("H"):
                continue
            P.append([a.pos.x, a.pos.y, a.pos.z])
    return np.array(P)


def ca_coords(residues):
    P = []
    for r in residues:
        a = r.find_atom("CA", "*")
        if a:
            P.append([a.pos.x, a.pos.y, a.pos.z])
    return np.array(P)


def principal_frame(P):
    """PCA of the heavy-atom cloud. Angstrom in, Angstrom out."""
    c = P.mean(axis=0)
    X = P - c
    cov = X.T @ X / len(X)
    w, V = np.linalg.eigh(cov)
    order = np.argsort(w)[::-1]
    w, V = w[order], V[:, order]
    proj = X @ V
    return dict(
        centroid=c, axes=V, proj=proj,
        extent=proj.max(axis=0) - proj.min(axis=0),
        semi=np.abs(proj).max(axis=0),
        rg=float(np.sqrt((X ** 2).sum(axis=1).mean())),
    )


def fit_primitives(f):
    """Ellipsoid (PCA-aligned, bounding) and capsule (along PC1)."""
    proj, semi = f["proj"], f["semi"]
    radial = np.linalg.norm(proj[:, 1:], axis=1)
    cap_r = float(radial.max())
    length = float(f["extent"][0])
    return dict(
        ellipsoid_semi_axes_nm=[float(s / 10) for s in semi],
        capsule_radius_nm=cap_r / 10,
        capsule_length_nm=length / 10,
        capsule_cylinder_nm=(length - 2 * cap_r) / 10,
    )


def validate_fit(f, prim):
    """
    Phase-6 step 8 — validate the approximation.

    Enclosure fraction: what proportion of heavy atoms the primitive contains.
    Volume ratio: primitive volume against the convex-hull volume of the atoms
    (a primitive far larger than the hull is depicting empty space as protein).
    """
    proj = f["proj"]
    semi = f["semi"]
    n = len(proj)
    inside_ell = float(np.sum(((proj / semi) ** 2).sum(axis=1) <= 1.0) / n)

    cap_r = prim["capsule_radius_nm"] * 10
    half_cyl = max(prim["capsule_length_nm"] * 10 / 2 - cap_r, 0.0)
    z, rad = proj[:, 0], np.linalg.norm(proj[:, 1:], axis=1)
    d = np.where(np.abs(z) <= half_cyl, rad,
                 np.sqrt(np.maximum(rad ** 2 + (np.abs(z) - half_cyl) ** 2, 0)))
    inside_cap = float(np.sum(d <= cap_r + 1e-9) / n)

    vol_ell = 4 / 3 * np.pi * float(np.prod(semi))
    vol_cap = np.pi * cap_r ** 2 * (2 * half_cyl) + 4 / 3 * np.pi * cap_r ** 3
    hull = None
    try:
        from scipy.spatial import ConvexHull
        hull = float(ConvexHull(proj).volume)
    except Exception:
        pass
    return dict(
        ellipsoid_enclosure_frac=inside_ell,
        capsule_enclosure_frac=inside_cap,
        ellipsoid_volume_nm3=vol_ell / 1000,
        capsule_volume_nm3=vol_cap / 1000,
        convex_hull_volume_nm3=(hull / 1000) if hull else None,
        ellipsoid_volume_ratio_vs_hull=(vol_ell / hull) if hull else None,
        capsule_volume_ratio_vs_hull=(vol_cap / hull) if hull else None,
    )


def chain_geometry(CA, f):
    """Step 6 — bends and the chain-direction axis."""
    nc_vec = CA[-1] - CA[0]
    nc = float(np.linalg.norm(nc_vec))
    u = nc_vec / nc
    rel = CA - CA[0]
    perp = np.linalg.norm(rel - np.outer(rel @ u, u), axis=1)
    contour = float(np.linalg.norm(np.diff(CA, axis=0), axis=1).sum())
    pc1 = f["axes"][:, 0]
    ang = float(np.degrees(np.arccos(min(1.0, abs(float(nc_vec @ pc1) / nc)))))
    return dict(
        n_to_c_nm=nc / 10,
        n_to_c_vs_pc1_deg=ang,
        max_bend_from_nc_axis_nm=float(perp.max() / 10),
        ca_contour_nm=contour / 10,
        straightness=float(nc / contour),
    )


# ------------------------------------------------------------------ per chain
def measure_entry(pid, seq):
    cif, sif = fetch(pid)
    sf = json.load(open(sif))
    mappings = sf[pid.lower()]["UniProt"].get(ACC, {}).get("mappings", [])
    st = gemmi.read_structure(cif)
    st.setup_entities()
    assemblies = [dict(name=a.name, oligomeric_details=a.oligomeric_details)
                  for a in st.assemblies]
    # NOTE: assembly stoichiometry is recorded for completeness but does NOT
    # affect any measurement — every chain is fitted individually. Where an entry
    # declares a multimer, assembly_note() reports whether the declared partners
    # are in fact the largest interfaces, because a titin Ig/Fn3 domain is a bead
    # on a single polypeptide and a declared homodimer is more likely packing.
    st.remove_alternative_conformations()
    st.remove_hydrogens()
    st.remove_ligands_and_waters()

    chains = []
    for mp in mappings:
        cname = mp["chain_id"]
        try:
            ch = st[0][cname]
        except Exception:
            continue
        rs = list(ch.get_polymer())
        if not rs:
            continue
        obs = "".join(one_letter(r.name) or "X" for r in rs)
        k, ident = align_offset(obs, mp["unp_start"], seq)
        if k is None:
            continue
        cand = seq[k - 1:k - 1 + len(obs)]
        keep = [rs[i] for i in range(len(obs)) if obs[i] == cand[i]]
        dropped = [rs[i].seqid.num for i in range(len(obs)) if obs[i] != cand[i]]
        if len(keep) < 40:
            continue
        idx = [i for i in range(len(obs)) if obs[i] == cand[i]]

        P, CA = heavy_atom_coords(keep), ca_coords(keep)
        f = principal_frame(P)
        prim = fit_primitives(f)
        chains.append(dict(
            chain=cname,
            n_residues_mapped=len(keep),
            n_heavy_atoms=int(len(P)),
            # Two DIFFERENT quantities that must not be conflated.
            #
            # core_identity_frac asks "did we measure the right protein?" — over
            # the residues that map to the canonical sequence, how many match.
            # It must be ~1.0; anything less is a real sequence disagreement.
            #
            # native_residue_frac asks "how much of what we observed is titin?" —
            # the fraction of observed residues that map at all. It is below 1.0
            # whenever the construct carries an expression-tag remnant (5JDJ/A
            # observes 91 residues of which 3 are a 'GAM' cloning scar, giving
            # 0.967 with a PERFECT 88/88 core alignment).
            #
            # The earlier single `identity_frac` was matches over the FULL
            # observed length, which mixes the two: it made a clean structure
            # with a longer tag look like a sequence mismatch.
            # core_identity_frac is measured over the CONTIGUOUS SPAN between the
            # first and last mapped residue, so an internal mismatch (a point
            # mutation, a mis-registered chain) lowers it, while a terminal tag
            # remnant does not. Dividing matches by the matched set would be
            # tautologically 1.0 and would detect nothing.
            core_identity_frac=round(
                sum(1 for i in range(idx[0], idx[-1] + 1) if obs[i] == cand[i])
                / (idx[-1] - idx[0] + 1), 4),
            internal_mismatches=[rs[i].seqid.num
                                 for i in range(idx[0], idx[-1] + 1)
                                 if obs[i] != cand[i]],
            internal_mismatch_detail=[
                {"pdb_resnum": rs[i].seqid.num,
                 "uniprot_position": k + i,
                 "observed": obs[i],
                 "canonical": cand[i],
                 "documented": DOCUMENTED_VARIANTS.get((pid, cname, k + i))}
                for i in range(idx[0], idx[-1] + 1) if obs[i] != cand[i]],
            native_residue_frac=round(len(keep) / len(obs), 4),
            n_residues_observed=len(obs),
            unp_start_aligned=k + idx[0],
            unp_end_aligned=k + idx[-1],
            unp_start_sifts=mp["unp_start"],
            unp_end_sifts=mp["unp_end"],
            sifts_offset_delta=k - mp["unp_start"],
            unmapped_construct_residues=dropped,
            extent_long_nm=float(f["extent"][0] / 10),
            extent_mid_nm=float(f["extent"][1] / 10),
            extent_short_nm=float(f["extent"][2] / 10),
            radius_of_gyration_nm=f["rg"] / 10,
            mean_cross_section_nm=float((f["extent"][1] + f["extent"][2]) / 2 / 10),
            **chain_geometry(CA, f),
            **prim,
            **validate_fit(f, prim),
        ))
    return dict(pdb_id=pid, assemblies=assemblies, n_models=len(st),
                assembly_note=assembly_note(st, assemblies), chains=chains)


# ------------------------------------------------------------------ aggregate
def stats(vals):
    v = np.asarray(vals, dtype=float)
    return dict(n=int(v.size), mean=float(v.mean()), sd=float(v.std(ddof=1)) if v.size > 1 else 0.0,
                median=float(np.median(v)), min=float(v.min()), max=float(v.max()))


def main():
    seq = uniprot_sequence()
    entries, classes = {}, {}
    for cls, lst in ENTRIES.items():
        per_entry_primary, within = [], {}
        for pid, role in lst:
            e = entries.get(pid) or measure_entry(pid, seq)
            e["role"] = role
            entries[pid] = e
            if not e["chains"]:
                continue
            # Primary chain = maximum UniProt coverage (fewest disordered termini).
            prim = max(e["chains"], key=lambda c: (c["n_residues_mapped"], -ord(c["chain"][0])))
            per_entry_primary.append(dict(pdb_id=pid, role=role, **prim))
            if len(e["chains"]) > 1:
                within[pid] = {
                    key: stats([c[key] for c in e["chains"]])
                    for key in ("extent_long_nm", "n_to_c_nm", "mean_cross_section_nm")
                }
        keys = ("extent_long_nm", "extent_mid_nm", "extent_short_nm", "mean_cross_section_nm",
                "n_to_c_nm", "radius_of_gyration_nm", "capsule_radius_nm",
                "ellipsoid_enclosure_frac", "capsule_enclosure_frac",
                "n_to_c_vs_pc1_deg", "max_bend_from_nc_axis_nm", "straightness")
        classes[cls] = dict(
            n_independent_entries=len(per_entry_primary),
            entries_used=[p["pdb_id"] for p in per_entry_primary],
            between_entry=({k: stats([p[k] for p in per_entry_primary]) for k in keys}
                           if per_entry_primary else {}),
            within_entry_crystallographic_copies=within,
            primary_chains=per_entry_primary,
        )

    doc = dict(
        schema="titin-structure-measurements/1",
        raw_source_manifest="data/structures/manifest.json (SHA-256 and byte-pinned)",
        phase="Phase 6 — PDB / Structural Data Pipeline",
        uniprot=dict(accession=ACC, sequence_length=len(seq)),
        provenance=dict(
            coordinates="RCSB mmCIF (files.rcsb.org)",
            residue_mapping="PDBe SIFTS, verified by explicit sequence alignment",
            software=f"gemmi {gemmi.__version__}, numpy {np.__version__}",
            units="nm throughout (mmCIF Angstrom / 10)",
        ),
        method=dict(
            assembly=(
                "biological assembly checked per entry (see entries[].assemblies "
                "and entries[].assembly_note). Every measured chain is fitted "
                "INDIVIDUALLY, so assembly stoichiometry does not affect any "
                "reported dimension. 5JDJ declares 8 dimeric assemblies, but its "
                "three largest inter-chain interfaces are between chains that are "
                "NOT declared assembly partners, so the annotated dimer is "
                "crystal packing rather than a biological interface; titin's Ig "
                "domains are tandem beads on one polypeptide, not homodimers."),
            chain_extraction="polymer of the SIFTS-mapped chain; altlocs, hydrogens, "
                             "ligands and waters removed",
            residue_filter="only residues whose one-letter code matches the aligned "
                           "UniProt position are kept (drops expression-tag remnants)",
            axes="PCA of heavy-atom cloud; PC1 = longest axis",
            axial_definition="N-to-C CA distance is the tandem-relevant axial length; "
                             "PC1 extent is the bounding length and is reported separately",
            statistics="between-entry over one maximum-coverage chain per entry "
                       "(independent); within-entry reported separately (crystallographic "
                       "copies are NOT independent)",
            validation="enclosure fraction of heavy atoms + primitive volume vs convex hull",
        ),
        entries=entries,
        classes=classes,
    )
    with open(OUT, "w") as fh:
        json.dump(doc, fh, indent=1)
    print(f"wrote {os.path.relpath(OUT, APP)}")
    for cls, c in classes.items():
        b = c["between_entry"]
        if not b:
            continue
        print(f"  {cls:8s} n={c['n_independent_entries']} entries={c['entries_used']}")
        print(f"    N-C axial      {b['n_to_c_nm']['median']:.3f} nm "
              f"(range {b['n_to_c_nm']['min']:.3f}-{b['n_to_c_nm']['max']:.3f})")
        print(f"    PC1 extent     {b['extent_long_nm']['median']:.3f} nm")
        print(f"    cross-section  {b['mean_cross_section_nm']['median']:.3f} nm")
        print(f"    capsule encl.  {b['capsule_enclosure_frac']['median']*100:.1f}%")


if __name__ == "__main__":
    main()
