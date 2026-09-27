# ARENA 01 — La Ciudad Maldita

> *"No podés salvarlos a todos. Pero vas a intentarlo."*

Arena 01 de la campaña canónica: donde empieza todo. La ciudad de los campeones, la noche en que la Horda volvió.
Identidad: **DECIDIR QUÉ VALE LA PENA SALVAR MIENTRAS TODO SE DERRUMBA.** Civiles escondidos que hay que
encontrar, rescatar y escoltar; estructuras que la Horda derriba; subjefes en el nivel 9 y **El Presentador**
(no es un Guardián) en el 10.

Informe completo: [`LA_HORDA_CITY_IMPLEMENTATION_REPORT.md`](../../LA_HORDA_CITY_IMPLEMENTATION_REPORT.md) ·
Assets faltantes: [`LA_HORDA_CITY_MISSING_ASSETS.md`](../../LA_HORDA_CITY_MISSING_ASSETS.md).

## Archivos

| Qué | Dónde |
|---|---|
| Datos: edificios, estructuras, puntos, balance (`CM_CFG`), fichas | `js/arenas/ciudad/cm-data.js` |
| Geometría, colisión, navegación, interiores, zonas seguras, apariciones | `js/arenas/ciudad/cm-map.js` |
| Civiles (10 estados), RESCATAR, estructuras, derrota, alertas, recompensas | `js/arenas/ciudad/cm-civilians.js` |
| IA de los 9 enemigos + oleadas | `js/arenas/ciudad/cm-enemies.js` |
| Nivel 9 (Maestro + Tramoyista → apagón → Dama del Telón) y nivel 10 (El Presentador) | `js/arenas/ciudad/cm-bosses.js` |
| Dibujo (edificios oblicuos, fundido local de techos, HUD, minimapa) | `js/arenas/ciudad/cm-render.js` |
| Registro en `ARENA_DEFS`, atlas, sonidos, guías de jefe, bots, red | `js/arenas/ciudad/cm-arena.js` |
| Hojas fuente (oficiales, del usuario) | `art-source/ciudad/{mapa,enemigos1,enemigos2,jefes}.png` |
| Recorte | `tools/art/ciudad/extract.py` → `assets/sprites/arenas/ciudad/`, `assets/vfx/ciudad/`, `js/assets/ciudad-meta.js` |
| Pruebas | `tools/ciudad/smoke.js` (17) · `tools/net-test/ciudad_coop.js` (9) |

Enganche nuevo al motor (genérico, para cualquier arena): `resultsHTML(win)` — filas propias en la pantalla de
victoria y de derrota (`js/ui/end-screens.js`).
