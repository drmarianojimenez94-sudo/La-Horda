"""Nano GM (skin Eclipse Dorado) — halo de eclipse detrás de la nuca.

Disco oscuro (la luna) con corona de oro de 2 px y un "anillo de diamante" (destello en arriba-izquierda), centrado
detrás de la cabeza y algo más bajo que su centro (a la altura de la nuca). Frente y perfil: detrás de todo (solo
píxeles transparentes). Espalda: el halo queda entre la nuca y quien mira, así que se dibuja encima del pelo SOLO el
aro (sin disco), para no tapar la cabeza. Muerte: sin halo.
opts: radius, ring ["#oscuro", "#medio", "#claro"], disc "#hex", flare "#hex", outline "#hex".
"""
import numpy as np
import cv2

CELL = 112


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def lerp_ramp(cols, t):
    cols = np.array([hexrgb(c) for c in cols])
    pos = np.clip(t, 0, 1) * (len(cols) - 1)
    k = np.clip(np.floor(pos).astype(int), 0, len(cols) - 2)
    f = (pos - k)[..., None]
    return cols[k] * (1 - f) + cols[k + 1] * f


def draw(atlas, info, opts):
    COLS = info['COLS']
    R = opts.get('radius', 17)
    ring = opts.get('ring', ['#7a4e16', '#c9922e', '#f2cf6a', '#fff2c4'])
    disc = hexrgb(opts.get('disc', '#1a1222'))
    disc2 = hexrgb(opts.get('disc2', '#2a1d36'))
    flare = hexrgb(opts.get('flare', '#fffbe8'))
    outline = hexrgb(opts.get('outline', '#1a1016'))
    out = atlas.copy()
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    rng = np.random.default_rng(3)
    noise = rng.normal(0, 4, (CELL, CELL, 3)).astype(np.float32)
    for i in range(32):
        row, col = divmod(i, COLS)
        f = info['frames'].get(i)
        if f is None:
            continue
        d = info['ROW_DIR'][row]
        sl = (slice(row * CELL, (row + 1) * CELL), slice(col * CELL, (col + 1) * CELL))
        c = out[sl]
        hm = info['headmap'][sl]
        ys, xs = np.where(hm)
        if not len(xs):
            continue
        cx = float(np.median(xs))
        top = ys.min(); ny = f['neckY']
        cy = top + (ny - top) * .52
        if d == 'side':
            cx -= 5           # detrás de la nuca: corrido hacia la espalda
        r = np.hypot(yy - cy, xx - cx)
        ringm = (r >= R - 2.2) & (r < R + .6)
        outer = (r >= R + .6) & (r < R + 1.6)
        inner = (r >= R - 3.2) & (r < R - 2.2)
        discm = r < R - 2.2
        ang = np.arctan2(yy - cy, xx - cx)
        # luz de arriba-izquierda sobre el aro; destello del eclipse en ~ -135°
        lt = .5 - .5 * np.cos(ang - np.radians(-135))
        col_ring = lerp_ramp(ring, 1 - lt * .85) + noise * .6
        fl = ringm & (np.abs(((ang - np.radians(-135)) + np.pi) % (2 * np.pi) - np.pi) < .22)
        a = c[:, :, 3] > 0
        if d == 'up':
            paint_ring = (ringm | outer | inner) & ~a | (ringm & hm)
            paint_disc = discm & ~a
        else:
            paint_ring = (ringm | outer | inner) & ~a
            paint_disc = discm & ~a
        # disco: luna oscura con un leve degradé
        t = np.clip((r / max(R, 1)), 0, 1)[..., None]
        dc = disc2 * (1 - t) + disc * t + noise * .4
        c[paint_disc, :3] = np.clip(dc[paint_disc], 0, 255).astype(np.uint8); c[paint_disc, 3] = 255
        c[paint_ring & ringm, :3] = np.clip(col_ring[paint_ring & ringm], 0, 255).astype(np.uint8)
        c[paint_ring & ringm, 3] = 255
        c[paint_ring & (outer | inner) & ~ringm, :3] = outline.astype(np.uint8)
        c[paint_ring & (outer | inner) & ~ringm, 3] = 255
        c[fl & paint_ring, :3] = flare.astype(np.uint8)
    return out
