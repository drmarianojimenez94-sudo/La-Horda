# LA HORDA — El Códice

> Implementado en la rama `claude/horda-latest-updates-gv4tlf`. Reemplaza la vieja sección "Mis Campeones"
> y la vuelve una parte del Códice. Canon: `docs/lore/LA_HORDA_LORE_BIBLE.md` · Arte faltante:
> `LA_HORDA_CODEX_MISSING_ASSETS.md` · Prueba: `tools/items/t_codex.js`.

## 1. Qué es

El Códice es la enciclopedia jugable del mundo. Cada entrada responde dos preguntas:

- **¿Qué es en el mundo?** Lore, origen, su lugar en la historia de las Cicatrices y los Cuatro Guardianes.
- **¿Qué hace en el juego?** Rol, comportamiento, ataques, fases, números reales y recompensas.

Todo se ve con el **arte real del juego**: los mismos renderizadores de la partida dibujan los mismos
sprites, animaciones con nombre y VFX. El Códice no trae dibujos nuevos, arte externo ni placeholders.

## 2. Navegación

**Menú principal:** `MODOS DE JUEGO | CÓDICE | TIENDA` (`.mainmenu-pillars`, 3 tarjetas en fila en horizontal).
"Mis Campeones" ya no es una sección aparte: todo lo que hacía ahora está en **CÓDICE → CAMPEONES**.

| Sección | Contenido |
|---|---|
| **CAMPEONES** | Galería de los 12 y ficha completa. Pestañas: **Ficha** (historia + preview animada + habilidades + skins), **Equipamiento** (el inventario real del campeón), **Talentos** (el árbol real) y **Maestría** (el panel real de habilidades). Botón *Elegir para jugar* y acceso a 🎒 *Mi Inventario*. |
| **BESTIARIO** | 53 criaturas agrupadas por arena, en orden de campaña, con filtro por arena. |
| **JEFES** | 17 entradas: 4 Guardianes, subjefes con peso narrativo y jefes. Son las fichas más grandes: lore, fases, habilidades con preview, cómo vencerlo y recompensas. |
| **ARENAS** | La campaña capítulo por capítulo en el orden real (`CAMPAIGN_ORDER`), incluidas las arenas *en construcción* y la Arena Divina (postgame). |

- **Home:** 4 accesos ilustrados con contenido real: tres campeones animados, una criatura, la silueta de un jefe y
  la panorámica de una arena, todo con animación ambiental.
- **Migas + ATRÁS:** una pila `codexStack` de `[{view, id, label}]`. Cada miga vuelve a su nivel; ATRÁS desapila,
  y en la home sale al menú.
- **Navegación cruzada:** cada link `data-go="tipo:id"` pasa por `codexLink`.
  - criatura → su arena, su jefe (si es invocación) y las criaturas vecinas;
  - jefe → su arena, sus invocaciones, sus sets y sus legendarios;
  - arena → su plantel, sus jefes y sus sets;
  - campeón → su set y sus skins.
- **Anterior / siguiente:** flechas ‹ › y swipe entre entradas de la misma lista.
- **Tienda / Inventario:** `codexReturnTo = "codex"` hace que la Tienda (pestaña Skins), la ficha de campeón
  bloqueado y Mi Inventario vuelvan al Códice y no al menú.

**Sets y objetos** no tienen pestaña propia. Aparecen en contexto: en el jefe que los suelta, la arena con
afinidad, el campeón dueño y la skin que desbloquean. La ficha de set (`view:"set"`) solo se abre desde esos links.

## 3. Descubrimiento y spoilers

| Estado | Cuándo | Qué se ve |
|---|---|---|
| **DESCONOCIDO** | Nunca apareció | Silueta negra con brillo violeta y "?". Sin nombre, sin lore. Los jefes con `veil` ni siquiera muestran la silueta. |
| **DESCUBIERTO** | Apareció en una partida | Nombre, arte, lore y comportamiento. En los jefes, los secretos siguen ocultos: las fases y habilidades con `spoiler`, las formas `hidden` y el texto `spoiler`. |
| **DERROTADO** | Lo mataste, o completaste su arena | Todo: formas ocultas, fases, texto spoiler y nombre final (por ejemplo, "Rey de la Horda"). |
| **DOMINADO** | Kills ≥ `CODEX_MASTERY[rango]` | Sello ★. La arquitectura está lista para que las recompensas se enganchen acá. |

- **Registro** (`js/ui/codex/codex-track.js`) en `save.codex = {seen:{}, kills:{}}`:
  - host/solo: `spawnEnemy` → visto, `killEnemy` → kill (en la Arena Divina solo cuentan los jefes: así el Jinete Sin Cabeza, que solo vive ahí, llega a DERROTADO);
  - invitado: snapshot → visto, evento `vfxOnDeath` → kill.
  - Se guarda con un *debounce* para no escribir en cada muerte.
- **Retrocompatible:** una arena completada cuenta su plantel y sus jefes como derrotados. Un guardado veterano
  ve el Códice lleno sin tener que volver a jugar.
- **Arenas:** *En construcción* (Ciudad Maldita, Minas Profundas), *Bloqueada*, *Disponible*, *Completada*.
  La Cicatriz de cada arena se cuenta recién al completarla.
- **Jefes con revelación grande:** el Hechicero Supremo y el jefe final llevan `veil:true`. Sin descubrir no se ve
  ni la silueta, porque su silueta ya contaría la traición.

## 4. Arquitectura (archivos)

| Archivo | Qué hace |
|---|---|
| `js/data/codex-content.js` | **Contenido, no pantallas.** Planteles por arena, jefes y formas, lore de campeones, criaturas, jefes y arenas, y qué efecto real usa cada demo de habilidad. |
| `js/ui/codex/codex.js` | Secciones, estados, navegación y un renderizador por **tipo** (campeón, criatura, jefe, arena, set). |
| `js/ui/codex/codex-preview.js` | `CodexSpritePreview`: el componente único de previews. |
| `js/ui/codex/codex-track.js` | Registro de lo visto y lo matado. |
| `css/codex.css` | Estética de marco grabado (fantasía oscura gótica) y grillas pensadas primero para celular en horizontal. |
| `assets/ui/codex/arenas/*.jpg` | Panorámicas de 9 arenas: capturas reales del juego (960×420), sacadas con `tools/codex/capture_arenas.js` sin HUD, textos flotantes ni minimapa. No están en `ASSET_MANIFEST` a propósito: se cargan diferidas al abrir el Códice y no demoran el arranque. |

Enganches mínimos en el motor, todos opcionales. Si no se usan, la partida dibuja exactamente igual que antes:

- `drawChampFigure(..., moving, extra)`: `extra` copia estados de dibujo a la figura (`spinTimer`, `_codexSkin`...).
- `activeSetSkin(h)`: si viene `h._codexSkin`, muestra esa skin sin tocar el equipo.
- `drawChampPack`: `h._codexPack` / `h._codexSet` / `h._codexT` fuerzan una animación con nombre del atlas.

### CodexSpritePreview

```js
codexPreview(canvas, {kind:"champ"|"enemy"|"group"|"ambient", key, anim:"idle"|"walk"|"attack"|"cast"|"set"|"skill",
                      set, pack, skill, skin, forms, form, silhouette, veil, arena, bg, fps, scale});
codexPreviewSet(canvas, patch);  codexPreviewDrop(canvas);
```

- **Un solo loop:** un único `requestAnimationFrame` dibuja todos los canvas registrados.
- **Visibilidad:** un `IntersectionObserver` pausa lo que está fuera de pantalla, y `fps` limita las miniaturas.
- **Mismos renderizadores de la partida:** cambia `ctx` y `currentArena` y llama a `drawChampFigure` o a
  `drawEnemyBody`, con el perfil de animación real (`animProfileOf`, `animPose`, `animApply`).
- **Encuadre:** mide la caja de alfa de cada sprite (caché por tipo), así que todo entra centrado sin números a mano.
- **Demo de habilidad** (loop de 2,2 s):
  - carga → efecto → impacto sobre muñecos (un esqueleto y un zombie reales);
  - la forma del efecto sale de los datos reales de la habilidad (cono, línea, área, cadena...);
  - encima se dibuja el VFX real si existe: `VFX_SPR_EXTRA`, `SE_FX`, `ACUA2`, las hojas por celdas del Asesino,
    Axiom y Mago de Hielo, y las secuencias de la Cazadora y Musashi.
- **Jefes:** usan su animación con nombre (`packSet`), la misma que en combate.

## 5. Cómo sumar contenido

No hace falta programar pantallas: alcanza con **datos**.

| Querés sumar | Dónde |
|---|---|
| Una criatura | Agregala a `CODEX_ARENA_ROSTER[arena]` y a `CODEX_CREATURES[tipo]` (`family, anims, lore, origin, horde, behavior, attacks, mech`). Si es una invocación o una estructura, también a `CODEX_SPECIAL_RANK`. |
| Un jefe | Una fila en `CODEX_BOSSES` (`id, arena, role, level, forms`, y opcionales `hidden / guardian / veil / group / finalName`) y su ficha en `CODEX_BOSS_LORE` (`title, campaign, lore, history, spoiler, phases[], abilities[], rewards`). |
| Una arena | `CODEX_ARENA_LORE[id]` y la panorámica en `assets/ui/codex/arenas/<id>.jpg`. El orden sale solo de `CAMPAIGN_ORDER`. |
| Un campeón | `CODEX_CHAMP_LORE[key]` (`origin, history`). Opcionales: `CODEX_SKILL_FX[key]` (efecto de cada demo) y `CODEX_CHAMP_EXTRA_ANIMS[key]`. Rol, habilidades y números salen de `CLASSES`. |
| **Una sección nueva** (por ejemplo RELIQUIAS) | Descomentar la entrada en `CODEX_SECTIONS` y sumar su lista y su renderizador por tipo en `codex.js`. |

`tools/items/t_codex.js` **falla** si un tipo de `ENEMY_BASE` no está ubicado en el Códice, salvo que figure en
`CODEX_EXCLUDED` con el motivo. Así ningún enemigo nuevo queda afuera sin que nadie se dé cuenta.

## 6. Texto nuevo de canon

Las historias de los 12 campeones (`CODEX_CHAMP_LORE`) son **texto nuevo** escrito para el Códice. Siguen la
Lore Bible: todos llegan o pasan por la Ciudad Maldita y ninguno contradice a los Guardianes ni a los cristales.

| Campeón | Origen |
|---|---|
| Tanque | Muralla de la Ciudad Maldita |
| Asesino | Los callejones de la Ciudad Maldita |
| Mago | La Torre de las Dos Llamas |
| Soporte | El Santuario del Alba |
| Segador Olvidado | Un campo de batalla que nadie recuerda |
| Axiom | Más allá de la realidad conocida |
| La Profeta | El Oráculo sin ojos |
| Musashi | Un camino sin señor |
| La Cazadora | Los bosques de las Ruinas |
| Nigromante | Las criptas bajo la ciudad |
| Libertador | Del otro lado de la Cordillera |
| Eren | Detrás de los muros |

**Decisiones de canon que respeta el Códice:**

- La Fábrica sigue al código: el jefe es el Caballero de la Armadura Oxidada y el subjefe, el Dragón de la Forja.
- El "Kraken" del canon es el **Leviatán**, jefe final de la Acuática. El Kraken Joven es su cría y el subjefe.

## 7. Qué NO cambia

El Códice solo **lee**. No toca combate, balance, economía, drops, IA, multijugador, progresión, estadísticas
ni habilidades. La compra de skins y objetos sigue en la Tienda: el Códice abre la Tienda, no duplica la compra.
*USAR* en una skin equipa el set real que el jugador ya tiene, con `equipItem`.

## 8. QA

- `tools/items/t_codex.js`: menú; home; cobertura de datos; descubrimiento y spoilers; registro en una partida real;
  todas las fichas renderizan; campeón (elegir, pestañas, skins, tienda, inventario); navegación cruzada, migas,
  atrás y flechas; maquetación a 844×390 y 667×375 sin desbordes; rendimiento; y elegir en el Códice → la Sala.
- Regresión: las 18 suites de `tools/items/`, `tools/regression/t_func.js` (94/94, con la navegación de campeones
  ya adentro del Códice) y los *smoke* de Fortaleza y Micelial.

## 9. El Libro de la Horda (el Códice como eje narrativo)

El Códice también es el **libro que cuenta la historia y enseña el juego**. Narra Ismena, la escriba del Archivo de la
Ciudad Maldita (la misma de la Crónica de la Noche del Regreso). Se muestra de tres formas y siempre se puede releer en
**Códice › El Libro** (`id:"libro"`, franja en la home, con insignia NUEVO también en el botón CÓDICE del menú).

| Momento | Qué es | Dónde está |
|---|---|---|
| **Introducción** | Libro animado de 8 páginas (universo, guerra, la Horda, la noche del regreso, las Cicatrices, la voz dorada, la misión, cómo sigue). Una vez, al terminar de elegir al primer campeón | `starter-select.js` → `codexBookMaybeIntro` |
| **Fragmentos** | Uno por arena de la campaña: página de historia + página "lo que aprendiste". Aparecen como paso propio de la victoria ("Fragmento del Libro") y quedan en el Códice | `story.js` (`storyVictoryBookHtml`), `end-screens.js` (paso 3, se omite solo si no hay fragmento) |
| **Página de carga** | Una página que se da vuelta sola (≈3 s) antes de entrar a una arena de campaña en solitario; hasta 3 veces por arena; se apaga desde el Códice | `run-intro.js` → `codexBookShort` |

Recorrido de temas (lo verifica `t_codex_book_logic.js`): 01 modos · 02 progresión (XP, oro, cofre) · 03 equipo y Gemas ·
04 maestría de habilidades · 05 talentos (desde el nivel 40) · 06 dificultades (Pesadilla/Infierno) · 07 cooperativo y
rol · 08 oro y Tienda · 09 Brasas ✦ (solo apariencia, sin presionar) · 10 lo que sigue + resumen de historia, modos y
progresión. Los textos no spoilean la traición del Hechicero antes de la Infernal.

**Reglas que no se rompen:** omitir/saltear siempre posible (botón, Esc, tocar); omitir cuenta como visto; nunca
bloquea una partida ni "Continuar"; todo es **local** (sin eventos de red); la intro y la carga no aparecen dentro de una
sala/partida y se cierran solas si el jugador entra a una; quien llega a unirse a una sala con un perfil nuevo no ve la
intro en ese momento (queda con insignia en el Códice); movimiento reducido = sin giro de página. Las pruebas
automáticas viejas (`navigator.webdriver`) siguen el camino de antes, sin libro por iniciativa propia (igual que el regalo
inicial); las que miden el libro definen `window.__codexBook = true` (o `__firstRun` / `?primera=1`). El paso de la victoria,
la lista del Códice y las relecturas no dependen de eso (son contenido a pedido).

**Guardado:** `save.codexBook = {v, introSeen, introAt, frag:{arena:ts}, shortCount:{arena:n}, shortOff}`. Los guardados
anteriores migran en `loadSave` (`codexBookMigrate`): no se pierde nada; quien ya tenía campeón o arenas superadas no ve la
intro a la fuerza y sus arenas figuran como fragmentos leídos (valor `1`, sin insignia, releíbles).

**Arte:** 100% propio. Las ilustraciones se dibujan en vivo en canvas (`codex-book-art.js`: 18 escenas procedurales) y las
de arena reusan las panorámicas existentes de `assets/ui/codex/arenas/` teñidas de tinta. Sin recursos de terceros.

**Cómo sumar contenido:** una página de la intro = una fila en `BOOK_INTRO_PAGES`; un tema nuevo = editar el `lesson` del
fragmento de la arena (≤ 360 caracteres por página; el test lo exige); una escena nueva = una función en `BOOK_SCENES`
y su nombre en `BOOK_ART_NAMES`.

**QA:** `node tools/items/t_codex_book_logic.js` (headless, sin navegador) y
`node tools/items/t_codex_book.js [carpeta]` (Playwright, 844×390, con capturas).
