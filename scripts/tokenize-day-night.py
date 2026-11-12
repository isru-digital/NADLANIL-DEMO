"""One-time pass (12.11.2026) that prepared the green styles for a night mode.

The green look was written with literal white surfaces and literal deep-green hero gradients. This replaces them
with tokens, so styles/day-night.css can give them other values at night:
  background: #fff            -> var(--card)        (a surface that follows the mode)
  #043b2b / #07643f / #0fa46b -> var(--deep-a/b/c)  (inside gradients: the dark green of heroes and banners)
A white surface stays literal when its rule also fixes a dark text colour (a white pill that sits on dark green and
must stay white in both modes), or when the white is part of a gradient clipped to text.
Safe to run again: it only touches literals that are still there. Prints what it changed.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'src' / 'styles'
FILES = ['theme-green.css', 'home-green.css', 'join-green.css', 'agent.css', 'office.css', 'tiers.css', 'upgrade.css', 'about.css', 'member.css', 'green-actions.css']
WHITE = re.compile(r'#fff(?:fff)?\b', re.I)
DEEP = {'#043b2b': 'var(--deep-a)', '#07643f': 'var(--deep-b)', '#0fa46b': 'var(--deep-c)'}


def dark(hex_):
    h = hex_.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140


def fix_block(m):
    head, body = m.group(1), m.group(2)
    fixed_dark_text = any(dark(c) for c in re.findall(r'(?<![-\w])color:\s*(#[0-9a-f]{3,6})\b', body, re.I))
    clipped = 'background-clip: text' in body
    out = []
    for decl in body.split(';'):
        prop = decl.split(':', 1)[0].strip().lower()
        if prop in ('background', 'background-color') and WHITE.search(decl) and not fixed_dark_text and not clipped:
            decl = WHITE.sub('var(--card)', decl)
            fix_block.n += 1
        if 'gradient(' in decl:
            for lit, tok in DEEP.items():
                if lit in decl.lower():
                    decl = re.sub(re.escape(lit), tok, decl, flags=re.I)
                    fix_block.g += 1
        out.append(decl)
    return head + '{' + ';'.join(out) + '}'


for name in FILES:
    p = ROOT / name
    raw = p.read_bytes().decode('utf-8')
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    fix_block.n = fix_block.g = 0
    s = re.sub(r'([^{}]*)\{([^{}]*)\}', fix_block, s)
    p.write_bytes((s.replace('\n', '\r\n') if crlf else s).encode('utf-8'))
    print(f'{name}: {fix_block.n} surfaces, {fix_block.g} gradient colours')
