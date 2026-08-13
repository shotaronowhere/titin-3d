#!/usr/bin/env python3
"""SC-21 canonical mechanics generator and Python reference implementation.

All dimensional inputs and numerical options come from
``data/mechanical_parameters.json``. The development solve determines continuous
regional geometry; public force is emitted only in an SD-04-authorized length
regime, while omission-boundary rows remain ``not_evaluated`` with ``force_pN``
null. ``--parity-json`` is an explicit diagnostic used to compare the independent
Python and JavaScript algorithms; it is not a separate authority surface.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

MODEL_INPUTS = [
    "data/sarcomere.json",
    "data/titin.json",
    "data/titin_sequence_features.json",
    "data/structural_states.json",
    "data/geometry_sources.json",
    "data/geometry_strategy.json",
    "data/context_measurements.json",
    "data/domain_backbones.json",
    "data/mechanical_parameters.json",
]


def load(name: str):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def _frame(hasher, label: str, value: bytes) -> None:
    label_bytes = label.encode("utf-8")
    hasher.update(f"{len(label_bytes)}:{label}{len(value)}:".encode("utf-8"))
    hasher.update(value)


def model_fingerprint(overrides: dict[str, bytes] | None = None) -> str:
    overrides = overrides or {}
    hasher = hashlib.sha256()
    _frame(hasher, "schema", b"titin-model-inputs/1")
    for relative in MODEL_INPUTS:
        value = overrides.get(relative, (ROOT / relative).read_bytes())
        _frame(hasher, relative, value)
    return hasher.hexdigest()


def _positive(value, label: str) -> float:
    if not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError(f"{label} must be a positive finite number")
    return float(value)


def thermal_energy(parameters: dict) -> float:
    constants = parameters["physical_constants"]
    k_b = _positive(constants["boltzmann_constant"]["value"], "Boltzmann constant")
    temperature = _positive(constants["temperature"]["value"], "temperature")
    return k_b * temperature * 1e21


def g_marko_siggia(y: float) -> float:
    return 1.0 / (4.0 * (1.0 - y) ** 2) - 0.25 + y


def wlc_force(y: float, persistence_nm: float, kt_pn_nm: float) -> float:
    return (kt_pn_nm / persistence_nm) * g_marko_siggia(y)


def _g_inverse(target: float, iterations: int) -> float:
    lo, hi = 0.0, 1.0 - sys.float_info.epsilon
    for _ in range(iterations):
        mid = 0.5 * (lo + hi)
        if g_marko_siggia(mid) < target:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def wlc_extension(force_pn: float, persistence_nm: float, contour_nm: float,
                  kt_pn_nm: float, inverse_iterations: int) -> float:
    if force_pn <= 0.0:
        return 0.0
    return contour_nm * _g_inverse(
        force_pn * persistence_nm / kt_pn_nm, inverse_iterations
    )


def ewlc_extension(force_pn: float, persistence_nm: float, contour_nm: float,
                   stretch_modulus_pn: float, kt_pn_nm: float,
                   inverse_iterations: int) -> float:
    if force_pn <= 0.0:
        return 0.0
    return contour_nm * (
        _g_inverse(force_pn * persistence_nm / kt_pn_nm, inverse_iterations)
        + force_pn / stretch_modulus_pn
    )


def _parameter_value(row: dict, label: str) -> float:
    return _positive(row.get("value"), label)


def chain_parameters(spec_titin: dict, parameter_record: dict | None = None) -> dict:
    """Resolve the canonical parameter record against sequence-derived contours."""
    parameter_record = parameter_record or load("mechanical_parameters.json")
    regions = {region["id"]: region for region in spec_titin["regions"]}
    resolved = {}
    for row in parameter_record["regions"]:
        region_id = row["id"]
        if region_id not in parameter_record["topology"]["region_order"]:
            continue
        source = regions[region_id]["extension_model"]
        inputs = row["parameters"]
        region = {
            "law": row["law"],
            "A_nm": _parameter_value(inputs["persistence_length"],
                                     f"{region_id}.persistence_length"),
            "Lc_nm": _positive(source["max_end2end_nm"],
                               f"{region_id}.max_end2end_nm"),
            "parameter_records": inputs,
        }
        if "stretch_modulus" in inputs:
            region["K0_pN"] = _parameter_value(
                inputs["stretch_modulus"], f"{region_id}.stretch_modulus"
            )
        if "rigid_folded_length" in inputs:
            region["rigid_nm"] = _positive(
                source["rigid_folded_length_nm"],
                f"{region_id}.rigid_folded_length_nm",
            )
            if region["rigid_nm"] >= region["Lc_nm"]:
                raise ValueError(f"{region_id} rigid floor must be below contour")
        resolved[region_id] = region
    order = parameter_record["topology"]["region_order"]
    if set(resolved) != set(order):
        raise ValueError("parameter record does not cover the complete series chain")
    return {
        "parameter_set_id": parameter_record["parameter_set_id"],
        "order": order,
        "layout_only": parameter_record["topology"]["layout_only_regions"],
        "kT_pN_nm": thermal_energy(parameter_record),
        "solver": parameter_record["solver"],
        "regions": resolved,
    }


def region_extension(chain: dict, region_id: str, force_pn: float) -> float:
    region = chain["regions"][region_id]
    inverse_iterations = chain["solver"]["inverse_iterations"]
    if region["law"] == "wlc":
        return wlc_extension(force_pn, region["A_nm"], region["Lc_nm"],
                             chain["kT_pN_nm"], inverse_iterations)
    if region["law"] == "folded_plus_wlc":
        return region["rigid_nm"] + wlc_extension(
            force_pn, region["A_nm"], region["Lc_nm"] - region["rigid_nm"],
            chain["kT_pN_nm"], inverse_iterations,
        )
    if region["law"] == "ewlc":
        return ewlc_extension(
            force_pn, region["A_nm"], region["Lc_nm"], region["K0_pN"],
            chain["kT_pN_nm"], inverse_iterations,
        )
    raise ValueError(f"unsupported law {region['law']!r} for {region_id}")


def chain_extension(chain: dict, force_pn: float) -> float:
    return sum(region_extension(chain, region_id, force_pn)
               for region_id in chain["order"])


def solve_force(chain: dict, total_nm: float) -> float:
    """Development-only common-force solve; not a target evaluation."""
    _positive(total_nm, "I-band total")
    bracket = chain["solver"]["force_bracket"]
    lo, hi = bracket["min"], bracket["max"]
    lo_extension = chain_extension(chain, lo)
    hi_extension = chain_extension(chain, hi)
    tolerance = chain["solver"]["parity_tolerance"]["extension_nm"]
    if total_nm < lo_extension - tolerance or total_nm > hi_extension + tolerance:
        raise ValueError(
            f"I-band total {total_nm} nm is outside the solver bracket "
            f"[{lo_extension}, {hi_extension}] nm"
        )
    if abs(total_nm - lo_extension) <= tolerance:
        return float(lo)
    if abs(total_nm - hi_extension) <= tolerance:
        return float(hi)
    for _ in range(chain["solver"]["iterations"]):
        mid = 0.5 * (lo + hi)
        if chain_extension(chain, mid) < total_nm:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def force_for_region(chain: dict, region_id: str, extension_nm: float) -> float | None:
    region = chain["regions"][region_id]
    if not isinstance(extension_nm, (int, float)) or not math.isfinite(extension_nm) \
            or extension_nm < 0:
        raise ValueError(f"{region_id} extension must be a non-negative finite number")
    guard = chain["solver"]["pure_wlc_contour_guard_fraction"]
    if region["law"] in ("wlc", "folded_plus_wlc") \
            and extension_nm >= region["Lc_nm"] * (1.0 - guard):
        return None
    if region["law"] == "folded_plus_wlc" and extension_nm <= region["rigid_nm"]:
        return 0.0
    bracket = chain["solver"]["force_bracket"]
    lo, hi = bracket["min"], bracket["max"]
    lo_extension = region_extension(chain, region_id, lo)
    hi_extension = region_extension(chain, region_id, hi)
    tolerance = chain["solver"]["parity_tolerance"]["extension_nm"]
    if extension_nm < lo_extension - tolerance or extension_nm > hi_extension + tolerance:
        return None
    if abs(extension_nm - lo_extension) <= tolerance:
        return float(lo)
    if abs(extension_nm - hi_extension) <= tolerance:
        return float(hi)
    for _ in range(chain["solver"]["iterations"]):
        mid = 0.5 * (lo + hi)
        if region_extension(chain, region_id, mid) < extension_nm:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def compliance_shares(chain: dict, force_pn: float) -> tuple[dict, dict]:
    relative = chain["solver"]["finite_difference_relative_step"]
    minimum = chain["solver"]["finite_difference_min_step_pN"]
    h = max(force_pn * relative, minimum)
    lo_force = max(force_pn - h, chain["solver"]["force_bracket"]["min"])
    hi_force = force_pn + h
    incremental = {
        region_id: (
            region_extension(chain, region_id, hi_force)
            - region_extension(chain, region_id, lo_force)
        ) / (hi_force - lo_force)
        for region_id in chain["order"]
    }
    total = sum(incremental.values())
    return ({region_id: incremental[region_id] / total for region_id in chain["order"]},
            incremental)


def chain_with_overrides(chain: dict, overrides: dict) -> dict:
    """Return one deterministic specialist-approved sensitivity scenario."""
    if "PEVK.residue_rise" in overrides and "PEVK.contour_length" in overrides:
        raise ValueError(
            "scenario redundantly overrides both PEVK residue rise and contour length"
        )
    scenario = copy.deepcopy(chain)
    fields = {
        "persistence_length": "A_nm",
        "stretch_modulus": "K0_pN",
        "contour_length": "Lc_nm",
        "rigid_folded_length": "rigid_nm",
    }
    for path, raw in overrides.items():
        try:
            region_id, parameter = path.split(".", 1)
        except ValueError as error:
            raise ValueError(f"invalid scenario override {path}") from error
        value = _positive(raw.get("value") if isinstance(raw, dict) else raw,
                          f"scenario {path}")
        region = scenario["regions"].get(region_id)
        if parameter == "residue_rise" and region_id == "PEVK" and region:
            central = _parameter_value(
                chain["regions"][region_id]["parameter_records"]["residue_rise"],
                "PEVK.residue_rise",
            )
            region["Lc_nm"] = chain["regions"][region_id]["Lc_nm"] * value / central
            continue
        field = fields.get(parameter)
        if not region or not field or field not in region:
            raise ValueError(f"invalid scenario override {path}")
        region[field] = value
    for region_id, region in scenario["regions"].items():
        if region.get("rigid_nm", 0) >= region["Lc_nm"]:
            raise ValueError(f"scenario {region_id} rigid floor must be below contour")
    return scenario


def sensitivity_envelope(chain: dict, parameter_record: dict,
                         total_nm: float, status: str) -> dict | None:
    policy = parameter_record["sensitivity_policy"]
    if status == "not_evaluated" or policy.get("status") != "approved":
        return None
    scenarios = policy.get("approved_scenarios") or []
    if not scenarios:
        return None
    rows = []
    for scenario in [{"id": "central", "chain": chain}, *[
            {"id": item["id"], "chain": chain_with_overrides(chain, item["overrides"])}
            for item in scenarios]]:
        scenario_chain = scenario["chain"]
        force = solve_force(scenario_chain, total_nm)
        extension = {
            region_id: region_extension(scenario_chain, region_id, force)
            for region_id in scenario_chain["order"]
        }
        _, incremental = compliance_shares(scenario_chain, force)
        rows.append({
            "id": scenario["id"],
            "force": force,
            "extension": extension,
            "incremental": incremental,
        })

    def bounds(values):
        return {"min": min(values), "max": max(values)}

    return {
        "label": policy["label"],
        "scenario_ids": [row["id"] for row in rows],
        "force_pN": bounds([row["force"] for row in rows]),
        "extension_nm": {
            region_id: bounds([row["extension"][region_id] for row in rows])
            for region_id in chain["order"]
        },
        "incremental_compliance_nm_per_pN": {
            region_id: bounds([row["incremental"][region_id] for row in rows])
            for region_id in chain["order"]
        },
        "interpretation": "Parameter sensitivity range; not a confidence interval, biological variance, or experimental error.",
    }


def _js_round(value: float) -> int:
    """Match JavaScript Math.round for cross-language presentation parity."""
    return math.floor(value + 0.5)


def _round_significant(value: float, digits: int) -> float:
    if value == 0:
        return 0.0
    scale = 10 ** (digits - 1 - math.floor(math.log10(abs(value))))
    return _js_round(value * scale) / scale


def format_force_estimate(evaluation: dict, significant_digit_cap: int = 2) -> dict:
    if evaluation.get("status") == "not_evaluated" \
            or not isinstance(evaluation.get("force_pN"), (int, float)) \
            or not math.isfinite(evaluation["force_pN"]):
        return {"central": None, "sensitivity": None, "text": "not evaluated"}
    force = evaluation["force_pN"]
    envelope = evaluation.get("sensitivity")
    force_range = envelope.get("force_pN") if envelope else None
    if not force_range or not all(
            isinstance(force_range.get(key), (int, float))
            and math.isfinite(force_range[key]) for key in ("min", "max")):
        rounded = _round_significant(force, significant_digit_cap)
        return {"central": rounded, "sensitivity": None, "text": f"≈{rounded:g} pN"}
    half_range = max(force - force_range["min"], force_range["max"] - force)
    if not half_range > 0:
        rounded = _round_significant(force, significant_digit_cap)
        return {"central": rounded, "sensitivity": None, "text": f"≈{rounded:g} pN"}
    half_place = 10 ** math.floor(math.log10(half_range))
    force_place = 0 if force == 0 else 10 ** (
        math.floor(math.log10(abs(force))) - significant_digit_cap + 1
    )
    place = max(half_place, force_place)
    central = _js_round(force / place) * place
    sensitivity = _js_round(half_range / place) * place
    decimals = max(0, -round(math.log10(place)))
    return {
        "central": central,
        "sensitivity": sensitivity,
        "text": f"{central:.{decimals}f} ± {sensitivity:.{decimals}f} pN",
    }


def evaluation_status(parameter_record: dict, sarcomere_length_nm: float) -> str:
    if parameter_record["decision"]["status"] != "APPROVED":
        return "not_evaluated"
    if not isinstance(sarcomere_length_nm, (int, float)) \
            or isinstance(sarcomere_length_nm, bool) \
            or not math.isfinite(sarcomere_length_nm):
        return "not_evaluated"
    policy = parameter_record["regime_policy"]
    supported = policy.get("approved_supported_range_nm")
    if not isinstance(supported, list) or len(supported) != 2 \
            or not all(isinstance(value, (int, float))
                       and not isinstance(value, bool) and math.isfinite(value)
                       for value in supported) \
            or supported[0] >= supported[1]:
        return "not_evaluated"
    slack = policy.get("slack_or_buckling_boundary_nm")
    upper = policy.get("unfolding_materiality_boundary_nm")
    if not isinstance(slack, (int, float)) or isinstance(slack, bool) \
            or not math.isfinite(slack) \
            or not isinstance(upper, (int, float)) or isinstance(upper, bool) \
            or not math.isfinite(upper) \
            or slack > supported[0] or upper <= supported[1] or slack >= upper:
        return "not_evaluated"
    if sarcomere_length_nm < slack:
        return "not_evaluated"
    if sarcomere_length_nm >= upper:
        return "not_evaluated"
    enabled = {row["status"] for row in policy.get("regimes", []) if row.get("enabled")}
    if supported[0] <= sarcomere_length_nm <= supported[1]:
        return "supported" if "supported" in enabled else "not_evaluated"
    return "extrapolated" if "extrapolated" in enabled else "not_evaluated"


def evaluation_reason(parameter_record: dict, sarcomere_length_nm: float,
                      status: str | None = None) -> str:
    status = status or evaluation_status(parameter_record, sarcomere_length_nm)
    if parameter_record["decision"]["status"] != "APPROVED":
        return parameter_record["output_policy"]["public_caveat"]
    if not isinstance(sarcomere_length_nm, (int, float)) \
            or isinstance(sarcomere_length_nm, bool) \
            or not math.isfinite(sarcomere_length_nm):
        return "No finite sarcomere length was supplied for mechanics evaluation."
    policy = parameter_record["regime_policy"]
    supported = policy.get("approved_supported_range_nm")
    slack = policy.get("slack_or_buckling_boundary_nm")
    upper = policy.get("unfolding_materiality_boundary_nm")
    valid_supported = isinstance(supported, list) and len(supported) == 2 \
        and all(isinstance(value, (int, float)) and not isinstance(value, bool)
                and math.isfinite(value) for value in supported) \
        and supported[0] < supported[1]
    if not valid_supported or not isinstance(slack, (int, float)) \
            or isinstance(slack, bool) or not math.isfinite(slack) \
            or not isinstance(upper, (int, float)) or isinstance(upper, bool) \
            or not math.isfinite(upper) or slack > supported[0] \
            or upper <= supported[1] or slack >= upper:
        return "The SD-04 regime boundaries are missing, malformed, or physically unordered."
    if sarcomere_length_nm < slack:
        return ("Below the SD-04-approved slack or buckling boundary; "
                "equilibrium tensile force is not evaluated.")
    if sarcomere_length_nm >= upper:
        return ("At or above the SD-04-approved unfolding-materiality boundary; "
                "omitted physics makes force not evaluated.")
    if status == "supported":
        return "Inside the SD-04-approved supported interval."
    if status == "extrapolated":
        return "Outside the approved supported interval; quantitative output is extrapolated."
    return "The applicable SD-04 regime is disabled or lacks an approved boundary."


def public_evaluation(parameter_record: dict, model_id: str,
                      sarcomere_length_nm: float, total_nm: float,
                      chain: dict,
                      region_extension_nm: dict | None = None) -> dict:
    status = evaluation_status(parameter_record, sarcomere_length_nm)
    if status == "not_evaluated" and region_extension_nm is None \
            and isinstance(total_nm, (int, float)) and not isinstance(total_nm, bool) \
            and math.isfinite(total_nm) and total_nm > 0:
        development_force = solve_force(chain, total_nm)
        region_extension_nm = {
            region_id: region_extension(chain, region_id, development_force)
            for region_id in chain["order"]
        }
    if status == "not_evaluated":
        reason = evaluation_reason(parameter_record, sarcomere_length_nm, status)
        return {
            "status": status,
            "force_pN": None,
            "sensitivity": None,
            "sensitivity_pN": None,
            "region_extension_nm": region_extension_nm,
            "incremental_compliance_share": None,
            "incremental_compliance_nm_per_pN": None,
            "precision": parameter_record["output_policy"]["precision"],
            "reason": reason,
            "reasons": [reason],
            "parameter_set_id": parameter_record["parameter_set_id"],
            "model_fingerprint": model_id,
        }
    force = solve_force(chain, total_nm)
    if region_extension_nm is None:
        region_extension_nm = {
            region_id: region_extension(chain, region_id, force)
            for region_id in chain["order"]
        }
    sensitivity = sensitivity_envelope(chain, parameter_record, total_nm, status)
    shares, incremental = compliance_shares(chain, force)
    reason = evaluation_reason(parameter_record, sarcomere_length_nm, status)
    evaluation = {
        "status": status,
        "force_pN": force,
        "sensitivity": sensitivity,
        "sensitivity_pN": ([sensitivity["force_pN"]["min"],
                            sensitivity["force_pN"]["max"]]
                           if sensitivity else None),
        "region_extension_nm": region_extension_nm,
        "incremental_compliance_share": shares,
        "incremental_compliance_nm_per_pN": incremental,
        "reason": reason,
        "reasons": [reason],
        "parameter_set_id": parameter_record["parameter_set_id"],
        "model_fingerprint": model_id,
    }
    evaluation["precision"] = format_force_estimate(
        evaluation,
        parameter_record["output_policy"]["precision"]["significant_digit_cap"],
    )
    return evaluation


def validate_against_source(parameter_record: dict, chain: dict) -> list[dict]:
    checks = []
    for source in parameter_record["source_reproduction_checks"]:
        if source["law"] == "wlc":
            modeled = wlc_force(
                source["fractional_extension"], source["persistence_length_nm"],
                chain["kT_pN_nm"],
            )
            passed = abs(modeled - source["reported_pN"]) <= source["tolerance_pN"]
            result = {
                "id": source["id"],
                "status": "reference_reproduction",
                "reported_pN": source["reported_pN"],
                "model_pN": round(modeled, 3),
                "tolerance_pN": source["tolerance_pN"],
                "pass": passed,
            }
        else:
            fraction = _g_inverse(
                source["force_pN"] * source["persistence_length_nm"] / chain["kT_pN_nm"],
                chain["solver"]["inverse_iterations"],
            )
            passed = source["expected_fraction_min"] < fraction < source["expected_fraction_max"]
            result = {
                "id": source["id"],
                "status": "reference_reproduction",
                "fractional_extension": round(fraction, 4),
                "expected_open_interval": [source["expected_fraction_min"],
                                           source["expected_fraction_max"]],
                "pass": passed,
            }
        result.update({
            "source_id": source["source_id"],
            "source_locator": source["source_locator"],
            "target_applicability": (
                "validated by the recorded SD-04 specialist ruling"
                if parameter_record["decision"]["status"] == "APPROVED"
                else "not evaluated"
            ),
        })
        checks.append(result)
    return checks


def continuity_probe(chain: dict) -> dict:
    policy = chain["solver"]["continuity_probe"]
    sweeps = []
    for count in policy["sample_counts"]:
        values = [
            math.exp(
                math.log(policy["force_min_pN"])
                + (math.log(policy["force_max_pN"])
                   - math.log(policy["force_min_pN"])) * index / count
            )
            for index in range(count + 1)
        ]
        maximum = max(
            abs(chain_extension(chain, values[index + 1])
                - chain_extension(chain, values[index]))
            for index in range(count)
        )
        sweeps.append({"samples": count, "max_step_nm": round(maximum, 6)})
    ratio = sweeps[0]["max_step_nm"] / sweeps[1]["max_step_nm"]
    return {
        "sweeps": sweeps,
        "step_ratio_on_refinement": round(ratio, 2),
        "continuous": ratio > policy["minimum_refinement_ratio"],
        "criterion": f"ratio > {policy['minimum_refinement_ratio']} on configured refinement",
    }


def _resolved_chain_for_export(chain: dict) -> dict:
    return {
        "parameter_set_id": chain["parameter_set_id"],
        "order": chain["order"],
        "kT_pN_nm": round(chain["kT_pN_nm"], 6),
        "regions": {
            region_id: {
                key: value for key, value in chain["regions"][region_id].items()
                if key != "parameter_records"
            }
            for region_id in chain["order"]
        },
        "source_of_every_input": "data/mechanical_parameters.json plus sequence-derived contours in data/titin.json",
    }


def build_outputs(run_expensive_audits: bool = True) -> tuple[dict, dict, dict]:
    titin = load("titin.json")
    sarcomere = load("sarcomere.json")
    parameters = load("mechanical_parameters.json")
    states_record = load("structural_states.json")
    states = states_record["states"]
    chain = chain_parameters(titin, parameters)
    decimals = chain["solver"]["generated_extension_decimal_places"]
    order = chain["order"]
    per_state_work = {}

    for name, state in sorted(states.items(), key=lambda item: item[1]["sarcomere_length_nm"]):
        total = state["titin_I_band_total_nm"]
        previous = copy.deepcopy(state["titin_I_band_extension_nm"])
        force = solve_force(chain, total)
        prediction = {region_id: region_extension(chain, region_id, force)
                      for region_id in order}
        stored = {region_id: round(prediction[region_id], decimals)
                  for region_id in order[:-1]}
        stored[order[-1]] = round(total - sum(stored.values()), decimals)
        state["titin_I_band_extension_nm"] = {
            "prox_Ig": stored["prox_Ig"],
            "N2A": stored["N2A"],
            "post_N2A_unknown": 0.0,
            "PEVK": stored["PEVK"],
            "dist_Ig": stored["dist_Ig"],
        }
        zdisc = next(component for component in sarcomere["components"]
                     if component["id"] == "zdisc")
        cursor = zdisc["dimensions_nm"]["width_X"] / 2.0
        layout = {}
        for region_id, length_nm in state["titin_I_band_extension_nm"].items():
            layout[region_id] = {
                "X_start": round(cursor, decimals),
                "X_end": round(cursor + length_nm, decimals),
                "length_nm": length_nm,
            }
            cursor += length_nm
        state["titin_iband_layout_nm"] = layout
        provenance = state.get("titin_I_band_extension_provenance") or {}
        state_status = evaluation_status(parameters, state["sarcomere_length_nm"])
        force_disclosed = state_status != "not_evaluated"
        provenance.update({
            "route": "scripts/mechanical_model.py using data/mechanical_parameters.json; four development-model elastic regions in series; post_N2A_unknown is excluded from mechanics.",
            "force_evaluation_status": state_status,
            "common_force_pN": force if force_disclosed else None,
            "parameter_set_id": parameters["parameter_set_id"],
            "development_solver_scalar_disclosed": force_disclosed,
            "per_region_implied_force_spread": "1.000x in the internal development solve",
            "reproduce": "python3 scripts/mechanical_model.py",
            "model_basis": (
                "SD-04-approved Marko-Siggia WLC/eWLC mechanics driven by data/mechanical_parameters.json; central source-law evidence is 10.1073/pnas.95.14.8052, with all transfers and endpoint sources recorded in the parameter set and literature ruling; output authority is bounded by the recorded regime and sensitivity policy."
                if parameters["decision"]["status"] == "APPROVED" else
                "Development Marko-Siggia WLC/eWLC geometry driven by data/mechanical_parameters.json, with source-law evidence from 10.1073/pnas.95.14.8052 and the separately recorded N2A sources. SD-04 DEFERRED forbids target-force evaluation and public absolute-pN output."
            ),
            "unknown_interval_policy": "residues 9852-10215 have no approved contour or force law; zero axial projection is not zero physical length",
        })
        state["titin_I_band_extension_provenance"] = provenance
        chain_history = provenance.get("supersession_chain")
        if chain_history:
            chain_history[-1]["partition_nm"] = copy.deepcopy(
                state["titin_I_band_extension_nm"]
            )
            chain_history[-1]["defect"] = None
            chain_history[-1]["status"] = "current"
            chain_history[-1]["derivation"] = (
                "MODELED SD-04-authorized approximate passive force per titin"
                if parameters["decision"]["status"] == "APPROVED"
                else "MODELED development geometry; quantitative force not evaluated"
            )
        shares, incremental = compliance_shares(chain, force)
        deviations = {region_id: prediction[region_id] - previous[region_id]
                      for region_id in order}
        implied, unreachable, at_floor = {}, [], []
        for region_id in order:
            value = force_for_region(chain, region_id, previous[region_id])
            if value is None:
                unreachable.append(region_id)
            elif value == 0:
                at_floor.append(region_id)
            else:
                implied[region_id] = value
        spread = max(implied.values()) / min(implied.values()) if len(implied) > 1 else None
        per_state_work[name] = {
            "sarcomere_length_nm": state["sarcomere_length_nm"],
            "titin_I_band_total_nm": total,
            "development_force": force,
            "model_partition_nm": {region_id: round(prediction[region_id], 2)
                                   for region_id in order},
            "model_partition_exact_nm": prediction,
            "spec_partition_nm": previous,
            "deviation_nm": {region_id: round(deviations[region_id], 2)
                             for region_id in order},
            "worst_deviation_nm": round(max(abs(value) for value in deviations.values()), 2),
            "fraction_of_contour": {
                region_id: round(prediction[region_id]
                                 / chain["regions"][region_id]["Lc_nm"], 4)
                for region_id in order
            },
            "development_compliance_share": {
                region_id: round(shares[region_id], 4) for region_id in order
            },
            "development_incremental_compliance": incremental,
            "development_compliance_rank": sorted(order, key=lambda item: -shares[item]),
            "spec_implied_force_spread": round(spread, 1) if spread else None,
            "spec_values_unreachable_at_finite_force": unreachable,
            "spec_values_at_rigid_floor": at_floor,
        }

    states_bytes = json.dumps(states_record, indent=2).encode("utf-8")
    fingerprint = model_fingerprint({"data/structural_states.json": states_bytes})
    per_state = {}
    shortest = min(per_state_work.values(), key=lambda row: row["sarcomere_length_nm"])
    for name, row in per_state_work.items():
        evaluation = public_evaluation(
            parameters,
            fingerprint,
            row["sarcomere_length_nm"],
            row["titin_I_band_total_nm"],
            chain,
            row["model_partition_exact_nm"],
        )
        added = {
            region_id: round(
                row["model_partition_nm"][region_id]
                - shortest["model_partition_nm"][region_id], 2
            )
            for region_id in order
        }
        per_state[name] = {
            "sarcomere_length_nm": row["sarcomere_length_nm"],
            "titin_I_band_total_nm": row["titin_I_band_total_nm"],
            "evaluation": evaluation,
            "model_partition_nm": row["model_partition_nm"],
            "added_length_contribution_nm_from_shortest_state": added,
            "regional_incremental_compliance_nm_per_pN": {
                "status": evaluation["status"],
                "values": evaluation["incremental_compliance_nm_per_pN"],
                "reason": evaluation["reason"],
            },
            "parameter_sensitivity_range": {
                "status": evaluation["status"],
                "force_pN": (evaluation["sensitivity"]["force_pN"]
                             if evaluation["sensitivity"] else None),
                "regional_extension_nm": (evaluation["sensitivity"]["extension_nm"]
                                           if evaluation["sensitivity"] else None),
                "incremental_compliance_nm_per_pN": (
                    evaluation["sensitivity"]["incremental_compliance_nm_per_pN"]
                    if evaluation["sensitivity"] else None
                ),
                "interpretation": parameters["sensitivity_policy"]["reason"],
            },
            "development_geometry_audit": {
                "status": "internal_only",
                "force_pN": None,
                "compliance_rank": row["development_compliance_rank"],
                "common_force_spread": "1.000x",
                "spec_implied_force_spread": row["spec_implied_force_spread"],
                "spec_values_unreachable_at_finite_force": row[
                    "spec_values_unreachable_at_finite_force"
                ],
                "spec_values_at_rigid_floor": row["spec_values_at_rigid_floor"],
            },
        }

    names_by_sl = sorted(per_state_work,
                         key=lambda name: per_state_work[name]["sarcomere_length_nm"])
    proximal = [per_state_work[name]["development_compliance_share"]["prox_Ig"]
                for name in names_by_sl]
    pevk = [per_state_work[name]["development_compliance_share"]["PEVK"]
            for name in names_by_sl]
    report = {
        "schema": "titin-mechanical-model/2",
        "purpose": "Status-bearing mechanics output. Regional geometry is generated by a deterministic development solver; absolute target force is withheld unless SD-04 is approved.",
        "parameter_set_id": parameters["parameter_set_id"],
        "model_fingerprint": fingerprint,
        "decision": parameters["decision"],
        "evaluation_status": parameters["output_policy"]["evaluation_status"],
        "force_pN": None,
        "sensitivity": {
            "status": parameters["sensitivity_policy"]["status"],
            "label": parameters["sensitivity_policy"]["label"],
            "approved_scenarios": parameters["sensitivity_policy"]["approved_scenarios"],
            "force_pN": None,
            "regional_extension_nm": None,
            "incremental_compliance_nm_per_pN": None,
            "interpretation": parameters["sensitivity_policy"]["reason"],
        },
        "physics": {
            "topology": parameters["topology"]["statement"],
            "equations": parameters["equations"],
            "resolved_kT_pN_nm": round(chain["kT_pN_nm"], 6),
            "all_dimensional_inputs_from": "data/mechanical_parameters.json and data/titin.json",
        },
        "resolved_chain_parameters": _resolved_chain_for_export(chain),
        "source_validation": validate_against_source(parameters, chain),
        "continuity": continuity_probe(chain) if run_expensive_audits else {
            "continuous": None,
            "skipped": "parity diagnostic does not regenerate the committed continuity audit",
        },
        "regime_policy": parameters["regime_policy"],
        "isoform_scope": {
            "target": parameters["target_applicability"],
            "parameter_sources": "Rat psoas skeletal titin plus recombinant-human N2A evidence; exact preparation metadata is carried per parameter.",
            "consequence_for_absolute_force": parameters["output_policy"]["public_caveat"],
            "status": parameters["target_applicability"]["status"],
        },
        "per_state": per_state,
        "derived_recruitment": {
            "status": "development_geometry_audit",
            "states_by_sl": names_by_sl,
            "compliance_values_exported": parameters["decision"]["status"] == "APPROVED",
            "prox_Ig_monotonically_falls": all(a > b for a, b in zip(proximal, proximal[1:])),
            "PEVK_monotonically_rises": all(a < b for a, b in zip(pevk, pevk[1:])),
            "short_length_leader": per_state_work[names_by_sl[0]]["development_compliance_rank"][0],
            "long_length_leader": per_state_work[names_by_sl[-1]]["development_compliance_rank"][0],
        },
        "parity": {
            "command": "python3 scripts/mechanical_model.py --parity-json",
            "tolerance": parameters["solver"]["parity_tolerance"],
            "grid": parameters["solver"]["parity_grid"],
            "committed_golden_force_values": False,
        },
    }
    return report, states_record, {"chain": chain, "parameters": parameters,
                                   "per_state_work": per_state_work}


def parity_payload(context: dict) -> dict:
    chain = context["chain"]
    parameters = context["parameters"]
    grid = chain["solver"]["parity_grid"]
    sarcomere = load("sarcomere.json")
    z_width = next(component for component in sarcomere["components"]
                   if component["id"] == "zdisc")["dimensions_nm"]["width_X"]
    thick_length = next(component for component in sarcomere["components"]
                        if component["id"] == "thick_filament")["dimensions_nm"]["length_X"]
    fingerprint = model_fingerprint()
    lengths = {
        grid["sarcomere_length_min_nm"] + (
            grid["sarcomere_length_max_nm"] - grid["sarcomere_length_min_nm"]
        ) * index / (grid["sample_count"] - 1)
        for index in range(grid["sample_count"])
    }
    policy = parameters["regime_policy"]
    for boundary in [
            *(policy.get("approved_supported_range_nm") or []),
            policy.get("slack_or_buckling_boundary_nm"),
            policy.get("unfolding_materiality_boundary_nm")]:
        if isinstance(boundary, (int, float)) and math.isfinite(boundary):
            lengths.add(float(boundary))
    rows = []
    for sl in sorted(lengths):
        total = sl / 2.0 - thick_length / 2.0 - z_width / 2.0
        force = solve_force(chain, total)
        shares, incremental = compliance_shares(chain, force)
        extensions = {
            region_id: region_extension(chain, region_id, force)
            for region_id in chain["order"]
        }
        evaluation = public_evaluation(
            parameters, fingerprint, sl, total, chain, extensions,
        )
        rows.append({
            "sarcomere_length_nm": sl,
            "titin_I_band_total_nm": total,
            "evaluation_status": evaluation["status"],
            "force_pN": evaluation["force_pN"],
            "sensitivity": evaluation["sensitivity"],
            "precision": evaluation["precision"],
            "development_diagnostic": {
                "force_pN": force,
                "extension_nm": extensions,
                "compliance_share": shares,
                "incremental_compliance_nm_per_pN": incremental,
            },
        })
    return {
        "schema": "titin-mechanics-parity-diagnostic/1",
        "public_evaluation": parameters["output_policy"]["evaluation_status"],
        "parameter_set_id": parameters["parameter_set_id"],
        "tolerance": chain["solver"]["parity_tolerance"],
        "rows": rows,
    }


def write_or_check(check: bool) -> int:
    report, states, context = build_outputs()
    outputs = [
        (DATA_DIR / "mechanical_model.json", report),
        (DATA_DIR / "structural_states.json", states),
    ]
    if check:
        stale = []
        for path, payload in outputs:
            expected = json.dumps(payload, indent=2).encode("utf-8")
            if not path.exists() or path.read_bytes() != expected:
                stale.append(str(path.relative_to(ROOT)))
        if stale:
            print("Generated mechanical outputs are stale: " + ", ".join(stale))
            print("Run python3 scripts/mechanical_model.py")
            return 1
        print("Mechanical generator reproducibility: PASS (2/2 byte-identical outputs)")
    else:
        for path, payload in outputs:
            path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print("Wrote data/mechanical_model.json")
        print("Wrote data/structural_states.json")

    source_checks = report["source_validation"]
    if not all(row["pass"] for row in source_checks):
        print("Source reproduction failed", file=sys.stderr)
        return 1
    if not report["continuity"]["continuous"]:
        print("Continuity probe failed", file=sys.stderr)
        return 1
    for row in report["per_state"].values():
        evaluation = row["evaluation"]
        expected = evaluation_status(context["parameters"], row["sarcomere_length_nm"])
        if evaluation["status"] != expected:
            print("Generated evaluation status differs from the regime policy", file=sys.stderr)
            return 1
        if expected == "not_evaluated" and evaluation["force_pN"] is not None:
            print("Non-evaluated mechanics leaked a force value", file=sys.stderr)
            return 1
        if expected != "not_evaluated" and (
                not isinstance(evaluation["force_pN"], (int, float))
                or evaluation["sensitivity"] is None):
            print("Approved mechanics omitted force or sensitivity output", file=sys.stderr)
            return 1
    state_summary = (
        "every target evaluation not_evaluated"
        if context["parameters"]["decision"]["status"] != "APPROVED"
        else "approved regimes emitted status-bearing output"
    )
    print(
        f"SC-21 mechanics: {len(source_checks)}/{len(source_checks)} source checks; "
        f"continuous; {state_summary}"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="verify committed generated outputs without writing")
    parser.add_argument("--parity-json", action="store_true",
                        help="emit explicit engineering-only dense-grid diagnostics")
    args = parser.parse_args()
    if args.parity_json:
        _, _, context = build_outputs(run_expensive_audits=False)
        print(json.dumps(parity_payload(context), separators=(",", ":")))
        return 0
    return write_or_check(args.check)


if __name__ == "__main__":
    raise SystemExit(main())
