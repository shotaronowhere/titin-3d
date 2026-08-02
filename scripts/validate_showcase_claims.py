#!/usr/bin/env python3
"""Validate the SC-0 showcase claim, scope, evidence, and asset contract."""

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CLAIMS_PATH = ROOT / "data" / "showcase_claims.json"
DEFAULT_REFERENCES_PATH = ROOT / "data" / "references.json"

EVIDENCE_CLASSES = {
    "MEASURED",
    "STRONGLY INFERRED",
    "MODELED",
    "INFERRED",
    "SCHEMATIC",
    "UNKNOWN",
}
DECISIONS = {"ADMIT", "ADMIT_SCHEMATIC", "REPLACE_CURRENT", "DEFER", "OMIT"}
TIERS = {"A", "B", "C"}
AUDIENCES = {"GUIDED", "EVIDENCE"}
SOURCE_KINDS = {"REFERENCE", "INTERNAL"}
COMPATIBILITY = {"DIRECT", "CONTEXT_ONLY", "STRUCTURE_ONLY", "MODEL_INPUT"}
REQUIRED_OBJECT_FIELDS = {
    "id",
    "name",
    "object_kind",
    "release_tier",
    "decision",
    "audience",
    "claim",
    "scope",
    "claim_evidence_class",
    "render_evidence_class",
    "sources",
    "render_encoding",
    "not_claimed",
    "asset_policy",
}


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--claims", type=Path, default=DEFAULT_CLAIMS_PATH)
    parser.add_argument("--references", type=Path, default=DEFAULT_REFERENCES_PATH)
    return parser.parse_args()


def load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


failures = []


def check(condition, message):
    print(("  PASS " if condition else "  FAIL ") + message)
    if not condition:
        failures.append(message)


args = parse_args()
claims = load(args.claims.resolve())
references = load(args.references.resolve())
objects = claims.get("objects", [])

print("== SC-0 document and scope lock ==")
check(claims.get("schema") == "titin-showcase-claim-audit/1", "schema is the reviewed SC-0 version")
check(claims.get("meta", {}).get("status") == "COMPLETE", "SC-0 record declares completion")
check(bool(claims.get("visual_grammar")), "visual grammar is present")
check(bool(claims.get("attention_budget")), "attention budget is present")
check(bool(claims.get("admission_decisions")), "admission decisions are present")

scope = claims.get("scope_lock", {})
check(scope.get("reference_accession") == "UniProt Q8WZ42", "reference accession remains Q8WZ42")
check("N2A" in scope.get("reference_isoform", ""), "reference remains N2A-containing")
check(scope.get("reference_muscle_type") == "skeletal", "reference muscle type remains skeletal")
check(scope.get("cardiac_titin_mode") is False, "no cardiac titin mode is admitted")
check(scope.get("alternative_isoform_mode") is False, "no alternative-isoform mode is admitted")
check(scope.get("laboratory_specific_narrative") is False, "narrative is not laboratory-specific")
check(scope.get("generic_does_not_mean_isoform_free") is True, "generic narrative does not claim an isoform-free molecule")

print("\n== Claim matrix completeness and source integrity ==")
ids = [obj.get("id") for obj in objects]
check(bool(objects), "claim matrix contains objects")
check(len(ids) == len(set(ids)), "object IDs are unique")

for obj in objects:
    object_id = obj.get("id", "(missing id)")
    missing = sorted(field for field in REQUIRED_OBJECT_FIELDS if field not in obj)
    check(not missing, f"{object_id}: all required fields are present")
    if missing:
        continue

    check(bool(obj["claim"].strip()), f"{object_id}: claim is non-empty")
    check(bool(obj["scope"].strip()), f"{object_id}: scope is non-empty")
    check(obj["decision"] in DECISIONS, f"{object_id}: decision is declared vocabulary")
    check(obj["release_tier"] in TIERS, f"{object_id}: release tier is valid")
    check(bool(obj["audience"]) and set(obj["audience"]) <= AUDIENCES, f"{object_id}: audience is valid")
    check(obj["claim_evidence_class"] in EVIDENCE_CLASSES, f"{object_id}: claim evidence class is valid")
    check(obj["render_evidence_class"] in EVIDENCE_CLASSES, f"{object_id}: render evidence class is valid")
    check(bool(obj["render_encoding"].strip()), f"{object_id}: render meaning is explicit")
    check(bool(obj["not_claimed"]) and all(str(item).strip() for item in obj["not_claimed"]), f"{object_id}: non-claims are explicit")
    check(obj["asset_policy"] == "NO_SOURCE_FIGURE_COPIED", f"{object_id}: source figures are not copied")
    check(bool(obj["sources"]), f"{object_id}: at least one source is present")

    if obj["decision"] == "ADMIT_SCHEMATIC":
        check(obj["render_evidence_class"] == "SCHEMATIC", f"{object_id}: admitted schematic geometry stays SCHEMATIC")

    for source in obj["sources"]:
        source_id = source.get("id", "")
        source_kind = source.get("kind")
        prefix = f"{object_id}: source {source_id or '(missing id)'}"
        check(source_kind in SOURCE_KINDS, f"{prefix} has a valid source kind")
        check(bool(source.get("role", "").strip()), f"{prefix} has an explicit role")
        check(source.get("scope_compatibility") in COMPATIBILITY, f"{prefix} has a valid compatibility class")
        check(bool(source.get("transfer_limit", "").strip()), f"{prefix} has a transfer limit")
        if source_kind == "REFERENCE":
            check(source_id in references, f"{prefix} resolves in references.json")
        elif source_kind == "INTERNAL":
            resolved = (ROOT / source_id).resolve()
            inside_root = resolved == ROOT or ROOT in resolved.parents
            check(inside_root and resolved.is_file(), f"{prefix} resolves to a repository file")

print("\n== Admission decisions and negative boundaries ==")
by_id = {obj.get("id"): obj for obj in objects}
required_decisions = {
    "zdisc_local_network": "ADMIT_SCHEMATIC",
    "zdisc_telethonin_sandwich": "ADMIT_SCHEMATIC",
    "universal_zdisc_lattice_icon": "OMIT",
    "bare_zone_head_absence": "REPLACE_CURRENT",
    "mband_midpoint_and_crosslinks": "REPLACE_CURRENT",
    "mband_m1_density": "OMIT",
    "mybpc_czone_context": "ADMIT_SCHEMATIC",
    "thin_filament_regulation_layer": "DEFER",
}
for object_id, expected in required_decisions.items():
    actual = by_id.get(object_id, {}).get("decision")
    check(actual == expected, f"{object_id}: decision remains {expected}")

mybpc_nonclaims = " ".join(by_id.get("mybpc_czone_context", {}).get("not_claimed", [])).lower()
check("cardiac" in mybpc_nonclaims and "rigid" in mybpc_nonclaims and "direct titin" in mybpc_nonclaims,
      "MyBP-C blocks cardiac coordinates, a rigid bridge, and unsourced direct titin contact")
m1_nonclaims = " ".join(by_id.get("mband_m1_density", {}).get("not_claimed", [])).lower()
check("midpoint marker" in m1_nonclaims and "cardiac" in m1_nonclaims,
      "M1 omission distinguishes the midpoint marker and blocks cardiac transfer")

negative_controls = claims.get("global_negative_controls", [])
check(len(negative_controls) >= 10, "global negative-control set is complete")
negative_text = " ".join(negative_controls).lower()
for required in ("cardiac titin", "m1 density", "160 nm", "telethonin", "activation", "source figure"):
    check(required in negative_text, f"negative controls cover {required}")

print("\n== Corrected primary-source identities ==")
dutta = references.get("10.1038/s41586-023-06691-4", {})
tamborrini = references.get("10.1038/s41586-023-06690-5", {})
pdb_8g4l = references.get("PDB:8G4L", {})
hessel = references.get("10.1038/s41467-024-46957-7", {})
check(str(dutta.get("authors", "")).startswith("Dutta"), "06691-4 is attributed to Dutta et al.")
check(dutta.get("title") == "Cryo-EM structure of the human cardiac myosin filament", "06691-4 has the correct title")
check(str(pdb_8g4l.get("authors", "")).startswith("Dutta"), "PDB 8G4L is attributed to Dutta et al.")
check(str(tamborrini.get("authors", "")).startswith("Tamborrini"), "06690-5 is attributed to Tamborrini et al.")
check(str(hessel.get("authors", "")).startswith("Hessel"), "skeletal MyBP-C source is attributed to Hessel et al.")

print("\n" + "=" * 44)
if failures:
    print(f"{len(failures)} SHOWCASE CLAIM FAILURE(S)")
    sys.exit(1)
print(f"ALL SHOWCASE CLAIM CHECKS PASSED ({len(objects)} objects)")
