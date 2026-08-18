#!/usr/bin/env python3
"""SC-25 destructive controls for the reviewed pick-priority policy and hit grid.

Each mutation is a way the picking contract could be weakened silently: a proxy
that renders, a tolerance chosen instead of derived, a resolution order quietly
reordered, a selection allowed to steer a ray, or a hit grid hand-edited into
passing. Every one must be rejected by a validator or by the SC-25 gate, and the
sources on disk must be unchanged afterwards.
"""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STYLE_PATH = ROOT / "data/render_style.json"
FIXTURE_PATH = ROOT / "test/fixtures/picking_hit_grid.json"
RESOLVER_PATH = ROOT / "src/render/PickPriority.js"
BASE_STYLE = json.loads(STYLE_PATH.read_text(encoding="utf-8"))
BASE_FIXTURE = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
BASE_RESOLVER = RESOLVER_PATH.read_text(encoding="utf-8")

import sys

sys.path.insert(0, str(ROOT / "scripts"))
from validate_render_style import validate  # noqa: E402


def style_rejected(label, mutate, expected):
    """A render-style mutation must fail the SC-20/25 style validator."""
    style = deepcopy(BASE_STYLE)
    mutate(style)
    titin = json.loads((ROOT / "data/titin.json").read_text(encoding="utf-8"))
    renderer = (ROOT / "src/render/SarcomereScene.js").read_text(encoding="utf-8")
    problems = validate(style, titin, renderer, BASE_RESOLVER)
    assert problems, f"{label}: corrupted picking policy passed"
    joined = " ".join(problems).lower()
    assert expected.lower() in joined, (
        f"{label}: expected '{expected}' in validator output\n" + "\n".join(problems)
    )
    print(f"  PASS {label} rejected")


def resolver_rejected(label, mutate, expected):
    """A resolver that drops a reviewed reason code must fail the same validator."""
    resolver = mutate(BASE_RESOLVER)
    titin = json.loads((ROOT / "data/titin.json").read_text(encoding="utf-8"))
    renderer = (ROOT / "src/render/SarcomereScene.js").read_text(encoding="utf-8")
    problems = validate(deepcopy(BASE_STYLE), titin, renderer, resolver)
    assert problems, f"{label}: corrupted resolver passed"
    joined = " ".join(problems).lower()
    assert expected.lower() in joined, (
        f"{label}: expected '{expected}' in validator output\n" + "\n".join(problems)
    )
    print(f"  PASS {label} rejected")


def fixture_rejected(label, mutate, expected):
    """A hand-edited hit grid must fail the bounded SC-25 Node gate."""
    fixture = deepcopy(BASE_FIXTURE)
    mutate(fixture)
    with tempfile.TemporaryDirectory(prefix="titin-sc25-negative-") as folder:
        backup = FIXTURE_PATH.read_text(encoding="utf-8")
        try:
            FIXTURE_PATH.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
            result = subprocess.run(
                ["node", "--test", "--test-concurrency=1", "test/showcase_phase25.test.js"],
                cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                check=False,
            )
        finally:
            FIXTURE_PATH.write_text(backup, encoding="utf-8")
    assert result.returncode != 0, f"{label}: hand-edited fixture passed the gate"
    assert re.search(expected, result.stdout, re.I | re.S), (
        f"{label}: expected /{expected}/ in gate output\n{result.stdout[-3000:]}"
    )
    print(f"  PASS {label} rejected")


print("== SC-25 picking policy ==")
style_rejected(
    "pick proxy allowed to render",
    lambda style: style["titin"]["picking"].__setitem__("pick_proxy_rendered", True),
    "must be declared false",
)
style_rejected(
    "pick proxy counted as geometry",
    lambda style: style["titin"]["picking"].__setitem__("pick_proxy_counted_in_geometry", True),
    "must be declared false",
)
style_rejected(
    "selection allowed to steer a ray",
    lambda style: style["titin"]["picking"].__setitem__("selection_influences_resolution", True),
    "must be declared false",
)
style_rejected(
    "decoration made pickable",
    lambda style: style["titin"]["picking"].__setitem__("decorative_channels_pickable", True),
    "must be declared false",
)
style_rejected(
    "tolerance chosen instead of derived",
    lambda style: style["titin"]["picking"].__setitem__("emphasized_titin_tolerance_px", 40),
    "must be derived from the proxy width",
)
style_rejected(
    "reordered resolution policy",
    lambda style: style["titin"]["picking"].__setitem__("priority_order", [
        "nearest_visible_surface", "emphasized_titin_within_tolerance",
        "explicit_target", "pick_proxy_only",
    ]),
    "not the reviewed resolution order",
)
style_rejected(
    "proxies moved onto the rendered layer",
    lambda style: style["titin"]["picking"].__setitem__("pick_proxy_layer", 0),
    "dedicated non-default layer",
)
style_rejected(
    "titin emphasis widened beyond the Learn depth",
    lambda style: style["titin"]["picking"].__setitem__("emphasis_depth", "any"),
    "scoped to the learn depth",
)
style_rejected(
    "trace drawn wider than the tolerance admits",
    lambda style: style["titin"].__setitem__("trace_px", 40),
    "exceeds the reviewed tolerance",
)
style_rejected(
    "picking policy removed entirely",
    lambda style: style["titin"].pop("picking"),
    "declares no sc-25 picking policy",
)
resolver_rejected(
    "resolver renames a reviewed reason code",
    lambda text: text.replace("pick_proxy_only", "fallback"),
    "does not implement reason code pick_proxy_only",
)
resolver_rejected(
    "resolver renames the titin clause",
    lambda text: text.replace("emphasized_titin_within_tolerance", "titin_wins"),
    "does not implement reason code emphasized_titin_within_tolerance",
)
resolver_rejected(
    "resolver reaches for renderer objects",
    lambda text: "import * as THREE from 'three';\n" + text,
    "must stay free of renderer objects",
)

print("\n== SC-25 hit grid ==")
fixture_rejected(
    "intended flag flipped to hide a miss",
    lambda fixture: fixture["ring_samples"][-1].__setitem__("intended_titin_hit", True),
    r"ring_samples|intended",
)
fixture_rejected(
    "a sample offset nudged off the declared spacing",
    lambda fixture: fixture["scenes"][0]["path_offsets"][1].__setitem__(1, 7.5),
    r"not a multiple of",
)
fixture_rejected(
    "coverage inflated by editing the totals",
    lambda fixture: fixture["totals"].__setitem__("intended", 1),
    r"totals|intended",
)
fixture_rejected(
    "the intended radius widened past the reviewed tolerance",
    lambda fixture: fixture["rules"].__setitem__("intended_hit_max_ring_px", 40),
    r"rules|tolerance",
)
fixture_rejected(
    "an offset attributed to a path the scene does not sample",
    lambda fixture: fixture["scenes"][0]["path_offsets"][0].__setitem__(0, "invented_region"),
    r"unknown path|undeclared",
)
fixture_rejected(
    "a migration recorded without saying what changed",
    lambda fixture: fixture["contract"]["migrations"].append({"on": "2026-01-01"}),
    r"migration entry must state",
)

assert json.loads(STYLE_PATH.read_text(encoding="utf-8")) == BASE_STYLE
assert json.loads(FIXTURE_PATH.read_text(encoding="utf-8")) == BASE_FIXTURE
assert RESOLVER_PATH.read_text(encoding="utf-8") == BASE_RESOLVER
print("\nSC-25 NEGATIVE CONTROLS PASSED")
