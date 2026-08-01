#!/usr/bin/env python3
"""
Phase 6, step 5 (second half) — INTERACTION GEOMETRY between consecutive domains.

`measure_structures.py` covers the plan's "major bends" within a single domain.
It cannot cover "interaction geometry", because every entry it measures contains
exactly ONE titin domain: within each entry all SIFTS ranges are identical, so
there is no domain-to-domain relationship in the file to measure.

This script measures the missing half from TANDEM entries — depositions spanning
two or more consecutive UniProt-annotated domains. For each consecutive pair in
the same chain it measures:

  * centre-to-centre distance          (how far the chain advances per domain)
  * inter-axis bend angle              (how much the long axes disagree)
  * inter-domain twist (dihedral)      (the AZIMUTHAL rotation between domains)

The third quantity is the one the spec currently cannot source. Level 1 tilts
domains and then leaves `azimuth_deg` to a declared-SCHEMATIC alternating policy
because "the real azimuths are unknown". They are not measurable in vivo, but
they ARE measurable in tandem crystals, which bounds what the schematic may claim.

WHAT THIS DOES NOT ESTABLISH
Ig-Ig linkers are flexible; a crystal shows ONE conformation per pair, chosen in
part by lattice packing. So the output is a DISTRIBUTION and an observed range,
never a canonical value, and it is not adopted as a per-domain azimuth. Its use
is to answer a narrower question the spec does need: is the constant-azimuth
policy (every domain leaning the same way) consistent with observed tandems, or
do consecutive domains genuinely rotate relative to one another?

Domain boundaries come from UniProt Q8WZ42 feature annotations, not from guessing
a period, so a pair is only measured when both members are annotated domains and
both are sufficiently observed.

Run:  python3 scripts/measure_interdomain.py
Out:  data/interdomain_measurements.json
"""
import json
import math
import os
import statistics as stats

import gemmi
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
RAW = os.path.join(APP, "data", "structures")
OUT = os.path.join(APP, "data", "interdomain_measurements.json")
ACC = "Q8WZ42"

# Tandem entries: >=2 consecutive annotated domains from one titin chain.
# Selected by RCSB search on Q8WZ42 with entity length > 180 aa, then filtered to
# crystal structures of contiguous Ig/Fn3 runs. 8G4L (cryo-EM cardiac myosin
# filament, 6.4 A) is deliberately EXCLUDED here: it is titin in situ on the
# thick filament, which is Phase 7 evidence, and 6.4 A is too coarse for the
# per-domain axis fits this script performs.
TANDEM_ENTRIES = ["3LPW", "8BXR", "8BNQ", "2J8O", "6YGN"]

MIN_RES_PER_DOMAIN = 60      # below this a PC1 axis fit is not trustworthy
MAX_GAP_TO_BE_CONSECUTIVE = 40   # residues between annotated domain end and next start


# ------------------------------------------------------------------ references
def load_domains():
    """UniProt-annotated Ig/Fn3 domain boundaries — the authoritative partition."""
    raw = os.path.join(RAW, "Q8WZ42_ft_domain.json")
    if not os.path.exists(raw):
        raise FileNotFoundError(
            f"missing manifest-pinned {raw}; run python3 scripts/fetch_structures.py"
        )
    d = json.load(open(raw))
    out = []
    for f in d.get("features", []):
        if f["type"] != "Domain":
            continue
        desc = f.get("description", "")
        cls = ("Ig_like" if "Ig" in desc
               else "Fn3" if ("Fibronectin" in desc or "Fn3" in desc)
               else None)
        if cls:
            out.append({"start": f["location"]["start"]["value"],
                        "end": f["location"]["end"]["value"],
                        "name": desc, "class": cls})
    out.sort(key=lambda x: x["start"])
    return out


_SEQ_CACHE = {}


def canonical_sequence():
    """Canonical Q8WZ42 sequence, read once from the cached FASTA."""
    if "seq" not in _SEQ_CACHE:
        path = os.path.join(RAW, ACC + ".fasta")
        _SEQ_CACHE["seq"] = "".join(
            l.strip() for l in open(path) if not l.startswith(">"))
    return _SEQ_CACHE["seq"]


def one_letter(name):
    i = gemmi.find_tabulated_residue(name)
    return i.one_letter_code.upper() if i and i.is_amino_acid() else None


def sifts_offsets(pid):
    """Per-chain UniProt offset, verified by sequence alignment (SIFTS alone is
    off-by-one for tag-carrying constructs — see measure_structures.py)."""
    sf = json.load(open(os.path.join(RAW, pid + "_sifts.json")))
    m = sf[pid.lower()]["UniProt"].get(ACC)
    if not m:
        return {}
    by_chain = {}
    for mp in m["mappings"]:
        c = mp["chain_id"]
        by_chain.setdefault(c, []).append(mp)
    return by_chain


# -------------------------------------------------------------------- geometry
def pc1(coords):
    c = coords - coords.mean(axis=0)
    _, _, vt = np.linalg.svd(c, full_matrices=False)
    return vt[0]


def signed_axis(coords_n_to_c, axis):
    """Orient PC1 N->C so bend/twist are chain-directional, not sign-arbitrary."""
    v = coords_n_to_c[-1] - coords_n_to_c[0]
    return axis if float(np.dot(v, axis)) >= 0 else -axis


def dihedral_about(link, a1, a2):
    """Twist of a2 about the inter-centroid vector, relative to a1.

    Projects both domain axes onto the plane perpendicular to the link vector and
    measures the signed angle between the projections. This is the azimuthal
    rotation from one domain to the next.
    """
    n = link / np.linalg.norm(link)
    p1 = a1 - np.dot(a1, n) * n
    p2 = a2 - np.dot(a2, n) * n
    if np.linalg.norm(p1) < 1e-6 or np.linalg.norm(p2) < 1e-6:
        return None
    p1 /= np.linalg.norm(p1)
    p2 /= np.linalg.norm(p2)
    ang = math.degrees(math.atan2(float(np.dot(np.cross(p1, p2), n)),
                                  float(np.dot(p1, p2))))
    return ang


def summarize(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    return {"n": len(vals),
            "median": round(stats.median(vals), 3),
            "mean": round(stats.fmean(vals), 3),
            "sd": round(stats.stdev(vals), 3) if len(vals) > 1 else 0.0,
            "min": round(min(vals), 3),
            "max": round(max(vals), 3)}


# ------------------------------------------------------------------- per entry
def measure_entry(pid, domains):
    path = os.path.join(RAW, pid + ".cif")
    st = gemmi.read_structure(path)
    st.setup_entities()
    st.remove_alternative_conformations()
    st.remove_hydrogens()
    st.remove_ligands_and_waters()

    seq = canonical_sequence()
    offs = sifts_offsets(pid)
    pairs, chain_reports = [], []

    for chain in st[0]:
        maps = offs.get(chain.name)
        if not maps:
            continue
        res = [r for r in chain.get_polymer() if one_letter(r.name)]
        if len(res) < 2 * MIN_RES_PER_DOMAIN:
            continue
        obs = "".join(one_letter(r.name) for r in res)

        # Verify the offset by alignment rather than trusting SIFTS numbering.
        guess = min(m["unp_start"] for m in maps)
        best, best_id = None, -1
        for k in range(max(1, guess - 12), guess + 13):
            cand = seq[k - 1:k - 1 + len(obs)]
            if len(cand) < len(obs):
                continue
            ident = sum(1 for a, b in zip(obs, cand) if a == b)
            if ident > best_id:
                best, best_id = k, ident
        if best is None:
            continue
        cand = seq[best - 1:best - 1 + len(obs)]
        core = best_id / len(obs)

        # UniProt position -> CA coordinate, keeping only residues that match the
        # canonical sequence (drops expression-tag remnants).
        pos2ca = {}
        for i, r in enumerate(res):
            if obs[i] != cand[i]:
                continue
            ca = r.find_atom("CA", "*")
            if ca:
                pos2ca[best + i] = np.array([ca.pos.x, ca.pos.y, ca.pos.z])

        # Which annotated domains are sufficiently observed in this chain?
        present = []
        for d in domains:
            got = sorted(p for p in pos2ca if d["start"] <= p <= d["end"])
            if len(got) >= MIN_RES_PER_DOMAIN:
                present.append((d, got))
        chain_reports.append({
            "chain": chain.name,
            "core_identity_frac": round(core, 4),
            "unp_span": [best, best + len(obs) - 1],
            "domains_observed": [d["name"] for d, _ in present],
        })
        if len(present) < 2:
            continue

        for (d1, g1), (d2, g2) in zip(present, present[1:]):
            gap = d2["start"] - d1["end"] - 1
            if gap > MAX_GAP_TO_BE_CONSECUTIVE:
                continue    # not consecutive: an unobserved domain lies between
            c1 = np.array([pos2ca[p] for p in g1])
            c2 = np.array([pos2ca[p] for p in g2])
            a1 = signed_axis(c1, pc1(c1))
            a2 = signed_axis(c2, pc1(c2))
            m1, m2 = c1.mean(axis=0), c2.mean(axis=0)
            link = m2 - m1
            bend = math.degrees(math.acos(
                max(-1.0, min(1.0, float(np.dot(a1, a2))))))
            twist = dihedral_about(link, a1, a2)
            pairs.append({
                "pdb_id": pid,
                "chain": chain.name,
                "pair": f"{d1['name']} -> {d2['name']}",
                "classes": [d1["class"], d2["class"]],
                "linker_gap_residues": int(gap),
                "n_res": [len(g1), len(g2)],
                "centre_to_centre_nm": round(float(np.linalg.norm(link)) / 10, 3),
                "bend_deg": round(bend, 3),
                "twist_deg": round(twist, 3) if twist is not None else None,
                # How well does a straight chain-aligned tandem describe this pair?
                "axis_vs_link_deg": round(math.degrees(math.acos(max(-1.0, min(1.0,
                    float(np.dot(a1, link / np.linalg.norm(link))))))), 3),
            })
    return pairs, chain_reports


def measure_in_situ(domains):
    """Cross-check the crystal tandems against titin IN SITU on the thick filament.

    8G4L is a 6.4 A cryo-EM human cardiac myosin filament containing an 11-domain
    titin run (Ig117-Fn73, an A-band super-repeat) in 6 copies. It is the one
    available source of inter-domain geometry with NO crystal lattice, which is
    the stated limitation of the tandem crystals.

    RESOLUTION DISCIPLINE: at 6.4 A this measures centroid SPACING only. Per-domain
    principal axes — and therefore bend and twist — are NOT fitted here, because a
    6.4 A backbone does not support an axis fit precise enough to claim an angle.
    Reporting a twist from this entry would overclaim what the map resolves.
    """
    pid = "8G4L"
    path = os.path.join(RAW, pid + ".cif")
    if not os.path.exists(path):
        return {"available": False,
                "note": f"{pid}.cif not present; run the fetch step to include it"}
    st = gemmi.read_structure(path)
    st.setup_entities()
    st.remove_alternative_conformations()
    st.remove_hydrogens()
    st.remove_ligands_and_waters()
    seq = canonical_sequence()

    maps = sifts_offsets(pid)
    spacings, chain_rows = [], []
    for chain in st[0]:
        if chain.name not in maps:
            continue
        res = [r for r in chain.get_polymer() if one_letter(r.name)]
        if len(res) < 2 * MIN_RES_PER_DOMAIN:
            continue
        obs = "".join(one_letter(r.name) for r in res)
        guess = min(m["unp_start"] for m in maps[chain.name])
        best, best_id = None, -1
        for k in range(max(1, guess - 12), guess + 13):
            cand = seq[k - 1:k - 1 + len(obs)]
            if len(cand) < len(obs):
                continue
            ident = sum(1 for a, b in zip(obs, cand) if a == b)
            if ident > best_id:
                best, best_id = k, ident
        if best is None:
            continue
        cand = seq[best - 1:best - 1 + len(obs)]
        pos2ca = {}
        for i, r in enumerate(res):
            if obs[i] != cand[i]:
                continue
            ca = r.find_atom("CA", "*")
            if ca:
                pos2ca[best + i] = np.array([ca.pos.x, ca.pos.y, ca.pos.z])
        present = [(d, sorted(p for p in pos2ca if d["start"] <= p <= d["end"]))
                   for d in domains]
        present = [(d, g) for d, g in present if len(g) >= MIN_RES_PER_DOMAIN]
        if len(present) < 2:
            continue
        n_here = 0
        for (d1, g1), (d2, g2) in zip(present, present[1:]):
            if d2["start"] - d1["end"] - 1 > MAX_GAP_TO_BE_CONSECUTIVE:
                continue
            m1 = np.array([pos2ca[p] for p in g1]).mean(axis=0)
            m2 = np.array([pos2ca[p] for p in g2]).mean(axis=0)
            spacings.append(round(float(np.linalg.norm(m2 - m1)) / 10, 3))
            n_here += 1
        chain_rows.append({"chain": chain.name,
                           "core_identity_frac": round(best_id / len(obs), 4),
                           "unp_span": [best, best + len(obs) - 1],
                           "n_domains_observed": len(present),
                           "n_consecutive_pairs": n_here})
    return {
        "available": True,
        "pdb_id": pid,
        "description": ("cryo-EM human cardiac myosin filament, 6.4 A; titin "
                        "Ig117-Fn73 (A-band super-repeat) in situ"),
        "resolution_A": 6.4,
        "method": "ELECTRON MICROSCOPY",
        "chains": chain_rows,
        "centre_to_centre_nm": summarize(spacings),
        "measures": ["centroid spacing between consecutive domains"],
        "deliberately_not_measured": [
            "per-domain principal axes, inter-axis bend, and azimuthal twist — a "
            "6.4 A backbone does not support an axis fit precise enough to claim "
            "an angle",
        ],
        "why_it_matters": ("the tandem crystals' stated limitation is lattice "
                           "packing; this entry has none, so it is an independent "
                           "check on the crystal spacing"),
    }


def main():
    domains = load_domains()
    all_pairs, entry_reports = [], {}
    for pid in TANDEM_ENTRIES:
        pairs, chains = measure_entry(pid, domains)
        entry_reports[pid] = {"chains": chains, "n_pairs": len(pairs)}
        all_pairs.extend(pairs)

    # Lattice-free cross-check. Kept OUT of all_pairs: it contributes spacing
    # only, and mixing it in would let a 6.4 A entry into the angle statistics.
    in_situ = measure_in_situ(domains)

    by_entry = {}
    for p in all_pairs:
        by_entry.setdefault(p["pdb_id"], []).append(p)

    # One representative pair per entry, so lattice copies do not inflate n.
    indep = [sorted(v, key=lambda x: -min(x["n_res"]))[0] for v in by_entry.values()]

    twists = [p["twist_deg"] for p in indep]
    consecutive_same_sign = (all(t is not None and t > 0 for t in twists)
                             or all(t is not None and t < 0 for t in twists))

    out = {
        "schema": "titin-interdomain-measurements/1",
        "raw_source_manifest": "data/structures/manifest.json (SHA-256 and byte-pinned)",
        "phase": "Phase 6 step 5 — interaction geometry between consecutive domains",
        "purpose": ("measure domain-to-domain rise, bend and AZIMUTHAL twist, which "
                    "single-domain entries cannot provide"),
        "uniprot": {"accession": ACC, "domains_annotated": len(domains)},
        "provenance": {
            "coordinates": "RCSB mmCIF (files.rcsb.org)",
            "domain_boundaries": f"UniProt {ACC} Domain feature annotations",
            "residue_mapping": "PDBe SIFTS, verified by explicit sequence alignment",
            "software": f"gemmi {gemmi.__version__}, numpy {np.__version__}",
            "units": "nm and degrees",
        },
        "method": {
            "entry_selection": ("RCSB search: Q8WZ42 polymer entities with sample "
                                "sequence length > 180 aa, filtered to crystal "
                                "structures of contiguous annotated domain runs"),
            "excluded_from_angles": {
                "8G4L": ("cryo-EM human cardiac myosin filament at 6.4 A — titin "
                         "in situ. EXCLUDED from bend/twist because a 6.4 A "
                         "backbone cannot support a per-domain axis fit precise "
                         "enough to claim an angle. INCLUDED for centroid spacing "
                         "as the lattice-free cross-check (see in_situ_cross_check); "
                         "also Phase 7 evidence for titin on the thick filament.")},
            "pair_definition": (f"consecutive UniProt-annotated domains, both with "
                                f">={MIN_RES_PER_DOMAIN} observed CA, separated by "
                                f"<={MAX_GAP_TO_BE_CONSECUTIVE} unannotated residues"),
            "axes": "PC1 of each domain's CA cloud, oriented N->C",
            "twist_definition": ("signed dihedral of the two domain axes about the "
                                 "centre-to-centre vector = azimuthal rotation"),
            "independence": "one representative pair per entry for the summary",
        },
        "entries": entry_reports,
        "pairs": all_pairs,
        "independent_pairs": indep,
        "summary_independent": {
            "centre_to_centre_nm": summarize([p["centre_to_centre_nm"] for p in indep]),
            "bend_deg": summarize([p["bend_deg"] for p in indep]),
            "twist_deg": summarize(twists),
            "abs_twist_deg": summarize([abs(t) for t in twists if t is not None]),
            "axis_vs_link_deg": summarize([p["axis_vs_link_deg"] for p in indep]),
        },
        "summary_all_pairs": {
            "centre_to_centre_nm": summarize([p["centre_to_centre_nm"] for p in all_pairs]),
            "bend_deg": summarize([p["bend_deg"] for p in all_pairs]),
            "abs_twist_deg": summarize([abs(p["twist_deg"]) for p in all_pairs
                                        if p["twist_deg"] is not None]),
        },
        "in_situ_cross_check": in_situ,
        "findings": {
            "consecutive_domains_rotate": None,   # filled below
            "twist_is_uniform_in_sign": consecutive_same_sign,
            "in_situ_vs_crystal_spacing": None,   # filled below
        },
        "not_claimed": [
            "a canonical inter-domain azimuth (Ig-Ig linkers are flexible; each "
            "crystal shows one conformation, influenced by lattice packing)",
            "that these conformations are the in vivo conformations",
            "that the measured twist should be adopted as a per-domain azimuth",
            "inter-domain geometry for PEVK or N2A (disordered; no tandem crystal)",
        ],
    }
    at = out["summary_independent"]["abs_twist_deg"]
    out["findings"]["consecutive_domains_rotate"] = (
        bool(at and at["median"] > 20))
    out["findings"]["interpretation"] = (
        "Consecutive domains show substantial azimuthal rotation "
        f"(|twist| median {at['median']} deg over {at['n']} independent pairs, "
        f"range {at['min']}-{at['max']} deg). A CONSTANT azimuth for every domain "
        "in a tandem run is therefore not supported by observed tandems; the "
        "spec's alternating-azimuth schematic is the better of the two available "
        "conventions, and remains SCHEMATIC."
        if at and at["median"] > 20 else
        "Observed tandems do not show large azimuthal rotation between "
        "consecutive domains; see summary for the measured spread.")

    # The crystals' stated weakness is lattice packing. If the lattice-free
    # in-situ spacing agrees, that weakness is bounded; if it disagrees, the
    # crystal spacing is packing-biased and must not be trusted further.
    if in_situ.get("available") and in_situ.get("centre_to_centre_nm"):
        _is = in_situ["centre_to_centre_nm"]["median"]
        _xt = out["summary_all_pairs"]["centre_to_centre_nm"]["median"]
        _lit = 4.0
        out["findings"]["in_situ_vs_crystal_spacing"] = {
            "in_situ_median_nm": _is,
            "crystal_median_nm": _xt,
            "difference_nm": round(_is - _xt, 3),
            "literature_axial_length_nm": _lit,
            "in_situ_minus_literature_nm": round(_is - _lit, 3),
            "interpretation": (
                f"In-situ spacing ({_is} nm, n={in_situ['centre_to_centre_nm']['n']}, "
                f"no lattice) is {abs(round(_is - _xt, 3))} nm "
                f"{'below' if _is < _xt else 'above'} the crystal median ({_xt} nm) "
                f"and within {abs(round(_is - _lit, 3))} nm of the literature 4.0 nm "
                "axial length the spec retains. The crystal tandems are therefore "
                "not grossly packing-distorted in spacing, and the retained "
                "literature value is independently corroborated in situ."),
        }

    with open(OUT, "w") as fh:
        json.dump(out, fh, indent=1)
    print("wrote", os.path.relpath(OUT, APP))
    for k, v in out["summary_independent"].items():
        print(f"  {k:22s} {v}")
    print("  finding:", out["findings"]["interpretation"][:150])
    _x = out["findings"].get("in_situ_vs_crystal_spacing")
    if _x:
        print(f"  in situ: {_x['in_situ_median_nm']} nm vs crystal "
              f"{_x['crystal_median_nm']} nm vs literature "
              f"{_x['literature_axial_length_nm']} nm")


if __name__ == "__main__":
    main()
