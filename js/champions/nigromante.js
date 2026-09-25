"use strict";
/* ============================================================
   js/champions/nigromante.js
   Nigromante: esqueletos, gólem, plaga/contagio y Encarnación del Abismo.
   ============================================================ */

/* ============================================================
   NIGROMANTE — mecánicas propias (esqueletos, gólem, plaga/contagio, Encarnación del
   Abismo). Sigue el mismo patrón ya usado por Musashi (musashi*) y Sylva (sylva*): funciones
   dedicadas fuera del switch de castAbility, invocadas desde ahí y desde update()/updateAllies().
   ============================================================ */
const NIGRO_TRANSFORM_MS = 900;      // duración de la animación de transformación de la ultimate
const NIGRO_PLAGUE_CONTAGION_RADIUS = 140;
const NIGRO_SKELETON_LEASH = 700;    // si un esqueleto se aleja más que esto de su dueño, teletransporta de vuelta
const NIGRO_GOLEM_LEASH = 780;
const NIGRO_SKELETON_SEPARATION = 34; // evita que los esqueletos queden exactamente apilados

// Máximo de esqueletos vivos según cuánto se invirtió en Levantar Esqueletos (talento/maestría,
// igual criterio que ya usa area_trap con tierOf(allocLevel(mastery)) para su cantidad de trampas):
// 1->2, 3->3, 5->4, 7->5, 10->6 (sección 3 del diseño).
function nigromanteMaxSkeletons(mastery){
  const lvl = allocLevel(mastery);
  if(lvl>=10) return 6;
  if(lvl>=7) return 5;
  if(lvl>=5) return 4;
  if(lvl>=3) return 3;
  return 2;
}
// A partir de 5 esqueletos empiezan a aparecer Esqueletos Mago (a distancia); composición
// objetivo ~4 guerreros + 2 magos en el máximo, tal como pide el diseño.
function nigromanteSkeletonComposition(maxCount){
  if(maxCount>=6) return {warriors:4, mages:2};
  if(maxCount>=5) return {warriors:4, mages:1};
  return {warriors:maxCount, mages:0};
}
function nigromanteGolemSkin(h){
  const flags = talentSkillMods(h.classKey, 1).flags;
  return flags.golemSkin || "stone";
}
// Maldición de Plaga de los Condenados: DoT + más daño recibido + contagio limitado (gen tope,
// nunca se propaga infinito aunque el mapa esté lleno de enemigos apretados entre sí).
function nigromanteApplyCurse(e, src, dmgPerSec, defTakenPct, gen, durationMs, maxGen){
  if(!e || !e.alive) return;
  e.cursed = true;
  e.curseTimer = Math.max(e.curseTimer||0, durationMs);
  e.curseDmg = dmgPerSec;
  e.curseDefTakenMult = 1+defTakenPct;
  e.curseSrc = src;
  e.curseGen = gen||0;
  e.curseMaxGen = maxGen||0;
  e.curseContagionR = NIGRO_PLAGUE_CONTAGION_RADIUS * (1 + talentSkillMods(src&&src.classKey, 2).flags.contagionRadiusPct||0);
}
function nigromantePlagueDeathSpread(e){
  if(!e.cursed) return;
  const gen = e.curseGen||0;
  if(gen >= (e.curseMaxGen||0)) return;
  const r = e.curseContagionR || NIGRO_PLAGUE_CONTAGION_RADIUS;
  for(const o of enemies){
    if(o===e || !o.alive || o.cursed) continue;
    if(distance(e,o) <= r){
      nigromanteApplyCurse(o, e.curseSrc, e.curseDmg, (e.curseDefTakenMult||1)-1, gen+1, e.curseTimer>0?e.curseTimer: 2600, e.curseMaxGen);
    }
  }
}
// "Peste Negra" (Señor de la Plaga, talento final): se implementa subiendo en 1 el tope de
// generaciones de contagio (maxGen) al lanzar la Plaga -ver el case "condemned_plague"-, así
// nigromantePlagueDeathSpread ya permite una ronda extra de contagio sin duplicar esa lógica.

// ---- Esqueletos invocados: entidades livianas propias (no son "heroes"), mismo criterio que
// el Lobo Espectral de Sylva. IA deliberadamente simple (sección de rendimiento del diseño):
// un solo objetivo por esqueleto, recalculado cada cierto intervalo, no cada frame.
function spawnNigroSkeleton(h, type, mods){
  const baseHp = type==="mage" ? 46 : 62;
  const baseDmg = type==="mage" ? 7 : 9;
  const hpMult = 1+(mods.skeletonHpPct||0);
  const ang = Math.random()*Math.PI*2;
  const sx = h.x+Math.cos(ang)*40, sy = h.y+Math.sin(ang)*40;
  h.skeletons.push({
    owner:h, type, x:sx, y:sy, fx:1, fy:0,
    hp: baseHp*hpMult, maxHp: baseHp*hpMult, dmg: baseDmg, ranged: type==="mage",
    moving:false, attackAnim:0, hitFlash:0, atkCd:0, retargetCd:0, target:null, alive:true
  });
  // Ráfaga de materialización real (antes sin usar): el esqueleto emerge de la niebla verde.
  vfxSprite(type==="mage" ? "nigroSkeletonSpawnMage" : "nigroSkeletonSpawnWarrior", 0, sx, sy, 60, 340, null, 0.1, false, 0.92, 0);
}
function killNigroSkeleton(sk){
  sk.alive = false;
  particles.push({x:sk.x,y:sk.y, life:280, ring:true, maxLife:280, maxR:26, color:"#7ad48a"});
  if(sk.type==="mage") return;
}
function updateNigromanteSkeletons(h, dt){
  if(!h.skeletons.length) return;
  const mods = talentSkillMods(h.classKey, 0).flags;
  for(const sk of h.skeletons){
    if(!sk.alive) continue;
    if(sk.hitFlash>0) sk.hitFlash -= dt;
    if(sk.attackAnim>0) sk.attackAnim -= dt;
    if(sk.atkCd>0) sk.atkCd -= dt;
    sk.retargetCd -= dt;
    if(sk.retargetCd<=0 || !sk.target || !sk.target.alive){
      sk.retargetCd = 500+Math.random()*300;
      // Prioriza enemigos malditos (sección 3), si no el más cercano dentro de un radio razonable.
      // Reusa este mismo recorrido (en vez de sumar otro escaneo completo por frame) para una
      // vulnerabilidad simplificada: un enemigo que esté atacando y pegado a un esqueleto le
      // hace daño de refilón -así "pueden morir" sin convertirlos en un tipo de objetivo nuevo
      // dentro de toda la IA enemiga existente-.
      let best=null, bestScore=-Infinity;
      for(const e of enemies){
        if(!e.alive) continue;
        const d = distance(sk,e);
        if(e.attackAnim>0 && d <= (e.radius||20)+30){
          sk.hp -= (e.dmg||5); sk.hitFlash = 90;
        }
        if(d>520) continue;
        const score = (e.cursed?100000:0) - d;
        if(score>bestScore){ bestScore=score; best=e; }
      }
      sk.target = best;
      if(sk.hp<=0){ killNigroSkeleton(sk); h.nigroGraveyard.push({type:sk.type, timer:14000}); }
    }
    // Si se aleja demasiado del dueño o queda "trabado" fuera del mapa, vuelve de un salto.
    if(distance(sk, h) > NIGRO_SKELETON_LEASH || Math.hypot(sk.x,sk.y) > ARENA_RADIUS+400){
      const ang = Math.random()*Math.PI*2;
      sk.x = h.x+Math.cos(ang)*50; sk.y = h.y+Math.sin(ang)*50;
    }
    const target = sk.target;
    if(target){
      const dx=target.x-sk.x, dy=target.y-sk.y, d=Math.hypot(dx,dy)||1;
      sk.fx=dx/d; sk.fy=dy/d;
      const range = sk.ranged ? 260 : 44;
      if(d>range){
        sk.moving = true;
        const spd = sk.ranged ? 90 : 108;
        sk.x += sk.fx*spd*dt/1000; sk.y += sk.fy*spd*dt/1000;
      } else {
        sk.moving = false;
        if(sk.atkCd<=0){
          sk.atkCd = sk.ranged ? 1400 : 950;
          sk.attackAnim = 260;
          const dmgMult = 1+(mods.skeletonDmgPct||0);
          const finalDmg = sk.dmg*runStats.dmgMult*dmgMult*arenaMods().heroDmgMult;
          if(sk.ranged){
            projectiles.push({x:sk.x,y:sk.y-10, vx:sk.fx*300, vy:sk.fy*300, dmg:finalDmg, life:1100, radius:6, color:"#7ad48a", src:h});
          } else {
            damageEnemy(target, finalDmg, {src:h});
          }
        }
      }
    } else {
      // Sin objetivo: sigue de cerca al dueño en vez de quedarse plantado en cualquier lado.
      const dx=h.x-sk.x, dy=h.y-sk.y, d=Math.hypot(dx,dy)||1;
      if(d>90){ sk.fx=dx/d; sk.fy=dy/d; sk.moving=true; sk.x+=sk.fx*95*dt/1000; sk.y+=sk.fy*95*dt/1000; }
      else sk.moving=false;
    }
    // Separación mínima entre esqueletos (nunca exactamente apilados) y nunca bloquean al dueño.
    for(const other of h.skeletons){
      if(other===sk || !other.alive) continue;
      const d = distance(sk,other);
      if(d < NIGRO_SKELETON_SEPARATION && d>0.01){
        const push = (NIGRO_SKELETON_SEPARATION-d)/2;
        sk.x += (sk.x-other.x)/d*push; sk.y += (sk.y-other.y)/d*push;
      }
    }
  }
  h.skeletons = h.skeletons.filter(sk=>sk.alive);
  // Talento "Legión Eterna": los esqueletos caídos tienen una probabilidad de revivir solos
  // tras un tiempo, sin superar nunca el máximo permitido -un único intento por caída, nunca
  // reintentos indefinidos, para que el ejército no pueda crecer sin límite-.
  if(h.nigroGraveyard.length){
    const eternalLegion = !!mods.eternalLegion;
    const maxCount = nigromanteMaxSkeletons(masteryOf(h.classKey, 0));
    for(const grave of h.nigroGraveyard){
      grave.timer -= dt;
      if(grave.timer<=0){
        grave.done = true;
        if(eternalLegion && h.skeletons.length<maxCount && Math.random()<0.25){
          spawnNigroSkeleton(h, grave.type, mods);
        }
      }
    }
    h.nigroGraveyard = h.nigroGraveyard.filter(g=>!g.done);
  }
}

// ---- Gólem invocado: único (nunca se duplica -si ya hay uno, Crear Golem lo renueva/reposiciona).
function spawnOrRenewGolem(h){
  const mods = talentSkillMods(h.classKey, 1).flags;
  const skin = nigromanteGolemSkin(h);
  const baseHp = 260 * (1+(mods.golemHpPct||0)) * (skin==="ice"?1.2 : skin==="fire"?0.85 : 1);
  if(h.golem){
    // Ya existe: lo renueva (vida llena, reposiciona cerca del Nigromante) en vez de duplicarlo.
    h.golem.maxHp = baseHp; h.golem.hp = baseHp; h.golem.skin = skin;
    h.golem.x = h.x + h.fx*60; h.golem.y = h.y + h.fy*60;
    return;
  }
  h.golem = {
    owner:h, x:h.x+h.fx*60, y:h.y+h.fy*60, fx:h.fx||1, fy:h.fy||0,
    hp:baseHp, maxHp:baseHp, skin, moving:false, attackAnim:0, hitFlash:0, atkCd:0, retargetCd:0, target:null
  };
  // Ráfaga de materialización real (antes sin usar): el Golem emerge de la niebla verde.
  vfxSprite("nigroGolemSpawn", 0, h.golem.x, h.golem.y, 100, 420, null, 0.1, false, 0.94, 0);
}
function killNigroGolem(h){
  if(!h.golem) return;
  particles.push({x:h.golem.x,y:h.golem.y, life:420, ring:true, maxLife:420, maxR:50, color:"#8fae7a"});
  h.golem = null;
}
function updateNigromanteGolem(h, dt){
  const g = h.golem;
  if(!g) return;
  if(g.hitFlash>0) g.hitFlash -= dt;
  if(g.attackAnim>0) g.attackAnim -= dt;
  if(g.atkCd>0) g.atkCd -= dt;
  g.retargetCd -= dt;
  if(g.retargetCd<=0 || !g.target || !g.target.alive){
    g.retargetCd = 600+Math.random()*300;
    // Misma vulnerabilidad simplificada que los esqueletos (ver updateNigromanteSkeletons),
    // pero mitigada -es el tanque del ejército, no debería derretirse tan rápido como ellos-.
    let best=null, bestScore=-Infinity;
    for(const e of enemies){
      if(!e.alive) continue;
      const d = distance(g,e);
      if(e.attackAnim>0 && d <= (e.radius||20)+34){
        g.hp -= (e.dmg||5)*0.4; g.hitFlash = 90;
      }
      if(d>560) continue;
      const score = (e.cursed?100000:0) - d;
      if(score>bestScore){ bestScore=score; best=e; }
    }
    g.target = best;
    if(g.hp<=0){ killNigroGolem(h); return; }
  }
  if(distance(g, h) > NIGRO_GOLEM_LEASH || Math.hypot(g.x,g.y) > ARENA_RADIUS+400){
    g.x = h.x+h.fx*60; g.y = h.y+h.fy*60;
  }
  const mods = talentSkillMods(h.classKey, 1);
  const AREA_G = 1+(mods.flags.golemAreaBonus||0)+mods.areaMult;
  const range = 70*AREA_G;
  if(g.target){
    const dx=g.target.x-g.x, dy=g.target.y-g.y, d=Math.hypot(dx,dy)||1;
    g.fx=dx/d; g.fy=dy/d;
    if(d>range){ g.moving=true; g.x+=g.fx*66*dt/1000; g.y+=g.fy*66*dt/1000; }
    else {
      g.moving=false;
      if(g.atkCd<=0){
        g.atkCd = 1500;
        g.attackAnim = 320;
        const sk = CLASSES.nigromante.skills[1];
        const dmgMult = (1+mods.powerMult) * (g.skin==="fire"?1.25 : g.skin==="ice"?0.9 : 1);
        const finalDmg = h.baseDmg*runStats.dmgMult*sk.dmgMult*dmgMult*arenaMods().heroDmgMult;
        for(const e of enemies){
          if(!e.alive || distance(g,e) > range+18) continue;
          damageEnemy(e, finalDmg, {src:h, slow: g.skin==="ice"?0.35:undefined, slowDur: g.skin==="ice"?1500:undefined, burn: g.skin==="fire"?true:undefined});
        }
        particles.push({x:g.x,y:g.y, life:260, ring:true, maxLife:260, maxR:range, color: g.skin==="fire"?"#ff8a3d":g.skin==="ice"?"#9fe3ff":"#8fae7a"});
      }
    }
  } else {
    const dx=h.x-g.x, dy=h.y-g.y, d=Math.hypot(dx,dy)||1;
    if(d>110){ g.fx=dx/d; g.fy=dy/d; g.moving=true; g.x+=g.fx*70*dt/1000; g.y+=g.fy*70*dt/1000; }
    else g.moving=false;
  }
}

// ---- Encarnación del Abismo: absorbe temporalmente esqueletos+gólem y transforma al
// Nigromante en un demonio más grande y fuerte; al terminar, restaura el ejército (nunca lo
// destruye de forma permanente, tal como pide el diseño).
function nigromanteDemonMods(h){
  const ult = CLASSES.nigromante.ultimate;
  const armySize = (h.nigroAbsorbedSkeletons||0) + (h.nigroAbsorbedGolem?2:0);
  const scale = 1 + Math.min(0.6, armySize*0.08);
  return { hpMult: ult.hpMult*scale, dmgMult: ult.dmgMult*scale };
}
function enterAbyssForm(h, sk){
  h.nigroAbsorbedSkeletons = h.skeletons.filter(s=>s.alive).length;
  h.nigroAbsorbedGolem = !!h.golem;
  h.skeletons = [];
  h.golem = null;
  h.nigroDemonForm = true;
  h.nigroTransformTimer = NIGRO_TRANSFORM_MS;
  h.nigroDemonTimer = sk.duration;
  h.nigroDemonMaxTimer = sk.duration;
  const mods = nigromanteDemonMods(h);
  h._preDemonMaxHp = h.maxHp; h._preDemonHp = h.hp;
  h.maxHp = Math.round(h.maxHp*mods.hpMult);
  h.hp = Math.min(h.maxHp, h.hp + (h.maxHp-h._preDemonMaxHp));
  if(h===player) showBanner("¡ENCARNACIÓN DEL ABISMO!");
  particles.push({x:h.x,y:h.y, life:NIGRO_TRANSFORM_MS, ring:true, maxLife:NIGRO_TRANSFORM_MS, maxR:90, color:"#50e68c"});
}
function exitAbyssForm(h){
  if(!h.nigroDemonForm) return;
  h.nigroDemonForm = false;
  h.nigroTransformTimer = 0;
  if(h._preDemonMaxHp){
    const pct = h.hp/h.maxHp;
    h.maxHp = h._preDemonMaxHp;
    h.hp = Math.max(1, Math.round(h.maxHp*pct));
  }
  // Restaura el ejército absorbido -nunca lo destruye definitivamente-.
  const mastery = masteryOf(h.classKey, 0);
  const maxCount = nigromanteMaxSkeletons(mastery);
  const restoreCount = Math.min(maxCount, h.nigroAbsorbedSkeletons||0);
  const comp = nigromanteSkeletonComposition(restoreCount);
  const talentMods0 = talentSkillMods(h.classKey, 0).flags;
  for(let i=0;i<comp.warriors;i++) spawnNigroSkeleton(h, "warrior", talentMods0);
  for(let i=0;i<comp.mages;i++) spawnNigroSkeleton(h, "mage", talentMods0);
  if(h.nigroAbsorbedGolem) spawnOrRenewGolem(h);
  h.nigroAbsorbedSkeletons = 0; h.nigroAbsorbedGolem = false;
  if(h===player) showBanner("La Encarnación del Abismo ha terminado");
  particles.push({x:h.x,y:h.y, life:420, ring:true, maxLife:420, maxR:70, color:"#50e68c"});
}
function updateNigromanteDemonForm(h, dt){
  if(h.nigroTransformTimer>0) h.nigroTransformTimer -= dt;
  if(!h.nigroDemonForm) return;
  h.nigroDemonTimer -= dt;
  if(h.nigroDemonTimer<=0){ h.nigroDemonTimer=0; exitAbyssForm(h); }
}
