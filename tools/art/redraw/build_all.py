#!/usr/bin/env python3
"""
Redraw pipeline (LA HORDA VISUAL GATE, see docs/ART_BIBLE.md): source sheet -> clean frames -> atlas.

  python3 tools/art/redraw/build_all.py            # rebuild every atlas + print the JS metadata

Source sheets live in art-source/redraw/ (never loaded by the game). Cell coordinates per sheet are in
sheets.py; extract.py removes the baked checkerboard/labels/dividers (never touches interior colour);
build_atlas.py puts every frame of an entity on one shared canvas with the feet on a common line.
After rebuilding, paste the printed metadata into js/assets/champion-sprites.js (champPackLoadAtlas)
and js/assets/enemy-sprites.js (enemyAtlasPackLoad) if frame sizes changed. Always re-run
tools/art/roster_visual_test.js and look at the result before integrating (the Gate is a human call).
"""
import json, os, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
from extract import extract
from sheets import BODY
from build_atlas import build, seq, CHAMP_SETS

SRC = os.path.join(ROOT, 'art-source', 'redraw')
CHAMPS = {'segador': 'segador_olvidado.png', 'musashi': 'musashi.png', 'profeta': 'la_profeta.png', 'cazadora': 'la_cazadora.png'}
# forest sheet: code id -> sheet block (mapped by real mechanics, not by the sheet titles)
FOREST = {'dama_bosque': 'dama', 'doblador_guerrero': 'dop_caballero', 'doblador_picaro': 'dop_guerrero',
          'doblador_arquera': 'dop_arquero', 'doblador_clerigo': 'dop_soporte'}
FOREST_OPTS = {'pocket_min': 10, 'grey_specks': True, 'pocket_tol': 9, 'pocket_std': 9, 'pocket_sd': 10}

def main():
    tmp = tempfile.mkdtemp(prefix='redraw_')
    meta = {}
    for key, sheet in CHAMPS.items():
        d = os.path.join(tmp, key)
        extract(os.path.join(SRC, sheet), BODY[key], d, {'light_smear': key == 'cazadora'})
        out = os.path.join(ROOT, 'assets', 'sprites', 'champions', key, 'v2', 'atlas.png'); os.makedirs(os.path.dirname(out), exist_ok=True)
        meta[key] = build(d, CHAMP_SETS({'aim': ['pose_01']} if key == 'cazadora' else {}), out, 'walk_right_01')
    for t, block in FOREST.items():
        d = os.path.join(tmp, block)
        extract(os.path.join(SRC, 'dama_bosque_doppelgangers.png'), BODY[block], d, FOREST_OPTS)
        sets = {'idle': seq('idle', 4), 'walk': seq('walk', 4), 'atk': seq('attack', 4),
                'hit': seq('hit', 4) if t == 'dama_bosque' else ['idle_01'], 'death': seq('death', 6 if t == 'dama_bosque' else 4)}
        sub = 'enemies' if t == 'dama_bosque' else 'bosses'
        out = os.path.join(ROOT, 'assets', 'sprites', sub, 'bosque', t, 'v2', 'atlas.png'); os.makedirs(os.path.dirname(out), exist_ok=True)
        meta[t] = build(d, sets, out, 'idle_01')
    for k, m in meta.items(): print(k, json.dumps(m, separators=(',', ':')))

if __name__ == '__main__':
    main()
