"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-arena.js
   Registro de LA FORTALEZA SIN FIN en ARENA_DEFS (los ganchos que el motor llama) + arte real
   de los enemigos (atlas recortados de las hojas oficiales), guías de jefe y sonidos propios.
   Datos: fort-data.js · Mapa: fort-map.js · Trampas: fort-traps.js · Enemigos: fort-enemies.js
   Jefes: fort-bosses.js · Arte del escenario: fort-art.js · Dibujo: fort-render.js
   ============================================================ */
VFX_PAL.steam = ["#e8e8e0","#c8c8c0","#ffffff","235,235,225"];
ENEMY_PROJ_COLOR.arana = "#ffb040";

/* ---------------- atlas reales (tools/art/fortaleza/build_fortaleza.py -> meta.json) ----------------
   hMul = alto dibujado / radio. Escala pedida respecto de un campeón (x1.0 ≈ 65 u de alto):
   Carcelero 1.1 · Dragón de Bronce 0.9 · Autómata 1.3 · Prisionero 1.1 · Engendro 0.6 ·
   Verdugo 1.4 · Araña 0.8 · Caballero 2.2 · Dragón de la Forja 3.5 */
const FORT_ATLAS_META = {"carcelero":{"w":270,"h":108,"cols":8,"refH":95,"anchor":0.9444,"hMul":2.73,"sets":{"idle":[8,9],"walk":[10,11,12,11],"atk":[0,1],"chain":[2,3],"hit":[5,6],"death":[7,4]}},
  "dragon_bronce":{"w":212,"h":135,"cols":8,"refH":85,"anchor":0.8,"hMul":2.76,"sets":{"idle":[10,11],"walk":[5,10,6,11],"atk":[0,1],"breath":[2,3],"hit":[7,8],"death":[9,4]}},
  "automata":{"w":308,"h":135,"cols":8,"refH":108,"anchor":0.9407,"hMul":2.72,"sets":{"idle":[8,9],"walk":[10,11,12,13],"atk":[0,1,2],"charge":[3],"hit":[5,6],"death":[7,4]}},
  "prisionero":{"w":250,"h":136,"cols":8,"refH":110,"anchor":0.9412,"hMul":2.84,"sets":{"idle":[5,6],"walk":[9,10,11],"atk":[0,1],"rip":[7,8],"hit":[3,4],"death":[4,2]}},
  "engendro":{"w":108,"h":70,"cols":2,"refH":64,"anchor":0.9429,"hMul":2.67,"sets":{"idle":[0],"walk":[0,1],"atk":[1,0],"hit":[1],"death":[1]}},
  "verdugo":{"w":252,"h":164,"cols":8,"refH":132,"anchor":0.939,"hMul":2.76,"sets":{"idle":[4,5],"walk":[8,9,5,9],"atk":[0,10],"steam":[6,7],"hit":[2,3],"death":[3,1]}},
  "arana":{"w":178,"h":115,"cols":8,"refH":89,"anchor":0.9391,"hMul":2.74,"sets":{"idle":[3,4],"walk":[7,8,9,8],"atk":[6,3],"net":[5],"hit":[1,2],"death":[2,0]}},
  "dragon_forja":{"w":248,"h":131,"cols":8,"refH":85,"anchor":0.9237,"hMul":2.9,"sets":{"idle":[25,26,27,26],"walk":[28,29,30,31],"fly":[18,19,20,21],"atk":[0,1,2,3,4],"breath":[9,10],"bomb":[5,6,7,8],"flap":[15,16,17],"hit":[22,23,24],"death":[11,12,13,14]}},
  "caballero":{"w":228,"h":115,"cols":8,"refH":74,"anchor":0.9391,"hMul":2.75,"sets":{"idle":[9,10,11,12,13],"walk":[38,39,40,41,42,43],"turn":[34,35,36,37],"atk":[26,27,28,29,30],"shield":[17,18,19,20],"charge":[0,1],"sweep":[21,22,23,24,25],"exec":[3,4,5,6],"plant":[14],"hit":[7,8],"rage":[15,16],"tf":[31,32,33],"death":[8,2]}}};
for(const k in FORT_ATLAS_META){
  enemyAtlasPackLoad(k, "assets/sprites/arenas/fortaleza/"+k+"/atlas.png", FORT_ATLAS_META[k]);
  ENEMY_ATLAS_PACK[k].hMul = FORT_ATLAS_META[k].hMul;
}

/* ---------------- guías de jefe (boss-hud.js) ---------------- */
ARENA_BOSS_TIPS.dragon_forja = {epithet:"Nacido en el Horno", tips:[
  "Aliento de Forja: barre de un lado al otro. Pasá por detrás del dragón.",
  "Bombardeo: salí de los círculos rojos antes de que caigan las bombas.",
  "Al 30% entra en SOBRECARGA: ataca más seguido. Guardá tus habilidades fuertes para ese momento."]};
ARENA_BOSS_TIPS.caballero = {epithet:"El Carcelero Eterno", phases:[{hp:1},{hp:0.65},{hp:0.30}], tips:[
  "Postura de Contraataque (brillo azul): NO le pegues; si esperás, queda expuesto.",
  "Fase 2: la cámara despierta. Mirá el piso: vapor, rejillas al rojo, prensas y cadenas avisan antes.",
  "Fase 3: Ejecución Oxidada es una línea roja enorme. Hacete a un costado, nunca hacia atrás."]};

/* ---------------- sonidos propios (sintetizados; se pueden reemplazar por grabaciones) ---------------- */
function _fsx(p, gap, play){ return {p, gap, play}; }
Object.assign(ARENA_SFX, {
  fortBlast:     _fsx(5, 600, (t,D)=>{ _noise(t,0.9,0.6,"lowpass",900,0,D); _tone(t,"sine",70,26,0.9,0.7,D); _noise(t+0.05,0.5,0.25,"bandpass",2200,1,D); _duck(0.35,900); return 1; }),
  fortGate:      _fsx(3, 400, (t,D)=>{ for(let i=0;i<5;i++) _noise(t+i*0.09,0.06,0.18,"bandpass",1400+i*80,3,D); _tone(t,"square",90,70,0.5,0.08,D); return 0.55; }),
  fortBridgeWarn:_fsx(5, 900, (t,D)=>{ // bocina de alarma + engranajes
    _tone(t,"sawtooth",196,196,0.5,0.16,D,0.03); _tone(t+0.55,"sawtooth",185,185,0.5,0.16,D,0.03); _tone(t+1.1,"sawtooth",196,196,0.6,0.16,D,0.03);
    for(let i=0;i<10;i++) _noise(t+i*0.15,0.05,0.12,"bandpass",900,4,D); _duck(0.55,1500); return 1.7; }),
  fortBridge:    _fsx(4, 500, (t,D)=>{ _noise(t,2.2,0.2,"lowpass",300,0,D); for(let i=0;i<14;i++) _noise(t+i*0.16,0.04,0.12,"bandpass",700,5,D); _tone(t,"sine",55,50,2.2,0.2,D,0.2); return 2.2; }),
  fortClank:     _fsx(3, 250, (t,D)=>{ _tone(t,"square",220,110,0.12,0.14,D); _noise(t,0.15,0.3,"bandpass",1800,2,D); _tone(t,"sine",80,40,0.3,0.4,D); return 0.3; }),
  fortDoorSlam:  _fsx(5, 900, (t,D)=>{ _noise(t,0.6,0.7,"lowpass",600,0,D); _tone(t,"sine",60,24,1.2,0.8,D); _noise(t+0.02,1.6,0.08,"highpass",3000,0,D); _duck(0.15,2600); return 1.4; }),
  fortGears:     _fsx(3, 600, (t,D)=>{ for(let i=0;i<12;i++) _noise(t+i*0.11,0.035,0.14,"bandpass",1100+(i%3)*300,6,D); _tone(t,"sine",70,60,1.3,0.12,D,0.2); return 1.3; }),
  fortSteamHiss: _fsx(2, 300, (t,D)=>{ _noise(t,1.2,0.12,"highpass",4000,0,D); return 1.2; }),
  fortSteam:     _fsx(3, 200, (t,D)=>{ _noise(t,0.7,0.35,"highpass",2500,0,D); _noise(t,0.3,0.2,"lowpass",500,0,D); return 0.7; }),
  fortSteamBig:  _fsx(3, 300, (t,D)=>{ _noise(t,1.1,0.45,"highpass",1800,0,D); _tone(t,"sine",90,60,0.4,0.25,D); return 1.1; }),
  fortChain:     _fsx(2, 250, (t,D)=>{ for(let i=0;i<6;i++) _noise(t+i*0.06,0.03,0.16,"bandpass",3200+Math.random()*800,8,D); return 0.4; }),
  fortChainThrow:_fsx(2, 200, (t,D)=>{ _noise(t,0.25,0.14,"bandpass",2400,3,D); for(let i=0;i<4;i++) _noise(t+0.05+i*0.04,0.02,0.12,"bandpass",4200,8,D); return 0.3; }),
  fortChainHit:  _fsx(3, 150, (t,D)=>{ _noise(t,0.12,0.3,"bandpass",2800,4,D); _tone(t,"triangle",900,500,0.12,0.08,D); return 0.15; }),
  fortChainSweep:_fsx(3, 400, (t,D)=>{ for(let i=0;i<9;i++) _noise(t+i*0.07,0.03,0.18,"bandpass",2600+i*120,6,D); _noise(t,0.6,0.12,"lowpass",700,0,D); return 0.7; }),
  fortFurnace:   _fsx(2, 400, (t,D)=>{ _noise(t,1.8,0.22,"lowpass",420,0,D); _tone(t,"sine",48,58,1.8,0.18,D,0.4); return 1.8; }),
  fortCool:      _fsx(1, 400, (t,D)=>{ _noise(t,0.8,0.08,"highpass",5000,0,D); return 0.8; }),
  fortPressWarn: _fsx(3, 400, (t,D)=>{ for(let i=0;i<3;i++) _tone(t+i*0.3,"square",330,330,0.12,0.09,D); _noise(t,1.4,0.1,"lowpass",400,0,D); return 1.4; }),
  fortPress:     _fsx(4, 200, (t,D)=>{ _tone(t,"sine",60,22,0.5,0.8,D); _noise(t,0.35,0.55,"lowpass",900,0,D); _tone(t,"square",180,90,0.1,0.12,D); _duck(0.6,300); return 0.5; }),
  fortGearRoll:  _fsx(3, 400, (t,D)=>{ for(let i=0;i<16;i++) _noise(t+i*0.06,0.025,0.16,"bandpass",1800,8,D); _tone(t,"sawtooth",120,160,1.0,0.06,D); return 1.0; }),
  fortBite:      _fsx(2, 120, (t,D)=>{ _noise(t,0.08,0.3,"bandpass",1600,2,D); _tone(t,"square",280,120,0.08,0.12,D); return 0.1; }),
  fortWing:      _fsx(2, 300, (t,D)=>{ _noise(t,0.2,0.2,"lowpass",500,0,D); _noise(t+0.22,0.2,0.2,"lowpass",500,0,D); return 0.45; }),
  fortAutomataCharge:_fsx(4, 500, (t,D)=>{ _tone(t,"sawtooth",80,240,1.0,0.14,D,0.1); _noise(t,1.0,0.2,"highpass",2400,0,D); for(let i=0;i<6;i++) _tone(t+i*0.16,"square",880,880,0.05,0.06,D); return 1.0; }),
  fortCrash:     _fsx(4, 200, (t,D)=>{ _noise(t,0.4,0.6,"lowpass",1400,0,D); _tone(t,"sine",90,30,0.5,0.6,D); _noise(t,0.2,0.3,"bandpass",3000,2,D); return 0.5; }),
  fortSlam:      _fsx(3, 150, (t,D)=>{ _tone(t,"sine",100,36,0.3,0.55,D); _noise(t,0.2,0.35,"lowpass",800,0,D); return 0.3; }),
  fortRip:       _fsx(2, 150, (t,D)=>{ _noise(t,0.18,0.3,"bandpass",900,1,D); _tone(t,"sawtooth",200,80,0.15,0.08,D); return 0.2; }),
  fortAxe:       _fsx(3, 150, (t,D)=>{ _noise(t,0.12,0.25,"bandpass",3500,2,D); _tone(t,"sine",130,50,0.25,0.45,D); return 0.25; }),
  fortRepair:    _fsx(2, 500, (t,D)=>{ for(let i=0;i<8;i++) _tone(t+i*0.08,"square",1200+(i%2)*400,1200+(i%2)*400,0.04,0.04,D); _noise(t,0.7,0.06,"bandpass",5000,6,D); return 0.7; }),
  fortBolt:      _fsx(1, 120, (t,D)=>{ _tone(t,"square",700,300,0.08,0.06,D); _noise(t,0.05,0.1,"highpass",3000,0,D); return 0.08; }),
  fortForgeBang: _fsx(5, 500, (t,D)=>{ _tone(t,"sine",70,30,0.5,0.8,D); _noise(t,0.3,0.6,"lowpass",1000,0,D); _noise(t,0.6,0.1,"bandpass",2400,6,D); _duck(0.4,500); return 0.6; }),
  fortMetal:     _fsx(4, 400, (t,D)=>{ [310,470,620,880].forEach((f,i)=>_tone(t+i*0.01,"triangle",f,f*0.97,1.6,0.08,D)); _noise(t,0.2,0.3,"bandpass",2400,2,D); return 1.6; }),
  fortOverload:  _fsx(5, 800, (t,D)=>{ _tone(t,"sawtooth",60,240,1.2,0.22,D,0.1); _noise(t,1.2,0.35,"highpass",1500,0,D); _duck(0.4,1200); return 1.2; }),
  fortFireBreath:_fsx(4, 400, (t,D)=>{ _noise(t,1.4,0.45,"lowpass",1200,0,D); _noise(t,1.4,0.15,"bandpass",300,1,D); return 1.4; }),
  fortBomb:      _fsx(3, 90,  (t,D)=>{ _noise(t,0.35,0.4,"lowpass",900,0,D); _tone(t,"sine",90,34,0.3,0.45,D); return 0.35; }),
  fortBell:      _fsx(4, 800, (t,D)=>{ [196,392,523,587].forEach((f,i)=>_tone(t,"sine",f,f,2.2 - i*0.3,0.14/(i+1),D,0.005)); return 2.2; }),
  fortSword:     _fsx(2, 120, (t,D)=>{ _noise(t,0.14,0.28,"bandpass",4000,2,D); _tone(t,"triangle",1400,600,0.12,0.06,D); _tone(t,"sine",120,50,0.2,0.3,D); return 0.2; }),
  fortShieldBash:_fsx(3, 150, (t,D)=>{ _tone(t,"square",160,80,0.15,0.16,D); _noise(t,0.2,0.4,"lowpass",1100,0,D); return 0.2; }),
  fortCharge:    _fsx(3, 300, (t,D)=>{ for(let i=0;i<5;i++) _noise(t+i*0.12,0.06,0.25,"lowpass",500,0,D); _tone(t,"sawtooth",90,140,0.6,0.1,D); return 0.6; }),
  fortExecWarn:  _fsx(5, 900, (t,D)=>{ _tone(t,"sawtooth",110,55,1.4,0.18,D,0.3); [220,233].forEach(f=>_tone(t,"triangle",f,f,1.4,0.08,D,0.3)); _duck(0.4,1500); return 1.4; }),
  fortExec:      _fsx(5, 600, (t,D)=>{ _noise(t,0.8,0.7,"lowpass",1300,0,D); _tone(t,"sine",70,24,1.0,0.8,D); _noise(t,0.2,0.4,"bandpass",3500,2,D); _duck(0.3,900); return 1.0; }),
  fortPhase2:    _fsx(5, 1500,(t,D)=>{ for(let i=0;i<20;i++) _noise(t+i*0.1,0.04,0.14,"bandpass",900+(i%4)*250,6,D); _noise(t,2.0,0.3,"highpass",2000,0,D); _tone(t,"sine",50,70,2.0,0.3,D,0.4); _duck(0.35,2200); return 2.0; }),
  fortPhase3:    _fsx(5, 1500,(t,D)=>{ _tone(t,"sawtooth",55,110,1.6,0.25,D,0.2); for(let i=0;i<10;i++) _noise(t+i*0.08,0.04,0.2,"bandpass",3000,8,D); _noise(t,1.6,0.3,"lowpass",700,0,D); _duck(0.3,1800); return 1.6; })
});

/* ---------------- bots: a dónde ir si el compañero quedó del otro lado de un puente ---------------- */
// El punto de SU tramo (componente) más cercano al objetivo: el bot espera en el borde a que el
// mecanismo vuelva a unirlos, en vez de caminar contra la lava.
function fortBotRegroup(h, t){
  const c = fortCompAt(h.x, h.y);
  let best = null, bd = Infinity;
  for(const s of fortShapes){
    if(s.comp!==c) continue;
    const L = _fortLocal(s, t.x, t.y), hw = Math.max(1, s.hw-26), hh = Math.max(1, s.hh-26);
    const lx = Math.max(-hw, Math.min(hw, L[0])), ly = Math.max(-hh, Math.min(hh, L[1]));
    const px = s.cx + lx*s.c - ly*s.s, py = s.cy + lx*s.s + ly*s.c, d = Math.hypot(px-t.x, py-t.y);
    if(d < bd){ bd = d; best = {x:px, y:py}; }
  }
  return best;
}

ARENA_DEFS.fortaleza = {
  key:"fortaleza",
  subBossLevels:[],                       // el Dragón de la Forja lo maneja fortDragonDirector
  navBounds:{x0:FORT_MAP.bounds.x0, y0:FORT_MAP.bounds.y0, x1:FORT_MAP.bounds.x1, y1:FORT_MAP.bounds.y1},
  runStart:fortRunStart,
  guestStart:()=>{ fortS = null; fortShapes = []; fortGeomDirty = true; arenaTitleCardHide(); },
  beginLevel:fortBeginLevel,
  update:fortUpdate,
  guestUpdate:fortGuestUpdate,
  clamp:fortClamp,
  inside:(x, y, m)=>fortS ? fortWalkable(x, y, m||0) : true,
  navBlocked:fortNavBlocked,
  spawnPool:fortSpawnPool,
  spawnIntervalMult:()=>1.4,             // menos enemigos por minuto, pero más duros (élites, subélites)
  placeSpawn:(e, atBoss, champ)=>{ fortInitEnemy(e); fortPlaceSpawn(e, atBoss); },
  holdLevel:fortHoldLevel,
  enemyTarget:fortEnemyTarget,
  enemyAI:Object.assign({dragon_forja:fortAIDragon, caballero:fortAIKnight}, FORT_ENEMY_AI),
  enemyKilled:fortEnemyKilled,
  afterEnemies:()=>{ for(const e of enemies){ if(e.alive && !e.flying && e.rank!=="jefe" && !e.isDuelLocked) fortClamp(e); } },
  botDanger:fortBotDanger,
  heroReachable:(a, b)=>!fortS || !b || b.flying || fortReachable(a, b),
  botRegroup:fortBotRegroup,
  buildDecor:fortBuildDecor,
  drawWorld:fortDrawWorld,
  pushTall:fortPushTall,
  drawTall:fortDrawTall,
  drawTop:fortDrawTop,
  drawScreen:fortDrawScreen,
  drawProjectile:fortDrawProjectile,
  netState:fortNetState,
  applyNetState:fortApplyNetState
};
