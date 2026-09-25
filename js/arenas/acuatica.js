"use strict";
/* ============================================================
   js/arenas/acuatica.js
   Arena Acuática: corriente, peces/burbujas y la cadena eléctrica de la anguila.
   ============================================================ */

// Anguila Eléctrica (Arena Acuática): Cadena Eléctrica — golpea al primer héroe alcanzado por
// la carga rápida y salta a héroes cercanos, incentivando al grupo a separarse en vez de
// agruparse contra ellas. Mismo patrón de salto por proximidad que ya usa el resto del juego
// (ver triggerTrap/chain), pero saltando entre HÉROES en vez de entre enemigos.
function applyEelChain(e, first){
  damageHero(first, e.dmg, e);
  if(acua2Ready("fxSpark")) vfxSprite("fxSpark", 0, first.x, first.y-18, 54, 240, null, 0.1, false, 0.5);
  particles.push({x:e.x,y:e.y, x2:first.x, y2:first.y, life:220, bolt:true, color:"#ffe86a"});
  const hitList = [first];
  let cur = first;
  for(let i=0;i<2 && cur;i++){
    let next=null, bd=Infinity;
    for(const h of [player,...allies]){
      if(!h.alive || hitList.includes(h)) continue;
      const d = distance(cur,h);
      if(d < 170 && d < bd){ bd=d; next=h; }
    }
    if(!next) break;
    damageHero(next, e.dmg*0.7, e);
    particles.push({x:cur.x,y:cur.y, x2:next.x, y2:next.y, life:220, bolt:true, color:"#ffe86a"});
    if(acua2Ready("fxBolt")) vfxSprite("fxBolt", 0, next.x, next.y-18, 60, 240, null, 0.1, false, 0.5);
    hitList.push(next); cur = next;
  }
}

// Peligros ambientales periódicos, propios de cada arena (independientes del daño de los
// monstruos). Arena de Hielo: novas gélidas que avisan y después golpean/ralentizan.
// Arena Infernal: un héroe al azar se prende fuego y pierde vida un rato.
let acuaCurrent = {active:false, dx:0, dy:0, timer:0};
// Corriente Profunda (Arena Acuática): empuja a los 4 héroes por igual mientras dura, sin
// tocar sus controles -se suma después del movimiento normal, como un pequeño extra, nunca lo
// reemplaza-.
function updateAcuaCurrent(dt){
  if(!acuaCurrent.active) return;
  acuaCurrent.timer -= dt;
  if(acuaCurrent.timer<=0){ acuaCurrent.active=false; return; }
  const push = 34*(1+0.09*arenaRuleStacks());
  for(const h of heroes){
    if(!h.alive) continue;
    h.x += acuaCurrent.dx*push*dt/1000;
    h.y += acuaCurrent.dy*push*dt/1000;
    clampToArena(h);
  }
}
// Ambientación de la Arena Acuática (peces, burbujas): puramente decorativa -sin hitbox, no
// reciben ni hacen daño, no bloquean jugadores-. Reduce su propia cantidad cuando hay muchos
// enemigos en pantalla (el combate siempre tiene prioridad sobre la decoración, pedido
// explícito), y se recicla en vez de acumularse sin límite.
let acuaFish = [], acuaBubbles = [], acuaBubbleTimer = 0;
function updateAcuaAmbience(dt){
  if(currentArena!=="acuatica" || state!=="playing") return;
  const loadFactor = Math.min(1, enemies.length/18);
  const maxFish = Math.round(14*(1-loadFactor*0.6));
  while(acuaFish.length < maxFish){
    const ang = Math.random()*Math.PI*2, r = 400+Math.random()*700;
    acuaFish.push({
      x: player.x+Math.cos(ang)*r, y: player.y+Math.sin(ang)*r,
      wander: Math.random()*Math.PI*2, speed: 18+Math.random()*22,
      size: 3+Math.random()*3, gold: Math.random()<0.35
    });
  }
  for(const f of acuaFish){
    f.wander += (Math.random()-0.5)*0.6*dt/1000;
    f.x += Math.cos(f.wander)*f.speed*dt/1000;
    f.y += Math.sin(f.wander)*f.speed*dt/1000;
    f._fx = Math.cos(f.wander);
  }
  acuaFish = acuaFish.filter(f=>distance(f, player) < 1400);

  acuaBubbleTimer -= dt;
  if(acuaBubbleTimer<=0 && acuaBubbles.length < 40*(1-loadFactor*0.5)){
    acuaBubbleTimer = 220 + Math.random()*260 + loadFactor*400;
    const ang = Math.random()*Math.PI*2, r = Math.random()*700;
    acuaBubbles.push({x:player.x+Math.cos(ang)*r, y:player.y+Math.sin(ang)*r+300, life:2600, maxLife:2600, size:2+Math.random()*3, wob:Math.random()*Math.PI*2});
  }
  for(const b of acuaBubbles){ b.life -= dt; b.y -= 26*dt/1000; b.wob += dt/260; b.x += Math.sin(b.wob)*8*dt/1000; }
  acuaBubbles = acuaBubbles.filter(b=>b.life>0);
}
function drawAcuaAmbience(){
  if(currentArena!=="acuatica") return;
  for(const f of acuaFish){
    if(!inView(f.x,f.y,40)) continue;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = f.gold ? "#e8c85a" : "#7fb0d8";
    ctx.translate(f.x, f.y);
    if(f._fx<0) ctx.scale(-1,1);
    ctx.beginPath();
    ctx.moveTo(-f.size*2, 0); ctx.lineTo(f.size*1.4, -f.size); ctx.lineTo(f.size*1.4, f.size); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-f.size*2,0); ctx.lineTo(-f.size*3.2, -f.size*0.8); ctx.lineTo(-f.size*3.2, f.size*0.8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  for(const b of acuaBubbles){
    if(!inView(b.x,b.y,20)) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, b.life/b.maxLife)*0.6;
    ctx.strokeStyle = "#cfeeff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}
