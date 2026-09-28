# LA HORDA — AUDITORÍA FINAL PRE-ALPHA

**Pregunta que guía todo el informe:**
*"Si mañana 20 jugadores que no conocen La Horda reciben el enlace, ¿qué impediría que entiendan,
jueguen, terminen una sesión y quieran volver?"*

Convenciones:
- **Prioridad:** P0 (bloquea la alfa) · P1 (se pierde gente) · P2 (molesta) · P3 (deuda / pulido).
- **Estado:** ARREGLADO (en esta auditoría, con regresión) · ABIERTO · DECISIÓN (toca economía,
  progresión o diseño: se documenta y no se cambia en silencio).
- **NOT VERIFIED IN RUNTIME:** no se pudo comprobar en este entorno. Nunca cuenta como aprobado.

Documentos hermanos:
- [`LA_HORDA_PLAYER_JOURNEY.md`](LA_HORDA_PLAYER_JOURNEY.md): minuto a minuto y puntos de abandono.
- [`LA_HORDA_ALPHA_CHECKLIST.md`](LA_HORDA_ALPHA_CHECKLIST.md): la lista para tildar.
- [`LA_HORDA_MISSING_ASSETS.md`](LA_HORDA_MISSING_ASSETS.md): el arte que falta, con prompts.

---

## 1. Resumen ejecutivo

La Horda **funciona**. En todos los recorridos probados hubo **0 errores de consola y 0 archivos
faltantes (404)**:
- título, primer guardián, menú, Códice y Tienda;
- Sala, partida, pausa, abandono, derrota y reintento;
- recarga con el progreso intacto.

El juego tiene identidad visual, 10 arenas con una regla propia cada una, 12 guardianes y jefes
con mecánica.

Lo que **impedía** una alfa con desconocidos era, sobre todo, que **el juego estaba en "modo prueba"
para cualquier perfil nuevo**:
- nivel 90, todas las arenas y todas las skins de entrada;
- sin el guardián de regalo y sin progresión.

Eso quedó **ARREGLADO**: ahora requiere `?dev=1`. Los perfiles que ya tenían esos regalos los conservan.

Además se arreglaron el prólogo que tapaba la pantalla en pleno combate, el joystick descentrado,
el botón "Comenzar" enterrado, la falta de ficha del Hechicero en la Arena 01, la lista de arenas
de 5 pantallas y los restos de herramientas de desarrollo visibles.

Lo que **queda abierto** para una alfa real:
1. **Verificar el relay público del multijugador.** Desde este entorno no se pudo llegar (NOT VERIFIED).
2. **El peso de la carga inicial:** 51 MB de imágenes antes de jugar.
3. **La dificultad y la duración de la Arena 01** para un perfil nuevo: nivel 9, entre 45 y 60 min
   hasta la primera victoria en simulación.
4. **La economía de "etapa de prueba":** 10.000 de oro y todo a 1.000. Es una DECISIÓN del dueño.

**ALPHA READINESS SCORE: 73 / 100** después de la segunda pasada (sección 27). Antes era 58 / 100 y, antes de
la primera auditoría, ~46 / 100. El multijugador publicado quedó verificado en vivo, la carga hasta el
título bajó de 52 s a 14 s y la Arena 01 se gana al primer intento en simulación. El detalle de la
primera pasada está en la sección 26.

## 2. Alcance y método

| Qué | Cómo | Resultado |
|---|---|---|
| Jugador nuevo | `tools/audit/journey.js`: perfil limpio, iPhone horizontal emulado, toques reales, capturas y botones visibles por paso | 7 recorridos |
| Primera partida en tiempo real | `tools/audit/play.js`: Tanque en la Ciudad, 150 s, una captura cada 15 s | nivel 5, 234 bajas, 0 errores |
| Campaña larga | `tools/playtest/campaign.js`: 3 progresiones desde un perfil vacío (Tanque, Mago, Cazadora) | 105 partidas |
| Campeones | 12 guardianes en la Ciudad (nivel 1) y en la Gélida (nivel 15) | 24 partidas |
| Regresión | `tools/items/t_*.js` (18 suites), smokes de 4 arenas, `tools/bosses/boss_rules.js`, identidad, red contra el relay local | ver la sección 24 |
| Estático | Referencias rotas, assets sin uso, TODO/FIXME, código muerto | ver las secciones 4 y 5 |

**Lo que este entorno NO puede verificar:**
- el **audio** (no hay parlantes);
- la **sensación** de golpe con un dedo real;
- el **rendimiento en un iPhone físico**;
- el **relay público** (el proxy del entorno bloquea `la-horda-relay.onrender.com`);
- la **carga por red móvil real**.

Todo eso figura como **NOT VERIFIED IN RUNTIME**.

## 3. Estado del repositorio

- **Stack:** HTML5 y Canvas 2D, JavaScript sin dependencias ni paso de build, con **210 `<script>`** en
  orden y ámbito global. Se sirve estático (GitHub Pages). El multijugador pasa por un relay WebSocket en `server/relay.js`.
- **Tamaño:** `js/` 3,5 MB · `css/` 132 KB · `assets/` 59 MB (la precarga pide 1.366 imágenes, 50,9 MB).
- **Sistemas activos:**
  - campaña de 10 arenas, más la Arena Divina (asedio 4v4, "prototipo");
  - 12 guardianes, talentos y maestrías;
  - objetos: rarezas, sets, legendarios, míticos con receta, Únicos y Gemas;
  - Códice y Tienda;
  - cooperativo online de hasta 4 guardianes, con chat;
  - tutorial del Hechicero y reglas de jefe (`boss-encounter.js`).
- **Sistemas abandonados o apagados:**
  - `PLAYTEST_UNLOCK_ALL` (siempre `false`: código muerto);
  - el Coliseo ("próximamente": tarjeta visible, bien marcada).
- **Documentación:** más de 30 `.md` en la raíz, muchos parciales o superpuestos (P3).

## 4. Código muerto, duplicado y deuda

| # | Hallazgo | Prioridad | Estado |
|---|---|---|---|
| 4.1 | `applyPlaytestUnlock` / `PLAYTEST_UNLOCK_ALL=false`: rama que nunca corre | P3 | ABIERTO (inofensivo) |
| 4.2 | La compra de skin está duplicada en `js/ui/menus.js` y `js/ui/shop-ui.js` (mismo `confirm` y misma lógica) | P3 | ABIERTO |
| 4.3 | Los `confirm()` y `alert()` nativos del navegador (abandonar, vender, fabricar, cerrar sala) funcionan en iOS, pero rompen la estética | P2 | ABIERTO |
| 4.4 | No hay TODO ni FIXME reales pendientes en el código del juego | — | OK |
| 4.5 | Mucho estado global (210 scripts). Funciona, pero cada cambio exige regresión amplia | P3 | Conocido (`MODULARIZATION_FOLLOWUPS.md`) |

## 5. Assets: rotos, sin uso, placeholders

- **Referencias rotas:** 0. Las 1.366 rutas del manifiesto existen y no hubo 404 en ningún recorrido.
- **Sin uso:** 4 íconos en `assets/.../profeta/unused-skill-icons` (P3).
- **Placeholders feos:** ninguno en pantalla. Lo que falta está dibujado con código de forma digna y
  catalogado en `LA_HORDA_MISSING_ASSETS.md` (INCOMPLETO / FALTANTE, con prompts).
- **Arte a mejorar (P0 de arte, no bloquea jugar):**
  - Cerbero (frames de ≈54×67 que se ven en bloque al escalar);
  - la pared agrietada del Laberinto (procedural);
  - el Ángel Corrompido (recoloreado del Hechicero).

## 6. Errores de consola y de red

- **0 `pageerror`, 0 `console.error`, 0 respuestas ≥ 400** en los 7 recorridos del jugador nuevo y
  en las 129 partidas simuladas (campo `errors` vacío en todas).
- El relay local (`PORT=8799 node server/relay.js`) no mostró errores durante las pruebas de red.

## 7. Persistencia

Verificado en runtime:
- Elegir guardián, jugar, abandonar y **recargar** conserva el guardián elegido, su XP, el oro, el
  prólogo visto y las arenas.
- Morir aplica la penalización (-50 % de lo ganado en la partida) y se guarda.
- Los guardados viejos que ya recibieron el modo prueba lo conservan: sus marcas `testUnlock90V1` y
  `testSkinsV1` siguen en el guardado.
- Un perfil **nuevo** ya no los recibe.
- Exportar e importar por código existen (no se volvieron a probar en esta pasada: cubiertos por
  suites anteriores).

## 8. Responsive y móvil (iPhone horizontal)

| Pantalla | Antes | Ahora |
|---|---|---|
| Título | OK, con % de carga | igual |
| Primer guardián | OK | igual |
| Elegir arena | 1 tarjeta por pantalla (≈5,5 pantallas de scroll) | **2 columnas** en celulares apaisados |
| Elegir guardián | sin rol; subtítulo "HORDE SURVIVAL" en inglés | muestra el **rol**; subtítulo en español |
| Sala | "Comenzar" abajo de ~4 pantallas | "Comenzar" **fijo abajo** |
| Partida: joystick | perilla corrida 25 px hacia afuera, medio cortada | **centrada** (bug de anclaje CSS) |
| Partida: prólogo | cuadro de 70 palabras a media pantalla, en combate | página previa del Hechicero, con la partida quieta |
| Botón "B1" | visible arriba al centro, pisaba títulos | oculto (solo con `?debug=1` / `?dev=1`) |
| Vertical | aviso "girá el teléfono" | igual (OK) |

**Pendiente (P2):**
- los sprites de la selección de guardián son chicos;
- en la Sala, el "Comenzar" fijo tapa los nombres de los lugares mientras se está arriba de todo (se eligió que el botón esté siempre a mano).

## 9. Singleplayer vs multiplayer

| Tema | Solo | Online | Nota |
|---|---|---|---|
| Ficha del Hechicero antes de jugar | sí | **no** (bloquearía a los demás) | por diseño |
| Prólogo de la campaña | página previa (nuevo) | sigue apareciendo en el panel del tutorial a los 5,6 s de partida | P2 ABIERTO |
| Pausa | sí | no (el texto ahora lo dice claro: "En las partidas online no hay pausa") | OK |
| Refuerzos entre niveles | elige uno | votación del equipo | OK |
| Fuego amigo | apagado | apagado (`arena_pve.friendlyFire=false`) | MUST NOT respetado |

## 10. Primera experiencia (resumen)

El detalle está en `LA_HORDA_PLAYER_JOURNEY.md`.
- **Punto fuerte:** título y "Tu primer guardián".
- **Punto débil:** la carga de 51 MB y el muro del nivel 9 de la Arena 01.

Los primeros 2 minutos ahora son limpios:
1. elegir guardián;
2. la Sala;
3. el prólogo;
4. la ficha;
5. el primer combate con un tutorial por pasos.

## 11. Gameplay: la cadena "ATAQUÉ → IMPACTÉ → HICE DAÑO → EL ENEMIGO REACCIONÓ"

- **Visible en las capturas:**
  - números de daño sobre el enemigo;
  - destello y retroceso al impactar;
  - barras de vida;
  - sangre y cadáveres por tipo de daño (G6);
  - golpes pesados con sacudida controlada.
- Las 18 suites de sistemas cubren las reacciones (mojado + rayo, congelado + pesado, fuego sobre
  congelado, sangrado), la penetración y los roles enemigos: **todas OK**.
- **NOT VERIFIED IN RUNTIME:** la sensación con el dedo (latencia percibida, peso del golpe) y el audio de impacto.

## 12. Enemigos

- Cada arena tiene 6 enemigos propios con IA, más roles transversales: sanador, resucitador,
  invocador, protector, carcelero, cazador, suicida y comandante.
- En la Ciudad, el **saqueador** es el que más mata en el nivel 9 (simulación) y el que más pesa en
  el "muro" de la Arena 01.
- Riesgo P2: **Axiom tiene 89 de vida en nivel 1** y murió en el **nivel 2 a los 52 s** en simulación.
  Es balance de guardián (DECISIÓN): hay que confirmarlo con humanos.

## 13. Las 10 arenas como campaña

"¿Qué tiene esta arena que ninguna otra tiene?"

| # | Arena | Lo único | Veredicto |
|---|---|---|---|
| 01 | Ciudad Maldita | **Civiles y estructuras**: decidir a quién salvar mientras todo cae. Derrota por ciudad caída. | Identidad fuerte. **El muro más duro de la campaña** para un perfil nuevo (ver la sección 16). |
| 02 | Fábrica Sin Fin | **Trampas mecánicas** en ciclo (vapor, rejillas, prensas, cadenas) y **puentes que se mueven**. | Buena. |
| 03 | Ruinas Célticas | **Regeneración** de la horda, **runas** que atrapan y emboscadas en la maleza. Primer Guardián. | Buena. |
| 04 | Reino Fúngico | **Infección territorial**: el mapa se pierde si no rompés los núcleos. | Muy buena. |
| 05 | Gélida | **Quedarte quieto te congela**; braseros; Gran Helada. | Buena. |
| 06 | Acuática | **Corrientes** que te mueven, charcos que conducen, Leviatán desde el borde. | Buena. |
| 07 | Laberinto | **Muros**, sellos en orden I→II→III, Minotauro contra la pared. | Buena. |
| 08 | Abismo | **El piso pelea**: plataformas que se agrietan y caen, colgarse y que te suban. | Muy buena. Segundo muro (Tanque: 4 intentos). |
| 09 | Minas | **La luz es territorio**; el Devoraluz; ganar es **cruzar el Portal**. | Muy buena. El piloto automático no cruza el portal (limitación de la herramienta); el humano sí (smoke A–G). |
| 10 | Infernal | **Fisuras** de donde sale la horda y el final de campaña en 3 formas. | **NOT VERIFIED IN RUNTIME** como tramo de campaña continua. Los jefes sí están cubiertos por `boss_rules.js`. |
| — | Divina (posjuego) | Asedio 4v4, marcado como "prototipo" | OK como extra. |

## 14. Jefes

- Los 10 jefes finales tienen **regla propia**, más una capa común: ventana EXPUESTO, escudo sin
  inmunidad, anti-kite, anti-facetank y limpieza al morir (PR #24). Lo cubren
  **`tools/bosses/boss_rules.js`** (101 checks) y los exploits 1–10.
- En simulación, el tiempo contra el jefe fue:
  - Ciudad: 38–104 s;
  - Fábrica: 70–381 s;
  - Ruinas, Fúngico, Gélida y Laberinto: 7–113 s;
  - Acuática: 56–315 s;
  - Abismo: 8–104 s;
  - Cerbero: 7–159 s.
- **Posible estancamiento (P1, NOT VERIFIED):** 2 de ~25 partidas de la Ciudad llegaron al tope de 22 min
  sin terminar. Una fue en el nivel 10, con El Presentador vivo; la otra fue Eren en el nivel 9.
  Puede ser el piloto (no reacciona al Gran Número) o una ventana que no se abre. Hay que verlo con
  una persona.

## 15. Guardianes (campeones)

- **12 jugables**, cada uno con 3 habilidades, ulti, talentos y bot propio.
- En la Ciudad, en nivel 1, ganaron 6 de 12: Tanque, Mago, Segador, Profeta, Libertador y Nigromante.
  Perdieron 5 (Cazadora, Asesino, Musashi y Soporte, más Axiom en el nivel 2). Eren no terminó.
- Hay dispersión, pero no hay un guardián "roto". Axiom es el más frágil al empezar (P2, DECISIÓN).
- La identidad de cada guardián no se tocó.

## 16. Progresión

- XP rápida al principio y lenta al final. La simulación termina la campaña (Minas) cerca del
  nivel 40–46: coincide con la meta "~40 al terminar la campaña".
- **P1 ABIERTO (DECISIÓN): la Arena 01 es la más dura para un perfil nuevo.**
  - 4 derrotas antes de ganar con Tanque y con Mago (≈45–60 min acumulados).
  - Después de la Ciudad, casi todo se gana al primer intento.
  - **Propuesta, sin aplicar:** bajar un 15–20 % la presión del nivel 9 **solo** en la Arena 01, o
    guardar un punto de control en el nivel 6 **solo** en la Ciudad. Conviene confirmarlo antes
    con 3–5 personas reales.
- Penalización por derrota: -50 % de lo ganado en la partida. Está bien comunicada en la pantalla de derrota.

## 17. Economía

- **Estado actual (pedido del dueño, "etapa de prueba"):** 10.000 de oro una vez y **todo** a 1.000 en
  la Tienda: guardianes, skins, objetos, sets, legendarios, míticos y **Únicos**.
- **Efecto medido:** un jugador nuevo puede comprar 9 guardianes, o el mejor equipo del juego, en
  2 minutos. La curva de loot (pity, legendarios, recetas de míticos) pierde su sentido.
- **Riesgo de diseño:** los Únicos se pueden comprar. No es "fabricarlos" (MUST NOT respetado: no hay
  receta de Únicos, y `makeItem` nunca genera Únicos), pero les quita la exclusividad.
- **DECISIÓN (sin cambiar):** para la alfa con desconocidos se recomienda una de estas dos:
  - **A.** Quitar Míticos y Únicos de la Tienda.
  - **B.** Precios por rareza (por ejemplo, guardián 5.000 como en G4) y mantener los 10.000 de regalo.

  El texto "Etapa de prueba" es aceptable si la alfa se presenta como prueba.

## 18. Loot e ítems

- Rarezas, sets por guardián, afinidad por arena, pity, legendarios con nombre, míticos por receta,
  Gemas para subir el nivel de un objeto, y un objeto garantizado al perder desde el nivel 6.
- Suites `t_items`, `t_itemization`, `t_sets`, `t_breakables` y `t_campaign`: **OK**.
- La ceremonia del cofre y el panel de sets existen. El drop en la simulación fue de 1–3 objetos por partida ganada.

## 19. Multijugador (CRÍTICO)

| Prueba (relay local, Chromium independientes) | Resultado |
|---|---|
| `campaign-gate` (una sala online no saltea la campaña; perfil real, sin modo desarrollador) | **OK** (0 fallas) |
| `lobby_code_skins mobile` (iPhone): unirse con código, código inválido o inexistente, sala llena, copiar código, scroll táctil, skin comprada autoequipada y visible para todos, partida, revivir, reconexión, recarga | **OK** |
| `lobby_code_skins desktop` | **OK** |
| `disconnect` (caída del socket, reconexión, abandono, anfitrión que se va) | **OK** (0 fallas) |
| `minas_coop`, `ciudad_coop` | **OK** |
| `e2e 2` y `e2e 4 --fifth` | **FALLAN, igual en `main`** (7 fallas en `main`, 5–6 en la rama): la prueba quedó vieja. Da por hecho que el jefe del Bosque aparece en 1,5 s (ahora tiene presentación y fases) y usa umbrales de curación anteriores. Es deuda de herramientas (P2); los flujos reales están cubiertos por las pruebas de arriba. |
| **Relay público `wss://la-horda-relay.onrender.com`** | **NOT VERIFIED IN RUNTIME**: el proxy de este entorno responde 403. Si es un plan gratuito de Render, **se duerme** y la primera conexión tarda unos 30–60 s. Hay que probarlo desde un teléfono antes de mandar el enlace. |

Otros puntos:
- La arquitectura (anfitrión autoritativo y relay) **no se tocó**.
- Las skins se autoequipan y se ven para todos, cubierto por `lobby_code_skins`.

## 20. UI/UX y Códice

- **Menú principal** claro: MODOS DE JUEGO, CÓDICE y TIENDA.
- **Códice**, todo en español y con arte real animado:
  - Guardianes 1/12;
  - Bestiario 0/69;
  - Jefes 0/22;
  - Arenas 0/10.
- La suite `t_codex` (56 checks) estaba **FALLANDO** en `main`: 4 piezas de las reglas de jefe (cometa
  del Presentador, Foco de Hielo, tentáculo del Leviatán y Foco de Convergencia) no tenían lugar en el
  Códice. **ARREGLADO**: se describen en la ficha de su jefe (`CODEX_EXCLUDED`).
- **Tienda:** 3 pestañas (Guardianes, Objetos y sets, Skins), filtros por rareza, "Ver ficha" y compra con confirmación.

## 21. Dirección de arte

- Se mantiene la mejor versión de cada pieza.
- **Fuerte:**
  - el título con el ejército de guardianes;
  - los retratos del Códice;
  - el Hechicero angelical con alas de luz;
  - las arenas con paleta propia.
- **Débil:**
  - Cerbero en baja resolución;
  - la pared agrietada del Laberinto (procedural);
  - el Ángel Corrompido recoloreado;
  - los sprites chicos en la selección de guardián.

  Todo está catalogado con prompt en `LA_HORDA_MISSING_ASSETS.md`.
- Ningún placeholder feo en pantalla (MUST NOT respetado).

## 22. Game feel y juice

- Presente:
  - números de daño por nivel;
  - destellos;
  - sacudida controlada;
  - carteles de fase de jefe;
  - partículas por tipo de daño;
  - aura de set;
  - "+" pulsante de habilidad;
  - revivir con barra.
- Riesgo P2: a los 2–3 minutos se **acumulan textos** (tutorial, alertas de civiles, carteles y "+").
  **ARREGLADO** en parte: el cartel central baja cuando está el título de la arena, así no se pisan.

## 23. Sonido

- **100 % sintetizado** con WebAudio (`js/audio/audio.js`: música de cuerdas y percusión, más movida en
  oleadas y tenebrosa en jefes, y efectos por evento). **No hay archivos de audio** y no se inventó
  ninguno.
- En iOS el contexto se reanuda con el primer toque (`resume()` en el gesto). El botón de silencio existe.
- **NOT VERIFIED IN RUNTIME:** calidad, volumen relativo y cansancio auditivo. Hacen falta oídos humanos.

## 24. Correcciones aplicadas (todas reversibles)

| # | Corrección | Archivos |
|---|---|---|
| C1 | **Modo prueba (nivel 90, todas las arenas y skins) solo con `?dev=1`.** Los perfiles que ya lo tenían lo conservan. | `js/storage/save.js` |
| C2 | Prólogo como **página previa** del Hechicero en la primera partida (ya no en pleno combate), más una **ficha nueva de la Ciudad y de las Minas** | `js/ui/run-intro.js`, `css/overlays.css` |
| C3 | Perilla del joystick centrada (anclaje CSS equivocado) | `css/hud.css` |
| C4 | "Comenzar" de la Sala fijo abajo | `css/menus.css` |
| C5 | Arenas en 2 columnas en celulares apaisados | `css/menus.css` |
| C6 | Botón "B1" y "[Prueba] Generar objeto" solo con `?debug=1` / `?dev=1` | `js/net/net-debug.js`, `js/ui/inventory-ui.js` |
| C7 | El cartel central baja mientras está el título de la arena (no se pisan) | `js/ui/hud.js` |
| C8 | Rol en la selección de guardián; "HORDE SURVIVAL" pasa a "SUPERVIVENCIA A LA HORDA" | `js/ui/champion-select.js`, `index.html`, `js/ui/menus.js` |
| C9 | Texto de pausa sin "solo para pruebas" | `index.html` |
| C10 | Códice: las 4 piezas de las reglas de jefe se describen en la ficha de su jefe (el test fallaba en `main`) | `js/data/codex-content.js` |
| C11 | Test de reacciones determinista: el golpe de comparación no puede ser crítico (fallaba al azar) | `tools/items/t_reactions.js` |
| C12 | README al día: 12 guardianes, Tienda real, modo desarrollador | `README.md` |
| C13 | Las pruebas que arman un escenario con todo liberado (`boss_rules`, `e2e`, `disconnect`, `champs_se`, `shots`, `soak`) ahora piden `?dev=1` explícitamente. Antes dependían, sin decirlo, de que el modo prueba estuviera prendido para todos. `campaign-gate` sigue sin modo desarrollador, porque prueba justamente el bloqueo real. | `tools/bosses/boss_rules.js`, `tools/net-test/*.js` |

**Regresión** (en la rama, con los cambios):
- `tools/items/t_*.js`: **18/18 OK**. `t_codex` estaba en rojo en `main` y ahora pasa. `t_reactions`
  daba 2 de 7 en rojo por azar; después de C11 pasó 5 de 5.
- Smokes de arena: **Fábrica, Ciudad, Minas y Micelial OK** (0 errores).
- `tools/bosses/boss_rules.js`: **100/101 en la corrida completa**. La que falló (`inf_antikite`) pasa
  2 de 2 aislada en la rama y también en `main`: es un chequeo de tiempo intermitente; queda anotado.
- `tools/identity/t_identity.js`: **falla igual en `main`** (usa `bosReady`, una función que ya no
  existe desde que se rehizo el Bosque). Es una prueba vieja (P2 de herramientas).
- Red: ver la sección 19. **6 de 8 OK**; los 2 `e2e` fallan igual en `main`.
- Recorrido móvil completo después de los cambios (perfil nuevo): 0 errores, 0 404. El prólogo entra
  completo con "SEGUIR" visible y la selección muestra el rol ("Mago · Nv. 1").

## 25. Propuestas que requieren decisión (NO aplicadas)

| # | Propuesta | Por qué no se aplicó |
|---|---|---|
| D1 | Economía de la alfa: sacar Míticos y Únicos de la Tienda, o precios por rareza | Economía completa: no se cambia en silencio |
| D2 | Arena 01 más amable: nivel 9 un 15–20 % más liviano, o un punto de control en el nivel 6 **solo** en la Ciudad | Progresión fundamental: mejor confirmarlo con humanos |
| D3 | Carga por arena (precargar solo el título, la Sala y la arena elegida) y pasar las imágenes a WebP | Toca el pipeline de assets y la garantía de "nunca arte a medio cargar" |
| D4 | Prólogo en cooperativo: mostrarlo en la primera pantalla de refuerzos (el juego está quieto) en vez de a los 5,6 s | Toca el flujo online (arquitectura multijugador) |
| D5 | Reemplazar `confirm()` y `alert()` nativos por modales con la estética del juego | Varios sistemas: mejor en un solo paso con pruebas |
| D6 | Axiom: +vida base en nivel 1 | Identidad y balance del guardián |
| D7 | Relay en un plan que no se duerma, o un "ping" al abrir la Sala para despertarlo | Infraestructura |

## 26. Puntuación

Escala 0–10, sin inflar. Es el estado **después** de las correcciones de esta auditoría.

| # | Categoría | Nota | Por qué |
|---|---|---|---|
| 1 | Primera impresión | 7 | Título y primer guardián muy buenos; la carga pesa. |
| 2 | Onboarding / claridad | 6 | Ahora hay prólogo, ficha y tutorial por pasos; a los 2–3 min se acumulan textos. |
| 3 | Controles táctiles | 6 | Joystick arreglado, botones grandes; confirmaciones nativas. |
| 4 | Combate (cadena golpe → reacción) | 7 | Todo el feedback está; la sensación física es NOT VERIFIED. |
| 5 | Enemigos / IA | 7 | 6 por arena más roles; el saqueador de la Ciudad pesa mucho temprano. |
| 6 | Jefes | 7 | Regla propia en los 10; posible estancamiento en la Ciudad sin confirmar. |
| 7 | Identidad de arenas | 8 | Cada una tiene algo que ninguna otra tiene. |
| 8 | Guardianes | 6 | 12 con identidad; dispersión de balance temprano (Axiom). |
| 9 | Progresión | 5 | El muro de la Arena 01 y los 45–60 min hasta la primera victoria. |
| 10 | Economía | 3 | La etapa de prueba trivializa el loot (decisión pendiente). |
| 11 | Loot / ítems | 6 | Sistema rico y probado; la Tienda lo anula. |
| 12 | UI/UX móvil | 6 | Las pantallas largas mejoraron; queda pulido. |
| 13 | Dirección de arte | 7 | Fuerte, con 3 piezas P0 de arte. |
| 14 | Juice / game feel | 7 | Mucho feedback; algo de ruido de textos. |
| 15 | Audio | 4 | Solo síntesis; no verificable acá. |
| 16 | Narrativa / lore | 6 | Prólogo, Cicatriz y Códice; ahora con el prólogo en su lugar. |
| 17 | Multijugador | 6 | Local sólido; el relay público no está verificado. |
| 18 | Estabilidad técnica | 8 | 0 errores en todo lo probado. |
| 19 | Rendimiento / carga | 5 | 51 MB de precarga. |
| 20 | Persistencia | 8 | Recarga, derrota y abandono guardan bien. |
| | **Promedio** | **6,25** | |

**ALPHA READINESS SCORE: 58 / 100.**
- Punto de partida: el promedio × 10 = 62,5.
- Se restan 1,5 puntos por cada riesgo que puede arruinar la sesión de un desconocido y sigue abierto:
  el relay público sin verificar, la carga de 51 MB y el muro de la Arena 01.
- Antes de esta auditoría: **~46 / 100**, con el modo prueba para todos, el prólogo encima del
  combate, el joystick cortado y el Códice en rojo.

### Alfa mínima real (lo que falta para mandar el enlace a 20 personas)

1. **[P0]** Abrir el juego desde un iPhone con datos móviles y **crear y unirse a una sala** contra el
   relay público. Si tarda o falla, despertar el relay o pasarlo a un plan sin suspensión (D7).
2. **[P1]** Decidir la economía de la alfa (D1). Con dejarlo como "etapa de prueba" explícita alcanza,
   si se asume.
3. **[P1]** Observar a 3–5 personas jugar la Arena 01 y decidir D2 con esos datos.
4. **[P1]** Medir la carga real en 4G. Si pasa de ~20 s, priorizar D3.

Con 1 hecho y 2–4 decididos, la alfa cerrada está en condiciones de salir.

---

## 27. Segunda pasada: "llegar a 80" (qué se arregló, qué se midió y la nota nueva)

Todo lo de esta sección se midió con herramientas que quedan en el repositorio. Lo que no se pudo
medir sigue marcado **NOT VERIFIED IN RUNTIME**.

### 27.1 Multijugador: por qué "crear sala no hacía nada" y qué se hizo

- **Causa raíz:** el servidor de salas (Render) rechazaba en silencio las conexiones que venían del
  juego publicado. El filtro de orígenes (`ALLOWED_ORIGINS`) no incluía la página de GitHub Pages, y el
  rechazo cortaba la conexión **sin decir nada**: el botón quedaba "conectando" para siempre.
- **Arreglo en el servidor** (`server/relay.js`, `render.yaml`): la página publicada y sus previews
  siempre están permitidas. Si rechaza a alguien, primero manda el motivo (`ORIGIN`) y después corta.
- **Arreglo en el juego** (`js/net/net-core.js`, `js/net/net-lobby.js`):
  - despierta al servidor al abrir el juego;
  - reintenta hasta ~100 s con un contador visible ("Despertando el servidor… N s");
  - si lo rechazan, muestra un cartel con el motivo;
  - confirma que de verdad entró a la sala antes de seguir.
- **Verificado EN VIVO** con el workflow nuevo `.github/workflows/live-check.yml` (GitHub Actions, que sí
  llega a Render):
  - relay publicado: `/health` 220–315 ms; **crear sala 76 ms**; **unirse con código 100 ms**; el
    anfitrión ve al invitado; un origen no autorizado recibe el aviso `ORIGIN`;
  - **dos iPhone emulados** abren el juego de GitHub Pages contra el relay real y hacen el flujo completo:
    - crear sala, unirse con código y validaciones del código;
    - sala llena, unirse por enlace;
    - partida con skins, revivir, reconexión y recarga;
    - scroll táctil de Tienda, Inventario y Modos;
    - **0 errores de JavaScript**.
- **Sigue NOT VERIFIED IN RUNTIME:** Safari de un iPhone físico con datos móviles. Chromium emulado no es
  Safari. El workflow se puede correr a mano desde Actions o queda programado una vez por día.

### 27.2 Carga inicial

- Antes se precargaban **1.366 imágenes (≈51 MB) antes del título**.
- Ahora la carga va en dos tandas (`js/assets/lazy-images.js`, `js/assets/preload.js`):
  - **antes del título**, solo lo necesario;
  - **mientras mirás el menú**, el arte de arenas, enemigos, jefes y efectos.
- Además, **WebP sin pérdida** verificado píxel por píxel: 1.326 de 1.364 imágenes, 49,4 → 37,3 MB.
- Ninguna partida empieza con arte a medio bajar: el botón dice "Preparando la arena… N %" hasta que
  termina.
- `tools/audit/loadtime.js`, 4G simulado (12 Mbit/s):

| | Antes | Ahora |
|---|---|---|
| Tiempo hasta "Toca para continuar" | 52,5 s | **13,9 s** |
| MB bajados hasta el título | 54,3 | **14,4** |
| Pedidos de arte de arenas antes del título | cientos | **0** |

**Medido en vivo sobre el juego publicado** (GitHub Pages, desde GitHub Actions, 4G simulado, después del merge):
- título en **9,4 s** (antes 38 s) y 12,5 MB bajados hasta el título (antes 52,7 MB);
- 0 pedidos de arte de arenas antes del título;
- con caché, 0,75 s;
- la partida arrancó con todo cargado y en WebP.

### 27.3 Bugs reales encontrados por las simulaciones y arreglados

| Bug | Evidencia | Arreglo | Prueba nueva |
|---|---|---|---|
| **Minas: guardián trabado fuera del mapa.** La Embestida (y otros desplazamientos) lo metía en una roca del borde; el empuje lo sacaba por afuera y no podía volver: el Portal quedaba inalcanzable | 5 de 11 partidas simuladas | Si después del empuje sigue en un lugar no caminable, va al punto libre más cercano | `tools/minas/t_clamp.js`: falla en `main`, pasa acá |
| **Ciudad: mismo caso** en la pared de arriba | 1 caso en `main` | Idem | `tools/ciudad/t_clamp.js` |
| **iPhone: el audio quedaba mudo** al volver de otra app o de una llamada | Contexto "interrumpido" que nadie reanudaba | Se reanuda al volver a la pestaña y en el próximo toque | Probado: suspendido → toque → vuelve a sonar |
| **Bots quietos frente a pasos angostos:** el camino con obstáculos inflados cerraba los puentes del Abismo | Sonda: 2 de 3 bots sin moverse | Campo de camino sin inflar como respaldo; se recalcula si cambia el mapa | Sonda: el rescate llega en 4,6 s (antes 7,7 s) |
| "Atascos" de 22 min en la Ciudad | Eran del **piloto automático** (empujaba contra los edificios), no del juego | El piloto rodea muros | 41 partidas de la Ciudad sin llegar al tope |

### 27.4 Interfaz en el teléfono

- `tools/audit/ui_layout.js` recorre con toques reales **43 pantallas** en iPhone 14 y en iPhone SE
  apaisados. En cada una mide:
  - botones de menos de 40 px;
  - cosas que se salen de la pantalla;
  - textos de menos de 11 px;
  - botones principales que quedan fuera de la vista.
- **Antes: 294 y 297 problemas. Ahora: 0 y 0** (`css/mobile.css`, solo para pantallas bajas o táctiles).
  El escritorio no cambió: se comparó la posición y el tamaño de cada elemento.
- Diálogos propios con la estética del juego en vez de `confirm()`/`alert()` del navegador.
- Volumen de música y de efectos en la pausa.
- Como mucho **2 alertas de civiles a la vez** en la Ciudad (1 si habla el Hechicero); antes se
  apilaban 4 más el tutorial.

### 27.5 Fluidez

- `tools/audit/fps.js` mide en Chromium sin placa de video, con dibujado
  por software.
- La **lógica** del juego es liviana: `update` ≈ 1–2,7 ms por cuadro.
- El costo está en **pintar píxeles**. El Reino Micelial dibujaba en 15 ms por cuadro y quedaba en
  30 FPS.
- Nuevo: **resolución adaptable** (`js/core/canvas.js`):
  - si el juego va lento 2,5 s, la resolución interna baja a 75 % y, si hace falta, a 60 %;
  - el pixel art se amplía nítido;
  - cuando se recupera, vuelve a subir.
  - **Micelial: 30 → 60 FPS**. La Ciudad (60 FPS) no cambia.
- **NOT VERIFIED IN RUNTIME:** fluidez en un teléfono real. La emulación con CPU 4× más lenta también
  frena el dibujado por software (en un teléfono lo hace la GPU), así que su número (8–12 FPS) no
  representa un aparato real.

### 27.6 Progresión, economía y balance (simulación, piloto automático)

- **Campaña completa de punta a punta por primera vez.** El piloto ahora cruza el Portal de las Minas.
- Perfil nuevo, nivel 1, un solo guardián:

| Guardián | Partidas hasta ganar la Infernal | Minutos simulados | Muros |
|---|---|---|---|
| Mago | **12** | 79 | ninguno (máximo 2 intentos por arena) |
| Tanque | **19** | 140 | Bosque (4 intentos), **Abismo (7 intentos)** |

- **Arena 01:** con los dos se gana al **primer intento**. Antes costaba 5 intentos y 45–60 min.
- En nivel 1, los 12 guardianes ganan la Ciudad al primer intento 7 de 12 veces. Casi todas las
  derrotas son en el nivel 9 (Saqueador).
- **Abismo con el Tanque (abierto, para observar con personas):** pierde por **caer al vacío** con 89 %
  de vida.
  - En solitario, caer termina la partida.
  - Los bots no llegan a rescatarlo cuando el derrumbe cortó los puentes.
  - Se probaron tres cambios y se revirtieron los que no mejoraban la medición (2 de 12 ganadas antes y
    después).
  - Queda como decisión de diseño: extender la regla de "trepar solo" cuando nadie puede llegar.
- **Economía** (precios nuevos por rareza; Míticos y Únicos fuera de la Tienda):
  - una victoria en la Ciudad deja ~930 de oro en ~10 min, y las arenas siguientes 1.000–2.850 en ~7 min;
  - un guardián (2.500) cuesta 2–3 victorias al principio y 1–2 después;
  - el regalo único de 10.000 lo decidió el dueño y se mantuvo.

### 27.7 Regresión de esta pasada (rama final, todo junto)

| Suite | Resultado |
|---|---|
| `tools/items/t_*.js` | **18/18 OK** |
| Smokes de arena (Fábrica, Ciudad, Minas, Micelial) | **4/4 OK**, 0 errores |
| `tools/minas/t_clamp.js`, `tools/ciudad/t_clamp.js` (nuevas) | OK (fallan en `main`) |
| `tools/identity/t_identity.js` | **OK** (84 chequeos; antes fallaba en `main`) |
| `tools/bosses/boss_rules.js` | **OK** (todos los jefes) |
| `tools/regression/t_camera.js` | 72/72 |
| `tools/audit/journey.js` (jugador nuevo en móvil) | 0 errores |
| `tools/audit/ui_layout.js` (nueva) | 0 problemas en iPhone 14 y SE |
| Red: `coldstart`, protocolo del relay, `campaign-gate`, `minas_coop`, `ciudad_coop`, `disconnect` | todas OK |
| Red: `lobby_code_skins` en móvil y escritorio | OK |
| Red: `e2e.js 2` y `e2e.js 4 --fifth` | **0 fallas** (antes fallaban en `main`) |
| En vivo (GitHub Actions): relay publicado + 2 iPhone emulados contra GitHub Pages | OK |

Pruebas que eran intermitentes también en `main` y quedaron deterministas (las mecánicas no cambiaron):
- **Bosque:** los bots contenían la runa antes de que se encendiera.
- **Presentador:** los bots le cortaban el Gran Número antes de que la prueba mirara.

### 27.8 Puntuación nueva (0–10, sin inflar)

| # | Categoría | Antes | Ahora | Por qué |
|---|---|---|---|---|
| 1 | Primera impresión | 7 | **8** | Título 4 veces antes (13,9 s en 4G simulado). |
| 2 | Onboarding / claridad | 6 | **7** | Prólogo antes de jugar (también en cooperativo) y menos textos a la vez. |
| 3 | Controles táctiles | 6 | **7** | Todo lo tocable mide 40 px o más en las 43 pantallas; diálogos propios. Sensación: NOT VERIFIED. |
| 4 | Combate | 7 | 7 | Sin cambios; la sensación con el dedo sigue NOT VERIFIED. |
| 5 | Enemigos / IA | 7 | 7 | Bots mejores en pasos angostos; el Saqueador sigue siendo el que más mata en el nivel 9. |
| 6 | Jefes | 7 | **8** | 101/101 reglas; el jefe final se gana en simulación; los "atascos" eran del piloto. |
| 7 | Identidad de arenas | 8 | 8 | |
| 8 | Guardianes | 6 | **7** | Axiom corregido; 7 de 12 ganan la Arena 01 al primer intento en nivel 1. |
| 9 | Progresión | 5 | **7** | Arena 01 al primer intento; campaña completa en 12–19 partidas; queda el Abismo con el Tanque. |
| 10 | Economía | 3 | **7** | Precios por rareza; un guardián cada 2–3 victorias. El regalo de 10.000 es decisión del dueño. |
| 11 | Loot / ítems | 6 | **7** | La Tienda ya no vende Míticos ni Únicos. |
| 12 | UI/UX móvil | 6 | **8** | 0 problemas medidos en iPhone 14 y SE (antes ~295); volumen; diálogos propios. |
| 13 | Dirección de arte | 7 | 7 | Siguen faltando 3 piezas P0 (no se inventa arte). |
| 14 | Juice / game feel | 7 | 7 | |
| 15 | Audio | 4 | **5** | Mezcla medida (pico −3 dB, sin saturar), volúmenes y el arreglo de iPhone. Solo síntesis; oído humano: NOT VERIFIED. |
| 16 | Narrativa / lore | 6 | **7** | Prólogo en su lugar, también en cooperativo. |
| 17 | Multijugador | 6 | **8** | Relay publicado verificado en vivo y flujo de 2 teléfonos emulados contra el juego publicado. Safari real: NOT VERIFIED. |
| 18 | Estabilidad técnica | 8 | **9** | 0 errores en toda la regresión; 2 trabas reales encontradas y cerradas con pruebas; chequeo diario en vivo. |
| 19 | Rendimiento / carga | 5 | **8** | 14 s hasta el título en 4G; resolución adaptable (Micelial 30 → 60 FPS). Teléfono real: NOT VERIFIED. |
| 20 | Persistencia | 8 | 8 | |
| | **Promedio** | 6,25 | **7,35** | |

**ALPHA READINESS SCORE: 73 / 100** (antes 58).
- El promedio × 10 da 73,5. Ya no se resta nada: los tres riesgos que podían arruinar la sesión de un
  desconocido quedaron cerrados y medidos:
  - relay público: verificado en vivo;
  - carga de 51 MB: 14 MB hasta el título;
  - muro de la Arena 01: se gana al primer intento.

### 27.9 Qué falta para 80, y por qué no se puede "cerrar" desde este entorno

Para 80 el promedio tiene que ser 8. Las categorías que siguen en 5–7 no suben con más código sin
verificar; suben con estas tres cosas:

1. **Personas con teléfonos reales (3–5, una tarde):** combate con el dedo (4), controles (3), audio
   (15), onboarding (2) y fluidez real (19). Es lo que más puntos mueve: +4 a +6.
2. **Arte P0** (`LA_HORDA_MISSING_ASSETS.md`: Cerbero en alta, pared agrietada, Ángel Corrompido): +1 en
   arte y juice.
3. **Audio grabado o música compuesta**, en vez de síntesis: +2 en audio.

Con 1 hecho, y 2 o 3 en marcha, el juego queda en el rango 78–82 **medido**, no estimado.

## 28. Tercera pasada (S1–S8): lo que pidió el dueño después de probar de a dos, y la nota nueva

El dueño probó el juego entre dos teléfonos y reportó cuatro cosas:
- la Sala no volvía a la selección de arenas al ganar;
- el gólem del Nigromante tenía que cambiar;
- había muchos errores de sprites;
- a la skin del Asesino le faltaba un lado.

También pidió arte con un solo diseño, audio y bugs de juego. Todo lo de abajo quedó con prueba en el
repositorio. Lo que no se pudo medir sigue marcado **NOT VERIFIED IN RUNTIME**.

### 28.1 Qué cambió

| Tema | Qué se hizo | Prueba |
|---|---|---|
| Sala | Al ganar, la misma sala (sola u online) vuelve con la siguiente arena elegida. Hay fila de arenas en la Sala. El invitado ve la arena del anfitrión y un aviso si no le cuenta para la campaña. El relay acepta cambiar de arena entre partidas | `tools/net-test/next_arena.js` (27 chequeos, 0 fallas) |
| Skins | Espejo por cuadro y relleno de estados que faltan en los 19 packs. El Asesino "nocturno" ya mira a los dos lados. En el invitado, la pose de lanzar y la muerte ya no dependen del reloj del anfitrión | `tools/art/skin_audit.js` (0 fallas; antes 55) |
| Nigromante | Gólems nuevos de la hoja (piedra, fuego, hielo; tormenta y plaga recoloreados) por rama de talentos. Aparecen, atacan y mueren con sus cuadros. Invocaciones ordenadas en profundidad, con aparición y muerte | `tools/items/t_nigro_golems.js` (57) |
| Enemigos de la hoja | Hadas de Escarcha: roban el calor de los braseros. Dragoncito y Cù-Sìth pasan a élite con conducta propia. El Ángel de hielo suma el Prisma. Las hadas del Bosque tienen 3 colores | `tools/regression/t_bestias.js`, `t_bestias_net.js` |
| Un solo diseño | Las muertes de la hoja para Esfinge, Medusa y Druida son otros personajes y se desactivaron. Todos los enemigos: estados y direcciones completos por espejo o clon, 22 vistas ya recortadas cableadas, escalas y contornos parejos | `tools/art/enemy_coverage.js` (104 tipos × 11 estados, 0 vacíos) |
| Partidas de a dos | El invitado ve golpes (antes casi nunca le llegaban), muertos caídos (no de pie) y las animaciones con el reloj de la partida. El invitado que todavía baja arte entra cuando termina; mientras tanto lo maneja un bot. Los efectos de skin se precargan | `tools/bugfix/t_guest_corpses.js`, `tools/audit/android.js` |
| Android | Pantalla completa y horizontal al tocar Continuar/Unirse/Comenzar. Instalable (manifest). Se recupera el lienzo perdido. Emulación de Pixel 7 y Galaxy S9+ sola y con red de celular | `tools/audit/android.js` (0 fallas) y job `android` en Live check |
| Audio | Limitador (antes el combate recortaba a +1,2 dBFS; ahora −1,4). Golpes por material. Reverb sintética por arena. Música con identidad por arena (antes las 10 sonaban igual). Transiciones entre oleada, jefe y victoria | `tools/audio/t_audio_mix.js` |
| Lore jugable | **Resonancia de los Cristales:** llevás un cristal y entrás con el don de su Guardián (Juicio solo después del final). El Hechicero la apaga al robarte los cristales. **Últimas palabras** de cada Guardián al caer | `tools/items/t_resonance.js` (16) |
| Abismo | Si ningún compañero puede llegar a rescatarte, trepás solo: el Tanque pasa de 2 a 9 victorias de 12 | Campaña simulada |
| Botín | Las Minas y la Ciudad tenían tablas de botín vacías (las Minas tiraban el cofre del Bosque) | `tools/bugfix/t_arena_tables.js` |

### 28.2 Puntuación (0–10, sin inflar)

| # | Categoría | 27 | 28 | Por qué |
|---|---|---|---|---|
| 5 | Enemigos / IA | 7 | **8** | Élites con conducta propia (aullido, aliento, prisma, robo de calor) |
| 8 | Guardianes | 7 | **8** | Resonancia (elección antes de cada partida); gólems nuevos; skins completas de los dos lados |
| 9 | Progresión | 7 | **8** | Muro del Abismo con el Tanque cerrado (9/12); sala que sigue a la próxima arena |
| 15 | Audio | 5 | **6** | Sin recortes, con identidad por arena y por material. Oído humano: NOT VERIFIED |
| 16 | Narrativa / lore | 7 | **8** | Los cristales se juegan; los Guardianes dicen quién fueron |
| 13 | Dirección de arte | 7 | 7 | Más parejo, pero la Ciudad, el Abismo y la Acuática siguen con arte de baja resolución (C-1, C-2) |
| 17 | Multijugador | 8 | 8 | Se arreglaron errores de sprites del invitado que el dueño vio. Falta volver a probar en teléfonos reales |
| | Resto | = | = | Sin cambios |
| | **Promedio** | 7,35 | **7,60** | |

**ALPHA READINESS SCORE: 76 / 100** (antes 73).

### 28.3 Por qué no 80 (ni 90) todavía
- **Arte crítico** (`LA_HORDA_MISSING_ASSETS.md`, sección S5, C-1 a C-7): la Ciudad y el Abismo en baja
  resolución, los comunes de la Acuática, el Gólem de Cuerpos, el Ángel Corrompido y el Cerbero. No se inventa
  arte: hay que pedirlo.
- **Audio grabado o compuesto:** la síntesis mejoró, pero no llega a nivel comercial.
- **Prueba humana en teléfonos reales** (iPhone con Safari y Android con Chrome, de a dos). Las correcciones del
  invitado están probadas en emulación: NOT VERIFIED IN RUNTIME en aparatos reales.
- Pruebas intermitentes que también fallan en `main`: `hie_antikite` / `hie_demonio_apaga` (jefes de hielo)
  y algunas del smoke de la Ciudad. Miden tiempo real y dependen de la carga de la máquina.
