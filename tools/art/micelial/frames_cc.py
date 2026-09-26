#!/usr/bin/env python3
"""Cuadros por componentes 2D dentro de una banda: cuerpos grandes + partículas asignadas al cuerpo
más cercano (si están a < attach px). Escribe contacto numerado y cc.json.
  python3 frames_cc.py <sheet.png> <out_dir> <rows.json>"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

def comps(alpha, r):
    y0, y1, x0, x1 = r['y0'], r['y1'], r['x0'], r['x1']
    m = alpha[y0:y1, x0:x1] >= r.get('amin', 60)
    lbl, n = ndimage.label(m, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lbl)
    sizes = ndimage.sum(m, lbl, range(1, n+1)) if n else []
    body_min = r.get('body', 400)
    bodies = [i for i in range(n) if sizes[i] >= body_min]
    boxes = {i: [objs[i][1].start, objs[i][1].stop, objs[i][0].start, objs[i][0].stop] for i in range(n)}
    groups = {b: [b] for b in bodies}
    att = r.get('attach', 14)
    for i in range(n):
        if i in groups or sizes[i] < 3: continue
        bx = boxes[i]; best, bd = None, 1e9
        for b in bodies:
            B = boxes[b]
            dx = max(B[0]-bx[1], bx[0]-B[1], 0); dy = max(B[2]-bx[3], bx[2]-B[3], 0)
            d = (dx*dx+dy*dy)**0.5
            if d < bd: bd, best = d, b
        if best is not None and bd <= att: groups[best].append(i)
    out = []
    for b, ids in groups.items():
        X0 = min(boxes[i][0] for i in ids); X1 = max(boxes[i][1] for i in ids)
        Y0 = min(boxes[i][2] for i in ids); Y1 = max(boxes[i][3] for i in ids)
        out.append({'box': [x0+X0, x0+X1, y0+Y0, y0+Y1], 'ids': [int(i)+1 for i in ids], 'area': int(sum(sizes[i] for i in ids))})
    out.sort(key=lambda o: o['box'][0])
    return out, lbl

def main():
    src, outd, rows = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
    os.makedirs(outd, exist_ok=True)
    im = Image.open(src).convert('RGBA'); alpha = np.array(im)[..., 3].astype(np.int32)
    res = {}
    for r in rows:
        fr, _ = comps(alpha, r); res[r['name']] = [o['box'] + [o['area']] for o in fr]
        bg = Image.new('RGBA', im.size, (24, 24, 28, 255)); bg.alpha_composite(im)
        c = bg.crop((r['x0'], r['y0']-4, r['x1'], r['y1']+4)); d = ImageDraw.Draw(c)
        for k, o in enumerate(fr):
            b = o['box']
            d.rectangle([b[0]-r['x0'], b[2]-r['y0']+4, b[1]-r['x0']-1, b[3]-r['y0']+3], outline=(0, 255, 255))
            d.text((b[0]-r['x0']+2, b[2]-r['y0']+5), str(k), fill=(255, 255, 0))
        sc = r.get('scale', 1.0)
        if sc != 1: c = c.resize((int(c.width*sc), int(c.height*sc)), Image.NEAREST)
        c.convert('RGB').save(os.path.join(outd, r['name'] + '.png'))
        print(r['name'], len(fr), [o['box'] for o in fr])
    json.dump(res, open(os.path.join(outd, 'cc.json'), 'w'))

if __name__ == '__main__':
    main()
