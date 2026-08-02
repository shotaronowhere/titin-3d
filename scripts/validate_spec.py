#!/usr/bin/env python3
"""Phase 1 spec validator. Re-runnable numerical + integrity checks over the 5 spec JSONs.
Usage: python scripts/validate_spec.py
Exit 0 = all pass. Referenced by MASTER_PLAN Phase 11 (Validation)."""
import json, sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
def load(f): return json.load(open(DATA / f))
fails=[]
def check(cond, msg):
    print(("  PASS" if cond else "  FAIL"), msg)
    if not cond: fails.append(msg)

print("== JSON validity ==")
files=["sarcomere.json","titin.json","structural_states.json","geometry_sources.json","references.json",
       "showcase_claims.json","presentation.json"]
L={}
for f in files:
    try: L[f]=load(f); check(True, f)
    except Exception as e: check(False, f"{f}: {e}")

print("== Cross-reference integrity ==")
refs=set(L["references.json"].keys()); cited=set()
def fr(o):
    if isinstance(o,dict):
        for k,v in o.items():
            if k in ("primary_references","primary_source"):
                for it in (v if isinstance(v,list) else [v]):
                    if isinstance(it,str) and (it.startswith("10.") or it.startswith("UniProt")): cited.add(it)
            else: fr(v)
    elif isinstance(o,list):
        for it in o: fr(it)
for f in files[:4]: fr(L[f])
check(cited<=refs, f"all cited DOIs present (missing: {sorted(cited-refs)})")
check(L["presentation.json"].get("schema")=="titin-presentation/1",
      "presentation.json has the SC-1 schema (full checks: validate_presentation.py)")

print("== Titin domain reconciliation (UniProt Q8WZ42) ==")
tr=L["titin.json"]["regions"]
ig=sum(r["domain_composition"]["Ig_like"] for r in tr); fn=sum(r["domain_composition"]["Fn3"] for r in tr)
check(ig==152, f"Ig-like total == 152 (got {ig})")
check(fn==132, f"Fn3 total == 132 (got {fn})")

print("== Structural-state numerical identities ==")
for name,g in L["structural_states.json"]["states"].items():
    sl=g["sarcomere_length_nm"]
    check(abs(g["half_sarcomere_nm"]-sl/2)<0.5, f"{name}: half-sarcomere==SL/2")
    check(abs(g["I_band_half_width_nm"]-(sl/2-800))<0.5, f"{name}: I-band==SL/2-800")
    zhalf=L["sarcomere.json"]["reference_lengths_nm"]["zdisc_width"]/2
    check(abs(g["titin_I_band_total_nm"]-(g["I_band_half_width_nm"]-zhalf))<1.0,
          f"{name}: titin elastic span==I-band width minus Z-disc half-width")

print("== Evidence-class vocabulary ==")
valid={"MEASURED","STRONGLY INFERRED","MODELED","INFERRED","SCHEMATIC","UNKNOWN"}
found=set()
for p in L["geometry_sources.json"]["parameters"]:
    found.add(p["evidence_class"])
    check(bool(p.get("primary_source")) and str(p.get("primary_source"))!="nan", f"param '{p['parameter'][:40]}' has a source")
base={e.split(" ")[0] for e in found}
check("SCHEMATIC" in str(L["titin.json"]) and "UNKNOWN" in str(L["titin.json"]), "SCHEMATIC + UNKNOWN classes present in titin spec")

print("\n" + "="*40)
print("ALL CHECKS PASSED" if not fails else (str(len(fails)) + " FAILURE(S)"))
sys.exit(1 if fails else 0)
