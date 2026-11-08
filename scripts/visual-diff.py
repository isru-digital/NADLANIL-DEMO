"""Compare two visual captures (scripts/visual.mjs) screen by screen.
Usage: python scripts/visual-diff.py <labelA> <labelB> [--tolerance 8]
Prints, per screen, the share of pixels that differ by more than the tolerance (0-255 per channel)
and writes a highlighted difference image next to the captures when something changed."""
import sys
from pathlib import Path

from PIL import Image, ImageChops

a, b = sys.argv[1], sys.argv[2]
tol = 8
if '--tolerance' in sys.argv:
    tol = int(sys.argv[sys.argv.index('--tolerance') + 1])
root = Path('_visual')
bad = 0
for fa in sorted((root / a).glob('*.png')):
    fb = root / b / fa.name
    if not fb.exists():
        print(f'MISSING  {fa.name}')
        bad += 1
        continue
    ia, ib = Image.open(fa).convert('RGB'), Image.open(fb).convert('RGB')
    if ia.size != ib.size:
        print(f'SIZE     {fa.name}  {ia.size} -> {ib.size}')
        bad += 1
        continue
    diff = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v > tol else 0)
    n = sum(1 for v in diff.getdata() if v)
    share = 100 * n / (ia.width * ia.height)
    flag = 'OK      ' if share < 0.02 else 'CHANGED '
    if share >= 0.02:
        bad += 1
        out = root / f'diff-{a}-{b}'
        out.mkdir(exist_ok=True)
        Image.merge('RGB', (diff, Image.new('L', ia.size, 0), Image.new('L', ia.size, 0))).save(out / fa.name)
    print(f'{flag} {fa.name:28s} {share:6.3f}% differ')
print('identical' if bad == 0 else f'{bad} screens differ')
