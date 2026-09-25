"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-data.js
   ARENA III — LA FORTALEZA SIN FIN: datos (mapa por sectores, mecanismos, trampas, enemigos,
   balance). La lógica está en fort-map.js / fort-traps.js / fort-enemies.js / fort-bosses.js y
   el dibujo en fort-render.js / fort-art.js. Todo número de balance vive en FORT_CFG.

   Un solo mapa continuo, de SUR (entrada) a NORTE (cámara final): el equipo avanza físicamente.
     ENTRADA/PATIO (niv. 1-2) -> PRISIÓN (3-4) -> PUENTES MECÁNICOS (5) -> FORJA (6, subjefe)
     -> INTERIOR INDUSTRIAL (7-8) -> NÚCLEO (9) -> CÁMARA DEL CABALLERO (10, jefe)
   Coordenadas de mundo (y crece hacia abajo en pantalla: el norte es y negativo).
   ============================================================ */
const _FR = (x0, x1, y0, y1)=>({cx:(x0+x1)/2, cy:(y0+y1)/2, hw:(x1-x0)/2, hh:(y1-y0)/2, rot:0});

const FORT_SECTORS = [
  {id:0, key:"patio",   name:"Patio de Armas",       levels:[1,2]},
  {id:1, key:"prision", name:"La Prisión",           levels:[3,4]},
  {id:2, key:"puentes", name:"Puentes Mecánicos",    levels:[5]},
  {id:3, key:"forja",   name:"La Forja",             levels:[6]},
  {id:4, key:"interior",name:"Interior Industrial",  levels:[7,8]},
  {id:5, key:"nucleo",  name:"El Núcleo",            levels:[9]},
  {id:6, key:"camara",  name:"Cámara del Caballero", levels:[10]}
];
function fortSectorForLevel(lv){ for(const s of FORT_SECTORS) if(s.levels.includes(lv)) return s.id; return 0; }

const FORT_MAP = {
  bounds:{x0:-1340, y0:-4320, x1:1340, y1:2480},
  start:{x:0, y:2150},
  // plataformas fijas (piso de piedra). `theme` elige el piso/borde que se dibuja.
  plats:[
    Object.assign(_FR(-760, 760, 1560, 2400), {id:"patio",  sector:0, theme:"patio"}),
    Object.assign(_FR(-820, 820,  720, 1465), {id:"prison", sector:1, theme:"prison"}),
    Object.assign(_FR(-230, 230,  130,  625), {id:"hub",    sector:2, theme:"hub"}),
    Object.assign(_FR(-1060,-560, 160,  600), {id:"west",   sector:2, theme:"bridge"}),
    Object.assign(_FR( 560, 1060, 160,  600), {id:"east",   sector:2, theme:"bridge"}),
    Object.assign(_FR(-250, 250, -520, -150), {id:"north",  sector:2, theme:"bridge"}),
    Object.assign(_FR(-900, 900,-1450, -690), {id:"forge",  sector:3, theme:"forge"}),
    Object.assign(_FR(-850, 850,-1880,-1555), {id:"int_s",  sector:4, theme:"interior"}),
    Object.assign(_FR(-850, 850,-2350,-2010), {id:"int_n",  sector:4, theme:"interior"}),
    Object.assign(_FR(-850,-730,-2060,-1830), {id:"int_wl", sector:4, theme:"interior"}),
    Object.assign(_FR( 730, 850,-2060,-1830), {id:"int_el", sector:4, theme:"interior"}),
    Object.assign(_FR(-320, 320,-2600,-2455), {id:"core_s", sector:5, theme:"core"}),
    Object.assign(_FR(-220, 220,-3120,-2680), {id:"core",   sector:5, theme:"coreDisc"}),
    Object.assign(_FR(-800,-480,-3060,-2740), {id:"core_w", sector:5, theme:"core"}),
    Object.assign(_FR( 480, 800,-3060,-2740), {id:"core_e", sector:5, theme:"core"}),
    Object.assign(_FR(-320, 320,-3400,-3240), {id:"core_n", sector:5, theme:"core"}),
    Object.assign(_FR(-720, 720,-4250,-3530), {id:"knight", sector:6, theme:"chamber"})
  ],
  // puertas: cerradas NO se caminan (se dibuja el rastrillo). openAt = nivel en que se abren.
  gates:[
    Object.assign(_FR(-110, 110, 1410, 1610), {id:"g_prison",  sector:1, openAt:3, kind:"portcullis"}),
    Object.assign(_FR(-110, 110,  575,  770), {id:"g_bridges", sector:2, openAt:5, kind:"portcullis"}),
    Object.assign(_FR(-130, 130,-1605,-1400), {id:"g_blast",   sector:4, openAt:8, kind:"blast"}),     // la abre la muerte del Dragón (o el nivel 8)
    Object.assign(_FR(-110, 110,-2510,-2300), {id:"g_core",    sector:5, openAt:9, kind:"portcullis"}),
    Object.assign(_FR(-110, 110,-3580,-3350), {id:"g_knight",  sector:6, openAt:10, kind:"great"})     // se cierra detrás del equipo
  ],
  // mecanismos móviles. Todos se caminan en su posición actual (también mientras se mueven: llevan
  // encima a quien esté parado sobre ellos). Nunca desaparecen con alguien arriba.
  bridges:[
    // Gran puente giratorio del Núcleo de Engranajes (2 brazos opuestos que giran 90°):
    // horizontal = une Oeste-Este; vertical = une Sur-Norte (camino hacia la Forja).
    {id:"beam_a", kind:"arm", rotor:"hub",  r0:150, r1:612, hw:52, sector:2, off:0},
    {id:"beam_b", kind:"arm", rotor:"hub",  r0:150, r1:612, hw:52, sector:2, off:Math.PI},
    // Puente levadizo hacia la Forja: baja al empezar el nivel 6 (y ya no sube).
    Object.assign(_FR(-100, 100, -740, -470), {id:"db_forge", kind:"lift", sector:3, lowerAt:6}),
    // Plataforma que se DESLIZA sobre el canal de lava del Interior (atajo; los pasillos de los
    // extremos siempre quedan: nunca aísla a nadie).
    {id:"sl_int", kind:"slide", cx:-470, cy:-1945, hw:115, hh:120, rot:0, ax:-470, bx:470, sector:4},
    // Brazos retráctiles del Núcleo (salen del disco central hacia las 4 plataformas).
    {id:"arm_s", kind:"arm", rotor:"core_s", r0:150, r1:338, hw:58, sector:5, off:Math.PI/2},
    {id:"arm_n", kind:"arm", rotor:"core_n", r0:150, r1:392, hw:58, sector:5, off:-Math.PI/2},
    {id:"arm_w", kind:"arm", rotor:"core_w", r0:150, r1:548, hw:52, sector:5, off:Math.PI},
    {id:"arm_e", kind:"arm", rotor:"core_e", r0:150, r1:548, hw:52, sector:5, off:0}
  ],
  rotors:{
    // el centro del giro/retracción de cada grupo de brazos
    hub:   {x:0, y:377, kind:"rotate", states:[Math.PI/2, 0]},     // 0: N-S (camino), 1: O-E
    core_s:{x:0, y:-2900, kind:"retract"}, core_n:{x:0, y:-2900, kind:"retract"},
    core_w:{x:0, y:-2900, kind:"retract"}, core_e:{x:0, y:-2900, kind:"retract"}
  },
  // Puntos de aparición por sector (puertas de celdas, compuertas laterales, túneles).
  spawns:{
    0:[[-700,1800],[700,1800],[-700,2250],[700,2250],[-420,2370],[420,2370],[-720,1620],[720,1620]],
    1:[[-780,850],[-780,1150],[-780,1400],[780,850],[780,1150],[780,1400],[-420,760],[420,760]],
    2:[[-1010,240],[-1010,520],[1010,240],[1010,520],[-200,-470],[200,-470]],
    3:[[-850,-780],[-850,-1360],[850,-780],[850,-1360],[-500,-1410],[500,-1410]],
    4:[[-800,-1600],[800,-1600],[-800,-2300],[800,-2300],[0,-2310],[-420,-2310],[420,-2310]],
    5:[[-760,-2900],[760,-2900],[-260,-3370],[260,-3370],[-280,-2575],[280,-2575]],
    6:[[-640,-3620],[640,-3620],[-640,-4150],[640,-4150]]
  },
  // Trampas del Ciclo Mecánico (todas con aviso visual y sonoro antes de hacer nada).
  //   steam: rejilla de vapor (círculo)      gear: engranaje que rueda por un riel (línea)
  //   chain: cadena que barre desde un anclaje  forge: rejilla de forja que se pone al rojo (rect)
  //   press: prensa industrial (rect)
  traps:[
    {id:"t_pa1", type:"steam", sector:0, x:-420, y:1900}, {id:"t_pa2", type:"steam", sector:0, x:420, y:1900},
    {id:"t_pr1", type:"steam", sector:1, x:-500, y:1000}, {id:"t_pr2", type:"steam", sector:1, x:500, y:1000},
    {id:"t_pr3", type:"steam", sector:1, x:0, y:1260},
    {id:"t_pr4", type:"chain", sector:1, x:-820, y:960, len:520, a0:-0.35, a1:0.45},
    {id:"t_pr5", type:"press", sector:1, x:460, y:1320, hw:90, hh:70},
    {id:"t_br1", type:"gear",  sector:2, x0:-200, y0:540, x1:200, y1:540},
    {id:"t_br2", type:"steam", sector:2, x:-810, y:380}, {id:"t_br3", type:"steam", sector:2, x:810, y:380},
    {id:"t_br4", type:"steam", sector:2, x:0, y:-335},
    {id:"t_fo1", type:"forge", sector:3, x:-500, y:-1050, hw:150, hh:90}, {id:"t_fo2", type:"forge", sector:3, x:500, y:-1050, hw:150, hh:90},
    {id:"t_fo3", type:"forge", sector:3, x:0, y:-850, hw:170, hh:70},
    {id:"t_fo4", type:"press", sector:3, x:-620, y:-1300, hw:90, hh:70}, {id:"t_fo5", type:"press", sector:3, x:620, y:-1300, hw:90, hh:70},
    {id:"t_fo6", type:"steam", sector:3, x:0, y:-1300},
    {id:"t_in1", type:"gear",  sector:4, x0:-700, y0:-1690, x1:700, y1:-1690},
    {id:"t_in2", type:"gear",  sector:4, x0:700, y0:-2200, x1:-700, y1:-2200},
    {id:"t_in3", type:"chain", sector:4, x:850, y:-2150, len:560, a0:Math.PI-0.25, a1:Math.PI+0.25},
    {id:"t_in4", type:"press", sector:4, x:-320, y:-2260, hw:90, hh:70}, {id:"t_in5", type:"press", sector:4, x:320, y:-1640, hw:90, hh:70},
    {id:"t_in6", type:"steam", sector:4, x:-600, y:-2250}, {id:"t_in7", type:"steam", sector:4, x:600, y:-1650},
    {id:"t_in8", type:"forge", sector:4, x:0, y:-2250, hw:180, hh:70},
    {id:"t_co1", type:"steam", sector:5, x:-640, y:-2900}, {id:"t_co2", type:"steam", sector:5, x:640, y:-2900},
    {id:"t_co3", type:"steam", sector:5, x:0, y:-3320},
    {id:"t_co4", type:"gear",  sector:5, x0:-180, y0:-2800, x1:180, y1:-2800},
    {id:"t_co5", type:"chain", sector:5, x:0, y:-3120, len:360, a0:1.0, a1:Math.PI-1.0},
    {id:"t_kn1", type:"steam", sector:6, x:-480, y:-3720}, {id:"t_kn2", type:"steam", sector:6, x:480, y:-3720},
    {id:"t_kn3", type:"steam", sector:6, x:-480, y:-4060}, {id:"t_kn4", type:"steam", sector:6, x:480, y:-4060},
    {id:"t_kn5", type:"gear",  sector:6, x0:-640, y0:-3870, x1:640, y1:-3870},
    {id:"t_kn6", type:"chain", sector:6, x:-720, y:-3960, len:600, a0:-0.45, a1:0.45},
    {id:"t_kn7", type:"chain", sector:6, x:720, y:-3960, len:600, a0:Math.PI-0.45, a1:Math.PI+0.45},
    {id:"t_kn8", type:"forge", sector:6, x:-300, y:-3660, hw:140, hh:60}, {id:"t_kn9", type:"forge", sector:6, x:300, y:-3660, hw:140, hh:60},
    {id:"t_kn10",type:"press", sector:6, x:0, y:-3700, hw:100, hh:75}
  ],
  throne:{x:0, y:-4185}, knightSeat:{x:0, y:-4105},
  // compuerta del horno por donde irrumpe el Dragón de la Forja (muro este de la Forja)
  furnaceGate:{x:900, y:-1070}
};

// ---------------- balance centralizado ----------------
const FORT_CFG = {
  // Reconfiguración (puentes): aviso -> espera -> movimiento. Nunca instantáneo.
  bridge:{ warnMs:2600, rotateMs:2600, holdMs:[13000, 17000], retractMs:2000, slideMs:3200, slideHoldMs:[9000, 12000],
           coreHoldMs:[10000, 13000], lowerMs:2200, rescueMs:30000 },
  // Ciclo Mecánico: UNA trampa a la vez (dos en el Núcleo y en la fase 2 del Caballero).
  cycle:{ firstAtLevel:3, intervalMs:[11500, 6500], cdMs:12000, nearHero:560,
          steam:{r:74, warnMs:2000, dmgPct:0.07, knock:55, burstMs:900},
          gear:{r:50, warnMs:1800, speed:520, dmgPct:0.08, knock:70},
          chain:{warnMs:1700, sweepMs:720, width:36, dmgPct:0.08, knock:60},
          forge:{warnMs:2300, hotMs:3600, dpsPct:0.05},
          press:{warnMs:1700, dmgPct:0.13, stunMs:600, liftMs:900},
          enemyDmgMult:0.5 },   // las trampas también lastiman a los enemigos comunes (no a jefes)
  // Enemigos
  carcelero:{ chainCdMs:[9000, 13000], chainRange:[140, 400], windMs:750, chainSpeed:900, pullMs:360, pullMax:200, immuneMs:4500, dmgMult:0.4 },
  bronce:{ keepMin:70, keepMax:160, breathCdMs:5600, breathR:190, breathArc:0.5, windMs:620, slow:0.4, slowMs:1800, dmgMult:1.0,
           deathR:72, deathWarnMs:650, deathDmgPct:0.06 },
  automata:{ slamCdMs:2600, slamR:110, slamWind:520, chargeCdMs:[9000, 12000], chargeRange:[170, 540], chargeWind:1000,
             chargeSpeed:540, chargeLen:720, chargeMult:1.4, stunMs:2500, armor:0.78 },
  prisionero:{ jitter:0.55, splitN:2, maxEnemies:60 },
  verdugo:{ axeWind:460, axeR:118, axeMult:1.3, overCdMs:[12000, 15000], overWind:800, overMs:5200, overSpeed:1.6, overDmg:1.4, overTaken:1.35 },
  arana:{ keepMin:200, keepMax:300, boltSpeed:300, netCdMs:[8000, 10500], netR:92, netWarnMs:900, netMs:4200, netSlow:0.45,
          repairCdMs:[5500, 7000], repairR:260, repairMs:2600, repairPct:0.035, repairTickMs:500 },
  // Subjefe y jefe
  dragon:{ entranceMs:2600, overchargeAt:0.30, overSpeed:1.28, bombN:6, bombR:76, bombDelay:1250, flyMs:2600 },
  caballero:{ counterMs:1500, counterMult:1.7, orderCdMs:15000, orderMaxAdds:4, p3Speed:1.35, execWind:1500, execMult:2.2,
              doorGraceMs:45000, riseMs:3200, transMs:1700 }
};

// ---------------- fichas de enemigo (se suman a ENEMY_BASE) ----------------
// Escala relativa pedida: campeón 1.0 (radio ~23). hMul = alto dibujado / radio.
Object.assign(ENEMY_BASE, {
  carcelero:      {name:"Carcelero Deforme",    rank:"normal",   hp:40,  dmg:8,  speed:74,  radius:26, xp:10, gold:4, scale:3.6, color:"#8a4a3a", ranged:false},
  dragon_bronce:  {name:"Dragón de Bronce",     rank:"normal",   hp:18,  dmg:5,  speed:112, radius:21, xp:6,  gold:2, scale:3.0, color:"#c07a3a", ranged:false, flying:true, mech:true},
  automata:       {name:"Autómata de Hierro",   rank:"elite",    hp:240, dmg:18, speed:36,  radius:31, xp:32, gold:13, scale:4.6, color:"#5a5a5a", ranged:false, dropsItem:true, mech:true},
  prisionero:     {name:"Prisionero Ensamblado",rank:"normal",   hp:28,  dmg:7,  speed:96,  radius:25, xp:6,  gold:2, scale:3.4, color:"#a07a6a", ranged:false},
  engendro:       {name:"Engendro Encadenado",  rank:"normal",   hp:9,   dmg:4,  speed:138, radius:15, xp:2,  gold:1, scale:2.4, color:"#b08a7a", ranged:false, noDivina:true},
  verdugo:        {name:"Verdugo de Vapor",     rank:"elite",    hp:200, dmg:19, speed:50,  radius:33, xp:30, gold:12, scale:4.8, color:"#6a3a2a", ranged:false, dropsItem:true, mech:true},
  arana:          {name:"Araña Mecánica",       rank:"subelite", hp:44,  dmg:8,  speed:84,  radius:19, xp:12, gold:4, scale:3.0, color:"#8a5a2a", ranged:true, range:300, projSpeed:300, mech:true},
  dragon_forja:   {name:"Dragón de la Forja",   rank:"subjefe",  hp:1300,dmg:22, speed:62,  radius:78, xp:90, gold:36, scale:9.0, color:"#c0401a", ranged:false, dropsItem:true, mech:true},
  caballero:      {name:"Caballero de la Armadura Oxidada", rank:"jefe", hp:4200, dmg:32, speed:60, radius:52, xp:380, gold:180, scale:8.0, color:"#7a3a2a", ranged:false, dropsItem:true}
});
