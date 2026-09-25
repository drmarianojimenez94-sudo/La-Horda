"use strict";
/* ============================================================
   js/arenas/arena-identity.js
   Armado del escenario de cada arena (props, decals, luces, muros del Laberinto).
   ============================================================ */

// ---------------- Estado del escenario (se rearma en buildArenaDecor en cada partida) ----------------
let aidProps = [];   // piezas altas: se ordenan por profundidad junto con las entidades
let aidDecals = [];  // piezas planas del suelo (debajo de todo)
let aidSolids = [];  // obstáculos reales (círculos) — solo los que el diseño marca como sólidos
let aidLights = [];  // charcos de luz aditiva (braseros, antorchas, cristales, runas)
let aidKelp = [];    // algas animadas (Acuática)
const AID_SCALE = 2; // 1 píxel del arte = 2 unidades de mundo (mismo grano que los sprites)
function aidInside(x, y, margin){
  if(arenaHas("inside")) return arenaHook("inside", x, y, margin||0);
  // mismo octágono que clampToArena, con margen hacia adentro
  const nx = x/1.18, ny = y/0.82;
  return Math.hypot(nx, ny) < ARENA_RADIUS*0.94*Math.cos(Math.PI/8) - (margin||0);
}
function aidProp(img, x, y, opts){
  opts = opts || {};
  const s = opts.scale || AID_SCALE;
  const p = { img, x, y, w:img.width*s, h:img.height*s, ay: opts.ay===undefined ? 0.94 : opts.ay, flip: !!opts.flip, alpha: opts.alpha===undefined ? 1 : opts.alpha };
  aidProps.push(p);
  if(opts.solid) aidSolids.push({x, y:y+(opts.solidDy||0), r:opts.solid});
  if(opts.light) aidLights.push({x, y:y+(opts.light.dy||0), r:opts.light.r, rgb:opts.light.rgb, a:opts.light.a||0.5, flick:opts.light.flick||0, ph:Math.random()*6});
  return p;
}
function aidDecal(img, x, y, opts){
  opts = opts || {};
  const s = opts.scale || AID_SCALE;
  aidDecals.push({ img, x, y, w:img.width*s, h:img.height*s, alpha: opts.alpha===undefined ? 1 : opts.alpha, flip: !!opts.flip });
}
// Punto libre: dentro del octágono, lejos del centro (spawn de los héroes) y de los sólidos ya puestos
function aidFreeSpot(rnd, rMin, rMax, clearance, tries){
  for(let t=0;t<(tries||40);t++){
    const a = rnd()*6.283, r = rMin + rnd()*(rMax-rMin);
    const x = Math.cos(a)*r*1.18, y = Math.sin(a)*r*0.82;
    if(!aidInside(x, y, 60)) continue;
    if(aidSolids.some(s=>Math.hypot(s.x-x, s.y-y) < s.r+clearance)) continue;
    if(labyrinthWalls.some(w=>aidPointInWall(w, x, y, clearance))) continue;
    return {x, y};
  }
  return null;
}
function aidOnRing(rx, ry, a){ return {x:Math.cos(a)*rx*1.18, y:Math.sin(a)*ry*0.82}; }

// ---------------- Armado por arena ----------------
function aidBuild(){
  aidProps = []; aidDecals = []; aidSolids = []; aidLights = []; aidKelp = [];
  const A = currentArena;
  if(A==="infernal") aidBuildInfernal();
  else if(A==="hielo") aidBuildHielo();
  else if(A==="bosque") aidBuildBosque();
  else if(A==="laberinto") aidBuildLaberinto();
  else if(A==="acuatica") aidBuildAcuatica();
  else if(A==="divina") aidBuildDivina();
  aidNavBuild();
  aidAmbReset();
}
function aidBuildInfernal(){
  const rnd = aidRng(666);
  aidDecal(aidArtInfPentagram(), 0, 0, {scale:1.9});
  aidProp(aidArtInfAltar(), 0, -175, {solid:40, solidDy:-12, light:{r:150, rgb:"255,90,30", a:0.55, flick:0.25, dy:-40}});
  // columnas demoníacas quebradas: anillo irregular alrededor del altar (lectura de "coliseo caído")
  for(let i=0;i<9;i++){
    if(i===2 || i===6) continue; // huecos anchos para entrar/salir
    const a = i/9*6.283 + 0.2;
    const p = aidOnRing(520, 520, a);
    aidProp(aidArtInfColumn(i%4), p.x, p.y, {solid:20});
    if(i%2===0) aidProp(aidArtInfBrazier(), p.x+(Math.cos(a)>0?-44:44), p.y+20, {solid:12, light:{r:120, rgb:"255,120,40", a:0.55, flick:0.35, dy:-36}});
  }
  // estatuas de demonio en las diagonales, mirando al centro
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{ const p = aidOnRing(780, 780, Math.atan2(sy, sx)); aidProp(aidArtInfStatue(), p.x, p.y, {solid:20, flip:sx>0, light:{r:70, rgb:"255,60,20", a:0.35, flick:0.2, dy:-90}}); });
  // fisuras de lava grandes (además de las venas finas de siempre) y quemaduras
  for(let i=0;i<9;i++){ const s = aidFreeSpot(rnd, 260, 860, 60); if(s){ aidDecal(aidArtInfFissure(i%4), s.x, s.y, {flip:rnd()<0.5}); aidLights.push({x:s.x, y:s.y, r:100, rgb:"255,90,20", a:0.3, flick:0.3, ph:rnd()*6, fissure:true}); } }
  for(let i=0;i<16;i++){ const s = aidFreeSpot(rnd, 180, 880, 20); if(s) aidDecal(aidArtScorch(i%5), s.x, s.y, {alpha:0.9}); }
}
function aidBuildHielo(){
  const rnd = aidRng(777);
  aidDecal(aidArtFrozenLake(), 0, 0, {scale:1.9});
  // ruina atrapada en el hielo (hito al norte): los dos pilares del arco son sólidos
  aidProp(aidArtIceArch(), 0, -330, {light:{r:140, rgb:"150,210,255", a:0.35, dy:-60}});
  aidSolids.push({x:-66, y:-338, r:18}, {x:66, y:-338, r:18});
  // tres glaciares: arcos de agujas de hielo que parten la arena en zonas
  [0.55, 2.65, 4.45].forEach((a0,gi)=>{
    for(let k=0;k<4;k++){
      const a = a0 + (k-1.5)*0.16;
      const p = aidOnRing(610+(k%2)*40, 610+(k%2)*40, a);
      aidProp(aidArtIcePillar((gi*4+k)%5), p.x, p.y, {solid:18, light: k===1 ? {r:110, rgb:"120,200,255", a:0.35, dy:-70} : null});
    }
  });
  // estatuas congeladas en las diagonales interiores
  [0.8, 2.35, 3.9, 5.5].forEach((a,i)=>{ const p = aidOnRing(420, 420, a); aidProp(aidArtIceStatue(), p.x, p.y, {solid:16, flip:i%2===1}); });
  // cristales bajos decorativos (sin colisión) y nieve acumulada / grietas
  for(let i=0;i<12;i++){ const s = aidFreeSpot(rnd, 250, 880, 40); if(s) aidProp(aidArtIceCluster(i%4), s.x, s.y, {light: i%3===0 ? {r:60, rgb:"160,220,255", a:0.3, dy:-20} : null}); }
  for(let i=0;i<18;i++){ const s = aidFreeSpot(rnd, 120, 900, 10); if(s) aidDecal(aidArtSnowDrift(i%5), s.x, s.y); }
  for(let i=0;i<12;i++){ const s = aidFreeSpot(rnd, 200, 880, 10); if(s) aidDecal(aidArtIceCrack(i%4), s.x, s.y, {flip:rnd()<0.5}); }
}
function aidBuildBosque(){
  const rnd = aidRng(333);
  aidDecal(aidArtRitualCircle(), 0, 0, {scale:1.9});
  // círculo de menhires alrededor del círculo ritual: el hito del bosque
  for(let i=0;i<8;i++){ const a = i/8*6.283 + Math.PI/8; const p = aidOnRing(300, 300, a);
    aidProp(aidArtMenhir(i%5), p.x, p.y, {solid:14, light: i%2===0 ? {r:70, rgb:"140,230,110", a:0.32, flick:0.15, dy:-40} : null}); }
  // árboles antiguos gigantes cerca del borde
  [0.3, 1.2, 2.1, 3.0, 3.9, 4.8, 5.6].forEach((a,i)=>{ const p = aidOnRing(730+(i%2)*60, 730+(i%2)*60, a); aidProp(aidArtAncientTree(i%3), p.x, p.y, {solid:26, flip:i%2===1}); });
  // ruinas: arco caído (pilares sólidos) y estatuas celtas
  aidProp(aidArtRuinArch(), -560, 250); aidSolids.push({x:-560-50, y:252, r:14}, {x:-560+52, y:252, r:14});
  aidProp(aidArtRuinArch(), 540, -300, {flip:true}); aidSolids.push({x:540-52, y:-298, r:14}, {x:540+50, y:-298, r:14});
  [[-300,-420],[330,430],[-760,-60]].forEach(([x,y])=>aidProp(aidArtCelticStatue(), x, y, {solid:14, light:{r:60, rgb:"140,230,110", a:0.28, dy:-38}}));
  // arroyo con puente natural de raíces (decorativo, se cruza caminando)
  aidDecal(aidArtStream(), 420, 470, {scale:1.5});
  for(let i=0;i<24;i++){ const s = aidFreeSpot(rnd, 160, 900, 10); if(s) aidDecal(aidArtMoss(i%6), s.x, s.y, {flip:rnd()<0.5}); }
  for(let i=0;i<10;i++){ const s = aidFreeSpot(rnd, 380, 900, 20); if(s) aidDecal(aidArtRoots(i%4), s.x, s.y, {flip:rnd()<0.5}); }
}
function aidBuildLaberinto(){
  const rnd = aidRng(222);
  aidDecal(aidArtMinotaurChamber(), 0, 0, {scale:1.7});
  // obeliscos en las cuatro esquinas de la cámara del Minotauro
  [[-240,-160],[240,-160],[-240,160],[240,160]].forEach(([x,y])=>aidProp(aidArtObelisk(), x, y, {solid:14, light:{r:90, rgb:"255,200,110", a:0.3, dy:-150}}));
  for(let i=0;i<18;i++){ const s = aidFreeSpot(rnd, 280, 900, 30); if(s) aidDecal(aidArtSandDrift(i%5), s.x, s.y, {flip:rnd()<0.5}); }
  for(let i=0;i<12;i++){ const s = aidFreeSpot(rnd, 300, 900, 30); if(s) aidDecal(aidArtBrokenTiles(i%4), s.x, s.y); }
  // antorchas en las puntas de los muros (luz cálida titilante)
  for(const w of labyrinthWalls){
    if(w.torch){ aidLights.push({x:w.torch.x, y:w.torch.y, r:150, rgb:"255,170,80", a:0.5, flick:0.35, ph:rnd()*6, torch:true}); }
  }
}
function aidBuildAcuatica(){
  const rnd = aidRng(444);
  aidDecal(aidArtSunkTemple(), 0, 0, {scale:1.8});
  // columnas hundidas alrededor del templo
  for(let i=0;i<7;i++){ if(i===3) continue; const a = i/7*6.283 - 0.3; const p = aidOnRing(390, 390, a); aidProp(aidArtSunkColumn(i%4), p.x, p.y, {solid:16}); }
  // tumbas / sarcófagos
  [[-640,-260],[700,-120],[-380,520],[420,560],[60,-640]].forEach(([x,y],i)=>aidProp(aidArtTomb(), x, y, {solid:26, flip:i%2===1, light: i%2===0 ? {r:70, rgb:"90,220,200", a:0.25, dy:-10} : null}));
  // barco hundido contra el borde
  aidProp(aidArtShipwreck(), -760, 470, {solid:46, solidDy:-16});
  aidSolids.push({x:-690, y:458, r:30}, {x:-830, y:470, r:30});
  // corales (decorativos) y algas que se mecen
  for(let i=0;i<16;i++){ const s = aidFreeSpot(rnd, 240, 900, 40); if(s) aidProp(aidArtCoral(i%4), s.x, s.y, {light: i%4===0 ? {r:60, rgb:"255,140,190", a:0.22, dy:-20} : null}); }
  for(let i=0;i<18;i++){ const s = aidFreeSpot(rnd, 260, 900, 30); if(s) aidKelp.push({x:s.x, y:s.y, h:60+rnd()*70, ph:rnd()*6, n:2+(rnd()*2|0)}); }
  for(let i=0;i<16;i++){ const s = aidFreeSpot(rnd, 150, 900, 10); if(s) aidDecal(aidArtSandRipples(i%5), s.x, s.y, {flip:rnd()<0.5}); }
}
function aidBuildDivina(){
  const rnd = aidRng(999);
  for(let i=0;i<10;i++){ const x = (i%2?1:-1)*(200+rnd()*820), y = 120+rnd()*560; if(Math.abs(x)>110 && aidInside(x,y,60)) aidDecal(aidArtCelRune(), x, y, {alpha:0.9}); }
  for(let i=0;i<10;i++){ const x = (i%2?1:-1)*(200+rnd()*820), y = -(120+rnd()*560); if(Math.abs(x)>110 && aidInside(x,y,60)) aidDecal(aidArtCorruptPool(i%4), x, y); }
  // Bando celestial (sur, el tuyo) y bando corrupto (norte, el rival): estatuas de ángel de un
  // lado, púas infernales del otro, siempre fuera de las calles por donde avanzan las oleadas.
  [[-560,430],[560,430],[-820,180],[820,180]].forEach(([x,y],i)=>aidProp(aidArtAngelStatue(), x, y, {solid:16, flip:x>0, light:{r:90, rgb:"255,220,140", a:0.3, dy:-80}}));
  [[-560,-430],[560,-430],[-820,-180],[820,-180]].forEach(([x,y],i)=>aidProp(aidArtInfernalSpike(i), x, y, {solid:16, flip:x>0, light:{r:80, rgb:"230,40,70", a:0.3, dy:-40}}));
}

// ---------------- Muros del Laberinto (diseñados, no al azar) ----------------
// Pasillos y cámaras de piedra en vez de tabiques sueltos: anillo interior que encierra la cámara
// del Minotauro (4 entradas), anillo exterior con entradas desfasadas (obliga a recorrer los
// pasillos) y espolones que arman plazas chicas / zonas de emboscada.
function aidLabyrinthLayout(){
  const T = 30; // grosor
  const H = (x0, x1, y, torch)=>({ x:(x0+x1)/2, y, len:Math.abs(x1-x0), thick:T, rot:0, axis:"h", torch: torch ? {x:torch<0?Math.min(x0,x1):Math.max(x0,x1), y:y-18} : null });
  const V = (x, y0, y1, torch)=>({ x, y:(y0+y1)/2, len:Math.abs(y1-y0), thick:T, rot:Math.PI/2, axis:"v", torch: torch ? {x, y:(torch<0?Math.min(y0,y1):Math.max(y0,y1))-18} : null });
  return [
    // anillo interior (cámara del Minotauro), entradas en el centro de cada lado
    H(-430,-120,-310,-1), H(120,430,-310,1), H(-430,-120,310,-1), H(120,430,310,1),
    V(-430,-310,-100), V(-430,100,310), V(430,-310,-100), V(430,100,310),
    // anillo exterior, entradas desfasadas respecto del interior
    H(-800,-440,-570,1), H(-220,220,-570), H(440,800,-570,-1),
    H(-800,-240,570,1), H(0,800,570,-1),
    V(-800,-570,-170,1), V(-800,170,570,-1),
    V(800,-570,-320,1), V(800,-110,570,-1),
    // espolones: plazas y zonas de emboscada entre los dos anillos
    V(0,-570,-430), H(-800,-620,0), H(620,800,-210), V(-230,430,570), V(600,330,570),
  ];
}
function aidPointInWall(w, x, y, pad){
  const hw = (w.axis==="v" ? w.thick : w.len)/2 + (pad||0), hh = (w.axis==="v" ? w.len : w.thick)/2 + (pad||0);
  return Math.abs(x-w.x) < hw && Math.abs(y-w.y) < hh;
}
function aidWallAABB(w){
  const ww = w.axis==="v" ? w.thick : w.len, hh = w.axis==="v" ? w.len : w.thick;
  return {x0:w.x-ww/2, y0:w.y-hh/2, x1:w.x+ww/2, y1:w.y+hh/2};
}
const AID_WALL_H = 46; // alto visual de los muros (la colisión es solo la planta)
function buildArenaDecor(){
  // Arena con escenario propio (ARENA_DEFS): no usa el coliseo octogonal
  if(arenaHas("buildDecor")){ arenaHook("buildDecor"); return; }
  lavaPools = []; floorDecor = []; braziers = []; wallBlocks = []; deadTrees = []; smokePuffs = [];
  buildLabyrinthWalls(); // no hace nada si la arena actual no tiene muros

  // --- Venas de lava que recorren las losas del coliseo (menos que antes: ahora hay fisuras grandes) ---
  for(let i=0;i<28;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = 260 + Math.random()*(ARENA_RADIUS-340);
    const pts = [];
    let cx = Math.cos(ang)*rad, cy = Math.sin(ang)*rad;
    let dir = Math.random()*Math.PI*2;
    const segs = 4 + (Math.random()*4|0);
    for(let s=0;s<segs;s++){
      pts.push({x:cx, y:cy});
      dir += (Math.random()-0.5)*1.5;
      const len = 18+Math.random()*30;
      cx += Math.cos(dir)*len; cy += Math.sin(dir)*len;
    }
    pts.push({x:cx, y:cy});
    lavaPools.push({pts, x:pts[0].x, y:pts[0].y, phase:Math.random()*Math.PI*2, w:2+Math.random()*2});
  }

  // --- Charcos de lava abiertos entre las losas ---
  for(let i=0;i<18;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = 360 + Math.random()*(ARENA_RADIUS-480);
    const cx = Math.cos(ang)*rad, cy = Math.sin(ang)*rad;
    const blocks = [];
    const w = 3 + (Math.random()*3|0), h = 2 + (Math.random()*2|0);
    for(let bx=-w; bx<=w; bx++){
      for(let by=-h; by<=h; by++){
        if((bx*bx)/(w*w) + (by*by)/(h*h) <= 1 + Math.random()*0.2){
          blocks.push({x:bx*10, y:by*10});
        }
      }
    }
    lavaPools.push({x:cx, y:cy, blocks, phase:Math.random()*Math.PI*2});
  }

  // --- Huesos, rocas y grietas secas en el suelo ---
  for(let i=0;i<150;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = 150 + Math.random()*(ARENA_RADIUS-230);
    floorDecor.push({
      x:Math.cos(ang)*rad, y:Math.sin(ang)*rad,
      kind: Math.random()<0.45 ? "crack" : (Math.random()<0.6 ? "rock" : "bone"),
      len: 10+Math.random()*24, rot: Math.random()*Math.PI
    });
  }

  // --- Árboles muertos apoyados contra el borde del coliseo ---
  const treeCount = 8;
  for(let i=0;i<treeCount;i++){
    const ang = (i/treeCount)*Math.PI*2 + 0.4 + (Math.random()-0.5)*0.35;
    const rad = ARENA_RADIUS*0.70 + Math.random()*120;
    deadTrees.push({
      x:Math.cos(ang)*rad, y:Math.sin(ang)*rad,
      h: 46+Math.random()*26, lean:(Math.random()-0.5)*0.55,
      branches: 3+(Math.random()*3|0), seed:Math.random()*10,
      burning: true, phase:Math.random()*6
    });
  }

  // --- Humo/calor ascendente ---
  for(let i=0;i<11;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = Math.random()*(ARENA_RADIUS-80);
    smokePuffs.push({x:Math.cos(ang)*rad, y:Math.sin(ang)*rad, r:60+Math.random()*80, phase:Math.random()*10});
  }

  // --- Llamas y púas a lo largo del muro octogonal ---
  const flameCount = 120;
  for(let i=0;i<flameCount;i++){
    const t = i/flameCount;
    const p = octPoint(ARENA_RADIUS, t*Math.PI*2);
    braziers.push({x:p.x, y:p.y, phase:Math.random()*6, spike:(i%5===0), h:10+Math.random()*10});
  }
  // Arena Identity V1: cada arena conserva solo lo que es suyo (lava y coliseo quemado son de la
  // Infernal; el Hielo se queda con pocos árboles muertos congelados) y suma su propio escenario.
  const st = aidStyle();
  if(!st.veins) lavaPools = [];
  if(!st.trees) deadTrees = []; else if(currentArena==="hielo") deadTrees = deadTrees.slice(0, 4);
  if(!st.smoke) smokePuffs = [];
  aidBuildOuter();
  aidBuild();
  aidBuildLavaLayer();
}
