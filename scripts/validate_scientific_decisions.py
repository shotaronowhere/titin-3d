#!/usr/bin/env python3
"""Validate immutable packet digests and SD-01–SD-05 ruling semantics."""

from __future__ import annotations

import argparse
import math
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


def complete_reviewer(reviewer: object, required_role: str) -> bool:
    return isinstance(reviewer, dict) \
        and all(str(reviewer.get(field, "")).strip()
                for field in ("name", "affiliation", "role")) \
        and reviewer.get("role") == required_role


def honest_adjudicator(adjudicator: object, *, human_allowed: bool) -> bool:
    if adjudicator is None and human_allowed:
        return True
    if not isinstance(adjudicator, dict):
        return False
    if adjudicator.get("type") == "AI_SYSTEM":
        return adjudicator.get("authority_basis") == "project_owner_authorization" \
            and adjudicator.get("human_expert") is False
    return human_allowed and adjudicator.get("human_expert") is True \
        and bool(str(adjudicator.get("name", "")).strip())


def finite_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) \
        and math.isfinite(value)


def validate_approved_sd04_ruling(ruling: object) -> list[str]:
    if not isinstance(ruling, dict):
        return ["SD-04 APPROVED ruling is not a structured specialist ruling"]
    problems: list[str] = []
    for field in ("parameter_set_id", "target_accession", "implementation_record"):
        if not str(ruling.get(field, "")).strip():
            problems.append(f"SD-04 APPROVED ruling lacks {field}")
    supported = ruling.get("approved_supported_range_nm")
    valid_supported = isinstance(supported, list) and len(supported) == 2 \
        and all(finite_number(value) for value in supported) \
        and supported[0] < supported[1]
    if not valid_supported:
        problems.append("SD-04 APPROVED ruling lacks an ordered supported range")
    slack = ruling.get("slack_or_buckling_boundary_nm")
    if not finite_number(slack) or valid_supported and slack > supported[0]:
        problems.append("SD-04 APPROVED ruling has no valid slack or buckling boundary")
    unfolding = ruling.get("unfolding_materiality_boundary_nm")
    if not finite_number(unfolding) or valid_supported and unfolding <= supported[1]:
        problems.append("SD-04 APPROVED ruling has no valid unfolding-materiality boundary")
    scenarios = ruling.get("approved_sensitivity_scenario_ids")
    if not isinstance(scenarios, list) or not scenarios \
            or any(not str(value).strip() for value in scenarios) \
            or len(set(scenarios)) != len(scenarios):
        problems.append("SD-04 APPROVED ruling lacks unique sensitivity scenario IDs")
    if ruling.get("public_force_output") != "AUTHORIZED_BY_REGIME":
        problems.append("SD-04 APPROVED ruling does not authorize regime-bound output")
    return problems


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--decisions", type=Path, default=ROOT / "data/scientific_decisions.json")
    parser.add_argument("--claims", type=Path, default=ROOT / "data/claim_support.json")
    return parser.parse_args()


def validate(record: dict, claim_support: dict) -> list[str]:
    problems: list[str] = []
    if record.get("schema") != "titin-scientific-decisions/2":
        problems.append("wrong scientific-decisions schema")
    decisions = record.get("decisions") or {}
    if set(decisions) != DECISION_IDS:
        problems.append("decision record must contain exactly SD-01 through SD-05")
    policy = record.get("review_policy") or {}
    if policy.get("kind") != "owner_authorized_citation_backed_ai_adjudication" \
            or policy.get("human_expert_review_claimed") is not False \
            or policy.get("separate_human_release_review_required") is not True:
        problems.append("SC-20 owner-authorized AI adjudication policy is absent or overclaims human review")
    if record.get("sprint_status") != "DECISIONS_CONSUMABLE_SC20" or record.get("blocker") is not None:
        problems.append("SC-20 rulings must be consumable with no decision blocker")
    authority_path = policy.get("authority_record")
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
        if authority_path not in {packet.get("path") for packet in row.get("evidence_packet") or []}:
            problems.append(f"{prefix} is not byte-bound to the owner authority record")
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
            for field in ("reviewer", "adjudicator", "reviewed_on", "reviewed_model_fingerprint",
                          "reviewed_payload_sha256", "ruling", "public_caveat"):
                if row.get(field) is not None:
                    problems.append(f"{prefix} invents {field} while PENDING")
        else:
            reviewer = row.get("reviewer")
            adjudicator = row.get("adjudicator") or {}
            if reviewer is None:
                if not honest_adjudicator(adjudicator, human_allowed=False) \
                        or row.get("independent_human_review_status") != "NOT_PERFORMED":
                    problems.append(f"{prefix} AI adjudication provenance is absent or falsely claims human review")
            else:
                if status != "APPROVED" \
                        or not complete_reviewer(reviewer, row.get("required_reviewer_role", "")) \
                        or row.get("independent_human_review_status") \
                        not in {"COMPLETE", "COMPLETED", "PERFORMED", "VERIFIED"} \
                        or not honest_adjudicator(row.get("adjudicator"), human_allowed=True):
                    problems.append(f"{prefix} specialist-review provenance is incomplete or inconsistent")
            if not row.get("reviewed_on") or not re.fullmatch(
                r"[0-9a-f]{64}", str(row.get("reviewed_model_fingerprint", ""))
            ) or not row.get("ruling"):
                problems.append(f"{prefix} lacks date, reviewed model fingerprint, or ruling")
            if row.get("reviewed_payload_sha256") != decision_payload_sha256(row):
                problems.append(f"{prefix} reviewed decision payload digest is stale/self-referential")
            if status == "DEFERRED" and not row.get("public_caveat"):
                problems.append(f"{prefix} DEFERRED ruling lacks an exact public caveat")
            if decision_id == "SD-04" and status == "APPROVED":
                problems.extend(validate_approved_sd04_ruling(row.get("ruling")))
            if decision_id == "SD-01" and status == "DEFERRED":
                problems.append("SD-01 has no DEFERRED implementation path")
        verification = row.get("implementation_verification") or {}
        if verification.get("status") not in {"PENDING", "VERIFIED"}:
            problems.append(f"{prefix} has an invalid implementation-verification status")
        if verification.get("status") == "VERIFIED":
            verification_reviewer = verification.get("reviewer")
            if verification_reviewer is None:
                verification_authority_ok = row.get("reviewer") is None \
                    and honest_adjudicator(
                        verification.get("adjudicator"), human_allowed=False,
                    )
            else:
                verification_authority_ok = complete_reviewer(
                    verification_reviewer, row.get("required_reviewer_role", ""),
                ) and (row.get("reviewer") is None
                       or verification_reviewer.get("name") == row["reviewer"].get("name")) \
                    and honest_adjudicator(
                        verification.get("adjudicator"), human_allowed=True,
                    )
            if not verification_authority_ok or not verification.get("reviewed_on"):
                problems.append(f"{prefix} implementation verification lacks honest adjudicator/date")
            if not re.fullmatch(
                r"[0-9a-f]{64}", str(verification.get("implemented_model_fingerprint", ""))
            ) or not verification.get("implementation_evidence"):
                problems.append(f"{prefix} implementation verification is not bound to model/evidence")
            for evidence in verification.get("implementation_evidence") or []:
                if not isinstance(evidence, dict):
                    problems.append(f"{prefix} implementation evidence uses legacy path-only form")
                    continue
                relative = str(evidence.get("path", ""))
                evidence_path = (ROOT / relative).resolve()
                digest = str(evidence.get("sha256", ""))
                if ROOT not in evidence_path.parents or not evidence_path.is_file():
                    problems.append(
                        f"{prefix} implementation evidence is missing/outside repository: {relative}"
                    )
                elif not re.fullmatch(r"[0-9a-f]{64}", digest) \
                        or sha256_file(evidence_path) != digest:
                    problems.append(f"{prefix} implementation-evidence byte digest is stale: {relative}")
                if not evidence.get("kind"):
                    problems.append(f"{prefix} implementation evidence lacks a kind: {relative}")
        else:
            if any(verification.get(field) is not None for field in
                   ("reviewer", "adjudicator", "reviewed_on", "implemented_model_fingerprint")) \
                    or verification.get("implementation_evidence"):
                problems.append(f"{prefix} invents implementation verification while PENDING")
    return problems


def main() -> None:
    args = parse_args()
    problems = validate(load_json(args.decisions), load_json(args.claims))
    if problems:
        print("SC-20 scientific-decision validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    statuses = {key: row["status"] for key, row in load_json(args.decisions)["decisions"].items()}
    independent = any(
        row.get("reviewer") is not None
        for row in load_json(args.decisions)["decisions"].values()
    )
    suffix = "qualified independent review recorded" if independent \
        else "no independent human review claimed"
    print(f"SC-20 scientific decisions: PASS ({statuses}; {suffix})")


if __name__ == "__main__":
    main()
