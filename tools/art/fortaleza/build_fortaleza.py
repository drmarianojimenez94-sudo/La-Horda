#!/usr/bin/env python3
"""Arena III — La Fortaleza Sin Fin: hojas oficiales -> cuadros limpios -> atlas por entidad + FX sueltos.

  python3 tools/art/fortaleza/build_fortaleza.py        # reconstruye todo e imprime la metadata JS

Fuente: art-source/fortaleza/{bosses,enemies}.png (tal cual las mandó el usuario, 1536x1024).
- Fondo: damero claro rasterizado -> fondo = píxel claro y poco saturado conectado al borde (segment.bg_mask),
  más una limpieza del borde blanco que deja la compresión. Nunca se agregan píxeles: solo se quitan.
- Cuadros: por componentes conexas (los cuadros de estas hojas se superponen en caja pero casi nunca se tocan).
  Donde sí se tocan (aliento de fuego, espadazo, Ejecución, transición) se recorta con una caja ('clip').
- Atlas: pies sobre una línea común y el eje X anclado en el centro de masa de los pies (no en el centro de la
  caja): así un cuadro con un tajo o una cadena que sale hacia un lado no hace "saltar" al personaje.
Cuadros que la hoja NO trae se reutilizan (ver docs/ARENA_FORTALEZA.md), nunca se inventan.
"""
import json, os, sys, math
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
from segment import bg_mask

SRC = os.path.join(ROOT, 'art-source', 'fortaleza')
OUT = os.path.join(ROOT, 'assets', 'sprites', 'arenas', 'fortaleza')

def clean_fg(a):
    bg, l, sd = bg_mask(a)
    fg = ~bg
    fg[:3, :] = fg[-3:, :] = False; fg[:, :3] = fg[:, -3:] = False
    # borde blanco de compresión: claro y poco saturado pegado al fondo
    for _ in range(2):
        edge = fg & ndimage.binary_dilation(~fg, structure=[[0,1,0],[1,1,1],[0,1,0]])
        fg &= ~(edge & (l > 172) & (sd < 34))
    lbl, n = ndimage.label(fg, structure=np.ones((3, 3)))
    sizes = ndimage.sum(fg, lbl, range(1, n + 1))
    small = np.isin(lbl, np.where(sizes < 8)[0] + 1)
    fg &= ~small
    lbl, n = ndimage.label(fg, structure=np.ones((3, 3)))
    return fg, lbl, n

def extract(a, fg, lbl, n, box, mode='comp'):
    x0, x1, y0, y1 = box
    if mode == 'clip':
        m = np.zeros_like(fg); m[y0:y1, x0:x1] = fg[y0:y1, x0:x1]
        # restos de cuadros vecinos que el recorte dejó sueltos contra el borde de la caja
        ll, k = ndimage.label(m, structure=np.ones((3, 3)))
        if k:
            sz = ndimage.sum(m, ll, range(1, k + 1)); big = sz.max()
            for i, sl in enumerate(ndimage.find_objects(ll), 1):
                touches = sl[1].start <= x0 + 1 or sl[1].stop >= x1 - 1
                if touches and sz[i-1] < big*0.04: m[ll == i] = False
    else:
        sub = lbl[y0:y1, x0:x1]
        ids = [i for i in np.unique(sub) if i]
        keep = []
        for i in ids:
            ys, xs = np.where(lbl == i)
            cy, cx = ys.mean(), xs.mean()
            if x0 <= cx < x1 and y0 <= cy < y1: keep.append(i)
        m = np.isin(lbl, keep)
    ys, xs = np.where(m)
    X0, X1, Y0, Y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.zeros((Y1 - Y0, X1 - X0, 4), np.uint8)
    rgba[..., :3] = a[Y0:Y1, X0:X1, :3]
    rgba[..., 3] = np.where(m[Y0:Y1, X0:X1], 255, 0)
    return rgba

def feet_info(rgba):
    op = rgba[..., 3] > 0
    ys, xs = np.where(op)
    top, bot = ys.min(), ys.max()
    rows = np.where(op.sum(1) >= 3)[0]
    feet = rows.max() if len(rows) else bot
    band = op[max(top, feet - max(6, (feet - top)//5)):feet + 1]
    bx = np.where(band.any(0))[0]
    cx = float(np.median(np.where(band)[1])) if band.any() else op.shape[1]/2
    return top, bot, feet, cx, xs.min(), xs.max()

def build_atlas(frames, sets, out_png, ref, anchor=0.94, xfix=None, pad=2):
    """frames: name->rgba. sets: set->[names]. xfix: name->dx (corrección manual del eje, px de la hoja)."""
    xfix = xfix or {}
    names = sorted({n for v in sets.values() for n in v})
    inf = {}
    for n in names:
        top, bot, feet, cx, l, r = feet_info(frames[n]); cx += xfix.get(n, 0)
        inf[n] = dict(top=top, bot=bot, feet=feet, cx=cx, l=l, r=r)
    up = max(i['feet'] - i['top'] for i in inf.values()) + pad
    down = max(i['bot'] - i['feet'] for i in inf.values()) + pad
    half = max(max(i['cx'] - i['l'], i['r'] + 1 - i['cx']) for i in inf.values()) + pad
    W = int(math.ceil(half * 2)); H = max(int(math.ceil(up / anchor)), up + down + 1)
    base = int(round(H * anchor))
    if H - base < down: H = base + down + 1
    cols = min(8, len(names)); rows = math.ceil(len(names) / cols)
    atlas = Image.new('RGBA', (cols * W, rows * H), (0, 0, 0, 0))
    idx = {}
    for k, n in enumerate(names):
        i = inf[n]; im = Image.fromarray(frames[n], 'RGBA')
        ox = int(round(W / 2 - i['cx'])); oy = base - i['feet']
        cell = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cell.paste(im, (ox, oy), im)
        atlas.alpha_composite(cell, ((k % cols) * W, (k // cols) * H)); idx[n] = k
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    atlas.save(out_png, optimize=True)
    r = inf[ref]
    return {'w': W, 'h': H, 'cols': cols, 'refH': int(r['feet'] - r['top'] + 1), 'anchor': round(base / H, 4),
            'sets': {s: [idx[n] for n in v] for s, v in sets.items()}}

# ---------------- ESPECIFICACIÓN (cajas x0,x1,y0,y1 sobre la hoja de 1536x1024) ----------------
E = 'enemies'; B = 'bosses'
ENEMIES = {
  'carcelero': {'sheet': E, 'ref': 'walk_01', 'frames': {
      'idle_01': (15,105,38,132), 'idle_02': (119,197,40,134),
      'walk_01': (203,275,38,132), 'walk_02': (285,351,38,132), 'walk_03': (356,436,38,131),
      'atk_01': (444,551,38,133), 'atk_02': (527,723,38,131),
      'chain_01': (721,852,38,133), 'chain_02': (996,1081,50,132),
      'hit_01': (1093,1185,43,133), 'hit_02': (1184,1265,38,133), 'hit_03': (1272,1348,46,133),
      'death_01': (1355,1520,61,135)},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','walk_02','walk_03','walk_02'], 'atk':['atk_01','atk_02'],
             'chain':['chain_01','chain_02'], 'hit':['hit_01','hit_02'], 'death':['hit_03','death_01']}},
  'dragon_bronce': {'sheet': E, 'ref': 'fly_01', 'anchor': 0.80, 'frames': {
      'idle_01': (15,122,176,290), 'idle_02': (126,231,176,290),
      'fly_01': (230,370,176,290), 'fly_02': (376,479,176,290),
      'bite_01': (545,629,176,290), 'bite_02': (620,715,176,290),
      'breath_01': (910,977,176,290), 'breath_02': (980,1093,176,290),
      'hit_01': (1080,1182,176,290), 'hit_02': (1191,1296,176,290), 'hit_03': (1295,1383,176,290),
      'death_01': (1392,1522,176,290)},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['fly_01','idle_01','fly_02','idle_02'], 'atk':['bite_01','bite_02'],
             'breath':['breath_01','breath_02'], 'hit':['hit_01','hit_02'], 'death':['hit_03','death_01']}},
  'automata': {'sheet': E, 'ref': 'walk_01', 'frames': {
      'idle_01': (12,115,330,458), 'idle_02': (120,199,330,458),
      'walk_01': (206,278,330,458), 'walk_02': (287,343,330,458), 'walk_03': (348,419,330,458), 'walk_04': (426,506,330,458),
      'atk_01': (513,624,330,458), 'atk_02': (628,717,330,458), 'atk_03': (714,812,330,458),
      'charge_01': (838,1120,330,458, 'comp', 'flip'),   # en la hoja embiste hacia la izquierda
      'hit_01': (1136,1232,330,458), 'hit_02': (1233,1308,330,458), 'hit_03': (1310,1377,330,458),
      'death_01': (1375,1522,330,458)},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','walk_02','walk_03','walk_04'], 'atk':['atk_01','atk_02','atk_03'],
             'charge':['charge_01'], 'hit':['hit_01','hit_02'], 'death':['hit_03','death_01']}},
  'prisionero': {'sheet': E, 'ref': 'walk_01', 'frames': {
      'idle_01': (10,154,509,625), 'idle_02': (158,270,509,625),
      'walk_01': (275,369,505,625), 'walk_02': (369,464,505,625), 'walk_03': (471,589,505,625),
      'claw_01': (576,760,505,625), 'claw_02': (765,862,494,625),
      'rip_01': (860,955,494,625), 'rip_02': (954,1083,505,625),
      'hit_01': (1078,1173,505,625), 'hit_02': (1174,1262,505,625),
      'death_01': (1265,1395,505,625)},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','walk_02','walk_03'], 'atk':['claw_01','claw_02'],
             'rip':['rip_01','rip_02'], 'hit':['hit_01','hit_02'], 'death':['hit_02','death_01']}},
  'engendro': {'sheet': E, 'ref': 'walk_01', 'frames': {
      'walk_01': (1368,1446,540,625), 'walk_02': (1447,1531,540,625)},
    'sets': {'idle':['walk_01'], 'walk':['walk_01','walk_02'], 'atk':['walk_02','walk_01'], 'hit':['walk_02'], 'death':['walk_02']}},
  'verdugo': {'sheet': E, 'ref': 'walk_01', 'frames': {
      'idle_01': (16,123,685,828), 'idle_02': (120,212,685,828),
      'walk_01': (209,297,685,828), 'walk_02': (304,392,685,828), 'walk_03': (399,538,685,828),
      'axe_01': (543,650,685,828, 'clip'), 'axe_02': (650,746,685,828, 'clip'),
      'steam_01': (768,897,685,828), 'steam_02': (918,1122,685,828),
      'hit_01': (1122,1250,685,828), 'hit_02': (1241,1331,685,828),
      'death_01': (1320,1517,700,828)},
    # axe_02 de la hoja es la víctima + el arco del golpe (no el verdugo): el golpe usa el hachazo hacia adelante (walk_03)
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','walk_02','idle_02','walk_02'], 'atk':['axe_01','walk_03'],
             'steam':['steam_01','steam_02'], 'hit':['hit_01','hit_02'], 'death':['hit_02','death_01']}},
  'arana': {'sheet': E, 'ref': 'walk_01', 'frames': {
      'idle_01': (17,128,875,985), 'idle_02': (139,228,875,985),
      'walk_01': (236,333,875,985), 'walk_02': (338,449,875,985), 'walk_03': (453,563,875,985),
      'shoot_01': (573,682,875,985), 'shoot_02': (677,732,875,985), 'net_01': (1051,1186,875,985),
      'hit_01': (1196,1293,875,985), 'hit_02': (1297,1379,875,985),
      'death_01': (1375,1522,870,985)},
    'sets': {'idle':['idle_01','idle_02'], 'walk':['walk_01','walk_02','walk_03','walk_02'], 'atk':['shoot_01','idle_01'],
             'net':['net_01'], 'hit':['hit_01','hit_02'], 'death':['hit_02','death_01']}},
}
BOSSES = {
  'dragon_forja': {'sheet': B, 'ref': 'walk_01', 'anchor': 0.92, 'frames': {
      'idle_01': (428,592,22,140), 'idle_02': (590,718,22,140), 'idle_03': (710,805,22,140),
      'walk_01': (796,921,22,140), 'walk_02': (911,1020,22,140), 'walk_03': (1019,1105,22,140), 'walk_04': (1091,1187,22,140),
      'fly_01': (1178,1286,22,140), 'fly_02': (1277,1370,22,140), 'fly_03': (1363,1444,22,140), 'fly_04': (1442,1532,22,140),
      'bite_01': (488,609,158,262), 'bite_02': (599,688,158,262), 'bite_03': (655,753,158,262), 'bite_04': (744,840,158,262), 'bite_05': (826,911,158,262),
      'breath_01': (910,1029,158,262), 'breath_02': (1028,1112,158,262, 'clip'),
      'bomb_01': (529,609,278,398), 'bomb_02': (592,699,278,398), 'bomb_03': (693,769,278,346), 'bomb_04': (758,851,278,398),
      'flap_01': (1084,1243,278,398), 'flap_02': (1236,1387,278,398), 'flap_03': (1384,1528,278,398),
      'hit_01': (262,376,410,508), 'hit_02': (371,455,410,508), 'hit_03': (441,547,410,508),
      'death_01': (548,657,410,508), 'death_02': (649,751,410,508), 'death_03': (749,993,410,508), 'death_04': (991,1156,410,508)},
    'sets': {'idle':['idle_01','idle_02','idle_03','idle_02'], 'walk':['walk_01','walk_02','walk_03','walk_04'],
             'fly':['fly_01','fly_02','fly_03','fly_04'], 'atk':['bite_01','bite_02','bite_03','bite_04','bite_05'],
             'breath':['breath_01','breath_02'], 'bomb':['bomb_01','bomb_02','bomb_03','bomb_04'], 'flap':['flap_01','flap_02','flap_03'],
             'hit':['hit_01','hit_02','hit_03'], 'death':['death_01','death_02','death_03','death_04']}},
  'caballero': {'sheet': B, 'ref': 'walk_01', 'frames': {
      'idle_01': (354,445,578,660), 'idle_02': (448,516,578,660), 'idle_03': (519,582,578,660), 'idle_04': (584,653,578,660), 'idle_05': (658,725,578,660),
      'walk_01': (732,827,578,660), 'walk_02': (833,908,578,660), 'walk_03': (911,985,578,660), 'walk_04': (989,1047,578,660), 'walk_05': (1054,1121,578,660), 'walk_06': (1128,1170,578,660),
      'turn_01': (1197,1246,578,660), 'turn_02': (1263,1330,578,660), 'turn_03': (1337,1414,578,660), 'turn_04': (1419,1499,578,660),
      'sword_01': (355,450,683,768), 'sword_02': (444,545,683,768, 'clip'), 'sword_03': (545,612,683,768, 'clip'), 'sword_04': (611,752,683,768, 'clip'), 'sword_05': (754,832,683,768),
      'shield_01': (830,909,683,768), 'shield_02': (911,1028,683,768), 'shield_03': (1034,1112,683,768), 'shield_04': (1106,1185,683,768),
      'charge_01': (1203,1368,683,768), 'charge_02': (1365,1521,683,768),
      'sweep_01': (351,445,778,880), 'sweep_02': (447,578,778,880), 'sweep_03': (562,653,778,880), 'sweep_04': (658,785,778,880), 'sweep_05': (771,914,778,880),
      'exec_01': (914,1000,787,880, 'clip'), 'exec_02': (1000,1108,787,880, 'clip'), 'exec_03': (1108,1188,787,880, 'clip'), 'exec_04': (1188,1259,787,880, 'clip'),
      'plant_01': (320,417,903,1012),
      'hit_01': (741,815,906,1012, 'clip'), 'hit_02': (815,886,906,1012, 'clip'),
      'rage_01': (885,957,903,1012), 'rage_02': (954,1018,903,1012),
      'tf_01': (1026,1122,906,1012, 'clip'), 'tf_02': (1122,1223,906,1012, 'clip'), 'tf_03': (1218,1327,903,1012),
      'death_01': (1328,1519,903,1012)},
    'sets': {'idle':['idle_01','idle_02','idle_03','idle_04','idle_05'], 'walk':['walk_01','walk_02','walk_03','walk_04','walk_05','walk_06'],
             'turn':['turn_01','turn_02','turn_03','turn_04'], 'atk':['sword_01','sword_02','sword_03','sword_04','sword_05'],
             'shield':['shield_01','shield_02','shield_03','shield_04'], 'charge':['charge_01','charge_02'],
             'sweep':['sweep_01','sweep_02','sweep_03','sweep_04','sweep_05'], 'exec':['exec_01','exec_02','exec_03','exec_04'],
             'plant':['plant_01'], 'hit':['hit_01','hit_02'], 'rage':['rage_01','rage_02'], 'tf':['tf_01','tf_02','tf_03'],
             'death':['hit_02','death_01']}},
}
# Efectos sueltos (sin anclar a pies): cajas + modo
FX = {
  'chain_throw': (E, (849,1008,38,124)),            # maza y cadena del Carcelero en vuelo
  'steam_puff_a': (E, (892,931,240,282)), 'steam_puff_b': (E, (966,1004,245,282)),
  'charge_steam': (E, (838,1120,330,458)),          # embestida del Autómata (con su nube de vapor)
  'claw_slash': (E, (696,756,515,605)),
  'verdugo_steam_a': (E, (893,935,720,790)), 'verdugo_steam_b': (E, (900,935,780,818)),
  'spider_bolt': (E, (768,812,920,945)),
  'chain_net': (E, (838,1044,875,985)),
  'bomb_big': (B, (1170,1195,420,462)), 'bomb_med': (B, (1206,1242,428,458)),
  'fireball': (B, (1289,1344,425,461)), 'fire_burst': (B, (1359,1402,410,462)), 'smoke': (B, (1415,1481,422,461)),
  'fire_ring': (B, (1169,1234,468,502)), 'explosion': (B, (1244,1298,462,507)), 'spark': (B, (1307,1345,466,506)),
  'explosion_b': (B, (1356,1406,464,508)), 'fire_trail': (B, (1413,1467,468,506)), 'rubble': (B, (1477,1521,468,507)),
  'bomb_blast': (B, (941,1061,340,398, 'clip')),   # explosión de bombardeo (sin el dragón)
  'forge_breath': (B, (1420,1522,300,398, 'clip')), # (reserva)
  'exec_wave': (B, (1250,1402,778,880)),            # ola de la Ejecución Oxidada
  'exec_ground': (B, (1402,1522,778,880)),          # erupción del golpe
  'chain_ring': (B, (416,601,903,1012)),            # fase 2: cadenas en círculo
  'chain_spikes': (B, (587,722,903,1012)),          # fase 2: trampas/púas
}

def main():
    sheets = {}
    for s in (E, B):
        a = np.array(Image.open(os.path.join(SRC, s + '.png')).convert('RGB')).astype(np.int32)
        sheets[s] = (a,) + clean_fg(a)
    meta = {}
    for group in (ENEMIES, BOSSES):
        for key, spec in group.items():
            a, fg, lbl, n = sheets[spec['sheet']]
            frames = {}
            for name, box in spec['frames'].items():
                mode = box[4] if len(box) > 4 else 'comp'
                fr = extract(a, fg, lbl, n, box[:4], mode)
                if len(box) > 5 and box[5] == 'flip': fr = fr[:, ::-1].copy()
                frames[name] = fr
            out = os.path.join(OUT, key, 'atlas.png')
            meta[key] = build_atlas(frames, spec['sets'], out, spec['ref'], spec.get('anchor', 0.94))
    fxmeta = {}
    for name, (s, box) in FX.items():
        a, fg, lbl, n = sheets[s]
        mode = box[4] if len(box) > 4 else 'comp'
        rgba = extract(a, fg, lbl, n, box[:4], mode)
        p = os.path.join(OUT, 'fx', name + '.png'); os.makedirs(os.path.dirname(p), exist_ok=True)
        Image.fromarray(rgba, 'RGBA').save(p, optimize=True)
        fxmeta[name] = [rgba.shape[1], rgba.shape[0]]
    json.dump({'atlas': meta, 'fx': fxmeta}, open(os.path.join(OUT, 'meta.json'), 'w'), separators=(',', ':'))
    for k, m in meta.items(): print(k, json.dumps(m, separators=(',', ':')))

if __name__ == '__main__':
    main()
