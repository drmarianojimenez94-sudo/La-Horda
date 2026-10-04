"""Nano GM — re-ensamble de cabeza robusto (cuerpo de Zahra + cabeza de Dariel).

El ensamble del núcleo falla en este par:
  * en perfil deja el pelo de atrás de Zahra (cae fuera del ancho de cabeza que se borra);
  * en ataques/lanzamientos pega la cabeza del cuadro de CAMINAR, pero las filas de acción están dibujadas a mayor
    escala: la cabeza queda chica, y alrededor asoman antiparras y cara de Zahra; además el guantelete levantado
    junto a la cara entra en la máscara de cabeza y se borra;
  * en la muerte queda la cabeza de Zahra con sus antiparras.
Este módulo (corre primero, antes de tatuajes y alas) rehace el cuerpo y la cabeza:
  * caminar (0-11): salida del pintor + se borra el pelo de Zahra que sobró;
  * acción (12-31): cabeza de Dariel del MISMO cuadro (misma escala y expresión: ojos cerrados al lanzar), recortada
    con una elipse de cabeza y sin abrigo rojo / diapasón; la de Zahra se recorta igual pero sin el guantelete, y lo
    que del guantelete tapaba la cara de Zahra se vuelve a dibujar delante de la cabeza nueva;
  * muerte (32-35): las antiparras y el pelo de Zahra se repintan como pelo de Nano; los ojos abiertos, oscuros.
El cuerpo sale de Zahra repintada con opts['bodyPaint']; la cabeza de acción, de Dariel repintada con opts['headPaint'].
"""
import importlib.util
from pathlib import Path
import numpy as np
import cv2

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('painter_core', HERE.parent / 'painter.py')
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)

CELL = 112


def lab_of(img):
    return P.to_lab(img[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)


def hue_chroma(lab):
    return np.degrees(np.arctan2(lab[:, :, 2], lab[:, :, 1])) % 360, np.hypot(lab[:, :, 1], lab[:, :, 2])


def ellipse(nk, grow=1.0, up=0):
    top, ny, nx = nk
    h = int(np.clip(ny - top, 28, 38))
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    cy, cx = ny - h / 2 - up / 2, nx
    ry, rx = h / 2 + 3 + up / 2, (h * .62 + 3) * grow
    e = ((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2 <= 1
    e[ny + 1:] = False
    return e


def largest(m):
    n, comp, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    if n <= 1:
        return m
    return comp == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))


def fill_holes(m):
    inv = (~m).astype(np.uint8)
    n, comp = cv2.connectedComponents(inv, connectivity=4)
    border = set(np.unique(np.concatenate([comp[0], comp[-1], comp[:, 0], comp[:, -1]])))
    holes = ~np.isin(comp, list(border)) & ~m
    return m | holes


def zahra_hair_walk(z, nk):
    """cabeza de Zahra en caminar: head_mask + pelo oscuro pegado (el moño de perfil queda fuera del núcleo)."""
    m = P.head_mask(z, nk)
    lab = lab_of(z)
    _, C = hue_chroma(lab)
    a = z[:, :, 3] > 0
    hairish = a & (lab[:, :, 0] < 34) & (C < 20)
    hairish[nk[1] + 1:] = False
    for _ in range(14):
        g = (cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & hairish & ~m
        if not g.any():
            break
        m |= g
    return m & a


def gauntlet(z, nk):
    """guantelete: píxeles cobre/naranja de componentes grandes, fuera de la caja de las antiparras (arriba y al
    centro de la cabeza), con su contorno oscuro."""
    lab = lab_of(z)
    h, C = hue_chroma(lab)
    orange = (z[:, :, 3] > 0) & (C > 30) & (h > 28) & (h < 72) & ~P.skin_mask(z) & (lab[:, :, 0] > 14)
    top, ny, nx = nk
    hh = int(np.clip(ny - top, 28, 38))
    gog = np.zeros_like(orange)
    gog[max(0, ny - hh - 8):ny - int(hh * .42), max(0, nx - 19):nx + 20] = True
    cand = orange & ~gog
    n, comp, st, _ = cv2.connectedComponentsWithStats(cand.astype(np.uint8), connectivity=8)
    g = np.zeros_like(orange)
    for j in range(1, n):
        if st[j, cv2.CC_STAT_AREA] >= 40:   # ojos ámbar y hebillas no son guantelete
            g |= comp == j
    g = cv2.dilate(g.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    return g & (z[:, :, 3] > 0) & ~gog & ((lab[:, :, 0] < 22) | orange)


def zahra_head_action(z, nk):
    a = z[:, :, 3] > 0
    g = gauntlet(z, nk)
    lab = lab_of(z)
    h, C = hue_chroma(lab)
    m = a & ellipse(nk, 1.3, up=6) & ~g
    m = largest(m)
    hairish = a & (lab[:, :, 0] < 30) & (C < 12) & ~g
    hairish[nk[1] + 2:] = False
    for _ in range(12):
        gr = (cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & hairish & ~m
        if not gr.any():
            break
        m |= gr
    # brazos (piel que no es la cara, guante) que entraron en la elipse: se quedan en el cuerpo
    sk = P.skin_mask(z)
    face = largest(sk & ellipse(nk, .8))
    glove = a & (C >= 12) & (h > 25) & (h < 70) & (lab[:, :, 0] < 34) & ~ellipse(nk, .95)
    out_e = ~ellipse(nk, .95)
    n, comp = cv2.connectedComponents((sk & ~face).astype(np.uint8), connectivity=8)
    armsk = np.zeros_like(sk)
    for j in range(1, n):
        cj = comp == j
        if (cj & out_e).any():      # piel de brazo: sale de la cabeza; los brillos de las antiparras no
            armsk |= cj
    far = np.zeros_like(a); far[:, :max(0, nk[2] - 17)] = True; far[:, nk[2] + 18:] = True
    far[:nk[1] - int(np.clip(nk[1] - nk[0], 28, 38) * .55)] = False
    hair_s = (lab[:, :, 0] < 34) & (C < 16)
    arm = (armsk | glove | (far & ~hair_s)) & m
    arm = cv2.dilate(arm.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & m & ((lab[:, :, 0] < 20) | armsk | glove | far)
    return m & ~arm, g | arm


def dariel_head_action(d, nk, back=False):
    a = d[:, :, 3] > 0
    lab = lab_of(d)
    h, C = hue_chroma(lab)
    sk = P.skin_mask(d)
    face = np.zeros_like(sk) if back else largest(sk & ellipse(nk, .8))
    coat = (C > 18) & ((h < 36) | (h > 330)) & ~face          # abrigo rojo
    fork = (C > 30) & (h > 60) & (h < 108) & (lab[:, :, 0] > 42) & ~face   # diapasón y pañuelo dorados
    hands = sk & ~face
    m = largest(a & ellipse(nk) & ~coat & ~fork & ~hands)
    core = ellipse(nk, .62)
    op = largest(cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool))
    rim = cv2.dilate(op.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    m = (m & core) | (m & rim)       # fuera del núcleo: sin líneas sueltas (mango del diapasón, dedos)
    m = largest(m)
    m = fill_holes(m) & a & ~fork & ~coat & ~hands
    # contorno de lo excluido (manos, diapasón) fuera de la cara: afuera
    ex = cv2.dilate((fork | coat | hands).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    m &= ~(ex & (lab[:, :, 0] < 22) & ~(cv2.dilate(face.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0) & ~core)
    return largest(m)


def drop_orphans(img, minpx=30):
    a = (img[:, :, 3] > 0).astype(np.uint8)
    n, comp, st, _ = cv2.connectedComponentsWithStats(a, connectivity=8)
    if n <= 2:
        return img
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    for j in range(1, n):
        if j != big and st[j, cv2.CC_STAT_AREA] < minpx:
            img[comp == j] = 0
    return img


def ramp_paint(lab_px, ramp_hex, lo, hi, gamma=1.0):
    ramp = np.array([P.hex_lab(c) for c in ramp_hex], np.float32)
    t = np.clip((lab_px[:, 0] - lo) / max(hi - lo, 1), 0, 1) ** gamma * (len(ramp) - 1)
    k = np.floor(t).astype(int).clip(0, len(ramp) - 2); f = (t - k)[:, None]
    return P.from_lab((ramp[k] * (1 - f) + ramp[k + 1] * f).astype(np.float32))


# muerte: cajas (x0, y0, x1, y1) locales de las antiparras de Zahra y de sus ojos abiertos
DEATH_GOGGLES = {32: (34, 44, 67, 64), 33: (26, 47, 61, 68), 34: (12, 68, 52, 84), 35: (15, 70, 48, 84)}
DEATH_EYES = {32: (42, 58, 62, 70)}


def rules_of(lst):
    out = []
    for r in lst or []:
        r = dict(r); r.pop('part', None); r['region'] = None; out.append(r)
    return out


def draw(atlas, info, opts):
    COLS = info['COLS']
    headmap = info['headmap']
    Z = P.load_donor(opts.get('body', 'zahra'))
    D = P.load_donor(opts.get('head', 'dariel'))
    Zp = P.recolor(Z, np.zeros(Z.shape[:2], np.int32), rules_of(opts.get('bodyPaint')), None)
    hair_ramp = opts['hairRamp']
    out = atlas.copy()

    # cuellos de acción (de espaldas: altura del cuadro de ataque de frente de la misma columna)
    def necks(A):
        res = {}
        for i in range(12, 32):
            c = P.cell(A, i); r = i // COLS
            fb = res.get(12 + i % COLS) if r == 5 else None
            res[i] = P.frame_neck(c, fb)
        return res
    zn, dn = necks(Z), necks(D)
    zn.update(opts.get('zNeck', {}) and {int(k): tuple(v) for k, v in opts['zNeck'].items()})

    # cabezas de acción de Dariel, pintadas juntas (mismas percentiles en todas)
    dmask = np.zeros(D.shape[:2], bool)
    dface = np.zeros(D.shape[:2], bool)
    for i in range(12, 32):
        r, c = divmod(i, COLS)
        dc = P.cell(D, i)
        dmask[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] = dariel_head_action(dc, dn[i], i // COLS == 5)
        # cara (piel + ojos/boca adentro): no se repinta; los brillos del pelo que parecen piel, sí
        dface[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] = (fill_holes(largest(P.skin_mask(dc) & ellipse(dn[i], .8))) if i // COLS != 5 else np.zeros((CELL, CELL), bool))
    hr = []
    for r in rules_of(opts.get('headPaint')):
        r['noSkin'] = False
        r['region'] = dmask & ~dface
        hr.append(r)
    Dp = P.recolor(D, np.zeros(D.shape[:2], np.int32), hr, None)

    for i in range(36):
        row = i // COLS
        zi = P.cell(Z, i)
        base = P.cell(Zp, i).copy()
        kind = info['ROW_DIR'][row]
        if row <= 2:
            # caminar: lo del pintor, sin el pelo de Zahra que sobró
            cur = P.cell(atlas, i).copy()
            hm = P.cell(headmap, i)
            fb = None
            nk = P.frame_neck(zi, P.frame_neck(P.cell(Z, i % COLS)) if row == 2 else None)
            zh = zahra_hair_walk(zi, nk)
            body = base.copy(); body[zh] = 0
            body[hm] = cur[hm]
            P.put_cell(out, i, drop_orphans(body))
            continue
        if kind == 'death':
            lab = lab_of(zi)
            _, C = hue_chroma(lab)
            if i in DEATH_GOGGLES:
                x0, y0, x1, y1 = DEATH_GOGGLES[i]
                box = np.zeros((CELL, CELL), bool); box[y0:y1 + 1, x0:x1 + 1] = True
                sel = box & (zi[:, :, 3] > 0) & ~P.skin_mask(zi) & (lab[:, :, 0] > 9)
                near = cv2.dilate(box.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
                sel |= near & (zi[:, :, 3] > 0) & (lab[:, :, 0] < 30) & (C < 18) & (lab[:, :, 0] > 9)
                base[sel, :3] = ramp_paint(lab[sel], hair_ramp, 8, 52, .9)
            if i in DEATH_EYES:
                x0, y0, x1, y1 = DEATH_EYES[i]
                box = np.zeros((CELL, CELL), bool); box[y0:y1 + 1, x0:x1 + 1] = True
                eye = box & (C > 22) & ~P.skin_mask(zi) & (zi[:, :, 3] > 0) & (lab[:, :, 0] > 12)
                if eye.any():
                    base[eye, :3] = ramp_paint(lab[eye], ['#140e18', '#3a2a40', '#6a5070'], 15, 60)
            P.put_cell(out, i, drop_orphans(base))
            continue
        # acción
        znk, dnk = zn[i], dn[i]
        zh, g = zahra_head_action(zi, znk)
        occl = g & ellipse(znk, 1.3, up=6) & (zi[:, :, 3] > 0)   # guantelete delante de la cara
        base[zh] = 0
        dh = P.cell(dmask, i)
        dp = P.cell(Dp, i)
        dy, dx = znk[1] - dnk[1], znk[2] - dnk[2]
        ys, xs = np.where(dh)
        Y, X = ys + dy, xs + dx
        ok = (Y >= 0) & (Y < CELL) & (X >= 0) & (X < CELL)
        base[Y[ok], X[ok]] = dp[ys[ok], xs[ok]]
        base[occl] = P.cell(Zp, i)[occl]
        hm = np.zeros((CELL, CELL), bool); hm[Y[ok], X[ok]] = True
        P.put_cell(headmap, i, hm)
        P.put_cell(out, i, drop_orphans(base))
        if i in info['frames']:
            info['frames'][i].update({'top': int(min(znk[0], Y.min() if len(Y) else znk[0])), 'neckY': int(znk[1]), 'neckX': int(znk[2])})
    return out
