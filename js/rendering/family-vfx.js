"use strict";
/* ============================================================
   js/rendering/family-vfx.js — VFX elevados de las campeonas FAMILY (Mila = myla, Inara = ynara).
   Solo cosmético: no toca daño, radios ni hitboxes. Se deriva del estado sincronizado (portadorObjects,
   enemigos y héroes), así que invitados y anfitrión ven lo mismo sin mensajes nuevos.
   Pool fijo (FAM_MAX) reutilizado; fxBudget() recorta con "Reducir efectos intensos" y sin destellos
   de pantalla completa. Lectura sin color: yogur = gotas redondas, llanto = medialunas, paciencia =
   cuentas de rosario + cruces sanitarias.
   ============================================================ */
const FAM_MAX = 180;
const famPool = Array.from({length:FAM_MAX}, ()=>({on:false}));
const famRings = []; // ondas expansivas (máx. 12)
const famSeen = new Map(); // id de objeto -> {kind,x,y,owner}
let famLastT = 0;
function famSpawn(kind, x, y, vx, vy, life, size, color){
  for(const p of famPool){ if(p.on) continue; Object.assign(p, {on:true, kind, x, y, vx, vy, life, max:life, size, color, rot:Math.random()*6.28}); return p; }
  return null;
}
function famRing(x, y, r0, r1, life, color, width, style){ if(famRings.length >= 12) famRings.shift(); famRings.push({x, y, r0, r1, life, max:life, color, width, style}); }
function famBurst(x, y, n, speed, colors, kind, size, life){
  n = fxBudget(n);
  for(let i=0;i<n;i++){ const a = Math.random()*6.283, s = speed*(.4+Math.random()*.8); famSpawn(kind, x, y, Math.cos(a)*s, Math.sin(a)*s - speed*.4, life*(.7+Math.random()*.5), size*(.6+Math.random()*.7), colors[i%colors.length]); }
}
/* ---------------- Mila ---------------- */
const MILA_PINK = ["#ff8fc3", "#ffd6e8", "#fff4f8", "#f05a9a"];
function famMilaTantrum(o, dt, t){
  // ondas rosas + medialunas de llanto + salpicaduras de yogur sobre los enemigos dentro
  o._famT = (o._famT || 0) - dt;
  if(o._famT <= 0){
    o._famT = JUICE.reduceFx ? 520 : 300;
    famRing(o.x, o.y - 6, 18, o.r, 700, "#ff8fc3", 7, "wave");
    if(!JUICE.reduceFx) famRing(o.x, o.y - 6, 10, o.r*.8, 900, "#fff4f8", 4, "cry");
    famBurst(o.x, o.y - 26, 8, 240, MILA_PINK, "drop", 7, 800);
    let n = 0;
    for(const e of enemies){ if(n >= fxBudget(5)) break; if(!e.alive || distance(e, o) > o.r) continue; n++;
      famBurst(e.x, e.y - 10, 4, 140, MILA_PINK, "drop", 5, 480); famSpawn("splat", e.x, e.y + 4, 0, 0, 900, 9 + Math.random()*5, MILA_PINK[n%2]); }
  }
}
function famMilaSplash(o){ famRing(o.x, o.y, 10, o.r*1.1, 600, "#ff8fc3", 5, "wave"); famBurst(o.x, o.y - 8, 18, 260, MILA_PINK, "drop", 5, 800); famSpawn("splat", o.x, o.y + 2, 0, 0, 1600, o.r*.55, "#ffd6e8"); }
function famMilaFinale(s){ famRing(s.x, s.y, 20, s.r*1.35, 900, "#f05a9a", 6, "wave"); famRing(s.x, s.y, 10, s.r*1.1, 1100, "#fff4f8", 3, "cry"); famBurst(s.x, s.y - 20, 28, 320, MILA_PINK, "drop", 6, 1000); }
/* ---------------- Inara ---------------- */
const INARA_GOLD = ["#fff8ed", "#ffe6a8", "#ffd0dc", "#b8f0ff"];
function famInaraPatience(o, t){
  // halo de 8 cuentas (se encienden con las cargas), columna de luz y cruces sanitarias que suben
  const h = o.owner, cx = h.x, cy = h.y - 62;
  ctx.save();
  ctx.globalAlpha = .32; const grd = ctx.createLinearGradient(cx, cy - 160, cx, h.y);
  grd.addColorStop(0, "rgba(255,248,237,0)"); grd.addColorStop(1, "rgba(255,248,237,.9)"); ctx.fillStyle = grd; ctx.fillRect(cx - 26, cy - 170, 52, 170 + 62);
  ctx.globalAlpha = .95;
  for(let i=0;i<8;i++){ const a = -Math.PI/2 + i*Math.PI/4 + t*.6, x = cx + Math.cos(a)*40, y = cy + Math.sin(a)*15, lit = i < (o.charges||0);
    ctx.beginPath(); ctx.arc(x, y, lit ? 6 : 4, 0, Math.PI*2); ctx.fillStyle = lit ? "#ffe6a8" : "#58445b"; ctx.fill(); ctx.strokeStyle = "#34283c"; ctx.lineWidth = 2; ctx.stroke(); if(lit){ ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 1.5, y - 2.5, 2, 2); } }
  ctx.beginPath(); ctx.ellipse(cx, cy, 40, 15, 0, 0, Math.PI*2); ctx.strokeStyle = "#ffe6a8"; ctx.lineWidth = 2.5; ctx.globalAlpha = .85; ctx.stroke();
  ctx.restore();
  if(Math.random() < (JUICE.reduceFx ? .08 : .25)) famSpawn("cross", h.x + (Math.random()-.5)*o.r*1.4, h.y + (Math.random()-.5)*o.r*.8, 0, -28, 1100, 4, INARA_GOLD[(Math.random()*4)|0]);
}
function famInaraFinale(s){
  // EL momento de Santa Paciencia: halo que se abre, rayos, plumas y las cuentas que estallan
  famRing(s.x, s.y - 40, 20, s.r*1.25, 1100, "#fff8ed", 10, "halo"); famRing(s.x, s.y - 40, 30, s.r*1.6, 1300, "#ffe6a8", 5, "halo");
  famRing(s.x, s.y - 40, 10, s.r*1.05, 1300, "#ffd36b", 6, "rays");
  famBurst(s.x, s.y - 44, 14 + (s.charges||0)*4, 300, INARA_GOLD, "feather", 9, 1400);
  famBurst(s.x, s.y - 44, 8, 180, ["#ffe6a8"], "cross", 5, 1000);
}
function famInaraAura(h, t){
  const imm = h.ynImmaculate;
  ctx.save(); ctx.globalAlpha = imm ? .55 : .25; ctx.strokeStyle = "#fff8ed"; ctx.lineWidth = imm ? 2 : 1;
  ctx.beginPath(); ctx.ellipse(h.x, h.y - 52, 10, 3.5, 0, 0, Math.PI*2); ctx.stroke(); // aureola
  if(imm){ ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(h.x, h.y - 22, 26 + Math.sin(t*3)*1.5, 0, Math.PI*2); ctx.stroke(); }
  ctx.restore();
  if(Math.random() < (JUICE.reduceFx ? .02 : .06)) famSpawn("cross", h.x + (Math.random()-.5)*30, h.y - 10 - Math.random()*30, 0, -16, 900, 3, "#ffe6a8");
}
/* ---------------- dibujo del pool ---------------- */
function famDrawParticle(p, a){
  ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
  switch(p.kind){
    case "drop": ctx.beginPath(); ctx.arc(p.x, p.y, p.size*.5, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = "#5a1a3a"; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.globalAlpha = a*.6; ctx.fillRect(p.x - p.size*.2, p.y - p.size*.3, 1.5, 1.5); break;
    case "splat": ctx.globalAlpha = a*.55; ctx.beginPath(); for(let i=0;i<7;i++){ const ang = i*.9 + p.rot, r = p.size*(i%2 ? .55 : 1); ctx.lineTo(p.x + Math.cos(ang)*r, p.y + Math.sin(ang)*r*.5); } ctx.closePath(); ctx.fill(); break;
    case "cross": ctx.fillRect(p.x - p.size*.5, p.y - 1, p.size, 2); ctx.fillRect(p.x - 1, p.y - p.size*.5, 2, p.size); break;
    case "feather": ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size*.35, 0, 0, Math.PI*2); ctx.fill(); ctx.restore(); break;
  }
}
function famDrawRing(r){
  const u = 1 - r.life/r.max, rad = r.r0 + (r.r1 - r.r0)*u; ctx.globalAlpha = Math.min(1, (1 - u)*1.2); ctx.strokeStyle = r.color; ctx.lineWidth = r.width;
  if(r.style === "cry"){ for(let i=0;i<6;i++){ const a = i*Math.PI/3 + u; ctx.beginPath(); ctx.arc(r.x, r.y, rad, a, a + .5); ctx.stroke(); } }
  else if(r.style === "rays"){ for(let i=0;i<12;i++){ const a = i*Math.PI/6; ctx.beginPath(); ctx.moveTo(r.x + Math.cos(a)*rad*.4, r.y + Math.sin(a)*rad*.4*.5); ctx.lineTo(r.x + Math.cos(a)*rad, r.y + Math.sin(a)*rad*.5); ctx.stroke(); } }
  else if(r.style === "halo"){ ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad*.42, 0, 0, Math.PI*2); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI*2); ctx.stroke(); }
}
function famVfxFrame(){
  const now = animNow, dt = famLastT ? Math.min(60, now - famLastT) : 16; famLastT = now;
  const t = now/1000, alive = new Set();
  ctx.save();
  for(const o of portadorObjects){
    if(o.life <= 0 || !o.owner) continue;
    const k = o.owner.classKey;
    if(k !== "myla" && k !== "ynara") continue;
    alive.add(o.id);
    if(!famSeen.has(o.id)){ famSeen.set(o.id, {kind:o.kind, x:o.x, y:o.y, r:o.r, charges:0}); if(o.kind === "yogurt") famMilaSplash(o); }
    const s = famSeen.get(o.id); s.x = o.x; s.y = o.y; s.r = o.r; s.charges = o.charges || 0;
    if(o.kind === "tantrum") famMilaTantrum(o, dt, t);
    if(o.kind === "patience") famInaraPatience(o, t);
    if(o.kind === "yogurt" && Math.random() < .06) famSpawn("drop", o.x + (Math.random()-.5)*o.r, o.y + (Math.random()-.5)*o.r*.5, 0, -40, 500, 3, "#ffd6e8");
  }
  for(const [id, s] of famSeen) if(!alive.has(id)){ famSeen.delete(id); if(s.kind === "tantrum") famMilaFinale(s); if(s.kind === "patience") famInaraFinale(s); }
  for(const h of heroes){ if(!h.alive) continue;
    if(h.classKey === "ynara") famInaraAura(h, t);
    if(h.classKey === "myla" && h.shield > 0){ ctx.save(); ctx.globalAlpha = .35; ctx.strokeStyle = "#ff8fc3"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y - 22, 25, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = .7; ctx.fillStyle = "#fff4f8"; ctx.fillRect(h.x - 12, h.y - 38, 3, 3); ctx.restore(); }
  }
  for(let i = famRings.length - 1; i >= 0; i--){ const r = famRings[i]; r.life -= dt; if(r.life <= 0){ famRings.splice(i, 1); continue; } famDrawRing(r); }
  for(const p of famPool){ if(!p.on) continue; p.life -= dt; if(p.life <= 0){ p.on = false; continue; }
    const s = dt/1000; p.x += p.vx*s; p.y += p.vy*s; if(p.kind === "drop"){ p.vy += 520*s; } if(p.kind === "feather"){ p.vx *= .97; p.vy = p.vy*.96 + 14*s; p.rot += s*3; }
    famDrawParticle(p, Math.min(1, p.life/p.max*1.6)); }
  ctx.restore();
}
if(typeof drawPortadorTop === "function"){
  const famOriginalTop = drawPortadorTop;
  drawPortadorTop = function(){ famOriginalTop(); try{ famVfxFrame(); }catch(e){} };
}
if(typeof portadorReset === "function"){
  const famOriginalReset = portadorReset;
  portadorReset = function(){ famSeen.clear(); famRings.length = 0; for(const p of famPool) p.on = false; return famOriginalReset.apply(this, arguments); };
}
