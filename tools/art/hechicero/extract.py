"""Hoja del Hechicero Supremo (damero OSCURO, cuadros de 6 px en tonos ~2 y ~34) -> cuadros RGBA limpios.
El fondo es gris neutro oscuro (saturación <= 8): se inunda desde el borde de cada sección y se
suman los huecos cerrados que tienen el patrón de damero. Cada figura se separa sola por
componentes conexas. Se agrega un contorno oscuro de 1 px (los bordes negros del arte se
confunden con el damero). usage: python3 extract.py <hoja.png> <outdir>"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

N8 = np.ones((3, 3), bool)
# secciones (x0, y0, x1, y1): sin los carteles de título
SECTIONS = {
    'idle':      (12, 88, 748, 205),
    'walk':      (12, 240, 748, 358),
    'cast':      (12, 390, 748, 505),
    'basic':     (12, 540, 748, 650),
    'hurt':      (12, 686, 500, 800),
    'death':     (12, 838, 630, 950),
    'orb':       (765, 60, 1440, 142),
    'pillars':   (765, 170, 1440, 268),
    'judgment':  (765, 283, 1520, 380),
    'meteors':   (765, 410, 1078, 505),
    'meteors_fx': (1080, 378, 1440, 505),
    'golem':     (700, 556, 1532, 828),
    'golem_ph':  (636, 856, 1030, 1008),
    'golem_sk':  (1046, 856, 1532, 1008),
}

def bg_mask(c):
    c = c.astype(int)
    l = c.mean(-1); sd = c.max(-1) - c.min(-1)
    cand = (sd <= 8) & (l < 50)
    lbl, n = ndimage.label(cand)
    border = set(np.unique(np.r_[lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]])) - {0}
    bg = np.isin(lbl, list(border))
    # huecos cerrados con damero (tienen los dos tonos)
    for i, sl in enumerate(ndimage.find_objects(lbl), 1):
        if sl is None or i in border: continue
        reg = lbl[sl] == i
        if reg.sum() < 24: continue
        v = l[sl][reg]
        if (v < 12).mean() > 0.2 and (v > 24).mean() > 0.2: bg[sl] |= reg
    return bg

# cuántos cuadros hay en cada fila (las figuras de caminar/muerte se tocan: se parten por el mínimo de la proyección)
EXPECT = {'idle': 8, 'walk': 12, 'cast': 8, 'hurt': 5, 'death': 6, 'golem': 3, 'golem_ph': 3}

def split_cols(fg, expect):
    p = fg.sum(0)
    segs = []; inrun = False
    for x, v in enumerate(p):
        if v > 1 and not inrun: st = x; inrun = True
        elif v <= 1 and inrun: segs.append([st, x]); inrun = False
    if inrun: segs.append([st, len(p)])
    segs = [s for s in segs if fg[:, s[0]:s[1]].sum() > 150]
    while expect and len(segs) < expect:
        i = max(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0])
        a0, a1 = segs[i]; w = a1 - a0
        lo, hi = a0 + w // 4, a1 - w // 4
        cut = lo + int(np.argmin(p[lo:hi]))
        segs[i:i + 1] = [[a0, cut], [cut, a1]]
    return segs

def frames_in(a, rect, min_area=180, gap=3, expect=None, keep_largest=False):
    x0, y0, x1, y1 = rect
    c = a[y0:y1, x0:x1]
    bg = bg_mask(c)
    fg = ~bg
    fg = ndimage.binary_opening(fg, np.ones((2, 2), bool))
    if rect == SECTIONS['golem']: fg[:96, :52] = False   # el último cuadro del ataque básico asoma en la esquina
    # líneas finas de los paneles/carteles (alto <= 4 px y largas): afuera
    lb, _ = ndimage.label(fg, N8)
    for i, sl in enumerate(ndimage.find_objects(lb), 1):
        if sl and (sl[0].stop - sl[0].start) <= 6 and (sl[1].stop - sl[1].start) >= 30: fg[sl][lb[sl] == i] = False
    out = []
    if expect:
        for s0, s1 in split_cols(fg, expect):
            m = np.zeros_like(fg); m[:, s0:s1] = fg[:, s0:s1]
            if keep_largest:   # figura grande: fuera los pedazos sueltos lejanos (otra figura que asoma)
                jl, jn = ndimage.label(ndimage.binary_dilation(m, N8, iterations=2))
                if jn > 1:
                    sizes = ndimage.sum(m, jl, range(1, jn + 1)); m &= jl == (1 + int(np.argmax(sizes)))
            ys = np.where(m.any(1))[0]
            out.append((s0, ys[0], s1, ys[-1] + 1, m[ys[0]:ys[-1] + 1, s0:s1]))
    else:
        joined = ndimage.binary_dilation(fg, N8, iterations=gap)
        lbl, n = ndimage.label(joined)
        for i, sl in enumerate(ndimage.find_objects(lbl), 1):
            m = (lbl[sl] == i) & fg[sl]
            if m.sum() < min_area: continue
            out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, m))
    out.sort(key=lambda t: t[0])
    res = []
    for (fx0, fy0, fx1, fy1, m) in out:
        rgb = c[fy0:fy1, fx0:fx1]
        alpha = (m * 255).astype(np.uint8)
        # contorno oscuro de 1 px
        ring = ndimage.binary_dilation(m, N8) & ~m
        rgba = np.zeros((m.shape[0] + 2, m.shape[1] + 2, 4), np.uint8)
        rgba[1:-1, 1:-1, :3] = rgb; rgba[1:-1, 1:-1, 3] = alpha
        ring2 = np.zeros(rgba.shape[:2], bool); ring2[1:-1, 1:-1] = ring
        full = np.zeros(rgba.shape[:2], bool); full[1:-1, 1:-1] = m
        ring2 |= ndimage.binary_dilation(full, N8) & ~full
        rgba[ring2] = (12, 7, 16, 230)
        res.append({'img': Image.fromarray(rgba, 'RGBA'), 'box': [int(x0 + fx0), int(y0 + fy0), int(x0 + fx1), int(y0 + fy1)]})
    return res

if __name__ == '__main__':
    src, outdir = sys.argv[1], sys.argv[2]
    a = np.asarray(Image.open(src).convert('RGB'))
    os.makedirs(outdir, exist_ok=True)
    meta = {}
    for name, rect in SECTIONS.items():
        fr = frames_in(a, rect, min_area=900 if name.startswith('golem') and name != 'golem_sk' else 180, expect=EXPECT.get(name), gap=1 if name.startswith('golem') else 3, keep_largest=name.startswith('golem'))
        meta[name] = []
        for k, f in enumerate(fr):
            p = f'{name}_{k:02d}.png'; f['img'].save(os.path.join(outdir, p))
            meta[name].append({'file': p, 'box': f['box'], 'w': f['img'].width, 'h': f['img'].height})
        print(name, len(fr), [m['w'] for m in meta[name]])
    json.dump(meta, open(os.path.join(outdir, 'meta.json'), 'w'), indent=1)
