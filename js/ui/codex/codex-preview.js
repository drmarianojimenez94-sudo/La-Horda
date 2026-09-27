"use strict";
/* ============================================================
   js/ui/codex/codex-preview.js
   CodexSpritePreview — el componente reutilizable de previews animadas del Códice.
   Dibuja SIEMPRE con el arte y el camino de dibujo reales del juego (drawChampFigure / drawChampPack
   para guardias, animPose + drawEnemyBody para criaturas y jefes, VFX_SPR_EXTRA / SE_FX para efectos):
   no hay sprites propios del Códice. Lo que no tiene arte se muestra con la mejor representación
   existente y queda registrado en LA_HORDA_CODEX_MISSING_ASSETS.md.

   codexPreview(canvas, spec) registra un canvas; un solo bucle (rAF) dibuja los que están a la vista
   (IntersectionObserver) y se apaga solo cuando no queda ninguno. spec:
     kind:  "champ" | "enemy" | "group" | "ambient"
     key:   clase del guardia o tipo de ENEMY_BASE      forms: [tipos] (jefes de varias formas)
     anim:  "idle" | "walk" | "attack" | "cast" | "set" | "skill"
     set:   animación con nombre del atlas (packSet del enemigo o set del CHAMP_PACK)
     skill: {fx, color, vfx, anim, set, pack, extra, dummies}   (demo de habilidad en loop)
     skin:  id de SET_SKINS (preview de la skin aplicada)      silhouette: true (DESCONOCIDO)
     arena: tinte del escenario                                 bg: "stage" | "none"
     scale: multiplicador sobre el ajuste automático
   ============================================================ */
const CODEX_PV = new Map();          // canvas -> preview
let _cxLoopOn = false, _cxLastT = 0;
const CODEX_TINT = {                 // color de la luz del escenario por arena
  ciudad:"150,110,90", fortaleza:"230,120,50", bosque:"110,200,90", micelial:"170,90,220", hielo:"120,200,255",
  acuatica:"60,170,220", minas:"200,170,110", laberinto:"230,180,90", abismo:"150,80,230", infernal:"255,80,40",
  divina:"255,220,140", champ:"255,150,70"
};
const _cxIO = (typeof IntersectionObserver!=="undefined") ? new IntersectionObserver(list=>{
  for(const it of list){ const p = CODEX_PV.get(it.target); if(p) p.vis = it.isIntersecting; }
}, {threshold:0.01}) : null;

function codexPreview(cv, spec){
  let p = CODEX_PV.get(cv);
  if(!p){ p = {cv, vis:!_cxIO}; CODEX_PV.set(cv, p); if(_cxIO) _cxIO.observe(cv); }
  p.spec = Object.assign({anim:"idle", bg:"stage"}, spec || {});
  p.t0 = performance.now(); p.ents = {}; p.fit = null;
  _cxStartLoop();
  return p;
}
function codexPreviewSet(cv, patch){
  const p = CODEX_PV.get(cv); if(!p) return;
  Object.assign(p.spec, patch); p.t0 = performance.now(); p.ents = {}; if(patch.key || patch.form!==undefined || patch.skin!==undefined) p.fit = null;
}
function codexPreviewDrop(cv){ const p = CODEX_PV.get(cv); if(p){ if(_cxIO) _cxIO.unobserve(cv); CODEX_PV.delete(cv); } }
function _cxStartLoop(){
  if(_cxLoopOn) return;
  _cxLoopOn = true; _cxLastT = performance.now();
  const tick = ()=>{
    const now = performance.now(), dt = Math.min(64, now - _cxLastT); _cxLastT = now;
    for(const [cv, p] of CODEX_PV){
      if(!cv.isConnected){ codexPreviewDrop(cv); continue; }
      if(!p.vis || cv.offsetParent===null) continue;
      if(p.spec.fps && now - (p.last||0) < 1000/p.spec.fps) continue;
      p.last = now;
      try{ _cxDraw(p, now, dt); }catch(e){ if(!p.err){ p.err = true; console.warn("codex preview", p.spec && p.spec.key, e); } }
    }
    if(!CODEX_PV.size){ _cxLoopOn = false; return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------------- dibujo ---------------- */
function _cxSize(p){
  const cv = p.cv, r = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(40, Math.round(cv.clientWidth * r)), h = Math.max(40, Math.round(cv.clientHeight * r));
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; p.fit = null; p.buf = null; }
  if(!p.buf){ p.buf = document.createElement("canvas"); p.buf.width = w; p.buf.height = h; }
  return [w, h];
}
function _cxDraw(p, now, dt){
  const [W, H] = _cxSize(p), S = p.spec, g = p.cv.getContext("2d");
  const t = now - p.t0;
  g.setTransform(1,0,0,1,0,0); g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, H);
  if(S.bg !== "none") _cxStage(g, W, H, now, S);
  if(S.kind === "ambient"){
    _cxAmbient(g, W, H, now, S.arena);
    if(S.veil){ // presencia sin forma: ni siquiera la silueta (spoiler)
      g.save(); g.globalAlpha = 0.5 + 0.3*Math.sin(now/600); g.fillStyle = "rgba(200,170,255,0.85)"; g.font = `bold ${Math.round(H*0.3)}px Georgia`;
      g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "rgba(150,90,255,0.9)"; g.shadowBlur = H*0.08; g.fillText("?", W/2, H*0.5); g.restore();
    }
    return;
  }
  // la figura se arma en un buffer: permite la silueta (DESCONOCIDO) y el brillo de borde
  const b = p.buf, bg = b.getContext("2d");
  bg.setTransform(1,0,0,1,0,0); bg.imageSmoothingEnabled = false; bg.clearRect(0, 0, W, H);
  let fx = null;
  if(S.kind === "champ") fx = _cxChampScene(bg, p, W, H, t, dt);
  else if(S.kind === "enemy") fx = _cxEnemyScene(bg, p, W, H, t, dt);
  else if(S.kind === "group") _cxGroupScene(bg, p, W, H, t, dt);
  if(S.silhouette){
    bg.globalCompositeOperation = "source-in"; bg.fillStyle = "#050308"; bg.fillRect(0, 0, W, H);
    bg.globalCompositeOperation = "source-over";
    g.save(); g.globalAlpha = 0.55 + 0.25*Math.sin(now/700); g.filter = "drop-shadow(0 0 6px rgba(160,90,255,0.9))";
    g.drawImage(b, 0, 0); g.restore();
    g.drawImage(b, 0, 0);
    g.fillStyle = "rgba(200,170,255,0.75)"; g.font = `bold ${Math.round(H*0.16)}px Georgia`; g.textAlign = "center";
    g.fillText("?", W/2, H*0.52);
    return;
  }
  g.drawImage(b, 0, 0);
  if(fx) fx(g);
}

// Escenario: luz de la arena, piso con círculo rúnico que gira despacio, brasas que suben.
function _cxStage(g, W, H, now, S){
  const tint = CODEX_TINT[S.arena] || CODEX_TINT.champ;
  g.fillStyle = "#0a0605"; g.fillRect(0, 0, W, H);
  const gr = g.createRadialGradient(W/2, H*0.66, 4, W/2, H*0.66, Math.max(W, H)*0.72);
  gr.addColorStop(0, `rgba(${tint},0.26)`); gr.addColorStop(0.55, `rgba(${tint},0.07)`); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const fy = H*0.86, R = Math.min(W*0.42, H*0.9);
  g.save(); g.translate(W/2, fy); g.scale(1, 0.3);
  g.strokeStyle = `rgba(${tint},0.34)`; g.lineWidth = Math.max(1.5, H/140);
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI*2); g.stroke();
  g.setLineDash([R*0.08, R*0.06]); g.lineDashOffset = -now/60;
  g.beginPath(); g.arc(0, 0, R*0.82, 0, Math.PI*2); g.stroke(); g.setLineDash([]);
  g.rotate(now/9000);
  for(let i = 0; i < 8; i++){ // runas
    const a = i/8*Math.PI*2; g.save(); g.rotate(a); g.translate(R*0.91, 0);
    g.fillStyle = `rgba(${tint},${0.25 + 0.2*Math.sin(now/500 + i)})`; g.fillRect(-R*0.012, -R*0.05, R*0.024, R*0.1); g.restore();
  }
  g.restore();
  for(let i = 0; i < 12; i++){ // brasas / motas
    const k = (i*97.13) % 1, ph = ((now/ (3800 + i*260)) + k) % 1;
    const x = W*(0.1 + ((i*0.618) % 0.8)), y = fy - ph*H*0.8;
    g.fillStyle = `rgba(${tint},${(1-ph)*0.55})`; const s = Math.max(1.5, H/150);
    g.fillRect(Math.round(x + Math.sin(now/900 + i)*H*0.03), Math.round(y), s, s);
  }
}
// Arte ambiental de las arenas (encima de la imagen panorámica): nieve, brasas, esporas, burbujas...
const CODEX_AMBIENT = {
  fortaleza:{c:"255,150,60", n:18, up:true}, bosque:{c:"170,240,140", n:14, up:false, drift:true}, micelial:{c:"210,140,255", n:22, up:true},
  hielo:{c:"235,248,255", n:26, up:false}, acuatica:{c:"170,230,255", n:18, up:true, ring:true}, laberinto:{c:"240,210,150", n:14, up:false, drift:true},
  abismo:{c:"170,110,255", n:18, up:true}, infernal:{c:"255,120,50", n:26, up:true}, divina:{c:"255,235,170", n:18, up:true},
  ciudad:{c:"190,170,160", n:14, up:false, drift:true}, minas:{c:"230,200,140", n:10, up:false, drift:true}
};
function _cxAmbient(g, W, H, now, arena){
  const A = CODEX_AMBIENT[arena] || CODEX_AMBIENT.fortaleza;
  for(let i = 0; i < A.n; i++){
    const sp = 5200 + (i*631)%4200, ph = ((now/sp) + (i*0.37)%1) % 1;
    const x = W*(((i*0.618) + (A.drift ? now/60000 : 0)) % 1) + Math.sin(now/1300 + i)*W*0.02;
    const y = A.up ? H*(1 - ph) : H*ph;
    const a = Math.sin(ph*Math.PI)*0.8, s = Math.max(1.5, H/110)*(1 + (i%3)*0.4);
    g.fillStyle = `rgba(${A.c},${a})`;
    if(A.ring){ g.strokeStyle = g.fillStyle; g.lineWidth = 1; g.beginPath(); g.arc(x, y, s*1.6, 0, Math.PI*2); g.stroke(); }
    else g.fillRect(Math.round(x), Math.round(y), s, s);
  }
}

/* ---------------- guardias ---------------- */
// Escala de dibujo de guardia para que ocupe ~frac del alto del canvas.
function _cxChampScale(H, frac){ return H*frac/40; }
function _cxDrawChamp(g, key, x, y, sc, t, S, extra){
  const saved = ctx; ctx = g;
  try{
    const ex = Object.assign({_codexSkin: S.skin || undefined}, extra || {});
    if(S.skin === null) ex._codexSkin = null;
    drawChampFigure(g, key, x, y, sc, 1, t, !!ex._moving, ex);
  } finally { ctx = saved; }
}
function _cxChampScene(g, p, W, H, t, dt){
  const S = p.spec, key = S.key;
  if(S.anim === "skill" && S.skill) return _cxSkillScene(g, p, W, H, t, dt);
  const sc = _cxChampScale(H, S.bg === "none" ? 0.95 : 0.74) * (S.scale || 1);
  const x = W/2, y = H*0.88;
  const ex = {};
  if(S.anim === "walk"){ ex._moving = true; }
  else if(S.anim === "attack" || S.anim === "cast"){
    const per = 1100, a = Math.max(0, 460 - (t % per));
    ex.attackAnim = a; ex._aPrev = 1e9; ex._aDur = 460; if(S.anim === "cast") ex._packCastUntil = Infinity;
  } else if(S.anim === "set" && S.set){ ex._codexSet = S.set; ex._codexT = t; ex._codexPack = S.pack; }
  if(S.extra) Object.assign(ex, S.extra);
  _cxDrawChamp(g, key, x, y, sc, t, S, ex);
  return null;
}

/* ---------------- criaturas y jefes ---------------- */
const _cxFitCache = {};
function _cxEnemyType(S){ return (S.forms && S.forms.length) ? S.forms[Math.min(S.forms.length-1, S.form||0)] : S.key; }
function _cxArenaOf(type){ return (typeof codexArenaOfType==="function" && codexArenaOfType(type)) || null; }
function _cxFakeEnemy(type){
  const B = ENEMY_BASE[type] || {};
  return {type, name:B.name, rank:B.rank, x:0, y:0, radius:B.radius||20, hp:100, maxHp:100, dmg:1, speed:B.speed||60,
    color:B.color, fx:1, fy:0, animT:300, attackAnim:0, scale:B.scale||1, alive:true, slowTimer:0, burnTimer:0, bleedTimer:0,
    stunTimer:0, hitFlash:0, packTimer:0, _codex:true};
}
// Dibuja un enemigo con su pose de animación real, en coordenadas del canvas (x, y = pies).
function _cxDrawEnemy(g, e, x, y, k){
  const saved = ctx, sa = currentArena, arena = _cxArenaOf(e.type);
  ctx = g; if(arena) currentArena = arena;
  try{
    g.save(); g.translate(x, y); g.scale(k, k); e.x = 0; e.y = 0;
    if(e.type==="madre_espora" && _cxDrawMother(g, e)){ g.restore(); return; }
    const prof = animProfileOf(e), P = animPose(e, prof, false);
    if(e.type==="angel_corrompido" && typeof hechDrawAngelBack==="function") hechDrawAngelBack(e, P);
    g.save(); animApply(e.x, e.y, P); drawEnemyBody(e); g.restore();
    if(typeof drawBossSkillAnim==="function") drawBossSkillAnim(e);
    if(e.type==="angel_corrompido" && typeof hechDrawAngelFront==="function") hechDrawAngelFront(e);
    g.restore();
  } finally { ctx = saved; currentArena = sa; }
}
// La Madre Espora es parte del escenario del Reino (micDrawWorld): en la partida se dibuja su retrato real
// (mother/mp_full) con respiración, sombrero que late y brazos que se encienden al atacar. Mismo arte acá.
function _cxDrawMother(g, e){
  if(typeof MIC_MP === "undefined" || !MIC_MP_OK.mp_full) return false;
  const img = MIC_MP.mp_full, h = (e.radius||40)*5, w = h*img.width/img.height, k = h/img.height;
  const t = (e.animT||0)/1000, br = 1 + 0.012*Math.sin(t*1.7);
  g.save(); g.scale(br, 2 - br); g.imageSmoothingEnabled = false;
  g.drawImage(img, -w/2, -h, w, h);
  g.globalCompositeOperation = "lighter";
  if(MIC_MP_OK.mp_cap){ g.globalAlpha = 0.12 + 0.1*Math.sin(t*2.2); g.drawImage(MIC_MP.mp_cap, -w/2 + 3*k, -h, MIC_MP.mp_cap.width*k, MIC_MP.mp_cap.height*k); }
  if((e.packSet === "atk" || e.packSet === "cast" || e.attackAnim > 0) && MIC_MP_OK.mp_arm_l){
    const q = e.packTimer > 0 ? Math.sin((1 - e.packTimer/Math.max(1, e.packDur))*Math.PI) : Math.min(1, e.attackAnim/420);
    g.globalAlpha = 0.35*q;
    g.drawImage(MIC_MP.mp_arm_l, -w/2, -h + 130*k, MIC_MP.mp_arm_l.width*k, MIC_MP.mp_arm_l.height*k);
    g.drawImage(MIC_MP.mp_arm_r, -w/2 + 260*k, -h + 130*k, MIC_MP.mp_arm_r.width*k, MIC_MP.mp_arm_r.height*k);
  }
  g.restore();
  return true;
}
// Ajuste automático: se mide una vez la caja real del sprite (píxeles no transparentes) en reposo.
function _cxMeasure(type){
  const c = _cxFitCache[type]; if(c) return c;
  const B = ENEMY_BASE[type]; if(!B) return null;
  const M = 520, cv = document.createElement("canvas"); cv.width = M; cv.height = M;
  const g = cv.getContext("2d"), e = _cxFakeEnemy(type), k0 = Math.min(1, 90/(B.radius||20));
  e.stunTimer = 1;
  _cxDrawEnemy(g, e, M/2, M*0.8, k0);
  let data; try{ data = g.getImageData(0, 0, M, M).data; }catch(err){ return null; }
  let x0 = M, y0 = M, x1 = -1, y1 = -1;
  for(let y = 0; y < M; y += 2) for(let x = 0; x < M; x += 2){
    if(data[(y*M + x)*4 + 3] > 24){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
  }
  if(x1 < 0) return null; // el arte todavía no cargó: se vuelve a medir en el próximo cuadro
  return (_cxFitCache[type] = {w:(x1-x0+2)/k0, h:(y1-y0+2)/k0, cx:((x0+x1)/2 - M/2)/k0, bottom:(y1 - M*0.8)/k0});
}
function _cxEnemyScene(g, p, W, H, t, dt){
  const S = p.spec, type = _cxEnemyType(S);
  if(!ENEMY_BASE[type]) return null;
  if(S.anim === "skill" && S.skill) return _cxBossSkillScene(g, p, W, H, t, dt, type);
  const m = _cxMeasure(type);
  const e = p.ents[type] || (p.ents[type] = _cxFakeEnemy(type));
  if(S.atlas) e.atlasKey = S.atlas; // otra paleta del mismo cuerpo (p.ej. la Bestia del Bosque)
  _cxAnimEnemy(e, S.anim, S.set, t, dt);
  const box = m || {w:(e.radius||20)*2.4, h:(e.radius||20)*3, cx:0, bottom:0};
  const k = Math.min(W*0.78/box.w, H*0.8/box.h) * (S.scale || 1);
  _cxDrawEnemy(g, e, W/2 - box.cx*k, H*0.9 - box.bottom*k, k);
  return null;
}
function _cxAnimEnemy(e, anim, set, t, dt){
  e.animT = (e.animT||0) + dt;
  e.stunTimer = 0; e.attackAnim = 0; e.packTimer = 0; e.packSet = null; e.moving = false;
  if(anim === "idle") e.stunTimer = 1;
  else if(anim === "walk"){ e.moving = true; }
  else if(anim === "attack"){ const per = 1000; e.attackAnim = Math.max(0, 420 - (t % per)); if(e.attackAnim <= 0) e.stunTimer = 1; }
  else if(anim === "set" && set){ const per = 1500; e.packSet = set; e.packDur = 1200; e.packTimer = Math.max(1, 1200 - (t % per)); }
}
function _cxGroupScene(g, p, W, H, t, dt){
  const S = p.spec, list = S.forms || [];
  list.forEach((type, i)=>{
    if(!ENEMY_BASE[type]) return;
    const m = _cxMeasure(type), e = p.ents[type] || (p.ents[type] = _cxFakeEnemy(type));
    _cxAnimEnemy(e, S.anim, null, t + i*250, dt);
    const box = m || {w:60, h:80, cx:0, bottom:0}, cw = W/list.length;
    const k = Math.min(cw*0.9/box.w, H*0.7/box.h);
    _cxDrawEnemy(g, e, cw*(i + 0.5) - box.cx*k, H*0.9 - box.bottom*k, k);
  });
}

/* ---------------- demos de habilidades ---------------- */
// Línea de tiempo (loop de 2,2 s): preparación (0-0,32) → efecto (0,32-0,78) con impacto al ~0,55 → reposo.
const CX_SKILL_LOOP = 2200;
function _cxDummies(p, n){
  if(!p.ents._d){ p.ents._d = []; for(let i = 0; i < n; i++){ const e = _cxFakeEnemy(i%2 ? "zombie" : "esqueleto"); e.fx = -1; p.ents._d.push(e); } }
  return p.ents._d;
}
function _cxSkillScene(g, p, W, H, t, dt){
  const S = p.spec, K = S.skill, q = (t % CX_SKILL_LOOP)/CX_SKILL_LOOP;
  const sc = _cxChampScale(H, 0.5), cx = W*0.3, cy = H*0.88;
  const nd = K.dummies === 0 ? 0 : (K.dummies || 2), dum = _cxDummies(p, nd);
  const tx = W*0.72, ty = H*0.86;
  const hit = q > 0.52 && q < 0.64;
  const ex = Object.assign({}, K.extra || {});
  const casting = q > 0.05 && q < 0.7;
  if(casting){
    if(K.set){ ex._codexSet = K.set; ex._codexT = (q - 0.05)*CX_SKILL_LOOP; ex._codexPack = K.pack; ex._codexFps = K.fps; }
    else { const a = Math.max(0, 520 - (q - 0.05)*CX_SKILL_LOOP); ex.attackAnim = a; ex._aPrev = 1e9; ex._aDur = 520; if(K.anim !== "attack") ex._packCastUntil = Infinity; }
  }
  // desplazamientos (embestidas, parpadeos): el guardia se mueve durante el efecto
  let px = cx;
  if(K.fx === "dash" || K.fx === "charge"){ const k = Math.max(0, Math.min(1, (q - 0.3)/0.25)); px = cx + (tx - cx - W*0.08)*Math.sin(k*Math.PI/2)*(q < 0.8 ? 1 : Math.max(0, 1 - (q-0.8)/0.2)); }
  if(K.fx === "blink"){ px = q > 0.45 && q < 0.85 ? tx - W*0.12 : cx; }
  // objetivos (criaturas reales), con destello y retroceso al impacto
  dum.forEach((e, i)=>{
    e.animT += dt; e.stunTimer = 1; e.hitFlash = hit ? 120 : 0;
    const kb = hit ? W*0.015 : 0;
    const m = _cxMeasure(e.type), box = m || {w:40, h:60, cx:0, bottom:0};
    const k = H*0.36/box.h;
    _cxDrawEnemy(g, e, tx + i*W*0.12 + kb - box.cx*k, ty - i*H*0.05 - box.bottom*k, k);
  });
  if(K.fx === "blink" && q > 0.4 && q < 0.5){ g.save(); g.globalAlpha = 1 - (q - 0.4)/0.1; }
  _cxDrawChamp(g, S.key, px, cy, sc, t, S, ex);
  if(K.fx === "blink" && q > 0.4 && q < 0.5) g.restore();
  const geo = {cx:px, cy:cy - H*0.18, fx:px, fy:cy, tx, ty, W, H, sc};
  return (gg)=>_cxSkillFx(gg, K, q, geo, t);
}
function _cxBossSkillScene(g, p, W, H, t, dt, type){
  const S = p.spec, K = S.skill, q = (t % CX_SKILL_LOOP)/CX_SKILL_LOOP;
  const m = _cxMeasure(type), e = p.ents[type] || (p.ents[type] = _cxFakeEnemy(type));
  if(S.atlas) e.atlasKey = S.atlas;
  const casting = q > 0.05 && q < 0.72;
  _cxAnimEnemy(e, casting ? (K.set ? "set" : "attack") : "idle", K.set, casting ? (q - 0.05)*CX_SKILL_LOOP : 0, dt);
  if(casting && K.set){ e.packSet = K.set; e.packDur = CX_SKILL_LOOP*0.67; e.packTimer = Math.max(1, e.packDur - (q - 0.05)*CX_SKILL_LOOP); }
  const box = m || {w:(e.radius||20)*2.4, h:(e.radius||20)*3, cx:0, bottom:0};
  const k = Math.min(W*0.5/box.w, H*0.7/box.h);
  const bx = W*0.36, by = H*0.9;
  _cxDrawEnemy(g, e, bx - box.cx*k, by - box.bottom*k, k);
  const geo = {cx:bx, cy:by - box.h*k*0.5, fx:bx, fy:by, tx:W*0.76, ty:H*0.86, W, H, sc:k*1.2, vfxScale:0.7};
  return (gg)=>_cxSkillFx(gg, K, q, geo, t);
}
function _cxRgb(c){ return c || "255,190,110"; }
function _cxVfxImgs(key){
  if(typeof VFX_SPR_EXTRA!=="undefined" && VFX_SPR_EXTRA[key] && VFX_SPR_EXTRA[key].ready()) return VFX_SPR_EXTRA[key].imgs;
  if(typeof seFx==="function"){ const im = seFx(key); if(im) return [im]; }
  if(typeof acua2Ready==="function" && typeof ACUA2_IMG!=="undefined" && ACUA2_IMG[key] && acua2Ready(key)) return ACUA2_IMG[key];
  return null;
}
// Hojas de efectos por celdas que el juego ya usa: "axiom:clave" y "skill:clave" (tiras horizontales),
// "asesino:habilidad/clip" (grilla de 84 px). Devuelve el recorte del cuadro que toca en q (0..1).
function _cxAtlasFrame(key, q){
  const i = key.indexOf(":"); if(i < 0) return null;
  const kind = key.slice(0, i), k = key.slice(i + 1);
  if(kind === "axiom" || kind === "skill"){
    const D = kind === "axiom" ? (typeof AXIOM_VFX_DEF!=="undefined" && AXIOM_VFX_DEF[k]) : (typeof SKILL_ATLAS_DEF!=="undefined" && SKILL_ATLAS_DEF[k]);
    const im = kind === "axiom" ? (typeof AXIOM_VFX_IMG!=="undefined" && AXIOM_VFX_IMG[k]) : (typeof SKILL_ATLAS_IMG!=="undefined" && SKILL_ATLAS_IMG[k]);
    if(!D || !im || !im.naturalWidth) return null;
    const n = Math.min(D.frames - 1, Math.floor(q*D.frames));
    return {im, sx:n*D.w, sy:0, sw:D.w, sh:D.h};
  }
  if(kind === "asesino"){
    const [sk, clip] = k.split("/"), A = typeof ASESINO_HAB_ANIM!=="undefined" && ASESINO_HAB_ANIM[sk];
    const im = typeof ASESINO_HAB_IMG!=="undefined" && ASESINO_HAB_IMG[sk];
    const fr = A && A[clip] && A[clip].frames; if(!fr || !im || !im.naturalWidth) return null;
    const f = fr[Math.min(fr.length - 1, Math.floor(q*fr.length))], S = ASESINO_HAB_FRAME;
    return {im, sx:(f % ASESINO_HAB_COLS)*S, sy:Math.floor(f/ASESINO_HAB_COLS)*S, sw:S, sh:S};
  }
  return null;
}
// Secuencias de imágenes sueltas (una por cuadro) que el juego carga por nombre.
function _cxSeqImgs(key){
  const pick = (o, ks)=>{ if(!o) return null; const a = ks.map(x=>o[x]).filter(im=>im && im.naturalWidth); return a.length ? a : null; };
  if(key === "sylvaRain") return pick(typeof SYLVA_RAIN_IMG!=="undefined" && SYLVA_RAIN_IMG, ["f1","f2","f3"]);
  if(key === "sylvaTrap") return pick(typeof SYLVA_TRAP_IMG!=="undefined" && SYLVA_TRAP_IMG, ["f1","f2","f3","f4"]);
  if(key === "sylvaWolf") return pick(typeof WOLF_REAL_IMG!=="undefined" && WOLF_REAL_IMG, ["run","jump","bite"]);
  if(key === "musashiGhost") return pick(typeof MUSASHI_REAL_IMG!=="undefined" && MUSASHI_REAL_IMG, ["ghost1","ghost2","ghost3","ghost4"]);
  return null;
}
function _cxDrawVfx(g, key, x, y, h, q, anchorY){
  const A = _cxAtlasFrame(key, q);
  if(A){
    const w = h*A.sw/A.sh;
    g.save(); g.globalAlpha = q > 0.7 ? (1-q)/0.3 : 1;
    g.drawImage(A.im, A.sx, A.sy, A.sw, A.sh, x - w/2, y - h*(anchorY===undefined ? 0.6 : anchorY), w, h); g.restore();
    return true;
  }
  const imgs = _cxSeqImgs(key) || _cxVfxImgs(key); if(!imgs || !imgs.length) return false;
  const im = imgs[Math.min(imgs.length-1, Math.floor(q*imgs.length))];
  if(!im || !im.naturalWidth) return false;
  const w = h*im.naturalWidth/im.naturalHeight;
  g.save(); g.globalAlpha = q > 0.7 ? (1-q)/0.3 : 1;
  g.drawImage(im, x - w/2, y - h*(anchorY===undefined ? 0.6 : anchorY), w, h); g.restore();
  return true;
}
// Biblioteca de efectos: cada patrón responde a la FORMA real de la habilidad (área, línea, cono...).
function _cxSkillFx(g, K, q, G, t){
  const c = _cxRgb(K.color), W = G.W, H = G.H;
  const e = Math.max(0, Math.min(1, (q - 0.32)/0.46)); // progreso del efecto
  if(q < 0.32 && q > 0.05){ // preparación: brillo en el que lanza
    const a = (q - 0.05)/0.27;
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${c},${0.25*a})`;
    g.beginPath(); g.ellipse(G.fx, G.fy - H*0.02, W*0.07*(1+a), H*0.03*(1+a), 0, 0, Math.PI*2); g.fill(); g.restore();
  }
  if(e <= 0 || e >= 1) return;
  const fade = e > 0.75 ? (1 - e)/0.25 : 1;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const L = Math.max(2, H/90);
  switch(K.fx){
    case "nova": case "spin": case "ult": {
      const R = W*(K.fx==="ult" ? 0.46 : 0.3)*(0.2 + 0.8*e);
      for(let i = 0; i < (K.fx==="ult" ? 3 : 2); i++){
        g.strokeStyle = `rgba(${c},${(0.8 - i*0.25)*fade})`; g.lineWidth = L*(2 - i*0.5);
        g.beginPath(); g.ellipse(G.fx, G.fy - H*0.02, R*(1 - i*0.22), R*0.32*(1 - i*0.22), 0, 0, Math.PI*2); g.stroke();
      }
      if(K.fx === "spin") for(let i = 0; i < 3; i++){ const a = t/90 + i*2.1; g.strokeStyle = `rgba(${c},${0.8*fade})`; g.lineWidth = L*1.4;
        g.beginPath(); g.ellipse(G.fx, G.fy - H*0.14, W*0.16, H*0.07, 0, a, a + 1.4); g.stroke(); }
      if(K.fx === "ult"){ g.fillStyle = `rgba(${c},${0.12*fade})`; g.fillRect(0, 0, W, H); }
      break;
    }
    case "cone": {
      const R = W*0.42*(0.3 + 0.7*e), a0 = -0.55, a1 = 0.55;
      const gr = g.createRadialGradient(G.fx, G.cy, 4, G.fx, G.cy, R); gr.addColorStop(0, `rgba(${c},${0.5*fade})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(G.fx, G.cy); g.arc(G.fx, G.cy, R, a0, a1); g.closePath(); g.fill();
      g.strokeStyle = `rgba(${c},${0.9*fade})`; g.lineWidth = L*1.5; g.beginPath(); g.arc(G.fx, G.cy, R*0.92, a0*0.9, a1*0.9); g.stroke();
      break;
    }
    case "slash": {
      g.strokeStyle = `rgba(${c},${fade})`; g.lineWidth = L*3*(1 - e*0.5);
      g.beginPath(); g.ellipse(G.tx - W*0.03, G.ty - H*0.2, W*0.12, H*0.16, -0.5, -1.4 + e*0.6, 0.4 + e*1.2); g.stroke();
      break;
    }
    case "dash": case "charge": case "line": {
      const x0 = G.fx, x1 = K.fx==="line" ? W*0.98 : G.tx;
      const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(1, `rgba(${c},${0.7*fade})`);
      g.fillStyle = gr; g.fillRect(x0, G.fy - H*0.2, (x1 - x0)*Math.min(1, e*1.6), H*0.12);
      break;
    }
    case "proj": case "chain": {
      const x = G.cx + (G.tx - G.cx)*Math.min(1, e*1.7), y = G.cy + (G.ty - H*0.18 - G.cy)*Math.min(1, e*1.7);
      if(e < 0.6){ g.fillStyle = `rgba(${c},0.95)`; g.beginPath(); g.arc(x, y, L*3, 0, Math.PI*2); g.fill();
        g.strokeStyle = `rgba(${c},0.45)`; g.lineWidth = L*2; g.beginPath(); g.moveTo(G.cx, G.cy); g.lineTo(x, y); g.stroke(); }
      if(K.fx === "chain" && e > 0.5){ g.strokeStyle = `rgba(${c},${fade})`; g.lineWidth = L*1.6; g.beginPath();
        let xx = G.tx, yy = G.ty - H*0.18; g.moveTo(xx, yy);
        for(let i = 1; i <= 6; i++){ xx = G.tx + W*0.12*(i/6); yy = G.ty - H*0.2 - H*0.06*(i/6) + Math.sin(t/40 + i)*H*0.03; g.lineTo(xx, yy); } g.stroke(); }
      if(e > 0.55){ g.fillStyle = `rgba(${c},${0.5*fade})`; g.beginPath(); g.arc(G.tx, G.ty - H*0.18, W*0.08*(e - 0.4), 0, Math.PI*2); g.fill(); }
      break;
    }
    case "zone": case "rain": case "trap": case "wall": {
      const R = W*(K.fx==="trap" ? 0.07 : 0.16), zx = G.tx + W*0.05, zy = G.ty;
      g.strokeStyle = `rgba(${c},${0.9*fade})`; g.lineWidth = L*1.6; g.setLineDash(K.fx==="wall" ? [] : [L*4, L*3]); g.lineDashOffset = -t/30;
      g.beginPath(); g.ellipse(zx, zy, R, R*0.35, 0, 0, Math.PI*2); g.stroke(); g.setLineDash([]);
      g.fillStyle = `rgba(${c},${0.18*fade})`; g.fill();
      if(K.fx === "rain") for(let i = 0; i < 10; i++){ const k = (i*0.61 + t/500) % 1; g.fillStyle = `rgba(${c},0.9)`;
        g.fillRect(zx - R + ((i*0.37)%1)*2*R, zy - H*0.6 + k*H*0.6, L*0.8, H*0.05); }
      if(K.fx === "wall"){ g.fillStyle = `rgba(${c},${0.35*fade})`; for(let i = 0; i < 7; i++){ const a = i/7*Math.PI*2;
        g.fillRect(zx + Math.cos(a)*R - L*2, zy + Math.sin(a)*R*0.35 - H*0.12*e, L*4, H*0.12*e); } }
      break;
    }
    case "buff": case "heal": case "summon": {
      const gr = g.createLinearGradient(0, G.fy, 0, G.fy - H*0.6); gr.addColorStop(0, `rgba(${c},${0.45*fade})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(G.fx - W*0.09, G.fy - H*0.6, W*0.18, H*0.6);
      for(let i = 0; i < 9; i++){ const k = (e + i*0.11) % 1; g.fillStyle = `rgba(${c},${(1-k)*fade})`;
        const s = K.fx==="heal" ? L*2 : L*1.2, x = G.fx - W*0.08 + ((i*0.37)%1)*W*0.16, y = G.fy - k*H*0.55;
        if(K.fx === "heal"){ g.fillRect(x - s, y - s*0.3, s*2, s*0.6); g.fillRect(x - s*0.3, y - s, s*0.6, s*2); } else g.fillRect(x, y, s, s); }
      g.strokeStyle = `rgba(${c},${0.7*fade})`; g.lineWidth = L; g.beginPath(); g.ellipse(G.fx, G.fy, W*0.1*(0.6 + e*0.6), H*0.035*(0.6 + e*0.6), 0, 0, Math.PI*2); g.stroke();
      break;
    }
    case "blink": {
      g.fillStyle = `rgba(${c},${0.5*fade})`; g.fillRect(G.cx - W*0.02, G.fy - H*0.4, W*0.04, H*0.4);
      break;
    }
  }
  g.restore();
  // efecto real (arte del juego) en el punto de impacto, si la habilidad lo tiene
  if(K.vfx){
    const list = Array.isArray(K.vfx) ? K.vfx : [K.vfx];
    const onSelf = K.vfxAt === "self";
    list.forEach((k, i)=>{ _cxDrawVfx(g, k, onSelf ? G.fx : G.tx + i*W*0.06, onSelf ? G.fy : G.ty, H*(K.vfxH || 0.42)*(G.vfxScale || 1), e, onSelf ? 0.9 : 0.8); });
  }
}
