"use strict";
/* ============================================================
   js/arenas/minas/mn-data.js
   MINAS PROFUNDAS (Arena 09, la última antes de la Arena Infernal) — datos: sectores, luces, balance
   y fichas de enemigos.
   Identidad: "LA LUZ ES TERRITORIO". La oscuridad no es un filtro: es una amenaza de juego. Los
   enemigos le quitan la luz al equipo (Minero, Escupidor, Consumidor, Devoraluz, Titán, Cerbero) y
   el equipo recupera territorio volviéndola a ENCENDER (acción contextual). Nunca conviene quedarse a
   oscuras: ahí se recibe más daño y los Acechadores emboscan.
   Progresión: el equipo DESCIENDE por seis sectores (transición corta entre uno y otro): la mina
   humana (madera, rieles, faroles) se vuelve cristal, corrupción y, al final, calor infernal. En el
   último sector espera CERBERO frente al Umbral. MATARLO NO TERMINA LA PARTIDA: se abre el Portal
   Infernal y la victoria llega recién cuando un guardián humano lo ATRAVIESA (acción contextual).

   Lógica: mn-map.js (sectores, colisión, navegación, descenso, apariciones) · mn-light.js (luces,
           oscuridad, antorchas, zonas oscuras, acciones ENCENDER / ATRAVESAR) · mn-enemies.js (seis
           enemigos + Devoraluz + oleadas) · mn-bosses.js (Titán de Piedra, Cerbero, Portal Infernal)
           mn-render.js (dibujo, máscara de oscuridad, HUD) · mn-arena.js (registro, atlas, sonidos,
           bots, red)
   Coordenadas: cada sector es una sala propia en el mismo espacio (x -1100..1100, y -760..760);
   el equipo entra por el SUR (jaula del montacargas) y baja por el NORTE (pozo con escalera).
   ============================================================ */
const MN_BOUNDS = {x0:-1100, y0:-760, x1:1100, y1:760};
const MN_ROCK_H = 70;          // alto visual de las masas de roca (vista oblicua)

/* ---------------- sectores ----------------
   rocks: rectángulos de roca maciza · pillars: columnas/cúmulos (círculos) · lights: fuentes de luz
   (k: farol | brasero | cristal | nucleo · r: radio de luz) · tunnels: bocas por donde entra la Horda ·
   walls (vetas): lugares de donde salen los Insectos de Cristal · dark: base de oscuridad (0..1) ·
   tone: color del ambiente · depth: metros (cartel del descenso) */
const MN_SECTORS = [
  { id:"superior", name:"MINA SUPERIOR", sub:"Todavía hay luz. Todavía hay rieles.", depth:40, levels:[1, 2], dark:0.56, tone:"40,26,14",
    floor:"piso_superior", rockTint:"rgba(40,26,16,0.25)",
    rocks:[{x0:-1100, y0:-760, x1:-720, y1:-400}, {x0:720, y0:-760, x1:1100, y1:-430}, {x0:-1100, y0:430, x1:-760, y1:760}, {x0:760, y0:400, x1:1100, y1:760},
           {x0:-1100, y0:-60, x1:-960, y1:120}, {x0:960, y0:-120, x1:1100, y1:60}],
    pillars:[{x:-380, y:70, r:62}, {x:430, y:-90, r:70}, {x:40, y:-400, r:54}, {x:-120, y:420, r:40}],
    props:[{k:"andamio", x:-560, y:-330}, {k:"andamio", x:560, y:330}, {k:"carro", x:-250, y:-170}, {k:"carro", x:300, y:230}, {k:"cristal_azul", x:-880, y:300}],
    rails:[[0, 700, 0, 200, -260, -160, -260, -700]],
    lights:[{k:"farol", x:-600, y:-150, r:300}, {k:"farol", x:600, y:170, r:300}, {k:"farol", x:-220, y:280, r:280}, {k:"farol", x:240, y:-260, r:280},
            {k:"farol", x:170, y:620, r:280}, {k:"brasero", x:-760, y:220, r:300}, {k:"brasero", x:780, y:-220, r:300}, {k:"farol", x:-360, y:-560, r:260}, {k:"farol", x:380, y:-560, r:260}],
    tunnels:[{x:-1060, y:-240}, {x:1060, y:230}, {x:-640, y:720}, {x:620, y:720}, {x:-560, y:-720}, {x:560, y:-720}],
    walls:[{x:-700, y:-400}, {x:700, y:-420}, {x:-740, y:420}, {x:740, y:400}],
    entry:{x:0, y:560}, exit:{x:0, y:-620} },
  { id:"galerias", name:"GALERÍAS", sub:"Vagonetas, maquinaria y ecos de picos.", depth:120, levels:[3, 4], dark:0.64, tone:"34,22,16",
    floor:"piso_galerias", rockTint:"rgba(30,20,16,0.3)",
    rocks:[{x0:-1100, y0:-760, x1:-820, y1:-300}, {x0:820, y0:-760, x1:1100, y1:-300}, {x0:-1100, y0:300, x1:-820, y1:760}, {x0:820, y0:300, x1:1100, y1:760},
           {x0:-640, y0:-300, x1:160, y1:-200}, {x0:-160, y0:200, x1:640, y1:300}],
    pillars:[{x:-420, y:40, r:56}, {x:420, y:-40, r:56}, {x:-760, y:560, r:44}, {x:760, y:-560, r:44}],
    props:[{k:"carro", x:-300, y:-90}, {k:"carro", x:320, y:100}, {k:"andamio", x:-700, y:-120}, {k:"andamio", x:700, y:120}, {k:"riel", x:300, y:-460}, {k:"riel", x:-300, y:460}],
    rails:[[-800, -480, 800, -480], [-800, 480, 800, 480], [0, 700, 0, -700]],
    lights:[{k:"farol", x:-560, y:-470, r:280}, {k:"farol", x:560, y:-470, r:280}, {k:"farol", x:-560, y:470, r:280}, {k:"farol", x:560, y:470, r:280},
            {k:"brasero", x:0, y:0, r:320}, {k:"farol", x:-720, y:60, r:260}, {k:"farol", x:720, y:-60, r:260}, {k:"farol", x:240, y:-620, r:240}],
    tunnels:[{x:-1060, y:0}, {x:1060, y:0}, {x:-700, y:720}, {x:700, y:-720}, {x:-700, y:-720}, {x:700, y:720}],
    walls:[{x:-240, y:-200}, {x:240, y:200}, {x:-820, y:-300}, {x:820, y:300}],
    entry:{x:0, y:560}, exit:{x:0, y:-620} },
  { id:"vetas", name:"VETAS PROFUNDAS", sub:"Cristales que brillan… y otros que no.", depth:240, levels:[5, 6], dark:0.72, tone:"14,20,36",
    floor:"piso_vetas", rockTint:"rgba(16,24,44,0.35)",
    rocks:[{x0:-1100, y0:-760, x1:-760, y1:-240}, {x0:760, y0:240, x1:1100, y1:760}, {x0:-1100, y0:360, x1:-860, y1:760}, {x0:860, y0:-760, x1:1100, y1:-360}],
    pillars:[{x:-440, y:-320, r:70}, {x:460, y:300, r:72}, {x:-520, y:300, r:58}, {x:520, y:-300, r:58}, {x:0, y:-80, r:64}, {x:-160, y:520, r:46}, {x:180, y:-560, r:46}],
    props:[{k:"cristal_azul", x:-640, y:-100}, {k:"cristal_azul", x:640, y:80}, {k:"cristal_inestable", x:-300, y:-560}, {k:"cristal_azul", x:300, y:560}, {k:"estalactita", x:760, y:-120}],
    rails:[[0, 700, 120, 200, -120, -300, 0, -700]],
    lights:[{k:"cristal", x:-680, y:-60, r:290}, {k:"cristal", x:680, y:40, r:290}, {k:"cristal", x:-260, y:-560, r:260}, {k:"cristal", x:260, y:560, r:260},
            {k:"nucleo", x:0, y:200, r:340}, {k:"cristal", x:-760, y:540, r:240}, {k:"cristal", x:760, y:-540, r:240}, {k:"cristal", x:-120, y:-300, r:230}],
    tunnels:[{x:-1060, y:40}, {x:1060, y:-40}, {x:-500, y:720}, {x:500, y:-720}, {x:-300, y:-720}, {x:360, y:720}],
    walls:[{x:-440, y:-320}, {x:460, y:300}, {x:-760, y:-240}, {x:760, y:240}, {x:0, y:-80}],
    entry:{x:0, y:560}, exit:{x:0, y:-620} },
  { id:"corrompida", name:"MINA CORROMPIDA", sub:"La mina deja de parecer humana.", depth:380, levels:[7], dark:0.78, tone:"30,10,40",
    floor:"piso_corrompida", rockTint:"rgba(40,10,50,0.35)",
    rocks:[{x0:-1100, y0:-760, x1:-700, y1:-460}, {x0:700, y0:-760, x1:1100, y1:-460}, {x0:-1100, y0:460, x1:-700, y1:760}, {x0:700, y0:460, x1:1100, y1:760},
           {x0:-260, y0:-240, x1:260, y1:-160}],
    pillars:[{x:-560, y:-60, r:64}, {x:560, y:60, r:64}, {x:-240, y:320, r:52}, {x:260, y:360, r:52}, {x:0, y:560, r:40}],
    props:[{k:"cristal_morado", x:-800, y:-220}, {k:"cristal_morado", x:820, y:220}, {k:"pozo", x:-620, y:520}, {k:"pozo", x:620, y:-520}, {k:"estalactita", x:0, y:-560}],
    rails:[],
    lights:[{k:"cristal", x:-760, y:120, r:270}, {k:"cristal", x:760, y:-120, r:270}, {k:"farol", x:-340, y:-420, r:250}, {k:"farol", x:340, y:-420, r:250},
            {k:"nucleo", x:0, y:120, r:330}, {k:"farol", x:-420, y:560, r:240}, {k:"farol", x:420, y:560, r:240}],
    tunnels:[{x:-1060, y:0}, {x:1060, y:0}, {x:-620, y:520}, {x:620, y:-520}, {x:-400, y:-720}, {x:400, y:720}],
    walls:[{x:-560, y:-60}, {x:560, y:60}, {x:-700, y:-460}, {x:700, y:460}],
    entry:{x:0, y:560}, exit:{x:0, y:-620} },
  { id:"profundidades", name:"PROFUNDIDADES", sub:"Algo enorme se mueve en la roca.", depth:520, levels:[8, 9], dark:0.78, tone:"36,16,10",
    floor:"piso_profundidades", rockTint:"rgba(40,16,10,0.35)",
    rocks:[{x0:-1100, y0:-760, x1:-800, y1:-360}, {x0:800, y0:-760, x1:1100, y1:-360}, {x0:-1100, y0:380, x1:-820, y1:760}, {x0:820, y0:380, x1:1100, y1:760}],
    pillars:[{x:-560, y:-240, r:60}, {x:560, y:240, r:60}, {x:-540, y:320, r:52}, {x:560, y:-300, r:52}],
    props:[{k:"estalactita", x:-300, y:-480}, {k:"estalactita", x:320, y:480}, {k:"cristal_inestable", x:-740, y:40}, {k:"cristal_inestable", x:740, y:-40}],
    rails:[],
    lights:[{k:"brasero", x:-420, y:-40, r:300}, {k:"brasero", x:420, y:40, r:300}, {k:"cristal", x:-700, y:-520, r:250}, {k:"cristal", x:700, y:520, r:250},
            {k:"brasero", x:0, y:-440, r:280}, {k:"brasero", x:0, y:440, r:280}, {k:"cristal", x:-760, y:560, r:230}, {k:"cristal", x:760, y:-560, r:230}],
    tunnels:[{x:-1060, y:0}, {x:1060, y:0}, {x:-500, y:720}, {x:500, y:-720}, {x:-500, y:-720}, {x:500, y:720}],
    walls:[{x:-560, y:-240}, {x:560, y:240}, {x:-800, y:-360}, {x:820, y:380}],
    entry:{x:0, y:560}, exit:{x:0, y:-620} },
  { id:"umbral", name:"UMBRAL INFERNAL", sub:"Algo guarda la entrada.", depth:666, levels:[10], dark:0.7, tone:"60,12,6",
    floor:"piso_umbral", rockTint:"rgba(70,14,6,0.4)",
    rocks:[{x0:-1100, y0:-760, x1:-420, y1:-560}, {x0:420, y0:-760, x1:1100, y1:-560}, {x0:-1100, y0:-560, x1:-900, y1:760}, {x0:900, y0:-560, x1:1100, y1:760},
           {x0:-1100, y0:560, x1:-560, y1:760}, {x0:560, y0:560, x1:1100, y1:760}],
    pillars:[{x:-560, y:-200, r:46}, {x:560, y:-200, r:46}, {x:-600, y:280, r:46}, {x:600, y:280, r:46}],
    props:[],
    rails:[],
    lights:[{k:"brasero", x:-360, y:-420, r:300}, {k:"brasero", x:360, y:-420, r:300}, {k:"brasero", x:-720, y:-60, r:300}, {k:"brasero", x:720, y:-60, r:300},
            {k:"brasero", x:-640, y:420, r:280}, {k:"brasero", x:640, y:420, r:280}, {k:"brasero", x:0, y:480, r:280}],
    tunnels:[{x:-860, y:200}, {x:860, y:200}, {x:-300, y:700}, {x:300, y:700}],
    walls:[{x:-560, y:-200}, {x:560, y:-200}],
    entry:{x:0, y:540}, exit:null,
    gate:{x:0, y:-600, w:360}, chain:{x:0, y:-380, r:430}, portal:{x:0, y:-520} }
];
// nivel -> sector
const MN_SECTOR_OF_LEVEL = [0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 5];

/* ---------------- balance centralizado ---------------- */
const MN_CFG = {
  light:{ regen:0.05, flickerAt:0.5, relightMs:1300, interruptPct:0.07, torchR:150, torchSnuffR:70, torchSnuffMs:6000,
          darkDmgTaken:1.15, litRegenPct:0.004, tempOffMs:9000, zoneR:130, zoneMs:7000, maxZones:4 },
  descentMs:2600,
  esclavo:{ lungeCd:[3000, 4200], lungeWind:520, lungeR:90, lungeMult:1.25 },
  insecto:{ emergeMs:520, shardWind:420, shardR:56, shardMult:0.5, group:3 },
  acechador:{ hideAlpha:0.16, ambushWarn:750, leapMs:360, ambushR:70, ambushMult:1.5, visibleMs:4200, huntR:720, cd:[4500, 6500] },
  minero:{ slamCd:[3400, 4400], slamWind:1000, slamR:115, lightHit:0.65, throwCd:[5200, 7000], throwWind:700, lightR:120, huntLightR:380 },
  escupidor:{ keepMin:250, keepMax:380, boltCd:[3200, 4200], boltWind:600, boltSpeed:260, snuffMs:5000 },
  consumidor:{ drainR:150, drainRate:0.11, auraR:190, auraSpd:1.2, auraDmg:1.15, pulseR:320 },
  devoraluz:{ spd:1.0, devourMs:2600, interruptPct:0.12, staggerMs:1100, breathCd:[4000, 5500], breathWind:700, breathR:210, spawnMin:620, levels:{6:1, 7:2, 9:1} },
  titan:{ slamCd:[3000, 3800], slamWind:900, slamR:150, quakeCd:[7000, 9000], throwCd:[5200, 6600], rainCd:[9000, 11000], stompCd:[8000, 10000], stompR:230,
          lightR:420, collapseCd:[14000, 17000], rubbleMs:10000, maxRubble:4, p2At:0.5 },
  cerbero:{ p2At:0.66, p3At:0.33, flameCd:[6500, 8000], flameWind:1100, flameMs:1500, flameR:400, flameArc:0.55, stompCd:[7000, 9000], stompWind:900, stompR:210,
            biteCd:[3200, 4200], biteWind:650, biteR:160, howlCd:[14000, 17000], howlWind:1200, chargeCd:[9000, 11000], chargeWind:900,
            summonCd:[16000, 20000], chainR:420, deathMs:6200, portalMs:3200, portalUseMs:900 }
};

// ---------------- fichas de enemigo (se suman a ENEMY_BASE) ----------------
// Escala: guardián 1.0 (~65 u de alto). hMul = alto dibujado / radio (mn-arena.js).
// defeatOutcome:"exit" -> la muerte del jefe NO es la victoria: la arena abre una salida (js/core/run.js).
Object.assign(ENEMY_BASE, {
  mn_esclavo:    {name:"Esclavo Enlazado",     rank:"normal",   hp:40,  dmg:10, speed:88,  radius:20, xp:8,  gold:2,  scale:3.2, color:"#8a5040", ranged:false},
  mn_insecto:    {name:"Insecto de Cristal",   rank:"normal",   hp:20,  dmg:7,  speed:175, radius:17, xp:6,  gold:1,  scale:2.8, color:"#c02030", ranged:false},
  mn_acechador:  {name:"Acechador Ciego",      rank:"subelite", hp:62,  dmg:12, speed:150, radius:20, xp:15, gold:5,  scale:3.2, color:"#c0a8a0", ranged:false},
  mn_minero:     {name:"Minero Corrompido",    rank:"elite",    hp:300, dmg:19, speed:50,  radius:32, xp:32, gold:13, scale:4.8, color:"#8a5a30", ranged:false, dropsItem:true},
  mn_escupidor:  {name:"Escupidor de Oscuridad",rank:"subelite",hp:58,  dmg:10, speed:72,  radius:22, xp:15, gold:5,  scale:3.4, color:"#8030c0", ranged:true, range:380, projSpeed:260},
  mn_consumidor: {name:"Consumidor Luminoso",  rank:"elite",    hp:220, dmg:12, speed:66,  radius:24, xp:30, gold:12, scale:4.0, color:"#3a70c0", ranged:false, dropsItem:true},
  mn_devoraluz:  {name:"Devoraluz",            rank:"elite",    hp:640, dmg:18, speed:96,  radius:34, xp:70, gold:30, scale:5.4, color:"#a020c0", ranged:false, dropsItem:true},
  mn_titan:      {name:"Titán de Piedra",      rank:"subjefe",  hp:2600,dmg:28, speed:46,  radius:54, xp:160,gold:60, scale:8.0, color:"#8a5a2a", ranged:false, dropsItem:true},
  mn_cerbero:    {name:"Cerbero",              rank:"jefe",     hp:6200,dmg:34, speed:74,  radius:58, xp:480,gold:220,scale:9.0, color:"#c02010", ranged:false, dropsItem:true, defeatOutcome:"exit"}
});
const MN_TYPES = ["mn_esclavo","mn_insecto","mn_acechador","mn_minero","mn_escupidor","mn_consumidor","mn_devoraluz","mn_titan","mn_cerbero"];
