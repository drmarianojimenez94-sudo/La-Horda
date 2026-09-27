"""MINAS PROFUNDAS — hoja de ASSETS ADICIONALES (art-source/minas/extra.png, del usuario).

Qué sale de acá (todo a assets/vfx/minas/ + js/assets/minas-extra-meta.js):
  * PISO DE TIERRA por sector (tex_tierra_<sector>.png): los tiles de tierra de la hoja no se repiten sin
    costura, así que se arma un tile nuevo del mismo tamaño: la tierra SIN piedras (las piedras se tapan con
    tierra vecina) se hace continua en los bordes (mezcla con su copia desplazada por una máscara de ruido: la
    tierra es de bajo contraste y la unión no se ve) y encima se ESTAMPAN las piedras recortadas del tile
    original, con envoltura (una piedra que cruza el borde sigue del otro lado). Colores: la paleta del tile.
  * ROCA (tex_roca_mina.png): el mismo método con el tile de piedras oscuras (masas de roca y columnas).
  * PROPS sueltos (vagoneta, cajas, barril, balde, carbón, cubo de piedra, estalagmitas, estacas, faroles,
    postes, herramientas, montón de piedras) y ELEMENTOS ESPECIALES (farol encendido / parpadeo, antorcha,
    cristal de luz activo / roto, vetas): recorte por rectángulo con el fondo negro quitado desde el borde.
  * PORTAL INFERNAL: los 5 paneles grandes de la secuencia (sellado, grietas, apertura, activo, idle) con los
    bordes fundidos a transparente para apoyarlos sobre la pared del Umbral.
  * CADENAS DE CERBERO: tensión (6), rotura (6), caída (7) y restos: fondo a cuadros gris quitado desde el borde.
  * Retrato grande de Cerbero para el Códice (assets/ui/codex/minas/cerbero.jpg).
usage: python3 tools/art/minas/extract_extra.py
"""
import os, json
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SRC = os.path.join(REPO, 'art-source', 'minas', 'extra.png')
OUT = os.path.join(REPO, 'assets', 'vfx', 'minas')
IM = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
RNG = np.random.default_rng(909)

def crop(b, inset=0):
    x0, y0, x1, y1 = b
    return IM[y0 + inset:y1 - inset, x0 + inset:x1 - inset].copy()

def lum(a):
    return a[..., 0]*0.3 + a[..., 1]*0.59 + a[..., 2]*0.11

# ---------------------------------------------------------------- piso / roca
def rock_mask(a, delta=16):
    L = lum(a)
    bg = ndimage.median_filter(L, size=11)
    m = L > bg + delta
    m = ndimage.binary_opening(m, iterations=1)
    m = ndimage.binary_fill_holes(ndimage.binary_dilation(m, iterations=1))
    ring = ndimage.binary_dilation(m, iterations=2) & (L < bg - 4)   # contorno oscuro / sombra de la piedra
    return m | ring

def seamless_base(a, mask):
    """Tierra sin piedras y continua en los bordes."""
    h, w, _ = a.shape
    dirt = a.copy()
    # tapar las piedras con tierra cercana (la tierra más próxima fuera de la máscara)
    idx = ndimage.distance_transform_edt(mask, return_distances=False, return_indices=True)
    dirt = dirt[idx[0], idx[1]]
    # ruido fino para que el relleno no quede en franjas
    jitter = RNG.integers(-4, 5, size=(h, w, 1))
    dirt = np.clip(dirt + jitter, 0, 255)
    rolled = np.roll(np.roll(dirt, h//2, 0), w//2, 1)
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum(np.minimum(xx, w - 1 - xx)/(w/2), np.minimum(yy, h - 1 - yy)/(h/2))   # 0 en el borde, 1 al centro
    noise = ndimage.gaussian_filter(RNG.random((h, w)), 2.2)
    noise = (noise - noise.min())/(noise.max() - noise.min() + 1e-9)
    use_orig = (edge*1.25 + (noise - 0.5)*0.55) > 0.55
    return np.where(use_orig[..., None], dirt, rolled)

def stones(a, mask, amin=10, amax=1400):
    lab, n = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        m = lab[sl] == i + 1
        if amin <= m.sum() <= amax:
            out.append((a[sl].copy(), m))
    return out

def stamp(base, pieces, count):
    h, w, _ = base.shape
    res = base.copy()
    for k in range(count):
        px, m = pieces[RNG.integers(len(pieces))]
        if RNG.random() < 0.5:
            px, m = px[:, ::-1], m[:, ::-1]
        ph, pw = m.shape
        oy, ox = RNG.integers(h), RNG.integers(w)
        ys = (np.arange(ph) + oy) % h
        xs = (np.arange(pw) + ox) % w
        # sombra suave abajo a la derecha
        sm = np.zeros((ph + 2, pw + 2), bool); sm[2:, 2:] = m
        sys_ = (np.arange(ph + 2) + oy) % h; sxs = (np.arange(pw + 2) + ox) % w
        sub = res[np.ix_(sys_, sxs)]
        sub[sm] = (sub[sm]*0.62).astype(np.int32)
        res[np.ix_(sys_, sxs)] = sub
        sub = res[np.ix_(ys, xs)]
        sub[m] = px[m]
        res[np.ix_(ys, xs)] = sub
    return res

def tint(a, rgb, k):
    return np.clip(a*(1 - k) + np.array(rgb)*k*(lum(a)[..., None]/110.0), 0, 255)

def make_floor(box, rock_boxes, name, count_mul=1.0, tint_rgb=None, tint_k=0.0, dark=1.0, embers=False):
    a = crop(box, 4)                     # el borde del panel de la hoja no entra
    mask = rock_mask(a)
    base = seamless_base(a, mask)
    pcs = stones(a, mask, amin=24)
    for rb in rock_boxes:
        ra = crop(rb, 4); pcs += stones(ra, rock_mask(ra), amin=24)
    # base de tierra NUEVA de 224x224, continua en los bordes: ruido por grilla con envoltura mapeado por cuantiles a los colores de tierra del tile, más
    # granos sueltos de la misma tierra. No copia píxeles por posición: no quedan manchas repetidas.
    N = 224
    dirt_px = a[~ndimage.binary_dilation(mask, iterations=2)].reshape(-1, 3)
    order = np.argsort(lum(dirt_px[None])[0]); dirt_px = dirt_px[order]
    def vnoise(g):   # ruido por grilla g x g, interpolado cúbico con envoltura (se repite sin costura)
        return ndimage.zoom(RNG.random((g, g)), N/g, order=3, mode='grid-wrap')
    f = vnoise(7) + 0.6*vnoise(14) + 0.35*vnoise(32)      # 224 es múltiplo de las tres grillas
    q = (np.argsort(np.argsort(f.ravel()))/(N*N - 1)).reshape(N, N)
    q = np.clip(0.18 + q*0.55 + RNG.random((N, N))*0.27, 0, 0.999)     # tono acotado + grano por píxel
    big = dirt_px[(q*len(dirt_px)).astype(int)]
    n = int(N*N/600*count_mul)
    tile = stamp(big, pcs, n)
    if tint_rgb is not None:
        tile = tint(tile, tint_rgb, tint_k)
    tile = np.clip(tile*dark, 0, 255)
    if embers:
        h, w, _ = tile.shape
        e = RNG.random((h, w)) > 0.992
        tile[e] = [235, 110, 40]
    Image.fromarray(tile.astype(np.uint8), 'RGB').save(os.path.join(OUT, name + '.png'), optimize=True)
    return tile.shape

T1 = (22, 749, 126, 836)     # tierra marrón
T2 = (134, 749, 198, 836)    # piedras oscuras
T3 = (207, 749, 271, 836)    # tierra oscura azulada
T5 = (22, 851, 79, 931)      # piedras oscuras (2)
T7 = (132, 851, 198, 931)    # tierra marrón (2)
T8 = (207, 851, 271, 931)    # tierra oscura

# ---------------------------------------------------------------- recortes con fondo quitado
GLOW = {'lampara_piedra', 'lampara_encendida', 'lampara_parpadeo', 'antorcha', 'farol_alto', 'farol_bajo', 'farol_poste',
        'cristal_luz', 'cristal_luz2', 'cristal_roto', 'cristales_azules', 'cristales_rojos', 'veta_roja', 'veta_violeta', 'veta_brasa'}
def cut(b, bgfn, pad=0, glow=False):
    a = crop(b)
    bg = bgfn(a)
    if glow:
        # halo de luz: lo oscuro conectado al borde pasa a transparencia gradual según el brillo (resplandor, no disco)
        halo = a.max(2) < 72
        lab, n = ndimage.label(halo)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        hc = np.isin(lab, list(border))
        alpha = np.where(hc, np.clip((a.max(2) - 16)*255/70.0, 0, 255), 255).astype(np.uint8)
        ys, xs = np.nonzero(alpha > 8)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        return Image.fromarray(np.dstack([a.astype(np.uint8), alpha])[y0:y1, x0:x1], 'RGBA')
    # fondo = conectado al borde
    lab, n = ndimage.label(bg)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgc = np.isin(lab, list(border))
    alpha = np.where(bgc, 0, 255).astype(np.uint8)
    # quitar píxeles sueltos
    solid = ndimage.binary_opening(alpha > 0, iterations=1) | (ndimage.binary_erosion(alpha > 0, iterations=1))
    alpha = np.where(solid | (alpha > 0) & ndimage.binary_dilation(solid, iterations=1), alpha, 0).astype(np.uint8)
    ys, xs = np.nonzero(alpha)
    if len(ys) == 0:
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([a.astype(np.uint8), alpha])[y0:y1, x0:x1]
    return Image.fromarray(rgba, 'RGBA')

dark_bg = lambda a: a.max(2) < 17
def checker_bg(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (np.abs(r - g) < 5) & (np.abs(g - b) < 6) & (a.max(2) < 52)

PROPS = {   # nombre: rectángulo en la hoja
    'vagoneta': (636, 748, 713, 818), 'caja': (725, 752, 776, 806), 'barril': (804, 746, 834, 785),
    'balde': (845, 745, 876, 775), 'carbon': (890, 745, 942, 782), 'cubo_piedra': (637, 825, 712, 896),
    'caja_chica': (790, 833, 831, 868), 'caja_rota': (700, 875, 743, 919), 'estalagmitas': (776, 878, 853, 953),
    'estacas': (939, 836, 1016, 885), 'farol_alto': (642, 892, 689, 1005), 'farol_bajo': (695, 921, 743, 1005),
    'farol_poste': (888, 925, 934, 1006), 'poste': (752, 901, 776, 1005), 'viga': (855, 895, 884, 1006),
    'herramientas': (779, 955, 850, 1004), 'piedras': (934, 940, 1015, 1005),
    # elementos especiales
    'lampara_piedra': (1258, 765, 1297, 846), 'lampara_encendida': (1330, 768, 1374, 835),
    'lampara_parpadeo': (1396, 766, 1441, 834), 'antorcha': (1459, 751, 1511, 828),
    'cristal_luz': (1247, 874, 1298, 932), 'cristal_luz2': (1308, 876, 1359, 932), 'cristal_roto': (1444, 875, 1506, 932),
    'veta_gris': (1235, 958, 1297, 1008), 'veta_roja': (1296, 961, 1337, 1008), 'veta_piedras': (1337, 952, 1395, 1009),
    'veta_brasa': (1393, 954, 1450, 1009), 'veta_violeta': (1449, 950, 1519, 1008),
    'cristales_azules': (1037, 747, 1150, 818), 'cristales_rojos': (1152, 747, 1218, 819),
    'rocas_cristal': (1035, 868, 1128, 942), 'rocas_grandes': (1105, 878, 1218, 964),
}
# portal: 5 paneles grandes (sin la tira de miniaturas)
PORTAL = [(18, 511, 246, 660), (262, 511, 493, 660), (510, 511, 763, 660), (779, 511, 1075, 660), (1088, 511, 1302, 660)]
# cadenas: fila, x inicial, ancho de cuadro, cantidad, alto
CHAINS = {
    'cadena_tension': (1203, 110, 1537, 162, 6),
    'cadena_rotura': (1203, 192, 1537, 257, 6),
    'cadena_caida': (1203, 287, 1537, 350, 7),
}
CHAIN_RESTOS = (1202, 380, 1515, 445)

def feather(img, k=18):
    a = np.array(img.convert('RGBA')).astype(np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    f = np.minimum(np.minimum(xx, w - 1 - xx), yy)/k      # abajo queda recto (apoya en el piso)
    f = np.clip(f, 0, 1)
    a[..., 3] *= f
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {'tex': {}, 'props': {}, 'portal': [], 'chains': {}}
    floors = [
        ('tex_tierra_superior', T1, [T7], 1.0, None, 0, 1.0, False),
        ('tex_tierra_galerias', T7, [T1], 0.8, None, 0, 0.86, False),
        ('tex_tierra_vetas', T3, [], 0.6, (70, 90, 150), 0.18, 1.0, False),
        ('tex_tierra_corrompida', T8, [], 0.8, (120, 50, 150), 0.22, 0.95, False),
        ('tex_tierra_profundidades', T8, [T5], 1.2, (120, 50, 30), 0.15, 0.9, True),
        ('tex_tierra_umbral', T8, [T5], 1.2, (160, 40, 20), 0.28, 0.85, True),
    ]
    for name, box, rb, cm, tr, tk, dk, em in floors:
        sh = make_floor(box, rb, name, cm, tr, tk, dk, em); meta['tex'][name] = 'assets/vfx/minas/%s.png' % name
        print(name, sh)
    sh = make_floor(T2, [T5], 'tex_roca_mina', 3.2); meta['tex']['tex_roca_mina'] = 'assets/vfx/minas/tex_roca_mina.png'
    print('tex_roca_mina', sh)
    for k, b in PROPS.items():
        im = cut(b, dark_bg, glow=k in GLOW)
        if im is None: print('VACIO', k); continue
        im.save(os.path.join(OUT, 'x_' + k + '.png'), optimize=True)
        meta['props'][k] = 'assets/vfx/minas/x_%s.png' % k
    for i, b in enumerate(PORTAL):
        im = feather(Image.fromarray(crop(b).astype(np.uint8), 'RGB'))
        im.save(os.path.join(OUT, 'portal_%d.png' % i), optimize=True)
        meta['portal'].append('assets/vfx/minas/portal_%d.png' % i)
    for k, (x0, y0, x1, y1, n) in CHAINS.items():
        fw = (x1 - x0)/n; arr = []
        for j in range(n):
            im = cut((int(x0 + j*fw) + 2, y0, int(x0 + (j + 1)*fw) - 2, y1), checker_bg)
            if im is None: continue
            p = 'assets/vfx/minas/%s_%d.png' % (k, j); im.save(os.path.join(REPO, p), optimize=True); arr.append(p)
        meta['chains'][k] = arr
    im = cut(CHAIN_RESTOS, checker_bg)
    if im is not None:
        im.save(os.path.join(OUT, 'cadena_restos.png'), optimize=True); meta['chains']['cadena_restos'] = ['assets/vfx/minas/cadena_restos.png']
    # retrato grande de Cerbero para el Códice
    Image.fromarray(crop((10, 88, 430, 445)).astype(np.uint8), 'RGB').save(os.path.join(REPO, 'assets', 'ui', 'codex', 'minas', 'cerbero.jpg'), quality=90)
    js = ('// GENERADO por tools/art/minas/extract_extra.py (hoja art-source/minas/extra.png). No editar a mano.\n'
          'const MINAS_EXTRA = ' + json.dumps(meta, ensure_ascii=False) + ';\n')
    open(os.path.join(REPO, 'js', 'assets', 'minas-extra-meta.js'), 'w').write(js)
    # bloque del manifest de precarga (idempotente, entre marcadores)
    paths = list(meta['tex'].values()) + list(meta['props'].values()) + meta['portal'] + [q for v in meta['chains'].values() for q in v]
    mp = os.path.join(REPO, 'js', 'assets', 'asset-manifest.js'); ms = open(mp).read()
    block = '  // >>> minas extra (tools/art/minas/extract_extra.py)\n' + ''.join('  "%s",\n' % q for q in paths) + '  // <<< minas extra\n'
    a, b = ms.find('  // >>> minas extra'), ms.find('  // <<< minas extra\n')
    ms = ms[:a] + block + ms[b + len('  // <<< minas extra\n'):] if a >= 0 and b >= 0 else ms.replace('  // <<< minas profundas\n', '  // <<< minas profundas\n' + block, 1)
    open(mp, 'w').write(ms)
    print('props', len(meta['props']), 'chains', {k: len(v) for k, v in meta['chains'].items()})

if __name__ == '__main__':
    main()
