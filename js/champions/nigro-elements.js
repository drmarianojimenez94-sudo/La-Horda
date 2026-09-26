"use strict";
/* ============================================================
   js/champions/nigro-elements.js
   NIGROMANTE — GÓLEM ELEMENTAL (Maestría "Maestro de Gólems").
   Irse por la rama del gólem termina en elegir, para siempre, su elemento. Cada uno cambia lo que
   hace el gólem (no solo el color) y se lee de lejos por su aura:
     - Piedra (sin elegir): el de siempre.
     - Fuego:    +daño, -vida. Quema al golpear y deja un rastro de brasas que quema al pisarlo.
     - Hielo:    +vida, -daño. Ralentiza al golpear; aura de escarcha.
     - Tormenta: cada golpe salta en rayo a 2 enemigos cercanos (con Mojado, Conducción).
     - Plaga:    maldice al golpear (Plaga de los Condenados): sinergia con la rama de la plaga.
   Fuego e Hielo tienen arte propio; Tormenta y Plaga usan el gólem de piedra recoloreado al
   cargar (cuando llegue el arte de las especializaciones, NG-01 en
   LA_HORDA_COMBAT_MISSING_ASSETS.md, se enchufa en NIGRO_GOLEM_IMG.storm / .plague).
   La forma demoníaca de la ultimate toma el color del elemento (aura y brasas).
   ============================================================ */
const NIGRO_ELEMENTS = {
  stone:  {name:"Piedra",   rgb:"143,174,122", ring:"#8fae7a", hp:1.00, dmg:1.00},
  fire:   {name:"Fuego",    rgb:"255,138,61",  ring:"#ff8a3d", hp:0.85, dmg:1.25},
  ice:    {name:"Hielo",    rgb:"159,227,255", ring:"#9fe3ff", hp:1.20, dmg:0.90},
  storm:  {name:"Tormenta", rgb:"170,150,255", ring:"#b39cff", hp:0.95, dmg:1.10},
  plague: {name:"Plaga",    rgb:"150,255,110", ring:"#96ff6e", hp:1.05, dmg:0.95}
};
function nigroEl(skin){ return NIGRO_ELEMENTS[skin] || NIGRO_ELEMENTS.stone; }

// ---- arte provisorio de Tormenta y Plaga: el gólem de piedra recoloreado una vez ----
const NIGRO_GOLEM_TINT = {};
function _nigroTint(key, fn){
  const src = NIGRO_GOLEM_IMG.stone;
  const build = ()=>{
    try{
      const c = document.createElement("canvas"); c.width = src.naturalWidth; c.height = src.naturalHeight;
      const g = c.getContext("2d"); g.drawImage(src, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      for(let i=0;i<p.length;i+=4){ if(p[i+3]) fn(p, i, p[i]*0.3 + p[i+1]*0.59 + p[i+2]*0.11); }
      g.putImageData(d, 0, 0); NIGRO_GOLEM_TINT[key] = c;
    }catch(err){ NIGRO_GOLEM_TINT[key] = src; }
  };
  if(src.complete && src.naturalWidth) build(); else src.addEventListener("load", build);
}
// Tormenta: piedra azul pizarra con vetas violeta brillante (los tonos claros se vuelven "electricidad")
_nigroTint("storm", (p, i, l)=>{ if(l > 140){ p[i] = 225; p[i+1] = 215; p[i+2] = 255; } else { p[i] = Math.min(255, l*0.8 + 20); p[i+1] = Math.min(255, l*0.85 + 22); p[i+2] = Math.min(255, l*1.2 + 50); } });
// Plaga: carne enferma verde oliva con pústulas claras
_nigroTint("plague", (p, i, l)=>{ if(l > 150){ p[i] = 205; p[i+1] = 255; p[i+2] = 140; } else { p[i] = l*0.62; p[i+1] = Math.min(255, l*0.95 + 18); p[i+2] = l*0.38; } });
function nigroGolemImage(skin, attacking){
  if(NIGRO_GOLEM_IMG[skin] && NIGRO_GOLEM_READY[skin]) return NIGRO_GOLEM_IMG[skin];      // arte real (fuego, hielo, o el que llegue)
  if(NIGRO_GOLEM_TINT[skin]) return NIGRO_GOLEM_TINT[skin];                                // provisorio (tormenta, plaga)
  if(attacking && NIGRO_GOLEM_READY.stoneAtk) return NIGRO_GOLEM_IMG.stoneAtk;
  return NIGRO_GOLEM_READY.stone ? NIGRO_GOLEM_IMG.stone : null;
}

// ---- efecto elemental de cada golpe del gólem (anfitrión) ----
function nigroGolemOnHit(g, h, e, dmg){
  if(g.skin==="storm"){
    // salta a los 2 enemigos más cercanos al golpeado (no repite)
    let from = e, used = [e];
    for(let k=0;k<2;k++){
      let best = null, bd = 190;
      for(const o of enemies){ if(!o.alive || used.includes(o)) continue; const d = distance(from, o); if(d < bd){ bd = d; best = o; } }
      if(!best) break;
      pushChainBolt(from.x, from.y - 20, best.x, best.y - 20, 3, 320);
      damageEnemy(best, dmg*0.6, {src:h, chain:true});
      used.push(best); from = best;
    }
  } else if(g.skin==="plague"){
    nigromanteApplyCurse(e, h, h.baseDmg*0.3, 0.1, 0, 3000, 1);
  }
}
// ---- rastro de brasas del gólem de fuego (anfitrión) ----
function nigroGolemElementTick(g, h, dt){
  if(g.skin!=="fire" || !g.moving) return;
  g.trailT = (g.trailT||0) - dt;
  if(g.trailT > 0) return;
  g.trailT = 450;
  vfxBurst(g.x, g.y, 5, "ember", 40, 700, 3, 0, -20, 1);
  for(const e of enemies){ if(e.alive && distance(g, e) < 46) damageEnemy(e, h.baseDmg*0.25, {src:h, burn:true}); }
}

// ---- dibujo: aura en el piso + detalle por elemento (local, determinístico) ----
function nigroDrawElementAura(x, y, skin, size, t){
  if(!skin || skin==="stone") return;
  const E = nigroEl(skin), R = size;
  ctx.save();
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35 + 0.12*Math.sin(t*4);
  ctx.drawImage(glowSprite(E.rgb), x - R*1.4, y - R*0.9, R*2.8, R*1.8);
  ctx.globalAlpha = 0.8; ctx.strokeStyle = E.ring; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y + 2, R*0.95, R*0.38, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}
function nigroDrawElementDetail(x, y, skin, h, t){
  if(!skin || skin==="stone") return;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  if(skin==="storm"){
    // dos arcos cortos que cambian cada 90 ms (se leen como electricidad sin partículas)
    const seed = Math.floor(t*11);
    ctx.strokeStyle = "rgba(210,200,255,0.9)"; ctx.lineWidth = 1.6;
    for(let k=0;k<2;k++){
      const r = (n)=>{ const v = Math.sin((seed + k*7 + n)*12.9898)*43758.5453; return v - Math.floor(v); };
      let px = x + (r(1) - 0.5)*h*0.6, py = y - h*(0.3 + r(2)*0.5);
      ctx.beginPath(); ctx.moveTo(px, py);
      for(let s=0;s<4;s++){ px += (r(3+s) - 0.5)*22; py += (r(9+s) - 0.3)*14; ctx.lineTo(px, py); }
      ctx.stroke();
    }
  } else if(skin==="plague"){
    ctx.fillStyle = "rgba(170,255,120,0.85)";
    for(let i=0;i<6;i++){ const ph = (t*0.6 + i*0.17) % 1; ctx.globalAlpha = 1 - ph; ctx.fillRect(x + ((i*23) % 40) - 20, y - h*0.7 + ph*h*0.7, 3, 3); }
  } else if(skin==="fire"){
    ctx.fillStyle = "#ffb060";
    for(let i=0;i<6;i++){ const ph = (t*0.9 + i*0.19) % 1; ctx.globalAlpha = (1 - ph)*0.9; ctx.fillRect(x + ((i*29) % 44) - 22, y - h*0.4 - ph*h*0.6, 2.5, 2.5); }
  } else if(skin==="ice"){
    ctx.fillStyle = "#e8faff";
    for(let i=0;i<5;i++){ const ph = (t*0.35 + i*0.23) % 1; ctx.globalAlpha = Math.sin(ph*Math.PI)*0.9; ctx.fillRect(x + ((i*31) % 46) - 23, y - h*(0.2 + ph*0.7), 2, 2); }
  }
  ctx.restore();
}
