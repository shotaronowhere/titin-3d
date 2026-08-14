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
    "lattice_cross_section", "provenance_pipeline",
}
FINDING_STATUSES = {"ESTABLISHED", "PROPOSED", "OPEN"}
CHAPTER_REQUIRED_FIELDS = {
    "id", "legacy_ids", "title", "learning_objective", "lay_summary", "claim_ids",
    "semantic_scene_id", "source_filter", "state_change_announcement",
    "recommended_state", "next_actions",
}
SCENE_LAYERS = {"show_lattice", "show_domains", "show_context_detail", "mirror"}
SCENE_FIELDS = {
    "label", "available_in", "camera_preset", "scale", "context", "layers",
    "selection", "length_policy", "claim_ids", "source_filter",
}
SCENE_EVIDENCE_VALUES = set(RANK)
SC23_CHAPTER_IDS = [
    "meet_sarcomere", "follow_titin", "molecular_architecture", "stretch_spring",
    "inspect_anchors", "scaffold_thick_filament", "knowledge_recap",
]
SC23_CONCEPT_PATTERNS = {
    "meet_sarcomere": [r"repeating contractile unit.*Z-discs",
                        r"adenosine triphosphate \(ATP\).*myosin.*actin",
                        r"titin.*passive spring.*scaffold.*not the motor"],
    "follow_titin": [r"Z-disc.*M-line", r"I-band.*elastic.*A-band.*thick filament"],
    "molecular_architecture": [r"immunoglobulin-like \(Ig\)",
                               r"fibronectin type III \(Fn3\)",
                               r"disordered PEVK spring",
                               r"does not place Fn3.*elastic I-band"],
    "stretch_spring": [r"I-band lengthens.*A-band.*approximately fixed",
                       r"model predicts rising passive force",
                       r"added length.*incremental compliance.*how readily"],
    "inspect_anchors": [r"telethonin.*not the sole force path", r"M-line.*unresolved"],
    "scaffold_thick_filament": [r"A-band.*thick filament.*scaffold",
                                r"copy number.*azimuth.*register.*not encoded"],
    "knowledge_recap": [r"full Z-disc-to-M-line route",
                        r"passive spring.*scaffold.*interaction/signaling platform",
                        r"Measured comes from observations.*inferred from interpretation"
                        r".*modeled from equations.*schematic means illustrative",
                        r"Replay the stretch.*inspect a region.*open its evidence"],
}


def sentences(text):
    parts = re.split(r"[.!?](?=\s|$)", str(text or ""))
    return [part.strip() for part in parts if part.strip()]


def load(path):
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def base_evidence(value):
    text = str(value or "").strip()
    return next((key for key in sorted(RANK, key=len, reverse=True) if text.startswith(key)), None)


def validate(presentation_path, scenes_path=DATA / "scenes.json"):
    p = load(presentation_path)
    claims = load(DATA / "showcase_claims.json")
    references = load(DATA / "references.json")
    sarcomere = load(DATA / "sarcomere.json")
    titin = load(DATA / "titin.json")
    states = load(DATA / "structural_states.json")["states"]
    annotations = load(DATA / "annotations.json")
    claim_support = load(DATA / "claim_support.json")
    scenes = load(scenes_path)
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    require(p.get("schema") == "titin-presentation/2" and p.get("version") == 2,
            "unsupported presentation schema")
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
    support_ids = {row["id"] for row in claim_support.get("claims", [])}
    support_by_id = {row["id"]: row for row in claim_support.get("claims", [])}
    pending_content_review = [
        claim_id for claim_id in ("sarcomere_definition", "actomyosin_motor_function")
        if ((support_by_id.get(claim_id) or {}).get("review") or {}).get("status") != "APPROVED"
    ]
    require(not pending_content_review
            or (p.get("meta") or {}).get("status") == "CODE_COMPLETE_BLOCKED_CONTENT_REVIEW",
            "presentation content review is pending for "
            + ", ".join(pending_content_review)
            + "; meta.status must be CODE_COMPLETE_BLOCKED_CONTENT_REVIEW")
    require(bool(pending_content_review)
            or (p.get("meta") or {}).get("status") == "COMPLETE",
            "approved SC-23 content requires meta.status COMPLETE")
    region_ids = {row["id"] for row in titin.get("regions", [])}
    # annotations.json carries one record per pickable render component, so it is
    # the data-resident form of the vocabulary the runtime actually offers.
    component_ids = ({row["id"] for row in sarcomere.get("components", [])} | {"titin"}
                     | {row["target_id"] for row in annotations.get("components", [])})
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
        require(badge.get("label_ref") == "scientific_scope.json#/public_badge"
                and "label" not in badge and bool(badge.get("state_template")),
                f"scope badge '{badge.get('id')}' needs the canonical label_ref and state_template")

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
        missing = CHAPTER_REQUIRED_FIELDS - set(chapter)
        require(not missing,
                f"guided chapter '{chapter.get('id')}' lacks required fields {sorted(missing)}")
        validate_scientific(chapter, "guided chapter")
        order = chapter.get("order")
        require(isinstance(order, int) and order not in orders,
                f"guided chapter '{chapter.get('id')}' has missing or duplicate order")
        orders.add(order)
        require(isinstance(chapter.get("legacy_ids"), list),
                f"guided chapter '{chapter.get('id')}' legacy_ids must be an array")
        require(bool(str(chapter.get("learning_objective", "")).strip()),
                f"guided chapter '{chapter.get('id')}' needs a learning objective")
        require(bool(str(chapter.get("expected_learner_takeaway", "")).strip()),
                f"guided chapter '{chapter.get('id')}' needs an expected learner takeaway")
        require(chapter.get("narration") == chapter.get("lay_summary"),
                f"guided chapter '{chapter.get('id')}' narration must equal lay_summary")
        canonical = chapter.get("claim_ids")
        require(isinstance(canonical, list) and bool(canonical)
                and len(canonical) == len(set(canonical))
                and all(claim_id in support_ids for claim_id in canonical),
                f"guided chapter '{chapter.get('id')}' has invalid canonical claim_ids")
        require(chapter.get("target_claim_id") in (canonical or []),
                f"guided chapter '{chapter.get('id')}' claim_ids omit its target claim")
        source_filter = chapter.get("source_filter") or {}
        require(source_filter.get("kind") == "claims"
                and source_filter.get("claim_ids") == canonical,
                f"guided chapter '{chapter.get('id')}' source_filter must use its claim_ids")
        require(bool(str(chapter.get("state_change_announcement", "")).strip())
                and re.search(r"length", chapter.get("state_change_announcement", ""), re.I),
                f"guided chapter '{chapter.get('id')}' must announce its length policy")
        actions = chapter.get("next_actions")
        require(isinstance(actions, list) and bool(actions)
                and len({row.get('id') for row in actions or []}) == len(actions or [])
                and all(row.get("id") and row.get("label") and row.get("action")
                        for row in actions or []),
                f"guided chapter '{chapter.get('id')}' has invalid next_actions")
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
        # A word cap alone permits one 45-word sentence, which is exactly the
        # density the "one main idea" gate is about.
        parts = sentences(chapter.get("lay_summary"))
        require(2 <= len(parts) <= 3,
                f"guided chapter '{chapter.get('id')}' lay summary has {len(parts)} sentences; expected 2-3")
        longest = max((len(re.findall(r"\S+", part)) for part in parts), default=0)
        require(longest <= 30,
                f"guided chapter '{chapter.get('id')}' has a {longest}-word sentence; expected at most 30")
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

    alias_record = p.get("chapter_aliases") or {}
    ordered_chapters = sorted(p.get("guided_chapters", []), key=lambda row: row.get("order", 0))
    require([row.get("id") for row in ordered_chapters] == SC23_CHAPTER_IDS,
            "guided chapters must implement the ordered seven-outcome SC-23 curriculum")
    for chapter in ordered_chapters:
        for pattern in SC23_CONCEPT_PATTERNS.get(chapter.get("id"), []):
            require(re.search(pattern, chapter.get("narration", ""), re.I | re.S),
                    f"guided chapter '{chapter.get('id')}' misses required SC-23 concept {pattern}")
    aliases = alias_record.get("aliases") or {}
    require(alias_record.get("schema") == "titin-chapter-aliases/1"
            and isinstance(aliases, dict) and bool(aliases),
            "presentation needs a titin-chapter-aliases/1 alias table")
    declared_legacy = {}
    for chapter in p.get("guided_chapters", []):
        for legacy_id in chapter.get("legacy_ids") or []:
            require(legacy_id not in chapter_ids and legacy_id not in declared_legacy,
                    f"legacy chapter ID '{legacy_id}' collides or is duplicated")
            declared_legacy[legacy_id] = chapter.get("id")
    require(aliases == declared_legacy,
            "chapter legacy_ids and the v1 alias table must match exactly")

    scene_records = scenes.get("scenes") or {}
    require(scenes.get("schema") == "titin-semantic-scenes/1",
            "unsupported semantic scene schema")
    require(scenes.get("primary_presenter_scene_id") in scene_records,
            "primary presenter scene is unresolved")
    chapter_scenes = {row.get("semantic_scene_id"): row for row in p.get("guided_chapters", [])}
    require(len(chapter_scenes) == len(p.get("guided_chapters", []))
            and set(scene_records) == set(chapter_scenes),
            "semantic scenes and guided chapters must be one-to-one")
    forbidden_scene_key = re.compile(r"coordinate|force|evidence|(?:^|_)nm(?:$|_)", re.I)

    def validate_scene_values(value, scene_id, key=None):
        if key is not None:
            require(not forbidden_scene_key.search(key),
                    f"semantic scene '{scene_id}' contains forbidden field '{key}'")
        if type(value) in (int, float):
            require(False,
                    f"semantic scene '{scene_id}' contains a forbidden numeric scientific value")
            return
        if isinstance(value, str) and value in SCENE_EVIDENCE_VALUES:
            require(False,
                    f"semantic scene '{scene_id}' contains forbidden evidence-class value '{value}'")
            return
        if isinstance(value, dict):
            for key, child in value.items():
                validate_scene_values(child, scene_id, key)
        elif isinstance(value, list):
            for child in value:
                validate_scene_values(child, scene_id)

    def require_exact_scene_keys(value, admitted, scene_id, field):
        if not isinstance(value, dict):
            require(False, f"semantic scene '{scene_id}' {field} must be an object")
            return False
        missing = admitted - set(value)
        unexpected = set(value) - admitted
        require(not missing,
                f"semantic scene '{scene_id}' {field} lacks {sorted(missing)}")
        require(not unexpected,
                f"semantic scene '{scene_id}' {field} has unexpected fields {sorted(unexpected)}")
        return not missing and not unexpected

    for scene_id, scene_record in scene_records.items():
        chapter = chapter_scenes.get(scene_id) or {}
        if not isinstance(scene_record, dict):
            require(False, f"semantic scene '{scene_id}' must be an object")
            continue
        require_exact_scene_keys(scene_record, SCENE_FIELDS, scene_id, "record")
        require(isinstance(scene_record.get("label"), str)
                and bool(scene_record.get("label", "").strip()),
                f"semantic scene '{scene_id}' needs a string label")
        availability = scene_record.get("available_in")
        require(isinstance(availability, list) and len(availability) == 2
                and all(isinstance(value, str) for value in availability)
                and len(set(availability)) == 2
                and set(availability) == {"LEARN", "EXPLORE"},
                f"semantic scene '{scene_id}' has invalid availability")
        camera_preset = scene_record.get("camera_preset")
        require(isinstance(camera_preset, str)
                and bool(re.fullmatch(r"(view|closeup|region)\.[A-Za-z0-9_]+",
                                      camera_preset)),
                f"semantic scene '{scene_id}' has invalid camera preset")
        scale = scene_record.get("scale")
        require(isinstance(scale, str) and scale in {"context", "detail"}
                and type(scene_record.get("context")) is bool,
                f"semantic scene '{scene_id}' has invalid scale/context")
        layers = scene_record.get("layers") or {}
        layers_shape = require_exact_scene_keys(layers, SCENE_LAYERS, scene_id, "layers")
        require(layers_shape and all(type(value) is bool for value in layers.values()),
                f"semantic scene '{scene_id}' has invalid layers")
        selection = scene_record.get("selection")
        selection_kind = selection.get("kind") if isinstance(selection, dict) else None
        known = region_ids if selection_kind == "region" else (
            component_ids if selection_kind == "component" else None)
        selection_shape = selection is None or require_exact_scene_keys(
            selection, {"kind", "id"}, scene_id, "selection")
        require(selection is None or (selection_shape and known is not None
                                      and isinstance(selection.get("id"), str)
                                      and selection.get("id") in known),
                f"semantic scene '{scene_id}' has unknown selection")
        length_policy = scene_record.get("length_policy")
        length_policy_shape = require_exact_scene_keys(
            length_policy, {"kind"}, scene_id, "length_policy")
        require(length_policy_shape and length_policy.get("kind") == "preserve",
                f"semantic scene '{scene_id}' must preserve length")
        scene_claims = scene_record.get("claim_ids")
        require(isinstance(scene_claims, list) and bool(scene_claims)
                and all(isinstance(claim_id, str) for claim_id in scene_claims)
                and len(scene_claims) == len(set(scene_claims))
                and all(claim_id in support_ids for claim_id in scene_claims),
                f"semantic scene '{scene_id}' has unresolved claim_ids")
        source_filter = scene_record.get("source_filter")
        source_filter_shape = require_exact_scene_keys(
            source_filter, {"kind", "claim_ids"}, scene_id, "source_filter")
        require(source_filter_shape and source_filter.get("kind") == "claims"
                and source_filter.get("claim_ids") == scene_claims,
                f"semantic scene '{scene_id}' has invalid source_filter")
        expected_layers = {key: (chapter.get("recommended_state") or {})
                           .get("visibility", {}).get(key) for key in SCENE_LAYERS}
        require(scene_record.get("camera_preset") == (chapter.get("recommended_state") or {}).get("camera_preset")
                and scene_record.get("scale") == (chapter.get("recommended_state") or {}).get("scale")
                and selection == chapter.get("target")
                and layers == expected_layers
                and scene_claims == chapter.get("claim_ids"),
                f"semantic scene '{scene_id}' drifts from its chapter")
        validate_scene_values(scene_record, scene_id)

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
        # A card the reader cannot reach from the structure it explains is
        # content that ships but does not arrive. CI and the browser fail closed
        # together, so this mirrors the rule in StoryController.js.
        targets = card.get("related_target_ids")
        require(isinstance(targets, list) and len(targets) > 0,
                f"expert card '{card.get('id')}' must name at least one related target")
        for target in targets or []:
            require(target in component_ids or target in region_ids,
                    f"expert card '{card.get('id')}' names unknown related target '{target}'")
        findings = card.get("findings")
        if not isinstance(findings, list) or not findings:
            require(False, f"expert card '{card.get('id')}' must separate its findings by status")
        else:
            for found in findings:
                require(isinstance(found, dict) and found.get("status") in FINDING_STATUSES,
                        f"expert card '{card.get('id')}' has invalid finding status "
                        f"'{(found or {}).get('status')}'")
                require(bool(str((found or {}).get("text", "")).strip()),
                        f"expert card '{card.get('id')}' has a finding without text")
            # A card resting on a claim the audit itself calls INFERRED is discussing
            # a proposal and may not present every finding as established.
            target = claim_map.get(card.get("target_claim_id")) or {}
            if base_evidence(target.get("claim_evidence_class")) == "INFERRED":
                require(any((found or {}).get("status") == "PROPOSED" for found in findings),
                        f"expert card '{card.get('id')}' rests on an INFERRED claim but marks nothing PROPOSED")
    # SC-7 guided-tour pacing: the plan's "approximately two to three minutes" gate,
    # machine-checked against the copy that actually ships.
    pacing = p.get("tour_pacing") or {}
    rate = pacing.get("reading_words_per_minute")
    transition = pacing.get("chapter_transition_seconds")
    target_seconds = pacing.get("target_seconds")
    pacing_ok = (isinstance(rate, (int, float)) and rate > 0
                 and isinstance(transition, (int, float)) and transition >= 0
                 and isinstance(target_seconds, list) and len(target_seconds) == 2
                 and all(isinstance(x, (int, float)) for x in target_seconds)
                 and target_seconds[0] < target_seconds[1]
                 and bool(str(pacing.get("basis", "")).strip()))
    require(pacing_ok, "presentation tour_pacing needs a positive reading model, an "
                       "increasing target window, and a stated basis")
    if pacing_ok:
        chapter_list = p.get("guided_chapters", [])
        tour_words = sum(
            len(re.findall(r"\S+", c.get("narration", "")))
            + len(re.findall(r"\S+", c.get("state_change_announcement", "")))
            for c in chapter_list
        )
        seconds = tour_words / rate * 60 + len(chapter_list) * transition
        require(target_seconds[0] <= seconds <= target_seconds[1],
                f"guided tour runs {seconds:.0f} s, outside the declared "
                f"{target_seconds[0]}-{target_seconds[1]} s window")

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
    parser.add_argument("--scenes", default=DATA / "scenes.json", type=Path)
    args = parser.parse_args()
    errors = validate(args.presentation, args.scenes)
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
