"""Oriel — convierte el bastón del cuerpo en la Llave de las Cicatrices.

Busca el bastón por su color ya pintado (`iron`: tono/croma del metal de la llave) y por forma (partes finas de
la silueta). Arriba, la voluta del bastón (el metal que encierra un hueco) queda como el ojo de la llave (se repinta con `bow`); en el extremo de
abajo se dibuja el paletón (dientes) hacia afuera del cuerpo.
opts:
  ironHue [desde, hasta], ironChroma [min, max]  color del bastón pintado
  bow     4 tonos del ojo (voluta de arriba)          bit   4 tonos del paletón
  shaft   (opcional) tonos del astil (partes finas del metal): cristal, hierro negro...
  override {"<cuadro>": [arriba, mentón, x]} para cuadros sin cuello (p. ej. el primero de la muerte)
  outline contorno; teeth: lista de largos de dientes (default [3, 2, 3])
"""
import numpy as np
import cv2
import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _P():
    s = importlib.util.spec_from_file_location('painter_core', HERE.parent / 'painter.py')
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    return m


def _hex(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [255], np.uint8)


def iron_mask(P, c, o):
    lab = P.to_lab(c[:, :, :3].reshape(-1, 3)).reshape(c.shape[0], c.shape[1], 3)
    h = np.degrees(np.arctan2(lab[:, :, 2], lab[:, :, 1])) % 360
    ch = np.hypot(lab[:, :, 1], lab[:, :, 2])
    a, b = o.get('ironHue', [230, 300])
    lo, hi = o.get('ironChroma', [3, 20])
    return (c[:, :, 3] > 0) & (h >= a) & (h <= b) & (ch >= lo) & (ch <= hi) & (lab[:, :, 0] > 12), lab


def thin_mask(c, k=7):
    a = (c[:, :, 3] > 0).astype(np.uint8)
    op = cv2.morphologyEx(a, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    return (a > 0) & ~(cv2.dilate(op, np.ones((3, 3), np.uint8)) > 0)


def draw(atlas, info, o):
    P = _P()
    CELL, COLS = info['CELL'], info['COLS']
    out = atlas.copy()
    bow = [_hex(x) for x in o.get('bow', ['#6a4a12', '#b08428', '#e2bc52', '#fbe79a'])]
    bit = [_hex(x) for x in o.get('bit', ['#2a2e3a', '#4c5468', '#7a849c', '#b4bccc'])]
    ol = _hex(o.get('outline', '#120c12'))
    teeth = o.get('teeth', [3, 2, 3])
    frames = {int(k): v for k, v in info['frames'].items()}
    for k, v in (o.get('override') or {}).items():
        frames[int(k)] = {'top': v[0], 'neckY': v[1], 'neckX': v[2], 'dir': 'down'}
    for i, f in frames.items():
        r, cc = divmod(i, COLS)
        c = out[r * CELL:(r + 1) * CELL, cc * CELL:(cc + 1) * CELL]
        iron, lab = iron_mask(P, c, o)
        cand = iron & thin_mask(c)
        n, comp, st, _ = cv2.connectedComponentsWithStats(cand.astype(np.uint8), connectivity=8)
        comps = [j for j in range(1, n) if st[j, 4] >= 6]
        if not comps:
            continue
        # ojo de la llave: el trozo de metal que encierra un hueco (la voluta del bastón)
        n2, comp2, st2, _ = cv2.connectedComponentsWithStats(iron.astype(np.uint8), connectivity=8)
        top = min(comps, key=lambda j: st[j, 1])
        best, bh = None, 2
        for j in range(1, n2):
            if st2[j, 4] < 10:
                continue
            m = cv2.dilate((comp2 == j).astype(np.uint8), np.ones((3, 3), np.uint8))
            ff = m.copy(); mask = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8)
            cv2.floodFill(ff, mask, (0, 0), 1)
            hole = ff == 0
            if hole.sum() > bh:
                best, bh, bhole = j, hole.sum(), hole
        sel = None
        if best is not None:
            ys_, xs_ = np.where(bhole)
            box = np.zeros_like(iron)
            box[max(0, ys_.min() - 5):ys_.max() + 6, max(0, xs_.min() - 5):xs_.max() + 6] = True
            sel = box & (comp2 == best)
        else:
            # voluta abierta (gancho): la punta más alta del metal (la cabeza del bastón queda arriba)
            big = [j for j in range(1, n2) if st2[j, 4] >= 10]
            if big:
                j = min(big, key=lambda j: st2[j, 1])
                yy, xx = np.where(comp2 == j)
                k0 = np.argmin(yy)
                d2 = (xx - xx[k0]) ** 2 + (yy - (yy[k0] + 4)) ** 2
                sel = np.zeros_like(iron)
                sel[yy[d2 <= 42], xx[d2 <= 42]] = True
        if sel is not None and sel.sum() >= 4:
            L = lab[sel][:, 0]
            lo, hi = np.percentile(L, [5, 95])
            t = np.clip((L - lo) / max(hi - lo, 1), 0, 1)
            idx = np.clip((t * 3.999).astype(int), 0, 3)
            c[sel] = np.array(bow)[idx]
        if o.get('shaft'):
            # astil de otro material (cristal, hierro negro): las partes finas del metal que no son el ojo
            sh = [_hex(x) for x in o['shaft']]
            m = (cand | (iron & thin_mask(c, 5))) & ~((c[:, :, :3] == np.array(bow)[:, None, None, :3]).all(-1).any(0) if False else np.zeros_like(cand))
            if sel is not None:
                m &= ~sel
            if m.any():
                L = lab[m][:, 0]
                lo, hi = np.percentile(L, [5, 95])
                t = np.clip((L - lo) / max(hi - lo, 1), 0, 1)
                c[m] = np.array(sh)[np.clip((t * (len(sh) - .001)).astype(int), 0, len(sh) - 1)]
        # paletón: en el extremo de abajo del componente más bajo (fuera del cuerpo grueso)
        low = max(comps, key=lambda j: st[j, 1] + st[j, 3])
        if low == top and st[low, 1] + st[low, 3] < f['neckY'] + 6:
            continue
        ys, xs = np.where(comp == low)
        if len(ys) < 6:
            continue
        k = np.argmax(ys)
        ey, ex = ys[k], xs[k]
        # dirección del astil (hacia abajo) con los píxeles de ese componente
        pts = np.stack([xs, ys], 1).astype(np.float32)
        mu = pts.mean(0)
        _, _, vt = np.linalg.svd(pts - mu, full_matrices=False)
        u = vt[0]
        if u[1] < 0:
            u = -u
        if abs(u[1]) < .5:
            u = np.array([0., 1.])
        # perpendicular, hacia afuera del cuerpo
        nrm = np.array([u[1], -u[0]])
        if (ex - f['neckX']) * nrm[0] < 0:
            nrm = -nrm
        sx = 1 if nrm[0] >= 0 else -1
        # dientes: barras horizontales de 2 px de alto, separadas, subiendo desde la punta
        H, W = c.shape[:2]
        paint = {}
        for tI, ln in enumerate(teeth):
            if ln <= 0:
                continue
            by = int(round(ey - 1 - tI * 2 - u[1] * 0))
            bx = int(round(ex - u[0] * (tI * 2 + 1)))
            for dx in range(1, ln + 1):
                for dy in (0,):
                    paint[(by + dy, bx + sx * dx)] = 1 if dx < ln else 2
        # espiga que une los dientes al astil
        for dy in range(len(teeth) * 2):
            paint.setdefault((int(round(ey - dy)), int(round(ex - u[0] * dy)) + sx), 1)
        # contorno
        ring = {}
        for (y, x) in paint:
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (y + dy, x + dx)
                if q not in paint:
                    ring[q] = 1
        for (y, x) in ring:
            if 0 <= y < H and 0 <= x < W and c[y, x, 3] == 0:
                c[y, x] = ol
        for (y, x), s in paint.items():
            if 0 <= y < H and 0 <= x < W and (c[y, x, 3] == 0 or iron[y, x]):
                light = 3 if (x - ex) * sx <= 1 and s == 1 else s
                c[y, x] = bit[min(3, light)]
    return out
