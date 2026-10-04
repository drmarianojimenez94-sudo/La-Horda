"""Facu GM — corona de corrientes (accesorio del Pintor).

Tres crestas de agua (la del centro más alta) sobre una vincha fina de bronce/oro, encajada en el pelo.
Se dibuja píxel a píxel con el lenguaje del roster: contorno oscuro de 1 px, rampa de 4-5 tonos, luz desde
arriba a la izquierda (lado izquierdo de cada cresta más claro), espuma en las puntas.
Las crestas suben y bajan un píxel según el cuadro (oleaje). De perfil la corona se angosta y las crestas se
inclinan hacia atrás; de espaldas se ve la vincha entera. En la muerte no se dibuja (la corona "se deshace").

Necesita facu_head antes (deja en info['frames'][i]['facuHead'] dónde quedó la cabeza).
opts: water (rampa de las crestas, oscuro→claro, 5 tonos), metal (rampa de la vincha, 4 tonos), outline, scale (ancho
relativo), crestScale (ancho de cresta: < 1 = púas de hueso), heightAdd (px extra de alto), wave (amplitud del oleaje).
"""
import numpy as np

DEF_WATER = ['#0b3f5e', '#137a86', '#26b7b0', '#7fe6da', '#e6fffa']
DEF_METAL = ['#5e3c12', '#9a6a26', '#d3a24c', '#f3d98c']
DEF_OUT = '#08142a'


def _rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


def _crown(width, crests, lean, phase, palette, curve=0):
    """Lienzo RGBA del tamaño justo. crests: [(x centro relativo 0..1, alto, medio ancho)]."""
    water, metal, out, _ = palette
    H = max(h for _, h, _ in crests) + 5 + palette[3]['heightAdd']
    W = width + 2
    fill = np.zeros((H, W), np.int8) - 1     # -1 vacío; 0..4 agua; 10..13 metal
    band_y = H - 3                           # vincha: 2 filas, luego contorno
    for x in range(1, W - 1):
        fill[band_y, x] = 12 if x < W * .45 else 11
        fill[band_y + 1, x] = 10 if (x % 4) else 11
    # gema de espuma en el centro de la vincha (agua engarzada)
    cxm = W // 2
    fill[band_y, cxm] = 3
    for k, (fx, h, hw) in enumerate(crests):
        h = max(2, h + int(round(np.sin(phase + k * 2.1) * palette[3]['wave'])) + palette[3]['heightAdd'])
        hw = hw * palette[3]['crestScale']
        cx = 1 + fx * (width - 1)
        for dy in range(1, h + 1):
            y = band_y - dy
            t = dy / h                                   # 0 abajo .. 1 punta
            half = max(0.0, hw * (1 - t ** 1.4))
            c = cx + lean * t * 1.6                      # de perfil la cresta se inclina hacia atrás
            x0, x1 = int(np.floor(c - half + .5)), int(np.floor(c + half + .5))
            for x in range(x0, x1 + 1):
                if not 0 < x < W - 1 or y < 1:
                    continue
                rel = (x - (c - half)) / max(2 * half, 1)   # 0 izquierda .. 1 derecha
                tone = 3 - rel * 2.4 + (t - .5) * 1.2       # luz arriba-izquierda
                fill[y, x] = int(np.clip(round(tone), 0, 3))
            if dy == h:
                xt = int(np.floor(c + .5))
                if 0 < xt < W - 1 and y >= 1:
                    fill[y, xt] = 4                       # espuma en la punta
    if curve:
        # la vincha abraza la cabeza: los extremos bajan 'curve' px (parábola)
        f2 = np.full((H + curve, W), -1, np.int8)
        for x in range(W):
            d = int(round(curve * ((x - (W - 1) / 2) / ((W - 1) / 2)) ** 2))
            f2[d:d + H, x] = fill[:, x]
        fill, H = f2, H + curve
    img = np.zeros((H, W, 4), np.uint8)
    for v, col in [(i, water[i]) for i in range(5)] + [(10 + i, metal[i]) for i in range(4)]:
        img[fill == v, :3] = _rgb(col)
        img[fill == v, 3] = 255
    # contorno de 1 px (4-vecinos) alrededor de todo
    solid = fill >= 0
    pad = np.pad(solid, 1)
    nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    ol = nb & ~solid
    img[ol, :3] = _rgb(out)
    img[ol, 3] = 255
    return img


def draw(atlas, info, opts):
    shape = {'crestScale': opts.get('crestScale', 1.0), 'heightAdd': opts.get('heightAdd', 0), 'wave': opts.get('wave', 1.0)}
    pal = (opts.get('water', DEF_WATER), opts.get('metal', DEF_METAL), opts.get('outline', DEF_OUT), shape)
    CELL, COLS = info['CELL'], info['COLS']
    scale = opts.get('scale', 1.0)
    out = atlas.copy()
    for i, fi in info['frames'].items():
        h = fi.get('facuHead')
        if not h:
            continue
        col = i % COLS
        phase = col * np.pi / 2
        hw = h['x1'] - h['x0'] + 1
        if h['dir'] == 'side':
            facing = 1 if h['faceX'] > h['cx'] else -1
            width = int(round(hw * .42 * scale))
            crests = [(.25, 3, 1.6), (.6, 4, 2.0), (.92, 2, 1.2)] if facing < 0 else [(.08, 2, 1.2), (.4, 4, 2.0), (.75, 3, 1.6)]
            img = _crown(width, crests, -facing, phase, pal, opts.get('curveSide', 1))
            cx = h['cx'] - facing * 2.5
        else:
            width = int(round(hw * .58 * scale))
            crests = [(.14, 3, 1.6), (.5, 5, 2.4), (.86, 3, 1.6)]
            img = _crown(width, crests, 0, phase, pal, opts.get('curve', 3))
            cx = h['cx'] + (.5 if h['dir'] == 'down' else 0)
        Hc, Wc = img.shape[:2]
        x0 = int(round(cx - Wc / 2))
        span = [h['colTop'].get(x) for x in range(x0 + 2, x0 + Wc - 2)]
        span = [s for s in span if s is not None]
        base = int(np.percentile(span, 80)) if span else h['top'] + 3
        # la vincha (filas Hc-3..Hc-2) queda dentro del pelo: 'sink' px por debajo del borde típico (percentil 80)
        cv_ = opts.get('curveSide', 1) if h['dir'] == 'side' else opts.get('curve', 3)
        y0 = base + opts.get('sink', 2) - (Hc - 3 - cv_)
        r, c = divmod(i, COLS)
        cellv = out[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
        for yy in range(Hc):
            for xx in range(Wc):
                if img[yy, xx, 3] == 0:
                    continue
                Y, X = y0 + yy, x0 + xx
                if 0 <= Y < CELL and 0 <= X < CELL:
                    # el contorno no tapa pelo opaco por debajo de la vincha (se funde con el pelo)
                    cellv[Y, X] = img[yy, xx]
    return out
