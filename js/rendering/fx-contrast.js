"use strict";
/* ============================================================
   js/rendering/fx-contrast.js
   PASE DE CONTRASTE DE EFECTOS (lectura de habilidades).
   Criterio de VFX: un efecto se lee por VALOR antes que por color. Cada efecto de habilidad
   tiene ahora tres capas:
     1) una "sombra de contraste" oscura y suave debajo (sin ella, el brillo aditivo se lava en
        pisos claros: nieve de la Gélida, lava de la Infernal, esporas del Micelial),
     2) el color propio (del campeón / del elemento),
     3) un núcleo o filo casi blanco (lo que el ojo agarra primero).
   Más dos momentos que faltaban:
     - ANTICIPACIÓN: al lanzar, un destello corto en el campeón con su color (se ve quién lanzó),
     - IMPACTO: al pegar una habilidad, una estrella de luz de 1–2 cuadros sobre el enemigo.
   En red viaja el destello de lanzamiento (uno por habilidad); la estrella de impacto se dibuja
   donde se calcula el daño (puede haber decenas por cuadro y taparía eventos importantes).
   Barato: todo son pools fijos y sprites cacheados (sin shadowBlur ni filtros por cuadro).
   ============================================================ */
// cuánto oscurece la sombra de contraste según el piso de la arena (pisos claros piden más)
const FX_CONTRAST_UNDER = {hielo:0.5, micelial:0.42, infernal:0.42, acuatica:0.36, fortaleza:0.34, laberinto:0.34, bosque:0.3, divina:0.34};
function fxUnder(){ return FX_CONTRAST_UNDER[currentArena] || 0.3; }
// Modo "brillo" del primitivo de sprites (anim-atlas.js): se prende SOLO mientras se dibujan efectos
// de habilidad (no personajes ni escenario). Con el cuadro cargado (vfxLoad bajo) se apaga solo.
const FX_GLOW = {on:false, under:0.3, add:0.32};
function fxGlowBegin(){ if(typeof vfxLoad!=="undefined" && vfxLoad < 0.55) return; FX_GLOW.on = true; FX_GLOW.under = fxUnder()*0.55; }
function fxGlowEnd(){ FX_GLOW.on = false; }

// sombra suave cacheada (círculo negro difuso)
let _fxDarkSpr = null;
function fxDarkSprite(){
  if(_fxDarkSpr) return _fxDarkSpr;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0, "rgba(0,0,0,0.9)"); gr.addColorStop(0.5, "rgba(0,0,0,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0,0,64,64);
  return (_fxDarkSpr = c);
}
// estrella de 4 puntas cacheada por color (núcleo blanco + puntas del color)
const _fxStarCache = {};
function fxStarSprite(rgb){
  let c = _fxStarCache[rgb]; if(c) return c;
  c = document.createElement("canvas"); c.width = c.height = 96;
  const g = c.getContext("2d"); g.translate(48, 48);
  const gl = g.createRadialGradient(0,0,0,0,0,40); gl.addColorStop(0, `rgba(${rgb},0.7)`); gl.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gl; g.fillRect(-48,-48,96,96);
  for(const [len, w, col] of [[46, 7, `rgba(${rgb},0.95)`], [34, 3, "rgba(255,255,255,1)"]]){
    g.fillStyle = col;
    for(let k=0;k<4;k++){ g.save(); g.rotate(k*Math.PI/2); g.beginPath(); g.moveTo(0,-len); g.lineTo(w,0); g.lineTo(0,len*0.18); g.lineTo(-w,0); g.closePath(); g.fill(); g.restore(); }
  }
  g.fillStyle = "#fff"; g.beginPath(); g.arc(0,0,6,0,Math.PI*2); g.fill();
  return (_fxStarCache[rgb] = c);
}
function fxHeroRgb(h){ return h && h.cls ? hexToRgb(h.cls.glow || h.cls.color || "#ffffff") : "255,240,200"; }

/* ---------------- destellos de impacto ---------------- */
const FX_FLASH_MAX = 24, fxFlashes = [];
for(let i=0;i<FX_FLASH_MAX;i++) fxFlashes.push({on:false, x:0, y:0, t:0, dur:0, s:0, rgb:"255,255,255", rot:0});
function vfxHitFlash(x, y, rgb, pow){
  if(!inView(x, y, 80)) return;
  let f = null;
  for(let i=0;i<FX_FLASH_MAX;i++){ if(!fxFlashes[i].on){ f = fxFlashes[i]; break; } }
  if(!f) return;
  f.on = true; f.x = x; f.y = y; f.t = 0; f.dur = pow>=3 ? 150 : 110; f.s = pow>=4 ? 92 : (pow>=3 ? 70 : 50); f.rgb = rgb || "255,240,200"; f.rot = Math.random()*0.8 - 0.4;
}
/* ---------------- anticipación al lanzar ---------------- */
const FX_CAST_MAX = 10, fxCasts = [];
for(let i=0;i<FX_CAST_MAX;i++) fxCasts.push({on:false, x:0, y:0, t:0, dur:0, rgb:"255,255,255", ult:false});
// (x, y, rgb): números y texto, así viaja liviano por la red a los invitados
function vfxCastFlash(x, y, rgb, ult){
  if(!inView(x, y, 120)) return;
  let f = null;
  for(let i=0;i<FX_CAST_MAX;i++){ if(!fxCasts[i].on){ f = fxCasts[i]; break; } }
  if(!f) return;
  f.on = true; f.x = x; f.y = y; f.t = 0; f.dur = ult ? 420 : 260; f.rgb = rgb || "255,240,200"; f.ult = !!ult;
}
function fxContrastUpdate(dt){
  for(let i=0;i<FX_FLASH_MAX;i++){ const f = fxFlashes[i]; if(f.on){ f.t += dt; if(f.t >= f.dur) f.on = false; } }
  for(let i=0;i<FX_CAST_MAX;i++){ const f = fxCasts[i]; if(f.on){ f.t += dt; if(f.t >= f.dur) f.on = false; } }
}
// Se dibuja arriba de las entidades (después de los sprites de efecto).
function drawFxContrastTop(){
  ctx.save();
  for(let i=0;i<FX_CAST_MAX;i++){
    const f = fxCasts[i]; if(!f.on) continue;
    const x = f.x, y = f.y - 26;
    const q = f.t/f.dur, a = 1 - q, R = (f.ult ? 90 : 56)*(0.35 + 0.65*_easeOut(q));
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a*fxUnder();
    ctx.drawImage(fxDarkSprite(), x-R*1.2, y-R*1.2, R*2.4, R*2.4);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a*0.9;
    ctx.drawImage(glowSprite(f.rgb), x-R, y-R, R*2, R*2);
    ctx.strokeStyle = `rgba(255,255,255,${a*0.85})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, R*0.7, 0, Math.PI*2); ctx.stroke();
  }
  for(let i=0;i<FX_FLASH_MAX;i++){
    const f = fxFlashes[i]; if(!f.on) continue;
    const q = f.t/f.dur, a = q < 0.25 ? 1 : 1 - (q-0.25)/0.75, s = f.s*(0.7 + 0.5*Math.min(1, q*3));
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a*fxUnder()*0.8;
    ctx.drawImage(fxDarkSprite(), f.x - s*0.55, f.y - s*0.55, s*1.1, s*1.1);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
    ctx.drawImage(fxStarSprite(f.rgb), -s/2, -s/2, s, s);
    ctx.restore();
  }
  ctx.restore();
}
