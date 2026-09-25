"use strict";
/* ============================================================
   js/rendering/vfx.js
   VFX central: partículas, ondas, telegraphs, sprites de efecto, screen shake,
   muertes y golpes. Pools de tamaño fijo para no crear basura por frame.
   ============================================================ */

/* ---------------- VFX: pool de partículas (Structure-of-Arrays, sin allocations) ---------------- */
const VFX_MAX = 720;
const vX = new Float32Array(VFX_MAX), vY = new Float32Array(VFX_MAX), vVX = new Float32Array(VFX_MAX), vVY = new Float32Array(VFX_MAX);
const vLife = new Float32Array(VFX_MAX), vMax = new Float32Array(VFX_MAX), vSize = new Float32Array(VFX_MAX), vGrav = new Float32Array(VFX_MAX);
const vKind = new Uint8Array(VFX_MAX), vPrio = new Uint8Array(VFX_MAX);
const vCol = new Array(VFX_MAX).fill("#fff");
let vCount = 0;
let vfxLoad = 1, vfxFrameEma = 16;
// Límite dinámico: cuanto peor va el frame (FPS), menos partículas secundarias se emiten.
function vfxFrame(dt){
  animDt = dt;
  vfxFrameEma = vfxFrameEma*0.94 + dt*0.06;
  let target = vfxFrameEma<=18 ? 1 : (vfxFrameEma>=34 ? 0.3 : 1-(vfxFrameEma-18)/16*0.7);
  if(enemies.length>90) target *= 0.75;
  vfxLoad += (target-vfxLoad)*0.1;
}
// prio: 2 = jugador/jefe/ataque peligroso (siempre), 1 = importante, 0 = secundario (se recorta primero)
// kind: 0 cuadrado pixel, 1 glow aditivo, 2 estela (línea en la dirección de la velocidad)
function vfxBurst(x, y, n, pal, spd, life, size, prio, upBias, kind){
  if(prio<2){
    if(!inView(x, y, 80)) return;
    n = Math.round(n*(prio===1 ? Math.max(0.5,vfxLoad) : vfxLoad));
    if(n<=0) return;
  }
  const cols = VFX_PAL[pal] || VFX_PAL.spark;
  const cap = prio>=2 ? VFX_MAX : Math.floor(VFX_MAX*0.82*(prio===1?1:vfxLoad));
  for(let i=0;i<n;i++){
    if(vCount >= cap) return;
    const j = vCount++;
    const a = Math.random()*6.2832, s = spd*(0.35+Math.random()*0.65);
    vX[j] = x; vY[j] = y; vVX[j] = Math.cos(a)*s; vVY[j] = Math.sin(a)*s*0.7 + (upBias||0);
    vLife[j] = vMax[j] = life*(0.7+Math.random()*0.5); vSize[j] = size; vGrav[j] = kind===1 ? -8 : 60;
    vKind[j] = kind||0; vPrio[j] = prio; vCol[j] = cols[(Math.random()*3)|0];
  }
}
// Partículas que convergen hacia un punto (acumulación de energía de un cast)
function vfxConverge(x, y, pal, r, prio){
  if(prio<2 && !inView(x,y,60)) return;
  if(vCount >= VFX_MAX*0.85) return;
  const cols = VFX_PAL[pal] || VFX_PAL.spark;
  const j = vCount++, a = Math.random()*6.2832, d = r*(0.7+Math.random()*0.5), life = 260;
  vX[j] = x+Math.cos(a)*d; vY[j] = y+Math.sin(a)*d*0.7; vVX[j] = -Math.cos(a)*d/(life/1000); vVY[j] = -Math.sin(a)*d*0.7/(life/1000);
  vLife[j] = vMax[j] = life; vSize[j] = 2.5; vGrav[j] = 0; vKind[j] = 1; vPrio[j] = prio; vCol[j] = cols[(Math.random()*3)|0];
}
function vfxUpdateParticles(dt){
  const k = dt/1000;
  for(let i=0;i<vCount;){
    vLife[i] -= dt;
    if(vLife[i] <= 0){
      const l = --vCount;
      if(i!==l){ vX[i]=vX[l]; vY[i]=vY[l]; vVX[i]=vVX[l]; vVY[i]=vVY[l]; vLife[i]=vLife[l]; vMax[i]=vMax[l]; vSize[i]=vSize[l]; vGrav[i]=vGrav[l]; vKind[i]=vKind[l]; vPrio[i]=vPrio[l]; vCol[i]=vCol[l]; }
      continue;
    }
    vVY[i] += vGrav[i]*k; vVX[i] *= 0.985; vVY[i] *= 0.985;
    vX[i] += vVX[i]*k; vY[i] += vVY[i]*k;
    i++;
  }
}
const _glowCache = {};
function glowSprite(rgb){
  let c = _glowCache[rgb];
  if(c) return c;
  c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0,0,64,64);
  _glowCache[rgb] = c;
  return c;
}
const _hexRgbCache = {};
function hexToRgb(hex){
  let r = _hexRgbCache[hex];
  if(r) return r;
  let h = String(hex||"#ffffff").replace("#","");
  if(h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const n = parseInt(h.slice(0,6),16);
  r = isNaN(n) ? "255,255,255" : `${(n>>16)&255},${(n>>8)&255},${n&255}`;
  _hexRgbCache[hex] = r;
  return r;
}
function vfxDrawParticles(){
  if(!vCount) return;
  for(let i=0;i<vCount;i++){
    if(vKind[i]!==0) continue;
    const a = vLife[i]/vMax[i];
    ctx.globalAlpha = a>0.5 ? 1 : a*2;
    ctx.fillStyle = vCol[i];
    const s = vSize[i]*(0.6+0.4*a);
    ctx.fillRect(vX[i]-s/2, vY[i]-s/2, s, s);
  }
  ctx.globalCompositeOperation = "lighter";
  for(let i=0;i<vCount;i++){
    if(vKind[i]===0) continue;
    const a = vLife[i]/vMax[i];
    if(vKind[i]===2){ // estela suave de velocidad
      const s = vSize[i]*(1+0.6*(1-a));
      ctx.globalAlpha = a*0.35;
      ctx.drawImage(glowSprite(hexToRgb(vCol[i])), vX[i]-s, vY[i]-s, s*2, s*2);
      continue;
    }
    const s = vSize[i]*4;
    ctx.globalAlpha = Math.min(1, a*1.4);
    ctx.fillStyle = vCol[i];
    ctx.fillRect(vX[i]-vSize[i]/2, vY[i]-vSize[i]/2, vSize[i], vSize[i]);
    ctx.globalAlpha = a*0.5;
    ctx.drawImage(glowSprite(hexToRgb(vCol[i])), vX[i]-s, vY[i]-s, s*2, s*2);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

/* ---------------- VFX: ondas de choque, telegraphs, sprites de efecto, screen shake ---------------- */
const VFX_SHOCK_MAX = 28, vfxShocks = [];
for(let i=0;i<VFX_SHOCK_MAX;i++) vfxShocks.push({on:false, x:0, y:0, r0:0, r1:0, t:0, dur:0, rgb:"255,255,255"});
function vfxShock(x, y, r0, r1, rgb, dur, prio){
  if(prio<2 && (!inView(x,y,r1) || vfxLoad<0.45)) return;
  let s = null;
  for(let i=0;i<VFX_SHOCK_MAX;i++){ if(!vfxShocks[i].on){ s = vfxShocks[i]; break; } }
  if(!s){ if(prio<2) return; s = vfxShocks[0]; }
  s.on = true; s.x = x; s.y = y; s.r0 = r0; s.r1 = r1; s.t = 0; s.dur = dur; s.rgb = rgb;
}
const VFX_TELE_MAX = 96, vfxTeles = [];
for(let i=0;i<VFX_TELE_MAX;i++) vfxTeles.push({on:false, x:0, y:0, r:0, t:0, dur:0, rgb:"255,70,50", shape:0, dx:1, dy:0, arc:0.8, len:0, follow:null, link:null, aimAt:null});
// Telegraph de zona peligrosa: shape 0 = círculo, 1 = cono (dx,dy,arc), 2 = línea (dx,dy,len, r = medio ancho).
// `follow` = entidad cuyo x/y sigue; `link` = entidad con bossWind cuyo progreso real sincroniza la barra.
function vfxTelegraph(o){
  let s = null;
  for(let i=0;i<VFX_TELE_MAX;i++){ if(!vfxTeles[i].on){ s = vfxTeles[i]; break; } }
  if(!s) s = vfxTeles[0];
  s.on = true; s.t = 0; s.dur = o.dur||700; s.r = o.r||100; s.rgb = o.rgb||"255,70,50"; s.shape = o.shape||0;
  s.dx = o.dx||1; s.dy = o.dy||0; s.arc = o.arc||0.8; s.len = o.len||0; s.r2 = o.r2||0; s.follow = o.follow||null; s.link = o.link||null; s.aimAt = o.aimAt||null;
  s.x = o.x!==undefined ? o.x : (s.follow ? s.follow.x : 0); s.y = o.y!==undefined ? o.y : (s.follow ? s.follow.y : 0);
  return s;
}
const VFX_SPR_MAX = 40, vfxSprites = [];
for(let i=0;i<VFX_SPR_MAX;i++) vfxSprites.push({on:false, key:"", frame:0, x:0, y:0, h:0, t:0, dur:0, follow:null, grow:0.2, flip:false, anchorY:0.9, alpha:1, fps:0, vx:0, vy:0, ground:false, rot:0});
// Fuentes de frames para vfxSprite además de las de la Arena Acuática (ACUA2_IMG): arte real ya
// embebido que antes no tenía cómo mostrarse (p.ej. la Plaga del Nigromante en el suelo).
// `ground` = se dibuja bajo las entidades (efecto de suelo) en vez de encima.
const VFX_SPR_EXTRA = {
  // ground2/ground3 tienen proporciones parecidas (~2:1) y alternan sin "saltar" de tamaño; ground1
  // es un plano mucho más ancho (3.5:1) -por eso se muestra aparte (nigroPlagueBurst), una sola
  // vez al momento del cast, en vez de mezclado en este loop-.
  nigroPlague: { imgs:[NIGRO_PLAGUE_FX_IMG.ground2, NIGRO_PLAGUE_FX_IMG.ground3],
                 ready:()=>NIGRO_PLAGUE_FX_READY.ground2 && NIGRO_PLAGUE_FX_READY.ground3, ground:true },
  nigroPlagueBurst: { imgs:[NIGRO_PLAGUE_FX_IMG.ground1], ready:()=>NIGRO_PLAGUE_FX_READY.ground1, ground:true },
  // Destello decorativo sobre la mano del Nigromante transformado al castear la Plaga -no es un
  // proyectil real (no viaja ni aplica daño): solo el mismo frame quieto con fade, como cualquier
  // otro efecto de vfxSprite-.
  nigroSoulFireFlare: { imgs:[NIGRO_DEMON_IMG.soulFireProj], ready:()=>NIGRO_DEMON_READY.soulFireProj, ground:false },
  // Corte del Rōnin: destello de impacto real (antes solo el chispazo genérico de pushSpark).
  musashiRoninImpact: { imgs:[MUSASHI_REAL_IMG.ronin4], ready:()=>MUSASHI_REAL_READY.ronin4 && !(CHAMP_PACK.musashi && CHAMP_PACK.musashi.ready), ground:false },
  // Último Duelo: banners decorativos (no reemplazan el cuerpo de Musashi, van superpuestos
  // arriba de él) para la entrada a la arena de bolsillo y el instante del Golpe de Gracia.
  musashiPortal: { imgs:[MUSASHI_REAL_IMG.ultiPortal], ready:()=>MUSASHI_REAL_READY.ultiPortal, ground:false },
  // (dibujan al Musashi/Sylva viejos: se apagan cuando está cargado el arte nuevo, para no mezclar estilos)
  musashiFinish: { imgs:[MUSASHI_REAL_IMG.ultiFinish], ready:()=>MUSASHI_REAL_READY.ultiFinish && !(CHAMP_PACK.musashi && CHAMP_PACK.musashi.ready), ground:false },
  // Flecha Perforante: impacto crítico real sobre la Presa Acorralada (antes sin usar).
  sylvaPiercingCrit: { imgs:[SYLVA_REAL_IMG.piercingCrit], ready:()=>SYLVA_REAL_READY.piercingCrit && !(CHAMP_PACK.cazadora && CHAMP_PACK.cazadora.ready), ground:false },
  // Materialización real al invocar esqueletos/Golem (antes sin usar).
  nigroSkeletonSpawnWarrior: { imgs:[NIGRO_SKEL_IMG.spawnWarrior], ready:()=>NIGRO_SKEL_READY.spawnWarrior, ground:false },
  nigroSkeletonSpawnMage: { imgs:[NIGRO_SKEL_IMG.spawnMage], ready:()=>NIGRO_SKEL_READY.spawnMage, ground:false },
  nigroGolemSpawn: { imgs:[NIGRO_GOLEM_IMG.spawn], ready:()=>NIGRO_GOLEM_READY.spawn, ground:false },
  // Pack de VFX propio (dibujado a mano vía formas vectoriales, no arte de campeón): cristal/runa
  // de hielo del Mago, tajo del Segador y su ulti, sanación/escudo del Soporte, salpicadura de agua.
  fxIceCrystal:      { imgs:NEWFX_IMG.iceCrystal,      ready:()=>newfxReady('iceCrystal'),      ground:false },
  fxFrostRune:       { imgs:NEWFX_IMG.frostRune,       ready:()=>newfxReady('frostRune'),       ground:false },
  fxScytheSlash:     { imgs:NEWFX_IMG.scytheSlash,     ready:()=>newfxReady('scytheSlash'),     ground:false },
  fxSoulReapBurst:   { imgs:NEWFX_IMG.soulReapBurst,   ready:()=>newfxReady('soulReapBurst'),   ground:false },
  fxHolyHealBurst:   { imgs:NEWFX_IMG.holyHealBurst,   ready:()=>newfxReady('holyHealBurst'),   ground:false },
  fxHolyShieldBubble:{ imgs:NEWFX_IMG.holyShieldBubble,ready:()=>newfxReady('holyShieldBubble'),ground:false },
  fxWaterSplash:     { imgs:NEWFX_IMG.waterSplash,     ready:()=>newfxReady('waterSplash'),     ground:false },
};
function vfxSprImgs(key){ const x = VFX_SPR_EXTRA[key]; return x ? x.imgs : ACUA2_IMG[key]; }
function vfxSprReady(key){ const x = VFX_SPR_EXTRA[key]; return x ? x.ready() : acua2Ready(key); }
// Efecto de sprite real (tentáculos, salpicaduras, olas, remolinos...) con crecimiento y fade.
function vfxSprite(key, frame, x, y, h, dur, follow, grow, flip, anchorY, fps, vx, vy, rot){
  if(!vfxSprReady(key)) return;
  let s = null;
  for(let i=0;i<VFX_SPR_MAX;i++){ if(!vfxSprites[i].on){ s = vfxSprites[i]; break; } }
  if(!s) return;
  s.on = true; s.key = key; s.frame = frame; s.x = x; s.y = y; s.h = h; s.t = 0; s.dur = dur; s.follow = follow||null;
  s.grow = grow===undefined ? 0.2 : grow; s.flip = !!flip; s.anchorY = anchorY===undefined ? 0.9 : anchorY; s.fps = fps||0; s.vx = vx||0; s.vy = vy||0;
  s.ground = !!(VFX_SPR_EXTRA[key] && VFX_SPR_EXTRA[key].ground);
  s.rot = rot||0; // opcional: para efectos direccionales (p.ej. un tajo que sigue el ángulo del golpe)
}
let vfxLastShakeAt = 0;
// Screen shake controlado: solo para golpes realmente importantes, con tope y enfriamiento.
function vfxShake(amount){
  if(animNow - vfxLastShakeAt < 280 && amount < 10) return;
  if(amount < screenShake*0.8) return;
  vfxLastShakeAt = animNow;
  screenShake = Math.min(16, Math.max(screenShake, amount));
}
function vfxImpactHeavy(ent, prof, strength){
  const rgb = (VFX_PAL[prof.material]||VFX_PAL.rock)[3];
  const R = (ent.radius||40);
  vfxShock(ent.x, ent.y, R*0.4, R*3.0*strength, rgb, 520, 2);
  vfxBurst(ent.x, ent.y-6, Math.round(14*strength), prof.material, 170, 420, 4, 2, -40, 0);
  if(player && distance(ent, player) < 520) vfxShake(5+5*strength);
}
function vfxUpdate(dt){
  vfxUpdateParticles(dt);
  for(let i=0;i<VFX_SHOCK_MAX;i++){ const s = vfxShocks[i]; if(s.on){ s.t += dt; if(s.t>=s.dur) s.on = false; } }
  for(let i=0;i<VFX_TELE_MAX;i++){
    const s = vfxTeles[i]; if(!s.on) continue;
    s.t += dt;
    if(s.follow){ if(s.follow.alive===false){ s.on = false; continue; } s.x = s.follow.x; s.y = s.follow.y; }
    if(s.aimAt){ const dx=s.aimAt.x-s.x, dy=s.aimAt.y-s.y, dl=Math.hypot(dx,dy)||1; s.dx=dx/dl; s.dy=dy/dl; }
    // al resolverse un aviso, quien estaba cerca pero afuera lo "esquivó" (Rey del Laberinto)
    if(s.link){ if(!s.link.alive || !s.link.bossWind){ s.on = false; if(s.link.alive) setsOnTelegraphEnd(s); continue; } }
    else if(s.t>=s.dur){ s.on = false; setsOnTelegraphEnd(s); }
  }
  for(let i=0;i<VFX_SPR_MAX;i++){
    const s = vfxSprites[i]; if(!s.on) continue;
    s.t += dt; s.x += s.vx*dt/1000; s.y += s.vy*dt/1000;
    if(s.follow){ if(s.follow.alive===false){ s.on = false; continue; } s.x = s.follow.x; s.y = s.follow.y; }
    if(s.t>=s.dur) s.on = false;
  }
  for(let i=0;i<vfxDyingN;i++){ vfxDying[i].t += dt; }
  let w = 0;
  for(let i=0;i<vfxDyingN;i++){ const d = vfxDying[i]; if(d.t < d.dur){ if(w!==i){ const tmp = vfxDying[w]; vfxDying[w] = d; vfxDying[i] = tmp; } w++; } else d.e = null; }
  vfxDyingN = w;
}
function vfxDrawGround(){
  for(let i=0;i<VFX_TELE_MAX;i++){
    const s = vfxTeles[i]; if(!s.on) continue;
    if(!inView(s.x, s.y, s.r + s.len + 40)) continue;
    const q = s.link && s.link.bossWind ? Math.min(1, s.link.bossWind.t/s.link.bossWind.dur) : Math.min(1, s.t/s.dur);
    const pulse = 0.5+0.5*Math.sin(animNow/70);
    ctx.save();
    // Se dibujan como círculos reales (antes aplastados al 55% en vertical): el daño se calcula
    // con distancia real, así que un aviso aplastado dejaba "afuera" en pantalla a quien en
    // realidad iba a recibir el golpe estando arriba o abajo del jefe.
    ctx.translate(s.x, s.y+6);
    if(s.shape===4){
      // ZONA SEGURA (verde): lo único que salva de un ataque a toda la arena
      const pulseS = 0.5+0.5*Math.sin(animNow/110);
      ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${s.rgb},${0.18+0.12*pulseS})`; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = `rgba(${s.rgb},${0.75+0.25*pulseS})`; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s.r*(1-q)+4, 0, Math.PI*2); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.stroke();
      ctx.font = "bold 18px Georgia, serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(230,255,235,0.95)"; ctx.fillText("SEGURO", 0, 6);
      ctx.restore();
      continue;
    }
    ctx.beginPath();
    if(s.shape===3){
      // anillo: peligro entre r2 y r (el centro es seguro)
      ctx.arc(0, 0, s.r, 0, Math.PI*2); ctx.moveTo(s.r2, 0); ctx.arc(0, 0, s.r2, 0, Math.PI*2, true);
    } else if(s.shape===1){
      const ang = Math.atan2(s.dy, s.dx);
      ctx.moveTo(0,0); ctx.arc(0, 0, s.r, ang-s.arc, ang+s.arc); ctx.closePath();
    } else if(s.shape===2){
      const ang = Math.atan2(s.dy, s.dx);
      ctx.rotate(ang); ctx.rect(0, -s.r, s.len, s.r*2);
    } else {
      ctx.arc(0, 0, s.r, 0, Math.PI*2);
    }
    // El peligro se vuelve más evidente cuanto más cerca está el golpe: en el último tramo el
    // borde engrosa, late más rápido y aparece un filo blanco.
    const hot = q>0.72 ? (q-0.72)/0.28 : 0;
    const pulse2 = hot>0 ? 0.5+0.5*Math.sin(animNow/(70-40*hot)) : pulse;
    ctx.fillStyle = `rgba(${s.rgb},${0.10+0.12*q+0.10*hot})`; ctx.fill();
    ctx.lineWidth = 4+3*hot; ctx.strokeStyle = `rgba(${s.rgb},${0.55+0.35*pulse2})`; ctx.stroke();
    if(hot>0){ ctx.lineWidth = 2; ctx.strokeStyle = `rgba(255,255,255,${0.3+0.55*hot*pulse2})`; ctx.stroke(); }
    // relleno que avanza: cuánto falta para el golpe
    ctx.beginPath();
    if(s.shape===3){ const rr = s.r2 + (s.r-s.r2)*q; ctx.arc(0, 0, rr, 0, Math.PI*2); ctx.moveTo(s.r2, 0); ctx.arc(0, 0, s.r2, 0, Math.PI*2, true); }
    else if(s.shape===1){ const ang = Math.atan2(s.dy, s.dx); ctx.moveTo(0,0); ctx.arc(0, 0, s.r*q, ang-s.arc, ang+s.arc); ctx.closePath(); }
    else if(s.shape===2){ ctx.rect(0, -s.r, s.len*q, s.r*2); }
    else ctx.arc(0, 0, s.r*q, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${s.rgb},${0.16+0.14*q})`; ctx.fill();
    ctx.restore();
  }
  for(let i=0;i<VFX_SHOCK_MAX;i++){
    const s = vfxShocks[i]; if(!s.on) continue;
    const q = s.t/s.dur, e = _easeOut(q), r = s.r0 + (s.r1-s.r0)*e;
    ctx.strokeStyle = `rgba(${s.rgb},${(1-q)*0.85})`; ctx.lineWidth = 1+6*(1-q);
    ctx.beginPath(); ctx.ellipse(s.x, s.y+6, r, r*0.55, 0, 0, Math.PI*2); ctx.stroke();
  }
}
const _ONE_CLIP = {frames:[{x:0, y:0, w:1, h:1}]};
function drawImgSized(img, x, y, h, ax, ay, flip, alpha, rot){
  const s = h/img.height;
  const f = _ONE_CLIP.frames[0]; f.w = img.width; f.h = img.height;
  drawAnimFrameSized(img, _ONE_CLIP, 0, x, y, img.width*s, h, ax, ay, flip, alpha, rot);
}
function vfxDrawSprites(ground){
  for(let i=0;i<VFX_SPR_MAX;i++){
    const s = vfxSprites[i]; if(!s.on || s.ground!==!!ground) continue;
    if(!inView(s.x, s.y, s.h*2)) continue;
    const q = s.t/s.dur;
    const arr = vfxSprImgs(s.key);
    const idx = s.fps>0 ? Math.floor(s.t/1000*s.fps)%arr.length : Math.min(arr.length-1, s.frame);
    const img = arr[idx];
    const g = s.grow>0 ? _easeOut(Math.min(1, q/s.grow)) : 1;
    const a = q>0.7 ? (1-q)/0.3 : 1;
    drawImgSized(img, s.x, s.y, s.h*(0.35+0.65*g), 0.5, s.anchorY, s.flip, a*s.alpha, s.rot||0);
  }
}

/* ---------------- DEATH: el cuerpo real del enemigo (no un sprite genérico) cae / se desarma ---------------- */
const VFX_DYING_MAX = 40, vfxDying = [];
let vfxDyingN = 0;
for(let i=0;i<VFX_DYING_MAX;i++) vfxDying.push({e:null, t:0, dur:0, dx:0, dy:0, style:"fall", boss:false, side:1});
function vfxOnDeath(e){
  if(!ENEMY_BASE[e.type]) return false;
  const prof = animProfileOf(e);
  const boss = e.rank==="jefe";
  const big = boss || e.rank==="subjefe";
  const n = boss ? 36 : (e.rank==="subjefe" ? 22 : (e.rank==="elite" ? 14 : (e.rank==="subelite" ? 10 : 8)));
  vfxBurst(e.x, e.y-(e.radius||20)*0.6, n, prof.material, 140+(e.radius||20)*1.2, 460, big?4:3, big?2:0, -30, 0);
  if(big) vfxShock(e.x, e.y, (e.radius||40)*0.5, (e.radius||40)*3, (VFX_PAL[prof.material]||VFX_PAL.flesh)[3], 700, 2);
  if(!inView(e.x, e.y, (e.radius||20)*3+60) && !big) return false;
  let cap = VFX_DYING_MAX;
  if(!big && vfxLoad < 0.6) cap = 16;
  let slot = null;
  if(vfxDyingN < cap){ slot = vfxDying[vfxDyingN++]; }
  else if(big){ for(let i=0;i<vfxDyingN;i++){ if(!vfxDying[i].boss){ slot = vfxDying[i]; break; } } }
  if(!slot) return false;
  const src = e.lastHitBy;
  let dx = 0, dy = -1;
  if(src){ const ddx = e.x-src.x, ddy = e.y-src.y, dl = Math.hypot(ddx,ddy)||1; dx = ddx/dl; dy = ddy/dl; }
  slot.e = e; slot.t = 0; slot.boss = boss; slot.dx = dx; slot.dy = dy; slot.side = dx<0 ? -1 : 1;
  slot.style = boss && prof.death!=="frames" ? "boss" : prof.death;
  slot.dur = boss ? 2300 : (e.rank==="subjefe" ? 1300 : (prof.death==="frames" ? 900 : (vfxLoad<0.6 ? 380 : 560)));
  e.attackAnim = 0; e.fxAnim = null; e.skillAnim = null; e.hitFlash = 0;
  e._dyingP = 0;
  if(boss) vfxShake(12);
  return true;
}
function vfxDrawDying(){
  for(let i=0;i<vfxDyingN;i++){
    const d = vfxDying[i], e = d.e; if(!e) continue;
    const R = e.radius||20;
    if(!inView(e.x, e.y, R*4+80)) continue;
    const p = Math.min(1, d.t/d.dur);
    e._dyingP = p;
    let ox=0, oy=0, sx=1, sy=1, rot=0, alpha=1, flash=0;
    const react = d.boss ? 0.55 : 0.15;
    if(p<react){
      const a = p/react;
      ox = d.dx*6*(d.boss?0.3:1)*Math.sin(a*Math.PI); oy = d.dy*3*Math.sin(a*Math.PI);
      sx = 1+0.07*Math.sin(a*Math.PI); sy = 1-0.05*Math.sin(a*Math.PI);
      flash = d.boss ? (Math.sin(p*90)>0.3 ? 0.7 : 0.15) : 0.8*(1-a);
      if(d.boss){
        ox += (Math.random()-0.5)*8; oy += (Math.random()-0.5)*5;
        if(Math.random()<0.18){ const prof = animProfileOf(e); vfxBurst(e.x+(Math.random()-0.5)*R*1.6, e.y-Math.random()*R*1.8, 8, prof.material, 160, 380, 4, 2, -30, 1); }
        if(Math.random()<0.05) vfxShake(4);
      }
    } else {
      const a = (p-react)/(1-react);
      const ea = _ease(Math.min(1, a*1.6));
      switch(d.style){
        case "crumble": sy = 1-0.65*ea; sx = 1+0.2*ea; ox = (Math.random()-0.5)*2*(1-a); break;
        case "dissolve": oy = -12*ea; sx = 1-0.3*ea; sy = 1+0.15*ea; break;
        case "sink": oy = 14*ea; sy = 1-0.2*ea; break;
        case "frames": break;
        case "collapse": case "boss": sy = 1-0.5*ea; sx = 1+0.12*ea; oy = 4*ea; break;
        default: rot = d.side*1.35*ea; oy = 3*ea; break; // "fall": cae de costado según de dónde vino el golpe
      }
      alpha = d.style==="frames" ? (a<0.6 ? 1 : 1-(a-0.6)/0.4) : (a<0.35 ? 1 : 1-(a-0.35)/0.65);
      if(d.style==="dissolve" && Math.random()<0.3*vfxLoad){ const prof = animProfileOf(e); vfxBurst(e.x+(Math.random()-0.5)*R, e.y-Math.random()*R*1.5, 1, prof.material, 20, 500, 3, 0, -40, 1); }
      if(d.style==="sink" && Math.random()<0.25*vfxLoad){ vfxBurst(e.x+(Math.random()-0.5)*R, e.y-R*0.3, 1, "water", 12, 600, 2, 0, -50, 1); }
    }
    if(alpha<=0.01) continue;
    ctx.save();
    ctx.translate(e.x+ox, e.y+oy); if(rot) ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-e.x, -e.y);
    const m = ANIM_ALPHA_MUL;
    ANIM_ALPHA_MUL = alpha; ctx.globalAlpha = alpha;
    drawEnemyBody(e);
    if(flash>0){
      ctx.globalCompositeOperation = "lighter";
      ANIM_ALPHA_MUL = flash*alpha; ctx.globalAlpha = flash*alpha;
      drawEnemyBody(e);
    }
    ANIM_ALPHA_MUL = m;
    ctx.restore();
  }
}
function vfxResetRun(){
  vCount = 0; vfxDyingN = 0;
  if(typeof floatTexts!=="undefined") for(const f of floatTexts) f.on = false;
  for(const s of vfxShocks) s.on = false;
  for(const s of vfxTeles) s.on = false;
  for(const s of vfxSprites) s.on = false;
}

// Golpe recibido por un enemigo: partículas según el tipo de daño (quemadura/hielo/sangrado)
// o el estilo del atacante, mezcladas con el material del que recibe.
function vfxHit(e, src, opts, crit){
  const prof = animProfileOf(e);
  const prio = (src===player || prof.isBoss) ? 2 : 0;
  let pal = opts.burn ? "ember" : (opts.slow ? "ice" : (opts.bleed ? "blood" : null));
  if(!pal){ const sp = src ? animProfileOf(src) : null; pal = sp && sp.particle ? sp.particle : "spark"; }
  const x = e.x, y = e.y-16;
  const n = crit ? 6 : 3;
  vfxBurst(x, y, Math.ceil(n*0.6), pal, crit?130:95, 200, crit?3.5:2.5, prio, -30, 0);
  vfxBurst(x, y, Math.max(1, Math.floor(n*0.5)), prof.material, 80, 220, 2.5, prio===2?1:0, -20, 0);
  if(crit) vfxBurst(x, y, 2, pal, 40, 180, 3, prio, 0, 1);
  if(crit && prio===2) vfxShock(e.x, e.y, 6, 26+(e.radius||20), "255,255,255", 220, 1);
  // Salpicadura real de agua en golpes a enemigos acuáticos (además de las partículas genéricas).
  if(prof.material==="water" && newfxReady('waterSplash')) vfxSprite("fxWaterSplash", 0, x, y+10, crit?58:40, 420, null, 0, false, 0.6, 10);
}
