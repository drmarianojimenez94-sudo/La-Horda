"""Recorta los gólems de la hoja "IMG 1 Laberinto / IMG 3 Bosque y elementales"
(art-source/nigromante_golems/hoja_laberinto_hielo_bosque.png) para el gólem del Nigromante:
  - Gólem de piedra (panel IMG 1): frente, perfil, espalda, caminata, golpe, escombros e impacto.
  - Gólem de fuego / de hielo (paneles IMG 3): idle-caminata, ataque (cuerpo + efecto) y muerte.
Los demás paneles de la hoja (muertes del Laberinto, élites de hielo, hadas, Cù-Sìth, Dama del
Bosque) no se tocan acá.
usage: python3 extract.py [out_dir]   (por defecto art-source/nigromante_golems/frames)
       -> <out_dir>/<entidad>/<sección>_<n>.png + meta.json
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet_crop import Sheet

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SHEET = os.path.join(REPO, 'art-source', 'nigromante_golems', 'hoja_laberinto_hielo_bosque.png')

# (entidad, sección, rect x0,y0,x1,y1 en la hoja, cuadros, tipo, opciones de máscara)
SPEC = [
    # ---------- Gólem de piedra (IMG 1, subjefe del Laberinto) ----------
    ('stone', 'front', (236, 101, 340, 168), 2, 'fig', {}),
    ('stone', 'side',  (346, 101, 486, 168), 3, 'fig', {}),
    ('stone', 'back',  (489, 101, 594, 168), 2, 'fig', {}),
    ('stone', 'left',  (597, 101, 793, 168), 4, 'fig', {}),
    ('stone', 'walk',  (236, 198, 500, 268), 5, 'fig', {}),
    ('stone', 'atk',   (500, 198, 684, 268), 2, 'fig', {}),
    ('stone_fx', 'golpe', (688, 198, 796, 268), 1, 'fx', {'fig_t': 46, 'glow_lo': 18}),
    ('stone_fx', 'escombros', (236, 293, 500, 353), 3, 'fig', {'hole_max': 20}),
    ('stone_fx', 'impacto', (505, 276, 792, 348), 3, 'fx', {'cuts': [603, 706], 'fig_t': 46, 'glow_lo': 18}),
    # ---------- Gólem de fuego (IMG 3) ----------
    ('fire', 'idle',  (950, 761, 1152, 824), 4, 'fig', {'fig_t': 34}),
    ('fire', 'atk',   (955, 847, 1012, 910), 1, 'fig', {'fig_t': 34}),
    ('fire_fx', 'chorro', (1012, 847, 1150, 910), 1, 'fx', {'fig_t': 90}),
    ('fire', 'death', (815, 936, 1152, 1012), 4, 'figfx', {'fig_t': 30, 'cuts': [898, 983, 1049]}),
    # ---------- Gólem de hielo (IMG 3) ----------
    ('ice', 'idle',  (1305, 764, 1527, 827), 4, 'fig', {'fig_t': 52, 'bg_t': 24, 'hole_max': 30}),
    ('ice', 'atk',   (1309, 849, 1392, 908), 1, 'fig', {'fig_t': 52, 'bg_t': 24}),
    ('ice_fx', 'rayo',  (1392, 849, 1443, 908), 1, 'fx', {'bg_t': 24, 'fig_t': 110, 'glow_lo': 60}),
    ('ice_fx', 'estallido', (1443, 852, 1527, 908), 1, 'fx', {'bg_t': 24, 'fig_t': 110, 'glow_lo': 60}),
    ('ice', 'death', (1170, 936, 1527, 1012), 4, 'figfx', {'fig_t': 55, 'bg_t': 24, 'cuts': [1250, 1325, 1397]}),
]


def main(out):
    s = Sheet(SHEET)
    meta = {}
    for ent, sec, rect, n, typ, kw in SPEC:
        fr = s.frames(rect, n, typ, **kw)
        os.makedirs(os.path.join(out, ent), exist_ok=True)
        files = []
        for i, (im, box, core) in enumerate(fr):
            f = f'{sec}_{i}.png'
            im.save(os.path.join(out, ent, f))
            # pies: fila más baja del núcleo; centro: el de las piernas (último 30 % del núcleo)
            import numpy as np
            ys, xs = np.nonzero(core)
            foot = int(ys.max()) if len(ys) else im.height - 1
            low = ys >= ys.min() + (ys.max() - ys.min()) * 0.7 if len(ys) else None
            cx = float(xs[low].mean()) if len(ys) else im.width / 2
            files.append({'file': f, 'w': im.width, 'h': im.height, 'box': list(map(int, box)), 'typ': typ,
                          'foot': foot, 'cx': round(cx, 1), 'bodyTop': int(ys.min()) if len(ys) else 0})
        meta.setdefault(ent, {})[sec] = files
        print(ent, sec, f'{len(files)}/{n}', [f"{q['w']}x{q['h']}" for q in files])
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, 'art-source', 'nigromante_golems', 'frames'))
