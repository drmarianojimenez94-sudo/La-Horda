"use strict";
/* ============================================================
   js/arenas/micelial/mic-arena.js
   Registro de EL REINO MICELIAL en ARENA_DEFS (los ganchos que el motor llama) + arte real de
   los enemigos (atlas recortados de las hojas oficiales), guías de jefe y sonidos orgánicos.
   Datos: mic-data.js · Mapa y etapas: mic-map.js · Ecosistema/núcleos: mic-ecosystem.js
   Enemigos: mic-enemies.js · Subjefe: mic-subboss.js · Madre: mic-mother.js · Dibujo: mic-render.js
   ============================================================ */
Object.assign(VFX_PAL, {
  micSpore:["#d070ff","#7fe8ff","#ffb0f0","210,120,255"], micRoot:["#5a2a3a","#b04ad0","#2a1420","190,80,220"],
  micEmber:["#ff9a4a","#ffd07a","#ff5a9a","255,150,90"], micBlood:["#ff3a6a","#9a1030","#ffb0c0","255,60,110"],
  micHal:["#6af0ff","#ff6ae0","#b88aff","140,220,255"], micDust:["#8a8290","#5a5460","#c0b8c8","160,150,170"]
});
ENEMY_PROJ_COLOR.peregrino = "#9cff5a"; ENEMY_PROJ_COLOR.chaman = "#9cff5a";
// Perfil de animación (AnimFX): peso, embestida y cómo mueren
Object.assign(ANIM_PROFILES, {
  infectado:{speed:1.0, weight:1.0, lunge:10, material:"micSpore", death:"frames"},
  acechador:{speed:1.4, weight:0.7, lunge:14, material:"micSpore", death:"frames"},
  hinchado:{speed:0.6, weight:2.2, amp:0.7, lunge:12, impact:1.9, material:"micEmber", death:"frames"},
  peregrino:{speed:0.9, basic:"ranged", material:"micRoot", death:"frames"},
  sabueso:{speed:1.6, weight:0.5, lunge:16, material:"micBlood", death:"frames"},
  chaman:{speed:0.9, basic:"cast", cast:1.4, material:"micSpore", death:"frames"},
  micelio:{speed:0.7, weight:2.4, amp:0.7, lunge:16, impact:2.2, material:"micRoot", death:"frames"},
  madre_espora:{speed:0.4, weight:3.0, amp:0.15, lunge:0, impact:2.6, material:"micSpore", death:"dissolve"},
  nucleo_micelial:{speed:0.4, weight:3.0, amp:0.3, lunge:0, material:"micSpore", death:"dissolve"},
  raiz_absorcion:{speed:0.4, weight:3.0, amp:0.3, lunge:0, material:"micRoot", death:"dissolve"}
});

/* ---------------- atlas reales (tools/art/micelial/build_micelial.py -> meta.json) ----------------
   hMul = alto dibujado / radio. Escala respecto de un campeón (x1.0 ≈ 65 u de alto):
   Infectado 1.05 · Acechador 0.9 · Hinchado 1.7 · Peregrino 1.15 · Sabueso 0.7 · Chamán 1.4 ·
   Micelio Primigenio 3.0 · La Madre Espora ≈ 8.6 (retrato por partes, mic-render.js) */
const MIC_ATLAS_META = {
  "infectado":{"w":190,"h":102,"cols":8,"refH":88,"anchor":0.9412,"sets":{"idle":[9,10],"walk":[11,4,12,4],"atk":[0,1],"burst":[3,2,4],"hit":[7,8],"death":[5,6]},"hMul":2.96},
  "acechador":{"w":218,"h":105,"cols":8,"refH":88,"anchor":0.9429,"sets":{"idle":[6,7],"walk":[11,12,13,12],"hide":[3],"leap":[8,9,10],"atk":[0,1],"hit":[4,5],"death":[5,2]},"hMul":2.86},
  "hinchado":{"w":224,"h":144,"cols":8,"refH":124,"anchor":0.9375,"sets":{"idle":[5,8],"walk":[8,5,9,5],"atk":[0,9],"prep":[6,7],"boom":[1],"hit":[3,4],"death":[4,2]},"hMul":3.24},
  "peregrino":{"w":214,"h":133,"cols":8,"refH":99,"anchor":0.9398,"sets":{"idle":[3,8],"walk":[7,8,9,8],"plant":[4,5],"atk":[5,6],"hit":[1,2],"death":[2,0]},"hMul":3.4},
  "sabueso":{"w":225,"h":105,"cols":8,"refH":82,"anchor":0.9429,"sets":{"idle":[3,4],"walk":[8,9,7,9],"run":[7,9,5,9],"atk":[0,7],"leap":[5,6],"hit":[2],"death":[2,1]},"hMul":2.55},
  "chaman":{"w":166,"h":205,"cols":8,"refH":163,"anchor":0.9415,"sets":{"idle":[5,6],"walk":[9,10,6,10],"channel":[2,7],"regen":[8],"atk":[0,1],"hit":[4],"death":[4,3]},"hMul":3.8},
  "micelio":{"w":192,"h":100,"cols":8,"refH":82,"anchor":0.93,"sets":{"idle":[16,17,18,19,20],"walk":[33,34,35,36,37],"turn":[30,31,32],"atk":[2,3,4,5,6],"lash":[21,22,23],"rain":[24,18],"germ":[10,11],"absorb":[0,1],"hit":[12,13,14,15],"roar":[25,26,27,28,29],"death":[7,8,9]},"hMul":2.79}

};
for(const k in MIC_ATLAS_META){
  enemyAtlasPackLoad(k, "assets/sprites/arenas/micelial/"+k+"/atlas.png", MIC_ATLAS_META[k]);
  ENEMY_ATLAS_PACK[k].hMul = MIC_ATLAS_META[k].hMul;
}

/* ---------------- guías de jefe (boss-hud.js) ---------------- */
ARENA_BOSS_TIPS.micelio = {epithet:"Los caídos, cosidos por raíces", tips:[
  "Latigazo de Raíz: líneas moradas en el piso. Salí de costado antes de que brote.",
  "Absorción: raíces brillantes lo unen a los cadáveres y lo curan. ¡Rompelas!",
  "Germinación: siembra un Núcleo. Destruilo antes de que madure."]};
ARENA_BOSS_TIPS.madre_espora = {epithet:"El Reino entero es su cuerpo", phases:[{hp:1},{hp:0.60},{hp:0.30}], tips:[
  "Colonia: raíces en círculos, esporas en abanico y latigazos en línea. Todo avisa antes.",
  "Floración (60%): se apaga la luz un instante; después, nubes y ALUCINACIONES (translúcidas: no hacen daño).",
  "Corazón (30%): el corazón queda expuesto. La infección avanza desde los bordes: quedate cerca de ella."]};

/* ---------------- sonidos orgánicos (sintetizados; se pueden reemplazar por grabaciones) ---------------- */
function _msx(p, gap, play){ return {p, gap, play}; }
Object.assign(ARENA_SFX, {
  micPulse:    _msx(2, 900, (t,D)=>{ _tone(t,"sine",52,40,0.35,0.35,D,0.02); _tone(t+0.22,"sine",48,36,0.3,0.22,D,0.02); return 0.6; }),
  micHeart:    _msx(4, 450, (t,D)=>{ _tone(t,"sine",60,34,0.28,0.75,D,0.01); _noise(t,0.12,0.2,"lowpass",180,0,D); _tone(t+0.24,"sine",54,30,0.3,0.55,D,0.01); _duck(0.6,300); return 0.6; }),
  micHeartStop:_msx(5, 2000,(t,D)=>{ _tone(t,"sine",58,26,1.4,0.85,D,0.01); _noise(t,0.6,0.25,"lowpass",220,0,D); _duck(0.05,3200); return 1.4; }),
  micSpore:    _msx(1, 160, (t,D)=>{ _noise(t,0.35,0.16,"bandpass",1400,1.5,D); _noise(t+0.05,0.3,0.08,"highpass",4000,0,D); return 0.35; }),
  micSporeBig: _msx(3, 500, (t,D)=>{ _noise(t,1.1,0.28,"bandpass",900,0.8,D); _noise(t,1.0,0.1,"highpass",3500,0,D); _tone(t,"sine",90,60,0.8,0.12,D,0.2); return 1.1; }),
  micRoot:     _msx(3, 180, (t,D)=>{ for(let i=0;i<5;i++) _noise(t+i*0.04,0.05,0.22,"bandpass",500+i*120,3,D); _tone(t,"sine",80,40,0.35,0.4,D); return 0.35; }),
  micRootWarn: _msx(3, 400, (t,D)=>{ _noise(t,0.9,0.14,"lowpass",260,0,D); for(let i=0;i<8;i++) _noise(t+i*0.1,0.04,0.1,"bandpass",700+i*60,4,D); return 0.9; }),
  micGrow:     _msx(2, 250, (t,D)=>{ _noise(t,0.45,0.18,"bandpass",600,2,D); _tone(t,"triangle",180,320,0.4,0.06,D,0.1); return 0.45; }),
  micGerm:     _msx(3, 600, (t,D)=>{ [330,415,494].forEach((f,i)=>_tone(t+i*0.08,"sine",f,f*1.5,0.7,0.07,D,0.05)); _noise(t,0.7,0.1,"bandpass",1200,2,D); return 0.8; }),
  micShaman:   _msx(2, 500, (t,D)=>{ [196,233,294].forEach((f,i)=>_tone(t+i*0.05,"triangle",f,f,0.9,0.06,D,0.2)); return 0.9; }),
  micBurrow:   _msx(2, 300, (t,D)=>{ _noise(t,0.4,0.25,"lowpass",400,0,D); return 0.4; }),
  micHiss:     _msx(3, 250, (t,D)=>{ _noise(t,0.6,0.22,"highpass",3200,0,D); _tone(t,"sawtooth",240,360,0.5,0.04,D,0.1); return 0.6; }),
  micLeap:     _msx(2, 150, (t,D)=>{ _noise(t,0.18,0.25,"bandpass",1100,1,D); return 0.2; }),
  micHowl:     _msx(2, 900, (t,D)=>{ _tone(t,"sawtooth",330,520,0.25,0.07,D,0.05); _tone(t+0.25,"sawtooth",520,300,0.5,0.06,D); _noise(t,0.7,0.06,"bandpass",1500,3,D); return 0.75; }),
  micSwell:    _msx(3, 500, (t,D)=>{ _tone(t,"sine",70,160,1.5,0.25,D,0.3); _noise(t,1.5,0.1,"lowpass",300,0,D); return 1.5; }),
  micBurst:    _msx(4, 200, (t,D)=>{ _noise(t,0.6,0.55,"lowpass",900,0,D); _tone(t,"sine",90,30,0.5,0.6,D); _noise(t,0.4,0.2,"bandpass",2000,1,D); _duck(0.5,400); return 0.6; }),
  micSlam:     _msx(3, 160, (t,D)=>{ _tone(t,"sine",90,34,0.35,0.6,D); _noise(t,0.25,0.35,"lowpass",700,0,D); return 0.35; }),
  micShot:     _msx(1, 110, (t,D)=>{ _noise(t,0.12,0.14,"bandpass",1700,2,D); _tone(t,"sine",520,260,0.12,0.05,D); return 0.12; }),
  micRumble:   _msx(4, 900, (t,D)=>{ _noise(t,1.8,0.35,"lowpass",140,0,D); _tone(t,"sine",38,30,1.8,0.35,D,0.3); _duck(0.5,1400); return 1.8; }),
  micCrack:    _msx(5, 900, (t,D)=>{ for(let i=0;i<9;i++) _noise(t+i*0.05,0.06,0.3,"bandpass",400+i*90,3,D); _tone(t,"sine",60,24,1.2,0.7,D); _duck(0.2,1200); return 1.2; }),
  micNucleoDie:_msx(3, 250, (t,D)=>{ _noise(t,0.5,0.3,"bandpass",700,1,D); _tone(t,"triangle",300,90,0.5,0.1,D); return 0.5; }),
  micCollapse: _msx(5, 1200,(t,D)=>{ _noise(t,2.2,0.5,"lowpass",300,0,D); _tone(t,"sine",50,20,2.2,0.6,D,0.1); for(let i=0;i<10;i++) _noise(t+i*0.15,0.05,0.15,"bandpass",500,4,D); _duck(0.25,2200); return 2.2; }),
  micDark:     _msx(5, 1200,(t,D)=>{ _tone(t,"sine",110,55,1.4,0.2,D,0.05); _noise(t,1.2,0.1,"lowpass",200,0,D); _duck(0.08,1800); return 1.4; }),
  micBloom:    _msx(4, 1200,(t,D)=>{ [262,330,392,494,587].forEach((f,i)=>_tone(t+i*0.07,"sine",f,f*1.01,1.6,0.06,D,0.1)); _noise(t,1.4,0.06,"highpass",5000,0,D); return 1.8; }),
  micOpen:     _msx(5, 1200,(t,D)=>{ _noise(t,1.2,0.4,"bandpass",300,0.7,D); _tone(t,"sawtooth",60,90,1.2,0.12,D,0.2); _tone(t+0.9,"sine",60,34,0.3,0.7,D,0.01); _duck(0.3,1500); return 1.4; }),
  micFinal:    _msx(5, 2000,(t,D)=>{ _noise(t,2.6,0.25,"bandpass",1100,0.6,D); [220,277,330].forEach((f,i)=>_tone(t+i*0.2,"sine",f,f*0.98,2.4,0.06,D,0.4)); return 2.6; }),
  micSilence:  _msx(5, 2500,(t,D)=>{ _duck(0.04, 2600); return 0.1; })
});

ARENA_DEFS.micelial = {
  key:"micelial",
  subBossLevels:[],                       // el Micelio Primigenio lo maneja micMicelioDirector
  navBounds:MIC_MAP.navBounds,
  runStart:micRunStart,
  guestStart:()=>{ micS = null; micRenderReset(); arenaTitleCardHide(); },
  beginLevel:micBeginLevel,
  update:micUpdate,
  guestUpdate:micGuestUpdate,
  clamp:micClamp,
  inside:(x, y, m)=>micInside(x, y, m||0),
  navBlocked:micNavBlocked,
  spawnPool:micSpawnPool,
  spawnIntervalMult:micSpawnIntervalMult,
  placeSpawn:(e, atBoss)=>micPlaceSpawn(e, atBoss),
  holdLevel:micHoldLevel,
  enemyAI:Object.assign({micelio:micAIMicelio, madre_espora:micAIMadre}, MIC_ENEMY_AI),
  enemyKilled:micEnemyKilled,
  afterEnemies:micAfterEnemies,
  bossDefeated:micBossDefeated,
  botDanger:micBotDanger,
  botTarget:micBotTarget,
  buildDecor:()=>{ lavaPools = []; floorDecor = []; braziers = []; wallBlocks = []; deadTrees = []; smokePuffs = [];
    labyrinthWalls = []; aidProps = []; aidDecals = []; aidSolids = []; aidLights = []; aidKelp = []; aidOuterBlobs = []; aidLavaLayer = null; },
  drawWorld:micDrawWorld,
  pushTall:micPushTall,
  drawTall:micDrawTall,
  drawTop:micDrawTop,
  drawScreen:micDrawScreen,
  drawProjectile:micDrawProjectile,
  drawEnemyBody:micDrawEnemyBody,
  camLift:micCamLift,
  netState:micNetState,
  applyNetState:micApplyNetState
};
