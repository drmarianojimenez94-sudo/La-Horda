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
def _std(extra=None):
    return CHAMP_SETS(extra or {})
# The Nigromante sheet labels its walk rows wrongly: frames are re-sorted by the direction they really face
# (izquierda 2-4 face right, derecha 2-4 face left, arriba = 3/4 back views facing either side).
NIGRO_SETS = {
    'idle_down': seq('idle', 4), 'idle_side': ['walk_left_02'], 'idle_left': ['walk_right_02'], 'idle_up': ['walk_up_01'],
    'walk_down': seq('walk_down', 5),
    'walk_side': ['walk_left_02', 'walk_left_03', 'walk_left_04'],
    'walk_left': ['walk_right_02', 'walk_right_03', 'walk_right_04'],
    'walk_up': ['walk_up_01', 'walk_up_02', 'walk_up_05'], 'walk_up_left': ['walk_up_03', 'walk_up_04'],
    'attack_side': seq('attack', 4), 'cast_side': seq('cast', 4), 'hit_down': seq('hit', 4),
    'death_down': seq('death', 6), 'ult': seq('ult', 4)}
# key: (sheet, extract opts, sets, reference frame for body height)
CHAMPS = {
    'segador':  ('segador_olvidado.png', {}, _std(), 'walk_right_01'),
    'musashi':  ('musashi.png', {}, _std(), 'walk_right_01'),
    'profeta':  ('la_profeta.png', {}, _std(), 'walk_right_01'),
    'cazadora': ('la_cazadora.png', {'light_smear': True}, _std({'aim': ['pose_01']}), 'walk_right_01'),
    'axiom':    ('axiom.png', {'pocket_min': 90, 'light_smear': True, 'protect_light': True, 'violet_glow': True}, _std(), 'walk_right_01'),
    'nigromante': ('nigromante.png', {'teal_glow': True, 'light_smear': True}, NIGRO_SETS, 'walk_left_02'),
}
SKEL_SETS = {'warrior_idle': ['warrior_02'], 'warrior_walk': ['warrior_02', 'warrior_03'], 'warrior_atk': ['warrior_01'],
             'mage_idle': ['mage_02'], 'mage_walk': ['mage_02', 'mage_03'], 'mage_atk': ['mage_01']}
# forest sheet: code id -> sheet block (mapped by real mechanics, not by the sheet titles)
FOREST = {'dama_bosque': 'dama', 'doblador_guerrero': 'dop_caballero', 'doblador_picaro': 'dop_guerrero',
          'doblador_arquera': 'dop_arquero', 'doblador_clerigo': 'dop_soporte'}
FOREST_OPTS = {'pocket_min': 10, 'grey_specks': True, 'pocket_tol': 9, 'pocket_std': 9, 'pocket_sd': 10}

def main():
    tmp = tempfile.mkdtemp(prefix='redraw_')
    meta = {}
    for key, (sheet, opts, sets, ref) in CHAMPS.items():
        d = os.path.join(tmp, key)
        extract(os.path.join(SRC, sheet), BODY[key], d, opts)
        out = os.path.join(ROOT, 'assets', 'sprites', 'champions', key, 'v2', 'atlas.png'); os.makedirs(os.path.dirname(out), exist_ok=True)
        meta[key] = build(d, sets, out, ref)
    d = os.path.join(tmp, 'nigro_skel')
    extract(os.path.join(SRC, 'nigromante.png'), BODY['nigro_skel'], d, {'teal_glow': True, 'light_smear': True, 'protect_light': True})
    out = os.path.join(ROOT, 'assets', 'sprites', 'champions', 'nigromante', 'skeleton', 'v2', 'atlas.png'); os.makedirs(os.path.dirname(out), exist_ok=True)
    meta['nigro_skel'] = build(d, SKEL_SETS, out, 'warrior_02')
    for t, block in FOREST.items():
        d = os.path.join(tmp, block)
        opts = dict(FOREST_OPTS, kill_mid_grey=block.startswith('dop_'), mid_grey_sd=34 if block == 'dop_arquero' else 24)
        extract(os.path.join(SRC, 'dama_bosque_doppelgangers.png'), BODY[block], d, opts)
        sets = {'idle': seq('idle', 4), 'walk': seq('walk', 4), 'atk': seq('attack', 4),
                'hit': seq('hit', 4) if t == 'dama_bosque' else ['idle_01'], 'death': seq('death', 6 if t == 'dama_bosque' else 4)}
        sub = 'enemies' if t == 'dama_bosque' else 'bosses'
        out = os.path.join(ROOT, 'assets', 'sprites', sub, 'bosque', t, 'v2', 'atlas.png'); os.makedirs(os.path.dirname(out), exist_ok=True)
        meta[t] = build(d, sets, out, 'idle_01')
    for k, m in meta.items(): print(k, json.dumps(m, separators=(',', ':')))

if __name__ == '__main__':
    main()
