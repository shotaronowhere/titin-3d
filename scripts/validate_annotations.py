#!/usr/bin/env python3
"""Validate the SC-4 object-linked annotation catalog independently of runtime."""

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
EVIDENCE = {
    "UNKNOWN": 0,
    "SCHEMATIC": 1,
    "INFERRED": 2,
    "MODELED": 3,
    "STRONGLY INFERRED": 4,
    "MEASURED": 5,
}
EXPECTED_TARGETS = {
    "titin", "thick_filament", "myosin_heads", "thin_filament",
    "thin_filament_twist", "zdisc", "alpha_actinin", "telethonin",
    "mline", "mband_crosslinks", "mybpc", "titin_domains",
}
REQUIRED = {
    "id", "target_id", "label", "lay_text", "expert_text", "scope",
    "claim_evidence_class", "render_evidence_class", "source_ids",
    "render_meaning", "not_claimed", "binding",
}


def load(path):
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def evidence_head(value):
    text = str(value or "").strip().upper()
    return next((name for name in sorted(EVIDENCE, key=len, reverse=True)
                 if text.startswith(name)), None)


def validate(path):
    catalog = load(path)
    references = load(DATA / "references.json")
    sarcomere = load(DATA / "sarcomere.json")
    titin = load(DATA / "titin.json")
    claims = load(DATA / "showcase_claims.json")
    components = {record["id"] for record in sarcomere["components"]}
    claim_map = {record["id"]: record for record in claims["objects"]}
    problems = []

    def require(condition, message):
        if not condition:
            problems.append(message)

    require(catalog.get("schema") == "titin-object-annotations/1",
            "unsupported annotation schema")
    require(bool(catalog.get("meta", {}).get("purpose"))
            and bool(catalog.get("meta", {}).get("scope")),
            "catalog purpose and scope must be explicit")
    records = catalog.get("components") or []
    ids = [record.get("id") for record in records]
    targets = [record.get("target_id") for record in records]
    require(len(ids) == len(set(ids)), "annotation IDs must be unique")
    require(len(targets) == len(set(targets)), "annotation targets must be unique")
    require(set(targets) == EXPECTED_TARGETS,
            "catalog must cover every directly pickable biological component exactly once")

    for record in records:
        rid = record.get("id", "(missing id)")
        require(REQUIRED <= set(record), f"{rid}: required fields are complete")
        for field in ("label", "lay_text", "expert_text", "scope", "render_meaning"):
            require(isinstance(record.get(field), str) and bool(record[field].strip()),
                    f"{rid}: {field} must be non-empty text")
        claim_class = evidence_head(record.get("claim_evidence_class"))
        render_class = evidence_head(record.get("render_evidence_class"))
        require(claim_class in EVIDENCE, f"{rid}: claim evidence is valid")
        require(render_class in EVIDENCE, f"{rid}: render evidence is valid")
        if claim_class and render_class:
            require(EVIDENCE[render_class] <= EVIDENCE[claim_class],
                    f"{rid}: render evidence cannot exceed claim evidence")
        sources = record.get("source_ids") or []
        require(bool(sources), f"{rid}: at least one source is required")
        for source_id in sources:
            reference = references.get(source_id)
            require(reference is not None, f"{rid}: source {source_id} resolves")
            if reference:
                citation_ready = bool(reference.get("authors") and reference.get("year")
                                      and reference.get("title") and reference.get("journal"))
                require(citation_ready, f"{rid}: source {source_id} has short-citation metadata")
                # Mirrors AnnotationCatalog.sourceHref exactly. The looser previous
                # rule accepted any "PDB:"-prefixed id, including a derived
                # multi-entry record that the JS resolver could not link at all.
                def plain_pdb(value):
                    return (value.startswith("PDB:") and "+" not in value
                            and "(" not in value)

                linkable = (bool(reference.get("doi"))
                            or source_id.startswith("UniProt:")
                            or plain_pdb(source_id)
                            or any(str(dep).startswith("10.")
                                   for dep in reference.get("depends_on", []))
                            or any(plain_pdb(str(dep))
                                   for dep in reference.get("depends_on", [])))
                require(linkable, f"{rid}: source {source_id} has a resolved link route")
        nonclaims = record.get("not_claimed") or []
        require(bool(nonclaims) and all(isinstance(item, str) and item.strip()
                                        for item in nonclaims),
                f"{rid}: not-claimed boundaries are explicit")

        binding = record.get("binding") or {}
        kind, binding_id = binding.get("kind"), binding.get("id")
        if kind == "sarcomere_component":
            require(binding_id in components, f"{rid}: component binding resolves")
        elif kind == "showcase_claim":
            claim = claim_map.get(binding_id)
            require(claim is not None, f"{rid}: showcase binding resolves")
            if claim:
                require(str(claim.get("decision", "")).startswith("ADMIT")
                        or claim.get("decision") == "REPLACE_CURRENT",
                        f"{rid}: showcase binding is admitted")
                admitted_claim = evidence_head(claim.get("claim_evidence_class"))
                admitted_render = evidence_head(claim.get("render_evidence_class"))
                if claim_class and admitted_claim:
                    require(EVIDENCE[claim_class] <= EVIDENCE[admitted_claim],
                            f"{rid}: claim evidence stays within binding")
                if render_class and admitted_render:
                    require(EVIDENCE[render_class] <= EVIDENCE[admitted_render],
                            f"{rid}: render evidence stays within binding")
        elif kind == "titin_architecture":
            require(binding_id == titin.get("meta", {}).get("uniprot"),
                    f"{rid}: titin architecture binding matches Q8WZ42")
        else:
            require(False, f"{rid}: unsupported binding kind {kind!r}")

    page = (ROOT / "src" / "index.template.html").read_text(encoding="utf-8")
    require("annotation.sources.join" not in page,
            "UI never stringifies raw source IDs")
    require("renderClaimView(claimViewForAnnotation(annotation), document)" in page,
            "guided citations resolve through the canonical ClaimView bibliography")
    require("visualization.resolveAnnotation(selection)" in page,
            "tooltip, pinned card, and drawer share one annotation resolver")
    return problems


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--annotations", type=Path, default=DATA / "annotations.json")
    args = parser.parse_args()
    errors = validate(args.annotations)
    if errors:
        print(f"ANNOTATION VALIDATION FAILED ({len(errors)} problem(s))")
        for error in errors:
            print(f"  FAIL {error}")
        return 1
    print("ANNOTATION VALIDATION PASSED")
    print("  PASS coverage, evidence, bindings, citations, links, copy, and UI source resolution")
    return 0


if __name__ == "__main__":
    sys.exit(main())
