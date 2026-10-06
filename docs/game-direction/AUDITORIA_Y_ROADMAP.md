# La Horda — auditoría de dirección y roadmap

Estado: primera pasada (octubre 2026). Las etiquetas de estado son estrictas: **VERIFICADO** (ejecutado y comprobado),
**IMPLEMENTADO** (código modificado), **INFERIDO** (lectura de código / informes existentes, no ejecutado por esta
auditoría), **PROPUESTO** (diseñado, no implementado), **BLOQUEADO** (requiere algo externo).

Fuentes: tres auditorías de solo lectura sobre el repositorio (cold-start/multiplayer, colección/progresión,
herramientas de calidad/salud de gameplay) y una investigación de mercado inicial (ver "Mercado"). Todo lo que dice
"INFERIDO" salió de esas lecturas, no de una corrida nueva.

## 1. Veredicto

La Horda tiene una base **mucho más sólida de lo que parece desde afuera**: 59 logros, 28 campeones con marco de entrada
automático, 28 jefes con fases, 10 arenas con identidad mecánica, loot con sets, pity oculto y fusión de duplicados,
códice profundo, entrenamiento de 13 pasos, servidor autoritativo para moneda premium, y una fábrica de contenido con
gates. El puntaje de calidad existente es 92/100 (INFERIDO, `docs/quality/SCORECARD.md`).

Los problemas reales no son de falta de sistemas sino de **cuatro cosas**:

1. **Cold start** — con 1 persona conectada el juego "se siente vacío" (P0).
2. **Lectura del combate básico** — el golpe cuerpo a cuerpo del 90 % de los enemigos no avisa (P1).
3. **Ciegos de medición** — no hay telemetría de campeón/build/ítem ni mapa de aburrimiento; el gate de entrada satura
   y no detecta campeones demasiado fuertes (P1).
4. **Deseo de colección poco visible** — el campeón bloqueado no muestra cómo ni cuánto falta; ningún campeón
   estándar se gana jugando; las skins son una por campeón (P1).

## 2. Top 10 problemas (impacto × confianza ÷ coste)

| # | Prio | Problema | Evidencia | Estado de la solución |
|---|---|---|---|---|
| 1 | P0 | Un solo humano no tiene entrada directa a una partida de 4 | `net-game.js` (bots solo al pulsar Comenzar) | **IMPLEMENTADO** (⚡ JUGAR YA; compañeros con nombre propio) |
| 2 | P1 | Golpe básico sin aviso (`update.js` ~497) | auditoría de gameplay | PROPUESTO |
| 3 | P1 | Sin telemetría de decisiones (campeón elegido, ítem saltado, desbloqueo visto, abandono) | `alpha-services.js` lista blanca; `champion_selected` documentado y nunca emitido | PROPUESTO (requiere cambio de lista blanca en servidor) |
| 4 | P1 | Gate de entrada sin poder de detección (3 semillas, nivel 20, sin equipo; satura) | `BALANCE_CAMPEONES.md` "Tres muestras no bastan" | PROPUESTO |
| 5 | P1 | Campeón bloqueado = tarjeta gris sin progreso | `codex.js:393`; `ascensionUnlockHint` existe y no se muestra en la ficha | PROPUESTO (cambio chico) |
| 6 | P1 | Ningún campeón estándar se consigue jugando; sin desbloqueo por maestría/secreto/Guardián | `ASCENSION_UNLOCKS` solo para los 7 de Ascensión | PROPUESTO (la tabla ya es genérica) |
| 7 | P1 | Fin de partida no muestra oro ganado ni "lo más cerca de desbloquear" | `end-screens.js:216-232` | PROPUESTO |
| 8 | P2 | Dificultades altas = solo números (×2.5–5.5 vida) | `difficulty-tiers.js` | PROPUESTO (reutilizar mutadores de Horda Infinita) |
| 9 | P2 | Backfill humano en partida en curso no existe | `relay.js:209 STARTED` | PROPUESTO (diseño abajo) |
| 10 | P2 | Skins: 19 campeones con ≤ 3, 9 con una sola; sin rareza visible | `cromas.js:187` | PROPUESTO |

## 3. Fortalezas a no romper

Telegrafiado de jefes con ventana de vulnerabilidad · pity y recompensa de primera victoria · servidor decide la
moneda premium (libro mayor idempotente) · gates de campeón nuevo · "el cliente pide, el servidor decide" · entrenamiento
que enseña jugando · identidad de arenas con mecánica propia · aliados con esquiva, revive y pelea por rol.

## 4. Mercado (RESEARCHED — búsqueda inicial, superficial)

Hechos con fuente (ver enlaces): el sentimiento del público va **en contra de pases y tiendas invasivas** (Inkbound retiró
toda monetización); Deep Rock Galactic es la referencia de monetización solo cosmética bien recibida; las guías de pase
recomiendan ≥ 30–40 % de recompensas gratis y sin FOMO; en poblaciones chicas la práctica estándar es ampliar
criterios y rellenar con bots avisando de ello.

- <https://www.pcgamesn.com/inkbound/monetization-changes>
- <https://bugnet.io/blog/how-to-run-matchmaking-with-a-low-player-population>
- <https://forums.ea.com/idea/battlefield-6-bug-reports-en/matchmaking-not-filling-small-modes-with-ai-to-start-the-round-bot-quota-issue/12808994>

Límite honesto: no hay cifras de ingresos/conversión/retención verificadas; no se hizo la matriz comparativa completa.
Pendiente: investigación profunda de roguelites actuales y cadencia de lanzamientos (ver §9).

**ADOPTAR** bots con aviso y humanos con prioridad · cosmético como única monetización · progreso visible.
**ADAPTAR** meta-progresión a *colección y maestría*, no a poder. **EVITAR** pase con FOMO, probabilidades opacas.
**OPORTUNIDAD** Guardianes como trofeos, sets con destino de drop visible, cooperativo que funciona con una sola persona.

## 5. Identidad (PROPUESTO)

*Juego La Horda y no un survivor-like genérico porque…* eliges un guardián de un universo grande (28 y creciendo), con
kit propio y lectura clara de cada ataque, y lo juegas **en equipo de cuatro aunque estés solo**, con compañeros
marcados como bots que cooperan de verdad. Pilares: **(1) Guardianes con kit propio y legible, (2) cooperativo siempre
disponible, (3) colección con destino claro (sets, Guardianes, maestría).**

## 6. Plan de población (cold start)

Principios: humanos primero → completar con compañeros del juego con nombre propio → empezar rápido → los compañeros del juego salen cuando sobran humanos.

| Población concurrente | Comportamiento objetivo |
|---|---|
| 1–10 | ⚡ JUGAR YA: sala pública + espera corta + bots. Parece funcional. |
| ~100 | Salas públicas con gente aparecen primero; la espera se extiende por cada humano. |
| ~1.000 | Preferir sala con humanos; reducir espera de relleno. |
| 10.000+ | Cola con prioridad humana (PROPUESTO); bots solo como relleno final. |

**IMPLEMENTADO (primera ola, rama `claude/quickplay-honest-bots`)**
- `js/net/quick-play.js` + tarjeta ⚡ JUGAR YA: unirse a la mejor sala pública con lugar (nivel parecido, más gente
  primero); si no hay, abrir una pública; esperar 8 s (+12 s por cada humano que entra; empieza antes si todos
  están listos); al terminar, los lugares vacíos los ocupan bots. Sin servidor online: solo con bots.
- Compañeros del juego con **nombre propio** (HUD, avisos, etiqueta sobre el personaje; `js/ai/bot-identity.js`): único, estable por guardián en la sesión y distinto al de un humano. Sin carteles "BOT" en juego (decisión del propietario: dar sensación de comunidad).
- Pruebas: `tools/net/quick-play.js` (relay real, 2 navegadores) y `tools/alpha/bot-identity.js`.

**PROPUESTO (siguiente)**
- *Backfill humano* (bot → humano en partida): la auditoría lista el estado a transferir (loadout, campeón libre,
  recomputar stats sin multiplicadores de bot, `_net`/`isRemote`, `netMatch.slots`, snapshot completo). Hacerlo solo en
  el cambio de nivel (pantalla de mejoras) para evitar saltos de stats. Requiere relajar `STARTED` en el relay solo
  para lugares de bot.
- *Bots con personalidad* (agresión, avaricia, cautela, trabajo en equipo; habilidad separada), nombres propios
  con nombre propio, frases contextuales deterministas y sin spam. Decisión de arquitectura: **utility AI sobre el
  `bot-brain.js` existente**, no aprendizaje automático (calidad suficiente, coste ≈ 0, latencia ≈ 0, depurable).
- Métricas de matchmaking: tiempo hasta primer humano, proporción humano/bot, revancha, abandono.

## 7. Roadmap

**P0 — supervivencia**: ⚡ JUGAR YA + bots rotulados (**hecho en rama**, falta validación completa y merge).

**P1 — diversión y retención**
1. Aviso/anticipo del golpe básico cuerpo a cuerpo (150–250 ms, arco en el suelo; mantener tope de daño).
2. Telemetría de decisiones (+2 líneas servidor): `champion_selected`, `match_start/end` con humanos/bots,
   `unlock_viewed/completed`, `item_skipped`, `bot_filled`. Cada métrica responde una decisión (ver §10).
3. Codex: mostrar cómo se desbloquea el campeón bloqueado + contador de progreso (`ascensionUnlockHint`).
4. Fin de partida: oro ganado + "lo más cerca de desbloquear".
5. Simulador de balance usable (≥ 10 semillas, 3 arenas, con/sin equipo; arreglar saturación del gate).
6. Mapa de aburrimiento (segundos sin dar ni recibir daño; fase de respiro 2.4×).
7. Telegrafiado de ventanas de jefe con `tele` nulo + validador que lo exija.

**P2 — crecimiento**: mejorar dificultades (mutadores), objetivo personal/"seguir recompensa", skins ≥ 3 por
campeón con transformación perceptible, hito de maestría por campeón con cosmético/título, backfill, amigos/recientes.

**P3 — escala**: eventos data-driven, configuración remota validada, temporadas (solo si la retención lo justifica),
cadencia de campeones (ver §9), A/B para onboarding.

## 8. Hipótesis (primera ola)

| Cambio | Métrica | Resultado esperado | Riesgo |
|---|---|---|---|
| ⚡ JUGAR YA | tiempo hasta primera partida de 4; partidas por jugador nuevo | primera partida cooperativa < 15 s sin sala llena | fragmentar población → mitigado con una sola cola pública |
| Bots rotulados | quejas "no sé quién es bot"; revancha | cero confusión | ruido visual de etiquetas → gris, pequeñas |
| Mostrar dónde caen piezas de set | repetición de arenas objetivo | más partidas repetidas a arenas con set buscado | información excesiva |

Nada de esto está medido todavía (no hay telemetría que lo valide): confianza actual **BAJA–MEDIA**, basada en práctica
de mercado y en pruebas funcionales.

## 9. Cadencia de campeones (PROPUESTO, sin evidencia propia todavía)

La capacidad de producir cinco por semana es del *pipeline*, no un compromiso de publicación. Con el estado actual
(arte revisado a mano, gate de balance que no detecta exceso de poder, 9 campeones sin skins) **no se recomienda
publicar cinco semanales**: la fábrica aún no demuestra QA visual, balance con muestra suficiente ni skins. Recomendación
inicial: **lotes pequeños (1–2 campeones excelentes por lanzamiento) con reveal, método de obtención, skins y desafíos**,
y subir la cadencia solo cuando el gate de balance detecte sobrepoder y las skins se fabriquen con transformación
perceptible. Esto es una recomendación a validar, no un hecho.

## 10. Preguntas de producto → métrica (PROPUESTO)

¿Por qué abandonan? → último estado de pantalla + duración. ¿Qué campeón enamora/se abandona? → `champion_selected` ÷
partidas segundas. ¿Habilidades que no se eligen? → talentos por campeón. ¿Cuánto tarda en encontrar un humano? →
`match_start` con humanos/bots y espera. ¿Cuántas partidas con bots? → proporción. ¿Vuelven a jugar con conocidos? →
revancha/amigos. Todas requieren la telemetría del P1-2.

## 11. Bloqueado / requiere decisión

- **Pagos reales**: requiere cuentas y credenciales del proveedor (variables del servidor). El código de tienda ya existe.
- **Telemetría nueva en producción**: requiere cambiar la lista blanca del servidor (`server/game-master.js`) y desplegar.
- **Política legal**: edad mínima de compra y reembolsos (decisión del propietario).

## 12. Registro de decisiones

**Bots: utility AI, no ML.** Problema: compañeros creíbles con coste cero. Evidencia: `bot-brain.js` ya hace esquiva con
reacción, revive y posicionamiento por rol; no hay datos de entrenamiento. Opciones: árboles/utility, FSM, imitación,
RL. Decisión: utility AI con parámetros de personalidad y habilidad. Motivo: calidad/coste/latencia/depurabilidad.
Riesgo: se vuelven predecibles → variar parámetros por sesión.

**Una sola cola pública.** Problema: fragmentar población pequeña. Decisión: ⚡ JUGAR YA usa la lista de salas públicas
existente; no crea colas por modo/dificultad.

**Compañeros del juego sin rótulo "BOT" en juego (decisión del propietario, reemplaza la regla inicial del prompt).**
Problema: con pocos jugadores un cartel "BOT" sobre cada compañero rompe la sensación de comunidad. Decisión: nombre propio
estable y distinto al de los humanos; ni el HUD ni los avisos ni la etiqueta dicen "BOT". Límites que se mantienen, y por qué:
(1) transparencia **general**, no por personaje: la Sala y el modo ⚡ JUGAR YA dicen que el juego completa los lugares libres,
Opciones lo explica y el resultado de la partida avisa "incluyó compañeros controlados por el juego"; (2) los compañeros del
juego no dicen ser personas ni inventan historias personales; (3) nunca se muestran cifras de jugadores conectados que incluyan
compañeros del juego ni se usan como prueba social para vender. Riesgo: si se descubre que eran compañeros del juego y no
había aviso, se pierde confianza → por eso el aviso general existe. Revisable por el propietario.

## Claridad del objetivo (primera arena) — prueba con personas simuladas
Método: 3 personas simuladas por modelo (Mateo 10, Dani 16, Marta 45) juegan solo con lo visible y responden 15 preguntas. LÍMITE: son modelos, no personas; no sustituyen una prueba con chicos reales (con consentimiento). Ninguna llegó a ver la victoria.
- Antes: objetivo escondido al final de una ficha con scroll; no sabían por qué se pierde ni qué pasa al acabarse el tiempo del nivel; tutorial trabado en el paso Botín (Mateo).
- Cambios: cartel fijo «OBJETIVO: sobrevivir · tiempo», tarjeta de misión, objetivo primero en la ficha, motivo de la derrota, «Sobreviviste», resumen de la primera victoria, tutorial en 14 pasos.
- Después (Marta, Dani): ambos responden objetivo, cómo se gana, cómo se pierde y qué pasa al acabar el tiempo correctamente.
- Pendiente (P1): flecha/botón claro para rescatar civiles, marcador sobre el aliado caído, cola de alertas, marca roja más fácil de esquivar, explicar los «+» de mejora, cuándo usar la ★, refuerzos con nombres técnicos, textos del Hechicero más cortos. Repetir con Mateo y con chicos reales.
