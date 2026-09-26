"use strict";
/* ============================================================
   js/ai/allies.js
   IA de los aliados controlados por bots: uso de habilidades, revivir y movimiento.
   ============================================================ */

/* ============================================================
   ALIADOS CONTROLADOS POR IA (los otros 3 campeones)
   ============================================================ */
function botTryAbilities(h){
  const passiveCdMult = Math.max(0.4, 1 - passiveSum(h.classKey,"cd_mult"));
  // El Libertador / Eren: IA propia (js/champions/libertador.js, eren.js)
  if(h.classKey==="libertador" && !divinaMode){ botLibertador(h, passiveCdMult); return; }
  if(h.classKey==="eren" && !divinaMode){ botEren(h, passiveCdMult); return; }
  // Musashi (IA, sección 27): nunca desperdicia Último Duelo sin una Marca válida, y prioriza
  // objetivos valiosos (élite/subjefe/jefe) o una presa ya baja de vida (posibilidad real de
  // ejecución) en vez de tirarlo contra cualquier chusma en cuanto se carga.
  if(h.classKey==="musashi" && h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL){
    const t = h.duelTarget;
    const worthIt = t && t.alive && !t.isDuelLocked && (t.rank==="jefe"||t.rank==="subjefe"||t.rank==="elite" || t.hp/t.maxHp < 0.45);
    if(worthIt){
      castAbility(h, h.cls.ultimate, true);
      h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, "ult");
      return;
    }
    // objetivo no vale la pena todavía: sigue acumulando Concentración con habilidades normales
  } else if(h.classKey==="cazadora" && h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL){
    // Sylva (IA): reserva Cacería Salvaje para grupos o para una Presa de alto valor, en vez
    // de gastarla contra un único enemigo débil.
    const nearCountUlt = enemies.filter(e=>e.alive && distance(h,e)<=260).length;
    const worthIt = nearCountUlt>=3 || (h.huntTarget && h.huntTarget.alive && (h.huntTarget.rank==="jefe"||h.huntTarget.rank==="subjefe"||h.huntTarget.rank==="elite"));
    if(worthIt){
      castAbility(h, h.cls.ultimate, true);
      h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, "ult");
      return;
    }
  } else if(h.classKey==="nigromante" && h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL){
    // Nigromante (IA): reserva Encarnación del Abismo para amenazas grandes -sacrifica
    // temporalmente su ejército, así que no vale la pena tirarla contra chusma suelta-.
    const nearCountUlt = enemies.filter(e=>e.alive && distance(h,e)<=300).length;
    const bigThreat = enemies.some(e=>e.alive && (e.rank==="jefe"||e.rank==="subjefe") && distance(h,e)<=420);
    if(nearCountUlt>=4 || bigThreat){
      castAbility(h, h.cls.ultimate, true);
      h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, "ult");
      return;
    }
  } else if(h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL){
    castAbility(h, h.cls.ultimate, true);
    h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, "ult");
    return;
  }
  // Musashi (IA): prioridad simple en vez del orden aleatorio genérico -Paso Fantasma para
  // escapar con poca vida, Mil Cortes contra grupos, si no Corte del Rōnin para acumular
  // Concentración contra su Marca (sección 27: "mantener el mismo objetivo").
  if(h.classKey==="musashi"){
    const nearCount = enemies.filter(e=>e.alive && !(e.isDuelLocked&&e.duelOwner!==h) && distance(h,e)<=150).length;
    let priority = [0,1,2];
    if(h.hp/h.maxHp < 0.45) priority = [1,0,2];
    else if(nearCount>=3) priority = [2,0,1];
    else priority = [0,2,1];
    for(const idx of priority){
      const sk = h.cls.skills[idx];
      if(h.cds[idx]>0 || h.energy < sk.cost) continue;
      if(!nearestEnemyTo(h, 260) && !h.duelTarget) continue;
      h.energy -= sk.cost;
      h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, idx);
      if(sk.kind==="ghost_step" && h.duelActive) h.cds[idx] *= musashiGhostStepCdMult(h);
      castAbility(h, sk, false, idx);
      return;
    }
    return;
  }
  // Sylva (IA): Trampa del Bosque si algo cuerpo a cuerpo está encima, Lluvia de la Cazadora
  // contra grupos, si no Flecha Perforante (siempre disparada al máximo de carga: la IA no
  // necesita el detalle de mantener apretado el botón, ver useSylvaPiercingShot).
  if(h.classKey==="cazadora"){
    const nearCount = enemies.filter(e=>e.alive && distance(h,e)<=220).length;
    const meleeThreat = enemies.some(e=>e.alive && !e.ranged && distance(h,e)<=90);
    let priority;
    if(meleeThreat) priority = [1,0,2];
    else if(nearCount>=3) priority = [2,0,1];
    else priority = [0,1,2];
    for(const idx of priority){
      const sk = h.cls.skills[idx];
      if(h.cds[idx]>0 || h.energy < sk.cost) continue;
      if(!nearestEnemyTo(h, 320) && !h.huntTarget) continue;
      h.energy -= sk.cost;
      h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, idx);
      if(sk.kind==="piercing_shot") h.pendingChargeMs = SYLVA_CHARGE_MAX_MS;
      castAbility(h, sk, false, idx);
      return;
    }
    return;
  }
  // Nigromante (IA, sección 3 del diseño): mantener el ejército al máximo primero, invocar
  // gólem si no tiene, Plaga contra grupos, y si está transformado solo puede usar Plaga (las
  // otras dos quedan reemplazadas por las habilidades demoníacas del básico).
  if(h.classKey==="nigromante"){
    if(h.nigroDemonForm){
      const sk = h.cls.skills[2];
      if(h.cds[2]<=0 && h.energy>=sk.cost && nearestEnemyTo(h, sk.range||300)){
        h.energy -= sk.cost;
        h.cds[2] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, 2)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, 2);
        castAbility(h, sk, false, 2);
      }
      return;
    }
    const nearCount = enemies.filter(e=>e.alive && distance(h,e)<=260).length;
    // Pacto: gastar almas cuando hay mucha horda cerca (o el gólem necesita la furia)
    if(!h.nigroPact && (h.nigroSouls||0) >= 7 && nearCount >= 5) nigroTogglePact(h);
    let priority = [];
    if(!h.golem) priority.push(1);
    if(nearCount>=3) priority.push(2);
    if(nearestEnemyTo(h, 200)) priority.push(0);
    if(h.golem && nearCount>=4) priority.push(1); // ¡Aplasta! sobre el grupo
    for(const idx of priority){
      const sk = h.cls.skills[idx];
      if(h.cds[idx]>0 || h.energy < sk.cost) continue;
      if(idx===2 && !nearestEnemyTo(h, sk.range||300)) continue;
      h.energy -= sk.cost;
      h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, idx);
      castAbility(h, sk, false, idx);
      return;
    }
    return;
  }
  const order = [0,1,2].sort(()=>Math.random()-0.5);
  for(const idx of order){
    const sk = h.cls.skills[idx];
    if(h.cds[idx]>0 || h.energy < sk.cost) continue;
    const supportKinds = ["team_heal","team_heal_aoe","team_shield_buff","sacrifice","team_regen","retro_heal","brief_immunity"];
    const isSupport = supportKinds.includes(sk.kind);
    // curas: solo si alguien al alcance está herido; escudos: también cuando un jefe carga un golpe
    const R = sk.radius || 9999;
    const teamHurt = heroes.some(o=>o.alive && o.hp/o.maxHp<0.62 && distance(h,o) <= R);
    const bossThreat = sk.kind==="team_shield_buff" && boss && boss.alive && boss.bossWind && heroes.some(o=>o.alive && distance(h,o)<=R && distance(boss,o) < 360);
    if(isSupport && !teamHurt && !bossThreat) continue;
    if(!isSupport && !(divinaMode ? divinaHostiles("player", h.x, h.y, 300) : nearestEnemyTo(h, 300))) continue;
    h.energy -= sk.cost;
    h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(h.classKey, idx);
    if(sk.kind==="teleport_blink") h.cds[idx] = resolveTeleportCd(h, h.cds[idx]);
    if(sk.kind==="ghost_step" && h.duelActive) h.cds[idx] *= musashiGhostStepCdMult(h);
    castAbility(h, sk, false, idx);
    return;
  }
}

/* ---------------- REVIVIR (autoritativo) ----------------
   Lo decide SIEMPRE la simulación (la partida local o el anfitrión en cooperativo), nunca la
   pantalla de quien revive:
   - Un caído tiene a lo sumo UN reanimador a la vez (candado): a._reviveBy / a._reviveT (ms
     acumulados) / a._reviveDur (humano 1,3 s con el botón, bot 2,4 s). Todos lo ven igual.
   - El progreso vuelve a 0 al instante si el reanimador suelta el botón, se aleja, cae, queda
     aturdido, se desconecta, el caído deja de ser válido o la partida termina; y si un bot deja
     de revivirlo más de REVIVE_GRACE_MS. Nunca queda un "reviviendo" fantasma.
   - Recibir daño NO interrumpe (el aturdimiento sí).
   - Los humanos mantienen el botón: h._revHold = índice (en heroes) del caído; el invitado lo
     pide con {k:"revive", slot, on}. Los bots avanzan desde botMove (bot-brain.js). */
// Un bot que esquiva un aviso un instante no pierde lo avanzado; si deja de revivir más de esto,
// vuelve a 0. Las interrupciones de un humano (soltar, alejarse, caer, aturdido, desconexión) son
// inmediatas (cancelRevivesBy).
const REVIVE_GRACE_MS = 350;
function reviveBusyFor(a, r){
  if(!a || !a._reviveBy || a._reviveBy===r) return false;
  if(netIsGuest()) return a._reviveT > 0; // el invitado solo ve lo que manda el anfitrión
  return a._reviveBy.alive && runElapsedMs - (a._revTouchAt||0) <= REVIVE_GRACE_MS;
}
function reviverCanAct(r){ return !!(r && r.alive && !(r.stunTimer>0) && !r.fused); }
function cancelRevivesBy(r){ if(!r || !heroes) return; for(const a of heroes){ if(a._reviveBy===r){ a._reviveBy = null; a._reviveT = 0; } } }
// Un cuadro de progreso de r sobre a. Devuelve true si lo terminó de revivir.
function reviveStep(a, r, dur, dt){
  if(a._reviveBy!==r){ a._reviveBy = r; a._reviveT = 0; }
  a._reviveDur = dur; a._revTouchAt = runElapsedMs;
  a._reviveT = (a._reviveT||0) + dt;
  if(a._reviveT >= dur){ reviveHero(a, r); return true; }
  return false;
}
function updateRevives(dt){
  for(const r of heroes){
    if(r._revHold===undefined || r._revHold<0) continue;
    const a = heroes[r._revHold];
    const ok = state==="playing" && !runEnding && !divinaMode && reviverCanAct(r) && a && a!==r && !a.alive
      && distance(r, a) < REVIVE_RANGE + (r.isRemote ? 20 : 0) && !reviveBusyFor(a, r);
    if(!ok){ r._revHold = -1; cancelRevivesBy(r); continue; }
    if(reviveStep(a, r, REVIVE_BTN_HOLD_MS, dt)) r._revHold = -1;
  }
  for(const a of heroes){
    if(a.alive){ if(a._reviveBy || a._reviveT){ a._reviveBy = null; a._reviveT = 0; } continue; }
    const by = a._reviveBy;
    if(by && (runEnding || !reviverCanAct(by) || runElapsedMs - (a._revTouchAt||0) > REVIVE_GRACE_MS)){ a._reviveBy = null; a._reviveT = 0; }
  }
}
// Revive al instante (lo usan las pruebas y herramientas); el botón usa el progreso de arriba.
function tryReviveAlly(a){
  if(state!=="playing" || !a || a.alive) return;
  if(distance(player, a) >= REVIVE_RANGE) return;
  if(netIsGuest()) return;
  reviveHero(a, player);
}
function heroLabel(h){ return h ? (h.netName && h.netName!=="BOT" ? h.netName : h.cls.name) : ""; }
// Revivir (lo usa el jugador con el botón y también los bots entre sí, ver bot-brain.js).
function reviveHero(a, by){
  if(state!=="playing" || !a || a.alive) return;
  if(by && by.stats) by.stats.revives++;
  a._reviveT = 0; a._reviveBy = null;
  a.alive = true;
  a.hp = Math.max(1, Math.round(a.maxHp*setReviveHpPct(by)));
  setsOnRevive(by);
  a.stunTimer=0; a.shield=0; a.shieldTimer=0; a.itemShield = a.itemMaxShield||0;
  a.buffDmgMult=1; a.buffAtkSpeedMult=1; a.buffDefMult=1; a.buffLifesteal=0; a.buffBleedOnHit=false; a.buffTimer=0;
  a.regenTimer=0; a.regenPerSec=0;
  a.spinTimer=0; a.stormTimer=0; a.stealthTimer=0; a.stealthPending=false;
  a.colossalTimer=0; a.pendingHpBonus=0; a.atkAuraTimer=0; a.shieldAuraTimer=0; a.growTimer=0; a.growScale=1; a.sigilTimer=0;
  a.basicCd=0; a.cds=[0,0,0]; a.ultCd=0;
  a.presagioCharges=0; a.presagioComboTimer=0; a.profetaSpinFxTimer=0; a.recentDamage=[];
  a.visionImmortalTimer=0; a.ascensionTimer=0; a.ascensionMaxTimer=0; a.ascensionFusedWith=null; a.fused=false;
  a.moving=false; a.animT=0; a.attackAnim=0;
  for(let i=0;i<14;i++) particles.push({x:a.x,y:a.y, vx:(Math.random()-0.5)*90, vy:-40-Math.random()*70, life:650, color:"#8effb4"});
  particles.push({x:a.x,y:a.y, life:650, ring:true, maxLife:650, maxR:64, color:"#8effb4"});
  particles.push({x:a.x,y:a.y, life:650, maxLife:650, spin:true, radius:44, color:"#8effb4"});
  showBanner(by && by!==player ? `${heroLabel(by)} revivió a ${heroLabel(a)}` : `${heroLabel(a)} ha revivido`);
}

function updateAllies(dt){
  for(const h of allies){
    if(!h.alive) continue;
    if(h.isRemote) continue; // B1: lo maneja su dueño (netHostUpdateRemotes), no la IA
    if(axiomFreezeTimer>0 && h!==axiomFreezeCaster) continue; // Force Quit: nadie mas actua
    if(h.stunTimer>0){ h.stunTimer-=dt; continue; } // congelado (p.ej. Nova de Escarcha): no actúa
    h.basicCd = Math.max(0, h.basicCd-dt);
    for(let i=0;i<3;i++) h.cds[i] = Math.max(0, h.cds[i]-dt);
    h.ultCd = Math.max(0, h.ultCd-dt);
    h.energy = Math.min(h.maxEnergy, h.energy + h.cls.energyRegen*arenaMods().heroEnergyRegenMult*arenaRuleEnergyRegenMult()*dt/1000);
    if(h.shieldTimer>0){ h.shieldTimer-=dt; if(h.shieldTimer<=0) h.shield=0; }
    if(h.buffTimer>0){ h.buffTimer-=dt; if(h.buffTimer<=0){ h.buffDmgMult=1; h.buffAtkSpeedMult=1; h.buffLifesteal=0; h.buffDefMult=1; h.buffBleedOnHit=false; h.spinDurationMult=1; h.colossalTimer=0; if(h.pendingHpBonus){ h.maxHp-=h.pendingHpBonus; h.hp=Math.min(h.hp,h.maxHp); h.pendingHpBonus=0; } } }
    if(h.furyArmorTimer>0){
      h.furyArmorTimer -= dt;
      // Ojos y aura carmesí: partículas oscuras/rojas mientras dura la Armadura de la Furia
      if(Math.random()<0.55) particles.push({x:h.x+(Math.random()-0.5)*22, y:h.y-8+(Math.random()-0.5)*12, vx:(Math.random()-0.5)*14, vy:-16-Math.random()*12, life:320, color:Math.random()<0.5?"#c62828":"#1a1414"});
      if(h.furyArmorTimer<=0 && h.furyFinalSlash){ triggerFuryFinalSlash(h); h.furyFinalSlash=false; }
    }
    if(h.berserkTimer>0) h.berserkTimer -= dt;
    if(h.dashFxTimer>0) h.dashFxTimer -= dt;
    if(h.burnTimer>0){ h.burnTimer-=dt; h.hp = Math.max(0, h.hp - h.burnDmg*dt/1000); if(h.hp<=0 && h.alive){ h.alive=false; if(h===player) onPlayerDeath(); } }
    if(h.slowTimer>0){ h.slowTimer-=dt; if(h.slowTimer<=0) h.slowAmt=0; }
    if(h.invulnTimer>0) h.invulnTimer-=dt;
    if(h.teleportChargeTimer>0){
      h.teleportChargeTimer -= dt;
      if(h.teleportChargeTimer<=0 && h.teleportChargesBanked<h.teleportChargeMax){
        h.teleportChargesBanked++;
        h.teleportChargeTimer = h.teleportChargesBanked<h.teleportChargeMax ? TELEPORT_CHARGE_RECHARGE_MS : 0;
      }
    }
    // La Profeta: ver los mismos campos espejados en update() (jugador) más abajo -comentados
    // ahí con más detalle- para Danza del Presagio, Visión del Inmortal y Ascensión del Elegido.
    if(h.presagioComboTimer>0){ h.presagioComboTimer-=dt; if(h.presagioComboTimer<=0) h.presagioCharges=0; }
    if(h.profetaSpinFxTimer>0) h.profetaSpinFxTimer-=dt;
    // Musashi: ver los mismos campos espejados en update() (jugador) más abajo.
    if(h.comboTimer>0){ h.comboTimer-=dt; if(h.comboTimer<=0) h.comboCharges=0; }
    if(h.ghostStepCritTimer>0) h.ghostStepCritTimer-=dt;
    if(h.visionImmortalTimer>0){ h.visionImmortalTimer-=dt; if(h.visionImmortalTimer<=0){ h.regenTimer=Math.max(h.regenTimer||0,2000); h.regenPerSec=h.maxHp*(h.visionImmortalRegenPct||0.05); } }
    if(h.ascensionTimer>0){
      h.ascensionTimer -= dt;
      h.cds[0]=Math.min(h.cds[0],60); h.cds[1]=Math.min(h.cds[1],60); h.cds[2]=Math.min(h.cds[2],60); h.ultCd=Math.min(h.ultCd,60);
      if(h.ascensionTimer<=0) h.ascensionMaxTimer=0;
    }
    if(h.ascensionFusedWith){
      if(h.stealthTimer>0 && h.ascensionFusedWith.alive){ h.x=h.ascensionFusedWith.x; h.y=h.ascensionFusedWith.y; }
      else { h.ascensionFusedWith=null; h.fused=false; }
    }
    if(h.colossalTimer>0) h.colossalTimer -= dt;
    if(h.growTimer>0){ h.growTimer -= dt; if(h.growTimer<=0) h.growScale=1; }
    if(h.atkAuraTimer>0) h.atkAuraTimer -= dt;
    if(h.shieldAuraTimer>0) h.shieldAuraTimer -= dt;
    if(h.sigilTimer>0) h.sigilTimer -= dt;
    if(h.stealthTimer>0){
      h.stealthTimer -= dt;
      if(h.stealthTimer<=0 && h.stealthPending){ h.stealthPending=false; performShadowStrike(h); }
    }
    if(h.spinTimer>0){
      h.spinTimer -= dt; h.spinTick -= dt;
      if(h.spinTick<=0){
        h.spinTick = h.spinTickInterval;
        for(const e of enemies){
          if(!e.alive) continue;
          if(distance(h,e) <= h.spinRadius) damageEnemy(e, h.spinDmg, {src:h});
        }
        for(let i=0;i<4;i++) particles.push({x:h.x+(Math.random()-0.5)*24, y:h.y+(Math.random()-0.5)*24, vx:0, vy:-14, life:220, color:"#9fe3ff"});
      }
    }
    if(h.stormTimer>0){
      h.stormTimer -= dt; h.stormTick -= dt;
      // Armadura de fuego: aura de brasas constante mientras dura el Cataclismo (cosmético;
      // el bonus real de defensa ya se aplicó como buff al lanzar la habilidad)
      if(Math.random()<0.5) particles.push({x:h.x+(Math.random()-0.5)*20, y:h.y-10+(Math.random()-0.5)*10, vx:(Math.random()-0.5)*10, vy:-18-Math.random()*10, life:340, color:"#ff8a3d"});
      // Campo de hielo: cristales que emergen del suelo dentro del área
      if(Math.random()<0.10){
        const ca=Math.random()*Math.PI*2, cr=Math.random()*h.stormRadius;
        particles.push({x:h.x+Math.cos(ca)*cr, y:h.y+Math.sin(ca)*cr*0.55, life:700, maxLife:700, crystal:true, size:7+Math.random()*6, angle:Math.random()*Math.PI, color:"#bfe8ff"});
      }
      // 2ª y 3ª nova de hielo del Cataclismo, repartidas en el tiempo
      if(h.stormNovaLeft>0){
        h.stormNovaTimer -= dt;
        if(h.stormNovaTimer<=0){
          h.stormNovaTimer = h.stormNovaInterval;
          h.stormNovaLeft--;
          for(const e of enemies){
            if(!e.alive) continue;
            if(distance(h,e) <= h.stormRadius) damageEnemy(e, h.stormNovaDmg, {slow:h.stormNovaFreeze, slowDur:h.stormNovaFreezeDur, src:h});
          }
          frostNovaVFX(h, h.stormRadius*0.85, 8); // la ulti siempre se ve al máximo nivel visual
        }
      }
      if(h.stormTick<=0){
        h.stormTick = h.stormTickInterval;
        const near = enemies.filter(e=>e.alive && distance(h,e)<=h.stormRadius);
        if(near.length){
          const target = near[(Math.random()*near.length)|0];
          damageEnemy(target, h.stormDmg, {src:h, slow:0.3, slowDur:900});
          pushChainBolt(target.x, target.y-180, target.x, target.y, 30, 360);
          pushSpark("impacto", target.x, target.y, 60, 320);
          target.electrifiedTimer = 420; target.electrifiedSize = 60;
        }
      }
    }
    if(h.regenTimer>0){ h.regenTimer-=dt; h.hp = Math.min(h.maxHp, h.hp + (h.regenPerSec||0)*dt/1000); }
    if(h.attackAnim>0) h.attackAnim -= dt;
    if(h.hurtTimer>0) h.hurtTimer -= dt;

    // Movimiento por ROL (bot-brain.js): esquivar avisos, revivir, reagruparse, interceptar,
    // cazar élites, buscar grupos o cuidar al más herido. La poción sigue teniendo prioridad
    // si está herido y no hay peligro encima.
    const bm = botMove(h, dt);
    const target = bm.target;
    let mx = bm.mx, my = bm.my;
    let seekPotion = null;
    if(!bm.dodging && !bm.reviving && (h.hp < h.maxHp*0.75 || h.energy < h.maxEnergy*0.3) && potions.length){
      let bd = Infinity;
      for(const p of potions){
        if(p.type==="mana" && h.energy >= h.maxEnergy*0.3) continue;
        if(p.type!=="mana" && h.hp >= h.maxHp*0.75) continue;
        const d = distance(h,p);
        if(d < 420 && d < bd && (!arenaHas("heroReachable") || arenaHook("heroReachable", h, p))){ bd = d; seekPotion = p; }
      }
    }
    if(seekPotion){
      const dx = seekPotion.x-h.x, dy = seekPotion.y-h.y, l = Math.hypot(dx,dy)||1;
      mx = dx/l; my = dy/l; h.fx = mx; h.fy = my;
    } else if(target && !bm.dodging){
      const dx = target.x-h.x, dy = target.y-h.y, l = Math.hypot(dx,dy)||1;
      h.fx = dx/l; h.fy = dy/l;
    }
    for(const o of heroes){
      if(o===h || !o.alive) continue;
      const d = distance(h,o);
      if(d < 34 && d > 0.01){ mx += (h.x-o.x)/d*0.6; my += (h.y-o.y)/d*0.6; }
    }
    const ml = Math.hypot(mx,my);
    h.moving = ml > 0.05 && !h.fused;
    if(h.moving){
      mx/=ml; my/=ml;
      const nd = bm.navd ? null : aidAllyDir(h, mx, my); if(nd){ mx = nd.x; my = nd.y; } // (navd: ya sigue su propio camino, p.ej. a un objetivo contextual)
      const spd = h.baseSpeed * runStats.speedMult * arenaRuleSpeedMult() * setSpeedMult(h) * (1-Math.min(0.8,h.slowAmt||0)) * heroSpeedMult(h);
      h.x += mx*spd*dt/1000; h.y += my*spd*dt/1000;
      if(!target){ h.fx = mx; h.fy = my; }
      clampToArena(h);
      resolveWallCollision(h);
      h.animT += dt;
    }
    triggerBasic(h);
    if(Math.random() < dt/650) botTryAbilities(h);
  }
}
