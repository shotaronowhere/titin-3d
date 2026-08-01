#!/usr/bin/env python3
"""
Record the Phase-6 interaction-geometry measurement in geometry_strategy.json.

This adopts NOTHING as a coordinate. Inter-domain twist in a crystal is one
conformation of a flexible linker, partly set by lattice packing, so it cannot
become a per-domain azimuth. What it CAN do is convert a previously unsupported
statement into a measured one.

Before: InstancingPlan's alternating-azimuth policy was justified only by
        chain continuity — a constant azimuth would drift the chain off axis.
        Whether consecutive domains actually rotate was unknown and unmeasured.
After:  observed tandems show |twist| median ~163 deg between consecutive
        domains, i.e. close to the 180 deg the alternating policy assumes.
        The policy stays SCHEMATIC — but it is now consistent with measurement
        rather than merely with a continuity argument.

The centre-to-centre distance is also recorded. It is NOT adopted as the axial
rise: rise in the spec is derived from region span / domain count, which is a
different quantity (it includes linker extension under load), and the measured
centre-to-centre distance is the crystal's compact-tandem value.

Idempotent: rerunning produces byte-identical output.

Run:  python3 scripts/adopt_interdomain.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
STRATEGY = os.path.join(APP, "data", "geometry_strategy.json")
MEASUREMENTS = os.path.join(APP, "data", "interdomain_measurements.json")


def main():
    S = json.load(open(STRATEGY))
    M = json.load(open(MEASUREMENTS))
    ic = M["in_situ_cross_check"]
    X = M["findings"]["in_situ_vs_crystal_spacing"]
    s = M["summary_independent"]
    indep = M["independent_pairs"]

    S["interdomain_geometry"] = {
        "evidence_class": "MEASURED",
        "what_this_is": (
            "geometry BETWEEN consecutive domains, measured from tandem "
            "depositions. The per-class measurements in domain_archetypes come "
            "from single-domain entries and therefore cannot supply it."),
        "source_file": "data/interdomain_measurements.json",
        "source_script": "scripts/measure_interdomain.py",
        "in_situ_cross_check": {
            "pdb_id": ic["pdb_id"],
            "description": ic["description"],
            "resolution_A": ic["resolution_A"],
            "centre_to_centre_nm": ic["centre_to_centre_nm"],
            "n_chains": len(ic["chains"]),
            "measures_only": ic["measures"],
            "deliberately_not_measured": ic["deliberately_not_measured"],
            "vs_crystal_and_literature": X,
            "why_it_matters": (
                "the crystal tandems' stated limitation is lattice packing; this "
                "entry is titin in situ on the thick filament with no lattice, so "
                "it bounds that limitation. Its spacing agrees with the retained "
                "literature axial length to within 0.11 nm, which corroborates the "
                "decision to keep the literature value driving layout."),
        },
        "why_a_separate_selection": (
            "representative_structure_selection deliberately preferred 'a single "
            "domain over a tandem so the exemplar matches one archetype "
            "instance'. That is correct for per-class archetype geometry and is "
            "exactly why it cannot yield inter-domain geometry: within every "
            "selected entry all SIFTS ranges are identical, so no "
            "domain-to-domain relationship exists in the file. Tandem entries "
            "are therefore selected under the opposite criterion and used ONLY "
            "for relationships between domains, never for per-domain size."),
        "entries_used": sorted({p["pdb_id"] for p in indep}),
        "n_independent_pairs": len(indep),
        "n_pairs_including_lattice_copies": len(M["pairs"]),
        "centre_to_centre_nm": s["centre_to_centre_nm"],
        "interaxis_bend_deg": s["bend_deg"],
        "abs_twist_deg": s["abs_twist_deg"],
        "domain_axis_vs_link_deg": s["axis_vs_link_deg"],

        "adopted_as_coordinates": False,
        "why_not_adopted": (
            "an Ig-Ig or Fn3-Fn3 linker is flexible; a crystal shows ONE "
            "conformation per pair, selected in part by lattice packing. A "
            "median over four independent pairs is a distribution, not a "
            "canonical value, and must not become a per-domain azimuth."),

        "what_it_constrains": {
            "claim": "the alternating-azimuth instancing policy",
            "policy_id": "alternating_planar",
            "policy_assumes_deg": 180,
            "measured_abs_twist_median_deg": s["abs_twist_deg"]["median"],
            "measured_abs_twist_range_deg": [s["abs_twist_deg"]["min"],
                                             s["abs_twist_deg"]["max"]],
            "verdict": (
                "consistent: observed consecutive domains rotate by a median "
                f"{s['abs_twist_deg']['median']} deg, close to the 180 deg the "
                "policy assumes. A CONSTANT azimuth (0 deg twist) is excluded by "
                "measurement as well as by the chain-continuity argument."),
            "policy_evidence_class_after_this": (
                "SCHEMATIC — unchanged. The measurement shows the convention is "
                "not contradicted by observed structures; it does not establish "
                "the azimuth of any individual domain in vivo."),
        },

        "not_claimed": M["not_claimed"] + [
            "that centre-to-centre distance equals the spec's axial rise (rise "
            "is region span / domain count and includes linker extension under "
            "load; this is the compact-tandem crystal value)",
        ],
    }

    # Record on the affected archetypes that inter-domain geometry now exists,
    # without touching any dimension they carry.
    for cls in ("Ig_like", "Fn3"):
        a = S["domain_archetypes"].get(cls)
        if not a:
            continue
        n = sum(1 for p in indep if cls in p["classes"])
        a["interdomain_geometry_measured"] = bool(n)
        a["interdomain_independent_pairs"] = n

    # indent=1 and no trailing newline: matches adopt_measurements.py so the two
    # scripts do not fight over formatting and both stay byte-idempotent.
    with open(STRATEGY, "w") as fh:
        json.dump(S, fh, indent=1)
    print("recorded interdomain_geometry:",
          f"{len(indep)} independent pairs from {sorted({p['pdb_id'] for p in indep})}")
    print("  |twist| median", s["abs_twist_deg"]["median"], "deg -> policy consistent")
    print("  adopted_as_coordinates: False")


if __name__ == "__main__":
    main()
