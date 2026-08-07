"""Extract Cα backbones for the domain archetypes from the pinned structure cache.

The archetype capsules in geometry_strategy.json are built Y-long, so each
backbone is centred on its centroid and rotated to put its principal axis on +Y.
That way swapping a capsule for a backbone changes the SURFACE and nothing else:
the instance transform the renderer already computed still applies.

MEASURED coordinates, from files whose SHA-256 is pinned in the cache manifest.

    .venv/bin/python scripts/extract_domain_backbones.py
"""
import hashlib
import json
from pathlib import Path

try:
    import gemmi
    import numpy as np
except ImportError as exc:                                  # pragma: no cover
    raise SystemExit("gemmi and numpy required: install requirements.txt") from exc

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "structures"
STRATEGY = ROOT / "data" / "geometry_strategy.json"
OUT = ROOT / "data" / "domain_backbones.json"


def archetype_sources() -> dict[str, dict[str, str]]:
    """One archetype, one deposited structure — taken from the spec, not chosen here.

    geometry_strategy.json already names a representative_structure per archetype,
    each with a documented `why_this_one` and a verified SIFTS residue mapping, and
    the renderer already stamps that pdb_id onto every domain mesh it draws. Reading
    the mapping from there rather than restating it means a backbone can never be
    extracted from a different structure than the capsule it replaces claims — which
    would put two different provenances on one object.
    """
    strategy = json.loads(STRATEGY.read_text())
    sources = {}
    for name, archetype in strategy["domain_archetypes"].items():
        pdb_id = archetype.get("representative_structure", {}).get("pdb_id")
        if not pdb_id:
            raise SystemExit(f"{name} declares no representative structure to extract from")
        sources[name] = {
            "pdb_id": pdb_id,
            "source_id": f"PDB:{pdb_id}",
            "capsule_axial_length_nm": archetype["axial_length_nm"],
            "capsule_lateral_diameter_nm": archetype["lateral_diameter_nm"],
        }
    return sources


def calpha_nm(path: Path) -> list[list[float]]:
    """Cα coordinates of the first polymer chain, in nanometres."""
    block = gemmi.cif.read_file(str(path)).sole_block()
    structure = gemmi.make_structure_from_block(block)
    structure.setup_entities()
    for chain in structure[0]:
        polymer = [r for r in chain if r.entity_type == gemmi.EntityType.Polymer]
        points = [r["CA"][0].pos for r in polymer if r.find_atom("CA", "*")]
        if len(points) >= 20:
            return [[p.x / 10.0, p.y / 10.0, p.z / 10.0] for p in points]
    raise SystemExit(f"extract_domain_backbones: no usable Cα chain in {path.name}")


def aligned(points: list[list[float]]) -> list[list[float]]:
    """Centre on the centroid and put the principal axis on +Y."""
    coords = np.asarray(points, dtype=float)
    coords -= coords.mean(axis=0)
    # Principal axis = first right-singular vector of the centred coordinates.
    axis = np.linalg.svd(coords, full_matrices=False)[2][0]
    if axis[1] < 0:
        axis = -axis                      # keep +Y, not -Y
    target = np.array([0.0, 1.0, 0.0])
    v = np.cross(axis, target)
    s = np.linalg.norm(v)
    if s < 1e-12:
        rotation = np.eye(3)
    else:
        c = float(np.dot(axis, target))
        vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
        rotation = np.eye(3) + vx + vx @ vx * ((1 - c) / (s ** 2))
    return [[round(float(value), 3) for value in row] for row in coords @ rotation.T]


def main() -> None:
    manifest = json.loads((CACHE / "manifest.json").read_text())
    archetypes = {}
    for name, spec in archetype_sources().items():
        path = CACHE / f"{spec['pdb_id']}.cif"
        if not path.exists():
            raise SystemExit(f"{path.name} is not cached; run npm run fetch:structures")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        pinned = str(manifest).find(digest) >= 0
        points = aligned(calpha_nm(path))
        extent = np.asarray(points).max(axis=0) - np.asarray(points).min(axis=0)
        archetypes[name] = {
            "pdb_id": spec["pdb_id"],
            "source_id": spec["source_id"],
            "evidence_class": "MEASURED",
            "residue_count": len(points),
            "sha256": digest,
            "sha256_pinned_in_manifest": pinned,
            "frame": "centred on centroid; principal axis on +Y, matching the archetype capsule",
            # Reported, never enforced. The capsule's axial length is a literature
            # value for the folded domain and this is one deposited chain's own
            # extent; they are allowed to differ, and a reader comparing the drawn
            # surface with the drawn capsule should be able to see by how much.
            "extent_nm": {
                axis: round(float(value), 3)
                for axis, value in zip("xyz", extent)
            },
            "capsule_axial_length_nm": spec["capsule_axial_length_nm"],
            "capsule_lateral_diameter_nm": spec["capsule_lateral_diameter_nm"],
            "ca_nm": points,
        }
    OUT.write_text(json.dumps({
        "schema": "titin-domain-backbones/1",
        "meta": {
            "purpose": "Cα backbones for the domain archetypes, for the deepest close-up only.",
            "reproduce": ".venv/bin/python scripts/extract_domain_backbones.py",
            "archetype_structure_source":
                "data/geometry_strategy.json -> domain_archetypes[*].representative_structure",
            "not_claimed": [
                "a unique molecular surface for every domain in the chain",
                "an in-situ orientation for any individual domain",
            ],
        },
        "archetypes": archetypes,
    }, indent=1) + "\n")
    total = sum(a["residue_count"] for a in archetypes.values())
    print(f"wrote {OUT.relative_to(ROOT)}  {OUT.stat().st_size // 1024} KB  {total} Cα")
    for name, record in archetypes.items():
        print(f"  {name:8s} {record['pdb_id']}  {record['residue_count']:3d} Cα  "
              f"pinned={record['sha256_pinned_in_manifest']}  "
              f"extent {record['extent_nm']}")


if __name__ == "__main__":
    main()
