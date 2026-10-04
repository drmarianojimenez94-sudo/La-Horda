"""Facu GM — Quilla Ceremonial (accesorio del Pintor).

Las hojas curvas del donante (Nahir) pasan a ser la Quilla Ceremonial: hoja de bronce y oro con el filo de agua
(un hilo turquesa claro en el borde exterior, como el agua que corta una quilla).

Por qué un accesorio y no una regla de la ficha: el material claro de las hojas es el mismo que los brillos de la
armadura; una regla de color dejaría motas doradas sobre el azul. Aquí la hoja se reconoce por forma: componentes
grandes y conexos de píxeles claros del donante (los brillos de la armadura son chicos y sueltos). La luz de cada
píxel sale del donante, así que el sombreado de la hoja es el original.
opts: body, ramp (oro, oscuro→claro), edge (color del filo), minArea, minL.
"""
import importlib.util
from pathlib import Path
import numpy as np
import cv2

HERE = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('painter_core_k', HERE / 'painter.py')
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)

DEF_RAMP = ['#4a2c0c', '#8a5a1c', '#c08a34', '#e6c068', '#fff1c0']


def _lab(img):
    return P.to_lab(img[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)


def _ramp(L, ramp, lo, hi, gamma=1.0):
    R = np.array([P.hex_lab(c) for c in ramp], np.float32)
    t = np.clip((L - lo) / max(hi - lo, 1), 0, 1) ** gamma
    pos = t * (len(R) - 1)
    i0 = np.floor(pos).astype(int).clip(0, len(R) - 2)
    f = (pos - i0)[:, None]
    return P.from_lab((R[i0] * (1 - f) + R[i0 + 1] * f).astype(np.float32))


def blade_mask(n, out, minL=50, minArea=22):
    ln = _lab(n)
    C = np.hypot(ln[..., 1], ln[..., 2])
    h = np.degrees(np.arctan2(ln[..., 2], ln[..., 1])) % 360
    # acero del donante: claro y frío/neutro (no piel, no capa saturada)
    bright = (n[:, :, 3] > 0) & (ln[..., 0] >= minL) & ~P.skin_mask(n) & ((C < 16) | ((h > 200) & (h < 290)))
    nn, comp, st, _ = cv2.connectedComponentsWithStats(bright.astype(np.uint8), connectivity=8)
    big = np.isin(comp, [j for j in range(1, nn) if st[j, cv2.CC_STAT_AREA] >= minArea])
    # la hoja incluye su sombra (acero azulado medio) pegada al brillo
    mid = (n[:, :, 3] > 0) & (ln[..., 0] >= 28) & ~P.skin_mask(n) & ((C < 16) | ((h > 200) & (h < 290)))
    grow = big.copy()
    for _ in range(2):
        grow |= (cv2.dilate(grow.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & mid
    # corre ANTES de facu_head: la cabeza nueva tapa lo que deba y devuelve encima las hojas que la cruzan
    return grow & (out[:, :, 3] > 0), ln


def draw(atlas, info, opts):
    CELL, COLS = info['CELL'], info['COLS']
    N = P.load_donor(opts.get('body', 'nahir'))
    ramp = opts.get('ramp', DEF_RAMP)
    edge = np.array([int(opts.get('edge', '#9ff3e6').lstrip('#')[k:k + 2], 16) for k in (0, 2, 4)], np.uint8)
    out = atlas.copy()
    for i in range(COLS * 9):
        r, c = divmod(i, COLS)
        sl = (slice(r * CELL, (r + 1) * CELL), slice(c * CELL, (c + 1) * CELL))
        cur = out[sl].copy()
        n = N[sl]
        bm, ln = blade_mask(n, cur, opts.get('minL', 50), opts.get('minArea', 22))
        if not bm.any():
            continue
        L = ln[..., 0]
        cur[bm, :3] = _ramp(L[bm], ramp, 28, 96, opts.get('gamma', 0.9))
        # filo de agua: píxeles de la hoja que tocan el contorno por arriba/afuera y son los más claros
        er = cv2.erode(bm.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        rim = bm & ~er & (L > np.percentile(L[bm], 55))
        cur[rim, :3] = (cur[rim, :3].astype(np.float32) * .35 + edge.astype(np.float32) * .65).astype(np.uint8)
        out[sl] = cur
    return out
