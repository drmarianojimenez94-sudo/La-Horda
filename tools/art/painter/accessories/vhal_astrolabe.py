"""Vhal: astrolabio roto que orbita la mano. Se busca la mano (piel por debajo del cuello, la mancha más
alejada del eje); el anillo (elipse inclinada con un tramo faltante y una aguja) gira alrededor de ella: va
delante del cuerpo en la mitad baja de la órbita y detrás en la alta.
opts: ramp (metal), core (gema central), r [rx, ry], orbit [ox, oy], gap (grados faltantes)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from vhal_lib import CELL, COLS, cell_view, ramp_colors, hexrgb

RAMP = ["#4a3010", "#8a6420", "#d2a640", "#f8e39a"]
CORE = ["#3a46c8", "#8f9cff", "#ffffff"]


def find_hand(c, f):
    lab = cv2.cvtColor(c[:, :, :3], cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[:, :, 0] * 100 / 255; A = lab[:, :, 1] - 128; B = lab[:, :, 2] - 128
    h = np.degrees(np.arctan2(B, A)) % 360; C = np.hypot(A, B)
    sk = (c[:, :, 3] > 0) & (L > 50) & (L < 93) & (C > 8) & (C < 48) & (h > 30) & (h < 82)
    sk[:f['neckY'] + 6] = False
    n, comp, st, cen = cv2.connectedComponentsWithStats(sk.astype(np.uint8), connectivity=8)
    best, bd = None, 0
    for j in range(1, n):
        if st[j, cv2.CC_STAT_AREA] < 3:
            continue
        d = abs(cen[j][0] - f['neckX'])
        if d > bd:
            best, bd = cen[j], d
    return best


def ring(cx, cy, rx, ry, ang, gap, phase, w=1):
    m = np.zeros((CELL, CELL), np.uint8)
    g0 = (phase * 57) % 360
    cv2.ellipse(m, (int(cx), int(cy)), (rx, ry), ang, g0 + gap, g0 + 360, 1, w)
    return m > 0


def draw(atlas, info, opts):
    ramp = opts.get('ramp', RAMP); core = opts.get('core', CORE)
    rx, ry = opts.get('r', [7, 4]); gap = opts.get('gap', 70)
    ox, oy = opts.get('orbit', [5, 3]); outline = hexrgb(opts.get('outline', '#120c10'))
    for i, f in info['frames'].items():
        c = cell_view(atlas, i)
        k = i % COLS
        hand = find_hand(c, f)
        if hand is None:
            side = 1 if f['dir'] != 'up' else -1
            hand = (f['neckX'] + side * 16, f['neckY'] + 16)
        ph = k * (np.pi / 2) + i * .3
        cx = hand[0] + ox * np.cos(ph) + (6 if hand[0] >= f['neckX'] else -6)
        cy = hand[1] - 6 + oy * np.sin(ph)
        front = np.sin(ph) > -0.2
        w = opts.get('width', 1)
        m = ring(cx, cy, rx, ry, 20 + 25 * np.sin(ph), gap, i, w)
        m2 = ring(cx, cy, max(2, rx - 4), max(2, ry - 2), -30, gap + 40, i + 3, 1)  # anillo interior, también roto
        body = m | m2
        out = (cv2.dilate(body.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & ~body
        Y, X = np.mgrid[0:CELL, 0:CELL]
        t = 1 - ((X - cx + rx) / (2 * rx + 1) * .5 + (Y - cy + ry) / (2 * ry + 1) * .5)
        t = np.clip(t + np.random.default_rng(i).normal(0, .06, t.shape), 0, 1)
        sel_o = out & ((c[:, :, 3] == 0) | front)
        c[sel_o, :3] = outline; c[sel_o, 3] = 255
        sel = body & ((c[:, :, 3] == 0) | front)
        c[sel, :3] = ramp_colors(ramp, t[sel]); c[sel, 3] = 255
        # gema / estrella central y aguja
        gx, gy = int(round(cx)), int(round(cy))
        if 1 <= gx < CELL - 1 and 1 <= gy < CELL - 1:
            for (dy, dx), tt in (((0, 0), .9), ((0, 1), .5), ((1, 0), .3), ((0, -1), .4), ((-1, 0), .6)):
                if front or c[gy + dy, gx + dx, 3] == 0:
                    c[gy + dy, gx + dx, :3] = ramp_colors(core, np.array([tt]))[0]; c[gy + dy, gx + dx, 3] = 255
    return atlas
