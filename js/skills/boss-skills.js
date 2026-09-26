"use strict";
/* ============================================================
   js/skills/boss-skills.js
   Habilidades especiales de jefes y subjefes (golpes, conos, cargas, muros de hielo,
   escarcha) y su dibujo.
   ============================================================ */

// Anticipación real para habilidades peligrosas de jefes que antes pegaban en el mismo frame
// en que se decidían: el daño, el área y el cooldown son los mismos de siempre; solo se
// inserta una ventana de aviso (telegraph + pose de carga) para que el jugador pueda reaccionar.
/* ============================================================
   HABILIDADES ESPECIALES DE JEFES Y SUBJEFES (+ Demonio de Hielo y Fuego)
   ------------------------------------------------------------
   Pedido explícito: ningún jefe/subjefe debería pelear solo con el ataque básico. Mismo
   criterio que los kits que ya existían (Demonio Mayor, Mago de Hielo, Dragón, Kraken,
   Leviatán): todo golpe fuerte se telegrafía (bossWindup + vfxTelegraph) antes de resolverse,
   con cooldowns propios en el enemigo. Sistemas genéricos reutilizables:
   - e.channel: ataque sostenido (Lanzallamas de Hielo) -daño periódico en un cono que gira
     despacio hacia el objetivo; el enemigo queda plantado mientras dura-.
   - e.bossCharge: embestida en línea recta (Minotauro, Jinete, Ángel Caído).
   - bossStrikes: golpes diferidos en un punto del suelo (estalactitas, rocas, calabazas,
     castigo sagrado): aviso circular y, al cumplirse la demora, daño en el área.
   - iceWalls: segmentos sólidos del Muro de Hielo -los campeones no los atraviesan
     (resolveWallCollision), nunca aparecen encima de un campeón-.
   - Escarcha (h.frostStacks): cada golpe helado suma una carga (ralentiza más y más); a las
     FROST_FREEZE_STACKS el campeón queda congelado un instante y las cargas se reinician.
   ============================================================ */
let iceWalls = [];
let bossStrikes = [];
const FROST_FREEZE_STACKS = 4;
const ICE_WALL_MAX = 30;
// Tipos con kit propio en updateBossSkills. Los subjefes "campeón" genéricos de la Arena
// Infernal (esqueleto_h / demonio_menor / golem agrandados) también reciben uno, pero solo
// cuando realmente son campeones (rank subjefe), nunca en su versión común.
// (Los jefes finales -Jinete, Ángel, Minotauro, Demonio Mayor, Mago, Leviatán- ahora los maneja
// el director de fases de boss-patterns.js; acá quedan subjefes y élites con kit propio.)
const BOSS_SKILL_TYPES = {demonio_hielo_fuego:1, doblador_guerrero:1,
  doblador_arquera:1, doblador_picaro:1, doblador_clerigo:1, guardian_laberinto:1,
  esqueleto_h:1, demonio_menor:1, golem:1};

// Los telegraphs de suelo se dibujan aplastados en vertical (perspectiva, ver vfxDrawGround):
// para que una línea/cono apunte en pantalla exactamente hacia donde va a pegar, la dirección
// que se le pasa se compensa por ese mismo aplastamiento.
function teleDir(dx, dy){ const l = Math.hypot(dx, dy)||1; return {dx:dx/l, dy:dy/l, k:1}; }

function addFrost(h, n){
  if(!h.alive || h.invulnTimer>0) return;
  h.frostStacks = (h.frostStacks||0) + n; h.frostTimer = 3200;
  h.slowAmt = Math.max(h.slowAmt||0, Math.min(0.6, 0.15*h.frostStacks));
  h.slowTimer = Math.max(h.slowTimer||0, 1800);
  if(h.frostStacks >= FROST_FREEZE_STACKS){
    h.frostStacks = 0; h.frostTimer = 0;
    h.stunTimer = Math.max(h.stunTimer||0, 1000);
    if(h===player) floatText(h.x, h.y-44, "¡CONGELADO!", "crit");
    vfxBurst(h.x, h.y-20, 14, "ice", 120, 420, 3, 2, -30, 0);
    vfxShock(h.x, h.y, 8, 46, "160,220,255", 380, 2);
  }
}
// Golpe de una habilidad de jefe sobre un campeón, con sus efectos de control opcionales.
function bossHitHero(h, dmg, o){
  if(!h || !h.alive) return;
  _avoidableHit = true;
  try{ damageHero(h, dmg, o && o.from); } finally { _avoidableHit = false; }
  if(!h.alive || h.invulnTimer>0 || !o) return;
  if(o.slow){ h.slowAmt = Math.max(h.slowAmt||0, o.slow); h.slowTimer = Math.max(h.slowTimer||0, o.slowDur||1500); }
  if(o.stun){ h.stunTimer = Math.max(h.stunTimer||0, o.stun); }
  if(o.knock && o.from){
    const dx = h.x-o.from.x, dy = h.y-o.from.y, d = Math.hypot(dx,dy)||1;
    h.x += dx/d*o.knock; h.y += dy/d*o.knock; clampToArena(h); resolveWallCollision(h);
  }
  if(o.frost) addFrost(h, o.frost);
  if(o.pull && o.from){
    const dx = o.from.x-h.x, dy = o.from.y-h.y, d = Math.hypot(dx,dy)||1;
    const k = Math.min(d, 46); h.x += dx/d*k; h.y += dy/d*k; clampToArena(h); resolveWallCollision(h);
  }
  if(o.burn){ h.burnTimer = Math.max(h.burnTimer||0, 2400); h.burnDmg = Math.max(h.burnDmg||0, o.burn); }
}
function inBossCone(e, h, dx, dy, r, cosA){
  const hx = h.x-e.x, hy = h.y-e.y, hd = Math.hypot(hx,hy)||1;
  return hd <= r + (h.radius||18)*0.6 && (hx*dx + hy*dy)/hd >= cosA;
}
function bossSkillLabel(e, text){
  if(e.rank==="jefe") showBanner(text);
  else if(inView(e.x, e.y, 60)) floatText(e.x, e.y - e.radius*2.2, text, null);
}
const BOSS_STRIKE_RGB = {ice:"160,220,255", rock:"200,160,110", fire:"255,120,40", holy:"255,230,140", root:"120,220,90", water:"90,200,230"};
function bossStrike(x, y, r, delay, dmg, kind, o){
  if(bossStrikes.length >= 140) return;
  const c = {x, y}; clampToArena(c);
  bossStrikes.push({x:c.x, y:c.y, r, t:0, delay, dmg, kind, o:o||null});
  vfxTelegraph({shape:0, r, x:c.x, y:c.y, follow:null, dur:delay, rgb:BOSS_STRIKE_RGB[kind]||"255,70,50"});
}
// Posiciones del Muro de Hielo: una fila de segmentos perpendicular a la línea demonio->
// objetivo, del otro lado del objetivo (le corta la retirada y lo deja dentro del alcance del
// Lanzallamas). Se calculan al empezar el aviso y se vuelven a validar al levantarlo.
function iceWallPlan(e, tgt){
  const dx = tgt.x-e.x, dy = tgt.y-e.y, d = Math.hypot(dx,dy)||1, ux = dx/d, uy = dy/d;
  const cx = tgt.x + ux*72, cy = tgt.y + uy*72, N = 5, SP = 40, out = [];
  for(let i=0;i<N;i++){ const off = (i-(N-1)/2)*SP; out.push({x:cx - uy*off, y:cy + ux*off, ux, uy}); }
  return out;
}
function raiseIceWall(plan){
  const R = 22;
  for(const p of plan){
    if(iceWalls.length >= ICE_WALL_MAX) break;
    let x = p.x, y = p.y, ok = false;
    // nunca encima de un campeón: se corre hacia afuera hasta un lugar libre (o se descarta)
    for(let k=0; k<4 && !ok; k++){
      ok = true;
      for(const h of heroes){ if(h.alive && Math.hypot(h.x-x, h.y-y) < R + (h.radius||18) + 4){ ok = false; break; } }
      if(!ok){ x += p.ux*22; y += p.uy*22; }
    }
    if(!ok) continue;
    const c = {x, y}; clampToArena(c);
    iceWalls.push({x:c.x, y:c.y, r:R, life:6500, maxLife:6500, flip:Math.random()<0.5, img:(Math.random()<0.5?1:0)});
    vfxBurst(c.x, c.y-14, 6, "ice", 90, 300, 2.5, 0, -40, 0);
  }
}
// Empuja a un campeón fuera de los segmentos del Muro de Hielo (llamado desde resolveWallCollision).
function resolveIceWalls(ent){
  if(!iceWalls.length || !ent.classKey) return;
  const rad = ent.radius || 18;
  for(const w of iceWalls){
    const dx = ent.x-w.x, dy = ent.y-w.y, d = Math.hypot(dx,dy), m = w.r + rad;
    if(d < m){
      if(d > 0.01){ ent.x = w.x + dx/d*m; ent.y = w.y + dy/d*m; }
      else { ent.x = w.x + m; }
    }
  }
}

// Una vez por frame (desde update): escarcha de los campeones, golpes diferidos y muros.
function updateBossSkillWorld(dt){
  for(const h of heroes){ if(h.frostTimer>0){ h.frostTimer -= dt; if(h.frostTimer<=0) h.frostStacks = 0; } }
  if(bossStrikes.length){
    let w = 0;
    for(let i=0;i<bossStrikes.length;i++){
      const s = bossStrikes[i]; s.t += dt;
      if(s.t >= s.delay){
        const o = s.o ? Object.assign({from:s}, s.o) : null;
        for(const h of heroes){ if(h.alive && Math.hypot(h.x-s.x, h.y-s.y) <= s.r + (h.radius||18)*0.5) bossHitHero(h, s.dmg, o); }
        const pal = s.kind==="rock" ? "rock" : (s.kind==="fire" ? "ember" : (s.kind==="holy" ? "holy" : (s.kind==="root" ? "leaf" : (s.kind==="water" ? "water" : "ice"))));
        vfxBurst(s.x, s.y-8, 12, pal, 150, 420, 3, 1, -60, 0);
        vfxShock(s.x, s.y, s.r*0.3, s.r*1.2, BOSS_STRIKE_RGB[s.kind]||"255,255,255", 360, 1);
        if(player && Math.hypot(player.x-s.x, player.y-s.y) < 420) vfxShake(s.kind==="rock" ? 5 : 3);
      } else bossStrikes[w++] = s;
    }
    bossStrikes.length = w;
  }
  if(iceWalls.length){
    let w = 0;
    for(let i=0;i<iceWalls.length;i++){
      const s = iceWalls[i]; s.life -= dt;
      if(s.life > 0) iceWalls[w++] = s;
      else vfxBurst(s.x, s.y-16, 10, "ice", 140, 380, 3, 0, -40, 0);
    }
    iceWalls.length = w;
  }
}

// ---- piezas de kit reutilizables ----
function skCircleSlam(e, R, windMs, mult, o, rgb, label, anim, onResolve){
  bossWindup(e, windMs, anim||"bossGroundSlam", {shape:0, r:R, rgb}, ()=>{
    e.attackAnim = 500;
    const oo = Object.assign({from:e}, o||{});
    for(const h of heroes){ if(h.alive && distance(e,h) <= R + (h.radius||18)*0.5) bossHitHero(h, e.dmg*mult, oo); }
    vfxShock(e.x, e.y, e.radius*0.4, R, rgb, 480, 2);
    particles.push({x:e.x, y:e.y, life:520, ring:true, maxLife:520, maxR:R, color:"rgb("+rgb+")"});
    if(onResolve) onResolve();
  });
  if(label) bossSkillLabel(e, label);
}
function skCone(e, R, arc, windMs, mult, o, rgb, label, onResolve){
  const dx = e.fx, dy = e.fy, td = teleDir(dx, dy), cosA = Math.cos(arc);
  bossWindup(e, windMs, "bossHeavyAttack", {shape:1, r:R, dx:td.dx, dy:td.dy, arc, rgb}, ()=>{
    e.attackAnim = 500;
    const oo = Object.assign({from:e}, o||{});
    if(mult>0) for(const h of heroes){ if(h.alive && inBossCone(e, h, dx, dy, R, cosA)) bossHitHero(h, e.dmg*mult, oo); }
    for(let i=0;i<10;i++){
      const a = Math.atan2(dy,dx) + (Math.random()-0.5)*arc*2, sp = 120+Math.random()*R*1.4;
      particles.push({x:e.x, y:e.y-10, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:320, color:"rgb("+rgb+")"});
    }
    if(onResolve) onResolve(dx, dy);
  });
  if(label) bossSkillLabel(e, label);
}
function skCharge(e, dist, maxLen, speed, mult, o, rgb, label){
  const dx = e.fx, dy = e.fy, len = Math.min(dist + 110, maxLen), td = teleDir(dx, dy);
  bossWindup(e, 850, "bossCharge", {shape:2, r:Math.max(26, e.radius*0.7), dx:td.dx, dy:td.dy, len:len*td.k, rgb}, ()=>{
    e.bossCharge = {dx, dy, speed, dur:len/speed*1000, t:0, hit:new Set(), mult, o:o||{}, rgb};
    animTrigger(e, "bossCharge", len/speed*1000 + 200, 0.2);
  });
  if(label) bossSkillLabel(e, label);
}
function skStrikes(e, pts, R, delay, mult, kind, o, label){
  // Sin superposiciones: varios círculos apilados sobre el mismo lugar formaban una trampa sin
  // salida (y un solo paso en falso sumaba 3-4 golpes). Cada impacto necesita su propio espacio.
  const placed = [];
  for(const p of pts){
    if(placed.some(q=>Math.hypot(q.x-p.x, q.y-p.y) < R*1.5)) continue;
    placed.push(p);
    bossStrike(p.x, p.y, R, delay, e.dmg*mult, kind, o);
  }
  animTrigger(e, "bossCast", 700, 0.5);
  e.attackAnim = 400;
  if(label) bossSkillLabel(e, label);
}
function heroTargets(max){
  const out = [];
  for(const h of heroes){ if(h.alive) out.push(h); }
  for(let i=out.length-1;i>0;i--){ const j = (Math.random()*(i+1))|0; const t = out[i]; out[i] = out[j]; out[j] = t; }
  return max ? out.slice(0, max) : out;
}
function skCdInit(e, a, b, c){
  if(e.skA===undefined){ e.skA = a*(0.7+Math.random()*0.6); e.skB = b*(0.7+Math.random()*0.6); e.skC = c*(0.7+Math.random()*0.6); }
  e.skA -= dt_boss; e.skB -= dt_boss; e.skC -= dt_boss;
}
let dt_boss = 0;

// Llamado desde el loop de enemigos. Devuelve true si el enemigo está ocupado (canalizando o
// embistiendo): en ese caso no se mueve ni ataca de la forma normal este frame.
function updateBossSkills(e, dt, tgt, dist, execOnly){
  dt_boss = dt;
  // --- ataque sostenido en curso (Lanzallamas de Hielo) ---
  if(e.channel){
    const c = e.channel; c.t += dt;
    const ta = Math.atan2(e.fy, e.fx), ca = Math.atan2(c.dy, c.dx);
    let da = ta - ca; while(da > Math.PI) da -= Math.PI*2; while(da < -Math.PI) da += Math.PI*2;
    const lim = c.turn*dt/1000, na = ca + Math.max(-lim, Math.min(lim, da));
    c.dx = Math.cos(na); c.dy = Math.sin(na);
    e.fx = c.dx; e.fy = c.dy;
    c.tick -= dt;
    if(c.burn && Math.random() < dt/30){
      const a = Math.atan2(c.dy, c.dx) + (Math.random()-0.5)*1.0, r = 40 + Math.random()*c.r*0.9;
      vfxBurst(e.x + Math.cos(a)*r, e.y + Math.sin(a)*r - 10, 2, "ember", 60, 340, 3.5, 1, -50, 1);
    }
    if(c.tick <= 0){
      c.tick += c.tickMs;
      for(const h of heroes){ if(h.alive && inBossCone(e, h, c.dx, c.dy, c.r, c.cosA)) bossHitHero(h, e.dmg*c.mult, c.burn ? {from:e, burn:e.dmg*0.08} : {from:e, frost:1}); }
    }
    e.attackAnim = Math.max(e.attackAnim, 150);
    if(c.t >= c.dur) e.channel = null;
    return true;
  }
  // --- embestida en curso ---
  if(e.bossCharge){
    const c = e.bossCharge; c.t += dt;
    const step = c.speed*dt/1000;
    const bx = e.x + c.dx*step, by = e.y + c.dy*step;
    e.x = bx; e.y = by; clampToArena(e);
    e.fx = c.dx; e.fy = c.dy;
    // Minotauro: si la embestida lo estampa contra un muro (o el borde de la arena), queda
    // aturdido y VULNERABLE -contrajuego del Laberinto: pararse delante de una pared-.
    if(e.minoCharge && (Math.abs(e.x-bx) + Math.abs(e.y-by) > 2 || bossInWall(e))){
      e.bossCharge = null; e.minoCharge = false; e.chargeQueue = 0;
      e.stunTimer = 2200; e.crashTimer = 2200; e.crashVuln = true;
      vfxShock(e.x, e.y, e.radius*0.3, e.radius*2.2, "220,190,140", 520, 2);
      vfxBurst(e.x, e.y-e.radius*0.6, 22, "rock", 190, 520, 4, 2, -50, 0);
      vfxShake(12); hitStop(80, true); playSfx("heavy");
      showBanner("¡SE ESTRELLÓ! — ¡ATACALO AHORA!");
      if(e.rank==="jefe") bossHudHint("Aturdido", "¡daño extra por 2 segundos!");
      return true;
    }
    for(const h of heroes){
      if(!h.alive || c.hit.has(h)) continue;
      if(Math.hypot(h.x-e.x, h.y-e.y) < e.radius*0.75 + (h.radius||18)){
        c.hit.add(h);
        bossHitHero(h, e.dmg*c.mult, Object.assign({from:e}, c.o));
        vfxBurst(h.x, h.y-16, 10, "spark", 160, 320, 3, 2, -40, 0);
      }
    }
    if(Math.random() < 0.6) particles.push({x:e.x - c.dx*e.radius*0.5 + (Math.random()-0.5)*e.radius, y:e.y + (Math.random()-0.5)*10, vx:-c.dx*40, vy:-20, life:320, color:"rgb("+c.rgb+")"});
    if(c.t >= c.dur){
      e.bossCharge = null;
      vfxShock(e.x, e.y, e.radius*0.3, e.radius*1.6, c.rgb, 360, 1);
      if(player && distance(e, player) < 500) vfxShake(4);
      if(!e.chargeQueue) e.minoCharge = false;
      bossChargeEnded(e);
    }
    return true;
  }
  if(execOnly) return false;
  if(e.bossWind) return false;
  const t = e.type, jefe = e.rank==="jefe";

  if(t==="demonio_hielo_fuego"){
    // Lanzallamas de Hielo (A) + Muro de Hielo (B). La Nova de Escarcha sigue en su bloque.
    skCdInit(e, 5000, 7000, 0);
    if(e.skA<=0 && dist < 200){
      e.skA = 9000;
      const dx = e.fx, dy = e.fy, td = teleDir(dx, dy);
      bossWindup(e, 900, "bossCast", {shape:1, r:210, dx:td.dx, dy:td.dy, arc:0.5, rgb:"150,220,255"}, ()=>{ // 0,9 s (norma de élite; antes 0,65 s)
        e.channel = {dx, dy, t:0, dur:1600, r:210, cosA:Math.cos(0.5), tick:0, tickMs:200, mult:0.28, turn:0.9};
      });
      bossSkillLabel(e, "¡Lanzallamas de Hielo!");
    } else if(e.skB<=0 && dist < 320 && dist > 60){
      e.skB = 12500;
      const plan = iceWallPlan(e, tgt);
      for(const p of plan) vfxTelegraph({shape:0, r:22, x:p.x, y:p.y, follow:null, dur:550, rgb:"190,235,255"});
      bossWindup(e, 550, "bossCast", null, ()=>{ raiseIceWall(plan); });
      bossSkillLabel(e, "¡Muro de Hielo!");
    }
    return false;
  }

  if(t==="angel_caido_hielo"){
    // Lluvia de Estalactitas (A), Juicio Gélido -embestida- (B), Alas de Ventisca (C).
    skCdInit(e, 3000, 6000, 2500);
    const close = heroes.some(h=>h.alive && distance(e,h) < 120);
    if(e.skC<=0 && close){
      e.skC = 8000;
      skCircleSlam(e, 165, 550, 0.8, {knock:90, slow:0.45, slowDur:1800, frost:1}, "200,235,255", "¡Alas de Ventisca!", "bossCast");
    } else if(e.skA<=0 && dist < 650){
      e.skA = 7000;
      const pts = [];
      for(const h of heroTargets()) pts.push({x:h.x+(Math.random()-0.5)*30, y:h.y+(Math.random()-0.5)*30});
      for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2, r = 70+Math.random()*90; pts.push({x:tgt.x+Math.cos(a)*r, y:tgt.y+Math.sin(a)*r}); }
      skStrikes(e, pts, 60, 1250, 1.0, "ice", {slow:0.4, slowDur:1600, frost:1}, "¡Lluvia de Estalactitas!");
    } else if(e.skB<=0 && dist > 160 && dist < 540){
      e.skB = 9500;
      skCharge(e, dist, 580, 950, 1.4, {knock:70, frost:2}, "190,235,255", "¡Juicio Gélido!");
    }
    return false;
  }

  if(t==="jinete_sin_cabeza"){
    // Calabazas Ardientes (A), Carga Espectral (B), Llamada de la Cacería -invoca bestias- (C).
    skCdInit(e, 3000, 6500, 9000);
    const cdk = e.resurrected ? 0.8 : 1; // renacido: más agresivo
    if(e.skC<=0 && e.hp < e.maxHp*0.7 && enemies.length < 45){
      e.skC = 16000*cdk;
      bossWindup(e, 900, "bossCast", {shape:0, r:110, rgb:"255,150,60"}, ()=>{
        for(let i=0;i<3;i++){
          const a = (i/3)*Math.PI*2 + Math.random()*0.5, b = spawnEnemy("bestia_bosque", false, false);
          b.x = e.x + Math.cos(a)*(e.radius+50); b.y = e.y + Math.sin(a)*(e.radius+50); clampToArena(b);
          vfxBurst(b.x, b.y-10, 10, "ember", 120, 380, 3, 1, -40, 0);
        }
      });
      bossSkillLabel(e, "¡LLAMADA DE LA CACERÍA!");
    } else if(e.skB<=0 && dist > 150 && dist < 620){
      e.skB = 8500*cdk;
      skCharge(e, dist, 640, 1050, 1.5, {knock:90, stun:400}, "255,150,60", "¡CARGA ESPECTRAL!");
    } else if(e.skA<=0 && dist < 700){
      e.skA = 6500*cdk;
      const pts = heroTargets(3).map(h=>({x:h.x+(Math.random()-0.5)*24, y:h.y+(Math.random()-0.5)*24}));
      skStrikes(e, pts, 70, 1150, 1.0, "fire", {burn:e.dmg*0.15}, "¡CALABAZAS ARDIENTES!");
    }
    return false;
  }

  if(t==="doblador_guerrero"){
    skCdInit(e, 3500, 0, 0);
    if(e.skA<=0 && dist < 140){
      e.skA = 6000;
      skCone(e, 165, 0.85, 700, 1.4, {stun:500}, "220,220,230", "Golpe Sísmico");
    }
    return false;
  }
  if(t==="doblador_arquera"){
    skCdInit(e, 3000, 0, 0);
    if(e.skA<=0 && dist < 330){
      e.skA = 5500;
      skCone(e, 320, 0.4, 650, 0, null, "200,215,255", "Descarga de Flechas", (dx, dy)=>{
        const base = Math.atan2(dy, dx);
        for(let i=-2;i<=2;i++){
          const a = base + i*0.16;
          projectiles.push({x:e.x, y:e.y-10, vx:Math.cos(a)*340, vy:Math.sin(a)*340, dmg:e.dmg*0.7, life:1400, radius:6, color:"#c9d8ff", enemy:true});
        }
      });
    }
    return false;
  }
  if(t==="doblador_picaro"){
    skCdInit(e, 4000, 0, 0);
    if(e.skA<=0 && dist < 380 && dist > 80){
      e.skA = 7000;
      const dx = tgt.x-e.x, dy = tgt.y-e.y, d = Math.hypot(dx,dy)||1;
      const dest = {x:tgt.x + dx/d*48, y:tgt.y + dy/d*48}; clampToArena(dest);
      vfxTelegraph({shape:0, r:62, x:dest.x, y:dest.y, follow:null, dur:450, rgb:"140,120,200"});
      bossWindup(e, 450, "bossCast", null, ()=>{
        vfxBurst(e.x, e.y-14, 10, "shadow", 120, 360, 3, 0, -30, 0);
        e.x = dest.x; e.y = dest.y;
        vfxBurst(e.x, e.y-14, 12, "shadow", 140, 380, 3, 1, -30, 0);
        e.attackAnim = 400;
        for(const h of heroes){ if(h.alive && Math.hypot(h.x-e.x, h.y-e.y) < 62 + (h.radius||18)*0.5) bossHitHero(h, e.dmg*1.5, null); }
      });
      bossSkillLabel(e, "Paso Sombrío");
    }
    return false;
  }
  if(t==="doblador_clerigo"){
    skCdInit(e, 5000, 3000, 0);
    let hurt = false;
    for(const o of enemies){ if(o.alive && o.type.indexOf("doblador_")===0 && o.hp < o.maxHp*0.8 && distance(e,o) < 300){ hurt = true; break; } }
    if(e.skA<=0 && hurt){
      e.skA = 8000;
      bossWindup(e, 700, "bossCast", {shape:0, r:260, rgb:"255,230,140"}, ()=>{
        for(const o of enemies){
          if(!o.alive || o.type.indexOf("doblador_")!==0 || distance(e,o) > 300) continue;
          const heal = o.maxHp*0.2; o.hp = Math.min(o.maxHp, o.hp + heal);
          if(inView(o.x, o.y, 40)) floatText(o.x, o.y-40, "+"+Math.round(heal), null);
          vfxBurst(o.x, o.y-20, 8, "holy", 90, 420, 3, 0, -60, 0);
        }
      });
      bossSkillLabel(e, "Luz Restauradora");
    } else if(e.skB<=0 && dist < 420){
      e.skB = 6000;
      skStrikes(e, [{x:tgt.x, y:tgt.y}], 72, 950, 1.2, "holy", null, "Castigo Sagrado");
    }
    return false;
  }

  if(t==="guardian_laberinto"){
    // Pisotón Sísmico (A, cuerpo a cuerpo) + Rocas del Laberinto (B, a distancia).
    skCdInit(e, 3500, 5000, 0);
    if(e.skA<=0 && dist < 175){
      e.skA = 6500;
      skCircleSlam(e, 175, 800, 1.3, {stun:600, knock:40}, "200,170,120", "¡Pisotón Sísmico!");
    } else if(e.skB<=0 && dist > 120 && dist < 580){
      e.skB = 8000;
      const pts = [{x:tgt.x, y:tgt.y}];
      for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2; pts.push({x:tgt.x+Math.cos(a)*75, y:tgt.y+Math.sin(a)*75}); }
      skStrikes(e, pts, 66, 1150, 1.1, "rock", {knock:40}, "¡Rocas del Laberinto!");
    }
    return false;
  }

  if(t==="minotauro"){
    // Embestida (A), Hachazo Giratorio (B) y Furia (pasiva, una vez debajo del 50%).
    skCdInit(e, 4000, 3000, 0);
    if(!e.enraged && e.hp < e.maxHp*0.5){
      e.enraged = true; e.speed *= 1.35;
      animTrigger(e, "bossPhaseTransition", 1100);
      vfxShock(e.x, e.y, e.radius*0.4, e.radius*2.4, "255,90,60", 700, 2);
      showBanner("¡FURIA DEL MINOTAURO!");
    }
    const k = e.enraged ? 0.75 : 1;
    if(e.skB<=0 && dist < 190){
      e.skB = 6000*k;
      skCircleSlam(e, 195, 700, 1.3, {knock:70}, "255,140,90", "¡HACHAZO GIRATORIO!", "bossHeavyAttack");
    } else if(e.skA<=0 && dist > 150 && dist < 660){
      e.skA = 7500*k;
      skCharge(e, dist, 680, 1150, 1.6, {knock:110, stun:500}, "255,120,80", "¡EMBESTIDA!");
    }
    return false;
  }

  // --- subjefes "campeón" genéricos de la Arena Infernal (solo en su versión subjefe) ---
  if(e.rank!=="subjefe") return false;
  if(t==="esqueleto_h"){
    skCdInit(e, 3000, 6000, 0);
    if(e.skA<=0 && dist < 150){ e.skA = 6000; skCircleSlam(e, 150, 650, 1.3, {knock:50}, "236,228,204", "Tajo Giratorio", "bossHeavyAttack"); }
    else if(e.skB<=0 && dist > 140 && dist < 480){ e.skB = 8000; skCharge(e, dist, 500, 900, 1.3, {knock:70}, "236,228,204", "Embestida Ósea"); }
  } else if(t==="demonio_menor"){
    skCdInit(e, 3000, 5000, 0);
    if(e.skA<=0 && dist < 520){ e.skA = 6500; skStrikes(e, heroTargets(3).map(h=>({x:h.x, y:h.y})), 64, 1100, 1.1, "fire", {burn:e.dmg*0.12}, "Lluvia Infernal"); }
    else if(e.skB<=0 && dist < 160){ e.skB = 7000; skCircleSlam(e, 160, 700, 1.2, {burn:e.dmg*0.12}, "255,120,40", "Estallido Infernal", "bossCast"); }
  } else if(t==="golem"){
    skCdInit(e, 3500, 5500, 0);
    if(e.skA<=0 && dist < 180){ e.skA = 6500; skCircleSlam(e, 180, 800, 1.3, {stun:600}, "180,180,170", "Pisotón"); }
    else if(e.skB<=0 && dist > 120 && dist < 520){
      e.skB = 8500;
      const pts = [{x:tgt.x, y:tgt.y}]; for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2; pts.push({x:tgt.x+Math.cos(a)*70, y:tgt.y+Math.sin(a)*70}); }
      skStrikes(e, pts, 62, 1150, 1.1, "rock", {knock:30}, "Lanzar Rocas");
    }
  }
  return false;
}


// Un segmento del Muro de Hielo (se dibuja ordenado por profundidad junto a las entidades).
function drawIceWall(w){
  const age = w.maxLife - w.life, grow = Math.min(1, age/180), fade = w.life < 500 ? w.life/500 : 1;
  if(w.st){ drawStonePillar(w, grow, fade); return; }
  const img = ICE_WALL_IMG[w.img], ready = ICE_WALL_READY[w.img];
  drawShadow(w.x, w.y, w.r*1.1);
  if(ready){
    const h = 62*grow, s = h/img.height;
    ctx.save(); ctx.globalAlpha = fade;
    ctx.translate(w.x, w.y+4); if(w.flip) ctx.scale(-1,1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -img.width*s/2, -h, img.width*s, h);
    ctx.restore();
  } else {
    ctx.save(); ctx.globalAlpha = 0.85*fade; ctx.fillStyle = "#bfe8ff"; ctx.strokeStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(w.x-w.r, w.y); ctx.lineTo(w.x, w.y-54*grow); ctx.lineTo(w.x+w.r, w.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
// Pilar de piedra del Laberinto de Piedra (Ángel Corrompido, poder del Guardián del Laberinto):
// usa el mismo sistema que el Muro de Hielo (colisión con campeones, red), otro dibujo.
function drawStonePillar(w, grow, fade){
  const h = 70*grow, r = w.r;
  drawShadow(w.x, w.y, r*1.2);
  ctx.save(); ctx.globalAlpha = fade;
  ctx.fillStyle = "#1c1612"; ctx.fillRect(w.x - r - 2, w.y - h - 2, r*2 + 4, h + 6);           // contorno
  ctx.fillStyle = "#6b5a48"; ctx.fillRect(w.x - r, w.y - h, r*2, h);                           // cara
  ctx.fillStyle = "#8d7a62"; ctx.fillRect(w.x - r, w.y - h, r*2, 6);                            // tapa iluminada
  ctx.fillStyle = "#4a3d31"; ctx.fillRect(w.x + r*0.35, w.y - h + 6, r*0.65, h - 6);           // lado en sombra
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(w.x - r*0.5, w.y - h*0.62, r*0.9, 2); ctx.fillRect(w.x - r*0.1, w.y - h*0.3, r*0.7, 2);
  // runa ámbar del Guardián (se lee como "esto lo puso el jefe")
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade*(0.6 + 0.3*Math.sin(animNow/160 + w.x));
  ctx.fillStyle = "#ffc46e"; ctx.fillRect(w.x - 3, w.y - h*0.72, 6, 12); ctx.fillRect(w.x - 7, w.y - h*0.72 + 4, 14, 3);
  ctx.restore();
}
// Chorro del Lanzallamas de Hielo, golpes que caen (estalactitas/rocas/calabazas), encima de
// las entidades.
function drawBossSkillOverlay(){
  for(const e of enemies){
    if(!e.alive || !e.channel) continue;
    const c = e.channel;
    if(!inView(e.x, e.y, c.r+60)) continue;
    const ang = Math.atan2(c.dy, c.dx), ox = e.x + c.dx*e.radius*0.5, oy = e.y - e.radius*1.1;
    // zona real de daño (sector circular, sin el aplastamiento de los telegraphs de suelo)
    ctx.save(); ctx.globalAlpha = 0.16 + 0.06*Math.sin(animNow/60);
    const half = Math.acos(c.cosA||Math.cos(0.5));
    ctx.fillStyle = c.burn ? "#ff7a2a" : "#9fdcff"; ctx.beginPath(); ctx.moveTo(e.x, e.y);
    ctx.arc(e.x, e.y, c.r, ang-half, ang+half); ctx.closePath(); ctx.fill(); ctx.restore();
    const fi = Math.floor(animNow/90)%3;
    if(!c.burn && FROST_BEAM_READY[fi]){
      const img = FROST_BEAM_IMG[fi], len = c.r*1.05, s = len/img.width, hh = img.height*s;
      const grow = Math.min(1, c.t/160), fade = c.dur - c.t < 200 ? (c.dur-c.t)/200 : 1;
      ctx.save(); ctx.globalAlpha = 0.95*fade; ctx.imageSmoothingEnabled = false;
      ctx.translate(ox, oy); ctx.rotate(ang); if(Math.abs(ang) > Math.PI/2) ctx.scale(1,-1);
      ctx.drawImage(img, 0, -hh/2, len*grow, hh);
      ctx.restore();
    }
  }
  for(const s of bossStrikes){
    if(!inView(s.x, s.y, 120)) continue;
    const q = Math.min(1, s.t/s.delay), fall = 260*(1-q*q), x = s.x, y = s.y - fall;
    ctx.save();
    if(s.kind==="ice"){
      ctx.fillStyle = "#dff4ff"; ctx.strokeStyle = "#6fb8e8"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x-9, y-34); ctx.lineTo(x+9, y-34); ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if(s.kind==="rock"){
      ctx.fillStyle = "#8a7a62"; ctx.strokeStyle = "#4a3e2e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y-14, 15, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    } else if(s.kind==="water"){
      const g = q;
      ctx.strokeStyle = `rgba(120,210,230,${0.4+0.5*g})`; ctx.lineWidth = 3;
      for(let k=0;k<3;k++){ ctx.beginPath(); ctx.arc(s.x, s.y+6, s.r*(0.3+0.22*k)*(0.6+0.4*g), animNow/200+k*2, animNow/200+k*2+3.6); ctx.stroke(); }
    } else if(s.kind==="root"){
      // raíces que asoman del suelo y crecen justo antes de cerrarse
      const g = q*q;
      ctx.strokeStyle = "#3e6b2e"; ctx.fillStyle = "#7ac44a"; ctx.lineWidth = 3;
      for(let k=0;k<5;k++){
        const a = k/5*Math.PI*2 + s.x*0.01, rx = s.x + Math.cos(a)*s.r*0.55, ry = s.y + Math.sin(a)*s.r*0.3;
        ctx.beginPath(); ctx.moveTo(rx-5, ry); ctx.lineTo(rx + Math.cos(a)*6, ry - 8 - 26*g); ctx.lineTo(rx+5, ry); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else if(s.kind==="fire"){
      const g = 24; ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glowSprite("255,120,40"), x-g, y-14-g, g*2, g*2);
      ctx.fillStyle = "#ff8a2a"; ctx.beginPath(); ctx.arc(x, y-14, 9, 0, Math.PI*2); ctx.fill();
    } else {
      const g = 30; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = q;
      ctx.fillStyle = "rgba(255,235,150,0.8)"; ctx.fillRect(x-4, s.y-240, 8, 240);
      ctx.drawImage(glowSprite("255,230,140"), s.x-g, s.y-g, g*2, g*2);
    }
    ctx.restore();
  }
}

function bossWindup(e, ms, anim, tele, fn){
  e.bossWind = {t:0, dur:ms, fn};
  animTrigger(e, anim, ms+420, ms/(ms+420));
  if(tele){ tele.link = e; if(tele.follow===undefined) tele.follow = e; tele.dur = ms; vfxTelegraph(tele); }
}
