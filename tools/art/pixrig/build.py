"""Arma el atlas de un jefe dibujado con pixrig y actualiza su entrada en el archivo de metadatos del juego.
Uso (desde la raíz del repo):  python3 tools/art/pixrig/build.py mn_cerbero [--preview out.png]
Cada módulo define build() -> (cuadros, sets, {'anchor':..}) y TARGET = (archivo_meta, nombre_const, clave, ruta_png).
refH = alto real del cuerpo medido en los cuadros de 'idle' (sin VFX sueltos): es lo que el juego usa para la escala
(s = radio·hMul / refH), así que el personaje ocupa en pantalla lo mismo que antes, con más píxeles de arte."""
import sys, os, json, re, importlib
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from PIL import Image
from pixrig import atlas, preview

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))


def body_height(frames, idxs):
    hs = []
    for i in idxs:
        a = frames[i].getchannel('A').point(lambda v: 255 if v > 0 else 0)
        bb = a.getbbox()
        if bb: hs.append(bb[3] - bb[1])
    hs.sort(); return hs[len(hs) // 2]


def update_meta(meta_file, const, key, src, meta, extra=None):
    path = os.path.join(ROOT, meta_file); txt = open(path, encoding='utf-8').read()
    m = re.search(r'(const\s+' + const + r'\s*=\s*)(\{.*?\})(;\s*$)', txt, re.S | re.M)
    if not m: raise SystemExit('no encuentro ' + const + ' en ' + meta_file)
    data = json.loads(m.group(2))
    entry = data.get(key, {}); entry['src'] = src; entry['meta'] = meta
    if extra: entry.update(extra)
    entry['pixrig'] = True
    data[key] = entry
    out = txt[:m.start(2)] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + txt[m.end(2):]
    open(path, 'w', encoding='utf-8').write(out)


def build_one(key, frames, sets, info, target, prev=None):
    A, w, h = atlas(frames)
    png = os.path.join(ROOT, target['png'])
    os.makedirs(os.path.dirname(png), exist_ok=True)
    A.save(png, optimize=True)
    A.save(png[:-4] + '.webp', lossless=True, quality=100, method=6)
    refH = info.get('refH') or body_height(frames, sets[info.get('ref_set', 'idle')])
    meta = {'w': w, 'h': h, 'cols': 8, 'refH': refH, 'anchor': info['anchor'], 'sets': sets}
    if info.get('hMul'): meta['hMul'] = info['hMul']
    if 'meta_file' in target:
        update_meta(target['meta_file'], target['const'], target.get('key', key), target['png'], meta, target.get('extra'))
    if prev: preview(frames, 2).save(prev.replace('.png', '_' + key + '.png'))
    print(json.dumps({'key': key, 'frames': len(frames), 'cell': [w, h], 'refH': refH, 'hMul': info.get('hMul'), 'atlas': list(A.size), 'png_kb': os.path.getsize(png) // 1024}))
    return meta


def main():
    mod = importlib.import_module(sys.argv[1])
    prev = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    if hasattr(mod, 'BUILDS'):
        for key, fn in mod.BUILDS:
            if only and key not in only: continue
            frames, sets, info, target = fn()
            build_one(key, frames, sets, info, target, prev)
    else:
        frames, sets, info = mod.build()
        build_one(sys.argv[1], frames, sets, info, mod.TARGET, prev)


if __name__ == '__main__':
    main()
