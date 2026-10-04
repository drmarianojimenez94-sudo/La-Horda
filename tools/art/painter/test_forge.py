#!/usr/bin/env python3
"""Pruebas de la forja de elementos (tools/art/painter/forge.py).
  python3 tools/art/painter/test_forge.py            # rápidas: validación, gate negativo, ficha de punta a punta
  python3 tools/art/painter/test_forge.py --regress  # además repinta las 22 fichas instaladas y exige píxeles idénticos
"""
import json, sys, tempfile, subprocess
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import forge

checks = 0
def ok(cond, msg):
    global checks
    if not cond:
        raise SystemExit('FAIL ' + msg)
    checks += 1

MAT = {'m': {'ramp': ['#202030', '#606080', '#a0a0c0', '#e0e0ff']}}
def el(**kw):
    return {'name': 'prueba', 'layer': 'front', 'materials': MAT, 'shapes': [{'type': 'ellipse', 'at': 'chest', 'center': [0, 0], 'radius': [4, 4], 'material': 'm'}], **kw}

# 1) validación de la forma
ok(not forge.validate(el()), 'un elemento mínimo es válido')
ok(any('capa' in e for e in forge.validate(el(layer='encima'))), 'capa inexistente')
ok(any('tipo' in e for e in forge.validate(el(shapes=[{'type': 'estrella', 'material': 'm'}]))), 'tipo de forma inexistente')
ok(any('anclaje' in e for e in forge.validate(el(shapes=[{'type': 'ellipse', 'at': 'rodilla', 'center': [0, 0], 'radius': [2, 2], 'material': 'm'}]))), 'anclaje inexistente')
ok(any('3 tonos' in e for e in forge.validate(el(materials={'m': {'ramp': ['#000000', '#ffffff']}}))), 'rampa de 2 tonos')
ok(any('material' in e for e in forge.validate(el(shapes=[{'type': 'ellipse', 'center': [0, 0], 'radius': [2, 2], 'material': 'x'}]))), 'material inexistente')
ok(any('anclaje de punto' in e for e in forge.validate(el(shapes=[{'type': 'poly', 'points': [[0, 0], [2, 0, 'codo'], [0, 2]], 'material': 'm'}]))), 'anclaje de punto inexistente')

# 2) el gate rechaza lo que rompe el roster
ok(not forge.check_element(el(), donors=('sira',)), 'un emblema chico pasa')
huge = el(shapes=[{'type': 'ellipse', 'at': 'headTop', 'center': [0, -30], 'radius': [40, 20], 'material': 'm'}])
ok(any('fuera de la celda' in p for p in forge.check_element(huge, donors=('sira',))), 'detecta lo que sale de la celda')
low = el(shapes=[{'type': 'rect', 'at': 'feet', 'box': [-6, -2, 6, 6], 'material': 'm'}])
ok(any('línea de pies' in p for p in forge.check_element(low, donors=('sira',))), 'detecta lo que baja de los pies')
flat = el(materials={'m': {'ramp': ['#808080', '#808080', '#808080'], 'jitter': 0}}, shapes=[{'type': 'ellipse', 'at': 'chest', 'center': [0, 0], 'radius': [6, 6], 'material': 'm'}])
ok(any('plana' in p for p in forge.check_element(flat, donors=('sira',))), 'detecta la pintura plana')
side_only = el(views=['down', 'side', 'up'], shapes=[{'type': 'ellipse', 'at': 'chest', 'center': [0, 0], 'radius': [3, 3], 'material': 'm', 'views': ['side']}])
ok(not forge.check_element(side_only, donors=('sira',)), 'una forma solo de perfil no exige dibujar de frente')

# 3) la biblioteca entera pasa y cada plantilla de "new" también
lib, errs = forge.library()
ok(not errs, 'biblioteca sin errores: ' + '; '.join(errs))
ok(len(lib) >= 7, 'biblioteca base con al menos 7 elementos')
for k, t in forge.TEMPLATES.items():
    ok(not forge.check_element({'name': 'tpl_' + k, **t}, donors=('sira',)), f'plantilla {k} pasa el gate')

# 4) determinismo y uso desde una ficha del pintor (de punta a punta)
atlas, info = forge.base_sheet('sira')
a1 = forge.apply(atlas, info, {'element': 'corona_de_picos'}); a2 = forge.apply(atlas, info, {'element': 'corona_de_picos'})
ok((a1 == a2).all(), 'misma entrada, misma hoja')
ok((a1 != atlas).any(-1)[forge.CELL * 8:].sum() == 0, 'la fila de muerte queda sin elementos por defecto')
recol = forge.apply(atlas, info, {'element': 'corona_de_picos', 'materials': {'metal': {'ramp': ['#0a2a3a', '#1a6a8a', '#6ad0f0']}}})
ok((recol != a1).any(), 'las rampas se pueden cambiar desde la ficha (skins)')
with tempfile.TemporaryDirectory() as d:
    spec = {'id': 'prueba_forja', 'body': 'sira', 'accessories': [{'element': 'capa_larga'}, {'element': 'corona_de_picos', 'scale': 0.9}]}
    sp = Path(d) / 'prueba_forja.json'; sp.write_text(json.dumps(spec))
    r = subprocess.run([sys.executable, str(HERE / 'painter.py'), 'paint', str(sp), '--out', str(Path(d) / 'out')], capture_output=True, text=True)
    ok(r.returncode == 0, 'painter.py paint con elementos: ' + r.stderr[-400:])
    g = subprocess.run([sys.executable, str(HERE / 'style_gate.py'), str(Path(d) / 'out' / 'atlas.png')], capture_output=True, text=True)
    ok(g.returncode == 0, 'la hoja con elementos pasa el gate de estilo: ' + g.stdout[-300:])

# 5) regresión opcional: las hojas instaladas no cambian por la forja
if '--regress' in sys.argv:
    for p in sorted((HERE / 'specs').glob('*.json')):
        spec = json.loads(p.read_text()); inst = spec.get('install') or {}
        champ = inst.get('champion') or p.stem.split('_alt')[0]; pack = inst.get('pack') or p.stem
        dst = ROOT / 'assets/sprites/champions' / champ / (('skins/' + pack) if pack != champ else '') / 'atlas.png'
        if not dst.exists():
            continue
        with tempfile.TemporaryDirectory() as d:
            subprocess.run([sys.executable, str(HERE / 'painter.py'), 'paint', str(p), '--out', d], check=True, capture_output=True)
            ok((np.array(Image.open(Path(d) / 'atlas.png').convert('RGBA')) == np.array(Image.open(dst).convert('RGBA'))).all(), f'{p.stem}: idéntica a la instalada')

print(f'PASS forja de elementos: {checks} comprobaciones')
