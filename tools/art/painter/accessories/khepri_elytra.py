"""Khepri: élitros (estuches de las alas) abiertos a la espalda.
De frente y de perfil van DETRÁS del cuerpo (solo en píxeles transparentes); de espaldas, encima de la espalda
(sin tapar la cabeza). opts: ramp (caparazón), rim (borde), size [rx, ry], seam (color de la costura)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from khepri_lib import CELL, COLS, cell_view, shade, paste, ellipse_mask, ramp_colors, hexrgb

RAMP = ["#08181e", "#0f3c3c", "#1a6a58", "#2f9a78", "#5cc48c", "#b4e68a"]
RIM = ["#5a3a0c", "#b38a2c", "#efcd6a"]


def elytron(cx, cy, rx, ry, ang, ramp, rim, seed, outline, flecks=None, cracks=None):
    m = ellipse_mask(cx, cy, rx, ry, ang)
    # punta afilada: recorta el cuarto inferior hacia el eje (forma de estuche, no óvalo)
    rgb, _ = shade(m, ramp, round_w=.5, jitter=.045, seed=seed, outline=outline)
    inner = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    ring = inner & ~(cv2.erode(inner.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
    if rim:
        ys, xs = np.nonzero(ring)
        t = 1 - (ys - ys.min()) / max(np.ptp(ys), 1) * .8
        rgb[ys, xs] = ramp_colors(rim, t + np.random.default_rng(abs(seed)).normal(0, .06, len(t)))
    # costura central: línea oscura a lo largo del eje mayor
    th = np.radians(ang + 90)
    for s in np.linspace(-ry * .8, ry * .8, int(ry * 2)):
        x = int(round(cx + np.cos(th) * s)); y = int(round(cy + np.sin(th) * s))
        if 0 <= x < CELL and 0 <= y < CELL and inner[y, x]:
            rgb[y, x] = (rgb[y, x].astype(np.float32) * .55).astype(np.uint8)
    if flecks:
        rng = np.random.default_rng(abs(seed) % 7 + 11)
        ys, xs = np.nonzero(inner & ~ring)
        pick = rng.random(len(ys)) < flecks[0]
        rgb[ys[pick], xs[pick]] = ramp_colors(flecks[1], rng.random(pick.sum()))
    if cracks:
        rng = np.random.default_rng(abs(seed) % 7 + 23)
        cm = np.zeros((CELL, CELL), np.uint8)
        for _ in range(cracks[0]):
            ys, xs = np.nonzero(inner)
            j = rng.integers(len(ys)); y, x = ys[j], xs[j]
            for _ in range(rng.integers(4, 9)):
                ny_, nx_ = y + rng.integers(-2, 3), x + rng.integers(-2, 3)
                cv2.line(cm, (int(x), int(y)), (int(nx_), int(ny_)), 1, 1)
                y, x = ny_, nx_
        cmk = (cm > 0) & inner
        rgb[cmk] = (rgb[cmk].astype(np.float32) * .35).astype(np.uint8)
        if len(cracks) > 1:  # brasa en el fondo de algunas grietas
            glow = cmk & (rng.random(cmk.shape) < .35)
            rgb[glow] = ramp_colors(cracks[1], rng.random(glow.sum()))
    return rgb, m


def draw(atlas, info, opts):
    ramp = opts.get('ramp', RAMP); rim = opts.get('rim', RIM); outline = opts.get('outline', '#0c0a10')
    rx, ry = opts.get('size', [6, 15])
    fl = opts.get('flecks'); cr = opts.get('cracks')
    if fl: fl = (fl['rate'], fl['ramp'])
    if cr: cr = [cr['n']] + ([cr['glow']] if cr.get('glow') else [])
    H = info['headmap']
    for i, f in info['frames'].items():
        c = cell_view(atlas, i)
        r, k = divmod(i, COLS)
        hm = H[r * CELL:(r + 1) * CELL, k * CELL:(k + 1) * CELL]
        nx, ny, d = f['neckX'], f['neckY'], f['dir']
        if d == 'down':
            for sgn in (-1, 1):
                rgb, m = elytron(nx + sgn * 19, ny - 1, rx + 1, ry + 2, sgn * 32, ramp, rim, i * 7 + sgn, outline, fl, cr)
                paste(c, rgb, m, behind=True)
        elif d == 'side':
            for j, (ox, oy, a) in enumerate([(-21, -3, -52), (-16, 4, -30)]):
                rgb, m = elytron(nx + ox, ny + oy, rx, ry, a, ramp, rim, i * 7 + j, outline, fl, cr)
                paste(c, rgb, m, behind=True)
        elif d == 'up':
            for sgn in (-1, 1):
                rgb, m = elytron(nx + sgn * 8, ny + 13, rx + 1, ry, -sgn * 22, ramp, rim, i * 7 + sgn, outline, fl, cr)
                m = m & ~hm
                paste(c, rgb, m, behind=False)
    return atlas
