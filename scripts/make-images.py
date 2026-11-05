"""Converts the raw generated demo images to web-sized WebP files in public/img
and builds a contact sheet + og.jpg. Usage: python scripts/make-images.py <raw_dir> <sheet_out>"""
import sys
from pathlib import Path
from PIL import Image

RAW = Path(sys.argv[1]); SHEET = Path(sys.argv[2])
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'img'; OUT.mkdir(parents=True, exist_ok=True)

thumbs = []
for p in sorted(RAW.glob('*.png')):
    im = Image.open(p).convert('RGB')
    w = 640 if p.stem.startswith('broker') else (2000 if p.stem == 'skyline' else 1400)
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(OUT / f'{p.stem}.webp', 'WEBP', quality=80, method=6)
    t = im.copy(); t.thumbnail((360, 360)); thumbs.append((p.stem, t))
    print(p.stem, im.size, (OUT / f'{p.stem}.webp').stat().st_size // 1024, 'KB')

cols = 5; cell = 370
rows = -(-len(thumbs) // cols)
sheet = Image.new('RGB', (cols * cell, rows * cell), (20, 27, 52))
for i, (_, t) in enumerate(thumbs):
    sheet.paste(t, ((i % cols) * cell + 5, (i // cols) * cell + 5))
sheet.save(SHEET, quality=80)

# og image: skyline darkened with the logo mark centred
sky = Image.open(RAW / 'skyline.png').convert('RGB').resize((1200, 675), Image.LANCZOS).crop((0, 22, 1200, 652))
dark = Image.new('RGB', sky.size, (10, 15, 32))
og = Image.blend(sky, dark, 0.55).convert('RGBA')
logo = Image.open(ROOT / 'public' / 'logo.png')
k = 300 / logo.width
logo = logo.resize((300, round(logo.height * k)), Image.LANCZOS)
og.alpha_composite(logo, ((1200 - logo.width) // 2, (630 - logo.height) // 2))
og.convert('RGB').save(ROOT / 'public' / 'og.jpg', quality=84)
