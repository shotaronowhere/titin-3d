#!/usr/bin/env python3
"""Fetch and byte-verify every Phase-6/7 structural source input.

Raw coordinate files are an offline scientific cache, not browser assets and not
Git payload. ``data/structures/manifest.json`` is tracked and pins each URL,
SHA-256 digest, byte count, provider, and downstream consumer. A clean checkout
can therefore reproduce the exact inputs; an upstream byte change fails loudly.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile
import urllib.request

APP = Path(__file__).resolve().parent.parent
CACHE = APP / "data" / "structures"
MANIFEST = CACHE / "manifest.json"


def digest(path):
    h = hashlib.sha256()
    size = 0
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
            size += len(block)
    return h.hexdigest(), size


def download(url, directory):
    request = urllib.request.Request(url, headers={"User-Agent": "titin-visualization/0.3"})
    handle = tempfile.NamedTemporaryFile(dir=directory, prefix=".download-", delete=False)
    try:
        with handle, urllib.request.urlopen(request, timeout=180) as response:
            while True:
                block = response.read(1024 * 1024)
                if not block:
                    break
                handle.write(block)
        return Path(handle.name)
    except Exception:
        Path(handle.name).unlink(missing_ok=True)
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="verify the complete local cache without downloading")
    parser.add_argument("--update-manifest", action="store_true",
                        help="fill only null hashes/byte counts (initial pinning)")
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    CACHE.mkdir(parents=True, exist_ok=True)
    changed = False
    failures = []
    for entry in manifest["files"]:
        target = CACHE / entry["file"]
        if not target.is_file():
            if args.check:
                failures.append(f"missing {entry['file']}")
                continue
            temporary = download(entry["url"], CACHE)
            got_hash, got_bytes = digest(temporary)
            expected = entry.get("sha256")
            if expected and got_hash != expected:
                temporary.unlink(missing_ok=True)
                failures.append(
                    f"{entry['file']}: upstream bytes changed: expected {expected}, got {got_hash}"
                )
                continue
            os.replace(temporary, target)
        got_hash, got_bytes = digest(target)
        expected = entry.get("sha256")
        expected_bytes = entry.get("bytes")
        if expected is None or expected_bytes is None:
            if not args.update_manifest:
                failures.append(
                    f"{entry['file']}: manifest is not pinned; run --update-manifest once and review"
                )
                continue
            entry["sha256"], entry["bytes"] = got_hash, got_bytes
            changed = True
        elif got_hash != expected or got_bytes != expected_bytes:
            failures.append(
                f"{entry['file']}: expected sha256={expected}, bytes={expected_bytes}; "
                f"got sha256={got_hash}, bytes={got_bytes}"
            )
    if failures:
        raise SystemExit("structural source verification failed:\n  " + "\n  ".join(failures))
    if changed:
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"structural sources: {len(manifest['files'])} files verified"
          + ("; manifest pinned" if changed else ""))


if __name__ == "__main__":
    main()
