"use strict";
/* ============================================================
   js/rendering/art-direction.js
   DIRECCIÓN DE ARTE TÉCNICA (solo dibujo: nada de esto toca hitbox, IA, daño, red ni guardado).

   1) LUZ POR ARENA (estilo Diablo II): el PISO se oscurece lejos de los guardianes y se ilumina en un
      radio alrededor de cada uno (y de los braseros/antorchas de la arena). Se dibuja DESPUÉS del
      escenario y ANTES de los avisos de peligro, los charcos de lava, los enemigos y los proyectiles:
      lo que hay que leer (telegrafiados, monstruos, botín) nunca queda tapado, y además resalta sobre un
      fondo más oscuro (contraste figura-fondo). Máscara chica (1/4 de la vista en unidades de mundo)
      con una textura radial cacheada: costo fijo, sin shaders. Tabla ARENA_LIGHT por arena.
      Se apaga sola si el juego va lento (con la resolución adaptable ya en su nivel más bajo) y se
      puede apagar con ?luz=0 o Q6_ART.light = 0.
      Las Minas (luz como mecánica, mn-light.js) y el apagón de la Ciudad (cm-render.js) tienen la suya.
   2) SOMBRA DE PISO común (drawShadow): elipse suave cacheada + núcleo de contacto, la misma para
      guardianes, enemigos, jefes, invocaciones y pociones.
   3) ESCALA DE PÍXEL (ver docs/alfa/q6_arte_tecnico.md, medida con tools/alfa/q6_pixel_scale.js):
      - arte fino reducido (guardianes: un píxel del arte = 0,3 píxeles de pantalla): se dibuja desde una
        versión reducida con filtro (mipmap cacheado, artMip) en vez de saltearse 2 de cada 3 píxeles con
        vecino más cercano: sin contornos que se cortan ni titileo al caminar.
      - arte chico ampliado: tope por tipo (ART_SCALE_CAP) para que ningún común supere la escala de un
        jefe y ningún jefe se vuelva bloques de 5-6 píxeles.
   ============================================================ */
const Q6_ART = (()=>{
  const q = (()=>{ try{ return new URLSearchParams(location.search); }catch(e){ return new URLSearchParams(""); } })();
  const off = k => q.get(k)==="0";
  return { light: off("luz") ? 0 : 1, shadow: off("sombra") ? 0 : 1, mip: off("mip") ? 0 : 1, cap: off("tope") ? 0 : 1, auto: 1 };
})();

/* ---------------- 1) luz por arena ---------------- */
// amb: oscuridad del piso lejos de toda luz (0..1) · tone: color de la penumbra · heroR: radio de luz de
// cada guardián (unidades de mundo; la vista tiene 650 de alto) · lights: los braseros/antorchas de la
// arena (aidLights) también abren luz. Valores suaves: es ambiente, no una mecánica.
const ARENA_LIGHT = {
  ciudad:    { amb:0.42, tone:"8,4,14",   heroR:270, lights:1 },
  fortaleza: { amb:0.38, tone:"14,5,2",   heroR:280, lights:1 },
  bosque:    { amb:0.32, tone:"4,10,4",   heroR:300, lights:1 },
  micelial:  { amb:0.40, tone:"8,3,12",   heroR:270, lights:1 },
  hielo:     { amb:0.26, tone:"6,12,26",  heroR:320, lights:1 },
  acuatica:  { amb:0.42, tone:"0,14,24",  heroR:270, lights:1 },
  laberinto: { amb:0.42, tone:"12,7,2",   heroR:260, lights:1 },
  abismo:    { amb:0.50, tone:"6,0,12",   heroR:250, lights:1 },
  infernal:  { amb:0.38, tone:"16,3,0",   heroR:280, lights:1 },
  // minas: la luz es la mecánica (mn-light.js); divina: arena de duelo, sin penumbra
};
const LIGHT_MASK_DS = 4;
let _lgMask = null, _lgCtx = null, _lgHole = null, _lgSlowMs = 0, _lgAutoOff = false;
function _lgRadial(){
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.85)");
  gr.addColorStop(0.75, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
}
// ¿Corresponde la penumbra en este cuadro? (se decide también por rendimiento: con la resolución adaptable
// ya en su piso y los cuadros lentos varios segundos, se apaga hasta el final de la partida)
function arenaLightCfg(){
  if(!Q6_ART.light || _lgAutoOff || !player || player.duelActive || (typeof divinaMode!=="undefined" && divinaMode)) return null;
  const L = ARENA_LIGHT[currentArena]; if(!L) return null;
  if(currentArena==="ciudad" && typeof cmS!=="undefined" && cmS && cmS.dark > 0.01) return null; // apagón propio
  return L;
}
function arenaLightPerf(dt){
  if(!Q6_ART.auto || typeof RES==="undefined" || typeof vfxFrameEma!=="number") return;
  const atFloor = RES.fixed!=null || !RES.auto || RES.i >= RES_LEVELS.length - 1;
  if(atFloor && vfxFrameEma > 30) _lgSlowMs += dt; else _lgSlowMs = Math.max(0, _lgSlowMs - dt*0.5);
  if(_lgSlowMs > 4000) _lgAutoOff = true;
}
function drawArenaLight(){
  if(state==="playing") arenaLightPerf(animDt);
  const L = arenaLightCfg(); if(!L) return;
  const W = VW/CAM_ZOOM, H = VH/CAM_ZOOM;
  const V = {x:player.x + CAM_LEAD_X - W/2 - 40, y:(player.y - CAM_LIFT + CAM_LEAD_Y) - (VH/2 - CAM_Y_ANCHOR)/CAM_ZOOM - 40, w:W + 80, h:H + 80};
  const mw = Math.ceil(V.w/LIGHT_MASK_DS) + 2, mh = Math.ceil(V.h/LIGHT_MASK_DS) + 2;
  if(!_lgMask){ _lgMask = document.createElement("canvas"); _lgCtx = _lgMask.getContext("2d"); _lgHole = _lgRadial(); }
  if(_lgMask.width !== mw || _lgMask.height !== mh){ _lgMask.width = mw; _lgMask.height = mh; }
  const m = _lgCtx, k = 1/LIGHT_MASK_DS, t = animNow/1000;
  m.globalCompositeOperation = "source-over"; m.globalAlpha = 1;
  m.clearRect(0, 0, mw, mh);
  m.fillStyle = `rgba(${L.tone},${L.amb})`; m.fillRect(0, 0, mw, mh);
  m.globalCompositeOperation = "destination-out";
  const hole = (x, y, r, a)=>{ if(a <= 0.01) return; const sx = (x - V.x)*k, sy = (y - V.y)*k, sr = r*k; if(sx + sr < 0 || sy + sr < 0 || sx - sr > mw || sy - sr > mh) return; m.globalAlpha = Math.min(1, a); m.drawImage(_lgHole, sx - sr, sy - sr*0.8, sr*2, sr*1.6); };
  for(const h of heroes){ if(h.alive) hole(h.x, h.y - 16, L.heroR*(h===player ? 1.08 : 0.95)*(1 + 0.012*Math.sin(t*7 + h.x*0.01)), 1); }
  if(L.lights && typeof aidLights!=="undefined") for(const A of aidLights){ if(A.a >= 0.25) hole(A.x, A.y, Math.max(90, A.r*1.3), Math.min(1, A.a*1.3)); }
  m.globalAlpha = 1; m.globalCompositeOperation = "source-over";
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(_lgMask, V.x, V.y, mw*LIGHT_MASK_DS, mh*LIGHT_MASK_DS);
  ctx.restore();
}

/* ---------------- 2) sombra de piso común ---------------- */
let _shSprite = null;
function _shadowSprite(){
  if(_shSprite) return _shSprite;
  const c = document.createElement("canvas"); c.width = 96; c.height = 96; const g = c.getContext("2d");
  const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, "rgba(0,0,0,0.62)"); gr.addColorStop(0.55, "rgba(0,0,0,0.46)");
  gr.addColorStop(0.82, "rgba(0,0,0,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
  return (_shSprite = c);
}
// Sombra suave (borde difuso, sin el corte duro de la elipse) con un núcleo de contacto más oscuro bajo
// los pies: ancla al piso a todos los actores por igual. Misma firma que la de siempre.
function drawShadow(x, y, rx){
  if(!(rx > 0.5)) return;
  if(!Q6_ART.shadow){
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(x, y+4, rx, rx*0.38, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    return;
  }
  const S = _shadowSprite(), w = rx*1.25, h = rx*0.48;
  const a0 = ctx.globalAlpha;
  ctx.drawImage(S, x - w, y + 4 - h, w*2, h*2);
  ctx.globalAlpha = a0*0.55;
  ctx.drawImage(S, x - rx*0.55, y + 3 - rx*0.2, rx*1.1, rx*0.4);
  ctx.globalAlpha = a0;
}

/* ---------------- 3) escala de píxel ---------------- */
// Mipmaps del arte fino: mitades sucesivas con filtro, una vez por imagen y nivel (se reusan siempre).
const _mipCache = new WeakMap();
function _mipLevel(img, lv){
  let arr = _mipCache.get(img);
  if(!arr){ arr = [img]; _mipCache.set(img, arr); }
  while(arr.length <= lv){
    const src = arr[arr.length - 1];
    const w = Math.max(1, Math.ceil((src.naturalWidth || src.width)/2)), h = Math.max(1, Math.ceil((src.naturalHeight || src.height)/2));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(src, 0, 0, w, h);
    c._srcImg = img._srcImg || img; // de qué arte real sale (herramientas de medición/cobertura)
    arr.push(c);
  }
  return arr[lv];
}
// Dibuja (img, recorte) en el rectángulo destino, eligiendo el mipmap para que cada píxel del arte que
// se usa quede entre ~0,7 y 1,4 píxeles de pantalla. Si la imagen no está lista, o no hace falta reducir,
// dibuja tal cual. Devuelve siempre lo mismo que un drawImage de 9 argumentos.
function artMipDraw(img, sx, sy, sw, sh, dx, dy, dw, dh){
  if(Q6_ART.mip && img && (img.naturalWidth || img.width) > 64){
    const m = ctx.getTransform(), k = Math.sqrt(Math.abs(m.a*m.d - m.b*m.c));
    const s = Math.abs(dw/(sw || 1))*k; // píxeles de pantalla por píxel del arte
    if(s < 0.7){
      const lv = Math.min(4, Math.floor(Math.log2(0.7/s)) + 1), f = 1/(1 << lv);
      const mi = _mipLevel(img, lv);
      if(mi){ ctx.drawImage(mi, sx*f, sy*f, Math.max(1, sw*f), Math.max(1, sh*f), dx, dy, dw, dh); return; }
    }
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
// Tope de escala por tipo (factor sobre el tamaño dibujado; 1 = sin cambio). Medido en un celular apaisado
// (844×390, 1 unidad de mundo = 1,2 píxeles de pantalla): comunes a ≤ 3 píxeles de pantalla por píxel del
// arte, jefes a ≤ 3 (antes hasta 6,2). Recortes chicos (≤ 12 %) salvo los jefes que se leían como bloques.
// Los comunes y jefes con tabla propia de alto (CM_HMUL, MN_HMUL, canon-sheets-meta) se corrigieron en su tabla;
// acá quedan los que se dibujan con código propio (el Leviatán: cabeza y lomos a 2,4-4,4).
const ART_SCALE_CAP = { leviatan:0.88 };
function artScaleCap(e){ return Q6_ART.cap ? (ART_SCALE_CAP[e.type] || 1) : 1; }
