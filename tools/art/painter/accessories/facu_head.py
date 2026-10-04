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

opts: hairRamp (lista de hex, oscuro→claro), hairGamma, hairGrain/hairGrainL (micro-variación del donante en el
pelo), grain/grainL (ídem en todo el cuerpo pintado), body, head, deathSwapCols (cuadros de muerte con cabeza
erguida que reciben la cabeza nueva).
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


def _grain(atlas, N, k, kl=0.0):
    """Devuelve a la pintura la micro-variación de tono del donante (la rampa mapea solo la luz y aplana los
    colores: el roster tiene cientos por cuadro). Suma k x (ab del donante - ab medio local) a cada píxel."""
    if k <= 0:
        return atlas
    H, W = atlas.shape[:2]
    lo = _lab(atlas).reshape(-1, 3)
    ln = _lab(N)
    ab = ln[..., 1:].astype(np.float32)
    mean = np.stack([cv2.blur(ab[..., j], (5, 5)) for j in range(2)], -1)
    dev = np.clip(ab - mean, -7, 7).reshape(-1, 2)
    Ld = (ln[..., 0] - cv2.blur(ln[..., 0], (3, 3))).reshape(-1)
    m = ((atlas[:, :, 3] > 0) & (N[:, :, 3] > 0)).reshape(-1) & (lo[:, 0] > 9)
    lo[m, 1:] += k * dev[m] + 0.0
    lo[m, 0] += kl * np.clip(Ld[m], -8, 8)
    out = atlas.copy()
    out[..., :3] = P.from_lab(lo.astype(np.float32)).reshape(H, W, 3)
    out[..., :3][~m.reshape(H, W)] = atlas[..., :3][~m.reshape(H, W)]
    return out


def _dev(img):
    """Micro-variación local del donante (ab y L menos su media 5x5 / 3x3), recortada."""
    ln = _lab(img)
    ab = ln[..., 1:].astype(np.float32)
    mean = np.stack([cv2.blur(ab[..., j], (5, 5)) for j in range(2)], -1)
    dL = ln[..., 0] - cv2.blur(ln[..., 0], (3, 3))
    return np.clip(ab - mean, -7, 7), np.clip(dL, -8, 8)


def _tex(rgb_px, dev, sel, k, kl):
    """Suma la micro-variación del donante a colores salidos de una rampa (que solo mira la luz)."""
    if not len(rgb_px) or (k <= 0 and kl <= 0):
        return rgb_px
    lab = P.to_lab(rgb_px)
    lab[:, 1:] += k * dev[0][sel]
    lab[:, 0] += kl * dev[1][sel]
    return P.from_lab(lab.astype(np.float32))


def _specks(atlas, ramp, maxpx):
    """La regla del arma (material claro del donante) también toma los brillos sueltos de la armadura: quedan
    motas doradas sobre el azul. Las manchas doradas chicas (< maxpx, conexas) pasan a brillo de acero azul."""
    if not ramp:
        return atlas
    lab = _lab(atlas)
    C = np.hypot(lab[..., 1], lab[..., 2])
    h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    gold = (atlas[:, :, 3] > 0) & (h > 50) & (h < 105) & (C > 18) & (lab[..., 0] > 40) & ~P.skin_mask(atlas)
    n, comp, st, _ = cv2.connectedComponentsWithStats(gold.astype(np.uint8), connectivity=8)
    small = np.isin(comp, [j for j in range(1, n) if st[j, cv2.CC_STAT_AREA] < maxpx])
    out = atlas.copy()
    if small.any():
        out[small, :3] = _ramp(lab[small], ramp, 1.0, 40, 95)
    return out


def draw(atlas, info, opts):
    ramp = opts.get('hairRamp', DEFAULT_RAMP)
    gamma = opts.get('hairGamma', 0.9)
    hk, hkl = opts.get('hairGrain', 0.0), opts.get('hairGrainL', 0.0)
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
        hd &= ~((Cd > 34) & (hd_ > 58) & (hd_ < 105) & ~P.skin_mask(d))   # bufanda dorada a cualquier altura
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
        c[hair, :3] = _tex(_ramp(lab[hair], ramp, gamma, 6, 46), _dev(P.cell(D, w)), hair, hk, hkl)
        P.put_cell(Dp, w, c)

    out = _grain(atlas, N, opts.get('grain', 0.9), opts.get('grainL', 0.3))
    out = _specks(out, opts.get('speckRamp'), opts.get('speckMax', 12))
    atlas = out.copy()
    for i in range(COLS * 9):
        row = i // COLS
        n = P.cell(N, i)
        cur = P.cell(out, i).copy()
        if row == 8 and (i % COLS) not in opts.get('deathSwapCols', [0, 1]):
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
                cur[sel, :3] = _tex(_ramp(l2[sel], ramp, gamma, 6, 46), _dev(n), sel, hk, hkl)
            P.put_cell(out, i, cur)
            continue
        dirr = info['ROW_DIR'][row]
        if dirr == 'death':
            dirr = 'down'   # muerte, cuadros de rodillas: la cabeza sigue erguida y de frente
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
        cur[hair, :3] = _tex(_ramp(l2[hair], ramp, gamma, 6, 46), _dev(n), hair, hk, hkl)
        # cabeza nueva
        ddy, ddx = DD[w][0] + dy, DD[w][1] + dx
        dcell = P.cell(Dp, w).copy()
        dcell[~HD[w]] = 0
        dh = _shift(dcell, ddy, ddx)
        dm = dh[:, :, 3] > 0
        cur[dm] = dh[dm]
        # para la corona (facu_crown): dónde quedó la cabeza nueva en este cuadro
        ys, xs = np.where(dm)
        sk = P.skin_mask(dh)
        face_x = float(np.where(sk)[1].mean()) if sk.any() else float(xs.mean())
        info['frames'].setdefault(i, {})['facuHead'] = {
            'top': int(ys.min()), 'x0': int(xs.min()), 'x1': int(xs.max()), 'cx': float(xs.mean()),
            'faceX': face_x, 'dir': dirr, 'colTop': {int(x): int(ys[xs == x].min()) for x in np.unique(xs)}}
        # piel de la cara de Nahir que asoma fuera de la cabeza nueva -> pelo oscuro
        skl = headN & P.skin_mask(n) & ~dm
        if skl.any():
            cur[skl, :3] = _ramp(np.full((skl.sum(), 3), 20, np.float32), ramp, gamma, 6, 46)
        cur[occ] = atlas[(i // COLS) * CELL:(i // COLS + 1) * CELL, (i % COLS) * CELL:(i % COLS + 1) * CELL][occ]
        P.put_cell(out, i, cur)
    return out
