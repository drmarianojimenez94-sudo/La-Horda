"""ARENA DEL ABISMO — recorte de las 4 hojas (art-source/abismo/).

Hojas: abismo_enemigos_1 (Errante, Acechador, Heraldo) · abismo_enemigos_2 (Devorador, Tejedor, Jinete,
Carcelero) · abismo_jefe_morador (El Que Mora Debajo: ojo, tentáculos, mandíbula, ataques, plataformas,
efectos) · abismo_mapa (tiles y elementos especiales; el mapa general es referencia de diseño).

- GRILLAS de 8 direcciones (un cuadro por celda): cada celda con la máscara u2net del motor de
  tools/art/hielo_jefes/extract.py (muertes y ataques suman lo que brilla). Se usan las vistas que el
  juego dibuja: perfil derecho (el izquierdo es el espejo), frente y espalda.
- PANELES de ataques/efectos (secuencias): las celdas se detectan por el fondo gris a cuadros de la hoja
  (perfil de columnas); si no coincide la cantidad, reparto parejo. 'fig' = figura (u2net + brillo),
  'fx' = solo lo que brilla (alfa de brillo).
Escribe assets/sprites/arenas/abismo/<ente>/atlas.png, assets/vfx/abismo/*.png y js/assets/abismo-meta.js.
usage: python3 extract.py <frames_dir> [--reuse]
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
import extract as X
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
X.ROOT = os.path.join(REPO, 'art-source', 'abismo')
E1, E2, JB, MP = 'abismo_enemigos_1', 'abismo_enemigos_2', 'abismo_jefe_morador', 'abismo_mapa'

# ---------------- grillas de 8 direcciones: columnas (9 bordes) y filas ----------------
# columnas de la hoja: frente, frente diag, perfil der, espalda diag, espalda, espalda diag, perfil izq, frente diag
GRIDS = {
    'ab_errante':   (E1, [417, 472, 528, 585, 643, 701, 767, 825, 881],
                     {'idle': (115, 173), 'walk': (175, 228), 'atk': (230, 271), 'hit': (273, 315), 'death': (317, 357)}),
    'ab_acechador': (E1, [427, 481, 535, 589, 644, 702, 765, 820, 873],
                     {'idle': (427, 467), 'walk': (469, 507), 'run': (509, 548), 'leap': (550, 592), 'hit': (594, 636), 'death': (638, 685)}),
    'ab_heraldo':   (E1, [407, 461, 515, 575, 634, 691, 755, 812, 866],
                     {'idle': (759, 816), 'float': (817, 867), 'cast': (869, 913), 'hit': (914, 959), 'death': (960, 1002)}),
    'ab_devorador': (E2, [426, 483, 539, 595, 652, 709, 767, 824, 879],
                     {'idle': (97, 149), 'walk': (150, 190), 'atk': (191, 231), 'hit': (232, 269), 'death': (270, 306)}),
    'ab_tejedor':   (E2, [426, 483, 539, 594, 649, 705, 765, 821, 877],
                     {'idle': (360, 392), 'walk': (393, 424), 'atk': (426, 457), 'cast': (459, 491), 'hit': (492, 525), 'death': (526, 559)}),
    'ab_jinete':    (E2, [425, 482, 539, 595, 649, 703, 763, 819, 874],
                     {'idle': (611, 640), 'walk': (642, 667), 'prep': (668, 693), 'charge': (694, 720), 'hit': (721, 753), 'death': (754, 784)}),
    'ab_carcelero': (E2, [435, 488, 538, 589, 640, 690, 743, 796, 845],
                     {'idle': (837, 874), 'walk': (876, 907), 'atk': (908, 939), 'hit': (940, 972), 'death': (973, 1010)}),
}
VIEW = {'down': 0, 'side': 2, 'up': 4}
# ---------------- paneles (secuencias): (hoja, ente, set, rect, n, tipo) ----------------
PANELS = [
    (E1, 'ab_errante', 'atk',    (900, 118, 1140, 197), 6, 'fig'),
    (E1, 'ab_errante', 'strong', (1145, 118, 1350, 197), 6, 'fig'),
    (E1, 'ab_errante', 'death6', (1195, 268, 1350, 350), 3, 'fig'),
    (E1, 'ab_acechador', 'leap8', (900, 423, 1350, 492), 8, 'fig'),
    (E1, 'ab_acechador', 'claw',  (900, 512, 1097, 582), 5, 'fig'),
    (E1, 'ab_acechador', 'emerge', (1108, 512, 1350, 582), 5, 'fig'),
    (E1, 'ab_acechador', 'death6', (1210, 630, 1350, 690), 3, 'fig'),
    (E1, 'ab_heraldo', 'orb',    (897, 762, 1132, 842), 8, 'fig'),
    (E1, 'ab_heraldo', 'zone',   (1140, 762, 1352, 842), 4, 'fx'),
    (E1, 'ab_heraldo', 'death6', (1205, 912, 1350, 978), 3, 'fig'),
    (E2, 'ab_devorador', 'atk',   (895, 104, 1097, 178), 6, 'fig'),
    (E2, 'ab_devorador', 'stomp', (1100, 104, 1352, 178), 6, 'u2'),
    (E2, 'ab_devorador', 'death6', (1237, 238, 1352, 300), 2, 'fig'),
    (E2, 'ab_tejedor', 'weave',  (895, 364, 1117, 428), 8, 'fig'),
    (E2, 'ab_tejedor', 'net',    (1120, 364, 1352, 428), 8, 'fx'),
    (E2, 'ab_tejedor', 'death6', (1210, 482, 1352, 552), 3, 'fx'),
    (E2, 'ab_jinete', 'prep6',   (895, 612, 1042, 657), 6, 'fig'),
    (E2, 'ab_jinete', 'charge8', (1045, 612, 1352, 657), 8, 'fig'),
    (E2, 'ab_jinete', 'impact',  (895, 672, 1127, 712), 6, 'fig'),
    (E2, 'ab_jinete', 'turn',    (1130, 672, 1352, 712), 6, 'fig'),
    (E2, 'ab_jinete', 'death6',  (1245, 752, 1352, 787), 2, 'fig'),
    (E2, 'ab_carcelero', 'chain', (862, 836, 1112, 882), 8, 'fig'),
    (E2, 'ab_carcelero', 'drag',  (1118, 836, 1352, 882), 8, 'fig'),
    (E2, 'ab_carcelero', 'slam',  (862, 904, 1082, 945), 6, 'u2'),
    (E2, 'ab_carcelero', 'break', (1088, 904, 1352, 947), 8, 'fig'),
    (E2, 'ab_carcelero', 'death6', (1250, 975, 1352, 1012), 2, 'fig'),
]
# ---------------- efectos (VFX): (hoja, clave, rect, n, suelo) ----------------
FX = [
    (E1, 'abErranteImpact', (900, 268, 990, 350), 1, False),
    (E1, 'abErranteVoid',   (993, 268, 1085, 350), 1, False),
    (E1, 'abAcechWarn',     (900, 628, 992, 692), 1, True),
    (E1, 'abAcechImpact',   (995, 628, 1100, 692), 1, False),
    (E1, 'abAcechDust',     (1105, 628, 1205, 692), 2, True),
    (E1, 'abHeraldoOrb',    (895, 912, 978, 978), 3, False),
    (E1, 'abHeraldoZone',   (982, 912, 1127, 978), 3, True),
    (E1, 'abHeraldoHit',    (1130, 912, 1200, 978), 1, False),
    (E2, 'abDevImpact',     (895, 228, 990, 300), 1, False),
    (E2, 'abDevFrag',       (993, 228, 1085, 300), 1, False),
    (E2, 'abDevFracture',   (1130, 228, 1235, 300), 1, True),
    (E2, 'abTejFil',        (895, 468, 972, 552), 1, False),
    (E2, 'abTejWeb',        (975, 468, 1080, 552), 1, True),
    (E2, 'abTejPull',       (1083, 468, 1152, 552), 1, True),
    (E2, 'abTejHit',        (1155, 468, 1207, 552), 1, False),
    (E2, 'abJinTrail',      (895, 742, 1022, 787), 3, True),
    (E2, 'abJinImpact',     (1025, 742, 1078, 787), 1, False),
    (E2, 'abJinDust',       (1080, 742, 1162, 787), 1, True),
    (E2, 'abJinWake',       (1165, 742, 1242, 787), 1, True),
    (E2, 'abChain',         (860, 962, 947, 1012), 1, False),
    (E2, 'abChainImpact',   (950, 962, 1022, 1012), 1, False),
    (E2, 'abChainWave',     (1025, 962, 1102, 1012), 1, True),
    (E2, 'abChainFrag',     (1105, 962, 1172, 1012), 1, False),
    (E2, 'abChainTerrain',  (1175, 962, 1247, 1012), 1, True),
    # El Que Mora Debajo: ataques (secuencias) y efectos
    (JB, 'abMorSlam',       (410, 490, 722, 565), 6, False),
    (JB, 'abMorRise',       (725, 490, 1030, 565), 6, False),
    (JB, 'abMorShards',     (1032, 490, 1345, 565), 7, False),
    (JB, 'abMorRay',        (410, 595, 752, 668), 5, False),
    (JB, 'abMorPull',       (755, 595, 1062, 668), 4, True),
    (JB, 'abMorPlat',       (1065, 595, 1345, 668), 6, False),
    (JB, 'abMorTents',      (410, 700, 767, 778), 6, False),
    (JB, 'abMorSuck',       (770, 700, 1125, 778), 4, False),
    (JB, 'abMorWave',       (1127, 700, 1345, 778), 4, True),
    (JB, 'abMorFloat',      (965, 858, 1072, 912), 3, False),
    (JB, 'abMorVortex',     (1085, 855, 1160, 912), 1, True),
    (JB, 'abMorSpikes',     (1162, 855, 1228, 912), 1, False),
    (JB, 'abMorDust',       (1235, 855, 1342, 912), 2, False),
    (JB, 'abMorBlast',      (690, 932, 800, 990), 1, False),
    (JB, 'abMorPulse',      (805, 932, 915, 990), 1, True),
    (JB, 'abMorStreak',     (920, 932, 1062, 990), 1, False),
    (JB, 'abMorImpact',     (1065, 932, 1200, 990), 1, True),
    (JB, 'abMorDisint',     (1205, 932, 1342, 990), 2, False),
]
# piezas sueltas con figura (sin animación): (hoja, clave, rect, n)
PIECES = [
    (JB, 'ojo_grande',    (1418, 112, 1518, 208), 1), (JB, 'tent_grande', (1415, 245, 1520, 395), 1),
    (JB, 'tent_segmento', (795, 145, 1102, 428), 6),
    (MP, 'altar',         (1060, 870, 1170, 965), 1), (MP, 'portal_activo', (1170, 870, 1275, 965), 1),
    (MP, 'portal_cerrado', (1278, 870, 1352, 965), 1), (MP, 'pilar_corrupto', (1352, 870, 1418, 965), 1),
    (MP, 'nucleo',        (1420, 855, 1535, 965), 1), (MP, 'pilares',  (918, 890, 990, 1002), 2),
    (MP, 'escombros',     (628, 890, 700, 1002), 6), (MP, 'fisura', (835, 890, 910, 1002), 1),
    (MP, 'hielo',         (740, 892, 800, 1002), 1), (MP, 'micelio', (805, 892, 835, 1002), 1),
]
# texturas crudas (sin alfa): (hoja, clave, rect)
TEX = [
    (MP, 'tex_piso',  (463, 895, 512, 1000)), (MP, 'tex_borde', (520, 895, 568, 1000)),
    (MP, 'tex_runa',  (575, 895, 622, 1000)), (MP, 'tex_lava', (685, 895, 732, 1000)),
    (MP, 'tex_puente', (990, 895, 1045, 1002)),
    (JB, 'tex_carne', (1358, 800, 1414, 1005)), (JB, 'plat_estable', (690, 872, 750, 910)), (JB, 'plat_agrietada', (757, 872, 816, 910)),
    (JB, 'plat_critica', (822, 872, 882, 910)), (JB, 'plat_colapso', (890, 872, 950, 910)), (JB, 'tex_tentaculo', (1418, 800, 1474, 1005)),
]
# ojo (5x5: idle, blink, daño, abertura, muerte) y mandíbula (5 fases)
EYE = (JB, (488, 122, 790, 428))
JAW = (JB, 1183, 1337, [(122, 178), (182, 240), (245, 310), (315, 372), (375, 435)], ['cerrada', 'prep', 'abre', 'ataque', 'cierre'])

def graymask(im):
    r, g, b = im[..., 0], im[..., 1], im[..., 2]; v = im.max(-1)
    return (abs(r - g) < 10) & (abs(g - b) < 10) & (v > 48) & (v < 118)
def runs(p, thr, minlen):
    out = []; st = None
    for i, v in enumerate(list(p) + [0]):
        if v > thr and st is None: st = i
        elif v <= thr and st is not None:
            if i - st >= minlen: out.append((st, i))
            st = None
    return out
def panel_cells(name, rect, n):
    rgb = X.sheet(name)[0]; x0, y0, x1, y1 = rect
    gm = graymask(rgb[y0:y1, x0:x1].astype(int))
    cols = runs(gm.mean(0), 0.05, 16)
    if len(cols) != n:
        w = (x1 - x0)/n; cols = [(int(i*w), int((i + 1)*w)) for i in range(n)]
    return [(x0 + a, y0, x0 + b, y1) for a, b in cols]

def cut_panel(name, rect, n):
    """Secuencia de un panel: la figura se separa del fondo gris a cuadros por color (u2net pierde
    figuras chicas pegadas); las celdas son parejas (n = la cantidad que indica la hoja) y cada
    componente va a la celda con la que más se superpone."""
    rgb = X.sheet(name)[0]; glow = X._cache[name + ':glow']
    x0, y0, x1, y1 = rect; sub = rgb[y0:y1, x0:x1].astype(int); gl = glow[y0:y1, x0:x1]
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]; v = sub.max(-1)
    gray = (abs(r - g) < 12) & (abs(g - b) < 12) & (v > 44) & (v < 122)
    dark = v < 34
    fg = ~gray & ~dark
    fg = ndimage.binary_opening(fg, np.ones((2, 2), bool))
    fg = fg | (dark & ndimage.binary_dilation(fg, X.N8, iterations=2))
    fg = X.drop_lines(fg)
    fg = ndimage.binary_fill_holes(ndimage.binary_closing(fg, X.N8, iterations=1))
    fg = fg | (gl > 0.3)
    lb, k = ndimage.label(fg, X.N8)
    if k:
        sz = ndimage.sum(fg, lb, range(1, k + 1)); fg = np.isin(lb, [i + 1 for i in range(k) if sz[i] >= 25])
    a = np.maximum((fg & ~(gl > 0.3)).astype(float), gl*(gl > 0.3)); a[fg & (a < 1) & ~(gl > 0.3)] = 1
    W = (x1 - x0)/n; lb, k = ndimage.label(fg, X.N8); objs = ndimage.find_objects(lb)
    cells = [np.zeros_like(fg) for _ in range(n)]
    for i, sl in enumerate(objs, 1):
        if not sl: continue
        c0, c1 = sl[1].start, sl[1].stop
        ov = [max(0, min(c1, (j + 1)*W) - max(c0, j*W)) for j in range(n)]
        span = [j for j, o in enumerate(ov) if o > 0.25*W]
        m = lb == i
        if len(span) <= 1: cells[int(np.argmax(ov))] |= m
        else:
            for j in span: cells[j][:, int(j*W):int((j + 1)*W)] |= m[:, int(j*W):int((j + 1)*W)]
    out = []
    for m in cells:
        c = X.crop(sub.astype(np.uint8), a, m)
        out.append(c[0] if c else None)
    return out

def cut_fig(name, box, glow_add=True, inset=2):
    rgb = X.sheet(name)[0]; glow = X._cache[name + ':glow']
    x0, y0, x1, y1 = box; cx0, cy0, cx1, cy1 = x0 + inset, y0 + inset, x1 - inset, y1 - inset
    mk, (X0, Y0, X1, Y1) = X.u2net_mask(rgb, (cx0, cy0, cx1, cy1), pad=0)
    full = np.zeros(rgb.shape[:2], bool); full[Y0:Y1, X0:X1] = mk
    alpha = full.astype(float)
    if glow_add:
        g = np.zeros(rgb.shape[:2]); g[cy0:cy1, cx0:cx1] = glow[cy0:cy1, cx0:cx1]
        alpha = np.maximum(alpha, (g > 0.3)*g); full = full | (g > 0.3)
    lim = np.zeros_like(full); lim[cy0:cy1, cx0:cx1] = True; full &= lim
    lb, k = ndimage.label(full, X.N8)
    if k > 1:
        sizes = ndimage.sum(full, lb, range(1, k + 1)); big = sizes.max()
        full = np.isin(lb, [i + 1 for i in range(k) if sizes[i] >= max(10, big*0.03)])
    res = X.crop(rgb, alpha, full)
    return res[0] if res else None
def cut_fx(name, box, inset=2, label=True):
    rgb = X.sheet(name)[0]; glow = X._cache[name + ':glow']
    x0, y0, x1, y1 = box; x0 += inset; y0 += inset; x1 -= inset; y1 -= inset
    if label and y1 - y0 > 44: y0 += 11          # afuera el título del panel (texto claro arriba de cada efecto)
    a = np.clip(glow[y0:y1, x0:x1]*1.25, 0, 1)
    m = X.drop_lines(a > 0.06)
    c = rgb[y0:y1, x0:x1].astype(float)
    mx = c.max(-1, keepdims=True); lift = np.clip(150 - mx, 0, None)*(c/np.maximum(mx, 1))
    c = np.clip(c + lift*(a[..., None] < 0.7), 0, 255).astype(np.uint8)
    res = X.crop(c, a, m, pad=1)
    return res[0] if res else None

if __name__ == '__main__':
    from build import pack
    X.BG_PCT, X.BG_SIZE = 50, 41
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); REUSE = '--reuse' in sys.argv
    def get(fp, make):
        if REUSE and os.path.exists(fp): return Image.open(fp).convert('RGBA')
        im = make()
        if im is not None: im.save(fp)
        return im
    cache = os.path.join(out, '_glow'); os.makedirs(cache, exist_ok=True)
    for nm in (E1, E2, JB, MP):
        fg = os.path.join(cache, nm + '.npy')
        if os.path.exists(fg):
            rgb = np.array(Image.open(os.path.join(X.ROOT, nm + '.png')).convert('RGB'))
            X._cache[nm] = (rgb, None, 'dist'); X._cache[nm + ':glow'] = np.load(fg)
        else:
            X.sheet(nm); np.save(fg, X._cache[nm + ':glow'])
    atlases, fxmeta, manifest, pieces = {}, {}, [], {}
    # ---- personajes ----
    for ent, (name, cols, rows) in GRIDS.items():
        frames, sets = [], {}
        def add(im): frames.append(im); return len(frames) - 1
        idx = {}
        for st, (y0, y1) in rows.items():
            for vw, ci in VIEW.items():
                fp = os.path.join(out, f'{ent}_{st}_{vw}.png')
                im = get(fp, lambda: cut_fig(name, (cols[ci], y0, cols[ci + 1], y1), glow_add=st in ('death', 'atk', 'cast', 'leap', 'charge')))
                if im is not None: idx[(st, vw)] = add(im)
        ref = float(np.median([frames[j].height for (st, v), j in idx.items() if st == 'idle']))
        for key in list(idx):
            if key[0] not in ('death', 'hit') and frames[idx[key]].height < ref*0.6: del idx[key]
        g = lambda st, v: [idx[(st, v)]] if (st, v) in idx else []
        walk_row = 'walk' if 'walk' in rows else 'float'
        sets['idle'] = g('idle', 'side') + g(walk_row if walk_row == 'float' else 'idle', 'side')
        sets['walk'] = (g(walk_row, 'side') or g('idle', 'side')) + g('idle', 'side')
        sets['walk_down'] = (g(walk_row, 'down') or g('idle', 'down')) + g('idle', 'down')
        sets['walk_up'] = (g(walk_row, 'up') or g('idle', 'up')) + g('idle', 'up')
        sets['atk'] = g('idle', 'side') + g('atk' if 'atk' in rows else 'cast', 'side')
        sets['hit'] = g('hit', 'side')
        sets['death'] = g('hit', 'side') + g('death', 'side') + g('death', 'down')
        for st in rows:
            if st not in ('idle', 'walk', 'atk', 'hit', 'death'): sets[st] = g(st, 'side') + g(st, 'down')
        for (pn, pe, pset, rect, n, typ) in PANELS:
            if pe != ent: continue
            ims = []
            if typ == 'fig':
                cached = [os.path.join(out, f'{ent}_{pset}_{i}.png') for i in range(n)]
                if REUSE and all(os.path.exists(f) for f in cached): res = [Image.open(f).convert('RGBA') for f in cached]
                else:
                    res = cut_panel(pn, rect, n)
                    for f, im in zip(cached, res):
                        if im is not None: im.save(f)
            elif typ == 'u2':   # celdas con fondo propio (no gris): u2net por celda pareja
                w = (rect[2] - rect[0])/n
                boxes = [(int(rect[0] + i*w), rect[1], int(rect[0] + (i + 1)*w), rect[3]) for i in range(n)]
                res = [get(os.path.join(out, f'{ent}_{pset}_{i}.png'), lambda b=box: cut_fig(pn, b)) for i, box in enumerate(boxes)]
            else:
                res = [get(os.path.join(out, f'{ent}_{pset}_{i}.png'), lambda b=box: cut_fx(pn, b)) for i, box in enumerate(panel_cells(pn, rect, n))]
            for im in res:
                if im is not None and im.width > 8 and im.height > 8: ims.append(add(im))
            if pset == 'death6': sets['death'] = sets['death'][:1] + ims
            elif pset == 'atk': sets['atk'] = ims
            elif pset in ('leap8', 'charge8', 'prep6'): sets[pset[:-1]] = ims
            else: sets[pset] = ims
        sets = {k: v for k, v in sets.items() if v}
        atlas, w, h = pack(frames, 8)
        dest = f'assets/sprites/arenas/abismo/{ent}'
        os.makedirs(os.path.join(REPO, dest), exist_ok=True)
        if ent not in PIXRIG_KEYS: atlas.save(os.path.join(REPO, dest, 'atlas.png'), optimize=True)
        manifest.append(f'{dest}/atlas.png')
        hs = sorted(frames[j].height for j in sets['walk']); refH = hs[len(hs)//2]
        atlases[ent] = {"src": f"{dest}/atlas.png", "meta": {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 2)/h, 4), "sets": sets}}
        if ent in PIXRIG_KEYS: atlases[ent] = pixrig_keep('js/assets/abismo-meta.js', 'ABISMO_ATLAS', ent)  # redibujado: tools/art/pixrig
        print(ent, atlas.size, {k: len(v) for k, v in sets.items()})
    # ---- efectos ----
    fxdir = 'assets/vfx/abismo'; os.makedirs(os.path.join(REPO, fxdir), exist_ok=True)
    def fx_list(name, rect, n):
        return panel_cells(name, rect, n) if n > 1 else [rect]
    for (name, key, rect, n, ground) in FX:
        srcs = []
        for i, box in enumerate(fx_list(name, rect, n)):
            fp = os.path.join(out, f'fx_{key}_{i}.png')
            im = get(fp, lambda b=box: cut_fx(name, b))
            if im is None or im.width < 6: continue
            f = f'{fxdir}/{key}_{i}.png'; im.save(os.path.join(REPO, f), optimize=True); srcs.append(f)
        fxmeta[key] = {"ground": ground, "srcs": srcs}; manifest += srcs
    # ---- piezas con figura ----
    for (name, key, rect, n) in PIECES:
        srcs = []
        for i, box in enumerate(fx_list(name, rect, n)):
            fp = os.path.join(out, f'pc_{key}_{i}.png')
            im = get(fp, lambda b=box: cut_fig(name, b, glow_add=True))
            if im is None or im.width < 6: continue
            f = f'{fxdir}/{key}_{i}.png'; im.save(os.path.join(REPO, f), optimize=True); srcs.append(f)
        pieces[key] = srcs; manifest += srcs
    # ---- ojo 5x5 y mandíbula ----
    name, (x0, y0, x1, y1) = EYE
    rgb = X.sheet(name)[0]; gm = graymask(rgb[y0:y1, x0:x1].astype(int))
    rws = [(125-y0, 180-y0), (184-y0, 241-y0), (245-y0, 302-y0), (307-y0, 366-y0), (370-y0, 427-y0)]; eye = {}
    for ri, (a, b) in enumerate(rws[:5]):
        cls = [(490-x0, 546-x0), (548-x0, 604-x0), (606-x0, 661-x0), (663-x0, 719-x0), (721-x0, 777-x0)]
        key = ['idle', 'blink', 'dano', 'abre', 'muerte'][ri]; eye[key] = []
        cached = [os.path.join(out, f'eye_{key}_{ci}.png') for ci in range(5)]
        if REUSE and all(os.path.exists(f) for f in cached): row = [Image.open(f).convert('RGBA') for f in cached]
        else:
            row = cut_panel(name, (x0 + cls[0][0], y0 + a, x0 + cls[-1][1], y0 + b), 5)
            for f, im in zip(cached, row):
                if im is not None: im.save(f)
        for ci, im in enumerate(row):
            if im is None: continue
            f = f'{fxdir}/ojo_{key}_{ci}.png'; im.save(os.path.join(REPO, f), optimize=True); eye[key].append(f); manifest.append(f)
    name, jx0, jx1, jrows, jnames = JAW; jaw = {}
    for (a, b), key in zip(jrows, jnames):
        fp = os.path.join(out, f'jaw_{key}.png')
        def jawcut(bx=(jx0, a, jx1, b)):
            x0_, y0_, x1_, y1_ = bx; c = X.sheet(name)[0][y0_:y1_, x0_:x1_]
            h_, w_ = c.shape[:2]; yy, xx = np.mgrid[0:h_, 0:w_]
            d = np.minimum.reduce([xx/10, (w_-1-xx)/10, yy/8, (h_-1-yy)/8]); a_ = np.clip(d, 0, 1)
            v = c.max(-1)/255.0; a_ = a_*np.clip(v*3.5, 0.35, 1)
            return Image.fromarray(np.dstack([c, (a_*255).astype(np.uint8)]), 'RGBA')
        im = get(fp, jawcut)
        if im is None: continue
        f = f'{fxdir}/mandibula_{key}.png'; im.save(os.path.join(REPO, f), optimize=True); jaw[key] = f; manifest.append(f)
    # ---- texturas ----
    tex = {}
    for (name, key, (x0, y0, x1, y1)) in TEX:
        im = Image.fromarray(X.sheet(name)[0][y0:y1, x0:x1])
        f = f'{fxdir}/{key}.png'; im.save(os.path.join(REPO, f), optimize=True); tex[key] = f; manifest.append(f)
    # ---- meta ----
    js = ['"use strict";', '/* GENERADO por tools/art/abismo/extract.py (no editar a mano). */',
          f'const ABISMO_ATLAS = {json.dumps(atlases, separators=(",", ":"))};',
          f'const ABISMO_FX = {json.dumps(fxmeta, separators=(",", ":"))};',
          f'const ABISMO_PIECES = {json.dumps(pieces, separators=(",", ":"))};',
          f'const ABISMO_EYE = {json.dumps(eye, separators=(",", ":"))};',
          f'const ABISMO_JAW = {json.dumps(jaw, separators=(",", ":"))};',
          f'const ABISMO_TEX = {json.dumps(tex, separators=(",", ":"))};']
    open(os.path.join(REPO, 'js', 'assets', 'abismo-meta.js'), 'w').write('\n'.join(js) + '\n')
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); m = open(mp).read()
    A, B = '  // >>> arena del abismo (tools/art/abismo/extract.py)\n', '  // <<< arena del abismo\n'
    block = A + ''.join(f'  "{q}",\n' for q in manifest) + B
    m = (m[:m.index(A)] + block + m[m.index(B) + len(B):]) if A in m else m.replace('const ASSET_MANIFEST = [\n', 'const ASSET_MANIFEST = [\n' + block, 1)
    open(mp, 'w').write(m)
    print('manifest', len(manifest))
