"use strict";
/* ============================================================
   js/champions/axiom.js
   Axiom: zonas de Error 404 / Bug de Colisión.
   ============================================================ */

/* ============================================================
   AXIOM — zonas con demora/agrupamiento (Error 404 y Bug de Colisión). Mismo patrón que
   traps/fireWalls (array propio, se actualiza cada frame, se filtra al vencer), separado del
   sistema de trampas del Asesino para no tocar nada de otro campeón.
   ============================================================ */
function updateAxiomZones(dt){
  for(const z of axiomZones){
    z.timer -= dt;
    if(z.mode==="pull" && z.timer>0){
      // Bug de Colisión: mientras dura, arrastra suavemente a los enemigos de la zona hacia
      // el centro (nunca los atraviesa del todo ni rompe colisiones reales de otros sistemas).
      for(const e of enemies){
        if(!e.alive) continue;
        const dx = z.x-e.x, dy = z.y-e.y, d = Math.hypot(dx,dy);
        if(d <= z.radius && d>4){
          e.x += (dx/d) * z.pullStrength * dt/1000;
          e.y += (dy/d) * z.pullStrength * dt/1000;
        }
      }
      if(Math.random()<0.4) particles.push({x:z.x+(Math.random()-0.5)*z.radius, y:z.y+(Math.random()-0.5)*z.radius*0.6, vx:0, vy:-10, life:260, color:"#4dffe6"});
    } else if(z.mode==="delay" && !z.exploded){
      if(Math.random()<0.35) particles.push({x:z.x+(Math.random()-0.5)*z.radius*1.6, y:z.y+(Math.random()-0.5)*z.radius*0.9, vx:(Math.random()-0.5)*20, vy:-14, life:220, color:"#4dffe6"});
    }
    if(z.timer<=0 && !z.exploded){
      z.exploded = true;
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(z,e) <= z.radius){
          damageEnemy(e, z.dmg, {src:z.src, knockback:z.knockback||0, slow:z.slow, slowDur:z.slowDur});
        }
      }
      particles.push({x:z.x,y:z.y, life:420, ring:true, maxLife:420, maxR:z.radius*1.3, color:"#4dffe6"});
      if(z.src===player) showBanner(z.bannerText||"");
    }
  }
  axiomZones = axiomZones.filter(z=>!z.exploded || z.timer > -400); // deja un instante el flash del estallido antes de sacarla
}
function drawAxiomZones(){
  for(const z of axiomZones){
    if(z.exploded) continue;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#4dffe6"; ctx.lineWidth = 2;
    ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}
