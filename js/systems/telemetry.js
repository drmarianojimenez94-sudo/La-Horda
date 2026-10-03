"use strict";
/* ============================================================
   js/systems/telemetry.js
   TELEMETRÍA PREPARADA (sin servicios nuevos). Un solo punto para eventos de diseño:
     telemetryEvent(name, data)  -> anillo local (window.HORDA_TELEMETRY, últimos 300) + CustomEvent
                                    "horda-telemetry" para herramientas/QA. Nada sale del dispositivo.
   Los eventos que la Alpha ya acepta en su servidor (AlphaServices, con opción de no participar en
   Opciones) se reenvían por esa vía con su nombre existente (TELEMETRY_ALPHA_MAP). El resto queda
   local hasta que el servidor los incluya en su lista blanca: así no se agregan servicios externos
   ni se recolectan datos sensibles (solo claves de campeón/arena/habilidad y números).
   Eventos: arena_started, arena_completed, arena_failed, champion_selected, ability_used,
   ability_inspected, tactical_panel_opened, player_down, player_revived, boss_killed,
   set_piece_dropped, arena_briefing_shown, arena_tutorial_started, arena_tutorial_completed,
   tutorial_step_failed, tutorial_skipped.
   ============================================================ */
const TELEMETRY_MAX = 300;
const TELEMETRY_ALPHA_MAP = {arena_started:"run_started", tutorial_skipped:"tutorial_skipped"};
window.HORDA_TELEMETRY = window.HORDA_TELEMETRY || [];
function telemetryEvent(name, data){
  try{
    const ev = {name:String(name), t:Math.round(performance.now())};
    for(const [k, v] of Object.entries(data||{})){
      if(typeof v==="string" && /^[a-zA-Z0-9_:.\- ]{0,80}$/.test(v)) ev[k] = v;
      else if(typeof v==="number" && Number.isFinite(v)) ev[k] = v;
      else if(typeof v==="boolean") ev[k] = v;
    }
    const L = window.HORDA_TELEMETRY; L.push(ev); if(L.length > TELEMETRY_MAX) L.splice(0, L.length - TELEMETRY_MAX);
    window.dispatchEvent(new CustomEvent("horda-telemetry", {detail:ev}));
    const mapped = TELEMETRY_ALPHA_MAP[name];
    if(mapped && typeof AlphaServices!=="undefined" && AlphaServices.emit) AlphaServices.emit(mapped, {champion:ev.champion, arena:ev.arena, step:ev.step});
  }catch(e){ /* la telemetría nunca rompe la partida */ }
}
(function hookTelemetry(){
  const wrap = (name, fn)=>{ if(typeof window[name]!=="function") return; const base = window[name]; window[name] = function(){ let r; try{ r = base.apply(this, arguments); } finally { try{ fn.apply(this, arguments); }catch(e){} } return r; }; };
  wrap("startRun", ()=>{ if(typeof player!=="undefined" && player) telemetryEvent("arena_started", {arena:currentArena, champion:player.classKey}); });
  wrap("onPlayerDeath", ()=>telemetryEvent("player_down", {arena:currentArena, champion:player && player.classKey, level:typeof runLevel!=="undefined" ? runLevel : 0}));
  wrap("onBossDefeated", ()=>telemetryEvent("boss_killed", {arena:currentArena, champion:player && player.classKey}));
  wrap("finishBossVictory", ()=>telemetryEvent("arena_completed", {arena:currentArena, champion:player && player.classKey}));
  wrap("reviveHero", (a, by)=>telemetryEvent("player_revived", {arena:currentArena, champion:a && a.classKey, by:by && by.classKey}));
  // habilidades del jugador (no de bots): nombre interno del kind, sin datos personales
  if(typeof castAbility==="function"){ const base = castAbility; castAbility = function(h, sk, isUlt){ const r = base.apply(this, arguments); try{ if(h===player && sk) telemetryEvent("ability_used", {champion:h.classKey, ability:String(sk.kind||""), ult:!!isUlt}); }catch(e){} return r; }; }
})();
