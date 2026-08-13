#!/usr/bin/env python3
"""SC-22 negative control: a reviewed claim cannot retain a valid but unrelated source."""

from __future__ import annotations

import copy

from scientific_common import ROOT, claim_payload_sha256, load_json
from validate_claim_support import validate


claims = load_json(ROOT / "data/claim_support.json")
references = load_json(ROOT / "data/references.json")
showcase = load_json(ROOT / "data/showcase_claims.json")
presentation = load_json(ROOT / "data/presentation.json")
annotations = load_json(ROOT / "data/annotations.json")


def problems(record: dict) -> list[str]:
    return validate(record, references, showcase, presentation, annotations)


reviewed = copy.deepcopy(claims)
claim = next(row for row in reviewed["claims"] if row["id"] == "titin_continuity_trace")
claim["review"] = {
    "status": "APPROVED",
    "reviewer": "SC-22 negative-control reviewer",
    "affiliation": "Fixture only",
    "publication_consent": True,
    "locator_verified_independently": True,
    "reviewed_on": "2026-08-12",
    "reviewed_payload_sha256": None,
}
claim["review"]["reviewed_payload_sha256"] = claim_payload_sha256(claim)
baseline = problems(reviewed)
if baseline:
    raise AssertionError(f"reviewed control fixture is invalid before mutation: {baseline}")

# PDB:6KN7 is a valid registry entry for a regulated thin-filament structure. It
# is semantically unrelated to the continuous titin Z-disc-to-M-line topology in
# this claim. Because source relationships are inside the reviewed payload, the
# substitution must invalidate the named review even though the identifier itself
# resolves successfully.
claim["support"][0]["source_id"] = "PDB:6KN7"
mutated = problems(reviewed)
if not any("reviewed payload digest is stale" in problem for problem in mutated):
    raise AssertionError(
        "valid-but-unrelated source rebinding did not invalidate reviewed claim support: "
        f"{mutated}"
    )
if any("unresolved identifier" in problem for problem in mutated):
    raise AssertionError(f"negative control used an invalid source instead of a wrong valid one: {mutated}")

missing_annotations = copy.deepcopy(annotations)
missing_annotations["components"][0]["claim_support_ids"] = []
missing = validate(claims, references, showcase, presentation, missing_annotations)
if not any("has no claim-support IDs" in problem for problem in missing):
    raise AssertionError(f"missing public annotation binding was not rejected: {missing}")

print(
    "SC-22 claim/source negative control: PASS "
    "(valid unrelated source and missing annotation binding rejected)"
)
