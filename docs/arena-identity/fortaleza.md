# ARENA III — La Fortaleza Sin Fin

> *"Las máquinas todavía recuerdan a sus prisioneros."*

Tercera arena de la campaña (Bosque → Acuática → **Fortaleza** → Hielo → Laberinto → Infernal).
Identidad: **la fortaleza es un enemigo más**. No es un coliseo: es UN mapa continuo y grande
(2680 × 6800 unidades, ~10 veces el coliseo) que el equipo recorre de sur a norte, dividido en
sectores por puertas, puentes y mecanismos que se mueven.

## Archivos

| Qué | Dónde |
|---|---|
| Datos: sectores, plataformas, puertas, puentes, trampas, puntos de aparición, **todo el balance** (`FORT_CFG`), fichas de enemigos | `js/arenas/fortaleza/fort-data.js` |
| Geometría viva, conectividad, puertas, puentes, puerta del Caballero, aparición por sector, red | `js/arenas/fortaleza/fort-map.js` |
| Ciclo Mecánico (5 trampas + director), redes de la Araña, peligros para bots | `js/arenas/fortaleza/fort-traps.js` |
| IA de los 6 enemigos (+ Engendro) | `js/arenas/fortaleza/fort-enemies.js` |
| Dragón de la Forja (subjefe) y Caballero de la Armadura Oxidada (jefe) | `js/arenas/fortaleza/fort-bosses.js` |
| Arte del escenario (pixel art por código) | `js/arenas/fortaleza/fort-art.js` |
| Dibujo (mundo, puertas, trampas, capa superior, minimapa) | `js/arenas/fortaleza/fort-render.js` |
| Registro en `ARENA_DEFS`, atlas, guías de jefe, sonidos | `js/arenas/fortaleza/fort-arena.js` |
| Hojas fuente (oficiales) | `art-source/fortaleza/{enemies,bosses,map_reference}.png` |
| Recorte y atlas | `tools/art/fortaleza/*.py` → `assets/sprites/arenas/fortaleza/<tipo>/atlas.png`, `fx/*.png`, `meta.json` |
| Pruebas | `tools/fortaleza/` (ver su README) |

Enganches al motor (todos por `arenaHook`, sin efecto en las demás arenas): colisión
(`clampToArena`), `aidInside`, grilla de navegación del tamaño del mapa, `spawnPoolFor` /
`spawnEnemy`, `update` (mecanismos, IA propia, objetivo alcanzable, fin de nivel retenido),
`killEnemy`, bots (peligros, objetivos y reagrupación alcanzables, pociones alcanzables), red
(estado de la arena en el snapshot + `arenaTitleCard` como evento), dibujo (mundo, piezas altas,
capa superior, minimapa, proyectil propio, altura de vuelo en `drawEnemyAtlasPack`), audio
(`ARENA_SFX`), guía de jefes (`ARENA_BOSS_TIPS`), Nigromante (su correa ya no depende del
origen del mapa).

## Recorrido y niveles

| Nivel | Sector | Qué pasa |
|---|---|---|
| 1–2 | Patio de Armas (entrada) | Carceleros + Dragones de Bronce. Cartel "ARENA III". |
| 3–4 | La Prisión | se abre el rastrillo; +Prisioneros, +Arañas; **empiezan las trampas** |
| 5 | Puentes Mecánicos | +Autómatas, +Verdugos; **primera gran reconfiguración** (giratorio) |
| 6 | La Forja | baja el puente levadizo; **SUBJEFE: Dragón de la Forja** (el nivel no termina hasta matarlo) |
| 7–8 | Interior Industrial | la muerte del Dragón voló la compuerta; plataforma que se desliza sobre el canal |
| 9 | El Núcleo | disco central con 4 brazos que se retraen por turnos |
| 10 | Cámara del Caballero | **JEFE: Caballero de la Armadura Oxidada** |

La aparición de enemigos usa las puertas/túneles del sector actual (± uno), prefiere las que
están fuera de cámara y SOLO las que se pueden alcanzar caminando desde algún héroe (los
voladores, cualquiera). Ritmo: ×1,4 más lento que el estándar, roster más pesado.

## Mecanismos (reconfiguración)

- **Giratorio de los Puentes** (2 brazos opuestos que giran 90°): Norte-Sur = camino a la Forja;
  Oeste-Este = une las plataformas laterales. Arranca **recogido (O-E)** para que no sirva de
  atajo sobre la puerta cerrada antes del nivel 5.
- **Puente levadizo** a la Forja (baja al empezar el nivel 6 y no sube más).
- **Plataforma deslizante** sobre el canal de lava del Interior (atajo; los pasillos de los
  costados quedan siempre).
- **Brazos del Núcleo**: siempre quedan 2 extendidos (patrones que rotan); en el nivel 10 o sin
  nadie en el Núcleo, todos extendidos.

Reglas de seguridad (sin softlocks, nunca muerte por geometría):
1. Toda reconfiguración **avisa**: bocina + engranajes (`fortBridgeWarn`), temblor, cartel,
   anillo punteado naranja sobre el mecanismo; **espera 2,6 s** antes de moverse.
2. Un puente que se mueve **lleva encima** a quien esté parado sobre él (héroes vivos y caídos,
   enemigos, pociones). Un brazo que se retrae empuja hacia el disco.
3. Lo caminable es una unión de rectángulos: el ajuste lleva al borde caminable más cercano,
   nunca a la lava. Se aplica a héroes (cada cuadro), enemigos (antes y después de moverse),
   invocaciones del Nigromante y puntos de habilidades.
4. Los mecanismos **siempre vuelven a ciclar** mientras haya alguien en su sector (el que queda
   aislado se reconecta solo en el siguiente giro, ≤ ~20 s) y sin nadie vuelven a la posición que
   deja el camino abierto.
5. Las puertas nunca se cierran con alguien en el hueco.
6. Redes de seguridad: la compuerta del Interior se abre igual desde el nivel 7; en el nivel 10,
   si en 45 s no entró todo el equipo, la Fortaleza arrastra a los rezagados (vivos y caídos).
7. Enemigos varados del otro lado de un puente, lejos de todos, reaparecen por una puerta a los 12 s.

## Ciclo Mecánico (trampas)

| Trampa | Aviso | Efecto |
|---|---|---|
| Rejilla de vapor | círculo blanco + siseo, 2,0 s | ráfaga: 7% de vida máx + empujón |
| Engranaje en riel | línea naranja + engranajes, 1,8 s | rueda de punta a punta: 8% + empujón al costado |
| Cadena que barre | abanico gris + cadenas, 1,7 s | barrido: 8% + empujón en el sentido del barrido |
| Rejilla de forja | rectángulo naranja + horno, 2,3 s | al rojo 3,6 s: 5%/s mientras se esté encima |
| Prensa | rectángulo rojo + alarma, 1,7 s; el bloque baja y su sombra crece | 13% + aturdimiento 0,6 s (inmunidad 3,2 s) |

Director: arranca en el nivel 3; **una** trampa a la vez (dos en el Núcleo y en la fase 3 del
Caballero; en la fase 2 despierta de a poco), siempre cerca del equipo, nunca pegada a otra
activa. Intervalo 11,5 s (nivel 3) → 6,5 s (nivel 10), más lento con menos héroes vivos, con
muchos enemigos o durante el Dragón. Las trampas también lastiman a los enemigos comunes (se
puede atraerlos). Daño +5% por nivel ("Engranajes Implacables", la regla creciente de la arena).

## Enemigos (arte real de la hoja oficial)

| Enemigo | Rango | Escala | Kit |
|---|---|---|---|
| Carcelero Deforme | normal | 1,1 | golpe + **Tirón de Cadena** (aviso en línea 0,75 s, cadena que se esquiva, arrastra ≤200, inmunidad 4,5 s, nunca hacia una trampa activa) |
| Dragón de Bronce | normal, **volador** | 0,9 | acosa en órbita, **mordida en picada**, **Aliento de Vapor** (cono, ralentiza), al morir **estalla** (aviso 0,65 s antes del daño) |
| Autómata de Hierro | élite, blindado (×0,78) | 1,3 | golpe frontal (cono), **Protocolo de Embestida** (línea 1 s); si choca con un borde queda **aturdido 2,5 s y vulnerable** |
| Prisionero Ensamblado | normal | 1,1 | enjambre en zigzag, garras; al morir **se parte en 2 Engendros** (que no se parten) |
| Verdugo de Vapor | élite | 1,4 | hacha en cono; **Sobrepresión**: +60% velocidad, +40% daño, pero **recibe +35%** |
| Araña Mecánica | subélite, a distancia | 0,8 | mantiene distancia, dispara pernos, **Red de Cadenas** (zona lenta con aviso), **repara** a los mecánicos con un rayo visible (interrumpible) |

## Subjefe: Dragón de la Forja (nivel 6)

Al 30% del nivel golpea la compuerta del horno (3 golpes con temblor y chispas) y **la revienta**
(explosión, humo, fuego, metal). Cartel "SUBJEFE". Kit: Mordida (cono), **Aliento de Forja**
(barrido de fuego de un lado al otro con aviso de todo el abanico), **Bombardeo** (vuela alto y
tira 6 bombas con círculo en el piso 1,25 s antes), **Aleteo de Vapor** (empuje en círculo).
**Sobrecarga** al 30%: brillo naranja-blanco, más rápido y con enfriamientos ×0,65. Al morir
explota y **abre la compuerta blindada** al Interior. El nivel 6 no termina mientras viva.

## Jefe: Caballero de la Armadura Oxidada (nivel 10)

Espera frente a su trono (sin oleadas). Cuando entra **todo** el equipo: la puerta se cierra
(golpe seco, silencio de 1,3 s), despiertan los engranajes y se levanta. Cartel "JEFE".

- **Fase 1 (100–65%)**: Espadazo, Golpe de Escudo (empuja), Barrido (círculo), **Carga** contra el
  héroe más lejano, **Postura de Contraataque** (brillo azul: si le pegás responde ×1,7; si
  esperás queda EXPUESTO ×1,3).
- **Fase 2 (65–30%)**: clava la espada, **la cámara despierta** de a poco (trampas de la cámara),
  **Orden del Carcelero**: 2 refuerzos cada 15 s, tope de 4.
- **Fase 3 (30–0%)**: transformación (invulnerable 1,7 s), cadenas desde los pilares, pierde el
  escudo, espada a dos manos: ×1,35 velocidad, combos Espadazo→Barrido, **Ejecución Oxidada**
  (línea roja de 760 × 160 con 1,5 s de aviso; hasta 55% de vida: enorme pero nunca un golpe
  inevitable ni un "one-shot" desde vida llena). Misma vida: la dificultad sube por ritmo.

## Multijugador y bots

- El estado de la arena (`fortS`: puertas, giratorio, brazos, plataforma, trampas, redes,
  Caballero, Dragón) viaja en cada snapshot (`NET_GLOBALS.arenaState`); los invitados lo aplican,
  rearman la geometría y animan entre snapshots. El anfitrión decide todo (aparición, objetivos,
  vida, muertes, trampas, fases, refuerzos, proyectiles).
- Si un puente mueve al héroe de un invitado, el anfitrión lo corrige (`posAuth`) y el invitado
  lo ve moverse con el puente.
- Bots: esquivan trampas activas y redes; un bot cuerpo a cuerpo no persigue enemigos que no
  puede alcanzar; si el jugador quedó del otro lado de un puente, **espera en el borde de su
  tramo más cercano** (no camina contra la lava); no van a buscar pociones inalcanzables.

## Audio (sintetizado, reemplazable por grabaciones)

`fortBridgeWarn` (alarma de reconfiguración), `fortBridge`, `fortClank`, `fortGate`,
`fortDoorSlam`, `fortGears`, `fortSteam*`, `fortChain*`, `fortFurnace`, `fortPress*`,
`fortGearRoll`, `fortBite`, `fortWing`, `fortAutomataCharge`, `fortCrash`, `fortSlam`, `fortRip`,
`fortAxe`, `fortRepair`, `fortBolt`, `fortForgeBang`, `fortMetal`, `fortBlast`, `fortOverload`,
`fortFireBreath`, `fortBomb`, `fortBell`, `fortSword`, `fortShieldBash`, `fortCharge`,
`fortExecWarn`, `fortExec`, `fortPhase2`, `fortPhase3`. **Faltan grabaciones reales** (engranajes,
cadenas, campanas, hornos): hoy son sonidos generados.

## Arte: lo que falta / decisiones

- Personajes y FX: recortes reales de las hojas oficiales, fondo transparente, pies alineados,
  una sola escala por tipo. Miran a la derecha y se espejan.
- **Escenario**: la hoja del mapa es una ilustración isométrica sin piezas separables; el
  escenario se pinta por código en pixel art con su paleta y motivos (no se "reinterpretó" a los
  personajes).
- El Caballero **no tiene cuadro "sentado"**: espera de pie frente al trono.
- Los Dragones tienen una sola vista lateral (se espeja); el de Bronce vuela a baja altura.

## Balance (todo en `FORT_CFG` / fichas de `fort-data.js`)

Comparado en el mismo arnés (equipo de 4, campeones nivel 10, 100 s desde el nivel 1): la
Fortaleza queda entre la Acuática y el Hielo en muertes y presión (20 enemigos en pantalla de
promedio contra 16 y 21). Perillas: `spawnIntervalMult` (fort-arena.js), `FORT_CFG.cycle`
(trampas), `FORT_CFG.<enemigo>`, `DIFF.bossDmgPct.fortaleza`, `DIFF.bossHpType.caballero`.
