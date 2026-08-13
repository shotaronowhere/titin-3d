#!/usr/bin/env python3
"""Destructive controls proving the SC-21 mechanics schema fails closed."""

from __future__ import annotations

from copy import deepcopy

from validate_mechanical_parameters import load, validate

record = load("mechanical_parameters.json")
decisions = load("scientific_decisions.json")
references = load("references.json")


def rejected(label, mutation, expected):
    candidate = deepcopy(record)
    mutation(candidate)
    problems = validate(candidate, decisions, references)
    if not any(expected in problem for problem in problems):
        raise AssertionError(f"{label} escaped: {problems}")


def approved_fixture():
    candidate = deepcopy(record)
    ledger = deepcopy(decisions)
    reviewer = "Qualified Mechanics Reviewer"
    ledger["decisions"]["SD-04"].update({
        "status": "APPROVED",
        "reviewer": {
            "name": reviewer,
            "affiliation": "Independent Mechanics Institute",
            "role": ledger["decisions"]["SD-04"]["required_reviewer_role"],
        },
        "independent_human_review_status": "COMPLETED",
    })
    candidate["decision"].update({
        "status": "APPROVED",
        "approved_reviewer": reviewer,
        "approved_authority": reviewer,
        "consequence": "Quantitative output is authorized only under the approved regime policy.",
    })
    candidate["purpose"] = (
        "One auditable input record for the specialist-approved I-band force model."
    )
    candidate["target_applicability"].update({
        "status": "VALIDATED",
        "reason": "The specialist approved the declared evidence transfers for this fixture.",
    })
    parameter_rows = [
        *candidate["physical_constants"].values(),
        *(parameter for region in candidate["regions"]
          for parameter in region["parameters"].values()),
    ]
    for parameter in parameter_rows:
        parameter["decision_status"] = "APPROVED"
        parameter["approved_reviewer"] = reviewer
        parameter["approved_authority"] = reviewer
        parameter["applicability"] = "Specialist-approved applicability for this fixture."
        parameter["transfer_rationale"] = (
            "The specialist approved this declared transfer for the fixture."
        )
    regimes = candidate["regime_policy"]
    regimes.update({
        "approved_supported_range_nm": [2000.0, 2400.0],
        "approved_upper_bound_rationale": "Omitted unfolding is material at 2600 nm.",
        "slack_or_buckling_boundary_nm": 1950.0,
        "unfolding_materiality_boundary_nm": 2600.0,
    })
    for row in regimes["regimes"]:
        row["enabled"] = True
        row["reason"] = f"Approved-fixture reason for {row['status']}."
    candidate["sensitivity_policy"].update({
        "status": "approved",
        "approved_scenarios": [{
            "id": "approved_lower_transfer",
            "source_ids": ["10.1073/pnas.95.14.8052"],
            "interpretation": "Approved-fixture destructive-control scenario.",
            "overrides": {
                "PEVK.residue_rise": 0.38,
                "prox_Ig.persistence_length": 18.0,
                "dist_Ig.persistence_length": 18.0,
                "PEVK.persistence_length": 0.50,
                "PEVK.stretch_modulus": 170.0,
                "N2A.persistence_length": 0.30,
            },
        }],
    })
    candidate["output_policy"].update({
        "public_force": "AUTHORIZED_BY_REGIME",
        "evaluation_status": "status_by_length",
        "force_value": None,
        "sensitivity_value": "computed_from_approved_scenarios",
        "precision": {
            "status": "sensitivity_derived",
            "significant_digit_cap": 2,
            "reason": "Central and sensitivity values use the same displayed place.",
        },
        "public_caveat": (
            "Approximate passive force per titin under the approved model and regime; "
            "active force and non-titin passive contributions are excluded."
        ),
    })
    ledger["decisions"]["SD-04"]["ruling"] = {
        "parameter_set_id": candidate["parameter_set_id"],
        "target_accession": candidate["target_applicability"]["accession"],
        "approved_supported_range_nm": [2000.0, 2400.0],
        "slack_or_buckling_boundary_nm": 1950.0,
        "unfolding_materiality_boundary_nm": 2600.0,
        "approved_sensitivity_scenario_ids": ["approved_lower_transfer"],
        "public_force_output": "AUTHORIZED_BY_REGIME",
        "implementation_record": "approved-fixture://SC-21-negative-controls",
    }
    return candidate, ledger


def rejected_approved(label, mutation, expected):
    candidate, ledger = approved_fixture()
    mutation(candidate, ledger)
    problems = validate(candidate, ledger, references)
    if not any(expected in problem for problem in problems):
        raise AssertionError(f"{label} escaped: {problems}")


rejected(
    "missing unit",
    lambda row: row["regions"][0]["parameters"]["persistence_length"].pop("unit"),
    "missing parameter metadata",
)
rejected(
    "missing source locator",
    lambda row: row["regions"][2]["parameters"]["stretch_modulus"].__setitem__(
        "source_locator", ""
    ),
    "source locator",
)
rejected(
    "missing applicability",
    lambda row: row["regions"][1]["parameters"]["persistence_length"].__setitem__(
        "applicability", None
    ),
    "applicability",
)
rejected(
    "missing transfer rationale",
    lambda row: row["regions"][3]["parameters"]["persistence_length"].__setitem__(
        "transfer_rationale", ""
    ),
    "transfer_rationale",
)
rejected(
    "missing target validity",
    lambda row: row["regions"][2]["parameters"]["residue_rise"].pop("validity"),
    "missing parameter metadata",
)
rejected(
    "decision mismatch",
    lambda row: row["decision"].__setitem__("status", "DEFERRED"),
    "does not match SD-04",
)
rejected(
    "invalid regime ordering",
    lambda row: row["regime_policy"].__setitem__(
        "ordered_statuses", ["supported", "not_evaluated", "extrapolated"]
    ),
    "regime ordering",
)
rejected(
    "fabricated sensitivity",
    lambda row: row["sensitivity_policy"]["approved_scenarios"].append(
        {"id": "invented", "ranges": {}}
    ),
    "registered source evidence",
)
rejected(
    "force leakage",
    lambda row: row["output_policy"].__setitem__("force_value", 1.23),
    "not regime-authorized",
)

approved, approved_decisions = approved_fixture()
approved_problems = validate(approved, approved_decisions, references)
if approved_problems:
    raise AssertionError(f"valid approved fixture was rejected: {approved_problems}")

rejected_approved(
    "reversed approved range",
    lambda row, _: row["regime_policy"].__setitem__(
        "approved_supported_range_nm", [2400.0, 2000.0]
    ),
    "ordered supported range",
)
rejected_approved(
    "slack overlaps supported range",
    lambda row, _: row["regime_policy"].__setitem__(
        "slack_or_buckling_boundary_nm", 2100.0
    ),
    "overlaps the supported range",
)
rejected_approved(
    "unknown sensitivity override",
    lambda row, _: row["sensitivity_policy"]["approved_scenarios"][0][
        "overrides"
    ].__setitem__("unknown.parameter", 1.0),
    "invalid override",
)
rejected_approved(
    "missing required sensitivity coverage",
    lambda row, _: row["sensitivity_policy"]["approved_scenarios"][0][
        "overrides"
    ].pop("PEVK.residue_rise"),
    "do not cover",
)
rejected_approved(
    "incomplete decision authority",
    lambda _, ledger: (
        ledger["decisions"]["SD-04"].__setitem__("reviewer", None),
        ledger["decisions"]["SD-04"].__setitem__("adjudicator", None),
    ),
    "complete human review or honest owner-authorized",
)
rejected_approved(
    "unvalidated approved target",
    lambda row, _: row["target_applicability"].__setitem__("status", "NOT_VALIDATED"),
    "validated target applicability",
)
rejected_approved(
    "unapproved parameter uncertainty",
    lambda row, _: row["regions"][2]["parameters"]["stretch_modulus"].__setitem__(
        "uncertainty", {"kind": "NOT_ESTABLISHED", "lower": None, "upper": None}
    ),
    "approved uncertainty range",
)
rejected_approved(
    "approved output policy still suppressed",
    lambda row, _: row["output_policy"].__setitem__("public_force", "SUPPRESSED"),
    "not regime-authorized",
)
rejected_approved(
    "specialist ruling drift",
    lambda _, ledger: ledger["decisions"]["SD-04"]["ruling"].__setitem__(
        "approved_supported_range_nm", [2000.0, 2500.0]
    ),
    "ruling does not bind approved approved_supported_range_nm",
)
rejected_approved(
    "redundant PEVK contour scenario",
    lambda row, _: row["sensitivity_policy"]["approved_scenarios"][0][
        "overrides"
    ].__setitem__("PEVK.contour_length", 500.0),
    "redundantly overrides both PEVK residue rise and contour length",
)

print("SC-21 mechanical-parameter negative controls: PASS (19/19 mutations rejected; approved fixture accepted)")
