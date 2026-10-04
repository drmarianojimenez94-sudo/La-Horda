"use strict";
/* ============================================================
   js/arenas/laberinto/lab-guardian.js
   BOSS IDENTITY — EL GUARDIÁN DEL LABERINTO (subjefe, nivel 6). REGLA: EL LABERINTO ES SUYO… Y SE LE CAE.
   Ficha: BOSS_BLUEPRINTS.guardian_laberinto (js/arenas/common/boss-blueprints.js).
   - LABERINTO DE PIEDRA: levanta un anillo de pilares con UN hueco alrededor de un guardián (aviso de
     0,65 s en el piso, nunca encima de nadie). Es el mismo poder que el Ángel Corrompido le roba en la
     Arena Infernal (acPiedra, inf-hechicero.js): acá es SUYO y se ve primero.
   - DERRUMBE PROPIO: si su PISOTÓN SÍSMICO cae junto a sus pilares, los derriba y queda EXPUESTO
     (los pilares del Laberinto no aguantan a su propio guardián). Encerrado no es perdido: esperalo
     pegado a un pilar, esquivá el pisotón a último momento y castigalo.
   Pilares: segmentos de iceWalls (st:1, gl:1): colisión con guardianes y sincronización de red ya
   existentes. Anfitrión (la IA corre en el anfitrión; los invitados ven iceWalls por la red).
   ============================================================ */
const LAB_GUARD = { ringCd:[11000, 13500], ringR:140, ringN:10, ringWarn:650, ringLife:6500, ringMaxDist:620,
                    breakPad:34, exposeMs:3600, exposeMult:1.5 };
function labGuardPillars(){ return iceWalls.filter(w=>w.gl); }
// Llamado desde la IA del Guardián (boss-skills.js) antes de sus ataques. true = actuó este frame.
function labGuardTick(e, tgt, dist){
  if(e._glRing===undefined) e._glRing = 6000;
  e._glRing -= dt_boss;
  if(e._glRing > 0 || dist > LAB_GUARD.ringMaxDist || e.bossWind) return false;
  const C = LAB_GUARD;
  e._glRing = C.ringCd[0] + Math.random()*(C.ringCd[1] - C.ringCd[0]);
  const cx = tgt.x, cy = tgt.y, gap = (Math.random()*C.ringN)|0, spots = [];
  for(let i=0;i<C.ringN;i++){ if(i===gap || i===(gap+1)%C.ringN) continue; const a = i/C.ringN*Math.PI*2; spots.push({x:cx + Math.cos(a)*C.ringR, y:cy + Math.sin(a)*C.ringR*0.8}); }
  for(const p of spots) vfxTelegraph({shape:0, r:24, x:p.x, y:p.y, dur:C.ringWarn, rgb:"200,160,110"});
  animTrigger(e, "bossCast", 900, 0.5);
  bossSkillLabel(e, "¡Laberinto de Piedra!");
  runLater(C.ringWarn, ()=>{
    if(!e.alive || state!=="playing") return;
    let n = 0;
    for(const p of spots){
      if(iceWalls.length >= ICE_WALL_MAX) break;
      if(heroes.some(h=>h.alive && Math.hypot(h.x-p.x, h.y-p.y) < 22 + (h.radius||18) + 2)) continue; // nunca encima de un guardián
      const c = {x:p.x, y:p.y}; clampToArena(c);
      iceWalls.push({x:c.x, y:c.y, r:22, life:C.ringLife, maxLife:C.ringLife, st:1, gl:1, flip:false, img:0});
      vfxBurst(c.x, c.y-10, 5, "rock", 90, 320, 3, 0, -40, 0); n++;
    }
    if(n){ vfxShake(6); playSfx("heavy"); bossArenaEvent("guardian_laberinto.muro", e); }
    if(typeof tutSay==="function" && !tutSeen("lab_guard_ring")) tutSay("lab_guard_ring", "¡Te encerró en su LABERINTO DE PIEDRA! Si su PISOTÓN cae junto a los pilares, los derriba y queda EXPUESTO: esperalo pegado a un pilar y esquivá a último momento.", null, 10000, true);
  });
  return true;
}
// Al resolver su Pisotón Sísmico: derriba los pilares propios alcanzados y, si rompió alguno, queda expuesto.
function labGuardStompResolved(e, R){
  const C = LAB_GUARD; let broke = 0;
  for(const w of iceWalls){
    if(!w.gl || w.life <= 0) continue;
    if(Math.hypot(w.x - e.x, w.y - e.y) <= R + C.breakPad){ w.life = Math.min(w.life, 1); broke++; vfxBurst(w.x, w.y - 30, 10, "rock", 170, 600, 4, 2, -60, 0); }
  }
  if(!broke) return;
  bossExpose(e, C.exposeMs, C.exposeMult, "💥 ¡SU PISOTÓN DERRIBA SU PROPIO LABERINTO! El Guardián queda EXPUESTO");
  bossArenaEvent("guardian_laberinto.derrumbe", e);
}
