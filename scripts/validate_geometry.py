#!/usr/bin/env python3
"""Spec validator. Re-runnable numerical + integrity checks over the 5 spec JSONs.
Usage: python validate_geometry.py  (resolves data/ relative to this script, or
uses cwd if the files are alongside). Exit 0 = all pass.
Referenced by MASTER_PLAN Phase 11 (Validation)."""
import hashlib, json, re, sys, os

# Resolve the spec directory: prefer ../data (app layout), else script dir, else cwd.
_HERE = os.path.dirname(os.path.abspath(__file__))
_CANDIDATES = [os.path.join(_HERE, "..", "data"), _HERE, os.getcwd()]
DATA_DIR = next((d for d in _CANDIDATES if os.path.exists(os.path.join(d, "sarcomere.json"))), os.getcwd())

def load(f): return json.load(open(os.path.join(DATA_DIR, f)))
fails=[]
def check(cond, msg):
    print(("  PASS" if cond else "  FAIL"), msg)
    if not cond: fails.append(msg)

# The validator re-derives mechanical claims from the reference implementation
# rather than trusting numbers recorded in the spec.
import importlib.util as _ilu
_mm_spec = _ilu.spec_from_file_location("_mmref", os.path.join(_HERE, "mechanical_model.py"))
_mmref = _ilu.module_from_spec(_mm_spec); _mm_spec.loader.exec_module(_mmref)
_mm_solve, _mm_region = _mmref.solve_force, _mmref.region_extension

print("== JSON validity ==")
files=["sarcomere.json","titin.json","structural_states.json","geometry_sources.json",
       "references.json",
       # geometry_strategy.json holds the evidence-class vocabulary itself and was
       # not loaded here before session 9 — the definitions every other check
       # relies on were themselves unvalidated.
       "geometry_strategy.json","mechanical_model.json","showcase_claims.json","presentation.json",
       # SC-4 added annotations.json as a REQUIRED spec file (SpecLoader.SPEC_FILES)
       # but did not register it here, so the coverage guard below was failing and
       # nothing in this validator looked at the catalog. Registered in SC-5.
       "annotations.json",
       # SC-8 release record. Not a spec: it carries no coordinate and the renderer
       # never loads it. Registered here for the same reason presentation.json is —
       # a registry check beside the deep validator, so a new data file cannot slip
       # past the coverage guard by living outside the loader's manifest.
       "release_gates.json"]
L={}
for f in files:
    try: L[f]=load(f); check(True, f)
    except Exception as e: check(False, f"{f}: {e}")

# The registry above is a single point of failure: a new spec file that nobody adds
# to `files` escapes every check below it. geometry_strategy.json (the evidence
# vocabulary itself) and mechanical_model.json both did exactly that until session 9.
print("== Validator covers every spec file ==")
# Files not eagerly loaded above must be validated in a dedicated section further
# down; each is declared here with WHERE, so a genuinely new file cannot slip in.
_DEFERRED = {
    "context_measurements.json":     "== Phase 11: context_measurements.json ==",
    "interdomain_measurements.json": "_ID_PATH block (Phase 6 interdomain geometry)",
    "structure_measurements.json":   "Phase 6 structure-measurement provenance checks",
    # SC-16.2. Derived from the pinned structure cache, and validated against it:
    # it asserts MEASURED coordinates and a deposition per archetype, so both the
    # provenance and the frame it claims have to be checked, not just its shape.
    "domain_backbones.json":         "== SC-16.2: domain_backbones.json ==",
}
_on_disk = sorted(f for f in os.listdir(DATA_DIR) if f.endswith(".json"))
_covered = set(files) | set(_DEFERRED)
_uncovered = [f for f in _on_disk if f not in _covered]
check(not _uncovered,
      f"every .json in data/ is validated somewhere (uncovered: {_uncovered})")
_stale = [f for f in _covered if f not in _on_disk]
check(not _stale, f"registry names no file that has been deleted (stale: {_stale})")
# a deferred file is only 'covered' if its section actually still exists
_own_src = open(os.path.abspath(__file__)).read()
for _df, _where in _DEFERRED.items():
    check(_own_src.count(f'"{_df}"') >= 2 or _df in _own_src.replace(f'"{_df}"', "", 1),
          f"deferred file {_df} is still referenced by its validating section ({_where})")
check(len(_covered) == len(_on_disk),
      f"all {len(_on_disk)} spec files accounted for ({len(files)} eager, {len(_DEFERRED)} deferred)")

print("== Structural raw-source reproducibility ==")
_RAW_DIR = os.path.join(DATA_DIR, "structures")
_RAW_MANIFEST = os.path.join(_RAW_DIR, "manifest.json")
try:
    _RM = json.load(open(_RAW_MANIFEST))
    check(_RM.get("schema") == "titin-structural-sources/1",
          "raw structural source manifest has the expected schema")
except Exception as _e:
    _RM = {"files": []}
    check(False, f"raw structural source manifest loads: {_e}")
_rfiles = _RM.get("files") or []
_rnames = [x.get("file") for x in _rfiles]
check(len(_rnames) == len(set(_rnames)), "raw structural source filenames are unique")
check(all(re.fullmatch(r"[0-9a-f]{64}", x.get("sha256") or "") for x in _rfiles),
      "every raw structural source is SHA-256 pinned")
check(all(isinstance(x.get("bytes"), int) and x["bytes"] > 0 for x in _rfiles),
      "every raw structural source records a positive byte count")
check(all(str(x.get("url", "")).startswith("https://") for x in _rfiles),
      "every raw structural source uses an explicit HTTPS URL")
_single = set(load("structure_measurements.json")["entries"])
_interdomain_doc = load("interdomain_measurements.json")
_tandem = set(_interdomain_doc["entries"])
_context = set(load("context_measurements.json")["structures"])
_in_situ = _interdomain_doc.get("in_situ_cross_check", {}).get("pdb_id")
_interdomain_inputs = _tandem | ({_in_situ} if _in_situ else set())
_required_raw = ({f"{x}.cif" for x in _single | _tandem | _context}
                 | {f"{x}.cif" for x in _interdomain_inputs}
                 | {f"{x}_sifts.json" for x in _single | _interdomain_inputs}
                 | {"Q8WZ42.fasta", "Q8WZ42_ft_domain.json"})
check(_required_raw <= set(_rnames),
      f"manifest covers every measurement input (missing: {sorted(_required_raw-set(_rnames))})")
for _doc_name in ("structure_measurements.json", "interdomain_measurements.json",
                  "context_measurements.json"):
    check("structures/manifest.json" in load(_doc_name).get("raw_source_manifest", ""),
          f"{_doc_name} points to the byte-pinned raw-source manifest")
# Raw inputs are intentionally Git-ignored; when the cache is present, validate
# every byte. A clean checkout remains valid because fetch_structures.py recreates
# the exact cache from these pins.
for _entry in _rfiles:
    _path = os.path.join(_RAW_DIR, _entry["file"])
    if not os.path.isfile(_path):
        continue
    _h = hashlib.sha256()
    with open(_path, "rb") as _fh:
        for _block in iter(lambda: _fh.read(1024 * 1024), b""):
            _h.update(_block)
    check(os.path.getsize(_path) == _entry["bytes"] and _h.hexdigest() == _entry["sha256"],
          f"cached raw source {_entry['file']} matches its pin")

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

# SC-0 presentation claims do not drive geometry yet, but they are a scientific
# data record and therefore cannot escape the all-data registry above. The
# dedicated validator performs the full contract audit; these checks keep the
# geometry validator independently aware of its schema and source closure.
print("== SC-0 showcase claim registry ==")
_SC = L["showcase_claims.json"]
check(_SC.get("schema") == "titin-showcase-claim-audit/1",
      "showcase claim matrix has the reviewed schema")
_sc_objects = _SC.get("objects") or []
check(bool(_sc_objects), "showcase claim matrix is non-empty")
_sc_ids = [x.get("id") for x in _sc_objects]
check(len(_sc_ids) == len(set(_sc_ids)), "showcase claim object IDs are unique")
_sc_external = {
    src.get("id")
    for obj in _sc_objects
    for src in (obj.get("sources") or [])
    if src.get("kind") == "REFERENCE"
}
check(_sc_external <= refs,
      f"showcase external sources resolve (missing: {sorted(_sc_external-refs)})")
_sc_internal = [
    src.get("id")
    for obj in _sc_objects
    for src in (obj.get("sources") or [])
    if src.get("kind") == "INTERNAL"
]
check(all(path and os.path.isfile(os.path.join(os.path.dirname(DATA_DIR), path))
          for path in _sc_internal),
      "showcase internal sources resolve to repository files")

print("== SC-1 presentation registry ==")
_PR = L["presentation.json"]
check(_PR.get("schema") == "titin-presentation/1",
      "presentation record has the reviewed SC-1 schema")
_pr_ids = [row.get("id") for key in ("audience_modes", "scope_badges", "length_presets",
                                     "guided_chapters", "expert_cards", "presenter_shortcuts")
           for row in (_PR.get(key) or [])]
check(len(_pr_ids) == len(set(_pr_ids)), "presentation record IDs are globally unique")
_pr_sources = {source for row in ((_PR.get("scope_badges") or [])
                                  + (_PR.get("guided_chapters") or [])
                                  + (_PR.get("expert_cards") or []))
               for source in (row.get("source_ids") or [])}
check(_pr_sources <= refs,
      f"presentation source IDs resolve (missing: {sorted(_pr_sources-refs)})")

print("== SC-4 annotation registry ==")
_AN = L["annotations.json"]
check(_AN.get("schema") == "titin-object-annotations/1",
      "annotation catalog has the reviewed SC-4 schema")
_an_records = _AN.get("components") or []
_an_ids = [row.get("id") for row in _an_records]
_an_targets = [row.get("target_id") for row in _an_records]
check(len(_an_ids) == len(set(_an_ids)) and len(_an_targets) == len(set(_an_targets)),
      "annotation IDs and biological targets are unique")
_an_sources = {source for row in _an_records for source in (row.get("source_ids") or [])}
check(_an_sources <= refs,
      f"annotation source IDs resolve (missing: {sorted(_an_sources-refs)})")
# The catalog may not strengthen a claim its SC-0 binding already bounded.
_an_bad = []
for _row in _an_records:
    _bind = (_row.get("binding") or {})
    if _bind.get("kind") != "showcase_claim":
        continue
    _obj = next((o for o in _sc_objects if o.get("id") == _bind.get("id")), None)
    if not _obj:
        _an_bad.append(f"{_row.get('id')} -> missing claim {_bind.get('id')}")
        continue
    _rank = {"UNKNOWN":0,"SCHEMATIC":1,"INFERRED":2,"MODELED":3,"STRONGLY INFERRED":4,"MEASURED":5}
    for _field in ("claim_evidence_class", "render_evidence_class"):
        _a = _rank.get(str(_row.get(_field, "")).split(" (")[0])
        _b = _rank.get(str(_obj.get(_field, "")).split(" (")[0])
        if _a is None or _b is None or _a > _b:
            _an_bad.append(f"{_row.get('id')}.{_field} exceeds {_bind.get('id')}")
check(not _an_bad, f"annotation evidence stays within its admitted claim ({_an_bad})")

print("== SC-18 release-gate registry ==")
_RG = L["release_gates.json"]
check(_RG.get("schema") == "titin-showcase-release-gates/2",
      "release-gate record has the reviewed SC-18 schema")
_rg_sections = ("artifact_identity", "scientific_decisions", "claim_entailment",
                "mechanical_validity", "browser_qa", "deployment_parity",
                "automated", "destructive_controls", "visual_matrix",
                "lay_comprehension", "expert_review", "accessibility", "performance",
                "release_artifacts", "demo_rehearsal", "final_release_definition")
_rg_missing = [s for s in _rg_sections if not isinstance(_RG.get(s), dict)]
check(not _rg_missing, f"every release-gate section is present (missing: {_rg_missing})")
# Deep rules live in validate_release_gates.py; the one invariant worth repeating
# here is the one that matters most, so a stale record cannot claim readiness even
# if only this validator is run.
_rg_outstanding = [s for s in _rg_sections if (_RG.get(s) or {}).get("status") != "PASS"]
check(_RG.get("release_ready") is False or not _rg_outstanding,
      f"release_ready is not claimed while gates are outstanding ({_rg_outstanding})")
# Every automated verifier the record names must exist in the repository.
_rg_bad = []
for _section in _rg_sections:
    for _row in (_RG.get(_section) or {}).get("checks", []):
        if _row.get("verification") != "automated":
            continue
        _files = [p for p in str(_row.get("verified_by", "")).replace(";", " ").split()
                  if "/" in p]
        if not _files or not any(os.path.isfile(os.path.join(os.path.dirname(DATA_DIR), p))
                                 for p in _files):
            _rg_bad.append(f"{_section}.{_row.get('id')}")
check(not _rg_bad, f"every automated release check names a real file ({_rg_bad})")

print("== Titin domain reconciliation (UniProt Q8WZ42) ==")
tr=L["titin.json"]["regions"]
ig=sum(r["domain_composition"]["Ig_like"] for r in tr); fn=sum(r["domain_composition"]["Fn3"] for r in tr)
check(ig==152, f"Ig-like total == 152 (got {ig})")
check(fn==132, f"Fn3 total == 132 (got {fn})")

print("== Structural-state numerical identities ==")
# Z-disc half-width: titin's elastic segment emerges at the Z-disc edge (Z1Z2 anchored in the Z-disc)
_zd=[c for c in L["sarcomere.json"]["components"] if c["id"]=="zdisc"][0]
Z_HALF=_zd["dimensions_nm"]["width_X"]/2
for name,g in L["structural_states.json"]["states"].items():
    sl=g["sarcomere_length_nm"]
    check(abs(g["half_sarcomere_nm"]-sl/2)<0.5, f"{name}: half-sarcomere==SL/2")
    check(abs(g["I_band_half_width_nm"]-(sl/2-800))<0.5, f"{name}: I-band==SL/2-800")
    # elastic titin span == I-band half-width - Z-disc half-width (Z-disc edge -> A-band tip)
    check(abs(g["titin_I_band_total_nm"]-(g["I_band_half_width_nm"]-Z_HALF))<1.0,
          f"{name}: titin elastic span==I-band half-width - Z-disc half-width")
    # sum of extension components must equal the stored total
    check(abs(sum(g["titin_I_band_extension_nm"].values())-g["titin_I_band_total_nm"])<1.0,
          f"{name}: extension components sum==titin_I_band_total")
    # distal titin end must land exactly at the A-band tip
    check(abs(g["titin_iband_layout_nm"]["dist_Ig"]["X_end"]-g["I_band_half_width_nm"])<1.0,
          f"{name}: distal titin end==A-band tip")

print("== Evidence-class vocabulary ==")
valid={"MEASURED","STRONGLY INFERRED","MODELED","INFERRED","SCHEMATIC","UNKNOWN"}
found=set()
for p in L["geometry_sources.json"]["parameters"]:
    found.add(p["evidence_class"])
    check(bool(p.get("primary_source")) and str(p.get("primary_source"))!="nan", f"param '{p['parameter'][:40]}' has a source")
base={e.split(" ")[0] for e in found}
check("SCHEMATIC" in str(L["titin.json"]) and "UNKNOWN" in str(L["titin.json"]), "SCHEMATIC + UNKNOWN classes present in titin spec")

print("== Phase-0 quantitative-value metadata (9 required fields per parameter) ==")
REQ0 = ["value","unit","species","isoform","muscle_type","biological_state","method","uncertainty","primary_source"]
for p in L["geometry_sources.json"]["parameters"]:
    miss = [f for f in REQ0 if p.get(f) in (None, "")]
    check(not miss, f"param '{p['parameter'][:38]}' has all 9 Phase-0 fields" + (f" (missing {miss})" if miss else ""))

print("== Phase-1 component record completeness ==")
# Field names as actually used in the spec (synonyms accepted per file convention).
REQ1_SARC = ["id","name","biological_role","parent","position_nm","dimensions_nm","orientation","principal_axis",
             "attachment_points","relationships","repeating_geometry","mechanical_behavior","state_dependence",
             "species","isoform","biological_condition","evidence_class","primary_references","notes"]
REQ1_TITIN = ["id","name","biological_role","parent_structure","resting_axial_position_nm","dimensions_nm",
              "orientation","principal_axes","attachment_points","relationships","repeating_geometry",
              "domain_composition","mechanical_class","state_dependence","species","isoform",
              "biological_condition","evidence_class","primary_references","notes"]
# "where applicable" (plan wording): the KEY must be present, so a deliberately empty
# value (e.g. a lattice has no binding partners) is explicit and distinguishable from an
# omission. Only a missing key — or a null/blank scalar — counts as incomplete.
def _incomplete(obj, fields):
    out = []
    for f in fields:
        if f not in obj:
            out.append(f)                       # key absent -> genuine omission
        elif obj[f] is None or obj[f] == "":
            out.append(f)                       # null/blank -> not an explicit statement
    return out

for c in L["sarcomere.json"]["components"]:
    miss = _incomplete(c, REQ1_SARC)
    check(not miss, f"sarcomere component '{c['id']}' complete" + (f" (missing {miss})" if miss else ""))
for r in L["titin.json"]["regions"]:
    miss = _incomplete(r, REQ1_TITIN)
    check(not miss, f"titin region '{r['id']}' complete" + (f" (missing {miss})" if miss else ""))

print("== Attachment-point sourcing (every attachment cites a real reference) ==")
_refs = set(L["references.json"].keys())
for r in L["titin.json"]["regions"]:
    for ap in r.get("attachment_points", []):
        src = ap.get("source")
        check(src in _refs, f"{r['id']} attachment '{str(ap.get('partner'))[:30]}' cites a known reference")
        check(ap.get("evidence_class","").split(" ")[0] in
              {"MEASURED","STRONGLY","MODELED","INFERRED","SCHEMATIC","UNKNOWN"},
              f"{r['id']} attachment '{str(ap.get('partner'))[:30]}' has a valid evidence class")

print("\n== Phase-4 titin chain topology (single continuous polypeptide) ==")
# Titin is ONE polypeptide running Z-disc centre -> M-line centre. The documented
# resting layout must therefore tile without gaps or overlaps, and the anchored
# (thick-filament-bound) portion must span exactly the half thick filament.
_regions = L["titin.json"]["regions"]
_pos = [(r["id"], r["resting_axial_position_nm"]) for r in _regions]
for i in range(1, len(_pos)):
    prev_id, prev = _pos[i-1][0], _pos[i-1][1]
    cur_id, cur = _pos[i]
    gap = cur["X_start"] - prev["X_end"]
    check(abs(gap) < 1e-6,
          f"titin chain continuous {prev_id} -> {cur_id}" +
          (f" (gap {gap:+.2f} nm)" if abs(gap) >= 1e-6 else ""))
for _id, p in _pos:
    check(abs((p["X_end"] - p["X_start"]) - p["axial_length_nm"]) < 1e-6,
          f"{_id} axial_length_nm agrees with X_start/X_end")

_states = L["structural_states.json"]["states"]
_rest = _states["resting"]
check(abs(_pos[0][1]["X_start"] - 0.0) < 1e-6,
      "titin N-terminus (Z1Z2) starts at the Z-disc centre (X=0)")
check(abs(_pos[-1][1]["X_end"] - _rest["half_sarcomere_nm"]) < 1e-6,
      "titin C-terminus reaches the M-line centre (half-sarcomere)")

_thick = [c for c in L["sarcomere.json"]["components"] if c["id"] == "thick_filament"][0]
_half_thick = _thick["dimensions_nm"]["length_X"] / 2.0
_anchored = sum(p["axial_length_nm"] for _id, p in _pos
                if _id not in {"Z1Z2"} and
                {r["id"]: r for r in _regions}[_id].get("band") != "I-band")
check(abs(_anchored - _half_thick) < 1e-6,
      f"anchored titin spans the half thick filament ({_anchored} vs {_half_thick} nm)")

# A-band titin must begin exactly at the thick-filament tip (it is bound to it).
_aband = {r["id"]: r for r in _regions}["Aband_super"]["resting_axial_position_nm"]
check(abs(_aband["X_start"] - _rest["positions_nm"]["thick_tip_I_A_junction"]) < 1e-6,
      "A-band titin starts at the thick-filament tip (I/A junction)")

# Folded-domain contour must not be exceeded in extensible tandem-Ig regions at any
# state (that would depict Ig unfolding as ordinary length change — forbidden).
# geometry_strategy.json is the Phase-3 derived layer, loaded separately: it is NOT
# one of the five canonical spec files above (whose list is sliced elsewhere).
try:
    _GS = load("geometry_strategy.json")
except Exception as _e:
    _GS = None
    check(False, f"geometry_strategy.json loadable: {_e}")
_arche = _GS["domain_archetypes"]["Ig_like"]["axial_length_nm"] if _GS else None
_tp = _GS["titin_primitives"] if _GS else {}
for sname, st in _states.items():
    for rid, lay in (st.get("titin_iband_layout_nm") or {}).items():
        strat = _tp.get(rid, {})
        if strat.get("mechanical_class") != "extensible_straighten":
            continue
        n = strat.get("n_units") or 0
        if not n:
            continue
        rise = (lay["X_end"] - lay["X_start"]) / n
        check(rise <= _arche + 1e-6,
              f"{sname}/{rid} axial rise {rise:.3f} nm <= folded length {_arche} nm "
              "(no unfolding implied)")

print("\n== Phase-4 A-band zoning (only the C-zone has a sourced periodicity) ==")
# The spec records a super-repeat periodicity for the C-zone ONLY. The C-zone block
# must fit inside the thick-filament-bound segment and leave a positive remainder
# (the D-zone), whose spacing is a SCHEMATIC modelling choice, not a measurement.
if _GS:
    _rel = _GS["geometric_relationships"]["titin_Aband_super_repeat"]["values"]
    _nC = _rel["n_C_zone_super_repeats"] * _rel["domains_per_super_repeat"]
    _cLen = _rel["n_C_zone_super_repeats"] * _rel["super_repeat_periodicity_nm"]
    _ab = next((r for r in L["titin.json"]["regions"] if r["id"] == "Aband_super"), None)
    if _ab:
        _p = _ab["resting_axial_position_nm"]
        _span = _p["X_end"] - _p["X_start"]
        _nTot = sum(_ab.get("domain_composition", {}).values())
        check(_cLen <= _span + 1e-9,
              f"C-zone block {_cLen} nm fits the bound A-band span {_span:.1f} nm")
        check(_nTot - _nC > 0,
              f"D-zone remainder is positive ({_nTot} total - {_nC} C-zone = {_nTot - _nC})")
        # The C-zone periodicity must not be silently applied to the whole A-band:
        # if it were, the domain count and span would have to agree exactly.
        check(abs(_span - _nTot / _rel["domains_per_super_repeat"]
                  * _rel["super_repeat_periodicity_nm"]) > 1e-6,
              "A-band span is NOT the whole-region super-repeat product — confirms "
              "the D-zone needs its own (unsourced, SCHEMATIC) spacing")

print("\n== Phase-5 repeated-domain strategy (archetypes + representative structures) ==")
if _GS:
    _AR = _GS["domain_archetypes"]
    _sel = _GS.get("representative_structure_selection")
    check(_sel is not None,
          "selection provenance recorded (criteria + rejected candidates are auditable)")

    # Every fold class that actually occurs in titin.json must have an archetype,
    # otherwise some domains would be drawn with another class's exemplar.
    _classes = set()
    for _r in L["titin.json"]["regions"]:
        for _c, _n in (_r.get("domain_composition") or {}).items():
            if _n:
                _classes.add(_c)
    for _c in sorted(_classes):
        check(_c in _AR, f"fold class {_c} occurring in titin.json has its own archetype")

    # An archetype that is reachable must name a representative structure, and must
    # not claim that structure's coordinates have been measured (that is Phase 6).
    for _k, _a in _AR.items():
        _rs = _a.get("representative_structure")
        check(_rs is not None, f"archetype {_k} names a representative experimental structure")
        if _rs:
            check(bool(re.fullmatch(r"[0-9][A-Za-z0-9]{3}", _rs.get("pdb_id", ""))),
                  f"archetype {_k} representative pdb_id {_rs.get('pdb_id')!r} is a valid PDB code")
            check(_rs.get("uniprot_accession") == "Q8WZ42",
                  f"archetype {_k} representative maps to the reference accession Q8WZ42")
            _sp = _rs.get("uniprot_span") or {}
            check(0 < _sp.get("start", 0) < _sp.get("end", 0) <= 34350,
                  f"archetype {_k} representative span {_sp} lies inside the canonical sequence")
            check("does_not_claim" in _rs,
                  f"archetype {_k} representative states what it does NOT claim")

    # Ig and Fn3 share one axial length from one source; the per-zone rise/tilt
    # computation depends on that. If they ever diverge, placement breaks.
    if "Ig_like" in _AR and "Fn3" in _AR:
        check(_AR["Ig_like"]["axial_length_nm"] == _AR["Fn3"]["axial_length_nm"],
              "Ig_like and Fn3 archetypes share one axial length (per-zone tilt assumes it)")

    # The regions the selection reports as structure-free must be exactly the
    # regions the spec marks as having no folded conformation.
    if _sel:
        _zero = set((_sel.get("regions_with_zero_structures") or {}).keys()) - {"interpretation"}
        # A region reported structure-free may still contain a generic folded-domain
        # archetype when sequence annotation declares one. It must either declare no
        # folded domains, depict all of them in a composite, or explicitly document
        # the omission. The earlier version simply exempted N2A by name and hid a
        # real omission; the current check verifies the actual representation rule.
        _und = _GS.get("undepicted_declared_domains") or {}
        for _rid in sorted(_zero):
            _reg = next((r for r in L["titin.json"]["regions"] if r["id"] == _rid), None)
            if _reg is None:
                check(False, f"region {_rid} reported structure-free exists in titin.json")
                continue
            _nfold = sum((_reg.get("domain_composition") or {}).values())
            _repr = (_GS.get("titin_primitives") or {}).get(_rid) or {}
            _composite = (_repr.get("assembly") == "composite_spring"
                          and _repr.get("unit_archetype") in _AR
                          and _repr.get("n_units") == _nfold)
            _why = ("declares none — consistent" if _nfold == 0 else
                    f"declares {_nfold}, depicted by composite" if _composite else
                    f"declares {_nfold}, documented as undepicted")
            check(_nfold == 0 or _composite or _rid in _und,
                  f"region {_rid} reported structure-free: {_why}")

    # Undepicted declared domains must state a reason and what IS depicted instead —
    # an entry that merely names the gap would launder a silent omission.
    for _rid, _classes in (_GS.get("undepicted_declared_domains") or {}).items():
        if _rid.startswith("_"):
            continue
        for _cls, _e in _classes.items():
            for _field in ("reason", "what_is_depicted", "why_not_fixed_here"):
                check(bool(_e.get(_field)),
                      f"undepicted {_rid}/{_cls} documents '{_field}'")
            check(_e.get("instanced", -1) == 0 or _e.get("instanced", -1) < _e.get("declared", 0),
                  f"undepicted {_rid}/{_cls} instanced {_e.get('instanced')} < declared {_e.get('declared')}")


# ---------------------------------------------------------------- PHASE 6
# Geometry measured from deposited coordinates. These checks protect provenance,
# not appearance: the danger in a measurement pipeline is that a fitted number
# quietly acquires more authority than the coordinates justify, or displaces a
# reviewed literature value that drives layout.
_MEAS_PATH = os.path.join(os.path.dirname(__file__), "..", "data",
                          "structure_measurements.json")
_MEAS = json.load(open(_MEAS_PATH)) if os.path.exists(_MEAS_PATH) else None
_ADOPT = (_GS or {}).get("measured_geometry_adoption")

if _GS and _ADOPT:
    check(_MEAS is not None, "adoption records exist only alongside the measurements file")
    for _f in ("adopted", "not_adopted", "layout_invariance",
               "representation_choice", "asset_export"):
        check(bool(_ADOPT.get(_f)), f"adoption record documents '{_f}'")

    _lit_axial = 4.0
    for _cls in ("Ig_like", "Fn3", "kinase"):
        _a = _AR.get(_cls) or {}
        _g = _a.get("measured_geometry")
        check(_g is not None, f"{_cls} carries measured_geometry")
        if not _g:
            continue

        # Provenance must be citable, and must name the entries it rests on.
        check(_g.get("n_independent_entries", 0) >= 2,
              f"{_cls} measured geometry rests on >=2 independent PDB entries "
              f"(got {_g.get('n_independent_entries')})")
        check(len(_g.get("entries_used") or []) == _g.get("n_independent_entries"),
              f"{_cls} entries_used matches n_independent_entries")
        check(str(_g.get("source", "")).startswith("PDB:"),
              f"{_cls} measurement cites a registered PDB-derived source")

        # A fitted primitive must actually enclose the atoms it stands for.
        _prim = _a.get("primitive")
        _encl = (_g.get("ellipsoid_enclosure_frac") if _prim == "ellipsoid"
                 else _g.get("capsule_enclosure_frac"))
        check(_encl is not None and _encl >= 0.95,
              f"{_cls} chosen primitive '{_prim}' encloses >=95% of heavy atoms "
              f"(got {_encl})")

        # The lateral diameter was a SCHEMATIC placeholder; upgrading it must
        # record what it replaced, so the upgrade stays auditable.
        check("lateral_diameter_previous_schematic_nm" in _a,
              f"{_cls} records the schematic lateral diameter it replaced")
        check(_a.get("lateral_diameter_nm") != _a.get("lateral_diameter_previous_schematic_nm"),
              f"{_cls} lateral diameter actually changed from its placeholder")
        check(str(_a.get("lateral_diameter_source", "")).startswith("PDB:"),
              f"{_cls} lateral diameter cites its measurement")

        # An axial length that is NOT chain-aligned must not be asserted as one.
        _off = _g.get("n_to_c_vs_long_axis_deg")
        check(_off is not None, f"{_cls} reports N-to-C angle against its long axis")
        if _off is not None and _off > 30:
            check(any("orientation" in str(x).lower() for x in (_a.get("not_claimed") or [])),
                  f"{_cls} chain runs {_off} deg off its long axis and must disclaim "
                  "any orientation claim")
        # The axial length in use must never be the long-axis extent when the
        # chain does not run along it.
        if _a.get("axial_length_nm") is not None and _off is not None and _off > 30:
            check(abs(_a["axial_length_nm"] - _g["longest_principal_extent_nm"]) > 1e-9,
                  f"{_cls} must not use its long-axis extent as an axial length")

    # Ig/Fn3: the literature value drives layout and must survive Phase 6.
    for _cls in ("Ig_like", "Fn3"):
        _a, _g = _AR[_cls], _AR[_cls]["measured_geometry"]
        check(_g.get("axial_length_adopted") is False,
              f"{_cls} must NOT adopt a measured axial length (it drives layout)")
        check(bool(_g.get("axial_length_not_adopted_because")),
              f"{_cls} records why the measurement was not adopted")
        check(abs(_a["axial_length_nm"] - _lit_axial) < 1e-9,
              f"{_cls} axial length remains the literature {_lit_axial} nm "
              f"(got {_a['axial_length_nm']})")
        check(_g.get("literature_axial_source") == "10.1016/j.jmb.2020.06.025",
              f"{_cls} names the literature source it retains")
        # The measurement must still be recorded — retaining the literature value
        # is only defensible if the disagreement is visible and small.
        _dev = _g.get("literature_deviation_sd")
        check(_dev is not None and _dev <= 2.0,
              f"{_cls} literature value lies within 2 SD of the measurement "
              f"(got {_dev} SD) — beyond that, retention needs re-argument")

    # The kinase gap Phase 6 was meant to close.
    _k = _AR["kinase"]
    check(_k.get("axial_length_nm") is not None,
          "kinase has an axial length (was absent; instances emitted null)")
    check(abs(_k["axial_length_nm"] - _k["measured_geometry"]["n_to_c_axial_nm"]) < 1e-9,
          "kinase axial length is its measured N-to-C extent, not its long axis")

    # No mesh assets: the deliverable is a parameter set.
    check("no mesh" in str(_ADOPT.get("asset_export", "")).lower()
          or "not a mesh" in str(_ADOPT.get("asset_export", "")).lower(),
          "adoption states that no mesh asset is exported")

if _MEAS:
    # Every measured chain must have been validated against the canonical
    # sequence; an unvalidated mapping could silently measure the wrong protein.
    for _cls, _c in (_MEAS.get("classes") or {}).items():
        for _ch in (_c.get("primary_chains") or []):
            _lbl = f"{_ch.get('pdb_id')}/{_ch.get('chain')}"
            # Did we measure the right protein? Over the mapped span, sequence
            # must match the canonical sequence essentially perfectly. A terminal
            # expression-tag remnant does NOT count against this — that is what
            # native_residue_frac tracks separately.
            check((_ch.get("core_identity_frac") or 0) >= 0.98,
                  f"{_cls} chain {_lbl} matches Q8WZ42 across its mapped span at "
                  f">=98% (got {_ch.get('core_identity_frac')})")
            # An internal mismatch may be a real, explained sequence variant OR a
            # mis-registered chain. Only the explained case is acceptable, and it
            # must carry its explanation — an undocumented mismatch fails.
            for _mm in (_ch.get("internal_mismatch_detail") or []):
                check(bool(_mm.get("documented")),
                      f"{_cls} chain {_lbl} differs from Q8WZ42 at position "
                      f"{_mm.get('uniprot_position')} "
                      f"({_mm.get('canonical')}->{_mm.get('observed')}) and that "
                      "difference is documented as a verified variant")
            check(len(_ch.get("internal_mismatches") or []) <= 1,
                  f"{_cls} chain {_lbl} has at most one sequence difference from "
                  f"canonical (got {len(_ch.get('internal_mismatches') or [])})")
            # How much of what was observed is native titin? Below ~0.9 means the
            # construct is mostly tag and the fit would not describe the domain.
            check((_ch.get("native_residue_frac") or 0) >= 0.90,
                  f"{_cls} chain {_lbl} is >=90% native titin residues "
                  f"(got {_ch.get('native_residue_frac')})")
            # Residues absent from the canonical sequence are expression-tag
            # remnants and must be excluded from the fit, not measured as protein.
            check("unmapped_construct_residues" in _ch,
                  f"{_cls} chain {_lbl} records which observed residues are "
                  "non-native construct remnants")


# ------------------------------------------------- PHASE 6 REVIEW: assembly
# The pipeline once asserted in prose that "all selected entries are monomeric".
# That was FALSE (5JDJ declares 8 dimeric assemblies). Provenance prose must not
# state facts the data contradicts, so the claim is now computed per entry.
if _MEAS:
    for _pid, _e in _MEAS["entries"].items():
        _n = _e.get("assembly_note")
        check(isinstance(_n, dict) and "affects_measurements" in _n,
              f"{_pid} records a computed assembly_note")
        if not isinstance(_n, dict):
            continue
        check(_n.get("affects_measurements") is False,
              f"{_pid} assembly stoichiometry does not affect measurements "
              f"(each chain is fitted individually)")
        if _n.get("declared") != "monomeric":
            # A declared multimer must be adjudicated against observed interfaces,
            # never accepted at face value: a titin Ig/Fn3 domain is a bead on one
            # polypeptide, so a declared homodimer is more likely lattice packing.
            check(bool(_n.get("largest_interfaces")),
                  f"{_pid} declares {_n.get('declared')} and reports the observed "
                  f"interfaces that adjudicate it")
            check(_n.get("declared_partners_are_largest") is False
                  and "packing" in (_n.get("note") or ""),
                  f"{_pid} declared multimer is adjudicated as crystal packing "
                  f"(largest interfaces are not declared partners)")
    check("per entry" in _MEAS["method"]["assembly"],
          "method.assembly is per-entry and does not claim all entries monomeric")

# --------------------------------------- PHASE 6 REVIEW: interaction geometry
# Plan step 5 requires "major bends AND interaction geometry". Single-domain
# entries can only supply the former: within each measured entry every SIFTS
# range is identical, so there is no domain-to-domain relationship in the file.
# The second half is measured from tandem entries.
_ID_PATH = os.path.join(DATA_DIR, "interdomain_measurements.json")
check(os.path.exists(_ID_PATH),
      "interaction geometry between consecutive domains is measured "
      "(data/interdomain_measurements.json)")
if os.path.exists(_ID_PATH) and _GS:
    _ID = json.load(open(_ID_PATH))
    _ip = _ID["independent_pairs"]
    check(len(_ip) >= 3,
          f"interdomain geometry rests on >=3 independent entries (got {len(_ip)})")
    check(len({_p["pdb_id"] for _p in _ip}) == len(_ip),
          "each independent interdomain pair comes from a distinct entry "
          "(lattice copies must not inflate n)")
    for _p in _ip:
        # A pair is meaningful only if the domains are genuinely consecutive and
        # each is observed well enough to fit an axis.
        check(_p["linker_gap_residues"] <= 40,
              f"{_p['pdb_id']} pair is consecutive "
              f"(gap {_p['linker_gap_residues']} residues)")
        check(min(_p["n_res"]) >= 60,
              f"{_p['pdb_id']} pair has >=60 observed CA per domain "
              f"(got {_p['n_res']})")
        check(_p["twist_deg"] is not None,
              f"{_p['pdb_id']} pair yields a defined twist")
    # Flexible linkers: a crystal conformation must NEVER become a coordinate.
    _IG = _GS.get("interdomain_geometry")
    check(isinstance(_IG, dict), "spec records interdomain_geometry")
    if isinstance(_IG, dict):
        check(_IG.get("adopted_as_coordinates") is False
              and bool(_IG.get("why_not_adopted")),
              "interdomain geometry is NOT adopted as coordinates, and says why "
              "(flexible linker; one crystal conformation is not canonical)")
        check(any("azimuth" in _x for _x in _IG.get("not_claimed", [])),
              "interdomain record disclaims a canonical per-domain azimuth")
        check(any("axial rise" in _x for _x in _IG.get("not_claimed", [])),
              "centre-to-centre distance is not claimed to equal the spec axial rise")
        # The measurement's actual job: bound the SCHEMATIC azimuth policy.
        _c = _IG.get("what_it_constrains") or {}
        check(_c.get("policy_id") == "alternating_planar",
              "interdomain measurement is tied to the azimuth policy it constrains")
        check("SCHEMATIC" in (_c.get("policy_evidence_class_after_this") or ""),
              "the azimuth policy remains SCHEMATIC after measurement "
              "(a bound is not an in vivo azimuth)")
        _med = _c.get("measured_abs_twist_median_deg")
        check(_med is not None and _med > 20,
              f"measurement excludes a CONSTANT azimuth (|twist| median {_med} deg)")
        # The two entry sets answer different questions and must not blur: tandem
        # entries were chosen for RELATIONSHIPS between domains, single-domain
        # entries for per-domain SIZE. A tandem crystal's domains are in contact,
        # so using one for per-domain size would measure a packed conformation.
        # In-situ cross-check. The resolution discipline is the claim most at risk
        # of quiet erosion: at 6.4 A this entry can support a centroid SPACING but
        # NOT a per-domain axis, so it must never acquire an angle.
        _isc = _IG.get("in_situ_cross_check")
        check(isinstance(_isc, dict), "interdomain record carries the in-situ cross-check")
        if isinstance(_isc, dict):
            check(_isc.get("resolution_A", 0) > 4.0,
                  "the in-situ entry is explicitly low-resolution")
            check(_isc.get("measures_only") == ["centroid spacing between "
                                               "consecutive domains"],
                  "the in-situ entry measures centroid spacing ONLY")
            check(any("axis" in _x or "bend" in _x or "twist" in _x
                      for _x in _isc.get("deliberately_not_measured") or []),
                  "the in-situ entry explicitly declines axes, bend and twist "
                  f"at {_isc.get('resolution_A')} A")
            for _k in ("bend_deg", "abs_twist_deg", "twist_deg"):
                check(_k not in _isc,
                      f"in-situ record claims no {_k} (resolution does not support it)")
            _vs = _isc.get("vs_crystal_and_literature") or {}
            # If the lattice-free spacing disagreed sharply with the crystals, the
            # crystal spacing would be packing-biased and could not be reported.
            check(abs(_vs.get("difference_nm", 99)) < 1.0,
                  f"in-situ and crystal spacing agree within 1 nm "
                  f"(diff {_vs.get('difference_nm')} nm)")
            check(abs(_vs.get("in_situ_minus_literature_nm", 99)) < 0.5,
                  f"in-situ spacing corroborates the retained literature 4.0 nm "
                  f"(diff {_vs.get('in_situ_minus_literature_nm')} nm)")
            check(_isc.get("pdb_id") not in (_AR.get("Ig_like") or {}).get(
                      "measured_geometry", {}).get("entries_used", []),
                  "the in-situ entry is not used for per-domain size")
        check(bool(_IG.get("why_a_separate_selection")),
              "interdomain record explains why it needs its own entry selection")
        _tand = set(_IG.get("entries_used") or [])
        for _cls in ("Ig_like", "Fn3", "kinase"):
            _g = (_AR.get(_cls) or {}).get("measured_geometry") or {}
            _leak = _tand & set(_g.get("entries_used") or [])
            check(not _leak,
                  f"{_cls} per-domain size uses no tandem entry (leaked: {sorted(_leak)})")
        check(not any(_k for _k in _IG
                      if any(_t in _k for _t in ("axial_length", "lateral",
                                                 "aspect", "ellipsoid"))),
              "interdomain record claims no per-domain size field")
        _c2c = (_IG.get("centre_to_centre_nm") or {}).get("median")
        _ax = (_AR.get("Ig_like") or {}).get("axial_length_nm")
        check(_c2c is not None and _ax and abs(_c2c - _ax) < 2.0,
              f"measured centre-to-centre {_c2c} nm is within 2 nm of the "
              f"archetype axial length {_ax} nm (one domain per tandem step)")


# --------------------------------------------- PHASE 3: encode_as realisation
# Opened as followup_register item PH3-1. A geometric_relationships entry whose
# `encode_as` directive is never implemented is the same class of defect as a spec
# that claims MEASURED while the renderer draws a schematic: the spec instructs the
# renderer to draw something and the renderer silently does not. Every directive
# must therefore be either realised in src/ or explicitly declared unrealised.
print("\n== Phase 3: geometric_relationships encode_as directives ==")
try:
    _GS = load("geometry_strategy.json")
    _SRC_DIR = os.path.join(DATA_DIR, "..", "src")
    _src_blob = ""
    for _root, _dirs, _files in os.walk(_SRC_DIR):
        for _fn in _files:
            if _fn.endswith(".js"):
                with open(os.path.join(_root, _fn)) as _fh:
                    _t = _fh.read()
                # Strip comments and string literals FIRST. A directive mentioned only
                # in a comment or a provenance string is NOT realised — that false pass
                # is exactly what this check exists to catch. (Found while writing it:
                # 'crown' matched a prose comment in LatticeGeometry.js.)
                _t = re.sub(r"/\*[\s\S]*?\*/", " ", _t)
                _t = re.sub(r"(?m)//.*$", " ", _t)
                _t = re.sub(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|`(?:[^`\\]|\\.)*`", " ", _t)
                _src_blob += _t
    _rels = _GS.get("geometric_relationships") or {}
    _unreal = ((_GS.get("unrealised_directives") or {}))
    for _name, _rel in _rels.items():
        _enc = _rel.get("encode_as")
        if not _enc:
            continue
        # A directive counts as realised when a DISTINCTIVE token from it appears in
        # src/. Generic structural nouns ('thick', 'thin', 'filament', 'lattice') are
        # excluded: they occur throughout any sarcomere renderer and matching them
        # would pass every directive vacuously. Found while writing this check —
        # 'thick' alone had 69 hits while 'crown' had none.
        _GENERIC = {"along", "instanced", "markers", "spacing", "between", "adjacent",
                    "explicit", "geometry", "position", "filament", "cylinder", "surface",
                    "measured", "computed", "distance", "thick", "thin", "lattice",
                    "titin", "domain", "length", "placed", "never", "value", "point",
                    "region", "scale", "state", "model", "render", "sarcomere"}
        _toks = [t for t in re.findall(r"[a-z_]{5,}", _enc.lower()) if t not in _GENERIC]
        _hit = any(re.search(t.replace("_", "[_ ]?"), _src_blob, re.I) for t in _toks) if _toks else False
        _declared = _name in _unreal and not _name.startswith("_")
        check(_hit or _declared,
              f"encode_as for '{_name}' is realised in src/ or declared unrealised "
              f"(tokens tried: {_toks[:4]})")
        if _declared:
            _d = _unreal[_name]
            check(bool(_d.get("reason")) and bool(_d.get("owning_item")),
                  f"unrealised directive '{_name}' states a reason and an owning followup item")
            # A declaration must also still be TRUE. The original check was
            # `_hit or _declared`, which a stale declaration satisfies on its own:
            # once the feature is built, the spec keeps asserting it is missing and
            # nothing objects. That is how the crown declaration survived Phase 7b
            # building crowns — found by auditing before the Phase 8 gate, not by
            # this check. A declaration whose tokens now appear in src/ is a spec
            # that contradicts the code, which is the same defect class the
            # container exists to prevent, pointing the other way.
            check(not _hit,
                  f"unrealised directive '{_name}' is still unrealised — its tokens "
                  f"{[t for t in _toks if re.search(t.replace('_', '[_ ]?'), _src_blob, re.I)]} "
                  f"now appear in src/, so the declaration is STALE and its own "
                  f"`when_realised` instruction says to delete it")
except Exception as _e:
    check(False, f"encode_as directive check: {_e}")

# ------------------------------------- PHASE 11: context measurements integrity
# Opened as followup_register item PH11-1. This file was read by no code and checked
# by no validator when it was created.
print("\n== Phase 11: context_measurements.json ==")
try:
    _CM = load("context_measurements.json")
    _EV = {"MEASURED", "STRONGLY INFERRED", "MODELED", "INFERRED", "SCHEMATIC", "UNKNOWN"}
    _refs = set(L["references.json"].keys())
    check(_CM.get("schema") == "titin-context-measurements/1",
          f"schema follows the established convention (got {_CM.get('schema')!r})")
    check(bool(_CM.get("provenance")), "carries a provenance block")
    _ms = _CM.get("measurements") or []
    check(len(_ms) > 0, f"has measurements ({len(_ms)})")
    _bad_ev, _bad_mt, _bad_src, _bad_unit = [], [], [], []
    for _m in _ms:
        _q = _m.get("quantity", "?")
        if _m.get("evidence_class", "").split(" (")[0] not in _EV: _bad_ev.append(_q)
        if not _m.get("muscle_type"): _bad_mt.append(_q)
        if not _m.get("unit"): _bad_unit.append(_q)
        _s = _m.get("source") or ""
        _s = _s if isinstance(_s, str) else ""
        # source must name a registry key (DOI or PDB:) — prose alone is not a citation
        if not any(_k in _s for _k in _refs) and not re.search(r"\b[0-9][A-Z0-9]{3}\b", _s):
            _bad_src.append(_q)
    check(not _bad_ev, f"every entry's evidence_class is in the Phase 1 enum (bad: {_bad_ev[:3]})")
    check(not _bad_mt, f"every entry carries muscle_type per meta.isoform_reconciliation (missing: {_bad_mt[:3]})")
    check(not _bad_unit, f"every entry carries a unit (missing: {_bad_unit[:3]})")
    check(not _bad_src, f"every entry's source resolves to a reference (unresolved: {_bad_src[:3]})")
    # cardiac values must state whether they transfer to the skeletal isoform in scope
    _card = [_m for _m in _ms if _m.get("muscle_type") == "cardiac"]
    _no_tr = [_m.get("quantity") for _m in _card if not _m.get("skeletal_transfer")]
    check(not _no_tr, f"every cardiac value states its skeletal transferability (missing: {_no_tr[:3]})")
    check(len(_CM.get("not_claimed") or []) > 0, "declares what it does not claim")
except Exception as _e:
    check(False, f"context_measurements check: {_e}")

# --------------------------------------- SC-16.2: measured domain backbones
# The renderer swaps an archetype capsule for these coordinates at the deepest
# zoom, which turns them into a visible MEASURED claim. Three things therefore
# have to hold and none of them is checkable from the file alone: the coordinates
# came from the deposition the archetype already names, that file is the pinned
# one, and the frame is still the capsule's frame — otherwise the swap would move
# domains rather than only re-skin them.
print("\n== SC-16.2: domain_backbones.json ==")
try:
    _DB = load("domain_backbones.json")
    _arch = (load("geometry_strategy.json").get("domain_archetypes") or {})
    _refs = set(L["references.json"].keys())
    check(_DB.get("schema") == "titin-domain-backbones/1",
          f"schema follows the established convention (got {_DB.get('schema')!r})")
    check(len(_DB.get("meta", {}).get("not_claimed") or []) > 0,
          "declares what it does not claim")
    _entries = _DB.get("archetypes") or {}
    check(len(_entries) > 0, f"has archetype backbones ({len(_entries)})")
    _bad_repr, _bad_hash, _bad_src, _bad_ev, _bad_count, _bad_frame = [], [], [], [], [], []
    for _name, _rec in _entries.items():
        _declared = (_arch.get(_name) or {}).get("representative_structure", {}).get("pdb_id")
        if _rec.get("pdb_id") != _declared:
            _bad_repr.append(f"{_name}: {_rec.get('pdb_id')} != {_declared}")
        if _rec.get("evidence_class") != "MEASURED":
            _bad_ev.append(_name)
        if _rec.get("source_id") not in _refs:
            _bad_src.append(f"{_name}: {_rec.get('source_id')}")
        _pts = _rec.get("ca_nm") or []
        if _rec.get("residue_count") != len(_pts):
            _bad_count.append(_name)
        # Recompute the digest rather than trust the recorded one, and require the
        # cache manifest to pin it: a re-extraction from an unpinned file must fail
        # here rather than reach the screen as MEASURED.
        _cif = os.path.join(_RAW_DIR, f"{_rec.get('pdb_id')}.cif")
        _digest = None
        if os.path.exists(_cif):
            with open(_cif, "rb") as _fh:
                _digest = hashlib.sha256(_fh.read()).hexdigest()
        _pinned = {_f.get("sha256") for _f in (_RM.get("files") or [])}
        if _digest != _rec.get("sha256") or _digest not in _pinned or \
                not _rec.get("sha256_pinned_in_manifest"):
            _bad_hash.append(_name)
        # The capsule is built Y-long about its own centre, so a drop-in surface
        # must be centred with its principal axis on +Y. If it is not, swapping it
        # in silently displaces or re-orients every domain that uses it.
        if _pts:
            _cols = list(zip(*_pts))
            _means = [sum(_c) / len(_c) for _c in _cols]
            _extents = [max(_c) - min(_c) for _c in _cols]
            if max(abs(_m) for _m in _means) > 0.01 or \
                    _extents[1] <= max(_extents[0], _extents[2]):
                _bad_frame.append(_name)
    check(not _bad_repr,
          f"each backbone comes from the archetype's own representative structure "
          f"(mismatched: {_bad_repr[:3]})")
    check(not _bad_ev, f"every backbone is declared MEASURED (bad: {_bad_ev[:3]})")
    check(not _bad_src, f"every source_id resolves in references.json (bad: {_bad_src[:3]})")
    check(not _bad_count, f"residue_count matches the coordinates (bad: {_bad_count[:3]})")
    check(not _bad_hash,
          f"every backbone was extracted from the SHA-256-pinned cached file "
          f"(bad: {_bad_hash[:3]})")
    check(not _bad_frame,
          f"every backbone is centred with its principal axis on +Y, matching the "
          f"capsule it replaces (bad: {_bad_frame[:3]})")
except Exception as _e:
    check(False, f"domain_backbones check: {_e}")

# --------------------------------------- PHASE 1: crown spacing agreement (PH1-2)
# The spec's STRONGLY INFERRED 14.3 nm and the 8G4L-measured 14.44 nm must stay
# consistent with each other AND with the separately-sourced 43.1 nm repeat. This
# guards against someone "fixing" one value and silently breaking the triple.
print("\n== Phase 1: crown periodicity self-consistency ==")
try:
    _rel = (load("geometry_strategy.json").get("geometric_relationships") or {}) \
        .get("thick_filament_crown_periodicity", {})
    _cs = (_rel.get("values") or {}).get("crown_axial_spacing_nm")
    _rp = (_rel.get("values") or {}).get("myosin_repeat_nm")
    check(_cs is not None and _rp is not None, f"crown spacing and repeat are both present ({_cs}, {_rp})")
    if _cs and _rp:
        # NOT a 3x-consistency check. 14.3 and 43.1 are INDEPENDENTLY sourced, so
        # 3 x 14.3 = 42.9 misses 43.1 by 0.20 nm and 3 x 14.44 = 43.32 misses it by
        # 0.22 nm — in opposite directions. No tolerance separates the literature
        # value from the measured one, so a triple check cannot catch a silent swap
        # (verified: it passes the swap). The guard that DOES bite is re-sourcing.
        _meas = 14.44   # measured from PDB 8G4L, context_measurements.json
        _srcs = " ".join(_rel.get("sources") or [])
        _adopted = abs(_cs - _meas) < 0.05
        check((not _adopted) or ("8G4L" in _srcs),
              f"crown spacing {_cs} is either the literature value or, if the 8G4L "
              f"measurement has been adopted, cites 8G4L in its sources ({_srcs})")
        check(abs(_cs - _meas) < 0.6,
              f"spec crown spacing {_cs} agrees with the 8G4L measurement {_meas} "
              f"within 8G4L's own 6 A resolution (cross-check, not a correction)")
except Exception as _e:
    check(False, f"crown periodicity check: {_e}")


# ------------------------- PHASE 7B: recorded derivations must reproduce themselves
# A recorded derivation that does not reproduce its own recorded result is worse than
# no derivation: it looks auditable while being wrong, and a reader who checks it
# concludes the code is broken. This section re-executes each derivation string's
# arithmetic against the values in the SAME block. It caught a real defect — the
# head block recorded the 14.44 nm measurement as its spacing while its own count
# had been derived with the spec's 14.3 nm, so its formula returned 50 not 51.
print("\n== Phase 7b: recorded derivations reproduce their recorded results ==")
try:
    import math as _m
    _strat = load("geometry_strategy.json")
    _pol = _strat["context_depiction_policy"]
    _spec = load("sarcomere.json")
    _thick = next(c for c in _spec["components"] if c["id"] == "thick_filament")
    _L = _thick["dimensions_nm"]["length_X"]
    _bz = _thick["dimensions_nm"]["bare_zone_center"]

    _hd = next(d for d in _pol["decisions"] if "head" in d["feature"].lower())
    _mg = _hd["major_geometry"]
    _sp = _mg["crown_axial_spacing_nm"]
    _exp = _m.floor((_L - _bz) / 2 / _sp) + 1
    check(_mg["crown_levels_per_half_filament"] == _exp,
          f"head block: floor(({_L}-{_bz})/2/{_sp})+1 = {_exp} reproduces the recorded "
          f"crown_levels_per_half_filament {_mg['crown_levels_per_half_filament']}")
    check(_mg["crown_levels_per_filament"] == 2 * _mg["crown_levels_per_half_filament"],
          "head block: whole-filament level count is exactly twice the half count")
    check(_mg["heads_per_half_filament"]
          == _mg["crown_levels_per_half_filament"] * _mg["heads_per_crown"],
          "head block: head count is levels x heads_per_crown")

    # The spacing the code reads must be the SPEC value, not the ad-hoc measurement:
    # they differ by enough to change the level count, so a silent swap is a defect.
    _specsp = _strat["geometric_relationships"]["thick_filament_crown_periodicity"]["values"]["crown_axial_spacing_nm"]
    check(abs(_sp - _specsp) < 1e-9,
          f"head block spacing {_sp} is the spec value {_specsp} that ContextDetail "
          "actually reads (a divergence here silently changes the recorded counts)")
    check("spacing_provenance" in _mg,
          "head block states which spacing it used and why the measurement is not "
          "substituted (evidence-class promotion needs a spec edit, not a swap)")

    # Crowns must not be placed where there are no cross-bridges.
    check(_exp * _sp <= (_L - _bz) / 2 + _sp,
          f"the {_exp} derived levels span {(_exp-1)*_sp:.1f} nm, inside the "
          f"{(_L-_bz)/2:.0f} nm cross-bridge-bearing half-span")

    # Twist block: the crossover must be the LONG-PITCH half-turn (~36-38 nm), not the
    # genetic helix (~5.9 nm), and the pitch must be twice the crossover.
    _tw = next(d for d in _pol["decisions"] if "long-pitch twist" in d["feature"].lower())
    _tm = _tw["major_geometry"]
    check(30.0 <= _tm["crossover_repeat_nm"] <= 45.0,
          f"twist crossover {_tm['crossover_repeat_nm']} nm is the long-pitch half-turn, "
          "not the ~5.9 nm genetic-helix repeat")
    check(abs(_tm["full_pitch_nm"] - 2 * _tm["crossover_repeat_nm"]) < 0.05,
          "twist full pitch is exactly twice the crossover repeat")

    # Inter-crown rotations must sum to a full turn per super-repeat AND be unequal:
    # equal steps would be a regular helix, which is the documented published error.
    _q = next(d for d in _pol["decisions"] if "quasi-helical" in d["feature"].lower())
    _rot = _q["major_geometry"]["inter_crown_rotations_deg"]
    check(abs(sum(_rot) - 120.0) < 1e-6,
          f"inter-crown rotations {_rot} sum to 120 deg over the 3-crown super-repeat")
    check(len(set(_rot)) > 1,
          f"inter-crown rotations {_rot} are UNEQUAL — equal steps would make the "
          "array a regular helix, which is the error this project set out to avoid")
except Exception as _e:
    check(False, f"Phase 7b derivation check: {_e}")


# ------------------------- PH7B-1: head depiction must be angled and must fit
# The first Phase 7b pass drew each myosin head as ONE capsule pointing radially
# outward. 8G4L contradicts that: the projection is two segments, both at shallow
# angles to the FILAMENT AXIS, and the radial spike overshot the measured
# filament-including-heads diameter by 45 percent. These checks are the guard rails
# so neither error can return silently through a spec edit.
print("\n== Phase 7b: myosin head projection (PH7B-1) ==")
try:
    import math as _m
    sk = load("context_measurements.json")["head_projection_skeleton"]
    v = sk["values_nm_deg"]
    check(sk["evidence_class"] == "MEASURED",
          "head projection skeleton is MEASURED, not schematic")
    # angled, not perpendicular: a radial spike would be 90 deg to the axis
    for key, label in (("s2_angle_to_axis_deg", "S2"),
                       ("motor_angle_to_axis_deg", "motor domain")):
        check(v[key] < 45,
              f"{label} lies at {v[key]:.1f} deg to the filament axis — a value near "
              "90 would mean the radial-spike depiction has returned")
    # the fold is INWARD in this relaxed state; a positive value means the
    # (length, angle) reconstruction sign error is back
    check(v["tip_radial_displacement_nm"] < 0,
          f"motor domain folds INWARD ({v['tip_radial_displacement_nm']:+.2f} nm) as "
          "measured in the relaxed interacting-heads state")
    # envelope: widest drawn point must fit the measured diameter
    widest = max(
        v["junction_radius_nm"] + v["s2_radius_nm"],
        v["motor_centroid_radius_nm"] + sk["motor_domain_width_nm"] / 2,
    )
    check(2 * widest <= sk["envelope_constraint_nm"] + 1e-9,
          f"head envelope {2*widest:.2f} nm fits inside the measured "
          f"filament-including-heads diameter {sk['envelope_constraint_nm']:.3f} nm")
    # the angle a reader would check the render against must be the one the model
    # was built from: median-of-angles != angle-of-median-displacements
    for seg, drawn in (("s2", "s2_angle_of_median_displacements_deg"),
                       ("tip", "tip_angle_of_median_displacements_deg")):
        want = _m.degrees(_m.atan2(abs(v[f"{seg}_radial_displacement_nm"]),
                                       abs(v[f"{seg}_axial_displacement_nm"])))
        # 0.01 deg: values_nm_deg is written rounded to 2 dp, so the tolerance is the
        # rounding step and not a fudge factor
        check(abs(v[drawn] - want) < 0.01,
              f"{seg} drawn angle {v[drawn]:.2f} deg is the angle OF the median "
              f"displacements the model is built from, not the median of per-chain angles")
    check("state_caveat" in sk,
          "the relaxed-state caveat is recorded — the axial tilt SIGN does not "
          "transfer to active cross-bridges")
except KeyError as _e:
    check(False, f"context_measurements.json:head_projection_skeleton incomplete: {_e}")

# ---------------------------------------------------------------------------
# PHASE 8 — the titin I-band partition must be mechanically realisable.
#
# The four I-band elastic regions are in mechanical SERIES between the Z-disc
# and the thick-filament tip, so they bear a COMMON force. A partition whose
# regions imply wildly different forces is not a state a real chain can adopt.
#
# This gate exists because the ORIGINAL stretched keyframe (SL 2400) failed it:
# it held N2A and PEVK exactly constant from resting, pushing dist_Ig to 98.7%
# of contour = 277.5 pN against 0.50 pN in PEVK (553x spread). 277.5 pN sits in
# the 150-300 pN AFM regime the spec itself calls EXTREME / non-physiological.
# Nothing in the suite objected, because no check knew the regions share a force.
# ---------------------------------------------------------------------------
try:
    import importlib.util as _ilu
    _spec = _ilu.spec_from_file_location(
        "_mech", os.path.join(os.path.dirname(os.path.abspath(__file__)), "mechanical_model.py"))
    _mech = _ilu.module_from_spec(_spec); _spec.loader.exec_module(_mech)

    _titin = load("titin.json")
    _states = load("structural_states.json")["states"]
    _ch = _mech.chain_parameters(_titin)

    # SPREAD TOLERANCE = 3.0x. Set by what the sourced laws can resolve, not by
    # convenience: the persistence lengths carry roughly a factor-2 uncertainty
    # across the single-molecule literature, and the pure-entropic WLC's force
    # diverges near contour so a value within a few percent of Lc swings the
    # implied force by more than 2x on its own. A tolerance below ~2x would
    # therefore flag rounding in the spec's own 0.1 nm partition figures; the
    # defect this gate was written for was 553x, so 3.0x separates them by more
    # than two orders of magnitude.
    _SPREAD_MAX = 3.0
    for _name, _v in sorted(_states.items(), key=lambda kv: kv[1]["sarcomere_length_nm"]):
        _sp = _v["titin_I_band_extension_nm"]
        _implied, _unreach = {}, []
        for _r in _mech.ORDER:
            _f = _mech.force_for_region(_ch, _r, _sp[_r])
            if _f is None: _unreach.append(_r)
            else: _implied[_r] = _f
        # a value AT a pure-entropic contour length is unreachable at any finite
        # force; that is a labelling question, checked separately below
        if len(_implied) > 1:
            _spread = max(_implied.values()) / min(_implied.values())
            check(_spread <= _SPREAD_MAX,
                  f"structural_states '{_name}' partition is mechanically realisable: "
                  f"per-region implied forces span {_spread:.1f}x "
                  f"(<= {_SPREAD_MAX}x; series topology requires ONE common force) "
                  + ("" if _spread <= _SPREAD_MAX else
                     "[" + ", ".join(f"{k}={v:.2f}pN" for k, v in _implied.items()) + "]"))
            # and that common force must not sit in the regime the spec forbids
            # depicting as ordinary contraction
            _F = _mech.solve_force(_ch, _v["titin_I_band_total_nm"])
            if _v["sarcomere_length_nm"] <= 2400:
                check(_F < 150.0,
                      f"'{_name}' common force {_F:.2f} pN is below the 150-300 pN AFM "
                      f"regime mechanical_states_note.domain_unfolding calls EXTREME")
        # any at-contour value must be declared, since a WLC only approaches contour
        if _unreach:
            check("titin_I_band_extension_evidence_class" in _v
                  or "titin_I_band_extension_note" in _v
                  or _name == "extended_reference",
                  f"'{_name}' places {_unreach} AT a contour length (unreachable at finite "
                  f"force) and must carry an evidence-class or note declaring it idealized")

    # a corrected partition must retain what it superseded and why
    for _name, _v in _states.items():
        if "MODELED" in _v.get("titin_I_band_extension_evidence_class", ""):
            _pv = _v.get("titin_I_band_extension_provenance", {})
            # A supersession record must name the ORIGINAL values, not an intermediate
            # correction: the stretched record briefly held the intermediate fix while
            # superseded_because described the original, so record and reason disagreed.
            if "supersession_chain" in _pv:
                _ch8 = _pv["supersession_chain"]
                check(len(_ch8) >= 2, f"'{_name}' supersession_chain records every step")
                check(_ch8[0]["partition_nm"] == _pv["superseded_partition_nm"],
                      f"'{_name}' superseded_partition_nm is the ORIGINAL (chain step 1), "
                      f"not an intermediate correction")
                for _st8 in _ch8:
                    check("evidence_class" not in _st8,
                          f"'{_name}' chain step {_st8['step']} does not mint an evidence "
                          f"class; a historical step records what was believed AT THE "
                          f"TIME and must not present as a live claim, so it uses "
                          f"'derivation' instead)")
                check(_ch8[-1].get("status") == "current"
                      and _ch8[-1]["partition_nm"] == _v["titin_I_band_extension_nm"],
                      f"'{_name}' supersession_chain ends at the CURRENT partition")
                for _st8 in _ch8:
                    check(abs(sum(_st8["partition_nm"].values()) - _v["titin_I_band_total_nm"]) < 5e-2,
                          f"'{_name}' chain step {_st8['step']} preserves the I-band total")
            check("superseded_partition_nm" in _pv and "superseded_because" in _pv,
                  f"'{_name}' carries a MODELED partition and records the superseded "
                  f"values and the reason (project convention: never silently replace)")
            check(abs(sum(_v["titin_I_band_extension_nm"].values())
                      - _v["titin_I_band_total_nm"]) < 1e-6,
                  f"'{_name}' MODELED partition preserves the I-band total EXACTLY, so no "
                  f"filament / overlap / M-line / lattice geometry moved")
except Exception as _e:
    check(False, f"Phase 8 mechanical-realisability gate could not run: {type(_e).__name__}: {_e}")

# ---------------------------------------------------------------------------
# Phase 8 — cross-file agreement and monotonicity of the I-band partition.
#
# titin.json carries a RESTING reference axial length per region and
# structural_states.json carries the per-state partition. Nothing had ever
# checked that the two agree, and the Phase 8 correction desynchronised them:
# titin.json still read prox_Ig 195.0 while the corrected resting partition
# said 204.4. A spec whose two files disagree about the same quantity is worse
# than one that is merely wrong, because each file corroborates nothing.
# ---------------------------------------------------------------------------
_T8 = L["titin.json"]
_S8 = L["structural_states.json"]
_IB8 = ["prox_Ig", "N2A", "PEVK", "dist_Ig"]
_rest8 = _S8["states"]["resting"]["titin_I_band_extension_nm"]
_by8 = {r["id"]: r for r in _T8["regions"]}
for _rid in _IB8:
    _r = _by8[_rid]
    _a = _r["dimensions_nm"]["axial_length_X"]
    _b = _r["resting_axial_position_nm"]["axial_length_nm"]
    _c = _rest8[_rid]
    check(abs(_a - _c) < 0.05,
          "titin.json %s axial_length_X (%.1f) agrees with structural_states resting "
          "partition (%.1f)" % (_rid, _a, _c))
    check(abs(_b - _c) < 0.05,
          "titin.json %s resting_axial_position axial_length_nm (%.1f) agrees with "
          "structural_states resting partition (%.1f)" % (_rid, _b, _c))
# the resting reference block must also be laid END TO END from the Z-disc edge
_zw8 = [c for c in L["sarcomere.json"]["components"] if c["id"] == "zdisc"][0]["dimensions_nm"]["width_X"]
_x8 = _zw8 / 2.0
for _rid in _IB8:
    _pos = _by8[_rid]["resting_axial_position_nm"]
    check(abs(_pos["X_start"] - _x8) < 0.05,
          "titin.json %s resting X_start (%.1f) continues the chain (%.1f)" % (_rid, _pos["X_start"], _x8))
    _x8 = _pos["X_end"]
check(abs(_x8 - _S8["states"]["resting"]["positions_nm"]["thick_tip_I_A_junction"]) < 0.05,
      "titin.json resting chain closes exactly on the thick-filament tip (%.1f)" % _x8)

# Every region must EXTEND monotonically with sarcomere length. In a series chain
# the common force rises with total extension, and no force-extension law is
# decreasing, so a region that shrinks under stretch is mechanically impossible.
# The pre-correction spec had N2A going 12.0 -> 3.2 nm from resting to stretched.
_ord8 = sorted(((v["sarcomere_length_nm"], k) for k, v in _S8["states"].items()
                if isinstance(v, dict) and "titin_I_band_extension_nm" in v))
for _rid in _IB8:
    _vals = [(_sl, _S8["states"][_k]["titin_I_band_extension_nm"][_rid]) for _sl, _k in _ord8]
    _mono = all(_a[1] <= _b[1] + 1e-6 for _a, _b in zip(_vals, _vals[1:]))
    check(_mono, "%s extension is non-decreasing in sarcomere length %s"
                 % (_rid, " -> ".join("%.1f" % _v for _, _v in _vals)))

# N2A contains ONE folded Ig-like domain (titin.json:domain_composition), which
# cannot collapse, so the region can never be shorter than a folded domain
# (~4.0 nm, geometry_sources[10], MEASURED). A bare WLC put it at 0.3 nm.
_n2a_comp = _by8["N2A"]["domain_composition"]
if _n2a_comp.get("Ig_like", 0) >= 1:
    _fold8 = 4.0
    for _sl, _k in _ord8:
        _z = _S8["states"][_k]["titin_I_band_extension_nm"]["N2A"]
        check(_z >= _fold8 - 1e-6,
              "N2A at SL %.0f (%.1f nm) is not shorter than the folded Ig domain it "
              "contains (%.1f nm, geometry_sources[10])" % (_sl, _z, _fold8))

# ---------------------------------------------------------------------------
# MODELED is the sixth evidence class, authorised in session 9. It is the only
# class whose values are COMPUTED rather than observed, so it carries
# preconditions no other class needs: the law must be named, every input's class
# declared, and no input may be weaker than STRONGLY INFERRED (else the value
# must take that weaker class). Without these a MODELED label would be an
# unfalsifiable claim of rigour.
print("\n== MODELED evidence class: definition and preconditions ==")
_GS = L["geometry_strategy.json"]["meta"]
_defs = _GS.get("evidence_class_definitions", {})
check("MODELED" in _GS.get("evidence_classes", []), "MODELED is in the declared vocabulary")
check("MODELED" in _defs and len(_defs["MODELED"]) > 200,
      "MODELED carries a written definition, not just a list entry")
_lad = _GS.get("evidence_ladder", "")
check("INFERRED < MODELED < STRONGLY INFERRED" in _lad,
      f"ladder ranks MODELED below STRONGLY INFERRED (got {_lad[:60]!r})")
# the ladder in the docs must agree with the ladder the RENDERER implements
_sc = open(os.path.join(_HERE, "..", "src/render/SarcomereScene.js")).read()
check("'MEASURED', 'STRONGLY INFERRED', 'MODELED', 'INFERRED', 'SCHEMATIC', 'UNKNOWN'" in _sc,
      "renderer's weakest-link ordering includes MODELED at the documented rung")
_ti = open(os.path.join(_HERE, "..", "src/geometry/TitinRepresentation.js")).read()
check("head.startsWith('MODELED')) return 3" in _ti and "head.startsWith('STRONGLY')) return 4" in _ti,
      "TitinRepresentation ranks MODELED strictly below STRONGLY INFERRED")
# opacity must be monotone with the ladder, or the render would misreport confidence
_m = re.search(r"MODELED: \{ opacity: ([0-9.]+)", _sc)
_msi = re.search(r"'STRONGLY INFERRED': \{ opacity: ([0-9.]+)", _sc)
_mi = re.search(r"INFERRED: \{ opacity: ([0-9.]+)", _sc)
check(bool(_m and _msi and _mi), "all three opacities are declared")
if _m and _msi and _mi:
    check(float(_mi.group(1)) < float(_m.group(1)) < float(_msi.group(1)),
          f"opacity monotone: INFERRED {_mi.group(1)} < MODELED {_m.group(1)} < STRONGLY INFERRED {_msi.group(1)}")

_ALLOWED_IN = {"MEASURED", "STRONGLY INFERRED"}
for _name, _v in L["structural_states.json"]["states"].items():
    if not isinstance(_v, dict) or "titin_I_band_extension_nm" not in _v:
        continue
    _cls = _v.get("titin_I_band_extension_evidence_class", "")
    if not _cls.startswith("MODELED"):
        continue
    _pv = _v["titin_I_band_extension_provenance"]
    check(bool(_pv.get("model_basis")) and len(_pv["model_basis"]) > 80,
          f"'{_name}' MODELED partition names the law it was computed from")
    check("10.1073/pnas.95.14.8052" in _pv.get("model_basis", ""),
          f"'{_name}' model_basis cites the primary source of the chain law")
    _mf = _pv.get("modeled_from") or {}
    check(len(_mf) >= 3, f"'{_name}' declares the evidence class of its model inputs ({len(_mf)})")
    for _k, _c in _mf.items():
        check(_c.split(" (")[0] in _ALLOWED_IN,
              f"'{_name}' input '{_k[:34]}' has class '{_c.split(' (')[0]}', "
              f"which is MEASURED or STRONGLY INFERRED as MODELED requires")
    # a MODELED value that is not reproducible from the law is a false label
    check(_pv.get("common_force_pN") is not None,
          f"'{_name}' records the scalar the model solved for")

# ---------------------------------------------------------------------------
# The chain parameters come from rat psoas; this spec is human canonical Q8WZ42
# with a much longer PEVK. Fractional extension is isoform-independent, but
# ABSOLUTE force is not — so any agreement in pN across isoforms is a
# plausibility check, never validation. These checks stop that distinction from
# being quietly dropped, and re-derive every recorded number from the law.
print("\n== Cross-isoform scope of the mechanical model ==")
_M = L["mechanical_model.json"]
_iso = _M.get("isoform_scope") or {}
for _f in ("spec_isoform", "chain_parameter_isoform",
           "why_this_is_acceptable_for_A_and_K0",
           "consequence_for_relative_extension", "consequence_for_absolute_force"):
    check(bool(_iso.get(_f)), f"isoform_scope declares '{_f}'")
check("Q8WZ42" in _iso.get("spec_isoform", ""), "isoform_scope names this spec's accession")
check("psoas" in _iso.get("chain_parameter_isoform", "").lower(),
      "isoform_scope names the chain parameters' source tissue")
_x = _M.get("cross_isoform_plausibility_check") or {}
check("NOT VALIDATION" in _x.get("status", "").upper(),
      "the cross-isoform comparison is labelled a plausibility check, not validation")
check(bool(_x.get("why_not_validation")), "it states why it is not validation")
check(bool(_x.get("what_makes_it_non_circular")), "it states why it is not circular")
# every quoted prediction must be reproducible from the recorded chain parameters
_ch = _M["chain_parameters"]; _lcp = _ch["PEVK"]["Lc_nm"]
_zw = [c for c in L["sarcomere.json"]["components"] if c["id"] == "zdisc"][0]["dimensions_nm"]["width_X"]
_th = [c for c in L["sarcomere.json"]["components"] if c["id"] == "thick_filament"][0]["dimensions_nm"]["length_X"] / 2.0
for _row in _x.get("model_prediction_over_that_window", []):
    _tot = _row["SL_um"] * 1000 / 2.0 - _zw / 2.0 - _th
    check(abs(_tot - _row["I_band_total_nm"]) < 1e-6,
          f"SL {_row['SL_um']} um I-band total follows from sarcomere geometry alone")
    _F = _mm_solve(_ch, _tot)
    check(abs(_F - _row["force_pN"]) < 1e-3,
          f"SL {_row['SL_um']} um recorded force {_row['force_pN']} pN reproduces ({_F:.3f})")
    _pk = 100.0 * _mm_region(_ch, "PEVK", _F) / _lcp
    check(abs(_pk - _row["PEVK_percent_of_contour"]) < 0.1,
          f"SL {_row['SL_um']} um recorded PEVK {_row['PEVK_percent_of_contour']}% reproduces ({_pk:.1f}%)")
# fractional extension must be independent of contour length, or the argument above fails
_ys = []
for _lc in (542.1, 300.0, 240.0):
    _c2 = json.loads(json.dumps(_ch)); _c2["PEVK"]["Lc_nm"] = _lc
    _ys.append(_mm_region(_c2, "PEVK", 10.0) / _lc)
check(max(_ys) - min(_ys) < 1e-9,
      f"fractional extension at fixed force is isoform-independent (spread {max(_ys)-min(_ys):.2e})")

print("\n" + "="*40)
print("ALL CHECKS PASSED" if not fails else (str(len(fails)) + " FAILURE(S)"))
sys.exit(1 if fails else 0)
