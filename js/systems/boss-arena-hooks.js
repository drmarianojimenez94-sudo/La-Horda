"use strict";
/* ============================================================
   js/systems/boss-arena-hooks.js
   BOSS + ARENA = ENCUENTRO — registro de evidencia (docs/bible/BOSS_BIBLE.md).
   Cada vez que un jefe USA su arena (o la arena lo castiga a él) el código llama a
   bossArenaEvent("<jefe>.<gancho>", e). Los ganchos están declarados en BOSS_BLUEPRINTS
   (js/arenas/common/boss-blueprints.js) y el validador (tools/bible/boss-validator.js) comprueba en
   una pelea real que los ganchos "auto" se disparan: una ficha que dice "usa los braseros" sin que
   el código lo haga queda en FAIL, no en un documento bonito.
   Solo cuenta: no cambia el juego. Se reinicia al empezar cada partida (bossArenaReset, run.js).
   ============================================================ */
const BOSS_ARENA_LOG = {};
function bossArenaEvent(id, e){
  const r = BOSS_ARENA_LOG[id] || (BOSS_ARENA_LOG[id] = {n:0, first:0, last:0});
  const now = typeof runElapsedMs!=="undefined" ? runElapsedMs : 0;
  if(!r.n) r.first = now;
  r.n++; r.last = now;
  if(r.n === 1 && typeof telemetryEvent==="function") telemetryEvent("boss_arena_hook", {id, type: e && e.type});
}
function bossArenaReset(){ for(const k in BOSS_ARENA_LOG) delete BOSS_ARENA_LOG[k]; }
function bossArenaCount(id){ return BOSS_ARENA_LOG[id] ? BOSS_ARENA_LOG[id].n : 0; }
