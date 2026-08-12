#!/usr/bin/env python3
"""Shared canonicalization and identifier helpers for the SC-19 authority layer."""

from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parent.parent
EVIDENCE_CLASSES = {
    "MEASURED",
    "STRONGLY INFERRED",
    "MODELED",
    "INFERRED",
    "SCHEMATIC",
    "UNKNOWN",
}

DOI_RE = re.compile(r"(?<![A-Za-z0-9])10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", re.I)
UNIPROT_RE = re.compile(
    r"\b(?:UniProt(?::|\s+))([A-NR-Z][0-9][A-Z0-9]{3}[0-9](?:-\d+)?)\b",
    re.I,
)
PDB_RE = re.compile(r"\bPDB(?::|\s+)([0-9][A-Za-z0-9]{3})\b", re.I)


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def sha256_payload(value: Any) -> str:
    return sha256_bytes(canonical_json(value).encode("utf-8"))


def claim_payload(record: dict[str, Any]) -> dict[str, Any]:
    payload = copy.deepcopy(record)
    payload.pop("review", None)
    return payload


def claim_payload_sha256(record: dict[str, Any]) -> str:
    return sha256_payload(claim_payload(record))


def decision_payload(record: dict[str, Any]) -> dict[str, Any]:
    payload = copy.deepcopy(record)
    for field in (
        "status",
        "reviewer",
        "adjudicator",
        "independent_human_review_status",
        "reviewed_on",
        "reviewed_model_fingerprint",
        "reviewed_payload_sha256",
        "implementation_verification",
    ):
        payload.pop(field, None)
    return payload


def decision_payload_sha256(record: dict[str, Any]) -> str:
    return sha256_payload(decision_payload(record))


def walk_strings(value: Any, path: str = "") -> Iterable[tuple[str, str]]:
    if isinstance(value, dict):
        for key, child in value.items():
            yield from walk_strings(child, f"{path}/{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_strings(child, f"{path}/{index}")
    elif isinstance(value, str):
        yield path or "/", value


def normalize_doi(value: str) -> str:
    return value.rstrip(".,;:)\"]}").lower()


def identifiers_in(value: Any) -> set[str]:
    identifiers: set[str] = set()
    for _, text in walk_strings(value):
        identifiers.update(normalize_doi(match.group(0)) for match in DOI_RE.finditer(text))
        identifiers.update(
            f"UniProt:{match.group(1).split('-')[0].upper()}" for match in UNIPROT_RE.finditer(text)
        )
        identifiers.update(f"PDB:{match.group(1).upper()}" for match in PDB_RE.finditer(text))
    return identifiers
