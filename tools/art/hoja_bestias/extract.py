"""Recorta la hoja "IMG 1-3" (Laberinto: muertes · Hielo: menores · Bosque) en cuadros RGBA limpios.
La hoja queda en tools/art/hoja_bestias/sheet.png (1536x1024, RGB, fondo azul noche con paneles
rotulados; es la misma que art-source/pack_canon/img1_img3_laberinto_hielo_bosque.png). Los GÓLEMS de
la misma hoja los recorta otra herramienta. El Cù-Sìth sale de la versión completa de IMG 3.

Cómo recorta cada cuadro:
- Cada cuadro tiene su CELDA a mano (x0, y0, x1, y1 en píxeles de la hoja), debajo de los rótulos y
  adentro de los bordes del panel, así los carteles y marcos nunca entran.
- Fondo local: percentil 30 en una ventana de 41 px (el fondo del panel domina y tiene degradé/viñeta).
  Lo que se aparta del fondo es figura (umbral de distancia de color) o brillo (partículas: más claro
  que el fondo). Se abre 2x2 (ruido de compresión), se cierra y se rellenan los huecos cerrados (ropas
  oscuras, contornos casi negros).
- Componentes conexas: se queda la figura y las partículas/brillos del mismo cuadro (sin halo difuso).
  Se descartan los pedazos que tocan el borde de la celda y no son la figura (restos del vecino) y las
  líneas finas y largas (bordes de panel).
- Personajes: alfa nítido 0/255 (pixel art). Efectos (FX): alfa suave, porque el brillo ES el efecto.
usage: python3 extract.py <out_dir>   -> <out_dir>/<entidad>/<set>_<n>.png + meta.json
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SHEET = os.path.join(HERE, 'sheet.png')
SHEET_IMG3 = os.path.join(HERE, '..', '..', '..', 'art-source', 'pack_canon', 'img3_img4_bosque_campeones_a.png')
SHEET_OF = {'cusith': SHEET_IMG3, 'cusith_fx': SHEET_IMG3}
N8 = np.ones((3, 3), bool)

# entidad -> set -> lista de celdas (x0, y0, x1, y1). Tipo: 'fig' (alfa nítido) | 'fx' (alfa suave).
SPEC = {
    # ---------------- IMG 1 · Laberinto: muertes (4 cuadros cada una) ----------------
    'esfinge_muerte': {'death': [(806, 204, 861, 287), (862, 214, 916, 287), (916, 232, 970, 288), (916, 292, 970, 353)]},
    'medusa_muerte':  {'death': [(988, 206, 1048, 293), (1049, 213, 1103, 296), (1104, 300, 1157, 354), (1103, 240, 1157, 297)]},
    'druida_muerte':  {'death': [(1170, 204, 1228, 298), (1227, 208, 1280, 298), (1279, 226, 1337, 298), (1278, 300, 1337, 354)]},
    # ---------------- IMG 2 · Hielo (menores) ----------------
    'dragoncito_fx': {'aliento': [(348, 530, 416, 582), (416, 532, 512, 584)]},
    'angel_fx': {'impacto': [(952, 530, 1008, 582)]},
    # hadas: fila grande (idle/vuelo + muerte, misma escala) y variantes de color (escala menor)
    'hadas_grandes': {
        'fly':   [(1031, 453, 1082, 522), (1087, 454, 1137, 522), (1141, 455, 1191, 522), (1196, 456, 1244, 522), (1245, 463, 1296, 522)],
        'death': [(1029, 558, 1082, 613), (1086, 615, 1142, 656), (1143, 578, 1195, 659), (1195, 585, 1246, 659)],
    },
    'hadas_var': {
        'azul':  [(1312, 457, 1363, 509), (1371, 459, 1418, 509), (1315, 508, 1361, 558), (1368, 506, 1413, 558)],
        'rosa':  [(1428, 459, 1473, 509), (1482, 459, 1524, 509), (1428, 509, 1473, 558), (1481, 507, 1520, 558)],
        'oro':   [(1316, 564, 1361, 615), (1372, 563, 1417, 615), (1318, 614, 1357, 662), (1372, 612, 1413, 662)],
        'verde': [(1430, 566, 1472, 615), (1483, 566, 1522, 615), (1430, 614, 1467, 662), (1481, 613, 1520, 661)],
    },
    # ---------------- IMG 3 · Bosque ----------------
    # Cù-Sìth: la misma criatura, de la versión completa de la hoja IMG 3 (art-source/pack_canon/
    # img3_img4_bosque_campeones_a.png: corrida 4 · mordida · hurt 2 · muerte 4). La hoja IMG 1-3 trae
    # una versión corta (corrida 3, sin hurt) del mismo dibujo.
    'cusith': {
        'run':   [(224, 102, 293, 160), (293, 102, 356, 160), (356, 102, 420, 160), (420, 102, 485, 160)],
        'bite':  [(225, 188, 299, 247), (301, 188, 380, 247)],
        'hurt':  [(225, 274, 300, 327), (341, 274, 419, 327)],
        'death': [(20, 350, 122, 428), (124, 352, 228, 428), (230, 354, 340, 428), (340, 360, 480, 428)],
    },
    'cusith_fx': {'mordida': [(382, 190, 484, 247)]},
    'dama_fx': {'hechizo': [(660, 864, 758, 894)]},
}
# entidades con resplandor de color (oro/rosa): además del halo azul, lo tenue conectado al fondo es halo
HALO_DIM = {'hadas_var': 105, 'hadas_grandes': 95, 'cusith': 50, 'cusith_fx': 80, 'dama_fx': 90}
FX_ENTS = {'dragoncito_fx', 'angel_fx', 'cusith_fx', 'dama_fx'}

_img = {}
_cur = SHEET
def sheet():
    if _cur not in _img: _img[_cur] = np.array(Image.open(_cur).convert('RGB')).astype(float)
    return _img[_cur]

PAD = 24
def cell_score(x0, y0, x1, y1, dim=0):
    im = sheet(); H, W = im.shape[:2]
    X0, Y0, X1, Y1 = max(0, x0 - PAD), max(0, y0 - PAD), min(W, x1 + PAD), min(H, y1 + PAD)
    f = im[Y0:Y1, X0:X1]
    bg = np.stack([ndimage.percentile_filter(f[..., c], 30, size=41) for c in range(3)], -1)
    dist = np.sqrt(((f - bg) ** 2).sum(-1))
    bright = f.max(-1) - bg.max(-1)
    sl = (slice(y0 - Y0, y0 - Y0 + (y1 - y0)), slice(x0 - X0, x0 - X0 + (x1 - x0)))
    # halo de brillo: el resplandor azul noche alrededor de lo que brilla (casi sin rojo ni verde).
    # No es arte: se trata como fondo (si no, queda un "barro" azul oscuro alrededor de hielo y hadas).
    # Solo cuenta el halo conectado al fondo (ver extract): el contorno oscuro de adentro se queda.
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    halo = (r < 16) & (g < 58) & (b < 120) & (b > g + 8)
    if dim: halo |= f.max(-1) < dim
    return im[y0:y1, x0:x1], dist[sl], bright[sl], halo[sl]

def drop_lines(fg):
    lb, _ = ndimage.label(fg, N8)
    for i, sl in enumerate(ndimage.find_objects(lb), 1):
        if not sl: continue
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if (hh <= 3 and ww >= 18) or (ww <= 3 and hh >= 18): fg[sl][lb[sl] == i] = False
    return fg

def extract(rect, typ, dim=0):
    x0, y0, x1, y1 = rect
    rgb, dist, bright, halo = cell_score(x0, y0, x1, y1, dim)
    # fondo = lo parecido al fondo local o halo liso, CONECTADO al borde de la celda (inundación)
    bgl = (dist <= 40) | halo
    lb0, _ = ndimage.label(bgl, N8)
    edge = set(np.unique(np.concatenate([lb0[0], lb0[-1], lb0[:, 0], lb0[:, -1]]))) - {0}
    outside = np.isin(lb0, list(edge))
    body = ~outside & (dist > 40)
    body = ndimage.binary_opening(body, np.ones((2, 2), bool))
    body = ndimage.binary_closing(body, N8, iterations=1)
    body = ndimage.binary_fill_holes(body)
    # contorno: 1 px oscuro alrededor de la figura (lo que el halo se comió del borde), para que se lea
    ring = ndimage.binary_dilation(body, N8) & ~body & (dist > 30) & (rgb.max(-1) < 120)
    body |= ring
    parts = (bright > 55) & (dist > 50)               # chispas/partículas brillantes (pueden ser de 1-2 px)
    fg = drop_lines(body | parts)
    lb, k = ndimage.label(fg, N8)
    if k == 0: raise SystemExit(f'celda vacía {rect}')
    areas = ndimage.sum(fg, lb, range(1, k + 1)); main = int(np.argmax(areas)) + 1
    objs = ndimage.find_objects(lb)
    ms = objs[main - 1]
    keep = np.zeros_like(fg)
    h, w = fg.shape
    for i, sl in enumerate(objs, 1):
        a = areas[i - 1]
        if i == main: keep[lb == i] = True; continue
        touches = sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == h or sl[1].stop == w
        if touches and a > 6: continue                  # resto del cuadro vecino
        if a < 2: continue
        # partículas: cerca de la figura (no lejos en la celda)
        cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        dy = max(0, ms[0].start - cy, cy - ms[0].stop); dx = max(0, ms[1].start - cx, cx - ms[1].stop)
        if dx > 18 or dy > 18: continue
        keep[lb == i] = True
    if typ == 'fx':
        soft = np.clip((dist - 22) / 70.0, 0, 1)
        grown = ndimage.binary_dilation(keep, N8, iterations=3)
        alpha = np.where(keep, np.maximum(soft, 0.9), np.where(grown, soft * 0.8, 0))
        alpha = (alpha * 255).astype(np.uint8)
    else:
        alpha = np.where(keep, 255, 0).astype(np.uint8)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    ys, xs = np.nonzero(alpha)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray(out, 'RGBA'), (int(x0 + xs.min()), int(y0 + ys.min()))

if __name__ == '__main__':
    od = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'frames')
    meta = {}
    for ent, sets in SPEC.items():
        _cur = SHEET_OF.get(ent, SHEET)
        os.makedirs(os.path.join(od, ent), exist_ok=True); meta[ent] = {}
        typ = 'fx' if ent in FX_ENTS else 'fig'
        for sec, cells in sets.items():
            meta[ent][sec] = []
            for i, r in enumerate(cells):
                im, org = extract(r, typ, HALO_DIM.get(ent, 0))
                fn = f'{sec}_{i}.png'; im.save(os.path.join(od, ent, fn))
                meta[ent][sec].append({'file': fn, 'w': im.width, 'h': im.height, 'org': org})
        print(ent, {s: len(v) for s, v in meta[ent].items()})
    json.dump(meta, open(os.path.join(od, 'meta.json'), 'w'), indent=1)
