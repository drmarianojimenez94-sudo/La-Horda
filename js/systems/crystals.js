"use strict";
/* ============================================================
   js/systems/crystals.js
   LOS CRISTALES DE LOS GUARDIANES (lore: ver LA_HORDA_LORE.md).
   Cuatro Guardianes contenían a la Horda; la Horda los corrompió. Cada uno guarda un cristal con
   su parte del sello. Al vencer a un Guardián corrompido, su cristal queda libre y va al jugador.
   El Hechicero Supremo es el cuarto Guardián: te guía porque necesita que juntes los otros tres,
   y en el final te los quita para tener todo el poder de la Horda (inf-hechicero.js).
     - Cristal de Espora   → la Madre Espora (jefa del Reino Micelial)
     - Cristal de Escarcha → el Mago de Hielo y Cristal (jefe de la Gélida, cae como Ángel Caído)
     - Cristal de Piedra   → el Guardián del Laberinto (subjefe del Laberinto)
     - Cristal del Juicio  → el del propio Hechicero (no se junta: es el que los quiere a todos)
   Se guarda en save.crystals. En cooperativo el premio viaja como evento (cada uno lo guarda).
   ============================================================ */
const CRYSTAL_DEFS = {
  espora:   {name:"Cristal de Espora",   guardian:"la Madre Espora",          arena:"micelial",  rgb:"120,255,170", dark:"#1f6b48", mid:"#4fd08a", light:"#c8ffe0"},
  escarcha: {name:"Cristal de Escarcha", guardian:"el Mago de Hielo",         arena:"hielo",     rgb:"150,225,255", dark:"#2a5f86", mid:"#6fc3ef", light:"#e4f7ff"},
  piedra:   {name:"Cristal de Piedra",   guardian:"el Guardián del Laberinto", arena:"laberinto", rgb:"255,196,110", dark:"#7a4d1c", mid:"#d99a48", light:"#ffe7bf"}
};
const CRYSTAL_ORDER = ["espora","escarcha","piedra"]; // orden de la campaña
for(const k in CRYSTAL_DEFS){ const D = CRYSTAL_DEFS[k]; VFX_PAL["cr_"+k] = [D.mid, D.light, "#ffffff", D.rgb]; }
const CRYSTAL_JUICIO = {name:"Cristal del Juicio", rgb:"255,236,170", dark:"#8a6a1c", mid:"#f0c84a", light:"#fff6d6"};
const CRYSTAL_BY_ARENA = {micelial:"espora", hielo:"escarcha", laberinto:"piedra"};

function crystalsOwned(){ const c = save.crystals || {}; return CRYSTAL_ORDER.filter(k=>c[k]); }
function crystalHas(k){ return !!(save.crystals && save.crystals[k]); }

// Lo que dice el Hechicero al recibir cada cristal (con la sospecha sembrada: "yo te lo cuido").
const CRYSTAL_LINES = {
  espora: "¡El Cristal de Espora! La Madre Espora era una de los Cuatro Guardianes que contenían a la Horda, hasta que la Horda la pudrió por dentro.",
  escarcha: "El Cristal de Escarcha. El Mago de Hielo también fue Guardián, antes de que el frío de la Horda le congelara el alma.",
  piedra: "El Cristal de Piedra. El Guardián del Laberinto cerraba los caminos de la Horda… hasta que la Horda lo volvió parte de sus muros."
};
const CRYSTAL_COUNT_LINES = ["", " Es el primero de tres. Guardalo bien: cuando llegue el momento, yo te lo cuido.", " Ya tenés dos. Falta uno.",
  " Los tres. Con el mío, los Cuatro estarían juntos otra vez… La Infernal te espera."];
function crystalLine(key){ return CRYSTAL_LINES[key] + CRYSTAL_COUNT_LINES[crystalsOwned().length]; }

/* ---------------- ceremonia (local en cada cliente) ---------------- */
// El cristal sale del Guardián caído, sube con una columna de luz, gira y vuela hacia el jugador.
const CRYSTAL_FX = {on:false, key:null, x:0, y:0, t:0, got:false, reverse:false, tx:0, ty:0, list:null};
const CRYSTAL_T = {rise:650, hover:900, fly:750};
function crystalAward(key, x, y){
  const D = CRYSTAL_DEFS[key]; if(!D) return;
  const had = crystalHas(key);
  save.crystals = save.crystals || {};
  save.crystals[key] = true;
  try{ persist(); }catch(err){}
  CRYSTAL_FX.on = true; CRYSTAL_FX.key = key; CRYSTAL_FX.x = x; CRYSTAL_FX.y = y; CRYSTAL_FX.t = 0; CRYSTAL_FX.got = false; CRYSTAL_FX.reverse = false; CRYSTAL_FX.had = had;
  if(typeof vfxShock==="function") vfxShock(x, y, 20, 150, D.rgb, 700, 3);
  if(typeof vfxBurst==="function") vfxBurst(x, y - 20, 18, "cr_"+key, 120, 900, 3, 2, -60);
  if(typeof playSfx==="function") playSfx("crystal");
}
// Final: el Hechicero le arranca los cristales al jugador (vuelan del héroe hacia él).
function crystalSteal(fromX, fromY, toX, toY){
  CRYSTAL_FX.on = true; CRYSTAL_FX.reverse = true; CRYSTAL_FX.t = 0; CRYSTAL_FX.got = false;
  CRYSTAL_FX.x = fromX; CRYSTAL_FX.y = fromY; CRYSTAL_FX.tx = toX; CRYSTAL_FX.ty = toY;
  CRYSTAL_FX.list = CRYSTAL_ORDER.slice(); CRYSTAL_FX.key = null;
  if(typeof playSfx==="function") playSfx("crystal");
}
function crystalReset(){ CRYSTAL_FX.on = false; CRYSTAL_FX.list = null; }
function crystalTick(dt){
  const F = CRYSTAL_FX; if(!F.on) return;
  F.t += dt;
  if(F.reverse){ if(F.t > 2200) F.on = false; return; }
  const T = CRYSTAL_T.rise + CRYSTAL_T.hover + CRYSTAL_T.fly;
  if(!F.got && F.t >= T){
    F.got = true;
    const D = CRYSTAL_DEFS[F.key], n = crystalsOwned().length;
    if(typeof flashScreen==="function") flashScreen(0.35, D.rgb);
    if(typeof showBanner==="function") showBanner("◆ " + D.name.toUpperCase() + " — " + n + "/3 ◆");
    if(player && typeof vfxShock==="function") vfxShock(player.x, player.y - 20, 10, 110, D.rgb, 520, 3);
    if(typeof tutSay==="function") setTimeout(()=>{ try{ tutSay("c_" + F.key + (F.had ? "_r" : ""), F.had ? "Otra vez el " + D.name + ". Ya lo tenías: el Guardián vuelve a caer, y su cristal vuelve a vos." : crystalLine(F.key), null, 11000, true); }catch(err){} }, 500);
  }
  if(F.t > T + 400) F.on = false;
}

/* ---------------- dibujo ---------------- */
// Gema facetada procedural (6 caras con luz de arriba a la izquierda). spin: 0..2π (se achica en x).
function crystalDrawGem(c, x, y, s, D, spin, alpha){
  const k = Math.cos(spin), w = 0.55 + 0.45*Math.abs(k); // gira sin volverse una línea
  c.save(); c.translate(x, y); c.scale(w, 1); c.globalAlpha = alpha === undefined ? 1 : alpha;
  const P = [[0,-26],[13,-9],[10,13],[0,26],[-10,13],[-13,-9]].map(p=>[p[0]*s/26, p[1]*s/26]);
  const C = [0,0];
  const lit = k > 0; // al girar, la cara iluminada cambia de lado
  const faces = [[0,1,lit ? D.light : D.mid],[1,2,lit ? D.mid : D.dark],[2,3,D.dark],[3,4,D.dark],[4,5,lit ? D.dark : D.mid],[5,0,lit ? D.mid : D.light]];
  c.fillStyle = "rgba(0,0,0,0.55)"; c.beginPath(); P.forEach((p,i)=> i ? c.lineTo(p[0]*1.18, p[1]*1.1) : c.moveTo(p[0]*1.18, p[1]*1.1)); c.closePath(); c.fill();
  for(const [a, b, col] of faces){ c.fillStyle = col; c.beginPath(); c.moveTo(C[0], C[1] - s*0.1); c.lineTo(P[a][0], P[a][1]); c.lineTo(P[b][0], P[b][1]); c.closePath(); c.fill(); }
  c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = Math.max(1, s/14);
  c.beginPath(); c.moveTo(P[5][0], P[5][1]); c.lineTo(P[0][0], P[0][1]); c.lineTo(P[1][0], P[1][1]); c.stroke();
  c.fillStyle = "#fff"; c.fillRect(-s*0.2, -s*0.62, s*0.14, s*0.3);
  c.restore();
}
function crystalDraw(){
  const F = CRYSTAL_FX; if(!F.on || !player) return;
  const now = animNow/1000;
  ctx.save();
  if(F.reverse){
    // los tres cristales salen del héroe en abanico y se clavan en el Hechicero
    const q = Math.min(1, F.t/1800);
    CRYSTAL_ORDER.forEach((k, i)=>{
      const D = CRYSTAL_DEFS[k], off = (i - 1)*0.9, u = Math.min(1, Math.max(0, (q - i*0.1)/0.8));
      const e = u*u*(3 - 2*u);
      const mx = (F.x + F.tx)/2 + Math.cos(off + Math.PI/2)*120, my = Math.min(F.y, F.ty) - 160 + Math.abs(off)*40;
      const x = (1-e)*(1-e)*F.x + 2*(1-e)*e*mx + e*e*F.tx, y = (1-e)*(1-e)*(F.y - 30) + 2*(1-e)*e*my + e*e*(F.ty - 60);
      if(u >= 1) return;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.8; ctx.drawImage(glowSprite(D.rgb), x - 40, y - 40, 80, 80);
      ctx.globalCompositeOperation = "source-over";
      crystalDrawGem(ctx, x, y, 14, D, now*6 + i, 1);
    });
    ctx.restore(); return;
  }
  const D = CRYSTAL_DEFS[F.key], R = CRYSTAL_T;
  let x = F.x, y = F.y, s = 16, a = 1;
  if(F.t < R.rise){ const q = F.t/R.rise, e = 1 - (1-q)*(1-q); y = F.y - 20 - 90*e; s = 8 + 20*e; }
  else if(F.t < R.rise + R.hover){ y = F.y - 110 + Math.sin(now*4)*5; s = 28; }
  else { const q = Math.min(1, (F.t - R.rise - R.hover)/R.fly), e = q*q; x = F.x + (player.x - F.x)*e; y = (F.y - 110) + ((player.y - 40) - (F.y - 110))*e - Math.sin(q*Math.PI)*60; s = 28 - 14*q; a = F.got ? Math.max(0, 1 - (F.t - R.rise - R.hover - R.fly)/400) : 1; }
  // columna de luz mientras sube y flota
  if(F.t < R.rise + R.hover){
    const pa = F.t < R.rise ? F.t/R.rise : 1 - (F.t - R.rise)/R.hover;
    const g = ctx.createLinearGradient(0, F.y - 260, 0, F.y);
    g.addColorStop(0, `rgba(${D.rgb},0)`); g.addColorStop(0.6, `rgba(${D.rgb},${0.35*pa})`); g.addColorStop(1, `rgba(255,255,255,${0.5*pa})`);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(F.x - 18, F.y - 260, 36, 260);
  }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.6*a; ctx.drawImage(fxDarkSprite(), x - s*1.8, y - s*1.8, s*3.6, s*3.6); // sombra de contraste: se lee sobre pisos claros
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9*a; ctx.drawImage(glowSprite(D.rgb), x - s*3.2, y - s*3.2, s*6.4, s*6.4);
  // chispas que orbitan (se lee como objeto valioso aunque la pantalla esté cargada)
  ctx.fillStyle = "#fff";
  for(let i=0;i<6;i++){ const an = now*3 + i*1.047, r = s*1.6; ctx.globalAlpha = a*(0.5 + 0.5*Math.sin(now*8 + i)); ctx.fillRect(x + Math.cos(an)*r - 1.5, y + Math.sin(an)*r*0.5 - 1.5, 3, 3); }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  crystalDrawGem(ctx, x, y, s, D, now*2.2, a);
  ctx.restore();
}

/* ---------------- UI: fila de cristales (pantalla previa y fin de partida) ---------------- */
function crystalRowHtml(){
  const own = save.crystals || {};
  const gems = CRYSTAL_ORDER.map(k=>{ const D = CRYSTAL_DEFS[k], on = !!own[k];
    return `<span class="cr-gem${on ? " on" : ""}" style="--c:${D.mid};--l:${D.light}" title="${D.name} (${D.guardian})"></span>`; }).join("");
  return `<b class="ri-k cr">◆ Cristales de los Guardianes</b><span class="cr-gems">${gems}<em>${crystalsOwned().length}/3</em></span>`;
}
