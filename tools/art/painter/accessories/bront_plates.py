"""Bront: placas sueltas que orbitan los hombros (una por hombro; de perfil, la del hombro visible).
Delante del cuerpo en la mitad baja de la órbita, detrás (solo en píxeles transparentes) en la alta.
opts: ramp (metal), size [w, h], spread (distancia al eje), orbit [ox, oy], rune (rampa de un grabado o null),
frost (rampa de escarcha en el borde de arriba o null)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from bront_lib import CELL, COLS, cell_view, shade, paste, ramp_colors

RAMP = ["#1a2632", "#3a5468", "#6a8aa2", "#a8c2d4", "#e2eef6"]


def plate_mask(cx, cy, w, h, tilt):
    m = np.zeros((CELL, CELL), np.uint8)
    box = cv2.boxPoints(((float(cx), float(cy)), (float(w), float(h)), float(tilt)))
    cv2.fillPoly(m, [np.round(box).astype(np.int32)], 1)
    # esquinas redondeadas: quita los píxeles con menos de 3 vecinos
    k = cv2.filter2D(m, -1, np.ones((3, 3), np.uint8), borderType=cv2.BORDER_CONSTANT)
    m[(k < 5)] = 0
    return m > 0


def draw(atlas, info, opts):
    ramp = opts.get('ramp', RAMP); w, h = opts.get('size', [7, 9]); sp = opts.get('spread', 19)
    ox, oy = opts.get('orbit', [3, 3])
    for i, f in info['frames'].items():
        c = cell_view(atlas, i)
        k = i % COLS
        nx, ny = f['neckX'], f['neckY']
        sides = (-1, 1) if f['dir'] in ('down', 'up') else (-1,)
        for s in sides:
            ph = k * np.pi / 2 + (0 if s < 0 else np.pi)
            cx = nx + s * sp + ox * np.cos(ph) + (4 if f['dir'] == 'side' else 0)
            cy = ny - 1 + oy * np.sin(ph)
            front = np.sin(ph) >= 0
            m = plate_mask(cx, cy, w, h, s * 18 + 10 * np.cos(ph))
            rgb, _ = shade(m, ramp, round_w=.35, jitter=.05, seed=i * 3 + (s > 0), outline=opts.get('outline', '#0b0d12'))
            inner = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
            if opts.get('rune'):
                ys, xs = np.nonzero(inner)
                if len(ys):
                    my, mx = int(ys.mean()), int(xs.mean())
                    for dy, dx in ((-2, 0), (-1, 0), (0, 0), (1, 0), (0, -1), (0, 1), (2, -1), (2, 1)):
                        if 0 <= my + dy < CELL and 0 <= mx + dx < CELL and inner[my + dy, mx + dx]:
                            rgb[my + dy, mx + dx] = ramp_colors(opts['rune'], np.array([.5 + .5 * ((dy + dx) % 2)]))[0]
            if opts.get('frost'):
                ys, xs = np.nonzero(inner)
                if len(ys):
                    top = inner & (np.arange(CELL)[:, None] <= ys.min() + 1)
                    rgb[top] = ramp_colors(opts['frost'], np.random.default_rng(i).random(top.sum()))
            paste(c, rgb, m, behind=not front)
    return atlas
