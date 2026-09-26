#!/usr/bin/env python3
"""Arena — EL REINO MICELIAL: hojas oficiales -> cuadros limpios -> atlas por entidad + FX + partes de la
Madre Espora + mapas (inicial / maduro).

  python3 tools/art/micelial/build_micelial.py      # reconstruye todo e imprime la metadata JS

Fuentes (tal cual las mandó el usuario, 1536x1024) en art-source/micelial/:
  enemies.png      6 enemigos + efectos. YA TRAE CANAL ALFA (el degradado de color que se ve en un visor
                   sin alfa es el RGB de píxeles transparentes): sprite = alfa >= 60.
  bosses.png       Micelio Primigenio (subjefe) y Madre Espora (jefe) sobre fondo NEGRO: el alfa se arma
                   con la luminancia (cuerpo sólido = máx(RGB) > 30 con huecos rellenos; brillo suave alrededor).
  map_initial.png  el Reino en su estado inicial (violetas / azules / cian)
  map_mature.png   el Reino maduro / infectado (verde ácido / amarillo / naranja / rojo)
Nunca se agregan píxeles: solo se quitan fondo, títulos, etiquetas y marcos.
Cuadros:
  - enemigos: componentes 2D de la banda de su fila (cuerpos + partículas a < 12 px); se elige el grupo que
    mejor coincide con la caja pedida (así los cuadros que se superponen en caja no se mezclan).
  - jefes: cajas 'clip' (los cuadros se tocan): se recorta la caja y se quitan los restos chicos de los
    vecinos que quedaron pegados al borde.
Atlas: pies sobre una línea común y eje X en el centro de masa de los pies (build_atlas de la Fortaleza).
"""
import json, os, sys, math
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'fortaleza'))
from build_fortaleza import build_atlas   # mismo criterio de anclaje que la Fortaleza

SRC = os.path.join(ROOT, 'art-source', 'micelial')
OUT = os.path.join(ROOT, 'assets', 'sprites', 'arenas', 'micelial')

# ---------------- hojas -> RGBA ----------------
def load_enemies():
    return np.array(Image.open(os.path.join(SRC, 'enemies.png')).convert('RGBA')).astype(np.int32)

def load_bosses():
    a = np.array(Image.open(os.path.join(SRC, 'bosses.png')).convert('RGB')).astype(np.int32)
    mx = a.max(-1)
    soft = np.clip((mx - 14) * 6, 0, 255)
    out = np.zeros(a.shape[:2] + (4,), np.int32); out[..., :3] = a; out[..., 3] = soft
    return out, mx

# ---------------- extracción ----------------
def band_groups(alpha, band, amin=60, body=380, attach=12):
    """Cuerpos grandes + partículas cercanas, dentro de la banda (x0,x1,y0,y1). -> [(box, mask_full)]"""
    x0, x1, y0, y1 = band
    m = alpha[y0:y1, x0:x1] >= amin
    lbl, n = ndimage.label(m, structure=np.ones((3, 3)))
    if not n: return []
    objs = ndimage.find_objects(lbl); sizes = ndimage.sum(m, lbl, range(1, n + 1))
    boxes = [(o[1].start, o[1].stop, o[0].start, o[0].stop) for o in objs]
    bodies = [i for i in range(n) if sizes[i] >= body]
    groups = {b: [b] for b in bodies}
    for i in range(n):
        if i in groups or sizes[i] < 3: continue
        bx = boxes[i]; best, bd = None, 1e9
        for b in bodies:
            B = boxes[b]
            dx = max(B[0] - bx[1], bx[0] - B[1], 0); dy = max(B[2] - bx[3], bx[2] - B[3], 0)
            d = math.hypot(dx, dy)
            if d < bd: bd, best = d, b
        if best is not None and bd <= attach: groups[best].append(i)
    out = []
    for b, ids in groups.items():
        mk = np.isin(lbl, [i + 1 for i in ids])
        X0 = min(boxes[i][0] for i in ids); X1 = max(boxes[i][1] for i in ids)
        Y0 = min(boxes[i][2] for i in ids); Y1 = max(boxes[i][3] for i in ids)
        full = np.zeros(alpha.shape, bool); full[y0:y1, x0:x1] = mk
        out.append(((x0 + X0, x0 + X1, y0 + Y0, y0 + Y1), full))
    return out

def iou(a, b):
    ix = max(0, min(a[1], b[1]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[2], b[2]))
    inter = ix * iy; ua = (a[1]-a[0])*(a[3]-a[2]) + (b[1]-b[0])*(b[3]-b[2]) - inter
    return inter / ua if ua else 0

def clip_mask(alpha, box, amin=60):
    x0, x1, y0, y1 = box
    m = np.zeros(alpha.shape, bool); m[y0:y1, x0:x1] = alpha[y0:y1, x0:x1] >= amin
    ll, k = ndimage.label(m, structure=np.ones((3, 3)))
    if k:
        sz = ndimage.sum(m, ll, range(1, k + 1)); big = sz.max()
        for i, sl in enumerate(ndimage.find_objects(ll), 1):
            touches = sl[1].start <= x0 + 1 or sl[1].stop >= x1 - 1
            if (touches and sz[i-1] < big * 0.06) or sz[i-1] < 4: m[ll == i] = False
    return m

def to_rgba(src, mask, soft_alpha=True, solid_mx=None):
    """Recorte final: RGB original; alfa original (suave) dentro de la máscara dilatada 2 px."""
    ys, xs = np.where(mask)
    if not len(ys): raise ValueError('máscara vacía')
    X0, X1, Y0, Y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    X0 = max(0, X0 - 2); Y0 = max(0, Y0 - 2); X1 = min(src.shape[1], X1 + 2); Y1 = min(src.shape[0], Y1 + 2)
    mk = ndimage.binary_dilation(mask, iterations=2)[Y0:Y1, X0:X1]
    al = src[Y0:Y1, X0:X1, 3].copy()
    if solid_mx is not None:
        # jefes: el cuerpo (máx RGB > 30, con huecos cerrados) es opaco; el resplandor alrededor queda suave
        hard = (solid_mx[Y0:Y1, X0:X1] > 30) & mask[Y0:Y1, X0:X1]
        holes = ndimage.binary_fill_holes(hard) & ~hard           # solo huecos chicos (entre raíces): un contorno
        hl, hn = ndimage.label(holes)                              # grande cerrado no debe rellenarse de negro
        if hn:
            hs = ndimage.sum(holes, hl, range(1, hn + 1))
            hard = hard | np.isin(hl, np.where(hs < 400)[0] + 1)
        al = np.where(hard, 255, al)
    al = np.where(mk, al, 0)
    rgba = np.zeros((Y1 - Y0, X1 - X0, 4), np.uint8)
    rgba[..., :3] = src[Y0:Y1, X0:X1, :3]; rgba[..., 3] = np.clip(al, 0, 255)
    return rgba

# ---------------- ESPECIFICACIÓN ----------------
# enemigos: banda de la fila (x0,x1,y0,y1) + cuadros (caja aproximada para elegir el grupo; 'clip' fuerza caja)
ROWS = {
  'infectado': {'band': (4, 1282, 34, 124), 'ref': 'walk_01', 'frames': {
      'idle_01': (19,81,39,121), 'idle_02': (100,176,37,120), 'walk_01': (195,268,35,119), 'walk_02': (290,362,34,120),
      'atk_01': (371,461,34,123), 'atk_02': (465,541,34,123), 'burst_01': (536,683,34,119), 'burst_02': (694,756,34,123),
      'burst_03': (774,842,34,120), 'hit_01': (857,919,34,121), 'hit_02': (932,1008,43,123),
      'death_01': (1021,1107,34,123), 'death_02': (1105,1279,34,123)},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','burst_03','walk_02','burst_03'], 'atk':['atk_01','atk_02'],
             'burst':['burst_02','burst_01','burst_03'], 'hit':['hit_01','hit_02'], 'death':['death_01','death_02']}},
  'acechador': {'band': (4, 1200, 182, 272), 'ref': 'walk_01', 'frames': {
      'idle_01': (13,82,184,269), 'idle_02': (85,158,186,269), 'walk_01': (163,227,185,269), 'walk_02': (230,303,185,269),
      'walk_03': (308,375,176,270), 'hide_01': (379,513,194,269), 'leap_00': (583,683,195,270), 'leap_01': (514,580,159,236),
      'leap_02': (625,726,162,246), 'atk_01': (726,849,172,269), 'atk_02': (849,927,181,270),
      'hit_01': (937,995,185,270), 'hit_02': (1004,1077,181,269), 'death_01': (1068,1196,201,270)},
    'band_override': {'leap_01': (4, 1200, 158, 272), 'leap_02': (4, 1200, 158, 272), 'walk_03': (4, 1200, 158, 272)},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','walk_02','walk_03','walk_02'], 'hide':['hide_01'],
             'leap':['leap_00','leap_01','leap_02'], 'atk':['atk_01','atk_02'], 'hit':['hit_01','hit_02'], 'death':['hit_02','death_01']}},
  'hinchado': {'band': (4, 1244, 330, 437), 'ref': 'walk_01', 'frames': {
      'idle_01': (16,131,332,434), 'walk_01': (143,277,315,435), 'walk_02': (271,374,321,435), 'atk_01': (381,520,318,435),
      'prep_01': (508,598,304,434), 'prep_02': (603,728,316,435), 'boom_01': (736,902,312,434),
      'hit_01': (897,971,319,435), 'hit_02': (985,1068,324,435), 'death_01': (1066,1238,333,433)},
    'band_override': {k: (4, 1244, 300, 437) for k in ('walk_01','walk_02','atk_01','prep_01','prep_02','boom_01','hit_01','hit_02')},
    'sets': {'idle':['idle_01','walk_01'], 'walk':['walk_01','idle_01','walk_02','idle_01'], 'atk':['atk_01','walk_02'],
             'prep':['prep_01','prep_02'], 'boom':['boom_01'], 'hit':['hit_01','hit_02'], 'death':['hit_02','death_01']}},
  'peregrino': {'band': (4, 1224, 497, 598), 'ref': 'walk_01', 'frames': {
      'idle_01': (15,112,500,596), 'walk_01': (128,187,501,596), 'walk_02': (197,269,501,596), 'walk_03': (270,346,498,596),
      'plant_01': (361,496,487,597), 'plant_02': (496,629,478,596), 'shoot_01': (575,714,514,596),
      'hit_01': (921,989,492,596), 'hit_02': (1012,1076,492,596), 'death_01': (1077,1215,521,594)},
    'band_override': {k: (4, 1224, 476, 598) for k in ('plant_01','plant_02')},
    'sets': {'idle':['idle_01','walk_02'], 'walk':['walk_01','walk_02','walk_03','walk_02'], 'plant':['plant_01','plant_02'],
             'atk':['plant_02','shoot_01'], 'hit':['hit_01','hit_02'], 'death':['hit_02','death_01']}},
  'sabueso': {'band': (4, 1224, 656, 745), 'ref': 'walk_01', 'frames': {
      'idle_01': (14,109,666,743), 'idle_02': (115,213,662,743), 'walk_01': (222,306,665,743), 'walk_02': (308,410,667,743),
      'run_01': (420,540,664,743), 'bite_01': (544,670,665,742), 'leap_01': (701,823,642,735), 'leap_02': (831,949,636,720),
      'hit_01': (966,1033,657,743), 'death_01': (1040,1217,664,743)},
    'band_override': {k: (4, 1224, 634, 745) for k in ('leap_01','leap_02')},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','walk_02','run_01','walk_02'], 'run':['run_01','walk_02','leap_01','walk_02'],
             'atk':['bite_01','run_01'], 'leap':['leap_01','leap_02'], 'hit':['hit_01'], 'death':['hit_01','death_01']}},
  'chaman': {'band': (4, 1240, 806, 978), 'ref': 'walk_01', 'frames': {
      'idle_01': (12,103,810,974), 'idle_02': (111,207,826,976), 'walk_01': (198,270,817,976),
      'walk_02': (266,362,800,976, 'clip'), 'channel_01': (362,466,790,976, 'clip'), 'invoke_01': (466,564,790,976, 'clip'),
      'regen_01': (699,849,820,975), 'atk_01': (840,955,790,975), 'atk_02': (942,1018,820,974),
      'hit_01': (1027,1118,824,972), 'death_01': (1096,1236,818,976)},
    'band_override': {k: (4, 1240, 788, 978) for k in ('atk_01',)},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','walk_02','idle_02','walk_02'], 'channel':['channel_01','invoke_01'],
             'regen':['regen_01'], 'atk':['atk_01','atk_02'], 'hit':['hit_01'], 'death':['hit_01','death_01']}},
}
# subjefe y jefe: cajas 'clip' (x0,x1) por fila (y0,y1)
def _clip_row(y0, y1, pairs): return {n: (a, b, y0, y1, 'clip') for n, (a, b) in pairs.items()}
BOSSES = {
  'micelio': {'ref': 'walk_01', 'anchor': 0.93, 'frames': {
      **_clip_row(31, 121, {'idle_01':(398,479),'idle_02':(479,563),'idle_03':(563,653),'idle_04':(653,745),'idle_05':(745,851),
                            'walk_01':(851,940),'walk_02':(940,1031),'walk_03':(1031,1103),'walk_04':(1103,1182),'walk_05':(1182,1262),
                            'turn_01':(1262,1351),'turn_02':(1351,1435),'turn_03':(1435,1528)}),
      **_clip_row(149, 234, {'atk_01':(398,499),'atk_02':(499,582),'atk_03':(582,696),'atk_04':(696,834),'atk_05':(834,979),
                             'lash_01':(979,1081),'lash_02':(1081,1228),'lash_03':(1228,1331)}),
      **_clip_row(263, 354, {'rain_01':(398,488),'germ_01':(798,901),'germ_02':(901,994),
                             'absorb_01':(1234,1418),'absorb_02':(1418,1530)}),
      **_clip_row(389, 480, {'hit_01':(398,467),'hit_02':(467,536),'hit_03':(536,605),'hit_04':(605,669),
                             'roar_01':(669,760),'roar_02':(760,840),'roar_03':(840,913),'roar_04':(913,985),'roar_05':(985,1078),
                             'death_01':(1078,1236),'death_02':(1236,1375),'death_03':(1375,1527)})},
    'sets': {'idle':['idle_01','idle_02','idle_03','idle_04','idle_05'], 'walk':['walk_01','walk_02','walk_03','walk_04','walk_05'],
             'turn':['turn_01','turn_02','turn_03'], 'atk':['atk_01','atk_02','atk_03','atk_04','atk_05'],
             'lash':['lash_01','lash_02','lash_03'], 'rain':['rain_01','idle_03'], 'germ':['germ_01','germ_02'],
             'absorb':['absorb_01','absorb_02'], 'hit':['hit_01','hit_02','hit_03','hit_04'],
             'roar':['roar_01','roar_02','roar_03','roar_04','roar_05'], 'death':['death_01','death_02','death_03']}},
  'madre_espora': {'ref': 'idle_01', 'anchor': 0.95, 'frames': {
      **_clip_row(546, 644, {'idle_01':(405,499),'idle_02':(499,583),'idle_03':(583,664),
                             'atk_01':(664,745),'atk_02':(745,825),'atk_03':(825,952),'cast_01':(952,1035)}),
      **_clip_row(708, 818, {'trans_01':(412,504),'trans_02':(504,593),'trans_03':(593,740),'bloom_01':(740,860),'bloom_02':(1030,1117)}),
      **_clip_row(884, 1014, {'open_01':(405,509),'open_02':(509,612),'open_03':(612,705),'final_01':(705,850),
                              'weak_01':(1111,1234),'death_01':(1234,1391),'death_02':(1391,1530)})},
    'sets': {'idle':['idle_01','idle_02','idle_03','idle_02'], 'walk':['idle_01','idle_02','idle_03','idle_02'],
             'atk':['atk_01','atk_02','atk_03'], 'cast':['cast_01','idle_02'],
             'trans':['trans_01','trans_02','trans_03'], 'bloom':['trans_03','bloom_01','bloom_02','bloom_01'],
             'open':['open_01','open_02','open_03'], 'heart':['open_02','open_03','open_02','open_01'], 'final':['final_01','open_03'],
             'hit':['idle_02'], 'weak':['weak_01'], 'death':['weak_01','death_01','death_02']}},
}
# umbral propio donde el resplandor de una nube llena la caja (el fondo queda iluminado)
BOSS_AMIN = {'bloom_01': 160, 'bloom_02': 120}
# FX sueltos (sin anclar a pies). (hoja, caja, modo)   modo 'grp' = grupo de componentes más parecido a la caja
E, B = 'enemies', 'bosses'
FX = {
  'spore_cloud_big': (E, (1297,1418,34,130), 'clip'), 'spore_cloud_small': (E, (1418,1527,30,136), 'clip'),
  'claw_blue_a': (E, (1217,1267,198,271), 'clip'), 'claw_blue_b': (E, (1259,1318,189,276), 'clip'),
  'spore_pile': (E, (1321,1412,186,278), 'clip'), 'spore_geyser': (E, (1397,1496,178,279), 'clip'), 'spore_puff': (E, (1479,1516,178,286), 'clip'),
  'boom_big': (E, (1257,1346,348,444), 'clip'), 'boom_med': (E, (1350,1461,330,444), 'clip'), 'boom_small': (E, (1440,1519,330,446), 'clip'),
  'green_proj_a': (E, (721,900,480,528), 'clip'), 'green_proj_b': (E, (728,906,531,580), 'clip'),
  'green_orb': (E, (1239,1286,535,594), 'clip'), 'green_orb_trail': (E, (1292,1367,528,590), 'clip'),
  'root_curl': (E, (1343,1418,511,604), 'clip'), 'root_spike_a': (E, (1424,1465,498,605), 'clip'),
  'root_spike_b': (E, (1452,1489,501,605), 'clip'), 'root_spike_c': (E, (1493,1518,498,608), 'clip'),
  'bite_slash': (E, (666,705,667,725), 'clip'), 'leap_splat': (E, (872,944,718,743), 'clip'),
  'slash_red_thin': (E, (1244,1284,685,746), 'clip'), 'slash_red_triple': (E, (1261,1372,668,747), 'clip'),
  'burst_red': (E, (1372,1510,649,755), 'clip'),
  'mush_row_small': (E, (564,703,791,878), 'clip'), 'mush_row_big': (E, (563,705,887,975), 'clip'),
  'aura_cluster': (E, (1252,1470,818,975), 'clip'), 'spore_pillar': (E, (1471,1526,806,980), 'clip'),
  # subjefe
  'root_line': (B, (1331,1526,149,234), 'clip'),
  'spore_rain_a': (B, (486,559,266,300), 'clip'), 'spore_rain_b': (B, (560,676,266,310), 'clip'), 'spore_rain_c': (B, (666,739,266,314), 'clip'),
  'spore_hit_a': (B, (487,545,310,354), 'clip'), 'spore_hit_b': (B, (548,614,316,354), 'clip'), 'spore_hit_c': (B, (615,682,318,354), 'clip'),
  'spore_hit_d': (B, (679,796,284,354), 'clip'),
  # Germinación (invoca núcleos): racimo grande · racimo chico · brote fino · tallo alto luminoso
  'nucleo_1': (B, (994,1101,263,354), 'clip'), 'nucleo_2': (B, (1101,1151,263,354), 'clip'),
  'nucleo_3': (B, (1151,1181,263,354), 'clip'), 'nucleo_4': (B, (1181,1234,263,354), 'clip'),
  # jefe
  'm_proj': (B, (1073,1197,546,586), 'clip'), 'm_impact_a': (B, (1037,1093,578,644), 'clip'), 'm_impact_b': (B, (1093,1149,578,644), 'clip'),
  'm_impact_c': (B, (1149,1193,578,644), 'clip'), 'm_summon_a': (B, (1193,1310,546,644), 'clip'), 'm_summon_b': (B, (1310,1378,546,644), 'clip'),
  'm_summon_c': (B, (1378,1442,546,644), 'clip'), 'm_summon_d': (B, (1442,1528,546,644), 'clip'),
  'm_cloud_a': (B, (860,1030,708,818), 'clip'), 'm_cloud_b': (B, (1200,1291,708,818), 'clip'), 'm_halluc_row': (B, (1291,1526,720,818), 'clip'),
  'm_laser': (B, (760,1000,925,1014), 'clip'), 'm_root_spikes': (B, (848,1000,880,955), 'clip'),
  'm_pillar_a': (B, (1000,1043,880,1014), 'clip'), 'm_pillar_b': (B, (1043,1111,880,1014), 'clip'),
}
# Retrato grande de la Madre Espora -> partes para sus apariciones parciales (niveles 7-9) y la revelación.
# (x0,x1,y0,y1) sobre bosses.png; el texto "NIVEL 10" (y < 560) queda afuera.
PORTRAIT = {'mp_full': (5,400,560,1015), 'mp_cap': (8,400,560,720), 'mp_body': (110,300,600,900),
            'mp_arm_l': (5,195,690,925), 'mp_arm_r': (265,400,690,925), 'mp_roots': (5,400,860,1015)}

def portrait_part(bs, mx, box):
    x0, x1, y0, y1 = box
    rgb = bs[y0:y1, x0:x1, :3]
    m = mx[y0:y1, x0:x1].astype(np.float32)
    al = np.clip((m - 16) / 50.0, 0, 1)            # fondo casi negro -> transparente; brillos -> semitransparentes
    h, w = al.shape
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([xx, w - 1 - xx, yy, h - 1 - yy]).astype(np.float32)
    al *= np.clip(edge / 18.0, 0, 1)                # sin bordes rectos: se funde con el escenario
    out = np.zeros((h, w, 4), np.uint8); out[..., :3] = rgb; out[..., 3] = (al * 255).astype(np.uint8)
    return out

def wither(rgba, k):
    """Variante MARCHITA/MUERTA de un hongo (derivada del original, sin inventar forma): desatura hacia
    gris-marrón y oscurece. k=0.6 marchito, k=1 muerto."""
    a = rgba.astype(np.float32)
    lum = a[..., 0]*0.3 + a[..., 1]*0.59 + a[..., 2]*0.11
    grey = np.stack([lum*0.78 + 22, lum*0.72 + 18, lum*0.66 + 16], -1)
    rgb = a[..., :3]*(1-k) + grey*k
    rgb *= (1 - 0.35*k)
    out = rgba.copy(); out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[..., 3] = (a[..., 3] * (1 - 0.15*k)).astype(np.uint8)
    return out

def main():
    en = load_enemies(); bs, bmx = load_bosses()
    meta = {}
    # ---- enemigos ----
    for key, spec in ROWS.items():
        cache = {}
        frames = {}
        for name, box in spec['frames'].items():
            if len(box) > 4 and box[4] == 'clip':
                mask = clip_mask(en[..., 3], box[:4])
            else:
                band = spec.get('band_override', {}).get(name, spec['band'])
                if band not in cache: cache[band] = band_groups(en[..., 3], band)
                best = max(cache[band], key=lambda g: iou(g[0], box[:4]))
                if iou(best[0], box[:4]) < 0.5: print('  aviso', key, name, 'IoU bajo', round(iou(best[0], box[:4]), 2), best[0])
                mask = best[1]
            frames[name] = to_rgba(en, mask)
        meta[key] = build_atlas(frames, spec['sets'], os.path.join(OUT, key, 'atlas.png'), spec['ref'], spec.get('anchor', 0.94))
    # ---- subjefe y jefe ----
    for key, spec in BOSSES.items():
        frames = {n: to_rgba(bs, clip_mask(bs[..., 3], b[:4], BOSS_AMIN.get(n, 60)), solid_mx=bmx) for n, b in spec['frames'].items()}
        meta[key] = build_atlas(frames, spec['sets'], os.path.join(OUT, key, 'atlas.png'), spec['ref'], spec.get('anchor', 0.94))
    # ---- FX ----
    fxmeta = {}
    for name, (s, box, mode) in FX.items():
        src = en if s == E else bs
        rgba = to_rgba(src, clip_mask(src[..., 3], box), solid_mx=(bmx if s == B else None))
        p = os.path.join(OUT, 'fx', name + '.png'); os.makedirs(os.path.dirname(p), exist_ok=True)
        Image.fromarray(rgba, 'RGBA').save(p, optimize=True)
        fxmeta[name] = [rgba.shape[1], rgba.shape[0]]
    # ---- hongos del escenario: variantes marchita / muerta (FUNGAL_NODE) ----
    for name in ('nucleo_1','nucleo_2','nucleo_3','nucleo_4','mush_row_small','mush_row_big','spore_pillar','m_summon_b','m_summon_c'):
        src = np.array(Image.open(os.path.join(OUT, 'fx', name + '.png')))
        for suf, k in (('wither', 0.6), ('dead', 1.0)):
            Image.fromarray(wither(src, k), 'RGBA').save(os.path.join(OUT, 'fx', name + '_' + suf + '.png'), optimize=True)
            fxmeta[name + '_' + suf] = fxmeta[name]
    # ---- partes del retrato de la Madre ----
    for name, box in PORTRAIT.items():
        rgba = portrait_part(bs, bmx, box)
        p = os.path.join(OUT, 'mother', name + '.png'); os.makedirs(os.path.dirname(p), exist_ok=True)
        Image.fromarray(rgba, 'RGBA').save(p, optimize=True)
        fxmeta[name] = [rgba.shape[1], rgba.shape[0]]
    # ---- mapas (JPEG: 1536x1024, livianos) ----
    os.makedirs(os.path.join(OUT, 'map'), exist_ok=True)
    for n in ('map_initial', 'map_mature'):
        Image.open(os.path.join(SRC, n + '.png')).convert('RGB').save(os.path.join(OUT, 'map', n + '.jpg'), quality=86, optimize=True, progressive=True)
    json.dump({'atlas': meta, 'fx': fxmeta}, open(os.path.join(OUT, 'meta.json'), 'w'), separators=(',', ':'))
    for k, m in meta.items(): print(k, json.dumps(m, separators=(',', ':')))
    print('fx', json.dumps(fxmeta, separators=(',', ':')))

if __name__ == '__main__':
    main()
