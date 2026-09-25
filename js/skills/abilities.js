"use strict";
/* ============================================================
   js/skills/abilities.js
   Motor de habilidades compartido por jugador y bots: ataque básico, uso de
   habilidades/ulti y castAbility() (qué hace cada tipo de habilidad).
   ============================================================ */

function triggerBasic(caster){
  caster = caster || player;
  if(caster.basicCd>0 || !caster.alive) return;
  if(caster===player && state!=="playing") return;
  if(axiomFreezeTimer>0 && caster!==axiomFreezeCaster) return; // Force Quit: nadie mas actua
  if(caster.fused) return; // La Profeta fusionada (Ascensión del Elegido): no actúa ella misma
  const cls = caster.cls;
  const mythicBonus = mythicExecuteBonus(caster); // Sobrecarga Mítica: bonus si vida<50%
  const aspd = (1 + passiveSum(caster.classKey,"atkspeed_mult") + mythicBonus) * setAtkSpeedMult(caster);

  // La Profeta — Danza del Presagio: su básico es siempre cuerpo a cuerpo (mismo criterio de
  // rango/objetivo que el resto de las clases melee) pero cada golpe acumula una carga de
  // "Presagio"; al llegar al máximo se dispara sola "Giro del Presagio" (triggerPresagioSpin)
  // y el contador se reinicia. Vive fuera del bloque genérico de abajo porque necesita su
  // propio contador por golpe, algo que ninguna otra clase usa en su básico.
  if(caster.classKey==="profeta" && !divinaMode){
    const target = nearestEnemyTo(caster, cls.basicRange);
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * aspd);
    } else {
      if(!target) return;
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * aspd);
    }
    if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
    caster.attackAnim = 190;
    const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus);
    let hitSomething = false;
    for(const e of enemies){
      if(!e.alive) continue;
      if(distance(caster,e) <= cls.basicRange){
        damageEnemy(e, dmg, {fromBasic:true, src:caster});
        hitSomething = true;
      }
    }
    spawnSlash(caster);
    if(hitSomething){
      caster.presagioComboTimer = PROFETA_COMBO_WINDOW_MS;
      caster.presagioCharges = (caster.presagioCharges||0)+1;
      if(caster.presagioCharges >= PROFETA_PRESAGIO_MAX){
        caster.presagioCharges = 0;
        triggerPresagioSpin(caster, dmg);
      }
    }
    return;
  }

  // Musashi — combo de 3 golpes con el bokken (sección 6): golpe/golpe/golpe fuerte, siempre
  // single-target (a diferencia del básico "pega a todo lo que esté en rango" del resto del
  // roster cuerpo a cuerpo) porque su identidad es el duelo 1 contra 1, no el barrido de área.
  // Prioriza a su Marca de Duelo si está en rango; si no, ataca al enemigo más cercano -y ESE
  // pasa a ser la nueva Marca, section 7-.
  if(caster.classKey==="musashi" && !divinaMode){
    const target = (caster.duelTarget && caster.duelTarget.alive && distance(caster,caster.duelTarget)<=cls.basicRange)
      ? caster.duelTarget : nearestEnemyTo(caster, cls.basicRange);
    const duelMods = musashiDuelUltMods(caster);
    const totalAspd = aspd * duelMods.atkSpeedMult;
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * totalAspd);
    } else {
      if(!target) return;
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * totalAspd);
    }
    if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
    caster.attackAnim = 190;
    if(caster.comboTimer<=0) caster.comboCharges = 0;
    const comboStep = (caster.comboCharges||0) % 3;
    const isStrongHit = comboStep===2;
    const mods = musashiCombatMods(caster);
    const baseDmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus);
    const finalDmg = baseDmg * (isStrongHit ? 1.6 : 1.0) * mods.dmgMult;
    let hitSomething = false;
    if(target && distance(caster,target) <= cls.basicRange){
      const critOpts = {fromBasic:true, src:caster, critChanceOverride: caster.ghostStepCritTimer>0 ? 1 : mods.critChance, critMultOverride: mods.critMult};
      damageEnemy(target, finalDmg, critOpts);
      caster.ghostStepCritTimer = 0; // el crítico garantizado de Paso Fantasma se consume con este golpe
      musashiAddConcentration(caster, target, 1);
      hitSomething = true;
      // Duelo Perfecto (10 cargas): los básicos generan un pequeño segundo corte demorado.
      if(mods.perfect){
        musashiSecondCuts.push({caster, target, dmg:finalDmg*0.3, critChance:mods.critChance, critMult:mods.critMult, timer:150});
      }
    }
    spawnSlash(caster);
    if(hitSomething){
      caster.comboCharges = (caster.comboCharges||0)+1;
      caster.comboTimer = MUSASHI_COMBO_WINDOW_MS;
      if(caster===player && isStrongHit) floatText(caster.x, caster.y-40, "¡GOLPE FUERTE!", "crit");
    }
    return;
  }

  // Sylva — flecha básica (sección 6/9): proyectil a distancia con auto-target normal, marca
  // Rastreo al impactar (ver el hook dentro de damageEnemy, no acá: el proyectil pega más
  // tarde). La velocidad de disparo real (Rastreo+Impulso) acorta attackAnim, así el combo de
  // sprites reales cicla más rápido solo -sin un sistema de animación aparte, sección 6-.
  if(caster.classKey==="cazadora" && !divinaMode){
    const mods = sylvaCombatMods(caster);
    const totalAspd = aspd * mods.atkSpeedMult;
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * totalAspd);
    } else {
      const t = nearestEnemyTo(caster, cls.basicRange);
      if(!t) return;
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * totalAspd);
    }
    const target = (caster.huntTarget && caster.huntTarget.alive && distance(caster,caster.huntTarget)<=cls.basicRange)
      ? caster.huntTarget : nearestEnemyTo(caster, cls.basicRange);
    let dx=caster.fx, dy=caster.fy;
    if(target){ dx=target.x-caster.x; dy=target.y-caster.y; const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l; caster.fx=dx; caster.fy=dy; }
    caster.attackAnim = Math.max(70, 190/totalAspd);
    const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus) * mods.dmgMult;
    projectiles.push({x:caster.x, y:caster.y-14, vx:dx*480, vy:dy*480, dmg, life:750, radius:6, color:"#c8f0a8",
      fromBasic:true, pierce:false, src:caster, critChanceOverride: runStats.critChance+mods.critChanceAdd});
    spawnSlash(caster);
    return;
  }

  // Nigromante — Proyectil de Hueso: básico a distancia con auto-target, bonus de daño contra
  // enemigos afectados por su propia Plaga (sección 2). Reemplazado por "Garras del Abismo"
  // (cono cuerpo a cuerpo) mientras dure la Encarnación del Abismo (sección 6).
  if(caster.classKey==="nigromante" && !divinaMode){
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * aspd);
    } else {
      const t = nearestEnemyTo(caster, caster.nigroDemonForm ? 90 : cls.basicRange);
      if(!t) return;
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * aspd);
    }
    // Talento "Vínculo Profano": cada esqueleto vivo suma un poco de daño mágico propio.
    const skeletonAuraBonus = (talentSkillMods(caster.classKey, 0).flags.skeletonDmgAuraPct||0) * caster.skeletons.length;
    const dmgBase = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus + skeletonAuraBonus);
    if(caster.nigroDemonForm){
      // Garras del Abismo: cono corto cuerpo a cuerpo, golpea a todo lo que esté delante.
      const target = nearestEnemyTo(caster, 100);
      if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
      caster.attackAnim = 220;
      const demonMods = nigromanteDemonMods(caster);
      const clawDmg = dmgBase * 1.5 * demonMods.dmgMult;
      for(const e of enemies){
        if(!e.alive || distance(caster,e) > 100) continue;
        const dx=e.x-caster.x, dy=e.y-caster.y, l=Math.hypot(dx,dy)||1;
        const dot = (dx/l)*caster.fx + (dy/l)*caster.fy;
        if(dot < 0.25) continue; // fuera del cono frontal
        damageEnemy(e, clawDmg, {fromBasic:true, src:caster});
      }
      spawnSlash(caster);
      return;
    }
    const target = nearestEnemyTo(caster, cls.basicRange);
    let dx=caster.fx, dy=caster.fy;
    if(target){ dx=target.x-caster.x; dy=target.y-caster.y; const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l; caster.fx=dx; caster.fy=dy; }
    caster.attackAnim = 190;
    const cursedBonus = (target && target.cursed) ? 1.3 : 1.0;
    const dmg = dmgBase * cursedBonus;
    projectiles.push({x:caster.x, y:caster.y-14, vx:dx*440, vy:dy*440, dmg, life:900, radius:7, color:"#8ef0c8", fromBasic:true, pierce:false, src:caster});
    spawnSlash(caster);
    return;
  }

  if(divinaMode){
    // Bug corregido: antes SOLO el jugador atacaba en la Arena Divina (los 3 aliados no
    // hacían nada salvo caminar) porque acá abajo, para cualquier otro caster, se buscaba
    // target en `enemies` -que en la Arena Divina siempre está vacío-. Ahora cualquiera de
    // tu equipo (o del rival) busca objetivo entre campeones/minions/estructuras hostiles.
    const mySide = caster.isDivineFoe ? "enemy" : "player";
    const hit = divinaHostiles(mySide, caster.x, caster.y, cls.basicRange + 40);
    if(!hit) return;
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * aspd);
    } else {
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * aspd);
    }
    caster.attackAnim = 190;
    const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * furyMissingHpMult(caster) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus);
    const dx=hit.ref.x-caster.x, dy=hit.ref.y-caster.y, l=Math.hypot(dx,dy)||1;
    caster.fx=dx/l; caster.fy=dy/l;
    divinaDealDamage(hit, dmg, caster);
    spawnSlash(caster);
    return;
  }

  if(caster===player){
    caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * aspd);
  } else {
    const t = nearestEnemyTo(caster, cls.basicRange);
    if(!t) return;
    caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * aspd);
  }
  caster.attackAnim = 190;
  const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * furyMissingHpMult(caster) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus);
  const bleedOpt = caster.buffBleedOnHit ? {bleed:true, bleedDur:2400} : {};
  if(cls.ranged){
    const target = nearestEnemyTo(caster, cls.basicRange);
    let dx=caster.fx, dy=caster.fy;
    if(target){ dx = target.x-caster.x; dy = target.y-caster.y; const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l; caster.fx=dx; caster.fy=dy; }
    projectiles.push({x:caster.x,y:caster.y-14, vx:dx*420, vy:dy*420, dmg, life:900, radius:8, color:cls.glow, fromBasic:true, pierce:false, src:caster});
    // pequeño detalle de lanzamiento propio de cada clase con proyectil (llamita del Mago,
    // destello cálido del Sanador) para que el básico no se sienta tan genérico
    if(caster.classKey==="mago"){
      for(let i=0;i<3;i++){
        particles.push({x:caster.x+dx*10, y:caster.y-14+dy*10, vx:dx*60+(Math.random()-0.5)*40, vy:dy*60+(Math.random()-0.5)*40-14, life:220, color:i===0?"#ffb36a":"#ff6a3d"});
      }
    } else if(caster.classKey==="soporte"){
      for(let i=0;i<3;i++){
        const a = Math.random()*Math.PI*2;
        particles.push({x:caster.x+dx*10, y:caster.y-14+dy*10, vx:Math.cos(a)*30, vy:Math.sin(a)*30-20, life:260, color:i===0?"#fff2c0":"#ffe08a"});
      }
    }
  } else {
    const target = nearestEnemyTo(caster, cls.basicRange);
    if(target){ const dx=target.x-caster.x, dy=target.y-caster.y; const l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
    for(const e of enemies){
      if(!e.alive) continue;
      if(distance(caster,e) <= cls.basicRange){
        damageEnemy(e, dmg, Object.assign({fromBasic:true, src:caster}, bleedOpt));
      }
    }
    spawnSlash(caster);
  }
}

function spawnSlash(caster){
  particles.push({x:caster.x+caster.fx*38, y:caster.y+caster.fy*38-10, vx:0, vy:0, life:140, slash:true, color:caster.cls.glow});
}

function useSkill(idx, aim){
  if(!player.alive || state!=="playing") return false;
  const sk = player.cls.skills[idx];
  if(player.cds[idx]>0 || player.energy < sk.cost) return false;
  player.energy -= sk.cost;
  const passiveCdMult = Math.max(0.4, 1 - passiveSum(player.classKey,"cd_mult")); // "Mente Ágil"
  player.cds[idx] = sk.cd * runStats.cdMult * cdMultFor(sk, masteryOf(player.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(player.classKey, idx);
  if(sk.kind==="teleport_blink") player.cds[idx] = resolveTeleportCd(player, player.cds[idx]);
  if(sk.kind==="ghost_step" && player.duelActive) player.cds[idx] *= musashiGhostStepCdMult(player);
  if(!player.cdTotal) player.cdTotal = [1,1,1];
  player.cdTotal[idx] = player.cds[idx];
  gainSkillUseXp(player.classKey, idx);
  player.aim = aim || null;
  try{ castAbility(player, sk, false, idx); } finally { player.aim = null; }
  return true;
}

// Sylva — Flecha Perforante ya cargada (ver sylvaChargeRelease): mismo descuento de
// energía/cooldown que useSkill(0), pero pasando cuánto se mantuvo cargada para elegir el tier
// dentro del case "piercing_shot" de castAbility.
function useSylvaPiercingShot(caster, chargeMs, aim){
  if(!caster.alive || state!=="playing") return;
  const idx = 0;
  const sk = caster.cls.skills[idx];
  if(caster.cds[idx]>0 || caster.energy < sk.cost) return;
  caster.energy -= sk.cost;
  const passiveCdMult = Math.max(0.4, 1 - passiveSum(caster.classKey,"cd_mult"));
  caster.cds[idx] = sk.cd * runStats.cdMult * cdMultFor(sk, masteryOf(caster.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(caster.classKey, idx);
  if(!caster.cdTotal) caster.cdTotal = [1,1,1];
  caster.cdTotal[idx] = caster.cds[idx];
  gainSkillUseXp(caster.classKey, idx);
  caster.pendingChargeMs = chargeMs;
  caster.aim = aim || null;
  try{ castAbility(caster, sk, false, idx); } finally { caster.aim = null; }
}

function useUltimate(){
  if(!player.alive || state!=="playing") return;
  if(player.ultCharge < player.ultMax) return;
  if(player.ultCd > 0) return; // antes no se chequeaba: la ulti podía saltarse su propio enfriamiento
  if(runLevel < ULT_MIN_ARENA_LEVEL) return; // no disponible hasta cierto punto de la arena
  const ult = player.cls.ultimate;
  player.ultCharge = 0;
  const passiveCdMult = Math.max(0.4, 1 - passiveSum(player.classKey,"cd_mult"));
  player.ultCd = ult.cd * masteryCdMult(masteryOf(player.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult*arenaRuleCdMult() * talentSkillCdMult(player.classKey, "ult");
  gainSkillUseXp(player.classKey, "ult");
  castAbility(player, ult, true);
}
function castAbility(caster, sk, isUlt, idx){
  if(axiomFreezeTimer>0 && caster!==axiomFreezeCaster && sk.kind!=="force_quit_ult") return; // nadie mas actua mientras dura Force Quit
  if(caster.fused) return; // La Profeta fusionada (Ascensión del Elegido): no puede lanzar nada ella misma
  const skillKey = isUlt ? "ult" : (idx===undefined ? 0 : idx);
  // Overcap de objetos (sección 14): legendarios/míticos pueden sumar niveles EFECTIVOS de
  // habilidad sin tocar los puntos permanentes invertidos -por eso esto usa una copia
  // (effectiveMasteryFor), nunca masteryOf() a secas, que sigue siendo lo que ve la UI-.
  const mastery = effectiveMasteryFor(caster.classKey, skillKey);
  // Talentos de ESTA habilidad puntual (ver sección TALENTOS Y MAESTRÍAS más arriba): powerMult
  // se suma al mismo escalado que ya usa la maestría (afecta daño Y curación por igual, tal
  // como ya hacía POWER antes de que existieran talentos), área/duración se multiplican sobre
  // lo que ya calculaba la maestría, sin reemplazarlo.
  const tSkill = caster.classKey ? talentSkillMods(caster.classKey, skillKey) : {powerMult:0,areaMult:0,durationMult:0,jumpBonus:0,flags:{}};
  // La maestría de la habilidad escala daño/curación, área, duración y saltos de cadena
  const POWER = masteryPowerMult(mastery) * (1+tSkill.powerMult);
  const AREA = masteryAreaMult(mastery) * (1+tSkill.areaMult);
  const DUR = masteryDurationMult(mastery) * (1+tSkill.durationMult);
  const JUMP_BONUS = masteryJumpBonus(mastery) + (tSkill.jumpBonus||0);
  const passiveDmg = caster.classKey ? (passiveSum(caster.classKey,"dmg_mult") + passiveSum(caster.classKey,"skilldmg_mult") + mythicExecuteBonus(caster)) : 0;
  const dmg0 = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * (sk.dmgMult||0) * POWER * furyMissingHpMult(caster) * arenaMods().heroDmgMult * (1+passiveDmg);
  const dmgElem = sk.element==="fire" ? dmg0*arenaMods().fireDmgMult : sk.element==="ice" ? dmg0*arenaMods().iceDmgMult : dmg0;
  const dmg = dmgElem * (arenaMods().abilityDmgMult!==undefined ? arenaMods().abilityDmgMult : 1);
  // Activación: la ulti se anuncia en grande; las habilidades normales ya no tapan la pantalla
  // con su nombre (el botón y el efecto lo comunican), solo un anillo del color del campeón.
  if(caster===player){
    if(isUlt){ showBanner("★ "+sk.name); flashScreen(0.22, hexToRgb(caster.cls.glow)); }
    playSfx(isUlt?"ult":"cast");
  }
  if(caster.alive) vfxShock(caster.x, caster.y, 8, isUlt ? 70 : 44, hexToRgb(caster.cls.glow||"#ffffff"), isUlt ? 420 : 260, caster===player ? 1 : 0);
  if(caster.classKey && caster.alive){ itemProcsOnCast(caster, sk, isUlt); setsOnCast(caster, sk, isUlt); if(caster.stats) caster.stats.skillCasts = (caster.stats.skillCasts||0) + 1; }
  caster.attackAnim = isUlt ? 320 : 240;
  caster._animCastKind = isUlt ? 2 : 1; // el sistema de animación lo lee como CAST (ulti = CAST fuerte)
  // animaciones del Pack 1 (Segador/Axiom): pose de cast mientras dura este attackAnim; el Tajo
  // del Segador es un golpe de guadaña, así que usa la pose de ataque
  caster._packCastUntil = sk.kind==="cone_slash" ? 0 : animNow + caster.attackAnim;
  const _prevCastCtx = _castCtx;
  if(caster===player){ _castCtx = {ult:!!isUlt}; if(isUlt) _ultImpactDone = false; }
  try{
  switch(sk.kind){

    case "placeholder": {
      // Se mantiene por si algún futuro campeón necesita un slot vacío temporal (ya no lo usa
      // Axiom, que tiene sus 4 habilidades reales más abajo).
      if(caster===player) floatText(caster.x, caster.y-50, "En desarrollo", null);
      break;
    }

    case "ronin_slash": {
      // Musashi — Corte del Rōnin: avanza y da un único corte fuerte y rápido. Golpear a la
      // Marca de Duelo (o crear una nueva si no había) da +2 Concentración; en Duelo Perfecto
      // (10 cargas) aparece un segundo corte demorado sobre el mismo rival (sección 9).
      const target = (caster.aim && aimTarget(caster, sk.range*AREA)) || ((caster.duelTarget && caster.duelTarget.alive) ? caster.duelTarget : nearestEnemyTo(caster, sk.range*AREA));
      if(!target){ if(caster===player) floatText(caster.x, caster.y-40, "Sin objetivo", null); break; }
      const dx0 = target.x-caster.x, dy0 = target.y-caster.y, dlen = Math.hypot(dx0,dy0)||1;
      caster.fx = dx0/dlen; caster.fy = dy0/dlen;
      const advance = Math.max(0, Math.min(sk.range*0.55*AREA, dlen-40));
      caster.x += caster.fx*advance; caster.y += caster.fy*advance;
      clampToArena(caster); resolveWallCollision(caster);
      const mods1 = musashiCombatMods(caster);
      if(distance(caster,target) <= sk.range*AREA + 40){
        const finalDmg = dmg * mods1.dmgMult;
        damageEnemy(target, finalDmg, {src:caster, critChanceOverride:mods1.critChance, critMultOverride:mods1.critMult});
        musashiAddConcentration(caster, target, 2);
        // Talento "Corte Gemelo": probabilidad de un segundo corte incluso fuera de Duelo Perfecto.
        if(mods1.perfect || Math.random()<(tSkill.flags.roninTwinCutChance||0)){
          musashiSecondCuts.push({caster, target, dmg:finalDmg*0.55, critChance:mods1.critChance, critMult:mods1.critMult, timer:220});
        }
        pushSpark("impacto", target.x, target.y, 60, 260);
        // Destello de impacto real (arte del zip de Musashi, antes sin usar), sobre el chispazo
        // genérico de pushSpark -no reemplaza nada, solo se suma-.
        vfxSprite("musashiRoninImpact", 0, target.x, target.y-10, 70, 220, null, 0.1, caster.fx<-0.12, 0.5, 0);
      }
      // Pose real de Musashi para el corte (windup->tajo->recuperación), reemplazando su cuerpo
      // normal durante la animación -antes esta habilidad no cambiaba en nada su sprite-.
      caster.musashiCastKind = "ronin"; caster.musashiCastDur = 260; caster.attackAnim = Math.max(caster.attackAnim, 260);
      spawnSlash(caster);
      break;
    }

    case "ghost_step": {
      // Musashi — Paso Fantasma: atraviesa al objetivo (Marca de Duelo si está en rango, si no
      // el más cercano) y aparece detrás; deja un afterimage y el próximo básico tiene crítico
      // garantizado. Paso Perfecto (sección 11): si algún enemigo cuerpo a cuerpo está a punto
      // de golpearlo (atkCd bajo, mismo umbral que usa la IA enemiga para decidir "ya puedo
      // pegar"), además evita ese golpe por completo y da +3 Concentración contra él -mezcla
      // de esquive+parry, ventana corta a propósito, no arma un sistema de parry genérico-.
      const target = (caster.aim && aimTarget(caster, sk.range*AREA)) || ((caster.duelTarget && caster.duelTarget.alive && distance(caster,caster.duelTarget)<=sk.range*AREA)
        ? caster.duelTarget : nearestEnemyTo(caster, sk.range*AREA));
      let perfectSource = null;
      // Talento "Instinto Filoso"/"Instinto Absoluto": ventana de Paso Perfecto más generosa.
      const perfectWindow = MUSASHI_PERFECT_STEP_WINDOW * (1+(tSkill.flags.perfectStepWindowPct||0));
      for(const e of enemies){
        if(!e.alive || e.ranged || (e.isDuelLocked && e.duelOwner!==caster)) continue;
        if(distance(caster,e) <= (e.radius+caster.radius+42) && e.atkCd!==undefined && e.atkCd<=perfectWindow){
          perfectSource = e; break;
        }
      }
      musashiSpawnAfterimage(caster);
      if(target){
        caster.x = target.x - caster.fx*40; caster.y = target.y - caster.fy*40;
        const dxg = target.x-caster.x, dyg = target.y-caster.y, lg = Math.hypot(dxg,dyg)||1;
        caster.fx = dxg/lg; caster.fy = dyg/lg;
      } else {
        caster.x += caster.fx*(sk.range*0.6*AREA); caster.y += caster.fy*(sk.range*0.6*AREA);
      }
      clampToArena(caster); resolveWallCollision(caster);
      caster.invulnTimer = Math.max(caster.invulnTimer||0, 220);
      caster.ghostStepCritTimer = 3200;
      if(perfectSource){
        caster.invulnTimer = Math.max(caster.invulnTimer, 340);
        // Talento "Instinto Perfecto": Concentración extra en un Paso Perfecto.
        musashiAddConcentration(caster, perfectSource, 3+(tSkill.flags.pasoPerfectoConcBonus||0));
        if(caster===player) floatText(caster.x, caster.y-46, "¡PASO PERFECTO!", "crit");
        particles.push({x:caster.x,y:caster.y, life:340, ring:true, maxLife:340, maxR:44, color:"#bfe4ff"});
      }
      musashiSpawnAfterimage(caster);
      break;
    }

    case "thousand_cuts": {
      // Musashi — Mil Cortes: ráfaga alrededor suyo, prioriza a la Marca de Duelo. Cuantos
      // menos enemigos haya cerca, mayor porción de los cortes converge sobre un único rival
      // -así funciona como AoE contra hordas y como nuke single-target contra un rival aislado-.
      const nearby = enemies.filter(e=>e.alive && !(e.isDuelLocked && e.duelOwner!==caster) && distance(caster,e)<=sk.radius*AREA);
      if(!nearby.length){ if(caster===player) floatText(caster.x,caster.y-40,"Sin enemigos cerca",null); break; }
      // Talento "Mil Cortes y Uno"/"Mil y Un Cortes": cortes adicionales repartidos.
      const totalHits = (sk.totalHits||10) + (tSkill.flags.extraHits||0);
      const mods2 = musashiCombatMods(caster);
      const perHitDmg = dmg * mods2.dmgMult;
      const focusTarget = (caster.duelTarget && caster.duelTarget.alive && nearby.includes(caster.duelTarget)) ? caster.duelTarget : null;
      const others = nearby.filter(e=>e!==focusTarget);
      const hitCounts = new Map();
      if(focusTarget){
        const focusShare = Math.max(0.25, 1 - others.length*0.12);
        const targetHits = Math.round(totalHits*focusShare);
        hitCounts.set(focusTarget, targetHits);
        let remaining = totalHits - targetHits;
        if(others.length){
          const base = Math.floor(remaining/others.length); let extra = remaining - base*others.length;
          others.forEach(e=>{ let n=base+(extra>0?1:0); if(extra>0) extra--; hitCounts.set(e,n); });
        }
      } else {
        const base = Math.floor(totalHits/nearby.length); let extra = totalHits - base*nearby.length;
        nearby.forEach(e=>{ let n=base+(extra>0?1:0); if(extra>0) extra--; hitCounts.set(e,n); });
      }
      let firstMark = null;
      hitCounts.forEach((n,e)=>{
        if(n<=0) return;
        for(let i=0;i<n;i++) damageEnemy(e, perHitDmg, {src:caster, critChanceOverride:mods2.critChance, critMultOverride:mods2.critMult});
        if(!firstMark) firstMark = e;
        pushSpark("impacto", e.x, e.y, 40, 200);
      });
      if(focusTarget) musashiAddConcentration(caster, focusTarget, 3);
      else if(firstMark) musashiAddConcentration(caster, firstMark, 1);
      particles.push({x:caster.x,y:caster.y, life:380, maxLife:380, spin:true, radius:sk.radius*AREA*0.9, color:"#bfe4ff"});
      // Pose real del remolino de cortes (reemplaza el cuerpo de Musashi durante la animación,
      // igual criterio que "ronin" arriba), sobre el anillo procedural que ya existía.
      caster.musashiCastKind = "thousand"; caster.musashiCastDur = 380; caster.attackAnim = Math.max(caster.attackAnim, 380);
      if(caster===player) floatText(caster.x, caster.y-50, "¡MIL CORTES!", null);
      break;
    }

    case "last_duel_ult": {
      // Musashi — Último Duelo: ver enterLastDuel/updateLastDuel/exitLastDuel para el ciclo de
      // vida completo (aislamiento, buffs temporales, Golpe de Gracia, Senda del Rōnin).
      const duelTarget = caster.duelTarget;
      if(!duelTarget || !duelTarget.alive || duelTarget.isDuelLocked){
        if(caster===player) floatText(caster.x, caster.y-46, "Necesitás una Marca de Duelo activa", null);
        break;
      }
      enterLastDuel(caster, duelTarget, sk);
      break;
    }

    case "piercing_shot": {
      // Sylva — Flecha Perforante: la carga (0 a SYLVA_CHARGE_MAX_MS) se decide afuera, en la
      // UI (ver sylvaChargeStart/Release + useSylvaPiercingShot) o la IA (que siempre dispara
      // al máximo, ver botTryAbilities); acá solo se resuelve el disparo ya cargado en 3 tiers.
      // Tier 3 perfora y aplica Hemorragia a la Presa; crítico garantizado si además está en
      // Presa Acorralada (5 cargas de Rastreo).
      const chargeMs = caster.pendingChargeMs || 0;
      caster.pendingChargeMs = 0;
      const tier = chargeMs >= SYLVA_CHARGE_MAX_MS*0.85 ? 3 : chargeMs >= SYLVA_CHARGE_MAX_MS*0.35 ? 2 : 1;
      const mods3 = sylvaCombatMods(caster);
      const target = caster.aim ? null : ((caster.huntTarget && caster.huntTarget.alive) ? caster.huntTarget : nearestEnemyTo(caster, sk.range*AREA));
      if(caster.aim) aimDir(caster, sk.range*AREA);
      let dx3=caster.fx, dy3=caster.fy;
      if(target){ dx3=target.x-caster.x; dy3=target.y-caster.y; const l3=Math.hypot(dx3,dy3)||1; dx3/=l3; dy3/=l3; caster.fx=dx3; caster.fy=dy3; }
      const tierDmgMult = [0,1,1.5,2.3][tier];
      const finalDmg = dmg * tierDmgMult * mods3.dmgMult;
      const guaranteedCrit = tier===3 && mods3.cornered;
      projectiles.push({
        x:caster.x, y:caster.y-14, vx:dx3*640, vy:dy3*640, dmg:finalDmg, life:900, radius:7, color:"#e8f5c8",
        pierce: tier===3, hitSet:new Set(), src:caster,
        critChanceOverride: guaranteedCrit ? 1 : (runStats.critChance+mods3.critChanceAdd),
        critMultOverride: guaranteedCrit ? (runStats.critMult||1.8)*1.2 : undefined,
        onHit:(e)=>{
          if(tier>=2 && e===caster.huntTarget){
            // Talento "Hemorragia Profunda"/"Sangre de Presa": más daño y duración de Hemorragia.
            const bleedBonus = 1+(tSkill.flags.bleedBonusPct||0);
            e.bleedTimer = Math.max(e.bleedTimer||0, 3200*bleedBonus);
            e.bleedDmg = Math.max(e.bleedDmg||0, finalDmg*0.18*bleedBonus);
          }
          sylvaAddTrack(caster, e, tier);
          // Impacto crítico real sobre la Presa Acorralada (arte del zip, antes sin usar):
          // exactamente la misma condición que ya daba el crítico garantizado, solo visual.
          if(guaranteedCrit) vfxSprite("sylvaPiercingCrit", 0, e.x, e.y-10, 78, 260, null, 0.1, dx3<-0.12, 0.5, 0);
        }
      });
      spawnSlash(caster);
      // Pose real del disparo (reemplaza el combo básico durante un instante muy breve).
      caster.sylvaCastKind = "piercing"; caster.sylvaCastDur = 180; caster.attackAnim = Math.max(caster.attackAnim, 180);
      if(caster===player) floatText(caster.x, caster.y-40, tier===3?"¡Flecha Perforante MAX!":"Flecha Perforante", tier===3?"crit":null);
      break;
    }

    case "forest_trap": {
      // Sylva — Trampa del Bosque: reusa el sistema genérico de trampas (traps/updateTraps),
      // sumándole un nuevo kind:"forest_root" (ver triggerTrap) en vez de duplicar el sistema
      // que ya usa el Guerrero. Enraíza a enemigos normales, reduce la duración en élites y
      // solo ralentiza (nunca inmoviliza del todo) a subjefes/jefes.
      const _ftp = aimPoint(caster, sk.range*AREA, sk.radius*AREA*1.4), tx3 = _ftp.x, ty3 = _ftp.y;
      // Talento "Impulso de Caza": guardado en el propio héroe (no en la trampa) porque el
      // impulso de velocidad se aplica sobre quien la colocó, sin importar quién la dispare.
      caster.sylvaTrapBurstBonus = tSkill.flags.trapBurstBonus||0;
      traps.push({x:tx3, y:ty3, radius:sk.radius*AREA, chainRadius:0, dmg:0, timer:9000, armTime:200,
        src:caster, triggered:false, phase:0, kind:"forest_root", rootDur:sk.rootDur*DUR});
      particles.push({x:tx3,y:ty3, life:500, ring:true, maxLife:500, maxR:sk.radius*AREA*0.9, color:"#4a7a2e"});
      if(caster===player) floatText(tx3, ty3-20, "Trampa colocada", null);
      break;
    }

    case "hunter_rain": {
      // Sylva — Lluvia de la Cazadora: AoE con demora que converge sobre la Presa si está en
      // el área (ver updateSylvaRainZones), mismo patrón que las zonas con demora de Axiom.
      const _hp = aimPoint(caster, (sk.range||220)*AREA, sk.radius*AREA), tx4 = _hp.x, ty4 = _hp.y;
      // Talento "Diluvio"/"Aljaba sin Fondo": impactos adicionales repartidos en la lluvia.
      const totalHitsRain = Math.round((sk.totalHits||12)*(1+ (POWER-1)*0.5)) + (tSkill.flags.extraHits||0);
      sylvaRainZones.push({x:tx4, y:ty4, radius:sk.radius*AREA, timer:900, exploded:false,
        dmg, totalHits:totalHitsRain, src:caster});
      if(caster===player) floatText(tx4, ty4-20, "¡LLUVIA DE LA CAZADORA!", null);
      break;
    }

    case "wild_hunt_ult": {
      // Sylva — Cacería Salvaje: fija el Impulso al máximo (no puede decaer mientras dure, ver
      // sylvaCombatMods/updateSylvaMomentum), aplica los bonus de la ultimate y convoca al Lobo
      // Espectral (ver spawnSylvaWolf/updateSylvaWolf/despawnSylvaWolf).
      caster.momentum = 10;
      caster.wildHuntTimer = sk.duration*DUR;
      caster.wildHuntMaxTimer = sk.duration*DUR;
      spawnSylvaWolf(caster);
      particles.push({x:caster.x,y:caster.y, life:480, ring:true, maxLife:480, maxR:80, color:"#c8f0a8"});
      if(caster===player) floatText(caster.x, caster.y-56, "¡CACERÍA SALVAJE!", "crit");
      break;
    }

    case "raise_skeletons": {
      // Nigromante — Levanta esqueletos permanentes hasta el máximo que permite la maestría de
      // esta habilidad (sección 3); si ya hay algunos vivos, solo completa los que falten -nunca
      // reemplaza ni duplica a los existentes-. No disponible transformado (sección 6).
      if(caster.nigroDemonForm){ if(caster===player) floatText(caster.x, caster.y-40, "No disponible transformado", null); break; }
      const maxCount = nigromanteMaxSkeletons(mastery);
      const comp = nigromanteSkeletonComposition(maxCount);
      const curWarriors = caster.skeletons.filter(s=>s.type==="warrior").length;
      const curMages = caster.skeletons.filter(s=>s.type==="mage").length;
      let spawned = 0;
      for(let i=curWarriors;i<comp.warriors;i++){ spawnNigroSkeleton(caster, "warrior", tSkill.flags); spawned++; }
      for(let i=curMages;i<comp.mages;i++){ spawnNigroSkeleton(caster, "mage", tSkill.flags); spawned++; }
      if(spawned===0){ if(caster===player) floatText(caster.x, caster.y-40, "Ejército al máximo", null); break; }
      caster.nigroCastKind = "skeleton";
      caster.attackAnim = Math.max(caster.attackAnim, 320);
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:60, color:"#7ad48a"});
      if(caster===player) floatText(caster.x, caster.y-50, "¡LEVANTAR ESQUELETOS!", null);
      break;
    }

    case "summon_golem": {
      // Nigromante — Crear Golem: único (spawnOrRenewGolem lo renueva/reposiciona si ya existe
      // en vez de duplicarlo). No disponible transformado (sección 6).
      if(caster.nigroDemonForm){ if(caster===player) floatText(caster.x, caster.y-40, "No disponible transformado", null); break; }
      spawnOrRenewGolem(caster);
      caster.nigroCastKind = "golem";
      caster.attackAnim = Math.max(caster.attackAnim, 320);
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:60, color:"#8fae7a"});
      if(caster===player) floatText(caster.x, caster.y-50, "¡CREAR GOLEM!", null);
      break;
    }

    case "condemned_plague": {
      // Nigromante — Plaga de los Condenados: maldice un área (DoT + más daño recibido); si un
      // maldito muere, contagia a los cercanos (nigromantePlagueDeathSpread), con un tope de
      // generaciones (maxGen) que "Peste Negra" sube en 1 -nunca una cadena infinita-. Sigue
      // disponible incluso transformado (sección 6).
      const _pp = aimPoint(caster, sk.range*AREA, sk.radius*AREA), tx = _pp.x, ty = _pp.y;
      const radius = sk.radius*AREA;
      const defPct = sk.defTakenPct + (tSkill.flags.defTakenBonusPct||0);
      const durationMs = sk.duration*DUR;
      const maxGen = 2 + (tSkill.flags.blackPlague?1:0);
      for(const e of enemies){
        if(!e.alive || Math.hypot(e.x-tx,e.y-ty) > radius) continue;
        nigromanteApplyCurse(e, caster, dmg*0.35, defPct, 0, durationMs, maxGen);
      }
      // Transformado (Encarnación del Abismo), el cast usa la pose real "soulFireCast" en vez
      // de caer en el ataque básico genérico -antes nigroCastKind nunca valía "demonSoulFire",
      // así que esa pose (arte real, limpia) quedaba sin usar-. Sin cambiar en nada la lógica
      // de la habilidad: mismo daño, mismo alcance, misma duración, transformado o no.
      caster.nigroCastKind = caster.nigroDemonForm ? "demonSoulFire" : "plague";
      caster.attackAnim = Math.max(caster.attackAnim, 320);
      particles.push({x:tx,y:ty, life:460, ring:true, maxLife:460, maxR:radius, color:"#50e68c"});
      // arte real de la plaga (3 frames embebidos que antes no se usaban), solo visual: ground1
      // (mucho más ancho que ground2/ground3) se muestra una sola vez como estallido inicial,
      // y ground2/ground3 quedan como la niebla que persiste en el suelo.
      if(NIGRO_PLAGUE_FX_READY.ground1) vfxSprite("nigroPlagueBurst", 0, tx, ty+radius*0.4, radius*1.05, 260, null, 0.05, caster.fx<-0.12, 0.85, 0);
      vfxSprite("nigroPlague", 0, tx, ty+radius*0.4, radius*0.95, 1500, null, 0.18, caster.fx<-0.12, 0.85, 5);
      // destello decorativo (arte real, no es un proyectil de verdad -no aplica daño ni viaja
      // con lógica propia-) sobre la mano del Nigromante transformado al momento del cast.
      if(caster.nigroDemonForm && NIGRO_DEMON_READY.soulFireProj) vfxSprite("nigroSoulFireFlare", 0, caster.x+caster.fx*22, caster.y-30, 34, 320, caster, 0.15, caster.fx<-0.12, 0.5, 0);
      if(caster===player) floatText(tx, ty-30, "¡PLAGA DE LOS CONDENADOS!", null);
      break;
    }

    case "abyss_incarnation_ult": {
      // Nigromante — Encarnación del Abismo: ver enterAbyssForm/updateNigromanteDemonForm/
      // exitAbyssForm para el ciclo de vida completo (absorción del ejército, transformación,
      // restauración automática al terminar).
      enterAbyssForm(caster, sk);
      break;
    }

    case "glitch_delay_nova": {
      // Axiom — Error 404: marca una zona; tras una demora, colapsa (daño + ralentización).
      const _gp = aimPoint(caster, sk.range*AREA, sk.radius*AREA), tx = _gp.x, ty = _gp.y;
      axiomZones.push({
        x:tx, y:ty, radius:sk.radius*AREA, timer:sk.delay, mode:"delay", exploded:false,
        dmg, slow:sk.slow, slowDur:sk.slowDur, src:caster, bannerText:"ERROR 404"
      });
      if(caster===player) floatText(tx, ty-30, "ERROR 404", null);
      drawAxiomVfxBurst(tx, ty, "err404");
      // Talento "Eco de Falla": un segundo colapso, más débil, sobre el mismo punto poco
      // después del primero (reusa el mismo mecanismo de zona con demora que ya existe).
      const echoPct = tSkill.flags.err404Echo;
      if(echoPct){
        axiomZones.push({
          x:tx, y:ty, radius:(sk.radius*AREA)*0.75, timer:sk.delay+450, mode:"delay", exploded:false,
          dmg: dmg*echoPct, slow:sk.slow*0.7, slowDur:sk.slowDur*0.6, src:caster, bannerText:null
        });
      }
      break;
    }

    case "overwrite_nova": {
      // Axiom — Sobrescribir: infecta al enemigo más cercano con código corrupto y el
      // contagio salta a los enemigos cercanos (más saltos y más daño al mejorar la
      // habilidad, vía JUMP_BONUS/POWER — mismo sistema que usa "Cadena de Relámpago").
      // Cada infectado además sigue sangrando código corrupto un rato (bleedTimer/bleedDmg).
      let cur = aimTarget(caster, sk.range||300);
      const hitList = [];
      let curDmg = dmg;
      let px_ = caster.x, py_ = caster.y-14;
      // Talentos "Ejecución Forzada"/"Ejecución Absoluta": umbral y multiplicador de ejecución
      // más altos (topeados para que nunca se vuelva un one-shot garantizado sin importar la vida).
      const execPct = Math.min(0.5, (sk.executePct||0) + (tSkill.flags.executePctBonus||0));
      const execMult = Math.min(4, (sk.executeMult||1) + (tSkill.flags.executeMultBonus||0));
      for(let i=0;i<(sk.jumps+JUMP_BONUS) && cur;i++){
        const isBoss = cur.rank==="jefe" || cur.rank==="subjefe" || cur.rank==="elite";
        let d2 = curDmg;
        if(!isBoss && (cur.hp/cur.maxHp) <= execPct) d2 *= execMult;
        damageEnemy(cur, d2, {src:caster});
        cur.bleedTimer = Math.max(cur.bleedTimer||0, (sk.bleedDur||2600)*DUR);
        cur.bleedDmg = Math.max(cur.bleedDmg||0, curDmg*(sk.bleedDmgMult||0.3));
        pushChainBolt(px_, py_, cur.x, cur.y, 16, 380);
        drawAxiomVfxBurst(cur.x, cur.y, "overwrite");
        hitList.push(cur);
        px_ = cur.x; py_ = cur.y;
        curDmg *= sk.falloff;
        let next=null, bd=Infinity;
        for(const e of enemies){
          if(!e.alive || hitList.includes(e)) continue;
          const d = distance(cur,e);
          if(d < (sk.jumpRange*AREA) && d < bd){ bd=d; next=e; }
        }
        cur = next;
      }
      if(caster===player) floatText(caster.x, caster.y-50, "SOBRESCRIBIR", null);
      break;
    }

    case "teleport_blink": {
      // Axiom — Teletransporte: se desplaza al instante en la dirección en la que mira.
      // Invulnerable solo durante la breve transición (no durante toda la animación), tal
      // como pide el diseño original. A niveles altos el cooldown cae hasta casi 0 (ver
      // masteryTeleportCdMult, usado en vez del masteryCdMult genérico solo para esta skill).
      drawAxiomVfxBurst(caster.x, caster.y, "teleport_out");
      const _tpDest = aimPoint(caster, sk.range*AREA, 0, true);
      caster.x = _tpDest.x;
      caster.y = _tpDest.y;
      clampToArena(caster);
      resolveWallCollision(caster);
      caster.invulnTimer = Math.max(caster.invulnTimer||0, sk.invulnDur||250);
      drawAxiomVfxBurst(caster.x, caster.y, "teleport_in");
      particles.push({x:caster.x,y:caster.y, life:260, ring:true, maxLife:260, maxR:36, color:"#5ac8ff"});
      // Talento "Recipiente Espejo"/"Blindaje de Tránsito": pequeño escudo al llegar -Axiom
      // sobrevive evitando el golpe, no volviéndose un tanque, por eso es un escudo chico y no
      // un buff de defensa permanente-.
      const shieldPct = tSkill.flags.teleportShieldPct;
      if(shieldPct) caster.shield = Math.max(caster.shield||0, caster.maxHp*shieldPct);
      break;
    }

    case "force_quit_ult": {
      // Axiom — Force Quit (definitiva): durante 4 segundos (colores invertidos en toda la
      // pantalla) nadie salvo Axiom puede moverse ni actuar -enemigos Y aliados incluidos- (ver
      // los chequeos de axiomFreezeTimer en updateAllies, el bucle de enemigos, triggerBasic y
      // castAbility). El golpe de daño en área recién se aplica al TERMINAR el congelamiento
      // (ver el bloque de axiomFreezeTimer<=0 en update()), centrado en dónde haya quedado
      // Axiom en ese momento -no en su posición al lanzarla-.
      const freezeDur = sk.freezeDuration || 4000;
      axiomForceQuitFlash = freezeDur; // inversión de color de toda la pantalla durante el congelamiento, ver render()
      axiomFreezeTimer = freezeDur;
      axiomFreezeCaster = caster;
      axiomForceQuitPending = {dmg, radius:sk.radius*AREA, eliteMult:sk.eliteMult};
      if(caster===player) showBanner("FORCE QUIT");
      drawAxiomVfxBurst(caster.x, caster.y, "forcequit");
      // Talento "Resistencia Absoluta" (Maestría Límites): defensa extra mientras dura el
      // congelamiento -Axiom sigue pudiendo moverse/atacar durante Force Quit, así que esto sí
      // importa, a diferencia de un buff de defensa que no se pudiera usar-.
      const fqDef = tSkill.flags.forceQuitDefBonus;
      if(fqDef){
        caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-fqDef);
        caster.buffTimer = Math.max(caster.buffTimer||0, freezeDur);
      }
      break;
    }

    case "nova": {
      const col = elementColor(sk, caster.cls.glow);
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(caster,e) <= (sk.radius*AREA)){
          damageEnemy(e, dmg, {burn:sk.burn, slow:sk.slow, slowDur:(sk.slowDur*DUR), stun:sk.stun, knockback:sk.knockback, src:caster});
        }
      }
      particles.push({x:caster.x,y:caster.y, life:360, ring:true, maxLife:360, maxR:(sk.radius*AREA), color:col});
      if(sk.spin){ particles.push({x:caster.x,y:caster.y, life:420, maxLife:420, spin:true, radius:(sk.radius*AREA)*0.85, color:"#e8eef4"}); }
      if(sk.groundEffect){
        for(let i=0;i<8;i++) particles.push({x:caster.x+(Math.random()-0.5)*(sk.radius*AREA), y:caster.y+(Math.random()-0.5)*(sk.radius*AREA)*0.6,
          vx:(Math.random()-0.5)*40, vy:-20-Math.random()*30, life:500, color:"#8a6a4a"});
      }
      if(sk.cataclysm){
        let n=0;
        for(const e of enemies){
          if(n>=3 || !e.alive) continue;
          if(distance(caster,e) <= (sk.radius*AREA)){ particles.push({x:caster.x,y:caster.y,x2:e.x,y2:e.y, life:260, bolt:true, color:"#ffe36a"}); n++; }
        }
        particles.push({x:caster.x,y:caster.y, life:420, maxLife:420, spin:true, radius:(sk.radius*AREA)*0.6, color:"#9fe3ff"});
      }
      if(sk.selfBuff){ caster.buffDefMult = 1-sk.selfBuff.def; caster.buffTimer = Math.max(caster.buffTimer, sk.selfBuff.duration); }
      break;
    }

    case "shield": {
      caster.shield = caster.maxHp * (sk.shieldPct*POWER);
      caster.shieldTimer = (sk.duration*DUR);
      const col = elementColor(sk, "#8fd0ff");
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:34, color:col});
      break;
    }

    case "dash": {
      aimDir(caster, sk.range*AREA);
      const dx=caster.fx, dy=caster.fy;
      const dist = (sk.range*AREA);
      const steps = 8;
      for(let i=1;i<=steps;i++){
        const px_ = caster.x+dx*dist*(i/steps), py_ = caster.y+dy*dist*(i/steps);
        for(const e of enemies){
          if(!e.alive) continue;
          if(Math.hypot(e.x-px_,e.y-py_) < e.radius+26){ damageEnemy(e, dmg, {knockback:sk.knockback, stun:sk.stun, src:caster}); }
        }
      }
      caster.x += dx*dist; caster.y += dy*dist;
      clampToArena(caster);
      particles.push({x:caster.x,y:caster.y, life:220, slash:true, color:caster.cls.glow});
      break;
    }

    case "projectile": {
      aimDir(caster, 420);
      const col = elementColor(sk, "#8fd0ff");
      projectiles.push({x:caster.x,y:caster.y-14, vx:caster.fx*380, vy:caster.fy*380, dmg, life:1400, radius:10, color:col,
        pierce:sk.pierce, slow:sk.slow, burn:sk.burn, src:caster, hitSet:new Set()});
      break;
    }

    case "chain": {
      let cur = aimTarget(caster, 340);
      const hitList = [];
      let curDmg = dmg;
      let px_ = caster.x, py_ = caster.y-14;
      const chainTier = tierOf(allocLevel(mastery));
      const boltThickness = 26 + chainTier*14;     // más grueso e imponente cuanto más talento
      const sparkSize = 46 + chainTier*20;
      const electrifiedMs = 500 + chainTier*90;
      for(let i=0;i<(sk.jumps+JUMP_BONUS) && cur;i++){
        damageEnemy(cur, curDmg, {src:caster});
        pushChainBolt(px_, py_, cur.x, cur.y, boltThickness, 420);
        pushSpark("impacto", cur.x, cur.y, sparkSize, 340);
        cur.electrifiedTimer = electrifiedMs; cur.electrifiedSize = sparkSize;
        hitList.push(cur);
        px_ = cur.x; py_ = cur.y;
        curDmg *= sk.falloff;
        let next=null, bd=Infinity;
        for(const e of enemies){
          if(!e.alive || hitList.includes(e)) continue;
          const d = distance(cur,e);
          if(d < (sk.jumpRange*AREA) && d < bd){ bd=d; next=e; }
        }
        // Talento al máximo (nivel 9-10): "Ruptura" — al llegar al último salto posible de la
        // cadena, el objetivo final recibe una descarga extra (doble efecto), con un anillo
        // eléctrico mucho más grande. Inspirado en el estado E4 de referencia.
        if(!next && chainTier>=4 && cur && cur.alive){
          const ruptureTarget = cur, ruptureDmg = curDmg*0.9;
          runLater(140, ()=>{ if(ruptureTarget.alive) damageEnemy(ruptureTarget, ruptureDmg, {src:caster}); });
          pushSpark("impacto", cur.x, cur.y, sparkSize*1.6, 460);
          for(let s=0;s<10;s++){
            const a = Math.random()*Math.PI*2;
            particles.push({x:cur.x, y:cur.y, vx:Math.cos(a)*70, vy:Math.sin(a)*70-16, life:340, color:"#ffe36a"});
          }
        }
        cur = next;
      }
      break;
    }

    case "bleed_hit": {
      const t = aimTarget(caster, caster.cls.basicRange+70);
      if(t){
        damageEnemy(t, dmg, {src:caster, bleed:true, bleedDur:(sk.bleedDur*DUR)});
        tieredBurstVFX(t.x, t.y, 30, allocLevel(mastery), "#c62828", "#ff6a5a");
        pushAsesinoFx("corte_sangrante", "corte", t.x, t.y, 90, 1000, caster.fx<0);
      }
      break;
    }

    case "double_hit": {
      const t = nearestEnemyTo(caster, caster.cls.basicRange+50);
      if(t){
        damageEnemy(t, dmg, {src:caster});
        damageEnemy(t, dmg, {src:caster});
        particles.push({x:t.x-6,y:t.y-4, life:150, slash:true, color:caster.cls.glow});
        particles.push({x:t.x+6,y:t.y+4, life:230, slash:true, color:caster.cls.glow});
      }
      break;
    }

    case "team_heal": {
      for(const h of heroes){
        if(!h.alive) continue;
        const amt = h.maxHp*(sk.healPct*POWER);
        h.hp = Math.min(h.maxHp, h.hp+amt);
        floatText(h.x, h.y-30, "+"+Math.round(amt), "heal");
      }
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:80, color:"#8effb4"});
      break;
    }

    case "sacrifice": {
      let target=null, lowRatio=1;
      for(const h of heroes){
        if(h===caster || !h.alive) continue;
        const r = h.hp/h.maxHp;
        if(r < lowRatio){ lowRatio=r; target=h; }
      }
      if(!target) target = caster;
      const selfCost = caster.maxHp*sk.selfCostPct;
      caster.hp = Math.max(1, caster.hp-selfCost);
      const amt = target.maxHp*(sk.healPct*POWER);
      target.hp = Math.min(target.maxHp, target.hp+amt);
      floatText(target.x, target.y-30, "+"+Math.round(amt), "heal");
      if(caster===player || target===player) floatText(caster.x, caster.y-30, "-"+Math.round(selfCost));
      particles.push({x:target.x,y:target.y, life:400, ring:true, maxLife:400, maxR:60, color:"#ff8fb0"});
      break;
    }

    case "team_regen": {
      for(const h of heroes){
        if(!h.alive) continue;
        h.regenTimer = Math.max(h.regenTimer||0, (sk.duration*DUR));
        h.regenPerSec = h.maxHp*(sk.regenPct*POWER);
      }
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:90, color:"#8effb4"});
      break;
    }

    case "team_buff": {
      for(const h of heroes){
        if(!h.alive) continue;
        const amt = h.maxHp*(sk.healPct*POWER);
        h.hp = Math.min(h.maxHp, h.hp+amt);
        h.regenTimer = Math.max(h.regenTimer||0, (sk.regenDuration*DUR));
        h.regenPerSec = h.maxHp*(sk.regenPct*POWER);
        h.buffDmgMult = sk.dmgMult;
        h.buffDefMult = 1-sk.defBonus;
        h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        floatText(h.x, h.y-30, "+"+Math.round(amt), "heal");
      }
      particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:130, color:"#ffe08a"});
      particles.push({x:caster.x,y:caster.y, life:600, maxLife:600, spin:true, radius:110, color:"#ffe08a"});
      break;
    }

    case "fortress": {
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(caster,e) <= (sk.radius*AREA)){
          damageEnemy(e, dmg, {stun:sk.stun, pull:sk.pull, src:caster});
        }
      }
      caster.buffDefMult = 1-sk.selfDef;
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      for(const h of heroes){
        if(h===caster || !h.alive) continue;
        if(distance(caster,h) <= (sk.radius*AREA)){
          h.buffDefMult = Math.min(h.buffDefMult||1, 1-sk.allyDef);
          h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        }
      }
      particles.push({x:caster.x,y:caster.y, life:500, ring:true, maxLife:500, maxR:(sk.radius*AREA), color:"#ffcf5c"});
      particles.push({x:caster.x,y:caster.y, life:500, maxLife:500, spin:true, radius:(sk.radius*AREA)*0.72, color:"#ffcf5c"});
      break;
    }

    case "buff": {
      caster.buffDmgMult = sk.dmgMult; caster.buffAtkSpeedMult = sk.atkSpeedMult;
      caster.buffLifesteal = sk.lifesteal||0; caster.buffBleedOnHit = sk.bleedOnHit||false;
      caster.buffTimer = (sk.duration*DUR);
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:50, color:"#ff5a3d"});
      break;
    }

    case "spin_channel": {
      const dur = (sk.duration*DUR) * (caster.spinDurationMult||1);
      caster.spinTimer = dur; caster.spinMaxTimer = dur;
      caster.spinRadius = (sk.radius*AREA); caster.spinTick = 0; caster.spinTickInterval = sk.tick;
      caster.spinDmg = dmg;
      caster.spinTier = allocLevel(mastery)>=7 ? 4 : allocLevel(mastery)>=4 ? 3 : allocLevel(mastery)>=2 ? 2 : 1;
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA), allocLevel(mastery), "#9fe3ff", "#cdeeff");
      break;
    }

    case "charge_drag": {
      aimDir(caster, sk.range*AREA);
      const dx=caster.fx, dy=caster.fy, dist=(sk.range*AREA), steps=8;
      let hitEnemy = null;
      for(let i=1;i<=steps && !hitEnemy;i++){
        const px_=caster.x+dx*dist*(i/steps), py_=caster.y+dy*dist*(i/steps);
        for(const e of enemies){
          if(!e.alive) continue;
          if(Math.hypot(e.x-px_,e.y-py_) < e.radius+26){ hitEnemy=e; break; }
        }
      }
      // breve destello de carga antes de la estampida
      particles.push({x:caster.x,y:caster.y, life:180, ring:true, maxLife:180, maxR:34, color:"#9fe3ff"});
      caster.x += dx*dist; caster.y += dy*dist;
      clampToArena(caster);
      particles.push({x:caster.x,y:caster.y, life:260, slash:true, color:"#9fe3ff"});
      particles.push({x:caster.x-dx*40,y:caster.y-dy*40, life:280, bolt:true, x2:caster.x, y2:caster.y, color:"#cdeeff"});
      tieredBurstVFX(caster.x, caster.y, 40, allocLevel(mastery), "#9fe3ff", "#cdeeff");
      if(caster.classKey==="tanque"){ caster.dashFxTimer = 1050; caster.dashFxFlip = dx<0; }
      // Talento "Imparable": mientras dura el impacto de la Embestida, reduce el daño recibido
      // (breve ventana de resistencia durante la carga, no un buff permanente).
      const chargeDef = tSkill.flags.chargeDefBonus;
      if(chargeDef){
        caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-chargeDef);
        caster.buffTimer = Math.max(caster.buffTimer||0, 500);
      }
      if(hitEnemy){
        damageEnemy(hitEnemy, dmg, {src:caster, stun:(sk.stun*DUR)});
        hitEnemy.draggedBy = caster; hitEnemy.dragTimer = (sk.dragTime*DUR);
      }
      break;
    }

    case "war_cry": {
      // Talento "Armadura Viviente": defensa extra si el Grito de Guerra se lanza con poca vida.
      const lowHpBonus = (caster.hp < caster.maxHp*0.3) ? (tSkill.flags.lowHpDefBonus||0) : 0;
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-sk.defBonus-lowHpBonus);
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      // Talento "Grito de Batalla"/"Grito Eterno": extiende la duración del próximo Torbellino.
      const spinExtend = tSkill.flags.warcryExtendsSpinPct;
      if(spinExtend) caster.spinDurationMult = Math.max(caster.spinDurationMult||1, 1+spinExtend);
      // Vida máxima temporal: se retira el bonus anterior (si lo hubiera) antes de aplicar el nuevo,
      // para que recastear el grito no acumule vida infinitamente.
      if(caster.pendingHpBonus){ caster.maxHp -= caster.pendingHpBonus; caster.hp = Math.min(caster.hp, caster.maxHp); caster.pendingHpBonus = 0; }
      const hpBonus = Math.round(caster.maxHp * (sk.hpBonusPct||0) * POWER);
      caster.maxHp += hpBonus; caster.hp += hpBonus; caster.pendingHpBonus = hpBonus;
      // Crecimiento visual: el caballero se agiganta levemente mientras dura el grito
      caster.growTimer = (sk.duration*DUR);
      caster.growMaxTimer = (sk.duration*DUR);
      caster.growScale = sk.growScale||1;
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = 46; caster.sigilColor = "#8fd0ff"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:450, ring:true, maxLife:450, maxR:56, color:"#8fd0ff"});
      tieredBurstVFX(caster.x, caster.y, 56, allocLevel(mastery), "#8fd0ff", "#bfe0ff");
      floatText(caster.x, caster.y-42, "🛡", "heal");
      if(caster===player) floatText(caster.x, caster.y-58, "+VIDA MÁX", "heal");
      break;
    }

    case "taunt_provoke": {
      let taunted = 0;
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(caster,e) <= (sk.radius*AREA)){ e.tauntedBy = caster; e.tauntTimer = (sk.duration*DUR); taunted++; }
      }
      if(caster.stats) caster.stats.enemiesControlled += taunted;
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-sk.defBonus);
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      const hpBonus = Math.round(caster.maxHp*sk.hpBonusPct);
      caster.maxHp += hpBonus; caster.hp += hpBonus; caster.pendingHpBonus += hpBonus;
      caster.spinDurationMult = sk.spinMult;
      caster.colossalTimer = (sk.duration*DUR);
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = (sk.radius*AREA)*0.5; caster.sigilColor = "#ff5a3d"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:700, ring:true, maxLife:700, maxR:(sk.radius*AREA), color:"#ff5a3d"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.5, allocLevel(mastery), "#ff5a3d", "#ffb08a");
      if(caster===player) floatText(caster.x, caster.y-52, "¡PROVOCACIÓN!", "crit");
      break;
    }

    case "fire_wall": {
      const _fp = aimPoint(caster, sk.range*AREA, sk.outerR*AREA), tx = _fp.x, ty = _fp.y;
      const twTier = allocLevel(mastery)>=7 ? 4 : allocLevel(mastery)>=4 ? 3 : allocLevel(mastery)>=2 ? 2 : 1;
      fireWalls.push({x:tx, y:ty, innerR:(sk.innerR*AREA), outerR:(sk.outerR*AREA), timer:(sk.duration*DUR), maxTimer:(sk.duration*DUR), tick:0, tickInterval:sk.tick, dmg, src:caster, tier:twTier});
      particles.push({x:tx,y:ty, life:500, warnRing:true, maxR:(sk.outerR*AREA), color:"#ff6a3d"});
      // Talento "Corazón Ígneo": mientras el muro esté en pie, +daño general (buff temporal
      // de siempre, se revierte solo cuando expira -y se renueva si se relanza el muro-).
      const wallDmgBonus = tSkill.flags.wallEmpowersAll;
      if(wallDmgBonus){
        caster.buffDmgMult = Math.max(caster.buffDmgMult||1, 1+wallDmgBonus);
        caster.buffTimer = Math.max(caster.buffTimer||0, sk.duration*DUR);
      }
      break;
    }

    case "frost_nova": {
      // Talento "Escarcha Paralizante": un breve aturdimiento real (no solo ralentización) muy
      // cerca del centro de la nova.
      const stunMs = tSkill.flags.frostNovaStunMs;
      const stunR = (sk.radius*AREA)*0.45;
      for(const e of enemies){
        if(!e.alive) continue;
        const d = distance(caster,e);
        if(d <= (sk.radius*AREA)){
          damageEnemy(e, dmg, {slow:sk.freeze, slowDur:(sk.freezeDur*DUR), stun: (stunMs && d<=stunR) ? stunMs : undefined, src:caster});
        }
      }
      frostNovaVFX(caster, (sk.radius*AREA), allocLevel(mastery));
      break;
    }

    case "elemental_storm": {
      // Nova de hielo #1 (inmediata): daño + congelamiento real en el área, no solo cosmético
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(caster,e) <= (sk.radius*AREA)){
          damageEnemy(e, dmg, {burn:sk.burn, slow:sk.slow, slowDur:2000, src:caster});
          damageEnemy(e, dmg*sk.novaDmgMult, {slow:sk.novaFreeze, slowDur:(sk.novaFreezeDur*DUR), src:caster});
        }
      }
      cataclysmVFX(caster, (sk.radius*AREA), 8); // la ulti siempre se ve al máximo nivel visual
      frostNovaVFX(caster, (sk.radius*AREA)*0.85, 8); // la ulti siempre se ve al máximo nivel visual
      const stormDur = (sk.duration*DUR);
      caster.stormTimer = stormDur; caster.stormMaxTimer = stormDur;
      caster.stormTick = 0; caster.stormTickInterval = sk.strikeInterval;
      caster.stormRadius = (sk.radius*AREA); caster.stormDmg = dmg*sk.strikeDmgMult;
      // 2 novas de hielo más, cada 1 segundo exacto (van 3 en total, la primera fue inmediata)
      caster.stormNovaLeft = sk.novaCount - 1;
      caster.stormNovaInterval = 1000;
      caster.stormNovaTimer = caster.stormNovaInterval;
      caster.stormNovaDmg = dmg*sk.novaDmgMult;
      caster.stormNovaFreeze = sk.novaFreeze;
      caster.stormNovaFreezeDur = (sk.novaFreezeDur*DUR);
      // Armadura de fuego: bonus real de defensa mientras dura el Cataclismo (se apoya en el
      // sistema de buffs ya existente, así se limpia solo cuando expira buffTimer).
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-sk.armorDefBonus-(tSkill.flags.ultDefBonus||0));
      caster.buffTimer = Math.max(caster.buffTimer, stormDur);
      if(caster===player) floatText(caster.x, caster.y-52, "¡CATACLISMO!", "crit");
      break;
    }

    case "team_heal_aoe": {
      const healPassiveMult = 1 + passiveSum(caster.classKey,"heal_mult");
      for(const h of heroes){
        if(!h.alive || distance(caster,h) > (sk.radius*AREA)) continue;
        const amt = h.maxHp*(sk.healPct*POWER)*healPassiveMult;
        trackHeal(caster, h, amt);
        applyHealOverheal(caster, h, amt);
        floatText(h.x, h.y-30, "+"+Math.round(amt), "heal");
        if(newfxReady('holyHealBurst')) vfxSprite("fxHolyHealBurst", 0, h.x, h.y+2, 96, 480, h, 0, false, 0.95, 8);
      }
      particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:(sk.radius*AREA), color:"#7dffa0"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.6, allocLevel(mastery), "#7dffa0", "#c8ffd8");
      break;
    }

    case "team_atk_buff": {
      let buffed = 0;
      for(const h of heroes){
        if(!h.alive || distance(caster,h) > (sk.radius*AREA)) continue;
        h.buffDmgMult = Math.max(h.buffDmgMult||1, 1+sk.dmgBonus);
        h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        h.atkAuraTimer = (sk.duration*DUR);
        buffed++;
      }
      if(caster.stats && buffed>0){ caster.stats.buffsGranted += buffed; setsOnSupport(caster, buffed); }
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = (sk.radius*AREA)*0.6; caster.sigilColor = "#ff4a3d"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:(sk.radius*AREA), color:"#ff4a3d"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.6, allocLevel(mastery), "#ff4a3d", "#ffb08a");
      // Talento "Ola de Consagración" (Exaltación): pequeña onda ofensiva secundaria, la
      // Sanadora sigue sin ser una atacante -es solo un extra sobre el buff, no su daño principal-.
      const novaPct = tSkill.flags.offensiveNovaPct;
      if(novaPct){
        const novaDmg = caster.baseDmg * runStats.dmgMult * novaPct;
        for(const e of enemies){
          if(e.alive && distance(caster,e) <= (sk.radius*AREA)) damageEnemy(e, novaDmg, {src:caster});
        }
      }
      break;
    }

    case "team_shield_buff": {
      let buffed = 0;
      // "Muralla Viviente": defensa extra para los aliados protegidos (no para la Sanadora en
      // sí, que ya tiene su propia rama Bastión para eso vía def_add genérico).
      const extraDef = tSkill.flags.shieldDefBonus||0;
      for(const h of heroes){
        if(!h.alive || distance(caster,h) > (sk.radius*AREA)) continue;
        h.buffDefMult = Math.min(h.buffDefMult||1, 1-sk.defBonus-extraDef);
        h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        h.shield = Math.max(h.shield, h.maxHp*(sk.shieldPct*POWER));
        h.shieldTimer = Math.max(h.shieldTimer, (sk.duration*DUR));
        h.shieldAuraTimer = (sk.duration*DUR);
        buffed++;
      }
      if(caster.stats && buffed>0){ caster.stats.buffsGranted += buffed; setsOnSupport(caster, buffed); }
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = (sk.radius*AREA)*0.6; caster.sigilColor = "#5fb0ff"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:(sk.radius*AREA), color:"#5fb0ff"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.6, allocLevel(mastery), "#5fb0ff", "#bfe0ff");
      break;
    }

    case "team_grand_buff": {
      let buffed = 0;
      const healPassiveMult2 = 1 + passiveSum(caster.classKey,"heal_mult");
      for(const h of heroes){
        if(!h.alive || distance(caster,h) > (sk.radius*AREA)) continue;
        const amt = h.maxHp*(sk.healPct*POWER)*healPassiveMult2;
        trackHeal(caster, h, amt);
        applyHealOverheal(caster, h, amt);
        h.buffDmgMult = Math.max(h.buffDmgMult||1, 1+sk.dmgBonus);
        h.buffDefMult = Math.min(h.buffDefMult||1, 1-sk.defBonus-(tSkill.flags.ultDefBonus||0));
        h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        h.atkAuraTimer = (sk.duration*DUR);
        h.shieldAuraTimer = (sk.duration*DUR);
        floatText(h.x, h.y-30, "+"+Math.round(amt), "heal");
        if(newfxReady('holyHealBurst')) vfxSprite("fxHolyHealBurst", 0, h.x, h.y, 96, 480, h, 0, false, 0.95, 8);
        buffed++;
      }
      if(caster.stats && buffed>0){ caster.stats.buffsGranted += buffed; setsOnSupport(caster, buffed); }
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = (sk.radius*AREA)*0.55; caster.sigilColor = "#c88cff"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:800, ring:true, maxLife:800, maxR:(sk.radius*AREA), color:"#c88cff"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.55, allocLevel(mastery), "#c88cff", "#ffcf5c");
      if(caster===player) floatText(caster.x, caster.y-52, "¡BENDICIÓN SUPREMA!", "crit");
      break;
    }

    case "triple_hit": {
      const t = aimTarget(caster, caster.cls.basicRange+50);
      if(t){
        damageEnemy(t, dmg, {src:caster});
        particles.push({x:t.x-6,y:t.y-8, life:150, slash:true, color:"#8fd0ff"});
        damageEnemy(t, dmg, {src:caster});
        particles.push({x:t.x,y:t.y-4, life:190, slash:true, color:"#ff9a4d"});
        // Talento "Golpe de Gracia"/"Ejecutor Nato": el golpe final es mucho más letal contra
        // enemigos ya muy heridos.
        const executeBonus = (t.hp/t.maxHp <= 0.30) ? (tSkill.flags.executeLowHpBonus||0) : 0;
        damageEnemy(t, dmg*(sk.finalMult+executeBonus), {src:caster, forceCrit:true});
        particles.push({x:t.x+4,y:t.y, life:280, slash:true, color:"#ff3b3b"});
        tieredBurstVFX(t.x, t.y, 42, allocLevel(mastery), "#ff3b3b", "#ffb08a");
        pushAsesinoFx("triple_golpe", "combo", t.x, t.y, 95, 1200, caster.fx<0);
        if(caster===player) floatText(t.x, t.y-42, "¡TRIPLE GOLPE!", "crit");
      }
      break;
    }

    case "area_trap": {
      const _tp = aimPoint(caster, sk.range*AREA, sk.radius*AREA*1.6), tx = _tp.x, ty = _tp.y;
      // Cantidad de trampas escala con el talento invertido: 1 en tier1, hasta 4 en tier4 (máx).
      // Se reparten en abanico perpendicular a la dirección de lanzamiento, cubriendo un paso
      // más ancho cuanto más trampas se colocan.
      // Talento "Campo Minado"/"Campo de Caza": trampas adicionales por lanzamiento, sumadas a
      // las que ya otorga la maestría de la habilidad.
      const trapTier = Math.min(8, tierOf(allocLevel(mastery)) + Math.round(tSkill.flags.extraTrapCount||0));
      const perpX = -caster.fy, perpY = caster.fx;
      const spacing = 46;
      for(let i=0;i<trapTier;i++){
        const off = (i - (trapTier-1)/2) * spacing;
        const px = tx + perpX*off, py = ty + perpY*off;
        traps.push({x:px, y:py, radius:(sk.radius*AREA), chainRadius:(sk.chainRadius*AREA), dmg, timer:(sk.duration*DUR), armTime:280, src:caster, triggered:false, phase:0});
        tieredBurstVFX(px, py, (sk.radius*AREA)*0.7, allocLevel(mastery), "#7dffa0", "#c8ffd8");
        pushAsesinoFx("trampa", "desplegar", px, py, 80, 700, false);
      }
      break;
    }

    case "shadow_stealth": {
      caster.stealthTimer = (sk.stealthDuration*DUR);
      caster.stealthPending = true;
      caster.stealthSk = sk;
      tieredBurstVFX(caster.x, caster.y, 50, allocLevel(mastery), "#4a3a5a", "#9a6ac7");
      pushAsesinoFx("pestilencia", "sigilo", caster.x, caster.y, 100, 500, caster.fx<0);
      if(caster===player) floatText(caster.x, caster.y-50, "¡SIGILO!", "heal");
      break;
    }

    case "cone_slash": {
      // Tajo del Segador: corte horizontal amplio frente al personaje, golpea varios enemigos.
      // Con la Armadura de la Furia en Nivel 5+, el área se recorta -30% a cambio del +50% de
      // daño que ya se aplica por buffDmgMult (ver case "fury_armor").
      const furyArea = caster.furyArmorTimer>0 ? (caster.furyAreaMult||1) : 1;
      const range = sk.range*AREA*furyArea;
      aimDir(caster, range+60);
      const halfArc = sk.arc;
      const facing = Math.atan2(caster.fy, caster.fx);
      const slashTier = tierOf(allocLevel(mastery));
      const maxHits = 3 + slashTier; // atraviesa más objetivos cuanto más talento
      let hitCount = 0;
      for(const e of enemies){
        if(!e.alive || hitCount>=maxHits) continue;
        const d = distance(caster,e);
        if(d > range) continue;
        const ang = Math.atan2(e.y-caster.y, e.x-caster.x);
        let diff = Math.abs(ang-facing);
        if(diff>Math.PI) diff = Math.PI*2-diff;
        if(diff <= halfArc/2){
          damageEnemy(e, dmg, {src:caster, knockback:sk.knockback});
          hitCount++;
        }
      }
      const midx = caster.x+caster.fx*range*0.55, midy = caster.y+caster.fy*range*0.55;
      tieredBurstVFX(midx, midy, range*0.55, allocLevel(mastery), "#c62828", "#ff8a7a");
      particles.push({x:caster.x, y:caster.y-14, x2:caster.x+caster.fx*range, y2:caster.y+caster.fy*range, life:240, bolt:true, color:"#ff5c4a"});
      // Arco de tajo real (dibujado a mano) siguiendo el ángulo exacto del golpe.
      if(newfxReady('scytheSlash')) vfxSprite("fxScytheSlash", 0, caster.x+caster.fx*range*0.1, caster.y+caster.fy*range*0.1-6, Math.min(120, Math.max(60, range*0.65)), 260, null, 0, false, 0.5, 15, 0, 0, facing);
      // Talento alto (nivel 9-10): onda de choque corta después del golpe
      if(slashTier>=4){
        const shockX=caster.x, shockY=caster.y, shockR=range*0.75, shockDmg=dmg*0.4;
        runLater(170, ()=>{
          for(const e of enemies){
            if(!e.alive) continue;
            if(distance({x:shockX,y:shockY},e) <= shockR) damageEnemy(e, shockDmg, {src:caster});
          }
          particles.push({x:shockX,y:shockY, life:420, ring:true, maxLife:420, maxR:shockR, color:"#ff5c4a"});
        });
      }
      break;
    }

    case "fury_armor": {
      // Armadura de la Furia — progresión de 6 niveles (spec Berserk/Segador Olvidado):
      // N1 activa + visual básico | N2 +30% reducción de daño y resistencia a control |
      // N3 +200% generación de Furia por golpe | N4 10% del daño recibido -> poder ofensivo |
      // N5 +50% daño/-30% área | N6 Tajo Final al terminar, pushback máximo, visual máximo.
      const flvl = allocLevel(mastery);
      // Talento "Me Niego a Morir"/"Muro de Furia": reducción de daño extra con vida crítica.
      const lowHpBonus = (caster.hp < caster.maxHp*0.3) ? (tSkill.flags.lowHpDefBonus||0) : 0;
      const dmgReduction = Math.min(0.75, (flvl>=2 ? Math.max(sk.defBonus, 0.30) : sk.defBonus) + lowHpBonus);
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-dmgReduction);
      // Talento "Banquete de Furia": robo de vida extra mientras la Armadura esté activa.
      caster.buffLifesteal = Math.max(caster.buffLifesteal||0, sk.lifestealBonus+(tSkill.flags.furyLifestealBonus||0));
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      caster.furyArmorTimer = Math.max(caster.furyArmorTimer||0, (sk.duration*DUR));
      caster.furyArmorMaxTimer = (sk.duration*DUR);
      caster.furyResistCC = flvl>=2;
      caster.furyGenMult = flvl>=3 ? 3.0 : 1.0;
      caster.furyConvertPct = flvl>=4 ? 0.10 : 0;
      caster.furyPower = 0; // acumulado de daño convertido (N4), se resetea cada activación
      if(flvl>=5){
        caster.buffDmgMult = Math.max(caster.buffDmgMult||1, 1.50);
        caster.furyAreaMult = 0.70;
      } else {
        caster.furyAreaMult = 1.0;
      }
      caster.furyFinalSlash = flvl>=6;
      tieredBurstVFX(caster.x, caster.y, 46, allocLevel(mastery), "#c62828", "#ff5c4a");
      if(caster===player) floatText(caster.x, caster.y-50, "¡FURIA!"+(flvl>=6?" MÁXIMA":""), "crit");
      break;
    }

    case "last_stand_burst": {
      // Último Aliento (activación): intensifica el furor un rato y cura una porción al lanzarlo.
      // El pasivo real (más daño cuanto menos vida) corre todo el tiempo, ver furyMissingHpMult().
      caster.buffDmgMult = Math.max(caster.buffDmgMult||1, 1+sk.dmgBonus);
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      const healAmt = caster.maxHp*sk.healOnCastPct;
      caster.hp = Math.min(caster.maxHp, caster.hp+healAmt);
      floatText(caster.x, caster.y-34, "+"+Math.round(healAmt), "heal");
      tieredBurstVFX(caster.x, caster.y, 40, allocLevel(mastery), "#8a1414", "#ff5c4a");
      if(caster===player) floatText(caster.x, caster.y-56, "¡ÚLTIMO ALIENTO!", "crit");
      break;
    }

    case "berserker_ult": {
      // Segador de Almas: Furia máxima, daño e impacto enormes, roba vida, resiste el control.
      // Cada baja durante la ulti prolonga su duración (ver killEnemy).
      caster.buffDmgMult = Math.max(caster.buffDmgMult||1, 1+sk.dmgBonus);
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-sk.defBonus-(tSkill.flags.ultDefBonus||0));
      caster.buffLifesteal = Math.max(caster.buffLifesteal||0, sk.lifesteal+(tSkill.flags.ultLifestealBonus||0));
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      caster.berserkTimer = (sk.duration*DUR);
      caster.berserkExtendMs = sk.killExtendMs;
      caster.furyArmorTimer = Math.max(caster.furyArmorTimer||0, (sk.duration*DUR));
      cataclysmVFX(caster, 90, allocLevel(mastery));
      // Vórtice de almas real (calavera emergiendo) sobre el instante del cast, además del
      // estallido genérico ya existente arriba.
      if(newfxReady('soulReapBurst')) vfxSprite("fxSoulReapBurst", 0, caster.x, caster.y-30, 150, 650, null, 0, false, 0.5, 8);
      if(caster===player) floatText(caster.x, caster.y-56, "¡SEGADOR DE ALMAS!", "crit");
      break;
    }

    case "retro_heal": {
      // La Profeta — Destino Restaurado: cura al instante al aliado más herido y, si está
      // gravemente herido (< gravePct de vida), además revierte una porción del daño que
      // recibió en los últimos `retroWindowMs` (ver el historial que arma damageHero).
      let target=null, lowRatio=1;
      for(const h of heroes){ if(!h.alive) continue; const r=h.hp/h.maxHp; if(r<lowRatio){ lowRatio=r; target=h; } }
      if(!target) target = caster;
      // "Precio del Destino" (rama Sacrificio): a cambio de curar más, le cuesta vida propia a
      // la Profeta -tope defensivo para que nunca pueda costar más del 40% de su vida actual ni
      // dejarla en 0-.
      const selfCostPct = Math.max(0, tSkill.flags.sacrificeSelfCostPct||0);
      const healBonusPct = tSkill.flags.sacrificeHealBonus||0;
      if(selfCostPct>0 && caster!==target){
        const cost = Math.min(caster.hp*0.4, caster.maxHp*selfCostPct);
        caster.hp = Math.max(1, caster.hp-cost);
        if(caster===player) floatText(caster.x, caster.y-40, "-"+Math.round(cost));
      }
      const healAmt = target.maxHp*(sk.healPct*POWER)*(1+healBonusPct);
      trackHeal(caster, target, healAmt);
      applyHealOverheal(caster, target, healAmt);
      floatText(target.x, target.y-30, "+"+Math.round(healAmt), "heal");
      if(lowRatio < (sk.gravePct||0.4) && target.recentDamage && target.recentDamage.length){
        const now = performance.now(), windowMs = sk.retroWindowMs||4500;
        let recovered = 0;
        for(const rec of target.recentDamage){ if(now-rec.t <= windowMs) recovered += rec.amount; }
        target.recentDamage = []; // se consume al revertirlo (y descarta lo viejo de paso)
        if(recovered>0){
          const retroAmt = recovered*(sk.retroPct*POWER);
          target.hp = Math.min(target.maxHp, target.hp+retroAmt);
          floatText(target.x, target.y-54, "+"+Math.round(retroAmt), "heal");
          if(target===player || caster===player) floatText(target.x, target.y-74, "¡DESTINO RESTAURADO!", "crit");
        }
      }
      particles.push({x:target.x,y:target.y, life:500, ring:true, maxLife:500, maxR:60, color:"#8fffe0"});
      tieredBurstVFX(target.x, target.y, 60, allocLevel(mastery), "#8fffe0", "#eafff8");
      break;
    }

    case "brief_immunity": {
      // La Profeta — Visión del Inmortal: un aliado CERCANO (no ella misma si hay otro
      // disponible) se vuelve inmune a daño y se le limpian los efectos negativos activos;
      // al terminar recibe una pequeña regeneración (ver el visionImmortalTimer en
      // update()/updateAllies()).
      let target=null, bd=sk.range||260;
      for(const h of heroes){ if(h===caster || !h.alive) continue; const d=distance(caster,h); if(d<=bd){ bd=d; target=h; } }
      if(!target) target = caster;
      const dur = sk.duration*DUR;
      target.invulnTimer = Math.max(target.invulnTimer||0, dur);
      target.stunTimer = 0; target.slowAmt = 0; target.slowTimer = 0; target.burnTimer = 0; target.bleedTimer = 0;
      target.visionImmortalTimer = Math.max(target.visionImmortalTimer||0, dur);
      target.visionImmortalRegenPct = sk.regenPct*POWER;
      particles.push({x:target.x,y:target.y, life:420, ring:true, maxLife:420, maxR:44, color:"#eafff8"});
      tieredBurstVFX(target.x, target.y, 44, allocLevel(mastery), "#bffff0", "#ffffff");
      if(target===player || caster===player) floatText(target.x, target.y-46, "¡VISIÓN DEL INMORTAL!", "crit");
      break;
    }

    case "self_spin_stun": {
      // La Profeta — Danza del Augurio: gira con su hoja, daño en área a su alrededor; a los
      // enemigos que estén MUY cerca (Rinner) además los aturde brevemente.
      const R = sk.radius*AREA, Rinner = sk.innerR*AREA*(1+(tSkill.flags.augurioStunRadiusPct||0));
      for(const e of enemies){
        if(!e.alive) continue;
        const d = distance(caster,e);
        if(d<=R) damageEnemy(e, dmg, {stun: d<=Rinner ? (sk.stun*DUR) : undefined, src:caster});
      }
      caster.profetaSpinFxTimer = 480;
      particles.push({x:caster.x,y:caster.y, life:420, maxLife:420, spin:true, radius:R*0.85, color:"#8fffe0"});
      tieredBurstVFX(caster.x, caster.y, R, allocLevel(mastery), "#8fffe0", "#eafff8");
      break;
    }

    case "ascension_fusion": {
      // La Profeta — Ascensión del Elegido: se acerca a un aliado y se fusiona con él
      // (invisible/invulnerable mientras dura, ver caster.fused en triggerBasic/castAbility/
      // update/updateAllies). El aliado recibe una curación enorme y un empoderamiento total
      // -daño, velocidad de ataque, resistencia, robo de vida y cooldowns casi nulos (ver el
      // ascensionTimer que fuerza los cds a un mínimo, en update()/updateAllies())-, todo por
      // los mismos campos buffDmgMult/buffAtkSpeedMult/buffDefMult/buffLifesteal/buffTimer de
      // siempre: cuando buffTimer expira, el motor YA sabe revertirlos solo (mismo código que
      // usa cualquier otro buff temporal del roster) -sin eso, "revertir todo con prolijidad"
      // hubiera significado reinventar ese reset a mano y arriesgarse a dejar algo pisado.
      let target=null, bd=Infinity;
      for(const h of heroes){ if(h===caster || !h.alive) continue; const d=distance(caster,h); if(d<bd){ bd=d; target=h; } }
      const dur = sk.duration*DUR;
      const fusing = !!target;
      if(!target) target = caster; // sin aliados vivos: se potencia a sí misma en vez de fusionarse
      const healAmt = target.maxHp*(sk.healPct*POWER);
      trackHeal(caster, target, healAmt);
      applyHealOverheal(caster, target, healAmt);
      // POWER (maestría + talentos de "Elegida") escala TODO el empoderamiento, no solo la
      // curación: la parte de bonus por encima de 1x de daño/velocidad, y el total de
      // defensa/robo de vida otorgados.
      target.buffDmgMult = Math.max(target.buffDmgMult||1, 1+(sk.dmgMult-1)*POWER);
      target.buffAtkSpeedMult = Math.max(target.buffAtkSpeedMult||1, 1+(sk.atkSpeedMult-1)*POWER);
      target.buffDefMult = Math.min(target.buffDefMult||1, 1-sk.defBonus*POWER);
      target.buffLifesteal = Math.max(target.buffLifesteal||0, sk.lifesteal*POWER);
      target.buffTimer = Math.max(target.buffTimer||0, dur);
      target.ascensionTimer = Math.max(target.ascensionTimer||0, dur);
      target.ascensionMaxTimer = dur;
      if(fusing){
        caster.x = target.x + (caster.x<target.x ? -1 : 1)*32;
        caster.y = target.y;
        clampToArena(caster);
        caster.stealthTimer = Math.max(caster.stealthTimer||0, dur);
        caster.invulnTimer = Math.max(caster.invulnTimer||0, dur);
        caster.fused = true;
        caster.ascensionFusedWith = target;
      }
      showBanner("¡ASCENSIÓN DEL ELEGIDO!");
      floatText(target.x, target.y-60, "+"+Math.round(healAmt), "heal");
      particles.push({x:target.x,y:target.y, life:700, ring:true, maxLife:700, maxR:90, color:"#eafff8"});
      particles.push({x:target.x,y:target.y, life:700, maxLife:700, runeRing:true, maxR:70, color:"#8fffe0", count:12});
      tieredBurstVFX(target.x, target.y, 90, 8, "#8fffe0", "#ffffff");
      break;
    }
  }
  } finally { _castCtx = _prevCastCtx; }
}
