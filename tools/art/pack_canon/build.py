"""Atlas de juego de las entidades que pasaron a CANON desde el pack (art-source/pack_canon/).
Mismo formato que tools/art/hielo_jefes/build.py; escribe js/assets/canon-sheets-meta.js, que se
suma a BOSS_SHEET_ATLAS / BOSS_SHEET_FX (los carga js/assets/boss-sheets.js).
usage: python3 build.py <frames_dir>"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hielo_jefes'))
from build import pack, REPO
from PIL import Image
import numpy as np
from scipy import ndimage

def clean(im):
    """Quita restos de bordes de celda (componentes finas y largas) que quedaron pegados al recorte."""
    a = np.array(im); m = a[..., 3] > 0
    lb, k = ndimage.label(m, np.ones((3, 3), bool))
    for i, sl in enumerate(ndimage.find_objects(lb), 1):
        if not sl: continue
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if (ww <= 4 and hh >= 15) or (hh <= 4 and ww >= 15): a[..., 3][sl][lb[sl] == i] = 0
    return Image.fromarray(a, 'RGBA')

R = lambda sec, n, a=0: [(sec, i) for i in range(a, n)]
ATLAS = {
    'minotauro': ('mino', 'assets/sprites/bosses/laberinto/minotauro/v3', {
        'idle': R('front', 4), 'walk': R('walk', 4), 'walk_down': R('front', 4), 'walk_up': R('back', 4),
        'atk': R('atk', 4), 'hit': R('hurt', 2), 'death': R('death', 4),
        'run': R('run', 4), 'heavy': R('heavy', 4), 'seismic': R('seismic', 4), 'charge': R('charge', 4),
    }, 2.7),
    'dragoncito_hielo': ('dragoncito', 'assets/sprites/enemies/hielo/dragoncito_hielo/v2', {
        'idle': R('fly', 4), 'walk': R('fly', 4), 'walk_down': R('front', 4), 'walk_up': R('back', 4),
        'atk': R('atk', 2), 'hit': R('hurt', 2), 'death': R('death', 4),
    }, 3.2),
    'angel_hielo': ('angel_hielo', 'assets/sprites/enemies/hielo/angel_hielo/v2', {
        'idle': R('front', 4), 'walk': R('fly', 4), 'walk_down': R('front', 4), 'walk_up': R('back', 4),
        'atk': R('atk', 2), 'cast': R('cast', 3), 'hit': R('hurt', 2), 'death': R('death', 4),
    }, 3.0),
    'enjambre_hadas': ('hadas', 'assets/sprites/enemies/bosque/enjambre_hadas/v2', {
        'idle': R('idle', 4), 'walk': R('idle', 4), 'atk': R('atk', 2), 'hit': R('dirs', 1), 'death': R('death', 4),
    }, 2.8),
    'cu_sith': ('cusith', 'assets/sprites/enemies/bosque/cu_sith/v2', {
        'idle': R('run', 2), 'walk': R('run', 4), 'atk': R('bite', 2), 'hit': R('hurt', 1), 'death': R('death', 4),
    }, 2.3),
    'golem': ('golem_fuego', 'assets/sprites/enemies/infernal/golem/v2', {
        'idle': R('walk', 4), 'walk': R('walk', 4), 'atk': R('atk', 1), 'hit': R('walk', 1), 'death': R('death', 4),
    }, 2.6),
    'golem_piedra': ('golem_piedra', 'assets/sprites/enemies/laberinto/golem_piedra/v2', {
        'idle': R('walk', 2), 'walk': R('walk', 5),
        'atk': R('atk', 2), 'hit': R('walk', 1), 'death': R('walk', 1),
    }, 2.6),
}
FX = {
    'csMinoWave':    ('mino_fx', 'onda', 'assets/vfx/bosses/laberinto', True),
    'csMinoAxe':     ('mino_fx', 'impacto', 'assets/vfx/bosses/laberinto', False),
    'csMinoDust':    ('mino_fx', 'polvo', 'assets/vfx/bosses/laberinto', False),
    'csMinoTrail':   ('mino_fx', 'traza', 'assets/vfx/bosses/laberinto', True),
    'csMinoRage':    ('mino_fx', 'aura', 'assets/vfx/bosses/laberinto', False),
    'csDragoncitoShot': ('dragoncito_fx', 'proyectil', 'assets/vfx/enemies/hielo', False),
    'csDragoncitoHit':  ('dragoncito_fx', 'impacto', 'assets/vfx/enemies/hielo', False),
    'csAngelShot':   ('angel_hielo_fx', 'proyectil', 'assets/vfx/enemies/hielo', False),
    'csAngelNova':   ('angel_hielo_fx', 'nova', 'assets/vfx/enemies/hielo', False),
    'csHadaShot':    ('hadas_fx', 'proyectil', 'assets/vfx/enemies/bosque', False),
    'csHadaBurst':   ('hadas_fx', 'estallido', 'assets/vfx/enemies/bosque', False),
    'csGolemFireShot': ('golem_fuego_fx', 'proyectil', 'assets/vfx/enemies/infernal', False),
    'csGolemFireHit':  ('golem_fuego_fx', 'impacto', 'assets/vfx/enemies/infernal', False),
    'csRockImpact':  ('golem_piedra_fx', 'impacto', 'assets/vfx/enemies/laberinto', True),
}
# proyectiles de los enemigos a distancia con arte de su propia hoja
PROJ = {'dragoncito_hielo': 'csDragoncitoShot', 'angel_hielo': 'csAngelShot', 'enjambre_hadas': 'csHadaShot', 'cristal_volador': 'bsMagoLance'}

if __name__ == '__main__':
    src = sys.argv[1]; meta = json.load(open(os.path.join(src, 'meta.json')))
    js = ['"use strict";', '/* GENERADO por tools/art/pack_canon/build.py (no editar a mano). Canon elegido en', '   LA_HORDA_SPRITE_CANON.md; se suma a los atlas de las hojas de jefes. */', 'Object.assign(BOSS_SHEET_ATLAS, {']
    paths = []
    for ent, (folder, dest, sets, hmul) in ATLAS.items():
        frames, idx, out_sets = [], {}, {}
        for k, lst in sets.items():
            out_sets[k] = []
            for sec, i in lst:
                files = meta[folder].get(sec, [])
                if i >= len(files): continue
                if (sec, i) not in idx:
                    idx[(sec, i)] = len(frames); frames.append(clean(Image.open(os.path.join(src, folder, files[i]['file'])).convert('RGBA')))
                out_sets[k].append(idx[(sec, i)])
        out_sets = {k: v for k, v in out_sets.items() if v}
        atlas, w, h = pack(frames, 8)
        os.makedirs(os.path.join(REPO, dest), exist_ok=True); atlas.save(os.path.join(REPO, dest, 'atlas.png'), optimize=True); paths.append(f'{dest}/atlas.png')
        hs = sorted(frames[j].height for j in out_sets['walk']); refH = hs[len(hs) // 2]
        m = {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 2) / h, 4), "sets": out_sets}
        js.append(f'  {ent}: {{src:"{dest}/atlas.png", hMul:{hmul}, meta:{json.dumps(m, separators=(",", ":"))}}},')
        print(ent, atlas.size, {k: len(v) for k, v in out_sets.items()})
    js += ['});', 'Object.assign(BOSS_SHEET_FX, {']
    for key, (folder, sec, dest, ground) in FX.items():
        os.makedirs(os.path.join(REPO, dest), exist_ok=True); ps = []
        for i, f in enumerate(meta[folder][sec]):
            p = f'{dest}/{key}_{i}.png'; Image.open(os.path.join(src, folder, f['file'])).convert('RGBA').save(os.path.join(REPO, p), optimize=True); ps.append(p)
        paths += ps; js.append(f'  {key}: {{ground:{str(ground).lower()}, srcs:{json.dumps(ps)}}},')
    js += ['});', f'const ENEMY_PROJ_SPRITE = {json.dumps(PROJ)};']
    open(os.path.join(REPO, 'js', 'assets', 'canon-sheets-meta.js'), 'w').write('\n'.join(js) + '\n')
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); m = open(mp).read()
    A, B = '  // >>> canon del pack (tools/art/pack_canon/build.py)\n', '  // <<< canon del pack\n'
    block = A + ''.join(f'  "{q}",\n' for q in paths) + B
    m = (m[:m.index(A)] + block + m[m.index(B) + len(B):]) if A in m else m.replace('const ASSET_MANIFEST = [\n', 'const ASSET_MANIFEST = [\n' + block, 1)
    open(mp, 'w').write(m)
