# LA HORDA — Auditoría de combate

> Rama `claude/horda-latest-updates-gv4tlf`. Primero se auditó lo que ya existía (para no duplicar sistemas),
> después se implementó y se midió. Todo lo medido corrió en Chromium sin GPU (Playwright) con el código real
> del juego. Lo que depende de sensaciones humanas o de un celular real está marcado **HUMAN TEST REQUIRED**.

## 1. Qué había antes (auditoría inicial)

| Área | Estado encontrado | Decisión |
|---|---|---|
| Impacto | Hit-stop, cámara lenta y retroceso en `feedback.js`, sin jerarquía clara entre básico, habilidad, crítico y ulti. | Se reorganizó en **4 niveles** en el mismo archivo (no se creó otro sistema). |
| Muertes | Pool de "dying" con 4 estilos (caer, desplomarse, disolverse, hundirse). Sin sangre ni cadáveres persistentes. | Se extendió el mismo pool (tipo de muerte + cadáver) y se sumó `gore.js` solo para manchas/cadáveres. |
| Estados | Quemadura, lentitud, sangrado, aturdido, escarcha, maldición y electrizado ya existían. Sin interacción entre ellos. | Se agregaron **reacciones** en un módulo aparte (`reactions.js`) que lee los campos de siempre. |
| Tipos de daño | `env-tags.js` definía tipos y etiquetas ambientales, solo emitidas por el Mago. | Se reusaron: resistencias por arena y destructibles escuchan las mismas etiquetas. |
| Enemigos | IA por familia y por arena; élites y jefes con patrones. Ningún "rol" (sanador, invocador...). | `enemy-roles.js`: los roles son afijos sobre enemigos comunes, no enemigos nuevos. |
| Nigromante | Botón de invocar esqueletos, Explosión de Cadáver implícita. | Rediseño: esqueletos pasivos desde cadáveres, Cosecha de Almas, gólem de carne, **sin explosión de cadáver**. |
| Fuego amigo | Ya desactivado (regla PvE, N6). | Se mantuvo: todo lo nuevo (reacciones, destructibles, suicida) daña solo a la horda o solo a los héroes según quién lo origine. |
| Colisiones | Muros del Laberinto, capullo del Micelial y obstáculos de arena sólidos. Hongos grandes del Micelial **atravesables**. | Hongos grandes sólidos (ver §6). |
| Avisos | `vfxTelegraph` / `bossWindup` / `bossStrike` comunes. Duraciones dispersas. | Auditoría de duraciones y un solo ataque fuera de norma corregido; la picada del Dragón de Bronce no avisaba. |

## 2. Jerarquía de impacto (4 niveles)

| Nivel | Qué lo produce | Hit-stop | Retroceso | Tambaleo | Sangre |
|---|---|---|---|---|---|
| 1 | Básico | no (solo peso del Tanque/Segador: leve temblor) | chico | corto | salpicadura mínima |
| 2 | Habilidad | 1 micro hit-stop **por lanzamiento** (no por enemigo) | medio | medio | salpicadura |
| 3 | Crítico / golpe pesado | 36–50 ms × peso del campeón | grande | largo (no a élites) | salpicadura + mancha |
| 4 | Ulti | 85 ms + cámara lenta + temblor una vez por ulti | máximo | — | trozos |

- Jefes y subjefes no reciben retroceso ni tambaleo; los élites reciben 45% del retroceso y ningún tambaleo (un
  crítico no les cancela el ataque telegrafiado).
- `IMPACT_WEIGHT` por campeón: el Tanque, el Segador y el titán de Eren pegan "más pesado".

## 3. Gore dark-fantasy (pixel)

- **Manchas** por material (sangre, icor, hueso, escarcha, ceniza, esporas) y **cadáveres** que quedan en el
  suelo y se desvanecen. Presupuesto: celular 90 manchas / 18 cadáveres; escritorio 170 / 34.
- **Muertes por tipo de daño:** quemado (se carboniza), congelado (queda como estatua), electrocutado (destellos),
  desmembrado (trozos en impactos 3–4).
- Los cadáveres son **recursos**: el Nigromante los usa para esqueletos y el gólem; el Resucitador enemigo compite
  por ellos.
- **Rendimiento (medido):** cada cadáver redibujaba el cuerpo completo cada cuadro (con `ctx.filter` si murió
  quemado). En el Micelial nivel 9 el dibujo pasó de 11 ms a 50 ms. Se hornean una vez en un canvas chico:
  **vuelve a 11 ms** (igual que antes del gore). Además hay un tope de cuerpos con filtro de quemado por cuadro.

## 4. Estados, reacciones y resistencias

| Reacción | Condición | Efecto |
|---|---|---|
| Conducción | rayo sobre un enemigo **mojado** | +25% y el rayo salta a los mojados cercanos (aturde) |
| Quiebre | golpe pesado sobre un **congelado** | +80% y esquirlas alrededor |
| Vapor | fuego sobre un congelado o muy ralentizado | +50%, lo descongela y lo deja **mojado** (encadena con Conducción) |
| Hemorragia | golpe pesado sobre un **sangrante** | el sangrado restante entra de golpe (+50%) |

- Si el estado lo puso un compañero y la reacción la dispara otro: "¡COMBO DE EQUIPO!" (se cuenta en las stats).
- **Arreglos encontrados con pruebas:** Hemorragia y Quiebre consumían el estado en el golpe que ya mataba, y eso
  le robaba el "matar sangrantes/congelados" a los míticos Cosecha Roja e Invierno. Ahora un golpe letal no los gasta.
- Resistencias por arena (Gélida resiste hielo y teme al fuego, Infernal al revés, Acuática débil al rayo...) y por
  tipo (gólems resisten físico, esqueletos el sangrado). Los héroes resisten con objetos (`res_fire`, `res_ice`...).

## 5. Roles enemigos y lenguaje de prioridad

| Rol | Qué hace | Cómo se contrarresta |
|---|---|---|
| Sanador | cura 8% cada 2,4 s a la horda cercana | matarlo primero (flecha en el borde si está fuera de cámara) |
| Resucitador | levanta hasta 3 cadáveres (sin XP) | matarlo o que el Nigromante use los cadáveres antes |
| Invocador | abre grietas: 2 refuerzos cada 6,5 s (tope 6) | aviso de 0,7 s; cerrar la fuente |
| Protector | los cercanos reciben 40% menos daño (lazos visibles) | romper al protector |
| Carcelero | marca el suelo bajo un héroe (0,9 s) y lo enraíza | salir de la marca |
| Cazador | rápido, persigue al más frágil (mago/soporte herido) | protegerse en grupo |
| Suicida | se planta, parpadea 0,9 s y explota (también lastima a la horda) | alejarse |
| Comandante | +25% daño y +15% velocidad a la horda cercana; al morir la horda duda | matarlo |
| Artillero | bombardea 2 zonas con aviso de 1 s | leer el suelo |

- Lenguaje visual común: **insignia en rombo** con el ícono + **anillo del color del rol**; aviso del Hechicero y
  sonido la primera vez que aparece cada rol en el nivel.
- Pool por arena según su identidad; nivel 1–2 sin roles; tope simultáneo 1→5 según el nivel; suicidas máx. 3.
- Los bots priorizan a los de apoyo (sanador, resucitador, invocador, comandante) como a un élite.

## 6. Colisiones (auditoría de "muros de hongos")

- **Problema:** en el Reino Micelial las hileras de hongos grandes, las lámparas altas, los pilares y los hongos
  gigantes de la Madre se veían como paredes pero se atravesaban.
- **Arreglo:** chocan en la base del tallo (héroes y enemigos). El alcance máximo de cada hongo deja siempre un paso:
  separación mínima medida **60 u** entre dos hongos sólidos; flood-fill del área caminable: **100% conexo**.
- **Laberinto:** los sellos podían caer en bolsillos que los bots nunca alcanzaban (el test fallaba 1 de cada 7).
  Ahora solo se colocan donde la grilla de los bots llega: 0 fallas en 20 corridas.
- **Emboscadas del Bosque:** a veces quedaba un solo punto (los reintentos repetían el ángulo). Ahora el abanico se abre.

## 7. Avisos (telegraphs)

- Norma: ataque rápido 0,4–0,7 s · élite/rol 1 s · jefe grande 1,5–2 s. Los avisos del escenario (puentes, forja,
  emboscadas) pueden durar más.
- Relevadas 35 duraciones de aviso. Fuera de norma: el salto del Sabueso micelial (260 ms → **420 ms**) y la picada
  del Dragón de Bronce de la Fortaleza (**no avisaba**; ahora línea de 0,45 s). Resultado medido con el piloto
  automático en la Fortaleza: ya no hay muertes en los niveles 1–2 con Axiom y Musashi (antes 3 de 8 corridas).

## 8. Campeones

- **Sin dash universal.** Cada campeón conserva su movilidad propia (Paso Fantasma de Musashi, ganchos de Eren...).
- **Identidad:** cada campeón tiene su forma de proyectil (flecha, daga, orbe, runa, glifo, alma, bala con humo,
  medialuna, bala pesada...) y su paleta de impacto.
- **Evolución de habilidades 1/3/5/7/10** (`skill-evolution.js`): Firma (estado propio del campeón) → Ímpetu
  (rematar recorta 25% el enfriamiento) → Resonancia (golpear a quien tiene tu firma estalla) → Forma final
  (cada 3er lanzamiento +50% poder y +20% área). Los tiers visuales usan los mismos hitos.
- **Nigromante:** esqueletos pasivos que se levantan de cadáveres; Almas (hasta 10) que suben el daño y pagan el
  Pacto (5 almas: la próxima habilidad sale potenciada); Cosecha de Almas (cono) y Gólem de Carne (más cadáveres =
  más vida; si ya existe, salta y aplasta); pieles de fuego/hielo. **Sin Explosión de Cadáver.**
- **Chequeo con datos** (piloto automático, 1 partida por celda, campeones nivel 10/20): ver
  `LA_HORDA_PLAYTEST_REPORT.md` §3. Segador, Soporte, Eren y Libertador ganan con más frecuencia; Axiom y Musashi
  (frágiles) son los que más sufren en la Fortaleza. **HUMAN TEST REQUIRED** para "peso" del Tanque y decisiones
  elementales del Mago.

## 9. Destrucción del entorno

- 3–5 objetos por nivel, uno temático por arena: urna de brasas (quema), cristal de escarcha (congela), ánfora de
  agua (moja), vaina de espinas (sangra), jarrón funerario (aturde, a veces suelta poción), barril de pólvora
  (empuja), vaina de esporas (ralentiza y daña). Se patean, se arman con un golpe cercano o con la etiqueta justa
  (el fuego prende el barril), avisan 0,7 s, **solo dañan a la horda** y encadenan entre sí. El ánfora + un rayo =
  Conducción. Los bots los patean si hay 3+ enemigos amontonados al lado.

## 10. Pruebas automáticas nuevas

| Archivo | Qué cubre | Resultado |
|---|---|---|
| `tools/items/t_roles.js` | 9 roles, topes, contramedidas, bots, partidas reales | 15/15 |
| `tools/items/t_pacing.js` | ritmo del nivel y curación de emergencia | 14/14 |
| `tools/items/t_evolution.js` | evolución 1/3/5/7/10 y proyectiles | 12/12 |
| `tools/items/t_collision.js` | hongos sólidos, sin bolsillos, nadie adentro | 7/7 |
| `tools/items/t_breakables.js` | destructibles, combos, sin fuego amigo, bots | 9/9 |
| `tools/items/t_perf_exploits.js` | anti-exploit de la calificación | 8/8 |
| `tools/items/t_reactions.js`, `t_nigromante.js`, `t_items.js` | reacciones, Nigromante, objetos | OK |
| `server/test-relay.js` | protocolo del relay + chat | 0 fallas |
