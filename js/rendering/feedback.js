"use strict";
/* ============================================================
   js/rendering/feedback.js
   Sensación de combate: hit-stop / cámara lenta, impacto por intensidad (LEVE -> MEDIO ->
   FUERTE -> ULTI/JEFE), daño recibido (viñeta + indicador de dirección), destello de
   pantalla e indicadores en el borde de la pantalla (élites, jefes y aliados caídos fuera de
   cámara). Todo se dibuja en espacio de pantalla, encima del mundo y debajo del HUD.
   ============================================================ */

/* ---------------- Tiempo: hit-stop y cámara lenta ---------------- */
let hitStopTimer = 0, slowMoTimer = 0, slowMoScale = 1, _hitStopLastAt = -1e9;
// Congela casi del todo la simulación unos ms: se reserva para golpes que tienen que "pesar".
// Tiene un enfriamiento propio para que una ráfaga de críticos no deje el juego a los saltos.
function hitStop(ms, force){
  const now = performance.now();
  if(!force && now - _hitStopLastAt < 160) return;
  _hitStopLastAt = now;
  hitStopTimer = Math.min(110, Math.max(hitStopTimer, ms));
}
function slowMo(scale, ms){
  slowMoScale = slowMoTimer>0 ? Math.min(slowMoScale, scale) : scale;
  slowMoTimer = Math.max(slowMoTimer, ms);
}
// Factor de tiempo del cuadro (lo aplica loop() sobre el dt real antes de llamar a update).
function gameTimeScale(realDt){
  if(hitStopTimer>0){ hitStopTimer -= realDt; return 0.05; }
  if(slowMoTimer>0){ slowMoTimer -= realDt; if(slowMoTimer<=0) slowMoScale = 1; return slowMoScale; }
  return 1;
}

/* ---------------- Impacto de los golpes del jugador ---------------- */
// Contexto del lanzamiento en curso: castAbility lo arma para que los golpes que salen de una
// ulti se sientan como tales (ver castAbility / damageEnemy).
let _castCtx = null;
let _ultImpactDone = false;
function impactFeedback(e, dmg, crit, opts){
  const big = e.rank==="jefe" || e.rank==="subjefe" || e.rank==="elite";
  const ult = !!(_castCtx && _castCtx.ult);
  if(ult){
    if(!_ultImpactDone){ _ultImpactDone = true; hitStop(60, true); vfxShake(7); playSfx("heavy"); }
  } else if(crit || opts.heavy || dmg >= e.maxHp*0.4){
    hitStop(big ? 45 : 32);
    if(big || crit) vfxShake(big ? 4 : 2.5);
    if(!opts.fromBasic || crit) playSfx("heavy");
  }
  // retroceso corto: los golpes se sienten en el cuerpo del enemigo (nunca en jefes/subjefes)
  if(!opts.knockback && (e.rank==="normal" || e.rank==="subelite") && !e.draggedBy){
    const src = opts.src || player;
    const dx = e.x-src.x, dy = e.y-src.y, d = Math.hypot(dx,dy)||1;
    const k = opts.fromBasic ? (crit ? 9 : 4) : 8;
    e.x += dx/d*k; e.y += dy/d*k;
  }
}

// Bajas: una común apenas suena; una élite pega un tirón; un subjefe frena el tiempo.
function killFeedback(e, byPlayer){
  if(e.rank==="elite"){ if(byPlayer) hitStop(45); vfxShake(4); playSfx("eliteKill"); }
  else if(e.rank==="subjefe"){
    hitStop(90, true); slowMo(0.35, 450); vfxShake(9); flashScreen(0.28); playSfx("bigKill");
    const others = enemies.some(o=>o.alive && o!==e && o.rank==="subjefe");
    if(!others) showBanner("¡"+String(e.name).toUpperCase()+" DERROTADO!");
    else floatText(e.x, e.y-(e.radius||30)*2, "¡Derrotado!", "crit");
  }
  else if(e.rank!=="jefe" && byPlayer) playSfx("kill");
}
// Cambio de fase del jefe (renace / se transforma / se enfurece) y muerte definitiva.
function bossPhaseFeedback(){ hitStop(110, true); slowMo(0.4, 650); vfxShake(10); flashScreen(0.35, "255,230,180"); playSfx("bossRoar"); }
function bossDeathFeedback(){ hitStop(110, true); slowMo(0.25, 1700); vfxShake(14); flashScreen(0.65); playSfx("bossDeath"); }

/* ---------------- Daño recibido ---------------- */
let hurtFlash = 0, screenFlash = 0, screenFlashRgb = "255,255,255";
const hurtDirs = []; // {ang, t, dur, heavy}
function registerPlayerHurt(dmg, src){
  if(!player || dmg <= 0.5) return;
  const pct = dmg/Math.max(1, player.maxHp);
  hurtFlash = Math.min(1, Math.max(hurtFlash, 0.22 + pct*4.5));
  if(src && typeof src.x==="number" && (src.x!==player.x || src.y!==player.y)){
    const ang = Math.atan2(src.y-player.y, src.x-player.x);
    let merged = false;
    for(const d of hurtDirs){ let da = Math.abs(d.ang-ang); if(da>Math.PI) da = Math.PI*2-da; if(da < 0.4){ d.ang = ang; d.t = 0; d.heavy = d.heavy || pct>0.08; merged = true; break; } }
    if(!merged){ if(hurtDirs.length >= 6) hurtDirs.shift(); hurtDirs.push({ang, t:0, dur:900, heavy:pct>0.08, off:!inView(src.x, src.y, -40)}); }
  }
  if(pct > 0.12){ hitStop(55, true); vfxShake(6); playSfx("hurtHeavy"); }
  else if(pct > 0.05) vfxShake(2.5);
}
function flashScreen(alpha, rgb){ screenFlash = Math.max(screenFlash, alpha); screenFlashRgb = rgb||"255,255,255"; }
function updateFeedback(dt){
  if(hurtFlash>0) hurtFlash = Math.max(0, hurtFlash - dt/420);
  if(screenFlash>0) screenFlash = Math.max(0, screenFlash - dt/260);
  for(let i=hurtDirs.length-1;i>=0;i--){ hurtDirs[i].t += dt; if(hurtDirs[i].t >= hurtDirs[i].dur) hurtDirs.splice(i,1); }
}
function resetFeedback(){ hurtFlash = 0; screenFlash = 0; hurtDirs.length = 0; hitStopTimer = 0; slowMoTimer = 0; slowMoScale = 1; _castCtx = null; }

/* ---------------- Dibujo en pantalla ---------------- */
function _edgePoint(ang, margin){
  const cx = VW/2, cy = VH/2 - CAM_Y_ANCHOR;
  const hw = VW/2 - margin, hh = VH/2 - margin;
  const c = Math.cos(ang), s = Math.sin(ang);
  const t = Math.min(Math.abs(hw/(c||1e-6)), Math.abs(hh/(s||1e-6)));
  return {x: cx + c*t, y: Math.max(margin, Math.min(VH-margin, cy + s*t))};
}
function _arrow(x, y, ang, size, fill, stroke){
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size*0.7, size*0.75); ctx.lineTo(-size*0.35, 0); ctx.lineTo(-size*0.7, -size*0.75); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if(stroke){ ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}
function drawScreenFeedback(){
  if(!player) return;
  const now = animNow;
  // 1) Indicadores en el borde: élites, subjefes y jefe fuera de cámara; aliados caídos.
  let n = 0;
  for(const e of enemies){
    if(n >= 6) break;
    if(!e.alive || !(e.rank==="elite" || e.rank==="subjefe" || e.rank==="jefe")) continue;
    if(inView(e.x, e.y, -30)) continue;
    const ang = Math.atan2(e.y-player.y, e.x-player.x), p = _edgePoint(ang, 22);
    const col = e.rank==="jefe" ? "#ffb300" : (e.rank==="subjefe" ? "#ff8a3d" : "#ffe36a");
    const pulse = 0.7 + 0.3*Math.sin(now/180 + n);
    ctx.globalAlpha = pulse;
    _arrow(p.x, p.y, ang, e.rank==="jefe" ? 15 : 11, col, "rgba(0,0,0,0.7)");
    if(e.rank!=="elite"){ ctx.font = "bold 11px Georgia, serif"; ctx.textAlign = "center"; ctx.fillStyle = col; ctx.fillText(e.rank==="jefe" ? "☠" : "◆", p.x - Math.cos(ang)*20, p.y - Math.sin(ang)*20 + 4); }
    ctx.globalAlpha = 1; n++;
  }
  if(!divinaMode) for(const a of allies){
    if(a.alive || inView(a.x, a.y, -30)) continue;
    const ang = Math.atan2(a.y-player.y, a.x-player.x), p = _edgePoint(ang, 24);
    ctx.globalAlpha = 0.75 + 0.25*Math.sin(now/150);
    _arrow(p.x, p.y, ang, 12, "#6fdc8c", "rgba(0,40,10,0.8)");
    ctx.font = "bold 13px Georgia, serif"; ctx.textAlign = "center"; ctx.fillStyle = "#6fdc8c";
    ctx.fillText("✚", p.x - Math.cos(ang)*22, p.y - Math.sin(ang)*22 + 5);
    ctx.globalAlpha = 1;
  }
  // 2) Dirección del daño recibido: arcos rojos alrededor del jugador (y flecha en el borde si
  //    el atacante está fuera de cámara).
  if(hurtDirs.length){
    const cx = VW/2, cy = VH/2 - CAM_Y_ANCHOR;
    ctx.save(); ctx.lineCap = "round";
    for(const d of hurtDirs){
      const a = 1 - d.t/d.dur;
      ctx.globalAlpha = a*(d.heavy ? 0.95 : 0.7);
      ctx.strokeStyle = d.heavy ? "#ff3a2a" : "#ff6a4a"; ctx.lineWidth = d.heavy ? 7 : 5;
      const r = 58 + (1-a)*10, w = d.heavy ? 0.42 : 0.3;
      ctx.beginPath(); ctx.arc(cx, cy, r, d.ang-w, d.ang+w); ctx.stroke();
      if(d.off){ const p = _edgePoint(d.ang, 20); _arrow(p.x, p.y, d.ang, 13, "rgba(255,60,40,0.9)", null); }
    }
    ctx.restore();
  }
  // 3) Viñeta roja al recibir daño + latido suave con vida crítica.
  const lowHp = player.alive && player.hp < player.maxHp*0.3;
  let vig = hurtFlash*0.5;
  if(lowHp){ const beat = Math.pow(Math.max(0, Math.sin(now/1000*Math.PI*1.3)), 6); vig = Math.max(vig, 0.16 + 0.22*beat); }
  if(vig > 0.01){
    const R = Math.hypot(VW, VH)*0.62;
    const g = ctx.createRadialGradient(VW/2, VH/2, R*0.45, VW/2, VH/2, R);
    g.addColorStop(0, "rgba(160,0,0,0)");
    g.addColorStop(1, `rgba(170,10,0,${Math.min(0.75, vig)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  // 4) Destello de pantalla (muerte de jefe, cambio de fase, ulti).
  if(screenFlash > 0.01){ ctx.fillStyle = `rgba(${screenFlashRgb},${screenFlash*0.55})`; ctx.fillRect(0, 0, VW, VH); }
}
