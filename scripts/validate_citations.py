#!/usr/bin/env python3
"""Prove offline identifier-registry closure; never claim semantic entailment."""

from __future__ import annotations

import argparse
from pathlib import Path

from scientific_common import ROOT, identifiers_in, load_json


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data")
    parser.add_argument("--references", type=Path, default=ROOT / "data/references.json")
    return parser.parse_args()


def validate(data_dir: Path, references: dict) -> tuple[list[str], set[str]]:
    problems: list[str] = []
    identifiers: set[str] = set()
    for path in sorted(data_dir.glob("*.json")):
        if path.resolve() == (data_dir / "references.json").resolve():
            continue
        identifiers.update(identifiers_in(load_json(path)))
    required = ("identifier", "authors", "year", "title", "journal")
    for identifier in sorted(identifiers):
        row = references.get(identifier)
        if not isinstance(row, dict):
            problems.append(f"unregistered identifier: {identifier}")
            continue
        missing = [field for field in required if row.get(field) in (None, "")]
        if missing:
            problems.append(f"{identifier} lacks canonical metadata: {missing}")
        if row.get("identifier") != identifier:
            problems.append(f"{identifier} registry key/identifier differ")
        if not isinstance(row.get("year"), int):
            problems.append(f"{identifier} year is not numeric")
        if identifier.startswith("10.") and row.get("doi", "").lower() != identifier.lower():
            problems.append(f"{identifier} DOI metadata differs from its key")
    return problems, identifiers


def main() -> None:
    args = parse_args()
    problems, identifiers = validate(args.data_dir, load_json(args.references))
    if problems:
        print("SC-19 offline citation closure failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    print(
        f"SC-19 citation registry closure: PASS ({len(identifiers)} identifiers; "
        "semantic entailment is NOT asserted)"
    )


if __name__ == "__main__":
    main()
