"""Utilidades de dibujo para accesorios del pintor (estilo roster: contorno oscuro de 1 px, rampa suave
de varios tonos con luz arriba-izquierda, píxel nítido). Copia por familia: khepri_lib / vhal_lib / bront_lib."""
import numpy as np
import cv2

CELL = 112
COLS = 4


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def _lab(rgb):
    return cv2.cvtColor(np.clip(rgb, 0, 255).reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)


def _rgb(lab):
    return cv2.cvtColor(np.clip(lab, 0, 255).reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_LAB2RGB).reshape(-1, 3)


def ramp_colors(ramp, t):
    """t (0..1, array) -> RGB interpolado en Lab sobre la rampa (oscuro -> claro)."""
    R = _lab(np.array([hexrgb(c) for c in ramp]))
    pos = np.clip(t, 0, 1) * (len(R) - 1)
    i0 = np.floor(pos).astype(int).clip(0, len(R) - 2)
    f = (pos - i0)[:, None]
    return _rgb(R[i0] * (1 - f) + R[i0 + 1] * f)


def cell_view(atlas, i):
    r, c = divmod(i, COLS)
    return atlas[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]


def shade(mask, ramp, light=(-.7, -.7), round_w=.55, jitter=.05, seed=0, outline='#140d10', bias=0.0):
    """Pinta una forma (máscara bool) con volumen: mezcla de distancia al borde (redondez) y gradiente hacia la luz.
    Devuelve (rgb HxWx3 uint8, mask). El borde exterior queda como contorno oscuro."""
    H, W = mask.shape
    m8 = mask.astype(np.uint8)
    if not mask.any():
        return np.zeros((H, W, 3), np.uint8), mask
    dt = cv2.distanceTransform(m8, cv2.DIST_L2, 3)
    dtn = dt / max(dt.max(), 1)
    ys, xs = np.nonzero(mask)
    cx, cy = xs.mean(), ys.mean()
    sx, sy = max(xs.ptp(), 1), max(ys.ptp(), 1)
    Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
    g = -((X - cx) / sx * light[0] + (Y - cy) / sy * light[1])  # positivo hacia la luz
    g = (g - g[mask].min()) / max(np.ptp(g[mask]), 1e-3)
    t = round_w * np.sqrt(dtn) + (1 - round_w) * g + bias
    rng = np.random.default_rng(seed)
    t = t + rng.normal(0, jitter, t.shape)
    out = np.zeros((H, W, 3), np.uint8)
    out[mask] = ramp_colors(ramp, t[mask])
    edge = mask & ~(cv2.erode(m8, np.ones((3, 3), np.uint8)) > 0)
    out[edge] = hexrgb(outline)
    return out, mask


def paste(cellimg, rgb, mask, behind=False, alpha=255):
    """Compone en el cuadro. behind=True: solo donde el cuadro es transparente (detrás del cuerpo)."""
    sel = mask.copy()
    if behind:
        sel &= cellimg[:, :, 3] == 0
    if alpha >= 255:
        cellimg[sel, :3] = rgb[sel]
        cellimg[sel, 3] = 255
    else:
        a = alpha / 255.0
        base = cellimg[sel, :3].astype(np.float32)
        cellimg[sel, :3] = (base * (1 - a) + rgb[sel] * a).astype(np.uint8)
        cellimg[sel, 3] = np.maximum(cellimg[sel, 3], alpha)
    return sel


def ellipse_mask(cx, cy, rx, ry, ang=0.0, size=CELL):
    m = np.zeros((size, size), np.uint8)
    cv2.ellipse(m, (int(round(cx)), int(round(cy))), (max(1, int(round(rx))), max(1, int(round(ry)))), ang, 0, 360, 1, -1)
    return m > 0


def poly_mask(pts, size=CELL):
    m = np.zeros((size, size), np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
    return m > 0


def lab_of(cellimg):
    return cv2.cvtColor(cellimg[:, :, :3], cv2.COLOR_RGB2LAB).astype(np.float32)


def outline_fix(cellimg, dark='#140d10'):
    """Bordes de la silueta que quedaron claros -> contorno oscuro (después de borrar/pegar)."""
    a = cellimg[:, :, 3] > 0
    edge = a & ~(cv2.erode(a.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
    L = lab_of(cellimg)[:, :, 0] * 100 / 255
    fix = edge & (L > 30)
    cellimg[fix, :3] = (cellimg[fix, :3].astype(np.float32) * .25 + hexrgb(dark) * .75).astype(np.uint8)


def drop_specks(cellimg, min_area=4):
    """Quita islas opacas diminutas (píxeles sueltos)."""
    a = (cellimg[:, :, 3] > 0).astype(np.uint8)
    n, comp, stats, _ = cv2.connectedComponentsWithStats(a, connectivity=8)
    for j in range(1, n):
        if stats[j, cv2.CC_STAT_AREA] < min_area:
            cellimg[comp == j] = 0
