#!/usr/bin/env python3
"""Validate release-gates v2 without turning automated evidence into human PASS."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PATH = ROOT / "data" / "release_gates.json"
STATUSES = {"PENDING", "PASS", "FAIL"}
VERIFICATION_KINDS = {"automated", "browser", "human"}

REQUIRED_SECTIONS = {
    "artifact_identity", "scientific_decisions", "claim_entailment",
    "mechanical_validity", "browser_qa", "deployment_parity", "automated",
    "destructive_controls", "visual_matrix", "accessibility", "performance",
    "release_artifacts", "lay_comprehension", "expert_review",
    "demo_rehearsal", "final_release_definition",
}
IDENTITY_CHECKS = {
    "model_fingerprint", "app_revision", "build_inputs_fingerprint",
    "raw_artifact", "detached_manifest", "candidate_evidence_boundary",
}
DECISION_IDS = {f"SD-0{index}" for index in range(1, 6)}
LAY_IDS = [
    "define_sarcomere", "identify_titin_route", "distinguish_motor",
    "explain_stretch", "identify_anchors", "explain_roles", "find_evidence",
    "distinguish_claim_kinds",
]
EXPERT_ROLES = {"sequence/structure", "mechanics"}
EXPERT_ASSIGNMENTS = {
    "scope_and_coordinate_frame": {"sequence/structure"},
    "sequence_region_architecture": {"sequence/structure"},
    "a_band_periodicity_register": {"sequence/structure"},
    "anchors_stoichiometry_depiction": {"sequence/structure"},
    "mechanics_reproduction": {"mechanics"},
    "mechanics_regimes_sensitivity": {"mechanics"},
    "claim_entailment_and_transfers": EXPERT_ROLES,
    "artifact_depiction_and_nonclaims": EXPERT_ROLES,
}
FINAL_IDS = {
    "phase_gates", "claim_metadata", "no_cross_muscle", "titin_continuity",
    "bare_zone_distinct", "zdisc_topology", "mybpc_honest", "lattice_legible",
    "novice_comprehension", "expert_clear", "outputs_agree",
    "rehearsal_and_fallback",
}
CONTRAST_BLOCKS = (
    ("contrast_pairs", "src/index.template.html"),
    ("object_contrast_pairs", "src/render/SarcomereScene.js"),
)


class GateValidator:
    def __init__(self, record: dict):
        self.record = record
        self.failures: list[str] = []

    def check(self, condition: bool, message: str) -> None:
        print(("  PASS " if condition else "  FAIL ") + message)
        if not condition:
            self.failures.append(message)

    @staticmethod
    def relative_exists(value: object) -> bool:
        for candidate in str(value or "").replace(";", " ").split():
            path = candidate.strip().strip(",")
            if "/" in path and (ROOT / path).is_file():
                return True
        return False

    def shape(self) -> None:
        print("== Record shape ==")
        self.check(self.record.get("schema") == "titin-showcase-release-gates/2",
                   "release-gate schema is titin-showcase-release-gates/2")
        self.check(set(self.record.get("meta", {}).get("statuses", [])) == STATUSES,
                   "status vocabulary is exactly PENDING/PASS/FAIL")
        missing = REQUIRED_SECTIONS - self.record.keys()
        self.check(not missing, f"all required v2 sections exist (missing: {sorted(missing)})")
        self.check(isinstance(self.record.get("release_ready"), bool),
                   "release_ready is a boolean")

    def checks(self) -> None:
        print("\n== Check records and section rollups ==")
        for section_id in sorted(REQUIRED_SECTIONS):
            section = self.record.get(section_id, {})
            rows = section.get("checks", [])
            ids = [row.get("id") for row in rows]
            self.check(len(ids) == len(set(ids)), f"{section_id}: check IDs are unique")
            for row in rows:
                rid = f"{section_id}.{row.get('id', '(missing)')}"
                self.check(bool(row.get("id")), f"{rid}: has an ID")
                self.check(row.get("status") in STATUSES, f"{rid}: status is valid")
                self.check(row.get("verification") in VERIFICATION_KINDS,
                           f"{rid}: verification kind is valid")
                self.check(bool(str(row.get("requirement", "")).strip()),
                           f"{rid}: requirement is stated")
                if row.get("status") == "PASS" and row.get("verification") == "automated":
                    self.check(self.relative_exists(row.get("verified_by")),
                               f"{rid}: automated PASS names a real verifier")
                if row.get("status") == "PASS" and row.get("verification") in {"browser", "human"}:
                    self.check(bool(section.get("evidence_refs")),
                               f"{rid}: non-automated PASS has append-only evidence_refs")
            if rows:
                all_pass = all(row.get("status") == "PASS" for row in rows)
                if section.get("status") == "PASS":
                    self.check(all_pass, f"{section_id}: section PASS reflects every check")
                if not all_pass:
                    self.check(section.get("status") != "PASS",
                               f"{section_id}: outstanding checks prevent section PASS")

        identity_ids = {row.get("id") for row in self.record["artifact_identity"].get("checks", [])}
        self.check(IDENTITY_CHECKS <= identity_ids,
                   f"artifact identity uses required IDs (missing: {sorted(IDENTITY_CHECKS - identity_ids)})")

    def evidence_refs(self) -> None:
        print("\n== Append-only evidence references ==")
        evidence_sections = {
            "scientific_decisions", "claim_entailment", "mechanical_validity",
            "deployment_parity", "visual_matrix", "accessibility", "performance",
            "lay_comprehension", "expert_review", "demo_rehearsal",
        }
        seen: set[str] = set()
        candidate_fields = {
            "model_fingerprint", "app_revision", "build_inputs_fingerprint",
            "export_contract_fingerprint", "index_html_sha256", "manifest_sha256",
        }
        for section_id in sorted(evidence_sections):
            section = self.record[section_id]
            refs = section.get("evidence_refs")
            self.check(isinstance(refs, list), f"{section_id}: evidence_refs is an append-only list")
            for row in refs or []:
                path = row.get("path", "")
                self.check(path not in seen, f"{section_id}: evidence path '{path}' is unique")
                seen.add(path)
                self.check(path.startswith("evidence/") and (ROOT / path).is_file(),
                           f"{section_id}: evidence path '{path}' exists under evidence/")
                if (ROOT / path).is_file():
                    payload = (ROOT / path).read_bytes()
                    self.check(row.get("bytes") == len(payload), f"{path}: byte count matches")
                    self.check(row.get("sha256") == hashlib.sha256(payload).hexdigest(),
                               f"{path}: SHA-256 matches")
                self.check(set((row.get("candidate") or {}).keys()) == candidate_fields,
                           f"{path}: candidate identity envelope is complete")
                self.check(bool(str(row.get("disposition", "")).strip()),
                           f"{path}: disposition is recorded")

    @staticmethod
    def luminance(colour: str) -> float:
        channels = [int(colour[index:index + 2], 16) / 255 for index in (1, 3, 5)]
        linear = [value / 12.92 if value <= 0.04045
                  else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    @classmethod
    def contrast_ratio(cls, first: str, second: str) -> float:
        high, low = sorted((cls.luminance(first), cls.luminance(second)), reverse=True)
        return (high + 0.05) / (low + 0.05)

    def contrast(self) -> None:
        print("\n== Declared colour pairs ==")
        accessibility = self.record["accessibility"]
        required_text_ids = {"source_link", "selected_extension_row", "disabled_extension_row"}
        actual_text_ids = {row.get("id") for row in accessibility.get("contrast_pairs", [])}
        self.check(required_text_ids <= actual_text_ids,
                   f"SC-18 text pairs exist (missing: {sorted(required_text_ids - actual_text_ids)})")
        for block, source in CONTRAST_BLOCKS:
            rows = accessibility.get(block, [])
            self.check(bool(rows), f"{block}: pairs are declared")
            source_text = (ROOT / source).read_text(encoding="utf-8").lower()
            for row in rows:
                rid = f"{block}.{row.get('id', '(missing)')}"
                colours = [str(row.get(field, "")).lower() for field in ("foreground", "background")]
                formed = all(re.fullmatch(r"#[0-9a-f]{6}", colour) for colour in colours)
                self.check(formed, f"{rid}: colours are #rrggbb")
                floor = row.get("min_ratio")
                self.check(isinstance(floor, (int, float)) and floor > 0,
                           f"{rid}: positive contrast floor exists")
                if formed and isinstance(floor, (int, float)):
                    ratio = self.contrast_ratio(*colours)
                    self.check(ratio >= floor,
                               f"{rid}: {ratio:.2f}:1 meets {floor}:1")
                    for colour in colours:
                        digits = colour[1:]
                        self.check(colour in source_text or f"0x{digits}" in source_text,
                                   f"{rid}: {colour} ships in {source}")

    def decisions_and_protocols(self) -> None:
        print("\n== Scientific and human protocol IDs ==")
        visual = self.record["visual_matrix"]
        if visual.get("status") == "PASS":
            expected = visual.get("expected_cells")
            captured = visual.get("captured_cells", [])
            self.check(isinstance(expected, int) and len(captured) >= expected,
                       f"visual PASS records all {expected} expected cells")
            self.check(bool(visual.get("reviewed_by")) and bool(visual.get("reviewed_on")),
                       "visual PASS names its human reviewer and date")

        decisions = self.record["scientific_decisions"]
        decision_ids = {row.get("id") for row in decisions.get("decisions", [])}
        self.check(set(decisions.get("required_ids", [])) == DECISION_IDS,
                   "scientific_decisions requires SD-01 through SD-05")
        self.check(decision_ids == DECISION_IDS, "all five scientific decisions have status rows")
        for row in decisions.get("decisions", []):
            self.check(row.get("status") in {"PENDING", "APPROVED", "DEFERRED"},
                       f"{row.get('id')}: decision status is valid")
            if row.get("status") == "PENDING":
                self.check(not row.get("reviewer"), f"{row.get('id')}: PENDING invents no reviewer")

        lay = self.record["lay_comprehension"]
        protocol = lay.get("protocol", {})
        self.check(protocol.get("id") == "titin-lay-comprehension/2", "lay protocol ID is stable")
        self.check([row.get("id") for row in protocol.get("questions", [])] == LAY_IDS,
                   "lay protocol uses the exact eight ordered question IDs")
        criterion = protocol.get("criterion", {})
        self.check(protocol.get("min_participants") == 5, "lay protocol requires five participants")
        self.check(protocol.get("one_candidate_only") is True, "each participant sees one candidate")
        self.check(protocol.get("coaching_allowed") is False, "coaching is forbidden")
        self.check(criterion.get("per_question_min_correct") == 4,
                   "every lay question requires 4/5 correct")
        self.check(criterion.get("distinguish_motor_min_correct") == 5,
                   "distinguish_motor requires 5/5 correct")
        if lay.get("status") == "PENDING":
            self.check(not lay.get("results"), "PENDING lay gate has no fabricated results")
        if lay.get("status") == "PASS":
            results = lay.get("results", [])
            self.check(len(results) == 5, "lay PASS records exactly five participants")
            question_counts = {question_id: 0 for question_id in LAY_IDS}
            candidate_ids = set()
            participant_ids = set()
            for result in results:
                participant_id = result.get("participant_id")
                self.check(bool(participant_id) and participant_id not in participant_ids,
                           f"lay participant '{participant_id}' has a unique anonymous ID")
                participant_ids.add(participant_id)
                self.check(result.get("informed_consent") is True,
                           f"lay participant '{participant_id}' gave informed consent")
                candidate_ids.add(json.dumps(result.get("candidate", {}), sort_keys=True))
                answers = result.get("answers", {})
                self.check(set(answers) == set(LAY_IDS),
                           f"lay participant '{participant_id}' answered all eight questions")
                for question_id in LAY_IDS:
                    self.check(isinstance(answers.get(question_id), bool),
                               f"{participant_id}.{question_id} is a scored boolean")
                    question_counts[question_id] += answers.get(question_id) is True
            self.check(len(candidate_ids) == 1, "all lay participants saw one frozen candidate")
            for question_id, correct in question_counts.items():
                floor = 5 if question_id == "distinguish_motor" else 4
                self.check(correct >= floor,
                           f"{question_id}: {correct}/5 meets the {floor}/5 floor")
            self.check(bool(lay.get("preregistration")), "lay PASS records preregistration")
            self.check(bool(lay.get("candidate_history")), "lay PASS retains candidate history")

        expert = self.record["expert_review"]
        expert_protocol = expert.get("protocol", {})
        self.check(expert_protocol.get("id") == "titin-expert-review/2",
                   "expert protocol ID is stable")
        self.check(set(expert_protocol.get("required_roles", [])) == EXPERT_ROLES,
                   "expert protocol requires sequence/structure and mechanics")
        assignments = {row.get("id"): set(row.get("required_roles", []))
                       for row in expert_protocol.get("checks", [])}
        self.check(assignments == EXPERT_ASSIGNMENTS,
                   "expert protocol check IDs and role coverage are exact")
        criterion = expert_protocol.get("criterion", {})
        self.check(criterion.get("unresolved_critical_or_major") == 0,
                   "expert PASS permits no unresolved CRITICAL/MAJOR finding")
        self.check(criterion.get("independent_reviewer_per_role") is True,
                   "expert PASS requires independent reviewers")
        if expert.get("status") == "PENDING":
            self.check(not expert.get("reviewers"), "PENDING expert gate invents no reviewer")
        if expert.get("status") == "PASS":
            reviewers = expert.get("reviewers", [])
            roles = {reviewer.get("role") for reviewer in reviewers
                     if reviewer.get("independent") is True}
            self.check(EXPERT_ROLES <= roles,
                       "expert PASS has an independent reviewer for both roles")
            for reviewer in reviewers:
                rid = reviewer.get("reviewer_id", "(missing)")
                self.check(all(bool(reviewer.get(field)) for field in
                               ("reviewer_id", "name", "affiliation", "reviewed_on")),
                           f"expert reviewer '{rid}' is identified")
                self.check(reviewer.get("publication_consent") is True,
                           f"expert reviewer '{rid}' consented to publication")
                self.check(isinstance(reviewer.get("conflicts"), list),
                           f"expert reviewer '{rid}' disclosed conflicts")
                assigned = {row.get("id") for row in reviewer.get("checks", [])}
                required = {check_id for check_id, check_roles in EXPERT_ASSIGNMENTS.items()
                            if reviewer.get("role") in check_roles}
                self.check(required <= assigned,
                           f"expert reviewer '{rid}' answered every assigned check")
            unresolved = [finding for finding in expert.get("findings", [])
                          if str(finding.get("severity", "")).upper() in {"CRITICAL", "MAJOR"}
                          and str(finding.get("resolution", "")).upper() != "RESOLVED"]
            self.check(not unresolved,
                       f"expert PASS has no unresolved CRITICAL/MAJOR finding ({len(unresolved)} open)")

    def final_release(self) -> None:
        print("\n== Final release definition and blockers ==")
        final = self.record["final_release_definition"]
        rows = final.get("conditions", [])
        ids = {row.get("id") for row in rows}
        self.check(ids == FINAL_IDS,
                   f"final condition IDs are stable (missing: {sorted(FINAL_IDS - ids)})")
        for row in rows:
            cid = row.get("id", "(missing)")
            self.check(row.get("status") in STATUSES, f"{cid}: status is valid")
            self.check(bool(str(row.get("statement", "")).strip()), f"{cid}: statement exists")
            if row.get("status") == "PASS":
                self.check(self.relative_exists(row.get("verified_by"))
                           or str(row.get("verified_by", "")).startswith("npm run"),
                           f"{cid}: PASS names a verifier")
            else:
                blocker = row.get("blocked_by")
                self.check(blocker in REQUIRED_SECTIONS, f"{cid}: blocker names a gate section")
                if blocker in self.record:
                    self.check(self.record[blocker].get("status") != "PASS",
                               f"{cid}: blocker '{blocker}' is genuinely outstanding")

        blockers = self.record.get("release_blockers", [])
        self.check(len(blockers) == len(set(blockers)), "release blocker IDs are unique")
        for blocker in blockers:
            self.check(blocker in REQUIRED_SECTIONS, f"blocker '{blocker}' is a real section")
            if blocker in self.record:
                self.check(self.record[blocker].get("status") != "PASS",
                           f"blocker '{blocker}' is not already PASS")
        outstanding = {section for section in REQUIRED_SECTIONS
                       if self.record[section].get("status") != "PASS"}
        self.check(outstanding <= set(blockers),
                   f"every outstanding gate is visible (missing: {sorted(outstanding - set(blockers))})")
        if self.record.get("release_ready"):
            self.check(not outstanding, "release_ready requires every gate to pass")
            self.check(final.get("status") == "PASS",
                       "release_ready requires the final release definition to pass")
        else:
            self.check(bool(outstanding),
                       "release_ready is false because at least one gate is outstanding")

    def run(self) -> int:
        self.shape()
        if self.failures:
            return self.report()
        self.checks()
        self.evidence_refs()
        self.contrast()
        self.decisions_and_protocols()
        self.final_release()
        return self.report()

    def report(self) -> int:
        print("\n" + "=" * 44)
        if self.failures:
            print(f"RELEASE-GATE VALIDATION FAILED ({len(self.failures)} problem(s))")
            return 1
        print("ALL RELEASE-GATE V2 CHECKS PASSED")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gates", type=Path, default=DEFAULT_PATH)
    args = parser.parse_args()
    return GateValidator(json.loads(args.gates.read_text(encoding="utf-8"))).run()


if __name__ == "__main__":
    raise SystemExit(main())
