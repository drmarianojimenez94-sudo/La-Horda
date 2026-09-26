"use strict";
/* ============================================================
   js/skills/ability-vfx.js
   Efectos visuales escalonados por nivel de talento de las habilidades.
   ============================================================ */

function elementColor(sk, fallback){
  if(sk.element==="fire") return "#ff6a3d";
  if(sk.element==="ice") return "#9fe3ff";
  if(sk.element==="lightning") return "#ffe36a";
  return fallback;
}

// Visuales de Nova de Escarcha que evolucionan con el nivel de maestría de la habilidad,
// siguiendo la progresión de referencia N1 (anillo simple) -> N4 (círculo rúnico completo).
function frostNovaVFX(caster, R, talentLevel){
  const tier = tierOf(talentLevel);
  // N1: doble anillo de escarcha (siempre presente, crece con el área)
  particles.push({x:caster.x,y:caster.y, life:520, ring:true, maxLife:520, maxR:R, color:"#bfe8ff"});
  particles.push({x:caster.x,y:caster.y, life:680, ring:true, maxLife:680, maxR:R*0.55, color:"#eaffff"});
  // Escarcha ascendente base
  for(let i=0;i<12;i++){
    const a=Math.random()*Math.PI*2, r=Math.random()*R;
    particles.push({x:caster.x+Math.cos(a)*r, y:caster.y+Math.sin(a)*r*0.55, vx:0, vy:-8, life:520, color:"#eaffff"});
  }
  if(tier>=2){
    // N2: chispas de escarcha orbitando el anillo
    for(let i=0;i<16;i++){
      const a = (i/16)*Math.PI*2;
      particles.push({x:caster.x+Math.cos(a)*R*0.92, y:caster.y+Math.sin(a)*R*0.92*0.55, vx:Math.cos(a)*8, vy:Math.sin(a)*8*0.55-4, life:460, color:"#eaffff"});
    }
  }
  if(tier>=3){
    // N3: cristales de hielo que emergen del suelo (más un par de esquirlas reales)
    for(let i=0;i<8;i++){
      const a = Math.random()*Math.PI*2, r = Math.random()*R*0.85;
      particles.push({x:caster.x+Math.cos(a)*r, y:caster.y+Math.sin(a)*r*0.55, life:900, maxLife:900, crystal:true, size:9+Math.random()*9, angle:Math.random()*Math.PI, color:"#bfe8ff"});
    }
    if(newfxReady('iceCrystal')){
      for(let i=0;i<3;i++){
        const a = Math.random()*Math.PI*2, r = Math.random()*R*0.7;
        vfxSprite("fxIceCrystal", 0, caster.x+Math.cos(a)*r, caster.y+Math.sin(a)*r*0.55, 26+Math.random()*10, 900, null, 0.15, Math.random()<0.5, 0.92);
      }
    }
  }
  if(tier>=4){
    // N4: círculo rúnico completo bajo el mago, con un tercer anillo exterior
    particles.push({x:caster.x,y:caster.y, life:950, maxLife:950, runeRing:true, maxR:R*0.72, color:"#9fe3ff", count:12});
    particles.push({x:caster.x,y:caster.y, life:900, ring:true, maxLife:900, maxR:R*0.9, color:"#7ad0ff"});
    if(newfxReady('frostRune')){
      for(let i=0;i<6;i++){
        const a = (i/6)*Math.PI*2;
        vfxSprite("fxFrostRune", 0, caster.x+Math.cos(a)*R*0.72, caster.y+Math.sin(a)*R*0.72*0.55, 22, 950, null, 0.1, false, 0.5, 0, 0, 0, a+Math.PI/2);
      }
    }
  }
}
// Visuales del estallido inicial de Cataclismo Elemental (Ulti), escalonadas por nivel de talento:
// de un anillo de fuego simple a un círculo rúnico con esquirlas de hielo, como en la referencia.
function cataclysmVFX(caster, R, talentLevel){
  const tier = tierOf(talentLevel);
  particles.push({x:caster.x,y:caster.y, life:520, ring:true, maxLife:520, maxR:R, color:"#ff6a3d"});
  particles.push({x:caster.x,y:caster.y, life:520, maxLife:520, spin:true, radius:R*0.6, color:"#9fe3ff"});
  if(tier>=2){
    for(let i=0;i<10;i++){
      const a=Math.random()*Math.PI*2, r=Math.random()*R;
      particles.push({x:caster.x+Math.cos(a)*r, y:caster.y+Math.sin(a)*r*0.55, vx:(Math.random()-0.5)*20, vy:-16-Math.random()*20, life:520, color:"#ffb36a"});
    }
  }
  if(tier>=3){
    for(let i=0;i<6;i++){
      const a=Math.random()*Math.PI*2, r=Math.random()*R*0.85;
      particles.push({x:caster.x+Math.cos(a)*r, y:caster.y+Math.sin(a)*r*0.55, life:900, maxLife:900, crystal:true, size:9+Math.random()*8, angle:Math.random()*Math.PI, color:"#bfe8ff"});
    }
    if(newfxReady('iceCrystal')){
      for(let i=0;i<2;i++){
        const a = Math.random()*Math.PI*2, r = Math.random()*R*0.7;
        vfxSprite("fxIceCrystal", 0, caster.x+Math.cos(a)*r, caster.y+Math.sin(a)*r*0.55, 24+Math.random()*10, 900, null, 0.15, Math.random()<0.5, 0.92);
      }
    }
  }
  if(tier>=4){
    particles.push({x:caster.x,y:caster.y, life:950, maxLife:950, runeRing:true, maxR:R*0.72, color:"#ffcf5c", count:12});
    particles.push({x:caster.x,y:caster.y, life:900, ring:true, maxLife:900, maxR:R*0.9, color:"#7ad0ff"});
  }
}
// Convierte un nivel de talento (0-10) en una de las 4 etapas visuales usadas en todo el juego.
// Mismos hitos que la EVOLUCIÓN de habilidades (skill-evolution.js): Nv.3 / Nv.5 / Nv.7; el Nv.10
// suma encima el destello de "Forma final".
function tierOf(level){ return level>=7 ? 4 : level>=5 ? 3 : level>=3 ? 2 : 1; }
// Estallido genérico que escala en capas según el nivel de talento invertido en la habilidad:
// Nv.0-1: anillo simple · Nv.2-3: + chispas y segundo anillo · Nv.4-6: + esquirlas de poder ·
// Nv.7-10: + círculo rúnico completo. Sirve de base visual compartida para cualquier habilidad
// que no tenga ya su propia progresión temática (como Nova de Escarcha o Cataclismo).
function tieredBurstVFX(x, y, R, talentLevel, color, color2){
  const tier = tierOf(talentLevel);
  particles.push({x,y, life:420, ring:true, maxLife:420, maxR:R, color});
  if(tier>=2){
    particles.push({x,y, life:520, ring:true, maxLife:520, maxR:R*0.6, color:color2||color});
    for(let i=0;i<8;i++){
      const a=Math.random()*Math.PI*2;
      particles.push({x, y, vx:Math.cos(a)*46, vy:Math.sin(a)*46-12, life:300, color});
    }
  }
  if(tier>=3){
    for(let i=0;i<5;i++){
      const a=Math.random()*Math.PI*2, r=Math.random()*R*0.7;
      particles.push({x:x+Math.cos(a)*r, y:y+Math.sin(a)*r*0.55, life:650, maxLife:650, crystal:true, size:7+Math.random()*6, angle:Math.random()*Math.PI, color});
    }
  }
  if(tier>=4){
    particles.push({x,y, life:750, maxLife:750, runeRing:true, maxR:R*0.62, color:color2||color, count:10});
  }
  return tier;
}
