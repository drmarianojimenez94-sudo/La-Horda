"""Arma los atlas del gólem del Nigromante desde los cuadros de extract.py.
- Un atlas por gólem (piedra, fuego, hielo): cuadros empaquetados con su propio rectángulo y su
  ancla (pies: la fila más baja del cuerpo, centrada en las piernas), así los cuadros anchos del
  golpe no obligan a celdas gigantes y todos apoyan en la misma línea.
- Los cuerpos llevan un contorno oscuro de 1 px (el negro del arte se pierde al separarlo del fondo
  negro de la hoja; sin él la silueta se lava sobre los pisos oscuros de las arenas).
- Los efectos (impacto, chorro de fuego, rayo y estallido de hielo) van en el mismo atlas, anclados
  abajo al centro.
Escribe assets/sprites/champions/nigromante/golems/<gólem>/atlas.png y js/assets/nigro-golems-meta.js.
usage: python3 build.py [frames_dir]   (por defecto art-source/nigromante_golems/frames)
"""
import json, os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheet_crop import outline

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
DEST = 'assets/sprites/champions/nigromante/golems'


def F(ent, sec, *idx):
    return [(ent, sec, i) for i in idx]


# gólem -> {set: [(entidad, sección, índice), ...]}
ATLAS = {
    'stone': {
        'idle_down': F('stone', 'front', 0, 1),
        'idle_side': F('stone', 'side', 0, 1, 2),
        'idle_up':   F('stone', 'back', 0, 1),
        'walk_side': F('stone', 'walk', 0, 1, 2, 3, 4),
        'walk_down': F('stone', 'front', 0, 1),
        'walk_up':   F('stone', 'back', 0, 1),
        'atk':       F('stone', 'atk', 0, 1),
        # se arma de los escombros (desparramados -> montón -> se para) y se deshace al revés
        'rise':      F('stone_fx', 'escombros', 0, 2, 1),
        'death':     F('stone_fx', 'escombros', 1, 2, 0),
        'fx_slam':   F('stone_fx', 'impacto', 0) + F('stone_fx', 'golpe', 0) + F('stone_fx', 'impacto', 1, 2),
    },
    'fire': {
        'idle':      F('fire', 'idle', 0, 2),
        'walk':      F('fire', 'idle', 0, 1, 2, 3),
        'atk':       F('fire', 'atk', 0),
        'death':     F('fire', 'death', 0, 1, 2, 3),
        'fx_stream': F('fire_fx', 'chorro', 0),
    },
    'ice': {
        'idle':      F('ice', 'idle', 0, 2),
        'walk':      F('ice', 'idle', 0, 1, 2, 3),
        'atk':       F('ice', 'atk', 0),
        'death':     F('ice', 'death', 0, 1, 2, 3),
        'fx_bolt':   F('ice_fx', 'rayo', 0),
        'fx_burst':  F('ice_fx', 'estallido', 0),
    },
}
# alto de referencia del cuerpo (cabeza a pies) = el del cuadro quieto de frente
REF = {'stone': ('stone', 'front', 0), 'fire': ('fire', 'idle', 0), 'ice': ('ice', 'idle', 0)}


def pack(items, width=512, pad=2):
    """Estantes simples: devuelve [(x, y)] y el alto total."""
    x = y = row = 0
    pos = []
    for im in items:
        if x + im.width + pad > width:
            x = 0; y += row + pad; row = 0
        pos.append((x, y)); x += im.width + pad; row = max(row, im.height)
    return pos, y + row


def main(src):
    meta = json.load(open(os.path.join(src, 'meta.json')))
    js = ['"use strict";',
          '/* Generado por tools/art/nigromante_golems/build.py (no editar a mano).',
          '   Gólem del Nigromante: un atlas por elemento. frames = [x, y, w, h, anclaX, anclaY] (pies);',
          '   sets = índices de frames; refH = alto del cuerpo quieto (para escalar igual que el resto). */',
          'const NIGRO_GOLEM_META = {']
    for golem, sets in ATLAS.items():
        keys, ims, anchors, index = [], [], [], {}
        for name, lst in sets.items():
            for key in lst:
                if key in index:
                    continue
                ent, sec, i = key
                m = meta[ent][sec][i]
                im = Image.open(os.path.join(src, ent, m['file'])).convert('RGBA')
                if m['typ'] == 'fig' and ent in ('stone', 'fire', 'ice'):
                    # cuerpo: contorno de 1 px (queda 1 px más grande por lado)
                    big = Image.new('RGBA', (im.width + 2, im.height + 2)); big.paste(im, (1, 1))
                    im = outline(big)
                    ax, ay = m['cx'] + 1, m['foot'] + 2
                elif m['typ'] == 'figfx' or (m['typ'] == 'fig'):
                    ax, ay = m['cx'], m['foot'] + 1
                else:
                    ax, ay = im.width / 2, im.height
                index[key] = len(ims); keys.append(key); ims.append(im); anchors.append((round(ax, 1), ay))
        pos, H = pack(ims)
        W = max(x + im.width for (x, _), im in zip(pos, ims))
        atlas = Image.new('RGBA', (W, H))
        for (x, y), im in zip(pos, ims):
            atlas.paste(im, (x, y))
        out = os.path.join(REPO, DEST, golem)
        os.makedirs(out, exist_ok=True)
        atlas.save(os.path.join(out, 'atlas.png'), optimize=True)
        r = meta[REF[golem][0]][REF[golem][1]][REF[golem][2]]
        refH = r['foot'] - r['bodyTop'] + 1
        frames = [[x, y, im.width, im.height, ax, ay] for (x, y), im, (ax, ay) in zip(pos, ims, anchors)]
        sj = {name: [index[k] for k in lst] for name, lst in sets.items()}
        js.append(f'  {golem}: {{src:"{DEST}/{golem}/atlas.png", refH:{refH}, frames:{json.dumps(frames)}, sets:{json.dumps(sj)}}},')
        print(golem, f'{W}x{H}', len(ims), 'cuadros, refH', refH)
    js.append('};')
    open(os.path.join(REPO, 'js', 'assets', 'nigro-golems-meta.js'), 'w').write('\n'.join(js) + '\n')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, 'art-source', 'nigromante_golems', 'frames'))
