"use strict";
/* ============================================================
   js/arenas/bosque/bos-ruins.js
   RUINAS ÉLFICAS (Bosque) — "EL BOSQUE TE CAZA, LAS PIEDRAS TE RECUERDAN"

   - RUNAS: 4 de los 8 menhires del círculo guardan una runa que se carga sola. Cargada, brilla
     y se activa con la acción contextual ("Activar"): las raíces atrapan y lastiman a todos los
     enemigos alrededor de la piedra (el jefe apenas se frena). Después se recarga. Usar el
     escenario contra la horda es la primera lección de La Horda (el Hechicero la enseña).
   - EMBOSCADAS: desde el nivel 2, la maleza se sacude alrededor del equipo (aviso de 2,6 s:
     hojas que tiemblan + "!" + crujido) y de ahí salta una jauría. Nunca sin aviso.
   Todo lo decide el anfitrión; viaja en bosNetState(). Arte: menhires existentes + glifo y
   maleza procedurales (ver LA_HORDA_MISSING_ASSETS.md).
   ============================================================ */
const BOS_CFG = {
  runeIdx: [1, 3, 5, 7],       // menhires con runa (de los 8 del círculo)
  ring: 300,
  chargeMs: 32000,             // recarga completa
  startCharge: 0.62,           // la primera se carga rápido (la enseña el Hechicero)
  useMs: 900,
  rootR: 280,
  rootStun: [2200, 900, 350],  // normal / élite-subjefe / jefe
  rootDmg:  [0.20, 0.06, 0.015], // % de la vida máxima
  ambushFirst: 2,
  ambushEvery: [36000, 50000],
  ambushWarn: 2600,
  ambushSpots: [2, 3],
  ambushPer: [1, 2]
};
const BOS = { runes:[], amb:[], ambT:0, nextA:1 };

function bosResetRun(){
  BOS.runes = BOS_CFG.runeIdx.map((i, k)=>{
    const a = i/8*6.283 + Math.PI/8;
    const p = aidOnRing(BOS_CFG.ring, BOS_CFG.ring, a);
    return { id:"rn"+i, kind:"bos_rune", mx:Math.round(p.x), my:Math.round(p.y), x:Math.round(p.x), y:Math.round(p.y)+30, r:70, h:132,
      charge:BOS_CFG.startCharge - k*0.08, prog:0, dur:BOS_CFG.useMs, done:false, by:-1, flash:0 };
  });
  BOS.amb = []; BOS.ambT = BOS_CFG.ambushEvery[0]*0.5; BOS.nextA = 1;
}
function bosRunStart(){ bosResetRun(); }
function bosGuestStart(){ bosResetRun(); }
function bosReady(r){ return r.charge >= 1; }
function bosUpdate(dt){
  for(const r of BOS.runes){
    if(r.flash > 0) r.flash -= dt;
    if(r.charge < 1){
      r.charge = Math.min(1, r.charge + dt/BOS_CFG.chargeMs);
      if(r.charge >= 1){
        r.done = false; r.prog = 0;
        playSfx("bosRuneReady");
      }
    }
  }
  // emboscadas
  const calm = runEnding || levelClearing > 0 || bossActive || activeChampion;
  if(!calm && runLevel >= BOS_CFG.ambushFirst){
    BOS.ambT -= dt;
    if(BOS.ambT <= 0){ BOS.ambT = BOS_CFG.ambushEvery[0] + Math.random()*(BOS_CFG.ambushEvery[1]-BOS_CFG.ambushEvery[0]); bosStartAmbush(); }
  }
  let w = 0;
  for(const a of BOS.amb){
    a.t -= dt;
    if(a.t <= 0 && !a.sprung){ a.sprung = true; bosSpring(a); }
    if(a.t > -900) BOS.amb[w++] = a;
  }
  BOS.amb.length = w;
  bosTut();
}
// Consejos del Hechicero (cada cliente mira lo suyo: anfitrión e invitados).
function bosTut(){
  if(!player || !player.alive) return;
  for(const r of BOS.runes) if(bosReady(r) && Math.hypot(player.x-r.x, player.y-r.y) < 760){ tutSay("rune", "Esa piedra con una RUNA verde que brilla juega a tu favor: activala y las raíces atrapan a la horda cercana.", "Mantené ✚ junto a la runa verde", 12000); break; }
  if(TUT.key==="rune" && BOS.runes.some(r=>r.flash > 0 && r.by===heroes.indexOf(player))) tutDone("rune");
  if(BOS.amb.some(a=>a.t > 0)) tutSay("ambush", "¡Cuidado! La maleza que se sacude esconde una EMBOSCADA.", "Alejate de la maleza que se sacude", 7000);
}
function bosStartAmbush(){
  const c = infHeroCentroid();
  const n = BOS_CFG.ambushSpots[0] + ((Math.random()*(BOS_CFG.ambushSpots[1]-BOS_CFG.ambushSpots[0]+1))|0);
  const base = Math.random()*Math.PI*2;
  let made = 0, fails = 0;
  for(let i=0; i<n*10 && made<n; i++){
    // si un sector choca con el borde o una roca, cada reintento abre el abanico (antes repetía
    // casi el mismo ángulo y la emboscada quedaba con un solo punto)
    const ang = base + made*(Math.PI*2/n) + (Math.random()-0.5)*(0.5 + fails*0.45), d = 270 + Math.random()*90 - Math.min(fails, 4)*14;
    const x = c.x + Math.cos(ang)*d, y = c.y + Math.sin(ang)*d*0.8;
    if(!aidInside(x, y, 70) || aidSolids.some(s=>Math.hypot(s.x-x, s.y-y) < s.r+40) || BOS.amb.some(o=>o.t > 0 && Math.hypot(o.x-x, o.y-y) < 120)){ fails++; continue; }
    fails = 0;
    BOS.amb.push({id:BOS.nextA++, x:Math.round(x), y:Math.round(y), t:BOS_CFG.ambushWarn, sprung:false, seed:(Math.random()*1e6)|0});
    made++;
  }
  if(!made) return;
  playSfx("bosRustle");
  floatText(player.x, player.y-70, "¡Emboscada!", "crit");
}
function bosSpring(a){
  const pool = spawnPoolFor(runLevel);
  // prefiere cazadores (bestias / Cù-Sìth) si ya salen en este nivel
  const hunters = pool.filter(p=>p.t==="bestia_bosque" || p.t==="cu_sith");
  const src = hunters.length ? hunters : pool;
  const k = BOS_CFG.ambushPer[0] + ((Math.random()*(BOS_CFG.ambushPer[1]-BOS_CFG.ambushPer[0]+1))|0);
  for(let i=0;i<k;i++){
    const e = spawnEnemy(pickFromPool(src), false);
    if(!e) continue;
    e.x = a.x + (Math.random()-0.5)*30; e.y = a.y + (Math.random()-0.5)*20; clampToArena(e);
    if(a.burnt){ e.burnTimer = Math.max(e.burnTimer||0, 4000); e.burnDmg = Math.max(e.burnDmg||0, e.maxHp*0.05); }
  }
  vfxBurst(a.x, a.y-10, 16, "leaf", 150, 520, 3, 1, -60, 0);
  playSfx("bosSpring");
}
function bosGuestUpdate(dt){ for(const a of BOS.amb) a.t -= dt; for(const r of BOS.runes) if(r.flash > 0) r.flash -= dt; bosTut(); }
// ---- acción contextual: activar runa ----
function bosCtxTargets(){ const out = []; for(const r of BOS.runes) if(bosReady(r)) out.push(r); return out; }
CTX_KINDS.bos_rune = {
  label:"Activar", icon:"ᛉ", color:"#8ee07a",
  maxBots: 1,
  onComplete(r, users){
    r.charge = 0; r.done = false; r.flash = 900; r.by = heroes.indexOf(users[0]);
    let hit = 0;
    for(const e of enemies){
      if(!e.alive || Math.hypot(e.x-r.x, e.y-r.y) > BOS_CFG.rootR) continue;
      const tier = e.rank==="jefe" ? 2 : ((e.rank==="subjefe" || e.rank==="elite") ? 1 : 0);
      e.stunTimer = Math.max(e.stunTimer||0, BOS_CFG.rootStun[tier]);
      damageEnemy(e, Math.max(1, e.maxHp*BOS_CFG.rootDmg[tier]), {src:users[0], critChanceOverride:0, fromProc:true});
      hit++;
      vfxBurst(e.x, e.y, 5, "leaf", 90, 420, 2.5, 0, -40, 0);
    }
    vfxShock(r.x, r.y, 20, BOS_CFG.rootR, "140,230,110", 600, 3);
    playSfx("bosRuneFire"); vfxShake(4);
    const who = users[0];
    floatText(r.x, r.y-90, hit ? `¡Raíces Élficas! ×${hit}` : "¡Raíces Élficas!", "crit");
    if(who===player) tutDone("rune");
    for(const h of users) if(h.stats) h.stats.runes = (h.stats.runes||0) + 1;
  },
  botWorth(h, r){
    let n = 0; for(const e of enemies){ if(e.alive && Math.hypot(e.x-r.x, e.y-r.y) < BOS_CFG.rootR*0.8) n++; }
    return n >= 4 ? 3 + n*0.4 : 0;
  }
};
// ---- red ----
function bosNetState(){
  return {r:BOS.runes.map(r=>[Math.round(r.charge*1000), r.prog|0, r.by, r.flash|0]), a:BOS.amb.map(a=>[a.id, a.x, a.y, a.t|0, a.seed])};
}
function bosApplyNetState(s){
  if(!s) return;
  if(s.r) s.r.forEach((v, i)=>{ const r = BOS.runes[i]; if(!r) return; r.charge = v[0]/1000; r.prog = v[1]; r.by = v[2]; r.flash = v[3]; r.done = false; });
  if(s.a) BOS.amb = s.a.map(v=>({id:v[0], x:v[1], y:v[2], t:v[3], seed:v[4], sprung:v[3] <= 0}));
}
// ---- dibujo ----
function bosDrawGround(now){
  // maleza que se sacude antes de la emboscada
  for(const a of BOS.amb){
    if(a.t <= 0 || !inView(a.x, a.y, 90)) continue;
    const k = 1 - a.t/BOS_CFG.ambushWarn, shake = Math.sin(now*40 + a.seed)*(2 + k*4);
    ctx.save(); ctx.translate(Math.round(a.x + shake), Math.round(a.y));
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, 4, 34, 11, 0, 0, Math.PI*2); ctx.fill();
    const rnd = _infRng(a.seed);
    for(let i=0;i<9;i++){
      const lx = (rnd()-0.5)*56, ly = (rnd()-0.5)*14 - 6, s = 8 + rnd()*8;
      ctx.fillStyle = i%3===0 ? "#2e5a24" : (i%3===1 ? "#3f7a2e" : "#5a9a3a");
      ctx.fillRect(Math.round(lx - s/2), Math.round(ly - s), Math.round(s), Math.round(s));
    }
    // ojos en la maleza al final del aviso
    if(k > 0.55){ ctx.fillStyle = "#ffe066"; ctx.fillRect(-9, -14, 3, 2); ctx.fillRect(4, -14, 3, 2); }
    ctx.restore();
    // "!" encima
    ctx.save(); ctx.fillStyle = k > 0.7 && Math.sin(now*20) > 0 ? "#ff4a3a" : "#ffcf5c"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("!", a.x, a.y - 40 - k*6); ctx.restore();
  }
  // círculo de alcance de una runa cargada cuando hay alguien cerca
  for(const r of BOS.runes){
    if(!bosReady(r) || !inView(r.x, r.y, BOS_CFG.rootR)) continue;
    if(Math.hypot(player.x-r.x, player.y-r.y) > BOS_CFG.rootR + 120) continue;
    ctx.save(); ctx.strokeStyle = `rgba(140,230,110,${0.22 + 0.12*Math.sin(now*3)})`; ctx.lineWidth = 2; ctx.setLineDash([4, 10]);
    ctx.beginPath(); ctx.ellipse(r.x, r.y, BOS_CFG.rootR, BOS_CFG.rootR*0.8, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
  }
}
function bosPushTall(){ for(let i=0;i<BOS.runes.length;i++){ const r = BOS.runes[i]; if(inView(r.mx, r.my-60, 80)) _entPush(r.my+1, null, null, null, {arena:1, bosRune:i+1}); } }
function bosDrawTall(it, now){
  const r = BOS.runes[it.bosRune-1]; if(!r) return;
  // glifo sobre el menhir: apagado mientras carga (se llena de abajo arriba), brillante cargado
  const x = r.mx, y = r.my - 78;
  const ready = bosReady(r);
  ctx.save();
  ctx.fillStyle = "rgba(10,20,8,0.75)"; ctx.fillRect(x-7, y-12, 14, 24);
  const fill = Math.round(22*Math.min(1, r.charge));
  ctx.fillStyle = ready ? "#b8ff9a" : "#3f7a2e"; ctx.fillRect(x-5, y+10-fill, 10, fill);
  ctx.fillStyle = ready ? "#eaffdf" : "#8ee07a";
  // runa (ᛉ) en píxeles
  ctx.fillRect(x-1, y-9, 2, 18); ctx.fillRect(x-5, y-9, 2, 6); ctx.fillRect(x+3, y-9, 2, 6); ctx.fillRect(x-4, y-4, 2, 2); ctx.fillRect(x+2, y-4, 2, 2);
  if(ready || r.flash > 0){
    ctx.globalCompositeOperation = "lighter";
    const a = r.flash > 0 ? r.flash/900 : 0.45 + 0.25*Math.sin(now*4 + r.mx);
    const g = ctx.createRadialGradient(x, y, 2, x, y, 46); g.addColorStop(0, `rgba(150,255,120,${0.55*a})`); g.addColorStop(1, "rgba(80,200,60,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

Object.assign(ARENA_SFX, {
  bosRuneReady: {p:2, gap:800, play:(t,D)=>{ [523,659,784].forEach((f,i)=>_tone(t+i*0.07,"sine",f,f,0.5,0.06,D,0.02)); return 0.7; }},
  bosRuneFire:  {p:4, gap:300, play:(t,D)=>{ _tone(t,"sine",110,55,0.6,0.35,D); for(let i=0;i<6;i++) _noise(t+i*0.05,0.06,0.2,"bandpass",400+i*90,3,D); [392,523].forEach((f,i)=>_tone(t+0.1+i*0.08,"triangle",f,f*1.01,0.5,0.08,D,0.02)); return 0.8; }},
  bosRustle:    {p:3, gap:900, play:(t,D)=>{ for(let i=0;i<10;i++) _noise(t+i*0.07,0.08,0.14,"highpass",2400+Math.random()*1500,0,D); return 0.8; }},
  bosSpring:    {p:3, gap:300, play:(t,D)=>{ _noise(t,0.25,0.25,"bandpass",1200,1,D); _tone(t,"sawtooth",220,110,0.2,0.08,D); return 0.3; }}
});

// Etiqueta ambiental "fire" (js/systems/env-tags.js): el fuego quema la maleza de una emboscada que
// todavía no saltó: los que salen, salen ardiendo.
envOn("fire", "bosque", (x, y, src, o)=>{
  for(const a of BOS.amb){ if(a.t > 0 && !a.burnt && Math.hypot(a.x-x, a.y-y) < (o.r||40) + 50){ a.burnt = true; vfxBurst(a.x, a.y-10, 12, "ember", 120, 500, 3, 1, -60, 0); floatText(a.x, a.y-50, "¡La maleza arde!", null); } }
});

ARENA_EXT.bosque = {
  runStart: bosRunStart,
  guestStart: bosGuestStart,
  update: bosUpdate,
  guestUpdate: bosGuestUpdate,
  ctxTargets: bosCtxTargets,
  drawGround: bosDrawGround,
  pushTall: bosPushTall,
  drawTall: bosDrawTall,
  netState: bosNetState,
  applyNetState: bosApplyNetState
};
