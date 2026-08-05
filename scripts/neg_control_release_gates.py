#!/usr/bin/env python3
"""Prove the SC-8 release record cannot be used to declare unearned readiness.

Every mutation below is a plausible way someone could shortcut the human gates:
flipping a status, thinning the participant set, ignoring a critical reviewer
finding, or declaring the whole showcase ready while a gate is outstanding. The
validator has to reject all of them, or the record is decoration.
"""

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
            f"{label}: expected '{expected}' in validator output\n{result.stdout}"
        )
        print(f"  PASS {label} rejected")
    finally:
        path.unlink(missing_ok=True)


def participant(pid, correct=True):
    return {
        "participant_id": pid,
        "answers": {
            "identify_titin": correct,
            "identify_anchors": correct,
            "length_change": correct,
            "not_the_motor": correct,
        },
    }


def reviewer(name="A. Specialist"):
    return {"name": name, "affiliation": "Somewhere", "reviewed_on": "2026-08-06"}


print("== SC-8 release-gate destructive controls ==")

rejected("release declared ready with gates outstanding",
         lambda r: r.__setitem__("release_ready", True),
         "release_ready requires every gate to pass")

rejected("lay gate passed with no participants",
         lambda r: r["lay_comprehension"].__setitem__("status", "PASS"),
         "records at least the minimum participants")

rejected("lay gate passed with too few participants",
         lambda r: (r["lay_comprehension"].__setitem__("status", "PASS"),
                    r["lay_comprehension"].__setitem__(
                        "results", [participant("p1"), participant("p2")])),
         "records at least the minimum participants")

rejected("lay gate passed below the comprehension criterion",
         lambda r: (r["lay_comprehension"].__setitem__("status", "PASS"),
                    r["lay_comprehension"].__setitem__(
                        "results", [participant("p1"), participant("p2", False),
                                    participant("p3", False)])),
         "criterion")

rejected("lay gate passed with an unanswered scored question",
         lambda r: (r["lay_comprehension"].__setitem__("status", "PASS"),
                    r["lay_comprehension"].__setitem__(
                        "results", [participant("p1"), participant("p2"),
                                    {"participant_id": "p3", "answers": {"identify_titin": True}}])),
         "answered every scored question")

rejected("lay gate passed with a recurring interface misconception",
         lambda r: (r["lay_comprehension"].__setitem__("status", "PASS"),
                    r["lay_comprehension"].__setitem__(
                        "results", [participant(f"p{i}") for i in range(3)]),
                    r["lay_comprehension"].__setitem__(
                        "recurring_misconceptions",
                        ["viewers read the continuity trace as a second molecule"])),
         "no recurring interface-caused misconception")

rejected("expert gate passed with no reviewer",
         lambda r: r["expert_review"].__setitem__("status", "PASS"),
         "names its reviewers")

rejected("expert gate passed with an anonymous reviewer",
         lambda r: (r["expert_review"].__setitem__("status", "PASS"),
                    r["expert_review"].__setitem__("reviewers", [{"name": "A. Specialist"}])),
         "fully identified")

rejected("expert gate passed with an unresolved critical finding",
         lambda r: (r["expert_review"].__setitem__("status", "PASS"),
                    r["expert_review"].__setitem__("reviewers", [reviewer()]),
                    r["expert_review"].__setitem__(
                        "findings", [{"id": "f1", "severity": "CRITICAL",
                                      "summary": "M-band reads as a solid plate",
                                      "resolution": "OPEN"}])),
         "no unresolved critical scientific finding")

rejected("visual matrix passed with nothing captured",
         lambda r: r["visual_matrix"].__setitem__("status", "PASS"),
         "records all")

rejected("visual matrix passed without a human reviewer",
         lambda r: (r["visual_matrix"].__setitem__("status", "PASS"),
                    r["visual_matrix"].__setitem__(
                        "captured_cells", [f"cell_{i}" for i in
                                           range(r["visual_matrix"]["expected_cells"])])),
         "names its human reviewer")

rejected("a browser-only check passed with no evidence",
         lambda r: next(c for c in r["accessibility"]["checks"]
                        if c["id"] == "text_zoom").__setitem__("status", "PASS"),
         "records its evidence")

rejected("a section passed with an outstanding check",
         lambda r: r["accessibility"].__setitem__("status", "PASS"),
         "requires every check to pass")

rejected("an automated check pointing at a file that does not exist",
         lambda r: next(c for c in r["automated"]["checks"]
                        if c["id"] == "url_state").__setitem__(
                            "verified_by", "test/does_not_exist.test.js"),
         "names a real command or test file")

rejected("an outstanding gate hidden from the blocker list",
         lambda r: r.__setitem__("release_blockers",
                                 [b for b in r["release_blockers"]
                                  if not b.startswith("expert_review")]),
         "named in the release blockers")


def condition(payload, cid):
    return next(c for c in payload["final_release_definition"]["conditions"] if c["id"] == cid)


rejected("a release condition passed with no verifier",
         lambda r: (condition(r, "novice_comprehension").__setitem__("status", "PASS"),
                    condition(r, "novice_comprehension").pop("blocked_by", None)),
         "names its verifier")

rejected("a release condition waiting on a gate that already passed",
         lambda r: condition(r, "novice_comprehension").__setitem__("blocked_by", "automated"),
         "waits on")

rejected("a release condition blocked by nothing",
         lambda r: condition(r, "expert_clear").pop("blocked_by"),
         "names the gate it waits on")

rejected("the release definition passed with conditions outstanding",
         lambda r: r["final_release_definition"].__setitem__("status", "PASS"),
         "passes only when every condition does")

rejected("a release condition deleted",
         lambda r: r["final_release_definition"].__setitem__(
             "conditions", r["final_release_definition"]["conditions"][:-1]),
         "twelve release conditions")

rejected("the rehearsal passed without being rehearsed",
         lambda r: (r["demo_rehearsal"].__setitem__("status", "PASS"),
                    [c.__setitem__("status", "PASS") for c in r["demo_rehearsal"]["checks"]]),
         "records its evidence")

rejected("a release artifact claimed without its generator",
         lambda r: next(c for c in r["release_artifacts"]["checks"]
                        if c["id"] == "fallback_pack").__setitem__(
                            "verified_by", "scripts/does_not_exist.mjs"),
         "names a real command or test file")

assert json.loads(SOURCE.read_text(encoding="utf-8")) == BASE, "source record changed"
print("RELEASE-GATE NEGATIVE CONTROLS PASSED (22 mutations)")
