"use strict";
/* ============================================================
   js/systems/reactions.js
   REACCIONES ENTRE ESTADOS y RESISTENCIAS por tipo de daño.
   Tipo de daño de un golpe (lo decide damageEnemy con las opciones del golpe):
     fire (quema) · ice (ralentiza/congela) · lightning (cadena/descarga) · bleed · physical.
   REACCIONES (universales: el estado lo puede poner un campeón y explotarlo OTRO):
     CONDUCCIÓN  rayo sobre un enemigo MOJADO: el rayo salta a todos los mojados cercanos y los aturde.
     QUIEBRE     golpe pesado (crítico/pesado/ulti) sobre un CONGELADO: +80% de daño, rompe el hielo
                 y las esquirlas lastiman alrededor.
     VAPOR       fuego sobre un congelado o muy ralentizado: +50% de daño, lo descongela y lo deja MOJADO
                 (encadena con Conducción: hielo -> fuego -> rayo).
     HEMORRAGIA  golpe pesado sobre un SANGRANTE: el sangrado que faltaba entra de golpe (+50%).
     INCENDIO    fuego sobre terreno combustible: lo manejan las arenas (envEmit "fire").
   Si el estado lo puso un compañero y la reacción la dispara otro: "¡COMBO DE EQUIPO!".
   Sin fuego amigo: nada de esto daña a los héroes.
   MOJADO: criaturas acuáticas (siempre), enemigos en los charcos/corrientes de la Acuática y lo
   que sale de un Vapor.
   RESISTENCIAS: cada arena da a su horda resistencias y debilidades legibles (hielo resiste hielo y
   teme al fuego, el Infierno al revés...). Los héroes resisten con objetos (res_fire, res_ice...).
   ============================================================ */
const REACTION_CFG = {
  conduction: {label:"¡CONDUCCIÓN!", rgb:"255,232,106", r:170, mult:1.25, arcPct:0.6, stun:320, sfx:"zap"},
  shatter:    {label:"¡QUIEBRE!",    rgb:"180,230,255", r:75,  mult:1.8,  shardPct:0.4, sfx:"shatter"},
  vapor:      {label:"¡VAPOR!",      rgb:"230,240,255", mult:1.5, wetMs:3000, sfx:"burnDeath"},
  hemorrhage: {label:"¡HEMORRAGIA!", rgb:"220,40,40",   mult:1.5, sfx:"gib"}
};
// Resistencia de la horda por arena (positivo = resiste, negativo = débil). Se aplica también a jefes.
const ENEMY_ARENA_RESIST = {
  bosque:{fire:-0.15}, acuatica:{ice:0.2, lightning:-0.3}, fortaleza:{physical:0.12, lightning:-0.15},
  micelial:{fire:-0.25}, hielo:{ice:0.4, fire:-0.25}, laberinto:{}, infernal:{fire:0.4, ice:-0.25}
};
const ENEMY_TYPE_RESIST = {
  golem:{physical:0.2}, golem_piedra:{physical:0.2}, golem_hielo:{ice:0.5, physical:0.15}, cangrejo_acorazado:{physical:0.15},
  medusa_electrica:{lightning:0.5}, anguila_electrica:{lightning:0.5}, demonio_hielo_fuego:{fire:0.3, ice:0.3},
  esqueleto:{bleed:0.5}, esqueleto_h:{bleed:0.5}, ent:{fire:-0.3}
};
const INNATE_WET = {tiburon_joven:1, tiburon_blanco:1, medusa_electrica:1, cangrejo_acorazado:1, sirena_abisal:1, anguila_electrica:1, kraken_joven:1, leviatan:1};
// Tipo del daño que hacen los enemigos a los héroes (para las resistencias de los objetos).
const ENEMY_ARENA_DMG = {hielo:"ice", infernal:"fire"};
const ENEMY_TYPE_DMG = {medusa_electrica:"lightning", anguila_electrica:"lightning", dragoncito_hielo:"ice", angel_hielo:"ice", dragon_hielo:"ice",
  mago_hielo_cristal:"ice", angel_caido_hielo:"ice", demonio_menor:"fire", demonio_mago:"fire", demonio_mayor:"fire", demonio_hielo_fuego:"fire"};

function dmgKindOf(opts){
  if(opts.dmgKind) return opts.dmgKind;
  if(opts.burn) return "fire";
  if(opts.chain || opts.shock) return "lightning";
  if((opts.slow || opts.freeze) && !opts.fromBasic) return "ice";
  if(opts.bleed) return "bleed";
  return "physical";
}
function enemyResist(e, kind){
  if(!e._resist){
    const a = ENEMY_ARENA_RESIST[typeof currentArena!=="undefined" ? currentArena : ""] || {}, t = ENEMY_TYPE_RESIST[e.type] || {};
    e._resist = Object.assign({}, a, t);
    if(INNATE_WET[e.type]) e.innateWet = true;
  }
  return e._resist[kind] || 0;
}
function _isWet(e){ return e.innateWet || e.wetTimer > 0; }
function _isFrozen(e){ return e.frozenTimer > 0 || (e.slowAmt||0) >= 0.7; }
let _reactLabelAt = {};
function _reactLabel(e, key, src, stateSrc){
  const C = REACTION_CFG[key], now = runElapsedMs;
  if(!(src===player || stateSrc===player) && !inView(e.x, e.y, 0)) return;
  if(now - (_reactLabelAt[key]||-1e9) > 420){ _reactLabelAt[key] = now; floatText(e.x, e.y-(e.radius||20)-34, C.label, "crit"); playSfx(C.sfx); }
  // sinergia: el estado lo puso otro héroe
  if(stateSrc && stateSrc!==src && stateSrc.classKey && src && src.classKey && now - (_reactLabelAt.combo||-1e9) > 2500){
    _reactLabelAt.combo = now;
    floatText(e.x, e.y-(e.radius||20)-58, `¡COMBO DE EQUIPO! ${CLASSES[stateSrc.classKey].name} + ${CLASSES[src.classKey].name}`, "heal");
    if(stateSrc.stats) stateSrc.stats.teamCombos = (stateSrc.stats.teamCombos||0) + 1;
    if(src.stats) src.stats.teamCombos = (src.stats.teamCombos||0) + 1;
  }
}
// Multiplicador de daño por reacción (y sus efectos). Mira los estados ANTES de este golpe.
function reactionMult(e, dmg, opts, src, pow, kind){
  if(opts.fromReaction || !src || !src.classKey || !e.alive) return 1;
  if(runElapsedMs - (e._reactAt||-1e9) < 300) return 1;
  let m = 1;
  if(kind==="lightning" && _isWet(e)){
    const C = REACTION_CFG.conduction; e._reactAt = runElapsedMs; m *= C.mult;
    let n = 0;
    for(const o of enemies){
      if(!o.alive || o===e || !_isWet(o) || Math.hypot(o.x-e.x, o.y-e.y) > C.r || n >= 6) continue;
      n++; pushChainBolt(e.x, e.y-14, o.x, o.y-12, 14, 260);
      damageEnemy(o, dmg*C.arcPct, {src, fromProc:true, fromReaction:true, dmgKind:"lightning"});
      if(o.rank!=="jefe" && o.rank!=="subjefe") o.stunTimer = Math.max(o.stunTimer||0, C.stun);
    }
    if(e.rank!=="jefe" && e.rank!=="subjefe") e.stunTimer = Math.max(e.stunTimer||0, C.stun);
    vfxBurst(e.x, e.y-14, 10, "shock", 140, 280, 3, 1, -20, 1);
    _reactLabel(e, "conduction", src, e.wetBy);
  } else if(kind==="physical" && pow>=3 && _isFrozen(e)){
    const C = REACTION_CFG.shatter; e._reactAt = runElapsedMs; m *= C.mult;
    const by = e.frozenBy || e.slowBy;
    e.frozenTimer = 0; e.slowAmt = 0; e.slowTimer = 0;
    for(const o of enemies){ if(!o.alive || o===e || Math.hypot(o.x-e.x, o.y-e.y) > C.r) continue; damageEnemy(o, dmg*C.shardPct, {src, fromProc:true, fromReaction:true, dmgKind:"ice"}); }
    vfxBurst(e.x, e.y-18, 14, "ice", 180, 400, 3.5, 1, -30, 0); vfxShock(e.x, e.y, 6, C.r, C.rgb, 300, 1);
    _reactLabel(e, "shatter", src, by);
  } else if(kind==="fire" && (e.frozenTimer>0 || (e.slowAmt||0) >= 0.5)){
    const C = REACTION_CFG.vapor; e._reactAt = runElapsedMs; m *= C.mult;
    const by = e.frozenBy || e.slowBy;
    e.frozenTimer = 0; e.slowAmt = 0; e.slowTimer = 0; e.wetTimer = C.wetMs; e.wetBy = src;
    vfxBurst(e.x, e.y-20, 10, "spirit", 70, 800, 4, 1, -45, 1);
    _reactLabel(e, "vapor", src, by);
  } else if(pow>=3 && kind!=="bleed" && e.bleedTimer>0 && e.bleedDmg>0){
    const C = REACTION_CFG.hemorrhage; e._reactAt = runElapsedMs;
    const extra = e.bleedDmg*(e.bleedTimer/1000)*C.mult; const by = e.bleedSrc;
    e.bleedTimer = 0;
    vfxBurst(e.x, e.y-16, 14, "blood", 170, 380, 3.5, 1, -20, 0);
    _reactLabel(e, "hemorrhage", src, by);
    if(extra > 0) runLater(0, ()=>{ if(e.alive) damageEnemy(e, extra, {src, fromProc:true, fromReaction:true, dmgKind:"bleed"}); });
  }
  return m;
}
// Aviso de resistencia/debilidad a los golpes del jugador (con tope, para que no sea ruido).
let _resLabelAt = {};
function resistLabel(e, kind, res, src){
  if(src!==player || Math.abs(res) < 0.14 || !inView(e.x, e.y, 0)) return;
  const k = kind+(res>0?"+":"-"), now = runElapsedMs;
  if(now - (_resLabelAt[k]||-1e9) < 3500) return;
  _resLabelAt[k] = now;
  const ico = {fire:"🔥", ice:"❄", lightning:"⚡", physical:"⚔", bleed:"🩸"}[kind] || "";
  floatText(e.x, e.y-(e.radius||20)-20, res > 0 ? `resiste ${ico}` : `¡débil a ${ico}!`, res > 0 ? null : "crit");
}
// Resistencia de un héroe (objetos) al daño de un enemigo.
function enemyDmgType(src){
  const s = src && src.from ? src.from : src;
  if(!s || !s.type) return null;
  return ENEMY_TYPE_DMG[s.type] || ENEMY_ARENA_DMG[currentArena] || "physical";
}
function heroResistMult(h, src){
  if(!h || !h.classKey) return 1;
  const t = enemyDmgType(src); if(!t) return 1;
  return 1 - Math.min(0.5, passiveSum(h.classKey, "res_"+t));
}
// Mojado en la Acuática: charcos y corrientes mojan a la horda (lo llama acuUpdate).
function reactionsWetZones(dt){
  if(currentArena!=="acuatica" || typeof ACU==="undefined" || !ACU.zones) return;
  for(const e of enemies){
    if(!e.alive || e.innateWet) continue;
    if(typeof acuInCharco==="function" && acuInCharco(e.x, e.y)){ e.wetTimer = Math.max(e.wetTimer||0, 1500); continue; }
    if(typeof acuFlowAt==="function" && acuFlowAt(e.x, e.y)) e.wetTimer = Math.max(e.wetTimer||0, 1200);
  }
}
