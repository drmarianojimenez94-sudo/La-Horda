"use strict";
/* ============================================================
   js/arenas/common/arena-registry.js
   ARENA IDENTITY — registro común de arenas.

   Qué es COMÚN a todas las arenas (vive en el motor y no se toca para agregar una arena):
     oleadas por tiempo (js/systems/waves.js), escalado de enemigos (js/enemies/spawning.js,
     js/systems/difficulty.js), director de jefes (js/skills/boss-patterns.js), telegraphs y
     golpes diferidos (js/skills/boss-skills.js, js/rendering/vfx.js), navegación por campo de
     flujo (js/ai/navigation.js), bots (js/ai/*), red host-autoritativa (js/net/*), HUD.
   Qué es PROPIO de cada arena: su definición en ARENA_DEFS (este archivo) y su carpeta
     js/arenas/<arena>/ (datos, mapa, mecánicas, enemigos, jefes, dibujo). Documentación:
     docs/arena-identity/README.md (+ una ficha por arena).

   Para agregar una arena nueva sin tocar el motor: crear js/arenas/<clave>/, registrar
   ARENA_DEFS[<clave>] con los ganchos que necesite (todos opcionales) y sumar ARENA_MODS /
   ARENA_ORDER / ARENA_RULES en js/data/arenas.js y js/arenas/arena-rules.js.
   Las arenas anteriores (Bosque, Acuática, Hielo, Laberinto, Infernal, Divina) siguen con su
   código de siempre: no se migraron para no arriesgar su comportamiento (ver la ficha de cada una).

   Ganchos disponibles (los llama el motor solo si la arena actual los define):
     runStart()                     al armar la partida (héroes ya creados)
     beginLevel()                   al empezar cada nivel
     update(dt)                     cada cuadro en el anfitrión / partida local
     guestUpdate(dt)                cada cuadro en el invitado (solo animación)
     clamp(ent) / inside(x,y,m)     geometría caminable (reemplaza al octágono)
     resolveWalls(ent)              obstáculos sólidos propios
     navBounds / navBlocked(x,y)    grilla de navegación propia
     spawnPool(level)               qué enemigos salen en cada nivel
     spawnIntervalMult()            ritmo de aparición propio
     placeSpawn(e, atBoss, champ)   dónde aparece cada enemigo
     subBoss()                      reemplaza el subjefe estándar (true = lo manejó)
     levelEnd()                     reemplaza el fin de nivel estándar (true = lo manejó)
     enemyAI[type](e,dt,tgt,dist)   IA propia por tipo (true = ocupado este cuadro)
     enemyKilled(e)                 al morir un enemigo
     afterEnemies()                 después de mover a todos los enemigos (ajuste final a la geometría)
     botDanger(x,y,pad)             peligros propios para que los bots los esquiven
     heroReachable(a,b)             ¿se puede llegar caminando? (bots no persiguen imposibles)
     buildDecor()                   armado del escenario
     drawWorld(now)                 dibujo del escenario (reemplaza al coliseo)
     pushTall()                     piezas altas ordenadas por profundidad
     drawTop()                      efectos sobre las entidades
     netState / applyNetState(s)    estado propio sincronizado por el anfitrión
     guestStart()                   el invitado arranca una partida (limpiar estado propio)
     subBossLevels: [..]            (dato) niveles con el subjefe estándar ([] = lo maneja la arena)
     holdLevel()                    true = el nivel todavía no puede terminar (p.ej. subjefe vivo)
     enemyTarget(e)                 a qué héroe persigue un enemigo (p.ej. solo a los alcanzables)
     botRegroup(h, t)               a qué punto ir si el compañero no es alcanzable caminando
     drawTall(it, now)              dibuja las piezas que empujó pushTall (marcadas con it.arena)
     drawScreen()                   dibujo en pantalla (minimapa)
     drawProjectile(p)              proyectiles con arte propio (true = ya dibujado)
     drawEnemyBody(e)               cuerpo propio de un enemigo (true = ya dibujado; El Reino Micelial)
     bossDefeated(boss)             true = la arena hace su propia secuencia de muerte del jefe y
                                    después llama a finishBossVictory() (js/core/run.js)
     botTarget(h, range)            prioridad propia de objetivo para los bots (o null = la de su rol)
     camLift()                      cuánto levantar la cámara (u) para que entre un jefe enorme
   ARENA_BOSS_TIPS[tipo]: guía de aparición de subjefes/jefes propios (boss-hud.js).
   ARENA_SFX[nombre]: sonidos propios {p, gap, play(t0, destino) -> duración} (audio.js).
   ARENA_EXT[clave]: EXTENSIONES de identidad para las arenas del camino de siempre (Bosque,
     Hielo, Acuática, Laberinto, Infernal). Usan los mismos ganchos que ARENA_DEFS pero SOLO los
     que agregan cosas encima (runStart, guestStart, beginLevel, update, guestUpdate, netState,
     applyNetState, drawGround, drawTop, botDanger, botNudge, enemyKilled, ctxTargets…).
     NUNCA geometría (clamp/inside/navBlocked/drawWorld/spawnPool): arenaDef() no las ve, así el
     camino de siempre (subjefes, octágono, navegación) sigue intacto.
     drawGround(now)                marcas en el piso (después del piso, antes de las entidades)
     ctxTargets()                   objetivos de la acción contextual (js/systems/context-actions.js)
     botNudge(h, target)            movimiento propio de un bot antes del de su rol (o null)
   ============================================================ */
const ARENA_DEFS = {};
const ARENA_EXT = {};
const ARENA_BOSS_TIPS = {};
const ARENA_SFX = {};
function arenaDef(){ return (typeof currentArena!=="undefined" && ARENA_DEFS[currentArena]) || null; }
// Definición con ganchos: la arena registrada o la extensión de una arena del camino de siempre.
function arenaHookDef(){
  if(typeof currentArena==="undefined") return null;
  return ARENA_DEFS[currentArena] || ((typeof divinaMode!=="undefined" && divinaMode) ? null : ARENA_EXT[currentArena]) || null;
}
// Llama al gancho `name` de la arena actual (si existe). Devuelve lo que devuelva el gancho.
function arenaHook(name, a, b, c, d){
  const def = arenaHookDef(); if(!def) return undefined;
  const f = def[name]; if(typeof f!=="function") return undefined;
  return f(a, b, c, d);
}
function arenaHas(name){ const def = arenaHookDef(); return !!(def && def[name]); }
// IA propia de un tipo de enemigo de la arena actual (o null).
function arenaEnemyAI(type){ const def = arenaDef(); return (def && def.enemyAI && def.enemyAI[type]) || null; }

// Cartel de presentación grande (arena / subjefe / jefe). Se repite en los invitados (red).
let _arenaTitleT = 0, _arenaTitleUntil = 0; // (boss-hud.js espera a que termine el cartel para mostrar la guía)
function arenaTitleCard(kicker, title, sub, ms){
  const el = document.getElementById("arena-title-card");
  if(!el) return;
  el.querySelector(".atc-kicker").textContent = kicker || "";
  el.querySelector(".atc-title").textContent = title || "";
  el.querySelector(".atc-sub").textContent = sub || "";
  el.classList.remove("hidden", "show"); void el.offsetWidth; el.classList.add("show");
  clearTimeout(_arenaTitleT);
  _arenaTitleUntil = performance.now() + (ms || 4200);
  _arenaTitleT = setTimeout(()=>{ el.classList.remove("show"); el.classList.add("hidden"); }, ms || 4200);
}
function arenaTitleCardHide(){
  const el = document.getElementById("arena-title-card");
  clearTimeout(_arenaTitleT); _arenaTitleUntil = 0;
  if(el){ el.classList.remove("show"); el.classList.add("hidden"); }
}
