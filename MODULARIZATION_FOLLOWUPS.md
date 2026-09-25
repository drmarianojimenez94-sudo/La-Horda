# Modularización — mejoras para más adelante (NO implementadas)

Cosas que aparecieron durante la Modularización Segura V1 y que quedaron **afuera a propósito**:
este sprint solo separó el código, sin cambiar comportamiento. Ordenadas de más a menos
importante. Nada de esto está hecho.

## Bugs que ya existían antes de modularizar

1. **La pantalla de victoria siempre dice "Arena Infernal — Completada"**, aunque ganes en
   Bosque, Hielo, Laberinto o Acuática. Es un texto fijo en `VICTORY_STEPS`
   (`js/ui/end-screens.js`). Arreglo sugerido: usar `ARENA_MODS[currentArena].label`.
2. ~~**`DEV_XP_MULT = 100`**~~ — resuelto: el multiplicador se eliminó y la curva de XP se
   calibró para la campaña (nivel ~40 al terminarla).
3. **Algunos efectos con demora usan `setTimeout`** (ruptura de 140 ms y onda del Tajo en
   `js/skills/abilities.js`, peligro ambiental en `js/arenas/hazards.js`, avisos de la Arena
   Divina). Si abandonás la partida justo en esa fracción de segundo, el efecto se aplica igual
   sobre la partida siguiente. En la práctica casi imposible de notar; la solución prolija es la
   que ya usa Musashi (temporizadores dentro de `update()`).

## Arquitectura (siguiente paso natural)

4. **Pasar a ES modules** (`import`/`export`). Hoy los scripts comparten el espacio global
   (igual que cuando era un solo archivo). Para migrar hay que agrupar el estado de la partida
   (`player`, `enemies`, `state`, `runLevel`…) en un objeto, porque un `import` no se puede
   reasignar. Es una reescritura de muchas líneas: conviene hacerla recién cuando esta versión
   esté probada.
5. **`castAbility()` (~1100 líneas, `js/skills/abilities.js`)** es un `switch` gigante con
   todas las habilidades de todos los campeones. Se podría convertir en un registro
   `kind → función` repartido por campeón.
6. **`update()` (~850 líneas, `js/core/update.js`)** mezcla IA de enemigos, oleadas,
   proyectiles, jefes y efectos. Se puede partir en `updateEnemies`, `updateProjectiles`, etc.
7. **Cadenas `if (classKey === "...")`** para dibujar cada campeón (`drawHeroBody` en
   `js/rendering/entities.js`, vista previa en `js/ui/champion-select.js`, HUD). Un registro
   por campeón haría que agregar uno nuevo no requiera tocar esos archivos.
8. **Números de balance escritos dentro de la lógica** (no en `js/data/`): duración de nivel
   (`22000 + runLevel*2600` en `beginLevel`), escalado de enemigos en `spawnEnemy`, bonus de XP
   de victoria, etc. Pasarlos a constantes con nombre en `js/data/`.
9. **Varios cargadores de imágenes distintos** (bloques manuales `X_IMG`/`X_READY`,
   `champPackLoad`, `acua2Load`, `newfxLoad`, atlas). Unificar en un solo `loadSprite()` que
   además registre la imagen en el manifiesto automáticamente.
10. **`js/assets/asset-manifest.js` se mantiene a mano**: si alguien agrega un PNG y se olvida
    de sumarlo, el juego funciona pero el título no espera esa imagen. Se puede generar con un
    script o derivar de los cargadores (punto 9).

## Código viejo que sigue en uso (LEGACY BUT REQUIRED)

11. **Pixel art procedural** (`js/data/pixel-art.js` + `js/rendering/pixel-sprites.js`): es el
    respaldo cuando un sprite real no está listo. Con la precarga del título ya nunca debería
    verse; se podría retirar después de confirmarlo en dispositivos reales.
12. **Sprites de 3 direcciones de Segador y Axiom** (`SEGADOR_REAL_IMG`, `AXIOM_REAL_IMG`):
    respaldo del pack animado (`CHAMP_PACK`). Mismo caso que el punto 11.
13. **Dos sistemas de partículas conviven**: el arreglo `particles` original (anillos, textos,
    chispas) y el pool de VFX nuevo (`js/rendering/vfx.js`). Unificarlos ahorraría memoria.

## Assets

14. **4 íconos de habilidades de La Profeta sin usar**, conservados en
    `assets/sprites/champions/profeta/unused-skill-icons/` (su constante era código muerto y se
    quitó). Quedan para cuando se integren.
15. **Las fuentes vienen de Google Fonts** (Press Start 2P y VT323). Sin conexión se ven fuentes
    de respaldo. Se podrían copiar a `assets/fonts/` para que el juego sea 100% autónomo.
16. **Caché de GitHub Pages**: sirve los archivos con ~10 min de caché. Justo después de publicar
    una versión nueva, un navegador podría mezclar un archivo viejo con uno nuevo durante esos
    minutos. Si llega a molestar: agregar un número de versión a los nombres de los scripts.

## Rendimiento (no hizo falta tocar nada en este sprint)

17. La versión modular descarga ~23 MB de PNG en vez de ~31 MB de HTML con base64, y el
    navegador ya no guarda en memoria el texto base64 gigante del script. Si en el futuro se
    quiere bajar más: convertir sprites grandes a WebP (cambia bytes del arte: hacerlo solo con
    aprobación y comparando visualmente).
