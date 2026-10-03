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
