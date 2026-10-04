"use strict";
/* ============================================================
   js/arenas/infernal/inf-guardians.js
   BOSS IDENTITY — GUARDIANES DE LA HORDA de la Arena Infernal (subjefes "campeón" de los niveles 4 y 7).
   Fichas: BOSS_BLUEPRINTS.esqueleto_h / demonio_menor. La arena ENSEÑA lo que el Hechicero (nivel 9) y el
   Rey de la Horda (nivel 10) después evalúan: las FISURAS son portales de la Horda y las barricadas de
   basalto, paredes que se pueden usar.
   - ESQUELETO CORNUDO (nivel 4): sale de una fisura. Su EMBESTIDA ÓSEA contra una barricada de basalto lo
     estampa: queda aturdido y vulnerable (el mismo choque del Minotauro, ahora contra el basalto).
   - DEMONIO MENOR (nivel 7): alimenta las fisuras (abre o agranda una cada 11 s, con aviso) y, con una
     fisura abierta cerca, recibe menos daño. SELLAR una fisura junto a él lo deja EXPUESTO.
   Anfitrión: las fisuras viajan en infNetState; el resto es estado del enemigo.
   ============================================================ */
const INF_GUARD = { feedEvery:[10000, 12500], feedR:520, shieldR:420, shield:0.75, sealR:440, exposeMs:3500, exposeMult:1.5 };
function _infOpenNear(x, y, R){ let best = null, bd = R; for(const f of INF.fis){ if(f.done || f.warn > 0) continue; const d = Math.hypot(f.x - x, f.y - y); if(d < bd){ bd = d; best = f; } } return best; }
// Al aparecer el campeón (update.js): sale de una fisura abierta (o de una que se abre para él).
function infGuardianSpawn(e){
  if(currentArena!=="infernal" || !e || (e.type!=="esqueleto_h" && e.type!=="demonio_menor") || typeof INF==="undefined") return false;
  const c = infHeroCentroid();
  let f = _infOpenNear(c.x, c.y, 1e9) || infTryOpen();
  if(!f) return false;
  e.x = f.x; e.y = f.y + 10; clampToArena(e);
  vfxShock(f.x, f.y, 10, 160, "255,110,30", 700, 2); vfxBurst(f.x, f.y - 20, 22, "ember", 160, 700, 3.5, 1, -60, 0); vfxShake(7);
  bossArenaEvent(e.type + ".fisura", e);
  return true;
}
// Cada frame en la IA de su versión subjefe (boss-skills.js).
function infGuardianTick(e, dt){
  if(currentArena!=="infernal" || e.type!=="demonio_menor") return;
  const C = INF_GUARD;
  if(e._igFeed===undefined) e._igFeed = 5000;
  e._igFeed -= dt;
  if(e._igFeed <= 0){
    e._igFeed = C.feedEvery[0] + Math.random()*(C.feedEvery[1] - C.feedEvery[0]);
    let f = _infOpenNear(e.x, e.y, C.feedR);
    if(f && f.stage < 3){
      f.stage++; f.growT = INF_CFG.growEvery; infSyncStage(f);
      vfxTelegraph({shape:0, x:f.x, y:f.y, r:INF_CFG.radius[f.stage], dur:900, rgb:"255,110,30"});
      floatText(f.x, f.y - 50, "¡El Demonio alimenta la fisura!", "crit");
    } else if(!f && infOpenCount() < INF_CFG.maxOpen(runLevel) + 1) f = infTryOpen();
    if(f){ animTrigger(e, "bossCast", 800, 0.5); playSfx("infGrow"); bossArenaEvent("demonio_menor.fisura", e); }
  }
  if(e._expT > 0){ e._encMult = 1; e._encTag = null; return; }
  const near = _infOpenNear(e.x, e.y, C.shieldR);
  e._encMult = near ? C.shield : 1;
  e._encTag = near ? "LA FISURA LO ALIMENTA (−25 %) · sellala" : null;
}
// Una fisura fue sellada (CTX_KINDS.inf_fissure.onComplete): el Demonio Menor cercano queda expuesto.
function infGuardianSealed(f){
  for(const e of enemies){
    if(!e.alive || e.type!=="demonio_menor" || e.rank!=="subjefe" || Math.hypot(e.x - f.x, e.y - f.y) > INF_GUARD.sealR) continue;
    bossExpose(e, INF_GUARD.exposeMs, INF_GUARD.exposeMult, "🜂 ¡SELLASTE SU FISURA! El Demonio Menor queda EXPUESTO");
    bossArenaEvent("demonio_menor.sello", e);
  }
}
