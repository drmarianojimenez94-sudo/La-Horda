"""Recorta las hojas de jefes que mandó el equipo (art-source/hielo_jefes/) en cuadros RGBA limpios.

Dos tipos de hoja:
- RGB con fondo oscuro liso (Mago de Hielo y Cristal, Ángel Caído): el fondo se estima localmente
  (percentil 35 en una ventana de 41 px, el fondo domina) y lo que se aparta de él es figura. Los
  huecos cerrados de cada figura se rellenan (túnicas oscuras) y se descartan los carteles de texto
  porque las secciones empiezan debajo de los títulos.
- RGBA con el fondo ya quitado (Minotauro, hoja I1-I4): se usa su alfa.
Personajes: alfa nítido (0/255, como pide la biblia de arte). Efectos (VFX): alfa suave, porque
el brillo ES el efecto. Cada figura se separa sola por componentes conexas; los pedazos cercanos
(filo, partículas del mismo cuadro) se juntan con la figura más cercana.
usage: python3 extract.py <out_dir>   -> <out_dir>/<entidad>/<sección>_<n>.png + meta.json
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'art-source', 'hielo_jefes')
N8 = np.ones((3, 3), bool)

# (hoja, entidad, sección, rect x0,y0,x1,y1, cuántos cuadros, tipo 'fig' | 'fx')
SPEC = [
    # ---------- Mago de Hielo y Cristal ----------
    ('mago_hielo_cristal_sheet', 'mago', 'idle',   (306, 40, 540, 152), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'side',   (541, 40, 707, 152), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'back',   (709, 40, 857, 152), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'walk',   (859, 40, 1141, 152), 5, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'atk',    (1146, 40, 1532, 152), 5, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'lanza1', (306, 192, 543, 282), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'lanza2', (306, 284, 543, 374), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'nova1',  (546, 192, 805, 282), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'nova2',  (546, 284, 805, 374), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'muro1',  (809, 192, 1031, 282), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'muro2',  (809, 284, 1031, 374), 4, 'fx'),
    ('mago_hielo_cristal_sheet', 'mago', 'canal1', (1035, 192, 1287, 282), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'canal2', (1035, 284, 1287, 374), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'mago', 'death1', (1291, 192, 1532, 282), 3, 'fig0'),
    ('mago_hielo_cristal_sheet', 'mago', 'death2', (1291, 284, 1532, 374), 3, 'fig0'),
    ('mago_hielo_cristal_sheet', 'mago_fx', 'cristal',    (6, 437, 204, 530), 4, 'fx'),
    ('mago_hielo_cristal_sheet', 'mago_fx', 'proyectil',  (209, 437, 407, 530), 6, 'fx'),
    ('mago_hielo_cristal_sheet', 'mago_fx', 'explosion',  (411, 437, 629, 530), 3, 'fx'),
    ('mago_hielo_cristal_sheet', 'mago_fx', 'muro',       (633, 437, 945, 530), 4, 'fx'),
    ('mago_hielo_cristal_sheet', 'mago_fx', 'circulo',    (949, 437, 1133, 530), 2, 'fx'),
    ('mago_hielo_cristal_sheet', 'mago_fx', 'impacto',    (1343, 437, 1532, 530), 3, 'fx'),
    # ---------- Gólem de Cristal ----------
    ('mago_hielo_cristal_sheet', 'golem', 'idle',  (251, 598, 433, 702), 2, 'fig'),
    ('mago_hielo_cristal_sheet', 'golem', 'side',  (436, 598, 603, 702), 2, 'fig'),
    ('mago_hielo_cristal_sheet', 'golem', 'back',  (606, 598, 752, 702), 2, 'fig'),
    ('mago_hielo_cristal_sheet', 'golem', 'walk',  (755, 598, 990, 702), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'golem', 'atk',   (993, 598, 1253, 702), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'golem', 'stomp', (1256, 598, 1532, 702), 4, 'fig0'),
    ('mago_hielo_cristal_sheet', 'golem', 'throw', (251, 740, 537, 848), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'golem', 'charge', (541, 740, 790, 848), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'golem', 'death', (793, 740, 1130, 848), 5, 'fig0'),
    # ---------- Esbirros de cristal ----------
    ('mago_hielo_cristal_sheet', 'servo', 'idle',  (6, 905, 148, 1016), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'servo', 'fpb',   (151, 905, 340, 1016), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'servo', 'walk',  (343, 905, 492, 1016), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'servo', 'atk',   (495, 905, 630, 1016), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'servo', 'death', (633, 905, 778, 1016), 3, 'fig0'),
    ('mago_hielo_cristal_sheet', 'volador', 'idle',  (788, 905, 912, 1016), 3, 'fig'),
    ('mago_hielo_cristal_sheet', 'volador', 'move',  (915, 905, 1132, 1016), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'volador', 'atk',   (1135, 905, 1328, 1016), 4, 'fig'),
    ('mago_hielo_cristal_sheet', 'volador', 'death', (1331, 905, 1532, 1016), 4, 'fx'),
    # ---------- Ángel Caído de Hielo ----------
    ('angel_caido_hielo_sheet', 'angel', 'idle',  (313, 40, 512, 152), 3, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'side',  (515, 40, 715, 152), 4, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'back',  (718, 40, 853, 152), 1, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'walk',  (856, 40, 1133, 152), 5, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'atk',   (1136, 40, 1532, 152), 4, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'fly',   (314, 192, 580, 312), 4, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'prep',  (583, 192, 875, 312), 4, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'slam',  (878, 192, 1220, 312), 3, 'fig0'),
    ('angel_caido_hielo_sheet', 'angel', 'recov', (1223, 192, 1532, 312), 4, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'wing',  (686, 390, 1088, 522), 3, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'storm', (1091, 390, 1532, 522), 5, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'transf', (6, 590, 435, 702), 5, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'aura',  (438, 590, 795, 702), 4, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'freeze', (798, 590, 1182, 702), 5, 'fig'),
    ('angel_caido_hielo_sheet', 'angel', 'death', (6, 735, 940, 858), 8, 'fig0'),
    ('angel_caido_hielo_sheet', 'angel_fx', 'nova',     (311, 390, 683, 522), 4, 'fx'),
    ('angel_caido_hielo_sheet', 'angel_fx', 'muros',    (1185, 590, 1532, 702), 6, 'fx'),
    ('angel_caido_hielo_sheet', 'angel_fx', 'lanza',    (6, 918, 202, 1016), 4, 'fx'),
    ('angel_caido_hielo_sheet', 'angel_fx', 'fragmentos', (205, 918, 375, 1016), 4, 'fx'),
    ('angel_caido_hielo_sheet', 'angel_fx', 'explosion', (378, 918, 647, 1016), 5, 'fx'),
    ('angel_caido_hielo_sheet', 'angel_fx', 'pilar',    (650, 918, 905, 1016), 6, 'fx'),
    ('angel_caido_hielo_sheet', 'angel_fx', 'circulo',  (908, 918, 1115, 1016), 3, 'fx'),
    ('angel_caido_hielo_sheet', 'angel_fx', 'impacto',  (1308, 918, 1532, 1016), 4, 'fx'),
    # ---------- Minotauro (hoja RGBA) ----------
    ('minotauro_sheet', 'minotauro', 'idle',  (0, 0, 1536, 285), 4, 'fig'),
    ('minotauro_sheet', 'minotauro', 'atk',   (0, 285, 1536, 595), 4, 'fig'),
    ('minotauro_sheet', 'minotauro_fx', 'fuego', (0, 600, 1536, 785), 7, 'fx'),
    ('minotauro_sheet', 'minotauro_fx', 'onda',  (0, 790, 1536, 1024), 4, 'fx'),
    # ---------- Hoja I1-I4 (RGBA): Jinete y Tundraverx ----------
    ('jefes_I1_I4_sheet', 'jinete', 'front1', (279, 40, 441, 146), 3, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'side1',  (444, 40, 615, 146), 2, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'side2',  (444, 146, 615, 252), 2, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'back1',  (618, 40, 752, 146), 2, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'walk1', (755, 40, 985, 146), 5, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'walk2', (755, 146, 985, 252), 5, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'atk1',  (988, 40, 1245, 146), 4, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'atk2',  (988, 146, 1245, 252), 4, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'death1', (1248, 40, 1532, 146), 5, 'fig'),
    ('jefes_I1_I4_sheet', 'jinete', 'death2', (1248, 146, 1532, 252), 5, 'fig'),
    ('jefes_I1_I4_sheet', 'tundraverx', 'front1', (279, 800, 441, 908), 2, 'fig'),
    ('jefes_I1_I4_sheet', 'tundraverx', 'side1',  (444, 800, 615, 908), 1, 'fig'),
    ('jefes_I1_I4_sheet', 'tundraverx', 'side2',  (444, 908, 615, 1020), 1, 'fig'),
    ('jefes_I1_I4_sheet', 'tundraverx', 'walk1', (740, 800, 985, 908), 4, 'fig'),
    ('jefes_I1_I4_sheet', 'tundraverx', 'walk2', (740, 908, 985, 1020), 4, 'fig'),
    ('jefes_I1_I4_sheet', 'tundraverx', 'atk1',  (988, 800, 1245, 908), 3, 'fig'),
    ('jefes_I1_I4_sheet', 'tundraverx', 'atk2',  (988, 908, 1245, 1020), 3, 'fig'),
    ('jefes_I1_I4_sheet', 'tundraverx', 'death', (1248, 800, 1532, 908), 5, 'fig'),
]

_cache = {}
BG_PCT, BG_SIZE = 35, 41   # fondo local (percentil en ventana); las hojas con celdas claras usan una ventana mayor
def sheet(name):
    if name in _cache: return _cache[name]
    im = Image.open(os.path.join(ROOT, name + '.png'))
    if im.mode == 'RGBA' and np.percentile(np.array(im)[..., 3], 10) > 200: im = im.convert('RGB')   # alfa casi lleno = fondo sin quitar
    if im.mode == 'RGBA':
        a = np.array(im); rgb = a[..., :3]; score = a[..., 3].astype(float)   # 0..255
        kind = 'alpha'
    else:
        rgb = np.array(im.convert('RGB')); f = rgb.astype(float)
        bg = np.stack([ndimage.percentile_filter(f[..., c], BG_PCT, size=BG_SIZE) for c in range(3)], -1)
        score = np.sqrt(((f - bg) ** 2).sum(-1)) * 4.0                          # ~0..255
        kind = 'dist'
        glow = np.clip((f.max(-1) - bg.max(-1) - 30) / 110.0, 0, 1)            # efectos: solo lo que brilla
        _cache[name + ':glow'] = glow
    _cache[name] = (rgb, score, kind)
    return _cache[name]

def masks(score, kind, typ):
    hard_t = 128 if kind == 'alpha' else 120
    if typ == 'fig0':   # figura que se deshace en partículas (muertes, golpes con estela): máscara directa
        fg = score > (128 if kind == 'alpha' else 96)
        fg = ndimage.binary_opening(fg, np.ones((2, 2), bool))
        return ndimage.binary_fill_holes(fg), None
    if typ in ('fig', 'figfx') and kind == 'dist':
        # el contorno casi negro del arte está cerca del fondo: umbral más bajo + cerrar huecos
        fg = score > 64
        fg = ndimage.binary_opening(fg, np.ones((2, 2), bool))
        fg = ndimage.binary_closing(fg, N8, iterations=2)
    else:
        fg = score > hard_t
        fg = ndimage.binary_opening(fg, np.ones((2, 2), bool))
    fg = ndimage.binary_fill_holes(fg)
    if typ == 'fx':
        soft = np.clip((score - 30) / (hard_t - 30), 0, 1)
        soft[fg] = np.maximum(soft[fg], 0.85)
        return fg | (score > 60), soft
    return fg, fg.astype(float)

def drop_lines(fg):
    """Afuera las líneas finas de los paneles/carteles (alto <= 5 px y largas)."""
    lb, _ = ndimage.label(fg, N8)
    for i, sl in enumerate(ndimage.find_objects(lb), 1):
        if not sl: continue
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if (hh <= 5 and ww >= 20) or (ww <= 5 and hh >= 20): fg[sl][lb[sl] == i] = False   # bordes de panel/celda
    return fg

def split(fg, n):
    """Agrupa las componentes en n cuadros por columnas (orden izquierda a derecha)."""
    lb, k = ndimage.label(fg, N8)
    objs = ndimage.find_objects(lb)
    areas = ndimage.sum(np.ones_like(lb), lb, range(1, k + 1))
    big = max(areas) if k else 0
    comps = [(i + 1, objs[i], areas[i]) for i in range(k) if areas[i] >= max(25, big * 0.004)]
    # proyección de las componentes grandes -> tramos de columnas
    p = np.zeros(fg.shape[1])
    for i, sl, a in comps:
        if a >= big * 0.05: p[sl[1]] += 1
    segs = []; run = None
    for x, v in enumerate(p):
        if v > 0 and run is None: run = x
        elif v == 0 and run is not None: segs.append([run, x]); run = None
    if run is not None: segs.append([run, len(p)])
    while len(segs) > n:          # tramos de más: se une el hueco más chico
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        j = int(np.argmin(gaps)); segs[j:j + 2] = [[segs[j][0], segs[j + 1][1]]]
    col = np.zeros(fg.shape[1]) ; proj = fg.sum(0)
    while len(segs) < n and segs:  # figuras pegadas: se corta en el mínimo de la proyección
        i = max(range(len(segs)), key=lambda q: segs[q][1] - segs[q][0])
        a0, a1 = segs[i]; w = a1 - a0; lo, hi = a0 + w // 4, a1 - w // 4
        if hi <= lo: break
        cut = lo + int(np.argmin(proj[lo:hi])); segs[i:i + 1] = [[a0, cut], [cut, a1]]
    # cada componente va al tramo que más se le superpone (o al más cercano)
    out = [np.zeros_like(fg) for _ in segs]
    for i, sl, a in comps:
        cx0, cx1 = sl[1].start, sl[1].stop
        ov = [max(0, min(cx1, s1) - max(cx0, s0)) for s0, s1 in segs]
        span = [j for j, o in enumerate(ov) if o > 0.2 * (segs[j][1] - segs[j][0])]
        if len(span) > 1:   # el brillo pegó dos figuras: se corta por las columnas de cada tramo
            m = lb == i
            for j in span:
                a0 = segs[j][0] if j > span[0] else 0
                a1 = segs[j][1] if j < span[-1] else fg.shape[1]
                if j < span[-1]: a1 = segs[j + 1][0] if segs[j + 1][0] > segs[j][1] else segs[j][1]
                out[j][:, a0:a1] |= m[:, a0:a1]
            continue
        if max(ov) > 0: j = int(np.argmax(ov))
        else: j = int(np.argmin([min(abs(cx0 - s1), abs(cx1 - s0)) for s0, s1 in segs]))
        out[j][sl] |= lb[sl] == i
    return out

_sess = None
def u2net_mask(sheet_rgb, box, pad=8):
    """Máscara del objeto central de un recorte (u2net), en el tamaño del recorte con margen."""
    global _sess
    from rembg import remove, new_session
    if _sess is None: _sess = new_session('u2net')
    x0, y0, x1, y1 = box; H, W = sheet_rgb.shape[:2]
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    c = Image.fromarray(sheet_rgb[Y0:Y1, X0:X1])
    big = c.resize((c.width * 4, c.height * 4), Image.LANCZOS)
    mk = np.array(remove(big, session=_sess, only_mask=True).resize(c.size, Image.LANCZOS)) > 110
    mk = ndimage.binary_fill_holes(ndimage.binary_opening(mk, np.ones((2, 2), bool)))
    lb, k = ndimage.label(mk, N8)
    if k > 1:   # la figura (la más grande) y lo que queda pegado a ella
        sizes = ndimage.sum(mk, lb, range(1, k + 1)); big_i = int(np.argmax(sizes)) + 1
        near = ndimage.binary_dilation(lb == big_i, N8, iterations=4)
        keep = [i for i in range(1, k + 1) if i == big_i or (near & (lb == i)).any()]
        mk = np.isin(lb, keep)
    return mk, (X0, Y0, X1, Y1)

def crop(rgb, alpha, m, pad=2):
    ys, xs = np.nonzero(m)
    if len(ys) == 0: return None
    y0, y1, x0, x1 = max(0, ys.min() - pad), ys.max() + pad + 1, max(0, xs.min() - pad), xs.max() + pad + 1
    a = (alpha * m)[y0:y1, x0:x1]
    img = np.dstack([rgb[y0:y1, x0:x1], np.round(a * 255).astype(np.uint8)])
    return Image.fromarray(img, 'RGBA'), (int(x0), int(y0), int(x1), int(y1))

if __name__ == '__main__':
    out = sys.argv[1]
    meta = {}
    for name, ent, sec, (x0, y0, x1, y1), n, typ in SPEC:
        rgb, score, kind = sheet(name)
        r, s = rgb[y0:y1, x0:x1], score[y0:y1, x0:x1]
        fg, alpha = masks(s, kind, typ)
        if typ == 'fx' and kind == 'dist': alpha = _cache[name + ':glow'][y0:y1, x0:x1]
        if typ == 'fig0':   # cuerpo nítido + partículas con su brillo
            g = _cache.get(name + ':glow')
            alpha = np.maximum(fg.astype(float), g[y0:y1, x0:x1] if g is not None else 0) if kind == 'dist' else fg.astype(float)
        groups = split(drop_lines(fg), n)
        os.makedirs(os.path.join(out, ent), exist_ok=True)
        files = []
        for i, m in enumerate(groups):
            if typ == 'fig':   # la figura es la componente principal + lo que la toca de cerca
                lb, k = ndimage.label(ndimage.binary_dilation(m, N8, iterations=3), N8)
                if k > 1:
                    sizes = ndimage.sum(m, lb, range(1, k + 1)); keep = int(np.argmax(sizes)) + 1
                    m = m & (lb == keep)
            res = crop(r, alpha, m)
            if res is None: continue
            im, (bx0, by0, bx1, by1) = res
            if typ == 'fig' and kind == 'dist':   # personaje sobre fondo liso: máscara u2net del recorte
                mk, (X0, Y0, X1, Y1) = u2net_mask(rgb, (x0 + bx0, y0 + by0, x0 + bx1, y0 + by1))
                full = np.zeros(rgb.shape[:2], bool); full[Y0:Y1, X0:X1] = mk
                # sin invadir los cuadros vecinos de la misma sección
                lim = np.zeros_like(full); lim[y0:y1, x0:x1] = ndimage.binary_dilation(m, N8, iterations=6)
                full &= lim
                res = crop(rgb, np.ones(rgb.shape[:2]), full)
                if res is None: continue
                im, (gx0, gy0, gx1, gy1) = res
                bx0, by0, bx1, by1 = gx0 - x0, gy0 - y0, gx1 - x0, gy1 - y0
            f = f'{sec}_{i}.png'; im.save(os.path.join(out, ent, f))
            files.append({'file': f, 'w': im.width, 'h': im.height, 'box': [x0 + bx0, y0 + by0, x0 + bx1, y0 + by1], 'sheet': name, 'typ': typ})
        meta.setdefault(ent, {})[sec] = files
        print(ent, sec, len(files), [f"{q['w']}x{q['h']}" for q in files])
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)
