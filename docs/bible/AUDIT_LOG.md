# Audit Log

Formato: **Problema → Decisión → Implementación → Validación → Commit**. Solo decisiones importantes.

## 2026-10-03 · World, Champion & Arena Overhaul V2 (rama `claude/world-overhaul-v2`)

### A1. Presentación de campeones inconsistente
- **Problema**: 29 campeones con 4 formatos de nombre ("Aldric, el Último Bastión", "Axiom", "La Profeta",
  "El Eslabón"); historias de 191 a 569 caracteres; orígenes de la expedición con claves internas
  (`ciudad`, `laberinto`); 12 campeones originales sin metadata de pasiva aunque varios la tienen en código.
- **Decisión**: estándar "Nombre, título" (Champion Bible §1); historia 260–480 caracteres; frase de catálogo
  única; pasivas documentadas solo si existen en código (Aldric, Kael, Thalen, Elyra y Axiom quedan WARNING:
  no tienen pasiva propia). Renombres: Ismara (Profeta), Sylva (Cazadora, ya canónico en el código), Ilvar
  (Nigromante), San Martín (Libertador), Garren (Eslabón), Tobías (Farolero), Segador "el Olvidado".
- **Implementación**: `js/data/champion-identity.js` (`CHAMPION_IDENTITY`, `CHAMPION_STANDARD`) se aplica
  una vez al cargar, después de registrar a todos y antes del normalizador de balance. Las claves internas
  no cambian (guardados intactos). No toca estadísticas.
- **Validación**: `tools/bible/champion-validator.js` (identidad, lore, origen).

### A2. Sin fuente única de metadata de habilidades
- **Problema**: descripción, ícono, apuntado y estados repartidos entre `CLASSES`, `AIM_PROFILES`,
  `SKILL_ICON_IMG`, guías y Códice; nada describía targeting/estados para la UI.
- **Decisión**: derivar (no duplicar) una `AbilityDefinition` de los datos existentes.
- **Implementación**: `js/skills/ability-registry.js` (`championAbilityDefinitions`, `abilityLiveValues`,
  `validateAbilityDefinition`, overrides en `ABILITY_META`).

### A3. Validador de habilidades
- **Problema**: el audit de roster previo solo leía registros; ninguna herramienta verificaba que una
  habilidad tenga efecto, VFX, SFX y replicación.
- **Implementación**: validador en runtime con medición diferencial y canario (ver QA.md).
- **Hallazgos reales**: (1) la definitiva de Musashi sin Marca de Duelo **consumía la carga sin hacer
  nada** → ahora elige sola al rival más digno a 320 u, y si no hay nadie devuelve la carga y el
  enfriamiento. (2) El chequeo de sprite por `CHAMP_PACK` daba falsos FAIL (Aldric/Kael/Thalen dibujan
  por otro camino) → se reemplazó por dibujo real en un canvas aparte.

### A4. Daño en el tiempo invisible y congelado por aturdimiento
- **Problema**: quemadura/sangrado/veneno/maldición restaban vida cuadro a cuadro sin ningún número; y el
  `continue` del aturdimiento pausaba también los DoT del enemigo aturdido.
- **Implementación**: DoT antes del aturdimiento (`js/core/update.js`); `ftDotTick` agrupa por enemigo cada
  ~0,65 s en un número chico del color del elemento (tipo 6). Escudo ganado = tipo 5 `◈N`. El daño recibido
  ahora cae en vez de subir. Lenguaje en `js/data/combat-language.js`.
- **Validación**: `tools/quality/test-combat-language.js`, `tools/quality/test-floating-text.js`.
- **Limitación**: los números de DoT se generan en el anfitrión (los invitados ven los de escudo, que se
  calculan localmente, pero no los de DoT).

### A5. Long press para consultar habilidades
- **Problema**: mantener un botón ya significaba "apuntar"; no había forma de leer una habilidad en
  partida (y en multijugador no hay pausa). Tocar una habilidad en enfriamiento solo daba un "deny".
- **Decisión**: 480 ms de mantener sin arrastrar abre una ficha; soltar sin arrastrar no lanza; arrastrar
  vuelve al apuntado. Las habilidades sin apuntado pasan a lanzarse al soltar (antes al apretar) para
  poder distinguir el toque del long press. Sylva (cargar) queda como excepción documentada.
- **Implementación**: `js/ui/ability-inspector.js` (`abilityCardHTML` reutilizable), `js/core/aim.js`,
  definitiva movida de `input.js` al inspector, estilos en `css/hud.css`.
- **Validación**: `tools/ux/test-ability-inspector.js` (844×390 y 667×375: toque, mantener sin lanzar,
  arrastrar tras la ficha, consulta en enfriamiento, definitiva, ficha dentro de la pantalla).

### A6. Panel táctico
- **Problema**: en multijugador el botón de pausa abría una pantalla de "Pausa" que no pausaba y solo
  mostraba daño/vida base: no se podía consultar el kit, los estados ni los sets en partida.
- **Implementación**: `js/ui/tactical-panel.js` + `css/panels.css`, enganchado en `js/core/input.js`.
  Reutiliza `abilityCardHTML` (una sola ficha para long press, panel y futuro Códice).
- **Validación**: `tools/ux/test-tactical-panel.js` (844×390, 667×375; Musashi y Vesper; solo pausa,
  multijugador no pausa y la simulación avanza, enfriamiento en vivo, cierre tocando el fondo).

### A7. Arena Factory + validador de arenas
- **Problema**: la identidad de cada arena estaba repartida entre `ARENA_MODS`, `ARENA_BRIEF`, ganchos y fichas
  en Markdown (algunas desactualizadas: `bosque.md` nombra al Jinete Sin Cabeza como jefe; el motor usa al
  Guardián Ancestral). Nada verificaba geometría, apariciones ni que el arte "sólido" choque.
- **Implementación**: `js/arenas/common/arena-blueprints.js` (ArenaDefinition de las 11 arenas, con `decision`
  propia, hazard con telegraph, jefe-arena, botín, micro-tutorial, geometría, estado de diseño) y
  `tools/bible/arena-validator.js` (grilla con la colisión real, bolsillos, sólidos pintados, 120 apariciones,
  exploración agresiva de ~29 s con bots que buscan romper el mapa, canario, láminas `.webp`).
- **Hallazgo crítico**: `clampToArena` usaba `%` de JS con ángulos negativos: en más de la mitad del coliseo el
  límite real quedaba hasta 41 % más afuera que las paredes dibujadas (Ruinas, Gélida, Acuática, Laberinto,
  Infernal). Los bots exploradores salieron del mapa en la Infernal. Corregido con módulo positivo.

### A8. Reino Fúngico — geometría pintada = jugable (Gold Standard, parte 1)
- **Problema** (reportado): montículos de tocones, racimos de hongos, pilares, el estanque y el trono de raíces
  del fondo pintado se veían sólidos pero se atravesaban (solo chocaban el capullo y algunos hongos del ecosistema).
- **Implementación**: 17 polígonos trazados sobre el arte (`MIC_BG_SOLIDS`, en píxeles del fondo) que chocan,
  bloquean la navegación y las apariciones; bocas de túnel corridas a zona libre (`micTunnelMouth`); salida al
  punto libre más cercano (`micNearestFree`); los nodos del ecosistema no nacen pegados a un montículo.
- **Validación**: arena-validator PASS (0 bolsillos, 120/120 apariciones, 17/17 sólidos con colisión,
  exploración sin fallas); `tools/micelial/t_micelial.js` con las mismas 2 fallas preexistentes que `main`
  (MADRE fase 3, SAVE viejo) — comparado contra un worktree limpio de HEAD en 3 corridas; la prueba del Acechador
  ahora lo hace aparecer en un punto libre (antes en un montículo que ahora es sólido).

### A9. Briefing con botín + micro-tutorial fúngico + telemetría preparada
- **Briefing**: la ficha previa ya existía (lore/peligros/objetivo). Se agregó imagen, mecánica, peligro con su
  aviso, jefe y botín destacado (set con piezas ✓/? y dónde más cae) leyendo la Arena Factory.
- **Micro-tutorial (Reino Fúngico)**: driver de datos en `js/systems/arena-tutorials.js`. Hallazgo durante la
  prueba: los bots aliados rompían el núcleo de práctica antes de que el jugador aprendiera → ahora es inmune a
  los bots mientras dura la lección. Arenas sin driver: ya enseñan sus conceptos con `tutSay` al aparecer.
- **Telemetría**: `js/systems/telemetry.js` (anillo local + evento `horda-telemetry`; reenvía a AlphaServices
  solo nombres que su servidor ya acepta). No agrega servicios ni datos personales.
- **Validación**: `tools/ux/test-arena-briefing-tutorial.js` (10 arenas con 4 fichas, aviso visible, set con
  piezas; lección fúngica no avanza sola, avanza al hacerla, se guarda, no se repite, saltar guarda).

### A10. Tutorial general: long press, peligro, panel táctico y reanimar
- **Problema**: el entrenamiento (9 pasos) no enseñaba a consultar habilidades, a leer avisos de peligro, el
  panel táctico ni la reanimación (que en cooperativo es clave).
- **Implementación**: 4 pasos jugables nuevos con mecánicas reales (inspector, `bossStrike` con su telegraph,
  `tacticalPanelOpen`, una aliada caída de verdad + `updateRevives`). Los bloqueos por paso ahora se buscan
  por id (no por índice).
- **Validación**: `training-test.js` y `training-player.js` (13/13 con entrada táctil real).

### A11. Validador de jefes y referencia autogenerada
- **Implementación**: `tools/bible/boss-validator.js` (pelea real de nivel 10 por arena) y
  `tools/bible/build-reference.js` (CHAMPION_REFERENCE / ARENA_REFERENCE desde datos).
- **Resultado**: 10/10 jefes PASS automático (aparecen, 5–158 avisos en 42 s, 3–16 patrones, dañables, no
  triviales). Ninguno es "solo una barra de vida" según la evidencia automática; el juicio de diversión y
  dificultad sigue siendo humano.
- **Hallazgo (tutorial)**: en el paso final del entrenamiento, Elyra reanimada mataba a los esqueletos y el
  objetivo contaba solo las bajas del jugador → el novato quedaba trabado (1 de 2 corridas en 667×375). Ahora
  cuenta los enemigos derrotados por el equipo.

### A12. Regresión multijugador (relay real)
- **Problema**: `tools/micelial/t_micelial_net.js` y `tools/identity/t_identity_net.js` estaban rotas ya en la base
  (`HEAD` limpio): tocaban "Continuar" del título, que ahora abre el flujo de primera vez, y la sala arrancaba en la
  Ciudad Maldita. No validaban nada.
- **Arreglo**: crean la sala con `netCreateRoom(arena, …)` y un guardado con el onboarding completo y las arenas abiertas.
- **Resultado**: Reino Micelial anfitrión + 3 invitados 14/14; Infernal 9/9; Gélida 8/8; `tools/ux/online.js` sin fallas.

### A13. Objetivos táctiles
- **Hallazgo**: el botón de curación de emergencia (y el de Pacto, misma clase `.sec`) medía 42×42 px en todos
  los tamaños: debajo del mínimo táctil de 44.
- **Arreglo**: `.ability-btn.sec` 44×44 (`css/hud.css`).
- **Validación**: `tools/ux/test-touch-targets.js` — 5 viewports (844×390, 667×375, 932×430, 800×360, 1280×800)
  × 3 campeones: todos los controles ≥ 44 px, sin superposición, dentro de pantalla.

### A14. Volver a consultar + descripciones largas
- Panel táctico: sección **Ayuda** (regla y aviso de la arena actual, "📖 Guía del Hechicero", "↺ Repetir la lección
  de la arena"). Códice → Arena: sección **Reglas de la arena** desde la Arena Factory + "↺ Repetir la lección".
- Descripciones que superaban 200 caracteres (Ascensión del Elegido 294, El Portador 213, Santa Paciencia 202,
  Cruce de los Andes 201) reescritas sin cambiar valores. Skin "Axiom, Skin Z · Realidad Corrupta" → "Realidad Corrupta".
- El validador de campeones espera a que baje el arte (carga diferida) antes de medir el sprite (evita falsos FAIL).
- Auditoría completa: 24 PASS, 5 PASS* (Aldric, Kael, Thalen, Elyra y Axiom sin pasiva propia: deuda de diseño
  documentada, no inventada), 0 FAIL.

### A15. Pasivas para Aldric, Kael, Thalen, Elyra y Axiom
- **Problema**: 5 de los 29 campeones no tenían rasgo permanente (los únicos PASS* de la auditoría).
- **Decisión**: pasivas de identidad, condicionales y chicas (Champion Bible §4), sin tocar estadísticas base ni
  `knownChampions`. Números centralizados en `CLASSIC_PASSIVES`.
- **Validación**: `tools/quality/test-classic-passives.js` (cada efecto exacto: 0,92 en el aura y 1 fuera / para sí;
  ×1,15; bonus ×1,5; ×1,25; 3 por baja con tope 15/s y 0 por básicos). Balance antes/después con el piloto
  automático: todos debajo del techo por rol, 3/3 supervivencia, diferencias dentro del ruido de ±10 % (la propia
  corrida muestra ±10 % en campeones cuya pasiva no puede bajar su daño: no hay señal fuerte en ningún sentido).

### A16. Batería completa de CI local + frase de catálogo con nombre
- Se corrieron localmente los 41 pasos del workflow `Champion entry balance` (con Playwright 1.56 local; CI usa
  1.61.1). 40/41 PASS; la falla real: `tools/portadores/test-elyra.js` exige que la frase de catálogo de Aldric,
  Kael, Thalen y Elyra nombre al campeón, y las frases nuevas de A1 no lo hacían (esta rama habría quedado roja
  en CI desde el checkpoint 01).
- **Decisión**: se adopta como estándar para los 29 ("Aldric sostiene…"), con chequeo FAIL en el validador.
- **Validación**: `test-elyra` PASS, `browser-collection` PASS, champion-validator 29/29.
- `docs/bible/VALIDATION_MATRIX.md`: matriz final con evidencia por fila.

### A17. Variantes de arena (rejugabilidad sin caos)
- El motor ya tenía variantes por semilla (trazados de pilares × espejo en Pesadilla/Infierno y Horda Infinita;
  runas del Bosque; giro de braseros). Ahora están declaradas en la Arena Factory (`variants`) y el validador prueba
  **8 semillas** por arena con trazados: 4 trazados distintos por arena, 0 bolsillos (Ruinas, Gélida, Acuática,
  Laberinto, Infernal). En cooperativo la semilla es la del anfitrión (`netMatch.seed`).
- El chequeo de exploración tolera ≤ 4 u de penetración (márgenes de borde y empujes entre héroes); más que eso
  sigue siendo FAIL.

### A18. "Si se ve sólido, es sólido" en todas las arenas
- **Hallazgos**: (1) el monolito de hielo de la Arena Gélida (220×160, centro-norte) no tenía colisión; (2)
  `aidResolveCircles` no movía a una entidad ubicada exactamente en el centro de un sólido (dirección 0/0).
- **Implementación**: colisión en la base del monolito; empuje con dirección fija en el caso degenerado;
  `aidVisualSolids()` (props grandes del coliseo) y `cmVisualSolids()` (paredes de la Ciudad) declarados en las fichas;
  arcos con abertura marcados `passThrough` (las patas siguen chocando); Fábrica/Abismo/Minas `derived`.
- **Validación**: arena-validator 8 PASS + 2 WARNING por diseño, 0 FAIL; `t_identity` 84/84.

### A19. Panel táctico y long press en multijugador real
- `tools/ux/online-tactical.js` (relay + anfitrión + invitado): el panel del invitado no lo pausa ni pausa al
  anfitrión (la simulación avanza > 1 s con el panel abierto), muestra el kit del invitado y su enfriamiento baja con la
  simulación del anfitrión; el long press del invitado abre la ficha, no lanza y no manda intención de lanzamiento;
  el panel del anfitrión tampoco pausa la partida. PASS.

### A20. Texto fuera de marco
- `tools/ux/test-text-overflow.js` recorre 10 pantallas (menú, Códice ×4, tienda, sala, briefing, panel táctico, HUD)
  a 844×390 y 667×375 midiendo los rectángulos reales del texto contra su caja y su marco.
- **Hallazgo**: en 667×375 los títulos del Códice "GUARDIANES" (+29 px) y "BESTIARIO" (+9 px) se salían de su tarjeta
  ("GUARDIANE"). **Arreglo**: tamaño `clamp()` según el ancho. Sin el arreglo la prueba falla; con él, PASS.

### A21. Micro-tutoriales para 3 arenas (la factory no es de una sola arena)
- Drivers nuevos: **Gélida** (lección de frío/movimiento + brasero apagado cercano que hay que encender) e
  **Infernal** (fisura de práctica que hay que cerrar). Reemplazan sus consejos sueltos (`cold`, `brazier`, `fissure`)
  para no repetir. Pasos y textos siguen en la ficha.
- Las pruebas cooperativas (`t_identity_net`, `t_micelial_net`) marcan las lecciones como vistas para aislarse
  (la lección de la Infernal abría una fisura extra y la prueba espera exactamente `inf1`).
- **Validación**: `test-arena-briefing-tutorial.js` (3 arenas: no avanza sin hacerlo, avanza haciéndolo, guarda),
  `t_identity` 84/84, cooperativo Infernal 9/9, Gélida 8/8, Micelial 14/14.

---

## Auditoría de jefes y enemigos + Boss Factory (octubre 2026)

### A22. Inventario visual de los 104 tipos de enemigo/jefe
- **Herramientas**: `tools/art/enemy_coverage.js` (qué dibuja cada estado: arte real / espejo / clon / vacío) y nueva
  `tools/art/arena_lineup.js` (escala real, mismo zoom, junto al Caballero; densidad de píxel).
- **Hallazgo**: el arte de enemigos y jefes es pixel art coherente con los héroes en casi todo el roster (no se
  rehace lo que está bien: ART_BIBLE §8, regla de preservación). Outliers medidos contra la mediana del roster de
  campeones (0,95 u/px): **Cerbero ×5,4** y **Titán de Piedra ×5,0** (arte de ~50×65 px dibujado a 150–180 u: se ven en
  bloques). Vigilar (×2,5–4): Leviatán, Gólem de Cuerpos, Minotauro, Dragón de la Forja, Kraken, Micelio y varios
  comunes de la Ciudad y las Minas.
- **Decisión**: REDRAW por densidad (encargo R-01 nuevo para el Titán, F-01 de Cerbero sube de prioridad). La fábrica de
  arte del repo recorta hojas encargadas; no genera arte. Se conserva el arte actual hasta que llegue el nuevo.
- **FIX aplicado**: alfa 0/255 en los atlas del Hechicero (5,7 % de píxeles semitransparentes) y su Gólem: mismos píxeles
  opacos, bordes nítidos.
- Bug colateral: `_micDrawNode` dibujaba elipses de radio negativo cuando el reloj de animación retrocedía (excepción
  en el loop). Arreglado (clamp).

### A23. Boss Factory: ficha + ganchos medibles con la arena
- `BOSS_BLUEPRINTS` (23 fichas), `bossArenaEvent` en 58 puntos reales del código, `boss-validator.js` reescrito:
  simula también los subjefes en su nivel y **exige los ganchos "auto"**. Primera corrida: encontró ids mal escritos
  (un FAIL real), un jefe que no aparecía en la ventana (el Caballero despierta a los 45 s: ventana ampliada), avisos de
  las Minas que no se contaban (usan su propio sistema) y un hueco de diseño real (A25).

### A24. Jefes genéricos → identidad de arena
- **Kraken Joven** (pesca con el agua), **Guardián del Laberinto** (Laberinto de Piedra + derrumbe propio),
  **Hechicero Supremo** (Grieta Conjurada sobre fisuras reales), **Doppelgängers** (ecos de las runas), **Caballero**
  (sus trampas lo alcanzan), **Leviatán** (marea + tentáculo conductor). Detalle en `BOSS_BIBLE.md` §4.
- **Validación**: boss-validator 23 fichas, 0 FAIL; `t_boss_arena_hooks.js` 24/24 (con canario: sin el arreglo de
  Cerbero la prueba falla).

### A25. Cerbero encadenado: anillo seguro
- **Hallazgo** (validador): en el acto 1 Cerbero está atado a la puerta (cadena 420) y el anti-kite solo castigaba más
  allá de 640: entre su alcance y ese radio nadie le pegaba y él no podía hacer nada.
- **Arreglo**: en el acto 1, "lejos" es fuera del alcance de su lanzallamas. Prueba con canario.

### A26. Bugs de presentación de jefes
- HUD del Rey de la Horda con el epíteto y los consejos del Demonio Mayor suelto (`BOSS_DESIGNS[e.type]` en vez de la
  forma actual): ahora `designKey` y se refresca al cambiar de forma.
- El Titán de Piedra nunca mostraba su barra grande ni sus consejos (`bossHudFocus`).
- La capa de fase de la música no escalaba con el Minotauro, el Guardián y otros (`bossPhase` quedaba en 1).
- La embestida del Leviatán apuntaba siempre al jugador LOCAL (en cooperativo, al anfitrión).
- Las poses de mordida/embestida del Leviatán nunca se mostraban (flags que nadie ponía).
- El Jinete prometía "Vida 1/2" fuera de las Ruinas, donde no revive.
- Carteles grandes para los jefes y subjefes que entraban solo con un banner.
