#!/usr/bin/env python3
"""LA HORDA — GATE DE ESTILO de campeones (hojas 4x9 de 112 px).

El Roster Art Gate (tools/art/roster_gate.js) iguala ESCALA y PIES; no mira el estilo. Este gate compara cada hoja
con el rango de las hojas ENCARGADAS (tools/art/painter/donors.json) en cuatro medidas, sobre los 12 cuadros de
caminar (frente, perfil y espalda):
  colores   cantidad de colores distintos por cuadro (el roster es pintura reducida: cientos por cuadro)
  contorno  fracción del borde de la silueta que es contorno oscuro
  sombreado desvío de luz local dentro de la figura (volumen, no relleno plano)
  detalle   fracción del interior con bordes internos (pliegues, texturas, adornos)
Pasa si cada medida cae dentro del rango del roster con un 15 % de tolerancia. Escribe docs/art-gate/style-gate.json.
  python3 tools/art/painter/style_gate.py --strict        # falla ante defectos del roster medible
  python3 tools/art/painter/style_gate.py <atlas.png> ... # hojas sueltas (salidas del pintor)
"""
import json, sys, glob
from pathlib import Path
import numpy as np
from PIL import Image
import cv2

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
CELL = 112
TOL = .15


def frames(path, rows=3):
    a = np.array(Image.open(path).convert('RGBA'))
    if a.shape[0] < CELL * rows or a.shape[1] < CELL * 4:
        return []
    return [a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] for r in range(rows) for c in range(4)]


def measure(f):
    m = f[:, :, 3] > 0
    if m.sum() < 200:
        return None
    rgb = f[:, :, :3]
    cols = len({tuple(p) for p in rgb[m]})
    L = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)[:, :, 0].astype(np.float32) * 100 / 255
    er = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    edge = m & ~er
    outline = float((L[edge] < 22).mean()) if edge.any() else 0
    inner = cv2.erode(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    mu = cv2.blur(L, (3, 3)); mu2 = cv2.blur(L * L, (3, 3))
    sd = np.sqrt(np.maximum(mu2 - mu * mu, 0))
    shading = float(sd[inner].mean()) if inner.any() else 0
    gx = cv2.Sobel(L, cv2.CV_32F, 1, 0); gy = cv2.Sobel(L, cv2.CV_32F, 0, 1)
    detail = float((np.hypot(gx, gy)[inner] > 40).mean()) if inner.any() else 0
    return {'colores': cols, 'contorno': outline, 'sombreado': shading, 'detalle': detail}


def sheet_metrics(path):
    ms = [x for x in (measure(f) for f in frames(path)) if x]
    if not ms:
        return None
    return {k: float(np.median([x[k] for x in ms])) for k in ms[0]}


def reference():
    D = json.loads((HERE / 'donors.json').read_text())
    rows = {k: sheet_metrics(ROOT / d['atlas']) for k, d in D.items()}
    rows = {k: v for k, v in rows.items() if v}
    keys = next(iter(rows.values())).keys()
    rng = {k: [min(r[k] for r in rows.values()), max(r[k] for r in rows.values())] for k in keys}
    return rows, rng


def check(m, rng):
    fails = []
    for k, (lo, hi) in rng.items():
        if not (lo * (1 - TOL) <= m[k] <= hi * (1 + TOL)):
            fails.append(f'{k} {m[k]:.3g} fuera de [{lo * (1 - TOL):.3g}, {hi * (1 + TOL):.3g}]')
    return fails


def main():
    ref_rows, rng = reference()
    strict = "--strict" in sys.argv
    targets = [arg for arg in sys.argv[1:] if arg != "--strict"]
    explicit = bool(targets)
    if not targets:
        targets = sorted(set(glob.glob(str(ROOT / 'assets/sprites/champions/*/atlas.png'))
                             + glob.glob(str(ROOT / 'assets/sprites/champions/*/skins/*/atlas.png'))))
    out = {'tolerance': TOL, 'range': rng, 'reference': ref_rows, 'sheets': {}, 'skipped': []}
    bad = 0
    for t in targets:
        p = Path(t)
        f = []
        m = None
        try:
            with Image.open(p) as image:
                supported = image.size == (448, 1008)
            if not supported:
                if not explicit:
                    out['skipped'].append(str(p))
                    continue  # otros formatos necesitan su propio gate, no reciben PASS
                f.append('formato no soportado: se requiere atlas 448x1008')
            else:
                m = sheet_metrics(p)
                if m is None:
                    f.append('sin cuadros medibles: atlas vacío o incompleto')
                else:
                    f.extend(check(m, rng))
                    if any(measure(frame) is None for frame in frames(p, rows=9)):
                        f.append('faltan cuadros de animación medibles')
        except (OSError, ValueError) as exc:
            f.append('atlas ilegible: ' + str(exc))
        key = str(p.relative_to(ROOT)) if p.is_absolute() and ROOT in p.parents else str(p)
        out['sheets'][key] = {'metrics': m, 'pass': not f, 'fails': f}
        bad += bool(f)
        print(('PASS ' if not f else 'FAIL ') + key + ('' if not f else '  ' + '; '.join(f)))
    if not explicit:
        (ROOT / 'docs/art-gate').mkdir(parents=True, exist_ok=True)
        (ROOT / 'docs/art-gate/style-gate.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print('rango del roster:', json.dumps({k: [round(a, 3), round(b, 3)] for k, (a, b) in rng.items()}))
    if not out["sheets"]:
        print("FAIL: ningún atlas validado")
        bad += 1
    sys.exit(1 if bad and (explicit or strict) else 0)


if __name__ == '__main__':
    main()
