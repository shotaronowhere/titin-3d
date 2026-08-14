#!/usr/bin/env python3
"""Validate SC-19 claim/source bindings and explicit approval provenance."""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path

from scientific_common import (
    EVIDENCE_CLASSES, ROOT, claim_payload_sha256, load_json,
)


RELATIONSHIPS = {"direct", "corroborating", "transfer", "context"}
REVIEW_STATUSES = {"PENDING", "APPROVED", "DEFERRED"}
OWNER_APPROVABLE_CLAIMS = {"sarcomere_definition", "actomyosin_motor_function"}
UNITS = {"aa", "nm", "pN", "K", "degree", "dimensionless", "%"}
PLACEHOLDER_LOCATOR = re.compile(
    r"reviewer must|requires reviewer|must be supplied|see extraction note|source-specific context",
    re.I,
)
SOURCE_SUBJECT_REQUIREMENTS = {
    "10.1152/ajpheart.2000.279.5.h2568": ("Rattus norvegicus", "myocardium", "isolated cardiac"),
    "10.3389/fphys.2020.00173": ("Homo sapiens", "", "recombinant human N2A"),
    "10.1073/pnas.95.14.8052": ("Rattus norvegicus", "psoas skeletal muscle", "isolated myofibril"),
    "10.1016/j.yjmcc.2019.05.026": ("Mus musculus", "cardiac papillary muscle", "papillary muscle"),
    "10.1083/jcb.134.6.1441": ("Rattus norvegicus and Bos taurus", "rat psoas and bovine sternomandibularis", "immunoelectron"),
}


def is_iso_date(value: object) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def resolve_pointer(value, pointer: str):
    if not pointer.startswith("/") and pointer != "":
        raise ValueError("JSON pointer must start with /")
    node = value
    for token in pointer.split("/")[1:]:
        token = token.replace("~1", "/").replace("~0", "~")
        node = node[int(token)] if isinstance(node, list) else node[token]
    return node


def validate_public_binding(binding: str) -> str | None:
    if "#" not in binding:
        return "has no # fragment"
    relpath, fragment = binding.split("#", 1)
    path = (ROOT / relpath).resolve()
    if ROOT not in path.parents or not path.is_file():
        return "does not resolve to a repository file"
    try:
        if path.suffix == ".json":
            resolve_pointer(json.loads(path.read_text(encoding="utf-8")), fragment)
        elif fragment.startswith("id="):
            wanted = fragment.removeprefix("id=")
            if not re.search(rf'\bid=["\']{re.escape(wanted)}["\']', path.read_text(encoding="utf-8")):
                return f"does not resolve DOM id {wanted}"
        else:
            return "uses an unsupported non-JSON fragment"
    except (IndexError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        return f"does not resolve: {error}"
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--claims", type=Path, default=ROOT / "data/claim_support.json")
    parser.add_argument("--references", type=Path, default=ROOT / "data/references.json")
    parser.add_argument("--showcase", type=Path, default=ROOT / "data/showcase_claims.json")
    parser.add_argument("--presentation", type=Path, default=ROOT / "data/presentation.json")
    parser.add_argument("--annotations", type=Path, default=ROOT / "data/annotations.json")
    parser.add_argument("--scenes", type=Path, default=ROOT / "data/scenes.json")
    return parser.parse_args()


def validate(record: dict, references: dict, showcase: dict, presentation: dict,
             annotations: dict, scenes: dict) -> list[str]:
    problems: list[str] = []
    if record.get("schema") != "titin-claim-support/1":
        problems.append("wrong claim-support schema")
    if set(record.get("evidence_classes") or []) != EVIDENCE_CLASSES:
        problems.append("claim support does not preserve exactly six evidence tokens")
    if set(record.get("support_relationships") or []) != RELATIONSHIPS:
        problems.append("support relationship vocabulary is incomplete")
    claims = record.get("claims") or []
    by_id = {row.get("id"): row for row in claims}
    if len(by_id) != len(claims) or None in by_id:
        problems.append("claim IDs are missing or duplicated")

    for claim in claims:
        claim_id = claim.get("id", "(missing)")
        prefix = f"claim {claim_id}"
        required = (
            "subject", "statement", "quantity", "claim_class", "render_class", "support",
            "model_dependencies", "limitations", "not_claimed", "public_bindings", "review",
        )
        for field in required:
            if field not in claim:
                problems.append(f"{prefix} lacks {field}")
        subject = claim.get("subject") or {}
        if not subject.get("species") or not subject.get("preparation") or "muscle_or_tissue" not in subject:
            problems.append(f"{prefix} has absent subject/preparation metadata")
        if not str(claim.get("statement", "")).strip():
            problems.append(f"{prefix} has no atomic statement")
        if claim.get("claim_class") not in EVIDENCE_CLASSES or claim.get("render_class") not in EVIDENCE_CLASSES:
            problems.append(f"{prefix} uses a non-canonical evidence class")
        quantity = claim.get("quantity")
        if quantity is not None:
            if not isinstance(quantity.get("value"), (int, float)) or quantity.get("unit") not in UNITS:
                problems.append(f"{prefix} has a quantity with wrong units/value")
            label = str(quantity.get("label", "")).lower()
            if re.search(r"length|span|spacing|axial|period|repeat", label) and quantity.get("unit") != "nm":
                problems.append(f"{prefix} length-like quantity must use nm")
            if "force" in label and quantity.get("unit") != "pN":
                problems.append(f"{prefix} force-like quantity must use pN")
        support = claim.get("support") or []
        if not support:
            problems.append(f"{prefix} has no support rows")
        for index, row in enumerate(support):
            label = f"{prefix} support[{index}]"
            if not row.get("source_id") or not row.get("locator") or not row.get("extraction_note"):
                problems.append(f"{label} has a missing identifier, locator, or extraction note")
            if PLACEHOLDER_LOCATOR.search(str(row.get("locator", ""))):
                problems.append(f"{label} retains a reviewer-placeholder locator")
            if row.get("relationship") not in RELATIONSHIPS:
                problems.append(f"{label} has an invalid support relationship")
            source_subject = row.get("source_subject") or {}
            if not source_subject.get("species") or not source_subject.get("preparation") \
                    or "muscle_or_tissue" not in source_subject:
                problems.append(f"{label} lacks source subject/preparation")
            if PLACEHOLDER_LOCATOR.search(" ".join(str(value) for value in source_subject.values())):
                problems.append(f"{label} retains vague source-subject metadata")
            source_id = row.get("source_id", "")
            requirement = SOURCE_SUBJECT_REQUIREMENTS.get(source_id)
            if requirement:
                fields = (
                    str(source_subject.get("species", "")),
                    str(source_subject.get("muscle_or_tissue", "")),
                    str(source_subject.get("preparation", "")),
                )
                if any(expected and expected.lower() not in actual.lower()
                       for actual, expected in zip(fields, requirement)):
                    problems.append(f"{label} has source-subject metadata inconsistent with the primary preparation")
            if source_id.startswith(("data/", "scripts/")):
                path = (ROOT / source_id).resolve()
                if ROOT not in path.parents or not path.is_file():
                    problems.append(f"{label} does not resolve to a repository file")
            elif source_id not in references:
                problems.append(f"{label} has unresolved identifier {source_id}")

        bindings = claim.get("public_bindings") or []
        if claim.get("inventory_status") == "PUBLIC" and not bindings:
            problems.append(f"{prefix} is PUBLIC but has no public binding")
        for binding in bindings:
            detail = validate_public_binding(binding)
            if detail:
                problems.append(f"{prefix} public binding {binding} {detail}")

        review = claim.get("review") or {}
        status = review.get("status")
        if status not in REVIEW_STATUSES:
            problems.append(f"{prefix} has an invalid review status")
        human_fields = ("reviewer", "affiliation", "reviewed_on", "reviewed_payload_sha256")
        if status == "PENDING":
            if any(review.get(field) is not None for field in human_fields) \
                    or review.get("publication_consent") is not False \
                    or review.get("locator_verified_independently") is not None \
                    or review.get("approval_authority") is not None \
                    or review.get("approved_on") is not None \
                    or review.get("independent_human_review_status") is not None:
                problems.append(f"{prefix} invents human review while PENDING")
        else:
            authority = review.get("approval_authority")
            owner_approved = status == "APPROVED" and isinstance(authority, dict) \
                and authority.get("type") == "PROJECT_OWNER"
            if owner_approved:
                expected_authority = {
                    "type", "identity", "authority_basis", "independent_scientific_reviewer",
                }
                if set(authority) != expected_authority \
                        or claim_id not in OWNER_APPROVABLE_CLAIMS \
                        or claim.get("inventory_status") != "REQUIRED_FOR_SC23" \
                        or authority.get("identity") != "UNDISCLOSED_PROJECT_OWNER" \
                        or authority.get("authority_basis") \
                        != "registered_scientific_evidence_accepted" \
                        or authority.get("independent_scientific_reviewer") is not False:
                    problems.append(f"{prefix} has invalid project-owner approval provenance")
                if review.get("reviewer") is not None or review.get("affiliation") is not None \
                        or review.get("reviewed_on") is not None \
                        or review.get("publication_consent") is not False \
                        or review.get("locator_verified_independently") is not False \
                        or review.get("independent_human_review_status") != "NOT_PERFORMED" \
                        or not is_iso_date(review.get("approved_on")) \
                        or not re.fullmatch(
                            r"[0-9a-f]{64}", str(review.get("reviewed_payload_sha256", ""))
                        ):
                    problems.append(
                        f"{prefix} project-owner approval overstates independent human review"
                    )
            else:
                if not all(review.get(field) for field in human_fields):
                    problems.append(f"{prefix} claims human review without reviewer metadata")
                if review.get("publication_consent") is not True:
                    problems.append(f"{prefix} reviewed identity lacks publication consent")
                if review.get("locator_verified_independently") is not True:
                    problems.append(f"{prefix} reviewer did not independently verify the locator")
            if review.get("reviewed_payload_sha256") != claim_payload_sha256(claim):
                problems.append(f"{prefix} reviewed payload digest is stale")

    for index, obj in enumerate(showcase.get("objects") or []):
        claim_id = obj.get("claim_support_id")
        if claim_id not in by_id:
            problems.append(f"showcase object {obj.get('id')} has no claim-support entry")
        else:
            expected = f"data/showcase_claims.json#/objects/{index}/claim"
            if expected not in (by_id[claim_id].get("public_bindings") or []):
                problems.append(
                    f"showcase object {obj.get('id')} is not bound to its exact visible claim at {expected}"
                )
        if obj.get("claim_evidence_class") != by_id.get(claim_id, {}).get("claim_class"):
            problems.append(f"showcase object {obj.get('id')} changed claim class at the render boundary")
        if obj.get("render_evidence_class") != by_id.get(claim_id, {}).get("render_class"):
            problems.append(f"showcase object {obj.get('id')} changed render class at the render boundary")
    for section in ("guided_chapters", "expert_cards"):
        for index, row in enumerate(presentation.get(section) or []):
            row_claim_ids = ([row.get("target_claim_id")] if section == "expert_cards"
                             else row.get("claim_ids") or [])
            for claim_id in row_claim_ids:
                if claim_id not in by_id:
                    problems.append(
                        f"presentation row {row.get('id')} has no claim-support entry {claim_id}"
                    )
                    continue
                expected = f"data/presentation.json#/{section}/{index}"
                if expected not in (by_id[claim_id].get("public_bindings") or []):
                    problems.append(
                        f"presentation row {row.get('id')} is not bound to claim {claim_id} at {expected}"
                    )
    for scene_id, row in (scenes.get("scenes") or {}).items():
        for claim_id in row.get("claim_ids") or []:
            if claim_id not in by_id:
                problems.append(f"semantic scene {scene_id} has no claim-support entry {claim_id}")
                continue
            expected = f"data/scenes.json#/scenes/{scene_id}"
            if expected not in (by_id[claim_id].get("public_bindings") or []):
                problems.append(
                    f"semantic scene {scene_id} is not bound to claim {claim_id} at {expected}"
                )
    for index, row in enumerate(annotations.get("components") or []):
        annotation_ids = row.get("claim_support_ids") or []
        if not annotation_ids:
            problems.append(f"annotation {row.get('id')} has no claim-support IDs")
        for claim_id in annotation_ids:
            if claim_id not in by_id:
                problems.append(f"annotation {row.get('id')} has no claim-support entry {claim_id}")
            else:
                expected = f"data/annotations.json#/components/{index}"
                if expected not in (by_id[claim_id].get("public_bindings") or []):
                    problems.append(
                        f"annotation {row.get('id')} is not bound to claim {claim_id} at {expected}"
                    )
    for required in (
        "titin_kinase_card", "mband_midpoint_and_crosslinks", "sequence_region_partition",
        "pevk_phosphorylation", "aband_periodicity_relation", "zdisc_telethonin_sandwich",
        "force_law_parameter_set", "sarcomere_definition", "actomyosin_motor_function",
    ):
        if required not in by_id:
            problems.append(f"known audit claim {required} is missing")
    return problems


def main() -> None:
    args = parse_args()
    problems = validate(
        load_json(args.claims), load_json(args.references), load_json(args.showcase),
        load_json(args.presentation), load_json(args.annotations), load_json(args.scenes),
    )
    if problems:
        print("SC-19 claim-support validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    count = len(load_json(args.claims).get("claims") or [])
    print(f"SC-19 claim support: PASS ({count} inventoried claims; approval provenance is explicit)")


if __name__ == "__main__":
    main()
