"use strict";
/* ============================================================
   js/rendering/champion-art-normalize.js — ROSTER ART GATE (escala y apoyo uniformes)
   Todos los campeones y todas sus apariencias se dibujan con la MISMA altura de cuerpo y la MISMA
   línea de pies que el Master Reference (Caballero / tanque), en las tres vistas (frente, perfil,
   espalda). Los factores se MIDEN con el propio motor (tools/art/roster_gate.js --write) y viven en
   js/data/champion-art-normalize.js; nada se ajusta a mano. Solo afecta el dibujo del cuerpo: hitbox,
   radio, colisiones y VFX no cambian.
   window.ART_GATE_RAW = true desactiva la normalización (solo para medir).
   ============================================================ */
let _artSkinIds = null;
function champArtSkinId(h){
  if(typeof ascCandidate === "function" && ascCandidate(h)){ const n = typeof ascSkinIndex === "function" ? ascSkinIndex(h) : 0; return n ? h.classKey + "_alt" + n : ""; }
  if(typeof activeSetSkin !== "function") return "";
  const d = activeSetSkin(h); if(!d) return "";
  if(d.id) return d.id;
  if(!_artSkinIds){ _artSkinIds = new Map(); if(typeof SET_SKINS !== "undefined") for(const id in SET_SKINS) _artSkinIds.set(SET_SKINS[id], id); }
  return _artSkinIds.get(d) || "";
}
function champArtView(h){
  const fx = h.fx || 0, fy = h.fy === undefined ? 1 : h.fy;
  return Math.abs(fx) > Math.abs(fy) * 1.3 ? "side" : (fy < -0.15 ? "up" : "front");
}
function champArtNorm(h){
  if(typeof CHAMP_ART_NORMALIZE === "undefined" || !h || !h.classKey) return null;
  const skin = champArtSkinId(h), row = (skin && CHAMP_ART_NORMALIZE[h.classKey + "@" + skin]) || CHAMP_ART_NORMALIZE[h.classKey];
  return row ? (row[champArtView(h)] || row.front) : null;
}
(function(){
  if(typeof drawHeroBody !== "function") return;
  const original = drawHeroBody;
  drawHeroBody = function(h, drawScale){
    const n = (typeof window !== "undefined" && window.ART_GATE_RAW) ? null : champArtNorm(h);
    if(!n || (Math.abs(n[0] - 1) < 0.005 && Math.abs(n[1]) < 0.5)) return original.apply(this, arguments);
    // escala alrededor del punto de apoyo (h.x, h.y) y corrige la línea de pies; drawScale ya incluye
    // colosal/crecer/únicos, así que esas transformaciones de juego se conservan proporcionalmente.
    const k = drawScale / (h.scale || 2);
    ctx.save(); ctx.translate(h.x, h.y + n[1] * k); ctx.scale(n[0], n[0]); ctx.translate(-h.x, -h.y);
    try{ return original.apply(this, arguments); } finally { ctx.restore(); }
  };
})();
