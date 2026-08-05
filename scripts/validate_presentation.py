#!/usr/bin/env python3
"""Validate the SC-1 presentation record independently of browser runtime."""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
RANK = {
    "MEASURED": 0,
    "STRONGLY INFERRED": 1,
    "MODELED": 2,
    "INFERRED": 3,
    "SCHEMATIC": 4,
    "UNKNOWN": 5,
}
PRESENTATION_FEATURES = {
    "continuity_trace", "band_brackets", "termini", "region_extension_chart",
}


def load(path):
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def base_evidence(value):
    text = str(value or "").strip()
    return next((key for key in sorted(RANK, key=len, reverse=True) if text.startswith(key)), None)


def validate(presentation_path):
    p = load(presentation_path)
    claims = load(DATA / "showcase_claims.json")
    references = load(DATA / "references.json")
    sarcomere = load(DATA / "sarcomere.json")
    titin = load(DATA / "titin.json")
    states = load(DATA / "structural_states.json")["states"]
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    require(p.get("schema") == "titin-presentation/1", "unsupported presentation schema")
    collections = [
        ("audience mode", p.get("audience_modes")),
        ("scope badge", p.get("scope_badges")),
        ("length preset", p.get("length_presets")),
        ("guided chapter", p.get("guided_chapters")),
        ("expert card", p.get("expert_cards")),
        ("presenter shortcut", p.get("presenter_shortcuts")),
    ]
    global_ids = {}
    for kind, records in collections:
        require(isinstance(records, list) and bool(records), f"{kind} records missing or empty")
        local = set()
        for record in records or []:
            rid = record.get("id")
            require(bool(rid), f"{kind} missing id")
            if not rid:
                continue
            require(rid not in local, f"duplicate {kind} id '{rid}'")
            local.add(rid)
            require(rid not in global_ids, f"id '{rid}' duplicates {global_ids.get(rid)}")
            global_ids[rid] = kind
            if kind == "audience mode":
                require(bool(record.get("label")) and bool(record.get("description")),
                        f"audience mode '{rid}' needs label and description")

    modes = {row.get("id") for row in p.get("audience_modes", [])}
    require(modes == {"guided", "evidence"}, "audience modes must be exactly guided and evidence")
    claim_map = {row["id"]: row for row in claims.get("objects", [])}
    region_ids = {row["id"] for row in titin.get("regions", [])}
    component_ids = {row["id"] for row in sarcomere.get("components", [])} | {"titin"}
    reference_ids = set(references)

    working = p.get("scope", {}).get("working_range_nm")
    require(isinstance(working, list) and len(working) == 2
            and all(isinstance(x, (int, float)) for x in working)
            and working[0] < working[1], "working_range_nm must contain increasing numeric bounds")
    require(p.get("scope", {}).get("activation_independent") is True
            and bool(p.get("scope", {}).get("activation_statement")),
            "sarcomere length must be explicitly independent of activation")

    def validate_scientific(record, kind):
        target_id = record.get("target_claim_id")
        target = claim_map.get(target_id)
        require(target is not None, f"{kind} '{record.get('id')}' has unknown target claim '{target_id}'")
        if target:
            require(str(target.get("decision", "")).startswith("ADMIT"),
                    f"{kind} '{record.get('id')}' targets non-admitted claim '{target_id}'")
        evidence = base_evidence(record.get("evidence_class"))
        require(evidence is not None, f"{kind} '{record.get('id')}' has invalid evidence class")
        target_evidence = base_evidence(target.get("claim_evidence_class")) if target else None
        if evidence and target_evidence:
            require(RANK[evidence] >= RANK[target_evidence],
                    f"{kind} '{record.get('id')}' is stronger than target claim '{target_id}'")
        sources = record.get("source_ids") or []
        require(bool(sources) or evidence == "SCHEMATIC",
                f"{kind} '{record.get('id')}' has scientific text without sources or SCHEMATIC")
        for source in sources:
            require(source in reference_ids,
                    f"{kind} '{record.get('id')}' cites unknown source '{source}'")

    validate_scientific(p.get("scope", {}), "scope")
    for badge in p.get("scope_badges", []):
        validate_scientific(badge, "scope badge")
        require(bool(badge.get("label")) and bool(badge.get("state_template")),
                f"scope badge '{badge.get('id')}' needs label and state_template")

    represented_states = set()
    for preset in p.get("length_presets", []):
        validate_scientific(preset, "length preset")
        state_id = preset.get("structural_state_id")
        state = states.get(state_id)
        require(state is not None, f"length preset '{preset.get('id')}' has unknown state '{state_id}'")
        if state:
            require(state["sarcomere_length_nm"] == preset.get("sarcomere_length_nm"),
                    f"length preset '{preset.get('id')}' does not match state length")
        require(state_id not in represented_states, f"state '{state_id}' has duplicate presets")
        represented_states.add(state_id)
        if isinstance(working, list) and len(working) == 2:
            outside = (preset.get("sarcomere_length_nm", 0) < working[0]
                       or preset.get("sarcomere_length_nm", 0) > working[1])
            require(preset.get("outside_working_range") is outside,
                    f"length preset '{preset.get('id')}' has wrong out-of-range flag")
            if outside:
                require("OUTSIDE WORKING RANGE" in preset.get("status_label", ""),
                        f"length preset '{preset.get('id')}' hides its out-of-range status")
        require(preset.get("activation_independent") is True and bool(preset.get("explanation")),
                f"length preset '{preset.get('id')}' does not separate geometry from activation")
        require(bool(preset.get("label")) and bool(preset.get("status_label")),
                f"length preset '{preset.get('id')}' needs visible labels")
    require(represented_states == set(states), "presentation presets must cover every structural state exactly once")

    orders = set()
    model_min = min(row["sarcomere_length_nm"] for row in states.values())
    model_max = max(row["sarcomere_length_nm"] for row in states.values())
    chapter_ids = set()
    for chapter in p.get("guided_chapters", []):
        chapter_ids.add(chapter.get("id"))
        validate_scientific(chapter, "guided chapter")
        order = chapter.get("order")
        require(isinstance(order, int) and order not in orders,
                f"guided chapter '{chapter.get('id')}' has missing or duplicate order")
        orders.add(order)
        target = chapter.get("target") or {}
        known = region_ids if target.get("kind") == "region" else (
            component_ids if target.get("kind") == "component" else None)
        require(known is not None, f"guided chapter '{chapter.get('id')}' has invalid target kind")
        if known is not None:
            require(target.get("id") in known,
                    f"guided chapter '{chapter.get('id')}' targets unknown {target.get('kind')} '{target.get('id')}'")
        words = len(re.findall(r"\S+", chapter.get("lay_summary", "")))
        require(25 <= words <= 45,
                f"guided chapter '{chapter.get('id')}' lay summary has {words} words; expected 25-45")
        require(bool(chapter.get("expert_expansion")) and bool(chapter.get("not_claimed")),
                f"guided chapter '{chapter.get('id')}' lacks expert or not-claimed text")
        features = chapter.get("presentation_features")
        require(isinstance(features, list) and bool(features)
                and all(feature in PRESENTATION_FEATURES for feature in features),
                f"guided chapter '{chapter.get('id')}' has invalid presentation_features")
        scene = chapter.get("recommended_state") or {}
        length = scene.get("sarcomere_length_nm")
        require(isinstance(length, (int, float)) and model_min <= length <= model_max,
                f"guided chapter '{chapter.get('id')}' has out-of-model length")
        require(scene.get("scale") in {"context", "detail"},
                f"guided chapter '{chapter.get('id')}' has invalid scale")
        require(bool(re.fullmatch(r"(view|closeup|region)\.[A-Za-z0-9_]+", scene.get("camera_preset", ""))),
                f"guided chapter '{chapter.get('id')}' has invalid camera preset")
        require(scene.get("selected_component_or_region") == target.get("id"),
                f"guided chapter '{chapter.get('id')}' selection differs from target")
        visibility = scene.get("visibility") or {}
        for field in ("show_lattice", "show_domains", "show_context_detail", "mirror"):
            require(type(visibility.get(field)) is bool,
                    f"guided chapter '{chapter.get('id')}' visibility.{field} must be boolean")
        require(type(visibility.get("rings")) is int and visibility["rings"] >= 1,
                f"guided chapter '{chapter.get('id')}' visibility.rings must be positive integer")

    for card in p.get("expert_cards", []):
        validate_scientific(card, "expert card")
        require(card.get("audience") == "evidence",
                f"expert card '{card.get('id')}' must be Evidence-mode only")
        require(bool(str(card.get("title", "")).strip()) and bool(str(card.get("body", "")).strip()),
                f"expert card '{card.get('id')}' needs visible title and body")
        not_claimed = card.get("not_claimed")
        require(isinstance(not_claimed, list) and bool(not_claimed)
                and all(str(entry).strip() for entry in not_claimed),
                f"expert card '{card.get('id')}' needs explicit not-claimed text")
    mybpc_claim = claim_map.get("mybpc_czone_context")
    if mybpc_claim and str(mybpc_claim.get("decision", "")).startswith("ADMIT"):
        require(any(card.get("target_claim_id") == "mybpc_czone_context"
                    for card in p.get("expert_cards", [])),
                "an admitted MyBP-C layer requires an Evidence-mode expert card explaining its scope limits")

    initial = p.get("initial_state") or {}
    require(initial.get("audience_mode") in modes, "initial_state has unknown audience mode")
    require(initial.get("story_step") in chapter_ids, "initial_state has unknown story step")
    require(not (initial.get("audience_mode") == "guided" and initial.get("evidence_display") is not False),
            "initial Guided state must hide evidence inventory")
    initial_target = initial.get("selected_component_or_region")
    require(initial_target is None or initial_target in region_ids or initial_target in component_ids,
            f"initial_state has unknown target '{initial_target}'")
    initial_length = initial.get("sarcomere_length_nm")
    require(isinstance(initial_length, (int, float)) and model_min <= initial_length <= model_max,
            "initial_state has out-of-model length")
    require(initial.get("scale") in {"context", "detail"}, "initial_state has invalid scale")
    require(bool(re.fullmatch(r"(view|closeup|region)\.[A-Za-z0-9_]+", initial.get("camera_preset", ""))),
            "initial_state has invalid camera preset")
    require(type(initial.get("evidence_display")) is bool,
            "initial_state evidence_display must be boolean")

    shortcut_ids = {row.get("id") for row in p.get("presenter_shortcuts", [])}
    require(len(shortcut_ids) == len(p.get("presenter_shortcuts", [])), "presenter shortcut IDs must be unique")
    for shortcut in p.get("presenter_shortcuts", []):
        require(bool(shortcut.get("label")), f"presenter shortcut '{shortcut.get('id')}' needs a label")
        action = shortcut.get("action", "")
        valid = action == "mode.evidence" or (
            action.startswith("story.") and action.removeprefix("story.") in chapter_ids)
        require(valid, f"presenter shortcut '{shortcut.get('id')}' has invalid action '{action}'")

    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--presentation", default=DATA / "presentation.json", type=Path)
    args = parser.parse_args()
    errors = validate(args.presentation)
    if errors:
        print(f"PRESENTATION VALIDATION FAILED ({len(errors)} problem(s))")
        for error in errors:
            print(f"  FAIL {error}")
        return 1
    print("PRESENTATION VALIDATION PASSED")
    print("  PASS required IDs, targets, sources, evidence strength, scope, presets, chapters, expert cards and shortcuts")
    return 0


if __name__ == "__main__":
    sys.exit(main())
