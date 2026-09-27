# LA HORDA — CIUDAD MALDITA · INFORME DE IMPLEMENTACIÓN

> **"NO PODÉS SALVARLOS A TODOS. PERO VAS A INTENTARLO."**
> Una arena sobre decidir qué vale la pena salvar mientras todo se derrumba.

La Ciudad Maldita pasó de "en construcción" a **Arena 01 jugable**, con mapa propio, civiles, estructuras,
nueve enemigos con IA propia, dos batallas de subjefes en el nivel 9 y El Presentador en el nivel 10.
Todo el arte sale de las 4 hojas oficiales. Lo que falta producir está en `LA_HORDA_CITY_MISSING_ASSETS.md`.

## 1. Cómo se juega

1. Entrás por el arrabal (sur). La Puerta de Evacuación queda a tus espaldas.
2. **Civiles escondidos** en casas y callejones: se delatan con un **«?»** y sollozos cuando estás cerca.
   Al acercarte quedan **descubiertos** (IDLE) y aparece **RESCATAR** (mismo botón que Revivir / tecla E).
3. Mantenés RESCATAR y te **siguen** (en fila, por las puertas: siguen tu camino real).
4. Los llevás a una **zona segura** (escudo verde): el Refugio del Norte, el Refugio del Este, la Capilla o la
   Puerta de Evacuación → **+1 RESCATADO**.
5. Mientras tanto, la Horda **saquea** (va por los civiles solos), **secuestra** (el Raptor se los lleva por un
   borde), **asedia** (el Verdugo derriba edificios), **grita** (la Plañidera los hace entrar en pánico),
   **embosca** desde los tejados (Acechante) y **llama refuerzos** con las campanas (Campanero).
6. Nivel 9: suenan aplausos y se levanta el telón → **Maestro de Ceremonias + Tramoyista** juntos → **apagón** →
   **La Dama del Telón** → cae el telón.
7. Nivel 10: el equipo pasa al escenario de la catedral → **El Presentador** en tres actos.
8. Resultados: civiles encontrados / rescatados / perdidos, estructuras en pie y bono de rescate
   (oro + XP, **RESCATE PERFECTO** si no se pierde nadie).

## 2. Auditoría previa (lo que se reutilizó del motor, sin tocarlo)

| Sistema existente | Cómo lo usa la Ciudad |
|---|---|
| `ARENA_DEFS` (arena-registry) | Todos los ganchos: ciclo, geometría, navegación, oleadas, IA, bots, dibujo, red, resultados |
| Acción contextual (`CTX_KINDS`) | `cm_civ` = RESCATAR (progreso lo lleva solo el anfitrión: nunca doble rescate) |
| Navegación por campo de flujo | Grilla propia con `navBlocked` + campos hacia cada zona segura (civiles que corren solos) |
| `ENEMY_ATLAS_PACK` / `packSet` | Atlas recortados, animaciones de habilidad por set; `atlasKey` para las 3 formas del Presentador |
| `bossSheetFx` / `VFX_SPR_EXTRA` | Todos los efectos de las hojas |
| Telegraphs (`vfxTelegraph`) | Todo golpe fuerte avisa antes (cono, círculo, línea, anillo) |
| Tutorial del Hechicero (`tutSay`) | Guía breve: primer civil, seguir, a salvo, Raptor, Verdugo, grito, campana, sectario, tejados, Acto III |
| `holdLevel` / `bossDefeated` | Nivel 9 con dos batallas; muerte del Presentador con secuencia propia antes de `finishBossVictory` |
| Red host-autoritativa | Estado de la arena en el `netState`; el invitado solo anima relojes |

Nada de los sistemas existentes se eliminó ni degradó (ver §8, regresión).

## 3. Archivos

| Archivo | Qué hace |
|---|---|
| `js/arenas/ciudad/cm-data.js` | Mapa (17 edificios), estructuras, puntos (salidas, cloacas, campanas, escondites), balance `CM_CFG`, fichas de 14 tipos |
| `js/arenas/ciudad/cm-map.js` | Paredes con puertas, colisión círculo-rectángulo, navegación, interiores, campos hacia zonas seguras, apariciones |
| `js/arenas/ciudad/cm-civilians.js` | Civiles (10 estados), RESCATAR, migas de pan, estructuras, derrota, alertas, recompensas y resultados |
| `js/arenas/ciudad/cm-enemies.js` | IA de los 9 enemigos, proyectiles, oleadas progresivas |
| `js/arenas/ciudad/cm-bosses.js` | Nivel 9 (Maestro + Tramoyista → apagón → Dama), nivel 10 (Presentador, 3 actos, ovación, muerte) |
| `js/arenas/ciudad/cm-render.js` | Piso, edificios oblicuos con fundido LOCAL de techos, civiles, estructuras, HUD, minimapa, apagón |
| `js/arenas/ciudad/cm-arena.js` | Registro en `ARENA_DEFS`, atlas, 43 sonidos, guías de jefe, bots, red |
| `js/assets/ciudad-meta.js` | Generado por el recortador (atlas, efectos, piezas, texturas) |
| `tools/art/ciudad/extract.py` | Recortador de las 4 hojas (grillas, secuencias, efectos, piezas, texturas) |
| `tools/ciudad/smoke.js` | Humo de la arena (17 comprobaciones) |
| `tools/net-test/ciudad_coop.js` | Cooperativo real con relay (9 comprobaciones) |
| Cambios chicos | `js/data/arenas.js` (Arena 01 jugable), `arena-rules.js` (regla "La Ciudad Arde"), `save.js` (migración `ciudadV1`), `end-screens.js` (filas de resultados de arena), `codex-content.js` (fichas), `index.html` |

## 4. Sistemas

### Mapa y edificios
- 3000 × 2350 u: calle principal N-S, avenida E-O, plaza con la estatua maldita y la fuente, escenario frente a
  la catedral, 12 casas enterables, 2 refugios, capilla, campanario, torre de vigía y la Puerta de Evacuación.
- **Colisión real**: cada casa son 4 paredes con un hueco de puerta; torres y catedral son macizas.
- **Fundido local**: al entrar, el techo y la pared frontal se desvanecen **solo en la pantalla del que entró**;
  la colisión no cambia y los demás siguen viendo el techo. Si quedás detrás de un edificio, su techo se aclara.
- Navegación: grilla del motor con `navBlocked`; se reconstruye si cambia la geometría (refugio destruido =
  puerta tapiada, barricadas, pilares del escenario).

### Civiles (el corazón)
Estados: **HIDDEN · IDLE · FOLLOW · PANIC · RUN · HURT · KIDNAPPED · FLEE · RESCUED · DEAD**, tres variantes
(aldeano, mujer, niño). Son **inmunes a los campeones** porque no son enemigos (viven en el estado de la arena);
solo los lastiman ataques enemigos **con aviso** (un «!» rojo encima). 90 de vida.
- Por nivel: 2 · 3 · 4 · 4 · 4 · 4 · 4 · 4 · 2 · 0 (31 en total). El primero está a pasos de la entrada (tutorial).
- Siguen por **migas de pan** del campeón (atraviesan puertas); si su campeón cae o se aleja demasiado, se quedan.
- Si un refugio cae, sus refugiados salen **corriendo solos** al refugio en pie más cercano (hay que cubrirlos).
- Al empezar el jefe, los que venían escoltados quedan a salvo tras bambalinas.

### Estructuras
Refugio del Norte, Refugio del Este, Capilla, Puerta de Evacuación (**críticas**) y Torre de Vigía.
INTACTA → DAÑADA → CRÍTICA → DESTRUIDA, **sin reparación**. Consecuencias: el refugio pierde su zona segura y
suelta a sus refugiados; la puerta cierra la evacuación; la torre apaga las pistas del minimapa.
**Derrota** si caen todas las críticas. Regla creciente: "La Ciudad Arde" (+4% de daño a edificios por nivel).

### Enemigos (introducción progresiva)
| Nivel | Entra | Qué enseña |
|---|---|---|
| 1 | Saqueador | pelear y proteger (va por los civiles solos) |
| 2 | Perro del Albañal | no dejar civiles corriendo solos |
| 3 | **Raptor** | secuestro: pegarle/aturdirlo lo suelta |
| 4 | **Verdugo** | asedio a edificios |
| 5 | **Plañidera** | grito de pánico |
| 6 | **Acechante**, Sectario | emboscadas desde los tejados, explosiones |
| 7 | **Campanero**, Espectro | cortar una canalización; atraviesa paredes |
| 8 | todos | sinergias |

Sinergias: la Plañidera dispersa la fila y el Raptor y los Perros cazan a los que quedan solos; el Campanero
revela civiles pero también atrae refuerzos; el Verdugo tira un refugio y sus refugiados quedan expuestos.

### Nivel 9 — dos batallas
1. **Maestro de Ceremonias** (marca que sigue y estalla, zonas, abanicos, teletransporte) + **Tramoyista**
   (golpe en cono, decorado que cae sobre las marcas del Maestro, lanzamiento de utilería, barricadas
   temporales — máximo 2, vencen solas, nunca sobre héroes, puertas ni zonas seguras: **sin encierros**).
   Si uno cae, el otro se enfurece. Barras de vida dobles propias.
2. **Apagón** → **La Dama del Telón** con reflector: telones en línea, zonas oscuras, espejismos, **ecos** de las
   mecánicas anteriores (marca + decorado + almas) y estallido al 30%.
3. **Cae el telón**: «…y detrás, en la catedral, ALGUIEN APLAUDE.»

### Nivel 10 — El Presentador (no es un Guardián)
- **Acto I**: abanicos, reflectores que estallan, telón del caos, voluntarios del público (sectarios).
- **Acto II** (66%): transformación (invulnerable 3,2 s), pilares en el escenario, **ecos limitados** de los
  subjefes (uno por vez).
- **Acto III** (33%): forma verdadera, oscuridad, **espectadores espectrales** que disparan con aviso y la
  **OVACIÓN FINAL**: 3 s de aviso, el que no está cubierto detrás de un pilar pierde el 45% de su vida.
- Pocas líneas; **línea especial si el rescate fue perfecto**. Muerte: 9,5 s con cámara lenta, destello,
  explosión final y los aplausos de la gente que salvaste.
- **Reconocimiento sin castigo**: cada 3 rescatados = +1% de daño (máx. +8%) y menos espectadores hostiles
  (6 − rescatados/6, mínimo 2). Rescatar poco nunca empeora la pelea respecto de la base.

### HUD, audio, bots y red
- Panel: rescatados · perdidos · en peligro · te siguen; fila de estructuras por color; **alertas prioritarias con
  flecha** (secuestro, campana, edificio bajo ataque, civil atacado, refugiados huyendo); minimapa.
- 43 sonidos sintetizados (`ARENA_SFX`, reemplazables por grabaciones).
- **Bots**: van a rescatar civiles descubiertos (`botWorth`), **escoltan** a la zona segura más cercana (esperan a
  la fila), priorizan Raptor con civil > Campanero canalizando > Verdugo sobre un edificio, esquivan avisos y en
  la ovación buscan un pilar.
- **Red**: el anfitrión simula todo; el estado viaja en el snapshot. El invitado RESCATA mandando la acción al
  anfitrión; dos que rescatan al mismo civil a la vez → un solo líder.

## 5. Recompensas (data-driven: `CM_CFG.reward`)
Por civil rescatado: 6 de oro + 14 de XP (×1 + 8% por nivel alcanzado). RESCATE PERFECTO: +150 oro + 320 XP.
Victoria: +25 de oro por estructura en pie. Derrota: la mitad del bono (después de la penalidad normal).

## 6. Campaña y guardados
- Ciudad Maldita = **Arena 01 jugable** y primera frontera de la campaña.
- Migración `ciudadV1`: un guardado que ya había avanzado **conserva abierta su frontera anterior** (y todo lo
  completado); un perfil nuevo o sin progreso empieza por la Ciudad.
- Códice: 9 criaturas, Maestro + Tramoyista (grupo), Dama del Telón, El Presentador (formas ocultas hasta
  vencerlo) y la ficha de la arena con arte del mapa oficial.

## 7. Inventario de las 4 hojas (ingesta de assets)

| Hoja | Usable directo | Recorte | Limpieza aplicada | Solo referencia | Falta |
|---|---|---|---|---|---|
| Enemigos 1 | civiles (6 filas × 3) | grillas Saqueador/Raptor/Verdugo + 15 paneles + 4 efectos | fondo a cuadros, títulos de panel | ilustraciones grandes | ciclos de caminata completos |
| Enemigos 2 | — | 6 grillas + 16 paneles + 20 efectos | fondo, títulos celestes/crema | ilustraciones, paletas | ciclos de caminata |
| Jefes | — | 5 grillas + 10 paneles + 11 efectos + 8 pilares | fondo, cuadros pegados | rostros/variantes, forma verdadera (collage) | forma verdadera animada, retrato |
| Mapa | texturas (11) + 16 props de la leyenda | — | — | mapa isométrico general, capas, vista lateral, interiores | tileset para vista superior |

Integridad de píxel: coordenadas enteras al dibujar, `imageSmoothingEnabled = false`, patrones escalados ×2
enteros, alfa real (sin fondo a cuadros), sin reescalado en el recorte.

## 8. Pruebas

| Prueba | Resultado |
|---|---|
| `tools/ciudad/smoke.js` (arena jugable, estado, fundido de techo, descubrir, seguir, rescatar, secuestro y suelta, estructura cae y refugiados huyen, subjefes, Dama, nivel 9 completo, Presentador, actos 2 y 3, victoria, resultados) | **17/17 OK · 0 errores** |
| `tools/net-test/ciudad_coop.js` (anfitrión escritorio + invitado celular) | **9/9 OK · 0 errores** |
| Playtest con bots (nivel 3, 6 civiles descubiertos a la vez) | bots rescatan y escoltan; 60 fps (mediana 16,7 ms, p95 18,2 ms) |
| Regresión `tools/items/t_*.js` (18 suites) | **todas OK** (campaña, ítems y Códice actualizados al nuevo orden) |
| Humo del Reino Micelial y de la Fábrica | 0 errores |

Pruebas de red previas que ya fallaban igual en `main` antes de este cambio (e2e jefe/victoria, campaign-gate,
loop, disconnect) quedan documentadas como pendientes, sin cambios.

## 9. Límites conocidos y próximos pasos
- Caminatas de 2 cuadros por dirección (las grillas traen un cuadro por estado): ver CM-A01…A13.
- Forma verdadera del Presentador: la hoja es un collage; hoy se usa la grilla de fase 3 + transformación + muerte.
- Tileset de vista superior propio (techos, paredes, ruinas, muebles, edificios de estructura).
- Sonidos sintetizados: reemplazar por grabaciones (campana, grito, aplausos, voces).
- Balance a revisar en playtest humano: aguante de civiles (`CM_CFG.civ.hp`), ritmo del Saqueador sobre civiles
  (`civCd`), vida de estructuras y daño del Verdugo.

## 10. Reglas de diseño respetadas
Sin fuego amigo (los civiles tampoco reciben daño de campeones), sin núcleo de explosión de cadáveres, sin dash
universal, sin crafteo de Únicos, sin pay-to-win, sin placeholders feos. Los Cuatro Guardianes siguen siendo el
Mago Gélido, el Guardián Élfico, el Guardián del Laberinto y el Hechicero: El Presentador no es un Guardián.
