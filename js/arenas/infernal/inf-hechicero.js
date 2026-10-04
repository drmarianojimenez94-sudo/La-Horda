"use strict";
/* ============================================================
   js/arenas/infernal/inf-hechicero.js
   EL HECHICERO SUPREMO — el guía que te trae hasta acá, y el final de la campaña.
   - Es la voz del tutorial (tutorial.js) y la figura angelical de la pantalla previa a cada
     partida (run-intro.js). En la Arena Infernal se revela:
   - Nivel 9, SUBJEFE: "Hechicero Supremo". Orbe Sagrado, Pilares Celestiales, Juicio Divino y
     Meteoros Sagrados (el arte de su hoja). Si lo acorralan, se teletransporta. Al caer NO muere:
     se arrodilla, se ríe y desaparece ("nos vemos al final del camino").
   - Nivel 10, JEFE FINAL en 3 formas (lore: LA_HORDA_LORE.md):
       1) ÁNGEL CORROMPIDO: te arranca los tres cristales de los Guardianes (crystals.js), le
          nacen alas corruptas y pelea con TODOS los poderes: Niebla del Olvido (Guardián Ancestral), Nova de
          Escarcha, Laberinto de Piedra, los suyos de luz y el Juicio de los Cuatro;
       2) GOLEM DE CUERPOS: los caídos de todas las arenas cosidos a su alrededor;
       3) al romperse el Golem, de sus restos nace el DEMONIO MAYOR — Forma Final, que repite lo
          peor de todas las formas (diseño "demonio_final").
   Todo lo pesado corre en el anfitrión; lo que se ve (vfxSprite, carteles, avisos) se repite en
   los invitados por la red como el resto de los efectos.
   ============================================================ */
const HECH_DIR = "assets/sprites/bosses/infernal/hechicero/";

/* ---------------- datos ---------------- */
ENEMY_BASE.hechicero_supremo = {name:"Hechicero Supremo", rank:"subjefe", hp:1500, dmg:24, speed:60, radius:40, xp:90, gold:36,
  scale:5.6, color:"#e8c27a", ranged:true, range:330, projSpeed:300, dropsItem:true, visualAlias:"mago_hielo_cristal"};
ENEMY_BASE.golem_cuerpos = {name:"Golem de Cuerpos", rank:"jefe", hp:2200, dmg:32, speed:38, radius:78, xp:0, gold:0,
  scale:9.5, color:"#8a2a2a", ranged:false, dropsItem:true, visualAlias:"demonio_mayor"};
ENEMY_BASE.angel_corrompido = {name:"Ángel Corrompido", rank:"jefe", hp:2000, dmg:30, speed:58, radius:46, xp:0, gold:0,
  scale:6.4, color:"#8a1a2a", ranged:true, range:340, projSpeed:300, dropsItem:false, visualAlias:"mago_hielo_cristal"};
ENEMY_PROJ_COLOR.hechicero_supremo = "#ffe2a0";
ENEMY_PROJ_COLOR.angel_corrompido = "#ff6a6a";
// vida de las 3 formas: la pelea completa dura como ~2,2 jefes normales (no 3)
DIFF.bossHpType.angel_corrompido = 0.7;
DIFF.bossHpType.golem_cuerpos = 0.6;
ANIM_PROFILES.hechicero_supremo = {speed:0.9, weight:1.4, amp:0.5, lunge:6, cast:1.6, impact:1.4, material:"holy", particle:"holy", death:"collapse"};
ANIM_PROFILES.golem_cuerpos = {speed:0.6, weight:2.4, amp:0.8, lunge:16, cast:1.2, impact:2.4, material:"flesh", particle:"flesh", death:"collapse"};
ANIM_PROFILES.angel_corrompido = {speed:0.9, weight:1.6, amp:0.5, lunge:8, cast:1.8, impact:1.6, material:"holy", particle:"ember", death:"collapse"};
const HECH_TYPES = {hechicero_supremo:1, golem_cuerpos:1, angel_corrompido:1};

/* ---------------- arte ---------------- */
enemyAtlasPackLoad("hechicero_supremo", HECH_DIR+"atlas.png", {"w":102,"h":113,"cols":8,"refH":112,"anchor":0.9823,
  // caminar: las celdas 4-15 del atlas son los 12 cuadros de caminata de la hoja (tools/art/hechicero/
  // build.py), que no se usaban (caminaba con el idle). Mezclan vistas: 4-6 de frente, 8/10/11 de perfil
  // mirando a la derecha; se toman por vista para que no gire sobre sí mismo al caminar.
  "sets":{"idle":[0,1,2,3],"walk":[8,10,11,10],"walk_down":[4,5,6,5],"cast":[16,17,18,19,20,21,22,23],"atk":[24,25,26,27],"hit":[28,29,30,31,32],"death":[33,34,35,36,37,38],"kneel":[36]}});
ENEMY_ATLAS_PACK.hechicero_supremo.hMul = 4.2; // más grande que un héroe: se lee como subjefe
// Gólem de Cuerpos: hoja propia de 32 cuadros (tools/art/pixrig/golem_cuerpos.py, ficha P0-12; antes era 1 cuadro por
// estado y se le prestaba el cuerpo del Gólem de Cristal). "pre" = el montón de cuerpos, "tf" = se levanta y toma forma.
if(typeof PIXRIG_ATLAS!=="undefined" && PIXRIG_ATLAS.golem_cuerpos){
  const A = PIXRIG_ATLAS.golem_cuerpos;
  enemyAtlasPackLoad("golem_cuerpos", A.src, A.meta);
}
// Ángel Corrompido: cuerpo propio (tools/art/pixrig/angel_corrompido.py, ficha F-02): túnica blanca manchada de
// carmesí, alas rotas de plumas rojas y negras, halo agrietado. "cast0" es el mismo lanzamiento sin alas (la
// cinemática de ascenso las hace nacer). Los cuatro cristales siguen dibujándose aparte (hechDrawAngelFront).
if(typeof PIXRIG_ATLAS!=="undefined" && PIXRIG_ATLAS.angel_corrompido){
  const A = PIXRIG_ATLAS.angel_corrompido;
  enemyAtlasPackLoad("angel_corrompido", A.src, A.meta);
}
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
ARENA_BOSS_TIPS.angel_corrompido = {epithet:"Forma 1 de 3 — con el poder de los Cuatro", tips:[
  "Usa los poderes de los Guardianes: NIEBLA (salí de la nube), ANILLOS DE HIELO (esperá el hueco), PILARES (salí por el hueco).",
  "JUICIO DE LOS CUATRO: cuatro golpes alrededor y al final el centro. Salí en diagonal.",
  "Si te acercás, se teletransporta: rodealo entre varios."]};
ARENA_BOSS_TIPS.hechicero_supremo = {epithet:"El que te guió hasta acá", tips:[
  "GRIETA CONJURADA: abre fisuras y se alimenta de ellas. CERRALAS (acción contextual): queda EXPUESTO.",
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
// GRIETA CONJURADA (inf-hech-rift.js): abre fisuras reales de la arena y se alimenta de ellas
BOSS_ATTACKS.hsRift = function(e, t, d){ if(typeof hechRiftOpen!=="function" || !hechRiftOpen(e, t)) return false; _hPack(e, "cast", 900); bossAnnounce(e, "Grieta Conjurada", "cerrala: sin grietas queda expuesto"); return true; };
BOSS_DESIGNS.hechicero_supremo = {
  epithet:"El que te guió hasta acá",
  tips:ARENA_BOSS_TIPS.hechicero_supremo.tips,
  phases:[
    {hp:1.00, gap:[1100,1600], rot:["hsRift","hsOrb","hsPillars","hsOrb","hsMeteors"]},
    {hp:0.50, gap:[850,1300], rot:["hsJudgment","hsRift","hsOrb","hsMeteors","hsPillars","hsOrb"], banner:"EL HECHICERO REVELA SU PODER"}
  ]
};

/* ---------------- ataques del Ángel Corrompido: los poderes de los Cuatro Guardianes ---------------- */
function _acEl(e, k){ e.acEl = k; e.acElT = runElapsedMs; } // reloj de la partida: viaja igual al invitado
function _acHitIn(x, y, r, dmg, o){ for(const h of heroes){ if(h.alive && Math.hypot(h.x-x, h.y-y) <= r + (h.radius||18)*0.5) bossHitHero(h, dmg, o); } }
Object.assign(BOSS_ATTACKS, {
  // NIEBLA DEL OLVIDO (Guardián Ancestral, 1er Guardián): nubes que quedan 4 s en el piso; adentro, daño y lentitud
  acEspora(e, t, d){
    _acEl(e, "ancestral");
    const pts = heroTargets().slice(0, 4).map(h=>({x:h.x, y:h.y}));
    for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2, r = 120+Math.random()*150; pts.push({x:t.x+Math.cos(a)*r, y:t.y+Math.sin(a)*r}); }
    const delay = 950, R = 88;
    skStrikes(e, pts, R, delay, 0.55, "root", {slow:0.3}, null);
    for(const p of pts){
      hechLater(delay - 150, ()=> vfxSprite("mic_m_cloud_a", 0, p.x, p.y + 30, 150, 4300, null, 0.06, false, 0.78));
      for(let k=0;k<8;k++) hechLater(delay + 250 + k*500, ()=> _acHitIn(p.x, p.y, R, e.dmg*0.12, {slow:0.35, slowDur:700}));
    }
    _hPack(e, "cast", 900);
    bossAnnounce(e, "Niebla del Olvido", "salí de la nube"); return true; },
  // NOVA DE ESCARCHA (Mago Gélido, 2º Guardián): tres anillos que se abren desde él, uno detrás del otro
  acEscarcha(e, t, d){
    _acEl(e, "escarcha");
    const ox = e.x, oy = e.y, rings = [[0,150,900],[150,300,1400],[300,460,1900]];
    for(const [a, b, ms] of rings){
      vfxTelegraph({shape:a ? 3 : 0, r:b, r2:a, x:ox, y:oy, follow:null, dur:ms, rgb:"160,220,255"});
      hechLater(ms, ()=>{
        for(const h of heroes){ if(!h.alive) continue; const dd = Math.hypot(h.x-ox, h.y-oy); if(dd >= a - (h.radius||18)*0.3 && dd <= b + (h.radius||18)*0.5) bossHitHero(h, e.dmg*0.8, {frost:2, slow:0.45, from:{x:ox, y:oy}}); }
        vfxShock(ox, oy, a, b, "170,230,255", 460, 2);
        for(let i=0;i<8;i++){ const an = i/8*Math.PI*2 + a*0.01, rr = (a + b)/2; vfxSprite("fxIceCrystal", 0, ox + Math.cos(an)*rr, oy + Math.sin(an)*rr*0.8 + 10, 70, 520, null, 0.2, false, 0.9); }
      });
    }
    vfxSprite("fxFrostRune", 0, ox, oy + 10, 150, 1900, null, 0.1, false, 0.55);
    _hPack(e, "cast", 1200);
    bossAnnounce(e, "Nova de Escarcha", "los anillos se abren: esperá el hueco"); return true; },
  // LABERINTO DE PIEDRA (Guardián del Laberinto): anillo de pilares con un hueco y una roca al centro
  acPiedra(e, t, d){
    _acEl(e, "piedra");
    const cx = t.x, cy = t.y, N = 10, RR = 150, gap = (Math.random()*N)|0, spots = [];
    for(let i=0;i<N;i++){ if(i===gap || i===(gap+1)%N) continue; const an = i/N*Math.PI*2; spots.push({x:cx + Math.cos(an)*RR, y:cy + Math.sin(an)*RR*0.8}); }
    for(const p of spots) vfxTelegraph({shape:0, r:24, x:p.x, y:p.y, follow:null, dur:650, rgb:"200,160,110"});
    hechLater(650, ()=>{
      for(const p of spots){
        if(iceWalls.length >= ICE_WALL_MAX) break;
        if(heroes.some(h=>h.alive && Math.hypot(h.x-p.x, h.y-p.y) < 22 + (h.radius||18) + 2)) continue; // nunca encima de un guardián
        const c = {x:p.x, y:p.y}; clampToArena(c);
        iceWalls.push({x:c.x, y:c.y, r:22, life:4600, maxLife:4600, st:1, flip:false, img:0});
        vfxBurst(c.x, c.y-10, 5, "rock", 90, 320, 3, 0, -40, 0);
      }
      vfxShake(6);
    });
    skStrikes(e, [{x:cx, y:cy}], 120, 2200, 1.3, "rock", {stun:500}, null);
    hechLater(2200, ()=> vfxSprite("fxSpike", 0, cx, cy + 10, 150, 600, null, 0.2, false, 0.9));
    _hPack(e, "cast", 900);
    bossAnnounce(e, "Laberinto de Piedra", "salí por el hueco antes de que caiga la roca"); return true; },
  // JUICIO DE LOS CUATRO: un golpe por Guardián alrededor del objetivo y al final el centro
  acCuatro(e, t, d){
    _acEl(e, "all");
    const cx = t.x, cy = t.y, D = e.dmg;
    const seq = [[-200, 0, 700, "holy", {slow:0.3}, "hsPillar"], [0, -170, 1100, "ice", {frost:2}, "fxIceCrystal"],
                 [200, 0, 1500, "rock", {stun:400}, "fxSpike"], [0, 170, 1900, "root", {slow:0.4}, "mic_spore_geyser"]];
    for(const [ox, oy, ms, kind, o, fx] of seq){
      bossStrike(cx+ox, cy+oy, 100, ms, D*0.9, kind, o);
      hechLater(ms - 100, ()=> vfxSprite(fx, 0, cx+ox, cy+oy + 10, 130, 650, null, 0.15, false, 0.92));
    }
    bossStrike(cx, cy, 135, 2600, D*1.5, "holy", {knock:70});
    hechLater(2600, ()=>{ vfxSprite("hsJudgRing", 0, cx, cy, 170, 700, null, 0.3, false, 0.5); flashScreen(0.25, "255,200,200"); vfxShake(9); });
    _hPack(e, "cast", 1400);
    bossAnnounce(e, "Juicio de los Cuatro", "cuatro golpes y el centro: salí en diagonal"); return true; }
});
BOSS_DESIGNS.angel_corrompido = {
  epithet:"Forma 1 de 3 — con el poder de los Cuatro",
  tips:ARENA_BOSS_TIPS.angel_corrompido.tips,
  phases:[
    {hp:1.00, gap:[1000,1500], rot:["hsOrb","acEspora","acEscarcha","hsPillars","acPiedra"]},
    {hp:0.50, gap:[800,1250], rot:["acCuatro","acEscarcha","hsMeteors","acEspora","acPiedra","hsJudgment"], banner:"¡LOS CUATRO CRISTALES ARDEN!"}
  ]
};
// Forma Final: el Demonio Mayor repite lo peor de todas las formas (sus golpes + Guardianes + Hechicero + Golem)
BOSS_DESIGNS.demonio_final = {
  epithet:"Forma 3 de 3 — la Horda entera en un cuerpo",
  tips:["Repite los ataques de TODAS las formas: leé el nombre de cada golpe arriba.", "ANILLO DE FUEGO y NOVA: lo seguro es pegarse.", "Debajo del 40% se regenera: guardá tus habilidades fuertes para ese momento."],
  phases:[
    {hp:1.00, gap:[1000,1450], rot:["demFlame","acEspora","demMeteors","gcHands","demWave"]},
    {hp:0.66, gap:[850,1250], rot:["demRing","acEscarcha","demSpiral","hsMeteors","acPiedra","demFlame"], banner:"¡EL INFIERNO SE ABRE!"},
    {hp:0.33, gap:[650,1050], rot:["demJudgment","acCuatro","demSpiral","gcStorm","demSummon","hsJudgment"], banner:"¡TODA LA HORDA EN UN SOLO CUERPO!"}
  ]
};

/* ---------------- dibujo del Ángel Corrompido: alas y cristales ---------------- */
function _hAngelH(e){ const P = ENEMY_ATLAS_PACK.angel_corrompido; return e.radius*(P ? P.hMul : 4.4)*0.95; }
function hechDrawAngelBack(e, pose){
  const q = e.cine==="ascend" && e.cineT > 0 ? Math.max(0, Math.min(1, (1100 - e.cineT)/900)) : 1;
  const H = _hAngelH(e), cx = e.x + (pose ? pose.ox : 0), cy = e.y + (pose ? pose.oy : 0) - H*0.6, t = animNow/1000;
  ctx.save();
  // aura de corrupción: oscurece el piso y da contraste a las alas
  ctx.globalAlpha = 0.55; ctx.drawImage(fxDarkSprite(), cx - H*0.9, cy - H*0.5, H*1.8, H*1.4);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35 + 0.1*Math.sin(t*3); ctx.drawImage(glowSprite("200,20,40"), cx - H*0.5, cy - H*0.4, H, H);
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  if(q > 0.01){
    const s = H/210*q;
    // brasas que caen de las alas (determinísticas: no cuestan memoria ni viajan por la red)
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "#ff6a3a";
    for(let i=0;i<14;i++){ const ph = (t*0.4 + i*0.071) % 1, side = i % 2 ? 1 : -1;
      ctx.globalAlpha = (1 - ph)*0.9*q; ctx.fillRect(cx + side*(50 + (i*37 % 120))*s, cy + (ph*170 - 40)*s, 2.5, 2.5); }
  }
  ctx.restore();
}
function hechDrawAngelFront(e){
  if(typeof crystalDrawGem!=="function") return;
  const H = _hAngelH(e), cx = e.x, cy = e.y - H*0.55, t = animNow/1000, keys = ["ancestral","escarcha","piedra","juicio"];
  const hot = e.acElT && runElapsedMs - e.acElT >= 0 && runElapsedMs - e.acElT < 1600 ? e.acEl : null;
  ctx.save();
  for(let i=0;i<4;i++){
    const k = keys[i], D = k==="juicio" ? CRYSTAL_JUICIO : CRYSTAL_DEFS[k], an = t*1.3 + i*Math.PI/2;
    const x = cx + Math.cos(an)*e.radius*1.7, y = cy + Math.sin(an)*e.radius*0.7, front = Math.sin(an) > 0;
    const lit = hot==="all" || hot===k, sz = (lit ? 13 : 9)*(front ? 1 : 0.8);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = lit ? 0.95 : 0.5; ctx.drawImage(glowSprite(D.rgb), x - sz*3, y - sz*3, sz*6, sz*6);
    ctx.globalCompositeOperation = "source-over";
    crystalDrawGem(ctx, x, y, sz, D, t*2 + i, front ? 1 : 0.7);
  }
  ctx.restore();
}

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
    } else if(e.type==="angel_corrompido" && e.cine==="ascend"){
      // 1) el Hechicero junta poder  2) te arranca los cristales  3) le nacen las alas corruptas
      _hPack(e, e._wings ? "cast" : "cast0", 400); // las alas nacen con el destello (cineT 1100)
      if(e.cineT <= 2900 && !e._stole){
        e._stole = true;
        if(typeof crystalSteal==="function") crystalSteal(player.x, player.y, e.x, e.y);
        if(typeof resonanceSteal==="function") resonanceSteal(); // la resonancia se apaga: se los llevó
        const line = crystalsOwned().length >= 3 ? "Los tres cristales. Gracias, guardián. Sin vos no habría podido tocarlos." : "Los que no me trajiste, se los arranqué yo a sus dueños. Ya no hacen falta manos limpias.";
        if(typeof storySay==="function") storySay({name:"EL HECHICERO SUPREMO", face:"hech"}, line, {wait:9000}); else _hSay(e, "«" + line + "»");
      }
      if(e.cineT <= 1100 && !e._wings){
        e._wings = true; vfxShake(12); playSfx("bossRoar"); flashScreen(0.4, "255,60,60");
        vfxShock(e.x, e.y - 60, 20, 300, "220,40,50", 900, 2); vfxBurst(e.x, e.y - 90, 34, "ember", 220, 900, 4, 2, -40, 0);
      }
      if(e.cineT <= 0){ e.cine = null; e.packSet = null; bossEntrance(e); showBanner("FORMA 1 DE 3 — EL ÁNGEL CORROMPIDO"); }
    } else if(e.type==="hechicero_supremo" && e.cine==="reveal"){
      _hPack(e, "cast", 400);
      if(e.cineT <= 0){ e.cine = null; bossHudShow(e); }
    }
    return true;
  }
  if(e.type==="hechicero_supremo" && typeof hechRiftRule==="function") hechRiftRule(e);
  if(e.type==="hechicero_supremo" || e.type==="angel_corrompido"){
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
  arenaTitleCard("SUBJEFE", "EL HECHICERO SUPREMO", "El Primero de los Cuatro. El que te guió hasta acá nunca estuvo de tu lado.", 4400);
  // (lo que dice va en el cuadro de voz: el cartel grande + el cuadro ya son los dos textos de este momento)
  if(typeof tutSay==="function") tutSay("hech_betrayal", "¿Creíste que te guiaba para salvarte? Yo fui el primero de los Cuatro Guardianes, su líder. Me quedé en esta dimensión por decisión propia. Te guiaba hasta mí.", "Derrotá al Hechicero Supremo", 9000, true);
  return h;
}
// Al "morir": no muere. Se arrodilla, se ríe y desaparece. true = killEnemy no hace la muerte normal.
function hechOnDefeat(e){
  if(e.type!=="hechicero_supremo") return false;
  vfxSprite("hsOrbBurst", 0, e.x, e.y-30, 160, 700, null, 0.25, false, 0.5);
  vfxShock(e.x, e.y, 20, 260, "255,225,140", 900, 2); flashScreen(0.4, "255,235,180"); vfxShake(8);
  vfxBurst(e.x, e.y-40, 26, "holy", 180, 700, 4, 2, -60, 0);
  // Lo que dice al huir y la voz del Forjador (prisionero: se negó a fundir los cristales) van en el cuadro
  // de voz, en ese orden (BOSS_VOICES.hechicero_supremo.death, js/data/story-text.js; killEnemy → storyOnKill).
  showBanner("EL HECHICERO HUYE… TE ESPERA EN EL CORAZÓN DEL INFIERNO");
  if(hudBoss===e && typeof bossHudHide==="function") bossHudHide();
  return true;
}

/* ---------------- jefe final: 3 formas ---------------- */
function hechStartFinalBoss(){
  const g = spawnEnemy("angel_corrompido", true);
  scaleBossStats(g, "angel_corrompido");
  g.regenUsed = true; g.regenTimer = 0; g.bd = null; g.bossPhase = 1;
  const a = Math.random()*Math.PI*2, d = Math.min(VW, VH)/2/CAM_ZOOM*0.55;
  g.x = player.x + Math.cos(a)*d; g.y = player.y + Math.sin(a)*d; clampToArena(g);
  g.cine = "ascend"; g.cineT = 3800;
  // la horda que queda se retira: el escenario es de él
  for(const o of enemies){ if(o.alive && o!==g && o.rank!=="subjefe"){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  enemies = enemies.filter(o=>o.alive);
  if(typeof setMusicMode==="function") setMusicMode("boss");
  arenaTitleCard("JEFE FINAL", "EL HECHICERO SUPREMO", "El Primero de los Cuatro. Forma 1 de 3: quiere fundir los cuatro cristales en uno.", 3400);
  if(typeof tutSay==="function") tutSay("hech_final", "Tres cristales de los Guardianes, y el mío. El Forjador se negó a fundirlos en uno solo: por eso está encadenado. No importa. Con los Cuatro fundidos, yo SOY la Horda. Gracias por traérmelos.", "Derrotá al Hechicero en sus 3 formas", 9000, true);
  return g;
}
// Las alas se quiebran: la Horda le da un cuerpo hecho de sus víctimas (forma 2). true = sigue la pelea.
function hechAngelFallen(){
  if(!boss || boss.type!=="angel_corrompido") return false;
  const px = boss.x, py = boss.y;
  vfxShock(px, py - 60, 20, 320, "220,40,50", 1000, 2); flashScreen(0.4, "255,80,80"); vfxShake(12);
  vfxBurst(px, py - 90, 40, "ember", 240, 900, 4, 3, -40, 0);
  const g = spawnEnemy("golem_cuerpos", true);
  scaleBossStats(g, "golem_cuerpos");
  g.regenUsed = true; g.regenTimer = 0; g.bd = null; g.bossPhase = 2;
  g.x = px; g.y = py; clampToArena(g);
  g.cine = "intro"; g.cineT = 2600;
  boss = g;
  showBanner("LAS ALAS SE QUIEBRAN… LA HORDA LE DA UN CUERPO"); // (lo que dice: BOSS_VOICES.angel_corrompido.death)
  return true;
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
  boss.hp = boss.maxHp = Math.round(boss.maxHp*0.65); // la pelea ya viene larga: la forma final no es un segundo jefe entero
  boss.name = "Rey de la Horda — Forma Final"; // canon: Hechicero Supremo → Rey/Demonio de la Horda (mismo cuerpo del Demonio Mayor)
  boss.designKey = "demonio_final"; // repite lo peor de todas las formas (BOSS_DESIGNS.demonio_final)
  boss.regenUsed = false; boss.regenTimer = 0; boss.bd = null; boss.bossPhase = 3;
  bossHudShow(boss);
  animTrigger(boss, "bossPhaseTransition", 1300);
  bossPhaseFeedback();
  showBanner("FORMA 3 DE 3 — ¡NACE EL REY DE LA HORDA!");
  return true;
}
