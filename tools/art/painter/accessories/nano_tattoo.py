"""Nano GM — Brazos del Umbral: tatuajes negros que se agrietan en runas, y ojos de oro.

  * piel de brazo (skin_mask fuera de la cabeza y del pecho): bandas diagonales de tinta en 2 tonos (siguen la luz);
  * antebrazo oscuro (el guante del donante, a los costados del torso en frente/espalda): queda negro de tinta y se
    agrieta en runas: trazos cortos de 2 px brillantes (marfil en la base, oro en la skin) con halo de 1 px;
  * ojos: la fila baja de cada ojo abierto toma un brillo dorado (iris de oro del Regente).
opts: ink [oscuro, claro], rune, runeGlow, chest, every, eye [tenue, brillo], armHalf (medio ancho del torso).
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


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


def largest(m):
    n, comp, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    if n <= 1:
        return m
    return comp == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))


def fill_holes(m):
    inv = (~m).astype(np.uint8)
    n, comp = cv2.connectedComponents(inv, connectivity=4)
    border = set(np.unique(np.concatenate([comp[0], comp[-1], comp[:, 0], comp[:, -1]])))
    return m | (~np.isin(comp, list(border)) & ~m)


def draw(atlas, info, opts):
    COLS = info['COLS']
    ink = [hexrgb(c) for c in opts.get('ink', ['#140c16', '#2a1c2c'])]
    rune = hexrgb(opts.get('rune', '#fff4d6'))
    glow = hexrgb(opts['runeGlow']) if opts.get('runeGlow') else None
    eye = [hexrgb(c) for c in opts.get('eye', ['#a8782a', '#f4d77a'])]
    chest = opts.get('chest', 6)
    every = opts.get('every', 9)
    half = opts.get('armHalf', 8)
    out = atlas.copy()
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    for i in range(36):
        row, col = divmod(i, COLS)
        d = info['ROW_DIR'][row]
        sl = (slice(row * CELL, (row + 1) * CELL), slice(col * CELL, (col + 1) * CELL))
        c = out[sl]
        hm = info['headmap'][sl]
        a = c[:, :, 3] > 0
        lab = P.to_lab(c[:, :, :3].reshape(-1, 3)).reshape(CELL, CELL, 3)
        L = lab[:, :, 0]
        C = np.hypot(lab[:, :, 1], lab[:, :, 2])
        sk_all = P.skin_mask(c)
        sk = sk_all & ~hm
        f = info['frames'].get(i)
        hx = hy = None
        if f is not None:
            hy, hx = f['neckY'], f['neckX']
            hys, hxs = np.where(hm)
            if len(hxs):
                hx = int(np.median(hxs))
            if d != 'up':
                w = chest if d == 'down' else chest - 2
                sk &= ~((np.abs(xx - hx) <= w) & (yy <= hy + 14))
        # 1) piel de brazo -> bandas de tinta
        if row == 8:
            sk &= ~hm
        if sk.any():
            band = ((xx + yy * 2) % 5) < 3
            notch = ((xx * 3 + yy) % 7) == 0
            tat = sk & band & ~notch
            lit = L > np.median(L[sk])
            c[tat & ~lit, :3] = ink[0]
            c[tat & lit, :3] = ink[1]
            rm = tat & (((xx * 5 + yy * 3 + i) % every) == 0)
            if glow is not None:
                g = np.zeros_like(rm); g[1:] |= rm[:-1]; g[:-1] |= rm[1:]
                c[g & tat & ~rm, :3] = glow
            c[rm, :3] = rune
        # 2) antebrazos oscuros a los costados del torso (frente/espalda) -> runas agrietadas
        if f is not None and d in ('down', 'up') and row != 8:
            inner = a & (cv2.erode(a.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
            arm = inner & ~hm & (np.abs(xx - hx) > half) & (yy > hy + 2) & (yy < hy + (24 if row <= 2 else 14)) & (L > 9) & (L < 40) & (C < 11)
            arm &= ~sk_all
            seeds = arm & (((xx * 3 + yy * 5 + i * 2) % 11) == 0)
            stroke = seeds.copy(); stroke[1:] |= seeds[:-1] & arm[1:]        # trazo de 2 px hacia abajo
            stroke[1:, 1:] |= seeds[:-1, :-1] & arm[1:, 1:] & (((xx[1:, 1:] + yy[1:, 1:]) % 2) == 0)
            if glow is not None:
                g = cv2.dilate(stroke.astype(np.uint8), np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], np.uint8)) > 0
                c[g & arm & ~stroke, :3] = (glow.astype(np.float32) * .55 + c[g & arm & ~stroke, :3] * .45).astype(np.uint8)
            c[stroke, :3] = rune
        # 3) ojos de oro: la fila baja de cada ojo (oscuro con piel justo debajo) dentro de la cara
        if f is not None and d != 'up' and row != 8:
            face = largest(sk_all & hm)
            if face.any():
                fy = np.where(face.any(1))[0]; fx = np.where(face.any(0))[0]
                box = np.zeros_like(face); box[fy.min():fy.min() + max(3, (fy.max() - fy.min()) * 2 // 3), fx.min():fx.max() + 1] = True
                below = np.zeros_like(face); below[:-1] = sk_all[1:]
                above_dark = np.zeros_like(face); above_dark[1:] = (L[:-1] < 32) & hm[:-1]
                bot = box & hm & a & (L < 32) & ~sk_all & below & above_dark
                n, comp, st, _ = cv2.connectedComponentsWithStats(bot.astype(np.uint8), connectivity=8)
                for j in range(1, n):
                    x, y, w, h, area = st[j]
                    if w < 2 or w > 5:
                        continue
                    c[comp == j, :3] = eye[0]
                    c[y, x + w // 2, :3] = eye[1]
    return out
