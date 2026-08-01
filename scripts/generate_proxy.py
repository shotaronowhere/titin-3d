#!/usr/bin/env python3
"""Emit a validated procedural-proxy descriptor.

The viewer constructs capsules and ellipsoids directly from numbers. Exporting a
GLB for those same shapes would introduce a second, drift-prone encoding, so the
completed pipeline artifact is a deterministic JSON descriptor. A future
non-parametric molecular surface would require a separate mesh-export phase and
its own provenance policy.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import tempfile


def generate(fit_result, out_path):
    """Validate ``fit_result`` and atomically write a procedural asset manifest."""
    if not isinstance(fit_result, dict) or fit_result.get("schema") != "titin-primitive-fit/1":
        raise ValueError("generate_proxy: expected a titin-primitive-fit/1 record")
    primitive = fit_result.get("primitive")
    if primitive not in ("capsule", "ellipsoid"):
        raise ValueError(f"generate_proxy: unsupported primitive {primitive!r}")
    enclosure = fit_result.get("fit_quality", {}).get("heavy_atom_enclosure_fraction")
    if not isinstance(enclosure, (int, float)) or enclosure < 0.95 or enclosure > 1.0:
        raise ValueError(
            "generate_proxy: fit must enclose at least 95% of heavy atoms and at most 100%"
        )
    target = Path(out_path)
    if target.suffix.lower() != ".json":
        raise ValueError(
            "generate_proxy: procedural primitives must be written as .json; "
            "GLB export is reserved for non-parametric meshes"
        )
    entry = {
        "schema": "titin-procedural-proxy/1",
        "kind": "procedural_primitive",
        "primitive": primitive,
        "params_nm": fit_result["params_nm"],
        "fit_quality": fit_result["fit_quality"],
        "geometry_derived_from_coordinates": True,
        "coordinate_evidence_class": fit_result["coordinate_evidence_class"],
        "primitive_choice_evidence_class": fit_result["primitive_choice_evidence_class"],
        "does_not_claim": fit_result["does_not_claim"],
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=target.parent,
        prefix=f".{target.name}.", suffix=".tmp", delete=False,
    )
    try:
        with handle:
            json.dump(entry, handle, indent=2, sort_keys=True)
            handle.write("\n")
        os.replace(handle.name, target)
    except Exception:
        Path(handle.name).unlink(missing_ok=True)
        raise
    return entry


if __name__ == "__main__":
    raise SystemExit(
        "generate_proxy.py is a library entry point; call generate(fit_result, output.json)."
    )
