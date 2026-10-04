"""Reparación de cuadros que el ensamble rompe (cabeza no detectada, arma borrada junto con la cabeza).

opts = {"module": "velmira_repair", "donor": "<cuerpo>",
        "auto": true,       # en cada cuadro: lo borrado bajo el mentón, lejos del eje (radius), piezas que no tocan
                            # la cabeza nueva (detached, neckBand) y, con minDx, lo que queda a la derecha del mentón
        "frames": {"31": "full",            # el cuadro vuelve al del cuerpo (repintado con "paint" o por mapa)
                   "28": [[x0, y0, x1, y1], ...]}} # restaura los píxeles del cuerpo borrados dentro de la caja
El repintado usa el mapa color-del-donante -> color-final aprendido de los píxeles del cuerpo que el pintor no
tocó como cabeza (así la pieza restaurada queda con la misma paleta que el resto de la hoja)."""
import importlib.util
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent


def _painter():
    spec = importlib.util.spec_from_file_location('painter_core', HERE.parent / 'painter.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def color_map(donor, atlas, headmap):
    """donante RGB -> color final más frecuente, sobre píxeles opacos en ambos y fuera de la cabeza nueva."""
    sel = (donor[:, :, 3] > 0) & (atlas[:, :, 3] > 0) & ~headmap
    src = donor[sel][:, :3].astype(np.int64)
    dst = atlas[sel][:, :3]
    key = (src[:, 0] << 16) | (src[:, 1] << 8) | src[:, 2]
    same = (np.abs(src - dst.astype(np.int64)).sum(1) == 0)
    table = {}
    order = np.argsort(key, kind='stable')
    key, dst, same = key[order], dst[order], same[order]
    bounds = np.flatnonzero(np.diff(key)) + 1
    for k, d in zip(np.split(key, bounds), np.split(dst, bounds)):
        cols, cnt = np.unique(d, axis=0, return_counts=True)
        table[int(k[0])] = cols[np.argmax(cnt)]
    keys = np.array(list(table.keys()), np.int64)
    vals = np.array(list(table.values()), np.uint8)
    rgb = np.stack([(keys >> 16) & 255, (keys >> 8) & 255, keys & 255], 1).astype(np.float32)
    return keys, vals, rgb


def remap(px, keys, vals, rgb, P):
    """px: N x 4 del donante -> N x 4 repintado (exacto si el color está en el mapa; si no, el más cercano en Lab)."""
    out = px.copy()
    k = (px[:, 0].astype(np.int64) << 16) | (px[:, 1].astype(np.int64) << 8) | px[:, 2]
    idx = np.searchsorted(np.sort(keys), k)
    srt = np.argsort(keys)
    ks = keys[srt]
    idx = np.clip(idx, 0, len(ks) - 1)
    hit = ks[idx] == k
    out[hit, :3] = vals[srt][idx[hit]]
    miss = ~hit
    if miss.any():
        la = P.to_lab(rgb.astype(np.uint8))
        lb = P.to_lab(px[miss, :3])
        d = ((lb[:, None, :] - la[None, :, :]) ** 2).sum(-1)
        out[miss, :3] = vals[np.argmin(d, 1)]
    return out


def despeckle(out, CELL, COLS, n):
    """Quita píxeles sueltos (componentes de <= n px) y restos cortados en el borde del cuadro."""
    import cv2
    for i in range(out.shape[0] // CELL * COLS):
        r, c = divmod(i, COLS)
        cimg = out[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
        a = (cimg[:, :, 3] > 0).astype(np.uint8)
        k, comp, st, _ = cv2.connectedComponentsWithStats(a, connectivity=8)
        if k <= 2:
            continue
        big = 1 + int(np.argmax(st[1:, 4]))
        for j in range(1, k):
            if j == big:
                continue
            x, y, w, h, area = st[j]
            edge = x <= 6 or x + w >= CELL - 6 or y <= 1
            if area <= n or (edge and area < 80):
                cimg[comp == j] = 0
    return out


def _repaint(P, d, opts):
    """Repinta un cuadro del cuerpo con las reglas dadas (sin partes: todo el cuadro es "cuerpo")."""
    rules = []
    for rr in opts['paint']:
        rr = dict(rr); rr.pop('part', None); rr['region'] = None; rules.append(rr)
    return P.recolor(d.copy(), np.full(d.shape[:2], -1), rules, None)


def draw(atlas, info, opts):
    P = _painter()
    CELL, COLS = info['CELL'], info['COLS']
    donor = P.load_donor(opts['donor'])
    keys, vals, rgb = color_map(donor, atlas, info['headmap'])
    out = atlas.copy()
    plan = dict(opts.get('frames', {}))
    if opts.get('auto'):
        # todo cuadro con cuello conocido: se restaura lo que el ensamble borró por debajo del mentón (agujeros del
        # corte de pelo) o lejos del eje de la cabeza (armas/manos que tocaban la cabeza vieja)
        for i, f in info['frames'].items():
            if str(i) in plan or int(i) in opts.get('skip', []):
                continue
            plan[str(i)] = ('auto', f)
    for fi, how in plan.items():
        i = int(fi)
        r, c = divmod(i, COLS)
        ys, xs = slice(r * CELL, (r + 1) * CELL), slice(c * CELL, (c + 1) * CELL)
        d = donor[ys, xs]
        o = out[ys, xs]
        if isinstance(how, dict) and 'transplant' in how:
            # cuadro sin cabeza nueva (p. ej. el primero de la muerte, todavía de pie): se repinta el cuerpo con
            # "paint" y se le apoya la cabeza ya pintada de otro cuadro, mentón con mentón
            src = int(how['transplant'])
            base = _repaint(P, d, opts) if opts.get('paint') else d.copy()
            nk = P.frame_neck(d)
            old = P.head_mask(d, nk, how.get('longHair', False)) if nk else None
            if old is not None:
                base[old | P.skirt(d, nk, how.get('skirtRows', 4))] = 0
            sr, sc = divmod(src, COLS)
            scell = out[sr * CELL:(sr + 1) * CELL, sc * CELL:(sc + 1) * CELL]
            sh = info['headmap'][sr * CELL:(sr + 1) * CELL, sc * CELL:(sc + 1) * CELL]
            sf = info['frames'][src] if src in info['frames'] else info['frames'][str(src)]
            dy = (nk[1] if nk else sf['neckY']) - sf['neckY'] + how.get('dy', 0)
            dx = (nk[2] if nk else sf['neckX']) - sf['neckX'] + how.get('dx', 0)
            yy, xx = np.where(sh & (scell[:, :, 3] > 0))
            Y, X = yy + dy, xx + dx
            ok = (Y >= 0) & (Y < CELL) & (X >= 0) & (X < CELL)
            base[Y[ok], X[ok]] = scell[yy[ok], xx[ok]]
            # huecos que dejó la cabeza vieja por debajo del mentón: se restauran del cuerpo repintado
            if nk:
                full = _repaint(P, d, opts) if opts.get('paint') else d
                hole = (base[:, :, 3] == 0) & (full[:, :, 3] > 0)
                hole[:nk[1] + 1] = False
                base[hole] = full[hole]
            out[ys, xs] = base
            continue
        if how == 'full':
            m = d[:, :, 3] > 0
            if opts.get('paint'):
                new = _repaint(P, d, opts)
            else:
                new = np.zeros_like(d)
                new[m] = remap(d[m], keys, vals, rgb, P)
            out[ys, xs] = new
            continue
        if isinstance(how, tuple) and how[0] == 'auto':
            f = how[1]
            R = opts.get('radius', 22)
            reg = np.zeros((CELL, CELL), bool)
            reg[f['neckY'] + opts.get('below', 1):] = True
            far = np.abs(np.arange(CELL) - f['neckX']) > R
            reg[:, far] = True
            lost = (d[:, :, 3] > 0) & (o[:, :, 3] == 0)
            if opts.get('detached', True):
                # piezas borradas que no tocan la cabeza nueva (bastón junto a la cara, mano levantada): vuelven
                import cv2
                hm = info['headmap'][ys, xs]
                hm = hm.copy(); hm[f['neckY'] - opts.get('neckBand', 4):] = False  # el contacto en el cuello no cuenta
                near = cv2.dilate(hm.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
                n, comp = cv2.connectedComponents(lost.astype(np.uint8), connectivity=4)
                for j in range(1, n):
                    cj = comp == j
                    if cj.sum() >= opts.get('detachedMin', 3) and not (cj & near).any():
                        reg |= cj
            if 'minDx' in opts:
                # el arma va en la mano derecha: lo borrado con centro a la derecha del mentón (>= minDx) es bastón
                import cv2
                n, comp, st, cen = cv2.connectedComponentsWithStats(lost.astype(np.uint8), connectivity=8)
                for j in range(1, n):
                    if cen[j][0] - f['neckX'] >= opts['minDx']:
                        reg |= comp == j
            m = reg & lost
            if m.any():
                o[m] = remap(d[m], keys, vals, rgb, P)
                out[ys, xs] = o
            continue
        boxes = how if isinstance(how[0], (list, tuple)) else [how]
        box = np.zeros((CELL, CELL), bool)
        for x0, y0, x1, y1 in boxes:
            box[y0:y1 + 1, x0:x1 + 1] = True
        m = box & (d[:, :, 3] > 0) & (o[:, :, 3] == 0)
        if m.any():
            o[m] = remap(d[m], keys, vals, rgb, P)
            out[ys, xs] = o
    if opts.get('despeckle'):
        out = despeckle(out, CELL, COLS, int(opts['despeckle']))
    return out
