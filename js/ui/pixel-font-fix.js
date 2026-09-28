"use strict";
/* ============================================================
   js/ui/pixel-font-fix.js
   La fuente pixel de los títulos (Press Start 2P) no trae mayúsculas acentuadas: "CÓDICE" se dibujaba
   "CóDICE", "VOLVIÓ" como "VOLVIó" y "ARENA GÉLIDA" como "ARENA GéLIDA" (usa la minúscula). En los
   textos que se ven con esa fuente, las mayúsculas acentuadas pasan a la letra sin tilde (como en los
   carteles de los juegos de 8 bits). La Ñ queda como está (la fuente la dibuja bien). Los demás textos
   (VT323, Georgia) no se tocan. Mira el DOM entero: cubre textos fijos y los que arman los scripts.
   ============================================================ */
(function(){
  const RX = /[ÁÉÍÓÚÜ]/, RXG = /[ÁÉÍÓÚÜ]/g;
  const MAP = {"Á":"A", "É":"E", "Í":"I", "Ó":"O", "Ú":"U", "Ü":"U"};
  function isPixel(el){
    try{ return getComputedStyle(el).fontFamily.indexOf("Press Start") >= 0; }catch(e){ return false; }
  }
  function fixText(t){
    const s = t.nodeValue;
    if(!s || !RX.test(s)) return;
    const el = t.parentElement;
    if(!el || !isPixel(el)) return;
    t.nodeValue = s.replace(RXG, c=>MAP[c]);
  }
  function walk(root){
    if(!root) return;
    if(root.nodeType === 3){ fixText(root); return; }
    if(root.nodeType !== 1 || !RX.test(root.textContent || "")) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while((n = w.nextNode())) fixText(n);
  }
  function start(){
    walk(document.body);
    new MutationObserver(ms=>{
      for(const m of ms){
        if(m.type === "characterData") fixText(m.target);
        else if(m.addedNodes.length) m.addedNodes.forEach(walk);
      }
    }).observe(document.body, {childList:true, subtree:true, characterData:true});
  }
  if(document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  // las fuentes llegan después: una pasada más cuando terminan de cargar (el estilo calculado ya es el final)
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>walk(document.body));
})();
