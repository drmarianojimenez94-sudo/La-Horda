"use strict";
/* ============================================================
   js/core/aim.js
   Apuntado de habilidades estilo MOBA móvil, sobre los botones 1/2/3:
   - TOQUE rápido: se lanza al soltar, sobre el mejor objetivo automático (grupo más denso al
     alcance, o el enemigo más cercano en las dirigidas).
   - MANTENER: aparece la previsualización (alcance + área) sobre ese objetivo automático.
   - MANTENER Y ARRASTRAR: se elige a mano la dirección y la distancia, como con un segundo
     joystick; soltar lanza ahí. Volver el dedo al centro del botón antes de soltar CANCELA.
   Las habilidades sin apuntado (curas, buffs, novas alrededor propio) se lanzan al apretar,
   igual que siempre, y mientras se mantiene el dedo se ve su radio.
   ============================================================ */
const AIM_DEADZONE = 12;      // px de arrastre para empezar a apuntar a mano
const AIM_DRAG_MAX = 78;      // px de arrastre que equivalen al alcance máximo
const AIM_CANCEL_R = 14;      // soltar dentro de este radio (tras haber apuntado) cancela
const AIM_HOLD_PREVIEW_MS = 170;
let aimState = null; // {idx, id, el, cx, cy, dx, dy, manual, t0, cancelArmed, selfCast}
const aimPad = document.getElementById("aim-pad");
const aimKnob = document.getElementById("aim-knob");

function _skillReadyFor(idx){
  const sk = player && player.cls && player.cls.skills[idx];
  if(!sk || !player.alive || state!=="playing") return false;
  return player.cds[idx]<=0 && player.energy >= sk.cost;
}
function _denyFeedback(el, idx){
  el.classList.remove("deny"); void el.offsetWidth; el.classList.add("deny");
  playSfx("deny");
  const sk = player.cls.skills[idx];
  if(player.cds[idx] > 0) return; // el barrido radial ya dice cuánto falta
  if(sk && player.energy < sk.cost) floatText(player.x, player.y-64, player.cls.isFuryClass ? "Falta Furia" : "Falta energía", null);
}
function _showPad(on){
  if(!aimPad) return;
  aimPad.classList.toggle("hidden", !on);
  if(on && aimState){
    aimPad.style.left = (aimState.cx - 60) + "px"; aimPad.style.top = (aimState.cy - 60) + "px";
    _moveKnob(0, 0);
  }
}
function _moveKnob(dx, dy){
  if(!aimKnob) return;
  const l = Math.hypot(dx,dy), k = l > AIM_DRAG_MAX ? AIM_DRAG_MAX/l : 1;
  aimKnob.style.transform = `translate(${dx*k*0.62}px, ${dy*k*0.62}px)`;
}
function aimPointerDown(ev, idx){
  ev.preventDefault();
  if(aimState) return; // un solo apuntado a la vez
  const el = ev.currentTarget;
  const sk = player && player.cls ? player.cls.skills[idx] : null;
  if(!sk) return;
  const isSylvaShot = player.classKey==="cazadora" && sk.kind==="piercing_shot";
  if(!_skillReadyFor(idx)){ _denyFeedback(el, idx); return; }
  const r = el.getBoundingClientRect();
  const prof = aimProfileOf(sk);
  aimState = {idx, id:ev.pointerId, el, cx:r.left+r.width/2, cy:r.top+r.height/2, dx:0, dy:0, manual:false, t0:performance.now(),
    cancelArmed:false, selfCast:!prof && !isSylvaShot, sylva:isSylvaShot};
  try{ el.setPointerCapture(ev.pointerId); }catch(_){}
  el.classList.add("aiming");
  if(isSylvaShot) sylvaChargeStart();
  if(aimState.selfCast){
    // sin apuntado: sale al instante (como siempre); el radio se ve mientras se mantiene
    useSkill(idx);
  } else {
    _showPad(true);
  }
}
function aimPointerMove(ev){
  if(!aimState || ev.pointerId!==aimState.id) return;
  aimState.dx = ev.clientX - aimState.cx; aimState.dy = ev.clientY - aimState.cy;
  const l = Math.hypot(aimState.dx, aimState.dy);
  if(!aimState.selfCast){
    if(l > AIM_DEADZONE){ aimState.manual = true; aimState.cancelArmed = true; }
    aimState.el.classList.toggle("aim-cancel", aimState.manual && l < AIM_CANCEL_R);
    _moveKnob(aimState.dx, aimState.dy);
  }
}
// Punto/dirección apuntados a mano, en coordenadas del mundo (null si no se arrastró).
function manualAimWorld(){
  if(!aimState || !aimState.manual) return null;
  const sk = player.cls.skills[aimState.idx];
  const range = aimRangeOf(player, sk, aimState.idx) || 300;
  const l = Math.hypot(aimState.dx, aimState.dy);
  if(l < 0.5) return null;
  const ux = aimState.dx/l, uy = aimState.dy/l;
  const frac = Math.min(1, l/AIM_DRAG_MAX);
  return {x:player.x + ux*range*frac, y:player.y + uy*range*frac, dx:ux, dy:uy};
}
function aimPointerUp(ev, cancelled){
  if(!aimState || ev.pointerId!==aimState.id) return;
  const st = aimState;
  const l = Math.hypot(st.dx, st.dy);
  const cancel = cancelled || (st.manual && l < AIM_CANCEL_R);
  const aim = cancel ? null : manualAimWorld();
  st.el.classList.remove("aiming","aim-cancel");
  _showPad(false);
  aimState = null;
  if(st.selfCast) return;
  if(cancel){
    if(st.sylva){ player.sylvaCharging = false; player.sylvaChargeTimer = 0; }
    floatText(player.x, player.y-64, "Cancelado", null);
    return;
  }
  if(st.sylva){ sylvaChargeRelease(aim); return; }
  if(!useSkill(st.idx, aim)) _denyFeedback(st.el, st.idx);
}
[["btn-s1",0],["btn-s2",1],["btn-s3",2]].forEach(([id, idx])=>{
  const el = document.getElementById(id);
  el.addEventListener("pointerdown", ev=>aimPointerDown(ev, idx));
  el.addEventListener("pointermove", aimPointerMove);
  el.addEventListener("pointerup", ev=>aimPointerUp(ev, false));
  el.addEventListener("pointercancel", ev=>aimPointerUp(ev, true));
});

/* ---------------- Previsualización en el mundo ---------------- */
function _ellipse(x, y, r){ ctx.beginPath(); ctx.arc(x, y+6, r, 0, Math.PI*2); }
function drawAimPreview(){
  if(!aimState || !player || !player.alive || state!=="playing") return;
  const sk = player.cls.skills[aimState.idx]; if(!sk) return;
  const prof = aimProfileOf(sk);
  const held = performance.now() - aimState.t0;
  const rgb = hexToRgb(player.cls.glow||"#ffcf5c");
  const cancelling = aimState.manual && Math.hypot(aimState.dx, aimState.dy) < AIM_CANCEL_R;
  const col = cancelling ? "255,90,70" : rgb;
  ctx.save();
  // Habilidades sin apuntado: solo su radio mientras se mantiene el dedo.
  if(!prof){
    const r = (sk.radius||0) * aimAreaMult(player.classKey, aimState.idx);
    if(r > 0){ _ellipse(player.x, player.y, r); ctx.fillStyle = `rgba(${rgb},0.10)`; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${rgb},0.75)`; ctx.stroke(); }
    ctx.restore(); return;
  }
  if(!aimState.manual && held < AIM_HOLD_PREVIEW_MS){ ctx.restore(); return; }
  const range = aimRangeOf(player, sk, aimState.idx) || 300;
  // alcance máximo
  ctx.setLineDash([12, 9]); ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${col},0.55)`;
  _ellipse(player.x, player.y, range); ctx.stroke(); ctx.setLineDash([]);
  // objetivo: el apuntado a mano, o el que elegiría el lanzamiento automático
  const manual = manualAimWorld();
  const area = aimAreaMult(player.classKey, aimState.idx);
  const pulse = 0.5+0.5*Math.sin(animNow/120);
  if(prof.type==="point"){
    const r = (prof.r ? prof.r(sk) : 60) * area;
    let p = manual;
    if(!p){ const c = bestClusterPoint(player, range, r); p = c ? _clampToRange(player, c, range) : {x:player.x+player.fx*range*0.6, y:player.y+player.fy*range*0.6}; }
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${col},0.5)`;
    ctx.beginPath(); ctx.moveTo(player.x, player.y+6); ctx.lineTo(p.x, p.y+6); ctx.stroke();
    _ellipse(p.x, p.y, r); ctx.fillStyle = `rgba(${col},${0.16+0.08*pulse})`; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = `rgba(${col},0.95)`; ctx.stroke();
    if(sk.kind==="fire_wall"){ _ellipse(p.x, p.y, sk.innerR*area); ctx.lineWidth = 2; ctx.stroke(); }
  } else if(prof.type==="dash" || prof.type==="line"){
    let dx, dy, len;
    if(manual){ dx = manual.dx; dy = manual.dy; len = prof.type==="dash" && prof.move ? Math.hypot(manual.x-player.x, manual.y-player.y) : range; }
    else {
      const t = prof.move ? null : nearestEnemyTo(player, range);
      if(t){ const l = Math.hypot(t.x-player.x, t.y-player.y)||1; dx = (t.x-player.x)/l; dy = (t.y-player.y)/l; } else { dx = player.fx; dy = player.fy; }
      len = range;
    }
    const w = (prof.w||20);
    ctx.save(); ctx.translate(player.x, player.y+6); ctx.rotate(Math.atan2(dy, dx));
    const L = len;
    ctx.fillStyle = `rgba(${col},${0.14+0.08*pulse})`; ctx.fillRect(0, -w, L, w*2);
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${col},0.9)`; ctx.strokeRect(0, -w, L, w*2);
    // punta de flecha
    ctx.beginPath(); ctx.moveTo(L+w*1.2, 0); ctx.lineTo(L-w*0.4, -w*1.4); ctx.lineTo(L-w*0.4, w*1.4); ctx.closePath();
    ctx.fillStyle = `rgba(${col},0.9)`; ctx.fill();
    ctx.restore();
  } else if(prof.type==="cone"){
    let dx, dy;
    if(manual){ dx = manual.dx; dy = manual.dy; }
    else { const t = nearestEnemyTo(player, range+60); if(t){ const l = Math.hypot(t.x-player.x,t.y-player.y)||1; dx=(t.x-player.x)/l; dy=(t.y-player.y)/l; } else { dx = player.fx; dy = player.fy; } }
    const R = (sk.range||120)*area, half = (sk.arc||1)/2, ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(player.x, player.y+6);
    const a2 = ang;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, R, a2-half, a2+half); ctx.closePath();
    ctx.fillStyle = `rgba(${col},${0.16+0.08*pulse})`; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${col},0.9)`; ctx.stroke();
    ctx.restore();
  } else if(prof.type==="target"){
    const tRange = aimRangeOf(player, sk, aimState.idx) || range;
    const was = player.aim; player.aim = manual;
    const t = aimTarget(player, tRange);
    player.aim = was;
    if(t){
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${col},0.7)`;
      ctx.beginPath(); ctx.moveTo(player.x, player.y-10); ctx.lineTo(t.x, t.y-10); ctx.stroke();
      _ellipse(t.x, t.y, (t.radius||20)*1.3); ctx.lineWidth = 4; ctx.strokeStyle = `rgba(${col},${0.7+0.3*pulse})`; ctx.stroke();
    }
  }
  ctx.restore();
}
