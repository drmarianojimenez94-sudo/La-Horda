"""Facu GM — cabeza propia sobre el cuerpo de Nahir (accesorio del Pintor).

Por qué existe: el intercambio de cabeza del núcleo corta manos y armas levantadas cerca de la cabeza (filas de
ataque), deja restos del pelo del cuerpo y borra hombreras con la "falda" de pelo. Este accesorio hace el
intercambio a su manera, con la ficha en `"head": null` (el núcleo solo pinta el cuerpo):

  1. La cabeza de Nahir se ubica en cada cuadro buscando por correlación (cv2.matchTemplate con máscara) su
     cabeza de un cuadro de caminar con la misma dirección: así los ataques reciben la posición real de la cabeza.
  2. Lo que queda del pelo de Nahir se repinta con la rampa del pelo nuevo (suma volumen de rulos oscuros); la
     máscara de cristal de Nahir se oscurece a pelo antes de la rampa.
  3. Encima va la cabeza de Dariel (cara, pelo), repintada con la misma rampa y alineada por el mentón contra la
     cabeza de Nahir de ese cuadro de caminar. Sin el cuello rojo ni la bufanda dorada de Dariel.
  4. Manos, guantes y hojas que en el cuadro original tapan la cabeza (no están en la plantilla y no son pelo)
     se vuelven a dibujar encima.
  5. Muerte: queda la cabeza tendida de Nahir, con la máscara convertida en pelo y la misma rampa.

opts: hairRamp (lista de hex, oscuro→claro), hairGamma.
"""
import importlib.util
from pathlib import Path
import numpy as np
import cv2

HERE = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('painter_core', HERE / 'painter.py')
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)

CELL, COLS = P.CELL, P.COLS
DEFAULT_RAMP = ['#07080f', '#141a2a', '#22304a', '#355172', '#5b86a6']


def _lab(img):
    return P.to_lab(img[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)


def _shift(m, dy, dx):
    out = np.zeros_like(m)
    H, W = m.shape[:2]
    ys, xs = np.where(m if m.ndim == 2 else m[:, :, 3] > 0)
    Y, X = ys + dy, xs + dx
    ok = (Y >= 0) & (Y < H) & (X >= 0) & (X < W)
    out[Y[ok], X[ok]] = m[ys[ok], xs[ok]]
    return out


def _walk_necks(A):
    """Cuello (arriba, y, x) de los 12 cuadros de caminar; si no se ve la cara, la altura típica de las demás."""
    nk = {}
    for i in range(12):
        c = P.cell(A, i)
        f = P.face_box(c) if i < 8 else None
        m = c[:, :, 3] > 0
        top = int(np.where(m.any(1))[0][0])
        if f:
            nk[i] = (top, f[3] + 1, (f[0] + f[2]) // 2)
    rel = int(np.median([v[1] - v[0] for v in nk.values()]))
    for i in range(12):
        if i in nk and i < 8:
            continue
        c = P.cell(A, i)
        m = c[:, :, 3] > 0
        top = int(np.where(m.any(1))[0][0])
        y = top + rel
        xs = np.where(m[top:y].any(0))[0]
        nk[i] = (top, y, int(xs.mean()))
    return nk


def _hairlike(lab):
    C = np.hypot(lab[..., 1], lab[..., 2])
    return (C <= 9) & (lab[..., 0] < 50)


def _maskish(img, lab):
    """Máscara de cristal de Nahir: tonos cian/azules con croma, o claros y fríos (no piel)."""
    C = np.hypot(lab[..., 1], lab[..., 2])
    h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    return (img[:, :, 3] > 0) & ~P.skin_mask(img) & (((C > 8) & (h > 150) & (h < 290)) | (lab[..., 0] > 55) & (C < 14))


def _ramp(lab_px, ramp, gamma, lo=None, hi=None):
    if not len(lab_px):
        return np.zeros((0, 3), np.uint8)
    R = np.array([P.hex_lab(c) for c in ramp], np.float32)
    L = lab_px[:, 0]
    if lo is None:
        lo, hi = np.percentile(L, [3, 97])
    t = np.clip((L - lo) / max(hi - lo, 1), 0, 1) ** gamma
    pos = t * (len(R) - 1)
    i0 = np.floor(pos).astype(int).clip(0, len(R) - 2)
    f = (pos - i0)[:, None]
    return P.from_lab((R[i0] * (1 - f) + R[i0 + 1] * f).astype(np.float32))


def draw(atlas, info, opts):
    ramp = opts.get('hairRamp', DEFAULT_RAMP)
    gamma = opts.get('hairGamma', 0.9)
    N = P.load_donor(opts.get('body', 'nahir'))
    D = P.load_donor(opts.get('head', 'dariel'))
    nkN, nkD = _walk_necks(N), _walk_necks(D)

    # cabezas de referencia (cuadros de caminar)
    TN, HD, DD = {}, {}, {}
    for w in range(12):
        n, d = P.cell(N, w), P.cell(D, w)
        TN[w] = P.head_mask(n, nkN[w])
        hd = P.head_mask(d, nkD[w])
        ld = _lab(d)
        Cd = np.hypot(ld[..., 1], ld[..., 2])
        hd_ = np.degrees(np.arctan2(ld[..., 2], ld[..., 1])) % 360
        collar = (Cd > 24) & ((hd_ < 36) | (hd_ > 340) | ((hd_ > 60) & (hd_ < 100) & (ld[..., 0] > 45))) & ~P.skin_mask(d)
        # cuello rojo / bufanda dorada: fuera; solo la franja baja de la cabeza (los ojos quedan)
        low = np.zeros_like(hd); low[nkD[w][1] - 4:] = True
        hd &= ~(collar & low)
        hd[nkD[w][1] + 1:] = False
        # restos sueltos: solo el componente grande
        n_, comp, st, _ = cv2.connectedComponentsWithStats(hd.astype(np.uint8), connectivity=8)
        if n_ > 1:
            hd = comp == (1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])))
        HD[w] = hd
        DD[w] = (nkN[w][1] - nkD[w][1], nkN[w][2] - nkD[w][2])

    # pelo de Dariel repintado una sola vez (misma rampa en toda la hoja)
    Dp = D.copy()
    for w in range(12):
        c = P.cell(Dp, w).copy()
        lab = _lab(c)
        sk = P.skin_mask(c)
        near = cv2.dilate(sk.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        C = np.hypot(lab[..., 1], lab[..., 2])
        eyes = near & ~sk & (C > 12) & (cv2.erode(near.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
        hair = HD[w] & ~sk & ~eyes & (lab[..., 0] > 9)
        c[hair, :3] = _ramp(lab[hair], ramp, gamma, 6, 46)
        P.put_cell(Dp, w, c)

    out = atlas.copy()
    for i in range(COLS * 9):
        row = i // COLS
        n = P.cell(N, i)
        cur = P.cell(out, i).copy()
        if row == 8:
            # muerte: la cabeza tendida de Nahir; máscara -> pelo, pelo -> rampa
            lab = _lab(n)
            alpha = n[:, :, 3] > 0
            hl = alpha & _hairlike(lab) & (lab[..., 0] > 9)
            # zona de la cabeza: componente de pelo grande (la cabeza tendida) dilatado
            nn, comp, st, _ = cv2.connectedComponentsWithStats(hl.astype(np.uint8), connectivity=8)
            if nn > 1:
                big = comp == (1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])))
                zone = cv2.dilate(big.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
                mk = _maskish(n, lab) & zone
                l2 = lab.copy()
                l2[mk, 0] = np.clip(l2[mk, 0] * 0.35, 12, 34)
                sel = (hl & zone) | mk
                cur[sel, :3] = _ramp(l2[sel], ramp, gamma, 6, 46)
            P.put_cell(out, i, cur)
            continue
        dirr = info['ROW_DIR'][row]
        drow = {'down': 0, 'side': 1, 'up': 2}[dirr]
        if row <= 2:
            w, off = i, (0, 0)
        else:
            # correlación del mapa binario de pelo (el gris confunde pelo con armadura oscura)
            best = None
            hl = (_hairlike(_lab(n)) & (n[:, :, 3] > 0)).astype(np.float32)
            for w_ in range(drow * 4, drow * 4 + 4):
                t = TN[w_]
                ys, xs = np.where(t)
                y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
                src = P.cell(N, w_)
                th = (_hairlike(_lab(src)) & t).astype(np.float32)[y0:y1, x0:x1]
                r = cv2.matchTemplate(hl, th, cv2.TM_CCORR_NORMED)
                yy, xx = np.mgrid[0:r.shape[0], 0:r.shape[1]]
                r = r - 0.004 * np.hypot(yy - y0, xx - x0)
                _, mx, _, ml = cv2.minMaxLoc(r)
                if best is None or mx > best[0]:
                    best = (mx, w_, (ml[1] - y0, ml[0] - x0))
            _, w, off = best
        dy, dx = off
        src = P.cell(N, w)
        headN = _shift(TN[w], dy, dx) & (n[:, :, 3] > 0)
        lab = _lab(n)
        # ocluyentes: dentro de la cabeza, lo que no coincide con la plantilla y no es pelo/piel/máscara
        ref = _shift(src, dy, dx)
        diff = np.abs(n[:, :, :3].astype(int) - ref[:, :, :3].astype(int)).sum(2)
        occ = headN & (diff > 90) & ~_hairlike(lab) & ~P.skin_mask(n) & ~_maskish(n, lab) & (lab[..., 0] > 9)
        occ = cv2.morphologyEx(occ.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
        # pelo de Nahir que queda -> rampa (la máscara antes se oscurece a pelo)
        mk = headN & _maskish(n, lab) & ~occ
        l2 = lab.copy()
        l2[mk, 0] = np.clip(l2[mk, 0] * 0.35, 12, 34)
        hair = headN & ~occ & (_hairlike(lab) | mk) & (lab[..., 0] > 9)
        cur[hair, :3] = _ramp(l2[hair], ramp, gamma, 6, 46)
        # cabeza nueva
        ddy, ddx = DD[w][0] + dy, DD[w][1] + dx
        dcell = P.cell(Dp, w).copy()
        dcell[~HD[w]] = 0
        dh = _shift(dcell, ddy, ddx)
        dm = dh[:, :, 3] > 0
        cur[dm] = dh[dm]
        # piel de la cara de Nahir que asoma fuera de la cabeza nueva -> pelo oscuro
        skl = headN & P.skin_mask(n) & ~dm
        if skl.any():
            cur[skl, :3] = _ramp(np.full((skl.sum(), 3), 20, np.float32), ramp, gamma, 6, 46)
        cur[occ] = atlas[(i // COLS) * CELL:(i // COLS + 1) * CELL, (i % COLS) * CELL:(i % COLS + 1) * CELL][occ]
        P.put_cell(out, i, cur)
    return out
