"use strict";
/* ============================================================
   js/champions/eren.js
   EREN — EL PORTADOR (clave "eren").
   Loop: MOVILIDAD -> COMBATE -> RECIBIR/INFLIGIR DAÑO -> FURIA -> TRANSFORMACIÓN -> DESTRUCCIÓN ->
   (si vuelve a llenar la Furia transformado) EL RETUMBAR -> AGOTADO.
   Valores: EREN_CFG (js/data/champion-tuning.js). Arte: CHAMP_PACK.eren (humano) y
   CHAMP_PACK.eren_titan (forma monstruosa, misma escala de píxel que el humano en la hoja).

   FURIA = la barra de la definitiva (ultCharge). Transformado, h.cls pasa a EREN_TITAN_CLS (sus
   botones, cooldowns e IA son los del titán) y vuelve a CLASSES.eren al terminar.
   Estado (en el héroe, sincronizado por el anfitrión):
     erenPhase ........ null | "hookPrep" | "hook" | "land" | "tf" | "quake" | "stomp" | "rumble" | "exhaustFall"
     erenPhaseTimer ... ms de las fases con tiempo
     erenTitan ........ forma monstruosa activa (erenTitanTimer/erenTitanMax)
     erenRumblingReady  Furia llena otra vez estando transformado (Ultimate II desbloqueada)
     erenExhaustTimer / erenNoTfTimer ... agotado después del Retumbar
   ============================================================ */
const _erenHit = new WeakMap();

function heroClsOf(h){ return (h && h.erenTitan) ? EREN_TITAN_CLS : (CLASSES[h.classKey] || h.cls); }
function erenMoveLocked(h){ const p = h.erenPhase; return !!(p && p!=="land"); }
function erenLowHp(h){ return h.alive && h.hp/h.maxHp < EREN_CFG.passive.threshold; }
function erenAdvPow(h){ return h.erenAdvanceTimer>0 ? (h.erenAdvancePow||1) : 0; }
function erenSpeedMult(h){
  let m = 1;
  const pw = erenAdvPow(h); if(pw) m *= 1 + EREN_CFG.advance.speedPct*pw;
  if(erenLowHp(h)) m *= 1 + EREN_CFG.passive.speedPct;
  if(h.erenExhaustTimer>0) m *= 1 + EREN_CFG.exhausted.speedPct;
  if(h.erenTitan) m *= EREN_CFG.titan.speedMult;
  return m;
}
function erenDmgMult(h){
  let m = 1;
  const pw = erenAdvPow(h); if(pw) m *= 1 + EREN_CFG.advance.dmgPct*pw;
  if(erenLowHp(h)) m *= 1 + EREN_CFG.passive.dmgPct;
  if(h.erenTitan) m *= EREN_CFG.titan.dmgMult;
  return m;
}
function erenDmgTakenMult(h){
  if(h.erenPhase==="rumble" || h.erenPhase==="tf") return 0; // cinemáticas sin control: no se le puede matar sin poder reaccionar
  let m = 1;
  if(h.erenInstinctTimer>0) m *= 1 - EREN_CFG.instinct.dmgReduce;
  if(h.erenPhase==="quake") m *= EREN_CFG.terremoto.vulnMult;
  return m;
}
function erenCcResist(h){ return h.erenTitan ? 0.6 : (h.erenPhase==="hook" ? 0.9 : 0); }
// Multiplicador de Furia ganada (pegando y recibiendo daño)
function erenFuryGainMult(h){
  const F = EREN_CFG.fury;
  let m = 1 + F.lowHpBonus*(1 - Math.max(0, h.hp)/h.maxHp);
  if(erenLowHp(h)) m *= EREN_CFG.passive.furyMult;
  if(h.erenAdvanceTimer>0) m *= EREN_CFG.advance.furyMult;
  if(h.erenTitan) m *= F.titanGainMult;
  m *= 1 + (talentSkillMods(h.classKey, "ult").flags.furyGainPct||0);
  return m;
}
function erenAddFury(h, amt){
  if(h.erenPhase==="rumble") return;
  h.ultCharge = Math.min(h.ultMax, (h.ultCharge||0) + amt);
  erenCheckRumbling(h);
}
function erenCheckRumbling(h){
  if(h.erenTitan && !h.erenRumblingReady && h.ultCharge >= h.ultMax && h.erenPhase!=="rumble"){
    h.erenRumblingReady = true;
    if(h===player || h.isRemote) showBanner("☠ EL RETUMBAR — Ultimate II disponible");
    vfxShock(h.x, h.y, 10, 120, "255,60,40", 600, 2);
  }
}
// Recibir daño: Furia (mucha más con Instinto) y reserva de regeneración del titán
function erenOnHurt(h, dmg){
  if(!h.alive || dmg<=0) return;
  const inst = h.erenInstinctTimer>0 ? EREN_CFG.instinct.furyMult : 1;
  erenAddFury(h, dmg/h.maxHp*100*EREN_CFG.fury.perHpPctTaken*erenFuryGainMult(h)*inst);
  if(h.erenTitan) h.erenRegenPool = Math.min(h.maxHp*0.6, (h.erenRegenPool||0) + dmg*EREN_CFG.titan.regenPct);
}
function erenSfx(h, name){ if(h===player || inView(h.x, h.y, 0)) playSfx(name); }
function erenBaseDmg(h, POWER){
  return h.baseDmg * runStats.dmgMult * (h.buffDmgMult||1) * arenaMods().heroDmgMult * (POWER||1) * (1 + passiveSum(h.classKey,"dmg_mult") + passiveSum(h.classKey,"skilldmg_mult"));
}

/* ---------------- básico: doble hoja / puños del titán ---------------- */
function erenBasic(caster, aspd){
  if(caster.erenPhase && caster.erenPhase!=="land") return true;
  const bot = caster!==player;
  const base = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult"));
  if(caster.erenTitan){
    const T = EREN_CFG.titan;
    const target = nearestEnemyTo(caster, T.atkRange + T.atkAoe);
    if(bot && !target) return true;
    caster.basicCd = T.atkCdMs / ((caster.buffAtkSpeedMult||1)*aspd) * (bot?1.1:1);
    if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
    if(!(caster.erenComboTimer>0)) caster.erenCombo = 0;
    const stepN = (caster.erenCombo||0) % 3, third = stepN===2;
    caster.erenCombo = stepN+1; caster.erenComboTimer = 1600;
    caster.attackAnim = 380; caster.erenAtkTotal = 380; caster.erenAtkStep = stepN;
    const cx = third ? caster.x : caster.x + caster.fx*T.atkRange*0.7, cy = third ? caster.y : caster.y + caster.fy*T.atkRange*0.7;
    const R = third ? T.thirdAoe : T.atkAoe, dmg = base * (third ? T.thirdMult : 1);
    for(const e of enemies){
      if(!e.alive || Math.hypot(e.x-cx, e.y-cy) > R + (e.radius||20)*0.5) continue;
      damageEnemy(e, dmg, {fromBasic:true, src:caster});
      const dx = e.x-caster.x, dy = e.y-caster.y, l = Math.hypot(dx,dy)||1;
      seKnock(e, dx/l, dy/l, third ? T.knockPx*1.4 : T.knockPx*0.5, T.eliteStaggerMs);
    }
    vfxShock(cx, cy, 6, R, third ? "230,200,160" : "255,160,120", third ? 420 : 240, bot?0:1);
    vfxBurst(cx, cy, third ? 14 : 6, "sand", 150, 420, 4, bot?0:1, -30, 0);
    if(third){ pushChampFx({type:"crack", x:cx, y:cy, v:(Math.random()*3)|0, life:2200, maxLife:2200, s:0.9}); if(caster===player) vfxShake(5); erenSfx(caster, "stomp"); }
    else erenSfx(caster, "punch");
    return true;
  }
  // DOBLE HOJA: combo 1-2-3; el 3ro da Furia extra
  const B = EREN_CFG.blades, range = caster.cls.basicRange;
  const target = nearestEnemyTo(caster, range + 10);
  if(bot && !target) return true;
  caster.basicCd = caster.cls.basicCd / ((caster.buffAtkSpeedMult||1)*aspd) * (bot?1.15:1);
  if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
  if(!(caster.erenComboTimer>0)) caster.erenCombo = 0;
  const stepN = (caster.erenCombo||0) % 3;
  caster.erenCombo = stepN+1; caster.erenComboTimer = B.windowMs;
  caster.attackAnim = 200; caster.erenAtkTotal = 200; caster.erenAtkStep = stepN;
  let hit = false;
  for(const e of enemies){
    if(!e.alive || distance(caster,e) > range + (e.radius||20)*0.4) continue;
    const dx=e.x-caster.x, dy=e.y-caster.y, l=Math.hypot(dx,dy)||1;
    if((dx/l)*caster.fx + (dy/l)*caster.fy < -0.2) continue;
    damageEnemy(e, base*B.combo[stepN], {fromBasic:true, src:caster}); hit = true;
  }
  if(hit && stepN===2) erenAddFury(caster, EREN_CFG.fury.comboThird*erenFuryGainMult(caster));
  spawnSlash(caster);
  erenSfx(caster, "blade");
  return true;
}

/* ---------------- habilidades ---------------- */
function erenCast(caster, sk, isUlt, dmg, AREA, DUR, POWER){
  const kind = sk.kind;
  if(caster.erenPhase==="tf" || caster.erenPhase==="rumble" || caster.erenPhase==="exhaustFall") return;
  if(kind==="eren_hook"){
    const H = EREN_CFG.hook;
    const tgt = seBestTarget(caster, H.dashDist*AREA);
    const d = seAimDir(caster, caster.aim ? null : tgt);
    caster.erenPhase = "hookPrep"; caster.erenPhaseTimer = H.prepMs;
    caster.erenHookDx = d.x; caster.erenHookDy = d.y; caster.fx = d.x; caster.fy = d.y;
    caster.erenDashLeft = H.dashDist*AREA; caster.erenHookDmg = dmg; caster.erenHookArea = AREA;
    caster.erenHookRedirects = H.redirects + Math.round(talentSkillMods(caster.classKey, 0).flags.extraRedirects||0);
    erenSetAnchor(caster, d.x, d.y, H.dashDist*AREA);
    _erenHit.set(caster, new Set());
    erenSfx(caster, "hook");
    return;
  }
  if(kind==="eren_instinct"){
    caster.erenInstinctTimer = EREN_CFG.instinct.durationMs*DUR;
    caster.erenPose = "instinct"; caster.erenPoseTimer = 520;
    vfxBurst(caster.x, caster.y-24, 16, "steel", 150, 420, 3, caster===player?2:0, -40, 0);
    erenSfx(caster, "shield");
    return;
  }
  if(kind==="eren_advance"){
    const A = EREN_CFG.advance;
    caster.erenAdvanceTimer = A.durationMs*DUR;
    caster.erenAdvancePow = 1 + A.lowHpScale*(1 - caster.hp/caster.maxHp);
    caster.erenPose = "advance"; caster.erenPoseTimer = 620;
    for(const o of heroes){ if(o!==caster && o.alive && !o.isDivineFoe && distance(o,caster) <= A.allyRadius*AREA) o.advAllyTimer = Math.max(o.advAllyTimer||0, A.durationMs*DUR); }
    vfxShock(caster.x, caster.y, 8, 110, "220,40,30", 420, 1);
    if(caster===player) showBanner("¡AVANCEN!");
    erenSfx(caster, "roar");
    return;
  }
  if(kind==="eren_titan_ult"){
    const T = EREN_CFG.titan;
    caster.erenPhase = "tf"; caster.erenPhaseTimer = T.tfMs;
    caster.erenTitanDur = T.durationMs*DUR;
    caster.erenHookRedirects = 0;
    erenSfx(caster, "blade");
    return;
  }
  if(kind==="titan_sismo"){
    const S = EREN_CFG.sismo, R = S.radius*AREA;
    for(const e of enemies){
      if(!e.alive) continue;
      const d = distance(caster, e); if(d > R + (e.radius||20)*0.5) continue;
      damageEnemy(e, dmg*(1 - S.falloff*Math.min(1, d/R)), {src:caster});
      const l = d||1; seKnock(e, (e.x-caster.x)/l, (e.y-caster.y)/l, S.knockPx, S.eliteStunMs);
    }
    caster.erenPose = "sismo"; caster.erenPoseTimer = 560;
    erenQuakeFx(caster, caster.x, caster.y, R, 1);
    if(caster===player) vfxShake(9);
    erenSfx(caster, "boom");
    return;
  }
  if(kind==="titan_terremoto"){
    const Q = EREN_CFG.terremoto;
    caster.erenPhase = "quake"; caster.erenQuakeLeft = Q.pulses; caster.erenPhaseTimer = 120;
    caster.erenQuakeDmg = dmg; caster.erenQuakeR = Q.radius*AREA;
    return;
  }
  if(kind==="titan_retumbar"){
    const R = EREN_CFG.retumbar;
    const t = caster.aim ? null : (bestClusterPoint(caster, 380, 120) || seBestTarget(caster, 380));
    const d = seAimDir(caster, t);
    caster.erenPhase = "stomp"; caster.erenStepsLeft = R.steps; caster.erenPhaseTimer = 200;
    caster.erenStompDx = d.x; caster.erenStompDy = d.y; caster.fx = d.x; caster.fy = d.y;
    caster.erenStompDmg = dmg; caster.erenStompR = R.radius*AREA;
    return;
  }
  if(kind==="eren_rumbling_ult"){
    erenStartRumbling(caster, POWER);
    return;
  }
}
// Segunda activación del Equipo de Maniobras durante el vuelo: nuevo gancho + cambio violento de dirección.
function erenHookCanRedirect(h){ return !!(h && h.classKey==="eren" && !h.erenTitan && (h.erenPhase==="hook" || h.erenPhase==="land") && (h.erenHookRedirects||0) > 0); }
function erenHookRedirect(h, aim){
  if(!erenHookCanRedirect(h)) return false;
  const H = EREN_CFG.hook;
  let d;
  if(aim && (aim.dx || aim.dy)){ const l = Math.hypot(aim.dx, aim.dy)||1; d = {x:aim.dx/l, y:aim.dy/l}; }
  else if(h===player && Math.hypot(joyVec.x, joyVec.y) > 0.2){ const l = Math.hypot(joyVec.x, joyVec.y); d = {x:joyVec.x/l, y:joyVec.y/l}; }
  else { const t = seBestTarget(h, 340); d = seAimDir(h, t); }
  h.erenHookRedirects--;
  h.erenPhase = "hook"; h.erenHookDx = d.x; h.erenHookDy = d.y; h.fx = d.x; h.fy = d.y;
  h.erenDashLeft = H.redirectDist*(h.erenHookArea||1); h.erenRedirFxTimer = 160;
  erenSetAnchor(h, d.x, d.y, H.redirectDist);
  _erenHit.set(h, new Set());
  vfxBurst(h.x, h.y-20, 8, "steel", 180, 260, 3, h===player?2:0, -10, 0);
  erenSfx(h, "hook");
  return true;
}
// Ancla visual del cable: un enemigo grande en esa dirección si hay, si no un punto fuera de pantalla.
function erenSetAnchor(h, dx, dy, dist){
  let ax = h.x + dx*(dist+140), ay = h.y + dy*(dist+140);
  for(const e of enemies){
    if(!e.alive || !(isBossRank(e) || isEliteRank(e) || (e.radius||0) > 34)) continue;
    const vx = e.x-h.x, vy = e.y-h.y, along = vx*dx + vy*dy;
    if(along < 60 || along > dist+200) continue;
    if(Math.abs(vx*-dy + vy*dx) < (e.radius||30)){ ax = e.x; ay = e.y - (e.radius||30)*0.6; break; }
  }
  h.erenAnchorX = ax; h.erenAnchorY = ay;
}

/* ---------------- transformación ---------------- */
function erenEnterTitan(h){
  const T = EREN_CFG.titan;
  h.erenPrev = {maxHp:h.maxHp, radius:h.radius, def:h.def, cds:h.cds.slice(), at:runElapsedMs};
  const pct = h.hp/h.maxHp;
  h.maxHp = Math.round(h.maxHp*T.hpMult*(1+(talentSkillMods(h.classKey,"ult").flags.titanHpPct||0)));
  h.hp = Math.max(1, Math.round(h.maxHp*Math.min(1, pct + 0.35)));
  h.radius = Math.round(h.erenPrev.radius*T.radiusMult);
  h.def = Math.max(h.def, T.def);
  h.cds = [0,0,0];
  h.erenTitan = true; h.cls = EREN_TITAN_CLS;
  h.erenTitanTimer = h.erenTitanDur || T.durationMs; h.erenTitanMax = h.erenTitanTimer;
  h.erenRumblingReady = false; h.ultCharge = 0; h.erenRegenPool = 0;
  h.erenCombo = 0;
  if(h===player || h.isRemote) showBanner("EL PORTADOR");
  vfxShock(h.x, h.y, 20, 220, "255,120,80", 700, 2);
  for(let i=0;i<3;i++) pushChampFx({type:"steam", x:h.x+(i-1)*40, y:h.y-10, life:1600+i*300, maxLife:1600+i*300, v:i});
  if(h===player) vfxShake(12);
  erenSfx(h, "roar");
}
function erenExitTitan(h, died){
  if(!h.erenTitan) return;
  const pv = h.erenPrev || {maxHp:h.maxHp/EREN_CFG.titan.hpMult, radius:24, def:h.def, cds:[0,0,0], at:runElapsedMs};
  const pct = h.hp/h.maxHp, elapsed = runElapsedMs - (pv.at||runElapsedMs);
  h.erenTitan = false; h.cls = CLASSES.eren;
  h.maxHp = Math.round(pv.maxHp); h.radius = pv.radius; h.def = pv.def;
  h.hp = died ? 0 : Math.max(1, Math.round(h.maxHp*pct));
  h.cds = pv.cds.map(c=>Math.max(0, c - elapsed));
  h.erenPrev = null; h.erenRumblingReady = false; h.erenTitanTimer = 0; h.erenRegenPool = 0;
  if(h.erenPhase==="quake" || h.erenPhase==="stomp") h.erenPhase = null;
  if(!died){
    for(let i=0;i<2;i++) pushChampFx({type:"steam", x:h.x+(i?30:-30), y:h.y-6, life:1800, maxLife:1800, v:i+1});
    if(h===player || h.isRemote) showBanner("Eren vuelve a su forma humana");
  }
}

/* ---------------- El Retumbar (Ultimate II) ---------------- */
function erenStartRumbling(h, POWER){
  const R = EREN_CFG.rumbling;
  h.erenRumblingReady = false; h.ultCharge = 0;
  const total = R.roarMs + 3*R.telegraphMs + 2*R.gapMs + 900;
  h.erenPhase = "rumble"; h.erenPhaseTimer = total; h.erenRumbleTotal = total;
  const base = erenBaseDmg(h, POWER) * (talentSkillMods(h.classKey,"ult").flags.rumblingDmgPct ? 1+talentSkillMods(h.classKey,"ult").flags.rumblingDmgPct : 1);
  // IZQUIERDA -> DERECHA -> CENTRO, alrededor de la pelea y siempre dentro de la arena
  const spots = [[-R.dist, -R.dist*0.25], [R.dist, R.dist*0.25], [0, 0]];
  pushChampFx({type:"rumbling", x:h.x, y:h.y, src:h, life:total, maxLife:total, n:R.silhouettes});
  spots.forEach(([ox, oy], i)=>{
    const p = seClampPoint(h.x+ox, h.y+oy, R.radii[i]*0.4);
    const delay = R.roarMs + i*(R.telegraphMs + R.gapMs);
    const life = delay + R.telegraphMs + 1100;
    pushChampFx({type:"rumbleStep", x:p.x, y:p.y, r:R.radii[i], dmg:base*R.dmgMult[i], idx:i, delay, tele:R.telegraphMs, src:h, done:false, life, maxLife:life});
  });
  h.erenPose = "roar"; h.erenPoseTimer = R.roarMs;
  if(h===player || h.isRemote) showBanner("☠ EL RETUMBAR");
  flashScreen(0.3, "120,20,10");
  erenSfx(h, "roar");
}
function erenUpdateRumbleStep(f, dt){
  const el = (f.maxLife||0) - f.life;
  if(f.done || el < f.delay + f.tele) return;
  f.done = true;
  const src = f.src;
  for(const e of enemies){
    if(!e.alive) continue;
    const d = Math.hypot(e.x-f.x, e.y-f.y); if(d > f.r + (e.radius||20)*0.5) continue;
    damageEnemy(e, f.dmg*(1 - 0.3*Math.min(1, d/f.r)), {src});
    const l = d||1; seKnock(e, (e.x-f.x)/l, (e.y-f.y)/l, EREN_CFG.rumbling.knockPx, 900);
  }
  // fuego amigo apagado: la pisada no daña a ningún aliado (ni al propio Eren)
  erenQuakeFx(src, f.x, f.y, f.r, 2);
  vfxShake(f.idx===2 ? 16 : 12);
  flashScreen(f.idx===2 ? 0.35 : 0.22, "255,210,180");
  playSfx(f.idx===2 ? "bigKill" : "boom");
}
// Onda + grietas + polvo + rocas (UNA grieta por golpe: sin cientos de entidades)
function erenQuakeFx(h, x, y, R, big){
  pushChampFx({type:"ring", x, y, r:R, life:520, maxLife:520, color:"#e8c9a0", w:big>1?7:5});
  pushChampFx({type:"crack", x, y, v:(Math.random()*3)|0, life:2600, maxLife:2600, s: Math.min(2.6, R/110)});
  vfxShock(x, y, 10, R, "230,200,160", 480, 2);
  vfxBurst(x, y, big>1 ? 30 : 18, "sand", 220, 600, 5, 2, -50, 0);
  vfxBurst(x, y, big>1 ? 16 : 8, "rock", 200, 520, 5, 2, -80, 0);
}

/* ---------------- cada cuadro ---------------- */
function updateEren(h, dt){
  const dec = k=>{ if(h[k]>0) h[k] = Math.max(0, h[k]-dt); };
  dec("erenComboTimer"); dec("erenInstinctTimer"); dec("erenAdvanceTimer"); dec("erenPoseTimer");
  dec("erenRedirFxTimer"); dec("erenSlashFxTimer"); dec("erenExhaustTimer"); dec("erenNoTfTimer");
  if(!h.alive){
    if(h.erenTitan) erenExitTitan(h, true);
    h.erenPhase = null; h.erenRumblingReady = false;
    return;
  }
  if(h.erenTitan){
    // regeneración: parte del daño recibido vuelve de a poco, con vapor
    if(h.erenRegenPool>0 && h.hp < h.maxHp){
      const heal = Math.min(h.erenRegenPool, h.maxHp*EREN_CFG.titan.regenPerSecPct*dt/1000);
      h.hp = Math.min(h.maxHp, h.hp + heal); h.erenRegenPool -= heal;
      if(Math.random() < 0.18) vfxBurst(h.x+(Math.random()-0.5)*50, h.y-50-Math.random()*50, 1, "steel", 30, 800, 5, 0, -40, 1);
    }
    if(h.erenPhase!=="rumble"){
      h.erenTitanTimer -= dt;
      if(h.erenTitanTimer<=0){ erenExitTitan(h, false); }
    }
    erenCheckRumbling(h);
  }
  if(erenLowHp(h) && Math.random()<0.08) vfxBurst(h.x+(Math.random()-0.5)*26, h.y-30, 1, "blood", 20, 500, 3, 0, -25, 1);
  if(h.erenAdvanceTimer>0 && Math.random()<0.3) vfxBurst(h.x+(Math.random()-0.5)*30, h.y-10, 1, "ember", 25, 420, 3, 0, -30, 1);
  const ph = h.erenPhase; if(!ph) return;
  if(ph==="hookPrep"){
    h.erenPhaseTimer -= dt; if(h.erenPhaseTimer<=0){ h.erenPhase = "hook"; h.erenLaunchT = 140; }
    return;
  }
  if(ph==="land"){ h.erenPhaseTimer -= dt; if(h.erenPhaseTimer<=0) h.erenPhase = null; return; }
  if(ph==="hook"){
    const H = EREN_CFG.hook;
    if(h.erenLaunchT>0) h.erenLaunchT -= dt;
    const step = Math.min(h.erenDashLeft, H.dashSpeed*dt/1000);
    const ox = h.x, oy = h.y;
    h.x += h.erenHookDx*step; h.y += h.erenHookDy*step;
    clampToArena(h); resolveWallCollision(h);
    const moved = Math.hypot(h.x-ox, h.y-oy);
    h.erenDashLeft -= step; h.fx = h.erenHookDx; h.fy = h.erenHookDy; h.moving = true; h.animT += dt;
    const hitSet = _erenHit.get(h) || new Set(); _erenHit.set(h, hitSet);
    for(const e of enemies){
      if(!e.alive || hitSet.has(e)) continue;
      if(distance(h, e) > H.slashRadius*(h.erenHookArea||1) + (e.radius||20)*0.5) continue;
      hitSet.add(e);
      damageEnemy(e, h.erenHookDmg||0, {src:h});
      vfxBurst(e.x, e.y-16, 6, "blood", 150, 300, 3, 1, -20, 0);
      h.erenSlashFxTimer = 180;
    }
    if(Math.random()<0.7) vfxBurst(h.x-h.erenHookDx*20, h.y-20, 1, "steel", 40, 260, 2, 0, 0, 1);
    if(moved < step*0.3 || h.erenDashLeft<=0){ h.erenPhase = "land"; h.erenPhaseTimer = H.landMs; vfxBurst(h.x, h.y, 6, "sand", 80, 300, 3, 0, -20, 0); }
    return;
  }
  if(ph==="tf"){
    const T = EREN_CFG.titan, el = T.tfMs - h.erenPhaseTimer;
    h.erenPhaseTimer -= dt;
    const el2 = T.tfMs - h.erenPhaseTimer;
    if(el < T.biteMs && el2 >= T.biteMs){
      // RAYO: micro pausa -> destello -> humo/vapor -> sacudida
      pushChampFx({type:"bolt", x:h.x, y:h.y, life:T.tfMs-T.biteMs+200, maxLife:T.tfMs-T.biteMs+200});
      flashScreen(0.45, "255,230,200"); vfxShake(14);
      vfxBurst(h.x, h.y, 26, "sand", 200, 700, 5, 2, -60, 0);
      erenSfx(h, "thunder");
    }
    if(h.erenPhaseTimer<=0){ h.erenPhase = null; erenEnterTitan(h); }
    return;
  }
  if(ph==="quake"){
    // Terremoto: canalizada; el aturdimiento la corta (misma regla que el resto de canalizadas)
    if(h.stunTimer>0 || !h.erenTitan){ h.erenPhase = null; return; }
    h.erenPhaseTimer -= dt;
    if(h.erenPhaseTimer<=0 && h.erenQuakeLeft>0){
      h.erenQuakeLeft--; h.erenPhaseTimer = EREN_CFG.terremoto.intervalMs;
      for(const e of enemies){
        if(!e.alive || distance(h,e) > h.erenQuakeR + (e.radius||20)*0.5) continue;
        damageEnemy(e, h.erenQuakeDmg||0, {src:h});
        if(isEliteRank(e)) e.stunTimer = Math.max(e.stunTimer||0, 200);
      }
      erenQuakeFx(h, h.x+(Math.random()-0.5)*40, h.y+(Math.random()-0.5)*30, h.erenQuakeR, 1);
      if(h===player) vfxShake(6);
      erenSfx(h, "stomp");
      if(h.erenQuakeLeft<=0) h.erenPhaseTimer = 300;
    } else if(h.erenPhaseTimer<=0 && h.erenQuakeLeft<=0){ h.erenPhase = null; }
    return;
  }
  if(ph==="stomp"){
    const R = EREN_CFG.retumbar;
    if(!h.erenTitan){ h.erenPhase = null; return; }
    // control de dirección limitado: gira despacio hacia donde apunta el jugador / su input
    const want = Math.atan2(h.fy||0, h.fx||0), cur = Math.atan2(h.erenStompDy, h.erenStompDx);
    let da = want - cur; while(da > Math.PI) da -= 2*Math.PI; while(da < -Math.PI) da += 2*Math.PI;
    const turn = Math.max(-1.6*dt/1000, Math.min(1.6*dt/1000, da));
    h.erenStompDx = Math.cos(cur+turn); h.erenStompDy = Math.sin(cur+turn);
    h.x += h.erenStompDx*R.speed*dt/1000; h.y += h.erenStompDy*R.speed*dt/1000;
    clampToArena(h); resolveWallCollision(h);
    h.moving = true; h.animT += dt;
    h.erenPhaseTimer -= dt;
    if(h.erenPhaseTimer<=0){
      h.erenStepsLeft--; h.erenPhaseTimer = R.stepMs;
      const cx = h.x + h.erenStompDx*30, cy = h.y + h.erenStompDy*30;
      for(const e of enemies){
        if(!e.alive || Math.hypot(e.x-cx, e.y-cy) > h.erenStompR + (e.radius||20)*0.5) continue;
        damageEnemy(e, h.erenStompDmg||0, {src:h});
        const dx = e.x-cx, dy = e.y-cy, l = Math.hypot(dx,dy)||1;
        seKnock(e, dx/l, dy/l, R.knockPx, R.eliteStaggerMs);
      }
      erenQuakeFx(h, cx, cy, h.erenStompR, 1);
      if(h===player) vfxShake(6);
      erenSfx(h, "stomp");
      if(h.erenStepsLeft<=0) h.erenPhase = null;
    }
    return;
  }
  if(ph==="rumble"){
    h.erenPhaseTimer -= dt; h.moving = false;
    if(h.erenPhaseTimer<=0){
      // humo, silencio breve y de vuelta a humano: agotado
      erenExitTitan(h, false);
      const X = EREN_CFG.exhausted;
      h.erenPhase = "exhaustFall"; h.erenPhaseTimer = 1300;
      h.erenExhaustTimer = X.durationMs; h.erenNoTfTimer = X.noTransformMs; h.ultCharge = 0;
      for(let i=0;i<3;i++) pushChampFx({type:"steam", x:h.x+(i-1)*36, y:h.y-4, life:2200, maxLife:2200, v:i});
      if(h===player || h.isRemote) showBanner("AGOTADO");
    }
    return;
  }
  if(ph==="exhaustFall"){ h.erenPhaseTimer -= dt; h.moving = false; if(h.erenPhaseTimer<=0) h.erenPhase = null; return; }
}
// La definitiva no se puede usar agotado; transformado solo con El Retumbar desbloqueado.
function erenUltBlocked(h){
  // El Retumbar corta el Terremoto / el avance de pisadas en curso (no hay que esperar a que terminen)
  if(h.erenTitan && h.erenRumblingReady && (!h.erenPhase || h.erenPhase==="quake" || h.erenPhase==="stomp")) return null;
  if(h.erenPhase && h.erenPhase!=="land") return "busy";
  if(h.erenTitan) return h.erenRumblingReady ? null : "titan";
  if(h.erenNoTfTimer>0) return "exhausted";
  return null;
}

/* ---------------- dibujo ---------------- */
function _erenFrame(P, set, prog, flip, h, s, alpha){
  const arr = P.sets[set]; if(!arr) return false;
  const n = Math.min(arr.length-1, Math.max(0, Math.floor(prog*arr.length)));
  champPackDrawFrame(P, arr[n], h.x, h.y, s, flip, alpha);
  return true;
}
function erenTitanScale(h, drawScale){
  const P = CHAMP_PACK.eren, TP = CHAMP_PACK.eren_titan;
  const humanR = h.erenPrev ? h.erenPrev.radius : (h.erenTitan ? h.radius/EREN_CFG.titan.radiusMult : h.radius);
  const sHuman = humanR*2.7*(drawScale/(h.scale||2.0))/P.refH;
  return sHuman * EREN_CFG.titan.visualScale * P.refH / TP.refH;
}
function drawEren(h, drawScale, alpha){
  const P = CHAMP_PACK.eren, TP = CHAMP_PACK.eren_titan;
  if(!P || !P.ready) return false;
  const dir = champPackDir(h), left = !!h._pleft;
  const ph = h.erenPhase;
  const sHuman = (h.erenTitan ? h.radius/EREN_CFG.titan.radiusMult : h.radius)*2.7*(drawScale/(h.scale||2.0))/P.refH;
  if(ph==="tf"){
    const T = EREN_CFG.titan, el = T.tfMs - Math.max(0, h.erenPhaseTimer);
    if(el < T.biteMs) return _erenFrame(P, "bite", el/T.biteMs, left, h, sHuman, alpha);
    if(TP && TP.ready) return _erenFrame(TP, "tf", (el-T.biteMs)/(T.tfMs-T.biteMs), left, h, erenTitanScale(h, drawScale), alpha);
    return _erenFrame(P, "bite", 0.99, left, h, sHuman, alpha);
  }
  if(h.erenTitan && TP && TP.ready){
    const s = erenTitanScale(h, drawScale);
    if(ph==="rumble") return _erenFrame(TP, "roar", 0, left, h, s, alpha);
    if(ph==="quake") return _erenFrame(TP, "terremoto", ((EREN_CFG.terremoto.intervalMs - Math.max(0,h.erenPhaseTimer))/EREN_CFG.terremoto.intervalMs), left, h, s, alpha);
    if(ph==="stomp") return _erenFrame(TP, "retumbar", 1 - Math.max(0,h.erenPhaseTimer)/EREN_CFG.retumbar.stepMs, (h.erenStompDx||0) < 0, h, s, alpha);
    if(h.erenPose==="sismo" && h.erenPoseTimer>0) return _erenFrame(TP, "sismo", 1 - h.erenPoseTimer/560, left, h, s, alpha);
    if(h.attackAnim>0){
      const prog = 1 - h.attackAnim/(h.erenAtkTotal||380);
      if((h.erenAtkStep||0)===2) return _erenFrame(TP, "sismo", prog, left, h, s, alpha);
      return _erenFrame(TP, "atk", (h.erenAtkStep ? 0.5 : 0) + prog*0.5, left, h, s, alpha);
    }
    const pick = champPackSet(TP, h.moving ? "walk" : "idle", dir, h) || champPackSet(TP, "idle", "down", h);
    const arr = pick.arr;
    const n = h.moving ? Math.floor((h.animT||0)/200) % arr.length : Math.floor(animNow/420) % arr.length;
    champPackDrawFrame(TP, arr[n], h.x, h.y, s, pick.flip, alpha);
    return true;
  }
  if(ph==="rumble") return _erenFrame(P, "exhausted", 0, left, h, sHuman, alpha); // (no debería verse: el titán ruge)
  if(ph==="exhaustFall") return _erenFrame(P, "exhausted", Math.min(0.99, 1 - Math.max(0,h.erenPhaseTimer)/1300), left, h, sHuman, alpha);
  if(ph==="hookPrep") return _erenFrame(P, "hook_prep", 1 - Math.max(0,h.erenPhaseTimer)/EREN_CFG.hook.prepMs, (h.erenHookDx||0) < 0, h, sHuman, alpha);
  if(ph==="hook"){
    const fl = (h.erenHookDx||0) < 0;
    if(h.erenSlashFxTimer>0) return _erenFrame(P, "hook_slash", 1 - h.erenSlashFxTimer/180, fl, h, sHuman, alpha);
    if(h.erenLaunchT>0) return _erenFrame(P, "hook_launch", 0, fl, h, sHuman, alpha);
    return _erenFrame(P, "hook_fly", h.erenRedirFxTimer>0 ? 0.99 : ((h.animT||0)/120 % 2)/3, fl, h, sHuman, alpha);
  }
  if(ph==="land") return _erenFrame(P, "hook_land", 0, left, h, sHuman, alpha);
  if(h.erenPoseTimer>0 && (h.erenPose==="instinct" || h.erenPose==="advance")) return _erenFrame(P, h.erenPose, 1 - h.erenPoseTimer/(h.erenPose==="advance"?620:520), left, h, sHuman, alpha);
  if(h.erenExhaustTimer>0 && !h.moving && h.erenExhaustTimer > EREN_CFG.exhausted.durationMs-2500) return _erenFrame(P, "exhausted", 0, left, h, sHuman, alpha);
  if(h.attackAnim>0){
    const prog = 1 - h.attackAnim/(h.erenAtkTotal||200), st = h.erenAtkStep||0;
    return _erenFrame(P, "attack_side", (st + prog)/3.0001, left, h, sHuman, alpha);
  }
  if(h.moving && (h.erenAdvanceTimer>0 || erenLowHp(h))) return _erenFrame(P, "run", ((h.animT||0)/100 % 4)/4, left, h, sHuman, alpha);
  return drawChampPack("eren", h, drawScale, alpha);
}
// Encima del personaje: cable del gancho, auras, Furia lista, vapor de regeneración.
function erenDrawOverlays(h){
  if(h.erenPhase==="hook" || h.erenPhase==="hookPrep"){
    const hx = h.x + (h.erenHookDx||0)*10, hy = h.y - 30;
    ctx.save();
    ctx.strokeStyle = "rgba(230,236,242,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(h.erenAnchorX, h.erenAnchorY); ctx.stroke();
    ctx.strokeStyle = "rgba(90,90,100,0.9)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx, hy+3); ctx.lineTo(h.erenAnchorX, h.erenAnchorY+3); ctx.stroke();
    ctx.restore();
    const img = seFx("fx_hook_01");
    if(img){
      const ang = Math.atan2(h.erenAnchorY-hy, h.erenAnchorX-hx);
      ctx.save(); ctx.translate(h.erenAnchorX, h.erenAnchorY); ctx.rotate(ang); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width*0.5, img.height*0.45, -img.width*0.25, -img.height*0.11, img.width*0.5, img.height*0.22);
      ctx.restore();
    }
  }
  if(h.erenInstinctTimer>0 && Math.random()<0.5) vfxBurst(h.x+(Math.random()-0.5)*40, h.y-10-Math.random()*50, 1, "steel", 20, 260, 2, 0, -10, 0);
  if(h.erenAdvanceTimer>0){
    ctx.save(); ctx.globalAlpha = 0.18 + 0.1*Math.sin(animNow/120); ctx.fillStyle = "#c81e1e";
    const r = (h.erenTitan ? 90 : 34);
    ctx.beginPath(); ctx.ellipse(h.x, h.y+2, r, r*0.4, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  if(h.erenRumblingReady){
    ctx.save(); ctx.globalAlpha = 0.5 + 0.4*Math.sin(animNow/90); ctx.strokeStyle = "#ff2a1a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(h.x, h.y+4, 110, 44, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
  }
}
function erenDrawCrack(f){
  const img = seFx("fx_crack_0"+(1+(f.v||0))); if(!img) return;
  const s = f.s||1;
  drawSeImg(img, f.x, f.y, img.width*s*1.3, img.height*s*0.8, 0.5, 0.5, false, Math.min(1, _fxA(f)*2)*0.85);
}
function erenDrawBolt(f){
  const a = _fxA(f), el = (f.maxLife||1) - f.life;
  const img = seFx(el % 160 < 80 ? "fx_bolt_01" : "fx_bolt_02"); if(!img) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  drawSeImg(img, f.x, f.y+6, img.width*2.6, img.height*2.6, 0.5, 0.95, false, Math.min(1, a*2));
  ctx.restore();
}
function erenDrawSteam(f){
  const a = _fxA(f), el = (f.maxLife||1) - f.life;
  const img = seFx("fx_steam_0"+(1+((((el/220)|0)+(f.v||0))%4))); if(!img) return;
  drawSeImg(img, f.x, f.y - el*0.03, img.width*1.4, img.height*1.4, 0.5, 0.9, false, Math.min(1, a*1.5)*0.8);
}
// Aviso de pisada en el suelo: sombra que crece + anillo rojo + cuenta (siempre antes del impacto).
function erenDrawRumbleTelegraph(f){
  const el = (f.maxLife||0) - f.life;
  if(el < f.delay) return;
  const k = Math.min(1, (el - f.delay)/f.tele);
  ctx.save();
  if(!f.done){
    ctx.globalAlpha = 0.25 + 0.45*k; ctx.fillStyle = "#1a0606";
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r*(0.55+0.45*k), f.r*(0.55+0.45*k)*0.6, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.5 + 0.5*Math.abs(Math.sin(el/90)); ctx.strokeStyle = "#ff3a22"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r*0.6, 0, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = "#ffd0c0"; ctx.font = "bold 34px monospace"; ctx.textAlign = "center";
    ctx.fillText(String(Math.max(1, Math.ceil((1-k)*3))), f.x, f.y+12);
  }
  ctx.restore();
}
function erenDrawRumbleFoot(f){
  const el = (f.maxLife||0) - f.life, t0 = f.delay + f.tele;
  if(el < t0 - 350) return;
  const img = seFx("step_0"+(1+(f.idx||0)));
  if(!img) return;
  const drop = Math.min(1, (el - (t0-350))/350), fade = el > t0 ? Math.max(0, 1 - (el - t0)/900) : 1;
  const w = f.r*2.6, hgt = w*img.height/img.width;
  drawSeImg(img, f.x, f.y + f.r*0.35 - (1-drop)*160, w, hgt, 0.5, 1, false, drop*fade*0.95);
}
// Siluetas colosales alrededor/fuera de la arena (pantalla) + tinte rojo: solo VFX.
function erenDrawRumblingScreen(f){
  const img = seFx("shadows_01");
  const total = f.maxLife||1, el = total - f.life, a = Math.min(1, el/700) * Math.min(1, f.life/800);
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha = 0.22*a; ctx.fillStyle = "#3a0404"; ctx.fillRect(0,0,W,H);
  if(img){
    ctx.imageSmoothingEnabled = false;
    const w = W*0.7, h = w*img.height/img.width, sway = Math.sin(el/600)*10;
    ctx.globalAlpha = 0.55*a;
    ctx.drawImage(img, -w*0.15 + sway, -h*0.25, w, h);
    ctx.drawImage(img, W - w*0.85 - sway, -h*0.2, w, h);
    ctx.globalAlpha = 0.4*a;
    ctx.save(); ctx.translate(W/2, H); ctx.scale(1, -1); ctx.drawImage(img, -w/2, -h*0.2, w, h*0.8); ctx.restore();
  }
  ctx.restore();
}

/* ---------------- IA ---------------- */
function botEren(h, passiveCdMult){
  const ph = h.erenPhase;
  if(ph==="hook"){
    // segundo gancho: cambio de dirección hacia un grupo o lejos del peligro
    if(erenHookCanRedirect(h) && h.erenDashLeft < 120){
      const danger = h.hp/h.maxHp < 0.3 && seCountNear(h.x, h.y, 160) >= 2;
      const t = danger ? null : bestClusterPoint(h, 320, 90);
      if(t || danger){
        const d = danger ? {dx:-(h.fx||0), dy:-(h.fy||0)} : {dx:t.x-h.x, dy:t.y-h.y};
        erenHookRedirect(h, d);
      }
    }
    return true;
  }
  if(ph) return true;
  const spend = (idx)=>{
    const sk = h.cls.skills[idx];
    h.energy -= sk.cost;
    h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, idx);
    castAbility(h, sk, false, idx);
  };
  const ready = (idx)=>{ const sk = h.cls.skills[idx]; return h.cds[idx]<=0 && h.energy >= sk.cost; };
  const near = r=>seCountNear(h.x, h.y, r);
  const boss = enemies.find(e=>e.alive && isBossRank(e) && distance(h,e) < 420);
  const elite = enemies.find(e=>e.alive && isEliteRank(e) && distance(h,e) < 360);
  if(h.erenTitan){
    // Ultimate II: disponible + muchos enemigos / jefe / la transformación está por terminar
    if(h.erenRumblingReady && (near(420) >= 6 || boss || h.erenTitanTimer < 5000)){
      erenStartRumbling(h, masteryPowerMult(effectiveMasteryFor(h.classKey, "ult"))); return true;
    }
    if(ready(0) && (near(230) >= 3 || (boss && distance(h,boss) < 220))){ spend(0); return true; }
    if(ready(1) && (near(250) >= 5 || (boss && distance(h,boss) < 200 && h.hp/h.maxHp > 0.4))){ spend(1); return true; }
    if(ready(2)){ const p = bestClusterPoint(h, 380, 120); if(p && near(380) >= 4){ const dx=p.x-h.x, dy=p.y-h.y, l=Math.hypot(dx,dy)||1; h.fx=dx/l; h.fy=dy/l; spend(2); return true; } }
    return true;
  }
  // Transformación: grupos grandes, élites, jefes o peligro de muerte
  const inDanger = h.hp/h.maxHp < 0.35 && near(200) >= 2;
  if(h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL && !erenUltBlocked(h) && (near(300) >= 5 || boss || elite || inDanger)){
    castAbility(h, h.cls.ultimate, true);
    h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, "ult");
    return true;
  }
  // Instinto: bajo presión, para cargar Furia
  if(ready(1) && ((h.hp/h.maxHp < 0.55 && near(150) >= 2) || (h.ultCharge/h.ultMax > 0.6 && near(160) >= 3))){ spend(1); return true; }
  // ¡Avancen!: antes de entrar agresivamente
  if(ready(2) && (near(260) >= 3 || boss || elite)){ spend(2); return true; }
  // Ganchos: escapar, acercarse a un objetivo prioritario o atravesar un grupo
  if(ready(0)){
    let t = null, away = false;
    if(inDanger){ away = true; }
    else {
      const pri = elite || boss || enemies.find(e=>e.alive && e.hp < e.maxHp*0.3 && distance(h,e) < 340);
      if(pri && distance(h, pri) > 140) t = pri;
      else { const p = bestClusterPoint(h, 340, 80); if(p && near(340) >= 4 && distance(h, p) > 120) t = p; }
    }
    if(t || away){
      const dx = away ? -(h.fx||0) : t.x-h.x, dy = away ? -(h.fy||1) : t.y-h.y, l = Math.hypot(dx,dy)||1;
      h.fx = dx/l; h.fy = dy/l;
      spend(0); return true;
    }
  }
  return true;
}

/* ---------------- HUD ---------------- */
function erenHudHtml(p){
  const fury = Math.round(100*(p.ultCharge||0)/(p.ultMax||100));
  const rows = [`<div class="se-fury"><span>FURIA</span><div class="se-bar fury"><i style="width:${fury}%"></i></div>${fury}%</div>`];
  if(erenLowHp(p)) rows.push(`<div class="se-warn">🩸 SEGUIR ADELANTE</div>`);
  if(p.erenTitan){
    rows.push(`<div>👹 ${Math.ceil(Math.max(0,p.erenTitanTimer)/1000)}s <div class="se-bar titan"><i style="width:${Math.round(100*Math.max(0,p.erenTitanTimer)/(p.erenTitanMax||1))}%"></i></div></div>`);
    if(p.erenRegenPool>1) rows.push(`<div class="se-on">♨ regenerando</div>`);
    if(p.erenRumblingReady) rows.push(`<div class="se-rumble">☠ EL RETUMBAR LISTO</div>`);
  }
  if(p.erenExhaustTimer>0) rows.push(`<div class="se-off">AGOTADO ${Math.ceil(p.erenExhaustTimer/1000)}s</div>`);
  else if(p.erenNoTfTimer>0 && !p.erenTitan) rows.push(`<div class="se-off">sin transformación ${Math.ceil(p.erenNoTfTimer/1000)}s</div>`);
  return rows.join("");
}
