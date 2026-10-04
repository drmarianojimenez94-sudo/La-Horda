"""El Tramoyista (cm_tramoyista) — ficha P0-04 de docs/ART_COMMISSION_BRIEF.md.
Bruto jorobado enorme, piel gris violácea llena de cicatrices, cara deforme con colmillos; carga a la espalda un
armazón de madera y hierro con poleas y sogas (la tramoya del teatro), delantal de cuero, brazos gigantes con vendas
y un martillo de utilería. Camina pesado, arrastrando los nudillos.
Celda 128×128, personaje ≈112 px. Paleta: #141012 #4a3a3a #6a2a2a #8a7a8a #a07040 #c02a30."""
import math
import numpy as np
from pixrig import *
from pixrig import _hash
from biped import merge, s

W, H, G = 128, 128, 124
TARGET = {'png': 'assets/sprites/arenas/ciudad/cm_tramoyista/atlas.png', 'meta_file': 'js/assets/ciudad-meta.js', 'const': 'CIUDAD_ATLAS'}
M = {
    'skin': Mat(ramp_from('#1e1820', '#3e3442', '#5e5266', '#8a7a8a', '#b0a2ae'), tex=tex_noise(2, 1, .9, 61)),
    'skin_far': Mat(ramp_from('#141016', '#2a2430', '#3e3442', '#5e5266', '#766a7a'), tex=tex_noise(2, 1, .9, 62)),
    'scar': Mat(ramp_from('#2a1418', '#4a2028', '#6a2a2a', '#8a3a3a', '#aa5050'), shade=0),
    'leather': Mat(ramp_from('#140808', '#2e1010', '#4a1a1a', '#6a2a2a', '#8a3c34'), tex=tex_noise(3, -1, .88, 63)),
    'wood': Mat(ramp_from('#1e1008', '#4a2c14', '#7a5028', '#a07040', '#c49460'), tex=tex_stripes(3, 1, 'y', -1)),
    'iron': Mat(ramp_from('#141012', '#2e2628', '#4a3a3a', '#6e5e5c', '#968684')),
    'rope': Mat(ramp_from('#3a2a18', '#6a5030', '#9a7a4a', '#c0a070', '#dcc49a'), tex=tex_stripes(2, 1, 'y', -1)),
    'bandage': Mat(ramp_from('#5a5048', '#8a8070', '#b8ac98', '#d8ccb8', '#f0e6d4'), tex=tex_stripes(3, 1, 'y', -1)),
    'tusk': Mat(ramp_from('#5a4a3a', '#9a8a70', '#c8b898', '#e8dcc4', '#fff8e8')),
    'red': Mat(ramp_from('#3a0808', '#7a1416', '#c02a30', '#e05048', '#ff8a7a')),
    'eye': Mat(ramp_from('#5a0a08', '#a01a10', '#ff4a2a', '#ff9a5a', '#ffd8a0'), emissive=True, base=3),
    'socket': Mat(ramp_from('#08060a', '#100c10', '#181218', '#201820', '#2a1e28'), shade=0),
    'dust': Mat(ramp_from('#3a3036', '#5a4c54', '#7a6a72', '#9a8a90', '#bcaeb2'), emissive=True, base=2),
    'sack': Mat(ramp_from('#2a1e10', '#4a3a20', '#6a5432', '#8a7048', '#a88a60'), tex=tex_noise(2, 1, .85, 64)),
}
R = Rig(W, H, M)
R.bone('root', None, (W // 2 - 4, G))
R.bone('pelvis', 'root', (0, -34))
R.bone('chest', 'pelvis', (4, -16))
R.bone('head', 'chest', (28, -4))
R.bone('jaw', 'head', (4, 5))
R.bone('rig', 'chest', (-20, -16))
for side, dx, mat, z0 in (('F', 6, 'skin_far', 0), ('N', -4, 'skin', 40)):
    R.bone('hip' + side, 'pelvis', (dx, 4))
    R.bone('knee' + side, 'hip' + side, (2, 16))
    R.bone('foot' + side, 'knee' + side, (-2, 15))
    R.part('thigh' + side, 'hip' + side, Capsule(0, 0, 2, 16, 9, 8), mat, z0 + 1)
    R.part('shin' + side, 'knee' + side, Capsule(0, 0, -2, 15, 8, 7), mat, z0 + 2, line=False)
    R.part('foot' + side, 'foot' + side, Ellipse(3, 2, 10, 5), 'leather', z0 + 3)
# torso jorobado
R.part('hump', 'chest', Ellipse(-6, -14, 28, 22, -20), 'skin', 20)
R.part('belly', 'chest', Ellipse(8, 2, 24, 22), 'skin', 21)
R.part('apron', 'chest', Poly([(6, -10), (24, -6), (26, 18), (20, 34), (2, 32), (0, 10)]), 'leather', 22)
R.part('apronstrap', 'chest', Capsule(8, -12, -10, -4, 1.6, 1.6), 'leather', 22.2)
R.part('scar1', 'chest', Chain([(-14, -26), (-8, -18), (-12, -8)], [0.8, 1, 0.8]), 'scar', 20.5, line=False)
R.part('scar2', 'chest', Chain([(-20, -14), (-14, -10)], [0.8, 0.8]), 'scar', 20.5, line=False)
R.part('stitch', 'chest', Chain([(-8, -30), (0, -24)], [0.6, 0.6]), 'scar', 20.6, line=False)
# tramoya a la espalda: vigas, travesaños, poleas, sogas y una bolsa de arena
R.part('beamA', 'rig', Poly([(-6, 8), (0, 8), (2, -40), (-4, -40)]), 'wood', 15)
R.part('beamB', 'rig', Poly([(14, 6), (19, 6), (18, -34), (13, -34)]), 'wood', 14.5)
R.part('cross1', 'rig', Poly([(-12, -34), (24, -30), (24, -26), (-12, -30)]), 'wood', 15.5)
R.part('cross2', 'rig', Poly([(-10, -12), (22, -8), (22, -4), (-10, -8)]), 'wood', 15.5)
R.part('brace', 'rig', Poly([(-2, -30), (16, -10), (18, -12), (0, -32)]), 'wood', 15.2)
for k, (x, y, r) in enumerate([(-1, -40, 6), (24, -28, 5)]):
    R.part(f'pulley{k}', 'rig', Ellipse(x, y, r, r), 'iron', 16 + k * .1)
    R.part(f'hub{k}', 'rig', Ellipse(x, y, r * .35, r * .35), 'socket', 16.05 + k * .1, line=False)
R.part('bolt1', 'rig', Ellipse(-1, -31, 1.6, 1.6), 'iron', 15.7)
R.part('bolt2', 'rig', Ellipse(14, -9, 1.6, 1.6), 'iron', 15.7)


def ropes(t, sway=1.0, pull=0.0):
    out = []
    for k, (x0, y0, L) in enumerate([(-6, -40, 30), (4, -40, 40), (28, -28, 26)]):
        pts, rr = [], []
        for j in range(5):
            u = j / 4
            pts.append((x0 + 3 * sway * math.sin(2 * math.pi * (t + k * .3)) * u + pull * 10 * u, y0 + (L - pull * 12) * u)); rr.append(0.9)
        out.append(Part(f'rope{k}', 'rig', Chain(pts, rr), 'rope', 16.5 + k * .01))
    x, y = out[1].shape.caps[-1].b
    out.append(Part('sack', 'rig', Ellipse(x, y + 4, 5, 6), 'sack', 16.6))
    return out


# cabeza deforme con colmillos, baja y adelantada
R.part('skull', 'head', Ellipse(0, -2, 11, 10), 'skin', 60)
R.part('brow', 'head', Ellipse(4, -6, 9, 4), 'skin', 60.3)
R.part('lump', 'head', Ellipse(-6, -8, 5, 4), 'skin', 60.2)
R.part('socketH', 'head', Ellipse(7, -3, 2.6, 2), 'socket', 60.4, line=False)
R.part('eyeH', 'head', Ellipse(7.4, -3, 1.1, 1.1), 'eye', 60.5, line=False)
R.part('jawP', 'jaw', Ellipse(2, 1, 9, 5), 'skin', 60.6)
R.part('tusk1', 'jaw', Poly([(5, -1), (7, -9), (9, -1)]), 'tusk', 60.7)
R.part('tusk2', 'jaw', Poly([(0, -1), (1, -6), (3, -1)]), 'tusk', 60.65)
R.part('scarH', 'head', Chain([(-4, -10), (2, -2)], [0.7, 0.7]), 'scar', 60.45, line=False)
# brazos gigantes con vendas; el cercano lleva el martillo de utilería
for side, sx, mat, z0 in (('F', 10, 'skin_far', 5), ('N', 0, 'skin', 50)):
    R.bone('sh' + side, 'chest', (sx, -14))
    R.bone('elb' + side, 'sh' + side, (4, 26))
    R.bone('hand' + side, 'elb' + side, (2, 24))
    R.part('shoulder' + side, 'sh' + side, Ellipse(0, 2, 13, 12), mat, z0)
    R.part('upper' + side, 'sh' + side, Capsule(0, 0, 4, 26, 11, 9), mat, z0 + 1)
    R.part('fore' + side, 'elb' + side, Capsule(0, 0, 2, 22, 9, 11), mat, z0 + 2, line=False)
    R.part('wrap' + side, 'elb' + side, Capsule(1, 8, 2, 20, 9.6, 11.2) - Capsule(1, 12, 2, 15, 12, 12), 'bandage', z0 + 2.2, line=False)
    R.part('fist' + side, 'hand' + side, Ellipse(1, 3, 10, 9), mat, z0 + 3)
R.bone('hammer', 'handN', (1, 3))
R.part('handle', 'hammer', Capsule(0, 10, 0, -30, 2, 2), 'wood', 52.5)
R.part('head_h', 'hammer', Poly([(-12, -30), (10, -30), (12, -44), (-12, -44)]), 'wood', 52.6)
R.part('hband1', 'hammer', Poly([(-12.5, -33), (11, -33), (11.4, -36), (-12.5, -36)]), 'iron', 52.7)
R.part('hband2', 'hammer', Poly([(-12.5, -40), (11.8, -40), (12, -43), (-12.5, -43)]), 'iron', 52.7)
R.part('hpaint', 'hammer', Poly([(-6, -36.5), (4, -36.5), (4, -39.5), (-6, -39.5)]), 'red', 52.8, line=False)


def dust(t, x0, y0, n=6, spread=50, k=1.0, z=90):
    out = []
    for i in range(n):
        u = (i + .5) / n - .5
        r = (6 - 3 * abs(u)) * k * (0.8 + 0.4 * _hash(i, 3, 19))
        T = np.array([[1, 0, x0 + u * spread], [0, 1, y0 - r * .6], [0, 0, 1.0]])
        out.append(Part(f'du{i}', T, Ellipse(0, 0, r, r * .7), 'dust', z + i * .01, fx=True))
    return out


HOLD = {'shN': -8, 'elbN': -6, 'hammer': 118}  # brazos colgando hasta el piso, el martillo se arrastra


def F(P, t, ex=(), diss=None, sway=1.0, pull=0.0, hide=()):
    return R.render(P, ropes(t, sway, pull) + list(ex), dissolve=diss, hide=hide)


def walk_pose(t, a=1.0):
    P = {'hipN': -18 * a * s(t), 'kneeN': 20 * a * max(0, s(t, .6)), 'hipF': -18 * a * s(t, .5), 'kneeF': 20 * a * max(0, s(t, .1)),
         'pelvis': (0, 0, -abs(3 * s(t)) + 1), 'chest': 4 * s(t, .25), 'rig': 4 * s(t, .1),
         'shF': 18 * a * s(t), 'elbF': -10 * max(0, s(t, .2)), 'head': 3 * s(t, .3)}
    return merge(HOLD, P)


def build():
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    add('idle', [F(merge(HOLD, {'chest': (1.2 * s(i / 4), 0, -1 * s(i / 4)), 'rig': 2 * s(i / 4, .2), 'jaw': 3 * max(0, s(i / 4))}), i / 4, sway=.5) for i in range(4)])
    add('walk', [F(walk_pose(i / 6), i / 6) for i in range(6)])
    atk = []
    for i in range(6):  # levanta el martillo / golpe en arco / recupera
        if i < 2: k = (i + 1) / 2; P = {'shN': -8 - 100 * k, 'elbN': -6 - 30 * k, 'hammer': 118 - 120 * k, 'chest': -10 * k, 'rig': -6 * k}
        elif i < 4: P = {'shN': -20, 'elbN': -10, 'hammer': 90, 'chest': 18, 'pelvis': (0, 0, 4), 'rig': 10, 'head': 8, 'jaw': 10}
        else: k = (i - 3) / 2; P = {'shN': -20 - 10 * k, 'elbN': -10 - 50 * k, 'hammer': 90 - 30 * k, 'chest': 18 * (1 - k)}
        ex = dust(i / 6, W - 22, G - 2, 6, 40, 1.1) if i in (2, 3) else []
        atk.append(F(P, i / 6, ex, sway=1.5 if i >= 2 else .5))
    add('atk', atk)
    add('heavy', [atk[1], atk[2]])
    drag = []
    for i in range(8):  # tira de una soga con las dos manos
        k = s(i / 8) * .5 + .5
        P = {'shN': -90 + 50 * k, 'elbN': -30 * k, 'hammer': 160, 'shF': -100 + 50 * k, 'elbF': -30 * k, 'chest': -14 + 10 * k, 'rig': -10 * k,
             'pelvis': (0, -3 * k, 2), 'hipN': -14, 'kneeN': 16, 'hipF': 10, 'jaw': 6}
        drag.append(F(P, i / 8, sway=.3, pull=1 - k))
    add('drag', drag)
    wreck = []
    for i in range(8):  # sacude la tramoya y la arranca: el decorado se viene abajo
        k = math.sin(math.pi * min(1, i / 6))
        P = {'shN': -120 * k - 30, 'elbN': -20, 'hammer': 160, 'shF': -110 * k, 'chest': -16 * k + 8 * s(i / 4), 'rig': 14 * s(i / 4) * k, 'jaw': 12 * k, 'head': -10 * k}
        wreck.append(F(P, i / 8, dust(i / 8, W // 2 - 10, G - 2, 7, 70, 1.2 * k) if i >= 4 else [], sway=2.5 * k))
    add('wreck', wreck)
    thr = []
    for i in range(6):  # agarra decorado y lo arroja
        if i < 3: k = (i + 1) / 3; P = {'shF': -40 - 120 * k, 'elbF': -30, 'chest': -12 * k, 'shN': -30, 'elbN': -60, 'hammer': 60}
        else: k = (i - 2) / 3; P = {'shF': -160 + 140 * k, 'elbF': -10, 'chest': 14 * k, 'pelvis': (0, 0, 3 * k), 'shN': -30, 'elbN': -60, 'hammer': 60}
        ex = []
        if i < 4:
            Mw = R.world(P)['handF']; ox, oy = (Mw @ np.array([0, 4, 1.0]))[:2]
            ex = [Part('prop', np.array([[1, 0, ox], [0, 1, oy - 8], [0, 0, 1.0]]), Poly([(-8, -8), (8, -10), (10, 6), (-6, 8)]), 'wood', 60)]
        thr.append(F(P, i / 6, ex))
    add('throw', thr)
    hit = []
    for i in range(6):
        k = [1, .8, .6, .4, .25, .1][i]
        hit.append(F(merge(HOLD, {'chest': -14 * k, 'head': -18 * k, 'rig': -10 * k, 'pelvis': (0, -4 * k, 0), 'jaw': 10 * k}), i / 6, sway=2 * k))
    add('hit', hit)
    dth = []
    for i in range(6):  # cae de rodillas y la tramoya se le derrumba encima
        k = ease(min(1, i / 3))
        P = {'pelvis': (0, 0, 18 * k), 'hipN': -80 * k, 'kneeN': 110 * k, 'hipF': -70 * k, 'kneeF': 100 * k, 'chest': 30 * k,
             'shN': -10, 'elbN': -20, 'hammer': 60 + 90 * k, 'head': 20 * k, 'rig': 50 * max(0, (i - 2) / 3)}
        dth.append(F(P, i / 6, dust(i / 6, W // 2, G - 2, 8, 80, 0.8 + 0.6 * k) if i >= 3 else [], sway=1, diss=((i - 4) / 2 * 0.6, 71) if i >= 5 else None))
    add('death', dth)
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 2.8}
