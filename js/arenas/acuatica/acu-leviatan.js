"use strict";
/* ============================================================
   js/arenas/acuatica/acu-leviatan.js
   BOSS IDENTITY — EL LEVIATÁN (canon: el Kraken adulto). REGLA: NEUTRALIZÁ SUS TENTÁCULOS.
   - El cuerpo ronda la orilla; sus TENTÁCULOS salen del agua dentro de la arena (3 en la 1ª vida,
     4 en las siguientes) y cada uno tiene una FUNCIÓN que se lee:
       GOLPE     — azota donde está el guardián más cercano (círculo marcado, 1,1 s).
       AGARRE    — anillo de aviso (0,75 s) y atrapa a quien quede adentro: lo inmoviliza y lo aprieta.
                   Los ALIADOS lo liberan pegándole al tentáculo; SOLO (sin aliados en pie) el agarre dura
                   poco y el tentáculo queda aturdido y expuesto (contrajuego solitario).
       CORRIENTE — remolino alrededor: empuja hacia afuera a quien se acerque.
     Mientras haya tentáculos, el cuerpo está PROTEGIDO (sumergido: recibe menos daño).
   - Con todos los tentáculos neutralizados, el Leviatán sale a respirar: se arrima y deja el
     NÚCLEO EXPUESTO (ventana de burst). Después se hunde y los tentáculos vuelven a brotar.
   - ANTI-KITE: lejos de él, remolinos marcados donde están. ANTI-FACETANK: Mordida/Coletazo desde
     la orilla y el azote de los tentáculos.
   Anfitrión; e.levRole/e.levGrabIdx viajan con el enemigo y el agarre usa stunTimer (sirve en red).
   ============================================================ */
const LEV_T = { count:[3, 4, 4], hpPct:0.05, shield:[1, 0.8, 0.65, 0.5, 0.42], ringK:0.55,
                slamCd:[4200, 5600], slamWarn:1100, slamR:95, grabR:190, grabWarn:750, grabCd:[7500, 9500],
                grabMs:4200, grabSoloMs:1800, grabFree:0.14, grabDps:0.035, recoilMs:2200,
                pushR:240, pushSpd:95, exposeMs:6000, exposeMult:1.8, regrowMs:6500, kiteR:760, kiteMs:2600 };
const LEV_ROLES = ["golpe", "agarre", "corriente", "golpe"];
const LEV_ROLE_TXT = {golpe:"GOLPE", agarre:"AGARRE", corriente:"CORRIENTE"};
Object.assign(ENEMY_BASE, {
  lev_tentaculo: {name:"Tentáculo del Leviatán", rank:"subelite", hp:80, dmg:0, speed:0, radius:30, xp:6, gold:2, scale:2.4, color:"#9a4ac0", ranged:false, structure:true, noDivina:true}
});
let acuLev = null;
function acuLevBoss(){ return enemies.find(e=>e.alive && e.type==="leviatan") || null; }
function acuLevArms(){ return enemies.filter(e=>e.alive && e.type==="lev_tentaculo"); }
function acuLevClear(){
  for(const a of enemies) if(a.alive && a.type==="lev_tentaculo"){ a.alive = false; a.hp = 0; }
  acuLev = null;
}
function acuLevSpawnArms(L){
  const n = LEV_T.count[Math.min(LEV_T.count.length - 1, (L.acuaticaPhase||1) - 1)] - acuLevArms().length;
  const a0 = Math.random()*Math.PI*2, R = LEVIATAN_ORBIT_R*LEV_T.ringK;
  for(let i=0;i<n;i++){
    let p = null;
    for(let k=0;k<8 && !p;k++){
      const a = a0 + i/n*Math.PI*2 + k*0.25, q = {x:Math.cos(a)*R, y:Math.sin(a)*R, radius:30}; clampToArena(q);
      if(!heroes.some(h=>h.alive && Math.hypot(h.x - q.x, h.y - q.y) < 130)) p = q;
    }
    if(!p){ const a = a0 + i/n*Math.PI*2; p = {x:Math.cos(a)*R, y:Math.sin(a)*R, radius:30}; clampToArena(p); }
    const t = spawnEnemy("lev_tentaculo", false, false);
    t.x = t._ax = p.x; t.y = t._ay = p.y; t.encStatic = true; t.structure = true; t.speed = 0;
    t.maxHp = t.hp = Math.max(60, Math.round(L.maxHp*LEV_T.hpPct));
    t.levRole = LEV_ROLES[i % LEV_ROLES.length]; t.levT = 1200 + i*700; t.levGrabIdx = -1;
    vfxTelegraph({shape:0, r:80, x:p.x, y:p.y, dur:700, rgb:"120,210,230"});
    vfxSprite("fxWhirl", 0, p.x, p.y + 10, 110, 900, null, 0.25, false, 0.9);
  }
  playSfx("splat");
}
// Se llama desde la actualización de la Arena Acuática (anfitrión).
function acuLevRule(dt){
  const L = acuLevBoss();
  if(!bossActive || !L){ if(acuLev) acuLevClear(); return; }
  const C = LEV_T, S = acuLev || (acuLev = {st:"none", t:0, ph:0});
  S.t += dt;
  const ph = L.acuaticaPhase||1;
  if(S.ph !== ph){
    S.ph = ph;
    if(S.st!=="open"){ acuLevSpawnArms(L); S.st = "arms"; S.t = 0; }
    if(ph===1){
      showBanner("🐙 Sus TENTÁCULOS lo protegen: neutralizalos para exponer el núcleo");
      if(typeof tutSay==="function" && !tutSeen("lev_arms")) tutSay("lev_arms", "Cada tentáculo tiene una función: GOLPE, AGARRE o CORRIENTE. Mientras vivan, el Leviatán casi no recibe daño. Si agarran a un aliado, ¡pegale a ese tentáculo!", null, 11000, true);
    }
  }
  const arms = acuLevArms(), n = arms.length;
  if(S.st==="arms"){
    L._encMult = C.shield[Math.min(C.shield.length - 1, n)];
    L._encTag = n ? `TENTÁCULOS: ${n} (−${Math.round((1 - L._encMult)*100)}%)` : null;
    if(!n){
      S.st = "open"; S.t = 0; S.x0 = L.x; S.y0 = L.y;
      bossExpose(L, C.exposeMs, C.exposeMult, "🌊 ¡SIN TENTÁCULOS! El Leviatán sale a respirar: NÚCLEO EXPUESTO");
      playSfx("bossRoar");
    }
  } else if(S.st==="open"){
    L._encMult = 1; L._encTag = "¡NÚCLEO EXPUESTO!";
    if(S.t < 800){ const k = 0.4*Math.min(1, S.t/800); L.x = S.x0*(1 - k); L.y = S.y0*(1 - k); }   // se arrima a la costa
    if(!(L._expT > 0)){ S.st = "regrow"; S.t = 0; showBanner("El Leviatán se hunde… los tentáculos vuelven a brotar"); }
  } else if(S.st==="regrow"){
    L._encMult = C.shield[1]; L._encTag = "SE SUMERGE";
    if(S.t >= C.regrowMs){ acuLevSpawnArms(L); S.st = "arms"; S.t = 0; }
  }
  for(const a of arms) acuLevArmTick(a, L, dt);
  // ANTI-KITE: remolinos donde se esconden
  if(bossHeroesFarMs(L, C.kiteR, dt) > C.kiteMs){
    L._kiteMs = 0;
    for(const h of heroes){ if(h.alive && Math.hypot(h.x - L.x, h.y - L.y) >= C.kiteR) bossStrike(h.x, h.y, 100, 1200, L.dmg*0.85, "water", {slow:0.5, slowDur:1600, pull:true}); }
    showBanner("¡Remolinos! Lejos de él no hay refugio");
  }
}
function acuLevArmTick(a, L, dt){
  const C = LEV_T;
  a.levT -= dt; if(a.levAnim > 0) a.levAnim -= dt;
  if(a.levRecoil > 0){ a.levRecoil -= dt; a._encMult = 1.5; a._encTag = null; if(a.levRecoil <= 0) a._encMult = 1; return; }
  // sosteniendo a alguien
  if(a.levGrab){
    const G = a.levGrab, h = heroes[G.i];
    if(!h || !h.alive){ acuLevRelease(a, false); return; }
    G.t += dt; h.stunTimer = Math.max(h.stunTimer||0, 220);
    damageHero(h, h.maxHp*C.grabDps*dt/1000, a);
    const solo = !heroes.some(o=>o.alive && o!==h);
    if(a.hp <= G.hp0 - a.maxHp*C.grabFree){ acuLevRelease(a, true); return; }
    if(G.t >= (solo ? C.grabSoloMs : C.grabMs)) acuLevRelease(a, solo);
    return;
  }
  if(a.levWarn){
    a.levWarn.t += dt;
    if(a.levWarn.t >= C.grabWarn){
      const h = heroes[a.levWarn.i]; a.levWarn = null;
      if(h && h.alive && !(h.invulnTimer > 0) && Math.hypot(h.x - a.x, h.y - a.y) <= C.grabR + (h.radius||18)*0.5 && !acuLevArms().some(o=>o.levGrab && o.levGrab.i===heroes.indexOf(h))){
        a.levGrab = {i:heroes.indexOf(h), t:0, hp0:a.hp}; a.levGrabIdx = a.levGrab.i; a.levAnim = 700;
        h.stunTimer = Math.max(h.stunTimer||0, 400);
        playSfx("splat"); vfxShake(5);
        showBanner(h===player ? "¡Te agarró un tentáculo! Tus aliados pueden liberarte" : `¡Un tentáculo agarró a ${heroLabel(h)}! Pegale para liberarlo`);
      }
    }
    return;
  }
  if(a.levRole==="corriente"){
    for(const h of heroes){
      if(!h.alive || h.isRemote || h.stunTimer > 0) continue;
      const dx = h.x - a.x, dy = h.y - a.y, d = Math.hypot(dx, dy);
      if(d < C.pushR && d > 1){ h.x += dx/d*C.pushSpd*dt/1000; h.y += dy/d*C.pushSpd*dt/1000; clampToArena(h); }
    }
  }
  if(a.levT > 0) return;
  const tgt = bossNearestHero(a.x, a.y), td = tgt ? Math.hypot(tgt.x - a.x, tgt.y - a.y) : 1e9;
  if(a.levRole==="golpe"){
    if(tgt && td < 460){
      bossStrike(tgt.x, tgt.y, C.slamR, C.slamWarn, L.dmg*0.9, "water", {knock:60, slow:0.3, slowDur:900});
      a.levAnim = C.slamWarn + 300;
      a.levT = C.slamCd[0] + Math.random()*(C.slamCd[1] - C.slamCd[0]);
    } else a.levT = 600;
  } else if(a.levRole==="agarre"){
    if(tgt && td < C.grabR){
      a.levWarn = {t:0, i:heroes.indexOf(tgt)};
      vfxTelegraph({shape:0, r:C.grabR, x:a.x, y:a.y, dur:C.grabWarn, rgb:"200,90,255"});
      if(tgt===player) floatText(player.x, player.y - 60, "¡AGARRE! Salí del anillo", "crit");
      a.levT = C.grabCd[0] + Math.random()*(C.grabCd[1] - C.grabCd[0]);
    } else a.levT = 400;
  } else a.levT = 1000;
}
function acuLevRelease(a, hurt){
  const G = a.levGrab; a.levGrab = null; a.levGrabIdx = -1;
  const h = G && heroes[G.i];
  if(h && h.alive){ h.stunTimer = 0; if(h===player) floatText(h.x, h.y - 60, "¡LIBRE!", "heal"); }
  if(hurt && a.alive){ a.levRecoil = LEV_T.recoilMs; a.levT = Math.max(a.levT, LEV_T.recoilMs); floatText(a.x, a.y - 120, "¡Se retrae! Pegale", "crit"); vfxBurst(a.x, a.y - 40, 12, "water", 140, 500, 3, 1, -60, 0); }
}
function acuLevKilled(e){
  if(e.type!=="lev_tentaculo") return;
  if(e.levGrab){ const h = heroes[e.levGrab.i]; if(h && h.alive) h.stunTimer = 0; }
  vfxSprite("fxWhirl", 0, e.x, e.y + 10, 120, 700, null, 0.25, false, 0.9);
  vfxBurst(e.x, e.y - 30, 18, "water", 160, 700, 4, 2, -60, 0);
  if(acuLev && acuLev.st==="arms") floatText(e.x, e.y - 110, "Tentáculo neutralizado", "heal");
}
// bots: el tentáculo que agarra a un aliado es lo primero; después los demás y el núcleo expuesto
function acuLevBotTarget(h, range){
  if(!bossActive || !acuLev) return null;
  let best = null, bs = -Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    const d = Math.hypot(e.x - h.x, e.y - h.y); if(d > range + 400) continue;
    let s = -Infinity;
    if(e.type==="lev_tentaculo") s = (e.levGrab ? 900 : 560) - d*0.3;
    else if(e.type==="leviatan" && e._expT > 0) s = 720 - d*0.1;
    if(s > bs){ bs = s; best = e; }
  }
  return best;
}
// dibujo: el tentáculo real (hoja del Kraken) saliendo del agua; el agarre y la corriente se ven
function acuLevDrawBody(e){
  if(e.type!=="lev_tentaculo") return false;
  if(!acua2Ready("krTent")) return true;
  const t = animNow/1000, n = ACUA2_IMG.krTent.length;
  const i = e.levGrabIdx >= 0 ? 3 : e.levAnim > 0 ? 4 : (Math.floor(t*3 + e.x*0.01) % 3);
  const sway = Math.sin(t*2 + e.x)*0.06;
  drawImgSized(acua2Pick("krTent", i % n), e.x, e.y + 12, e.levAnim > 0 ? 150 : 128, 0.5, 0.95, e.x > 0, e.levRecoil > 0 ? 0.7 : 1, sway);
  return true;
}
function acuLevDrawTop(){
  const t = animNow/1000;
  for(const a of enemies){
    if(!a.alive || a.type!=="lev_tentaculo" || !inView(a.x, a.y, 320)) continue;
    ctx.save();
    if(a.levRole==="corriente"){
      ctx.strokeStyle = "rgba(140,220,240,0.35)"; ctx.lineWidth = 3; ctx.setLineDash([18, 16]); ctx.lineDashOffset = -t*70;
      ctx.beginPath(); ctx.ellipse(a.x, a.y, LEV_T.pushR, LEV_T.pushR*0.62, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    }
    const h = a.levGrabIdx >= 0 ? heroes[a.levGrabIdx] : null;
    if(h && h.alive){
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(70,20,70,0.95)"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(a.x, a.y - 40); ctx.quadraticCurveTo((a.x + h.x)/2, Math.min(a.y, h.y) - 90, h.x, h.y - 20); ctx.stroke();
      ctx.strokeStyle = "rgba(220,120,200,0.9)"; ctx.lineWidth = 4; ctx.setLineDash([6, 10]); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(160,60,170,0.9)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(h.x, h.y - 14, 24, 12, 0, 0, Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle = a.levRole==="agarre" ? "#e6a8ff" : a.levRole==="corriente" ? "#9fe6ff" : "#ffd08a";
    ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
    ctx.fillText(LEV_ROLE_TXT[a.levRole] || "", a.x, a.y - 150);
    ctx.restore();
  }
}
// invitado: la corriente también lo empuja a él
function acuLevGuestPush(dt){
  if(!player || !player.alive || player.stunTimer > 0) return;
  for(const a of enemies){
    if(!a.alive || a.type!=="lev_tentaculo" || a.levRole!=="corriente") continue;
    const dx = player.x - a.x, dy = player.y - a.y, d = Math.hypot(dx, dy);
    if(d < LEV_T.pushR && d > 1){ player.x += dx/d*LEV_T.pushSpd*dt/1000; player.y += dy/d*LEV_T.pushSpd*dt/1000; clampToArena(player); }
  }
}
BOSS_CLEANUP_EXTRA.push(()=>{ if(currentArena==="acuatica") acuLevClear(); });
{
  const X = ARENA_EXT.acuatica, up0 = X.update, gu0 = X.guestUpdate, ek0 = X.enemyKilled, dt0 = X.drawTop;
  X.update = function(dt){ acuLevRule(dt); return up0.apply(this, arguments); };
  X.guestUpdate = function(dt){ acuLevGuestPush(dt); return gu0 ? gu0.apply(this, arguments) : undefined; };
  X.enemyKilled = function(e){ acuLevKilled(e); return ek0 ? ek0.apply(this, arguments) : undefined; };
  X.drawTop = function(){ if(dt0) dt0.apply(this, arguments); acuLevDrawTop(); };
  X.drawEnemyBody = acuLevDrawBody;
  X.botTarget = acuLevBotTarget;
}
