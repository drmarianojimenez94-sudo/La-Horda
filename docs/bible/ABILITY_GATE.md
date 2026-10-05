# Filtro de habilidades

Herramienta: `node tools/bible/ability-gate.js [--strict]` (`ONLY=a,b` para filtrar). Resultado:
`docs/bible/generated/ability-gate.json` y `ABILITY_GATE.md`.

## Qué mide

Cada habilidad se lanza en el motor real contra 10 muñecos agrupados (a unas 115 unidades, donde se apunta) y 3
aliados heridos. La medición es **diferencial**: misma partida y mismo azar con y sin el lanzamiento, así lo que
cambia es efecto de la habilidad. Las habilidades que apuntan se lanzan dos veces: sobre los enemigos (daño y
control) y sobre los aliados (curas, auras, bendiciones).

| Categoría | Se cumple cuando… |
|---|---|
| ÁREA | daña o aplica estados a 4 o más enemigos agrupados |
| MÚLTIPLE | daña a 2 o más enemigos |
| POTENCIA | el campeón o un aliado pega más fuerte, recibe menos daño o corre más (se mide con un golpe de prueba, el daño recibido y la velocidad), o gana un estado de potenciación |
| CURA | un aliado o el propio campeón recupera vida o gana escudo |
| CONTROL | algún enemigo queda frenado, aturdido, marcado, sangrando… |
| MOVILIDAD | el campeón se desplaza |
| INVOCA | aparecen entidades: torres, zonas, objetos, aliados |

## Reglas para todo campeón nuevo

1. Entre sus tres habilidades: una de **ÁREA**, **otra distinta** que dañe a varios enemigos (MÚLTIPLE) y una de
   **POTENCIA o CURA**.
2. La **definitiva suma 3 categorías o más** (ÁREA y MÚLTIPLE cuentan como una).
3. Toda habilidad tiene **efecto medible** y **efecto visual**.
4. **Premarcado**: si la habilidad usa el punto o la dirección apuntados, tiene perfil de apuntado
   (`AIM_PROFILES` por tipo, o `ACTION_AIM_PROFILES` por acción en los kits de Ascensión y Expedición), así el
   jugador ve y elige dónde cae antes de soltar.

"Campeón nuevo" = el que no está en `knownChampions` de la referencia de balance. Los clásicos se informan
(estado INFO) sin bloquear. Un canario (el Caballero con un kit sin efecto) tiene que salir rechazado; si no, la
corrida falla.

## Base compartida de los kits nuevos

`js/champions/kit-shared.js`:

- `kitBuff(origen, aliado, ms, {dmg, armor, speed, label})`: potenciaciones estándar con cartel al recibirlas y
  un indicador mientras duran (chevrones dorados = +daño, anillo celeste = armadura).
- `kitFx(tema, x, y, r)` y `kitFxLine(...)`: efecto visual de la habilidad con los sprites del motor (agua, ola,
  vórtice, viento, luz, escudo, púas, hielo, rayo, sombra, fuego, tierra, plumas, runa). Cada acción de Ascensión
  y Expedición declara su tema (`ASC_FX`, `EX_FX`).

## Referencia: Axiom

Error 404 (ÁREA + MÚLTIPLE + CONTROL, premarcado), Sobrescribir (MÚLTIPLE + CONTROL, premarcado), Teletransporte
(POTENCIA + MOVILIDAD, premarcado). Es el estándar de claridad: se apunta, se ve dónde cae y cada habilidad tiene
un trabajo distinto.
