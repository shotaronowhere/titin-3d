"""Audit this presentation package with Python's standard library; run from any cwd."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import hashlib
import json
import re
import struct

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.title = False
        self.titles = []
        self.meta = {}
        self.links = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'head': self.in_head = True
        if not self.in_head: return
        if tag == 'title': self.title = True; self.titles.append('')
        if tag == 'meta':
            key = a.get('property', a.get('name'))
            if key: self.meta.setdefault(key, []).append(a.get('content'))
        if tag == 'link': self.links.append(a)
    def handle_endtag(self, tag):
        if tag == 'head': self.in_head = False
        if tag == 'title': self.title = False
    def handle_data(self, data):
        if self.title: self.titles[-1] += data

head = Head()
head.feed((ROOT/'index.html').read_text())
expected_title = 'Titin-3D | Explore muscle structure and stretch'
assert head.titles == [expected_title]
keys = ['description', 'og:type', 'og:title', 'og:description', 'og:url', 'og:image',
        'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card',
        'twitter:title', 'twitter:description', 'twitter:image']
for key in keys:
    assert len(head.meta[key]) == 1 and head.meta[key][0], key
canonical = [a['href'] for a in head.links if a.get('rel') == 'canonical']
assert canonical == ['https://shotaronowhere.github.io/titin-3d/']
assert head.meta['og:url'] == canonical
assert head.meta['og:title'] == head.meta['twitter:title'] == [expected_title]
assert head.meta['og:type'] == ['website']
assert head.meta['twitter:card'] == ['summary_large_image']
assert head.meta['og:image'] == head.meta['twitter:image']
image_url = head.meta['og:image'][0]
assert image_url == 'https://shotaronowhere.github.io/titin-3d/assets/social/titin-3d-linkedin-v1.png'
for url in canonical + [image_url]:
    p = urlparse(url)
    assert p.scheme == 'https' and p.netloc == 'shotaronowhere.github.io'
    assert p.path.startswith('/titin-3d/') and not p.fragment
assert not any(a.get('rel') in ('preload', 'prefetch') for a in head.links)
body = (ROOT/'index.html').read_text().split('</head>', 1)[1]
assert image_url not in body, 'social image must remain a metadata reference'
media = json.loads((HERE/'media.json').read_text())
for row in media['outputs']:
    path = ROOT/row['path']
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert list(struct.unpack('>II', data[16:24])) == row['dimensions']
    assert data[25] == 2, 'social/comparison image must be opaque RGB'
    assert sha(path) == row['sha256'] and len(data) == row['bytes']
    assert 0 < len(data) < 1_000_000
assert media['outputs'][0]['dimensions'] == [int(head.meta['og:image:width'][0]), int(head.meta['og:image:height'][0])]
assert media['outputs'][1]['dimensions'] == [1280, 640]
captures = json.loads((HERE/'captures.json').read_text())
assert captures['html_sha256'] == sha(ROOT/'index.html')
assert captures['identity']['model_fingerprint'] == '7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6'
for row in captures['captures']:
    assert sha(HERE/row['filename']) == row['sha256']
assert json.loads((ROOT/'data/release_gates.json').read_text())['release_ready'] is False
links = []
for file in ['README.md', 'docs/DEVELOPMENT.md']:
    path = ROOT/file
    text = path.read_text()
    for target in re.findall(r'\]\(([^\s)]+)\)', text):
        url = urlparse(target)
        if url.scheme: continue
        dest = (path.parent/unquote(url.path)).resolve()
        assert dest.exists(), f'{file}: missing {target}'
        if url.fragment:
            # New docs use only simple ASCII GitHub heading anchors.
            headings = re.findall(r'^#+ (.+)$', dest.read_text(), re.M)
            ids = [re.sub(r'[^\w -]', '', h.lower()).replace(' ', '-') for h in headings]
            assert unquote(url.fragment) in ids, f'{file}: missing fragment {target}'
        links.append({'from': file, 'target': target})
result = {'html_sha256': sha(ROOT/'index.html'), 'static_head': 'pass',
          'metadata_tags': len(keys), 'canonical': canonical[0], 'image': image_url,
          'images': 'dimensions, RGB, size and hashes pass', 'capture_candidate_match': True,
          'local_links_checked': len(links), 'local_links': links, 'release_ready': False}
(HERE/'package-audit.json').write_text(json.dumps(result, indent=2)+'\n')
print(f"Static head, {len(media['outputs'])} images, capture identity, and {len(links)} local links passed")
