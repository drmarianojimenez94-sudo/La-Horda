"""Arma los atlas de juego desde los cuadros de extract.py (hoja IMG 1-3: muertes del Laberinto, Hadas,
Cù-Sìth y efectos) y escribe js/assets/bestias-meta.js + su bloque en js/assets/asset-manifest.js.
Qué se usa y qué no (decidido contra el canon ya integrado, ver LA_HORDA_SPRITE_CANON.md):
- Hadas de Escarcha (entidad NUEVA, Gélida): fila grande azul (vuelo + muerte, misma escala).
- Enjambre de Hadas (Bosque): las variantes verde/rosa/oro reemplazan a las hadas azules de antes
  (el azul queda para la Gélida: cada arena con su color).
- Cù-Sìth: mismo dibujo, recortado de la versión completa de IMG 3 (corrida 4 + hurt 2).
- Dragoncito y Ángel de Hielo: NO se reemplazan (su set de la hoja IMG 2 completa tiene frente, espalda,
  hurt y cast; la versión de esta hoja es otro dibujo con menos animaciones). Se usan sus efectos.
- Dama del Bosque: NO se reemplaza (set completo RD6); se usa el hechizo verde como proyectil.
- Minotauro: NO se toca (su atlas v3 ya trae una muerte de 4 cuadros del mismo diseño).

- Un atlas por entidad: celdas uniformes, figura centrada por su centro de masa horizontal y apoyada
  abajo (pies / base del estallido en el piso de la celda). Mismo formato que enemyAtlasPackLoad.
- Escala: cada entidad usa la escala nativa de su panel. Cuando un set viene dibujado a otra escala en
  la hoja (muerte del Cù-Sìth y de las hadas de color), se reduce a la escala del set de caminata
  (reducción por área sobre alfa premultiplicado + alfa nítido otra vez: sin bordes sucios).
- Hadas de color del Bosque (verde, rosa, oro): su muerte es la de la fila grande con el tono rotado.
- Muertes del Laberinto: atlas chicos de solo muerte (DEATH_PACK) para Esfinge, Medusa y Druida de
  Arena (antes no tenían muerte animada); el cuerpo vivo sigue con su arte de siempre.
- Efectos (FX) sueltos para vfxSprite: aliento del Dragoncito, prisma del Ángel, mordida del Cù-Sìth,
  hechizo de la Dama.
usage: python3 build.py <frames_dir>
"""
import colorsys, json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'frames')
META = json.load(open(os.path.join(FR, 'meta.json')))

def fr(ent, sec, i): return Image.open(os.path.join(FR, ent, META[ent][sec][i]['file'])).convert('RGBA')

def shrink(im, k):
    """Reduce por área con alfa premultiplicado y vuelve a alfa nítido (0/255)."""
    a = np.array(im).astype(float); al = a[..., 3:4] / 255.0
    pm = np.concatenate([a[..., :3] * al, al * 255], -1).astype(np.float32)
    W, H = max(1, round(im.width * k)), max(1, round(im.height * k))
    ch = [np.array(Image.fromarray(pm[..., c]).resize((W, H), Image.BOX)) for c in range(4)]
    al2 = ch[3] / 255.0
    rgb = np.stack([np.where(al2 > 0.01, ch[c] / np.maximum(al2, 1e-3), 0) for c in range(3)], -1)
    out = np.dstack([np.clip(rgb, 0, 255), np.where(al2 >= 0.5, 255, 0)]).astype(np.uint8)
    return trim(Image.fromarray(out, 'RGBA'))

def trim(im):
    bb = im.getbbox(); return im.crop(bb) if bb else im

def hue(im, target):
    """Rota el tono de lo saturado hacia `target` (0-1); lo gris/blanco queda igual."""
    a = np.array(im).astype(float) / 255.0
    out = a.copy()
    rgb = a[..., :3].reshape(-1, 3)
    res = np.empty_like(rgb)
    for i, (r, g, b) in enumerate(rgb):
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        res[i] = colorsys.hsv_to_rgb(target if s > 0.12 else h, s, v)
    out[..., :3] = res.reshape(a.shape[:2] + (3,))
    return Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')

def com_x(im):
    a = np.array(im)[..., 3] > 0; xs = np.nonzero(a)[1]
    return float(xs.mean()) if len(xs) else im.width / 2

def pack(frames, cols=8, pad=2):
    """Celdas uniformes; cada cuadro con su centro de masa en el medio y apoyado abajo."""
    half = max(max(com_x(f), f.width - com_x(f)) for f in frames)
    w = int(np.ceil(half * 2)) + pad * 2; h = max(f.height for f in frames) + pad * 2
    rows = (len(frames) + cols - 1) // cols
    atlas = Image.new('RGBA', (w * min(cols, len(frames)), h * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        cx, cy = (i % cols) * w, (i // cols) * h
        atlas.alpha_composite(f, (int(round(cx + w / 2 - com_x(f))), cy + h - pad - f.height))
    return atlas, w, h

def build(dest, sets, hmul, ref_set='walk', cols=8):
    frames, idx, out = [], {}, {}
    for k, lst in sets.items():
        out[k] = []
        for key, im in lst:
            if key not in idx: idx[key] = len(frames); frames.append(im)
            out[k].append(idx[key])
    atlas, w, h = pack(frames, cols)
    os.makedirs(os.path.join(REPO, dest), exist_ok=True)
    atlas.save(os.path.join(REPO, dest, 'atlas.png'), optimize=True)
    hs = sorted(frames[j].height for j in out[ref_set]); refH = hs[len(hs) // 2]
    meta = {"w": w, "h": h, "cols": cols, "refH": refH, "anchor": round((h - 2) / h, 4), "sets": out}
    print(dest, atlas.size, {k: len(v) for k, v in out.items()})
    return {"src": f"{dest}/atlas.png", "hMul": hmul, "meta": meta}

F = lambda ent, sec, idxs, t=None: [((ent, sec, i, t), (t(fr(ent, sec, i)) if t else fr(ent, sec, i))) for i in idxs]

if __name__ == '__main__':
    A, D, FX = {}, {}, {}
    # ---------------- Hielo ----------------
    # (Dragoncito y Ángel de Hielo conservan su set completo de la hoja IMG 2 completa: de esta hoja
    #  solo se toman sus efectos, para las conductas nuevas.)
    A['hada_escarcha'] = build('assets/sprites/enemies/hielo/hada_escarcha', {
        'idle': F('hadas_grandes', 'fly', [0, 1, 2, 1]), 'walk': F('hadas_grandes', 'fly', [0, 1, 2, 1]),
        'atk': F('hadas_grandes', 'fly', [2, 0]), 'hit': F('hadas_grandes', 'fly', [1]),
        'death': F('hadas_grandes', 'death', [0, 1, 2, 3])}, 2.9)
    # ---------------- Bosque: hadas de color (un atlas, tres paletas) ----------------
    big_h = np.median([META['hadas_grandes']['fly'][i]['h'] for i in range(3)])
    var_h = np.median([f['h'] for f in META['hadas_var']['verde']])
    k = var_h / big_h
    tones = {'verde': 0.36, 'rosa': 0.86, 'oro': 0.12}
    hsets = {}
    for pal, tone in tones.items():
        dz = lambda im, tone=tone: shrink(hue(im, tone), k)
        hsets[pal] = {'idle': F('hadas_var', pal, [0, 1, 2, 3]), 'walk': F('hadas_var', pal, [0, 1, 2, 3]),
                      'atk': F('hadas_var', pal, [2, 0]), 'hit': F('hadas_var', pal, [1]),
                      'death': F('hadas_var', pal, [0]) + [((('hd', pal, i)), dz(fr('hadas_grandes', 'death', i))) for i in (1, 2, 3)]}
    allsets = {}
    for pal, s in hsets.items():
        for name, lst in s.items(): allsets[name + '_' + pal] = lst
    allsets['walk'] = hsets['verde']['walk']
    H = build('assets/sprites/enemies/bosque/enjambre_hadas/v3', allsets, 2.8, ref_set='walk')
    for pal in tones:
        m = dict(H['meta']); m['sets'] = {n: H['meta']['sets'][n + '_' + pal] for n in ('idle', 'walk', 'atk', 'hit', 'death')}
        A['enjambre_hadas' + ('' if pal == 'verde' else '_' + pal)] = {"src": H['src'], "hMul": H['hMul'], "meta": m}
    # ---------------- Bosque: Cù-Sìth y Dama ----------------
    run_h = np.median([f['h'] for f in META['cusith']['run']])
    kc = run_h / META['cusith']['death'][0]['h'] * 1.08     # la muerte viene dibujada más grande en la hoja
    dc = lambda im: shrink(im, kc)
    A['cu_sith'] = build('assets/sprites/enemies/bosque/cu_sith/v3', {
        'idle': F('cusith', 'run', [0, 2]), 'walk': F('cusith', 'run', [0, 1, 2, 3]),
        'atk': F('cusith', 'bite', [0, 1]), 'hit': F('cusith', 'hurt', [0, 1]),
        'howl': F('cusith', 'bite', [1]), 'death': F('cusith', 'death', [0, 1, 2, 3], dc)}, 2.45)
    # ---------------- Laberinto: solo muertes ----------------
    for ent, dest, hm in (('esfinge_muerte', 'enemies/laberinto/esfinge/muerte', 2.55), ('medusa_muerte', 'enemies/laberinto/medusa/muerte', 2.5),
                          ('druida_muerte', 'enemies/laberinto/druida_arena/muerte', 2.5)):
        D[ent.replace('_muerte', '').replace('druida', 'druida_arena')] = build('assets/sprites/' + dest, {'death': F(ent, 'death', [0, 1, 2, 3]), 'walk': F(ent, 'death', [0])}, hm)
    # ---------------- Efectos ----------------
    fxd = {'hielo': 'assets/vfx/enemies/hielo', 'bosque': 'assets/vfx/enemies/bosque'}
    for key, ent, sec, arena, ground in (('hbDragAliento', 'dragoncito_fx', 'aliento', 'hielo', False),                                          ('hbAngelPrisma', 'angel_fx', 'impacto', 'hielo', True), ('hbCuMordida', 'cusith_fx', 'mordida', 'bosque', False),
                                         ('hbDamaHechizo', 'dama_fx', 'hechizo', 'bosque', False)):
        os.makedirs(os.path.join(REPO, fxd[arena]), exist_ok=True); ps = []
        for i in range(len(META[ent][sec])):
            p = f'{fxd[arena]}/{key}_{i}.png'; fr(ent, sec, i).save(os.path.join(REPO, p), optimize=True); ps.append(p)
        FX[key] = {"ground": ground, "srcs": ps}
    js = ['"use strict";',
          '/* GENERADO por tools/art/hoja_bestias/build.py (no editar a mano). Hoja IMG 1-3 del equipo:',
          '   Hadas de Escarcha, Enjambre de Hadas (verde/rosa/oro), Cù-Sìth, muertes del Laberinto y efectos.',
          '   Va DESPUÉS de canon-sheets-meta.js y ANTES de boss-sheets.js (que carga BOSS_SHEET_ATLAS). */',
          'Object.assign(BOSS_SHEET_ATLAS, {']
    for k2, v in A.items(): js.append(f'  {k2}: {json.dumps(v, separators=(",", ":"))},')
    js += ['});', 'Object.assign(BOSS_SHEET_FX, {']
    for k2, v in FX.items(): js.append(f'  {k2}: {json.dumps(v, separators=(",", ":"))},')
    js += ['});', '// Muertes de 4 cuadros para cuerpos que siguen con su arte de siempre (drawDeathPack).', 'const DEATH_PACK_META = {']
    for k2, v in D.items(): js.append(f'  {k2}: {json.dumps(v, separators=(",", ":"))},')
    js += ['};']
    open(os.path.join(REPO, 'js', 'assets', 'bestias-meta.js'), 'w').write('\n'.join(js) + '\n')
    paths = sorted({v['src'] for v in A.values()} | {v['src'] for v in D.values()} | {p for v in FX.values() for p in v['srcs']})
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); m = open(mp).read()
    S0, S1 = '  // >>> hoja de bestias (tools/art/hoja_bestias/build.py)\n', '  // <<< hoja de bestias\n'
    block = S0 + ''.join(f'  "{q}",\n' for q in paths) + S1
    m = (m[:m.index(S0)] + block + m[m.index(S1) + len(S1):]) if S0 in m else m.replace('const ASSET_MANIFEST = [\n', 'const ASSET_MANIFEST = [\n' + block, 1)
    open(mp, 'w').write(m)
    print('manifest +', len(paths))
