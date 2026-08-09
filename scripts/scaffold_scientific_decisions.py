#!/usr/bin/env python3
"""Create/update the PENDING SD-01–SD-05 record from deterministic packets."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

from scientific_common import ROOT, load_json, sha256_file


OUTPUT = ROOT / "data" / "scientific_decisions.json"
PACKET_DIR = ROOT / "docs" / "scientific-decisions" / "SC-19"
QUESTIONS = {
    "SD-01": "Exact Q8WZ42-1 coordinate frame, N2A definition, and proximal/PEVK/distal residue-domain partition",
    "SD-02": "A-band super-repeat, kinase, bare-zone, and M-line axial budget",
    "SD-03": "Names and relationships among sequence repeats, reported axial quantities, myosin periodicity, and register hypotheses",
    "SD-04": "Force-law parameters, transfers, validity, sensitivity, slack/unfolding omissions, and uncertainty",
    "SD-05": "Z-disc/M-line anchoring language, telethonin/alpha-actinin emphasis, stoichiometry, and depiction semantics",
}
REVIEWER_ROLES = {
    "SD-01": "Titin sequence annotation and isoform/domain-boundary specialist",
    "SD-02": "Titin A-band/M-band ultrastructure specialist",
    "SD-03": "Striated-muscle filament periodicity and structural-biology specialist",
    "SD-04": "Titin passive-mechanics and single-molecule force-law specialist",
    "SD-05": "Sarcomere terminal anchoring and titin-binding structural-biology specialist",
}
DOWNSTREAM = {
    "SD-01": ["scope_badge", "titin_region_architecture", "sequence_region_partition"],
    "SD-02": ["band_and_zone_brackets", "mband_midpoint_and_crosslinks"],
    "SD-03": ["titin_region_architecture", "aband_periodicity_relation"],
    "SD-04": ["regional_extension_story", "force_law_parameter_set"],
    "SD-05": ["zdisc_local_network", "zdisc_alpha_actinin_doublets", "zdisc_telethonin_sandwich", "mband_midpoint_and_crosslinks"],
}


def packet_rows(decision_id: str) -> list[dict[str, str]]:
    paths = [PACKET_DIR / f"{decision_id}.md"]
    if decision_id == "SD-01":
        paths.append(PACKET_DIR / "region-feature-report.json")
    return [
        {"path": str(path.relative_to(ROOT)), "sha256": sha256_file(path)} for path in paths
    ]


def pending(decision_id: str) -> dict[str, Any]:
    return {
        "status": "PENDING",
        "question": QUESTIONS[decision_id],
        "required_reviewer_role": REVIEWER_ROLES[decision_id],
        "evidence_packet": packet_rows(decision_id),
        "reviewer": None,
        "reviewed_on": None,
        "reviewed_model_fingerprint": None,
        "reviewed_payload_sha256": None,
        "ruling": None,
        "public_caveat": None,
        "dissent_or_uncertainty": [],
        "downstream_claim_ids": DOWNSTREAM[decision_id],
        "implementation_verification": {
            "status": "PENDING",
            "reviewer": None,
            "reviewed_on": None,
            "implemented_model_fingerprint": None,
            "implementation_evidence": [],
        },
    }


def main() -> None:
    previous = load_json(OUTPUT) if OUTPUT.is_file() else {"decisions": {}}
    decisions = {}
    for decision_id in QUESTIONS:
        current = previous.get("decisions", {}).get(decision_id)
        fresh = pending(decision_id)
        if current and current.get("status") in {"APPROVED", "DEFERRED"}:
            # Never erase a human ruling. Refreshing packets after review must be
            # handled explicitly by the decision validator as a stale digest.
            decisions[decision_id] = copy.deepcopy(current)
        else:
            decisions[decision_id] = fresh
    result = {
        "schema": "titin-scientific-decisions/1",
        "sprint_status": "CODE_COMPLETE_BLOCKED_SCIENCE",
        "blocker": "No qualified SD-01–SD-05 reviewer candidate is recorded as confirmed; no ruling is fabricated.",
        "decisions": decisions,
    }
    OUTPUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT} with {len(decisions)} PENDING decision dossiers")


if __name__ == "__main__":
    main()
