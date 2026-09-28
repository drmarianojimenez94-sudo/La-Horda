"use strict";
/* ============================================================
   js/arenas/minas/mn-render.js
   MINAS PROFUNDAS — dibujo. Arte de las hojas oficiales (tools/art/minas/extract.py): suelo y roca
   (MINAS_TEX), faroles, cristales, núcleo de luz, andamios, rieles y puerta (MINAS_PIECES), efectos
   (MINAS_FX) y los atlas de los enemigos.
     - cada sector tiene su suelo, tono y utilería: la mina humana (madera, rieles, faroles) se vuelve
       cristal, corrupción violeta y, al final, roca negra con fisuras de fuego (mnS.hell)
     - roca maciza en vista oblicua (cara frontal + techo desplazado), columnas y escombros del Titán
     - luces con estado (encendida / parpadea / apagada) y aviso cuando el Devoraluz o un Consumidor
       van por ellas
     - MÁSCARA DE OSCURIDAD encima de las entidades; ENCIMA de ella: avisos de ataque, proyectiles,
       ojos de los enemigos en la sombra y el lanzallamas (la lectura del peligro nunca se pierde)
     - la puerta del Umbral, las cadenas de Cerbero y el PORTAL INFERNAL (pixel art procedural)
     - HUD: luces encendidas, "a oscuras", objetivo, alertas con flecha, minimapa y el descenso
   ============================================================ */
const MN_IMG = {}, MN_OK = {}, MN_PAT = {}, MN_TINT = {};
function _mnImg(key, src){ if(MN_IMG[key]) return MN_IMG[key]; const im = new Image(); im.onload = ()=>{ MN_OK[key] = true; }; im.src = src; MN_IMG[key] = im; return im; }
(function mnLoadArt(){
  if(typeof MINAS_TEX!=="undefined") for(const k in MINAS_TEX) _mnImg(k, MINAS_TEX[k]);
  if(typeof MINAS_PIECES!=="undefined") for(const k in MINAS_PIECES) MINAS_PIECES[k].forEach((s, i)=>_mnImg(k + "_" + i, s));
  // hoja de ASSETS ADICIONALES (tools/art/minas/extract_extra.py): piso de tierra, roca, props, luces, portal, cadenas
  if(typeof MINAS_EXTRA!=="undefined"){
    for(const k in MINAS_EXTRA.tex) _mnImg(k, MINAS_EXTRA.tex[k]);
    for(const k in MINAS_EXTRA.props) _mnImg("x_" + k, MINAS_EXTRA.props[k]);
    MINAS_EXTRA.portal.forEach((s, i)=>_mnImg("portal_" + i, s));
    for(const k in MINAS_EXTRA.chains) MINAS_EXTRA.chains[k].forEach((s, i)=>_mnImg(k + "_" + i, s));
  }
})();
function _mnRockTex(){ return MN_OK.tex_roca_mina ? "tex_roca_mina" : "tex_roca"; }
function _mnFloorTex(S){ const k = "tex_tierra_" + S.id; return MN_OK[k] ? k : S.floor; }
// UTILERÍA SUELTA por sector (solo decorado, sin colisión): vagonetas, cajas, barriles, herramientas, cristales,
// vetas y MONTONES DE ROCA por toda la mina. Posiciones fijas por sector (hash), lejos de luces, entrada, salida y
// rieles; las piezas grandes (rocas, cubos, estalagmitas) van pegadas a las paredes y a las masas de roca.
const MN_DECO_H = {vagoneta:78, caja:58, barril:44, balde:30, carbon:36, cubo_piedra:78, caja_chica:40, caja_rota:48, estalagmitas:92,
  estacas:58, herramientas:34, piedras:58, viga:112, cristales_azules:70, cristales_rojos:70, veta_gris:56, veta_roja:52, veta_piedras:60,
  veta_brasa:60, veta_violeta:66, rocas_cristal:70, rocas_grandes:92, cristal_roto:54};
const MN_DECO_BIG = {cubo_piedra:1, estalagmitas:1, rocas_grandes:1, piedras:1, rocas_cristal:1, viga:1};
const MN_DECO_POOL = [
  ["vagoneta","caja","barril","balde","caja_chica","carbon","herramientas","viga","piedras","piedras","rocas_grandes","cubo_piedra"],
  ["vagoneta","caja_rota","barril","carbon","cubo_piedra","estacas","herramientas","piedras","piedras","rocas_grandes","caja"],
  ["cristales_azules","veta_gris","rocas_cristal","piedras","estalagmitas","rocas_grandes","veta_piedras","cristales_azules"],
  ["veta_violeta","cristal_roto","estalagmitas","rocas_grandes","estacas","piedras","veta_piedras","veta_violeta"],
  ["veta_brasa","veta_roja","cristales_rojos","rocas_grandes","estalagmitas","cubo_piedra","piedras","veta_piedras"],
  ["veta_brasa","cristales_rojos","estalagmitas","rocas_grandes","piedras","veta_roja","veta_brasa"]];
const _MN_DECO = {};
function _mnDecoFor(sec){
  if(_MN_DECO[sec]) return _MN_DECO[sec];
  const S = MN_SECTORS[sec], B = MN_BOUNDS, out = [], pool = MN_DECO_POOL[sec] || MN_DECO_POOL[0];
  const rocks = S.gate ? S.rocks.concat([{x0:-420, y0:-760, x1:420, y1:-580}]) : S.rocks;
  const rockD = (x, y)=>{ let d = Infinity; for(const r of rocks){ const dx = Math.max(r.x0 - x, 0, x - r.x1), dy = Math.max(r.y0 - y, 0, y - r.y1); d = Math.min(d, Math.hypot(dx, dy)); } return d; };
  const railD = (x, y)=>{ let d = Infinity; for(const R of S.rails){ for(let i=0;i+3<R.length;i+=2){ const ax = R[i], ay = R[i+1], bx = R[i+2], by = R[i+3], vx = bx - ax, vy = by - ay, l2 = vx*vx + vy*vy || 1;
    const q = Math.max(0, Math.min(1, ((x - ax)*vx + (y - ay)*vy)/l2)); d = Math.min(d, Math.hypot(x - ax - vx*q, y - ay - vy*q)); } } return d; };
  for(let i=0;i<220 && out.length < 22;i++){
    const x = B.x0 + 60 + _mnHash(i, 400 + sec)*(B.x1 - B.x0 - 120), y = B.y0 + 70 + _mnHash(i, 500 + sec)*(B.y1 - B.y0 - 130);
    const rd = rockD(x, y), edge = Math.min(x - B.x0, B.x1 - x, y - B.y0, B.y1 - y);
    if(rd < 26) continue;
    if(S.pillars.some(p=>Math.hypot(p.x - x, p.y - y) < p.r + 50)) continue;
    if(S.lights.some(L=>Math.hypot(L.x - x, L.y - y) < 95)) continue;
    if(S.props.some(q=>Math.hypot(q.x - x, q.y - y) < 90)) continue;
    if(Math.hypot(S.entry.x - x, S.entry.y - y) < 220 || (S.exit && Math.hypot(S.exit.x - x, S.exit.y - y) < 170)) continue;
    if(railD(x, y) < 40) continue;
    if(S.gate && y < -250 && Math.abs(x) < 520) continue;              // frente de la puerta del Umbral: libre para pelear
    if(out.some(o=>Math.hypot(o.x - x, o.y - y) < 110)) continue;
    const nearWall = rd < 150 || edge < 170;
    let k = pool[Math.floor(_mnHash(i, 600 + sec)*pool.length)];
    if(MN_DECO_BIG[k] && !nearWall) k = ["piedras","herramientas","balde","carbon","veta_piedras"].find(q=>pool.includes(q)) || "piedras";
    if(!nearWall && _mnHash(i, 700 + sec) < 0.35) continue;             // el centro queda más despejado
    out.push({k, x, y, h:MN_DECO_H[k]*(0.85 + _mnHash(i, 800 + sec)*0.3), f:_mnHash(i, 900 + sec) < 0.5});
  }
  return (_MN_DECO[sec] = out);
}
function _mnPat(key, sc){
  const id = key + "@" + (sc||2);
  if(MN_PAT[id]) return MN_PAT[id];
  if(!MN_OK[key]) return null;
  const p = ctx.createPattern(MN_IMG[key], "repeat");
  if(p && p.setTransform && typeof DOMMatrix!=="undefined") p.setTransform(new DOMMatrix().scale(sc||2));
  MN_PAT[id] = p; return p;
}
function _mnFillPat(key, sc, fallback, x, y, w, h, alpha){
  const p = _mnPat(key, sc);
  ctx.save(); if(alpha!==undefined) ctx.globalAlpha *= alpha;
  ctx.fillStyle = p || fallback; ctx.fillRect(x, y, w, h); ctx.restore();
}
// versión teñida/oscurecida de una pieza (apagada, corrompida), cacheada en un canvas
function _mnTinted(key, rgba){
  const id = key + "|" + rgba; if(MN_TINT[id]) return MN_TINT[id];
  if(!MN_OK[key]) return null;
  const im = MN_IMG[key], c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const g = c.getContext("2d"); g.drawImage(im, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = rgba; g.fillRect(0, 0, c.width, c.height);
  MN_TINT[id] = c; return c;
}
function _mnPiece(key, x, y, h, alpha, flip, anchorY, tint){
  const src = tint ? _mnTinted(key, tint) : (MN_OK[key] ? MN_IMG[key] : null); if(!src) return false;
  const s = h/src.height, w = src.width*s;
  ctx.save(); ctx.imageSmoothingEnabled = false; if(alpha!==undefined) ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(x), Math.round(y)); if(flip) ctx.scale(-1, 1);
  ctx.drawImage(src, -w/2, -h*(anchorY===undefined ? 1 : anchorY), w, h); ctx.restore();
  return true;
}
function _mnGlow(x, y, r, rgb, a){ if(a <= 0.01) return; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(rgb), x - r, y - r, r*2, r*2); ctx.restore(); }
function _mnAtlasFrame(type, set, n, x, y, h, flip, alpha, loop){
  const P = ENEMY_ATLAS_PACK[type]; if(!P || !P.ready) return false;
  const arr = P.sets[set] || P.sets.idle; if(!arr || !arr.length) return false;
  const v = loop===false ? arr[Math.min(arr.length - 1, Math.max(0, n))] : arr[((n % arr.length) + arr.length) % arr.length];
  const s = h/P.refH;
  drawAnimFrameSized(P.atlas, {frames:[{x:(v % P.cols)*P.fw, y:Math.floor(v/P.cols)*P.fh, w:P.fw, h:P.fh}]}, 0, Math.round(x), Math.round(y), P.fw*s, P.fh*s, 0.5, P.anchor, flip, alpha);
  return true;
}
function _mnFxImg(key, i){ const F = typeof MINAS_FX!=="undefined" && MINAS_FX[key]; if(!F) return null; const src = F.srcs[Math.min(F.srcs.length - 1, Math.max(0, i|0))]; const k = "fx:" + src; _mnImg(k, src); return MN_OK[k] ? k : null; }
function _mnFx(key, i, x, y, h, alpha, anchorY){ const k = _mnFxImg(key, i); if(k) _mnPiece(k, x, y, h, alpha, false, anchorY===undefined ? 0.5 : anchorY); }
function _mnView(){ const R = mnViewRect(); return {x0:R.x - 80, x1:R.x + R.w + 80, y0:R.y - 140, y1:R.y + R.h + 120}; }
function _mnVis(V, x0, y0, x1, y1){ return !(x1 < V.x0 || x0 > V.x1 || y1 < V.y0 || y0 > V.y1); }
function _mnHash(i, k){ let h = (i*374761393 + k*668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0)/4294967296; }
function mnRenderReset(){ _mnDeadAt = 0; _mnLastAct = 0; _mnChainBreakAt = -1e9; }
function mnRenderTick(dt){}

/* ---------------- piso ---------------- */
function mnDrawWorld(now){
  if(!mnS || !player) return;
  const V = _mnView(), B = MN_BOUNDS, S = mnSector(), t = now;
  ctx.imageSmoothingEnabled = false;
  // fuera de la sala: roca maciza de la mina (nunca un vacío negro)
  _mnFillPat(_mnRockTex(), 2, "#1a1412", V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100);
  ctx.fillStyle = `rgba(${S.tone},0.35)`; ctx.fillRect(V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100);
  ctx.fillStyle = "rgba(0,0,0,0.62)"; ctx.fillRect(V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100);
  const ix0 = Math.max(B.x0, V.x0), iy0 = Math.max(B.y0, V.y0), ix1 = Math.min(B.x1, V.x1), iy1 = Math.min(B.y1, V.y1);
  if(ix1 > ix0 && iy1 > iy0){
    _mnFillPat(_mnFloorTex(S), 2, "#2a2018", ix0, iy0, ix1 - ix0, iy1 - iy0);
    ctx.fillStyle = `rgba(${S.tone},${MN_OK["tex_tierra_" + S.id] ? 0.16 : 0.42})`; ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    if(mnS.hell > 0){ ctx.fillStyle = `rgba(90,14,4,${0.22*mnS.hell})`; ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0); }
    // borde de la sala: sombra interior contra la roca
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 18; ctx.strokeRect(B.x0 + 9, B.y0 + 9, B.x1 - B.x0 - 18, B.y1 - B.y0 - 18);
  }
  // manchas y piedras sueltas (siempre en el mismo lugar: hash por sector)
  for(let i=0;i<40;i++){ const x = B.x0 + _mnHash(i, 11 + mnS.sec)*(B.x1 - B.x0), y = B.y0 + _mnHash(i, 21 + mnS.sec)*(B.y1 - B.y0); if(!_mnVis(V, x - 40, y - 30, x + 40, y + 30)) continue;
    ctx.fillStyle = i % 3 ? "rgba(0,0,0,0.28)" : `rgba(${S.tone},0.35)`; ctx.beginPath(); ctx.ellipse(x, y, 16 + _mnHash(i, 3)*36, 8 + _mnHash(i, 4)*14, 0, 0, Math.PI*2); ctx.fill(); }
  // rieles
  for(const R of S.rails){ _mnDrawRail(R, V); }
  // fisuras de fuego (el infierno se acerca): más y más brillantes con mnS.hell
  if(mnS.hell > 0.05) _mnDrawCracks(V, t);
  // Umbral: círculo de runas frente a la puerta
  if(mnS.sec===5){
    const G = S.portal, a = 0.25 + 0.15*Math.sin(t*2) + (mnS.cb.act >= 3 || mnS.portal.st!=="none" ? 0.35 : 0);
    ctx.save(); ctx.strokeStyle = `rgba(255,70,30,${a})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t*18;
    ctx.beginPath(); ctx.ellipse(G.x, G.y + 150, 330, 110, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    _mnGlow(G.x, G.y + 150, 300, "255,60,20", a*0.35);
  }
  // salida (pozo con escalera) y jaula del montacargas
  if(S.exit) _mnDrawShaft(S.exit, t);
  _mnDrawCage(S.entry, t);
  // resplandor de las luces en el piso
  for(const L of mnS.lights){ const a = mnLightInt(L); if(a <= 0 || !_mnVis(V, L.x - L.r, L.y - L.r, L.x + L.r, L.y + L.r)) continue; _mnGlow(L.x, L.y, L.r*0.8, _mnLightRgb(L), a*0.18); }
  // zonas de oscuridad (Escupidor) y fuego en el piso
  for(const Z of mnS.zones){ if(!_mnVis(V, Z.x - Z.r, Z.y - Z.r, Z.x + Z.r, Z.y + Z.r)) continue; const a = Math.min(1, Z.t/300, (Z.d - Z.t)/500);
    ctx.save(); ctx.fillStyle = `rgba(20,0,30,${0.5*a})`; ctx.beginPath(); ctx.ellipse(Z.x, Z.y, Z.r, Z.r*0.7, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(190,90,255,${0.55*a})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = t*10; ctx.stroke(); ctx.restore();
    _mnFx("mnDarkZone", 2 + ((t*6)|0) % 4, Z.x, Z.y, Z.r*1.1, 0.8*a, 0.6); }
  for(const F of mnS.fire){ if(!_mnVis(V, F.x - 80, F.y - 80, F.x + 80, F.y + 80)) continue; const a = Math.min(1, (F.d - F.t)/600);
    _mnGlow(F.x, F.y, F.r*1.6, "255,110,30", 0.4*a); _mnFx("mnHowl", ((t*10 + F.x)|0) % 5, F.x, F.y + 10, F.r*1.4, 0.8*a, 1); }
}
function _mnLightRgb(L){ return L.k==="cristal" || L.k==="nucleo" ? "120,180,255" : mnS.sec===5 ? "255,120,50" : "255,170,80"; }
function _mnDrawRail(R, V){
  ctx.save();
  for(let i=0;i+3<R.length;i+=2){
    const x0 = R[i], y0 = R[i + 1], x1 = R[i + 2], y1 = R[i + 3], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy)||1, nx = -dy/L, ny = dx/L;
    if(!_mnVis(V, Math.min(x0, x1) - 30, Math.min(y0, y1) - 30, Math.max(x0, x1) + 30, Math.max(y0, y1) + 30)) continue;
    ctx.strokeStyle = "#3a2414"; ctx.lineWidth = 5;
    for(let s=0;s<L;s+=26){ const x = x0 + dx/L*s, y = y0 + dy/L*s; ctx.beginPath(); ctx.moveTo(x + nx*18, y + ny*18); ctx.lineTo(x - nx*18, y - ny*18); ctx.stroke(); }
    ctx.strokeStyle = "#6a6a70"; ctx.lineWidth = 3;
    for(const o of [-11, 11]){ ctx.beginPath(); ctx.moveTo(x0 + nx*o, y0 + ny*o); ctx.lineTo(x1 + nx*o, y1 + ny*o); ctx.stroke(); }
  }
  ctx.restore();
}
function _mnDrawCracks(V, t){
  const n = 26, a = mnS.hell;
  ctx.save(); ctx.lineCap = "round";
  for(let i=0;i<n;i++){
    const x = MN_BOUNDS.x0 + _mnHash(i, 71)*(MN_BOUNDS.x1 - MN_BOUNDS.x0), y = MN_BOUNDS.y0 + _mnHash(i, 73)*(MN_BOUNDS.y1 - MN_BOUNDS.y0);
    if(!_mnVis(V, x - 80, y - 60, x + 80, y + 60) || !mnInside(x, y, 10)) continue;
    const pul = 0.55 + 0.45*Math.sin(t*2 + i);
    ctx.strokeStyle = `rgba(20,4,2,${0.8*a})`; ctx.lineWidth = 7; ctx.beginPath();
    let px = x, py = y; ctx.moveTo(px, py);
    for(let k=0;k<4;k++){ px += (_mnHash(i, k + 80) - 0.5)*70; py += (_mnHash(i, k + 90) - 0.5)*40; ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,${90 + 60*pul|0},30,${0.75*a*pul})`; ctx.lineWidth = 2.5; ctx.stroke();
    if(i % 3===0) _mnGlow(x, y, 50, "255,80,20", 0.22*a*pul);
  }
  ctx.restore();
}
function _mnDrawShaft(E, t){
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.beginPath(); ctx.ellipse(E.x, E.y, 90, 44, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#4a3a2a"; ctx.lineWidth = 6; ctx.stroke();
  // escalera que baja
  ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 3;
  for(let k=0;k<5;k++){ const y = E.y - 26 + k*12; ctx.beginPath(); ctx.moveTo(E.x - 26 + k*2, y); ctx.lineTo(E.x + 26 - k*2, y); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,200,120,0.55)"; ctx.font = pxFont(12); ctx.textAlign = "center"; ctx.fillText("▼ BAJADA", E.x, E.y - 54);
  ctx.restore();
}
function _mnDrawCage(E, t){
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(E.x - 80, E.y - 30, 160, 70);
  ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 4; ctx.strokeRect(E.x - 80, E.y - 30, 160, 70);
  ctx.strokeStyle = "rgba(120,110,100,0.6)"; ctx.lineWidth = 2;
  for(let k=1;k<6;k++){ ctx.beginPath(); ctx.moveTo(E.x - 80 + k*27, E.y - 30); ctx.lineTo(E.x - 80 + k*27, E.y + 40); ctx.stroke(); }
  ctx.restore();
}

/* ---------------- piezas altas (ordenadas por profundidad) ---------------- */
function mnPushTall(){
  if(!mnS) return;
  const V = _mnView(), S = mnSector();
  for(const r of mnRocksNow()){ if(_mnVis(V, r.x0 - 10, r.y0 - MN_ROCK_H - 20, r.x1 + 10, r.y1 + 10)) _entPush(r.y1, null, null, null, {arena:1, mn:"rock", r}); }
  for(const p of S.pillars){ if(_mnVis(V, p.x - p.r - 30, p.y - p.r*3, p.x + p.r + 30, p.y + p.r)) _entPush(p.y + p.r*0.3, null, null, null, {arena:1, mn:"pillar", p}); }
  for(const p of S.props){ if(_mnVis(V, p.x - 80, p.y - 140, p.x + 80, p.y + 30)) _entPush(p.y, null, null, null, {arena:1, mn:"prop", p}); }
  for(const d of _mnDecoFor(mnS.sec)){ if(_mnVis(V, d.x - 70, d.y - d.h - 20, d.x + 70, d.y + 20)) _entPush(d.y, null, null, null, {arena:1, mn:"deco", d}); }
  for(const L of mnS.lights){ if(_mnVis(V, L.x - 60, L.y - 150, L.x + 60, L.y + 30)) _entPush(L.y, null, null, null, {arena:1, mn:"light", L}); }
  for(const R of mnS.rubble){ if(R.t >= 0 && _mnVis(V, R.x - 70, R.y - 90, R.x + 70, R.y + 30)) _entPush(R.y, null, null, null, {arena:1, mn:"rubble", R}); }
  if(S.gate && _mnVis(V, -460, -960, 460, -560)) _entPush(MN_GATE_Y, null, null, null, {arena:1, mn:"gate"});
  if(mnS.portal.st!=="none"){ const G = S.portal||MN_SECTORS[5].portal; _entPush(G.y + 20, null, null, null, {arena:1, mn:"portal"}); }
  if(mnS.cb.st==="dying" || mnS.cb.st==="dead"){ const P = mnS.cb; if(P.x!==undefined) _entPush(P.y, null, null, null, {arena:1, mn:"cdeath"}); }
}
function mnDrawTall(it, now){
  const t = now;
  switch(it.mn){
    case "rock": _mnDrawRock(it.r); break;
    case "pillar": _mnDrawPillar(it.p, t); break;
    case "prop": _mnDrawProp(it.p, t); break;
    case "deco": { const d = it.d; ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.beginPath(); ctx.ellipse(d.x, d.y + 2, d.h*0.42, d.h*0.13, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
      _mnPiece("x_" + d.k, d.x, d.y + 4, d.h, 1, d.f, 1, mnS.hell > 0.3 ? `rgba(90,20,6,${0.18*mnS.hell})` : null);
      if(d.k==="veta_brasa" || d.k==="cristales_rojos") _mnGlow(d.x, d.y - d.h*0.4, d.h, "255,80,30", 0.18 + 0.08*Math.sin(t*3 + d.x));
      else if(d.k==="cristales_azules" || d.k==="rocas_cristal") _mnGlow(d.x, d.y - d.h*0.4, d.h, "110,170,255", 0.16);
      else if(d.k==="veta_violeta" || d.k==="cristal_roto") _mnGlow(d.x, d.y - d.h*0.4, d.h, "190,80,255", 0.16);
      break; }
    case "light": _mnDrawLight(it.L, t); break;
    case "rubble": { const R = it.R, a = Math.min(1, (R.d - R.t)/500, R.t/150);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(R.x, R.y + 6, R.r + 10, R.r*0.45, 0, 0, Math.PI*2); ctx.fill();
      const pat = _mnPat(_mnRockTex(), 2); ctx.fillStyle = pat || "#4a3a30";
      ctx.beginPath(); ctx.moveTo(R.x - R.r, R.y + 4); ctx.lineTo(R.x - R.r*0.6, R.y - R.r*0.9); ctx.lineTo(R.x - R.r*0.1, R.y - R.r*1.3); ctx.lineTo(R.x + R.r*0.5, R.y - R.r); ctx.lineTo(R.x + R.r, R.y + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#1a120c"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "rgba(255,190,120,0.12)"; ctx.fill(); ctx.restore(); break; }
    case "gate": _mnDrawGate(t); break;
    case "portal": _mnDrawPortal(t); break;
    case "cdeath": { const P = mnS.cb, T = P.st==="dead" ? 99999 : (P.t||0), C = ENEMY_ATLAS_PACK.mn_cerbero;
      if(C && C.ready){ const arr = C.sets.death || C.sets.idle, n = Math.min(arr.length - 1, Math.floor(T/(MN_CFG.cerbero.deathMs*0.75/arr.length)));
        if(P.st==="dead" && !_mnDeadAt) _mnDeadAt = animNow;
        const fade = P.st==="dead" ? Math.max(0, 1 - (animNow - _mnDeadAt)/2500) : 1;
        if(fade > 0.02) _mnAtlasFrame("mn_cerbero", "death", n, P.x, P.y, 58*MN_HMUL.mn_cerbero, P.fx < 0, fade, false);
        if(P.st==="dead" && MN_OK.cadena_restos_0) _mnPiece("cadena_restos_0", P.x, P.y + 10, 46, Math.min(1, 1.2 - fade)); }
      break; }
  }
}
function _mnDrawRock(r){
  const H = MN_ROCK_H, S = mnSector(), w = r.x1 - r.x0, h = r.y1 - r.y0;
  ctx.save();
  // techo (desplazado hacia arriba) y cara frontal
  _mnFillPat(_mnRockTex(), 2, "#3a3030", r.x0, r.y0 - H, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(r.x0, r.y0 - H, w, h);
  ctx.fillStyle = S.rockTint; ctx.fillRect(r.x0, r.y0 - H, w, h);
  _mnFillPat(_mnRockTex(), 2, "#4a3a34", r.x0, r.y1 - H, w, H);
  const g = ctx.createLinearGradient(0, r.y1 - H, 0, r.y1); g.addColorStop(0, "rgba(255,210,160,0.10)"); g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g; ctx.fillRect(r.x0, r.y1 - H, w, H);
  if(mnS.hell > 0.2){ ctx.fillStyle = `rgba(255,60,10,${0.08*mnS.hell})`; ctx.fillRect(r.x0, r.y1 - H, w, H); }
  ctx.strokeStyle = "rgba(10,6,4,0.85)"; ctx.lineWidth = 3; ctx.strokeRect(r.x0 + 1, r.y0 - H + 1, w - 2, h + H - 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(r.x0, r.y1, w, 10);
  ctx.restore();
}
function _mnDrawPillar(p, t){
  const H = p.r*2.3, S = mnSector();
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, p.r*1.05, p.r*0.42, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(p.x - p.r, p.y); ctx.lineTo(p.x - p.r*0.8, p.y - H); ctx.quadraticCurveTo(p.x, p.y - H - p.r*0.4, p.x + p.r*0.8, p.y - H); ctx.lineTo(p.x + p.r, p.y); ctx.closePath();
  ctx.fillStyle = _mnPat(_mnRockTex(), 2) || "#4a3a34"; ctx.fill();
  const g = ctx.createLinearGradient(p.x - p.r, 0, p.x + p.r, 0); g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(0.45, "rgba(255,220,180,0.08)"); g.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = g; ctx.fill(); ctx.fillStyle = S.rockTint; ctx.fill();
  ctx.strokeStyle = "rgba(10,6,4,0.9)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  // vetas: cristales en las columnas de los sectores profundos (y apoyos de madera arriba)
  if(mnS.sec===2) _mnPiece(MN_OK.x_cristales_azules ? "x_cristales_azules" : "cristal_azul_0", p.x + p.r*0.35, p.y - H*0.3, p.r*1.1, 0.95);
  else if(mnS.sec===3) { if(!_mnPiece("x_veta_violeta", p.x - p.r*0.3, p.y - H*0.3, p.r*1.1, 0.95)) _mnPiece("cristal_azul_0", p.x - p.r*0.3, p.y - H*0.4, p.r*1.1, 0.95, false, 1, "rgba(170,40,220,0.55)"); }
  else if(mnS.sec >= 4) _mnPiece(MN_OK.x_cristales_rojos ? "x_cristales_rojos" : "cristal_rojo_0", p.x + p.r*0.3, p.y - H*0.25, p.r, 0.9);
  else if(mnS.sec <= 1){ ctx.save(); ctx.fillStyle = "#4a2e18"; ctx.fillRect(p.x - p.r - 4, p.y - H - 6, p.r*2 + 8, 10); ctx.fillRect(p.x - p.r - 2, p.y - H, 7, H); ctx.fillRect(p.x + p.r - 5, p.y - H, 7, H); ctx.restore(); }
}
function _mnDrawProp(p, t){
  switch(p.k){
    case "andamio": _mnPiece("andamio_0", p.x, p.y + 4, 120); break;
    case "riel": _mnPiece("riel_0", p.x, p.y + 4, 90); break;
    case "cristal_azul": _mnGlow(p.x, p.y - 40, 90, "120,180,255", 0.25); if(!_mnPiece("x_cristales_azules", p.x, p.y + 4, 78)) _mnPiece("cristal_azul_0", p.x, p.y + 4, 90); break;
    case "cristal_morado": _mnGlow(p.x, p.y - 40, 90, "190,80,255", 0.28); if(!_mnPiece("x_veta_violeta", p.x, p.y + 4, 74)) _mnPiece("cristal_azul_0", p.x, p.y + 4, 96, 1, false, 1, "rgba(170,40,220,0.55)"); break;
    case "cristal_inestable": { const a = 0.3 + 0.2*Math.sin(t*5 + p.x); _mnGlow(p.x, p.y - 40, 100, "255,60,40", a); _mnPiece("cristal_inestable_0", p.x, p.y + 6, 96); break; }
    case "estalactita": _mnPiece("estalactita_0", p.x, p.y + 4, 110); break;
    case "pozo": { const a = 0.3 + 0.15*Math.sin(t*3); _mnGlow(p.x, p.y - 10, 110, "170,60,255", a); _mnPiece("pozo_0", p.x, p.y + 30, 110); break; }
    case "carro": {
      ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 46, 14, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#3a2a1c"; ctx.fillRect(p.x - 38, p.y - 46, 76, 44); ctx.fillStyle = _mnPat("tex_roca", 1) || "#5a4a40"; ctx.fillRect(p.x - 34, p.y - 56, 68, 14);
      ctx.strokeStyle = "#6a6a70"; ctx.lineWidth = 3; ctx.strokeRect(p.x - 38, p.y - 46, 76, 44);
      ctx.fillStyle = "#1a1418"; for(const o of [-24, 24]){ ctx.beginPath(); ctx.arc(p.x + o, p.y - 2, 9, 0, Math.PI*2); ctx.fill(); }
      ctx.restore(); break; }
  }
}
function _mnDrawLight(L, t){
  const a = mnLightInt(L), rgb = _mnLightRgb(L);
  ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(L.x, L.y + 4, 22, 8, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  const off = L.st===0, dim = off ? "rgba(10,10,20,0.62)" : null;
  if(a > 0) _mnGlow(L.x, L.y - 60, 80 + 30*a, rgb, 0.35*a);
  const flick = L.st===1 && Math.sin(t*22 + L.i*3) > 0.2;
  switch(L.k){
    case "farol":
      if(MN_OK.x_lampara_encendida){ _mnPiece(flick ? "x_lampara_parpadeo" : "x_lampara_encendida", L.x, L.y + 6, 96, 1, false, 1, off ? "rgba(8,8,16,0.72)" : null); break; }
      _mnPiece("lampara_0", L.x, L.y + 6, 92, 1, false, 1, dim); break;
    case "brasero":
      if(MN_OK.x_antorcha){ _mnPiece("x_antorcha", L.x, L.y + 6, 108, 1, false, 1, off ? "rgba(8,6,10,0.75)" : (flick ? "rgba(40,10,0,0.35)" : null));
        if(!off) _mnFx("mnHowl", ((t*12 + L.i)|0) % 5, L.x, L.y - 74, 30*(0.6 + 0.4*a), 0.65*a, 1); break; }
      { const f = off ? 0 : flick ? 1 : 2; if(!_mnPiece("lampara_apaga_" + f, L.x, L.y + 6, 104)) _mnPiece("lampara_0", L.x, L.y + 6, 92, 1, false, 1, dim);
        if(!off){ _mnFx("mnHowl", ((t*12 + L.i)|0) % 5, L.x, L.y - 70, 44*(0.6 + 0.4*a), 0.9*a, 1); } } break;
    case "cristal":
      if(MN_OK.x_cristal_luz){ if(off) _mnPiece("x_cristal_roto", L.x, L.y + 6, 70, 1, false, 1, "rgba(10,10,30,0.45)"); else _mnPiece("x_cristal_luz", L.x, L.y + 6, 84, flick ? 0.75 : 1); break; }
      _mnPiece("cristal_azul_0", L.x, L.y + 6, 86, 1, false, 1, dim); break;
    case "nucleo": _mnPiece("nucleo_luz_0", L.x, L.y + 24, 110, 1, false, 1, dim); break;
  }
  // el Devoraluz / un Consumidor van por esta luz: aro violeta que late
  const hunted = enemies.some(e=>e.alive && ((e.type==="mn_devoraluz" && e.dv && e.dv.L===L.i && e.dv.st!=="SELECT") || (e.type==="mn_consumidor" && e.mnDrain===L.i)));
  if(hunted && !off){ const q = 0.5 + 0.5*Math.sin(t*10); ctx.save(); ctx.strokeStyle = `rgba(200,90,255,${0.5 + 0.4*q})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(L.x, L.y, 46 + q*8, 18 + q*3, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
  if(off && L.off > 0){ ctx.save(); ctx.fillStyle = "rgba(255,200,140,0.7)"; ctx.font = pxFont(11); ctx.textAlign = "center"; ctx.fillText("…", L.x, L.y - 96); ctx.restore(); }
}
// PUERTA DEL UMBRAL con los paneles de la hoja (sellada -> grietas -> apertura -> portal activo -> idle). Se apoya
// sobre la pared norte; el aro del portal late y echa brasas. Sin la hoja se usa el dibujo por código de abajo.
const MN_GATE_W = 500, MN_GATE_Y = -574;   // el aro del portal entra en pantalla parado en ATRAVESAR
function _mnGatePanel(i, alpha){
  const k = "portal_" + i; if(!MN_OK[k]) return null;
  const im = MN_IMG[k], H = MN_GATE_W*im.height/im.width;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= alpha;
  ctx.drawImage(im, -MN_GATE_W/2, MN_GATE_Y - H, MN_GATE_W, H); ctx.restore();
  return H;
}
function _mnDrawGate(t){
  if(MN_OK.portal_0 && MN_OK.portal_4){
    const P = mnS.portal, C = mnS.cb, hot = C.act >= 3 || C.st==="dying" || C.st==="dead";
    let H = 0;
    if(P.st==="none"){ H = _mnGatePanel(hot ? 1 : 0, 1); if(hot) _mnGlow(0, MN_GATE_Y - H*0.45, 220, "255,40,10", 0.25 + 0.15*Math.sin(t*5)); }
    else if(P.st==="opening"){ const q = Math.min(1, P.t/MN_CFG.cerbero.portalMs);
      if(q < 0.5){ _mnGatePanel(1, 1); H = _mnGatePanel(2, q*2); } else { _mnGatePanel(2, 1); H = _mnGatePanel(3, (q - 0.5)*2); }
      _mnGlow(0, MN_GATE_Y - H*0.45, 260*q + 60, "255,50,10", 0.35 + 0.3*q); }
    else { const used = P.st==="used"; H = _mnGatePanel(used ? 3 : 4, 1);
      const pul = 0.5 + 0.5*Math.sin(t*3.2), cy = MN_GATE_Y - H*0.44, R = H*0.26;
      _mnGlow(0, cy, R*2.4, "255,40,10", (used ? 0.25 : 0.4) + 0.2*pul);
      // remolino suave dentro del aro (movimiento sobre el panel quieto)
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, cy, R*0.78, R*0.98, 0, 0, Math.PI*2); ctx.clip(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for(let k=0;k<3;k++){ ctx.strokeStyle = `rgba(255,${60 + k*30},30,${0.22 + 0.1*pul})`; ctx.lineWidth = 4; ctx.beginPath();
        for(let st=0;st<=22;st++){ const q = st/22, r = 1 - q*0.9, a = t*1.4 + k*2.09 + q*4; const x = Math.cos(a)*r*R*0.78, y = cy + Math.sin(a)*r*R*0.98; st ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.restore();
      if(Math.random() < 0.4) vfxBurst(mnRand(-R, R), cy + mnRand(-R, R), 1, "ember", 50, 1000, 3, 0, -70, 0); }
    return;
  }
  const G = MN_SECTORS[5].gate, open = mnS.portal.st!=="none", hot = open || mnS.cb.act >= 3;
  ctx.save();
  // arco de piedra
  _mnFillPat(_mnRockTex(), 2, "#2a1a14", -440, -900, 880, 300);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-440, -900, 880, 300);
  ctx.fillStyle = "rgba(70,12,4,0.45)"; ctx.fillRect(-440, -900, 880, 300);
  ctx.strokeStyle = "rgba(10,4,2,0.9)"; ctx.lineWidth = 4; ctx.strokeRect(-440, -900, 880, 300);
  // hueco de la puerta (detrás arde la luz infernal cuando despierta)
  ctx.fillStyle = "#050102"; ctx.beginPath(); ctx.moveTo(-180, -600); ctx.lineTo(-180, -780); ctx.quadraticCurveTo(0, -880, 180, -780); ctx.lineTo(180, -600); ctx.closePath(); ctx.fill();
  if(hot){ ctx.save(); ctx.clip(); _mnGlow(0, -690, 240, "255,50,10", 0.55 + 0.2*Math.sin(t*3)); ctx.restore(); }
  // hojas de la puerta: cerradas / quebradas cuando se abre el Umbral
  if(!open){ _mnPiece("puerta_mina_0", -88, -600, 210, 1, false, 1, "rgba(40,6,2,0.35)"); _mnPiece("puerta_mina_0", 88, -600, 210, 1, true, 1, "rgba(40,6,2,0.35)"); }
  else { const q = Math.min(1, (mnS.portal.st==="opening" ? mnS.portal.t/MN_CFG.cerbero.portalMs : 1)); _mnPiece("puerta_mina_0", -150 - q*60, -600, 210*(1 - q*0.2), 1 - q*0.5, false, 1, "rgba(40,6,2,0.5)"); _mnPiece("puerta_mina_0", 150 + q*60, -600, 210*(1 - q*0.2), 1 - q*0.5, true, 1, "rgba(40,6,2,0.5)"); }
  // runas del arco
  const ra = hot ? 0.6 + 0.3*Math.sin(t*4) : 0.18;
  ctx.fillStyle = `rgba(255,80,30,${ra})`; ctx.font = pxFont(18); ctx.textAlign = "center";
  const R = "ᚦᛟᚱᚾᛉᛞᚺᛊ"; for(let k=0;k<R.length;k++){ const a = Math.PI*(0.15 + 0.7*k/(R.length - 1)); ctx.fillText(R[k], Math.cos(a)*-230, -700 - Math.sin(a)*150); }
  ctx.restore();
}
// PORTAL INFERNAL: óvalo de fuego vectorial (sin arte de hoja): interior en degradé hacia un núcleo
// negro, espirales que giran hacia adentro, borde incandescente con lenguas de fuego y ceniza que sube.
function _mnDrawPortal(t){
  const G = MN_SECTORS[5].portal, P = mnS.portal, grow = P.st==="opening" ? Math.min(1, P.t/MN_CFG.cerbero.portalMs) : 1, used = P.st==="used";
  if(MN_OK.portal_4){ _mnGlow(G.x, G.y, 200*grow, "255,50,10", (used ? 0.2 : 0.35)*grow); return; }   // el portal es el panel de la puerta
  const H = 260*grow, W = H*0.62, cx = G.x, cy = G.y - H*0.5;
  if(H < 24) return; // (los radios del borde interno necesitan un mínimo)
  _mnGlow(cx, cy, H*0.95, "255,50,10", 0.5*grow);
  ctx.save(); ctx.globalAlpha = used ? 0.55 : 1;
  // sombra/quemadura en el piso
  ctx.fillStyle = "rgba(20,2,0,0.55)"; ctx.beginPath(); ctx.ellipse(cx, G.y + 4, W*0.62, 16*grow, 0, 0, Math.PI*2); ctx.fill();
  // interior
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, W/2, H/2, 0, 0, Math.PI*2); ctx.clip();
  const gr = ctx.createRadialGradient(cx, cy + H*0.05, 2, cx, cy, H*0.55);
  gr.addColorStop(0, "#040001"); gr.addColorStop(0.3, "#1c0204"); gr.addColorStop(0.7, "#6a0c05"); gr.addColorStop(1, "#c42a08");
  ctx.fillStyle = gr; ctx.fillRect(cx - W, cy - H, W*2, H*2);
  ctx.lineCap = "round";
  for(let k=0;k<4;k++){ // espirales hacia el centro
    const a0 = t*1.6 + k*Math.PI/2;
    ctx.strokeStyle = `rgba(255,${110 + k*20},40,${0.35 + 0.1*Math.sin(t*3 + k)})`; ctx.lineWidth = 5 - k*0.6;
    ctx.beginPath();
    for(let s=0;s<=26;s++){ const q = s/26, r = 1 - q*0.9, a = a0 + q*4.2; const x = cx + Math.cos(a)*r*W*0.48, y = cy + Math.sin(a)*r*H*0.48; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  // borde incandescente
  ctx.strokeStyle = "rgba(255,70,10,0.9)"; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(cx, cy, W/2, H/2, 0, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = "rgba(255,200,90,0.95)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, W/2 - 3, H/2 - 3, 0, 0, Math.PI*2); ctx.stroke();
  // lenguas de fuego alrededor
  for(let k=0;k<22;k++){
    const a = k/22*Math.PI*2, fl = 0.6 + 0.4*Math.sin(t*9 + k*1.7), up = Math.sin(a) < 0 ? 1.3 : 0.8;
    const ex = cx + Math.cos(a)*W/2, ey = cy + Math.sin(a)*H/2, L = (12 + 12*fl)*up*grow;
    const nx = Math.cos(a), ny = Math.sin(a) - 0.6; const nl = Math.hypot(nx, ny) || 1;
    ctx.fillStyle = k % 2 ? "rgba(255,120,20,0.85)" : "rgba(255,190,70,0.8)";
    ctx.beginPath(); ctx.moveTo(ex - ny/nl*6, ey + nx/nl*6); ctx.quadraticCurveTo(ex + nx/nl*L*0.6 + 4*Math.sin(t*7 + k), ey + ny/nl*L*0.6, ex + nx/nl*L, ey + ny/nl*L); ctx.quadraticCurveTo(ex + nx/nl*L*0.4, ey + ny/nl*L*0.4, ex + ny/nl*6, ey - nx/nl*6); ctx.fill();
  }
  ctx.restore();
  // chispas y ceniza que suben
  if(Math.random() < 0.35) vfxBurst(cx + mnRand(-W*0.4, W*0.4), G.y - mnRand(0, H*0.8), 1, "ember", 40, 900, 3, 0, -60, 0);
}

/* ---------------- enemigos con dibujo propio ---------------- */
function mnDrawEnemyBody(e){
  if(!mnS) return false;
  if(e.mnEmerge > 0){ // saliendo de la roca/el suelo: se levanta desde abajo
    const q = 1 - e.mnEmerge/Math.max(1, e.type==="mn_insecto" ? MN_CFG.insecto.emergeMs : 600);
    ctx.save(); ctx.beginPath(); ctx.rect(e.x - 80, e.y - 200, 160, 200); ctx.clip(); ctx.translate(0, (1 - q)*50); ctx.globalAlpha = q;
    const r = drawEnemyAtlasPack(e); ctx.restore(); vfxBurst(e.x, e.y, 1, "rock", 40, 300, 2, 0, -20, 0); return r;
  }
  if(e.type==="mn_acechador" && e.mnHide){ ctx.save(); ctx.globalAlpha = MN_CFG.acechador.hideAlpha; const r = drawEnemyAtlasPack(e); ctx.restore(); return r; }
  return false;
}

/* ---------------- sobre las entidades: oscuridad, avisos, proyectiles ---------------- */
// CADENAS DE CERBERO: eslabones a lo largo de la curva (de las argollas junto a la puerta al cuello), argollas con la
// secuencia "tensionada" de la hoja, ROTURA al pasar al Acto 2 y RESTOS en el suelo después.
let _mnLastAct = 0, _mnChainBreakAt = -1e9, _mnDeadAt = 0;
const MN_CHAIN_ANCHORS = [-220, 220];
function _mnChainLinks(x0, y0, cx, cy, x1, y1, t, taut){
  ctx.save(); ctx.lineCap = "round";
  const L = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(cx - x0, cy - y0)*0.3, n = Math.max(8, Math.floor(L/13));
  for(let i=0;i<=n;i++){
    const q = i/n, u = 1 - q, x = u*u*x0 + 2*u*q*cx + q*q*x1, y = u*u*y0 + 2*u*q*cy + q*q*y1 + (taut ? Math.sin(t*20 + i)*0.8 : 0);
    const tx = 2*u*(cx - x0) + 2*q*(x1 - cx), ty = 2*u*(cy - y0) + 2*q*(y1 - cy), a = Math.atan2(ty, tx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if(i % 2){ ctx.strokeStyle = "#1a1416"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.strokeStyle = "rgba(160,150,150,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(5, -1); ctx.stroke(); }
    else { ctx.strokeStyle = "#241c1e"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,${110 + (i*13 % 60)},50,0.55)`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -0.5, 7, 3.5, 0, Math.PI*1.05, Math.PI*1.9); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}
function _mnDrawChains(Cb, t){
  if(!mnS || mnS.sec!==5) return;
  const act = mnS.cb.act || 0;
  if(_mnLastAct===1 && act >= 2) _mnChainBreakAt = animNow;
  _mnLastAct = act;
  const since = animNow - _mnChainBreakAt, hasSheet = MN_OK.cadena_tension_0;
  if(Cb && act===1){
    for(const sx of MN_CHAIN_ANCHORS){
      const x1 = Cb.x + (sx < 0 ? -14 : 14), y1 = Cb.y - 36, taut = Math.hypot(Cb.x - 0, Cb.y + 380) > MN_CFG.cerbero.chainR*0.85;
      _mnChainLinks(sx, MN_GATE_Y + 8, (sx + x1)/2, Math.max(MN_GATE_Y + 60, (MN_GATE_Y + y1)/2) + (taut ? 10 : 70), x1, y1, t, taut);
      if(hasSheet) _mnPiece("cadena_tension_" + (((t*8)|0) % 6), sx, MN_GATE_Y + 14, 96, 1, sx > 0);
    }
  } else if(act >= 2 || mnS.cb.st==="dying" || mnS.cb.st==="dead"){
    if(since < 1500 && MN_OK.cadena_rotura_0){ const f = Math.min(5, Math.floor(since/250));
      for(const sx of MN_CHAIN_ANCHORS) _mnPiece("cadena_rotura_" + f, sx, MN_GATE_Y + 16, 100, 1, sx > 0); }
    else if(MN_OK.cadena_restos_0){ for(const sx of MN_CHAIN_ANCHORS) _mnPiece("cadena_restos_0", sx, MN_GATE_Y + 26, 44, 0.95, sx > 0); }
    if(since < 1500 && Cb){ _mnChainLinks(Cb.x - 60, Cb.y - 10, Cb.x - 90, Cb.y + 20, Cb.x - 140, Cb.y + 30, t, false); _mnChainLinks(Cb.x + 60, Cb.y - 10, Cb.x + 90, Cb.y + 20, Cb.x + 140, Cb.y + 30, t, false); }
  }
}
function mnDrawTop(){
  if(!mnS || !player) return;
  const t = animNow/1000, V = _mnView();
  // cadenas de Cerbero (Acto 1): desde los costados de la puerta
  const Cb = mnCerbEntity && mnCerbEntity();
  _mnDrawChains(Cb, t);
  // rayos de absorción (Consumidor / Devoraluz comiendo)
  for(const e of enemies){
    if(!e.alive) continue;
    let L = null;
    if(e.type==="mn_consumidor" && e.mnDrain!=null) L = mnS.lights[e.mnDrain];
    if(e.type==="mn_devoraluz" && e.dv && e.dv.st==="DEVOUR") L = mnS.lights[e.dv.L];
    if(!L) continue;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = e.type==="mn_devoraluz" ? `rgba(210,80,255,${0.6 + 0.3*Math.sin(t*20)})` : `rgba(255,190,90,${0.5 + 0.3*Math.sin(t*16)})`;
    ctx.lineWidth = 4 + 2*Math.sin(t*30); ctx.beginPath(); ctx.moveTo(L.x, L.y - 60); ctx.lineTo(e.x, e.y - 40); ctx.stroke(); ctx.restore();
  }
  mnDrawDarkness();
  // ojos en la sombra: se sabe que hay algo ahí aunque no se lo vea bien
  for(const e of enemies){
    if(!e.alive || !_mnVis(V, e.x - 40, e.y - 120, e.x + 40, e.y + 20)) continue;
    if(mnIsLit(e.x, e.y) && !(e.type==="mn_acechador" && e.mnHide)) continue;
    let nearTorch = false; heroes.forEach((h, i)=>{ if(h.alive && Math.hypot(h.x - e.x, h.y - e.y) < mnTorchR(i)*0.8) nearTorch = true; });
    if(nearTorch && !e.mnHide) continue;
    const hh = e.radius*(MN_HMUL[e.type]||3)*0.82, blink = Math.sin(t*1.7 + (e.mnId||0)) > 0.96 ? 0.2 : 1, col = e.type==="mn_devoraluz" || e.type==="mn_escupidor" ? "210,90,255" : e.type==="mn_consumidor" ? "120,190,255" : "255,50,40";
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(${col},${0.85*blink})`;
    ctx.fillRect(Math.round(e.x - 5 + (e.fx||0)*3), Math.round(e.y - hh), 3, 2); ctx.fillRect(Math.round(e.x + 3 + (e.fx||0)*3), Math.round(e.y - hh), 3, 2); ctx.restore();
    if(e.rank==="elite" || e.rank==="subjefe") _mnGlow(e.x, e.y - hh, 16, col, 0.25);
  }
  // Cerbero: medidor de EXPOSICIÓN (aro dorado bajo sus patas: se llena mientras lo alumbran 2+ fuentes) y, expuesto,
  // sus tres sombras separándose del cuerpo
  const Ce = mnCerbEntity && mnCerbEntity();
  if(Ce && Ce.alive){
    const pct = Ce._mnExpPct || 0, R = Ce.radius*1.5;
    if(pct > 0.02 && !(Ce._expT > 0)){ ctx.save(); ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(Ce.x, Ce.y + 6, R, R*0.42, 0, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,220,110,${0.6 + 0.3*Math.sin(t*12)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(Ce.x, Ce.y + 6, R, R*0.42, -Math.PI/2, -Math.PI/2, -Math.PI/2 + pct*Math.PI*2); ctx.stroke(); ctx.restore(); }
    if(Ce._expT > 0){
      for(let k=0;k<3;k++){ const a = t*1.6 + k*2.09, ox = Math.cos(a)*44, oy = Math.sin(a)*18;
        _mnAtlasFrame("mn_cerbero", "hit", 0, Ce.x + ox, Ce.y + oy, 58*MN_HMUL.mn_cerbero*0.92, Ce.fx < 0, 0.28, true); }
      _mnGlow(Ce.x, Ce.y - 60, 180, "255,230,120", 0.3 + 0.15*Math.sin(t*9));
    } else if(Ce._mnDarkPow){ _mnGlow(Ce.x, Ce.y - 60, 140, "150,30,200", 0.22 + 0.1*Math.sin(t*5)); }
  }
  // lanzallamas de Cerbero (es luz: va encima de la oscuridad)
  for(const e of enemies){
    if(!e.alive || !e.mnFlame) continue;
    const F = e.mnFlame, k = _mnFxImg("mnFlame", 0); const ang = Math.atan2(F.dy, F.dx), L = MN_CFG.cerbero.flameR;
    if(k){ const im = MN_IMG[k], sx = im.width*0.3, sw = im.width - sx, s = L/sw;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(e.x + F.dx*20, e.y - 30 + F.dy*20); ctx.rotate(ang); ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.85 + 0.15*Math.sin(t*30); ctx.drawImage(im, sx, 0, sw, im.height, 0, -im.height*s*0.7, L, im.height*s*1.1); ctx.restore(); }
    _mnGlow(F.x, F.y, 180, "255,110,30", 0.45);
  }
  // avisos (siempre legibles, encima de la oscuridad)
  for(const D of mnS.drops) _mnDrawDrop(D, t);
  // proyectiles propios
  for(const s of mnS.shots){
    if(s.k==="dark"){ _mnGlow(s.x, s.y, 34, "190,80,255", 0.5); _mnFx("mnDarkBolt", ((s.t/80)|0) % 5, s.x, s.y, 34, 1, 0.5); }
    else { _mnGlow(s.x, s.y, 26, "255,160,80", 0.4); _mnFx("mnRockLine", 0, s.x, s.y + 10, 30, 1, 0.8); }
  }
  // luz objetivo del Devoraluz: flecha sobre la luz (lo primero que hay que entender es ADÓNDE va)
  for(const e of enemies){ if(!e.alive || e.type!=="mn_devoraluz" || !e.dv || e.dv.L < 0 || e.dv.st==="SELECT") continue; const L = mnS.lights[e.dv.L]; if(!L || L.st===0) continue;
    const bob = Math.sin(t*6)*4; ctx.save(); ctx.fillStyle = "#e080ff"; ctx.beginPath(); ctx.moveTo(L.x, L.y - 104 + bob); ctx.lineTo(L.x - 9, L.y - 120 + bob); ctx.lineTo(L.x + 9, L.y - 120 + bob); ctx.closePath(); ctx.fill(); ctx.restore(); }
}
function _mnDrawDrop(D, t){
  const q = Math.min(1, D.t/Math.max(1, D.d)), pulse = 0.5 + 0.5*Math.sin(t*14);
  const col = D.k==="bolt" || D.k==="breath" || D.k==="amb" ? "200,90,255" : D.k==="flamew" || D.k==="cstomp" || D.k==="howl" || D.k==="charge" ? "255,80,30" : "255,120,60";
  ctx.save();
  if(D.aim){ ctx.strokeStyle = `rgba(${col},${0.25 + 0.35*q})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(D.x, D.y - 20); ctx.lineTo(D.x2, D.y2); ctx.stroke(); ctx.restore(); return; }
  ctx.fillStyle = `rgba(${col},${0.12 + 0.18*q})`; ctx.strokeStyle = `rgba(${col},${0.55 + 0.35*pulse})`; ctx.lineWidth = 3;
  if(D.sh===1){
    const a = Math.atan2(D.dy, D.dx);
    ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.arc(D.x, D.y, D.r, a - D.arc, a + D.arc); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${col},0.3)`; ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.arc(D.x, D.y, D.r*q, a - D.arc, a + D.arc); ctx.closePath(); ctx.fill();
  } else if(D.sh===2){
    const dx = D.x2 - D.x, dy = D.y2 - D.y, L = Math.hypot(dx, dy)||1, nx = -dy/L*D.r, ny = dx/L*D.r;
    ctx.beginPath(); ctx.moveTo(D.x + nx, D.y + ny); ctx.lineTo(D.x2 + nx, D.y2 + ny); ctx.lineTo(D.x2 - nx, D.y2 - ny); ctx.lineTo(D.x - nx, D.y - ny); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(D.x, D.y, D.r, D.r*0.72, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${col},0.3)`; ctx.beginPath(); ctx.ellipse(D.x, D.y, D.r*q, D.r*0.72*q, 0, 0, Math.PI*2); ctx.fill();
    if(D.k==="amb"){ ctx.fillStyle = Math.sin(t*16) > 0 ? "#ff40ff" : "#fff"; ctx.font = pxFont(24); ctx.textAlign = "center"; ctx.fillText("!", D.x, D.y - 70); }
    if(D.black){ ctx.strokeStyle = `rgba(255,220,140,${0.25 + 0.2*pulse})`; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.ellipse(D.x, D.y, D.black, D.black*0.72, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
  }
  ctx.restore();
}

/* ---------------- pantalla: descenso, HUD de luz, alertas, minimapa ---------------- */
function mnDrawScreen(){
  if(!mnS || !player) return;
  const t = animNow/1000;
  ctx.save();
  // A OSCURAS: viñeta violeta en los bordes (el jugador siente la amenaza)
  if(mnHeroDark(player)){
    const g = ctx.createRadialGradient(VW/2, VH/2, Math.min(VW, VH)*0.3, VW/2, VH/2, Math.max(VW, VH)*0.7);
    g.addColorStop(0, "rgba(20,0,30,0)"); g.addColorStop(1, `rgba(40,0,60,${0.28 + 0.06*Math.sin(t*3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  // panel de luz (arriba al centro)
  const lit = mnLitCount(), tot = mnS.lights.length, dark = mnHeroDark(player);
  const obj = mnS.portal.st==="open" ? "🜂 ATRAVIESA EL UMBRAL" : mnS.portal.st==="opening" ? "EL UMBRAL SE ABRE…" : "";
  const txt = `🔥 Luces ${lit}/${tot}  ·  ${dark ? "🌑 A OSCURAS (+daño recibido)" : "☀ En la luz"}` + (mnS.sec < 5 ? `  ·  −${mnSector().depth} m` : "");
  ctx.font = pxFont(13); ctx.textAlign = "center";
  const bossUp = (bossActive && boss && boss.alive) || !!mnEnt("mn_titan");
  const tw = ctx.measureText(txt).width + 24, px = VW/2, py = Math.max(52, VH*0.085) + (bossUp ? 40 : 0);
  ctx.fillStyle = "rgba(8,4,10,0.72)"; ctx.fillRect(px - tw/2, py - 16, tw, 24);
  ctx.strokeStyle = dark ? `rgba(200,90,255,${0.5 + 0.4*Math.sin(t*6)})` : "rgba(255,200,120,0.4)"; ctx.lineWidth = 1.5; ctx.strokeRect(px - tw/2, py - 16, tw, 24);
  ctx.fillStyle = "#f2e6dc"; ctx.fillText(txt, px, py);
  if(obj){ ctx.font = pxFont(16); const w2 = ctx.measureText(obj).width + 30; ctx.fillStyle = "rgba(40,4,2,0.8)"; ctx.fillRect(px - w2/2, py + 14, w2, 26);
    ctx.strokeStyle = `rgba(255,90,40,${0.6 + 0.4*Math.sin(t*5)})`; ctx.strokeRect(px - w2/2, py + 14, w2, 26); ctx.fillStyle = "#ffd0b0"; ctx.fillText(obj, px, py + 33); }
  // alertas prioritarias con flecha hacia su lugar
  let ay = py + (obj ? 70 : 34);
  for(const A of mnS.alerts){
    if(A.t > A.d || A.k==="portal") continue;
    const a = Math.min(1, (A.d - A.t)/400);
    const col = A.k==="dev" ? "230,120,255" : A.k==="drain" ? "255,200,110" : "255,150,90";
    ctx.globalAlpha = a; ctx.font = pxFont(12);
    const w = ctx.measureText(A.txt).width + 34;
    ctx.fillStyle = "rgba(14,4,16,0.75)"; ctx.fillRect(px - w/2, ay - 13, w, 20);
    ctx.fillStyle = `rgb(${col})`; ctx.fillText(A.txt, px + 8, ay + 2);
    const sp = worldToScreen(A.x, A.y), ang = Math.atan2(sp.y - (ay - 3), sp.x - (px - w/2 + 12));
    ctx.save(); ctx.translate(px - w/2 + 12, ay - 3); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    ay += 24;
  }
  ctx.globalAlpha = 1;
  // descenso: fundido a negro con la profundidad
  if(mnS.desc){
    const D = mnS.desc, T = MN_CFG.descentMs, x = D.t/T, a = x < 0.45 ? x/0.45 : Math.max(0, 1 - (x - 0.45)/0.55);
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a*1.1)})`; ctx.fillRect(0, 0, VW, VH);
    if(a > 0.4){ ctx.globalAlpha = Math.min(1, (a - 0.4)*2); ctx.fillStyle = "#e8c8a0"; ctx.font = pxFont(20); ctx.textAlign = "center"; ctx.fillText("DESCENDIENDO…", VW/2, VH/2 - 6); ctx.font = pxFont(14); ctx.fillText(`−${MN_SECTORS[D.to].depth} m · ${MN_SECTORS[D.to].name}`, VW/2, VH/2 + 18); ctx.globalAlpha = 1; }
  }
  ctx.restore();
  if(!player.duelActive && !mnS.desc) _mnMinimap();
}
function _mnMinimap(){
  const B = MN_BOUNDS, W = Math.min(150, VW*0.26), k = W/(B.x1 - B.x0), Hh = (B.y1 - B.y0)*k;
  const X = VW - W - 12, Y = Math.max(70, VH*0.16), tx = x=>X + (x - B.x0)*k, ty = y=>Y + (y - B.y0)*k;
  ctx.save(); ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(8,4,10,0.78)"; ctx.fillRect(X - 3, Y - 3, W + 6, Hh + 6); ctx.strokeStyle = "rgba(200,140,90,0.5)"; ctx.strokeRect(X - 3, Y - 3, W + 6, Hh + 6);
  ctx.fillStyle = "#2a2226"; for(const r of mnRocksNow()) ctx.fillRect(tx(r.x0), ty(r.y0), (r.x1 - r.x0)*k, (r.y1 - r.y0)*k);
  for(const p of mnSector().pillars){ ctx.beginPath(); ctx.arc(tx(p.x), ty(p.y), p.r*k, 0, Math.PI*2); ctx.fill(); }
  for(const L of mnS.lights){ ctx.fillStyle = L.st===2 ? "#ffd27a" : L.st===1 ? (Math.sin(animNow/90) > 0 ? "#ffd27a" : "#6a4a2a") : "#3a2a4a"; ctx.beginPath(); ctx.arc(tx(L.x), ty(L.y), L.st ? 3 : 2.2, 0, Math.PI*2); ctx.fill(); if(L.st===2){ ctx.strokeStyle = "rgba(255,210,120,0.25)"; ctx.beginPath(); ctx.arc(tx(L.x), ty(L.y), L.r*k, 0, Math.PI*2); ctx.stroke(); } }
  for(const e of enemies){ if(!e.alive) continue; if(e.rank==="subjefe" || e.rank==="jefe"){ ctx.fillStyle = "#ff4a3a"; ctx.fillRect(tx(e.x) - 3, ty(e.y) - 3, 6, 6); } else if(e.type==="mn_devoraluz"){ ctx.fillStyle = Math.sin(animNow/110) > 0 ? "#e080ff" : "#fff"; ctx.fillRect(tx(e.x) - 2.5, ty(e.y) - 2.5, 5, 5); } else if(e.type==="mn_consumidor" || e.type==="mn_minero"){ ctx.fillStyle = "#ffa050"; ctx.fillRect(tx(e.x) - 1.5, ty(e.y) - 1.5, 3, 3); } }
  if(mnS.portal.st!=="none"){ const G = MN_SECTORS[5].portal; ctx.fillStyle = Math.sin(animNow/120) > 0 ? "#ff5a3a" : "#ffd0b0"; ctx.beginPath(); ctx.arc(tx(G.x), ty(G.y), 5, 0, Math.PI*2); ctx.fill(); }
  const S = mnSector(); if(S.exit){ ctx.strokeStyle = "#e8c8a0"; ctx.beginPath(); ctx.arc(tx(S.exit.x), ty(S.exit.y), 4, 0, Math.PI*2); ctx.stroke(); }
  heroes.forEach((h, i)=>{ ctx.fillStyle = h===player ? "#ffffff" : (h.alive ? (["#4ad0ff","#8effb4","#ffd24a","#ff8ad8"][i%4]) : "#777"); ctx.beginPath(); ctx.arc(tx(h.x), ty(h.y), h===player ? 3 : 2.4, 0, Math.PI*2); ctx.fill(); });
  ctx.restore();
}
