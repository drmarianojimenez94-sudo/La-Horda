"use strict";
/* ============================================================
   js/systems/set-effects.js
   Comportamiento en combate de los SETS (datos en js/data/sets.js + SET_DB de items.js).
   Los bonus de estadísticas se suman por passiveSum (activeSetBonusEffects); acá vive lo que
   CAMBIA LA FORMA DE JUGAR: fragmentos del Glaciar, onda del Coloso, tormenta, frenesí,
   juramento, amanecer, presa marcada, resonancia, impulso, esqueletos élite, infierno.
   Lo usan el jugador y los bots (que también llevan equipo). Todos los disparos tienen tope
   o enfriamiento interno: ningún set puede encadenarse sin límite.
   ============================================================ */

// Piezas equipadas de cada set por héroe, cacheadas por cuadro (mismo reloj que las pasivas).
function heroSetCounts(h){
  if(!h || !h.classKey || !save.champions[h.classKey]) return null;
  if(h._setFrame === _passiveFrame && h._setCounts) return h._setCounts;
  const c = {};
  for(const id in SET_DB){ const n = equippedSetCount(h.classKey, id); if(n) c[id] = n; }
  h._setCounts = c; h._setFrame = _passiveFrame;
  return c;
}
function setN(h, id){ const c = heroSetCounts(h); return c ? (c[id]||0) : 0; }
function setFull(h, id){ return setN(h, id) >= setFullCount(id); }
function _setBase(h){ return h.baseDmg * runStats.dmgMult * (h.buffDmgMult||1); }
const _isPriority = e => e.rank==="elite" || e.rank==="subjefe" || e.rank==="jefe";
function _setReady(h, key, ms){
  if(!h._setCd) h._setCd = {};
  if((h._setCd[key]||-1e9) + ms > runElapsedMs) return false;
  h._setCd[key] = runElapsedMs; return true;
}
function _setMsg(h, txt, kind){ if(h===player) floatText(h.x, h.y-64, txt, kind||"crit"); }

/* ---------------- modificadores leídos por las fórmulas ---------------- */
function setDamageMult(h, e, opts){
  if(!h || !h.classKey) return 1;
  const c = heroSetCounts(h); if(!c) return 1;
  let m = 1;
  if((c.glaciar||0) >= 3 && (e.slowTimer>0 || e.stunTimer>0)) m *= 1.12;
  if((c.cazador||0) >= 2 && _isPriority(e)) m *= 1.10;
  if(h._berserkT > 0) m *= 1.20;
  if(h._arcaneT > 0 && !opts.fromBasic) m *= 1.45;
  if(h._albaDmgT > 0) m *= 1.15;
  if(h._momentum) m *= 1 + 0.025*h._momentum;
  return m;
}
// Concentración de Sombra del Cazador: crítico extra solo contra la presa marcada.
function setCritBonus(h, e){
  if(!h || !h._focus || h._mark !== e) return null;
  return {chance: 0.03*h._focus, mult: 0.05*h._focus};
}
function setAtkSpeedMult(h){ return h && h._berserkT > 0 ? 1.25 : 1; }
function setLifestealAdd(h){ return h && h._berserkT > 0 ? 0.25 : 0; }
function setSpeedMult(h){ return h && h._momentum ? 1 + 0.02*h._momentum : 1; }
function setDmgTakenMult(h){ return h && h._guardDRT > 0 ? 0.75 : 1; }
function setSummonMult(h){ return setN(h, "sepulturero") >= 2 ? 1.2 : 1; }
function setReviveHpPct(by){ return setN(by, "guardian") >= 3 ? 0.6 : 0.4; }

/* ---------------- eventos de combate ---------------- */
function setsOnHit(h, e, dmg, crit, opts){
  const c = heroSetCounts(h); if(!c) return;
  const fromBasic = !!opts.fromBasic;
  // Glaciar 2: las habilidades ralentizan
  if((c.glaciar||0) >= 2 && !fromBasic && e.alive){ e.slowAmt = Math.max(e.slowAmt||0, 0.2); e.slowTimer = Math.max(e.slowTimer||0, 1650); }
  // Glaciar 4: fragmentos sobre enemigos ralentizados/congelados
  if((c.glaciar||0) >= 4 && e.alive && (e.slowTimer>0 || e.stunTimer>0) && (runElapsedMs - (e._fragAt||0)) > 160){
    e._fragAt = runElapsedMs; e._frag = (e._frag||0) + 1; e._fragBy = h;
    if(e._frag >= 5){ e._frag = 0; glacialBurst(h, e, 1); }
  }
  // Tempestad 4: cada golpe carga la tormenta
  if((c.tempestad||0) >= 4 && !h._stormReady){
    h._storm = (h._storm||0) + 1;
    if(h._storm >= 30){ h._storm = 30; h._stormReady = true; _setMsg(h, "¡TEMPESTAD LISTA!"); }
  }
  // Sombra del Cazador 4: presa marcada + concentración
  if((c.cazador||0) >= 4 && _isPriority(e) && e.alive){
    if(h._mark !== e){ h._focus = Math.floor((h._focus||0)/2); h._mark = e; }
    else if(_setReady(h, "focus", 120)){ h._focus = Math.min(10, (h._focus||0) + 1); if(h._focus===10 && _setReady(h, "focusMsg", 6000)) _setMsg(h, "¡PRESA ACORRALADA!"); }
  }
  // Lucifer 6: con poca vida, los básicos incendian
  if((c.lucifer||0) >= 6 && fromBasic && h.hp < h.maxHp*0.5 && e.alive && _setReady(h, "lucIgnite", 300)){
    damageEnemy(e, _setBase(h)*0.3, {src:h, fromProc:true, burn:true});
    vfxBurst(e.x, e.y-12, 5, "ember", 90, 260, 3, 0, -30, 0);
  }
}
function setsOnKill(h, e){
  const c = heroSetCounts(h); if(!c) return;
  if((c.glaciar||0) >= 4 && e._frag >= 2 && e._fragBy === h){ glacialBurst(h, e, e._frag/5); e._frag = 0; }
  if((c.lucifer||0) >= 6 && h.hp < h.maxHp*0.5 && _setReady(h, "lucBoom", 500)){
    const R = 95, d = _setBase(h)*0.9;
    for(const o of enemies){ if(o.alive && Math.hypot(o.x-e.x, o.y-e.y) <= R) damageEnemy(o, d, {src:h, fromProc:true, burn:true}); }
    vfxShock(e.x, e.y, 8, R, "255,110,40", 360, h===player?2:1);
    vfxBurst(e.x, e.y-10, 12, "ember", 150, 380, 3.5, h===player?1:0, -40, 0);
  }
  // Sepulturero 4 (sin ejército propio): las bajas de élites levantan un guerrero no-muerto
  if((c.sepulturero||0) >= 4 && _isPriority(e) && e.rank!=="jefe" && h.skeletons && h.skeletons.length < 2 && h.classKey!=="nigromante"){
    spawnNigroSkeleton(h, "warrior", {});
    _setMsg(h, "¡SE LEVANTA!", "heal");
  }
}
function glacialBurst(h, e, power){
  if(!_setReady(h, "glacial", 220)) return;
  const R = 110, d = _setBase(h)*1.3*Math.max(0.4, power);
  for(const o of enemies){
    if(!o.alive || Math.hypot(o.x-e.x, o.y-e.y) > R) continue;
    damageEnemy(o, d, {src:h, fromProc:true});
    o.slowAmt = Math.max(o.slowAmt||0, 0.5); o.slowTimer = Math.max(o.slowTimer||0, 2000);
    if(o.rank==="normal" || o.rank==="subelite") o.stunTimer = Math.max(o.stunTimer||0, 600);
  }
  vfxShock(e.x, e.y, 10, R, "170,230,255", 420, h===player?2:1);
  vfxBurst(e.x, e.y-14, 14, "ice", 160, 420, 3.5, h===player?1:0, -40, 0);
  if(h===player) playSfx("boom");
}
function setsOnCast(h, sk, isUlt){
  const c = heroSetCounts(h); if(!c) return;
  // Tempestad 4: la tormenta sale con la siguiente habilidad
  if((c.tempestad||0) >= 4 && h._stormReady){
    h._stormReady = false; h._storm = 0;
    const hit = []; let px = h.x, py = h.y - 20;
    for(let i=0;i<6;i++){
      let next = null, bd = 330;
      for(const o of enemies){ if(!o.alive || hit.includes(o)) continue; const dd = Math.hypot(o.x-px, o.y-py); if(dd < bd){ bd = dd; next = o; } }
      if(!next) break;
      pushChainBolt(px, py, next.x, next.y-10, 26, 380);
      damageEnemy(next, _setBase(h)*1.0, {src:h, fromProc:true, slow:0.3, slowDur:900});
      hit.push(next); px = next.x; py = next.y - 14;
    }
    vfxShock(h.x, h.y, 12, 90, "150,190,255", 360, h===player?2:1);
    _setMsg(h, "¡TEMPESTAD!");
  }
  // Ojo del Arcano 4: habilidades distintas seguidas = Resonancia
  if((c.arcano||0) >= 4 && !isUlt){
    if(h._lastSk === sk) h._reso = 1; else h._reso = (h._reso||0) + 1;
    h._lastSk = sk;
    if(h._reso >= 3){ h._reso = 0; h._arcaneT = 4000; _setMsg(h, "¡RESONANCIA!"); vfxShock(h.x, h.y, 10, 70, "200,140,255", 360, h===player?2:1); }
  }
}
// dmgFinal = daño que llegó a la vida; mitigated = lo que frenó la defensa; absorbed = escudos
function setsOnHurt(h, dmgFinal, mitigated, absorbed){
  const c = heroSetCounts(h); if(!c) return;
  if((c.coloso||0) >= 4){
    h._colossus = (h._colossus||0) + mitigated + absorbed;
    if(h._colossus >= h.maxHp*0.30 && _setReady(h, "colossus", 3000)){ h._colossus = 0; colossalWave(h); }
  }
  if((c.guardian||0) >= 4 && (mitigated+absorbed) > 0 && heroes.some(o=>o!==h && o.alive && distance(o,h) < 220)){
    guardianOath(h, (mitigated+absorbed)/h.maxHp*100/3);
  }
  if((c.berserker||0) >= 4 && h.hp > 0 && h.hp < h.maxHp*0.30 && !(h._berserkCd > 0)){
    h._berserkT = 6000; h._berserkCd = 40000;
    _setMsg(h, "¡FRENESÍ!"); vfxShock(h.x, h.y, 10, 80, "230,50,40", 420, h===player?2:1);
    if(h===player) playSfx("heavy");
  }
  if((c.laberinto||0) >= 4){
    if(dmgFinal >= h.maxHp*0.08){ if(h._momentum >= 4) _setMsg(h, "Impulso roto", null); h._momentum = 0; }
    h._noHitT = 0;
  }
}
function colossalWave(h){
  const R = 170, d = _setBase(h)*1.4;
  for(const o of enemies){
    if(!o.alive || distance(o,h) > R) continue;
    damageEnemy(o, d, {src:h, fromProc:true, knockback:true});
    o.stunTimer = Math.max(o.stunTimer||0, (o.rank==="jefe"||o.rank==="subjefe") ? 250 : (o.rank==="elite" ? 400 : 700));
  }
  for(const a of heroes){
    if(!a.alive || distance(a,h) > 220) continue;
    a.shield = Math.min(a.maxHp*0.5, (a.shield||0) + a.maxHp*0.12); a.shieldTimer = Math.max(a.shieldTimer||0, 5000);
  }
  vfxShock(h.x, h.y, 14, R, "230,190,110", 520, h===player?2:1); vfxShake(6);
  _setMsg(h, "¡ONDA COLOSAL!");
  if(h===player) playSfx("boom");
}
function guardianOath(h, add){
  h._oath = (h._oath||0) + add;
  if(h._oath >= 30 && _setReady(h, "oath", 6000)){
    h._oath = 0;
    for(const a of heroes){
      if(!a.alive || distance(a,h) > 260) continue;
      a.shield = Math.min(a.maxHp*0.5, (a.shield||0) + a.maxHp*0.18); a.shieldTimer = Math.max(a.shieldTimer||0, 4000);
      a._guardDRT = 4000;
      vfxShock(a.x, a.y-8, 8, 44, "143,208,255", 360, a===player?2:1);
    }
    vfxShock(h.x, h.y, 12, 260, "143,208,255", 520, h===player?2:1);
    _setMsg(h, "¡JURAMENTO!", "heal");
    if(h===player) playSfx("shield");
  }
}
// Soporte que escuda/potencia aliados (Juramento del Guardián)
function setsOnSupport(h, n){ if(setN(h, "guardian") >= 4) guardianOath(h, 3*n); }
function setsOnRevive(by){ if(by && setN(by, "guardian") >= 4) guardianOath(by, 10); }
// Curación EFECTIVA (sin lo que sobra) -> Profecía del Alba
function setsOnHeal(h, effective){
  if(!h || effective <= 0 || setN(h, "alba") < 4) return;
  if(h._albaReady){
    h._albaReady = false;
    for(const a of heroes){
      if(!a.alive || distance(a,h) > 300) continue;
      a.regenTimer = Math.max(a.regenTimer||0, 5000); a.regenPerSec = Math.max(a.regenPerSec||0, a.maxHp*0.03);
      a._albaDmgT = 5000;
      vfxBurst(a.x, a.y-20, 6, "heal", 80, 400, 3, 0, -40, 0);
    }
    vfxShock(h.x, h.y, 12, 300, "255,230,140", 560, h===player?2:1);
    _setMsg(h, "¡AMANECER!", "heal");
    if(h===player) playSfx("heal");
    return;
  }
  h._alba = (h._alba||0) + effective;
  if(h._alba >= h.maxHp*0.6){ h._alba = 0; h._albaReady = true; _setMsg(h, "Amanecer listo", "heal"); }
}
// Un aviso de ataque terminó: los que estaban cerca pero FUERA lo esquivaron (Rey del Laberinto)
function setsOnTelegraphEnd(s){
  if(s.shape===4) return;
  for(const h of heroes){
    if(!h.alive || setN(h, "laberinto") < 4) continue;
    const d = Math.hypot(h.x-s.x, h.y-s.y);
    const r = s.shape===3 ? s.r : (s.shape===0 ? s.r : 0);
    if(r>0 && d > r + 6 && d < r + 140){ h._momentum = Math.min(10, (h._momentum||0) + 2); if(h===player && h._momentum>=10 && _setReady(h, "momMsg", 5000)) _setMsg(h, "¡IMPULSO MÁXIMO!"); }
  }
}
function updateSets(h, dt){
  if(h._berserkT > 0){ h._berserkT -= dt; if(Math.random() < 0.3) particles.push({x:h.x+(Math.random()-0.5)*20, y:h.y-10, vx:0, vy:-30, life:300, color:"#e63228"}); }
  if(h._berserkCd > 0) h._berserkCd -= dt;
  if(h._arcaneT > 0) h._arcaneT -= dt;
  if(h._albaDmgT > 0) h._albaDmgT -= dt;
  if(h._guardDRT > 0) h._guardDRT -= dt;
  if(h._mark && !h._mark.alive){ h._mark = null; }
  if(!h.alive) return;
  const c = heroSetCounts(h); if(!c) return;
  if((c.laberinto||0) >= 4){
    h._noHitT = (h._noHitT||0) + dt;
    if(h._noHitT >= 1500){ h._noHitT = 0; h._momentum = Math.min(10, (h._momentum||0) + 1); }
  } else h._momentum = 0;
  // Sepulturero 4 (Nigromante): calidad sobre cantidad
  if((c.sepulturero||0) >= 4 && h.skeletons && h.skeletons.length >= 3){
    h._fuseT = (h._fuseT||0) + dt;
    if(h._fuseT >= 16000){
      h._fuseT = 0;
      const plain = h.skeletons.filter(s=>s.alive && !s.elite);
      if(plain.length >= 2){
        const [a, b] = plain;
        b.alive = false;
        a.elite = true; a.maxHp = a.hp = (a.maxHp + b.maxHp)*1.3; a.dmg *= 2.4; a.scale = 1.35;
        vfxShock(a.x, a.y, 8, 60, "122,212,138", 420, h===player?2:1);
        vfxBurst(a.x, a.y-20, 12, "heal", 110, 420, 3, 0, -40, 0);
        _setMsg(h, "¡ESQUELETO ÉLITE!", "heal");
      }
    }
  }
}
// Aura discreta del set completo bajo el héroe (color del set; más intensa con la carga).
function drawSetAuras(){
  for(const h of heroes){
    if(!h.alive || !inView(h.x, h.y, 60)) continue;
    const c = heroSetCounts(h); if(!c) continue;
    let id = null;
    for(const k in c){ if(c[k] >= setFullCount(k)){ id = k; break; } }
    if(!id) continue;
    const S = SET_DB[id];
    let charge = 0.3, hot = false;
    if(id==="tempestad"){ charge = (h._storm||0)/30; hot = !!h._stormReady; }
    else if(id==="coloso") charge = Math.min(1, (h._colossus||0)/(h.maxHp*0.3));
    else if(id==="guardian"){ charge = Math.min(1, (h._oath||0)/30); hot = h._guardDRT > 0; }
    else if(id==="alba"){ charge = Math.min(1, (h._alba||0)/(h.maxHp*0.6)); hot = !!h._albaReady; }
    else if(id==="berserker"){ hot = h._berserkT > 0; charge = hot ? 1 : 0.2; }
    else if(id==="arcano"){ charge = (h._reso||0)/3; hot = h._arcaneT > 0; }
    else if(id==="cazador") charge = (h._focus||0)/10;
    else if(id==="laberinto") charge = (h._momentum||0)/10;
    else if(id==="lucifer"){ hot = h.hp < h.maxHp*0.5; charge = hot ? 0.8 : 0.25; }
    const pulse = 0.5 + 0.5*Math.sin(animNow/(hot ? 110 : 260));
    const a = 0.12 + 0.3*charge + (hot ? 0.25*pulse : 0.06*pulse);
    ctx.save();
    ctx.strokeStyle = `rgba(${S.aura},${Math.min(0.85, a)})`; ctx.lineWidth = hot ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y+2, h.radius*1.25, h.radius*0.5, 0, 0, Math.PI*2); ctx.stroke();
    if(hot){ ctx.globalAlpha = 0.25*pulse; ctx.fillStyle = `rgb(${S.aura})`; ctx.fill(); }
    ctx.restore();
    // presa marcada (Sombra del Cazador) sobre el objetivo
    if(id==="cazador" && h._mark && h._mark.alive && h===player){
      const m = h._mark; ctx.save(); ctx.strokeStyle = `rgba(190,120,255,${0.5+0.4*pulse})`; ctx.lineWidth = 2.5; ctx.setLineDash([6,5]); ctx.lineDashOffset = -animNow/40;
      ctx.beginPath(); ctx.ellipse(m.x, m.y+4, (m.radius||30)*1.4, (m.radius||30)*0.6, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }
  }
}
function resetSetRunState(h){
  h._storm = 0; h._stormReady = false; h._colossus = 0; h._oath = 0; h._alba = 0; h._albaReady = false;
  h._berserkT = 0; h._berserkCd = 0; h._arcaneT = 0; h._reso = 0; h._lastSk = null; h._focus = 0; h._mark = null;
  h._momentum = 0; h._noHitT = 0; h._fuseT = 0; h._guardDRT = 0; h._albaDmgT = 0; h._setCd = {};
}
