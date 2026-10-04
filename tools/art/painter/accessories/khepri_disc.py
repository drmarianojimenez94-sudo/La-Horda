"""Khepri: disco solar opaco sobre el tocado (encima de la cabeza en todas las vistas de pie).
opts: ramp (disco), rim (aro), r (radio), dy (desplazamiento sobre la coronilla), horns (rampa de cuernos o null)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from khepri_lib import CELL, cell_view, shade, paste, ellipse_mask, ramp_colors, poly_mask

RAMP = ["#4a1406", "#9a3410", "#d8641a", "#f39a32", "#ffd77a"]
RIM = ["#5a3a0c", "#b38a2c", "#f4d77a"]


def draw(atlas, info, opts):
    ramp = opts.get('ramp', RAMP); rim = opts.get('rim', RIM); R = opts.get('r', 7)
    outline = opts.get('outline', '#140a08')
    for i, f in info['frames'].items():
        c = cell_view(atlas, i)
        cx = f['neckX'] + (2 if f['dir'] == 'side' else 0)
        cy = f['top'] + opts.get('dy', -3)
        if opts.get('horns'):
            # cuernos de lira que abrazan el disco (como en los tocados de Hathor/Khepri)
            for sgn in (-1, 1):
                pts = [(cx + sgn * (R - 1), cy + R + 1), (cx + sgn * (R + 4), cy + 1), (cx + sgn * (R + 3), cy - R - 1),
                       (cx + sgn * (R + 1), cy - R + 2), (cx + sgn * (R + 2), cy + 1), (cx + sgn * (R - 2), cy + R - 1)]
                m = poly_mask(pts)
                rgb, _ = shade(m, opts['horns'], round_w=.3, jitter=.05, seed=i, outline=outline)
                paste(c, rgb, m)
        m = ellipse_mask(cx, cy, R, R)
        rgb, _ = shade(m, ramp, round_w=.65, jitter=.04, seed=i, outline=outline)
        inner = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        ring = inner & ~(cv2.erode(inner.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
        ys, xs = np.nonzero(ring)
        t = 1 - ((ys - ys.min()) + (xs - xs.min())) / max(np.ptp(ys) + np.ptp(xs), 1)
        rgb[ys, xs] = ramp_colors(rim, t)
        paste(c, rgb, m)
    return atlas
