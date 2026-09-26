"use strict";
/* ============================================================
   js/arenas/arena-blocks.js
   MUROS Y BLOQUES DE CADA ARENA (no solo el Laberinto).
   Crítica que lo motiva: las arenas eran pisos planos con utilería chica; faltaba ARQUITECTURA
   (algo que diga "acá hay una pared, por acá se pasa") y cada arena se parecía a la otra.
   Cada arena tiene ahora un trazado propio, fijo (igual para todos en cooperativo) y un estilo:
     - Ruinas del Bosque: muros de piedra caídos, con musgo, enredaderas y bordes rotos.
     - Arena Acuática: muros de templo hundido con coral, percebes y brillo de agua.
     - Arena de Hielo: bloques de hielo tallado con nieve arriba, brillo y carámbanos.
     - Arena Infernal: barricadas de basalto con grietas de lava que laten.
     - Laberinto: sillares con greca (el de siempre).
   Usan la MISMA estructura que los muros del Laberinto (labyrinthWalls): colisión real,
   navegación de enemigos (campo de flujo), bots, orden de dibujo por profundidad.
   Lectura: cara frontal oscura con borde superior iluminado, sombra proyectada y contorno;
   si un héroe queda detrás, el muro se vuelve translúcido para no taparlo.
   Rendimiento: cada muro se pinta UNA vez en un canvas (cache); por cuadro solo se dibuja la
   imagen y, en la Infernal, el latido de la lava.
   ============================================================ */
const ARENA_BLOCK_T = 30;
function _abH(x0, x1, y, o){ return Object.assign({ x:(x0+x1)/2, y, len:Math.abs(x1-x0), thick:ARENA_BLOCK_T, rot:0, axis:"h" }, o||{}); }
function _abV(x, y0, y1, o){ return Object.assign({ x, y:(y0+y1)/2, len:Math.abs(y1-y0), thick:ARENA_BLOCK_T, rot:Math.PI/2, axis:"v" }, o||{}); }
// Trazados: siempre lejos del centro (spawn de héroes y jefes) y con pasos anchos entre muros.
const ARENA_BLOCK_LAYOUTS = {
  bosque: ()=>[
    _abH(-640, -460, -240), _abV(560, 60, 250), _abH(-200, 30, 560), _abH(130, 350, -500),
    _abH(-600, -440, 420), _abV(-880, 180, 330)
  ],
  acuatica: ()=>[
    _abV(-880, -300, -80), _abH(-420, -170, -520), _abV(880, 60, 290), _abH(-110, 170, 650),
    _abH(240, 470, -470), _abV(-600, 110, 300)
  ],
  hielo: ()=>[
    _abV(-860, -250, 0), _abV(860, -60, 180), _abH(-150, 150, 590), _abH(260, 520, -560),
    _abH(-620, -420, 480), _abV(720, 390, 540)
  ],
  infernal: ()=>[
    _abH(-250, 250, 650), _abH(-250, 250, -655), _abV(-900, -170, 150), _abV(900, -150, 170),
    _abH(-470, -300, 560), _abH(300, 470, -560)
  ]
};
function arenaBlockLayout(arena){ const f = ARENA_BLOCK_LAYOUTS[arena]; return f ? f() : []; }
// ¿Hay un muro o un obstáculo en este punto? (lo usan las mecánicas para ubicar cosas)
function aidBlocked(x, y, pad){
  pad = pad || 0;
  if(aidSolids.some(s=>Math.hypot(s.x-x, s.y-y) < s.r+pad)) return true;
  for(const w of labyrinthWalls) if(aidPointInWall(w, x, y, pad)) return true;
  return false;
}

/* ---------------- estilos (colores y adornos por arena) ---------------- */
const WALL_STYLES = {
  bosque:   { front:[62,70,52], frontDark:[44,50,36], top:[112,122,92], topLit:[150,162,120], outline:"#0c1008", moss:"#4f7d34", mossLit:"#7fb24e", broken:true },
  acuatica: { front:[52,78,84], frontDark:[36,56,62], top:[98,134,134], topLit:[146,184,178], outline:"#061014", coral:"#c8577c", coralLit:"#ff8fb0", barnacle:"#b9c7bf", broken:true },
  hielo:    { front:[74,120,168], frontDark:[52,90,134], top:[196,224,246], topLit:[240,250,255], outline:"#0a1a2c", ice:true },
  infernal: { front:[40,30,30], frontDark:[26,19,19], top:[70,54,50], topLit:[104,80,70], outline:"#080404", lava:true }
};
function _abRgb(c, f){ f = f===undefined ? 1 : f; return `rgb(${Math.min(255,c[0]*f)|0},${Math.min(255,c[1]*f)|0},${Math.min(255,c[2]*f)|0})`; }
// Pinta el muro completo (cara superior + frontal + adornos) en un canvas propio, en unidades de mundo.
function arenaBlockBake(w){
  const S = WALL_STYLES[currentArena]; if(!S) return null;
  const b = aidWallAABB(w), H = AID_WALL_H, W = Math.round(b.x1-b.x0), D = Math.round(b.y1-b.y0);
  const PAD = 10, cw = W + PAD*2, ch = D + H + PAD*2 + 16;
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  const rnd = aidRng(((w.x*7)|0) ^ ((w.y*13)|0) ^ 0x9e37);
  const ox = PAD, topY = PAD, frontY = PAD + D;          // la planta arranca arriba; la cara frontal debajo
  // silueta con bordes rotos (ruinas): alturas por columna de 6 px
  const colH = [];
  for(let x=0; x<W; x+=6) colH.push(S.broken ? (rnd()<0.28 ? 4+(rnd()*10|0) : 0) : 0);
  const notch = (x)=> colH[Math.min(colH.length-1, (x/6)|0)] || 0;
  // contorno oscuro (1 px) alrededor de todo el bloque
  g.fillStyle = S.outline; g.fillRect(ox-2, topY-2, W+4, D+H+4);
  // cara frontal
  for(let x=0; x<W; x+=6){
    const n = notch(x);
    g.fillStyle = _abRgb(S.front); g.fillRect(ox+x, frontY+n, Math.min(6, W-x), H-n);
  }
  // hiladas / vetas de la cara frontal
  if(S.ice){
    const gr = g.createLinearGradient(0, frontY, 0, frontY+H); gr.addColorStop(0, _abRgb(S.front, 1.15)); gr.addColorStop(1, _abRgb(S.frontDark));
    g.fillStyle = gr; g.fillRect(ox, frontY, W, H);
    g.strokeStyle = "rgba(230,245,255,0.55)"; g.lineWidth = 1;
    for(let i=0;i<Math.max(2, W/40);i++){ const x = ox + 6 + rnd()*(W-12); g.beginPath(); g.moveTo(x, frontY+4); g.lineTo(x + (rnd()-0.5)*14, frontY+H*0.55); g.lineTo(x + (rnd()-0.5)*18, frontY+H-3); g.stroke(); }
    g.fillStyle = "rgba(255,255,255,0.28)"; g.fillRect(ox+3, frontY+3, 3, H-8);                      // brillo vertical
  } else {
    g.fillStyle = _abRgb(S.frontDark);
    for(let y=frontY+10; y<frontY+H; y+=11) g.fillRect(ox, y, W, 2);
    for(let row=0; row<4; row++){ const off = row%2 ? 13 : 0; for(let x=off; x<W; x+=26) g.fillRect(ox+x, frontY+row*11, 2, 9); }
    // manchas y desgaste
    for(let i=0;i<W/10;i++){ g.fillStyle = `rgba(0,0,0,${0.08+rnd()*0.14})`; g.fillRect(ox + rnd()*W, frontY + 4 + rnd()*(H-8), 3+rnd()*6, 2+rnd()*3); }
  }
  // sombreado de volumen: la base de la cara frontal más oscura
  const sh = g.createLinearGradient(0, frontY, 0, frontY+H); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.35)");
  g.fillStyle = sh; g.fillRect(ox, frontY, W, H);
  // cara superior (lo que se pisa visualmente "arriba" del muro)
  g.fillStyle = _abRgb(S.top); g.fillRect(ox, topY, W, D);
  for(let i=0;i<W/8;i++){ g.fillStyle = _abRgb(S.top, 0.85 + rnd()*0.3); g.fillRect(ox + rnd()*(W-6), topY + rnd()*(D-3), 4+rnd()*6, 2); }
  g.fillStyle = _abRgb(S.topLit); g.fillRect(ox, topY, W, 2);                                    // filo iluminado (luz arriba-izquierda)
  g.fillStyle = _abRgb(S.topLit, 0.92); g.fillRect(ox, topY, 2, D);
  g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(ox, topY+D-2, W, 2);                               // arista top/frente
  // roturas: huecos en la cara superior donde el muro se desmoronó
  if(S.broken) for(let x=0; x<W; x+=6){ const n = notch(x); if(n){ g.fillStyle = S.outline; g.fillRect(ox+x, frontY, 6, n); g.fillStyle = _abRgb(S.frontDark, 0.8); g.fillRect(ox+x, frontY+n-2, 6, 2); } }
  // ---- adornos por arena ----
  if(S.moss){
    for(let x=0; x<W; x+=3){ if(rnd()<0.55){ const l = 2 + (rnd()*(rnd()<0.2 ? 18 : 7)|0); g.fillStyle = rnd()<0.5 ? S.moss : S.mossLit; g.fillRect(ox+x, frontY+notch(x), 3, l); } }
    for(let i=0;i<W/14;i++){ g.fillStyle = S.moss; g.fillRect(ox + rnd()*(W-8), topY + rnd()*(D-4), 5+rnd()*8, 3); }
    // enredadera que cuelga
    for(let i=0;i<Math.max(1, W/90);i++){ let x = ox + 8 + rnd()*(W-16), y = frontY; g.fillStyle = "#2f5a22"; for(let k=0;k<H-6;k+=2){ x += (rnd()-0.5)*2; g.fillRect(x, y+k, 2, 2); if(rnd()<0.2){ g.fillStyle = S.mossLit; g.fillRect(x+2, y+k, 2, 2); g.fillStyle = "#2f5a22"; } } }
  }
  if(S.coral){
    for(let i=0;i<W/16;i++){ const x = ox + rnd()*(W-8), y = frontY + H - 4 - rnd()*14; g.fillStyle = S.coral; g.fillRect(x, y, 3, 6); g.fillRect(x-2, y+1, 2, 3); g.fillRect(x+3, y+2, 2, 3); g.fillStyle = S.coralLit; g.fillRect(x, y, 3, 1); }
    for(let i=0;i<W/6;i++){ g.fillStyle = S.barnacle; g.fillRect(ox + rnd()*W, frontY + 3 + rnd()*(H-8), 2, 2); }
    for(let i=0;i<W/10;i++){ g.fillStyle = "#2e6b55"; g.fillRect(ox + rnd()*W, topY + rnd()*D, 4, 2); }
    g.fillStyle = "rgba(140,230,220,0.25)"; for(let i=0;i<W/30;i++) g.fillRect(ox + rnd()*(W-20), topY + rnd()*(D-3), 14+rnd()*14, 1);   // reflejo del agua
  }
  if(S.ice){
    g.fillStyle = "#f4faff"; g.fillRect(ox, topY, W, 4);                                              // nieve arriba
    for(let x=0; x<W; x+=4){ if(rnd()<0.5){ g.fillStyle = "#f4faff"; g.fillRect(ox+x, topY+4, 4, 1+(rnd()*3|0)); } }
    g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(ox + W*0.15, topY + D*0.35, W*0.5, 2);          // brillo especular
    for(let x=4; x<W-4; x+=7+(rnd()*6|0)){ const l = 4 + (rnd()*9|0); g.fillStyle = "#d8efff"; g.fillRect(ox+x, frontY+H, 2, l); g.fillStyle = "#ffffff"; g.fillRect(ox+x, frontY+H, 1, l-1); } // carámbanos
  }
  if(S.lava){
    // grietas: se dibujan acá oscuras; el latido de lava se suma por cuadro (drawArenaBlock)
    w._cracks = [];
    for(let i=0;i<Math.max(2, W/36);i++){ const x0 = ox + 6 + rnd()*(W-12); const pts = [[x0, frontY+2]]; let x = x0; for(let y=frontY+2; y<frontY+H-2; y+=5+rnd()*5){ x += (rnd()-0.5)*8; pts.push([x, y]); } w._cracks.push(pts); }
    g.strokeStyle = "#140606"; g.lineWidth = 3;
    for(const pts of w._cracks){ g.beginPath(); pts.forEach((p,k)=>k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.stroke(); }
    // púas de obsidiana arriba
    for(let x=6; x<W-6; x+=14+(rnd()*8|0)){ g.fillStyle = "#16100f"; g.beginPath(); g.moveTo(ox+x-4, topY+D*0.6); g.lineTo(ox+x, topY-8-rnd()*6); g.lineTo(ox+x+4, topY+D*0.6); g.fill(); g.fillStyle = "rgba(255,120,50,0.35)"; g.fillRect(ox+x-1, topY-2, 1, 4); }
  }
  w._bake = c; w._bakeOx = b.x0 - PAD; w._bakeOy = b.y0 - H - PAD; w._bakeArena = currentArena;
  return c;
}
// Dibujo por cuadro (lo llama aidDrawWall cuando la arena tiene estilo propio).
function drawArenaBlock(w, now){
  if(!w._bake || w._bakeArena!==currentArena) arenaBlockBake(w);
  if(!w._bake) return false;
  const b = aidWallAABB(w), H = AID_WALL_H;
  // ¿un héroe queda detrás (tapado por la cara frontal)? -> translúcido
  let behind = false;
  for(const h of heroes){ if(h && h.alive && h.x > b.x0-26 && h.x < b.x1+26 && h.y < b.y1+4 && h.y > b.y0-H-70){ behind = true; break; } }
  ctx.save();
  // sombra proyectada hacia el sur-este (ancla el muro al piso)
  ctx.fillStyle = "rgba(0,0,0,0.42)"; ctx.fillRect(b.x0+8, b.y1-2, b.x1-b.x0, 16);
  ctx.globalAlpha = behind ? 0.55 : 1;
  ctx.drawImage(w._bake, w._bakeOx, w._bakeOy);
  // latido de lava en las grietas (Infernal)
  if(w._cracks && inView(w.x, w.y, 300)){
    const p = 0.55 + 0.45*Math.sin(now*2.2 + w.x*0.01);
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    const ox = w._bakeOx, oy = w._bakeOy;
    for(const [lw, col] of [[5, `rgba(255,80,20,${0.22*p})`], [2, `rgba(255,170,60,${0.85*p})`]]){
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      for(const pts of w._cracks){ ctx.beginPath(); pts.forEach((q,k)=>k?ctx.lineTo(ox+q[0], oy+q[1]):ctx.moveTo(ox+q[0], oy+q[1])); ctx.stroke(); }
    }
  }
  ctx.restore();
  return true;
}
