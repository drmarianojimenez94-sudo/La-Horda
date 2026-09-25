"use strict";
/* ============================================================
   js/arenas/hazards.js
   Peligros ambientales de cada arena.
   ============================================================ */

// Zonas de peligro persistentes en el piso (pozos de lava de la Arena Infernal): quien se
// queda adentro se quema. Se dibujan bajo las entidades (drawHazardZones).
let hazardZones = [];
let arenaRuleTimer = 7000;
function _avgHeroMaxHp(){ let s=0,n=0; for(const h of heroes){ if(h.alive){ s+=h.maxHp; n++; } } return n ? s/n : 200; }
function _ruleTargets(k){
  const alive = heroes.filter(h=>h.alive);
  const out = [];
  if(player.alive) out.push(player); // el jugador siempre entra: la regla le habla a él
  while(out.length < k && out.length < alive.length){ const h = alive[(Math.random()*alive.length)|0]; if(!out.includes(h)) out.push(h); }
  return out;
}
// Eventos de la regla creciente de cada arena (ver ARENA_RULES): más seguidos y más numerosos
// cuanto más avanzada la partida. Siempre telegrafiados.
function updateArenaRuleEvents(dt){
  if(!arenaRule() || runEnding) return;
  arenaRuleTimer -= dt;
  if(arenaRuleTimer > 0) return;
  const n = arenaRuleStacks(), mult = arenaRuleHazardIntervalMult();
  if(currentArena==="bosque"){
    arenaRuleTimer = (9500 + Math.random()*3000)*mult;
    const dmg = _avgHeroMaxHp()*0.05;
    for(const h of _ruleTargets(1 + Math.floor(n/3))) bossStrike(h.x, h.y, 56, 1150, dmg, "root", {stun:850});
    if(n>0) floatText(player.x, player.y-60, "¡Raíces!", null);
  } else if(currentArena==="laberinto"){
    arenaRuleTimer = (10500 + Math.random()*3500)*mult;
    const dmg = _avgHeroMaxHp()*0.07;
    for(const h of _ruleTargets(1 + Math.floor(n/3))){
      bossStrike(h.x, h.y, 62, 1200, dmg, "rock", {knock:30});
      if(n>=4){ const a = Math.random()*Math.PI*2; bossStrike(h.x+Math.cos(a)*90, h.y+Math.sin(a)*90, 62, 1350, dmg, "rock", {knock:30}); }
    }
  } else if(currentArena==="infernal"){
    arenaRuleTimer = (9000 + Math.random()*3000)*mult;
    for(const h of _ruleTargets(1 + Math.floor(n/4))){
      const zx = h.x + (Math.random()-0.5)*40, zy = h.y + (Math.random()-0.5)*40;
      hazardZones.push({x:zx, y:zy, r:70 + n*3, t:0, warn:1000, dur:6500, kind:"lava"});
      vfxTelegraph({shape:0, r:70 + n*3, x:zx, y:zy, follow:null, dur:1000, rgb:"255,110,30"});
    }
  } else {
    arenaRuleTimer = 999999; // Hielo y Acuática aplican su regla como modificador continuo
  }
}
function updateHazardZones(dt){
  if(!hazardZones.length) return;
  let w = 0;
  for(let i=0;i<hazardZones.length;i++){
    const z = hazardZones[i]; z.t += dt;
    if(z.t > z.warn){
      for(const h of heroes){
        if(!h.alive || Math.hypot(h.x-z.x, h.y-z.y) > z.r) continue;
        damageHero(h, h.maxHp*0.045*dt/1000, {x:z.x, y:z.y});
        if(Math.random() < dt/260) vfxBurst(h.x, h.y-6, 2, "ember", 50, 300, 2.5, 0, -40, 0);
      }
    }
    if(z.t < z.warn + z.dur) hazardZones[w++] = z;
  }
  hazardZones.length = w;
}
function drawHazardZones(){
  for(const z of hazardZones){
    if(z.t < z.warn || !inView(z.x, z.y, z.r+40)) continue;
    const life = z.t - z.warn, fadeIn = Math.min(1, life/250), fadeOut = Math.min(1, (z.dur-life)/600);
    const a = fadeIn*fadeOut, pulse = 0.5+0.5*Math.sin(animNow/160 + z.x);
    ctx.save();
    ctx.translate(z.x, z.y+6);
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, z.r*0.1, 0, 0, z.r);
    g.addColorStop(0, `rgba(255,190,60,${0.55*a})`);
    g.addColorStop(0.6, `rgba(255,80,20,${(0.35+0.15*pulse)*a})`);
    g.addColorStop(1, "rgba(160,20,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,120,40,${0.7*a})`; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}

function updateArenaHazards(dt){
  updateArenaRuleEvents(dt);
  updateHazardZones(dt);
  updateArenaRuleBoss(dt);
  arenaHazardTimer -= dt;
  if(arenaHazardTimer > 0) return;
  const hz = arenaMods().hazard;
  const hzMult = arenaRuleHazardIntervalMult();
  if(hz==="nova_gelida"){
    arenaHazardTimer = (7000 + Math.random()*4000)*hzMult;
    const target = heroes[(Math.random()*heroes.length)|0];
    if(target && target.alive){
      const hx = target.x, hy = target.y, R = 115;
      particles.push({x:hx, y:hy, life:900, warnRing:true, maxLife:900, maxR:R, color:"#8fd0ff"});
      runLater(900, ()=>{
        for(const h of heroes){
          if(h.alive && Math.hypot(h.x-hx, h.y-hy) < R){
            h.hp = Math.max(0, h.hp - h.maxHp*0.06);
            if(h.hp<=0 && h.alive){ h.alive=false; if(h===player) onPlayerDeath(); }
            h.slowAmt = Math.max(h.slowAmt||0, 0.4); h.slowTimer = Math.max(h.slowTimer||0, 1500);
            if(h===player) floatText(h.x, h.y-40, "¡NOVA GÉLIDA!", "crit");
          }
        }
        frostNovaVFX({x:hx,y:hy}, R, 2);
      });
    }
  } else if(hz==="ignicion"){
    arenaHazardTimer = (8000 + Math.random()*4000)*hzMult;
    const target = heroes[(Math.random()*heroes.length)|0];
    if(target && target.alive){
      target.burnTimer = Math.max(target.burnTimer||0, 3000);
      target.burnDmg = Math.max(target.burnDmg||0, target.maxHp*0.025);
      particles.push({x:target.x, y:target.y, life:500, ring:true, maxLife:500, maxR:40, color:"#ff5a2a"});
      if(target===player) floatText(target.x, target.y-40, "¡TE PRENDISTE FUEGO!", "crit");
    }
  } else if(hz==="sismo"){
    // Sismo del Laberinto Maldito: a diferencia de los otros peligros (que golpean a uno solo
    // a la vez), esto sacude TODA la arena y golpea a los 4 héroes juntos, un poco cada uno.
    arenaHazardTimer = (9000 + Math.random()*5000)*hzMult;
    screenShake = Math.max(screenShake||0, 14);
    for(const h of heroes){
      if(!h.alive) continue;
      h.hp = Math.max(0, h.hp - h.maxHp*0.045);
      if(h.hp<=0 && h.alive){ h.alive=false; if(h===player) onPlayerDeath(); }
      if(h===player) floatText(h.x, h.y-40, "¡SISMO!", "crit");
      particles.push({x:h.x, y:h.y+10, life:400, ring:true, maxLife:400, maxR:34, color:"#c9a56a"});
    }
    for(let i=0;i<14;i++){
      const a = Math.random()*Math.PI*2, r = Math.random()*ARENA_RADIUS*0.8;
      particles.push({x:Math.cos(a)*r, y:Math.sin(a)*r*0.7, vx:0, vy:-14, life:500, color:"#8a7350"});
    }
  } else if(hz==="corriente_acuatica"){
    // Arena Acuática: a diferencia del resto de los peligros (que dañan), esto solo empuja
    // suavemente a los 4 héroes en una misma dirección durante un rato -pedido explícito: nunca
    // debe volverse incómodo ni sacarle claridad al combate, así que no hace daño ni controla-.
    arenaHazardTimer = (11000 + Math.random()*6000)*hzMult;
    const ang = Math.random()*Math.PI*2;
    acuaCurrent.active = true; acuaCurrent.dx = Math.cos(ang); acuaCurrent.dy = Math.sin(ang); acuaCurrent.timer = 3200;
    showBanner("Corriente Profunda");
    for(let i=0;i<10;i++){
      const r = Math.random()*ARENA_RADIUS;
      particles.push({x:player.x+Math.cos(ang)*r*0.3+(Math.random()-0.5)*400, y:player.y+Math.sin(ang)*r*0.3+(Math.random()-0.5)*400,
        vx:Math.cos(ang)*30, vy:Math.sin(ang)*30, life:1600, color:"#6fb0c8"});
    }
  }
}
