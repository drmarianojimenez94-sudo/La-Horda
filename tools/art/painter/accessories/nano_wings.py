"""Nano GM — alas del Umbral: una de LUZ (plumas marfil/oro, lisas, con brillos suaves) y una de SOMBRA (negra/violeta,
bordes deshilachados), asimétricas y semimaterializadas (las puntas se deshacen en esquirlas/motas).

Geometría en espacio local (u hacia afuera, v hacia abajo, ancla en el hombro) → se espeja para el lado izquierdo →
se sombrea en pantalla con luz de arriba a la izquierda (rampa de 4-5 tonos, contorno oscuro de 1 px, separación
entre plumas un tono más oscura, sin antialias).
  frente (down): sombra a la izquierda de la pantalla (lado del Brazo del Umbral), luz a la derecha; detrás del cuerpo.
  perfil (side, mira a la derecha): la de sombra sale de la espalda; la de luz asoma más alta por detrás.
  espalda (up): ambas por delante de la espalda (luz a la izquierda, sombra a la derecha), debajo de la cabeza.
  muerte: sin alas (se desvanecen) salvo unas motas.
opts: lightRamp, shadowRamp, edge (bordes de la luz, p. ej. oro batido en la skin), outline, scale.
"""
import numpy as np
import cv2

CELL = 112
OUT = '#1a1016'


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


def _poly(mask_id, pts, fid):
    cv2.fillPoly(mask_id, [np.round(np.array(pts)).astype(np.int32)], int(fid), lineType=cv2.LINE_8)


def feather(ids, base, ang, ln, w, fid, P, split=False):
    """pluma: base (u, v), ángulo en grados (0 = afuera, 90 = abajo), largo, ancho de base."""
    r = np.radians(ang)
    d = np.array([np.cos(r), np.sin(r)]); nrm = np.array([-d[1], d[0]])
    b = np.array(base, float)
    p1 = b + nrm * w / 2; p2 = b - nrm * w / 2
    m1 = b + d * ln * .7 + nrm * w * .42; m2 = b + d * ln * .7 - nrm * w * .42
    tip = b + d * ln
    if split:   # punta partida (ala de sombra)
        t1 = tip + nrm * w * .35; t2 = tip - nrm * w * .35 - d * 2.5
        notch = b + d * ln * .8
        pts = [p1, m1, t1, notch, t2, m2, p2]
    else:
        tr = b + d * (ln - 1.5) + nrm * w * .25; tl = b + d * (ln - 1.5) - nrm * w * .25
        pts = [p1, m1, tr, tip, tl, m2, p2]
    _poly(ids, [P(*q) for q in pts], fid)


def wing_ids(kind, flap=0.0, scale=1.0, squash=1.0, seed=0):
    """mapa de ids de pluma en un lienzo local, ancla (hombro) en (4, 40). kind: 'light' | 'shadow'.
    Hueso: raíz -> codo -> muñeca subiendo por encima del hombro; plumas colgando en abanico (de abajo junto al
    cuerpo a afuera-abajo en la punta), cobertoras cortas encima, borde de ataque grueso."""
    S = 72
    ids = np.zeros((S, S), np.int32)
    ax, ay = 4, 40
    rng = np.random.default_rng(seed)

    def P(u, v):
        return (ax + u * scale, ay + v * scale * squash)
    if kind == 'light':
        bone = [(0, 0), (8, -12 + flap * .5), (19, -19 + flap), (25, -17 + flap)]
    else:
        bone = [(0, 0), (8, -9 + flap * .5), (18, -14 + flap), (24, -10 + flap)]

    def at(t):  # punto del hueso (polilínea) en t 0..1
        seg = np.array(bone, float)
        lens = np.r_[0, np.cumsum(np.hypot(*np.diff(seg, axis=0).T))]
        x = t * lens[-1]
        k = min(int(np.searchsorted(lens, x, side='right')) - 1, len(seg) - 2)
        f = (x - lens[k]) / max(lens[k + 1] - lens[k], 1e-6)
        return seg[k] * (1 - f) + seg[k + 1] * f
    fid = 1
    if kind == 'light':
        n = 8
        # de afuera hacia adentro: las de adentro quedan encima
        for k in reversed(range(n)):
            t = .12 + .88 * k / (n - 1)
            ang = 100 - 42 * t
            ln = 13 + 12 * t ** 1.3
            feather(ids, at(t), ang, ln, 5.2 - .8 * t, fid, P)
            fid += 1
        for k in reversed(range(5)):   # cobertoras
            t = .08 + .7 * k / 4
            feather(ids, at(t) + np.array([0, 1.5]), 95 - 30 * t, 7 + 2 * t, 5, fid, P)
            fid += 1
    else:
        n = 7
        lens = [11, 15, 12, 18, 14, 21, 16]
        for k in reversed(range(n)):
            t = .1 + .9 * k / (n - 1)
            ang = 98 - 38 * t + rng.integers(-4, 5)
            feather(ids, at(t), ang, lens[k] + rng.integers(-1, 2), 4.6 - .6 * t, fid, P, split=(k % 2 == 1))
            fid += 1
        for k in reversed(range(4)):
            t = .08 + .6 * k / 3
            feather(ids, at(t) + np.array([0, 1.5]), 92 - 25 * t, 6 + 2 * t, 4.5, fid, P, split=True)
            fid += 1
    # borde de ataque (hueso), 3 px
    pts = [P(*at(t)) for t in np.linspace(0, 1, 14)]
    pts2 = [P(*(at(t) + np.array([0, 2.6]))) for t in np.linspace(1, 0, 14)]
    _poly(ids, pts + pts2, fid); fid += 1
    if kind == 'shadow':  # garra en la muñeca
        u, v = at(1)
        _poly(ids, [P(u - 2, v), P(u + 4, v - 4), P(u + 1, v + 2)], fid)
    return ids, (ax, ay)


def shade(ids, kind, ramp, outline, edge=None, origin=(0, 0), bias=None):
    """ids en pantalla -> RGBA. Luz de arriba-izquierda; plumas separadas por un tono; contorno 1 px."""
    H, W = ids.shape
    m = ids > 0
    if bias is None:
        bias = (1.15, -.12) if kind == 'light' else (.95, -.2)
    out = np.zeros((H, W, 4), np.uint8)
    if not m.any():
        return out
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    yy, xx = np.mgrid[0:H, 0:W]
    gy = (yy - y0) / max(1, y1 - y0)
    gx = (xx - x0) / max(1, x1 - x0)
    # luz: arriba-izquierda; dentro de cada pluma, el borde de arriba-izquierda más claro
    b = 1.05 - (.7 * gy + .3 * gx)
    up = np.roll(ids, 1, 0); lf = np.roll(ids, 1, 1)
    dn = np.roll(ids, -1, 0); rt = np.roll(ids, -1, 1)
    first = m & ((up != ids) | (lf != ids))
    last = m & (((dn != ids) & (dn > 0)) | ((rt != ids) & (rt > 0)))
    b = b + .25 * first - .32 * last
    b = b * bias[0] + bias[1]
    n = len(ramp)
    # sombreado continuo entre los tonos de la rampa (como la pintura del roster), con un leve corrimiento por pluma
    labr = cv2.cvtColor(np.array([hexrgb(c) for c in ramp])[None], cv2.COLOR_RGB2LAB)[0].astype(np.float32)
    pos = np.clip(b * (n - 1), 0, n - 1)
    k = np.clip(np.floor(pos).astype(int), 0, n - 2)
    f = (pos - k)[..., None]
    lab = labr[k] * (1 - f) + labr[k + 1] * f
    rng = np.random.default_rng(int(ids.sum()) % 9973)
    jit = rng.normal(0, 1.6, (int(ids.max()) + 1, 3)).astype(np.float32); jit[:, 0] *= .6
    lab = lab + jit[ids]
    lab += np.random.default_rng(7).normal(0, .9, lab.shape).astype(np.float32) * np.array([1.2, .7, .7], np.float32)
    rgb = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
    out[m, :3] = rgb[m]
    out[m, 3] = 255
    # bordes de la luz (oro batido en la skin): la fila de arriba de cada pluma
    if edge is not None:
        e = m & (up != ids) & (gy < .75)
        out[e, :3] = hexrgb(edge)
    # contorno
    sil = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    out[sil, :3] = hexrgb(outline)
    return out


def dissolve(img, kind, seed, frac_y=.62):
    """semimaterializada: la parte baja de las plumas se deshace (huecos, esquirlas)."""
    a = img[:, :, 3] > 0
    if not a.any():
        return img
    ys = np.where(a.any(1))[0]
    y0, y1 = ys.min(), ys.max()
    cut = y0 + (y1 - y0) * frac_y
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
    # bandas horizontales con huecos de 1 px que crecen hacia la punta
    low = a & (yy > cut)
    t = (yy - cut) / max(1, y1 - cut)
    if kind == 'light':
        holes = low & (((yy + (xx // 3)) % 4 == 0) & (t > .25))
    else:
        holes = low & ((rng.random(a.shape) < .18 + .45 * t))
    img = img.copy()
    img[holes] = 0
    return img


def place(dst, src, ox, oy, mode, keep=None):
    """pega src (RGBA) en dst con su esquina en (ox, oy). mode 'behind': solo donde dst es transparente."""
    h, w = src.shape[:2]
    y0, x0 = max(0, oy), max(0, ox)
    y1, x1 = min(CELL, oy + h), min(CELL, ox + w)
    if y1 <= y0 or x1 <= x0:
        return
    s = src[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    d = dst[y0:y1, x0:x1]
    sa = s[:, :, 3] > 0
    if mode == 'behind':
        sa &= d[:, :, 3] == 0
    if keep is not None:
        sa &= ~keep[y0:y1, x0:x1]
    d[sa] = s[sa]


def head_center(hm):
    ys, xs = np.where(hm)
    if not len(xs):
        return None
    return int(np.median(xs)), int(ys.min()), int(ys.max())


def draw(atlas, info, opts):
    COLS = info['COLS']
    headmap = info['headmap']
    light = opts.get('lightRamp', ['#8a6a3a', '#c9a25a', '#e8c56a', '#f6e3a8', '#fff4d6'])
    dark = opts.get('shadowRamp', ['#130c1c', '#22163a', '#382558', '#563b80', '#8466b4'])
    outline = opts.get('outline', OUT)
    edge = opts.get('edge')
    sedge = opts.get('shadowEdge')
    out = atlas.copy()
    flaps = [0, -2, -1, 1]
    for i in range(32):
        row, col = divmod(i, COLS)
        d = info['ROW_DIR'][row]
        f = info['frames'].get(i)
        if f is None:
            continue
        c = out[row * CELL:(row + 1) * CELL, col * CELL:(col + 1) * CELL]
        hm = headmap[row * CELL:(row + 1) * CELL, col * CELL:(col + 1) * CELL]
        hc = head_center(hm)
        hx = hc[0] if hc else f['neckX']
        ny = f['neckY']
        flap = flaps[col] if row <= 2 else (-3 if row in (6, 7) else -1)
        sc = opts.get('scale', 1.0) * (1.08 if row in (6, 7) else 1.0)
        if d == 'side':
            sh_ids, (ax, ay) = wing_ids('shadow', flap, sc * .95, .9, seed=i)
            li_ids, _ = wing_ids('light', flap - 1, sc * .85, .85, seed=i)
            # ambas hacia atrás (izquierda de la pantalla): se espejan
            li = shade(li_ids[:, ::-1], 'light', light, outline, edge)
            sh = shade(sh_ids[:, ::-1], 'shadow', dark, outline, sedge)
            li = dissolve(li, 'light', i); sh = dissolve(sh, 'shadow', i)
            W = sh.shape[1]
            place(c, li, hx - 2 - (W - ax), ny + 1 - ay, 'behind')
            place(c, sh, hx - 5 - (W - ax), ny + 5 - ay, 'behind')
            continue
        li_ids, (ax, ay) = wing_ids('light', flap, sc, 1.0, seed=i)
        sh_ids, _ = wing_ids('shadow', flap, sc, 1.0, seed=i)
        if d == 'up':
            L = shade(li_ids[:, ::-1], 'light', light, outline, edge)    # luz a la izquierda
            R = shade(sh_ids, 'shadow', dark, outline, sedge)
            L = dissolve(L, 'light', i); R = dissolve(R, 'shadow', i)
            W = L.shape[1]
            keep = hm.copy()
            place(c, L, hx - 2 - (W - ax), ny + 6 - ay, 'over', keep)
            place(c, R, hx + 2 - ax, ny + 6 - ay, 'over', keep)
        else:
            L = shade(sh_ids[:, ::-1], 'shadow', dark, outline, sedge)          # sombra a la izquierda (Brazo del Umbral)
            R = shade(li_ids, 'light', light, outline, edge)
            L = dissolve(L, 'shadow', i); R = dissolve(R, 'light', i)
            W = L.shape[1]
            place(c, L, hx - 5 - (W - ax), ny + 4 - ay, 'behind')
            place(c, R, hx + 5 - ax, ny + 4 - ay, 'behind')
    return out
