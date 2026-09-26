"""Guardián Élfico Ancestral (art-source/guardian_elfico/): jefe del Bosque -> "Guardián Ancestral
Corrompido". Recorte por celdas (máscara u2net por cuadro + brillo para golpes/partículas, mismo
motor que tools/art/hielo_jefes/extract.py) y atlas en el formato de BOSS_SHEET_ATLAS.

La hoja vino en RGBA con el fondo del panel semitransparente (no es un recorte): se aplanó a RGB
(guardian_elfico_ancestral.png; el original queda como *_original_rgba.png).
Cada panel se corta en celdas parejas según los cuadros que DIBUJA (el título a veces dice más).
La FASE 2 (FURIA) de la propia hoja es el mismo diseño con la paleta verde pasada a rojo: el atlas
"guardian_ancestral_furia" se genera así, con los mismos cuadros (no se inventan poses).
Escribe js/assets/guardian-sheet-meta.js (se suma a BOSS_SHEET_ATLAS / BOSS_SHEET_FX).
usage: python3 build.py <frames_dir>
"""
import json, os, sys, colorsys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'hielo_jefes'))
import extract as X
from build import pack, REPO
X.ROOT = os.path.join(REPO, 'art-source', 'guardian_elfico')
SH = 'guardian_elfico_ancestral'

# sección -> (rect del contenido x0,y0,x1,y1, celdas, tipo) ; 'fig' cuerpo nítido, 'fig0' cuerpo +
# lo que brilla (tajos, partículas), 'fx' efecto con alfa de brillo
SPEC = {
    'idle':      ((414, 306, 810, 408), 4, 'fig'),
    'w_down':    ((826, 322, 998, 408), 3, 'fig'),
    'w_left':    ((1000, 322, 1172, 408), 3, 'fig'),
    'w_right':   ((1174, 322, 1348, 408), 3, 'fig'),
    'w_up':      ((1352, 322, 1522, 408), 3, 'fig'),
    'atk':       ((14, 448, 518, 540), 5, 'fig0'),
    'heavy':     ((530, 448, 1062, 540), 6, 'fig0'),
    'roots':     ((1075, 448, 1522, 540), 6, 'fig0'),
    'lance':     ((14, 580, 140, 665), 2, 'fig0'),
    'thorns':    ((510, 580, 968, 665), 6, 'fig0'),
    'leafrain':  ((981, 580, 1522, 665), 7, 'fx'),
    'walls':     ((14, 705, 418, 826), 7, 'fig'),
    'corrupt':   ((431, 705, 898, 826), 6, 'fig0'),
    'transf':    ((910, 705, 1522, 826), 6, 'fig0'),
    'death':     ((14, 866, 600, 986), 7, 'fig0'),
    'fx_impacto':   ((612, 886, 708, 984), 1, 'fx'),
    'fx_hojas':     ((710, 886, 804, 984), 1, 'fx'),
    'fx_raices':    ((806, 886, 900, 984), 1, 'fig0'),
    'fx_espinas':   ((902, 886, 1000, 984), 1, 'fx'),
    'fx_aura':      ((1002, 886, 1112, 984), 1, 'fx'),
    'fx_proyectil': ((1114, 886, 1208, 984), 1, 'fx'),
    'fx_explosion': ((1210, 886, 1318, 984), 1, 'fx'),
    'fx_brillo':    ((1320, 886, 1420, 984), 1, 'fx'),
    'fx_particulas': ((1422, 886, 1522, 984), 1, 'fx'),
}
R = lambda sec, a, b: [(sec, i) for i in range(a, b)]
SETS = {
    'idle': R('idle', 0, 4), 'walk': R('w_right', 0, 3), 'walk_down': R('w_down', 0, 3), 'walk_up': R('w_up', 0, 3),
    'atk': R('atk', 0, 5), 'hit': R('idle', 1, 2), 'death': R('death', 0, 7),
    'heavy': R('heavy', 0, 3), 'roots': R('roots', 0, 6), 'lance': R('lance', 0, 2), 'cast': R('roots', 0, 3),
    'transf': R('transf', 0, 6),
}
FX = {   # clave vfxSprite -> (secciones y rango de cuadros, ¿de suelo?)
    'gdSpikes':    (R('heavy', 3, 6), True),
    'gdThorns':    (R('thorns', 0, 6), True),
    'gdLeafRain':  (R('leafrain', 0, 7), False),
    'gdTreeWall':  (R('walls', 0, 4), False),
    'gdCorrupt':   (R('corrupt', 0, 6), True),
    'gdImpact':    (R('fx_impacto', 0, 1), False),
    'gdLeaves':    (R('fx_hojas', 0, 1), False),
    'gdRoots':     (R('fx_raices', 0, 1), True),
    'gdSpikeFx':   (R('fx_espinas', 0, 1), True),
    'gdAura':      (R('fx_aura', 0, 1), True),
    'gdLance':     (R('fx_proyectil', 0, 1), False),
    'gdBurst':     (R('fx_explosion', 0, 1), False),
    'gdSpark':     (R('fx_brillo', 0, 1), False),
    'gdMotes':     (R('fx_particulas', 0, 1), False),
}
U2 = {'idle': 'u2', 'w_down': 'u2', 'w_right': 'u2', 'w_up': 'u2', 'w_left': 'u2'}   # donde u2net recorta bien
DEST = 'assets/sprites/bosses/bosque/guardian_ancestral'
FXDEST = 'assets/vfx/bosses/bosque'

DIST_T = 70
def cells(rgb, glow, score, rect, n, typ, method='u2', inset=3):
    x0, y0, x1, y1 = rect; w = (x1 - x0) / n; out = []
    for i in range(n):
        cx0, cx1 = int(x0 + i * w) + inset, int(x0 + (i + 1) * w) - inset
        g = np.zeros(rgb.shape[:2]); g[y0:y1, cx0:cx1] = glow[y0:y1, cx0:cx1]
        if typ == 'fx':
            full = g > 0.06; alpha = np.clip(g * 1.4, 0, 1)
        elif method == 'dist':   # ramas finas sobre el fondo oscuro: distancia al fondo local (u2net las pierde)
            sc = np.zeros(rgb.shape[:2]); sc[y0:y1, cx0:cx1] = score[y0:y1, cx0:cx1]
            full = X.drop_lines(ndimage.binary_opening(sc > DIST_T, np.ones((2, 2), bool)))
            full = ndimage.binary_closing(full, X.N8, iterations=1)
            # huecos: se rellenan solo los chicos (túnica oscura); el interior de un tajo en arco es fondo
            holes = ndimage.binary_fill_holes(full) & ~full
            hl, hk = ndimage.label(holes)
            if hk:
                hs = ndimage.sum(holes, hl, range(1, hk + 1))
                full = full | np.isin(hl, [j + 1 for j in range(hk) if hs[j] <= 260])
            alpha = full.astype(float)
            if typ == 'fig0':
                alpha = np.maximum(alpha, (g > 0.3) * g); full = full | (g > 0.3)
        else:
            mk, (X0, Y0, X1, Y1) = X.u2net_mask(rgb, (cx0, y0, cx1, y1), pad=0)
            full = np.zeros(rgb.shape[:2], bool); full[Y0:Y1, X0:X1] = mk
            alpha = full.astype(float)
            if typ == 'fig0':
                alpha = np.maximum(alpha, (g > 0.3) * g); full = full | (g > 0.3)
        cell = np.zeros(rgb.shape[:2], bool); cell[y0:y1, cx0:cx1] = True; full &= cell
        lb, k = ndimage.label(full, X.N8)
        if k > 1:   # fuera motas y pedazos del cuadro vecino (tocan el borde de la celda y son chicos)
            sizes = ndimage.sum(full, lb, range(1, k + 1)); big = sizes.max(); objs = ndimage.find_objects(lb)
            keep = [j + 1 for j in range(k) if sizes[j] >= max(6, big * 0.01)
                    and not ((objs[j][1].start <= cx0 + 1 or objs[j][1].stop >= cx1 - 1) and sizes[j] < big * 0.25)]
            full = np.isin(lb, keep)
        res = X.crop(rgb, alpha, full)
        if res: out.append(res[0])
    return out

def furia(im):
    """Paleta de la FASE 2 de la hoja: los verdes (hojas, brillo) pasan a rojo sangre."""
    a = np.array(im).astype(float) / 255.0; rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6.0
    s = d / (mx + 1e-6)
    green = (h > 0.19) & (h < 0.52) & (s > 0.15)
    nh = np.where(green, 0.99, h)
    # la hoja de verde oscuro pasa a rojo vivo (como la variante FASE 2 de la hoja), no a bordó apagado
    s = np.where(green, np.maximum(s, 0.72), s)
    v = np.where(green, np.minimum(1.0, mx * 1.55 + 0.10), mx)
    # hsv -> rgb
    i = np.floor(nh * 6).astype(int) % 6; f = nh * 6 - np.floor(nh * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.zeros_like(rgb)
    for k, (c0, c1, c2) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k; out[..., 0][m] = c0[m]; out[..., 1][m] = c1[m]; out[..., 2][m] = c2[m]
    out = np.where(green[..., None], out, rgb)
    return Image.fromarray(np.dstack([np.round(out * 255), a[..., 3:] * 255]).astype(np.uint8), 'RGBA')

if __name__ == '__main__':
    X.BG_PCT, X.BG_SIZE = 50, 41
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    rgb, score, kind = X.sheet(SH); glow = X._cache[SH + ':glow']
    fr = {}
    for sec, (rect, n, typ) in SPEC.items():
        ims = cells(rgb, glow, score, rect, n, typ, U2.get(sec, 'dist'))
        for i, im in enumerate(ims): im.save(os.path.join(out, f'{sec}_{i}.png')); fr[(sec, i)] = im
        print(sec, len(ims), [f'{im.width}x{im.height}' for im in ims])
    js = ['"use strict";', '/* GENERADO por tools/art/guardian_elfico/build.py (no editar a mano).',
          '   Guardián Élfico Ancestral -> jefe del Bosque "Guardián Ancestral Corrompido". */', 'Object.assign(BOSS_SHEET_ATLAS, {']
    paths = []
    for ent, recolor in (('guardian_ancestral', False), ('guardian_ancestral_furia', True)):
        frames, idx, sets = [], {}, {}
        for k, lst in SETS.items():
            sets[k] = []
            for key in lst:
                if key not in fr: continue
                if key not in idx: idx[key] = len(frames); frames.append(furia(fr[key]) if recolor else fr[key])
                sets[k].append(idx[key])
        sets = {k: v for k, v in sets.items() if v}
        atlas, w, h = pack(frames, 8)
        os.makedirs(os.path.join(REPO, DEST), exist_ok=True)
        fn = 'atlas_furia.png' if recolor else 'atlas.png'
        atlas.save(os.path.join(REPO, DEST, fn), optimize=True); paths.append(f'{DEST}/{fn}')
        hs = sorted(frames[j].height for j in sets['walk']); refH = hs[len(hs) // 2]
        m = {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 2) / h, 4), "sets": sets}
        js.append(f'  {ent}: {{src:"{DEST}/{fn}", hMul:2.5, meta:{json.dumps(m, separators=(",", ":"))}}},')
        print(ent, atlas.size, {k: len(v) for k, v in sets.items()})
    js += ['});', 'Object.assign(BOSS_SHEET_FX, {']
    os.makedirs(os.path.join(REPO, FXDEST), exist_ok=True)
    for key, (lst, ground) in FX.items():
        ps = []
        for j, k in enumerate([k for k in lst if k in fr]):
            p = f'{FXDEST}/{key}_{j}.png'; fr[k].save(os.path.join(REPO, p), optimize=True); ps.append(p)
        paths += ps; js.append(f'  {key}: {{ground:{str(ground).lower()}, srcs:{json.dumps(ps)}}},')
    js.append('});')
    open(os.path.join(REPO, 'js', 'assets', 'guardian-sheet-meta.js'), 'w').write('\n'.join(js) + '\n')
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); m = open(mp).read()
    A, B = '  // >>> guardián ancestral (tools/art/guardian_elfico/build.py)\n', '  // <<< guardián ancestral\n'
    block = A + ''.join(f'  "{q}",\n' for q in paths) + B
    m = (m[:m.index(A)] + block + m[m.index(B) + len(B):]) if A in m else m.replace('const ASSET_MANIFEST = [\n', 'const ASSET_MANIFEST = [\n' + block, 1)
    open(mp, 'w').write(m)
