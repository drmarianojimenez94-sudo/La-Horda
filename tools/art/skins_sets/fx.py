"""Efectos de habilidad de las skins de set (panel "Efectos y proyectiles" de cada hoja).

Mismo criterio que el resto de las hojas: el efecto se recorta con el ALFA DE BRILLO del motor de
tools/art/hielo_jefes/extract.py (lo que brilla sobre el fondo oscuro del panel), sin personaje.
Cada clip es una lista de cajas de la hoja (un cuadro por caja, en orden). Las cajas salen de
`--scan` (detección de componentes con número, para elegir a ojo) y quedan fijas en CLIPS.

usage:
  python3 fx.py --scan <out_dir>     # hojas con cada efecto numerado + boxes.json
  python3 fx.py                      # recorta CLIPS -> assets/vfx/skins/<set>/ + js/assets/skin-fx-meta.js
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'hielo_jefes'))
import extract as X
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
X.ROOT = os.path.join(REPO, 'art-source', 'skins_sets')

# hoja -> (set, rect del panel de efectos)
PANELS = {
    'sylva_flecha_de_fuego': ('manada', (10, 660, 760, 990)),
    'musashi_samurai_legendario': ('errante', (10, 655, 820, 1000)),
    'eren_titan_bestia': ('legion', (780, 670, 1140, 1000)),
    'axiom_skin_z': ('sistema', (735, 815, 1240, 1010)),
    'profeta_angel_caido': ('profecia', (370, 690, 1000, 990)),
    'mago_angel_arcano': ('convergencia', (80, 600, 610, 1000)),
    'segador_leonidas': ('marea', (100, 650, 770, 1000)),
    'guerrero_jack_destripador': ('nocturno', (110, 660, 740, 1000)),
    'soporte_angel_del_alba': ('custodio', (80, 600, 600, 1000)),
}

def comps(name, rect, dil=2, min_area=90, thr=0.45):
    X.sheet(name); g = X._cache[name + ':glow']
    x0, y0, x1, y1 = rect; sub = g[y0:y1, x0:x1]
    fg = X.drop_lines(sub > thr)
    grp = ndimage.binary_dilation(fg, X.N8, iterations=dil)
    lb, k = ndimage.label(grp, X.N8); out = []
    for i, sl in enumerate(ndimage.find_objects(lb), 1):
        if not sl: continue
        m = (lb[sl] == i) & fg[sl]
        if m.sum() < min_area: continue
        ys, xs = np.nonzero(m)
        out.append((int(x0 + sl[1].start + xs.min()), int(y0 + sl[0].start + ys.min()),
                    int(x0 + sl[1].start + xs.max() + 1), int(y0 + sl[0].start + ys.max() + 1)))
    out.sort(key=lambda b: (round(b[1] / 40), b[0]))
    return out

def cut(name, box, pad=3):
    """Un cuadro: alfa de brillo dentro de la caja (solo lo conectado a lo que brilla fuerte)."""
    rgb, _, _ = X.sheet(name); g = X._cache[name + ':glow']
    x0, y0, x1, y1 = box; H, W = g.shape
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    a = g[y0:y1, x0:x1].copy()
    a = np.clip(a * 1.25, 0, 1)
    m = X.drop_lines(a > 0.06)   # fuera las líneas del panel que cruzan la caja
    # color: lo oscuro del borde del brillo se aclara hacia el tono del efecto (sin halo negro)
    c = rgb[y0:y1, x0:x1].astype(float)
    mx = c.max(-1, keepdims=True); lift = np.clip(150 - mx, 0, None) * (c / np.maximum(mx, 1))
    c = np.clip(c + lift * (a[..., None] < 0.7), 0, 255).astype(np.uint8)
    res = X.crop(c, a, m, pad=1)
    return res[0] if res else None

# ---------------------------------------------------------------------------------------------
# CLIPS: set -> {clip: {"boxes": [cajas de la hoja...], "ground": bool}}
# (cajas elegidas con --scan; ver docs/assets_faltantes/skins_sets/ para el uso por habilidad)
CLIPS = {}
try:
    from fx_clips import CLIPS   # noqa: F811  (tabla aparte, generada/curada a mano)
except ImportError:
    pass

if __name__ == '__main__':
    X.BG_PCT, X.BG_SIZE = 50, 41
    if '--scan' in sys.argv:
        out = sys.argv[sys.argv.index('--scan') + 1]; os.makedirs(out, exist_ok=True); allb = {}
        for name, (setId, rect) in PANELS.items():
            rgb, _, _ = X.sheet(name); x0, y0, x1, y1 = rect
            b = comps(name, rect); allb[setId] = b
            im = Image.fromarray(rgb[y0:y1, x0:x1]).resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.NEAREST); d = ImageDraw.Draw(im)
            for i, (a0, b0, a1, b1) in enumerate(b):
                d.rectangle([(a0 - x0) * 2, (b0 - y0) * 2, (a1 - x0) * 2, (b1 - y0) * 2], outline=(0, 255, 0))
                d.text(((a0 - x0) * 2 + 3, (b0 - y0) * 2 + 2), str(i), fill=(255, 255, 0))
            im.save(os.path.join(out, f'scan_{setId}.png'))
            print(setId, len(b))
        json.dump(allb, open(os.path.join(out, 'boxes.json'), 'w'))
        sys.exit(0)
    js = ['"use strict";', '/* GENERADO por tools/art/skins_sets/fx.py (no editar a mano).',
          '   Efectos de habilidad de las skins de set: se suman a VFX_SPR_EXTRA (carga diferida) en skin-fx.js. */',
          'const SKIN_FX_SRC = {']
    manifest = []
    sheet_of = {v[0]: k for k, v in PANELS.items()}
    for setId, clips in CLIPS.items():
        name = sheet_of[setId]; dest = f'assets/vfx/skins/{setId}'
        os.makedirs(os.path.join(REPO, dest), exist_ok=True)
        for clip, spec in clips.items():
            srcs = []
            for i, box in enumerate(spec['boxes']):
                im = cut(name, box)
                if im is None: continue
                f = f'{dest}/{clip}_{i}.png'; im.save(os.path.join(REPO, f), optimize=True); srcs.append(f)
            key = f'sk_{setId}_{clip}'
            js.append(f'  {key}: {json.dumps({"ground": bool(spec.get("ground")), "srcs": srcs})},')
            manifest += srcs
            print(key, len(srcs))
    js.append('};')
    open(os.path.join(REPO, 'js', 'assets', 'skin-fx-meta.js'), 'w').write('\n'.join(js) + '\n')
    print('frames', len(manifest))
