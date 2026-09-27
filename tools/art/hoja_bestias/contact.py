"""Hoja de contacto para la COMPUERTA VISUAL: cada cuadro recortado sobre magenta y sobre damero,
ampliado x3 (vecino más cercano) y con su nombre. Sirve tanto para los cuadros sueltos de extract.py
como para los atlas finales.
usage: python3 contact.py <frames_dir> <out.png> [entidad,...]
       python3 contact.py --atlas <out.png> <atlas.png> [<atlas.png> ...]
"""
import json, os, sys
from PIL import Image, ImageDraw

Z = 3
def checker(w, h, s=6):
    im = Image.new('RGBA', (w, h), (200, 200, 200, 255)); d = ImageDraw.Draw(im)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2: d.rectangle([x, y, x + s - 1, y + s - 1], fill=(120, 120, 120, 255))
    return im

def tile(fr, label):
    w, h = fr.width * Z, fr.height * Z
    big = fr.resize((w, h), Image.NEAREST)
    t = Image.new('RGBA', (w * 2 + 12, h + 16), (20, 20, 28, 255))
    mg = Image.new('RGBA', (w, h), (255, 0, 255, 255)); mg.alpha_composite(big)
    ck = checker(w, h); ck.alpha_composite(big)
    t.paste(mg, (0, 16)); t.paste(ck, (w + 12, 16))
    ImageDraw.Draw(t).text((2, 2), label, fill=(255, 255, 120, 255))
    return t

def rows_to_sheet(rows, out):
    W = max(sum(t.width + 8 for t in r) for r in rows); H = sum(max(t.height for t in r) + 8 for r in rows)
    sh = Image.new('RGBA', (W, H), (10, 10, 14, 255)); y = 0
    for r in rows:
        x = 0
        for t in r: sh.paste(t, (x, y)); x += t.width + 8
        y += max(t.height for t in r) + 8
    sh.save(out); print(out, sh.size)

if __name__ == '__main__':
    if sys.argv[1] == '--atlas':
        rows = [[tile(Image.open(p).convert('RGBA'), os.path.basename(os.path.dirname(os.path.dirname(p))) + '/' + os.path.basename(os.path.dirname(p)))] for p in sys.argv[3:]]
        rows_to_sheet(rows, sys.argv[2]); sys.exit()
    fd, out = sys.argv[1], sys.argv[2]
    meta = json.load(open(os.path.join(fd, 'meta.json')))
    only = sys.argv[3].split(',') if len(sys.argv) > 3 else list(meta)
    rows = []
    for ent in only:
        for sec, fl in meta[ent].items():
            rows.append([tile(Image.open(os.path.join(fd, ent, f['file'])), f'{ent}/{sec}_{i}') for i, f in enumerate(fl)])
    rows_to_sheet(rows, out)
