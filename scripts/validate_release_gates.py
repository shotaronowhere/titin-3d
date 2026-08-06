#!/usr/bin/env python3
"""Validate the SC-8 release-gate record, and refuse a PASS without its evidence.

The plan's own review verdict is that "'impressive' needs audience evidence, not
internal confidence". A release record that could be flipped to PASS by editing a
string would be exactly the internal confidence it warns about, so every rule here
is written so that claiming a gate requires recording the thing that earned it:
participant-level answers for the lay test, named reviewers and resolved findings
for the expert review, captured cells and a reviewer for the visual matrix.

Nothing here fabricates a result. A gate nobody has run stays PENDING, and
`release_ready` cannot be true while one is.
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PATH = ROOT / "data" / "release_gates.json"

STATUSES = {"PENDING", "PASS", "FAIL"}
VERIFICATION_KINDS = {"automated", "browser", "human"}
# Where each declared colour has to exist for the record to describe the product
# rather than an aspiration. Text pairs are stylesheet colours; object pairs are
# renderer tokens, which is also why they are a separate block: an object-versus-
# object minimum is not a WCAG text ratio and must not be read as one.
CONTRAST_BLOCKS = (
    ("contrast_pairs", "src/index.template.html"),
    ("object_contrast_pairs", "src/render/SarcomereScene.js"),
)
CHECK_SECTIONS = ("automated", "destructive_controls", "visual_matrix",
                  "accessibility", "performance", "release_artifacts", "demo_rehearsal")
ALL_SECTIONS = CHECK_SECTIONS + ("lay_comprehension", "expert_review",
                                 "final_release_definition")

failures = []


def check(condition, message):
    print(("  PASS " if condition else "  FAIL ") + message)
    if not condition:
        failures.append(message)


def relative_luminance(colour):
    """WCAG relative luminance of an #rrggbb string.

    The same definition test/showcase_phase8.test.js uses for the text pairs, so
    the two gates cannot disagree about what a ratio is. It lives here as well
    because SC-12's object pairs describe renderer tokens, and CI must be able to
    reject a flattened palette without running the browser-facing suite.
    """
    channels = [int(colour[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
              for c in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast_ratio(foreground, background):
    high, low = sorted((relative_luminance(foreground), relative_luminance(background)),
                       reverse=True)
    return (high + 0.05) / (low + 0.05)


def relative_exists(value):
    """A named verifier must be a real file in this repository."""
    for candidate in str(value).replace(";", " ").split():
        candidate = candidate.strip().strip(",")
        if "/" not in candidate:
            continue
        if (ROOT / candidate).is_file():
            return True
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gates", type=Path, default=DEFAULT_PATH)
    args = parser.parse_args()
    record = json.loads(args.gates.read_text(encoding="utf-8"))

    print("== Record shape ==")
    check(record.get("schema") == "titin-showcase-release-gates/1",
          "release-gate record has the reviewed schema")
    check(set(record.get("meta", {}).get("statuses", [])) == STATUSES,
          "the declared status vocabulary is exactly PENDING/PASS/FAIL")
    for section in ALL_SECTIONS:
        check(isinstance(record.get(section), dict), f"section '{section}' is present")
    if failures:
        return report()

    print("\n== Every check names how it was verified ==")
    for section in CHECK_SECTIONS:
        for row in record[section].get("checks", []):
            rid = f"{section}.{row.get('id', '(missing id)')}"
            check(row.get("status") in STATUSES, f"{rid}: status is declared vocabulary")
            check(row.get("verification") in VERIFICATION_KINDS,
                  f"{rid}: verification kind is declared vocabulary")
            check(bool(str(row.get("requirement", "")).strip()),
                  f"{rid}: states what it requires")
            if row.get("verification") == "automated":
                # An automated check must point at something a reader can run.
                check(relative_exists(row.get("verified_by", "")),
                      f"{rid}: names a real command or test file")
            elif row.get("status") == "PASS":
                # A human or browser check may only pass with recorded evidence.
                check(bool(str(row.get("evidence", "")).strip()),
                      f"{rid}: a non-automated PASS records its evidence")

    print("\n== A section passes only when all of its checks do ==")
    for section in CHECK_SECTIONS:
        rows = record[section].get("checks", [])
        every = all(row.get("status") == "PASS" for row in rows)
        if record[section].get("status") == "PASS":
            check(bool(rows) and every,
                  f"{section}: PASS requires every check to pass")
        if not every:
            check(record[section].get("status") != "PASS",
                  f"{section}: status reflects its outstanding checks")

    print("\n== Declared colour pairs ==")
    accessibility = record["accessibility"]
    for block, source in CONTRAST_BLOCKS:
        pairs = accessibility.get(block) or []
        check(bool(pairs), f"{block}: the record declares its pairs")
        text = (ROOT / source).read_text(encoding="utf-8").lower()
        for pair in pairs:
            pid = f"{block}.{pair.get('id', '(missing id)')}"
            colours = [str(pair.get(field, "")) for field in ("foreground", "background")]
            well_formed = all(len(c) == 7 and c.startswith("#") for c in colours)
            check(well_formed, f"{pid}: names two #rrggbb colours")
            check(bool(str(pair.get("min_ratio", "")).strip()), f"{pid}: declares a floor")
            if not (well_formed and isinstance(pair.get("min_ratio"), (int, float))):
                continue
            ratio = contrast_ratio(*colours)
            check(ratio >= pair["min_ratio"],
                  f"{pid}: {ratio:.2f}:1 meets the {pair['min_ratio']}:1 floor")
            # A pair nobody ships is a claim about nothing. Stylesheets write
            # #rrggbb and the renderer writes 0xrrggbb; both spellings count,
            # and requiring one of the two prefixes keeps this from matching an
            # unrelated run of six hex digits.
            for colour in colours:
                digits = colour.lower().lstrip("#")
                check(f"#{digits}" in text or f"0x{digits}" in text,
                      f"{pid}: {colour} appears in {source}")

    print("\n== Visual matrix ==")
    matrix = record["visual_matrix"]
    expected = matrix.get("expected_cells")
    check(isinstance(expected, int) and expected > 0, "the matrix declares its cell count")
    captured = matrix.get("captured_cells") or []
    if matrix.get("status") == "PASS":
        check(len(captured) >= expected,
              f"a passing matrix records all {expected} captured cells (has {len(captured)})")
        check(bool(matrix.get("reviewed_by")) and bool(matrix.get("reviewed_on")),
              "a passing matrix names its human reviewer and date")
    else:
        check(True, "matrix is outstanding; capture and review are not claimed")

    print("\n== Lay comprehension ==")
    lay = record["lay_comprehension"]
    protocol = lay.get("protocol", {})
    criterion = protocol.get("criterion", {})
    scored = list(criterion.get("scored_question_ids") or [])
    question_ids = [q.get("id") for q in protocol.get("questions", [])]
    check(len(question_ids) == 5 and len(set(question_ids)) == 5,
          "the protocol asks the five reviewed questions")
    check(bool(scored) and set(scored) <= set(question_ids),
          "the scored questions are drawn from the protocol")
    check(isinstance(protocol.get("min_participants"), int)
          and protocol["min_participants"] >= 3,
          "at least three independent non-specialists are required")
    check(protocol.get("coaching_allowed") is False, "participants are not coached")
    results = lay.get("results") or []
    if lay.get("status") == "PASS":
        check(len(results) >= protocol.get("min_participants", 3),
              "a passing lay gate records at least the minimum participants")
        answered = 0
        total = 0
        for entry in results:
            pid = entry.get("participant_id", "(unnamed)")
            answers = entry.get("answers", {})
            check(set(scored) <= set(answers),
                  f"participant '{pid}' answered every scored question")
            for qid in scored:
                total += 1
                if answers.get(qid) is True:
                    answered += 1
        floor = criterion.get("min_correct_fraction", 0.8)
        check(total > 0 and (answered / total) >= floor,
              f"the recorded pass rate meets the {floor:.0%} criterion")
        if criterion.get("no_recurring_interface_misconception"):
            check(not (lay.get("recurring_misconceptions") or []),
                  "no recurring interface-caused misconception is recorded")
    else:
        check(not results or lay.get("status") == "FAIL",
              "a PENDING lay gate records no participant results")

    print("\n== Expert review ==")
    expert = record["expert_review"]
    expert_protocol = expert.get("protocol", {})
    check(len(expert_protocol.get("questions") or []) == 7,
          "the reviewer is asked the seven reviewed questions")
    check(isinstance(expert_protocol.get("min_reviewers"), int)
          and expert_protocol["min_reviewers"] >= 1,
          "at least one specialist reviewer is required")
    reviewers = expert.get("reviewers") or []
    findings = expert.get("findings") or []
    if expert.get("status") == "PASS":
        check(len(reviewers) >= expert_protocol.get("min_reviewers", 1),
              "a passing expert gate names its reviewers")
        for reviewer in reviewers:
            check(all(str(reviewer.get(field, "")).strip()
                      for field in ("name", "affiliation", "reviewed_on")),
                  f"reviewer '{reviewer.get('name', '(unnamed)')}' is fully identified")
        unresolved = [f for f in findings
                      if str(f.get("severity", "")).upper() == "CRITICAL"
                      and str(f.get("resolution", "")).strip().upper() != "RESOLVED"]
        check(not unresolved,
              f"no unresolved critical scientific finding remains ({len(unresolved)} open)")
        for finding in findings:
            check(bool(str(finding.get("resolution", "")).strip()),
                  f"finding '{finding.get('id', '(unnamed)')}' records a resolution")
    else:
        check(not reviewers or expert.get("status") == "FAIL",
              "a PENDING expert gate names no reviewers")

    print("\n== Final release definition ==")
    final = record["final_release_definition"]
    conditions = final.get("conditions") or []
    check(len(conditions) == 12, f"the plan's twelve release conditions are all present ({len(conditions)})")
    for condition in conditions:
        cid = condition.get("id", "(missing id)")
        check(condition.get("status") in STATUSES, f"condition '{cid}': status is declared vocabulary")
        check(bool(str(condition.get("statement", "")).strip()),
              f"condition '{cid}': states the condition")
        if condition.get("status") == "PASS":
            # A satisfied condition must point at what satisfied it.
            check(relative_exists(condition.get("verified_by", ""))
                  or str(condition.get("verified_by", "")).startswith("npm run"),
                  f"condition '{cid}': a passing condition names its verifier")
        else:
            # An outstanding condition must name the gate it is waiting on, and
            # that gate must genuinely still be outstanding.
            blocker = condition.get("blocked_by")
            check(blocker in ALL_SECTIONS,
                  f"condition '{cid}': names the gate it waits on")
            if blocker in ALL_SECTIONS:
                check(record[blocker].get("status") != "PASS",
                      f"condition '{cid}': waits on '{blocker}', which has already passed")
    outstanding_conditions = [c.get("id") for c in conditions if c.get("status") != "PASS"]
    if final.get("status") == "PASS":
        check(not outstanding_conditions,
              f"the definition passes only when every condition does ({outstanding_conditions})")
    else:
        check(bool(outstanding_conditions),
              "the definition is outstanding because conditions genuinely are")

    print("\n== Release readiness ==")
    outstanding = [name for name in ALL_SECTIONS if record[name].get("status") != "PASS"]
    if record.get("release_ready") is True:
        check(not outstanding,
              f"release_ready requires every gate to pass (outstanding: {outstanding})")
    else:
        check(bool(outstanding),
              "release_ready is false, and at least one gate is genuinely outstanding")
        blockers = record.get("release_blockers") or []
        check(bool(blockers), "outstanding gates are listed as explicit blockers")
        for name in outstanding:
            check(any(entry.startswith(name) for entry in blockers),
                  f"'{name}' is named in the release blockers")

    return report()


def report():
    print("\n" + "=" * 44)
    if failures:
        print(f"{len(failures)} RELEASE-GATE FAILURE(S)")
        return 1
    print("ALL RELEASE-GATE CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
