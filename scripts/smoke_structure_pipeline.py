#!/usr/bin/env python3
"""Offline smoke test for parse_structure -> measure_structure.

The fixture is generated in a temporary directory, so this gate exercises Gemmi
parsing and the coordinate math without downloading a PDB entry or modifying the
scientific source-data cache.
"""
from __future__ import annotations

import math
import sys
import tempfile
from pathlib import Path

import gemmi

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from parse_structure import parse  # noqa: E402
from measure_structure import (  # noqa: E402
    _coords,
    cylindrical,
    measure,
    measure_filament_axis,
    measure_helical,
)
from fit_geometry import fit  # noqa: E402
from generate_proxy import generate  # noqa: E402


def fixture(path):
    structure = gemmi.Structure()
    structure.name = "synthetic_actin_like_helix"
    model = gemmi.Model(1)
    rise_A = 27.5
    twist_deg = -166.6
    radius_A = 40.0
    chain_names = tuple(f"C{index}" for index in range(60))
    for index, chain_name in enumerate(chain_names):
        chain = gemmi.Chain(chain_name)
        phase = math.radians(index * twist_deg)
        for residue_number in range(1, 6):
            residue = gemmi.Residue()
            residue.name = "ALA"
            residue.seqid = gemmi.SeqId(residue_number, " ")
            atom = gemmi.Atom()
            atom.name = "CA"
            atom.element = gemmi.Element("C")
            atom.pos = gemmi.Position(
                radius_A * math.cos(phase) + residue_number * 0.05,
                radius_A * math.sin(phase),
                index * rise_A + residue_number * 0.4,
            )
            residue.add_atom(atom)
            chain.add_residue(residue)
        model.add_chain(chain)

    # Regression contaminants. Neither may affect the measured polymer geometry:
    # a far-away alternate conformer and a far-away crystallographic water were
    # the two ways generic all-atom PCA could be silently inflated.
    first = model[0][0]
    alternate = gemmi.Atom()
    alternate.name = "CA"
    alternate.altloc = "B"
    alternate.occ = 0.25
    alternate.element = gemmi.Element("C")
    alternate.pos = gemmi.Position(10000.0, 10000.0, 10000.0)
    first.add_atom(alternate)

    water_chain = gemmi.Chain("W")
    water = gemmi.Residue()
    water.name = "HOH"
    water.het_flag = "H"
    water.seqid = gemmi.SeqId(1, " ")
    oxygen = gemmi.Atom()
    oxygen.name = "O"
    oxygen.element = gemmi.Element("O")
    oxygen.pos = gemmi.Position(-12000.0, 9000.0, 15000.0)
    water.add_atom(oxygen)
    water_chain.add_residue(water)
    model.add_chain(water_chain)
    structure.add_model(model)
    structure.setup_entities()
    structure.make_mmcif_document().write_file(str(path))


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    with tempfile.TemporaryDirectory(prefix="titin-pipeline-") as directory:
        path = Path(directory) / "synthetic.cif"
        fixture(path)
        parsed = parse(path)
        require(len(parsed["chains"]) == 60, "parser lost polymer chains")
        points, metadata = _coords(parsed)
        require(points.shape == (300, 3) and len(metadata) == 300,
                "coordinate extraction retained solvent/altloc or lost polymer CA records")
        helix_chains = [f"C{index}" for index in range(60)]
        frame = measure_filament_axis(parsed, ref_chain="C0", chains=helix_chains)
        z, radius, angle = cylindrical(points, frame)
        require(all(map(math.isfinite, z)), "non-finite axial coordinates")
        require(all(map(math.isfinite, radius)), "non-finite radii")
        require(all(map(math.isfinite, angle)), "non-finite azimuths")
        helix = measure_helical(parsed, helix_chains, frame)
        require(helix["step_estimator"] == "mean of consecutive subunit steps",
                "helical estimator no longer represents the global end-to-end advance")
        require(abs(helix["axial_rise_per_subunit_nm"] - 2.75) < 0.05,
                f"wrong helical rise: {helix['axial_rise_per_subunit_nm']}")
        require(abs(abs(helix["twist_per_subunit_deg"]) - 166.6) < 0.3,
                f"wrong helical twist: {helix['twist_per_subunit_deg']}")
        dimensions = measure(parsed)
        require(dimensions["length_nm"] > dimensions["diameter_nm"] > 0,
                "PCA dimensions are not filament-like")
        require(dimensions["length_nm"] < 200,
                "non-polymer/alternate coordinates inflated generic PCA dimensions")
        # A compact capsule-like atom cloud exercises the stable fitting adapter;
        # the helical filament above is intentionally not capsule-shaped and is
        # therefore the wrong fixture for a >=95% primitive-envelope gate.
        proxy_points = [[0.0, 0.0, -20.0], [0.0, 0.0, 20.0]]
        for axial in (-15.0, 0.0, 15.0):
            for degree in range(0, 360, 45):
                angle = math.radians(degree)
                proxy_points.append([math.cos(angle), math.sin(angle), axial])
        fitted = fit(proxy_points, "capsule")  # adapter accepts angstrom
        require(fitted["fit_quality"]["heavy_atom_enclosure_fraction"] >= 0.95,
                "canonical primitive adapter emitted an invalid fit")
        proxy_path = Path(directory) / "synthetic_proxy.json"
        emitted = generate(fitted, proxy_path)
        require(proxy_path.is_file() and emitted["primitive"] == "capsule",
                "procedural proxy descriptor was not emitted")
    print("structure pipeline smoke: PASS")


if __name__ == "__main__":
    main()
