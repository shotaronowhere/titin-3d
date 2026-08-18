#!/usr/bin/env python3
"""SC-24 destructive controls for compact teaching-scene records."""

from __future__ import annotations

import json
import subprocess
import tempfile
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VALIDATOR = ROOT / "scripts/validate_presentation.py"
PRESENTATION_SOURCE = ROOT / "data/presentation.json"
SCENES_SOURCE = ROOT / "data/scenes.json"
BASE_PRESENTATION = json.loads(PRESENTATION_SOURCE.read_text(encoding="utf-8"))
BASE_SCENES = json.loads(SCENES_SOURCE.read_text(encoding="utf-8"))


def rejected(label, mutate, expected):
    scenes = deepcopy(BASE_SCENES)
    mutate(scenes)
    with tempfile.TemporaryDirectory(prefix="titin-sc24-negative-") as folder:
        scenes_path = Path(folder) / "scenes.json"
        scenes_path.write_text(json.dumps(scenes), encoding="utf-8")
        result = subprocess.run(
            ["python3", str(VALIDATOR), "--presentation", str(PRESENTATION_SOURCE),
             "--scenes", str(scenes_path)],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
    assert result.returncode != 0, f"{label}: corrupted record passed"
    assert expected.lower() in result.stdout.lower(), (
        f"{label}: expected '{expected}' in validator output\n{result.stdout}"
    )
    print(f"  PASS {label} rejected")


rejected(
    "missing required control scene",
    lambda scenes: scenes["control_scenes"].pop("spring"),
    "every required control scene exactly once",
)
rejected(
    "unresolved control-scene claim",
    lambda scenes: scenes["control_scenes"]["overview"]["claim_ids"].append("invented_claim"),
    "unresolved or duplicate claim_ids",
)
rejected(
    "duplicate control-scene claim",
    lambda scenes: scenes["control_scenes"]["overview"]["claim_ids"].append(
        scenes["control_scenes"]["overview"]["claim_ids"][0]),
    "unresolved or duplicate claim_ids",
)
rejected(
    "scale/context contradiction",
    lambda scenes: scenes["control_scenes"]["titin_alone"].__setitem__("context", True),
    "inconsistent scale/context",
)
rejected(
    "ambiguous lattice ring count",
    lambda scenes: scenes["control_scenes"]["lattice"]["layers"].__setitem__(
        "lattice_rings_2", True),
    "exactly one lattice ring count",
)
rejected(
    "close-up without required detail",
    lambda scenes: scenes["control_scenes"]["architecture"]["layers"].__setitem__(
        "show_context_detail", False),
    "close-up requires lattice and context detail",
)
rejected(
    "scientific coordinate smuggled into control scene",
    lambda scenes: scenes["control_scenes"]["overview"].__setitem__("coordinate_nm", 2200),
    "forbidden field",
)

assert json.loads(PRESENTATION_SOURCE.read_text(encoding="utf-8")) == BASE_PRESENTATION
assert json.loads(SCENES_SOURCE.read_text(encoding="utf-8")) == BASE_SCENES
print("SC-24 NEGATIVE CONTROLS PASSED")
