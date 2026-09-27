"""Recorte genérico de hojas de arte con fondo oscuro liso (paneles azul marino / negro con carteles).

Sirve para cualquier hoja "IMG n - ..." que manda el equipo: el fondo de cada panel es casi negro,
así que la figura es lo que se aparta de ese negro. Pasos:
  1. fondo = inundación desde el borde del recorte por los píxeles oscuros (tolerancia `bg_t`
     sobre la luminancia); lo que la inundación no alcanza es figura -así los huecos oscuros
     encerrados (sombras entre rocas) quedan adentro-.
  2. el brillo tenue (aura roja del fuego, halo azul del hielo) queda afuera en los personajes:
     solo cuenta como figura lo que supera `fig_t`; en los efectos (VFX) el brillo ES el efecto y
     se guarda como alfa suave.
  3. afuera las líneas de los paneles/carteles (componentes finas y largas) y el ruido suelto.
  4. las componentes se agrupan en n cuadros (izquierda a derecha); cada cuadro se queda con su
     figura principal y con lo que está cerca (partículas, esquirlas del mismo cuadro).
Uso como módulo: from sheet_crop import Sheet; s = Sheet(path); frames = s.frames(rect, n, typ)
"""
import numpy as np
from PIL import Image
from scipy import ndimage

N8 = np.ones((3, 3), bool)


def luma(rgb):
    f = rgb.astype(float)
    return 0.299 * f[..., 0] + 0.587 * f[..., 1] + 0.114 * f[..., 2]


def drop_lines(fg):
    """Bordes de panel/celda: componentes de alto o ancho <= 4 px y largas."""
    lb, _ = ndimage.label(fg, N8)
    for i, sl in enumerate(ndimage.find_objects(lb), 1):
        if not sl:
            continue
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if (hh <= 4 and ww >= 16) or (ww <= 4 and hh >= 16) or (ww <= 2 and hh >= 7) or (hh <= 2 and ww >= 7) or (ww == 1 and hh >= 4):
            fg[sl][lb[sl] == i] = False
    return fg


def split_cols(fg, n, core_frac=0.12):
    """Agrupa en n cuadros por columnas: las n figuras más grandes son los núcleos y cada componente
    menor va al núcleo más cercano (distancia entre cajas). Devuelve n máscaras, izquierda a derecha."""
    lb, k = ndimage.label(fg, N8)
    if k == 0:
        return []
    objs = ndimage.find_objects(lb)
    areas = ndimage.sum(np.ones_like(lb), lb, range(1, k + 1))
    order = np.argsort(-areas)
    cores = [int(order[0])]
    for j in order[1:]:
        if len(cores) >= n:
            break
        if areas[j] < areas[order[0]] * core_frac:
            break
        cores.append(int(j))
    # núcleos que se superponen en columnas son la misma figura partida: se unen
    if len(cores) < n:
        # figuras pegadas por el brillo: se corta la más ancha por el mínimo de su proyección
        pass
    cores.sort(key=lambda j: objs[j].start if False else objs[j][1].start)
    out = [np.zeros_like(fg) for _ in cores]

    def boxdist(a, b):
        dx = max(0, max(a[1].start, b[1].start) - min(a[1].stop, b[1].stop))
        dy = max(0, max(a[0].start, b[0].start) - min(a[0].stop, b[0].stop))
        return max(dx, dy)

    for j in range(k):
        sl = objs[j]
        if sl is None:
            continue
        if j in cores:
            ci = cores.index(j)
        else:
            d = [boxdist(sl, objs[c]) for c in cores]
            # empate (partícula entre dos figuras): la del centro horizontal más cercano
            cx = (sl[1].start + sl[1].stop) / 2
            ci = int(np.argmin([d[q] * 1000 + abs(cx - (objs[c][1].start + objs[c][1].stop) / 2) for q, c in enumerate(cores)]))
        out[ci][sl] |= lb[sl] == j + 1
    return out


class Sheet:
    def __init__(self, path):
        self.rgb = np.array(Image.open(path).convert('RGB'))
        self.L = luma(self.rgb)
        self.mx = self.rgb.max(-1).astype(float)

    def masks(self, rect, typ, bg_t=14, fig_t=24, min_area=6, close=2, hole_max=90, glow_lo=45):
        x0, y0, x1, y1 = rect
        L = self.L[y0:y1, x0:x1]
        mx = self.mx[y0:y1, x0:x1]
        # 1. fondo por inundación desde el borde
        dark = L <= bg_t
        seed = np.zeros_like(dark)
        seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
        bg = ndimage.binary_propagation(seed & dark, mask=dark, structure=N8)
        fg = ~bg
        # 2. figura nítida: lo que supera fig_t (sin aura) + lo oscuro que queda encerrado
        solid = (L > fig_t)
        solid = ndimage.binary_opening(solid, np.ones((2, 2), bool)) | (solid & (L > fig_t * 2.2))
        solid = drop_lines(solid)   # antes de cerrar: si no, la línea del panel se pega a la figura
        # grietas oscuras entre rocas / cristales: se cierran (hasta ~2*close px) y se rellenan los
        # huecos encerrados chicos; el relleno usa el píxel real de la hoja (el negro del arte). Los
        # huecos grandes (entre brazo y cuerpo, entre las piernas) son fondo y quedan transparentes,
        # salvo que su interior no sea negro de fondo (sombra del arte).
        pad = close + 1
        sp = np.pad(solid, pad)
        sp = ndimage.binary_closing(sp, N8, iterations=close)[pad:-pad, pad:-pad] | solid
        holes = ndimage.binary_fill_holes(sp) & ~sp
        hl, hk = ndimage.label(holes)
        if hk:
            ha = ndimage.sum(holes, hl, range(1, hk + 1))
            hm = ndimage.mean(L, hl, range(1, hk + 1))
            if typ == 'fx':   # en los efectos el hueco con brillo adentro es aire, no sombra
                keep = [i + 1 for i in range(hk) if ha[i] <= 12]
            elif typ == 'figfx':   # cuerpo que se deshace: grietas chicas adentro, aire lo demás
                keep = [i + 1 for i in range(hk) if ha[i] <= 45]
            else:
                keep = [i + 1 for i in range(hk) if ha[i] <= hole_max or hm[i] > bg_t * 1.6]
            sp |= np.isin(hl, keep)
        solid = drop_lines(sp)
        # ruido suelto
        lb, k = ndimage.label(solid, N8)
        if k:
            sizes = ndimage.sum(solid, lb, range(1, k + 1))
            solid = np.isin(lb, [i + 1 for i in range(k) if sizes[i] >= min_area])
        if typ in ('fx', 'figfx'):
            # brillo: alfa según lo que brilla (el aura oscura, rojiza o azulada, queda afuera:
            # sobre el piso del juego sería una mancha)
            soft = np.clip((L - glow_lo) / 90.0, 0, 1)
            soft[solid] = 1.0
            return solid, soft
        return solid, solid.astype(float)

    def frames(self, rect, n, typ='fig', attach=6, cuts=None, **kw):
        """Lista de (RGBA Image, caja absoluta, máscara del núcleo en la caja) de izquierda a derecha."""
        x0, y0, x1, y1 = rect
        solid, alpha = self.masks(rect, typ, **kw)
        if cuts:   # cortes fijos (columnas absolutas) cuando el brillo une los cuadros
            edges = [x0] + list(cuts) + [x1]
            groups = []; ranges = list(zip(edges[:-1], edges[1:]))
            for a, b in ranges:
                g = np.zeros_like(solid); g[:, a - x0:b - x0] = solid[:, a - x0:b - x0]; groups.append(g)
        else:
            groups = split_cols(solid, n); ranges = None
        res = []
        for gi, m in enumerate(groups):
            core = m
            if typ == 'fig':
                # la figura principal + lo que está a `attach` px o menos de ella
                lb, k = ndimage.label(ndimage.binary_dilation(m, N8, iterations=attach), N8)
                if k > 1:
                    sizes = ndimage.sum(m, lb, range(1, k + 1))
                    keep = int(np.argmax(sizes)) + 1
                    m = m & (lb == keep)
                core = m
            if typ in ('fx', 'figfx'):
                # el brillo suave alrededor de las partes sólidas del cuadro
                near = ndimage.binary_dilation(m, N8, iterations=5)
                a = alpha * near
                if ranges:
                    lim = np.zeros_like(a); lim[:, ranges[gi][0] - x0:ranges[gi][1] - x0] = 1; a *= lim
            else:
                a = m.astype(float)
            ys, xs = np.nonzero(a > 0.02)
            if len(ys) == 0:
                continue
            by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            rgb = self.rgb[y0 + by0:y0 + by1, x0 + bx0:x0 + bx1]
            aa = np.round(a[by0:by1, bx0:bx1] * 255).astype(np.uint8)
            im = Image.fromarray(np.dstack([rgb, aa]), 'RGBA')
            res.append((im, (x0 + bx0, y0 + by0, x0 + bx1, y0 + by1), core[by0:by1, bx0:bx1]))
        return res


def outline(im, color=(14, 10, 16), alpha_min=128):
    """Contorno oscuro de 1 px alrededor de la figura (el negro del arte original se pierde al
    separar la figura del fondo negro; sin él, sobre un piso oscuro la silueta se lava)."""
    a = np.array(im)
    m = a[..., 3] >= alpha_min
    ring = ndimage.binary_dilation(m, N8) & ~m
    a[ring] = (*color, 255)
    return Image.fromarray(a, 'RGBA')
