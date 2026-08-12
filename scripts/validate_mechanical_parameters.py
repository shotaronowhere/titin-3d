#!/usr/bin/env python3
"""Validate the SC-21 canonical mechanics parameter and fail-closed regime record."""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

PARAMETER_FIELDS = {
    "unit",
    "uncertainty",
    "source_id",
    "source_locator",
    "species",
    "muscle_or_tissue",
    "preparation",
    "temperature_K",
    "applicability",
    "transfer_rationale",
    "validity",
    "approved_reviewer",
    "decision_status",
}
EXPECTED_REGIONS = ["prox_Ig", "N2A", "PEVK", "dist_Ig"]
EXPECTED_LAWS = {
    "prox_Ig": "wlc",
    "N2A": "folded_plus_wlc",
    "PEVK": "ewlc",
    "dist_Ig": "wlc",
}
EXPECTED_PARAMETERS = {
    "prox_Ig": {"persistence_length", "contour_length"},
    "N2A": {"persistence_length", "contour_length", "rigid_folded_length"},
    "PEVK": {"persistence_length", "stretch_modulus", "contour_length", "residue_rise"},
    "dist_Ig": {"persistence_length", "contour_length"},
}


def finite_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) \
        and math.isfinite(value)


def numeric_range(value, *, allow_equal: bool = True) -> bool:
    if not isinstance(value, list) or len(value) != 2 \
            or not all(finite_number(item) for item in value):
        return False
    return value[0] <= value[1] if allow_equal else value[0] < value[1]


def load(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def validate(record: dict, decisions: dict, references: dict) -> list[str]:
    problems: list[str] = []
    titin = load("titin.json")
    titin_regions = {row.get("id"): row for row in titin.get("regions") or []}

    def resolved_value(parameter: dict):
        if "value" in parameter:
            return parameter.get("value")
        pointer = str(parameter.get("value_from_spec", ""))
        match = re.fullmatch(
            r"data/titin\.json#/regions\[id=([^\]]+)\]/extension_model/([A-Za-z0-9_]+)",
            pointer,
        )
        if not match:
            return None
        return (titin_regions.get(match.group(1), {}).get("extension_model") or {}).get(
            match.group(2)
        )
    if record.get("schema") != "titin-mechanical-parameters/1":
        problems.append("mechanical parameter schema is not titin-mechanical-parameters/1")
    if not str(record.get("parameter_set_id", "")).strip():
        problems.append("parameter_set_id is missing")

    decision = record.get("decision") or {}
    ledger = (decisions.get("decisions") or {}).get("SD-04") or {}
    if decision.get("id") != "SD-04" or decision.get("status") != ledger.get("status"):
        problems.append("parameter decision does not match SD-04")
    if decision.get("status") not in {"PENDING", "DEFERRED", "APPROVED"}:
        problems.append("parameter decision status is invalid")
    if decision.get("status") != "APPROVED" and decision.get("approved_reviewer") is not None:
        problems.append("unapproved parameter set invents an approved reviewer")
    if decision.get("status") == "APPROVED":
        reviewer = ledger.get("reviewer") or {}
        reviewer_name = reviewer.get("name") if isinstance(reviewer, dict) else None
        if not isinstance(reviewer, dict) or any(
                not str(reviewer.get(field, "")).strip()
                for field in ("name", "affiliation", "role")):
            problems.append("approved SD-04 lacks a named specialist reviewer, affiliation, or role in the decision ledger")
        elif reviewer.get("role") != ledger.get("required_reviewer_role"):
            problems.append("approved SD-04 reviewer role does not match the required specialist role")
        if ledger.get("independent_human_review_status") not in {
                "COMPLETE", "COMPLETED", "PERFORMED", "VERIFIED"}:
            problems.append("approved SD-04 lacks completed independent human review")
        if decision.get("approved_reviewer") != reviewer_name:
            problems.append("parameter-set reviewer does not match the SD-04 specialist reviewer")
    if not str(decision.get("ruling_locator", "")).strip():
        problems.append("parameter decision lacks an exact ruling locator")

    target = record.get("target_applicability") or {}
    for field in ("species", "accession", "preparation", "status", "reason"):
        if target.get(field) in (None, ""):
            problems.append(f"target applicability is missing {field}")

    topology = record.get("topology") or {}
    if topology.get("kind") != "series" or topology.get("region_order") != EXPECTED_REGIONS:
        problems.append("series topology or region order is invalid")
    if topology.get("layout_only_regions") != ["post_N2A_unknown"]:
        problems.append("layout-only unresolved region is missing from topology")

    def check_parameter(label: str, parameter: dict) -> None:
        missing = PARAMETER_FIELDS - set(parameter)
        if "value" not in parameter and "value_from_spec" not in parameter:
            missing.add("value or value_from_spec")
        if missing:
            problems.append(f"{label} is missing parameter metadata: {', '.join(sorted(missing))}")
            return
        if "value" in parameter and "value_from_spec" in parameter:
            problems.append(f"{label} ambiguously declares both value and value_from_spec")
        central_value = resolved_value(parameter)
        if not finite_number(central_value) or central_value <= 0:
            problems.append(f"{label} does not resolve to a positive finite value")
        if not str(parameter.get("unit", "")).strip():
            problems.append(f"{label} has no unit")
        uncertainty = parameter.get("uncertainty")
        if not isinstance(uncertainty, dict) or not str(uncertainty.get("kind", "")).strip() \
                or "lower" not in uncertainty or "upper" not in uncertainty:
            problems.append(f"{label} has no explicit range/uncertainty")
        elif (uncertainty.get("lower") is None) != (uncertainty.get("upper") is None):
            problems.append(f"{label} has a half-specified uncertainty range")
        elif uncertainty.get("lower") is not None:
            interval = [uncertainty.get("lower"), uncertainty.get("upper")]
            if not numeric_range(interval):
                problems.append(f"{label} has an invalid uncertainty range")
            elif finite_number(central_value) \
                    and not interval[0] <= central_value <= interval[1]:
                problems.append(f"{label} central value lies outside its uncertainty range")
        if not str(parameter.get("source_id", "")).strip() \
                or not str(parameter.get("source_locator", "")).strip():
            problems.append(f"{label} has no source locator")
        source_id = str(parameter.get("source_id", ""))
        if source_id.startswith("data/"):
            if not (ROOT / source_id).is_file():
                problems.append(f"{label} cites a missing repository source {source_id}")
        elif source_id not in references:
            problems.append(f"{label} cites an unregistered source {source_id}")
        for field in ("species", "preparation", "applicability", "transfer_rationale"):
            if parameter.get(field) in (None, ""):
                problems.append(f"{label} has no {field}")
        validity = parameter.get("validity")
        if not isinstance(validity, dict) \
                or validity.get("target_status") not in {"UNIVERSAL_EXACT", "NOT_ESTABLISHED", "APPROVED"} \
                or "approved_range" not in validity \
                or not str(validity.get("reason", "")).strip():
            problems.append(f"{label} has no explicit target-validity record")
        elif validity.get("target_status") == "NOT_ESTABLISHED" \
                and validity.get("approved_range") is not None:
            problems.append(f"{label} invents a range while target validity is not established")
        elif validity.get("approved_range") is not None \
                and not numeric_range(validity.get("approved_range")):
            problems.append(f"{label} has an invalid target-validity range")
        elif numeric_range(validity.get("approved_range")) and finite_number(central_value) \
                and not validity["approved_range"][0] <= central_value \
                <= validity["approved_range"][1]:
            problems.append(f"{label} central value lies outside its target-validity range")
        if decision.get("status") != "APPROVED" and parameter.get("approved_reviewer") is not None:
            problems.append(f"{label} invents an approved reviewer")
        if decision.get("status") == "APPROVED" \
                and not str(parameter.get("approved_reviewer", "")).strip():
            problems.append(f"{label} lacks the SD-04-approved reviewer")
        if decision.get("status") == "APPROVED":
            if parameter.get("approved_reviewer") != decision.get("approved_reviewer"):
                problems.append(f"{label} reviewer differs from the SD-04 specialist")
            if parameter.get("validity", {}).get("target_status") \
                    not in {"APPROVED", "UNIVERSAL_EXACT"}:
                problems.append(f"{label} target validity is not approved")
            if not numeric_range(parameter.get("validity", {}).get("approved_range")):
                problems.append(f"{label} lacks an approved target-validity range")
            if parameter.get("uncertainty", {}).get("kind") == "NOT_ESTABLISHED" \
                    or not numeric_range([
                        parameter.get("uncertainty", {}).get("lower"),
                        parameter.get("uncertainty", {}).get("upper"),
                    ]):
                problems.append(f"{label} lacks an approved uncertainty range")
            stale_text = " ".join(str(parameter.get(field, "")) for field in
                                  ("applicability", "transfer_rationale")) \
                + " " + str(parameter.get("validity", {}).get("reason", ""))
            if "sd-04 did not" in stale_text.lower() \
                    or "target applicability remains unapproved" in stale_text.lower():
                problems.append(f"{label} retains deferred applicability language after approval")
        if parameter.get("decision_status") != decision.get("status"):
            problems.append(f"{label} decision status differs from SD-04")

    constants = record.get("physical_constants") or {}
    if set(constants) != {"boltzmann_constant", "temperature"}:
        problems.append("physical constants must contain exactly Boltzmann constant and temperature")
    for name, parameter in constants.items():
        check_parameter(f"physical_constants.{name}", parameter)

    regions = record.get("regions") or []
    if [row.get("id") for row in regions] != EXPECTED_REGIONS:
        problems.append("mechanical regions are missing, duplicated, or out of series order")
    for region in regions:
        region_id = region.get("id")
        if region_id not in EXPECTED_LAWS:
            continue
        if region.get("law") != EXPECTED_LAWS[region_id]:
            problems.append(f"{region_id} has the wrong force law")
        parameters = region.get("parameters") or {}
        if set(parameters) != EXPECTED_PARAMETERS[region_id]:
            problems.append(f"{region_id} parameter inventory is incomplete")
        for name, parameter in parameters.items():
            check_parameter(f"{region_id}.{name}", parameter)
        contour = parameters.get("contour_length") or {}
        expected_pointer = f"data/titin.json#/regions[id={region_id}]/extension_model/max_end2end_nm"
        if contour.get("value_from_spec") != expected_pointer:
            problems.append(f"{region_id} contour is not bound to titin.json")

    solver = record.get("solver") or {}
    if solver.get("algorithm") != "monotone_bisection":
        problems.append("solver algorithm is not declared monotone bisection")
    for field in ("iterations", "inverse_iterations", "finite_difference_relative_step",
                  "finite_difference_min_step_pN", "pure_wlc_contour_guard_fraction",
                  "audit_common_force_spread_max"):
        if not isinstance(solver.get(field), (int, float)) or solver[field] <= 0:
            problems.append(f"solver option {field} must be positive")
    bracket = solver.get("force_bracket") or {}
    if bracket.get("min") != 0 or not isinstance(bracket.get("max"), (int, float)) \
            or bracket.get("max", 0) <= 0 or bracket.get("unit") != "pN":
        problems.append("solver force bracket is invalid")
    parity = solver.get("parity_tolerance") or {}
    if not all(isinstance(parity.get(key), (int, float)) and 0 < parity[key] <= 1e-6
               for key in ("force_pN", "extension_nm")):
        problems.append("Python/JavaScript parity tolerance is missing or too loose")

    regimes = record.get("regime_policy") or {}
    ordered = regimes.get("ordered_statuses")
    if ordered != ["not_evaluated", "supported", "extrapolated"]:
        problems.append("regime ordering must be not_evaluated, supported, extrapolated")
    rows = regimes.get("regimes") or []
    if [row.get("status") for row in rows] != ordered:
        problems.append("regime rows do not follow the declared ordering")
    if any(not str(row.get("reason", "")).strip() for row in rows):
        problems.append("every regime requires an explicit reason")
    sensitivity = record.get("sensitivity_policy") or {}
    required_sensitivity = {
        "PEVK.residue_rise", "prox_Ig.persistence_length", "dist_Ig.persistence_length",
        "PEVK.persistence_length", "PEVK.stretch_modulus", "N2A.persistence_length",
    }
    if set(sensitivity.get("required_parameter_ids") or []) != required_sensitivity:
        problems.append("sensitivity policy omits a required transferred/material parameter")
    if sensitivity.get("label") != "parameter sensitivity range":
        problems.append("sensitivity is mislabeled as uncertainty or a confidence interval")

    output = record.get("output_policy") or {}
    if decision.get("status") in {"PENDING", "DEFERRED"}:
        if regimes.get("approved_supported_range_nm") is not None \
                or regimes.get("slack_or_buckling_boundary_nm") is not None \
                or regimes.get("unfolding_materiality_boundary_nm") is not None:
            problems.append("deferred SD-04 invents a supported or regime boundary")
        if not rows or rows[0].get("status") != "not_evaluated" \
                or rows[0].get("enabled") is not True \
                or any(row.get("enabled") for row in rows[1:]):
            problems.append("deferred SD-04 does not fail closed to not_evaluated")
        if sensitivity.get("status") != "not_evaluated" \
                or sensitivity.get("approved_scenarios") != []:
            problems.append("deferred SD-04 invents an approved sensitivity scenario")
        if output.get("public_force") != "SUPPRESSED" \
                or output.get("evaluation_status") != "not_evaluated" \
                or output.get("force_value") is not None \
                or output.get("sensitivity_value") is not None:
            problems.append("deferred SD-04 output policy exposes quantitative force")
    elif decision.get("status") == "APPROVED":
        reviewer_name = decision.get("approved_reviewer")
        if target.get("status") not in {"APPROVED", "VALIDATED"}:
            problems.append("approved SD-04 lacks validated target applicability")
        stale_authority_text = " ".join([
            str(record.get("purpose", "")),
            str(decision.get("consequence", "")),
            str(target.get("reason", "")),
            str(output.get("public_caveat", "")),
        ]).lower()
        if "sd-04 did not approve" in stale_authority_text \
                or "does not authorize an absolute-force" in stale_authority_text \
                or "every target-force evaluation" in stale_authority_text \
                or "quantitative pn output is withheld because" in stale_authority_text:
            problems.append("approved SD-04 retains deferred authority or public-caveat language")
        supported = regimes.get("approved_supported_range_nm")
        slack = regimes.get("slack_or_buckling_boundary_nm")
        unfolding = regimes.get("unfolding_materiality_boundary_nm")
        if not numeric_range(supported, allow_equal=False):
            problems.append("approved SD-04 lacks an ordered supported range")
        if not finite_number(slack):
            problems.append("approved SD-04 lacks a finite slack or buckling boundary")
        if not finite_number(unfolding):
            problems.append("approved SD-04 lacks a finite unfolding-materiality boundary")
        if numeric_range(supported, allow_equal=False) and finite_number(slack) \
                and slack > supported[0]:
            problems.append("slack or buckling boundary overlaps the supported range")
        if numeric_range(supported, allow_equal=False) and finite_number(unfolding) \
                and unfolding <= supported[1]:
            problems.append("unfolding-materiality boundary overlaps the supported range")
        if finite_number(slack) and finite_number(unfolding) and slack >= unfolding:
            problems.append("mechanical regime boundaries are not physically ordered")
        if not str(regimes.get("approved_upper_bound_rationale", "")).strip():
            problems.append("approved SD-04 lacks an upper-bound rationale")
        if len(rows) != 3 or any(row.get("enabled") is not True for row in rows):
            problems.append("approved SD-04 must enable all three status regimes")

        grid = solver.get("parity_grid") or {}
        grid_range = [grid.get("sarcomere_length_min_nm"),
                      grid.get("sarcomere_length_max_nm")]
        if not numeric_range(grid_range, allow_equal=False) \
                or not isinstance(grid.get("sample_count"), int) \
                or grid.get("sample_count", 0) < 3:
            problems.append("approved SD-04 lacks a valid parity grid")
        elif all(finite_number(value) for value in [slack, unfolding]) \
                and (slack < grid_range[0] or unfolding > grid_range[1]):
            problems.append("parity grid does not cover every regime boundary")

        scenarios = sensitivity.get("approved_scenarios")
        allowed_overrides = {
            f"{region['id']}.{name}"
            for region in regions for name in (region.get("parameters") or {})
        }
        covered = set()
        scenario_ids = set()
        if sensitivity.get("status") != "approved" \
                or not isinstance(scenarios, list) or not scenarios:
            problems.append("approved SD-04 lacks approved sensitivity scenarios")
        else:
            for index, scenario in enumerate(scenarios):
                if not isinstance(scenario, dict):
                    problems.append(f"sensitivity scenario {index} is not an object")
                    continue
                scenario_id = scenario.get("id")
                if not str(scenario_id or "").strip() or scenario_id in scenario_ids:
                    problems.append("sensitivity scenario IDs are missing or duplicated")
                scenario_ids.add(scenario_id)
                overrides = scenario.get("overrides")
                if not isinstance(overrides, dict) or not overrides:
                    problems.append(f"sensitivity scenario {scenario_id} has no overrides")
                    continue
                for path, raw in overrides.items():
                    if path not in allowed_overrides:
                        problems.append(f"sensitivity scenario {scenario_id} has invalid override {path}")
                    value = raw.get("value") if isinstance(raw, dict) else raw
                    if not finite_number(value) or value <= 0:
                        problems.append(f"sensitivity scenario {scenario_id} has invalid value for {path}")
                    covered.add(path)
            missing_sensitivity = required_sensitivity - covered
            if missing_sensitivity:
                problems.append("approved sensitivity scenarios do not cover: "
                                + ", ".join(sorted(missing_sensitivity)))
            for scenario in scenarios:
                overrides = scenario.get("overrides") if isinstance(scenario, dict) else None
                if isinstance(overrides, dict) \
                        and "PEVK.residue_rise" in overrides \
                        and "PEVK.contour_length" in overrides:
                    problems.append(
                        f"sensitivity scenario {scenario.get('id')} redundantly overrides "
                        "both PEVK residue rise and contour length"
                    )

        ruling = ledger.get("ruling") or {}
        expected_ruling = {
            "parameter_set_id": record.get("parameter_set_id"),
            "target_accession": target.get("accession"),
            "approved_supported_range_nm": supported,
            "slack_or_buckling_boundary_nm": slack,
            "unfolding_materiality_boundary_nm": unfolding,
            "approved_sensitivity_scenario_ids": [
                scenario.get("id") for scenario in scenarios or []
                if isinstance(scenario, dict)
            ],
            "public_force_output": "AUTHORIZED_BY_REGIME",
        }
        for field, expected in expected_ruling.items():
            if ruling.get(field) != expected:
                problems.append(f"SD-04 specialist ruling does not bind approved {field}")
        if not str(ruling.get("implementation_record", "")).strip():
            problems.append("SD-04 specialist ruling lacks an implementation record")

        if output.get("public_force") != "AUTHORIZED_BY_REGIME" \
                or output.get("evaluation_status") != "status_by_length" \
                or output.get("force_value") is not None \
                or output.get("sensitivity_value") != "computed_from_approved_scenarios":
            problems.append("approved SD-04 output policy is not regime-authorized")
        precision = output.get("precision") or {}
        if precision.get("status") != "sensitivity_derived" \
                or precision.get("significant_digit_cap") not in {1, 2} \
                or not str(precision.get("reason", "")).strip():
            problems.append("approved SD-04 precision policy is invalid")
        if not str(reviewer_name or "").strip():
            problems.append("approved SD-04 output lacks a reviewer authority")
    if not str(output.get("public_caveat", "")).strip():
        problems.append("output policy has no public caveat")
    return problems


def main() -> None:
    path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DATA / "mechanical_parameters.json"
    record = json.loads(path.read_text(encoding="utf-8"))
    problems = validate(record, load("scientific_decisions.json"), load("references.json"))
    if problems:
        print("Mechanical parameter validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    count = sum(len(row["parameters"]) for row in record["regions"]) \
        + len(record["physical_constants"])
    print(f"Mechanical parameter validation: PASS ({count} parameters; SD-04 fail-closed)")


if __name__ == "__main__":
    main()
