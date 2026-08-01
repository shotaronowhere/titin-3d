#!/usr/bin/env python3
"""
Negative controls for the Phase-6 checks that live in validate_geometry.py
(the JS-side guards are covered by neg_control_phase6.mjs).

Each control breaks one spec invariant and asserts the validator FAILS. A guard
that has never fired is an untested guard. Files are restored afterwards, and
the script verifies byte-identity on the way out.

Run:  python3 scripts/neg_control_phase6_spec.py
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
MEAS = os.path.join(APP, "data", "structure_measurements.json")
STRAT = os.path.join(APP, "data", "geometry_strategy.json")
VALIDATOR = os.path.join(HERE, "validate_geometry.py")


def run_validator():
    r = subprocess.run([sys.executable, VALIDATOR], capture_output=True,
                       text=True, cwd=APP)
    return [ln.strip() for ln in r.stdout.splitlines() if "FAIL" in ln]


def control(name, path, mutate, expect):
    original = open(path, "rb").read()
    doc = json.loads(original)
    mutate(doc)
    with open(path, "w") as fh:
        json.dump(doc, fh, indent=1)
    try:
        fails = run_validator()
        hit = any(expect in f for f in fails)
    finally:
        with open(path, "wb") as fh:
            fh.write(original)
        assert open(path, "rb").read() == original, f"{path} not restored!"
    print(f"{'PASS' if hit else 'FAIL'}  {name}")
    if not hit:
        print(f"      expected {expect!r}; got: {fails}")
    return hit


def main():
    results = []

    # An undocumented sequence difference may be a mis-registered chain.
    def undoc(d):
        for ch in d["classes"]["Ig_like"]["primary_chains"]:
            for m in ch.get("internal_mismatch_detail") or []:
                m["documented"] = None
    results.append(control("undocumented sequence variant is rejected",
                           MEAS, undoc, "is documented as a verified variant"))

    # A construct that is mostly expression tag does not describe the domain.
    def tag_heavy(d):
        d["classes"]["Fn3"]["primary_chains"][0]["native_residue_frac"] = 0.42
    results.append(control("tag-dominated construct is rejected",
                           MEAS, tag_heavy, "native titin residues"))

    # A mis-registered chain shows low identity across its mapped span.
    def misreg(d):
        d["classes"]["kinase"]["primary_chains"][0]["core_identity_frac"] = 0.11
    results.append(control("mis-registered chain is rejected",
                           MEAS, misreg, "across its mapped span"))

    # The literature axial length drives layout and must survive Phase 6.
    def overwrite_axial(d):
        d["domain_archetypes"]["Ig_like"]["axial_length_nm"] = 4.319
        d["domain_archetypes"]["Ig_like"]["measured_geometry"][
            "axial_length_adopted"] = True
    results.append(control("silently adopting a measured axial length is rejected",
                           STRAT, overwrite_axial, "remains the literature"))

    # A primitive that does not contain the atoms is not an envelope.
    def bad_fit(d):
        d["domain_archetypes"]["Fn3"]["measured_geometry"][
            "capsule_enclosure_frac"] = 0.51
    results.append(control("primitive that fails to enclose atoms is rejected",
                           STRAT, bad_fit, "encloses >=95%"))

    # Size measured off-axis must not be asserted as an axial length.
    def long_axis_as_axial(d):
        k = d["domain_archetypes"]["kinase"]
        k["axial_length_nm"] = k["measured_geometry"]["longest_principal_extent_nm"]
    results.append(control("using the long-axis extent as an axial length is rejected",
                           STRAT, long_axis_as_axial, "long-axis extent"))

    # One entry is not a measurement.
    def single_entry(d):
        d["domain_archetypes"]["Fn3"]["measured_geometry"][
            "n_independent_entries"] = 1
    results.append(control("single-entry measurement is rejected",
                           STRAT, single_entry, ">=2 independent PDB entries"))

    # Control on the controls: unmodified tree must be clean.
    clean = not run_validator()
    results.append(clean)
    print(f"{'PASS' if clean else 'FAIL'}  unmodified spec validates clean")

    print(f"\n{sum(results)} passed, {len(results) - sum(results)} failed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
