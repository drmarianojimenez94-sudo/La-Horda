"""Khepri (Plaga de Ceniza): polillas de hollín que revolotean alrededor del cuerpo.
Cada polilla sigue una órbita fija y avanza un paso por columna (animación de 4 cuadros); alas abiertas/cerradas
alternan. opts: n, ramp (alas), spot (manchas claras), radius [rx, ry]."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from khepri_lib import CELL, COLS, cell_view, ramp_colors, hexrgb

RAMP = ["#141214", "#2a2629", "#4a4448", "#6e676a"]
SPOT = ["#9a8f86", "#c9bdb0"]

# polilla 7x5: 1 contorno, 2 ala oscura, 3 ala clara, 4 cuerpo, 5 mancha
OPEN = ["1.....1", "121.121", "1234321", ".15451.", "..1.1.."]
SHUT = ["..1.1..", ".12121.", ".13431.", "..141..", "...1..."]


def draw(atlas, info, opts):
    ramp = opts.get('ramp', RAMP); spot = opts.get('spot', SPOT)
    n = opts.get('n', 3); rx, ry = opts.get('radius', [30, 22])
    pal = {'1': hexrgb(opts.get('outline', '#0b090b')), '2': ramp_colors(ramp, np.array([.25]))[0],
           '3': ramp_colors(ramp, np.array([.75]))[0], '4': ramp_colors(ramp, np.array([.05]))[0],
           '5': ramp_colors(spot, np.array([.6]))[0]}
    for i, f in info['frames'].items():
        c = cell_view(atlas, i)
        col = i % COLS
        cx, cy = f['neckX'], f['neckY'] + 6
        for k in range(n):
            a = 2 * np.pi * (k / n) + col * .55 + k * .9
            x = int(cx + rx * np.cos(a) + 3 * np.sin(col * 1.7 + k))
            y = int(cy - 4 + ry * np.sin(a) * .8 - 6 * (k % 2))
            spr = OPEN if (col + k) % 2 == 0 else SHUT
            for dy, row in enumerate(spr):
                for dx, ch in enumerate(row):
                    if ch == '.':
                        continue
                    X, Y = x + dx - 3, y + dy - 2
                    if 0 <= X < CELL and 0 <= Y < CELL and c[Y, X, 3] == 0:
                        c[Y, X, :3] = pal[ch]; c[Y, X, 3] = 255
    return atlas
