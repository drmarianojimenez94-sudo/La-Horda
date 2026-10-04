"""Gólem de Cuerpos (golem_cuerpos) — ficha P0-12 de docs/ART_COMMISSION_BRIEF.md. Forma 2 del jefe final.
Mole encorvada de tres veces el alto de un héroe, cosida con los cuerpos de todos los que cayeron: brazos, torsos y
cráneos fundidos en una masa de carne oscura, atada con tendones rojos que brillan y cadenas rotas. Detrás de la
cabeza, un halo de huesos en punta (corona de costillas); el sigilo dorado del Hechicero en el pecho. Brazos enormes
que casi tocan el piso, se mueve pesado. Celda 320×272, personaje ≈250 px.
Paleta: #1a0808 #4a1216 #8a2a2a #c0503a #d8c8a8 #e8c27a."""
import math
import numpy as np
from pixrig import *
from pixrig import _hash
from biped import merge, s

W, H, G = 320, 272, 268
TARGET = {'png': 'assets/sprites/bosses/infernal/hechicero/golem/v2/atlas.png'}
FLESH = ramp_from('#120505', '#220909', '#34100f', '#4a1616', '#682222')
M = {
    'flesh': Mat(FLESH, tex=tex_sum(tex_noise(2, 1, .88, 101), tex_cracks(14, 0.7, 7, -1))),
    'flesh_far': Mat(ramp_from('#0e0404', '#1a0808', '#2e0c0e', '#3e1012', '#521618'), tex=tex_noise(2, 1, .9, 102)),
    'limb': Mat(ramp_from('#1e0a0a', '#3a1414', '#5a2420', '#7a382e', '#965040'), tex=tex_noise(2, 1, .9, 103)),
    'bone': Mat(ramp_from('#3a3026', '#7a6c58', '#a89a80', '#d8c8a8', '#f0e6d0')),
    'socket': Mat(ramp_from('#060202', '#0c0404', '#140606', '#1c0808', '#240a0a'), shade=0),
    'tendon': Mat(ramp_from('#7a1a10', '#a82a18', '#c0503a', '#e07a50', '#ffb080'), emissive=True, base=2),
    'tendon_hot': Mat(ramp_from('#c0503a', '#e07a50', '#ffb080', '#ffd8b0', '#fff4e8'), emissive=True, base=3),
    'eye': Mat(ramp_from('#7a1a08', '#c02a10', '#ff4a20', '#ff9a50', '#ffe0a0'), emissive=True, base=3),
    'sigil': Mat(ramp_from('#8a6424', '#c09a48', '#e8c27a', '#ffe8a8', '#fff8e0'), emissive=True, base=2),
    'chain': Mat(ramp_from('#1a1418', '#3a3036', '#5a5056', '#847a80', '#aca2a8')),
    'dust': Mat(ramp_from('#2a0c0e', '#4a1618', '#6a2a26', '#8a4034', '#a85a48'), emissive=True, base=2),
}
M_DIM = dict(M)
for k in ('tendon', 'tendon_hot', 'eye', 'sigil'):
    M_DIM[k] = Mat(ramp_from('#140606', '#240a08', '#341008', '#44160c', '#541c10'), emissive=True, base=2)

R = Rig(W, H, M)
R.bone('root', None, (W // 2 - 10, G))
R.bone('pelvis', 'root', (0, -70))
R.bone('chest', 'pelvis', (10, -40))
R.bone('head', 'chest', (54, -10))
R.bone('jaw', 'head', (6, 12))
R.bone('halo', 'chest', (30, -40))
# piernas cortas: columnas de cuerpos
for side, dx, mat, z0 in (('F', 14, 'flesh_far', 0), ('N', -10, 'flesh', 40)):
    R.bone('hip' + side, 'pelvis', (dx, 8))
    R.bone('knee' + side, 'hip' + side, (4, 32))
    R.part('thigh' + side, 'hip' + side, Capsule(0, 0, 4, 32, 22, 19), mat, z0 + 1)
    R.part('shin' + side, 'knee' + side, Capsule(0, 0, 0, 28, 19, 21), mat, z0 + 2, line=False)
    R.part('foot' + side, 'knee' + side, Ellipse(8, 30, 26, 10), mat, z0 + 3, line=False)
    for k in range(3):  # dedos de pie que son manos
        R.part(f'toe{side}{k}', 'knee' + side, Capsule(20 + k * 5, 30, 30 + k * 4, 34, 3, 2), 'limb', z0 + 3.2 + k * .01)
# masa del torso
R.part('hump', 'chest', Ellipse(-14, -18, 62, 50, -15), 'flesh', 20)
R.part('belly', 'pelvis', Ellipse(6, -10, 46, 36), 'flesh', 20.5)
R.part('chestP', 'chest', Ellipse(26, -4, 44, 40, 15), 'flesh', 21)
# cuerpos fundidos: torsos, brazos y manos que asoman; cráneos incrustados
for k, (x, y, a, L) in enumerate([(-50, -40, -40, 34), (-30, -60, -80, 30), (-60, -8, 200, 28), (0, -54, -100, 24), (-20, 10, 160, 26)]):
    ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
    R.part(f'arm{k}', 'chest', Capsule(x, y, x + ca * L, y + sa * L, 5, 4), 'limb', 22 + k * .01)
    hx_, hy_ = x + ca * (L + 3), y + sa * (L + 3)
    R.part(f'hand{k}', 'chest', Ellipse(hx_, hy_, 5, 4, a), 'limb', 22.05 + k * .01)
    for j in range(3):
        fa = math.radians(a - 30 + j * 30)
        R.part(f'fing{k}{j}', 'chest', Capsule(hx_, hy_, hx_ + math.cos(fa) * 7, hy_ + math.sin(fa) * 7, 1.5, 1), 'limb', 22.06 + k * .01)
for k, (x, y, r) in enumerate([(-36, -28, 10), (-8, -42, 9), (-56, 14, 8), (10, 22, 9), (-24, 2, 8), (-42, -62, 7)]):
    R.part(f'sk{k}', 'chest', Ellipse(x, y, r, r * 1.05), 'bone', 23 + k * .01)
    R.part(f'skjw{k}', 'chest', Ellipse(x + r * .25, y + r * .75, r * .6, r * .38), 'bone', 23.01 + k * .01)
    for j, ox in enumerate((-0.15, 0.5)):
        R.part(f'sks{k}{j}', 'chest', Ellipse(x + r * ox, y - r * .1, r * .24, r * .3), 'socket', 23.02 + k * .01, line=False)
    R.part(f'skn{k}', 'chest', Ellipse(x + r * .2, y + r * .3, r * .1, r * .16), 'socket', 23.025 + k * .01, line=False)
    R.part(f'skt{k}', 'chest', Capsule(x - r * .1, y + r * .72, x + r * .65, y + r * .72, r * .08, r * .08), 'socket', 23.03 + k * .01, line=False)
for k, (x, y) in enumerate([(-30, -14), (-14, -10), (2, -6)]):  # costillas de un torso fundido
    R.part(f'rib{k}', 'chest', Chain([(x, y - 8), (x + 4, y), (x + 1, y + 10)], [1.6, 1.8, 1.4]), 'bone', 23.5 + k * .01)
# tendones rojos que brillan (atan la masa)
R.part('ten1', 'chest', Chain([(-60, -30), (-30, -20), (0, -30), (30, -20)], [1.8, 2.4, 2.2, 1.6]), 'tendon', 24, line=False)
R.part('ten2', 'chest', Chain([(-50, 10), (-20, 20), (10, 10), (34, 20)], [1.6, 2.2, 2, 1.4]), 'tendon', 24, line=False)
R.part('ten3', 'chest', Chain([(-20, -60), (-26, -30), (-14, 0), (-22, 30)], [1.4, 2, 2, 1.4]), 'tendon', 24, line=False)
R.part('ten4', 'pelvis', Chain([(-30, -20), (0, -10), (30, -24)], [1.6, 2, 1.4]), 'tendon', 24, line=False)
# sigilo dorado del Hechicero en el pecho
R.part('sigilR', 'chest', Ellipse(46, -22, 12, 12) - Ellipse(46, -22, 9, 9), 'sigil', 25)
R.part('sigilV', 'chest', Capsule(46, -32, 46, -12, 1.4, 1.4), 'sigil', 25.1)
R.part('sigilH', 'chest', Capsule(36, -22, 56, -22, 1.4, 1.4), 'sigil', 25.1)
R.part('sigilC', 'chest', Ellipse(46, -22, 3, 3), 'tendon_hot', 25.2)
# halo de huesos en punta detrás de la cabeza (corona de costillas)
for k in range(9):
    a = math.radians(-170 + k * 20)
    r0, r1 = 26, 48 + 8 * (k % 2)
    R.part(f'hr{k}', 'halo', Chain([(math.cos(a) * r0, math.sin(a) * r0), (math.cos(a + .06) * (r0 + r1) / 2, math.sin(a + .06) * (r0 + r1) / 2), (math.cos(a + .14) * r1, math.sin(a + .14) * r1)], [3.2, 2.2, 0.8]), 'bone', 10 + k * .01)
R.part('haloring', 'halo', Ellipse(0, 0, 28, 28) - Ellipse(0, 0, 24, 24) - Poly([(0, 0), (40, 10), (40, 60), (-40, 60), (-40, 10)]), 'bone', 10.5)
# cabeza: cráneo grande de mandíbula abierta, ojos rojos
R.part('headmass', 'head', Ellipse(-4, -2, 22, 20), 'flesh', 60)
R.part('skull', 'head', Ellipse(2, -4, 17, 16), 'bone', 61)
R.part('brow', 'head', Ellipse(6, -12, 14, 5), 'bone', 61.2)
R.part('socket1', 'head', Ellipse(10, -6, 4.2, 4), 'socket', 61.3, line=False)
R.part('socket2', 'head', Ellipse(0, -6, 3.4, 3.6), 'socket', 61.3, line=False)
R.part('eye1', 'head', Ellipse(10.5, -6, 2, 2), 'eye', 61.4, line=False)
R.part('eye2', 'head', Ellipse(0.4, -6, 1.6, 1.6), 'eye', 61.4, line=False)
R.part('nose', 'head', Poly([(14, -1), (17, 4), (12, 4)]), 'socket', 61.3, line=False)
R.part('jawP', 'jaw', Poly([(-12, -2), (16, -4), (18, 6), (8, 12), (-10, 8)]), 'bone', 60.5)
R.part('mouth', 'jaw', Ellipse(4, 0, 11, 4), 'socket', 60.8, line=False)
for k in range(6):
    R.part(f'tt{k}', 'jaw', Poly([(-5 + k * 3.6, -3), (-3.6 + k * 3.6, 3), (-2 + k * 3.6, -3)]), 'bone', 60.9 + k * .01, line=False)
R.part('glowmouth', 'jaw', Ellipse(4, 1, 6, 2), 'tendon', 60.85, line=False)
# brazos enormes que casi tocan el piso
for side, sx, mat, z0 in (('F', 30, 'flesh_far', 5), ('N', 0, 'flesh', 50)):
    R.bone('sh' + side, 'chest', (sx, -30))
    R.bone('elb' + side, 'sh' + side, (10, 56))
    R.bone('hand' + side, 'elb' + side, (6, 52))
    R.part('shoulder' + side, 'sh' + side, Ellipse(0, 4, 28, 26), mat, z0)
    R.part('upper' + side, 'sh' + side, Capsule(0, 0, 10, 56, 21, 18), mat, z0 + 1)
    R.part('fore' + side, 'elb' + side, Capsule(0, 0, 6, 50, 18, 22), mat, z0 + 2, line=False)
    R.part('palm' + side, 'hand' + side, Ellipse(2, 6, 22, 16), mat, z0 + 3)
    for k in range(4):  # dedos: brazos enteros
        fa = math.radians(60 + k * 25)
        R.part(f'fg{side}{k}', 'hand' + side, Capsule(2 + math.cos(fa) * 12, 6 + math.sin(fa) * 10, 2 + math.cos(fa) * 30, 8 + math.sin(fa) * 24, 5, 3.4), 'limb' if side == 'N' else mat, z0 + 3.2 + k * .01)
    if side == 'N':
        R.part('tenA', 'elb' + side, Chain([(-6, 4), (6, 24), (0, 44)], [1.6, 2.2, 1.6]), 'tendon', z0 + 2.5, line=False)
        R.part('skA', 'sh' + side, Ellipse(4, 24, 8, 8.4), 'bone', z0 + 1.5)
        R.part('skAj', 'sh' + side, Ellipse(6, 30, 5, 3), 'bone', z0 + 1.55)
        R.part('skAs1', 'sh' + side, Ellipse(3, 23, 1.9, 2.4), 'socket', z0 + 1.6, line=False)
        R.part('skAs2', 'sh' + side, Ellipse(8, 23, 1.9, 2.4), 'socket', z0 + 1.6, line=False)
        R.part('skAt', 'sh' + side, Capsule(3, 30, 9, 30, 0.7, 0.7), 'socket', z0 + 1.6, line=False)


def chains_hang(P, t, sway=1.0):
    Mw = R.world(P); out = []
    for side, z in (('N', 53.6), ('F', 8.6)):
        x, y = (Mw['hand' + side] @ np.array([-8, -10, 1.0]))[:2]
        for k in range(7):
            u = k / 6
            px = x - 4 * sway * math.sin(2 * math.pi * t + u * 2) * u; py = y + 6 + 5 * k
            if py > G - 2: break
            if k % 2: out.append(Part(f'c{side}{k}', np.array([[1, 0, px], [0, 1, py], [0, 0, 1.0]]), Ellipse(0, 0, 2, 3.4), 'chain', z + k * .001))
            else: out.append(Part(f'c{side}{k}', np.array([[1, 0, px], [0, 1, py], [0, 0, 1.0]]), Ellipse(0, 0, 3.6, 3.2) - Ellipse(0, 0, 1.6, 1.4), 'chain', z + k * .001))
    return out


def corpses_pile(t, k=1.0, z=30, rise=0.0):
    """Montón de cuerpos en el piso (muerte / antes de formarse): torsos, cráneos y brazos apilados."""
    out = []
    for i in range(16):
        x = W / 2 - 90 + 180 * _hash(i, 1, 55)
        hh = (1 - abs(x - W / 2) / 100) * 40 * k
        y = G - 6 - hh * _hash(i, 2, 55) - rise * 60 * _hash(i, 4, 55)
        a = 360 * _hash(i, 3, 55)
        T = np.array([[1, 0, x], [0, 1, y], [0, 0, 1.0]])
        if i % 3 == 0:
            out.append(Part(f'pb{i}', T, Ellipse(0, 0, 9, 10), 'bone', z + i * .01))
            out.append(Part(f'pbs{i}', T, Ellipse(3, -1, 2.4, 2.8), 'socket', z + i * .01 + .005, line=False))
        else:
            ca, sa = math.cos(math.radians(a)) * 14, math.sin(math.radians(a)) * 14
            r0, r1 = (8, 6) if i % 3 == 1 else (5, 4)
            out.append(Part(f'pl{i}', T, Capsule(-ca, -sa, ca, sa, r0, r1), 'limb' if i % 2 else 'flesh', z + i * .01))
    out.append(Part('pten', np.array([[1, 0, W / 2], [0, 1, G - 14], [0, 0, 1.0]]), Chain([(-60, 4), (-20, -10), (20, -4), (60, 6)], [1.4, 2, 2, 1.4]), 'tendon', z + .5, line=False))
    return out


def dust(t, x0, y0, n=8, spread=140, k=1.0, z=96):
    out = []
    for i in range(n):
        u = (i + .5) / n - .5
        r = (12 - 6 * abs(u)) * k * (0.8 + 0.4 * _hash(i, 3, 39))
        T = np.array([[1, 0, x0 + u * spread], [0, 1, y0 - r * .6], [0, 0, 1.0]])
        out.append(Part(f'du{i}', T, Ellipse(0, 0, r, r * .7), 'dust', z + i * .01, fx=True))
    return out


def F(P, t, ex=(), dim=False, diss=None, sway=1.0, hide=()):
    R.mats = M_DIM if dim else M
    img = R.render(P, chains_hang(P, t, sway) + list(ex), dissolve=diss, hide=hide)
    R.mats = M
    return img


REST = {'shN': -6, 'elbN': -10, 'shF': 6, 'elbF': -8}
ALL = None


def build():
    global ALL
    ALL = {p.name for p in R.parts}
    fr, S = [], {}
    def add(name, lst): S[name] = list(range(len(fr), len(fr) + len(lst))); fr.extend(lst)
    add('idle', [F(merge(REST, {'chest': (1.4 * s(i / 4), 0, -1.5 * s(i / 4)), 'halo': (3 * s(i / 4, .3), 0, 0), 'jaw': 4 + 3 * s(i / 4)}), i / 4, sway=.5) for i in range(4)])
    wk = []
    for i in range(6):
        t = i / 6
        P = merge(REST, {'hipN': -16 * s(t), 'kneeN': 18 * max(0, s(t, .6)), 'hipF': -16 * s(t, .5), 'kneeF': 18 * max(0, s(t, .1)),
                         'pelvis': (0, 0, -abs(4 * s(t)) + 2), 'chest': 3 * s(t, .25), 'shN': -6 + 14 * s(t, .5), 'shF': 6 + 14 * s(t), 'halo': (2 * s(t, .2), 0, 0), 'jaw': 6})
        wk.append(F(P, t))
    add('walk', wk)
    atk = []
    for i in range(4):  # levanta los brazos / golpea el piso y queda agachado
        if i < 2: k = (i + 1) / 2; P = merge(REST, {'shN': -6 - 110 * k, 'elbN': -10 - 20 * k, 'shF': 6 - 100 * k, 'elbF': -8 - 20 * k, 'chest': -12 * k, 'jaw': 6 + 10 * k, 'pelvis': (0, -3 * k, 0)}); ex = []
        else: P = merge(REST, {'shN': -40, 'elbN': -30, 'shF': -34, 'elbF': -30, 'chest': 26, 'pelvis': (0, 0, 12), 'hipN': -20, 'kneeN': 30, 'hipF': -14, 'kneeF': 26, 'jaw': 18}); ex = dust(i / 4, W // 2 + 70, G - 2, 8, 140, 1.2)
        atk.append(F(P, i / 4, ex, sway=1.5 if i >= 2 else .5))
    add('atk', atk)
    add('slam', [atk[0], atk[1], atk[1], atk[2], atk[3]])
    add('hit', [F(merge(REST, {'chest': -14, 'pelvis': (0, -6, 0), 'shN': 20, 'shF': 20, 'jaw': 16, 'halo': (-8, 0, 0)}), 0.1, sway=2),
                F(merge(REST, {'chest': -7, 'pelvis': (0, -3, 0), 'jaw': 10, 'halo': (-4, 0, 0)}), 0.3, sway=1.5)])
    dth = []
    for i in range(6):  # se desarma en cuerpos que caen y quedan en un montón
        k = i / 5
        P = merge(REST, {'pelvis': (0, 0, 40 * k), 'hipN': -60 * k, 'kneeN': 90 * k, 'hipF': -60 * k, 'kneeF': 90 * k, 'chest': 30 * k, 'shN': 30 * k, 'shF': 30 * k, 'jaw': 20})
        ex = corpses_pile(i / 6, 0.3 + 0.7 * k, 30 if k < 0.6 else 70) + dust(i / 6, W // 2, G - 2, 8, 220, 0.6 + k)
        dth.append(F(P, i / 6, ex, dim=i >= 3, diss=((k - 0.2) * 1.15, 111) if k > 0.2 else None))
    add('death', dth)
    pre = [R.render({}, corpses_pile(0, 1.0, 30), hide=ALL)]
    add('pre', pre)
    tf = []
    for i in range(4):  # un montón de cuerpos se levanta y toma forma
        k = (i + 1) / 4
        P = merge(REST, {'pelvis': (0, 0, 40 * (1 - k)), 'hipN': -60 * (1 - k), 'kneeN': 90 * (1 - k), 'hipF': -60 * (1 - k), 'kneeF': 90 * (1 - k), 'chest': 30 * (1 - k), 'jaw': 10 + 10 * k})
        ex = corpses_pile(i / 4, 1 - 0.7 * k, 70, rise=k)
        tf.append(F(P, i / 4, ex, diss=((1 - k) * 0.85, 112) if k < 1 else None))
    add('tf', tf)
    S['walk_down'] = S['walk']; S['walk_up'] = S['walk']
    return fr, S, {'anchor': round(G / H, 4), 'hMul': 3.0}
