"""Skins de set (art-source/skins_sets/): recorte + atlas en el formato de CHAMP_PACK.

Las 4 hojas traen la misma grilla "SPRITES BÁSICOS (8 direcciones)": 6 columnas de vista
(frente, frente diag, perfil der, espalda diag, espalda, perfil izq) x filas de estado (idle,
caminata, corrida, ataque básico, casteo, daño, muerte), UN cuadro por celda. La fila de muerte
es una secuencia (de pie -> caído -> se deshace), no direcciones.
Eren (Titán Bestia) trae además la forma titán (filas de 4-6 cuadros sin grilla) y la fila ULTI
(humano -> titán), que se usa como transformación reescalada a la escala del titán.

Cada celda se recorta con la máscara u2net del motor de tools/art/hielo_jefes/extract.py; la
muerte y los golpes suman lo que brilla (partículas/filo).
Escribe assets/sprites/champions/<campeón>/skins/<set>/atlas.png (+ titan.png para Eren),
un retrato de preview y js/assets/set-skins-meta.js (champPackLoadAtlas + SET_SKINS).
usage: python3 extract.py <frames_dir>
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'hielo_jefes'))
import extract as X
from build import pack, REPO
X.ROOT = os.path.join(REPO, 'art-source', 'skins_sets')

VIEWS = ['frente', 'frente_diag', 'perfil_der', 'espalda_diag', 'espalda', 'perfil_izq']
# hoja -> (set, campeón, clave del pack base, líneas de columnas (7), filas {estado: (y0, y1)}, rect del concepto, nombre)
SKINS = {
    'sylva_flecha_de_fuego': ('manada', 'cazadora', 'cazadora', [381, 444, 516, 589, 671, 748, 822],
        {'idle': (117, 187), 'walk': (187, 249), 'run': (249, 311), 'atk': (311, 373), 'cast': (373, 438), 'hit': (438, 502), 'death': (502, 581)},
        (14, 56, 312, 520), 'Sylva, Flecha de Fuego'),
    'musashi_samurai_legendario': ('errante', 'musashi', 'musashi', [381, 444, 514, 588, 669, 745, 820],
        {'idle': (119, 187), 'walk': (187, 247), 'run': (247, 307), 'atk': (307, 370), 'cast': (370, 432), 'hit': (432, 494), 'death': (494, 574)},
        (14, 60, 312, 500), 'Musashi, Samurái Legendario'),
    'eren_titan_bestia': ('legion', 'eren', 'eren', [346, 412, 486, 557, 634, 703, 772],
        {'idle': (103, 169), 'walk': (169, 227), 'run': (227, 286), 'atk': (286, 340), 'cast': (340, 398), 'hit': (398, 457), 'death': (457, 530)},
        (14, 78, 280, 460), 'Eren, Titán Bestia'),
    'axiom_skin_z': ('sistema', 'axiom', 'axiom', [431, 506, 581, 654, 727, 799, 872],
        {'idle': (119, 191), 'walk': (191, 256), 'run': (256, 321), 'atk': (321, 382), 'hit': (382, 447), 'death': (447, 529)},
        (14, 58, 358, 470), 'Axiom, Skin Z · Realidad Corrupta'),
}
# forma titán de Eren: filas (y0, y1, cuadros) entre x 395..768; ULTI: humano -> titán
TITAN_X = (395, 768)
TITAN_ROWS = {'idle': (619, 667, 6), 'walk': (667, 717, 6), 'atk1': (717, 763, 4), 'atk2': (763, 807, 4),
              'atk3': (807, 851, 5), 'skill': (851, 897, 4), 'hit': (897, 948, 4), 'death': (948, 1000, 4)}
ULT_ROW = ((782, 540, 1528, 640), 7)

def cell(rgb, glow, box, glow_add=False, inset=3):
    x0, y0, x1, y1 = box; cx0, cy0, cx1, cy1 = x0 + inset, y0 + inset, x1 - inset, y1 - inset
    mk, (X0, Y0, X1, Y1) = X.u2net_mask(rgb, (cx0, cy0, cx1, cy1), pad=0)
    full = np.zeros(rgb.shape[:2], bool); full[Y0:Y1, X0:X1] = mk
    alpha = full.astype(float)
    if glow_add:   # partículas / filo que brillan: con su alfa suave
        g = np.zeros(rgb.shape[:2]); g[cy0:cy1, cx0:cx1] = glow[cy0:cy1, cx0:cx1]
        alpha = np.maximum(alpha, (g > 0.35) * g); full = full | (g > 0.35)
    lim = np.zeros_like(full); lim[cy0:cy1, cx0:cx1] = True; full &= lim
    lb, k = ndimage.label(full, X.N8)   # fuera las motas sueltas (restos del fondo de la celda)
    if k > 1:
        sizes = ndimage.sum(full, lb, range(1, k + 1)); big = sizes.max()
        full = np.isin(lb, [i + 1 for i in range(k) if sizes[i] >= max(12, big * 0.02)])
    return X.crop(rgb, alpha, full)

_pc = None
def row_split(name, rect, n, typ):
    """Fila sin grilla: separación por figuras (run_split de tools/art/pack_canon/extract.py)."""
    global _pc
    if _pc is None:
        from importlib import util
        spec = util.spec_from_file_location('pc_extract', os.path.join(HERE, '..', 'pack_canon', 'extract.py'))
        _pc = util.module_from_spec(spec); spec.loader.exec_module(_pc)
        X.ROOT = os.path.join(REPO, 'art-source', 'skins_sets')
    return [im for im, _ in _pc.run_split(name, 'x', 'y', rect, n, typ, None)]

if __name__ == '__main__':
    X.BG_PCT, X.BG_SIZE = 50, 41   # solo hace falta para el brillo (muertes/golpes); las celdas usan u2net
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    REUSE = '--reuse' in sys.argv   # reusa los recortes ya hechos en <frames_dir> (solo rearma atlas + meta)
    js = ['"use strict";', '/* GENERADO por tools/art/skins_sets/extract.py (no editar a mano).',
          '   Skins de set completo: atlas con el mismo formato que el del campeón base (CHAMP_PACK).',
          '   SET_SKINS[set].packs remapea la clave del atlas base a la de la skin (ver set-effects.js). */']
    reg, manifest = {}, []
    for name, (setId, champ, baseKey, cols, rows, concept, title) in SKINS.items():
        rgb = np.array(Image.open(os.path.join(X.ROOT, name + '.png')).convert('RGB'))   # el fondo/brillo se calcula solo si hace falta recortar
        glow = lambda: (X.sheet(name), X._cache[name + ':glow'])[1]
        frames, sets, idx = [], {}, {}
        def add(im):
            frames.append(im); return len(frames) - 1
        cellims = {}
        for st, (y0, y1) in rows.items():
            for ci, view in enumerate(VIEWS):
                fp = os.path.join(out, f'{setId}_{st}_{view}.png')
                if REUSE and os.path.exists(fp): cellims[(st, view)] = Image.open(fp).convert('RGBA'); continue
                res = cell(rgb, glow(), (cols[ci], y0, cols[ci + 1], y1), glow_add=st in ('death', 'atk', 'cast'))
                if not res: continue
                res[0].save(fp); cellims[(st, view)] = res[0]
        # recortes fallidos (u2net se quedó con un pedazo): afuera; el set usa la vista vecina
        ref = float(np.median([im.height for (st, v), im in cellims.items() if st == 'idle']))
        for key, im in cellims.items():
            if key[0] != 'death' and (im.height < ref * 0.62 or im.width < ref * 0.3):
                print('  descartado', setId, key, im.size); continue
            idx[key] = add(im)
        g = lambda st, v: [idx[(st, v)]] if (st, v) in idx else []
        for d, v in (('down', 'frente'), ('side', 'perfil_der'), ('left', 'perfil_izq'), ('up', 'espalda')):
            sets['idle_' + d] = g('idle', v)
            sets['walk_' + d] = g('walk', v) + g('run', v)          # paso corto -> paso largo
            sets['attack_' + d] = g('idle', v) + g('atk', v) + g('atk', v)   # preparación -> golpe
            if ('cast', v) in idx: sets['cast_' + d] = g('idle', v) + g('cast', v) + g('cast', v)
            sets['hit_' + d] = g('hit', v)
        sets['death_down'] = [idx[('death', v)] for v in VIEWS if ('death', v) in idx]
        sets['run'] = g('walk', 'perfil_der') + g('run', 'perfil_der')
        # estados propios del kit base que la hoja de la skin no dibuja: pose más cercana
        cast_or_atk = sets.get('cast_side') or sets['attack_side']
        if champ == 'cazadora': sets['aim'] = cast_or_atk[1:2]
        if champ == 'eren':
            sets.update({'hook_prep': cast_or_atk[:2], 'hook_launch': sets['attack_side'][1:2], 'hook_fly': sets['run'],
                         'hook_slash': sets['attack_side'][1:], 'hook_land': sets['idle_side'], 'instinct': cast_or_atk,
                         'advance': sets['run'], 'bite': cast_or_atk, 'exhausted': sets['hit_down'] + sets['hit_down'],
                         'aim': cast_or_atk[1:2]})
        sets = {k: v for k, v in sets.items() if v}
        atlas, w, h = pack(frames, 8)
        dest = f'assets/sprites/champions/{champ}/skins/{setId}'
        os.makedirs(os.path.join(REPO, dest), exist_ok=True)
        atlas.save(os.path.join(REPO, dest, 'atlas.png'), optimize=True); manifest.append(f'{dest}/atlas.png')
        hs = sorted(frames[j].height for j in sets['walk_down'] + sets['walk_side']); refH = hs[len(hs) // 2]
        meta = {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 2) / h, 4), "sets": sets}
        key = f'skin_{setId}'
        js.append(f'champPackLoadAtlas("{key}", "{dest}/atlas.png", {json.dumps(meta, separators=(",", ":"))});')
        packs = {baseKey: key}
        # retrato (panel de concepto) para la tienda / el inventario
        prev = Image.fromarray(rgb[concept[1]:concept[3], concept[0]:concept[2]])
        prev.thumbnail((220, 320), Image.LANCZOS); prev.save(os.path.join(REPO, dest, 'preview.png'), optimize=True)
        manifest.append(f'{dest}/preview.png')
        print(setId, atlas.size, 'cell', w, h, 'refH', refH, {k: len(v) for k, v in sets.items()})
        if champ == 'eren':   # forma titán + transformación
            tf, ts, tidx = [], {}, {}
            for st, (y0, y1, n) in TITAN_ROWS.items():
                typ = 'fig0' if st in ('death', 'skill', 'atk3') else 'figfx'
                cached = [os.path.join(out, f'{setId}_titan_{st}_{i}.png') for i in range(n)]
                if REUSE and os.path.exists(cached[0]): ims = [Image.open(f).convert('RGBA') for f in cached if os.path.exists(f)]
                else: ims = row_split(name, (TITAN_X[0], y0, TITAN_X[1], y1), n, typ)
                for i, im in enumerate(ims):
                    im.save(os.path.join(out, f'{setId}_titan_{st}_{i}.png')); tidx[(st, i)] = len(tf); tf.append(im)
            T = lambda st, a, b: [tidx[(st, i)] for i in range(a, b) if (st, i) in tidx]
            ref_titan = np.median([tf[j].height for j in T('idle', 0, 3)])
            (ux0, uy0, ux1, uy1), un = ULT_ROW
            uc = [os.path.join(out, f'{setId}_ult_{i}.png') for i in range(un)]
            if REUSE and os.path.exists(uc[0]): ult = [Image.open(f).convert('RGBA') for f in uc if os.path.exists(f)]
            else:
                ult = row_split(name, (ux0, uy0, ux1, uy1), un, 'figfx')
                for i, im in enumerate(ult): im.save(uc[i])
            big = [im for im in ult[2:]]
            if big:
                k = ref_titan / np.median([im.height for im in big[:3]])
                for i, im in enumerate(big):
                    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
                    im.save(os.path.join(out, f'{setId}_titan_tf_{i}.png')); tidx[('tf', i)] = len(tf); tf.append(im)
            ts = {'idle_down': T('idle', 0, 3), 'walk_down': T('walk', 0, 3), 'walk_side': T('walk', 0, 3), 'walk_up': T('walk', 0, 3),
                  'atk': T('atk1', 0, 4), 'sismo': T('atk3', 0, 5), 'terremoto': T('skill', 0, 4), 'retumbar': T('atk2', 0, 4),
                  'roar': T('idle', 0, 1), 'tf': T('tf', 0, 8), 'hit_down': T('hit', 0, 3), 'death_down': T('death', 0, 4)}
            ts = {k: v for k, v in ts.items() if v}
            atlas, w, h = pack(tf, 8)
            atlas.save(os.path.join(REPO, dest, 'titan.png'), optimize=True); manifest.append(f'{dest}/titan.png')
            hs = sorted(tf[j].height for j in ts['walk_down']); refH = hs[len(hs) // 2]
            meta = {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 2) / h, 4), "sets": ts}
            js.append(f'champPackLoadAtlas("{key}_titan", "{dest}/titan.png", {json.dumps(meta, separators=(",", ":"))});')
            packs['eren_titan'] = key + '_titan'
            print(setId + '_titan', atlas.size, 'cell', w, h, 'refH', refH, {k: len(v) for k, v in ts.items()})
        reg[setId] = {'champ': champ, 'name': title, 'src': f'{dest}/preview.png', 'preview': f'{dest}/preview.png', 'packs': packs}
    js.append(f'Object.assign(SET_SKINS, {json.dumps(reg, ensure_ascii=False, indent=1)});')
    open(os.path.join(REPO, 'js', 'assets', 'set-skins-meta.js'), 'w').write('\n'.join(js) + '\n')
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); m = open(mp).read()
    A, B = '  // >>> skins de set (tools/art/skins_sets/extract.py)\n', '  // <<< skins de set\n'
    block = A + ''.join(f'  "{q}",\n' for q in manifest) + B
    m = (m[:m.index(A)] + block + m[m.index(B) + len(B):]) if A in m else m.replace('const ASSET_MANIFEST = [\n', 'const ASSET_MANIFEST = [\n' + block, 1)
    open(mp, 'w').write(m)
