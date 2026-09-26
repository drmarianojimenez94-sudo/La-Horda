"use strict";
/* ============================================================
   js/arenas/laberinto/lab-seals.js
   LABERINTO MALDITO — "EL LABERINTO SE RESUELVE"

   Desde el nivel 2 aparecen 3 SELLOS en el piso, lejos entre sí y marcados I, II y III.
   Se activan con la acción contextual y hay que hacerlo EN ORDEN:
   - Sello correcto: se enciende. Con los tres encendidos (antes de 40 s desde el primero) el
     Laberinto "cede": la horda queda aturdida y lenta un rato, el equipo se cura y cae una poción.
   - Sello equivocado: "orden equivocado", caen rocas sobre ese sello (con aviso) y todo vuelve
     a cero. Pasados los 40 s sin terminar, también vuelve a cero (sin castigo).
   Separarse para cubrir los sellos (o llevar la horda de uno a otro) es la decisión. Los bots
   solo tocan el sello que sigue en el orden.
   Todo lo decide el anfitrión; viaja en labNetState(). Arte: procedural (sin sprite de sello
   todavía: ver LA_HORDA_MISSING_ASSETS.md).
   ============================================================ */
const LAB_CFG = {
  firstLevel: 2,
  every: [26000, 36000],   // hasta el próximo juego de sellos
  window: 40000,           // para completar después del primero
  useMs: 1100,
  minApart: 380,
  wrongDmg: 0.07,          // % de la vida media (rocas con aviso)
  stun: 1500, slow: 0.4, slowMs: 6000, heal: 0.15
};
const LAB = { seals:[], next:1, winT:0, spawnT:0, set:0, wrongs:0, solved:0 };
const LAB_NUM = ["", "I", "II", "III"];

function labResetRun(){ LAB.seals = []; LAB.next = 1; LAB.winT = 0; LAB.spawnT = LAB_CFG.every[0]*0.5; LAB.set = 0; LAB.wrongs = 0; LAB.solved = 0; }
function labRunStart(){ labResetRun(); }
function labGuestStart(){ labResetRun(); }
function labFree(x, y, clear){
  return aidInside(x, y, 70) && !aidSolids.some(s=>Math.hypot(s.x-x, s.y-y) < s.r+clear)
    && !labyrinthWalls.some(w=>aidPointInWall(w, x, y, clear));
}
// El sello tiene que poder alcanzarse por el camino de los bots (grilla con muros inflados): si no,
// podía caer en un bolsillo entre muros al que un bot nunca llegaba y la ventana se vencía sola.
function labReachable(x, y){
  if(typeof AID_NAV==="undefined" || !AID_NAV.on || !AID_NAV.blocked || typeof _ctxBuildField!=="function") return true;
  const f = _ctxBuildField({x, y});
  for(const h of heroes){ if(!h.alive) continue; const c = aidNavCell(h.x, h.y); if(c >= 0 && f.D[c] < 65535) return true; }
  const c0 = aidNavCell(0, 0);
  return c0 >= 0 && f.D[c0] < 65535;
}
function labSpawnSet(){
  const pts = [];
  for(let t=0; t<400 && pts.length<3; t++){
    const a = Math.random()*Math.PI*2, r = 230 + Math.random()*600;
    const x = Math.round(Math.cos(a)*r*1.18), y = Math.round(Math.sin(a)*r*0.82);
    if(!labFree(x, y, 46)) continue;
    if(pts.some(p=>Math.hypot(p.x-x, p.y-y) < LAB_CFG.minApart)) continue;
    if(!labReachable(x, y)) continue;
    pts.push({x, y});
  }
  if(pts.length < 3) return false;
  LAB.set++;
  LAB.seals = pts.map((p, i)=>({ id:"ls"+LAB.set+"_"+(i+1), kind:"lab_seal", n:i+1, x:p.x, y:p.y, r:62, h:64,
    lit:false, prog:0, dur:LAB_CFG.useMs, done:false, by:-1, flash:0 }));
  LAB.next = 1; LAB.winT = 0;
  playSfx("labSeals");
  floatText(player.x, player.y-70, "Sellos en el Laberinto: I → II → III", null);
  return true;
}
function labResetSeals(){ for(const s of LAB.seals){ s.lit = false; s.done = false; s.prog = 0; } LAB.next = 1; LAB.winT = 0; }
function labUpdate(dt){
  const calm = runEnding || levelClearing > 0 || bossActive || activeChampion;
  for(const s of LAB.seals) if(s.flash > 0) s.flash -= dt;
  if(!LAB.seals.length){
    if(!calm && runLevel >= LAB_CFG.firstLevel){
      LAB.spawnT -= dt;
      if(LAB.spawnT <= 0){ LAB.spawnT = LAB_CFG.every[0] + Math.random()*(LAB_CFG.every[1]-LAB_CFG.every[0]); labSpawnSet(); }
    }
  } else if(LAB.winT > 0){
    LAB.winT -= dt;
    if(LAB.winT <= 0){ labResetSeals(); playSfx("labReset"); floatText(player.x, player.y-70, "Los sellos se apagaron", null); }
  }
  labTut();
}
function labSolved(users){
  const c = infHeroCentroid();
  for(const e of enemies){
    if(!e.alive || e.rank==="jefe") continue;
    e.stunTimer = Math.max(e.stunTimer||0, e.rank==="subjefe" ? LAB_CFG.stun*0.4 : LAB_CFG.stun);
    e.slowAmt = Math.max(e.slowAmt||0, LAB_CFG.slow); e.slowTimer = Math.max(e.slowTimer||0, LAB_CFG.slowMs);
  }
  for(const h of heroes){ if(h.alive){ const amt = h.maxHp*LAB_CFG.heal; h.hp = Math.min(h.maxHp, h.hp + amt); floatText(h.x, h.y-30, "+"+Math.round(amt), "heal"); } }
  dropPotion(c.x, c.y, "hp");
  vfxShake(7); playSfx("labSolved");
  for(const s of LAB.seals) vfxShock(s.x, s.y, 10, 160, "255,210,120", 700, 3);
  showBanner("🗿 ¡El Laberinto cede! La horda queda aturdida");
  for(const h of users) if(h.stats) h.stats.seals = (h.stats.seals||0) + 1;
  LAB.seals = []; LAB.winT = 0; LAB.solved++;
}
// ---- acción contextual ----
function labCtxTargets(){ const out = []; for(const s of LAB.seals) if(!s.lit) out.push(s); return out; }
CTX_KINDS.lab_seal = {
  label:"Sello", icon:"◈", color:"#ffcf5c",
  pointer(s){ return s.n === LAB.next; },
  maxBots: 1, farOk: true,
  onComplete(s, users){
    s.by = heroes.indexOf(users[0]); s.flash = 700;
    if(s.n === LAB.next){
      s.lit = true; s.done = true; LAB.next++;
      if(s.n === 1) LAB.winT = LAB_CFG.window;
      playSfx("labSealOk");
      floatText(s.x, s.y-60, "Sello " + LAB_NUM[s.n], null);
      if(LAB.next > 3) labSolved(users);
    } else {
      s.done = false; s.prog = 0; LAB.wrongs++;
      floatText(s.x, s.y-60, "¡Orden equivocado!", "crit");
      playSfx("labReset");
      const dmg = _avgHeroMaxHp()*LAB_CFG.wrongDmg;
      bossStrike(s.x, s.y, 80, 900, dmg, "rock", {knock:30});
      for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2; bossStrike(s.x+Math.cos(a)*90, s.y+Math.sin(a)*70, 60, 1100, dmg, "rock", {knock:30}); }
      labResetSeals();
    }
  },
  botWorth(h, s){
    if(s.n !== LAB.next) return 0;
    let near = 0; for(const e of enemies){ if(e.alive && Math.hypot(e.x-s.x, e.y-s.y) < 200) near++; }
    return near > 4 ? 0 : 2 + (LAB.winT > 0 ? 1 : 0);
  }
};
function labGuestUpdate(dt){ for(const s of LAB.seals) if(s.flash > 0) s.flash -= dt; if(LAB.winT > 0) LAB.winT -= dt; labTut(); }
function labTut(){
  if(!player || !player.alive || !LAB.seals.length) return;
  if(LAB.seals.some(s=>Math.hypot(player.x-s.x, player.y-s.y) < 650))
    tutSay("seal", "En el piso hay SELLOS numerados. Activados en orden aturden a la horda y te curan.", "Activá los sellos en orden: I → II → III", 11000);
  if(TUT.key==="seal" && LAB.seals.some(s=>s.lit && s.by===heroes.indexOf(player))) tutDone("seal");
}
// ---- red ----
function labNetState(){ return {s:LAB.seals.map(s=>[s.id, s.n, s.x, s.y, s.lit?1:0, s.prog|0, s.by, s.flash|0]), nx:LAB.next, w:LAB.winT|0}; }
function labApplyNetState(st){
  if(!st) return;
  LAB.next = st.nx; LAB.winT = st.w;
  const old = {}; for(const s of LAB.seals) old[s.id] = s;
  LAB.seals = (st.s||[]).map(a=>{ const s = old[a[0]] || {id:a[0], kind:"lab_seal", r:62, h:64, dur:LAB_CFG.useMs}; s.n = a[1]; s.x = a[2]; s.y = a[3]; s.lit = !!a[4]; s.done = s.lit; s.prog = a[5]; s.by = a[6]; s.flash = a[7]; return s; });
}
// ---- dibujo ----
function labDrawGround(now){
  for(const s of LAB.seals){
    if(!inView(s.x, s.y, 80)) continue;
    const next = s.n === LAB.next && !s.lit;
    ctx.save(); ctx.translate(Math.round(s.x), Math.round(s.y));
    // placa de piedra octogonal
    ctx.fillStyle = "#2a241c"; ctx.strokeStyle = s.lit ? "#ffd27a" : "#8a7350"; ctx.lineWidth = 3;
    ctx.beginPath(); for(let i=0;i<8;i++){ const a = i/8*Math.PI*2 + Math.PI/8; const x = Math.cos(a)*48, y = Math.sin(a)*31; if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill(); ctx.stroke();
    if(s.lit || s.flash > 0){
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 60); g.addColorStop(0, `rgba(255,210,120,${s.lit ? 0.5 : 0.4*s.flash/700})`); g.addColorStop(1, "rgba(255,160,60,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 60, 40, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    // número romano
    ctx.fillStyle = s.lit ? "#fff0c0" : (next ? `rgba(255,207,92,${0.7 + 0.3*Math.sin(now*4)})` : "#c9a56a");
    ctx.font = "bold 24px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,6,2,0.85)"; ctx.strokeText(LAB_NUM[s.n], 0, 1);
    ctx.fillText(LAB_NUM[s.n], 0, 1);
    ctx.restore();
  }
  // cuenta regresiva de la ventana
  if(LAB.winT > 0 && LAB.seals.length && player){
    const secs = Math.ceil(LAB.winT/1000);
    ctx.save(); ctx.fillStyle = secs <= 10 ? "#ff6a4a" : "#ffcf5c"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`Sellos ${LAB.next-1}/3 · ${secs}s`, player.x, player.y + 44); ctx.restore();
  }
}

Object.assign(ARENA_SFX, {
  labSeals:  {p:2, gap:800, play:(t,D)=>{ _tone(t,"sine",110,110,0.8,0.18,D,0.1); _tone(t+0.25,"sine",147,147,0.7,0.14,D,0.1); return 1; }},
  labSealOk: {p:3, gap:200, play:(t,D)=>{ _tone(t,"triangle",330,330,0.35,0.12,D,0.01); _tone(t+0.08,"triangle",495,495,0.4,0.1,D,0.01); _noise(t,0.2,0.1,"lowpass",400,0,D); return 0.5; }},
  labReset:  {p:3, gap:400, play:(t,D)=>{ _tone(t,"sawtooth",160,60,0.5,0.1,D); _noise(t,0.5,0.25,"lowpass",300,0,D); return 0.5; }},
  labSolved: {p:4, gap:500, play:(t,D)=>{ _noise(t,1.0,0.3,"lowpass",200,0,D); [220,277,330,440].forEach((f,i)=>_tone(t+0.1+i*0.1,"triangle",f,f,0.8,0.09,D,0.02)); _duck(0.4,900); return 1.3; }}
});

ARENA_EXT.laberinto = {
  runStart: labRunStart,
  guestStart: labGuestStart,
  update: labUpdate,
  guestUpdate: labGuestUpdate,
  ctxTargets: labCtxTargets,
  drawGround: labDrawGround,
  netState: labNetState,
  applyNetState: labApplyNetState
};
