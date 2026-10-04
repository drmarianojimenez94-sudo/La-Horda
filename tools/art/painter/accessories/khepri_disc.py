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
    H = info['headmap']
    for i, f in info['frames'].items():
        c = cell_view(atlas, i)
        r, k = divmod(i, 4)
        hm = H[r * CELL:(r + 1) * CELL, k * CELL:(k + 1) * CELL] & (c[:, :, 3] > 0)
        band = hm[:, max(0, f['neckX'] - 10):f['neckX'] + 11]
        rows = np.nonzero(band.any(1))[0]
        htop = int(rows[0]) if len(rows) else f['top']
        cx = f['neckX'] + (opts.get('sideDx', -3) if f['dir'] == 'side' else 0)
        cy = htop + opts.get('dy', -3)
        if opts.get('horns'):
            # cuernos de lira que abrazan el disco (tocado de Hathor/Khepri): arcos gruesos a cada lado
            for sgn in (-1, 1):
                hm = np.zeros((CELL, CELL), np.uint8)
                a0, a1 = (100, 230) if sgn < 0 else (-50, 80)
                cv2.ellipse(hm, (int(cx), int(cy + 2)), (R + 3, R + 4), 0, a0, a1, 1, 4)
                m = hm > 0
                rgb, _ = shade(m, opts['horns'], round_w=.4, jitter=.05, seed=i + 3, outline=outline)
                paste(c, rgb, m)
        if opts.get('wings'):
            # disco alado: alas de halcón horizontales con plumas marcadas
            for sgn in (-1, 1):
                pts = [(cx + sgn * (R - 2), cy - 3), (cx + sgn * (R + 13), cy - 5), (cx + sgn * (R + 16), cy - 2),
                       (cx + sgn * (R + 12), cy + 1), (cx + sgn * (R + 8), cy + 3), (cx + sgn * (R - 2), cy + 4)]
                m = poly_mask(pts)
                rgb, _ = shade(m, opts['wings'], round_w=.3, jitter=.05, seed=i + 5, outline=outline)
                for fx in range(R + 1, R + 14, 3):
                    x = cx + sgn * fx
                    col = m[:, x] if 0 <= x < CELL else None
                    if col is not None:
                        ys = np.nonzero(col)[0]
                        if len(ys) > 2:
                            rgb[ys[1:-1], x] = (rgb[ys[1:-1], x].astype(np.float32) * .6).astype(np.uint8)
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
