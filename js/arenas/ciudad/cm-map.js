"use strict";
/* ============================================================
   js/arenas/ciudad/cm-map.js
   CIUDAD MALDITA — geometría (paredes con puertas, sólidos, barricadas y pilares temporales),
   colisión, navegación, interiores (para el fundido local de techos) y apariciones.
   Todo es rectángulo alineado a los ejes + círculos: la colisión es barata y exacta, y la grilla de
   navegación del motor (js/ai/navigation.js) se arma con cmNavBlocked.
   ============================================================ */
let cmS = null;                 // estado de la partida (lo manda el anfitrión en su netState)
let CM_WALLS = [];              // [{x0,y0,x1,y1,b}] paredes fijas (planta)
let _cmNavSig = "";
let _cmSpawnAt = null;
const CM_BLD = {};              // id -> edificio (con .inner y .doorPt)
const CM_SAFE = [];             // zonas seguras [{id (estructura), x, y}]

(function cmBuildStatic(){
  const T = CM_WALL_T, DW = CM_DOOR_W;
  for(const b of CM_BUILDINGS){
    CM_BLD[b.id] = b;
    b.inner = {x0:b.x0 + T, y0:b.y0 + T, x1:b.x1 - T, y1:b.y1 - T};
    b.cx = (b.x0 + b.x1)/2; b.cy = (b.y0 + b.y1)/2;
    const solid = b.kind==="torre" || b.kind==="campanario" || b.kind==="catedral";
    if(solid || !b.door){ CM_WALLS.push({x0:b.x0, y0:b.y0, x1:b.x1, y1:b.y1, b:b.id}); continue; }
    const d = b.door, h = DW/2;
    // pared con hueco de puerta: se parte el lado de la puerta en dos tramos
    const side = (s, x0, y0, x1, y1)=>{
      if(d.side!==s){ CM_WALLS.push({x0, y0, x1, y1, b:b.id}); return; }
      if(s==="n" || s==="s"){ CM_WALLS.push({x0, y0, x1:d.at - h, y1, b:b.id}); CM_WALLS.push({x0:d.at + h, y0, x1, y1, b:b.id}); }
      else { CM_WALLS.push({x0, y0, x1, y1:d.at - h, b:b.id}); CM_WALLS.push({x0, y0:d.at + h, x1, y1, b:b.id}); }
    };
    side("n", b.x0, b.y0, b.x1, b.y0 + T);
    side("s", b.x0, b.y1 - T, b.x1, b.y1);
    side("w", b.x0, b.y0, b.x0 + T, b.y1);
    side("e", b.x1 - T, b.y0, b.x1, b.y1);
    // punto de la puerta, del lado de afuera (zona segura de refugios / entrada de los civiles)
    const o = 34;
    b.doorPt = d.side==="s" ? {x:d.at, y:b.y1 + o} : d.side==="n" ? {x:d.at, y:b.y0 - o} : d.side==="e" ? {x:b.x1 + o, y:d.at} : {x:b.x0 - o, y:d.at};
    b.doorIn = d.side==="s" ? {x:d.at, y:b.y1 - T - 40} : d.side==="n" ? {x:d.at, y:b.y0 + T + 40} : d.side==="e" ? {x:b.x1 - T - 40, y:d.at} : {x:b.x0 + T + 40, y:d.at};
    b.doorRect = d.side==="s" ? {x0:d.at - h, y0:b.y1 - T, x1:d.at + h, y1:b.y1} : d.side==="n" ? {x0:d.at - h, y0:b.y0, x1:d.at + h, y1:b.y0 + T}
               : d.side==="e" ? {x0:b.x1 - T, y0:d.at - h, x1:b.x1, y1:d.at + h} : {x0:b.x0, y0:d.at - h, x1:b.x0 + T, y1:d.at + h};
  }
  for(const s of CM_STRUCTS){
    if(s.b){ const b = CM_BLD[s.b]; s.cx = b.cx; s.cy = b.cy; if(s.safe && b.doorPt) CM_SAFE.push({id:s.id, x:b.doorPt.x, y:b.doorPt.y}); }
    else if(s.gate){ s.cx = (s.gate.x0 + s.gate.x1)/2; s.cy = (s.gate.y0 + s.gate.y1)/2; CM_WALLS.push({x0:s.gate.x0, y0:s.gate.y0, x1:s.gate.x1, y1:s.gate.y1, b:"gate"}); CM_SAFE.push({id:s.id, x:s.sx, y:s.sy}); }
  }
})();

/* ---------------- estado ---------------- */
function cmNewState(){
  return {
    lv:1,
    civ:[], nid:1,                   // civiles (ver cm-civilians.js)
    st:CM_STRUCTS.map(s=>({id:s.id, hp:s.hp, max:s.hp, st:CM_ST.INTACT, sh:0, hit:0})),   // estructuras (sh = refugiados)
    saved:0, lost:0, found:0, total:0, kid:0,
    ctx:[],                          // objetivos de RESCATAR (acción contextual)
    alerts:[],                       // alertas prioritarias del HUD [{k, x, y, t, d, txt}]
    shots:[],                        // proyectiles enemigos propios [{x,y,vx,vy,t,d,k,dmg,r}]
    zones:[],                        // zonas en el piso [{k,x,y,r,t,d,...}]
    drops:[],                        // impactos con aviso [{k,x,y,r,t,d,dmg,...}]
    bars:[],                         // barricadas del Tramoyista [{x0,y0,x1,y1,t,d}]
    pillars:[],                      // pilares del escenario (Presentador) [{x,y,r,t,d}]
    bells:CM_MAP.bells.map(()=>({by:0, t:0})),
    sub:{st:"none", t:0},            // nivel 9: Maestro + Tramoyista -> apagón -> Dama del Telón
    pr:{st:"none", t:0, act:0},      // nivel 10: El Presentador
    dark:0,                          // oscurecimiento de pantalla (apagón / Acto III)
    rule:0
  };
}

/* ---------------- geometría dinámica ---------------- */
// paredes activas: fijas + puertas tapiadas de refugios destruidos + barricadas
function cmWallsNow(){
  if(!cmS) return CM_WALLS;
  let extra = null;
  for(let i=0;i<CM_STRUCTS.length;i++){
    const s = CM_STRUCTS[i], S = cmS.st[i];
    if(S.st===CM_ST.DESTROYED && s.b && CM_BLD[s.b].doorRect){ (extra || (extra = [])).push(CM_BLD[s.b].doorRect); }
  }
  if(cmS.bars.length){ extra = extra || []; for(const b of cmS.bars) extra.push(b); }
  return extra ? CM_WALLS.concat(extra) : CM_WALLS;
}
function cmSolidsNow(){
  const L = [CM_MAP.statue].concat(CM_MAP.solids);
  if(cmS && cmS.pillars.length) for(const p of cmS.pillars) if(p.t >= 0) L.push(p);
  return L;
}
function cmGeomSig(){
  if(!cmS) return "";
  let s = "";
  for(const S of cmS.st) s += S.st===CM_ST.DESTROYED ? "1" : "0";
  s += "|" + cmS.bars.map(b=>b.x0|0).join(",") + "|" + cmS.pillars.map(p=>p.x|0).join(",");
  return s;
}
function cmNavMaybe(){ const g = cmGeomSig(); if(g !== _cmNavSig){ _cmNavSig = g; aidNavBuild(); cmSafeFieldsBuild(); } }

function _cmInRect(x, y, r, pad){ return x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad; }
function cmInside(x, y, m){
  const B = CM_BOUNDS, pad = m||0;
  if(x < B.x0 + pad || x > B.x1 - pad || y < B.y0 + pad || y > B.y1 - pad) return false;
  for(const w of cmWallsNow()) if(_cmInRect(x, y, w, pad)) return false;
  for(const s of cmSolidsNow()) if(Math.hypot(x - s.x, y - s.y) < s.r + pad) return false;
  return true;
}
function cmNavBlocked(x, y){ return !cmInside(x, y, 20); }
// círculo contra rectángulo: sale por el lado más cercano
function _cmPushRect(ent, w, r){
  const cx = Math.max(w.x0, Math.min(ent.x, w.x1)), cy = Math.max(w.y0, Math.min(ent.y, w.y1));
  const dx = ent.x - cx, dy = ent.y - cy, d2 = dx*dx + dy*dy;
  if(d2 >= r*r) return false;
  if(d2 > 0.0001){ const d = Math.sqrt(d2); ent.x = cx + dx/d*r; ent.y = cy + dy/d*r; return true; }
  // el centro quedó adentro: por el lado de menor solapamiento
  const l = ent.x - w.x0, rr = w.x1 - ent.x, t = ent.y - w.y0, b = w.y1 - ent.y, m = Math.min(l, rr, t, b);
  if(m===l) ent.x = w.x0 - r; else if(m===rr) ent.x = w.x1 + r; else if(m===t) ent.y = w.y0 - r; else ent.y = w.y1 + r;
  return true;
}
function cmClamp(ent){
  if(!ent) return;
  const B = CM_BOUNDS, r = Math.min(40, (ent.radius||18)*0.8);
  ent.x = Math.max(B.x0 + r, Math.min(B.x1 - r, ent.x));
  ent.y = Math.max(B.y0 + r, Math.min(B.y1 - r, ent.y));
  if(ent.cmGhost) return;                       // Espectro: atraviesa paredes
  const walls = cmWallsNow();
  for(let k=0;k<2;k++){
    let moved = false;
    for(const w of walls){ if(ent.x > w.x0 - r && ent.x < w.x1 + r && ent.y > w.y0 - r && ent.y < w.y1 + r && _cmPushRect(ent, w, r)) moved = true; }
    for(const s of cmSolidsNow()){ const dx = ent.x - s.x, dy = ent.y - s.y, min = s.r + r*0.9, d = Math.hypot(dx, dy); if(d < min){ const q = d || 0.01; ent.x = s.x + dx/q*min; ent.y = s.y + dy/q*min; moved = true; } }
    if(!moved) break;
  }
}
// ¿En qué edificio está este punto? (interior: para el fundido local del techo y los escondites)
function cmBuildingAt(x, y){
  for(const b of CM_BUILDINGS){ if(b.door && x > b.inner.x0 && x < b.inner.x1 && y > b.inner.y0 && y < b.inner.y1) return b; }
  return null;
}
function cmNearestFree(x, y, pad){
  if(cmInside(x, y, pad||20)) return {x, y};
  for(let r=30;r<=420;r+=30){ for(let a=0;a<12;a++){ const q = a/12*Math.PI*2, px = x + Math.cos(q)*r, py = y + Math.sin(q)*r; if(cmInside(px, py, pad||20)) return {x:px, y:py}; } }
  return {x:CM_MAP.start.x, y:CM_MAP.start.y};
}

/* ---------------- campos de flujo hacia las zonas seguras (civiles que corren solos) ---------------- */
let CM_SAFE_FIELD = [];
function cmSafeFieldsBuild(){
  const N = AID_NAV; if(!N.on || !N.blocked) return;
  CM_SAFE_FIELD = CM_SAFE.map(z=>{
    const f = new Uint16Array(N.W*N.H);
    aidNavBfs(f, seed=>seed({alive:true, x:z.x, y:z.y}));
    return f;
  });
}
function cmFieldDir(ent, i){ const f = CM_SAFE_FIELD[i]; return f ? aidNavDir(ent, f) : null; }

/* ---------------- apariciones ---------------- */
function cmMinHeroDist(x, y){ let d = Infinity; for(const h of heroes){ if(h.alive){ const q = Math.hypot(h.x - x, h.y - y); if(q < d) d = q; } } return d; }
function cmRand(a, b){ return a + Math.random()*(b - a); }
function cmPick(a){ return a[(Math.random()*a.length)|0]; }
function cmPlaceSpawn(e, atBoss){
  if(_cmSpawnAt){ e.x = _cmSpawnAt.x; e.y = _cmSpawnAt.y; cmClamp(e); return; }
  if(atBoss || e.rank==="jefe" || e.rank==="subjefe") return;
  // los Perros salen de las cloacas; el resto entra por los bordes de la ciudad (lejos del equipo)
  const pts = e.type==="cm_perro" ? CM_MAP.sewers : CM_MAP.exits;
  const cands = pts.map(p=>({p, d:cmMinHeroDist(p.x, p.y)})).filter(o=>o.d > (e.type==="cm_perro" ? 380 : 520));
  const q = cands.length ? cmPick(cands).p : cmPick(pts);
  const f = cmNearestFree(q.x + cmRand(-40, 40), q.y + cmRand(-40, 40), 24);
  e.x = f.x; e.y = f.y;
  e.cmEmerge = e.type==="cm_perro" ? 600 : 0;
  if(e.type==="cm_perro" && inView(e.x, e.y, 160)) vfxBurst(e.x, e.y, 6, "blood", 60, 500, 3, 0, -20, 1);
}
function cmSpawnAt(type, x, y){ _cmSpawnAt = {x, y}; const e = spawnEnemy(type, false); _cmSpawnAt = null; return e; }
