"use strict";
/* ============================================================
   js/champions/mago.js
   Mago: Muro de Fuego (actualización y dibujo).
   ============================================================ */

/* ============================================================
   MUROS DE FUEGO (Mago)
   ============================================================ */
function updateFireWalls(dt){
  for(const fw of fireWalls){
    fw.timer -= dt;
    fw.tick -= dt;
    // Único "Fuego del Vacío": el muro sigue al Mago (y se ve violeta)
    if(fw.src && fw.src.alive && heroUniqueKey(fw.src)==="uniq_archimago"){ fw.x += (fw.src.x-fw.x)*Math.min(1, dt/260); fw.y += (fw.src.y-fw.y)*Math.min(1, dt/260); fw.voidFire = true; }
    if(fw.tick<=0){
      fw.tick = fw.tickInterval;
      for(const e of enemies){
        if(!e.alive) continue;
        const d = distance(fw, e);
        if(d >= fw.innerR && d <= fw.outerR){
          damageEnemy(e, fw.dmg, {src:fw.src, burn:true});
        }
      }
    }
  }
  fireWalls = fireWalls.filter(fw=>fw.timer>0);
}

function drawFireWall(fw){
  const spawnProg = Math.min(1, (fw.maxTimer-fw.timer)/300);     // se forma en 300ms
  const fadeProg = fw.timer < 500 ? fw.timer/500 : 1;             // se apaga en los últimos 500ms
  const alpha = spawnProg * fadeProg;
  const mid = (fw.innerR+fw.outerR)/2;
  const thick = fw.outerR - fw.innerR;
  const now = performance.now()/1000;
  const tier = fw.tier || 1; // escala visual según el talento invertido en Muro de Fuego
  const ageSec = (fw.maxTimer-fw.timer)/1000;
  const dying = fw.timer < 350;
  ctx.save();
  ctx.globalAlpha = alpha;
  if(fw.voidFire) ctx.filter = "hue-rotate(245deg) saturate(1.4)"; // Único "Fuego del Vacío" (donde el navegador lo soporte)
  // Sprites reales del paquete "Muro de Fuego": se reparten llamas individuales a lo largo de
  // la circunferencia del anillo (la habilidad es un aro, no un muro recto). Más llamas y más
  // grandes cuanto mayor el talento invertido — así se nota mucho más al subir de nivel.
  const n = 7 + tier*5;
  const flameSize = (thick*0.95 + tier*7);
  const animName = dying ? "extincion" : (spawnProg<1 ? "formacion" : "activo");
  for(let i=0;i<n;i++){
    const a = (i/n)*Math.PI*2 + (dying?0:now*0.12);
    const fx = fw.x + Math.cos(a)*mid, fy = fw.y + Math.sin(a)*mid*0.62;
    const t = animName==="formacion" ? ageSec : (now + i*0.11);
    MuroFuego.draw(ctx, animName, t, fx, fy, flameSize);
  }
  ctx.filter = "none";
  if(fw.voidFire && !dying){
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const gv = ctx.createRadialGradient(fw.x, fw.y, fw.innerR*0.4, fw.x, fw.y, fw.outerR+26);
    gv.addColorStop(0, "rgba(150,80,255,0.22)"); gv.addColorStop(1, "rgba(150,80,255,0)");
    ctx.fillStyle = gv; ctx.fillRect(fw.x-fw.outerR-30, fw.y-fw.outerR-30, (fw.outerR+30)*2, (fw.outerR+30)*2);
    ctx.restore();
  }
  if(tier>=3 && !dying && !fw.voidFire){
    // resplandor cálido de fondo en niveles altos de talento
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(fw.x, fw.y, fw.innerR*0.5, fw.x, fw.y, fw.outerR+20+tier*5);
    g.addColorStop(0, "rgba(255,110,40,0.14)");
    g.addColorStop(1, "rgba(255,110,40,0)");
    ctx.fillStyle = g; ctx.fillRect(fw.x-fw.outerR-30, fw.y-fw.outerR-30, (fw.outerR+30)*2, (fw.outerR+30)*2);
    ctx.restore();
  }
  if(tier>=4 && !dying){
    // humo ascendente en los niveles más altos de talento
    for(let i=0;i<4;i++){
      const a = (i/4)*Math.PI*2 + now*0.15;
      const sx = fw.x+Math.cos(a)*mid, sy = fw.y+Math.sin(a)*mid*0.62 - 14 - ((now*24)%22);
      ctx.fillStyle = "rgba(150,150,150,0.22)";
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}
