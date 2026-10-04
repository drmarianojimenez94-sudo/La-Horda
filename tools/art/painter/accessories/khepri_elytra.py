"""Khepri: élitros (estuches de las alas) abiertos a la espalda.
De frente y de perfil van DETRÁS del cuerpo (solo en píxeles transparentes); de espaldas, encima de la espalda
(sin tapar la cabeza). opts: ramp (caparazón), rim (borde), size [rx, ry], seam (color de la costura)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from khepri_lib import CELL, COLS, cell_view, shade, paste, ellipse_mask, ramp_colors, hexrgb

RAMP = ["#0a2226", "#124a44", "#1f7d63", "#3fae8a", "#93df8a", "#d6f5a0"]
RIM = ["#5a3a0c", "#b38a2c", "#efcd6a"]


def elytron(cx, cy, rx, ry, ang, ramp, rim, seed, outline, flip=False):
    m = ellipse_mask(cx, cy, rx, ry, ang)
    # punta afilada: recorta el cuarto inferior hacia el eje (forma de estuche, no óvalo)
    rgb, _ = shade(m, ramp, round_w=.5, jitter=.045, seed=seed, outline=outline)
    inner = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    ring = inner & ~(cv2.erode(inner.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
    if rim:
        ys, xs = np.nonzero(ring)
        t = 1 - (ys - ys.min()) / max(np.ptp(ys), 1) * .8
        rgb[ys, xs] = ramp_colors(rim, t + np.random.default_rng(seed).normal(0, .06, len(t)))
    # costura central: línea oscura a lo largo del eje mayor
    th = np.radians(ang + 90)
    for s in np.linspace(-ry * .8, ry * .8, int(ry * 2)):
        x = int(round(cx + np.cos(th) * s)); y = int(round(cy + np.sin(th) * s))
        if 0 <= x < CELL and 0 <= y < CELL and inner[y, x]:
            rgb[y, x] = (rgb[y, x].astype(np.float32) * .55).astype(np.uint8)
    return rgb, m


def draw(atlas, info, opts):
    ramp = opts.get('ramp', RAMP); rim = opts.get('rim', RIM); outline = opts.get('outline', '#0c0a10')
    rx, ry = opts.get('size', [6, 15])
    H = info['headmap']
    for i, f in info['frames'].items():
        c = cell_view(atlas, i)
        r, k = divmod(i, COLS)
        hm = H[r * CELL:(r + 1) * CELL, k * CELL:(k + 1) * CELL]
        nx, ny, d = f['neckX'], f['neckY'], f['dir']
        if d == 'down':
            for sgn in (-1, 1):
                rgb, m = elytron(nx + sgn * 15, ny + 3, rx, ry, sgn * 38, ramp, rim, i * 7 + sgn, outline)
                paste(c, rgb, m, behind=True)
        elif d == 'side':
            for j, (ox, oy, a) in enumerate([(-15, 0, -48), (-11, 6, -28)]):
                rgb, m = elytron(nx + ox, ny + oy, rx, ry, a, ramp, rim, i * 7 + j, outline)
                paste(c, rgb, m, behind=True)
        elif d == 'up':
            for sgn in (-1, 1):
                rgb, m = elytron(nx + sgn * 8, ny + 13, rx + 1, ry, -sgn * 22, ramp, rim, i * 7 + sgn, outline)
                m = m & ~hm
                paste(c, rgb, m, behind=False)
    return atlas
