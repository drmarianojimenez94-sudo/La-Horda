"use strict";
/* ============================================================
   js/arenas/infernal/inf-boss.js
   BOSS IDENTITY — EL HECHICERO SUPREMO (4º Guardián) → REY DE LA HORDA. El final de la campaña.
   Encima de las 3 formas que ya existían (inf-hechicero.js) cada forma tiene una REGLA:
   1) ÁNGEL CORROMPIDO — CONVERGENCIA: cada tanto canaliza el ritual para fundir los Cuatro cristales.
      Aparecen 4 FOCOS DE CONVERGENCIA (uno por cristal: Ancestral, Escarcha, Piedra y el suyo) unidos
      a él por haces. Mientras vivan: escudo. Romperlos todos INTERRUMPE el ritual → EXPUESTO. Si el
      ritual termina, la INESTABILIDAD sube (pega más fuerte) y descarga el Juicio de los Cuatro
      (marcado, esquivable). La inestabilidad también crece sola con el tiempo.
   2) GOLEM DE CUERPOS — EL EXAMEN: versiones corrompidas y simples de lo que ya aprendiste:
        · Ciudad: "EL GRAN NÚMERO" — canaliza; hacele daño suficiente para interrumpirlo.
        · Laberinto: "LA EMBESTIDA" — embiste al más lejano: hacelo chocar contra el borde.
        · Micelio/Gélida: "LA RED" — tres focos lo protegen: rompelos antes de que estallen.
   3) REY DE LA HORDA — CONVERGENCIA DE LA HORDA: se abren 3 FISURAS, cada una le da un poder
      (HORDA: invoca demonios · VIDA: se regenera · PIEL: blindaje). Cerrar una (acción contextual,
      bots incluidos) le QUITA ese poder. Las tres cerradas: el NÚCLEO DE LA HORDA queda EXPUESTO.
      Después la Horda vuelve a abrirlas.
   ANTI-KITE (todas las formas): lejos de él, el infierno sube bajo tus pies (golpes marcados).
   Muerte épica y Arena Divina: ya las resuelven inf-hechicero.js / run.js (isDivinaUnlocked).
   Anfitrión; lo necesario para dibujar viaja con los enemigos (e.cvEl) y en infNetState (hc).
   ============================================================ */
const INF_BOSS = {
  cv:{ first:10000, cd:[24000, 28000], ms:9000, r:430, shield:[0.5, 0.62, 0.75, 0.88], hpPct:0.03, exposeMs:6000, exposeMult:1.7, instMax:5, instEvery:45000, instDmg:0.08 },
  ex:{ first:6000, cd:[15000, 18000], numMs:4000, numBreak:0.06, netMs:10000, exposeMs:4500, exposeMult:1.6 },
  fi:{ openAt:2500, reopenMs:16000, summonEvery:12000, summonCap:8, regen:0.0035, skin:0.65, exposeMs:7000, exposeMult:1.8 },
  kiteR:680, kiteMs:4000
};
const INF_CV_EL = [
  {k:"ancestral", name:"Ancestral", rgb:"120,230,110"}, {k:"escarcha", name:"Escarcha", rgb:"150,215,255"},
  {k:"piedra", name:"Piedra", rgb:"230,180,110"}, {k:"hechicero", name:"Hechicero", rgb:"255,215,120"}
];
const INF_CAPS = {horda:{name:"HORDA", txt:"invoca demonios", rgb:"255,90,60"}, vida:{name:"VIDA", txt:"se regenera", rgb:"120,255,140"}, piel:{name:"PIEL", txt:"blindaje", rgb:"200,160,255"}};
Object.assign(ENEMY_BASE, {
  foco_convergencia: {name:"Foco de Convergencia", rank:"subelite", hp:80, dmg:0, speed:0, radius:26, xp:6, gold:2, scale:2.2, color:"#ffd27a", ranged:false, structure:true, noDivina:true}
});
let infB = null;   // estado de la regla (anfitrión)
function infBossNow(){
  if(currentArena!=="infernal" || divinaMode || !bossActive) return null;
  return enemies.find(e=>e.alive && (e.type==="angel_corrompido" || e.type==="golem_cuerpos" || (e.type==="demonio_mayor" && e.designKey==="demonio_final"))) || null;
}
function infFoci(){ return enemies.filter(e=>e.alive && e.type==="foco_convergencia"); }
function infKillFoci(){ for(const f of enemies) if(f.alive && f.type==="foco_convergencia"){ f.alive = false; f.hp = 0; vfxBurst(f.x, f.y - 30, 10, "holy", 120, 500, 3, 1, -40, 0); } }
function infSpawnFoci(e, els, rgbOverride){
  const out = [], a0 = Math.random()*Math.PI*2;
  els.forEach((el, i)=>{
    const a = a0 + i/els.length*Math.PI*2, p = {x:e.x + Math.cos(a)*INF_BOSS.cv.r, y:e.y + Math.sin(a)*INF_BOSS.cv.r*0.8, radius:30}; clampToArena(p);
    const f = spawnEnemy("foco_convergencia", false, false);
    f.x = f._ax = p.x; f.y = f._ay = p.y; f.encStatic = true; f.structure = true; f.speed = 0;
    f.maxHp = f.hp = Math.max(50, Math.round(e.maxHp*INF_BOSS.cv.hpPct)); f.cvEl = el.k; f.cvRgb = rgbOverride || el.rgb;
    vfxTelegraph({shape:0, r:70, x:p.x, y:p.y, dur:600, rgb:f.cvRgb});
    out.push(f);
  });
  return out;
}
function infBossReset(){
  infKillFoci();
  if(infB && infB.fis) for(const f of INF.fis) if(f.hordaCap && !f.done){ f.done = true; f.doneT = 4000; }
  infB = null;
}
// Se llama desde la actualización de la Arena Infernal (anfitrión).
function infBossRule(dt){
  const e = infBossNow();
  if(!e){ if(infB && !bossActive) infBossReset(); return; }
  if(e.cineT > 0) return;
  const S = infB || (infB = {form:"", t:0});
  const form = e.type;
  if(S.form !== form){ infKillFoci(); S.form = form; S.t = 0; S.cv = null; S.ex = null; S.fis = null; S.inst = S.inst||0; S.instT = 0; S.base = e.dmg; }
  S.t += dt;
  if(form==="angel_corrompido") infConvergencia(e, S, dt);
  else if(form==="golem_cuerpos") infExamen(e, S, dt);
  else infFisurasHorda(e, S, dt);
  // ANTI-KITE: el infierno sube bajo los que se alejan
  if(bossHeroesFarMs(e, INF_BOSS.kiteR, dt) > INF_BOSS.kiteMs){
    e._kiteMs = 0;
    for(const h of heroes){ if(h.alive && Math.hypot(h.x - e.x, h.y - e.y) >= INF_BOSS.kiteR) bossStrike(h.x, h.y, 110, 1200, e.dmg*0.85, "fire", {burn:e.dmg*0.06}); }
    showBanner("El infierno sube bajo tus pies: no hay distancia segura");
    playSfx("infRumble");
  }
}
/* ---------- 1) CONVERGENCIA ---------- */
function infConvergencia(e, S, dt){
  const C = INF_BOSS.cv;
  // la inestabilidad crece sola con el tiempo
  S.instT += dt;
  if(S.instT >= C.instEvery){ S.instT = 0; infInstability(e, S, 1); }
  if(!S.cv) S.cv = {st:"idle", t:0, cd:C.first};
  const V = S.cv; V.t += dt;
  if(V.st==="idle"){
    e._encMult = 1; e._encTag = e._expT > 0 ? null : `INESTABILIDAD ${S.inst}/${C.instMax}`;
    if(!(e._expT > 0)) V.cd -= dt;
    if(V.cd <= 0 && !e.bossWind){
      V.st = "ritual"; V.t = 0; V._spd = e.speed; e.speed = 0;
      infSpawnFoci(e, INF_CV_EL);
      bossAnnounce(e, "CONVERGENCIA", "rompé los 4 FOCOS antes de que funda los cristales");
      showBanner("✦ CONVERGENCIA ✦ ¡Rompé los cuatro focos de cristal!");
      if(typeof tutSay==="function" && !tutSeen("inf_cv")) tutSay("inf_cv", "Está fundiendo los cuatro cristales en uno. Cada FOCO es un cristal: rompelos todos y el ritual se corta. Si termina, se vuelve más inestable… y más fuerte.", null, 10000, true);
      playSfx("bossRoar"); vfxShake(6); flashScreen(0.2, "255,220,150");
    }
    return;
  }
  const foci = infFoci(), n = foci.length;
  e._encMult = C.shield[Math.max(0, 4 - Math.max(1, n))] || C.shield[0];
  e._encTag = `CONVERGENCIA · ${n} FOCO${n===1 ? "" : "S"}`;
  if(!n){
    V.st = "idle"; V.t = 0; V.cd = C.cd[0] + Math.random()*(C.cd[1] - C.cd[0]); e.speed = V._spd || e.speed; e._encMult = 1;
    infInstability(e, S, -1);
    bossExpose(e, C.exposeMs, C.exposeMult, "✦ ¡RITUAL INTERRUMPIDO! El Hechicero queda EXPUESTO");
    return;
  }
  if(V.t >= C.ms){
    infKillFoci();
    V.st = "idle"; V.t = 0; V.cd = C.cd[0] + Math.random()*(C.cd[1] - C.cd[0]); e.speed = V._spd || e.speed; e._encMult = 1;
    infInstability(e, S, 1);
    showBanner("✦ LA CONVERGENCIA AVANZA ✦ El Hechicero se vuelve más inestable");
    const tg = heroTargets(2);
    for(const h of tg) if(BOSS_ATTACKS.acCuatro) BOSS_ATTACKS.acCuatro(e, h, Math.hypot(h.x - e.x, h.y - e.y));
    flashScreen(0.3, "255,200,120"); vfxShake(8);
  }
}
function infInstability(e, S, d){
  const C = INF_BOSS.cv;
  S.inst = Math.max(0, Math.min(C.instMax, (S.inst||0) + d));
  e.dmg = Math.round((S.base || e.dmg)*(1 + C.instDmg*S.inst));
  if(d > 0) floatText(e.x, e.y - e.radius*2.6, `INESTABILIDAD ${S.inst}`, "crit");
}
/* ---------- 2) EL EXAMEN ---------- */
function infExamen(e, S, dt){
  const C = INF_BOSS.ex;
  if(!S.ex) S.ex = {st:"idle", t:0, cd:C.first, k:-1};
  const X = S.ex; X.t += dt;
  if(X.st==="idle"){
    e._encMult = 1; e._encTag = e._expT > 0 ? null : "EL EXAMEN";
    if(!(e._expT > 0)) X.cd -= dt;
    if(X.cd <= 0 && !e.bossWind && !e.bossCharge){
      X.k = (X.k + 1) % 3; X.st = ["numero", "embestida", "red"][X.k]; X.t = 0; X.hp0 = e.hp;
      if(typeof tutSay==="function" && !tutSeen("inf_exam")) tutSay("inf_exam", "EL EXAMEN: el Golem usa versiones corrompidas de lo que ya venciste. Resolvelas igual que antes.", null, 9000, true);
      if(X.st==="numero"){
        X._spd = e.speed; e.speed = 0;
        vfxTelegraph({shape:0, r:e.radius*2.2, x:e.x, y:e.y, follow:e, dur:C.numMs, rgb:"255,210,120"});
        showBanner("EXAMEN · LA CIUDAD — «EL GRAN NÚMERO»: ¡interrumpilo con daño!");
        playSfx("cmApplause");
      } else if(X.st==="embestida"){
        const h = bossFarthestHero(e.x, e.y) || player, d = Math.hypot(h.x - e.x, h.y - e.y)||1;
        e.fx = (h.x - e.x)/d; e.fy = (h.y - e.y)/d; e.minoCharge = true;
        skCharge(e, d + 300, 1600, 760, 1.4, {knock:110, stun:400}, "255,120,80", "LA EMBESTIDA");
        showBanner("EXAMEN · EL LABERINTO — «LA EMBESTIDA»: ¡hacelo chocar contra el borde!");
      } else {
        infSpawnFoci(e, [INF_CV_EL[0], INF_CV_EL[1], INF_CV_EL[3]], "220,120,255");
        showBanner("EXAMEN · LA RED — tres focos lo protegen: ¡rompelos antes de que estallen!");
      }
    }
    return;
  }
  const done = (ms)=>{ X.st = "idle"; X.t = 0; X.cd = ms || (C.cd[0] + Math.random()*(C.cd[1] - C.cd[0])); if(X._spd){ e.speed = X._spd; X._spd = 0; } e._encMult = 1; };
  if(X.st==="numero"){
    e._encTag = `«EL GRAN NÚMERO» · ${Math.round(Math.max(0, (X.hp0 - e.hp)/e.maxHp)/C.numBreak*100)}%`;
    if(X.hp0 - e.hp >= e.maxHp*C.numBreak){ done(); bossExpose(e, C.exposeMs, C.exposeMult, "¡NÚMERO INTERRUMPIDO! El Golem queda EXPUESTO"); return; }
    if(X.t >= C.numMs){
      done();
      for(const h of heroes){ if(h.alive) bossStrike(h.x, h.y, 120, 1000, e.dmg*1.1, "fire", {knock:60}); }
      showBanner("«¡Y AHORA… EL GRAN FINAL!»"); playSfx("cmBlast");
    }
  } else if(X.st==="embestida"){
    e._encTag = "«LA EMBESTIDA»";
    if(e.crashVuln && e.stunTimer > 0 && !X.hit){ X.hit = 1; bossExpose(e, C.exposeMs, C.exposeMult, "¡SE ESTRELLÓ! El Golem queda EXPUESTO"); }
    if(X.t > 2600 && !e.bossCharge && !e.bossWind){ X.hit = 0; e.minoCharge = false; done(); }
  } else {
    const n = infFoci().length;
    e._encMult = n ? 0.5 : 1; e._encTag = n ? `LA RED · ${n} FOCO${n===1 ? "" : "S"} (−50%)` : null;
    if(!n){ done(); bossExpose(e, C.exposeMs, C.exposeMult, "¡RED ROTA! El Golem queda EXPUESTO"); return; }
    if(X.t >= C.netMs){
      for(const f of infFoci()){ const h = bossNearestHero(f.x, f.y); if(h) bossStrike(h.x, h.y, 110, 900, e.dmg*0.7, "holy", {slow:0.3}); }
      infKillFoci(); done();
      showBanner("Los focos estallan");
    }
  }
}
/* ---------- 3) CONVERGENCIA DE LA HORDA ---------- */
function infFisurasHorda(e, S, dt){
  const C = INF_BOSS.fi;
  if(!S.fis) S.fis = {st:"wait", t:0, list:[], sum:C.summonEvery};
  const F = S.fis; F.t += dt;
  const open = ()=>F.list.filter(f=>!f.done);
  if(F.st==="wait" && F.t >= C.openAt){
    F.st = "open"; F.t = 0; F.list = [];
    const caps = ["horda", "vida", "piel"];
    for(const cap of caps){
      let f = null;
      for(let k=0;k<30 && !f;k++){
        const a = Math.random()*Math.PI*2, d = 320 + Math.random()*260, x = e.x + Math.cos(a)*d, y = e.y + Math.sin(a)*d*0.8;
        if(!aidInside(x, y, 110) || INF.fis.some(o=>!o.done && Math.hypot(o.x - x, o.y - y) < 240) || heroes.some(h=>h.alive && Math.hypot(h.x - x, h.y - y) < 140)) continue;
        f = infMakeFissure(x, y);
      }
      if(!f){ const p = {x:e.x + (caps.indexOf(cap) - 1)*300, y:e.y + 260}; clampToArena(p); f = infMakeFissure(p.x, p.y); }
      f.stage = 2; infSyncStage(f); f.growT = 1e12; f.eruptT = 1e12; f.hordaCap = cap; f.warn = 900;
      vfxTelegraph({shape:0, r:INF_CFG.radius[2], x:f.x, y:f.y, follow:null, dur:900, rgb:INF_CAPS[cap].rgb});
      F.list.push(f);
    }
    showBanner("🜂 CONVERGENCIA DE LA HORDA: 3 FISURAS le dan poder — ¡CERRALAS!");
    if(typeof tutSay==="function" && !tutSeen("inf_fis")) tutSay("inf_fis", "Cada FISURA le da un poder: HORDA (invoca), VIDA (se cura) y PIEL (blindaje). Cerrá una y pierde ese poder. Las tres cerradas: su NÚCLEO queda expuesto.", null, 11000, true);
    playSfx("infCrack"); vfxShake(8);
  }
  if(F.st==="wait"){ e._encMult = 1; e._encTag = null; return; }
  if(F.st==="core"){
    e._encMult = 1; e._encTag = "¡NÚCLEO DE LA HORDA EXPUESTO!";
    if(!(e._expT > 0)){ F.st = "reopen"; F.t = 0; showBanner("La Horda vuelve a abrir el suelo…"); }
    return;
  }
  if(F.st==="reopen"){
    e._encMult = 1; e._encTag = "LA HORDA SE REAGRUPA";
    if(F.t >= C.reopenMs){ F.st = "wait"; F.t = C.openAt; }
    return;
  }
  // abiertas: cada una da un poder
  const o = open(), has = k=>o.some(f=>f.hordaCap===k && f.warn <= 0);
  e._encMult = has("piel") ? C.skin : 1;
  e._encTag = o.length ? "FISURAS: " + o.map(f=>INF_CAPS[f.hordaCap].name).join(" · ") : null;
  if(has("vida") && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp*C.regen*dt/1000);
  if(has("horda")){
    F.sum -= dt;
    if(F.sum <= 0){
      F.sum = C.summonEvery;
      const f = o.find(q=>q.hordaCap==="horda");
      if(f && enemies.filter(q=>q.alive && q.type==="demonio_menor").length < C.summonCap){
        for(let i=0;i<2;i++){ const d = spawnEnemy("demonio_menor", false, false); d.x = f.x + (i ? 40 : -40); d.y = f.y + 20; clampToArena(d); d.xp = Math.round(d.xp*0.5); }
        vfxBurst(f.x, f.y, 16, "ember", 160, 600, 3, 1, -60, 0); playSfx("infRumble");
      }
    }
  }
  if(!o.length){
    F.st = "core"; F.t = 0;
    bossExpose(e, C.exposeMs, C.exposeMult, "🜂 ¡LAS TRES FISURAS CERRADAS! El NÚCLEO DE LA HORDA queda EXPUESTO");
    flashScreen(0.35, "255,160,90");
  }
}
// bots: focos primero; con el Rey, cerrar fisuras de la Horda aunque el jefe esté cerca
function infBossBotTarget(h, range){
  if(!infBossNow()) return null;
  let best = null, bs = -Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    const d = Math.hypot(e.x - h.x, e.y - h.y); if(d > range + 350) continue;
    let s = -Infinity;
    if(e.type==="foco_convergencia") s = 640 - d*0.3;
    else if(e.rank==="jefe" && e._expT > 0) s = 720 - d*0.1;
    if(s > bs){ bs = s; best = e; }
  }
  return best;
}
{
  const bw = CTX_KINDS.inf_fissure.botWorth;
  CTX_KINDS.inf_fissure.botWorth = (h, f)=>{
    if(f.hordaCap){ if(h.hp < h.maxHp*0.35) return 0; return 5 + (f.prog > 0 ? 3 : 0); }
    return bw(h, f);
  };
}
// dibujo: aguja de cristal con el color de su Guardián + haz hacia el jefe
function infBossDrawBody(e){
  if(e.type!=="foco_convergencia") return false;
  const P = VFX_SPR_EXTRA.bsAngelPillar, K = VFX_SPR_EXTRA.bsMagoCrystal, t = animNow/1000, rgb = e.cvRgb || "255,215,120";
  const g = ctx.createRadialGradient(e.x, e.y - 50, 0, e.x, e.y - 50, 90);
  g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(e.x - 90, e.y - 140, 180, 180);
  const base = P && P.imgs[1], top = K && K.imgs[Math.floor(t*6) % K.imgs.length];
  if(base && base.complete && base.naturalWidth){ const h = 112, w = base.width*h/base.height; ctx.save(); ctx.filter = e.cvEl==="ancestral" ? "hue-rotate(-100deg)" : e.cvEl==="piedra" ? "hue-rotate(160deg) saturate(0.7)" : e.cvEl==="hechicero" ? "hue-rotate(185deg) brightness(1.2)" : (e.cvRgb==="220,120,255" ? "hue-rotate(60deg)" : "none"); ctx.drawImage(base, e.x - w/2, e.y - h*0.95, w, h); ctx.restore(); }
  if(top && top.complete && top.naturalWidth){ const h = 46, w = top.width*h/top.height; ctx.drawImage(top, e.x - w/2, e.y - 150 + Math.sin(t*3 + e.y)*6 - h/2, w, h); }
  return true;
}
function infBossDrawTop(){
  const b = enemies.find(o=>o.alive && o.rank==="jefe"), t = animNow/1000;
  if(b) for(const f of enemies){
    if(!f.alive || f.type!=="foco_convergencia") continue;
    const rgb = f.cvRgb || "255,215,120";
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(${rgb},0.3)`; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(f.x, f.y - 150); ctx.lineTo(b.x, b.y - 60); ctx.stroke();
    ctx.strokeStyle = `rgba(255,250,235,${0.55 + 0.3*Math.sin(t*10 + f.x)})`; ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.lineDashOffset = t*80; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  // etiqueta del poder de cada fisura de la Horda
  for(const f of INF.fis){
    if(!f.hordaCap || f.done || !inView(f.x, f.y, 120)) continue;
    const C = INF_CAPS[f.hordaCap];
    ctx.save(); ctx.font = pxFont(14); ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,4,2,0.9)";
    ctx.fillStyle = `rgb(${C.rgb})`; ctx.strokeText(`${C.name} · ${C.txt}`, f.x, f.y - 70); ctx.fillText(`${C.name} · ${C.txt}`, f.x, f.y - 70); ctx.restore();
  }
}
BOSS_CLEANUP_EXTRA.push(()=>{ if(currentArena==="infernal") infBossReset(); });
{
  const X = ARENA_EXT.infernal, up0 = X.update, rs0 = X.runStart, ns0 = X.netState, an0 = X.applyNetState, dt0 = X.drawTop;
  X.update = function(dt){ infBossRule(dt); return up0.apply(this, arguments); };
  X.runStart = function(){ infB = null; return rs0.apply(this, arguments); };
  X.netState = function(){ const s = ns0.apply(this, arguments); if(!s) return s; s.hc = INF.fis.filter(f=>f.hordaCap).map(f=>[f.id, f.hordaCap]); return s; };
  X.applyNetState = function(s){ an0.apply(this, arguments); if(s && s.hc) for(const [id, cap] of s.hc){ const f = INF.fis.find(q=>q.id===id); if(f) f.hordaCap = cap; } };
  X.drawTop = function(){ if(dt0) dt0.apply(this, arguments); infBossDrawTop(); };
  X.drawEnemyBody = infBossDrawBody;
  X.botTarget = infBossBotTarget;
}
