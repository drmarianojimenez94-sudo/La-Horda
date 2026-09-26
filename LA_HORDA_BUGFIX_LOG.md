# LA HORDA — BUGFIX BATCH 01 · Registro

Rama: `claude/horda-latest-updates-gv4tlf` · Flujo: AUDITAR → IMPLEMENTAR → PROBAR → CORREGIR → REGRESIÓN → COMMIT → MERGE.
Chequeo de diseño: ningún pedido contradice una regla MUST NOT (sin fuego amigo, sin núcleo de explosión de cadáveres, sin
dash universal, sin crafteo de Únicos, sin pay-to-win, sin placeholders feos). No hubo CONFLICTO DE DISEÑO.

Cada entrada: **bug · causa · solución · archivos · pruebas · resultado · regresiones · assets faltantes**.

---

## 1-4 · Progresión de la etapa de prueba

| | |
|---|---|
| **Bug** | Los campeones no arrancaban en nivel 1, los comprables venían desbloqueados, todas las arenas abiertas y no había oro inicial. |
| **Causa** | `PLAYTEST_UNLOCK_ALL = true` en `save.js` (abría todo) y no existía un reinicio para la etapa de prueba. |
| **Solución** | `PLAYTEST_UNLOCK_ALL = false`. Migración única `testStageV1`: todo en nivel 1, comprables bloqueados (el primero se elige de regalo en "Tu primer campeón"), solo Ruinas del Bosque abierta, **10.000 de oro una sola vez** (perfil nuevo o guardado viejo), respaldo del guardado anterior en `laHordaSave_v1_antesDeEtapaPrueba`. Arenas secuenciales con requisito visible ("🔒 Completá X"), estado "✔ Completada", cartel "🔓 NUEVA ARENA" y marca "¡NUEVA!" hasta entrar. |
| **Archivos** | `js/storage/save.js`, `js/ui/menus.js`, `js/core/run.js`, `css/menus.css` |
| **Pruebas** | `progqa.js` (perfil nuevo → recarga → muerte → 7 arenas en orden → recarga), `t_items.js` bloque TEST (guardado viejo migra una vez, respaldo, el regalo no se repite al recargar). |
| **Resultado** | ✅ 10.000 al inicio; tras gastar 1.000 y recargar: 9.000; tras morir: no se repite el regalo; cada arena abre solo la siguiente y persiste; la Divina abre al completar las 7. |
| **Regresiones** | `t_func` y `t_items` actualizados a las reglas nuevas (el guardado de prueba "veterano" lleva `testStageV1`). |
| **Assets faltantes** | — |

## 5-10 · Tienda funcional (3 pestañas)

| | |
|---|---|
| **Bug** | La tienda decía "En desarrollo": no se podía comprar ni inspeccionar nada. |
| **Causa** | Solo existían ofertas diarias y un catálogo de campeones parcial. |
| **Solución** | `js/ui/shop-ui.js` nuevo, con 3 pestañas. **Campeones**: todos a 1.000, con animación, rol, historia, habilidades + ulti, estado (disponible/bloqueado/comprado/seleccionado) y botón de compra. **Objetos y sets**: los 169 del catálogo (143 diseñados + 26 arquetipos) a 1.000, con filtros; los sets muestran piezas que tenés y que faltan y umbrales ✔ ACTIVO / ◐ / 🔒, con "comprar las que faltan"; la ficha completa del objeto se abre al tocarlo. **Skins**: las skins de set que existen (se venden las piezas; la skin aparece con el set completo). Comprar está bloqueado durante una partida. |
| **Archivos** | `js/ui/shop-ui.js`, `js/systems/shop.js`, `js/systems/items.js` (`opts.noun`), `js/ui/item-preview.js`, `index.html`, `css/menus.css`, `js/data/champions.js` (`CHAMPION_PRICE_GOLD = 1000`; el definitivo, `CHAMPION_PRICE_GOLD_FINAL = 5000`) |
| **Pruebas** | `shopqa.js` (comprar campeón, 4 piezas de set, arquetipo legendario, persistencia), capturas de las 3 pestañas, `t_func` (`nav.shop_champions/objects/skins`). |
| **Resultado** | ✅ |
| **Regresiones** | **Encontrada y corregida**: al agregar `opts.noun`, el mismo reemplazo se aplicó también en `proceduralItemName`, que no tiene `opts`. Un guardado viejo con "Únicos de prueba" tiraba error al cargar y caía a un perfil vacío. Se restauró la línea original; `t_items` pasa 60/60. |
| **Assets faltantes** | Íconos finales de objetos (ITEM-ICON, ya listado). |

## 11-12 · Identidad de arena y tutoriales contextuales

| Arena | Mecánica propia | Tutorial del Hechicero (VER→ENTENDER→HACER→FEEDBACK) |
|---|---|---|
| Ruinas del Bosque | runas invertidas (contener), emboscadas | **nuevo**: `rune_see` → `rune_do` → `rune_ok`, emboscada |
| Acuática | corrientes, charcos | corriente, charco (ya existía) |
| Fortaleza | trampas, puertas, puentes móviles | **nuevo** (era la única arena sin tutorial): `fort_intro`, `fort_trap` (se tilda al esquivarla), `fort_bridge` |
| Reino Micelial | núcleos territoriales, nubes | **nuevo**: `mic_intro`, `mic_nuc_see` → `mic_nuc_do` → `mic_nuc_ok` |
| Hielo | frío, braseros | frío, brasero (ya existía) |
| Laberinto | sellos | sello (ya existía) |
| Infernal | fisuras, Hechicero | fisura, traición (ya existía) |

Archivos: `js/arenas/bosque/bos-ruins.js`, `js/arenas/micelial/mic-guide.js`, `js/arenas/fortaleza/fort-guide.js`.

## 13-15 · Runas del Bosque invertidas + nivel 10

| | |
|---|---|
| **Bug** | Las runas eran un poder del jugador; el pedido es que se activen solas y haya que contenerlas. |
| **Solución** | Estados **controlada · activándose · activa · corrupción avanzada · siendo desactivada ("CONTENIENDO…") · bloqueada (sellada Ns)**, con cartel en el menhir, barra "Runas" en pantalla y flecha en el borde. Despiertan cada vez más seguido (hasta 4 a la vez desde el nivel 6). Cada runa activa suma enemigos por minuto, refuerza a la horda nueva y hace salir enemigos **corrompidos** (+15% daño, +10% velocidad) de la piedra. En corrupción avanzada se suma una onda roja telegrafiada. Las 4 activas desatan la **Oleada de Corrupción**. **Contener** (acción contextual, cooperativa, bots incluidos) sella la runa 20 s y sus raíces castigan a la horda cercana: el premio de antes pasó a ser la recompensa. Nunca hay "perdiste" directo. **Nivel 10**: las runas se desbordan (ya no se pueden contener), se activan todas, la corrupción converge al centro y explota; el Guardián sale del medio del círculo. |
| **Archivos** | `js/arenas/bosque/bos-ruins.js`, `js/systems/waves.js` |
| **Pruebas** | `runetest.js`: despierta a los 16 s, se enciende a los 25 s, spawn ×1,14 con 1 runa, 6 corrompidos, contener activa → sellada, oleada +13 enemigos, 4 en corrupción, secuencia del nivel 10 → `guardian_ancestral` en (0,0). Capturas `runes.png`. |
| **Resultado** | ✅ (la primera runa ahora despierta a los 22 s, después de los básicos) |
| **Regresiones** | El estado viaja en `bosNetState` (invitados ven lo mismo). |
| **Assets faltantes** | Glifo de runa por estado (hoy procedural): BOS-01 en PROPS. |

## 16 · Jefe del Bosque: Guardián Ancestral Corrompido

| | |
|---|---|
| **Solución** | Hoja "Guardián Élfico Ancestral" recortada (`tools/art/guardian_elfico/build.py`): atlas + **paleta FURIA** (la variante Fase 2 de la propia hoja) + 14 VFX. Kit en 3 fases (`js/skills/boss-guardian.js`): **F1** Báculo, Lanza de Enredaderas, Raíces Hambrientas, Ondas de Espinas, Lluvia de Hojas. **Transformación al 65%**: corteza (15% de daño) con protección de ráfaga, explota al terminar y queda **EXPUESTO 3 s**. **F2** Golpe del Bosque (clava el báculo: **VULNERABLE 1,5 s**), Muralla de Árboles con hueco (obstáculo real 5 s), Zonas Corruptas persistentes, Lanzas triples, Llamado del Bosque. **F3 (30%)** furia, Juicio del Bosque (círculos de luz), Cruz de Espinas. Guía de 3 consejos. **El Jinete Sin Cabeza queda intacto** (código y arte; sigue en la Arena Divina). |
| **Archivos** | `js/skills/boss-guardian.js`, `js/assets/guardian-sheet-meta.js`, `js/data/enemies.js`, `js/systems/waves.js`, `js/skills/boss-patterns.js` (`onEnter` por fase), `js/rendering/enemy-sprites.js` (`atlasKey`), `js/skills/boss-skills.js` (árbol en el Muro), `js/ui/boss-hud.js` |
| **Pruebas** | `guardfight.js`: los 14 ataques salen, transformación, corteza (61% ante una ráfaga), atlas de furia, zonas, árboles, ventanas vulnerables, 3 fases, muere. Capturas `g_grid.png` y `gz.png`. |
| **Resultado** | ✅ |
| **Assets faltantes** | caminar de perfil de 4 cuadros (el panel dibuja 3) · hurt propio (usa un cuadro de idle). Listado en `LA_HORDA_ASSETS_FALTANTES.md` con su prompt de hoja completa. |

## Skins de set (pedido junto al batch)

| | |
|---|---|
| **Solución** | 4 hojas recortadas (`tools/art/skins_sets/extract.py`) a atlas en el formato de `CHAMP_PACK`. La skin **remapea el atlas** del campeón solo con el set COMPLETO, así cada estado (caminar, atacar, habilidades, Retumbar...) sigue su propia lógica. Quedan así: **La Manada → Sylva, Flecha de Fuego · El Rōnin Errante → Musashi, Samurái Legendario · Legión de Reconocimiento → Eren, Titán Bestia** (también con forma titán y transformación propias) **· Acceso Raíz → Axiom, Skin Z**. Tienen retrato para la tienda. |
| **Archivos** | `js/systems/set-effects.js` (`activeSetSkin`, `setSkinPackKey`), `js/rendering/champion-sprites.js`, `js/champions/eren.js`, `js/assets/set-skins-meta.js`, `assets/sprites/champions/*/skins/` |
| **Pruebas** | `skintest.js`: set 4/4 equipado → skin activa en los 4; capturas idle/caminar/espalda/ataque + titán (`sk_grid.png`). |
| **Resultado** | ✅ |
| **Assets faltantes** | Las hojas traen 1 cuadro por celda: la caminata usa 2 (caminata + corrida) y el idle 1. Axiom no trae fila de casteo. El Titán Bestia no trae vistas de frente/espaldas. Las otras 8 skins de campeón siguen pendientes (`docs/assets_faltantes/skins_sets/`). |

## 17 · Reino Micelial: objetivo territorial claro

| | |
|---|---|
| **Bug** | Poco claro: los Núcleos ya existían (crecen por etapas, infectan, aceleran a la colonia, escupen enemigos), pero no se explicaban ni se veían fuera de cámara. |
| **Solución** | Núcleos desde el **nivel 2**. Cada núcleo vivo **sube la presión**: el intervalo de aparición baja según la suma de etapas, con tope ×1,5 de enemigos (0,07 por etapa). **Contador de núcleos** con su etapa en pantalla y **flecha violeta** en el borde. Tutorial completo. No copia las fisuras del Infernal: los núcleos son organismos que crecen y conquistan terreno. |
| **Archivos** | `js/arenas/micelial/mic-guide.js` |
| **Pruebas** | `mictest.js`: 1er núcleo a los 5,6 s; con 2 núcleos (infección 4) el intervalo baja un 22% (medido con 0,09: de 1,5 a 1,10; ajustado a 0,07 porque una corrida de t_collision con 88 enemigos dejó enemigos dentro de un hongo — 4/4 corridas después del ajuste sin errores); destruir funciona; `mic1.png`. |
| **Resultado** | ✅ |

## 18 · Jefes épicos (capa común)

| | |
|---|---|
| **Solución** | Para todo jefe con diseño: **protección de ráfaga** (hasta que el director registra el cambio de fase, la vida no baja más de un 2% del umbral siguiente); **VULNERABLE 1,8 s** después de cada cambio de fase; **furia por pelea larga** a los 3 min (+25% daño, +15% velocidad, rotación más rápida). Los jefes ya tenían patrones, telegraphs, fases e invocaciones; el Guardián suma transformación y ventanas propias. |
| **Archivos** | `js/skills/boss-patterns.js`, `js/systems/combat.js` |
| **Pruebas** | `bf5test.js`: una ráfaga de 300% de vida deja al Minotauro en 48%, al Mago en 58% y al Guardián en 63%, vivos y en su fase siguiente. |
| **Regresiones** | **Encontrada y corregida**: si un DoT ya había bajado la vida por debajo del piso, el golpe siguiente hacía 0 (el jefe quedaba inmortal un cuadro; rompía `t_crystals` y `t_hechicero`). Ahora el piso solo aplica si el golpe CRUZA el umbral. Los dos tests pasan otra vez (9/9, 14/14). |

## 19-21 · Escalado dinámico parcial (rejugar / farmear)

| | |
|---|---|
| **Solución** | El escalado ya seguía el poder REAL del grupo en parte (vida 40%, daño 45%), con una **medida de grupo**: promedio de todos los héroes, humanos remotos incluidos y bots con descuento. Se suma el **rejugar**: por cada nivel sobre el esperado de la arena (Bosque 1 · Acuática 6 · Fortaleza 12 · Micelial 17 · Hielo 23 · Laberinto 28 · Infernal 34) la horda sigue un 0,6% más, con tope de 15%. Nunca 1:1. |
| **Archivos** | `js/systems/difficulty.js` |
| **Pruebas** | `bf5test.js`, tiempo relativo para matar (1 = nivel 1). Bosque: niv. 10 → 0,83 · 20 → 0,77 · 30 → 0,75. Infernal: 10 → 0,80 · 20 → 0,68 · 30 → 0,62. Subir de nivel sigue acelerando, pero farmear la arena 1 con nivel 30 no la vuelve trivial. |
| **Resultado** | ✅ |

## 22 · Definitivas sin spam

| | |
|---|---|
| **Bug** | Tres caminos para abusar de la definitiva: (a) la reducción de enfriamiento se apilaba sin piso (maestría × pasivas × arena × reglas × talentos); (b) la **Ascensión** de la Profeta llevaba a 60 ms TODOS los enfriamientos, también el de la definitiva; (c) una ulti de área podía recargar su propia barra. |
| **Solución** | `ultCooldownFor()` es un solo cálculo para jugador, bots, Eren y San Martín (7 lugares), con **piso de 55% del enfriamiento base**. La Ascensión ya no toca la definitiva. La barra no carga con el daño de la propia ulti durante 4 s. |
| **Archivos** | `js/skills/abilities.js`, `js/ai/allies.js`, `js/core/update.js`, `js/champions/eren.js`, `js/champions/libertador.js`, `js/systems/combat.js` |
| **Pruebas** | `bf5test.js`: con −90% de enfriamiento de arena la ulti queda en 17,6 s (32 s × 0,55); la Ascensión no la toca; auto-carga bloqueada; 0 lanzamientos extra en 125 intentos. |
| **Resultado** | ✅ |

## 23 · Eren: El Retumbar excepcional

| | |
|---|---|
| **Bug** | Se podía lanzar cada vez que la Furia se llenaba en forma titán (cada 22 s), sin límite. |
| **Solución** | **Máximo 2 por partida.** La 1ª, además de la Furia llena transformado, requiere un **JEFE** en pelea o que Eren esté al borde (<35% vida) o haya un aliado caído. La 2ª requiere el **jefe debajo del 50%** y **90 s** desde la primera. La condición se revalida en el disparo directo (un invitado o un bot no pueden forzarlo). El HUD avisa qué falta ("solo contra un JEFE…", "ya no queda en esta partida", 1/2). |
| **Archivos** | `js/champions/eren.js`, `js/data/champion-tuning.js` |
| **Pruebas** | `bf5test.js` (intentos de romperlo): sin jefe y con vida llena → no; con jefe → sí (1/2); 2ª antes de tiempo → no; jefe al 45% + 90 s → sí (2/2); 3ª con todo a favor → no; 3ª forzada llamando a la función → no (sigue 2/2). |
| **Resultado** | ✅ |

## 24 · Feedback (game feel)

Carteles y colores de estado en las runas, barra de runas y de núcleos, flechas en el borde, banners de runa activa, Oleada de
Corrupción y "¡Las runas se desbordan!", VULNERABLE / TRANSFORMÁNDOSE / Corrompido en la barra del jefe, tildes en los tutoriales,
aviso del Retumbar en el HUD de Eren y "¡NUEVA ARENA!".

## 25-32 · QA y regresión (resultado final)

| Prueba | Resultado |
|---|---|
| Perfil nuevo + progresión secuencial + persistencia (`progqa.js`) | ✅ |
| Bosque (runas, nivel 10, Guardián) — `runetest.js`, `guardfight.js` | ✅ |
| Micelial — `mictest.js` | ✅ |
| Rejugar niveles 1/10/20/30 — `bf5test.js` | ✅ |
| Jefes (ráfaga, fases, ventanas) y definitivas (Eren incluido) — `bf5test.js` | ✅ |
| Humo: las 7 arenas en niveles 3 y 10 con 12 campeones distintos (`smokeall.js`) | ✅ sin errores |
| `tools/regression/t_func.js` (UI real) | ✅ 92/92 |
| `tools/items/t_*.js` (14 suites: objetos, itemización, cristales, Hechicero, reacciones, roles, ritmo, colisión…) | ✅ 215/216 en la corrida completa; la que falló (`COL.partida_real_sin_nadie_adentro`, intermitente, con 88 enemigos) pasó 10/10 después (4/4 con la presión del Micelial ya ajustada) |

Tests ajustados a las reglas nuevas, sin sacar controles: `lib.js` (guardado veterano con `testStageV1` y las 7 arenas),
`t_func.js` (tienda nueva, oro del regalo), `t_items.js` (precio definitivo para ECON y bloque TEST nuevo).

## Limitaciones conocidas (no críticas)

- Las skins y auras de set de un jugador **remoto** se calculan con el guardado local por clase de campeón: es la misma
  limitación que ya tenían las auras de set; conviene revisarla en una prueba real de 2 jugadores.
- La etapa de prueba reinicia UNA vez los guardados viejos (niveles, desbloqueos, inventario). El anterior queda respaldado en
  `laHordaSave_v1_antesDeEtapaPrueba`.
- Al terminar la etapa de prueba: `CHAMPION_PRICE_GOLD` vuelve a `CHAMPION_PRICE_GOLD_FINAL` y `SHOP_TEST_MODE` a false.
