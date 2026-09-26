"use strict";
/* ============================================================
   js/systems/mythic-powers.js
   PODERES MÍTICOS (MYTHIC_POWERS, js/data/legendaries.js): cada uno cambia la forma de jugar.
     myth_winter  Invierno Sin Fin     — 3 golpes a un enemigo ralentizado lo congelan; congelado que muere estalla.
     myth_inferno Combustión Perpetua  — el fuego se contagia; los que mueren ardiendo explotan.
     myth_storm   Tormenta Viva        — cada 3 habilidades, tormenta que te sigue 4 s.
     myth_bastion Último Bastión       — golpes fuertes recibidos se acumulan y la próxima habilidad los devuelve.
     myth_harvest Cosecha Roja         — básicos sangran; matar sangrantes cura y contagia.
     myth_dawn    Alba Eterna          — cada curación deja suelo consagrado.
     myth_echo    Eco del Vacío        — 25% de repetir la habilidad al 60%.
     myth_eclipse Eclipse              — críticos marcan; los marcados bajo 25% se ejecutan.
   Y los ÚNICOS (UNIQUE_POWERS): apariencia + VFX + comportamiento de una habilidad del campeón.
   Solo corre en el anfitrión (la simulación); los invitados ven los efectos por el estado replicado.
   Todos tienen tope o enfriamiento interno.
   ============================================================ */

function _myth(h, key){ if(!h || !h.classKey) return false; const m = heroMythics(h.classKey); return !!(m && m[key]); }
function _mBase(h){ return h.baseDmg * runStats.dmgMult * (h.buffDmgMult||1); }
const _isBossRank = e => e.rank==="jefe" || e.rank==="subjefe";
const mythGrounds = []; // suelo consagrado del Alba Eterna {x,y,r,t,dur,src,tick}
function resetMythicPowers(){ mythGrounds.length = 0; if(typeof uniqueFissures!=="undefined") uniqueFissures.length = 0; }

/* ---------------- lectura desde las fórmulas ---------------- */
function mythicDamageMult(h, e, opts){
  let m = 1;
  if(e.bleedTimer>0 && _myth(h, "myth_harvest")) m *= 1.2;
  return m;
}
function mythicCritMultBonus(h, e){ return (_isBossRank(e) && _myth(h, "myth_eclipse")) ? 0.25 : 0; }

/* ---------------- al golpear ---------------- */
function mythicOnHit(h, e, dmg, crit, opts){
  if(!e.alive) return;
  // Cosecha Roja: los básicos hacen sangrar
  if(opts.fromBasic && _myth(h, "myth_harvest")){
    e.bleedTimer = Math.max(e.bleedTimer||0, 3200); e.bleedDmg = Math.max(e.bleedDmg||0, _mBase(h)*0.28); e.bleedSrc = h;
  }
  // Invierno Sin Fin: golpear a un ralentizado acumula frío; al 3er golpe se congela
  if(_myth(h, "myth_winter") && (e.slowTimer>0 || opts.slow || opts.freeze) && !(e.frozenTimer>0)){
    const now = runElapsedMs;
    if(now - (e._winterAt||-1e9) > 220){
      e._winterAt = now; e._winterN = (e._winterN||0) + 1;
      if(e._winterN >= 3){
        e._winterN = 0;
        const dur = _isBossRank(e) ? 350 : 1200;
        e.frozenTimer = dur; e.frozenBy = h; e.stunTimer = Math.max(e.stunTimer||0, dur);
        vfxBurst(e.x, e.y-18, 10, "ice", 110, 380, 3, h===player?2:1, -20, 0);
        vfxShock(e.x, e.y, 6, (e.radius||20)+26, "170,225,255", 280, 1);
        if(h===player) playSfx("freeze");
      }
    }
  }
  // Eclipse: el crítico marca; un marcado bajo 25% se ejecuta con el próximo golpe
  if(_myth(h, "myth_eclipse")){
    if(e._eclipseBy===h && runElapsedMs < (e._eclipseUntil||0) && !_isBossRank(e) && e.hp > 0 && e.hp < e.maxHp*0.25){
      e._eclipseBy = null;
      vfxBurst(e.x, e.y-20, 12, "shadow", 140, 360, 3, h===player?2:1, -20, 0);
      vfxShock(e.x, e.y, 4, 46, "140,120,200", 260, 1);
      if(h===player) floatText(e.x, e.y-50, "¡EJECUTADO!", "crit");
      damageEnemy(e, e.hp + 1, {src:h, fromProc:true, critChanceOverride:0, execute:true});
      return;
    }
    if(crit && !_isBossRank(e)){ e._eclipseBy = h; e._eclipseUntil = runElapsedMs + 5000; }
  }
}

/* ---------------- al matar ---------------- */
function mythicOnKill(h, e){
  // Invierno: congelado que muere -> esquirlas que ralentizan y encadenan el frío
  if(e.frozenTimer>0 && _myth(h, "myth_winter") && _procReady(h, "shatter", 180)){
    const R = 105;
    for(const o of enemies){
      if(!o.alive || Math.hypot(o.x-e.x, o.y-e.y) > R) continue;
      damageEnemy(o, _mBase(h)*0.9, {src:h, fromProc:true, slow:0.4, slowDur:1600});
      o._winterN = (o._winterN||0) + 1;
    }
    vfxBurst(e.x, e.y-14, 18, "ice", 190, 420, 3.5, h===player?2:1, -30, 0);
    vfxShock(e.x, e.y, 10, R, "180,230,255", 340, 2);
    if(h===player) playSfx("shatter");
  }
  // Combustión Perpetua: los que mueren ardiendo explotan
  if(e.burnTimer>0 && _myth(h, "myth_inferno") && _procReady(h, "infernoBoom", 140)){
    const R = 95;
    for(const o of enemies){
      if(!o.alive || Math.hypot(o.x-e.x, o.y-e.y) > R) continue;
      damageEnemy(o, _mBase(h)*0.8, {src:h, fromProc:true, burn:true});
    }
    vfxBurst(e.x, e.y-10, 14, "ember", 170, 400, 3.5, h===player?2:1, -40, 0);
    vfxShock(e.x, e.y, 8, R, "255,130,40", 320, 1);
  }
  // Cosecha Roja: matar a un sangrante cura y contagia el sangrado
  if(e.bleedTimer>0 && _myth(h, "myth_harvest")){
    const heal = h.maxHp*0.03, before = h.hp;
    h.hp = Math.min(h.maxHp, h.hp + heal*arenaRuleHealMult());
    if(h===player && h.hp-before > 1) floatText(h.x, h.y-36, "+"+Math.round(h.hp-before), "heal");
    const near = enemies.filter(o=>o.alive && o!==e && !(o.bleedTimer>0) && Math.hypot(o.x-e.x, o.y-e.y) < 150)
      .sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)).slice(0,3);
    for(const o of near){ o.bleedTimer = 3200; o.bleedDmg = Math.max(o.bleedDmg||0, _mBase(h)*0.28); o.bleedSrc = h; }
    vfxBurst(e.x, e.y-14, 10, "blood", 150, 380, 3, h===player?1:0, -20, 0);
  }
}

/* ---------------- al lanzar ---------------- */
const MYTH_ECHO_BLOCK = {charge_drag:1, teleport_blink:1, ghost_step:1, eren_hook:1, sm_bayonet:1, sm_san_lorenzo:1, ronin_slash:1,
  raise_skeletons:1, soul_harvest:0, summon_golem:1, war_cry:1, fury_armor:1, brief_immunity:1, sm_granaderos:1, eren_instinct:1, eren_advance:1,
  spin_channel:1, titan_terremoto:1, titan_retumbar:1, piercing_shot:1};
function mythicOnCast(h, sk, isUlt){
  if(h._mythEcho) return; // la repetición del Eco no cuenta para nada más
  // Último Bastión: la habilidad libera lo acumulado
  if(_myth(h, "myth_bastion") && (h._bastionStore||0) > 1){
    const R = 150, amt = Math.min(h.maxHp*2.5, h._bastionStore*2.5);
    for(const o of enemies){
      if(!o.alive || Math.hypot(o.x-h.x, o.y-h.y) > R) continue;
      damageEnemy(o, amt, {src:h, fromProc:true});
      if(!_isBossRank(o)) o.stunTimer = Math.max(o.stunTimer||0, 800);
    }
    vfxShock(h.x, h.y, 14, R, "255,210,140", 420, 2);
    vfxBurst(h.x, h.y, 14, "rock", 180, 360, 3.5, h===player?2:1, -20, 0);
    if(h===player){ vfxShake(5); floatText(h.x, h.y-60, "¡BASTIÓN!", "crit"); playSfx("heavy"); }
    h._bastionStore = 0;
  }
  // Tormenta Viva: cada 3 habilidades
  if(!isUlt && _myth(h, "myth_storm")){
    h._stormN = (h._stormN||0) + 1;
    if(h._stormN >= 3){ h._stormN = 0; h._stormT = 4000; h._stormTick = 0; if(h===player) floatText(h.x, h.y-60, "¡TORMENTA!", "crit"); }
  }
  // Eco del Vacío: 25% de repetir al 60%
  if(!isUlt && _myth(h, "myth_echo") && !MYTH_ECHO_BLOCK[sk.kind] && Math.random() < 0.25){
    const idx = h.cls && h.cls.skills ? h.cls.skills.indexOf(sk) : -1;
    runLater(360, ()=>{
      if(!h.alive || state!=="playing") return;
      const b = h.buffDmgMult||1;
      h.buffDmgMult = b*0.6; h._mythEcho = true;
      try{ vfxBurst(h.x, h.y-20, 8, "arcane", 120, 320, 3, h===player?1:0, -20, 1); castAbility(h, sk, false, idx>=0?idx:undefined); }
      finally{ h.buffDmgMult = b; h._mythEcho = false; }
      if(h===player) floatText(h.x, h.y-58, "ECO", "crit");
    });
  }
}

/* ---------------- al recibir daño / al curar ---------------- */
function mythicOnHurt(h, dmg, src){
  // umbral después de la defensa: los golpes de élites, jefes y comunes grandes (un común está topado en 12% antes de defensa)
  if(dmg > h.maxHp*0.07 && _myth(h, "myth_bastion")){
    h._bastionStore = Math.min(h.maxHp*1.2, (h._bastionStore||0) + dmg*0.4);
    if(h===player) floatText(h.x, h.y-46, "▲ carga", "heal");
  }
}
function mythicOnHeal(caster, target, restored){
  if(!_myth(caster, "myth_dawn") || !target) return;
  if(!_procReady(caster, "dawnGround", 700)) return;
  if(mythGrounds.length >= 6) mythGrounds.shift();
  mythGrounds.push({x:target.x, y:target.y, r:90, t:0, dur:3000, src:caster, tick:0});
}

/* ---------------- por cuadro ---------------- */
function updateMythicPowers(h, dt){
  // Tormenta Viva
  if(h._stormT > 0){
    h._stormT -= dt; h._stormTick -= dt;
    if(h._stormTick <= 0){
      h._stormTick = 350;
      const cands = enemies.filter(o=>o.alive && Math.hypot(o.x-h.x, o.y-h.y) < 280);
      if(cands.length){
        const o = cands[(Math.random()*cands.length)|0];
        pushChainBolt(o.x + (Math.random()-0.5)*30, o.y-220, o.x, o.y-8, 20, 220);
        damageEnemy(o, _mBase(h)*0.7, {src:h, fromProc:true});
        if(!_isBossRank(o)) o.stunTimer = Math.max(o.stunTimer||0, 200);
        vfxBurst(o.x, o.y-10, 6, "shock", 110, 240, 2.5, 0, -20, 1);
      }
    }
  }
  // Combustión Perpetua: cada segundo, cada enemigo en llamas prende a otro cercano (tope 6/s)
  if(_myth(h, "myth_inferno")){
    h._infernoT = (h._infernoT||0) - dt;
    if(h._infernoT <= 0){
      h._infernoT = 1000;
      let spread = 0;
      for(const e of enemies){
        if(spread >= 6) break;
        if(!e.alive || !(e.burnTimer>0) || Math.hypot(e.x-h.x, e.y-h.y) > 700) continue;
        let best = null, bd = 115;
        for(const o of enemies){ if(!o.alive || o===e || o.burnTimer>0) continue; const d = Math.hypot(o.x-e.x, o.y-e.y); if(d < bd){ bd = d; best = o; } }
        if(best){ best.burnTimer = 2600; best.burnDmg = Math.max(best.burnDmg||0, e.burnDmg||_mBase(h)*0.2); spread++;
          if(inView(best.x, best.y, 0)) vfxBurst(best.x, best.y-12, 4, "ember", 70, 280, 2.5, 0, -40, 1); }
      }
    }
  }
}
// Suelo consagrado (compartido por todos los que tengan el Alba Eterna)
function updateMythicGrounds(dt){
  for(let i=mythGrounds.length-1;i>=0;i--){
    const g = mythGrounds[i]; g.t += dt; g.tick -= dt;
    if(g.t >= g.dur){ mythGrounds.splice(i,1); continue; }
    if(g.tick <= 0){
      g.tick = 500;
      for(const a of heroes){ if(a.alive && Math.hypot(a.x-g.x, a.y-g.y) < g.r) a.hp = Math.min(a.maxHp, a.hp + a.maxHp*0.01*arenaRuleHealMult()); }
      if(g.src && g.src.alive !== undefined) for(const o of enemies){ if(o.alive && Math.hypot(o.x-g.x, o.y-g.y) < g.r) damageEnemy(o, _mBase(g.src)*0.3, {src:g.src, fromProc:true}); }
    }
  }
}
function drawMythicGrounds(){
  for(const g of mythGrounds){
    if(!inView(g.x, g.y, g.r)) continue;
    const a = Math.min(1, (g.dur-g.t)/500) * 0.55;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(255,225,140,0.18)";
    ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r, g.r*0.62, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(255,235,170,0.9)"; ctx.lineWidth = 2;
    ctx.setLineDash([6,5]); ctx.lineDashOffset = -animNow/60;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r*(0.92+0.05*Math.sin(animNow/200)), g.r*0.58, 0, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}

/* ============================================================
   ÚNICOS — cada uno cambia apariencia, VFX y una habilidad. Lectura rápida por héroe.
   ============================================================ */
function heroUniqueKey(h){ return h && h.classKey ? heroUnique(h.classKey) : null; }
// Aura del Único alrededor del campeón (la dibuja entities.js debajo del cuerpo).
function drawUniqueAura(h){
  const u = heroUniqueKey(h); if(!u) return;
  const rgb = UNIQUE_POWERS[u].aura;
  const pulse = 0.55 + 0.25*Math.sin(animNow/260 + (h.x||0)*0.01);
  ctx.save();
  ctx.globalAlpha = pulse*0.5;
  const g = ctx.createRadialGradient(h.x, h.y-4, 4, h.x, h.y-4, 46);
  g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(h.x, h.y-2, 46, 26, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  if(Math.random() < 0.12) vfxBurst(h.x+(Math.random()-0.5)*30, h.y-10-Math.random()*30, 1, u==="uniq_archimago"?"arcane":(u==="uniq_lunaroja"?"blood":"ember"), 20, 600, 2, 0, -30, 1);
}
// Escala visual extra (Paso del Coloso)
function uniqueScaleMult(h){ return heroUniqueKey(h)==="uniq_juggernaut" ? 1.15 : 1; }
// Duración de la quemadura (Fuego del Vacío: el doble)
function uniqueBurnMult(src){ return heroUniqueKey(src)==="uniq_archimago" ? 2 : 1; }
// Saltos extra de la Cadena de Relámpago (Fuego del Vacío)
function uniqueChainBonus(h){ return heroUniqueKey(h)==="uniq_archimago" ? 3 : 0; }
// Paso del Coloso: al caminar, cada ~0,45 s el suelo tiembla y los enemigos pegados se tambalean.
function updateUniquePowers(h, dt){
  const u = heroUniqueKey(h); if(!u || !h.alive) return;
  if(u==="uniq_juggernaut"){
    const moved = Math.hypot(h.x-(h._uqx||h.x), h.y-(h._uqy||h.y)); h._uqx = h.x; h._uqy = h.y;
    h._uqStep = (h._uqStep||0) + moved;
    if(h._uqStep > 60){
      h._uqStep = 0;
      for(const o of enemies){
        if(!o.alive || Math.hypot(o.x-h.x, o.y-h.y) > 70) continue;
        o.slowAmt = Math.max(o.slowAmt||0, 0.35); o.slowTimer = Math.max(o.slowTimer||0, 600);
        if(!_isBossRank(o) && Math.random()<0.35) o.stunTimer = Math.max(o.stunTimer||0, 180);
      }
      if(inView(h.x, h.y, 0)) vfxBurst(h.x, h.y+4, 4, "rock", 60, 260, 2.5, 0, -10, 1);
    }
  }
  if(h._uqWolfT > 0){ h._uqWolfT -= dt; if(h._uqWolfT<=0 && !(h.wildHuntTimer>0)) despawnSylvaWolf(h); }
  if(u==="uniq_lunaroja" && h.huntTarget && h.huntTarget.alive && h.huntTarget!==h._uqPrey){
    h._uqPrey = h.huntTarget;
    if(runElapsedMs - (h._uqWolfAt||-1e9) > 20000 && typeof sylvaSummonWolf==="function"){ h._uqWolfAt = runElapsedMs; sylvaSummonWolf(h, 6000); }
  }
}
// Luna Roja: las flechas hacen sangrar (y atraviesan a la Presa, ver cazadora.js)
function uniqueOnHit(h, e, dmg, crit, opts){
  const u = heroUniqueKey(h); if(!u) return;
  if(u==="uniq_lunaroja" && opts.fromBasic){ e.bleedTimer = Math.max(e.bleedTimer||0, 2800); e.bleedDmg = Math.max(e.bleedDmg||0, _mBase(h)*0.3); }
  if(u==="uniq_archimago" && opts.chain){ e.burnTimer = Math.max(e.burnTimer||0, 2600*2); e.burnDmg = Math.max(e.burnDmg||0, _mBase(h)*0.25); e.voidFire = true; }
}

// Paso del Coloso: la Embestida deja una grieta 3 s que aturde a todo lo que la cruza (una vez por enemigo).
const uniqueFissures = [];
function uniqueAddFissure(h, x1, y1, x2, y2){
  if(uniqueFissures.length >= 4) uniqueFissures.shift();
  const pts = []; const n = 7;
  for(let i=0;i<=n;i++){ const t = i/n; pts.push({x:x1+(x2-x1)*t + (i&&i<n?(Math.random()-0.5)*14:0), y:y1+(y2-y1)*t + (i&&i<n?(Math.random()-0.5)*10:0)}); }
  uniqueFissures.push({x1, y1, x2, y2, pts, t:0, dur:3000, src:h, hit:new Set(), tick:0});
  vfxShake(h===player ? 4 : 1);
}
function _segDist(px, py, f){ const vx=f.x2-f.x1, vy=f.y2-f.y1, l2=vx*vx+vy*vy||1; let t=((px-f.x1)*vx+(py-f.y1)*vy)/l2; t=Math.max(0,Math.min(1,t)); return Math.hypot(px-(f.x1+vx*t), py-(f.y1+vy*t)); }
function updateUniqueFissures(dt){
  for(let i=uniqueFissures.length-1;i>=0;i--){
    const f = uniqueFissures[i]; f.t += dt; f.tick -= dt;
    if(f.t >= f.dur){ uniqueFissures.splice(i,1); continue; }
    if(f.tick > 0) continue; f.tick = 120;
    for(const o of enemies){
      if(!o.alive || f.hit.has(o) || _segDist(o.x, o.y, f) > (o.radius||20)+14) continue;
      f.hit.add(o);
      if(_isBossRank(o)){ o.slowAmt = Math.max(o.slowAmt||0, 0.4); o.slowTimer = Math.max(o.slowTimer||0, 1200); }
      else o.stunTimer = Math.max(o.stunTimer||0, 1000);
      damageEnemy(o, _mBase(f.src)*0.6, {src:f.src, fromProc:true});
      if(inView(o.x, o.y, 0)) vfxBurst(o.x, o.y, 5, "rock", 90, 280, 3, 0, -30, 0);
    }
  }
}
function drawUniqueFissures(){
  for(const f of uniqueFissures){
    const a = Math.min(1, (f.dur-f.t)/400);
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,150,60,0.55)"; ctx.lineWidth = 9;
    ctx.beginPath(); f.pts.forEach((p,i)=> i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.strokeStyle = "#1a0e08"; ctx.lineWidth = 4;
    ctx.beginPath(); f.pts.forEach((p,i)=> i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.restore();
  }
}
