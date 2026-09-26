"use strict";
/* ============================================================
   js/systems/tutorial.js
   TUTORIAL JUGABLE — la voz del Hechicero.

   No hay pantallas de tutorial: el Hechicero habla (un cuadro chico arriba, sin bloquear nada)
   cuando hace falta y cada concepto se enseña UNA vez, jugando. Lo aprendido se guarda en
   save.tut[concepto] (persistente): no se repite en la próxima partida.
   - Básicos (la primera partida, en orden): moverse -> atacar -> habilidad.
   - Combate, la primera vez que aparece cada cosa: recarga, daño recibido, energía, enemigos
     de más rango, jefes y sus avisos, refuerzo al subir de nivel, mejorar una habilidad.
   - Conceptos que aparecen cuando pasan: revivir (el primer caído), runas y emboscadas (Ruinas),
     fisuras (Infernal), frío y braseros (Gélida)... Las arenas llaman a tutSay().
   Cada cliente tiene el suyo (en cooperativo, cada jugador ve sus propios consejos).
   El Hechicero NO revela nada de la historia: es un guía que sabe más de lo que dice.
   Retrato: provisorio (sin arte todavía; ver LA_HORDA_MISSING_ASSETS.md).
   ============================================================ */
const TUT = { key:null, until:0, goal:null, basicsStep:0, moved:0, lx:null, ly:null, k0:0, r0:0, reviveAt:0 };
function tutFlags(){ if(!save.tut) save.tut = {}; return save.tut; }
function tutSeen(key){ return !!tutFlags()[key]; }
function tutMark(key){ if(!tutSeen(key)){ tutFlags()[key] = 1; persist(); } }
// Muestra una línea del Hechicero (si ese concepto no se enseñó todavía). `goal` = el objetivo
// concreto ("Mantené ✚..."). `ms` = cuánto queda si nadie lo cumple (después se da por visto).
// `urgent` = pasa por encima de un consejo que se esté mostrando (p.ej. revivir a un caído).
function tutSay(key, text, goal, ms, urgent){
  if(tutSeen(key) || (!urgent && TUT.key && TUT.key!==key && performance.now() < TUT.until - 1500)) return false;
  if(urgent && TUT.key && TUT.key!==key && !TUT.key.startsWith("b_")) tutMark(TUT.key); // el que se tapa se da por visto
  const el = document.getElementById("tut-panel"); if(!el) return false;
  el.querySelector(".tut-text").textContent = text;
  const g = el.querySelector(".tut-goal"); g.textContent = goal ? "▶ " + goal : ""; g.classList.remove("done");
  el.classList.remove("hidden", "show"); void el.offsetWidth; el.classList.add("show");
  TUT.key = key; TUT.goal = goal || null; TUT.until = performance.now() + (ms || 9000);
  return true;
}
// El jugador hizo lo que se pedía: tilde, se guarda y se va.
function tutDone(key){
  tutMark(key);
  if(TUT.key!==key) return;
  const el = document.getElementById("tut-panel"); if(!el) return;
  const g = el.querySelector(".tut-goal"); if(TUT.goal){ g.textContent = "✓ " + TUT.goal; g.classList.add("done"); }
  TUT.until = Math.min(TUT.until, performance.now() + 1300);
}
function tutHide(){
  const el = document.getElementById("tut-panel");
  if(el){ el.classList.remove("show"); el.classList.add("hidden"); }
  if(TUT.key && !TUT.goal) tutMark(TUT.key); // los consejos sin objetivo se dan por vistos al mostrarse
  TUT.key = null; TUT.goal = null;
}
function tutReset(){ TUT.basicsStep = 0; TUT.moved = 0; TUT.lx = null; TUT.k0 = 0; TUT.r0 = 0; tutHide(); }
// Cada cuadro desde updateHUD (anfitrión e invitado).
function tutTick(){
  if(state!=="playing" || !player){ if(TUT.key) tutHide(); return; }
  if(TUT.run !== runStats){ TUT.run = runStats; tutReset(); } // partida nueva
  const now = performance.now();
  if(TUT.key && now > TUT.until){
    // un objetivo básico que nadie cumplió queda pendiente (vuelve a aparecer), el resto se da por visto
    if(!TUT.key.startsWith("b_")) tutMark(TUT.key);
    tutHide();
  }
  const st = player.stats || {};
  // ---- básicos, en orden, en la primera partida ----
  if(!tutSeen("basics")){
    if(TUT.lx===null){ TUT.lx = player.x; TUT.ly = player.y; TUT.k0 = st.kills||0; }
    TUT.moved += Math.hypot(player.x-TUT.lx, player.y-TUT.ly); TUT.lx = player.x; TUT.ly = player.y;
    if(!tutSeen("b_move")){
      if(!TUT.key) tutSay("b_move", "Ah… otro que despierta. Caminá. Estas piedras recuerdan los pasos de todos.", "Movete con el joystick", 14000);
      if(TUT.moved > 260) tutDone("b_move");
    } else if(!tutSeen("b_attack")){
      if(!TUT.key) tutSay("b_attack", "Ellos también despertaron. No preguntes por qué: defendete.", "Mantené Ataque para pelear", 16000);
      if((st.kills||0) > TUT.k0) tutDone("b_attack");
    } else if(!tutSeen("b_skill")){
      if(!TUT.key) tutSay("b_skill", "Tu cuerpo guarda más que acero. Usalo.", "Tocá una habilidad (mantené y arrastrá para apuntar)", 16000);
      if(player.cds && player.cds.some(c=>c>0)) tutDone("b_skill");
    } else {
      tutMark("basics");
      tutSay("b_end", "Bien. Seguí. Todavía no es hora de que sepas lo que sé.", null, 5000);
    }
  }
  // ---- conceptos de combate, cuando aparecen por primera vez (después de los básicos) ----
  if(tutSeen("basics") && !TUT.key){
    const near = (r)=>enemies.some(e=>e.alive && (Array.isArray(r) ? r.includes(e.rank) : e.rank===r) && Math.hypot(e.x-player.x, e.y-player.y) < 520);
    if(!tutSeen("cooldown")) tutSay("cooldown", "Todo poder se recarga. Mirá cómo se llena el botón antes de volver a usarlo.", null, 6000);
    else if(!tutSeen("hurt") && player.alive && player.hp < player.maxHp*0.5) tutSay("hurt", "Te están lastimando. Alejate de la horda… o buscá una poción roja.", null, 7000);
    else if(!tutSeen("energy") && player.energy < player.maxEnergy*0.2) tutSay("energy", "Sin energía no hay habilidades. Vuelve sola… o con las pociones azules.", null, 7000);
    else if(!tutSeen("elite") && near(["elite","subelite"])) tutSay("elite", "No todos son iguales. Los que brillan distinto valen más… y pegan más.", null, 7000);
    else if(!tutSeen("boss") && near(["jefe","subjefe"])) tutSay("boss", "Los grandes avisan antes de golpear. Si el suelo se marca, no estés ahí.", null, 8000);
    else if(!tutSeen("levelup") && runLevel >= 2) tutSay("levelup", "Cada nivel superado te deja elegir un refuerzo para esta partida. Elegí lo que te falta.", null, 7000);
    else if(!tutSeen("skillup") && document.querySelector(".skill-plus:not(.hidden)")) tutSay("skillup", "Aprendiste algo. Hacé más fuerte una habilidad.", "Tocá el + junto a una habilidad", 12000);
  }
  if(TUT.key==="skillup" && !document.querySelector(".skill-plus:not(.hidden)")) tutDone("skillup");
  // ---- revivir: la primera vez que cae un compañero ----
  if(!tutSeen("revive") && TUT.key!=="revive" && player.alive && heroes.some(h=>h!==player && !h.alive))
    tutSay("revive", "Nadie cae del todo mientras alguien lo sostenga.", "Mantené ✚ junto al caído para revivirlo", 12000, true);
  if(TUT.key==="revive" && (st.revives||0) > 0) tutDone("revive");
}
