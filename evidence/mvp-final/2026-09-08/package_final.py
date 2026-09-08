"""Assemble and verify the exact distribution; its own identity stays outside the ZIP."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

here = Path(__file__).resolve().parent
root = here.parents[2]
manifest = json.loads((root / 'release/MANIFEST.json').read_text())
assert manifest['model_fingerprint'] == '7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6'
assert len(manifest['app_revision']) == 40 and not manifest['app_revision'].endswith('dirty')
archive = root.parent / f"titin-sarcomere-preview-2026-09-08-{manifest['app_revision'][:7]}.zip"
if archive.exists():
    raise FileExistsError(f'Refusing to overwrite {archive}')
stage_base = Path(tempfile.mkdtemp(prefix='titin-final-stage-'))
stage = stage_base / 'titin-sarcomere-preview'
stage.mkdir()
for name in ('index.html', 'LICENSE'):
    shutil.copy2(root / name, stage / name)
shutil.copytree(root / 'release', stage / 'release')
for name in ('SCIENTIST_NOTE.md', 'DELIVERY.md'):
    shutil.copy2(here / name, stage / name)
files = sorted(p.relative_to(stage) for p in stage.rglob('*') if p.is_file())
with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED) as z:
    for name in files:
        z.write(stage / name, Path(stage.name) / name)
extraction = Path(tempfile.mkdtemp(prefix='titin-final-extracted-'))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    z.extractall(extraction)
extracted = extraction / stage.name
actual = sorted(p.relative_to(extracted) for p in extracted.rglob('*') if p.is_file())
assert actual == files
for name in files:
    assert (stage / name).read_bytes() == (extracted / name).read_bytes(), name
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for row in [manifest['standalone'], *manifest['artifacts']]:
    p = (extracted / row['path']).resolve()
    p.relative_to(extracted.resolve())
    assert p.stat().st_size == row['bytes'], row['path']
    assert sha(p) == row['sha256'], row['path']
assert (extracted / 'release/MANIFEST.sha256').read_text().split()[0] == sha(extracted / 'release/MANIFEST.json')
result = subprocess.run(['node', 'scripts/verify_artifact_identity.mjs', '--file', str(extracted / 'index.html'), '--manifest', str(extracted / 'release/MANIFEST.json')], cwd=root, capture_output=True, text=True)
(here / 'extracted-identity.log').write_text(result.stdout + result.stderr)
assert result.returncode == 0, result.stderr
record = dict(archive=str(archive), zip_bytes=archive.stat().st_size, zip_sha256=sha(archive), staging=str(stage), extracted=str(extracted), file_count=len(files), manifest_entries_verified=1 + len(manifest['artifacts']), app_revision=manifest['app_revision'], model_fingerprint=manifest['model_fingerprint'], build_inputs_fingerprint=manifest['build_inputs_fingerprint'], index_sha256=sha(extracted/'index.html'), manifest_sha256=sha(extracted/'release/MANIFEST.json'), files=[dict(path=str(n), bytes=(extracted/n).stat().st_size, sha256=sha(extracted/n)) for n in files])
(here / 'package.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({k:v for k,v in record.items() if k != 'files'}, indent=2))
