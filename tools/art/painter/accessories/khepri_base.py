"""Khepri: base de la cabeza (reparación de cuadros, pelo, nemes rayado y cabeza en la muerte).
opts:
  shift:   {"i": [dx, dy]}  corrige cuadros donde el cuello del cuerpo se midió mal (mueve la cabeza pegada)
  hair:    rampa del pelo (pelo claro del donante de cabeza -> esta rampa); null = no tocar
  stripes: rampa de las rayas del nemes (o null); stripeHue: [a, b] tono Lab del tocado a rayar
  deathHood: rampa para la cabeza en la muerte (pelo del donante de cuerpo -> tocado)
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from khepri_lib import CELL, COLS, cell_view, ramp_colors, outline_fix, drop_specks


def _lab(c):
    lab = cv2.cvtColor(c[:, :, :3], cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[:, :, 0] * 100 / 255
    a = lab[:, :, 1] - 128
    b = lab[:, :, 2] - 128
    return L, np.hypot(a, b), np.degrees(np.arctan2(b, a)) % 360


def _by_light(c, sel, ramp, lo=None, hi=None, gamma=1.0):
    if not sel.any():
        return
    L, _, _ = _lab(c)
    px = L[sel]
    lo = np.percentile(px, 3) if lo is None else lo
    hi = np.percentile(px, 97) if hi is None else hi
    t = np.clip((px - lo) / max(hi - lo, 1), 0, 1) ** gamma
    c[sel, :3] = ramp_colors(ramp, t)


def shift_head(c, hm, fr, dx, dy):
    head = hm & (c[:, :, 3] > 0)
    ys, xs = np.nonzero(head)
    if not len(ys):
        return hm
    px = c[ys, xs].copy()
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    c[ys, xs] = 0
    Y, X = ys + dy, xs + dx
    ok = (Y >= 0) & (Y < CELL) & (X >= 0) & (X < CELL)
    nh = np.zeros_like(hm)
    nh[Y[ok], X[ok]] = True
    # residuo del pelo del cuerpo (oscuro y neutro) que queda alrededor de la cabeza nueva, por encima del mentón
    L, C, _ = _lab(c)
    chin = fr['neckY'] + dy
    box = np.zeros_like(hm)
    box[max(0, min(y0, y0 + dy) - 2):max(0, chin - 1), max(0, min(x0, x0 + dx) - 3):min(CELL, max(x1, x1 + dx) + 4)] = True
    res = box & ~nh & (c[:, :, 3] > 0) & (L < 30) & (C < 12)
    c[res] = 0
    c[Y[ok], X[ok]] = px[ok]
    fr['top'] += dy; fr['neckY'] += dy; fr['neckX'] += dx
    return nh


def draw(atlas, info, opts):
    frames = info['frames']
    H = info['headmap']
    for i in range(COLS * 9):
        c = cell_view(atlas, i)
        r, k = divmod(i, COLS)
        hm = H[r * CELL:(r + 1) * CELL, k * CELL:(k + 1) * CELL]
        if str(i) in opts.get('shift', {}) and i in frames:
            dx, dy = opts['shift'][str(i)]
            hm[:] = shift_head(c, hm.copy(), frames[i], dx, dy)
            outline_fix(c); drop_specks(c, 5)
        L, C, h = _lab(c)
        alpha = c[:, :, 3] > 0
        if r == 8:
            box = opts.get('deathBoxes', {}).get(str(i))
            if box and opts.get('deathHood'):
                x0, y0, x1, y1 = box
                reg = np.zeros_like(alpha); reg[y0:y1 + 1, x0:x1 + 1] = True
                hair = reg & alpha & (L > 9) & (L < 36) & (C < 12)
                _by_light(c, hair, opts['deathHood'])
                if opts.get('deathMask'):
                    a, b = opts.get('stripeHue', [120, 200])
                    m = reg & alpha & (L > 34) & (C > 10) & (((h >= a) & (h <= b)) if a <= b else ((h >= a) | (h <= b)))
                    _by_light(c, m, opts['deathMask'])
            continue
        if opts.get('hair'):
            # pelo claro y neutro del donante de cabeza (la piel tiene más croma); fuera de los ojos
            sel = hm & alpha & (L > 38) & (C < opts.get('hairChroma', 13))
            _by_light(c, sel, opts['hair'], gamma=.9)
        if opts.get('stripes'):
            a, b = opts.get('stripeHue', [120, 200])
            L, C, h = _lab(c)
            hood = hm & alpha & (C > 8) & (np.arange(CELL)[:, None] < frames.get(i, {'neckY': CELL})['neckY'] - 1) & (((h >= a) & (h <= b)) if a <= b else ((h >= a) | (h <= b))) & (L > 12)
            ys, xs = np.nonzero(hood)
            if len(ys):
                top = ys.min()
                per, w = opts.get('stripePeriod', 6), opts.get('stripeWidth', 2)
                Y = np.arange(CELL)[:, None].repeat(CELL, 1)
                band = ((Y - top - 2) % per) < w
                band[:top + opts.get('stripeSkip', 2)] = False
                sel = hood & band
                _by_light(c, sel, opts['stripes'], lo=10, hi=60)
    return atlas
