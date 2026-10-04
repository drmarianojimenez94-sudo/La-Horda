#!/usr/bin/env python3
"""Generador de atlas pixel art para la expansión Ascensión (8 campeones + skins).

Gramática del Master Reference (Caballero, docs/ART_BIBLE.md §2): chibi (cabeza ~40-45% de la altura),
~64 px de cuerpo en celda 112x112, pies en y=106, contorno exterior de 1 px oscuro, 2-3 tonos por
parte (luz arriba-izquierda, sombra abajo-derecha), separaciones internas selectivas, alfa 0/255.
Formato idéntico a los atlas de la Expedición: 4 columnas x 9 filas
  0 walk_down (idle=0) · 1 walk_side · 2 walk_up · 3 attack_down · 4 attack_side · 5 attack_up
  6 cast · 7 ultimate · 8 death
Estado: arte GENERADO, marcado PENDIENTE DE REVISIÓN en el Visual Gate (no reemplaza un encargo).
Uso: python3 tools/art/ascension_sprites.py   -> assets/sprites/champions/<id>/{atlas,preview}.png (+ skins)
"""
import json, math, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
W = H = 112
FOOT = 106
CX = 56
OUTLINE = (20, 15, 24)

def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def tone(c, k):
    c = hexrgb(c) if isinstance(c, str) else c
    if k >= 0: return tuple(int(v + (255 - v) * k) for v in c)
    return tuple(int(v * (1 + k)) for v in c)

class Canvas:
    """Partes en orden de dibujo; cada parte = máscara + color base + opciones de sombreado."""
    def __init__(self):
        self.parts = []
    def _mask(self):
        return Image.new('1', (W, H), 0)
    def add(self, mask, color, shade=True, sep=True):
        self.parts.append((np.array(mask, dtype=bool), color, shade, sep))
    def ellipse(self, box, color, **kw):
        m = self._mask(); ImageDraw.Draw(m).ellipse([round(v) for v in box], fill=1); self.add(m, color, **kw); return m
    def rect(self, box, color, **kw):
        m = self._mask(); ImageDraw.Draw(m).rectangle([round(v) for v in box], fill=1); self.add(m, color, **kw); return m
    def poly(self, pts, color, **kw):
        m = self._mask(); ImageDraw.Draw(m).polygon([(round(x), round(y)) for x, y in pts], fill=1); self.add(m, color, **kw); return m
    def limb(self, x0, y0, ang, length, width, color, **kw):
        # segmento grueso desde (x0,y0) en ángulo (rad, 0 = abajo)
        dx, dy = math.sin(ang), math.cos(ang); px, py = dy, -dx
        x1, y1 = x0 + dx * length, y0 + dy * length; w = width / 2
        pts = [(x0 + px * w, y0 + py * w), (x1 + px * w, y1 + py * w), (x1 - px * w, y1 - py * w), (x0 - px * w, y0 - py * w)]
        self.poly(pts, color, **kw); return (x1, y1)
    def render(self, details=()):
        col = np.zeros((H, W, 3), np.uint8); pid = np.full((H, W), -1, np.int32)
        for i, (m, c, _, _) in enumerate(self.parts):
            col[m] = hexrgb(c) if isinstance(c, str) else c; pid[m] = i
        out = col.astype(np.int32)
        sil = pid >= 0
        def nb(dy, dx):
            s = np.full((H, W), -1, np.int32)
            ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
            xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
            s[yd, xd] = pid[ys, xs]; return s
        up, left, down, right = nb(-1, 0), nb(0, -1), nb(1, 0), nb(0, 1)
        for i, (m, c, shade, sep) in enumerate(self.parts):
            mine = pid == i
            if not mine.any(): continue
            base = np.array(hexrgb(c) if isinstance(c, str) else c)
            if shade:
                ys, xs = np.nonzero(mine)
                if len(ys) > 40:
                    y0, y1 = ys.min(), ys.max(); x0, x1 = xs.min(), xs.max()
                    band = mine.copy(); band[:y0 + int((y1 - y0) * 0.62), :] = False
                    side = mine.copy(); side[:, :x0 + int((x1 - x0) * 0.72)] = False
                    out[band | side] = base * 0.84
                hi = mine & ((up != i) | (left != i)); lo = mine & ((down != i) | (right != i))
                out[hi] = np.clip(base + (255 - base) * 0.22, 0, 255)
                out[lo & ~hi] = base * 0.68
            if sep:
                # separación interna: 1 px más oscuro donde toca una parte dibujada antes (detrás)
                behind = mine & (((down >= 0) & (down < i)) | ((right >= 0) & (right < i)) | ((left >= 0) & (left < i)))
                out[behind] = np.minimum(out[behind], base * 0.55)
        img = np.zeros((H, W, 4), np.uint8); img[..., :3] = np.clip(out, 0, 255); img[..., 3] = np.where(sil, 255, 0)
        for (x, y, c) in details:
            if 0 <= x < W and 0 <= y < H: img[y, x, :3] = hexrgb(c) if isinstance(c, str) else c; img[y, x, 3] = 255
        a = img[..., 3] > 0
        ring = np.zeros_like(a)
        ring[1:, :] |= a[:-1, :]; ring[:-1, :] |= a[1:, :]; ring[:, 1:] |= a[:, :-1]; ring[:, :-1] |= a[:, 1:]
        ring &= ~a
        img[ring, :3] = OUTLINE; img[ring, 3] = 255
        return Image.fromarray(img, 'RGBA')

# ---------------- definición de campeones ----------------
BASE = {
 'nano_gm': dict(skin='#e0b08a', hair='#2a1d1a', hairStyle='curls', torso='#2b2433', trim='#e8c56a', pants='#1e1a26', boots='#3a2a1e', arms='tattoo', weapon=None, glow=('#fff4d6', '#3b2a55'), robe=False),
 'facu_gm': dict(skin='#c98e62', hair='#1d1612', hairStyle='curls', torso='#1f6f78', trim='#cfeff2', pants='#1b2a3a', boots='#4a3526', arms='bare', bracelet='#e07a5f', weapon='keel', weaponColor='#9fe7ef', glow=('#7ff3ff', '#2fd3c6'), robe=False, mantle=True),
 'aurelia': dict(skin='#f0c9a0', hair='#e8b44a', hairStyle='bob', torso='#efe3c2', trim='#f2c14e', pants='#efe3c2', boots='#8a6a3a', arms='sleeve', sleeve='#efe3c2', weapon='prism_staff', weaponColor='#f2c14e', glow=('#fff1b8', '#f2c14e'), robe=True, pauldrons='#f2c14e', back='compass'),
 'khepri': dict(skin='#b07a4f', hair='#1e3b2c', hairStyle='beetle', torso='#23432f', trim='#b89a3a', pants='#1c2f22', boots='#2b2418', arms='sleeve', sleeve='#23432f', weapon='hooks', weaponColor='#c9d2d6', glow=('#c8f27a', '#3fae8a'), robe=False, back='elytra', backColor='#2f7d55'),
 'velmira': dict(skin='#f2d4c4', hair='#3b1f3f', hairStyle='updo', torso='#5a2350', trim='#c06bd8', pants='#5a2350', boots='#2a1028', arms='sleeve', sleeve='#5a2350', weapon='scepter', weaponColor='#e8c56a', glow=('#f3d1ff', '#c06bd8'), robe=True, collar='#c06bd8', crown='#e8c56a'),
 'vhal': dict(skin='#2a3170', hair='#d9e1ff', hairStyle='long', torso='#1b2148', trim='#d8b45a', pants='#1b2148', boots='#141833', arms='sleeve', sleeve='#1b2148', weapon='astrolabe', weaponColor='#d8b45a', glow=('#d9e1ff', '#6f7cf2'), robe=True, stars=True),
 'bront': dict(skin='#8aa4b8', hair='#8aa4b8', hairStyle='helm', torso='#8aa4b8', trim='#5d7383', pants='#6f8798', boots='#4b5d6a', arms='armor', sleeve='#8aa4b8', weapon=None, glow=('#bfe8ff', '#5ad1ff'), robe=False, bulky=True, crystal='#bfe8ff'),
 'oriel': dict(skin='#e9c2a6', hair='#4a2a22', hairStyle='hood', hood='#7a1f35', torso='#8f2a45', trim='#efe2c4', pants='#3a1a24', boots='#2a1418', arms='sleeve', sleeve='#8f2a45', weapon='key', weaponColor='#cfd6dc', glow=('#ffd0dc', '#e05a7a'), robe=False, cape='#7a1f35'),
}
SKINS = {
 'nano_gm': [dict(torso='#0d0a12', trim='#ffb300', halo='#ffd34d', crownLow='#ffb300')],
 'facu_gm': [dict(torso='#0b1630', trim='#b48cff', weaponColor='#2b2236', boneCrown='#e8e0d0', glow=('#b48cff', '#7a3cff'))],
 'aurelia': [dict(torso='#3a6ea5', trim='#e8c56a', sleeve='#c0392b', pants='#2e8b57', stained=True), dict(torso='#2a2626', trim='#8b1e1e', sleeve='#2a2626', pants='#2a2626', hair='#1a1414', cracks='#ff4a3a', weaponColor='#3a3036')],
 'khepri': [dict(torso='#1f3a8a', trim='#e8c56a', sleeve='#1f3a8a', hair='#173070', backColor='#2a52b8', pants='#16285e'), dict(torso='#5e5e5e', trim='#cfc7b8', sleeve='#5e5e5e', hair='#4a4a4a', backColor='#7a7a7a', weaponColor='#e8e0d0', pants='#3d3d3d')],
 'velmira': [dict(torso='#6e1a2a', trim='#e8c56a', sleeve='#6e1a2a', pants='#6e1a2a', plume='#f3e0b0'), dict(torso='#e8e4dc', trim='#b8b2a6', sleeve='#e8e4dc', pants='#e8e4dc', hair='#cfcac0', crown='#ffffff')],
 'vhal': [dict(torso='#0d0d12', trim='#ff9a2e', sleeve='#0d0d12', pants='#0d0d12', skin='#141420', chestRing='#ff9a2e'), dict(skin='#7a2448', torso='#3a1030', sleeve='#3a1030', pants='#3a1030', hair='#ffc2d9', starColor='#ffb3cf')],
 'bront': [dict(torso='#9a6b2f', sleeve='#9a6b2f', hair='#9a6b2f', pants='#7d5626', trim='#5e3e14', crystal='#ffc46b', banner='#7a1f1f'), dict(torso='#1d2430', sleeve='#1d2430', hair='#1d2430', pants='#161b24', trim='#3a4658', crystal='#ffffff', frost='#cfefff')],
 'oriel': [dict(hood='#efe2c4', cape='#efe2c4', torso='#c9a96e', trim='#ffffff', weaponColor='#ffe08a'), dict(hood='#4a0d18', cape='#4a0d18', torso='#2a0a12', trim='#ff3a3a', weaponColor='#2a2a2e', redEye=True)],
}

# ---------------- dibujo de una pose ----------------
def draw(c, view, pose):
    P = dict(c); cv = Canvas(); det = []
    bob = pose.get('bob', 0); leg = pose.get('leg', 0); lift = pose.get('lift', 0)
    f = FOOT + bob - lift
    bulky = P.get('bulky'); tw = 15 if bulky else 11
    side = view == 'side'; back = view == 'up'
    if side: tw = 10 if not bulky else 13
    headY = f - 46; hx = CX + (1 if side else 0)
    armA = pose.get('armA', 0.15); armB = pose.get('armB', -0.15)  # ángulos (0 = colgando)
    # --- detrás: capa, élitros, compás, halo ---
    if P.get('cape'):
        cv.poly([(CX - tw - 3, f - 32), (CX + tw + 3, f - 32), (CX + tw + 6, f - 2), (CX - tw - 6, f - 2)], P['cape'])
    if P.get('back') == 'elytra':
        cl = P.get('backColor', '#2f7d55')
        cv.ellipse((CX - tw - 9, f - 36, CX - 1, f - 8), cl); cv.ellipse((CX + 1, f - 36, CX + tw + 9, f - 8), cl)
    if P.get('back') == 'compass' and not side:
        cv.poly([(CX - 3, f - 60), (CX + 3, f - 60), (CX + 16, f - 10), (CX + 12, f - 10), (CX, f - 50), (CX - 12, f - 10), (CX - 16, f - 10)], P['trim'])
    if P.get('halo'):
        cv.ellipse((hx - 19, headY - 22, hx + 19, headY + 10), P['halo'], shade=False); cv.ellipse((hx - 16, headY - 19, hx + 16, headY + 7), (0, 0, 0))
        cv.parts.pop()  # anillo: quitamos el centro
        m = Image.new('1', (W, H), 0); d = ImageDraw.Draw(m); d.ellipse((hx - 19, headY - 22, hx + 19, headY + 10), outline=1, width=2)
        cv.parts.pop(); cv.add(m, P['halo'], shade=False, sep=False)
    if P.get('banner'):
        cv.rect((CX - tw - 2, f - 34, CX - tw + 2, f - 6), P['banner']); cv.rect((CX + tw - 2, f - 34, CX + tw + 2, f - 6), P['banner'])
    # --- brazo trasero ---
    shoulderY = f - 30
    def arm(x, ang, front):
        color = P['skin'] if P['arms'] in ('tattoo', 'bare') else P.get('sleeve', P['torso'])
        w = 7 if bulky else 5
        end = cv.limb(x, shoulderY, ang, 13, w, color)
        hand = P['sleeve'] if P['arms'] == 'armor' else P['skin']
        r = 4 if bulky else 3
        cv.ellipse((end[0] - r, end[1] - r, end[0] + r, end[1] + r), hand)
        if P['arms'] == 'tattoo':
            # tatuajes: patrones negros densos sobre todo el brazo (rasgo de silueta de Nano)
            for t in range(2, 13, 2):
                px = x + math.sin(ang) * t; py = shoulderY + math.cos(ang) * t
                for o in (-2, 0, 1):
                    if (t + o) % 3 != 0: det.append((round(px + o * math.cos(ang)), round(py), '#15111a'))
        if P.get('bracelet'):
            px = x + math.sin(ang) * 10; py = shoulderY + math.cos(ang) * 10
            for o in (-2, -1, 0, 1, 2): det.append((round(px + o * math.cos(ang)), round(py - o * math.sin(ang)), P['bracelet']))
        return end
    if not side:
        backArmX = CX + tw + 2 if not back else CX - tw - 2
        endB = arm(backArmX, -armB if not back else armB, False)
    # --- piernas ---
    if P.get('robe'):
        cv.poly([(CX - tw, f - 24), (CX + tw, f - 24), (CX + tw + 5, f - 1), (CX - tw - 5, f - 1)], P['pants'])
        cv.rect((CX - 7, f - 3, CX - 2, f), P['boots']); cv.rect((CX + 2, f - 3, CX + 7, f), P['boots'])
    else:
        lw = 6 if bulky else 5
        if side:
            for i, s in enumerate((-1, 1)):
                dx = s * leg * 3; lx = CX - 2 + dx
                cv.rect((lx - lw // 2, f - 14, lx + lw // 2, f - 4), P['pants']); cv.rect((lx - lw // 2, f - 4, lx + lw // 2 + 2, f), P['boots'])
        else:
            for s in (-1, 1):
                up_ = 2 if (leg == s) else 0
                lx = CX + s * (5 if not bulky else 7)
                cv.rect((lx - lw // 2, f - 14 - up_, lx + lw // 2, f - 4 - up_), P['pants']); cv.rect((lx - lw // 2 - 1, f - 4 - up_, lx + lw // 2 + 1, f - up_), P['boots'])
    # --- torso ---
    cv.rect((CX - tw, f - 33, CX + tw, f - 13), P['torso'])
    cv.rect((CX - tw, f - 16, CX + tw, f - 14), P['trim'])  # cinturón
    if P.get('mantle'):
        cv.poly([(CX - tw - 3, f - 34), (CX + tw + 3, f - 34), (CX + tw + 1, f - 24), (CX, f - 20), (CX - tw - 1, f - 24)], P['torso'])
        for x in range(CX - tw, CX + tw, 3): det.append((x, f - 33, P['trim']))
    if P.get('pauldrons') and not side:
        cv.poly([(CX - tw - 6, f - 30), (CX - tw + 2, f - 36), (CX - tw + 3, f - 28)], P['pauldrons']); cv.poly([(CX + tw + 6, f - 30), (CX + tw - 2, f - 36), (CX + tw - 3, f - 28)], P['pauldrons'])
    if bulky and not side:
        cv.ellipse((CX - tw - 8, f - 37, CX - tw + 4, f - 25), P['trim']); cv.ellipse((CX + tw - 4, f - 37, CX + tw + 8, f - 25), P['trim'])
    if P.get('collar'):
        cv.poly([(CX - 9, f - 33), (CX - 13, f - 44), (CX - 4, f - 36)], P['collar']); cv.poly([(CX + 9, f - 33), (CX + 13, f - 44), (CX + 4, f - 36)], P['collar'])
    if P.get('crystal') and not back:
        cv.poly([(CX, f - 30), (CX + 4, f - 25), (CX, f - 20), (CX - 4, f - 25)], P['crystal'], shade=False)
        det.append((CX - 1, f - 27, '#ffffff'))
    if P.get('chestRing') and not back:
        m = Image.new('1', (W, H), 0); ImageDraw.Draw(m).ellipse((CX - 6, f - 30, CX + 6, f - 19), outline=1, width=1); cv.add(m, P['chestRing'], shade=False, sep=False)
    if P.get('stained') and not back:
        cols = ['#c0392b', '#e8c56a', '#2e8b57', '#3a6ea5']
        for i, y in enumerate(range(f - 31, f - 17, 4)):
            for x in range(CX - tw + 2, CX + tw - 1, 4): det.append((x, y, cols[(i + x) % 4])); det.append((x + 1, y, cols[(i + x) % 4]))
    if P.get('cracks') and not back:
        for i in range(6): det.append((CX - 6 + i * 2, f - 30 + (i % 3) * 3, P['cracks']))
    # --- cabeza ---
    hr = 15 if not bulky else 14
    cv.ellipse((hx - hr, headY - 14, hx + hr, headY + 13), P['hair'] if P['hairStyle'] not in ('helm',) else P['torso'])
    style = P['hairStyle']
    eyes = []
    if style != 'helm' and not back:
        if side:
            cv.ellipse((hx - 4, headY - 6, hx + 13, headY + 12), P['skin']); eyes = [(hx + 7, headY + 1)]
        else:
            cv.ellipse((hx - 11, headY - 6, hx + 11, headY + 12), P['skin']); eyes = [(hx - 5, headY + 1), (hx + 4, headY + 1)]
    if style == 'curls':
        for i, a in enumerate(np.linspace(math.pi * 1.05, math.pi * 1.95, 7)):
            x = hx + math.cos(a) * 13; y = headY - 2 + math.sin(a) * 13
            cv.ellipse((x - 4, y - 4, x + 4, y + 4), P['hair'])
        if not back:
            cv.ellipse((hx - 16, headY - 4, hx - 9, headY + 5), P['hair'])
            if not side: cv.ellipse((hx + 9, headY - 4, hx + 16, headY + 5), P['hair'])
    elif style == 'bob':
        cv.poly([(hx - 15, headY - 4), (hx - 14, headY + 9), (hx - 9, headY + 9), (hx - 8, headY - 6)], P['hair'])
        if not side: cv.poly([(hx + 15, headY - 4), (hx + 14, headY + 9), (hx + 9, headY + 9), (hx + 8, headY - 6)], P['hair'])
        cv.ellipse((hx - 14, headY - 15, hx + 14, headY - 2), P['hair'])
    elif style == 'long':
        cv.rect((hx - 15, headY - 2, hx - 10, headY + 22), P['hair'])
        if not side: cv.rect((hx + 10, headY - 2, hx + 15, headY + 22), P['hair'])
        cv.ellipse((hx - 14, headY - 15, hx + 14, headY - 3), P['hair'])
    elif style == 'updo':
        cv.ellipse((hx - 14, headY - 15, hx + 14, headY - 3), P['hair']); cv.ellipse((hx - 6, headY - 24, hx + 6, headY - 12), P['hair'])
    elif style == 'beetle':
        cv.ellipse((hx - 16, headY - 16, hx + 16, headY + 2), P['hair']); cv.poly([(hx - 2, headY - 15), (hx + 2, headY - 15), (hx + 1, headY - 27), (hx - 1, headY - 27)], P['hair'])
        cv.ellipse((hx - 6, headY - 27, hx + 6, headY - 17), P['trim'], shade=False)
    elif style == 'hood':
        cv.poly([(hx - 17, headY + 10), (hx - 16, headY - 10), (hx, headY - 19), (hx + 16, headY - 10), (hx + 17, headY + 10), (hx + 11, headY + 4), (hx + 10, headY - 6), (hx - 10, headY - 6), (hx - 11, headY + 4)], P['hood'])
        if back: cv.ellipse((hx - 16, headY - 18, hx + 16, headY + 12), P['hood'])
    elif style == 'helm':
        cv.ellipse((hx - 16, headY - 15, hx + 16, headY + 13), P['torso'])
        if not back: cv.rect((hx - 10, headY - 1, hx + 10 if not side else hx + 13, headY + 2), (25, 30, 40), shade=False)
        cv.rect((hx - 2, headY - 18, hx + 2, headY - 13), P['trim'])
    if P.get('crown') and not side:
        cv.poly([(hx - 7, headY - 15), (hx - 7, headY - 21), (hx - 4, headY - 17), (hx, headY - 23), (hx + 4, headY - 17), (hx + 7, headY - 21), (hx + 7, headY - 15)], P['crown'])
    if P.get('crownLow'):
        cv.rect((hx - 10, headY - 12, hx + 10, headY - 10), P['crownLow'])
    if P.get('boneCrown'):
        for i in (-8, -4, 0, 4, 8): cv.poly([(hx + i - 1, headY - 12), (hx + i + 1, headY - 12), (hx + i, headY - 19 - abs(i) // 3)], P['boneCrown'])
    if P.get('plume') and not side:
        cv.poly([(hx + 6, headY - 14), (hx + 13, headY - 30), (hx + 10, headY - 13)], P['plume'])
    # ojos
    iris = '#ff2a2a' if P.get('redEye') else P.get('iris', tone(P['glow'][1], -0.35))
    for (ex, ey) in eyes:
        for dx in (0, 1, 2):
            for dy in (0, 1, 2, 3): det.append((ex + dx - 1, ey + dy - 1, '#1a1420'))
        det += [(ex, ey + 1, iris), (ex + 1, ey + 1, iris), (ex, ey + 2, iris), (ex - 1, ey - 1, '#ffffff'), (ex, ey - 1, '#ffffff')]
        det += [(ex - 1, ey - 3, tone(P['hair'], -0.3)), (ex, ey - 3, tone(P['hair'], -0.3)), (ex + 1, ey - 3, tone(P['hair'], -0.3))]
        if not side: det += [(ex - 1 if ex < hx else ex + 2, ey + 4, tone(P['skin'], -0.12))]  # rubor
    if eyes and not side: det += [(hx - 1, headY + 8, tone(P['skin'], -0.45)), (hx, headY + 8, tone(P['skin'], -0.45))]
    if eyes and side: det += [(hx + 11, headY + 8, tone(P['skin'], -0.45))]
    if P.get('stars'):
        rng = np.random.RandomState(7)
        sc = P.get('starColor', '#ffffff')
        for _ in range(9): det.append((int(CX - tw + rng.randint(0, 2 * tw)), int(f - 32 + rng.randint(0, 18)), sc))
        if not back:
            for _ in range(3): det.append((int(hx - 8 + rng.randint(0, 16)), int(headY + 4 + rng.randint(0, 6)), sc))
    if P.get('frost'):
        for i in range(8): det.append((CX - tw + i * 4, f - 33, P['frost']))
    if style not in ('helm', 'hood', 'beetle'):
        hl = tone(P['hair'], 0.35)
        for i in range(5): det.append((hx - 6 + i * 2, headY - 11 + (i % 2), hl))
        det += [(hx - 9, headY - 7, hl), (hx + 8, headY - 8, hl)]
    for x in (CX - tw // 2, CX + tw // 2):
        for y in range(f - 30, f - 18, 2): det.append((x, y, tone(P['torso'], -0.28)))
    # --- brazo delantero + arma ---
    frontX = CX - tw - 2 if not side else CX + 1
    if back: frontX = CX + tw + 2
    endA = arm(frontX, armA if not back else -armA, True)
    wk = P.get('weapon'); wc = P.get('weaponColor', '#cccccc'); wang = pose.get('wang', 0.0)
    if wk and not back:
        hx_, hy_ = endA
        if wk == 'keel':
            cv.poly([(hx_ - 1, hy_ + 3), (hx_ + 1, hy_ + 3), (hx_ + 3 + 10 * math.sin(wang), hy_ - 24 + 4 * (1 - math.cos(wang))), (hx_ - 1 + 10 * math.sin(wang), hy_ - 28)], wc)
        elif wk == 'prism_staff':
            cv.rect((hx_ - 1, hy_ - 26, hx_ + 1, hy_ + 6), '#8a6a3a'); cv.poly([(hx_, hy_ - 34), (hx_ + 4, hy_ - 28), (hx_, hy_ - 22), (hx_ - 4, hy_ - 28)], wc, shade=False)
        elif wk == 'hooks':
            for s, (ex, ey) in ((1, endA), (-1, endB if not side else endA)):
                cv.poly([(ex, ey - 2), (ex + 2 * s, ey - 2), (ex + 8 * s, ey - 8), (ex + 11 * s, ey - 4), (ex + 8 * s, ey - 5), (ex + 2 * s, ey + 2)], wc)
        elif wk == 'scepter':
            cv.rect((hx_ - 1, hy_ - 20, hx_ + 1, hy_ + 6), wc); cv.ellipse((hx_ - 3, hy_ - 25, hx_ + 3, hy_ - 19), '#c06bd8', shade=False)
        elif wk == 'astrolabe':
            m = Image.new('1', (W, H), 0); ImageDraw.Draw(m).ellipse((hx_ - 7, hy_ - 9, hx_ + 7, hy_ + 3), outline=1, width=2); cv.add(m, wc, shade=False, sep=False)
        elif wk == 'key':
            cv.rect((hx_ - 1, hy_ - 32, hx_ + 1, hy_ + 10), wc)
            m = Image.new('1', (W, H), 0); ImageDraw.Draw(m).ellipse((hx_ - 5, hy_ - 42, hx_ + 5, hy_ - 32), outline=1, width=2); cv.add(m, wc, shade=False, sep=False)
            cv.rect((hx_, hy_ + 4, hx_ + 5, hy_ + 6), wc); cv.rect((hx_, hy_ + 8, hx_ + 4, hy_ + 10), wc)
    # brillo de manos (lanzamiento / definitiva)
    if pose.get('glow'):
        g1, g2 = P['glow']
        for (ex, ey), gc in ((endA, g1), (endB if not side else endA, g2)):
            for dx, dy in ((0, -1), (1, 0), (-1, 0), (0, 1), (0, 0)): det.append((round(ex + dx), round(ey + dy - 1), gc))
    return cv.render(det)

POSES = {
 'walk': [dict(leg=0, bob=0), dict(leg=1, bob=-1, armA=0.35, armB=-0.05), dict(leg=0, bob=0), dict(leg=-1, bob=-1, armA=-0.05, armB=-0.35)],
 'attack': [dict(armA=-0.7, wang=-0.6), dict(armA=2.2, wang=1.2, bob=-1), dict(armA=1.6, wang=0.9), dict(armA=0.5, wang=0.2)],
 'cast': [dict(armA=0.9, armB=-0.9), dict(armA=1.9, armB=-1.9, glow=True, bob=-1), dict(armA=2.5, armB=-2.5, glow=True, bob=-1), dict(armA=1.4, armB=-1.4)],
 'ult': [dict(armA=1.0, armB=-1.0, bob=-1), dict(armA=2.4, armB=-2.4, glow=True, lift=2), dict(armA=2.8, armB=-2.8, glow=True, lift=4), dict(armA=2.6, armB=-2.6, glow=True, lift=3)],
}
def death_frames(img):
    out = []
    for ang in (0, 25, 60, 90):
        fr = img.rotate(-ang, resample=Image.NEAREST, center=(CX, FOOT))
        if ang >= 60:
            bb = fr.getbbox(); dy = FOOT - bb[3] if bb else 0
            fr2 = Image.new('RGBA', (W, H)); fr2.alpha_composite(fr, (0, max(-20, min(20, dy)))); fr = fr2
        out.append(fr)
    return out

def build(cfg):
    frames = []
    for view in ('down', 'side', 'up'):
        frames += [draw(cfg, 'side' if view == 'side' else ('up' if view == 'up' else 'down'), p) for p in POSES['walk']]
    for view in ('down', 'side', 'up'):
        frames += [draw(cfg, 'side' if view == 'side' else ('up' if view == 'up' else 'down'), p) for p in POSES['attack']]
    frames += [draw(cfg, 'down', p) for p in POSES['cast']]
    frames += [draw(cfg, 'down', p) for p in POSES['ult']]
    frames += death_frames(draw(cfg, 'down', dict()))
    atlas = Image.new('RGBA', (W * 4, H * 9))
    for i, fr in enumerate(frames): atlas.alpha_composite(fr, ((i % 4) * W, (i // 4) * H))
    return atlas, frames[0]

SETS = {"idle_down": [0], "walk_down": [0, 1, 2, 3], "attack_down": [12, 13, 14, 15], "cast_down": [24, 25, 26, 27], "ultimate_down": [28, 29, 30, 31], "hit_down": [12], "death_down": [32, 33, 34, 35],
        "idle_side": [4], "walk_side": [4, 5, 6, 7], "attack_side": [16, 17, 18, 19], "cast_side": [24, 25, 26, 27], "ultimate_side": [28, 29, 30, 31], "hit_side": [16], "death_side": [32, 33, 34, 35],
        "idle_up": [8], "walk_up": [8, 9, 10, 11], "attack_up": [20, 21, 22, 23], "cast_up": [24, 25, 26, 27], "ultimate_up": [28, 29, 30, 31], "hit_up": [20], "death_up": [32, 33, 34, 35]}

def main():
    js = ['"use strict";', '// GENERADO por tools/art/ascension_sprites.py — arte generado, PENDIENTE DE REVISIÓN del Visual Gate.',
          '// Mismo formato que la Expedición (112x112, 4x9, pies en y=106). Las skins se eligen con ascSkin (js/champions/ascension/render.js).']
    manifest = {}
    for k, cfg in BASE.items():
        looks = [('', cfg)] + [(f'_alt{i + 1}', {**cfg, **s}) for i, s in enumerate(SKINS.get(k, []))]
        for suffix, look in looks:
            atlas, idle = build(look)
            d = ROOT / 'assets/sprites/champions' / k / ('skins/' + k + suffix if suffix else '')
            d.mkdir(parents=True, exist_ok=True)
            atlas.save(d / 'atlas.png'); idle.crop((16, 30, 96, 110)).resize((160, 160), Image.NEAREST).save(d / 'preview.png')
            bb = idle.getbbox(); refH = bb[3] - bb[1]
            meta = {"w": W, "h": H, "cols": 4, "refH": refH, "anchor": FOOT / H, "fix": {"left": "mirror"}, "sets": SETS}
            rel = str((d / 'atlas.png').relative_to(ROOT))
            js.append(f'champPackLoadAtlas({json.dumps(k + suffix)},{json.dumps(rel)},{json.dumps(meta, separators=(",", ":"))});')
            manifest[k + suffix] = {"atlas": rel, "preview": str((d / 'preview.png').relative_to(ROOT)), "sha256": hashlib.sha256((d / 'atlas.png').read_bytes()).hexdigest(), "refH": refH,
                                    "review": "PENDING", "generated": True}
    (ROOT / 'js/champions/ascension/art.js').write_text('\n'.join(js) + '\n')
    (ROOT / 'docs/founders/generated-art.json').write_text(json.dumps(manifest, indent=1) + '\n')
    print('atlases:', len(manifest))

if __name__ == '__main__':
    main()
