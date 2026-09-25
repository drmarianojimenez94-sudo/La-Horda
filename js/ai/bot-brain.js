"use strict";
/* ============================================================
   js/ai/bot-brain.js
   Cooperación de los bots según su ROL (roleCategory del campeón):
   - TANQUE: intercepta. Se pone entre el jugador y la amenaza más cercana a él, y se pega al jefe.
   - ASESINO: prioriza élites, subjefes y jefes (y lo que esté por morir).
   - MAGO: busca el grupo más denso para que sus áreas rindan.
   - SOPORTE: se queda cerca del aliado más herido y guarda curas/escudos para cuando hacen falta.
   Todos: esquivan los avisos de jefes y peligros del piso (con un tiempo de reacción humano),
   se meten en las zonas seguras, reviven a otros bots caídos (con anillo de progreso) y se
   reagrupan con el jugador si se alejan.
   ============================================================ */
const BOT_REVIVE_MS = 2400;
function botRole(h){ return (h.cls && h.cls.roleCategory) || "asesino"; }

// Vector para salir de un peligro telegrafiado (null si está a salvo).
function botDangerVec(x, y, pad){
  let vx = 0, vy = 0, hit = false, safes = null;
  for(const s of vfxTeles){
    if(!s.on) continue;
    if(s.shape===4){ (safes || (safes = [])).push(s); continue; }
    const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy) || 1;
    if(s.shape===0){ if(d < s.r + pad){ hit = true; vx += dx/d; vy += dy/d; } }
    else if(s.shape===3){ // anillo: lo seguro es adentro (pegado) o bien afuera
      if(d > s.r2 - pad*0.5 && d < s.r + pad){ hit = true; const k = (d - s.r2) < (s.r - d) ? -1 : 1; vx += dx/d*k; vy += dy/d*k; }
    } else if(s.shape===1){
      if(d < s.r + pad){ const c = (dx*s.dx + dy*s.dy)/d; if(c > Math.cos(s.arc) - 0.15){ hit = true; vx += -s.dy*(dx*-s.dy+dy*s.dx>=0?1:-1); vy += s.dx*(dx*-s.dy+dy*s.dx>=0?1:-1); vx += dx/d*0.5; vy += dy/d*0.5; } }
    } else if(s.shape===2){
      const t = dx*s.dx + dy*s.dy, perp = -dx*s.dy + dy*s.dx;
      if(t > -pad && t < (s.len||0) + pad && Math.abs(perp) < s.r + pad){ hit = true; const side = perp >= 0 ? 1 : -1; vx += -s.dy*side; vy += s.dx*side; }
    }
  }
  if(safes){
    let best = null, bd = Infinity;
    for(const z of safes){ const d = Math.hypot(z.x-x, z.y-y); if(d < bd){ bd = d; best = z; } }
    if(bd > best.r*0.55){ const l = bd || 1; return {x:(best.x-x)/l*2, y:(best.y-y)/l*2}; }
  }
  for(const s of bossStrikes){ const dx = x-s.x, dy = y-s.y, d = Math.hypot(dx,dy)||1; if(d < s.r + pad){ hit = true; vx += dx/d; vy += dy/d; } }
  if(typeof hazardZones!=="undefined") for(const z of hazardZones){ const dx = x-z.x, dy = y-z.y, d = Math.hypot(dx,dy)||1; if(d < (z.r||60) + pad*0.5){ hit = true; vx += dx/d*0.7; vy += dy/d*0.7; } }
  return hit ? {x:vx, y:vy} : null;
}

function _valueOf(e){ return e.rank==="jefe" ? 5 : e.rank==="subjefe" ? 4 : e.rank==="elite" ? 3 : e.rank==="subelite" ? 2 : 1; }
// Objetivo según el rol. Devuelve un enemigo (o null).
function botPickTarget(h, range){
  const role = botRole(h);
  let best = null, bs = -Infinity;
  if(role==="tanque"){
    // amenaza más cercana AL JUGADOR (proteger), si no la más cercana a sí mismo; el jefe manda
    if(boss && boss.alive && bossActive && distance(h, boss) < range+200) return boss;
    for(const e of enemies){
      if(!e.alive) continue;
      const dp = distance(player, e), dh = distance(h, e);
      if(dh > range) continue;
      const s = -dp*1.0 - dh*0.35 + (e.rank!=="normal" ? 60 : 0);
      if(s > bs){ bs = s; best = e; }
    }
    return best;
  }
  if(role==="asesino"){
    for(const e of enemies){
      if(!e.alive) continue;
      const d = distance(h, e); if(d > range) continue;
      const s = _valueOf(e)*120 - d*0.5 + (1 - e.hp/e.maxHp)*80;
      if(s > bs){ bs = s; best = e; }
    }
    return best;
  }
  if(role==="mago"){
    // el enemigo con más vecinos cerca (sus áreas pegan a varios)
    let n = 0;
    for(const e of enemies){
      if(!e.alive) continue;
      const d = distance(h, e); if(d > range) continue;
      if(++n > 40) break;
      let c = 0; for(const o of enemies){ if(o.alive && Math.abs(o.x-e.x) < 110 && Math.abs(o.y-e.y) < 110) c++; }
      const s = c*40 + _valueOf(e)*25 - d*0.25;
      if(s > bs){ bs = s; best = e; }
    }
    return best;
  }
  return nearestEnemyTo(h, range);
}
// Soporte: a quién cuidar (el aliado vivo con menos vida relativa, el jugador desempata).
function botWard(h){
  let w = player, wp = player.alive ? player.hp/player.maxHp - 0.08 : 9;
  for(const o of heroes){ if(o===h || !o.alive) continue; const p = o.hp/o.maxHp; if(p < wp){ wp = p; w = o; } }
  return w;
}
// Bot caído más cercano a este bot (para revivirlo).
function botDownedNear(h, range){
  if(divinaMode) return null;
  let best = null, bd = range;
  for(const a of allies){ if(a.alive || a===h) continue; const d = distance(h, a); if(d < bd){ bd = d; best = a; } }
  return best;
}
// Movimiento de un bot. Devuelve {mx, my, target}. Llamada desde updateAllies().
function botMove(h, dt){
  const role = botRole(h);
  const divinaHit = divinaMode ? divinaHostiles("player", h.x, h.y, 620) : null;
  // el objetivo por rol se re-elige cada ~250 ms (el del mago mira grupos: no hace falta por cuadro)
  h._tgtT = (h._tgtT||0) - dt;
  if(!divinaHit && (h._tgtT <= 0 || !h._tgt || !h._tgt.alive)){ h._tgt = botPickTarget(h, 620); h._tgtT = 250; }
  const target = divinaHit ? divinaHit.ref : h._tgt;
  let mx = 0, my = 0;
  // 1) peligro telegrafiado: reacción humana (~250 ms) y salir de ahí antes que nada
  const dz = botDangerVec(h.x, h.y, (h.radius||18) + 14);
  if(dz){
    h._dangerT = (h._dangerT||0) + dt;
    if(h._dangerT > 230){ const l = Math.hypot(dz.x, dz.y)||1; return {mx:dz.x/l, my:dz.y/l, target, dodging:true}; }
  } else h._dangerT = 0;
  // 2) revivir a otro bot caído (si no hay un jefe encima)
  const down = botDownedNear(h, 520);
  if(down){
    const d = distance(h, down);
    if(d > 46){ return {mx:(down.x-h.x)/d, my:(down.y-h.y)/d, target}; }
    down._reviveBy = h; down._reviveT = (down._reviveT||0) + dt;
    if(down._reviveT >= BOT_REVIVE_MS){ down._reviveT = 0; down._reviveBy = null; reviveHero(down, h); }
    return {mx:0, my:0, target, reviving:true};
  }
  // 3) reagruparse si se alejó mucho del jugador
  const leash = Math.hypot(h.x-player.x, h.y-player.y);
  if(leash > (bossActive ? 420 : 320)){ return {mx:(player.x-h.x)/leash, my:(player.y-h.y)/leash, target}; }
  // 4) según el rol
  if(role==="soporte"){
    const w = botWard(h);
    const dw = distance(h, w);
    if(dw > 130){ mx = (w.x-h.x)/dw; my = (w.y-h.y)/dw; }
    else if(target){ const dx = target.x-h.x, dy = target.y-h.y, l = Math.hypot(dx,dy)||1; if(l < 150){ mx = -dx/l*0.8; my = -dy/l*0.8; } }
    return {mx, my, target};
  }
  if(role==="tanque" && target && !h.cls.ranged){
    // se para entre el jugador y la amenaza (un poco adelante de la amenaza)
    const px = player.x + (target.x-player.x)*0.8, py = player.y + (target.y-player.y)*0.8;
    const gx = target.rank==="jefe" ? target.x : px, gy = target.rank==="jefe" ? target.y : py;
    const dx = gx-h.x, dy = gy-h.y, l = Math.hypot(dx,dy)||1;
    const want = target.rank==="jefe" ? (target.radius||40)*0.9 : 16;
    if(l > want){ mx = dx/l; my = dy/l; }
    return {mx, my, target};
  }
  if(target){
    const desired = h.cls.ranged ? (target.rank==="jefe" ? 230 : 190) : (h.cls.basicRange*0.7);
    const dx = target.x-h.x, dy = target.y-h.y, l = Math.hypot(dx,dy)||1;
    if(l > desired+10){ mx = dx/l; my = dy/l; }
    else if(l < desired-40){ mx = -dx/l; my = -dy/l; }
    else if(h.cls.ranged){ const s = (h._strafe || (h._strafe = Math.random()<0.5?1:-1)); mx = -dy/l*0.5*s; my = dx/l*0.5*s; }
  } else {
    const dx = player.x-h.x, dy = player.y-h.y, l = Math.hypot(dx,dy)||1;
    if(l > 120){ mx = dx/l; my = dy/l; }
  }
  return {mx, my, target};
}

/* ---------------- marcador de aliado caído ---------------- */
// Cruz verde pulsante sobre el caído, anillo con el alcance de revivir cuando el jugador está
// cerca, y anillo de progreso cuando alguien lo está reviviendo.
function drawDownedMarkers(){
  if(divinaMode) return;
  for(const a of allies){
    if(a.alive) { a._reviveT = 0; continue; }
    if(!inView(a.x, a.y, 80)) continue;
    const pulse = 0.5 + 0.5*Math.sin(animNow/180);
    const dP = distance(player, a);
    ctx.save();
    if(dP < REVIVE_RANGE*2.4){
      ctx.setLineDash([8,6]); ctx.lineDashOffset = -animNow/40;
      ctx.strokeStyle = dP < REVIVE_RANGE ? "rgba(140,255,180,0.9)" : "rgba(140,255,180,0.35)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(a.x, a.y, REVIVE_RANGE, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    }
    // progreso (bot reviviendo, o el jugador manteniendo el botón)
    let prog = 0;
    if(a._reviveBy && a._reviveBy.alive && a._reviveT>0) prog = a._reviveT/BOT_REVIVE_MS;
    if(typeof reviveBtnTarget!=="undefined" && reviveBtnTarget===a && typeof reviveBtnHoldStart==="number") prog = Math.max(prog, (performance.now()-reviveBtnHoldStart)/REVIVE_BTN_HOLD_MS);
    const y = a.y - 62 - pulse*4;
    ctx.fillStyle = "rgba(10,30,16,0.75)"; ctx.beginPath(); ctx.arc(a.x, y, 15, 0, Math.PI*2); ctx.fill();
    if(prog > 0){ ctx.strokeStyle = "#8effb4"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(a.x, y, 15, -Math.PI/2, -Math.PI/2 + Math.PI*2*Math.min(1, prog)); ctx.stroke(); }
    else { ctx.strokeStyle = `rgba(142,255,180,${0.5+0.5*pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, y, 15, 0, Math.PI*2); ctx.stroke(); }
    ctx.fillStyle = "#8effb4"; ctx.fillRect(a.x-2.5, y-8, 5, 16); ctx.fillRect(a.x-8, y-2.5, 16, 5);
    ctx.restore();
  }
}
