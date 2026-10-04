"""Vhal: el torso y los brazos se abren en cielo estrellado. Estrellas sobre los píxeles de la túnica
(tono y luz dentro de un rango), fijas respecto del cuello (se mueven con el cuerpo) y con titileo por cuadro.
opts: hue [a, b] y maxL de la tela-cielo; density; ramp (estrellas); big (fracción con cruz de 5 px);
glow: rampa de nebulosa suave (o null)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from vhal_lib import CELL, COLS, cell_view, ramp_colors

RAMP = ["#7f8cff", "#c4ccff", "#ffffff"]


def _hash(x, y, k):
    v = (x * 73856093) ^ (y * 19349663) ^ (k * 83492791)
    return ((v & 0xffffffff) % 10007) / 10007.0


def draw(atlas, info, opts):
    a, b = opts.get('hue', [250, 320]); maxL = opts.get('maxL', 34); minC = opts.get('minChroma', 6)
    dens = opts.get('density', .035); big = opts.get('big', .12); ramp = opts.get('ramp', RAMP)
    rows = opts.get('rows', list(range(9)))
    H = info['headmap']
    for i in range(COLS * 9):
        r, k = divmod(i, COLS)
        if r not in rows:
            continue
        c = cell_view(atlas, i)
        hm = H[r * CELL:(r + 1) * CELL, k * CELL:(k + 1) * CELL]
        f = info['frames'].get(i, {'neckX': CELL // 2, 'neckY': 60})
        lab = cv2.cvtColor(c[:, :, :3], cv2.COLOR_RGB2LAB).astype(np.float32)
        L = lab[:, :, 0] * 100 / 255; A = lab[:, :, 1] - 128; B = lab[:, :, 2] - 128
        h = np.degrees(np.arctan2(B, A)) % 360; C = np.hypot(A, B)
        inh = (h >= a) & (h <= b) if a <= b else (h >= a) | (h <= b)
        cloth = (c[:, :, 3] > 0) & inh & (C >= minC) & (L <= maxL) & (L > 6) & ~hm
        # solo el interior (no sobre el contorno)
        cloth &= cv2.erode(cloth.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        if opts.get('glow'):
            # nebulosa: manchas suaves que aclaran la tela (dan volumen y más tonos)
            ys, xs = np.nonzero(cloth)
            n = np.array([_hash((x - f['neckX']) // 5, (y - f['neckY']) // 5, 7) for y, x in zip(ys, xs)])
            n2 = np.array([_hash((x - f['neckX']) // 3, (y - f['neckY']) // 3, 9) for y, x in zip(ys, xs)])
            t = np.clip(n * .7 + n2 * .3, 0, 1)
            sel = t > .55
            col = ramp_colors(opts['glow'], (t[sel] - .55) / .45)
            base = c[ys[sel], xs[sel], :3].astype(np.float32)
            c[ys[sel], xs[sel], :3] = (base * .55 + col * .45).astype(np.uint8)
        ch = opts.get('chest')
        if ch and i in info['frames'] and f['dir'] in ('down', 'side'):
            # el pecho se abre en cielo: lente vertical con borde de luz, fondo profundo y estrellas
            w, hgt = ch.get('size', [6, 9])
            cx = f['neckX'] + (3 if f['dir'] == 'side' else 0)
            cy = f['neckY'] + ch.get('dy', 9)
            if f['dir'] == 'side':
                w = max(3, w - 2)
            lens = np.zeros((CELL, CELL), np.uint8)
            if ch.get('shape') == 'ring':
                # eclipse anular: anillo de fuego con el centro negro (sol tapado)
                R = ch.get('r', 6) - (1 if f['dir'] == 'side' else 0)
                Y, X = np.mgrid[0:CELL, 0:CELL]
                d = np.hypot(X - cx, (Y - cy) * (1.0 if f['dir'] == 'down' else 1.0)) / R
                if f['dir'] == 'side':
                    d = np.hypot((X - cx) * 1.6, Y - cy) / R
                disk = (d <= 1.0) & (c[:, :, 3] > 0) & ~hm
                fire = disk & (d > .55)
                ph = (i * 37) % 7
                ang = np.degrees(np.arctan2(Y - cy, X - cx)) % 360
                flick = (np.sin(np.radians(ang) * 7 + ph) * .5 + .5)
                tf = np.clip((d - .55) / .45, 0, 1)
                col = ramp_colors(ch.get('fire', ["#fff2b0", "#ffb43a", "#e85a12", "#8a1e06"]), np.clip(tf * .8 + flick * .25 - .05, 0, 1)[fire])
                c[fire, :3] = col
                core = disk & (d <= .55)
                c[core, :3] = ramp_colors(["#030305", "#0c0a10", "#16121c"], (1 - d[core] / .55))
                # corona: lenguas sueltas por fuera, solo donde hay cuerpo detrás
                halo = (d > 1.0) & (d < 1.0 + .35 * flick) & (c[:, :, 3] > 0) & ~hm
                c[halo, :3] = (c[halo, :3].astype(np.float32) * .4 + np.array([255, 140, 40]) * .6).astype(np.uint8)
                cloth &= ~(disk | halo)
            else:
                cv2.ellipse(lens, (int(cx), int(cy)), (w, hgt), 0, 0, 360, 1, -1)
                lens = (lens > 0) & (c[:, :, 3] > 0) & ~hm
                if lens.any():
                    Y, X = np.mgrid[0:CELL, 0:CELL]
                    d = np.sqrt(((X - cx) / w) ** 2 + ((Y - cy) / hgt) ** 2)
                    t = np.clip(1 - d, 0, 1)
                    col = ramp_colors(ch.get('ramp', ["#05061a", "#0e1240", "#1c2470", "#3a46b0"]), t[lens] * .9 + .05)
                    c[lens, :3] = col
                    rim = lens & ~(cv2.erode(lens.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
                    c[rim, :3] = ramp_colors(ch.get('rim', ["#6f7cf2", "#c4ccff"]), (Y[rim] - cy + hgt) / (2 * hgt))
                    cloth |= lens & ~rim
        ys, xs = np.nonzero(cloth)
        for y, x in zip(ys, xs):
            u = _hash(x - f['neckX'], y - f['neckY'], 1)
            if u >= dens:
                continue
            tw = _hash(x - f['neckX'], y - f['neckY'], 10 + k)  # titileo
            col = ramp_colors(ramp, np.array([.45 + .55 * tw]))[0]
            c[y, x, :3] = col
            if u < dens * big:
                for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                    Y, X = y + dy, x + dx
                    if cloth[Y, X]:
                        c[Y, X, :3] = ramp_colors(ramp, np.array([.15 + .3 * tw]))[0]
    return atlas
