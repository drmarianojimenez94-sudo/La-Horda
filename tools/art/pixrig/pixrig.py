"""PIXRIG — dibujo de pixel art por partes articuladas, a resolución NATIVA (sin reescalar nada).

Para los jefes que tenían arte de 22–54 px dibujado a 4–5x (docs/ART_COMMISSION_BRIEF.md, P0/R/F): cada jefe
se arma como un títere de huesos y piezas (elipses, cápsulas, polígonos) y cada cuadro se rasteriza píxel a píxel
al tamaño de celda de su ficha, con las reglas de docs/ART_BIBLE.md:
  · luz desde arriba a la izquierda, 4–5 tonos por material (rampas con corrimiento de tono: sombras hacia el
    violeta, luces hacia el ámbar), sin degradés suaves ni antialiasing;
  · contorno exterior oscuro de 1 píxel (selectivo: del lado de la luz toma el tono más oscuro del material);
  · línea interior entre piezas (la pieza de adelante se recorta contra la de atrás) y sombra proyectada de la
    pieza de adelante sobre la de atrás;
  · texturas por material en coordenadas LOCALES de la pieza (se mueven con ella: no "nadan" entre cuadros);
  · materiales emisivos (fuego, ojos, orbes, grietas) sin sombreado.
Uso: cada jefe es un módulo (tools/art/pixrig/<clave>.py) que define huesos, piezas y una función de pose por
cuadro; build.py arma el atlas (grilla de 8 columnas, mismo formato que js/assets/*-meta.js).
"""
import math, colorsys
import numpy as np
from PIL import Image

OUTLINE = (14, 10, 18)


def hx(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def ramp(base, n=5, dark_hue=262, light_hue=48, shift=22, vspan=(0.42, 1.38), sat_dark=1.12, sat_light=0.78):
    """Rampa de n tonos (del más oscuro al más claro) con el color base en el medio y corrimiento de tono."""
    r, g, b = [c / 255 for c in (hx(base) if isinstance(base, str) else base)]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    out, mid = [], (n - 1) / 2
    for i in range(n):
        t = (i - mid) / mid
        hh = h * 360
        target = dark_hue if t < 0 else light_hue
        d = ((target - hh + 540) % 360) - 180
        hh = (hh + d * min(1, abs(t)) * shift / 100 * (1 if s > 0.08 else 0)) % 360
        vv = v * (1 + (vspan[1] - 1) * t) if t > 0 else v * (1 - (1 - vspan[0]) * -t)
        ss = s * (sat_dark ** -t if t < 0 else sat_light ** t)
        if t > 0: vv = min(1, vv); ss = max(0, ss)
        rr, gg, bb = colorsys.hsv_to_rgb(hh / 360, min(1, ss), max(0, min(1, vv)))
        out.append((round(rr * 255), round(gg * 255), round(bb * 255)))
    return out


def ramp_from(*hexes):
    return [hx(h) for h in hexes]


class Mat:
    def __init__(self, tones, emissive=False, tex=None, base=2, outline=None, shade=1.0, rim=True):
        self.tones = tones if isinstance(tones, list) else ramp(tones)
        self.emissive, self.tex, self.base, self.shade, self.rim = emissive, tex, base, shade, rim
        self.outline = outline  # color de contorno propio (si no, el global)


# ---------------------------------------------------------------- formas (coordenadas locales de la pieza)
class Shape:
    def __or__(self, o): return Union(self, o)
    def __sub__(self, o): return Diff(self, o)
    def __and__(self, o): return Inter(self, o)


class Ellipse(Shape):
    def __init__(self, cx, cy, rx, ry=None, rot=0):
        self.cx, self.cy, self.rx, self.ry, self.rot = cx, cy, rx, ry if ry is not None else rx, math.radians(rot)
    def bbox(self):
        r = max(self.rx, self.ry); return self.cx - r, self.cy - r, self.cx + r, self.cy + r
    def inside(self, X, Y):
        dx, dy = X - self.cx, Y - self.cy
        if self.rot:
            c, s = math.cos(self.rot), math.sin(self.rot); dx, dy = dx * c + dy * s, -dx * s + dy * c
        return (dx / max(self.rx, .3)) ** 2 + (dy / max(self.ry, .3)) ** 2 <= 1


class Capsule(Shape):
    """Segmento con radio variable (miembros, cuellos, colas)."""
    def __init__(self, x0, y0, x1, y1, r0, r1=None):
        self.a, self.b, self.r0, self.r1 = (x0, y0), (x1, y1), r0, r1 if r1 is not None else r0
    def bbox(self):
        r = max(self.r0, self.r1)
        return min(self.a[0], self.b[0]) - r, min(self.a[1], self.b[1]) - r, max(self.a[0], self.b[0]) + r, max(self.a[1], self.b[1]) + r
    def inside(self, X, Y):
        ax, ay = self.a; dx, dy = self.b[0] - ax, self.b[1] - ay
        L2 = dx * dx + dy * dy or 1e-6
        t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
        r = self.r0 + (self.r1 - self.r0) * t
        return (X - (ax + t * dx)) ** 2 + (Y - (ay + t * dy)) ** 2 <= r * r


class Poly(Shape):
    def __init__(self, pts): self.p = [tuple(map(float, q)) for q in pts]
    def bbox(self):
        xs, ys = [q[0] for q in self.p], [q[1] for q in self.p]; return min(xs), min(ys), max(xs), max(ys)
    def inside(self, X, Y):
        res = np.zeros(X.shape, bool); n = len(self.p)
        for i in range(n):
            x1, y1 = self.p[i]; x2, y2 = self.p[(i + 1) % n]
            if y1 == y2: continue
            cond = ((y1 > Y) != (y2 > Y))
            xint = x1 + (Y - y1) * (x2 - x1) / (y2 - y1)
            res ^= cond & (X < xint)
        return res


class Chain(Shape):
    """Cinta por puntos con radios: capas, colas, cadenas, telones."""
    def __init__(self, pts, radii):
        self.caps = [Capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], radii[i], radii[i + 1]) for i in range(len(pts) - 1)]
    def bbox(self):
        bs = [c.bbox() for c in self.caps]; return min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)
    def inside(self, X, Y):
        m = np.zeros(X.shape, bool)
        for c in self.caps: m |= c.inside(X, Y)
        return m


class Union(Shape):
    def __init__(self, *s): self.s = s
    def bbox(self):
        bs = [x.bbox() for x in self.s]; return min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)
    def inside(self, X, Y):
        m = np.zeros(X.shape, bool)
        for x in self.s: m |= x.inside(X, Y)
        return m


class Diff(Shape):
    def __init__(self, a, b): self.a, self.b = a, b
    def bbox(self): return self.a.bbox()
    def inside(self, X, Y): return self.a.inside(X, Y) & ~self.b.inside(X, Y)


class Inter(Shape):
    def __init__(self, a, b): self.a, self.b = a, b
    def bbox(self): return self.a.bbox()
    def inside(self, X, Y): return self.a.inside(X, Y) & self.b.inside(X, Y)


# ---------------------------------------------------------------- texturas (devuelven corrimiento de tono por píxel)
def _hash(ix, iy, seed=0):
    h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return (h ^ (h >> 16)) / 4294967295.0


def tex_noise(scale=3, amp=1, thr=0.78, seed=1):
    """Motas: píxeles sueltos un tono más claros/oscuros (piedra, cuero, carne)."""
    def f(lx, ly, tone):
        ix, iy = np.floor(lx / scale).astype(np.int64), np.floor(ly / scale).astype(np.int64)
        h = _hash(ix, iy, seed)
        return np.where(h > thr, amp, np.where(h < 1 - thr, -amp, 0))
    return f


def tex_cracks(cell=9, width=0.9, seed=3, depth=-2):
    """Grietas de Voronoi: líneas oscuras (roca) o, con depth>0 y material emisivo, vetas de fuego."""
    def f(lx, ly, tone):
        gx, gy = np.floor(lx / cell), np.floor(ly / cell)
        best, second = np.full(lx.shape, 1e9), np.full(lx.shape, 1e9)
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                cx, cy = gx + ox, gy + oy
                px = (cx + np.vectorize(lambda a, b: _hash(int(a), int(b), seed))(cx, cy)) * cell
                py = (cy + np.vectorize(lambda a, b: _hash(int(a), int(b), seed + 7))(cx, cy)) * cell
                d = np.hypot(lx - px, ly - py)
                second = np.where(d < best, best, np.minimum(second, d)); best = np.minimum(best, d)
        return np.where(second - best < width, depth, 0)
    return f


def tex_stripes(period=6, width=1, axis='y', amp=-1, phase=0):
    """Pliegues de tela, pelaje o rayas (pantalón del Maestro)."""
    def f(lx, ly, tone):
        v = (ly if axis == 'y' else lx) + phase
        return np.where(np.mod(np.floor(v), period) < width, amp, 0)
    return f


def tex_sum(*fs):
    def f(lx, ly, tone):
        out = 0
        for g in fs: out = out + g(lx, ly, tone)
        return out
    return f


# ---------------------------------------------------------------- esqueleto y piezas
class Bone:
    def __init__(self, name, parent=None, at=(0, 0), angle=0, scale=1.0):
        self.name, self.parent, self.at, self.angle, self.scale = name, parent, at, angle, scale


class Part:
    def __init__(self, name, bone, shape, mat, z, fx=False, cast=True, line=True, tex_off=(0, 0)):
        self.name, self.bone, self.shape, self.mat, self.z = name, bone, shape, mat, z
        self.fx, self.cast, self.line, self.tex_off = fx, cast, line, tex_off


def _affine(tx, ty, ang, sx=1, sy=1):
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    return np.array([[c * sx, -s * sy, tx], [s * sx, c * sy, ty], [0, 0, 1.0]])


class Rig:
    def __init__(self, W, H, mats, outline=OUTLINE, light=(-0.55, -0.83)):
        self.W, self.H, self.mats, self.outline = W, H, mats, outline
        self.bones, self.parts = {}, []
        n = math.hypot(*light); self.light = (light[0] / n, light[1] / n)

    def bone(self, name, parent=None, at=(0, 0), angle=0, scale=1.0):
        self.bones[name] = Bone(name, parent, at, angle, scale); return name

    def part(self, *a, **k):
        p = Part(*a, **k); self.parts.append(p); return p

    def world(self, pose):
        """pose: {hueso: ángulo extra | (ángulo, dx, dy) | {'a':..,'dx':..,'dy':..,'sx':..,'sy':..}}"""
        M = {}
        def get(n):
            if n in M: return M[n]
            b = self.bones[n]; p = pose.get(n, 0)
            if isinstance(p, dict): a, dx, dy, sx, sy = p.get('a', 0), p.get('dx', 0), p.get('dy', 0), p.get('sx', 1), p.get('sy', 1)
            elif isinstance(p, tuple): a, dx, dy, sx, sy = tuple(p) + (0, 0, 0, 1, 1)[len(p):]
            else: a, dx, dy, sx, sy = p, 0, 0, 1, 1
            local = _affine(b.at[0] + dx, b.at[1] + dy, b.angle + a, sx * b.scale, sy * b.scale)
            M[n] = local if b.parent is None else get(b.parent) @ local
            return M[n]
        for n in self.bones: get(n)
        return M

    def render(self, pose, extra=(), hide=(), dissolve=None, tint=None):
        """Rasteriza un cuadro. extra: piezas sueltas del cuadro (partículas, humo). hide: nombres de piezas ocultas.
        dissolve: (umbral 0..1, semilla) borra píxeles por ruido (muertes que se deshacen)."""
        W, H = self.W, self.H
        M = self.world(pose)
        zbuf = np.full((H, W), -1e9); pid = np.full((H, W), -1, int); tone = np.zeros((H, W), int)
        parts = [p for p in self.parts if p.name not in hide and not (callable(getattr(p, 'when', None)) and not p.when(pose))] + list(extra)
        parts.sort(key=lambda p: p.z)
        Ly, Lx = self.light[1], self.light[0]
        masks = {}
        for i, p in enumerate(parts):
            T = M[p.bone] if isinstance(p.bone, str) else p.bone
            inv = np.linalg.inv(T)
            x0, y0, x1, y1 = p.shape.bbox()
            cs = np.array([[x0, y0, 1], [x1, y0, 1], [x0, y1, 1], [x1, y1, 1]]).T
            wc = T @ cs
            bx0, by0 = max(0, int(math.floor(wc[0].min())) - 1), max(0, int(math.floor(wc[1].min())) - 1)
            bx1, by1 = min(W, int(math.ceil(wc[0].max())) + 2), min(H, int(math.ceil(wc[1].max())) + 2)
            if bx1 <= bx0 or by1 <= by0: continue
            gy, gx = np.mgrid[by0:by1, bx0:bx1]
            X = inv[0, 0] * (gx + .5) + inv[0, 1] * (gy + .5) + inv[0, 2]
            Y = inv[1, 0] * (gx + .5) + inv[1, 1] * (gy + .5) + inv[1, 2]
            m = p.shape.inside(X, Y)
            if not m.any(): continue
            mat = self.mats[p.mat] if isinstance(p.mat, str) else p.mat
            # sombreado: posición del píxel a lo largo del eje de la luz dentro de SU pieza
            full = np.zeros((H, W), bool); full[by0:by1, bx0:bx1] = m
            if mat.emissive or mat.shade == 0:
                t = np.full(m.shape, mat.base)
            else:
                du = _run(full, Lx, Ly)[by0:by1, bx0:bx1]; dd = _run(full, -Lx, -Ly)[by0:by1, bx0:bx1]
                s = (dd - du) / (dd + du + 1.0)
                t = mat.base + np.round(s * 1.6 * mat.shade).astype(int)
                if mat.rim:
                    t = np.where(du <= 1, t + 1, t); t = np.where(dd <= 1, t - 1, t)
            if mat.tex is not None:
                t = t + mat.tex(X + p.tex_off[0], Y + p.tex_off[1], t)
            t = np.clip(t, 0, len(mat.tones) - 1)
            sub_z = zbuf[by0:by1, bx0:bx1]
            put = m & (p.z >= sub_z)
            sub_z[put] = p.z; pid[by0:by1, bx0:bx1][put] = i; tone[by0:by1, bx0:bx1][put] = t[put]
            masks[i] = (p, mat)
        inside = pid >= 0
        # sombra proyectada: si hacia la luz (2 px) hay una pieza de adelante, un tono menos
        sx, sy = int(round(-Lx * 2)), int(round(-Ly * 2))
        ahead = _shift(pid, -sx, -sy, -1)
        zahead = np.full((H, W), -1e9);
        zs = np.array([masks[i][0].z if i in masks else -1e9 for i in range(len(parts))] + [-1e9])
        zcur = zs[pid]; zah = zs[ahead]
        castok = np.array([masks[i][0].cast if i in masks else False for i in range(len(parts))] + [False])
        emis = np.array([masks[i][1].emissive if i in masks else False for i in range(len(parts))] + [False])
        cs_mask = inside & (ahead >= 0) & (zah > zcur + 1e-6) & castok[ahead] & ~emis[pid]
        tone = np.where(cs_mask, np.maximum(tone - 1, 0), tone)
        # línea interior: borde de la pieza de ADELANTE contra una de atrás → tono 0 de su material
        line = np.zeros((H, W), bool)
        lineok = np.array([masks[i][0].line if i in masks else False for i in range(len(parts))] + [False])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = _shift(pid, dx, dy, -1)
            line |= inside & (nb >= 0) & (nb != pid) & (zs[nb] < zcur - 1e-6) & lineok[pid] & ~emis[pid] & (zs[nb] > -1e8)
        tone = np.where(line, 0, tone)
        # disolución (muertes): borra píxeles por ruido estable
        if dissolve is not None:
            thr, seed = dissolve
            nz = _hashgrid(W, H, seed)
            inside = inside & (nz >= thr)
        # color
        img = np.zeros((H, W, 4), np.uint8)
        for i, (p, mat) in masks.items():
            sel = inside & (pid == i)
            if not sel.any(): continue
            tones = np.array(mat.tones)
            col = tones[np.clip(tone[sel], 0, len(tones) - 1)]
            if tint is not None: col = np.clip(col * np.array(tint[:3]), 0, 255)
            img[sel, :3] = col; img[sel, 3] = 255
        # contorno exterior: del lado de la luz, el tono 0 del material vecino; del otro, el contorno global
        body = inside & ~np.array([masks[i][0].fx if i in masks else False for i in range(len(parts))] + [False])[pid]
        out = np.zeros((H, W), bool); src = np.full((H, W), -1, int)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = _shift(np.where(body, pid, -1), dx, dy, -1)
            new = ~inside & (nb >= 0) & ~out
            src[new] = nb[new]; out |= new
        lit = np.zeros((H, W), bool)
        # vecino hacia el lado opuesto a la luz pertenece al cuerpo ⇒ este píxel está del lado iluminado
        lx, ly = int(round(-Lx)), int(round(-Ly))
        lit = out & (_shift(body.astype(int), lx, 0, 0) + _shift(body.astype(int), 0, ly, 0) > 0) & ~(_shift(body.astype(int), -lx, 0, 0) + _shift(body.astype(int), 0, -ly, 0) > 0)
        for y, x in zip(*np.nonzero(out)):
            p, mat = masks[src[y, x]]
            c = mat.outline or (mat.tones[0] if lit[y, x] and not mat.emissive else self.outline)
            if mat.emissive: c = mat.tones[max(0, len(mat.tones) - 3)]
            img[y, x] = (*c, 255)
        return Image.fromarray(img, 'RGBA')


_HG = {}
def _hashgrid(W, H, seed):
    k = (W, H, seed)
    if k not in _HG:
        y, x = np.mgrid[0:H, 0:W]
        v = ((x // 2) * 374761393 + (y // 2) * 668265263 + seed * 2246822519) & 0xffffffff
        v = ((v ^ (v >> 13)) * 1274126177) & 0xffffffff
        _HG[k] = ((v ^ (v >> 16)) & 0xffffffff) / 4294967295.0
    return _HG[k]


def _shift(a, dx, dy, fill):
    """b[y, x] = a[y+dy, x+dx] (valor del vecino en dirección (dx, dy))."""
    H, W = a.shape; b = np.full_like(a, fill)
    ys0, ys1 = max(0, -dy), min(H, H - dy); xs0, xs1 = max(0, -dx), min(W, W - dx)
    if ys1 > ys0 and xs1 > xs0: b[ys0:ys1, xs0:xs1] = a[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
    return b


def _run(mask, dx, dy, K=48):
    """Cantidad de píxeles seguidos dentro de la máscara en la dirección (dx, dy) (distancia al borde)."""
    H, W = mask.shape; acc = np.zeros((H, W), float); alive = mask.copy()
    for k in range(1, K + 1):
        ox, oy = int(round(dx * k)), int(round(dy * k))
        nb = _shift(mask, ox, oy, False)
        alive &= nb; acc += alive
        if not alive.any(): break
    return acc


# ---------------------------------------------------------------- utilidades de animación
def lerp(a, b, t): return a + (b - a) * t
def ease(t): return t * t * (3 - 2 * t)
def osc(t, amp=1, ph=0): return amp * math.sin(2 * math.pi * (t + ph))


def atlas(frames, cols=8):
    """Arma la grilla (celdas del mismo tamaño) y devuelve (imagen, w, h)."""
    w, h = frames[0].size; rows = (len(frames) + cols - 1) // cols
    A = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames): A.paste(f, ((i % cols) * w, (i // cols) * h))
    return A, w, h


def preview(frames, scale=3, cols=8, bg=(38, 34, 44)):
    w, h = frames[0].size; rows = (len(frames) + cols - 1) // cols
    P = Image.new('RGBA', (w * cols * scale, h * rows * scale), bg + (255,))
    for i, f in enumerate(frames):
        P.alpha_composite(f.resize((w * scale, h * scale), Image.NEAREST), ((i % cols) * w * scale, (i // cols) * h * scale))
    return P
