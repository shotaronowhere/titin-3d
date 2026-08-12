#!/usr/bin/env python3
"""Destructive controls proving release-gates v2 fails closed."""
import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "release_gates.json"
VALIDATOR = ROOT / "scripts" / "validate_release_gates.py"
BASE = json.loads(SOURCE.read_text(encoding="utf-8"))


def rejected(label, mutate, expected):
    payload = copy.deepcopy(BASE)
    mutate(payload)
    with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8",
                                     delete=False) as handle:
        json.dump(payload, handle)
        path = Path(handle.name)
    try:
        result = subprocess.run(
            [sys.executable, str(VALIDATOR), "--gates", str(path)],
            cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            check=False,
        )
        assert result.returncode != 0, f"{label}: corrupted record passed"
        assert expected.lower() in result.stdout.lower(), (
            f"{label}: expected '{expected}'\n{result.stdout}"
        )
        print(f"  PASS {label} rejected")
    finally:
        path.unlink(missing_ok=True)


def section_check(record, section, check_id):
    return next(row for row in record[section]["checks"] if row["id"] == check_id)


def condition(record, condition_id):
    return next(row for row in record["final_release_definition"]["conditions"]
                if row["id"] == condition_id)


def pending_decision_with_reviewer(record):
    row = record["scientific_decisions"]["decisions"][0]
    row["status"] = "PENDING"
    row["reviewer"] = {"name": "Agent Persona"}


def lay_result(participant_id, correct=True):
    ids = [row["id"] for row in BASE["lay_comprehension"]["protocol"]["questions"]]
    return {
        "participant_id": participant_id,
        "informed_consent": True,
        "candidate": {"build_inputs_fingerprint": "same-candidate"},
        "answers": {question_id: correct for question_id in ids},
    }


print("== SC-18 release-gate v2 destructive controls ==")

rejected("unsupported schema",
         lambda record: record.__setitem__("schema", "titin-showcase-release-gates/1"),
         "schema is titin-showcase-release-gates/2")
rejected("release ready while gates are outstanding",
         lambda record: record.__setitem__("release_ready", True),
         "release_ready requires every gate to pass")
rejected("required identity check deleted",
         lambda record: record["artifact_identity"].__setitem__(
             "checks", record["artifact_identity"]["checks"][1:]),
         "artifact identity uses required ids")
rejected("automated PASS points at no verifier",
         lambda record: section_check(record, "artifact_identity", "raw_artifact").__setitem__(
             "verified_by", "scripts/does_not_exist.mjs"),
         "automated pass names a real verifier")
rejected("section PASS hides outstanding checks",
         lambda record: record["accessibility"].__setitem__("status", "PASS"),
         "outstanding checks prevent section pass")
rejected("browser PASS has no append-only evidence",
         lambda record: section_check(record, "accessibility", "text_zoom").__setitem__(
             "status", "PASS"),
         "non-automated pass has append-only evidence_refs")
rejected("evidence ref points outside evidence tree",
         lambda record: record["accessibility"]["evidence_refs"].append({
             "path": "docs/fabricated.json", "bytes": 1, "sha256": "0" * 64,
             "candidate": {}, "disposition": "PASS",
         }),
         "exists under evidence/")
rejected("evidence ref omits candidate identity",
         lambda record: record["accessibility"]["evidence_refs"].append({
             "path": "evidence/missing.json", "bytes": 0, "sha256": "0" * 64,
             "candidate": {}, "disposition": "PASS",
         }),
         "candidate identity envelope is complete")
rejected("scientific decision ID deleted",
         lambda record: record["scientific_decisions"].__setitem__(
             "decisions", record["scientific_decisions"]["decisions"][:-1]),
         "all five scientific decisions have status rows")
rejected("PENDING decision invents a reviewer",
         pending_decision_with_reviewer,
         "pending invents no reviewer")
rejected("lay protocol ID renamed",
         lambda record: record["lay_comprehension"]["protocol"].__setitem__(
             "id", "titin-lay-comprehension/3"),
         "lay protocol id is stable")
rejected("lay question deleted",
         lambda record: record["lay_comprehension"]["protocol"].__setitem__(
             "questions", record["lay_comprehension"]["protocol"]["questions"][:-1]),
         "exact eight ordered question ids")
rejected("lay PASS has no participants",
         lambda record: record["lay_comprehension"].__setitem__("status", "PASS"),
         "exactly five participants")
rejected("lay PASS misses per-question floor",
         lambda record: (record["lay_comprehension"].__setitem__("status", "PASS"),
                         record["lay_comprehension"].__setitem__(
                             "results", [lay_result(f"P{index}", index < 3)
                                         for index in range(5)])),
         "meets the 4/5 floor")
rejected("expert protocol role coverage changed",
         lambda record: record["expert_review"]["protocol"]["checks"][0].__setitem__(
             "required_roles", ["mechanics"]),
         "role coverage are exact")
rejected("expert PASS has no reviewers",
         lambda record: record["expert_review"].__setitem__("status", "PASS"),
         "independent reviewer for both roles")
rejected("expert PASS retains a MAJOR finding",
         lambda record: (record["expert_review"].__setitem__("status", "PASS"),
                         record["expert_review"].__setitem__("reviewers", [
                             {"reviewer_id": "S", "name": "S", "affiliation": "A",
                              "reviewed_on": "2026-08-09", "role": "sequence/structure",
                              "independent": True, "publication_consent": True,
                              "conflicts": [], "checks": [{"id": check_id} for check_id, roles
                                  in ((row["id"], row["required_roles"]) for row in
                                      record["expert_review"]["protocol"]["checks"])
                                  if "sequence/structure" in roles]},
                             {"reviewer_id": "M", "name": "M", "affiliation": "A",
                              "reviewed_on": "2026-08-09", "role": "mechanics",
                              "independent": True, "publication_consent": True,
                              "conflicts": [], "checks": [{"id": check_id} for check_id, roles
                                  in ((row["id"], row["required_roles"]) for row in
                                      record["expert_review"]["protocol"]["checks"])
                                  if "mechanics" in roles]},
                         ]), record["expert_review"].__setitem__("findings", [
                             {"severity": "MAJOR", "resolution": "OPEN"}
                         ])),
         "no unresolved critical/major finding")
rejected("visual matrix PASS has no captures",
         lambda record: (record["visual_matrix"].__setitem__("status", "PASS"),
                         [row.__setitem__("status", "PASS")
                          for row in record["visual_matrix"]["checks"]]),
         "records all 52 expected cells")
rejected("final condition deleted",
         lambda record: record["final_release_definition"].__setitem__(
             "conditions", record["final_release_definition"]["conditions"][:-1]),
         "final condition ids are stable")
rejected("passing final condition has no verifier",
         lambda record: (condition(record, "novice_comprehension").__setitem__("status", "PASS"),
                         condition(record, "novice_comprehension").pop("blocked_by", None)),
         "pass names a verifier")
rejected("condition waits on a gate already PASS",
         lambda record: condition(record, "novice_comprehension").__setitem__(
             "blocked_by", "automated"),
         "genuinely outstanding")
rejected("outstanding gate hidden from blockers",
         lambda record: record.__setitem__(
             "release_blockers", [value for value in record["release_blockers"]
                                  if value != "expert_review"]),
         "every outstanding gate is visible")
rejected("source-link contrast flattened",
         lambda record: next(row for row in record["accessibility"]["contrast_pairs"]
                             if row["id"] == "source_link").__setitem__(
                                 "foreground", "#161b22"),
         "meets 4.5:1")
rejected("declared source-link colour does not ship",
         lambda record: next(row for row in record["accessibility"]["contrast_pairs"]
                             if row["id"] == "source_link").__setitem__(
                                 "foreground", "#abcdef"),
         "ships in src/index.template.html")
rejected("release artifact points at missing generator",
         lambda record: section_check(record, "release_artifacts", "fallback_pack").__setitem__(
             "verified_by", "scripts/does_not_exist.mjs"),
         "automated pass names a real verifier")

assert json.loads(SOURCE.read_text(encoding="utf-8")) == BASE, "source record changed"
print("RELEASE-GATE V2 NEGATIVE CONTROLS PASSED (25 mutations)")
