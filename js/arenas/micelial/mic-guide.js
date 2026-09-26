"use strict";
/* ============================================================
   js/arenas/micelial/mic-guide.js
   EL REINO MICELIAL — claridad y objetivo territorial (BUGFIX 01).

   Los NÚCLEOS MICELIALES son el objetivo territorial de la arena (no una copia de las fisuras del
   Infernal: son organismos que CRECEN por etapas y conquistan terreno):
     etapa 1 germina · etapa 2 infecta el piso (frena a los héroes) · etapa 3 la colonia corre más
     rápido sobre su micelio y el Reino florece · etapa 4 madura: escupe infectados/sabuesos y
     revienta esporas bajo los pies.
   Lo que se agrega acá:
   - Desde el nivel 2 (antes: 3) y cada núcleo vivo SUBE LA PRESIÓN: más enemigos por minuto según
     la suma de sus etapas (la infección total).
   - Flecha violeta en el borde hacia cada núcleo fuera de cámara (con su etapa) y un contador en
     pantalla: "Núcleos" con la etapa de cada uno.
   - Tutorial del Hechicero VER → ENTENDER → HACER → FEEDBACK (nubes de esporas y núcleos).
   Todo lee el estado que ya sincroniza el anfitrión (los núcleos son enemigos), así que funciona
   igual en los invitados.
   ============================================================ */
MIC_CFG.nucleo.fromLevel = 2;
const MIC_GUIDE_CFG = { pressurePerStage: 0.09, pressureCap: 1.9, pointerMax: 1900 };

(function(){
  const D = ARENA_DEFS.micelial; if(!D) return;
  const baseSpawn = D.spawnIntervalMult, baseUpdate = D.update, baseScreen = D.drawScreen, baseKilled = D.enemyKilled;
  // más núcleos vivos (y más maduros) = más enemigos por minuto
  D.spawnIntervalMult = function(){
    const b = baseSpawn ? baseSpawn() : 1;
    if(!micS || runLevel === LEVEL_COUNT) return b;
    return b / Math.min(MIC_GUIDE_CFG.pressureCap, 1 + MIC_GUIDE_CFG.pressurePerStage*micInfectionLevel());
  };
  D.update = function(dt){ baseUpdate(dt); micGuideTut(); };
  if(D.guestUpdate){ const g = D.guestUpdate; D.guestUpdate = function(dt){ g(dt); micGuideTut(); }; }
  D.drawScreen = function(){ if(baseScreen) baseScreen(); micGuideScreen(); };
  D.enemyKilled = function(e){
    const r = baseKilled ? baseKilled(e) : undefined;
    if(e && e.type==="nucleo_micelial" && player){
      if(TUT.key==="mic_nuc_do" || TUT.key==="mic_nuc_see") tutDone(TUT.key);
      if(tutSeen("mic_nuc_see")){ tutMark("mic_nuc_do"); tutSay("mic_nuc_ok", "¡Núcleo destruido! La infección retrocede y sus hongos se marchitan. Si dejás varios vivos, el Reino se te viene encima.", null, 7000); }
    }
    return r;
  };
})();

function micGuideTut(){
  if(!micS || !player || !player.alive) return;
  if(runLevel === LEVEL_COUNT) return;   // el nivel 10 lo explica la Madre
  tutSay("mic_intro", "Este es el REINO MICELIAL: el hongo está VIVO. Las nubes de esporas frenan y lastiman: no pelees adentro de ellas.", null, 8000);
  const nucs = micNucleos(); if(!nucs.length) return;
  let near = null, nd = Infinity;
  for(const e of nucs){ const d = Math.hypot(e.x-player.x, e.y-player.y); if(d < nd){ nd = d; near = e; } }
  // VER + ENTENDER
  if(!tutSeen("mic_nuc_see"))
    tutSay("mic_nuc_see", "¡Germinó un NÚCLEO MICELIAL (flecha violeta)! Mientras viva CRECE: infecta el piso (te frena), acelera a la colonia y al madurar escupe enemigos. Cuantos más núcleos, más horda.", "Seguí la flecha violeta hasta el núcleo", 15000);
  if(TUT.key==="mic_nuc_see" && nd < 300) tutDone("mic_nuc_see");
  // HACER
  if(tutSeen("mic_nuc_see") && nd < 520)
    tutSay("mic_nuc_do", "Destruilo a golpes ANTES de que madure (4 etapas). Mirá el contador de arriba: cada punto es una etapa.", "Destruí el Núcleo Micelial", 16000);
}

// Contador en pantalla + flechas en el borde hacia los núcleos fuera de cámara.
function micGuideScreen(){
  if(!micS || !player || state!=="playing" || player.duelActive) return;
  const nucs = micNucleos(); if(!nucs.length) return;
  ctx.save();
  // contador (arriba al centro)
  const w = 24, n = nucs.length, x0 = Math.round(VW/2 - n*w/2), y0 = 54;
  ctx.fillStyle = "rgba(10,4,14,0.66)"; ctx.fillRect(x0 - 62, y0 - 4, n*w + 70, 26);
  ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "#e8c8ff";
  ctx.fillText("Núcleos", x0 - 56, y0 + 9);
  nucs.forEach((e, i)=>{
    const st = e.nuc ? e.nuc.st : 1, x = x0 + i*w + 3;
    ctx.fillStyle = "#1a0e20"; ctx.fillRect(x, y0, 18, 18);
    ctx.fillStyle = st >= 4 ? "#ff5ad0" : "#b050e0"; ctx.fillRect(x+2, y0+2 + Math.round(14*(1 - st/4)), 14, Math.round(14*st/4));
    ctx.strokeStyle = st >= 4 ? "#ffb0f0" : "#8a5aa0"; ctx.lineWidth = 1.5; ctx.strokeRect(x+0.5, y0+0.5, 17, 17);
  });
  // flechas en el borde
  const now = animNow/1000, m = 30;
  for(const e of nucs){
    if(inView(e.x, e.y, -40) || Math.hypot(e.x-player.x, e.y-player.y) > MIC_GUIDE_CFG.pointerMax) continue;
    const s = worldToScreen(e.x, e.y), cx = VW/2, cy = VH/2, dx = s.x-cx, dy = s.y-cy;
    const kk = Math.min((VW/2 - m)/Math.abs(dx||1e-6), (VH/2 - m)/Math.abs(dy||1e-6));
    const x = cx + dx*kk, y = cy + dy*kk, a = Math.atan2(dy, dx), st = e.nuc ? e.nuc.st : 1;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.75 + 0.25*Math.sin(now*(st >= 4 ? 9 : 5));
    ctx.fillStyle = "rgba(10,4,14,0.8)"; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = st >= 4 ? "#ff5ad0" : "#c070ff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.rotate(a); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(14, -6); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill();
    ctx.rotate(-a); ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(st), 0, 1);
    ctx.restore();
  }
  ctx.restore();
}
