"""El Presentador (cm_presentador, cm_presentador2, cm_presentador3) — ficha P0-01 de docs/ART_COMMISSION_BRIEF.md.
Acto I: maestro de ceremonias demoníaco, alto y flaco, calavera sonriente de ojos rojos, galera negra con cinta roja,
levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados, bastón negro con orbe rojo.
Transformación (12 cuadros): se encorva, la levita se rasga, le crecen garras. Acto II: encorvado, con garras, la
galera rota, en violeta oscuro. Acto III: espectro carmesí y violeta que flota, telas que ondulan, calavera con galera.
Celda 96×128 (acto III 112×144), personaje ≈110 px. Paleta: #120a0e #3a1420 #8a1a2a #c02030 #e8c27a #efe6d6."""
import math
import numpy as np
from pixrig import *
from pixrig import _hash
from biped import make_biped, walk, breathe, merge, s

META = {'meta_file': 'js/assets/ciudad-meta.js', 'const': 'CIUDAD_ATLAS'}


def mix(a, b, k):
    return [tuple(round(x + (y - x) * k) for x, y in zip(ca, cb)) for ca, cb in zip(a, b)]


CRIMSON = ramp_from('#2a0a12', '#5a1020', '#8a1a2a', '#b02434', '#d8504e')
VIOLET = ramp_from('#120818', '#2a1236', '#4a1e5a', '#6a2c7a', '#8e48a0')
FIRE = ramp_from('#3a0808', '#7a1414', '#c02030', '#e05040', '#ff9a7a')


def mats(coat=CRIMSON, eyes_k=1.0):
    return {
        'black': Mat(ramp_from('#08050a', '#140c12', '#22141c', '#34202a', '#4a2e3a')),
        'coat': Mat(coat, tex=tex_stripes(5, 1, 'x', -1, 1)),
        'coat_far': Mat(mix(coat, [(8, 5, 8)] * 5, 0.35), tex=tex_stripes(5, 1, 'x', -1, 1)),
        'gold': Mat(ramp_from('#4a3010', '#8a6424', '#c09a48', '#e8c27a', '#f8eab8')),
        'bone': Mat(ramp_from('#4a3e34', '#9a8e7c', '#c8bca6', '#efe6d6', '#fffaf0')),
        'glove': Mat(ramp_from('#5a5048', '#a89c8c', '#d4cabb', '#efe6d6', '#ffffff')),
        'socket': Mat(ramp_from('#08050a', '#100810', '#180c14', '#22101a', '#2a1420'), shade=0),
        'red': Mat(ramp_from('#3a0810', '#7a1020', '#c02030', '#e0404a', '#ff8a8a')),
        'eye': Mat(ramp_from('#5a0a08', '#a01a10', '#ff3a1a', '#ff8a4a', '#ffd0a0'), emissive=True, base=round(1 + 2 * eyes_k)),
        'orb': Mat(ramp_from('#5a0810', '#a01020', '#e02838', '#ff6a6a', '#ffd0d0'), emissive=True, base=2),
        'orb_hot': Mat(ramp_from('#a01020', '#e02838', '#ff6a6a', '#ffb0b0', '#fff0f0'), emissive=True, base=3),
        'energy': Mat(ramp_from('#5a0810', '#a01020', '#e02838', '#ff6a6a', '#ffd0d0'), emissive=True, base=2),
        'smoke': Mat(ramp_from('#1a0810', '#2e0e1c', '#4a1428', '#6a1c36', '#8a2a44'), emissive=True, base=2),
        'claw': Mat(ramp_from('#2a2420', '#6a5e52', '#a89a88', '#d8ccb8', '#f4ecdc')),
        'violet': Mat(VIOLET, tex=tex_stripes(4, 1, 'x', -1)),
        'crimson': Mat(CRIMSON, tex=tex_stripes(4, 1, 'x', -1)),
    }


# ------------------------------------------------------------------ actos I y II (bípedo)
def rig_biped(W, H, ground, act=1):
    R = Rig(W, H, mats())
    d = dict(thigh=22, shin=21, foot=0, torso=30, neck=4, upper=15, fore=14, hip_w=2, sh_w=2)
    make_biped(R, W // 2 - 2, ground, d)
    R.bone('tails', 'pelvis', (-5, -1))
    R.bone('hat', 'head', (2, -14))
    R.bone('cane', 'handN', (0, 1))
    R.bone('jaw', 'head', (3, -2))
    for side, z0, coat in (('F', 0, 'coat_far'), ('N', 40, 'coat')):
        R.part('thigh' + side, 'hip' + side, Capsule(0, 0, 0, 22, 4.2, 3.6), 'black', z0 + 1)
        R.part('shin' + side, 'knee' + side, Capsule(0, 0, 0, 21, 3.6, 3), 'black', z0 + 2, line=False)
        R.part('shoe' + side, 'foot' + side, Poly([(-3, -2), (4, -2), (9, 1), (8, 2.5), (-3, 2.5)]), 'black', z0 + 3)
        R.part('upper' + side, 'sh' + side, Capsule(0, 0, 0, 15, 4.4, 3.8), coat, z0 + 11 if side == 'N' else z0 + 5)
        R.part('fore' + side, 'elb' + side, Capsule(0, 0, 0, 13, 3.8, 3.4), coat, z0 + 12 if side == 'N' else z0 + 6, line=False)
        R.part('cuff' + side, 'hand' + side, Ellipse(0, -2, 3.6, 1.6), 'glove', z0 + 12.5 if side == 'N' else z0 + 6.5)
    # cuerpo: levita, chaleco, solapas, cuello
    R.part('tailsP', 'tails', Poly([(-1, -4), (5, -3), (3, 12), (-2, 30), (-9, 29), (-8, 12)]), 'coat', 19)
    R.part('coatB', 'chest', Poly([(-7, -12), (5, -14), (8, -5), (7, 8), (6, 17), (-6, 17), (-8, 5)]), 'coat', 20)
    R.part('vest', 'chest', Poly([(1, -11), (7, -11), (7.5, 4), (6, 10), (2, 10)]), 'black', 21)
    R.part('lapel', 'chest', Poly([(0, -13), (5, -13), (3, 0), (1, 2)]), 'gold', 22)
    R.part('lapel2', 'chest', Poly([(5, -13), (8, -12), (6, -4)]), 'gold', 22.1)
    R.part('btn1', 'chest', Ellipse(5.5, 2, 1, 1), 'gold', 22.2, line=False)
    R.part('btn2', 'chest', Ellipse(5.5, 6, 1, 1), 'gold', 22.2, line=False)
    R.part('shirt', 'chest', Poly([(3, -15), (8, -14), (6, -9)]), 'glove', 22.3)
    R.part('bow', 'chest', Ellipse(7, -13, 2.4, 1.4), 'red', 22.4)
    # cabeza: calavera sonriente
    R.part('skull', 'head', Ellipse(2, -7, 7, 7.6), 'bone', 30)
    R.part('cheek', 'head', Ellipse(5, -3, 4.5, 3.5), 'bone', 30.1, line=False)
    R.part('jawP', 'jaw', Ellipse(1, 1, 5.5, 3), 'bone', 30.2)
    R.part('grin', 'jaw', Chain([(-3, 0), (1, 1.2), (6, -0.5)], [0.8, 0.9, 0.7]), 'socket', 30.4, line=False)
    for k in range(4): R.part(f'tooth{k}', 'jaw', Ellipse(-1.5 + k * 2, 0.4, 0.6, 0.9), 'glove', 30.45, line=False)
    R.part('socket', 'head', Ellipse(5, -8, 2.6, 2.8), 'socket', 30.5, line=False)
    R.part('eyeP', 'head', Ellipse(5.4, -8, 1.3, 1.3), 'eye', 30.6, line=False)
    R.part('nose', 'head', Poly([(8, -6), (9.5, -4), (7.5, -4)]), 'socket', 30.6, line=False)
    # galera
    R.part('brim', 'hat', Ellipse(0, 0, 11, 2), 'black', 33)
    R.part('crown', 'hat', Poly([(-6, 0), (6, 0), (7, -19), (-7, -19)]), 'black', 32.5)
    R.part('band', 'hat', Poly([(-6.1, -1), (6.1, -1), (6.3, -4.5), (-6.3, -4.5)]), 'red', 32.7)
    R.part('hattop', 'hat', Ellipse(0, -19, 7, 1.5), 'black', 32.8)
    # bastón
    R.part('shaft', 'cane', Capsule(0, -6, 0, 40, 1.4, 1.2), 'black', 48)
    R.part('ferrule', 'cane', Ellipse(0, 40, 1.6, 1.6), 'gold', 48.1)
    R.part('orb', 'cane', Ellipse(0, -9.5, 3.7, 3.7), 'orb', 48.4)
    R.part('orbhot', 'cane', Ellipse(-1, -10.5, 1.4, 1.4), 'orb_hot', 48.5, line=False)
    R.part('cap', 'cane', Ellipse(0, -5.5, 2.6, 1.3), 'gold', 48.6)
    R.part('gloveN', 'handN', Ellipse(0, 2, 3.6, 3.4), 'glove', 52)
    R.part('gloveF', 'handF', Ellipse(0, 2, 3.4, 3.2), 'glove', 6.8)
    # garras (acto II) y jirones: ocultos en el acto I
    for side, z in (('N', 52.5), ('F', 7)):
        for k in range(3):
            R.part(f'claw{side}{k}', 'hand' + side, Capsule(0, 3, -2 + k * 2.4, 11 + k * 0.5, 1.3, 0.4), 'claw', z + k * 0.01)
    R.part('rag1', 'tails', Poly([(-2, 28), (-5, 36), (-7, 29)]), 'coat', 19.1)
    R.part('rag2', 'tails', Poly([(-8, 27), (-12, 33), (-10, 25)]), 'coat', 19.2)
    R.part('rip', 'chest', Chain([(-5, -2), (-2, 4), (-5, 10)], [0.8, 1, 0.8]), 'socket', 20.5, line=False)
    R.part('fang1', 'jaw', Poly([(3, -1), (4, 3), (5, -1)]), 'glove', 30.5, line=False)
    R.part('fang2', 'jaw', Poly([(-1, -1), (0, 2.5), (1, -1)]), 'glove', 30.5, line=False)
    R.part('hatcrack', 'hat', Poly([(-7, -19), (-2, -14), (1, -19), (4, -12), (7, -19), (7, -22), (-7, -22)]), 'socket', 32.9, line=False)
    return R


ACT2_ONLY = {'clawN0', 'clawN1', 'clawN2', 'clawF0', 'clawF1', 'clawF2', 'rag1', 'rag2', 'rip', 'fang1', 'fang2', 'hatcrack'}
ACT1_ONLY = {'gloveN', 'gloveF', 'cuffN', 'cuffF', 'shaft', 'ferrule', 'orb', 'orbhot', 'cap'}


def sparks(t, cx, cy, n=8, r=20, z=90, mat='energy', size=1.6):
    out = []
    for i in range(n):
        a = 2 * math.pi * (i / n + t * 0.37 + _hash(i, 1, 5) * 0.2)
        rr = r * (0.6 + 0.5 * _hash(i, 2, 6))
        T = np.array([[1, 0, cx + math.cos(a) * rr], [0, 1, cy + math.sin(a) * rr], [0, 0, 1.0]])
        out.append(Part(f'sp{i}', T, Ellipse(0, 0, size, size), mat, z, fx=True))
    return out


def hunch(k):
    """0 = acto I erguido, 1 = acto II encorvado."""
    return {'chest': 26 * k, 'head': -16 * k, 'neck': 0, 'pelvis': (6 * k, 0, 7 * k),
            'hipN': -18 * k, 'kneeN': 30 * k, 'footN': -12 * k, 'hipF': -10 * k, 'kneeF': 26 * k, 'footF': -14 * k,
            'shN': -20 * k, 'elbN': -30 * k, 'shF': -10 * k, 'elbF': -26 * k, 'tails': 14 * k, 'hat': (-12 * k, -1 * k, 1 * k)}


def act1_frames():
    W, H, G = 96, 128, 124
    R = rig_biped(W, H, G, 1)
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    hide = ACT2_ONLY
    def F(P, ex=(), **kw): return R.render(P, list(ex), hide=hide | set(kw.get('hide', ())))
    pose0 = {'shN': -18, 'elbN': -40, 'cane': 40, 'shF': 8, 'elbF': -10}
    add('idle', [F(merge(breathe(i / 4), pose0, {'cane': 40 + 18 * s(i / 4), 'elbN': -40 - 6 * s(i / 4)})) for i in range(4)])
    wk = []
    for i in range(6):
        t = i / 6; P = walk(t, 0.85, 2, 0.7)
        P['shN'] = -24 + 12 * s(t); P['elbN'] = -36; P['cane'] = 34 - 14 * s(t)
        wk.append(F(P))
    add('walk', wk)
    atk = []
    for i in range(6):
        if i < 2: k = (i + 1) / 2; P = merge(breathe(0), {'shN': -18 - 130 * k, 'elbN': -40 + 30 * k, 'cane': 40 - 40 * k, 'head': -6 * k, 'shF': 8})
        elif i < 4: P = {'shN': -130, 'elbN': -6, 'cane': -10, 'shF': 110, 'elbF': -10, 'head': -10, 'chest': -6}
        else: k = (i - 3) / 2; P = merge({'shN': -130 + 112 * k, 'elbN': -6 - 34 * k, 'cane': -10 + 50 * k, 'shF': 110 - 102 * k})
        ex = sparks(i / 6, 0, 0, 0)
        if 2 <= i < 4:
            M_ = R.world(P)['cane']; ox, oy = (M_ @ np.array([0, -9.5, 1.0]))[:2]
            ex = sparks(i / 6, ox, oy, 8, 9 + 3 * (i - 2), 90, 'energy', 1.4) + [Part('flash', np.array([[1, 0, ox], [0, 1, oy], [0, 0, 1.0]]), Ellipse(0, 0, 5.5, 5.5), 'orb_hot', 91, fx=True)]
        atk.append(F(P, ex))
    add('atk', atk)
    cast = []
    for i in range(4):
        k = [0.5, 1, 1, 0.6][i]
        P = {'shN': -100 * k - 18, 'elbN': -20, 'cane': 20, 'shF': 100 * k, 'elbF': -10, 'head': -8 * k, 'chest': -5 * k}
        M_ = R.world(P)['cane']; ox, oy = (M_ @ np.array([0, -9.5, 1.0]))[:2]
        cast.append(F(P, sparks(i / 4, ox, oy, 10, 8 + 6 * k, 90, 'energy', 1.5)))
    add('cast', cast)
    add('hit', [F({'chest': -10, 'head': -18, 'hat': (-22, -2, 0), 'shN': 10, 'elbN': -20, 'cane': 50, 'pelvis': (0, -2, 0)}),
                F({'chest': -5, 'head': -9, 'hat': (-10, -1, 0), 'shN': -6, 'elbN': -30, 'cane': 44})])
    dth = []
    for i in range(6):
        k = ease(min(1, i / 4))
        P = {'root': (-80 * k, 6 * k, 0), 'hipN': -30 * k, 'kneeN': 20 * k, 'hipF': -20 * k, 'kneeF': 30 * k,
             'shN': -60 * k, 'shF': 40 * k, 'cane': 70 * k, 'hat': (-60 * k, -8 * k, -6 * k), 'head': -10 * k}
        dth.append(R.render(P, [], hide=hide, dissolve=((i - 3) / 3 * 0.8, 31) if i >= 4 else None))
    add('death', dth)
    # transformación: se encorva, la levita se rasga, crecen garras y el carmesí se apaga a violeta
    tf = []
    for i in range(12):
        k = ease(i / 11)
        R.mats = mats(mix(CRIMSON, VIOLET, max(0, (i - 4) / 7)))
        P = merge(hunch(k), {'shN': -20 * k - 40 * math.sin(math.pi * k), 'shF': 30 * math.sin(math.pi * k)})
        hid = (ACT2_ONLY if i < 5 else ACT1_ONLY) | ({'rag1', 'rag2'} if i < 7 else set()) | ({'fang1', 'fang2', 'hatcrack'} if i < 8 else set())
        if 5 <= i < 8: hid = hid - {'clawN0', 'clawF0'} | {'clawN1', 'clawN2', 'clawF1', 'clawF2'}
        cx = W // 2 + 4; cy = 60
        tf.append(R.render(P, sparks(i / 12, cx, cy, 6 + i, 14 + i * 1.5, 90, 'energy', 1.3), hide=hid))
    R.mats = mats()
    add('transform', tf)
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 3.3}, dict(META, png='assets/sprites/arenas/ciudad/cm_presentador/atlas.png', key='cm_presentador')


def act2_frames():
    W, H, G = 96, 128, 124
    R = rig_biped(W, H, G, 2)
    R.mats = mats(VIOLET)
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    hide = ACT1_ONLY
    def F(P, ex=()): return R.render(P, list(ex), hide=hide)
    base = hunch(1)
    add('idle', [F(merge(base, breathe(i / 4, 1.6), {'jaw': 6 + 4 * s(i / 4)})) for i in range(4)])
    add('walk', [F(merge(base, walk(i / 6, 0.8, 3, 1.2), {'jaw': 8})) for i in range(6)])
    atk = []
    for i in range(6):  # zarpazo con las dos garras
        if i < 2: k = (i + 1) / 2; P = merge(base, {'shN': -120 * k, 'shF': -100 * k, 'elbN': -20, 'chest': -10 * k, 'jaw': 14 * k})
        elif i < 4: P = merge(base, {'shN': 10, 'elbN': -60, 'shF': 20, 'elbF': -50, 'chest': 18, 'pelvis': (12, 6, 9), 'jaw': 16})
        else: k = (i - 3) / 2; P = merge(base, {'shN': 10 * (1 - k), 'shF': 20 * (1 - k), 'jaw': 8})
        ex = []
        if 2 <= i < 4:
            M_ = R.world(P)['handN']; ox, oy = (M_ @ np.array([0, 8, 1.0]))[:2]
            for j in range(3):
                ex.append(Part(f'sl{j}', np.array([[1, 0, ox - 4 + j * 4], [0, 1, oy - 14], [0, 0, 1.0]]), Chain([(0, 0), (4, 10), (2, 22)], [0.6, 1.4, 0.5]), 'energy', 95, fx=True))
        atk.append(F(P, ex))
    add('atk', atk)
    cast = []
    for i in range(6):  # lanza energía roja
        k = math.sin(math.pi * min(1, i / 4))
        P = merge(base, {'shN': -70 * k, 'elbN': 10 * k, 'shF': -60 * k, 'chest': 10 - 14 * k, 'jaw': 18 * k})
        M_ = R.world(P)['handN']; ox, oy = (M_ @ np.array([0, 6, 1.0]))[:2]
        cast.append(F(P, sparks(i / 6, ox + 4, oy, 10, 4 + 10 * k, 95, 'energy', 1.5)))
    add('cast', cast)
    add('hit', [F(merge(base, {'chest': 8, 'head': -34, 'hat': (-30, -2, 0), 'jaw': 16, 'pelvis': (2, -3, 7)})), F(merge(base, {'head': -26, 'hat': (-20, -1, 1), 'jaw': 10}))])
    dth = []
    for i in range(6):
        k = ease(min(1, i / 4))
        P = merge(base, {'root': (70 * k, 0, 0), 'pelvis': (6, 0, 7 + 26 * k), 'kneeN': 30 + 60 * k, 'kneeF': 26 + 60 * k, 'hipN': -18 - 50 * k, 'hipF': -10 - 50 * k,
                         'hat': (-40 * k, -10 * k, 20 * k)})
        dth.append(R.render(P, sparks(i / 6, W / 2, 80, 6, 18, 90, 'smoke', 2.5) if i >= 3 else [], hide=hide, dissolve=((i - 3) / 3 * 0.85, 33) if i >= 4 else None))
    add('death', dth)
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 3.1}, dict(META, png='assets/sprites/arenas/ciudad/cm_presentador2/atlas.png', key='cm_presentador2')


# ------------------------------------------------------------------ acto III: espectro que flota
def rig_spectre(W, H, ground):
    R = Rig(W, H, mats())
    R.bone('root', None, (W // 2, ground - 16))
    R.bone('body', 'root', (0, -40))
    R.bone('head', 'body', (4, -38))
    R.bone('hat', 'head', (2, -14))
    R.bone('jaw', 'head', (3, -2))
    for side, sgn in (('N', 1), ('F', -1)):
        R.bone('sh' + side, 'body', (sgn * 3, -30))
        R.bone('elb' + side, 'sh' + side, (0, 20))
        R.bone('hand' + side, 'elb' + side, (0, 18))
    # túnica en jirones (carmesí por fuera, violeta por dentro); las tiras se arman por cuadro (ondulan)
    R.part('robe', 'body', Poly([(-10, -34), (10, -34), (16, -6), (18, 14), (-18, 14), (-14, -6)]), 'crimson', 20)
    R.part('robeIn', 'body', Poly([(2, -30), (9, -30), (12, 4), (4, 6)]), 'violet', 21)
    R.part('collarL', 'body', Poly([(-12, -36), (-4, -44), (2, -34)]), 'crimson', 22)
    R.part('collarR', 'body', Poly([(4, -34), (12, -44), (13, -32)]), 'crimson', 22)
    R.part('lapelS', 'body', Poly([(2, -34), (6, -34), (4, -20)]), 'gold', 22.5)
    R.part('skull', 'head', Ellipse(2, -7, 8, 8.4), 'bone', 30)
    R.part('cheek', 'head', Ellipse(5, -3, 5, 4), 'bone', 30.1, line=False)
    R.part('jawP', 'jaw', Ellipse(1, 1, 6, 3.4), 'bone', 30.2)
    R.part('grin', 'jaw', Chain([(-3, 0), (1, 1.4), (6, -0.5)], [0.8, 1, 0.7]), 'socket', 30.4, line=False)
    for k in range(4): R.part(f'tooth{k}', 'jaw', Ellipse(-1.5 + k * 2.2, 0.5, 0.7, 1), 'glove', 30.45, line=False)
    R.part('socket', 'head', Ellipse(5, -8, 3, 3.2), 'socket', 30.5, line=False)
    R.part('eyeP', 'head', Ellipse(5.4, -8, 1.6, 1.6), 'eye', 30.6, line=False)
    R.part('socket2', 'head', Ellipse(-1, -8, 2.2, 2.8), 'socket', 30.5, line=False)
    R.part('nose', 'head', Poly([(8, -6), (9.5, -4), (7.5, -4)]), 'socket', 30.6, line=False)
    R.part('brim', 'hat', Ellipse(0, 0, 12, 2.2), 'black', 33)
    R.part('crown', 'hat', Poly([(-6.5, 0), (6.5, 0), (8, -22), (-8, -22)]), 'black', 32.5)
    R.part('band', 'hat', Poly([(-6.6, -1), (6.6, -1), (6.8, -5), (-6.8, -5)]), 'red', 32.7)
    R.part('hattop', 'hat', Ellipse(0, -22, 8, 1.6), 'black', 32.8)
    for side, z0 in (('F', 5), ('N', 45)):
        R.part('sleeve' + side, 'sh' + side, Poly([(-4, -2), (4, -2), (7, 20), (-6, 20)]), 'crimson' if side == 'N' else 'violet', z0)
        R.part('arm' + side, 'elb' + side, Capsule(0, 0, 0, 16, 2.4, 2), 'bone', z0 + 1)
        R.part('cuffS' + side, 'elb' + side, Poly([(-6, -2), (7, -2), (5, 6), (1, 2), (-2, 7), (-4, 2)]), 'crimson' if side == 'N' else 'violet', z0 + 1.5)
        for k in range(4):
            R.part(f'fing{side}{k}', 'hand' + side, Capsule(0, 0, -3 + k * 2, 8, 0.9, 0.5), 'bone', z0 + 2 + k * .01)
    return R


def strips(t, n=7, amp=1.0, fade=1.0, z=18):
    """Tiras de tela que cuelgan de la túnica y ondulan (alternan carmesí y violeta)."""
    out = []
    for k in range(n):
        x0 = -16 + k * 32 / (n - 1)
        pts, rad = [], []
        L = (26 + 8 * _hash(k, 9, 2)) * fade
        for j in range(5):
            u = j / 4
            pts.append((x0 + 6 * amp * u * math.sin(2 * math.pi * (t + k * 0.17 + u * 0.4)) - 6 * u, 10 + L * u))
            rad.append(3.2 * (1 - u * 0.7))
        out.append(Part(f'st{k}', 'body', Chain(pts, rad), 'crimson' if k % 2 else 'violet', z + k * .01))
    return out


def act3_frames():
    W, H, G = 112, 144, 140
    R = rig_spectre(W, H, G)
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    def F(P, t, ex=(), fade=1.0, diss=None): return R.render(P, strips(t, fade=fade) + list(ex), dissolve=diss)
    def float_(t, a=1.0): return {'root': (0, 0, round(3 * a * s(t))), 'head': 3 * s(t, .2), 'hat': (2 * s(t, .3), 0, 0)}
    rest = {'shN': -14, 'elbN': -30, 'shF': 10, 'elbF': -20}
    add('idle', [F(merge(float_(i / 6), rest, {'shN': -14 + 6 * s(i / 6)}), i / 6) for i in range(6)])
    add('walk', [F(merge(float_(i / 6, 1.4), rest, {'body': 8, 'head': -4}), i / 6) for i in range(6)])
    atk = []
    for i in range(6):
        k = math.sin(math.pi * min(1, i / 4))
        P = merge(float_(i / 6), {'shN': -120 * k - 10, 'elbN': 10, 'shF': 120 * k, 'elbF': -10, 'jaw': 10 * k, 'body': -4 * k})
        Mw = R.world(P); hx_, hy = (Mw['handN'] @ np.array([0, 6, 1.0]))[:2]; fx_, fy = (Mw['handF'] @ np.array([0, 6, 1.0]))[:2]
        ex = sparks(i / 6, hx_, hy, 6, 4 + 8 * k, 95, 'energy', 1.6) + sparks(i / 6 + .5, fx_, fy, 6, 4 + 8 * k, 95, 'energy', 1.6)
        atk.append(F(P, i / 6, ex))
    add('atk', atk)
    cast = []
    for i in range(6):
        k = math.sin(math.pi * min(1, i / 4))
        P = merge(float_(i / 6), {'shN': -80 * k - 14, 'elbN': 0, 'shF': -60 * k, 'jaw': 12 * k, 'body': 8 * k})
        Mw = R.world(P); hx_, hy = (Mw['handN'] @ np.array([0, 8, 1.0]))[:2]
        ex = sparks(i / 6, hx_ + 6, hy, 12, 4 + 12 * k, 95, 'energy', 1.8)
        if k > .6: ex.append(Part('bolt', np.array([[1, 0, hx_ + 6], [0, 1, hy], [0, 0, 1.0]]), Ellipse(0, 0, 6 * k, 6 * k), 'orb_hot', 96, fx=True))
        cast.append(F(P, i / 6, ex))
    add('cast', cast)
    add('hit', [F(merge(rest, {'head': -24, 'hat': (-20, -2, 0), 'body': -10, 'root': (0, -4, -2)}), 0.1), F(merge(rest, {'head': -12, 'hat': (-10, -1, 0), 'body': -5}), 0.3)])
    dth = []
    for i in range(10):  # se deshace en telas y humo rojo hasta desaparecer
        k = i / 9
        P = merge(float_(i / 10, 1 - k), {'shN': -40 * k, 'shF': 40 * k, 'jaw': 14 * k, 'root': (0, 0, 10 * k), 'hat': (-30 * k, -4 * k, 10 * k)})
        ex = sparks(i / 10, W / 2, 70, 8 + i, 10 + 30 * k, 95, 'smoke', 2.6 + 2 * k) + sparks(i / 10 + .3, W / 2, 60, 4 + i // 2, 8 + 20 * k, 96, 'energy', 1.2)
        dth.append(F(P, i / 10, ex, fade=1 - .5 * k, diss=(k * 0.95, 41) if i >= 2 else None))
    add('death', dth)
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 3.2}, dict(META, png='assets/sprites/arenas/ciudad/cm_presentador3/atlas.png', key='cm_presentador3')


BUILDS = [('cm_presentador', act1_frames), ('cm_presentador2', act2_frames), ('cm_presentador3', act3_frames)]
