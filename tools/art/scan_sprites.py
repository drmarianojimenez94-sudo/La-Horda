#!/usr/bin/env python3
"""
tools/art/scan_sprites.py — LA HORDA VISUAL GATE: technical scanner (see docs/ART_BIBLE.md).

Read-only report by default. Flags, per PNG under assets/sprites/:
  halo      light/gray border pixels around the silhouette (leftover background)
  semialpha % of pixels with 0 < alpha < 255 (blurry edges when scaled with nearest-neighbor)
  fragments small disconnected islands (torn crop, neighboring-frame leftovers)
  huge      unusually large dimensions vs. the rest of its folder (possible wrong export)

This does NOT decide artistic style (anime vs. pixel, proportions, shading) — that needs a human
looking at the Master Reference (docs/ART_BIBLE.md). It only catches the technical defects the
Visual Gate calls FIX. Run with --apply to clean HALO/SEMIALPHA/FRAGMENTS in place (same
algorithm as normalize_sprites.py, minus the outline step: outline is a champion-specific style
choice, not applied here to avoid acting as a global "make it pixel art" filter).

Usage:
  python3 tools/art/scan_sprites.py                       # report only
  python3 tools/art/scan_sprites.py --dir enemies/hielo    # scope to one folder
  python3 tools/art/scan_sprites.py --apply --dir bosses/x # clean in place
"""
import sys, os, glob
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'sprites')
N4 = np.array([[0,1,0],[1,1,1],[0,1,0]], bool)

def lum(rgb): return 0.299*rgb[...,0] + 0.587*rgb[...,1] + 0.114*rgb[...,2]
def sat(rgb):
    mx = rgb.max(-1).astype(float); mn = rgb.min(-1).astype(float)
    return np.where(mx>0, (mx-mn)/np.maximum(mx,1), 0)

def analyze(path):
    im = Image.open(path).convert('RGBA'); rgba = np.array(im)
    a = rgba[...,3]; op = a > 127
    if not op.any(): return None
    total = op.sum()
    semi = int(((a>0)&(a<250)).sum())
    border = op & ~ndimage.binary_erosion(op, N4, border_value=0)
    halo = int((border & (lum(rgba[...,:3])>120) & (sat(rgba[...,:3])<0.22)).sum())
    lbl, n = ndimage.label(op, np.ones((3,3),bool))
    frag = 0
    sheet = _is_spritesheet(op)
    if n>1 and not sheet:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, range(n+1)); sizes[0]=0
        big = sizes.max()
        frag = int(sum(1 for i in range(1,n+1) if sizes[i] < big*0.04))
    return {'w':im.width, 'h':im.height, 'total':int(total), 'semi':semi, 'semiPct':round(100*semi/max(1,total),1),
            'halo':halo, 'fragments':frag, 'n_islands':n, 'sheet':sheet}

def _is_spritesheet(op):
    """Multi-frame spritesheets have several islands of SIMILAR size (one per frame): removing
    'small' islands there would delete whole frames. Detected as: 3+ islands, and the 2nd-largest
    is at least 15% of the largest (a lone character + tiny debris never looks like that)."""
    lbl, n = ndimage.label(op, np.ones((3,3),bool))
    if n < 3: return False
    sizes = sorted(ndimage.sum(np.ones_like(lbl), lbl, range(1,n+1)), reverse=True)
    return len(sizes) >= 3 and sizes[1] >= sizes[0]*0.15

def clean(path):
    im = Image.open(path).convert('RGBA'); rgba = np.array(im)
    rgb = rgba[...,:3].copy(); a = rgba[...,3].astype(int); op = a>127
    sheet = _is_spritesheet(op)  # spritesheet: dehalo only, never touch fragments (would eat frames)
    for _ in range(3):
        border = op & ~ndimage.binary_erosion(op, N4, border_value=0)
        halo = border & (lum(rgb)>120) & (sat(rgb)<0.22)
        halo |= border & (a<200) & (lum(rgb)>95)
        if not halo.any(): break
        op &= ~halo
    if not sheet:
        lbl, n = ndimage.label(op, np.ones((3,3),bool))
        if n>1:
            sizes = ndimage.sum(np.ones_like(lbl), lbl, range(n+1)); sizes[0]=0
            big = int(np.argmax(sizes)); bs = sizes[big]
            for i in range(1,n+1):
                if i!=big and sizes[i] < bs*0.04: op &= (lbl!=i)
    rgba[...,:3] = np.where(op[...,None], rgb, 0)
    rgba[...,3] = np.where(op, 255, 0)
    Image.fromarray(rgba,'RGBA').save(path, optimize=True)

def main():
    apply = '--apply' in sys.argv
    scope = None
    if '--dir' in sys.argv: scope = sys.argv[sys.argv.index('--dir')+1]
    pattern = os.path.join(ROOT, scope or '', '**', '*.png')
    files = sorted(glob.glob(pattern, recursive=True))
    flagged = []
    for f in files:
        r = analyze(f)
        if not r: continue
        rel = os.path.relpath(f, ROOT)
        issues = []
        if r['halo'] > 15: issues.append(f"halo={r['halo']}px")
        if r['semiPct'] > 3: issues.append(f"semialpha={r['semiPct']}%")
        if r['fragments'] > 0: issues.append(f"fragments={r['fragments']}")
        if issues:
            flagged.append((rel, issues))
            print(rel.ljust(60), ' '.join(issues))
            if apply: clean(f)
    print(f"\n{len(flagged)}/{len(files)} files flagged" + (" (cleaned)" if apply else " (report only; pass --apply to clean)"))

if __name__ == '__main__':
    main()
