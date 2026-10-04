# Producción de sprites

Herramienta: generador de imágenes integrado. Referencia visual: `assets/sprites/champions/tanque/atlas.png`. Identidades y vestuario: `js/champions/expedition/catalog.js` (silhouette, weapon y skins). Cada variante conserva rostro, arma, proporciones y ancla; cambia ropa/accesorios. Los PNG finales revisados están versionados en `assets/sprites/champions/<id>/`, con metadata en `art-data.json`.

## Prompt base

Use case: stylized-concept. Asset type: production sprite animation sheet for La Horda. Genuinely transparent background. EXACTLY 4 equal columns by 9 equal rows, 36 individual full-body sprites, no text, no grid lines, no effects outside body/weapon. Portrait 1024x1536 canvas. Each cell 256 by ~170.7. Center character in every cell with generous transparent gutters, feet at consistent cell baseline. Real designed dark fantasy pixel art: visible square pixels, chibi head 40-45% of body height, short compact torso and limbs, solid 1-pixel dark outline at sprite resolution, 2-3 discrete tones per color, limited palette. Not semi-realistic, not smooth painting. Consistent identity, outfit, equipment in all frames. Rows 1-3: four distinct alternating steps of walk facing down/front, right/profile, up/back, respectively. Rows 4-6: four distinct attack stages (windup, anticipation, strike, recovery) facing down, right, up. Row7: four casting stages facing front. Row8: four emphatic ultimate casting stages front, no giant glow. Row9: four falling/death stages front, ending lying on ground, same person and equipment. Never change outfit between rows. Preserve entire character within each cell including weapon. 

Para cada campeón se añade su silueta y arma del catálogo. Para skins, se referencia la hoja original y se añade el nombre y vestuario de la entrada `skins`. Las fuentes de generación son hojas de trabajo; la versión de producción es el atlas normalizado y revisado. `build-art.py` requiere las hojas fuente en `art-source/expedition/` para reimportar y no se ejecuta al iniciar el juego.

## Corrección de ataques hacia arriba

Supplementary game sprite sheet, exactly four full-body sprites in a two by two square grid, transparent background, no text or effects. Reference defines the exact skin, outfit and weapon. All four poses face directly away from viewer: back of head and outfit, no face. Four distinct stages of back-facing attack: windup, anticipation, strike away, recovery. Same compact proportions and dark fantasy pixel style. Generous transparent gutters.

Se aplicó a Nahir Vitral, ambas variantes de Orsa y Renko Desierto. Vesper Corte conserva 32 poses y reutiliza su cast en ultimate; no se inventan fotogramas. Los loops excluyen poses de dirección incorrecta. El informe técnico registra los hashes y los índices efectivos están en art-data.json.

## Cromas

Son paletas del renderizador existente, no skins de vestuario. Se calculan una vez al cargar y conservan máscara alfa, metadata, escala y ancla. Los previews se capturan desde ese renderizador con cosmetics-test.js.
