# ARENA IV — El Reino Micelial

> *"Todo lo que ves está vivo. Y crece."*

Cuarta arena de la campaña (Bosque → Acuática → Fortaleza → **Reino Micelial** → Hielo → Laberinto → Infernal).
Identidad: **EL ESCENARIO CRECE, MADURA Y MUERE.** Dark fantasy + horror fúngico + bioluminiscencia
psicodélica, sin arquitectura medieval. La caverna entera es UN organismo: **la Madre Espora**. Está
desde el nivel 1 (el capullo del centro del mapa ES ella) y se vuelve evidente de a poco.

## Archivos

| Qué | Dónde |
|---|---|
| Datos: mapa, etapas, estados de los hongos, **todo el balance** (`MIC_CFG`), fichas de enemigos | `js/arenas/micelial/mic-data.js` |
| Geometría (caverna orgánica + capullo sólido), túneles de aparición, etapas, estado sincronizado, prioridades de bots | `js/arenas/micelial/mic-map.js` |
| FUNGAL_NODE, Núcleos Miceliales, infección, nubes de esporas, peligros para bots | `js/arenas/micelial/mic-ecosystem.js` |
| IA de los 6 enemigos + estructuras | `js/arenas/micelial/mic-enemies.js` |
| Micelio Primigenio (subjefe) | `js/arenas/micelial/mic-subboss.js` |
| MOTHER_SPORE_CONTROLLER + La Madre Espora (jefe) | `js/arenas/micelial/mic-mother.js` |
| Dibujo (fondo que madura, hongos, infección, raíces, la Madre por partes, oscuridad, minimapa) | `js/arenas/micelial/mic-render.js` |
| Registro en `ARENA_DEFS`, atlas, perfiles de animación, guías de jefe, sonidos | `js/arenas/micelial/mic-arena.js` |
| Hojas fuente (oficiales) | `art-source/micelial/{enemies,bosses,map_initial,map_mature}.png` |
| Recorte y atlas | `tools/art/micelial/*.py` → `assets/sprites/arenas/micelial/<tipo>/atlas.png`, `fx/*.png`, `mother/*.png`, `map/*.jpg`, `meta.json` |
| Pruebas | `tools/micelial/` (ver abajo) |

Enganches NUEVOS al motor (sin efecto en las demás arenas; documentados en `arena-registry.js`):
`drawEnemyBody(e)` (cuerpo propio: núcleos, raíces, la Madre), `bossDefeated(boss)` + `finishBossVictory()`
(la victoria espera a la secuencia de muerte), `botTarget(h, range)` (prioridades propias de los
bots) y `camLift()` (la cámara se levanta para que entre un jefe enorme; `CAM_LIFT` en `camera.js`).

## MICELIAL_STAGE — el ciclo de vida del escenario

| Niveles | Etapa | Qué cambia |
|---|---|---|
| 1–2 | **Germinación** | semillas y brotes; el capullo late despacio; fondo violeta/cian |
| 3–5 | **Colonización** | aparecen los **Núcleos Miceliales**; +Peregrinos, +Hinchados, +Chamanes; el capullo late y se oye |
| 6 | **Maduración** | el **Micelio Primigenio** se arma delante del equipo; el fondo vira a verde/naranja |
| 7–9 | **Floración** | partes de la Madre intervienen (raíz gigante, brazo, nube de pared, hongo gigante) |
| 10 | **El Corazón** | casi no aparece nada, silencio, latidos, raíces que convergen… la estructura central ES el jefe |
| — | **Silencio** | la Madre murió: todo se marchita, fondo desaturado |

El fondo se funde gradualmente entre los dos mapas pintados (≈9 s por transición); al morir el
Reino se funde a una copia desaturada.

## FUNGAL_NODE (ecosistema)

54 lugares fijos (misma semilla en todos los clientes). Cada uno es **un número de estado**:
`SEED → SPROUT → GROWN → MATURE ⇄ SPORE_RELEASE → WITHERED → DEAD → EMPTY`. Sin IA: el anfitrión
los avanza con un reloj barato (una pasada cada 450 ms) y viajan como UNA cadena de texto. La
cantidad viva sigue la etapa (30 % → 86 %). Los Núcleos y el Chamán los hacen madurar, al destruir
un núcleo se marchitan los suyos, en la Floración de la Madre todos se encienden, y al morir la
Madre todos se marchitan y quedan muertos. El crecimiento suave y las esporas son locales (cada
cliente).

## Núcleos Miceliales

Desde el nivel 3 (cada 11-16 s, máximo 2-4 vivos según la etapa, cerca del equipo). 4 etapas de
7,5 s: **1** expande micelio (solo territorio) · **2** ralentiza (22 %) · **3** madura hongos,
ralentiza 30 % y la colonia se mueve 14 % más rápido encima · **4** genera colonia (con tope global)
y estallidos de esporas telegrafiados donde haya alguien parado. Se destruyen; su infección se
retira de a poco. **Nunca daño constante**: la infección afecta movilidad, aparición y territorio.

## Enemigos

| Enemigo | Rango | Rol | Mecánica |
|---|---|---|---|
| Infectado Micelial | normal | masa cuerpo a cuerpo | 30 % deja una nube de esporas al morir (con tope de nubes) |
| Acechador de Esporas | subélite | emboscada | se entierra (tierra removida + brillo tenue: nunca invisible sin aviso), avanza, **avisa** (círculo + línea + siseo) y salta; al caer queda expuesto |
| Hinchado | élite | tanque | puñetazo en cono telegrafiado + **explosión preparada** (1,6 s de aviso); al morir revienta con aviso |
| Peregrino Enraizado | subélite | tirador | camina disparando poco; **se planta** (raíces) y dispara más lejos, más seguido y más fuerte; se desentierra si lo encaran |
| Sabueso Cordyceps | normal | jauría | llega de a 2-3, salto corto con aviso, rastro bioluminiscente |
| Chamán de la Colonia | élite | **apoyo prioritario** | regeneración canalizada (anillo + rayos visibles, se corta aturdiéndolo), acelera la germinación de núcleos, bolas de esporas, aura que potencia (anillo violeta) |

Topes por tipo en la aparición (Peregrino 4, Hinchado 3, Chamán 2, Acechador 5) para que la
presión venga de la colonia y de los núcleos, no de una pared de tiradores.

## Subjefe — Micelio Primigenio (nivel 6)

Se **construye** delante del equipo: temblor, raíces desde los 4 cadáveres colonizados más
cercanos, los arrastra al punto de fusión, la masa crece y se levanta (5,2 s, invulnerable mientras
se arma). Kit: Zarpazo (cono), Latigazo de Raíz (1-3 líneas), Lluvia de Esporas (círculos),
Germinación (siembra un núcleo), **Absorción** (desde 72 % de vida, máximo 3 veces, enfriamiento
19 s): 3 raíces hacia los cadáveres lo curan mientras vivan (tope 12 % por absorción); romperlas
la corta. Al morir colapsa y el suelo se lo traga: manchón de micelio, florecen los hongos y el
capullo late más fuerte. El nivel 6 no termina mientras siga vivo.

## Jefe — La Madre Espora (nivel 10)

Enorme, incrustada en el centro, no camina. Se dibuja como parte del escenario (nadie queda tapado)
a partir del retrato pintado, con partes vivas encima (sombrero que late, brazos que brillan al
atacar, corazón). Golpeable de cerca desde el frente (punto de impacto al pie del capullo).

- **Nivel 10:** 17 s de "el Reino contiene la respiración" (pocas apariciones, silencio, latidos,
  raíces que convergen) → **revelación** (9 s: se agrieta el capullo y ella emerge) → pelea.
- **Fase 1 Colonia (100-60 %):** raíces en círculos, esporas en abanico, latigazo en línea,
  invocaciones con tope (6), zarpazo si la encaran.
- **Fase 2 Floración (60-30 %):** se cierra (invulnerable 3 s), **1,6 s de casi oscuridad**, todos los
  hongos se encienden (cian/azul/magenta/violeta/rosa/verde), nubes de esporas y **alucinaciones**
  (translúcidas, sin sombra, borde que cambia de color, se deshacen al tocar a alguien: **no hacen daño**).
- **Fase 3 Corazón (30-0 %):** el torso se abre y el corazón late expuesto (+35 % de daño recibido).
  La infección cubre la arena desde los bordes durante 75 s y la zona segura (frente a ella) se
  achica: afuera ralentiza y daña de a poco. **Enrage suave por espacio, no por daño x5.**
- **Muerte (10,5 s):** el corazón se detiene → se apagan las luces → las raíces se aflojan → los
  hongos se marchitan → la estructura colapsa → se desintegra → última liberación de esporas →
  silencio → victoria. Mientras dura no se puede perder. La arena queda muerta y desaturada.

## Red (anfitrión autoritativo)

Todo lo que cambia el juego lo decide el anfitrión y viaja en `micNetState()` (etapa, cadena de
hongos, nubes, raíces, brazos, hongos gigantes, alucinaciones, estado del Micelio y de la Madre).
Núcleos, raíces de absorción y la Madre son enemigos: se sincronizan como cualquier enemigo. Lo
decorativo (polvillo, crecimiento suave, rastros de Sabueso, esporas al liberar) lo anima cada
cliente. La ralentización de la infección se aplica en el anfitrión a los héroes remotos.

## Bots

Priorizan al **Chamán**, las **Raíces de Absorción**, los **Núcleos** maduros (o cualquiera si la
infección es alta) y el **corazón** en la fase 3 (`botTarget`). Esquivan nubes, zonas de núcleos
maduros, todos los avisos (`vfxTelegraph`, `bossStrike`) y en la fase 3 vuelven a la zona segura
(`botDanger`).

## Audio

Sintetizado (`ARENA_SFX`, reemplazable por grabaciones): latido del capullo (desde el nivel 3),
latido fuerte (nivel 10 y fase 3), crecimiento, esporas, raíces, siseo del Acechador, aullido,
inflado/estallido del Hinchado, canto del Chamán, temblor, grieta, oscuridad, floración, apertura
del torso, colapso, corazón que se detiene, liberación final y **silencio** (baja la música).

## Rendimiento

Pools fijos (motas, rastros), hongos sin lógica por cuadro, núcleos baratos, nubes con tope (10),
alucinaciones con tope (10), raíces/brazos/gigantes con tope. Medido: `update()` ≈0,2 ms por cuadro
con 36 enemigos + núcleos + nubes; dibujo ≈9 ms por cuadro (Chromium sin GPU).

## Pruebas (`tools/micelial/`)

```bash
python3 -m http.server 8771 &
(cd server && PORT=8799 node relay.js &)            # solo para la red
node tools/micelial/t_micelial.js                   # 33 chequeos: geometría, conexidad, aparición,
                                                    # etapas, hongos, núcleos, los 6 enemigos, bots,
                                                    # subjefe, intervenciones, Madre (3 fases, alucinaciones,
                                                    # zona segura, muerte y victoria), guardado, rendimiento
node tools/micelial/t_micelial_net.js 1 /tmp/mn     # cooperativo 2 jugadores
node tools/micelial/t_micelial_net.js 3 /tmp/mn     # cooperativo 4 jugadores
node tools/micelial/run_full.js 1 guerrero 1        # partida COMPLETA 1+3 bots, modo dios
CLVL=26 node tools/micelial/run_full.js 0 tanque 1  # partida completa real (sin ayudas)
node tools/micelial/smoke.js /tmp/ms                # capturas por etapa
node tools/micelial/shots_boss.js /tmp/mb           # capturas: revelación, fases y muerte de la Madre
```

## Limitaciones conocidas

- La Madre no tiene frames de animación completos: el retrato pintado se anima por partes
  (respiración, brillos aditivos de sombrero/brazos, corazón procedural, cierre/colapso por
  transformación). El atlas `madre_espora` recortado queda disponible pero no se usa (a escala de
  jefe se veía pixelado).
- En pantallas apaisadas muy bajas la Madre no entra entera si el jugador está lejos; la cámara
  se levanta hasta dejar al jugador a 130 u del borde inferior.
