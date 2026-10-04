# Auditoría de jefes (AUTO-GENERADO)

> `node tools/bible/boss-validator.js`. Pelea real por jefe/subjefe (~42–45 s, bots invulnerables, azar con semilla). Evidencia automática, no aprobación de diseño. Ganchos: ✓ se disparó en la pelea · · no (a = auto, exigido; p = decisión del jugador; f = fase). Diseño y arte: BOSS_BLUEPRINTS (js/arenas/common/boss-blueprints.js); densidad de píxel: `tools/art/arena_lineup.js`.

| Arena | Nivel | Jefe | Validación | Diseño | Arte | Ganchos con la arena | Avisos | Detalle |
|---|---|---|---|---|---|---|---|---|
| Ciudad Maldita | 10 | El Presentador | **PASS*** | PASS | REDRAW (P0-01) | ✓ `estructura`(a) · `publico`(p) · `ovacion`(p) · `corte`(p) ✓ `reflejo`(p) | 9/0 | WARNING: patrones distintos (2 tipos de aviso/golpe) |
| Ciudad Maldita | 9 | Maestro de Ceremonias | **PASS** | PASS | REDRAW (P0-03) | ✓ `escena`(a) ✓ `refugio`(p) | 30/0 | — |
| Ciudad Maldita | 9 | El Tramoyista | **PASS** | PASS | REDRAW (P0-04) | ✓ `estructura`(a) | 30/0 | — |
| Ciudad Maldita | 9 | La Dama del Telón | **PASS*** | PASS | REDRAW (P0-02) | · `estructura`(a) | 30/0 | WARNING: aparece en la simulación (forma posterior: no se alcanza en la ventana (la cubre t_boss_arena_hooks.js)) |
| Fábrica Sin Fin | 6 | Dragón de la Forja | **PASS** | PASS | FIX | ✓ `horno`(a) | 65/22 | — |
| Fábrica Sin Fin | 10 | El Caballero de la Armadura Oxidada | **PASS** | PASS | PASS | ✓ `camara`(a) · `valvula`(p) · `trampa`(p) | 25/6 | — |
| Ruinas Célticas / Élficas | 9 | Doppelgängers | **PASS** | PASS | PASS | ✓ `runas`(a) ✓ `contencion`(p) | 61/27 | — |
| Ruinas Célticas / Élficas | 10 | Guardián Ancestral Corrompido | **PASS** | PASS | PASS | ✓ `rearma`(a) ✓ `runa_rota`(a) ✓ `purifica`(p) | 199/184 | — |
| Reino Fúngico | 6 | Micelio Primigenio | **PASS** | PASS | FIX | ✓ `cadaveres`(a) ✓ `germina`(a) ✓ `raices`(p) | 38/18 | — |
| Reino Fúngico | 10 | La Madre Espora | **PASS*** | PASS | PASS | · `floracion`(p) · `infeccion`(p) · `nucleos`(p) | 44/18 | WARNING: ficha (BOSS_BLUEPRINTS) (ningún gancho 'auto': la arena sólo importa si el jugador la busca) |
| Arena Gélida | 10 | Mago de Hielo y Cristal | **PASS** | PASS | PASS | ✓ `brasero`(a) · `focos`(p) | 87/56 | — |
| Arena Gélida | 10 | Demonio Gélido — Ángel Caído | **PASS*** | PASS | PASS | · `fuego`(p) · `apaga`(p) | 87/56 | WARNING: ficha (BOSS_BLUEPRINTS) (ningún gancho 'auto': la arena sólo importa si el jugador la busca); WARNING: aparece en la simulación (forma posterior: no se alcanza en la ventana (la cubre t_boss_arena_hooks.js)) |
| Arena Gélida | 6 | Tundraverx, Soberano de Hielo | **PASS** | PASS | PASS | ✓ `frio`(a) ✓ `brasero`(p) · `fuego`(p) | 33/0 | — |
| Arena Acuática | 6 | Kraken Joven | **PASS** | PASS | FIX (F-08) | ✓ `corriente`(a) · `charco`(p) | 39/0 | — |
| Arena Acuática | 10 | Leviatán | **PASS** | PASS | FIX (F-08) | ✓ `charco`(a) · `marea`(p) ✓ `tentaculos`(p) | 68/4 | — |
| Laberinto | 6 | Guardián del Laberinto | **PASS** | PASS | PASS | ✓ `muro`(a) ✓ `derrumbe`(p) | 81/22 | — |
| Laberinto | 10 | Minotauro | **PASS*** | PASS | FIX | · `muro`(p) · `colapso`(p) | 224/196 | WARNING: ficha (BOSS_BLUEPRINTS) (ningún gancho 'auto': la arena sólo importa si el jugador la busca) |
| Abismo | 9 | El Carcelero del Vacío | **PASS** | PASS | REDRAW (P0-11) | ✓ `gancho`(a) ✓ `plataformas`(a) | 22/0 | — |
| Abismo | 10 | El Que Mora Debajo | **PASS** | PASS | PASS | ✓ `plataformas`(a) · `jinete`(p) ✓ `tentaculo`(p) | 42/6 | — |
| Minas Profundas | 8 | Titán de Piedra | **PASS** | PASS | REDRAW (R-01) | ✓ `luces`(a) · `derrumbe`(p) | 0/138 | — |
| Minas Profundas | 10 | Cerbero, Guardián del Umbral | **PASS** | PASS | REDRAW (F-01) | ✓ `oscuridad`(a) · `luz`(p) | 0/49 | — |
| Arena Infernal | 4 | Esqueleto Cornudo (Guardián de la Horda) | **PASS** | PASS | PASS | ✓ `fisura`(a) · `barricada`(p) | 11/1 | — |
| Arena Infernal | 7 | Demonio Menor (Guardián de la Horda) | **PASS** | PASS | PASS | ✓ `fisura`(a) ✓ `sello`(p) | 33/10 | — |
| Arena Infernal | 9 | El Hechicero Supremo | **PASS** | PASS | PASS | ✓ `fisura`(a) ✓ `sello`(p) | 79/46 | — |
| Arena Infernal | 10 | El Ángel Corrompido (forma 1) | **PASS** | PASS | REDRAW (F-02) | ✓ `convergencia`(a) · `focos`(p) | 292/139 | — |
| Arena Infernal | 10 | Gólem de Cuerpos (forma 2) | **PASS*** | PASS | REDRAW (P0-12) | · `barricada`(p) · `numero`(p) · `red`(p) | 292/139 | WARNING: ficha (BOSS_BLUEPRINTS) (ningún gancho 'auto': la arena sólo importa si el jugador la busca); WARNING: aparece en la simulación (forma posterior: no se alcanza en la ventana (la cubre t_boss_arena_hooks.js)) |
| Arena Infernal | 10 | Rey de la Horda (forma final) | **PASS*** | PASS | FIX (F-03) | · `fisuras_poder`(a) · `fisuras`(p) | 292/139 | WARNING: aparece en la simulación (forma posterior: no se alcanza en la ventana (la cubre t_boss_arena_hooks.js)) |
| divina | 6 | Jinete Sin Cabeza | **PASS*** | FIX | PASS | — | 0/0 | WARNING: ficha (BOSS_BLUEPRINTS) (ningún gancho con su arena (BOSS + ARENA = ENCUENTRO)); WARNING: simulación (modo propio (divina): sin pelea de campaña que simular) |
