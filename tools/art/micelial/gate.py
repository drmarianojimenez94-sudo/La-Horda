#!/usr/bin/env python3
"""Visual gate: cada atlas del Reino Micelial sobre fondo oscuro, con el índice de cuadro y a qué sets pertenece,
y una línea roja en la base de los pies (para ver que no 'salte' entre cuadros).
  python3 gate.py <out_dir>"""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
D = os.path.join(ROOT, 'assets', 'sprites', 'arenas', 'micelial')
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
meta = json.load(open(os.path.join(D, 'meta.json')))
for k, m in meta['atlas'].items():
    at = Image.open(os.path.join(D, k, 'atlas.png'))
    n = (at.width // m['w']) * (at.height // m['h'])
    used = {}
    for s, v in m['sets'].items():
        for i in v: used.setdefault(i, []).append(s)
    cells = [i for i in range(n) if i in used]
    W, H = m['w'], m['h'] + 14
    sheet = Image.new('RGB', (W * min(8, len(cells)), H * ((len(cells) + 7) // 8)), (30, 30, 36))
    d = ImageDraw.Draw(sheet)
    for j, i in enumerate(cells):
        cx, cy = (j % 8) * W, (j // 8) * H
        cell = at.crop(((i % m['cols']) * m['w'], (i // m['cols']) * m['h'], (i % m['cols'] + 1) * m['w'], (i // m['cols'] + 1) * m['h']))
        bg = Image.new('RGBA', cell.size, (30, 30, 36, 255)); bg.alpha_composite(cell)
        sheet.paste(bg.convert('RGB'), (cx, cy))
        by = cy + int(m['h'] * m['anchor'])
        d.line([(cx, by), (cx + W - 1, by)], fill=(255, 40, 40))
        d.line([(cx + W // 2, cy), (cx + W // 2, cy + m['h'])], fill=(60, 60, 200))
        d.text((cx + 2, cy + m['h'] + 1), f"{i}:{','.join(used[i])}", fill=(255, 255, 0))
    sheet.save(os.path.join(out, k + '.png'))
# FX
fx = meta['fx']; names = [n for n in fx if not n.endswith('_wither') and not n.endswith('_dead')]
cols = 6; cw = 250; ch = 200
sheet = Image.new('RGB', (cols * cw, ((len(names) + cols - 1) // cols) * ch), (30, 30, 36)); d = ImageDraw.Draw(sheet)
for j, n in enumerate(names):
    p = os.path.join(D, 'fx', n + '.png') if not n.startswith('mp_') else os.path.join(D, 'mother', n + '.png')
    im = Image.open(p); im.thumbnail((cw - 10, ch - 20))
    bg = Image.new('RGBA', im.size, (30, 30, 36, 255)); bg.alpha_composite(im)
    sheet.paste(bg.convert('RGB'), ((j % cols) * cw + 5, (j // cols) * ch + 5))
    d.text(((j % cols) * cw + 5, (j // cols) * ch + ch - 14), n, fill=(255, 255, 0))
sheet.save(os.path.join(out, 'fx.png'))
print('ok')
