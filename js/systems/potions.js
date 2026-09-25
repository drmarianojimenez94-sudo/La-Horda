"use strict";
/* ============================================================
   js/systems/potions.js
   Pociones de vida en el piso.
   ============================================================ */

/* ============================================================
   POCIONES DE VIDA
   ============================================================ */
const POTION_LIFE = 22000, POTION_PICK_R = 46;
// Suelta una poción cerca de (x,y) siempre en un lugar alcanzable: dentro de la arena y fuera de
// muros del Laberinto y obstáculos sólidos (antes podía caer dentro de un muro y quedar a la
// vista pero imposible de agarrar).
function dropPotion(x, y, type){
  const p = {x:x+(Math.random()-0.5)*40, y:y+(Math.random()-0.5)*40, radius:12, life:POTION_LIFE, phase:Math.random()*6, type};
  clampToArena(p); resolveWallCollision(p); clampToArena(p);
  delete p.radius;
  potions.push(p);
}
// Una poción solo se consume si al que la pisa le hace falta (vida/maná no llenos): así no se
// desperdicia. Para que no parezca un error, si el jugador la pisa con la barra llena se le
// avisa ("Vida llena") y la poción queda esperando.
function potionUseful(h, p){ return p.type==="mana" ? h.energy < h.maxEnergy : h.hp < h.maxHp; }
function updatePotions(dt){
  for(const p of potions){
    p.life -= dt;
    p.phase += dt/240;
    if(p.fullHintCd>0) p.fullHintCd -= dt;
    if(player && player.alive && !potionUseful(player, p) && Math.hypot(player.x-p.x, player.y-p.y) < POTION_PICK_R && !(p.fullHintCd>0)){
      floatText(p.x, p.y-30, p.type==="mana" ? "Maná lleno" : "Vida llena", null);
      p.fullHintCd = 2500;
    }
    for(const h of heroes){
      if(!h.alive) continue;
      if(p.type==="mana"){
        if(Math.hypot(h.x-p.x, h.y-p.y) < POTION_PICK_R && h.energy < h.maxEnergy){
          const amt = h.maxEnergy*0.4;
          h.energy = Math.min(h.maxEnergy, h.energy + amt);
          floatText(h.x, h.y-34, "+"+Math.round(amt), "heal");
          particles.push({x:p.x, y:p.y, life:300, ring:true, maxLife:300, maxR:38, color:"#7ec8ff"});
          p.life = 0;
          if(h===player) playSfx("potion");
          break;
        }
      } else if(Math.hypot(h.x-p.x, h.y-p.y) < POTION_PICK_R && h.hp < h.maxHp){
        const amt = h.maxHp*0.28*arenaRuleHealMult();
        h.hp = Math.min(h.maxHp, h.hp + amt);
        floatText(h.x, h.y-34, "+"+Math.round(amt), "heal");
        particles.push({x:p.x, y:p.y, life:300, ring:true, maxLife:300, maxR:38, color:"#ff5f7a"});
        p.life = 0;
        if(h===player) playSfx("potion");
        break;
      }
    }
  }
  potions = potions.filter(p=>p.life>0);
}
