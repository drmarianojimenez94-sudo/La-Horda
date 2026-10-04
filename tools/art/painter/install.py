#!/usr/bin/env python3
"""Instala en el juego una hoja del pintor (tools/art/painter/out/<id>/atlas.png).

  python3 tools/art/painter/install.py <id> [<id> ...]

- La ficha (specs/<id>.json) dice dónde va: "install": {"champion": "aurelia", "pack": "aurelia"}
  (pack = id del atlas en el juego; para skins, "<campeón>_altN").
- Exige que la hoja pase el gate de estilo (style_gate.py). Si no pasa, no instala nada.
- Copia atlas y vista previa a assets/sprites/champions/<campeón>/[skins/<pack>/] y reescribe la línea de
  js/champions/ascension/art.js con el metadato del DONANTE de cuerpo (poses por fila y altura de referencia),
  porque las poses y la escala son las suyas.
- Registra lo hecho en docs/art-gate/painter-installs.json. Después hay que normalizar la escala con
  `node tools/art/roster_gate.js --write` y verificar con `node tools/art/roster_gate.js`.
"""
import json, re, sys, shutil, subprocess, datetime
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
ART_JS = ROOT / 'js/champions/ascension/art.js'
EXP_ART_JS = ROOT / 'js/champions/expedition/art.js'


def donor_meta(donor_key):
    """Metadato (refH, sets...) con el que el juego carga la hoja del donante."""
    src = EXP_ART_JS.read_text()
    m = re.search(r'champPackLoadAtlas\("' + re.escape(donor_key) + r'","[^"]+",(\{.*?\})\);', src)
    if not m:
        raise SystemExit(f'sin metadato para el donante {donor_key} en {EXP_ART_JS}')
    return json.loads(m.group(1))


def install(pid):
    spec = json.loads((HERE / 'specs' / (pid + '.json')).read_text())
    inst = spec.get('install') or {}
    champ = inst.get('champion') or pid.split('_alt')[0]
    pack = inst.get('pack') or pid
    out = HERE / 'out' / pid / 'atlas.png'
    if not out.exists():
        raise SystemExit(f'{pid}: falta {out}; pintalo primero (painter.py paint)')
    g = subprocess.run([sys.executable, str(HERE / 'style_gate.py'), str(out)], capture_output=True, text=True)
    if g.returncode != 0:
        print(g.stdout.strip())
        raise SystemExit(f'{pid}: NO pasa el gate de estilo; no se instala')
    dest = ROOT / 'assets/sprites/champions' / champ
    if pack != champ:
        dest = dest / 'skins' / pack
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(out, dest / 'atlas.png')
    a = Image.open(out).convert('RGBA')
    a.crop((0, 0, 112, 112)).save(dest / 'preview.png')
    meta = donor_meta(spec['body'])
    meta['fix'] = meta.get('fix') or {'left': 'mirror'}
    rel = str((dest / 'atlas.png').relative_to(ROOT))
    line = 'champPackLoadAtlas("%s","%s",%s);' % (pack, rel, json.dumps(meta, separators=(',', ':')))
    src = ART_JS.read_text()
    pat = re.compile(r'champPackLoadAtlas\("' + re.escape(pack) + r'",[^\n]*\);')
    if pat.search(src):
        src = pat.sub(lambda _: line, src)
    else:
        src = src.rstrip('\n') + '\n' + line + '\n'
    ART_JS.write_text(src)
    log_path = ROOT / 'docs/art-gate/painter-installs.json'
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    log[pack] = {'champion': champ, 'spec': f'tools/art/painter/specs/{pid}.json', 'body': spec['body'], 'head': spec.get('head'),
                 'styleGate': 'PASS', 'date': datetime.date.today().isoformat()}
    log_path.write_text(json.dumps(log, indent=1, ensure_ascii=False) + '\n')
    print(f'instalado {pack} -> {rel} (metadato de {spec["body"]})')


if __name__ == '__main__':
    for pid in sys.argv[1:]:
        install(pid)
