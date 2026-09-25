#!/usr/bin/env python3
"""
tools/art/normalize_sprites.py — Normalización visual de sprites (Visual Consistency V1).

NO rediseña nada: mismo dibujo, misma silueta, mismos colores. Solo corrige defectos técnicos
que hacían que algunos campeones no parecieran del mismo juego:

  holes      rellena agujeros transparentes DENTRO del cuerpo (quedaron al quitar el fondo:
             colores parecidos al fondo se borraron también -> aspecto "comido por polillas")
  dehalo     borra el halo claro del fondo original alrededor de la silueta (borde gris/blanco)
  binarize   alfa nítido (sin bordes semitransparentes que se vean borrosos al escalar)
  fragments  borra pedazos sueltos (restos del cuadro vecino, píxeles perdidos, líneas de corte)
  outline    contorno oscuro de 1 píxel, como el que ya tienen los campeones originales
             (Tanque/Asesino/Mago/Soporte): mismo lenguaje de contorno en todo el roster

Uso:  python3 tools/art/normalize_sprites.py [--dry] [--only carpeta] | --check
Se aplica sobre los archivos listados en PLAN (in-place). Los originales quedan en el historial
de git (commit anterior a "Visual consistency V1"). Es idempotente en la práctica: correrlo dos
veces no agrega un segundo contorno (se detecta el contorno existente).
"""
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'sprites', 'champions')

# carpeta -> operaciones. Solo los campeones donde se detectaron los defectos (ver
# VISUAL_ART_REWORK.md). Tanque/Asesino/Mago/Soporte/Profeta no se tocan.
PLAN = {
    'nigromante': ['dehalo', 'binarize', 'fragments', 'outline'],
    'nigromante/demon': ['dehalo', 'binarize', 'fragments', 'outline'],
    'nigromante/golem': ['dehalo', 'binarize', 'fragments', 'outline'],
    'nigromante/skeleton': ['dehalo', 'binarize', 'fragments', 'outline'],
    'musashi': ['holes', 'binarize', 'fragments', 'outline'],
    'cazadora': ['holes', 'binarize', 'fragments', 'outline'],
    'cazadora/wolf': ['holes', 'binarize', 'fragments', 'outline'],
    'segador': ['dehalo', 'binarize', 'fragments', 'outline'],
    'axiom': ['holes', 'binarize', 'fragments', 'outline'],  # sin dehalo: su capa blanca/plateada es parte del diseño
}
# Archivos que NO son el cuerpo (efectos con transparencia intencional): solo se les limpia el
# alfa si se pide explícitamente; por defecto se saltean.
SKIP = {'musashi/ghost1.png', 'musashi/ghost2.png', 'musashi/ghost3.png', 'musashi/ghost4.png',
        'musashi/ultiPortal.png', 'musashi/ultiFinish.png'}

N4 = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)
N8 = np.ones((3, 3), bool)


def lum(rgb):
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def sat(rgb):
    mx = rgb.max(-1).astype(float); mn = rgb.min(-1).astype(float)
    return np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)


def neighbor_mean(rgb, mask, target):
    """Color promedio de los vecinos opacos (8) para cada píxel de `target`."""
    out = rgb.copy().astype(float)
    acc = np.zeros(rgb.shape, float); cnt = np.zeros(mask.shape, float)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0: continue
            m = np.roll(np.roll(mask, dy, 0), dx, 1)
            c = np.roll(np.roll(rgb, dy, 0), dx, 1)
            acc += c * m[..., None]; cnt += m
    ok = target & (cnt > 0)
    out[ok] = acc[ok] / cnt[ok][:, None]
    return out.astype(np.uint8), ok


def has_outline(rgba):
    a = rgba[..., 3] > 127
    border = a & ~ndimage.binary_erosion(a, N4)
    if border.sum() == 0: return False
    return (lum(rgba[..., :3][border]) < 45).mean() > 0.85


def process(path, ops):
    im = Image.open(path).convert('RGBA'); rgba = np.array(im)
    rgb = rgba[..., :3].copy(); a = rgba[..., 3].astype(int)
    report = {}
    already = has_outline(rgba)
    op = a > 127
    if 'dehalo' in ops and not already:
        removed = 0
        for _ in range(3):
            border = op & ~ndimage.binary_erosion(op, N4, border_value=0)
            halo = border & (lum(rgb) > 120) & (sat(rgb) < 0.22)
            # halo semitransparente de cualquier color claro también sale
            halo |= border & (a < 200) & (lum(rgb) > 95)
            if not halo.any(): break
            op &= ~halo; removed += int(halo.sum())
        report['dehalo'] = removed
    if 'holes' in ops:
        filled_total = 0
        for _ in range(2):
            # agujeros cerrados (no conectados con el exterior) de hasta 60 px
            lbl, n = ndimage.label(~op, N4)
            outside = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]])))
            sizes = ndimage.sum(np.ones_like(lbl), lbl, range(n + 1))
            holes = np.zeros_like(op)
            for i in range(1, n + 1):
                if i not in outside and sizes[i] <= 60: holes |= lbl == i
            # muescas de 1 px: transparente con >=6 de 8 vecinos opacos
            cnt = ndimage.convolve(op.astype(int), np.ones((3, 3), int), mode='constant') - op
            holes |= (~op) & (cnt >= 6)
            if not holes.any(): break
            rgb2, ok = neighbor_mean(rgb, op, holes)
            rgb[ok] = rgb2[ok]; op |= ok; filled_total += int(ok.sum())
        report['holes'] = filled_total
    if 'fragments' in ops:
        lbl, n = ndimage.label(op, N8)
        if n > 1:
            sizes = ndimage.sum(np.ones_like(lbl), lbl, range(n + 1)); sizes[0] = 0
            big = int(np.argmax(sizes)); bs = sizes[big]
            ys, xs = np.where(lbl == big); y0, y1, x0, x1 = ys.min() - 8, ys.max() + 8, xs.min() - 8, xs.max() + 8
            removed = 0
            for i in range(1, n + 1):
                if i == big: continue
                s = sizes[i]
                cy, cx = ndimage.center_of_mass(lbl == i)
                inside = y0 <= cy <= y1 and x0 <= cx <= x1
                comp = lbl == i
                touches_edge = comp[0].any() or comp[-1].any() or comp[:, 0].any() or comp[:, -1].any()
                # pedazo del cuadro vecino: toca el borde de la imagen y es chico frente al cuerpo
                if s < bs * 0.006 or (s < bs * 0.04 and not inside) or (touches_edge and s < bs * 0.12):
                    op &= lbl != i; removed += int(s)
            report['fragments'] = removed
    if 'outline' in ops and not already:
        ring = ndimage.binary_dilation(op, N4) & ~op
        # contorno "selectivo": el color vecino oscurecido, casi negro (estilo pixel art moderno)
        rgb2, ok = neighbor_mean(rgb, op, ring)
        dark = (rgb2.astype(float) * 0.22 + np.array([14, 9, 12]) * 0.78).astype(np.uint8)
        rgb[ok] = dark[ok]; op |= ok
        report['outline'] = int(ok.sum())
    rgba[..., :3] = np.where(op[..., None], rgb, 0)
    rgba[..., 3] = np.where(op, 255, 0)
    return Image.fromarray(rgba, 'RGBA'), report


def check():
    """Verifica que los sprites normalizados sigan limpios (alfa nítido, sin halo): útil si se
    agrega arte nuevo a estas carpetas. Sale con código 1 si algo no cumple."""
    bad = 0
    for folder in PLAN:
        for f in sorted(glob.glob(os.path.join(ROOT, folder, '*.png'))):
            rel = os.path.relpath(f, ROOT)
            if rel in SKIP: continue
            a = np.array(Image.open(f).convert('RGBA'))[..., 3]
            semi = ((a > 0) & (a < 255)).sum()
            if semi: print('ALFA SEMITRANSPARENTE', rel, int(semi)); bad += 1
    print('check:', 'OK' if not bad else f'{bad} archivos a revisar')
    return bad


def main():
    if '--check' in sys.argv: sys.exit(1 if check() else 0)
    dry = '--dry' in sys.argv
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    for folder, ops in PLAN.items():
        if only and not folder.startswith(only): continue
        for f in sorted(glob.glob(os.path.join(ROOT, folder, '*.png'))):
            rel = os.path.relpath(f, ROOT)
            if rel in SKIP: continue
            out, rep = process(f, ops)
            print(rel, rep)
            if not dry: out.save(f, optimize=True)


if __name__ == '__main__':
    main()
