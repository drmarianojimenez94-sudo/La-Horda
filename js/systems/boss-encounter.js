"use strict";
/* ============================================================
   js/systems/boss-encounter.js
   BOSS IDENTITY — piezas COMUNES de los encuentros de jefe (cada arena arma su regla con esto):
   - bossExpose(e, ms, mult, txt): ventana de VULNERABILIDAD (EXPUESTO): aturde un rato, sube el daño
     recibido (usa crashVuln, que ya lee el HUD y combat.js) y avisa claro. Es el premio por resolver
     la mecánica del jefe.
   - e._encMult / e._encTag: blindaje o escudo PROPIO del encuentro (armadura del Caballero, escudo de
     raíces, escudo de hielo, cuerpo sumergido del Leviatán…). combat.js lo multiplica y el HUD muestra
     la etiqueta. Nunca inmunidad total: siempre se le puede hacer daño, pero poco.
   - bossHeroesFarMs(e, R, dt): cuánto hace que TODO el equipo está lejos del jefe (ANTI-KITE: cada
     jefe decide qué hace cuando lo kitean: atacar la ciudad, bombardear, cargar, hundir el piso…).
   - bossHeroesCloseMs(e, R, dt): cuánto hace que alguien está pegado (ANTI-FACETANK).
   - bossDeathCleanup(): al morir un jefe se cancelan sus golpes diferidos, los avisos y los
     proyectiles enemigos, y la arena limpia sus propios peligros (gancho "bossCleanup"). Nada de
     daño póstumo injusto.
   Todo corre en el anfitrión; los campos viajan con el enemigo (red) y el invitado los dibuja.
   ============================================================ */
function bossExpose(e, ms, mult, txt){
  if(!e || !e.alive) return;
  e.crashVuln = true; e._expT = Math.max(e._expT||0, ms); e._expMult = mult || 1.6;
  e.stunTimer = Math.max(e.stunTimer||0, Math.min(ms, 2600));
  e.channel = null; e.bossCharge = null;
  if(txt) showBanner(txt);
  floatText(e.x, e.y - (e.radius||40)*2.4, "¡EXPUESTO!", "crit");
  vfxShock(e.x, e.y, (e.radius||40)*0.6, (e.radius||40)*3.2, "255,230,120", 700, 3);
  vfxShake(6); if(typeof hitStop==="function") hitStop(90);
  playSfx("shatter");
}
function bossEncounterDmgMult(e){
  let m = e._encMult || 1;
  if(e._expT > 0 && e._expMult) m *= e._expMult/1.6;   // crashVuln ya aplica x1.6 en combat.js
  return m;
}
function bossEncounterTick(dt){
  if(!enemies) return;
  for(const e of enemies){
    if(!e.alive || !(e._expT > 0)) continue;
    e._expT -= dt;
    if(e._expT <= 0){ e._expT = 0; e.crashVuln = false; }
  }
}
function bossHeroesFarMs(e, R, dt){
  let far = true;
  for(const h of heroes){ if(h.alive && Math.hypot(h.x - e.x, h.y - e.y) < R){ far = false; break; } }
  e._kiteMs = far ? (e._kiteMs||0) + dt : Math.max(0, (e._kiteMs||0) - dt*2);
  return e._kiteMs;
}
function bossHeroesCloseMs(e, R, dt){
  let close = false;
  for(const h of heroes){ if(h.alive && Math.hypot(h.x - e.x, h.y - e.y) < R){ close = true; break; } }
  e._hugMs = close ? (e._hugMs||0) + dt : Math.max(0, (e._hugMs||0) - dt*1.5);
  return e._hugMs;
}
function bossNearestHero(x, y){ let b = null, bd = Infinity; for(const h of heroes){ if(!h.alive) continue; const d = Math.hypot(h.x - x, h.y - y); if(d < bd){ bd = d; b = h; } } return b; }
function bossFarthestHero(x, y){ let b = null, bd = -1; for(const h of heroes){ if(!h.alive) continue; const d = Math.hypot(h.x - x, h.y - y); if(d > bd){ bd = d; b = h; } } return b; }
function bossDeathCleanup(){
  if(typeof bossStrikes!=="undefined" && bossStrikes) bossStrikes.length = 0;
  if(typeof vfxTeles!=="undefined") for(const s of vfxTeles) s.on = false;
  if(projectiles) projectiles = projectiles.filter(p=>!p.enemy);
  for(const o of enemies){ if(o.alive){ o.channel = null; o.bossCharge = null; o.bossWind = null; } }
  if(typeof arenaHas==="function" && arenaHas("bossCleanup")) arenaHook("bossCleanup");
  if(typeof BOSS_CLEANUP_EXTRA!=="undefined") for(const f of BOSS_CLEANUP_EXTRA) try{ f(); }catch(err){}
}
// Arenas sin registro (Ruinas, Gélida, Acuática, Laberinto, Infernal) suman acá su propia limpieza.
const BOSS_CLEANUP_EXTRA = [];
// ...y reaccionan cuando cae un golpe diferido de jefe (bossStrike): p.ej. el Guardián rompe su propia raíz.
const BOSS_STRIKE_HOOKS = [];
