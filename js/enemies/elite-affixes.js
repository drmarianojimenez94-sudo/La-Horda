"use strict";
/* ============================================================
   js/enemies/elite-affixes.js
   ÉLITES CON NOMBRE (modificadores al estilo Diablo II): algunos enemigos de rango ÉLITE nacen
   "campeones" con un nombre propio ("Grukk el Hambriento", en dorado) y 1-3 modificadores que se
   leen de un vistazo y cambian cómo se los pelea. Sueltan mejor botín (ground-loot.js: rango "named").
   No duplica los ROLES (enemy-roles.js): los roles son conductas de la horda común/sub-élite (sanador,
   invocador...); estos son modificadores de la élite misma. Todo corre en el anfitrión; el nombre y
   los modificadores viajan en el propio enemigo (snapshot), así el invitado los ve igual.
     RÁPIDO             corre y ataca más seguido
     ENCANTADO DE FUEGO sus golpes queman y al morir estalla (con aviso en el piso)
     AURA DE ESCARCHA   ralentiza a los guardianes que tiene cerca (anillo celeste)
     VAMPÍRICO          se cura con el daño que hace
     BLINDADO           recibe menos daño
     ESPEJO             al bajar de la mitad de vida se desdobla en un reflejo más débil
     EXTRA FUERTE       pega más fuerte
   >>> Balance: ELITE_MODS, ELITE_NAMED_CHANCE.
   ============================================================ */
const ELITE_MODS = {
  rapido:     {name:"Rápido",             rgb:"255,236,140", speed:1.45, atk:0.7},
  fuego:      {name:"Encantado de Fuego", rgb:"255,120,40",  burnPct:0.10, burnMs:2400, deathR:95, deathPct:1.1, deathWarn:750},
  escarcha:   {name:"Aura de Escarcha",   rgb:"150,220,255", r:165, slow:0.32},
  vampirico:  {name:"Vampírico",          rgb:"220,40,60",   leech:0.35},
  blindado:   {name:"Blindado",           rgb:"190,200,215", dr:0.4},
  espejo:     {name:"Espejo",             rgb:"200,170,255", at:0.5, copyHp:0.35},
  extrafuerte:{name:"Extra Fuerte",       rgb:"255,90,60",   dmg:1.35}
};
const ELITE_MOD_IDS = Object.keys(ELITE_MODS);
// Probabilidad de que una élite nazca con nombre, según el nivel de la partida (y la ronda, en la Horda Infinita).
function eliteNamedChance(){
  let c = Math.min(0.4, 0.12 + 0.025*(runLevel||1));
  if(typeof endlessOn==="function" && endlessOn()) c = Math.min(0.75, c + 0.02*(EN.round||1));
  return c;
}
function eliteModCount(){
  const lv = (typeof endlessOn==="function" && endlessOn()) ? Math.floor((EN.round||1)/2) : (runLevel||1);
  return 1 + (lv >= 5 ? 1 : 0) + (lv >= 9 && Math.random() < 0.4 ? 1 : 0);
}
const ELITE_NAME_A = ["Gru","Mor","Vra","Ske","Ul","Zag","Kor","Bel","Thra","Ish","No","Dre","Gha","Ra","Sku","Ve","Ob","Hal"];
const ELITE_NAME_B = ["kk","gul","zar","ith","gok","mash","dra","vex","gor","nak","ruk","esh","lith","bran","gash","thul"];
const ELITE_EPITHETS = ["Hambrient{o}","Carroñer{o}","Maldit{o}","Implacable","Sin Ojos","Insaciable","Sangrient{o}","Silencios{o}","Terrible","Desollador{a}","Cieg{o}","Paciente","Viej{o}","de las Mil Cicatrices"];
// Criaturas que se nombran en femenino ("Vexa la Hambrienta").
const ELITE_FEM_WORDS = {Dama:1, Esfinge:1, Sirena:1, Medusa:1, Druida:1, Hada:1, Bruja:1, Araña:1, Anguila:1};
function eliteMakeName(e){
  const base = (e.name || (ENEMY_BASE[e.type]||{}).name || "").split(" ")[0];
  const fem = !!ELITE_FEM_WORDS[base];
  const pick = a=>a[(Math.random()*a.length)|0];
  let n = pick(ELITE_NAME_A) + pick(ELITE_NAME_B);
  if(fem) n += "a";
  const ep = pick(ELITE_EPITHETS);
  const epi = ep.startsWith("de ") ? ep : ep.replace("{o}", fem ? "a" : "o").replace("{a}", fem ? "a" : "");
  return ep.startsWith("de ") ? `${n}, ${epi}` : `${n} ${fem ? "la" : "el"} ${epi}`;
}
// Al aparecer (spawning.js → spawnEnemy): ¿esta élite nace con nombre?
function eliteMaybeName(e, force){
  if(!e || e.rank!=="elite" || e.eliteName || e._eliteMirror || e.encStatic || e.summonedByRole) return false;
  if(typeof divinaMode!=="undefined" && divinaMode) return false;
  if(!force && (typeof bossActive!=="undefined" && bossActive)) return false; // las élites que invoca un jefe no se farmean
  if(!force && Math.random() >= eliteNamedChance()) return false;
  const ids = ELITE_MOD_IDS.slice(), mods = [];
  const want = Array.isArray(force) ? force : null;
  if(want) for(const m of want){ if(ELITE_MODS[m] && mods.indexOf(m) < 0) mods.push(m); }
  else { const n = eliteModCount(); while(mods.length < n && ids.length) mods.push(ids.splice((Math.random()*ids.length)|0, 1)[0]); }
  applyEliteMods(e, mods);
  return true;
}
function applyEliteMods(e, mods){
  e.eliteName = eliteMakeName(e);
  e.eliteMods = mods.slice();
  // un campeón: más vida, más recompensa (el botín va aparte, ground-loot.js)
  e.hp = e.maxHp = Math.round(e.maxHp * 1.6);
  e.xp = Math.round((e.xp||1) * 2.5); e.gold = Math.round((e.gold||1) * 2.5);
  e.scale = (e.scale||3) * 1.08; e.radius = (e.radius||20) * 1.05;
  if(mods.indexOf("rapido") >= 0) e.speed *= ELITE_MODS.rapido.speed;
  if(mods.indexOf("extrafuerte") >= 0) e.dmg = Math.round(e.dmg * ELITE_MODS.extrafuerte.dmg);
  if(mods.indexOf("blindado") >= 0) e._eliteArmor = 1 - ELITE_MODS.blindado.dr;
}
function eliteHas(e, m){ return !!(e && e.eliteMods && e.eliteMods.indexOf(m) >= 0); }
// Multiplicador de daño recibido (combat.js → damageEnemy).
function eliteDmgTakenMult(e){ return e._eliteArmor || 1; }
// Cada cuadro, en la simulación (update.js): aura, ataques más seguidos, espejo.
function eliteTick(e, dt){
  if(eliteHas(e, "rapido") && e.atkCd > 0) e.atkCd -= dt*(1/ELITE_MODS.rapido.atk - 1); // los golpes llegan ~30% más seguido
  if(eliteHas(e, "escarcha")){
    const C = ELITE_MODS.escarcha;
    for(const h of heroes){
      if(!h.alive || Math.hypot(h.x-e.x, h.y-e.y) > C.r) continue;
      h.slowAmt = Math.max(h.slowAmt||0, C.slow); h.slowTimer = Math.max(h.slowTimer||0, 250);
    }
  }
  if(eliteHas(e, "espejo") && !e._mirrored && e.hp < e.maxHp*ELITE_MODS.espejo.at) eliteMirror(e);
  if(!e._eliteSeen && typeof inView==="function" && inView(e.x, e.y, -30)){
    e._eliteSeen = true;
    // (antes además salía "★ nombre" flotando: repetía la placa y era un texto grande más en el centro)
    if(typeof playSfx==="function") playSfx("threat");
    if(typeof tutSay==="function") tutSay("elite_named", "ÉLITE CON NOMBRE (en dorado): tiene modificadores, pega distinto y suelta mejor botín. Leé qué es antes de meterte.", null, 6500);
  }
}
function eliteMirror(e){
  e._mirrored = true;
  if(typeof spawnEnemy!=="function") return;
  const c = spawnEnemy(e.type, false, false);
  if(!c) return;
  c._eliteMirror = true; c.noLoot = true; c.xp = 0; c.gold = 0; c.dropsItem = false;
  c.hp = c.maxHp = Math.max(1, Math.round(e.maxHp * ELITE_MODS.espejo.copyHp));
  c.dmg = Math.round(e.dmg * 0.6); c.scale = e.scale*0.92; c.radius = e.radius; c.speed = e.speed;
  c.x = e.x + 40; c.y = e.y + 10; clampToArena(c);
  if(typeof vfxShock==="function") vfxShock(e.x, e.y, 10, 90, ELITE_MODS.espejo.rgb, 520, 2);
  floatText(e.x, e.y - 60, "¡se desdobla!", "crit");
}
// Un golpe de una élite a un guardián (combat.js → damageHero, con el daño ya aplicado).
function eliteOnHitHero(e, h, dmg){
  if(!e || !h || !(dmg > 0)) return;
  if(eliteHas(e, "vampirico") && e.alive){ e.hp = Math.min(e.maxHp, e.hp + dmg*ELITE_MODS.vampirico.leech); }
  if(eliteHas(e, "fuego")){ const C = ELITE_MODS.fuego; h.burnTimer = Math.max(h.burnTimer||0, C.burnMs); h.burnDmg = Math.max(h.burnDmg||0, e.dmg*C.burnPct); }
}
// Al morir (combat.js → killEnemy): el Encantado de Fuego estalla con aviso.
function eliteOnDeath(e){
  if(!eliteHas(e, "fuego")) return;
  const C = ELITE_MODS.fuego, x = e.x, y = e.y, dmg = e.dmg*C.deathPct;
  if(typeof vfxTelegraph==="function") vfxTelegraph({x, y, r:C.deathR, dur:C.deathWarn, rgb:C.rgb, shape:0});
  runLater(C.deathWarn, ()=>{
    if(typeof vfxShock==="function") vfxShock(x, y, 14, C.deathR, C.rgb, 520, 2);
    for(const h of heroes){ if(h.alive && Math.hypot(h.x-x, h.y-y) < C.deathR) damageHero(h, dmg, null); }
  });
}
// Dibujo: anillo dorado en el piso, aura del modificador y el nombre dorado con sus modificadores.
function drawEliteMarks(e){
  if(!e.eliteName) return;
  const R = e.radius||20, t = (typeof animNow!=="undefined" ? animNow : performance.now());
  const pulse = 0.6 + 0.4*Math.sin(t/220 + e.x*0.01);
  ctx.save();
  if(eliteHas(e, "escarcha")){
    ctx.strokeStyle = `rgba(150,220,255,${0.18 + 0.14*pulse})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, ELITE_MODS.escarcha.r, ELITE_MODS.escarcha.r*0.62, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.strokeStyle = `rgba(255,205,80,${0.55 + 0.35*pulse})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, R*1.35, R*0.55, 0, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = "rgba(90,50,0,0.8)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, R*1.35 + 2, R*0.55 + 2, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}
// Nombre dorado y modificadores, en píxeles de PANTALLA (legibles con el zoom del teléfono).
// Jerarquía de textos (js/ui/hud-text.js): placa solo para las ELITE_PLATES_MAX élites más cercanas, sin
// pisarse entre ellas ni al HUD (vida, aliados, barra del jefe, avisos) ni a los carteles de arriba. Si no
// entra, sube un renglón; si tampoco, queda solo el anillo dorado del piso hasta que haya lugar.
const ELITE_PLATES_MAX = 2;
function hudEliteNamesShown(){
  if(!player) return [];
  const list = [];
  for(const e of enemies){ if(e.alive && e.eliteName && (typeof inView!=="function" || inView(e.x, e.y, 0))) list.push(e); }
  list.sort((a,b)=>Math.hypot(a.x-player.x, a.y-player.y) - Math.hypot(b.x-player.x, b.y-player.y));
  return list.slice(0, ELITE_PLATES_MAX);
}
function eliteDrawScreenNames(){
  if(typeof ctx==="undefined" || typeof worldToScreen!=="function" || !player) return;
  const list = hudEliteNamesShown(); if(!list.length) return;
  for(const e of enemies) if(e._plateAt) e._plateAt = null;
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const taken = [];
  // los textos flotantes de palabras también ocupan lugar (el número de daño no: es chico y se va rápido)
  if(typeof floatTexts!=="undefined") for(const f of floatTexts){
    if(!f.on || f.kind!==4) continue;
    const p = worldToScreen(f.x, f.y), hw = String(f.text).length*5 + 6;
    taken.push({l:p.x - hw, r:p.x + hw, t:p.y - 48, b:p.y - 12});
  }
  for(const e of list){
    const R = e.radius||20, s = worldToScreen(e.x, e.y - R*2.3 - (e.role ? 34 : 14));
    const x = Math.round(s.x);
    ctx.font = "18px 'VT323', monospace";
    const w = Math.ceil(ctx.measureText(e.eliteName).width) + 10;
    ctx.font = "14px 'VT323', monospace";
    const mods = (e.eliteMods||[]).map(m=>ELITE_MODS[m] ? ELITE_MODS[m].name : m).join(" · ");
    const w2 = Math.ceil(ctx.measureText(mods).width) + 8, W = Math.max(w, w2);
    let y = Math.round(s.y) - 14, ok = false;
    for(let k=0;k<3 && !ok;k++){
      ok = typeof hudTextFreeRect!=="function" || hudTextFreeRect(x, y + 5, W, 34, taken);
      if(!ok) y -= 20;
    }
    if(!ok) continue;
    taken.push({l:x - W/2, r:x + W/2, t:y - 12, b:y + 25});
    e._plateAt = {x, y};
    ctx.font = "18px 'VT323', monospace";
    ctx.fillStyle = "rgba(10,6,4,0.8)"; ctx.fillRect(x - Math.round(w/2), y - 9, w, 18);
    ctx.fillStyle = "#000"; ctx.fillText(e.eliteName, x + 1, y + 2);
    ctx.fillStyle = "#ffcf40"; ctx.fillText(e.eliteName, x, y + 1);
    ctx.font = "14px 'VT323', monospace";
    ctx.fillStyle = "rgba(10,6,4,0.72)"; ctx.fillRect(x - Math.round(w2/2), y + 9, w2, 14);
    ctx.fillStyle = "#e8d6a8"; ctx.fillText(mods, x, y + 16);
  }
  ctx.restore();
}
