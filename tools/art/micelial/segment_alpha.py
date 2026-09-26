#!/usr/bin/env python3
"""Reino Micelial: hoja con canal alfa -> componentes numerados (contacto) para definir los cuadros.

  python3 segment_alpha.py <sheet.png> <out_dir> [alpha_min=48] [join=3]

La hoja de enemigos ya trae el fondo transparente (el degradado de color que se ve en un visor sin
alfa es solo el RGB de píxeles con alfa ~0). Sprite = alfa >= alpha_min; se juntan partículas cercanas
dilatando `join` px. Las etiquetas de texto y los marcos de los paneles se marcan aparte.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

def main():
    src, outd = sys.argv[1], sys.argv[2]
    amin = int(sys.argv[3]) if len(sys.argv) > 3 else 48
    join = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    os.makedirs(outd, exist_ok=True)
    im = Image.open(src).convert('RGBA'); a = np.array(im).astype(np.int32)
    fg = a[..., 3] >= amin
    d = ndimage.binary_dilation(fg, iterations=join) if join else fg
    lbl, n = ndimage.label(d)
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lbl), 1):
        if sl is None: continue
        area = int((fg[sl] & (lbl[sl] == i)).sum())
        if area < 30: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        comps.append({'x0': int(x0), 'y0': int(y0), 'x1': int(x1), 'y1': int(y1), 'area': area})
    comps.sort(key=lambda c: (c['y0']//60, c['x0']))
    json.dump(comps, open(os.path.join(outd, 'comps.json'), 'w'))
    bg = Image.new('RGBA', im.size, (24, 24, 28, 255)); bg.alpha_composite(im)
    dr = ImageDraw.Draw(bg)
    for k, c in enumerate(comps):
        dr.rectangle([c['x0'], c['y0'], c['x1']-1, c['y1']-1], outline=(0, 255, 255))
        dr.text((c['x0']+2, c['y0']+1), str(k), fill=(255, 255, 0))
    bg.convert('RGB').save(os.path.join(outd, 'contact.png'))
    for k, c in enumerate(comps): print(k, c)

if __name__ == '__main__':
    main()
