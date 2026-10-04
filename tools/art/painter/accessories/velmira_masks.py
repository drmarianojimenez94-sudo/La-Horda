"""Velmira — cuatro máscaras de teatro flotando en semicírculo detrás de la cabeza.

opts:
  ramp     4 tonos de la máscara de comedia (oscuro -> claro), luz arriba a la izquierda
  ramp2    (opcional) 4 tonos de la máscara de tragedia
  outline  contorno (1 px)
  hole     color de ojos/boca
  trim     (opcional) 2 tonos del ribete de la frente (oro, etc.)
  feather  (opcional) 3 tonos: pluma que sale de cada máscara (Mascarada Veneciana)
  featherOn índices de las máscaras con pluma (default todas)
  crack    (opcional) color de grieta: porcelana rajada (Réquiem Blanco)
  radius   separación extra sobre el radio de la cabeza (default 7)
  override {"<cuadro>": [arriba, mentón, x]} cuando el cuello del ensamble no sirve
  death    true: dos máscaras caídas junto al cuerpo en el último cuadro de la muerte
Las máscaras se pintan solo sobre píxeles transparentes (quedan detrás del cuerpo), salvo de espaldas, donde la
cabeza queda delante del público y las máscaras también."""
import math
import numpy as np


def _hex(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


# 0 vacío, 1 contorno, 2 cara, 3 agujero (ojo/boca), 4 ribete
COMEDY = [
    ".1111111.",
    "144444441",
    "122222221",
    "133222331",
    "122222221",
    "132222231",
    ".1333331.",
    "..12221..",
    "...111...",
]
TRAGEDY = [
    ".1111111.",
    "144444441",
    "122222221",
    "123323321",
    "122222221",
    "122333221",
    ".1322231.",
    "..12221..",
    "...111...",
]


def mask_pixels(kind, o, plume=True, left=False):
    """Lista de (dx, dy, rgba) de una máscara de 8x8 con sombreado de 4 tonos (luz arriba-izquierda)."""
    ramp = [_hex(c) for c in (o.get('ramp2') if kind == 1 and o.get('ramp2') else o.get('ramp', ['#6b5a4a', '#b8a58a', '#e6d8bd', '#fff6e2']))]
    outline = _hex(o.get('outline', '#1a1016'))
    hole = _hex(o.get('hole', '#241420'))
    trim = [_hex(c) for c in o.get('trim', [])]
    tpl = COMEDY if kind == 0 else TRAGEDY
    px = []
    for y, row in enumerate(tpl):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            if ch == '1':
                col = outline
            elif ch == '3':
                col = hole
            elif ch == '4' and not trim:
                col = ramp[3] if x <= 4 else ramp[2]
            elif ch == '4' and trim:
                col = trim[1] if x <= 4 else trim[0]
            else:
                # luz por posición: arriba-izquierda claro, abajo-derecha oscuro (4 tonos, dither suave en el medio)
                t = 1 - (x * .55 + y * .75) / (8 * .55 + 8 * .75)
                t = t * 1.25 - .05
                j = int(np.clip(round(t * 3 + (((x + y) & 1) * .35 - .17)), 0, 3))
                col = ramp[j]
            px.append((x, y, np.array([*col, 255], np.uint8)))
    if o.get('crack'):
        cc = _hex(o['crack'])
        for (x, y) in ((6, 1), (5, 2), (6, 4), (5, 5)) if kind == 0 else ((2, 1), (3, 2), (2, 4)):
            px = [p for p in px if not (p[0] == x and p[1] == y)]
            px.append((x, y, np.array([*cc, 255], np.uint8)))
    if o.get('feather') and plume:
        fr = [_hex(c) for c in o['feather']]
        # pluma: penacho de 3 px de ancho que sube y se abre hacia afuera (luz a la izquierda)
        rows = {-1: (6, 7), -2: (6, 8), -3: (7, 9), -4: (7, 9), -5: (8, 9), -6: (9, 9)}
        pts = []
        for y, (x0, x1) in rows.items():
            for x in range(x0, x1 + 1):
                s_ = 2 if x == x0 else (0 if x == x1 and x1 > x0 else 1)
                pts.append((x, y, s_))
        if left:  # la pluma se abre hacia afuera del semicírculo
            pts = [(8 - x, y, s_) for x, y, s_ in pts]
        have = {(x, y) for x, y, _ in pts}
        for x, y, s_ in pts:
            px.append((x, y, np.array([*fr[s_], 255], np.uint8)))
        for x, y, _ in pts:
            for ddx, ddy in ((1, 0), (-1, 0), (0, -1), (0, 1)):
                q = (x + ddx, y + ddy)
                if q not in have and q[1] < 0:
                    have.add(q)
                    px.append((q[0], q[1], np.array([*outline, 255], np.uint8)))
    return px


def stamp(cell_img, px, ox, oy, over=False):
    H, W = cell_img.shape[:2]
    for x, y, c in px:
        X, Y = ox + x, oy + y
        if 0 <= X < W and 0 <= Y < H and (over or cell_img[Y, X, 3] == 0):
            cell_img[Y, X] = c


def draw(atlas, info, o):
    CELL, COLS = info['CELL'], info['COLS']
    frames = {int(k): v for k, v in info['frames'].items()}
    for k, v in (o.get('override') or {}).items():
        frames[int(k)] = {'top': v[0], 'neckY': v[1], 'neckX': v[2], 'dir': 'down'}
    out = atlas.copy()
    sprites = [mask_pixels(k % 2, o, k in o.get('featherOn', [0, 1, 2, 3]), k < 2) for k in range(4)]
    for i, f in frames.items():
        r, c = divmod(i, COLS)
        cimg = out[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
        hh = f['neckY'] - f['top']
        cx = f['neckX']
        cy = f['top'] + hh * .42
        R = hh * .5 + o.get('radius', 4)
        d = f['dir']
        if d == 'side':
            cx -= 3
            angs = [-185, -145, -105, -68]
        else:
            angs = [-168, -128, -52, -12]
        alpha = cimg[:, :, 3] > 0
        for k, a in enumerate(angs):
            bob = round(math.sin((c + k * 1.3) * math.pi / 2))
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            # borde de la silueta en esa dirección: la máscara asoma por detrás (≈ 2/3 visible)
            edge = R * .6
            for rr in range(int(R * .4), int(R * 1.6)):
                X, Y = int(round(cx + rr * ca)), int(round(cy + rr * sa * .85))
                if 0 <= X < CELL and 0 <= Y < CELL and alpha[Y, X]:
                    edge = rr
            rr = max(edge + o.get('out', 2), R * .8)
            x = cx + rr * ca - 4
            y = cy + rr * .85 * sa - 5 + bob
            stamp(cimg, sprites[k], int(round(x)), int(round(y)), over=(d == 'up'))
    if o.get('death', True):
        # muerte: dos máscaras caídas en el suelo, a los lados del cuerpo (último cuadro)
        i = 8 * COLS + 3
        r, c = divmod(i, COLS)
        cimg = out[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
        m = cimg[:, :, 3] > 0
        ys, xs = np.where(m)
        if len(ys):
            by = ys.max()
            stamp(cimg, sprites[0], xs.min() - 6, by - 7)
            stamp(cimg, sprites[3], xs.max() - 1, by - 8)
    return out
