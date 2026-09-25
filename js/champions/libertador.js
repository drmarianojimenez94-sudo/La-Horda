"use strict";
/* ============================================================
   js/champions/libertador.js
   EL LIBERTADOR — José de San Martín (clave "libertador").
   Fantasía: DISPARAR -> RECARGAR -> POSICIONARSE -> BAYONETA -> COMANDAR -> CARGAR -> CABALLERÍA.
   Valores: SM_CFG (js/data/champion-tuning.js). Arte: CHAMP_PACK.libertador (a pie) y
   CHAMP_PACK.libertador_horse (a caballo), efectos en SE_FX (tools/art/redraw/build_se.py).

   Estado en el héroe (se sincroniza solo en cooperativo, host autoritativo):
     smShots / smOfficerReady ... Disparo de Oficial (cada SM_CFG.officer.every impactos)
     smPhase ..................... null | "bayo" | "mount" | "charge" | "dismount" | "ultcast" | "andes"
     smPhaseTimer ................ ms de las fases con tiempo (montar/desmontar/levantar el sable)
     smDashLeft/smDashDx/Dy ...... embestidas (Bayoneta, San Lorenzo, Cruce de los Andes)
     smMounted/smMountedTimer .... forma montada (sable corvo) tras el Cruce de los Andes
     smCabralUsed ................ Soldado Cabral (una vez por partida: el héroe se recrea en cada una)
   ============================================================ */
const _smHit = new WeakMap(); // enemigos ya golpeados por la embestida en curso (no se sincroniza)

function smMountedNow(h){ return !!(h.smMounted || h.smPhase==="mount" || h.smPhase==="charge" || h.smPhase==="dismount" || h.smPhase==="andes"); }
function libertadorMoveLocked(h){ return !!h.smPhase; }
function libertadorSpeedMult(h){
  let m = 1;
  if(h.smMounted) m *= 1 + SM_CFG.mounted.speedPct;
  if(h.smCabralSpeedTimer>0) m *= 1 + SM_CFG.cabral.speedPct;
  return m;
}
function libertadorDmgMult(h){ return h.smMounted ? 1 + SM_CFG.mounted.dmgPct : 1; }
function libertadorDmgTakenMult(h){ return h.smMounted ? 1 - SM_CFG.mounted.dmgReduce : 1; }
function libertadorCcResist(h){
  if(h.smPhase==="charge" || h.smPhase==="andes") return SM_CFG.sanLorenzo.ccResist;
  return h.smMounted ? SM_CFG.mounted.ccResist : 0;
}
function smSfx(h, name){ if(h===player || inView(h.x, h.y, 0)) playSfx(name); }

/* ---------------- Fusil de Granadero / Sable corvo (básico) ---------------- */
// Devuelve true si se ocupó del básico (triggerBasic no sigue).
function libertadorBasic(caster, aspd){
  if(caster.smPhase) return true; // embistiendo / montando / levantando el sable: no dispara
  const bot = caster!==player;
  if(caster.smMounted){
    // SABLE CORVO: tajo en arco mientras se desplaza (caballería pesada)
    const M = SM_CFG.mounted;
    const target = nearestEnemyTo(caster, M.sabreRange+20);
    if(bot && !target) return true;
    caster.basicCd = M.sabreCdMs / ((caster.buffAtkSpeedMult||1) * aspd) * (bot ? 1.1 : 1);
    if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
    caster.attackAnim = 260; caster.smAtkTotal = 260;
    const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult")) * M.sabreDmgMult;
    for(const e of enemies){
      if(!e.alive || distance(caster,e) > M.sabreRange + (e.radius||20)*0.5) continue;
      const dx=e.x-caster.x, dy=e.y-caster.y, l=Math.hypot(dx,dy)||1;
      if((dx/l)*caster.fx + (dy/l)*caster.fy < M.sabreArc) continue;
      damageEnemy(e, dmg, {fromBasic:true, src:caster});
    }
    vfxBurst(caster.x+caster.fx*50, caster.y+caster.fy*50-18, 6, "ice", 150, 240, 3, bot?0:1, -10, 0);
    spawnSlash(caster);
    smSfx(caster, "blade");
    return true;
  }
  // FUSIL: disparo lento, rápido, pesado; la recarga es la ventana entre disparos (no se cancela)
  const C = SM_CFG.musket;
  const officer = !!caster.smOfficerReady;
  let target = officer ? seBestTarget(caster, C.range) : nearestEnemyTo(caster, C.range);
  if(bot && !target) return true;
  const reload = C.reloadMs / ((caster.buffAtkSpeedMult||1) * aspd) * (bot ? 1.1 : 1);
  caster.basicCd = reload; caster.smReloadTotal = reload;
  const dir = seAimDir(caster, target);
  caster.fx = dir.x; caster.fy = dir.y;
  caster.attackAnim = 240; caster.smAtkTotal = 240; caster.smRecoilTimer = 140;
  const base = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult")) * C.dmgMult;
  const O = SM_CFG.officer;
  const everyBonus = Math.round(talentSkillMods(caster.classKey, 0).flags.officerEveryMinus||0);
  const p = {x:caster.x+dir.x*26, y:caster.y-16+dir.y*26, vx:dir.x*C.projSpeed, vy:dir.y*C.projSpeed, dmg: officer ? base*O.dmgMult*(1+(talentSkillMods(caster.classKey,0).flags.officerDmgPct||0)) : base,
    life:C.projLife, radius: officer ? 8 : 5, color: officer ? "#ffd66b" : "#fff1c2", fromBasic:true, src:caster, smShot:true, smOfficer:officer};
  let hits = 0;
  if(officer){
    p.pierce = true; p.hitSet = new Set(); p.critChanceOverride = 1; // crítico garantizado sobre el objetivo principal
    p.onHit = ()=>{ hits++; p.critChanceOverride = undefined; if(hits > O.pierce) p.life = 0; };
    caster.smOfficerReady = false; caster.smShots = 0;
  } else {
    p.onHit = ()=>{ if(hits++) return; caster.smShots = (caster.smShots||0)+1;
      if(caster.smShots >= Math.max(2, O.every - everyBonus)){ caster.smOfficerReady = true; caster.smShots = 0;
        if(caster===player) floatText(caster.x, caster.y-70, "¡DISPARO DE OFICIAL!", "crit"); } };
  }
  projectiles.push(p);
  // fogonazo + humo + retroceso
  const mx = caster.x+dir.x*34, my = caster.y-18+dir.y*34;
  vfxBurst(mx, my, officer ? 10 : 6, officer ? "holy" : "spark", 160, 160, 3, bot?0:2, 0, 0);
  vfxBurst(mx, my, officer ? 7 : 4, "stone", 40, 700, 5, bot?0:1, -30, 1);
  if(officer) vfxShock(mx, my, 6, 60, "255,214,107", 260, 1);
  if(caster===player) vfxShake(officer ? 4 : 2);
  smSfx(caster, officer ? "musketOfficer" : "musket");
  return true;
}

/* ---------------- habilidades ---------------- */
function libertadorCast(caster, sk, isUlt, dmg, AREA, DUR){
  const kind = sk.kind;
  if(kind==="sm_bayonet"){
    const B = SM_CFG.bayonet;
    const tgt = nearestEnemyTo(caster, B.dashDist*AREA + 70);
    const d = seAimDir(caster, tgt);
    caster.smPhase = "bayo"; caster.smDashDx = d.x; caster.smDashDy = d.y; caster.fx = d.x; caster.fy = d.y;
    caster.smDashLeft = B.dashDist*AREA; caster.smDashSpeed = B.dashSpeed; caster.smPendingDmg = dmg;
    _smHit.set(caster, new Set());
    smSfx(caster, "blade");
    return;
  }
  if(kind==="sm_granaderos"){
    const G = SM_CFG.granaderos;
    caster.smCmdTimer = G.commandMs;
    const dur = G.durationMs*DUR, R = G.radius*AREA;
    let n = 0;
    for(const h of heroes){
      if(!h.alive || h.isDivineFoe!==caster.isDivineFoe || distance(h, caster) > R) continue;
      h.granTimer = Math.max(h.granTimer||0, dur); n++;
    }
    if(caster.stats) caster.stats.buffsGranted = (caster.stats.buffsGranted||0) + Math.max(0, n-1);
    // Granaderos espectrales: VFX alrededor (sin IA ni colisión)
    for(let i=0;i<5;i++){
      const a = (i/5)*Math.PI*2 + Math.PI/10;
      pushChampFx({type:"spectral", x:caster.x+Math.cos(a)*90, y:caster.y+Math.sin(a)*60, life:1500, maxLife:1500, flip: Math.cos(a) < 0, seed:i});
    }
    pushChampFx({type:"ring", x:caster.x, y:caster.y, r:R, life:600, maxLife:600, color:"#9fc4ff", w:3});
    if(caster===player) showBanner("¡GRANADEROS, A LA CARGA!");
    smSfx(caster, "bugle");
    return;
  }
  if(kind==="sm_san_lorenzo"){
    const L = SM_CFG.sanLorenzo;
    const R = L.chargeDist*AREA;
    let tgt = null;
    if(!caster.aim){ const p = bestClusterPoint(caster, R, 90); if(p) tgt = p; }
    const d = seAimDir(caster, tgt || seBestTarget(caster, R));
    caster.smDashDx = d.x; caster.smDashDy = d.y; caster.fx = d.x; caster.fy = d.y;
    caster.smDashLeft = R; caster.smDashSpeed = L.chargeSpeed; caster.smPendingDmg = dmg;
    _smHit.set(caster, new Set());
    if(caster.smMounted){ caster.smPhase = "charge"; caster.smLorenzoFromMount = true; }
    else { caster.smPhase = "mount"; caster.smPhaseTimer = L.mountMs; caster.smLorenzoFromMount = false; }
    smSfx(caster, "gallop");
    return;
  }
  if(kind==="sm_andes_ult"){
    const A = SM_CFG.andes;
    caster.smPhase = "ultcast"; caster.smPhaseTimer = A.castMs;
    caster.smPendingDmg = dmg; caster.smAndesArea = AREA; caster.smAndesDur = DUR;
    pushChampFx({type:"andes", x:caster.x, y:caster.y, src:caster, life:A.castMs+A.chargeMs+A.frostMs, maxLife:A.castMs+A.chargeMs+A.frostMs, castMs:A.castMs, chargeMs:A.chargeMs});
    if(caster===player || caster.isRemote) showBanner("CRUCE DE LOS ANDES");
    flashScreen(0.28, "200,230,255");
    smSfx(caster, "bugle");
    return;
  }
}

/* ---------------- cada cuadro ---------------- */
function updateLibertador(h, dt){
  if(h.smRecoilTimer>0) h.smRecoilTimer -= dt;
  if(h.smCmdTimer>0) h.smCmdTimer -= dt;
  if(h.smCabralFxTimer>0) h.smCabralFxTimer -= dt;
  if(h.smCabralSpeedTimer>0) h.smCabralSpeedTimer -= dt;
  if(h.smBayoImpTimer>0) h.smBayoImpTimer -= dt;
  if(h.smBayoFinishTimer>0) h.smBayoFinishTimer -= dt;
  if(!h.alive){ libertadorReset(h); return; }
  if(h.smMounted){
    h.smMountedTimer -= dt;
    if(h.smMountedTimer<=0 && !h.smPhase){ h.smMounted = false; h.smPhase = "dismount"; h.smPhaseTimer = SM_CFG.sanLorenzo.dismountMs; if(h===player) floatText(h.x, h.y-70, "Desmonta", null); }
    if(h.moving && Math.random()<0.35) vfxBurst(h.x-(h.fx||0)*20, h.y+4, 1, "sand", 30, 380, 3, 0, -10, 1);
  }
  const ph = h.smPhase; if(!ph) return;
  if(ph==="mount" || ph==="dismount" || ph==="ultcast"){
    h.smPhaseTimer -= dt;
    if(ph==="ultcast" && Math.random()<0.6) vfxBurst(h.x+(Math.random()-0.5)*80, h.y-40-Math.random()*40, 1, "ice", 30, 700, 3, 0, 30, 1);
    if(h.smPhaseTimer>0) return;
    if(ph==="mount"){ h.smPhase = "charge"; return; }
    if(ph==="dismount"){ h.smPhase = null; return; }
    // ultcast -> monta y carga con los Granaderos espectrales
    const A = SM_CFG.andes, AREA = h.smAndesArea||1;
    h.smMounted = true; h.smMountedTimer = SM_CFG.mounted.durationMs*(h.smAndesDur||1); h.smMountedMax = h.smMountedTimer;
    h.smPhase = "andes"; h.smFrostN = 0; h.smDashLeft = A.chargeDist; h.smDashSpeed = A.chargeDist/(A.chargeMs/1000);
    h.smDashDx = h.fx||1; h.smDashDy = h.fy||0;
    const l = Math.hypot(h.smDashDx, h.smDashDy)||1; h.smDashDx/=l; h.smDashDy/=l;
    _smHit.set(h, new Set());
    pushChampFx({type:"riders", x:h.x, y:h.y, dx:h.smDashDx, dy:h.smDashDy, src:h, width:A.width*AREA, life:A.chargeMs+400, maxLife:A.chargeMs+400, n:A.riders});
    smSfx(h, "gallop"); vfxShake(8);
    return;
  }
  // embestidas: Bayoneta ("bayo"), San Lorenzo ("charge"), Cruce de los Andes ("andes")
  const step = Math.min(h.smDashLeft, (h.smDashSpeed||800)*dt/1000);
  const ox = h.x, oy = h.y;
  h.x += h.smDashDx*step; h.y += h.smDashDy*step;
  clampToArena(h); resolveWallCollision(h);
  const moved = Math.hypot(h.x-ox, h.y-oy);
  h.smDashLeft -= step; h.moving = true; h.animT += dt;
  h.fx = h.smDashDx; h.fy = h.smDashDy;
  const hitSet = _smHit.get(h) || new Set(); _smHit.set(h, hitSet);
  let stop = moved < step*0.3; // pared / borde de la arena
  if(ph==="bayo"){
    const B = SM_CFG.bayonet;
    for(const e of enemies){
      if(!e.alive || hitSet.has(e)) continue;
      if(distance(h, e) > (e.radius||20) + h.radius + 14) continue;
      hitSet.add(e);
      damageEnemy(e, h.smPendingDmg||0, {src:h, bleed:true, bleedDur:B.bleedMs});
      seKnock(e, h.smDashDx, h.smDashDy, 14, B.staggerMs);
      if(!isBossRank(e) && !isEliteRank(e)) e.stunTimer = Math.max(e.stunTimer||0, B.staggerMs);
      vfxBurst(e.x, e.y-18, 10, "blood", 140, 360, 3, 1, -30, 0);
      if(!e.alive || e.hp < e.maxHp*B.finishHpPct) h.smBayoFinishTimer = B.finishMs; else h.smBayoImpTimer = 220;
      stop = true; break; // se detiene al conectar
    }
    if(Math.random()<0.5) vfxBurst(h.x, h.y+2, 1, "sand", 40, 300, 3, 0, -10, 1);
  } else {
    const L = SM_CFG.sanLorenzo, A = SM_CFG.andes, isUlt = ph==="andes";
    const width = isUlt ? A.width*(h.smAndesArea||1) : L.width;
    for(const e of enemies){
      if(!e.alive || hitSet.has(e)) continue;
      if(distance(h, e) > width/2 + (e.radius||20)) continue;
      hitSet.add(e);
      // empuje hacia el costado de la carga (y un poco hacia adelante): abre paso
      const sx = e.x-h.x, sy = e.y-h.y, side = (sx*-h.smDashDy + sy*h.smDashDx) >= 0 ? 1 : -1;
      const kx = -h.smDashDy*side*0.8 + h.smDashDx*0.6, ky = h.smDashDx*side*0.8 + h.smDashDy*0.6;
      damageEnemy(e, h.smPendingDmg||0, {src:h});
      if(isBossRank(e)) seVuln(e, isUlt ? A.bossDefDownPct : L.bossDefDownPct, isUlt ? A.bossDefDownMs : L.bossDefDownMs);
      else seKnock(e, kx, ky, isUlt ? A.knockPx : L.knockPx, isUlt ? A.eliteStunMs : L.eliteStunMs);
      vfxBurst(e.x, e.y-14, isUlt?8:5, isUlt?"ice":"sand", 160, 320, 3, 1, -30, 0);
    }
    if(Math.random()<0.8) vfxBurst(h.x-h.smDashDx*30, h.y+4, isUlt?3:2, isUlt?"ice":"sand", 80, 420, 4, 0, -20, 1);
    if(isUlt && (h.smFrostN||0) < SM_CFG.andes.frostPatches && Math.random()<0.25 && ++h.smFrostN) pushChampFx({type:"frost", x:h.x+(Math.random()-0.5)*width*0.8, y:h.y+(Math.random()-0.5)*width*0.5, life:A.frostMs, maxLife:A.frostMs, v:(Math.random()*2)|0});
  }
  if(stop || h.smDashLeft<=0){
    if(ph==="bayo") h.smPhase = null;
    else if(ph==="andes"){ h.smPhase = null; }
    else if(ph==="charge"){
      vfxShock(h.x, h.y, 10, 90, "230,210,170", 300, 1); if(h===player) vfxShake(5);
      if(h.smLorenzoFromMount || h.smMounted){ h.smPhase = null; }
      else { h.smPhase = "dismount"; h.smPhaseTimer = SM_CFG.sanLorenzo.dismountMs; }
    }
  }
}
function libertadorReset(h){
  h.smPhase = null; h.smMounted = false; h.smMountedTimer = 0; h.smDashLeft = 0;
}

/* ---------------- Soldado Cabral (pasiva) ---------------- */
function libertadorPreventDeath(h, src){
  if(h.smCabralUsed) return false;
  h.smCabralUsed = true;
  h.hp = 1;
  const C = SM_CFG.cabral, t = talentSkillMods(h.classKey, "ult").flags;
  h.invulnTimer = Math.max(h.invulnTimer||0, C.invulnMs*(1+(t.cabralInvulnPct||0)));
  h.smCabralSpeedTimer = C.speedMs; h.smCabralFxTimer = 1100;
  pushChampFx({type:"spectral", x:h.x+(src && src.x!==undefined ? Math.sign(src.x-h.x)*40 : 40), y:h.y+4, life:1400, maxLife:1400, flip: !!(src && src.x < h.x), seed:7});
  showBanner("SOLDADO CABRAL");
  vfxShock(h.x, h.y, 8, 90, "159,196,255", 500, 2);
  smSfx(h, "shield");
  return true;
}

/* ---------------- dibujo ---------------- */
function _smFrame(P, set, prog, flip, h, s, alpha, dx){
  const arr = P.sets[set]; if(!arr) return false;
  const n = Math.min(arr.length-1, Math.max(0, Math.floor(prog*arr.length)));
  champPackDrawFrame(P, arr[n], h.x + (dx||0), h.y, s, flip, alpha);
  return true;
}
function drawLibertador(h, drawScale, alpha){
  const P = CHAMP_PACK.libertador, HP = CHAMP_PACK.libertador_horse;
  if(!P || !P.ready) return false;
  const dir = champPackDir(h);
  const s = champPackScale(P, h, drawScale);
  const left = !!h._pleft;
  const ph = h.smPhase;
  // a caballo: los cuadros del caballo están a la misma escala de píxel que los de a pie
  if(HP && HP.ready && smMountedNow(h)){
    const flipH = (h.fx||0) < -0.05 || (Math.abs(h.fx||0) <= 0.05 && left);
    if(ph==="mount") return _smFrame(HP, "mount", 1 - Math.max(0,h.smPhaseTimer)/SM_CFG.sanLorenzo.mountMs, flipH, h, s, alpha);
    if(ph==="dismount") return _smFrame(HP, "dismount", 1 - Math.max(0,h.smPhaseTimer)/SM_CFG.sanLorenzo.dismountMs, flipH, h, s, alpha);
    if(ph==="charge" || ph==="andes") return _smFrame(HP, "charge", ((h.animT||0)/90 % 5)/5, flipH, h, s, alpha);
    if(h.attackAnim>0) return _smFrame(HP, "m_atk", 1 - h.attackAnim/(h.smAtkTotal||260), flipH, h, s, alpha);
    if(h.moving) return _smFrame(HP, "m_run", ((h.animT||0)/110 % 3)/3, flipH, h, s, alpha);
    return _smFrame(HP, "m_idle", 0, flipH, h, s, alpha);
  }
  const side = dir==="side";
  const flip = left;
  if(ph==="ultcast") return _smFrame(P, "ult_cast", 0, flip, h, s, alpha);
  if(ph==="bayo") return _smFrame(P, "bayo_emb", ((h.animT||0)/60 % 4)/4, flip, h, s, alpha);
  if(h.smBayoFinishTimer>0) return _smFrame(P, "bayo_rem", 1 - h.smBayoFinishTimer/SM_CFG.bayonet.finishMs, flip, h, s, alpha);
  if(h.smBayoImpTimer>0) return _smFrame(P, "bayo_imp", 1 - h.smBayoImpTimer/220, flip, h, s, alpha);
  if(h.smCabralFxTimer>0) return _smFrame(P, "cabral", 1 - h.smCabralFxTimer/1100, flip, h, s, alpha);
  if(h.smCmdTimer>0) return _smFrame(P, "command", 1 - h.smCmdTimer/SM_CFG.granaderos.commandMs, flip, h, s, alpha);
  if(h.attackAnim>0 && !h.moving){
    const rec = h.smRecoilTimer>0 ? -(h._pleft?-1:1)*SM_CFG.musket.recoilPx*(h.smRecoilTimer/140) : 0;
    return _smFrame(P, "fire", 1 - h.attackAnim/(h.smAtkTotal||240), flip, h, s, alpha, rec);
  }
  if(h.basicCd>0 && !h.moving && h.smReloadTotal){
    return _smFrame(P, "reload", 1 - h.basicCd/h.smReloadTotal, flip, h, s, alpha);
  }
  return drawChampPack("libertador", h, drawScale, alpha);
}
function libertadorDrawBuffIcon(h){
  const img = seFx("buff_icon_0"+(1+((animNow/140|0)%4)));
  if(!img) return;
  const s = 0.55;
  drawSeImg(img, h.x, h.y - 66*(h.erenTitan ? 2.2 : 1), img.width*s, img.height*s, 0.5, 1, false, 0.75);
}
function libertadorDrawSpectral(f){
  const a = _fxA(f), prog = 1-a;
  const img = seFx("spectral_0"+(1+(((prog*5)|0)+f.seed)%5));
  if(!img) return;
  const s = 0.9;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  drawSeImg(img, f.x + (f.flip?-1:1)*prog*40, f.y, img.width*s, img.height*s, 0.5, 0.92, !!f.flip, Math.min(1, a*1.6)*0.85);
  ctx.restore();
}
// Formación de Granaderos espectrales montados: UNA zona lógica (la del jinete), N dibujos.
function libertadorDrawRiders(f){
  const src = f.src && f.src.x!==undefined ? f.src : f;
  const a = _fxA(f);
  const n = f.n||10, w = f.width||220;
  const px = -f.dy, py = f.dx; // perpendicular a la carga
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(let i=0;i<n;i++){
    const row = i%3, col = (i/3)|0;
    const off = ((col%2?0.5:0) + (i%4) - 1.5)/2*w*0.9;
    const back = 40 + row*55 + col*18;
    const x = src.x + px*off - f.dx*back, y = src.y + py*off - f.dy*back;
    const img = seFx("spectral_0"+(1+((((animNow/110)|0)+i)%5)));
    if(!img) continue;
    drawSeImg(img, x, y, img.width*0.95, img.height*0.95, 0.5, 0.92, f.dx < 0, Math.min(1, a*1.4)*0.7);
  }
  ctx.restore();
}
function libertadorDrawFrost(f){
  const img = seFx(f.v ? "frost_02" : "frost_01"); if(!img) return;
  const a = _fxA(f);
  drawSeImg(img, f.x, f.y, img.width*0.8, img.height*0.5, 0.5, 0.5, false, Math.min(1, a*2)*0.55);
}
// Cruce de los Andes en pantalla: la Cordillera se alza ALREDEDOR del borde (cámara cenital, sin
// horizonte), viento diagonal y nieve. Todo procedural y en espacio de pantalla (sin entidades).
function libertadorDrawAndesScreen(f){
  const total = f.maxLife||1, t = total - f.life, a = Math.min(1, t/400) * Math.min(1, f.life/900);
  if(a<=0) return;
  const W = ctx.canvas.width, H = ctx.canvas.height, u = Math.min(W, H)/400;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha = 0.18*a; ctx.fillStyle = "#cfe6ff"; ctx.fillRect(0,0,W,H);
  // picos nevados sobre los cuatro bordes
  const peaks = (x0, y0, x1, y1, nx, ny, seed)=>{
    const n = 9, len = Math.hypot(x1-x0, y1-y0);
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for(let i=0;i<=n;i++){
      const k = i/n, hgt = (22 + 26*Math.abs(Math.sin(i*2.3+seed)))*u;
      const bx = x0+(x1-x0)*k, by = y0+(y1-y0)*k;
      const mid = i<n ? 0.5/n : 0;
      ctx.lineTo(bx + nx*hgt + (x1-x0)*mid*0.2, by + ny*hgt + (y1-y0)*mid*0.2);
      if(i<n) ctx.lineTo(bx + (x1-x0)*(0.5/n) + nx*hgt*0.35, by + (y1-y0)*(0.5/n) + ny*hgt*0.35);
    }
    ctx.lineTo(x1, y1); ctx.closePath();
    ctx.globalAlpha = 0.72*a; ctx.fillStyle = "#34465e"; ctx.fill();
    ctx.globalAlpha = 0.55*a; ctx.strokeStyle = "#e8f4ff"; ctx.lineWidth = 2*u; ctx.stroke();
  };
  peaks(0, 0, W, 0, 0, 1, 1); peaks(0, H, W, H, 0, -1, 2); peaks(0, 0, 0, H, 1, 0, 3); peaks(W, 0, W, H, -1, 0, 4);
  // viento diagonal + nieve (pseudo-aleatorio estable, sin partículas guardadas)
  ctx.globalAlpha = 0.85*a; ctx.fillStyle = "#ffffff";
  const n = SM_CFG.andes.snow;
  for(let i=0;i<n;i++){
    const sx = ((i*97 + t*0.22*(1+(i%3)*0.4)) % (W+60)) - 30;
    const sy = ((i*57 + t*0.14*(1+(i%5)*0.2)) % (H+60)) - 30;
    const sz = (1 + (i%3))*u;
    ctx.fillRect(sx|0, sy|0, sz, sz);
  }
  ctx.globalAlpha = 0.35*a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = u;
  for(let i=0;i<14;i++){
    const sx = ((i*173 + t*0.6) % (W+200)) - 100, sy = ((i*89) % H);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx+40*u, sy+22*u); ctx.stroke();
  }
  ctx.restore();
}

/* ---------------- IA ---------------- */
function botLibertador(h, passiveCdMult){
  if(h.smPhase) return true;
  const spend = (idx)=>{
    const sk = h.cls.skills[idx];
    h.energy -= sk.cost;
    h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, idx);
    castAbility(h, sk, false, idx);
  };
  const ready = (idx)=>{ const sk = h.cls.skills[idx]; return h.cds[idx]<=0 && h.energy >= sk.cost; };
  const near300 = seCountNear(h.x, h.y, 300);
  const bigThreat = enemies.find(e=>e.alive && (isBossRank(e) || isEliteRank(e)) && distance(h,e) < 420);
  // Cruce de los Andes: oleadas densas, élites agrupados o jefes
  if(h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL && (near300 >= 6 || bigThreat)){
    const t = bestClusterPoint(h, 420, 140) || bigThreat;
    if(t){ const dx=t.x-h.x, dy=t.y-h.y, l=Math.hypot(dx,dy)||1; h.fx=dx/l; h.fy=dy/l; }
    castAbility(h, h.cls.ultimate, true);
    h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, "ult");
    return true;
  }
  // Granaderos: con aliados cerca y una amenaza real
  const alliesNear = heroes.filter(o=>o!==h && o.alive && distance(o,h) < SM_CFG.granaderos.radius).length;
  if(ready(1) && alliesNear>=1 && (bigThreat || near300 >= 5)){ spend(1); return true; }
  // San Lorenzo: grupos grandes, rescate de un aliado en peligro o romper la defensa del jefe
  const allyInDanger = heroes.find(o=>o!==h && o.alive && o.hp/o.maxHp < 0.35 && seCountNear(o.x, o.y, 140) >= 2);
  const boss = enemies.find(e=>e.alive && isBossRank(e) && distance(h,e) < 400);
  if(ready(2) && (seCountNear(h.x, h.y, 360) >= 4 || boss || allyInDanger)){
    const t = allyInDanger || boss || bestClusterPoint(h, 400, 90);
    if(t){ const dx=t.x-h.x, dy=t.y-h.y, l=Math.hypot(dx,dy)||1; h.fx=dx/l; h.fy=dy/l; }
    spend(2); return true;
  }
  // Bayoneta: enemigo encima o uno debilitado cerca
  const close = nearestEnemyTo(h, 150);
  const weak = enemies.find(e=>e.alive && e.hp < e.maxHp*0.3 && distance(h,e) < 210);
  if(ready(0) && !h.smMounted && (close || weak)){
    const t = weak || close; const dx=t.x-h.x, dy=t.y-h.y, l=Math.hypot(dx,dy)||1; h.fx=dx/l; h.fy=dy/l;
    spend(0); return true;
  }
  return true;
}

/* ---------------- HUD ---------------- */
function libertadorHudHtml(p){
  const O = SM_CFG.officer, every = Math.max(2, O.every - Math.round(talentSkillMods(p.classKey, 0).flags.officerEveryMinus||0));
  const dots = p.smOfficerReady ? `<b class="se-ready">✦ OFICIAL LISTO</b>` : `Oficial ${"●".repeat(p.smShots||0)}${"○".repeat(Math.max(0, every-(p.smShots||0)))}`;
  const cabral = p.smCabralUsed ? `<span class="se-off">Cabral ✗</span>` : `<span class="se-on">Cabral ✓</span>`;
  const mount = p.smMounted ? `<div class="se-bar"><i style="width:${Math.round(100*Math.max(0,p.smMountedTimer)/(p.smMountedMax||1))}%"></i></div>🐎 ${Math.ceil(Math.max(0,p.smMountedTimer)/1000)}s` : "";
  return `<div>${dots}</div><div>${cabral}</div>${mount?`<div>${mount}</div>`:""}`;
}
