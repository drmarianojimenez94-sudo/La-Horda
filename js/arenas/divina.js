"use strict";
/* ============================================================
   js/arenas/divina.js
   Arena Divina: equipo enemigo, torres/castillos, combate por bando, oleadas de
   minions y jefes divinos.
   ============================================================ */

let divinaStructures = [];
let divinaLevel = 1; // nivel de la Arena Divina: cada uno sube 10 niveles de personaje al equipo enemigo
let divinaEnemies = [];
// Los 4 roles de siempre (Tanque/Asesino/Mago/Soporte); si hay más de una clase en el mismo
// rol (como Tanque/Segador), se sortea cuál usa el equipo enemigo esta vez, igual que ya
// se hace para armar a tus propios aliados.
function pickDivinaTeamClasses(){
  const ROLE_ORDER = ["tanque","asesino","mago","soporte"];
  return ROLE_ORDER.map(role=>{
    const pool = Object.keys(CLASSES).filter(k=>CLASSES[k].roleCategory===role);
    return pool[(Math.random()*pool.length)|0];
  });
}
// Fase 3: arma el equipo enemigo "divino" -mismos campeones y habilidades de siempre, pero
// escalados al nivel que corresponde ("10 niveles de personaje por cada nivel de Arena
// Divina")- SIN tocar save.champions en ningún momento: usa el parámetro de nivel opcional
// de computePlayerStats/makeHero, así el nivel real del jugador queda intacto.
function spawnDivinaEnemyTeam(){
  // Nivel 6: en vez de otro equipo de campeones, el rival son los 4 jefes finales de las
  // arenas normales (ver makeDivinaBossChamp más arriba).
  if(divinaLevel===DIVINA_BOSS_LEVEL){
    divinaEnemies = DIVINA_BOSS_TYPES.map((type,i)=>{
      const ang = (i/DIVINA_BOSS_TYPES.length)*Math.PI*2;
      return makeDivinaBossChamp(type, Math.cos(ang)*90, -640+Math.sin(ang)*90);
    });
    return;
  }
  const lvl = Math.min(99, divinaLevel*10);
  const classes = pickDivinaTeamClasses();
  divinaEnemies = classes.map((k,i)=>{
    const ang = (i/classes.length)*Math.PI*2;
    const h = makeHero(k, true, Math.cos(ang)*70, -640+Math.sin(ang)*70, lvl, true);
    h.divinaAdvanceTarget = {x:0, y:700}; // hacia el castillo del jugador, al sur
    h.atkCd = 0;
    h.retreatTimer = 0;
    return h;
  });
}
// IA de Fase 3 (simple a propósito, como pide el diseño): mientras no tenga un héroe del
// jugador cerca, avanza hacia el castillo enemigo (el del jugador); si lo tiene cerca, se
// frena y pelea cuerpo a cuerpo. Todavía no distingue ataque/defensa/retirada -eso se afina
// en una pasada aparte- pero ya es un equipo de 4 que avanza y golpea de verdad.
function updateDivinaEnemies(dt){
  const aliveEnemyCount = divinaEnemies.filter(x=>x.alive).length;
  const aliveHeroCount = heroes.filter(p=>p.alive).length;
  for(const h of divinaEnemies){
    if(!h.alive) continue;
    if(h.hurtTimer>0) h.hurtTimer -= dt;
    if(h.atkCd>0) h.atkCd -= dt;
    // Fase 5: destellos sagrados subiendo alrededor del cuerpo, parte del aura divina
    // (más frecuentes cuanto más alto el nivel de la Arena Divina, mismo criterio del aura)
    if(Math.random() < 0.28*Math.min(2.2,1+(divinaLevel-1)*0.13)){
      particles.push({x:h.x+(Math.random()-0.5)*30, y:h.y+(Math.random()-0.5)*14, vx:(Math.random()-0.5)*10, vy:-30-Math.random()*20, life:600, color:Math.random()<0.6?"#ffe8a0":"#fff6d8"});
    }

    // --- RETIRADA: con poca vida y en desventaja numérica, se aleja hacia su propia base a
    // recuperar distancia en vez de seguir peleando a lo loco. No es invulnerable mientras
    // huye -sigue pudiendo recibir daño si lo alcanzan- pero no ataca ni avanza al frente.
    if(h.retreatTimer>0){
      h.retreatTimer -= dt;
      const dx = 0-h.x, dy = -680-h.y, l = Math.hypot(dx,dy)||1;
      h.fx = dx/l; h.fy = dy/l;
      if(l>40){
        h.x += (dx/l) * h.baseSpeed*0.95 * dt/1000;
        h.y += (dy/l) * h.baseSpeed*0.95 * dt/1000;
      }
      h.animT += dt;
      continue;
    }
    if(h.hp/h.maxHp < 0.22 && aliveEnemyCount < aliveHeroCount){
      h.retreatTimer = 2600;
      if(h===divinaEnemies[0] || true) floatText(h.x, h.y-40, "¡Retirada!", null);
      continue;
    }

    // --- DEFENSA: si alguna estructura PROPIA está siendo amenazada por un héroe o un minion
    // del jugador, prioriza volver a defenderla por sobre seguir avanzando a ciegas.
    const playerThreats = [...heroes.filter(p=>p.alive), ...divinaMinions.filter(m=>m.alive && m.side==="player")];
    let threatened = null, threatD = 240;
    for(const s of divinaStructures){
      if(!s.alive || s.side!=="enemy") continue;
      for(const p of playerThreats){
        const d = distance(p, s);
        if(d < threatD){ threatD = d; threatened = s; }
      }
    }

    // --- COMBATE: entre los héroes y minions del jugador al alcance, prioriza al más
    // vulnerable (menos vida), no siempre al más cercano sin criterio -tal como pedía el
    // diseño original- ahora también trabando combate con las oleadas, no solo con héroes.
    let target = null, bestScore = -Infinity;
    for(const p of playerThreats){
      const d = distance(h,p);
      if(d > 260) continue;
      const score = (1 - p.hp/p.maxHp)*180 - d; // vida baja pesa más que la cercanía
      if(score > bestScore){ bestScore = score; target = p; }
    }

    if(threatened && !target){
      // ATAQUE/DEFENSA: nadie cerca para pelear, pero la base propia está en peligro -> volver
      const dx = threatened.x-h.x, dy = threatened.y-h.y, l = Math.hypot(dx,dy)||1;
      h.fx = dx/l; h.fy = dy/l;
      if(l>50){ h.x += (dx/l)*h.baseSpeed*0.9*dt/1000; h.y += (dy/l)*h.baseSpeed*0.9*dt/1000; }
      h.animT += dt;
      continue;
    }

    if(target){
      const d = distance(h,target);
      const dx = target.x-h.x, dy = target.y-h.y, l = Math.hypot(dx,dy)||1;
      h.fx = dx/l; h.fy = dy/l;
      if(d > 46){
        h.x += (dx/l) * h.baseSpeed*0.85 * dt/1000;
        h.y += (dy/l) * h.baseSpeed*0.85 * dt/1000;
      } else if(h.atkCd<=0){
        h.atkCd = 1000;
        h.attackAnim = 190;
        if(target.classKey) damageHero(target, h.baseDmg*0.8); else damageDivinaMinion(target, h.baseDmg*0.8);
        spawnSlash(h);
      }
    } else {
      // sin ningún héroe tuyo cerca: si ya tienen una estructura tuya al alcance, la
      // atacan (misma regla de protección de torres que rige para el jugador). Si no,
      // avanzan -pero apuntando primero a alguna TORRE viva mientras el castillo siga
      // protegido, no directo al castillo, o nunca romperían la defensa de verdad.
      let nearestStruct = null, bestSD = 70;
      for(const s of divinaStructures){
        if(!s.alive || s.side!=="player") continue;
        const d = distance(h,s) - s.radius;
        if(d < bestSD){ bestSD = d; nearestStruct = s; }
      }
      if(nearestStruct){
        const dx = nearestStruct.x-h.x, dy = nearestStruct.y-h.y, l = Math.hypot(dx,dy)||1;
        h.fx = dx/l; h.fy = dy/l;
        if(h.atkCd<=0){
          h.atkCd = 1100;
          h.attackAnim = 190;
          damageDivinaStructure(nearestStruct, h.baseDmg*0.7, h);
        }
      } else {
        const aliveTower = divinaStructures.find(s=>s.alive && s.side==="player" && s.type==="tower");
        const goal = aliveTower || h.divinaAdvanceTarget;
        const dx = goal.x-h.x, dy = goal.y-h.y, l = Math.hypot(dx,dy)||1;
        if(l>20){
          h.fx = dx/l; h.fy = dy/l;
          h.x += (dx/l) * h.baseSpeed*0.55 * dt/1000;
          h.y += (dy/l) * h.baseSpeed*0.55 * dt/1000;
        }
      }
    }
    h.animT += dt;
  }
}
function buildDivinaStructures(){
  // Bug reportado: con daño plano fijo, las torres (600 HP) morían casi al instante contra un
  // equipo ya progresado -runStats.dmgMult crece con maestría/talentos/objetos durante toda la
  // partida, pero la vida de la estructura era un valor estático sin relación con eso-. Se
  // reusa partyLevelScale() (el mismo ajuste que ya usa spawnEnemy para que los enemigos de las
  // arenas normales no se vuelvan triviales en cuentas avanzadas) en vez de inventar una
  // fórmula de escalado nueva.
  const pls = partyLevelScale();
  divinaStructures = DIVINA_LAYOUT.map(s=>({
    ...s, maxHp:Math.round(s.hp*pls.hp), hp:Math.round(s.hp*pls.hp), alive:true, atkCd:0,
    radius: s.type==="castle" ? 95 : 40
  }));
}
// ¿Sigue protegido el castillo de este lado? (true mientras le quede alguna torre propia en pie)
function castleProtected(side){
  return divinaStructures.some(s=>s.type==="tower" && s.side===side && s.alive);
}
function damageDivinaStructure(s, amount, src){
  if(!s.alive) return;
  if(s.type==="castle" && castleProtected(s.side)){
    floatText(s.x, s.y-110, "¡Protegido!", null);
    particles.push({x:s.x,y:s.y-70, life:260, ring:true, maxLife:260, maxR:100, color:"#d29aff"});
    return;
  }
  s.hp = Math.max(0, s.hp - amount);
  s._hitAt = animNow; // destello de impacto (ver drawDivinaFactionStructure)
  floatText(s.x, s.y-(s.type==="castle"?150:110), Math.round(amount), null);
  if(s.hp<=0){
    s.alive = false;
    particles.push({x:s.x,y:s.y-40, life:700, ring:true, maxLife:700, maxR:s.radius+40, color:"#d29aff"});
    // OJO: antes esto chequeaba "if(type==='tower') ... else CASTILLO DESTRUIDO", así que una
    // torre intermedia (type:"midtower") caía en el else y terminaba la partida como si fuera
    // el castillo. Ahora se chequea el castillo explícitamente primero.
    if(s.type==="castle"){
      showBanner("¡CASTILLO DESTRUIDO!");
      if(s.side==="enemy"){
        divinaLevel++; // Fase 4: ganaste -> el próximo intento ya escala al nivel siguiente
        runLater(900, ()=>{ showGameOverScreen("victory"); });
      } else {
        runLater(900, ()=>{ showGameOverScreen("castle"); });
      }
    } else {
      showBanner(s.type==="midtower" ? "¡TORRE INTERMEDIA DESTRUIDA!" : "¡TORRE DESTRUIDA!");
      if(s.type==="tower" && !castleProtected(s.side)) runLater(900, ()=>showBanner("¡CASTILLO VULNERABLE!"));
    }
  }
}

// ============================================================
// ARENA DIVINA — combate por bando: unifica campeones, oleadas de minions y estructuras bajo
// una sola noción de "objetivo hostil", para que cualquier cosa que pelee en el asedio (tuya
// o del equipo enemigo) pueda trabar combate con lo que tenga cerca, no solo con los héroes
// (antes tus 3 aliados no atacaban NADA en la Arena Divina: ver triggerBasic/updateAllies).
// mySide "player" = vos (heroes); "enemy" = el equipo rival (divinaEnemies).
// ============================================================
function divinaHostiles(mySide, x, y, range, opts){
  opts = opts || {};
  const list = [];
  if(mySide==="player"){
    for(const h of divinaEnemies){ if(h.alive) list.push({kind:"champ", ref:h}); }
    for(const m of divinaMinions){ if(m.alive && m.side==="enemy") list.push({kind:"minion", ref:m}); }
    if(!opts.unitsOnly) for(const s of divinaStructures){ if(s.alive && s.side==="enemy") list.push({kind:"structure", ref:s}); }
  } else {
    for(const h of heroes){ if(h.alive) list.push({kind:"hero", ref:h}); }
    for(const m of divinaMinions){ if(m.alive && m.side==="player") list.push({kind:"minion", ref:m}); }
    if(!opts.unitsOnly) for(const s of divinaStructures){ if(s.alive && s.side==="player") list.push({kind:"structure", ref:s}); }
  }
  let best=null, bestD=Infinity;
  for(const it of list){
    const d = distance({x,y}, it.ref) - (it.ref.radius||0);
    if(d<=range && d<bestD){ bestD=d; best=it; }
  }
  return best;
}
function divinaDealDamage(target, amount, src){
  if(target.kind==="hero" || target.kind==="champ") damageHero(target.ref, amount);
  else if(target.kind==="minion") damageDivinaMinion(target.ref, amount, src);
  else if(target.kind==="structure") damageDivinaStructure(target.ref, amount, src);
}
// Proyectiles de estructura (pedido explícito: "que los básicos de las torres sean bolas
// grandes"): en vez de aplicar el daño al instante, la torre/castillo dispara una bola real
// (sprite proyectil_XX del usuario) que viaja hasta el objetivo y recién ahí impacta -mismo
// criterio que cualquier otro proyectil del juego, solo que persiguiendo un blanco en vez de
// una dirección fija, porque el objetivo puede seguir moviéndose mientras la bola viaja-.
let divinaStructProjectiles = [];
function updateDivinaStructuresCombat(dt){
  for(const s of divinaStructures){
    if(!s.alive) continue;
    if(s.atkCd>0){ s.atkCd -= dt; continue; }
    const range = s.type==="castle" ? 260 : 220;
    const hit = divinaHostiles(s.side, s.x, s.y, range, {unitsOnly:true});
    if(!hit) continue;
    s.atkCd = s.type==="castle" ? 900 : 1100;
    divinaStructProjectiles.push({
      x:s.x, y:s.y-(s.type==="castle"?90:80), target:hit, side:s.side, src:s,
      speed: 420, animT:0, life:1400
    });
  }
}
function updateDivinaStructProjectiles(dt){
  for(const p of divinaStructProjectiles){
    p.animT += dt; p.life -= dt;
    const t = p.target && p.target.ref;
    if(!t || !t.alive){ p.life = 0; continue; }
    const dx=t.x-p.x, dy=(t.y-14)-p.y, d=Math.hypot(dx,dy)||1;
    if(d <= 20){
      if(p.target.kind==="hero" || p.target.kind==="champ"){
        divinaTowerHitChampion(p.src, t);
      } else {
        divinaDealDamage(p.target, p.src.type==="castle" ? 46 : 30, p.src);
      }
      p.life = 0;
      continue;
    }
    p.x += dx/d*p.speed*dt/1000; p.y += dy/d*p.speed*dt/1000;
  }
  divinaStructProjectiles = divinaStructProjectiles.filter(p=>p.life>0);
}
// Daño porcentual escalado de torres/castillo contra un campeón (sección de daño true, ignora
// defensa/escudos: es daño de asedio, no un golpe cuerpo a cuerpo más). Reusa el mismo bloque de
// manejo de muerte que damageHero (onPlayerDeath / caída de aliado) para no duplicar esa lógica
// mal, solo que sin pasar por la mitigación genérica.
function divinaTowerHitChampion(s, h){
  if(!h || !h.alive || h.invulnTimer>0) return;
  if(!s.hitTracker) s.hitTracker = new Map();
  const now = performance.now();
  let rec = s.hitTracker.get(h);
  if(!rec || now-rec.lastHit > DIVINA_TOWER_HIT_RESET_MS) rec = {count:0};
  rec.count++; rec.lastHit = now;
  s.hitTracker.set(h, rec);
  const pct = DIVINA_TOWER_HIT_PCTS[Math.min(rec.count-1, DIVINA_TOWER_HIT_PCTS.length-1)];
  const executing = pct>=1;
  const dmg = executing ? h.hp+1 : h.maxHp*pct;
  h.hp = Math.max(0, h.hp-dmg);
  h.hurtTimer = 160;
  floatText(h.x, h.y-30, executing ? "¡EJECUTADO!" : "-"+Math.round(dmg), executing?"crit":null);
  for(let i=0;i<(executing?10:4);i++) particles.push({x:h.x+(Math.random()-0.5)*10, y:h.y-20, vx:(Math.random()-0.5)*90, vy:(Math.random()-0.5)*90-20, life:200, color:"#ff5a5a"});
  if(h.hp<=0){
    h.hp = 0;
    s.hitTracker.delete(h); // una vida nueva empieza el conteo de impactos de cero
    if(h===player){ onPlayerDeath(); }
    else {
      h.alive = false;
      showBanner(`${h.cls.name} ha caído`);
      for(let i=0;i<12;i++) particles.push({x:h.x,y:h.y, vx:(Math.random()-0.5)*160, vy:(Math.random()-0.5)*160, life:500, color:h.cls.color});
      if(h.isBossChamp) vfxOnDeath(h); // jefe divino (entidad tipo enemigo): muerte con su sprite
    }
  }
}

// ---- Oleadas de minions: cada tanto salen refuerzos para LOS DOS bandos, con exactamente la
// misma composición para cada uno (mismo sorteo, tal como pediste). El roster sale de TODOS
// los enemigos comunes de las 4 arenas normales (Bosque/Hielo/Laberinto/Infernal), sin jefes
// ni subjefes -la Arena Divina como "resumen" de todo lo ya peleado, no monstruos propios-.
let divinaMinions = [];
let divinaWaveTimer = 0;
// Calculado perezosamente (no al cargar el script): ENEMY_BASE todavía no existe en este
// punto del archivo, así que un `const ... = Object.keys(ENEMY_BASE)` de nivel superior acá
// rompería el juego entero al arrancar (ReferenceError por TDZ).
let _divinaWavePoolCache = null;
function divinaWavePool(){
  if(!_divinaWavePoolCache){
    _divinaWavePoolCache = Object.keys(ENEMY_BASE).filter(k=>{
      const r = ENEMY_BASE[k].rank;
      return r!=="jefe" && r!=="subjefe";
    });
  }
  return _divinaWavePoolCache;
}
function pickDivinaWaveComposition(){
  const pool = divinaWavePool();
  const picks = [];
  for(let i=0;i<DIVINA_WAVE_SIZE;i++) picks.push(pool[(Math.random()*pool.length)|0]);
  return picks;
}
function makeDivinaMinion(type, side, x, y){
  const base = ENEMY_BASE[type];
  const lvlScale = Math.min(2.2, 1 + (divinaLevel-1)*0.12);
  return {
    type, side, rank: base.rank, alive:true,
    x, y, radius: base.radius, scale: base.scale*0.92,
    hp: Math.round(base.hp*lvlScale*1.4), maxHp: Math.round(base.hp*lvlScale*1.4),
    dmg: Math.round(base.dmg*lvlScale*1.2),
    speed: base.speed*0.9, color: base.color,
    ranged: base.ranged||false, range: base.range||0, projSpeed: base.projSpeed||0,
    atkCd:0, fx:0, fy: side==="enemy"?1:-1, animT:Math.random()*600, attackAnim:0, hitFlash:0,
    goal: side==="enemy" ? {x:0,y:700} : {x:0,y:-700}
  };
}
function spawnDivinaWave(){
  const picks = pickDivinaWaveComposition();
  picks.forEach((type,i)=>{
    const off = (i-(picks.length-1)/2)*46;
    divinaMinions.push(makeDivinaMinion(type, "enemy", off, -640));
    divinaMinions.push(makeDivinaMinion(type, "player", off, 640));
  });
  showBanner("¡Oleada de refuerzos!");
}
function updateDivinaMinions(dt){
  for(const m of divinaMinions){
    if(!m.alive) continue;
    if(m.atkCd>0) m.atkCd -= dt;
    if(m.hitFlash>0) m.hitFlash -= dt;
    if(m.attackAnim>0) m.attackAnim -= dt;
    const AGGRO = 220, atkRange = m.ranged ? m.range : (m.radius+30);
    const hit = divinaHostiles(m.side, m.x, m.y, AGGRO);
    if(hit){
      const t = hit.ref;
      const dx=t.x-m.x, dy=t.y-m.y, d=Math.hypot(dx,dy)||1;
      m.fx=dx/d; m.fy=dy/d;
      const stopDist = hit.kind==="structure" ? ((t.radius||0)+atkRange) : atkRange;
      if(d > stopDist){
        m.x += dx/d*m.speed*dt/1000; m.y += dy/d*m.speed*dt/1000;
      } else if(m.atkCd<=0){
        m.atkCd = m.ranged ? 1400 : 1000;
        m.attackAnim = 220;
        divinaDealDamage(hit, m.dmg, m);
      }
    } else {
      const dx=m.goal.x-m.x, dy=m.goal.y-m.y, d=Math.hypot(dx,dy)||1;
      if(d>20){ m.fx=dx/d; m.fy=dy/d; m.x += dx/d*m.speed*dt/1000; m.y += dy/d*m.speed*dt/1000; }
    }
    m.animT += dt;
  }
  divinaMinions = divinaMinions.filter(m=>m.alive);
}
function damageDivinaMinion(m, amount){
  if(!m.alive) return;
  m.hp -= amount;
  m.hitFlash = 90;
  floatText(m.x, m.y-20, Math.round(amount), null);
  if(m.hp<=0){
    m.alive = false;
    for(let i=0;i<6;i++) particles.push({x:m.x,y:m.y, vx:(Math.random()-0.5)*120, vy:(Math.random()-0.5)*120, life:360, color:m.color});
    vfxOnDeath(m); // muerte con su propio sprite (antes desaparecía en el acto), solo visual
  }
}
function makeDivinaBossChamp(type, x, y){
  const base = ENEMY_BASE[type];
  const scaleMult = 1 + Math.max(0, divinaLevel-DIVINA_BOSS_LEVEL)*0.12;
  return {
    type, rank: base.rank, isBossChamp:true, isDivineFoe:true, alive:true,
    x, y, radius: base.radius*1.15, scale: base.scale*1.05,
    hp: Math.round(base.hp*1.6*scaleMult), maxHp: Math.round(base.hp*1.6*scaleMult),
    dmg: Math.round(base.dmg*1.3*scaleMult), baseDmg: Math.round(base.dmg*1.3*scaleMult),
    speed: base.speed*0.85, baseSpeed: base.speed*0.85, def:0.12, classKey:null, stats:null,
    cls:{name:base.name, color:base.color},
    color: base.color, ranged: base.ranged||false, range: base.range||0, projSpeed: base.projSpeed||0,
    fx:0, fy:1, animT:Math.random()*600, attackAnim:0, hitFlash:0, hurtTimer:0, atkCd:0, retreatTimer:0,
    divinaAdvanceTarget: {x:0, y:700}
  };
}
