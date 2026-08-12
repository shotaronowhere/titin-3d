#!/usr/bin/env python3
"""Destructive negative controls for the SC-20 cross-record gates."""

from __future__ import annotations

from copy import deepcopy

from validate_render_style import validate as validate_style
from validate_sc20 import ROOT, load, validate


titin = load("titin.json")
decisions = load("scientific_decisions.json")
scope = load("scientific_scope.json")
template = (ROOT / "src/index.template.html").read_text(encoding="utf-8")
style = load("render_style.json")
renderer = (ROOT / "src/render/SarcomereScene.js").read_text(encoding="utf-8")


def rejected(label, mutation, expected):
    t, d, s, page = deepcopy(titin), deepcopy(decisions), deepcopy(scope), template
    mutation(t, d, s)
    problems = validate(t, d, s, page)
    if not any(expected in problem for problem in problems):
        raise AssertionError(f"{label} escaped: {problems}")


rejected("sequence gap", lambda t, _d, _s: t["regions"][2]["residue_span"].__setitem__("end", 9850),
         "sequence regions")
rejected("collapsed counts", lambda t, _d, _s: t["domain_totals"]["uniprot_domain_feature_count"].__setitem__("Ig_like", 153),
         "must remain distinct")
rejected("unknown enters mechanics", lambda t, _d, _s: t["regions"][3]["extension_model"].__setitem__("mechanics_included", True),
         "leaked")
rejected("A/M gap", lambda t, _d, _s: t["regions"][7]["resting_axial_position_nm"].__setitem__("X_start", 996),
         "gap or overlap")
rejected("periodicity collapse", lambda t, _d, _s: t["regions"][6]["periodicity_quantities"]["thick_filament_L_periodicity_nm"].__setitem__("value", 43.78),
         "collapsed")
rejected("periodicity provenance removed", lambda t, _d, _s: t["regions"][6]["periodicity_quantities"]["myosin_crown_spacing_nm"].pop("preparation"),
         "complete evidence")
rejected("fake human review", lambda _t, d, _s: d["decisions"]["SD-01"]["adjudicator"].__setitem__("human_expert", True),
         "overclaims human review")
rejected("unverified implementation", lambda _t, d, _s: d["decisions"]["SD-03"]["implementation_verification"].__setitem__("status", "PENDING"),
         "not honestly VERIFIED")
rejected("stale implementation evidence", lambda _t, d, _s: d["decisions"]["SD-05"]["implementation_verification"]["implementation_evidence"][0].__setitem__("sha256", "0" * 64),
         "byte digest is stale")

bad_style = deepcopy(style)
bad_style["render_seed"] = None
if not any("render_seed" in problem for problem in validate_style(bad_style, titin, renderer)):
    raise AssertionError("missing render seed escaped")
if not any("ambient randomness" in problem
           for problem in validate_style(style, titin, renderer + "\nMath.random();")):
    raise AssertionError("ambient randomness escaped")

print("SC-20 negative controls: PASS (11/11 destructive mutations rejected)")
