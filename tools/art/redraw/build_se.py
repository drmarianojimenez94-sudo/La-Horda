#!/usr/bin/env python3
"""San Martín (key 'libertador') and Eren: sheet -> clean frames -> atlases + standalone FX PNGs.

  python3 tools/art/redraw/build_se.py          # rebuild and print the JS metadata

Same pipeline as build_all.py (extract.py + build_atlas.py). Frames that face LEFT on the sheet are
mirrored so every *_side set faces right (the engine mirrors side sets for the left). Frames missing on
the sheets are NOT invented (see docs/SANMARTIN_EREN.md): San Martín has no hit/death rows.
"""
import json, os, sys, tempfile, shutil
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
from extract import extract
from build_atlas import build, seq
from sheets_se import LIB, EREN

SRC = os.path.join(ROOT, 'art-source', 'redraw')
OUT = lambda *p: os.path.join(ROOT, 'assets', 'sprites', 'champions', *p)

def mirror(d, names):
    for n in names:
        p = os.path.join(d, n + '.png'); Image.open(p).transpose(Image.FLIP_LEFT_RIGHT).save(p)

LIB_BODY = {
  'idle_down': seq('idle', 4), 'idle_side': ['walk_right_01'], 'idle_left': ['walk_left_01'], 'idle_up': ['walk_up_01'],
  'walk_down': seq('walk_down', 4), 'walk_side': seq('walk_right', 4), 'walk_left': seq('walk_left', 4), 'walk_up': seq('walk_up', 4),
  'attack_side': seq('fire', 4), 'cast_side': seq('command', 3),
  'aim': seq('aim', 4), 'fire': seq('fire', 4), 'reload': seq('reload', 6),
  'bayo_pre': seq('bayo_pre', 4), 'bayo_emb': seq('bayo_emb', 4), 'bayo_imp': seq('bayo_imp', 4), 'bayo_rem': seq('bayo_rem', 4),
  'command': seq('command', 5), 'cabral': seq('cabral', 5), 'ult_cast': ['ult_01'],
}
LIB_HORSE = {'mount': seq('mount', 4), 'charge': seq('charge', 5), 'dismount': seq('dismount', 4),
             'm_idle': ['mounted_01'], 'm_atk': ['mounted_02', 'mounted_03', 'mounted_04'], 'm_run': ['mounted_05', 'charge_02', 'charge_03']}
LIB_FX = ['spectral_01','spectral_02','spectral_03','spectral_04','spectral_05','buff_icon_01','buff_icon_02','buff_icon_03','buff_icon_04',
          'shot_01','blood_01','blood_02','dust_01','dust_02','dust_03','frost_01','frost_02','smoke_04']

EREN_BODY = {
  'idle_down': seq('idle', 3), 'idle_side': ['walk_right_01'], 'idle_left': ['walk_left_01'], 'idle_up': ['walk_up_01'],
  'walk_down': seq('walk_down', 5), 'walk_side': seq('walk_right', 5), 'walk_left': seq('walk_left', 5), 'walk_up': seq('walk_up', 5),
  'run': seq('run', 4), 'attack_side': seq('attack', 4), 'cast_side': seq('aim', 3), 'aim': seq('aim', 3),
  'hit_down': seq('hit', 2), 'death_down': seq('death', 3),
  'hook_prep': seq('hook_prep', 2), 'hook_launch': ['hook_launch_01'], 'hook_fly': seq('hook_fly', 3),
  'hook_slash': seq('hook_slash', 2), 'hook_land': ['hook_land_01'],
  'instinct': seq('instinct', 4), 'advance': seq('advance', 3), 'bite': seq('bite', 4), 'exhausted': seq('exhausted', 3),
}
EREN_TITAN = {
  'idle_down': ['titan_01', 'titan_02'], 'walk_down': ['titan_01', 'titan_02'], 'walk_side': ['titan_03', 'titan_04', 'titan_05'],
  'walk_up': ['titan_06', 'titan_07', 'titan_08'], 'atk': seq('titan_atk', 3), 'sismo': seq('sismo', 4), 'terremoto': seq('terremoto', 4),
  'retumbar': seq('retumbar', 5), 'roar': ['roar_01'], 'tf': seq('tf', 6),
}
EREN_FX = ['fx_hook_01','fx_cable_01','fx_slash_01','fx_wind_01','fx_impact_01','fx_dust_l_01','fx_rocks_01','fx_crack_01','fx_crack_02','fx_crack_03',
           'fx_bolt_01','fx_bolt_02','fx_blood_01','fx_blood_02','fx_steam_01','fx_steam_02','fx_steam_03','fx_steam_04','step_01','step_02','step_03','shadows_01']

def fx_out(d, names, dest):
    os.makedirs(dest, exist_ok=True)
    for n in names:
        im = Image.open(os.path.join(d, n + '.png')); bb = im.getbbox()
        if bb: im = im.crop(bb)
        im.save(os.path.join(dest, n + '.png'), optimize=True)

def main():
    tmp = tempfile.mkdtemp(prefix='se_')
    L, E = os.path.join(tmp, 'lib'), os.path.join(tmp, 'eren')
    extract(os.path.join(SRC, 'libertador.png'), LIB, L, {'light_smear': True})
    extract(os.path.join(SRC, 'eren.png'), EREN, E, {'light_smear': True})
    # Eren: ataque básico y caminata lateral del titán miran a la izquierda en la hoja
    mirror(E, seq('attack', 4) + ['titan_03', 'titan_04', 'titan_05'])
    meta = {}
    for key, d, sets, ref, out in [
        ('libertador', L, LIB_BODY, 'walk_right_01', OUT('libertador', 'v2', 'atlas.png')),
        ('libertador_horse', L, LIB_HORSE, 'mounted_01', OUT('libertador', 'v2', 'horse.png')),
        ('eren', E, EREN_BODY, 'walk_right_01', OUT('eren', 'v2', 'atlas.png')),
        ('eren_titan', E, EREN_TITAN, 'titan_01', OUT('eren', 'v2', 'titan.png'))]:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        meta[key] = build(d, sets, out, ref)
    fx_out(L, LIB_FX, OUT('libertador', 'v2', 'fx'))
    fx_out(E, EREN_FX, OUT('eren', 'v2', 'fx'))
    shutil.rmtree(tmp)
    for k, m in meta.items(): print(k, json.dumps(m, separators=(',', ':')))

if __name__ == '__main__':
    main()
