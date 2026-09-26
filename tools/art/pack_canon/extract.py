"""Recorte de las hojas del pack de canon (art-source/pack_canon/) con el mismo motor que
tools/art/hielo_jefes/extract.py (fondo local + máscara u2net por cuadro para personajes, máscara
directa para muertes/partículas, alfa de brillo para efectos). Solo se recortan las entidades que
pasaron el Artgate (ver LA_HORDA_ARTGATE_AUDIT.md); el resto de la hoja no se toca.
usage: python3 extract.py <out_dir>"""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hielo_jefes'))
import extract as X
X.ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'art-source', 'pack_canon')
M9, H2, B3, L1 = 'img7_img9_profeta_nigro_minotauro', 'img2_hielo_menores', 'img3_img4_bosque_campeones_a', 'img1_img3_laberinto_hielo_bosque'
X.SPEC = [
    # ---------- Minotauro (IMG 9): CANONICAL_SET ----------
    (M9, 'mino', 'front', (314, 568, 600, 652), 4, 'fig'),
    (M9, 'mino', 'right', (602, 568, 908, 652), 4, 'fig'),
    (M9, 'mino', 'back',  (910, 568, 1212, 652), 4, 'fig'),
    (M9, 'mino', 'left',  (1214, 568, 1528, 652), 4, 'fig'),
    (M9, 'mino', 'walk',  (314, 676, 692, 754), 4, 'fig'),
    (M9, 'mino', 'run',   (694, 676, 1080, 754), 4, 'fig'),
    (M9, 'mino', 'atk',   (1083, 676, 1528, 754), 4, 'figfx'),
    (M9, 'mino', 'heavy', (314, 780, 652, 860), 4, 'figfx'),
    (M9, 'mino', 'seismic', (655, 780, 988, 860), 4, 'figfx'),
    (M9, 'mino', 'charge', (991, 780, 1348, 860), 4, 'figfx'),
    (M9, 'mino', 'hurt',  (1350, 780, 1528, 860), 2, 'fig'),
    (M9, 'mino', 'death', (292, 884, 700, 975), 4, 'fig0'),
    (M9, 'mino_fx', 'onda',   (706, 905, 850, 995), 1, 'fx'),
    (M9, 'mino_fx', 'impacto', (852, 905, 985, 995), 1, 'fx'),
    (M9, 'mino_fx', 'polvo',  (987, 905, 1178, 995), 2, 'fx'),
    (M9, 'mino_fx', 'traza',  (1180, 905, 1378, 995), 1, 'fx'),
    (M9, 'mino_fx', 'aura',   (1380, 905, 1528, 995), 1, 'fx'),
    # ---------- Dragoncito de Hielo (IMG 2) ----------
    (H2, 'dragoncito', 'fly',   (300, 105, 648, 215), 4, 'fig'),
    (H2, 'dragoncito', 'atk',   (651, 105, 995, 215), 3, 'fig0'),
    (H2, 'dragoncito', 'hurt',  (998, 105, 1216, 215), 2, 'fig'),
    (H2, 'dragoncito', 'death', (1219, 105, 1530, 215), 4, 'fig0'),
    (H2, 'dragoncito', 'front', (300, 252, 570, 342), 4, 'fig'),
    (H2, 'dragoncito', 'back',  (572, 252, 848, 342), 4, 'fig'),
    (H2, 'dragoncito_fx', 'proyectil', (853, 270, 1036, 342), 3, 'fx'),
    (H2, 'dragoncito_fx', 'impacto',   (1038, 270, 1196, 342), 2, 'fx'),
    # ---------- Ángel de Hielo y Cristal élite (IMG 2) ----------
    (H2, 'angel_hielo', 'fly',   (283, 425, 547, 537), 4, 'fig'),
    (H2, 'angel_hielo', 'atk',   (549, 425, 826, 537), 3, 'fig0'),
    (H2, 'angel_hielo', 'cast',  (829, 425, 1110, 537), 4, 'fig0'),
    (H2, 'angel_hielo', 'hurt',  (1113, 425, 1268, 537), 2, 'fig'),
    (H2, 'angel_hielo', 'death', (1271, 425, 1530, 537), 4, 'fig0'),
    (H2, 'angel_hielo', 'front', (283, 575, 545, 698), 4, 'fig'),
    (H2, 'angel_hielo', 'back',  (548, 575, 878, 698), 4, 'fig'),
    (H2, 'angel_hielo_fx', 'proyectil', (885, 612, 1078, 698), 2, 'fx'),
    (H2, 'angel_hielo_fx', 'nova',      (1080, 612, 1205, 698), 1, 'fx'),
    # ---------- Enjambre de Hadas (IMG 2) ----------
    (H2, 'hadas', 'idle',  (220, 780, 557, 862), 4, 'fig'),
    (H2, 'hadas', 'dirs',  (560, 780, 876, 862), 4, 'fig'),
    (H2, 'hadas', 'atk',   (879, 780, 1200, 862), 3, 'fig0'),
    (H2, 'hadas', 'death', (1202, 780, 1530, 862), 4, 'fig0'),
    (H2, 'hadas_fx', 'proyectil', (700, 918, 900, 992), 2, 'fx'),
    (H2, 'hadas_fx', 'estallido', (903, 918, 1036, 992), 1, 'fx'),
    # ---------- Cù-Sìth (IMG 3) ----------
    (B3, 'cusith', 'run',   (225, 98, 487, 162), 4, 'fig'),
    (B3, 'cusith', 'bite',  (225, 186, 487, 250), 3, 'fig0'),
    (B3, 'cusith', 'hurt',  (225, 273, 487, 337), 2, 'fig0'),
    (B3, 'cusith', 'death', (10, 353, 487, 432), 4, 'fig0'),
    # ---------- Gólem de Fuego (IMG 3) -> Gólem del Infernal ----------
    (B3, 'golem_fuego', 'walk',  (1005, 98, 1197, 162), 4, 'fig'),
    (B3, 'golem_fuego', 'atk',   (1005, 186, 1197, 252), 2, 'fig0'),
    (B3, 'golem_fuego', 'death', (880, 278, 1197, 362), 4, 'fig0'),
    (B3, 'golem_fuego_fx', 'proyectil', (882, 410, 945, 462), 1, 'fx'),
    (B3, 'golem_fuego_fx', 'impacto',   (947, 410, 1015, 462), 1, 'fx'),
    # ---------- Gólem de Piedra (IMG 1) ----------
    (L1, 'golem_piedra', 'front', (237, 98, 356, 162), 3, 'fig'),
    (L1, 'golem_piedra', 'right', (358, 98, 496, 162), 3, 'fig'),
    (L1, 'golem_piedra', 'back',  (498, 98, 596, 162), 2, 'fig'),
    (L1, 'golem_piedra', 'left',  (598, 98, 796, 162), 3, 'fig'),
    (L1, 'golem_piedra', 'walk',  (237, 198, 500, 268), 5, 'fig'),
    (L1, 'golem_piedra', 'atk',   (503, 198, 796, 268), 3, 'fig0'),
    (L1, 'golem_piedra_fx', 'impacto', (503, 288, 796, 348), 3, 'fx'),
]
def cell_frames(rgb, glow, rect, n, typ, inset=3):
    """Hojas con celdas parejas: cada cuadro se corta de su celda y u2net separa la figura del
    fondo de la celda. Muertes/ataques (fig0) suman lo que brilla (partículas, filo, aliento)."""
    import numpy as np
    from scipy import ndimage
    x0, y0, x1, y1 = rect; w = (x1 - x0) / n; out = []
    for i in range(n):
        cx0, cx1 = int(x0 + i * w) + inset, int(x0 + (i + 1) * w) - inset
        mk, (X0, Y0, X1, Y1) = X.u2net_mask(rgb, (cx0, y0, cx1, y1), pad=0)
        full = np.zeros(rgb.shape[:2], bool); full[Y0:Y1, X0:X1] = mk
        alpha = full.astype(float)
        if typ in ('fig0', 'fx'):
            g = np.zeros(rgb.shape[:2]); g[y0:y1, cx0:cx1] = glow[y0:y1, cx0:cx1]
            alpha = np.maximum(alpha, g if typ == 'fx' else (g > 0.35) * g)
            full = full | (g > 0.15)
        cell = np.zeros(rgb.shape[:2], bool); cell[y0:y1, cx0:cx1] = True
        full &= cell
        res = X.crop(rgb, alpha, full)
        if res: out.append(res)
    return out

MODE = {}   # entidad -> 'cell' (celdas parejas); el resto se reparte por figuras (motor original)
for k in ('dragoncito:fly', 'golem_piedra:front', 'golem_piedra:right', 'golem_piedra:back', 'golem_piedra:left', 'golem_piedra:walk', 'golem_piedra:atk', 'golem_piedra_fx:impacto'): MODE[k] = 'cell'

def run_split(name, ent, sec, rect, n, typ, out):
    import numpy as np
    from scipy import ndimage
    rgb, score, kind = X.sheet(name); x0, y0, x1, y1 = rect
    r, s = rgb[y0:y1, x0:x1], score[y0:y1, x0:x1]
    fg, alpha = X.masks(s, kind, typ)
    if typ == 'fx' and kind == 'dist': alpha = X._cache[name + ':glow'][y0:y1, x0:x1]
    if typ == 'fig0':
        g = X._cache.get(name + ':glow'); alpha = np.maximum(fg.astype(float), g[y0:y1, x0:x1] if g is not None else 0)
    res = []
    for m in X.split(X.drop_lines(fg), n):
        c = X.crop(r, alpha, m)
        if c is None: continue
        im, (bx0, by0, bx1, by1) = c
        if typ in ('fig', 'figfx'):
            mk, (X0, Y0, X1, Y1) = X.u2net_mask(rgb, (x0 + bx0, y0 + by0, x0 + bx1, y0 + by1))
            full = np.zeros(rgb.shape[:2], bool); full[Y0:Y1, X0:X1] = mk
            lim = np.zeros_like(full); lim[y0:y1, x0:x1] = ndimage.binary_dilation(m, X.N8, iterations=6); full &= lim
            a = np.ones(rgb.shape[:2])
            if typ == 'figfx':   # + el tajo/estela que brilla, con su alfa suave
                g = np.zeros(rgb.shape[:2]); g[y0:y1, x0:x1] = X._cache[name + ':glow'][y0:y1, x0:x1] * lim[y0:y1, x0:x1]
                a = np.where(full, 1.0, g); full = full | (g > 0.3)
            c = X.crop(rgb, a, full)
            if c is None: continue
            im, bb = c
        res.append((im, (x0 + bx0, y0 + by0, x0 + bx1, y0 + by1)))
    return res

if __name__ == '__main__':
    X.BG_PCT, X.BG_SIZE = 50, 91
    out = sys.argv[1]; meta = {}
    for name, ent, sec, rect, n, typ in X.SPEC:
        rgb, score, kind = X.sheet(name)
        if MODE.get(ent + ':' + sec) == 'cell': res = cell_frames(rgb, X._cache[name + ':glow'], rect, n, typ)
        else: res = run_split(name, ent, sec, rect, n, typ, out)
        os.makedirs(os.path.join(out, ent), exist_ok=True); files = []
        for i, (im, box) in enumerate(res):
            f = f'{sec}_{i}.png'; im.save(os.path.join(out, ent, f))
            files.append({'file': f, 'w': im.width, 'h': im.height, 'box': list(box), 'sheet': name, 'typ': typ})
        meta.setdefault(ent, {})[sec] = files
        print(ent, sec, len(files), [f"{q['w']}x{q['h']}" for q in files])
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)
