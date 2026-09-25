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
}

function itemProcsOnCast(h, sk, isUlt){
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

function itemProcsOnHurt(h, dmg){
  if(!h.classKey || dmg < h.maxHp*0.07) return;
  const p = _procPower(h, "hit_shield");
  if(!p || !_procReady(h, "aegis", 8000)) return;
  h.shield = Math.min(h.maxHp*0.5, (h.shield||0) + h.maxHp*0.14*p);
  h.shieldTimer = Math.max(h.shieldTimer||0, 5000);
  vfxShock(h.x, h.y-10, 10, 46, "143,208,255", 360, h===player?2:1);
  if(h===player) floatText(h.x, h.y-52, "¡ÉGIDA!", "heal");
}

function updateItemProcTimers(h, dt){
  if(h._rampTimer>0){ h._rampTimer -= dt; if(h._rampTimer<=0) h._rampStacks = 0; }
}
