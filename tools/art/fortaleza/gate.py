#!/usr/bin/env python3
"""Visual Gate: cada animación de cada entidad en una fila, sobre fondo oscuro, con la línea de pies."""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'sprites', 'arenas', 'fortaleza')
meta = json.load(open(os.path.join(OUT, 'meta.json')))['atlas']
keys = sys.argv[2:] or list(meta)
rows = []
for k in keys:
    m = meta[k]; at = Image.open(os.path.join(OUT, k, 'atlas.png'))
    for s, idx in m['sets'].items():
        rows.append((k, s, [at.crop(((i % m['cols'])*m['w'], (i//m['cols'])*m['h'], (i % m['cols']+1)*m['w'], (i//m['cols']+1)*m['h'])) for i in idx], m))
W = max(110 + sum(c.width for c in r[2]) + 4*len(r[2]) for r in rows); H = sum(r[3]['h'] + 6 for r in rows)
im = Image.new('RGB', (W, H), (38, 40, 44)); d = ImageDraw.Draw(im); y = 0
for k, s, cells, m in rows:
    d.text((4, y + 4), f'{k}\n{s}', fill=(255, 255, 120)); x = 110
    base = int(m['h']*m['anchor'])
    for c in cells:
        d.rectangle([x, y, x + c.width - 1, y + c.height - 1], outline=(70, 70, 90))
        im.paste(c, (x, y), c); d.line([(x, y + base), (x + c.width, y + base)], fill=(0, 200, 255))
        d.line([(x + c.width//2, y + base - 4), (x + c.width//2, y + base + 4)], fill=(255, 80, 80)); x += c.width + 4
    y += m['h'] + 6
im.save(sys.argv[1])
print(im.size)
