"use strict";
/* ============================================================
   js/core/prefs.js
   Opciones de accesibilidad y de controles, POR DISPOSITIVO (como el volumen, "horda_vol", y
   "Reducir movimiento", "horda_motion"): son del celular o de la compu, no de la cuenta. En una
   feria el mismo aparato lo agarra gente distinta y el guardado de la partida no se toca.
   - vibrate:  vibración corta al recibir un golpe fuerte y al lanzar la Definitiva (Android; iPhone
               no deja vibrar desde una página y la opción no hace nada ahí).
   - shake:    sacudida de pantalla "normal" | "reducida" (40%) | "off".
   - textLg:   texto grande en lo que se lee jugando (Hechicero, carteles, números flotantes, diálogos).
   - lefty:    modo zurdo: joystick a la derecha y botones a la izquierda.
   - contrast: avisos de peligro de alto contraste (borde negro + filo blanco punteado + rayado),
               que se distinguen por la FORMA y no solo por el color (daltonismo).
   Clave: localStorage "horda_prefs" (JSON). Sin localStorage (modo privado) se usa lo de fábrica.
   ============================================================ */
const PREFS_KEY = "horda_prefs";
const PREFS_DEFAULT = { vibrate:true, shake:"normal", textLg:false, lefty:false, contrast:false };
const PREFS = (function(){
  const p = Object.assign({}, PREFS_DEFAULT);
  try{
    const v = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if(v && typeof v==="object"){
      if(typeof v.vibrate==="boolean") p.vibrate = v.vibrate;
      if(v.shake==="normal" || v.shake==="reducida" || v.shake==="off") p.shake = v.shake;
      if(typeof v.textLg==="boolean") p.textLg = v.textLg;
      if(typeof v.lefty==="boolean") p.lefty = v.lefty;
      if(typeof v.contrast==="boolean") p.contrast = v.contrast;
    }
  }catch(e){}
  return p;
})();
function prefsSave(){ try{ localStorage.setItem(PREFS_KEY, JSON.stringify(PREFS)); }catch(e){} }
// Aplica las clases de <body> que usan css/controls.css (zurdo, texto grande, alto contraste).
function prefsApply(changed){
  const b = document.body; if(!b) return;
  b.classList.toggle("lefty", !!PREFS.lefty);
  b.classList.toggle("text-lg", !!PREFS.textLg);
  b.classList.toggle("hi-contrast", !!PREFS.contrast);
  // los "+" de subir habilidad y el apuntado se ubican con el rect del botón: que se vuelvan a medir
  if(changed===true){ try{ window.dispatchEvent(new Event("resize")); }catch(e){} }
}
function prefSet(key, val){
  if(!(key in PREFS_DEFAULT)) return;
  PREFS[key] = val;
  prefsSave(); prefsApply(true);
  if(typeof optionsSync==="function") optionsSync();
}
// Modo zurdo: TODO el HUD se espeja (lo de la izquierda pasa a la derecha y al revés), así los botones
// no caen encima de la vida/arena y el joystick no tapa la Definitiva. Lo que se dibuja en el canvas
// pegado a un costado (minimapas, racha) usa hudMirrorX: x de una caja de ancho w, del lado que toca.
function hudLefty(){ return !!PREFS.lefty; }
function hudMirrorX(x, w){ return PREFS.lefty ? VW - x - (w||0) : x; }
// Multiplicador de la sacudida de pantalla (lo usan juice.js y vfx.js). "Reducir movimiento" la apaga igual.
function prefShakeMult(){ return PREFS.shake==="off" ? 0 : PREFS.shake==="reducida" ? 0.4 : 1; }
// Vibración corta (ms o patrón). Con tope de frecuencia para que no zumbe sin parar en una pelea.
let _hapticLast = 0;
function hapticPulse(ms, force){
  if(!PREFS.vibrate) return false;
  const now = performance.now();
  if(!force && now - _hapticLast < 380) return false;
  try{
    if(typeof navigator!=="undefined" && typeof navigator.vibrate==="function"){ _hapticLast = now; return navigator.vibrate(ms) !== false; }
  }catch(e){}
  return false;
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ()=>prefsApply()); else prefsApply();

/* ---------------- pantalla de Opciones (index.html #hub-options; también se abre desde la pausa) ---------------- */
// Refleja PREFS (y "Reducir movimiento", que vive en juice.js) en los interruptores y selectores.
function optionsSync(){
  const box = document.getElementById("hub-options"); if(!box) return;
  box.querySelectorAll(".opt-switch[data-pref]").forEach(b=>{
    const k = b.dataset.pref;
    const on = k==="motion" ? !!(typeof JUICE!=="undefined" && JUICE.reduceMotion) : !!PREFS[k];
    b.setAttribute("aria-checked", on ? "true" : "false");
    b.textContent = on ? "Sí" : "No";
  });
  box.querySelectorAll(".opt-seg[data-pref]").forEach(g=>{
    const k = g.dataset.pref, cur = k==="textLg" ? (PREFS.textLg ? "1" : "0") : String(PREFS[k]);
    g.querySelectorAll("button[data-v]").forEach(b=> b.setAttribute("aria-pressed", b.dataset.v===cur ? "true" : "false"));
  });
}
(function(){
  const bind = ()=>{
    const box = document.getElementById("hub-options"); if(!box) return;
    box.querySelectorAll(".opt-switch[data-pref]").forEach(b=> b.addEventListener("click", ()=>{
      const k = b.dataset.pref;
      if(k==="motion"){ if(typeof setReduceMotion==="function") setReduceMotion(!JUICE.reduceMotion); optionsSync(); return; }
      prefSet(k, !PREFS[k]);
      if(k==="vibrate" && PREFS.vibrate) hapticPulse(40, true); // se siente al prenderla (si el aparato puede)
    }));
    box.querySelectorAll(".opt-seg[data-pref]").forEach(g=> g.querySelectorAll("button[data-v]").forEach(b=> b.addEventListener("click", ()=>{
      const k = g.dataset.pref;
      prefSet(k, k==="textLg" ? b.dataset.v==="1" : b.dataset.v);
    })));
    // la casilla "Reducir movimiento" de la pausa y la de Opciones muestran lo mismo
    const pm = document.getElementById("opt-reduce-motion"); if(pm) pm.addEventListener("change", ()=> setTimeout(optionsSync, 0));
    const po = document.getElementById("pause-opts-btn");
    if(po) po.addEventListener("click", ()=>{ if(typeof openHubOptions==="function") openHubOptions(); });
    optionsSync();
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
