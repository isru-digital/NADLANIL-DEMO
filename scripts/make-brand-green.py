"""Builds the NadlanUP brand files of the green version from the supplied logo picture
(scripts/assets/nadlanup-logo-source.webp: the logo on a dark green background).

The background is removed by un-mixing every pixel against a smooth model of the background, so the
anti-aliased edges stay clean. Two colours are kept: the logo's green and its white. For light pages the white
parts (the "adlan", the arrow and the slogan) are redrawn in a deep forest ink; the green stays as it is.

Outputs in public/brand/:
  nadlanup-dark.png          the wordmark for dark or green backgrounds
  nadlanup-light.png         the wordmark for white or light backgrounds
  nadlanup-lockup-dark.png   the wordmark with the slogan, for dark backgrounds
  nadlanup-lockup-light.png  the wordmark with the slogan, for light backgrounds
  nadlanup-ongreen.png       the wordmark with a mint green, for green backgrounds (the hero, the closing panel)
  nadlanup-lockup-ongreen.png  the same with the slogan
and public/favicon-green.png, public/apple-touch-icon-green.png (the green N), public/og-green.jpg (share card).
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'scripts' / 'assets' / 'nadlanup-logo-source.webp'
OUT = ROOT / 'public' / 'brand'
OUT.mkdir(parents=True, exist_ok=True)

im = Image.open(SRC).convert('RGB')
X0, X1, Y0, Y1 = 200, 1830, 700, 1300
crop = np.asarray(im.crop((X0, Y0, X1, Y1))).astype(float)
h, w, _ = crop.shape

# --- which pixels are clearly logo (used to leave them out of the background model)
white_like = crop.min(axis=2) > 120
green_like = (crop[..., 1] > 110) & (crop[..., 0] < 125) & (crop[..., 1] - crop[..., 0] > 40)
fg_like = white_like | green_like
# grow it a little so halos and shadows are not mistaken for background
pad = np.pad(fg_like, 9)
grown = np.zeros_like(fg_like)
for dy in range(-9, 10, 3):
    for dx in range(-9, 10, 3):
        grown |= pad[9 + dy : 9 + dy + h, 9 + dx : 9 + dx + w]
bgm = ~grown

# --- the background: a plane (a smooth gradient) fitted to the clear background pixels, per channel
yy, xx = np.mgrid[0:h, 0:w]
A = np.stack([np.ones(bgm.sum()), xx[bgm] / w, yy[bgm] / h, (xx[bgm] / w) * (yy[bgm] / h), (xx[bgm] / w) ** 2, (yy[bgm] / h) ** 2], axis=1)
full = np.stack([np.ones(h * w), xx.ravel() / w, yy.ravel() / h, (xx.ravel() / w) * (yy.ravel() / h), (xx.ravel() / w) ** 2, (yy.ravel() / h) ** 2], axis=1)
bg = np.zeros_like(crop)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, crop[..., c][bgm], rcond=None)
    bg[..., c] = (full @ coef).reshape(h, w)

# --- the logo's two colours, measured from the picture itself
core_green = green_like & (crop[..., 1] > 135)
GREEN = np.median(crop[core_green], axis=0)
WHITE = np.median(crop[crop.min(axis=2) > 235], axis=0)
print('green', GREEN.round(), 'white', WHITE.round())

# --- un-mix: each pixel is background + alpha x (colour - background), for the better fitting colour
def unmix(color):
    d = color - bg
    a = np.clip(((crop - bg) * d).sum(axis=2) / np.maximum((d * d).sum(axis=2), 1), 0, 1)
    resid = np.linalg.norm(crop - (bg + a[..., None] * d), axis=2)
    return a, resid


aw, rw = unmix(WHITE)
ag, rg = unmix(GREEN)
use_white = rw <= rg
alpha = np.where(use_white, aw, ag)
alpha[alpha < 0.05] = 0
alpha = np.clip((alpha - 0.05) / 0.95, 0, 1)
is_white = use_white & (alpha > 0)


def render(white_color, green_color=None):
    rgb = np.where(is_white[..., None], np.array(white_color, dtype=float), GREEN if green_color is None else np.array(green_color, dtype=float))
    return np.dstack([rgb, alpha * 255]).astype('uint8')


INK = (11, 42, 31)
MINT = (159, 240, 201)  # the logo's green, lightened so it still reads on a green background
dark = render(WHITE)
light = render(INK)
ongreen = render(WHITE, MINT)

# --- where the slogan starts: the empty rows between the wordmark and the slogan
rows = (alpha > 0.1).sum(axis=1)
ys = np.where(rows > 0)[0]
top, bottom = ys.min(), ys.max()
empty = [y for y in range(top, bottom) if rows[y] == 0]
gap = [y for y in empty if y > top + 200]
split = gap[0] if gap else bottom
print('wordmark rows', top, split, 'slogan to', bottom)
cols = np.where((alpha > 0.1).sum(axis=0) > 0)[0]
left, right = cols.min(), cols.max()
PAD = 14


def save(arr, name, y0, y1, width=1000):
    piece = Image.fromarray(arr[max(y0 - PAD, 0) : y1 + PAD, max(left - PAD, 0) : right + PAD], 'RGBA')
    k = width / piece.width
    piece = piece.resize((width, round(piece.height * k)), Image.LANCZOS)
    piece.save(OUT / name, optimize=True)
    print(name, piece.size, (OUT / name).stat().st_size // 1024, 'KB')


save(dark, 'nadlanup-dark.png', top, split)
save(light, 'nadlanup-light.png', top, split)
save(dark, 'nadlanup-lockup-dark.png', top, bottom)
save(light, 'nadlanup-lockup-light.png', top, bottom)
save(ongreen, 'nadlanup-ongreen.png', top, split)
save(ongreen, 'nadlanup-lockup-ongreen.png', top, bottom)

# --- the green N for the browser tab and the phone's home screen
n_cols = (alpha > 0.3) & ~is_white
n_cols[:, 330:] = False  # the N is the leftmost glyph
nys, nxs = np.where(n_cols)
glyph = Image.fromarray(render(WHITE)[nys.min() : nys.max() + 1, nxs.min() : nxs.max() + 1], 'RGBA')
FOREST = (7, 59, 42, 255)


def tile(size, ratio, name, rgb=False):
    k = size * ratio / max(glyph.size)
    g = glyph.resize((round(glyph.width * k), round(glyph.height * k)), Image.LANCZOS)
    c = Image.new('RGBA', (size, size), FOREST)
    c.alpha_composite(g, ((size - g.width) // 2, (size - g.height) // 2))
    (c.convert('RGB') if rgb else c).save(ROOT / 'public' / name, optimize=True)


tile(64, 0.6, 'favicon-green.png')
tile(180, 0.5, 'apple-touch-icon-green.png', rgb=True)

# --- the share card: the supplied picture itself, cut to the wide share shape
share = im.crop((0, 435, 2000, 1485)).resize((1200, 630), Image.LANCZOS)
share.save(ROOT / 'public' / 'og-green.jpg', quality=88, optimize=True)
print('favicon, apple icon and share card written')
