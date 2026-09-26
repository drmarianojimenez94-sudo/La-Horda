# LA HORDA — Entrega Alpha 0.1

Rama: `claude/horda-latest-updates-gv4tlf` (mergeada a `main`).
Para jugarla: <https://raw.githack.com/drmarianojimenez94-sudo/La-Horda/main/index.html>
(el modo prueba sigue activo: todos los campeones y arenas liberados).

Documentos:

- `LA_HORDA_PLAYTEST_REPORT.md`
- `LA_HORDA_MISSING_ASSETS.md` (con prompts P0/P1)
- `LA_HORDA_ALPHA_READINESS.md`
- `docs/LA_HORDA_ABILITY_MATRIX.md`
- `docs/arena-identity/*.md`

## A. Qué cambió en el juego (resumen)

- **Acción contextual** (`js/systems/context-actions.js`).
  - Un solo botón "usar": el de Revivir, que sigue teniendo prioridad. En escritorio, tecla E.
  - Progreso host-autoritativo; cooperar acelera.
  - Los bots la usan y llegan por el camino de la grilla.
  - Aviso y barra en el mundo; flechas al borde hacia objetivos importantes.
- **Extensiones de identidad** (`ARENA_EXT`) para las 5 arenas del camino de siempre, sin tocar su geometría, subjefes ni navegación:
  - **Ruinas:** runas en los menhires (usar el escenario contra la horda) y emboscadas avisadas.
  - **Acuática:** corrientes (lineal, remolino, anillo, chorro) y charcos conductores.
  - **Gélida:** frío por quietud y braseros que se apagan y se reencienden (también con fuego).
  - **Laberinto:** sellos I-II-III en orden.
  - **Infernal:** fisuras-portal que crecen; cerrarlas cuesta. ¿Mato o cierro?
- **Etiquetas ambientales** (`js/systems/env-tags.js`): el fuego enciende braseros y quema la maleza de las emboscadas, el hielo enfría fisuras y el rayo conduce en los charcos. Las emiten habilidades reales del Mago.
- **Tutorial jugable**: la voz del Hechicero (`js/systems/tutorial.js`). No bloquea nada y cada concepto se enseña una vez.
- **Narrativa**: "Tres cayeron…" al entrar a la Infernal y el mural de los Cuatro (foreshadowing, arte provisorio).
- **Sala**: cartel visible cuando falla la conexión.

## F. Archivos modificados (contra `main`)

**Nuevos:**

| Área | Archivos |
|---|---|
| Sistemas | `js/systems/context-actions.js`, `js/systems/env-tags.js`, `js/systems/tutorial.js` |
| Arenas | `js/arenas/infernal/inf-fissures.js`, `js/arenas/hielo/hie-cold.js`, `js/arenas/bosque/bos-ruins.js`, `js/arenas/acuatica/acu-currents.js`, `js/arenas/laberinto/lab-seals.js` |
| Pruebas | `tools/identity/t_identity.js`, `tools/identity/t_identity_net.js`, `tools/identity/shots.js` |
| Documentos | `LA_HORDA_*.md` (4), `docs/LA_HORDA_ABILITY_MATRIX.md` |

**Modificados (motor, cambios chicos y comentados):**

| Archivo | Cambio |
|---|---|
| `js/arenas/common/arena-registry.js` | Registro `ARENA_EXT`. `arenaDef()` no cambia. |
| `js/core/input.js` | Botón contextual. |
| `js/core/update.js` | `ctxUpdate`. |
| `js/net/net-game.js` | Mensaje `ctx` y claves internas. |
| `js/net/net-lobby.js` | Cartel de conexión. |
| `js/ai/bot-brain.js` | `botNudge` y objetivo contextual. |
| `js/ai/allies.js` | Respeta el camino propio del bot. |
| `js/rendering/renderer.js` | `drawGround`, `ctxDraw` y `ctxDrawScreen`. |
| `js/skills/abilities.js` | El Mago emite etiquetas ambientales. |
| `js/arenas/acuatica.js` | Invitados sin corrección en cadena; anguila en charco. |
| `js/ui/hud.js` | `tutTick`. |
| `css/hud.css` | Botón contextual y cuadro del Hechicero. |
| `index.html` | Nuevos `<script>` y `#tut-panel`. |
| `tools/micelial/t_micelial.js`, `tools/playtest/campaign.js` | Corren en modo campaña real. |
| `docs/arena-identity/*` | Fichas actualizadas. |

## G. Bugs corregidos

| # | Tipo | Bug | Cómo se encontró |
|---|---|---|---|
| 1 | MULTIPLAYER ISSUE | La **Corriente Profunda** de la Acuática (previa) empujaba a los invitados desde el anfitrión y provocaba correcciones de posición a cada cuadro. Ahora el invitado se empuja solo (predicción). | Al diseñar las corrientes; probado con `NET.acuatica.sin_correcciones_en_cadena`. |
| 2 | BOT/AI ISSUE | Los bots salían a encender braseros e ir a sellos aunque no valiera la pena (valor mínimo) y dejaban solo al jugador. | A/B de la campaña simulada en el Hielo. |
| 3 | BOT/AI ISSUE | Los bots cuerpo a cuerpo "giraban para no enfriarse", se alejaban del enemigo y dejaban de tanquear. | Investigando por qué el Mago perdía más en el Hielo. |
| 4 | BOT/AI ISSUE | Los bots se trababan contra las puntas de los muros del Laberinto yendo a un sello. Se resolvió con obstáculos inflados y avance medido por el camino. | Prueba `LAB.los_bots_resuelven_en_orden` intermitente → 3 rondas de diagnóstico con depuración de distribuciones aleatorias. |
| 5 | CODE BUG | Gélida: el calor derretía la escarcha pero podía dejar las cargas "colgadas" (el temporizador llegaba a 0 sin reiniciarlas). | `HIE.el_brasero_calienta_y_derrite`. |
| 6 | BALANCE ISSUE | Gélida: la primera versión del frío congelaba sola y empeoraba la pared de la campaña. | Campaña simulada (Cazadora: 22 intentos). |
| 7 | CODE BUG | La runa del Bosque multiplicaba su daño por críticos y procs del jugador (ahora es daño ambiental fijo). | Prueba del jefe. |
| 8 | UI/UX ISSUE | El cuadro del Hechicero tapaba al campeón en pantallas de celular (se movió abajo y se compactó). Chevrones de corriente e zonas de calor poco visibles sobre el piso claro. Sellos chicos. | Capturas a 844×390. |
| 9 | UI/UX ISSUE | Faltaba un cartel visible cuando falla la conexión en la Sala (pendiente previo MC6). | Prueba con servidor caído. |
| 10 | CODE BUG (pruebas) | `t_micelial` y la simulación de campaña corrían con el "modo prueba" (todo liberado) y un chequeo de guardado fallaba. | Regresión. |

## H. Bugs y pendientes

| Tipo | Pendiente |
|---|---|
| BALANCE ISSUE | **La Gélida es la pared de la campaña** (previo). A nivel 30: vieja 10/18, nueva 7/18 (no concluyente). Requiere decisión de diseño sobre el roster de proyectiles, la Nova y el jefe. |
| DESIGN ISSUE | La curva está despareja: las arenas 1-4 se pasan en 1-2 intentos. |
| ASSET MISSING | El Hechicero y el Demonio de la Horda (P0): sin ellos no hay jefe final. Todo el arte de las mecánicas nuevas es provisorio (P1). Tres jefes con un solo frame (P1). |
| DESIGN ISSUE | Ciudad Maldita, Abismo y Minas Profundas: **EN DESARROLLO**. Tampoco existen las 5 Pruebas de la Divina. |
| DESIGN ISSUE | El tutorial cubre 16 de los 18 conceptos del documento (faltan targeting y XP). |
| BOT/AI ISSUE | El piloto automático de la simulación no usa las mecánicas nuevas, así que las simulaciones subestiman el poder del jugador que las usa. |
| CODE BUG (flake preexistente) | `BOTS.vuelven_a_la_zona_segura` (Micelial) falla a veces porque `botDangerVec` suma avisos aleatorios que siguen activos. |
| UI/UX ISSUE | Íconos de estado sobre los enemigos. |
| DESIGN ISSUE | "Ocultamiento" de héroes en la maleza (Ruinas): propuesto, no implementado. |

## I. Arenas testeadas

| Arena | Qué se ejecutó |
|---|---|
| Ruinas del Bosque | Progresión ×3, identidad (runas, emboscadas, fuego), red de 2 |
| Arena Acuática | Progresión ×3, identidad (5 tipos de zona, anguila, rayo), red de 2 |
| La Fortaleza Sin Fin | Regresión 41/41, progresión ×3 |
| El Reino Micelial | `t_micelial`, progresión ×3 |
| Arena Gélida | Progresión ×3, A/B de 44+ partidas, identidad, red de 2, partidas instrumentadas |
| Laberinto Maldito | Progresión ×2, identidad (sellos, bots), red de 2 |
| Arena Infernal | Progresión ×2, A/B de 18, identidad (fisuras, mural), red de **4** |

## J. Arenas en desarrollo (no existen en el juego)

Ciudad Maldita · Abismo · Minas Profundas · Arena Divina (5 Pruebas; el asedio actual sigue igual) · Coliseo (próximamente, sin MOBA).

## K. Checklist de prueba manual (humanos, celular real)

**Primeros 10 minutos (persona nueva, en las Ruinas):**

- [ ] ¿Entiende el cuadro del Hechicero sin que le expliquen? ¿Lo lee o lo ignora?
- [ ] Moverse → atacar → habilidad: ¿la tilde verde aparece y el cuadro desaparece?
- [ ] ¿Descubre la runa verde? ¿Entiende que se usa con el botón de arriba ("Activar")?
- [ ] ¿La emboscada se siente avisada y justa?

**Botón contextual:**

- [ ] Arriba al centro: ¿se alcanza con el pulgar? ¿Tapa algo importante mientras cerrás una fisura?
- [ ] Revivir tiene prioridad: con un compañero caído al lado de una fisura, ¿el botón dice "Revivir"?
- [ ] Soltar el botón pausa el progreso (baja de a poco) y alejarse lo corta.

**Por arena:**

- [ ] **Acuática:** ¿el control se siente justo cuando te arrastra una corriente? ¿Se lee el charco amarillo antes de la descarga?
- [ ] **Gélida:** quedate quieto 10 s: ¿aparecen el medidor ❄, la escarcha y el borde? ¿Se entiende el brasero? ¿El Muro de Fuego lo enciende?
- [ ] **Laberinto:** ¿se entiende "I → II → III"? ¿La flecha al borde ayuda a encontrar el siguiente sello?
- [ ] **Infernal:** ¿la fisura se distingue de las grietas del piso? ¿La decisión "¿mato o cierro?" se siente? ¿Alguien descubre el mural?

**Rendimiento y red:**

- [ ] Rendimiento en un iPhone y un Android de gama media con mucha horda y una fisura de etapa 3.
- [ ] **4 personas** en una sala real (datos móviles y Wi-Fi): cerrar una fisura juntos, encender un brasero, resolver sellos repartidos.
- [ ] Falla de conexión: crear una sala con el servidor dormido o sin red: ¿aparece el cartel grande?

## L. Estado multijugador

| | |
|---|---|
| **Probado (automático, relay real)** | Infernal con 4 jugadores: fisura igual en todos, el invitado cierra y el anfitrión lleva el progreso, soltar corta. Gélida, Acuática, Laberinto y Ruinas con 2: estado igual en todos y el invitado usa el botón contextual. Corriente sin correcciones en cadena. Ciclo completo de 4 navegadores ×3 rondas (revivir, derrota del equipo, volver a la misma sala, reintentar): 102 chequeos y 0 fallas. e2e: 0 fallas. Gate de campaña: 0 fallas. |
| **No probado** | Latencia real, pérdida de paquetes, celulares, desconexión a mitad de una acción contextual. Por diseño, desconectarse suelta la acción: `_ctxHold` se limpia al reemplazar al invitado por un bot. |
| **Requiere humanos** | Todo lo de la sección K "Rendimiento y red". |
