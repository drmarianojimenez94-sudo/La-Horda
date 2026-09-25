#!/usr/bin/env python3
"""Explora una banda (x0,x1,y0,y1) de la máscara: segmentos separados por columnas vacías."""
import sys, numpy as np
fg = np.load(sys.argv[1])
def segs(x0, x1, y0, y1, gap=2, thr=1):
    occ = fg[y0:y1, x0:x1].sum(0)
    out, s, run = [], None, 0
    for i, v in enumerate(occ):
        if v > thr:
            if s is None: s = i
            run = 0
        else:
            if s is not None:
                run += 1
                if run >= gap: out.append((x0+s, x0+i-run+1)); s = None; run = 0
    if s is not None: out.append((x0+s, x1))
    return out
for arg in sys.argv[2:]:
    x0, x1, y0, y1 = map(int, arg.split(','))
    ss = segs(x0, x1, y0, y1)
    print(arg, len(ss), [(a, b, b-a) for a, b in ss])
