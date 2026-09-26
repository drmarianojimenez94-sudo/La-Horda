"use strict";
/* ============================================================
   js/enemies/enemy-roles.js
   ROLES ENEMIGOS: la horda no es solo una masa que corre. Algunos enemigos comunes o sub-élite
   nacen con un ROL (afijo) que cambia qué hacen y a quién hay que matar primero:
     SANADOR      cura a la horda cercana                        -> "ese tiene que morir YA"
     RESUCITADOR  levanta cadáveres enemigos (compite con el Nigromante)
     INVOCADOR    abre grietas de las que salen refuerzos
     PROTECTOR    protege a los cercanos (reciben 40% menos daño; se ve el lazo)
     CARCELERO    marca el suelo bajo un héroe: si no sale, queda enraizado
     CAZADOR      rápido; persigue al héroe más frágil (magos, soportes, el más herido)
     SUICIDA      corre, parpadea y explota: obliga a reposicionarse
     COMANDANTE   da daño y velocidad a la horda cercana; al morir, la horda se desmoraliza
     ARTILLERO    bombardea zonas con aviso: controla el espacio
   Lenguaje visual común (siempre el mismo, para leerlo en medio del caos): insignia en rombo
   sobre la cabeza con el ícono del rol + anillo del color del rol en el suelo. Suenan al
   aparecer en pantalla por primera vez en el nivel.
   Cada arena usa solo los roles que encajan con su identidad (ROLE_POOL_BY_ARENA). Topes: cuántos
   a la vez por nivel y por rol. Todo corre en el anfitrión.
   >>> Balance: ROLE_CFG, ROLE_CHANCE_BY_LEVEL, ROLE_POOL_BY_ARENA.
   ============================================================ */
const ROLE_CFG = {
  sanador:     {name:"Sanador",     ico:"✚", rgb:"90,230,120",  hp:1.6, every:2400, r:190, healPct:0.08, keepAway:250},
  resucitador: {name:"Resucitador", ico:"☠", rgb:"180,120,255", hp:1.7, every:4200, r:230, maxRaise:3, keepAway:260},
  invocador:   {name:"Invocador",   ico:"◎", rgb:"255,150,60",  hp:1.7, every:6500, maxAlive:6, keepAway:240},
  protector:   {name:"Protector",   ico:"⛨", rgb:"120,190,255", hp:2.0, r:170, dr:0.4},
  carcelero:   {name:"Carcelero",   ico:"⛓", rgb:"200,200,210", hp:1.6, every:5200, warn:900, r:62, root:1300, range:380},
  cazador:     {name:"Cazador",     ico:"⌖", rgb:"255,80,80",   hp:1.3, speed:1.4},
  suicida:     {name:"Suicida",     ico:"✸", rgb:"255,120,40",  hp:0.8, speed:1.35, trigger:70, fuse:900, r:95, dmgPct:0.2},
  comandante:  {name:"Comandante",  ico:"⚑", rgb:"255,210,80",  hp:2.2, r:230, dmgBuff:0.25, spdBuff:0.15},
  artillero:   {name:"Artillero",   ico:"✦", rgb:"255,110,90",  hp:1.5, every:5000, warn:1000, r:72, dmgPct:0.12, range:420, keepAway:300}
};
const ROLE_POOL_BY_ARENA = {
  bosque:   ["sanador","cazador","carcelero","suicida"],
  acuatica: ["cazador","invocador","protector","suicida"],
  fortaleza:["protector","comandante","artillero","carcelero"],
  micelial: ["resucitador","invocador","suicida","sanador"],
  hielo:    ["carcelero","protector","artillero","cazador"],
  laberinto:["resucitador","comandante","carcelero","cazador"],
  infernal: ["invocador","suicida","comandante","resucitador","artillero","sanador"]
};
const ROLE_CHANCE_BY_LEVEL = [0, 0, 0, 0.05, 0.06, 0.08, 0.09, 0.10, 0.11, 0.12, 0.12];
const ROLE_MAX_SAME = {suicida:3};
// Roles que se señalan con flecha en el borde de la pantalla cuando están fuera de cámara.
const ROLE_OFFSCREEN = {sanador:1, resucitador:1, invocador:1, comandante:1};
function roleMaxConcurrent(){ return Math.min(5, 1 + Math.floor((runLevel||1)/2.5)); }

// Al aparecer: tira si este enemigo nace con un rol.
function maybeAssignRole(e){
  if(divinaMode || !e || e.rank==="jefe" || e.rank==="subjefe" || e.rank==="elite" || e.summonedByRole) return;
  const pool = ROLE_POOL_BY_ARENA[currentArena]; if(!pool) return;
  const ch = ROLE_CHANCE_BY_LEVEL[Math.min(10, runLevel||1)] || 0;
  if(Math.random() >= ch) return;
  let n = 0; const per = {};
  for(const o of enemies){ if(o.alive && o.role){ n++; per[o.role] = (per[o.role]||0) + 1; } }
  if(n >= roleMaxConcurrent()) return;
  const opts = pool.filter(r=> (per[r]||0) < (ROLE_MAX_SAME[r]||2) && !(r==="ranged_only" && !e.ranged) && !(r==="artillero" && !e.ranged && Math.random()<0.5));
  if(!opts.length) return;
  applyRole(e, opts[(Math.random()*opts.length)|0]);
}
function applyRole(e, role){
  const C = ROLE_CFG[role]; if(!C) return;
  e.role = role; e.roleT = 800 + Math.random()*1200; e.roleUses = 0;
  e.hp = e.maxHp = Math.round(e.maxHp*C.hp);
  if(C.speed) e.speed *= C.speed;
  e.xp = Math.round((e.xp||1)*2.2); e.gold = Math.round((e.gold||1)*2);
  e.scale = (e.scale||3)*1.08; e.radius = (e.radius||20)*1.05;
}

// Objetivo del Cazador: el héroe más frágil (vida actual baja, magos/soportes primero).
function roleHunterTarget(e){
  let best = null, bs = -Infinity;
  for(const h of heroes){
    if(!h.alive || h.stealthTimer>0) continue;
    const d = Math.hypot(h.x-e.x, h.y-e.y);
    const r = (h.cls && h.cls.roleCategory) || "asesino";
    const s = (1 - h.hp/h.maxHp)*300 + (r==="mago"||r==="soporte" ? 220 : 0) - d*0.35;
    if(s > bs){ bs = s; best = h; }
  }
  return best;
}
// Daño recibido por un enemigo protegido (lo lee damageEnemy).
function roleDmgTakenMult(e){
  if(!e._protT || e._protT < runElapsedMs) return 1;
  return 1 - ROLE_CFG.protector.dr;
}
// Bonus de un comandante cercano (daño y velocidad), leído al pegar y al moverse.
function roleCommandBuff(e){ return e._cmdT && e._cmdT > runElapsedMs; }

// IA del rol. Devuelve true si ya actuó este cuadro (no hace el ataque/movimiento normal).
function updateEnemyRole(e, dt, tgt, dist){
  const C = ROLE_CFG[e.role]; if(!C) return false;
  e.roleT -= dt;
  const keepAway = ()=>{ // los de apoyo se mantienen a distancia (detrás de la horda)
    if(!C.keepAway || dist > C.keepAway) return false;
    const spd = e.speed*(1-(e.slowAmt||0))*0.9;
    aidEnemyStep(e, -(tgt.x-e.x), -(tgt.y-e.y), dist, spd, dt);
    return true;
  };
  switch(e.role){
    case "sanador":
      if(e.roleT <= 0){
        e.roleT = C.every;
        let n = 0;
        for(const o of enemies){ if(!o.alive || o===e || o.hp >= o.maxHp || Math.hypot(o.x-e.x, o.y-e.y) > C.r) continue; o.hp = Math.min(o.maxHp, o.hp + o.maxHp*C.healPct); n++; if(inView(o.x, o.y, 0)) vfxBurst(o.x, o.y-20, 3, "heal", 50, 380, 3, 0, -40, 1); }
        if(n){ vfxShock(e.x, e.y, 8, C.r, C.rgb, 420, 1); e.attackAnim = 300; }
      }
      return keepAway();
    case "resucitador":
      if(e.roleT <= 0 && e.roleUses < C.maxRaise){
        const c = consumeCorpse(e.x, e.y, C.r);
        e.roleT = c ? C.every : 1200;
        if(c && ENEMY_BASE[c.e.type] && ENEMY_BASE[c.e.type].rank!=="jefe"){
          e.roleUses++;
          const r = spawnEnemy(c.e.type, false, false); r.x = c.x; r.y = c.y; r.hp = r.maxHp = Math.round(r.maxHp*0.55); r.summonedByRole = true; r.xp = 0; r.gold = 0;
          pushChainBolt(e.x, e.y-26, c.x, c.y-10, 10, 420);
          vfxBurst(c.x, c.y-10, 12, "arcane", 110, 480, 3, 1, -40, 0);
          if(inView(c.x, c.y, 0)) floatText(c.x, c.y-40, "¡se levanta!", null);
          e.attackAnim = 320;
        }
      }
      return keepAway();
    case "invocador":
      if(e.roleT <= 0){
        e.roleT = C.every;
        const alive = enemies.filter(o=>o.alive && o.summoner===e).length;
        if(alive < C.maxAlive){
          const pool = spawnPoolFor(1); const t = pool[0].t;
          vfxTelegraph({x:e.x, y:e.y, r:60, dur:700, rgb:C.rgb});
          const sx = e.x, sy = e.y;
          runLater(700, ()=>{ if(!e.alive) return; for(let i=0;i<2;i++){ const s = spawnEnemy(t, false, false); s.x = sx + (Math.random()-0.5)*50; s.y = sy + (Math.random()-0.5)*40; s.summoner = e; s.summonedByRole = true; s.xp = Math.ceil(s.xp*0.5); } vfxBurst(sx, sy-10, 14, "ember", 130, 420, 3, 1, -40, 0); });
          e.attackAnim = 400;
        }
      }
      return keepAway();
    case "protector": {
      // lazo visible con los protegidos (la marca dura 0,6 s y se renueva)
      if(e.roleT <= 0){ e.roleT = 400; e._links = []; for(const o of enemies){ if(!o.alive || o===e || o.role==="protector" || Math.hypot(o.x-e.x, o.y-e.y) > C.r) continue; o._protT = runElapsedMs + 600; if(e._links.length < 6) e._links.push(o); } }
      return false;
    }
    case "carcelero":
      if(e.roleT <= 0 && dist < C.range){
        e.roleT = C.every;
        const h = tgt, x = h.x, y = h.y;
        vfxTelegraph({x, y, r:C.r, dur:C.warn, rgb:C.rgb});
        e.attackAnim = 300;
        runLater(C.warn, ()=>{
          if(!e.alive) return;
          for(const o of heroes){ if(!o.alive || Math.hypot(o.x-x, o.y-y) > C.r + (o.radius||18)*0.5) continue; o.slowAmt = Math.max(o.slowAmt||0, 0.9); o.slowTimer = Math.max(o.slowTimer||0, C.root);
            if(o===player) floatText(o.x, o.y-50, "¡ENRAIZADO!", null); }
          vfxBurst(x, y, 10, "stone", 90, 360, 3, 1, -10, 0);
        });
      }
      return false;
    case "suicida":
      if(e._fuse > 0){
        e._fuse -= dt; e.hitFlash = Math.sin(e._fuse/40) > 0 ? 90 : 0;
        if(e._fuse <= 0 && e.alive){
          for(const h of heroes){ if(!h.alive || Math.hypot(h.x-e.x, h.y-e.y) > C.r) continue; damageHero(h, h.maxHp*C.dmgPct, e); }
          for(const o of enemies){ if(o.alive && o!==e && Math.hypot(o.x-e.x, o.y-e.y) < C.r) o.hp -= o.maxHp*0.25; } // también lastima a la horda
          vfxShock(e.x, e.y, 10, C.r, C.rgb, 420, 2); vfxBurst(e.x, e.y-10, 20, "ember", 200, 460, 4, 2, -30, 0);
          if(inView(e.x, e.y, 0)){ vfxShake(5); playSfx("boom"); }
          e.alive = false; e.hp = 0; e.lastHitBy = null; e._deathKind = "burn";
          addDecal(e.x, e.y+3, "#1e1410", "#0c0806", "pool", 1.3);
        }
        return true; // se planta mientras parpadea
      }
      if(dist < C.trigger){ e._fuse = C.fuse; vfxTelegraph({follow:e, r:C.r, dur:C.fuse, rgb:C.rgb}); if(inView(e.x, e.y, 0)) playSfx("threat"); return true; }
      return false;
    case "comandante":
      if(e.roleT <= 0){ e.roleT = 500; for(const o of enemies){ if(!o.alive || o===e || Math.hypot(o.x-e.x, o.y-e.y) > C.r) continue; o._cmdT = runElapsedMs + 700; } }
      return false;
    case "artillero":
      if(e.roleT <= 0 && dist < C.range){
        e.roleT = C.every;
        const pts = [{x:tgt.x, y:tgt.y}, {x:tgt.x + tgt.fx*90, y:tgt.y + tgt.fy*90}];
        // golpe diferido con aviso de 1 s (bossStrike ya marca el suelo y cuenta como esquivable)
        const dmg = Math.round(tgt.maxHp*C.dmgPct);
        for(const p of pts) bossStrike(p.x, p.y, C.r, C.warn, dmg, "fire", {fromRole:e});
        e.attackAnim = 400;
      }
      return keepAway();
  }
  return false;
}
// Al morir un comandante: la horda que lo rodeaba se desmoraliza (lenta 2 s).
function roleOnDeath(e){
  if(e.role==="comandante"){
    for(const o of enemies){ if(!o.alive || Math.hypot(o.x-e.x, o.y-e.y) > ROLE_CFG.comandante.r) continue; o.slowAmt = Math.max(o.slowAmt||0, 0.3); o.slowTimer = Math.max(o.slowTimer||0, 2000); o._cmdT = 0; }
    if(inView(e.x, e.y, 0)) floatText(e.x, e.y-50, "¡la horda duda!", "heal");
  }
}
// Aviso la primera vez que aparece en pantalla cada rol en el nivel.
let _roleSeenLvl = {};
function roleAnnounce(e){
  if(!e.role || e._announced || !inView(e.x, e.y, -20)) return;
  e._announced = true;
  const k = e.role+"@"+runLevel;
  if(_roleSeenLvl[k]) return; _roleSeenLvl[k] = true;
  const C = ROLE_CFG[e.role];
  floatText(e.x, e.y-(e.radius||20)*2-24, `${C.ico} ${C.name}`, "crit");
  playSfx("threat");
  if(typeof tutSay==="function") tutSay("role_"+e.role, ROLE_TIPS[e.role], null, 6500);
}
const ROLE_TIPS = {
  sanador:"SANADOR (cruz verde): cura a la horda que tiene cerca. Matalo primero.",
  resucitador:"RESUCITADOR: levanta a los muertos del piso. Matalo antes de que junte un ejército.",
  invocador:"INVOCADOR: abre grietas que traen refuerzos cada pocos segundos. Si lo matás, se cortan.",
  protector:"PROTECTOR (escudo azul): los enemigos unidos a él reciben menos daño. Matalo a él primero.",
  carcelero:"CARCELERO: marca el suelo bajo tus pies y te encadena. Si ves la marca, salí rápido.",
  cazador:"CAZADOR: es rápido y persigue al compañero más débil. Protegé al mago o al soporte.",
  suicida:"SUICIDA: cuando se planta y parpadea, está por explotar. Alejate (a la horda también la daña).",
  comandante:"COMANDANTE (estandarte): la horda cercana pega más y corre más. Matalo y dudan.",
  artillero:"ARTILLERO: bombardea donde estás parado. Cuando aparece un círculo en el piso, movete."
};
function resetEnemyRoles(){ _roleSeenLvl = {}; }
// Dibujo: anillo en el suelo + insignia en rombo con el ícono (encima de la barra de vida).
function drawEnemyRoleMarks(e){
  if(!e.role) return;
  const C = ROLE_CFG[e.role], R = e.radius||20, t = animNow;
  const pulse = 0.55 + 0.35*Math.sin(t/200 + e.x*0.01);
  ctx.save();
  ctx.strokeStyle = `rgba(${C.rgb},${0.45+0.3*pulse})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(e.x, e.y+3, R*1.25, R*0.5, 0, 0, Math.PI*2); ctx.stroke();
  // lazos del protector
  if(e.role==="protector" && e._links){ ctx.strokeStyle = `rgba(${C.rgb},0.35)`; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]); for(const o of e._links){ if(!o.alive) continue; ctx.beginPath(); ctx.moveTo(e.x, e.y-R); ctx.lineTo(o.x, o.y-(o.radius||20)); ctx.stroke(); } ctx.setLineDash([]); }
  // insignia
  const by = e.y - R*2.3 - 18, s = 9;
  ctx.fillStyle = "rgba(10,6,4,0.85)"; ctx.beginPath(); ctx.moveTo(e.x, by-s); ctx.lineTo(e.x+s, by); ctx.lineTo(e.x, by+s); ctx.lineTo(e.x-s, by); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `rgb(${C.rgb})`; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = `rgb(${C.rgb})`; ctx.font = "bold 10px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(C.ico, e.x, by+0.5);
  ctx.restore();
  if(e.role==="suicida" && e._fuse > 0){ ctx.save(); ctx.globalAlpha = 0.25 + 0.25*Math.sin(t/40); ctx.fillStyle = `rgb(${C.rgb})`; ctx.beginPath(); ctx.ellipse(e.x, e.y, C.r, C.r*0.62, 0, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
}
