#!/usr/bin/env python3
"""Normalize a downloaded UniProt JSON record into the pinned SC-19 snapshot.

This command never fetches a service. The full upstream response is an explicit
input, and its byte digest is retained so a later release or sequence change is
necessarily a new reviewed import.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path
from typing import Any

from scientific_common import sha256_bytes, sha256_payload


NORMALIZED_TYPES = {
    "Domain": "DOMAIN",
    "Alternative sequence": "VAR_SEQ",
    "Natural variant": "VARIANT",
    "Sequence conflict": "CONFLICT",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="downloaded UniProt JSON record")
    parser.add_argument("--isoform", required=True, help="exact UniProt isoform ID, e.g. Q8WZ42-1")
    parser.add_argument("--output", type=Path, required=True, help="normalized snapshot path")
    parser.add_argument("--source-release", help="release header recorded with the download")
    parser.add_argument("--source-release-date", help="YYYY-MM-DD release header recorded with the download")
    parser.add_argument("--retrieved-on", help="YYYY-MM-DD retrieval date (defaults to today)")
    return parser.parse_args()


def location(feature: dict[str, Any]) -> tuple[int, int]:
    loc = feature.get("location") or {}
    start = (loc.get("start") or {}).get("value")
    end = (loc.get("end") or {}).get("value")
    if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start:
        raise ValueError(f"feature has invalid inclusive coordinates: {feature!r}")
    if (loc.get("start") or {}).get("modifier") != "EXACT" \
            or (loc.get("end") or {}).get("modifier") != "EXACT":
        raise ValueError(f"feature has non-exact coordinates: {feature!r}")
    return start, end


def generated_domain_id(feature: dict[str, Any], start: int, end: int) -> str:
    label = re.sub(r"[^A-Za-z0-9]+", "-", feature.get("description") or "domain").strip("-")
    return f"DOMAIN:{label}:{start}-{end}"


def normalized_feature(feature: dict[str, Any], normalized_type: str) -> dict[str, Any]:
    start, end = location(feature)
    upstream_id = feature.get("featureId")
    feature_id = upstream_id or generated_domain_id(feature, start, end)
    row: dict[str, Any] = {
        "id": feature_id,
        "upstream_feature_id": upstream_id,
        "id_origin": "upstream" if upstream_id else "deterministic_generated",
        "type": normalized_type,
        "start": start,
        "end": end,
        "length_aa": end - start + 1,
        "label": feature.get("description") or normalized_type,
        "locator": f"UniProt {normalized_type} feature {upstream_id or f'{start}-{end}'}",
    }
    if feature.get("alternativeSequence") is not None:
        alt = feature.get("alternativeSequence") or {}
        row["original_sequence"] = alt.get("originalSequence")
        row["alternative_sequences"] = alt.get("alternativeSequences") or []
    if feature.get("evidences"):
        row["evidence_locators"] = [
            {
                "code": item.get("evidenceCode"),
                "source": item.get("source"),
                "id": item.get("id"),
            }
            for item in feature["evidences"]
        ]
    return row


def isoform_record(upstream: dict[str, Any], isoform_id: str) -> dict[str, Any]:
    matches = []
    for comment in upstream.get("comments") or []:
        if comment.get("commentType") != "ALTERNATIVE PRODUCTS":
            continue
        for isoform in comment.get("isoforms") or []:
            if isoform_id in (isoform.get("isoformIds") or []):
                matches.append(isoform)
    if len(matches) != 1:
        raise ValueError(f"expected one upstream definition for {isoform_id}, found {len(matches)}")
    return matches[0]


def normalize(raw: bytes, isoform_id: str, *, source_release: str | None,
              source_release_date: str | None, retrieved_on: str) -> dict[str, Any]:
    upstream = json.loads(raw)
    accession = upstream.get("primaryAccession")
    if isoform_id.split("-")[0] != accession:
        raise ValueError(f"isoform {isoform_id} does not belong to upstream record {accession}")
    isoform = isoform_record(upstream, isoform_id)
    if isoform.get("isoformSequenceStatus") != "Displayed":
        raise ValueError(f"{isoform_id} is not the displayed reference sequence")

    sequence = upstream.get("sequence") or {}
    audit = upstream.get("entryAudit") or {}
    sequence_value = sequence.get("value")
    if not isinstance(sequence_value, str) or len(sequence_value) != sequence.get("length"):
        raise ValueError("upstream sequence value/length is absent or inconsistent")
    if not isinstance(audit.get("sequenceVersion"), int) or not isinstance(audit.get("entryVersion"), int):
        raise ValueError("upstream sequenceVersion and entryVersion are required")

    buckets: dict[str, list[dict[str, Any]]] = {
        "features": [], "alternative_sequences": [], "variants": [], "conflicts": [],
    }
    target = {"DOMAIN": "features", "VAR_SEQ": "alternative_sequences",
              "VARIANT": "variants", "CONFLICT": "conflicts"}
    excluded: dict[str, int] = {}
    for feature in upstream.get("features") or []:
        upstream_type = feature.get("type")
        normalized_type = NORMALIZED_TYPES.get(upstream_type)
        if normalized_type:
            buckets[target[normalized_type]].append(normalized_feature(feature, normalized_type))
        else:
            excluded[upstream_type or "(missing type)"] = excluded.get(upstream_type or "(missing type)", 0) + 1

    for rows in buckets.values():
        rows.sort(key=lambda row: (row["start"], row["end"], row["id"]))
        ids = [row["id"] for row in rows]
        if len(ids) != len(set(ids)):
            raise ValueError("normalized feature IDs are not unique within a typed list")

    mapping_applied = isoform_id != f"{accession}-1" or isoform.get("isoformSequenceStatus") != "Displayed"
    if mapping_applied:
        raise ValueError("non-canonical isoform mapping is not implemented; refuse rather than guess offsets")

    result = {
        "schema": "titin-sequence-features/1",
        "source": {
            "provider": "UniProtKB",
            "record": accession,
            "isoform_id": isoform_id,
            "sequence_version": audit["sequenceVersion"],
            "entry_version": audit["entryVersion"],
            "coordinate_frame": "canonical",
            "url": f"https://www.uniprot.org/uniprotkb/{accession}/entry",
            "api_url": f"https://rest.uniprot.org/uniprotkb/{accession}.json",
            "license": "CC BY 4.0",
            "release": source_release,
            "release_date": source_release_date or audit.get("lastAnnotationUpdateDate"),
            "release_or_retrieved_on": source_release_date or retrieved_on,
            "retrieved_on": retrieved_on,
            "upstream_sha256": sha256_bytes(raw),
            "sequence_sha256": sha256_bytes(sequence_value.encode("ascii")),
            "sequence_crc64": sequence.get("crc64"),
        },
        "sequence_length_aa": sequence["length"],
        **buckets,
        "isoform_mapping": {
            "applied": False,
            "var_seq_feature_ids": [],
            "offset_table": [],
            "reason": f"{isoform_id} is the displayed canonical sequence; upstream coordinates are retained",
        },
        "excluded_feature_types": [
            {"type": key, "count": excluded[key]} for key in sorted(excluded)
        ],
        "region_policy_decision_id": "SD-01",
    }
    result["normalized_payload_sha256"] = sha256_payload(result)
    return result


def main() -> None:
    args = parse_args()
    retrieved_on = args.retrieved_on or date.today().isoformat()
    result = normalize(
        args.input.read_bytes(),
        args.isoform,
        source_release=args.source_release,
        source_release_date=args.source_release_date,
        retrieved_on=retrieved_on,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"wrote {args.output}: {len(result['features'])} domains, "
        f"{len(result['alternative_sequences'])} VAR_SEQ, {len(result['variants'])} VARIANT, "
        f"{len(result['conflicts'])} CONFLICT"
    )


if __name__ == "__main__":
    main()
