"use strict";
/* ============================================================
   js/arenas/laberinto/lab-boss.js
   BOSS IDENTITY — EL MINOTAURO (3er Guardián). REGLA: HACELO CHOCAR CONTRA LO QUE ESTÁ ROTO.
   - Al empezar la pelea, varias paredes del laberinto quedan AGRIETADAS (brillan naranja).
   - Su EMBESTIDA contra una pared agrietada la DERRIBA y lo deja EXPUESTO (tambaleo largo, más
     daño). Contra una pared sana o el borde sólo se aturde un momento.
   - Las paredes rotas ABREN rutas nuevas: nunca cierran caminos (sin encierros imposibles) y la
     navegación de bots y enemigos se recalcula.
   - FASE FINAL (25%): ESTAMPIDA — el laberinto central se derrumba y la pelea termina en campo
     abierto (sólo quedan el borde y las paredes exteriores para hacerlo chocar).
   - ANTI-KITE: si todo el equipo se esconde lejos, el techo se desmorona sobre ellos (rocas
     marcadas). ANTI-FACETANK: Hachazo / Pisotón / Cruz de embestidas.
   Anfitrión; los índices de paredes agrietadas/rotas viajan en labNetState.
   ============================================================ */
const LAB_BOSS = { cracked:5, exposeMs:4500, exposeMult:1.7, wallStun:1400, openAt:0.25, openR:560, openWarn:1600, kiteR:720, kiteMs:3500 };
LAB.cw = []; LAB.bw = []; LAB.w0 = null; LAB.boss = 0; LAB.open = 0;
function labBossMino(){ return enemies.find(e=>e.alive && e.type==="minotauro") || null; }
function labBossActive(){ return currentArena==="laberinto" && !divinaMode && runLevel===LEVEL_COUNT && bossActive; }
function labBossInit(){
  LAB.w0 = labyrinthWalls.slice(); LAB.bw = []; LAB.open = 0; LAB.boss = 1;
  // agrietadas: paredes del anillo interior y algunas exteriores (índices del trazado fijo)
  const inner = [0, 1, 2, 3, 4, 5, 6, 7], outer = [8, 10, 11, 12, 13, 14, 15, 16];
  const pick = (arr, n)=>{ const a = arr.slice(), o = []; while(o.length < n && a.length) o.push(a.splice(Math.floor(Math.random()*a.length), 1)[0]); return o; };
  LAB.cw = pick(inner, 3).concat(pick(outer, LAB_BOSS.cracked - 3));
  showBanner("🐂 Paredes AGRIETADAS: hacé que el Minotauro embista contra ellas");
  if(typeof tutSay==="function" && !tutSeen("lab_cracks")) tutSay("lab_cracks", "Las paredes AGRIETADAS (grietas naranjas) se rompen con su embestida y lo dejan EXPUESTO. Parate delante de una y esquivá a último momento.", null, 11000, true);
}
function labBossWallIdx(w){ return LAB.w0 ? LAB.w0.indexOf(w) : -1; }
function labBossBreak(i, silent){
  const w = LAB.w0 && LAB.w0[i]; if(!w || LAB.bw.includes(i)) return;
  LAB.bw.push(i); LAB.cw = LAB.cw.filter(k=>k!==i);
  labyrinthWalls = labyrinthWalls.filter(o=>o!==w);
  if(w.torch) aidLights = aidLights.filter(L=>!(L.torch && Math.hypot(L.x - w.torch.x, L.y - w.torch.y) < 4));
  if(typeof aidNavBuild==="function") aidNavBuild();
  if(!silent){
    const b = aidWallAABB(w);
    for(let k=0;k<6;k++) vfxBurst(b.x0 + (b.x1 - b.x0)*Math.random(), b.y0 + (b.y1 - b.y0)*Math.random() - 20, 8, "rock", 180, 700, 4, 2, -60, 0);
    vfxShake(10); playSfx("heavy");
  }
}
// Llamado desde la embestida (boss-skills.js) cuando el Minotauro choca. true = lo resolvió la regla.
function labBossCrash(e){
  if(!labBossActive() || e.type!=="minotauro" || !LAB.w0) return false;
  const rad = e.radius*0.55 + 14, ax = e.x + (e.fx||0)*e.radius*0.4, ay = e.y + (e.fy||0)*e.radius*0.4;
  let hit = null;
  for(const w of labyrinthWalls){
    const dx = ax - w.x, dy = ay - w.y, c = Math.cos(-w.rot), s = Math.sin(-w.rot);
    const lx = dx*c - dy*s, ly = dx*s + dy*c;
    if(Math.abs(lx) < w.len/2 + rad && Math.abs(ly) < w.thick/2 + rad){ hit = w; break; }
  }
  const i = hit ? labBossWallIdx(hit) : -1;
  e.bossCharge = null; e.minoCharge = false; e.chargeQueue = 0;
  if(i >= 0 && LAB.cw.includes(i)){
    labBossBreak(i, false);
    bossExpose(e, LAB_BOSS.exposeMs, LAB_BOSS.exposeMult, "💥 ¡DERRIBÓ LA PARED AGRIETADA! El Minotauro queda EXPUESTO");
    vfxBurst(e.x, e.y - e.radius*0.6, 30, "rock", 220, 700, 4, 2, -60, 0);
    return true;
  }
  // pared sana o borde: aturdido corto
  e.stunTimer = LAB_BOSS.wallStun; e.crashTimer = LAB_BOSS.wallStun; e.crashVuln = true;
  vfxShock(e.x, e.y, e.radius*0.3, e.radius*2, "220,190,140", 480, 2);
  vfxBurst(e.x, e.y - e.radius*0.6, 16, "rock", 170, 500, 4, 2, -50, 0);
  vfxShake(9); playSfx("heavy");
  showBanner(hit ? "Se estrelló contra una pared sana: buscá las AGRIETADAS" : "¡Se estrelló!");
  return true;
}
// Se llama desde la actualización del Laberinto (anfitrión).
function labBossRule(dt){
  if(!labBossActive()){ if(LAB.boss && !bossActive) LAB.boss = 0; return; }
  const e = labBossMino(); if(!e) return;
  if(!LAB.boss) labBossInit();
  const n = LAB.cw.length;
  if(!(e._expT > 0)) e._encTag = LAB.open ? "CAMPO ABIERTO" : n ? `${n} PARED${n > 1 ? "ES" : ""} AGRIETADA${n > 1 ? "S" : ""}` : null;
  else e._encTag = null;
  // FASE FINAL: el laberinto central se derrumba
  if(!LAB.open && e.hp <= e.maxHp*LAB_BOSS.openAt){
    LAB.open = 1;
    const doomed = [];
    LAB.w0.forEach((w, i)=>{ if(!LAB.bw.includes(i) && Math.hypot(w.x, w.y) < LAB_BOSS.openR) doomed.push(i); });
    for(const i of doomed){ const b = aidWallAABB(LAB.w0[i]); vfxTelegraph({shape:0, r:Math.max(b.x1 - b.x0, b.y1 - b.y0)*0.55, x:LAB.w0[i].x, y:LAB.w0[i].y, dur:LAB_BOSS.openWarn, rgb:"220,170,110"}); }
    showBanner("🐂 ¡ESTAMPIDA! El laberinto central se derrumba");
    playSfx("bossRoar"); vfxShake(8);
    runLater(LAB_BOSS.openWarn, ()=>{ if(state!=="playing" || !LAB.w0) return; for(const i of doomed) labBossBreak(i, false); flashScreen(0.2, "220,180,120"); });
  }
  // ANTI-KITE: el techo se desmorona sobre los que se esconden
  if(bossHeroesFarMs(e, LAB_BOSS.kiteR, dt) > LAB_BOSS.kiteMs){
    e._kiteMs = 0;
    for(const h of heroes){ if(h.alive && Math.hypot(h.x - e.x, h.y - e.y) >= LAB_BOSS.kiteR){ bossStrike(h.x, h.y, 90, 1200, e.dmg*0.8, "rock", {slow:0.3, slowDur:900}); bossStrike(h.x + 90, h.y + 40, 70, 1450, e.dmg*0.6, "rock", null); } }
    showBanner("¡El techo se desmorona! No te escondas del Minotauro");
  }
}
function labBossReset(){
  if(LAB.w0){ labyrinthWalls = LAB.w0.slice(); if(typeof aidNavBuild==="function") aidNavBuild(); }
  LAB.w0 = null; LAB.cw = []; LAB.bw = []; LAB.boss = 0; LAB.open = 0;
}
// grietas brillantes sobre las paredes agrietadas (se leen de lejos)
function labBossDrawTop(){
  if(!LAB.w0 || !LAB.cw.length) return;
  const t = animNow/1000;
  for(const i of LAB.cw){
    const w = LAB.w0[i]; if(!w || !inView(w.x, w.y, w.len/2 + 60)) continue;
    const b = aidWallAABB(w), top = b.y0 - AID_WALL_H, a = 0.6 + 0.3*Math.sin(t*5 + i);
    ctx.save(); ctx.strokeStyle = `rgba(255,150,60,${a})`; ctx.lineWidth = 2.5; ctx.shadowColor = "rgba(255,120,40,0.9)"; ctx.shadowBlur = 8;
    const horiz = w.axis!=="v", L = horiz ? b.x1 - b.x0 : b.y1 - b.y0, segs = Math.max(2, Math.round(L/90));
    for(let k=0;k<segs;k++){
      const f = (k + 0.5)/segs, cx = horiz ? b.x0 + L*f : (b.x0 + b.x1)/2, cy = horiz ? top + AID_WALL_H*0.55 : b.y0 + L*f - AID_WALL_H*0.4;
      ctx.beginPath(); ctx.moveTo(cx - 10, cy - 14); ctx.lineTo(cx - 2, cy - 4); ctx.lineTo(cx - 8, cy + 4); ctx.lineTo(cx + 3, cy + 14); ctx.moveTo(cx - 2, cy - 4); ctx.lineTo(cx + 9, cy - 8); ctx.stroke();
    }
    ctx.restore();
  }
}
BOSS_CLEANUP_EXTRA.push(()=>{ if(currentArena==="laberinto" && LAB.boss){ LAB.cw = []; LAB.boss = 0; } });
{
  const X = ARENA_EXT.laberinto, up0 = X.update, rs0 = X.runStart, gs0 = X.guestStart, ns0 = X.netState, an0 = X.applyNetState, dt0 = X.drawTop;
  X.update = function(dt){ labBossRule(dt); return up0.apply(this, arguments); };
  X.runStart = function(){ labBossReset(); return rs0.apply(this, arguments); };
  X.guestStart = function(){ labBossReset(); return gs0.apply(this, arguments); };
  X.netState = function(){ const s = ns0.apply(this, arguments) || {}; s.cw = LAB.cw; s.bw = LAB.bw; return s; };
  X.applyNetState = function(st){
    an0.apply(this, arguments);
    if(!st || !st.bw) return;
    if(!LAB.w0 && labyrinthWalls.length) LAB.w0 = labyrinthWalls.slice();
    LAB.cw = st.cw || [];
    for(const i of st.bw) if(!LAB.bw.includes(i)) labBossBreak(i, false);
  };
  X.drawTop = function(){ if(dt0) dt0.apply(this, arguments); labBossDrawTop(); };
}
