"""Builds public/logo.png (gold mark only, transparent) from the supplied logo file.

The mark pixels are cropped from the original artwork, never redrawn. The white
background is removed by un-mixing each pixel against white.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / 'public'
MARK_ROWS = (0, 625)   # rows above the Hebrew wordmark
SKIP_LEFT = 40         # faint grey stripe on the source's left edge

im = Image.open(SRC).convert('RGB')
arr = np.array(im).astype(float)
ink = arr.min(axis=2) < 235
ink[:, :SKIP_LEFT] = False
ys, xs = np.where(ink[MARK_ROWS[0]:MARK_ROWS[1]])
pad = 6
x0, x1 = xs.min() - pad, xs.max() + pad
y0, y1 = ys.min() - pad, ys.max() + pad
crop = arr[y0:y1 + 1, x0:x1 + 1]

# alpha from the blue channel: white = 255, gold highlights stay well below 190
alpha = np.clip((255 - crop[..., 2]) / 70.0, 0, 1)
a = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((crop - (1 - a) * 255) / a, 0, 255)
rgba = np.dstack([rgb, alpha * 255]).astype('uint8')
mark = Image.fromarray(rgba, 'RGBA')
mark.save(OUT / 'logo.png', optimize=True)

def tile(size, ratio, bg):
    k = size * ratio / max(mark.size)
    m = mark.resize((round(mark.width * k), round(mark.height * k)), Image.LANCZOS)
    c = Image.new('RGBA', (size, size), bg)
    c.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return c

NAVY = (20, 27, 52, 255)
tile(64, 0.78, NAVY).save(OUT / 'favicon.png', optimize=True)
tile(180, 0.66, NAVY).convert('RGB').save(OUT / 'apple-touch-icon.png', optimize=True)
print(mark.size, (OUT / 'logo.png').stat().st_size)
