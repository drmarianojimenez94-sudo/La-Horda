# LA HORDA — MINAS PROFUNDAS · INFORME DE IMPLEMENTACIÓN

> **"LA LUZ ES TERRITORIO."**
> Un descenso donde cada luz encendida es terreno ganado y la oscuridad es una amenaza de verdad.

Las Minas Profundas pasaron de "en construcción" a **Arena 09 jugable**, la última antes de la Arena Infernal.
La arena tiene:
- 6 sectores que se recorren bajando;
- un sistema de luz completo;
- 6 enemigos con IA propia;
- el **Devoraluz** como evento élite;
- el **Titán de Piedra** (subjefe, nivel 8) y **Cerbero** (jefe, nivel 10, 3 actos).

Y la regla canónica:

> **MATAR A CERBERO NO TERMINA LA PARTIDA.** Se abre el **Portal Infernal** y la arena termina cuando un
> jugador humano lo **atraviesa**. Esa victoria es para todo el equipo y desbloquea la Arena Infernal.

Todo el arte sale de las 4 hojas oficiales. Lo que falta producir está en `LA_HORDA_MINES_MISSING_ASSETS.md`.

## 1. Cómo se juega

1. **Mina superior (−40 m).** Faroles encendidos, rieles, vagonetas. Cada guardián lleva una **antorcha
   personal** (círculo de luz chico). El Hechicero explica la luz la primera vez.
2. Las fuentes de luz tienen 3 estados: **ENCENDIDA → PARPADEA → APAGADA**.
   - La Horda las golpea y se debilitan solas.
   - Una luz apagada deja su zona **a oscuras**: nunca negro total, pero cuesta ver.
   - A oscuras se recibe **+15 % de daño**, los Acechadores emboscan, y los enemigos son más rápidos cerca de un
     Consumidor.
   - En la luz se regenera un poco de vida.
3. **ENCENDER:** acercarse a una luz apagada y **mantener** la acción contextual (mismo botón que Revivir,
   tecla E) durante 1,3 s. Si te pegan fuerte (más del 7 % de la vida), se interrumpe.
4. **Descenso.** Cada tantos niveles el equipo baja al sector siguiente:
   - Galerías (−120 m), niveles 3-4.
   - Vetas Profundas (−240 m), niveles 5-6.
   - Mina Corrompida (−380 m), nivel 7.
   - Profundidades (−520 m), niveles 8-9.
   - Umbral Infernal (−666 m), nivel 10.

   El descenso es un fundido con el montacargas y un cartel con la profundidad.
5. **Devoraluz** (niveles 6, 7 y 9) es un evento, no un jefe:
   1. **Elige** una luz (flecha violeta y aviso "¡EL DEVORALUZ VA POR UNA LUZ!").
   2. **Viaja** hacia ella.
   3. **Avisa** (aro violeta que late).
   4. La **devora** (2,6 s): la luz se apaga y queda "devorada".
   5. Pasa a la siguiente.

   Si se le hace el 12 % de su vida mientras devora, **se interrumpe** y queda aturdido. Al morir **devuelve**
   dos luces devoradas.
6. **Nivel 8: Titán de Piedra.** El nivel no avanza mientras viva. Pisotones, temblores, lluvia de rocas y
   derrumbes que dejan escombros; su pisotón apaga las luces cercanas. Al caer, el infierno empieza a teñir
   la mina.
7. **Nivel 10: Umbral Infernal.** Cadenas, triple rugido y **Cerbero**:
   - **Acto 1:** encadenado; no puede salir del círculo de sus cadenas.
   - **Acto 2 (66 %):** rompe las cadenas.
   - **Acto 3 (33 %):** furia; aullido que trae esbirros.
   - **Ataques:** lanzallamas en cono (se echa atrás y marca), pisotón que apaga luces, mordida triple,
     embestida e invocación.
8. **Muerte de Cerbero (6,2 s de secuencia).** La partida **sigue**. Se abre la puerta del Umbral y aparece el
   **Portal Infernal** (3,2 s), con el objetivo "**ATRAVIESA EL UMBRAL**".
9. Cualquier guardián **humano** mantiene "ATRAVESAR EL UMBRAL" (0,9 s) → **¡Victoria!** para todo el equipo,
   con la fila "ATRAVESASTE EL UMBRAL" en los resultados. Se abre la **Arena Infernal**.

## 2. La regla del portal (lo que el pedido exigía comprobar)

| Caso | Qué se garantiza | Cómo | Prueba |
|---|---|---|---|
| A | Cerbero muerto ≠ victoria | `ENEMY_BASE.mn_cerbero.defeatOutcome = "exit"`: el gancho `bossDefeated` de la arena toma la muerte y devuelve `true`, así el motor **no** llama a `finishBossVictory` | `smoke.js` A |
| B | La partida sigue y el portal se abre | Secuencia de muerte → estado `opening` → `open`, con el objetivo en el HUD | `smoke.js` B · `minas_coop.js` D |
| C | Interactuar con el portal = victoria | `mnPortalEnter(h)` → `completeArenaByExit()` → `finishBossVictory()`, el sistema de victoria de siempre | `smoke.js` C |
| D | El invitado (P2) lo atraviesa → victoria para todos | La acción la valida **el anfitrión** (`ctxNetMsg` → `canUse` → `mnIsHuman`) y la victoria viaja por la red como cualquier otra | `minas_coop.js` D (desktop + móvil) |
| E | Simultáneo → una sola finalización | Doble candado: el portal pasa a `used` en el primer cruce y `completeArenaByExit` tiene `_arenaExitDone` (se limpia en `startRun` y en el reinicio del invitado) | `smoke.js` E · `minas_coop.js` E (`finishBossVictory` se llamó 1 vez) |
| F | Los bots no pueden terminar la arena | `mnIsHuman(h) = h === player \|\| h.isRemote`; los bots ni ven la acción como objetivo | `smoke.js` F · `minas_coop.js` D |
| G | Se desbloquea la Arena Infernal | `finishBossVictory` marca las Minas completadas → la frontera pasa a la Infernal. Las pruebas verifican antes que la Infernal está **cerrada** (sin aperturas heredadas ni modo prueba) | `smoke.js` G0 + G · `minas_coop.js` D0 + D |

El mecanismo es **genérico y por datos**: cualquier jefe futuro con `defeatOutcome:"exit"` puede usar
`completeArenaByExit()` (`js/core/run.js`) para terminar su arena por una salida en vez de por la muerte.

## 3. Archivos

| Archivo | Qué hace |
|---|---|
| `js/arenas/minas/mn-data.js` | Límites, los 6 sectores (rocas, pilares, props, rieles, luces, túneles), nivel → sector, balance `MN_CFG`, fichas de 9 tipos |
| `js/arenas/minas/mn-map.js` | Estado de la arena, colisión y navegación por sector, descenso (fundido, cambio de geometría, teletransporte), apariciones (túneles oscuros, insectos desde la roca) |
| `js/arenas/minas/mn-light.js` | Luz: consulta, daño a fuentes, apagado, reencendido, apagones, zonas de oscuridad, antorchas, ENCENDER / ATRAVESAR (`CTX_KINDS`), máscara de oscuridad |
| `js/arenas/minas/mn-enemies.js` | IA de los 6 enemigos + Devoraluz (máquina de estados), proyectiles, avisos, oleadas |
| `js/arenas/minas/mn-bosses.js` | Titán (director + IA), Cerbero (preludio, 3 actos, cadenas, muerte), Portal Infernal |
| `js/arenas/minas/mn-render.js` | Suelo por sector, rocas, luces por estado, portal, puerta, cadenas, oscuridad, HUD de luz, alertas, minimapa |
| `js/arenas/minas/mn-arena.js` | Registro en `ARENA_DEFS`, atlas, 32 sonidos, guías de jefe, bots, red, resultados |
| `js/assets/minas-meta.js` | Generado por el recortador (atlas, efectos, piezas, texturas) |
| `tools/art/minas/extract.py` | Recortador de las 4 hojas (clasificación de fondo por hoja, grillas, efectos, piezas, retratos) |
| `tools/art/minas/floor.py` | Pisos procedurales sin costuras, uno por sector |
| `tools/minas/smoke.js` | Humo de la arena (29 comprobaciones, incluye A-C, E-G) |
| `tools/net-test/minas_coop.js` | Cooperativo real con relay, desktop + móvil (12 comprobaciones, incluye D y E) |

Cambios chicos fuera de la arena:
- **`js/core/run.js`:** `completeArenaByExit()` con candado, `bossDefeatOutcome(type)`, reinicio del candado en
  `startRun`.
- **`js/net/net-game.js`:** reinicio del candado en el invitado.
- **`js/systems/combat.js`:** gancho genérico `heroDmgTakenMult(h)`.
- **`js/data/arenas.js`:** Minas jugable, orden de campaña y descripciones 07/08.
- **`js/systems/campaign-story.js`:** Cicatrices y textos del Hechicero Abismo → Minas → Infernal.
- **`js/systems/difficulty.js`:** curva de dificultad de la posición 09.
- **`js/arenas/arena-rules.js`:** regla "La Oscuridad Avanza".
- **`js/storage/save.js`:** migración `minasV1`.
- **`js/data/codex-content.js`:** 7 criaturas, 2 jefes y lore de la arena.
- **`js/assets/asset-manifest.js`** e **`index.html`**.

## 4. Sistemas

### Sectores y descenso
- Cada sector es una "sala" propia en el mismo espacio de coordenadas (2200 × 1520 u). Tiene:
  - geometría propia (masas de roca, pilares, vías, túneles de aparición);
  - paleta, piso y oscuridad base propios.
- El descenso ocurre al empezar el nivel que cambia de sector:
  - Hay un fundido de 2,6 s y a mitad del fundido se cambia la geometría.
  - Mueren los enemigos comunes que quedaban.
  - Los guardianes aparecen en la entrada.
  - Se muestra el cartel "SECTOR · −N m".
- La navegación se reconstruye con la geometría del sector; lo que queda fuera de los límites se dibuja como roca.

### Luz
- **Fuentes por sector:**
  - faroles (superior, galerías);
  - cristales (vetas);
  - braseros (corrompida, profundidades, umbral);
  - núcleos de luz.
- Cada fuente tiene energía, estado y radio. La regla "La Oscuridad Avanza" acelera la pérdida.
- **Oscuridad:**
  - Máscara a 1/4 de resolución con "agujeros" radiales por cada luz y antorcha.
  - El portal abierto y el fuego también iluminan.
  - Tope de 80 % de oscuridad: nunca negro total.
  - Los avisos, proyectiles, ojos brillantes y el fuego se dibujan **encima** de la máscara, para que ningún
    golpe llegue sin aviso.
- **Antorcha personal:** 150 u. El Escupidor puede **sofocarla** por 6 s (radio 70 u).
- **Zonas de oscuridad** (Escupidor): manchas de 130 u que anulan la luz por 7 s (máximo 4).
- **Bots:**
  - evitan quedarse a oscuras;
  - vuelven a la luz;
  - encienden fuentes con la misma acción contextual;
  - priorizan al Devoraluz y al Consumidor que está drenando una luz.

### Enemigos
| Enemigo | Rol | Qué hace |
|---|---|---|
| Esclavo Enlazado | común | Arremetida con aviso; en grupo. |
| Insecto de Cristal | enjambre | Sale de las paredes en grupos de 3; al morir suelta una esquirla. |
| Acechador Ciego | cazador | Se esconde en la oscuridad (casi invisible) y embosca con aviso en el piso. |
| Minero Corrompido | élite | Golpe de área que **daña luces**; tira luz robada. |
| Escupidor de Oscuridad | a distancia | Marca una línea y escupe oscuridad: crea zonas y sofoca antorchas. |
| Consumidor Luminoso | élite | **Drena** una luz y da un aura que acelera y fortalece a la Horda; al morir **libera** la luz (reenciende 2 y cura). |
| Devoraluz | evento élite | Ver §1.5. |

Oleadas: de a poco (Esclavos → Insectos → Acechadores 3+ → Mineros 4+ → Escupidores 5+ → Consumidores 6+), con
topes por tipo. Durante los jefes solo aparecen esbirros.

### Jefes
- **Titán de Piedra (subjefe, nivel 8)**:
  - 2600 de vida base (escala por equipo con `scaleBossStats`).
  - Ataques: golpe (150 u), temblor, lanzamiento de roca, lluvia de rocas, pisotón que apaga luces (230 u) y
    derrumbes (escombros que bloquean 10 s).
  - Fase 2 al 50 %.
- **Cerbero (jefe, nivel 10)**:
  - 6200 de vida base.
  - Preludio de 6,2 s con cadenas y triple rugido; entrada con `bossEntrance` y guía de jefe.
  - Tres actos (66 % y 33 %). Todos sus golpes fuertes avisan (cono, círculo, línea).
  - Muerte en 3 tiempos: cae, arde y se deshace; después se abre el portal.
  - **No es uno de los Cuatro Guardianes:** "Guardián del Umbral" es su título. Así quedó en el Códice y en la
    Lore Bible.

### Red
- Anfitrión autoritativo.
- `netState` lleva:
  - sector y descenso;
  - luces (estado, energía, devorada);
  - zonas, proyectiles y avisos;
  - Devoraluz;
  - estado del Titán, de Cerbero y del portal.
- El invitado solo anima relojes.
- ENCENDER y ATRAVESAR pasan por `ctxNetMsg`: el anfitrión valida la distancia, el tipo de jugador y el estado.
- Claves internas que no viajan: `amb`, `lWind`, `acCd`, `breathCd`, `_grp`, `atkCd2`.

### Campaña, guardados y Códice
- **Orden nuevo:** Ciudad 01 · Fábrica 02 · Ruinas 03 · Fúngico 04 · Gélida 05 · Acuática 06 · **Laberinto 07** ·
  **Abismo 08** · **Minas 09** · Infernal 10.
- **Migración `minasV1`:** quien ya tenía abierta la Infernal (por haber completado el Abismo con el orden
  anterior) **la conserva** vía `legacyOpenArenas`; nadie pierde arenas.
- **Códice:** 7 criaturas con retrato recortado de la hoja, Titán (subjefe) y Cerbero (jefe) con lore, y la
  ficha de la arena con su imagen.
- **Historia:** el Abismo nombra las minas y la puerta. Al atravesar el Umbral el Hechicero dice "Ya no hay
  vuelta atrás. Te espero en el corazón del Infierno."

## 5. Arte

- **Hojas:** `art-source/minas/{enemigos1,enemigos2,jefes,mapa}.png`.
- **Recortador:**
  - clasifica el fondo a cuadros **por hoja** (rangos de gris propios) con relleno desde el borde;
  - recorta 2 px de borde de panel;
  - quita el halo marrón solo en las celdas de Cerbero.
- **Resultado:**
  - 9 atlas de enemigo (1,1 MB);
  - 16 efectos (rayo y zona de oscuridad, estallido, drenaje, aura, aliento del Devoraluz, apagón, temblor,
    línea de rocas, meteoro, derrumbe, fuego, pisotón, aullido, invocación);
  - piezas del mapa (lámparas, cristales, andamio, puente, rieles, núcleo, pozo, gas, estalactita);
  - 11 retratos del Códice.
- **Dibujado por código:**
  - el Portal Infernal (óvalo de fuego vectorial con espirales, borde incandescente y lenguas de fuego);
  - las cadenas de Cerbero, el arco del Umbral y la jaula del montacargas.
- **Pisos:** procedurales con las paletas del mapa (`floor.py`). La baldosa "suelo mina" de la hoja tenía brillo
  de lava y no se repetía bien.

## 6. Pruebas

| Prueba | Resultado |
|---|---|
| `tools/minas/smoke.js` | **29/29**, 0 errores de JS (luz, descenso, 6 enemigos, Devoraluz elegir / interrumpir / devorar / devolver, Titán, Cerbero actos 1-3, casos A B C E F G + G0) |
| `tools/net-test/minas_coop.js` | **12/12** (mismo sector y luces en el invitado, el invitado reenciende, D0, D, E, sin errores) |
| Regresión `tools/items/t_*.js` (19 archivos) | Todas OK. `t_campaign` y `t_abismo` se actualizaron al orden nuevo (Minas 09, Guardianes en 03/05/07/10) |
| Humo de otras arenas (Micelial, Fábrica, Ciudad) | OK, 0 errores |
| Red: `ciudad_coop`, `lobby_code_skins`, `campaign-gate` | OK. `campaign-gate` ya estaba desactualizada en main (esperaba el orden de antes de la Ciudad); se pasó al canon actual y ahora verifica también Abismo → Minas → Infernal |

Arreglos que salieron de probar:
- La franja negra al pie de la pantalla eran los bordes fuera del mapa. Ahora se dibuja roca y se movieron la
  entrada y la salida.
- El retraso de las pistas al cambiar de sector.
- El HUD "A OSCURAS" en el invitado.
- El portal pixelado en bloques se rehízo, y un error de radio negativo en sus primeros cuadros cortaba el
  dibujo del frame.
- El portal abierto ahora cuenta como luz.

## 7. Pendientes conocidos
- Arte propio del portal, la puerta, las cadenas, el lanzallamas y el brasero, y el autotile de roca (P0 en
  `LA_HORDA_MINES_MISSING_ASSETS.md`). Hoy las masas de roca se ven algo "de ladrillo" por la textura de la hoja.
- Ciclos de caminata por dirección (las hojas traen perfil).
- Audio real para los 32 ganchos (hoy es sintetizado).
