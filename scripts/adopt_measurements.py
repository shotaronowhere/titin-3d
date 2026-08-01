#!/usr/bin/env python3
"""
Phase 6 adoption step — write measured geometry into geometry_strategy.json.

Deliberately narrow. A measured number may only be adopted where doing so
cannot silently overwrite a reviewed, literature-sourced value that drives
layout. The policy, and the reasoning for each decision, is recorded in the
spec itself under `measured_geometry.adoption_policy` so a later reader does
not have to reconstruct it from this script.

ADOPTED
  lateral_diameter_nm   Was 2.0 nm, explicitly evidence-class SCHEMATIC
                        ("render width; not resolved in geometry spec"). It is
                        read only for rendering width (InstancingPlan geometry
                        block, GeometryStrategy unit_lateral_nm) and never
                        enters placement, so replacing a placeholder with a
                        measured cross-section is a strict evidence upgrade.
  kinase axial_length_nm Was absent, making every kinase instance emit
                        folded_length_nm: null. Filled with the measured
                        N-to-C distance — the same semantic Ig/Fn3 carry
                        (extent along the chain), NOT the 6.65 nm long axis.

NOT ADOPTED
  Ig_like / Fn3 axial_length_nm  Stays 4.0 nm from 10.1016/j.jmb.2020.06.025.
    1. It drives layout globally: rise, tilt and every domain coordinate.
    2. The measurements do not contradict it — 4.0 nm sits 1.03 SD (Ig) and
       1.30 SD (Fn3) from the measured means. There is no disagreement to fix.
    3. n=3 and n=2 independent entries is too thin to overturn a reviewed
       literature value, and crystallographic termini disorder biases the
       N-to-C distance upward (3PUC's 4-residue extended N-terminal tail
       gives 5.17 nm against a 4.62 nm median over 16 copies of 5JDJ).
    4. Ig measures 4.319 nm and Fn3 4.419 nm. Adopting both would break the
       Phase-5 invariant that the two share ONE axial length, on which
       per-zone rise and tilt depend.
  kinase long-axis orientation  NOT adopted as an axial claim. Its N-to-C
    vector lies 42.7 deg off its own longest principal axis, so the long axis
    is not the chain direction; orienting the ellipsoid along the sarcomere
    axis would assert geometry the coordinates do not support.

Idempotent: rerunning reproduces byte-identical output.
Run:  python3 scripts/adopt_measurements.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
DATA = os.path.join(APP, "data")
MEAS = os.path.join(DATA, "structure_measurements.json")
STRAT = os.path.join(DATA, "geometry_strategy.json")
SOURCES = os.path.join(DATA, "geometry_sources.json")
REFS = os.path.join(DATA, "references.json")

LIT_AXIAL_NM = 4.0
LIT_SOURCE = "10.1016/j.jmb.2020.06.025"

# A measured value is a citable source like any other. The spec loader requires
# every cited source to be registered in references.json and every cited
# source_param to exist in geometry_sources.json — so a Phase-6 measurement must
# be registered as real provenance rather than pointing at a bare file path.
# Precedent for a non-DOI key: 'UniProt:Q8WZ42'.
PDB_REFS = {
    "3PUC": ("Ig domain I65-I70 region construct", 2011),
    "5JDJ": ("Titin I-band Ig domain tandem", 2016),
    "1TIT": ("Titin Ig domain I91 (I27) solution structure", 1996),
    "8OMW": ("Titin A-band Fn3 domain", 2023),
    "8OT5": ("Titin A-band Fn3 domain (Fn3-85)", 2023),
    "1TKI": ("Titin kinase domain", 1998),
    "4JNW": ("Titin kinase domain, independent determination", 2013),
}


def measurement_key(cls, entries):
    return f"PDB:{'+'.join(entries)} (Phase 6 measurement, {cls})"


def r3(x):
    return round(float(x), 3)


def main():
    if not os.path.exists(MEAS):
        sys.exit("run scripts/measure_structures.py first")
    m = json.load(open(MEAS))
    strat = json.load(open(STRAT))
    refs = json.load(open(REFS))
    sources = json.load(open(SOURCES))
    arch = strat["domain_archetypes"]

    # --- register each PDB entry as a citable reference -------------------
    for pid, (title, year) in PDB_REFS.items():
        refs.setdefault(f"PDB:{pid}", {
            "doi": None,
            "authors": "see RCSB PDB entry",
            "year": year,
            "title": f"{title} (PDB {pid})",
            "journal": "RCSB Protein Data Bank",
            "identifier": f"PDB:{pid}",
        })

    # --- register the measurement itself, and its parameters -------------
    existing = {p["parameter"] for p in sources["parameters"]}
    for cls in ("Ig_like", "Fn3", "kinase"):
        c = m["classes"][cls]
        b = c["between_entry"]
        key = measurement_key(cls, c["entries_used"])
        refs.setdefault(key, {
            "doi": None,
            "authors": "This project (Phase 6 pipeline)",
            "year": 2026,
            "title": (f"Geometry of titin {cls} domains measured from deposited "
                      f"coordinates ({', '.join('PDB ' + e for e in c['entries_used'])}); "
                      "scripts/measure_structures.py"),
            "journal": "Derived measurement",
            "identifier": key,
            "depends_on": [f"PDB:{e}" for e in c["entries_used"]],
        })
        for pname, val, unc in (
            (f"{cls} domain cross-section (mean of two smaller principal extents)",
             b["mean_cross_section_nm"]["median"],
             f"range {r3(b['mean_cross_section_nm']['min'])}-"
             f"{r3(b['mean_cross_section_nm']['max'])} over "
             f"{c['n_independent_entries']} entries"),
            (f"{cls} domain N-to-C extent",
             b["n_to_c_nm"]["median"],
             f"range {r3(b['n_to_c_nm']['min'])}-{r3(b['n_to_c_nm']['max'])} over "
             f"{c['n_independent_entries']} entries"),
        ):
            if pname in existing:
                continue
            sources["parameters"].append({
                "component": "Titin",
                "region": cls,
                "parameter": pname,
                "value": str(r3(val)),
                "unit": "nm",
                "species": "human",
                "isoform": "domain-level (isoform-independent)",
                "muscle_type": "—",
                "biological_state": "crystal/solution structure",
                "method": "PCA of deposited heavy-atom coordinates (gemmi)",
                "uncertainty": unc,
                "primary_source": key,
                "evidence_class": "MEASURED",
                "verified": ("coordinates parsed directly; residue mapping verified by "
                             "alignment to UniProt Q8WZ42"),
                "notes": ("Between-entry statistic over one maximum-coverage chain per "
                          "entry; crystallographic copies are not independent."),
            })
            existing.add(pname)

    for cls in ("Ig_like", "Fn3", "kinase"):
        c = m["classes"][cls]
        b = c["between_entry"]
        a = arch[cls]

        mkey = measurement_key(cls, c["entries_used"])
        block = {
            "phase": "Phase 6",
            "source": mkey,
            "measurements_file": "data/structure_measurements.json",
            "n_independent_entries": c["n_independent_entries"],
            "entries_used": c["entries_used"],
            "statistic": "median over one maximum-coverage chain per entry",
            "n_to_c_axial_nm": r3(b["n_to_c_nm"]["median"]),
            "n_to_c_range_nm": [r3(b["n_to_c_nm"]["min"]), r3(b["n_to_c_nm"]["max"])],
            "longest_principal_extent_nm": r3(b["extent_long_nm"]["median"]),
            "mean_cross_section_nm": r3(b["mean_cross_section_nm"]["median"]),
            "radius_of_gyration_nm": r3(b["radius_of_gyration_nm"]["median"]),
            "n_to_c_vs_long_axis_deg": r3(b["n_to_c_vs_pc1_deg"]["median"]),
            "capsule_enclosure_frac": round(b["capsule_enclosure_frac"]["median"], 4),
            "ellipsoid_enclosure_frac": round(b["ellipsoid_enclosure_frac"]["median"], 4),
            "evidence_class": "MEASURED (from deposited coordinates)",
        }

        # --- lateral diameter: SCHEMATIC placeholder -> measured -----------
        # Record the pre-Phase-6 placeholder ONCE. Re-reading the current value on
        # a rerun would overwrite the original placeholder with the measured value
        # and destroy the provenance, so only set it if absent.
        if "lateral_diameter_previous_schematic_nm" not in a:
            a["lateral_diameter_previous_schematic_nm"] = a.get("lateral_diameter_nm")
        a["lateral_diameter_nm"] = r3(b["mean_cross_section_nm"]["median"])
        a["lateral_diameter_source"] = mkey
        a["lateral_diameter_source_param"] = (
            f"{cls} domain cross-section (mean of two smaller principal extents)")
        a.setdefault("evidence_by_claim", {})["lateral_diameter_nm"] = (
            "MEASURED (mean cross-section of deposited coordinates; render width)")

        # aspect_ratio_axial_lateral was derived from the OLD placeholder lateral
        # diameter; leaving it would make the spec internally inconsistent. It is
        # a ratio of a literature axial length to a measured lateral one, so it is
        # only as strong as its weaker term.
        if "aspect_ratio_axial_lateral" in a:
            axial_for_ratio = (LIT_AXIAL_NM if cls != "kinase"
                               else b["n_to_c_nm"]["median"])
            a["aspect_ratio_axial_lateral"] = r3(
                axial_for_ratio / a["lateral_diameter_nm"])
            a["evidence_by_claim"]["aspect_ratio"] = (
                "STRONGLY INFERRED (literature axial length over measured "
                "cross-section; recomputed in Phase 6)")

        if cls == "kinase":
            # Fills folded_length_nm, which was null for every kinase instance.
            # Chain-direction extent, matching the Ig/Fn3 semantic.
            a["axial_length_nm"] = r3(b["n_to_c_nm"]["median"])
            a["axial_length_source"] = mkey
            a["axial_length_source_param"] = f"{cls} domain N-to-C extent"
            a["evidence_by_claim"]["axial_length_nm"] = "MEASURED (from deposited coordinates)"
            a["evidence_by_claim"]["size"] = (
                "MEASURED (extents from coordinates; was SCHEMATIC)")
            a["ellipsoid_semi_axes_nm"] = [
                r3(x) for x in c["primary_chains"][0]["ellipsoid_semi_axes_nm"]]
            block["long_axis_is_not_chain_direction"] = True
            block["long_axis_caveat"] = (
                f"N-to-C lies {r3(b['n_to_c_vs_pc1_deg']['median'])} deg off the longest "
                "principal axis, so the 6.65 nm extent is NOT along the chain. The "
                "ellipsoid's orientation about the sarcomere axis remains UNKNOWN; only "
                "its size is measured.")
            claim = ("orientation of the kinase long axis relative to the "
                     "sarcomere axis (UNKNOWN)")
            nc_list = a.setdefault("not_claimed", [])
            if claim not in nc_list:          # idempotent: rerun must not duplicate
                nc_list.append(claim)
        else:
            block["literature_axial_nm"] = LIT_AXIAL_NM
            block["literature_axial_source"] = LIT_SOURCE
            sd = b["n_to_c_nm"]["sd"]
            block["literature_deviation_sd"] = (
                round(abs(LIT_AXIAL_NM - b["n_to_c_nm"]["mean"]) / sd, 2) if sd else None)
            block["axial_length_adopted"] = False
            block["axial_length_not_adopted_because"] = (
                "the literature value drives layout, the measurements are consistent "
                "with it within scatter, the sample is 2-3 independent entries, and "
                "adopting per-class values would break the Phase-5 invariant that "
                "Ig_like and Fn3 share one axial length.")

        a["measured_geometry"] = block
        a["geometry_derived_from_coordinates"] = True

    strat["measured_geometry_adoption"] = {
        "phase": "Phase 6 — PDB / Structural Data Pipeline",
        "script": "scripts/adopt_measurements.py",
        "measurements": "data/structure_measurements.json",
        "adopted": [
            "lateral_diameter_nm for Ig_like, Fn3, kinase (was SCHEMATIC render width)",
            "axial_length_nm for kinase (was absent; kinase instances emitted "
            "folded_length_nm: null)",
        ],
        "not_adopted": [
            "axial_length_nm for Ig_like and Fn3 — remains the reviewed literature "
            f"value {LIT_AXIAL_NM} nm from {LIT_SOURCE}",
            "kinase long-axis orientation — N-to-C is 42.7 deg off the long axis, so "
            "no axial orientation claim is supported",
        ],
        "layout_invariance": (
            "No adopted value is read by placement code. Domain coordinates at every "
            "sarcomere length are unchanged by this adoption; only render width and the "
            "previously-null kinase folded_length_nm change."
        ),
        "representation_choice": {
            "Ig_like": "capsule — 98.8% heavy-atom enclosure, N-to-C within 8.4 deg of "
                       "the long axis, so a chain-aligned capsule is faithful",
            "Fn3": "capsule — 98.2% enclosure; cross-section is measurably wider than Ig",
            "kinase": "ellipsoid — 99.2% capsule / 97.4% ellipsoid enclosure, but the "
                      "chain runs 42.7 deg off the long axis and contour length is 122 nm "
                      "versus a 4.5 nm N-to-C separation, so no elongated chain-aligned "
                      "primitive is warranted; an ellipsoid marks size and position only",
        },
        "asset_export": (
            "None required. The pipeline's deliverable is a set of fitted geometric "
            "parameters, not a mesh: capsules and ellipsoids are generated procedurally "
            "in the renderer, so exporting GLB proxies would add a binary asset with no "
            "geometric information beyond these numbers. Full mmCIF files stay offline "
            "validation assets (representation level 3, load_in_browser: false)."
        ),
    }

    with open(STRAT, "w") as fh:
        json.dump(strat, fh, indent=1)
    with open(REFS, "w") as fh:
        json.dump(refs, fh, indent=1)
    with open(SOURCES, "w") as fh:
        json.dump(sources, fh, indent=1)
    print("updated data/geometry_strategy.json, references.json, geometry_sources.json")
    for cls in ("Ig_like", "Fn3", "kinase"):
        a = arch[cls]
        print(f"  {cls:8s} axial={a.get('axial_length_nm')} "
              f"lateral={a['lateral_diameter_nm']} "
              f"(was {a['lateral_diameter_previous_schematic_nm']})")


if __name__ == "__main__":
    main()
