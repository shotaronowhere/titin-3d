#!/usr/bin/env python3
"""Prove that the SC-0 contract rejects scope, evidence, and source drift."""

import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
CLAIMS_SOURCE = ROOT / "data" / "showcase_claims.json"
REFERENCES_SOURCE = ROOT / "data" / "references.json"
VALIDATOR = ROOT / "scripts" / "validate_showcase_claims.py"


with CLAIMS_SOURCE.open(encoding="utf-8") as handle:
    baseline_claims = json.load(handle)
with REFERENCES_SOURCE.open(encoding="utf-8") as handle:
    baseline_references = json.load(handle)


def object_by_id(record, object_id):
    return next(obj for obj in record["objects"] if obj["id"] == object_id)


def source_by_id(record, object_id, source_id):
    obj = object_by_id(record, object_id)
    return next(source for source in obj["sources"] if source["id"] == source_id)


def expect_rejected(name, mutate_claims=None, mutate_references=None, expected_output=None):
    claims = copy.deepcopy(baseline_claims)
    references = copy.deepcopy(baseline_references)
    if mutate_claims:
        mutate_claims(claims)
    if mutate_references:
        mutate_references(references)

    with tempfile.NamedTemporaryFile("w", suffix="-claims.json", encoding="utf-8") as claims_handle:
        with tempfile.NamedTemporaryFile("w", suffix="-references.json", encoding="utf-8") as references_handle:
            json.dump(claims, claims_handle)
            json.dump(references, references_handle)
            claims_handle.flush()
            references_handle.flush()
            completed = subprocess.run(
                [
                    sys.executable,
                    str(VALIDATOR),
                    "--claims",
                    claims_handle.name,
                    "--references",
                    references_handle.name,
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

    output = completed.stdout + completed.stderr
    if completed.returncode == 0:
        raise AssertionError(f"negative control was accepted: {name}")
    if expected_output and expected_output not in output:
        raise AssertionError(
            f"negative control failed for the wrong reason: {name}\n"
            f"expected output containing: {expected_output}\n{output}"
        )
    print(f"  PASS rejected {name}")


print("== SC-0 destructive negative controls ==")
expect_rejected(
    "cardiac titin mode",
    lambda record: record["scope_lock"].__setitem__("cardiac_titin_mode", True),
    expected_output="species, isoform, tissue, state, and mode scope are exact",
)
expect_rejected(
    "alternative isoform mode",
    lambda record: record["scope_lock"].__setitem__("alternative_isoform_mode", True),
    expected_output="species, isoform, tissue, state, and mode scope are exact",
)
expect_rejected(
    "laboratory-specific narrative",
    lambda record: record["scope_lock"].__setitem__("laboratory_specific_narrative", True),
    expected_output="species, isoform, tissue, state, and mode scope are exact",
)
expect_rejected(
    "reference species changed to mouse",
    lambda record: record["scope_lock"].__setitem__("reference_species", "Mus musculus"),
    expected_output="species, isoform, tissue, state, and mode scope are exact",
)
expect_rejected(
    "required scope badge deleted",
    lambda record: record["objects"].__setitem__(
        slice(None), [obj for obj in record["objects"] if obj["id"] != "scope_badge"]
    ),
    expected_output="complete 20-object reviewed manifest is present",
)
expect_rejected(
    "MyBP-C promoted above schematic",
    lambda record: object_by_id(record, "mybpc_czone_context").update(
        {"decision": "ADMIT", "render_evidence_class": "MEASURED"}
    ),
    expected_output="decision, tier, audience, and evidence remain reviewed",
)
expect_rejected(
    "M1 density admitted",
    lambda record: object_by_id(record, "mband_m1_density").__setitem__("decision", "ADMIT"),
    expected_output="decision, tier, audience, and evidence remain reviewed",
)
expect_rejected(
    "thin-filament regulation promoted into core scope",
    lambda record: object_by_id(record, "thin_filament_regulation_layer").update(
        {"decision": "ADMIT", "release_tier": "A"}
    ),
    expected_output="decision, tier, audience, and evidence remain reviewed",
)
expect_rejected(
    "dangling citation",
    lambda record: object_by_id(record, "titin_continuity_trace")["sources"][0].__setitem__(
        "id", "10.0000/not-a-source"
    ),
    expected_output="resolves in references.json",
)
expect_rejected(
    "copied source figure",
    lambda record: object_by_id(record, "zdisc_local_network").__setitem__(
        "asset_policy", "COPY_SOURCE_FIGURE"
    ),
    expected_output="source figures are not copied",
)
expect_rejected(
    "cross-tissue Z-disc source promoted to DIRECT",
    lambda record: source_by_id(
        record, "zdisc_local_network", "10.1016/j.cell.2021.02.047"
    ).__setitem__("scope_compatibility", "DIRECT"),
    expected_output="all cross-tissue and isolated-structure sources retain reviewed transfer classifications",
)
expect_rejected(
    "M-band source promoted to DIRECT",
    lambda record: source_by_id(
        record, "mband_midpoint_and_crosslinks", "10.1016/j.cell.2021.02.047"
    ).__setitem__("scope_compatibility", "DIRECT"),
    expected_output="all cross-tissue and isolated-structure sources retain reviewed transfer classifications",
)
expect_rejected(
    "continuity proxy promoted above its claim evidence",
    lambda record: object_by_id(record, "titin_continuity_trace").__setitem__(
        "render_evidence_class", "MEASURED"
    ),
    expected_output="render evidence never exceeds claim evidence",
)
expect_rejected(
    "evidence visual channel deleted",
    lambda record: record["visual_grammar"].pop("evidence_channel"),
    expected_output="visual grammar is complete and unchanged",
)
expect_rejected(
    "Guided label budget raised to 100",
    lambda record: record["attention_budget"].__setitem__(
        "guided_secondary_context_labels_desktop_max", 100
    ),
    expected_output="attention budget is complete and unchanged",
)
expect_rejected(
    "primary M-band source removed",
    lambda record: object_by_id(record, "mband_midpoint_and_crosslinks").__setitem__(
        "sources",
        [
            source
            for source in object_by_id(record, "mband_midpoint_and_crosslinks")["sources"]
            if source["id"] != "10.1083/jcb.134.6.1441"
        ],
    ),
    expected_output="all cross-tissue and isolated-structure sources retain reviewed transfer classifications",
)
expect_rejected(
    "admitted source missing authors",
    mutate_references=lambda references: references["10.1038/nature04343"].pop("authors"),
    expected_output="admitted source has complete citation metadata",
)
expect_rejected(
    "admitted source DOI mismatch",
    mutate_references=lambda references: references["10.1038/embor.2010.65"].__setitem__(
        "doi", "10.0000/wrong-doi"
    ),
    expected_output="DOI is directly linkable",
)

print("ALL SC-0 NEGATIVE CONTROLS PASSED (18 mutations)")
