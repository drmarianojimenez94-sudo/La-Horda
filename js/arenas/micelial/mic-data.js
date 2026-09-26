"use strict";
/* ============================================================
   js/arenas/micelial/mic-data.js
   ARENA — EL REINO MICELIAL: datos (mapa, ciclo de vida del escenario, balance y fichas de enemigos).
   Identidad: "EL ESCENARIO CRECE, MADURA Y MUERE". Toda la caverna es UN organismo: la Madre Espora.
   Está desde el nivel 1 (el capullo del centro del mapa ES ella) y se vuelve evidente de a poco.

   Lógica: mic-map.js (geometría, etapas) · mic-ecosystem.js (FUNGAL_NODE, infección, núcleos)
           mic-enemies.js (6 enemigos) · mic-subboss.js (Micelio Primigenio)
           mic-mother.js (MOTHER_SPORE_CONTROLLER + Madre Espora) · mic-render.js (dibujo)
           mic-arena.js (registro en ARENA_DEFS, atlas, sonidos, red)
   Coordenadas de mundo: el capullo de la Madre está en (0,0); y crece hacia abajo.
   ============================================================ */

// El fondo pintado (1536x1024) se estira a escala 2,2 y se centra en el capullo (px 790,470).
const MIC_IMG = {w:1536, h:1024, cx:790, cy:470, s:2.2};
const MIC_WORLD = {x0:-MIC_IMG.cx*MIC_IMG.s, y0:-MIC_IMG.cy*MIC_IMG.s, w:MIC_IMG.w*MIC_IMG.s, h:MIC_IMG.h*MIC_IMG.s};

const MIC_MAP = {
  // Zona caminable: una elipse ORGÁNICA (borde ondulado hacia adentro: nunca muestra afuera del fondo)
  ell:{cx:0, cy:60, rx:1120, ry:780},
  pod:{x:0, y:0, r:150},                 // el capullo (la Madre dormida): sólido hasta que ella misma lo abre
  start:{x:0, y:470},
  navBounds:{x0:-1180, y0:-760, x1:1180, y1:900},
  // Túneles por donde entra la colonia (ángulos sobre el borde)
  tunnels:[0.15, 0.62, 1.05, 1.55, 2.05, 2.55, 3.1, 3.62, 4.1, 4.55, 5.05, 5.6],
  // Cadáveres colonizados: están desde el principio (algunos aparecen después). El Micelio
  // Primigenio los arrastra para construirse y los usa para ABSORBER vida.
  corpses:[
    {x:-520, y:-260, k:"infectado", from:0}, {x:560, y:-300, k:"sabueso", from:0}, {x:-640, y:260, k:"peregrino", from:0},
    {x:420, y:330, k:"acechador", from:1}, {x:-230, y:-470, k:"hinchado", from:1}, {x:700, y:120, k:"infectado", from:1},
    {x:-800, y:-30, k:"sabueso", from:2}, {x:200, y:520, k:"hinchado", from:2}, {x:-380, y:470, k:"infectado", from:2}
  ]
};

/* ---------------- MICELIAL_STAGE: el ciclo de vida del escenario ---------------- */
const MIC_STAGE = {GERM:0, COLON:1, MATUR:2, FLOR:3, CORAZON:4, MUERTA:5};
const MIC_STAGES = [
  {key:"germ",    name:"Germinación",   levels:[1,2]},
  {key:"colon",   name:"Colonización",  levels:[3,4,5]},
  {key:"matur",   name:"Maduración",    levels:[6]},
  {key:"flor",    name:"Floración",     levels:[7,8,9]},
  {key:"corazon", name:"El Corazón",    levels:[10]},
  {key:"muerta",  name:"Silencio",      levels:[]}
];
function micStageForLevel(lv){ return lv<=2 ? 0 : (lv<=5 ? 1 : (lv===6 ? 2 : (lv<=9 ? 3 : 4))); }

/* ---------------- FUNGAL_NODE: estados visuales de los hongos del escenario ---------------- */
// Sin IA: cada nodo es un número de estado + tipo de arte. El anfitrión decide los cambios y viajan
// en el estado de la arena como UNA cadena (1 carácter por nodo): nadie decide su propio hongo.
const FN = {SEED:0, SPROUT:1, GROWN:2, MATURE:3, SPORE:4, WITHERED:5, DEAD:6, EMPTY:7};
const FN_NAMES = ["SEED","SPROUT","GROWN","MATURE","SPORE_RELEASE","WITHERED","DEAD","EMPTY"];
// Arte de cada tipo de nodo por estado (recortes de las hojas oficiales; marchito/muerto = el mismo
// hongo desaturado, ver tools/art/micelial/build_micelial.py). h = alto en el mundo del estado MADURO.
const FN_KINDS = {
  sprig:  {grow:["nucleo_3","nucleo_3","nucleo_2"], mature:"nucleo_2", h:70},
  bush:   {grow:["nucleo_3","nucleo_2","nucleo_1"], mature:"nucleo_1", h:96},
  lamp:   {grow:["nucleo_3","nucleo_4","nucleo_4"], mature:"nucleo_4", h:112},
  row:    {grow:["nucleo_3","mush_row_small","mush_row_small"], mature:"mush_row_small", h:96},
  grove:  {grow:["nucleo_2","mush_row_big","mush_row_big"], mature:"mush_row_big", h:118},
  pillar: {grow:["nucleo_3","m_summon_c","spore_pillar"], mature:"spore_pillar", h:170},
  cyan:   {grow:["nucleo_3","m_summon_b","m_summon_b"], mature:"m_summon_b", h:96}
};
// Tiempo típico en cada estado (ms, al azar dentro del rango). La colonia se acelera con las etapas.
const FN_TIMES = [[2500,5000],[4000,7000],[6000,11000],[9000,16000],[3500,6000],[6000,10000],[4000,7000],[3000,9000]];

/* ---------------- balance centralizado ---------------- */
const MIC_CFG = {
  // Ecosistema: cuántos nodos quieren estar vivos por etapa (fracción de los lugares)
  eco:{ alive:[0.30, 0.52, 0.66, 0.78, 0.86, 0.0], slots:54, tickMs:450 },
  // Núcleos Miceliales: aparecen durante las oleadas desde el nivel 3
  nucleo:{ fromLevel:3, everyMs:[16000, 11000], maxAlive:[2, 3, 3, 4], stageMs:7500, lastStageSpawnMs:6500,
           r:[90, 150, 200, 230], slow:[0, 0.22, 0.30, 0.32], enemyHaste:0.14, spawnCap:40, recedeMs:3200,
           burstR:80, burstWarn:900, burstPct:0.05 },
  // Nube de esporas (Infectado al morir, nubes de pared, nubes de la Madre en fase 2)
  cloud:{ smallR:70, smallMs:2600, smallSlow:0.25, smallDps:0.012, wallR:150, wallMs:9000, wallSlow:0.3, wallDps:0.015,
          bigR:150, bigMs:11000, bigSlow:0.35, bigDps:0.02, max:10 },
  // Enemigos
  infectado:{ cloudChance:0.3 },
  acechador:{ hideRange:[200, 420], hideMs:[1300, 2400], hideAlpha:0.22, warnMs:650, leapMs:430, leapMax:380, leapCdMs:[5500, 8000], dmgMult:1.25, recoverMs:700 },
  hinchado:{ punchR:130, punchWind:620, punchCd:2300, boomR:175, boomWarn:1600, boomCdMs:[9000, 12000], boomMult:1.35, boomRange:230, deathR:95, deathWarn:750, deathPct:0.06 },
  peregrino:{ walkRange:380, plantRange:430, plantMs:900, plantedRange:540, plantedShotMs:1050, walkShotMs:2100, plantMaxMs:9000, uprootNear:130, boltSpeed:320 },
  sabueso:{ packExtra:[1, 2], leapRange:[130, 270], leapWarn:420, leapMs:360, leapCdMs:[3200, 5000], packMaxAlive:14 },
  chaman:{ keepMin:230, keepMax:340, regenCdMs:[7000, 9000], regenMs:2200, regenR:270, regenPct:0.03, regenTick:500,
           germCdMs:[11000, 14000], germRange:720, germBoostMs:4200, ballCdMs:2300, ballSpeed:260, auraR:210, auraSpd:0.15, auraDmg:0.10 },
  // Subjefe (nivel 6)
  micelio:{ triggerAt:0.30, buildMs:5200, lashCdMs:[7000, 9000], lashWarn:1100, lashLen:640, lashW:48, lashMult:1.2,
            rainCdMs:[11000, 14000], rainN:6, rainR:78, rainDelay:1350, rainMult:0.85, germCdMs:[16000, 20000],
            absorbAt:0.72, absorbCdMs:19000, absorbMax:3, absorbMs:8000, absorbPct:0.012, absorbCap:0.12, absorbLinks:3,
            clawR:175, clawWind:520, clawCd:1400, sinkMs:2600 },
  // Jefe (nivel 10)
  madre:{ revealMs:9000, p2At:0.60, p3At:0.30, closeMs:2600, darkMs:1600,
          rootsCdMs:[7000, 5800, 4800], rootsN:[3, 4, 5], rootsR:84, rootsDelay:1150, rootsMult:1.0,
          sporeCdMs:[7500, 6500, 5200], sporeN:[5, 6, 7], sporeSpeed:220, sporeMult:0.45,
          whipCdMs:[9500, 8000, 6800], whipWind:1100, whipLen:760, whipW:62, whipMult:1.25,
          summonCdMs:[15000, 14000, 13000], summonN:[2, 3, 3], addsMax:5,
          clawR:300, clawWind:750, clawCd:3200,
          cloudCdMs:12000, cloudN:3, halCdMs:15000, halN:5, halMs:9000,
          heartVuln:1.35, infectMs:75000, safeStart:2.0, safeMin:0.5, infectSlow:0.4, infectDps:0.03, infectDpsRamp:0.01,
          deathMs:10500 },
  // Intervenciones de la Madre en los niveles 7-9 (partes del jefe, todavía sin mostrarse entera)
  inter:{ gapMs:{7:[15000, 20000], 8:[11500, 16000], 9:[9000, 13000]}, rootW:60, rootWarn:1400, rootMult:1.1,
          armR:150, armWarn:1500, armMult:1.3, capAdds:3 }
};

// ---------------- fichas de enemigo (se suman a ENEMY_BASE) ----------------
// Escala relativa pedida: campeón 1.0 (~65 u de alto). hMul = alto dibujado / radio (mic-arena.js).
Object.assign(ENEMY_BASE, {
  infectado:  {name:"Infectado Micelial",   rank:"normal",   hp:30,  dmg:8,  speed:80,  radius:23, xp:7,  gold:2,  scale:3.4, color:"#b050c0", ranged:false},
  acechador:  {name:"Acechador de Esporas", rank:"subelite", hp:36,  dmg:10, speed:128, radius:21, xp:11, gold:4,  scale:3.2, color:"#6a5ad0", ranged:false},
  hinchado:   {name:"Hinchado",             rank:"elite",    hp:230, dmg:16, speed:38,  radius:34, xp:30, gold:12, scale:4.8, color:"#e06a30", ranged:false, dropsItem:true},
  peregrino:  {name:"Peregrino Enraizado",  rank:"subelite", hp:40,  dmg:9,  speed:58,  radius:22, xp:12, gold:4,  scale:3.4, color:"#80c040", ranged:true, range:380, projSpeed:320},
  sabueso:    {name:"Sabueso Cordyceps",    rank:"normal",   hp:13,  dmg:5,  speed:150, radius:18, xp:4,  gold:1,  scale:2.8, color:"#e0304a", ranged:false},
  chaman:     {name:"Chamán de la Colonia", rank:"elite",    hp:140, dmg:10, speed:56,  radius:24, xp:28, gold:11, scale:4.2, color:"#9050e0", ranged:true, range:320, projSpeed:260, dropsItem:true},
  // estructuras (no caminan, no pegan cuerpo a cuerpo)
  nucleo_micelial:{name:"Núcleo Micelial",  rank:"subelite", hp:120, dmg:0,  speed:0,   radius:30, xp:14, gold:5,  scale:3.0, color:"#c060ff", ranged:false, structure:true, noDivina:true},
  raiz_absorcion: {name:"Raíz de Absorción",rank:"subelite", hp:70,  dmg:0,  speed:0,   radius:22, xp:5,  gold:1,  scale:2.4, color:"#e070ff", ranged:false, structure:true, noDivina:true},
  // subjefe y jefe
  micelio:    {name:"Micelio Primigenio",   rank:"subjefe",  hp:1350,dmg:22, speed:56,  radius:70, xp:95, gold:38, scale:8.0, color:"#c040c0", ranged:false, dropsItem:true},
  madre_espora:{name:"La Madre Espora",     rank:"jefe",     hp:4600,dmg:32, speed:0,   radius:140,xp:400,gold:190,scale:9.0, color:"#ff60d0", ranged:false, dropsItem:true}
});
