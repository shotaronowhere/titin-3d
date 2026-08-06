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


def chapter(payload, chapter_id):
    """Look chapters up by ID: index-based controls silently stop testing what they
    were written for as soon as the guided route is reordered."""
    return next(row for row in payload["guided_chapters"] if row["id"] == chapter_id)


def card(payload, card_id):
    return next(row for row in payload["expert_cards"] if row["id"] == card_id)


rejected("duplicate chapter ID",
         lambda p: chapter(p, "architecture").__setitem__("id", "orientation"),
         "duplicate guided chapter")
rejected("unknown narrative target",
         lambda p: chapter(p, "orientation")["target"].__setitem__("id", "not_a_region"),
         "targets unknown")
rejected("missing source closure",
         lambda p: chapter(p, "orientation").__setitem__("source_ids", ["10.invalid/missing"]),
         "unknown source")
rejected("overstated evidence",
         lambda p: chapter(p, "elastic_regions").__setitem__("evidence_class", "MEASURED"),
         "stronger than target")
rejected("chapter targeting a deferred claim",
         lambda p: chapter(p, "orientation").__setitem__(
             "target_claim_id", "thin_filament_regulation_layer"),
         "targets non-admitted claim")
rejected("dense single-sentence chapter summary",
         lambda p: chapter(p, "orientation").__setitem__(
             "lay_summary", " ".join(["titin"] * 40)),
         "sentences; expected 2-3")
rejected("chapter summary with an overlong sentence",
         lambda p: chapter(p, "orientation").__setitem__(
             "lay_summary", " ".join(["titin"] * 34) + ". And a short second one."),
         "word sentence; expected at most 30")
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
         lambda p: card(p, "mybpc_scope_card").__setitem__("audience", "guided"),
         "must be Evidence-mode only")
rejected("expert card without a non-claim",
         lambda p: card(p, "mybpc_scope_card").__setitem__("not_claimed", []),
         "needs explicit not-claimed text")
rejected("expert card citing a missing source",
         lambda p: card(p, "aband_scaffold_card").__setitem__("source_ids", ["10.invalid/missing"]),
         "unknown source")
rejected("expert card bound to a structure the runtime cannot select",
         lambda p: card(p, "n2a_hub_card").__setitem__(
             "related_target_ids", ["not_a_structure"]),
         "unknown related target")
rejected("expert card unreachable from any structure",
         lambda p: card(p, "n2a_hub_card").__setitem__("related_target_ids", []),
         "must name at least one related target")
rejected("expert card with no established/proposed split",
         lambda p: card(p, "kinase_signaling_card").__setitem__("findings", []),
         "must separate its findings by status")
rejected("expert card inventing a finding status",
         lambda p: card(p, "kinase_signaling_card")["findings"][0].__setitem__(
             "status", "SETTLED"),
         "invalid finding status")
rejected("proposed mechanism presented as established",
         lambda p: card(p, "length_activation_card").__setitem__(
             "findings", [row for row in card(p, "length_activation_card")["findings"]
                          if row["status"] != "PROPOSED"]),
         "marks nothing PROPOSED")
rejected("guided tour stretched past its declared window",
         lambda p: p["tour_pacing"].__setitem__("chapter_transition_seconds", 60),
         "outside the declared")
rejected("tour pacing without a stated basis",
         lambda p: p["tour_pacing"].__setitem__("basis", ""),
         "stated basis")

assert json.loads(SOURCE.read_text(encoding="utf-8")) == BASE, "source presentation record changed"
print("PRESENTATION NEGATIVE CONTROLS PASSED")
