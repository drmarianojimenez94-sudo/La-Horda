"use strict";
/* ============================================================
   js/systems/breakables.js
   DESTRUCCIÓN DEL ENTORNO: objetos del escenario que estallan CONTRA LA HORDA (nunca dañan a
   los héroes: sin fuego amigo) y arman combos con las reacciones:
     Infernal   URNA DE BRASAS      quema                 (fuego)
     Gélida     CRISTAL DE ESCARCHA congela 1,2 s          (hielo -> QUIEBRE con un golpe pesado)
     Acuática   ÁNFORA DE AGUA      moja 4 s              (mojado -> CONDUCCIÓN con un rayo)
     Ruinas     VAINA DE ESPINAS    sangra + ralentiza     (sangrado -> HEMORRAGIA con un golpe pesado)
     Laberinto  JARRÓN FUNERARIO    aturde (arena) y a veces suelta una poción
     Fortaleza  BARRIL DE PÓLVORA   gran estallido que empuja
     Micelial   VAINA DE ESPORAS    ralentiza y daña de a poco
   Se activan: PATEÁNDOLOS (un héroe pasa encima), con un golpe a un enemigo pegado a ellos o
   con la etiqueta ambiental justa (fuego prende la urna/el barril, hielo el cristal, rayo el
   ánfora). Siempre avisan 0,7 s (anillo que se cierra) antes de estallar: se usan a propósito,
   atrayendo a la horda. 3-5 por nivel, nunca en la Divina. El anfitrión decide; el arreglo
   `breakables` viaja por red como cualquier colección.
   Arte: pixel procedural en el mismo estilo que los props de Arena Identity (arena-props.js).
   >>> Balance: BRK_CFG.
   ============================================================ */
const BRK_CFG = {
  perLevel:[3, 5], fuse:700, kickR:30, splashR:46, minFromHero:220,
  kinds:{
    infernal: {name:"Urna de brasas",      r:95,  dmgPct:1.2, fx:"burn",  rgb:"255,120,40",  env:"fire",      pal:"ember"},
    hielo:    {name:"Cristal de escarcha", r:95,  dmgPct:0.6, fx:"freeze",rgb:"170,225,255", env:"ice",       pal:"ice"},
    acuatica: {name:"Ánfora de agua",      r:115, dmgPct:0.4, fx:"wet",   rgb:"90,200,230",  env:"lightning", pal:"water"},
    bosque:   {name:"Vaina de espinas",    r:90,  dmgPct:0.8, fx:"bleed", rgb:"140,210,90",  env:"fire",      pal:"leaf"},
    laberinto:{name:"Jarrón funerario",    r:85,  dmgPct:0.8, fx:"stun",  rgb:"225,195,130", env:null,        pal:"rock"},
    fortaleza:{name:"Barril de pólvora",   r:120, dmgPct:2.0, fx:"knock", rgb:"255,170,90",  env:"fire",      pal:"ember"},
    micelial: {name:"Vaina de esporas",    r:100, dmgPct:0.5, fx:"spore", rgb:"200,120,255", env:"fire",      pal:"micSpore"}
  }
};
let breakables = [];
let _brkSeq = 1;

function resetBreakables(){ breakables = []; }
// Al empezar cada nivel: coloca un juego nuevo (lejos de los héroes, en lugares libres).
function spawnBreakables(){
  breakables = [];
  if(divinaMode || netIsGuest() || !BRK_CFG.kinds[currentArena] || !player) return;
  const n = BRK_CFG.perLevel[0] + ((Math.random()*(BRK_CFG.perLevel[1]-BRK_CFG.perLevel[0]+1))|0);
  for(let t=0; t<120 && breakables.length<n; t++){
    const a = Math.random()*Math.PI*2, d = 260 + Math.random()*520;
    const p = {x:player.x + Math.cos(a)*d*1.15, y:player.y + Math.sin(a)*d*0.8, radius:16};
    clampToArena(p); resolveWallCollision(p); clampToArena(p);
    if(typeof aidInside==="function" && !aidInside(p.x, p.y, 40)) continue;
    if(typeof aidBlocked==="function" && aidBlocked(p.x, p.y, 30)) continue;
    if(heroes.some(h=>h.alive && Math.hypot(h.x-p.x, h.y-p.y) < BRK_CFG.minFromHero)) continue;
    if(breakables.some(b=>Math.hypot(b.x-p.x, b.y-p.y) < 180)) continue;
    breakables.push({id:_brkSeq++, kind:currentArena, x:Math.round(p.x), y:Math.round(p.y), fuse:0, by:-1});
  }
}
function _brkArm(b, src){
  if(b.fuse > 0 || b.gone) return;
  b.fuse = BRK_CFG.fuse; b.by = src ? heroes.indexOf(src) : -1;
  const K = BRK_CFG.kinds[b.kind];
  vfxTelegraph({x:b.x, y:b.y, r:K.r, dur:BRK_CFG.fuse, rgb:K.rgb});
  if(inView(b.x, b.y, 0)) playSfx("threat");
}
function updateBreakables(dt){
  if(!breakables.length || netIsGuest()) return;
  for(const b of breakables){
    if(b.fuse > 0){ b.fuse -= dt; if(b.fuse <= 0) _brkExplode(b); continue; }
    for(const h of heroes){ if(h.alive && Math.hypot(h.x-b.x, h.y-b.y) < BRK_CFG.kickR + (h.radius||20)*0.5){ _brkArm(b, h); break; } }
  }
  breakables = breakables.filter(b=>!b.gone);
}
// Un golpe a un enemigo pegado a un objeto lo arma (lo llama damageEnemy).
function breakablesOnHit(e, src){
  if(!breakables.length || !src || !src.classKey) return;
  for(const b of breakables){ if(!(b.fuse > 0) && Math.abs(e.x-b.x) < BRK_CFG.splashR && Math.abs(e.y-b.y) < BRK_CFG.splashR && Math.hypot(e.x-b.x, e.y-b.y) < BRK_CFG.splashR) _brkArm(b, src); }
}
function _brkExplode(b){
  b.gone = true;
  const K = BRK_CFG.kinds[b.kind], src = heroes[b.by] || player;
  const base = (src.baseDmg||20) * runStats.dmgMult * K.dmgPct * (1 + (runLevel-1)*0.08);
  let hit = 0;
  for(const e of enemies){
    if(!e.alive || Math.hypot(e.x-b.x, e.y-b.y) > K.r + (e.radius||20)*0.4) continue;
    const big = e.rank==="jefe" || e.rank==="subjefe";
    hit++;
    const o = {src, fromProc:true, fromEnv:true, dmgKind: K.fx==="burn" ? "fire" : K.fx==="freeze" ? "ice" : K.fx==="bleed" ? "bleed" : "physical"};
    damageEnemy(e, base, o);
    if(!e.alive) continue;
    switch(K.fx){
      case "burn": e.burnTimer = Math.max(e.burnTimer||0, 3000); e.burnDmg = Math.max(e.burnDmg||0, base*0.3); e.burnSrc = src; break;
      case "freeze": if(!big){ e.frozenTimer = Math.max(e.frozenTimer||0, 1200); e.stunTimer = Math.max(e.stunTimer||0, 1200); e.frozenBy = src; } else { e.slowAmt = Math.max(e.slowAmt||0, 0.5); e.slowTimer = Math.max(e.slowTimer||0, 1500); } break;
      case "wet": e.wetTimer = Math.max(e.wetTimer||0, 4000); e.wetBy = src; break;
      case "bleed": e.bleedTimer = Math.max(e.bleedTimer||0, 3000); e.bleedDmg = Math.max(e.bleedDmg||0, base*0.3); e.bleedSrc = src; e.slowAmt = Math.max(e.slowAmt||0, 0.3); e.slowTimer = Math.max(e.slowTimer||0, 1500); break;
      case "stun": if(!big) e.stunTimer = Math.max(e.stunTimer||0, 900); break;
      case "knock": if(!big){ const dx = e.x-b.x, dy = e.y-b.y, d = Math.hypot(dx,dy)||1; e.x += dx/d*70; e.y += dy/d*70; e.stunTimer = Math.max(e.stunTimer||0, 400); } break;
      case "spore": e.poisonTimer = Math.max(e.poisonTimer||0, 3500); e.poisonDmg = Math.max(e.poisonDmg||0, base*0.3); e.slowAmt = Math.max(e.slowAmt||0, 0.35); e.slowTimer = Math.max(e.slowTimer||0, 2000); break;
    }
  }
  if(K.fx==="stun" && Math.random() < 0.3) dropPotion(b.x, b.y, "heal");
  if(src && src.stats){ src.stats.envCombos = (src.stats.envCombos||0) + (hit >= 3 ? 1 : 0); }
  vfxShock(b.x, b.y, 10, K.r, K.rgb, 420, 2);
  vfxBurst(b.x, b.y-12, 18, K.pal, 190, 520, 4, 1, -40, 0);
  if(typeof addDecal==="function") addDecal(b.x, b.y+3, K.fx==="wet" ? "#1c3440" : "#1a1210", "#0a0706", "pool", 1.2);
  if(inView(b.x, b.y, 0)){ vfxShake(K.fx==="knock" ? 6 : 3); playSfx(K.fx==="freeze" ? "shatter" : K.fx==="wet" ? "splat" : "boom"); }
  if(hit >= 3 && inView(b.x, b.y, 0)) floatText(b.x, b.y-50, `¡${hit} atrapados!`, "crit");
}
// Etiquetas ambientales: la justa lo arma al instante (el Muro de Fuego prende el barril...).
function _brkEnv(tag){
  return (x, y, src, o)=>{ for(const b of breakables){ const K = BRK_CFG.kinds[b.kind]; if(K && K.env===tag && !(b.fuse > 0) && Math.hypot(b.x-x, b.y-y) < (o.r||40) + 30){ _brkArm(b, src); b.fuse = 120; } } };
}
envOn("fire", "*", _brkEnv("fire")); envOn("ice", "*", _brkEnv("ice")); envOn("lightning", "*", _brkEnv("lightning"));

/* ---------------- arte (pixel procedural, cacheado) ---------------- */
function _brkArt(kind){
  switch(kind){
    case "infernal": return aidArt("brkUrn", 20, 24, (g)=>{ aidPx(g,5,2,10,3,"#3a2420"); aidPx(g,3,5,14,14,"#5a3226"); aidPx(g,4,6,4,11,"#7a4432"); aidPx(g,3,19,14,3,"#2a1814"); aidPx(g,6,9,8,2,"#ff7a2a"); aidPx(g,8,8,4,1,"#ffd27a"); aidPx(g,7,0,6,2,"#ff5a1a"); });
    case "hielo": return aidArt("brkCrystal", 20, 28, (g)=>{ aidPx(g,8,1,4,26,"#bfe8ff"); aidPx(g,4,8,4,18,"#8fd0ff"); aidPx(g,12,6,4,20,"#8fd0ff"); aidPx(g,9,3,2,20,"#ffffff"); aidPx(g,2,24,16,3,"#4a7aa0"); });
    case "acuatica": return aidArt("brkAmphora", 18, 26, (g)=>{ aidPx(g,6,0,6,3,"#8a5a3a"); aidPx(g,7,3,4,3,"#6a4028"); aidPx(g,3,6,12,14,"#a86a44"); aidPx(g,4,7,3,11,"#c88a5c"); aidPx(g,5,20,8,4,"#6a4028"); aidPx(g,4,11,10,2,"#2a8ab0"); aidPx(g,1,8,2,6,"#6a4028"); aidPx(g,15,8,2,6,"#6a4028"); });
    case "bosque": return aidArt("brkPod", 22, 22, (g)=>{ aidPx(g,5,6,12,12,"#3e6b2e"); aidPx(g,7,4,8,3,"#5a8a3a"); aidPx(g,6,8,3,8,"#7ac44a"); aidPx(g,3,10,2,2,"#d8e8a0"); aidPx(g,17,9,2,2,"#d8e8a0"); aidPx(g,10,2,2,3,"#d8e8a0"); aidPx(g,4,18,14,3,"#23401a"); });
    case "laberinto": return aidArt("brkJar", 20, 26, (g)=>{ aidPx(g,6,0,8,3,"#b89868"); aidPx(g,4,3,12,18,"#d8b884"); aidPx(g,5,4,3,15,"#f0d8a8"); aidPx(g,4,10,12,2,"#7a5a3a"); aidPx(g,8,14,4,2,"#7a5a3a"); aidPx(g,5,21,10,3,"#8a6a44"); });
    case "fortaleza": return aidArt("brkBarrel", 22, 26, (g)=>{ aidPx(g,4,2,14,22,"#6a4424"); aidPx(g,5,3,4,20,"#8a5c34"); aidPx(g,3,5,16,2,"#3a3a3a"); aidPx(g,3,18,16,2,"#3a3a3a"); aidPx(g,9,10,4,4,"#1a1210"); aidPx(g,10,11,2,2,"#ffcf5c"); aidPx(g,10,0,2,3,"#bdb4a8"); });
    case "micelial": return aidArt("brkSporePod", 22, 24, (g)=>{ aidPx(g,4,6,14,14,"#5a2a6a"); aidPx(g,6,4,10,3,"#7a3a8a"); aidPx(g,6,8,4,9,"#b060d0"); aidPx(g,13,10,3,3,"#e0a0ff"); aidPx(g,8,14,2,2,"#e0a0ff"); aidPx(g,3,20,16,3,"#2a1430"); });
  }
  return null;
}
function drawBreakable(b, now){
  const img = _brkArt(b.kind); if(!img) return;
  const K = BRK_CFG.kinds[b.kind], s = 2.4;
  const shake = b.fuse > 0 ? Math.sin(now*60)*2*(1 - b.fuse/BRK_CFG.fuse) : 0;
  ctx.save();
  ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(b.x, b.y+2, 16, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, b.x - img.width*s/2 + shake, b.y - img.height*s + 3, img.width*s, img.height*s);
  // brillo suave del color del efecto: se lee de lejos como "esto hace algo"
  const pulse = b.fuse > 0 ? 0.9 : 0.25 + 0.15*Math.sin(now*3 + b.id);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = pulse*0.5;
  ctx.drawImage(glowSprite(K.rgb), b.x - 22, b.y - img.height*s*0.55 - 22, 44, 44);
  ctx.restore();
}
