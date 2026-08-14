#!/usr/bin/env python3
"""SC-23 destructive controls for curriculum, aliases, scenes, and review status."""

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
    presentation = deepcopy(BASE_PRESENTATION)
    scenes = deepcopy(BASE_SCENES)
    mutate(presentation, scenes)
    with tempfile.TemporaryDirectory(prefix="titin-sc23-negative-") as folder:
        folder_path = Path(folder)
        presentation_path = folder_path / "presentation.json"
        scenes_path = folder_path / "scenes.json"
        presentation_path.write_text(json.dumps(presentation), encoding="utf-8")
        scenes_path.write_text(json.dumps(scenes), encoding="utf-8")
        result = subprocess.run(
            ["python3", str(VALIDATOR), "--presentation", str(presentation_path),
             "--scenes", str(scenes_path)],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
    assert result.returncode != 0, f"{label}: corrupted records passed"
    assert expected.lower() in result.stdout.lower(), (
        f"{label}: expected '{expected}' in validator output\n{result.stdout}"
    )
    print(f"  PASS {label} rejected")


def chapter(presentation, chapter_id):
    return next(row for row in presentation["guided_chapters"] if row["id"] == chapter_id)


rejected(
    "invented semantic scene ID",
    lambda presentation, _scenes: chapter(presentation, "meet_sarcomere").__setitem__(
        "semantic_scene_id", "invented_scene"),
    "one-to-one",
)
rejected(
    "scientific coordinate smuggled into scene",
    lambda _presentation, scenes: scenes["scenes"]["meet_sarcomere"].__setitem__(
        "coordinate_nm", 2200),
    "forbidden field",
)
rejected(
    "undeclared numeric scene constant",
    lambda _presentation, scenes: scenes["scenes"]["meet_sarcomere"].__setitem__(
        "spacing", 43.78),
    "unexpected fields",
)
rejected(
    "numeric value in admitted scene field",
    lambda _presentation, scenes: scenes["scenes"]["meet_sarcomere"].__setitem__(
        "label", 43.78),
    "forbidden numeric scientific value",
)
rejected(
    "evidence class smuggled into scene value",
    lambda _presentation, scenes: scenes["scenes"]["meet_sarcomere"].__setitem__(
        "label", "MEASURED"),
    "forbidden evidence-class value",
)
rejected(
    "scene camera drift",
    lambda _presentation, scenes: scenes["scenes"]["stretch_spring"].__setitem__(
        "camera_preset", "view.longitudinal"),
    "drifts from its chapter",
)
rejected(
    "unresolved scene claim",
    lambda _presentation, scenes: scenes["scenes"]["knowledge_recap"]["claim_ids"].append(
        "invented_claim"),
    "unresolved claim_ids",
)
rejected(
    "legacy alias drift",
    lambda presentation, _scenes: presentation["chapter_aliases"]["aliases"].__setitem__(
        "orientation", "follow_titin"),
    "must match exactly",
)
rejected(
    "opening motor concept removed",
    lambda presentation, _scenes: chapter(presentation, "meet_sarcomere").__setitem__(
        "narration", "A sarcomere is a repeating contractile unit between Z-discs. Titin is shown."),
    "misses required SC-23 concept",
)
rejected(
    "approved content falsely marked blocked",
    lambda presentation, _scenes: presentation["meta"].__setitem__(
        "status", "CODE_COMPLETE_BLOCKED_CONTENT_REVIEW"),
    "requires meta.status COMPLETE",
)

assert json.loads(PRESENTATION_SOURCE.read_text(encoding="utf-8")) == BASE_PRESENTATION
assert json.loads(SCENES_SOURCE.read_text(encoding="utf-8")) == BASE_SCENES
print("SC-23 NEGATIVE CONTROLS PASSED")
