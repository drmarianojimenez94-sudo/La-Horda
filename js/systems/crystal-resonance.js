"use strict";
/* ============================================================
   js/systems/crystal-resonance.js
   RESONANCIA DE LOS CRISTALES (canon: docs/lore/LA_HORDA_LORE_BIBLE.md §7, "los cristales siguen
   necesitando portadores"). Un cristal libre no es un trofeo: es un pedazo del sello de un Guardián,
   y resuena con quien lo lleva. Antes de cada partida elegís UNO de los cristales que juntaste (la
   fila de la pantalla previa); tu guardián entra a la arena con el don de ese Guardián:
     - Ancestral  (el Guardián Élfico):  Raíz viva — te regenerás si pasás un rato sin recibir daño, y
                  al caer bajo el 35% las raíces inmovilizan a los que te rodean (1 vez cada 25 s).
     - Escarcha   (el Mago Gélido):      Aura gélida — los enemigos cerca tuyo se mueven más lento y
                  reciben un poco más de daño tuyo mientras estén frenados.
     - Piedra     (el Guardián del Laberinto): Piel de piedra — cada 18 s, un escudo del 15% de tu vida.
     - Juicio     (el cuarto, el del Hechicero): recién después del final. +12% de daño a jefes y subjefes.
   En el final, cuando el Hechicero te arranca los cristales (inf-hechicero.js), la resonancia se
   apaga en el acto: la pelea contra él se da sin el don (salvo el Juicio, que ya es tuyo).
   Autoridad: la simulación de siempre (un jugador o el anfitrión). Cada invitado manda su cristal en
   el loadout (netBuildLoadout → L.crystal); los bots no llevan cristal. Sin cristales: no hace nada.
   ============================================================ */
const RESONANCE_DEFS = {
  ancestral:{name:"Raíz viva",      short:"Te regenerás fuera de combate · raíces al estar en peligro"},
  escarcha: {name:"Aura gélida",    short:"Frena a los enemigos cercanos · +6% de daño a los frenados"},
  piedra:   {name:"Piel de piedra", short:"Escudo del 15% de tu vida cada 18 s"},
  juicio:   {name:"Juicio",         short:"+12% de daño a jefes y subjefes"}
};
const RES_CFG = {
  anc:{calmMs:4000, regenPct:0.012, lowPct:0.35, rootR:170, rootMs:1200, rootCd:25000},
  esc:{r:150, slow:0.15, slowBoss:0.08, tickMs:500, dmg:1.06},
  pie:{everyMs:18000, pct:0.15, holdMs:8000},
  jui:{dmg:1.12}
};
const RESO = {run:null, stolen:false};
// Solo tocan a los enemigos "de a pie": nunca a partes de jefes (brazos del Leviatán = apéndices),
// estructuras, trampas ni invocaciones, que tienen reglas propias de encuentro (boss_rules.js).
const RES_FOE_RANK = {normal:1, subelite:1, elite:1};

function resonanceJuicioOpen(){ return !!(save.arenasCleared && save.arenasCleared.infernal); }
function resonanceAvailable(){ const l = crystalsOwned().slice(); if(resonanceJuicioOpen()) l.push("juicio"); return l; }
// El cristal que lleva el jugador: el elegido si todavía lo tiene; si no, el último que consiguió.
function resonanceChosen(){
  const av = resonanceAvailable(); if(!av.length) return null;
  const k = save.crystalWorn;
  if(k === "none") return null;
  return av.includes(k) ? k : av[av.length - 1];
}
function resonanceSetWorn(k){
  save.crystalWorn = k;
  try{ persist(); }catch(err){}
}
function resonanceColor(k){ return k === "juicio" ? CRYSTAL_JUICIO : CRYSTAL_DEFS[k]; }
function resonanceCrystalName(k){ return k === "juicio" ? CRYSTAL_JUICIO.name : (CRYSTAL_DEFS[k] ? CRYSTAL_DEFS[k].name : ""); }

function resonanceKeyFor(h){
  if(RESO.stolen) return null; // el Hechicero se los llevó
  if(h === player && !h.isRemote) return resonanceChosen();
  if(h.isRemote && netMatch && netMatch.loadouts){
    const L = netMatch.loadouts[h._netSlot], k = L && L.crystal;
    return RESONANCE_DEFS[k] ? k : null;
  }
  return null; // bots: sin cristal
}
// Se asigna una vez por partida (runStats es nuevo en cada startRun) y en el primer tick, cuando el
// anfitrión ya marcó a los invitados (_netSlot/isRemote se ponen después de startRun).
function resonanceAssign(){
  RESO.run = runStats; RESO.stolen = false;
  for(const h of heroes){ const k = resonanceKeyFor(h); h._res = k ? {k, calm:0, cd:0, t:0, sh:RES_CFG.pie.everyMs - 3000} : null; }
}
function resonanceSteal(){
  RESO.stolen = true;
  for(const h of heroes){
    if(!h._res || h._res.k === "juicio") continue;
    h._res = null;
    if(h === player && typeof floatText==="function") floatText(h.x, h.y - 64, "LA RESONANCIA SE APAGA", "crit");
  }
}

function resonanceTick(dt){
  if(!heroes || !heroes.length || typeof runStats==="undefined") return;
  if(RESO.run !== runStats) resonanceAssign();
  // un invitado puede cambiar de cristal en su pantalla previa: su loadout llega unos segundos tarde
  if(netMatch && !RESO.stolen && (RESO.chk = (RESO.chk||0) + dt) >= 1000){
    RESO.chk = 0;
    for(const h of heroes){ if(!h.isRemote) continue; const k = resonanceKeyFor(h); if(k !== (h._res && h._res.k)) h._res = k ? {k, calm:0, cd:0, t:0, sh:RES_CFG.pie.everyMs - 3000} : null; }
  }
  for(const h of heroes){
    const R = h._res; if(!R || !h.alive || h.downed) continue;
    R.t += dt; R.calm += dt; if(R.cd > 0) R.cd -= dt;
    if(R.k === "ancestral"){
      if(R.calm >= RES_CFG.anc.calmMs && h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + h.maxHp*RES_CFG.anc.regenPct*dt/1000);
    } else if(R.k === "escarcha"){
      R.tick = (R.tick||0) + dt; if(R.tick < RES_CFG.esc.tickMs) continue; R.tick = 0;
      const r2 = RES_CFG.esc.r*RES_CFG.esc.r;
      for(const e of enemies){
        if(!e.alive || e.hp <= 0 || e.cineT > 0) continue;
        const big = e.rank === "jefe" || e.rank === "subjefe"; if(!big && (!RES_FOE_RANK[e.rank] || e.structure || ENEMY_BASE[e.type] && ENEMY_BASE[e.type].structure)) continue;
        const dx = e.x - h.x, dy = e.y - h.y; if(dx*dx + dy*dy > r2) continue;
        e.slowAmt = Math.max(e.slowAmt||0, big ? RES_CFG.esc.slowBoss : RES_CFG.esc.slow);
        e.slowTimer = Math.max(e.slowTimer||0, RES_CFG.esc.tickMs + 250);
      }
    } else if(R.k === "piedra"){
      R.sh += dt;
      if(R.sh >= RES_CFG.pie.everyMs){
        R.sh = 0;
        const amt = h.maxHp*RES_CFG.pie.pct;
        if((h.shield||0) < amt){
          h.shield = amt; h.shieldTimer = Math.max(h.shieldTimer||0, RES_CFG.pie.holdMs);
          const D = CRYSTAL_DEFS.piedra;
          if(typeof vfxShock==="function") vfxShock(h.x, h.y - 14, 12, 46, D.rgb, 380, h === player ? 2 : 1);
        }
      }
    }
  }
}
// Lo llama damageHero después de restar la vida (ya descontados escudos).
function resonanceOnHurt(h, dmg){
  const R = h._res; if(!R || dmg <= 0) return;
  R.calm = 0;
  if(R.k !== "ancestral" || R.cd > 0 || !h.alive || h.hp <= 0 || h.hp > h.maxHp*RES_CFG.anc.lowPct) return;
  R.cd = RES_CFG.anc.rootCd;
  const r2 = RES_CFG.anc.rootR*RES_CFG.anc.rootR; let n = 0;
  for(const e of enemies){
    if(!e.alive || e.hp <= 0 || e.cineT > 0 || !RES_FOE_RANK[e.rank] || e.structure || (ENEMY_BASE[e.type] && ENEMY_BASE[e.type].structure)) continue;
    const dx = e.x - h.x, dy = e.y - h.y; if(dx*dx + dy*dy > r2) continue;
    e.stunTimer = Math.max(e.stunTimer||0, RES_CFG.anc.rootMs); n++;
  }
  const D = CRYSTAL_DEFS.ancestral;
  if(typeof vfxShock==="function") vfxShock(h.x, h.y, 16, RES_CFG.anc.rootR, D.rgb, 520, h === player ? 3 : 1);
  if(typeof vfxBurst==="function") vfxBurst(h.x, h.y - 10, 14, "cr_ancestral", 90, 700, 2, 2, -40);
  if(h === player && typeof floatText==="function") floatText(h.x, h.y - 64, n ? "¡RAÍCES!" : "RAÍZ VIVA", "heal");
}
// Multiplicador de daño que el portador le hace a un enemigo (damageEnemy).
function resonanceDmgMult(src, e){
  const R = src && src._res; if(!R) return 1;
  if(R.k === "juicio") return (e.rank === "jefe" || e.rank === "subjefe") ? RES_CFG.jui.dmg : 1;
  if(R.k === "escarcha") return (e.slowTimer > 0 || e.frozenTimer > 0) ? RES_CFG.esc.dmg : 1;
  return 1;
}

/* ---------------- dibujo: la gema que acompaña al portador ---------------- */
function resonanceDraw(){
  if(!heroes || !heroes.length) return;
  const now = animNow/1000;
  for(const h of heroes){
    if(!h.alive) continue;
    // la resonancia (h._res) viaja en el snapshot de cada héroe: el invitado ve las gemas de TODOS los
    // portadores, igual que el anfitrión (antes solo la propia, sacada de su guardado, y le seguía
    // brillando después de que el Hechicero se los arranca)
    const k = h._res && h._res.k;
    if(!k || !inView(h.x, h.y, 80)) continue;
    const D = resonanceColor(k), a = now*1.7 + (h._netSlot||0);
    const x = h.x + Math.cos(a)*22, y = h.y - 58 + Math.sin(a*2)*3;
    ctx.save();
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.55; ctx.drawImage(glowSprite(D.rgb), x - 14, y - 14, 28, 28);
    ctx.globalCompositeOperation = "source-over";
    crystalDrawGem(ctx, x, y, 6, D, now*2.5, 0.95);
    ctx.restore();
  }
}

/* ---------------- UI: elegir el cristal en la pantalla previa ---------------- */
function resonancePickerHtml(){
  const av = resonanceAvailable(); if(!av.length) return "";
  const cur = resonanceChosen();
  const btn = k=>{ const D = resonanceColor(k), on = k === cur;
    return `<button type="button" class="res-pick${on ? " on" : ""}" data-res="${k}" style="--c:${D.mid};--l:${D.light}"><span class="cr-gem on"></span>${k.charAt(0).toUpperCase() + k.slice(1)}</button>`; };
  const none = `<button type="button" class="res-pick${cur ? "" : " on"}" data-res="none">Ninguno</button>`;
  const desc = cur ? `<b>${RESONANCE_DEFS[cur].name}:</b> ${RESONANCE_DEFS[cur].short}` : "Entrás sin resonancia.";
  return `<div class="res-row"><b class="ri-k cr">◆ Llevás</b><span class="res-picks">${av.map(btn).join("")}${none}</span></div><div class="res-desc">${desc}</div>`;
}
function resonanceBindPicker(root){
  if(!root) return;
  root.querySelectorAll(".res-pick").forEach(b=>{
    b.addEventListener("click", ev=>{
      ev.stopPropagation(); // la pantalla previa arranca con un toque en cualquier lado
      resonanceSetWorn(b.dataset.res);
      const wrap = root.querySelector(".res-wrap"); if(wrap){ wrap.innerHTML = resonancePickerHtml(); resonanceBindPicker(root); }
      if(typeof playSfx==="function") playSfx("ready");
      if(net && net.role === "guest" && typeof netSendLoadout==="function") try{ netSendLoadout(); }catch(err){}
    });
  });
}
