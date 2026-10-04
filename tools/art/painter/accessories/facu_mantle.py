"""Facu GM — manto de agua viva (accesorio del Pintor).

El manto es la capa del donante (Nahir) repintada con la rampa de agua en la ficha. Este accesorio la vuelve
agua que se mueve:
  1. Cáusticas: vetas finas de luz que bajan en diagonal por el manto y se corren de cuadro en cuadro (oleaje).
     Suben la luz un escalón (contraste moderado, sin romper el sombreado del donante).
  2. Espuma: el borde de abajo del manto (el píxel justo arriba del contorno) se vuelve espuma blanca a tramos.
  3. Volantes de agua: debajo del borde inferior, donde el cuerpo es transparente, crestas de 1-3 px con contorno
     que ondulan con el cuadro (el agua que gotea del manto). Nunca tapan el cuerpo.
El manto se reconoce por el color del donante (capa cian/turquesa) y porque en la salida sigue siendo agua
(lo que tapó la cabeza nueva queda fuera).
opts: body (donante), outHue/minC (tono y croma del manto ya pintado), foam, light (color de las cáusticas), outline, ripple (0..1), frills (true/false).
"""
import importlib.util
from pathlib import Path
import numpy as np
import cv2

HERE = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('painter_core_m', HERE / 'painter.py')
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)


_ks = importlib.util.spec_from_file_location('facu_keel_m', Path(__file__).resolve().parent / 'facu_keel.py')
K = importlib.util.module_from_spec(_ks)
_ks.loader.exec_module(K)


def _rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def _lab(img):
    return P.to_lab(img[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)


def cape_mask(N, out, hue=(165, 245), out_hue=(150, 310), minC=6):
    ln, lo = _lab(N), _lab(out)
    hn = np.degrees(np.arctan2(ln[..., 2], ln[..., 1])) % 360
    cn = np.hypot(ln[..., 1], ln[..., 2])
    ho = np.degrees(np.arctan2(lo[..., 2], lo[..., 1])) % 360
    co = np.hypot(lo[..., 1], lo[..., 2])
    m = (N[:, :, 3] > 0) & (out[:, :, 3] > 0) & (cn >= 10) & (ln[..., 0] < 75) & (hn >= hue[0]) & (hn <= hue[1])
    m &= (co >= minC) & (ho >= out_hue[0]) & (ho <= out_hue[1]) & ~P.skin_mask(N) & ~P.skin_mask(out)
    return m


def draw(atlas, info, opts):
    CELL, COLS = info['CELL'], info['COLS']
    N = P.load_donor(opts.get('body', 'nahir'))
    foam = _rgb(opts.get('foam', '#c9fbf1'))
    foam2 = _rgb(opts.get('foam2', '#8fe9dc'))
    light = _rgb(opts.get('light', '#5fd6cb'))
    outc = _rgb(opts.get('outline', '#061428'))
    water = [_rgb(c) for c in opts.get('frillRamp', ['#0e5b72', '#1e9aa0', '#5fd6cb'])]
    ripple = opts.get('ripple', 0.45)
    out = atlas.copy()
    for i in range(COLS * 9):
        r, c = divmod(i, COLS)
        sl = (slice(r * CELL, (r + 1) * CELL), slice(c * CELL, (c + 1) * CELL))
        cur = out[sl].copy()
        n = N[sl]
        cm = cape_mask(n, cur, out_hue=tuple(opts.get('outHue', (150, 310))), minC=opts.get('minC', 6))
        # las hojas (Quilla) tienen reflejos cian en el donante: no son manto
        bl, _ = K.blade_mask(n, cur)
        cm &= ~(cv2.dilate(bl.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
        cm = cv2.morphologyEx(cm.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
        if cm.sum() < 20:
            continue
        lab = _lab(cur)
        inner = cv2.erode(cm.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        phase = c * np.pi / 2 + r * .7
        yy, xx = np.mgrid[0:CELL, 0:CELL]
        # 1. cáusticas: bandas diagonales finas que se mueven
        w = np.sin(xx * .62 + yy * .38 - phase * 1.0) + .55 * np.sin(xx * .21 - yy * .57 + phase * .8)
        vein = inner & (w > 1.18) & (lab[..., 0] > 18)
        cur[vein, :3] = np.clip(cur[vein, :3].astype(np.float32) * (1 - ripple) + light * ripple, 0, 255).astype(np.uint8)
        # 2. espuma en el borde de abajo (justo arriba del contorno), a tramos
        alpha = cur[:, :, 3] > 0
        below_empty = np.zeros_like(alpha)
        below_empty[:-2] = ~alpha[2:]
        dark_below = np.zeros_like(alpha)
        dark_below[:-1] = lab[1:, :, 0] < 12
        edge = cm & dark_below & below_empty & (lab[..., 0] > 14)
        gate = np.sin(xx * .9 + phase * 1.7) > -.35
        f1 = edge & gate
        cur[f1, :3] = np.clip(cur[f1, :3].astype(np.float32) * .12 + foam * .88, 0, 255).astype(np.uint8)
        f2 = edge & ~gate
        cur[f2, :3] = np.clip(cur[f2, :3].astype(np.float32) * .4 + foam2 * .6, 0, 255).astype(np.uint8)
        # 3. volantes de agua bajo el borde inferior del manto (solo sobre transparente)
        if opts.get('frills', True):
            capeish = cv2.dilate(cm.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
            add = np.zeros((CELL, CELL), np.int8) - 1
            for x in range(1, CELL - 1):
                col = np.where(capeish[:, x] & alpha[:, x])[0]
                if not len(col):
                    continue
                yb = col.max()
                if yb + 1 >= CELL or alpha[yb + 1, x] or not cm[max(0, yb - 3):yb + 1, x].any():
                    continue
                h = int(round(1.2 + 1.3 * np.sin(x * .55 + phase * 1.3)))
                if h > 0 and lab[yb, x, 0] < 14:
                    add[yb, x] = 1          # el contorno viejo pasa a ser agua; el nuevo va al final
                for k in range(h):
                    y = yb + 1 + k
                    if y < CELL - 1 and not alpha[y, x]:
                        add[y, x] = min(2, h - 1 - k) if k < h - 1 else 0
            m = add >= 0
            if m.any():
                for v in range(3):
                    cur[add == v, :3] = water[v]
                    cur[add == v, 3] = 255
                # contorno bajo y a los costados de los volantes
                pad = np.pad(m, 1)
                nb = pad[:-2, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
                ol = nb & ~m & ~(cur[:, :, 3] > 0)
                cur[ol, :3] = outc
                cur[ol, 3] = 255
        out[sl] = cur
    return out
