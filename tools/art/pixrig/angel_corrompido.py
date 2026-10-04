"""El Ángel Corrompido (angel_corrompido) — ficha F-02 de docs/ART_COMMISSION_BRIEF.md. Forma 1 del jefe final.
El Hechicero Supremo (capucha, cara de calavera, halo dorado) con los poderes robados: túnica blanca manchada de
carmesí, alas rotas de plumas rojas y negras, halo dorado agrietado, cara serena y cruel. Los cuatro cristales que
orbitan los dibuja el juego (hechDrawAngelFront), así que no van en la hoja.
Celda 128×128, personaje ≈112 px. Paleta: #1a0a0e #8a1a2a #efe6d6 #e8c27a #8ee07a #bfe8ff."""
import math
import numpy as np
from pixrig import *
from pixrig import _hash
from biped import merge, s

W, H, G = 128, 128, 125
TARGET = {'png': 'assets/sprites/bosses/infernal/hechicero/angel/atlas.png'}
M = {
    'robe': Mat(ramp_from('#5a4a48', '#a89888', '#d0c4b4', '#efe6d6', '#fffaf0'), tex=tex_stripes(5, 1, 'x', -1, 1)),
    'robe_far': Mat(ramp_from('#3a302e', '#7a6e66', '#a89888', '#c8bcac', '#e0d6c8'), tex=tex_stripes(5, 1, 'x', -1, 1)),
    'stain': Mat(ramp_from('#2a0610', '#5a0e1c', '#8a1a2a', '#a82434', '#c8404a'), shade=0.5),
    'hood': Mat(ramp_from('#120408', '#2a0a14', '#4a1020', '#6a1a2c', '#8a2a3c')),
    'skin': Mat(ramp_from('#4a3c38', '#8a7a70', '#b8a89a', '#d8ccbe', '#f0e8de')),
    'socket': Mat(ramp_from('#0a0406', '#14080c', '#1e0c12', '#281018', '#32141e'), shade=0),
    'eye': Mat(ramp_from('#5a0a10', '#a01a20', '#ff3a3a', '#ff8a8a', '#ffd0d0'), emissive=True, base=3),
    'gold': Mat(ramp_from('#4a3010', '#8a6424', '#c09a48', '#e8c27a', '#fff0c0')),
    'halo': Mat(ramp_from('#8a6424', '#c09a48', '#e8c27a', '#ffe0a0', '#fff8e0'), emissive=True, base=2),
    'feather_r': Mat(ramp_from('#1a0408', '#4a0a14', '#7a1420', '#a82030', '#d04048')),
    'feather_k': Mat(ramp_from('#060306', '#0e080c', '#1a0e14', '#2a141e', '#3a1c28')),
    'feather_far': Mat(ramp_from('#060204', '#140608', '#240a10', '#3a1018', '#4e1620')),
    'wingbone': Mat(ramp_from('#3a302a', '#7a6c5c', '#a89a86', '#cfc2ac', '#ece2d0')),
    'ember': Mat(ramp_from('#7a1a08', '#c0401a', '#ff6a3a', '#ffb070', '#ffe8c0'), emissive=True, base=3),
    'glow': Mat(ramp_from('#5a0810', '#a01020', '#e02838', '#ff6a6a', '#ffd0d0'), emissive=True, base=2),
}
R = Rig(W, H, M)
R.bone('root', None, (W // 2 + 10, G - 8))
R.bone('body', 'root', (0, -34))
R.bone('chest', 'body', (0, -26))
R.bone('head', 'chest', (3, -20))
R.bone('halo', 'head', (-4, -8))
for side, sgn in (('N', 1), ('F', -1)):
    R.bone('sh' + side, 'chest', (sgn * 3, -14))
    R.bone('elb' + side, 'sh' + side, (0, 17))
    R.bone('hand' + side, 'elb' + side, (0, 15))
    R.bone('wing' + side, 'chest', (-8 + sgn * 2, -12))
# túnica larga que flota (ruedo sin pies), manchada de carmesí
R.part('robe', 'body', Poly([(-10, -26), (9, -26), (14, 0), (18, 30), (10, 34), (2, 30), (-6, 34), (-16, 30), (-14, 0)]), 'robe', 20)
R.part('stain1', 'body', Chain([(9, 4), (11, 14), (10, 24), (12, 32)], [2.4, 1.8, 1.4, 1]), 'stain', 20.4, line=False)
R.part('stain2', 'body', Poly([(-14, 30), (-10, 22), (-7, 27), (-4, 20), (-1, 30), (-6, 33)]), 'stain', 20.4, line=False)
R.part('stain4', 'body', Chain([(-4, -10), (-5, 0), (-3, 6)], [1.2, 1, 0.7]), 'stain', 20.4, line=False)
R.part('stain3', 'body', Chain([(4, -20), (6, -8), (3, 4)], [1.6, 2.2, 1.2]), 'stain', 20.4, line=False)
R.part('torso', 'chest', Poly([(-8, -16), (8, -16), (10, 2), (9, 26), (-9, 26), (-10, 2)]), 'robe', 21)
R.part('stole', 'chest', Poly([(2, -16), (7, -16), (6, 30), (1, 34), (0, 10)]), 'stain', 21.5)
R.part('stoleG', 'chest', Poly([(2, -16), (3, -16), (2, 32), (1, 33)]), 'gold', 21.6, line=False)
R.part('belt', 'chest', Poly([(-10, 12), (10, 12), (10, 15), (-10, 15)]), 'gold', 21.7)
# halo dorado agrietado (anillo con rayos, con un tramo roto)
R.part('haloring', 'halo', Ellipse(0, 0, 17, 17) - Ellipse(0, 0, 14.5, 14.5) - Poly([(4, -20), (12, -20), (6, -8)]), 'halo', 10)
for k in range(8):
    if k == 1: continue
    a = math.radians(k * 45 - 90)
    R.part(f'ray{k}', 'halo', Capsule(math.cos(a) * 17, math.sin(a) * 17, math.cos(a) * 22, math.sin(a) * 22, 1.2, 0.6), 'halo', 10.1)
R.part('crack', 'halo', Chain([(-12, 8), (-15, 5), (-13, 2)], [0.6, 0.6, 0.6]), 'socket', 10.2, line=False)
# capucha y cara de calavera serena
R.part('hoodB', 'head', Ellipse(-2, -4, 9, 10), 'hood', 30)
R.part('face', 'head', Ellipse(3, -3, 5.4, 7), 'skin', 31)
R.part('socketE', 'head', Ellipse(5, -5, 2, 1.4), 'socket', 31.2, line=False)
R.part('eyeA', 'head', Ellipse(5.4, -5, 1, 0.8), 'eye', 31.3, line=False)
R.part('mouthA', 'head', Capsule(3, 1.4, 7, 1, 0.5, 0.4), 'socket', 31.2, line=False)
R.part('hoodF', 'head', Poly([(-10, -6), (-4, -15), (6, -13), (9, -8), (4, -9), (-1, -7), (-2, 4), (-8, 6)]), 'hood', 32)
# brazos
for side, z0 in (('F', 8), ('N', 50)):
    R.part('sleeve' + side, 'sh' + side, Poly([(-4, -2), (4, -2), (6, 18), (-5, 18)]), 'robe' if side == 'N' else 'robe_far', z0)
    R.part('cuff' + side, 'elb' + side, Poly([(-5, 0), (6, 0), (5, 9), (1, 6), (-3, 10)]), 'robe' if side == 'N' else 'robe_far', z0 + 1)
    R.part('arm' + side, 'elb' + side, Capsule(0, 4, 0, 14, 2, 1.8), 'skin', z0 + 0.5)
    R.part('palm' + side, 'hand' + side, Ellipse(0, 2, 2.4, 2.8), 'skin', z0 + 2)
    for k in range(4):
        R.part(f'fg{side}{k}', 'hand' + side, Capsule(0, 2, -2 + k * 1.4, 7 + (k % 2), 0.7, 0.4), 'skin', z0 + 2.1 + k * .01, line=False)


def wing(side, spread=1.0, flap=0.0, broken=1.0, fade=0.0, t=0.0):
    """Ala rota: brazo del ala hacia arriba y atrás, plumas en abanico (rojas y negras alternadas) con huecos."""
    out = []
    far = side == 'F'
    z = 4 if far else 6
    a0 = -112 - 18 * flap - (10 if far else 0)
    L1, L2 = 20 * spread, 22 * spread
    a1 = math.radians(a0); bx, by = math.cos(a1) * L1, math.sin(a1) * L1
    a2 = math.radians(a0 - 52 + 14 * flap); tx, ty = bx + math.cos(a2) * L2, by + math.sin(a2) * L2
    out.append(Part(f'wb{side}', 'wing' + side, Chain([(0, 0), (bx, by), (tx, ty)], [2.4, 1.9, 1.1]), 'wingbone', z + 1))
    n = 10
    for k in range(n):
        if broken and k in (2, 6) and not far: continue  # plumas que faltan (ala rota)
        u = k / (n - 1)
        px, py = (bx * min(1, u * 2), by * min(1, u * 2)) if u < .5 else (bx + (tx - bx) * (u - .5) * 2, by + (ty - by) * (u - .5) * 2)
        fa = math.radians(120 + 55 * u - 12 * flap)          # de casi vertical (cerca del cuerpo) a hacia atrás (punta)
        fl = (12 + 26 * u) * spread * (1 - fade * _hash(k, 2, 77)) * (0.75 if k == n - 2 and broken else 1)
        if fl < 2: continue
        ex_, ey_ = px + math.cos(fa) * fl, py + math.sin(fa) * fl
        pw = (2.2 + 1.4 * u) * spread
        nx, ny = -math.sin(fa) * pw, math.cos(fa) * pw
        mat = 'feather_far' if far else ('feather_r' if k % 2 else 'feather_k')
        out.append(Part(f'f{side}{k}', 'wing' + side, Poly([(px + nx, py + ny), (px + (ex_ - px) * .6 + nx * .8, py + (ey_ - py) * .6 + ny * .8), (ex_, ey_), (px - nx * .6, py - ny * .6)]), mat, z - k * .01))
    return out


def feathers_fall(t, n=10, k=1.0, z=95):
    out = []
    for i in range(n):
        x = W / 2 - 40 + 80 * _hash(i, 1, 33) + 6 * math.sin(2 * math.pi * (t + i * .1))
        y = 20 + 90 * ((_hash(i, 2, 33) + t * 0.6 * k) % 1)
        T = np.array([[1, 0, x], [0, 1, y], [0, 0, 1.0]])
        out.append(Part(f'ff{i}', T, Ellipse(0, 0, 3.2, 1.2, 30 + 60 * _hash(i, 3, 33)), 'feather_r' if i % 2 else 'feather_k', z + i * .01))
    return out


def embers(t, cx, cy, n=8, r=20, z=96, mat='glow', size=1.4):
    out = []
    for i in range(n):
        a = 2 * math.pi * (i / n + t * 0.4)
        rr = r * (0.6 + 0.5 * _hash(i, 5, 44))
        T = np.array([[1, 0, cx + math.cos(a) * rr], [0, 1, cy + math.sin(a) * rr * 0.6], [0, 0, 1.0]])
        out.append(Part(f'em{i}', T, Ellipse(0, 0, size, size), mat, z + i * .01, fx=True))
    return out


def F(P, t, wings=True, flap=0.0, spread=1.0, ex=(), diss=None, fade=0.0):
    w = (wing('F', spread, flap, 1, fade, t) + wing('N', spread, flap * 1.1, 1, fade, t)) if wings else []
    return R.render(P, w + list(ex), dissolve=diss)


def build():
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    rest = {'shN': -12, 'elbN': -24, 'shF': 10, 'elbF': -16}
    hover = lambda t, a=1.0: {'root': (0, 0, round(-3 * a * s(t))), 'head': 2 * s(t, .2)}
    add('idle', [F(merge(rest, hover(i / 4)), i / 4, flap=0.3 * s(i / 4)) for i in range(4)])
    add('walk', [F(merge(rest, hover(i / 4, 1.3), {'body': 8, 'head': -4, 'shN': -4, 'shF': 20}), i / 4, flap=0.5 * s(i / 4), spread=0.95) for i in range(4)])
    def cast_frames(wings):
        out = []
        for i in range(8):  # levanta las manos (los cristales giran rápido: los dibuja el juego)
            k = math.sin(math.pi * min(1, i / 5)) if i < 6 else 0.5
            P = merge(hover(i / 8), {'shN': -140 * k - 12, 'elbN': -20 * k, 'shF': -130 * k + 10, 'elbF': -20 * k, 'head': -8 * k})
            Mw = R.world(P); hx_, hy = (Mw['handN'] @ np.array([0, 4, 1.0]))[:2]
            out.append(F(P, i / 8, wings, flap=0.6 * k, ex=embers(i / 8, hx_, hy - 4, 8, 6 + 10 * k)))
        return out
    add('cast', cast_frames(True))
    add('cast0', cast_frames(False))
    atk = []
    for i in range(4):  # golpe de ala hacia adelante
        k = [0.4, 1.0, 0.7, 0.2][i]
        P = merge(rest, hover(i / 4), {'body': 10 * k, 'chest': 8 * k, 'shN': -60 * k, 'shF': 30 * k})
        atk.append(F(P, i / 4, flap=-1.6 * k + 0.4, spread=1 + 0.15 * k, ex=feathers_fall(i / 4, 4, 1, 97) if i >= 1 else []))
    add('atk', atk)
    add('hit', [F(merge(rest, {'body': -10, 'head': -14, 'root': (0, -4, -2)}), 0.1, flap=0.8), F(merge(rest, {'body': -5, 'head': -7}), 0.3, flap=0.4)])
    dth = []
    for i in range(6):  # las alas se deshacen en plumas
        k = i / 5
        P = merge(rest, {'root': (0, 0, 8 * k), 'body': 10 * k, 'head': 16 * k, 'shN': 10 * k, 'shF': 10 * k})
        dth.append(F(P, i / 6, wings=k < 0.95, flap=-0.3, spread=1 - 0.3 * k, fade=k, ex=feathers_fall(i / 6, 6 + 3 * i, 1, 97),
                     diss=((k - 0.5) * 1.6, 61) if k > 0.5 else None))
    add('death', dth)
    S['walk_down'] = S['walk']; S['kneel'] = [S['death'][3]]
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 4.4}
