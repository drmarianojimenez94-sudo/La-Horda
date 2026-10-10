#!/usr/bin/env python3
"""LA HORDA — EL PINTOR (tools/art/painter)

Pinta campeones nuevos con el MISMO estilo que el roster encargado, sin generador de imágenes:
no inventa trazos, trabaja con los píxeles del arte aprobado y lo transforma.

  1. DONANTES: las hojas encargadas 4x9 (112 px por cuadro) de la Expedición, sus skins y sus sets
     (donors.json). Todas comparten grilla, ancla, poses por fila y dirección.
  2. MATERIALES: cada hoja se separa en materiales (agrupando color en OKLab/CIELab: capucha, pelo, piel, metal,
     cuero...). Cada material sabe si es de la CABEZA (casi todo arriba del cuello en las vistas de caminar).
  3. ENSAMBLE: cuerpo de un donante + cabeza (pelo, cara, tocado) de otro, cuadro por cuadro: la cabeza se toma
     del cuadro del donante que mira hacia el mismo lado y se apoya en el cuello del cuerpo.
  4. PINTURA: cada material se repinta a la paleta pedida conservando la luz de cada píxel (sombras, brillos,
     texturas, contornos quedan intactos), así que el resultado se lee como el resto del roster.
  5. ACCESORIOS: capas encima para lo que ningún donante tiene (coronas, máscaras, alas...): módulos a medida
     (accessories/) o ELEMENTOS NUEVOS por datos de la forja (forge.py, elements/<nombre>.json).

Uso:
  python3 tools/art/painter/painter.py materials <donante>            # describe los materiales de un donante
  python3 tools/art/painter/painter.py paint <spec.json> [--out DIR]  # pinta un campeón desde su ficha
La ficha (specs/<id>.json) es lo que se escribe a partir del pedido en palabras.
"""
import json, sys, os, argparse
from pathlib import Path
import numpy as np
from PIL import Image
import cv2

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
CELL = 112
COLS = 4
ROWS = 9
# fila -> dirección (meta "sets" de las hojas de la Expedición): 0 caminar abajo, 1 costado, 2 arriba,
# 3-5 ataque abajo/costado/arriba, 6 lanzar, 7 definitiva (de frente), 8 muerte.
ROW_DIR = {0: 'down', 1: 'side', 2: 'up', 3: 'down', 4: 'side', 5: 'up', 6: 'down', 7: 'down', 8: 'death'}
DIR_ROW = {'down': 0, 'side': 1, 'up': 2}


# ---------------------------------------------------------------- donantes
def donors():
    return json.loads((HERE / 'donors.json').read_text())


def load_donor(key):
    d = donors()[key]
    a = np.array(Image.open(ROOT / d['atlas']).convert('RGBA'))
    if a.shape[0] < CELL * ROWS or a.shape[1] < CELL * COLS:
        raise SystemExit(f'{key}: la hoja no tiene el formato 4x9 de 112 px')
    return a[:CELL * ROWS, :CELL * COLS].copy()


def cell(a, i):
    r, c = divmod(i, COLS)
    return a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]


def put_cell(a, i, img):
    r, c = divmod(i, COLS)
    a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] = img


# ---------------------------------------------------------------- color
def to_lab(rgb):
    """CIELab en flotantes (L 0..100, a/b con signo)."""
    lab = cv2.cvtColor(rgb.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    lab[:, 0] *= 100 / 255
    lab[:, 1:] -= 128
    return lab


def from_lab(lab):
    x = lab.copy()
    x[:, 0] = np.clip(x[:, 0] * 255 / 100, 0, 255)
    x[:, 1:] = np.clip(x[:, 1:] + 128, 0, 255)
    return cv2.cvtColor(x.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_LAB2RGB).reshape(-1, 3)


def hex_lab(h):
    h = h.lstrip('#')
    return to_lab(np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)]], np.uint8))[0]


# ---------------------------------------------------------------- materiales
def kmeans(x, k, iters=30, seed=0):
    rng = np.random.default_rng(seed)
    c = x[rng.choice(len(x), k, replace=False)].copy()
    # k-means++ ligero
    for j in range(1, k):
        d = np.min(((x[:, None, :] - c[None, :j, :]) ** 2).sum(-1), 1)
        c[j] = x[rng.choice(len(x), p=d / d.sum())]
    for _ in range(iters):
        lab = np.argmin(((x[:, None, :] - c[None]) ** 2).sum(-1), 1)
        for j in range(k):
            s = x[lab == j]
            if len(s):
                c[j] = s.mean(0)
    return c


def body_mask(img):
    m = (img[:, :, 3] > 0).astype(np.uint8)
    return cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))


def neck(img):
    """(arriba, y del cuello, x del cuello) en un cuadro de pie; None si no hay cuerpo."""
    m = body_mask(img)
    rows = np.where(m.any(1))[0]
    if not len(rows):
        return None
    top, bot = rows[0], rows[-1]
    H = bot - top
    w = m.sum(1)
    lo, hi = top + int(H * .30), top + int(H * .60)
    if hi <= lo:
        return None
    y = lo + int(np.argmin(w[lo:hi]))
    xs = np.where(m[y])[0]
    return top, y, int(xs.mean()) if len(xs) else CELL // 2


class Materials:
    """Materiales de una hoja: centros en Lab, etiqueta por píxel y cuáles son de la cabeza."""

    def __init__(self, atlas, k=10):
        self.atlas = atlas
        m = atlas[:, :, 3] > 0
        lab = to_lab(atlas[:, :, :3].reshape(-1, 3)).reshape(atlas.shape[0], atlas.shape[1], 3)
        self.lab = lab
        feat = self._feat(lab[m])
        sample = feat[:: max(1, len(feat) // 6000)]
        self.centers = kmeans(sample, k)
        self.label = np.full(atlas.shape[:2], -1, np.int32)
        self.label[m] = self.assign(feat)
        self.k = k
        # material de cabeza: en las vistas de caminar, la mayoría de sus píxeles queda arriba del cuello
        above = np.zeros(k)
        total = np.zeros(k)
        for i in range(12):
            c = cell(atlas, i)
            n = neck(c)
            if not n:
                continue
            L = cell(self.label, i)
            for j in range(k):
                sel = L == j
                total[j] += sel.sum()
                above[j] += sel[:n[1]].sum()
        self.head_frac = above / np.maximum(total, 1)
        self.mean_lab = np.array([lab[self.label == j].mean(0) if (self.label == j).any() else [0, 0, 0] for j in range(k)])
        self.count = np.array([(self.label == j).sum() for j in range(k)])

    @staticmethod
    def _feat(lab):
        # el tono y la saturación pesan más que la luz: un mismo material tiene sombras y brillos
        return np.stack([lab[:, 0] * .45, lab[:, 1], lab[:, 2]], 1)

    def assign(self, feat):
        out = np.empty(len(feat), np.int32)
        for s in range(0, len(feat), 50000):
            f = feat[s:s + 50000]
            out[s:s + 50000] = np.argmin(((f[:, None, :] - self.centers[None]) ** 2).sum(-1), 1)
        return out

    def describe(self):
        rows = []
        for j in np.argsort(-self.count):
            L, A, B = self.mean_lab[j]
            rgb = from_lab(np.array([[L, A, B]], np.float32))[0]
            rows.append({'material': int(j), 'pixels': int(self.count[j]), 'color': '#%02x%02x%02x' % tuple(rgb),
                         'L': round(float(L)), 'chroma': round(float(np.hypot(A, B))), 'hue': round(float(np.degrees(np.arctan2(B, A))) % 360),
                         'head': round(float(self.head_frac[j]), 2)})
        return rows


# ---------------------------------------------------------------- cabeza
def skin_mask(img):
    """Piel (cara y manos): tonos cálidos claros y poco saturados."""
    lab = to_lab(img[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)
    h = np.degrees(np.arctan2(lab[:, :, 2], lab[:, :, 1])) % 360
    c = np.hypot(lab[:, :, 1], lab[:, :, 2])
    return (img[:, :, 3] > 0) & (lab[:, :, 0] > 48) & (lab[:, :, 0] < 93) & (c > 8) & (c < 48) & (h > 30) & (h < 82)


def face_box(img):
    """Caja de la cara: el bloque de piel más grande en la mitad de arriba del cuerpo."""
    m = img[:, :, 3] > 0
    rows = np.where(m.any(1))[0]
    if not len(rows):
        return None
    top, bot = rows[0], rows[-1]
    sk = skin_mask(img)
    sk[top + int((bot - top) * .48):] = False
    xs = np.where(m[top:top + int((bot - top) * .4)].any(0))[0]
    if len(xs):  # solo cerca del eje de la masa de arriba (no manos levantadas a un costado)
        cx = xs.mean(); sk[:, :max(0, int(cx - 16))] = False; sk[:, int(cx + 17):] = False
    sk = cv2.morphologyEx(sk.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
    n, comp, stats, _ = cv2.connectedComponentsWithStats(sk, connectivity=8)
    if n <= 1:
        return None
    j = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    if stats[j, cv2.CC_STAT_AREA] < 14:
        return None
    x, y, w, h = stats[j, :4]
    return int(x), int(y), int(x + w - 1), int(y + h - 1)


def frame_neck(img, fallback=None):
    """(arriba, y del cuello, x central de la cabeza). Con cara: el mentón; de espaldas: el del cuadro de frente."""
    m = img[:, :, 3] > 0
    rows = np.where(m.any(1))[0]
    if not len(rows):
        return None
    top = int(rows[0])
    if not fallback:
        f = face_box(img)
        if f:
            return top, f[3] + 1, (f[0] + f[2]) // 2
    if fallback:
        # misma altura de cuello que el cuadro de frente; x: centro de la masa de arriba
        y = fallback[1] - fallback[0] + top
        xs = np.where(m[top:y].any(0))[0]
        return top, int(y), int(xs.mean()) if len(xs) else fallback[2]
    n = neck(img)
    return n


def head_mask(img, nk, long_hair=False):
    """Cabeza = lo opaco por encima del mentón alrededor del eje de la cabeza, más el pelo largo que cae por
    debajo (mismo color que el pelo de arriba y pegado a la cabeza). Nunca toma torso, manos ni armas lejanas."""
    if not nk:
        return None
    top, ny, nx = nk
    alpha = img[:, :, 3] > 0
    up = np.zeros_like(alpha)
    up[:ny + 1] = alpha[:ny + 1]
    # componente conectado que contiene el eje de la cabeza (las armas sueltas por arriba quedan fuera)
    n, comp = cv2.connectedComponents(up.astype(np.uint8), connectivity=8)
    seed_ids = set(np.unique(comp[max(top, ny - 6):ny + 1, max(0, nx - 3):nx + 4])) - {0}
    head = np.isin(comp, list(seed_ids)) if seed_ids else up
    cols = np.where(head.any(0))[0]
    if len(cols):
        hw = max(18, int((ny - top) * 1.05))  # una cabeza chibi es ~ tan ancha como alta
        head &= (np.abs(np.arange(CELL) - nx) <= hw * .75)[None, :]
    # pelo largo: colores de la parte alta de la cabeza que siguen por debajo del mentón, pegados a la cabeza
    lab = to_lab(img[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)
    crown = head.copy(); crown[top + max(3, (ny - top) // 2):] = False
    crown &= ~skin_mask(img)
    if long_hair and crown.sum() > 10:
        hair = lab[crown]
        mu = np.median(hair, 0)
        d = np.linalg.norm((lab - mu) * np.array([.5, 1, 1]), axis=2)
        thr = min(12.0, float(np.percentile(np.linalg.norm((hair - mu) * np.array([.5, 1, 1]), axis=1), 70)))
        cand = alpha & (d <= thr) & ~skin_mask(img)
        cand[:ny + 1] = False
        grow = head.copy()
        for _ in range(int(long_hair) if isinstance(long_hair, int) and long_hair > 1 else 18):
            nxt = cv2.dilate(grow.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
            add = nxt & cand & ~grow
            if not add.any():
                break
            grow |= add
        head = grow
    return head & alpha


def crown_color(img, nk):
    """Color típico del pelo/tocado: mediana Lab de lo opaco en la mitad alta de la cabeza, sin piel."""
    if not nk:
        return None
    top, ny, nx = nk
    m = (img[:, :, 3] > 0) & ~skin_mask(img)
    reg = np.zeros_like(m); reg[top:top + max(3, (ny - top) // 2), max(0, nx - 14):nx + 15] = True
    sel = m & reg
    if sel.sum() < 8:
        return None
    lab = to_lab(img[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)
    return np.median(lab[sel], 0), lab


def near_color(img, lab, mu, thr):
    d = np.linalg.norm((lab - mu) * np.array([.45, 1, 1]), axis=2)
    return (img[:, :, 3] > 0) & (d <= thr) & ~skin_mask(img)


def skirt(img, nk, rows=5, thr=16):
    """El pelo que cae a los costados de la cara, unas filas por debajo del mentón (evita el corte recto)."""
    cc = crown_color(img, nk)
    if cc is None:
        return np.zeros(img.shape[:2], bool)
    mu, lab = cc
    top, ny, nx = nk
    band = np.zeros(img.shape[:2], bool)
    band[ny + 1:min(CELL, ny + 1 + rows), max(0, nx - 18):nx + 19] = True
    return band & near_color(img, lab, mu, thr)


# ---------------------------------------------------------------- pintura
def recolor(img, label, rules, mats):
    """rules: [{"materials":[...] | "hue":[a,b], "minChroma":c, "maxL":..., "to":"#hex", "keepLight":0.6, "chroma":1.0}]
    Repinta conservando la luz de cada píxel: el tono pasa al del color pedido y la luz se corre solo en parte."""
    out = img.copy()
    alpha = img[:, :, 3] > 0
    lab = to_lab(img[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)
    for r in rules:
        # cada regla ve el resultado de las anteriores (orden = prioridad)
        lab = to_lab(out[:, :, :3].reshape(-1, 3)).reshape(img.shape[0], img.shape[1], 3)
        sel = np.zeros(alpha.shape, bool)
        if 'materials' in r:
            sel |= np.isin(label, r['materials'])
        if 'hue' in r:
            h = (np.degrees(np.arctan2(lab[:, :, 2], lab[:, :, 1])) % 360)
            c = np.hypot(lab[:, :, 1], lab[:, :, 2])
            a, b = r['hue']
            inh = (h >= a) & (h <= b) if a <= b else (h >= a) | (h <= b)
            sel |= inh & (c >= r.get('minChroma', 8))
        if 'maxL' in r:
            sel &= lab[:, :, 0] <= r['maxL']
        if 'minL' in r:
            sel &= lab[:, :, 0] >= r['minL']
        if 'region' in r and r['region'] is not None:
            sel &= r['region']
        if r.get('noSkin'):
            sel &= ~skin_mask(img)
        if r.get('keepDark', True):
            # contornos y pupilas: lo muy oscuro queda como está (el contorno del roster es casi negro)
            sel &= lab[:, :, 0] > r.get('darkL', 9)
        if r.get('keepEyes', True) and r.get('region') is not None and r['region'] is not None:
            # ojos: píxeles saturados y chicos rodeados de piel, dentro de la cara
            sk = skin_mask(img)
            near_skin = cv2.dilate(sk.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            c = np.hypot(lab[:, :, 1], lab[:, :, 2])
            sel &= ~(near_skin & ~sk & (c > 12) & (cv2.erode(near_skin.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0))
        sel &= alpha
        if not sel.any():
            continue
        px = lab[sel]
        if 'ramp' in r:
            # mapa de degradado: la luz de cada píxel (relativa a la selección) elige su color en la rampa pedida
            ramp = np.array([hex_lab(c) for c in r['ramp']], np.float32)
            lo, hi = np.percentile(px[:, 0], [3, 97])
            t01 = np.clip((px[:, 0] - lo) / max(hi - lo, 1), 0, 1) ** r.get('gamma', 1.0)
            pos = t01 * (len(ramp) - 1)
            i0 = np.floor(pos).astype(int).clip(0, len(ramp) - 2)
            f = (pos - i0)[:, None]
            nl = ramp[i0] * (1 - f) + ramp[i0 + 1] * f
            out[sel, :3] = from_lab(nl.astype(np.float32))
            continue
        t = hex_lab(r['to'])
        srcL = px[:, 0].mean()
        srcC = np.hypot(px[:, 1], px[:, 2]).mean() + 1e-3
        tC = np.hypot(t[1], t[2])
        ang = np.arctan2(t[2], t[1])
        pc = np.hypot(px[:, 1], px[:, 2])
        # croma: proporcional al píxel original (sus sombras quedan más apagadas), escalado al croma pedido
        k = r.get('chroma', 1.0) * (tC / srcC if srcC > 4 else 1.0)
        newC = np.clip(pc * k if srcC > 4 else np.full_like(pc, tC) * (px[:, 0] / max(srcL, 1)), 0, 110)
        keep = r.get('keepLight', .65)
        # la luz se corre hacia la del color pedido pero conserva el contraste relativo de cada píxel (sombras y
        # brillos); 'contrast' estira o comprime ese contraste (pelo rubio: más claro y algo más suave)
        newL = t[0] * (1 - keep) + srcL * keep + (px[:, 0] - srcL) * r.get('contrast', 1.0)
        nl = np.stack([newL, newC * np.cos(ang), newC * np.sin(ang)], 1)
        out[sel, :3] = from_lab(nl.astype(np.float32))
    return out


def pose_head(body_frame, donor_frame, override):
    """Opt-in polygon assembly for non-upright poses. Coordinates are cell-local.

    Never infer a dead character's neck from upright anatomy; a recipe supplies
    reviewed source/erase polygons and an integer translation. Reject clipping.
    """
    def polygon(points):
        if not isinstance(points, list) or len(points) < 3:
            raise ValueError('pose head requires a polygon of at least three points')
        if any(not isinstance(p, list) or len(p) != 2 or any(type(v) is not int or not 0 <= v < CELL for v in p) for p in points):
            raise ValueError('pose head polygon outside frame')
        mask = np.zeros((CELL, CELL), np.uint8)
        cv2.fillPoly(mask, [np.array(points, np.int32)], 1)
        return mask.astype(bool)
    source = polygon(override.get('sourcePolygon')) & (donor_frame[:, :, 3] > 0)
    erase = polygon(override.get('erasePolygon'))
    offset = override.get('offset')
    if not isinstance(offset, list) or len(offset) != 2 or any(type(v) is not int for v in offset):
        raise ValueError('pose head requires integer offset')
    if not source.any():
        raise ValueError('pose head selects no donor pixels')
    ys, xs = np.where(source)
    X, Y = xs + offset[0], ys + offset[1]
    if np.any((X < 0) | (X >= CELL) | (Y < 0) | (Y >= CELL)):
        raise ValueError('pose head would clip donor pixels')
    result = body_frame.copy()
    result[erase] = 0
    result[Y, X] = donor_frame[ys, xs]
    mask = np.zeros((CELL, CELL), bool)
    mask[Y, X] = True
    return result, mask


# ---------------------------------------------------------------- ensamble
def assemble(spec):
    overrides = spec.get('poseHeadOverrides', {})
    if not isinstance(overrides, dict) or any(not isinstance(k, str) or not k.isdigit() or str(int(k)) != k or not 0 <= int(k) < COLS * ROWS or not isinstance(v, dict) for k, v in overrides.items()):
        raise ValueError('pose head override requires valid frame keys and objects')
    body_key = spec['body']
    body = load_donor(body_key)
    bm = Materials(body, spec.get('bodyMaterials', 10))
    out = body.copy()
    headmap = np.zeros(body.shape[:2], bool)   # dónde quedó la cabeza en la hoja final (para pintar por parte)
    head_key = spec.get('head')
    hm = hd = None
    if head_key and head_key != body_key:
        hd = load_donor(head_key)
        hm = Materials(hd, spec.get('headMaterials', 10))
    b_head = set(spec.get('bodyHeadMaterials') or [j for j in range(bm.k) if bm.head_frac[j] >= .62])
    d_head = set(spec.get('headHeadMaterials') or ([j for j in range(hm.k) if hm.head_frac[j] >= .62] if hm else []))
    report = {'body': body_key, 'head': head_key, 'bodyHeadMaterials': sorted(int(x) for x in b_head),
              'donorHeadMaterials': sorted(int(x) for x in d_head), 'frames': []}
    necks_b = {}; necks_d = {}
    frame_info = {}  # por cuadro: cuello (arriba, y, x) final, para accesorios
    for i in range(COLS * ROWS):
        row = i // COLS
        b = cell(body, i).copy()
        override = overrides.get(str(i))
        if override is not None:
            source_index = override.get('sourceFrame')
            if hd is None or type(source_index) is not int or not 0 <= source_index < COLS * ROWS:
                raise ValueError('pose head requires a distinct donor and valid source frame')
            result, mask = pose_head(b, cell(hd, source_index), override)
            put_cell(out, i, result)
            put_cell(headmap, i, mask)
            report['frames'].append({'i': i, 'src': source_index, 'poseOverride': True})
            continue
        if ROW_DIR[row] == 'death':
            # tendido: la "cabeza" es lo que tiene el color del pelo del cuerpo (medido de frente); se pinta igual
            cc = crown_color(cell(body, 0), frame_neck(cell(body, 0)))
            if cc is not None:
                lab_d = to_lab(b[:, :, :3].reshape(-1, 3)).reshape(CELL, CELL, 3)
                put_cell(headmap, i, near_color(b, lab_d, cc[0], spec.get('deathHairThr', 18)))
            put_cell(out, i, b)
            continue
        fb = necks_b.get(i % COLS) if ROW_DIR[row] == 'up' else None
        bn = frame_neck(b, fb)
        if row == 0 and bn:
            necks_b[i % COLS] = bn
        bmask = head_mask(b, bn, spec.get('bodyLongHair', False))
        if bn:
            frame_info[i] = {'top': int(bn[0]), 'neckY': int(bn[1]), 'neckX': int(bn[2]), 'dir': ROW_DIR[row]}
        if hd is None:
            if bmask is not None:
                put_cell(headmap, i, bmask)
            put_cell(out, i, b)
            continue
        # cabeza del donante: mismo cuadro si es de caminar; si no, el cuadro de caminar que mira hacia el mismo lado
        di = i if row <= 2 else DIR_ROW[ROW_DIR[row]] * COLS + (i % COLS)
        d = cell(hd, di)
        dfb = necks_d.get(di % COLS) if ROW_DIR[di // COLS] == 'up' else None
        dn = frame_neck(d, dfb)
        if di // COLS == 0 and dn:
            necks_d[di % COLS] = dn
        dmask = head_mask(d, dn, spec.get('headLongHair', False))
        if bmask is None or dmask is None or not dmask.any():
            if bmask is not None:
                put_cell(headmap, i, bmask)
            put_cell(out, i, b)
            report['frames'].append({'i': i, 'skip': True})
            continue
        res = b.copy()
        res[bmask | skirt(b, bn, spec.get('skirtRows', 6))] = 0
        dmask = dmask | skirt(d, dn, spec.get('skirtRows', 6))
        dy, dx = bn[1] - dn[1], bn[2] - dn[2]
        ys, xs = np.where(dmask)
        Y, X = ys + dy, xs + dx
        ok = (Y >= 0) & (Y < CELL) & (X >= 0) & (X < CELL)
        res[Y[ok], X[ok]] = d[ys[ok], xs[ok]]
        hmk = np.zeros((CELL, CELL), bool); hmk[Y[ok], X[ok]] = True
        put_cell(headmap, i, hmk)
        put_cell(out, i, res)
        report['frames'].append({'i': i, 'src': di, 'dy': int(dy), 'dx': int(dx)})
    # pintura por material (reglas del cuerpo sobre el cuerpo; reglas "head" sobre la cabeza nueva)
    out_mats = Materials(out, spec.get('paintMaterials', 12))
    rules = []
    for r in spec.get('paint', []):
        r = dict(r)
        if 'materialsOf' in r:  # materiales descritos por color aproximado: "#7a2030" -> los más cercanos
            t = hex_lab(r.pop('materialsOf'))
            d = np.linalg.norm(out_mats.mean_lab[:, 1:] - t[1:], axis=1) + .35 * abs(out_mats.mean_lab[:, 0] - t[0])
            r['materials'] = [int(j) for j in np.argsort(d)[:r.pop('take', 1)]]
        part = r.pop('part', 'all')
        r['region'] = headmap if part == 'head' else (~headmap if part == 'body' else None)
        rules.append(r)
    out = recolor(out, out_mats.label, rules, out_mats)
    report['paintMaterials'] = out_mats.describe()
    # accesorios: módulos tools/art/painter/accessories/<nombre>.py con draw(atlas, info, spec) -> atlas, o
    # elementos de la forja ({"element": "<nombre>"} -> tools/art/painter/elements/<nombre>.json, ver forge.py)
    for acc in spec.get('accessories', []):
        if isinstance(acc, dict) and 'element' in acc:
            sys.path.insert(0, str(HERE)); import forge
            out = forge.apply(out, {'frames': frame_info, 'headmap': headmap, 'CELL': CELL, 'COLS': COLS, 'ROW_DIR': ROW_DIR}, acc)
            continue
        import importlib.util
        name = acc if isinstance(acc, str) else acc['module']
        path = HERE / 'accessories' / (name + '.py')
        mod_spec = importlib.util.spec_from_file_location('acc_' + name, path)
        mod = importlib.util.module_from_spec(mod_spec)
        mod_spec.loader.exec_module(mod)
        out = mod.draw(out, {'frames': frame_info, 'headmap': headmap, 'CELL': CELL, 'COLS': COLS, 'ROW_DIR': ROW_DIR},
                       acc if isinstance(acc, dict) else {})
    report['frameInfo'] = frame_info
    return out, report


def preview(atlas, path, scale=3, frames=(0, 4, 8, 12, 16, 24, 28, 32)):
    tiles = [cell(atlas, i) for i in frames]
    strip = np.concatenate(tiles, 1)
    im = Image.new('RGBA', (strip.shape[1] * scale, strip.shape[0] * scale), (58, 62, 70, 255))
    im.alpha_composite(Image.fromarray(strip).resize(im.size, Image.NEAREST))
    im.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['materials', 'paint'])
    ap.add_argument('arg')
    ap.add_argument('--out')
    a = ap.parse_args()
    if a.cmd == 'materials':
        m = Materials(load_donor(a.arg))
        print(json.dumps(m.describe(), indent=1))
        return
    spec = json.loads(Path(a.arg).read_text())
    atlas, report = assemble(spec)
    out = Path(a.out or (HERE / 'out' / spec['id']))
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(atlas).save(out / 'atlas.png')
    preview(atlas, out / 'sheet.png')
    pv = cell(atlas, 0)
    Image.fromarray(pv).save(out / 'preview.png')
    (out / 'report.json').write_text(json.dumps(report, indent=1))
    print(json.dumps({'id': spec['id'], 'out': str(out), 'frames': len(report['frames'])}))


if __name__ == '__main__':
    main()
