#!/usr/bin/env python3
"""Validate SC-19 sequence/mechanics/context scope and public bindings."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from scientific_common import ROOT, load_json, walk_strings


FORBIDDEN = re.compile(
    r"(?:human\s+)?(?:canonical\s+)?skeletal\s+N2A(?:-containing)?\s+(?:titin|isoform|model|reference|render)"
    r"|scope\s+is\s+skeletal|skeletal\s+scope|(?:retained\s+)?skeletal\s+reference(?:\s+model)?"
    r"|retained\s+skeletal\s+model|human\s+skeletal\s+(?:reference|model|coordinates|geometry|icon|d10)",
    re.I,
)


def resolve_pointer(value, pointer: str):
    node = value
    for token in pointer.split("/")[1:]:
        token = token.replace("~1", "/").replace("~0", "~")
        node = node[int(token)] if isinstance(node, list) else node[token]
    return node


def ledger_refs(value, pointer=""):
    if isinstance(value, dict):
        for key, child in value.items():
            escaped = key.replace("~", "~0").replace("/", "~1")
            path = f"{pointer}/{escaped}"
            if key in {"scientific_scope_ref", "label_ref"} \
                    and isinstance(child, str) and child.startswith("scientific_scope.json"):
                yield path, child
            yield from ledger_refs(child, path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from ledger_refs(child, f"{pointer}/{index}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scope", type=Path, default=ROOT / "data/scientific_scope.json")
    parser.add_argument("--presentation", type=Path, default=ROOT / "data/presentation.json")
    parser.add_argument("--sarcomere", type=Path, default=ROOT / "data/sarcomere.json")
    parser.add_argument("--claims", type=Path, default=ROOT / "data/showcase_claims.json")
    parser.add_argument("--template", type=Path, default=ROOT / "src/index.template.html")
    parser.add_argument("--scan-data", type=Path, default=ROOT / "data")
    return parser.parse_args()


def validate(scope: dict, presentation: dict, sarcomere: dict, claims: dict,
             template: str, scan_data: Path) -> list[str]:
    problems: list[str] = []
    if scope.get("schema") != "titin-scientific-scope/1":
        problems.append("wrong scientific-scope schema")
    if scope.get("status") != "CODE_COMPLETE_BLOCKED_SCIENCE":
        problems.append("scope must expose the unresolved science status")
    sequence = scope.get("sequence") or {}
    expected_sequence = {
        "species": "Homo sapiens", "gene": "TTN", "accession": "Q8WZ42",
        "isoform_id": "Q8WZ42-1", "coordinate_frame": "canonical",
    }
    for field, value in expected_sequence.items():
        if sequence.get(field) != value:
            problems.append(f"sequence.{field} must be {value}")
    if sequence.get("tissue_or_muscle_claim") is not None:
        problems.append("Q8WZ42-1 may not acquire an unreviewed tissue claim")
    if sequence.get("review_status") != "PENDING":
        problems.append("sequence construct review must remain visibly PENDING")
    if "Q8WZ42-1" not in str(scope.get("public_badge")) or "pending" not in str(scope.get("public_badge", "")).lower():
        problems.append("public badge must name Q8WZ42-1 and the pending review")
    mechanics = scope.get("mechanics") or {}
    if "rat psoas" not in str(mechanics.get("display_label", "")).lower():
        problems.append("mechanics display label must expose the rat-psoas transfer")
    if mechanics.get("review_status") != "PENDING" or not mechanics.get("transfers"):
        problems.append("mechanics transfer/review status is incomplete")
    if not scope.get("structural_context", {}).get("transfers"):
        problems.append("structural-context transfers are not enumerated")
    if not scope.get("render"):
        problems.append("scope render policy is missing")
    if "representation" in scope:
        problems.append("legacy representation section must be migrated to render")
    if not scope.get("excluded_claims"):
        problems.append("scope excluded-claim section is missing")
    if "not_claimed" in scope:
        problems.append("legacy not_claimed section must be migrated to excluded_claims")

    ps = presentation.get("scope") or {}
    for removed in ("species", "accession", "isoform", "muscle_type"):
        if removed in ps:
            problems.append(f"presentation.scope.{removed} duplicates the scope ledger")
    if ps.get("scientific_scope_ref") != "scientific_scope.json":
        problems.append("presentation scope is not bound to scientific_scope.json")
    badges = presentation.get("scope_badges") or []
    if len(badges) != 1 or badges[0].get("label_ref") != "scientific_scope.json#/public_badge" or "label" in badges[0]:
        problems.append("public badge has a literal/fallback label instead of label_ref")
    if sarcomere.get("meta", {}).get("scientific_scope_ref") != "scientific_scope.json#/structural_context":
        problems.append("sarcomere context is not bound to the scope ledger")
    if claims.get("scope_lock", {}).get("scientific_scope_ref") != "scientific_scope.json":
        problems.append("showcase scope lock is not bound to the scope ledger")
    if "model.scientificScope.publicBadge" not in template or "id=\"mechanicsScope\"" not in template:
        problems.append("template does not render scope/mechanics from the normalized ledger")
    if "Human skeletal N2A titin" in template:
        problems.append("template retains the old static scope fallback")
    if "model.scientificDecisions.badgeText" not in template:
        problems.append("template does not visibly expose all normalized scientific decisions")

    listed = {row.get("path"): row.get("value") for row in scope.get("identity_bindings") or []}
    discovered = {}
    for name in ("annotations.json", "presentation.json", "sarcomere.json",
                 "showcase_claims.json", "titin.json"):
        value = load_json(scan_data / name)
        for pointer, ref in ledger_refs(value):
            discovered[f"data/{name}#{pointer}"] = ref
    discovered["src/index.template.html#id=scopeIdentity"] = "runtime:scopeLedger(spec).publicBadge"
    for path, expected in discovered.items():
        if listed.get(path) != expected:
            problems.append(f"identity binding {path} is absent or stale")
    for path, expected in listed.items():
        if path not in discovered:
            problems.append(f"identity binding {path} is not an enumerated public identity source")
        elif expected != discovered[path]:
            problems.append(f"identity binding {path} differs from its resolved ledger reference")

    for path in sorted(scan_data.glob("*.json")):
        if path.name == "scientific_scope.json":
            continue
        value = load_json(path)
        for pointer, text in walk_strings(value):
            if FORBIDDEN.search(text):
                problems.append(f"old skeletal identity survives at {path.name}#{pointer}")
    for index, text in enumerate(template.splitlines(), 1):
        if FORBIDDEN.search(text):
            problems.append(f"old skeletal identity survives in template line {index}")
    return problems


def main() -> None:
    args = parse_args()
    problems = validate(
        load_json(args.scope), load_json(args.presentation), load_json(args.sarcomere),
        load_json(args.claims), args.template.read_text(encoding="utf-8"), args.scan_data,
    )
    if problems:
        print("SC-19 scientific scope validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    print("SC-19 scientific scope: PASS (reference sequence, transfers, and pending status are explicit)")


if __name__ == "__main__":
    main()
