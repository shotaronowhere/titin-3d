#!/usr/bin/env python3
"""Destructive controls proving every SC-19 authority gate fails closed."""

from __future__ import annotations

import copy
import json
import tempfile
from pathlib import Path

from scientific_common import (
    ROOT, claim_payload_sha256, decision_payload_sha256, load_json, sha256_payload,
)
from validate_citations import validate as validate_citations
from validate_claim_support import validate as validate_claims
from validate_scientific_decisions import validate as validate_decisions
from validate_scientific_scope import validate as validate_scope
from validate_sequence_features import validate as validate_sequence


features = load_json(ROOT / "data/titin_sequence_features.json")
titin = load_json(ROOT / "data/titin.json")
report = load_json(ROOT / "docs/scientific-decisions/SC-19/region-feature-report.json")
scope = load_json(ROOT / "data/scientific_scope.json")
presentation = load_json(ROOT / "data/presentation.json")
sarcomere = load_json(ROOT / "data/sarcomere.json")
showcase = load_json(ROOT / "data/showcase_claims.json")
template = (ROOT / "src/index.template.html").read_text(encoding="utf-8")
claims = load_json(ROOT / "data/claim_support.json")
references = load_json(ROOT / "data/references.json")
annotations = load_json(ROOT / "data/annotations.json")
scenes = load_json(ROOT / "data/scenes.json")
decisions = load_json(ROOT / "data/scientific_decisions.json")


count = 0


def rejected(name: str, problems: list[str], needle: str) -> None:
    global count
    if not any(needle in problem for problem in problems):
        raise AssertionError(f"{name} failed for the wrong reason; expected {needle!r}: {problems}")
    count += 1
    print(f"PASS  {name}: {next(problem for problem in problems if needle in problem)}")


def sequence_case(name, mutate, needle):
    f, t, r = copy.deepcopy(features), copy.deepcopy(titin), copy.deepcopy(report)
    mutate(f, t, r)
    rejected(name, validate_sequence(f, t, r), needle)


sequence_case("coordinate-frame mutation", lambda f, t, r: t["meta"].__setitem__("coordinate_frame", "isoform"), "FATAL coordinate-frame mismatch")
sequence_case("one-residue region mutation", lambda f, t, r: t["regions"][2]["residue_span"].__setitem__("start", 9851), "region-feature report diverges")
sequence_case("one-domain mutation", lambda f, t, r: f["features"].pop(), "normalized feature payload digest is stale")
sequence_case("off-by-one feature length", lambda f, t, r: f["features"][0].__setitem__("length_aa", 90), "off-by-one residue length")
sequence_case("duplicate upstream assignment", lambda f, t, r: f["features"][1].__setitem__("id", f["features"][0]["id"]), "duplicate feature ID")
sequence_case("mapping offset without VAR_SEQ", lambda f, t, r: f["isoform_mapping"].update({"applied": True, "offset_table": [{"after": 1, "offset": 1}]}), "lacks upstream VAR_SEQ")
sequence_case("canonical isoform mutation", lambda f, t, r: f["source"].__setitem__("isoform_id", "Q8WZ42-2"), "does not name the canonical isoform")
sequence_case("VAR_SEQ coordinate mutation", lambda f, t, r: f["alternative_sequences"][0].__setitem__("start", f["alternative_sequences"][0]["start"] + 1), "off-by-one residue length")


def scope_case(name, mutate, needle):
    s, p, sa, sc, page = (copy.deepcopy(scope), copy.deepcopy(presentation),
                           copy.deepcopy(sarcomere), copy.deepcopy(showcase), template)
    page = mutate(s, p, sa, sc, page) or page
    rejected(name, validate_scope(s, p, sa, sc, page, ROOT / "data"), needle)


scope_case("unreviewed tissue identity", lambda s, p, sa, sc, page: s["sequence"].__setitem__("tissue_or_muscle_claim", "human skeletal muscle"), "unreviewed tissue claim")
scope_case("literal public badge fallback", lambda s, p, sa, sc, page: p["scope_badges"][0].__setitem__("label", "fallback"), "literal/fallback label")
scope_case("template drops normalized ledger", lambda s, p, sa, sc, page: page.replace("model.scientificScope.publicBadge", "'fallback'"), "does not render scope/mechanics")


def claim_by_id(record, claim_id):
    return next(row for row in record["claims"] if row["id"] == claim_id)


def claim_case(name, mutate, needle):
    c, s = copy.deepcopy(claims), copy.deepcopy(showcase)
    mutate(c, s)
    rejected(name, validate_claims(c, references, s, presentation, annotations, scenes), needle)


claim_case("missing exact locator", lambda c, s: claim_by_id(c, "scope_badge")["support"][0].__setitem__("locator", ""), "missing identifier, locator")
claim_case("permitted but wrong quantitative unit", lambda c, s: claim_by_id(c, "aband_periodicity_relation")["quantity"].__setitem__("unit", "pN"), "length-like quantity must use nm")
claim_case("absent subject metadata", lambda c, s: claim_by_id(c, "scope_badge")["subject"].__setitem__("preparation", None), "absent subject/preparation")
claim_case("unresolved source identifier", lambda c, s: claim_by_id(c, "scope_badge")["support"][0].__setitem__("source_id", "10.9999/not-registered"), "unresolved identifier")
claim_case("claimed human review without reviewer", lambda c, s: claim_by_id(c, "scope_badge")["review"].__setitem__("status", "APPROVED"), "without reviewer metadata")
claim_case(
    "project-owner approval loses its evidence basis",
    lambda c, s: claim_by_id(c, "sarcomere_definition")["review"]
    ["approval_authority"].__setitem__("authority_basis", "unspecified"),
    "invalid project-owner approval provenance",
)
claim_case(
    "project-owner approval claims independent review",
    lambda c, s: claim_by_id(c, "actomyosin_motor_function")["review"]
    .__setitem__("independent_human_review_status", "COMPLETED"),
    "overstates independent human review",
)
claim_case("SCHEMATIC render promotes claim class", lambda c, s: next(row for row in s["objects"] if row["id"] == "mybpc_czone_context").__setitem__("claim_evidence_class", "SCHEMATIC"), "changed claim class")
claim_case("invalid public JSON pointer", lambda c, s: claim_by_id(c, "scope_badge")["public_bindings"].__setitem__(0, "data/showcase_claims.json#/objects/scope_badge/claim"), "does not resolve")
claim_case("valid but wrong public pointer", lambda c, s: claim_by_id(c, "scope_badge")["public_bindings"].__setitem__(0, "data/showcase_claims.json#/objects/1/claim"), "not bound to its exact visible claim")
claim_case("source subject relabeled skeletal", lambda c, s: claim_by_id(c, "lattice_cross_section")["support"][0]["source_subject"].__setitem__("muscle_or_tissue", "skeletal muscle"), "inconsistent with the primary preparation")

changed_annotations = copy.deepcopy(annotations)
next(row for row in changed_annotations["components"] if row["id"] == "component-thick-filament")["claim_support_ids"] = []
rejected(
    "visible annotation loses claim binding",
    validate_claims(claims, references, showcase, presentation, changed_annotations, scenes),
    "has no claim-support IDs",
)


def approved_claim() -> dict:
    c = copy.deepcopy(claims)
    row = claim_by_id(c, "titin_continuity_trace")
    row["review"] = {
        "status": "APPROVED", "reviewer": "Reviewer Example", "affiliation": "Example Institute",
        "publication_consent": True, "locator_verified_independently": True,
        "reviewed_on": "2026-08-09", "reviewed_payload_sha256": None,
    }
    row["review"]["reviewed_payload_sha256"] = claim_payload_sha256(row)
    return c


for name, mutate in (
    ("valid-source rebinding invalidates approval", lambda row: row["support"][0].__setitem__("source_id", "10.1016/j.jmb.2020.06.025")),
    ("locator mutation invalidates approval", lambda row: row["support"][0].__setitem__("locator", "Figure 1")),
    ("subject/preparation mutation invalidates approval", lambda row: row["subject"].__setitem__("preparation", "different valid preparation")),
):
    changed = approved_claim()
    mutate(claim_by_id(changed, "titin_continuity_trace"))
    rejected(name, validate_claims(
        changed, references, showcase, presentation, annotations, scenes),
        "reviewed payload digest is stale")


def approved_decision() -> dict:
    record = copy.deepcopy(decisions)
    row = record["decisions"]["SD-01"]
    row.update({
        "status": "APPROVED",
        "reviewer": {"name": "Reviewer Example", "affiliation": "Example Institute", "publication_consent": True},
        "reviewed_on": "2026-08-09",
        "reviewed_model_fingerprint": "a" * 64,
        "ruling": {"coordinate_frame": "canonical", "partition": "example reviewed payload"},
    })
    row["reviewed_payload_sha256"] = decision_payload_sha256(row)
    return record


changed = approved_decision()
changed["decisions"]["SD-01"]["ruling"]["partition"] = "changed after review"
rejected("stale decision ruling", validate_decisions(changed, claims), "payload digest is stale")

changed = approved_decision()
row = changed["decisions"]["SD-01"]
row["reviewed_payload_sha256"] = sha256_payload(row)
rejected("self-referential decision digest", validate_decisions(changed, claims), "self-referential")

changed = copy.deepcopy(decisions)
changed["decisions"]["SD-01"]["status"] = "DEFERRED"
rejected("SD-01 deferred consumption", validate_decisions(changed, claims), "no DEFERRED")

changed = copy.deepcopy(decisions)
changed["decisions"]["SD-02"]["evidence_packet"][0]["sha256"] = "0" * 64
rejected("review packet byte mutation", validate_decisions(changed, claims), "byte digest is stale")

changed = copy.deepcopy(decisions)
changed["decisions"]["SD-03"]["required_reviewer_role"] = ""
rejected("missing reviewer role", validate_decisions(changed, claims), "required reviewer role")

with tempfile.TemporaryDirectory(prefix="titin-sc19-citations-") as temp:
    path = Path(temp)
    (path / "injected.json").write_text(
        json.dumps({"source": "10.9999/unregistered-sc19-control"}), encoding="utf-8"
    )
    citation_problems, _ = validate_citations(path, references)
rejected("unregistered DOI injection", citation_problems, "unregistered identifier")

print(f"\n{count} SC-19 destructive controls passed")
