"""Builds the green logo files from public/logo.png (the gold mark).

The shading of the mark is kept: each pixel's brightness is mapped onto an emerald ramp,
so the mark reads on white (dark edge, mid body) and on the green hero (light highlights).
Outputs: public/logo-green.png, public/logo-white.png, public/favicon-green.png, public/apple-touch-icon-green.png
"""
from pathlib import Path
import numpy as np
from PIL import Image

PUB = Path(__file__).resolve().parent.parent / 'public'
src = Image.open(PUB / 'logo.png').convert('RGBA')
arr = np.array(src).astype(float)
rgb, alpha = arr[..., :3], arr[..., 3]
lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255.0

# normalise the brightness of the visible pixels to 0..1
vis = alpha > 40
lo, hi = np.percentile(lum[vis], 2), np.percentile(lum[vis], 98)
t = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1)

# emerald ramp, dark to light
stops = [
    (0.00, (6, 78, 52)),
    (0.45, (14, 150, 98)),
    (0.78, (34, 197, 126)),
    (1.00, (110, 231, 183)),
]
xs = [s[0] for s in stops]
out = np.zeros(rgb.shape)
for c in range(3):
    out[..., c] = np.interp(t, xs, [s[1][c] for s in stops])
res = Image.fromarray(np.dstack([out, alpha]).astype('uint8'), 'RGBA')
res.save(PUB / 'logo-green.png', optimize=True)

# white version for the green hero and closing panel: same shading as transparency over white
wt = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1)
white_alpha = alpha * (0.62 + 0.38 * wt)
white = Image.fromarray(np.dstack([np.full(rgb.shape, 255.0), white_alpha]).astype('uint8'), 'RGBA')
white.save(PUB / 'logo-white.png', optimize=True)


def tile(size, ratio, bg):
    k = size * ratio / max(res.size)
    m = res.resize((round(res.width * k), round(res.height * k)), Image.LANCZOS)
    c = Image.new('RGBA', (size, size), bg)
    c.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return c


FOREST = (7, 59, 42, 255)
tile(64, 0.78, FOREST).save(PUB / 'favicon-green.png', optimize=True)
tile(180, 0.66, FOREST).convert('RGB').save(PUB / 'apple-touch-icon-green.png', optimize=True)
print(res.size, (PUB / 'logo-green.png').stat().st_size)
