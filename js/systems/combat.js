"use strict";
/* ============================================================
   js/systems/combat.js
   Combate: daño a enemigos y héroes, muertes, botín y búsqueda de objetivos.
   ============================================================ */

function damageEnemy(e, amount, opts){
  opts = opts || {};
  const src = opts.src || player;
  let dmg = amount * (e.dmgTakenMult||1) * (e.curseDefTakenMult||1) * (e.crashVuln ? 1.6 : 1);
  if(e._protT) dmg *= roleDmgTakenMult(e); // bajo el escudo de un Protector (enemy-roles.js)
  // Cangrejo Acorazado (Arena Acuática): defensa frontal alta, muy vulnerable por detrás -e.fx/
  // e.fy ya apuntan hacia donde está mirando (su objetivo actual), así que compara contra eso
  // en vez de armar un sistema de facing nuevo-.
  if(e.type==="cangrejo_acorazado" && src){
    const cdx=e.x-src.x, cdy=e.y-src.y, cl=Math.hypot(cdx,cdy)||1;
    const facing = (cdx/cl)*(e.fx||0) + (cdy/cl)*(e.fy||0);
    if(facing > 0.4) dmg *= 0.4;
    else if(facing < -0.4) dmg *= 1.35;
  }
  // Kraken Joven (Arena Acuática): golpear al Kraken mientras tiene a alguien agarrado acorta
  // el agarre -"liberarse mediante daño", reusando el stunTimer del agarrado en vez de armar un
  // hitbox de tentáculo aparte-.
  if(e.type==="kraken_joven" && e.grabbedHero && e.grabbedHero.alive){
    e.grabbedHero.stunTimer = Math.max(0, (e.grabbedHero.stunTimer||0) - dmg*4);
  }
  // critChanceOverride/critMultOverride (Musashi): su probabilidad/daño crítico cambian golpe
  // a golpe según Concentración y Senda del Rōnin (ver musashiCombatMods), algo que el sistema
  // genérico runStats.critChance/critMult -fijo para toda la partida- no puede representar.
  // Sin overrides, el comportamiento de siempre queda idéntico.
  dmg *= heroDmgOutMult(src) * enemyVulnMult(e); // Granaderos/¡Avancen!/forma montada/titán y defensa rota (San Lorenzo, Andes)
  dmg *= setDamageMult(src, e, opts); // bonus de sets (Glaciar, Cazador, Frenesí, Resonancia, Impulso…)
  dmg *= itemDamageMult(src, e, opts); // poderes de legendarios/míticos (Avivar las Llamas, Verdugo, Cosecha Roja…)
  // tipo de daño -> resistencia/debilidad de la horda de esta arena (js/systems/reactions.js)
  const dmgKind = dmgKindOf(opts);
  const _res = enemyResist(e, dmgKind);
  if(_res){ dmg *= 1 - _res; resistLabel(e, dmgKind, _res, src); }
  // refuerzos de la partida: rematar (enemigo bajo 30% de vida) y cazador de élites/jefes
  if(runStats.executeBonus && e.hp < e.maxHp*0.3) dmg *= 1 + runStats.executeBonus;
  if(runStats.eliteDmgMult!==1 && (e.rank==="elite" || e.rank==="subjefe" || e.rank==="jefe")) dmg *= runStats.eliteDmgMult;
  let critChance = opts.critChanceOverride!==undefined ? opts.critChanceOverride : runStats.critChance;
  let critMult = opts.critMultOverride!==undefined ? opts.critMultOverride : (runStats.critMult||1.8);
  const setCrit = setCritBonus(src, e); if(setCrit){ critChance += setCrit.chance; critMult += setCrit.mult; }
  critMult += itemCritMultBonus(src, e);
  const csc = champSetCritBonus(src, e, opts); if(csc){ critChance += csc.chance; critMult += csc.mult; }
  const crit = opts.forceCrit || Math.random() < critChance;
  if(crit) dmg *= critMult;
  // reacciones entre estados (Conducción, Quiebre, Vapor, Hemorragia): miran los estados de ANTES del golpe
  const _powPre = impactPower(e, dmg, crit, opts, src);
  dmg *= reactionMult(e, dmg, opts, src, _powPre, dmgKind);
  const _hpBefore = Math.max(0, e.hp);
  e.hp -= dmg;
  // Calificación: solo cuenta el daño ÚTIL (el que sobra al rematar no suma: no se puede
  // "farmear" daño pegándole fuerte a enemigos casi muertos).
  const usefulDmg = Math.min(dmg, _hpBefore);
  // Nivel del impacto (1 básico · 2 habilidad · 3 pesado/crítico · 4 ulti): escala la reacción del
  // cuerpo, el destello, el retroceso, la sangre y (para el jugador) el hit-stop y el temblor.
  const pow = impactPower(e, dmg, crit, opts, src);
  e._lastHitPow = pow; e.hitFlash = IMPACT_FLASH_MS[pow];
  e._lastDmgKind = dmgKind;
  if(e.hp <= 0) e._lastOverkill = dmg - _hpBefore;
  if(!opts.fromProc || pow>=3){ const kdx = e.x-(src?src.x:e.x), kdy = e.y-(src?src.y:e.y), kl = Math.hypot(kdx,kdy)||1; if(inView(e.x, e.y, 60)) goreOnHit(e, pow, kdx/kl, kdy/kl); }
  if(src && src.stats){
    src.stats.dmgDealt += usefulDmg;
    if(e.rank==="jefe" || e.rank==="subjefe") src.stats.dmgToBoss += usefulDmg;
    if(!opts.fromBasic) src.stats.abilityHits = (src.stats.abilityHits||0)+1;
  }
  e.lastHitBy = src;
  // B1: los números de daño de un invitado se ven solo en SU pantalla
  if(src && src.isRemote){ netEmitTo(src._netSlot, "floatText", [e.x, e.y-20-(e.radius||20)*0.6, Math.round(dmg), crit?"crit":null]); }
  else if(src===player) netQuiet(()=>floatText(e.x, e.y-20-(e.radius||20)*0.6, Math.round(dmg), crit?"crit":null));
  if(src===player && !src.isRemote && (!player._hitSfxAt || performance.now()-player._hitSfxAt>90)){
    player._hitSfxAt = performance.now();
    playSfx(crit ? "crit" : "hit");
  }
  vfxHit(e, src, opts, crit);
  if(!opts.fromProc || pow>=3) impactFeedback(e, dmg, crit, opts, pow, src);
  if(src && src.classKey && !opts.fromProc){ itemProcsOnHit(src, e, dmg, crit, opts); setsOnHit(src, e, dmg, crit, opts); }
  if(src && src.stats){
    if(e.rank!=="normal") src.stats.dmgToPriority = (src.stats.dmgToPriority||0) + usefulDmg;
    if(opts.slow || opts.stun || opts.freeze || opts.knockback) src.stats.ccApplied = (src.stats.ccApplied||0) + 1;
  }
  // Antes cargaba con el 10% del daño ya escalado por maestría/nivel/buffs, así que al final
  // de la partida (con el daño multiplicado varias veces) un solo golpe llenaba casi toda la
  // barra. Ahora se normaliza contra el daño BASE del propio héroe: siempre hacen falta más o
  // menos la misma cantidad de golpes para cargar la ulti, sin importar cuánto haya escalado.
  if(!(src.classKey==="eren" && src.erenPhase==="rumble")) // El Retumbar no recarga la Furia que lo disparó (termina en 0)
    src.ultCharge = Math.min(src.ultMax, (src.ultCharge||0) + (dmg/Math.max(1,src.baseDmg))*2.6*(runStats.ultChargeMult||1)*(src.classKey==="eren" ? erenFuryGainMult(src) : 1));
  if(src.classKey==="eren") erenCheckRumbling(src);
  if(opts.burn){ e.burnTimer = Math.max(e.burnTimer||0, 2600*uniqueBurnMult(src)); e.burnDmg = Math.max(e.burnDmg||0, amount*0.12); e.burnSrc = src; if(heroUniqueKey(src)==="uniq_archimago") e.voidFire = true; }
  if(opts.bleed){ e.bleedTimer = opts.bleedDur||3000; e.bleedDmg = amount*0.16; e.bleedSrc = src; }
  if(opts.slow){ e.slowTimer = opts.slowDur||2000; e.slowAmt = opts.slow; e.slowBy = src; }
  if(opts.stun){ e.stunTimer = opts.stun; }
  if(opts.knockback){
    const ang = Math.atan2(e.y-src.y, e.x-src.x);
    e.x += Math.cos(ang)*46; e.y += Math.sin(ang)*46;
  }
  if(opts.pull){
    const ang = Math.atan2(src.y-e.y, src.x-e.x);
    e.x += Math.cos(ang)*36; e.y += Math.sin(ang)*36;
  }
  if(runStats.lifesteal>0 && opts.fromBasic){
    src.hp = Math.min(src.maxHp, src.hp + dmg*runStats.lifesteal*arenaRuleHealMult());
  }
  const passiveLifesteal = (src.buffLifesteal||0) + (src.classKey ? passiveSum(src.classKey,"lifesteal_add") : 0) + setLifestealAdd(src);
  if(passiveLifesteal>0){
    const healAmt = dmg*passiveLifesteal*arenaRuleHealMult(), before = src.hp;
    src.hp = Math.min(src.maxHp, src.hp + healAmt);
    // Talento "exceso de curación -> escudo" (Segador/Sanadora): lo que el robo de vida no pudo
    // curar por estar ya en vida máxima se convierte en un escudo, en vez de perderse sin más.
    const overheal = healAmt - (src.hp-before);
    if(overheal>0 && src.classKey){
      const shieldPct = passiveSum(src.classKey, "overheal_shield_pct");
      if(shieldPct>0) src.shield = Math.min(src.maxHp*0.5, (src.shield||0) + overheal*shieldPct);
    }
  }
  if(src.buffBleedOnHit && opts.fromBasic){
    e.bleedTimer = Math.max(e.bleedTimer, 2400); e.bleedDmg = Math.max(e.bleedDmg||0, dmg*0.18);
  }
  // Pasiva "Descarga": probabilidad de electrocutar al golpear (objetos con effect:onhit_proc)
  if(src && src.classKey && opts.fromBasic && !opts.fromProc){
    const procChance = Math.min(0.45, passiveSum(src.classKey,"onhit_proc"));
    if(procChance>0 && Math.random()<procChance){
      damageEnemy(e, dmg*0.6, {src, forceCrit:false, fromProc:true});
      e.stunTimer = Math.max(e.stunTimer||0, 260);
      pushSpark("impacto", e.x, e.y, 50, 300);
    }
  }
  // Segador Olvidado: golpear también genera Furia (además de recibir daño, ver damageHero)
  if(src && src.classKey==="segador"){
    const genMult = src.furyArmorTimer>0 ? (src.furyGenMult||1) : 1;
    src.energy = Math.min(src.maxEnergy, src.energy + dmg*0.11*genMult*setFuryMult(src));
  }
  // Sylva: cada golpe de básico contra el mismo objetivo suma Rastreo (Instinto de Caza,
  // sección 8) -se engancha acá en vez de en el punto de disparo porque su básico es un
  // proyectil que impacta más tarde, y este es el único lugar que ve el impacto real-.
  if(src && src.classKey==="cazadora"){
    if(opts.fromBasic) sylvaAddTrack(src, e, 1);
    // Cacería Salvaje: golpear a la Presa mientras dura la ultimate acorta el cooldown de las
    // 3 habilidades no-ultimate (Lobo Espectral incluido, ya que también llega con src=caster).
    if(src.wildHuntTimer>0 && src.huntTarget===e){
      const cdrAmt = CLASSES.cazadora.ultimate.cdrOnHit||0;
      for(let i=0;i<src.cds.length;i++) src.cds[i] = Math.max(0, (src.cds[i]||0)-cdrAmt);
    }
  }
  if(e.hp<=0 && e.alive){ killEnemy(e); }
}

function killEnemy(e){
  e.alive = false;
  // Muerte según el tipo de daño (gore.js): quemado, hecho añicos, electrocutado, desmembrado...
  e._deathKind = goreDeathKind(e);
  if(e.role) roleOnDeath(e);
  { const s = e.lastHitBy, ddx = s ? e.x-s.x : 0, ddy = s ? e.y-s.y : -1, dl = Math.hypot(ddx,ddy)||1; goreOnDeath(e, e._deathKind, ddx/dl, ddy/dl); }
  // Nigromante — Plaga de los Condenados: el contagio al morir un maldito tiene que dispararse
  // sin importar QUÉ lo mató (antes solo se llamaba desde el tick de daño de la propia maldición,
  // así que un maldito rematado por un golpe normal -el caso más común en la práctica- nunca
  // contagiaba a nadie). Acá se dispara siempre, una sola vez, para cualquier causa de muerte.
  if(e.cursed) nigromantePlagueDeathSpread(e);
  nigroOnEnemyKilled(e); // Cosecha de Almas
  // Musashi: si el que murió era la Marca de Duelo de alguien, hay que limpiarla siempre -
  // nunca debe quedar apuntando a un cadáver-. Si murió DENTRO de un Último Duelo activo con
  // él, es la condición de victoria real (Golpe de Gracia + Senda del Rōnin, ver
  // musashiHandleDuelWin/updateLastDuel); si no, es una marca perdida por una causa externa
  // (otro héroe lo remató primero) y simplemente se limpia sin recompensa.
  if(e.isDuelLocked && e.duelOwner && e.duelOwner.duelActive && e.duelOwner.duelOpponent===e){
    musashiHandleDuelWin(e.duelOwner, e);
  } else {
    for(const h of heroes){ if(h.duelTarget===e){ musashiClearMark(h); } }
  }
  // Sylva: si la Presa muere, la marca se limpia (sección 8, "cambiar de objetivo empieza un
  // nuevo Rastreo" -acá el cambio es forzado porque ya no hay a quién rastrear-).
  for(const h of heroes){ if(h.huntTarget===e){ sylvaClearTrack(h); } }
  kills++;
  if(arenaHas("enemyKilled")) arenaHook("enemyKilled", e); // muertes con efecto propio de la arena
  if(e.lastHitBy && e.lastHitBy.classKey && (e.lastHitBy===player || inView(e.x, e.y, 0))) killFeedback(e, e.lastHitBy===player);
  if(e.rank==="subjefe") subjefesDefeated++;
  if(e.lastHitBy && e.lastHitBy.stats) e.lastHitBy.stats.kills++;
  if(e.lastHitBy && e.lastHitBy.classKey==="segador"){
    const seg = e.lastHitBy;
    // Último Aliento (pasivo): matar con poca vida recupera un poco de HP
    if(seg.hp < seg.maxHp*0.5){
      const healAmt = seg.maxHp*0.03;
      seg.hp = Math.min(seg.maxHp, seg.hp+healAmt);
      floatText(seg.x, seg.y-30, "+"+Math.round(healAmt), "heal");
    }
    // Segador de Almas (ulti): cada baja durante la ulti prolonga su duración
    if(seg.berserkTimer>0){
      seg.berserkTimer += seg.berserkExtendMs;
      seg.buffTimer += seg.berserkExtendMs;
    }
  }
  if(activeChampion === e) activeChampion = null;
  if(e.lastHitBy && e.lastHitBy.classKey){ itemProcsOnKill(e.lastHitBy, e); setsOnKill(e.lastHitBy, e); trackKillPerformance(e.lastHitBy, e); }
  // Ahora la XP la gana quien dio el golpe final, sea el jugador o un aliado — así los
  // bots también suben de nivel durante la partida, simulando a otros jugadores.
  // B1: si el que remató es un invitado, la XP/oro van a SU guardado (el anfitrión se lo avisa)
  // y se calculan con SUS refuerzos; el registro local de su campeón solo sigue la partida.
  const killer = e.lastHitBy && e.lastHitBy.classKey ? e.lastHitBy : null;
  const krs = (killer && killer._net) ? killer._net.runStats : runStats;
  if(killer){
    const xpAmt = Math.round(e.xp*(krs.xpMult||1));
    const leveledUp = grantXP(killer.classKey, xpAmt);
    if(killer.isRemote) netEmitTo(killer._netSlot, "xp", [xpAmt]);
    else if(leveledUp && killer!==player && !killer._net) autoInvestTalentPoints(killer.classKey);
  } else {
    grantXP(player.classKey, Math.round(e.xp*(runStats.xpMult||1)));
  }
  if(Math.random()<0.6){
    const g = Math.round(e.gold*(krs.goldMult||1));
    if(killer && killer.isRemote) netEmitTo(killer._netSlot, "gold", [g]); else grantGold(g);
  }
  if(e.dropsItem && Math.random()<0.42){
    const kinds = ["hp","dmg","def","vel"];
    grantRelic(kinds[Math.floor(Math.random()*kinds.length)]);
    floatText(e.x, e.y-40, "¡Objeto!", "heal");
  }
  // Pociones de vida
  let potionChance = 0.09;
  if(e.rank==="subelite") potionChance = 0.16;
  if(e.rank==="elite") potionChance = 0.30;
  if(e.rank==="subjefe") potionChance = 1.0;
  if(e.rank==="jefe") potionChance = 1.0;
  potionChance = Math.min(1, potionChance * (runStats.potionRateMult||1) * (arenaMods().potionMult||1));
  if(Math.random() < potionChance){
    const n = (e.rank==="subjefe"||e.rank==="jefe") ? 3 : 1;
    for(let i=0;i<n;i++){
      dropPotion(e.x, e.y, "heal");
    }
  }
  // Pociones de energía/maná: caen con más frecuencia que las de vida, ya que ahora las
  // habilidades cuestan bastante más recurso.
  let manaPotionChance = Math.min(1, potionChance * 1.6);
  if(Math.random() < manaPotionChance){
    const n = (e.rank==="subjefe"||e.rank==="jefe") ? 3 : 1;
    for(let i=0;i<n;i++){
      dropPotion(e.x, e.y, "mana");
    }
  }
  if(e===boss){
    onBossDefeated();
  }
  // DEATH: si sigue muerto (un jefe con fases revive dentro de onBossDefeated), su propio
  // cuerpo hace la animación de muerte; si el pool está lleno, cae al "cadáver" de siempre.
  if(!e.alive && e._deathKind!=="shatter" && !vfxOnDeath(e)){
    // sin animación de muerte (fuera de cámara o sin lugar en el pool): el cadáver igual queda en el
    // suelo -es la materia prima del Nigromante, no puede depender de la cámara del anfitrión-
    if(!addCorpse(e, animProfileOf(e).death, e.fx<-0.12 ? -1 : 1, e._deathKind) && inView(e.x, e.y, 100))
      particles.push({x:e.x, y:e.y, life:420, maxLife:420, corpse:true, spriteType:e.type, scale:e.scale, flip:e.fx<-0.12});
  }
}

let _avoidableHit = false; // lo prende bossHitHero: el golpe venía con aviso en el suelo
function damageHero(h, amount, src){
  if(!h || !h.alive) return;
  if(h.invulnTimer>0) return; // p.ej. la breve transición del Teletransporte de Axiom
  { const tk = heroDmgTakenMult(h); if(tk<=0) return; amount *= tk; } // montado / Instinto / titán / cinemáticas
  // Regla de la Arena PvE: sin fuego amigo. Un aliado (héroe, su invocación o su proyectil)
  // nunca daña a otro aliado. Curas/escudos/buffs/revivir no pasan por acá: no se tocan.
  if(!modeRules().friendlyFire && src && src!==h){ const atk = allyAttackerOf(src); if(atk && atk!==h) return; }
  if(!h.isDivineFoe){
    const cap = src && src.rank && DIFF.hitCap[src.rank];
    if(cap && h.maxHp) amount = Math.min(amount, h.maxHp*cap);
    amount *= arenaRuleDmgTakenMult() * setDmgTakenMult(h) * itemDmgTakenMult(h) * heroResistMult(h, src);
  }
  if(h.stats){
    h.stats.dmgTaken += amount; // daño bruto recibido, antes de mitigación/escudo
    if(_avoidableHit) h.stats.avoidableTaken = (h.stats.avoidableTaken||0) + amount; // golpes telegrafiados (se podían esquivar)
  }
  // Espinas (refuerzo): devuelve parte del golpe a quien pegó cuerpo a cuerpo al jugador
  if(h===player && runStats.thorns>0 && src && src.type && src.alive && src.hp>0 && typeof src.maxHp==="number") damageEnemy(src, amount*runStats.thorns, {src:player});
  const defBonus = (h===player) ? runStats.defBonus : 0;
  const passiveDef = h.classKey ? Math.min(0.5, passiveSum(h.classKey,"def_add")) : 0; // "Piel de Brasa"
  let dmg = amount * (1 - h.def) * (1 - defBonus) * (1-(h.buffDefMult?(1-h.buffDefMult):0)) * (1-passiveDef);
  const mitigated = Math.max(0, amount - dmg), dmgBeforeShields = dmg;
  if(h.shield>0){
    const absorbed = Math.min(h.shield, dmg);
    h.shield -= absorbed;
    dmg -= absorbed;
  }
  if(dmg>0 && h.itemShield>0){
    const absorbed = Math.min(h.itemShield, dmg);
    h.itemShield -= absorbed;
    dmg -= absorbed;
  }
  // Guardián Mítico: si el golpe deja el escudo en 0, genera un escudo de emergencia una vez
  // por partida (objetos con effect:mythic_emergency_shield).
  if(dmg>0 && h.shield<=0 && h.itemShield<=0 && !h.emergencyShieldUsed && h.classKey){
    const guardianVal = passiveSum(h.classKey, "mythic_emergency_shield");
    if(guardianVal>0){
      h.itemShield = h.maxHp*guardianVal;
      h.itemMaxShield = Math.max(h.itemMaxShield||0, h.itemShield);
      h.emergencyShieldUsed = true;
      const absorbed = Math.min(h.itemShield, dmg);
      h.itemShield -= absorbed; dmg -= absorbed;
      if(h===player) floatText(h.x, h.y-50, "¡ESCUDO DE EMERGENCIA!", "crit");
    }
  }
  h.hp -= dmg;
  if(h.classKey==="eren" && dmg>0) erenOnHurt(h, dmg);
  const absorbed = Math.max(0, dmgBeforeShields - dmg);
  if(h.stats){ h.stats.mitigated = (h.stats.mitigated||0) + mitigated; h.stats.shieldAbsorbed = (h.stats.shieldAbsorbed||0) + absorbed; }
  if(dmg>0) itemProcsOnHurt(h, dmg, src);
  setsOnHurt(h, Math.max(0,dmg), mitigated, absorbed);
  if(h.isRemote && dmg>0.5) netEmitTo(h._netSlot, "hurt", [dmg, src && src.x, src && src.y]);
  else if(h===player && dmg>0.5) registerPlayerHurt(dmg, src);
  // Historial de daño reciente (solo lo consume Destino Restaurado, de La Profeta): guarda
  // el daño YA mitigado, con timestamp, y se poda a los pocos segundos para no crecer sin
  // límite en partidas largas -ver el filtrado por ventana de tiempo en castAbility.
  if(dmg>0.5){
    if(!h.recentDamage) h.recentDamage = [];
    h.recentDamage.push({amount:dmg, t:performance.now()});
    if(h.recentDamage.length>20) h.recentDamage.shift();
  }
  if(dmg>0.5) h.hurtTimer = 160;
  if(dmg>0.5 && h===player && !h.isRemote && (!player._hurtSfxAt || performance.now()-player._hurtSfxAt>220)){
    player._hurtSfxAt = performance.now();
    playSfx("hurt");
  }
  // Segador Olvidado: recibir daño genera Furia (más si tiene activa la Armadura de la Furia)
  if(h.classKey==="segador" && amount>0.5){
    const furyMult = h.furyArmorTimer>0 ? 1.6 : 1;
    h.energy = Math.min(h.maxEnergy, h.energy + amount*0.16*furyMult*setFuryMult(h));
    // Nivel 4 de la Armadura de la Furia: una parte del daño recibido se convierte en poder
    // ofensivo mientras la Furia esté activa (tope prudente para que no se descontrole).
    if(h.furyArmorTimer>0 && h.furyConvertPct>0){
      h.furyPower = Math.min(h.maxHp*0.4, (h.furyPower||0) + amount*h.furyConvertPct);
      h.buffDmgMult = Math.max(h.buffDmgMult||1, 1 + Math.min(0.35, h.furyPower/Math.max(1,h.maxHp)));
    }
  }
  if(dmg>0.5 && h.stormTimer>0){
    for(const e of enemies){
      if(!e.alive) continue;
      if(distance(h,e) <= 95) damageEnemy(e, h.baseDmg*runStats.dmgMult*0.6, {src:h, burn:true});
    }
    particles.push({x:h.x,y:h.y, life:300, ring:true, maxLife:300, maxR:80, color:"#ff6a3d"});
    for(let i=0;i<5;i++){
      const a = Math.random()*Math.PI*2;
      particles.push({x:h.x, y:h.y, vx:Math.cos(a)*60, vy:Math.sin(a)*60-10, life:260, color:"#ff8a3d"});
    }
  }
  if(dmg>0.5){
    if(h.isRemote) netEmitTo(h._netSlot, "floatText", [h.x, h.y-30, "-"+Math.round(dmg)]);
    else if(h===player) netQuiet(()=>floatText(h.x, h.y-30, "-"+Math.round(dmg)));
    vfxBurst(h.x, h.y-20, 3, "blood", 80, 200, 3, h===player?2:1, -20, 0);
  }
  if(h.hp<=0 && heroPreventDeath(h, src)){ /* Soldado Cabral: no muere */ }
  else if(h.hp<=0){
    h.hp = 0;
    if(h===player){ onPlayerDeath(); }
    else {
      h.alive = false;
      showBanner(`${h.cls.name} ha caído`);
      for(let i=0;i<12;i++) particles.push({x:h.x,y:h.y, vx:(Math.random()-0.5)*160, vy:(Math.random()-0.5)*160, life:500, color:h.cls.color});
      if(h.isBossChamp) vfxOnDeath(h); // jefe divino (entidad tipo enemigo): muerte con su sprite
    }
  }
}
function nearestHeroTo(x, y){
  let best=null, bestD=Infinity;
  for(const h of heroes){
    if(!h.alive || h.stealthTimer>0) continue;
    const d = Math.hypot(h.x-x, h.y-y);
    if(d<bestD){ bestD=d; best=h; }
  }
  return best;
}
function nearestEnemyTo(ent, range){
  let best=null, bestD=Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    // Musashi: mientras un enemigo está adentro de un Último Duelo, nadie más que su propio
    // dueño puede "verlo" como objetivo -así ningún aliado/otro héroe intenta perseguirlo
    // hasta la arena de bolsillo, aislamiento real de la sección 15-.
    if(e.isDuelLocked && e.duelOwner!==ent) continue;
    const d = distance(ent,e);
    if(d<bestD && (!range||d<=range)){ bestD=d; best=e; }
  }
  return best;
}
