#!/usr/bin/env python3
"""Normalize an mmCIF structure for the Phase 6 measurement pipeline.

The public ``parse(path_or_id)`` contract deliberately returns ordinary metadata
plus private Gemmi handles used by ``measure_structure``. Coordinates remain
source data in ångström inside Gemmi and are converted to nanometres only by the
measurement layer.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    import gemmi
except ImportError as exc:  # pragma: no cover - exercised by CLI diagnostics
    raise SystemExit("gemmi required: install requirements.txt") from exc


HERE = Path(__file__).resolve().parent
APP = HERE.parent
STRUCTURES = APP / "data" / "structures"


def _source_path(path_or_id: str | os.PathLike[str]) -> tuple[Path, str]:
    candidate = Path(path_or_id)
    if candidate.is_file():
        return candidate.resolve(), candidate.stem.upper()

    pdb_id = str(path_or_id).strip().upper()
    if len(pdb_id) != 4 or not pdb_id.isalnum():
        raise ValueError(
            f"parse_structure: '{path_or_id}' is neither an mmCIF path nor a four-character PDB id"
        )
    STRUCTURES.mkdir(parents=True, exist_ok=True)
    target = STRUCTURES / f"{pdb_id}.cif"
    if not target.exists():
        raise FileNotFoundError(
            f"parse_structure: manifest-pinned {target.name} is not cached; "
            "run python3 scripts/fetch_structures.py (or pass an explicit local mmCIF path)"
        )
    return target, pdb_id


def _first_float(block, tags):
    for tag in tags:
        value = block.find_value(tag)
        if value and value not in ("?", "."):
            try:
                return float(value)
            except ValueError:
                pass
    return None


def _entity_rows(block):
    descriptions = {}
    table = block.find(["_entity.id", "_entity.pdbx_description"])
    for row in table:
        descriptions[str(row[0])] = str(row[1]).strip("'\"")
    return descriptions


def _subchain_entities(block):
    result = {}
    table = block.find(["_struct_asym.id", "_struct_asym.entity_id"])
    for row in table:
        result[str(row[0])] = str(row[1])
    return result


def parse(path_or_id):
    """Parse an mmCIF path or PDB id into the normalized pipeline record."""
    path, pdb_id = _source_path(path_or_id)
    document = gemmi.cif.read_file(str(path))
    block = document.sole_block()
    structure = gemmi.make_structure_from_block(block)
    structure.setup_entities()
    # Select one conformer before any coordinate measurement. Without this,
    # alternate locations are counted as independent atoms and can distort PCA
    # extents/axes. Polymer filtering remains in the measurement layer as a
    # second line of defence against solvent and ligands.
    structure.remove_alternative_conformations()

    entity_desc = _entity_rows(block)
    subchain_entity = _subchain_entities(block)
    chains = []
    for model in structure:
        for chain in model:
            polymer = [residue for residue in chain if residue.entity_type == gemmi.EntityType.Polymer]
            if not polymer:
                continue
            subchain = next((residue.subchain for residue in polymer if residue.subchain), "")
            entity_id = subchain_entity.get(subchain, "?")
            seq_numbers = [residue.seqid.num for residue in polymer]
            chains.append({
                "chain": chain.name,
                "model": model.num,
                "subchain": subchain,
                "entity_id": entity_id,
                "description": entity_desc.get(entity_id),
                "seq_range": [min(seq_numbers), max(seq_numbers)],
                "n_residues": len(polymer),
            })

    if not chains:
        raise ValueError(f"parse_structure: {path} contains no polymer chains")

    resolution = _first_float(block, [
        "_refine.ls_d_res_high",
        "_em_3d_reconstruction.resolution",
        "_reflns.d_resolution_high",
    ])
    return {
        "schema": "titin-parsed-structure/1",
        "pdb_id": pdb_id,
        "source_path": str(path),
        "resolution_A": resolution,
        "entities": [
            {"entity_id": entity_id, "description": description}
            for entity_id, description in sorted(entity_desc.items())
        ],
        "chains": chains,
        "_structure": structure,
        "_block": block,
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/parse_structure.py <PDB_ID|file.cif>")
    parsed = parse(sys.argv[1])
    print({key: value for key, value in parsed.items() if not key.startswith("_")})
