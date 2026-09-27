"use strict";
/* ============================================================
   js/arenas/ciudad/cm-render.js
   CIUDAD MALDITA — dibujo. Todo sale de las hojas oficiales (tools/art/ciudad/extract.py):
     - piso: texturas de calle, adoquín, tierra y escombros (CIUDAD_TEX) en patrones x2 (píxel nítido)
     - edificios en vista oblicua: planta (colisión real) + cara frontal (pared exterior, puerta,
       ventanas) + techo de tejas. Al ENTRAR, el techo y la pared frontal se desvanecen SOLO en la
       pantalla del que entró (fundido local: la colisión no cambia y los demás siguen viendo el techo).
       Si quedás "detrás" de un edificio, su techo se aclara para no perderte.
     - estructuras con estados (grietas, humo, fuego en CRÍTICA, escombros al caer) y barra de vida
     - civiles (atlas de la hoja) con sus pistas: "?" y sollozos, "!" rojo cuando los amenazan
     - HUD: rescatados / perdidos / en peligro, estado de estructuras, alertas prioritarias con flecha,
       minimapa (zonas seguras, civiles; pistas solo con la Torre de Vigía en pie), apagón y reflector.
   ============================================================ */
const CM_IMG = {}, CM_OK = {}, CM_PAT = {};
function _cmImg(key, src){ if(CM_IMG[key]) return CM_IMG[key]; const im = new Image(); im.onload = ()=>{ CM_OK[key] = true; }; im.src = src; CM_IMG[key] = im; return im; }
(function cmLoadArt(){
  if(typeof CIUDAD_TEX!=="undefined") for(const k in CIUDAD_TEX) _cmImg(k, CIUDAD_TEX[k]);
  if(typeof CIUDAD_PIECES!=="undefined") for(const k in CIUDAD_PIECES) CIUDAD_PIECES[k].forEach((s, i)=>_cmImg(k + "_" + i, s));
})();
function _cmPat(key, sc){
  const id = key + "@" + (sc||2);
  if(CM_PAT[id]) return CM_PAT[id];
  if(!CM_OK[key]) return null;
  const p = ctx.createPattern(CM_IMG[key], "repeat");
  if(p && p.setTransform && typeof DOMMatrix!=="undefined") p.setTransform(new DOMMatrix().scale(sc||2));
  CM_PAT[id] = p; return p;
}
function _cmFillPat(key, sc, fallback, x, y, w, h, alpha){
  const p = _cmPat(key, sc);
  ctx.save(); if(alpha!==undefined) ctx.globalAlpha *= alpha;
  ctx.fillStyle = p || fallback; ctx.fillRect(x, y, w, h); ctx.restore();
}
function _cmPiece(key, x, y, h, alpha, flip, anchorY){
  const im = CM_IMG[key]; if(!im || !CM_OK[key]) return false;
  const s = h/im.height, w = im.width*s;
  ctx.save(); ctx.imageSmoothingEnabled = false; if(alpha!==undefined) ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(x), Math.round(y)); if(flip) ctx.scale(-1, 1);
  ctx.drawImage(im, -w/2, -h*(anchorY===undefined ? 1 : anchorY), w, h); ctx.restore();
  return true;
}
function _cmGlow(x, y, r, rgb, a){ if(a <= 0.01) return; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(rgb), x - r, y - r, r*2, r*2); ctx.restore(); }
function _cmAtlasFrame(type, set, n, x, y, h, flip, alpha, loop){
  const P = ENEMY_ATLAS_PACK[type]; if(!P || !P.ready) return false;
  const arr = P.sets[set] || P.sets.idle; if(!arr || !arr.length) return false;
  const v = loop===false ? arr[Math.min(arr.length - 1, Math.max(0, n))] : arr[((n % arr.length) + arr.length) % arr.length];
  const s = h/P.refH;
  drawAnimFrameSized(P.atlas, {frames:[{x:(v % P.cols)*P.fw, y:Math.floor(v/P.cols)*P.fh, w:P.fw, h:P.fh}]}, 0, Math.round(x), Math.round(y), P.fw*s, P.fh*s, 0.5, P.anchor, flip, alpha);
  return true;
}
function _cmFx(key, i, x, y, h, alpha, anchorY){
  const F = typeof CIUDAD_FX!=="undefined" && CIUDAD_FX[key]; if(!F) return;
  const src = F.srcs[Math.min(F.srcs.length - 1, i|0)]; const k = "fx:" + src; _cmImg(k, src);
  _cmPiece(k, x, y, h, alpha, false, anchorY===undefined ? 0.5 : anchorY);
}
function _cmView(){ const hw = VW/2/CAM_ZOOM, hh = VH/2/CAM_ZOOM, cy = player.y - CAM_LIFT; return {x0:player.x - hw - 80, x1:player.x + hw + 80, y0:cy - hh - CAM_Y_ANCHOR/CAM_ZOOM - 140, y1:cy + hh + 120}; }
function _cmVis(V, x0, y0, x1, y1){ return !(x1 < V.x0 || x0 > V.x1 || y1 < V.y0 || y0 > V.y1); }

// fundido local de techos: 1 = techo visible, ~0.08 = el jugador está adentro
const CM_ROOF_A = {};
let _cmInB = null;
function cmRenderTick(dt){
  if(!player) return;
  _cmInB = cmBuildingAt(player.x, player.y);
  for(const b of CM_BUILDINGS){
    let want = 1;
    if(_cmInB===b) want = 0.08;
    else if(player.x > b.x0 - 10 && player.x < b.x1 + 10 && player.y < b.y0 + 40 && player.y > b.y0 - CM_WALL_H - 60) want = 0.45;   // detrás del edificio
    const a = CM_ROOF_A[b.id]===undefined ? 1 : CM_ROOF_A[b.id];
    CM_ROOF_A[b.id] = a + (want - a)*Math.min(1, dt/180);
  }
}
function cmRenderReset(){ for(const k in CM_ROOF_A) delete CM_ROOF_A[k]; }

/* ---------------- piso ---------------- */
function cmDrawWorld(now){
  if(!cmS || !player) return;
  const V = _cmView(), B = CM_BOUNDS, t = now;
  ctx.imageSmoothingEnabled = false;
  // afuera de la ciudad: techos lejanos en la oscuridad
  ctx.fillStyle = "#0b070c"; ctx.fillRect(V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100);
  if(V.x0 < B.x0 || V.x1 > B.x1 || V.y0 < B.y0 || V.y1 > B.y1) _cmFillPat("tex_techo", 2, "#241018", V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100, 0.35);
  // calles: base de tierra/escombro + adoquín en avenidas, plaza y escenario
  const ix0 = Math.max(B.x0, V.x0), iy0 = Math.max(B.y0, V.y0), ix1 = Math.min(B.x1, V.x1), iy1 = Math.min(B.y1, V.y1);
  if(ix1 > ix0 && iy1 > iy0){
    _cmFillPat("tex_calle", 2, "#3a3440", ix0, iy0, ix1 - ix0, iy1 - iy0);
    ctx.fillStyle = "rgba(8,4,12,0.28)"; ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
  }
  _cmFillPat("tex_adoquin", 2, "#4a4450", -140, B.y0, 280, B.y1 - B.y0);        // calle principal N-S
  _cmFillPat("tex_adoquin", 2, "#4a4450", B.x0, -120, B.x1 - B.x0, 240);        // avenida E-O
  // plaza central (círculo de adoquín con borde)
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 420, 330, 0, 0, Math.PI*2); ctx.clip();
  _cmFillPat("tex_adoquin", 2, "#4a4450", -430, -340, 860, 680); ctx.restore();
  ctx.strokeStyle = "rgba(20,12,20,0.7)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(0, 0, 420, 330, 0, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = "rgba(170,130,110,0.18)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 410, 320, 0, 0, Math.PI*2); ctx.stroke();
  // escenario del Presentador: alfombra roja frente a la catedral
  const S = CM_MAP.stage;
  ctx.fillStyle = "rgba(90,10,20,0.55)"; ctx.fillRect(S.x - 120, -1090, 240, 400);
  ctx.fillStyle = "rgba(200,160,60,0.25)"; ctx.fillRect(S.x - 124, -1090, 4, 400); ctx.fillRect(S.x + 120, -1090, 4, 400);
  // escombros y manchas (la ciudad saqueada)
  for(let i=0;i<46;i++){ const hx = _cmHash(i, 1), hy = _cmHash(i, 2), x = B.x0 + hx*(B.x1 - B.x0), y = B.y0 + hy*(B.y1 - B.y0); if(!_cmVis(V, x - 40, y - 40, x + 40, y + 40) || cmBuildingAt(x, y)) continue;
    ctx.fillStyle = i % 3 ? "rgba(20,10,14,0.35)" : "rgba(90,14,18,0.22)"; ctx.beginPath(); ctx.ellipse(x, y, 20 + _cmHash(i, 3)*34, 10 + _cmHash(i, 4)*14, 0, 0, Math.PI*2); ctx.fill(); }
  // interiores (piso de madera) y cara interior de la pared del fondo
  for(const b of CM_BUILDINGS){
    if(!b.door || !_cmVis(V, b.x0, b.y0 - CM_WALL_H, b.x1, b.y1)) continue;
    const I = b.inner;
    _cmFillPat("tex_puente", 2, "#3a2a1e", I.x0, I.y0, I.x1 - I.x0, I.y1 - I.y0);
    ctx.fillStyle = "rgba(10,4,6,0.35)"; ctx.fillRect(I.x0, I.y0, I.x1 - I.x0, I.y1 - I.y0);
    // alfombra y muebles (piezas de la hoja)
    ctx.fillStyle = "rgba(120,16,24,0.55)"; ctx.fillRect(b.cx - 34, I.y0 + 30, 68, I.y1 - I.y0 - 60);
    _cmPiece("barril_0", I.x0 + 34, I.y0 + 64, 46); _cmPiece("barril_0", I.x1 - 30, I.y1 - 20, 40, 0.9, true);
    // pared del fondo, cara interior (se ve cuando el techo se desvanece)
    _cmFillPat("tex_pared_int", 2, "#3a3440", b.x0, b.y0 - CM_WALL_H + CM_WALL_T, b.x1 - b.x0, CM_WALL_H);
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(b.x0, b.y0 + CM_WALL_T - 6, b.x1 - b.x0, 6);
    const lampA = 0.35 + 0.1*Math.sin(t*3 + b.cx);
    _cmGlow(b.cx, I.y0 + 50, 90, "255,150,70", lampA*(1 - (CM_ROOF_A[b.id]===undefined ? 1 : CM_ROOF_A[b.id])));
  }
  _cmDrawGroundMarks(t, V);
}
function _cmHash(i, k){ let h = (i*374761393 + k*668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0)/4294967296; }
function _cmDrawGroundMarks(t, V){
  // zonas seguras: escudo verde que late (se apaga si la estructura cayó)
  for(const z of CM_SAFE){
    const S = cmS.st[cmStructIdx(z.id)]; const dead = S.st===CM_ST.DESTROYED;
    if(!_cmVis(V, z.x - 140, z.y - 140, z.x + 140, z.y + 140)) continue;
    const R = CM_CFG.civ.safeR, a = dead ? 0.15 : 0.35 + 0.15*Math.sin(t*3);
    ctx.save(); ctx.strokeStyle = dead ? "rgba(120,60,60,0.5)" : `rgba(120,255,150,${a + 0.2})`; ctx.lineWidth = 4; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t*20;
    ctx.beginPath(); ctx.ellipse(z.x, z.y, R, R*0.72, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    if(!dead){ ctx.fillStyle = `rgba(90,255,140,${a*0.35})`; ctx.fill(); _cmGlow(z.x, z.y, R, "90,255,140", a*0.5); }
    ctx.fillStyle = dead ? "#a05050" : "#bfffcf"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText(dead ? "✖" : "🛡", z.x, z.y + 8);
    ctx.restore();
  }
  // campanas
  CM_MAP.bells.forEach((b, i)=>{
    if(!_cmVis(V, b.x - 80, b.y - 80, b.x + 80, b.y + 80)) return;
    const B = cmS.bells[i];
    ctx.save(); ctx.fillStyle = "rgba(20,10,4,0.55)"; ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, 30, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#b07a2a"; ctx.beginPath(); ctx.moveTo(b.x - 18, b.y + 4); ctx.quadraticCurveTo(b.x - 16, b.y - 30, b.x, b.y - 34); ctx.quadraticCurveTo(b.x + 16, b.y - 30, b.x + 18, b.y + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#3a2008"; ctx.lineWidth = 2; ctx.stroke();
    if(B.by){ const q = Math.min(1, B.t/CM_CFG.campanero.channelMs); _cmGlow(b.x, b.y - 16, 70 + q*70, "255,170,60", 0.4 + 0.3*Math.sin(t*14));
      ctx.strokeStyle = "rgba(255,190,90,0.9)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(b.x, b.y - 60, 20, -Math.PI/2, -Math.PI/2 + q*Math.PI*2); ctx.stroke(); }
    ctx.restore();
  });
  // rejillas de cloaca
  for(const s of CM_MAP.sewers){ if(!_cmVis(V, s.x - 40, s.y - 40, s.x + 40, s.y + 40)) continue; ctx.fillStyle = "#15101a"; ctx.fillRect(s.x - 22, s.y - 12, 44, 24); ctx.strokeStyle = "#4a4250"; ctx.lineWidth = 2; for(let k=-16;k<=16;k+=8){ ctx.beginPath(); ctx.moveTo(s.x + k, s.y - 10); ctx.lineTo(s.x + k, s.y + 10); ctx.stroke(); } _cmGlow(s.x, s.y, 40, "80,200,160", 0.12); }
  // zonas de jefes (marca / oscura)
  for(const Z of cmS.zones){
    const q = Math.min(1, Z.t/Math.max(1, Z.arm||1)), fade = Math.min(1, (Z.d - Z.t)/400);
    const rgb = Z.k==="dark" ? "150,60,255" : "255,50,90";
    ctx.save(); ctx.globalAlpha = fade;
    ctx.fillStyle = `rgba(${rgb},${0.12 + 0.12*q})`; ctx.beginPath(); ctx.ellipse(Z.x, Z.y, Z.r, Z.r*0.75, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},0.7)`; ctx.lineWidth = 3; ctx.stroke();
    _cmFx(Z.k==="dark" ? "cmDarkZone" : "cmMaeZone", ((Z.t/140)|0) % 4, Z.x, Z.y, Z.r*1.5, 0.8*fade, 0.6);
    ctx.restore();
  }
  // impactos con aviso: círculo que se llena
  for(const D of cmS.drops){
    const q = Math.min(1, D.t/D.d), rgb = D.k==="scenery" ? "255,150,60" : D.k==="mae" || D.k==="mark" ? "255,40,90" : D.k==="curtain" ? "255,40,40" : "255,90,90";
    ctx.save(); ctx.strokeStyle = `rgba(${rgb},0.85)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(D.x, D.y, D.r, D.r*0.72, 0, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = `rgba(${rgb},${0.1 + 0.3*q})`; ctx.beginPath(); ctx.ellipse(D.x, D.y, D.r*q, D.r*0.72*q, 0, 0, Math.PI*2); ctx.fill();
    if(D.k==="mark" || D.k==="mae"){ _cmFx("cmShowMark", ((D.t/120)|0) % 6, D.x, D.y, D.r*1.5, 0.7, 0.5); }
    ctx.restore();
  }
  // reflector (Dama / Presentador)
  if(cmS.spot){ _cmGlow(cmS.spot.x, cmS.spot.y, 200, "255,240,210", 0.25); }
}

/* ---------------- piezas altas (orden por profundidad) ---------------- */
function cmPushTall(){
  if(!cmS) return;
  const V = _cmView();
  for(const b of CM_BUILDINGS){ if(_cmVis(V, b.x0 - 20, b.y0 - CM_WALL_H - 60, b.x1 + 20, b.y1 + 20)) _entPush(b.y1, null, null, null, {arena:1, cm:"b", b}); }
  if(_cmVis(V, CM_MAP.statue.x - 120, CM_MAP.statue.y - 220, CM_MAP.statue.x + 120, CM_MAP.statue.y + 90)) _entPush(CM_MAP.statue.y + 40, null, null, null, {arena:1, cm:"statue"});
  { const s = CM_STRUCTS[cmStructIdx("puerta")]; if(_cmVis(V, s.gate.x0 - 60, s.gate.y0 - 180, s.gate.x1 + 60, s.gate.y1)) _entPush(s.gate.y1, null, null, null, {arena:1, cm:"gate"}); }
  for(const s of CM_MAP.solids){ if(_cmVis(V, s.x - 60, s.y - 120, s.x + 60, s.y + 40)) _entPush(s.y, null, null, null, {arena:1, cm:"prop", s}); }
  for(const c of cmS.civ){ if(c.st===CIV.KIDNAPPED) continue; if(_cmVis(V, c.x - 60, c.y - 90, c.x + 60, c.y + 30)) _entPush(c.y, null, null, null, {arena:1, cm:"civ", c}); }
  for(const B of cmS.bars){ if(_cmVis(V, B.x0, B.y0 - 60, B.x1, B.y1)) _entPush(B.y1, null, null, null, {arena:1, cm:"bar", B}); }
  for(const P of cmS.pillars){ if(_cmVis(V, P.x - 60, P.y - 160, P.x + 60, P.y + 40)) _entPush(P.y, null, null, null, {arena:1, cm:"pillar", P}); }
  for(const s of (cmS.spec||[])){ if(_cmVis(V, s.x - 60, s.y - 120, s.x + 60, s.y + 40)) _entPush(s.y, null, null, null, {arena:1, cm:"spec", s}); }
  if(cmS.pr.st==="dying" || cmS.pr.st==="dead"){ const P = cmS.pr; if(P.x!==undefined) _entPush(P.y, null, null, null, {arena:1, cm:"pdeath"}); }
  // lámparas de la calle
  for(let i=0;i<CM_LAMPS.length;i++){ const L = CM_LAMPS[i]; if(_cmVis(V, L.x - 40, L.y - 120, L.x + 40, L.y + 20)) _entPush(L.y, null, null, null, {arena:1, cm:"lamp", L}); }
}
const CM_LAMPS = [{x:-160, y:600}, {x:160, y:600}, {x:-160, y:-560}, {x:160, y:-560}, {x:-700, y:-140}, {x:700, y:140}, {x:-460, y:-360}, {x:460, y:360}, {x:-1150, y:120}, {x:1150, y:-120}, {x:-300, y:1000}, {x:300, y:1000}];
function cmDrawTall(it, now){
  const t = now;
  switch(it.cm){
    case "b": _cmDrawBuilding(it.b, t); break;
    case "statue": {
      const S = CM_MAP.statue;
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(S.x, S.y + 30, 110, 40, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1a3a3a"; ctx.beginPath(); ctx.ellipse(S.x, S.y + 20, 100, 38, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(80,230,210,${0.35 + 0.1*Math.sin(t*2)})`; ctx.beginPath(); ctx.ellipse(S.x, S.y + 18, 86, 30, 0, 0, Math.PI*2); ctx.fill();
      _cmGlow(S.x, S.y, 140, "80,230,210", 0.25);
      if(!_cmPiece("estatua_0", S.x, S.y + 26, 200)) { ctx.fillStyle = "#3a3440"; ctx.fillRect(S.x - 24, S.y - 150, 48, 170); }
      break;
    }
    case "gate": _cmDrawGate(t); break;
    case "prop": _cmPiece(it.s.r > 24 ? "barril_0" : "escombros_0", it.s.x, it.s.y + 10, it.s.r > 24 ? 64 : 44); break;
    case "civ": _cmDrawCiv(it.c, t); break;
    case "bar": { const B = it.B, a = Math.min(1, (B.d - B.t)/500, B.t/200);
      ctx.save(); ctx.globalAlpha = a; _cmFillPat("tex_puente", 2, "#5a3a22", B.x0, B.y0 - 40, B.x1 - B.x0, 40 + (B.y1 - B.y0)); ctx.strokeStyle = "#1a0c06"; ctx.lineWidth = 3; ctx.strokeRect(B.x0, B.y0 - 40, B.x1 - B.x0, 40 + (B.y1 - B.y0)); ctx.restore(); break; }
    case "pillar": { const P = it.P, rise = P.t < 0 ? 1 + P.t/700 : Math.min(1, (P.d - P.t)/600);
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(P.x, P.y + 4, 40, 14, 0, 0, Math.PI*2); ctx.fill();
      if(P.t < 0){ ctx.strokeStyle = `rgba(255,200,120,${0.4 + 0.4*Math.sin(t*12)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(P.x, P.y, P.r, P.r*0.5, 0, 0, Math.PI*2); ctx.stroke(); }
      ctx.save(); ctx.beginPath(); ctx.rect(P.x - 60, P.y - 200, 120, 206); ctx.clip();
      if(!_cmPiece("pilar_escena_" + (P.v % 8), P.x, P.y + 6 + (1 - Math.max(0, rise))*150, 150)){ ctx.fillStyle = "#4a3a40"; ctx.fillRect(P.x - 24, P.y - 140 + (1 - rise)*150, 48, 146); }
      ctx.restore(); break; }
    case "spec": { const s = it.s, a = 0.5 + 0.2*Math.sin(t*2 + s.v);
      _cmFx("cmSpectators", s.v % 4, s.x, s.y, 110, a, 1); _cmGlow(s.x, s.y - 50, 60, "255,80,120", 0.2); break; }
    case "pdeath": { const P = cmS.pr, T = P.t||0, P3 = ENEMY_ATLAS_PACK.cm_presentador3;
      if(P3 && P3.ready){ const arr = P3.sets.death || P3.sets.idle, n = Math.min(arr.length - 1, Math.floor(T/(CM_CFG.presentador.deathMs*0.7/arr.length))); _cmAtlasFrame("cm_presentador3", "death", n, P.x, P.y, 60*3.2, P.fx < 0, Math.max(0, 1 - Math.max(0, T - 7000)/2500), false); }
      break; }
    case "lamp": { const L = it.L; _cmGlow(L.x, L.y - 80, 110, "255,160,70", 0.28 + 0.05*Math.sin(t*5 + L.x)); if(!_cmPiece("farol_0", L.x, L.y + 4, 96)){ ctx.fillStyle = "#1a1418"; ctx.fillRect(L.x - 3, L.y - 90, 6, 94); } break; }
  }
}
function _cmStructOf(b){ const i = b.struct ? cmStructIdx(b.struct) : -1; return i >= 0 ? {i, s:CM_STRUCTS[i], S:cmS.st[i]} : null; }
function _cmDrawBuilding(b, t){
  const H = CM_WALL_H, a = CM_ROOF_A[b.id]===undefined ? 1 : CM_ROOF_A[b.id];
  const st = _cmStructOf(b), dead = st && st.S.st===CM_ST.DESTROYED;
  const W = b.x1 - b.x0, faceY = b.y1 - H;
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(b.x0 + 10, b.y1 - 6, W, 14);
  if(dead){ _cmDrawRuin(b, t); return; }
  const tall = b.kind==="torre" ? 1.9 : b.kind==="campanario" ? 2.2 : b.kind==="catedral" ? 2.4 : 1;
  const HH = H*tall;
  // cara frontal (pared exterior + puerta + ventanas)
  ctx.save(); ctx.globalAlpha *= Math.max(0.22, a);
  _cmFillPat("tex_pared_ext", 2, "#3a3a44", b.x0, b.y1 - HH, W, HH);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(b.x0, b.y1 - 8, W, 8);
  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(b.x0, b.y1 - HH, W, 3);
  // ventanas con luz (vida que queda en la ciudad)
  const nw = Math.max(1, Math.floor(W/140));
  for(let k=0;k<nw;k++){ const wx = b.x0 + (k + 0.5)*W/nw; if(b.door && b.door.side==="s" && Math.abs(wx - b.door.at) < 70) continue; if(!_cmPiece("tex_ventana", wx, b.y1 - HH*0.25, Math.min(56, HH*0.55))){ ctx.fillStyle = "#e0a040"; ctx.fillRect(wx - 10, b.y1 - HH*0.6, 20, 26); } _cmGlow(wx, b.y1 - HH*0.5, 40, "255,170,80", 0.15); }
  if(b.door && b.door.side==="s"){
    ctx.fillStyle = "#0a0608"; ctx.fillRect(b.door.at - CM_DOOR_W/2, b.y1 - H*0.8, CM_DOOR_W, H*0.8);
    _cmPiece("tex_puerta", b.door.at - CM_DOOR_W/2 + 10, b.y1, H*0.8, 0.9, false, 1);
  }
  ctx.restore();
  // lados con puerta (e/w): marco visible en el borde
  if(b.door && (b.door.side==="e" || b.door.side==="w")){
    const x = b.door.side==="e" ? b.x1 - 6 : b.x0 - 2;
    ctx.fillStyle = "rgba(10,6,8,0.85)"; ctx.fillRect(x, b.door.at - CM_DOOR_W/2 - H*0.2, 8, CM_DOOR_W);
    _cmGlow(x, b.door.at - 20, 50, "255,150,70", 0.2);
  }
  // techo (se desvanece solo en la pantalla del que entró)
  ctx.save(); ctx.globalAlpha *= a;
  const ry0 = b.y0 - HH, ry1 = b.y1 - HH;
  if(b.kind==="torre" || b.kind==="campanario"){
    _cmFillPat("tex_muralla", 2, "#3a3440", b.x0, ry0, W, ry1 - ry0);
    ctx.fillStyle = "#2a1016"; ctx.beginPath(); ctx.moveTo(b.x0 - 8, ry1); ctx.lineTo(b.cx, ry0 - 110); ctx.lineTo(b.x1 + 8, ry1); ctx.closePath(); ctx.fill();
    _cmFillPat("tex_techo", 2, "#5a1e24", b.x0 + 20, ry1 - 60, W - 40, 60, 0.6);
    if(b.kind==="campanario"){ ctx.fillStyle = "#c08a30"; ctx.beginPath(); ctx.arc(b.cx, ry1 - 30, 18, Math.PI, 0); ctx.fill(); _cmGlow(b.cx, ry1 - 30, 60, "255,180,80", 0.3); }
  } else if(b.kind==="catedral"){
    _cmFillPat("tex_muralla", 2, "#2a2430", b.x0, ry0 - 60, W, ry1 - ry0 + 60);
    for(const x of [b.x0 + 60, b.cx, b.x1 - 60]){ ctx.fillStyle = "#1a0c12"; ctx.beginPath(); ctx.moveTo(x - 40, ry0 - 60); ctx.lineTo(x, ry0 - 200); ctx.lineTo(x + 40, ry0 - 60); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = `rgba(220,40,60,${0.5 + 0.2*Math.sin(t*1.5)})`; ctx.beginPath(); ctx.arc(b.cx, ry0 + 10, 30, 0, Math.PI*2); ctx.fill(); _cmGlow(b.cx, ry0 + 10, 110, "255,40,70", 0.35);
  } else {
    _cmFillPat("tex_techo", 2, "#5a1e24", b.x0 - 8, ry0, W + 16, ry1 - ry0 + 4);
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(b.x0 - 8, ry1 - 10, W + 16, 14);
    ctx.fillStyle = "rgba(255,210,180,0.10)"; ctx.fillRect(b.x0 - 8, (ry0 + ry1)/2 - 3, W + 16, 6);            // cumbrera
    ctx.fillStyle = "#1a1016"; ctx.fillRect(b.x0 + W*0.72, ry0 - 26, 22, 34);                                  // chimenea
    if(Math.sin(t*0.8 + b.cx) > 0.2 && Math.random() < 0.03) vfxBurst(b.x0 + W*0.72 + 11, ry0 - 30, 1, "shadow", 20, 1600, 5, 0, -40, 0);
  }
  // daño de la estructura
  if(st){
    const S = st.S;
    if(S.st >= CM_ST.DAMAGED){ ctx.strokeStyle = "rgba(10,4,4,0.8)"; ctx.lineWidth = 3; for(let k=0;k<(S.st===CM_ST.CRITICAL ? 7 : 3);k++){ const x = b.x0 + _cmHash(k, b.x0|0)*W, y = ry0 + _cmHash(k, 7)*(ry1 - ry0); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20 - 40*_cmHash(k, 3), y + 30); ctx.lineTo(x + 30 - 60*_cmHash(k, 5), y + 50); ctx.stroke(); } }
    if(S.st===CM_ST.CRITICAL){ for(let k=0;k<3;k++){ const x = b.x0 + (0.2 + k*0.3)*W; _cmGlow(x, ry1 - 20, 60, "255,110,40", 0.35 + 0.15*Math.sin(t*9 + k)); if(Math.random() < 0.08) vfxBurst(x, ry1 - 30, 1, "ember", 40, 700, 3, 0, -60, 0); } }
    if(S.hit > 0){ ctx.fillStyle = `rgba(255,80,60,${S.hit/260*0.3})`; ctx.fillRect(b.x0, ry0, W, b.y1 - ry0); }
  }
  ctx.restore();
}
function _cmDrawRuin(b, t){
  const W = b.x1 - b.x0;
  _cmFillPat("tex_escombros", 2, "#3a3036", b.x0, b.y0 - 30, W, b.y1 - b.y0 + 30);
  ctx.fillStyle = "rgba(10,4,6,0.45)"; ctx.fillRect(b.x0, b.y0 - 30, W, b.y1 - b.y0 + 30);
  for(let k=0;k<6;k++) _cmPiece("escombros_0", b.x0 + (k + 0.5)*W/6, b.y1 - 10 - _cmHash(k, 9)*80, 50 + _cmHash(k, 4)*30);
  if(Math.random() < 0.05) vfxBurst(b.cx + cmRand(-W/2, W/2), b.cy, 1, "shadow", 20, 1800, 6, 0, -50, 0);
  _cmGlow(b.cx, b.cy, 120, "255,90,40", 0.12 + 0.05*Math.sin(t*4));
}
function _cmDrawGate(t){
  const i = cmStructIdx("puerta"), s = CM_STRUCTS[i], S = cmS.st[i], G = s.gate, H = 104;
  if(S.st===CM_ST.DESTROYED){ _cmFillPat("tex_escombros", 2, "#3a3036", G.x0, G.y0 - 40, G.x1 - G.x0, 100); return; }
  _cmFillPat("tex_muralla", 2, "#3a3440", G.x0 - 60, G.y1 - H, 60, H); _cmFillPat("tex_muralla", 2, "#3a3440", G.x1, G.y1 - H, 60, H);
  ctx.fillStyle = "#140c10"; ctx.fillRect(G.x0, G.y1 - H + 20, G.x1 - G.x0, H - 20); _cmGlow((G.x0 + G.x1)/2, G.y1 - 30, 90, "255,190,120", 0.22);
  _cmFillPat("tex_muralla", 2, "#3a3440", G.x0 - 60, G.y1 - H - 24, G.x1 - G.x0 + 120, 34);
  if(!_cmPiece("reja_0", (G.x0 + G.x1)/2, G.y1, H - 30)){ ctx.strokeStyle = "#5a5060"; ctx.lineWidth = 4; for(let x=G.x0 + 10;x<G.x1;x+=22){ ctx.beginPath(); ctx.moveTo(x, G.y1 - H + 30); ctx.lineTo(x, G.y1); ctx.stroke(); } }
  ctx.fillStyle = "#6a1018"; ctx.fillRect(G.x0 - 40, G.y1 - H + 4, 24, 52); ctx.fillRect(G.x1 + 16, G.y1 - H + 4, 24, 52);
  if(S.st >= CM_ST.DAMAGED){ _cmGlow((G.x0 + G.x1)/2, G.y1 - 60, 90, "255,110,40", S.st===CM_ST.CRITICAL ? 0.35 : 0.15); }
  _cmGlow((G.x0 + G.x1)/2, G.y1 - 70, 120, "120,255,150", 0.12);
}
function _cmCivKey(c){ return CM_CIV_KINDS[c.k] || "cm_aldeano"; }
function _cmDrawCiv(c, t){
  const key = _cmCivKey(c), h = c.k===2 ? 40 : 52, T = animNow;
  if(c.st===CIV.HIDDEN){
    // escondido: adentro de su casa solo lo ve quien entra; afuera, agachado entre escombros
    const inB = c.b && CM_BLD[c.b];
    const seen = !inB || _cmInB===inB;
    if(seen) _cmAtlasFrame(key, "hurt", 0, c.x, c.y, h*0.9, c.fx < 0, inB ? 0.9 : 0.55);
    return;
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(c.x, c.y, 14, 5, 0, 0, Math.PI*2); ctx.fill();
  let set = "idle", n = Math.floor(T/160), loop = true, a = 1;
  if(c.st===CIV.DEAD){ if(c.gone) return; set = "death"; n = Math.floor(c.t/120); loop = false; a = 0.85; }
  else if(c.st===CIV.RESCUED){ set = "walk"; a = Math.max(0, 1 - c.t/1500); }
  else if(c.st===CIV.HURT){ set = "hurt"; n = Math.floor(c.t/90); loop = false; }
  else if(c.st===CIV.PANIC || c.st===CIV.RUN || c.st===CIV.FLEE){ set = "run"; n = Math.floor(T/80); }
  else if(c.st===CIV.FOLLOW){ set = c.mv ? "walk" : "idle"; n = Math.floor(T/(c.mv ? 110 : 180)); }
  else if(c.st===CIV.IDLE){ set = c.danger ? "hurt" : "idle"; n = c.danger ? 0 : Math.floor(T/200); loop = !c.danger; }
  if(c.hitT > 0) a *= 0.6 + 0.4*Math.sin(T/30);
  _cmAtlasFrame(key, set, n, c.x, c.y, h, c.fx < 0, a, loop);
}
function cmDrawEnemyBody(e){
  if(!cmS) return false;
  if(e.cmRoof) return true;                         // en el tejado: se dibuja en drawTop (encima de los techos)
  if(e.type==="cm_cometa"){   // cometa del Gran Número: bola de fuego con estela y la línea hacia su blanco
    const t = animNow/1000;
    ctx.save(); ctx.strokeStyle = "rgba(255,140,60,0.35)"; ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t*40;
    ctx.beginPath(); ctx.moveTo(e.x, e.y - 20); ctx.lineTo(e.gnTx, e.gnTy); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    _cmGlow(e.x, e.y - 24, 90, "255,120,40", 0.55 + 0.15*Math.sin(t*14));
    for(let k=1;k<5;k++) _cmGlow(e.x - (e.fx||0)*k*18, e.y - 24 - (e.fy||0)*k*18, 40 - k*6, "255,90,20", 0.35 - k*0.06);
    _cmFx("cmFire", ((t*12)|0) % 4, e.x, e.y + 6, 70, 1, 1);
    _cmFx("cmPreBolt", ((t*10)|0) % 3, e.x, e.y - 24, 46, 0.9, 0.5);
    return true;
  }
  if(e.type==="cm_espejismo"){ ctx.save(); ctx.globalAlpha = 0.55 + 0.15*Math.sin(animNow/120); const r = drawEnemyAtlasPack(Object.assign({}, e, {type:"cm_dama"})); ctx.restore(); return r; }
  if(e.type==="cm_espectro"){ ctx.save(); ctx.globalAlpha = 0.75; ctx.globalCompositeOperation = "lighter"; const r = drawEnemyAtlasPack(e); ctx.restore(); _cmGlow(e.x, e.y - 30, 50, "120,190,255", 0.18); return r; }
  if(e.type==="cm_raptor"){
    const c = cmS.civ.find(o=>o.st===CIV.KIDNAPPED && o.by===e.cmId);
    const r = drawEnemyAtlasPack(e);
    if(c && !(ENEMY_ATLAS_PACK.cm_raptor && ENEMY_ATLAS_PACK.cm_raptor.sets.carry)) _cmAtlasFrame(_cmCivKey(c), "fall", 1, e.x + (e.fx < 0 ? -12 : 12), e.y - 26, 40, e.fx < 0, 1, false);
    return r;
  }
  return false;
}

/* ---------------- encima de todo (mundo) ---------------- */
function cmDrawTop(){
  if(!cmS || !player) return;
  const t = animNow/1000, V = _cmView();
  // Gran Número DESVIADO: vuelve volando contra el Presentador
  for(const R of (cmS.refl||[])){ _cmGlow(R.x, R.y, 70, "255,220,120", 0.7); _cmFx("cmPreBolt", ((t*12)|0) % 3, R.x, R.y, 50, 1, 0.5); }
  // Acechantes en los tejados
  for(const e of enemies){
    if(!e.alive || !e.cmRoof) continue;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(e.x, e.y - CM_WALL_H + 4, 18, 7, 0, 0, Math.PI*2); ctx.fill();
    _cmAtlasFrame("cm_acechante", "idle", Math.floor(animNow/200), e.x, e.y - CM_WALL_H, e.radius*2.8, e.fx < 0, 1);
    _cmGlow(e.x, e.y - CM_WALL_H - 30, 30, "255,60,60", 0.3 + 0.2*Math.sin(t*10));
  }
  // proyectiles propios
  for(const s of cmS.shots){
    const key = s.k==="tear" ? "cmTearSeq" : s.k==="pre" ? "cmPreBolt" : s.k==="prop" ? "cmScenery" : s.k==="dama" ? "cmDamaBolt" : "cmPreBolt";
    _cmGlow(s.x, s.y, 30, s.k==="tear" ? "255,60,80" : s.k==="prop" ? "255,160,80" : "255,60,110", 0.45);
    _cmFx(key, ((s.t/90)|0) % 4, s.x, s.y, s.k==="prop" ? 50 : 34, 1, 0.5);
  }
  // civiles: pistas y avisos
  for(const c of cmS.civ){
    if(!_cmVis(V, c.x - 60, c.y - 120, c.x + 60, c.y + 20)) continue;
    const hh = c.k===2 ? 40 : 52;
    if(c.st===CIV.HIDDEN && c.cue){
      const bob = Math.sin(t*4 + c.id)*3;
      ctx.save(); ctx.fillStyle = "rgba(20,30,20,0.7)"; ctx.beginPath(); ctx.arc(c.x, c.y - hh - 18 + bob, 13, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#bfffcf"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText("?", c.x, c.y - hh - 12 + bob);
      if(Math.random() < 0.01){ floatText(c.x, c.y - hh - 30, "*snif*", "heal"); playSfx("cmSob"); }
      ctx.restore();
    }
    if((c.warn||0) > 0 || c.st===CIV.KIDNAPPED){
      const x = c.st===CIV.KIDNAPPED ? c.x : c.x, y = c.st===CIV.KIDNAPPED ? c.y - 70 : c.y - hh - 16;
      ctx.save(); ctx.fillStyle = Math.sin(t*16) > 0 ? "#ff3040" : "#ffd0d0"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", x, y); ctx.restore();
    }
    if(c.st===CIV.IDLE){
      const T = cmS.ctx.find(q=>q.cid===c.id), q = T ? (T.prog||0)/T.dur : 0;
      ctx.save(); ctx.strokeStyle = "rgba(160,255,180,0.85)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y - hh - 12, 11, 0, Math.PI*2); ctx.stroke();
      if(q > 0){ ctx.strokeStyle = "#9dffb0"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y - hh - 12, 11, -Math.PI/2, -Math.PI/2 + q*Math.PI*2); ctx.stroke(); }
      ctx.fillStyle = "#9dffb0"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("🧍", c.x, c.y - hh - 8); ctx.restore();
    }
    if(c.st===CIV.FOLLOW){ const h = heroes[c.lead]; if(h && h.alive){ ctx.save(); ctx.strokeStyle = "rgba(160,255,180,0.18)"; ctx.setLineDash([4, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x, c.y - 10); ctx.lineTo(h.x, h.y - 10); ctx.stroke(); ctx.restore(); } }
  }
  // barras de vida de las estructuras (cuando están dañadas o bajo ataque)
  CM_STRUCTS.forEach((s, i)=>{
    const S = cmS.st[i]; if(S.st===CM_ST.DESTROYED || (S.hp >= S.max && S.hit <= 0)) return;
    const b = s.b ? CM_BLD[s.b] : null, x = s.cx, y = b ? b.y0 - CM_WALL_H*(b.kind==="torre" ? 1.9 : 1) - 26 : s.gate.y0 - 180;
    if(!_cmVis(V, x - 80, y - 20, x + 80, y + 20)) return;
    const w = 110, f = S.hp/S.max, col = S.st===CM_ST.INTACT ? "#7dffa0" : S.st===CM_ST.DAMAGED ? "#ffd24a" : "#ff5a3a";
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(x - w/2 - 2, y - 2, w + 4, 10); ctx.fillStyle = col; ctx.fillRect(x - w/2, y, w*f, 6);
    ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(`${s.name} · ${CM_ST_NAME[S.st]}`, x, y - 6); ctx.restore();
  });
}

/* ---------------- pantalla: HUD de rescate, alertas, minimapa, apagón ---------------- */
function cmDrawScreen(){
  if(!cmS || !player) return;
  const t = animNow/1000;
  ctx.save();
  // apagón / Acto III: oscuridad con un agujero de luz alrededor del jugador (y del reflector)
  if(cmS.dark > 0.01){
    const p = worldToScreen(player.x, player.y - 30);
    const g = ctx.createRadialGradient(p.x, p.y, 60, p.x, p.y, Math.max(VW, VH)*0.55);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.35, `rgba(4,0,6,${cmS.dark*0.55})`); g.addColorStop(1, `rgba(4,0,6,${cmS.dark})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  // panel de rescate (arriba al centro)
  const kid = cmS.civ.filter(c=>c.st===CIV.KIDNAPPED).length, danger = cmS.civ.filter(c=>cmCivFree(c) && (c.danger || c.st===CIV.RUN)).length + kid;
  const follow = cmS.civ.filter(c=>c.st===CIV.FOLLOW).length;
  const txt = `🧍 Rescatados ${cmS.saved}  ·  ✝ Perdidos ${cmS.lost}  ·  ⚠ En peligro ${danger}${follow ? `  ·  ↪ Te siguen ${follow}` : ""}`;
  ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
  const bossUp = (bossActive && boss && boss.alive) || (activeChampion && activeChampion.alive) || cmS.sub.st==="fight1";
  const tw = ctx.measureText(txt).width + 24, px = VW/2, py = Math.max(52, VH*0.085) + (bossUp ? 40 : 0);
  ctx.fillStyle = "rgba(10,4,8,0.72)"; ctx.fillRect(px - tw/2, py - 16, tw, 24);
  ctx.strokeStyle = danger ? `rgba(255,90,70,${0.5 + 0.4*Math.sin(t*6)})` : "rgba(150,255,170,0.35)"; ctx.lineWidth = 1.5; ctx.strokeRect(px - tw/2, py - 16, tw, 24);
  ctx.fillStyle = "#f2e6dc"; ctx.fillText(txt, px, py);
  // estructuras: fila de íconos con color por estado
  let sx = px - (CM_STRUCTS.length*26)/2 + 13;
  CM_STRUCTS.forEach((s, i)=>{ const S = cmS.st[i], col = ["#7dffa0", "#ffd24a", "#ff5a3a", "#555"][S.st]; ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(sx - 11, py + 12, 22, 16); ctx.fillStyle = col; ctx.font = "12px sans-serif"; ctx.fillText(s.id==="puerta" ? "⛩" : s.id==="torre" ? "🗼" : s.id==="capilla" ? "⛪" : "🏠", sx, py + 25); if(S.hit > 0){ ctx.strokeStyle = "#ff5a3a"; ctx.strokeRect(sx - 11, py + 12, 22, 16); } sx += 26; });
  // alertas prioritarias con flecha hacia su lugar
  // como mucho 2 a la vez (1 si el Hechicero está hablando), primero las urgentes (secuestro, muerte) y
  // después las más nuevas: a los 2-3 minutos se juntaban tutorial + 4 alertas + carteles en un teléfono chico
  let ay = py + 50;
  const tutOn = typeof TUT!=="undefined" && !!TUT.key;
  const _pri = k=>k==="kid" || k==="grab" || k==="lost" ? 0 : 1;
  const shown = cmS.alerts.filter(A=>A.t <= A.d).sort((a, b)=>_pri(a.k) - _pri(b.k) || a.t - b.t).slice(0, tutOn ? 1 : 2);
  for(const A of shown){
    const a = Math.min(1, (A.d - A.t)/400);
    const col = A.k==="lost" ? "255,110,90" : A.k==="bell" || A.k==="kid" || A.k==="grab" ? "255,170,60" : A.k==="run" ? "255,220,120" : "255,120,90";
    ctx.globalAlpha = a; ctx.font = "bold 12px sans-serif";
    const w = ctx.measureText(A.txt).width + 34;
    ctx.fillStyle = `rgba(20,6,6,0.75)`; ctx.fillRect(px - w/2, ay - 13, w, 20);
    ctx.fillStyle = `rgb(${col})`; ctx.fillText(A.txt, px + 8, ay + 2);
    const sp = worldToScreen(A.x, A.y), ang = Math.atan2(sp.y - (ay - 3), sp.x - (px - w/2 + 12));
    ctx.save(); ctx.translate(px - w/2 + 12, ay - 3); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    ay += 24;
  }
  ctx.globalAlpha = 1;
  // nivel 9: dos barras de vida (Maestro + Tramoyista juntos)
  if(cmS.sub.st==="fight1"){
    const L = ["cm_maestro", "cm_tramoyista"].map(k=>cmEnt(k)).filter(Boolean);
    L.forEach((e, k)=>{ const w = Math.min(260, VW*0.38), x = VW/2 - w/2, y = 26 + k*24; ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(x - 2, y - 2, w + 4, 14); ctx.fillStyle = k ? "#e0904a" : "#e04a6a"; ctx.fillRect(x, y, w*Math.max(0, e.hp/e.maxHp), 10); ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left"; ctx.fillText(e.name + (e._rage ? " · FURIA" : ""), x, y - 4); });
  }
  ctx.restore();
  if(!player.duelActive) _cmMinimap();
}
function _cmMinimap(){
  const B = CM_BOUNDS, W = Math.min(150, VW*0.26), k = W/(B.x1 - B.x0), Hh = (B.y1 - B.y0)*k;
  const X = VW - W - 12, Y = Math.max(70, VH*0.16), tx = x=>X + (x - B.x0)*k, ty = y=>Y + (y - B.y0)*k;
  const tower = cmS.st[cmStructIdx("torre")].st!==CM_ST.DESTROYED, blink = Math.sin(animNow/110) > 0;
  ctx.save(); ctx.globalAlpha = 0.88;
  ctx.fillStyle = "rgba(10,4,8,0.75)"; ctx.fillRect(X - 3, Y - 3, W + 6, Hh + 6); ctx.strokeStyle = "rgba(200,120,110,0.5)"; ctx.strokeRect(X - 3, Y - 3, W + 6, Hh + 6);
  for(const b of CM_BUILDINGS){ const st = _cmStructOf(b); ctx.fillStyle = st ? ["#3f7a52", "#8a7a3a", "#9a4a2a", "#3a2a2a"][st.S.st] : "#3a3040"; ctx.fillRect(tx(b.x0), ty(b.y0), (b.x1 - b.x0)*k, (b.y1 - b.y0)*k); }
  for(const z of CM_SAFE){ const S = cmS.st[cmStructIdx(z.id)]; if(S.st===CM_ST.DESTROYED) continue; ctx.fillStyle = "#7dffa0"; ctx.beginPath(); ctx.arc(tx(z.x), ty(z.y), 3, 0, Math.PI*2); ctx.fill(); }
  for(const c of cmS.civ){
    if(c.st===CIV.HIDDEN){ if(tower && c.cue!==undefined){ ctx.fillStyle = "rgba(190,255,200,0.35)"; ctx.fillRect(tx(c.x) - 1, ty(c.y) - 1, 2, 2); } continue; }
    if(!cmCivAlive(c)) continue;
    ctx.fillStyle = c.st===CIV.KIDNAPPED ? (blink ? "#ff3040" : "#fff") : c.danger || c.st===CIV.RUN ? "#ffd24a" : "#bfffcf";
    ctx.fillRect(tx(c.x) - 1.5, ty(c.y) - 1.5, 3, 3);
  }
  for(const e of enemies){ if(!e.alive) continue; if(e.rank==="subjefe" || e.rank==="jefe"){ ctx.fillStyle = "#ff4a8a"; ctx.fillRect(tx(e.x) - 3, ty(e.y) - 3, 6, 6); } else if(e.type==="cm_raptor" || e.type==="cm_campanero" || e.type==="cm_verdugo"){ ctx.fillStyle = "#ffa050"; ctx.fillRect(tx(e.x) - 1.5, ty(e.y) - 1.5, 3, 3); } }
  heroes.forEach((h, i)=>{ ctx.fillStyle = h===player ? "#ffffff" : (h.alive ? (["#4ad0ff","#8effb4","#ffd24a","#ff8ad8"][i%4]) : "#777"); ctx.beginPath(); ctx.arc(tx(h.x), ty(h.y), h===player ? 3 : 2.4, 0, Math.PI*2); ctx.fill(); });
  ctx.restore();
}
