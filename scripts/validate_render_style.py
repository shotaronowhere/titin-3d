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
RESOLVER_PATH = ROOT / "src/render/PickPriority.js"
VIEWER_PATH = ROOT / "src/render/Viewer.js"

# SC-25. The reviewed resolution order, in the record's own words. A renamed or
# reordered stage is a change of policy, not of wording, so it fails here.
PICK_PRIORITY_ORDER = [
    "explicit_target",
    "emphasized_titin_within_tolerance",
    "nearest_visible_surface",
    "pick_proxy_only",
]


def relative_luminance(value: str) -> float:
    channels = [int(value[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [channel / 12.92 if channel <= 0.04045
              else ((channel + 0.055) / 1.055) ** 2.4 for channel in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(first: str, second: str) -> float:
    a, b = relative_luminance(first), relative_luminance(second)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)


def pointer(value, raw: str):
    node = value
    for token in raw.split("#", 1)[1].split("/")[1:]:
        token = token.replace("~1", "/").replace("~0", "~")
        node = node[int(token)] if isinstance(node, list) else node[token]
    return node


def validate_picking(render: dict, resolver: str, renderer: str) -> list[str]:
    """SC-25 pick-priority policy: reviewed, derived, and non-claiming."""
    problems: list[str] = []
    picking = render.get("picking")
    if not isinstance(picking, dict):
        return ["render style declares no SC-25 picking policy"]
    if picking.get("policy_id") != "titin-first-within-tolerance/1":
        problems.append("picking.policy_id is not the reviewed SC-25 policy")
    if picking.get("priority_order") != PICK_PRIORITY_ORDER:
        problems.append("picking.priority_order is not the reviewed resolution order")
    if picking.get("emphasis_depth") != "learn":
        problems.append("titin pick emphasis must be scoped to the Learn depth")
    widths = {
        key: picking.get(key)
        for key in ("line_pick_threshold_px", "pick_proxy_line_width_px",
                    "emphasized_titin_tolerance_px")
    }
    for key, value in widths.items():
        if not isinstance(value, (int, float)) or value <= 0:
            problems.append(f"picking.{key} must be a positive screen-space width")
    if not problems:
        derived = (widths["pick_proxy_line_width_px"]
                   + widths["line_pick_threshold_px"]) / 2
        if abs(derived - widths["emphasized_titin_tolerance_px"]) > 1e-9:
            problems.append(
                "picking tolerance must be derived from the proxy width and the line "
                "threshold, not chosen independently"
            )
        # The visible trace is the object rule 2 promotes. Its own effective pick
        # half-width may never exceed the tolerance the resolver enforces, or the
        # raycaster would admit hits the reviewed policy does not.
        for key in ("trace_px", "trace_px_evidence"):
            half = (render[key] + widths["line_pick_threshold_px"]) / 2
            if half > widths["emphasized_titin_tolerance_px"] + 1e-9:
                problems.append(f"{key} pick half-width exceeds the reviewed tolerance")
    if picking.get("tolerance_derivation") != \
            "(pick_proxy_line_width_px + line_pick_threshold_px) / 2":
        problems.append("picking tolerance derivation is not stated")
    layer = picking.get("pick_proxy_layer")
    if not isinstance(layer, int) or isinstance(layer, bool) or layer <= 0:
        problems.append("pick proxies need a dedicated non-default layer")
    for key in ("pick_proxy_rendered", "pick_proxy_counted_in_geometry",
                "selection_influences_resolution", "decorative_channels_pickable"):
        if picking.get(key) is not False:
            problems.append(f"picking.{key} must be declared false")
    if not picking.get("not_claimed"):
        problems.append("the picking policy states no explicit non-claims")
    for token in PICK_PRIORITY_ORDER:
        if token not in resolver:
            problems.append(f"the pick resolver does not implement reason code {token}")
    if re.search(r"from\s+['\"]three", resolver):
        problems.append("the pick resolver must stay free of renderer objects")
    for token in ("PICK_PROXY_LAYER", "pick_proxy", "titinPickPaths"):
        if token not in renderer:
            problems.append(f"renderer lacks pick-proxy token {token}")
    return problems


def validate(style: dict, titin: dict, renderer: str, resolver: str = "",
             viewer: str = "") -> list[str]:
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

    presentation = style.get("presentation") or {}
    background = presentation.get("stage_background") or {}
    hex_color = re.compile(r"^#[0-9a-f]{6}$", re.I)
    lightest = background.get("lightest")
    darkest = background.get("darkest")
    if not all(isinstance(value, str) and hex_color.fullmatch(value)
               for value in (lightest, darkest)):
        problems.append("presentation stage background needs two six-digit hex colors")
    else:
        if lightest.lower() != "#0e1116":
            problems.append("the lightest stage background may not become lighter than #0e1116")
        if relative_luminance(darkest) > relative_luminance(lightest):
            problems.append("stage_background.darkest is lighter than stage_background.lightest")
    if background.get("contrast_reference") != "lightest":
        problems.append("declared contrast must use the lightest possible stage background")
    guided = presentation.get("guided_component_colors") or {}
    guided_roles = {
        "thick_filament", "myosin_head", "thin_filament", "zdisc", "mline",
        "alpha_actinin", "telethonin", "mband_crosslink", "mybpc", "lattice_guide",
    }
    if set(guided) != guided_roles or not all(
            isinstance(value, str) and hex_color.fullmatch(value) for value in guided.values()):
        problems.append("presentation guided_component_colors is incomplete or malformed")
    declared = presentation.get("declared_contrast_ratios") or {}
    if isinstance(lightest, str) and hex_color.fullmatch(lightest) and set(guided) == guided_roles:
        measured = {
            "titin_to_lightest_background": contrast("#ff5d7d", lightest),
            "thick_filament_to_lightest_background": contrast(guided["thick_filament"], lightest),
            "myosin_head_to_lightest_background": contrast(guided["myosin_head"], lightest),
            "thin_filament_to_lightest_background": contrast(guided["thin_filament"], lightest),
            "thin_to_thick_filament": contrast(guided["thin_filament"], guided["thick_filament"]),
            "thin_filament_to_myosin_head": contrast(guided["thin_filament"], guided["myosin_head"]),
            "titin_dominance_margin": contrast("#ff5d7d", guided["thin_filament"]),
        }
        for key, value in measured.items():
            if not isinstance(declared.get(key), (int, float)) or abs(declared[key] - value) > 0.002:
                problems.append(f"declared presentation contrast '{key}' does not match 8-bit colors")
        for role in ("thick_filament", "myosin_head", "thin_filament"):
            if contrast(guided[role], lightest) < 1.9:
                problems.append(f"Guided {role} is below the stage contrast floor")
        if contrast(guided["thin_filament"], guided["thick_filament"]) < 1.7 \
                or contrast(guided["thin_filament"], guided["myosin_head"]) < 1.7:
            problems.append("Guided named filament pairs are not luminance-separable")
        if measured["titin_dominance_margin"] < 1.8:
            problems.append("titin does not retain the declared dominance margin")
    emphasis = presentation.get("titin_emphasis") or {}
    contour = emphasis.get("contour") or {}
    if emphasis.get("identity_color", "").lower() != "#ff5d7d":
        problems.append("presentation titin identity color drifted")
    if not isinstance(emphasis.get("halo_opacity_max"), (int, float)):
        problems.append("presentation titin halo has no numeric maximum")
    if not (isinstance(contour.get("color"), str) and hex_color.fullmatch(contour["color"])
            and isinstance(contour.get("width_px"), (int, float))
            and contour["width_px"] > 0 and contour.get("meaning")):
        problems.append("presentation titin contour is incomplete")
    if not presentation.get("not_claimed"):
        problems.append("presentation emphasis needs explicit non-claims")

    render = style.get("titin") or {}
    ribbon = render.get("irregular_ribbon") or {}
    numeric_positive = [
        "guided_radius_scale", "disordered_radius_scale", "trace_px",
        "trace_px_evidence", "halo_radius_scale", "linker_radius_fraction",
    ]
    for key in numeric_positive:
        if not isinstance(render.get(key), (int, float)) or render[key] <= 0:
            problems.append(f"titin.{key} must be positive")
    if isinstance(emphasis.get("halo_opacity_max"), (int, float)) \
            and not (0 < render.get("halo_opacity", 0) <= emphasis["halo_opacity_max"]):
        problems.append("titin halo opacity exceeds the presentation maximum")
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
    # Consumption is asserted behaviorally by the headless scene and browser
    # suites. Raw source-substring checks are intentionally excluded: a token in
    # a comment or dead branch is not evidence that the shipped render uses it.
    problems.extend(validate_picking(render, resolver, renderer))
    return problems


def main() -> None:
    style = json.loads(STYLE_PATH.read_text(encoding="utf-8"))
    titin = json.loads(TITIN_PATH.read_text(encoding="utf-8"))
    renderer = RENDERER_PATH.read_text(encoding="utf-8")
    viewer = VIEWER_PATH.read_text(encoding="utf-8")
    resolver = RESOLVER_PATH.read_text(encoding="utf-8") if RESOLVER_PATH.is_file() else ""
    problems = validate(style, titin, renderer, resolver, viewer)
    if problems:
        print("SC-20 render-style validation failed:\n  - " + "\n  - ".join(problems))
        raise SystemExit(1)
    print("SC-20/25 render style: PASS (seeded, bounded, endpoint-preserving, SCHEMATIC; "
          "reviewed pick priority)")


if __name__ == "__main__":
    main()
