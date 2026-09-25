"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-map.js
   LA FORTALEZA SIN FIN — geometría viva: plataformas, puertas, puentes que giran / se deslizan /
   se retraen / bajan, conectividad, navegación, sectores y avance del recorrido.

   Reglas de seguridad (sin softlocks):
   - Lo caminable es la UNIÓN de rectángulos (rotados) de fortShapes. clamp() nunca deja a nadie
     sobre la lava: lo lleva al borde caminable más cercano (nunca lo mata).
   - Un puente que se mueve SIGUE siendo caminable y LLEVA encima a quien esté parado sobre él
     (y no sobre una plataforma fija). Un brazo que se retrae empuja hacia el disco central.
   - Toda reconfiguración avisa (sonido fuerte + temblor + engranajes + cartel) y espera ~2,6 s.
   - Los mecanismos solo ciclan mientras haya alguien en su sector; ciclan siempre (nunca quedan
     trabados en una configuración que deje a alguien aislado). Si nadie está en el sector,
     vuelven a la posición que deja el camino hacia adelante abierto.
   - El estado lo decide el anfitrión y viaja en el snapshot (fortNetState); el invitado solo anima.
   ============================================================ */
let fortS = null;          // estado de la partida (lo que se sincroniza)
let fortShapes = [];       // formas caminables actuales {cx,cy,hw,hh,rot,c,s,src,comp}
let fortGeomDirty = true;
let _fortNavT = 0;

function fortNewState(){
  const st = {sector:0, lastSectorShown:-1, gates:{}, lift:{}, rot:{}, slide:{}, knight:{state:"none", t:0}, dragon:{state:"none"}, reconfShown:false, cycleOn:false};
  for(const g of FORT_MAP.gates) st.gates[g.id] = {open:0, want:0};
  st.lift.db_forge = {down:0, want:0};
  // el giratorio arranca RECOGIDO (Oeste-Este): así no hace de atajo sobre la puerta de los Puentes antes del nivel 5
  st.rot.hub = {idx:1, ang:0, from:0, to:0, phase:"hold", t:0, hold:9000};
  for(const k of ["core_s","core_n","core_w","core_e"]) st.rot[k] = {ext:1, from:1, to:1, phase:"hold", t:0};
  st.rot.core = {phase:"hold", t:0, hold:9000, pat:0};
  st.slide.sl_int = {x:FORT_MAP.bridges.find(b=>b.id==="sl_int").ax, from:0, to:0, phase:"hold", t:0, hold:9000, side:0};
  return st;
}

/* ---------------- geometría ---------------- */
function _fortOBB(cx, cy, hw, hh, rot, src){ return {cx, cy, hw, hh, rot, c:Math.cos(rot), s:Math.sin(rot), src, comp:-1}; }
function fortArmShape(b){
  const R = FORT_MAP.rotors[b.rotor], st = fortS.rot[b.rotor];
  let ang = b.off, r1 = b.r1;
  if(R.kind==="rotate") ang = st.ang + b.off;
  else r1 = b.r0 + (b.r1 - b.r0)*st.ext;
  if(r1 - b.r0 < 12) return null;
  const mid = (b.r0 + r1)/2;
  return _fortOBB(R.x + Math.cos(ang)*mid, R.y + Math.sin(ang)*mid, (r1-b.r0)/2, b.hw, ang, b);
}
function fortRebuildShapes(){
  const out = [];
  for(const p of FORT_MAP.plats) out.push(_fortOBB(p.cx, p.cy, p.hw, p.hh, 0, p));
  for(const g of FORT_MAP.gates){ if(fortS.gates[g.id].open >= 0.6) out.push(_fortOBB(g.cx, g.cy, g.hw, g.hh, 0, g)); }
  for(const b of FORT_MAP.bridges){
    if(b.kind==="arm"){ const s = fortArmShape(b); if(s) out.push(s); }
    else if(b.kind==="lift"){ if(fortS.lift[b.id].down >= 0.98) out.push(_fortOBB(b.cx, b.cy, b.hw, b.hh, 0, b)); }
    else if(b.kind==="slide"){ out.push(_fortOBB(fortS.slide[b.id].x, b.cy, b.hw, b.hh, 0, b)); }
  }
  fortShapes = out;
  fortComputeComponents();
  fortGeomDirty = false;
}
const FORT_EDGE = 10; // margen hacia adentro del borde (nadie queda con medio cuerpo sobre la lava)
function _fortLocal(s, x, y){ const dx = x - s.cx, dy = y - s.cy; return [dx*s.c + dy*s.s, -dx*s.s + dy*s.c]; }
function _fortIn(s, x, y, m){ const L = _fortLocal(s, x, y); return Math.abs(L[0]) <= s.hw - m && Math.abs(L[1]) <= s.hh - m; }
function fortShapeAt(x, y, m){
  if(m===undefined) m = FORT_EDGE;
  for(let i=0;i<fortShapes.length;i++){ if(_fortIn(fortShapes[i], x, y, m)) return fortShapes[i]; }
  return null;
}
function fortWalkable(x, y, m){ return !!fortShapeAt(x, y, m); }
// Punto caminable más cercano (proyección sobre cada forma, se queda con la más cercana).
function fortNearest(x, y, m){
  if(m===undefined) m = FORT_EDGE;
  let bx = x, by = y, bd = Infinity, bs = null;
  for(const s of fortShapes){
    const L = _fortLocal(s, x, y);
    const hw = Math.max(1, s.hw - m), hh = Math.max(1, s.hh - m);
    const lx = Math.max(-hw, Math.min(hw, L[0])), ly = Math.max(-hh, Math.min(hh, L[1]));
    const px = s.cx + lx*s.c - ly*s.s, py = s.cy + lx*s.s + ly*s.c;
    const d = (px-x)*(px-x) + (py-y)*(py-y);
    if(d < bd){ bd = d; bx = px; by = py; bs = s; }
  }
  return {x:bx, y:by, s:bs};
}
function fortClamp(ent){
  if(!fortS) return;
  if(fortGeomDirty) fortRebuildShapes();
  const B = FORT_MAP.bounds;
  if(ent.flying || ent.fortNoClamp){
    ent.x = Math.max(B.x0, Math.min(B.x1, ent.x)); ent.y = Math.max(B.y0, Math.min(B.y1, ent.y));
    return;
  }
  const last = ent._fs;
  if(last && fortShapes.includes(last) && _fortIn(last, ent.x, ent.y, FORT_EDGE)) return;
  const s = fortShapeAt(ent.x, ent.y);
  if(s){ ent._fs = s; return; }
  const n = fortNearest(ent.x, ent.y);
  if(n.s){ ent.x = n.x; ent.y = n.y; ent._fs = n.s; }
}

/* ---------------- conectividad (quién puede llegar caminando a quién) ---------------- */
function _fortCorners(s, m){
  const hw = s.hw - m, hh = s.hh - m, out = [];
  for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ out.push([s.cx + a*hw*s.c - b*hh*s.s, s.cy + a*hw*s.s + b*hh*s.c]); }
  return out;
}
function _fortOverlap(a, b){
  // SAT sobre los rectángulos ya achicados por el margen: si se solapan, se puede pasar de uno al otro
  const A = _fortCorners(a, FORT_EDGE+6), Bc = _fortCorners(b, FORT_EDGE+6);
  const axes = [[a.c, a.s], [-a.s, a.c], [b.c, b.s], [-b.s, b.c]];
  for(const [ax, ay] of axes){
    let amin=Infinity, amax=-Infinity, bmin=Infinity, bmax=-Infinity;
    for(const p of A){ const v = p[0]*ax + p[1]*ay; if(v<amin) amin=v; if(v>amax) amax=v; }
    for(const p of Bc){ const v = p[0]*ax + p[1]*ay; if(v<bmin) bmin=v; if(v>bmax) bmax=v; }
    if(amax < bmin || bmax < amin) return false;
  }
  return true;
}
function fortComputeComponents(){
  const n = fortShapes.length; let comp = 0;
  for(const s of fortShapes) s.comp = -1;
  for(let i=0;i<n;i++){
    if(fortShapes[i].comp >= 0) continue;
    const stack = [i]; fortShapes[i].comp = comp;
    while(stack.length){
      const k = stack.pop();
      for(let j=0;j<n;j++){ if(fortShapes[j].comp < 0 && _fortOverlap(fortShapes[k], fortShapes[j])){ fortShapes[j].comp = comp; stack.push(j); } }
    }
    comp++;
  }
}
function fortCompAt(x, y){ const s = fortShapeAt(x, y, 0) || fortNearest(x, y, 0).s; return s ? s.comp : -1; }
function fortReachable(a, b){ if(!a || !b) return true; return fortCompAt(a.x, a.y) === fortCompAt(b.x, b.y); }
function fortHeroComps(includeDead){
  const set = new Set();
  for(const h of heroes){ if(h.alive || includeDead) set.add(fortCompAt(h.x, h.y)); }
  return set;
}

/* ---------------- sector / avance ---------------- */
function fortShapeSector(x, y){ const s = fortShapeAt(x, y, 0); return s && s.src && s.src.sector!==undefined ? s.src.sector : -1; }
function fortHeroesInSector(sec, includeDead){
  for(const h of heroes){ if((h.alive || includeDead) && fortShapeSector(h.x, h.y)===sec) return true; }
  return false;
}
function fortGate(id){ return FORT_MAP.gates.find(g=>g.id===id); }
function fortOpenGate(id, how){
  const g = fortS.gates[id]; if(!g || g.want===1) return;
  g.want = 1;
  const G = fortGate(id);
  if(how==="blast"){
    g.open = 1; fortGeomDirty = true;
    vfxShock(G.cx, G.cy, 20, 260, "255,150,60", 800, 2);
    vfxBurst(G.cx, G.cy-30, 34, "rock", 260, 800, 5, 2, -80, 0);
    vfxBurst(G.cx, G.cy-40, 26, "ember", 220, 900, 4, 2, -60, 0);
    if(typeof vfxSprite==="function"){ vfxSprite("fortExplosion", 0, G.cx, G.cy+10, 220, 900, null, 0.3, false, 0.8); }
    vfxShake(14); flashScreen(0.35, "255,190,120"); playSfx("fortBlast");
  } else {
    playSfx("fortGate");
    vfxBurst(G.cx, G.cy-40, 12, "rock", 120, 500, 3, 1, -30, 0);
  }
}
function fortCloseGate(id){ const g = fortS.gates[id]; if(g && g.want!==0){ g.want = 0; playSfx("fortGate"); } }

function fortBeginLevel(){
  if(!fortS) return;
  const lv = runLevel, sec = fortSectorForLevel(lv);
  const prev = fortS.sector;
  fortS.sector = sec;
  for(const G of FORT_MAP.gates){
    if(G.id==="g_blast" || G.id==="g_knight") continue;
    if(lv >= G.openAt) fortOpenGate(G.id);
  }
  if(lv >= 7) fortOpenGate("g_blast", fortS.gates.g_blast.open<1 ? "blast" : null); // red de seguridad (la abre la muerte del Dragón)
  if(lv >= 6 && fortS.lift.db_forge.want!==1){ fortS.lift.db_forge.want = 1; playSfx("fortBridge"); }
  if(lv===1){
    arenaTitleCard("ARENA III", "LA FORTALEZA SIN FIN", "Las máquinas todavía recuerdan a sus prisioneros.", 5200);
  } else if(sec !== prev){
    const S = FORT_SECTORS[sec];
    runLater(900, ()=>{ if(state==="playing") showBanner(`⚙ ${S.name.toUpperCase()} — ¡AVANZÁ!`); });
  }
  if(lv===LEVEL_COUNT) fortKnightLevelStart();
}

/* ---------------- mecanismos (puentes) ---------------- */
function _rnd(a, b){ return a + Math.random()*(b-a); }
function fortWarn(x, y, label){
  playSfx("fortBridgeWarn");
  vfxShake(5);
  if(label) showBanner(label);
  vfxBurst(x, y-20, 10, "rock", 90, 500, 3, 1, -20, 0);
}
// Lleva encima a quien esté parado sobre la forma `shape` (y no sobre una plataforma fija).
function _fortRidersOf(src){
  const out = [];
  const onStatic = (x, y)=>{ for(const s of fortShapes){ if(s.src===src) continue; if(s.src && (s.src.kind==="arm" || s.src.kind==="slide")) continue; if(_fortIn(s, x, y, 0)) return true; } return false; };
  const sh = fortShapes.find(s=>s.src===src);
  if(!sh) return out;
  const test = (o)=>{ if(o && !o.flying && _fortIn(sh, o.x, o.y, 0) && !onStatic(o.x, o.y)) out.push(o); };
  for(const h of heroes) test(h);
  for(const e of enemies) if(e.alive && e.rank!=="jefe") test(e);
  for(const p of potions) test(p);
  return out;
}
function _fortRotateRiders(riders, px, py, dAng){
  const c = Math.cos(dAng), s = Math.sin(dAng);
  for(const o of riders){ const dx = o.x-px, dy = o.y-py; o.x = px + dx*c - dy*s; o.y = py + dx*s + dy*c; if(o.fx!==undefined){ const fx = o.fx*c - o.fy*s; o.fy = o.fx*s + o.fy*c; o.fx = fx; } }
}
function fortUpdateHubRotor(dt){
  const st = fortS.rot.hub, R = FORT_MAP.rotors.hub, C = FORT_CFG.bridge;
  const active = runLevel >= 5 && fortS.gates.g_bridges.open >= 1;
  const someone = fortHeroesInSector(2, true);
  st.t += dt;
  if(st.phase==="hold"){
    if(!active) return;
    // sin nadie en el sector: vuelve (y se queda) en la posición que deja el camino abierto
    const wantIdle = !someone && st.idx!==0;
    if((someone && st.t >= st.hold) || wantIdle){
      st.phase = "warn"; st.t = 0; st.next = st.idx===0 ? 1 : 0;
      fortWarn(R.x, R.y, fortS.reconfShown ? "⚙ El puente giratorio se mueve" : "⚙ ¡LA FORTALEZA SE RECONFIGURA!");
      fortS.reconfShown = true;
    }
  } else if(st.phase==="warn"){
    if(Math.random() < dt/120) vfxBurst(R.x + (Math.random()-0.5)*200, R.y + (Math.random()-0.5)*200, 2, "rock", 60, 400, 3, 0, -20, 1);
    if(st.t >= C.warnMs){ st.phase = "move"; st.t = 0; st.from = st.ang; st.to = R.states[st.next] + (st.next===1 && st.ang>0.1 ? 0 : 0); playSfx("fortBridge"); }
  } else if(st.phase==="move"){
    const q = Math.min(1, st.t / C.rotateMs), e = q<0.5 ? 2*q*q : 1-Math.pow(-2*q+2,2)/2;
    const prevAng = st.ang;
    // gira siempre 90° en el mismo sentido visual (el engranaje central no "retrocede")
    let d = st.to - st.from; while(d > Math.PI) d -= Math.PI*2; while(d < -Math.PI) d += Math.PI*2;
    st.ang = st.from + d*e;
    const dA = st.ang - prevAng;
    if(dA){
      const riders = [];
      for(const b of FORT_MAP.bridges) if(b.rotor==="hub") for(const o of _fortRidersOf(b)) if(!riders.includes(o)) riders.push(o);
      fortGeomDirty = true; fortRebuildShapes();
      _fortRotateRiders(riders, R.x, R.y, dA);
    }
    if(Math.random() < dt/90) vfxBurst(R.x, R.y, 2, "ember", 80, 300, 2.5, 0, -10, 1);
    if(q >= 1){ st.ang = st.to; st.idx = st.next; st.phase = "hold"; st.t = 0; st.hold = _rnd(C.holdMs[0], C.holdMs[1]); fortGeomDirty = true; playSfx("fortClank"); vfxShake(4); }
  }
}
function fortUpdateCoreRotors(dt){
  const cst = fortS.rot.core, C = FORT_CFG.bridge;
  const active = runLevel >= 9 && fortS.gates.g_core.open >= 1;
  const someone = fortHeroesInSector(5, true);
  const PATS = [["core_s","core_n"], ["core_w","core_e"], ["core_s","core_w"], ["core_n","core_e"], ["core_s","core_e"], ["core_n","core_w"]];
  cst.t += dt;
  const moving = ["core_s","core_n","core_w","core_e"].some(k=>fortS.rot[k].phase==="move");
  if(cst.phase==="hold"){
    // nivel 10 / nadie en el Núcleo: todos los brazos extendidos (camino libre)
    const wantAll = !active || !someone || runLevel >= LEVEL_COUNT;
    if(wantAll){ for(const k of ["core_s","core_n","core_w","core_e"]) _fortSetArm(k, 1); return; }
    if(cst.t >= cst.hold){
      cst.phase = "warn"; cst.t = 0; cst.pat = (cst.pat + 1 + ((Math.random()*2)|0)) % PATS.length;
      fortWarn(0, -2900, fortS.reconfShown ? "⚙ Los brazos del Núcleo cambian" : "⚙ ¡LA FORTALEZA SE RECONFIGURA!");
      fortS.reconfShown = true;
    }
  } else if(cst.phase==="warn"){
    if(cst.t >= C.warnMs){
      const keep = PATS[cst.pat];
      for(const k of ["core_s","core_n","core_w","core_e"]) _fortSetArm(k, keep.includes(k) ? 1 : 0);
      cst.phase = "hold"; cst.t = 0; cst.hold = _rnd(C.coreHoldMs[0], C.coreHoldMs[1]);
    }
  }
  for(const k of ["core_s","core_n","core_w","core_e"]){
    const a = fortS.rot[k];
    if(a.phase!=="move") continue;
    a.t += dt;
    const q = Math.min(1, a.t / C.retractMs);
    a.ext = a.from + (a.to - a.from)*q;
    fortGeomDirty = true;
    if(q >= 1){ a.ext = a.to; a.phase = "hold"; playSfx("fortClank"); }
  }
  if(moving && Math.random() < dt/100) vfxBurst(_rnd(-200,200), -2900 + _rnd(-200,200), 2, "ember", 70, 300, 2.5, 0, -10, 1);
}
function _fortSetArm(k, want){
  const a = fortS.rot[k];
  if(a.phase==="move" ? a.to===want : a.ext===want) return;
  a.phase = "move"; a.t = 0; a.from = a.ext; a.to = want;
  playSfx("fortBridge");
}
function fortUpdateSlide(dt){
  const st = fortS.slide.sl_int, B = FORT_MAP.bridges.find(b=>b.id==="sl_int"), C = FORT_CFG.bridge;
  const someone = fortHeroesInSector(4, true);
  st.t += dt;
  if(st.phase==="hold"){
    if(runLevel < 7 || !someone) return;
    if(st.t >= st.hold){ st.phase = "warn"; st.t = 0; fortWarn(st.x, B.cy, "⚙ La plataforma del canal se desliza"); }
  } else if(st.phase==="warn"){
    if(st.t >= C.warnMs){ st.phase = "move"; st.t = 0; st.from = st.x; st.to = st.side===0 ? B.bx : B.ax; playSfx("fortBridge"); }
  } else if(st.phase==="move"){
    const q = Math.min(1, st.t / C.slideMs), e = q<0.5 ? 2*q*q : 1-Math.pow(-2*q+2,2)/2;
    const nx = st.from + (st.to - st.from)*e, dx = nx - st.x;
    if(dx){
      const riders = _fortRidersOf(B);
      st.x = nx; fortGeomDirty = true; fortRebuildShapes();
      for(const o of riders) o.x += dx;
    }
    if(q >= 1){ st.x = st.to; st.side = 1 - st.side; st.phase = "hold"; st.t = 0; st.hold = _rnd(C.slideHoldMs[0], C.slideHoldMs[1]); playSfx("fortClank"); }
  }
}
function fortUpdateGates(dt){
  for(const G of FORT_MAP.gates){
    const g = fortS.gates[G.id];
    if(g.open === g.want) continue;
    const before = g.open >= 0.6;
    // nunca cerrar con alguien parado en el hueco de la puerta
    if(g.want===0){ const blocked = heroes.some(h=>_fortIn(_fortOBB(G.cx, G.cy, G.hw, G.hh, 0, G), h.x, h.y, -24)); if(blocked) continue; }
    g.open = Math.max(0, Math.min(1, g.open + (g.want ? 1 : -1)*dt/1200));
    if((g.open >= 0.6) !== before) fortGeomDirty = true;
  }
  const L = fortS.lift.db_forge;
  if(L.down !== L.want){
    const before = L.down >= 0.98;
    L.down = Math.max(0, Math.min(1, L.down + (L.want ? 1 : -1)*dt/FORT_CFG.bridge.lowerMs));
    if((L.down >= 0.98) !== before){ fortGeomDirty = true; if(L.down >= 0.98){ playSfx("fortClank"); vfxShake(5); } }
  }
}

/* ---------------- Cámara del Caballero: la puerta se cierra detrás del equipo ---------------- */
function fortKnightLevelStart(){
  fortOpenGate("g_knight");
  levelDuration = 9e9; // el nivel 10 no termina por tiempo: empieza cuando el equipo entra
  const k = spawnEnemy("caballero", true);
  scaleBossStats(k, "caballero");
  k.x = FORT_MAP.knightSeat.x; k.y = FORT_MAP.knightSeat.y; k.fx = 0; k.fy = 1;
  k.fortDormant = true; k.dmgTakenMult = 0; k.bd = null; k.bossPhase = 1;
  activeChampion = k; // mientras esté sentado no aparecen oleadas
  fortS.knight = {state:"waiting", t:0};
  runLater(1400, ()=>{ if(state==="playing") showBanner("La puerta del fondo está abierta… el Caballero espera"); });
}
function fortKnightUpdate(dt){
  const K = fortS.knight; if(!K || K.state==="none" || K.state==="fight") return;
  const knight = enemies.find(e=>e.type==="caballero" && e.alive);
  if(!knight) return;
  K.t += dt;
  const plat = FORT_MAP.plats.find(p=>p.id==="knight");
  const inside = h=>_fortIn(_fortOBB(plat.cx, plat.cy, plat.hw, plat.hh, 0, plat), h.x, h.y, 0) && h.y < plat.cy + plat.hh - 40;
  if(K.state==="waiting"){
    const alive = heroes.filter(h=>h.alive);
    const allIn = alive.length && alive.every(inside);
    if(allIn || K.t > FORT_CFG.caballero.doorGraceMs){
      if(!allIn){
        // red de seguridad: los que quedaron afuera (vivos o caídos) entran por la puerta
        for(const h of heroes){ if(!inside(h)){ h.x = (Math.random()-0.5)*260; h.y = plat.cy + plat.hh - 90 - Math.random()*40; vfxBurst(h.x, h.y-20, 10, "ember", 120, 400, 3, 1, -30, 0); } }
        showBanner("La Fortaleza te arrastra hacia la cámara…");
      }
      for(const h of heroes){ if(!h.alive && !inside(h)){ h.x = (Math.random()-0.5)*200; h.y = plat.cy + plat.hh - 100; } }
      fortCloseGate("g_knight"); K.state = "closing"; K.t = 0;
      playSfx("fortDoorSlam"); vfxShake(10);
      if(typeof setMusicMode==="function") setMusicMode("prelude");
    }
  } else if(K.state==="closing"){
    if(K.t > 1300){ K.state = "silence"; K.t = 0; }
  } else if(K.state==="silence"){
    if(K.t > 1300){ K.state = "rising"; K.t = 0; playSfx("fortGears"); showBanner("…los engranajes despiertan…"); }
  } else if(K.state==="rising"){
    if(Math.random() < dt/200) vfxBurst(knight.x + (Math.random()-0.5)*120, knight.y - 30, 3, "ember", 80, 500, 3, 0, -40, 1);
    knight.packSet = "turn"; knight.packTimer = 400; knight.packDur = 800;
    if(K.t > 1200 && !K.shook){ K.shook = true; vfxShake(8); playSfx("fortClank"); }
    if(K.t > FORT_CFG.caballero.riseMs){
      K.state = "fight"; K.t = 0; K.phase = 1;
      knight.fortDormant = false; knight.dmgTakenMult = 1;
      activeChampion = null;
      bossActive = true; boss = knight;
      bossEntrance(knight);
      arenaTitleCard("JEFE", "CABALLERO DE LA ARMADURA OXIDADA", "El Carcelero Eterno", 4200);
    }
  }
}

/* ---------------- aparición de enemigos ---------------- */
function fortPlaceSpawn(e, atBoss){
  if(typeof _fortSpawnAt!=="undefined" && _fortSpawnAt){ e.x = _fortSpawnAt.x; e.y = _fortSpawnAt.y; if(!e.flying) fortClamp(e); return; }
  if(atBoss || e.rank==="jefe" || e.rank==="subjefe") return;
  const sec = fortS.sector;
  const comps = fortHeroComps(false);
  const cands = [];
  for(const s of [sec, sec-1, sec+1]){
    const list = FORT_MAP.spawns[s]; if(!list) continue;
    for(const [x,y] of list){
      if(!e.flying && !comps.has(fortCompAt(x, y))) continue;
      if(!e.flying && !fortWalkable(x, y, 20)) continue;
      let dmin = Infinity; for(const h of heroes){ if(h.alive){ const d = Math.hypot(h.x-x, h.y-y); if(d < dmin) dmin = d; } }
      if(dmin > 1500) continue;
      cands.push({x, y, w: dmin > 480 ? (s===sec ? 3 : 1) : 0.25});
    }
  }
  let p = null;
  if(cands.length){
    let tot = 0; for(const c of cands) tot += c.w;
    let r = Math.random()*tot; for(const c of cands){ r -= c.w; if(r <= 0){ p = c; break; } }
    p = p || cands[0];
  } else {
    // sin puertas a mano: un punto caminable del mismo tramo que un héroe, a media distancia
    const alive = heroes.filter(h=>h.alive); const h = alive[(Math.random()*alive.length)|0] || player;
    for(let t=0;t<14;t++){ const a = Math.random()*Math.PI*2, d = 360 + Math.random()*200; const x = h.x + Math.cos(a)*d, y = h.y + Math.sin(a)*d; if(e.flying || (fortWalkable(x, y, 24) && fortCompAt(x, y)===fortCompAt(h.x, h.y))){ p = {x, y}; break; } }
    if(!p){ const n = fortNearest(h.x + 200, h.y); p = {x:n.x, y:n.y}; }
  }
  e.x = p.x + (Math.random()-0.5)*40; e.y = p.y + (Math.random()-0.5)*40;
  if(!e.flying) fortClamp(e);
  if(Math.random() < 0.35 && inView(e.x, e.y, 200)) vfxBurst(e.x, e.y-20, 5, "rock", 70, 380, 3, 0, -30, 1);
}
function fortSpawnPool(level){
  const P = [];
  const add = (t, w)=>P.push({t, w});
  if(level <= 2){ add("dragon_bronce", 10); add("carcelero", level===1 ? 4 : 6); }
  else if(level <= 4){ add("dragon_bronce", 7); add("carcelero", 5); add("prisionero", 9); add("arana", level===3 ? 3 : 4); }
  else if(level === 5){ add("prisionero", 8); add("dragon_bronce", 6); add("carcelero", 5); add("arana", 3); add("automata", 2); add("verdugo", 2); }
  else if(level === 6){ add("prisionero", 8); add("dragon_bronce", 6); add("carcelero", 4); add("arana", 3); add("automata", 2); add("verdugo", 2); }
  else if(level <= 8){ add("prisionero", 8); add("dragon_bronce", 6); add("carcelero", 5); add("arana", 4); add("automata", 3); add("verdugo", 3); }
  else { add("prisionero", 7); add("dragon_bronce", 6); add("carcelero", 5); add("arana", 4); add("automata", 3); add("verdugo", 3); }
  return P;
}

/* ---------------- héroes al arrancar ---------------- */
function fortRunStart(){
  fortS = newFortStateOnce();
  fortGeomDirty = true; fortRebuildShapes();
  fortTrapsReset();
  const S = FORT_MAP.start;
  heroes.forEach((h, i)=>{ const a = (i/heroes.length)*Math.PI*2 + Math.PI/4; h.x = S.x + (i ? Math.cos(a)*70 : 0); h.y = S.y + (i ? Math.sin(a)*70 : 0); h._fs = null; });
  _fortNavT = 0;
}
function newFortStateOnce(){ return fortNewState(); }

/* ---------------- cada cuadro (anfitrión / partida local) ---------------- */
function fortUpdate(dt){
  if(!fortS) return;
  if(fortGeomDirty) fortRebuildShapes();
  fortUpdateGates(dt);
  fortUpdateHubRotor(dt);
  fortUpdateCoreRotors(dt);
  fortUpdateSlide(dt);
  fortKnightUpdate(dt);
  fortDragonDirector(dt);
  fortTrapsUpdate(dt);
  fortEnemyWorldUpdate(dt);
  if(fortGeomDirty){ fortRebuildShapes(); _fortNavT = Math.min(_fortNavT, 60); }
  _fortNavT -= dt;
  if(_fortNavT <= 0 && fortS._navSig !== fortGeomSig()){ fortS._navSig = fortGeomSig(); aidNavBuild(); _fortNavT = 240; }
  // quien por un empujón o un tirón quedó fuera de lo caminable, vuelve al borde
  for(const h of heroes){ if(!h.duelActive && !h.isDuelLocked) fortClamp(h); }
}
function fortGeomSig(){ let s = ""; for(const f of fortShapes) s += (f.cx|0)+","+(f.cy|0)+","+(f.hw|0)+","+(f.rot*100|0)+";"; return s; }
// Invitado: solo anima (el estado real llega en cada snapshot).
function fortGuestUpdate(dt){
  if(!fortS) return;
  const st = fortS.rot.hub; if(st && st.phase==="move"){ st.t += dt; const q = Math.min(1, st.t/FORT_CFG.bridge.rotateMs), e = q<0.5 ? 2*q*q : 1-Math.pow(-2*q+2,2)/2; let d = st.to - st.from; while(d > Math.PI) d -= Math.PI*2; while(d < -Math.PI) d += Math.PI*2; st.ang = st.from + d*e; fortGeomDirty = true; }
  const sl = fortS.slide.sl_int; if(sl && sl.phase==="move"){ sl.t += dt; const q = Math.min(1, sl.t/FORT_CFG.bridge.slideMs), e = q<0.5 ? 2*q*q : 1-Math.pow(-2*q+2,2)/2; sl.x = sl.from + (sl.to - sl.from)*e; fortGeomDirty = true; }
  for(const k of ["core_s","core_n","core_w","core_e"]){ const a = fortS.rot[k]; if(a.phase==="move"){ a.t += dt; const q = Math.min(1, a.t/FORT_CFG.bridge.retractMs); a.ext = a.from + (a.to-a.from)*q; fortGeomDirty = true; } }
  for(const G of FORT_MAP.gates){ const g = fortS.gates[G.id]; if(g.open!==g.want){ g.open = Math.max(0, Math.min(1, g.open + (g.want?1:-1)*dt/1200)); fortGeomDirty = true; } }
  if(fortGeomDirty) fortRebuildShapes();
  fortTrapsGuestUpdate(dt);
}
// Estado que el anfitrión manda (compacto; el invitado lo aplica y rearma la geometría).
function fortNetState(){ if(!fortS) return null; const s = Object.assign({}, fortS); delete s._navSig; return s; }
function fortApplyNetState(v){
  if(!v) return;
  if(!fortS){ fortS = fortNewState(); fortTrapsReset(); }
  Object.assign(fortS, v);
  fortGeomDirty = true;
}

/* ---------------- bots: no perseguir lo que no se puede alcanzar ---------------- */
function fortHeroReachable(a, b){ return fortReachable(a, b); }

/* ---------------- navegación ---------------- */
function fortNavBlocked(x, y){ return !fortWalkable(x, y, 14); }
