"use strict";
/* ============================================================
   js/arenas/infernal/inf-hech-rift.js
   BOSS IDENTITY — EL HECHICERO SUPREMO (subjefe, nivel 9). REGLA: ÉL ABRIÓ LOS PORTALES… CERRALOS.
   Ficha: BOSS_BLUEPRINTS.hechicero_supremo (js/arenas/common/boss-blueprints.js).
   El guía que te trajo hasta acá es el que abre las FISURAS de la Arena Infernal (lore: el Primero de
   los Cuatro). En su pelea:
   - GRIETA CONJURADA (ataque "hsRift"): desgarra el piso cerca de un guardián y abre una FISURA REAL de
     la arena (etapa 2, mismo aviso de 1,7 s, nunca encima de nadie). Al abrirse escupe un demonio.
   - Mientras sus grietas sigan abiertas, se ALIMENTA de ellas: recibe menos daño (−30 % / −45 %).
   - SELLAR una grieta conjurada (la acción contextual de siempre: "Cerrar") le corta el poder: queda
     EXPUESTO. La decisión de la arena ("¿mato o cierro?") ahora también es la del jefe.
   Anfitrión (la IA y las fisuras las decide él; viajan en infNetState). Máximo 2 grietas suyas a la vez.
   ============================================================ */
const HECH_RIFT = { max:2, shield:[1, 0.7, 0.55], exposeMs:3800, exposeMult:1.55, minD:200, maxD:330 };
function hechRifts(){ return INF.fis.filter(f=>f.hech && !f.done); }
// Ataque del director (BOSS_ATTACKS.hsRift): false si no corresponde ahora (el director prueba otro).
function hechRiftOpen(e, t){
  if(currentArena!=="infernal" || hechRifts().length >= HECH_RIFT.max || typeof infMakeFissure!=="function") return false;
  for(let k=0;k<24;k++){
    const a = Math.random()*Math.PI*2, d = HECH_RIFT.minD + Math.random()*(HECH_RIFT.maxD - HECH_RIFT.minD);
    const x = t.x + Math.cos(a)*d, y = t.y + Math.sin(a)*d*0.8;
    if(!aidInside(x, y, 110) || aidBlocked(x, y, 60)) continue;
    if(INF.fis.some(f=>!f.done && Math.hypot(f.x-x, f.y-y) < 220)) continue;
    if(heroes.some(h=>h.alive && Math.hypot(h.x-x, h.y-y) < 150)) continue;
    const f = infMakeFissure(x, y);
    f.hech = 1; f.stage = 2; infSyncStage(f);
    vfxTelegraph({shape:0, r:INF_CFG.radius[2], x, y, dur:INF_CFG.openWarn, rgb:"255,200,120"});
    vfxShock(e.x, e.y, 10, 120, "255,225,140", 500, 1);
    playSfx("infCrack"); vfxShake(4);
    floatText(x, y-40, "¡Grieta conjurada!", "crit");
    runLater(INF_CFG.openWarn + 60, ()=>{ if(!f.done && e.alive && typeof infSpawnFrom==="function") infSpawnFrom(f, 1); });
    bossArenaEvent("hechicero_supremo.fisura", e);
    if(typeof tutSay==="function" && !tutSeen("hech_rift")) tutSay("hech_rift", "El Hechicero ABRE FISURAS y se alimenta de ellas (recibe menos daño). CERRÁ sus grietas con la acción contextual: queda EXPUESTO.", null, 10000, true);
    return true;
  }
  return false;
}
// Cada frame en la IA del Hechicero (inf-hechicero.js): escudo según sus grietas abiertas.
function hechRiftRule(e){
  if(e.type!=="hechicero_supremo") return;
  if(e._expT > 0){ e._encMult = 1; e._encTag = null; return; }
  const n = Math.min(HECH_RIFT.max, hechRifts().filter(f=>!(f.warn > 0)).length);
  e._encMult = HECH_RIFT.shield[n];
  e._encTag = n ? `ALIMENTADO POR ${n} GRIETA${n===1 ? "" : "S"} (−${Math.round((1 - e._encMult)*100)}%) · cerralas` : null;
}
// Una grieta suya fue sellada por los héroes (CTX_KINDS.inf_fissure.onComplete).
function hechRiftSealed(f){
  const e = enemies.find(o=>o.alive && o.type==="hechicero_supremo");
  if(!e) return;
  bossExpose(e, HECH_RIFT.exposeMs, HECH_RIFT.exposeMult, "✦ ¡SELLASTE SU GRIETA! El Hechicero queda EXPUESTO");
  bossArenaEvent("hechicero_supremo.sello", e);
}
