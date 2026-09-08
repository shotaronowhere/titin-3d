"""Bind completed checks to the delivered ZIP and state incomplete coverage explicitly."""
from pathlib import Path
import hashlib, json, struct
here = Path(__file__).resolve().parent
load = lambda n: json.loads((here/n).read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
p, c, e, r, checks = [load(n) for n in ('package.json','scroll-corrected-frames/capture-index.json','exports.json','reproduction.json','final-check-results.json')]
coverage = load('coverage-decision.json')
assert r['byte_identical'] and all(x['exit_code'] == 0 for x in checks['results'] if x['name'] != 'webkit')
assert checks['app_revision'] == coverage['app_revision'] == p['app_revision']
assert coverage['webkit_status'] == 'not_verified'
assert next(x for x in checks['results'] if x['name'] == 'webkit')['exit_code'] != 0
assert sha(Path(p['archive'])) == p['zip_sha256']
assert c['index_sha256'] == e['index_sha256'] == p['index_sha256']
assert c['manifest_sha256'] == p['manifest_sha256']
assert len(c['frames']) == 22 and not c['errors'] and not c['non_file_requests']
assert all(x['layout']['status'] in ('resolved','hidden') for x in c['frames'])
assert not e['page_errors'] and len(e['states']) == 5
for state in e['states']:
    assert state['app_revision'] == p['app_revision'] and state['model_fingerprint'] == p['model_fingerprint']
    assert state['candidate_manifest_verified'] and state['claims_build_matches_state'] and len(state['files']) == 4
    for name,row in state['files'].items():
        path=here/'exports'/f"{state['sarcomere_length_nm']}-{name}"
        assert path.stat().st_size == row['bytes'] and sha(path) == row['sha256']
for row in p['files']:
    path=Path(p['extracted'])/row['path']
    assert path.stat().st_size == row['bytes'] and sha(path) == row['sha256']
expected={f'desktop-beat-{i}' for i in range(1,6)}|{f'desktop-{s}' for s in ('stretch-endpoint','force','evidence','source','scope')}
frames=[]
for path in sorted((here/'extracted-frames').glob('*.png')):
    width,height=struct.unpack('>II',path.read_bytes()[16:24])
    assert (width,height)==(1280,720)
    frames.append(dict(name=path.stem,width=width,height=height,sha256=sha(path)))
assert {f['name'] for f in frames} == expected
partial=dict(root=p['extracted'],index_sha256=p['index_sha256'],manifest_sha256=p['manifest_sha256'],frames=frames,core_route_completed=True,full_capture_completed=False,activation_method='DOM button/summary activation in the second extracted attempt. The first extracted attempt used native clicks and also retained ten desktop core-route frames.',termination='Architecture screenshot capture timed out. Phone and Architecture visual evidence comes from the earlier complete native-click capture of byte-identical standalone and manifest files.',page_errors_and_network_audit='Not retained from the interrupted capture. The complete byte-identical candidate capture and the extracted export run provide their separately recorded audits.')
(here/'extracted-frames/capture-index.json').write_text(json.dumps(partial,indent=2)+'\n')
(here/'PACKAGE.md').write_text(f'''# Verified distribution — September 8 candidate, finalized September 9, 2026 (JST)

The scientist-feedback preview is [{Path(p['archive']).name}]({p['archive']}). Use the **desktop Chrome/Firefox** preview route. This supersedes the September 6 archive. No external publication or recipient message was performed.

| Property | Verified value |
|---|---|
| ZIP bytes | {p['zip_bytes']:,} |
| ZIP SHA-256 | `{p['zip_sha256']}` |
| Application source | `{p['app_revision']}` |
| Model fingerprint, unchanged | `{p['model_fingerprint']}` |
| Build inputs | `{p['build_inputs_fingerprint']}` |
| Standalone SHA-256 | `{p['index_sha256']}` |
| Manifest SHA-256 | `{p['manifest_sha256']}` |

All **{p['file_count']} freshly extracted files** match staging bytes, and all **{p['manifest_entries_verified']} manifest entries** match their declared sizes and hashes. The detached manifest checksum and standalone identity verifier pass. A clean detached checkout with `npm ci` reproduced the standalone and complete release tree byte-for-byte. Exact inventories: [package.json](package.json), [reproduction.json](reproduction.json).

Completed frozen-candidate checks: **618 Node tests, 85 integrated Chromium checks, 2 Chromium keyboard/touch checks, and 34 Firefox checks**. WebKit verification remains **incomplete** after two timeout-stalled runs. The final plan's section 9.C permits this two-engine coverage fallback; no verified WebKit support is claimed. Logs and both sets of traces are retained. No application assertion or timeout was weakened. See [coverage-decision.json](coverage-decision.json) and [final-check-results.json](final-check-results.json).

The complete offline visual review contains **22 native-click captures**, at 1280×720 and 390×844, covering all five Tour beats, Stretch entry/endpoint, force, evidence, an expanded source, Scope, and Architecture. **The raw standalone and manifest hashes match this ZIP exactly.** That capture reports resolved/hidden overlay layouts, zero page errors, and zero non-file requests. All 22 images were inspected. See [capture-index.json](scroll-corrected-frames/capture-index.json) and [visual review](candidate-visual-review.json).

The extracted ZIP's core desktop route was also exercised directly over `file://`: all five Tour beats, Stretch endpoint, force, final evidence action, an expanded source, and Scope. **Ten new desktop images** are retained in [extracted capture record](extracted-frames/capture-index.json). Native input automation stalled during the first extracted capture; a second capture using DOM activation completed the same core route, then timed out taking the Architecture screenshot. Thus **a complete fresh extracted phone/Architecture screenshot set is not claimed**; those visuals are covered by the earlier complete review of identical bytes. The two capture failure logs and first-attempt images remain in the evidence directory. This is automated and AI visual review, not independent human usability or physical-device evidence.

All four research exports were downloaded from the extracted candidate at **2000, 2200, 2400, 2450, and 1900 nm**: **20 verified files**. Identity and regime checks pass. The first three states are supported, 2450 nm is extrapolated, and 1900 nm is not evaluated with blank force cells. After one download timed out, three complete states were preserved and revalidated; the two unfinished states were downloaded in a fresh browser. No timeout was changed. See [exports.json](exports.json), `offline-export-first-attempt.log`, and `offline-export-resume.log`.

The packaged [delivery record](DELIVERY.md) and [researcher guide](SCIENTIST_NOTE.md) give the recommended route, candidate identity, and biological limits. `release_ready` remains false; independent scientific validation and human usability review are pending. The next step is feedback on this bounded preview. This external record carries the ZIP hash and subsequent rehearsal results without modifying the archive or creating a self-referential hash.
''')
print('Package record written: exact bytes, completed checks, and incomplete coverage explicitly bound.')
