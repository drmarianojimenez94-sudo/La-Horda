"""MINAS PROFUNDAS — texturas de piso por sector (pixel art procedural con la paleta de las hojas).

La hoja del mapa trae el "SUELO MINA" como una baldosa con brillo de lava (sirve de referencia, no se
repite bien). Para cada sector se arma un piso de piedras irregulares (Voronoi toroidal = sin costuras)
de 64x64 px, con juntas oscuras, variación por piedra y motas; el juego lo usa en patrón x2 (píxel
nítido). Paletas tomadas de las plataformas del mapa oficial: marrón (mina superior) -> gris (galerías)
-> azulado (vetas de cristal) -> violeta (corrupción) -> basalto con brasas (profundidades/umbral).
Escribe assets/vfx/minas/tex_piso_<sector>.png.
usage: python3 floor.py
"""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PAL = {  # base, claro, oscuro, junta, motas (rgb) + brasa (opcional)
    'superior':      ((60, 45, 34), (86, 66, 48), (38, 28, 21), (20, 14, 10), (104, 82, 58), None),
    'galerias':      ((56, 50, 47), (80, 71, 64), (34, 30, 29), (17, 15, 15), (98, 88, 78), None),
    'vetas':         ((41, 47, 62), (60, 68, 88), (25, 29, 40), (13, 15, 23), (90, 120, 170), None),
    'corrompida':    ((47, 37, 57), (68, 53, 82), (29, 21, 37), (15, 10, 21), (140, 80, 190), None),
    'profundidades': ((42, 31, 28), (62, 45, 38), (25, 17, 15), (12, 6, 6), (90, 60, 48), (230, 90, 30)),
    'umbral':        ((46, 25, 20), (68, 37, 28), (27, 13, 10), (14, 4, 4), (96, 48, 36), (255, 110, 30)),
}
N = 64

def tile(name, seed):
    base, light, dark, mortar, speck, ember = [np.array(c, float) if c else None for c in PAL[name]]
    rng = np.random.default_rng(seed)
    pts = rng.random((22, 2))*N
    ys, xs = np.mgrid[0:N, 0:N]
    d1 = np.full((N, N), 1e9); d2 = np.full((N, N), 1e9); idx = np.zeros((N, N), int)
    for i, (px, py) in enumerate(pts):
        for ox in (-N, 0, N):
            for oy in (-N, 0, N):
                d = np.hypot(xs - (px + ox), ys - (py + oy))
                closer = d < d1
                d2 = np.where(closer, d1, np.minimum(d2, d)); idx = np.where(closer, i, idx); d1 = np.where(closer, d, d1)
    shade = rng.random(len(pts))
    edge = d2 - d1                       # distancia al borde de la piedra
    img = np.zeros((N, N, 3))
    for i in range(len(pts)):
        m = idx == i; s = shade[i]
        col = base*(1 - s*0.5) + light*(s*0.5) if s > 0.5 else base*(0.8 + s*0.4)
        img[m] = col
    # bisel: borde superior-izquierdo claro, inferior-derecho oscuro (luz desde arriba)
    gy, gx = np.gradient(d1)
    bevel = np.clip(-(gx + gy)*0.9, -1, 1)
    near = edge < 3.2
    img[near & (bevel > 0.2)] = img[near & (bevel > 0.2)]*0.55 + light*0.45
    img[near & (bevel < -0.2)] = img[near & (bevel < -0.2)]*0.6 + dark*0.4
    img[edge < 1.3] = mortar
    # motas y grietas finas
    sp = rng.random((N, N))
    img[(sp > 0.985) & (edge > 2)] = speck
    img[(sp < 0.012) & (edge > 2)] = dark
    if ember is not None:
        e = (edge < 1.3) & (rng.random((N, N)) > 0.93)
        img[e] = ember*0.85
    # cuantizar a la paleta (pixel art: pocos tonos, sin degradé)
    pal = np.array([base, light, dark, mortar, speck, base*0.9 + light*0.1, base*0.8 + dark*0.2] + ([ember*0.85] if ember is not None else []))
    flat = img.reshape(-1, 3); dd = ((flat[:, None, :] - pal[None])**2).sum(-1); q = pal[dd.argmin(1)].reshape(N, N, 3)
    return Image.fromarray(q.astype(np.uint8), 'RGB')

if __name__ == '__main__':
    out = os.path.join(REPO, 'assets', 'vfx', 'minas'); os.makedirs(out, exist_ok=True)
    for i, name in enumerate(PAL):
        im = tile(name, 1000 + i*17); im.save(os.path.join(out, f'tex_piso_{name}.png'), optimize=True)
        print(name, im.size)
