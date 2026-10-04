"""MINAS PROFUNDAS — recorte de las 4 hojas oficiales (art-source/minas/).

Hojas: enemigos1 (Esclavo Enlazado, Insecto de Cristal, Acechador Ciego, Minero Corrompido) · enemigos2
(Escupidor de Oscuridad, Consumidor Luminoso, Devoraluz + efectos) · jefes (Titán de Piedra, Cerbero +
efectos) · mapa (mapa de referencia, tiles, elementos especiales y retratos grandes).

- GRILLAS: cada panel (IDLE, CAMINAR, ...) es una grilla de celdas iguales sobre un fondo gris oscuro a
  cuadros. La celda se corta pareja y la figura se separa por SATURACIÓN/brillo (el fondo es gris puro,
  la figura tiene color); el contorno oscuro pegado a la figura se recupera. Se usa la figura principal
  de cada celda (+ lo que la toca de cerca: armas, arcos de golpe).
- Filas usadas: la hoja no rotula direcciones; el juego usa la vista de la primera fila (espejada para
  el otro lado) y, para animaciones de 8 cuadros, las dos primeras filas seguidas.
- EFECTOS y PIEZAS: alfa por brillo/saturación sobre el fondo; tiras cortadas en columnas parejas.
Escribe assets/sprites/arenas/minas/<ente>/atlas.png, assets/vfx/minas/*.png, js/assets/minas-meta.js
(+ bloque en js/assets/asset-manifest.js). Pixel art: coordenadas enteras, sin reescalar.
usage: python3 extract.py <frames_dir>
"""
import sys as _sys, os as _os
_sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', 'pixrig'))
from keep import PIXRIG_KEYS, pixrig_keep
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'hielo_jefes'))
from build import pack
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SRC = os.path.join(REPO, 'art-source', 'minas')
E1, E2, JB, MP = 'enemigos1', 'enemigos2', 'jefes', 'mapa'
N8 = np.ones((3, 3), bool)
_cache = {}

# ---------------- grillas: ente -> [(set, hoja, rect, columnas, filas, filas_usadas, cols_usadas)] ----------------
# filas_usadas: índices de fila (None = todas); cols_usadas: None = todas
GRIDS = {
  'mn_esclavo': [
    ('idle', E1, (396, 100, 512, 285), 3, 4, [0], None), ('walk', E1, (527, 100, 676, 285), 4, 4, [0, 1], None),
    ('run', E1, (691, 100, 825, 285), 3, 4, [0], None), ('atk', E1, (841, 100, 1007, 285), 4, 4, [0, 1], None),
    ('atk2', E1, (1022, 100, 1189, 285), 3, 4, [0, 1], None), ('hit', E1, (1204, 100, 1332, 285), 3, 4, [0], None),
    ('death', E1, (1347, 100, 1521, 285), 4, 3, [0], None)],
  'mn_insecto': [
    ('idle', E1, (396, 342, 497, 525), 3, 4, [0], None), ('walk', E1, (512, 342, 639, 525), 4, 4, [0, 1], None),
    ('run', E1, (654, 342, 771, 525), 3, 4, [0], None), ('atk', E1, (786, 342, 948, 525), 4, 3, [1], None),
    ('atk2', E1, (964, 342, 1118, 525), 3, 3, [0], None), ('hit', E1, (1134, 342, 1260, 525), 3, 3, [0], None),
    ('death', E1, (1275, 342, 1519, 525), 5, 3, [0, 2], None)],
  'mn_acechador': [
    ('idle', E1, (388, 575, 478, 754), 3, 4, [0], None), ('walk', E1, (492, 575, 616, 754), 4, 4, [0, 1], None),
    ('run', E1, (631, 575, 756, 754), 4, 4, [0], None), ('atk', E1, (957, 575, 1140, 754), 4, 3, [0, 2], None),
    ('hit', E1, (1154, 575, 1293, 754), 3, 3, [0], None), ('death', E1, (1308, 575, 1521, 754), 5, 3, [1], None),
    ('leap', E1, (770, 575, 943, 640), 4, 1, [0], [1, 2, 3]), ('emerge', E1, (770, 690, 943, 754), 3, 1, [0], None)],
  'mn_minero': [
    ('idle', E1, (385, 806, 466, 1000), 2, 3, [0, 1], None), ('walk', E1, (481, 806, 601, 1000), 3, 3, [0, 1], None),
    ('run', E1, (615, 806, 732, 1000), 3, 3, [0], None), ('atk', E1, (747, 806, 863, 1000), 2, 3, [0, 1, 2], None),
    ('atk2', E1, (878, 806, 1014, 1000), 2, 3, [0, 2], None), ('throw', E1, (1029, 806, 1177, 1000), 3, 3, [0], None),
    ('hit', E1, (1192, 806, 1330, 1000), 3, 3, [0], None), ('death', E1, (1345, 806, 1521, 900), 2, 1, [0], None)],
  'mn_escupidor': [
    ('idle', E2, (399, 116, 506, 341), 3, 5, [0], None), ('walk', E2, (514, 116, 646, 341), 4, 5, [0, 1], None),
    ('atk', E2, (653, 116, 781, 341), 3, 5, [0, 1], None), ('throw', E2, (789, 116, 906, 341), 2, 5, [0, 1, 2, 3], [0]),
    ('hit', E2, (917, 116, 1039, 341), 3, 5, [0], None), ('death', E2, (1046, 116, 1178, 341), 4, 4, [0, 1], None)],
  'mn_consumidor': [
    ('idle', E2, (392, 412, 484, 644), 3, 4, [0], None), ('walk', E2, (492, 412, 628, 644), 4, 4, [0, 1], None),
    ('atk', E2, (637, 412, 759, 644), 3, 4, [0, 1], None), ('absorb', E2, (769, 412, 898, 644), 4, 4, [0, 3], None),
    ('hit', E2, (908, 412, 1016, 644), 3, 4, [0], None), ('death', E2, (1026, 412, 1157, 644), 3, 3, [0, 1], None)],
  'mn_devoraluz': [
    ('idle', E2, (413, 716, 532, 891), 3, 3, [0], None), ('walk', E2, (541, 716, 661, 891), 3, 3, [0, 1], None),
    ('run', E2, (671, 716, 791, 891), 3, 3, [0, 1], None), ('drain', E2, (802, 716, 874, 891), 1, 3, None, None),
    ('hit', E2, (941, 716, 1061, 891), 3, 3, [0], None), ('death', E2, (1068, 716, 1200, 891), 4, 3, [0, 1], None)],
  'mn_titan': [
    ('idle', JB, (333, 118, 433, 337), 3, 5, [0], None), ('walk', JB, (439, 118, 587, 337), 4, 5, [0, 1], None),
    ('run', JB, (594, 118, 703, 337), 3, 5, [0], None), ('slam', JB, (713, 118, 863, 337), 4, 5, [0, 1], None),
    ('throw', JB, (873, 118, 1031, 337), 4, 5, [0, 1], None), ('stomp', JB, (1040, 118, 1204, 337), 4, 5, [0, 1], None),
    ('hit', JB, (1213, 118, 1313, 300), 3, 4, [0], None), ('death', JB, (1323, 118, 1525, 337), 4, 3, [0, 1, 2], None)],
  'mn_cerbero': [
    ('idle', JB, (427, 558, 575, 701), 4, 3, [0], None), ('walk', JB, (581, 558, 768, 701), 4, 3, [0, 1], None),
    ('run', JB, (774, 558, 935, 701), 4, 3, [0, 1], None), ('flame', JB, (946, 558, 1168, 701), 5, 3, [0, 1], None),
    ('hit', JB, (1187, 555, 1278, 800), 2, 5, [0, 1], None), ('death', JB, (1289, 555, 1518, 843), 4, 4, [0, 1, 2, 3], None),
    ('stomp', JB, (427, 731, 655, 828), 5, 2, [0, 1], None), ('bite', JB, (666, 731, 888, 828), 5, 2, [0, 1], None),
    ('summon', JB, (898, 731, 1172, 828), 6, 2, [0, 1], None)],
}
# efectos: (hoja, clave, rect, n, suelo)
FX = [
  (E2, 'mnDarkBolt', (1192, 124, 1521, 163), 8, False),
  (E2, 'mnDarkZone', (1192, 195, 1521, 259), 6, True),
  (E2, 'mnDarkBoom', (1192, 291, 1521, 338), 8, False),
  (E2, 'mnAbsorbRay', (1178, 416, 1349, 474), 3, False),
  (E2, 'mnAura', (1178, 509, 1339, 631), 3, True),
  (E2, 'mnDevBreath', (1221, 716, 1521, 787), 5, False),
  (E2, 'mnBlackout', (1221, 816, 1521, 884), 5, True),
  (E2, 'mnTeleport', (1221, 916, 1521, 987), 5, False),
  (JB, 'mnQuake', (337, 395, 481, 476), 3, True),
  (JB, 'mnRockLine', (487, 395, 659, 476), 4, False),
  (JB, 'mnMeteor', (666, 395, 825, 476), 4, False),
  (JB, 'mnCollapse', (834, 395, 1053, 476), 3, False),
  (JB, 'mnFlame', (429, 906, 657, 990), 1, False),
  (JB, 'mnCerbStomp', (666, 906, 847, 990), 3, True),
  (JB, 'mnHowl', (857, 906, 1010, 990), 5, True),
  (JB, 'mnHellSummon', (1022, 906, 1210, 990), 3, True),
]
# piezas con figura (sin animación): (hoja, clave, rect, n)
PIECES = [
  (MP, 'lampara', (943, 915, 985, 990), 1), (MP, 'puerta_mina', (996, 915, 1054, 990), 1),
  (MP, 'cristal_azul', (611, 915, 662, 990), 1), (MP, 'cristal_rojo', (674, 915, 724, 990), 1),
  (MP, 'andamio', (874, 915, 932, 990), 1), (MP, 'puente', (799, 915, 865, 990), 1), (MP, 'riel', (739, 915, 789, 990), 1),
  (MP, 'nucleo_luz', (1086, 895, 1172, 978), 1), (MP, 'pozo', (1181, 895, 1269, 978), 1), (MP, 'gas', (1275, 895, 1352, 978), 1),
  (MP, 'cristal_inestable', (1358, 895, 1442, 978), 1), (MP, 'estalactita', (1455, 895, 1510, 978), 1),
  (JB, 'lampara_apaga', (1069, 395, 1225, 476), 4), (E2, 'lampara_azul', (1360, 416, 1521, 474), 6),
]
# texturas crudas (sin alfa): (hoja, clave, rect)
TEX = [(MP, 'tex_suelo', (494, 919, 539, 986)), (MP, 'tex_roca', (551, 919, 598, 986))]
# retratos (Códice): (hoja, clave, rect)
PORTRAITS = [(MP, 'devoraluz', (1083, 42, 1275, 361)), (MP, 'titan', (1083, 398, 1275, 606)), (JB, 'cerbero', (6, 545, 408, 890)),
             (JB, 'titan_full', (6, 92, 320, 378)), (E1, 'esclavo', (10, 92, 232, 290)), (E1, 'insecto', (10, 336, 232, 530)),
             (E1, 'acechador', (10, 570, 232, 760)), (E1, 'minero', (10, 800, 232, 1005)), (E2, 'escupidor', (10, 92, 232, 345)),
             (E2, 'consumidor', (10, 380, 232, 650)), (E2, 'devoraluz_full', (10, 690, 262, 1010))]

def rgb(name):
    if name not in _cache: _cache[name] = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB'))
    return _cache[name]

# fondo a cuadros de cada hoja: (brillo mín, brillo máx, cuánto más rojo que azul puede ser el gris)
BG = {E1: (17, 66, 3), E2: (46, 100, 12), JB: (26, 86, 12), MP: (0, 44, 40)}
def fg(a, sheet=E1, haze=False):
    """Figura = todo lo que NO es fondo. Fondo = gris (poca saturación, brillo del rango de los cuadros de
    esa hoja) CONECTADO al borde de la celda: así los grises de adentro de la figura (roca del Titán,
    huesos) no se pierden. En la hoja 1 las sombras casi negras azuladas también son fondo."""
    lo, hi, tint = BG.get(sheet, BG[E1])
    a = a.astype(int); r, b = a[..., 0], a[..., 2]; v = a.max(-1); sat = v - a.min(-1)
    cand = (sat <= 12) & (v >= lo) & (v <= hi) & (b >= r - tint)
    cand |= (v < lo) & (sat <= 6) & (b >= r + (3 if sheet == E1 else -1))
    if haze:   # halo marrón apagado alrededor de Cerbero/Titán (humo del fondo): fondo si toca el borde
        cand |= (sat <= 34) & (v >= lo) & (v <= 100) & (r - b <= 40)
    lb, k = ndimage.label(cand)
    edge = set(np.unique(np.concatenate([lb[0], lb[-1], lb[:, 0], lb[:, -1]]))) - {0}
    f = ~np.isin(lb, list(edge))
    f[:2, :] = False; f[-2:, :] = False; f[:, :2] = False; f[:, -2:] = False   # bordes de panel / líneas de grilla
    f = ndimage.binary_opening(f, np.ones((2, 2), bool))
    lb, k = ndimage.label(f, N8)
    if k:
        sz = ndimage.sum(f, lb, range(1, k + 1)); f = np.isin(lb, [i + 1 for i in range(k) if sz[i] >= 8])
    return ndimage.binary_fill_holes(ndimage.binary_closing(f, N8))

def main_blob(m, reach=3):
    lb, k = ndimage.label(ndimage.binary_dilation(m, N8, iterations=reach), N8)
    if k <= 1: return m
    sizes = ndimage.sum(m, lb, range(1, k + 1))
    return m & (lb == int(np.argmax(sizes)) + 1)

def crop(sub, m, alpha=None, pad=1):
    ys, xs = np.where(m)
    if not len(ys): return None
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(m.shape[0], ys.max() + 1 + pad), max(0, xs.min() - pad), min(m.shape[1], xs.max() + 1 + pad)
    a = (m if alpha is None else alpha)[y0:y1, x0:x1]
    img = np.dstack([sub[y0:y1, x0:x1], (np.clip(a, 0, 1)*255).astype(np.uint8)])
    return Image.fromarray(img.astype(np.uint8), 'RGBA')

def cut_cell(name, box, inset=1, reach=3):
    x0, y0, x1, y1 = box; sub = rgb(name)[y0 + inset:y1 - inset, x0 + inset:x1 - inset]
    m = main_blob(fg(sub, name, haze=(name == JB and y0 >= 540)), reach)
    if m.sum() < 30: return None
    return crop(sub, m)

def auto_figs(name, box, rows=None, reach=2):
    """Figuras sueltas de un panel (cuando la grilla no es pareja): componentes de la máscara, filas por
    centro vertical y columnas por x. rows = filas a usar (None = todas)."""
    x0, y0, x1, y1 = box; sub = rgb(name)[y0 + 2:y1 - 2, x0 + 2:x1 - 2]; m = fg(sub, name)
    lb, k = ndimage.label(ndimage.binary_dilation(m, N8, iterations=reach), N8)
    figs = []
    for i, sl in enumerate(ndimage.find_objects(lb), 1):
        mm = m & (lb == i)
        if mm.sum() < 60: continue
        ys, xs = np.where(mm); figs.append((xs.min(), ys.min(), xs.max(), ys.max(), mm))
    if not figs: return []
    hs = float(np.median([f[3] - f[1] for f in figs])); figs.sort(key=lambda f: (f[1] + f[3])/2)
    rws = []
    for f in figs:
        cy = (f[1] + f[3])/2
        if rws and abs(cy - rws[-1][0]) < hs*0.55: rws[-1][1].append(f)
        else: rws.append([cy, [f]])
    out = []
    for ri, (_, fs) in enumerate(rws):
        if rows is not None and ri not in rows: continue
        for f in sorted(fs, key=lambda q: q[0]):
            im = crop(sub, f[4])
            if im is not None and im.height > 8: out.append(im)
    return out

# brillo máximo del fondo a cuadros de cada hoja (los efectos se separan por lo que brilla/satura por encima)
FXBG = {E1: 66, E2: 96, JB: 88, MP: 44}
def fx_alpha(sub, name):
    s = sub.astype(int); v = s.max(-1); sat = v - s.min(-1); hi = FXBG.get(name, 66)
    a = np.clip((v - hi)/110.0 + (sat - 14)/110.0, 0, 1)
    a[(sat < 16) & (v < hi + 20)] = 0
    return a

def cut_fx(name, box, inset=2):
    x0, y0, x1, y1 = box; sub = rgb(name)[y0 + inset:y1 - inset, x0 + inset:x1 - inset]
    a = fx_alpha(sub, name); m = ndimage.binary_opening(a > 0.12, np.ones((2, 2), bool))
    if m.sum() < 20: return None
    return crop(sub, m, a*ndimage.binary_dilation(m, N8))

def strip(name, rect, n, fn):
    x0, y0, x1, y1 = rect; w = (x1 - x0)/n
    return [fn(name, (int(x0 + i*w), y0, int(x0 + (i + 1)*w), y1)) for i in range(n)]

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    atlases, fxmeta, pieces, tex, manifest = {}, {}, {}, {}, []
    for ent, spec in GRIDS.items():
        frames, sets = [], {}
        for (st, name, (x0, y0, x1, y1), nc, nr, rows, cols) in spec:
            lst = []
            if nc == 0:
                for im in auto_figs(name, (x0, y0, x1, y1), rows):
                    lst.append(len(frames)); frames.append(im)
                sets[st] = lst; continue
            cw, rh = (x1 - x0)/nc, (y1 - y0)/nr
            for ri in (rows if rows is not None else range(nr)):
                for ci in (cols if cols is not None else range(nc)):
                    im = cut_cell(name, (int(x0 + ci*cw), int(y0 + ri*rh), int(x0 + (ci + 1)*cw), int(y0 + (ri + 1)*rh)))
                    if im is not None and im.height > 8: lst.append(len(frames)); frames.append(im)
            sets[st] = lst
        # afuera los cuadros que quedaron chicos (restos): menos de la mitad del alto del idle
        ref = float(np.median([frames[j].height for j in sets['idle']]))
        for st in list(sets):
            if st in ('death', 'hit', 'emerge'): continue
            sets[st] = [j for j in sets[st] if frames[j].height >= ref*0.5]
        sets['walk_down'] = sets['walk'][:]; sets['walk_up'] = sets['walk'][:]
        if 'atk' not in sets: sets['atk'] = sets['idle'][:]
        sets = {k: v for k, v in sets.items() if v}
        atlas, w, h = pack(frames, 8)
        dest = f'assets/sprites/arenas/minas/{ent}'
        os.makedirs(os.path.join(REPO, dest), exist_ok=True)
        if ent not in PIXRIG_KEYS: atlas.save(os.path.join(REPO, dest, 'atlas.png'), optimize=True)
        manifest.append(f'{dest}/atlas.png')
        hs = sorted(frames[j].height for j in sets['walk']); refH = hs[len(hs)//2]
        atlases[ent] = {"src": f"{dest}/atlas.png", "meta": {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 1)/h, 4), "sets": sets}}
        if ent in PIXRIG_KEYS: atlases[ent] = pixrig_keep('js/assets/minas-meta.js', 'MINAS_ATLAS', ent)  # redibujado: tools/art/pixrig
        for k, lst in sets.items():
            for j, fi in enumerate(lst): frames[fi].save(os.path.join(out, f'{ent}__{k}_{j}.png'))
        print(ent, atlas.size, {k: len(v) for k, v in sets.items()})
    fxdir = 'assets/vfx/minas'; os.makedirs(os.path.join(REPO, fxdir), exist_ok=True)
    for (name, key, rect, n, ground) in FX:
        srcs = []
        for i, im in enumerate(strip(name, rect, n, cut_fx) if n > 1 else [cut_fx(name, rect)]):
            if im is None or im.width < 6 or im.height < 6: continue
            f = f'{fxdir}/{key}_{i}.png'; im.save(os.path.join(REPO, f), optimize=True); im.save(os.path.join(out, f'fx_{key}_{i}.png')); srcs.append(f)
        if srcs: fxmeta[key] = {"ground": ground, "srcs": srcs}; manifest += srcs
    for (name, key, rect, n) in PIECES:
        ims = strip(name, rect, n, lambda nm, b: cut_cell(nm, b, 1, 4)) if n > 1 else [cut_cell(name, rect, 1, 4)]
        srcs = []
        for i, im in enumerate(ims):
            if im is None or im.width < 6: continue
            f = f'{fxdir}/{key}_{i}.png'; im.save(os.path.join(REPO, f), optimize=True); im.save(os.path.join(out, f'pc_{key}_{i}.png')); srcs.append(f)
        pieces[key] = srcs; manifest += srcs
    for (name, key, (x0, y0, x1, y1)) in TEX:
        im = Image.fromarray(rgb(name)[y0:y1, x0:x1])
        f = f'{fxdir}/{key}.png'; im.save(os.path.join(REPO, f), optimize=True); im.save(os.path.join(out, f'tx_{key}.png')); tex[key] = f; manifest.append(f)
    # pisos por sector (tools/art/minas/floor.py)
    for nm in ('superior', 'galerias', 'vetas', 'corrompida', 'profundidades', 'umbral'):
        f = f'{fxdir}/tex_piso_{nm}.png'
        if os.path.exists(os.path.join(REPO, f)): tex['piso_' + nm] = f; manifest.append(f)
    pdir = 'assets/ui/codex/minas'; os.makedirs(os.path.join(REPO, pdir), exist_ok=True)
    for (name, key, (x0, y0, x1, y1)) in PORTRAITS:
        f = f'{pdir}/{key}.jpg'; Image.fromarray(rgb(name)[y0:y1, x0:x1]).save(os.path.join(REPO, f), quality=90); tex['portrait_' + key] = f
    js = ['"use strict";', '/* GENERADO por tools/art/minas/extract.py (no editar a mano). */',
          f'const MINAS_ATLAS = {json.dumps(atlases, separators=(",", ":"))};',
          f'const MINAS_FX = {json.dumps(fxmeta, separators=(",", ":"))};',
          f'const MINAS_PIECES = {json.dumps(pieces, separators=(",", ":"))};',
          f'const MINAS_TEX = {json.dumps(tex, separators=(",", ":"))};']
    open(os.path.join(REPO, 'js', 'assets', 'minas-meta.js'), 'w').write('\n'.join(js) + '\n')
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); m = open(mp).read()
    A, B = '  // >>> minas profundas (tools/art/minas/extract.py)\n', '  // <<< minas profundas\n'
    block = A + ''.join(f'  "{q}",\n' for q in manifest) + B
    m = (m[:m.index(A)] + block + m[m.index(B) + len(B):]) if A in m else m.replace('const ASSET_MANIFEST = [\n', 'const ASSET_MANIFEST = [\n' + block, 1)
    open(mp, 'w').write(m)
    print('manifest', len(manifest))
