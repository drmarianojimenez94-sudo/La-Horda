"use strict";
/* ============================================================
   js/arenas/micelial/mic-map.js
   EL REINO MICELIAL — geometría (caverna orgánica + capullo sólido), aparición por túneles,
   ciclo de vida del escenario (MICELIAL_STAGE) y estado sincronizado de la arena.

   Reglas de seguridad (sin softlocks):
   - Lo caminable es UNA elipse con borde ondulado hacia adentro, menos el capullo del centro.
     Es un solo tramo conexo: todos pueden llegar caminando a todos, siempre.
   - clamp() nunca mata: lleva al punto caminable más cercano (borde o costado del capullo).
   - Lo que cambia el juego (etapa, núcleos, nubes, raíces, fases de la Madre) lo decide el
     anfitrión y viaja en micNetState(); lo decorativo (partículas, crecimiento suave de los
     hongos) lo anima cada cliente por su cuenta.
   ============================================================ */
let micS = null;            // estado de la partida (lo que se sincroniza)
let _micSpawnAt = null;     // si está puesto, el próximo enemigo aparece acá (packs, adds, núcleos)
let _micNavT = 0;

function micNewState(){
  return {
    stage:0, lv:1,
    nodes:"",                 // FUNGAL_NODE: 1 carácter por lugar (ver mic-ecosystem.js)
    clouds:[],                // nubes de esporas [{x,y,r,t,d,s,p,k}]
    recede:[],                // infección que se retira tras destruir un núcleo [{x,y,r,t}]
    roots:[],                 // raíces gigantes que cruzan la arena (niveles 7-10) [{x0,y0,x1,y1,t,w,d}]
    arms:[],                  // brazos de la Madre que golpean desde arriba [{x,y,t,d,s}]
    giants:[],                // hongos gigantes que brotan (Madre, niv. 7-9) [{x,y,t,d}]
    hal:[],                   // alucinaciones (fase 2: no hacen daño) [{x,y,k,t,d,vx,vy}]
    corpses:0,                // cadáveres ya arrastrados por el Micelio (máscara de bits)
    mi:{st:"none", t:0, x:0, y:0},       // Micelio Primigenio (nivel 6)
    mo:{st:"sleep", t:0, ph:1, dark:0, bloom:0, inf:0, beat:0}, // MOTHER_SPORE_CONTROLLER
    inter:{t:9000, n:0},      // intervenciones de la Madre (niveles 7-9)
    nucT:9000, nucShown:0,    // director de Núcleos
    dead:0                    // el Reino murió (arena desaturada y en silencio)
  };
}

/* ---------------- geometría ---------------- */
// Borde de la caverna: la elipse "respira" hacia adentro con dos ondas (nunca muestra el vacío).
function micEdgeK(a){ return 1 - 0.045*(0.5 + 0.5*Math.sin(3*a + 1.1)) - 0.03*(0.5 + 0.5*Math.sin(7*a + 2.3)) - 0.015*(0.5 + 0.5*Math.sin(13*a + 0.4)); }
// Distancia normalizada al centro de la elipse relativa a su borde ondulado (1 = justo en el borde).
function micEllNorm(x, y){
  const E = MIC_MAP.ell, dx = (x - E.cx)/E.rx, dy = (y - E.cy)/E.ry;
  return Math.hypot(dx, dy)/micEdgeK(Math.atan2(dy, dx));
}
function micPodSolid(){ return true; } // el capullo (y después la Madre) es siempre sólido
function micInside(x, y, m){
  m = m||0;
  const E = MIC_MAP.ell, dx = (x - E.cx)/E.rx, dy = (y - E.cy)/E.ry;
  const k = micEdgeK(Math.atan2(dy, dx));
  if(Math.hypot(dx, dy) > k - m/Math.min(E.rx, E.ry)) return false;
  const P = MIC_MAP.pod;
  if(micPodSolid() && Math.hypot(x - P.x, y - P.y) < P.r + m) return false;
  return true;
}
// Punto del borde de la caverna en el ángulo a (desde el centro de la elipse), hacia adentro `m`.
function micEdgePoint(a, m){
  const E = MIC_MAP.ell, k = micEdgeK(a);
  const ex = Math.cos(a)*E.rx*k, ey = Math.sin(a)*E.ry*k, l = Math.hypot(ex, ey)||1;
  return {x:E.cx + ex - ex/l*(m||0), y:E.cy + ey - ey/l*(m||0)};
}
// HONGOS SÓLIDOS: las hileras grandes, las lámparas altas, los pilares y los hongos gigantes de la
// Madre se veían como paredes pero se atravesaban. Ahora chocan en la BASE del tallo (círculos
// chicos, contra medio radio del cuerpo como el capullo). Con los nodos a >= 92 u entre sí, el
// alcance máximo de cada hongo (30 u) deja siempre un paso >= 28 u: nunca cierran un bolsillo.
const MIC_SOLID_SHAPE = { pillar:[[0,20]], lamp:[[0,12]], grove:[[-14,12],[0,12],[14,12]], row:[[-10,10],[10,10]] };
const MIC_SOLID_STATES = [0,0,1,1,1,1,0,0]; // GROWN, MATURE, SPORE, WITHERED
let _micSolids = [], _micSolidsKey = "";
function micSolids(){
  if(!micS) return _micSolids;
  let key = micS.nodes||"";
  for(const g of micS.giants) key += "|" + g.x + (g.t > 1300 && g.t < g.d - 1200 ? "+" : "-");
  if(key === _micSolidsKey) return _micSolids;
  _micSolidsKey = key; _micSolids = [];
  const nodes = micS.nodes||"";
  for(let i=0;i<MIC_NODES.length && i<nodes.length;i++){
    const n = MIC_NODES[i], sh = MIC_SOLID_SHAPE[n.kind]; if(!sh) continue;
    if(!MIC_SOLID_STATES[nodes.charCodeAt(i) - 48]) continue;
    for(const c of sh) _micSolids.push({x:n.x + c[0]*n.s*(n.flip ? -1 : 1), y:n.y, r:c[1]*n.s});
  }
  for(const g of micS.giants){ if(g.t > 1300 && g.t < g.d - 1200) _micSolids.push({x:g.x, y:g.y, r:24}); }
  return _micSolids;
}
function micPushSolids(ent){
  const half = ent.radius ? Math.min(ent.radius, 30)*0.5 : 8;
  for(const c of micSolids()){
    const dx = ent.x - c.x, dy = ent.y - c.y, R = c.r + half;
    if(Math.abs(dx) > R || Math.abs(dy) > R) continue;
    const d = Math.hypot(dx, dy);
    if(d < R){ const l = d || 1; ent.x = c.x + (d ? dx/l : 1)*R; ent.y = c.y + (d ? dy/l : 0)*R; }
  }
}
function micClamp(ent){
  if(!ent || ent.micStatic) return;
  const E = MIC_MAP.ell, P = MIC_MAP.pod, m = 6;
  const dx = (ent.x - E.cx)/E.rx, dy = (ent.y - E.cy)/E.ry, a = Math.atan2(dy, dx);
  const k = micEdgeK(a) - m/Math.min(E.rx, E.ry), n = Math.hypot(dx, dy);
  if(n > k){ ent.x = E.cx + dx/n*k*E.rx; ent.y = E.cy + dy/n*k*E.ry; }
  if(micPodSolid()){
    const px = ent.x - P.x, py = ent.y - P.y, d = Math.hypot(px, py), R = P.r + (ent.radius ? Math.min(ent.radius, 30)*0.5 : 8);
    if(d < R){ const l = d || 1; ent.x = P.x + (d ? px/l : 0)*R; ent.y = P.y + (d ? py/l : 1)*R; }
  }
  if(!(ent.rank==="jefe" || ent.structure || (ent.radius||0) > 60)) micPushSolids(ent); // los grandes pasan por encima
}
function micNavBlocked(x, y){ return !micInside(x, y, 14); }
function micRand(a, b){ return a + Math.random()*(b - a); }
function micRandPick(a){ return a[(Math.random()*a.length)|0]; }
function micAliveHeroes(){ return heroes.filter(h=>h.alive); }
function micMinHeroDist(x, y){ let d = Infinity; for(const h of heroes){ if(h.alive){ const q = Math.hypot(h.x-x, h.y-y); if(q < d) d = q; } } return d; }
// Punto caminable al azar a cierta distancia de (x,y). Siempre devuelve algo válido.
function micPointNear(x, y, d0, d1, m){
  for(let t=0;t<24;t++){
    const a = Math.random()*Math.PI*2, d = micRand(d0, d1), px = x + Math.cos(a)*d, py = y + Math.sin(a)*d;
    if(micInside(px, py, m||30)) return {x:px, y:py};
  }
  const c = {x:x + (Math.random()-0.5)*40, y:y + (Math.random()-0.5)*40, radius:20}; micClamp(c);
  return {x:c.x, y:c.y};
}

/* ---------------- aparición por los túneles ---------------- */
function micPlaceSpawn(e, atBoss){
  if(_micSpawnAt){ e.x = _micSpawnAt.x; e.y = _micSpawnAt.y; micClamp(e); return; }
  if(atBoss || e.rank==="jefe" || e.rank==="subjefe") return; // los ubica quien los crea
  const cands = [];
  for(const a of MIC_MAP.tunnels){
    const p = micEdgePoint(a, 40), dm = micMinHeroDist(p.x, p.y);
    if(dm < 430) continue;                                 // nunca encima del equipo
    cands.push({x:p.x, y:p.y, w: dm < 1300 ? 3 : 0.6});
  }
  let p = null;
  if(cands.length){
    let tot = 0; for(const c of cands) tot += c.w;
    let r = Math.random()*tot; for(const c of cands){ r -= c.w; if(r <= 0){ p = c; break; } }
    p = p || cands[0];
  } else {
    const h = micRandPick(micAliveHeroes()) || player;
    p = micPointNear(h.x, h.y, 440, 620, 30);
  }
  e.x = p.x + (Math.random()-0.5)*50; e.y = p.y + (Math.random()-0.5)*50;
  micClamp(e);
  // brota del suelo: un puñado de esporas donde aparece (solo si se ve)
  if(Math.random() < 0.4 && inView(e.x, e.y, 160)) vfxBurst(e.x, e.y-10, 5, "micSpore", 60, 500, 3, 0, -30, 1);
  // los Sabuesos llegan en jauría
  if(e.type==="sabueso" && !e._micPack){
    const C = MIC_CFG.sabueso, n = Math.round(micRand(C.packExtra[0], C.packExtra[1] + 0.99));
    const alive = enemies.filter(o=>o.alive && o.type==="sabueso").length;
    for(let i=0;i<n && alive + i < C.packMaxAlive;i++){
      _micSpawnAt = {x:e.x + (Math.random()-0.5)*90, y:e.y + (Math.random()-0.5)*90};
      const s = spawnEnemy("sabueso", false); s._micPack = 1;
      _micSpawnAt = null;
    }
    e._micPack = 1;
  }
}
function micSpawnAt(type, x, y){
  _micSpawnAt = {x, y};
  const e = spawnEnemy(type, false);
  _micSpawnAt = null;
  e._micPack = 1;
  return e;
}
// La colonia se vuelve más variada y más dura con cada etapa del ciclo de vida.
function micSpawnPool(level){
  const P = [], add = (t, w)=>P.push({t, w});
  if(level <= 1){ add("infectado", 10); add("sabueso", 3); }
  else if(level === 2){ add("infectado", 9); add("sabueso", 4); add("acechador", 3); }
  else if(level === 3){ add("infectado", 9); add("sabueso", 4); add("acechador", 3); add("peregrino", 2.5); }
  else if(level === 4){ add("infectado", 9); add("sabueso", 4); add("acechador", 3); add("peregrino", 2.5); add("hinchado", 1.3); }
  else if(level <= 6){ add("infectado", 8); add("sabueso", 4); add("acechador", 3.5); add("peregrino", 2.5); add("hinchado", 1.4); add("chaman", 1.4); }
  else if(level <= 9){ add("infectado", 8); add("sabueso", 4); add("acechador", 4); add("peregrino", 3); add("hinchado", 1.8); add("chaman", 1.8); }
  else { add("infectado", 8); add("sabueso", 3); add("peregrino", 3); }
  // topes por tipo: los que se plantan a distancia o son élites no se acumulan (la presión viene
  // de la colonia y de los núcleos, no de una pared de tiradores)
  const cap = {peregrino:4, hinchado:3, chaman:2, acechador:5};
  const n = {}; for(const e of enemies){ if(e.alive && cap[e.type]) n[e.type] = (n[e.type]||0) + 1; }
  for(const p of P){ if(cap[p.t] && (n[p.t]||0) >= cap[p.t]) p.w = 0; }
  return P;
}
// Ritmo de aparición: jaurías y élites cuentan por varios. En el nivel 10 el Reino "contiene la
// respiración" (casi no aparece nada mientras la Madre despierta).
function micSpawnIntervalMult(){
  if(!micS) return 1.3;
  if(runLevel === LEVEL_COUNT) return 3.2;
  return 1.5;
}

/* ---------------- ciclo de vida del escenario ---------------- */
function micBeginLevel(){
  if(!micS) return;
  const lv = runLevel, prev = micS.stage, st = micStageForLevel(lv);
  micS.lv = lv; micS.stage = st;
  micS.nucT = Math.min(micS.nucT, 6000);
  micS.inter.t = 6000 + Math.random()*3000;
  if(lv === 1){
    arenaTitleCard("ARENA IV", "EL REINO MICELIAL", "Todo lo que ves está vivo. Y crece.", 5200);
    runLater(6200, ()=>{ if(state==="playing" && micS && micS.lv===1) showBanner("El capullo del centro late… no lo pierdas de vista"); });
  } else if(st !== prev){
    const S = MIC_STAGES[st];
    playSfx("micRumble"); vfxShake(5);
    runLater(700, ()=>{ if(state==="playing") showBanner(`🍄 ${S.name.toUpperCase()} — el Reino cambia`); });
  }
  if(lv === LEVEL_COUNT) micMotherLevelStart();
}

/* ---------------- héroes al arrancar ---------------- */
function micRunStart(){
  micS = micNewState();
  micEcoReset();
  micRenderReset();
  _micNucSeen = [];
  const S = MIC_MAP.start;
  heroes.forEach((h, i)=>{ const a = (i/heroes.length)*Math.PI*2 + Math.PI/4; h.x = S.x + (i ? Math.cos(a)*70 : 0); h.y = S.y + (i ? Math.sin(a)*70 : 0); });
  _micNavT = 0;
}

/* ---------------- cada cuadro (anfitrión / partida local) ---------------- */
function micUpdate(dt){
  if(!micS) return;
  micEcoUpdate(dt);
  micNucleoDirector(dt);
  micCloudsUpdate(dt, true);
  micInfectionApply(dt);
  micMicelioDirector(dt);
  micMotherController(dt);
  micEnemyWorldUpdate(dt);
  micRenderTick(dt);
  _micNavT -= dt;
  if(_micNavT <= 0 && !micS._nav){ micS._nav = 1; aidNavBuild(); }
  for(const h of heroes){ if(!h.duelActive && !h.isDuelLocked) micClamp(h); }
}
// Invitado: el estado real llega en cada snapshot; acá solo se animan relojes decorativos.
function micGuestUpdate(dt){
  if(!micS) return;
  micCloudsUpdate(dt, false);
  for(const r of micS.roots) r.t += dt;
  for(const a of micS.arms) a.t += dt;
  for(const g of micS.giants) g.t += dt;
  for(const z of micS.hal){ z.t += dt; z.x += z.vx*dt/1000; z.y += z.vy*dt/1000; }
  for(const z of micS.recede) z.t += dt;
  micS.mi.t += dt; micS.mo.t += dt;
  micRenderTick(dt);
}
// Estado que manda el anfitrión: compacto (sin temporizadores internos ni caches).
function micNetState(){
  if(!micS) return null;
  const s = Object.assign({}, micS);
  delete s._nav;
  return s;
}
function micApplyNetState(v){
  if(!v) return;
  if(!micS){ micS = micNewState(); micEcoReset(); micRenderReset(); }
  Object.assign(micS, v);
}

/* ---------------- bots: a quién pegarle primero ---------------- */
// Chamán (apoyo) > Núcleo muy crecido (si la infección es alta) > Raíz de Absorción > corazón (fase 3).
function micBotTarget(h, range){
  if(!micS) return null;
  let best = null, bs = -Infinity;
  const inf = micInfectionLevel();
  for(const e of enemies){
    if(!e.alive) continue;
    const d = Math.hypot(e.x-h.x, e.y-h.y); if(d > range) continue;
    let s = -Infinity;
    if(e.type==="chaman") s = 500 - d*0.4;
    else if(e.type==="raiz_absorcion") s = 460 - d*0.4;
    else if(e.type==="nucleo_micelial" && e.nuc && (e.nuc.st >= 3 || inf >= 5)) s = 380 + e.nuc.st*30 - d*0.45;
    else if(e.type==="madre_espora" && micS.mo.ph===3 && micS.mo.st==="fight") s = 420 - d*0.2;
    if(s > bs){ bs = s; best = e; }
  }
  return best;
}
