"use strict";
/* ============================================================
   js/enemies/bestias-ai.js
   Conductas de las criaturas de la hoja "IMG 1-3" (Hielo y Bosque). Cada una hace UNA cosa legible,
   con aviso, que encaja con la regla de su arena:
   GÉLIDA — "moverse es sobrevivir"
     Dragoncito de Hielo (élite)  además de sus bolas en arco, se planta y marca un CONO: Aliento de
                                  Escarcha (daño + 1 carga de escarcha). Salir del cono lo esquiva.
     Ángel de Hielo (élite)       Prisma Helado: marca el piso bajo 1-2 guardianes; al cerrarse, quien
                                  siga ahí come daño y 2 cargas de escarcha. Quedarse quieto se paga.
     Hadas de Escarcha (esbirros) llegan de a tres. Si hay un BRASERO encendido cerca, lo rodean y le
                                  ROBAN EL CALOR (se consume mucho más rápido: se ve el hilo de luz).
                                  Si no, revolotean alrededor del guardián y pican de a una. 1-2 golpes.
   RUINAS DEL BOSQUE — "el bosque te caza"
     Cù-Sìth (élite)              Tres Aullidos: marca al guardián más SEPARADO del grupo (anillo), aúlla
                                  tres veces y al tercero salta en línea recta (línea marcada). Salir de
                                  la línea o volver con el grupo antes del salto.
   (La Dama del Bosque conserva cuerpo y conducta; solo su proyectil usa el hechizo verde de la hoja.)
   Todo corre en el anfitrión: los avisos (vfxTelegraph/vfxSprite/floatText) se repiten en los
   invitados y los campos del enemigo viajan en las instantáneas (net-game.js).
   >>> Balance: BESTIA_CFG.
   ============================================================ */
const BESTIA_CFG = {
  dragoncito: {cd:[6500, 8500], first:[2500, 5000], range:230, r:210, arc:0.55, wind:900, mult:1.1},
  angel:      {cd:[7500, 9500], first:[2500, 4500], range:320, r:64, warn:1150, mult:1.1, frost:2, second:420},
  hada:       {stealR:520, perBrazier:3, orbit:44, drain:1.2, swarmR:88, dartMs:650, hitCd:1300, group:2},
  cusith:     {cd:[7000, 9000], first:[2000, 4000], range:430, howlEvery:420, aimMs:600, leapSpd:470, leapMs:480, mult:1.5}
};
// avisos de hielo en azul fuerte: el celeste de siempre casi no se ve sobre el piso helado de la Gélida
const HB_ICE_RGB = "40,110,235";
BOSS_STRIKE_RGB.prisma = HB_ICE_RGB;
const _bRand = (a)=>a[0] + Math.random()*(a[1]-a[0]);
function _bFace(e, x, y){ const dx = x-e.x, dy = y-e.y, d = Math.hypot(dx, dy)||1; e.fx = dx/d; e.fy = dy/d; }
function _bSpd(e, k){ return e.speed*(1-(e.slowAmt||0))*(k||1); }

/* ---------------- Dragoncito de Hielo: Aliento de Escarcha ---------------- */
function bestiaAIDragoncito(e, dt, tgt, dist){
  const C = BESTIA_CFG.dragoncito;
  if(e.dgCd===undefined) e.dgCd = _bRand(C.first);
  if(e.bossWind) return true;                 // cargando el aliento: ni se mueve ni dispara
  e.dgCd -= dt;
  if(e.dgCd > 0 || dist > C.range) return false;
  e.dgCd = _bRand(C.cd);
  const fx = e.fx, fy = e.fy;
  bossSheetPack(e, "atk", C.wind + 520);
  bossWindup(e, C.wind, "bossCast", {shape:1, r:C.r, dx:fx, dy:fy, arc:C.arc, rgb:HB_ICE_RGB}, ()=>{
    e.attackAnim = 420;
    const cosA = Math.cos(C.arc);
    for(const h of heroes){ if(h.alive && inBossCone(e, h, fx, fy, C.r, cosA)) bossHitHero(h, e.dmg*C.mult, {frost:1, from:e}); }
    const a = Math.atan2(fy, fx), left = fx < 0;
    bossSheetFx("hbDragAliento", e.x + fx*C.r*0.5, e.y + fy*C.r*0.5 - e.radius*0.7, C.r*0.62, 560, {rot:left ? a - Math.PI : a, flip:left});
    if(inView(e.x, e.y, 60)) playSfx("hieChill");
  });
  bossSkillLabel(e, "Aliento de Escarcha");
  return true;
}

/* ---------------- Ángel de Hielo y Cristal: Prisma Helado ---------------- */
function bestiaAIAngel(e, dt, tgt, dist){
  const C = BESTIA_CFG.angel;
  if(e.agCd===undefined) e.agCd = _bRand(C.first);
  if(e.agCast > 0){ e.agCast -= dt; return true; }   // se planta mientras canaliza el prisma
  e.agCd -= dt;
  if(e.agCd > 0 || dist > C.range) return false;
  e.agCd = _bRand(C.cd); e.agCast = 650;
  bossSheetPack(e, "cast", 1000);
  // el objetivo y, si hay otro guardián cerca de él, también ese (nunca más de 2)
  const marks = [tgt];
  for(const h of heroes){ if(marks.length < 2 && h.alive && h!==tgt && Math.hypot(h.x-e.x, h.y-e.y) < C.range + 120) marks.push(h); }
  const dmg = e.dmg*C.mult;
  marks.forEach((h, i)=>{
    const x = h.x, y = h.y, warn = C.warn + i*C.second;
    bossStrike(x, y, C.r, warn, dmg, "prisma", {frost:C.frost});
    runLater(warn, ()=>{ bossSheetFx("hbAngelPrisma", x, y + 6, C.r*1.7, 520, {anchorY:0.9}); });
  });
  bossSkillLabel(e, "Prisma Helado");
  if(typeof tutSay==="function" && marks.includes(player)) tutSay("hb_prisma", "PRISMA HELADO: el Ángel marca el piso bajo tus pies. Si seguís ahí cuando se cierra, te llena de escarcha. Movete.", null, 7000);
  return true;
}

/* ---------------- Hadas de Escarcha: robar el calor / enjambre ---------------- */
let _hadaKids = false, _hadaStealSaid = -1e9;
function _hadaBrazier(e, dt){
  if(currentArena!=="hielo" || typeof HIE==="undefined" || !HIE.br || !HIE.br.length) return null;
  const C = BESTIA_CFG.hada;
  if(e.hBr!=null){ const b = HIE.br[e.hBr]; if(b && b.lit) return b; e.hBr = null; }
  e._hSeek = (e._hSeek||0) - dt;
  if(e._hSeek > 0) return null;
  e._hSeek = 1200 + Math.random()*600;
  let best = -1, bd = C.stealR;
  HIE.br.forEach((b, i)=>{
    if(!b.lit) return;
    const d = Math.hypot(b.x-e.x, b.y-e.y); if(d >= bd) return;
    let n = 0; for(const o of enemies) if(o.alive && o!==e && o.hBr===i) n++;
    if(n < C.perBrazier){ bd = d; best = i; }
  });
  if(best < 0) return null;
  e.hBr = best; e.hAng = Math.random()*Math.PI*2;
  return HIE.br[best];
}
function bestiaAIHada(e, dt, tgt, dist){
  const C = BESTIA_CFG.hada;
  e.atkCd = 1e6; e.hCd = (e.hCd||0) - dt;
  const b = _hadaBrazier(e, dt);
  if(b){
    e.hAng = (e.hAng||0) + dt/1000*2.6;
    const gx = b.x + Math.cos(e.hAng)*C.orbit, gy = b.y - 18 + Math.sin(e.hAng)*C.orbit*0.5, gd = Math.hypot(gx-e.x, gy-e.y);
    if(gd > 3) aidEnemyStep(e, gx-e.x, gy-e.y, gd, _bSpd(e, gd > 90 ? 1 : 0.8), dt);
    _bFace(e, b.x, b.y);
    const near = Math.hypot(b.x-e.x, b.y-e.y) < C.orbit + 40;
    e.hSteal = near ? 1 : 0;
    if(near){
      b.fuel -= dt*C.drain;                    // le roba el calor: el brasero se apaga mucho antes
      e._hFx = (e._hFx||0) - dt;
      if(e._hFx <= 0){ e._hFx = 420; if(inView(b.x, b.y, 80)) vfxBurst(b.x, b.y - 34, 2, "ice", 40, 420, 2, 0, -30, 1); }
      if(runElapsedMs - _hadaStealSaid > 20000 && Math.hypot(player.x-b.x, player.y-b.y) < 700){
        _hadaStealSaid = runElapsedMs;
        floatText(b.x, b.y - 80, "¡Las hadas roban el calor!", "crit");
        if(typeof tutSay==="function") tutSay("hb_hadas", "HADAS DE ESCARCHA: le roban el calor al brasero y lo apagan rápido. Un golpe las deshace: espantalas.", null, 7000);
      }
    }
    return true;
  }
  e.hSteal = 0;
  // enjambre: revolotea alrededor del guardián y pica de a una
  if(e.hDart > 0){
    e.hDart -= dt;
    aidEnemyStep(e, tgt.x-e.x, tgt.y-e.y, dist, _bSpd(e, 2.1), dt);
    if(dist <= e.radius + tgt.radius + 6 && e.hCd <= 0){
      e.hCd = C.hitCd; e.hDart = 0; e.attackAnim = 260;
      damageHero(tgt, e.dmg, e);
    }
    return true;
  }
  e.hAng = (e.hAng===undefined ? Math.random()*Math.PI*2 : e.hAng) + dt/1000*1.7;
  const gx = tgt.x + Math.cos(e.hAng)*C.swarmR, gy = tgt.y + Math.sin(e.hAng)*C.swarmR*0.7, gd = Math.hypot(gx-e.x, gy-e.y);
  if(gd > 3) aidEnemyStep(e, gx-e.x, gy-e.y, gd, _bSpd(e), dt);
  _bFace(e, tgt.x, tgt.y);
  if(e.hCd <= 0 && dist < C.swarmR + 50 && Math.random() < dt/900) e.hDart = C.dartMs;
  return true;
}
// hilo de luz fría entre el brasero y el hada que le roba el calor (lo dibuja hieDrawGround)
function hadaDrawSteal(){
  if(typeof HIE==="undefined" || !HIE.br) return;
  for(const e of enemies){
    if(!e.alive || e.type!=="hada_escarcha" || !e.hSteal || e.hBr==null) continue;
    const b = HIE.br[e.hBr]; if(!b || !inView(b.x, b.y, 120)) continue;
    const t = animNow/120 + e.x*0.05, a = 0.45 + 0.3*Math.sin(t);
    ctx.save();
    ctx.strokeStyle = `rgba(170,225,255,${a})`; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -animNow/40;
    ctx.beginPath(); ctx.moveTo(b.x, b.y - 40); ctx.lineTo(e.x, e.y - e.radius*1.4); ctx.stroke();
    ctx.restore();
  }
}

/* ---------------- Cù-Sìth: Tres Aullidos ---------------- */
// el guardián más separado del resto (si juega solo, el más cercano)
function _cuIsolated(e){
  let best = null, bs = -1;
  for(const h of heroes){
    if(!h.alive || h.stealthTimer > 0) continue;
    let near = Infinity; for(const o of heroes){ if(o!==h && o.alive) near = Math.min(near, Math.hypot(o.x-h.x, o.y-h.y)); }
    const s = (near===Infinity ? 0 : near) - Math.hypot(h.x-e.x, h.y-e.y)*0.35;
    if(s > bs){ bs = s; best = h; }
  }
  return best;
}
function bestiaAICuSith(e, dt, tgt, dist){
  const C = BESTIA_CFG.cusith;
  e.atkCd = 1e6; e.cuHit = (e.cuHit||0) - dt;
  if(e.cuCd===undefined) e.cuCd = _bRand(C.first);
  const S = e.cu;
  if(S){
    S.t += dt;
    const m = heroes[S.m];
    if(!m || !m.alive){ e.cu = null; return true; }
    if(S.st==="howl"){
      _bFace(e, m.x, m.y);
      if(S.t >= C.howlEvery*(S.n+1)){
        S.n++;
        bossSheetPack(e, "howl", 300); e.attackAnim = 200;
        vfxShock(e.x, e.y - e.radius*0.8, 8, 70 + S.n*18, "120,240,210", 380, 1);
        vfxTelegraph({shape:0, r:24 + S.n*6, follow:m, dur:C.howlEvery, rgb:"120,240,210"});
        if(inView(e.x, e.y, 60)) floatText(e.x, e.y - e.radius*2.2, S.n < 3 ? "¡Auuu!" : "¡AUUU!", S.n < 3 ? null : "crit");
        if(inView(e.x, e.y, 40)) playSfx("threat");
        if(S.n >= 3){
          const d = Math.hypot(m.x-e.x, m.y-e.y)||1;
          S.st = "aim"; S.t = 0; S.dx = (m.x-e.x)/d; S.dy = (m.y-e.y)/d;
          S.len = Math.min(C.leapSpd*C.leapMs/1000 + 40, d + 60);
          vfxTelegraph({shape:2, r:e.radius + 14, len:S.len, x:e.x, y:e.y, dx:S.dx, dy:S.dy, follow:null, dur:C.aimMs, rgb:"120,240,210"});
        }
      }
      return true;
    }
    if(S.st==="aim"){
      e.fx = S.dx; e.fy = S.dy;
      if(S.t >= C.aimMs){ S.st = "leap"; S.t = 0; S.hit = []; bossSheetPack(e, "atk", C.leapMs); }
      return true;
    }
    // salto: línea recta, pega una vez a cada guardián que toca
    e.x += S.dx*C.leapSpd*dt/1000; e.y += S.dy*C.leapSpd*dt/1000; clampToArena(e);
    e.fx = S.dx; e.fy = S.dy; e.attackAnim = 200;
    for(const h of heroes){
      if(!h.alive || S.hit.includes(h) || Math.hypot(h.x-e.x, h.y-e.y) > e.radius + (h.radius||18) + 8) continue;
      S.hit.push(h);
      bossHitHero(h, e.dmg*C.mult, {slow:0.35, slowDur:1200, from:e});
      bossSheetFx("hbCuMordida", h.x, h.y - 20, 54, 360, {flip:S.dx < 0});
    }
    if(S.t >= C.leapMs){ e.cu = null; e.cuHit = 700; }
    return true;
  }
  e.cuCd -= dt;
  if(e.cuCd <= 0 && dist < C.range){
    const m = _cuIsolated(e) || tgt;
    e.cuCd = _bRand(C.cd);
    e.cu = {st:"howl", t:0, n:0, m:heroes.indexOf(m)};
    if(typeof tutSay==="function" && m===player) tutSay("hb_cusith", "CÙ-SÌTH: aúlla tres veces al guardián más separado y al tercero salta. Volvé con el grupo o salí de la línea.", null, 7000);
    return true;
  }
  // persecución normal + mordida
  if(dist > e.radius + tgt.radius - 4) aidEnemyStep(e, tgt.x-e.x, tgt.y-e.y, dist, _bSpd(e), dt);
  if(dist <= e.radius + tgt.radius + 6 && e.cuHit <= 0){
    e.cuHit = 950; e.attackAnim = 300;
    damageHero(tgt, e.dmg, e);
    if(inView(e.x, e.y, 40)) bossSheetFx("hbCuMordida", e.x + e.fx*e.radius, e.y - e.radius*0.7, 44, 300, {flip:e.fx < 0});
  }
  return true;
}

// Por tipo: true = ya actuó este cuadro (el motor saltea la persecución genérica).
const BESTIA_AI = {dragoncito_hielo:bestiaAIDragoncito, angel_hielo:bestiaAIAngel, hada_escarcha:bestiaAIHada, cu_sith:bestiaAICuSith};

// Al aparecer (spawnEnemy): las hadas llegan en grupo; las del Bosque, cada una con su color.
const HADA_PALETTES = [null, "enjambre_hadas_rosa", "enjambre_hadas_oro"];
function bestiaOnSpawn(e){
  if(e.type==="enjambre_hadas" && !e.atlasKey) e.atlasKey = HADA_PALETTES[(Math.random()*HADA_PALETTES.length)|0] || undefined;
  if(e.type==="hada_escarcha" && !_hadaKids && !e.summonedByRole){
    _hadaKids = true;
    try{
      for(let i=0;i<BESTIA_CFG.hada.group;i++){
        const k = spawnEnemy("hada_escarcha", false, false);
        const a = Math.random()*Math.PI*2;
        k.x = e.x + Math.cos(a)*34; k.y = e.y + Math.sin(a)*24; clampToArena(k);
        k.hAng = a;
      }
    } finally { _hadaKids = false; }
  }
}
function bestiaResetRun(){ _hadaStealSaid = -1e9; }

// Proyectiles con arte de la hoja: lanza de cristal del Ángel, hechizo de la Dama (sprH = alto/radio).
// (el Ángel sigue con la lanza de su propia hoja: csAngelShot)
Object.assign(ENEMY_PROJ_SPRITE, {dama_bosque:"hbDamaHechizo"});
const ENEMY_PROJ_SPRH = {dama_bosque:3.0};
