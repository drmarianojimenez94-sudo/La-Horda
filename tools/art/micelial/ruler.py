#!/usr/bin/env python3
"""Recorte con regla (cada 10 px) sobre fondo oscuro, para ubicar cajas a mano.
  python3 ruler.py <sheet.png> x0 x1 y0 y1 scale out.png"""
import sys
from PIL import Image, ImageDraw
src, x0, x1, y0, y1, sc, out = sys.argv[1], *map(int, sys.argv[2:6]), float(sys.argv[6]), sys.argv[7]
im = Image.open(src).convert('RGBA')
bg = Image.new('RGBA', im.size, (24, 24, 28, 255)); bg.alpha_composite(im)
c = bg.crop((x0, y0, x1, y1)).resize((int((x1-x0)*sc), int((y1-y0)*sc)), Image.NEAREST)
d = ImageDraw.Draw(c)
for y in range((y0//10+1)*10, y1, 10):
    yy = (y-y0)*sc; col = (255, 80, 80) if y % 50 == 0 else (90, 90, 90)
    d.line([(0, yy), (8 if y % 50 else 18, yy)], fill=col)
    if y % 50 == 0: d.text((20, yy-6), str(y), fill=(255, 120, 120))
for x in range((x0//10+1)*10, x1, 10):
    xx = (x-x0)*sc; col = (80, 200, 255) if x % 50 == 0 else (90, 90, 90)
    d.line([(xx, 0), (xx, 8 if x % 50 else 18)], fill=col)
    if x % 50 == 0: d.text((xx+2, 20), str(x), fill=(120, 200, 255))
c.convert('RGB').save(out)
