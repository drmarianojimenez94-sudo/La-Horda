"use strict";
/* ============================================================
   js/arenas/abismo/ab-data.js
   ARENA DEL ABISMO — datos: mapa de plataformas, balance y fichas de enemigos.
   Identidad: "EL TERRENO ES UN RECURSO". Ruinas suspendidas sobre el vacío: las plataformas se
   agrietan (STABLE -> CRACKED -> CRITICAL -> COLLAPSE), avisan antes de caer y el Abismo las
   reconstruye entre niveles. Caer no mata al guardia (queda colgado del borde y un compañero lo
   sube); a los enemigos SÍ se los puede tirar al vacío. Debajo vive El Que Mora Debajo.

   Lógica: ab-map.js (geometría, estados, caída/rescate, seguridad) · ab-enemies.js (6 enemigos)
           ab-bosses.js (Carcelero del Vacío + El Que Mora Debajo + presencia) · ab-render.js (dibujo)
           ab-arena.js (registro en ARENA_DEFS, atlas, sonidos, bots, red)
   Coordenadas: el pozo del centro (la boca de lo que vive debajo) está en (0,0). La geometría se
   define en un espacio "plano" (círculos) y se aplasta en Y por AB_ASP (vista oblicua del mapa).
   ============================================================ */
const AB_ASP = 0.78;                  // y_mundo = y_plano * AB_ASP
const AB_R = { pit:190, ringIn:205, ringOut:372, hub:860, hubR:150, entryR:172, spokeW:104, segW:118 };

// ---------------- plataformas ----------------
// tipo: hub (círculo), ring (sector del anillo interior), spoke (puente radial), seg (puente del anillo
// exterior). Índice k: 0=E, 1=SE, 2=S (entrada), 3=SO, 4=O, 5=NO, 6=N, 7=NE (ángulo k*45°, y hacia abajo).
const AB_PLATS = [];
(function buildPlats(){
  const R = AB_R, A = k => k*Math.PI/4;
  for(let k=0;k<8;k++){
    const a = A(k), r = k===2 ? R.entryR : R.hubR;
    AB_PLATS.push({id:"h"+k, kind:"hub", k, x:Math.cos(a)*R.hub, y:Math.sin(a)*R.hub, r, anchor:(k===2), portal:(k===1||k===3||k===5||k===7)});
  }
  for(let k=0;k<8;k++){
    const a = A(k), r0 = R.ringOut - 30, r1 = R.hub - (k===2 ? R.entryR : R.hubR) + 26, mid = (r0 + r1)/2;
    AB_PLATS.push({id:"s"+k, kind:"spoke", k, x:Math.cos(a)*mid, y:Math.sin(a)*mid, hw:(r1 - r0)/2, hh:R.spokeW/2, rot:a});
  }
  for(let k=0;k<8;k++){
    const a0 = A(k), a1 = A(k+1), x0 = Math.cos(a0)*R.hub, y0 = Math.sin(a0)*R.hub, x1 = Math.cos(a1)*R.hub, y1 = Math.sin(a1)*R.hub;
    const L = Math.hypot(x1-x0, y1-y0);
    AB_PLATS.push({id:"o"+k, kind:"seg", k, x:(x0+x1)/2, y:(y0+y1)/2, hw:L/2 - R.hubR + 30, hh:R.segW/2, rot:Math.atan2(y1-y0, x1-x0)});
  }
  for(let k=0;k<8;k++) AB_PLATS.push({id:"r"+k, kind:"ring", k, a0:A(k) - Math.PI/8, a1:A(k) + Math.PI/8, r0:R.ringIn, r1:R.ringOut});
  // vecinos (fijos: las formas no se mueven, cambia el estado)
  const by = id => AB_PLATS.findIndex(p=>p.id===id);
  for(const p of AB_PLATS) p.nb = [];
  const link = (a, b)=>{ const i = by(a), j = by(b); AB_PLATS[i].nb.push(j); AB_PLATS[j].nb.push(i); };
  for(let k=0;k<8;k++){ link("h"+k, "s"+k); link("s"+k, "r"+k); link("h"+k, "o"+k); link("o"+k, "h"+((k+1)%8)); link("r"+k, "r"+((k+1)%8)); }
  AB_PLATS.forEach((p, i)=>{ p.i = i; });
})();
const AB_ENTRY = AB_PLATS.findIndex(p=>p.id==="h2");
const AB_MAP = {
  start:{x:0, y:AB_R.hub*AB_ASP},
  navBounds:{x0:-1060, y0:-760, x1:1060, y1:900},
  bounds:{x0:-1150, y0:-850, x1:1150, y1:950}
};

// ---------------- estados de una plataforma ----------------
// hp 0..100: STABLE >= 67 · CRACKED >= 34 · CRITICAL >= 1. Llegar a 0 arma el DERRUMBE (aviso) y
// después queda GONE hasta que el Abismo la reconstruye (REBUILD) entre niveles.
const AB_ST = {STABLE:0, CRACKED:1, CRITICAL:2, FALLING:3, GONE:4, REBUILD:5};
const AB_ST_NAME = ["STABLE","CRACKED","CRITICAL","COLLAPSE","GONE","REBUILD"];

/* ---------------- balance centralizado ---------------- */
const AB_CFG = {
  plat:{ fallWarn:2200, rebuildMs:3200, critShakeAmp:2.2 },
  hang:{ ms:6500, humanMs:8500, rescueMs:900, rescueR:78, riseInvuln:900, fallDmgPct:0, soloClimbMs:3800 }, // soloClimb: nadie puede rescatar (regla de seguridad)
  kb:{ fallTol:9, heroFallTol:24, kbWindow:420 }, // tolerancia fuera del borde (enemigos / héroes) y ventana de "fue empujado"
  terrain:{ heroMult:1.0 },                  // daño estructural de habilidades con metadata terrain
  // eventos programados (temblores del Abismo): cada cuánto y cuánto daño estructural por nivel
  tremor:{ fromLevel:2, everyMs:[26000, 21000, 17000], dmg:[26, 34], n:[1, 2] },
  hint:{ everyMs:[16000, 26000] },           // presencia de lo que vive debajo (ojo, sombra, ruido)
  errante:{ strongCd:[3400, 4800], strongWind:520, strongR:70, strongMult:1.35, knock:52 },
  acechador:{ leapRange:[150, 330], warnMs:560, leapMs:380, leapCdMs:[4200, 6500], dmgMult:1.2, push:44, flankR:180 },
  heraldo:{ keepMin:260, keepMax:380, orbCd:[3200, 4400], orbSpeed:165, zoneR:92, zoneMs:2600, pull:78, zoneDps:0.0 },
  devorador:{ stepMs:1300, stepDmg:5, stompCd:[5200, 7000], stompWind:900, stompR:130, stompMult:1.2, stompStruct:22 },
  tejedor:{ keepMin:220, keepMax:330, weaveCd:[5200, 7600], weaveMs:900, lineMs:6500, lineLen:[240, 340], slow:0.4, slowMs:1200, pull:26, maxLines:2 },
  jinete:{ prepMs:1250, speed:920, len:760, hitW:46, knockHero:150, knockEnemy:190, cdMs:[6000, 8500], recoverMs:1100, dmgMult:1.25, enemyDmgPct:0.25 },
  carcelero:{ triggerAt:0.45, strikeCd:[2600, 3400], strikeWind:900, strikeLen:520, strikeW:40, strikeMult:1.2,
              sweepCd:[6500, 8200], sweepWind:1100, sweepR:260, sweepMult:1.0, sweepKnock:95,
              hookCd:[8500, 11000], hookWind:950, hookLen:560, hookMs:1600, hookDrag:175, hookBreakPct:0.035,
              slamCd:[7000, 9000], slamWind:1000, slamR:140, slamStruct:40 },
  morador:{ p2At:0.66, p3At:0.33, revealMs:7000, minGround:0.66, rebuildEvery:10000,
            slamCd:[5200, 4400, 3600], slamWind:1400, slamR:120, slamStruct:22, slamMult:1.1,
            tentHp:0.05, tentMax:[2, 3, 4], tentCd:[9000, 8000, 7000],
            rayCd:[9000, 7500, 6200], rayWind:1300, rayLen:900, rayW:52, rayMult:0.9,
            pullCd:[0, 11000, 9000], pullR:170, pullMs:3200, pull:90,
            shardCd:[0, 9000, 7500], shardN:[0, 6, 9], shardR:70, shardDelay:1200, shardMult:0.7,
            patCd:[0, 20000, 17000], patWarn:2600, rebuildAfter:9000,
            jawCd:[0, 0, 12000], jawWind:1600, jawR:360, jawPull:120, jawMult:1.35,
            waveCd:[0, 0, 10000], waveMult:0.8,
            deathMs:9000 }
};

// ---------------- fichas de enemigo (se suman a ENEMY_BASE) ----------------
// Escala: guardia 1.0 (~65 u de alto). hMul = alto dibujado / radio (ab-arena.js).
Object.assign(ENEMY_BASE, {
  ab_errante:  {name:"Errante del Vacío",      rank:"normal",   hp:40,  dmg:10, speed:76,  radius:22, xp:8,  gold:2,  scale:3.4, color:"#8a4a6a", ranged:false},
  ab_acechador:{name:"Acechador del Borde",    rank:"subelite", hp:34,  dmg:11, speed:148, radius:20, xp:11, gold:4,  scale:3.0, color:"#7a4ad0", ranged:false},
  ab_heraldo:  {name:"Heraldo del Ojo",        rank:"subelite", hp:42,  dmg:9,  speed:60,  radius:22, xp:12, gold:4,  scale:3.4, color:"#b050ff", ranged:true, range:380, projSpeed:165},
  ab_devorador:{name:"Devorador de Piedra",    rank:"elite",    hp:300, dmg:18, speed:36,  radius:38, xp:32, gold:13, scale:5.0, color:"#8a6a5a", ranged:false, dropsItem:true},
  ab_tejedor:  {name:"Tejedor del Vacío",      rank:"subelite", hp:48,  dmg:8,  speed:70,  radius:24, xp:13, gold:5,  scale:3.4, color:"#c060e0", ranged:false},
  ab_jinete:   {name:"Jinete Sin Cabeza",      rank:"elite",    hp:260, dmg:20, speed:92,  radius:34, xp:34, gold:14, scale:4.8, color:"#6040a0", ranged:false, dropsItem:true},
  ab_carcelero:{name:"El Carcelero del Vacío", rank:"subjefe",  hp:1650,dmg:26, speed:48,  radius:62, xp:110,gold:44, scale:8.0, color:"#7a2a4a", ranged:false, dropsItem:true},
  ab_morador:  {name:"El Que Mora Debajo",     rank:"jefe",     hp:5400,dmg:34, speed:0,   radius:180,xp:420,gold:200,scale:9.0, color:"#a030ff", ranged:false, dropsItem:true},
  ab_tentaculo:{name:"Tentáculo del Abismo",   rank:"subelite", hp:160, dmg:0,  speed:0,   radius:30, xp:6,  gold:1,  scale:3.0, color:"#8a3ad0", ranged:false, structure:true, noDivina:true}
});
