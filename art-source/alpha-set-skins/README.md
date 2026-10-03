# Myla / Ynara — authored Set skins

Generated with built-in `image_gen` (2026-10-03), using existing character atlases as identity and pose references. Myla also used the Tanque atlas as the art-style reference. Original generated sheets are retained as `myla.png` and `ynara.png`.

## Production prompt set

**Myla:** identity-preserving production sprite atlas, recognizable smiling brown-haired toddler, wooden spoon. A real new outfit, **Pastelera de Medianoche**: cream chef beret, navy pastry jacket with brass buttons, cream crescent-pocket apron, small brown boots, blueberry satchel. Four columns × six rows, transparent, no labels or grid. Rows 1–3 down/right/back: idle, left walk, right walk, spoon cast. Rows 4–6 same directions: stomp, shouting arms raised, alternate stomp, shouting arms extended for BERRINCHE. Same costume, scale and chibi proportions throughout. Crisp dark pixel contours, 2–3 shades per material; no airbrush or VFX clouds.

**Ynara:** identity-preserving production sprite atlas, same long dark brown hair, calm healer face, halo and chibi proportions. A real new outfit, **Guardiana del Santuario**: ivory armored field-medic overcoat with pointed split tails, small wing-shaped brass shoulder guards, burgundy chest sash, turquoise tunic, apothecary bag with bottles, ivory boots, brass wrist cuffs. Four columns × six rows matching original poses: three directional walk rows down/right/back and three casting rows in those directions. No turn inside a row, no face in back view, no costume change. Transparent, no labels, no grid, no VFX painted into sprites; restricted pixel palette and dark outline.

## Frame gate

The initial nominal-grid importer caught vertical row drift instead of accepting clipped bodies. The final importer follows the existing `complete_skins` approach: six complete alpha-connected silhouettes per column, sorted by height. It removes tiny disconnected artifacts, binarizes alpha, uses one uniform nearest-neighbor scale per character, and aligns feet at y=90 in each 96×96 cell. It does not redraw or recolor artwork.

Two authored frames failed direction/accessory consistency and are **not shipped as active art**:

- Myla frame 17: profile ultimate turns toward the camera. Cell is transparent in production; the right-facing ultimate uses 16,18,19,18.
- Ynara frame 11: rear walk flips the satchel side. Cell is transparent in production; rear walk uses 8,9,10,9.

The remaining **46 poses** preserve costume, palette, silhouette and identity. All used animation indices have nonempty sprites, binary alpha, padding and a consistent baseline. Hit/death reuse existing pose semantics; these skins do not add new death choreography or combat effects. `frame-report.json` records uniform scale and dimensions.

## Existing cosmetics preserved

`skin_*-legacy-croma.png` are exports of the previously shipped runtime-recolored atlases, not newly generated art. They remain accessible as `myla_arandanos` and `ynara_celeste`; their old Set collectors retain access through `legacySet`. New authored skins set `preserveAuthoredArt` so `portador-cosmetics.js` does not overwrite their names or repaint their atlases.

## Reproduce checks

```
python3 tools/art/alpha_set_skins/build.py
python3 tools/art/alpha_set_skins/check.py
node tools/art/alpha_set_skins/browser.js
node tools/collection/check-collection.js
node tools/collection/browser-collection.js
```

Browser tools accept `SE_BASE_URL` and `CHROMIUM_PATH`. The sprite browser optionally writes a roster comparison with `SKIN_QA_SCREENSHOT`. Classification: **SKIN DE SET**, without inventing Epic/Legendary rarity or modified gameplay stats.

## Gate result

**PASS** for the 46 used production poses after the two rejected cells were removed. Technical check and browser frame/remap/legacy-entitlement check passed (67 browser assertions). Visual roster comparison was inspected against the Tanque master, original characters and preserved cromas: `docs/production/alpha-skins-roster.png`. No device-level iPhone performance claim is inferred from this desktop browser review.
