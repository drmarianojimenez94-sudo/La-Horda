"use strict";
/* ============================================================
   js/arenas/ciudad/cm-data.js
   CIUDAD MALDITA (Arena 01) — datos: mapa, edificios, estructuras, civiles, balance y fichas.
   Identidad: "NO PODÉS SALVARLOS A TODOS. PERO VAS A INTENTARLO."
   Una ciudad todavía viva: los CIVILES se esconden en casas y callejones; hay que encontrarlos,
   RESCATARLOS (acción contextual) y escoltarlos a un REFUGIO o a la PUERTA DE EVACUACIÓN mientras
   la Horda saquea, secuestra y derriba lo que queda en pie. Los civiles son inmunes a los ataques
   de los guardianes (no son enemigos: viven en el estado de la arena) y pueden morir de forma justa
   (ataques con aviso, secuestros que se pueden interrumpir).

   Lógica: cm-map.js (geometría, colisión, navegación, apariciones) · cm-civilians.js (civiles,
           estructuras, recompensas) · cm-enemies.js (nueve enemigos + oleadas) · cm-bosses.js
           (Maestro + Tramoyista, Dama del Telón, El Presentador) · cm-render.js (dibujo, HUD)
           cm-arena.js (registro en ARENA_DEFS, atlas, sonidos, bots, red)
   Coordenadas: la estatua de la plaza está en (0,0); norte = y negativa (la catedral y el
   escenario del Presentador), sur = entrada del arrabal y la Puerta de Evacuación.
   ============================================================ */
const CM_BOUNDS = {x0:-1500, y0:-1200, x1:1500, y1:1150};
const CM_WALL_T = 24;          // grosor de las paredes (colisión)
const CM_WALL_H = 86;          // alto visual de las paredes (vista oblicua: el techo sube esto)

/* ---------------- edificios ----------------
   rect (x0,y0,x1,y1) · door: lado (n/s/e/w) + posición a lo largo del lado · kind:
     casa (se entra: civiles escondidos) · refugio / capilla (ESTRUCTURA: zona segura en la puerta)
     torre (maciza, sin puerta) · campanario (macizo; campana afuera) · catedral (fondo del escenario)
   Las estructuras (struct) tienen vida y estados; ver CM_STRUCTS. */
const CM_BUILDINGS = [
  {id:"b1",  name:"Casa del Sastre",     kind:"casa",   x0:-1380, y0:-1060, x1:-980, y1:-760, door:{side:"s", at:-1180}},
  {id:"b2",  name:"Refugio del Norte",   kind:"refugio",x0:-860,  y0:-1080, x1:-420, y1:-720, door:{side:"s", at:-640}, struct:"refNorte"},
  {id:"b3",  name:"La Taberna",          kind:"casa",   x0:-1400, y0:-600,  x1:-940, y1:-260, door:{side:"e", at:-430}},
  {id:"b4",  name:"Casa del Tejedor",    kind:"casa",   x0:-800,  y0:-560,  x1:-480, y1:-280, door:{side:"s", at:-640}},
  {id:"b5",  name:"El Campanario",       kind:"campanario", x0:560, y0:-1080, x1:860, y1:-800},
  {id:"b6",  name:"Casa del Herrero",    kind:"casa",   x0:980,   y0:-1080, x1:1400, y1:-760, door:{side:"s", at:1190}},
  {id:"b7",  name:"Refugio del Este",    kind:"refugio",x0:900,   y0:-560,  x1:1400, y1:-240, door:{side:"w", at:-400}, struct:"refEste"},
  {id:"b8",  name:"Casa del Panadero",   kind:"casa",   x0:480,   y0:-600,  x1:780,  y1:-300, door:{side:"s", at:630}},
  {id:"b9",  name:"La Capilla",          kind:"capilla",x0:-1400, y0:260,   x1:-900, y1:640, door:{side:"e", at:450}, struct:"capilla"},
  {id:"b10", name:"Mercado Cubierto",    kind:"casa",   x0:-780,  y0:280,   x1:-440, y1:560, door:{side:"n", at:-610}},
  {id:"b11", name:"Casa del Curtidor",   kind:"casa",   x0:-1380, y0:780,   x1:-1000,y1:1060, door:{side:"n", at:-1190}},
  {id:"b12", name:"Casa de la Viuda",    kind:"casa",   x0:-820,  y0:720,   x1:-480, y1:1000, door:{side:"e", at:860}},
  {id:"b13", name:"Casa del Boticario",  kind:"casa",   x0:440,   y0:260,   x1:800,  y1:560, door:{side:"n", at:620}},
  {id:"b14", name:"Torre de Vigía",      kind:"torre",  x0:980,   y0:260,   x1:1240, y1:520, struct:"torre"},
  {id:"b15", name:"Casa del Escriba",    kind:"casa",   x0:480,   y0:720,   x1:820,  y1:1020, door:{side:"w", at:870}},
  {id:"b16", name:"Casa del Molinero",   kind:"casa",   x0:1000,  y0:700,   x1:1400, y1:1040, door:{side:"n", at:1200}},
  {id:"cat", name:"Catedral Maldita",    kind:"catedral", x0:-420, y0:-1200, x1:420, y1:-1090}
];
const CM_DOOR_W = 96;

/* ---------------- estructuras (vida y estados) ----------------
   INTACTA (>=66%) -> DAÑADA (>=33%) -> CRÍTICA (>0) -> DESTRUIDA. No se reparan.
   critical: si TODAS las críticas caen, DERROTA. safe: zona segura (civiles rescatados).
   Consecuencias al caer: refugio/capilla -> sus refugiados salen corriendo al refugio más cercano
   (hay que volver a protegerlos) y la puerta queda bloqueada · Puerta de Evacuación -> se cierra
   la salida y el bono de rescate baja · Torre de Vigía -> se pierden las pistas de civiles en el minimapa. */
const CM_STRUCTS = [
  {id:"refNorte", name:"Refugio del Norte",   hp:1300, critical:true,  safe:true, b:"b2"},
  {id:"refEste",  name:"Refugio del Este",    hp:1300, critical:true,  safe:true, b:"b7"},
  {id:"capilla",  name:"La Capilla",          hp:1400, critical:true,  safe:true, b:"b9"},
  {id:"puerta",   name:"Puerta de Evacuación",hp:1600, critical:true,  safe:true, gate:{x0:-170, y0:1096, x1:170, y1:1150}, sx:0, sy:960},
  {id:"torre",    name:"Torre de Vigía",      hp:900,  critical:false, safe:false, b:"b14"}
];
const CM_ST = {INTACT:0, DAMAGED:1, CRITICAL:2, DESTROYED:3};
const CM_ST_NAME = ["INTACTA", "DAÑADA", "CRÍTICA", "DESTRUIDA"];

/* ---------------- puntos del mapa ---------------- */
const CM_MAP = {
  start:{x:0, y:800},
  statue:{x:0, y:-10, r:74},
  stage:{x:0, y:-860},                                 // escenario del Presentador (plaza de la catedral)
  navBounds:{x0:-1500, y0:-1200, x1:1500, y1:1160},
  // salidas del borde: por acá entra la Horda y por acá escapa el Raptor con un civil
  exits:[{x:-1470, y:0}, {x:1470, y:10}, {x:-1470, y:-680}, {x:1470, y:-660}, {x:-1470, y:710}, {x:1470, y:610}],
  // rejillas de las cloacas (Perros del Albañal)
  sewers:[{x:-300, y:420}, {x:300, y:-420}, {x:-1000, y:-150}, {x:1000, y:150}, {x:250, y:820}, {x:-250, y:-640}],
  // campanas (Campanero): canalizar acá atrae refuerzos
  bells:[{x:710, y:-765, name:"el Campanario"}, {x:-860, y:450, name:"la Capilla"}, {x:0, y:-330, name:"la plaza"}],
  // escondites afuera (callejones y escombros); los de adentro salen del interior de cada casa
  hideOut:[{x:-1440, y:-700}, {x:1440, y:-640}, {x:-900, y:120}, {x:900, y:-140}, {x:-300, y:1080}, {x:320, y:640}, {x:-1180, y:180}, {x:1260, y:620}],
  // props sólidos (círculos) y decorativos
  solids:[{x:-560, y:180, r:26}, {x:560, y:-180, r:26}, {x:-240, y:640, r:22}, {x:260, y:-900, r:24}, {x:-260, y:-900, r:24}]
};

/* ---------------- balance centralizado ---------------- */
const CM_CFG = {
  civ:{ hp:90, speed:150, runSpeed:190, followGap:46, discoverR:190, cueR:430, rescueMs:900, safeR:120,
        panicMs:2600, hurtMs:420, fleeMs:1600, leashR:520, perLevel:[2, 3, 4, 4, 4, 4, 4, 4, 2, 0] },
  reward:{ goldPer:6, xpPer:14, perfectGold:150, perfectXp:320, structGold:25 }, // data-driven: ver cmGrantRescueRewards
  struct:{ ruleDmgPerStack:0.04 },
  saqueador:{ lungeCd:[2600, 3800], lungeWind:420, lungeR:64, lungeMult:1.3, civWind:700, civDmg:18, civCd:1400 },
  raptor:{ grabWind:700, grabR:46, carrySpeed:0.72, breakPct:0.22, stunMs:900, searchR:1400, escapeR:44 },
  verdugo:{ smashCd:[3600, 4600], smashWind:1100, smashR:120, structDmg:130, heroMult:1.5, heroAggroR:110 },
  planidera:{ keepMin:230, keepMax:360, boltCd:[1800, 2600], boltSpeed:230, screamCd:[8500, 11000], screamWind:1200, screamR:420, screamDmgMult:0.6 },
  acechante:{ roofMs:[1400, 2400], leapWarn:760, leapMs:420, leapR:78, groundMs:[4200, 5600], dmgMult:1.35 },
  campanero:{ channelMs:6500, breakPct:0.14, reinf:[4, 6], revealR:520, cdMs:[9000, 13000] },
  sectario:{ primeWind:1150, primeR:110, boomMult:1.6, structDmg:90, civMult:0.6, primeAt:0.4 },
  perro:{ biteCd:900, leapCd:[3000, 4500], leapR:260 },
  espectro:{ drainMs:1800, drainCd:[5000, 7000], drainR:190, healPct:0.5, possessCd:[6000, 9000] },
  maestro:{ markCd:[6500, 8000], markMs:1700, markR:100, boltCd:[2600, 3400], zoneCd:[9000, 11000], zoneR:150, zoneMs:5000, tpCd:[7000, 9000] },
  tramoyista:{ slamCd:[3000, 3800], slamWind:900, slamR:130, dropCd:[7000, 9000], dropWind:1100, dropR:90, barCd:[11000, 14000], barMs:8000, throwCd:[5200, 6800], throwWind:750 },
  dama:{ curtainCd:[7000, 9000], curtainWind:1100, boltCd:[3000, 3800], darkCd:[9000, 12000], darkR:170, darkMs:5000, mirrorCd:[13000, 16000], summonCd:[14000, 18000], burstAt:0.3 },
  presentador:{ p2At:0.66, p3At:0.33, transformMs:3200, boltCd:[2400, 3000], markCd:[7000, 8500], curtainCd:[8000, 10000], echoCd:[9000, 11000],
                pillarMs:12000, ovationCd:[15000, 18000], ovationWind:3000, ovationPct:0.62, spectatorCd:[3200, 4400], deathMs:9500,
                // PRIMER JEFE QUE AMENACE (reseña #6: al Mago le sacó 9 de 179 en toda la pelea). Los telegrafiados
                // (reflectores, telones, ecos, espectadores) pegan telMult veces su base: un reflector que te agarra
                // quieto saca ~1/4 de la vida del nivel esperado y la Ovación sin pilar, 62 %. Todos siguen con su
                // aviso en el piso (1,0-1,8 s) y la Ovación con 3 s y pilares: se esquivan leyendo, no con suerte.
                telMult:1.9,
                // REGLA (boss identity): PROTEGÉ LA CIUDAD Y USÁ SUS ATAQUES CONTRA ÉL. El GRAN NÚMERO carga (cortable con daño)
                // y manda un cometa lento contra una estructura en pie: interceptarlo lo devuelve contra él -> EXPUESTO.
                gnCd:[19000, 23000], gnWind:2300, gnBreakPct:0.07, gnSpd:150, gnStructPct:0.28, gnExposeMs:5200, kiteR:650, kiteMs:4000 }
};

// ---------------- fichas de enemigo (se suman a ENEMY_BASE) ----------------
// Escala: guardián 1.0 (~65 u de alto). hMul = alto dibujado / radio (cm-arena.js).
Object.assign(ENEMY_BASE, {
  cm_saqueador: {name:"Saqueador Maldito",       rank:"normal",   hp:38,  dmg:10, speed:92,  radius:20, xp:8,  gold:2,  scale:3.2, color:"#8a3030", ranged:false},
  cm_perro:     {name:"Perro del Albañal",       rank:"normal",   hp:22,  dmg:7,  speed:170, radius:18, xp:6,  gold:1,  scale:2.8, color:"#6a3a3a", ranged:false},
  cm_raptor:    {name:"Raptor",                  rank:"subelite", hp:70,  dmg:9,  speed:128, radius:21, xp:14, gold:5,  scale:3.2, color:"#a04040", ranged:false},
  cm_verdugo:   {name:"Verdugo",                 rank:"elite",    hp:320, dmg:20, speed:44,  radius:36, xp:34, gold:14, scale:5.0, color:"#7a2a2a", ranged:false, dropsItem:true},
  cm_planidera: {name:"Plañidera",               rank:"subelite", hp:52,  dmg:9,  speed:66,  radius:21, xp:14, gold:5,  scale:3.3, color:"#c05060", ranged:true, range:360, projSpeed:230},
  cm_acechante: {name:"Acechante de los Tejados",rank:"subelite", hp:58,  dmg:12, speed:150, radius:20, xp:15, gold:5,  scale:3.0, color:"#9a3040", ranged:false},
  cm_campanero: {name:"Campanero",               rank:"elite",    hp:240, dmg:14, speed:60,  radius:30, xp:30, gold:12, scale:4.4, color:"#b06030", ranged:false, dropsItem:true},
  cm_sectario:  {name:"Sectario Fanático",       rank:"normal",   hp:34,  dmg:10, speed:98,  radius:20, xp:9,  gold:3,  scale:3.2, color:"#b02020", ranged:false},
  cm_espectro:  {name:"Espectro Ciudadano",      rank:"normal",   hp:26,  dmg:8,  speed:84,  radius:19, xp:8,  gold:2,  scale:3.0, color:"#7ab0e0", ranged:false},
  // nivel 9 (Arena 01, la primera de un jugador nuevo): -25% de vida a los tres subjefes (auditoría pre-alfa)
  cm_maestro:   {name:"Maestro de Ceremonias",   rank:"subjefe",  hp:850, dmg:22, speed:70,  radius:32, xp:90, gold:36, scale:6.0, color:"#a02030", ranged:true, range:420, projSpeed:260, dropsItem:true},
  cm_tramoyista:{name:"El Tramoyista",           rank:"subjefe",  hp:1150,dmg:26, speed:52,  radius:48, xp:100,gold:40, scale:7.0, color:"#8a5030", ranged:false, dropsItem:true},
  cm_dama:      {name:"La Dama del Telón",       rank:"subjefe",  hp:1300,dmg:24, speed:62,  radius:36, xp:120,gold:48, scale:7.0, color:"#c02040", ranged:true, range:420, projSpeed:240, dropsItem:true},
  cm_cometa:    {name:"Gran Número",             rank:"normal",   hp:60,  dmg:0,  speed:150, radius:26, xp:0,  gold:0,  scale:3.0, color:"#ff8030", ranged:false, noDivina:true},
  cm_espejismo: {name:"Espejismo de la Dama",    rank:"normal",   hp:1,   dmg:0,  speed:62,  radius:36, xp:0,  gold:0,  scale:7.0, color:"#c02040", ranged:false, noDivina:true},
  cm_presentador:{name:"El Presentador",         rank:"jefe",     hp:5200,dmg:32, speed:58,  radius:40, xp:420,gold:200,scale:8.0, color:"#c01030", ranged:true, range:460, projSpeed:260, dropsItem:true}
});
const CM_TYPES = ["cm_saqueador","cm_perro","cm_raptor","cm_verdugo","cm_planidera","cm_acechante","cm_campanero","cm_sectario","cm_espectro",
                  "cm_maestro","cm_tramoyista","cm_dama","cm_espejismo","cm_presentador"];
const CM_CIV_KINDS = ["cm_aldeano", "cm_mujer", "cm_nino"];
