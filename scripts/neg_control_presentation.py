#!/usr/bin/env python3
"""Destructive controls proving the SC-1 presentation validator fails closed."""

import json
import subprocess
import tempfile
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "presentation.json"
VALIDATOR = ROOT / "scripts" / "validate_presentation.py"
BASE = json.loads(SOURCE.read_text(encoding="utf-8"))


def rejected(label, mutate, expected):
    payload = deepcopy(BASE)
    mutate(payload)
    with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as handle:
        json.dump(payload, handle)
        path = Path(handle.name)
    try:
        result = subprocess.run(
            ["python3", str(VALIDATOR), "--presentation", str(path)],
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
    finally:
        path.unlink(missing_ok=True)


rejected("duplicate chapter ID",
         lambda p: p["guided_chapters"].__setitem__(1, {
             **p["guided_chapters"][1], "id": p["guided_chapters"][0]["id"]}),
         "duplicate guided chapter")
rejected("unknown narrative target",
         lambda p: p["guided_chapters"][0]["target"].__setitem__("id", "not_a_region"),
         "targets unknown")
rejected("missing source closure",
         lambda p: p["guided_chapters"][0].__setitem__("source_ids", ["10.invalid/missing"]),
         "unknown source")
rejected("overstated evidence",
         lambda p: p["guided_chapters"][1].__setitem__("evidence_class", "MEASURED"),
         "stronger than target")
rejected("hidden out-of-range state",
         lambda p: p["length_presets"][3].__setitem__("outside_working_range", False),
         "wrong out-of-range flag")
rejected("guided raw evidence",
         lambda p: p["initial_state"].__setitem__("evidence_display", True),
         "must hide evidence")
rejected("invalid chapter visibility",
         lambda p: p["guided_chapters"][0]["recommended_state"]["visibility"].__setitem__("rings", 0),
         "rings must be positive")
rejected("invalid initial target",
         lambda p: p["initial_state"].__setitem__("selected_component_or_region", "ghost_region"),
         "unknown target")
rejected("MyBP-C scope card deleted",
         lambda p: p.__setitem__("expert_cards", [
             card for card in p["expert_cards"]
             if card["target_claim_id"] != "mybpc_czone_context"]),
         "requires an Evidence-mode expert card")
rejected("expert card promoted into Guided mode",
         lambda p: p["expert_cards"][1].__setitem__("audience", "guided"),
         "must be Evidence-mode only")
rejected("expert card without a non-claim",
         lambda p: p["expert_cards"][1].__setitem__("not_claimed", []),
         "needs explicit not-claimed text")
rejected("expert card citing a missing source",
         lambda p: p["expert_cards"][0].__setitem__("source_ids", ["10.invalid/missing"]),
         "unknown source")

assert json.loads(SOURCE.read_text(encoding="utf-8")) == BASE, "source presentation record changed"
print("PRESENTATION NEGATIVE CONTROLS PASSED")
