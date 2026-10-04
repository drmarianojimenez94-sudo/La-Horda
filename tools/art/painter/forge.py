#!/usr/bin/env python3
"""LA HORDA — FORJA DE ELEMENTOS del Pintor (tools/art/painter).

El Pintor arma un campeón con piezas de las hojas ENCARGADAS (cuerpo de un donante, cabeza de otro) y las
repinta. Lo que ningún donante tiene (una corona, hombreras, una capa, un emblema, alas...) se agrega con
ELEMENTOS NUEVOS. Antes cada uno era un módulo Python a medida; la forja permite crearlos por DATOS:

  tools/art/painter/elements/<nombre>.json  =  formas (elipse, polígono, rectángulo, anillo, línea) ancladas a
  puntos que la forja MIDE en cada cuadro de la hoja ya armada (cabeza, cuello, hombros, pecho, cintura,
  pies), con materiales de rampa (oscuro -> claro). Cada forma se pinta con el lenguaje del roster: volumen
  (más claro hacia el centro), luz desde arriba a la izquierda, contorno oscuro de 1 px y píxel nítido.
  Las medidas siguen al cuerpo cuadro por cuadro (caminar, atacar, lanzar), así que la pieza acompaña la
  animación sin dibujarla a mano, y la escala sale del tamaño de cabeza del donante.

Uso en una ficha del pintor (specs/<id>.json):
  "accessories": [ {"element": "hombreras_de_coral"},
                   {"element": "corona_de_espinas", "materials": {"metal": {"ramp": ["#..", "#..", "#.."]}}, "scale": 1.1} ]

Comandos:
  python3 tools/art/painter/forge.py list                                   # biblioteca de elementos
  python3 tools/art/painter/forge.py new <nombre> --kind <plantilla>        # crea elements/<nombre>.json
  python3 tools/art/painter/forge.py anchors [--on <donante>]               # hoja con los anclajes marcados
  python3 tools/art/painter/forge.py preview <nombre> [--on <donante|ficha>] # hoja de contacto + gate
  python3 tools/art/painter/forge.py check [<nombre> ...]                   # gate de la biblioteca (sale 1 si falla)

Gate de cada elemento (sobre varios donantes de cuerpos distintos): forma válida; dibuja en cada vista pedida;
no se corta en el borde de la celda; no baja de la línea de pies; no cambia la altura de cuerpo que mide el
Roster Art Gate (±2 px); está sombreado (≥3 tonos, no plano) y tiene contorno; y la hoja resultante sigue
dentro del rango de ESTILO del roster (style_gate.py).

También es la librería de dibujo compartida de los accesorios a medida (antes copiada en bront_lib, khepri_lib
y vhal_lib, que ahora la reexportan).
"""
import json, sys, zlib, argparse
from pathlib import Path
import numpy as np
import cv2

CELL = 112
COLS = 4
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ELEMENTS_DIR = HERE / 'elements'


# ================================================================ librería de dibujo (estilo roster)
def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def _lab(rgb):
    return cv2.cvtColor(np.clip(rgb, 0, 255).reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)


def _rgb(lab):
    return cv2.cvtColor(np.clip(lab, 0, 255).reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_LAB2RGB).reshape(-1, 3)


def ramp_colors(ramp, t):
    """t (0..1, array) -> RGB interpolado en Lab sobre la rampa (oscuro -> claro)."""
    t = np.asarray(t, np.float32).reshape(-1)
    if not len(t):
        return np.zeros((0, 3), np.uint8)
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
    sx, sy = max(np.ptp(xs), 1), max(np.ptp(ys), 1)
    Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
    g = -((X - cx) / sx * light[0] + (Y - cy) / sy * light[1])  # positivo hacia la luz
    g = (g - g[mask].min()) / max(np.ptp(g[mask]), 1e-3)
    t = round_w * np.sqrt(dtn) + (1 - round_w) * g + bias
    rng = np.random.default_rng(abs(int(seed)))
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


# ================================================================ elementos por datos
VIEWS = ('down', 'side', 'up')
LAYERS = {'front': 'encima del cuerpo', 'behind': 'detrás del cuerpo (solo donde el cuadro está vacío)',
          'onbody': 'pintado sobre el cuerpo (solo donde ya hay figura: emblemas, bandas, tatuajes)'}
ANCHORS = {
 'headTop': 'borde de arriba de la cabeza, en su eje', 'head': 'centro de la cabeza', 'neck': 'mentón / cuello',
 'shoulders': 'línea de hombros, en el eje', 'shoulderLeft': 'hombro del lado izquierdo de la pantalla',
 'shoulderRight': 'hombro del lado derecho de la pantalla', 'shoulderFront': 'hombro que mira hacia adelante (perfil)',
 'shoulderBack': 'hombro de atrás (perfil)', 'chest': 'centro del pecho', 'waist': 'cintura', 'feet': 'línea de pies, en el eje',
}
SHAPES = {'ellipse': ('center', 'radius'), 'poly': ('points',), 'rect': ('box',), 'ring': ('center', 'radius'), 'line': ('points',)}
STANDING_ROWS = (0, 1, 2, 3, 4, 5, 6, 7)   # la muerte (fila 8) queda sin elementos salvo que se pida
DEFAULT_OUTLINE = '#140d10'
UNIT_HEAD = 24.0                            # una cabeza de 24 px (mentón - tope) = escala 1


def run_at(a, y, x):
    """Extremos [x0, x1] del tramo opaco de la fila y que contiene (o está más cerca de) x."""
    size = a.shape[1]
    y = int(np.clip(y, 0, a.shape[0] - 1)); xs = np.where(a[y])[0]
    if not len(xs):
        return x, x
    x = int(xs[np.argmin(np.abs(xs - x))])
    x0 = x1 = x
    while x0 - 1 >= 0 and a[y, x0 - 1]: x0 -= 1
    while x1 + 1 < size and a[y, x1 + 1]: x1 += 1
    return x0, x1


def _facing(cellimg, fi):
    """De perfil: +1 si mira a la derecha de la pantalla, -1 a la izquierda (por dónde queda la cara)."""
    sys.path.insert(0, str(HERE))
    import painter
    fb = painter.face_box(cellimg)
    a = cellimg[:, :, 3] > 0
    head = a[fi['top']:fi['neckY'] + 1]
    xs = np.where(head.any(0))[0]
    if not fb or not len(xs):
        return 1
    return 1 if (fb[0] + fb[2]) / 2 >= xs.mean() else -1


def frame_anchors(cellimg, fi):
    """Anclajes medidos sobre el cuadro ya armado (cabeza nueva incluida)."""
    a = cellimg[:, :, 3] > 0
    rows = np.where(a.any(1))[0]
    top, ny, nx = fi['top'], fi['neckY'], fi['neckX']
    foot = int(rows[-1]) if len(rows) else a.shape[0] - 6
    body = max(foot - ny, 10)
    sy = ny + max(2, round(body * .08))
    x0, x1 = run_at(a, sy, nx)
    # capas, armas o brazos abiertos estiran el tramo: en un chibi los hombros quedan a 0,35-0,6 del ancho de
    # la cabeza a cada lado del eje
    h0, h1 = run_at(a, (top + ny) // 2, nx); hw = max(h1 - h0 + 1, 12)
    x0 = int(np.clip(x0, nx - .6 * hw, nx - .35 * hw)); x1 = int(np.clip(x1, nx + .35 * hw, nx + .6 * hw))
    face = _facing(cellimg, fi) if fi['dir'] == 'side' else 1
    # tope de la cabeza: lo opaco más alto cerca del eje (no un arma levantada por encima)
    band = a[:, max(0, nx - 5):nx + 6].any(1); hy = np.where(band[:ny + 1])[0]
    htop = int(hy[0]) if len(hy) else top
    A = {'headTop': (nx, htop), 'head': (nx, (top + ny) / 2), 'neck': (nx, ny), 'shoulders': (nx, sy),
         'shoulderLeft': (x0, sy), 'shoulderRight': (x1, sy), 'chest': (nx, ny + body * .22), 'waist': (nx, ny + body * .48),
         'feet': (nx, foot)}
    A['shoulderFront'], A['shoulderBack'] = (A['shoulderRight'], A['shoulderLeft']) if face > 0 else (A['shoulderLeft'], A['shoulderRight'])
    return A, face, foot


def atlas_unit(info):
    """Escala del elemento: tamaño de cabeza del cuadro de frente (caminar abajo) relativo a 24 px."""
    f0 = info['frames'].get(0) or next(iter(info['frames'].values()))
    return max(.6, min(1.6, (f0['neckY'] - f0['top']) / UNIT_HEAD))


def library():
    out, errs = {}, []
    for p in sorted(ELEMENTS_DIR.glob('*.json')):
        try:
            spec = json.loads(p.read_text())
        except Exception as e:
            errs.append(f'{p.name}: JSON inválido ({e})'); continue
        e = validate(spec, p.stem)
        if e:
            errs += e; continue
        out[spec['name']] = spec
    return out, errs


def validate(spec, stem=None):
    n = (spec.get('name') if isinstance(spec, dict) else None) or stem or '?'
    if not isinstance(spec, dict):
        return [f'{n}: debe ser un objeto JSON']
    errs = [f'{n}: falta "{k}"' for k in ('name', 'materials', 'shapes') if k not in spec]
    if errs:
        return errs
    if stem and spec['name'] != stem:
        errs.append(f'{n}: "name" debe coincidir con el archivo ({stem}.json)')
    if spec.get('layer', 'front') not in LAYERS:
        errs.append(f'{n}: capa "{spec.get("layer")}" no existe ({", ".join(LAYERS)})')
    for v in spec.get('views', VIEWS):
        if v not in VIEWS: errs.append(f'{n}: vista "{v}" no existe ({", ".join(VIEWS)})')
    for k, m in spec['materials'].items():
        ramp = m.get('ramp') if isinstance(m, dict) else None
        if not ramp or len(ramp) < 3:
            errs.append(f'{n}.materials.{k}: "ramp" necesita al menos 3 tonos (oscuro -> claro)')
        for c in (ramp or []) + ([m['outline']] if isinstance(m, dict) and isinstance(m.get('outline'), str) else []):
            if not (isinstance(c, str) and c.startswith('#') and len(c) == 7):
                errs.append(f'{n}.materials.{k}: color "{c}" no es #rrggbb')
    if not spec['shapes']:
        errs.append(f'{n}: "shapes" está vacío')
    for i, s in enumerate(spec['shapes']):
        t = s.get('type')
        if t not in SHAPES:
            errs.append(f'{n}.shapes[{i}]: tipo "{t}" no existe ({", ".join(SHAPES)})'); continue
        for k in SHAPES[t]:
            if k not in s: errs.append(f'{n}.shapes[{i}]: "{t}" necesita "{k}"')
        if s.get('material') not in spec['materials']:
            errs.append(f'{n}.shapes[{i}]: material "{s.get("material")}" no está en "materials"')
        at = s.get('at', spec.get('anchor', 'chest'))
        if at not in ANCHORS:
            errs.append(f'{n}.shapes[{i}]: anclaje "{at}" no existe ({", ".join(ANCHORS)})')
        for v in s.get('views', VIEWS):
            if v not in VIEWS: errs.append(f'{n}.shapes[{i}]: vista "{v}" no existe')
        for pt in s.get('points', []):
            if len(pt) > 2 and pt[2] not in ANCHORS:
                errs.append(f'{n}.shapes[{i}]: anclaje de punto "{pt[2]}" no existe')
    return errs


def _shape_mask(s, A, nx, face, view, u, sway, size=CELL):
    """Máscara de una forma en el cuadro. Coordenadas en px de una cabeza de 24 px (se escalan con u)."""
    ax, ay = A[s['at']]
    sc = u * float(s.get('scale', 1.0))
    flip = face if (view == 'side') else (-1 if (view == 'up' and s.get('flipUp')) else 1)
    oy = sway if s.get('sway', True) else 0

    def P(x, y, mx=1, at=None):
        bx, by = A[at] if at else (ax, ay)     # un punto puede anclarse a otra parte: [x, y, "feet"]
        X = bx + x * sc * flip
        if mx < 0:
            X = 2 * nx - X                     # espejo sobre el eje del cuerpo
        return X, by + y * sc + oy

    masks = []
    for mx in ((1, -1) if (s.get('mirror') and view != 'side') else (1,)):
        t = s['type']
        m = np.zeros((size, size), np.uint8)
        if t in ('ellipse', 'ring'):
            cx, cy = P(*s['center'], mx); rx, ry = s['radius']
            ang = float(s.get('angle', 0)) * flip * mx
            axes = (max(1, int(round(rx * sc))), max(1, int(round(ry * sc))))
            if t == 'ellipse':
                cv2.ellipse(m, (int(round(cx)), int(round(cy))), axes, ang, 0, 360, 1, -1)
            else:
                cv2.ellipse(m, (int(round(cx)), int(round(cy))), axes, ang, 0, 360, 1, max(1, int(round(float(s.get('width', 2)) * sc))))
        elif t == 'poly':
            cv2.fillPoly(m, [np.array([P(*pt[:2], mx, pt[2] if len(pt) > 2 else None) for pt in s['points']], np.float32).round().astype(np.int32)], 1)
        elif t == 'rect':
            x0, y0, x1, y1 = s['box']
            pts = [P(x0, y0, mx), P(x1, y0, mx), P(x1, y1, mx), P(x0, y1, mx)]
            cv2.fillPoly(m, [np.array(pts, np.float32).round().astype(np.int32)], 1)
        elif t == 'line':
            pts = np.array([P(*pt[:2], mx, pt[2] if len(pt) > 2 else None) for pt in s['points']], np.float32).round().astype(np.int32)
            cv2.polylines(m, [pts], False, 1, max(1, int(round(float(s.get('width', 2)) * sc))))
        masks.append(m > 0)
    return masks


def render_frame(cellimg, fi, spec, opts, u, i, report=None):
    """Aplica un elemento a un cuadro (in place). Devuelve los píxeles que tocó y los que quedaron fuera de la celda."""
    view = fi['dir']
    A, face, foot = frame_anchors(cellimg, fi)
    mats = {k: {**v, **(opts.get('materials', {}).get(k, {}))} for k, v in spec['materials'].items()}
    amp = float(spec.get('sway', 0))
    sway = int(round(np.sin((i % COLS) * np.pi / 2) * amp)) if amp else 0
    u = u * float(opts.get('scale', spec.get('scale', 1.0)))
    layer = opts.get('layer', spec.get('layer', 'front'))
    groups = {}
    for k, s in enumerate(spec['shapes']):
        if view not in s.get('views', VIEWS):
            continue
        s = {**s, 'at': s.get('at', spec.get('anchor', 'chest'))}
        g = (s.get('group', f'#{k}'), s['material'])
        groups.setdefault(g, []).extend(_shape_mask(s, A, fi['neckX'], face, view, u, sway, cellimg.shape[0]))
    touched = np.zeros(cellimg.shape[:2], bool)
    for (gname, mat), masks in groups.items():
        mask = np.any(masks, 0)
        if not mask.any():
            continue
        M = mats[mat]
        outline = M.get('outline', DEFAULT_OUTLINE if layer != 'onbody' else M['ramp'][0])
        seed = zlib.crc32(f'{spec["name"]}/{gname}/{i}'.encode())
        rgb, _ = shade(mask, M['ramp'], tuple(M.get('light', (-.7, -.7))), float(M.get('round', .55)), float(M.get('jitter', .05)),
                       seed, outline, float(M.get('bias', 0.0)))
        if layer == 'onbody':
            mask = mask & (cellimg[:, :, 3] > 0)
        touched |= paste(cellimg, rgb, mask, behind=(layer == 'behind'))
    return touched, foot


def apply(atlas, info, opts):
    """Accesorio genérico del pintor: {"element": "<nombre>", "materials": {...}, "scale": 1.0, "rows": [...]}."""
    lib, errs = library()
    name = opts['element']
    if name not in lib:
        raise SystemExit(f'elemento desconocido "{name}"' + (' — ' + '; '.join(errs) if errs else ''))
    spec = lib[name]
    rows = set(opts.get('rows', spec.get('rows', STANDING_ROWS)))
    u = atlas_unit(info)
    out = atlas.copy()
    for i, fi in sorted(info['frames'].items()):
        if i // COLS not in rows or fi['dir'] not in spec.get('views', VIEWS):
            continue
        render_frame(cell_view(out, i), fi, spec, opts, u, i)
    return out


# ================================================================ plantillas para "new"
TEMPLATES = {
 'crown': {'description': 'Corona baja de picos con una gema al centro.', 'layer': 'front', 'anchor': 'headTop',
           'materials': {'metal': {'ramp': ['#4a2e0c', '#8a5d1c', '#d0a043', '#f6e2a0']}, 'gem': {'ramp': ['#2a0a3a', '#7a2a9a', '#d68cff'], 'round': .8}},
           'shapes': [{'type': 'rect', 'box': [-8, 5, 8, 8], 'material': 'metal', 'group': 'crown'},
                      {'type': 'poly', 'points': [[-8, 6], [-6, 0], [-4, 6]], 'material': 'metal', 'group': 'crown'},
                      {'type': 'poly', 'points': [[-3, 6], [0, -3], [3, 6]], 'material': 'metal', 'group': 'crown'},
                      {'type': 'poly', 'points': [[4, 6], [6, 0], [8, 6]], 'material': 'metal', 'group': 'crown'},
                      {'type': 'ellipse', 'center': [0, 6], 'radius': [1.6, 1.6], 'material': 'gem', 'views': ['down', 'side']}]},
 'pauldrons': {'description': 'Par de hombreras redondeadas.', 'layer': 'front', 'anchor': 'shoulderLeft',
               'materials': {'shell': {'ramp': ['#2a0e0a', '#6a2a1c', '#b0503a', '#e08a68', '#ffd0b0'], 'jitter': .07}},
               'shapes': [{'type': 'ellipse', 'center': [1, 0], 'radius': [5, 4], 'angle': -20, 'material': 'shell', 'group': 'top', 'mirror': True, 'views': ['down', 'up']},
                          {'type': 'ellipse', 'center': [0, 3], 'radius': [4, 2.5], 'angle': -20, 'material': 'shell', 'group': 'rim', 'mirror': True, 'views': ['down', 'up']},
                          {'type': 'ellipse', 'at': 'shoulderFront', 'center': [-3, 0], 'radius': [5, 4], 'material': 'shell', 'views': ['side']}]},
 'cape': {'description': 'Capa que cae desde los hombros por detrás y termina sobre los tobillos.', 'layer': 'behind', 'anchor': 'shoulders',
          'materials': {'cloth': {'ramp': ['#12060e', '#3a1026', '#6e1e42', '#a83a62', '#d8708e'], 'round': .35, 'jitter': .08},
                        'lining': {'ramp': ['#2a1a08', '#6a4a18', '#c09040'], 'round': .3}},
          'shapes': [{'type': 'poly', 'points': [[-11, -1], [11, -1], [14, -8, 'feet'], [5, -5, 'feet'], [0, -7, 'feet'], [-5, -5, 'feet'], [-14, -8, 'feet']], 'material': 'cloth', 'views': ['down', 'up']},
                     {'type': 'poly', 'points': [[-12, -1], [-9, -1], [-12, -9, 'feet'], [-15, -8, 'feet']], 'material': 'lining', 'mirror': True, 'views': ['down']},
                     {'type': 'poly', 'points': [[-1, -1], [-6, -1], [-16, -7, 'feet'], [-5, -6, 'feet']], 'material': 'cloth', 'views': ['side']}], 'sway': 1},
 'emblem': {'description': 'Emblema redondo en el pecho.', 'layer': 'front', 'anchor': 'chest',
            'materials': {'metal': {'ramp': ['#2a2a34', '#6a6a7a', '#b8b8c8', '#f0f0ff']}, 'gem': {'ramp': ['#0a2a3a', '#1a7a9a', '#8ae8ff'], 'round': .8}},
            'views': ['down'],
            'shapes': [{'type': 'ellipse', 'center': [0, 0], 'radius': [4, 4], 'material': 'metal'},
                       {'type': 'ellipse', 'center': [0, 0], 'radius': [2, 2], 'material': 'gem'}]},
 'sash': {'description': 'Banda cruzada del hombro a la cintura, pintada sobre el cuerpo.', 'layer': 'onbody', 'anchor': 'chest',
          'materials': {'cloth': {'ramp': ['#3a2a08', '#8a6a18', '#e0c050'], 'round': .3}},
          'shapes': [{'type': 'line', 'points': [[-8, -8], [8, 9]], 'width': 3, 'material': 'cloth', 'views': ['down']}]},
 'halo': {'description': 'Aro de luz detrás de la cabeza.', 'layer': 'behind', 'anchor': 'head',
          'materials': {'light': {'ramp': ['#a07a18', '#e0b030', '#fff0a0', '#fffbe6'], 'round': .9, 'outline': '#2a1c04'}},
          'shapes': [{'type': 'ring', 'center': [0, -5], 'radius': [14, 13], 'width': 3, 'material': 'light', 'views': ['down', 'up']},
                     {'type': 'ring', 'center': [-3, -5], 'radius': [5, 13], 'width': 3, 'material': 'light', 'views': ['side']}]},
 'wings': {'description': 'Par de alas de tres capas de plumas a la espalda.', 'layer': 'behind', 'anchor': 'shoulders',
           'materials': {'feather': {'ramp': ['#2a2a40', '#5a5a80', '#9a9ac0', '#d8d8f0', '#ffffff'], 'round': .45, 'jitter': .07},
                         'down': {'ramp': ['#3a3a58', '#7a7aa8', '#c0c0e0'], 'round': .6}},
           'shapes': [{'type': 'poly', 'points': [[-4, -2], [-24, -14], [-28, -6], [-24, 0], [-8, 4]], 'material': 'feather', 'group': 'w1', 'mirror': True, 'views': ['down', 'up']},
                      {'type': 'poly', 'points': [[-4, 1], [-23, -2], [-25, 5], [-19, 9], [-7, 7]], 'material': 'feather', 'group': 'w2', 'mirror': True, 'views': ['down', 'up']},
                      {'type': 'poly', 'points': [[-4, 4], [-18, 8], [-18, 14], [-12, 15], [-6, 10]], 'material': 'feather', 'group': 'w3', 'mirror': True, 'views': ['down', 'up']},
                      {'type': 'ellipse', 'center': [-7, 1], 'radius': [5, 4], 'material': 'down', 'mirror': True, 'views': ['down', 'up']},
                      {'type': 'poly', 'points': [[-2, -2], [-20, -16], [-24, -6], [-10, 6]], 'material': 'feather', 'group': 's1', 'views': ['side']},
                      {'type': 'poly', 'points': [[-2, 2], [-18, 2], [-18, 10], [-8, 10]], 'material': 'feather', 'group': 's2', 'views': ['side']}], 'sway': 1},
}


# ================================================================ gate y vistas previas
TEST_DONORS = ('baltra', 'sira', 'tibor')   # tanque ancho, figura delgada, cabeza grande


def _painter():
    sys.path.insert(0, str(HERE))
    import painter
    return painter


_BASE_CACHE = {}
def base_sheet(key):
    """Hoja armada (sin pintar) de un donante o una ficha del pintor, con su info de cuadros."""
    if key in _BASE_CACHE:
        return _BASE_CACHE[key]
    P = _painter()
    spec_path = HERE / 'specs' / f'{key}.json'
    spec = json.loads(spec_path.read_text()) if spec_path.exists() else {'id': key, 'body': key}
    atlas, rep = P.assemble(spec)
    info = {'frames': rep['frameInfo'], 'CELL': CELL, 'COLS': COLS, 'ROW_DIR': P.ROW_DIR}
    _BASE_CACHE[key] = (atlas, info)
    return atlas, info


def mass_rows(cellimg):
    rows = (cellimg[:, :, 3] > 40).sum(1)
    if not rows.any():
        return 0
    ys = np.nonzero(rows >= rows.max() * .22)[0]
    return int(ys[-1] - ys[0] + 1)


def check_element(spec, donors=TEST_DONORS, opts=None, warns=None):
    """Problemas del elemento sobre cada donante de prueba (lista vacía = PASS). `warns` junta avisos."""
    warns = [] if warns is None else warns
    probs = validate(spec)
    if probs:
        return probs
    opts = {'element': spec['name'], **(opts or {})}
    sys.path.insert(0, str(HERE))
    import style_gate
    _, rng = style_gate.reference()
    for d in donors:
        atlas, info = base_sheet(d)
        u = atlas_unit(info)
        out = atlas.copy()
        views_hit = set()
        rows = set(spec.get('rows', STANDING_ROWS))
        for i, fi in sorted(info['frames'].items()):
            if i // COLS not in rows or fi['dir'] not in spec.get('views', VIEWS):
                continue
            before = cell_view(atlas, i).copy()
            cimg = cell_view(out, i)
            # medir lo que caería fuera de la celda: se dibuja en un lienzo con margen
            big = np.zeros((CELL + 64, CELL + 64, 4), np.uint8); big[32:32 + CELL, 32:32 + CELL] = before
            fi2 = {**fi, 'top': fi['top'] + 32, 'neckY': fi['neckY'] + 32, 'neckX': fi['neckX'] + 32}
            touched, _ = render_frame(big, fi2, spec, opts, u, i)
            outside = touched.copy(); outside[32:32 + CELL, 32:32 + CELL] = False
            if outside.any():
                probs.append(f'{d} cuadro {i} ({fi["dir"]}): {int(outside.sum())} px fuera de la celda')
            t2, foot = render_frame(cimg, fi, spec, opts, u, i)
            if not t2.any():
                continue
            views_hit.add(fi['dir'])
            ys = np.nonzero(t2)[0]
            if ys.max() > foot:
                probs.append(f'{d} cuadro {i}: baja de la línea de pies ({ys.max()} > {foot})')
            if i < 12 and abs(mass_rows(cimg) - mass_rows(before)) > 2:
                warns.append(f'{d} cuadro {i}: la altura de cuerpo medida pasa de {mass_rows(before)} a {mass_rows(cimg)} px '
                             '(el Roster Art Gate re-escala la apariencia: correr roster_gate.js --write)')
            # sombreado: sobre lo visible del elemento (sin el contorno); lo casi tapado por el cuerpo no cuenta
            px = cimg[t2][:, :3]; L = cv2.cvtColor(px.reshape(-1, 1, 3), cv2.COLOR_RGB2LAB)[:, 0, 0]
            inner = px[L > 40]
            if len(inner) >= 40 and len({tuple(p) for p in inner}) < 3:
                probs.append(f'{d} cuadro {i}: pintura plana (menos de 3 tonos)')
        for v in spec.get('views', VIEWS):
            if any(v in s.get('views', VIEWS) for s in spec['shapes']) and v not in views_hit:
                probs.append(f'{d}: no dibuja nada en la vista "{v}"')
        # estilo de la hoja resultante (12 cuadros de caminar), igual que style_gate.py
        ms = [x for x in (style_gate.measure(cell_view(out, i)) for i in range(12)) if x]
        if ms:
            m = {k: float(np.median([x[k] for x in ms])) for k in ms[0]}
            probs += [f'{d}: estilo — {f}' for f in style_gate.check(m, rng)]
    return probs


def contact_sheet(atlas, frames=(0, 4, 8, 12, 16, 24, 28), scale=3, marks=None):
    from PIL import Image, ImageDraw
    tiles = [cell_view(atlas, i) for i in frames]
    strip = np.concatenate(tiles, 1)
    im = Image.new('RGBA', (strip.shape[1] * scale, strip.shape[0] * scale), (58, 62, 70, 255))
    im.alpha_composite(Image.fromarray(strip).resize(im.size, Image.NEAREST))
    if marks:
        d = ImageDraw.Draw(im)
        for k, i in enumerate(frames):
            for name, (x, y) in marks.get(i, {}).items():
                X, Y = (k * CELL + x) * scale, y * scale
                d.rectangle((X - 2, Y - 2, X + 2, Y + 2), outline=(255, 70, 70, 255))
                d.text((X + 4, Y - 6), name, fill=(255, 230, 120, 255))
    return im


def main():
    ap = argparse.ArgumentParser(description='Forja de elementos del Pintor.')
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('list')
    n = sub.add_parser('new'); n.add_argument('name'); n.add_argument('--kind', choices=sorted(TEMPLATES), required=True)
    a = sub.add_parser('anchors'); a.add_argument('--on', default=TEST_DONORS[0])
    p = sub.add_parser('preview'); p.add_argument('name'); p.add_argument('--on', default=TEST_DONORS[0])
    c = sub.add_parser('check'); c.add_argument('names', nargs='*')
    args = ap.parse_args()
    lib, errs = library()
    if args.cmd == 'list':
        for e in errs: print('ERROR', e)
        for k, s in lib.items():
            print(f'{k:<24} {s.get("layer", "front"):<7} {",".join(s.get("views", VIEWS)):<13} {s.get("description", "")}')
        print(f'{len(lib)} elementos · plantillas para "new": {", ".join(sorted(TEMPLATES))}')
        return
    if args.cmd == 'new':
        if not args.name.replace('_', '').isalnum() or args.name != args.name.lower():
            sys.exit('el nombre va en minúsculas con letras, números y _ (ej. hombreras_de_coral)')
        path = ELEMENTS_DIR / f'{args.name}.json'
        if path.exists():
            sys.exit(f'ya existe {path.relative_to(ROOT)}')
        ELEMENTS_DIR.mkdir(exist_ok=True)
        path.write_text(json.dumps({'name': args.name, **TEMPLATES[args.kind]}, indent=1, ensure_ascii=False) + '\n')
        print('creado', path.relative_to(ROOT))
        print(f'siguiente: editar formas y rampas -> python3 tools/art/painter/forge.py preview {args.name}  ->  check {args.name}')
        return
    out_dir = HERE / 'out' / 'elements'
    out_dir.mkdir(parents=True, exist_ok=True)
    if args.cmd == 'anchors':
        atlas, info = base_sheet(args.on)
        frames = (0, 4, 8, 12, 16, 24, 28)
        marks = {i: frame_anchors(cell_view(atlas, i), info['frames'][i])[0] for i in frames if i in info['frames']}
        marks = {i: {k: v for k, v in m.items() if k in ('headTop', 'neck', 'shoulderLeft', 'shoulderRight', 'chest', 'waist', 'feet')} for i, m in marks.items()}
        path = out_dir / f'anchors@{args.on}.png'
        contact_sheet(atlas, frames, marks=marks).save(path); print('anclajes', path.relative_to(ROOT))
        return
    if args.cmd == 'preview':
        if errs: print('\n'.join('ERROR ' + e for e in errs))
        if args.name not in lib: sys.exit(f'elemento desconocido "{args.name}"')
        atlas, info = base_sheet(args.on)
        out = apply(atlas, info, {'element': args.name})
        path = out_dir / f'{args.name}@{args.on}.png'
        contact_sheet(out).save(path); print('vista previa', path.relative_to(ROOT))
        warns = []
        probs = check_element(lib[args.name], (args.on,), warns=warns)
        for w in warns: print('AVISO', w)
        print('PASS' if not probs else '\n'.join('FAIL ' + p for p in probs))
        return
    if args.cmd == 'check':
        names = args.names or list(lib)
        report = {'donors': TEST_DONORS, 'errors': errs, 'elements': {}}
        bad = len(errs)
        for e in errs: print('FAIL', e)
        for k in names:
            if k not in lib:
                print('FAIL', k, 'no existe'); bad += 1; continue
            warns = []
            probs = check_element(lib[k], warns=warns)
            report['elements'][k] = {'pass': not probs, 'problems': probs, 'warnings': warns}
            bad += bool(probs)
            print(('PASS ' if not probs else 'FAIL ') + k + ''.join('\n  ' + p for p in probs) + (f'\n  ({len(warns)} avisos de escala)' if warns else ''))
        if not args.names:
            (ROOT / 'docs/art-gate').mkdir(parents=True, exist_ok=True)
            (ROOT / 'docs/art-gate/element-gate.json').write_text(json.dumps(report, indent=1, ensure_ascii=False) + '\n')
        print(f'elementos: {len(names)} · con problemas: {bad}')
        sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
