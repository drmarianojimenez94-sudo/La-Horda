"use strict";
/* ============================================================
   js/core/run.js
   Ciclo de vida de una partida: arrancar (Horda o Arena Divina), derrota del jefe
   final y muerte del jugador.
   ============================================================ */

/* ============================================================
   TEMPORIZADORES DE PARTIDA
   Efectos con demora (una descarga extra, una nova que cae, la pantalla de victoria...) que
   antes usaban setTimeout: si abandonabas o reiniciabas en ese instante, podían disparar
   dentro de la partida SIGUIENTE. Ahora viven en esta lista, corren con el reloj del juego
   (se pausan con la pausa), y cada partida nueva los descarta todos.
   ============================================================ */
let runTimers = [];
let runEnding = false; // true desde que el jefe final cae (o el jugador muere) hasta salir de la partida
function runLater(ms, fn){ runTimers.push({t:ms, fn}); }
function clearRunTimers(){ runTimers.length = 0; }
function updateRunTimers(dt){
  if(!runTimers.length) return;
  const due = [];
  for(let i=runTimers.length-1;i>=0;i--){
    const r = runTimers[i]; r.t -= dt;
    if(r.t <= 0){ due.push(r.fn); runTimers.splice(i,1); }
  }
  for(let i=due.length-1;i>=0;i--){ try{ due[i](); }catch(e){ console.error("Error en efecto con demora:", e); } }
}

/* ============================================================
   START RUN
   ============================================================ */
// Arena Divina - Fase 1: reusa toda la infraestructura de startRun (aliados por rol, piso,
// decoración, cámara, controles) pero con divinaMode=true, que corta la generación de
// oleadas. Todavía no hay objetivo ni combate: es para poder caminar por el escenario nuevo
// y verlo de verdad, con tu equipo de 4, antes de construir el asedio encima.
function startDivinaExploration(){
  divinaMode = true;
  currentArena = "divina";
  divinaMinions = [];
  divinaStructProjectiles = [];
  divinaWaveTimer = 9000; // primera oleada recién a los 9s, para dar tiempo a acomodarse
  startRun(1);
  spawnDivinaEnemyTeam(); // después de startRun: necesita runStats ya inicializado
  // buildDivinaStructures también va después de startRun: necesita `heroes` ya poblado para
  // poder escalar la vida de las estructuras con partyLevelScale() (ver esa función).
  buildDivinaStructures();
}
// Bots que acompañan al jugador: uno de cada uno de los otros 3 roles (Tanque/Asesino/Mago/
// Soporte, el que no sea el tuyo), sorteando si hay más de un campeón en un mismo rol.
let lobbyAllies = null;
function pickLobbyAllies(mine){
  const ROLE_ORDER = ["tanque","asesino","mago","soporte"];
  const myRole = CLASSES[mine].roleCategory;
  const others = [];
  ROLE_ORDER.filter(r=>r!==myRole).forEach(role=>{
    const pool = Object.keys(CLASSES).filter(k=>k!==mine && CLASSES[k].roleCategory===role);
    if(pool.length) others.push(pool[(Math.random()*pool.length)|0]);
  });
  return others;
}
function lobbyAlliesValid(mine){
  return Array.isArray(lobbyAllies) && lobbyAllies.length>0 && lobbyAllies.every(k=>CLASSES[k] && k!==mine);
}
// Estado TEMPORAL de una partida que no vivía en los arrays de arriba: se limpia al empezar cada
// partida (reintentar / volver a jugar desde la sala) para que nada de la anterior se filtre:
// congelamiento de Axiom, cortes demorados y duelos de Musashi, efectos, pulsos del jefe.
function resetRunTransients(){
  axiomForceQuitFlash = 0; axiomFreezeTimer = 0; axiomFreezeCaster = null; axiomForceQuitPending = null;
  if(typeof canvas!=="undefined" && canvas && canvas.style) canvas.style.filter = "";
  musashiDuelSlotsUsed = 0; musashiAfterimages = []; musashiSecondCuts = [];
  activeAxiomVfx = []; bossDangerPulse = 0; champFx = [];
  boss = null; bossActive = false; activeChampion = null; midBossSpawned = false; levelClearing = 0;
}
function startRun(fromLevel){
  runLevel = fromLevel || 1;
  resetRunTransients();
  markRunStartProgress(selectedClass); // base para el castigo de derrota/abandono (solo lo ganado en esta partida)
  clearRunTimers();
  runEnding = false;
  kills = 0;
  runElapsedMs = 0;
  subjefesDefeated = 0; // Fase 3.1: un objeto por cada subjefe derrotado en esta partida
  arenaHazardTimer = 6000; // primer peligro ambiental recién a los 6s, para no golpear apenas arranca
  screenShake = 0;
  const hudArenaEl = document.getElementById("hud-arena");
  if(hudArenaEl) hudArenaEl.textContent = (ARENA_MODS[currentArena]||{}).label || "";
  runStats = freshRunStats();
  iceWalls.length = 0; bossStrikes.length = 0;
  enemies = []; projectiles = []; particles = []; embers = []; potions = []; fireWalls = []; traps = []; chainFX = []; sparkFX = []; asesinoFx = []; axiomZones = []; sylvaRainZones = [];
  acuaFish = []; acuaBubbles = []; acuaBubbleTimer = 0; acuaCurrent = {active:false, dx:0, dy:0, timer:0};
  vfxResetRun();
  resetFeedback();
  resetMythicPowers(); // suelo consagrado y otros efectos de objetos míticos
  resetEnemyRoles(); // avisos de roles enemigos vistos
  resetBreakables();
  hazardZones = []; arenaRuleTimer = 8000; resetArenaRule();
  bossHudHide();
  if(typeof arenaTitleCardHide==="function") arenaTitleCardHide();
  player = makePlayer();
  // Talentos de crítico (sección 4/32): a diferencia de dmg/cd/def/lifesteal -que se consultan
  // en caliente vía passiveSum en cada fórmula-, crítico vive en runStats (igual que los buffs
  // de nivel de la Horda), así que el bonus permanente del campeón se suma una sola vez acá,
  // al arrancar la partida.
  runStats.critChance += passiveSum(player.classKey, "crit_chance_add");
  runStats.critMult = (runStats.critMult||1.8) + passiveSum(player.classKey, "crit_mult_add");
  // Los otros tres campeones entran a la arena junto al jugador (bots aliados por ahora).
  // Se arma SIEMPRE por rol: un aliado de cada uno de los otros 3 roles (Tanque/Asesino/Mago/
  // Soporte, el que no sea el tuyo), sorteando al azar si en el futuro hay más de un campeón
  // dentro de un mismo rol (como pasa ahora entre Tanque y Segador Olvidado, ambos "tanque").
  allies = [];
  // El equipo lo arma la Sala (lobby) antes de entrar; si se arranca por otro camino (reintentar,
  // pruebas) y no hay un equipo válido, se sortea igual que siempre.
  const others = lobbyAlliesValid(selectedClass) ? lobbyAllies.slice() : pickLobbyAllies(selectedClass);
  others.forEach((k,i)=>{
    autoEquipBest(k); // el bot se pone lo mejor que tenga disponible de partidas anteriores
    const ang = (i/others.length)*Math.PI*2 + Math.PI/4;
    // B1: los campeones de amigos conectados entran como humanos (sin los ajustes de bot)
    allies.push(makeHero(k, !netIsHumanChamp(k), Math.cos(ang)*70, Math.sin(ang)*70));
  });
  heroes = [player, ...allies];
  for(const h of heroes) resetSetRunState(h);
  resetPerformanceRun();
  setupRunDifficulty();
  partyBuilt = false;
  if(floorPatterns[currentArena]){ floorPattern = floorPatterns[currentArena]; } else { buildFloorTile(); }
  if(!SPRITES.guerrero){ buildSprites(); }
  // B1: en cooperativo el escenario sale de una semilla compartida (idéntico para todos)
  if(netMatch) netWithSeed(netMatch.seed, ()=> buildArenaDecor()); else buildArenaDecor();
  for(let i=0;i<60;i++) embers.push(spawnEmber());
  updateAbilityButtons();
  if(typeof resetSkillLevelUI==="function") resetSkillLevelUI();
  if(arenaHas("runStart")) arenaHook("runStart"); // mapa propio: estado inicial y héroes en la entrada
  beginLevel();
  setState("playing");
}

function spawnEmber(){
  return {x:(Math.random()-0.5)*2000, y:(Math.random()-0.5)*2000, r:1+Math.random()*2, vy:-10-Math.random()*20, a:0.2+Math.random()*0.4, phase:Math.random()*Math.PI*2};
}

function onBossDefeated(){
  // Arena Infernal: el Golem de Cuerpos (forma 2) se rompe y nace el Demonio Mayor (forma 3)
  if(currentArena==="infernal" && hechGolemBroken()) return;
  // Arena de Hielo: jefe final en 2 fases. Al vaciar la vida del Mago de Hielo y Cristal
  // (fase 1) no termina la pelea todavía: se transforma en el Ángel Caído de Hielo (fase 2,
  // mucho más grande y agresivo). Recién al derrotar la fase 2 se gana la partida.
  if(currentArena==="hielo" && boss && boss.type==="mago_hielo_cristal"){
    const px = boss.x, py = boss.y;
    particles.push({x:px,y:py, life:900, ring:true, maxLife:900, maxR:140, color:"#bfe0f5"});
    for(let i=0;i<16;i++){
      const a = Math.random()*Math.PI*2;
      particles.push({x:px,y:py, vx:Math.cos(a)*90, vy:Math.sin(a)*90-20, life:600, color:"#c9e6ff"});
    }
    boss = spawnEnemy("angel_caido_hielo", true);
    boss.x = px; boss.y = py;
    scaleBossStats(boss, "angel_caido_hielo");
    boss.regenUsed = false; boss.regenTimer = 0; boss.bd = null;
    boss.bossPhase = 2;
    bossHudShow(boss);
    animTrigger(boss, "bossPhaseTransition", 1300);
    bossPhaseFeedback();
    showBanner("¡EL MAGO SE TRANSFORMA EN EL ÁNGEL CAÍDO DE HIELO!");
    return; // sigue la pelea de jefe, todavía no termina la partida
  }
  // Ruinas del Bosque: "Resurrección Eterna". La primera vez que el Jinete Sin Cabeza llega a
  // 0 de vida no muere: renace con la vida al máximo y +30% de daño hecho Y recibido (una
  // fase de furia más letal, pero también más frágil). Recién la segunda "muerte" termina la
  // pelea de verdad.
  if(currentArena==="bosque" && boss && boss.type==="jinete_sin_cabeza" && !boss.resurrected){
    boss.alive = true;
    boss.resurrected = true;
    boss.hp = boss.maxHp;
    boss.dmg = Math.round(boss.dmg*1.3);
    boss.dmgTakenMult = 1.3;
    boss.xp = 340; boss.gold = 160; // recién la muerte final da la recompensa real
    particles.push({x:boss.x,y:boss.y, life:900, ring:true, maxLife:900, maxR:150, color:"#ffd76a"});
    for(let i=0;i<18;i++){
      const a = Math.random()*Math.PI*2;
      particles.push({x:boss.x,y:boss.y, vx:Math.cos(a)*100, vy:Math.sin(a)*100-24, life:650, color:Math.random()<0.5?"#ffd76a":"#ff6a3d"});
    }
    animTrigger(boss, "bossPhaseTransition", 1300);
    bossPhaseFeedback();
    showBanner("¡RESURRECCIÓN ETERNA! EL JINETE RENACE MÁS FURIOSO");
    return; // sigue la pelea de jefe, todavía no termina la partida
  }
  // Arena Acuática: el Leviatán tiene 3 fases (mismo criterio que la Resurrección Eterna del
  // Jinete -no muere de verdad hasta la tercera vez-, en vez de transformarse en otra criatura
  // como el Mago de Hielo). Cada fase lo vuelve más agresivo; en la fase 3 además se oscurece
  // el escenario y aumentan las partículas (ver drawArena/render), pero los ataques siguen
  // siendo siempre telegrafiados -la dificultad sube por velocidad/cantidad, nunca por golpes
  // imposibles de leer-.
  if(currentArena==="acuatica" && boss && boss.type==="leviatan" && (boss.acuaticaPhase||1) < 3){
    boss.alive = true;
    boss.acuaticaPhase = (boss.acuaticaPhase||1) + 1;
    boss.hp = boss.maxHp;
    boss.dmg = Math.round(boss.dmg*1.22);
    boss.speed = Math.round(boss.speed*1.15);
    particles.push({x:boss.x,y:boss.y, life:900, ring:true, maxLife:900, maxR:160, color:"#4ac8e0"});
    for(let i=0;i<20;i++){
      const a = Math.random()*Math.PI*2;
      particles.push({x:boss.x,y:boss.y, vx:Math.cos(a)*100, vy:Math.sin(a)*100-20, life:700, color:"#7fe0f0"});
    }
    animTrigger(boss, "bossPhaseTransition", 1300);
    vfxSprite("fxVortex", 0, boss.x, boss.y+20, 170, 1300, boss, 0.3, false, 0.6);
    bossPhaseFeedback();
    showBanner(boss.acuaticaPhase===2 ? "¡EL LEVIATÁN SE ENFURECE!" : "¡EL LEVIATÁN DESATA TODO SU PODER!");
    return; // sigue la pelea de jefe, todavía no termina la partida
  }
  // Arenas con secuencia de muerte propia (El Reino Micelial): la arena termina la victoria
  // más tarde llamando a finishBossVictory().
  if(arenaHas("bossDefeated") && arenaHook("bossDefeated", boss)) return;
  bossActive = false;
  if(typeof setMusicMode==="function") setMusicMode("victory");
  bossDeathFeedback();
  showBanner("¡"+String(boss.name||"EL JEFE").toUpperCase()+" HA CAÍDO!");
  finishBossVictory();
}
// Cierre de la victoria (arena superada, desbloqueos, pantalla final). Lo llama onBossDefeated o,
// si la arena tiene su propia secuencia de muerte del jefe, la arena cuando esa secuencia termina.
function finishBossVictory(){
  bossActive = false;
  if(typeof setMusicMode==="function") setMusicMode("victory");
  grantGold(80);
  // Arena Divina se desbloquea al completar las 4 arenas normales (no solo la Infernal) —
  // save.arenasCleared trackea cada una de verdad y persiste.
  save.arenasCleared = save.arenasCleared || {bosque:false, acuatica:false, fortaleza:false, micelial:false, hielo:false, laberinto:false, infernal:false};
  save.arenasCleared[currentArena] = true;
  if(ARENA_ORDER.every(a=>save.arenasCleared[a]) && !save.divineArenaUnlocked){
    save.divineArenaUnlocked = true;
  }
  persist();
  runEnding = true;
  runLater(900, ()=>{ if(state==="playing") showVictoryScreen(); });
}

function onPlayerDeath(){
  player.alive = false;
  // B1: en cooperativo caer no termina la partida mientras quede algún humano en pie (te
  // pueden revivir); la derrota la decide netHostCheckDefeat.
  if(netIsHost()){ showBanner(`${player.netName||player.cls.name} ha caído`); return; }
  if(runEnding) return; // la victoria ya estaba en camino: no se pisa con una derrota
  runEnding = true;
  runLater(650, ()=>{ if(state==="playing") showGameOverScreen(); });
}
