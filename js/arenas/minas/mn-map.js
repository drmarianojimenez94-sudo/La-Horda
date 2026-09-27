"use strict";
/* ============================================================
   js/arenas/minas/mn-map.js
   MINAS PROFUNDAS — estado, geometría de cada sector (roca maciza, columnas, escombros temporales del
   Titán), colisión, navegación, DESCENSO entre sectores y apariciones.
   Cada sector es una sala propia en el mismo espacio de coordenadas: al bajar, la pantalla se funde a
   negro, el equipo aparece en la jaula del montacargas del sector siguiente y el mapa cambia (sin
   caminatas vacías: combate -> transición breve -> sector más profundo). Todo es rectángulo + círculo:
   colisión barata y exacta; la grilla de navegación del motor se arma con mnNavBlocked.
   ============================================================ */
let mnS = null;                 // estado de la partida (lo manda el anfitrión en su netState)
let _mnNavSig = "";
let _mnSpawnAt = null;

function mnSector(){ return MN_SECTORS[mnS ? mnS.sec : 0]; }
function mnNewLights(sec){
  return MN_SECTORS[sec].lights.map((L, i)=>({i, k:L.k, x:L.x, y:L.y, r:L.r, e:1, st:2, off:0, hit:0, dr:0, dev:0}));
}
function mnNewState(){
  return {
    lv:1, sec:0,
    desc:null,                      // descenso en curso {t, to, sw}
    lights:mnNewLights(0),          // fuentes de luz del sector (ver mn-light.js)
    zones:[],                       // zonas de oscuridad del Escupidor / apagón {x,y,r,t,d,k}
    drops:[],                       // impactos con aviso {k,x,y,r,t,d,dmg,...}
    shots:[],                       // proyectiles propios {x,y,vx,vy,t,d,k,dmg,r}
    fire:[],                        // parches ardientes (Cerbero) {x,y,r,t,d,dps}
    rubble:[],                      // escombros del derrumbe (sólidos temporales) {x,y,r,t,d}
    torch:[0, 0, 0, 0],             // antorcha personal apagada (ms restantes) por héroe
    ctx:[],                         // objetivos de ENCENDER / ATRAVESAR (acción contextual)
    alerts:[],                      // alertas del HUD {k,x,y,txt,t,d}
    dev:{n:0, next:0, lv:0},        // Devoraluz: apariciones del nivel
    ti:{st:"none", t:0},            // Titán de Piedra (nivel 8)
    cb:{st:"none", t:0, act:0},     // Cerbero (nivel 10)
    portal:{st:"none", t:0},        // Portal Infernal: none -> opening -> open -> used
    hell:0,                         // 0..1: cuánto "infierno" se ve (rojo, ceniza, fisuras)
    relit:0, lost:0, devoured:0,    // estadísticas de la luz (resultados)
    rule:0
  };
}

/* ---------------- geometría ---------------- */
function mnRocksNow(){ const S = mnSector(); return S.gate ? S.rocks.concat([{x0:-420, y0:-760, x1:420, y1:-620}]) : S.rocks; }
function mnSolidsNow(){
  const S = mnSector(); const L = S.pillars.slice();
  if(mnS && mnS.rubble.length) for(const r of mnS.rubble) if(r.t >= 0) L.push(r);
  return L;
}
function mnGeomSig(){ return mnS ? mnS.sec + "|" + mnS.rubble.filter(r=>r.t >= 0).map(r=>r.x|0).join(",") : ""; }
function mnNavMaybe(){ const g = mnGeomSig(); if(g !== _mnNavSig){ _mnNavSig = g; aidNavBuild(); } }
function _mnInRect(x, y, r, pad){ return x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad; }
function mnInside(x, y, m){
  const B = MN_BOUNDS, pad = m||0;
  if(x < B.x0 + pad || x > B.x1 - pad || y < B.y0 + pad || y > B.y1 - pad) return false;
  for(const w of mnRocksNow()) if(_mnInRect(x, y, w, pad)) return false;
  for(const s of mnSolidsNow()) if(Math.hypot(x - s.x, y - s.y) < s.r + pad) return false;
  return true;
}
function mnNavBlocked(x, y){ return !mnInside(x, y, 20); }
function _mnPushRect(ent, w, r){
  const cx = Math.max(w.x0, Math.min(ent.x, w.x1)), cy = Math.max(w.y0, Math.min(ent.y, w.y1));
  const dx = ent.x - cx, dy = ent.y - cy, d2 = dx*dx + dy*dy;
  if(d2 >= r*r) return false;
  if(d2 > 0.0001){ const d = Math.sqrt(d2); ent.x = cx + dx/d*r; ent.y = cy + dy/d*r; return true; }
  const l = ent.x - w.x0, rr = w.x1 - ent.x, t = ent.y - w.y0, b = w.y1 - ent.y, m = Math.min(l, rr, t, b);
  if(m===l) ent.x = w.x0 - r; else if(m===rr) ent.x = w.x1 + r; else if(m===t) ent.y = w.y0 - r; else ent.y = w.y1 + r;
  return true;
}
function mnClamp(ent){
  if(!ent) return;
  const B = MN_BOUNDS, r = Math.min(44, (ent.radius||18)*0.8);
  ent.x = Math.max(B.x0 + r, Math.min(B.x1 - r, ent.x));
  ent.y = Math.max(B.y0 + r, Math.min(B.y1 - r, ent.y));
  const rocks = mnRocksNow(), solids = mnSolidsNow();
  for(let k=0;k<2;k++){
    let moved = false;
    for(const w of rocks){ if(ent.x > w.x0 - r && ent.x < w.x1 + r && ent.y > w.y0 - r && ent.y < w.y1 + r && _mnPushRect(ent, w, r)) moved = true; }
    for(const s of solids){ const dx = ent.x - s.x, dy = ent.y - s.y, min = s.r + r*0.9, d = Math.hypot(dx, dy); if(d < min){ const q = d || 0.01; ent.x = s.x + dx/q*min; ent.y = s.y + dy/q*min; moved = true; } }
    if(!moved) break;
  }
}
function mnNearestFree(x, y, pad){
  if(mnInside(x, y, pad||20)) return {x, y};
  for(let r=30;r<=480;r+=30){ for(let a=0;a<12;a++){ const q = a/12*Math.PI*2, px = x + Math.cos(q)*r, py = y + Math.sin(q)*r; if(mnInside(px, py, pad||20)) return {x:px, y:py}; } }
  const E = mnSector().entry; return {x:E.x, y:E.y};
}

/* ---------------- descenso ---------------- */
function mnDescendTo(sec){
  if(!mnS || mnS.desc || sec===mnS.sec) return;
  mnS.desc = {t:0, to:sec, sw:false};
  playSfx("mnElevator");
  for(const h of heroes) h.invulnTimer = Math.max(h.invulnTimer||0, MN_CFG.descentMs + 400);
}
function mnDescentUpdate(dt){
  const D = mnS.desc; if(!D) return;
  D.t += dt;
  if(!D.sw && D.t >= MN_CFG.descentMs*0.45){
    D.sw = true;
    mnS.sec = D.to;
    mnS.lights = mnNewLights(D.to); mnS.zones.length = 0; mnS.drops.length = 0; mnS.shots.length = 0; mnS.fire.length = 0; mnS.rubble.length = 0;
    // la horda que quedaba arriba no baja con el equipo
    for(const o of enemies){ if(o.alive && o.rank!=="jefe" && o.rank!=="subjefe"){ o.alive = false; o.hp = 0; } }
    enemies = enemies.filter(o=>o.alive);
    const E = mnSector().entry;
    heroes.forEach((h, i)=>{ const a = (i/Math.max(1, heroes.length))*Math.PI*2 - Math.PI/2, p = mnNearestFree(E.x + (i ? Math.cos(a)*80 : 0), E.y + (i ? Math.sin(a)*40 : 0), 24); h.x = p.x; h.y = p.y; });
    _mnNavSig = ""; mnNavMaybe();
    if(typeof resetCameraSnap==="function") resetCameraSnap();
    const S = mnSector();
    arenaTitleCard(`−${S.depth} m`, S.name, S.sub, 3600);
    mnSectorIntro(D.to);
  }
  if(D.t >= MN_CFG.descentMs) mnS.desc = null;
}
function mnDescending(){ return !!(mnS && mnS.desc); }

/* ---------------- apariciones ---------------- */
function mnMinHeroDist(x, y){ let d = Infinity; for(const h of heroes){ if(h.alive){ const q = Math.hypot(h.x - x, h.y - y); if(q < d) d = q; } } return d; }
function mnRand(a, b){ return a + Math.random()*(b - a); }
function mnPick(a){ return a[(Math.random()*a.length)|0]; }
function mnPlaceSpawn(e, atBoss){
  if(_mnSpawnAt){ e.x = _mnSpawnAt.x; e.y = _mnSpawnAt.y; mnClamp(e); return; }
  if(atBoss || e.rank==="jefe" || e.rank==="subjefe") return;
  const S = mnSector();
  // Insectos: salen de las vetas de la roca (paredes, columnas). El resto entra por los túneles,
  // lejos del equipo y preferentemente por los que quedaron A OSCURAS (la oscuridad trae a la Horda).
  if(e.type==="mn_insecto"){
    const L = S.walls.map(p=>({p, d:mnMinHeroDist(p.x, p.y)})).filter(o=>o.d > 300 && o.d < 900);
    const q = L.length ? mnPick(L).p : mnPick(S.walls);
    const f = mnNearestFree(q.x + mnRand(-60, 60), q.y + mnRand(-60, 60), 22); e.x = f.x; e.y = f.y; e.mnEmerge = MN_CFG.insecto.emergeMs;
    return;
  }
  let cands = S.tunnels.map(p=>({p, d:mnMinHeroDist(p.x, p.y), dk:mnLightAt(p.x, p.y) < 0.2})).filter(o=>o.d > 480);
  const dark = cands.filter(o=>o.dk);
  if(dark.length && Math.random() < 0.7) cands = dark;
  const q = cands.length ? mnPick(cands).p : mnPick(S.tunnels);
  const f = mnNearestFree(q.x + mnRand(-40, 40), q.y + mnRand(-40, 40), 26);
  e.x = f.x; e.y = f.y;
}
function mnSpawnAt(type, x, y){ _mnSpawnAt = {x, y}; const e = spawnEnemy(type, false); _mnSpawnAt = null; return e; }
