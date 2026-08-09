#!/usr/bin/env python3
"""Validate immutable packet digests and SD-01–SD-05 ruling semantics."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from scientific_common import ROOT, decision_payload_sha256, load_json, sha256_file


DECISION_IDS = {"SD-01", "SD-02", "SD-03", "SD-04", "SD-05"}
STATUSES = {"PENDING", "APPROVED", "DEFERRED"}
PACKET_REQUIREMENTS = {
    "SD-01": ("Pinned feature snapshot", "zero/one/16", "Alternative definitions", "PDB 7NIP"),
    "SD-02": ("internal conflict", "4 nm/domain", "head-free", "PDB 1TKI", "Table 1"),
    "SD-03": ("Side-by-side source observations", "Species/preparation", "Exact locator", "Similar magnitudes do not establish identity"),
    "SD-04": ("engineering sensitivity probe", "Slack/buckling/contact", "unfolding transitions", "1900 nm", "3000 nm"),
    "SD-05": ("stoichiometry source inventory", "2:1 complex", "No approved source", "Current render meanings", "not-claimed"),
}
PACKET_PLACEHOLDER = re.compile(
    r"Requires reviewer binding|Figure/table must be supplied|reviewer must confirm|bind .* to exact source",
    re.I,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--decisions", type=Path, default=ROOT / "data/scientific_decisions.json")
    parser.add_argument("--claims", type=Path, default=ROOT / "data/claim_support.json")
    return parser.parse_args()


def validate(record: dict, claim_support: dict) -> list[str]:
    problems: list[str] = []
    if record.get("schema") != "titin-scientific-decisions/1":
        problems.append("wrong scientific-decisions schema")
    decisions = record.get("decisions") or {}
    if set(decisions) != DECISION_IDS:
        problems.append("decision record must contain exactly SD-01 through SD-05")
    if any(row.get("status") == "PENDING" for row in decisions.values()):
        if record.get("sprint_status") != "CODE_COMPLETE_BLOCKED_SCIENCE" or not record.get("blocker"):
            problems.append("pending decisions require CODE_COMPLETE_BLOCKED_SCIENCE and an explicit blocker")
    claim_ids = {row.get("id") for row in claim_support.get("claims") or []}
    for decision_id, row in decisions.items():
        prefix = decision_id
        status = row.get("status")
        if status not in STATUSES:
            problems.append(f"{prefix} has an invalid status")
        if not row.get("required_reviewer_role"):
            problems.append(f"{prefix} lacks its required reviewer role")
        if not row.get("question") or not row.get("evidence_packet"):
            problems.append(f"{prefix} lacks its question/evidence packet")
        for packet in row.get("evidence_packet") or []:
            path = (ROOT / str(packet.get("path", ""))).resolve()
            if ROOT not in path.parents or not path.is_file():
                problems.append(f"{prefix} packet path is missing/outside repository")
            elif not re.fullmatch(r"[0-9a-f]{64}", str(packet.get("sha256", ""))) \
                    or sha256_file(path) != packet.get("sha256"):
                problems.append(f"{prefix} evidence-packet byte digest is stale")
        primary_packet = ROOT / f"docs/scientific-decisions/SC-19/{decision_id}.md"
        if primary_packet.is_file():
            text = primary_packet.read_text(encoding="utf-8")
            if f"Packet schema: `titin-scientific-review-packet/1`" not in text \
                    or f"Decision: `{decision_id}`" not in text:
                problems.append(f"{prefix} packet lacks its schema/decision binding")
            for token in PACKET_REQUIREMENTS[decision_id]:
                if token.lower() not in text.lower():
                    problems.append(f"{prefix} packet lacks reviewer-ready content: {token}")
            if PACKET_PLACEHOLDER.search(text):
                problems.append(f"{prefix} packet retains an engineer-to-reviewer evidence placeholder")
        unresolved = set(row.get("downstream_claim_ids") or []) - claim_ids
        if unresolved:
            problems.append(f"{prefix} has unresolved downstream claims: {sorted(unresolved)}")
        if status == "PENDING":
            for field in ("reviewer", "reviewed_on", "reviewed_model_fingerprint",
                          "reviewed_payload_sha256", "ruling", "public_caveat"):
                if row.get(field) is not None:
                    problems.append(f"{prefix} invents {field} while PENDING")
        else:
            reviewer = row.get("reviewer") or {}
            if not reviewer.get("name") or not reviewer.get("affiliation") \
                    or reviewer.get("publication_consent") is not True:
                problems.append(f"{prefix} lacks a publishable named reviewer")
            if not row.get("reviewed_on") or not re.fullmatch(
                r"[0-9a-f]{64}", str(row.get("reviewed_model_fingerprint", ""))
            ) or not row.get("ruling"):
                problems.append(f"{prefix} lacks date, reviewed model fingerprint, or ruling")
            if row.get("reviewed_payload_sha256") != decision_payload_sha256(row):
                problems.append(f"{prefix} reviewed decision payload digest is stale/self-referential")
            if status == "DEFERRED" and not row.get("public_caveat"):
                problems.append(f"{prefix} DEFERRED ruling lacks an exact public caveat")
            if decision_id == "SD-01" and status == "DEFERRED":
                problems.append("SD-01 has no DEFERRED implementation path")
        verification = row.get("implementation_verification") or {}
        if verification.get("status") not in {"PENDING", "VERIFIED"}:
            problems.append(f"{prefix} has an invalid implementation-verification status")
        if verification.get("status") == "VERIFIED":
            reviewer = verification.get("reviewer") or {}
            if not reviewer.get("name") or not verification.get("reviewed_on"):
                problems.append(f"{prefix} implementation verification lacks reviewer/date")
            if not verification.get("implemented_model_fingerprint") \
                    and not verification.get("implementation_evidence"):
                problems.append(f"{prefix} implementation verification is not bound to model/evidence")
        else:
            if any(verification.get(field) is not None for field in
                   ("reviewer", "reviewed_on", "implemented_model_fingerprint")) \
                    or verification.get("implementation_evidence"):
                problems.append(f"{prefix} invents implementation verification while PENDING")
    return problems


def main() -> None:
    args = parse_args()
    problems = validate(load_json(args.decisions), load_json(args.claims))
    if problems:
        print("SC-19 scientific-decision validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    statuses = {key: row["status"] for key, row in load_json(args.decisions)["decisions"].items()}
    print(f"SC-19 scientific decisions: PASS ({statuses}; dependent science remains blocked)")


if __name__ == "__main__":
    main()
