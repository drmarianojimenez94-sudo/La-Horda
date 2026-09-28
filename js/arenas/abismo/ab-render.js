"use strict";
/* ============================================================
   js/arenas/abismo/ab-render.js
   Dibujo de la Arena del Abismo. Todo lo que decide el juego llega de abS (anfitrión); lo que es
   solo decorativo (polvo del vacío, ruinas lejanas, piedras que caen, cuerpos que se hunden) lo
   anima cada cliente con pools fijos.
   - Plataformas procedurales con la textura de piedra de la hoja (tex_piso): la cara lateral con
     estalactitas y la tapa se prerenderizan UNA vez por plataforma a media resolución (pixel art
     2x, barato en móviles). Grietas por estado (CRACKED / CRITICAL) en capas cacheadas aparte.
   - Estados legibles: CRÍTICA tiembla y brilla; DERRUMBE avisa con borde rojo que late y se sacude;
     se va hundiendo al vacío; RECONSTRUCCIÓN sube desde abajo con luz arcana (y se ve el contorno
     de dónde va a volver).
   - Presencia de lo que vive debajo: sombra enorme, ojo en el pozo, tentáculos; en el nivel 10 el
     ojo asoma por el borde del pozo y en la fase 3 se ve la mandíbula bajo la arena.
   ============================================================ */
const AB_IMG = {}, AB_OK = {};
function _abImg(key, src){ if(AB_IMG[key]) return AB_IMG[key]; const im = new Image(); im.onload = ()=>{ AB_OK[key] = true; }; im.src = src; AB_IMG[key] = im; return im; }
if(typeof ABISMO_TEX!=="undefined") for(const k in ABISMO_TEX) _abImg(k, ABISMO_TEX[k]);
if(typeof ABISMO_PIECES!=="undefined") for(const k in ABISMO_PIECES) ABISMO_PIECES[k].forEach((src, i)=>_abImg(k+"_"+i, src));
if(typeof ABISMO_EYE!=="undefined") for(const k in ABISMO_EYE) ABISMO_EYE[k].forEach((src, i)=>_abImg("eye_"+k+"_"+i, src));
if(typeof ABISMO_JAW!=="undefined") for(const k in ABISMO_JAW) _abImg("jaw_"+k, ABISMO_JAW[k]);

/* ---------------- geometría de dibujo (fija) ---------------- */
const AB_DEPTH = {hub:62, ring:78, spoke:36, seg:36};
const AB_POLY = AB_PLATS.map(p=>{
  const pts = [], A = AB_ASP;
  if(p.kind==="hub"){ for(let i=0;i<44;i++){ const a = i/44*Math.PI*2; pts.push([p.x + Math.cos(a)*p.r, (p.y + Math.sin(a)*p.r)*A]); } }
  else if(p.kind==="ring"){
    const n = 14;
    for(let i=0;i<=n;i++){ const a = p.a0 + (p.a1 - p.a0)*i/n; pts.push([Math.cos(a)*p.r1, Math.sin(a)*p.r1*A]); }
    for(let i=n;i>=0;i--){ const a = p.a0 + (p.a1 - p.a0)*i/n; pts.push([Math.cos(a)*p.r0, Math.sin(a)*p.r0*A]); }
  } else {
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    for(const [lx, ly] of [[-p.hw,-p.hh],[p.hw,-p.hh],[p.hw,p.hh],[-p.hw,p.hh]]) pts.push([p.x + lx*c - ly*s, (p.y + lx*s + ly*c)*A]);
  }
  let area = 0; for(let i=0;i<pts.length;i++){ const a = pts[i], b = pts[(i+1)%pts.length]; area += a[0]*b[1] - b[0]*a[1]; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for(const q of pts){ x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const D = AB_DEPTH[p.kind];
  return {pts, cw:area > 0, x0, y0, x1, y1, D, cx:(x0 + x1)/2, cy:(y0 + y1)/2};
});
// orden de las tapas: anillo -> puentes -> plazas (las plazas tapan las puntas de los puentes)
const AB_TOP_ORDER = AB_PLATS.map((p, i)=>i).sort((a, b)=>{
  const w = k=>({ring:0, spoke:1, seg:2, hub:3})[AB_PLATS[k].kind];
  return (w(a) - w(b)) || (AB_POLY[a].cy - AB_POLY[b].cy);
});
function _abHash(i, k){ let h = (i*374761393 + k*668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0)/4294967296; }
function _abPath(g, pts, dx, dy){ g.beginPath(); for(let i=0;i<pts.length;i++){ const q = pts[i]; if(i) g.lineTo(q[0] + (dx||0), q[1] + (dy||0)); else g.moveTo(q[0] + (dx||0), q[1] + (dy||0)); } g.closePath(); }
function _abVisibleEdges(P){ // bordes cuya cara mira a la cámara (hacia abajo en pantalla)
  const out = [];
  for(let i=0;i<P.pts.length;i++){
    const a = P.pts[i], b = P.pts[(i+1)%P.pts.length], dx = b[0] - a[0], dy = b[1] - a[1];
    const ny = P.cw ? -dx : dx, L = Math.hypot(dx, dy) || 1;
    if(ny/L > 0.08) out.push([a, b, i]);
  }
  return out;
}

/* ---------------- caché de plataformas (media resolución) ---------------- */
const AB_RS = 0.5;
const _abCache = [];   // [{face, top, crack1, crack2}]
function _abCanvas(P, extraBottom){
  const c = document.createElement("canvas");
  c.width = Math.ceil((P.x1 - P.x0 + 8)*AB_RS); c.height = Math.ceil((P.y1 - P.y0 + P.D + 60 + (extraBottom||0))*AB_RS);
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.setTransform(AB_RS, 0, 0, AB_RS, (-P.x0 + 4)*AB_RS, (-P.y0 + 4)*AB_RS);
  return {c, g};
}
function _abBuildFace(i){
  const P = AB_POLY[i], p = AB_PLATS[i], {c, g} = _abCanvas(P), D = P.D;
  const edges = _abVisibleEdges(P);
  const grad = g.createLinearGradient(0, P.y0, 0, P.y1 + D);
  grad.addColorStop(0, "#3a3244"); grad.addColorStop(0.55, "#1d1624"); grad.addColorStop(1, "#08050c");
  g.fillStyle = grad; g.beginPath();
  for(const [a, b] of edges){ g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b[0], b[1] + D); g.lineTo(a[0], a[1] + D); g.closePath(); }
  g.fill();
  // estratos de roca
  g.strokeStyle = "rgba(10,6,14,0.7)"; g.lineWidth = 2;
  for(const k of [0.32, 0.64]){ g.beginPath(); for(const [a, b] of edges){ g.moveTo(a[0], a[1] + D*k); g.lineTo(b[0], b[1] + D*k); } g.stroke(); }
  // grietas verticales y vetas del vacío en la cara
  for(const [a, b, e] of edges){
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for(let s=0; s<L; s+=26){
      const r = _abHash(i*97 + e, s|0), t = s/L, x = a[0] + (b[0] - a[0])*t, y = a[1] + (b[1] - a[1])*t;
      if(r < 0.35){ g.strokeStyle = "rgba(8,4,12,0.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + (r - 0.17)*20, y + D*0.7); g.stroke(); }
      else if(r > 0.93){ g.strokeStyle = "rgba(170,80,255,0.55)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + D*0.2); g.lineTo(x + 3, y + D*0.55); g.lineTo(x - 2, y + D*0.9); g.stroke(); }
      // estalactitas colgando
      const len = 10 + _abHash(i*131 + e, s|0)*(p.kind==="ring" ? 46 : 30), w = 7 + _abHash(e, i + s)*8;
      g.fillStyle = r < 0.5 ? "#140e1a" : "#1d1624";
      g.beginPath(); g.moveTo(x - w/2, y + D - 2); g.lineTo(x + w/2, y + D - 2); g.lineTo(x + (r - 0.5)*6, y + D + len); g.closePath(); g.fill();
    }
  }
  // labio iluminado donde la tapa se encuentra con la cara
  g.strokeStyle = "#a498b4"; g.lineWidth = 2; g.beginPath();
  for(const [a, b] of edges){ g.moveTo(a[0], a[1] + 1); g.lineTo(b[0], b[1] + 1); }
  g.stroke();
  return c;
}
function _abBuildTop(i){
  const P = AB_POLY[i], p = AB_PLATS[i], {c, g} = _abCanvas(P);
  _abPath(g, P.pts);
  if(AB_OK.tex_piso){ const pat = g.createPattern(AB_IMG.tex_piso, "repeat"); g.fillStyle = pat; } else g.fillStyle = "#4a4454";
  g.fill();
  g.save(); _abPath(g, P.pts); g.clip();
  // tinte por tipo: los puentes más cálidos, el anillo (junto al pozo) más violeta
  const tint = {ring:"rgba(90,40,140,0.22)", spoke:"rgba(120,90,60,0.12)", seg:"rgba(120,90,60,0.12)", hub:"rgba(40,30,60,0.12)"}[p.kind];
  g.fillStyle = tint; g.fillRect(P.x0 - 4, P.y0 - 4, P.x1 - P.x0 + 8, P.y1 - P.y0 + 8);
  // sombra interior del borde (lectura de la silueta)
  g.strokeStyle = "rgba(6,2,12,0.55)"; g.lineWidth = 16; _abPath(g, P.pts); g.stroke();
  g.strokeStyle = "rgba(6,2,12,0.35)"; g.lineWidth = 34; _abPath(g, P.pts); g.stroke();
  // vetas del vacío (el anillo está más corrompido)
  const nv = p.kind==="ring" ? 3 : (p.kind==="hub" ? 1 : 0);
  g.lineCap = "round";
  for(let v=0; v<nv; v++){
    let x = P.x0 + (P.x1 - P.x0)*_abHash(i, v*3 + 1), y = P.y0 + (P.y1 - P.y0)*_abHash(i, v*3 + 2);
    g.strokeStyle = "rgba(170,70,255,0.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y);
    for(let s=0;s<6;s++){ x += (_abHash(i*7 + v, s) - 0.5)*40; y += (_abHash(i*11 + v, s) - 0.5)*26; g.lineTo(x, y); }
    g.stroke(); g.strokeStyle = "rgba(230,170,255,0.35)"; g.lineWidth = 1; g.stroke();
  }
  g.restore();
  // borde superior: claro al frente, oscuro atrás
  const edges = _abVisibleEdges(P);
  g.strokeStyle = "rgba(20,12,28,0.9)"; g.lineWidth = 2; _abPath(g, P.pts); g.stroke();
  g.strokeStyle = "rgba(200,190,215,0.45)"; g.lineWidth = 2; g.beginPath();
  for(const [a, b] of edges){ g.moveTo(a[0], a[1] - 1); g.lineTo(b[0], b[1] - 1); }
  g.stroke();
  // sello de la entrada: la única plaza que nunca cae
  if(p.anchor){
    const cx = p.x, cy = p.y*AB_ASP;
    g.strokeStyle = "rgba(110,210,255,0.55)"; g.lineWidth = 3;
    g.beginPath(); g.ellipse(cx, cy, p.r*0.62, p.r*0.62*AB_ASP, 0, 0, Math.PI*2); g.stroke();
    g.beginPath(); g.ellipse(cx, cy, p.r*0.48, p.r*0.48*AB_ASP, 0, 0, Math.PI*2); g.stroke();
    for(let k=0;k<8;k++){ const a = k/8*Math.PI*2; g.beginPath(); g.moveTo(cx + Math.cos(a)*p.r*0.48, cy + Math.sin(a)*p.r*0.48*AB_ASP); g.lineTo(cx + Math.cos(a)*p.r*0.62, cy + Math.sin(a)*p.r*0.62*AB_ASP); g.stroke(); }
  }
  return c;
}
function _abBuildCracks(i, st){
  const P = AB_POLY[i], p = AB_PLATS[i], {c, g} = _abCanvas(P);
  g.save(); _abPath(g, P.pts); g.clip();
  const n = st===AB_ST.CRITICAL ? 9 : 4, span = Math.max(P.x1 - P.x0, (P.y1 - P.y0)/AB_ASP);
  g.lineCap = "round"; g.lineJoin = "round";
  for(let k=0;k<n;k++){
    let x = 0, y = 0, tries = 0;
    do { x = P.x0 + (P.x1 - P.x0)*_abHash(i*31 + st, k*5 + tries); y = P.y0 + (P.y1 - P.y0)*_abHash(i*37 + st, k*5 + tries + 1); tries++; } while(!abPlatContains(p, x, y, 10) && tries < 12);
    const pts = [[x, y]], segs = 4 + ((_abHash(i, k + 90)*5)|0);
    let a = _abHash(i + 3, k)*Math.PI*2;
    for(let s=0;s<segs;s++){ a += (_abHash(i*5 + k, s) - 0.5)*1.4; const L = span*(0.05 + _abHash(i*3 + k, s + 20)*0.07); x += Math.cos(a)*L; y += Math.sin(a)*L*AB_ASP; pts.push([x, y]); }
    g.strokeStyle = "rgba(8,4,12,0.95)"; g.lineWidth = st===AB_ST.CRITICAL ? 5 : 3.5; g.beginPath(); pts.forEach((q, j)=>j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
    if(st===AB_ST.CRITICAL){ g.strokeStyle = "rgba(210,100,255,0.9)"; g.lineWidth = 1.6; g.stroke(); }
    else { g.strokeStyle = "rgba(170,150,190,0.35)"; g.lineWidth = 1; g.beginPath(); pts.forEach((q, j)=>j ? g.lineTo(q[0] + 1.5, q[1] + 1.5) : g.moveTo(q[0] + 1.5, q[1] + 1.5)); g.stroke(); }
  }
  // crítica: pedazos del borde que ya faltan (manchas del vacío asomando)
  if(st===AB_ST.CRITICAL){
    const edges = P.pts;
    for(let k=0;k<6;k++){
      const q = edges[(_abHash(i, k + 300)*edges.length)|0], r = 10 + _abHash(i, k + 310)*14;
      g.fillStyle = "rgba(10,4,16,0.9)"; g.beginPath(); g.ellipse(q[0], q[1], r, r*0.6, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = "rgba(160,60,240,0.25)"; g.beginPath(); g.ellipse(q[0], q[1], r*0.6, r*0.35, 0, 0, Math.PI*2); g.fill();
    }
  }
  g.restore();
  return c;
}
function _abPlatCache(i){
  let C = _abCache[i];
  if(!C){ C = _abCache[i] = {}; }
  if(!C.top && AB_OK.tex_piso){ C.face = _abBuildFace(i); C.top = _abBuildTop(i); }
  return C;
}
function _abBlit(canvas, i, dx, dy, alpha, scale){
  if(!canvas) return;
  const P = AB_POLY[i], w = canvas.width/AB_RS, h = canvas.height/AB_RS;
  let x = P.x0 - 4 + (dx||0), y = P.y0 - 4 + (dy||0);
  if(alpha!==undefined && alpha < 1){ if(alpha <= 0.01) return; ctx.globalAlpha = alpha; }
  if(scale && scale!==1){ const cx = P.cx + (dx||0), cy = P.cy + (dy||0); ctx.drawImage(canvas, cx + (x - cx)*scale, cy + (y - cy)*scale, w*scale, h*scale); }
  else ctx.drawImage(canvas, x, y, w, h);
  ctx.globalAlpha = 1;
}

/* ---------------- estado decorativo local ---------------- */
const _abPrevSt = [], _abStAt = [];
const AB_MOTES = [], AB_FALLERS = [], AB_ROCKS = [];
let _abRenderLv = 0;
// ruinas lejanas flotando en el vacío (paralaje)
const AB_FAR = [];
for(let k=0;k<22;k++){
  const a = _abHash(k, 1)*Math.PI*2, r = 1100 + _abHash(k, 2)*900;
  AB_FAR.push({x:Math.cos(a)*r, y:Math.sin(a)*r*0.7, s:30 + _abHash(k, 3)*70, f:0.35 + _abHash(k, 4)*0.35, pil:_abHash(k, 5) < 0.45, ph:_abHash(k, 6)*6});
}
function abRenderReset(){
  _abPrevSt.length = 0; _abStAt.length = 0; AB_MOTES.length = 0; AB_FALLERS.length = 0; AB_ROCKS.length = 0; _abRenderLv = 0;
}
function abFallerAdd(e){ if(AB_FALLERS.length > 24) AB_FALLERS.shift(); AB_FALLERS.push({type:e.type, x:e.x, y:e.y, r:e.radius||20, t0:animNow, flip:(e.fx||0) < -0.12}); }
function abRenderTick(dt){
  if(!abS || !player) return;
  for(let i=0;i<AB_PLATS.length;i++){
    const st = abS.p[i].st;
    if(_abPrevSt[i]!==st){
      if(_abPrevSt[i]!==undefined && st===AB_ST.GONE){
        // pedazos que caen al vacío
        const P = AB_POLY[i];
        for(let k=0;k<7 && AB_ROCKS.length < 60;k++) AB_ROCKS.push({x:P.x0 + Math.random()*(P.x1 - P.x0), y:P.y0 + Math.random()*(P.y1 - P.y0), vx:(Math.random()-0.5)*40, vy:-40 - Math.random()*60, s:8 + Math.random()*16, t:0, rot:Math.random()*6});
      }
      _abPrevSt[i] = st; _abStAt[i] = animNow;
    }
  }
  // polvo del vacío que sube desde abajo
  if(AB_MOTES.length < 55 && Math.random() < dt/45){
    const x = player.x + (Math.random()-0.5)*1500, y = player.y + (Math.random()-0.5)*1000;
    if(!abWalkable(x, y, -30)) AB_MOTES.push({x, y, vy:-10 - Math.random()*22, t:0, d:3000 + Math.random()*4000, s:1 + Math.random()*2.2, c:Math.random() < 0.2 ? 1 : 0});
  }
  let w = 0;
  for(let i=0;i<AB_MOTES.length;i++){ const m = AB_MOTES[i]; m.t += dt; m.y += m.vy*dt/1000; m.x += Math.sin((m.t + i*400)/900)*6*dt/1000; if(m.t < m.d) AB_MOTES[w++] = m; }
  AB_MOTES.length = w;
  w = 0;
  for(let i=0;i<AB_ROCKS.length;i++){ const r = AB_ROCKS[i]; r.t += dt; r.vy += 900*dt/1000; r.x += r.vx*dt/1000; r.y += r.vy*dt/1000; r.rot += dt/300; if(r.t < 1500) AB_ROCKS[w++] = r; }
  AB_ROCKS.length = w;
  w = 0;
  for(let i=0;i<AB_FALLERS.length;i++){ if(animNow - AB_FALLERS[i].t0 < 1100) AB_FALLERS[w++] = AB_FALLERS[i]; }
  AB_FALLERS.length = w;
}

/* ---------------- utilidades de dibujo ---------------- */
function _abView(){ const hw = VW/2/CAM_ZOOM, hh = VH/2/CAM_ZOOM, cy = camCenterY(); return {x0:player.x - hw - 60, x1:player.x + hw + 60, y0:cy - hh - 60, y1:cy + hh + 80}; }
function _abGlow(x, y, r, rgb, a){ if(a <= 0.01) return; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(rgb), x - r, y - r, r*2, r*2); ctx.restore(); }
function _abSpr(key, x, y, h, flip, alpha, anchorY, rot){
  const img = AB_IMG[key]; if(!img || !AB_OK[key]) return false;
  const w = h*img.width/img.height, ay = anchorY===undefined ? 0.95 : anchorY;
  ctx.save(); if(alpha!==undefined) ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y); if(rot) ctx.rotate(rot); if(flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w/2, -h*ay, w, h);
  ctx.restore();
  return true;
}
// Copia con máscara elíptica (la mandíbula viene recortada como rectángulo: se funde en el vacío).
const _abMaskCache = {};
function _abMasked(key){
  if(_abMaskCache[key]) return _abMaskCache[key];
  const img = AB_IMG[key]; if(!img || !AB_OK[key]) return null;
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "destination-in";
  const W = c.width, Hh = c.height;
  g.translate(W/2, Hh/2); g.scale(1, Hh/W);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, W/2);
  gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.62, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(-W/2, -W/2, W, W);
  _abMaskCache[key] = c;
  return c;
}
function _abFx(key, i, x, y, h, alpha, anchorY, rot){ // frame i de un efecto de la hoja (ABISMO_FX)
  const F = typeof ABISMO_FX!=="undefined" && ABISMO_FX[key]; if(!F) return false;
  const src = F.srcs[i % F.srcs.length], k = "fx_"+src;
  if(!AB_IMG[k]) _abImg(k, src);
  return _abSpr(k, x, y, h, false, alpha, anchorY===undefined ? 0.5 : anchorY, rot);
}
function _abAtlasFrame(type, set, idx, x, y, h, flip, alpha, scaleY){
  const P = ENEMY_ATLAS_PACK[(typeof bodySwapKey==="function" && bodySwapKey(type)) || type]; if(!P || !P.ready) return; // cuerpo prestado (body-swaps.js)
  const arr = P.sets[set] || P.sets.idle, v = arr[Math.min(arr.length - 1, Math.max(0, idx))];
  const s = h/P.refH;
  drawAnimFrameSized(P.atlas, {frames:[{x:(v % P.cols)*P.fw, y:Math.floor(v/P.cols)*P.fh, w:P.fw, h:P.fh}]}, 0, x, y, P.fw*s, P.fh*s*(scaleY||1), 0.5, P.anchor, flip, alpha);
}
function _abChain(x0, y0, x1, y1, sag, t, rgb, alpha){
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, Math.floor(L/13));
  ctx.save(); ctx.globalAlpha *= alpha===undefined ? 1 : alpha;
  for(let k=0;k<=n;k++){
    const q = k/n, x = x0 + (x1 - x0)*q, y = y0 + (y1 - y0)*q + Math.sin(q*Math.PI)*sag;
    const ang = Math.atan2(y1 - y0 + Math.cos(q*Math.PI)*sag*2.5/n, x1 - x0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + (k%2 ? Math.PI/2 : 0));
    ctx.strokeStyle = "#140e18"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = k%2 ? "#5a5064" : "#8a7f98"; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
  }
  if(rgb){ ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(${rgb},${0.25 + 0.15*Math.sin(t*6)})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1)/2, (y0 + y1)/2 + sag*2, x1, y1); ctx.stroke(); }
  ctx.restore();
}

/* ---------------- fondo: el vacío ---------------- */
function _abDrawVoid(V, t){
  ctx.save();
  ctx.fillStyle = "#040208"; ctx.fillRect(V.x0 - 60, V.y0 - 60, V.x1 - V.x0 + 120, V.y1 - V.y0 + 120);
  // el resplandor de lo que vive debajo: sube desde el pozo (más fuerte cuanto más avanza la campaña)
  const lv = runLevel || 1, M = abS.mo, fight = M.st==="fight" || M.st==="stir";
  const base = 0.16 + lv*0.018 + (fight ? 0.14 : 0);
  _abGlow(0, 40, 1300, fight && M.ph===3 ? "150,30,110" : "90,30,150", base*(0.85 + 0.15*Math.sin(t*0.7)));
  _abGlow(0, 20, 520, "140,50,220", base*0.9);
  // ruinas lejanas flotando (paralaje: se mueven más lento que el piso)
  for(const r of AB_FAR){
    const x = r.x + player.x*(1 - r.f), y = r.y + player.y*(1 - r.f) + Math.sin(t*0.4 + r.ph)*6;
    if(x < V.x0 - 120 || x > V.x1 + 120 || y < V.y0 - 160 || y > V.y1 + 120) continue;
    const s = r.s*r.f*1.6;
    ctx.fillStyle = `rgba(22,14,30,${0.55 + r.f*0.5})`;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s*0.5, y + s*0.8); ctx.lineTo(x, y + s*1.4); ctx.lineTo(x - s*0.6, y + s*0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(60,46,76,${0.35 + r.f*0.4})`; ctx.fillRect(x - s, y - 3, s*2, 3);
    if(r.pil){ ctx.fillStyle = `rgba(30,22,40,${0.6 + r.f*0.4})`; ctx.fillRect(x - s*0.25, y - s*1.3, s*0.28, s*1.3); ctx.fillRect(x + s*0.35, y - s*0.8, s*0.22, s*0.8); }
  }
  // polvo del vacío
  ctx.globalCompositeOperation = "lighter";
  for(const m of AB_MOTES){
    const a = Math.min(1, m.t/500)*Math.min(1, (m.d - m.t)/700);
    ctx.fillStyle = m.c ? `rgba(230,160,255,${0.7*a})` : `rgba(150,90,220,${0.5*a})`;
    ctx.fillRect(m.x, m.y, m.s, m.s);
  }
  ctx.restore();
  _abDrawPresence(t);
}
// Presencia de lo que vive debajo (bajo las plataformas: está en el vacío).
function _abDrawPresence(t){
  const H = abS.hint, M = abS.mo;
  if(H.k){
    const q = H.a/(H.d||2600), fin = Math.min(1, q*4)*Math.min(1, (1 - q)*4);
    if(H.k==="shadow"){
      const x = H.x - 500 + q*1000, y = H.y + 40;
      ctx.save(); ctx.globalAlpha = 0.75*fin; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x, y, 420, 150, 0.1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - 380, y + 30, 160, 60, 0.3, 0, Math.PI*2); ctx.fill(); ctx.restore();
      _abGlow(x + 180, y - 20, 60, "200,70,255", 0.35*fin);
    } else if(H.k==="eye"){
      const open = q < 0.25 ? "abre" : (q > 0.8 ? "blink" : "idle"), f = open==="idle" ? Math.floor(t*5) % 5 : Math.min(4, Math.floor(((q < 0.25 ? q/0.25 : (q - 0.8)/0.2))*5));
      _abGlow(H.x, H.y, 260, "220,60,120", 0.45*fin);
      _abSpr("eye_"+open+"_"+f, H.x, H.y + 60, 190, false, 0.9*fin, 0.5);
    } else if(H.k==="tent"){
      const rise = Math.sin(Math.min(1, q)*Math.PI);
      _abSpr("tent_segmento_5", H.x, H.y + 60, 300*rise, H.x > player.x, 0.9*fin, 0.95, Math.sin(t*2)*0.15);
    }
  }
  // nivel 10: el ojo en el fondo del pozo mientras se despierta; en la pelea, el cuerpo bajo la arena
  if(runLevel===LEVEL_COUNT && (M.st==="stir" || M.st==="fight" || M.st==="dying")){
    const k = M.st==="stir" ? Math.min(1, M.t/7000) : 1;
    if(M.eye || M.st!=="stir"){ _abGlow(0, 30, 330, "220,50,130", 0.5*k); _abSpr("eye_idle_"+(Math.floor(t*4) % 5), 0, 90, 230*k, false, 0.75*k, 0.5); }
    if(M.st!=="stir"){
      const ph = M.ph, n = ph===1 ? 3 : (ph===2 ? 6 : 9);
      for(let j=0;j<n;j++){
        const a = j/n*Math.PI*2 + t*0.05, R = 1180 + (j%3)*120, x = Math.cos(a)*R, y = Math.sin(a)*R*0.62;
        _abSpr("tent_grande_0", x, y + 160, 420 + (j%2)*140, x < 0, 0.45 + (ph - 1)*0.15, 0.95, Math.sin(t*0.9 + j)*0.12 + (x < 0 ? -0.2 : 0.2));
      }
      if(ph===3){ _abGlow(0, 180, 700, "255,60,150", 0.25 + 0.1*Math.sin(t*2)); _abSpr("ojo_grande_0", 0, 520, 700, false, 0.35, 0.5); }
    }
  }
  // la mandíbula bajo el pozo (fase 3)
  if(runLevel===LEVEL_COUNT && M.st==="fight" && M.ph===3){
    const jaw = abS.zones.some(z=>z.k==="jaw") ? "ataque" : ((M.jawOpen && M.jawOpen > runElapsedMs) ? "prep" : "cerrada");
    _abGlow(0, 30, 420, "255,70,150", jaw==="ataque" ? 0.7 : 0.35);
    const jm = _abMasked("jaw_"+jaw);
    if(jm){ const h = jaw==="ataque" ? 330 : 280, w = h*jm.width/jm.height; ctx.save(); ctx.globalAlpha = 0.95; ctx.imageSmoothingEnabled = false; ctx.drawImage(jm, -w/2, 40 - h/2, w, h); ctx.restore(); }
  }
}

/* ---------------- mundo (bajo las entidades) ---------------- */
function abDrawWorld(now){
  if(!abS || !player) return;
  const t = now, V = _abView();
  _abDrawVoid(V, t);
  ctx.imageSmoothingEnabled = false;
  const vis = i=>{ const P = AB_POLY[i]; return !(P.x1 < V.x0 || P.x0 > V.x1 || P.y1 + P.D + 60 < V.y0 || P.y0 > V.y1); };
  const offs = [];
  // 1) caras laterales
  for(let i=0;i<AB_PLATS.length;i++){
    offs[i] = null;
    if(!vis(i)) continue;
    const S = abS.p[i], C = _abPlatCache(i), since = animNow - (_abStAt[i]||0);
    let dx = 0, dy = 0, a = 1, sc = 1;
    if(S.st===AB_ST.GONE){ if(since > 1300) continue; const q = since/1300; dy = q*q*520; a = 1 - q; sc = 1 - q*0.25; }
    else if(S.st===AB_ST.REBUILD){ const q = Math.min(1, since/AB_CFG.plat.rebuildMs); dy = (1 - q)*(1 - q)*360; a = q; }
    else if(S.st===AB_ST.FALLING){ const q = Math.min(1, since/(S.warn || AB_CFG.plat.fallWarn)); dx = Math.sin(animNow*0.09 + i)*(1 + q*4); dy = Math.cos(animNow*0.11 + i)*(0.6 + q*2) + q*q*6; }
    else if(S.st===AB_ST.CRITICAL){ dx = Math.sin(animNow*0.05 + i*2)*0.9; }
    offs[i] = {dx, dy, a, sc};
    if(C.face) _abBlit(C.face, i, dx, dy, a, sc);
    else { ctx.fillStyle = "#1d1624"; _abPath(ctx, AB_POLY[i].pts, dx, dy + AB_POLY[i].D*0.5); ctx.fill(); }
  }
  // enemigos que caen (entre las caras y las tapas: si caen por detrás, la tapa los tapa)
  for(const f of AB_FALLERS){
    const q = Math.min(1, (animNow - f.t0)/1100), h = f.r*3*(1 - q*0.55);
    _abAtlasFrame(f.type, "hit", 0, f.x, f.y + q*q*420, h, f.flip, 1 - q);
  }
  for(const r of AB_ROCKS){
    const a = 1 - r.t/1500; ctx.save(); ctx.globalAlpha = a; ctx.translate(r.x, r.y); ctx.rotate(r.rot);
    ctx.fillStyle = "#2a2232"; ctx.fillRect(-r.s/2, -r.s/2, r.s, r.s*0.7); ctx.fillStyle = "#6a607a"; ctx.fillRect(-r.s/2, -r.s/2, r.s, 2); ctx.restore();
  }
  // 2) tapas
  for(const i of AB_TOP_ORDER){
    const o = offs[i]; if(!o) continue;
    const S = abS.p[i], C = _abPlatCache(i);
    if(C.top) _abBlit(C.top, i, o.dx, o.dy, o.a, o.sc);
    else { ctx.fillStyle = "#4a4454"; ctx.globalAlpha = o.a; _abPath(ctx, AB_POLY[i].pts, o.dx, o.dy); ctx.fill(); ctx.globalAlpha = 1; }
    const st = S.st===AB_ST.FALLING || (S.st===AB_ST.GONE) ? AB_ST.CRITICAL : S.st;
    if(st===AB_ST.CRACKED || st===AB_ST.CRITICAL){
      const key = st===AB_ST.CRACKED ? "c1" : "c2";
      if(!C[key]) C[key] = _abBuildCracks(i, st);
      _abBlit(C[key], i, o.dx, o.dy, o.a, o.sc);
    }
    if(S.st===AB_ST.CRITICAL){
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(200,90,255,${0.18 + 0.14*Math.sin(t*5 + i)})`; ctx.lineWidth = 3; _abPath(ctx, AB_POLY[i].pts, o.dx, o.dy); ctx.stroke(); ctx.restore();
    } else if(S.st===AB_ST.FALLING){
      // AVISO DE DERRUMBE: el borde late en rojo cada vez más rápido
      const q = Math.min(1, (animNow - (_abStAt[i]||0))/(abS.p[i].warn || AB_CFG.plat.fallWarn)), puls = 0.5 + 0.5*Math.sin(t*(8 + q*22));
      ctx.save();
      ctx.fillStyle = `rgba(255,40,80,${0.12 + 0.18*puls*q})`; _abPath(ctx, AB_POLY[i].pts, o.dx, o.dy); ctx.fill();
      ctx.strokeStyle = `rgba(255,70,110,${0.55 + 0.45*puls})`; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t*60; _abPath(ctx, AB_POLY[i].pts, o.dx, o.dy); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    } else if(S.st===AB_ST.REBUILD){
      const q = Math.min(1, (animNow - (_abStAt[i]||0))/AB_CFG.plat.rebuildMs);
      ctx.save(); ctx.strokeStyle = `rgba(150,220,255,${0.5*(1 - q) + 0.2})`; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = t*40; _abPath(ctx, AB_POLY[i].pts); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      const c = abPlatCenter(AB_PLATS[i]); _abGlow(c.x, c.y, 150, "150,120,255", 0.35*(1 - q) + 0.1);
    }
  }
  // contornos de las plataformas que se van a reconstruir (dónde va a volver el piso)
  for(let i=0;i<AB_PLATS.length;i++){
    if(abS.p[i].st!==AB_ST.GONE || !vis(i) || animNow - (_abStAt[i]||0) < 1300) continue;
    ctx.save(); ctx.strokeStyle = "rgba(140,90,220,0.16)"; ctx.lineWidth = 2; ctx.setLineDash([6, 12]); _abPath(ctx, AB_POLY[i].pts); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  _abDrawGroundMarks(t);
}
// Marcas en el piso: zonas gravitatorias, filamentos, trayectorias de carga, cadenas, onda.
function _abDrawGroundMarks(t){
  // zonas
  for(const z of abS.zones){
    if(!inView(z.x, z.y, z.r + 80)) continue;
    const q = Math.min(1, z.t/250)*Math.min(1, (z.d - z.t)/400), R = z.r*1.35;
    ctx.save();
    const rgb = z.k==="jaw" ? "255,70,150" : (z.k==="pull" ? "210,80,255" : "170,90,255");
    ctx.fillStyle = `rgba(${rgb},${0.1*q})`; ctx.beginPath(); ctx.ellipse(z.x, z.y, R, R*AB_ASP, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},${0.6*q})`; ctx.lineWidth = 2;
    for(let k=0;k<3;k++){ const rr = R*(1 - ((t*0.6 + k/3) % 1)); ctx.beginPath(); ctx.ellipse(z.x, z.y, rr, rr*AB_ASP, 0, 0, Math.PI*2); ctx.stroke(); }
    ctx.restore();
    if(z.k==="grav") _abFx("abHeraldoZone", Math.floor(t*8), z.x, z.y, z.r*1.6, 0.85*q);
    else if(z.k==="pull") _abFx("abMorPull", Math.floor(t*8), z.x, z.y, z.r*1.5, 0.8*q);
    else if(z.k==="jaw") _abFx("abMorSuck", Math.floor(t*8), z.x, z.y, z.r*1.4, 0.7*q);
  }
  // trayectorias del Jinete: flechas que corren en la dirección de la carga
  for(const c of abS.charges){
    const q = Math.min(1, c.t/(c.d||1)), L = Math.hypot(c.x1 - c.x0, c.y1 - c.y0) || 1, ux = (c.x1 - c.x0)/L, uy = (c.y1 - c.y0)/L;
    ctx.save(); ctx.strokeStyle = `rgba(255,${Math.round(120 - q*80)},${Math.round(200 - q*120)},${0.5 + 0.4*q})`; ctx.lineWidth = 4; ctx.lineJoin = "round";
    for(let s=((t*260) % 60); s<L; s+=60){
      const x = c.x0 + ux*s, y = c.y0 + uy*s;
      ctx.beginPath(); ctx.moveTo(x - ux*14 - uy*16, y - uy*14 + ux*16); ctx.lineTo(x, y); ctx.lineTo(x - ux*14 + uy*16, y - uy*14 - ux*16); ctx.stroke();
    }
    ctx.restore();
  }
  // filamentos del Tejedor
  for(const l of abS.lines){
    const q = Math.min(1, l.t/350)*Math.min(1, (l.d - l.t)/500);
    if(q <= 0) continue;
    ctx.save(); ctx.lineCap = "round";
    const mx = (l.x0 + l.x1)/2, my = (l.y0 + l.y1)/2 - 22 + Math.sin(t*3 + l.x0)*4;
    ctx.strokeStyle = `rgba(40,10,60,${0.8*q})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(l.x0, l.y0 - 14); ctx.quadraticCurveTo(mx, my, l.x1, l.y1 - 14); ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(220,120,255,${(0.6 + 0.3*Math.sin(t*9))*q})`; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    for(const [x, y] of [[l.x0, l.y0], [l.x1, l.y1]]){ ctx.fillStyle = `rgba(30,8,44,${q})`; ctx.beginPath(); ctx.ellipse(x, y, 9, 5, 0, 0, Math.PI*2); ctx.fill(); _abGlow(x, y - 10, 18, "210,110,255", 0.5*q); }
    ctx.restore();
  }
  // cadenas del Carcelero ancladas a las ruinas
  for(const c of abS.chains){
    if(c.hook) continue;
    if(c.broken){ const dx = c.x0 - c.x1, dy = c.y0 - c.y1; _abChain(c.x1, c.y1, c.x1 + dx*0.18, c.y1 + dy*0.18 + 30, 20, t, null, 0.9); continue; }
    _abChain(c.x0, c.y0, c.x1, c.y1, 40, t, "200,70,140", 1);
  }
  // onda del abismo
  if(abS.wave){
    const W = abS.wave, r = (W.t/W.d)*900, a = 1 - W.t/W.d;
    ctx.save(); ctx.strokeStyle = `rgba(220,100,255,${0.8*a})`; ctx.lineWidth = 14; ctx.beginPath(); ctx.ellipse(0, 0, r, r*AB_ASP, 0, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,220,255,${0.7*a})`; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  }
}

/* ---------------- piezas altas (portales, altar, pilares de anclaje) ---------------- */
const AB_DECOR = [];
(function(){
  for(const p of AB_PLATS){
    if(p.kind!=="hub") continue;
    const back = {x:p.x, y:(p.y - p.r*0.52)*AB_ASP};
    if(p.portal) AB_DECOR.push({k:"portal", x:back.x, y:back.y, i:p.i, h:150});
    if(p.anchor) AB_DECOR.push({k:"altar", x:back.x, y:back.y + 10, i:p.i, h:120});
    if(AB_ANCHORS.includes(p.id)){ const a = Math.atan2(p.y, p.x); AB_DECOR.push({k:"anchor", x:p.x - Math.cos(a)*p.r*0.35, y:(p.y - Math.sin(a)*p.r*0.35)*AB_ASP, i:p.i, h:150, n:AB_ANCHORS.indexOf(p.id)}); }
  }
  // pilares rotos sobre el anillo (ruinas del templo que se hundió)
  for(let k=0;k<8;k+=2){ const a = k*Math.PI/4 + 0.22, r = AB_R.ringOut - 40; AB_DECOR.push({k:"pillar", x:Math.cos(a)*r, y:Math.sin(a)*r*AB_ASP, i:AB_PLATS.findIndex(p=>p.id==="r"+k), h:110 + (k%4)*10}); }
})();
function abPushTall(){
  if(!abS) return;
  for(let n=0;n<AB_DECOR.length;n++){
    const d = AB_DECOR[n], st = abS.p[d.i].st;
    if(st===AB_ST.GONE && animNow - (_abStAt[d.i]||0) > 1300) continue;
    if(st===AB_ST.REBUILD) continue;
    if(inView(d.x, d.y - d.h*0.5, d.h)) _entPush(d.y, null, null, null, {arena:1, abDecor:n + 1});
  }
}
function abDrawTall(it, now){
  if(!it.abDecor) return;
  const d = AB_DECOR[it.abDecor - 1], S = abS.p[d.i], since = animNow - (_abStAt[d.i]||0);
  let dy = 0, a = 1, dx = 0;
  if(S.st===AB_ST.GONE){ const q = Math.min(1, since/1300); dy = q*q*520; a = 1 - q; }
  else if(S.st===AB_ST.FALLING){ dx = Math.sin(animNow*0.09 + d.i)*3; }
  const t = now;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(d.x + dx, d.y + dy + 2, d.h*0.32, d.h*0.1, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  if(d.k==="portal"){
    const on = !(runLevel===LEVEL_COUNT) && state==="playing";
    _abSpr(on ? "portal_activo_0" : "portal_cerrado_0", d.x + dx, d.y + dy + 8, d.h, false, a);
    if(on) _abGlow(d.x + dx, d.y + dy - d.h*0.45, 70, "190,80,255", (0.35 + 0.15*Math.sin(t*3 + d.i))*a);
  } else if(d.k==="altar"){
    _abSpr("altar_0", d.x, d.y + 8, d.h, false, a);
    _abGlow(d.x, d.y - d.h*0.55, 70, "110,200,255", (0.4 + 0.12*Math.sin(t*2))*a);
  } else if(d.k==="anchor"){
    _abSpr("pilares_0", d.x + dx, d.y + dy + 6, d.h, false, a);
    const live = abS.ca.st==="fight" && !((abS.ca.broken||0) & (1<<d.n));
    if(live) _abGlow(d.x, d.y - d.h*0.6, 40, "230,80,140", 0.5 + 0.2*Math.sin(t*6));
  } else if(d.k==="pillar"){
    _abSpr(d.i % 2 ? "pilares_1" : "pilares_0", d.x + dx, d.y + dy + 6, d.h, d.i % 3===0, a);
  }
}

/* ---------------- cuerpos propios ---------------- */
function abDrawEnemyBody(e){
  const t = animNow/1000;
  if(e.abFall && !e.alive) return true;               // cayó al vacío: se dibuja en AB_FALLERS
  if(e.type==="ab_morador") return _abDrawMorador(e, t);
  if(e.type==="ab_tentaculo"){
    const rise = e.abRise > 0 ? 1 - e.abRise/700 : 1, wind = e.abWind > 0 ? 1 - e.abWind/AB_CFG.morador.slamWind : 0;
    ctx.save(); ctx.fillStyle = "rgba(8,2,14,0.85)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 38, 14, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    _abGlow(e.x, e.y, 40, "200,80,255", 0.35);
    const h = 200*(0.2 + 0.8*rise)*(e.alive ? 1 : 0.7), lean = -wind*0.35 + Math.sin(t*2.2 + e.x*0.01)*0.1;
    ctx.save(); if(!e.alive) ctx.globalAlpha *= 0.6;
    ctx.beginPath(); ctx.rect(e.x - 200, e.y - 400, 400, 404); ctx.clip();
    _abSpr("tent_grande_0", e.x, e.y + 8, h, (e.fx||0) < 0, e.hitFlash > 55 ? 0.75 : 1, 0.95, lean*((e.fx||0) < 0 ? -1 : 1));
    ctx.restore();
    if(e.hitFlash > 55) _abGlow(e.x, e.y - h*0.5, 60, "255,220,255", 0.4);
    return true;
  }
  if(e.type==="ab_carcelero" && e.abRise && abS){
    const q = Math.max(0, Math.min(1, abS.ca.t/3600)), h = e.radius*3.4;
    _abGlow(e.x, e.y - 20, 160, "200,60,120", 0.4*q);
    ctx.save(); ctx.beginPath(); ctx.rect(e.x - 300, e.y - 600, 600, 604); ctx.clip();
    ctx.translate(0, (1 - q)*h); ctx.globalAlpha *= 0.4 + 0.6*q;
    drawEnemyAtlasPack(e);
    ctx.restore();
    return true;
  }
  if(e.abEmerge > 0 && e.alive){
    // trepa desde el borde / sale del portal: aparece desde abajo
    const q = 1 - e.abEmerge/520;
    ctx.save(); ctx.beginPath(); ctx.rect(e.x - 200, e.y - 400, 400, 404); ctx.clip();
    ctx.translate(0, (1 - q)*e.radius*2.6); ctx.globalAlpha *= 0.3 + 0.7*q;
    drawEnemyAtlasPack(e); ctx.restore();
    return true;
  }
  return false;
}
function _abDrawMorador(e, t){
  const M = abS ? abS.mo : {st:"fight", ph:1};
  const dying = M.st==="dying" || !e.alive;
  const x = e.x, y = e.y, open = (e._eyeOpenUntil && e._eyeOpenUntil > runElapsedMs) || e.dmgTakenMult > 1;
  let set = "idle", f = Math.floor(t*6) % 5;
  if(dying){ set = "muerte"; f = Math.min(4, Math.floor(((M.t||0)/1600)*5)); }
  else if(e.hitFlash > 55) set = "dano";
  else if(open) set = "abre";
  else if((Math.floor(t*10) % 60) < 5) set = "blink";
  const H = (M.ph===3 ? 250 : 210)*(dying ? Math.max(0.3, 1 - (M.t||0)/6000) : 1);
  // masa de carne bajo el ojo (la cabeza asomando desde el pozo): elipse texturada con bordes que se funden en el vacío
  const mx = x, my = y - H*0.16, rx = H*0.66, ry = H*0.44;
  ctx.save();
  ctx.fillStyle = "rgba(6,1,10,0.92)"; ctx.beginPath(); ctx.ellipse(x, y + 12, H*0.85, H*0.3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(mx, my, rx, ry, 0, 0, Math.PI*2); ctx.clip();
  if(AB_OK.tex_carne){ const im = AB_IMG.tex_carne, sy = 46; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, 0, sy, im.width, im.height - sy, mx - rx, my - ry*1.1, rx*2, ry*2.2); }
  else { ctx.fillStyle = "#3a1030"; ctx.fillRect(mx - rx, my - ry, rx*2, ry*2); }
  const g = ctx.createRadialGradient(mx, my, ry*0.35, mx, my, rx);
  g.addColorStop(0, "rgba(20,2,20,0)"); g.addColorStop(0.7, "rgba(12,2,16,0.55)"); g.addColorStop(1, "rgba(4,0,8,0.98)");
  ctx.fillStyle = g; ctx.fillRect(mx - rx, my - ry, rx*2, ry*2);
  ctx.restore();
  // tentáculos cortos a los costados del ojo
  for(const s of [-1, 1]) _abSpr("tent_segmento_2", x + s*H*0.62, y + 12, H*0.95, s > 0, 0.95, 0.95, s*(0.35 + Math.sin(t*1.8 + s)*0.12));
  _abGlow(x, y - H*0.3, H*0.9, open ? "255,90,160" : "220,60,120", open ? 0.75 : 0.45 + 0.1*Math.sin(t*3));
  _abSpr("eye_"+set+"_"+f, x, y - H*0.28, H*0.72, false, 1, 0.5);
  if(e.hitFlash > 55) _abGlow(x, y - H*0.28, H*0.5, "255,230,255", 0.4);
  return true;
}

/* ---------------- capa superior ---------------- */
function abDrawTop(){
  if(!abS) return;
  const t = animNow/1000;
  // orbes del Heraldo (con marca de adónde van a caer)
  for(const o of abS.orbs){
    if(!inView(o.x, o.y, 80)) continue;
    ctx.save(); ctx.strokeStyle = `rgba(190,110,255,${0.35 + 0.2*Math.sin(t*8)})`; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.ellipse(o.tx, o.ty, AB_CFG.heraldo.zoneR, AB_CFG.heraldo.zoneR*AB_ASP, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    _abGlow(o.x, o.y, 40, "190,90,255", 0.7);
    if(!_abFx("abHeraldoOrb", Math.floor(t*10), o.x, o.y, 42, 1)){ ctx.fillStyle = "#c070ff"; ctx.beginPath(); ctx.arc(o.x, o.y, 10, 0, Math.PI*2); ctx.fill(); }
  }
  // gancho del Carcelero (encima de todo: es el ataque que hay que leer)
  for(const c of abS.chains){ if(c.hook) _abChain(c.x0, c.y0, c.x1, c.y1, 6, t, "255,80,140", 1); }
  // colgados del borde: manos en el borde, el vacío tapando las piernas y el reloj
  for(const H of abS.hang){
    const h = heroes[H.h]; if(!h) continue;
    const q = Math.max(0, 1 - H.t/H.dur), urgent = q < 0.3;
    const g = ctx.createLinearGradient(0, H.hy - 30, 0, H.hy + 12);
    g.addColorStop(0, "rgba(4,2,8,0)"); g.addColorStop(1, "rgba(4,2,8,0.95)");
    ctx.fillStyle = g; ctx.fillRect(H.hx - 34, H.hy - 30, 68, 44);
    ctx.fillStyle = "#e0b890"; for(const s of [-1, 1]){ ctx.beginPath(); ctx.arc(H.lx + s*9, H.ly - 2, 4, 0, Math.PI*2); ctx.fill(); }
    const cx = H.hx, cy = H.hy - 92;
    ctx.save();
    ctx.fillStyle = "rgba(10,4,16,0.8)"; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = urgent ? `rgba(255,70,90,${0.7 + 0.3*Math.sin(t*14)})` : "#e8c8ff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 12, -Math.PI/2, -Math.PI/2 + q*Math.PI*2); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = pxFont(11); ctx.textAlign = "center"; ctx.fillText("🤝", cx, cy + 4);
    ctx.restore();
  }
}

/* ---------------- pantalla ---------------- */
function abDrawScreen(){
  if(!abS || !player) return;
  const M = abS.mo, t = animNow/1000;
  ctx.save();
  // viñeta del vacío (siempre un poco; late en la fase 3)
  const k = (M.st==="fight" && M.ph===3) ? 0.45 + 0.12*Math.sin(t*3) : 0.28;
  const g = ctx.createRadialGradient(VW/2, VH/2, Math.min(VW, VH)*0.38, VW/2, VH/2, Math.max(VW, VH)*0.78);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(20,4,34,${k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // el jugador colgado: borde rojo y cartel claro
  if(player.abHang){
    const H = abS.hang.find(o=>heroes[o.h]===player), q = H ? Math.max(0, 1 - H.t/H.dur) : 1;
    ctx.fillStyle = `rgba(120,0,30,${0.18 + 0.12*Math.sin(t*8)})`; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = pxFont(18);
    ctx.fillText("¡ESTÁS COLGADO DEL BORDE!", VW/2, VH*0.28);
    ctx.font = pxFont(14); ctx.fillText(`Un compañero tiene que acercarse y mantener RESCATAR · ${Math.ceil(H ? (H.dur - H.t)/1000 : 0)} s`, VW/2, VH*0.28 + 22);
  }
  ctx.restore();
  if(!player.duelActive) _abMinimap();
}
function _abMinimap(){
  const W = Math.min(150, VW*0.26), k = W/2200, Hh = 1560*k;
  const X = VW - W - 12, Y = Math.max(70, VH*0.16), cx = X + W/2, cy = Y + Hh/2;
  const tx = x=>cx + x*k, ty = y=>cy + y*k;
  ctx.save(); ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(6,2,12,0.72)"; ctx.beginPath(); ctx.ellipse(cx, cy, W/2 + 4, Hh/2 + 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(170,90,255,0.6)"; ctx.lineWidth = 1; ctx.stroke();
  const blink = Math.sin(animNow/90) > 0;
  for(let i=0;i<AB_PLATS.length;i++){
    const st = abS.p[i].st; if(st===AB_ST.GONE) continue;
    ctx.fillStyle = st===AB_ST.STABLE ? "#6a6078" : st===AB_ST.CRACKED ? "#a08a50" : st===AB_ST.CRITICAL ? "#d0603a" : st===AB_ST.FALLING ? (blink ? "#ff3050" : "#601020") : "rgba(140,110,230,0.5)";
    const P = AB_POLY[i].pts; ctx.beginPath();
    for(let j=0;j<P.length;j+=(P.length > 8 ? 3 : 1)){ const q = P[j]; if(j) ctx.lineTo(tx(q[0]), ty(q[1])); else ctx.moveTo(tx(q[0]), ty(q[1])); }
    ctx.closePath(); ctx.fill();
  }
  for(const e of enemies){
    if(!e.alive) continue;
    if(e.rank==="subjefe" || e.rank==="jefe"){ ctx.fillStyle = "#ff4a8a"; ctx.fillRect(tx(e.x) - 3, ty(e.y) - 3, 6, 6); }
    else if(e.rank==="elite"){ ctx.fillStyle = "#d090ff"; ctx.fillRect(tx(e.x) - 1.5, ty(e.y) - 1.5, 3, 3); }
  }
  heroes.forEach((h, i)=>{
    ctx.fillStyle = h.abHang ? (blink ? "#ff5070" : "#ffffff") : (h===player ? "#ffffff" : (h.alive ? (["#4ad0ff","#8effb4","#ffd24a","#ff8ad8"][i%4]) : "#777"));
    ctx.beginPath(); ctx.arc(tx(h.x), ty(h.y), h===player ? 3 : 2.4, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}
