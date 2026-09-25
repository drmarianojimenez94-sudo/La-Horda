"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-render.js
   Dibujo de la Fortaleza: abismo de lava, plataformas (canvas pre-pintados), puentes que giran /
   se retraen / se deslizan / bajan, compuertas, trampas del Ciclo Mecánico, utilería con luces,
   capa superior (cadenas, rayos de reparación, prensas, cadenas del Caballero) y un minimapa.
   Solo se anima lo que está en cámara (engranajes decorativos, trampas, lava).
   ============================================================ */
const FORT_FX_NAMES = ["chain_throw","steam_puff_a","steam_puff_b","charge_steam","claw_slash","verdugo_steam_a","verdugo_steam_b",
  "spider_bolt","chain_net","bomb_big","bomb_med","fireball","fire_burst","smoke","fire_ring","explosion","spark","explosion_b",
  "fire_trail","rubble","bomb_blast","forge_breath","exec_wave","exec_ground","chain_ring","chain_spikes"];
const FORT_FX_IMG = {}, FORT_FX_READY = {};
for(const n of FORT_FX_NAMES){ const im = new Image(); im.onload = ()=>{ FORT_FX_READY[n] = true; }; im.src = "assets/sprites/arenas/fortaleza/fx/"+n+".png"; FORT_FX_IMG[n] = im; }
// claves de vfxSprite (se repiten en red como cualquier efecto)
[["fortExplosion","explosion"],["fortExplosionB","explosion_b"],["fortSteamA","steam_puff_a"],["fortSteamB","steam_puff_b"],["fortSmoke","smoke"],
 ["fortBombBig","bomb_big"],["fortBombMed","bomb_med"],["fortBombBlast","bomb_blast"],["fortForgeBreath","forge_breath"],["fortFireBurst","fire_burst"],
 ["fortExecWave","exec_wave"],["fortExecGround","exec_ground"],["fortClaw","claw_slash"],["fortVerdugoSteamA","verdugo_steam_a"],
 ["fortChargeSteam","charge_steam"],["fortSpark","spark"],["fortRubble","rubble"],["fortFireRing","fire_ring"],["fortChainRing","chain_ring"],["fortChainSpikes","chain_spikes"]
].forEach(([k, n])=>{ VFX_SPR_EXTRA[k] = {imgs:[FORT_FX_IMG[n]], ready:()=>!!FORT_FX_READY[n], ground:n==="exec_ground"||n==="bomb_blast"||n==="fire_ring"}; });
VFX_SPR_EXTRA.fortChainNet = {imgs:[FORT_FX_IMG.chain_net], ready:()=>!!FORT_FX_READY.chain_net, ground:true};

let fortDecoGears = [];   // engranajes decorativos (solo giran en cámara)
let _fortPlatGaps = {};
let _fortChasmPat = null;
let _fortFurnaceProp = null;
const _fortPlatsByY = FORT_MAP.plats.slice().sort((a,b)=>a.cy-b.cy);

/* ---------------- armado (una vez por partida) ---------------- */
function _fortAABB(s){
  const c = Math.abs(Math.cos(s.rot||0)), sn = Math.abs(Math.sin(s.rot||0));
  const ex = s.hw*c + s.hh*sn, ey = s.hw*sn + s.hh*c;
  return {x0:s.cx-ex, y0:s.cy-ey, x1:s.cx+ex, y1:s.cy+ey};
}
function _fortConnectorBoxes(){
  const out = [];
  for(const g of FORT_MAP.gates) out.push(_fortAABB(g));
  for(const p of FORT_MAP.plats) out.push(_fortAABB(p));
  for(const b of FORT_MAP.bridges){
    if(b.kind==="lift") out.push(_fortAABB(b));
    else if(b.kind==="slide"){ out.push(_fortAABB({cx:b.ax, cy:b.cy, hw:b.hw, hh:b.hh})); out.push(_fortAABB({cx:b.bx, cy:b.cy, hw:b.hw, hh:b.hh})); }
    else if(b.kind==="arm"){
      const R = FORT_MAP.rotors[b.rotor], angs = R.kind==="rotate" ? R.states.map(a=>a+b.off) : [b.off];
      for(const a of angs){ const mid = (b.r0+b.r1)/2; out.push(_fortAABB({cx:R.x+Math.cos(a)*mid, cy:R.y+Math.sin(a)*mid, hw:(b.r1-b.r0)/2, hh:b.hw, rot:a})); }
    }
  }
  return out;
}
function fortBuildDecor(){
  // el octágono y su decorado no existen acá: solo lo de la Fortaleza
  lavaPools = []; floorDecor = []; braziers = []; wallBlocks = []; deadTrees = []; smokePuffs = [];
  labyrinthWalls = []; aidProps = []; aidDecals = []; aidSolids = []; aidLights = []; aidKelp = []; aidOuterBlobs = [];
  aidLavaLayer = null;
  const boxes = _fortConnectorBoxes();
  _fortPlatGaps = {};
  for(const p of FORT_MAP.plats){
    const own = _fortAABB(p);
    _fortPlatGaps[p.id] = boxes.filter(b=>!(b.x0===own.x0 && b.y0===own.y0 && b.x1===own.x1 && b.y1===own.y1) && b.x1 > own.x0-20 && b.x0 < own.x1+20 && b.y1 > own.y0-20 && b.y0 < own.y1+20);
    fortArtPlatform(p, _fortPlatGaps[p.id]);
  }
  for(const g of FORT_MAP.gates) fortArtPlatform(Object.assign({}, g, {id:"gate_"+g.id, theme:g.kind==="great" ? "chamber" : "bridge"}), [_fortAABB({cx:g.cx, cy:g.cy-g.hh, hw:g.hw, hh:20}), _fortAABB({cx:g.cx, cy:g.cy+g.hh, hw:g.hw, hh:20})]);
  const lift = FORT_MAP.bridges.find(b=>b.id==="db_forge");
  fortArtPlatform(Object.assign({}, lift, {id:"lift", theme:"bridge"}), [_fortAABB({cx:lift.cx, cy:lift.cy-lift.hh, hw:lift.hw, hh:20}), _fortAABB({cx:lift.cx, cy:lift.cy+lift.hh, hw:lift.hw, hh:20})]);
  _fortChasmPat = null;
  const P = (kind, x, y, o)=>aidProp(fortArtProp(kind), x, y, Object.assign({scale:2}, o||{}));
  const fire = (dy, r)=>({r:r||120, rgb:"255,130,40", a:0.55, flick:0.35, dy:dy||-50});
  // Patio de armas
  P("statue", -560, 1600); P("statue", 560, 1600, {flip:true});
  P("brazier", -190, 1600, {light:fire(-50)}); P("brazier", 190, 1600, {light:fire(-50)});
  P("brazier", -700, 2360, {light:fire(-50)}); P("brazier", 700, 2360, {light:fire(-50)});
  P("banner", -380, 1580); P("banner", 380, 1580); P("banner", -120, 2400); P("banner", 120, 2400);
  P("barrel", -720, 2000); P("barrel", -690, 2030); P("barrel", 720, 2080); P("cage", -480, 2395);
  P("pillar", -740, 1600); P("pillar", 740, 1600); P("pillar", -740, 2380); P("pillar", 740, 2380);
  // Prisión
  for(const x of [-640, -380, 380, 640]) P("cellbars", x, 745);
  for(const y of [880, 1100, 1320]){ P("cellbars", -795, y, {scale:1.6}); P("cellbars", 795, y, {scale:1.6, flip:true}); }
  P("brazier", -170, 760, {light:fire(-50)}); P("brazier", 170, 760, {light:fire(-50)});
  P("cage", -650, 1450); P("cage", 650, 1450); P("chainpost", -300, 1450); P("chainpost", 300, 1450);
  // Puentes mecánicos
  P("brazier", -1030, 185, {light:fire(-50)}); P("brazier", 1030, 185, {light:fire(-50)});
  P("brazier", -1030, 590, {light:fire(-50)}); P("brazier", 1030, 590, {light:fire(-50)});
  P("banner", -220, -505); P("banner", 220, -505);
  // Forja
  P("furnace", -820, -1180, {light:{r:220, rgb:"255,110,30", a:0.6, flick:0.3, dy:-30}});
  P("furnace", -820, -860, {light:{r:220, rgb:"255,110,30", a:0.6, flick:0.3, dy:-30}});
  const fg = FORT_MAP.furnaceGate;
  _fortFurnaceProp = P("furnace", fg.x-40, fg.y+40, {light:{r:260, rgb:"255,110,30", a:0.65, flick:0.3, dy:-40}});
  P("anvil", -300, -1360); P("anvil", 300, -1360); P("anvil", -620, -780); P("anvil", 620, -780);
  P("pipes", -870, -720); P("pipes", 870, -1430); P("brazier", -150, -720, {light:fire(-50)}); P("brazier", 150, -720, {light:fire(-50)});
  // Interior industrial
  for(const x of [-700, -350, 350, 700]){ P("pipes", x, -1565); P("pipes", x, -2340); }
  P("barrel", -820, -1700); P("barrel", 820, -2200); P("barrel", -800, -2280); P("brazier", -120, -1570, {light:fire(-50)}); P("brazier", 120, -1570, {light:fire(-50)});
  // Núcleo
  P("brazier", -300, -2465, {light:fire(-50)}); P("brazier", 300, -2465, {light:fire(-50)});
  P("brazier", -780, -2755, {light:fire(-50)}); P("brazier", 780, -2755, {light:fire(-50)});
  P("banner", -300, -3245); P("banner", 300, -3245);
  // Cámara del Caballero
  P("throne", FORT_MAP.throne.x, FORT_MAP.throne.y + 60, {light:{r:200, rgb:"200,40,30", a:0.4, flick:0.2, dy:-100}});
  for(const y of [-3680, -3900, -4120]){ P("pillar", -520, y); P("pillar", 520, y); }
  for(const y of [-3620, -3860, -4100]){ P("brazier", -130, y, {light:fire(-50, 110)}); P("brazier", 130, y, {light:fire(-50, 110)}); }
  for(const x of [-600, -300, 300, 600]) P("banner", x, -4240);
  P("statue", -680, -3560); P("statue", 680, -3560, {flip:true});
  // brillo de lava en los bordes (luces aditivas bajas, fijas)
  for(const p of FORT_MAP.plats){ for(let i=0;i<3;i++){ aidLights.push({x:p.cx + (i-1)*p.hw*0.7, y:p.cy + p.hh + FORT_CLIFF + 40, r:170, rgb:"255,90,20", a:0.35, flick:0.25, ph:i*2+p.cx, fissure:true}); } }
  // engranajes decorativos
  fortDecoGears = [
    {x:0, y:377, R:150, teeth:18, tone:"brass", rotor:"hub"},
    {x:0, y:-2900, R:190, teeth:22, tone:"brass", rotor:"core"},
    {x:-470, y:-1940, R:0},
    {x:-760, y:-1480, R:60, teeth:10, tone:"iron", spin:0.4}, {x:760, y:-1480, R:60, teeth:10, tone:"iron", spin:-0.4},
    {x:-790, y:-2080, R:46, teeth:9, tone:"brass", spin:0.7}, {x:790, y:-2080, R:46, teeth:9, tone:"brass", spin:-0.7},
    {x:-620, y:-3500, R:70, teeth:12, tone:"iron", spin:0.25}, {x:620, y:-3500, R:70, teeth:12, tone:"iron", spin:-0.25}
  ].filter(g=>g.R>0);
  aidNavBuild();
  aidAmbReset();
}

/* ---------------- mundo (bajo las entidades) ---------------- */
function _fortDrawChasm(now){
  const hw = VW/2/CAM_ZOOM + 80, hh = VH/2/CAM_ZOOM + 160;
  const x0 = player.x - hw, y0 = player.y - hh, W = hw*2, H = hh*2;
  if(!_fortChasmPat) _fortChasmPat = ctx.createPattern(fortArtChasm(), "repeat");
  ctx.save();
  // parallax: el fondo está lejos, se mueve a la mitad
  const ox = player.x*0.5, oy = player.y*0.5;
  ctx.translate(ox, oy); ctx.scale(2, 2);
  ctx.fillStyle = _fortChasmPat; ctx.fillRect((x0-ox)/2, (y0-oy)/2, W/2, H/2);
  ctx.restore();
  // calor que respira desde abajo
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.10 + 0.05*Math.sin(now*1.3);
  ctx.fillStyle = "rgb(255,80,20)"; ctx.fillRect(x0, y0, W, H);
  ctx.restore();
}
function _fortDrawRot(img, cx, cy, w, h, rot, sx, sw){
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  if(sw!==undefined) ctx.drawImage(img, sx, 0, sw, img.height, -w/2, -h/2, w, h + 8/FORT_K);
  else ctx.drawImage(img, -w/2, -h/2, w, h + 8/FORT_K);
  ctx.restore();
}
function _fortDrawPlat(img, p){
  if(!inView(p.cx, p.cy, Math.max(p.hw, p.hh) + 80)) return;
  ctx.drawImage(img, p.cx - p.hw, p.cy - p.hh, p.hw*2, p.hh*2 + FORT_CLIFF);
}
function fortDrawWorld(now){
  if(!fortS){ return; }
  if(fortGeomDirty) fortRebuildShapes();
  _fortDrawChasm(now);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // pasarelas de las puertas (se ven siempre; cerradas no se pueden cruzar)
  for(const g of FORT_MAP.gates) _fortDrawPlat(FORT_ART["plat_gate_"+g.id], g);
  // puente levadizo (baja desde el lado de la Forja)
  const lift = FORT_MAP.bridges.find(b=>b.id==="db_forge"), ld = fortS.lift.db_forge.down;
  if(ld > 0.02 && inView(lift.cx, lift.cy, 200)){
    const img = FORT_ART.plat_lift, h = lift.hh*2*ld;
    ctx.globalAlpha = 0.6 + 0.4*ld;
    ctx.drawImage(img, 0, 0, img.width, img.height*ld, lift.cx - lift.hw, lift.cy - lift.hh, lift.hw*2, h + FORT_CLIFF*ld);
    ctx.globalAlpha = 1;
  }
  // brazos de puente (giran / se retraen)
  for(const b of FORT_MAP.bridges){
    if(b.kind!=="arm") continue;
    const R = FORT_MAP.rotors[b.rotor];
    if(!inView(R.x, R.y, b.r1 + 100)) continue;
    const st = fortS.rot[b.rotor];
    const ang = R.kind==="rotate" ? st.ang + b.off : b.off;
    const full = b.r1 - b.r0, cur = R.kind==="rotate" ? full : full*st.ext;
    if(cur < 6) continue;
    const img = fortArtArm(full, b.hw, b.id), mid = b.r0 + cur/2;
    _fortDrawRot(img, R.x + Math.cos(ang)*mid, R.y + Math.sin(ang)*mid, cur, b.hw*2, ang, 0, img.width*cur/full);
  }
  // plataforma deslizante del canal
  const sl = FORT_MAP.bridges.find(b=>b.id==="sl_int");
  if(inView(fortS.slide.sl_int.x, sl.cy, 300)){ const img = fortArtSlide(sl.hw*2, sl.hh*2); ctx.drawImage(img, fortS.slide.sl_int.x - sl.hw, sl.cy - sl.hh, sl.hw*2, sl.hh*2 + 10/FORT_K); }
  // plataformas fijas (de norte a sur: la cara del risco de cada una queda bajo la de adelante)
  for(const p of _fortPlatsByY) _fortDrawPlat(FORT_ART["plat_"+p.id], p);
  ctx.restore();
  if(_fortFurnaceProp) _fortFurnaceProp.img = fortArtProp(fortS.furnaceBroken ? "furnace_broken" : "furnace");
  _fortDrawGears(now);
  _fortDrawTrapsGround(now);
  _fortDrawNets(now);
  _fortDrawReconfWarn(now);
  aidDrawDecals();
  aidDrawLights(now);
}
function _fortDrawGears(now){
  for(const g of fortDecoGears){
    if(!inView(g.x, g.y, g.R + 40)) continue;
    let a = 0;
    if(g.rotor==="hub") a = fortS.rot.hub.ang*3;
    else if(g.rotor==="core"){ g._a = (g._a||0) + (["core_s","core_n","core_w","core_e"].some(k=>fortS.rot[k].phase==="move") ? 0.03 : 0.002); a = g._a; }
    else a = now*g.spin;
    const img = fortArtGear(g.R, g.teeth, g.x+"_"+g.y, g.tone);
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(a); ctx.imageSmoothingEnabled = false;
    if(g.rotor){ ctx.globalAlpha = 0.9; }
    ctx.drawImage(img, -img.width/FORT_K/2, -img.height/FORT_K/2, img.width/FORT_K, img.height/FORT_K);
    ctx.restore();
  }
}
// Aviso visual de un mecanismo a punto de moverse (además del sonido, el temblor y el cartel)
function _fortDrawReconfWarn(now){
  const warnRing = (x, y, r)=>{
    if(!inView(x, y, r + 60)) return;
    const p = 0.5 + 0.5*Math.sin(now*14);
    ctx.save(); ctx.strokeStyle = `rgba(255,${160+60*p|0},60,${0.5+0.4*p})`; ctx.lineWidth = 6; ctx.setLineDash([24, 14]); ctx.lineDashOffset = -now*80;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke(); ctx.restore();
  };
  if(fortS.rot.hub.phase==="warn") warnRing(0, 377, 640);
  if(fortS.rot.core.phase==="warn") warnRing(0, -2900, 580);
  const sl = fortS.slide.sl_int; if(sl.phase==="warn") warnRing(sl.x, -1940, 170);
}
function _fortDrawTrapsGround(now){
  if(!fortS.traps) return;
  for(let i=0;i<FORT_MAP.traps.length;i++){
    const T = FORT_MAP.traps[i], s = fortS.traps[i];
    const cx = T.x!==undefined ? T.x : (T.x0+T.x1)/2, cy = T.y!==undefined ? T.y : (T.y0+T.y1)/2;
    if(!inView(cx, cy, 420)) continue;
    const warn = s.st===FORT_TRAP_WARN, act = s.st===FORT_TRAP_ACT;
    const pulse = 0.5 + 0.5*Math.sin(now*(warn ? 16 : 3));
    ctx.save();
    if(T.type==="steam"){
      const r = FORT_CFG.cycle.steam.r*0.55;
      ctx.fillStyle = "#0c0806"; ctx.beginPath(); ctx.arc(T.x, T.y, r, 0, Math.PI*2); ctx.fill();
      if(warn || act){ ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = warn ? 0.35 + 0.4*pulse : 0.7; ctx.drawImage(glowSprite("255,240,220"), T.x - r*1.8, T.y - r*1.8, r*3.6, r*3.6); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; }
      ctx.strokeStyle = FORT_PAL.ironLit; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(T.x, T.y, r, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = FORT_PAL.iron; ctx.lineWidth = 3;
      for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(T.x - Math.sqrt(r*r - (k*r/3)**2), T.y + k*r/3); ctx.lineTo(T.x + Math.sqrt(r*r - (k*r/3)**2), T.y + k*r/3); ctx.stroke(); }
    } else if(T.type==="gear"){
      const L = _fortRailLen(T), img = fortArtRail(L), a = Math.atan2(T.y1-T.y0, T.x1-T.x0);
      ctx.translate((T.x0+T.x1)/2, (T.y0+T.y1)/2); ctx.rotate(a); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, -L/2 - 10/FORT_K, -8/FORT_K, img.width/FORT_K, img.height/FORT_K);
      if(warn){ ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(255,170,60,${0.25+0.3*pulse})`; ctx.fillRect(-L/2, -6, L, 12); }
    } else if(T.type==="chain"){
      ctx.fillStyle = "#0e0a08"; ctx.beginPath(); ctx.arc(T.x, T.y, 22, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = FORT_PAL.iron; ctx.beginPath(); ctx.arc(T.x, T.y, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = FORT_PAL.ironLit; ctx.beginPath(); ctx.arc(T.x-4, T.y-4, 6, 0, Math.PI*2); ctx.fill();
      // cadena: en reposo tendida sobre el piso; activa, barriendo
      const a = act ? fortChainAng(T, s) : (s.d>0 ? T.a0 : T.a1);
      const shake = warn ? Math.sin(now*40)*0.04 : 0;
      _fortDrawChain(T.x, T.y, T.x + Math.cos(a+shake)*T.len, T.y + Math.sin(a+shake)*T.len, act ? 1 : 0.7, act);
    } else if(T.type==="forge"){
      const hot = act ? 1 : (warn ? Math.min(1, s.t/FORT_CFG.cycle.forge.warnMs) : (s.st===FORT_TRAP_CD ? Math.max(0, 1 - s.t/1600)*0.6 : 0));
      ctx.fillStyle = "#0c0604"; ctx.fillRect(T.x-T.hw, T.y-T.hh, T.hw*2, T.hh*2);
      ctx.globalCompositeOperation = "lighter";
      const glow = 0.25 + hot*(0.55 + 0.2*pulse);
      ctx.fillStyle = `rgba(255,${90+120*hot|0},${20+60*hot*hot|0},${glow})`; ctx.fillRect(T.x-T.hw+4, T.y-T.hh+4, T.hw*2-8, T.hh*2-8);
      if(hot > 0.6){ ctx.globalAlpha = (hot-0.6)*1.6; ctx.drawImage(glowSprite("255,200,120"), T.x - T.hw*1.2, T.y - T.hh*2, T.hw*2.4, T.hh*4); ctx.globalAlpha = 1; }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = hot > 0.7 ? "#7a3a22" : FORT_PAL.iron;
      for(let x=T.x-T.hw; x<=T.x+T.hw; x+=20) ctx.fillRect(x-2, T.y-T.hh, 4, T.hh*2);
      for(let y=T.y-T.hh; y<=T.y+T.hh; y+=20) ctx.fillRect(T.x-T.hw, y-2, T.hw*2, 4);
      ctx.strokeStyle = FORT_PAL.ironDark; ctx.lineWidth = 4; ctx.strokeRect(T.x-T.hw, T.y-T.hh, T.hw*2, T.hh*2);
    } else if(T.type==="press"){
      ctx.fillStyle = "#2a2622"; ctx.fillRect(T.x-T.hw, T.y-T.hh, T.hw*2, T.hh*2);
      ctx.strokeStyle = "#8a6a22"; ctx.lineWidth = 6; ctx.setLineDash([14, 12]); ctx.strokeRect(T.x-T.hw+4, T.y-T.hh+4, T.hw*2-8, T.hh*2-8); ctx.setLineDash([]);
      // sombra del bloque: crece mientras baja
      const h = _fortPressHeight(T, s), sh = Math.max(0.15, 1 - h/160);
      ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.45*(1-h/160)})`; ctx.fillRect(T.x - T.hw*sh, T.y - T.hh*sh, T.hw*2*sh, T.hh*2*sh);
    }
    ctx.restore();
  }
}
function _fortDrawChain(x0, y0, x1, y1, alpha, hot){
  const L = Math.hypot(x1-x0, y1-y0), n = Math.max(2, L/14|0), dx = (x1-x0)/n, dy = (y1-y0)/n, a = Math.atan2(y1-y0, x1-x0);
  ctx.save(); ctx.globalAlpha = alpha;
  for(let i=0;i<n;i++){
    const x = x0 + dx*(i+0.5), y = y0 + dy*(i+0.5);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 8, i%2 ? 2.5 : 5, 0, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = hot ? "#b0a8a0" : "#6a6a72"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 8, i%2 ? 2.5 : 5, 0, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function _fortPressHeight(T, s){
  const C = FORT_CFG.cycle.press;
  if(s.st===FORT_TRAP_WARN) return 150 - 40*Math.min(1, s.t/C.warnMs) + Math.sin(s.t/30)*3;
  if(s.st===FORT_TRAP_ACT){ if(s.t < 160) return 0; return Math.min(150, (s.t-160)/C.liftMs*150); }
  return 150;
}
function _fortDrawNets(now){
  if(!fortS.nets) return;
  for(const n of fortS.nets){
    if(!inView(n.x, n.y, n.r + 40)) continue;
    const a = Math.min(1, n.t/200, (n.dur - n.t)/400);
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    const img = FORT_FX_IMG.chain_net;
    if(FORT_FX_READY.chain_net){ const w = n.r*2.3, h = w*img.height/img.width; ctx.imageSmoothingEnabled = false; ctx.drawImage(img, n.x - w/2, n.y - h/2, w, h); }
    ctx.strokeStyle = "rgba(200,190,170,0.55)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}

/* ---------------- piezas altas (ordenadas por profundidad con las entidades) ---------------- */
function fortPushTall(){
  if(!fortS) return;
  for(const g of FORT_MAP.gates){ if(inView(g.cx, g.cy, 260)) _entPush(g.cy + 8, null, null, null, {arena:1, fortGate:g}); }
  if(fortS.traps) for(let i=0;i<FORT_MAP.traps.length;i++){
    const T = FORT_MAP.traps[i];
    if(T.type==="gear"){ const p = fortGearPos(T, fortS.traps[i]); if(inView(p.x, p.y, 120)) _entPush(p.y + 2, null, null, null, {arena:1, fortGear:i}); }
    else if(T.type==="press"){ if(inView(T.x, T.y, 260)) _entPush(T.y + T.hh, null, null, null, {arena:1, fortPress:i}); }
  }
}
function fortDrawTall(it, now){
  if(it.fortGate) return _fortDrawGate(it.fortGate, now);
  if(it.fortGear!==undefined){
    const i = it.fortGear, T = FORT_MAP.traps[i], s = fortS.traps[i], p = fortGearPos(T, s), R = FORT_CFG.cycle.gear.r;
    const img = fortArtGear(R, 12, "saw", "iron");
    const spin = (p.x + p.y)/R;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(p.x, p.y+4, R*0.9, R*0.28, 0, 0, Math.PI*2); ctx.fill();
    // rueda parada sobre el riel (vista 3/4: algo achatada)
    ctx.translate(p.x, p.y - R*0.95); ctx.scale(1, 0.92); ctx.rotate(spin*(s.d||1)); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -img.width/FORT_K/2, -img.height/FORT_K/2, img.width/FORT_K, img.height/FORT_K);
    if(s.st===FORT_TRAP_ACT){ ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35; ctx.drawImage(glowSprite("255,200,120"), -R*1.3, -R*1.3, R*2.6, R*2.6); }
    ctx.restore();
    return;
  }
  if(it.fortPress!==undefined){
    const i = it.fortPress, T = FORT_MAP.traps[i], s = fortS.traps[i], h = _fortPressHeight(T, s);
    const top = T.y - T.hh - h - 60;
    ctx.save();
    // columnas guía
    ctx.fillStyle = "#1a1612"; ctx.fillRect(T.x - T.hw - 12, T.y - T.hh - 230, 10, 230 + T.hh*2); ctx.fillRect(T.x + T.hw + 2, T.y - T.hh - 230, 10, 230 + T.hh*2);
    ctx.fillStyle = "#3a322a"; ctx.fillRect(T.x - T.hw - 12, T.y - T.hh - 230, 3, 230 + T.hh*2); ctx.fillRect(T.x + T.hw + 2, T.y - T.hh - 230, 3, 230 + T.hh*2);
    // bloque de la prensa (semitransparente cuando está arriba, para no tapar a nadie)
    ctx.globalAlpha = h > 20 ? 0.78 : 1;
    ctx.fillStyle = "#2c2824"; ctx.fillRect(T.x - T.hw, top, T.hw*2, T.hh*2 + 60);
    ctx.fillStyle = "#4a443c"; ctx.fillRect(T.x - T.hw, top, T.hw*2, 8);
    ctx.fillStyle = "#171412"; ctx.fillRect(T.x - T.hw, top + T.hh*2 + 52, T.hw*2, 8);
    ctx.fillStyle = "#8a6a22"; for(let x=T.x-T.hw+8; x<T.x+T.hw-8; x+=26) ctx.fillRect(x, top + 26, 12, 6);
    ctx.fillStyle = "#6a6a72"; for(const x of [T.x-T.hw+8, T.x+T.hw-14]) for(const y of [top+12, top+T.hh*2+40]) ctx.fillRect(x, y, 6, 6);
    ctx.restore();
    return;
  }
}
function _fortDrawGate(G, now){
  const g = fortS.gates[G.id], open = g.open;
  const x0 = G.cx - G.hw, x1 = G.cx + G.hw, y = G.cy;
  ctx.save();
  // torres laterales
  const towerH = G.kind==="great" ? 170 : 120;
  for(const x of [x0 - 30, x1 + 6]){
    ctx.fillStyle = "#120e0c"; ctx.fillRect(x, y - towerH, 24, towerH + 12);
    ctx.fillStyle = FORT_PAL.wallLit; ctx.fillRect(x + 2, y - towerH, 20, towerH + 10);
    ctx.fillStyle = "#4a3e35"; ctx.fillRect(x + 2, y - towerH, 6, towerH + 10);
    for(let yy = y - towerH + 10; yy < y + 10; yy += 12){ ctx.fillStyle = "#1a1410"; ctx.fillRect(x + 2, yy, 20, 2); }
    ctx.fillStyle = "#2a211b"; ctx.fillRect(x - 3, y - towerH - 10, 30, 12);
    for(let k=0;k<3;k++){ ctx.fillStyle = FORT_PAL.wall; ctx.fillRect(x - 3 + k*11, y - towerH - 18, 7, 8); }
  }
  // dintel
  ctx.fillStyle = "#1e1814"; ctx.fillRect(x0 - 8, y - towerH + 4, x1 - x0 + 16, 22);
  ctx.fillStyle = "#3a2f27"; ctx.fillRect(x0 - 8, y - towerH + 4, x1 - x0 + 16, 3);
  if(G.kind==="portcullis" || G.kind==="great"){
    // rastrillo: sube con `open`
    const H = towerH - 26, lift = open*H*0.92;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y - towerH + 26, x1 - x0, H + 16); ctx.clip();
    const by = y - towerH + 26 - lift;
    ctx.fillStyle = G.kind==="great" ? "#2a1a14" : "rgba(0,0,0,0)";
    if(G.kind==="great"){
      // puerta doble de hierro oxidado (se abre hacia arriba igual, como una compuerta)
      ctx.fillStyle = "#3a2218"; ctx.fillRect(x0, by, x1 - x0, H + 12);
      ctx.fillStyle = FORT_PAL.rust; for(let xx = x0 + 6; xx < x1 - 6; xx += 22) ctx.fillRect(xx, by, 6, H + 12);
      ctx.fillStyle = "#6a6a72"; for(let yy = by + 14; yy < by + H; yy += 30) ctx.fillRect(x0, yy, x1 - x0, 4);
      ctx.fillStyle = "#b08040"; ctx.beginPath(); ctx.arc((x0+x1)/2, by + H*0.5, 12, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = "#26262a";
      for(let xx = x0 + 6; xx < x1; xx += 18) ctx.fillRect(xx, by, 5, H + 12);
      for(let yy = by + 10; yy < by + H + 10; yy += 22) ctx.fillRect(x0, yy, x1 - x0, 4);
      ctx.fillStyle = "#5a5a62"; for(let xx = x0 + 6; xx < x1; xx += 18) ctx.fillRect(xx, by, 2, H + 12);
      ctx.fillStyle = "#6a6a72"; for(let xx = x0 + 5; xx < x1; xx += 18){ ctx.beginPath(); ctx.moveTo(xx, by + H + 12); ctx.lineTo(xx + 3, by + H + 20); ctx.lineTo(xx + 6, by + H + 12); ctx.fill(); }
    }
    ctx.restore();
  } else if(G.kind==="blast"){
    if(open < 0.5){
      ctx.fillStyle = "#2a2622"; ctx.fillRect(x0, y - towerH + 26, x1 - x0, towerH - 16);
      ctx.fillStyle = "#4a443c"; ctx.fillRect(x0, y - towerH + 26, x1 - x0, 5);
      ctx.fillStyle = "#8a6a22"; for(let k=0;k<5;k++){ ctx.save(); ctx.translate(x0 + 20 + k*(x1-x0-40)/4, y - 40); ctx.rotate(0.6); ctx.fillRect(-18, -4, 36, 8); ctx.restore(); }
      ctx.fillStyle = "#6a6a72"; for(let xx = x0 + 10; xx < x1; xx += 24) for(const yy of [y - towerH + 36, y - 10]) ctx.fillRect(xx, yy, 5, 5);
      // brillo del horno detrás (se nota que algo empuja)
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.25 + 0.15*Math.sin(now*3);
      ctx.drawImage(glowSprite("255,110,30"), G.cx - 120, y - 120, 240, 160);
    } else {
      // restos de la compuerta volada
      ctx.fillStyle = "#1e1a16";
      for(const [dx, dy, w, h] of [[-G.hw, -towerH+30, 26, 60], [G.hw-26, -towerH+30, 26, 70], [-G.hw+30, -20, 30, 14], [G.hw-60, -10, 36, 12]]) ctx.fillRect(G.cx + dx, y + dy, w, h);
      ctx.fillStyle = "#6a3a22"; ctx.fillRect(G.cx - G.hw, y - towerH + 30, 6, 60); ctx.fillRect(G.cx + G.hw - 6, y - towerH + 30, 6, 70);
    }
  }
  ctx.restore();
}

/* ---------------- capa superior (sobre las entidades) ---------------- */
function fortDrawTop(){
  if(!fortS) return;
  const now = animNow/1000;
  // cadenas del Carcelero, rayos de reparación de la Araña, brillo de Sobrepresión/Sobrecarga
  for(const e of enemies){
    if(!e.alive || !inView(e.x, e.y, 500)) continue;
    if(e.fortChain) _fortDrawChain(e.x, e.y - 30, e.fortChain.x, e.fortChain.y - 14, 1, true);
    if(e.fortRepair && e.fortRepair.tgt && e.fortRepair.tgt.alive){
      const m = e.fortRepair.tgt, j = Math.sin(now*30)*3;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,200,90,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x, e.y - 20); ctx.quadraticCurveTo((e.x+m.x)/2 + j, (e.y+m.y)/2 - 40, m.x, m.y - 40); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,220,0.9)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.globalAlpha = 0.6; ctx.drawImage(glowSprite("255,200,90"), m.x - 30, m.y - 70, 60, 60);
      ctx.restore();
    }
    const glow = e.fortOverload ? "255,220,160" : (e.fortOver > 0 ? "255,110,50" : (e.fortCounter ? "150,200,255" : null));
    if(glow){
      const r = e.radius*2.2*(0.9 + 0.1*Math.sin(now*9));
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.45;
      ctx.drawImage(glowSprite(glow), e.x - r, e.y + (e.hover||0) - e.radius*1.4 - r, r*2, r*2); ctx.restore();
    }
    // Aliento de Forja en curso: el chorro de fuego sigue el ángulo real del barrido
    if(e.fortBreath && e.fortBreath.ca!==undefined){
      const B = e.fortBreath, a = B.ca;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const oy = (e.hover||0)*0.3;
      const g2 = ctx.createRadialGradient(e.x, e.y + oy, 20, e.x, e.y + oy, B.r);
      g2.addColorStop(0, "rgba(255,240,180,0.75)"); g2.addColorStop(0.5, "rgba(255,120,30,0.45)"); g2.addColorStop(1, "rgba(255,60,10,0)");
      ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(e.x, e.y + oy); ctx.arc(e.x, e.y + oy, B.r, a - 0.3, a + 0.3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  // columnas de vapor activas
  if(fortS.traps) for(let i=0;i<FORT_MAP.traps.length;i++){
    const T = FORT_MAP.traps[i], s = fortS.traps[i];
    if(T.type!=="steam" || s.st!==FORT_TRAP_ACT || !inView(T.x, T.y, 200)) continue;
    const q = s.t/FORT_CFG.cycle.steam.burstMs, a = q < 0.2 ? q/0.2 : Math.max(0, 1 - (q-0.2)/0.8);
    ctx.save(); ctx.globalAlpha = 0.55*a;
    const img = FORT_FX_IMG.steam_puff_a;
    if(FORT_FX_READY.steam_puff_a){ ctx.imageSmoothingEnabled = false; for(let k=0;k<3;k++){ const h = 70 + k*30; ctx.drawImage(img, T.x - h*0.6, T.y - 30 - k*55 - q*40 - h*0.5, h*1.2, h); } }
    ctx.restore();
  }
  // Caballero fase 3: cadenas que lo sostienen desde los pilares
  if(fortS.knight && fortS.knight.chains){
    const k = enemies.find(o=>o.alive && o.type==="caballero");
    if(k && inView(k.x, k.y, 800)){
      for(const [px, py] of [[-520, -3680], [520, -3680], [-520, -4120], [520, -4120]]){
        _fortDrawChain(px, py - 60, k.x + Math.sign(px)*20, k.y - 70, 0.85, true);
      }
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.3 + 0.15*Math.sin(now*6);
      ctx.drawImage(glowSprite("255,90,50"), k.x - 110, k.y - 190, 220, 220); ctx.restore();
    }
  }
}

/* ---------------- proyectiles propios ---------------- */
function fortDrawProjectile(p){
  if(p.fortSpr!=="fortSpiderBolt" || !FORT_FX_READY.spider_bolt) return false;
  const img = FORT_FX_IMG.spider_bolt, a = Math.atan2(p.vy||0, p.vx||1);
  ctx.save(); ctx.translate(p.x, p.y - 16); ctx.rotate(a); ctx.imageSmoothingEnabled = false;
  const w = 44, h = w*img.height/img.width; ctx.drawImage(img, -w*0.7, -h/2, w, h);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(glowSprite("255,176,64"), -14, -14, 28, 28);
  ctx.restore();
  return true;
}

/* ---------------- minimapa (pantalla) ---------------- */
function fortDrawScreen(){
  if(!fortS || !player || player.duelActive) return;
  const B = FORT_MAP.bounds, mapW = B.x1 - B.x0, mapH = B.y1 - B.y0;
  const H = Math.min(190, VH*0.3), k = H/mapH, W = mapW*k;
  const X = VW - W - 10, Y = Math.max(70, VH*0.16);
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = "rgba(14,8,6,0.72)"; ctx.fillRect(X - 4, Y - 4, W + 8, H + 8);
  ctx.strokeStyle = "rgba(176,128,64,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(X - 4.5, Y - 4.5, W + 9, H + 9);
  const tx = x=>X + (x - B.x0)*k, ty = y=>Y + (y - B.y0)*k;
  for(const s of fortShapes){
    const sec = s.src && s.src.sector;
    ctx.fillStyle = sec===fortS.sector ? "#a08a72" : "#5a4c40";
    ctx.save(); ctx.translate(tx(s.cx), ty(s.cy)); ctx.rotate(s.rot); ctx.fillRect(-s.hw*k, -s.hh*k, Math.max(1.5, s.hw*2*k), Math.max(1.5, s.hh*2*k)); ctx.restore();
  }
  for(const G of FORT_MAP.gates){ if(fortS.gates[G.id].open < 0.6){ ctx.fillStyle = "#c02a2a"; ctx.fillRect(tx(G.cx) - 3, ty(G.cy) - 1.5, 6, 3); } }
  const big = enemies.find(e=>e.alive && (e.rank==="jefe" || e.rank==="subjefe"));
  if(big){ ctx.fillStyle = "#ff5a3d"; ctx.beginPath(); ctx.arc(tx(big.x), ty(big.y), 3.5, 0, Math.PI*2); ctx.fill(); }
  heroes.forEach((h, i)=>{
    ctx.fillStyle = h===player ? "#ffffff" : (h.alive ? (["#4ad0ff","#8effb4","#ffd24a","#ff8ad8"][i%4]) : "#777");
    ctx.beginPath(); ctx.arc(tx(h.x), ty(h.y), h===player ? 3 : 2.4, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}
