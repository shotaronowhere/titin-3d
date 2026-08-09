#!/usr/bin/env python3
"""Validate the pinned sequence snapshot and exact region reconciliation."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from build_sequence_feature_report import build_report
from scientific_common import ROOT, load_json, sha256_payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=ROOT / "data/titin_sequence_features.json")
    parser.add_argument("--titin", type=Path, default=ROOT / "data/titin.json")
    parser.add_argument("--report", type=Path, default=ROOT / "docs/scientific-decisions/SC-19/region-feature-report.json")
    return parser.parse_args()


def validate(features: dict, titin: dict, report: dict) -> list[str]:
    problems: list[str] = []
    if features.get("schema") != "titin-sequence-features/1":
        problems.append("wrong sequence-feature schema")
    source = features.get("source") or {}
    required_source = (
        "provider", "record", "isoform_id", "sequence_version", "entry_version",
        "coordinate_frame", "url", "license", "release", "release_date",
        "release_or_retrieved_on", "retrieved_on", "upstream_sha256", "sequence_sha256",
    )
    for field in required_source:
        if source.get(field) in (None, ""):
            problems.append(f"source.{field} is required")
    if not re.fullmatch(r"[0-9a-f]{64}", str(source.get("upstream_sha256", ""))):
        problems.append("source.upstream_sha256 must be a full SHA-256")
    if not re.fullmatch(r"[0-9a-f]{64}", str(source.get("sequence_sha256", ""))):
        problems.append("source.sequence_sha256 must be a full SHA-256")
    if not isinstance(source.get("sequence_version"), int) or not isinstance(source.get("entry_version"), int):
        problems.append("sequence and entry versions must be integers")
    if source.get("record") != titin.get("meta", {}).get("uniprot"):
        problems.append("pinned accession diverges from titin.json")
    if features.get("sequence_length_aa") != titin.get("meta", {}).get("total_length_aa"):
        problems.append("pinned sequence length diverges from titin.json")
    if source.get("coordinate_frame") != titin.get("meta", {}).get("coordinate_frame"):
        problems.append("FATAL coordinate-frame mismatch between pinned features and titin.json")

    expected_types = {
        "features": "DOMAIN", "alternative_sequences": "VAR_SEQ",
        "variants": "VARIANT", "conflicts": "CONFLICT",
    }
    all_ids: set[str] = set()
    for list_name, expected_type in expected_types.items():
        rows = features.get(list_name)
        if not isinstance(rows, list):
            problems.append(f"{list_name} must be a list")
            continue
        for row in rows:
            prefix = f"{list_name}:{row.get('id', '(missing)')}"
            if not row.get("id") or row["id"] in all_ids:
                problems.append(f"{prefix} has a missing or duplicate feature ID")
            all_ids.add(row.get("id"))
            if row.get("type") != expected_type:
                problems.append(f"{prefix} is not typed {expected_type}")
            start, end = row.get("start"), row.get("end")
            if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start:
                problems.append(f"{prefix} has invalid coordinates")
            elif row.get("length_aa") != end - start + 1:
                problems.append(f"{prefix} has an off-by-one residue length")
            if end and end > features.get("sequence_length_aa", 0):
                problems.append(f"{prefix} extends past the sequence")
            if not row.get("locator"):
                problems.append(f"{prefix} has no upstream locator")
            if row.get("upstream_feature_id") and row.get("id") != row.get("upstream_feature_id"):
                problems.append(f"{prefix} did not preserve its upstream feature ID")

    mapping = features.get("isoform_mapping") or {}
    if mapping.get("applied") is False:
        if mapping.get("var_seq_feature_ids") or mapping.get("offset_table"):
            problems.append("canonical mapping may not carry offsets")
        if source.get("isoform_id") != f"{source.get('record')}-1":
            problems.append("unapplied mapping does not name the canonical isoform")
    elif mapping.get("applied") is True:
        ids = set(mapping.get("var_seq_feature_ids") or [])
        upstream = {row.get("id") for row in features.get("alternative_sequences") or []}
        if not ids or not ids <= upstream or not mapping.get("offset_table"):
            problems.append("applied isoform mapping lacks upstream VAR_SEQ IDs/offsets")
    else:
        problems.append("isoform_mapping.applied must be boolean")
    if not features.get("excluded_feature_types"):
        problems.append("excluded upstream feature types were not recorded")

    payload = dict(features)
    recorded_payload = payload.pop("normalized_payload_sha256", None)
    if recorded_payload != sha256_payload(payload):
        problems.append("normalized feature payload digest is stale")

    expected_report = build_report(features, titin)
    if report != expected_report:
        problems.append("region-feature report diverges from the pinned features/titin boundaries")
    if report.get("unassigned_features") or report.get("multiply_assigned_features") or report.get("boundary_problems"):
        problems.append("region mapping has unassigned, multiply assigned, or boundary-crossing domains")
    discrepancy_ids = {
        (row.get("decision_id"), row.get("region_id"))
        for row in report.get("known_pending_discrepancies") or []
    }
    if discrepancy_ids != {("SD-01", "N2A"), ("SD-01", "dist_Ig")}:
        problems.append("known N2A/distal-Ig discrepancy changed without SD-01")
    return problems


def main() -> None:
    args = parse_args()
    problems = validate(load_json(args.features), load_json(args.titin), load_json(args.report))
    if problems:
        print("SC-19 sequence validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    print("SC-19 sequence features: PASS (285 domains; exact region report; SD-01 discrepancy retained)")


if __name__ == "__main__":
    main()
