#!/usr/bin/env python3
"""Coordinate measurements shared by the titin structural-data pipeline."""
from __future__ import annotations

import math

import gemmi
import numpy as np


def _chain_objects(parsed, chains=None):
    wanted = set(chains) if chains is not None else None
    found = []
    for model in parsed["_structure"]:
        for chain in model:
            if wanted is None or chain.name in wanted:
                found.append(chain)
    if wanted is not None:
        missing = wanted - {chain.name for chain in found}
        if missing:
            raise ValueError(f"unknown chain(s): {', '.join(sorted(missing))}")
    return found


def _coords(parsed, chains=None, seq_range=None, atom_name="CA"):
    """Return selected atom coordinates in nm and parallel atom metadata."""
    points, metadata = [], []
    lo, hi = seq_range if seq_range is not None else (None, None)
    for chain in _chain_objects(parsed, chains):
        for residue in chain:
            # Generic all-atom PCA previously included waters, ions and ligands.
            # A single distant crystallographic water could inflate the reported
            # structure length by >10x. Geometry claims here are about the
            # macromolecular polymer, so non-polymer residues are never eligible.
            if residue.entity_type != gemmi.EntityType.Polymer:
                continue
            if lo is not None and not (lo <= residue.seqid.num <= hi):
                continue
            atoms = list(residue) if atom_name is None else [residue.find_atom(atom_name, "*")]
            for atom in atoms:
                if not atom:
                    continue
                if atom.element.name == "H":
                    continue
                points.append([atom.pos.x / 10.0, atom.pos.y / 10.0, atom.pos.z / 10.0])
                metadata.append({
                    "chain": chain.name,
                    "residue": residue.seqid.num,
                    "residue_name": residue.name,
                    "atom": atom.name,
                })
    return np.asarray(points, dtype=float).reshape((-1, 3)), metadata


def _principal_axis(points):
    if len(points) < 3:
        raise ValueError("at least three coordinates are required for a principal axis")
    origin = points.mean(axis=0)
    _, _, vh = np.linalg.svd(points - origin, full_matrices=False)
    return origin, vh[0]


def measure_filament_axis(parsed, ref_chain=None, chains=None):
    """Fit a deterministic right-handed cylindrical frame to selected chains.

    A deposited filament complex can include off-axis regulatory proteins.  They
    are valid polymers, but they must not rotate the axis used to measure the
    filament they decorate.  ``chains`` therefore scopes the PCA explicitly;
    omitting it retains the generic whole-polymer behavior.
    """
    points, _ = _coords(parsed, chains=chains)
    origin, axis = _principal_axis(points)

    if ref_chain is not None:
        if chains is not None and ref_chain not in set(chains):
            raise ValueError("ref_chain must be included in chains")
        reference, meta = _coords(parsed, chains=[ref_chain])
        if len(reference) >= 2:
            order = np.argsort([row["residue"] for row in meta])
            ordered = reference[order]
            span = max(1, min(10, len(ordered) // 4))
            n_to_c = ordered[-span:].mean(axis=0) - ordered[:span].mean(axis=0)
            if np.dot(axis, n_to_c) < 0:
                axis = -axis

    axis = axis / np.linalg.norm(axis)
    reference = np.array([1.0, 0.0, 0.0])
    if abs(np.dot(reference, axis)) > 0.9:
        reference = np.array([0.0, 1.0, 0.0])
    radial_x = reference - np.dot(reference, axis) * axis
    radial_x /= np.linalg.norm(radial_x)
    radial_y = np.cross(axis, radial_x)
    radial_y /= np.linalg.norm(radial_y)
    return {
        "origin_nm": origin,
        "axis": axis,
        "radial_x": radial_x,
        "radial_y": radial_y,
        "reference_chain": ref_chain,
    }


def cylindrical(points, frame):
    """Project nm coordinates into axial z, radius r, and azimuth degrees."""
    values = np.asarray(points, dtype=float)
    delta = values - np.asarray(frame["origin_nm"])
    z = delta @ np.asarray(frame["axis"])
    x = delta @ np.asarray(frame["radial_x"])
    y = delta @ np.asarray(frame["radial_y"])
    r = np.hypot(x, y)
    azimuth = np.degrees(np.arctan2(y, x))
    return z, r, azimuth


def _wrapped_delta_deg(a, b):
    return (b - a + 180.0) % 360.0 - 180.0


def measure_helical(parsed, chains, frame):
    """Measure axial rise and azimuthal twist from ordered chain centroids."""
    rows = []
    for chain in chains:
        points, _ = _coords(parsed, chains=[chain])
        if len(points) == 0:
            continue
        z, _, azimuth = cylindrical(points, frame)
        angle = math.degrees(math.atan2(
            np.sin(np.radians(azimuth)).mean(),
            np.cos(np.radians(azimuth)).mean(),
        ))
        rows.append((float(z.mean()), angle, chain))
    rows.sort()
    if len(rows) < 2:
        raise ValueError("at least two populated chains are required for a helical measurement")
    rises = np.diff([row[0] for row in rows])
    twists = [_wrapped_delta_deg(rows[i][1], rows[i + 1][1]) for i in range(len(rows) - 1)]
    # This is an ordered, complete run of consecutive subunits.  The global
    # helical increment is therefore the total axial/angular advance divided by
    # the number of steps, i.e. the arithmetic mean.  A median biases the pitch
    # when local refinement errors alternate above/below the global helix (as in
    # 6KN7) and no longer reproduces the end-to-end advance.
    rise = float(np.mean(rises))
    twist = float(np.mean(twists))
    residual = 180.0 - abs(twist)
    crossover = float(180.0 / residual * rise) if residual > 1e-9 else math.inf
    return {
        "n_subunits": len(rows),
        "axial_rise_per_subunit_nm": rise,
        "twist_per_subunit_deg": twist,
        "handedness": "right-handed" if twist < 0 else "left-handed",
        "crossover_repeat_nm": crossover,
        "step_estimator": "mean of consecutive subunit steps",
        "ordered_chains": [row[2] for row in rows],
    }


def measure(parsed):
    """Generic whole-structure PCA dimensions, all in nm."""
    points, _ = _coords(parsed, atom_name=None)
    origin, axis = _principal_axis(points)
    centered = points - origin
    _, _, vh = np.linalg.svd(centered, full_matrices=False)
    projected = centered @ vh.T
    extent = projected.max(axis=0) - projected.min(axis=0)
    return {
        "length_nm": float(extent[0]),
        "diameter_nm": float(np.mean(extent[1:])),
        "principal_axes": vh.tolist(),
        "principal_axis": axis.tolist(),
        "radius_of_gyration_nm": float(np.sqrt(np.mean(np.sum(centered ** 2, axis=1)))),
        "evidence_class": "MEASURED",
    }
