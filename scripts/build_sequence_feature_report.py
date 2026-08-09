#!/usr/bin/env python3
"""Build/check the deterministic SC-19 region-to-feature reconciliation report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from scientific_common import ROOT, load_json, sha256_payload


DEFAULT_FEATURES = ROOT / "data" / "titin_sequence_features.json"
DEFAULT_TITIN = ROOT / "data" / "titin.json"
DEFAULT_OUTPUT = ROOT / "docs" / "scientific-decisions" / "SC-19" / "region-feature-report.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=DEFAULT_FEATURES)
    parser.add_argument("--titin", type=Path, default=DEFAULT_TITIN)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    return parser.parse_args()


def feature_class(feature: dict[str, Any]) -> str:
    label = feature.get("label", "")
    if label.startswith("Ig-like"):
        return "Ig_like"
    if label.startswith("Fibronectin type-III"):
        return "Fn3"
    if label == "Protein kinase":
        return "kinase"
    return "other"


def build_report(sequence: dict[str, Any], titin: dict[str, Any]) -> dict[str, Any]:
    regions = titin.get("regions") or []
    features = sequence.get("features") or []
    rows = []
    assignments: dict[str, list[str]] = {}
    for feature in features:
        contained = []
        overlapping = []
        for region in regions:
            span = region["residue_span"]
            if span["start"] <= feature["start"] and feature["end"] <= span["end"]:
                contained.append(region["id"])
            if not (feature["end"] < span["start"] or feature["start"] > span["end"]):
                overlapping.append(region["id"])
        assignments[feature["id"]] = contained
        if len(contained) != 1 or len(overlapping) != 1:
            rows.append({
                "feature_id": feature["id"],
                "start": feature["start"],
                "end": feature["end"],
                "contained_in": contained,
                "overlaps": overlapping,
            })

    region_rows = []
    for region in regions:
        region_features = [
            feature for feature in features if assignments.get(feature["id"]) == [region["id"]]
        ]
        observed = {"Ig_like": 0, "Fn3": 0, "kinase": 0, "other": 0}
        for feature in region_features:
            observed[feature_class(feature)] += 1
        declared = {
            "Ig_like": region.get("domain_composition", {}).get("Ig_like", 0),
            "Fn3": region.get("domain_composition", {}).get("Fn3", 0),
            "kinase": 1 if region["id"] == "kinase" else 0,
        }
        discrepancy = {
            key: observed[key] - declared[key]
            for key in ("Ig_like", "Fn3", "kinase")
            if observed[key] != declared[key]
        }
        span = region["residue_span"]
        region_rows.append({
            "region_id": region["id"],
            "coordinate_frame": titin["meta"]["coordinate_frame"],
            "residue_span": {
                "start": span["start"], "end": span["end"], "length_aa": span["length_aa"],
            },
            "contained_feature_ids": [feature["id"] for feature in region_features],
            "overlapping_feature_ids": [
                feature["id"] for feature in features
                if not (feature["end"] < span["start"] or feature["start"] > span["end"])
            ],
            "declared_domain_counts": declared,
            "contained_domain_counts": observed,
            "declared_minus_contained": {key: -value for key, value in discrepancy.items()},
            "residues_per_declared_domain": (
                round(span["length_aa"] / max(1, declared["Ig_like"] + declared["Fn3"] + declared["kinase"]), 3)
            ),
            "density_signal_only": True,
        })

    result = {
        "schema": "titin-region-feature-report/1",
        "coordinate_frame": sequence["source"]["coordinate_frame"],
        "sequence_source_sha256": sequence["source"]["upstream_sha256"],
        "sequence_version": sequence["source"]["sequence_version"],
        "titin_region_boundaries_sha256": sha256_payload([
            {"id": region["id"], "residue_span": region["residue_span"]} for region in regions
        ]),
        "regions": region_rows,
        "unassigned_features": [
            feature["id"] for feature in features if not assignments.get(feature["id"])
        ],
        "multiply_assigned_features": [
            feature_id for feature_id, assigned in assignments.items() if len(assigned) > 1
        ],
        "boundary_problems": rows,
        "known_pending_discrepancies": [
            {
                "decision_id": "SD-01",
                "region_id": row["region_id"],
                "declared_domain_counts": row["declared_domain_counts"],
                "contained_domain_counts": row["contained_domain_counts"],
            }
            for row in region_rows if row["declared_minus_contained"]
        ],
        "interpretation": (
            "Feature containment is deterministic; count discrepancies are observations for SD-01, "
            "not an engineer-selected correction. Residues-per-domain is report-only."
        ),
    }
    result["report_sha256"] = sha256_payload(result)
    return result


def main() -> None:
    args = parse_args()
    result = build_report(load_json(args.features), load_json(args.titin))
    text = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if not args.output.is_file() or args.output.read_text(encoding="utf-8") != text:
            raise SystemExit(f"region-feature report is stale: run {Path(__file__).name}")
        print(f"region-feature report is current ({len(result['regions'])} regions)")
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8")
    print(f"wrote {args.output} ({len(result['regions'])} regions)")


if __name__ == "__main__":
    main()
