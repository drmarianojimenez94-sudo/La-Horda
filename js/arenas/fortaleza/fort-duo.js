"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-duo.js
   BOSS IDENTITY — AMO Y BESTIA: el Caballero de la Armadura Oxidada y su Dragón de la Forja.
   REGLA: USÁ AL DRAGÓN PARA ROMPER AL CABALLERO.
   - El Dragón NO muere en el nivel 6: herido, huye hacia la cámara del trono de su amo (la compuerta
     queda abierta igual, con su botín). En el nivel 10 vuelve y pelea JUNTO al Caballero.
   - La ARMADURA del Caballero reduce mucho el daño mientras está estable (no es inmunidad).
   - El fuego del Dragón (Aliento de Forja, Bombardeo) que alcanza al Caballero lo SOBRECALIENTA:
     metal oscuro -> rojo -> incandescente. Sobrecalentado, un chorro de VAPOR (las 4 rejillas de la
     cámara: se abren con la acción ABRIR VÁLVULA, o saltan solas) le da el SHOCK TÉRMICO: la armadura
     se quiebra -> EXPUESTO. Después se recompone, pero cada shock la deja más débil.
   - Relación: con el Dragón malherido el Caballero se enfurece y lo cubre; sin su bestia pelea con
     rabia. Con el amo en su última fase, el Dragón enloquece (bombardea más seguido).
   - ANTI-KITE: lejos del Caballero, el Dragón bombardea. ANTI-FACETANK: pegado, el Caballero usa su
     Postura de Contraataque. La posición buena cambia todo el tiempo.
   Todo lo decide el anfitrión; fortS.duo viaja en el estado de la arena.
   ============================================================ */
FORT_CFG.duo = { armor:[0.35, 0.5, 0.62], heatBreath:13, heatBomb:34, heatDecay:5, heatMax:100, shockMs:6000, shockMult:1.65,
                 dragonAt:3400, dragonHp:0.6, valveMs:800, protectAt:0.3, kiteR:480, kiteMs:3000, fleeAt:0.25, fleeMs:1800 };
function fortDuoKnight(){ return enemies.find(e=>e.alive && e.type==="caballero") || null; }
function fortDuoDragon(){ return enemies.find(e=>e.alive && e.type==="dragon_forja" && e.fortCompanion) || null; }
function fortDuoSteam(){ const out = []; FORT_MAP.traps.forEach((T, i)=>{ if(T.type==="steam" && T.sector===6) out.push(i); }); return out; }

// ---- nivel 6: el Dragón huye herido hacia su amo (en vez de morir) ----
function fortDragonFleeTick(e, dt){
  const C = FORT_CFG.duo;
  if(runLevel!==6 || e.fortCompanion) return false;
  if(!e.fortFlee && e.hp <= e.maxHp*C.fleeAt){
    e.fortFlee = {t:0}; e.dmgTakenMult = 0.0001; e.bossWind = null; e.fortBreath = null; e.fortFly = null;
    showBanner("¡EL DRAGÓN HUYE HERIDO HACIA EL TRONO DE SU AMO!");
    playSfx("bossRoar"); vfxShake(8);
    if(typeof tutSay==="function" && !tutSeen("fort_flee")) tutSay("fort_flee", "El Dragón no murió: voló hacia la cámara del Caballero. Es SU bestia… lo vas a volver a ver.", null, 8000, true);
  }
  if(!e.fortFlee) return false;
  const F = e.fortFlee; F.t += dt;
  e.hover = Math.max(-420, (e.hover||-70) - dt*0.22); e.y -= 240*dt/1000; e.fx = 0; e.fy = -1; _fb(e, "fly", 400);
  if(Math.random() < dt/50) vfxBurst(e.x, e.y + e.hover*0.5, 3, "ember", 90, 500, 3, 1, -40, 0);
  if(F.t >= C.fleeMs){ e.vanishOnDeath = true; e.fortFled = true; e.hp = 0; killEnemy(e); }
  return true;
}

// ---- nivel 10: el encuentro de los dos ----
function fortDuoUpdate(dt){
  const K = fortS && fortS.knight; if(!K || K.state!=="fight" || runLevel!==LEVEL_COUNT) return;
  const kn = fortDuoKnight(); if(!kn) return;
  const C = FORT_CFG.duo, D = fortS.duo || (fortS.duo = {t:0, heat:0, shocks:0, dragon:"none", valves:[], protect:0, rage:0});
  D.t += dt;
  // el Dragón vuelve con su amo
  if(D.dragon==="none" && D.t >= C.dragonAt){
    D.dragon = "alive";
    const d = spawnEnemy("dragon_forja", false, false);
    scaleBossStats(d, "dragon_forja");
    d.maxHp = Math.round(d.maxHp*C.dragonHp); d.hp = d.maxHp;
    d.x = kn.x + 220; d.y = kn.y - 120; d.fx = -1; d.fy = 0;
    fortInitEnemy(d);
    d.flying = true; d.hover = -260; d.fortCompanion = true; d.rank = "subjefe";
    d.dcd = 2200; d.breathCd = 3500; d.bombCd = 7000; d.flapCd = 8000;
    vfxBurst(d.x, d.y - 80, 30, "ember", 260, 900, 4, 2, -70, 0); vfxShake(10); playSfx("bossRoar"); playSfx("fortWing");
    showBanner("¡EL DRAGÓN DE LA FORJA VUELVE JUNTO A SU AMO!");
    if(typeof tutSay==="function" && !tutSeen("fort_duo")) tutSay("fort_duo", "La ARMADURA del Caballero casi no recibe daño. Hacé que el FUEGO del Dragón lo alcance: cuando brille al rojo, ABRÍ UNA VÁLVULA de vapor cerca de él y se quiebra.", null, 12000, true);
  }
  const broke = kn._expT > 0;
  const armor = C.armor[Math.min(C.armor.length - 1, D.shocks)];
  kn._encMult = broke ? 1 : armor;
  D.heat = Math.max(0, D.heat - C.heatDecay*dt/1000);
  kn._fHeat = Math.round(D.heat);
  kn._encTag = broke ? null : D.heat >= C.heatMax ? "INCANDESCENTE: ¡VAPOR!" : D.heat >= 50 ? `SE CALIENTA (${Math.round(D.heat)}%)` : `ARMADURA −${Math.round((1 - armor)*100)}%`;
  // válvulas de vapor (acción contextual): las 4 rejillas de la cámara
  const old = new Map((D.valves||[]).map(v=>[v.id, v])); D.valves = [];
  for(const i of fortDuoSteam()){
    const T = FORT_MAP.traps[i], s = fortS.traps[i]; if(!s || s.st!==FORT_TRAP_IDLE) continue;
    const id = "valve" + i, v = old.get(id) || {id, ti:i, r:86, kind:"fort_valve", dur:C.valveMs, prog:0};
    v.x = T.x; v.y = T.y + 60; D.valves.push(v);
  }
  // SHOCK TÉRMICO: incandescente + chorro de vapor encima
  if(!broke && D.heat >= C.heatMax){
    for(const i of fortDuoSteam()){
      const T = FORT_MAP.traps[i], s = fortS.traps[i];
      if(s && s.st===FORT_TRAP_ACT && Math.hypot(kn.x - T.x, kn.y - T.y) <= FORT_CFG.cycle.steam.r + kn.radius){
        D.heat = 0; D.shocks++;
        bossExpose(kn, C.shockMs, C.shockMult, "¡SHOCK TÉRMICO! La armadura oxidada se quiebra");
        if(typeof bossArenaEvent==="function") bossArenaEvent("caballero.valvula", kn);
        vfxBurst(kn.x, kn.y - 60, 40, "steam", 220, 900, 5, 2, -80, 0); vfxBurst(kn.x, kn.y - 40, 24, "spark", 200, 600, 4, 1, -50, 0);
        playSfx("fortSteamBig"); playSfx("fortMetal");
        break;
      }
    }
  }
  // relación amo / bestia
  const dr = fortDuoDragon();
  if(dr && dr.hp < dr.maxHp*C.protectAt && !D.protect){ D.protect = 1; kn.enraged = true; showBanner("¡EL CABALLERO PROTEGE A SU BESTIA!"); playSfx("fortSword"); }
  if(D.dragon==="alive" && !dr){ D.dragon = "dead"; D.rage = 1; kn.enraged = true; kn.speed = Math.round(kn.speed*1.15); showBanner("El Caballero ruge: su bestia cayó. Pelea con rabia… y descuida la guardia."); }
  if((D.protect || D.rage) && kn.kcd > 0) kn.kcd -= dt*0.3;                  // más agresivo
  if(D.rage) kn._encMult = broke ? 1 : Math.min(1, armor + 0.12);           // sin la bestia descuida la guardia
  if((K.phase||1) >= 3 && dr && !dr._duoRage){ dr._duoRage = 1; dr.enraged = true; dr.bombCd = Math.min(dr.bombCd, 1500); showBanner("¡El Dragón enloquece al ver caer a su amo!"); }
  // ANTI-KITE: todos lejos del Caballero -> el Dragón bombardea
  if(dr && bossHeroesFarMs(kn, C.kiteR, dt) > C.kiteMs){ kn._kiteMs = 0; if(dr.bombCd > 0) dr.bombCd = 0; }
}
function fortDuoHeat(amount, kn){
  const D = fortS && fortS.duo; if(!D || !kn || kn._expT > 0) return;
  const was = D.heat;
  D.heat = Math.min(FORT_CFG.duo.heatMax + 20, D.heat + amount);
  if(inView(kn.x, kn.y, 60) && (!D._ft || D.t - D._ft > 700)){ D._ft = D.t; floatText(kn.x, kn.y - 130, D.heat >= FORT_CFG.duo.heatMax ? "¡INCANDESCENTE!" : "+CALOR", D.heat >= FORT_CFG.duo.heatMax ? "crit" : "warn"); }
  if(was < FORT_CFG.duo.heatMax && D.heat >= FORT_CFG.duo.heatMax){ showBanner("¡La armadura brilla al blanco! Vapor encima = SHOCK TÉRMICO"); playSfx("fortOverload"); }
}
// el Aliento del Dragón (barrido) también quema a su amo si está en el cono
function fortDuoBreathTick(e, B, cdx, cdy){
  if(!e.fortCompanion) return;
  const kn = fortDuoKnight(); if(!kn) return;
  const hx = kn.x - e.x, hy = kn.y - e.y, hd = Math.hypot(hx, hy);
  if(hd > B.r + kn.radius || (hd > 30 && (hx*cdx + hy*cdy)/hd < Math.cos(0.36))) return;
  if(B.t - (B.knT||-1e9) < 380) return;
  B.knT = B.t; fortDuoHeat(FORT_CFG.duo.heatBreath, kn);
}
function fortDuoStrike(s){
  if(!fortS || s.kind!=="fire") return;
  const kn = fortDuoKnight(); if(!kn) return;
  if(Math.hypot(kn.x - s.x, kn.y - s.y) <= s.r + kn.radius*0.7) fortDuoHeat(FORT_CFG.duo.heatBomb, kn);
}
function fortDuoCtxTargets(){ return fortS && fortS.duo && fortS.knight && fortS.knight.state==="fight" ? fortS.duo.valves : []; }
CTX_KINDS.fort_valve = {
  label:"ABRIR VÁLVULA", icon:"♨", color:"#cfe8ff", farOk:true, maxBots:1, decay:0.5, pointer:()=>false,
  canUse:(h, t)=>!!fortS && fortS.traps[t.ti] && fortS.traps[t.ti].st===FORT_TRAP_IDLE && h.alive,
  onComplete:(t)=>{ if(!fortS || fortS.traps[t.ti].st!==FORT_TRAP_IDLE) return; _fortTrapStart(t.ti); showBanner("¡VÁLVULA ABIERTA! Vapor en 2 segundos"); playSfx("fortSteam"); },
  // un bot abre la válvula solo cuando sirve: el Caballero está incandescente y cerca de esa rejilla
  botWorth:(h, t)=>{ const kn = fortDuoKnight(), D = fortS && fortS.duo; if(!kn || !D || D.heat < FORT_CFG.duo.heatMax) return 0; const T = FORT_MAP.traps[t.ti]; return Math.hypot(kn.x - T.x, kn.y - T.y) < 260 ? 14 : 0; }
};
