"use strict";
/* ============================================================
   js/systems/item-procs.js
   Poderes de los objetos legendarios/míticos/únicos (ver LEGEND_PROCS en js/data/items.js):
   efectos visibles que se disparan al golpear, matar, lanzar habilidades o recibir daño.
   Los usan tanto el jugador como los aliados (que también llevan su equipo).
   ============================================================ */

function _procPower(h, id){
  if(!h || !h.classKey) return 0;
  const procs = heroProcs(h.classKey);
  return procs ? (procs[id]||0) : 0;
}
function _procReady(h, key, cdMs){
  if(!h._procCds) h._procCds = {};
  const now = runElapsedMs;
  if((h._procCds[key]||-1e9) + cdMs > now) return false;
  h._procCds[key] = now;
  return true;
}
function _procDmgBase(h){ return h.baseDmg * runStats.dmgMult * (h.buffDmgMult||1); }

// Golpe a un enemigo hecho por un héroe (no se llama para el daño que ya viene de un poder).
function itemProcsOnHit(h, e, dmg, crit, opts){
  if(!h.classKey) return;
  mythicOnHit(h, e, dmg, crit, opts);
  uniqueOnHit(h, e, dmg, crit, opts);
  if(!e.alive) return;
  const fromBasic = !!opts.fromBasic;
  let p;
  if(fromBasic && (p = _procPower(h, "basic_chain"))){
    h._procChainN = (h._procChainN||0) + 1;
    if(h._procChainN >= 4){
      h._procChainN = 0;
      let cur = e, px = e.x, py = e.y - 14; const hit = [e];
      for(let i=0;i<3;i++){
        let next = null, bd = 210;
        for(const o of enemies){ if(!o.alive || hit.includes(o)) continue; const d = Math.hypot(o.x-cur.x, o.y-cur.y); if(d < bd){ bd = d; next = o; } }
        if(!next) break;
        pushChainBolt(px, py, next.x, next.y-10, 22, 320);
        damageEnemy(next, _procDmgBase(h)*0.75*p, {src:h, fromProc:true});
        hit.push(next); px = next.x; py = next.y-14; cur = next;
      }
      pushSpark("impacto", e.x, e.y, 46, 280);
    }
  }
  if(fromBasic && (p = _procPower(h, "basic_freeze"))){
    e.slowAmt = Math.max(e.slowAmt||0, 0.3); e.slowTimer = Math.max(e.slowTimer||0, 1200);
    h._procFreezeN = (h._procFreezeN||0) + 1;
    if(h._procFreezeN >= 6){
      h._procFreezeN = 0;
      const big = e.rank==="jefe" || e.rank==="subjefe";
      e.stunTimer = Math.max(e.stunTimer||0, big ? 250 : 800*Math.min(1.6, p));
      vfxBurst(e.x, e.y-16, 10, "ice", 120, 360, 3, h===player?2:1, -30, 0);
      vfxShock(e.x, e.y, 6, 40+(e.radius||20), "160,220,255", 300, 1);
    }
  }
  if(fromBasic && (p = _procPower(h, "combo_ramp"))){
    h._rampStacks = Math.min(10, (h._rampStacks||0) + 1);
    h._rampTimer = 2000;
    if(h._rampStacks >= 2) damageEnemy(e, dmg*0.035*h._rampStacks*p, {src:h, fromProc:true});
    if(h._rampStacks===10 && h===player && _procReady(h, "rampMsg", 4000)) floatText(h.x, h.y-58, "¡FURIA x10!", "crit");
  }
  if(crit && (p = _procPower(h, "crit_quake")) && _procReady(h, "quake", 600)){
    const R = 80;
    for(const o of enemies){
      if(!o.alive || o===e || Math.hypot(o.x-e.x, o.y-e.y) > R) continue;
      damageEnemy(o, dmg*0.4*p, {src:h, fromProc:true});
      if(o.rank==="normal" || o.rank==="subelite") o.stunTimer = Math.max(o.stunTimer||0, 220);
    }
    vfxShock(e.x, e.y, 10, R, "255,210,120", 320, h===player?2:1);
    vfxBurst(e.x, e.y, 6, "rock", 110, 280, 3, 0, -30, 0);
  }
  // Brasa Viva: los básicos prenden fuego (reusa la quemadura de siempre).
  if(fromBasic && (p = _procPower(h, "ignite_basic"))){
    e.burnTimer = Math.max(e.burnTimer||0, 2500); e.burnDmg = Math.max(e.burnDmg||0, _procDmgBase(h)*0.22*p);
    if(Math.random()<0.25) vfxBurst(e.x, e.y-14, 3, "ember", 60, 260, 2.5, 0, -40, 1);
  }
  // Filo Sediento: los básicos abren heridas (sangrado que se refresca).
  if(fromBasic && (p = _procPower(h, "bleed_basic"))){
    e.bleedTimer = Math.max(e.bleedTimer||0, 3000); e.bleedDmg = Math.max(e.bleedDmg||0, _procDmgBase(h)*0.2*p);
  }
  // Descarga Arcana: las habilidades pueden electrocutar (aturde y salta a un enemigo cercano).
  if(!fromBasic && (p = _procPower(h, "shock_skill")) && Math.random() < 0.2*Math.min(1.5,p) && _procReady(h, "shock", 250)){
    if(e.rank!=="jefe" && e.rank!=="subjefe") e.stunTimer = Math.max(e.stunTimer||0, 350);
    e.shockedTimer = 1200;
    let next = null, bd = 170;
    for(const o of enemies){ if(!o.alive || o===e) continue; const d = Math.hypot(o.x-e.x, o.y-e.y); if(d < bd){ bd = d; next = o; } }
    if(next){ pushChainBolt(e.x, e.y-12, next.x, next.y-10, 16, 260); damageEnemy(next, _procDmgBase(h)*0.6*p, {src:h, fromProc:true}); }
    vfxBurst(e.x, e.y-14, 5, "shock", 90, 240, 2.5, 0, -20, 1);
  }
}
// Multiplicador de daño de los poderes de objeto contra ESTE enemigo (lo lee damageEnemy).
function itemDamageMult(h, e, opts){
  if(!h || !h.classKey) return 1;
  let m = 1, p;
  if((p = _procPower(h, "burn_vs")) && e.burnTimer>0) m *= 1 + 0.25*p;
  if((p = _procPower(h, "execute_edge")) && e.rank!=="jefe" && e.rank!=="subjefe" && e.hp < e.maxHp*0.2) m *= 1 + 0.6*p;
  return m * mythicDamageMult(h, e, opts);
}
// Daño crítico extra de los poderes (Frío que Quiebra, Eclipse).
function itemCritMultBonus(h, e){
  if(!h || !h.classKey) return 0;
  let b = 0, p;
  if((p = _procPower(h, "cold_crit")) && (e.slowTimer>0 || e.stunTimer>0 || e.frozenTimer>0)) b += 0.5*p;
  return b + mythicCritMultBonus(h, e);
}
// Velocidad de movimiento de los poderes (Paso del Cazador, Gracia Veloz).
function itemSpeedMult(h){
  if(!h) return 1;
  let m = 1;
  if(h._hasteStacks) m *= 1 + 0.03*h._hasteStacks;
  if(h._healHasteT > 0) m *= 1.18;
  return m;
}
// Daño recibido: Guardia Juramentada (aliados cerca de quien la lleva) y Último Bastión.
function itemDmgTakenMult(h){
  let m = 1;
  for(const o of heroes){
    if(o===h || !o.alive || !o.classKey) continue;
    const d = Math.hypot(o.x-h.x, o.y-h.y);
    if(d < 200 && _procPower(o, "ally_ward")) m *= 0.9;
    if(d < 220){ const my = heroMythics(o.classKey); if(my && my.myth_bastion) m *= 0.88; }
  }
  return Math.max(0.7, m);
}

function itemProcsOnKill(h, e){
  if(!h || !h.classKey || !h.alive) return;
  let p;
  if((p = _procPower(h, "kill_explode")) && Math.random() < Math.min(0.6, 0.24*p)){
    const R = 100, dmg = _procDmgBase(h)*1.1*p;
    for(const o of enemies){
      if(!o.alive || Math.hypot(o.x-e.x, o.y-e.y) > R) continue;
      damageEnemy(o, dmg, {src:h, fromProc:true, burn:true});
    }
    vfxBurst(e.x, e.y-10, 16, "ember", 170, 420, 3.5, h===player?2:1, -40, 0);
    vfxShock(e.x, e.y, 10, R, "255,140,50", 380, h===player?2:1);
    if(h===player) playSfx("boom");
  }
  if((p = _procPower(h, "kill_heal"))){
    const big = e.rank==="jefe" || e.rank==="subjefe";
    const pct = big ? 0.15 : (e.rank==="elite" ? 0.06 : 0.012);
    const amt = h.maxHp*pct*p;
    const before = h.hp; h.hp = Math.min(h.maxHp, h.hp + amt);
    if(h===player && h.hp-before > h.maxHp*0.02) floatText(h.x, h.y-34, "+"+Math.round(h.hp-before), "heal");
  }
  if((p = _procPower(h, "haste_on_kill"))){
    h._hasteStacks = Math.min(10, (h._hasteStacks||0) + 1); h._hasteT = 4000;
  }
  mythicOnKill(h, e);
}

function itemProcsOnCast(h, sk, isUlt){
  mythicOnCast(h, sk, isUlt);
  const p = _procPower(h, "skill_nova");
  if(!p || !_procReady(h, "nova", 1500)) return;
  const R = 125, dmg = _procDmgBase(h)*(isUlt ? 2.2 : 1.1)*p;
  for(const o of enemies){
    if(!o.alive || Math.hypot(o.x-h.x, o.y-h.y) > R) continue;
    damageEnemy(o, dmg, {src:h, fromProc:true});
  }
  vfxShock(h.x, h.y, 16, R, "190,140,255", 380, h===player?2:1);
  vfxBurst(h.x, h.y-14, 8, "arcane", 130, 320, 3, h===player?1:0, -30, 1);
}

function itemProcsOnHurt(h, dmg, src){
  if(!h.classKey) return;
  // Represalia: quien pega cuerpo a cuerpo recibe parte del golpe y queda aturdido un instante.
  let pr;
  if(src && src.alive && src.maxHp && !src.ranged && (pr = _procPower(h, "retaliate")) && _procReady(h, "retal", 1200) && Math.hypot(src.x-h.x, src.y-h.y) < 140){
    damageEnemy(src, dmg*0.35*pr + _procDmgBase(h)*0.5, {src:h, fromProc:true});
    if(src.rank!=="jefe" && src.rank!=="subjefe") src.stunTimer = Math.max(src.stunTimer||0, 450);
    vfxShock(src.x, src.y, 6, 34, "255,200,120", 240, h===player?1:0);
  }
  mythicOnHurt(h, dmg, src);
  if(dmg < h.maxHp*0.07) return;
  const p = _procPower(h, "hit_shield");
  if(!p || !_procReady(h, "aegis", 8000)) return;
  h.shield = Math.min(h.maxHp*0.5, (h.shield||0) + h.maxHp*0.14*p);
  h.shieldTimer = Math.max(h.shieldTimer||0, 5000);
  vfxShock(h.x, h.y-10, 10, 46, "143,208,255", 360, h===player?2:1);
  if(h===player) floatText(h.x, h.y-52, "¡ÉGIDA!", "heal");
}

function updateItemProcTimers(h, dt){
  if(h._rampTimer>0){ h._rampTimer -= dt; if(h._rampTimer<=0) h._rampStacks = 0; }
  if(h._hasteT>0){ h._hasteT -= dt; if(h._hasteT<=0) h._hasteStacks = 0; }
  if(h._healHasteT>0) h._healHasteT -= dt;
  if(!h.alive || !h.classKey) return;
  // Aliento Glacial: aura de frío (cada 0,4 s, ralentiza 18% a los enemigos cerca)
  const fa = _procPower(h, "frost_aura");
  if(fa){
    h._frostAuraT = (h._frostAuraT||0) - dt;
    if(h._frostAuraT<=0){
      h._frostAuraT = 400;
      for(const e of enemies){ if(!e.alive || Math.hypot(e.x-h.x, e.y-h.y) > 120) continue; e.slowAmt = Math.max(e.slowAmt||0, 0.18*Math.min(1.4,fa)); e.slowTimer = Math.max(e.slowTimer||0, 600); }
      if(h===player && Math.random()<0.5) vfxBurst(h.x+(Math.random()-0.5)*160, h.y+(Math.random()-0.5)*110, 1, "ice", 20, 700, 2, 0, -12, 1);
    }
  }
  updateMythicPowers(h, dt);
}
// Gracia Veloz: curar a un aliado les da velocidad a los dos (lo llama trackHeal).
function itemProcsOnHeal(caster, target, restored){
  if(!caster || !caster.classKey || restored <= 0) return;
  if(_procPower(caster, "heal_haste") && target && target!==caster){ caster._healHasteT = 2500; target._healHasteT = 2500; }
  mythicOnHeal(caster, target, restored);
}
