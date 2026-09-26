#!/usr/bin/env python3
"""Detección automática de cuadros por fila (perfil de columnas del alfa) + contacto numerado.
  python3 frames_auto.py <sheet.png> <out_dir> <rows.json>
rows.json: [{"name":..., "y0":.., "y1":.., "x0":.., "x1":.., "gap":3, "amin":60}]"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

def detect(alpha, r):
    y0, y1, x0, x1 = r['y0'], r['y1'], r['x0'], r['x1']
    m = alpha[y0:y1, x0:x1] >= r.get('amin', 60)
    # quitar motas sueltas (partículas chiquitas no deben cortar/unir cuadros)
    lbl, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n:
        sz = ndimage.sum(m, lbl, range(1, n+1))
        m &= ~np.isin(lbl, np.where(sz < r.get('minblob', 25))[0] + 1)
    col = m.sum(0) > 0
    gap = r.get('gap', 3)
    runs, x, W = [], 0, len(col)
    while x < W:
        if col[x]:
            s = x
            while x < W:
                if col[x]: x += 1; continue
                g = x
                while g < W and not col[g]: g += 1
                if g - x >= gap or g >= W: break
                x = g
            runs.append((s, x))
        else: x += 1
    out = []
    for s, e in runs:
        sub = m[:, s:e]; ys = np.where(sub.any(1))[0]
        if e - s < 8 or len(ys) == 0: continue
        out.append([x0+s, x0+e, y0+int(ys.min()), y0+int(ys.max())+1])
    return out

def main():
    src, outd, rows = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
    os.makedirs(outd, exist_ok=True)
    im = Image.open(src).convert('RGBA'); alpha = np.array(im)[..., 3].astype(np.int32)
    res = {}
    for r in rows:
        fr = detect(alpha, r); res[r['name']] = fr
        bg = Image.new('RGBA', im.size, (24, 24, 28, 255)); bg.alpha_composite(im)
        c = bg.crop((r['x0'], r['y0']-4, r['x1'], r['y1']+4)); d = ImageDraw.Draw(c)
        for k, b in enumerate(fr):
            d.rectangle([b[0]-r['x0'], b[2]-r['y0']+4, b[1]-r['x0']-1, b[3]-r['y0']+3], outline=(0, 255, 255))
            d.text((b[0]-r['x0']+2, b[2]-r['y0']+5), str(k), fill=(255, 255, 0))
        sc = r.get('scale', 1.0)
        if sc != 1: c = c.resize((int(c.width*sc), int(c.height*sc)), Image.NEAREST)
        c.convert('RGB').save(os.path.join(outd, r['name'] + '.png'))
        print(r['name'], len(fr), fr)
    json.dump(res, open(os.path.join(outd, 'auto.json'), 'w'))

if __name__ == '__main__':
    main()
