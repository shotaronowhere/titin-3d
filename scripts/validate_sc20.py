#!/usr/bin/env python3
"""Cross-record SC-20 scientific and depiction invariants."""

from __future__ import annotations

import json
import hashlib
import re
from pathlib import Path

from validate_scientific_decisions import complete_reviewer, honest_adjudicator

ROOT = Path(__file__).resolve().parents[1]


def load(name: str):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def validate(titin: dict, decisions: dict, scope: dict, template: str) -> list[str]:
    problems: list[str] = []
    regions = titin.get("regions") or []
    expected = [
        ("Z1Z2", 1, 800), ("prox_Ig", 801, 9365), ("N2A", 9366, 9851),
        ("post_N2A_unknown", 9852, 10215), ("PEVK", 10216, 12022),
        ("dist_Ig", 12023, 14018), ("Aband_super", 14019, 32177),
        ("kinase", 32178, 32432), ("Mline", 32433, 34350),
    ]
    actual = [(row.get("id"), row.get("residue_span", {}).get("start"),
               row.get("residue_span", {}).get("end")) for row in regions]
    if actual != expected:
        problems.append("Q8WZ42-1 sequence regions do not match the SD-01 partition")
    by_id = {row.get("id"): row for row in regions}
    if [by_id.get(key, {}).get("domain_composition", {}).get("Ig_like")
            for key in ("prox_Ig", "N2A", "dist_Ig")] != [74, 4, 16]:
        problems.append("SC-20 I-band Ig counts must be 74/4/16")
    n2a_accounting = by_id.get("N2A", {}).get("coordinate_accounting") or {}
    if n2a_accounting.get("unassigned_intra_N2A_linkers") != [
        {"start": 9471, "end": 9471, "length_aa": 1,
         "evidence_class": "UNKNOWN (no source-backed element assignment)"},
        {"start": 9756, "end": 9759, "length_aa": 4,
         "evidence_class": "UNKNOWN (no source-backed element assignment)"},
    ] or n2a_accounting.get("preserved_source_overlap", {}).get("start") != 9660 \
            or n2a_accounting.get("preserved_source_overlap", {}).get("end") != 9671:
        problems.append("N2A coordinate accounting must expose both unassigned linkers and overlap")
    totals = titin.get("domain_totals") or {}
    observed = [
        totals.get("uniprot_domain_feature_count", {}).get("Ig_like"),
        totals.get("curated_biological_domain_count", {}).get("Ig_like"),
        totals.get("rendered_domain_count", {}).get("Ig_like"),
    ]
    if observed != [152, 153, 153]:
        problems.append("imported/curated/rendered Ig totals must remain distinct 152/153/153")
    unknown = by_id.get("post_N2A_unknown", {})
    if unknown.get("mechanical_class") != "excluded_unknown" \
            or unknown.get("extension_model", {}).get("mechanics_included") is not False \
            or unknown.get("extension_model", {}).get("physical_contour_nm") is not None:
        problems.append("post-N2A UNKNOWN sequence leaked into an identity, contour, or force law")

    anchored = [by_id.get(key, {}) for key in ("Aband_super", "kinase", "Mline")]
    for index, row in enumerate(anchored):
        position = row.get("resting_axial_position_nm") or {}
        if row.get("axial_placement", {}).get("kind") != "SCHEMATIC_DISPLAY_ALLOCATION" \
                or row.get("axial_placement", {}).get("scientific_axial_length_nm") is not None \
                or position.get("axial_length_nm") != position.get("X_end", 0) - position.get("X_start", 0):
            problems.append(f"{row.get('id')} is not an internally exact non-metric display allocation")
        if index and anchored[index - 1].get("resting_axial_position_nm", {}).get("X_end") \
                != position.get("X_start"):
            problems.append("A-band/kinase/M-line display allocations contain a gap or overlap")
    if by_id.get("kinase", {}).get("axial_placement", {}).get(
            "envelope_nm_from_sarcomere_midpoint") != {
                "near": 70, "far": 105, "statistical_confidence_interval": False}:
        problems.append("kinase placement envelope must remain the non-statistical 70–105 nm range")
    if anchored[-1].get("resting_axial_position_nm", {}).get("X_end") != 1100:
        problems.append("M-line display allocation must close on the resting midpoint")

    quantities = by_id.get("Aband_super", {}).get("periodicity_quantities") or {}
    values = [
        quantities.get("rabbit_psoas_mean_titin_domain_spacing_nm", {}).get("value"),
        quantities.get("derived_11_domain_interval_nm", {}).get("value"),
        quantities.get("myosin_head_H_periodicity_nm", {}).get("value"),
        quantities.get("myosin_crown_spacing_nm", {}).get("value"),
        quantities.get("thick_filament_L_periodicity_nm", {}).get("value"),
    ]
    if values != [3.98, 43.78, 43.17, 14.3, 45.54] or len(set(values[1:])) != 4:
        problems.append("SD-03 periodicities were changed or collapsed into one quantity")
    if quantities.get("L_periodicity_titin_origin_hypothesis", {}).get("evidence_class") != "INFERRED":
        problems.append("the titin-origin hypothesis for L periodicity must remain INFERRED")
    expected_periodicities = {
        "c_zone_sequence_super_repeat_domain_count",
        "rabbit_psoas_mean_titin_domain_spacing_nm",
        "derived_11_domain_interval_nm",
        "myosin_head_H_periodicity_nm",
        "myosin_crown_spacing_nm",
        "thick_filament_L_periodicity_nm",
        "L_periodicity_titin_origin_hypothesis",
    }
    required_metadata = {
        "value", "evidence_class", "source", "locator", "preparation", "uncertainty", "not_claimed",
    }
    if set(quantities) != expected_periodicities:
        problems.append("SD-03 periodicity schema must contain exactly seven distinct quantities")
    for quantity_id, quantity in quantities.items():
        missing = required_metadata - set(quantity)
        if missing or not all(quantity.get(field) for field in
                              ("evidence_class", "source", "locator", "preparation", "not_claimed")):
            problems.append(f"{quantity_id} lacks complete evidence/preparation/uncertainty metadata")

    expected_status = {
        "SD-01": "APPROVED", "SD-02": "DEFERRED", "SD-03": "APPROVED",
        "SD-05": "APPROVED",
    }
    implemented_fingerprints: set[str] = set()
    implementation_evidence_kinds: set[str] = set()
    for decision_id in ["SD-01", "SD-02", "SD-03", "SD-04", "SD-05"]:
        row = decisions.get("decisions", {}).get(decision_id, {})
        status = row.get("status")
        if decision_id == "SD-04":
            status_ok = status in {"DEFERRED", "APPROVED"}
        else:
            status_ok = status == expected_status[decision_id]
        reviewer = row.get("reviewer")
        if reviewer is None:
            provenance_ok = row.get("independent_human_review_status") == "NOT_PERFORMED" \
                and honest_adjudicator(row.get("adjudicator"), human_allowed=False)
        else:
            provenance_ok = status == "APPROVED" \
                and complete_reviewer(reviewer, row.get("required_reviewer_role", "")) \
                and row.get("independent_human_review_status") \
                in {"COMPLETE", "COMPLETED", "PERFORMED", "VERIFIED"} \
                and honest_adjudicator(row.get("adjudicator"), human_allowed=True)
        if not status_ok or not provenance_ok:
            problems.append(f"{decision_id} status/provenance is stale or overclaims human review")
        verification = row.get("implementation_verification") or {}
        implemented_fingerprint = str(verification.get("implemented_model_fingerprint", ""))
        verification_reviewer = verification.get("reviewer")
        verification_authority_ok = (
            reviewer is None
            and honest_adjudicator(verification.get("adjudicator"), human_allowed=False)
            if verification_reviewer is None else
            complete_reviewer(verification_reviewer, row.get("required_reviewer_role", ""))
            and (reviewer is None
                 or verification_reviewer.get("name") == reviewer.get("name"))
            and honest_adjudicator(verification.get("adjudicator"), human_allowed=True)
        )
        if verification.get("status") != "VERIFIED" \
                or not verification_authority_ok \
                or not re.fullmatch(r"[0-9a-f]{64}", implemented_fingerprint) \
                or not verification.get("implementation_evidence"):
            problems.append(f"{decision_id} implementation is not honestly VERIFIED and evidence-bound")
        else:
            implemented_fingerprints.add(implemented_fingerprint)
            for evidence in verification.get("implementation_evidence") or []:
                if not isinstance(evidence, dict):
                    problems.append(f"{decision_id} implementation evidence is not byte-digested")
                    continue
                relative = str(evidence.get("path", ""))
                path = (ROOT / relative).resolve()
                digest = str(evidence.get("sha256", ""))
                if ROOT not in path.parents or not path.is_file():
                    problems.append(f"{decision_id} implementation evidence is missing/outside repository")
                elif not re.fullmatch(r"[0-9a-f]{64}", digest) \
                        or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                    problems.append(f"{decision_id} implementation-evidence byte digest is stale")
                if evidence.get("kind"):
                    implementation_evidence_kinds.add(str(evidence["kind"]))
    if len(implemented_fingerprints) != 1:
        problems.append("SD-01-SD-05 implementation verification does not bind one canonical model")
    if not {"boundary_audit", "render_audit", "manual_capture"}.issubset(
            implementation_evidence_kinds):
        problems.append("implementation evidence lacks boundary, render, or manual-capture proof")
    mechanics_scope = scope.get("mechanics", {})
    if decisions.get("decisions", {}).get("SD-04", {}).get("status") == "DEFERRED":
        if mechanics_scope.get("review_status") != "DEFERRED" \
                or "absolute pN withheld" not in mechanics_scope.get("display_label", ""):
            problems.append("SD-04 deferral is not propagated into public scope")
    elif mechanics_scope.get("review_status") != "APPROVED" \
            or "absolute pN withheld" in mechanics_scope.get("display_label", ""):
        problems.append("SD-04 approval is not propagated into public scope")
    if "titinStrands: false" not in template \
            or "absolute pN withheld · SD-04 ${g.titin_mechanics_decision_status}" not in template:
        problems.append("public application does not enforce SD-04/SD-05 depiction policy")
    return problems


def main() -> None:
    problems = validate(
        load("titin.json"), load("scientific_decisions.json"),
        load("scientific_scope.json"),
        (ROOT / "src/index.template.html").read_text(encoding="utf-8"),
    )
    if problems:
        print("SC-20 validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    print("SC-20 cross-record validation: PASS")


if __name__ == "__main__":
    main()
