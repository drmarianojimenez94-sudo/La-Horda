"use strict";
/* ============================================================
   js/data/champions.js
   DATOS de campeones: catálogo (orden, desbloqueo) y CLASSES (vida, daño,
   defensa, velocidad, energía, alcance, habilidades con sus costos/cooldowns/valores).
   >>> Acá se ajusta el balance de cada campeón y sus habilidades.
   ============================================================ */

// Catálogo de campeones: estructura de datos separada del progreso guardado, para poder
// agregar campeones nuevos sin tocar la interfaz de la Galería/Tienda.
// MODO CAMPAÑA (prueba): cada jugador ELIGE UN campeón de regalo al empezar (pantalla "Tu primer
// campeón", js/ui/starter-select.js); todos los demás arrancan bloqueados y se compran en la
// Tienda por CHAMPION_PRICE_GOLD de oro. Para agregar un campeón nuevo alcanza con sumar una fila.
// ETAPA DE PRUEBA (BUGFIX 01): todos los campeones a 1.000 de oro para poder probarlos. El precio de
// la economía final era 5.000 (un campeón nuevo como meta real): volver a ese valor al cerrar la prueba.
const CHAMPION_PRICE_GOLD = 1000;
const CHAMPION_CATALOG = [
  {id:"tanque",   priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"El primero en entrar y el último en caer. Un muro viviente entre la horda y sus aliados."},
  {id:"guerrero", priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Rápido, letal, sin piedad. Golpea antes de que lo vean venir."},
  {id:"mago",     priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Domina el fuego y el hielo. El área alrededor suyo es territorio enemigo."},
  {id:"soporte",  priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Mientras respire, nadie de su equipo cae para siempre."},
  {id:"segador",  priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Cuanto más cerca de la muerte, más peligroso se vuelve."},
  {id:"axiom",    priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Descubrió que la realidad está construida con reglas y código. No lanza hechizos: reescribe las reglas."},
  {id:"profeta",  priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Ve el destino de sus aliados antes de que ocurra. A veces, eso es suficiente para cambiarlo."},
  {id:"musashi",  priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Un rōnin veterano que carga un bokken en vez de una katana. Cree que cualquier arma alcanza contra un rival al que se entiende de verdad."},
  {id:"cazadora", priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Una tiradora extremadamente móvil que gana velocidad mientras persigue a su presa."},
  {id:"nigromante", priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"No pelea solo. Levanta a los caídos, crea un coloso de piedra y, si hace falta, se convierte él mismo en un demonio."},
  {id:"libertador", priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Un comandante legendario que castiga a sus enemigos con disparos devastadores y lidera cargas capaces de quebrar ejércitos."},
  {id:"eren", priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:false, lore:"Un guerrero que convierte el peligro en furia. Domina el campo mediante movilidad extrema hasta liberar una fuerza monstruosa capaz de hacer temblar la arena."}
];

const CLASSES = {
  tanque:{
    name:"Tanque", icon:"🛡", color:"#5f8fc4", glow:"#a9cdf0",
    role:"Resistencia, protección y control de área.", roleCategory:"tanque",
    baseHP:150, baseDmg:9, baseDef:0.18, baseSpeed:150, energyMax:100, energyRegen:10, hpGrowthMult:1.45, dmgGrowthMult:0.75,
    basicRange:78, basicCd:620, basicArc:true,
    skills:[
      {name:"Torbellino", ico:"🌀", cost:46, cd:9500, kind:"spin_channel", duration:2400, tick:280, dmgMult:0.5, radius:115, desc:"Gira sin parar dañando a su alrededor"},
      {name:"Embestida", ico:"➳", cost:34, cd:6500, kind:"charge_drag", range:230, dmgMult:1.6, dragTime:260, stun:400, desc:"Carga, arrastra y golpea a un enemigo"},
      {name:"Grito de Guerra", ico:"🛡", cost:32, cd:8500, kind:"war_cry", defBonus:0.24, hpBonusPct:0.16, growScale:1.18, duration:5000, desc:"Grito que aumenta armadura, vida máxima y su tamaño"}
    ],
    ultimate:{name:"Grito Provocador", ico:"★", cd:30000, kind:"taunt_provoke", radius:230, defBonus:0.38, hpBonusPct:0.35, spinMult:2, duration:6000, desc:"Provoca a los enemigos, se agiganta y gana armadura y vida máxima"}
  },
  guerrero:{
    name:"Asesino", icon:"🗡", color:"#c4544a", glow:"#f0a89a",
    role:"Daño físico cuerpo a cuerpo contra objetivos y jefes.", roleCategory:"asesino",
    baseHP:120, baseDmg:13, baseDef:0.10, baseSpeed:175, energyMax:100, energyRegen:10.5, hpGrowthMult:0.9, dmgGrowthMult:1.3,
    basicRange:64, basicCd:420, basicArc:false,
    skills:[
      {name:"Corte Sangrante", ico:"🩸", cost:32, cd:5000, kind:"bleed_hit", dmgMult:1.25, bleedDur:3400, desc:"Aplica un sangrado profundo"},
      {name:"Triple Golpe", ico:"⚔", cost:40, cd:6800, kind:"triple_hit", dmgMult:0.6, finalMult:3.0, desc:"Tres golpes veloces; el último causa +300% de daño"},
      {name:"Trampa de Área", ico:"💠", cost:38, cd:9500, kind:"area_trap", range:170, radius:65, chainRadius:135, dmgMult:1.5, duration:12000, desc:"Coloca una trampa que explota y encadena daño"}
    ],
    ultimate:{name:"Pestilencia Sombría", ico:"★", cd:32000, kind:"shadow_stealth", stealthDuration:2000, dmgMult:1.15, finalMult:1.4, poisonDmgMult:0.16, bleedDmgMult:0.14, duration:3000, chainRadius:150, desc:"Sigilo total y un triple golpe que envenena y encadena sangrado"}
  },
  mago:{
    name:"Mago", icon:"🔥", color:"#a15fc7", glow:"#d9a9f0",
    role:"Daño mágico, área y control elemental.", roleCategory:"mago",
    baseHP:95, baseDmg:11, baseDef:0.06, baseSpeed:155, energyMax:110, energyRegen:8, hpGrowthMult:0.7, dmgGrowthMult:1.45,
    basicRange:340, basicCd:560, basicArc:false, ranged:true,
    skills:[
      {name:"Muro de Fuego", ico:"🔥", cost:42, cd:9000, kind:"fire_wall", range:190, innerR:38, outerR:82, duration:4500, tick:450, dmgMult:0.42, element:"fire", desc:"Crea un anillo de fuego que quema al pisarlo"},
      {name:"Nova de Escarcha", ico:"❄", cost:40, cd:8200, kind:"frost_nova", radius:125, dmgMult:1.05, freeze:0.92, freezeDur:1900, element:"ice", desc:"Congela a los enemigos cercanos"},
      {name:"Cadena de Relámpago", ico:"⚡", cost:42, cd:5800, kind:"chain", dmgMult:1.45, jumps:4, jumpRange:190, falloff:0.78, element:"lightning", desc:"Salta entre enemigos"}
    ],
    ultimate:{name:"Cataclismo Elemental", ico:"★", cd:32000, kind:"elemental_storm", radius:230, dmgMult:1.55, strikeDmgMult:0.85, duration:5000, strikeInterval:420, burn:true, slow:0.45, novaCount:3, novaDmgMult:0.7, novaFreeze:0.7, novaFreezeDur:1300, armorDefBonus:0.25, desc:"3 novas de hielo, lluvia de rayos por 5s y armadura de fuego"}
  },
  soporte:{
    name:"Soporte", icon:"✦", color:"#5fc48c", glow:"#a9f0c9",
    role:"Curación, supervivencia y potenciación del equipo.", roleCategory:"soporte",
    baseHP:105, baseDmg:7, baseDef:0.12, baseSpeed:165, energyMax:110, energyRegen:11, hpGrowthMult:1.2, dmgGrowthMult:0.7,
    basicRange:320, basicCd:600, basicArc:false, ranged:true,
    skills:[
      {name:"Curación de Área", ico:"✚", cost:40, cd:7000, kind:"team_heal_aoe", healPct:0.24, radius:260, element:"heal", desc:"Cura a los aliados cercanos"},
      {name:"Bendición de Guerra", ico:"⚔", cost:36, cd:8200, kind:"team_atk_buff", dmgBonus:0.22, duration:5500, radius:260, element:"atk", desc:"Aumenta el daño de los aliados cercanos"},
      {name:"Escudo Sagrado", ico:"🛡", cost:38, cd:8600, kind:"team_shield_buff", defBonus:0.26, shieldPct:0.18, duration:5500, radius:260, element:"shield", desc:"Aumenta la defensa de los aliados cercanos"}
    ],
    ultimate:{name:"Bendición Suprema", ico:"★", cd:32000, kind:"team_grand_buff", healPct:0.3, dmgBonus:0.28, defBonus:0.3, duration:6500, radius:280, desc:"Cura y bendice a todo el equipo con ataque y defensa"}
  },
  segador:{
    name:"Segador Olvidado", icon:"🗡", color:"#c62828", glow:"#ff8a7a",
    role:"Berserker / tanque ofensivo. Cuanto más daño recibe, más peligroso se vuelve.", roleCategory:"tanque",
    // Vida muy alta, defensa alta, daño alto, velocidad media-baja: tanque ofensivo cuerpo
    // a cuerpo, no un tanque pasivo. energyRegen casi nulo a propósito: su recurso (Furia)
    // no se regenera solo, se GANA peleando (ver ganancia de Furia en damageEnemy/damageHero).
    baseHP:192, baseDmg:12, baseDef:0.22, baseSpeed:138, energyMax:100, energyRegen:1, hpGrowthMult:1.35, dmgGrowthMult:0.85,
    basicRange:88, basicCd:640, basicArc:true,
    isFuryClass:true, // resource:"Furia" en vez de energía pasiva — mismo campo `energy`, otra fuente
    skills:[
      {name:"Tajo del Segador", ico:"🗡", cost:34, cd:6200, kind:"cone_slash", range:130, arc:1.35, dmgMult:1.7, knockback:60, desc:"Corte horizontal amplio; golpea a varios enemigos frente a él"},
      {name:"Armadura de la Furia", ico:"🩸", cost:30, cd:11000, kind:"fury_armor", defBonus:0.30, lifestealBonus:0.14, duration:5000, desc:"Recibe menos daño; cada golpe recibido genera más Furia"},
      {name:"Último Aliento", ico:"💀", cost:26, cd:9000, kind:"last_stand_burst", dmgBonus:0.35, healOnCastPct:0.08, duration:3500, desc:"Intensifica su furor: más daño mientras dura, cura una porción al lanzarlo"}
    ],
    ultimate:{name:"Segador de Almas", ico:"★", cd:34000, kind:"berserker_ult", dmgBonus:0.65, defBonus:0.35, lifesteal:0.30, duration:6000, killExtendMs:450, desc:"Furia máxima: daño e impacto enormes, resiste el control y roba vida. Cada baja alarga la duración"}
  },
  axiom:{
    name:"Axiom", icon:"❖", color:"#3ad6c4", glow:"#9df5ea",
    role:"Manipula directamente las reglas de la realidad. Daño de área y control.", roleCategory:"mago",
    // Balance: mismo criterio que ya usa el resto del roster (comparar contra mago, que es el
    // rol más cercano) — un poco más de daño/escalado de daño, un poco menos de vida/defensa
    // que el mago. No es un sistema de balance nuevo, son los mismos cuatro números de siempre.
    //   mago:  HP 95  Dmg 11 Def 0.06 hpGrowth 0.70 dmgGrowth 1.45
    //   axiom: HP 84  Dmg 13 Def 0.05 hpGrowth 0.62 dmgGrowth 1.52   (más frágil, más daño)
    baseHP:84, baseDmg:13, baseDef:0.05, baseSpeed:158, energyMax:105, energyRegen:8.5, hpGrowthMult:0.62, dmgGrowthMult:1.52,
    basicRange:340, basicCd:540, basicArc:false, ranged:true,
    // Las 4 habilidades reales de Axiom (diseño: Error 404 / Sobrescribir / Bug de Colisión /
    // Force Quit). Progresión por el sistema general de siempre (allocLevel/mastería), sin
    // tiers propios bespoke -mismo criterio que usan mago/guerrero/tanque/soporte.
    skills:[
      {name:"Error 404", ico:"⚠", cost:38, cd:8500, kind:"glitch_delay_nova", range:200, radius:130, delay:900, dmgMult:1.5, slow:0.35, slowDur:1800, desc:"Marca una zona; tras una breve demora, colapsa y daña/ralentiza en un área"},
      {name:"Sobrescribir", ico:"▣", cost:40, cd:9200, kind:"overwrite_nova", range:300, dmgMult:0.95, jumps:2, jumpRange:220, falloff:0.88, bleedDur:2600, bleedDmgMult:0.32, executePct:0.18, executeMult:2.2, desc:"Infecta al enemigo más cercano con código corrupto: se contagia de enemigo en enemigo y sigue dañando con el tiempo (más saltos y más daño al mejorarla)"},
      {name:"Teletransporte", ico:"↯", cost:24, cd:2500, kind:"teleport_blink", range:280, invulnDur:250, desc:"Axiom se desplaza al instante en la dirección en la que mira; casi sin enfriamiento al llevarla al máximo"}
    ],
    ultimate:{name:"Force Quit", ico:"★", cd:33000, kind:"force_quit_ult", radius:230, dmgMult:1.6, eliteMult:0.55, freezeDuration:4000, desc:"Fuerza el cierre de la realidad: 4 segundos de colores invertidos donde nadie más se mueve — al terminar, todo el daño cae de golpe sobre los enemigos cercanos"}
  },
  profeta:{
    name:"La Profeta", icon:"✧", color:"#4fd8c4", glow:"#bffff0",
    role:"Sanadora de apoyo cuerpo a cuerpo. Cura, protege y potencia a un aliado elegido.", roleCategory:"soporte",
    // Balance: sanadora pero CUERPO A CUERPO (a diferencia de soporte, que es a distancia) ->
    // algo más de vida y defensa que soporte para compensar tener que pelear de cerca, pero
    // menos daño base (su daño real no es la prioridad; ver Danza del Presagio más abajo).
    //   soporte: HP 105 Dmg 7 Def 0.12 hpGrowth 1.20 dmgGrowth 0.70 (a distancia)
    //   profeta: HP 114 Dmg 8 Def 0.14 hpGrowth 1.15 dmgGrowth 0.75 (cuerpo a cuerpo)
    baseHP:114, baseDmg:8, baseDef:0.14, baseSpeed:168, energyMax:105, energyRegen:9, hpGrowthMult:1.15, dmgGrowthMult:0.75,
    basicRange:82, basicCd:520, basicArc:false,
    // Danza del Presagio: cada golpe básico acumula una carga de "Presagio" (ver
    // triggerBasic/PROFETA_PRESAGIO_MAX); al llegar al máximo se dispara sola un giro extra
    // ("Giro del Presagio", triggerPresagioSpin) que golpea en área y reinicia el contador.
    skills:[
      {name:"Destino Restaurado", ico:"✚", cost:38, cd:8000, kind:"retro_heal", healPct:0.22, retroPct:0.34, retroWindowMs:4500, gravePct:0.4, element:"heal", desc:"Cura al instante al aliado más herido. Si está gravemente herido, además revierte parte del daño reciente que recibió"},
      {name:"Visión del Inmortal", ico:"◈", cost:34, cd:11000, kind:"brief_immunity", range:260, duration:2400, regenPct:0.06, desc:"Un aliado cercano se vuelve inmune a todo daño y a efectos negativos por unos segundos; al terminar, recibe una pequeña regeneración"},
      {name:"Danza del Augurio", ico:"☾", cost:36, cd:9000, kind:"self_spin_stun", radius:112, innerR:56, dmgMult:1.1, stun:500, desc:"Gira con su hoja y genera daño de área a su alrededor; si un enemigo está muy cerca, lo aturde brevemente"}
    ],
    ultimate:{name:"Ascensión del Elegido", ico:"★", cd:34000, kind:"ascension_fusion", duration:7000, healPct:0.85, dmgMult:2.0, atkSpeedMult:1.6, defBonus:0.45, lifesteal:0.25, cdClamp:60, desc:"Se acerca a un aliado y se fusiona con él, volviéndose casi invisible e invulnerable: aparece un recipiente espiritual que el aliado absorbe, recibiendo una curación enorme, mucho más daño, velocidad de ataque y resistencia, además de poder lanzar sus habilidades casi al instante mientras dura"}
  },
  musashi:{
    name:"Musashi", icon:"⚔", color:"#5aa8d8", glow:"#bfe4ff",
    role:"Duelista. Daño físico single-target y ejecución: elige un rival y se vuelve cada vez más peligroso contra él.", roleCategory:"asesino",
    // Asesino de velocidad: poca vida y poca defensa, pero muchísimos golpes (básico cada 260ms,
    // menos daño por golpe) y habilidades de enfriamiento bajo. Sobrevive matando rápido y con
    // Paso Fantasma, no aguantando.
    baseHP:100, baseDmg:11, baseDef:0.06, baseSpeed:176, energyMax:100, energyRegen:12.5, hpGrowthMult:0.8, dmgGrowthMult:1.35,
    basicRange:60, basicCd:260, basicArc:false,
    isDuelist:true, // Musashi tiene su propio bloque de básico/pasivas en triggerBasic/castAbility
    skills:[
      {name:"Corte del Rōnin", ico:"⚔", cost:22, cd:3800, kind:"ronin_slash", range:120, dmgMult:1.9, desc:"Avanza y ejecuta un corte horizontal único y extremadamente rápido"},
      {name:"Paso Fantasma", ico:"👻", cost:20, cd:5500, kind:"ghost_step", range:190, critBonus:0.35, desc:"Atraviesa a un enemigo y aparece detrás suyo; el siguiente básico gana probabilidad de crítico. Si se activa justo antes de recibir un golpe, es un Paso Perfecto: lo evita por completo"},
      {name:"Mil Cortes", ico:"🌀", cost:34, cd:8000, kind:"thousand_cuts", radius:150, totalHits:14, dmgMult:0.24, desc:"Ráfaga de cortes alrededor suyo que prioriza a su objetivo de duelo; cuantos menos enemigos haya, más cortes recibe cada uno"}
    ],
    ultimate:{name:"Último Duelo", ico:"★", cd:28000, kind:"last_duel_ult", duration:13000, speedMult:1.25, atkSpeedMult:1.35, dmgMult:1.25, critChanceBonus:0.15, critMultBonus:0.4, ghostStepCdMult:0.4, desc:"Se transporta con su objetivo de duelo a una arena privada: 1 contra 1 hasta que uno de los dos caiga o se acabe el tiempo"}
  },
  cazadora:{
    name:"La Cazadora", icon:"🏹", color:"#5c9a4a", glow:"#c8f0a8",
    role:"Tiradora extremadamente móvil que gana velocidad mientras persigue a su presa.", roleCategory:"asesino",
    // Vida y defensa las más bajas del roster (mago:95/0.06 es la referencia más frágil que
    // había; Sylva queda un poco por debajo todavía), a cambio de la velocidad de movimiento
    // más alta del juego (185, por encima de guerrero:175) y velocidad de ataque alta
    // (basicCd corto). Su daño por flecha es medio -no es una nuker como el mago, su DPS sale
    // de la CANTIDAD de disparos (Impulso/Rastreo), no de golpes grandes-.
    baseHP:86, baseDmg:9, baseDef:0.05, baseSpeed:185, energyMax:100, energyRegen:11, hpGrowthMult:0.65, dmgGrowthMult:1.05,
    basicRange:300, basicCd:420, basicArc:false, ranged:true,
    isHuntress:true, // Sylva tiene su propio bloque de básico/pasivas en triggerBasic/castAbility
    skills:[
      {name:"Flecha Perforante", ico:"🎯", cost:30, cd:6500, kind:"piercing_shot", range:420, dmgMult:1.3, desc:"Mantené pulsado para cargar: más carga = más daño, velocidad, alcance y penetración. A carga máxima atraviesa varios enemigos"},
      {name:"Trampa del Bosque", ico:"🕸", cost:26, cd:9500, kind:"forest_trap", range:220, radius:70, rootDur:2200, desc:"Coloca una trampa de raíces; inmoviliza (o ralentiza mucho a bosses) al primer enemigo que la pise"},
      {name:"Lluvia de la Cazadora", ico:"🌧", cost:42, cd:12000, radius:180, kind:"hunter_rain", totalHits:12, dmgMult:0.28, desc:"Tras un breve retraso, una lluvia de flechas cae sobre la zona; prioriza a su Presa si está cerca"}
    ],
    ultimate:{name:"Cacería Salvaje", ico:"★", cd:32000, kind:"wild_hunt_ult", duration:8000, speedMult:1.3, atkSpeedMult:1.35, critChanceBonus:0.2, rangeMult:1.15, cdrOnHit:250, desc:"Impulso al máximo fijo, puede correr y disparar a la vez, invoca a un Lobo Espectral que persigue a su Presa"}
  },
  nigromante:{
    name:"Nigromante", icon:"💀", color:"#4ab88a", glow:"#8ef0c8",
    role:"Señor de un ejército y cosechador de almas: los caídos se levantan a su lado, las almas alimentan su poder y maldice a la horda.", roleCategory:"mago",
    // Vida/defensa de mago (frágil, se apoya en sus invocaciones como línea de frente), daño
    // base bajo -su DPS real sale de la Plaga y del ejército, no del Proyectil de Hueso solo-.
    baseHP:98, baseDmg:9, baseDef:0.07, baseSpeed:150, energyMax:120, energyRegen:9.2, hpGrowthMult:0.75, dmgGrowthMult:1.0,
    basicRange:320, basicCd:480, basicArc:false, ranged:true,
    isNecromancer:true, // bloque propio de básico/pasivas/ulti en triggerBasic/castAbility, igual que Musashi/Sylva
    skills:[
      {name:"Cosecha de Almas", ico:"☠", cost:28, cd:6500, kind:"soul_harvest", range:210, arc:1.05, dmgMult:1.15, slow:0.3, desc:"Arranca almas en un cono: daña, ralentiza y suelta almas. PASIVA: tus esqueletos se levantan solos de los cadáveres cercanos (hasta 6 al mejorarla)"},
      {name:"Gólem de Carne", ico:"🗿", cost:36, cd:12000, kind:"summon_golem", range:240, dmgMult:0.9, desc:"Arma un gólem con los cadáveres cercanos (más cuerpos, más vida). Si ya tenés uno: salta al punto apuntado y APLASTA (daño y aturdimiento)"},
      {name:"Plaga de los Condenados", ico:"☠", cost:44, cd:13000, kind:"condemned_plague", range:300, radius:150, dmgMult:0.22, defTakenPct:0.3, duration:6000, desc:"Maldice un área: daño continuo y más daño recibido; si un maldito muere, contagia a los cercanos"}
    ],
    ultimate:{name:"Encarnación del Abismo", ico:"★", cd:38000, kind:"abyss_incarnation_ult", duration:11000, hpMult:1.9, dmgMult:1.8, desc:"Absorbe temporalmente a todo tu ejército y te transforma en un Demonio Nigromántico; tu poder escala con cuántos absorbiste"}
  },
  libertador:{
    name:"El Libertador", icon:"🎖", color:"#2f4f9a", glow:"#9fc4ff",
    role:"Tirador / Guerrero / Soporte ofensivo: disparos lentos y devastadores, bayoneta, mando y caballería.", roleCategory:"asesino",
    // José de San Martín. Tirador pesado: MUY pocos disparos (recarga larga, SM_CFG.musket) con
    // mucho daño cada uno; vida y defensa de guerrero liviano porque también entra cuerpo a cuerpo.
    baseHP:120, baseDmg:24, baseDef:0.10, baseSpeed:160, energyMax:100, energyRegen:10, hpGrowthMult:1.0, dmgGrowthMult:1.05,
    basicRange:380, basicCd:1450, basicArc:false, ranged:true,
    isLibertador:true, noDivinaFoe:true, // su kit (montura/definitiva) no está pensado como rival divino
    skills:[
      {name:"Bayoneta", ico:"🗡", cost:24, cd:5500, kind:"sm_bayonet", range:190, dmgMult:2.5, desc:"Mantené para apuntar y soltá: embestida corta con la bayoneta. Mucho daño, sangrado y un pequeño tambaleo; se detiene al conectar"},
      {name:"¡Granaderos, a la carga!", ico:"📯", cost:36, cd:16000, kind:"sm_granaderos", radius:430, duration:8000, desc:"Levanta el sable, suena el clarín y aparecen Granaderos espectrales: +velocidad, +velocidad de ataque, +daño y resistencia al control para vos y tus aliados cercanos"},
      {name:"Carga de San Lorenzo", ico:"🐎", cost:40, cd:12000, kind:"sm_san_lorenzo", range:430, dmgMult:1.9, desc:"Monta su caballo blanco y carga en línea: atraviesa y empuja a los comunes, aturde a los élite y baja la defensa de los jefes"}
    ],
    ultimate:{name:"Cruce de los Andes", ico:"★", cd:45000, kind:"sm_andes_ult", dmgMult:4.2, duration:10000, desc:"La Cordillera se alza alrededor de la arena: nieve, viento y escarcha. Carga con una formación de Granaderos espectrales montados y queda 10 s a caballo (sable corvo, +velocidad, +daño, -daño recibido)"}
  },
  eren:{
    name:"Eren", icon:"⚔", color:"#7a3b2e", glow:"#ff7a55",
    role:"Guerrero / Berserker: movilidad extrema con ganchos, gana Furia con el riesgo y se transforma en El Portador.", roleCategory:"asesino",
    // Recurso FURIA = barra de la definitiva (sube pegando, recibiendo daño y con poca vida,
    // EREN_CFG.fury). Guerrero ágil y frágil en forma humana; la forma monstruosa es su pico.
    baseHP:128, baseDmg:11, baseDef:0.08, baseSpeed:178, energyMax:100, energyRegen:11, hpGrowthMult:1.05, dmgGrowthMult:1.0,
    basicRange:84, basicCd:380, basicArc:true,
    isEren:true, isFuryClass:false, noDivinaFoe:true,
    skills:[
      {name:"Equipo de Maniobras", ico:"🪝", cost:22, cd:7000, kind:"eren_hook", range:360, dmgMult:1.4, desc:"Mantené para apuntar y soltá: dispara los ganchos y sale volando. Durante el vuelo, volvé a usarla para un SEGUNDO gancho con cambio de dirección. Corta a los que pasan cerca"},
      {name:"Instinto de Supervivencia", ico:"⚡", cost:25, cd:14000, kind:"eren_instinct", duration:3500, desc:"Por un momento recibís menos daño y cada golpe que te dan carga MUCHA más Furia. No es invulnerabilidad: es exponerse para transformarse antes"},
      {name:"¡Avancen!", ico:"📢", cost:30, cd:15000, kind:"eren_advance", duration:7000, desc:"Grito de guerra: más velocidad, daño y Furia (más fuerte con poca vida). Los aliados cercanos reciben una parte"}
    ],
    ultimate:{name:"El Portador", ico:"★", cd:40000, kind:"eren_titan_ult", duration:22000, desc:"Con la Furia llena: se muerde la mano, cae un rayo y surge la forma monstruosa (golpes en área, Sismo, Terremoto, Retumbar, regeneración con vapor). Si llenás la Furia otra vez transformado, se desbloquea algo más"}
  }
};
// Eren transformado usa esta "clase" mientras dura El Portador (h.cls apunta acá): así todo lo que
// ya lee h.cls (botones, IA, apuntado, HUD, cooldowns) muestra y usa el kit del titán sin tocar nada
// más. Las habilidades comparten el índice (y la maestría/talentos) de la habilidad humana 0/1/2.
const EREN_TITAN_CLS = Object.assign({}, CLASSES.eren, {
  name:"El Portador", icon:"👹", basicRange:112, basicCd:950, basicArc:true, ranged:false, isTitanForm:true,
  skills:[
    {name:"Sismo", ico:"💥", cost:0, cd:6500, kind:"titan_sismo", radius:230, dmgMult:3.2, desc:"Golpe violento al suelo: onda expansiva circular, muchísimo daño en el centro"},
    {name:"Terremoto", ico:"🌋", cost:0, cd:13000, kind:"titan_terremoto", radius:250, dmgMult:1.25, desc:"Canalizada: planta los pies y revienta el suelo en 4 pulsos. Mientras dura recibís más daño"},
    {name:"Retumbar", ico:"🦶", cost:0, cd:14000, kind:"titan_retumbar", radius:160, dmgMult:1.35, desc:"Avanza pisando: cada paso es una onda de destrucción. Control de dirección limitado"}
  ],
  ultimate:{name:"El Retumbar", ico:"☠", cd:0, kind:"eren_rumbling_ult", desc:"Tres pisadas colosales sobre la arena, con aviso. Después, Eren vuelve agotado"}
});
