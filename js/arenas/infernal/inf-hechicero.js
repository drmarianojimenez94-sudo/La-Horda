"use strict";
/* ============================================================
   js/arenas/infernal/inf-hechicero.js
   EL HECHICERO SUPREMO — el guía que te trae hasta acá, y el final de la campaña.
   - Es la voz del tutorial (tutorial.js) y la figura angelical de la pantalla previa a cada
     partida (run-intro.js). En la Arena Infernal se revela:
   - Nivel 9, SUBJEFE: "Hechicero Supremo". Orbe Sagrado, Pilares Celestiales, Juicio Divino y
     Meteoros Sagrados (el arte de su hoja). Si lo acorralan, se teletransporta. Al caer NO muere:
     se arrodilla, se ríe y desaparece ("nos vemos al final del camino").
   - Nivel 10, JEFE FINAL en 3 formas:
       1) reaparece como Hechicero (cinemática corta, invulnerable) y se transforma;
       2) GOLEM DE CUERPOS: los caídos de todas las arenas cosidos a su alrededor;
       3) al romperse el Golem, de sus restos nace el DEMONIO MAYOR (el jefe que ya existía).
   Todo lo pesado corre en el anfitrión; lo que se ve (vfxSprite, carteles, avisos) se repite en
   los invitados por la red como el resto de los efectos.
   ============================================================ */
const HECH_DIR = "assets/sprites/bosses/infernal/hechicero/";

/* ---------------- datos ---------------- */
ENEMY_BASE.hechicero_supremo = {name:"Hechicero Supremo", rank:"subjefe", hp:1500, dmg:24, speed:60, radius:40, xp:90, gold:36,
  scale:5.6, color:"#e8c27a", ranged:true, range:330, projSpeed:300, dropsItem:true, visualAlias:"mago_hielo_cristal"};
ENEMY_BASE.golem_cuerpos = {name:"Golem de Cuerpos", rank:"jefe", hp:2200, dmg:32, speed:38, radius:78, xp:0, gold:0,
  scale:9.5, color:"#8a2a2a", ranged:false, dropsItem:true, visualAlias:"demonio_mayor"};
ENEMY_PROJ_COLOR.hechicero_supremo = "#ffe2a0";
DIFF.bossHpType.golem_cuerpos = 0.9;
ANIM_PROFILES.hechicero_supremo = {speed:0.9, weight:1.4, amp:0.5, lunge:6, cast:1.6, impact:1.4, material:"holy", particle:"holy", death:"collapse"};
ANIM_PROFILES.golem_cuerpos = {speed:0.6, weight:2.4, amp:0.8, lunge:16, cast:1.2, impact:2.4, material:"flesh", particle:"flesh", death:"collapse"};
const HECH_TYPES = {hechicero_supremo:1, golem_cuerpos:1};

/* ---------------- arte ---------------- */
enemyAtlasPackLoad("hechicero_supremo", HECH_DIR+"atlas.png", {"w":102,"h":113,"cols":8,"refH":112,"anchor":0.9823,
  "sets":{"idle":[0,1,2,3],"walk":[0,1,2,3],"cast":[16,17,18,19,20,21,22,23],"atk":[24,25,26,27],"hit":[28,29,30,31],"death":[33,34,35,36,37,38],"kneel":[36]}});
ENEMY_ATLAS_PACK.hechicero_supremo.hMul = 4.2; // más grande que un héroe: se lee como subjefe
enemyAtlasPackLoad("golem_cuerpos", HECH_DIR+"golem/atlas.png", {"w":327,"h":274,"cols":3,"refH":274,"anchor":0.9927,
  "sets":{"idle":[1],"walk":[1],"atk":[2],"slam":[2],"hit":[1],"tf":[3,4,5],"pre":[6],"death":[2,5,4,3]}});
ENEMY_ATLAS_PACK.golem_cuerpos.hMul = 3.3;
// efectos de la hoja (se usan con vfxSprite, que ya viaja por la red)
acua2Load("hsOrb", [HECH_DIR+"fx/orb_small.png", HECH_DIR+"fx/orb_trail.png"]);
acua2Load("hsOrbBurst", [HECH_DIR+"fx/orb_burst.png"]);
acua2Load("hsPillar", [HECH_DIR+"fx/pillar_a.png", HECH_DIR+"fx/pillar_b.png", HECH_DIR+"fx/pillar_c.png"]);
acua2Load("hsJudgRing", [HECH_DIR+"fx/judg_ring.png"]);
acua2Load("hsSigil", [HECH_DIR+"fx/judg_sigil.png"]);
acua2Load("hsMeteor", [HECH_DIR+"fx/meteor_a.png", HECH_DIR+"fx/meteor_b.png"]);
acua2Load("hsMeteorHit", [HECH_DIR+"fx/meteor_hit.png"]);
acua2Load("hsBolt", [HECH_DIR+"fx/bolt.png"]);
acua2Load("gcStorm", [HECH_DIR+"fx/corpse_storm.png"]);
acua2Load("gcHand", [HECH_DIR+"fx/corpse_hand.png"]);
acua2Load("gcArms", [HECH_DIR+"fx/arms_rise.png"]);
acua2Load("gcNova", [HECH_DIR+"fx/golem_nova.png"]);
const HECH_PORTRAIT = new Image(); HECH_PORTRAIT.src = HECH_DIR + "portrait.png";

/* ---------------- guías (boss-hud.js) ---------------- */
ARENA_BOSS_TIPS.hechicero_supremo = {epithet:"El que te guió hasta acá", tips:[
  "ORBE SAGRADO: una bola de luz lenta. Esquivala de costado.",
  "PILARES y METEOROS: salí del círculo dorado antes de que se llene.",
  "Si te acercás, se teletransporta: rodealo entre varios."]};

/* ---------------- agenda de efectos diferidos (solo anfitrión) ---------------- */
const HECH_Q = [];
function hechLater(ms, fn){ HECH_Q.push({t:ms, fn}); }
function hechWorldTick(dt){
  if(!HECH_Q.length) return;
  for(let i=HECH_Q.length-1;i>=0;i--){ const q = HECH_Q[i]; q.t -= dt; if(q.t <= 0){ HECH_Q.splice(i, 1); try{ q.fn(); }catch(err){} } }
}
function hechReset(){ HECH_Q.length = 0; }
function _hPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function _hSay(e, text){ if(e && inView(e.x, e.y, 200)) floatText(e.x, e.y - e.radius*2.6, text, "crit"); }

/* ---------------- ataques del Hechicero ---------------- */
Object.assign(BOSS_ATTACKS, {
  // ORBE SAGRADO: bola de luz lenta que persigue un poco (se esquiva de costado)
  hsOrb(e, t, d){
    const n = e.hp < e.maxHp*0.5 ? 3 : 1;
    _hPack(e, "cast", 700);
    bossWindup(e, 650, "bossCast", {shape:0, r:60, rgb:"255,225,140"}, ()=>{
      for(let i=0;i<n;i++){
        const a = Math.atan2(t.y-e.y, t.x-e.x) + (i-(n-1)/2)*0.32, sp = 250;
        projectiles.push({x:e.x, y:e.y-40, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, dmg:e.dmg*1.0, life:3200, radius:13,
          color:"#ffe2a0", enemy:true, src:e, sprite:"hsOrb"});
      }
      vfxSprite("hsOrbBurst", 0, e.x, e.y-30, 70, 360, e, 0.2, false, 0.5);
    });
    bossAnnounce(e, "Orbe Sagrado", "esquivalo de costado"); return true; },
  // PILARES CELESTIALES: columnas de luz debajo de cada héroe (y alrededor)
  hsPillars(e, t, d){
    const pts = []; for(const h of heroTargets()) pts.push({x:h.x, y:h.y});
    for(let i=0;i<3;i++){ const a = Math.random()*Math.PI*2, r = 110+Math.random()*160; pts.push({x:t.x+Math.cos(a)*r, y:t.y+Math.sin(a)*r}); }
    const delay = 1150;
    skStrikes(e, pts, 62, delay, 1.05, "holy", {slow:0.3}, null);
    for(const p of pts) hechLater(delay - 120, ()=> vfxSprite("hsPillar", 0, p.x, p.y+8, 150, 700, null, 0.15, false, 0.95, 10));
    _hPack(e, "cast", 900);
    bossAnnounce(e, "Pilares Celestiales", "salí de la luz"); return true; },
  // JUICIO DIVINO: el sello se abre bajo sus pies; lo seguro es alejarse O pegarse a él
  hsJudgment(e, t, d){
    const rIn = 90, rOut = 330;
    vfxSprite("hsSigil", 0, e.x, e.y+10, 110, 1500, null, 0.3, false, 0.55);
    skDonut(e, rIn, rOut, 1300, 1.35, {slow:0.4}, "255,225,140");
    hechLater(1300, ()=>{ for(let i=0;i<4;i++){ const a = i/4*Math.PI*2; vfxSprite("hsJudgRing", 0, e.x+Math.cos(a)*200, e.y+Math.sin(a)*200, 90, 520, null, 0.2, false, 0.5); } });
    _hPack(e, "cast", 1300);
    bossAnnounce(e, "Juicio Divino", "pegate a él o alejate mucho"); return true; },
  // METEOROS SAGRADOS: caen del cielo sobre la zona (el meteoro se ve bajar antes del golpe)
  hsMeteors(e, t, d){
    const pts = []; for(const h of heroTargets()) pts.push({x:h.x+(Math.random()-0.5)*60, y:h.y+(Math.random()-0.5)*60});
    for(let i=0;i<5;i++){ const a = Math.random()*Math.PI*2, r = 80+Math.random()*230; pts.push({x:t.x+Math.cos(a)*r, y:t.y+Math.sin(a)*r}); }
    const delay = 1350;
    skStrikes(e, pts, 70, delay, 1.15, "holy", {burn:e.dmg*0.08}, null);
    for(const p of pts){
      hechLater(delay - 420, ()=> vfxSprite("hsMeteor", 0, p.x, p.y - 260, 130, 440, null, 0, false, 1, 8, 0, 560));
      hechLater(delay, ()=> vfxSprite("hsMeteorHit", 0, p.x, p.y+10, 120, 520, null, 0.2, false, 0.95));
    }
    _hPack(e, "cast", 900);
    bossAnnounce(e, "Meteoros Sagrados", "movete, no te quedes quieto"); return true; }
});
BOSS_DESIGNS.hechicero_supremo = {
  epithet:"El que te guió hasta acá",
  tips:ARENA_BOSS_TIPS.hechicero_supremo.tips,
  phases:[
    {hp:1.00, gap:[1100,1600], rot:["hsOrb","hsPillars","hsOrb","hsMeteors"]},
    {hp:0.50, gap:[850,1300], rot:["hsJudgment","hsOrb","hsMeteors","hsPillars","hsOrb"], banner:"EL HECHICERO REVELA SU PODER"}
  ]
};

/* ---------------- ataques del Golem de Cuerpos ---------------- */
Object.assign(BOSS_ATTACKS, {
  gcSlam(e, t, d){ if(d > 260) return false; _hPack(e, "slam", 1000); skCircleSlam(e, 210, 1000, 1.3, {knock:90}, "200,60,60", null, "bossGroundSlam");
    hechLater(1000, ()=> vfxSprite("gcNova", 0, e.x, e.y+20, 170, 480, null, 0.2, false, 0.6));
    bossAnnounce(e, "Aplastar", "alejate del golem"); return true; },
  // Manos del Osario: una fila de brazos que brota del suelo hacia el objetivo
  gcHands(e, t, d){
    const dx = t.x-e.x, dy = t.y-e.y, l = Math.hypot(dx, dy)||1, n = 7, sp = 70;
    skLineStrikes(e, dx, dy, n, sp, 50, 700, 110, 1.05, "rock", {stun:350});
    for(let i=1;i<=n;i++){ const x = e.x+dx/l*sp*i, y = e.y+dy/l*sp*i; hechLater(700+110*i, ()=> vfxSprite("gcArms", 0, x, y+10, 120, 600, null, 0.2, false, 0.95)); }
    _hPack(e, "atk", 800);
    bossAnnounce(e, "Manos del Osario", "correte de la fila"); return true; },
  // Tormenta de Cadáveres: huesos y restos en todas direcciones, con huecos
  gcStorm(e, t, d){
    _hPack(e, "atk", 900);
    bossWindup(e, 850, "bossCast", {shape:0, r:130, rgb:"200,90,90"}, ()=>{
      const n = e.hp < e.maxHp*0.5 ? 18 : 14;
      skRadial(e, n, 200, 0.7, "#d9b08a", 2);
      for(let i=projectiles.length-1, k=0; i>=0 && k<n; i--){ const p = projectiles[i]; if(p.src===e){ p.sprite = "gcHand"; k++; } }
      vfxSprite("gcStorm", 0, e.x, e.y-40, 170, 600, e, 0.2, false, 0.5);
    });
    bossAnnounce(e, "Tormenta de Cadáveres", "pasá por los huecos"); return true; },
  // Brazos del Abismo: agarran debajo de cada héroe (enraízan)
  gcArms(e, t, d){
    const pts = heroTargets().map(h=>({x:h.x, y:h.y})); const delay = 1200;
    skStrikes(e, pts, 80, delay, 1.2, "rock", {stun:650}, null);
    for(const p of pts) hechLater(delay, ()=> vfxSprite("gcArms", 0, p.x, p.y+12, 160, 800, null, 0.2, false, 0.95));
    _hPack(e, "atk", 900);
    bossAnnounce(e, "Brazos del Abismo", "salí del círculo ya"); return true; },
  // Nova Profana: anillo de carne alrededor (lo seguro es pegarse)
  gcNova(e, t, d){
    _hPack(e, "slam", 1300);
    skDonut(e, 110, 390, 1300, 1.5, {knock:60}, "220,70,70");
    hechLater(1300, ()=> vfxSprite("gcNova", 0, e.x, e.y+20, 260, 700, null, 0.3, false, 0.6));
    bossAnnounce(e, "Nova Profana", "¡pegate al golem!"); return true; }
});
BOSS_DESIGNS.golem_cuerpos = {
  epithet:"Forma 2 de 3 — el Hechicero, cosido con los caídos",
  tips:["Es lento: no pelees de frente, rodealo.", "NOVA PROFANA: lo seguro es pegarse a él.", "Cuando se rompa, NO terminó: queda una forma más."],
  phases:[
    {hp:1.00, gap:[1100,1600], rot:["gcSlam","gcHands","gcStorm","gcSlam"]},
    {hp:0.50, gap:[850,1300], rot:["gcArms","gcStorm","gcNova","gcHands","gcSlam"], banner:"¡LOS CUERPOS SE AGITAN!"}
  ]
};

/* ---------------- comportamiento propio (llamado desde el loop de enemigos) ---------------- */
// Devuelve true si el enemigo no debe hacer nada más este cuadro (cinemática).
function hechEnemyTick(e, dt, tgt, dist){
  if(e.packTimer > 0){ e.packTimer -= dt; if(e.packTimer <= 0) e.packSet = null; }
  if(e.cineT > 0){
    e.cineT -= dt;
    if(e.type==="golem_cuerpos" && e.cine==="intro"){
      // 1) el Hechicero habla  2) los cuerpos lo cubren  3) golem
      if(e.cineT < 1500 && e.packSet!=="tf"){ _hPack(e, "tf", 1450); vfxShake(10); vfxBurst(e.x, e.y-60, 30, "flesh", 200, 700, 4, 2, -60, 0); playSfx("bossRoar"); }
      else if(e.cineT >= 1500) _hPack(e, "pre", 400);
      if(e.cineT <= 0){ e.cine = null; e.packSet = null; bossEntrance(e); showBanner("FORMA 2 DE 3 — EL GOLEM DE CUERPOS"); }
    } else if(e.type==="hechicero_supremo" && e.cine==="reveal"){
      _hPack(e, "cast", 400);
      if(e.cineT <= 0){ e.cine = null; bossHudShow(e); }
    }
    return true;
  }
  if(e.type==="hechicero_supremo"){
    // si lo acorralan, se teletransporta (con aviso breve)
    e.blinkCd = (e.blinkCd||2500) - dt;
    if(e.blinkCd <= 0 && dist < 130 && !e.bossWind){
      e.blinkCd = 6500;
      const ox = e.x, oy = e.y, a = Math.atan2(e.y-tgt.y, e.x-tgt.x) + (Math.random()-0.5)*1.2;
      vfxSprite("hsOrbBurst", 0, ox, oy-30, 110, 420, null, 0.2, false, 0.5);
      e.x = tgt.x + Math.cos(a)*320; e.y = tgt.y + Math.sin(a)*320; clampToArena(e);
      vfxSprite("hsOrbBurst", 0, e.x, e.y-30, 110, 420, null, 0.2, false, 0.5);
      vfxShock(e.x, e.y, 10, 90, "255,225,140", 360, 1);
    }
  }
  return false;
}

/* ---------------- aparición: subjefe del nivel 9 ---------------- */
function hechSpawnSubboss(){
  const h = spawnEnemy("hechicero_supremo", false, false);
  const a = Math.random()*Math.PI*2;
  h.x = player.x + Math.cos(a)*340; h.y = player.y + Math.sin(a)*340; clampToArena(h);
  h.cine = "reveal"; h.cineT = 1800;
  activeChampion = h;
  vfxShock(h.x, h.y, 20, 220, "255,225,140", 800, 2); flashScreen(0.35, "255,235,180");
  arenaTitleCard("SUBJEFE", "EL HECHICERO SUPREMO", "El que te guió hasta acá. Nunca estuvo de tu lado.", 4400);
  _hSay(h, "«Te guié hasta acá. Ahora dame lo que despertó en vos.»");
  if(typeof tutSay==="function") tutSay("hech_betrayal", "¿Creíste que te guiaba para salvarte? Te guiaba hasta mí.", "Derrotá al Hechicero Supremo", 9000, true);
  return h;
}
// Al "morir": no muere. Se arrodilla, se ríe y desaparece. true = killEnemy no hace la muerte normal.
function hechOnDefeat(e){
  if(e.type!=="hechicero_supremo") return false;
  vfxSprite("hsOrbBurst", 0, e.x, e.y-30, 160, 700, null, 0.25, false, 0.5);
  vfxShock(e.x, e.y, 20, 260, "255,225,140", 900, 2); flashScreen(0.4, "255,235,180"); vfxShake(8);
  vfxBurst(e.x, e.y-40, 26, "holy", 180, 700, 4, 2, -60, 0);
  floatText(e.x, e.y - e.radius*2.6, "«Todavía no… nos vemos al final del camino.»", "crit");
  showBanner("EL HECHICERO HUYE… TE ESPERA EN EL CORAZÓN DEL INFIERNO");
  if(hudBoss===e && typeof bossHudHide==="function") bossHudHide();
  return true;
}

/* ---------------- jefe final: 3 formas ---------------- */
function hechStartFinalBoss(){
  const g = spawnEnemy("golem_cuerpos", true);
  scaleBossStats(g, "golem_cuerpos");
  g.regenUsed = true; g.regenTimer = 0; g.bd = null; g.bossPhase = 2;
  const a = Math.random()*Math.PI*2, d = Math.min(VW, VH)/2/CAM_ZOOM*0.55;
  g.x = player.x + Math.cos(a)*d; g.y = player.y + Math.sin(a)*d; clampToArena(g);
  g.cine = "intro"; g.cineT = 3000;
  // la horda que queda se retira: el escenario es de él
  for(const o of enemies){ if(o.alive && o!==g && o.rank!=="subjefe"){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  enemies = enemies.filter(o=>o.alive);
  if(typeof setMusicMode==="function") setMusicMode("boss");
  arenaTitleCard("JEFE FINAL", "EL HECHICERO SUPREMO", "Forma 1 de 3. Ya no se esconde detrás de la luz.", 3000);
  floatText(g.x, g.y - 140, "«Todos los que cayeron en el camino… ahora son míos.»", "crit");
  return g;
}
// El Golem se rompe: de sus restos nace el Demonio Mayor (forma 3). true = sigue la pelea.
function hechGolemBroken(){
  if(!boss || boss.type!=="golem_cuerpos") return false;
  const px = boss.x, py = boss.y;
  vfxSprite("gcNova", 0, px, py+20, 300, 900, null, 0.3, false, 0.6);
  vfxBurst(px, py-60, 40, "flesh", 240, 900, 5, 3, -60, 0);
  vfxShock(px, py, 30, 320, "255,110,40", 1000, 2); flashScreen(0.45, "255,120,60"); vfxShake(14);
  boss = spawnEnemy("demonio_mayor", true);
  boss.x = px; boss.y = py;
  scaleBossStats(boss, "demonio_mayor");
  boss.hp = boss.maxHp = Math.round(boss.maxHp*0.75); // la pelea ya viene larga: la forma final no es un segundo jefe entero
  boss.name = "Demonio Mayor — Forma Final";
  boss.regenUsed = false; boss.regenTimer = 0; boss.bd = null; boss.bossPhase = 3;
  bossHudShow(boss);
  animTrigger(boss, "bossPhaseTransition", 1300);
  bossPhaseFeedback();
  showBanner("FORMA 3 DE 3 — ¡DE LOS RESTOS NACE EL DEMONIO MAYOR!");
  return true;
}
