"""Vhal: en la fila de muerte la cabeza es la del donante de cuerpo; su pelo (headmap de esa fila) se repinta
por luz con la rampa del pelo de Vhal. opts: ramp, minL (lo más oscuro queda como contorno)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from vhal_lib import CELL, COLS, cell_view, ramp_colors


def draw(atlas, info, opts):
    H = info['headmap']
    for k in range(COLS):
        i = 8 * COLS + k
        c = cell_view(atlas, i)
        hm = H[8 * CELL:9 * CELL, k * CELL:(k + 1) * CELL] & (c[:, :, 3] > 0)
        lab = cv2.cvtColor(c[:, :, :3], cv2.COLOR_RGB2LAB).astype(np.float32)
        L = lab[:, :, 0] * 100 / 255; A = lab[:, :, 1] - 128; B = lab[:, :, 2] - 128
        C = np.hypot(A, B); h = np.degrees(np.arctan2(B, A)) % 360
        skin = (L > 45) & (C > 8) & (C < 50) & (h > 25) & (h < 85)
        skin = cv2.dilate(skin.astype(np.uint8), np.ones((2, 2), np.uint8)) > 0
        sel = hm & (L > opts.get('minL', 10)) & ~skin & (C < opts.get('maxChroma', 14))
        if not sel.any():
            continue
        lo, hi = np.percentile(L[sel], [3, 97])
        c[sel, :3] = ramp_colors(opts['ramp'], np.clip((L[sel] - lo) / max(hi - lo, 1), 0, 1))
    return atlas
