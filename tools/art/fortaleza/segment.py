#!/usr/bin/env python3
"""Fortaleza Sin Fin: hoja con damero CLARO rasterizado -> máscara de fondo + componentes (cuadros).

  python3 segment.py <sheet.png> <out_dir>      # escribe comps.json + contact.png numerado

El damero de estas hojas es claro (lum ~205-255) y con ruido de compresión, así que el fondo es:
píxel claro y poco saturado, conectado al borde de la región (flood fill) o bolsillo cerrado grande.
Los cuadros se separan por componentes conexas (dilatadas unos px para juntar partículas del mismo VFX).
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

def bg_mask(a, lum_min=186, sd_max=24, pocket_min=40):
    l = 0.299*a[...,0] + 0.587*a[...,1] + 0.114*a[...,2]
    sd = a.max(-1) - a.min(-1)
    cand = (l > lum_min) & (sd < sd_max)
    lbl, n = ndimage.label(cand)
    border = set(np.unique(np.r_[lbl[0], lbl[-1], lbl[:,0], lbl[:,-1]])) - {0}
    bg = np.isin(lbl, list(border))
    # bolsillos cerrados de damero (entre alas/patas): claros, planos y bastante grandes
    for i, sl in enumerate(ndimage.find_objects(lbl), 1):
        if sl is None or i in border: continue
        reg = lbl[sl] == i
        if reg.sum() >= pocket_min and l[sl][reg].mean() > lum_min + 14 and sd[sl][reg].mean() < 12: bg[sl] |= reg
    return bg, l, sd

def components(fg, join=4, min_area=60):
    d = ndimage.binary_dilation(fg, iterations=join) if join else fg
    lbl, n = ndimage.label(d)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lbl), 1):
        if sl is None: continue
        area = int((fg[sl] & (lbl[sl] == i)).sum())
        if area < min_area: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        out.append({'x0':int(x0), 'y0':int(y0), 'x1':int(x1), 'y1':int(y1), 'area':area})
    return out

def main():
    src, outd = sys.argv[1], sys.argv[2]
    os.makedirs(outd, exist_ok=True)
    a = np.array(Image.open(src).convert('RGB')).astype(np.int32)
    bg, l, sd = bg_mask(a)
    fg = ~bg
    # marco negro de la hoja y separadores: fuera
    fg[:3,:] = fg[-3:,:] = False; fg[:, :3] = fg[:, -3:] = False
    comps = components(fg)
    # etiquetas (cajas negras con texto claro): rectángulos oscuros muy anchos y bajos
    for c in comps:
        w, h = c['x1']-c['x0'], c['y1']-c['y0']
        box = a[c['y0']:c['y1'], c['x0']:c['x1']]
        dark = (l[c['y0']:c['y1'], c['x0']:c['x1']] < 40).mean()
        c['label'] = bool(h < 40 and w > 2.2*h and dark > 0.55)
    comps.sort(key=lambda c:(c['y0']//40, c['x0']))
    json.dump(comps, open(os.path.join(outd, 'comps.json'), 'w'))
    im = Image.fromarray(np.where(fg[...,None], a, 40).astype(np.uint8))
    dr = ImageDraw.Draw(im)
    for i, c in enumerate(comps):
        col = (0,255,255) if not c['label'] else (80,80,80)
        dr.rectangle([c['x0'], c['y0'], c['x1']-1, c['y1']-1], outline=col)
        dr.text((c['x0']+2, c['y0']+1), str(i), fill=(255,255,0))
    im.save(os.path.join(outd, 'contact.png'))
    np.save(os.path.join(outd, 'fg.npy'), fg)
    print(len(comps), 'componentes;', sum(c['label'] for c in comps), 'etiquetas')

if __name__ == '__main__':
    main()
