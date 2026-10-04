"""Maestro de Ceremonias (cm_maestro) — ficha P0-03 de docs/ART_COMMISSION_BRIEF.md.
Hombre esquelético de sonrisa enorme y ojos rojos, galera alta con cinta roja, frac rojo oscuro con faldones largos
y botones de hueso, pantalón a rayas negro y vino, bastón largo coronado por un ojo rojo brillante. Postura encorvada
y teatral. Celda 96×128, personaje ≈104 px. Paleta: #120a0e #3a1420 #7a1624 #d02838 #d8c8b0 #c8a060."""
import math
import numpy as np
from pixrig import *
from pixrig import _hash
from biped import make_biped, walk, breathe, merge, s

W, H, G = 96, 128, 124
TARGET = {'png': 'assets/sprites/arenas/ciudad/cm_maestro/atlas.png', 'meta_file': 'js/assets/ciudad-meta.js', 'const': 'CIUDAD_ATLAS'}
FRAC = ramp_from('#1a060c', '#3a0e18', '#5a1420', '#7a1624', '#a02a34')
M = {
    'black': Mat(ramp_from('#08050a', '#140c12', '#22141c', '#34202a', '#4a2e3a')),
    'frac': Mat(FRAC, tex=tex_stripes(5, 1, 'x', -1, 2)),
    'frac_far': Mat(ramp_from('#0e0408', '#22080e', '#3a0e18', '#4e1420', '#661c28'), tex=tex_stripes(5, 1, 'x', -1, 2)),
    'stripe': Mat(ramp_from('#08050a', '#160a10', '#22101a', '#3a1420', '#5a1e2c'), tex=tex_stripes(3, 1, 'x', 2, 0)),
    'bone': Mat(ramp_from('#4a3e34', '#9a8c78', '#c0b29a', '#d8c8b0', '#f2e8d6')),
    'gold': Mat(ramp_from('#3a2810', '#6a4c1c', '#9a7838', '#c8a060', '#e8cc98')),
    'socket': Mat(ramp_from('#08050a', '#100810', '#180c14', '#22101a', '#2a1420'), shade=0),
    'red': Mat(ramp_from('#3a0810', '#7a1020', '#d02838', '#e0505a', '#ff9a9a')),
    'eye': Mat(ramp_from('#5a0a08', '#a01a10', '#ff3a1a', '#ff8a4a', '#ffd0a0'), emissive=True, base=3),
    'sclera': Mat(ramp_from('#6a5a50', '#b0a49a', '#e0d8d0', '#f4f0ea', '#ffffff'), shade=0.6),
    'iris': Mat(ramp_from('#5a0810', '#a01020', '#d02838', '#ff6a6a', '#ffd0d0'), emissive=True, base=2),
    'smoke': Mat(ramp_from('#2a0810', '#4a0e1c', '#7a1624', '#a02a34', '#c84a50'), emissive=True, base=2),
    'smoke_dk': Mat(ramp_from('#14040a', '#22080e', '#3a0e18', '#5a1420', '#7a1624'), emissive=True, base=2),
}
R = Rig(W, H, M)
make_biped(R, W // 2 - 4, G, dict(thigh=21, shin=21, foot=0, torso=28, neck=5, upper=15, fore=15, hip_w=2, sh_w=2))
R.bone('tails', 'pelvis', (-5, -1))
R.bone('hat', 'head', (3, -14))
R.bone('jaw', 'head', (3, -2))
R.bone('cane', 'handN', (0, 1))
for side, z0, frac in (('F', 0, 'frac_far'), ('N', 40, 'frac')):
    R.part('thigh' + side, 'hip' + side, Capsule(0, 0, 0, 21, 3.6, 3.1), 'stripe', z0 + 1)
    R.part('shin' + side, 'knee' + side, Capsule(0, 0, 0, 21, 3.1, 2.6), 'stripe', z0 + 2, line=False)
    R.part('shoe' + side, 'foot' + side, Poly([(-3, -2), (4, -2), (10, 0), (9, 2.5), (-3, 2.5)]), 'black', z0 + 3)
    R.part('upper' + side, 'sh' + side, Capsule(0, 0, 0, 15, 3.6, 3), frac, z0 + 11 if side == 'N' else z0 + 5)
    R.part('fore' + side, 'elb' + side, Capsule(0, 0, 0, 13, 3, 2.6), frac, z0 + 12 if side == 'N' else z0 + 6, line=False)
    for k in range(4):  # dedos huesudos
        R.part(f'fg{side}{k}', 'hand' + side, Capsule(0, 0, -2 + k * 1.5, 6 + (k % 2), 0.9, 0.6), 'bone', (z0 + 13 if side == 'N' else z0 + 7) + k * .01)
# faldones largos que llegan casi al tobillo
R.part('tailsP', 'tails', Poly([(-1, -4), (5, -3), (3, 10), (-1, 34), (-6, 36), (-10, 33), (-8, 12)]), 'frac', 19)
R.part('tailsF', 'tails', Poly([(-4, -2), (0, 8), (-4, 30), (-9, 31), (-9, 10)]), 'frac_far', 18.5)
R.part('coatB', 'chest', Poly([(-7, -11), (5, -13), (7, -5), (6, 8), (5, 16), (-6, 16), (-8, 4)]), 'frac', 20)
R.part('shirtV', 'chest', Poly([(2, -12), (6, -12), (5, 2), (3, 3)]), 'bone', 21)
for k in range(3): R.part(f'btn{k}', 'chest', Ellipse(5.4, -3 + k * 5, 1.2, 1.2), 'bone', 21.5, line=False)
R.part('lapel', 'chest', Poly([(0, -13), (4, -13), (2, -1)]), 'frac_far', 21.4)
# calavera de sonrisa enorme (la boca cruza toda la cara)
R.part('skull', 'head', Ellipse(2, -7, 6.6, 7.4), 'bone', 30)
R.part('cheek', 'head', Ellipse(5, -2.5, 5, 3.6), 'bone', 30.1, line=False)
R.part('jawP', 'jaw', Ellipse(1, 1.5, 6, 3.4), 'bone', 30.2)
R.part('grin', 'jaw', Chain([(-5, -1.5), (-1, 1.6), (4, 1.6), (8, -2)], [0.8, 1.1, 1.1, 0.8]), 'socket', 30.4, line=False)
for k in range(6): R.part(f'tooth{k}', 'jaw', Ellipse(-3 + k * 2, 0.6 + (0.4 if 1 <= k <= 4 else 0), 0.6, 0.9), 'sclera', 30.45, line=False)
R.part('socketN', 'head', Ellipse(5, -8, 2.4, 2.8), 'socket', 30.5, line=False)
R.part('socketF', 'head', Ellipse(0, -8, 1.8, 2.4), 'socket', 30.5, line=False)
R.part('eyeN', 'head', Ellipse(5.3, -8, 1.2, 1.2), 'eye', 30.6, line=False)
R.part('eyeF', 'head', Ellipse(0.2, -8, 0.9, 0.9), 'eye', 30.6, line=False)
R.part('nose', 'head', Poly([(8, -6), (9.4, -4), (7.4, -4)]), 'socket', 30.6, line=False)
# galera alta (más que la del Presentador) y un poco torcida
R.part('brim', 'hat', Ellipse(0, 0, 10, 1.8), 'black', 33)
R.part('crown', 'hat', Poly([(-5.5, 0), (5.5, 0), (7, -25), (-5, -26)]), 'black', 32.5)
R.part('band', 'hat', Poly([(-5.6, -1), (5.6, -1), (5.9, -5), (-5.8, -5)]), 'red', 32.7)
R.part('hattop', 'hat', Ellipse(1, -25.5, 6.2, 1.4), 'black', 32.8)
# bastón largo con un ojo rojo
R.part('shaft', 'cane', Capsule(0, -10, 0, 44, 1.3, 1.1), 'black', 48)
R.part('ring', 'cane', Ellipse(0, -9, 2.4, 1.2), 'gold', 48.2)
R.part('eyeball', 'cane', Ellipse(0, -14, 4, 4), 'sclera', 48.4)
R.part('iris', 'cane', Ellipse(1.4, -14, 2.2, 2.4), 'iris', 48.5, line=False)
R.part('pupil', 'cane', Ellipse(2, -14, 0.8, 1.4), 'socket', 48.6, line=False)

HUNCH = {'chest': 16, 'head': -6, 'pelvis': (3, 0, 3), 'hipN': -6, 'kneeN': 10, 'hipF': -4, 'kneeF': 8, 'hat': (6, 0, 0)}


def smoke(t, cx, cy, n=8, r=16, k=1.0, z=90):
    out = []
    for i in range(n):
        a = 2 * math.pi * (i / n + t * 0.2)
        rr = r * (0.5 + 0.5 * _hash(i, 4, 7)) * k
        sz = (3 + 3 * _hash(i, 5, 7)) * k
        T = np.array([[1, 0, cx + math.cos(a) * rr], [0, 1, cy + math.sin(a) * rr * 0.6], [0, 0, 1.0]])
        out.append(Part(f'sm{i}', T, Ellipse(0, 0, sz, sz * .8), 'smoke' if i % 2 else 'smoke_dk', z + i * .01, fx=True))
    return out


def F(P, ex=(), diss=None):
    return R.render(merge(HUNCH, P), list(ex), dissolve=diss)


def build():
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    rest = {'shN': -22, 'elbN': -34, 'cane': 30, 'shF': 6, 'elbF': -16}
    add('idle', [F(merge(breathe(i / 4), rest, {'jaw': 2 * s(i / 4)})) for i in range(4)])
    wk = []
    for i in range(6):  # caminar teatral, bastón adelante
        t = i / 6; P = walk(t, 0.9, 2.5, 0.8)
        P.update({'shN': -40 + 10 * s(t), 'elbN': -20, 'cane': 10 - 12 * s(t)})
        wk.append(F(P))
    add('walk', wk)
    atk = []
    for i in range(6):  # apunta con el bastón y el ojo se enciende
        k = ease(min(1, i / 2)) if i < 5 else 0.5
        th = 30 + 70 * k; g = 12 * k
        P = {'shN': -22 - 38 * k, 'elbN': -34, 'cane': (th, g * math.sin(math.radians(th)), -g * math.cos(math.radians(th))), 'shF': 6 + 30 * k, 'head': -4 * k}
        ex = []
        if 2 <= i <= 4:
            Mw = R.world(merge(HUNCH, P))['cane']; ox, oy = (Mw @ np.array([0, -14, 1.0]))[:2]
            ex = [Part('glow', np.array([[1, 0, ox], [0, 1, oy], [0, 0, 1.0]]), Ellipse(0, 0, 5 + i, 5 + i) - Ellipse(0, 0, 3.5 + i, 3.5 + i), 'iris', 95, fx=True)]
        atk.append(F(P, ex))
    add('atk', atk)
    add('cast', [atk[1], atk[2], atk[3], atk[2]])
    tp = []
    for i in range(6):  # se hunde en humo rojo (3) y reaparece (3)
        if i < 3: k = (i + 1) / 3; tp.append(F(merge(rest, {'pelvis': (3, 0, 3 + 4 * k)}), smoke(i / 6, W / 2, G - 8, 10, 18, 0.6 + 0.6 * k), diss=(0.35 * k + (0.6 if i == 2 else 0), 51)))
        else: k = (6 - i) / 3; tp.append(F(merge(rest, {'pelvis': (3, 0, 3 + 4 * k)}), smoke(i / 6, W / 2, G - 8, 10, 18, 0.6 + 0.6 * k), diss=(0.35 * k + (0.6 if i == 3 else 0), 52)))
    add('tp', tp)
    add('hit', [F({'chest': -6, 'head': -16, 'hat': (-50, -10, -8), 'shN': 0, 'cane': 50, 'jaw': 4}),
                F({'head': -8, 'hat': (-26, -6, -2), 'shN': -12, 'cane': 40, 'jaw': 2})])
    dth = []
    for i in range(6):  # se desploma y queda el bastón
        k = ease(min(1, i / 4))
        P = {'pelvis': (3, 0, 3 + 34 * k), 'hipN': -6 - 80 * k, 'kneeN': 10 + 120 * k, 'hipF': -4 - 70 * k, 'kneeF': 8 + 120 * k,
             'chest': 16 + 50 * k, 'head': -6 + 30 * k, 'shN': -22 + 50 * k, 'elbN': -10, 'shF': 6 + 30 * k,
             'cane': 30 - 95 * k, 'hat': (-50 * k, -10 * k, 30 * k)}
        dth.append(F(P, diss=((i - 3) / 3 * 0.7, 53) if i >= 4 else None))
    add('death', dth)
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 3.3}
