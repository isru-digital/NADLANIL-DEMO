"""Put several captured screens side by side (top part only) for a quick look.
Usage: python scripts/sheet.py <out.png> <label> <screen> [<screen> ...] [--w 640] [--h 1100]
Screens are names like dashboard-d or home-m."""
import sys
from pathlib import Path

from PIL import Image

args = sys.argv[1:]
w, h = 640, 1100
if '--w' in args:
    i = args.index('--w')
    w = int(args[i + 1])
    del args[i:i + 2]
if '--h' in args:
    i = args.index('--h')
    h = int(args[i + 1])
    del args[i:i + 2]
out, label, names = args[0], args[1], args[2:]
tiles = []
for n in names:
    im = Image.open(Path('_visual') / label / f'{n}.png').convert('RGB')
    k = w / im.width
    im = im.resize((w, round(im.height * k)))
    tiles.append(im.crop((0, 0, w, min(h, im.height))))
sheet = Image.new('RGB', (w * len(tiles) + 16 * (len(tiles) - 1), max(t.height for t in tiles)), (90, 90, 90))
for i, t in enumerate(tiles):
    sheet.paste(t, (i * (w + 16), 0))
sheet.save(out)
print(sheet.size)
