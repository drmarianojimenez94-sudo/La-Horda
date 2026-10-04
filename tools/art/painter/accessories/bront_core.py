"""Bront: armadura VACÍA. La cara del donante (piel dentro del casco) se vuelve vacío oscuro con dos ojos de luz;
en el pecho, una cavidad oscura donde flota un cristal facetado que ilumina el metal alrededor.
opts: void (rampa del vacío), eyes (rampa de los ojos), crystal (rampa del cristal, oscuro->claro), glow (color del
halo), cavity (rampa de la cavidad), crystalSize [w, h], chestDy, deathEyes (rampa más apagada en la muerte)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import cv2
from bront_lib import CELL, COLS, cell_view, ramp_colors, hexrgb, poly_mask, ellipse_mask

VOID = ["#020308", "#070b16", "#0e1828", "#1a2c44"]
EYES = ["#4aa8e8", "#a8e4ff", "#ffffff"]
CRYSTAL = ["#0c3a6a", "#1f74b8", "#4ab0ec", "#9ae0ff", "#ffffff"]
CAVITY = ["#030409", "#0a0f1c", "#141e30"]


def _lab(c):
    lab = cv2.cvtColor(c[:, :, :3], cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[:, :, 0] * 100 / 255; A = lab[:, :, 1] - 128; B = lab[:, :, 2] - 128
    return L, np.hypot(A, B), np.degrees(np.arctan2(B, A)) % 360


def face_region(c, f=None):
    """Cara dentro del casco, medida en la hoja ORIGINAL del donante. El latón del casco también parece piel; la
    piel se separa por tono (más rojizo) y por croma relativo a la luz (menos saturada que el latón a igual luz).
    El bloque mayor da la caja de la cara; el vacío es la elipse inscrita (tapa ojos, boca y sombras)."""
    L, C, h = _lab(c)
    m = ((c[:, :, 3] > 0) & (L > 30) & (C > 12) & (h > 38) & (h < 66) & (C < .3 * L + 22)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((4, 4), np.uint8))
    n, comp, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 1:
        return None
    j = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    x, y, w, hh, area = st[j]
    if area < 20 or w < 5 or hh < 5:
        return None
    if w > 17:
        x += (w - 17) // 2; w = 17
    if hh > 15:
        y += (hh - 15); hh = 15
    e = ellipse_mask(x + (w - 1) / 2, y + (hh - 1) / 2, w / 2 + .5, hh / 2 + .5)
    L2 = L
    return e & (c[:, :, 3] > 0) & (L2 > 6)


def void_face(c, face, opts, death=False, side=False, seed=0):
    ys, xs = np.nonzero(face)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    Y, X = np.mgrid[0:CELL, 0:CELL]
    # más oscuro arriba (sombra del casco), un leve resplandor abajo del cristal
    t = np.clip((Y - y0) / max(y1 - y0, 1), 0, 1) * .7 + np.random.default_rng(seed).normal(0, .06, Y.shape)
    c[face, :3] = ramp_colors(opts.get('void', VOID), np.clip(t[face], 0, 1))
    # ojos: dos ranuras de luz (una de perfil)
    ey = int(y0 + (y1 - y0) * .42)
    cx = (x0 + x1) / 2
    w = x1 - x0
    eyes = [cx + w * .12] if side else [cx - w * .2, cx + w * .2]
    er = opts.get('deathEyes', ["#1a3a58", "#2a5a80"]) if death else opts.get('eyes', EYES)
    for ex in eyes:
        ex = int(round(ex))
        for dx, tt in ((-1, .35), (0, 1.0), (1, .55)):
            X0 = ex + dx
            if face[ey, X0] if 0 <= X0 < CELL else False:
                c[ey, X0, :3] = ramp_colors(er, np.array([tt]))[0]
        # halo tenue alrededor del ojo
        if not death:
            for dy, dx in ((-1, 0), (1, 0), (-1, -1), (1, 1)):
                Yy, Xx = ey + dy, ex + dx
                if 0 <= Yy < CELL and 0 <= Xx < CELL and face[Yy, Xx]:
                    c[Yy, Xx, :3] = (c[Yy, Xx, :3].astype(np.float32) * .5 + hexrgb(er[0]) * .5).astype(np.uint8)


def chest(c, f, opts, i):
    w, h = opts.get('crystalSize', [4, 6])
    cx = f['neckX'] + (2 if f['dir'] == 'side' else 0)
    cy = f['neckY'] + opts.get('chestDy', 11)
    if f['dir'] == 'side':
        w = max(2, w - 1)
    alpha = c[:, :, 3] > 0
    Y, X = np.mgrid[0:CELL, 0:CELL]
    # halo de luz sobre el metal
    d = np.hypot((X - cx) / (w + 7), (Y - cy) / (h + 6))
    g = np.clip(1 - d, 0, 1) ** 1.5 * opts.get('glowAmt', .55)
    gc = hexrgb(opts.get('glow', '#7fd0ff'))
    L, _, _ = _lab(c)
    sel = alpha & (g > 0) & (L > 9)
    c[sel, :3] = (c[sel, :3].astype(np.float32) * (1 - g[sel, None]) + gc * g[sel, None]).astype(np.uint8)
    # cavidad oscura
    cav = ellipse_mask(cx, cy, w + 2, h + 1) & alpha
    cr = opts.get('cavity', CAVITY)
    dd = np.hypot((X - cx) / (w + 2), (Y - cy) / (h + 1))
    c[cav, :3] = ramp_colors(cr, np.clip(1 - dd[cav], 0, 1))
    # cristal facetado (rombo), flota: sube y baja un píxel según la columna
    bob = [0, -1, 0, 1][i % COLS]
    cy2 = cy + bob
    pts = [(cx, cy2 - h), (cx + w, cy2), (cx, cy2 + h), (cx - w, cy2)]
    m = poly_mask(pts)
    ramp = opts.get('crystal', CRYSTAL)
    t = np.where(X < cx, .75, .4) + np.where(Y < cy2, .15, -.1)  # cara izquierda iluminada
    t = t + np.random.default_rng(i).normal(0, .05, t.shape)
    c[m, :3] = ramp_colors(ramp, np.clip(t[m], 0, 1)); c[m, 3] = 255
    edge = m & ~(cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
    c[edge, :3] = ramp_colors(ramp, np.full(edge.sum(), .12))
    if 0 <= cy2 - h + 2 < CELL and 0 <= cx - 1 < CELL:
        c[cy2 - h + 2, cx - 1, :3] = ramp_colors(ramp, np.array([1.0]))[0]  # brillo


def draw(atlas, info, opts):
    frames = info['frames']
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import painter
    donor = painter.load_donor(opts.get('donor', 'baltra'))
    rig = painter.load_donor(opts['rigDonor']) if opts.get('rigDonor') else None
    for i in range(COLS * 9):
        c = cell_view(atlas, i)
        o = cell_view(donor, i)
        f = frames.get(i)
        death = i // COLS == 8
        if f is None and not death:
            continue
        if f is not None and f['dir'] == 'up':
            continue  # de espaldas no se ve la cara ni el pecho
        face = None if str(i) in map(str, opts.get('noFace', [])) else face_region(o, None if death else f)
        useRig = opts.get('useRig')  # lista de cuadros que toman la cara de la hoja base (None = todos)
        if rig is not None and str(i) not in map(str, opts.get('noFace', [])) and (useRig is None or i in useRig):
            # skin del mismo rig: la cara se busca en la hoja base y se ajusta con la piel del skin cerca de esa caja
            ref = face_region(cell_view(rig, i), None if death else f)
            face = None
            if ref is not None:
                ys, xs = np.nonzero(ref)
                L, C, h = _lab(o)
                win = np.zeros_like(ref); win[max(0, ys.min() - 3):ys.max() + 4, max(0, xs.min() - 3):xs.max() + 4] = True
                sk = win & (o[:, :, 3] > 0) & (L > 30) & (C > 18) & (h > 30) & (h < 70)
                if sk.sum() > 20:
                    yy, xx = np.nonzero(sk)
                    x0, x1 = (xx.min() + xs.min()) / 2, (xx.max() + xs.max()) / 2
                    y0, y1 = (yy.min() + ys.min()) / 2, (yy.max() + ys.max()) / 2
                    face = ellipse_mask((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + .5, (y1 - y0) / 2 + .5) & (o[:, :, 3] > 0)
                else:
                    face = ref & (o[:, :, 3] > 0)
        fbx = opts.get('faceBox', {}).get(str(i))
        if fbx:  # corrección manual de la caja de la cara (cuadros donde la detección toma solo una parte)
            x0, y0, x1, y1 = fbx
            face = ellipse_mask((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + .5, (y1 - y0) / 2 + .5) & (o[:, :, 3] > 0)
        if face is not None:
            void_face(c, face, opts, death=death, side=(f is not None and f['dir'] == 'side'), seed=i)
        if f is not None and opts.get('chest', True) and str(i) not in map(str, opts.get('noChest', [])):
            g = dict(f)
            if str(i) in opts.get('chestAt', {}):
                g['neckX'], g['neckY'] = opts['chestAt'][str(i)][0], opts['chestAt'][str(i)][1] - opts.get('chestDy', 11)
                face = None
            if face is not None:  # el pecho se mide desde el mentón real (el cuello del pintor confunde casco y cara)
                ys, xs = np.nonzero(face)
                g['neckY'] = int(ys.max()) + opts.get('chinGap', 2)
                g['neckX'] = int(round(xs.mean())) - (2 if f['dir'] == 'side' else 0)
                f['neckY'], f['neckX'] = g['neckY'], g['neckX']  # los accesorios siguientes usan el cuello real
            chest(c, g, opts, i)
    return atlas
