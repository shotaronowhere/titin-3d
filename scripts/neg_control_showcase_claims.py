#!/usr/bin/env python3
"""Prove that the SC-0 showcase contract rejects representative scope drift."""

import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "showcase_claims.json"
VALIDATOR = ROOT / "scripts" / "validate_showcase_claims.py"


with SOURCE.open(encoding="utf-8") as handle:
    baseline = json.load(handle)


def object_by_id(record, object_id):
    return next(obj for obj in record["objects"] if obj["id"] == object_id)


def expect_rejected(name, mutate):
    record = copy.deepcopy(baseline)
    mutate(record)
    with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8") as handle:
        json.dump(record, handle)
        handle.flush()
        completed = subprocess.run(
            [sys.executable, str(VALIDATOR), "--claims", handle.name],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    if completed.returncode == 0:
        raise AssertionError(f"negative control was accepted: {name}")
    print(f"  PASS rejected {name}")


print("== SC-0 destructive negative controls ==")
expect_rejected("cardiac titin mode", lambda record: record["scope_lock"].__setitem__("cardiac_titin_mode", True))
expect_rejected(
    "MyBP-C promoted above schematic",
    lambda record: object_by_id(record, "mybpc_czone_context").update(
        {"decision": "ADMIT", "render_evidence_class": "MEASURED"}
    ),
)
expect_rejected(
    "M1 density admitted",
    lambda record: object_by_id(record, "mband_m1_density").__setitem__("decision", "ADMIT"),
)
expect_rejected(
    "dangling citation",
    lambda record: object_by_id(record, "titin_continuity_trace")["sources"][0].__setitem__(
        "id", "10.0000/not-a-source"
    ),
)
expect_rejected(
    "copied source figure",
    lambda record: object_by_id(record, "zdisc_local_network").__setitem__(
        "asset_policy", "COPY_SOURCE_FIGURE"
    ),
)

print("ALL SC-0 NEGATIVE CONTROLS PASSED")
