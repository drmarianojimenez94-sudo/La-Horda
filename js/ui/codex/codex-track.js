"use strict";
/* ============================================================
   js/ui/codex/codex-track.js
   Descubrimiento del Códice: qué criaturas VISTE y cuántas MATASTE (save.codex). Es lo único nuevo
   que se guarda; el resto del estado del Códice sale del progreso real (arenas completadas).
   - Anfitrión / solo: spawnEnemy → visto, killEnemy → muerte.
   - Invitado en cooperativo: lo que llega en las instantáneas → visto; el evento vfxOnDeath → muerte.
   No toca combate, botín ni progresión: solo anota.
   ============================================================ */
let _codexDirty = false;
function codexNoteSeen(type){
  if(!type || typeof save==="undefined" || !save) return;
  const C = save.codex || (save.codex = {seen:{}, kills:{}});
  if(!C.seen) C.seen = {};
  if(C.seen[type]) return;
  C.seen[type] = 1; _codexMarkDirty();
}
function codexNoteKill(type){
  if(!type || typeof save==="undefined" || !save) return;
  const C = save.codex || (save.codex = {seen:{}, kills:{}});
  if(!C.kills) C.kills = {};
  if(!C.seen) C.seen = {};
  C.kills[type] = (C.kills[type]||0) + 1; C.seen[type] = 1;
  _codexMarkDirty();
}
// Guardado con calma: persist() ya agrupa escrituras durante la partida; esto evita llamarlo por cada muerte.
function _codexMarkDirty(){
  if(_codexDirty) return; _codexDirty = true;
  setTimeout(()=>{ _codexDirty = false; if(typeof persist==="function") persist(); }, 1500);
}
