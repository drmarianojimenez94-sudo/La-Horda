"""Sheet -> clean RGBA frames. Sections are given explicitly (x0,x1,y0,y1,n); cells are an even split,
checkerboard removed by edge flood-fill over checker-grey pixels (never touches interior colour)."""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

def lumof(a): return 0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
def satd(a): return a.max(-1)-a.min(-1)

def cell_rgba(a, x0, y0, x1, y1, inset=4, opts=None):
    opts = opts or {}
    c = a[y0:y1, x0:x1].copy()
    l = lumof(c); sd = satd(c)
    # the two checker tones differ per sheet: estimate them from the cell margin (mostly background)
    mg = np.zeros(l.shape, bool); mg[:8,:] = mg[-8:,:] = mg[:,:8] = mg[:,-8:] = True
    vals = l[mg & (sd < 10) & (l > 80) & (l < 150)]
    t1, t2 = 97.0, 113.0
    if vals.size > 40:
        t1, t2 = np.percentile(vals, 25), np.percentile(vals, 75)
        for _ in range(8):
            mid = (t1+t2)/2; lo, hi = vals[vals <= mid], vals[vals > mid]
            if lo.size and hi.size: t1, t2 = lo.mean(), hi.mean()
    near = lambda tol: (np.abs(l-t1) < tol) | (np.abs(l-t2) < tol)
    chk = (sd < 16) & (near(12) | ((l > min(t1,t2)) & (l < max(t1,t2))))
    # label bar: drop top rows until checker shows up
    top = 0
    while top < c.shape[0]//3 and chk[top].mean() < 0.18: top += 1
    c = c[top:]; l = l[top:]; sd = sd[top:]; chk = chk[top:]
    c = c[:, inset:c.shape[1]-inset]; l = l[:, inset:-inset]; sd = sd[:, inset:-inset]; chk = chk[:, inset:-inset]
    H, W = l.shape
    # margin: divider lines / panel grey near the cell edge are background too
    edge = np.zeros_like(chk); m = 3
    edge[:m,:] = edge[-m:,:] = edge[:,:m] = edge[:,-m:] = True
    cand = chk | (edge & (sd < 20) & (l < 140))
    lbl, n = ndimage.label(cand)
    border = set(np.unique(np.r_[lbl[0], lbl[-1], lbl[:,0], lbl[:,-1]])) - {0}
    bg = np.isin(lbl, list(border))
    # enclosed checker pockets (gaps between limbs)
    # only the two real checker tones (~97 and ~113), flat, and a pocket big enough to hold a square
    strict = (sd < opts.get('pocket_sd', 7)) & near(opts.get('pocket_tol', 6))
    plbl, pn = ndimage.label(strict & ~bg)
    for i, sl in enumerate(ndimage.find_objects(plbl), 1):
        if sl is None: continue
        reg = plbl[sl] == i
        if reg.sum() >= opts.get('pocket_min', 30) and l[sl][reg].std() < opts.get('pocket_std', 6): bg[sl] |= reg
    # glow baked over the checker: tinted grey that is still grey underneath (G and B not crushed).
    # Grown only outward from the background, so interior colours (skin, bone, cloth) are never touched.
    R, G, B = c[...,0], c[...,1], c[...,2]
    glowtint = ((R > G+10) & (B >= G-8)) | ((G > R+10) & (np.abs(B-R) < 15))   # red/pink or green glow, never beige/gold/navy
    haze = (l > 60) & (l < 165) & (G >= 55) & (B >= 50) & (sd >= 14) & (sd < 75) & glowtint
    for _ in range(40):
        grow = ndimage.binary_dilation(bg, N8) & haze & ~bg
        if not grow.any(): break
        bg |= grow
    # painted ground shadow / neutral motion smear: flat grey darker than the checker, grown from the background
    shadow = (sd < 13) & (l > 50) & (l <= 96)
    for _ in range(14):
        grow = ndimage.binary_dilation(bg, N8) & shadow & ~bg
        if not grow.any(): break
        bg |= grow
    if opts.get('light_smear'):   # light-grey motion blur (only sheets without thin grey steel)
        ls = (sd < 11) & (l > 96) & (l <= 165)
        for _ in range(12):
            grow = ndimage.binary_dilation(bg, N8) & ls & ~bg
            if not grow.any(): break
            bg |= grow
    # faint warm (gold) glow over the checker: shallow growth only, so warm cloth deeper in is safe
    warm = (R >= G-4) & (G > B+4) & (sd >= 8) & (sd < 34) & (l > 95) & (l < 152)
    for _ in range(8):
        grow = ndimage.binary_dilation(bg, N8) & warm & ~bg
        if not grow.any(): break
        bg |= grow
    # enclosed smears (motion blur baked over the checker inside a swing arc): faint tint only
    hl, hn = ndimage.label(haze & ~bg)
    for i, sl in enumerate(ndimage.find_objects(hl), 1):
        if sl is None: continue
        reg = hl[sl] == i
        if reg.sum() >= 40 and sd[sl][reg].mean() < 60: bg[sl] |= reg
    fg = ~bg
    # blend fringe between outline and checker
    N4 = np.array([[0,1,0],[1,1,1],[0,1,0]], bool)
    for _ in range(2):
        rim = fg & ~ndimage.binary_erosion(fg, N4, border_value=0)
        fringe = rim & (sd < 22) & (l > 70) & (l < 140)
        if not fringe.any(): break
        fg &= ~fringe
    # drop specks
    flbl, fn = ndimage.label(fg, np.ones((3,3), bool))
    if fn:
        sizes = ndimage.sum(np.ones_like(flbl), flbl, range(1, fn+1))
        for i, s in enumerate(sizes, 1):
            if s < 6: fg &= (flbl != i)
        for i, sl in enumerate(ndimage.find_objects(flbl), 1):
            if sl is None: continue
            hh, ww = sl[0].stop-sl[0].start, sl[1].stop-sl[1].start
            if hh <= 3 and ww >= 5: fg &= (flbl != i)   # leftover panel border line
            if ww <= 3 and hh >= 5 and (sl[1].start <= 5 or sl[1].stop >= W-5): fg &= (flbl != i)  # divider sliver
    if opts.get('grey_specks'):   # detached neutral-grey bits left between particles (checker fragments)
        flbl, fn = ndimage.label(fg, np.ones((3,3), bool))
        for i, sl in enumerate(ndimage.find_objects(flbl), 1):
            if sl is None: continue
            reg = flbl[sl] == i
            if reg.sum() < 90 and sd[sl][reg].mean() < 20 and 80 < l[sl][reg].mean() < 155: fg[sl] &= ~reg
    out = np.zeros((H, W, 4), np.uint8)
    out[..., :3] = np.where(fg[..., None], c, 0)
    out[..., 3] = np.where(fg, 255, 0)
    # glow baked over the grey: un-mix against the checker grey (c = a*glow + (1-a)*grey) so the
    # halo becomes a translucent glow instead of an opaque grey-tinted block. Only near the edge, never
    # next to the dark outline (that is cloth/skin, not glow).
    g0 = 105.0
    dist = ndimage.distance_transform_edt(fg)
    nearline = ndimage.binary_dilation(l < 45, N8, iterations=2)
    glowish = fg & (dist <= 8) & ~nearline & (l > 95) & (l < 178) & (sd <= 42) & (c.max(-1) > g0+8) & (glowtint | warm | (sd < 14))
    if glowish.any():
        mx = c.max(-1).astype(float)
        a = np.clip((mx - g0) / (255.0 - g0), 0.08, 1.0)
        G = np.clip(g0 + (c - g0) / a[..., None], 0, 255)
        out[..., :3] = np.where(glowish[..., None], G, out[..., :3])
        out[..., 3] = np.where(glowish, (a*255).astype(np.uint8), out[..., 3])
    return out

N8 = np.ones((3,3), bool)
def split(x0, x1, n): return [(round(x0+(x1-x0)*i/n), round(x0+(x1-x0)*(i+1)/n)) for i in range(n)]

def extract(sheet, sections, outdir, opts=None):
    a = np.array(Image.open(sheet).convert('RGB')).astype(int)
    frames = {}
    for name, sec in sections.items():
        if isinstance(sec, list):   # explicit cells (x0, y0, x1, y1) for rows that are not an even grid
            for i, (cx0, cy0, cx1, cy1) in enumerate(sec):
                frames[f"{name}_{i+1:02d}"] = cell_rgba(a, cx0, cy0, cx1, cy1, opts=opts)
            continue
        x0, x1, y0, y1, n = sec
        for i, (cx0, cx1) in enumerate(split(x0, x1, n)):
            frames[f"{name}_{i+1:02d}"] = cell_rgba(a, cx0, y0, cx1, y1, opts=opts)
    os.makedirs(outdir, exist_ok=True)
    for k, f in frames.items(): Image.fromarray(f, 'RGBA').save(os.path.join(outdir, k + '.png'))
    return frames
