#!/usr/bin/env python3
"""Perform the one-way SC-19 scope/claim schema migration.

The migration preserves the reviewed SC-0 admission decisions as history, moves
live sequence identity to scientific_scope.json, and gives every admitted object
a stable claim-support binding. It is idempotent so the exact migration can be
audited without keeping a second hand-edited copy of the records.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scientific_common import ROOT


DATA = ROOT / "data"


REPLACEMENTS = {
    "Human skeletal N2A titin · Q8WZ42": "Human TTN reference sequence · Q8WZ42-1 · construct review pending",
    "canonical skeletal N2A-containing titin": "Q8WZ42-1 reference sequence (tissue construct not established)",
    "canonical human skeletal N2A-containing reference": "human Q8WZ42-1 reference sequence",
    "human skeletal N2A-containing reference": "human Q8WZ42-1 reference-sequence model",
    "human skeletal N2A-containing Q8WZ42 reference model": "human Q8WZ42-1 reference-sequence model",
    "human canonical skeletal N2A-containing titin (Q8WZ42)": "human TTN reference sequence Q8WZ42-1",
    "human canonical Q8WZ42 in the retained skeletal N2A-containing model": "human TTN reference sequence Q8WZ42-1",
    "human skeletal N2A titin reference": "human Q8WZ42-1 reference-sequence model",
    "human skeletal N2A model": "human Q8WZ42-1 reference-sequence model",
    "skeletal N2A isoform this model scopes": "Q8WZ42-1 reference-sequence construct under review",
    "skeletal N2A isoform": "Q8WZ42-1 reference-sequence construct",
    "skeletal N2A model": "Q8WZ42-1 reference-sequence model",
    "skeletal N2A reference": "Q8WZ42-1 reference-sequence model",
    "canonical (Q8WZ42; skeletal N2A-containing)": "Q8WZ42-1 reference sequence; tissue construct not established",
}


def replace_strings(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: replace_strings(child) for key, child in value.items()}
    if isinstance(value, list):
        return [replace_strings(child) for child in value]
    if isinstance(value, str):
        for old, new in REPLACEMENTS.items():
            value = value.replace(old, new)
        return value
    return value


def read(name: str) -> dict[str, Any]:
    with (DATA / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def write(name: str, value: dict[str, Any]) -> None:
    (DATA / name).write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def migrate_claims() -> None:
    claims = read("showcase_claims.json")
    if claims.get("schema") == "titin-showcase-claim-audit/1":
        prior_digest = claims.get("meta", {}).pop("contract_sha256")
        claims["schema"] = "titin-showcase-claim-audit/2"
        claims["meta"]["schema_migration"] = {
            "from": "titin-showcase-claim-audit/1",
            "on": "2026-08-09",
            "prior_reviewed_payload_sha256": prior_digest,
            "reason": "SC-19 replaces a whole-file byte pin with stable per-claim support bindings and semantic invariants.",
            "review_status": "PENDING"
        }
    claims["scope_lock"] = {
        "scientific_scope_ref": "scientific_scope.json",
        "educational_narrative": "Broadly applicable titin concepts explained through an explicitly scoped reference-sequence model.",
        "default_structural_context": "resting reference unless the sarcomere-length state is explicitly shown",
        "cardiac_titin_mode": False,
        "alternative_isoform_mode": False,
        "laboratory_specific_narrative": False,
        "generic_does_not_mean_isoform_free": True,
        "cross_tissue_rule": "A context source from another tissue may document a limitation or conserved relationship, but it cannot supply authoritative coordinates unless transfer is independently established and recorded.",
        "mechanics_rule": "Sarcomere length and biochemical activation remain independent; the showcase does not add a regulatory or active-contraction solver."
    }
    for obj in claims.get("objects") or []:
        obj["claim_support_id"] = obj["id"]
    write("showcase_claims.json", replace_strings(claims))


def migrate_presentation() -> None:
    presentation = replace_strings(read("presentation.json"))
    scope = presentation["scope"]
    for key in ("species", "accession", "isoform", "muscle_type"):
        scope.pop(key, None)
    scope["scientific_scope_ref"] = "scientific_scope.json"
    for badge in presentation.get("scope_badges") or []:
        badge.pop("label", None)
        badge["label_ref"] = "scientific_scope.json#/public_badge"
        badge["target_claim_id"] = "scope_badge"
    write("presentation.json", presentation)


def migrate_sarcomere() -> None:
    sarcomere = replace_strings(read("sarcomere.json"))
    sarcomere["meta"].pop("isoform_reconciliation", None)
    sarcomere["meta"]["scientific_scope_ref"] = "scientific_scope.json#/structural_context"
    write("sarcomere.json", sarcomere)


def migrate_titin() -> None:
    titin = replace_strings(read("titin.json"))
    titin["meta"]["coordinate_frame"] = "canonical"
    titin["meta"]["scientific_scope_ref"] = "scientific_scope.json#/sequence"
    for region in titin["regions"]:
        region.pop("species", None)
        region.pop("isoform", None)
        region.pop("muscle_type", None)
        region["scientific_scope_ref"] = "scientific_scope.json#/sequence"
    write("titin.json", titin)


def migrate_annotations() -> None:
    annotations = replace_strings(read("annotations.json"))
    annotations["meta"]["scientific_scope_ref"] = "scientific_scope.json"
    for row in annotations.get("components") or []:
        binding = row.get("binding") or {}
        if binding.get("kind") == "showcase_claim":
            row["claim_support_ids"] = [binding["id"]]
    write("annotations.json", annotations)


def migrate_remaining_language() -> None:
    for name in (
        "context_measurements.json",
        "geometry_sources.json",
        "geometry_strategy.json",
        "references.json",
    ):
        write(name, replace_strings(read(name)))


def main() -> None:
    migrate_claims()
    migrate_presentation()
    migrate_sarcomere()
    migrate_titin()
    migrate_annotations()
    migrate_remaining_language()
    print("migrated SC-19 scope and showcase-claim schema")


if __name__ == "__main__":
    main()
