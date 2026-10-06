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
   Habla CLARO: qué es cada cosa, qué hacer y por qué (nada de acertijos). Parece un guía
   angelical; en la Arena Infernal se revela como el enemigo final (inf-hechicero.js).
   Retrato: el arte real del Hechicero Supremo (css/hud.css, .tut-face).
   ============================================================ */
const TUT = { key:null, until:0, goal:null, basicsStep:0, moved:0, lx:null, ly:null, k0:0, r0:0, reviveAt:0,
  ducked:false, duckUntil:0, duckSpent:0, lastTick:0, rect:null };
// El cuadro se AGACHA (se hace invisible) mientras te pegan o si el guardián le queda encima, y vuelve
// solo después, con el mismo texto y el tiempo que le quedaba (reseña #10: en el teléfono tapaba la
// pelea). Tope por línea: pasado TUT_DUCK_MAX_MS escondido se muestra igual, para no perderla nunca.
const TUT_DUCK_MS = 2200, TUT_DUCK_MAX_MS = 6000;
const TUT_NO_DUCK = {hurt:1, revive:1}; // consejos que hablan justo de eso: se ven aunque te estén pegando
function tutFlags(){ if(!save.tut) save.tut = {}; return save.tut; }
// Las claves que empiezan con "~" son líneas de una sola vez en ESTA partida (voces de la historia,
// js/systems/story.js): nunca se guardan como vistas.
function tutSeen(key){ return key.charAt(0)!=="~" && !!tutFlags()[key]; }
function tutMark(key){ if(key.charAt(0)!=="~" && !tutSeen(key)){ tutFlags()[key] = 1; persist(); } }
// Muestra una línea del Hechicero (si ese concepto no se enseñó todavía). `goal` = el objetivo
// concreto ("Mantené ✚..."). `ms` = cuánto queda si nadie lo cumple (después se da por visto).
// `urgent` = pasa por encima de un consejo que se esté mostrando (p.ej. revivir a un caído).
// `who` = quién habla, si no es el Hechicero: {name, face} (voces de la historia, story.js). El retrato
// cambia con data-face (css/story.css).
function tutSay(key, text, goal, ms, urgent, who){
  if(tutSeen(key) || (!urgent && TUT.key && TUT.key!==key && performance.now() < TUT.until - 1500)) return false;
  if(urgent && TUT.key && TUT.key!==key && !TUT.key.startsWith("b_")) tutMark(TUT.key); // el que se tapa se da por visto
  const el = document.getElementById("tut-panel"); if(!el) return false;
  el.querySelector(".tut-text").textContent = text;
  const wh = el.querySelector(".tut-who"); if(wh) wh.textContent = who && who.name ? who.name : "EL HECHICERO";
  el.dataset.face = who && who.face ? who.face : "hech";
  const g = el.querySelector(".tut-goal"); g.textContent = goal ? "▶ " + goal : ""; g.classList.remove("done");
  el.classList.remove("hidden", "show", "duck"); void el.offsetWidth; el.classList.add("show");
  TUT.key = key; TUT.goal = goal || null; TUT.until = performance.now() + (ms || 9000);
  TUT.ducked = false; TUT.duckSpent = 0; TUT.rect = _tutRect(el);
  return true;
}
function _tutRect(el){ try{ const r = el.getBoundingClientRect(); return r.width ? {l:r.left, t:r.top, r:r.right, b:r.bottom} : null; }catch(e){ return null; } }
// Lo llama registerPlayerHurt (feedback.js), en el anfitrión y en el invitado.
function tutDuck(){
  if(!TUT.key || TUT_NO_DUCK[TUT.key] || TUT.duckSpent >= TUT_DUCK_MAX_MS) return;
  TUT.duckUntil = performance.now() + TUT_DUCK_MS;
  if(!TUT.ducked){ TUT.ducked = true; const el = document.getElementById("tut-panel"); if(el) el.classList.add("duck"); }
}
// ¿El guardián (en pantalla) queda debajo del cuadro? (p.ej. con la cámara levantada por la Madre Espora)
function _tutOverHero(){
  const R = TUT.rect; if(!R || !player || typeof worldToScreen!=="function") return false;
  const cr = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : {left:0, top:0};
  const s = worldToScreen(player.x, player.y), hx = s.x + cr.left, hy = s.y + cr.top, head = 70*CAM_ZOOM;
  return hx > R.l - 24 && hx < R.r + 24 && hy + 8 > R.t && hy - head < R.b;
}
function _tutDuckTick(now){
  const dt = TUT.lastTick ? Math.min(250, now - TUT.lastTick) : 0; TUT.lastTick = now;
  if(!TUT.key) return;
  if(!TUT.ducked && TUT.duckSpent < TUT_DUCK_MAX_MS && !TUT_NO_DUCK[TUT.key] && _tutOverHero()){ TUT.duckUntil = now + 400; TUT.ducked = true; const el = document.getElementById("tut-panel"); if(el) el.classList.add("duck"); }
  if(!TUT.ducked) return;
  TUT.until += dt; TUT.duckSpent += dt; // escondido no corre su tiempo
  if(TUT.duckSpent >= TUT_DUCK_MAX_MS || (now > TUT.duckUntil && !_tutOverHero())){
    TUT.ducked = false; const el = document.getElementById("tut-panel"); if(el) el.classList.remove("duck");
  }
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
  if(el){ el.classList.remove("show", "duck"); el.classList.add("hidden"); }
  TUT.ducked = false; TUT.rect = null;
  if(TUT.key && !TUT.goal) tutMark(TUT.key); // los consejos sin objetivo se dan por vistos al mostrarse
  TUT.key = null; TUT.goal = null;
}
// objetivo de los básicos según con qué se juega (táctil / teclado / mando): js/core/input-desk.js
function _ctl(kind, fallback){ return (typeof ctlHint==="function" && ctlHint(kind)) || fallback; }
function tutReset(){ TUT.basicsStep = 0; TUT.moved = 0; TUT.lx = null; TUT.k0 = 0; TUT.r0 = 0; tutHide(); }
// Cada cuadro desde updateHUD (anfitrión e invitado).
function tutTick(){
  if(state!=="playing" || !player){ if(TUT.key) tutHide(); return; }
  if(TUT.run !== runStats){ TUT.run = runStats; tutReset(); } // partida nueva
  const now = performance.now();
  _tutDuckTick(now);
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
      if(!TUT.key) tutSay("b_move", "Bienvenido, guardián. Soy el Hechicero y te voy a guiar. Primero: movete.", _ctl("move", "Movete con el joystick"), 14000);
      if(TUT.moved > 260) tutDone("b_move");
    } else if(!tutSeen("b_attack")){
      if(!TUT.key) tutSay("b_attack", "¡Ahí viene la horda! Mantené apretado Ataque: tu guardián le pega solo al más cercano.", _ctl("attack", "Mantené Ataque para pelear"), 16000);
      if((st.kills||0) > TUT.k0) tutDone("b_attack");
    } else if(!tutSeen("b_skill")){
      if(!TUT.key) tutSay("b_skill", "Tus habilidades pegan mucho más fuerte que el ataque. Tocá una; si la mantenés, podés apuntarla.", _ctl("skill", "Tocá una habilidad (mantené y arrastrá para apuntar)"), 16000);
      if(player.cds && player.cds.some(c=>c>0)) tutDone("b_skill");
    } else {
      tutMark("basics");
      tutSay("b_end", "¡Eso es! Recordá: tu misión es SOBREVIVIR. Aguantá hasta que el reloj llegue a cero (lo ves arriba a la izquierda). Yo te aviso cuando aparezca algo nuevo.", null, 5000);
    }
  }
  // ---- conceptos de combate, cuando aparecen por primera vez (después de los básicos) ----
  if(tutSeen("basics") && !TUT.key){
    const near = (r)=>enemies.some(e=>e.alive && (Array.isArray(r) ? r.includes(e.rank) : e.rank===r) && Math.hypot(e.x-player.x, e.y-player.y) < 520);
    if(!tutSeen("cooldown")) tutSay("cooldown", "Cada habilidad necesita recargarse: esperá a que el botón se llene otra vez para volver a usarla.", null, 6000);
    else if(!tutSeen("hurt") && player.alive && player.hp < player.maxHp*0.5) tutSay("hurt", "¡Cuidado! La barra roja es tu vida y se está vaciando: si llega a cero, caés. Alejate de la horda y agarrá las pociones ROJAS. Si hace falta, usá la curación de emergencia (botón verde, 1 por nivel).", null, 7000);
    else if(!tutSeen("energy") && player.energy < player.maxEnergy*0.2) tutSay("energy", "Te quedaste sin energía (barra azul) y sin ella no hay habilidades. Se recarga sola, o más rápido con las pociones AZULES.", null, 7000);
    else if(!tutSeen("elite") && near(["elite","subelite"])) tutSay("elite", "Ese enemigo que brilla es un ÉLITE: tiene más vida y pega más fuerte, pero deja mejor botín.", null, 7000);
    else if(!tutSeen("boss") && near(["jefe","subjefe"])) tutSay("boss", "¡Un jefe! Antes de cada golpe fuerte el suelo se marca: salí de la marca antes de que se llene.", null, 8000);
    else if(!tutSeen("levelup") && runLevel >= 2) tutSay("levelup", "¡Sobreviviste al nivel! Se terminó el tiempo y los monstruos cayeron. Elegí una mejora para esta partida (vida, daño o velocidad) y empieza el siguiente nivel.", null, 7000);
    else if(!tutSeen("skillup") && document.querySelector(".skill-plus:not(.hidden)")) tutSay("skillup", "¡Subiste de nivel y tenés un punto! Tocá el + junto a una habilidad para hacerla más fuerte.", "Tocá el + junto a una habilidad", 12000);
  }
  if(TUT.key==="skillup" && !document.querySelector(".skill-plus:not(.hidden)")) tutDone("skillup");
  // ---- revivir: la primera vez que cae un compañero ----
  if(!duoEnabled() && !tutSeen("revive") && TUT.key!=="revive" && player.alive && heroes.some(h=>h!==player && !h.alive))
    tutSay("revive", "¡Cayó un compañero! Parate al lado y mantené el botón REVIVIR ✚ para levantarlo.", "Mantené ✚ junto al caído para revivirlo", 12000, true);
  if(TUT.key==="revive" && (st.revives||0) > 0) tutDone("revive");
  if(typeof storyTick==="function") storyTick(); // voces de la historia y Crónicas (js/systems/story.js)
}
// al rotar o cambiar el tamaño, el cuadro cambia de lugar: se vuelve a medir para saber si tapa al guardián
window.addEventListener("resize", ()=>{ setTimeout(()=>{ if(TUT.key){ const el = document.getElementById("tut-panel"); if(el) TUT.rect = _tutRect(el); } }, 60); });
