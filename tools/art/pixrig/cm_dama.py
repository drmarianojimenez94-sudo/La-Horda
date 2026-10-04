"""La Dama del Telón (cm_dama; sus espejismos cm_espejismo usan el mismo cuerpo) — ficha P0-02.
Mujer altísima y demacrada, piel gris pálida, corona de espinas doradas, un vestido que es un telón de teatro rojo y
pesado que se arrastra y se abre en jirones, manos largas con uñas negras. Se mueve flotando, solemne.
Celda 96×128, personaje ≈110 px. Paleta: #140a10 #4a1020 #9a1a2c #d0303a #c8b8b0 #e0b050."""
import math
import numpy as np
from pixrig import *
from pixrig import _hash
from biped import merge, s

W, H, G = 96, 128, 124
CURTAIN = ramp_from('#2a0610', '#5a0e1c', '#9a1a2c', '#c02a36', '#e0504e')
M = {
    'curtain': Mat(CURTAIN, tex=tex_stripes(6, 2, 'x', -1, 1)),
    'curtain_in': Mat(ramp_from('#08040a', '#140a10', '#22101a', '#3a1424', '#4a1020'), tex=tex_stripes(6, 1, 'x', -1, 3)),
    'bodice': Mat(ramp_from('#0e0408', '#22080e', '#3a0c18', '#4a1020', '#6a1a2c')),
    'skin': Mat(ramp_from('#4a4248', '#7a7076', '#a89aa0', '#c8b8b0', '#e4d8d2')),
    'hair': Mat(ramp_from('#060408', '#0e0a10', '#1a1218', '#281c24', '#3a2a34'), tex=tex_stripes(2, 1, 'x', -1)),
    'gold': Mat(ramp_from('#4a3010', '#8a6424', '#c08a34', '#e0b050', '#f8e09a')),
    'nail': Mat(ramp_from('#040306', '#0a0810', '#141018', '#201a24', '#2e2632')),
    'socket': Mat(ramp_from('#08040a', '#120810', '#1c0c16', '#26101c', '#301420'), shade=0),
    'eye': Mat(ramp_from('#5a0a10', '#a01a20', '#ff3a3a', '#ff8a8a', '#ffd0d0'), emissive=True, base=3),
    'fringe': Mat(ramp_from('#4a3010', '#8a6424', '#c08a34', '#e0b050', '#f8e09a'), tex=tex_stripes(2, 1, 'x', -2)),
    'shadow': Mat(ramp_from('#08040a', '#160a14', '#26102a', '#3a1640', '#521e58'), emissive=True, base=2),
    'mirage': Mat(ramp_from('#3a2a4a', '#6a5a8a', '#a89ac8', '#d8d0f0', '#ffffff'), emissive=True, base=2),
}
R = Rig(W, H, M)
R.bone('root', None, (W // 2, G))
R.bone('waist', 'root', (0, -56))
R.bone('chest', 'waist', (1, -16))
R.bone('neck', 'chest', (2, -12))
R.bone('head', 'neck', (1, -5))
for side, sgn in (('N', 1), ('F', -1)):
    R.bone('sh' + side, 'chest', (sgn * 2, -9))
    R.bone('elb' + side, 'sh' + side, (0, 17))
    R.bone('hand' + side, 'elb' + side, (0, 16))
# torso delgado (corsé vino) y cabeza demacrada
R.part('bodice', 'chest', Poly([(-5, -10), (5, -11), (6, 2), (4, 16), (-4, 16), (-6, 2)]), 'bodice', 30)
R.part('collar', 'chest', Poly([(-7, -12), (-2, -16), (3, -16), (7, -12), (2, -9), (-3, -9)]), 'curtain', 30.5)
R.part('neckP', 'neck', Capsule(0, 2, 0, -5, 2.4, 2.2), 'skin', 31)
R.part('hairB', 'head', Poly([(-7, -12), (2, -15), (5, -8), (-2, 4), (-9, 12), (-11, 2)]), 'hair', 32)
R.part('face', 'head', Ellipse(2, -6, 5.6, 7.4), 'skin', 33)
R.part('cheekhollow', 'head', Ellipse(4, -3, 2, 2.6), 'socket', 33.2, line=False)
R.part('socketE', 'head', Ellipse(4.2, -7.5, 2, 1.6), 'socket', 33.3, line=False)
R.part('eyeP', 'head', Ellipse(4.6, -7.5, 0.9, 0.9), 'eye', 33.4, line=False)
R.part('mouth', 'head', Capsule(3, 0.5, 6.5, 0.2, 0.6, 0.5), 'socket', 33.3, line=False)
R.part('hairF', 'head', Poly([(-6, -12), (4, -14), (7, -10), (0, -10), (-4, -6)]), 'hair', 33.5)
for k in range(5):  # corona de espinas doradas
    x = -5 + k * 2.8
    R.part(f'thorn{k}', 'head', Poly([(x - 1.4, -12.5), (x + 0.6, -19 - (k % 2) * 3), (x + 1.4, -12.5)]), 'gold', 34 + k * .01)
R.part('crownband', 'head', Capsule(-6, -12, 7, -13, 1.2, 1.2), 'gold', 34.1)
# brazos largos de piel gris, uñas negras
for side, z0 in (('F', 10), ('N', 50)):
    R.part('sleeve' + side, 'sh' + side, Poly([(-3.5, -2), (3.5, -2), (5, 10), (-4, 10)]), 'curtain', z0)
    R.part('upper' + side, 'sh' + side, Capsule(0, 6, 0, 17, 2.2, 1.9), 'skin', z0 - 0.5)
    R.part('fore' + side, 'elb' + side, Capsule(0, 0, 0, 15, 1.9, 1.6), 'skin', z0 + 0.5, line=False)
    R.part('palm' + side, 'hand' + side, Ellipse(0, 1.5, 2.2, 2.4), 'skin', z0 + 1)
    for k in range(4):
        R.part(f'fing{side}{k}', 'hand' + side, Capsule(0, 2, -2 + k * 1.4, 9 + (k % 2) * 1.5, 0.8, 0.5), 'skin', z0 + 1.1 + k * .01, line=False)
        R.part(f'nail{side}{k}', 'hand' + side, Capsule(-2 + k * 1.4, 9 + (k % 2) * 1.5, -2.3 + k * 1.4, 12.5 + (k % 2) * 1.5, 0.7, 0.3), 'nail', z0 + 1.2 + k * .01, line=False)


def dress(t, open_=0.0, trail=1.0, wrap=0.0, fall=0.0, z=20):
    """El telón: falda pesada desde la cintura al piso que se arrastra hacia atrás, abierta adelante (open_),
    con ruedo en jirones que ondula y fleco dorado. wrap: la envuelve (sube hasta la cabeza). fall: cae vacía al piso."""
    out = []
    top = -56 + fall * 50 - wrap * 30
    wobble = lambda u, ph: 2.2 * math.sin(2 * math.pi * (t + ph + u * 0.6))
    # contorno: frente (derecha) desde la cintura hasta el ruedo, ruedo hacia atrás, cola, espalda
    front_x = 7 + 10 * open_
    hem = []
    for j in range(9):
        u = j / 8
        x = front_x + 6 - u * (40 + 18 * trail)
        y = -1 - (3 if j % 2 else 0) * (1 - fall) + wobble(u, 0) * (1 - fall)
        hem.append((x, y))
    back = [(-12 - 6 * trail, -24 + fall * 20), (-9, top + 10), (-5 - wrap * 3, top)]
    front = [(4 + wrap * 3, top), (front_x - 2, top + 22), (front_x + 6, -6)]
    T = 'root'
    out.append(Part('dress', T, Poly(front + hem + back), 'curtain', z))
    if open_ > 0.05:  # se abre adelante: el forro oscuro y los jirones
        o = open_
        out.append(Part('dressIn', T, Poly([(2, top + 10), (front_x - 1, top + 22), (front_x + 4, -4), (front_x - 8 * o, -2), (0, top + 26)]), 'curtain_in', z + .5))
        for k in range(3):
            x0 = front_x - 2 - k * 4
            out.append(Part(f'tat{k}', T, Poly([(x0 - 2, -16), (x0 + 1, -16), (x0 + 3 * o, 2 + k * 2), (x0 - 1, -2)]), 'curtain', z + .6))
    # fleco dorado en el ruedo
    for j in range(8):
        a, b = hem[j], hem[j + 1]
        out.append(Part(f'fr{j}', T, Capsule(a[0], a[1] - 1, b[0], b[1] - 1, 1.2, 1.2), 'fringe', z + .7, line=False))
    # pliegues verticales del telón (bandas más claras)
    for k in range(3):
        x = 2 - k * 8
        out.append(Part(f'fold{k}', T, Poly([(x - 1.5, top + 12 + k * 3), (x + 1, top + 12 + k * 3), (x - 4 - k * 2, -6), (x - 7 - k * 2, -6)]), 'curtain_in', z + .3, line=False))
    return out


def F(P, t, ex=(), diss=None, **kw):
    return R.render(P, dress(t, **kw) + list(ex), dissolve=diss)


def glows(t, cx, cy, n=8, r=16, mat='shadow', size=2.2, z=90):
    out = []
    for i in range(n):
        a = 2 * math.pi * (i / n + t * 0.3)
        rr = r * (0.6 + 0.5 * _hash(i, 8, 3))
        T = np.array([[1, 0, cx + math.cos(a) * rr], [0, 1, cy + math.sin(a) * rr * 0.7], [0, 0, 1.0]])
        out.append(Part(f'gl{i}', T, Ellipse(0, 0, size, size), mat, z + i * .01, fx=True))
    return out


def build():
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    rest = {'shN': -10, 'elbN': -20, 'shF': 8, 'elbF': -14, 'head': 4}
    fl = lambda t, a=1.0: {'waist': (0, 0, round(-2 * a * s(t)))}
    add('idle', [F(merge(rest, fl(i / 4), {'shN': -10 + 4 * s(i / 4)}), i / 4) for i in range(4)])
    add('walk', [F(merge(rest, fl(i / 6, 1.3), {'chest': 6, 'head': 0, 'shN': -4, 'shF': 16}), i / 6, trail=1.3) for i in range(6)])
    atk = []
    for i in range(6):  # levanta un brazo / lo baja con fuerza (el vestido se abre) / vuelve
        if i < 2: k = (i + 1) / 2; P = merge(rest, {'shN': -10 - 115 * k, 'elbN': -40 * k, 'chest': -6 * k, 'head': -4 * k}); o = 0
        elif i < 4: P = merge(rest, {'shN': -30, 'elbN': -10, 'chest': 10, 'head': 6}); o = 1
        else: k = (i - 3) / 2; P = merge(rest, {'shN': -30 + 20 * k, 'chest': 10 * (1 - k)}); o = 1 - k
        atk.append(F(P, i / 6, open_=o))
    add('atk', atk)
    cast = []
    for i in range(4):
        k = [0.5, 1, 1, 0.6][i]
        P = merge(rest, {'shN': -90 * k, 'elbN': 0, 'shF': 90 * k, 'elbF': 0, 'head': -6 * k})
        cast.append(F(P, i / 4, glows(i / 4, W / 2, 50, 8, 14 + 10 * k), open_=0.5 * k))
    add('cast', cast)
    summ = []
    for i in range(8):  # brazos arriba, el telón se abre y suben sombras
        k = math.sin(math.pi * min(1, i / 6)) if i < 7 else 0.4
        P = merge(rest, {'shN': -120 * k, 'elbN': -35 * k, 'shF': -110 * k, 'elbF': -35 * k, 'head': -10 * k, 'chest': -6 * k})
        summ.append(F(P, i / 8, glows(i / 8, W / 2 + 4, G - 12 - 30 * k, 10, 20 + 12 * k, 'shadow', 2.8), open_=k))
    add('summon', summ)
    mir = []
    for i in range(5):  # tiende la mano: el espejismo titila
        k = math.sin(math.pi * i / 4)
        P = merge(rest, {'shN': -70 * k - 10, 'elbN': -10, 'head': 2})
        Mw = R.world(P)['handN']; ox, oy = (Mw @ np.array([0, 10, 1.0]))[:2]
        mir.append(F(P, i / 5, glows(i / 5, ox + 4, oy, 8, 6 + 8 * k, 'mirage', 1.4)))
    add('mirror', mir)
    add('hit', [F(merge(rest, {'chest': -12, 'head': -16, 'shN': 20, 'shF': 20, 'waist': (0, -3, -1)}), 0.1), F(merge(rest, {'chest': -6, 'head': -8}), 0.3)])
    dth = []
    for i in range(6):  # el telón la envuelve y cae vacío al piso
        if i < 3:
            k = (i + 1) / 3
            P = merge(rest, {'shN': -10 + 20 * k, 'shF': 8 + 20 * k, 'head': 10 * k, 'waist': (0, 0, -4 * k)})
            dth.append(F(P, i / 6, wrap=k, open_=0, trail=1 - 0.4 * k, diss=None))
        else:
            k = (i - 2) / 3
            dth.append(R.render({'waist': (0, 0, 60)}, dress(i / 6, fall=k, trail=0.6 + 0.6 * k, wrap=max(0, 1 - k * 1.5)), hide=set(p.name for p in R.parts)))
    add('death', dth)
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 3.6}


TARGET = {'png': 'assets/sprites/arenas/ciudad/cm_dama/atlas.png', 'meta_file': 'js/assets/ciudad-meta.js', 'const': 'CIUDAD_ATLAS', 'aliases': ['cm_espejismo']}
