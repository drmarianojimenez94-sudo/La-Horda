"""Velmira — repinta el cetro como otro material (vidrio de Murano, hueso...).

El bastón del cuerpo comparte color con el vestido, así que se separa por forma: las partes FINAS de la silueta
(lo que una apertura morfológica de `kernel` px borra: bastón, voluta, ramas) cuyo color es el del vestido.
opts:
  hue      [desde, hasta] tono Lab del vestido/bastón ya pintado; minChroma; minL (vestidos claros)
  ramp     tonos del material nuevo (oscuro -> claro)
  glint    (opcional) color del brillo: un píxel por componente, arriba a la izquierda (vidrio)
  extraFrames cuadros sueltos además de las filas `rows` (default filas 0-7), p. ej. [32]
  kernel   tamaño de la apertura (default 7); minArea (default 18)
Solo cuadros que no son de muerte (en la muerte el bastón queda bajo el cuerpo y se confunde con el vestido)."""
import numpy as np
import cv2
import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _hex(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def draw(atlas, info, o):
    spec = importlib.util.spec_from_file_location('painter_core', HERE.parent / 'painter.py')
    P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)
    CELL, COLS = info['CELL'], info['COLS']
    out = atlas.copy()
    k = o.get('kernel', 7)
    ramp = np.array([P.hex_lab(c) for c in o['ramp']], np.float32)
    rows = o.get('rows', list(range(8)))
    for i in range(atlas.shape[0] // CELL * COLS):
        r, c = divmod(i, COLS)
        if r not in rows and i not in o.get('extraFrames', []):
            continue
        cimg = out[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
        a = (cimg[:, :, 3] > 0).astype(np.uint8)
        op = cv2.morphologyEx(a, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
        thick = cv2.dilate(op, np.ones((3, 3), np.uint8)) > 0
        lab = P.to_lab(cimg[:, :, :3].reshape(-1, 3)).reshape(CELL, CELL, 3)
        h = np.degrees(np.arctan2(lab[:, :, 2], lab[:, :, 1])) % 360
        ch = np.hypot(lab[:, :, 1], lab[:, :, 2])
        lo, hi = o['hue']
        inh = ((h >= lo) & (h <= hi)) if lo <= hi else ((h >= lo) | (h <= hi))
        colored = inh & (ch >= o.get('minChroma', 10)) & (lab[:, :, 0] > o.get('minL', 9))
        thin = (a > 0) & ~thick
        n, comp, st, _ = cv2.connectedComponentsWithStats(thin.astype(np.uint8), connectivity=8)
        sel = np.zeros((CELL, CELL), bool)
        for j in range(1, n):
            cj = comp == j
            if st[j, 4] < o.get('minArea', 18):
                continue
            if (colored & cj).sum() < .4 * st[j, 4]:
                continue
            sel |= cj & colored
        if not sel.any():
            continue
        px = lab[sel]
        lo_, hi_ = np.percentile(px[:, 0], [3, 97])
        t = np.clip((px[:, 0] - lo_) / max(hi_ - lo_, 1), 0, 1) ** o.get('gamma', 1.0)
        pos = t * (len(ramp) - 1)
        i0 = np.floor(pos).astype(int).clip(0, len(ramp) - 2)
        f = (pos - i0)[:, None]
        cimg[sel, :3] = P.from_lab((ramp[i0] * (1 - f) + ramp[i0 + 1] * f).astype(np.float32))
        if o.get('glint'):
            g = _hex(o['glint'])
            n2, comp2, st2, _ = cv2.connectedComponentsWithStats(sel.astype(np.uint8), connectivity=8)
            for j in range(1, n2):
                if st2[j, 4] < 10:
                    continue
                ys, xs = np.where(comp2 == j)
                q = np.argmin(ys + xs)
                cimg[ys[q], xs[q], :3] = g
    return out
