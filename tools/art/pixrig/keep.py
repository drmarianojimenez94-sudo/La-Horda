"""Claves redibujadas con pixrig (tools/art/pixrig/<clave>.py). Los extractores de arena (tools/art/<arena>/extract.py)
las saltean: no pisan su atlas.png ni su entrada en js/assets/<arena>-meta.js con el arte viejo de las hojas fuente."""
import json, os, re
PIXRIG_KEYS = {'mn_cerbero', 'mn_titan', 'cm_presentador', 'cm_presentador2', 'cm_presentador3', 'cm_maestro',
               'cm_tramoyista', 'cm_dama', 'ab_carcelero'}
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


def pixrig_keep(meta_file, const, ent):
    txt = open(os.path.join(ROOT, meta_file), encoding='utf-8').read()
    m = re.search(r'const\s+' + const + r'\s*=\s*(\{.*?\});\s*$', txt, re.S | re.M)
    return json.loads(m.group(1))[ent]
