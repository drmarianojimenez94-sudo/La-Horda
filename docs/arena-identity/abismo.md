# ARENA VI — El Abismo

> *"Acá el piso también es parte del combate."*

Sexta arena de la campaña (Bosque → Acuática → Fortaleza → Reino Micelial → Hielo → **Abismo** →
Laberinto → Infernal). Se ubicó antes del Laberinto por pedido; el orden final se revisa después.
Identidad: **EL TERRENO ES UN RECURSO.** Ruinas lovecraftianas suspendidas sobre el vacío, dark fantasy,
pixel art 16-bit detallado (sin sci-fi ni neón). Debajo vive **El Que Mora Debajo**: está desde el
nivel 1 y se revela de a poco.

## Archivos

| Qué | Dónde |
|---|---|
| Datos: mapa de 32 plataformas, estados, **todo el balance** (`AB_CFG`), fichas de enemigos | `js/arenas/abismo/ab-data.js` |
| Geometría, estados del piso, daño estructural, regla de seguridad, empujones, caída/colgarse/rescate, aparición, temblores | `js/arenas/abismo/ab-map.js` |
| IA de los 6 enemigos + oleadas | `js/arenas/abismo/ab-enemies.js` |
| Presencia de lo que vive debajo, Carcelero del Vacío (subjefe), El Que Mora Debajo (jefe) | `js/arenas/abismo/ab-bosses.js` |
| Dibujo: vacío con paralaje, plataformas cacheadas, estados, marcas en el piso, jefe por partes, minimapa | `js/arenas/abismo/ab-render.js` |
| Registro en `ARENA_DEFS`, atlas, guías de jefe, sonidos, bots, red | `js/arenas/abismo/ab-arena.js` |
| Daño estructural de las habilidades (metadata por TIPO de habilidad, etiqueta `terrain`) | `js/systems/terrain-tags.js` |
| Hojas fuente (oficiales, del usuario) | `art-source/abismo/{abismo_mapa,abismo_jefe_morador,abismo_enemigos_1,abismo_enemigos_2}.png` |
| Recorte y atlas | `tools/art/abismo/extract.py` → `assets/sprites/arenas/abismo/<tipo>/atlas.png`, `assets/vfx/abismo/*.png`, `js/assets/abismo-meta.js` |
| Pruebas | `tools/items/t_abismo.js` (34 chequeos) |

Enganche NUEVO al motor: `botUrgent(h)` (bot-brain.js): una arena puede marcar un objetivo urgente
(rescatar a un compañero colgado) que vale más que esquivar. Cambios mínimos compartidos:
`damageEnemy` marca `e._kbAt/_kbBy` en los empujones (para saber que un enemigo fue EMPUJADO);
`aimPoint` guarda `caster._lastAimPt`; `heroMoveLocked`/`heroDmgTakenMult` contemplan `abHang`/`abHook`.

## El mapa

Espacio plano aplastado en Y (vista oblicua, `AB_ASP = 0.78`). Pozo central (la boca), anillo
interior de 8 sectores, 8 puentes radiales, 8 plazas exteriores (4 con **portal** del vacío por donde
entra la horda, la del sur es la **entrada** con altar y sello: nunca cae) y 8 puentes del anillo
exterior. Las plataformas se dibujan procedurales con la textura de piedra de la hoja, cara lateral
con estalactitas, y se prerenderizan una sola vez a media resolución (pixel art 2x, barato en móviles).

## Estados del piso

`STABLE (≥67) → CRACKED (≥34) → CRITICAL (≥1) → COLLAPSE (aviso 2,2 s; patrones del jefe 2,6 s) → GONE → REBUILD (3,2 s)`

- CRÍTICA tiembla, larga piedras y brilla violeta. DERRUMBE: borde rojo que late cada vez más rápido,
  sacudida, piedras y sonido; después se hunde y lo que estaba arriba cae.
- Causas: temblores programados (desde el nivel 2, nunca bajo el equipo), Devorador (pasos y pisotón:
  **como mucho deja CRÍTICA**), Carcelero (pisotón y cadenas rotas), tentáculos y patrones del jefe, y
  **habilidades con metadata `terrain`** (tabla `SKILL_TERRAIN` por tipo: Cataclismo Elemental, Último
  Aliento, Segador de Almas, Embestida, Gólem de Carne, Encarnación del Abismo, Carga de San Lorenzo,
  Cruce de los Andes, Sismo/Terremoto/Retumbar del titán, El Retumbar…).
- Entre niveles el Abismo **reconstruye** todo lo caído y repara grietas. Durante un nivel, lo caído
  queda caído (en la pelea final vuelve de a poco: 2 plataformas cada 10 s).

## Reglas de seguridad (sin estados imposibles)

- Una plataforma solo se derrumba si todo lo que queda en pie sigue conectado a la entrada y queda al
  menos el 55 % del mapa (66 % durante el jefe). Si no, queda CRÍTICA ("la sostienen las runas").
- La entrada nunca cae. Nunca se destruye piso sano de un golpe.
- **Sin fuego amigo:** lo que rompen los héroes nunca tira a un aliado (queda CRÍTICA mientras haya uno encima).
- **Caminar nunca tira a nadie:** solo cae lo que fue EMPUJADO (con tolerancia: 24 u para héroes, 9 para enemigos).
- Si **nadie** puede rescatar (todos colgados o caídos, o se juega solo) el colgado trepa solo en 3,8 s.
- Los patrones del jefe dejan siempre medio anillo para pegarle al ojo.

## Caer: colgarse y RESCATAR

El héroe empujado fuera del borde queda **COLGADO** (6,5 s; 8,5 s si es una persona): no se mueve, no
actúa y no recibe golpes (el peligro es el reloj). Un compañero se acerca y mantiene **RESCATAR**
(acción contextual, 0,9 s): sube con invulnerabilidad corta. Si nadie llega, cae y usa la muerte
normal (el cuerpo queda en el borde, se lo puede revivir). Los enemigos que caen **mueren**
("¡AL VACÍO!", crédito al que empujó).

## Enemigos (una mecánica nueva por nivel, después combinadas)

| Nivel | Entra | Mecánica |
|---|---|---|
| 1 | **Errante del Vacío** | cuerpo a cuerpo; golpe fuerte con aviso (cono) que EMPUJA |
| 2 | **Acechador del Borde** | rápido, busca el flanco del lado del vacío; salto con aviso (círculo + línea) que empuja |
| 3 | **Heraldo del Ojo** | a distancia: orbe lento con marca en el piso → **zona gravitatoria** que atrae a héroes Y horda |
| 4 | **Devorador de Piedra** | pesado: sus pasos y su pisotón agrietan (nunca derrumban solos). Llevalo a la horda y rompé el piso |
| 5 | **Tejedor del Vacío** | filamentos entre dos puntos: cruzarlos frena y tira un poco; se cortan si muere |
| 6 | **Jinete Sin Cabeza** | marca la trayectoria (flechas) y carga: empuja fuerte a TODO lo que toque. Ponelo a embestir a la horda |
| 7-9 | combinaciones | Heraldo + Errante, Acechador + bordes, Devorador + masa, Tejedor + Jinete |

La dificultad viene de la composición, no de la vida. Ritmo de aparición más lento al principio.

## Subjefe — El Carcelero del Vacío (nivel 9)

Aparece a mitad del nivel sobre el anillo, del lado del equipo, con 4 cadenas ancladas a las plazas.
Golpe de Cadena (línea), Barrido (círculo: empuja héroes y enemigos), Pisotón (agrieta) y **GANCHO**
(línea con aviso: engancha y arrastra hacia el borde; se suelta usando una habilidad o si los
compañeros le sacan un 3,5 % de vida). Al 66 % y al 33 % rompe una cadena: parte de las ruinas se
suelta y otra se reconstruye. Retiene el nivel. Al morir, las cadenas ceden… y por primera vez se ve
el ojo enorme en el fondo del pozo.

## Jefe — El Que Mora Debajo (nivel 10)

Nunca se muestra entero. Silencio, temblores, el ojo se abre en el fondo del pozo ("TODO ESTE TIEMPO
HABÍA ALGO DEBAJO DE NOSOTROS") y el ojo asoma por el borde del pozo del lado del equipo (ahí se le pega).

- **Fase 1:** tentáculos en los bordes (se rompen: cada uno le saca 4 % y le abre el ojo 3 s) que
  aplastan y agrietan; rayo gravitatorio del ojo (ralentiza).
- **Fase 2:** cambia la geometría (centro / costados / cruz / anillo) con aviso largo; siempre queda
  piso conectado y vuelve a subir; zonas de atracción, lluvia de fragmentos.
- **Fase 3:** la verdadera escala: mandíbula bajo el pozo (succión con aviso), onda del abismo, más
  tentáculos, siluetas gigantes alrededor de la arena.
- **Muerte (9 s):** el ojo se cierra, los tentáculos se hunden, las ruinas vuelven a su lugar, silencio, victoria.

## Presencia previa (niveles 1-9)

Sombra enorme que pasa bajo las plataformas, ojo en el pozo, tentáculo en el vacío, temblores y ruido
grave; cada vez más seguido.

## Bots

Esquivan bordes (con más margen si hay algo que empuja), plataformas críticas y en derrumbe (salen
hacia la piedra firme más cercana y no vuelven a pisarla), trayectorias del Jinete, zonas, filamentos
y marcas de orbe. **Rescatan**: los dos más cercanos van a RESCATAR antes que pelear o revivir (camino
por el grafo de plataformas) y no esquivan mientras rescatan, salvo que su propio piso se caiga.
Priorizan tentáculos, Tejedor, Heraldo y Jinete agotado.

## Red (anfitrión autoritativo)

Todo lo decide el anfitrión y viaja en `abNetState()` (~1,2 KB: 32 plataformas, colgados, rescates,
zonas, filamentos, cargas, cadenas, orbes, presencia, Carcelero, jefe). El invitado solo anima relojes
y nunca decide una caída. Probado con anfitrión + invitado (nivel 9 y 10).

## Audio

27 sonidos sintetizados (`ARENA_SFX`): grietas, temblor, derrumbe, reconstrucción, caída, colgarse,
rescate, golpes, siseo, orbe, gravedad, pisotón, filamentos, relincho y carga, lo profundo, cadenas,
rayo, mandíbula, onda, tentáculo.

## Pruebas

```bash
python3 -m http.server 8771 &
node tools/items/t_abismo.js      # 34 chequeos
```

## Limitaciones conocidas (ver LA_HORDA_ABISMO_ASSETS.md)

- Los atlas de los enemigos salen de hojas de 1536×1024 con celdas chicas (29-56 px de alto): en
  partida se escalan 2-6x y se ven gruesos. Hace falta una hoja por entidad a mayor resolución.
- El jefe se arma por partes (ojo de 60 px escalado, mandíbula recortada como rectángulo con máscara,
  tentáculo): falta la hoja del jefe a escala de jefe.
