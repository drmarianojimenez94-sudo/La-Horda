"use strict";
/* ============================================================
   js/skills/boss-guardian.js
   GUARDIÁN ANCESTRAL CORROMPIDO — jefe del Bosque (nivel 10). Arte: hoja "Guardián Élfico
   Ancestral" (tools/art/guardian_elfico/build.py -> BOSS_SHEET_ATLAS / BOSS_SHEET_FX).
   El protector del círculo de runas, consumido por la misma corrupción que las runas desataron.

   Pelea en 3 fases (director de boss-patterns.js), cada ataque telegrafiado y con contrajuego:
   - F1 "El Guardián": Báculo (cono), Lanza de Enredaderas (proyectil), Raíces (círculos bajo los
     pies), Ondas de Espinas (línea que avanza), Lluvia de Hojas (zonas a esquivar).
   - Transformación (65%): ESCUDO de corteza mientras se transforma (no se le puede saltar la fase
     con daño explosivo), después queda EXPUESTO 3 s (VULNERABLE) y pasa a la paleta de FURIA.
   - F2 "Corrompido": Golpe Pesado (clava el báculo: ventana VULNERABLE), Muralla de Árboles (con
     un hueco), Zonas Corruptas (quedan en el piso), Lanza triple, invoca a la jauría del bosque.
   - F3 (30%) "El Bosque Muere con Él": enfurecido, JUICIO DEL BOSQUE (solo se salva quien está en
     un círculo de luz), Cruz de Espinas y todo más rápido.
   Todo lo resuelve el anfitrión; las zonas y efectos viajan por los eventos de vfxSprite.
   ============================================================ */
const GUARD_CFG = {
  transformAt: 0.65,     // % de vida: transformación (fin de la fase 1)
  transformMs: 2100,
  shieldMult: 0.15,      // daño recibido mientras se transforma
  exposedMs: 3000,       // VULNERABLE después de transformarse
  heavyVulnMs: 1500,     // VULNERABLE con el báculo clavado
  zoneMs: 6500, zoneR: 78, zoneTick: 500, zoneMult: 0.10, zoneMax: 8,
  wallMs: 5200
};
const GUARD = { zones: [] };

function guardReset(){ GUARD.zones.length = 0; }

// Por cuadro (anfitrión), desde bossSheetTick: transformación, escudo y zonas corruptas.
function guardTick(e, dt){
  if(e.type !== "guardian_ancestral") return;
  if(e._gdTf){
    e._gdTf -= dt;
    const floor = e.maxHp*(GUARD_CFG.transformAt - 0.04);
    if(e.hp < floor) e.hp = floor;   // protección de ráfaga: la fase no se salta
    if(e._gdTf <= 0){
      e._gdTf = 0; e.dmgTakenMult = 1; e.atlasKey = "guardian_ancestral_furia";
      e.crashVuln = true; e.crashTimer = GUARD_CFG.exposedMs;
      bossSheetFx("gdBurst", e.x, e.y - e.radius, e.radius*3.2, 700);
      vfxShock(e.x, e.y, e.radius*0.5, e.radius*3.6, "220,60,60", 700, 3);
      for(const h of heroes){ if(h.alive && distance(e,h) < 230) bossHitHero(h, e.dmg*0.35, {from:e, knock:110}); }
      vfxShake(12); flashScreen(0.35, "200,40,40"); playSfx("bossRoar");
      showBanner("¡EL GUARDIÁN SE CORROMPE!");
      bossHudHint("Expuesto", "¡acaba de transformarse: descargá todo ahora!");
    }
  }
  if(GUARD.zones.length){
    let w = 0;
    for(const z of GUARD.zones){
      z.t -= dt; z.tick -= dt;
      if(z.tick <= 0){
        z.tick = GUARD_CFG.zoneTick;
        for(const h of heroes){
          if(h.alive && Math.hypot(h.x-z.x, h.y-z.y) <= z.r + (h.radius||18)*0.4)
            bossHitHero(h, z.dmg, {slow:0.35, slowDur:700});
        }
      }
      if(z.t > 0) GUARD.zones[w++] = z;
    }
    GUARD.zones.length = w;
  }
}
// La transformación la dispara el director al pasar a la fase 2 (ver BOSS_DESIGNS.onPhase).
function guardTransform(e){
  if(e._gdDone) return;
  e._gdDone = true; e._gdTf = GUARD_CFG.transformMs; e.dmgTakenMult = GUARD_CFG.shieldMult;
  e.bossWind = null; e.bossCharge = null;
  bossSheetPack(e, "transf", GUARD_CFG.transformMs);
  bossSheetFx("gdAura", e.x, e.y + 6, e.radius*3.4, GUARD_CFG.transformMs, {follow:e, anchorY:0.7});
  vfxTelegraph({shape:0, r:230, x:e.x, y:e.y, follow:e, dur:GUARD_CFG.transformMs, rgb:"220,60,60"});
  showBanner("EL GUARDIÁN SE TRANSFORMA…");
  bossHudHint("Corteza protectora", "casi no recibe daño: alejate, al terminar explota");
}
function _gdZone(x, y, dmg){
  if(GUARD.zones.length >= GUARD_CFG.zoneMax) GUARD.zones.shift();
  const c = {x, y}; clampToArena(c);
  GUARD.zones.push({x:c.x, y:c.y, r:GUARD_CFG.zoneR, t:GUARD_CFG.zoneMs, tick:GUARD_CFG.zoneTick, dmg});
  bossSheetFx("gdCorrupt", c.x, c.y + 10, GUARD_CFG.zoneR*1.9, GUARD_CFG.zoneMs, {anchorY:0.9, fps:1.2});
}
function _gdLance(e, t, spread){
  const n = spread ? 3 : 1, base = Math.atan2(t.y - e.y, t.x - e.x);
  bossWindup(e, 620, "bossCast", {shape:2, r:26, dx:Math.cos(base), dy:Math.sin(base), len:520, rgb:"140,230,110"}, ()=>{
    for(let i=0;i<n;i++){
      const a = base + (i - (n-1)/2)*0.28, sp = 420;
      projectiles.push({x:e.x + Math.cos(a)*e.radius*0.6, y:e.y - e.radius*0.8, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
        dmg:e.dmg*0.9, life:1700, radius:14, color:"#8ee07a", enemy:true, src:e, sprite:"gdLance", slow:0.3});
    }
    e.attackAnim = 420;
  });
  bossSheetPack(e, "lance", 900);
}

Object.assign(BOSS_ATTACKS, {
  gdStaff(e, t, d){
    if(d > 230) return false;
    bossSheetPack(e, "atk", 900);
    skCone(e, 220, 0.95, 620, 1.3, {knock:50}, "140,230,110", null, ()=>bossSheetFx("gdImpact", e.x + e.fx*110, e.y + e.fy*80 - 20, 120, 380));
    bossAnnounce(e, "Báculo Ancestral", "salí del frente"); return true; },
  gdLance(e, t, d){ if(d < 120) return false; _gdLance(e, t, false); bossAnnounce(e, "Lanza de Enredaderas", "correte de la línea"); return true; },
  gdLance3(e, t, d){ if(d < 100) return false; _gdLance(e, t, true); bossAnnounce(e, "Lanzas Gemelas", "¡tres a la vez: movete de costado!"); return true; },
  gdRoots(e, t, d){
    const pts = heroTargets(4).map(h=>({x:h.x, y:h.y}));
    const a = Math.random()*Math.PI*2; pts.push({x:t.x + Math.cos(a)*110, y:t.y + Math.sin(a)*110});
    bossSheetPack(e, "roots", 1200);
    skStrikes(e, pts, 66, 1150, 0.95, "root", {stun:650}, null);
    runLater(1150, ()=>{ for(const p of pts) bossSheetFx("gdRoots", p.x, p.y + 10, 110, 700, {anchorY:0.9}); });
    bossAnnounce(e, "Raíces Hambrientas", "salí del círculo verde"); return true; },
  gdThornWave(e, t, d){
    bossSheetPack(e, "cast", 800);
    const dx = t.x - e.x, dy = t.y - e.y, l = Math.hypot(dx, dy)||1;
    skLineStrikes(e, dx, dy, 8, 66, 50, 600, 110, 1.0, "root", {slow:0.4, slowDur:1200});
    const ox = e.x, oy = e.y;
    for(let i=1;i<=8;i++) runLater(600 + 110*i, ()=>bossSheetFx("gdSpikeFx", ox + dx/l*66*i, oy + dy/l*66*i + 8, 96, 520, {anchorY:0.9}));
    bossAnnounce(e, "Ondas de Espinas", "correte de la línea"); return true; },
  gdThornCross(e, t, d){
    bossSheetPack(e, "cast", 900);
    const a0 = Math.atan2(t.y - e.y, t.x - e.x);
    for(let k=0;k<4;k++){ const a = a0 + k*Math.PI/2; skLineStrikes(e, Math.cos(a), Math.sin(a), 7, 64, 46, 750, 95, 1.0, "root", {slow:0.4, slowDur:1200}); }
    bossAnnounce(e, "Cruz de Espinas", "ponete en diagonal"); return true; },
  gdLeafRain(e, t, d){
    const pts = [];
    for(const h of heroTargets()) pts.push({x:h.x + (Math.random()-0.5)*40, y:h.y + (Math.random()-0.5)*40});
    for(let i=0;i<5;i++){ const a = Math.random()*Math.PI*2, r = 100 + Math.random()*230; pts.push({x:t.x + Math.cos(a)*r, y:t.y + Math.sin(a)*r}); }
    bossSheetPack(e, "cast", 1000);
    skStrikes(e, pts, 64, 1300, 0.9, "root", null, null);
    for(const p of pts) bossSheetFx("gdLeafRain", p.x, p.y - 30, 120, 1300, {anchorY:0.75});
    bossAnnounce(e, "Lluvia de Hojas", "no te quedes quieto"); return true; },
  gdHeavy(e, t, d){
    if(d > 260) return false;
    bossSheetPack(e, "heavy", 1100);
    skCircleSlam(e, 240, 900, 1.45, {knock:95, stun:300}, "220,90,60", null, "bossGroundSlam", ()=>{
      bossSheetFx("gdSpikes", e.x, e.y + 10, 220, 700, {anchorY:0.9});
      e.crashVuln = true; e.crashTimer = GUARD_CFG.heavyVulnMs; e.stunTimer = Math.max(e.stunTimer||0, GUARD_CFG.heavyVulnMs);
      bossHudHint("Báculo clavado", "¡pegale ahora, está VULNERABLE!");
    });
    bossAnnounce(e, "Golpe del Bosque", "alejate… y volvé a pegarle"); return true; },
  gdTreeWalls(e, t, d){
    // muralla de árboles perpendicular a la línea jefe->objetivo, con UN hueco: golpea al levantarse
    // y queda como obstáculo unos segundos (mismo sistema de colisión que el Muro de Hielo)
    const dx = t.x - e.x, dy = t.y - e.y, l = Math.hypot(dx, dy)||1, ux = dx/l, uy = dy/l;
    const cx = e.x + ux*Math.min(l, 200), cy = e.y + uy*Math.min(l, 200), N = 11, SP = 46, gap = 2 + ((Math.random()*(N-4))|0);
    const plan = [];
    for(let i=0;i<N;i++){ if(i===gap || i===gap+1) continue; const off = (i-(N-1)/2)*SP; plan.push({x:cx - uy*off, y:cy + ux*off}); }
    for(const p of plan) bossStrike(p.x, p.y, 30, 950, e.dmg*0.9, "root", {knock:40});
    bossSheetPack(e, "roots", 1000);
    runLater(950, ()=>{
      for(const p of plan){
        if(iceWalls.length >= ICE_WALL_MAX) break;
        if(heroes.some(h=>h.alive && Math.hypot(h.x-p.x, h.y-p.y) < 22 + (h.radius||18))) continue;
        const c = {x:p.x, y:p.y}; clampToArena(c);
        iceWalls.push({x:c.x, y:c.y, r:22, life:GUARD_CFG.wallMs, maxLife:GUARD_CFG.wallMs, tree:true, img:(Math.random()*4)|0, flip:Math.random()<0.5});
      }
    });
    bossAnnounce(e, "Muralla de Árboles", "buscá el hueco"); return true; },
  gdCorrupt(e, t, d){
    const tg = heroTargets(3);
    bossSheetPack(e, "cast", 900);
    for(const h of tg){ bossStrike(h.x, h.y, GUARD_CFG.zoneR, 900, e.dmg*0.5, "root", null); }
    const pts = tg.map(h=>({x:h.x, y:h.y}));
    runLater(900, ()=>{ for(const p of pts) _gdZone(p.x, p.y, e.dmg*GUARD_CFG.zoneMult); });
    bossAnnounce(e, "Zona Corrupta", "salí del charco rojo: queda un rato"); return true; },
  gdSummon(e, t, d){
    const type = Math.random() < 0.5 ? "cu_sith" : "enjambre_hadas";
    if(!skSummon(e, type, e.hp < e.maxHp*0.3 ? 4 : 3)) return false;
    bossSheetPack(e, "roots", 900);
    bossAnnounce(e, "Llamado del Bosque", "matá a los invocados rápido"); return true; },
  gdJudgment(e, t, d){
    bossSheetPack(e, "roots", 2200);
    skSafeZones(e, 2300, 1.8, "200,50,50", {slow:0.4, slowDur:1500});
    bossAnnounce(e, "JUICIO DEL BOSQUE", "¡metete en un círculo de luz!"); return true; }
});

BOSS_DESIGNS.guardian_ancestral = {
  epithet:"El Bosque que Recuerda",
  tips:["Cuando CLAVA el báculo queda VULNERABLE: ahí se le pega.", "Al 65% se TRANSFORMA: tiene corteza (casi sin daño) y al terminar explota; después queda expuesto.", "Las ZONAS CORRUPTAS quedan en el piso: no pelees encima."],
  phases:[
    {hp:1.00, gap:[1000,1500], rot:["gdStaff","gdLance","gdRoots","gdThornWave","gdStaff","gdLeafRain"]},
    {hp:GUARD_CFG.transformAt, gap:[850,1300], rot:["gdHeavy","gdTreeWalls","gdLance3","gdCorrupt","gdRoots","gdSummon","gdThornWave"], onEnter:guardTransform},
    {hp:0.30, gap:[650,1000], rot:["gdJudgment","gdHeavy","gdThornCross","gdCorrupt","gdLance3","gdTreeWalls","gdLeafRain"], banner:"¡EL BOSQUE MUERE CON ÉL!", enrage:true}
  ]
};
// su disparo básico a distancia también es una lanza de enredaderas (arte de la hoja)
if(typeof ENEMY_PROJ_SPRITE !== "undefined") ENEMY_PROJ_SPRITE.guardian_ancestral = "gdLance";
