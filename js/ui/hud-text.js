"use strict";
/* ============================================================
   js/ui/hud-text.js
   JERARQUÍA Y ZONAS DEL TEXTO EN PARTIDA. Antes todo caía en el centro a la vez: cartel de arena, cartel
   central, "★ nombre" de cada élite, placas de élite, avisos de botín común y la voz del Hechicero
   (reseña §6.4 #10: "banners, voces, nombres de élite y números juntos en el centro").
   Zonas (celular acostado 844×390; tools/audit/center_text.js lo mide):
     ARRIBA CENTRO   anuncios de arena y de fase: #arena-title-card y #center-banner. NUNCA los dos a la
                     vez: el cartel central espera en una COLA mientras está el de arena (salvo urgente).
     ABAJO IZQUIERDA la voz (#tut-panel), pegada al joystick; en su lugar, la guía del jefe (#boss-intro).
     ARRIBA DERECHA  avisos apilados (#toast-stack): red, desafíos y el BOTÍN que se levanta (antes al
                     25 % de abajo, en el medio de la pelea).
     EN EL MUNDO     números de daño (agrupados por objetivo, effects.js), a lo sumo 3 textos flotantes
                     de palabras a la vez, y placas de élite: solo las 2 más cercanas, sin pisarse entre
                     ellas, ni al HUD ni a los carteles de arriba (elite-affixes.js → hudTextFreeRect).
   Cola del cartel central: prioridad 2 (urgente: jefe que despierta, caídas, fases) pasa adelante y se
   muestra ya; 1 (normal) espera su turno. Cada cartel se lee al menos HUDTXT_READ_MS; en la cola entran
   hasta 3 (los más viejos de menor prioridad se descartan) y los que esperan más de 6 s se tiran.
   ============================================================ */
const HUDTXT = {q:[], cur:"", until:0, run:null, tmo:0};
const HUDTXT_READ_MS = 1600, HUDTXT_MAX_Q = 3, HUDTXT_TTL_MS = 6000;
const HUDTXT_URGENT = /DESPIERTA|EMERGE|CA[IÍ]STE|CUIDADO|FASE|FURIA|ENFURECE|ÚLTIMA|ULTIMA|CORRÉ|REVIV/i;
function hudTextPrio(text){ return HUDTXT_URGENT.test(String(text||"")) ? 2 : 1; }
function _hudTitleOn(now){ return typeof _arenaTitleUntil!=="undefined" && now < _arenaTitleUntil; }
// Muestra ya el cartel central (lo que antes hacía showBanner entero).
function _hudBannerNow(text){
  const b = document.getElementById("center-banner"); if(!b) return;
  b.textContent = text;
  // con la guía del jefe en pantalla (arriba en escritorio) el cartel baja debajo de los pies del guardián
  const intro = document.getElementById("boss-intro");
  const title = _hudTitleOn(performance.now());
  b.classList.toggle("low", !!(intro && !intro.classList.contains("hidden")) && !title);
  // urgente con el cartel de arena arriba: justo debajo de ese cartel (no encima, ni en el medio de la pelea)
  const card = title ? document.getElementById("arena-title-card") : null, cr = card ? card.getBoundingClientRect() : null;
  // caído ("CAÍSTE", hud.js: hudStackLayout lo baja con .downed): si además está el cartel de arena, el
  // central va debajo de los dos (antes el top en línea le ganaba a .downed y se pisaban)
  const dn = document.getElementById("downed-overlay"), dr = dn && !dn.classList.contains("hidden") ? dn.getBoundingClientRect() : null;
  const below = Math.max(cr && cr.height ? cr.bottom : 0, cr && cr.height && dr && dr.height ? dr.bottom : 0);
  b.style.top = below ? Math.round(below + 20) + "px" : "";
  clearTimeout(HUDTXT.tmo); if(below) HUDTXT.tmo = setTimeout(()=>{ b.style.top = ""; }, 2300);
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
  HUDTXT.cur = String(text); HUDTXT.until = performance.now() + HUDTXT_READ_MS;
  _hudBlockAt = 0; // las placas del canvas se corren ya (no esperan la próxima medición)
}
function hudBannerPush(text, prio){
  const now = performance.now(), s = String(text);
  if(prio===undefined || prio===null) prio = hudTextPrio(s);
  if(HUDTXT.run !== (typeof runStats!=="undefined" ? runStats : null)){ HUDTXT.run = typeof runStats!=="undefined" ? runStats : null; HUDTXT.q.length = 0; }
  if(s===HUDTXT.cur && now < HUDTXT.until) return;           // el mismo cartel otra vez: ya se está leyendo
  if(HUDTXT.q.some(x=>x.text===s)) return;                     // ya está en la cola
  const busy = now < HUDTXT.until, title = _hudTitleOn(now);
  if(prio >= 2 || (!busy && !title)){ _hudBannerNow(s); return; }
  HUDTXT.q.push({text:s, prio, at:now});
  HUDTXT.q.sort((a,b)=> (b.prio - a.prio) || (a.at - b.at));
  while(HUDTXT.q.length > HUDTXT_MAX_Q) HUDTXT.q.pop();
}
// Entra el cartel grande de arena/jefe (arenaTitleCard): el cartel central que se estaba viendo se corta
// (no se pisan) y, si recién empezaba, vuelve a la cola para después.
function hudTextYield(){
  const b = document.getElementById("center-banner"); if(!b || !b.classList.contains("show")) return;
  const now = performance.now(), shownAt = HUDTXT.until - HUDTXT_READ_MS;
  b.classList.remove("show");
  if(HUDTXT.cur && now - shownAt < 900 && !HUDTXT.q.some(x=>x.text===HUDTXT.cur)) HUDTXT.q.unshift({text:HUDTXT.cur, prio:hudTextPrio(HUDTXT.cur), at:now});
  HUDTXT.until = 0;
}
// Cada cuadro (updateHUD, anfitrión e invitado): saca el siguiente de la cola cuando hay lugar.
function hudTextTick(){
  if(!HUDTXT.q.length) return;
  if(typeof state!=="undefined" && state!=="playing" && state!=="paused"){ HUDTXT.q.length = 0; return; }
  const now = performance.now();
  HUDTXT.q = HUDTXT.q.filter(x=>now - x.at <= HUDTXT_TTL_MS); // lo que esperó demasiado ya no sirve
  if(!HUDTXT.q.length || now < HUDTXT.until || _hudTitleOn(now)) return;
  _hudBannerNow(HUDTXT.q.shift().text);
}

/* ---------------- lugar libre para los textos del canvas ---------------- */
// Rectángulos (en píxeles del canvas) que un texto del mundo no debe pisar: el HUD fijo y los carteles
// grandes que se estén viendo. Se recalcula cada 250 ms (medir el DOM en cada cuadro es caro).
let _hudBlockRects = [], _hudBlockAt = 0;
const HUDTXT_BLOCK_IDS = ["player-status", "party", "boss-hud", "arena-title-card", "center-banner", "boss-intro", "tut-panel", "toast-stack", "downed-overlay"];
function hudTextBlockRects(){
  const now = performance.now();
  if(now - _hudBlockAt < 250) return _hudBlockRects;
  _hudBlockAt = now; _hudBlockRects = [];
  if(typeof document==="undefined" || typeof canvas==="undefined" || !canvas.getBoundingClientRect) return _hudBlockRects;
  const cr = canvas.getBoundingClientRect(), sx = (VW || cr.width) / (cr.width || 1), sy = (VH || cr.height) / (cr.height || 1); // a coordenadas lógicas del canvas (VW×VH)
  const add = el=>{
    if(!el || el.classList.contains("hidden")) return;
    const cs = getComputedStyle(el); if(cs.display==="none" || cs.visibility==="hidden") return;
    // (un cartel que recién entra arranca transparente: cuenta desde el primer cuadro de su animación)
    if(parseFloat(cs.opacity) < 0.15 && !(el.getAnimations && el.getAnimations().some(a=>a.playState==="running"))) return;
    const r = el.getBoundingClientRect(); if(r.width < 2 || r.height < 2) return;
    _hudBlockRects.push({l:(r.left - cr.left)*sx - 4, t:(r.top - cr.top)*sy - 4, r:(r.right - cr.left)*sx + 4, b:(r.bottom - cr.top)*sy + 4});
  };
  for(const id of HUDTXT_BLOCK_IDS) add(document.getElementById(id));
  add(document.querySelector("#hud .top"));
  return _hudBlockRects;
}
// ¿El rectángulo (centro x, centro y, ancho, alto; píxeles del canvas) pisa algo de lo anterior o de `taken`?
function hudTextFreeRect(x, y, w, h, taken){
  const l = x - w/2, r = x + w/2, t = y - h/2, b = y + h/2;
  const hit = q=> l < q.r && r > q.l && t < q.b && b > q.t;
  if(hudTextBlockRects().some(hit)) return false;
  return !(taken && taken.some(hit));
}
