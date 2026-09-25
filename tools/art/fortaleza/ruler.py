#!/usr/bin/env python3
"""Banda de la hoja (con fondo quitado) ampliada y con regla cada 20 px, para leer cortes."""
import sys, numpy as np
from PIL import Image, ImageDraw
src, fgp, out = sys.argv[1], sys.argv[2], sys.argv[3]
x0, x1, y0, y1 = map(int, sys.argv[4].split(',')); k = int(sys.argv[5]) if len(sys.argv) > 5 else 2
a = np.array(Image.open(src).convert('RGB')); fg = np.load(fgp)
b = np.where(fg[...,None], a, 30)[y0:y1, x0:x1].astype(np.uint8)
im = Image.fromarray(b).resize(((x1-x0)*k, (y1-y0)*k), Image.NEAREST)
c = Image.new('RGB', (im.width, im.height+14), (0,0,0)); c.paste(im, (0,14)); d = ImageDraw.Draw(c)
for x in range((x0//20+1)*20, x1, 20):
    X = (x-x0)*k; d.line([(X,10),(X,14+im.height)], fill=(60,60,90) if x%100 else (0,160,255))
    if x % 100 == 0: d.text((X+2,0), str(x), fill=(255,255,0))
c.save(out)
