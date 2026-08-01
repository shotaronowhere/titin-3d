#!/usr/bin/env python3
"""
Negative controls for the Phase-6 REVIEW guards.

Two defects were found reviewing Phase 6:
  1. `method.assembly` asserted "all selected entries are monomeric" — false;
     5JDJ declares 8 dimeric assemblies.
  2. Plan step 5 requires "major bends AND interaction geometry", but every
     measured entry holds a single domain, so inter-domain geometry was absent.

Both are now guarded. A guard that has never fired is untested, so each control
below breaks exactly one invariant on disk, asserts the validator REJECTS it with
the expected message, then restores the original bytes and verifies byte-identity.

Run:  python3 scripts/neg_control_phase6_review.py
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
DATA = os.path.join(APP, "data")
VALIDATOR = os.path.join(HERE, "validate_geometry.py")

MEAS = os.path.join(DATA, "structure_measurements.json")
INTER = os.path.join(DATA, "interdomain_measurements.json")
STRAT = os.path.join(DATA, "geometry_strategy.json")


def run_validator():
    r = subprocess.run([sys.executable, VALIDATOR],
                       capture_output=True, text=True)
    return r.returncode, r.stdout


def control(name, path, mutate, expect):
    """Break one invariant, require rejection, restore, verify byte-identity."""
    original = open(path, "rb").read()
    try:
        doc = json.loads(original)
        mutate(doc)
        with open(path, "w") as fh:
            json.dump(doc, fh, indent=1)
        code, out = run_validator()
        fired = [l for l in out.splitlines()
                 if l.strip().startswith("FAIL") and expect in l]
        ok = code != 0 and bool(fired)
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        if not ok:
            print(f"        expected a FAIL containing {expect!r}; exit={code}")
        return ok
    finally:
        with open(path, "wb") as fh:
            fh.write(original)
        assert open(path, "rb").read() == original, f"restore failed for {path}"


def main():
    print("Phase-6 review negative controls")
    code, _ = run_validator()
    assert code == 0, "tree must validate clean BEFORE controls run"
    print("  PASS  unmodified tree validates clean")
    results = []

    # --- defect 1: false monomeric claim -------------------------------------
    def revert_prose(d):
        d["method"]["assembly"] = ("biological assembly checked; all selected "
                                   "entries are monomeric")
    results.append(control(
        "reverting to the false 'all entries are monomeric' prose is rejected",
        MEAS, revert_prose, "does not claim all entries monomeric"))

    def drop_note(d):
        for e in d["entries"].values():
            e.pop("assembly_note", None)
    results.append(control(
        "dropping the computed assembly_note is rejected",
        MEAS, drop_note, "records a computed assembly_note"))

    def launder_dimer(d):
        # Accept 5JDJ's declared dimer at face value instead of adjudicating it.
        n = d["entries"]["5JDJ"]["assembly_note"]
        n["declared_partners_are_largest"] = True
        n["note"] = "declared partners are the largest observed interfaces"
    results.append(control(
        "accepting 5JDJ's declared dimer as biological is rejected",
        MEAS, launder_dimer, "adjudicated as crystal packing"))

    def claim_affects(d):
        d["entries"]["5JDJ"]["assembly_note"]["affects_measurements"] = True
    results.append(control(
        "claiming assembly stoichiometry affects measurements is rejected",
        MEAS, claim_affects, "does not affect measurements"))

    # --- defect 2: interaction geometry --------------------------------------
    def adopt_twist(d):
        d["interdomain_geometry"]["adopted_as_coordinates"] = True
    results.append(control(
        "adopting flexible-linker twist as coordinates is rejected",
        STRAT, adopt_twist, "NOT adopted as coordinates"))

    def upgrade_policy(d):
        d["interdomain_geometry"]["what_it_constrains"][
            "policy_evidence_class_after_this"] = "MEASURED azimuth per domain"
    results.append(control(
        "upgrading the azimuth policy to MEASURED is rejected",
        STRAT, upgrade_policy, "remains SCHEMATIC"))

    def claim_rise(d):
        ig = d["interdomain_geometry"]
        ig["not_claimed"] = [x for x in ig["not_claimed"]
                             if "axial rise" not in x]
    results.append(control(
        "claiming centre-to-centre equals the spec axial rise is rejected",
        STRAT, claim_rise, "not claimed to equal the spec axial rise"))

    def drop_azimuth_disclaimer(d):
        ig = d["interdomain_geometry"]
        ig["not_claimed"] = [x for x in ig["not_claimed"] if "azimuth" not in x]
    results.append(control(
        "dropping the canonical-azimuth disclaimer is rejected",
        STRAT, drop_azimuth_disclaimer, "disclaims a canonical per-domain azimuth"))

    def inflate_n(d):
        # Lattice copies of one entry must not masquerade as independent evidence.
        p = dict(d["independent_pairs"][0])
        d["independent_pairs"] = d["independent_pairs"] + [p]
    results.append(control(
        "inflating independent pairs with a duplicate entry is rejected",
        INTER, inflate_n, "distinct entry"))

    def non_consecutive(d):
        d["independent_pairs"][0]["linker_gap_residues"] = 400
    results.append(control(
        "measuring a non-consecutive domain pair is rejected",
        INTER, non_consecutive, "is consecutive"))

    def thin_domain(d):
        d["independent_pairs"][0]["n_res"] = [12, 88]
    results.append(control(
        "fitting an axis to a barely-observed domain is rejected",
        INTER, thin_domain, ">=60 observed CA per domain"))

    def single_entry(d):
        d["independent_pairs"] = d["independent_pairs"][:1]
    results.append(control(
        "resting interdomain geometry on one entry is rejected",
        INTER, single_entry, ">=3 independent entries"))

    def contaminate(d):
        # Use a tandem entry for per-domain SIZE. Its domains are in contact, so
        # this would measure a packed conformation as if it were isolated.
        d["domain_archetypes"]["Ig_like"]["measured_geometry"][
            "entries_used"] = ["3PUC", "5JDJ", "3LPW"]
    results.append(control(
        "using a tandem entry for per-domain size is rejected",
        STRAT, contaminate, "uses no tandem entry"))

    def drop_rationale(d):
        d["interdomain_geometry"].pop("why_a_separate_selection", None)
    results.append(control(
        "dropping the separate-selection rationale is rejected",
        STRAT, drop_rationale, "its own entry selection"))

    def smuggle_size(d):
        d["interdomain_geometry"]["lateral_diameter_nm"] = 3.0
    results.append(control(
        "smuggling a per-domain size into the interdomain record is rejected",
        STRAT, smuggle_size, "claims no per-domain size field"))

    # --- in-situ resolution discipline ---------------------------------------
    def give_it_an_angle(d):
        # A 6.4 A backbone cannot support a per-domain axis fit; claiming a twist
        # from it would overclaim what the map resolves.
        d["interdomain_geometry"]["in_situ_cross_check"]["abs_twist_deg"] = {
            "n": 60, "median": 160.0}
    results.append(control(
        "claiming a twist from the 6.4 A in-situ entry is rejected",
        STRAT, give_it_an_angle, "claims no abs_twist_deg"))

    def widen_measures(d):
        d["interdomain_geometry"]["in_situ_cross_check"]["measures_only"] = [
            "centroid spacing between consecutive domains", "inter-axis bend"]
    results.append(control(
        "widening the in-situ entry beyond centroid spacing is rejected",
        STRAT, widen_measures, "measures centroid spacing ONLY"))

    def drop_discipline(d):
        d["interdomain_geometry"]["in_situ_cross_check"][
            "deliberately_not_measured"] = []
    results.append(control(
        "dropping the in-situ resolution disclaimer is rejected",
        STRAT, drop_discipline, "declines axes, bend and twist"))

    def fake_disagreement(d):
        d["interdomain_geometry"]["in_situ_cross_check"][
            "vs_crystal_and_literature"]["difference_nm"] = -3.2
    results.append(control(
        "in-situ spacing disagreeing with crystals by >1 nm is rejected",
        STRAT, fake_disagreement, "agree within 1 nm"))

    def use_insitu_for_size(d):
        d["domain_archetypes"]["Ig_like"]["measured_geometry"][
            "entries_used"] = ["3PUC", "5JDJ", "8G4L"]
    results.append(control(
        "using the 6.4 A in-situ entry for per-domain size is rejected",
        STRAT, use_insitu_for_size, "not used for per-domain size"))

    code, _ = run_validator()
    assert code == 0, "tree must validate clean AFTER controls restore"
    print("  PASS  tree validates clean after all restores")

    npass = sum(1 for r in results if r)
    print(f"\n{npass + 2} passed, {len(results) - npass} failed")
    return 0 if npass == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
