"use strict";
/* ============================================================
   js/data/champion-tuning.js
   BALANCE CENTRALIZADO de El Libertador (José de San Martín, clave "libertador") y de Eren
   (El Portador, clave "eren"). Todo número que define cómo se sienten sus habilidades está acá:
   daño, cooldowns (los de los botones están en CLASSES, js/data/champions.js), alcances,
   duraciones, velocidades, buffs, Furia, transformación, regeneración, áreas, aturdimientos,
   empujes, sangrado y daño de las definitivas. La lógica está en js/champions/libertador.js y
   js/champions/eren.js y nunca repite estos valores.
   Convenciones: *Ms = milisegundos, *Pct/*Mult = proporción (0.2 = +20%), dmgMult = veces el
   daño base del campeón (ya escalado por nivel, objetos, talentos y maestría de la habilidad).
   ============================================================ */
const SM_CFG = {
  // Fusil de Granadero (básico): pocos disparos, cada uno importa
  musket:   {reloadMs:1450, projSpeed:1000, range:380, projLife:520, dmgMult:1.0, recoilPx:5, aimMs:120},
  // Disparo de Oficial: cada N disparos que impactan, el siguiente es especial
  officer:  {every:4, dmgMult:2.2, pierce:1},
  // Bayoneta (hab. 1): embestida corta que se detiene al conectar
  bayonet:  {dashDist:190, dashSpeed:950, dmgMult:2.5, bleedMs:3000, staggerMs:350, finishHpPct:0.15, finishMs:260},
  // ¡Granaderos, a la carga! (hab. 2): buff de equipo
  granaderos: {durationMs:8000, radius:430, speedPct:0.20, atkSpeedPct:0.15, dmgPct:0.15, ccResist:0.40, commandMs:520},
  // Carga de San Lorenzo (hab. 3): montar -> cargar -> impacto -> desmontar
  sanLorenzo: {mountMs:260, chargeDist:430, chargeSpeed:880, width:64, dmgMult:1.9, knockPx:80, eliteStunMs:650,
               bossDefDownPct:0.20, bossDefDownMs:4000, dismountMs:280, ccResist:0.85},
  // Soldado Cabral (pasiva, una vez por partida)
  cabral:   {invulnMs:2000, speedPct:0.30, speedMs:3000},
  // Cruce de los Andes (definitiva) + forma montada
  andes:    {castMs:950, chargeMs:1250, chargeDist:640, width:240, dmgMult:4.2, knockPx:110, eliteStunMs:900,
             bossDefDownPct:0.25, bossDefDownMs:6000, frostMs:7000, frostPatches:10, riders:12, snow:70},
  mounted:  {durationMs:10000, speedPct:0.40, dmgPct:0.25, dmgReduce:0.20, ccResist:0.5,
             sabreRange:98, sabreCdMs:560, sabreDmgMult:1.15, sabreArc:0.2}
};
const EREN_CFG = {
  // FURIA = la barra de la definitiva (ultCharge 0..ultMax). Además de lo que carga pegando
  // (igual que cualquier campeón), sube al recibir daño y con el 3er golpe del combo.
  fury:     {perHpPctTaken:0.9, comboThird:5, lowHpBonus:1.0, titanGainMult:0.55},
  // Doble hoja (básico): combo de 3
  blades:   {combo:[1.0, 1.0, 1.45], windowMs:900},
  // Equipo de Maniobras (hab. 1): gancho -> vuelo -> segundo gancho (cambio de dirección)
  hook:     {dashDist:360, dashSpeed:1150, redirects:1, redirectDist:300, slashRadius:74, slashDmgMult:1.4, landMs:200, prepMs:90},
  // Instinto de Supervivencia (hab. 2): se expone para cargar Furia
  instinct: {durationMs:3500, dmgReduce:0.35, furyMult:3.0},
  // ¡Avancen! (hab. 3): grito ofensivo, más fuerte con poca vida
  advance:  {durationMs:7000, speedPct:0.18, dmgPct:0.18, furyMult:1.5, lowHpScale:0.8, allyRadius:300, allyShare:0.35},
  // Seguir Adelante (pasiva)
  passive:  {threshold:0.25, speedPct:0.15, dmgPct:0.15, furyMult:1.5},
  // El Portador (definitiva 1) y forma monstruosa
  titan:    {tfMs:1600, biteMs:420, durationMs:22000, hpMult:2.6, dmgMult:1.9, radiusMult:2.2, visualScale:2.7,
             speedMult:0.82, def:0.25, regenPct:0.30, regenPerSecPct:0.02,
             atkRange:112, atkAoe:72, atkCdMs:950, thirdAoe:150, thirdMult:1.8, knockPx:55, eliteStaggerMs:350},
  sismo:    {radius:230, dmgMult:3.2, falloff:0.45, knockPx:95, eliteStunMs:500},
  terremoto:{pulses:4, intervalMs:500, radius:250, dmgMult:1.25, vulnMult:1.25},
  retumbar: {steps:6, stepMs:520, radius:160, dmgMult:1.35, speed:95, knockPx:60, eliteStaggerMs:260},
  // El Retumbar (definitiva 2, secreta): tres pisadas con aviso, control cedido
  rumbling: {roarMs:1300, telegraphMs:1350, gapMs:650, dist:320, radii:[250, 250, 420], dmgMult:[8, 8, 13],
             knockPx:140, silhouettes:9},
  exhausted:{durationMs:6000, speedPct:-0.30, noTransformMs:20000}
};
