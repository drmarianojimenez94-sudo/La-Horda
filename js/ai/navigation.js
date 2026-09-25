"use strict";
/* ============================================================
   js/ai/navigation.js
   Navegación: campo de flujo para esquivar muros, pasos de enemigos y aliados,
   colisión entre círculos.
   ============================================================ */

// ---------------- Navegación de enemigos (campo de flujo) ----------------
// Antes los enemigos iban en línea recta al objetivo y atravesaban los muros del Laberinto. Ahora,
// en arenas con geometría real, se calcula cada ~0.3 s un campo de distancias (BFS en una grilla
// de 40 u) desde los héroes vivos; un enemigo sin línea de vista sigue el gradiente para rodear
// muros y obstáculos. Con vista directa sigue yendo derecho (mismo comportamiento de siempre).
// Los jefes (rank "jefe") no navegan ni chocan: embisten a través de todo y siempre llegan.
const AID_NAV = { cell:40, x0:-1340, y0:-940, W:67, H:47, on:false, blocked:null, dist:null, queue:null, t:0 };
const AID_NAV_DEFAULT = {x0:-1340, y0:-940, W:67, H:47};
function aidNavBuild(){
  const N = AID_NAV;
  // grilla propia de la arena (La Fortaleza es un mapa mucho más grande que el coliseo)
  const def = arenaDef(), nb = def && def.navBounds;
  const want = nb ? {x0:nb.x0, y0:nb.y0, W:Math.ceil((nb.x1-nb.x0)/N.cell), H:Math.ceil((nb.y1-nb.y0)/N.cell)} : AID_NAV_DEFAULT;
  if(want.W!==N.W || want.H!==N.H){ N.blocked = null; }
  N.x0 = want.x0; N.y0 = want.y0; N.W = want.W; N.H = want.H;
  const custom = arenaHas("navBlocked");
  N.on = !!(aidSolids.length || labyrinthWalls.length || custom);
  if(!N.on) return;
  const n = N.W*N.H;
  if(!N.blocked){ N.blocked = new Uint8Array(n); N.dist = new Uint16Array(n); N.distP = new Uint16Array(n); N.queue = new Int32Array(n); }
  const pad = 20;
  for(let j=0;j<N.H;j++) for(let i=0;i<N.W;i++){
    const x = N.x0 + (i+0.5)*N.cell, y = N.y0 + (j+0.5)*N.cell;
    let b = custom ? arenaHook("navBlocked", x, y) : !aidInside(x, y, 0);
    if(!b) for(const s of aidSolids){ if(Math.hypot(s.x-x, s.y-y) < s.r+pad){ b = true; break; } }
    if(!b) for(const w of labyrinthWalls){ if(aidPointInWall(w, x, y, pad)){ b = true; break; } }
    N.blocked[j*N.W+i] = b ? 1 : 0;
  }
  N.t = 0;
}
function aidNavCell(x, y){
  const N = AID_NAV;
  const i = Math.floor((x-N.x0)/N.cell), j = Math.floor((y-N.y0)/N.cell);
  if(i<0 || j<0 || i>=N.W || j>=N.H) return -1;
  return j*N.W+i;
}
function aidNavUpdate(dt){
  const N = AID_NAV;
  if(!N.on) return;
  N.t -= dt;
  if(N.t > 0) return;
  N.t = 300;
  aidNavBfs(N.dist, (seed)=>{
    for(const h of heroes) seed(h);
    if(divinaMode) for(const st of divinaStructures){ if(st.alive && st.side==="player") seed(st); }
  });
  aidNavBfs(N.distP, (seed)=>seed(player)); // campo aparte hacia el jugador: lo usan los aliados bot
}
function aidNavBfs(dist, seeder){
  const N = AID_NAV, INF = 65535;
  dist.fill(INF);
  let qh = 0, qt = 0;
  seeder((h)=>{ if(!h || !h.alive) return; const c = aidNavCell(h.x, h.y); if(c>=0 && dist[c]===INF){ dist[c] = 0; N.queue[qt++] = c; } });
  while(qh < qt){
    const c = N.queue[qh++], d = dist[c]+1;
    const i = c % N.W, j = (c - i)/N.W;
    if(i>0){ const k=c-1; if(!N.blocked[k] && dist[k]===INF){ dist[k]=d; N.queue[qt++]=k; } }
    if(i<N.W-1){ const k=c+1; if(!N.blocked[k] && dist[k]===INF){ dist[k]=d; N.queue[qt++]=k; } }
    if(j>0){ const k=c-N.W; if(!N.blocked[k] && dist[k]===INF){ dist[k]=d; N.queue[qt++]=k; } }
    if(j<N.H-1){ const k=c+N.W; if(!N.blocked[k] && dist[k]===INF){ dist[k]=d; N.queue[qt++]=k; } }
  }
}
const _aidDir = {x:0, y:0};
function aidNavDir(e, field){
  const N = AID_NAV;
  const D = field || N.dist;
  const c = aidNavCell(e.x, e.y);
  if(c<0) return null;
  const i = c % N.W, j = (c - i)/N.W;
  let best = -1, bd = D[c];
  if(N.blocked[c]) bd = 65534; // metido en el borde inflado de un obstáculo: salir hacia la mejor celda
  for(let dj=-1; dj<=1; dj++) for(let di=-1; di<=1; di++){
    if(!di && !dj) continue;
    const ii = i+di, jj = j+dj;
    if(ii<0 || jj<0 || ii>=N.W || jj>=N.H) continue;
    const k = jj*N.W+ii;
    if(N.blocked[k]) continue;
    // diagonal solo si no corta una esquina bloqueada
    if(di && dj && (N.blocked[j*N.W+ii] || N.blocked[jj*N.W+i])) continue;
    if(D[k] < bd){ bd = D[k]; best = k; }
  }
  if(best<0) return null;
  const bi = best % N.W, bj = (best - bi)/N.W;
  const tx = N.x0 + (bi+0.5)*N.cell, ty = N.y0 + (bj+0.5)*N.cell;
  const dx = tx-e.x, dy = ty-e.y, d = Math.hypot(dx, dy) || 1;
  _aidDir.x = dx/d; _aidDir.y = dy/d;
  return _aidDir;
}
// ¿Hay línea libre entre dos puntos? (muestreo sobre la grilla ya inflada)
function aidLineClear(x0, y0, x1, y1){
  const N = AID_NAV;
  const d = Math.hypot(x1-x0, y1-y0), steps = Math.ceil(d/(N.cell*0.75));
  for(let s=1; s<steps; s++){
    const t = s/steps, c = aidNavCell(x0+(x1-x0)*t, y0+(y1-y0)*t);
    if(c>=0 && N.blocked[c]) return false;
  }
  return true;
}
// Paso de movimiento genérico de un enemigo que persigue (reemplaza el "ir derecho" de siempre
// solo cuando la arena tiene geometría; si no, es exactamente el mismo movimiento de antes).
function aidEnemyStep(e, dx, dy, dist, spd, dt){
  let mx = dx/dist, my = dy/dist;
  if(AID_NAV.on && e.rank!=="jefe"){
    e._navT = (e._navT||0) - dt;
    if(e._navT <= 0){ e._navT = 180 + Math.random()*140; e._navBlocked = !aidLineClear(e.x, e.y, e.x+dx, e.y+dy); }
    if(e._navBlocked){ const d = aidNavDir(e); if(d){ mx = d.x; my = d.y; } }
    // suavizado del giro para que no zigzaguee entre celdas
    if(e._nmx===undefined){ e._nmx = mx; e._nmy = my; }
    e._nmx = e._nmx*0.72 + mx*0.28; e._nmy = e._nmy*0.72 + my*0.28;
    const l = Math.hypot(e._nmx, e._nmy) || 1; mx = e._nmx/l; my = e._nmy/l;
  }
  e.x += mx*spd*dt/1000; e.y += my*spd*dt/1000;
  if(AID_NAV.on && e.rank!=="jefe") aidCollideEnemy(e);
}
// Aliados bot: si no tienen línea libre hacia el jugador (muro/obstáculo en el medio) y se están
// moviendo para acercarse, siguen el campo de flujo del jugador en vez de empujar contra la pared.
function aidAllyDir(h, mx, my){
  if(!AID_NAV.on || !AID_NAV.distP) return null;
  h._navT = (h._navT||0) - 16;
  if(h._navT <= 0){ h._navT = 200; h._navBlocked = Math.hypot(player.x-h.x, player.y-h.y) > 90 && !aidLineClear(h.x, h.y, player.x, player.y); }
  if(!h._navBlocked) return null;
  // solo si el movimiento pedido va más o menos hacia el jugador (no al huir de un enemigo)
  const px = player.x-h.x, py = player.y-h.y, pl = Math.hypot(px,py)||1;
  if(mx*px/pl + my*py/pl < 0.2) return null;
  return aidNavDir(h, AID_NAV.distP);
}
// ---------------- Colisión ----------------
function aidResolveCircles(ent, k){
  if(!aidSolids.length) return;
  const rr = (ent.radius||18)*(k||0.8);
  for(const s of aidSolids){
    const dx = ent.x-s.x, dy = ent.y-s.y, min = s.r+rr, d2 = dx*dx+dy*dy;
    if(d2 < min*min){ const d = Math.sqrt(d2) || 0.01; ent.x = s.x + dx/d*min; ent.y = s.y + dy/d*min; }
  }
}
function aidResolveWalls(ent, k){
  if(!labyrinthWalls.length) return;
  const rad = (ent.radius||18)*(k||0.8);
  for(const w of labyrinthWalls){
    const hw = (w.axis==="v" ? w.thick : w.len)/2 + rad, hh = (w.axis==="v" ? w.len : w.thick)/2 + rad;
    const lx = ent.x-w.x, ly = ent.y-w.y;
    if(Math.abs(lx) < hw && Math.abs(ly) < hh){
      const ox = hw-Math.abs(lx), oy = hh-Math.abs(ly);
      if(ox < oy) ent.x = w.x + (lx>0 ? hw : -hw); else ent.y = w.y + (ly>0 ? hh : -hh);
    }
  }
}
function aidCollideEnemy(e){ aidResolveCircles(e, 0.8); aidResolveWalls(e, 0.7); }
