"use strict";
/* ============================================================
   js/arenas/hazards.js
   Peligros ambientales de cada arena.
   ============================================================ */

function updateArenaHazards(dt){
  arenaHazardTimer -= dt;
  if(arenaHazardTimer > 0) return;
  const hz = arenaMods().hazard;
  if(hz==="nova_gelida"){
    arenaHazardTimer = 7000 + Math.random()*4000;
    const target = heroes[(Math.random()*heroes.length)|0];
    if(target && target.alive){
      const hx = target.x, hy = target.y, R = 115;
      particles.push({x:hx, y:hy, life:900, warnRing:true, maxLife:900, maxR:R, color:"#8fd0ff"});
      setTimeout(()=>{
        if(state!=="playing") return;
        for(const h of heroes){
          if(h.alive && Math.hypot(h.x-hx, h.y-hy) < R){
            h.hp = Math.max(0, h.hp - h.maxHp*0.06);
            if(h.hp<=0 && h.alive){ h.alive=false; if(h===player) onPlayerDeath(); }
            h.slowAmt = Math.max(h.slowAmt||0, 0.4); h.slowTimer = Math.max(h.slowTimer||0, 1500);
            if(h===player) floatText(h.x, h.y-40, "¡NOVA GÉLIDA!", "crit");
          }
        }
        frostNovaVFX({x:hx,y:hy}, R, 2);
      }, 900);
    }
  } else if(hz==="ignicion"){
    arenaHazardTimer = 8000 + Math.random()*4000;
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
    arenaHazardTimer = 9000 + Math.random()*5000;
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
    arenaHazardTimer = 11000 + Math.random()*6000;
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
