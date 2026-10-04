"""Titán de Piedra (mn_titan) — ficha R-01 de docs/ART_COMMISSION_BRIEF.md.
Coloso minero fusionado con la roca: casco de minero gigante incrustado, vigas y cadenas clavadas en los hombros,
grietas con fuego adentro y cristales infernales violetas en la espalda. Brazos enormes hasta el piso, piernas cortas.
Celda 192×192, personaje ≈160 px. Paleta: #120c08 #4a3a2a #8a6a4a #c8a878 #ff7a2a #b04ad8."""
import math
import numpy as np
from pixrig import *
from pixrig import _hash

W = H = 192
GROUND = 188
TARGET = {'png': 'assets/sprites/arenas/minas/mn_titan/atlas.png', 'meta_file': 'js/assets/minas-meta.js', 'const': 'MINAS_ATLAS'}

ROCK = ramp_from('#120c08', '#2e241a', '#4a3a2a', '#8a6a4a', '#c8a878')
M = {
    'rock': Mat(ROCK, tex=tex_sum(tex_cracks(18, 0.7, 4, -1), tex_noise(2, 1, .9, 41))),
    'rock_far': Mat(ramp_from('#0a0604', '#1e1610', '#2e241a', '#4a3a2a', '#6a5440'), tex=tex_sum(tex_cracks(18, 0.7, 6, -1), tex_noise(2, 1, .9, 42))),
    'rock_lit': Mat(ramp_from('#2e241a', '#4a3a2a', '#8a6a4a', '#a88a62', '#c8a878'), tex=tex_sum(tex_cracks(16, 0.7, 9, -1), tex_noise(2, 1, .88, 43))),
    'helmet': Mat(ramp_from('#1a1008', '#4a3414', '#7a5a20', '#b08a34', '#e0c060'), tex=tex_noise(3, -1, .9, 44)),
    'shadowrock': Mat(ramp_from('#0a0604', '#120c08', '#1e1610', '#2e241a', '#3a2e20'), shade=0),
    'helmet_dark': Mat(ramp_from('#0a0604', '#2a1e0c', '#4a3410', '#6a4a1a', '#8a6424'), shade=0),
    'lamp': Mat(ramp_from('#7a3a08', '#c06a1a', '#ff9a3a', '#ffd070', '#fff4c8'), emissive=True, base=3),
    'wood': Mat(ramp_from('#140a06', '#3a2010', '#5a3418', '#7a4a24', '#9a6434'), tex=tex_stripes(3, 1, 'x', -1)),
    'chain': Mat(ramp_from('#141418', '#2e2e34', '#4e4e56', '#7a7a84', '#a8a8b2')),
    'fire': Mat(ramp_from('#7a1a08', '#c0401a', '#ff7a2a', '#ffb04a', '#ffe8a0'), emissive=True, base=2),
    'fire_hot': Mat(ramp_from('#c0401a', '#ff7a2a', '#ffb04a', '#ffd070', '#fff4c8'), emissive=True, base=3),
    'crystal': Mat(ramp_from('#1e0a2a', '#4a1a6a', '#7a2aa8', '#b04ad8', '#e0a0ff'), shade=1.4),
    'crystal_glow': Mat(ramp_from('#4a1a6a', '#7a2aa8', '#b04ad8', '#d080f8', '#f4d8ff'), emissive=True, base=3),
    'dust_lit': Mat(ramp_from('#8a6a4a', '#a88a62', '#c8a878', '#d8c098', '#e8d8b8'), emissive=True, base=2),
    'dust': Mat(ramp_from('#4a3a2a', '#6a5440', '#8a6a4a', '#a88a62', '#c8a878'), emissive=True, base=2),
}
M_DIM = dict(M)
for k in ('fire', 'fire_hot', 'lamp'):
    M_DIM[k] = Mat(ramp_from('#140a06', '#2a140a', '#3a1c0e', '#4a2412', '#5a2c16'), emissive=True, base=2)
M_DIM['crystal_glow'] = Mat(ramp_from('#140820', '#24103a', '#341850', '#442066', '#54287c'), emissive=True, base=2)

R = Rig(W, H, M)
R.bone('root', None, (92, GROUND))
R.bone('pelvis', 'root', (-14, -40))
R.bone('torso', 'pelvis', (6, -18))
R.bone('head', 'torso', (42, -24))
# piernas cortas y gruesas
for side, dx, mat, z0 in (('F', 12, 'rock_far', 0), ('N', -6, 'rock', 40)):
    R.bone('hip' + side, 'pelvis', (dx, 6))
    R.bone('knee' + side, 'hip' + side, (0, 16))
    R.part('thigh' + side, 'hip' + side, Capsule(0, 0, 0, 16, 15, 13), mat, z0 + 1)
    R.part('shin' + side, 'knee' + side, Capsule(0, 0, 2, 12, 13, 14), mat, z0 + 2, line=False)
    R.part('foot' + side, 'knee' + side, Ellipse(6, 17, 18, 8), mat, z0 + 3, line=False)
# torso: masa encorvada
R.part('belly', 'pelvis', Ellipse(0, -2, 30, 24), 'rock', 20)
R.part('back', 'torso', Ellipse(-8, -20, 42, 36, -25), 'rock', 21)
R.part('chest', 'torso', Ellipse(18, -10, 30, 28, 10), 'rock_lit', 22)
R.part('neckmass', 'torso', Ellipse(30, -24, 20, 14), 'rock', 22.5)
# grietas de fuego en el pecho y el vientre
R.part('vein1', 'torso', Chain([(6, -26), (12, -14), (8, -2), (16, 10)], [1.6, 2.2, 1.8, 1.2]), 'fire', 23, line=False)
R.part('vein2', 'torso', Chain([(24, -20), (28, -8), (22, 4)], [1.2, 1.8, 1.2]), 'fire', 23, line=False)
R.part('vein3', 'pelvis', Chain([(-12, -6), (-4, 2), (6, -2)], [1.2, 1.6, 1.2]), 'fire', 23, line=False)
R.part('core', 'torso', Ellipse(12, -10, 5, 6), 'fire_hot', 23.2, line=False)
# cristales infernales en la espalda
for k, (x, y, a, l, wdt) in enumerate([(-30, -40, -140, 34, 9), (-42, -22, -165, 30, 8), (-16, -50, -115, 28, 8), (-44, -2, 175, 22, 6), (-2, -52, -95, 18, 6), (-36, -50, -130, 18, 5), (-48, -36, -160, 16, 5)]):
    ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
    tip = (x + ca * l, y + sa * l); px, py = -sa * wdt, ca * wdt
    R.part(f'cr{k}', 'torso', Poly([(x + px, y + py), tip, (x - px, y - py)]), 'crystal', 19 + k * .01)
    R.part(f'crg{k}', 'torso', Poly([(x + px * .3, y + py * .3), (x + ca * l * .7, y + sa * l * .7), (x - px * .3, y - py * .3)]), 'crystal_glow', 19.05 + k * .01, line=False)
# vigas y cadenas clavadas en los hombros
R.part('beam1', 'torso', Poly([(-24, -40), (-40, -78), (-32, -82), (-16, -44)]), 'wood', 18)
R.part('beam2', 'torso', Poly([(4, -44), (-2, -72), (6, -74), (12, -46)]), 'wood', 18.5)
R.part('nail', 'torso', Ellipse(-20, -44, 3, 3), 'chain', 24)
# cabeza hundida con el casco de minero
R.part('face', 'head', Ellipse(4, 6, 17, 14), 'rock', 60)
R.part('brow', 'head', Ellipse(8, 0, 16, 6), 'rock_lit', 60.4)
R.part('underbrim', 'head', Ellipse(8, 2, 15, 4), 'shadowrock', 60.5, line=False)
R.part('eyeL', 'head', Poly([(6, 3), (13, 2), (12, 5), (6, 5)]), 'fire_hot', 61.7)
R.part('eyeR', 'head', Poly([(15, 2), (20, 2), (19, 5), (15, 4)]), 'fire', 61.6)
R.part('mouthc', 'head', Chain([(2, 13), (8, 15), (13, 13), (18, 15)], [1.3, 1.6, 1.4, 1.1]), 'fire', 61.7, line=False)
R.part('cheekcr', 'head', Chain([(-6, 4), (-2, 10), (-4, 16)], [1, 1.2, 1]), 'fire', 61.5, line=False)
R.part('helmet', 'head', Ellipse(2, -8, 22, 16) - Ellipse(2, 8, 40, 9), 'helmet', 62)
R.part('dent', 'head', Ellipse(-6, -14, 5, 3), 'helmet_dark', 62.1, line=False)
R.part('brim', 'head', Ellipse(6, 0, 25, 4.5), 'helmet', 62.3)
R.part('lampbox', 'head', Ellipse(14, -9, 7, 7), 'chain', 62.4)
R.part('lamp', 'head', Ellipse(15, -9, 4.4, 4.4), 'lamp', 62.6)
R.part('lamphot', 'head', Ellipse(14, -10, 1.8, 1.8), 'fire_hot', 62.7, line=False)
# brazos enormes hasta el piso
for side, sx, mat, z0 in (('F', 18, 'rock_far', 5), ('N', 6, 'rock_lit', 50)):
    R.bone('sh' + side, 'torso', (sx, -30))
    R.bone('elb' + side, 'sh' + side, (8, 40))
    R.bone('fist' + side, 'elb' + side, (8, 32))
    R.part('shoulder' + side, 'sh' + side, Ellipse(0, 2, 22, 20), mat if side == 'F' else 'rock_lit', z0 + 0.5)
    R.part('upper' + side, 'sh' + side, Capsule(0, 0, 8, 40, 17, 15), mat, z0 + 1)
    R.part('fore' + side, 'elb' + side, Capsule(0, 0, 8, 32, 16, 20), mat, z0 + 2, line=False)
    R.part('fistp' + side, 'fist' + side, Ellipse(0, 2, 22, 15), mat, z0 + 3)
    R.part('knuck' + side, 'fist' + side, Ellipse(8, 8, 14, 7), 'rock_lit' if side == 'N' else mat, z0 + 3.1, line=False)
R.part('veinA', 'elbN', Chain([(2, 4), (8, 16), (5, 28)], [1.4, 2, 1.4]), 'fire', 52.5, line=False)
R.part('veinB', 'shN', Chain([(-4, 4), (4, 14), (10, 30)], [1.2, 1.8, 1.2]), 'fire', 51.5, line=False)
R.part('veinC', 'fistN', Chain([(-8, -2), (0, 4), (10, 2)], [1, 1.4, 1]), 'fire', 53.5, line=False)
R.part('crArm', 'shN', Poly([(-6, -10), (-2, -30), (4, -12)]), 'crystal', 49)
R.part('crArmG', 'shN', Poly([(-3, -12), (-2, -24), (1, -12)]), 'crystal_glow', 49.1, line=False)


def chain(bone, t, origin, n=6, z=55, sway=0.0):
    out = []; x, y = origin
    for k in range(n):
        a = math.radians(95 + 10 * math.sin(2 * math.pi * t + k * .6) * (1 + sway))
        x += 4.4 * math.cos(a); y += 4.4 * math.sin(a)
        out.append(Part(f'ch{bone}{k}', bone, Ellipse(x, y, 2.8 if k % 2 else 1.6, 3.4 if k % 2 else 2.8), 'chain', z))
    return out


def dust(t, x0, y0, n=6, spread=40, k=1.0, z=90):
    out = []
    for i in range(n):
        u = (i + .5) / n - .5
        r = (7 - 4 * abs(u)) * k * (0.8 + 0.4 * _hash(i, 3, 9))
        x = x0 + u * spread * (0.6 + 0.4 * k); y = y0 - r * .6 - 3 * k * (1 - 2 * abs(u))
        T = np.array([[1, 0, x], [0, 1, y], [0, 0, 1.0]])
        out.append(Part(f'du{i}', T, Ellipse(0, 0, r, r * .75), 'dust', z + i * .01, fx=True))
        out.append(Part(f'dh{i}', T, Ellipse(-r * .25, -r * .25, r * .5, r * .4), 'dust_lit', z + .5 + i * .01, fx=True))
    return out


_POSE = None


def frame(P, t, rock=None, ex=(), dim=False, dissolve=None, sway=0.0, hide=()):
    R.mats = M_DIM if dim else M
    extras = list(ex) + chain('torso', t, (-14, -40), 6, 18.6, sway) + chain('torso', t + .4, (8, -42), 4, 18.7, sway)
    if rock is not None:
        bone, (x, y), r = rock
        extras.append(Part('rock', bone, Ellipse(x, y, r * 1.2, r), 'rock_far', 60))
        extras.append(Part('rockv', bone, Chain([(x - r * .4, y - r * .2), (x, y), (x + r * .3, y + r * .3)], [1, 1.4, 1]), 'fire', 60.1, line=False))
    img = R.render(P, extras, dissolve=dissolve, hide=hide)
    R.mats = M
    return img


def breathe(t, amp=1.0):
    return {'torso': (0, 0, round(amp * math.sin(2 * math.pi * t))), 'head': 2 * amp * math.sin(2 * math.pi * (t + .2)),
            'shN': -3 * amp * math.sin(2 * math.pi * t), 'shF': 3 * amp * math.sin(2 * math.pi * t)}


def walk_pose(t, amp=1.0, lean=0):
    s = lambda ph: math.sin(2 * math.pi * (t + ph))
    P = {'hipN': 20 * amp * s(0), 'kneeN': 16 * amp * max(0, s(.25)), 'hipF': 20 * amp * s(.5), 'kneeF': 16 * amp * max(0, s(.75)),
         'shN': -16 * amp * s(0) - lean * .6, 'elbN': -8 * amp * max(0, s(.2)), 'shF': -16 * amp * s(.5) - lean * .6, 'elbF': -8 * amp * max(0, s(.7)),
         'pelvis': (0, 0, -abs(3 * s(0))), 'torso': (lean, 0, 0), 'head': -lean * .5 + 2 * s(.1)}
    return P


def anim_idle(n=3): return [frame(breathe(i / n), i / n) for i in range(n)]
def anim_walk(n=8): return [frame(walk_pose(i / n), i / n, sway=.3) for i in range(n)]
def anim_run(n=3): return [frame(walk_pose(i / n, 1.4, 14), i / n, sway=.8) for i in range(n)]


def anim_slam(n=8):
    out = []
    for i in range(n):
        t = i / n
        if i < 4:
            k = ease(i / 3)
            P = {'shN': -125 * k, 'elbN': -40 * k, 'shF': -115 * k, 'elbF': -40 * k, 'torso': (-14 * k, 0, 4 * k), 'head': -10 * k, 'kneeN': 6 * k}
        elif i < 6:
            P = {'shN': -30, 'elbN': -30, 'shF': -34, 'elbF': -30, 'torso': (14, 0, 8), 'head': 6, 'hipN': -10, 'kneeN': 18, 'hipF': 10, 'kneeF': 10, 'pelvis': (0, 0, 6)}
        else:
            k = (i - 5) / 2
            P = {'shN': -30 * (1 - k), 'elbN': -30 * (1 - k), 'shF': -34 * (1 - k), 'elbF': -30 * (1 - k), 'torso': (14 * (1 - k), 0, 8 * (1 - k)), 'pelvis': (0, 0, 6 * (1 - k))}
        ex = dust(t, 150, GROUND - 2, 7, 60, 1.2 if i in (4, 5) else .6) if i >= 4 and i <= 6 else []
        out.append(frame(P, t, ex=ex, sway=.6))
    return out


def anim_throw(n=8):
    out = []
    for i in range(n):
        t = i / n
        if i < 3:  # toma una roca de atrás
            k = ease(i / 2)
            P = {'shN': 60 * k, 'elbN': -20 * k, 'torso': (-10 * k, 0, 0), 'head': -6 * k}
            rock = ('fistN', (2, 2), 10) if i >= 1 else None
        elif i < 5:  # la levanta por encima
            k = ease((i - 2) / 2)
            P = {'shN': 60 - 230 * k, 'elbN': -20 - 20 * k, 'torso': (-10 - 6 * k, 0, -2 * k), 'head': -8}
            rock = ('fistN', (2, -4), 12)
        else:  # lanza: la roca se va
            k = (i - 5) / 2
            P = {'shN': -60 + 50 * k, 'elbN': -10, 'torso': (16 - 6 * k, 0, 4), 'head': 6}
            rock = ('root', (60 + 30 * (i - 5), -110 + 10 * (i - 5)), 12) if i < 7 else None
        out.append(frame(P, t, rock=rock, sway=.5))
    return out


def anim_stomp(n=8):
    out = []
    for i in range(n):
        t = i / n
        if i < 4:
            k = ease(i / 3)
            P = {'hipN': -60 * k, 'kneeN': 50 * k, 'pelvis': (0, -4 * k, -6 * k), 'torso': (-8 * k, 0, 0), 'shN': -30 * k, 'shF': 20 * k, 'head': -8 * k}
        elif i < 6:
            P = {'hipN': -10, 'kneeN': 10, 'pelvis': (0, 0, 4), 'torso': (10, 0, 4), 'shN': 10, 'shF': -10, 'head': 4}
        else:
            k = (i - 5) / 2
            P = {'hipN': -10 * (1 - k), 'kneeN': 10 * (1 - k), 'pelvis': (0, 0, 4 * (1 - k)), 'torso': (10 * (1 - k), 0, 4 * (1 - k))}
        ex = dust(t, 92, GROUND - 2, 8, 90, 1.3 if i in (4, 5) else .7) if 4 <= i <= 6 else []
        out.append(frame(P, t, ex=ex, sway=.8 if i >= 4 else .2))
    return out


def anim_hit(n=3):
    return [frame({'torso': (-12 * k, -3 * k, 0), 'head': -14 * k, 'shN': 20 * k, 'shF': 16 * k}, i / n) for i, k in enumerate([1, .6, .25])]


def anim_death(n=12):
    out = []
    for i in range(n):
        t = i / n
        k = ease(min(1, i / 6))
        P = {'pelvis': (0, 0, 30 * k), 'hipN': -70 * k, 'kneeN': 110 * k, 'hipF': -70 * k, 'kneeF': 110 * k,
             'torso': (30 * k, 0, 6 * k), 'head': 30 * k, 'shN': -10 * k, 'elbN': -60 * k, 'shF': -6 * k, 'elbF': -60 * k}
        diss = None
        if i >= 7: diss = ((i - 6) / (n - 5) * 0.85, 77)
        ex = dust(t, 100, GROUND - 2, 9, 110, .6 + .8 * k) if i >= 5 else []
        out.append(frame(P, t, ex=ex, dim=i >= 5, dissolve=diss))
    return out


def build():
    S = {}; frames = []
    def add(name, fr):
        S[name] = list(range(len(frames), len(frames) + len(fr))); frames.extend(fr)
    add('idle', anim_idle()); add('walk', anim_walk()); add('run', anim_run()); add('slam', anim_slam())
    add('throw', anim_throw()); add('stomp', anim_stomp()); add('hit', anim_hit()); add('death', anim_death())
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']; S['atk'] = S['slam']
    return frames, S, dict(anchor=round(GROUND / H, 4))
