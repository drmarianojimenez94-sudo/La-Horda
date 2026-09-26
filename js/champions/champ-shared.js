"use strict";
/* ============================================================
   js/champions/champ-shared.js
   Piezas comunes a El Libertador (libertador.js) y Eren (eren.js), enganchadas al motor en
   pocos puntos para no tocar a ningún otro campeón:
   - champFx: UNA colección de efectos de mundo (zonas, avisos, jinetes espectrales, pisadas,
     escarcha). Es lógica liviana + dibujo; se sincroniza sola en cooperativo (NET_COLLS).
     Regla de rendimiento: 12 Granaderos o 9 siluetas gigantes son UN efecto con UNA zona de
     daño, nunca 12 entidades con IA/física.
   - Reglas de control por rango: comunes se empujan, élite tambalean (aturdimiento corto),
     jefes/subjefes NUNCA se desplazan.
   - Ganchos de estadísticas por héroe (velocidad, vel. de ataque, daño hecho/recibido,
     resistencia al control, bloqueo de movimiento, muerte evitada) que leen update/combat/IA.
   ============================================================ */
let champFx = [];

function isBossRank(e){ return !!e && (e.rank==="jefe" || e.rank==="subjefe"); }
function isEliteRank(e){ return !!e && (e.rank==="elite" || e.rank==="subelite"); }
// Empuje según rango (dx,dy normalizado). Devuelve "knock" | "stagger" | "none".
function seKnock(e, dx, dy, px, staggerMs){
  if(!e || !e.alive) return "none";
  if(isBossRank(e)) return "none";
  if(isEliteRank(e)){ if(staggerMs) e.stunTimer = Math.max(e.stunTimer||0, staggerMs); return "stagger"; }
  e.x += dx*px; e.y += dy*px;
  clampToArena(e); if(typeof resolveWallCollision==="function") resolveWallCollision(e);
  return "knock";
}
// Vulnerabilidad temporal (defensa rota) de un enemigo: la aplica damageEnemy (enemyVulnMult).
function seVuln(e, pct, ms){
  const active = e._seVulnUntil > runElapsedMs;
  e._seVulnPct = active ? Math.max(e._seVulnPct||0, pct) : pct;
  e._seVulnUntil = Math.max(active ? e._seVulnUntil : 0, runElapsedMs + ms);
}
function enemyVulnMult(e){ return (e && e._seVulnUntil > runElapsedMs) ? 1 + (e._seVulnPct||0) : 1; }
// Punto dentro de la arena (para zonas y pisadas).
function seClampPoint(x, y, margin){
  const o = {x, y, radius:margin||0}; clampToArena(o); return {x:o.x, y:o.y};
}
// Distancia de un punto al segmento a-b.
function seSegDist(px, py, ax, ay, bx, by){
  const vx = bx-ax, vy = by-ay, l2 = vx*vx+vy*vy || 1;
  const t = Math.max(0, Math.min(1, ((px-ax)*vx + (py-ay)*vy)/l2));
  return Math.hypot(px-(ax+vx*t), py-(ay+vy*t));
}
// Dirección de lanzamiento: la apuntada a mano, si no hacia un objetivo, si no hacia donde mira.
function seAimDir(caster, target){
  if(caster.aim && (caster.aim.dx || caster.aim.dy)){ const l = Math.hypot(caster.aim.dx, caster.aim.dy)||1; return {x:caster.aim.dx/l, y:caster.aim.dy/l}; }
  if(target){ const dx = target.x-caster.x, dy = target.y-caster.y, l = Math.hypot(dx,dy); if(l > 1) return {x:dx/l, y:dy/l}; }
  const l = Math.hypot(caster.fx||0, caster.fy||0);
  return l > 0.01 ? {x:caster.fx/l, y:caster.fy/l} : {x:0, y:1};
}
// El enemigo "más valioso" al alcance (jefe > élite > común, desempata la distancia).
function seBestTarget(h, range){
  let best = null, bs = -Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    const d = distance(h, e); if(d > range) continue;
    const s = (isBossRank(e) ? 3000 : isEliteRank(e) ? 1500 : 0) - d;
    if(s > bs){ bs = s; best = e; }
  }
  return best;
}
function seCountNear(x, y, r){ let n = 0; for(const e of enemies){ if(e.alive && Math.hypot(e.x-x, e.y-y) <= r) n++; } return n; }

/* ---------------- ganchos de estadísticas (los leen update/combat/IA) ---------------- */
function heroSpeedMult(h){
  if(!h) return 1;
  if(heroMoveLocked(h)) return 0;
  let m = 1;
  if(h.granTimer>0) m *= 1 + SM_CFG.granaderos.speedPct;
  if(h.classKey==="libertador") m *= libertadorSpeedMult(h);
  if(h.classKey==="eren") m *= erenSpeedMult(h);
  if(h.advAllyTimer>0) m *= 1 + EREN_CFG.advance.speedPct*EREN_CFG.advance.allyShare;
  m *= itemSpeedMult(h); // Paso del Cazador / Gracia Veloz (objetos)
  return m;
}
function heroAtkSpeedMult(h){
  let m = 1;
  if(h && h.granTimer>0) m *= 1 + SM_CFG.granaderos.atkSpeedPct;
  return m;
}
function heroDmgOutMult(h){
  if(!h || !h.classKey) return 1;
  let m = 1;
  if(h.granTimer>0) m *= 1 + SM_CFG.granaderos.dmgPct;
  if(h.advAllyTimer>0) m *= 1 + EREN_CFG.advance.dmgPct*EREN_CFG.advance.allyShare;
  if(h.classKey==="libertador") m *= libertadorDmgMult(h);
  if(h.classKey==="eren") m *= erenDmgMult(h);
  if(h.classKey==="nigromante") m *= nigroSoulDmgMult(h); // almas guardadas: +2% por alma
  return m;
}
function heroDmgTakenMult(h){
  if(!h) return 1;
  if(h.classKey==="libertador") return libertadorDmgTakenMult(h);
  if(h.classKey==="eren") return erenDmgTakenMult(h);
  return 1;
}
function heroCcResist(h){
  let r = 0;
  if(h.granTimer>0) r = Math.max(r, SM_CFG.granaderos.ccResist);
  if(h.classKey==="libertador") r = Math.max(r, libertadorCcResist(h));
  if(h.classKey==="eren") r = Math.max(r, erenCcResist(h));
  return Math.min(0.95, r);
}
// Movimiento propio bloqueado (embestidas, montar, transformación, cinemática): lo mueve su habilidad.
function heroMoveLocked(h){
  if(!h) return false;
  if(h.classKey==="libertador") return libertadorMoveLocked(h);
  if(h.classKey==="eren") return erenMoveLocked(h);
  return false;
}
// Golpe letal: ¿la evita algo propio del campeón? (Soldado Cabral). true = no muere.
function heroPreventDeath(h, src){
  if(h && h.classKey==="libertador" && libertadorPreventDeath(h, src)) return true;
  return champSetPreventDeath(h); // set La Última Profecía
}
// Cada cuadro, para cada héroe (anfitrión o partida local).
function updateChampExtras(h, dt){
  if(h.granTimer>0) h.granTimer = Math.max(0, h.granTimer-dt);
  if(h.advAllyTimer>0) h.advAllyTimer = Math.max(0, h.advAllyTimer-dt);
  // resistencia al control: el aturdimiento/ralentización se consume más rápido
  const cc = heroCcResist(h);
  if(cc>0){
    if(h.stunTimer>0) h.stunTimer = Math.max(0, h.stunTimer - dt*cc/(1-cc));
    if(h.slowAmt>0) h.slowAmt = Math.max(0, h.slowAmt*(1-cc*0.5));
  }
  if(h.classKey==="libertador") updateLibertador(h, dt);
  else if(h.classKey==="eren") updateEren(h, dt);
}

/* ---------------- efectos de mundo ---------------- */
// Toda entrada tiene life/maxLife (el invitado los descuenta solo, ver netIsDownTimer).
const CHAMP_FX_MAX = 60;
function pushChampFx(o){
  if(champFx.length >= CHAMP_FX_MAX){
    // las pisadas del Retumbar llevan daño: nunca se descartan, se hace lugar quitando un efecto decorativo
    if(o.type!=="rumbleStep") return o;
    const i = champFx.findIndex(f=>f.type!=="rumbleStep" && f.type!=="rumbling");
    if(i<0) return o;
    champFx.splice(i, 1);
  }
  champFx.push(o); return o;
}
function updateChampFx(dt){
  for(const f of champFx){
    f.life -= dt;
    if(f.type==="rumbleStep") erenUpdateRumbleStep(f, dt);
  }
  champFx = champFx.filter(f=>f.life > 0);
}
function _fxA(f){ return Math.max(0, Math.min(1, f.life/(f.maxLife||1))); }
function drawSeImg(img, x, y, w, h, ax, ay, flip, alpha){
  if(!img) return;
  ctx.save();
  ctx.globalAlpha = alpha===undefined ? 1 : alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  if(flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w*ax, -h*ay, w, h);
  ctx.restore();
}
// Capa del suelo (bajo los personajes): escarcha, grietas, avisos de pisada.
function drawChampFxGround(){
  for(const f of champFx){
    if(!inView(f.x||0, f.y||0, (f.r||200)+200) && f.type!=="andes") continue;
    if(f.type==="frost") libertadorDrawFrost(f);
    else if(f.type==="crack") erenDrawCrack(f);
    else if(f.type==="rumbleStep") erenDrawRumbleTelegraph(f);
    else if(f.type==="ring") seDrawRing(f);
  }
}
// Capa superior (sobre los personajes): jinetes, siluetas, pies gigantes, cables.
function drawChampFxTop(){
  for(const f of champFx){
    if(f.type==="riders") libertadorDrawRiders(f);
    else if(f.type==="spectral") libertadorDrawSpectral(f);
    else if(f.type==="rumbleStep") erenDrawRumbleFoot(f);
    else if(f.type==="bolt") erenDrawBolt(f);
    else if(f.type==="steam") erenDrawSteam(f);
  }
  for(const h of heroes){
    if(!h.alive) continue;
    if(h.granTimer>0) libertadorDrawBuffIcon(h);
    if(h.classKey==="eren") erenDrawOverlays(h);
  }
}
// Capa de pantalla (encima de todo el mundo): Cordillera y nieve del Cruce, siluetas del Retumbar.
function drawChampFxScreen(){
  for(const f of champFx){
    if(f.type==="andes") libertadorDrawAndesScreen(f);
    else if(f.type==="rumbling") erenDrawRumblingScreen(f);
  }
}
function seDrawRing(f){
  const a = _fxA(f), prog = 1-a;
  ctx.save();
  ctx.globalAlpha = a*0.8;
  ctx.strokeStyle = f.color||"#ffffff"; ctx.lineWidth = f.w||4;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r*(0.3+0.7*prog), f.r*(0.3+0.7*prog)*0.62, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}
