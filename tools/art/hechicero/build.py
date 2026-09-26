"""Arma los assets del Hechicero Supremo desde los cuadros de extract.py.
- hechicero/atlas.png: idle 4, caminar 12, conjuro 8, básico, daño 5, muerte 6 (celdas uniformes, pies abajo).
- golem/atlas.png: las 3 formas del Golem de Cuerpos + las 3 fases de la transformación.
- fx/*.png: orbe, pilares, juicio, meteoros y habilidades del golem.
- portrait.png: el Hechicero de frente (para la pantalla previa y el panel del tutorial).
Imprime la metadata para enemyAtlasPackLoad. usage: python3 build.py <frames_dir> <assets_dir>"""
import json, os, sys
from PIL import Image

def load(d, n): return Image.open(os.path.join(d, n)).convert('RGBA')

def pack(frames, cols):
    w = max(f.width for f in frames); h = max(f.height for f in frames)
    rows = (len(frames) + cols - 1) // cols
    atlas = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        x = (i % cols) * w + (w - f.width) // 2; y = (i // cols) * h + (h - f.height)
        atlas.alpha_composite(f, (x, y))
    return atlas, w, h

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    meta = json.load(open(os.path.join(src, 'meta.json')))
    F = lambda sec: [load(src, m['file']) for m in meta[sec]]
    os.makedirs(os.path.join(out, 'fx'), exist_ok=True)
    # ---- Hechicero ----
    idle, walk, cast, basic, hurt, death = F('idle'), F('walk'), F('cast'), F('basic'), F('hurt'), F('death')
    figs = idle[:4] + walk + cast + [basic[0], basic[3], basic[4], basic[5]] + hurt + death
    atlas, w, h = pack(figs, 8)
    atlas.save(os.path.join(out, 'atlas.png'), optimize=True)
    i = 0; sets = {}
    for k, n in [('idle', 4), ('walk', 12), ('cast', 8), ('atk', 4), ('hit', 5), ('death', 6)]:
        sets[k] = list(range(i, i + n)); i += n
    refH = sorted(f.height for f in idle[:4])[1]
    hm = {"w": w, "h": h, "cols": 8, "refH": refH, "anchor": round((h - 2) / h, 4), "sets": sets}
    # ---- Golem de Cuerpos ----
    gol, ph = F('golem'), F('golem_ph')
    gatlas, gw, gh = pack(gol + ph + [idle[0]], 3)   # el 6 es el Hechicero: arranque de la transformación
    os.makedirs(os.path.join(out, 'golem'), exist_ok=True)
    gatlas.save(os.path.join(out, 'golem', 'atlas.png'), optimize=True)
    gm = {"w": gw, "h": gh, "cols": 3, "refH": gol[1].height, "anchor": round((gh - 2) / gh, 4),
          "sets": {"idle": [1, 0], "walk": [1, 0], "atk": [2], "slam": [2], "hit": [1], "tf": [3, 4, 5], "pre": [6], "death": [2, 5, 4, 3]}}
    # ---- efectos ----
    fx = {'orb_small': ('orb', 4), 'orb_trail': ('orb', 6), 'orb_burst': ('orb', 7),
          'pillar_a': ('pillars', 4), 'pillar_b': ('pillars', 5), 'pillar_c': ('pillars', 6),
          'judg_ring': ('judgment', 2), 'judg_sigil': ('judgment', 3),
          'meteor_a': ('meteors_fx', 0), 'meteor_b': ('meteors_fx', 1), 'meteor_hit': ('meteors_fx', 2),
          'bolt': ('basic', 2), 'corpse_storm': ('golem_sk', 0), 'corpse_hand': ('golem_sk', 2),
          'arms_rise': ('golem_sk', 3), 'golem_nova': ('golem_sk', 4)}
    sizes = {}
    for name, (sec, k) in fx.items():
        if k < len(meta[sec]):
            im = load(src, meta[sec][k]['file'])
            if name == 'meteor_hit' and im.width > 180: im = im.crop((im.width // 2, 0, im.width, im.height)).crop(None)   # vienen dos impactos pegados
            if name == 'meteor_hit': im = im.crop(im.getbbox())
            im.save(os.path.join(out, 'fx', name + '.png'), optimize=True); sizes[name] = im.size
    # ---- retrato ----
    idle[0].save(os.path.join(out, 'portrait.png'), optimize=True)
    print(json.dumps({"hechicero": hm, "golem": gm, "fx": sizes}))
