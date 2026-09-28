#!/usr/bin/env python3
"""CROMAS de guardianes: variantes de color derivadas por RECOLOREO de paleta del atlas existente.

No se redibuja nada: cada croma toma el/los PNG del guardián base y mueve SOLO las bandas de tono
que definen su vestimenta (capa, capucha, armadura, brillo mágico) hacia la paleta de uno de los
cristales de los Guardianes (docs/lore/LA_HORDA_LORE_BIBLE.md §3):
    Ancestral = verde bosque / jade      Escarcha = celeste hielo
    Piedra    = ámbar / bronce           Juicio   = oro blanco (marfil + dorado pálido)
La piel, el pelo, los metales neutros y el contorno quedan como están (se protege por tono y
saturación); los bordes de cada banda se funden (sin cortes duros) y la luz/sombra de cada píxel
se conserva, así la croma sigue siendo el mismo pixel art con otra tela.

Salida:
  assets/sprites/champions/<guardián>/cromas/<cristal>/<archivo>.png  (mismo tamaño y grilla que el base)
  assets/sprites/champions/<guardián>/cromas/<cristal>/preview.png    (cuadro quieto ampliado x3, tienda)
  js/assets/croma-skins-meta.js                                       (registro CROMA_SKINS, generado)
Auditoría: tools/art/skin_audit.js (dibuja cada croma con el código del juego) y tools/items/t_cromas.js.
usage: python3 tools/art/cromas/build.py [--sheet carpeta]   (--sheet: hoja de contacto base vs cromas)
"""
import json, os, sys
import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
CH = 'assets/sprites/champions'
# precio en oro del juego (cosmético puro: no da poder; nunca plata real)
PRICE = 1500

# Cuadro quieto de frente de cada base (para el preview): (png, x, y, w, h) en píxeles del atlas.
def grid(png, fw, fh, cols, i):
    return (png, (i % cols) * fw, (i // cols) * fh, fw, fh)
PREVIEW = {
    'tanque': ('%s/tanque/atlas.png' % CH, 32, 43, 168, 202),
    'nigromante': grid('%s/nigromante/v2/atlas.png' % CH, 161, 114, 8, 18),
    'libertador': grid('%s/libertador/v2/atlas.png' % CH, 103, 98, 8, 34),
    'segador': grid('%s/segador/v2/atlas.png' % CH, 91, 107, 8, 17),
    'musashi': grid('%s/musashi/v2/atlas.png' % CH, 91, 91, 8, 17),
    'profeta': grid('%s/profeta/v2/atlas.png' % CH, 93, 133, 8, 17),
    'cazadora': grid('%s/cazadora/v2/atlas.png' % CH, 90, 94, 8, 17),
    'axiom': grid('%s/axiom/v2/atlas.png' % CH, 88, 99, 8, 17),
    'eren': grid('%s/eren/v2/atlas.png' % CH, 128, 111, 8, 31),
}

# Banda de tono -> destino. h: rango de tono de origen (grados, puede cruzar 360), smin: saturación
# mínima (debajo es gris/metal/contorno y no se toca), hue: tono destino, sat: multiplicador de
# saturación, lift: aclara hacia el blanco (0..1), gain: multiplica el brillo, gamma: curva del brillo.
# smin_body: saturación mínima FUERA de la cabeza (más baja), cuando la ropa y el pelo comparten tono y
# solo se distinguen por dónde están (ver head_mask).
def band(h0, h1, hue, sat=1.0, lift=0.0, gain=1.0, gamma=1.0, smin=0.16, keep=0.0, smin_body=None):
    return dict(h=(h0, h1), hue=hue, sat=sat, lift=lift, gain=gain, gamma=gamma, smin=smin, keep=keep, smin_body=smin_body)

# Paletas de los cristales (tono, saturación, brillo) para la tela principal y el brillo mágico.
CROMAS = [
    # ---------------- guardianes sin ninguna skin ----------------
    dict(id='tanque_ancestral', champ='tanque', crystal='ancestral', name='Tanque, Bastión Ancestral',
         lore='La capa teñida con el musgo de las Ruinas. Dicen que el Guardián Ancestral cubría así a los suyos: primero el escudo, después la raíz.',
         files={'tanque_atlas': '%s/tanque/atlas.png' % CH, 'torbellino': 'assets/vfx/vendor/caballerito-torbellino.png',
                'estampida': 'assets/vfx/vendor/caballerito-estampida.png', 'grito': 'assets/vfx/vendor/caballerito-grito.png'},
         bands=[band(185, 262, 138, sat=0.92, gain=0.92, gamma=1.08)]),
    dict(id='tanque_juicio', champ='tanque', crystal='juicio', name='Tanque, Paladín del Juicio',
         lore='Marfil y oro pálido: el color del cristal que quedó sin dueño. Lo lleva quien jura sostener el sello aunque el cuarto Guardián ya no esté.',
         files={'tanque_atlas': '%s/tanque/atlas.png' % CH, 'torbellino': 'assets/vfx/vendor/caballerito-torbellino.png',
                'estampida': 'assets/vfx/vendor/caballerito-estampida.png', 'grito': 'assets/vfx/vendor/caballerito-grito.png'},
         bands=[band(185, 262, 46, sat=0.30, lift=0.58, gain=1.0, gamma=0.9)]),
    dict(id='nigromante_escarcha', champ='nigromante', crystal='escarcha', name='Nigromante, Sudario de Escarcha',
         lore='Las almas que cosecha en la Arena Gélida no se pudren: se congelan. Su capucha se volvió del color del hielo que no se derrite.',
         files={'nigromante': '%s/nigromante/v2/atlas.png' % CH},
         bands=[band(222, 300, 200, sat=0.72, gain=1.3, lift=0.24, gamma=0.9), band(140, 200, 192, sat=0.6, lift=0.3)]),
    dict(id='nigromante_piedra', champ='nigromante', crystal='piedra', name='Nigromante, Sepulturero de Ámbar',
         lore='Bajó al Laberinto a buscar a los que nadie enterró. Volvió con la capa manchada de polvo ámbar y un ejército que huele a piedra vieja.',
         files={'nigromante': '%s/nigromante/v2/atlas.png' % CH},
         bands=[band(222, 300, 33, sat=0.95, gain=1.45, gamma=0.92), band(140, 200, 40, sat=1.0, gain=1.1)]),
    dict(id='libertador_escarcha', champ='libertador', crystal='escarcha', name='El Libertador, Casaca de los Andes',
         lore='La casaca que volvió blanca de escarcha después de cruzar la Cordillera. El frío de las cumbres le quedó en la tela; el coraje, adentro.',
         files={'libertador': '%s/libertador/v2/atlas.png' % CH, 'libertador_horse': '%s/libertador/v2/horse.png' % CH},
         grids={'libertador': (103, 98), 'libertador_horse': (125, 102)}, head=0.26, strict={'libertador': (57, 58, 59, 60)},
         bands=[band(205, 256, 198, sat=0.5, lift=0.35, gain=2.0, gamma=0.85, smin=0.55, smin_body=0.38)]),
    dict(id='libertador_ancestral', champ='libertador', crystal='ancestral', name='El Libertador, Guardia del Monte',
         lore='Verde de monte y bronce de campaña: el uniforme de los que pelean escondidos entre los árboles de las Ruinas, esperando la carga.',
         files={'libertador': '%s/libertador/v2/atlas.png' % CH, 'libertador_horse': '%s/libertador/v2/horse.png' % CH},
         grids={'libertador': (103, 98), 'libertador_horse': (125, 102)}, head=0.26, strict={'libertador': (57, 58, 59, 60)},
         bands=[band(205, 256, 142, sat=0.75, gain=1.55, gamma=0.9, smin=0.55, smin_body=0.38), band(318, 360, 30, sat=0.78, gain=0.95, smin=0.4), band(0, 12, 30, sat=0.78, gain=0.95, smin=0.4)]),
    # ---------------- guardianes con una sola skin (de set) ----------------
    dict(id='segador_escarcha', champ='segador', crystal='escarcha', name='Segador, Filo de Escarcha',
         lore='La sangre que le mancha la capa se congeló en la Arena Gélida y no volvió a correr. Ahora corta en frío.',
         files={'segador': '%s/segador/v2/atlas.png' % CH},
         # la cara en sombra es rojiza pero poco saturada (s<0.55): solo se mueve la tela roja intensa
         bands=[band(336, 360, 196, sat=0.75, lift=0.3, gain=1.2, smin=0.6), band(0, 14, 196, sat=0.75, lift=0.3, gain=1.2, smin=0.6)]),
    dict(id='musashi_ancestral', champ='musashi', crystal='ancestral', name='Musashi, Hoja de Jade',
         lore='Ató su hakama con un cordón teñido en las Ruinas. Dice que el bosque también sabe esperar el momento justo.',
         files={'musashi': '%s/musashi/v2/atlas.png' % CH},
         # la sombra de la piel también es rojiza (tono 5-25, s<0.7): solo la tela roja pura (s>=0.72)
         bands=[band(336, 360, 150, sat=0.8, gain=1.05, smin=0.72), band(0, 4, 150, sat=0.8, gain=1.05, smin=0.72)]),
    dict(id='profeta_ancestral', champ='profeta', crystal='ancestral', name='La Profeta, Velo del Bosque',
         lore='En las Ruinas vio el destino de un Guardián antes de que cayera. Desde entonces lleva su verde, para no olvidar lo que no pudo cambiar.',
         files={'profeta': '%s/profeta/v2/atlas.png' % CH},
         bands=[band(200, 262, 150, sat=0.8, gain=1.1, smin=0.25)]),
    dict(id='cazadora_escarcha', champ='cazadora', crystal='escarcha', name='Sylva, Manto de Escarcha',
         lore='Siguió a una presa hasta la Arena Gélida y volvió con el manto blanco de escarcha. La presa no volvió.',
         files={'cazadora': '%s/cazadora/v2/atlas.png' % CH},
         bands=[band(55, 170, 200, sat=0.6, lift=0.35, gain=1.7, gamma=0.9, smin=0.26)]),
    dict(id='axiom_piedra', champ='axiom', crystal='piedra', name='Axiom, Código Ámbar',
         lore='Encontró reglas escritas en la piedra del Laberinto, más viejas que cualquier código. Las copió en su túnica.',
         files={'axiom': '%s/axiom/v2/atlas.png' % CH},
         bands=[band(214, 300, 34, sat=0.75, gain=1.35, gamma=0.95, smin=0.22)]),
    # Eren: su capa es verde oliva casi gris (saturación 0.1-0.3, igual que el pelo y el cuero): no se
    # puede separar por paleta sin teñir la piel. Queda sin croma hasta tener una máscara de capa.
]

# ---------------------------------------------------------------- color
def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    dd = np.maximum(d, 1e-6)
    rc = (mx - r) / dd; gc = (mx - g) / dd; bc = (mx - b) / dd
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2 + rc - bc, 4 + gc - rc))
    h = np.where(d > 1e-6, (h / 6.0) % 1.0, 0) * 360
    return h, s, mx
def hsv_to_rgb(h, s, v):
    h = (h % 360) / 60.0
    i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - s * f); t = v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)
def hue_dist_in(h, h0, h1):
    """Peso 0..1 de pertenencia a la banda [h0,h1] (puede cruzar 360): pleno adentro y fundido
    en los últimos grados de cada borde, así no quedan cortes duros entre tela y lo que no se toca."""
    span = (h1 - h0) % 360 or 360
    rel = (h - h0) % 360
    edge = np.minimum(rel, span - rel)
    return np.where(rel <= span, np.clip(0.35 + edge / 10.0, 0, 1), 0)

def head_mask(alpha, grid, frac, strict=()):
    """True en la franja superior (frac del alto del cuerpo) de cada cuadro de la grilla: la cabeza.
    Los cuadros `strict` (p.ej. de espaldas, donde la capa en sombra tiene el tono de la casaca) van enteros."""
    fw, fh = grid; H, W = alpha.shape; m = np.zeros_like(alpha, dtype=bool); cols = W // fw
    for y0 in range(0, H - fh + 1, fh):
        for x0 in range(0, W - fw + 1, fw):
            if (y0 // fh) * cols + x0 // fw in strict:
                m[y0:y0 + fh, x0:x0 + fw] = True; continue
            rows = np.where((alpha[y0:y0 + fh, x0:x0 + fw] > 0.5).any(1))[0]
            if not len(rows): continue
            top, bot = rows[0], rows[-1]
            m[y0:y0 + top + int((bot - top + 1) * frac), x0:x0 + fw] = True
    return m

def recolor(img, bands, grid=None, head=0.0, strict=()):
    a = np.asarray(img.convert('RGBA')).astype(np.float64) / 255.0
    rgb = a[..., :3]; alpha = a[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    out = rgb.copy()
    hm = head_mask(alpha, grid, head, strict) if grid and head else None
    for B in bands:
        w = hue_dist_in(h, *B['h'])
        smin = B['smin']
        if hm is not None and B.get('smin_body') is not None: smin = np.where(hm, B['smin'], B['smin_body'])
        w = w * np.clip((s - smin) / 0.08, 0, 1) * (v > 0.06)
        if not w.any():
            continue
        # tono: el centro de la banda va al destino; se conserva la variación relativa (±) comprimida
        h0, h1 = B['h']; span = (h1 - h0) % 360 or 360
        mid = (h0 + span / 2) % 360
        rel = ((h - mid + 180) % 360) - 180
        nh = (B['hue'] + rel * 0.35) % 360
        ns = np.clip(s * B['sat'], 0, 1)
        nv = np.clip(v, 0, 1) ** B['gamma'] * B['gain']
        # aclarar solo tonos medios y claros: el contorno y las sombras profundas siguen oscuros
        # (si no, el borde de la capa queda con un halo claro)
        lw = B['lift'] * np.clip((v - 0.16) / 0.30, 0, 1)
        nv = np.clip(nv + (1 - nv) * lw, 0, 1)
        ns = ns * (1 - lw * 0.5)
        new = hsv_to_rgb(nh, ns, nv)
        ww = w[..., None] * (1 - B['keep'])
        out = out * (1 - ww) + new * ww
    res = np.concatenate([np.clip(out, 0, 1), alpha[..., None]], -1)
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA')

# ---------------------------------------------------------------- build
def out_dir(c):
    return '%s/%s/cromas/%s' % (CH, c['champ'], c['crystal'])

def build():
    meta = {}
    only = [x for x in os.environ.get('ONLY', '').split(',') if x]  # ONLY=id1,id2: regenera solo esas imágenes
    for c in CROMAS:
        od = out_dir(c); os.makedirs(os.path.join(REPO, od), exist_ok=True)
        srcs = {}
        skip = bool(only) and c['id'] not in only
        for key, src in c['files'].items():
            dst = '%s/%s' % (od, os.path.basename(src))
            srcs[key] = dst
            if skip: continue
            im = Image.open(os.path.join(REPO, src))
            recolor(im, c['bands'], (c.get('grids') or {}).get(key), c.get('head', 0), (c.get('strict') or {}).get(key, ())).save(os.path.join(REPO, dst), optimize=True)
        # preview: cuadro quieto recoloreado, recortado a su caja y ampliado x3 (pixel art, sin suavizado)
        prev = '%s/preview.png' % od
        meta[c['id']] = dict(champ=c['champ'], crystal=c['crystal'], name=c['name'], lore=c['lore'],
                             price=c.get('price', PRICE), preview=prev, files=srcs)
        if skip: continue
        png, x, y, w, hh = PREVIEW[c['champ']]
        fr = recolor(Image.open(os.path.join(REPO, png)).crop((x, y, x + w, y + hh)), c['bands'], (w, hh), c.get('head', 0))
        bb = fr.getbbox() or (0, 0, w, hh)
        fr = fr.crop(bb)
        sc = max(1, min(3, round(240 / max(fr.size))))
        fr = fr.resize((fr.size[0] * sc, fr.size[1] * sc), Image.NEAREST)
        fr.save(os.path.join(REPO, prev), optimize=True)
        print('croma', c['id'], '->', od)
    js = ['"use strict";',
          '/* GENERADO por tools/art/cromas/build.py (no editar a mano).',
          '   CROMAS: variantes de color de guardianes derivadas por recoloreo de paleta del atlas base',
          '   (mismo tamaño y grilla). Registro y reglas: js/systems/cromas.js. */',
          'Object.assign(CROMA_SKINS, ' + json.dumps(meta, ensure_ascii=False, indent=1) + ');', '']
    with open(os.path.join(REPO, 'js/assets/croma-skins-meta.js'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(js))
    return meta

def contact_sheet(outdir):
    """Base vs cromas, cuadro quieto de cada uno, para mirar la paleta antes de integrar."""
    os.makedirs(outdir, exist_ok=True)
    by = {}
    for c in CROMAS: by.setdefault(c['champ'], []).append(c)
    rows = []
    for champ, cs in by.items():
        png, x, y, w, hh = PREVIEW[champ]
        base = Image.open(os.path.join(REPO, png)).convert('RGBA').crop((x, y, x + w, y + hh))
        ims = [base] + [recolor(base, c['bands']) for c in cs]
        rows.append(ims)
    cw = max(im.size[0] for r in rows for im in r) * 2; chh = max(im.size[1] for r in rows for im in r) * 2
    cols = max(len(r) for r in rows)
    sheet = Image.new('RGBA', (cw * cols, chh * len(rows)), (58, 62, 56, 255))
    for j, r in enumerate(rows):
        for i, im in enumerate(r):
            im2 = im.resize((im.size[0] * 2, im.size[1] * 2), Image.NEAREST)
            sheet.alpha_composite(im2, (i * cw + (cw - im2.size[0]) // 2, j * chh + (chh - im2.size[1]) // 2))
    p = os.path.join(outdir, 'cromas_sheet.png'); sheet.save(p); print('hoja:', p)

if __name__ == '__main__':
    if '--sheet' in sys.argv:
        contact_sheet(sys.argv[sys.argv.index('--sheet') + 1])
    else:
        build()
