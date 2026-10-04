"""Bront (Coloso de Hielo Negro): escarcha en los bordes de arriba del metal, carámbanos colgando de los bordes
de abajo y esquirlas de hielo que brotan de los hombros.
opts: frost (rampa), rate (fracción de borde superior escarchado), icicles (n por cuadro), shards (rampa o null)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from bront_lib import CELL, COLS, cell_view, shade, paste, poly_mask, ramp_colors

FROST = ["#7aa8c8", "#c8e6fa", "#ffffff"]
SHARD = ["#0c1a2a", "#2a5a80", "#7ab8e0", "#d8f0ff", "#ffffff"]


def draw(atlas, info, opts):
    fr = opts.get('frost', FROST); rate = opts.get('rate', .55); shard = opts.get('shards', SHARD)
    for i in range(COLS * 9):
        c = cell_view(atlas, i)
        a = c[:, :, 3] > 0
        if not a.any():
            continue
        rng = np.random.default_rng(i)
        L = cv2.cvtColor(c[:, :, :3], cv2.COLOR_RGB2LAB)[:, :, 0].astype(np.float32) * 100 / 255
        # primer píxel interior bajo un borde superior (el contorno queda)
        up_edge = a & ~np.roll(a, 1, 0)
        below = np.roll(up_edge, 1, 0) & a & (L > 10)
        sel = below & (rng.random(a.shape) < rate)
        c[sel, :3] = ramp_colors(fr, rng.random(sel.sum()) * .8 + .2)
        # carámbanos: bajo algunos bordes inferiores en la mitad de arriba del cuerpo
        rows = np.nonzero(a.any(1))[0]
        lo_edge = a & ~np.roll(a, -1, 0)
        cand = np.argwhere(lo_edge & (np.arange(CELL)[:, None] < rows[0] + (rows[-1] - rows[0]) * .7))
        for _ in range(opts.get('icicles', 3)):
            if not len(cand):
                break
            y, x = cand[rng.integers(len(cand))]
            n = rng.integers(2, 5)
            for d in range(1, n + 1):
                Y = y + d
                if Y < CELL and c[Y, x, 3] == 0:
                    c[Y, x, :3] = ramp_colors(fr, np.array([1 - d / (n + 1)]))[0]; c[Y, x, 3] = 255
        f = info['frames'].get(i)
        if f is None or not shard:
            continue
        # esquirlas en los hombros (dos de frente/espalda, una de perfil): detrás del cuerpo
        nx, ny = f['neckX'], f['neckY']
        sides = (-1, 1) if f['dir'] != 'side' else (-1,)
        for s in sides:
            bx = nx + s * opts.get('spread', 15) + (3 if f['dir'] == 'side' else 0)
            by = ny + 4
            for j, (dx, hgt, w, lean) in enumerate(((0, 17, 3, 6), (s * 5, 11, 2, 7), (-s * 4, 9, 2, 2))):
                pts = [(bx + dx - w, by), (bx + dx + s * lean, by - hgt), (bx + dx + w, by)]
                m = poly_mask(pts)
                rgb, _ = shade(m, shard, round_w=.2, jitter=.05, seed=i * 3 + j, outline='#05080c')
                paste(c, rgb, m, behind=True)
    return atlas
