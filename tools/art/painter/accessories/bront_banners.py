"""Bront (Bastión de Bronce Ritual): estandartes rituales en los hombros: asta de bronce y paño con cola de
golondrina y un glifo. Van a la espalda: detrás del cuerpo de frente y de perfil; encima de espalda.
opts: cloth (rampa del paño), pole (rampa del asta), glyph (color del glifo), h (alto del asta), sway (balanceo)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from bront_lib import CELL, COLS, cell_view, shade, paste, poly_mask, ramp_colors, hexrgb

CLOTH = ["#3a0806", "#7a1610", "#b8301c", "#e0603a"]
POLE = ["#3a2208", "#8a5a1e", "#e0aa58"]


def banner(cx, top, H, sway, cloth, pole, glyph, seed, outline, out=1):
    pm = np.zeros((CELL, CELL), np.uint8)
    cv2.line(pm, (int(cx), int(top + H)), (int(cx), int(top)), 1, 2)
    pole_m = pm > 0
    # remate del asta
    pole_m |= poly_mask([(cx - 1, top - 1), (cx + 1, top - 4), (cx + 2, top - 1)])
    w, hh = 7, 11
    x0 = cx + out
    pts = [(x0, top + 1), (x0 + out * w, top + 1 + sway), (x0 + out * w, top + hh + sway),
           (x0 + out * (w // 2 + 1), top + hh - 3 + sway), (x0, top + hh)]
    cm = poly_mask(pts)
    rgb_c, _ = shade(cm, cloth, round_w=.25, jitter=.06, seed=seed, outline=outline)
    inner = cv2.erode(cm.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    ys, xs = np.nonzero(inner)
    if len(ys):
        gy, gx = int(ys.mean()), int(xs.mean())
        for dy, dx in ((-2, 0), (-1, 0), (0, 0), (1, 0), (0, -1), (0, 1), (-2, -1), (-2, 1)):
            if inner[gy + dy, gx + dx]:
                rgb_c[gy + dy, gx + dx] = hexrgb(glyph)
    rgb_p, _ = shade(pole_m, pole, round_w=.0, jitter=.04, seed=seed + 1, outline=outline)
    rgb_p[pole_m] = ramp_colors(pole, np.linspace(.9, .3, pole_m.sum()))
    return rgb_c, cm, rgb_p, pole_m


def draw(atlas, info, opts):
    cloth = opts.get('cloth', CLOTH); pole = opts.get('pole', POLE); glyph = opts.get('glyph', '#ffd27a')
    H = opts.get('h', 26); outline = opts.get('outline', '#120806')
    for i, f in info['frames'].items():
        c = cell_view(atlas, i)
        k = i % COLS
        nx, ny = f['neckX'], f['neckY']
        sway = [0, 1, 0, -1][k]
        sp = opts.get('spread', 20)
        if f['dir'] == 'side':
            xs, outs, behind = [nx - 14], [-1], True
        else:
            xs, outs, behind = [nx - sp, nx + sp], [-1, 1], f['dir'] != 'up'
        for j, x in enumerate(xs):
            top = ny - H + 8
            rc, cm, rp, pm = banner(x, top, H, sway, cloth, pole, glyph, i * 5 + j, outline, outs[j])
            paste(c, rc, cm, behind=behind)
            paste(c, rp, pm, behind=behind)
    return atlas
