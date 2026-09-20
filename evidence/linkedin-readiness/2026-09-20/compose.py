"""Compose only real captured frames; no generated molecular detail or geometry edits.
Requires Pillow (capture/composition tooling only; not an application dependency).
Run with a Python that has Pillow installed, from any working directory.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont, __version__ as pillow_version

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FONT_DIR = Path('/System/Library/Fonts/Supplemental')
REGULAR = FONT_DIR / 'Arial.ttf'
BOLD = FONT_DIR / 'Arial Bold.ttf'
BG, FG, DIM, PINK = '#0e1116', '#e6ebf1', '#a9b7c7', '#ffb0c0'

def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else REGULAR), size)

def output(image, path):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)
    data = path.read_bytes()
    return {'path': str(path.relative_to(ROOT)), 'dimensions': list(image.size),
            'mode': image.mode, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

records = []
# One unmodified molecular close-up, cropped to remove chrome and uniformly resized.
source = Image.open(HERE / 'raw/architecture.png').convert('RGB')
source_crop = (0, 175, 1280, 397)
for width, height, name in [(1200, 630, 'linkedin'), (1280, 640, 'github')]:
    image = Image.new('RGB', (width, height), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((48, 40, 56, 111), radius=4, fill=PINK)
    draw.text((76, 35), 'Titin-3D', fill=FG, font=font(68, True))
    draw.text((48, 128), 'Explore muscle structure and stretch', fill=FG, font=font(40))
    crop = source.crop(source_crop)
    placed_width = width - 96
    placed_height = round(crop.height * placed_width / crop.width)
    image.paste(crop.resize((placed_width, placed_height), Image.Resampling.LANCZOS), (48, 220))
    draw.text((48, 446), 'Stretch the model. Inspect its scientific sources.', fill=DIM, font=font(29))
    draw.text((48, height - 99), 'Educational research preview', fill=PINK, font=font(32, True))
    draw.text((48, height - 53), 'Representative, partly schematic view', fill=DIM, font=font(24))
    record = output(image, f'assets/social/titin-3d-{name}-v1.png')
    assert record['bytes'] < 1_000_000
    record['composition'] = {'source': 'raw/architecture.png', 'crop_xyxy': source_crop,
        'uniform_resize_to': [placed_width, placed_height], 'paste_xy': [48, 220],
        'operations': 'Opaque canvas, cropped real frame, uniform resize, editorial text. No scale bar or force value in this crop.'}
    records.append(record)
    image.resize((320, round(height * 320 / width)), Image.Resampling.LANCZOS).save(HERE / f'{name}-thumbnail.png')

# Preserve the exact same crop and scale at each endpoint, aligned vertically.
comparison = Image.new('RGB', (1280, 550), BG)
draw = ImageDraw.Draw(comparison)
crop_box = (90, 93, 1240, 202)
for length, y in [(2000, 32), (2400, 252)]:
    draw.text((48, y), f'{length:,} nm sarcomere length', fill=FG, font=font(31, True))
    frame = Image.open(HERE / f'raw/spring-{length}.png').convert('RGB')
    comparison.paste(frame.crop(crop_box), (65, y + 57))
    if length == 2000:
        draw.line((48, 228, 1232, 228), fill='#2b3440', width=1)
draw.text((48, 464), 'The I-band extends while the A-band span stays fixed in this model.', fill=FG, font=font(27))
draw.text((48, 507), 'Same camera and scale · Educational research preview', fill=DIM, font=font(23))
record = output(comparison, 'docs/media/titin-stretch-comparison.png')
record['composition'] = {'sources': ['raw/spring-2000.png', 'raw/spring-2400.png'],
    'crop_xyxy_each': crop_box, 'resize': 'none', 'paste_xy_each': [[65, 89], [65, 309]],
    'operations': 'Two real endpoint frames with identical crop, camera, zoom and pixel scale; editorial labels and caption. Not a single raw screenshot.'}
records.append(record)
(HERE / 'media.json').write_text(json.dumps({'tool': f'Pillow {pillow_version}',
    'font_files': [str(REGULAR), str(BOLD)], 'outputs': records}, indent=2) + '\n')
print(json.dumps(records, indent=2))
