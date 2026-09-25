"""Normalize extracted frames of one entity onto a shared canvas (cell-centre x, feet on a common
baseline at ANCHOR of the height) and pack them into a single grid atlas + JSON of named sets."""
import json, os, sys, math
import numpy as np
from PIL import Image

ANCHOR = 0.94

def feet_row(a):
    """lowest row with real body mass in the central half (ignores weapon tips out to the sides)"""
    H, W = a.shape
    band = a[:, W//4: W - W//4]
    rows = np.where(band.sum(1) >= 4)[0]
    if len(rows): return int(rows.max())
    return int(np.where(a.any(1))[0].max())

def build(src_dir, sets, out_png, ref_frame, pad=2):
    names = sorted({n for v in sets.values() for n in v})
    fr = {n: np.array(Image.open(os.path.join(src_dir, n + '.png')).convert('RGBA')) for n in names}
    info = {}
    for n, im in fr.items():
        op = im[..., 3] > 0
        ys, xs = np.where(op)
        cx = im.shape[1] / 2.0
        info[n] = dict(top=int(ys.min()), bot=int(ys.max()), left=int(xs.min()), right=int(xs.max()),
                       feet=feet_row(op), cx=cx)
    up = max(i['feet'] - i['top'] for i in info.values()) + pad        # rows above the feet line
    down = max(i['bot'] - i['feet'] for i in info.values()) + pad      # rows below (weapon tips, blood)
    half = max(max(i['cx'] - i['left'], i['right'] + 1 - i['cx']) for i in info.values()) + pad
    W = int(math.ceil(half * 2))
    H = max(int(math.ceil(up / ANCHOR)), up + down + 1)
    base = int(round(H * ANCHOR))
    if H - base < down: H = base + down + 1
    cols = min(8, len(names)); rows = math.ceil(len(names) / cols)
    atlas = Image.new('RGBA', (cols * W, rows * H), (0, 0, 0, 0))
    idx = {}
    for k, n in enumerate(names):
        i = info[n]; im = Image.fromarray(fr[n], 'RGBA')
        ox = int(round(W / 2 - i['cx'])); oy = base - i['feet']
        cell = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cell.alpha_composite(im, (ox, oy)) if ox >= 0 and oy >= 0 else cell.paste(im, (ox, oy), im)
        atlas.alpha_composite(cell, ((k % cols) * W, (k // cols) * H))
        idx[n] = k
    atlas.save(out_png, optimize=True)
    r = info[ref_frame]; refH = r['feet'] - r['top'] + 1
    return {'w': W, 'h': H, 'cols': cols, 'refH': refH, 'anchor': round(base / H, 4),
            'sets': {s: [idx[n] for n in v] for s, v in sets.items()}}

def seq(prefix, n): return [f'{prefix}_{i:02d}' for i in range(1, n + 1)]

CHAMP_SETS = lambda extra: dict({
    'idle_down': seq('idle', 4), 'idle_side': ['walk_right_01'], 'idle_left': ['walk_left_01'], 'idle_up': ['walk_up_01'],
    'walk_down': seq('walk_down', 4), 'walk_side': seq('walk_right', 4), 'walk_left': seq('walk_left', 4), 'walk_up': seq('walk_up', 4),
    'attack_side': seq('attack', 4), 'cast_side': seq('cast', 3), 'hit_down': seq('hit', 4), 'death_down': seq('death', 6)}, **extra)
