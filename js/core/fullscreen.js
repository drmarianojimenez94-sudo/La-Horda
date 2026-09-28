"use strict";
/* ============================================================
   js/core/fullscreen.js
   ANDROID: pantalla completa y horizontal.
   En Chrome para Android, con el teléfono acostado la barra de direcciones y la de navegación se comen
   ~56 px de los ~360-410 de alto, y como la página no scrollea nunca se esconden solas: el juego quedaba
   más bajito que en iPhone (HUD encimado, menos arena a la vista). Al tocar "Toca para continuar",
   "Unirse", "Listo" o "Comenzar" se pide pantalla completa (Fullscreen API, necesita ese toque) y se
   traba la orientación horizontal. Si se sale con el botón Atrás, el próximo de esos toques la vuelve a pedir.
   iPhone no tiene Fullscreen API para páginas: no hace nada (ahí manda "Agregar a inicio"). Escritorio
   (sin pantalla táctil): tampoco. ?fs=0 lo apaga; en pruebas automatizadas está apagado salvo ?fs=1.
   Instalado desde Chrome ("Agregar a la pantalla principal"), manifest.webmanifest ya abre así.
   ============================================================ */
const FULLSCREEN = (function(){
  let q; try{ q = new URLSearchParams(location.search); }catch(e){ q = new URLSearchParams(""); }
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  const coarse = typeof matchMedia==="function" && matchMedia("(pointer:coarse)").matches;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints > 1);
  const on = !!req && coarse && !ios && q.get("fs")!=="0" && !(navigator.webdriver && q.get("fs")!=="1");
  const S = { requests:0, lockOk:null };
  function active(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function lockLandscape(){
    try{
      if(screen.orientation && typeof screen.orientation.lock==="function")
        screen.orientation.lock("landscape").then(()=>{ S.lockOk = true; }, ()=>{ S.lockOk = false; });
    }catch(e){ S.lockOk = false; }
  }
  function enter(){
    if(!on || active()) return false;
    S.requests++;
    try{
      const p = req.call(el, {navigationUI:"hide"});
      if(p && typeof p.then==="function") p.then(lockLandscape, ()=>{}); else lockLandscape();
    }catch(e){ return false; }
    return true;
  }
  // un solo oyente: los botones que arrancan algo (el click es un gesto válido para la Fullscreen API)
  const SEL = "#title-continue-btn, #title-join-btn, #mode-join-btn, #net-ready-btn, #prep-start-btn, #run-intro .ri-go";
  document.addEventListener("click", (ev)=>{
    const t = ev.target && ev.target.closest ? ev.target.closest(SEL) : null;
    if(t) enter();
  }, true);
  return { enter, active, get enabled(){ return on; }, get requests(){ return S.requests; }, get lockOk(){ return S.lockOk; } };
})();
