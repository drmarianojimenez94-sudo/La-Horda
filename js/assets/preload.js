"use strict";
/* ============================================================
   js/assets/preload.js
   Pantalla de título: "Toca para continuar" queda deshabilitado (mostrando el % de carga) hasta
   que terminó la PRIMERA TANDA de imágenes (título, menús, Sala, guardianes). Después se suelta la
   segunda tanda (arte de las arenas: ver lazy-images.js) y se sigue cargando en segundo plano.
   assetsAllReady() / whenAssetsReady(cb, onProgress) dicen si ya está TODO; la partida espera a
   eso antes de arrancar, así nunca se juega con sprites a medio cargar.
   ============================================================ */
const ASSET_LOAD = { core:{done:0, total:0}, rest:{done:0, total:0}, waiters:[], progress:[] };
function assetsAllReady(){ return ASSET_LOAD.core.done >= ASSET_LOAD.core.total && ASSET_LOAD.rest.done >= ASSET_LOAD.rest.total && ASSET_LOAD.restStarted; }
function assetsRestPct(){ const r = ASSET_LOAD.rest; return r.total ? Math.floor(r.done*100/r.total) : 100; }
function whenAssetsReady(cb, onProgress){
  if(assetsAllReady()){ cb(); return; }
  ASSET_LOAD.waiters.push(cb); if(onProgress) ASSET_LOAD.progress.push(onProgress);
}
(function(){
  const btn = document.getElementById("title-continue-btn");
  if(typeof ASSET_MANIFEST === "undefined"){ ASSET_LOAD.restStarted = true; return; }
  const lazy = typeof LAZY_IMG !== "undefined" && LAZY_IMG.deferredOn;
  const core = [], rest = [];
  for(const src of ASSET_MANIFEST) ((lazy && LAZY_IMG.isDeferred(src)) ? rest : core).push(src);
  ASSET_LOAD.core.total = core.length; ASSET_LOAD.rest.total = rest.length;
  const label = "Toca para continuar"; // el HTML arranca en "Cargando…" y deshabilitado (no se puede tocar antes de tiempo)
  function load(list, bucket, onStep){
    for(const src of list){
      const im = new Image();
      let settled = false;
      const done = ok => { if(settled) return; settled = true; bucket.done++; if(!ok) console.error("No se pudo cargar la imagen:", src); onStep(); };
      im.addEventListener("load", ()=>done(true));
      // si falló el .webp, lazy-images.js reintenta con el .png (queda marcado en __pngSrc): se espera
      // a ese segundo intento, que dispara su propio load o error
      im.addEventListener("error", ()=>{ if(!im.__pngSrc) done(false); });
      im.src = src;
    }
  }
  function refreshTitle(){
    const c = ASSET_LOAD.core;
    if(!btn) return;
    if(c.done >= c.total){ btn.textContent = label; btn.disabled = false; return; }
    btn.textContent = "Cargando… " + Math.floor(c.done*100/Math.max(1, c.total)) + "%";
  }
  function refreshRest(){
    for(const f of ASSET_LOAD.progress){ try{ f(assetsRestPct()); }catch(e){} }
    if(assetsAllReady()){
      const w = ASSET_LOAD.waiters; ASSET_LOAD.waiters = []; ASSET_LOAD.progress = [];
      for(const f of w){ try{ f(); }catch(e){ console.error(e); } }
    }
  }
  function startRest(){
    if(ASSET_LOAD.restStarted) return;
    ASSET_LOAD.restStarted = true;
    if(lazy) LAZY_IMG.release();
    load(rest, ASSET_LOAD.rest, refreshRest);
    refreshRest();
  }
  if(btn) btn.disabled = true;
  load(core, ASSET_LOAD.core, ()=>{ refreshTitle(); if(ASSET_LOAD.core.done >= ASSET_LOAD.core.total) startRest(); });
  refreshTitle();
  if(!core.length) startRest();
})();
