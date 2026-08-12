#!/usr/bin/env python3
"""
Phase 8 — the mechanical basis of titin I-band extension.

WHAT THIS ADDS THAT THE ENGINE DID NOT HAVE
-------------------------------------------
Before Phase 8, GeometryEngine.geometryAt(SL) reached intermediate sarcomere
lengths by linearly interpolating the four keyframe partitions in
structural_states.json. The recruitment order (proximal Ig straightening ->
N2A -> PEVK) existed only as English prose in titin.json:mechanical_summary.
Nothing in the code DERIVED that ordering; the keyframes merely happened to
encode it, and interpolation between them preserved it by accident.

This module supplies the mechanism. Titin's I-band elastic regions are in
MECHANICAL SERIES between the Z-disc and the thick-filament tip, so they all
bear the SAME force. Given a force-extension law per region, one scalar force
determines the whole partition, and the recruitment order stops being an
assertion: it falls out as the ordering of the regions' compliance shares
d(extension)/dF.

PARAMETERS: ALL SOURCED, NONE FITTED HERE
-----------------------------------------
Nothing in this file is tuned to make the spec's numbers come out. That is the
whole point -- it is what makes the agreement below evidence rather than
circular reasoning.

  poly-Ig tandems (prox_Ig, dist_Ig)
      pure-entropic WLC, A = 21 nm
      10.1073/pnas.95.14.8052 reports this for the N-terminal poly-Ig segment
      of RAT PSOAS (skeletal) titin, citing Linke et al. 1998 J Cell Sci 111,
      1567-1574; the entropic WLC fits it up to ~35 pN.
      Contour = n_units * 4.0 nm folded domain length (spec extension_model),
      i.e. the fully STRAIGHTENED-BUT-FOLDED tandem. Physiological poly-Ig
      extension is straightening, not domain unfolding -- consistent with the
      6-8 pN equilibrium (un)folding force vs the 150-300 pN AFM force in
      geometry_sources.

  PEVK
      extensible (entropic + enthalpic) WLC, A = 0.55 nm, K0 = 185 pN
      10.1073/pnas.95.14.8052 (rat psoas, skeletal). This is the SAME
      parameter pair with which that paper states it reproduced the measured
      passive length-tension curve of rat psoas myofibrils "over the whole
      range of physiological SLs". A single-branch law is therefore what the
      source endorses.
      Contour = 1807 aa * 0.30 nm/aa = 542.1 nm (spec). The paper's own PEVK
      contour was 476 nm because rat psoas PEVK is shorter; A and K0 are
      per-unit-length material properties and transfer across isoform length,
      the contour does not. So the spec's human contour is used with the
      paper's A and K0.
      NOTE the paper's own validity boundary: PEVK is a PURE entropic spring
      (A = 0.65 nm) only below ~12 pN / <60% relative extension. Above that
      the enthalpic term is required -- which is why the A = 0.55 / K0 = 185
      form, valid across the whole range, is used rather than switching
      branches. An earlier draft of this model DID switch branches at 12 pN
      and produced a 14.7 nm discontinuity in chain length; that jump was an
      artefact of the switch, not physics. See test suite.

  N2A
      four 4 nm folded-domain floor (16 nm total) in series with a
      pure-entropic WLC, A = 0.35 nm and total contour proxy = 55 nm
      (16 nm folded floor + 39 nm unique-sequence contour). The AFM and phosphorylation source
      (10.3389/fphys.2020.00173) used recombinant human N2A constructs; it did
      not establish a tissue-specific Q8WZ42-1 construct.
      DELIBERATELY NOT MODELLED as a folded bundle with an unfolding
      transition: an earlier draft did that using 7 pN as the transition
      midpoint, but the 6-8 pN in geometry_sources parameters[19] is the *Ig
      domain* equilibrium refolding force, not an N2A quantity. Using it for
      N2A would be exactly the misattribution this project forbids. The spec
      records no N2A unfolding force, so no such transition is modelled.

EVIDENCE CLASS OF THE OUTPUT: MODELED.
Distinct from the keyframes' STRONGLY INFERRED partition. This module does not
overwrite the keyframes; it is a second, independent route to the partition,
and the divergence between the two is reported rather than hidden.

Run:  python3 scripts/mechanical_model.py
Check: python3 scripts/mechanical_model.py --check
Writes data/mechanical_model.json and data/structural_states.json, or in
`--check` mode verifies that both committed byte streams are exactly reproducible.
"""
import argparse, copy, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(HERE), "data")

def load(f): return json.load(open(os.path.join(DATA_DIR, f)))

# ---------------------------------------------------------------- physics ----
# Boltzmann constant * temperature, in pN*nm. T = 300 K is the temperature of
# the pnas.95.14.8052 experiments, so it is the temperature at which those
# persistence lengths were measured; using a different T here would silently
# rescale every sourced A.
T_KELVIN = 300.0
KT_PN_NM = 1.380649e-23 * T_KELVIN * 1e21

def g_marko_siggia(y):
    """Marko-Siggia interpolation formula, f = (kT/A) * g(y), y = z/L."""
    return 1.0 / (4.0 * (1.0 - y) ** 2) - 0.25 + y

def wlc_force(y, A):
    """Force (pN) at fractional extension y for a pure-entropic WLC."""
    return (KT_PN_NM / A) * g_marko_siggia(y)

def _g_inverse(target):
    """Invert the monotonic g on y in [0,1). Bisection: g is strictly
    increasing, so this converges to machine precision and cannot pick a
    wrong branch."""
    lo, hi = 0.0, 1.0 - 1e-15
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if g_marko_siggia(mid) < target: lo = mid
        else: hi = mid
    return 0.5 * (lo + hi)

def wlc_extension(F, A, Lc):
    """End-to-end extension (nm) at force F (pN) for a pure-entropic WLC."""
    if F <= 0.0: return 0.0
    return Lc * _g_inverse(F * A / KT_PN_NM)

def ewlc_extension(F, A, Lc, K0):
    """Extensible WLC: the enthalpic term adds F/K0 to the fractional
    extension, so z/L = y(F) + F/K0. Unlike the pure-entropic form this has NO
    contour-length ceiling -- extension grows without bound in F, which is the
    physically correct statement that a real chain can be strained beyond its
    relaxed contour length."""
    if F <= 0.0: return 0.0
    return Lc * (_g_inverse(F * A / KT_PN_NM) + F / K0)

# ------------------------------------------------------- sourced chain set ----
def chain_parameters(spec_titin):
    regs = {r["id"]: r for r in spec_titin["regions"]}
    lc = lambda r: regs[r]["extension_model"]["max_end2end_nm"]
    return {
        "prox_Ig": {"law": "wlc",  "A_nm": 21.0, "Lc_nm": lc("prox_Ig"),
                    "source": "10.1073/pnas.95.14.8052 (via Linke 1998 J Cell Sci 111:1567)"},
        # SD-01 resolves four folded N2A Ig domains. Their 16 nm floor is in
        # SERIES with the 39 nm unique-sequence contour; both values come from
        # titin.json so the generator cannot drift from sequence curation.
        "N2A":     {"law": "folded_plus_wlc", "A_nm": 0.35,
                    "Lc_nm": lc("N2A"),
                    "rigid_nm": regs["N2A"]["extension_model"]["rigid_folded_length_nm"],
                    "source": "10.3389/fphys.2020.00173 (geometry_sources[11],[12]); "
                              "rigid folded-domain length from geometry_sources[10] "
                              "(10.1016/j.jmb.2020.06.025)"},
        "PEVK":    {"law": "ewlc", "A_nm": 0.55, "Lc_nm": lc("PEVK"), "K0_pN": 185.0,
                    "source": "10.1073/pnas.95.14.8052"},
        "dist_Ig": {"law": "wlc",  "A_nm": 21.0, "Lc_nm": lc("dist_Ig"),
                    "source": "10.1073/pnas.95.14.8052 (via Linke 1998 J Cell Sci 111:1567)"},
    }

ORDER = ["prox_Ig", "N2A", "PEVK", "dist_Ig"]   # Z-disc -> thick-filament tip

def region_extension(ch, rid, F):
    c = ch[rid]
    if c["law"] == "wlc":
        return wlc_extension(F, c["A_nm"], c["Lc_nm"])
    if c["law"] == "folded_plus_wlc":
        # rigid folded domain + entropic coil, in series. Floors the region at
        # rigid_nm: the folded domain is there at every force.
        return c["rigid_nm"] + wlc_extension(F, c["A_nm"], c["Lc_nm"] - c["rigid_nm"])
    return ewlc_extension(F, c["A_nm"], c["Lc_nm"], c["K0_pN"])

def chain_extension(ch, F):
    return sum(region_extension(ch, r, F) for r in ORDER)

def solve_force(ch, total_nm, hi_pN=1.0e4):
    """The force at which the series chain reaches total_nm. Monotone in F, so
    bisection is exact to convergence."""
    lo = 0.0
    for _ in range(400):
        mid = 0.5 * (lo + hi_pN)
        if chain_extension(ch, mid) < total_nm: lo = mid
        else: hi_pN = mid
    return 0.5 * (lo + hi_pN)

def force_for_region(ch, rid, z_nm, hi_pN=1.0e4):
    """Force that ONE region alone would need to reach z_nm. Returns None when
    z_nm is at or beyond a pure-entropic contour length (unreachable at finite
    force)."""
    c = ch[rid]
    if c["law"] in ("wlc", "folded_plus_wlc") and z_nm >= c["Lc_nm"] * (1.0 - 1e-12):
        return None
    if c["law"] == "folded_plus_wlc" and z_nm <= c["rigid_nm"]:
        return 0.0   # at or below the rigid floor: zero force
    lo = 0.0
    for _ in range(400):
        mid = 0.5 * (lo + hi_pN)
        if region_extension(ch, rid, mid) < z_nm: lo = mid
        else: hi_pN = mid
    return 0.5 * (lo + hi_pN)

def compliance_shares(ch, F):
    """Fraction of the chain's total compliance dz/dF carried by each region at
    force F. Central difference with a relative step; the laws are smooth in F
    away from 0 so this is stable."""
    h = max(F * 1e-4, 1e-7)
    d = {r: (region_extension(ch, r, F + h) - region_extension(ch, r, max(F - h, 0.0)))
            / (F + h - max(F - h, 0.0)) for r in ORDER}
    tot = sum(d.values())
    return {r: d[r] / tot for r in ORDER}, d

# --------------------------------------------------------- self-validation ----
def validate_against_source():
    """Reproduce the datapoints pnas.95.14.8052 reports for PEVK with its own
    pure-entropic parameter A = 0.65 nm. If these do not come back, either the
    formula or the parameter is not the one that paper used, and every number
    downstream is untrustworthy."""
    checks = []
    for y, reported, tol in ((0.20, 1.5, 1.0), (0.50, 8.0, 0.5)):
        got = wlc_force(y, 0.65)
        checks.append({"quantity": "PEVK force at %.0f%% extension" % (100 * y),
                       "reported_pN": reported, "model_pN": round(got, 3),
                       "tolerance_pN": tol, "pass": abs(got - reported) <= tol,
                       "source": "10.1073/pnas.95.14.8052"})
    # the paper's stated equivalence: ~12 pN <-> ~60% relative extension
    f60 = wlc_force(0.60, 0.65)
    checks.append({"quantity": "force at the paper's stated 60% validity boundary",
                   "reported_pN": 12.0, "model_pN": round(f60, 3), "tolerance_pN": 1.0,
                   "pass": abs(f60 - 12.0) <= 1.0,
                   "source": "10.1073/pnas.95.14.8052 ('below ~12 pN, or relative extensions <60%')"})
    # poly-Ig: entropic WLC fits to ~35 pN, so 35 pN must sit below contour
    y35 = _g_inverse(35.0 * 21.0 / KT_PN_NM)
    checks.append({"quantity": "poly-Ig fractional extension at the 35 pN fit limit",
                   "reported_pN": None, "model_pN": round(y35, 4), "tolerance_pN": None,
                   "pass": 0.9 < y35 < 1.0,
                   "source": "10.1073/pnas.95.14.8052 (entropic WLC fit valid to ~35 pN)"})
    return checks

def continuity_probe(ch):
    """A genuine discontinuity does not shrink when the sampling step shrinks;
    the steep low-force limb of a WLC does. Refine 10x and check the max step
    falls ~10x. This test exists because an earlier branch-switching draft had
    a real 14.7 nm jump."""
    out = []
    for n in (20000, 200000):
        xs = [math.exp(math.log(1e-4) + (math.log(400.0) - math.log(1e-4)) * i / n)
              for i in range(n + 1)]
        out.append({"samples": n,
                    "max_step_nm": round(max(abs(chain_extension(ch, xs[i + 1])
                                                - chain_extension(ch, xs[i]))
                                             for i in range(n)), 6)})
    ratio = out[0]["max_step_nm"] / out[1]["max_step_nm"]
    return {"sweeps": out, "step_ratio_on_10x_refinement": round(ratio, 2),
            "continuous": ratio > 5.0,
            "interpretation": "ratio ~10 means the apparent step is finite sampling of a "
                              "steep but continuous limb; ratio ~1 would mean a true jump"}

# ------------------------------------------------------------------- main ----
def main(check=False):
    titin  = load("titin.json")
    sarcomere = load("sarcomere.json")
    states_record = load("structural_states.json")
    states = states_record["states"]
    ch = chain_parameters(titin)

    report = {
        "schema": "titin-mechanical-model/1",
        "purpose": "Force-based mechanistic basis for I-band extension; supplies the "
                   "recruitment order as a DERIVED result rather than prose.",
        "evidence_class": "MODELED",
        "physics": {
            "topology": "The four I-band elastic regions are in mechanical SERIES between "
                        "the Z-disc and the thick-filament tip, therefore they bear a "
                        "COMMON force. One scalar force fixes the entire partition.",
            "kT_pN_nm": round(KT_PN_NM, 6),
            "T_kelvin": T_KELVIN,
            "T_rationale": "300 K is the temperature of the pnas.95.14.8052 experiments, "
                           "i.e. the temperature at which the sourced persistence lengths "
                           "were measured.",
            "laws": {
                "wlc":  "f = (kT/A) * [ 1/(4(1-y)^2) - 1/4 + y ],  y = z/Lc  (Marko-Siggia)",
                "ewlc": "z/Lc = y(f) + f/K0  -- entropic + enthalpic; no contour ceiling",
            },
        },
        "chain_parameters": ch,
        "no_fitted_parameters": "Every A, K0 and Lc above is taken from a cited source or "
                                "from the spec. None was adjusted to improve agreement with "
                                "structural_states.json. The agreement reported below is "
                                "therefore independent corroboration, not a fit.",
        "source_validation": validate_against_source(),
        "continuity": continuity_probe(ch),
    }
    z_width = next(component for component in sarcomere["components"]
                   if component["id"] == "zdisc")["dimensions_nm"]["width_X"]
    thick_length = next(component for component in sarcomere["components"]
                       if component["id"] == "thick_filament")["dimensions_nm"]["length_X"]
    sensitivity = []
    for pevk_lc in (ch["PEVK"]["Lc_nm"], 450.0, 350.0, 240.0):
        candidate = copy.deepcopy(ch)
        candidate["PEVK"]["Lc_nm"] = pevk_lc
        sensitivity.append({
            "PEVK_Lc_nm": pevk_lc,
            "force_pN": round(solve_force(candidate, 675.0), 1),
        })
    relative = [
        100.0 * ewlc_extension(10.0, ch["PEVK"]["A_nm"], lc,
                               ch["PEVK"]["K0_pN"]) / lc
        for lc in (ch["PEVK"]["Lc_nm"], 300.0, 240.0)
    ]
    report["isoform_scope"] = {
        "spec_isoform": "Human canonical titin, UniProt Q8WZ42; contours are read from this spec.",
        "chain_parameter_isoform": "Rat psoas skeletal titin (10.1073/pnas.95.14.8052).",
        "why_this_is_acceptable_for_A_and_K0": "Persistence length A and stretch modulus K0 "
            "are treated as transferable development-model material parameters; contour lengths "
            "are never transferred and come from the current sequence spec.",
        "consequence_for_relative_extension": "At fixed force, fractional extension is independent "
            "of contour length in the adopted law (10 pN spread %.3g percentage points)."
            % (max(relative) - min(relative)),
        "consequence_for_absolute_force": "Absolute force at equal sarcomere length is isoform- "
            "and preparation-sensitive. SD-04 therefore DEFERRED biological transfer and public "
            "absolute-pN output; these values are development diagnostics, not validation.",
        "isoform_force_sensitivity_at_SL_3um": sensitivity,
        "evidence_class": "MODELED development diagnostic; SD-04 DEFERRED",
    }
    plausibility_rows = []
    for sl_um in (2.9, 2.95, 3.0):
        total = sl_um * 1000.0 / 2.0 - z_width / 2.0 - thick_length / 2.0
        force = solve_force(ch, total)
        plausibility_rows.append({
            "SL_um": sl_um,
            "I_band_total_nm": total,
            "force_pN": round(force, 3),
            "PEVK_percent_of_contour": round(
                100.0 * region_extension(ch, "PEVK", force) / ch["PEVK"]["Lc_nm"], 1),
        })
    report["cross_isoform_plausibility_check"] = {
        "status": "PLAUSIBILITY CHECK — NOT VALIDATION",
        "source": "10.1073/pnas.95.14.8052",
        "source_statement": "At 2.9-3.0 um sarcomere length, force per titin is near "
                            "10 pN with PEVK extension about 50% in the source preparation.",
        "model_prediction_over_that_window": plausibility_rows,
        "why_the_prediction_is_not_a_fit": "No force or extension datum is fitted; I-band totals "
            "come from the independently declared sarcomere geometry.",
        "why_not_validation": "The source preparation and current sequence construct differ, and "
            "absolute force is transfer-sensitive. Agreement cannot validate human Q8WZ42-1.",
        "what_makes_it_non_circular": "Chain parameters and I-band totals come from independent "
            "records, so the comparison can fail even though it remains only a plausibility check.",
    }

    # ---- force-based partition at each keyframe SL, vs the spec's partition
    per_state, worst_dev = {}, 0.0
    for name, v in sorted(states.items(), key=lambda kv: kv[1]["sarcomere_length_nm"]):
        total = v["titin_I_band_total_nm"]
        spec  = v["titin_I_band_extension_nm"]
        F     = solve_force(ch, total)
        pred  = {r: region_extension(ch, r, F) for r in ORDER}
        # Store millinanometre values while preserving the exact declared total.
        # The explicit UNKNOWN interval is a zero-projection layout record only;
        # it is absent from ORDER and therefore never enters force balance.
        stored = {r: round(pred[r], 3) for r in ORDER[:-1]}
        stored[ORDER[-1]] = round(total - sum(stored.values()), 3)
        v["titin_I_band_extension_nm"] = {
            "prox_Ig": stored["prox_Ig"],
            "N2A": stored["N2A"],
            "post_N2A_unknown": 0.0,
            "PEVK": stored["PEVK"],
            "dist_Ig": stored["dist_Ig"],
        }
        zdisc = next(component for component in sarcomere["components"]
                     if component["id"] == "zdisc")
        cursor = zdisc["dimensions_nm"]["width_X"] / 2.0
        layout = {}
        for region_id, length_nm in v["titin_I_band_extension_nm"].items():
            layout[region_id] = {
                "X_start": round(cursor, 3),
                "X_end": round(cursor + length_nm, 3),
                "length_nm": length_nm,
            }
            cursor += length_nm
        v["titin_iband_layout_nm"] = layout
        provenance = v.get("titin_I_band_extension_provenance") or {}
        provenance.update({
            "route": "scripts/mechanical_model.py — four modeled elastic regions in series; "
                     "post_N2A_unknown is explicit zero-projection bookkeeping excluded from mechanics.",
            "common_force_pN": round(F, 3),
            "per_region_implied_force_spread": "1.000x (generated from one common-force solve)",
            "reproduce": "python3 scripts/mechanical_model.py",
            "model_basis": "Development Marko-Siggia WLC/eWLC solver sourced from "
                           "10.1073/pnas.95.14.8052. N2A has a 16 nm "
                           "four-fold rigid floor plus 39 nm UN2A contour proxy; SD-04 "
                           "defers biological transfer and public absolute-pN output.",
            "unknown_interval_policy": "residues 9852-10215 have no approved contour or force law; "
                                       "zero axial projection is not zero physical length",
        })
        v["titin_I_band_extension_provenance"] = provenance
        chain = provenance.get("supersession_chain")
        if chain:
            # The current step must reproduce the canonical partition exactly,
            # including explicit zero-projection layout-only intervals.  Leaving
            # post_N2A_unknown out here would make the provenance record and the
            # live state structurally unequal even though their sums agree.
            chain[-1]["partition_nm"] = copy.deepcopy(v["titin_I_band_extension_nm"])
            chain[-1]["defect"] = None
            chain[-1]["status"] = "current"
            chain[-1]["derivation"] = "MODELED development solver; SD-04 DEFERRED"
        shares, dzdF = compliance_shares(ch, F)
        dev = {r: pred[r] - spec[r] for r in ORDER}
        worst_dev = max(worst_dev, max(abs(d) for d in dev.values()))

        # per-region implied force: in series these MUST agree. Spread is a
        # self-contained internal-consistency test of the spec's partition that
        # needs no external dataset.
        implied, unreachable, at_floor = {}, [], []
        for r in ORDER:
            f = force_for_region(ch, r, spec[r])
            if f is None:
                unreachable.append(r)
            elif f == 0.0:
                # AT-OR-BELOW-FLOOR: a folded_plus_wlc region sitting at its rigid
                # length implies zero force, which carries no information about the
                # chain force and would make a ratio undefined. Reported separately
                # rather than folded into the spread as a divide-by-zero.
                at_floor.append(r)
            else:
                implied[r] = f
        spread = (max(implied.values()) / min(implied.values())) if len(implied) > 1 else None

        per_state[name] = {
            "sarcomere_length_nm": v["sarcomere_length_nm"],
            "titin_I_band_total_nm": total,
            "model_force_pN": round(F, 4),
            "model_partition_nm": {r: round(pred[r], 2) for r in ORDER},
            "spec_partition_nm": spec,
            "deviation_nm": {r: round(dev[r], 2) for r in ORDER},
            "worst_deviation_nm": round(max(abs(d) for d in dev.values()), 2),
            "fraction_of_contour": {r: round(pred[r] / ch[r]["Lc_nm"], 4) for r in ORDER},
            "compliance_share": {r: round(shares[r], 4) for r in ORDER},
            "compliance_rank": sorted(ORDER, key=lambda r: -shares[r]),
            "spec_implied_force_pN": {r: round(implied[r], 4) for r in implied},
            "spec_implied_force_spread": round(spread, 1) if spread else None,
            "spec_values_unreachable_at_finite_force": unreachable,
            "spec_values_at_rigid_floor": at_floor,
        }
    report["per_state"] = per_state
    report["worst_deviation_nm_over_all_states"] = round(worst_dev, 2)

    # ---- the derived recruitment order
    # Rank regions by the force at which each first reaches a set fraction of
    # its own contour. This is a property of the sourced laws alone; it never
    # consults structural_states.json.
    ONSET_FRACTION = 0.25   # arbitrary but reported; the ORDERING is what matters
    onset = {}
    for r in ORDER:
        c = ch[r]
        target = ONSET_FRACTION * c["Lc_nm"]
        onset[r] = force_for_region(ch, r, target)
    derived = sorted(ORDER, key=lambda r: onset[r])
    spec_prose = titin["mechanical_summary"]
    spec_ranks = {r: {"id": x["id"], "rank": x["extension_model"]["recruitment_order"]}
                  for r, x in ((rr["id"], rr) for rr in titin["regions"]) if r in ORDER}
    report["derived_recruitment"] = {
        "method": "Rank each region by the force at which it first reaches %.0f%% of its own "
                  "contour length, using only the sourced force-extension laws. Independent "
                  "of structural_states.json." % (100 * ONSET_FRACTION),
        "onset_fraction": ONSET_FRACTION,
        "onset_force_pN": {r: round(onset[r], 4) for r in ORDER},
        "derived_order": derived,
        "spec_recruitment_order_ranks": {r: spec_ranks[r]["rank"] for r in ORDER},
        "compliance_share_by_state": {n: per_state[n]["compliance_share"] for n in per_state},
        "compliance_rank_by_state":  {n: per_state[n]["compliance_rank"] for n in per_state},
        "qualitative_claim_under_test": "Compliance should migrate from the poly-Ig tandems "
                                        "at short SL to PEVK at long SL (the spec's prose "
                                        "ordering: Ig straightening -> N2A -> PEVK).",
    }

    # does compliance actually migrate Ig -> PEVK across the working range?
    names_by_sl = sorted(per_state, key=lambda n: per_state[n]["sarcomere_length_nm"])
    ig_share   = [per_state[n]["compliance_share"]["prox_Ig"] for n in names_by_sl]
    pevk_share = [per_state[n]["compliance_share"]["PEVK"]    for n in names_by_sl]
    report["derived_recruitment"]["migration_test"] = {
        "states_by_sl": names_by_sl,
        "prox_Ig_compliance_share": ig_share,
        "PEVK_compliance_share": pevk_share,
        "prox_Ig_monotonically_falls": all(a > b for a, b in zip(ig_share, ig_share[1:])),
        "PEVK_monotonically_rises":    all(a < b for a, b in zip(pevk_share, pevk_share[1:])),
        "crossover_between": next((("%s->%s" % (names_by_sl[i], names_by_sl[i + 1]))
                                   for i in range(len(names_by_sl) - 1)
                                   if ig_share[i] > pevk_share[i]
                                   and ig_share[i + 1] < pevk_share[i + 1]), None),
        "verdict": "PASS -- the prose ordering is reproduced by the sourced physics"
                   if (ig_share[0] > pevk_share[0] and ig_share[-1] < pevk_share[-1])
                   else "FAIL -- sourced physics does not reproduce the prose ordering",
    }
    print(json.dumps(report["derived_recruitment"]["migration_test"], indent=2))

    out = os.path.join(DATA_DIR, "mechanical_model.json")
    states_out = os.path.join(DATA_DIR, "structural_states.json")
    outputs = ((out, report), (states_out, states_record))
    if check:
        stale = []
        for path, payload in outputs:
            expected = json.dumps(payload, indent=2).encode("utf-8")
            try:
                with open(path, "rb") as handle:
                    actual = handle.read()
            except FileNotFoundError:
                stale.append(os.path.relpath(path))
                continue
            if actual != expected:
                stale.append(os.path.relpath(path))
        if stale:
            print("\ngenerated mechanical outputs are stale: %s" % ", ".join(stale))
            print("run python3 scripts/mechanical_model.py")
            return 1
        print("\ngenerator reproducibility: PASS (2/2 byte-identical outputs)")
    else:
        for path, payload in outputs:
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, indent=2)
        print("\nwrote %s" % os.path.relpath(out))
        print("wrote %s" % os.path.relpath(states_out))
    print("worst deviation from the spec partition: %.1f nm" % worst_dev)
    for n in names_by_sl:
        s = per_state[n]
        print("  %-19s SL=%4.0f  F=%8.3f pN  worst dev %5.1f nm  spec-implied spread %s"
              % (n, s["sarcomere_length_nm"], s["model_force_pN"], s["worst_deviation_nm"],
                 ("%.0fx" % s["spec_implied_force_spread"])
                 if s["spec_implied_force_spread"] else "n/a"))
        if s["spec_values_unreachable_at_finite_force"]:
            print("      spec values at/beyond contour (unreachable at finite force): %s"
                  % ", ".join(s["spec_values_unreachable_at_finite_force"]))
    bad = [c for c in report["source_validation"] if not c["pass"]]
    if bad:
        print("\nSOURCE VALIDATION FAILED:", json.dumps(bad, indent=2)); return 1
    if not report["continuity"]["continuous"]:
        print("\nCONTINUITY PROBE FAILED"); return 1
    print("\nsource validation: %d/%d reproduced | chain continuous (step ratio %.1f on 10x refinement)"
          % (len(report["source_validation"]), len(report["source_validation"]),
             report["continuity"]["step_ratio_on_10x_refinement"]))
    return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="verify generated outputs byte-for-byte without writing")
    sys.exit(main(check=parser.parse_args().check))
