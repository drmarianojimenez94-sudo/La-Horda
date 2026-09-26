"use strict";
/* ============================================================
   js/skills/boss-patterns.js
   DIRECTOR DE JEFES: cada jefe final tiene FASES (por vida) y en cada fase una ROTACIÓN de
   ataques con pausas entre uno y otro, en vez de lanzar cualquier cosa apenas se enfría.
   Así los patrones se aprenden: el jugador puede leer "después de la embestida vienen las
   calabazas" y prepararse. Cada ataque importante:
   - se telegrafía (zona en el piso que se llena y se enciende al final),
   - se anuncia en la barra del jefe con su nombre y QUÉ HACER ("movete de costado"),
   - y tiene contrajuego real (salir del área, meterse en la zona segura, hacerlo chocar...).
   Al aparecer, cada jefe muestra una guía corta con 3 consejos (ver boss-hud.js).
   ============================================================ */

/* ---------------- piezas nuevas de kit ---------------- */
// Anillo: el daño cae entre rIn y rOut (lo seguro es pegarse al jefe... o alejarse mucho).
function skDonut(e, rIn, rOut, windMs, mult, o, rgb){
  bossWindup(e, windMs, "bossCast", {shape:3, r:rOut, r2:rIn, rgb}, ()=>{
    e.attackAnim = 500;
    const oo = Object.assign({from:e}, o||{});
    for(const h of heroes){
      if(!h.alive) continue;
      const d = distance(e,h);
      if(d >= rIn - (h.radius||18)*0.3 && d <= rOut + (h.radius||18)*0.5) bossHitHero(h, e.dmg*mult, oo);
    }
    vfxShock(e.x, e.y, rIn, rOut, rgb, 520, 2);
    particles.push({x:e.x, y:e.y, life:520, ring:true, maxLife:520, maxR:rOut, color:"rgb("+rgb+")"});
  });
}
// Zonas seguras: TODO el que no esté adentro de un círculo seguro recibe el golpe. Una zona por
// héroe, a media distancia (obliga a moverse, nunca aparece debajo de alguien).
function skSafeZones(e, windMs, mult, rgb, o){
  const zones = [];
  for(const h of heroes){
    if(!h.alive) continue;
    const a = Math.random()*Math.PI*2, d = 150 + Math.random()*110;
    const z = {x:h.x + Math.cos(a)*d, y:h.y + Math.sin(a)*d, r:78}; clampToArena(z);
    zones.push(z);
    vfxTelegraph({shape:4, r:z.r, x:z.x, y:z.y, follow:null, dur:windMs, rgb:"110,255,150"});
  }
  bossDangerPulse = windMs;
  bossWindup(e, windMs, "bossCast", null, ()=>{
    e.attackAnim = 600;
    const oo = Object.assign({from:e}, o||{});
    for(const h of heroes){
      if(!h.alive) continue;
      const safe = zones.some(z=>Math.hypot(h.x-z.x, h.y-z.y) <= z.r + (h.radius||18)*0.4);
      if(!safe) bossHitHero(h, e.dmg*mult, oo);
      else if(h===player) floatText(h.x, h.y-50, "¡A salvo!", "heal");
    }
    flashScreen(0.35, rgb); vfxShake(10);
    for(const z of zones) vfxShock(z.x, z.y, 10, z.r, "110,255,150", 420, 2);
  });
}
// Anillo de proyectiles con huecos (se esquiva por el hueco o alejándose).
function skRadial(e, n, speed, mult, color, gaps){
  const off = Math.random()*Math.PI*2, gapSet = new Set();
  for(let g=0; g<(gaps||0); g++){ const k = ((Math.random()*n)|0); gapSet.add(k); gapSet.add((k+1)%n); }
  for(let i=0;i<n;i++){
    if(gapSet.has(i)) continue;
    const a = off + i/n*Math.PI*2;
    projectiles.push({x:e.x, y:e.y-16, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, dmg:e.dmg*mult, life:2600, radius:9, color, enemy:true, src:e});
  }
  e.attackAnim = 400;
}
// Línea de golpes que avanza desde el jefe hacia un objetivo (ola que marcha).
function skLineStrikes(e, dx, dy, count, spacing, R, baseDelay, stepDelay, mult, kind, o){
  const l = Math.hypot(dx,dy)||1; dx/=l; dy/=l;
  for(let i=1;i<=count;i++){
    bossStrike(e.x + dx*spacing*i, e.y + dy*spacing*i, R, baseDelay + stepDelay*i, e.dmg*mult, kind, o);
  }
  animTrigger(e, "bossGroundSlam", 900, 0.5);
  e.attackAnim = 400;
}
// Varias embestidas seguidas: al terminar cada una se re-apunta al objetivo más cercano.
function skMultiCharge(e, n, maxLen, speed, mult, o, rgb){
  e.chargeQueue = n-1; e.chargeQueueArgs = {maxLen, speed, mult, o, rgb};
  const t = nearestHeroTo(e.x, e.y); const dist = t ? distance(e, t) : 300;
  if(t){ const dx=t.x-e.x, dy=t.y-e.y, l=Math.hypot(dx,dy)||1; e.fx=dx/l; e.fy=dy/l; }
  skCharge(e, dist, maxLen, speed, mult, o, rgb, null);
}
function bossChargeEnded(e){
  if(e.chargeQueue>0){
    e.chargeQueue--;
    const a = e.chargeQueueArgs, t = nearestHeroTo(e.x, e.y);
    if(!t || !a) return;
    const dx=t.x-e.x, dy=t.y-e.y, l=Math.hypot(dx,dy)||1; e.fx=dx/l; e.fy=dy/l;
    // re-apunte más corto: se ve venir pero da menos tiempo
    const len = Math.min(l + 110, a.maxLen), td = teleDir(e.fx, e.fy);
    bossWindup(e, 520, "bossCharge", {shape:2, r:Math.max(26, e.radius*0.7), dx:td.dx, dy:td.dy, len:len*td.k, rgb:a.rgb}, ()=>{
      e.bossCharge = {dx:e.fx, dy:e.fy, speed:a.speed, dur:len/a.speed*1000, t:0, hit:new Set(), mult:a.mult, o:a.o||{}, rgb:a.rgb};
    });
  }
}
// Invocación de refuerzos alrededor del jefe (con tope de enemigos en pantalla).
function skSummon(e, type, n){
  if(enemies.length > 42) return false;
  bossWindup(e, 900, "bossCast", {shape:0, r:120, rgb:"255,200,120"}, ()=>{
    for(let i=0;i<n;i++){
      const a = (i/n)*Math.PI*2 + Math.random()*0.5, m = spawnEnemy(type, false, false);
      m.x = e.x + Math.cos(a)*(e.radius+60); m.y = e.y + Math.sin(a)*(e.radius+60); clampToArena(m);
      vfxBurst(m.x, m.y-10, 10, "ember", 120, 380, 3, 1, -40, 0);
    }
  });
  return true;
}
// Espiral: el jefe se planta y dispara brazos de proyectiles que giran (lo resuelve bossActionsBusy).
function skSpiral(e, dur, rate, arms, speed, mult, color, turn){
  bossWindup(e, 600, "bossCast", {shape:0, r:110, rgb:"255,160,80"}, ()=>{
    e.spiral = {t:0, dur, rate, acc:0, ang:Math.random()*Math.PI*2, arms, speed, dmg:e.dmg*mult, color, turn:turn||1.6};
  });
}
// ¿El cuerpo del jefe está metido en un muro del Laberinto?
function bossInWall(e){
  if(!labyrinthWalls.length) return false;
  const rad = e.radius*0.55;
  for(const w of labyrinthWalls){
    const dx = e.x-w.x, dy = e.y-w.y, c = Math.cos(-w.rot), s = Math.sin(-w.rot);
    const lx = dx*c - dy*s, ly = dx*s + dy*c;
    if(Math.abs(lx) < w.len/2 + rad && Math.abs(ly) < w.thick/2 + rad) return true;
  }
  return false;
}

/* ---------------- anuncios en la barra del jefe ---------------- */
let bossDangerPulse = 0; // ms: tiñe los bordes de la pantalla mientras se carga un ataque de zonas seguras
function bossAnnounce(e, name, tip){
  if(e.rank==="jefe"){ bossHudHint(name, tip); }
  else if(inView(e.x, e.y, 60)) floatText(e.x, e.y - e.radius*2.2, name, null);
}

/* ---------------- catálogo de ataques ---------------- */
const BOSS_ATTACKS = {
  // ---- Jinete Sin Cabeza ----
  jinCharge(e, t, d){ if(d < 130 || d > 640) return false; skCharge(e, d, 660, 1050, 1.5, {knock:90, stun:400}, "255,150,60", null); bossAnnounce(e, "Carga Espectral", "movete de costado"); return true; },
  jinPumpkins(e, t, d){
    const pts = heroTargets(3).map(h=>({x:h.x+(Math.random()-0.5)*20, y:h.y+(Math.random()-0.5)*20}));
    const a = Math.random()*Math.PI*2; pts.push({x:t.x+Math.cos(a)*90, y:t.y+Math.sin(a)*90});
    skStrikes(e, pts, 70, 1150, 1.0, "fire", {burn:e.dmg*0.15}, null); bossAnnounce(e, "Calabazas Ardientes", "no te quedes quieto"); return true; },
  jinScythe(e, t, d){ if(d > 210) return false; skCone(e, 200, 1.05, 650, 1.35, {knock:40}, "255,170,90", null); bossAnnounce(e, "Guadaña", "salí del frente"); return true; },
  jinPumpkinLine(e, t, d){ skLineStrikes(e, t.x-e.x, t.y-e.y, 8, 68, 54, 650, 105, 1.0, "fire", {burn:e.dmg*0.12}); bossAnnounce(e, "Sendero de Fuego", "correte de la línea"); return true; },
  jinHunt(e, t, d){ if(!skSummon(e, "bestia_bosque", 3)) return false; bossAnnounce(e, "Llamada de la Cacería", "matá a las bestias rápido"); return true; },
  jinPumpkinRing(e, t, d){ bossWindup(e, 700, "bossCast", {shape:0, r:130, rgb:"255,150,60"}, ()=>skRadial(e, 18, 230, 0.8, "#ff8a2a", 2)); bossAnnounce(e, "Anillo de Calabazas", "buscá el hueco"); return true; },
  jinTripleCharge(e, t, d){ if(d < 100) return false; skMultiCharge(e, 3, 640, 1100, 1.4, {knock:80, stun:350}, "255,120,60"); bossAnnounce(e, "Cacería Sin Fin", "¡3 embestidas seguidas!"); return true; },

  // ---- Leviatán (orbita el borde) ----
  levBite(e, t, d){
    if(!heroes.some(h=>h.alive && distance(e,h) <= 290)) return false;
    skCircleSlam(e, 225, 600, 1.1, {knock:40}, "120,210,230", null, "bossHeavyAttack");
    vfxSprite("fxSpike", 0, e.x+e.fx*60, e.y+e.fy*40, 110, 900, null, 0.12, false, 0.95);
    bossAnnounce(e, "Mordida Abisal", "alejate del borde"); return true; },
  levCharge(e, t, d){
    const tx = player.alive ? player : t; const dx = tx.x-e.x, dy = tx.y-e.y, l = Math.hypot(dx,dy)||1;
    e.fx = dx/l; e.fy = dy/l;
    skCharge(e, l, 1200, 900, 1.35, {knock:70}, "255,120,90", null);
    e.levCharging = true;
    bossAnnounce(e, "Embestida del Leviatán", "salí del carril"); return true; },
  levTail(e, t, d){
    if(!heroes.some(h=>h.alive && distance(e,h) <= 330)) return false;
    skCircleSlam(e, 265, 650, 1.1, {knock:80}, "120,210,230", null, "bossGroundSlam");
    bossAnnounce(e, "Coletazo", "alejate"); return true; },
  levBubbles(e, t, d){ bossWindup(e, 650, "bossCast", {shape:0, r:120, rgb:"120,210,230"}, ()=>skRadial(e, 22, 210, 0.75, "#7fd0e0", 3)); bossAnnounce(e, "Estallido de Burbujas", "buscá el hueco"); return true; },
  levWhirl(e, t, d){
    for(const h of heroTargets(2)) bossStrike(h.x, h.y, 90, 1300, e.dmg*0.9, "water", {slow:0.5, slowDur:1600, pull:true});
    animTrigger(e, "bossCast", 900, 0.5);
    bossAnnounce(e, "Remolino", "salí del círculo"); return true; },
  levTidal(e, t, d){ skSafeZones(e, 2000, 1.6, "90,200,230", {slow:0.45, slowDur:1500}); bossAnnounce(e, "OLEADA", "¡metete en una burbuja verde!"); return true; },

  // ---- Mago de Hielo y Cristal (fase 1 de Hielo) ----
  magNova(e, t, d){ if(d > 250) return false; skCircleSlam(e, 195, 700, 1.4, {frost:1}, "150,220,255", null, "bossCast"); e.skillAnim = {name:"nova_hielo", t:0}; bossSheetPack(e, "nova", 900); bossAnnounce(e, "Nova de Hielo", "alejate de él"); return true; },
  magBolts(e, t, d){
    bossWindup(e, 550, "bossCast", null, ()=>{
      for(const h of heroTargets(3)){
        const dx=h.x-e.x, dy=h.y-e.y, l=Math.hypot(dx,dy)||1;
        for(let k=-1;k<=1;k++){ const a = Math.atan2(dy,dx)+k*0.16; projectiles.push({x:e.x, y:e.y-20, vx:Math.cos(a)*300, vy:Math.sin(a)*300, dmg:e.dmg*0.7, life:2200, radius:8, color:"#bfe8ff", enemy:true, src:e, frost:1, sprite:"bsMagoLance"}); }
      }
    });
    bossSheetPack(e, "cast", 800);
    bossAnnounce(e, "Lanzas de Cristal", "esquivá de costado"); return true; },
  magBlizzard(e, t, d){
    const R = 265;
    bossSheetPack(e, "canal", 850); bossSheetFx("bsMagoRune", e.x, e.y + 4, e.radius * 2.6, 900, {grow:0.25});
    bossWindup(e, 850, "bossCast", {shape:0, r:R, rgb:"200,235,255"}, ()=>{
      e.attackAnim = 500;
      for(const h of heroes){ if(!h.alive || distance(e,h) > R) continue; bossHitHero(h, e.dmg*0.6, {from:e, knock:50, slow:0.55, slowDur:2200, frost:1}); }
      particles.push({x:e.x,y:e.y, life:900, ring:true, maxLife:900, maxR:R, color:"#dff3ff"});
      e.skillAnim = {name:"ventisca", t:0};
    });
    bossAnnounce(e, "Ventisca", "alejate del área"); return true; },
  magFrostLine(e, t, d){ bossSheetPack(e, "muro", 700); skLineStrikes(e, t.x-e.x, t.y-e.y, 7, 70, 52, 600, 110, 1.0, "ice", {frost:1, slow:0.4, slowDur:1400}); bossAnnounce(e, "Grieta Helada", "correte de la línea"); return true; },
  magGuards(e, t, d){
    if(enemies.some(o=>o.alive && o.bossGuardOf===e)) return false;
    bossSheetPack(e, "encase", 1100);
    bossWindup(e, 900, "bossCast", {shape:0, r:140, rgb:"160,220,255"}, ()=>{
      for(let i=0;i<2;i++){
        const a = i*Math.PI + Math.random()*0.6, g = spawnEnemy("golem_cristal", false, false);
        g.x = e.x + Math.cos(a)*170; g.y = e.y + Math.sin(a)*170; clampToArena(g);
        g.hp = g.maxHp = Math.round(e.maxHp*0.06); g.bossGuardOf = e; g.scale *= 1.25; g.radius *= 1.2;
        vfxBurst(g.x, g.y-10, 12, "ice", 130, 400, 3, 1, -40, 0);
      }
      e.armorTimer = 999999; e.dmgTakenMult = 0.35; e.skillAnim = {name:"armadura_hielo", t:0};
    });
    bossAnnounce(e, "Guardianes de Cristal", "¡rompé los gólems: lo protegen!"); return true; },
  // Esbirros de Cristal: servos cuerpo a cuerpo + cristales voladores que disparan escarcha (fase 2 y 3)
  magServants(e, t, d){
    if(enemies.length > 40 || enemies.filter(o=>o.alive && o.bossMinionOf===e).length >= 3) return false;
    bossSheetPack(e, "cast", 900);
    bossWindup(e, 900, "bossCast", {shape:0, r:130, rgb:"160,210,255"}, ()=>{
      const list = ["cristal_servo", "cristal_servo", "cristal_servo", "cristal_volador", "cristal_volador"];
      list.forEach((type, i)=>{
        const a = (i/list.length)*Math.PI*2 + Math.random()*0.4, m = spawnEnemy(type, false, false);
        m.x = e.x + Math.cos(a)*(e.radius+70); m.y = e.y + Math.sin(a)*(e.radius+70); clampToArena(m);
        m.bossMinionOf = e;
        bossSheetFx("bsMagoCrystal", m.x, m.y - 14, 34, 520, {grow:0.3});
      });
    });
    bossAnnounce(e, "Esbirros de Cristal", "los voladores disparan escarcha: rompelos primero"); return true; },

  // ---- Ángel Caído de Hielo (fase 2 de Hielo) ----
  angStalactites(e, t, d){
    const pts = []; for(const h of heroTargets()) pts.push({x:h.x+(Math.random()-0.5)*26, y:h.y+(Math.random()-0.5)*26});
    const extra = e.hp < e.maxHp*0.35 ? 5 : 2;
    for(let i=0;i<extra;i++){ const a = Math.random()*Math.PI*2, r = 70+Math.random()*110; pts.push({x:t.x+Math.cos(a)*r, y:t.y+Math.sin(a)*r}); }
    skStrikes(e, pts, 60, 1200, 1.0, "ice", {slow:0.4, slowDur:1600, frost:1}, null); bossSheetPack(e, "cast", 900); bossAnnounce(e, "Lluvia de Estalactitas", "movete"); return true; },
  angCharge(e, t, d){ if(d < 150 || d > 560) return false; skCharge(e, d, 600, 980, 1.4, {knock:70, frost:2}, "190,235,255", null); bossSheetPack(e, "fly", 1500); bossAnnounce(e, "Juicio Gélido", "movete de costado"); return true; },
  angWings(e, t, d){ if(!heroes.some(h=>h.alive && distance(e,h) < 150)) return false; skCircleSlam(e, 170, 550, 0.8, {knock:90, slow:0.45, slowDur:1800, frost:1}, "200,235,255", null, "bossCast"); bossSheetPack(e, "wing", 800); bossSheetFx("bsAngelNova", e.x, e.y - e.radius*0.4, 340, 700, {grow:0.4}); bossAnnounce(e, "Alas de Ventisca", "¡alejate!"); return true; },
  angDonut(e, t, d){ bossSheetPack(e, "aura", 1100); skDonut(e, 95, 330, 1100, 1.3, {frost:2}, "170,225,255"); bossAnnounce(e, "Tormenta Eterna", "¡pegate a él o alejate mucho!"); return true; },
  angCross(e, t, d){
    const base = Math.atan2(t.y-e.y, t.x-e.x);
    for(let k=0;k<4;k++){ const a = base + k*Math.PI/2; skLineStrikes(e, Math.cos(a), Math.sin(a), 6, 72, 50, 700, 95, 0.9, "ice", {frost:1}); }
    bossSheetPack(e, "storm", 900);
    bossAnnounce(e, "Cruz de Hielo", "ponete en diagonal"); return true; },
  angTripleCharge(e, t, d){ if(d < 100) return false; skMultiCharge(e, 3, 580, 1000, 1.3, {knock:60, frost:1}, "190,235,255"); bossSheetPack(e, "fly", 3200); bossAnnounce(e, "Juicio Final", "¡3 embestidas!"); return true; },

  // ---- Minotauro (Laberinto) ----
  minCharge(e, t, d){ if(d < 140 || d > 700) return false; skCharge(e, d, 720, 1150, 1.6, {knock:110, stun:500}, "255,120,80", null); e.minoCharge = true; bossSheetPack(e, "charge", 1500); bossAnnounce(e, "Embestida", "hacelo chocar contra un muro"); return true; },
  minAxe(e, t, d){ if(d > 210) return false; skCircleSlam(e, 200, 700, 1.3, {knock:70}, "255,140,90", null, "bossHeavyAttack", ()=>{ bossSheetFx("csMinoWave", e.x, e.y + 6, 200, 620); bossSheetFx("csMinoAxe", e.x + (e.fx||1)*e.radius*0.6, e.y - e.radius*0.3, 120, 420); }); bossSheetPack(e, "heavy", 900); bossAnnounce(e, "Hachazo Giratorio", "alejate"); return true; },
  minStomp(e, t, d){ if(d > 170) return false; skCircleSlam(e, 160, 600, 1.1, {stun:600}, "200,170,120", null, "bossGroundSlam", ()=>{ bossSheetFx("csMinoWave", e.x, e.y + 6, 160, 620); bossSheetFx("csMinoDust", e.x, e.y - 10, 110, 600); }); bossSheetPack(e, "seismic", 800); bossAnnounce(e, "Pisotón", "¡salí del círculo!"); return true; },
  minRocks(e, t, d){
    const pts = heroTargets(3).map(h=>({x:h.x, y:h.y})); for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2; pts.push({x:t.x+Math.cos(a)*80, y:t.y+Math.sin(a)*80}); }
    skStrikes(e, pts, 64, 1150, 1.1, "rock", {knock:40}, null); bossSheetPack(e, "seismic", 800); bossAnnounce(e, "Derrumbe", "movete"); return true; },
  minCross(e, t, d){
    const dirs = e.hp < e.maxHp*0.25 ? 8 : 4, base = Math.random()*Math.PI;
    for(let k=0;k<dirs;k++){ const a = base + k*Math.PI*2/dirs; skLineStrikes(e, Math.cos(a), Math.sin(a), 7, 74, 52, 650, 90, 1.0, "rock", {knock:30}); }
    bossSheetPack(e, "seismic", 900); bossSheetFx("csMinoWave", e.x, e.y + 6, 220, 700);
    bossAnnounce(e, "Terremoto", "ponete entre las grietas"); return true; },
  minTripleCharge(e, t, d){ if(d < 100) return false; e.minoCharge = true; skMultiCharge(e, 3, 700, 1200, 1.5, {knock:100, stun:450}, "255,90,60"); bossSheetPack(e, "charge", 3600); bossAnnounce(e, "Estampida", "¡3 embestidas: usá los muros!"); return true; },

  // ---- Demonio Mayor (Infernal) ----
  demFlame(e, t, d){
    if(d > 260) return false;
    const dx = e.fx, dy = e.fy, td = teleDir(dx, dy);
    bossWindup(e, 700, "bossCast", {shape:1, r:250, dx:td.dx, dy:td.dy, arc:0.55, rgb:"255,90,40"}, ()=>{
      e.channel = {dx, dy, t:0, dur:2000, r:250, cosA:Math.cos(0.55), tick:0, tickMs:220, mult:0.32, turn:0.75, burn:true};
    });
    bossAnnounce(e, "Lanzallamas Demoníaco", "¡nunca al frente!"); return true; },
  demWave(e, t, d){ if(d > 280) return false; skCircleSlam(e, 245, 850, 1.15, {burn:e.dmg*0.12}, "255,90,40", null, "bossGroundSlam"); bossAnnounce(e, "Onda Infernal", "alejate"); return true; },
  demMeteors(e, t, d){
    const pts = []; for(const h of heroTargets()) pts.push({x:h.x, y:h.y});
    for(let i=0;i<4;i++){ const a = Math.random()*Math.PI*2, r = 90+Math.random()*200; pts.push({x:t.x+Math.cos(a)*r, y:t.y+Math.sin(a)*r}); }
    skStrikes(e, pts, 72, 1250, 1.1, "fire", {burn:e.dmg*0.14}, null); bossAnnounce(e, "Lluvia de Meteoros", "movete"); return true; },
  demRing(e, t, d){ skDonut(e, 90, 340, 1150, 1.4, {burn:e.dmg*0.14}, "255,110,40"); bossAnnounce(e, "Anillo de Fuego", "¡pegate a él!"); return true; },
  demSpiral(e, t, d){ skSpiral(e, 3200, 7, e.hp<e.maxHp*0.33 ? 4 : 3, 220, 0.55, "#ff6a2a", 1.5); bossAnnounce(e, "Espiral Infernal", "girá con los huecos"); return true; },
  demSummon(e, t, d){ if(!skSummon(e, "demonio_menor", 3)) return false; bossAnnounce(e, "Legión", "matá a los demonios"); return true; },
  demJudgment(e, t, d){ skSafeZones(e, 2200, 1.9, "255,90,40", {burn:e.dmg*0.2}); bossAnnounce(e, "JUICIO FINAL", "¡metete en un círculo verde!"); return true; }
};

/* ---------------- diseño de cada jefe ---------------- */
const BOSS_DESIGNS = {
  jinete_sin_cabeza: {
    epithet:"Heraldo de la Cacería",
    tips:["Se inclina antes de EMBESTIR: movete de costado.", "Las calabazas caen donde estás parado: no te quedes quieto.", "Renace UNA vez: guardá la ulti para su segunda vida."],
    phases:[
      {hp:1.00, gap:[1000,1500], rot:["jinCharge","jinPumpkins","jinScythe","jinPumpkins"]},
      {hp:0.55, gap:[800,1200], rot:["jinCharge","jinPumpkinLine","jinScythe","jinHunt","jinPumpkins"], banner:"¡EL JINETE ACELERA!"}
    ],
    life2:[
      {hp:1.00, gap:[700,1100], rot:["jinTripleCharge","jinPumpkinRing","jinScythe","jinPumpkinLine","jinHunt"]},
      {hp:0.40, gap:[500,850], rot:["jinTripleCharge","jinPumpkinRing","jinPumpkinLine","jinScythe","jinPumpkins"], banner:"¡NOCHE SIN FIN!"}
    ]
  },
  leviatan: {
    epithet:"Terror de las Profundidades",
    tips:["Muerde desde el borde: no pelees pegado a la orilla.", "Antes de la OLEADA aparecen burbujas verdes: metete en una.", "Tiene 3 vidas: cada una más rápida."],
    byLevPhase:true,
    phases:[
      {gap:[1300,1800], rot:["levBite","levCharge","levBubbles","levTail"]},
      {gap:[1000,1500], rot:["levCharge","levTidal","levBite","levWhirl","levTail","levBubbles"]},
      {gap:[750,1150], rot:["levTidal","levCharge","levBubbles","levWhirl","levBite","levCharge","levTail"]}
    ]
  },
  mago_hielo_cristal: {
    epithet:"Custodio del Invierno",
    tips:["La NOVA y la VENTISCA salen de él: alejate cuando brilla.", "Si invoca gólems guardianes, rompelos: le quitan el blindaje.", "Al caer se transforma: guardá energía para la 2ª fase."],
    phases:[
      {hp:1.00, gap:[1100,1600], rot:["magBolts","magNova","magFrostLine","magBlizzard"]},
      {hp:0.60, gap:[950,1400], rot:["magGuards","magBolts","magFrostLine","magNova","magServants","magBlizzard"], banner:"¡EL MAGO SE BLINDA!"},
      {hp:0.30, gap:[750,1100], rot:["magFrostLine","magBolts","magServants","magBlizzard","magNova","magGuards"]}
    ]
  },
  angel_caido_hielo: {
    epithet:"El Ala Congelada",
    tips:["TORMENTA ETERNA: el anillo quema; lo seguro es pegarte a él.", "La escarcha se acumula: 4 golpes helados te congelan.", "Debajo del 35% embiste 3 veces seguidas."],
    phases:[
      {hp:1.00, gap:[900,1400], rot:["angStalactites","angCharge","angWings","angDonut","angCross"]},
      {hp:0.35, gap:[650,1000], rot:["angTripleCharge","angDonut","angStalactites","angCross","angWings"], banner:"¡EL ÁNGEL DESATA LA TORMENTA!"}
    ]
  },
  minotauro: {
    epithet:"Señor del Laberinto",
    tips:["Si EMBISTE contra un muro queda aturdido y recibe más daño.", "Ponete delante de una pared y esquivá a último momento.", "Debajo del 50% se enfurece: más rápido y con terremotos."],
    phases:[
      {hp:1.00, gap:[1000,1500], rot:["minCharge","minAxe","minRocks","minStomp"]},
      {hp:0.50, gap:[800,1200], rot:["minCharge","minCross","minAxe","minCharge","minRocks"], banner:"¡FURIA DEL MINOTAURO!", enrage:true},
      {hp:0.25, gap:[650,1000], rot:["minTripleCharge","minCross","minAxe","minStomp"], banner:"¡ESTAMPIDA!"}
    ]
  },
  demonio_mayor: {
    epithet:"Señor de la Ceniza",
    tips:["El LANZALLAMAS gira despacio: rodealo por la espalda.", "ANILLO DE FUEGO: lo seguro es pegarse a él.", "JUICIO FINAL: solo sobrevive quien está en un círculo verde."],
    phases:[
      {hp:1.00, gap:[1000,1500], rot:["demFlame","demMeteors","demWave","demMeteors"]},
      {hp:0.66, gap:[850,1300], rot:["demRing","demFlame","demSpiral","demMeteors","demWave"], banner:"¡EL INFIERNO SE ABRE!"},
      {hp:0.33, gap:[650,1050], rot:["demJudgment","demSpiral","demFlame","demSummon","demRing","demMeteors"], banner:"¡FURIA DEL DEMONIO!"}
    ]
  }
};
/* Capa ÉPICA común a todos los jefes con diseño (BUGFIX 01):
   - Protección de ráfaga: hasta que el director registra el cambio de fase, la vida no baja más
     de un 2% por debajo del umbral siguiente (cada fase se juega; nadie la saltea de un golpe).
   - Ventana VULNERABLE (x1,6) de 1,8 s después de cada cambio de fase (el rugido abre la guardia).
   - Furia por pelea larga: a los 3 min el jefe pega +25%, se mueve +15% y encadena más rápido. */
const BOSS_EPIC = { floorPad:0.02, phaseVulnMs:1800, softEnrageMs:180000, softEnrageDmg:1.25, softEnrageSpeed:1.15, softEnrageGap:0.75 };
function bossPhaseFloor(e){
  const d = bossDesignFor(e); if(!d || d.byLevPhase || !e.bd || e.bd.phase < 0) return null;
  const phases = (e.resurrected && d.life2) ? d.life2 : d.phases, next = phases[e.bd.phase + 1];
  return next ? e.maxHp*Math.max(0, next.hp - BOSS_EPIC.floorPad) : null;
}
function bossDesignFor(e){ return BOSS_DESIGNS[e.designKey || e.type] || null; } // designKey: otra pelea con el mismo cuerpo (Demonio Mayor — Forma Final)

// Demonio Mayor: una sola vez, al bajar del 40%, se regenera unos segundos (ventana para
// meterle todo el daño posible antes de que recupere demasiado).
function demonRegenCheck(e, dt){
  if(e.regenTimer>0){ e.regenTimer -= dt; e.hp = Math.min(e.maxHp, e.hp + e.maxHp*0.012*dt/1000); }
  if(!e.regenUsed && e.hp < e.maxHp*0.4){
    e.regenUsed = true; e.regenTimer = 5000;
    showBanner("¡REGENERACIÓN OSCURA!");
    bossHudHint("Regeneración Oscura", "¡descargá todo tu daño ahora!");
  }
}
// Guardianes (Mago de Hielo): mientras vivan, el jefe recibe mucho menos daño. Se ven unidos a
// él por una cadena de hielo (drawBossTethers).
function bossGuardCheck(e){
  if(!(e.armorTimer>=999999)) return;
  if(enemies.some(o=>o.alive && o.bossGuardOf===e)) return;
  e.armorTimer = 0; e.dmgTakenMult = 1;
  vfxShock(e.x, e.y, e.radius*0.4, e.radius*2.5, "160,220,255", 600, 2);
  vfxBurst(e.x, e.y-e.radius, 20, "ice", 180, 500, 4, 2, -40, 0);
  showBanner("¡BLINDAJE ROTO!");
  bossHudHint("Blindaje roto", "¡ahora recibe daño completo!");
}
function drawBossTethers(){
  for(const g of enemies){
    if(!g.alive || !g.bossGuardOf || !g.bossGuardOf.alive) continue;
    const b = g.bossGuardOf;
    if(!inView(g.x, g.y, 200) && !inView(b.x, b.y, 200)) continue;
    const pulse = 0.5+0.5*Math.sin(animNow/120);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(150,220,255,${0.35+0.35*pulse})`; ctx.lineWidth = 4; ctx.setLineDash([14,8]); ctx.lineDashOffset = -animNow/30;
    ctx.beginPath(); ctx.moveTo(g.x, g.y-g.radius); ctx.lineTo(b.x, b.y-b.radius); ctx.stroke();
    ctx.restore();
  }
}

// Acciones en curso (canalización, embestida, espiral): mientras duran, el jefe no se mueve ni
// elige otro ataque. Devuelve true si está ocupado este cuadro.
function bossActionsBusy(e, dt, tgt, dist){
  if(e.spiral){
    const s = e.spiral; s.t += dt; s.acc += dt; s.ang += s.turn*dt/1000;
    const every = 1000/s.rate;
    while(s.acc >= every){
      s.acc -= every;
      for(let k=0;k<s.arms;k++){
        const a = s.ang + k*Math.PI*2/s.arms;
        projectiles.push({x:e.x, y:e.y-18, vx:Math.cos(a)*s.speed, vy:Math.sin(a)*s.speed, dmg:s.dmg, life:2600, radius:8, color:s.color, enemy:true, src:e});
      }
    }
    e.attackAnim = Math.max(e.attackAnim, 120);
    if(s.t >= s.dur) e.spiral = null;
    return true;
  }
  return updateBossSkills(e, dt, tgt, dist, true); // canalización / embestida genéricas (boss-skills.js)
}

// Director: fases + rotación. Se llama para los jefes con diseño (BOSS_DESIGNS).
function updateBossDirector(e, dt, tgt, dist){
  const d = bossDesignFor(e); if(!d) return false;
  const st = e.bd || (e.bd = {phase:-1, idx:0, gap:2600, life:0});
  if(e.crashTimer>0){ e.crashTimer -= dt; if(e.crashTimer<=0) e.crashVuln = false; }
  // fase actual
  let phases = d.phases, ph = 0;
  if(d.byLevPhase){ ph = Math.min(phases.length-1, (e.acuaticaPhase||1)-1); }
  else {
    if(e.resurrected && d.life2) phases = d.life2;
    for(let i=0;i<phases.length;i++) if(e.hp/e.maxHp <= phases[i].hp) ph = i;
  }
  const life = e.resurrected ? 1 : 0;
  if(ph !== st.phase || life !== st.life){
    const first = st.phase===-1;
    st.phase = ph; st.life = life; st.idx = 0;
    if(!first){
      st.gap = 1400;
      const P = phases[ph];
      if(P.banner) showBanner(P.banner);
      if(P.enrage && !e.enraged){ e.enraged = true; e.speed *= 1.3; }
      if(P.onEnter) P.onEnter(e);   // p.ej. transformación del Guardián Ancestral
      else if(ph > 0){ e.crashVuln = true; e.crashTimer = BOSS_EPIC.phaseVulnMs; }   // el rugido abre su guardia
      // cambio de fase: rugido que empuja a todos + breve respiro
      animTrigger(e, "bossPhaseTransition", 1100);
      vfxShock(e.x, e.y, e.radius*0.4, e.radius*3, "255,210,140", 700, 2);
      for(const h of heroes){ if(h.alive && distance(e,h) < 200) bossHitHero(h, 0.1, {from:e, knock:80}); }
      if(ph>0) { vfxShake(9); playSfx("bossRoar"); }
      bossHudPhase(ph, phases.length);
    } else bossHudPhase(0, phases.length);
  }
  st.el = (st.el||0) + dt;
  if(!e._softEnraged && st.el >= BOSS_EPIC.softEnrageMs){
    e._softEnraged = true; e.dmg = Math.round(e.dmg*BOSS_EPIC.softEnrageDmg); e.speed *= BOSS_EPIC.softEnrageSpeed; e.enraged = true;
    showBanner("¡SE ENFURECE! (la pelea se alarga)"); bossHudHint("Furia", "pega más fuerte y más seguido: terminalo ya");
    vfxShock(e.x, e.y, e.radius*0.4, e.radius*3, "255,60,40", 700, 2); playSfx("bossRoar");
  }
  bossGuardCheck(e);
  if(e._gdTf > 0){ e.attackAnim = Math.max(e.attackAnim||0, 120); return true; }   // transformándose: quieto
  if(bossActionsBusy(e, dt, tgt, dist)) return true;
  if(e.bossWind) return false;
  st.gap -= dt;
  if(st.gap > 0) return false;
  const P = phases[st.phase], rot = P.rot;
  for(let k=0;k<rot.length;k++){
    const key = rot[(st.idx + k) % rot.length];
    const fn = BOSS_ATTACKS[key];
    if(fn && fn(e, tgt, dist)){
      st.idx = (st.idx + k + 1) % rot.length;
      st.gap = (P.gap[0] + Math.random()*(P.gap[1]-P.gap[0])) * (e._softEnraged ? BOSS_EPIC.softEnrageGap : 1);
      return false;
    }
  }
  st.gap = 350; // nada aplicable ahora (p.ej. todos lejos): reintenta pronto
  return false;
}
