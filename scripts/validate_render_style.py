#!/usr/bin/env python3
"""Validate SC-20's deterministic, non-scientific render-style descriptor."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STYLE_PATH = ROOT / "data/render_style.json"
TITIN_PATH = ROOT / "data/titin.json"
RENDERER_PATH = ROOT / "src/render/SarcomereScene.js"


def pointer(value, raw: str):
    node = value
    for token in raw.split("#", 1)[1].split("/")[1:]:
        token = token.replace("~1", "/").replace("~0", "~")
        node = node[int(token)] if isinstance(node, list) else node[token]
    return node


def validate(style: dict, titin: dict, renderer: str) -> list[str]:
    problems: list[str] = []
    if style.get("schema") != "titin-render-style/1":
        problems.append("wrong render-style schema")
    if not isinstance(style.get("render_seed"), int) or style["render_seed"] < 0:
        problems.append("render_seed must be a non-negative integer")
    algorithm = style.get("algorithm") or {}
    expected = {
        "id": "seeded-irregular-ensemble-ribbon",
        "version": 1,
        "prng": "mulberry32",
        "seed_derivation": "FNV-1a(render_seed, region_id, strand_index)",
        "control_points": 25,
    }
    for key, value in expected.items():
        if algorithm.get(key) != value:
            problems.append(f"algorithm.{key} must be {value!r}")
    if "canonical endpoints" not in str(algorithm.get("endpoint_policy", "")):
        problems.append("algorithm must promise exact canonical endpoints")

    render = style.get("titin") or {}
    ribbon = render.get("irregular_ribbon") or {}
    numeric_positive = [
        "guided_radius_scale", "disordered_radius_scale", "trace_px",
        "trace_px_evidence", "halo_radius_scale", "linker_radius_fraction",
    ]
    for key in numeric_positive:
        if not isinstance(render.get(key), (int, float)) or render[key] <= 0:
            problems.append(f"titin.{key} must be positive")
    if ribbon.get("evidence_class") != "SCHEMATIC" or not ribbon.get("not_claimed"):
        problems.append("irregular ribbon must be SCHEMATIC with explicit non-claims")
    if ribbon.get("maximum_transverse_envelope_radius_scale") != ribbon.get("amplitude_scale"):
        problems.append("declared transverse envelope must equal the enforced amplitude scale")
    if not (0 <= ribbon.get("radial_floor_fraction", -1) <= 1
            and 0 <= ribbon.get("radial_jitter_fraction", -1) <= 1
            and abs(ribbon.get("radial_floor_fraction", 0)
                    + ribbon.get("radial_jitter_fraction", 0) - 1) < 1e-12):
        problems.append("radial floor+jitter fractions must partition [0,1]")

    rows = render.get("disordered_regions") or []
    by_id = {row.get("id"): row for row in rows}
    if set(by_id) != {"N2A", "post_N2A_unknown", "PEVK"} or len(rows) != 3:
        problems.append("render style must name exactly N2A, post_N2A_unknown, and PEVK")
    for region_id, row in by_id.items():
        source = row.get("contour_source")
        if source is None:
            if region_id != "post_N2A_unknown" or row.get("fallback_slack_fraction") != 1.0:
                problems.append(f"{region_id} lacks a valid explicit UNKNOWN fallback")
            continue
        if not source.startswith("data/titin.json#"):
            problems.append(f"{region_id} contour source is not a titin.json pointer")
            continue
        try:
            value = pointer(titin, source)
        except (KeyError, IndexError, ValueError):
            problems.append(f"{region_id} contour pointer is stale")
        else:
            if not isinstance(value, (int, float)) or value <= 0:
                problems.append(f"{region_id} contour pointer is not positive")

    if re.search(r"Math\.random|Date\.now|performance\.now", renderer):
        problems.append("renderer uses ambient randomness or time")
    if "export const TITIN_RENDER_STYLE" in renderer:
        problems.append("renderer duplicates canonical render-style values")
    for token in ("fnv1a", "mulberry32", "render_style", "canonical_endpoints_nm"):
        if token not in renderer:
            problems.append(f"renderer lacks deterministic descriptor token {token}")
    return problems


def main() -> None:
    style = json.loads(STYLE_PATH.read_text(encoding="utf-8"))
    titin = json.loads(TITIN_PATH.read_text(encoding="utf-8"))
    renderer = RENDERER_PATH.read_text(encoding="utf-8")
    problems = validate(style, titin, renderer)
    if problems:
        print("SC-20 render-style validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    print("SC-20 render style: PASS (seeded, bounded, endpoint-preserving, SCHEMATIC)")


if __name__ == "__main__":
    main()
