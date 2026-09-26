"use strict";
/* ============================================================
   js/arenas/micelial/mic-render.js
   Dibujo del Reino Micelial. Todo lo que cambia el juego llega del estado (micS); lo que es solo
   decorativo (crecimiento suave de los hongos, polvillo de esporas, rastros de los Sabuesos) lo
   anima cada cliente con pools fijos (sin crear objetos por cuadro).
   - Fondo pintado (1536x1024) que MADURA con las etapas (violeta/cian -> verde/naranja/rojo) y
     queda desaturado cuando el Reino muere.
   - FUNGAL_NODE: sprites por estado (brote -> maduro -> esporas -> marchito -> muerto).
   - Infección de los núcleos, raíces gigantes, brazos, nubes, alucinaciones, la Madre por partes.
   - Pantalla: oscuridad de la Floración, luces que se apagan al morir, tinte psicodélico, minimapa.
   ============================================================ */
const MIC_FX_NAMES = ["spore_cloud_big","spore_cloud_small","claw_blue_a","claw_blue_b","spore_pile","spore_geyser","spore_puff","boom_big","boom_med","boom_small",
  "green_proj_a","green_proj_b","green_orb","green_orb_trail","root_curl","root_spike_a","root_spike_b","root_spike_c","bite_slash","leap_splat",
  "slash_red_thin","slash_red_triple","burst_red","mush_row_small","mush_row_big","aura_cluster","spore_pillar","root_line","spore_rain_a","spore_rain_b",
  "spore_rain_c","spore_hit_a","spore_hit_b","spore_hit_c","spore_hit_d","nucleo_1","nucleo_2","nucleo_3","nucleo_4","m_proj","m_impact_a","m_impact_b",
  "m_impact_c","m_summon_a","m_summon_b","m_summon_c","m_summon_d","m_cloud_a","m_cloud_b","m_halluc_row","m_laser","m_root_spikes","m_pillar_a","m_pillar_b",
  "nucleo_1_wither","nucleo_1_dead","nucleo_2_wither","nucleo_2_dead","nucleo_3_wither","nucleo_3_dead","nucleo_4_wither","nucleo_4_dead",
  "mush_row_small_wither","mush_row_small_dead","mush_row_big_wither","mush_row_big_dead","spore_pillar_wither","spore_pillar_dead",
  "m_summon_b_wither","m_summon_b_dead","m_summon_c_wither","m_summon_c_dead"];
const MIC_FX = {}, MIC_FX_OK = {};
function _micImg(src, key, store, ok){ const im = new Image(); im.onload = ()=>{ ok[key] = true; }; im.src = src; store[key] = im; return im; }
for(const n of MIC_FX_NAMES) _micImg("assets/sprites/arenas/micelial/fx/"+n+".png", n, MIC_FX, MIC_FX_OK);
const MIC_MP = {}, MIC_MP_OK = {};
for(const n of ["mp_full","mp_cap","mp_arm_l","mp_arm_r"]) _micImg("assets/sprites/arenas/micelial/mother/"+n+".png", n, MIC_MP, MIC_MP_OK);
const MIC_BG = {}, MIC_BG_OK = {};
_micImg("assets/sprites/arenas/micelial/map/map_initial.jpg", "a", MIC_BG, MIC_BG_OK);
_micImg("assets/sprites/arenas/micelial/map/map_mature.jpg", "b", MIC_BG, MIC_BG_OK);
// claves de vfxSprite (se repiten en red como cualquier efecto)
const MIC_FX_GROUND = new Set(["leap_splat","spore_pile","root_line"]);
for(const n of MIC_FX_NAMES) VFX_SPR_EXTRA["mic_"+n] = {imgs:[MIC_FX[n]], ready:()=>!!MIC_FX_OK[n], ground:MIC_FX_GROUND.has(n)};

/* ---------------- estado decorativo local ---------------- */
let _micBlend = 0, _micDeadQ = 0, _micDesat = null, _micPrevNodes = "", _micNodeAt = [], _micNodeFrom = [];
const MIC_MOTES = [], MIC_TRAIL = [];
let _micTrailI = 0, _micTrailT = 0, _micDeadAt = 0;
function micRenderReset(){
  _micBlend = 0; _micDeadQ = 0; _micPrevNodes = ""; _micNodeAt = []; _micNodeFrom = []; _micDeadAt = 0;
  MIC_MOTES.length = 0; for(const t of MIC_TRAIL) t.t = 0;
}
for(let i=0;i<110;i++) MIC_TRAIL.push({x:0, y:0, t:0, c:0});
function micRenderTick(dt){
  if(!micS || !player) return;
  const target = micS.dead ? 1 : [0, 0.35, 0.62, 0.82, 1, 1][micS.stage];
  _micBlend += (target - _micBlend)*Math.min(1, dt/9000);
  if(micS.dead){ if(!_micDeadAt) _micDeadAt = animNow; _micDeadQ = Math.min(1, _micDeadQ + dt/3500); }
  // polvillo de esporas bioluminiscente alrededor de la cámara (se apaga cuando el Reino muere)
  const want = micS.dead ? 0 : (micS.mo.bloom ? 70 : 45);
  if(MIC_MOTES.length < want && Math.random() < dt/60){
    MIC_MOTES.push({x:player.x + (Math.random()-0.5)*1300, y:player.y + (Math.random()-0.5)*900, vx:(Math.random()-0.5)*12, vy:-6 - Math.random()*14, t:0, d:4000 + Math.random()*5000, c:(Math.random()*6)|0, s:1.2 + Math.random()*2});
  }
  let w = 0;
  for(let i=0;i<MIC_MOTES.length;i++){
    const m = MIC_MOTES[i]; m.t += dt; m.x += (m.vx + Math.sin((m.t + i*300)/700)*8)*dt/1000; m.y += m.vy*dt/1000;
    if(m.t < m.d && (!micS.dead || m.t < 600)) MIC_MOTES[w++] = m;
  }
  MIC_MOTES.length = w;
  // rastro bioluminiscente de los Sabuesos
  _micTrailT -= dt;
  if(_micTrailT <= 0){
    _micTrailT = 70;
    for(const e of enemies){
      if(!e.alive || e.type!=="sabueso" || !inView(e.x, e.y, 100)) continue;
      const t = MIC_TRAIL[_micTrailI]; _micTrailI = (_micTrailI + 1) % MIC_TRAIL.length;
      t.x = e.x + (Math.random()-0.5)*8; t.y = e.y + 2; t.t = 1200; t.c = e.sb && e.sb.st==="leap" ? 1 : 0;
    }
  }
  for(const t of MIC_TRAIL) if(t.t > 0) t.t -= dt;
  // transiciones de los hongos (animación suave de crecimiento en cada cliente)
  const s = micS.nodes || "";
  if(s !== _micPrevNodes){
    for(let i=0;i<s.length;i++){
      const a = _micPrevNodes.charCodeAt(i) - 48, b = s.charCodeAt(i) - 48;
      if(a !== b){
        _micNodeAt[i] = animNow; _micNodeFrom[i] = isNaN(a) ? b : a;
        if(b===FN.SPORE && MIC_NODES[i] && inView(MIC_NODES[i].x, MIC_NODES[i].y, 60)) vfxBurst(MIC_NODES[i].x, MIC_NODES[i].y - 50, 7, micS.mo.bloom ? "micHal" : "micSpore", 70, 1100, 3, 0, -40, 1);
      }
    }
    _micPrevNodes = s;
  }
}

/* ---------------- utilidades ---------------- */
function _micView(){ const hw = VW/2/CAM_ZOOM, hh = VH/2/CAM_ZOOM, cy = player.y - CAM_LIFT; return {x0:player.x - hw - 40, x1:player.x + hw + 40, y0:cy - hh - CAM_Y_ANCHOR/CAM_ZOOM - 40, y1:cy + hh + 60}; }
// Tono del Reino según la etapa (el brillo de los hongos acompaña al fondo).
function micStageRgb(){ if(!micS) return "190,90,255"; if(micS.dead) return "150,150,150"; return ["190,90,255","170,120,255","150,230,110","255,150,70","255,90,150","150,150,150"][micS.stage]; }
function micHueRgb(t){ const P = [[60,230,255],[70,110,255],[255,60,220],[160,70,255],[255,110,190],[90,255,150]]; const i = Math.floor(t)%P.length, j = (i+1)%P.length, f = t - Math.floor(t); const c = P[i].map((v,k)=>Math.round(v + (P[j][k]-v)*f)); return c.join(","); }
function _micSpr(name, x, y, h, flip, alpha, anchorY){
  const img = MIC_FX[name]; if(!img || !MIC_FX_OK[name]) return false;
  const w = h*img.width/img.height, ay = anchorY===undefined ? 0.92 : anchorY;
  ctx.save(); if(alpha!==undefined) ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  if(flip){ ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(img, -w/2, -h*ay, w, h); }
  else ctx.drawImage(img, x - w/2, y - h*ay, w, h);
  ctx.restore();
  return true;
}
function _micGlow(x, y, r, rgb, a){ ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a; ctx.drawImage(glowSprite(rgb), x - r, y - r, r*2, r*2); ctx.restore(); }
function _micHash(x, y){ let h = (Math.round(x)*73856093) ^ (Math.round(y)*19349663); return (h>>>0)/4294967296; }
// Frame de un atlas de enemigo (cadáveres, alucinaciones, el Micelio hundiéndose).
function micDrawAtlasFrame(type, set, idx, x, y, h, flip, alpha){
  const P = ENEMY_ATLAS_PACK[type]; if(!P || !P.ready) return;
  const arr = P.sets[set] || P.sets.idle, v = arr[Math.min(arr.length-1, Math.max(0, idx))];
  const s = h/P.refH;
  drawAnimFrameSized(P.atlas, {frames:[{x:(v % P.cols)*P.fw, y:Math.floor(v/P.cols)*P.fh, w:P.fw, h:P.fh}]}, 0, x, y, P.fw*s, P.fh*s, 0.5, P.anchor, flip, alpha);
}
function _micWobblePath(E, k){
  ctx.beginPath();
  for(let i=0;i<=72;i++){ const a = i/72*Math.PI*2, kk = micEdgeK(a)*k; const x = E.cx + Math.cos(a)*E.rx*kk, y = E.cy + Math.sin(a)*E.ry*kk; if(i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath();
}
function _micDesatCanvas(){
  if(_micDesat || !MIC_BG_OK.b) return _micDesat;
  try{
    const img = MIC_BG.b, c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    for(let i=0;i<p.length;i+=4){ const l = (p[i]*0.3 + p[i+1]*0.59 + p[i+2]*0.11)*0.62; p[i] = l*1.02 + 6; p[i+1] = l; p[i+2] = l*0.96; }
    g.putImageData(d, 0, 0); _micDesat = c;
  }catch(err){ _micDesat = null; }
  return _micDesat;
}
function _micDrawBg(img, alpha, V){
  if(alpha <= 0.01) return;
  const S = MIC_IMG.s, W = MIC_WORLD;
  const sx0 = Math.max(0, (V.x0 - W.x0)/S), sy0 = Math.max(0, (V.y0 - W.y0)/S);
  const sx1 = Math.min(img.width, (V.x1 - W.x0)/S), sy1 = Math.min(img.height, (V.y1 - W.y0)/S);
  if(sx1 <= sx0 || sy1 <= sy0) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, sx0, sy0, sx1 - sx0, sy1 - sy0, W.x0 + sx0*S, W.y0 + sy0*S, (sx1 - sx0)*S, (sy1 - sy0)*S);
  ctx.globalAlpha = 1;
}

/* ---------------- mundo (bajo las entidades) ---------------- */
function micDrawWorld(now){
  if(!micS) return;
  const V = _micView();
  ctx.save();
  ctx.fillStyle = "#07040b"; ctx.fillRect(V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100);
  ctx.imageSmoothingEnabled = true;
  if(MIC_BG_OK.a) _micDrawBg(MIC_BG.a, 1, V);
  if(MIC_BG_OK.b) _micDrawBg(MIC_BG.b, _micBlend, V);
  if(micS.dead){ const d = _micDesatCanvas(); if(d) _micDrawBg(d, _micDeadQ, V); }
  ctx.imageSmoothingEnabled = false;
  ctx.restore();
  const t = now;
  const M = micS.mo;
  // latido del capullo (la Madre dormida): brillo que crece con las etapas
  if(M.st==="sleep" || M.st==="stir"){
    const beat = Math.exp(-Math.max(0, runElapsedMs - (M.bt||-9999))/320);
    const base = [0.18, 0.26, 0.36, 0.46, 0.6][micS.stage] || 0.3;
    _micGlow(MIC_MAP.pod.x, MIC_MAP.pod.y - 20, 190 + beat*70, M.st==="stir" ? "255,90,170" : micStageRgb(), (base + beat*0.4)*(micS.mi.st==="dead" && runLevel >= 6 ? 1.25 : 1));
    if(beat > 0.3 && inView(0, 0, 400)){ ctx.save(); ctx.strokeStyle = `rgba(255,140,220,${(beat-0.3)*0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 20, 170 + (1-beat)*260, (170 + (1-beat)*260)*0.62, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
  }
  // raíces que convergen al centro (nivel 10, antes de la revelación)
  if(M.st==="stir" || M.st==="reveal"){
    const q = M.st==="reveal" ? 1 : Math.min(1, M.t/MIC_STIR_MS);
    ctx.save(); ctx.lineCap = "round";
    for(let i=0;i<MIC_MAP.tunnels.length;i++){
      const p = micEdgePoint(MIC_MAP.tunnels[i], 20), ex = p.x + (0 - p.x)*q*0.86, ey = p.y + (40 - p.y)*q*0.86;
      const mx = (p.x + ex)/2 + Math.sin(i*1.7)*80, my = (p.y + ey)/2 + Math.cos(i*2.3)*60;
      ctx.strokeStyle = "rgba(40,16,30,0.9)"; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      ctx.strokeStyle = `rgba(255,110,210,${0.35 + 0.25*Math.sin(t*4 + i)})`; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }
  // cadáveres colonizados (los arrastra el Micelio)
  _micDrawCorpses(t);
  // semillas (puntitos de luz en el piso)
  const nodes = micS.nodes||"";
  for(let i=0;i<MIC_NODES.length;i++){
    if(nodes.charCodeAt(i) - 48 !== FN.SEED) continue;
    const n = MIC_NODES[i]; if(!inView(n.x, n.y, 40)) continue;
    _micGlow(n.x, n.y - 4, 16 + 4*Math.sin(t*3 + n.ph), micStageRgb(), 0.55);
  }
  // territorio infectado de los núcleos (y el que se retira)
  for(const e of enemies){ if(e.alive && e.type==="nucleo_micelial" && e.nuc && inView(e.x, e.y, e.nuc.rr + 40)) _micDrawInfection(e.x, e.y, e.nuc.rr, e.nuc.st, t, 1); }
  for(const z of micS.recede){ const q = 1 - Math.min(1, z.t/MIC_CFG.nucleo.recedeMs); if(q > 0 && inView(z.x, z.y, z.r)) _micDrawInfection(z.x, z.y, z.r*q, 2, t, q); }
  // manchón donde el suelo se tragó al Micelio
  if(micS.mi.st==="sink" || micS.mi.st==="dead"){ const q = micS.mi.st==="sink" ? Math.min(1, micS.mi.t/2600) : 1; _micDrawInfection(micS.mi.x, micS.mi.y, 170*q, 3, t, q*0.8); }
  // raíces de absorción del Micelio (flujo hacia él)
  for(const l of enemies){
    if(!l.alive || l.type!=="raiz_absorcion" || !l.lk || !l.lk.alive) continue;
    const m = l.lk;
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(50,14,40,0.95)"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.quadraticCurveTo((l.x+m.x)/2 + 40, (l.y+m.y)/2 + 30, m.x, m.y); ctx.stroke();
    ctx.strokeStyle = `rgba(255,120,240,${0.6 + 0.3*Math.sin(t*8)})`; ctx.lineWidth = 4; ctx.setLineDash([10, 14]); ctx.lineDashOffset = -t*80; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  // raíces del Micelio arrastrando cadáveres mientras se arma
  if(micS.mi.st==="build"){
    const q = Math.min(1, micS.mi.t/MIC_CFG.micelio.buildMs);
    ctx.save(); ctx.lineCap = "round";
    for(const i of (micS.mi.drag||[])){
      const c = MIC_MAP.corpses[i]; if(!c) continue;
      ctx.strokeStyle = "rgba(46,14,36,0.95)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(micS.mi.x, micS.mi.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      ctx.strokeStyle = `rgba(230,110,255,${0.4 + 0.4*q})`; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
    _micGlow(micS.mi.x, micS.mi.y - 30, 80 + q*80, "220,100,255", 0.3 + q*0.4);
  }
  // raíces gigantes (intervenciones y latigazos de la Madre)
  for(const r of micS.roots) _micDrawGiantRoot(r, t);
  // brazos: sombra que crece antes del golpe
  for(const a of micS.arms){
    if(a.t > a.w + 200 || !inView(a.x, a.y, 200)) continue;
    const q = Math.min(1, a.t/a.w);
    ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.15 + q*0.4})`; ctx.beginPath(); ctx.ellipse(a.x, a.y, 50 + q*90, (50 + q*90)*0.45, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  // nubes: sombra verde en el piso
  for(const c of micS.clouds){
    if(!inView(c.x, c.y, c.r)) continue;
    const q = Math.min(1, c.t/400)*Math.min(1, (c.d - c.t)/700);
    ctx.save(); ctx.globalAlpha = 0.35*q;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, c.k==="big" ? "rgba(200,90,255,0.7)" : "rgba(150,255,110,0.6)"); g.addColorStop(1, "rgba(80,40,120,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r*0.62, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  // Acechador enterrado: tierra removida + brillo tenue (nunca invisible sin aviso)
  for(const e of enemies){
    if(!e.alive || e.type!=="acechador" || !e.micHide || !inView(e.x, e.y, 60)) continue;
    ctx.save(); ctx.fillStyle = "rgba(30,14,24,0.75)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 26, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(170,140,255,${0.45 + 0.3*Math.sin(t*10)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 30 + 6*Math.sin(t*7), 12, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    if(Math.random() < 0.15) vfxBurst(e.x, e.y, 1, "micDust", 40, 400, 2.5, 0, -20, 1);
  }
  // rastro bioluminiscente de los Sabuesos
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for(const tr of MIC_TRAIL){
    if(tr.t <= 0) continue;
    const a = tr.t/1200;
    ctx.fillStyle = tr.c ? `rgba(255,90,120,${0.5*a})` : `rgba(90,255,170,${0.45*a})`;
    ctx.fillRect(tr.x - 2, tr.y - 1, 4, 3);
  }
  ctx.restore();
  // fase 3: la infección cubre la arena desde los bordes (zona segura que se achica)
  if(M.st==="fight" && M.ph===3 && (M.inf||0) > 0) _micDrawSafeZone(t);
  // la Madre: incrustada en el centro, es PARTE del escenario (se dibuja bajo las entidades,
  // así nadie queda tapado por ella aunque camine detrás)
  const mother = micMotherEntity();
  if(mother && inView(MIC_MOTHER_POS.x, MIC_MOTHER_POS.y - 250, 400)) _micDrawMother(mother, t);
  else if((M.st==="dying" || M.st==="dead") && inView(MIC_MOTHER_POS.x, MIC_MOTHER_POS.y - 250, 400)) _micDrawMotherDying(t);
  // borde de la caverna: niebla oscura afuera de lo caminable
  ctx.save();
  ctx.beginPath(); ctx.rect(V.x0 - 60, V.y0 - 60, V.x1 - V.x0 + 120, V.y1 - V.y0 + 120);
  const E = MIC_MAP.ell;
  for(let i=72;i>=0;i--){ const a = i/72*Math.PI*2, kk = micEdgeK(a)*1.02; const x = E.cx + Math.cos(a)*E.rx*kk, y = E.cy + Math.sin(a)*E.ry*kk; if(i===72) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.closePath();
  ctx.fillStyle = "rgba(5,2,9,0.72)"; ctx.fill("evenodd");
  _micWobblePath(E, 1.0);
  ctx.strokeStyle = "rgba(5,2,9,0.45)"; ctx.lineWidth = 50; ctx.stroke();
  ctx.strokeStyle = `rgba(${micStageRgb()},0.18)`; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
function _micDrawInfection(x, y, r, st, t, a){
  if(r < 8) return;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r*0.1, x, y, r);
  g.addColorStop(0, `rgba(70,20,80,${0.55*a})`); g.addColorStop(0.7, `rgba(120,40,140,${0.32*a})`); g.addColorStop(1, "rgba(120,40,140,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r*0.66, 0, 0, Math.PI*2); ctx.fill();
  // venas de micelio (misma forma en todos los clientes: sale de la posición)
  const n = 7 + st*2, seed = _micHash(x, y);
  ctx.lineCap = "round";
  for(let i=0;i<n;i++){
    const a0 = (i/n + seed)*Math.PI*2, len = r*(0.55 + 0.4*((seed*97 + i*0.37)%1));
    const bx = x + Math.cos(a0)*len, by = y + Math.sin(a0)*len*0.66;
    const mx = x + Math.cos(a0 + 0.35)*len*0.5, my = y + Math.sin(a0 + 0.35)*len*0.33;
    ctx.strokeStyle = `rgba(30,8,28,${0.7*a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(220,110,255,${(0.35 + 0.25*Math.sin(t*3 + i))*a})`; ctx.lineWidth = 1.5; ctx.stroke();
  }
  if(st >= 2){ ctx.strokeStyle = `rgba(210,120,255,${(0.35 + 0.2*Math.sin(t*5))*a})`; ctx.lineWidth = 2; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t*20; ctx.beginPath(); ctx.ellipse(x, y, r, r*0.66, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
function _micDrawGiantRoot(r, t){
  const dx = r.x1 - r.x0, dy = r.y1 - r.y0, len = Math.hypot(dx, dy)||1, ang = Math.atan2(dy, dx);
  const inQ = Math.min(1, r.t/220), outQ = Math.min(1, (r.d - r.t)/500), q = Math.max(0, Math.min(inQ, outQ));
  if(q <= 0) return;
  ctx.save();
  ctx.translate(r.x0, r.y0); ctx.rotate(ang);
  const w = r.w*q;
  ctx.fillStyle = "rgba(20,8,14,0.55)"; ctx.fillRect(0, -w*0.7, len*inQ, w*1.4);
  const img = MIC_FX.root_line;
  if(MIC_FX_OK.root_line){
    const th = w*1.9, tw = th*img.width/img.height;
    ctx.imageSmoothingEnabled = false; ctx.globalAlpha = q;
    for(let x=0; x < len*inQ; x += tw*0.85) ctx.drawImage(img, x, -th*0.75, tw, th);
  }
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.3*q*(0.7 + 0.3*Math.sin(t*9));
  ctx.fillStyle = "rgb(230,90,255)"; ctx.fillRect(0, -3, len*inQ, 6);
  ctx.restore();
}
function _micDrawSafeZone(t){
  const K = micSafeK(), C = MIC_SAFE_C, V = _micView();
  ctx.save();
  ctx.beginPath(); ctx.rect(V.x0 - 60, V.y0 - 60, V.x1 - V.x0 + 120, V.y1 - V.y0 + 120);
  ctx.ellipse(C.x, C.y, C.rx*K, C.ry*K, 0, 0, Math.PI*2, true);
  ctx.fillStyle = `rgba(60,10,50,${0.42 + 0.06*Math.sin(t*2)})`; ctx.fill("evenodd");
  ctx.beginPath(); ctx.ellipse(C.x, C.y, C.rx*K, C.ry*K, 0, 0, Math.PI*2);
  ctx.strokeStyle = `rgba(255,90,200,${0.55 + 0.3*Math.sin(t*6)})`; ctx.lineWidth = 5; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t*30; ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}
function _micDrawCorpses(t){
  if(!micS) return;
  const M = micS.mi, building = M.st==="build", q = building ? Math.min(1, M.t/(MIC_CFG.micelio.buildMs*0.68)) : 0;
  for(let i=0;i<MIC_MAP.corpses.length;i++){
    const c = MIC_MAP.corpses[i];
    if(c.from > micS.stage || (micS.corpses & (1<<i))) continue;
    let x = c.x, y = c.y;
    if(building && M.drag && M.drag.includes(i)){ const e = q*q; x = c.x + (M.x - c.x)*e; y = c.y + (M.y - c.y)*e + Math.sin(t*20 + i)*2; }
    if(!inView(x, y, 80)) continue;
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(x, y + 2, 34, 11, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    micDrawAtlasFrame(c.k, "death", 9, x, y + 4, c.k==="hinchado" ? 70 : 50, i%2===1, micS.dead ? 0.55 : 0.85);
    if(!micS.dead){ _micSpr("nucleo_3", x + 14, y, 30, i%2===0, 0.9); _micGlow(x, y - 10, 30, micStageRgb(), 0.25 + 0.1*Math.sin(t*2 + i)); }
  }
}

/* ---------------- piezas altas (ordenadas por profundidad) ---------------- */
function micPushTall(){
  if(!micS) return;
  const s = micS.nodes||"";
  for(let i=0;i<MIC_NODES.length;i++){
    const st = s.charCodeAt(i) - 48, n = MIC_NODES[i];
    if(st===FN.SEED || st===FN.EMPTY || isNaN(st)){ if(!(_micNodeFrom[i]===FN.DEAD && animNow - (_micNodeAt[i]||0) < 700)) continue; }
    if(inView(n.x, n.y - 60, 140)) _entPush(n.y, null, null, null, {arena:1, micNode:i+1});
  }
  for(let i=0;i<micS.giants.length;i++){ const g = micS.giants[i]; if(inView(g.x, g.y - 100, 200)) _entPush(g.y, null, null, null, {arena:1, micGiant:i+1}); }
  if(micS.mi.st==="sink" && inView(micS.mi.x, micS.mi.y, 200)) _entPush(micS.mi.y, null, null, null, {arena:1, micSink:1});
}
function micDrawTall(it, now){
  if(it.micNode) return _micDrawNode(it.micNode - 1, now);
  if(it.micGiant){
    const g = micS.giants[it.micGiant - 1]; if(!g) return;
    const grow = Math.min(1, g.t/1300), dieQ = Math.max(0, Math.min(1, (g.t - (g.d - 2500))/2500));
    const h = 230*(0.15 + 0.85*(1 - Math.pow(1 - grow, 3)));
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(g.x, g.y + 2, 60*grow, 18*grow, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    if(dieQ > 0.5) _micSpr("spore_pillar_dead", g.x, g.y + 6, h, false, 1 - (dieQ - 0.5)*1.4);
    else if(dieQ > 0) _micSpr("spore_pillar_wither", g.x, g.y + 6, h, false);
    else { _micSpr("spore_pillar", g.x, g.y + 6, h, false); _micGlow(g.x, g.y - h*0.8, 80, micS.mo.bloom ? micHueRgb(now*0.6) : "255,120,220", 0.35); }
    return;
  }
  if(it.micSink){
    const M = micS.mi, q = Math.min(1, M.t/MIC_CFG.micelio.sinkMs), h = 190;
    ctx.save();
    ctx.beginPath(); ctx.rect(M.x - 200, M.y - 400, 400, 400 + 6); ctx.clip();
    micDrawAtlasFrame("micelio", "death", 2, M.x, M.y + 6 + h*q*0.9, h, false, 1 - q*0.6);
    ctx.restore();
    return;
  }
}
function _micDrawNode(i, now){
  const n = MIC_NODES[i], K = FN_KINDS[n.kind]; if(!K) return;
  const st = (micS.nodes||"").charCodeAt(i) - 48, from = _micNodeFrom[i], age = animNow - (_micNodeAt[i]||-9999);
  const tw = Math.min(1, age/700);
  const bloom = micS.mo.bloom && micS.mo.st==="fight" && !micS.dead;
  let name, h = K.h*n.s, a = 1;
  if(st===FN.SPROUT){ name = K.grow[0]; h *= 0.42*(0.4 + 0.6*tw); }
  else if(st===FN.GROWN){ name = K.grow[1]; h *= 0.72*(from===FN.SPROUT ? 0.8 + 0.2*tw : 1); }
  else if(st===FN.MATURE || st===FN.SPORE){ name = K.mature; h *= (from===FN.GROWN ? 0.85 + 0.15*tw : 1); }
  else if(st===FN.WITHERED){ name = K.mature + "_wither"; h *= 1 - 0.08*tw; }
  else if(st===FN.DEAD){ name = K.mature + "_dead"; h *= 0.92 - 0.1*tw; }
  else { name = K.mature + "_dead"; h *= 0.8; a = Math.max(0, 1 - age/700); } // desaparece
  const sw = st===FN.SPORE ? 1 + 0.04*Math.sin(now*14 + n.ph) : 1 + 0.015*Math.sin(now*1.6 + n.ph);
  ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(n.x, n.y + 2, h*0.32, h*0.1, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  _micSpr(name, n.x, n.y + 4, h*sw, n.flip, a);
  if(st===FN.MATURE || st===FN.SPORE || (st===FN.GROWN && bloom)){
    const rgb = bloom ? micHueRgb(now*0.5 + i*0.37) : micStageRgb();
    const k = bloom ? 0.55 : (st===FN.SPORE ? 0.4 : 0.22);
    _micGlow(n.x, n.y - h*0.62, h*0.55 + (bloom ? 12*Math.sin(now*4 + i) : 0), rgb, k*(0.8 + 0.2*Math.sin(now*2 + n.ph)));
  }
}

/* ---------------- cuerpos propios (ganchos de drawEnemyBody) ---------------- */
function micDrawEnemyBody(e){
  const t = animNow/1000;
  if(e.type==="nucleo_micelial"){
    if(!e.alive) return true;
    const st = e.nuc ? e.nuc.st : 1, pulse = 1 + 0.04*Math.sin(t*5 + e.x*0.01);
    const glowRgb = st >= 4 ? "255,80,200" : "210,110,255";
    _micGlow(e.x, e.y - 30 - st*6, 40 + st*16, glowRgb, 0.25 + st*0.08 + 0.1*Math.sin(t*4));
    if(st===1) _micSpr("nucleo_3", e.x, e.y + 6, 56*pulse, false);
    else if(st===2) _micSpr("nucleo_2", e.x, e.y + 6, 70*pulse, false);
    else if(st===3) _micSpr("nucleo_1", e.x, e.y + 8, 84*pulse, false);
    else { _micSpr("nucleo_4", e.x, e.y + 2, 128*pulse, false); _micSpr("nucleo_1", e.x, e.y + 10, 90*pulse, false); }
    return true;
  }
  if(e.type==="raiz_absorcion"){
    if(!e.alive) return true;
    _micGlow(e.x, e.y - 30, 44, "255,120,240", 0.4 + 0.2*Math.sin(t*9));
    _micSpr("root_curl", e.x, e.y + 6, 74, e.x < (e.lk ? e.lk.x : 0));
    return true;
  }
  if(e.type==="madre_espora") return true; // es parte del escenario: se dibuja en micDrawWorld
  if(e.type==="micelio"){
    if(!e.alive) return true; // se hunde en micDrawTall
    if(e.micBuild && micS){
      const q = Math.min(1, micS.mi.t/MIC_CFG.micelio.buildMs);
      if(q < 0.55) return true;
      const k = (q - 0.55)/0.45, r0 = e.radius;
      e.radius = r0*(0.35 + 0.65*k);
      ctx.save(); ctx.globalAlpha *= 0.4 + 0.6*k; drawEnemyAtlasPack(e); ctx.restore();
      e.radius = r0;
      return true;
    }
    return false;
  }
  if(e.type==="acechador" && e.micHide){
    ctx.save(); ctx.globalAlpha *= e.micHide===1 ? MIC_CFG.acechador.hideAlpha : 0.75; drawEnemyAtlasPack(e); ctx.restore();
    return true;
  }
  if(e.type==="peregrino" && e.micRooted){
    _micSpr("root_spike_a", e.x - 14, e.y + 8, 30, false, 0.9);
    _micSpr("root_spike_c", e.x + 14, e.y + 8, 28, true, 0.9);
    return false;
  }
  return false;
}
// La Madre: el retrato pintado entero, con partes que se animan encima (sombrero que late,
// brazos que brillan al atacar, corazón expuesto en la fase 3).
const MIC_MOTHER_H = 500, MIC_MOTHER_BASE = 205; // alto dibujado y línea de las raíces (y del mundo)
function _micMotherRect(){ const img = MIC_MP.mp_full, h = MIC_MOTHER_H, w = h*(img && img.width ? img.width/img.height : 395/455); return {w, h, x:MIC_MOTHER_POS.x - w/2, y:MIC_MOTHER_BASE - h}; }
function _micDrawMother(e, t){
  if(!MIC_MP_OK.mp_full) return;
  const M = micS ? micS.mo : {st:"fight", t:0};
  const R = _micMotherRect(), img = MIC_MP.mp_full, k = R.h/img.height;
  let rise = 1;
  if(M.st==="reveal") rise = Math.max(0, Math.min(1, (M.t - 1500)/5500));
  const breathe = 1 + 0.012*Math.sin(t*1.7);
  const lean = e.packSet==="atk" && e.packTimer > 0 ? Math.sin((1 - e.packTimer/Math.max(1, e.packDur))*Math.PI)*0.035 : 0;
  const closed = e.packSet==="trans" && e.packTimer > 0;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(MIC_MOTHER_POS.x, MIC_MOTHER_POS.y + 40, R.w*0.45*rise, 40*rise, 0, 0, Math.PI*2); ctx.fill();
  // subida desde el capullo: se recorta por abajo mientras emerge
  const vis = R.h*rise;
  ctx.beginPath(); ctx.rect(R.x - 60, MIC_MOTHER_BASE - vis, R.w + 120, vis + 4); ctx.clip();
  ctx.translate(MIC_MOTHER_POS.x, MIC_MOTHER_BASE + (1 - rise)*R.h*0.35);
  ctx.scale(breathe*(closed ? 0.93 : 1), (2 - breathe)*(closed ? 0.95 : 1));
  ctx.rotate(lean*(e.fx < 0 ? -1 : 1));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, -R.w/2, -R.h, R.w, R.h);
  // partes vivas (aditivas: no duplican la silueta, solo la encienden)
  ctx.globalCompositeOperation = "lighter";
  if(e.hitFlash > 0){ ctx.globalAlpha = Math.min(0.35, e.hitFlash/300); ctx.drawImage(img, -R.w/2, -R.h, R.w, R.h); }
  const bloom = M.bloom && !micS.dead;
  const capRgb = bloom ? micHueRgb(t*0.7) : "255,120,220";
  if(MIC_MP_OK.mp_cap){ ctx.globalAlpha = 0.12 + 0.1*Math.sin(t*2.2) + (bloom ? 0.18 : 0); ctx.drawImage(MIC_MP.mp_cap, -R.w/2 + 3*k, -R.h, MIC_MP.mp_cap.width*k, MIC_MP.mp_cap.height*k); }
  ctx.globalAlpha = 0.4 + (bloom ? 0.25 : 0); ctx.drawImage(glowSprite(capRgb), -R.w*0.55, -R.h*1.08, R.w*1.1, R.h*0.45);
  const atk = (e.packSet==="atk" || e.packSet==="cast") && e.packTimer > 0;
  if(atk && MIC_MP_OK.mp_arm_l){
    const q = Math.sin((1 - e.packTimer/Math.max(1, e.packDur))*Math.PI);
    ctx.globalAlpha = 0.35*q;
    ctx.drawImage(MIC_MP.mp_arm_l, -R.w/2, -R.h + 130*k, MIC_MP.mp_arm_l.width*k, MIC_MP.mp_arm_l.height*k);
    ctx.drawImage(MIC_MP.mp_arm_r, -R.w/2 + 260*k, -R.h + 130*k, MIC_MP.mp_arm_r.width*k, MIC_MP.mp_arm_r.height*k);
  }
  // corazón expuesto (fase 3): late con el sonido
  if(M.heart || (M.tr && M.tr.to===3)){
    const beat = Math.exp(-Math.max(0, runElapsedMs - (M.bt||-9999))/260), open = M.heart ? 1 : Math.min(1, (M.tr ? M.tr.t : 0)/2400);
    const cx = 0, cy = -R.h + 215*k, r = (34 + 16*beat)*k*open;
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.85*open;
    ctx.fillStyle = "#1a0410"; ctx.beginPath(); ctx.ellipse(cx, cy, r*1.5, r*1.9, 0, 0, Math.PI*2); ctx.fill();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r*1.3);
    g.addColorStop(0, "#ffd0e0"); g.addColorStop(0.3, "#ff3a6a"); g.addColorStop(0.75, "#a0103a"); g.addColorStop(1, "rgba(80,0,30,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, r*1.2, r*1.45, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (0.5 + 0.5*beat)*open;
    ctx.drawImage(glowSprite("255,60,110"), cx - r*4, cy - r*4, r*8, r*8);
  }
  ctx.restore();
}
let _micMotherDark = null;
function _micMotherDarkCanvas(){
  if(_micMotherDark || !MIC_MP_OK.mp_full) return _micMotherDark;
  try{
    const img = MIC_MP.mp_full, c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    for(let i=0;i<p.length;i+=4){ const l = (p[i]*0.3 + p[i+1]*0.59 + p[i+2]*0.11)*0.38; p[i] = l + 4; p[i+1] = l; p[i+2] = l + 3; }
    g.putImageData(d, 0, 0); _micMotherDark = c;
  }catch(err){ _micMotherDark = null; }
  return _micMotherDark;
}
function _micDrawMotherDying(now){
  const M = micS.mo; if(!MIC_MP_OK.mp_full) return;
  const T = M.st==="dead" ? 99999 : M.t, R = _micMotherRect(), img = MIC_MP.mp_full;
  const collapse = Math.max(0, Math.min(1, (T - 4700)/2400));   // la estructura colapsa
  const fade = Math.max(0, Math.min(1, (T - 6600)/2200));       // se desintegra
  if(fade >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - fade;
  ctx.beginPath(); ctx.rect(R.x - 80, R.y - 40, R.w + 160, R.h + 90); ctx.clip();
  ctx.translate(MIC_MOTHER_POS.x, MIC_MOTHER_BASE + collapse*R.h*0.32);
  ctx.scale(1 + collapse*0.08, 1 - collapse*0.18);
  ctx.imageSmoothingEnabled = false;
  // se apaga: fundido hacia una copia oscura y desaturada del retrato (hecha una sola vez)
  const dark = Math.max(0, Math.min(1, (T - 1000)/2500)), dimg = _micMotherDarkCanvas();
  ctx.drawImage(img, -R.w/2, -R.h, R.w, R.h);
  if(dimg && dark > 0){ ctx.globalAlpha *= dark; ctx.drawImage(dimg, -R.w/2, -R.h, R.w, R.h); }
  ctx.restore();
  if(T < 1000){ const beat = 1 - T/1000; _micGlow(MIC_MOTHER_POS.x, MIC_MOTHER_POS.y - 250, 90*beat, "255,60,110", 0.6*beat); }
  if(T > 6600 && T < 9000 && Math.random() < 0.5) vfxBurst(MIC_MOTHER_POS.x + (Math.random()-0.5)*R.w*0.7, MIC_MOTHER_POS.y - Math.random()*R.h*0.8, 2, "micDust", 60, 900, 3, 0, 40, 1);
}

/* ---------------- capa superior ---------------- */
function micDrawTop(){
  if(!micS) return;
  const t = animNow/1000;
  // nubes de esporas (translúcidas, sobre todos)
  for(const c of micS.clouds){
    if(!inView(c.x, c.y, c.r + 60)) continue;
    const q = Math.min(1, c.t/500)*Math.min(1, (c.d - c.t)/900);
    const name = c.k==="big" ? "m_cloud_a" : (c.k==="wall" ? "m_cloud_b" : "spore_cloud_small");
    const h = c.r*(c.k==="small" ? 1.3 : 1.05);
    _micSpr(name, c.x + Math.sin(t*0.7 + c.x)*8, c.y + h*0.35, h, false, 0.55*q, 0.9);
    if(c.k!=="small") _micSpr("spore_cloud_big", c.x - c.r*0.4 + Math.cos(t*0.5)*10, c.y + 10, h*0.7, true, 0.35*q, 0.9);
  }
  // Chamán: aura (anillo violeta) y rayos de regeneración / germinación
  for(const e of enemies){
    if(!e.alive || e.type!=="chaman" || !inView(e.x, e.y, 300)) continue;
    const R = MIC_CFG.chaman.auraR;
    ctx.save();
    ctx.strokeStyle = `rgba(180,110,255,${0.35 + 0.15*Math.sin(t*4)})`; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t*25;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, R, R*0.55, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.45; ctx.drawImage(glowSprite("190,110,255"), e.x - 40, e.y - 150, 80, 80);
    const ch = e.micChan;
    if(ch && ch.k==="regen"){
      ctx.globalAlpha = 0.8;
      for(const o of enemies){
        if(!o.alive || o===e || o.structure || o.hp >= o.maxHp || Math.hypot(o.x-e.x, o.y-e.y) > MIC_CFG.chaman.regenR) continue;
        ctx.strokeStyle = "rgba(90,255,170,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y - 120); ctx.quadraticCurveTo((e.x+o.x)/2, (e.y+o.y)/2 - 90, o.x, o.y - 30); ctx.stroke();
      }
    } else if(ch && ch.k==="germ"){
      const tx = ch.tgt ? ch.tgt.x : ch.x, ty = ch.tgt ? ch.tgt.y : ch.y;
      if(tx!==undefined){ ctx.globalAlpha = 0.85; ctx.strokeStyle = "rgba(230,120,255,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x, e.y - 120); ctx.quadraticCurveTo((e.x+tx)/2 + Math.sin(t*20)*8, (e.y+ty)/2 - 80, tx, ty - 30); ctx.stroke(); }
    }
    ctx.restore();
  }
  // aliados potenciados por el aura
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for(const e of enemies){ if(e.alive && e._micAura > runElapsedMs && inView(e.x, e.y, 40)){ ctx.globalAlpha = 0.35; ctx.drawImage(glowSprite("180,110,255"), e.x - 22, e.y - 12, 44, 24); } }
  ctx.restore();
  // brazos de la Madre que caen desde arriba
  for(const a of micS.arms){
    if(!inView(a.x, a.y, 300)) continue;
    const name = a.s ? "mp_arm_r" : "mp_arm_l", img = MIC_MP[name]; if(!MIC_MP_OK[name]) continue;
    const drop = 260, tHit = a.w, T = a.t;
    let off;
    if(T < tHit - drop) continue;
    else if(T < tHit) off = -650*(1 - (T - (tHit - drop))/drop);
    else if(T < tHit + 450) off = 0;
    else off = -650*Math.min(1, (T - tHit - 450)/450);
    const h = 380, w = h*img.width/img.height;
    ctx.save(); ctx.globalAlpha = T > tHit + 450 ? 1 - Math.min(1, (T - tHit - 450)/450) : 1; ctx.imageSmoothingEnabled = false;
    ctx.translate(a.x, a.y + off); if(a.s) ctx.scale(-1, 1); ctx.rotate(0.25);
    ctx.drawImage(img, -w*0.5, -h*0.92, w, h);
    ctx.restore();
  }
  // alucinaciones: translúcidas, sin sombra, borde que cambia de color y ondulan
  if(micS.hal.length && MIC_FX_OK.m_halluc_row){
    const img = MIC_FX.m_halluc_row, cuts = [[0,50],[50,105],[105,150],[150,190],[190,239]];
    for(let i=0;i<micS.hal.length;i++){
      const z = micS.hal[i]; if(!inView(z.x, z.y, 80)) continue;
      const q = Math.min(1, z.t/500)*Math.min(1, (z.d - z.t)/600), cut = cuts[i % cuts.length], sw = (cut[1] - cut[0])/img.width*img.width;
      const h = 90, w = h*sw/img.height, wob = Math.sin(t*6 + i)*4;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.42*q; ctx.drawImage(img, cut[0], 0, sw, img.height, z.x - w/2 + wob, z.y - h*0.95, w, h);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35*q;
      ctx.drawImage(img, cut[0], 0, sw, img.height, z.x - w/2 - wob + 3, z.y - h*0.95, w, h);
      ctx.drawImage(glowSprite(micHueRgb(t + i)), z.x - 40, z.y - 90, 80, 80);
      ctx.restore();
    }
  }
  // polvillo de esporas flotando
  if(MIC_MOTES.length){
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const bloom = micS.mo.bloom;
    for(let i=0;i<MIC_MOTES.length;i++){
      const m = MIC_MOTES[i], a = Math.min(1, m.t/600)*Math.min(1, (m.d - m.t)/800);
      ctx.fillStyle = bloom ? `rgba(${micHueRgb(t*0.4 + m.c)},${0.7*a})` : `rgba(${micStageRgb()},${0.55*a})`;
      ctx.fillRect(m.x, m.y, m.s, m.s);
    }
    ctx.restore();
  }
}

/* ---------------- proyectiles propios ---------------- */
function micDrawProjectile(p){
  const name = (p.fortSpr||"").replace(/^mic_/, "");
  const img = MIC_FX[name==="green_proj" ? (p.big ? "green_proj_b" : "green_proj_a") : name];
  const key = name==="green_proj" ? (p.big ? "green_proj_b" : "green_proj_a") : name;
  if(!img || !MIC_FX_OK[key]) return false;
  const a = Math.atan2(p.vy||0, p.vx||1);
  ctx.save(); ctx.translate(p.x, p.y - 16); ctx.imageSmoothingEnabled = false;
  if(key==="green_orb"){ const s = 30 + 3*Math.sin(animNow/60); ctx.drawImage(img, -s/2, -s/2, s, s); }
  else { ctx.rotate(a); const w = key==="m_proj" ? 64 : (p.big ? 74 : 58), h = w*img.height/img.width; ctx.drawImage(img, -w*0.85, -h/2, w, h); }
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(glowSprite(key==="m_proj" ? "255,110,230" : "150,255,90"), -16, -16, 32, 32);
  ctx.restore();
  return true;
}

/* ---------------- cámara: que entre la Madre ---------------- */
// Con la pantalla apaisada (poco alto visible) la cámara se levanta para mostrar a la Madre
// entera, sin dejar al jugador a menos de 150 u del borde de abajo.
function micCamLift(){
  if(!micS || !player) return 0;
  const st = micS.mo.st;
  if(st!=="reveal" && st!=="fight" && st!=="dying") return 0;
  const R = _micMotherRect(), hh = VH/2/CAM_ZOOM;
  if(Math.abs(player.x - MIC_MOTHER_POS.x) > 1000 || player.y > 900) return 0;
  const need = player.y - (R.y - 30) - hh;
  return Math.max(0, Math.min(need, hh - 130));
}

/* ---------------- pantalla ---------------- */
function micDrawScreen(){
  if(!micS || !player) return;
  const M = micS.mo, now = runElapsedMs;
  ctx.save();
  // latido del nivel 10 y de la fase 3: viñeta que pulsa
  if(M.st==="stir" || (M.st==="fight" && M.ph===3)){
    const beat = Math.exp(-Math.max(0, now - (M.bt||-9999))/300);
    const g = ctx.createRadialGradient(VW/2, VH/2, Math.min(VW, VH)*0.35, VW/2, VH/2, Math.max(VW, VH)*0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(${M.st==="stir" ? "40,0,30" : "90,0,40"},${0.35 + 0.3*beat})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  // Floración: la paleta psicodélica tiñe todo
  if(M.bloom && M.st==="fight"){
    ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.22;
    ctx.fillStyle = `rgb(${micHueRgb(now/1600)})`; ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }
  // casi oscuridad (cambio a la Floración): 1-2 s
  if(M.dark){
    const dt = now - M.dark, D = MIC_CFG.madre.darkMs;
    const a = dt < 0 ? 0 : (dt < 200 ? dt/200 : (dt < D ? 1 : Math.max(0, 1 - (dt - D)/500)));
    if(a > 0){ ctx.fillStyle = `rgba(2,0,4,${0.9*a})`; ctx.fillRect(0, 0, VW, VH); }
  }
  // se apagan las luces del Reino (muerte)
  if(M.st==="dying" || M.st==="dead" || micS.dead){
    const T = M.st==="dying" ? M.t : 99999;
    const a = Math.min(0.5, Math.max(0, (T - 1000)/2000)*0.5);
    ctx.fillStyle = `rgba(4,4,6,${a})`; ctx.fillRect(0, 0, VW, VH);
  }
  ctx.restore();
  if(!player.duelActive) _micMinimap();
}
function _micMinimap(){
  const E = MIC_MAP.ell, W = Math.min(150, VW*0.26), k = W/(E.rx*2), H = E.ry*2*k;
  const X = VW - W - 12, Y = Math.max(70, VH*0.16), cx = X + W/2, cy = Y + H/2;
  const tx = x=>cx + (x - E.cx)*k, ty = y=>cy + (y - E.cy)*k;
  ctx.save(); ctx.globalAlpha = 0.8;
  ctx.fillStyle = "rgba(10,4,14,0.7)"; ctx.beginPath(); ctx.ellipse(cx, cy, W/2 + 4, H/2 + 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = `rgba(${micStageRgb()},0.7)`; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = micS.mo.st==="fight" ? "#ff5ad0" : "#8a4a9a"; ctx.beginPath(); ctx.arc(tx(0), ty(0), Math.max(3, MIC_MAP.pod.r*k), 0, Math.PI*2); ctx.fill();
  for(const e of enemies){
    if(!e.alive) continue;
    if(e.type==="nucleo_micelial"){ ctx.fillStyle = "#d070ff"; ctx.beginPath(); ctx.arc(tx(e.x), ty(e.y), 2 + (e.nuc ? e.nuc.st : 1)*0.7, 0, Math.PI*2); ctx.fill(); }
    else if(e.rank==="subjefe" || e.type==="chaman"){ ctx.fillStyle = e.rank==="subjefe" ? "#ff5a3d" : "#b890ff"; ctx.fillRect(tx(e.x) - 2, ty(e.y) - 2, 4, 4); }
  }
  heroes.forEach((h, i)=>{
    ctx.fillStyle = h===player ? "#ffffff" : (h.alive ? (["#4ad0ff","#8effb4","#ffd24a","#ff8ad8"][i%4]) : "#777");
    ctx.beginPath(); ctx.arc(tx(h.x), ty(h.y), h===player ? 3 : 2.4, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}
