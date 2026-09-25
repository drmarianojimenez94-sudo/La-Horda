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

**Integrados (PASS):** Segador Olvidado, La Profeta, Musashi, La Cazadora, Dama del Bosque y los 4
Doppelgängers — ver `docs/VISUAL_ASSET_MANIFEST.md` ("Redraw integrado").

## PENDIENTE — Campeones (2)

### Axiom
- **Qué se mantiene:** armadura dorada/ornamentada, capa/escudo azul, temática "código/glitch".
- **Frames que usa el motor** (misma grilla que las hojas ya integradas): caminar ↓/←/→/↑ ×4,
  idle ×4, ataque básico ×4, golpe ×4, muerte ×6, y una fila de "preparación" de habilidad (×3).
  El glitch/teletransporte/Error 404/Force Quit siguen siendo VFX del código.

### Nigromante
- **Qué se mantiene:** túnica/capucha negra, cetro con orbe verde, invocador.
- **Frames:** los mismos que Axiom. Las invocaciones (esqueletos guerrero/mago, gólem) y la forma
  demoníaca de Encarnación del Abismo tienen arte propio que ya pasa el Gate; si la hoja nueva las
  trae, se evalúan aparte (no se reemplazan si no pasan).

## Opcional (no bloquea)
- Lobo Espectral de La Cazadora: la hoja nueva trae un lobo del mismo estilo; el actual es PASS.
- Doppelgänger — golpe: la hoja no tiene fila de "recibir daño" (hoy usa idle + destello).

## Cómo se usará

Cuando llegue el arte nuevo: recortarlo al mismo naming/formato de frames indicado arriba,
correr `python3 tools/art/redraw/build_all.py` (agregando la hoja a `art-source/redraw/` y sus
coordenadas a `tools/art/redraw/sheets.py`) y agregarlo a `ASSET_MANIFEST`/los loaders (`js/assets/champion-sprites.js`,
`js/assets/enemy-sprites.js`) sin tocar nada de `js/data/champions.js` ni `js/data/enemies.js`
(estadísticas y habilidades no cambian). Después, repetir el Roster Visual Test para confirmar
PASS.
