"use strict";
/* ============================================================
   js/arenas/hielo/hie-tundraverx.js
   BOSS IDENTITY — TUNDRAVERX, SOBERANO DE HIELO (subjefe de la Arena Gélida, nivel 6).
   Ficha: BOSS_BLUEPRINTS.dragon_hielo. Enseña lo que el Demonio Gélido (nivel 10) evalúa: EL FUEGO.
   - ESCAMAS DE ESCARCHA: lejos del fuego recibe menos daño (−30 %); junto a un brasero encendido se derrite
     y recibe más (×1,35). Pelearlo al lado del fuego es la jugada.
   - SU ALIENTO APAGA BRASEROS: el cono congela el brasero encendido que alcanza (nunca el último).
   - AURA DE INVIERNO: cerca de él el frío sube aunque te muevas (la regla de la arena, más fuerte).
   Anfitrión: braseros y frío ya viajan en hieNetState / estado del héroe.
   ============================================================ */
const HIE_TUNDRA = { shield:0.7, melt:1.35, meltPad:40, auraR:280, auraRate:9 };
function hieTundraRule(e, dt){
  if(currentArena!=="hielo" || e.rank!=="subjefe" || typeof HIE==="undefined") return;
  const C = HIE_TUNDRA;
  const near = hieNearLit(e.x, e.y, (e.radius||40) + C.meltPad);
  if(e._expT > 0){ e._encMult = 1; e._encTag = null; }
  else if(near){
    e._encMult = C.melt; e._encTag = "¡SE DERRITE JUNTO AL FUEGO!";
    if(!e._tvNear){ e._tvNear = true; bossArenaEvent("dragon_hielo.fuego", e); }
    if(Math.random() < dt/140) vfxBurst(e.x, e.y - e.radius, 2, "steam", 60, 500, 3, 1, -40, 0);
  } else { e._tvNear = false; e._encMult = C.shield; e._encTag = "ESCAMAS DE ESCARCHA −30 % · llevalo al FUEGO"; }
  // aura de invierno: el frío sube aunque se muevan (salvo junto a un brasero)
  let chilled = false;
  for(const h of heroes){
    if(!h.alive || Math.hypot(h.x - e.x, h.y - e.y) > C.auraR || hieNearLit(h.x, h.y)) continue;
    h._cold = Math.min(99, (h._cold||0) + C.auraRate*dt/1000); chilled = true;
  }
  e._tvChillT = chilled ? (e._tvChillT||0) + dt : 0;
  if(e._tvChillT >= 3000){ e._tvChillT = 0; bossArenaEvent("dragon_hielo.frio", e); }
}
// Al resolver el Aliento de Hielo (update.js): congela el brasero encendido dentro del cono (nunca el último).
function hieTundraBreath(e, dx, dy, R){
  if(currentArena!=="hielo" || e.rank!=="subjefe" || typeof HIE==="undefined") return;
  for(const b of HIE.br){
    if(!b.lit || HIE.br.filter(o=>o.lit).length < 2) continue;
    const bx = b.x - e.x, by = b.y - e.y, d = Math.hypot(bx, by) || 1;
    if(d > R + 40 || (bx/d*dx + by/d*dy) < 0.55) continue;
    b.lit = false; b.done = false; b.prog = 0; b.fuel = 0;
    vfxBurst(b.x, b.y - 34, 18, "ice", 140, 700, 3, 1, -50, 0); playSfx("hieOut");
    floatText(b.x, b.y - 70, "¡Su aliento congeló el brasero!", "crit");
    bossArenaEvent("dragon_hielo.brasero", e);
  }
}
