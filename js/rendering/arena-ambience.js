"use strict";
/* ============================================================
   js/rendering/arena-ambience.js
   Ambiente dinámico de cada arena (brasas, nieve, hojas, burbujas) e iluminación.
   ============================================================ */

// ---------------- Ambiente dinámico (pool fijo, presupuesto según carga) ----------------
const AID_AMB_MAX = 150;
const aidAmb = [];
for(let i=0;i<AID_AMB_MAX;i++) aidAmb.push({on:false, x:0, y:0, vx:0, vy:0, life:0, max:1, k:0, s:1, ph:0});
let aidAmbN = 0, aidEruptT = 0, aidWind = 0;
// presupuesto base por arena (se multiplica por vfxLoad: con hordas o FPS bajos, baja solo)
const AID_AMB_BUDGET = { infernal:70, hielo:120, bosque:60, laberinto:50, acuatica:60, divina:60 };
function aidAmbReset(){ for(const p of aidAmb) p.on = false; aidAmbN = 0; aidEruptT = 1500; }
// kinds: 1 ceniza, 2 copo de nieve, 3 ráfaga (línea de viento), 4 hoja, 5 luciérnaga, 6 polvo,
// 7 mota marina, 8 mota sagrada (dorada), 9 brasa infernal (divina norte)
function aidAmbSpawn(p, A, fresh){
  const hw = VW/2/CAM_ZOOM + 60, hh = VH/2/CAM_ZOOM + 60;
  const rx = player.x + (Math.random()*2-1)*hw, ry = player.y + (Math.random()*2-1)*hh;
  p.on = true; p.ph = Math.random()*6.283; p.x = rx; p.y = ry;
  if(A==="infernal"){ p.k = 1; p.vx = 8+Math.random()*10; p.vy = 14+Math.random()*16; p.s = 1.5+Math.random()*1.5; p.max = 5000+Math.random()*4000; }
  else if(A==="hielo"){ if(Math.random()<0.16){ p.k = 3; p.vx = 380+Math.random()*120; p.vy = 60+Math.random()*30; p.s = 26+Math.random()*30; p.max = 900; } else { p.k = 2; p.vx = 60+Math.random()*50; p.vy = 50+Math.random()*50; p.s = 1.5+Math.random()*2.2; p.max = 5000+Math.random()*4000; } }
  else if(A==="bosque"){ if(Math.random()<0.45){ p.k = 4; p.vx = 14+Math.random()*16; p.vy = 26+Math.random()*18; p.s = 2+Math.random()*2; p.max = 6000+Math.random()*3000; } else { p.k = 5; p.vx = (Math.random()-0.5)*14; p.vy = (Math.random()-0.5)*14; p.s = 2; p.max = 4000+Math.random()*3000; } }
  else if(A==="laberinto"){ p.k = 6; p.vx = 6+Math.random()*10; p.vy = (Math.random()-0.5)*6; p.s = 1+Math.random()*1.5; p.max = 5000+Math.random()*4000; }
  else if(A==="acuatica"){ p.k = 7; p.vx = (Math.random()-0.5)*8; p.vy = -4-Math.random()*8; p.s = 1+Math.random()*1.6; p.max = 6000+Math.random()*4000; }
  else if(A==="divina"){ if(ry > 0){ p.k = 8; p.vy = -18-Math.random()*20; } else { p.k = 9; p.vy = -24-Math.random()*22; } p.vx = (Math.random()-0.5)*10; p.s = 1.5+Math.random()*1.5; p.max = 3500+Math.random()*3000; }
  p.life = fresh ? p.max*Math.random() : p.max;
}
function aidAmbUpdate(dt){
  if(state!=="playing" || !player || player.duelActive) return;
  const A = currentArena;
  const budget = Math.round((AID_AMB_BUDGET[A]||0) * Math.max(0.3, Math.min(1, vfxLoad)));
  aidWind += dt/1000;
  const k = dt/1000;
  let n = 0;
  const hw = VW/2/CAM_ZOOM + 120, hh = VH/2/CAM_ZOOM + 120;
  for(const p of aidAmb){
    if(!p.on) continue;
    p.life -= dt;
    const gust = A==="hielo" ? (0.7+0.5*Math.sin(aidWind*0.4)) : 1;
    let wx = 0;
    if(p.k===4) wx = Math.sin(p.ph + p.life/500)*22;
    else if(p.k===5){ p.vx += (Math.random()-0.5)*40*k; p.vy += (Math.random()-0.5)*40*k; p.vx*=0.98; p.vy*=0.98; }
    else if(p.k===7) wx = Math.sin(p.ph + p.life/900)*6;
    p.x += (p.vx*gust + wx)*k; p.y += p.vy*k;
    if(p.life<=0 || n>=budget || Math.abs(p.x-player.x)>hw || Math.abs(p.y-player.y)>hh){ p.on = false; continue; }
    n++;
  }
  for(const p of aidAmb){ if(n>=budget) break; if(!p.on){ aidAmbSpawn(p, A, true); n++; } }
  aidAmbN = n;
  // Infernal: pequeñas erupciones de lava en fisuras cercanas (solo visual, prioridad baja)
  if(A==="infernal"){
    aidEruptT -= dt;
    if(aidEruptT<=0){
      aidEruptT = 1800+Math.random()*2200;
      const cand = aidLights.filter(L=>L.fissure && inView(L.x, L.y, 40));
      if(cand.length){ const L = cand[(Math.random()*cand.length)|0]; vfxBurst(L.x, L.y, 10, "ember", 150, 700, 3, 0, -120, 0); }
    }
  }
}
function aidAmbDraw(now){
  if(!aidAmbN || !player || player.duelActive) return;
  ctx.save();
  for(const p of aidAmb){
    if(!p.on) continue;
    const fade = Math.min(1, p.life/600, (p.max-p.life)/600+0.2);
    if(p.k===1){ ctx.globalAlpha = 0.55*fade; ctx.fillStyle = "#6a605a"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===2){ ctx.globalAlpha = 0.85*fade; ctx.fillStyle = "#f4fbff"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===3){ ctx.globalAlpha = 0.22*fade; ctx.strokeStyle = "#e8f6ff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x-p.s, p.y-p.s*0.16); ctx.stroke(); }
    else if(p.k===4){ ctx.globalAlpha = 0.8*fade; ctx.fillStyle = (p.ph>3) ? "#c8a040" : "#7aa040"; const w = p.s*(0.5+0.5*Math.abs(Math.sin(p.ph+p.life/300))); ctx.fillRect(p.x, p.y, w+1, p.s); }
    else if(p.k===5){ const b = 0.5+0.5*Math.sin(now*3+p.ph*3); ctx.globalAlpha = 0.9*b*fade; ctx.fillStyle = "#e8ff90"; ctx.fillRect(p.x, p.y, 2, 2); ctx.globalAlpha = 0.25*b*fade; ctx.drawImage(glowSprite("200,255,120"), p.x-8, p.y-8, 16, 16); }
    else if(p.k===6){ ctx.globalAlpha = 0.35*fade; ctx.fillStyle = "#d8bc88"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===7){ ctx.globalAlpha = 0.45*fade; ctx.fillStyle = "#bff0ea"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===8){ ctx.globalAlpha = 0.8*fade; ctx.fillStyle = "#ffe8a0"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===9){ ctx.globalAlpha = 0.8*fade; ctx.fillStyle = p.ph>3 ? "#ff5a3a" : "#c02a50"; ctx.fillRect(p.x, p.y, p.s, p.s); }
  }
  ctx.restore();
}

// ---------------- Iluminación / color propio de cada arena (sobre el mundo, bajo el HUD) ----------------
function aidGrade(now){
  if(!player || player.duelActive) return;
  const A = currentArena;
  const hw = VW/2/CAM_ZOOM, hh = VH/2/CAM_ZOOM;
  const x0 = player.x - hw - 40, y0 = player.y - hh - 40, W = hw*2+80, H = hh*2+80;
  ctx.save();
  if(A==="infernal"){
    // calor que sube desde abajo + borde oscuro: hostil, pero sin teñir todo de rojo
    const g = ctx.createLinearGradient(0, y0+H, 0, y0);
    g.addColorStop(0, "rgba(120,30,8,0.20)"); g.addColorStop(0.45, "rgba(80,20,6,0.06)"); g.addColorStop(1, "rgba(0,0,0,0.10)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
  } else if(A==="hielo"){
    ctx.fillStyle = "rgba(150,200,255,0.07)"; ctx.fillRect(x0, y0, W, H);
    // niebla baja que se desplaza con el viento
    ctx.globalCompositeOperation = "lighter";
    for(let i=0;i<3;i++){
      const fy = y0 + H*(0.35+i*0.25), fx = x0 + ((now*30*(1+i*0.3) + i*400) % (W+600)) - 300;
      const g = ctx.createRadialGradient(fx, fy, 10, fx, fy, 320);
      g.addColorStop(0, "rgba(200,225,245,0.10)"); g.addColorStop(1, "rgba(200,225,245,0)");
      ctx.fillStyle = g; ctx.fillRect(fx-320, fy-200, 640, 400);
    }
  } else if(A==="bosque"){
    ctx.fillStyle = "rgba(40,70,20,0.08)"; ctx.fillRect(x0, y0, W, H);
    // haces de luz que se cuelan entre las copas
    ctx.globalCompositeOperation = "lighter";
    for(let i=0;i<4;i++){
      const bx = x0 + W*(0.12+i*0.26) + Math.sin(now*0.2+i)*40;
      const a = 0.05+0.03*Math.sin(now*0.5+i*1.7);
      ctx.fillStyle = `rgba(230,240,160,${a})`;
      ctx.beginPath(); ctx.moveTo(bx, y0); ctx.lineTo(bx+70, y0); ctx.lineTo(bx+260, y0+H); ctx.lineTo(bx+150, y0+H); ctx.closePath(); ctx.fill();
    }
  } else if(A==="laberinto"){
    ctx.fillStyle = "rgba(90,60,20,0.07)"; ctx.fillRect(x0, y0, W, H);
    const g = ctx.createRadialGradient(player.x, player.y, hh*0.5, player.x, player.y, Math.max(hw,hh)*1.25);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(10,6,2,0.45)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
  } else if(A==="acuatica"){
    ctx.fillStyle = "rgba(10,70,90,0.12)"; ctx.fillRect(x0, y0, W, H);
    // haces de luz desde la superficie
    ctx.globalCompositeOperation = "lighter";
    for(let i=0;i<5;i++){
      const bx = x0 + W*(0.05+i*0.21) + Math.sin(now*0.35+i*2)*60;
      const a = 0.045+0.03*Math.sin(now*0.8+i*1.3);
      ctx.fillStyle = `rgba(150,230,240,${a})`;
      ctx.beginPath(); ctx.moveTo(bx, y0); ctx.lineTo(bx+50, y0); ctx.lineTo(bx+190, y0+H); ctx.lineTo(bx+110, y0+H); ctx.closePath(); ctx.fill();
    }
  } else if(A==="divina"){
    // norte corrupto (rojizo) / sur celestial (dorado), según dónde está la cámara
    const g = ctx.createLinearGradient(0, -900, 0, 900);
    g.addColorStop(0, "rgba(120,10,40,0.16)"); g.addColorStop(0.5, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(255,210,120,0.10)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
  }
  ctx.restore();
}
