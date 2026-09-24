"use strict";
/* ============================================================
   js/champions/hero-factory.js
   Creación de héroes (jugador y aliados) a partir de los datos de CLASSES.
   ============================================================ */

/* ============================================================
   ENTITY FACTORY
   ============================================================ */
function makeHero(classKey, isBot, spawnX, spawnY, levelOverride, isDivineFoe){
  const base = computePlayerStats(classKey, levelOverride); // ya incluye hp_mult/speed_mult (talentos+objetos)
  const cls = CLASSES[classKey];
  // Energía sí se calcula acá aparte (computePlayerStats no la toca): talentos/objetos con
  // energy_mult, mismo balde {effect,value} de siempre, sumado UNA vez al crear el héroe (no
  // cambia a mitad de partida, a diferencia de dmg/cd/def/lifesteal que sí se leen en caliente).
  const tEnergy = 1 + passiveSum(classKey, "energy_mult");
  let maxHp = Math.round(base.hp * runStats.hpMult);
  if(isBot && !isDivineFoe) maxHp = Math.round(maxHp*1.15); // los aliados aguantan un poco más
  // Escudo PERMANENTE otorgado por casco+escudo equipados (distinto del escudo temporal de
  // habilidades: este no desaparece por timer, solo se consume con el daño y no regenera solo,
  // tal como pide el diseño ("no inventar regeneración si no existe").
  const itemMaxShield = Math.round(maxHp * (base.shieldPct||0));
  const teleportChargeMax = Math.max(0, Math.round(talentSkillMods(classKey, 2).flags.extraTeleportCharges||0));
  return {
    x:spawnX||0, y:spawnY||0, radius:24, scale:2.0,
    classKey, cls, isBot: !!isBot, isDivineFoe: !!isDivineFoe,
    maxHp, hp:maxHp,
    itemShield: itemMaxShield, itemMaxShield, emergencyShieldUsed:false,
    maxEnergy:Math.round(cls.energyMax*tEnergy), energy:Math.round(cls.energyMax*tEnergy),
    baseDmg: base.dmg * (isBot && !isDivineFoe ? 0.72 : 1), def:base.def, baseSpeed:base.speed*(isBot?0.95:1)*arenaMods().heroSpeedMult,
    // Axiom — Teletransporte con cargas (ver resolveTeleportCd): 0 cargas extra por defecto,
    // como siempre; solo campeones con el talento correspondiente arrancan con más de 1.
    teleportChargeMax, teleportChargesBanked: teleportChargeMax, teleportChargeTimer:0,
    ultCharge:0, ultMax:100,
    shield:0, shieldTimer:0,
    stunTimer:0,
    buffTimer:0, buffDmgMult:1, buffAtkSpeedMult:1, buffLifesteal:0, buffDefMult:1, buffBleedOnHit:false,
    regenTimer:0, regenPerSec:0, hurtTimer:0,
    spinTimer:0, spinMaxTimer:0, spinRadius:0, spinTick:0, spinTickInterval:0, spinDmg:0,
    spinDurationMult:1, colossalTimer:0, pendingHpBonus:0, growTimer:0, growScale:1, spinTier:1,
    stormTimer:0, stormMaxTimer:0, stormTick:0, stormTickInterval:0, stormRadius:0, stormDmg:0,
    stormNovaLeft:0, stormNovaInterval:0, stormNovaTimer:0, stormNovaDmg:0, stormNovaFreeze:0, stormNovaFreezeDur:0,
    furyArmorTimer:0, furyArmorMaxTimer:0, berserkTimer:0, berserkExtendMs:0, // Segador Olvidado
    furyPower:0, furyGenMult:1, furyConvertPct:0, furyAreaMult:1, furyFinalSlash:false, furyResistCC:false,
    dashFxTimer:0, dashFxFlip:false, growMaxTimer:0, // Tanque: overlays visuales de habilidades
    burnTimer:0, burnDmg:0, // quemadura ambiental (Arena Infernal)
    atkAuraTimer:0, shieldAuraTimer:0,
    sigilTimer:0, sigilMaxTimer:0, sigilRadius:0, sigilColor:"", sigilTier:1,
    stealthTimer:0, stealthPending:false,
    cds:[0,0,0], basicCd:0, ultCd:0,
    fx:0, fy:1, animT:0, moving:false, attackAnim:0,
    // La Profeta: combo del básico (Danza del Presagio), historial de daño reciente (para
    // Destino Restaurado) y estado de la Ascensión del Elegido (ver castAbility/triggerBasic).
    presagioCharges:0, presagioComboTimer:0, profetaSpinFxTimer:0, recentDamage:[],
    visionImmortalTimer:0, visionImmortalRegenPct:0,
    ascensionTimer:0, ascensionMaxTimer:0, ascensionFusedWith:null, fused:false,
    // Musashi — Marca de Duelo/Concentración (pasiva 1, sección "MUSASHI"): duelTarget es una
    // referencia directa al enemigo marcado (no un id: mientras esté vivo, es el mismo objeto
    // dentro de `enemies`); concentration va de 0 a MUSASHI_CONC_MAX y se resetea al cambiar
    // de objetivo. comboCharges/comboTimer son el combo de 3 golpes del básico (independiente
    // de la Concentración: el combo es "cuántos golpes seguidos", la Concentración es "cuánto
    // conoce a ESTE rival"). ghostStepCritTimer: ventana de crítico garantizado en el próximo
    // básico tras Paso Fantasma. duelActive/duelTimer/duelReturnX/Y/duelOpponent: estado del
    // Último Duelo en curso (ver enterLastDuel/updateLastDuel/exitLastDuel).
    duelTarget:null, concentration:0, comboCharges:0, comboTimer:0, ghostStepCritTimer:0,
    ghostStepCdBonusTimer:0, secondCutPending:0,
    duelActive:false, duelTimer:0, duelMaxTimer:0, duelReturnX:0, duelReturnY:0, duelOpponent:null, duelResult:null,
    // Sylva — Instinto de Caza (Presa/Rastreo, 0-5) e Impulso (0-10, sube moviéndose/atacando,
    // decae tras una breve gracia sin hacer ninguna de las dos cosas). huntTarget es la
    // referencia directa al enemigo marcado, igual mecanismo que duelTarget de Musashi pero
    // con su propia progresión (no comparten variable a propósito, sección 24 del pedido de
    // Musashi ya advertía "no mezclar sistemas en una sola variable", mismo criterio acá).
    huntTarget:null, trackStacks:0, momentum:0, momentumGraceTimer:0,
    sylvaCharging:false, sylvaChargeTimer:0, sylvaTrapBurstTimer:0, sylvaTrapBurstBonus:0,
    wildHuntTimer:0, wildHuntMaxTimer:0, wolf:null,
    // Nigromante:
    skeletons:[], golem:null, nigroCastKind:null, nigroGraveyard:[],
    nigroTransformTimer:0, nigroDemonForm:false, nigroDemonTimer:0, nigroDemonMaxTimer:0,
    nigroAbsorbedSkeletons:0, nigroAbsorbedGolem:false, nigroGolemSkin:"stone",
    // Fase 2 — evaluación de desempeño por rol: contadores que se acumulan durante la partida
    // y se usan al final para puntuar la contribución de cada campeón (ver computeRoleScore).
    // duelVictories: Senda del Rōnin (Musashi) -progresión INTRAPARTIDA, nunca permanente de
    // cuenta, se reinicia sola en cada partida nueva porque stats se recrea acá cada vez.
    stats:{dmgDealt:0, dmgToBoss:0, kills:0, abilityHits:0, healDone:0, healEffective:0,
      alliesSaved:0, revives:0, dmgTaken:0, enemiesControlled:0, presenceTicks:0, buffsGranted:0, statSampleTimer:0,
      duelVictories:0},
    alive:true
  };
}
function makePlayer(){ return makeHero(selectedClass, false, 0, 0); }
