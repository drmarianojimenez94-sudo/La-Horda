"""Hoja de contacto para la revisión visual: cada cuadro recortado sobre magenta y sobre damero,
ampliado x3 sin suavizado. usage: python3 contact.py <frames_dir> <out.png> [escala]"""
import json, os, sys
from PIL import Image, ImageDraw


def checker(w, h, s=6):
    im = Image.new('RGB', (w, h), (200, 200, 200))
    d = ImageDraw.Draw(im)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2:
                d.rectangle([x, y, x + s - 1, y + s - 1], fill=(120, 120, 120))
    return im


def main(src, out, k=3, only=None):
    meta = json.load(open(os.path.join(src, 'meta.json')))
    rows = []
    for ent, secs in meta.items():
        if only and not ent.startswith(only):
            continue
        for sec, files in secs.items():
            ims = [Image.open(os.path.join(src, ent, f['file'])) for f in files]
            rows.append((f'{ent}/{sec}', ims))
    pad = 6
    W = max(sum(im.width * k + pad for im in ims) for _, ims in rows) + 140
    H = sum((max(im.height for im in ims) * k + pad) * 2 + 4 for _, ims in rows) + pad
    sheet = Image.new('RGB', (W, H), (30, 30, 30))
    d = ImageDraw.Draw(sheet)
    y = pad
    for label, ims in rows:
        rh = max(im.height for im in ims) * k
        for bg in ('mag', 'chk'):
            d.text((4, y + 4), label + (' ' if bg == 'mag' else ' (damero)'), fill=(255, 255, 255))
            x = 140
            for im in ims:
                big = im.resize((im.width * k, im.height * k), Image.NEAREST)
                base = Image.new('RGB', big.size, (255, 0, 255)) if bg == 'mag' else checker(*big.size)
                base.paste(big, (0, 0), big)
                sheet.paste(base, (x, y))
                x += big.width + pad
            y += rh + pad
        y += 4
    sheet.save(out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 3, sys.argv[4] if len(sys.argv) > 4 else None)
