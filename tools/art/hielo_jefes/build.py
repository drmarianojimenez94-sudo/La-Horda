"""Arma los atlas de juego desde los cuadros de extract.py.
- Un atlas por entidad (celdas uniformes, pies abajo, centrado) + sus sets de animación, incluidos
  los de habilidad que pide la IA con packSet (nova, lanza, canalización, vuelo, alas...).
- Los efectos (VFX) quedan como PNG sueltos por cuadro para vfxSprite (con su lista de frames).
Escribe js/assets/boss-sheets-meta.js con la metadata (enemyAtlasPackLoad + VFX).
usage: python3 build.py <frames_dir>
"""
import json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

# entidad del juego -> (carpeta de cuadros, destino, {set: [(sección, índice), ...]}, hMul)
ATLAS = {
    'mago_hielo_cristal': ('mago', 'assets/sprites/bosses/hielo/mago_hielo_cristal/v2', {
        'idle': [('idle', 0), ('idle', 1), ('idle', 2), ('idle', 1)],
        'walk': [('walk', i) for i in range(5)],
        'atk': [('atk', 0), ('atk', 1), ('atk', 2)],
        'hit': [('nova1', 1)],
        'death': [('death1', i) for i in range(4)],
        'cast': [('lanza1', 0), ('lanza1', 1), ('lanza2', 0), ('lanza2', 1)],
        'nova': [('nova1', 0), ('nova1', 1), ('nova2', 0)],
        'canal': [('canal1', i) for i in range(4)],
        'encase': [('canal2', i) for i in range(4)],
        'muro': [('muro1', i) for i in range(3)],
    }, 2.7),
    'angel_caido_hielo': ('angel', 'assets/sprites/bosses/hielo/angel_caido_hielo/v2', {
        'idle': [('idle', 0), ('idle', 1), ('idle', 2), ('idle', 1)],
        'walk': [('walk', i) for i in range(5)],
        'atk': [('atk', i) for i in range(1, 5)],
        'hit': [('recov', 0)],
        'death': [('death', i) for i in range(8)],
        'cast': [('prep', i) for i in range(4)],
        'fly': [('fly', i) for i in range(4)],
        'wing': [('wing', i) for i in range(3)],
        'storm': [('storm', i) for i in range(4)],
        'transf': [('transf', i) for i in range(5)],
        'aura': [('aura', i) for i in range(4)],
        'freeze': [('freeze', i) for i in range(3)],
        'recov': [('recov', i) for i in range(4)],
    }, 2.3),
    'jinete_sin_cabeza': ('jinete', 'assets/sprites/bosses/bosque/jinete_sin_cabeza/v2', {
        'idle': [('side1', 0), ('side1', 1)],
        'walk': [('side1', 0), ('side1', 1), ('side2', 0), ('side2', 1)],
        'atk': [('atk1', 0), ('atk1', 1), ('atk1', 2)],
        'hit': [('side2', 0)],
        'death': [('death1', i) for i in range(5)],
        'front': [('front1', i) for i in range(3)],
    }, 2.2),
    'dragon_hielo': ('tundraverx', 'assets/sprites/enemies/hielo/dragon_hielo/v2', {
        'idle': [('walk1', 0), ('walk1', 1)],
        'walk': [('walk1', i) for i in range(4)],
        'atk': [('atk1', 0), ('atk2', 0), ('atk2', 1)],
        'hit': [('walk1', 2)],
        'death': [('death', i) for i in range(5)],
        'front': [('front1', 0), ('front1', 1)],
    }, 1.9),
    'golem_cristal': ('golem', 'assets/sprites/enemies/hielo/golem_cristal', {
        'idle': [('idle', 0), ('idle', 1)],
        'walk': [('walk', i) for i in range(4)],
        'atk': [('atk', i) for i in range(4)],
        'hit': [('side', 0)],
        'death': [('death', i) for i in range(6)],
        'stomp': [('stomp', i) for i in range(4)],
        'throw': [('throw', 0), ('throw', 1)],
        'charge': [('charge', i) for i in range(3)],
    }, 2.6),
    'cristal_servo': ('servo', 'assets/sprites/enemies/hielo/cristal_servo', {
        'idle': [('idle', i) for i in range(3)],
        'walk': [('walk', i) for i in range(4)],
        'atk': [('atk', 0), ('atk', 1)],
        'hit': [('fpb', 0)],
        'death': [('death', i) for i in range(3)],
    }, 2.6),
    'cristal_volador': ('volador', 'assets/sprites/enemies/hielo/cristal_volador', {
        'idle': [('idle', i) for i in range(3)],
        'walk': [('move', i) for i in range(4)],
        'atk': [('atk', i) for i in range(4)],
        'hit': [('idle', 0)],
        'death': [('death', i) for i in range(4)],
    }, 2.4),
}
# efectos: clave vfxSprite -> (carpeta, sección, destino, ¿de suelo?)
FX = {
    'bsMagoLance':   ('mago_fx', 'proyectil', 'assets/vfx/bosses/hielo', False),
    'bsMagoBurst':   ('mago_fx', 'explosion', 'assets/vfx/bosses/hielo', False),
    'bsMagoRune':    ('mago_fx', 'circulo',   'assets/vfx/bosses/hielo', True),
    'bsMagoImpact':  ('mago_fx', 'impacto',   'assets/vfx/bosses/hielo', False),
    'bsMagoWall':    ('mago_fx', 'muro',      'assets/vfx/bosses/hielo', False),
    'bsMagoCrystal': ('mago_fx', 'cristal',   'assets/vfx/bosses/hielo', False),
    'bsAngelNova':   ('angel_fx', 'nova',     'assets/vfx/bosses/hielo', False),
    'bsAngelPillar': ('angel_fx', 'pilar',    'assets/vfx/bosses/hielo', False),
    'bsAngelRune':   ('angel_fx', 'circulo',  'assets/vfx/bosses/hielo', True),
    'bsAngelBurst':  ('angel_fx', 'explosion', 'assets/vfx/bosses/hielo', False),
    'bsAngelImpact': ('angel_fx', 'impacto',  'assets/vfx/bosses/hielo', False),
    'bsAngelWalls':  ('angel_fx', 'muros',    'assets/vfx/bosses/hielo', False),
    # (el fuego y la lava de minotauro_sheet quedaron fuera: el canon del Minotauro es la IMG 9, con sus propios efectos)
}

def pack(frames, cols):
    w = max(f.width for f in frames); h = max(f.height for f in frames)
    rows = (len(frames) + cols - 1) // cols
    atlas = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        atlas.alpha_composite(f, ((i % cols) * w + (w - f.width) // 2, (i // cols) * h + (h - f.height)))
    return atlas, w, h

if __name__ == '__main__':
    src = sys.argv[1]
    meta = json.load(open(os.path.join(src, 'meta.json')))
    js = ['"use strict";', '/* GENERADO por tools/art/hielo_jefes/build.py (no editar a mano).',
          '   Atlas de las hojas de jefes de art-source/hielo_jefes/ y sus efectos. */', 'const BOSS_SHEET_ATLAS = {'];
    for ent, (folder, dest, sets, hmul) in ATLAS.items():
        frames, idx = [], {}
        out_sets = {}
        for k, lst in sets.items():
            out_sets[k] = []
            for sec, i in lst:
                files = meta[folder].get(sec, [])
                if i >= len(files): continue
                key = (sec, i)
                if key not in idx:
                    idx[key] = len(frames); frames.append(Image.open(os.path.join(src, folder, files[i]['file'])).convert('RGBA'))
                out_sets[k].append(idx[key])
        atlas, w, h = pack(frames, 8)
        os.makedirs(os.path.join(REPO, dest), exist_ok=True)
        atlas.save(os.path.join(REPO, dest, 'atlas.png'), optimize=True)
        hs = sorted(frames[j].height for j in out_sets['walk'])
        refH = hs[len(hs) // 2]
        m = {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 2) / h, 4), "sets": out_sets}
        js.append(f'  {ent}: {{src:"{dest}/atlas.png", hMul:{hmul}, meta:{json.dumps(m, separators=(",", ":"))}}},')
        print(ent, atlas.size, 'cell', w, h, 'refH', refH, {k: len(v) for k, v in out_sets.items()})
    js.append('};')
    js.append('const BOSS_SHEET_FX = {')
    for key, (folder, sec, dest, ground) in FX.items():
        files = meta[folder][sec]
        os.makedirs(os.path.join(REPO, dest), exist_ok=True)
        paths = []
        for i, f in enumerate(files):
            im = Image.open(os.path.join(src, folder, f['file'])).convert('RGBA')
            p = f'{dest}/{key}_{i}.png'; im.save(os.path.join(REPO, p), optimize=True); paths.append(p)
        js.append(f'  {key}: {{ground:{str(ground).lower()}, srcs:{json.dumps(paths)}}},')
        print(key, len(paths))
    js.append('};')
    open(os.path.join(REPO, 'js', 'assets', 'boss-sheets-meta.js'), 'w').write('\n'.join(js) + '\n')
    # la precarga (preload.js) espera todo lo que figura en ASSET_MANIFEST: bloque generado
    paths = [f'{d}/atlas.png' for _, (_, d, _, _) in ATLAS.items()]
    for key, (folder, sec, dest, _) in FX.items(): paths += [f'{dest}/{key}_{i}.png' for i in range(len(meta[folder][sec]))]
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); m = open(mp).read()
    A, B = '  // >>> hojas de jefes (tools/art/hielo_jefes/build.py)\n', '  // <<< hojas de jefes\n'
    block = A + ''.join(f'  "{q}",\n' for q in paths) + B
    if A in m: m = m[:m.index(A)] + block + m[m.index(B) + len(B):]
    else: m = m.replace('const ASSET_MANIFEST = [\n', 'const ASSET_MANIFEST = [\n' + block, 1)
    open(mp, 'w').write(m)
