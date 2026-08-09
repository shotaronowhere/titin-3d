#!/usr/bin/env python3
"""Validate the immutable SC-0 showcase claim, scope, and source contract."""

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CLAIMS_PATH = ROOT / "data" / "showcase_claims.json"
DEFAULT_REFERENCES_PATH = ROOT / "data" / "references.json"

EXPECTED_CONTRACT_SHA256 = "e43c9fc807d19ee9eba40b3cb7dceedc6c8e804cb87c5e8ad4e1cafe211dd0b6"
EVIDENCE_STRENGTH = {
    "UNKNOWN": 0,
    "SCHEMATIC": 1,
    "INFERRED": 2,
    "MODELED": 3,
    "STRONGLY INFERRED": 4,
    "MEASURED": 5,
}
EVIDENCE_CLASSES = set(EVIDENCE_STRENGTH)
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
    "claim_support_id",
}
REQUIRED_SOURCE_FIELDS = {"kind", "id", "role", "scope_compatibility", "transfer_limit"}
REQUIRED_REFERENCE_FIELDS = {"identifier", "authors", "year", "title", "journal"}

EXPECTED_SCOPE = {
    "scientific_scope_ref": "scientific_scope.json",
    "educational_narrative": "Broadly applicable titin concepts explained through an explicitly scoped reference-sequence model.",
    "default_structural_context": "resting reference unless the sarcomere-length state is explicitly shown",
    "cardiac_titin_mode": False,
    "alternative_isoform_mode": False,
    "laboratory_specific_narrative": False,
    "generic_does_not_mean_isoform_free": True,
    "cross_tissue_rule": "A context source from another tissue may document a limitation or conserved relationship, but it cannot supply authoritative coordinates unless transfer is independently established and recorded.",
    "mechanics_rule": "Sarcomere length and biochemical activation remain independent; the showcase does not add a regulatory or active-contraction solver.",
}

EXPECTED_VISUAL_GRAMMAR = {
    "candidate_identity_palette": {
        "titin": "#F04D7A",
        "myosin_thick_filament": "#55789F",
        "actin_thin_filament": "#C68A45",
        "mybpc": "#E2BF45",
        "alpha_actinin": "#38B8C8",
        "mband_crosslinks": "#8D6BC3",
    },
    "palette_status": "Candidate only until contrast, common color-vision, grayscale, and projector tests pass.",
    "identity_channel": "Protein identity uses hue and labeling.",
    "selection_channel": "Selection uses a same-family rim, outline, or luminance change and never replaces the identity hue.",
    "evidence_channel": "Evidence uses a text badge plus line/opacity treatment; evidence is never encoded by color alone.",
    "schematic_channel": "Schematic presentation uses an explicit SCHEMATIC badge and, where legible, a dash or halo treatment.",
    "unknown_channel": "Unknown extent is omitted or displayed as a labeled uncertainty envelope, never filled in by decorative geometry.",
    "source_figure_policy": "NO_SOURCE_FIGURE_COPIED",
    "supplied_illustration_policy": "The user-supplied illustrations and Wikipedia image are composition references only. Product geometry must be procedurally redrawn from admitted claims and cite the underlying source record.",
}

EXPECTED_ATTENTION_BUDGET = {
    "guided_primary_biological_target_max": 1,
    "guided_secondary_context_labels_desktop_max": 3,
    "guided_secondary_context_labels_mobile_max": 2,
    "pinned_tooltips_max": 1,
    "guided_copy_words_min": 25,
    "guided_copy_words_max": 45,
    "context_opacity_candidate_range": [0.35, 0.55],
    "detail_rule": "Z-disc, M-band, MyBP-C, and molecular-repeat detail appear only in their relevant close-up or expert chapter.",
    "mybpc_default_visibility": False,
    "thin_filament_regulation_default_visibility": False,
    "label_priority": [
        "selected titin region",
        "current anchor or band",
        "one essential context protein",
        "secondary context",
    ],
    "occlusion_rule": "Hide a lower-priority label before allowing overlap, detachment from its anchor, or obstruction of the highlighted titin path.",
    "motion_rule": "One transition communicates one change; reduced-motion mode jumps to the identical scientific state.",
}

# Every planned object is pinned independently of the data file. Updating this
# table is an explicit review action, not something the data can authorize alone.
EXPECTED_OBJECT_SUMMARIES = {
    "scope_badge": ("ADMIT", "A", ("GUIDED", "EVIDENCE"), "MEASURED", "SCHEMATIC"),
    "titin_continuity_trace": ("ADMIT", "A", ("GUIDED", "EVIDENCE"), "STRONGLY INFERRED", "SCHEMATIC"),
    "titin_region_architecture": ("ADMIT", "A", ("GUIDED", "EVIDENCE"), "MEASURED", "SCHEMATIC"),
    "regional_extension_story": ("ADMIT", "A", ("GUIDED", "EVIDENCE"), "MODELED", "MODELED"),
    "band_and_zone_brackets": ("ADMIT", "A", ("GUIDED", "EVIDENCE"), "STRONGLY INFERRED", "SCHEMATIC"),
    "zdisc_local_network": ("ADMIT_SCHEMATIC", "A", ("GUIDED", "EVIDENCE"), "MEASURED", "SCHEMATIC"),
    "zdisc_alpha_actinin_doublets": ("ADMIT_SCHEMATIC", "A", ("EVIDENCE",), "MEASURED", "SCHEMATIC"),
    "zdisc_telethonin_sandwich": ("ADMIT_SCHEMATIC", "A", ("GUIDED", "EVIDENCE"), "MEASURED", "SCHEMATIC"),
    "universal_zdisc_lattice_icon": ("OMIT", "A", ("GUIDED", "EVIDENCE"), "UNKNOWN", "UNKNOWN"),
    "bare_zone_head_absence": ("REPLACE_CURRENT", "A", ("GUIDED", "EVIDENCE"), "STRONGLY INFERRED", "SCHEMATIC"),
    "mband_midpoint_and_crosslinks": ("REPLACE_CURRENT", "A", ("GUIDED", "EVIDENCE"), "STRONGLY INFERRED", "SCHEMATIC"),
    "mband_m1_density": ("OMIT", "A", ("EVIDENCE",), "UNKNOWN", "UNKNOWN"),
    "mybpc_czone_context": ("ADMIT_SCHEMATIC", "B", ("EVIDENCE",), "MEASURED", "SCHEMATIC"),
    "lattice_cross_section": ("ADMIT", "A", ("GUIDED", "EVIDENCE"), "MODELED", "MODELED"),
    "object_linked_tooltips": ("ADMIT", "A", ("GUIDED", "EVIDENCE"), "SCHEMATIC", "SCHEMATIC"),
    "n2a_interaction_hub_card": ("ADMIT", "B", ("EVIDENCE",), "MEASURED", "SCHEMATIC"),
    "titin_kinase_card": ("ADMIT", "B", ("EVIDENCE",), "MEASURED", "SCHEMATIC"),
    "length_dependent_activation_card": ("ADMIT", "B", ("EVIDENCE",), "INFERRED", "SCHEMATIC"),
    "thin_filament_regulation_layer": ("DEFER", "C", ("EVIDENCE",), "MEASURED", "UNKNOWN"),
    "ai_provenance_pipeline": ("ADMIT", "A", ("GUIDED", "EVIDENCE"), "MEASURED", "SCHEMATIC"),
}

EXPECTED_LIMITED_SOURCE_COMPATIBILITY = {
    ("zdisc_local_network", "10.1016/j.cell.2021.02.047"): "CONTEXT_ONLY",
    ("zdisc_alpha_actinin_doublets", "10.1016/j.cell.2021.02.047"): "CONTEXT_ONLY",
    ("zdisc_telethonin_sandwich", "10.1038/nature04343"): "STRUCTURE_ONLY",
    ("universal_zdisc_lattice_icon", "10.1016/j.cell.2021.02.047"): "CONTEXT_ONLY",
    ("universal_zdisc_lattice_icon", "10.1016/j.jmb.2015.08.018"): "CONTEXT_ONLY",
    ("mband_midpoint_and_crosslinks", "10.1016/j.cell.2021.02.047"): "CONTEXT_ONLY",
    ("mband_midpoint_and_crosslinks", "10.1083/jcb.134.6.1441"): "CONTEXT_ONLY",
    ("mband_midpoint_and_crosslinks", "10.1038/embor.2010.65"): "STRUCTURE_ONLY",
    ("mband_m1_density", "10.1038/s41586-023-06690-5"): "CONTEXT_ONLY",
    ("mybpc_czone_context", "10.1038/s41467-024-46957-7"): "CONTEXT_ONLY",
    ("lattice_cross_section", "10.1152/ajpheart.2000.279.5.h2568"): "CONTEXT_ONLY",
    ("titin_kinase_card", "PDB:1TKI+4JNW (Phase 6 measurement, kinase)"): "STRUCTURE_ONLY",
    ("length_dependent_activation_card", "10.1038/s41467-024-46957-7"): "CONTEXT_ONLY",
    ("thin_filament_regulation_layer", "PDB:6KN7"): "STRUCTURE_ONLY",
}


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--claims", type=Path, default=DEFAULT_CLAIMS_PATH)
    parser.add_argument("--references", type=Path, default=DEFAULT_REFERENCES_PATH)
    return parser.parse_args()


def load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def contract_digest(record):
    payload = copy.deepcopy(record)
    payload.get("meta", {}).pop("contract_sha256", None)
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


failures = []


def check(condition, message):
    print(("  PASS " if condition else "  FAIL ") + message)
    if not condition:
        failures.append(message)


args = parse_args()
claims = load(args.claims.resolve())
references = load(args.references.resolve())
objects = claims.get("objects", [])

print("== SC-0 admission history migrated into the SC-19 claim authority ==")
migration = claims.get("meta", {}).get("schema_migration") or {}
check(claims.get("schema") == "titin-showcase-claim-audit/2", "schema is the SC-19 version")
check(claims.get("meta", {}).get("status") == "COMPLETE", "SC-0 record declares completion")
check(migration.get("from") == "titin-showcase-claim-audit/1", "schema migration names its source version")
check(migration.get("prior_reviewed_payload_sha256") == EXPECTED_CONTRACT_SHA256,
      "schema migration retains the historical reviewed payload digest")
check(migration.get("review_status") == "PENDING",
      "the migrated live claim/source bindings do not inherit the old whole-file approval")
check(claims.get("scope_lock") == EXPECTED_SCOPE, "species, isoform, tissue, state, and mode scope are exact")
check(claims.get("visual_grammar") == EXPECTED_VISUAL_GRAMMAR, "visual grammar is complete and unchanged")
check(claims.get("attention_budget") == EXPECTED_ATTENTION_BUDGET, "attention budget is complete and unchanged")
check(set(claims.get("admission_decisions", {})) == {
    "zdisc", "mband", "mybpc", "thin_filament_regulation",
    "n2a_interaction_hub", "titin_kinase", "length_dependent_activation",
}, "all reviewed admission decisions are present")

print("\n== Claim matrix completeness and evidence integrity ==")
ids = [obj.get("id") for obj in objects]
check(len(ids) == len(set(ids)), "object IDs are unique")
check(set(ids) == set(EXPECTED_OBJECT_SUMMARIES), "the complete 20-object reviewed manifest is present")

external_source_ids = set()
actual_limited_compatibility = {}
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
    check(
        EVIDENCE_STRENGTH.get(obj["render_evidence_class"], 99)
        <= EVIDENCE_STRENGTH.get(obj["claim_evidence_class"], -1),
        f"{object_id}: render evidence never exceeds claim evidence",
    )
    check(bool(obj["render_encoding"].strip()), f"{object_id}: render meaning is explicit")
    check(bool(obj["not_claimed"]) and all(str(item).strip() for item in obj["not_claimed"]), f"{object_id}: non-claims are explicit")
    check(obj["asset_policy"] == "NO_SOURCE_FIGURE_COPIED", f"{object_id}: source figures are not copied")
    check(bool(obj["sources"]), f"{object_id}: at least one source is present")
    check(obj["claim_support_id"] == object_id,
          f"{object_id}: stable claim-support binding matches the object ID")

    expected_summary = EXPECTED_OBJECT_SUMMARIES.get(object_id)
    actual_summary = (
        obj["decision"],
        obj["release_tier"],
        tuple(obj["audience"]),
        obj["claim_evidence_class"],
        obj["render_evidence_class"],
    )
    check(actual_summary == expected_summary, f"{object_id}: decision, tier, audience, and evidence remain reviewed")

    if obj["decision"] == "ADMIT_SCHEMATIC":
        check(obj["render_evidence_class"] == "SCHEMATIC", f"{object_id}: admitted schematic geometry stays SCHEMATIC")
    if obj["decision"] in {"OMIT", "DEFER"}:
        check(obj["render_evidence_class"] == "UNKNOWN", f"{object_id}: omitted/deferred geometry remains UNKNOWN")

    for source in obj["sources"]:
        source_id = source.get("id", "")
        source_kind = source.get("kind")
        prefix = f"{object_id}: source {source_id or '(missing id)'}"
        source_missing = sorted(field for field in REQUIRED_SOURCE_FIELDS if field not in source)
        check(not source_missing, f"{prefix} has all required fields")
        check(source_kind in SOURCE_KINDS, f"{prefix} has a valid source kind")
        check(bool(source.get("role", "").strip()), f"{prefix} has an explicit role")
        check(source.get("scope_compatibility") in COMPATIBILITY, f"{prefix} has a valid compatibility class")
        check(bool(source.get("transfer_limit", "").strip()), f"{prefix} has a transfer limit")
        if source_kind == "REFERENCE":
            external_source_ids.add(source_id)
            check(source_id in references, f"{prefix} resolves in references.json")
        elif source_kind == "INTERNAL":
            resolved = (ROOT / source_id).resolve()
            inside_root = resolved == ROOT or ROOT in resolved.parents
            check(inside_root and resolved.is_file(), f"{prefix} resolves to a repository file")

        constrained_key = (object_id, source_id)
        if constrained_key in EXPECTED_LIMITED_SOURCE_COMPATIBILITY:
            actual_limited_compatibility[constrained_key] = source.get("scope_compatibility")

check(
    actual_limited_compatibility == EXPECTED_LIMITED_SOURCE_COMPATIBILITY,
    "all cross-tissue and isolated-structure sources retain reviewed transfer classifications",
)

print("\n== External bibliography completeness and linkability ==")
for source_id in sorted(external_source_ids):
    record = references.get(source_id, {})
    missing = sorted(field for field in REQUIRED_REFERENCE_FIELDS if not record.get(field))
    check(not missing, f"{source_id}: admitted source has complete citation metadata")
    check(record.get("identifier") == source_id, f"{source_id}: identifier matches the registry key")
    check(isinstance(record.get("year"), int), f"{source_id}: publication year is numeric")
    if source_id.startswith("10."):
        check(record.get("doi") == source_id, f"{source_id}: DOI is directly linkable")
    elif source_id.startswith("UniProt:"):
        check(source_id.count(":") == 1, f"{source_id}: UniProt identifier is directly linkable")
    elif source_id.startswith("PDB:"):
        is_derived = "(" in source_id or "+" in source_id
        dependencies = record.get("depends_on", [])
        if is_derived:
            check(bool(dependencies), f"{source_id}: derived PDB record exposes leaf dependencies")
            for dependency in dependencies:
                check(dependency in references, f"{source_id}: dependency {dependency} resolves")
                check(references.get(dependency, {}).get("identifier") == dependency,
                      f"{source_id}: dependency {dependency} is directly linkable")
        else:
            pdb_id = source_id.removeprefix("PDB:")
            check(record.get("pdb_id", pdb_id) == pdb_id and pdb_id.isalnum(),
                  f"{source_id}: PDB accession is directly linkable")
    else:
        check(False, f"{source_id}: admitted external source has a supported link type")

print("\n== Admission decisions and negative boundaries ==")
by_id = {obj.get("id"): obj for obj in objects}
mybpc_nonclaims = " ".join(by_id.get("mybpc_czone_context", {}).get("not_claimed", [])).lower()
check("cardiac" in mybpc_nonclaims and "rigid" in mybpc_nonclaims and "direct titin" in mybpc_nonclaims,
      "MyBP-C blocks cardiac coordinates, a rigid bridge, and unsourced direct titin contact")
m1_nonclaims = " ".join(by_id.get("mband_m1_density", {}).get("not_claimed", [])).lower()
check("midpoint marker" in m1_nonclaims and "cardiac" in m1_nonclaims,
      "M1 omission distinguishes the midpoint marker and blocks cardiac transfer")

negative_controls = claims.get("global_negative_controls", [])
check(len(negative_controls) == 10, "global negative-control set has the reviewed size")
negative_text = " ".join(negative_controls).lower()
for required in ("cardiac titin", "m1 density", "160 nm", "telethonin", "activation", "source figure"):
    check(required in negative_text, f"negative controls cover {required}")

print("\n== Primary-source identities ==")
source_identities = {
    "10.1038/nature04343": ("Zou", "Palindromic assembly"),
    "10.1038/embor.2010.65": ("Sauer", "Molecular basis of the head-to-tail assembly"),
    "10.1083/jcb.134.6.1441": ("Obermann", "The structure of the sarcomeric M band"),
    "10.1038/s41586-023-06691-4": ("Dutta", "Cryo-EM structure of the human cardiac myosin filament"),
    "10.1038/s41586-023-06690-5": ("Tamborrini", "Structure of the native myosin filament"),
    "10.1038/s41467-024-46957-7": ("Hessel", "Myosin-binding protein C regulates"),
    "PDB:6KN7": ("Yamada", "Human cardiac thin filament"),
    "PDB:8G4L": ("Dutta", "Human cardiac myosin filament"),
}
for source_id, (author_prefix, title_prefix) in source_identities.items():
    record = references.get(source_id, {})
    check(str(record.get("authors", "")).startswith(author_prefix), f"{source_id}: author identity is correct")
    check(str(record.get("title", "")).lower().startswith(title_prefix.lower()), f"{source_id}: title identity is correct")

print("\n" + "=" * 44)
if failures:
    print(f"{len(failures)} SHOWCASE CLAIM FAILURE(S)")
    sys.exit(1)
print(f"ALL SHOWCASE CLAIM CHECKS PASSED ({len(objects)} objects, migrated from {EXPECTED_CONTRACT_SHA256[:12]})")
