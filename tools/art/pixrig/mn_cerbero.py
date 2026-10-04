"""Cerbero, Guardián del Umbral (mn_cerbero) — ficha F-01 de docs/ART_COMMISSION_BRIEF.md.
Perro de tres cabezas parcialmente muerto, de perfil mirando a la derecha: cabeza izquierda (lado lejano) de bestia
con cicatrices y hueso expuesto, cabeza central de fuego con la mandíbula fundida, cabeza derecha (lado cercano) de
sombra con ojos de humo; cuerpo musculoso negro y rojo con costillas a la vista, cadenas rotas en el cuello.
Celda 192×192, personaje ≈150 px. Paleta: #0e0806 #3a1410 #8a2a1a #ff7a2a #d8c8a8 #5a5a62."""
import math
from pixrig import *
import numpy as np

W = H = 192
TARGET = {'png': 'assets/sprites/arenas/minas/mn_cerbero/atlas.png', 'meta_file': 'js/assets/minas-meta.js', 'const': 'MINAS_ATLAS'}
GROUND = 188

M = {
    'hide': Mat(ramp_from('#0a0606', '#140a0a', '#1e0e0c', '#2e1410', '#4a1c14'), tex=tex_noise(2, 1, .86, 11)),
    'hide_far': Mat(ramp_from('#060404', '#0e0808', '#160a0a', '#22100e', '#341410'), tex=tex_noise(2, 1, .88, 12)),
    'muscle': Mat(ramp_from('#1e0a0a', '#3e1210', '#661c16', '#8a2a1e', '#ac4028'), tex=tex_noise(2, 1, .84, 31)),
    'bone': Mat(ramp_from('#3a2a22', '#8a7a62', '#b8a88a', '#d8c8a8', '#f2e8d2')),
    'cavity': Mat(ramp_from('#0e0806', '#160a08', '#200c0a', '#2a100c', '#3a1410'), shade=0.5),
    'chain': Mat(ramp_from('#1a1a20', '#3a3a42', '#5a5a62', '#8a8a94', '#b8b8c2')),
    'char': Mat(ramp_from('#0e0806', '#1e0c08', '#2e120c', '#46180e', '#5e2410'), tex=tex_cracks(6, 0.8, 5, 2)),
    'fire': Mat(ramp_from('#7a1a08', '#c0401a', '#ff7a2a', '#ffb04a', '#ffe8a0'), emissive=True, base=2),
    'fire_dark': Mat(ramp_from('#5a1006', '#8a200c', '#c0401a', '#e05a20', '#ff7a2a'), emissive=True, base=2),
    'fire_hot': Mat(ramp_from('#c0401a', '#ff7a2a', '#ffb04a', '#ffd070', '#fff4c8'), emissive=True, base=3),
    'shade': Mat(ramp_from('#08060c', '#141020', '#221a30', '#342844', '#4a3a5c'), tex=tex_noise(3, 1, .9, 21)),
    'smoke_eye': Mat(ramp_from('#6a5a8a', '#9a8ab8', '#c8bce0', '#e8e0f8', '#ffffff'), emissive=True, base=3),
    'eye_red': Mat(ramp_from('#5a0a08', '#a01a10', '#ff3a1a', '#ff8a4a', '#ffd0a0'), emissive=True, base=3),
    'smoke': Mat(ramp_from('#141020', '#221a30', '#342844', '#4a3a5c', '#5e4e70'), emissive=True, base=2),
    'ember': Mat(ramp_from('#7a1a08', '#c0401a', '#ff7a2a', '#ffb04a', '#ffe8a0'), emissive=True, base=3),
}
# fuego apagado (muerte): el mismo cuerpo con brasas que se enfrían
M_DIM = dict(M)
M_DIM['fire'] = Mat(ramp_from('#2a0c06', '#4a160a', '#6a2410', '#8a3414', '#a04a1c'), emissive=True, base=2)
M_DIM['fire_dark'] = Mat(ramp_from('#1a0604', '#2a0c06', '#4a160a', '#6a2410', '#8a3414'), emissive=True, base=2)
M_DIM['fire_hot'] = Mat(ramp_from('#3a1008', '#5a1c0c', '#7a2a12', '#9a3a18', '#b04a20'), emissive=True, base=2)
M_DIM['eye_red'] = Mat(ramp_from('#1a0806', '#2a0c08', '#3a100a', '#4a140c', '#5a1a0e'), emissive=True, base=2)
M_DIM['smoke_eye'] = Mat(ramp_from('#141020', '#221a30', '#342844', '#4a3a5c', '#5e4e70'), emissive=True, base=2)

R = Rig(W, H, M)
R.bone('root', None, (86, GROUND))
R.bone('body', 'root', (2, -82))
# patas (lejanas detrás, cercanas delante)
for side, dx, mat, z0 in (('F', 7, 'hide_far', 0), ('N', 0, 'hide', 40)):
    R.bone('hip' + side, 'body', (-40 + dx, 10))
    R.bone('knee' + side, 'hip' + side, (8, 30))
    R.bone('hock' + side, 'knee' + side, (-9, 22))
    R.bone('sh' + side, 'body', (34 + dx, 12))
    R.bone('elb' + side, 'sh' + side, (2, 32))
    R.bone('wr' + side, 'elb' + side, (1, 26))
    R.part('thigh' + side, 'hip' + side, Ellipse(2, 12, 15, 19, 10), mat, z0 + 1)
    R.part('shin' + side, 'knee' + side, Capsule(0, 0, -9, 22, 9, 6), mat, z0 + 2, line=False)
    R.part('meta' + side, 'hock' + side, Capsule(0, 0, 3, 13, 6, 5), mat, z0 + 3, line=False)
    R.part('hpaw' + side, 'hock' + side, Ellipse(7, 15, 10, 5), mat, z0 + 4, line=False)
    R.part('upper' + side, 'sh' + side, Capsule(0, 0, 2, 32, 13, 8), mat, z0 + 1)
    R.part('fore' + side, 'elb' + side, Capsule(0, 0, 1, 26, 9, 7), mat, z0 + 2, line=False)
    R.part('fpaw' + side, 'wr' + side, Ellipse(6, 3, 11, 6), mat, z0 + 3, line=False)
    for k in range(3):  # garras de hueso
        R.part(f'claw{side}{k}', 'wr' + side, Poly([(9 + k * 3, 4), (14 + k * 3, 7), (10 + k * 3, 7)]), 'bone', z0 + 3.5)
R.parts[[p.name for p in R.parts].index('thighN')].mat = 'muscle'
R.parts[[p.name for p in R.parts].index('upperN')].mat = 'muscle'
# torso
R.part('hips', 'body', Ellipse(-38, 4, 27, 26), 'hide', 20)
R.part('belly', 'body', Ellipse(-6, 8, 32, 24, -6), 'hide', 21)
R.part('chest', 'body', Ellipse(28, -4, 34, 36, -10), 'hide', 22)
R.part('hump', 'body', Ellipse(14, -22, 26, 16, -16), 'hide', 21.5)
R.part('cavity', 'body', Ellipse(-10, 7, 19, 14, -4), 'cavity', 23, cast=False)
for k in range(4):
    x = -24 + k * 9
    R.part(f'rib{k}', 'body', Chain([(x, -8), (x + 2, 2), (x - 1, 14)], [2.4, 2.2, 1.8]), 'bone', 24)
R.part('shoulderM', 'body', Ellipse(30, 2, 20, 24, 15), 'muscle', 25)
R.part('pecM', 'body', Ellipse(48, 12, 10, 16, -20), 'muscle', 25.5)
R.part('rumpM', 'body', Ellipse(-40, 6, 15, 17), 'muscle', 25)
for k, (x, y, h_) in enumerate([(-50, -18, 9), (-36, -24, 11), (-20, -26, 12), (-4, -26, 12), (12, -28, 11), (26, -32, 10)]):
    R.part(f'spike{k}', 'body', Poly([(x - 4, y + 6), (x + 2, y - h_), (x + 5, y + 6)]), 'bone', 19)
# cola con penacho de fuego
R.bone('tail', 'body', (-62, -8))
R.part('tail', 'tail', Chain([(0, 0), (-9, -5), (-15, -15), (-17, -27)], [6, 5, 4, 3]), 'hide', 18)
R.bone('tailtip', 'tail', (-17, -29))

# cuellos y cabezas: F = bestia (lejana), C = fuego (central), N = sombra (cercana)
HEADS = {
    'F': dict(neck=(26, -26), to=(4, -40), base=-10, z=10, skull='hide_far', jaw='hide_far'),
    'C': dict(neck=(40, -24), to=(20, -34), base=0, z=60, skull='char', jaw='fire'),
    'N': dict(neck=(44, -10), to=(30, -12), base=6, z=80, skull='shade', jaw='shade'),
}
for h, d in HEADS.items():
    R.bone('neck' + h, 'body', d['neck'])
    R.bone('head' + h, 'neck' + h, (d['to'][0], d['to'][1]), d['base'])
    R.bones['head' + h].scale = d.get('scale', 1.3)
    R.bone('jaw' + h, 'head' + h, (2, 7))
    z = d['z']
    R.part('neck' + h, 'neck' + h, Capsule(0, 0, d['to'][0], d['to'][1], 14, 10), 'hide' if h != 'F' else 'hide_far', z)
    R.part('collar' + h, 'neck' + h, Ellipse(d['to'][0] * .45, d['to'][1] * .45, 3, 12, math.degrees(math.atan2(d['to'][1], d['to'][0]))), 'chain', z + 0.5)
    R.part('skull' + h, 'head' + h, Ellipse(0, -1, 14, 12), d['skull'], z + 2)
    R.part('snout' + h, 'head' + h, Capsule(6, 1, 24, 3, 8, 5.5), d['skull'], z + 2.2)
    R.part('ear' + h, 'head' + h, Poly([(-9, -6), (-6, -22), (2, -9)]), d['skull'], z + 1.5)
    R.part('jaw' + h, 'jaw' + h, Capsule(0, 0, 20, 2, 5, 3.5), d['jaw'], z + 1.8)
    for k in range(4):
        R.part(f'tooth{h}{k}', 'head' + h, Poly([(10 + k * 4, 5), (12 + k * 4, 10), (14 + k * 4, 5)]), 'bone', z + 1.7, line=False)
    R.part('eye' + h, 'head' + h, Ellipse(8, -3, 2.2, 1.6), {'F': 'eye_red', 'C': 'fire_hot', 'N': 'smoke_eye'}[h], z + 3)
# bestia: hueso expuesto en la mejilla y cicatrices
R.part('boneF', 'headF', Ellipse(1, 2, 8, 6), 'bone', 13)
R.part('scarF', 'headF', Capsule(-6, -8, 8, 2, 1, 1), 'muscle', 13.2, line=False)
# fuego: grietas encendidas en el cráneo carbonizado
R.part('crackC', 'headC', Chain([(-8, -6), (-2, -2), (4, -6), (10, -2)], [1, 1, 1, 1]), 'fire', 62.6, line=False)
R.part('nostrilC', 'headC', Ellipse(22, 0, 2, 1.5), 'fire_hot', 62.6)
# sombra: hocico más largo y desdibujado
R.part('maneN', 'neckN', Chain([(4, -10), (14, -16), (24, -14)], [6, 5, 3]), 'shade', 79)


def flame_shape(x, hh, w, lean, wob):
    """Lengua de fuego redondeada que se inclina hacia atrás (punta curva)."""
    L, Rr = [], []
    for j in range(9):
        u = j / 8
        width = w * (1 - u) ** 0.8 * (1 + 0.25 * math.sin(math.pi * u))
        cx = x + lean * u * u + wob * math.sin(math.pi * u * 1.5)
        L.append((cx - width, -hh * u)); Rr.append((cx + width, -hh * u))
    return Poly(L + Rr[::-1])


def flames(bone, t, scale=1.0, z=70, n=4, spread=9, height=16, mat='fire', seed=0, lean=-8, at=(0, 0)):
    """Fuego en tres capas (rojo, naranja, núcleo claro), piezas sueltas del cuadro sin contorno."""
    out = []
    for k in range(n):
        ph = (t + k * 0.31 + seed * 0.17) % 1
        x = at[0] + (k - (n - 1) / 2) * spread * scale
        hh = height * scale * (0.7 + 0.3 * math.sin(2 * math.pi * ph)) * (1.15 if k == n // 2 else 1)
        wob = 2.2 * scale * math.sin(2 * math.pi * (ph + 0.25))
        w = 5.2 * scale
        base = Part(f'fl{bone}{k}', bone, flame_shape(x, hh, w, lean * scale, wob), 'fire_dark', z, fx=True)
        base.tex_off = at
        out.append(base)
        out.append(Part(f'flm{bone}{k}', bone, flame_shape(x, hh * .72, w * .66, lean * scale * .7, wob * .8), mat, z + .1, fx=True))
        out.append(Part(f'flh{bone}{k}', bone, flame_shape(x, hh * .38, w * .36, lean * scale * .4, wob * .5), 'fire_hot', z + .2, fx=True))
    # desplazar al punto de origen
    return out


def chain_links(bone, t, origin, n=5, z=59, sway=0.0):
    out = []
    x, y = origin
    for k in range(n):
        a = math.radians(90 + 12 * math.sin(2 * math.pi * t + k * .5) * (1 + sway))
        x += 4.2 * math.cos(a); y += 4.2 * math.sin(a)
        out.append(Part(f'ln{bone}{k}', bone, Ellipse(x, y, 2.6 if k % 2 else 1.6, 3.2 if k % 2 else 2.6), 'chain', z))
    return out


def base_pose():
    return {}


def gait(t, amp=1.0, bob=2.0):
    """Paso cruzado de cuadrúpedo: trasera cercana con delantera lejana, y al revés."""
    P = {}
    s = lambda ph: math.sin(2 * math.pi * (t + ph))
    for side, ph in (('N', 0.0), ('F', 0.5)):
        P['hip' + side] = 16 * amp * s(ph)
        P['knee' + side] = 12 * amp * max(0, s(ph + .25))
        P['hock' + side] = -10 * amp * max(0, s(ph + .3))
        fph = ph + 0.5
        P['sh' + side] = -16 * amp * s(fph)
        P['elb' + side] = -14 * amp * max(0, s(fph + .25))
        P['wr' + side] = 10 * amp * max(0, s(fph + .3))
    P['body'] = (0, 0, -abs(bob * s(0) ** 2) + bob / 2)
    return P


def heads(P, t, amp=1.0, override=None):
    for h, ph in (('F', 0.0), ('C', 0.33), ('N', 0.66)):
        P['neck' + h] = 4 * amp * math.sin(2 * math.pi * (t + ph))
        P['head' + h] = 3 * amp * math.sin(2 * math.pi * (t + ph + .2))
        P['jaw' + h] = 4 + 4 * max(0, math.sin(2 * math.pi * (t + ph + .4)))
    P['tail'] = 8 * math.sin(2 * math.pi * t)
    if override: P.update(override)
    return P


def extras(t, fire=1.0, tail=1.0, smoke=1.0, links_sway=0.0, cone=0.0):
    ex = []
    ex += flames('headC', t, 1.0 * fire, 63.5, 4, 6, 26, seed=1, lean=-12, at=(-2, -6)) if fire > 0.05 else []
    ex += flames('tailtip', t + .4, 0.8 * tail, 17.5, 3, 5, 20, seed=2, lean=-6) if tail > 0.05 else []
    if smoke > 0.05:
        for k in range(3):
            ph = (t + k / 3) % 1
            ex.append(Part(f'smk{k}', 'headN', Ellipse(-6 - 10 * ph, -10 - 12 * ph, 4 * smoke * (1 - ph * .5), 3 * smoke * (1 - ph * .5)), 'smoke', 81, fx=True))
    for h, org in (('F', (2, -10)), ('C', (9, -12)), ('N', (14, -4))):
        ex += chain_links('neck' + h, t + {'F': 0, 'C': .3, 'N': .6}[h], org, 4 if h != 'N' else 5, HEADS[h]['z'] + .6, links_sway)
    if cone > 0 and _POSE is not None:
        Mw = R.world(_POSE)['headC']
        ox, oy = (Mw @ np.array([26, 6, 1.0]))[:2]
        T = np.array([[math.cos(.3), -math.sin(.3), ox], [math.sin(.3), math.cos(.3), oy], [0, 0, 1.0]])
        L = min(34 * cone, W - 4 - ox)
        ex.append(Part('cone0', T, Poly([(-2, -3), (L, -9 - L * .3), (L + 4, 0), (L, 9 + L * .3)]), 'fire_dark', 94.9, fx=True))
        ex.append(Part('cone1', T, Poly([(0, -2), (L * .9, -6 - L * .2), (L, 0), (L * .9, 6 + L * .2)]), 'fire', 95, fx=True))
        ex.append(Part('cone2', T, Poly([(0, -1), (L * .6, -3 - L * .1), (L * .66, 0), (L * .6, 3 + L * .1)]), 'fire_hot', 95.1, fx=True))
    return ex


_POSE = None


def frame(P, t, **kw):
    global _POSE
    _POSE = P
    dim = kw.pop('dim', False); diss = kw.pop('dissolve', None); hide = kw.pop('hide', ())
    R.mats = M_DIM if dim else M
    img = R.render(P, extras(t, **kw), hide=hide, dissolve=diss)
    R.mats = M
    return img


def anim_idle(n=4):
    return [frame(heads({'body': (0, 0, round(math.sin(2 * math.pi * i / n)))}, i / n, .6), i / n) for i in range(n)]


def anim_walk(n=8, amp=1.0, run=False):
    out = []
    for i in range(n):
        t = i / n
        P = gait(t, amp * (1.35 if run else 1), 3 if run else 2)
        if run: P['body'] = (-4, P['body'][1], P['body'][2])
        heads(P, t, 1.4 if run else 1)
        out.append(frame(P, t, links_sway=.6 if run else .2))
    return out


def anim_flame(n=10):
    out = []
    for i in range(n):
        t = i / n
        P = heads({}, t, .3)
        if i < 4:  # se echa atrás y carga
            k = ease(i / 3)
            P.update({'neckC': -26 * k, 'headC': -14 * k, 'jawC': 6 * k, 'body': (-3 * k, -2 * k, 0), 'root': (0, -18 * k, 0)})
            out.append(frame(P, t, fire=1 + .5 * k))
        else:  # escupe el cono
            k = (i - 4) / (n - 5)
            P.update({'neckC': 14, 'headC': 6, 'jawC': 26, 'body': (2, 2, 0), 'root': (0, -18, 0), 'neckF': -6, 'neckN': 6})
            out.append(frame(P, t, fire=1.5, cone=min(1, .5 + k * .8) if k < .95 else .7))
    return out


def anim_bite(n=10):
    out = []
    order = ['N', 'C', 'F']
    for i in range(n):
        t = i / n
        P = heads({}, t, .3)
        for j, h in enumerate(order):
            ph = (i - j * 3) / 4
            k = math.sin(math.pi * min(1, max(0, ph))) if 0 <= ph <= 1 else 0
            P['neck' + h] = P.get('neck' + h, 0) + 16 * k
            P['head' + h] = P.get('head' + h, 0) + 8 * k
            P['jaw' + h] = 4 + (24 * k if ph < .55 else 2)
        P['body'] = (3 * math.sin(math.pi * t), 0, 0)
        out.append(frame(P, t))
    return out


def anim_stomp(n=10):
    out = []
    for i in range(n):
        t = i / n
        if i < 6:
            k = ease(i / 5)
            P = heads({'body': (-12 * k, -4 * k, -10 * k), 'shN': -34 * k, 'shF': -40 * k, 'elbN': -40 * k, 'elbF': -44 * k,
                       'hipN': 14 * k, 'hipF': 10 * k}, t, .5, {'neckC': -14 * k, 'neckF': -18 * k, 'neckN': -10 * k, 'jawC': 14, 'jawF': 12, 'jawN': 12})
        else:
            k = (i - 6) / 3
            P = heads({'body': (4, 0, 3 - 3 * k), 'shN': 10, 'shF': 6, 'elbN': 0, 'elbF': 0, 'hipN': -4, 'hipF': -6}, t, .4,
                      {'neckC': 10, 'neckF': 8, 'neckN': 12})
        out.append(frame(P, t, fire=1.3))
    return out


def anim_howl(n=12):
    out = []
    for i in range(n):
        t = i / n
        k = ease(min(1, i / 4)) * (1 if i < 10 else 1 - (i - 9) / 3 * .6)
        P = heads({'body': (0, -4 * k, -6 * k)}, t, .4, {'neckF': -30 * k, 'headF': -22 * k, 'jawF': 4 + 22 * k,
                                                        'neckC': -36 * k, 'headC': -26 * k, 'jawC': 4 + 26 * k,
                                                        'neckN': -24 * k, 'headN': -20 * k, 'jawN': 4 + 20 * k})
        out.append(frame(P, t, fire=1 + 1.2 * k, smoke=1 + k, links_sway=1.2 * k))
    return out


def anim_hit(n=4):
    out = []
    for i in range(n):
        k = [1, .8, .45, .15][i]
        P = heads({'body': (-6 * k, -2 * k, 4 * k)}, i / n, .2, {'neckC': -16 * k, 'neckF': -10 * k, 'neckN': -20 * k, 'headN': -10 * k, 'jawN': 14 * k + 4, 'jawC': 10 * k + 4})
        out.append(frame(P, i / n))
    return out


def anim_death(n=16):
    out = []
    for i in range(n):
        t = i / n
        k = ease(min(1, i / 9))
        P = {'body': (6 * k, 34 * k, 10 * k), 'root': (0, -22 * k, 0)}
        for side in 'NF':
            P['hip' + side] = 70 * k; P['knee' + side] = -40 * k; P['hock' + side] = 20 * k
            P['sh' + side] = -60 * k; P['elb' + side] = 10 * k; P['wr' + side] = 30 * k
        heads(P, t, .4 * (1 - k), {'neckF': 30 * k, 'headF': 22 * k, 'neckC': 36 * k, 'headC': 26 * k, 'jawC': 4 + 10 * k,
                                   'neckN': 40 * k, 'headN': 20 * k, 'jawN': 4 + 6 * k, 'tail': 50 * k})
        fade = max(0, 1 - max(0, i - 8) / 6)
        out.append(frame(P, t, fire=fade, tail=fade, smoke=fade, dim=i >= 11))
    return out


def build():
    S = {}
    frames = []
    def add(name, fr):
        S[name] = list(range(len(frames), len(frames) + len(fr))); frames.extend(fr)
    add('idle', anim_idle())
    add('walk', anim_walk())
    add('run', anim_walk(8, run=True))
    add('flame', anim_flame())
    add('hit', anim_hit())
    add('death', anim_death())
    add('stomp', anim_stomp())
    add('bite', anim_bite())
    add('summon', anim_howl())
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']; S['atk'] = S['bite']
    return frames, S, dict(anchor=round(GROUND / H, 4))
