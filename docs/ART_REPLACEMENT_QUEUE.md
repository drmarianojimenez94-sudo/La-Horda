# ART_REPLACEMENT_QUEUE — LA HORDA

Únicamente assets con estado **REDRAW REQUIRED** en `docs/VISUAL_ASSET_MANIFEST.md`. Nadie
rediseña esto automáticamente: esta lista es el pedido exacto para producir arte nuevo que
**conserve el diseño existente** (silueta, ropa, arma, colores, temática, habilidades) y lo
reconstruya en la gramática del Master Reference (`docs/ART_BIBLE.md` — el Caballero/Tanque).
Orden de prioridad: campeones jugables primero, después subjefes.

Formato de entrega esperado por ítem: PNG con transparencia real, alfa nítido (0/255), contorno
oscuro de 1px, la grilla de frames indicada. Los recortes/integración al motor los hace el
equipo técnico después — acá solo se pide el arte.

---

## Estado

**Integrados (PASS):** los 10 campeones (Segador, Axiom, La Profeta, Musashi, La Cazadora,
Nigromante + la familia original), Dama del Bosque, los 4 Doppelgängers y los esqueletos del
Nigromante — ver `docs/VISUAL_ASSET_MANIFEST.md`.

## PENDIENTE (menor, no bloquea)

### Forma demoníaca del Nigromante (Encarnación del Abismo)
- Hoy: arte pintado anterior. Pedido: el mismo demonio (cuernos, alas, fuego de almas verde) en la
  gramática chibi, más grande que un campeón (es una transformación, ~1.4× de alto). Estados que usa
  el código: quieto, ataque (2 golpes), lanzar fuego de almas, golpe al piso, tajo.

### Gólem del Nigromante (piel piedra / fuego / hielo)
- Hoy: arte pintado anterior. Pedido: gólem chibi grande, 3 pieles (piedra, fuego, hielo), quieto +
  ataque (+ aparición opcional).

### Opcional
- Lobo Espectral de La Cazadora (la hoja del Nigromante trae lobos del estilo nuevo, pero el lobo
  pertenece a La Cazadora: se puede reutilizar si se confirma).
- Doppelgänger — golpe: la hoja no tiene fila de "recibir daño".

## Cómo se usará

Cuando llegue el arte nuevo: recortarlo al mismo naming/formato de frames indicado arriba,
correr `python3 tools/art/redraw/build_all.py` (agregando la hoja a `art-source/redraw/` y sus
coordenadas a `tools/art/redraw/sheets.py`) y agregarlo a `ASSET_MANIFEST`/los loaders (`js/assets/champion-sprites.js`,
`js/assets/enemy-sprites.js`) sin tocar nada de `js/data/champions.js` ni `js/data/enemies.js`
(estadísticas y habilidades no cambian). Después, repetir el Roster Visual Test para confirmar
PASS.
