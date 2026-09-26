"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-guide.js
   LA FORTALEZA SIN FIN — tutorial contextual del Hechicero (BUGFIX 01: era la única arena sin
   explicación propia). VER: la trampa que avisa / el puente que se mueve · ENTENDER: qué hace ·
   HACER: salir de la marca / esperar el giro · FEEDBACK: el consejo se tilda al cumplirlo.
   Lee el estado sincronizado (fortS), así que funciona igual en los invitados.
   ============================================================ */
(function(){
  const D = ARENA_DEFS.fortaleza; if(!D) return;
  const up = D.update, gu = D.guestUpdate;
  D.update = function(dt){ up(dt); fortGuideTut(); };
  if(gu) D.guestUpdate = function(dt){ gu(dt); fortGuideTut(); };
})();
function fortGuideTut(){
  if(typeof fortS==="undefined" || !fortS || !player || !player.alive || !fortS.traps) return;
  tutSay("fort_intro", "LA FORTALEZA SIN FIN es una máquina: puertas, puentes y TRAMPAS. Las trampas SIEMPRE avisan (marca en el piso + ruido) antes de activarse.", null, 8000);
  // trampa avisando cerca: salí de la marca
  for(let i=0;i<fortS.traps.length;i++){
    const s = fortS.traps[i], T = FORT_MAP.traps[i];
    if(!s || s.st!==FORT_TRAP_WARN || !T || T.x===undefined) continue;
    if(Math.hypot(player.x-T.x, player.y-T.y) > 520) continue;
    if(tutSay("fort_trap", "¡Esa marca en el piso es una TRAMPA a punto de activarse (vapor, engranaje, cadena, forja o prensa)! Salí de la zona marcada.", "Salí de la marca antes de que se active", 9000)) fortS._tutTrap = i;
    break;
  }
  if(TUT.key==="fort_trap" && fortS._tutTrap!=null){
    const s = fortS.traps[fortS._tutTrap];
    if(s && s.st===FORT_TRAP_ACT && !(player.hurtTimer > 0)) tutDone("fort_trap");
  }
  if(fortS.reconfShown) tutSay("fort_bridge", "Los PUENTES giran y se deslizan, y te llevan si estás parado encima. Si quedás del lado equivocado, esperá el próximo giro o buscá otra puerta.", null, 9000);
}
