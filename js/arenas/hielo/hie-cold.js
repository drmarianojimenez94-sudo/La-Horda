"use strict";
/* ============================================================
   js/arenas/hielo/hie-cold.js
   ARENA GÉLIDA — "MOVERSE ES SOBREVIVIR"

   - FRÍO (h._cold 0-100): quedarse quieto enfría (tras un respiro de 1 s); moverse calienta.
     Al llenarse suma una carga de ESCARCHA (el sistema de siempre: ralentiza y a las 4 cargas
     congela). La regla Frío Creciente lo acelera. Nunca daña de golpe: castiga plantarse.
   - BRASEROS (4, fijos): encendidos calientan en un radio visible (el frío baja rápido y la
     escarcha se derrite antes). Se consumen y se APAGAN; se reencienden con la acción
     contextual ("Encender") o con FUEGO: un Muro de Fuego o un proyectil que quema cerca lo
     prende al instante (el fuego acelera el deshielo).
   - Bots: si tienen frío se mueven (o van al brasero encendido más cercano) y reencienden
     braseros cuando al equipo le hace falta.
   Todo lo decide el anfitrión; viaja en hieNetState(). Arte: brasero de piedra existente
   (aidArtInfBrazier) + versión apagada procedural; indicadores procedurales.
   ============================================================ */
const HIE_CFG = {
  grace: 1000,          // ms quieto antes de empezar a enfriar
  stillSpeed: 30,       // u/s: por debajo cuenta como quieto
  coldRate: 13,         // por segundo quieto (x regla)
  warmRate: 22,         // por segundo moviéndose
  fireWarm: 65,         // por segundo al lado de un brasero encendido
  firstLevelMult: 0.6,  // nivel 1: se aprende sin castigo fuerte
  resetTo: 55,          // al sumar una carga de escarcha el frío vuelve acá
  braziers: [0.35, 1.95, 3.5, 5.05], // ángulos (anillo interior)
  ring: 330,
  warmR: 150,
  fuel: [38000, 52000], // ms encendido
  lightMs: 1400,        // mantener para encender
  fireLightR: 60        // fuego a esta distancia lo enciende
};
const HIE = { br:[] };

function hieResetRun(){
  HIE.br = HIE_CFG.braziers.map((a, i)=>{
    const p = aidOnRing(HIE_CFG.ring, HIE_CFG.ring, a);
    return { id:"hb"+i, kind:"hie_brazier", x:Math.round(p.x), y:Math.round(p.y), r:58, h:78,
      lit:true, fuel:HIE_CFG.fuel[0] + i*3500, prog:0, dur:HIE_CFG.lightMs, done:false, by:-1 };
  });
  for(const h of heroes){ h._cold = 0; h._stillT = 0; h._cx = h.x; h._cy = h.y; }
}
function hieRunStart(){ hieResetRun(); }
function hieGuestStart(){ hieResetRun(); }
function hieNearLit(x, y, pad){
  for(const b of HIE.br) if(b.lit && Math.hypot(x-b.x, (y-b.y)*1.25) < HIE_CFG.warmR + (pad||0)) return b;
  return null;
}
function hieLight(b, how){
  if(b.lit) return;
  b.lit = true; b.done = true; b.prog = 0;
  b.fuel = HIE_CFG.fuel[0] + Math.random()*(HIE_CFG.fuel[1]-HIE_CFG.fuel[0]);
  playSfx("hieIgnite");
  vfxBurst(b.x, b.y-30, 14, "ember", 120, 520, 3, 0, -70, 0);
  if(how==="fire") floatText(b.x, b.y-70, "¡El fuego lo enciende!", null);
}
function hieUpdate(dt){
  const lvMult = runLevel <= 1 ? HIE_CFG.firstLevelMult : 1;
  const rule = 1 + 0.05*arenaRuleStacks();
  const sec = dt/1000;
  // braseros: se consumen, se apagan y el fuego los prende
  for(const b of HIE.br){
    if(b.lit){
      b.fuel -= dt;
      if(b.fuel <= 0){
        b.lit = false; b.done = false; b.prog = 0; b.fuel = 0;
        playSfx("hieOut"); vfxBurst(b.x, b.y-34, 8, "stone", 60, 700, 3, 0, -30, 0);
        if(Math.hypot(player.x-b.x, player.y-b.y) < 900) floatText(b.x, b.y-70, "El brasero se apagó", null);

      }
      continue;
    }
    for(const fw of fireWalls){ if(Math.hypot(fw.x-b.x, fw.y-b.y) < (fw.outerR||60) + HIE_CFG.fireLightR){ hieLight(b, "fire"); break; } }
    if(!b.lit) for(const p of projectiles){ if(p.burn && !p.enemy && Math.hypot(p.x-b.x, p.y-(b.y-20)) < HIE_CFG.fireLightR){ hieLight(b, "fire"); break; } }
  }
  // frío de cada héroe
  for(const h of heroes){
    if(h._cold === undefined){ h._cold = 0; h._stillT = 0; h._cx = h.x; h._cy = h.y; }
    const moved = Math.hypot(h.x-h._cx, h.y-h._cy); h._cx = h.x; h._cy = h.y;
    if(!h.alive || runEnding){ h._cold = 0; h._stillT = 0; continue; }
    const warm = hieNearLit(h.x, h.y);
    if(warm){
      h._cold = Math.max(0, h._cold - HIE_CFG.fireWarm*sec); h._stillT = 0;
      if(h.frostTimer > 0){ h.frostTimer -= dt; if(h.frostTimer <= 0) h.frostStacks = 0; } // la escarcha se derrite el doble de rápido
      continue;
    }
    const still = moved < HIE_CFG.stillSpeed*sec || h.stunTimer > 0;
    if(still){ h._stillT += dt; if(h._stillT > HIE_CFG.grace) h._cold += HIE_CFG.coldRate*rule*lvMult*sec; }
    else { h._stillT = 0; h._cold = Math.max(0, h._cold - HIE_CFG.warmRate*sec); }
    if(h._cold >= 100){
      h._cold = HIE_CFG.resetTo;
      addFrost(h, 1);
      vfxBurst(h.x, h.y-18, 6, "ice", 80, 380, 2.5, 2, -20, 0);
      if(h===player){ floatText(h.x, h.y-46, "¡Frío!", "crit"); playSfx("hieChill"); }
    }
  }
  hieTut();
}
function hieGuestUpdate(dt){ hieTut(); }
// Consejos del Hechicero (cada cliente: anfitrión e invitados).
function hieTut(){
  if(!player || !player.alive) return;
  if((player._cold||0) > 45) tutSay("cold", "Acá el frío no mata: espera. Al que se queda quieto, lo guarda para siempre.", "Movete, o calentate junto a un brasero encendido", 10000);
  if(TUT.key==="cold" && hieNearLit(player.x, player.y)) tutDone("cold");
  for(const b of HIE.br){
    if(b.lit || Math.hypot(player.x-b.x, player.y-b.y) > 600) continue;
    tutSay("brazier", "Un fuego apagado todavía recuerda cómo arder.", "Mantené 🔥 junto al brasero (o prendelo con fuego)", 10000);
    break;
  }
  if(TUT.key==="brazier" && HIE.br.some(b=>b.lit && b.by===heroes.indexOf(player))) tutDone("brazier");
}
// ---- acción contextual: encender ----
function hieCtxTargets(){
  const out = [];
  for(const b of HIE.br) if(!b.lit) out.push(b);
  return out;
}
CTX_KINDS.hie_brazier = {
  label:"Encender", icon:"🔥", color:"#ffb347",
  onComplete(b, users){
    b.done = false; hieLight(b, "hero"); b.by = heroes.indexOf(users[0]);
    const who = users[0];
    showBanner(who===player ? "Encendiste el brasero" : `${heroLabel(who)} encendió un brasero`);
  },
  botWorth(h, b){
    let cold = 0, n = 0; for(const o of heroes){ if(o.alive){ cold += o._cold||0; n++; } }
    cold = n ? cold/n : 0;
    return (cold > 30 || bossActive || (h._cold||0) > 40) ? 2 : 0.5;
  }
};
// Bots con frío: se mueven (o van al brasero encendido más cercano).
function hieBotNudge(h, target){
  const c = h._cold||0;
  if(h._hieWarm && c < 12) h._hieWarm = false;
  if(c < 45 && !h._hieWarm) return null;
  let best = null, bd = 700;
  for(const b of HIE.br){ if(!b.lit) continue; const d = Math.hypot(b.x-h.x, b.y-h.y); if(d < bd){ bd = d; best = b; } }
  if(best && (c > 60 || h._hieWarm)){
    h._hieWarm = true;
    if(bd < 60) return {mx:0, my:0, target};
    return {mx:(best.x-h.x)/bd, my:(best.y-h.y)/bd, target};
  }
  // sin brasero cerca: se mueve en círculo alrededor de su objetivo (o del lugar)
  const ox = target ? target.x : h.x+1, oy = target ? target.y : h.y;
  const dx = h.x-ox, dy = h.y-oy, l = Math.hypot(dx, dy)||1;
  const side = (h._hieSide || (h._hieSide = Math.random()<0.5 ? 1 : -1));
  return {mx:-dy/l*side*0.9 + dx/l*0.1, my:dx/l*side*0.9 + dy/l*0.1, target};
}
// ---- red ----
function hieNetState(){
  return {b:HIE.br.map(b=>[b.lit?1:0, b.fuel|0, b.prog|0, b.by]), c:heroes.map(h=>Math.round(h._cold||0))};
}
function hieApplyNetState(s){
  if(!s) return;
  if(s.b) s.b.forEach((a, i)=>{ const b = HIE.br[i]; if(!b) return; b.lit = !!a[0]; b.fuel = a[1]; b.prog = a[2]; b.by = a[3]; b.done = b.lit; });
  if(s.c) s.c.forEach((v, i)=>{ if(heroes[i]) heroes[i]._cold = v; });
}
// ---- dibujo ----
function hieArtBrazierOff(){
  return aidArt("hieBrazierOff", 18, 26, (g)=>{
    aidPx(g, 3, 8, 12, 5, "#2a2e36"); aidPx(g, 2, 7, 14, 2, "#56606e"); aidPx(g, 4, 12, 10, 2, "#161a20");
    aidPx(g, 8, 13, 2, 9, "#2a2e36"); aidPx(g, 4, 21, 10, 2, "#2a2e36"); aidPx(g, 3, 23, 2, 3, "#161a20"); aidPx(g, 13, 23, 2, 3, "#161a20");
    aidPx(g, 4, 6, 10, 2, "#3a3a40"); aidPx(g, 5, 7, 3, 1, "#cfe6ff"); aidPx(g, 11, 6, 2, 1, "#cfe6ff"); // brasas frías + escarcha
  });
}
function hieDrawGround(now){
  // zona de calor de cada brasero encendido
  for(const b of HIE.br){
    if(!b.lit || !inView(b.x, b.y, HIE_CFG.warmR+20)) continue;
    const low = b.fuel < 8000 ? 0.5 + 0.5*Math.sin(now*9) : 1; // parpadea cuando se está por apagar
    ctx.save();
    // (sobre el hielo blanco lo aditivo no se ve: tinte normal + borde marcado)
    const g = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, HIE_CFG.warmR);
    g.addColorStop(0, `rgba(255,150,60,${0.30*low})`); g.addColorStop(0.75, `rgba(255,130,50,${0.14*low})`); g.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(b.x, b.y, HIE_CFG.warmR, HIE_CFG.warmR*0.8, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(230,110,30,${0.75*low})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.ellipse(b.x, b.y, HIE_CFG.warmR, HIE_CFG.warmR*0.8, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  // escarcha bajo los pies de quien tiene frío
  for(const h of heroes){
    const c = h._cold||0; if(!h.alive || c < 20 || !inView(h.x, h.y, 60)) continue;
    const a = Math.min(1, (c-20)/70);
    ctx.save();
    ctx.strokeStyle = `rgba(190,230,255,${0.75*a})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y+4, 20+a*10, 8+a*4, 0, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = `rgba(170,215,255,${0.22*a})`; ctx.fill();
    // cristales que crecen alrededor
    const n = Math.floor(a*6);
    for(let i=0;i<n;i++){ const an = i/6*Math.PI*2 + 0.3; const x = h.x + Math.cos(an)*(22+a*8), y = h.y + 4 + Math.sin(an)*(9+a*3); ctx.fillStyle = "#dff2ff"; ctx.fillRect(Math.round(x)-1, Math.round(y)-4, 2, 5); }
    ctx.restore();
  }
}
function hiePushTall(){
  for(let i=0;i<HIE.br.length;i++){ const b = HIE.br[i]; if(inView(b.x, b.y-30, 90)) _entPush(b.y, null, null, null, {arena:1, hieBr:i+1}); }
}
function hieDrawTall(it, now){
  const b = HIE.br[it.hieBr-1]; if(!b) return;
  const img = b.lit ? aidArtInfBrazier() : hieArtBrazierOff();
  aidDrawProp({img, x:b.x, y:b.y, w:img.width*AID_SCALE*1.2, h:img.height*AID_SCALE*1.2, ay:0.94, flip:false, alpha:1});
  if(b.lit){
    // llama viva (procedural encima del bol)
    const top = b.y - img.height*AID_SCALE*1.2*0.94 + 14, f = 0.7 + 0.3*Math.sin(now*14 + b.x);
    ctx.save();
    ctx.fillStyle = "#e0501a"; ctx.beginPath(); ctx.ellipse(b.x, top-6, 10, 15*f, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#ffa23a"; ctx.beginPath(); ctx.ellipse(b.x, top-4, 7, 10*f, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#ffe08a"; ctx.beginPath(); ctx.ellipse(b.x, top-1, 3, 6*f, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    if(vfxLoad < 0.85 && Math.random() < 0.25) particles.push({x:b.x+(Math.random()-0.5)*12, y:top-8, vx:(Math.random()-0.5)*12, vy:-40-Math.random()*30, life:600, color:Math.random()<0.5?"#ffb347":"#ff7a2a"});
  }
}
function hieDrawTop(){
  // medidor de frío del jugador (sobre la cabeza) cuando empieza a enfriarse
  const h = player; const c = h && h._cold || 0;
  if(!h || !h.alive || c < 15) return;
  const w = 34, x = Math.round(h.x - w/2), y = Math.round(h.y - (h.radius||18)*3.3 - 10);
  ctx.save();
  ctx.fillStyle = "rgba(8,14,22,0.8)"; ctx.fillRect(x-1, y-1, w+2, 6);
  ctx.fillStyle = c > 75 ? (Math.sin(animNow/90) > 0 ? "#e8f6ff" : "#7fc4ff") : "#7fc4ff";
  ctx.fillRect(x, y, Math.round(w*Math.min(1, c/100)), 4);
  ctx.fillStyle = "#dff2ff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText("❄", x-3, y+2);
  ctx.restore();
}
function hieDrawScreen(){
  // borde de escarcha en la pantalla cuando el jugador tiene mucho frío
  const c = player && player.alive ? (player._cold||0) : 0;
  if(c < 45) return;
  const a = Math.min(1, (c-45)/50);
  ctx.save();
  const g = ctx.createRadialGradient(VW/2, VH/2, Math.min(VW, VH)*0.35, VW/2, VH/2, Math.max(VW, VH)*0.72);
  g.addColorStop(0, "rgba(180,225,255,0)"); g.addColorStop(1, `rgba(200,235,255,${0.45*a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}

Object.assign(ARENA_SFX, {
  hieIgnite: {p:3, gap:300, play:(t,D)=>{ _noise(t,0.5,0.25,"bandpass",900,0.8,D); _tone(t,"sine",160,260,0.3,0.12,D,0.02); return 0.5; }},
  hieOut:    {p:2, gap:600, play:(t,D)=>{ _noise(t,0.7,0.18,"lowpass",500,0,D); return 0.7; }},
  hieChill:  {p:2, gap:700, play:(t,D)=>{ [1320,1760,2093].forEach((f,i)=>_tone(t+i*0.05,"sine",f,f*0.9,0.3,0.05,D,0.01)); _noise(t,0.3,0.08,"highpass",5000,0,D); return 0.4; }}
});

ARENA_EXT.hielo = {
  runStart: hieRunStart,
  guestStart: hieGuestStart,
  update: hieUpdate,
  guestUpdate: hieGuestUpdate,
  ctxTargets: hieCtxTargets,
  botNudge: hieBotNudge,
  drawGround: hieDrawGround,
  pushTall: hiePushTall,
  drawTall: hieDrawTall,
  drawTop: hieDrawTop,
  drawScreen: hieDrawScreen,
  netState: hieNetState,
  applyNetState: hieApplyNetState
};
