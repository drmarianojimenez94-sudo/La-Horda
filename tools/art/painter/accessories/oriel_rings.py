"""Oriel — dos anillos de fractura flotando a los costados (elipses ~9x13 px, rotos en un punto que deja salir
luz). Contorno oscuro de 1 px, banda con rampa de 4 tonos (luz arriba a la izquierda) y chispas en la grieta.
opts:
  ramp    4 tonos de la banda (oscuro -> claro)       outline  contorno
  glow    3 tonos de la luz que sale de la grieta (oscuro -> claro)
  bleed   true: la luz cae en gotas por debajo de cada anillo (Guardiana del Ojo Rojo)
  dx      separación horizontal desde el eje del cuello (default 27); dy altura respecto del mentón (default 10)
Solo se pintan sobre píxeles transparentes (los anillos quedan detrás del cuerpo y del arma)."""
import math
import numpy as np


def _hex(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [255], np.uint8)


def ring_sprite(o, crack_at=40, rx=4.6, ry=6.6):
    ramp = [_hex(c) for c in o.get('ramp', ['#5a1a2a', '#a8344e', '#e0708a', '#ffc2cc'])]
    ol = _hex(o.get('outline', '#140a10'))
    glow = [_hex(c) for c in o.get('glow', ['#c0304a', '#ff7088', '#fff0f2'])]
    px = {}
    W, H = int(rx * 2 + 4), int(ry * 2 + 4)
    cx, cy = W / 2 - .5, H / 2 - .5
    band = {}
    for y in range(H):
        for x in range(W):
            ex = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            ix = ((x - cx) / (rx - 1.9)) ** 2 + ((y - cy) / (ry - 2.3)) ** 2
            if ex <= 1 and ix > 1:
                ang = math.degrees(math.atan2(y - cy, x - cx)) % 360
                if abs((ang - crack_at + 180) % 360 - 180) < 16:
                    continue  # la fractura
                band[(x, y)] = ang
    for (x, y), ang in band.items():
        # luz arriba a la izquierda: tono por ángulo y por lado interior/exterior
        lt = math.cos(math.radians(ang - 225))
        outer = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > .62
        t = lt * .5 + .5 - (0 if outer else .18)
        j = int(np.clip(round(t * 3 + ((x + y) & 1) * .3 - .15), 0, 3))
        px[(x, y)] = ramp[j]
    for (x, y) in list(band):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in band and q not in px:
                px[q] = ol
    # luz que se escapa de la grieta
    ga = math.radians(crack_at)
    for k, (rr, g) in enumerate(((rx * .78, 2), (rx * 1.15, 1), (rx * 1.55, 0))):
        x = int(round(cx + rr * math.cos(ga) * (1 + k * .05)))
        y = int(round(cy + rr * math.sin(ga) * ry / rx))
        px[(x, y)] = glow[g]
    return px, W, H


def draw(atlas, info, o):
    CELL, COLS = info['CELL'], info['COLS']
    out = atlas.copy()
    sprites = [ring_sprite(o, crack_at=40), ring_sprite(o, crack_at=140)]
    drip = [_hex(c) for c in o.get('glow', ['#c0304a', '#ff7088', '#fff0f2'])]
    for i, f in info['frames'].items():
        i = int(i)
        r, c = divmod(i, COLS)
        cimg = out[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
        side = f['dir'] == 'side'
        for k, sgn in enumerate((-1, 1)):
            px, W, H = sprites[k]
            bob = round(math.sin((c + k * 2) * math.pi / 2) * 1.2)
            dx = o.get('dx', 27) * (0.8 if side else 1)
            x0 = int(round(f['neckX'] + sgn * dx - W / 2 + (-4 if side else 0)))
            y0 = int(round(f['neckY'] + o.get('dy', 10) - H / 2 + bob))
            for (x, y), col in px.items():
                X, Y = x0 + x, y0 + y
                if 0 <= X < CELL and 0 <= Y < CELL and cimg[Y, X, 3] == 0:
                    cimg[Y, X] = col
            if o.get('bleed'):
                for j, yy in enumerate((H + 1, H + 3, H + 6)):
                    if (c + j + k) % 3 == 2:
                        continue
                    X, Y = x0 + W // 2 - 1 + (j % 2), y0 + yy
                    if 0 <= X < CELL and 0 <= Y < CELL and cimg[Y, X, 3] == 0:
                        cimg[Y, X] = drip[min(2, j)] if j else drip[1]
    return out
