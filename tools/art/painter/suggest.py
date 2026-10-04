#!/usr/bin/env python3
"""Pedido en palabras -> ficha borrador del pintor.

  python3 tools/art/painter/suggest.py <id> "mago con capa roja que tira fuego, pelo blanco" [--mujer|--hombre]

Elige cuerpo y cabeza entre los donantes encargados por sus etiquetas (donors.json: look/tags/gender), arma las
rampas de color a partir de las palabras de color (capa roja, pelo blanco, oro...) y escribe
tools/art/painter/specs/<id>.json. Es un BORRADOR: después se pinta, se mira y se ajusta (docs/production/PAINTER.md).
"""
import json, re, sys, unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent

# rampas (oscuro -> claro) con contraste moderado: pasan el gate de estilo
COLORS = {
    'rojo': ['#3a0a0e', '#7a1620', '#b8323a', '#e0646a'], 'carmesi': ['#2e060c', '#6a1020', '#a52032', '#d8505c'],
    'granate': ['#24060a', '#521018', '#7e1e2a', '#ac3c48'], 'rosa': ['#5a2032', '#a04a64', '#d880a0', '#f4b8cc'],
    'naranja': ['#4a1a06', '#9a4210', '#e07a24', '#f8b064'], 'fuego': ['#4a1006', '#a8320c', '#f07a1c', '#ffd070'],
    'oro': ['#4a3008', '#9a7020', '#d8ac40', '#f6dc88'], 'dorado': ['#4a3008', '#9a7020', '#d8ac40', '#f6dc88'],
    'amarillo': ['#5a4a10', '#a89028', '#e6cc48', '#fff0a0'], 'rubio': ['#6a4512', '#b8862e', '#dcb04e', '#f9e6aa'],
    'verde': ['#0e2a14', '#1f5a2c', '#3e9a4c', '#86d088'], 'esmeralda': ['#062a1e', '#0e5a3e', '#20946a', '#64d0a4'],
    'turquesa': ['#06302e', '#0e6660', '#20a89c', '#78e0d4'], 'agua': ['#082640', '#145a7a', '#2a9ab8', '#8adcec'],
    'azul': ['#0a1638', '#1a2f74', '#3654b4', '#7c9ae6'], 'celeste': ['#1a3450', '#3a6a96', '#6aa4d4', '#b4dcf6'],
    'violeta': ['#1e0a30', '#43196a', '#7a3aa8', '#b884de'], 'purpura': ['#24082a', '#4e1458', '#86308e', '#c070c4'],
    'negro': ['#0c0a10', '#1e1a24', '#34303c', '#56505e'], 'gris': ['#26262c', '#4c4c54', '#7a7a84', '#b0b0b8'],
    'plata': ['#3a3e48', '#6c7280', '#a4acb8', '#dde2ea'], 'blanco': ['#5c5a60', '#9c9aa2', '#d6d4da', '#f8f6fa'],
    'marfil': ['#6b5e46', '#b5a582', '#ddd1b2', '#f3ead3'], 'marron': ['#2a1608', '#5a3216', '#8a5428', '#bc8450'],
    'castano': ['#2a1608', '#5a3216', '#8a5428', '#bc8450'], 'bronce': ['#3a2008', '#7a4a18', '#b47a34', '#e0b070'],
    'hielo': ['#26405a', '#5a86a8', '#9ac4e0', '#e0f4ff'], 'sombra': ['#08060c', '#1a1422', '#2e2440', '#4a3c62'],
}
PARTS = {'pelo': 'head', 'cabello': 'head', 'melena': 'head', 'capucha': 'head', 'casco': 'head', 'gorro': 'head',
         'capa': 'body', 'manto': 'body', 'tunica': 'body', 'armadura': 'body', 'vestido': 'body', 'abrigo': 'body', 'ropa': 'body', 'traje': 'body'}
SYN = {'mago': 'maga', 'maga': 'maga', 'curandero': 'sanadora', 'sanador': 'sanadora', 'arquero': 'tiradora', 'tirador': 'tiradora',
       'ballestero': 'ballesta', 'espada': 'cuchilla', 'hacha': 'cuchilla', 'baston': 'bastón', 'cetro': 'baculo', 'llave': 'baculo',
       'tanque': 'tanque', 'guerrero': 'fuerte', 'asesino': 'asesino', 'asesina': 'asesino', 'garras': 'garras', 'dagas': 'dagas'}


def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def main_hue(atlas):
    import numpy as np, cv2
    from PIL import Image
    a = np.array(Image.open(HERE.parents[2] / atlas).convert('RGBA'))[:112 * 3]
    m = a[:, :, 3] > 0
    lab = cv2.cvtColor(a[:, :, :3], cv2.COLOR_RGB2LAB).astype(np.float32)[m]
    A, B = lab[:, 1] - 128, lab[:, 2] - 128
    c = np.hypot(A, B); h = (np.degrees(np.arctan2(B, A)) % 360)
    sel = (c > 14) & ~((h > 30) & (h < 82) & (lab[:, 0] > 120))  # sin piel
    hist = np.bincount((h[sel] // 10).astype(int), minlength=36)
    return int(np.argmax(hist) * 10 + 5)


def suggest(pid, prompt, gender=None):
    D = json.loads((HERE / 'donors.json').read_text())
    words = re.findall(r'[a-zñ]+', norm(prompt))
    keys = set(words) | {SYN[w] for w in words if w in SYN}
    if gender is None:
        gender = 'mujer' if any(w in words for w in ('maga', 'reina', 'ella', 'mujer', 'asesina', 'sanadora', 'portera', 'arquitecta')) else \
                 'hombre' if any(w in words for w in ('mago', 'rey', 'el', 'hombre', 'asesino', 'guerrero')) else None

    def score(k, want_body):
        d = D[k]
        s = sum(2 for t in d.get('tags', []) if norm(t) in keys)
        s += sum(1 for w in words if w in norm(d.get('look', '')))
        if gender and d.get('gender') == gender:
            s += 3 if not want_body else 1
        return s
    body = max(D, key=lambda k: (score(k, True), -len(k)))
    heads = [k for k in D if D[k]['champion'] != D[body]['champion']]
    head = max(heads, key=lambda k: (score(k, False), -len(k)))
    # colores: "capa roja" -> parte + color; colores sueltos -> cuerpo
    paint = []
    for i, w in enumerate(words):
        col = next((c for c in COLORS if w == c or (len(w) >= 4 and w[:-1] == c[:-1] and w[-1] in 'aos') or (len(w) > 5 and w[:5] == c[:5])), None)
        if not col or col == 'fuego':  # "tira fuego" es un efecto (VFX), no el color de la ropa
            continue
        part = None
        for j in (i - 1, i - 2, i + 1):
            if 0 <= j < len(words) and words[j] in PARTS:
                part = PARTS[words[j]]
        rule = {'part': part or 'body', 'ramp': COLORS[col]}
        if rule['part'] == 'head':
            rule.update({'hue': [0, 360], 'minChroma': 0, 'noSkin': True})
        else:
            # la ropa principal del cuerpo: el tono cromático más común del donante (±40°)
            h = main_hue(D[body]['atlas'])
            rule.update({'hue': [(h - 40) % 360, (h + 40) % 360], 'minChroma': 12, 'noSkin': True})
        paint.append(rule)
    spec = {'id': pid, 'prompt': prompt, 'body': body, 'head': head, 'paint': paint or [{'part': 'body', 'hue': [0, 360], 'minChroma': 14, 'ramp': COLORS['gris']}],
            'install': {'champion': pid.split('_alt')[0], 'pack': pid},
            'notes': 'BORRADOR de suggest.py: pintar, mirar sheet.png, ajustar reglas (hue/materialsOf/part) y accesorios.'}
    out = HERE / 'specs' / (pid + '.json')
    out.write_text(json.dumps(spec, indent=1, ensure_ascii=False) + '\n')
    return spec, out


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    g = 'mujer' if '--mujer' in sys.argv else 'hombre' if '--hombre' in sys.argv else None
    spec, out = suggest(sys.argv[1], sys.argv[2], g)
    print(json.dumps({'spec': str(out), 'body': spec['body'], 'head': spec['head'], 'rules': len(spec['paint'])}, ensure_ascii=False))
