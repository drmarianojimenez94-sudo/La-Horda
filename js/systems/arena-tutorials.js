"use strict";
/* ============================================================
   js/systems/arena-tutorials.js
   MICRO-TUTORIALES DE ARENA (Arena Bible §7). El tutorial inicial enseña el JUEGO; cada arena enseña
   SUS REGLAS la primera vez: BRIEFING → ENTRADA → MICRO-TUTORIAL JUGABLE → PARTIDA REAL.
   Los pasos y textos viven en la ficha (ARENA_BLUEPRINTS[a].tutorial.steps); acá vive el DRIVER que
   prepara la situación y detecta que el jugador lo hizo (ENSEÑAR → HACER → CONFIRMAR → CONTINUAR).
   Habla con la voz del Hechicero (tutSay / tutDone, js/systems/tutorial.js).
   Estado persistido: save.tut.arena[clave] = 1 (no se repite). "Saltar": el botón del cuadro del Hechicero
   o simplemente jugar: cada paso tiene un tope de tiempo y nunca bloquea la partida.
   Multijugador: el anfitrión (o la partida sola) prepara la situación (p.ej. el núcleo de práctica); cada
   cliente sigue sus pasos con su propio héroe (los invitados ven el núcleo por la red).
   Arenas sin driver propio: sus conceptos ya los enseñan sus mecánicas con tutSay al aparecer
   (runas, emboscadas, frío, braseros, fisuras, sellos...); se marcan vistas al terminar la primera partida.
   ============================================================ */
const ARENA_TUT = {arena:null, step:-1, t:0, stepT:0, data:null, run:null};
const ARENA_TUT_STEP_MAX_MS = 30000; // nadie queda atascado en un paso
function _arenaTutFlags(){ const f = tutFlags(); if(!f.arena) f.arena = {}; return f.arena; }
function arenaTutorialSeen(a){ try{ return !!_arenaTutFlags()[a]; }catch(e){ return false; } }
function arenaTutorialMark(a){ _arenaTutFlags()[a] = 1; persist(); if(typeof telemetryEvent==="function") telemetryEvent("arena_tutorial_completed", {arena:a}); }
// Volver a verlo (Códice / panel táctico / lobby): borra la marca y la próxima entrada lo repite.
function arenaTutorialReplay(a){ delete _arenaTutFlags()[a]; persist(); }
function arenaTutSkip(){
  if(ARENA_TUT.arena===null) return;
  if(typeof telemetryEvent==="function") telemetryEvent("tutorial_skipped", {arena:ARENA_TUT.arena, step:String(ARENA_TUT.step)});
  arenaTutorialMark(ARENA_TUT.arena); _arenaTutEnd();
}
function _arenaTutEnd(){
  const D = ARENA_TUT_DRIVERS[ARENA_TUT.arena];
  if(D && D.end) try{ D.end(ARENA_TUT.data); }catch(e){}
  ARENA_TUT.arena = null; ARENA_TUT.step = -1; ARENA_TUT.data = null;
}
const ARENA_TUT_DRIVERS = {
  micelial:{
    // Un núcleo de práctica cerca (etapa 2: ya tiene territorio que frena) y una pausa corta de la horda.
    start(){
      const host = !(typeof netIsGuest==="function" && netIsGuest());
      const d = {nuc:null, saw:0, slowed:0, killed:false, recedeT:0};
      if(host && typeof micSpawnNucleo==="function" && micS){
        const p = micPointNear(player.x, player.y, 280, 360, 80);
        const e = micSpawnNucleo(p.x, p.y, 2);
        e._tut = 1; e.nuc.t = -1e9; // no madura mientras dura la lección (no escupe colonia)
        e.maxHp = e.hp = Math.max(60, Math.round(e.maxHp*0.45));
        d.nuc = e;
        if(typeof spawnTimer!=="undefined") spawnTimer = Math.max(spawnTimer, 9000); // respiro para leer
      }
      return d;
    },
    nucleus(d){ if(d.nuc && d.nuc.alive) return d.nuc; const n = (typeof micNucleos==="function") ? micNucleos() : []; return n.length ? n.reduce((a,b)=>Math.hypot(a.x-player.x,a.y-player.y) < Math.hypot(b.x-player.x,b.y-player.y) ? a : b) : null; },
    check(id, d, dt){
      const n = this.nucleus(d);
      if(!n && (id==="colony" || id==="spores")) return true; // el núcleo ya no está (fin de nivel, red): no trabar la lección
      if(id==="colony"){
        if(n && Math.hypot(n.x-player.x, n.y-player.y) < (n.nuc ? n.nuc.rr : 150) + 320) d.saw += dt;
        return d.saw > 2500;
      }
      if(id==="spores"){
        const inside = n && n.nuc && Math.hypot(n.x-player.x, n.y-player.y) < n.nuc.rr;
        if(inside && (player.slowAmt||0) > 0) d.slowed += dt;
        return d.slowed > 700;
      }
      if(id==="nest"){
        if(d.nuc && !d.nuc.alive) d.killed = true;
        if(!d.nuc && !n) d.killed = true; // invitado: no hay núcleo propio a la vista
        return d.killed;
      }
      if(id==="recede"){ d.recedeT += dt; return d.recedeT > 2600; }
      return true;
    },
    // marca en el mundo: flecha al núcleo mientras la lección lo pide
    target(id, d){ return (id==="colony" || id==="spores" || id==="nest") ? this.nucleus(d) : null; },
    end(d){ if(d && d.nuc && d.nuc.alive){ d.nuc.nuc.t = 0; } } // si quedó vivo, vuelve a crecer normal
  }
};
function arenaTutTick(dt){
  if(state!=="playing" || !player || !player.alive) return;
  if(typeof divinaMode!=="undefined" && divinaMode) return;
  if(typeof ALPHA_TRAINING!=="undefined" && ALPHA_TRAINING.active) return;
  if(typeof tutSeen==="function" && !tutSeen("basics")) return; // primero lo general
  const a = currentArena;
  if(ARENA_TUT.run !== runStats){ ARENA_TUT.run = runStats; ARENA_TUT.arena = null; ARENA_TUT.step = -1; ARENA_TUT.t = 0; }
  const B = typeof ARENA_BLUEPRINTS!=="undefined" && ARENA_BLUEPRINTS[a];
  if(!B || arenaTutorialSeen(a)) return;
  const D = ARENA_TUT_DRIVERS[a], steps = (B.tutorial && B.tutorial.steps) || [];
  if(!D || !steps.length) return; // arenas sin driver: ver cabecera
  ARENA_TUT.t += dt;
  if(ARENA_TUT.arena===null){
    if(ARENA_TUT.t < 1800) return; // dejar ver la entrada y el cartel de la arena
    ARENA_TUT.arena = a; ARENA_TUT.step = 0; ARENA_TUT.stepT = 0; ARENA_TUT.data = D.start() || {};
    if(typeof telemetryEvent==="function") telemetryEvent("arena_tutorial_started", {arena:a});
  }
  const s = steps[ARENA_TUT.step]; if(!s){ arenaTutorialMark(a); _arenaTutEnd(); return; }
  const key = "atut_" + a + "_" + s.id;
  if(TUT.key !== key && !tutSeen(key)) tutSay(key, s.say, s.goal || null, ARENA_TUT_STEP_MAX_MS + 2000, true);
  ARENA_TUT.stepT += dt;
  const ok = D.check(s.id, ARENA_TUT.data, dt);
  if(ok || ARENA_TUT.stepT > ARENA_TUT_STEP_MAX_MS){
    if(!ok && typeof telemetryEvent==="function") telemetryEvent("tutorial_step_failed", {arena:a, step:s.id});
    tutDone(key);
    ARENA_TUT.step++; ARENA_TUT.stepT = 0;
    if(ARENA_TUT.step >= steps.length){ arenaTutorialMark(a); _arenaTutEnd(); }
  }
}
// Flecha en el mundo hacia el objetivo de la lección (lenguaje "objetivo": cian, ◎, late lento).
function drawArenaTutTarget(){
  if(ARENA_TUT.arena===null || !player) return;
  const D = ARENA_TUT_DRIVERS[ARENA_TUT.arena], B = ARENA_BLUEPRINTS[ARENA_TUT.arena];
  const s = B && B.tutorial.steps[ARENA_TUT.step]; if(!D || !s || !D.target) return;
  const t = D.target(s.id, ARENA_TUT.data); if(!t || !t.alive) return;
  const now = performance.now()/1000, pulse = 0.6 + 0.4*Math.sin(now*3);
  ctx.save();
  ctx.strokeStyle = `rgba(92,240,255,${0.55 + 0.35*pulse})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(t.x, t.y + 6, 46 + 8*pulse, 26 + 5*pulse, 0, 0, Math.PI*2); ctx.stroke();
  const dx = t.x - player.x, dy = t.y - player.y, l = Math.hypot(dx, dy);
  if(l > 160){
    const ux = dx/l, uy = dy/l, ax = player.x + ux*70, ay = player.y + uy*70 - 20;
    ctx.fillStyle = `rgba(92,240,255,${0.8})`; ctx.beginPath();
    ctx.moveTo(ax + ux*16, ay + uy*16); ctx.lineTo(ax - uy*9, ay + ux*9); ctx.lineTo(ax + uy*9, ay - ux*9); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// El núcleo de práctica es la lección del JUGADOR: los bots aliados no lo rompen por él.
(function guardPracticeNucleus(){
  if(typeof damageEnemy!=="function") return;
  const base = damageEnemy;
  damageEnemy = function(e, amount, opts){
    if(e && e._tut && ARENA_TUT.arena!==null){ const src = (opts && opts.src) || player; if(src && src.isBot) return; }
    return base.apply(this, arguments);
  };
})();
(function hookArenaTutorials(){
  if(typeof tutTick!=="function") return;
  // tiempo de JUEGO (runElapsedMs; en el invitado llega con la partida) y, si no avanza, el reloj real
  const base = tutTick; let last = performance.now(), lastRun = 0;
  tutTick = function(){
    const r = base.apply(this, arguments);
    const now = performance.now(), re = typeof runElapsedMs!=="undefined" ? runElapsedMs : 0;
    const dt = Math.min(100, re > lastRun && re - lastRun < 1000 ? re - lastRun : now - last);
    last = now; lastRun = re;
    try{ arenaTutTick(dt); }catch(e){ console.error("arena tutorial", e); }
    return r;
  };
  // sin driver: al terminar la primera partida en la arena, sus conceptos quedan como vistos
  if(typeof onBossDefeated==="function"){ const vb = onBossDefeated; onBossDefeated = function(){ const a = currentArena; const r = vb.apply(this, arguments); try{ if(ARENA_BLUEPRINTS[a] && !ARENA_TUT_DRIVERS[a]) arenaTutorialMark(a); }catch(e){} return r; }; }
})();
