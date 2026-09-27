"""CIUDAD MALDITA — recorte de las 4 hojas oficiales (art-source/ciudad/).

Hojas: enemigos1 (Saqueador, Raptor, Verdugo + civiles: aldeano, mujer, niño) · enemigos2 (Plañidera,
Acechante de los tejados, Campanero, Sectario fanático, Perro del albañal, Espectro ciudadano) · jefes
(Maestro de Ceremonias, Tramoyista, Dama del Telón, El Presentador fases 1-3 + habilidades) · mapa
(tiles y props de referencia; el mapa isométrico general es solo referencia de diseño).

- GRILLAS de 8 direcciones: la celda se reparte pareja dentro del rectángulo medido y la figura se
  separa del fondo gris a cuadros por color (los sprites miden ~25-40 px: u2net los pierde). Se usan
  las vistas que el juego dibuja: perfil derecho (el izquierdo es el espejo), frente y espalda.
- SECUENCIAS (paneles de ataques y filas de civiles): la figura se separa igual y los cuadros se
  cortan por columnas vacías (la cantidad que dice la hoja no siempre coincide con lo dibujado).
  Un tramo el doble de ancho que la mediana se parte parejo.
- EFECTOS: alfa de brillo (lo que brilla sobre el fondo).
Escribe assets/sprites/arenas/ciudad/<ente>/atlas.png, assets/vfx/ciudad/*.png y js/assets/ciudad-meta.js
(+ bloque en js/assets/asset-manifest.js). Pixel art: coordenadas enteras, sin reescalar.
usage: python3 extract.py <frames_dir> [--reuse]
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'hielo_jefes'))
import extract as X
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
X.ROOT = os.path.join(REPO, 'art-source', 'ciudad')
E1, E2, JB, MP = 'enemigos1', 'enemigos2', 'jefes', 'mapa'
N8 = np.ones((3, 3), bool)

# ---------------- grillas de 8 direcciones: (hoja, rect, columnas, filas, vistas) ----------------
V8 = {'down': 0, 'side': 2, 'up': 4}
VB = {'down': 0, 'side': 1, 'up': 3}   # jefes humanoides: el perfil puro queda muy finito a esta escala
GRIDS = {
    'cm_saqueador':  (E1, (195, 170, 522, 440), 8, ['idle', 'walk', 'atk', 'atk2', 'hit', 'death'], V8),
    'cm_raptor':     (E1, (753, 160, 995, 418), 7, ['idle', 'walk', 'grab', 'carry', 'atk', 'hit', 'death'], V8),
    'cm_verdugo':    (E1, (1230, 168, 1528, 460), 7, ['idle', 'walk', 'atk', 'atk2', 'hit', 'death'], V8),
    'cm_planidera':  (E2, (278, 107, 477, 381), 6, ['idle', 'float', 'atk', 'cast', 'hit', 'death'], V8),
    'cm_acechante':  (E2, (1090, 135, 1255, 352), 5, ['idle', 'walk', 'run', 'leap', 'atk', 'hit', 'death'], {'down': 0, 'side': 3, 'up': 1}),
    'cm_campanero':  (E2, (298, 467, 487, 692), 6, ['idle', 'walk', 'atk', 'channel', 'hit', 'death'], V8),
    'cm_sectario':   (E2, (1090, 467, 1278, 680), 6, ['idle', 'walk', 'atk', 'prep', 'boom', 'death'], V8),
    'cm_perro':      (E2, (300, 790, 487, 995), 6, ['idle', 'walk', 'run', 'leap', 'atk', 'hit', 'death'], V8),
    'cm_espectro':   (E2, (1090, 798, 1270, 980), 6, ['idle', 'float', 'atk', 'possess', 'hit', 'death'], V8),
    'cm_maestro':    (JB, (307, 118, 512, 292), 8, ['idle', 'walk', 'atk', 'cast', 'hit', 'death'], VB),
    'cm_tramoyista': (JB, (820, 103, 998, 297), 5, ['idle', 'walk', 'atk', 'heavy', 'hit', 'death'], V8),
    'cm_dama':       (JB, (1310, 105, 1525, 295), 7, ['idle', 'walk', 'atk', 'cast', 'hit', 'death'], V8),
    'cm_presentador': (JB, (470, 580, 760, 797), 8, ['idle', 'walk', 'atk', 'cast', 'hit', 'death'], VB),
    'cm_presentador2': (JB, (835, 580, 1140, 797), 8, ['idle', 'walk', 'atk', 'cast', 'hit', 'death'], V8),
    'cm_presentador3': (JB, (1213, 580, 1370, 797), 5, ['idle', 'walk', 'atk', 'cast', 'hit', 'death'], V8),
}
GLOW_ROWS = ('death', 'atk', 'atk2', 'cast', 'channel', 'boom', 'possess', 'leap')
# ---------------- secuencias: (hoja, ente, set, rect, n, tipo) · tipo: fig (figura) | fx (brillo) ----------------
PANELS = [
    (E1, 'cm_saqueador', 'slash',  (158, 492, 292, 558), 6, 'fig'),
    (E1, 'cm_saqueador', 'rush',   (295, 492, 415, 558), 6, 'fig'),
    (E1, 'cm_saqueador', 'hurt',   (158, 592, 236, 642), 4, 'fig'),
    (E1, 'cm_saqueador', 'death6', (240, 592, 410, 642), 6, 'fig'),
    (E1, 'cm_raptor', 'grab6',     (545, 505, 690, 562), 6, 'fig'),
    (E1, 'cm_raptor', 'carry6',    (693, 505, 836, 562), 6, 'fig'),
    (E1, 'cm_raptor', 'atkciv',    (840, 505, 996, 562), 6, 'fig'),
    (E1, 'cm_raptor', 'drop',      (545, 592, 695, 648), 6, 'fig'),
    (E1, 'cm_raptor', 'death6',    (830, 592, 996, 648), 6, 'fig'),
    (E1, 'cm_verdugo', 'chop',     (1015, 530, 1265, 582), 6, 'fig'),
    (E1, 'cm_verdugo', 'sweep',    (1270, 530, 1526, 582), 8, 'fig'),
    (E1, 'cm_verdugo', 'smash',    (1250, 600, 1526, 650), 8, 'fig'),
    (E1, 'cm_verdugo', 'hurt',     (1015, 668, 1120, 720), 4, 'fig'),
    (E1, 'cm_verdugo', 'death6',   (1125, 668, 1345, 720), 8, 'fig'),
    (E2, 'cm_planidera', 'wail',   (490, 110, 603, 175), 6, 'fig'),
    (E2, 'cm_planidera', 'scream', (607, 110, 775, 175), 8, 'fig'),
    (E2, 'cm_planidera', 'throw',  (490, 198, 583, 248), 6, 'fig'),
    (E2, 'cm_planidera', 'death6', (688, 297, 775, 350), 6, 'fig'),
    (E2, 'cm_acechante', 'leap8',  (1265, 110, 1348, 160), 8, 'fig'),
    (E2, 'cm_acechante', 'dive',   (1352, 110, 1525, 160), 6, 'fig'),
    (E2, 'cm_acechante', 'climb',  (1265, 182, 1525, 232), 8, 'fig'),
    (E2, 'cm_acechante', 'death6', (1452, 283, 1525, 333), 6, 'fig'),
    (E2, 'cm_campanero', 'bell',   (498, 473, 620, 518), 6, 'fig'),
    (E2, 'cm_campanero', 'channel8', (623, 473, 780, 518), 8, 'fig'),
    (E2, 'cm_campanero', 'death6', (707, 645, 780, 690), 6, 'fig'),
    (E2, 'cm_sectario', 'atk',     (1285, 475, 1383, 520), 6, 'fig'),
    (E2, 'cm_sectario', 'prep8',   (1387, 475, 1525, 520), 8, 'fig'),
    (E2, 'cm_sectario', 'death6',  (1413, 545, 1525, 592), 6, 'fig'),
    (E2, 'cm_perro', 'atk',        (495, 780, 598, 825), 6, 'fig'),
    (E2, 'cm_perro', 'leap8',      (601, 780, 775, 825), 8, 'fig'),
    (E2, 'cm_perro', 'emerge',     (495, 845, 775, 905), 8, 'fig'),
    (E2, 'cm_espectro', 'atk',     (1277, 798, 1375, 840), 6, 'fig'),
    (E2, 'cm_espectro', 'drain',   (1379, 798, 1525, 840), 8, 'fig'),
    (E2, 'cm_espectro', 'possess8', (1277, 862, 1525, 905), 8, 'fig'),
    (JB, 'cm_maestro', 'tp',       (420, 343, 512, 422), 6, 'fig'),
    (JB, 'cm_tramoyista', 'hit6',  (685, 342, 750, 395), 6, 'fig'),
    (JB, 'cm_tramoyista', 'drag',  (752, 342, 890, 395), 8, 'fig'),
    (JB, 'cm_tramoyista', 'wreck', (685, 418, 825, 462), 8, 'fig'),
    (JB, 'cm_tramoyista', 'throw', (828, 418, 910, 462), 6, 'fig'),
    (JB, 'cm_dama', 'summon',      (1292, 343, 1405, 408), 8, 'fig'),
    (JB, 'cm_dama', 'mirror',      (1280, 432, 1410, 478), 8, 'fig'),
    (JB, 'cm_presentador', 'transform', (945, 848, 1525, 905), 12, 'fig'),
    (JB, 'cm_presentador3', 'death12', (1295, 928, 1525, 985), 12, 'fig'),
]
# ---------------- efectos: (hoja, clave, rect, n, suelo) · n>1 = secuencia cortada por columnas ----------------
FX = [
    (E1, 'cmSaqImpact',  (418, 492, 516, 558), 4, False),
    (E1, 'cmBlood',      (415, 592, 516, 642), 1, True),
    (E1, 'cmRapImpact',  (700, 592, 826, 648), 4, False),
    (E1, 'cmVerSlam',    (1015, 600, 1247, 650), 8, True),
    (E2, 'cmWave',       (490, 285, 555, 350), 1, True),
    (E2, 'cmPanicZone',  (557, 285, 620, 350), 1, True),
    (E2, 'cmTear',       (622, 285, 685, 350), 1, False),
    (E2, 'cmTearSeq',    (588, 198, 775, 248), 6, False),
    (E2, 'cmLeapArc',    (1265, 283, 1347, 333), 1, True),
    (E2, 'cmAceImpact',  (1349, 283, 1395, 333), 1, False),
    (E2, 'cmRoofDust',   (1397, 283, 1450, 333), 1, False),
    (E2, 'cmBellWave',   (498, 545, 620, 592), 6, True),
    (E2, 'cmBellSummon', (623, 545, 780, 592), 8, True),
    (E2, 'cmBellRing',   (498, 645, 563, 690), 1, True),
    (E2, 'cmSigils',     (565, 645, 625, 690), 1, True),
    (E2, 'cmSummonFx',   (627, 645, 705, 690), 1, True),
    (E2, 'cmBoom',       (1285, 545, 1410, 592), 8, False),
    (E2, 'cmFire',       (1285, 640, 1350, 685), 1, False),
    (E2, 'cmBoomFx',     (1352, 640, 1433, 685), 1, False),
    (E2, 'cmAsh',        (1436, 640, 1525, 685), 1, True),
    (E2, 'cmSplash',     (495, 940, 560, 985), 1, True),
    (E2, 'cmSewer',      (562, 940, 625, 985), 1, True),
    (E2, 'cmSpecBolt',   (1277, 940, 1340, 975), 1, False),
    (E2, 'cmSpecDrain',  (1342, 940, 1405, 975), 1, False),
    (E2, 'cmSpecPossess', (1407, 940, 1450, 975), 1, False),
    (E2, 'cmSpecFade',   (1452, 940, 1525, 975), 4, False),
    (JB, 'cmMark',       (188, 343, 250, 422), 1, True),
    (JB, 'cmMaeBolt',    (253, 343, 318, 422), 1, False),
    (JB, 'cmMaeZone',    (322, 343, 418, 422), 1, True),
    (JB, 'cmScenery',    (893, 342, 1000, 395), 4, False),
    (JB, 'cmTraImpact',  (912, 418, 1000, 462), 3, True),
    (JB, 'cmCurtain',    (1180, 343, 1288, 408), 4, False),
    (JB, 'cmDarkZone',   (1408, 343, 1525, 408), 4, True),
    (JB, 'cmDamaBolt',   (1180, 432, 1275, 478), 4, False),
    (JB, 'cmDamaBoom',   (1413, 432, 1525, 478), 3, False),
    (JB, 'cmPreBolt',    (420, 848, 665, 900), 7, False),
    (JB, 'cmChaosCurtain', (680, 848, 930, 905), 8, False),
    (JB, 'cmShowMark',   (420, 925, 665, 985), 6, True),
    (JB, 'cmSpectators', (945, 928, 1100, 985), 4, False),
    (JB, 'cmFinalBoom',  (1110, 928, 1285, 985), 4, False),
]
# piezas con figura (sin animación): (hoja, clave, rect, n)
PIECES = [
    (JB, 'pilar_escena', (680, 925, 930, 985), 8),
    (MP, 'fuente', (328, 780, 364, 812), 1), (MP, 'estatua', (328, 814, 364, 848), 1),
    (MP, 'farol', (328, 848, 364, 882), 1), (MP, 'fogata', (328, 884, 364, 918), 1),
    (MP, 'escombros', (328, 922, 364, 956), 1), (MP, 'arbol_seco', (328, 958, 364, 998), 1),
    (MP, 'valla', (176, 780, 214, 812), 1), (MP, 'puerta_ic', (176, 814, 214, 848), 1),
    (MP, 'spawn', (176, 884, 214, 918), 1), (MP, 'evento', (176, 922, 214, 956), 1), (MP, 'trampa', (176, 958, 214, 998), 1),
    (MP, 'barril', (952, 902, 1014, 1000), 1), (MP, 'columna', (882, 902, 940, 1000), 1), (MP, 'arco', (812, 902, 874, 1000), 1),
    (MP, 'reja', (955, 800, 1015, 870), 1),
]
# texturas crudas (sin alfa): (hoja, clave, rect)
TEX = [
    (MP, 'tex_calle', (489, 806, 539, 868)), (MP, 'tex_adoquin', (554, 806, 604, 868)), (MP, 'tex_tierra', (619, 806, 669, 868)),
    (MP, 'tex_escombros', (681, 806, 733, 868)), (MP, 'tex_puente', (756, 806, 806, 868)), (MP, 'tex_muralla', (899, 806, 939, 868)),
    (MP, 'tex_techo', (489, 906, 539, 996)), (MP, 'tex_pared_ext', (554, 906, 604, 996)), (MP, 'tex_pared_int', (619, 906, 669, 996)),
    (MP, 'tex_puerta', (684, 906, 734, 996)), (MP, 'tex_ventana', (752, 906, 800, 996)),
    (MP, 'int_1', (1045, 785, 1200, 880)), (MP, 'int_2', (1210, 785, 1365, 880)), (MP, 'int_3', (1373, 785, 1528, 880)),
    (MP, 'lateral', (1050, 600, 1530, 740)),
]
# civiles: filas de una sola dirección (secuencias por columnas vacías)
CIV_ROWS = {'idle': (821, 849), 'walk': (849, 877), 'run': (877, 905), 'hurt': (905, 933), 'fall': (933, 962), 'death': (962, 996)}
CIVS = {'cm_aldeano': (196, 514), 'cm_mujer': (703, 1012), 'cm_nino': (1208, 1522)}

def sheet_rgb(name): return X.sheet(name)[0]
def glow_of(name): return X._cache[name + ':glow']

def fg_mask(sub, gl=None):
    """Figura sobre el fondo gris a cuadros: todo lo que no es gris medio ni el negro de los bordes;
    el contorno oscuro que toca la figura se recupera."""
    sub = sub.astype(int); r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]; v = sub.max(-1)
    gray = (abs(r - g) < 13) & (abs(g - b) < 13) & (v > 44) & (v < 124)
    dark = v < 36
    fg = ~gray & ~dark
    fg = ndimage.binary_opening(fg, np.ones((2, 2), bool))
    fg = fg | (dark & ndimage.binary_dilation(fg, N8, iterations=2))
    fg = X.drop_lines(fg)
    fg = ndimage.binary_fill_holes(ndimage.binary_closing(fg, N8, iterations=1))
    if gl is not None: fg = fg | (gl > 0.3)
    lb, k = ndimage.label(fg, N8)
    if k:
        sz = ndimage.sum(fg, lb, range(1, k + 1)); fg = np.isin(lb, [i + 1 for i in range(k) if sz[i] >= 12])
    return fg

def drop_text(m, sub):
    """Afuera los títulos de los paneles: tiras bajas pegadas arriba o con letras celestes/crema."""
    lb, k = ndimage.label(m, N8); keep = np.zeros_like(m)
    for i, sl in enumerate(ndimage.find_objects(lb), 1):
        if sl is None: continue
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start; comp = lb[sl] == i
        px = sub[sl][comp].astype(int)
        cyan = ((px[:, 2] > 150) & (px[:, 2] > px[:, 0] + 50)).mean() if len(px) else 0
        cream = ((px[:, 0] > 180) & (px[:, 1] > 150) & (px[:, 2] > 100)).mean() if len(px) else 0
        if sl[0].start < 14 and h <= 14: continue
        if (cyan > 0.25 or cream > 0.3) and h <= 16 and w >= h: continue
        keep |= (lb == i)
    return keep

def main_blob(m, reach=3):
    """La figura es la componente mayor + lo que la toca de cerca (armas, partículas pegadas)."""
    lb, k = ndimage.label(ndimage.binary_dilation(m, N8, iterations=reach), N8)
    if k <= 1: return m
    sizes = ndimage.sum(m, lb, range(1, k + 1))
    return m & (lb == int(np.argmax(sizes)) + 1)

def cut_cell(name, box, glow_add=False, inset=2):
    rgb = sheet_rgb(name); x0, y0, x1, y1 = box; x0 += inset; y0 += inset; x1 -= inset; y1 -= inset
    sub = rgb[y0:y1, x0:x1]; gl = glow_of(name)[y0:y1, x0:x1] if glow_add else None
    m = main_blob(fg_mask(sub, gl))
    a = m.astype(float)
    res = X.crop(sub, a, m, pad=1)
    return res[0] if res else None

def split_runs(m, n_hint):
    occ = m.any(0); runs = []; st = None
    for i, v in enumerate(list(occ) + [False]):
        if v and st is None: st = i
        elif not v and st is not None:
            if i - st >= 3: runs.append([st, i])
            st = None
    if not runs: return []
    # tramos muy chicos pegados al vecino (partículas sueltas): se unen al más cercano
    merged = []
    for r in runs:
        if merged and (r[1] - r[0] < 6 or r[0] - merged[-1][1] <= 1): merged[-1][1] = r[1]
        else: merged.append(r)
    runs = merged
    med = float(np.median([b - a for a, b in runs]))
    out = []
    for a, b in runs:
        k = int(round((b - a)/med)) if med > 0 else 1
        if k >= 2 and len(runs) < n_hint:
            w = (b - a)/k; out += [(int(a + i*w), int(a + (i + 1)*w)) for i in range(k)]
        else: out.append((a, b))
    return out

def cut_seq(name, rect, n, glow_add=True, inset=2):
    rgb = sheet_rgb(name); x0, y0, x1, y1 = rect; x0 += inset; y0 += inset; x1 -= inset; y1 -= inset
    sub = rgb[y0:y1, x0:x1]; gl = glow_of(name)[y0:y1, x0:x1] if glow_add else None
    m = drop_text(fg_mask(sub, gl), sub)
    a = m.astype(float)
    if gl is not None: a = np.maximum(a*(~(gl > 0.3)), np.where(gl > 0.3, np.maximum(gl, a*0.999), 0)); a[m & (a < 0.5)] = 1
    out = []; runs = split_runs(m, n); uniform = len(runs) < max(2, int(n*0.6))
    if uniform:   # figuras pegadas o restos del fondo entre cuadros: reparto parejo + figura principal por celda
        w = m.shape[1]/n; runs = [(int(i*w), int((i + 1)*w)) for i in range(n)]
    for c0, c1 in runs:
        mm = np.zeros_like(m); mm[:, c0:c1] = m[:, c0:c1]
        if uniform: mm = main_blob(mm, 2)
        res = X.crop(sub, a, mm, pad=1)
        if res and res[0].width > 5 and res[0].height > 8: out.append(res[0])
    return out

def cut_fx_box(name, box, inset=2, label=False):
    rgb = sheet_rgb(name); x0, y0, x1, y1 = box; x0 += inset; y0 += inset; x1 -= inset; y1 -= inset
    if label: y0 += 11
    a = np.clip(glow_of(name)[y0:y1, x0:x1]*1.3, 0, 1)
    m = X.drop_lines(a > 0.06)
    c = rgb[y0:y1, x0:x1].astype(float)
    mx = c.max(-1, keepdims=True); lift = np.clip(150 - mx, 0, None)*(c/np.maximum(mx, 1))
    c = np.clip(c + lift*(a[..., None] < 0.7), 0, 255).astype(np.uint8)
    res = X.crop(c, a, m, pad=1)
    return res[0] if res else None

def fx_seq(name, rect, n, inset=2):
    """Secuencia de efectos: columnas por brillo; si no, reparto parejo."""
    x0, y0, x1, y1 = rect
    if n <= 1: return [cut_fx_box(name, rect, inset)]
    a = glow_of(name)[y0 + inset:y1 - inset, x0 + inset:x1 - inset] > 0.08
    runs = split_runs(a, n)
    if not (n - 2 <= len(runs) <= n + 2):
        w = (x1 - x0)/n; runs = [(int(i*w) - inset, int((i + 1)*w) - inset) for i in range(n)]
    return [cut_fx_box(name, (x0 + inset + a_, y0, x0 + inset + b_, y1), 0) for a_, b_ in runs]

if __name__ == '__main__':
    sys.path.insert(0, os.path.join(HERE, '..', 'hielo_jefes'))
    from build import pack
    X.BG_PCT, X.BG_SIZE = 50, 41
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    cache = os.path.join(out, '_glow'); os.makedirs(cache, exist_ok=True)
    for nm in (E1, E2, JB, MP):
        fg = os.path.join(cache, nm + '.npy')
        if os.path.exists(fg):
            rgb = np.array(Image.open(os.path.join(X.ROOT, nm + '.png')).convert('RGB'))
            X._cache[nm] = (rgb, None, 'dist'); X._cache[nm + ':glow'] = np.load(fg)
        else:
            X.sheet(nm); np.save(fg, X._cache[nm + ':glow'])
    atlases, fxmeta, pieces, tex, manifest = {}, {}, {}, {}, []
    def save_atlas(ent, frames, sets):
        sets = {k: v for k, v in sets.items() if v}
        atlas, w, h = pack(frames, 8)
        dest = f'assets/sprites/arenas/ciudad/{ent}'
        os.makedirs(os.path.join(REPO, dest), exist_ok=True)
        atlas.save(os.path.join(REPO, dest, 'atlas.png'), optimize=True); manifest.append(f'{dest}/atlas.png')
        hs = sorted(frames[j].height for j in (sets.get('walk') or sets['idle'])); refH = hs[len(hs)//2]
        atlases[ent] = {"src": f"{dest}/atlas.png", "meta": {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 2)/h, 4), "sets": sets}}
        for k, lst in sets.items():
            for j, fi in enumerate(lst): frames[fi].save(os.path.join(out, f'{ent}__{k}_{j}.png'))
        print(ent, atlas.size, {k: len(v) for k, v in sets.items()})
    # ---- personajes con grilla de direcciones ----
    for ent, (name, (x0, y0, x1, y1), ncol, rows, views) in GRIDS.items():
        frames, idx = [], {}
        def add(im): frames.append(im); return len(frames) - 1
        cw, rh = (x1 - x0)/ncol, (y1 - y0)/len(rows)
        for ri, st in enumerate(rows):
            for vw, ci in views.items():
                box = (int(x0 + ci*cw), int(y0 + ri*rh), int(x0 + (ci + 1)*cw), int(y0 + (ri + 1)*rh))
                im = cut_cell(name, box, glow_add=st in GLOW_ROWS)
                if im is not None and im.height > 8: idx[(st, vw)] = add(im)
        ref = float(np.median([frames[j].height for (st, v), j in idx.items() if st == 'idle']))
        for key in list(idx):
            if key[0] not in ('death', 'hit', 'boom') and frames[idx[key]].height < ref*0.55: del idx[key]
        g = lambda st, v: [idx[(st, v)]] if (st, v) in idx else []
        mv = 'walk' if 'walk' in rows else 'float'
        sets = {
            'idle': g('idle', 'side') + g(mv if mv == 'float' else 'idle', 'side'),
            'walk': (g(mv, 'side') or g('idle', 'side')) + g('idle', 'side'),
            'walk_down': (g(mv, 'down') or g('idle', 'down')) + g('idle', 'down'),
            'walk_up': (g(mv, 'up') or g('idle', 'up')) + g('idle', 'up'),
            'atk': g('idle', 'side') + g('atk', 'side') + g('atk2', 'side'),
            'hit': g('hit', 'side') or g('idle', 'side'),
            'death': (g('hit', 'side') or []) + g('death', 'side') + g('death', 'down'),
        }
        for st in rows:
            if st not in ('idle', 'walk', 'atk', 'hit', 'death'): sets[st] = g(st, 'side') + g(st, 'down')
        for (pn, pe, pset, rect, n, typ) in PANELS:
            if pe != ent: continue
            ims = [add(im) for im in cut_seq(pn, rect, n, glow_add=True)]
            if pset == 'death6' or pset == 'death12': sets['death'] = sets['death'][:1] + ims
            elif pset.endswith('8') or pset.endswith('6'): sets[pset[:-1]] = ims
            else: sets[pset] = ims
        save_atlas(ent, frames, sets)
    # ---- civiles (una dirección, cuadros por fila) ----
    for ent, (cx0, cx1) in CIVS.items():
        frames, sets = [], {}
        for st, (ry0, ry1) in CIV_ROWS.items():
            ims = cut_seq(E1, (cx0, ry0, cx1, ry1), 8, glow_add=False, inset=1)
            if st in ('idle', 'walk', 'run') and ims:   # de pie: afuera los cuadros acostados que se cuelan de la fila vecina
                mh = float(np.median([im.height for im in ims])); ims = [im for im in ims if im.height >= mh*0.75 and im.width <= im.height*1.3]
            sets[st] = list(range(len(frames), len(frames) + len(ims))); frames += ims
        sets['walk_down'] = sets['walk'][:]; sets['walk_up'] = sets['walk'][:]
        sets['hit'] = sets['hurt'][:]; sets['atk'] = sets['idle'][:2]
        save_atlas(ent, frames, sets)
    # ---- efectos ----
    fxdir = 'assets/vfx/ciudad'; os.makedirs(os.path.join(REPO, fxdir), exist_ok=True)
    for (name, key, rect, n, ground) in FX:
        srcs = []
        for i, im in enumerate(fx_seq(name, rect, n)):
            if im is None or im.width < 6 or im.height < 6: continue
            f = f'{fxdir}/{key}_{i}.png'; im.save(os.path.join(REPO, f), optimize=True); im.save(os.path.join(out, f'fx_{key}_{i}.png')); srcs.append(f)
        if srcs: fxmeta[key] = {"ground": ground, "srcs": srcs}; manifest += srcs
    # ---- piezas con figura ----
    for (name, key, rect, n) in PIECES:
        ims = cut_seq(name, rect, n, glow_add=True, inset=1) if n > 1 else [cut_cell(name, rect, glow_add=True, inset=1)]
        srcs = []
        for i, im in enumerate(ims):
            if im is None or im.width < 6: continue
            f = f'{fxdir}/{key}_{i}.png'; im.save(os.path.join(REPO, f), optimize=True); im.save(os.path.join(out, f'pc_{key}_{i}.png')); srcs.append(f)
        pieces[key] = srcs; manifest += srcs
    # ---- texturas ----
    for (name, key, (x0, y0, x1, y1)) in TEX:
        im = Image.fromarray(sheet_rgb(name)[y0:y1, x0:x1])
        f = f'{fxdir}/{key}.png'; im.save(os.path.join(REPO, f), optimize=True); im.save(os.path.join(out, f'tx_{key}.png')); tex[key] = f; manifest.append(f)
    js = ['"use strict";', '/* GENERADO por tools/art/ciudad/extract.py (no editar a mano). */',
          f'const CIUDAD_ATLAS = {json.dumps(atlases, separators=(",", ":"))};',
          f'const CIUDAD_FX = {json.dumps(fxmeta, separators=(",", ":"))};',
          f'const CIUDAD_PIECES = {json.dumps(pieces, separators=(",", ":"))};',
          f'const CIUDAD_TEX = {json.dumps(tex, separators=(",", ":"))};']
    open(os.path.join(REPO, 'js', 'assets', 'ciudad-meta.js'), 'w').write('\n'.join(js) + '\n')
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); m = open(mp).read()
    A, B = '  // >>> ciudad maldita (tools/art/ciudad/extract.py)\n', '  // <<< ciudad maldita\n'
    block = A + ''.join(f'  "{q}",\n' for q in manifest) + B
    m = (m[:m.index(A)] + block + m[m.index(B) + len(B):]) if A in m else m.replace('const ASSET_MANIFEST = [\n', 'const ASSET_MANIFEST = [\n' + block, 1)
    open(mp, 'w').write(m)
    print('manifest', len(manifest))
