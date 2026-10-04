"""El Carcelero del Vacío (ab_carcelero) — ficha P0-11 de docs/ART_COMMISSION_BRIEF.md.
Gigante encadenado que mantiene unidas las ruinas del Abismo: cuerpo enorme de piel gris morada, yelmo de hierro con
forma de jaula y una ranura que brilla violeta, grilletes en muñecas y cuello de los que cuelgan cadenas gruesas,
taparrabos rojo oscuro, cadenas enrolladas en los brazos que usa como látigo.
Celda 128×128, personaje ≈118 px. Paleta: #0e0a12 #3a2a3a #6a5a6a #7a2a4a #b070ff #9a9aa6."""
import math
import numpy as np
from pixrig import *
from pixrig import _hash
from biped import merge, s

W, H, G = 128, 128, 125
TARGET = {'png': 'assets/sprites/arenas/abismo/ab_carcelero/atlas.png', 'meta_file': 'js/assets/abismo-meta.js', 'const': 'ABISMO_ATLAS'}
M = {
    'skin': Mat(ramp_from('#1a141e', '#3a2e40', '#5a4a5e', '#6a5a6a', '#94849a'), tex=tex_noise(2, 1, .9, 81)),
    'skin_far': Mat(ramp_from('#100c14', '#241c2a', '#3a2e40', '#4e4054', '#665870'), tex=tex_noise(2, 1, .9, 82)),
    'iron': Mat(ramp_from('#0e0a12', '#221a26', '#3a2a3a', '#5a4a5a', '#7e6e7e')),
    'chain': Mat(ramp_from('#2a2a34', '#5a5a66', '#8a8a96', '#b4b4c0', '#e0e0ea')),
    'cloth': Mat(ramp_from('#140610', '#2e0c1e', '#4e1630', '#7a2a4a', '#9a4060'), tex=tex_stripes(4, 1, 'x', -1)),
    'void': Mat(ramp_from('#4a1a8a', '#7a3ac8', '#b070ff', '#d0a8ff', '#f4e8ff'), emissive=True, base=2),
    'void_hot': Mat(ramp_from('#7a3ac8', '#b070ff', '#d0a8ff', '#f0e0ff', '#ffffff'), emissive=True, base=3),
    'dark': Mat(ramp_from('#06040a', '#0c0810', '#120c16', '#18101c', '#1e1422'), shade=0),
    'scar': Mat(ramp_from('#2a1420', '#4a2030', '#6a2a40', '#8a3a50', '#a85068'), shade=0),
    'dust': Mat(ramp_from('#1a1220', '#2e2236', '#4a3a52', '#6a5a72', '#8a7a92'), emissive=True, base=2),
}
R = Rig(W, H, M)
R.bone('root', None, (W // 2 - 6, G))
R.bone('pelvis', 'root', (0, -40))
R.bone('chest', 'pelvis', (3, -20))
R.bone('head', 'chest', (14, -30))
for side, dx, mat, z0 in (('F', 7, 'skin_far', 0), ('N', -5, 'skin', 40)):
    R.bone('hip' + side, 'pelvis', (dx, 4))
    R.bone('knee' + side, 'hip' + side, (2, 19))
    R.bone('foot' + side, 'knee' + side, (-1, 17))
    R.part('thigh' + side, 'hip' + side, Capsule(0, 0, 2, 19, 10, 8.5), mat, z0 + 1)
    R.part('shin' + side, 'knee' + side, Capsule(0, 0, -1, 17, 8, 7), mat, z0 + 2, line=False)
    R.part('foot' + side, 'foot' + side, Ellipse(4, 1, 10, 4.5), mat, z0 + 3, line=False)
    R.part('ankle' + side, 'foot' + side, Ellipse(0, -5, 7.5, 3), 'iron', z0 + 3.2)
# torso enorme
R.part('back', 'chest', Ellipse(-6, -12, 22, 22, -10), 'skin', 20)
R.part('chestP', 'chest', Ellipse(6, -14, 20, 18, 10), 'skin', 21)
R.part('belly', 'pelvis', Ellipse(4, -8, 18, 16), 'skin', 20.5)
R.part('pec', 'chest', Ellipse(12, -16, 10, 8, 20), 'skin', 21.3)
R.part('scar1', 'chest', Chain([(-4, -26), (4, -16), (2, -4)], [0.8, 1, 0.8]), 'scar', 21.5, line=False)
R.part('scar2', 'chest', Chain([(10, -6), (18, -2)], [0.7, 0.7]), 'scar', 21.5, line=False)
R.part('loin', 'pelvis', Poly([(-14, -6), (16, -6), (14, 2), (10, 20), (2, 16), (-6, 22), (-12, 4)]), 'cloth', 22)
R.part('belt', 'pelvis', Poly([(-15, -9), (17, -9), (17, -4), (-15, -4)]), 'iron', 22.5)
R.part('collar', 'chest', Ellipse(10, -30, 13, 6, -10), 'iron', 29)
R.part('collarbolt', 'chest', Ellipse(18, -30, 2.2, 2.2), 'chain', 29.2)
# yelmo jaula con ranura violeta
R.part('headD', 'head', Ellipse(1, -6, 11, 12), 'dark', 30)
R.part('helm', 'head', Ellipse(1, -7, 12, 13) - Ellipse(8, -6, 6, 9), 'iron', 31)
for k in range(4):
    x = -6 + k * 4.4
    R.part(f'bar{k}', 'head', Capsule(x, -19, x + 1, 5, 1.2, 1.2), 'iron', 31.5 + k * .01)
R.part('band1', 'head', Capsule(-10, -12, 12, -12, 1.4, 1.4), 'iron', 31.6)
R.part('band2', 'head', Capsule(-9, -2, 12, -2, 1.4, 1.4), 'iron', 31.6)
R.part('slit', 'head', Capsule(3, -7, 12, -7, 1.3, 1.1), 'void', 31.8, line=False)
R.part('slithot', 'head', Capsule(6, -7, 11, -7, 0.6, 0.5), 'void_hot', 31.9, line=False)
R.part('spike', 'head', Poly([(-2, -19), (1, -27), (4, -19)]), 'iron', 31.7)
# brazos gigantes con grilletes; cadenas enrolladas
for side, sx, mat, z0 in (('F', 10, 'skin_far', 5), ('N', -2, 'skin', 50)):
    R.bone('sh' + side, 'chest', (sx, -22))
    R.bone('elb' + side, 'sh' + side, (2, 22))
    R.bone('hand' + side, 'elb' + side, (2, 20))
    R.part('shoulder' + side, 'sh' + side, Ellipse(0, 2, 12, 11), mat, z0)
    R.part('upper' + side, 'sh' + side, Capsule(0, 0, 2, 22, 9.5, 8), mat, z0 + 1)
    R.part('fore' + side, 'elb' + side, Capsule(0, 0, 2, 20, 8, 7.5), mat, z0 + 2, line=False)
    R.part('fist' + side, 'hand' + side, Ellipse(1, 3, 7.5, 7), mat, z0 + 3)
    R.part('cuff' + side, 'hand' + side, Ellipse(0, -3, 8.5, 4), 'iron', z0 + 3.3)
    for k in range(3):  # cadena enrollada en el antebrazo
        R.part(f'coil{side}{k}', 'elb' + side, Ellipse(1 + k * 0.5, 4 + k * 4.5, 8.4, 1.8, 8), 'chain', z0 + 2.2 + k * .01, line=False)


def links(T, pts, z, name, big=True):
    """Cadena gruesa a lo largo de una polilínea: eslabones alternados (de frente / de canto)."""
    out = []; k = 0
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        L = math.hypot(x1 - x0, y1 - y0); a = math.degrees(math.atan2(y1 - y0, x1 - x0))
        n = max(1, int(L / (5.6 if big else 4.2)))
        for j in range(n):
            u = (j + .5) / n; x, y = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u
            if k % 2: out.append(Part(f'{name}{k}', T, Ellipse(x, y, 3.8 if big else 2.8, 1.6, a), 'chain', z + k * .001))
            else: out.append(Part(f'{name}{k}', T, Ellipse(x, y, 4.0 if big else 3.0, 3.2 if big else 2.4, a) - Ellipse(x, y, 1.8, 1.1, a), 'chain', z + k * .001))
            k += 1
    return out


def hang(Mw, bone, at, length, t, sway=1.0, ph=0.0, drag=0.0):
    """Puntos de una cadena que cuelga desde un hueso (en coordenadas del cuadro); drag: se arrastra por el piso."""
    x, y = (Mw[bone] @ np.array([at[0], at[1], 1.0]))[:2]
    pts = [(x, y)]; n = 6
    for j in range(1, n + 1):
        u = j / n
        px = x + sway * 4 * math.sin(2 * math.pi * (t + ph) + u * 2) * u - drag * 30 * u * u
        py = min(G - 1, y + length * u)
        pts.append((px, py))
    if drag > 0 and pts[-1][1] >= G - 1: pts.append((pts[-1][0] - 16 * drag, G - 1))
    return pts


def chains(P, t, sway=1.0, whip=None, drag=0.0, broken=0.0):
    Mw = R.world(P); I = np.eye(3)
    out = []
    if broken < 1:
        out += links(I, hang(Mw, 'chest', (6, -28), 26 * (1 - broken * .6), t, sway, 0.0), 29.5, 'cn')
        out += links(I, hang(Mw, 'handF', (0, 2), 34, t, sway, 0.3, drag), 8.5, 'cf')
    if whip is None:
        out += links(I, hang(Mw, 'handN', (0, 2), 38 * (1 - broken * .5), t, sway, 0.6, drag), 53.5, 'cw')
    else:
        x, y = (Mw['handN'] @ np.array([0, 4, 1.0]))[:2]
        pts = [(x, y)]
        for j in range(1, 7):
            u = j / 6
            pts.append((x + whip[0] * u, y + whip[1] * u + whip[2] * math.sin(math.pi * u)))
        out += links(I, pts, 95, 'cw')
        ex, ey = pts[-1]
        out.append(Part('hook', np.array([[1, 0, ex], [0, 1, ey], [0, 0, 1.0]]), Poly([(-3, -3), (4, -1), (5, 5), (2, 3), (1, 0), (-3, 1)]), 'iron', 95.5))
    return out


def dust(t, x0, y0, n=6, spread=60, k=1.0, z=96):
    out = []
    for i in range(n):
        u = (i + .5) / n - .5
        r = (6 - 3 * abs(u)) * k * (0.8 + 0.4 * _hash(i, 3, 29))
        T = np.array([[1, 0, x0 + u * spread], [0, 1, y0 - r * .6], [0, 0, 1.0]])
        out.append(Part(f'du{i}', T, Ellipse(0, 0, r, r * .7), 'dust', z + i * .01, fx=True))
    return out


def cracks(x0, k=1.0, z=1):
    out = []
    for j, (dx, L, a) in enumerate([(0, 22, 8), (-6, 16, 170), (4, 14, 30), (-2, 12, 150)]):
        T = np.array([[1, 0, x0 + dx], [0, 1, G - 1], [0, 0, 1.0]])
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a)) * 0.25
        out.append(Part(f'ck{j}', T, Chain([(0, 0), (ca * L * k * .5, sa * L * k * .5 + 1), (ca * L * k, sa * L * k)], [1.2, 0.9, 0.5]), 'void', z + j * .01, fx=True))
    return out


def F(P, t, ex=(), diss=None, **kw):
    return R.render(P, chains(P, t, **kw) + list(ex), dissolve=diss)


REST = {'shN': -8, 'elbN': -12, 'shF': 6, 'elbF': -10}


def walk_pose(t):
    return merge(REST, {'hipN': -20 * s(t), 'kneeN': 22 * max(0, s(t, .6)), 'hipF': -20 * s(t, .5), 'kneeF': 22 * max(0, s(t, .1)),
                        'pelvis': (0, 0, -abs(3 * s(t)) + 1.5), 'chest': 3 * s(t, .25), 'shN': -8 + 14 * s(t, .5), 'shF': 6 + 14 * s(t), 'head': 2 * s(t, .3)})


def build():
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    add('idle', [F(merge(REST, {'chest': (1.2 * s(i / 4), 0, -1 * s(i / 4)), 'head': 2 * s(i / 4, .2)}), i / 4, sway=.6) for i in range(4)])
    add('walk', [F(walk_pose(i / 6), i / 6, sway=1, drag=.6) for i in range(6)])
    ch = []
    for i in range(8):  # echa la cadena atrás / la lanza en línea / recoge
        if i < 2: k = (i + 1) / 2; P = merge(REST, {'shN': 30 + 60 * k, 'elbN': -40 * k, 'chest': -10 * k}); wh = (-30 * k, -30 * k, -10)
        elif i < 5: P = merge(REST, {'shN': -95, 'elbN': 0, 'chest': 12, 'pelvis': (0, 0, 2)}); wh = (40 + 10 * (i - 2), 2, -3)
        else: k = (i - 4) / 3; P = merge(REST, {'shN': -95 + 80 * k, 'elbN': -10 * k, 'chest': 12 * (1 - k)}); wh = (50 * (1 - k), 10 * k, 6 * k)
        ch.append(F(P, i / 8, whip=wh))
    add('chain', ch)
    add('atk', [ch[1], ch[2], ch[3], ch[5]])
    dr = []
    for i in range(8):  # gancho que arrastra: lanza y tira hacia sí
        k = i / 7
        if i < 3: P = merge(REST, {'shN': -95, 'elbN': 0, 'chest': 10}); wh = (44, -4 + 4 * i, -4)
        else: P = merge(REST, {'shN': -95 + 70 * k, 'elbN': -60 * k, 'chest': 10 - 24 * k, 'pelvis': (-4 * k, 0, 0), 'hipN': 14 * k, 'kneeN': 10 * k}); wh = (44 * (1 - k) + 8, 6 * k, 2)
        dr.append(F(P, i / 8, whip=wh))
    add('drag', dr)
    sl = []
    for i in range(6):  # levanta el pie / pisa y el piso se agrieta / recupera
        if i < 2: k = (i + 1) / 2; P = merge(REST, {'hipN': -60 * k, 'kneeN': 60 * k, 'chest': -8 * k, 'shN': -30 * k, 'shF': 30 * k, 'pelvis': (0, -2 * k, -3 * k)}); ex = []
        elif i < 4: P = merge(REST, {'hipN': -14, 'kneeN': 12, 'chest': 10, 'pelvis': (0, 0, 3)}); ex = dust(i / 6, W // 2 + 4, G - 2, 7, 70, 1.2) + cracks(W // 2 + 2, (i - 1) / 2)
        else: k = (i - 3) / 2; P = merge(REST, {'hipN': -14 * (1 - k), 'kneeN': 12 * (1 - k), 'chest': 10 * (1 - k)}); ex = cracks(W // 2 + 2, 1, 0.5)
        sl.append(F(P, i / 6, ex, sway=1.5 if i >= 2 else .5))
    add('slam', sl)
    br = []
    for i in range(8):  # rompe el piso con las cadenas: las alza con las dos manos y las estrella
        k = math.sin(math.pi * min(1, i / 4)) if i < 4 else 0
        if i < 4: P = merge(REST, {'shN': -100 * k, 'shF': -92 * k, 'elbN': -50 * k, 'elbF': -50 * k, 'chest': -6 * k, 'pelvis': (0, 0, 3 * k)})
        else: P = merge(REST, {'shN': -60, 'shF': -50, 'chest': 22, 'pelvis': (0, 0, 4), 'head': 10})
        ex = (dust(i / 8, W - 30, G - 2, 6, 50, 1.1) + cracks(W - 30, min(1, (i - 3) / 3))) if i >= 4 else []
        br.append(F(P, i / 8, ex, sway=2 if i >= 4 else 1, whip=(30, 24, 8) if i >= 4 else None))
    add('break', br)
    add('hit', [F(merge(REST, {'chest': -12, 'head': -14, 'pelvis': (0, -4, 0), 'shN': 20, 'shF': 20}), 0.1, sway=2), F(merge(REST, {'chest': -6, 'head': -7}), 0.3, sway=1.5)])
    dth = []
    for i in range(6):  # cae de rodillas y las cadenas se rompen
        k = ease(min(1, i / 3))
        P = {'pelvis': (0, 0, 20 * k), 'hipN': -80 * k, 'kneeN': 110 * k, 'hipF': -70 * k, 'kneeF': 100 * k, 'chest': 24 * k, 'head': 20 * k,
             'shN': 10 * k, 'elbN': -10, 'shF': 10 * k}
        ex = []
        if i >= 3:  # eslabones sueltos que saltan y destellos violeta
            for j in range(8):
                a = 2 * math.pi * j / 8 + i
                T = np.array([[1, 0, W / 2 + math.cos(a) * (10 + 6 * i)], [0, 1, 70 + math.sin(a) * (8 + 4 * i)], [0, 0, 1.0]])
                ex.append(Part(f'brk{j}', T, Ellipse(0, 0, 2.4, 1.6, a * 40) - Ellipse(0, 0, 1, .6, a * 40), 'chain', 96))
            ex += cracks(W // 2, 0.6)
        dth.append(F(P, i / 6, ex, broken=min(1, max(0, (i - 2) / 2)), diss=((i - 4) / 2 * 0.7, 91) if i >= 5 else None))
    add('death', dth)
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 3.3}
