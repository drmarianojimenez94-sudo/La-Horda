# Motor competitivo CW-4

## Dos reglas de partida

- **Convergencia:** dos pistas con obstáculos idénticos, cristales de 1200 PV, oleadas espejo y economía compartida. Las tarjetas atacan la pista rival; las habilidades normales defienden la propia. Las paredes bloquean desplazamiento, embestida y disparo básico. Eclipse desde 300 s; límite de 420 s.
- **Coliseo:** campo compartido 2 contra 2; gana quien alcanza 15 eliminaciones, o el mayor marcador a los 420 s. Empate si igualan. Reaparición a los 5 s. Los monstruos neutrales son activables mediante `create(slots, seed, {mode:'coliseum', monsters:false})`; por defecto aparecen. Si un neutral remata un héroe dentro de los 5 s del último golpe rival, se acredita al rival.

Meteorito cuesta 24 fragmentos y causa 48 de daño previo a la escala PvP. Escarcha cuesta 18, causa 15 y ralentiza 2,5 s. Ambas fijan la posición del rival con menos PV al lanzamiento, avisan 1,35 s y permiten esquivar; enfriamiento compartido por equipo de 8 s. No requieren ventana de suministros. No dañan el cristal directamente.

## Normalización y factores

Los 38 perfiles conservan estadísticas normalizadas por arquetipo, sin nivel, equipo ni ventajas de fundador. Las diez firmas añaden efectos y contrapartidas descritos en `CHAMPION_ADAPTATION.md`; no representan una importación literal de todos los kits de campaña.

| Arquetipo | Daño Convergencia | Daño a héroes en Coliseo, antes de factor PvP |
| --- | ---: | ---: |
| Tanque | 1,40 | 0,68 |
| Guerrero | 0,70 | 1,35 |
| Mago | 0,92 | 1,30 |
| Soporte | 1,12 | 0,80 |

El daño a héroes en Coliseo recibe además factor **0,42**; las curas **0,45** y los escudos creados por habilidades **0,55**. Las tarjetas omiten los factores por arquetipo: su precio compra el mismo efecto para cualquier campeón, pero conservan la escala PvP. Estos valores están exportados en `CrystalWars.DAMAGE_SCALE`.

Los factores compensan los resultados medidos del nuevo mapa y las diferencias entre defensa de oleadas y combate directo. En particular, trasladar escudos y curas completos mientras se reducía sólo el daño producía una dominancia fuerte de soporte; la escala coherente evita ese problema. Las firmas se verifican contra un control idéntico sin firma.

## Evidencia y límites

- `node tools/crystal-wars/balance-gate.js`: puerta original de Convergencia, cuatro arquetipos, políticas y lados. Umbrales no relajados. Salida completa: `balance-crystal.txt`.
- `node tools/crystal-wars/coliseum-balance-gate.js`: 180 partidas de composiciones intercambiando lados y 60 espejos, paso de 1/30 s. Exige 40–60 % por arquetipo y lado, ≤5 % empates y duración media de 60–300 s. Salida completa: `balance-coliseum.txt`.
- `node tools/crystal-wars/competitive-balance.js`: muestra exploratoria de 1216 partidas, 38 perfiles contra su arquetipo de referencia, cuatro compañeros, dos semillas y ambos lados, paso de 0,1 s. Incluye credencial de fundador sólo en el fixture de prueba y exige que ningún perfil caiga al suplente. Salida: `balance-roster-exploratory.json`.

La muestra exploratoria **no es una puerta de aprobación de cada campeón**. Los porcentajes contra un arquetipo concreto no equivalen a porcentaje global del metajuego. Los bots y el paso temporal cambian resultados; las puertas principales se ejecutan a 30 Hz. Se requieren partidas humanas para valorar habilidad, diversión y balance fino. La autoridad de partida sigue en el anfitrión; esto no acredita seguridad de una clasificación competitiva contra trampas.
