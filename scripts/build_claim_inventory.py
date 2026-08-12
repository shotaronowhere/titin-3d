#!/usr/bin/env python3
"""Build the SC-19 claim-support inventory from every public claim binding."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any

from scientific_common import ROOT, claim_payload_sha256, load_json


OUTPUT = ROOT / "data" / "claim_support.json"
RELATIONSHIP = {
    "DIRECT": "direct",
    "CONTEXT_ONLY": "context",
    "STRUCTURE_ONLY": "corroborating",
    "MODEL_INPUT": "transfer",
}
LOCATORS = {
    "UniProt:Q8WZ42": "UniProtKB Q8WZ42 release 2026_02, entry version 221, sequence version 4; DOMAIN, VAR_SEQ, VARIANT, and CONFLICT feature tables",
    "10.1083/jcb.106.5.1563": "Fig. 10 linear epitope map and Results, relaxed chicken-breast immunoelectron microscopy",
    "10.1016/j.jmb.2020.06.025": "Fig. 1 and Supplementary Table 1 (domain nomenclature); Figs. 2–6 and Results (antibody positions and axial alignment)",
    "10.1083/jcb.140.4.853": "Figs. 1–4 and Results, especially Fig. 4 segment extension versus sarcomere length",
    "10.1016/j.cell.2021.02.047": "Figs. 1–4 and Results sections 'Z-disc structure' and 'M-band structure'",
    "10.1038/nature04343": "Fig. 1 and deposited Z1Z2–telethonin complex PDB 1YA5",
    "10.1016/j.jmb.2015.08.018": "Fig. 1 and Results, rat-cardiac small-square Z-band tomography",
    "10.1085/jgp.202012713": "Figs. 1–7 and Table 1; Fig. 7C and Results/Discussion on 43.1/45.5-nm periodicities",
    "10.1083/jcb.134.6.1441": "Figs. 1–8 and Results, immunoelectron localization in rat-psoas and bovine-sternomandibularis skeletal-muscle fibers",
    "10.1038/embor.2010.65": "Fig. 1 and deposited titin–OBSL1 complex PDB 3KNB",
    "10.1038/s41586-023-06690-5": "Fig. 2a and Extended Data Fig. 2j; averaged human-cardiac C-zone/M-band reconstruction limits",
    "10.1038/s41467-024-46957-7": "Figs. 1–5 and Results; permeabilized fast mouse-psoas MyBP-C C-zone/lattice context",
    "10.1152/ajpheart.2000.279.5.h2568": "Figs. 1–4 and Results; d10 versus sarcomere length in isolated rat myocardium",
    "10.1016/j.jmb.2021.166901": "Figs. 1–7 and deposited PDB 7NIP; recombinant human UN2A structure and CARP binding",
    "10.3389/fphys.2020.00173": "Fig. 1 constructs; Figs. 2–4 AFM mechanics/CARP; Fig. 5 N2A PKA phosphorylation; Fig. 6 simulation",
    "10.1073/pnas.95.14.8052": "Figs. 2–5; Methods equations 1–2; Results/Discussion force-extension fits and <12-pN/<60%-extension limit",
    "10.1021/bi00801a004": "Figs. 1–2 and Results/Discussion, ATP-dependent actomyosin dissociation cycle",
    "10.1016/j.yjmcc.2019.05.026": "Figs. 1–4 and Table 1; mouse skinned papillary-muscle IEM/SIM mapping of C-zone epitopes and cMyBP-C stripes",
    "PDB:1TKI+4JNW (Phase 6 measurement, kinase)": "Deposited kinase coordinates and data/structure_measurements.json kinase rows",
    "PDB:6KN7": "Deposited polymer entities and coordinates",
}

SOURCE_SUBJECTS = {
    "UniProt:Q8WZ42": {
        "species": "Homo sapiens", "muscle_or_tissue": None,
        "preparation": "curated reference-sequence and feature record",
    },
    "10.1083/jcb.106.5.1563": {
        "species": "Gallus gallus", "muscle_or_tissue": "breast skeletal muscle",
        "preparation": "relaxed muscle; monoclonal-antibody immunoelectron microscopy",
    },
    "10.1016/j.jmb.2020.06.025": {
        "species": "Oryctolagus cuniculus", "muscle_or_tissue": "psoas skeletal muscle",
        "preparation": "isolated myofibrils; super-resolution antibody localization",
    },
    "10.1083/jcb.140.4.853": {
        "species": "Homo sapiens", "muscle_or_tissue": "skeletal muscle biopsy",
        "preparation": "sarcomeres labeled with sequence-specific antibodies across imposed lengths",
    },
    "10.1016/j.cell.2021.02.047": {
        "species": "Mus musculus", "muscle_or_tissue": "fast psoas skeletal muscle",
        "preparation": "native myofibrils; cryo-electron tomography/subtomogram averaging",
    },
    "10.1038/nature04343": {
        "species": "Homo sapiens", "muscle_or_tissue": None,
        "preparation": "recombinant titin Z1Z2–telethonin crystal complex (PDB 1YA5)",
    },
    "10.1016/j.jmb.2015.08.018": {
        "species": "Rattus norvegicus", "muscle_or_tissue": "cardiac muscle",
        "preparation": "electron tomography/subtomogram averaging of small-square Z-bands",
    },
    "10.1085/jgp.202012713": {
        "species": "Oryctolagus cuniculus and Mus musculus",
        "muscle_or_tissue": "rabbit psoas and mouse EDL skeletal muscle",
        "preparation": "relaxed demembranated fiber bundles and resting intact muscle; x-ray diffraction/interference",
    },
    "10.1083/jcb.134.6.1441": {
        "species": "Rattus norvegicus and Bos taurus",
        "muscle_or_tissue": "rat psoas and bovine sternomandibularis skeletal muscle",
        "preparation": "detergent-extracted fibers with antibody decoration, Epon embedding, and immunoelectron microscopy",
    },
    "10.1038/embor.2010.65": {
        "species": "Homo sapiens", "muscle_or_tissue": None,
        "preparation": "recombinant titin M10–OBSL1 Ig1 crystal complex (PDB 3KNB)",
    },
    "10.1038/s41586-023-06690-5": {
        "species": "Homo sapiens", "muscle_or_tissue": "cardiac muscle",
        "preparation": "native relaxed cardiac sarcomeres; cryo-electron tomography/subtomogram averaging",
    },
    "10.1038/s41467-024-46957-7": {
        "species": "Mus musculus", "muscle_or_tissue": "fast psoas skeletal muscle",
        "preparation": "permeabilized fibers with MyBP-C extraction/reconstitution and x-ray diffraction",
    },
    "10.1152/ajpheart.2000.279.5.h2568": {
        "species": "Rattus norvegicus", "muscle_or_tissue": "myocardium",
        "preparation": "isolated cardiac muscle; x-ray diffraction across sarcomere lengths",
    },
    "10.1016/j.jmb.2021.166901": {
        "species": "Homo sapiens", "muscle_or_tissue": None,
        "preparation": "recombinant UN2A constructs; structural and CARP-binding assays (PDB 7NIP)",
    },
    "10.3389/fphys.2020.00173": {
        "species": "Homo sapiens", "muscle_or_tissue": None,
        "preparation": "recombinant human N2A constructs; AFM, kinase assays, and simulation",
    },
    "10.1073/pnas.95.14.8052": {
        "species": "Rattus norvegicus", "muscle_or_tissue": "psoas skeletal muscle",
        "preparation": "isolated myofibril mechanics plus immunofluorescence/immunoelectron microscopy",
    },
    "10.1021/bi00801a004": {
        "species": "Oryctolagus cuniculus", "muscle_or_tissue": "skeletal muscle protein",
        "preparation": "purified actomyosin biochemical kinetics",
    },
    "10.1016/j.yjmcc.2019.05.026": {
        "species": "Mus musculus", "muscle_or_tissue": "cardiac papillary muscle",
        "preparation": "skinned WT and TtnΔC1–2 papillary muscle; IEM and SIM",
    },
    "PDB:1TKI+4JNW (Phase 6 measurement, kinase)": {
        "species": "Homo sapiens", "muscle_or_tissue": None,
        "preparation": "isolated recombinant titin kinase structures",
    },
    "PDB:6KN7": {
        "species": "Homo sapiens", "muscle_or_tissue": "cardiac thin-filament complex",
        "preparation": "deposited calcium-free cryo-EM model; alpha-skeletal actin with cardiac troponin subunits",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    return parser.parse_args()


def source_subject(source_id: str) -> dict[str, Any]:
    if source_id.startswith("data/") or source_id.startswith("scripts/"):
        return {
            "species": "model-scoped; see scientific_scope.json",
            "muscle_or_tissue": None,
            "preparation": "repository model or validation record",
        }
    if source_id not in SOURCE_SUBJECTS:
        raise ValueError(f"source {source_id} lacks an exact species/tissue/preparation binding")
    return copy.deepcopy(SOURCE_SUBJECTS[source_id])


def claim_subject(object_id: str) -> dict[str, Any]:
    if object_id in {"zdisc_local_network", "zdisc_alpha_actinin_doublets", "mybpc_czone_context"}:
        return {
            "species": "Mus musculus",
            "accession": None,
            "muscle_or_tissue": "fast psoas skeletal muscle context",
            "preparation": "structural/context observation transferred only as declared",
        }
    return {
        "species": "Homo sapiens",
        "accession": "Q8WZ42-1",
        "muscle_or_tissue": None,
        "preparation": "reference-sequence model with separately declared structural/mechanics transfers",
    }


def public_bindings(claim_id: str, presentation: dict[str, Any], annotations: dict[str, Any]) -> list[str]:
    showcase = load_json(ROOT / "data" / "showcase_claims.json")
    paths = [
        f"data/showcase_claims.json#/objects/{index}/claim"
        for index, row in enumerate(showcase.get("objects") or [])
        if row.get("claim_support_id") == claim_id
    ]
    paths.extend(
        f"data/presentation.json#/guided_chapters/{index}"
        for index, row in enumerate(presentation.get("guided_chapters") or [])
        if row.get("target_claim_id") == claim_id
    )
    paths.extend(
        f"data/presentation.json#/expert_cards/{index}"
        for index, row in enumerate(presentation.get("expert_cards") or [])
        if row.get("target_claim_id") == claim_id
    )
    paths.extend(
        f"data/annotations.json#/components/{index}"
        for index, row in enumerate(annotations.get("components") or [])
        if claim_id in (row.get("claim_support_ids") or [])
    )
    return paths


def support_row(source: dict[str, Any]) -> dict[str, Any]:
    source_id = source["id"]
    internal_locators = {
        "data/geometry_strategy.json": "#/geometric_relationships and #/context_depiction_policy",
        "data/mechanical_model.json": "#/per_state and #/resolved_chain_parameters",
        "data/references.json": "#/ (canonical registry)",
        "data/sarcomere.json": "#/components and #/reference_lengths_nm",
        "data/showcase_claims.json": "#/objects",
        "data/structural_states.json": "#/states",
        "scripts/validate_geometry.py": "full executable validation gate",
    }
    return {
        "source_id": source_id,
        "locator": LOCATORS.get(source_id, internal_locators.get(source_id, f"Registry record {source_id}")),
        "relationship": RELATIONSHIP[source["scope_compatibility"]],
        "source_subject": source_subject(source_id),
        "extraction_note": f"{source['role']}. Transfer limit: {source['transfer_limit']}",
    }


def pending_review() -> dict[str, Any]:
    return {
        "status": "PENDING",
        "reviewer": None,
        "affiliation": None,
        "publication_consent": False,
        "locator_verified_independently": None,
        "reviewed_on": None,
        "reviewed_payload_sha256": None,
    }


def extra_claims() -> list[dict[str, Any]]:
    target = claim_subject("scope_badge")
    return [
        {
            "id": "thin_filament_twist",
            "subject": {
                "species": "Homo sapiens",
                "accession": None,
                "muscle_or_tissue": "thin-filament structural context",
                "preparation": "calcium-free cryo-EM structure; cardiac troponin subunits with alpha-skeletal actin",
            },
            "statement": "The thin-filament close-up uses a measured actin long-pitch rise/twist as structural context while its continuous helical tube, phase, and radius remain schematic.",
            "quantity": None,
            "claim_class": "MEASURED",
            "render_class": "SCHEMATIC",
            "support": [
                {
                    "source_id": "PDB:6KN7",
                    "locator": "PDB 6KN7 polymer entities and deposited alpha-skeletal-actin coordinates",
                    "relationship": "corroborating",
                    "source_subject": source_subject("PDB:6KN7"),
                    "extraction_note": "The coordinate-derived rise/twist is admitted only for actin morphology; cardiac troponin coordinates and biochemical state are not transferred.",
                },
                {
                    "source_id": "data/context_measurements.json",
                    "locator": "#/thin_filament_6kn7 and #/thin_filament_twist",
                    "relationship": "direct",
                    "source_subject": source_subject("data/context_measurements.json"),
                    "extraction_note": "Repository-pinned coordinate measurement consumed by the context-detail layer.",
                },
            ],
            "model_dependencies": ["data/context_measurements.json"],
            "limitations": ["Individual actin subunits, regulatory complexes, shared phase, and biochemical state are not rendered."],
            "not_claimed": ["an exact helical phase shared by every filament", "a calcium-regulatory state"],
            "public_bindings": ["data/annotations.json#/components/4"],
            "inventory_status": "PUBLIC",
            "review": pending_review(),
        },
        {
            "id": "sequence_region_partition",
            "subject": target,
            "statement": "The consumed Q8WZ42-1 partition uses a four-fold I80-UN2A-I81-I82-I83 N2A element, an explicit unresolved 9852-10215 interval, and separate imported, curated, and rendered domain counts.",
            "quantity": None,
            "claim_class": "STRONGLY INFERRED",
            "render_class": "SCHEMATIC",
            "support": [{
                "source_id": "UniProt:Q8WZ42",
                "locator": LOCATORS["UniProt:Q8WZ42"],
                "relationship": "direct",
                "source_subject": source_subject("UniProt:Q8WZ42"),
                "extraction_note": "Pinned containment yields three UniProt Ig-like rows in the 9366-9851 N2A interval and 16 in distal-Ig; the fourth curated N2A fold and the I81/I82 source overlap remain separately recorded under SD-01.",
            }],
            "model_dependencies": ["data/titin_sequence_features.json", "data/titin.json", "SD-01"],
            "limitations": ["The 9366 boundary is a conservative reproducible project boundary, not a uniquely established biological boundary; residues 9852-10215 remain unresolved."],
            "not_claimed": ["that imported UniProt rows and curated biological folds are identical counts", "a resolved conformation or force law for residues 9852-10215"],
            "public_bindings": [],
            "inventory_status": "AUDIT_ONLY",
            "review": pending_review(),
        },
        {
            "id": "aband_periodicity_relation",
            "subject": target,
            "statement": "The C-zone sequence super-repeat contains 11 domains; its 43.78 nm derived interval, the 43.17 nm myosin H periodicity, 14.3 nm crown spacing, and approximately 45.54 nm L periodicity are distinct quantities.",
            "quantity": {"value": 43.78, "unit": "nm", "label": "derived eleven-domain interval from the measured mean titin-domain spacing"},
            "claim_class": "STRONGLY INFERRED",
            "render_class": "SCHEMATIC",
            "support": [
                {
                    "source_id": "10.1016/j.jmb.2020.06.025",
                    "locator": LOCATORS["10.1016/j.jmb.2020.06.025"],
                    "relationship": "direct",
                    "source_subject": source_subject("10.1016/j.jmb.2020.06.025"),
                    "extraction_note": "The measured mean titin-domain spacing is 3.98 nm (95% CI 3.92-4.03); multiplying by the sequence-defined 11-domain count gives the separately labelled 43.78 nm interval."
                },
                {
                    "source_id": "10.1016/j.yjmcc.2019.05.026",
                    "locator": LOCATORS["10.1016/j.yjmcc.2019.05.026"],
                    "relationship": "context",
                    "source_subject": source_subject("10.1016/j.yjmcc.2019.05.026"),
                    "extraction_note": "The cardiac epitope map corroborates A-band ordering but is not used to identify the derived titin interval with a myosin or x-ray periodicity."
                },
                {
                    "source_id": "10.1085/jgp.202012713",
                    "locator": LOCATORS["10.1085/jgp.202012713"],
                    "relationship": "direct",
                    "source_subject": source_subject("10.1085/jgp.202012713"),
                    "extraction_note": "Rabbit-psoas and mouse-EDL x-ray observations support the separately named H, crown, and approximate L periodicities; the proposed titin origin of L remains inferred."
                }
            ],
            "model_dependencies": ["data/titin.json", "data/sarcomere.json", "SD-03"],
            "limitations": ["The proposed titin origin of the L periodicity is an inferred hypothesis, not a measured molecular register."],
            "not_claimed": ["that approximately 45.54 nm is the exact molecular span of one eleven-domain chain", "an exact titin-myosin register"],
            "public_bindings": [],
            "inventory_status": "AUDIT_ONLY",
            "review": pending_review(),
        },
        {
            "id": "force_law_parameter_set",
            "subject": target,
            "statement": "A deterministic development solver retains parameters transferred from rat-psoas preparations, but SD-04 withholds all public absolute-pN output because biological transfer, validity range, uncertainty, slack, and unfolding remain unresolved.",
            "quantity": None,
            "claim_class": "MODELED",
            "render_class": "MODELED",
            "support": [{
                "source_id": "10.1073/pnas.95.14.8052",
                "locator": LOCATORS["10.1073/pnas.95.14.8052"],
                "relationship": "transfer",
                "source_subject": source_subject("10.1073/pnas.95.14.8052"),
                "extraction_note": "Force-law parameter evidence is from rat psoas; SD-04 permits internal deterministic auditing but explicitly does not approve absolute-pN transfer to Q8WZ42-1."
            }],
            "model_dependencies": ["data/mechanical_parameters.json", "data/mechanical_model.json", "data/structural_states.json", "SD-04"],
            "limitations": ["Species/preparation transfer, supported range, uncertainty, slack/buckling/contact, and unfolding/refolding are unresolved."],
            "not_claimed": ["direct human Q8WZ42-1 force measurements", "public or release-approved absolute-pN predictions"],
            "public_bindings": ["src/index.template.html#id=stageForce", "src/index.template.html#id=forceCurve"],
            "inventory_status": "AUDIT_ONLY",
            "review": pending_review(),
        },
        {
            "id": "pevk_phosphorylation",
            "subject": target,
            "statement": "The current N2A phosphorylation source does not support a PEVK-phosphorylation parameter, and the visualization implements no phosphorylation state.",
            "quantity": None,
            "claim_class": "UNKNOWN",
            "render_class": "UNKNOWN",
            "support": [{
                "source_id": "10.3389/fphys.2020.00173",
                "locator": LOCATORS["10.3389/fphys.2020.00173"],
                "relationship": "context",
                "source_subject": source_subject("10.3389/fphys.2020.00173"),
                "extraction_note": "Fig. 5 concerns recombinant human N2A PKA phosphorylation/CARP conditions; it does not measure PEVK phosphorylation mechanics."
            }],
            "model_dependencies": [],
            "limitations": ["The current cited source is a known binding mismatch for a PEVK-specific claim."],
            "not_claimed": ["a PEVK phosphorylation parameter or regulatory simulation"],
            "public_bindings": [],
            "inventory_status": "AUDIT_ONLY",
            "review": pending_review(),
        },
        {
            "id": "sarcomere_definition",
            "subject": {"species": "general striated muscle", "accession": None, "muscle_or_tissue": "striated muscle", "preparation": "foundational definition"},
            "statement": "A sarcomere is the repeating contractile unit bounded by Z-discs, with interdigitating actin and myosin filaments.",
            "quantity": None,
            "claim_class": "MEASURED",
            "render_class": "SCHEMATIC",
            "support": [{
                "source_id": "10.1016/j.cell.2021.02.047",
                "locator": LOCATORS["10.1016/j.cell.2021.02.047"],
                "relationship": "context",
                "source_subject": source_subject("10.1016/j.cell.2021.02.047"),
                "extraction_note": "Current registry source is contextual; SC-22 should replace or confirm a primary foundational locator."
            }],
            "model_dependencies": ["data/sarcomere.json"],
            "limitations": ["Current support is not yet independently locator-verified."],
            "not_claimed": ["that the schematic is a complete sarcomere molecular inventory"],
            "public_bindings": [],
            "inventory_status": "REQUIRED_FOR_SC23",
            "review": pending_review(),
        },
        {
            "id": "actomyosin_motor_function",
            "subject": {"species": "general striated muscle", "accession": None, "muscle_or_tissue": "striated muscle", "preparation": "functional explanation"},
            "statement": "Myosin uses ATP to generate active force against actin; titin is not the ATP-powered motor.",
            "quantity": None,
            "claim_class": "MEASURED",
            "render_class": "SCHEMATIC",
            "support": [{
                "source_id": "10.1021/bi00801a004",
                "locator": LOCATORS["10.1021/bi00801a004"],
                "relationship": "direct",
                "source_subject": source_subject("10.1021/bi00801a004"),
                "extraction_note": "Foundational actomyosin ATPase-cycle evidence; exact public wording remains pending independent review."
            }],
            "model_dependencies": [],
            "limitations": ["The exact locator and modern public wording must be independently reviewed before SC-23 ships."],
            "not_claimed": ["that titin hydrolyses ATP to drive contraction", "an active cross-bridge simulation"],
            "public_bindings": [],
            "inventory_status": "REQUIRED_FOR_SC23",
            "review": pending_review(),
        },
    ]


def build(previous: dict[str, Any] | None = None) -> dict[str, Any]:
    showcase = load_json(ROOT / "data" / "showcase_claims.json")
    presentation = load_json(ROOT / "data" / "presentation.json")
    annotations = load_json(ROOT / "data" / "annotations.json")
    previous_by_id = {row["id"]: row for row in (previous or {}).get("claims") or []}
    claims = []
    for obj in showcase.get("objects") or []:
        record = {
            "id": obj["claim_support_id"],
            "subject": claim_subject(obj["id"]),
            "statement": obj["claim"],
            "quantity": None,
            "claim_class": obj["claim_evidence_class"],
            "render_class": obj["render_evidence_class"],
            "support": [support_row(source) for source in obj["sources"]],
            "model_dependencies": [
                source["id"] for source in obj["sources"] if source["kind"] == "INTERNAL"
            ],
            "limitations": [source["transfer_limit"] for source in obj["sources"]],
            "not_claimed": obj["not_claimed"],
            "public_bindings": public_bindings(obj["id"], presentation, annotations),
            "inventory_status": "PUBLIC" if obj["decision"] not in {"OMIT", "DEFER"} else obj["decision"],
            "review": pending_review(),
        }
        old = previous_by_id.get(record["id"])
        if old and (old.get("review") or {}).get("status") in {"APPROVED", "DEFERRED"}:
            if old["review"].get("reviewed_payload_sha256") == claim_payload_sha256(record):
                record["review"] = copy.deepcopy(old["review"])
        claims.append(record)
    for record in extra_claims():
        discovered = public_bindings(record["id"], presentation, annotations)
        record["public_bindings"] = list(dict.fromkeys(
            [*(record.get("public_bindings") or []), *discovered]
        ))
        claims.append(record)
    claims.sort(key=lambda row: row["id"])
    return {
        "schema": "titin-claim-support/1",
        "status": "CODE_COMPLETE_BLOCKED_SCIENCE",
        "evidence_classes": [
            "MEASURED", "STRONGLY INFERRED", "MODELED", "INFERRED", "SCHEMATIC", "UNKNOWN"
        ],
        "support_relationships": ["direct", "corroborating", "transfer", "context"],
        "semantic_entailment": "Named human review only; registry closure is a separate gate.",
        "claims": claims,
    }


def main() -> None:
    args = parse_args()
    previous = load_json(args.output) if args.output.is_file() else None
    result = build(previous)
    text = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if not args.output.is_file() or args.output.read_text(encoding="utf-8") != text:
            raise SystemExit("claim inventory is stale: run scripts/build_claim_inventory.py")
        print(f"claim inventory is current ({len(result['claims'])} claims)")
        return
    args.output.write_text(text, encoding="utf-8")
    print(f"wrote {args.output} ({len(result['claims'])} claims)")


if __name__ == "__main__":
    main()
