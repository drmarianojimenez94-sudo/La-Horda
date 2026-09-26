"""Gradación de color del mapa del Reino Micelial (dirección de arte).
Problema: el mapa original es neón en 5 tonos (teal, verde, magenta, naranja, violeta) con la misma
fuerza: los héroes y la horda se pierden. Criterio:
  - el agua bioluminiscente (teal/verde) queda como el ÚNICO color vivo: es la firma de la arena,
  - hongos magenta/violeta/naranja bajan de saturación (acentos, no protagonistas),
  - luces altas comprimidas (nada compite con los efectos de las habilidades),
  - tono dividido común: sombras violeta profundo, medios neutros,
  - los caminos (marrón) quedan neutros y un poco más claros: ahí se pelea.
usage: python3 grade_map.py <in.jpg> <out.jpg>"""
import sys
import numpy as np
from PIL import Image

def grade(a):
    a = a.astype(np.float32) / 255.0
    mx = a.max(-1); mn = a.min(-1); d = mx - mn + 1e-6
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60.0
    s = np.where(mx > 0, d / (mx + 1e-6), 0); v = mx
    # saturación por familia de tono
    teal = ((h >= 140) & (h <= 200)).astype(np.float32)            # agua bioluminiscente: se conserva
    green = ((h > 80) & (h < 140)).astype(np.float32)
    warm = ((h < 45) | (h > 330)).astype(np.float32)                 # naranjas / rojos de hongos
    violet = ((h >= 250) & (h <= 330)).astype(np.float32)            # magenta / violeta
    brown = (((h >= 15) & (h <= 45)) & (s < 0.62) & (v < 0.62)).astype(np.float32)  # caminos de tierra
    sf = 0.6 + 0.3*teal + 0.1*green - 0.02*warm - 0.06*violet
    sf = np.where(brown > 0, 0.55, sf)
    s2 = np.clip(s * sf, 0, 1)
    # valor: comprimir altas luces, caminos un poco más claros
    v2 = 0.02 + 0.93 * np.power(v, 1.05)
    v2 = np.where(v2 > 0.62, 0.62 + (v2 - 0.62) * 0.55, v2)
    v2 = np.where(brown > 0, np.minimum(1, v2 * 1.1 + 0.02), v2)
    v2 = np.where(teal > 0, np.minimum(1, v2 * 1.04), v2)
    # volver a RGB
    c = v2 * s2; x = c * (1 - np.abs((h / 60.0) % 2 - 1)); m = v2 - c
    z = np.zeros_like(h); hi = (h // 60).astype(int) % 6
    rr = np.choose(hi, [c, x, z, z, x, c]); gg = np.choose(hi, [x, c, c, x, z, z]); bb = np.choose(hi, [z, z, x, c, c, x])
    out = np.stack([rr + m, gg + m, bb + m], -1)
    # tono dividido: sombras hacia violeta profundo
    lum = out.mean(-1, keepdims=True)
    shadow = np.clip(1 - lum * 2.2, 0, 1)
    out = out * (1 - 0.25 * shadow) + np.array([0.07, 0.04, 0.11]) * 0.25 * shadow
    return np.clip(out * 255, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    im = Image.open(sys.argv[1]).convert('RGB')
    Image.fromarray(grade(np.asarray(im))).save(sys.argv[2], quality=90)
