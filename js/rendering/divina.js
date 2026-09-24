"use strict";
/* ============================================================
   js/rendering/divina.js
   Dibujo de torres, castillos, barras de vida, auras y proyectiles de la Arena Divina.
   ============================================================ */

// ---------------- Arena Divina: estructuras por facción (arte del Pack 5) ----------------
// Tu bando (sur) usa la Torre/Castillo Celestial; el rival (norte), la Torre/Castillo Infernal.
// Antes los dos bandos usaban exactamente el mismo sprite violeta. Estados: normal, golpeado
// (destello al recibir daño), dañado (humo y fuego según la vida que le queda) y destruido
// (ruina generada del mismo sprite: la base quebrada y oscurecida, con escombros).
function divinaFactionImg(s){
  const cel = s.side==="player";
  if(s.type==="castle") return cel ? DIVINA_FACTION_IMG.castle_cel : DIVINA_FACTION_IMG.castle_inf;
  const n = cel ? 4 : 3;
  const idx = ((Math.abs(Math.round(s.x*0.37+s.y*0.11)) % n) + 1);
  return DIVINA_FACTION_IMG[(cel ? "tower_cel_" : "tower_inf_") + idx];
}
const _divinaRuinCache = new Map();
function divinaRuinImg(img){
  let c = _divinaRuinCache.get(img);
  if(c) return c;
  const keep = Math.round(img.height*0.36);
  c = document.createElement("canvas"); c.width = img.width; c.height = keep + 6;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, img.height-keep, img.width, keep, 0, 6, img.width, keep);
  // borde superior quebrado en dientes irregulares
  g.globalCompositeOperation = "destination-out";
  let x = 0; while(x < c.width){ const w = 3+Math.random()*7, d = 2+Math.random()*(keep*0.45); g.fillRect(x, 0, w, d); x += w; }
  // oscurecido y chamuscado
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "rgba(20,14,18,0.55)"; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "source-over";
  // escombros al pie
  for(let i=0;i<Math.round(c.width/5);i++){ const rx = Math.random()*c.width, s = 2+Math.random()*4; g.fillStyle = Math.random()<0.5 ? "#2a2430" : "#4a4250"; g.fillRect(rx, c.height-3-Math.random()*6, s, s*0.7); }
  _divinaRuinCache.set(img, c);
  return c;
}
function divinaStructFx(s, now, topY){
  // humo y fuego progresivos según el daño (solo en cámara; prioridad baja: se recortan con carga)
  const pct = s.hp/(s.maxHp||1);
  if(!inView(s.x, s.y, 120)) return;
  if(pct < 0.6 && Math.random() < (0.6-pct)*0.18) vfxBurst(s.x+(Math.random()-0.5)*s.radius*1.2, topY+Math.random()*30, 1, "rock", 30, 1200, 4, 0, -50, 0);
  if(pct < 0.35 && Math.random() < 0.10) vfxBurst(s.x+(Math.random()-0.5)*s.radius, topY+20+Math.random()*30, 2, "ember", 60, 500, 3, 0, -80, 0);
}
function drawDivinaFactionStructure(s, now){
  const img = divinaFactionImg(s);
  if(!img || !img.complete || !img.width) return false;
  const castle = s.type==="castle";
  const targetH = castle ? 190 : (s.type==="midtower" ? 118 : 128);
  const sc = targetH/img.height;
  const clip = { frames:[{x:0, y:0, w:img.width, h:img.height}] };
  if(!s.alive){
    const ruin = divinaRuinImg(img);
    const rclip = { frames:[{x:0, y:0, w:ruin.width, h:ruin.height}] };
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(s.x, s.y+6, img.width*sc*0.42, castle?24:12, 0, 0, 6.283); ctx.fill(); ctx.restore();
    drawAnimFrameSized(ruin, rclip, 0, s.x, s.y, ruin.width*sc, ruin.height*sc, 0.5, 0.9, false, 1);
    if(inView(s.x, s.y, 100) && Math.random() < 0.05) vfxBurst(s.x+(Math.random()-0.5)*s.radius, s.y-ruin.height*sc*0.4, 1, "rock", 26, 1400, 4, 0, -40, 0);
    return true;
  }
  drawDivinaTeamAura(s.x, s.y+(castle?16:10), castle?130:46, castle?40:20, s.side, castle?1.2:1);
  // leve respiración de brillo en vez de alternar frames (el arte del pack es una sola pose)
  drawAnimFrameSized(img, clip, 0, s.x, s.y, img.width*sc, img.height*sc, 0.5, castle?0.86:0.92, false, 1);
  const since = animNow - (s._hitAt||-9999);
  if(since < 140){
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    drawAnimFrameSized(img, clip, 0, s.x, s.y, img.width*sc, img.height*sc, 0.5, castle?0.86:0.92, false, 0.55*(1-since/140));
    ctx.restore();
  }
  // grietas oscuras sobre la estructura dañada (se leen aun sin partículas)
  const pct = s.hp/(s.maxHp||1);
  if(pct < 0.5){
    const top = s.y - img.height*sc*(castle?0.86:0.92);
    ctx.save(); ctx.strokeStyle = `rgba(20,10,10,${0.35+0.4*(0.5-pct)})`; ctx.lineWidth = 2;
    const n = pct < 0.25 ? 5 : 3;
    for(let i=0;i<n;i++){ const cx = s.x + ((i*37)%70-35)*(castle?2:0.6), cy = top + img.height*sc*(0.35+((i*23)%40)/100);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+6, cy+10); ctx.lineTo(cx+2, cy+18); ctx.lineTo(cx+9, cy+28); ctx.stroke(); }
    ctx.restore();
    divinaStructFx(s, now, top + img.height*sc*0.25);
  }
  return true;
}
function drawDivinaStructProjectiles(){
  for(const p of divinaStructProjectiles){
    if(DIVINA_PROJ_REAL_READY.frame1){
      const seq = ["frame1","frame2","frame3","frame4","frame5"];
      const key = seq[Math.floor(p.animT/60)%seq.length];
      const img = DIVINA_PROJ_REAL_READY[key] ? DIVINA_PROJ_REAL_IMG[key] : DIVINA_PROJ_REAL_IMG.frame1;
      const targetH = 34, sc = targetH/img.height;
      const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
      drawAnimFrameSized(img, clip, 0, p.x, p.y, img.width*sc, img.height*sc, 0.5, 0.5, false, 1);
    } else {
      ctx.save(); ctx.globalCompositeOperation="lighter";
      ctx.fillStyle = "rgba(210,150,255,0.85)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
}

// ---- Colores de equipo: anillo bajo los pies de cada campeón (tuyo o rival) mientras estás
// en la Arena Divina, para distinguir a simple vista quién pelea para cada bando.
function drawDivinaTeamRing(ent, side){
  // Pedido explícito: "es un juego 2D, no alcanza un circulito" -además del anillo en el piso
  // (que sigue marcando bien la posición exacta) suma un halo de color detrás de todo el
  // cuerpo (drawDivinaTeamAura, mismo criterio que ya usan las estructuras).
  const r = ent.radius||24;
  drawDivinaTeamAura(ent.x, ent.y+r*0.5, r*1.5, r*0.9, side, 0.85);
  const col = side==="enemy" ? "#ff5a6a" : "#4ac8ff";
  const pulse = 0.6+0.4*Math.sin(performance.now()/260 + ent.x*0.01);
  ctx.save();
  ctx.globalAlpha = 0.5+0.25*pulse;
  ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.shadowColor = col; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.ellipse(ent.x, ent.y+r*0.5, r*1.05, r*0.42, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}
function drawDivinaHpBar(s){
  const w = s.type==="castle" ? 130 : 56, h = 6, y = s.y - (s.type==="castle" ? 175 : 118);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(s.x-w/2-1, y-1, w+2, h+2);
  ctx.fillStyle = s.side==="enemy" ? "#5a2a3a" : "#2a3a5a"; ctx.fillRect(s.x-w/2, y, w, h);
  const pct = Math.max(0, s.hp/s.maxHp);
  ctx.fillStyle = s.side==="enemy" ? "#e04a5a" : "#4a8ae0"; ctx.fillRect(s.x-w/2, y, w*pct, h);
  ctx.restore();
}
// Aura de equipo más visible que un simple anillo en el piso (pedido explícito: "no alcanza un
// circulito"): un halo de color detrás de todo el cuerpo, rojo para el bando rival y celeste
// para el propio. La usan tanto las estructuras (ver más abajo) como drawDivinaTeamRing (heroes/
// minions), así el criterio visual es el mismo en todas partes.
function drawDivinaTeamAura(x, y, rx, ry, side, strength){
  const col = side==="enemy" ? "255,90,100" : "80,200,255";
  const pulse = 0.65+0.35*Math.sin(performance.now()/300 + x*0.01);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, rx*0.15, x, y, rx*1.35);
  g.addColorStop(0, `rgba(${col},${(0.30+0.14*pulse)*strength})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rx*1.35, ry*1.35, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.55+0.3*pulse;
  ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 2.4; ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}
function drawDivinaTower(s, now){
  if(drawDivinaFactionStructure(s, now)){ if(s.alive) drawDivinaHpBar(s); return; }
  const {x,y} = s;
  if(!s.alive){
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0,10,30,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#241c30"; ctx.fillRect(-24,-8,48,18); ctx.fillRect(-16,-24,20,16); ctx.fillRect(6,-16,16,10);
    ctx.restore();
    return;
  }
  drawDivinaTeamAura(x, y+10, 46, 20, s.side, 1);
  if(DIVINA_TOWER_REAL_READY.frame1){
    const seq = ["frame1","frame2","frame3","frame4","frame5"];
    const key = seq[Math.floor(now*2.2 + x*0.02) % seq.length];
    const img = DIVINA_TOWER_REAL_READY[key] ? DIVINA_TOWER_REAL_IMG[key] : DIVINA_TOWER_REAL_IMG.frame1;
    const targetH = 128, sc = targetH/img.height;
    const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
    drawAnimFrameSized(img, clip, 0, x, y, img.width*sc, img.height*sc, 0.5, 0.92, false, 1);
    drawDivinaHpBar(s);
    return;
  }
  const pulse = 0.6+0.4*Math.sin(now*1.6 + x*0.01);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0,10,30,12,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#2a2038"; ctx.fillRect(-26,-90,52,100);
  ctx.fillStyle = "#4a3a64"; ctx.fillRect(-22,-86,44,92);
  ctx.fillStyle = "#5e4a7e"; ctx.fillRect(-22,-86,44,14);
  for(let i=-2;i<=2;i++){ ctx.fillStyle="#3a2c54"; ctx.fillRect(i*9-4,-100,7,12); }
  ctx.fillStyle = `rgba(200,140,255,${0.7*pulse+0.3})`;
  ctx.beginPath(); ctx.arc(0,-96,6,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation="lighter";
  const g = ctx.createRadialGradient(0,-96,2,0,-96,40);
  g.addColorStop(0, `rgba(210,150,255,${0.35*pulse})`); g.addColorStop(1,"rgba(210,150,255,0)");
  ctx.fillStyle=g; ctx.fillRect(-40,-136,80,80);
  ctx.restore();
  ctx.restore();
  drawDivinaHpBar(s);
}
function drawDivinaCastle(s, now){
  const {x,y} = s;
  const protectedNow = s.alive && castleProtected(s.side);
  if(drawDivinaFactionStructure(s, now)){
    if(protectedNow){
      ctx.save();
      const pulseS = 0.6+0.4*Math.sin(now*1.2);
      ctx.globalAlpha = 0.35+0.15*pulseS;
      ctx.strokeStyle = s.side==="player" ? "#ffe8a0" : "#ff7a9a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y-40, 110, 90, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    if(s.alive) drawDivinaHpBar(s);
    return;
  }
  if(!s.alive){
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0,16,90,22,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1c1626"; ctx.fillRect(-70,-40,140,70);
    ctx.fillStyle="#120c1c"; ctx.fillRect(-40,-70,26,40); ctx.fillRect(10,-58,30,30);
    ctx.restore();
    return;
  }
  drawDivinaTeamAura(x, y+16, 130, 40, s.side, 1.2);
  if(DIVINA_CASTLE_REAL_READY.frame1){
    const key = Math.floor(now*1.4 + x*0.02) % 2 === 0 ? "frame1" : "frame2";
    const img = DIVINA_CASTLE_REAL_READY[key] ? DIVINA_CASTLE_REAL_IMG[key] : DIVINA_CASTLE_REAL_IMG.frame1;
    const targetH = 190, sc = targetH/img.height;
    const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
    drawAnimFrameSized(img, clip, 0, x, y, img.width*sc, img.height*sc, 0.5, 0.86, false, 1);
    if(protectedNow){
      ctx.save();
      const pulseS = 0.6+0.4*Math.sin(now*1.2);
      ctx.globalAlpha = 0.35+0.15*pulseS;
      ctx.strokeStyle = "#9fe8ff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y-40, 110, 90, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    drawDivinaHpBar(s);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  const pulse = 0.6+0.4*Math.sin(now*1.2);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0,16,90,22,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#241c34"; ctx.fillRect(-90,-110,180,140);
  ctx.fillStyle = "#3c2e58"; ctx.fillRect(-84,-104,168,130);
  ctx.fillStyle = "#503c78"; ctx.fillRect(-84,-104,168,16);
  [-70,70].forEach(dx=>{
    ctx.fillStyle="#241c34"; ctx.fillRect(dx-16,-138,32,60);
    ctx.fillStyle="#4a3a6e"; ctx.fillRect(dx-12,-134,24,52);
    for(let i=-1;i<=1;i++){ ctx.fillStyle="#241c34"; ctx.fillRect(dx+i*8-3,-140,6,10); }
  });
  ctx.fillStyle = "#120c1c"; ctx.beginPath();
  ctx.moveTo(-24,30); ctx.lineTo(-24,-16); ctx.quadraticCurveTo(0,-40,24,-16); ctx.lineTo(24,30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(220,160,255,${0.55*pulse+0.35})`;
  ctx.beginPath(); ctx.ellipse(0,-70,16,10,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#150a24"; ctx.beginPath(); ctx.ellipse(0,-70,7,7,0,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation="lighter";
  const g = ctx.createRadialGradient(0,-70,4,0,-70,90);
  g.addColorStop(0, `rgba(210,150,255,${0.3*pulse})`); g.addColorStop(1,"rgba(210,150,255,0)");
  ctx.fillStyle=g; ctx.fillRect(-90,-160,180,180);
  ctx.restore();
  // Escudo visible mientras el castillo esté protegido por sus torres
  if(protectedNow){
    ctx.save();
    ctx.globalAlpha = 0.35+0.15*pulse;
    ctx.strokeStyle = "#9fe8ff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0,-40,110,90,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  drawDivinaHpBar(s);
}
