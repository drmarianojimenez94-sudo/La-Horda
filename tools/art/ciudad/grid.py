"""Detección de celdas de las hojas de la Ciudad Maldita: el fondo de cada celda es gris a cuadros y las
celdas están separadas por bordes oscuros. Dentro de un rectángulo de panel devuelve las columnas y filas
(runs del perfil de 'gris' por encima de un umbral)."""
import sys
import numpy as np
from PIL import Image

def graymask(a):
    a = a.astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]; v = a.max(-1)
    return (abs(r - g) < 14) & (abs(g - b) < 14) & (v > 40) & (v < 130)

def runs(p, thr, minlen):
    out = []; st = None
    for i, v in enumerate(list(p) + [0]):
        if v > thr and st is None: st = i
        elif v <= thr and st is not None:
            if i - st >= minlen: out.append((st, i))
            st = None
    return out

def cells(img, rect, thr=0.35, minlen=10):
    x0, y0, x1, y1 = rect
    gm = graymask(np.array(img)[y0:y1, x0:x1])
    cols = [(x0 + a, x0 + b) for a, b in runs(gm.mean(0), thr, minlen)]
    rows = [(y0 + a, y0 + b) for a, b in runs(gm.mean(1), thr, minlen)]
    return cols, rows

if __name__ == '__main__':
    im = Image.open(sys.argv[1]).convert('RGB')
    r = tuple(int(v) for v in sys.argv[2].split(','))
    thr = float(sys.argv[3]) if len(sys.argv) > 3 else 0.35
    c, rw = cells(im, r, thr)
    print('cols', len(c), c); print('rows', len(rw), rw)
