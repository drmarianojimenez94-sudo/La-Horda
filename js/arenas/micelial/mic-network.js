"use strict";
/* ============================================================
   js/arenas/micelial/mic-network.js
   BOSS IDENTITY — LA MADRE ESPORA. REGLA: CORTÁ LA RED PARA EXPONER EL CORAZÓN.
   - Al empezar la pelea (y en cada fase) la Madre teje su RED: 3-4 NÚCLEOS MICELIALES unidos a
     ella por raíces que laten (se ven cruzando el piso hacia el centro).
   - Mientras haya núcleos vivos: ESCUDO (menos daño recibido, nunca inmunidad) y REGENERA de a
     poco; los núcleos maduros sueltan colonia y estallidos de esporas.
   - Cortar un núcleo le TRANSMITE el golpe: daño directo + tambaleo corto.
   - Con la red entera cortada se abre físicamente el CORAZÓN MICELIAL: VENTANA DE BURST.
   - Después la colonia intenta RECONSTRUIR la red (núcleos nuevos, chicos, que crecen).
   - ANTI-KITE: si todo el equipo se aleja, la infección crece: los núcleos maduran de golpe y
     brotan nubes de esporas donde están parados. ANTI-FACETANK: su Zarpazo y el Latigazo.
   Todo en el anfitrión; micS.mo.net viaja con el estado de la arena y e.micLink con el enemigo.
   ============================================================ */
MIC_CFG.madre.net = { count:[3, 4, 4], hpMul:1.5, shield:[1, 0.8, 0.62, 0.5, 0.42], regen:0.0008,
                      cutPct:0.03, cutStun:900, openMs:7000, openMult:1.8, rebuildMs:5500, rebuildShield:0.8,
                      kiteR:720, kiteMs:4500 };
const MIC_NET_ANCHORS = [{x:-620, y:-60}, {x:620, y:-60}, {x:-470, y:540}, {x:470, y:540}];

function micNetLinks(){ return enemies.filter(e=>e.alive && e.type==="nucleo_micelial" && e.micLink); }
function micNetSpawn(n, st){
  const C = MIC_CFG.madre.net, cur = micNetLinks();
  const free = MIC_NET_ANCHORS.filter(a=>!cur.some(o=>Math.hypot(o.x - a.x, o.y - a.y) < 200));
  for(let i=0;i<n && i<free.length;i++){
    let p = free[i];
    if(!micInside(p.x, p.y, 80)) p = micPointNear(p.x, p.y, 40, 200, 80);
    const e = micSpawnNucleo(p.x, p.y, st);
    e.micLink = 1; e.maxHp = Math.round(e.maxHp*C.hpMul); e.hp = e.maxHp; e.xp = Math.round(e.xp*0.5);
    vfxTelegraph({shape:0, r:90, x:p.x, y:p.y, dur:700, rgb:"255,110,230"});
  }
}
// Se llama desde micMotherFightWorld (anfitrión) mientras la Madre pelea.
function micNetRule(dt){
  const M = micS.mo, e = micMotherEntity(); if(!e || e.micDormant) return;
  const C = MIC_CFG.madre.net, N = M.net || (M.net = {st:"new", t:0, ph:0});
  if(M.tr){ e._encMult = 1; e._encTag = null; return; }        // la transición ya tiene su propia protección
  // cada fase (y el arranque) teje la red
  if(N.ph !== M.ph){
    N.ph = M.ph;
    const want = C.count[Math.min(C.count.length - 1, M.ph - 1)], have = micNetLinks().length;
    if(have < want) micNetSpawn(want - have, M.ph===1 ? 2 : 1);
    N.st = "net"; N.t = 0;
    showBanner(M.ph===1 ? "🕸 La Madre teje su RED: cortá los NÚCLEOS para abrirle el Corazón" : "🕸 La red vuelve a crecer: cortala otra vez");
    if(typeof tutSay==="function" && !tutSeen("mic_net")) tutSay("mic_net", "Mientras sus NÚCLEOS vivan, la Madre casi no recibe daño y se regenera. Cortalos todos y su CORAZÓN queda abierto.", null, 10000, true);
  }
  N.t += dt;
  const links = micNetLinks(), n = links.length;
  if(N.st==="net"){
    e._encMult = C.shield[Math.min(C.shield.length - 1, n)];
    e._encTag = n ? `RED: ${n} NÚCLEO${n > 1 ? "S" : ""} (−${Math.round((1 - e._encMult)*100)}%)` : null;
    if(n && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp*C.regen*n*dt/1000);
    if(!n){
      N.st = "open"; N.t = 0; e._encMult = 1;
      bossExpose(e, C.openMs, C.openMult, "💗 ¡EL CORAZÓN MICELIAL SE ABRE! ¡Todo el daño ahora!");
      if(typeof bossArenaEvent==="function") bossArenaEvent("madre_espora.nucleos", e);
      M.bt = runElapsedMs; playSfx("micOpen"); flashScreen(0.25, "255,120,180");
    }
  } else if(N.st==="open"){
    e._encMult = 1; e._encTag = "¡CORAZÓN ABIERTO!";
    if(!(e._expT > 0)){ N.st = "rebuild"; N.t = 0; showBanner("La colonia intenta reconstruir la red…"); playSfx("micGrow"); }
  } else if(N.st==="rebuild"){
    e._encMult = C.rebuildShield; e._encTag = "RECONSTRUYE LA RED";
    if(N.t >= C.rebuildMs){
      micNetSpawn(C.count[Math.min(C.count.length - 1, M.ph - 1)], 1);
      N.st = "net"; N.t = 0;
    }
  }
  // ANTI-KITE: lejos de ella la infección crece
  if(bossHeroesFarMs(e, C.kiteR, dt) > C.kiteMs){
    e._kiteMs = 0;
    for(const o of links) o._micBoost = Math.max(o._micBoost||0, 6000);
    for(const h of heroes){
      if(!h.alive || Math.hypot(h.x - e.x, h.y - e.y) < C.kiteR) continue;
      const x = h.x, y = h.y;
      vfxTelegraph({shape:0, r:MIC_CFG.cloud.bigR, x, y, dur:900, rgb:"170,255,130"});
      runLater(900, ()=>{ if(state==="playing" && micS && micS.mo.st==="fight") micAddCloud(x, y, "big"); });
    }
    showBanner("La infección crece: la Madre no se deja evitar");
    playSfx("micSporeBig");
  }
}
// Cortar un núcleo de la red le transmite el golpe a la Madre.
function micNetCut(n){
  const e = micMotherEntity(), C = MIC_CFG.madre.net;
  if(!e || !micS || micS.mo.st!=="fight") return;
  const dmg = Math.round(e.maxHp*C.cutPct);
  e.hp = Math.max(1, e.hp - dmg);
  e.stunTimer = Math.max(e.stunTimer||0, C.cutStun); e.bossWind = null;
  floatText(e.x, e.y - 260, "-" + dmg + " ¡LA RED SE CORTA!", "crit");
  vfxShock(e.x, e.y, 30, 260, "255,110,230", 600, 2); vfxShake(5); hitStop(60);
  micS.roots.push({x0:Math.round(n.x), y0:Math.round(n.y), x1:Math.round(e.x), y1:Math.round(e.y), t:0, d:900, w:26});
  if(micS.roots.length > 6) micS.roots.shift();
  playSfx("micRoot");
}
// bots: los núcleos de la red y el corazón abierto son lo primero
function micNetBotScore(e, d){
  const N = micS && micS.mo && micS.mo.net;
  if(!N || micS.mo.st!=="fight") return null;
  if(e.type==="nucleo_micelial" && e.micLink) return 560 - d*0.35;
  if(e.type==="madre_espora" && e._expT > 0) return 760 - d*0.1;
  return null;
}
// dibujo: raíces que laten de cada núcleo hacia la Madre (el flujo va hacia ella)
function micDrawNetLinks(t){
  const m = micMotherEntity() || enemies.find(o=>o.alive && o.type==="madre_espora"); if(!m) return;
  for(const n of enemies){
    if(!n.alive || n.type!=="nucleo_micelial" || !n.micLink) continue;
    const mx = (n.x + m.x)/2 + (n.y - m.y)*0.12, my = (n.y + m.y)/2 - (n.x - m.x)*0.08;
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(46,12,38,0.95)"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.quadraticCurveTo(mx, my, m.x, m.y); ctx.stroke();
    ctx.strokeStyle = `rgba(255,110,230,${0.55 + 0.3*Math.sin(t*6 + n.x*0.01)})`; ctx.lineWidth = 4; ctx.setLineDash([12, 16]); ctx.lineDashOffset = -t*90; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
}
// corazón abierto: halo que late sobre el pecho
function micDrawNetHeart(t){
  const m = enemies.find(o=>o.alive && o.type==="madre_espora"); if(!m || !(m._expT > 0) || !inView(m.x, m.y, 400)) return;
  const q = 0.5 + 0.5*Math.sin(t*9);
  _micGlow(m.x, m.y - 190, 120 + q*50, "255,90,150", 0.55 + q*0.3);
  ctx.save(); ctx.strokeStyle = `rgba(255,200,230,${0.5 + q*0.4})`; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(m.x, m.y + 10, 220 + q*20, (220 + q*20)*0.55, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
}
