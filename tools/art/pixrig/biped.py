"""Esqueleto bípedo de perfil (mirando a la derecha) para los jefes humanoides de pixrig.
Convención de ángulos: positivo = horario en pantalla. Un miembro que cuelga hacia abajo con ángulo NEGATIVO va hacia
adelante (derecha); la rodilla y el codo se doblan con ángulo POSITIVO (pierna) / NEGATIVO (brazo hacia adelante)."""
import math


def make_biped(R, x, ground, d):
    """d: thigh, shin, foot, torso, neck, upper, fore, hip_w, sh_w (separación lejano/cercano)."""
    leg = d['thigh'] + d['shin'] + d.get('foot', 0)
    R.bone('root', None, (x, ground))
    R.bone('pelvis', 'root', (0, -leg))
    R.bone('chest', 'pelvis', (0, -d['torso'] * 0.55))
    R.bone('neck', 'chest', (d.get('neck_x', 2), -d['torso'] * 0.45))
    R.bone('head', 'neck', (1, -d['neck']))
    for side, sgn in (('N', 1), ('F', -1)):
        R.bone('hip' + side, 'pelvis', (sgn * d.get('hip_w', 2), 0))
        R.bone('knee' + side, 'hip' + side, (0, d['thigh']))
        R.bone('foot' + side, 'knee' + side, (0, d['shin']))
        R.bone('sh' + side, 'chest', (sgn * d.get('sh_w', 2), -d['torso'] * 0.32))
        R.bone('elb' + side, 'sh' + side, (0, d['upper']))
        R.bone('hand' + side, 'elb' + side, (0, d['fore']))


def s(t, ph=0.0): return math.sin(2 * math.pi * (t + ph))


def walk(t, amp=1.0, bob=2.0, arm=1.0, lean=0.0):
    P = {}
    for side, ph in (('N', 0.0), ('F', 0.5)):
        P['hip' + side] = -24 * amp * s(t, ph)
        P['knee' + side] = 30 * amp * max(0, s(t, ph + 0.62))
        P['foot' + side] = -10 * amp * max(0, s(t, ph + 0.1))
        P['sh' + side] = 20 * amp * arm * s(t, ph)
        P['elb' + side] = -18 * amp * arm * max(0, -s(t, ph))
    P['pelvis'] = (lean * 0.3, 0, -abs(bob * math.cos(2 * math.pi * t * 2) * 0.5) + bob * 0.25)
    P['chest'] = lean
    P['head'] = -lean * 0.6
    return P


def breathe(t, amp=1.0):
    return {'chest': (0.6 * amp * s(t), 0, -0.6 * amp * s(t)), 'head': 1.2 * amp * s(t, 0.15),
            'shN': 2 * amp * s(t, 0.1), 'shF': -2 * amp * s(t, 0.1)}


def merge(*ps):
    out = {}
    for p in ps:
        for k, v in p.items():
            if k in out and not isinstance(v, (tuple, dict)) and not isinstance(out[k], (tuple, dict)):
                out[k] = out[k] + v
            else:
                out[k] = v
    return out
