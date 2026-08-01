#!/usr/bin/env python3
"""Canonical adapter for Phase-6 primitive fitting.

The numerical implementation lives in :mod:`measure_structures`; this module is
the stable public entry point promised by the pipeline diagram. Keeping it as a
thin adapter prevents a second PCA/fitting algorithm from drifting away from the
one that produced ``data/structure_measurements.json``.

Coordinates are heavy-atom XYZ values in angstrom. Returned primitive parameters
are in nanometres and remain a SCHEMATIC primitive choice fitted to MEASURED
coordinates; they are not atomistic surfaces.
"""
from __future__ import annotations

import numpy as np

from measure_structures import fit_primitives, principal_frame, validate_fit


def _points(measurements):
    if isinstance(measurements, dict):
        for key in ("coordinates_A", "points_A", "heavy_atom_coordinates_A"):
            if key in measurements:
                measurements = measurements[key]
                break
        else:
            raise ValueError(
                "fit_geometry: mapping must contain coordinates_A, points_A, "
                "or heavy_atom_coordinates_A"
            )
    points = np.asarray(measurements, dtype=float)
    if points.ndim != 2 or points.shape[1] != 3 or len(points) < 4:
        raise ValueError("fit_geometry: expected at least four XYZ coordinates")
    if not np.isfinite(points).all():
        raise ValueError("fit_geometry: coordinates must all be finite")
    return points


def fit(measurements, proxy_kind="capsule"):
    """Fit and validate a capsule or ellipsoid around an atom cloud.

    This delegates every numerical step to the canonical Phase-6 functions.
    ``proxy_kind`` selects only which already-computed fit is exposed.
    """
    if proxy_kind not in ("capsule", "ellipsoid"):
        raise ValueError(
            f"fit_geometry: unsupported proxy_kind {proxy_kind!r}; "
            "expected 'capsule' or 'ellipsoid'"
        )
    frame = principal_frame(_points(measurements))
    primitives = fit_primitives(frame)
    quality = validate_fit(frame, primitives)
    if proxy_kind == "capsule":
        params = {
            "radius_nm": primitives["capsule_radius_nm"],
            "total_length_nm": primitives["capsule_length_nm"],
            "cylinder_length_nm": primitives["capsule_cylinder_nm"],
        }
        enclosure = quality["capsule_enclosure_frac"]
        volume = quality["capsule_volume_nm3"]
        ratio = quality["capsule_volume_ratio_vs_hull"]
    else:
        params = {"semi_axes_nm": primitives["ellipsoid_semi_axes_nm"]}
        enclosure = quality["ellipsoid_enclosure_frac"]
        volume = quality["ellipsoid_volume_nm3"]
        ratio = quality["ellipsoid_volume_ratio_vs_hull"]
    return {
        "schema": "titin-primitive-fit/1",
        "primitive": proxy_kind,
        "params_nm": params,
        "fit_quality": {
            "heavy_atom_enclosure_fraction": enclosure,
            "volume_nm3": volume,
            "volume_ratio_vs_convex_hull": ratio,
        },
        "geometry_derived_from_coordinates": True,
        "coordinate_evidence_class": "MEASURED",
        "primitive_choice_evidence_class": "SCHEMATIC",
        "does_not_claim": "atomistic surface shape or in-situ orientation",
    }


if __name__ == "__main__":
    raise SystemExit(
        "fit_geometry.py is a library entry point; pass coordinates from the "
        "measurement pipeline to fit()."
    )
