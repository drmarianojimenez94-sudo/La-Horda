"use strict";
/* ============================================================
   js/arenas/bosque/bos-selva.js
   Ruinas del Bosque — REDISEÑO VISUAL Y DE ESCENARIO ("selva fantástica con ruinas").
   Todo es arte PROCEDURAL propio (canvas), sin recursos de terceros. No toca estadísticas, jefes ni oleadas.

   Qué agrega (se arma desde aidBuildBosque, arena-identity.js, al final):
     1. SUELO HORNEADO UNA VEZ (canvas de 1340x940 px = 0,5 px por unidad de mundo; por cuadro solo se dibuja el
        recorte visible, igual que la capa de lava): pasto con parches de tono, 3 TERRAZAS con labio de
        desnivel (puramente visual, se pisan), 4 SENDEROS de tierra clara hacia los accesos, un ARROYO con vado
        de piedras y vegetación baja (hierba, flores, piedritas) que NO cuesta nada por cuadro.
     2. OBSTÁCULOS CON COLISIÓN REAL (aidSolids / ARENA_BLOCK_LAYOUTS: los mismos que ya usan héroes, enemigos,
        campo de flujo, bots y el validador): rocas, zarzales, troncos caídos, árboles antiguos extra y un
        TEMPLO EN RUINAS con columnas rotas. Cada pieza se coloca por una función que respeta el centro
        (salida de héroes y jefe), el borde, los demás sólidos y verifica la NAVEGACIÓN (si una pieza deja
        aislada una zona que antes se alcanzaba, no se pone). Todo determinístico (aidRng, sin Math.random):
        en cooperativo el invitado arma exactamente lo mismo que el anfitrión.
     3. LOS PROYECTILES RESPETAN LOS OBSTÁCULOS ALTOS: árboles, menhires, rocas, columnas y muros paran los
        tiros rectos (enemigos y aliados). Zarzales y troncos son bajos (`low`): bloquean el paso, no el tiro.
        Los tiros en arco (p.lob) y los que declaran p.ignoreTerrain pasan por encima.
   LECTURA (estilo MOBA móvil, sin copiar recursos): lo caminable es claro y de tono medio (pasto, tierra de
   senderos); lo que bloquea es más oscuro, con contorno de 1 px y borde superior iluminado.
   ============================================================ */
const BSV = {
  K: 0.5, X0: -1340, Y0: -940, W: 2680, H: 1880,
  ground: null, groundKey: "", info: null,
  // curvas guía (coordenadas de mundo): los senderos salen del círculo ritual hacia los cuatro accesos
  paths: [
    [[0,-60],[40,-220],[-50,-420],[20,-560],[-10,-800]],
    [[60,0],[260,40],[470,-30],[700,50],[1160,10]],
    [[0,60],[-40,230],[50,420],[-20,560],[10,800]],
    [[-60,0],[-260,-40],[-480,30],[-720,-40],[-1160,0]]
  ],
  stream: [[1150,430],[820,500],[520,430],[300,520],[120,600],[-40,640],[-300,700],[-520,860]],
  terraces: [
    {cx:430, cy:-400, rx:290, ry:150, ph:1.1},
    {cx:-430, cy:420, rx:260, ry:135, ph:2.3},
    {cx:-760, cy:-230, rx:210, ry:120, ph:4.0}
  ]
};
function bsvCurvePts(P, n){ // Catmull-Rom → polilínea
  const out = [];
  for(let i=0;i<P.length-1;i++){
    const p0 = P[Math.max(0,i-1)], p1 = P[i], p2 = P[i+1], p3 = P[Math.min(P.length-1,i+2)];
    for(let k=0;k<n;k++){
      const t = k/n, t2 = t*t, t3 = t2*t;
      out.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);
    }
  }
  out.push(P[P.length-1]);
  return out;
}
let _bsvPathPts = null;
function bsvPathDist(x, y){ // distancia mínima al eje de cualquier sendero
  if(!_bsvPathPts) _bsvPathPts = BSV.paths.map(P=>bsvCurvePts(P, 8));
  let best = 1e9;
  for(const L of _bsvPathPts) for(const p of L){ const d = Math.hypot(p[0]-x, p[1]-y); if(d < best) best = d; }
  return best;
}

/* ---------------- Suelo horneado ---------------- */
function bsvBakeGround(salt){
  const K = BSV.K, c = document.createElement("canvas"); c.width = Math.round(BSV.W*K); c.height = Math.round(BSV.H*K);
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  const rnd = aidRng(4242 ^ salt);
  const X = x=>(x-BSV.X0)*K, Y = y=>(y-BSV.Y0)*K;
  // 1. pasto base + parches de tono (lectura: tono medio, el piso es fondo)
  g.fillStyle = "#3a6430"; g.fillRect(0, 0, c.width, c.height);
  const tones = ["rgba(74,122,52,0.5)","rgba(46,86,38,0.5)","rgba(92,138,60,0.38)","rgba(34,70,34,0.45)"];
  for(let i=0;i<340;i++){
    const x = rnd()*c.width, y = rnd()*c.height;
    aidBlob(g, x, y, 28+rnd()*60, 14+rnd()*30, tones[i%4], rnd, 8);
  }
  // 2. terrazas: cara del desnivel (oscura, con hiladas de tierra y raíces) + tapa clara + filo iluminado
  for(const T of BSV.terraces){
    const poly = [], N = 28;
    for(let i=0;i<N;i++){ const a = i/N*6.283, w = 1 + 0.12*Math.sin(a*3+T.ph) + 0.06*Math.sin(a*5+T.ph*2); poly.push([T.cx+Math.cos(a)*T.rx*w, T.cy+Math.sin(a)*T.ry*w]); }
    const drawPoly = (dy, fill)=>{ g.fillStyle = fill; g.beginPath(); poly.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1]+dy)):g.moveTo(X(p[0]),Y(p[1]+dy))); g.closePath(); g.fill(); };
    drawPoly(26, "#1e2a16");                       // sombra proyectada
    drawPoly(16, "#4a3a26");                       // cara de tierra
    drawPoly(10, "#5a4630");
    // hiladas de la cara
    g.strokeStyle = "rgba(28,20,12,0.55)"; g.lineWidth = 1;
    for(let k=0;k<26;k++){ const p = poly[(rnd()*N)|0]; if(p[1] < T.cy) continue; g.beginPath(); g.moveTo(X(p[0]), Y(p[1]+3)); g.lineTo(X(p[0]+(rnd()-0.5)*10), Y(p[1]+14)); g.stroke(); }
    drawPoly(0, "#4f8038");                        // tapa
    g.save(); g.beginPath(); poly.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1]))); g.closePath(); g.clip();
    for(let i=0;i<60;i++) aidBlob(g, X(T.cx+(rnd()-0.5)*T.rx*1.8), Y(T.cy+(rnd()-0.5)*T.ry*1.8), 18+rnd()*30, 9+rnd()*16, i%3?"rgba(110,160,70,0.35)":"rgba(70,116,48,0.4)", rnd, 6);
    g.restore();
    g.strokeStyle = "rgba(178,222,112,0.85)"; g.lineWidth = 1.5; g.beginPath(); poly.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1]))); g.closePath(); g.stroke();
  }
  // 3. vegetación baja y detalles (hierba, flores, piedritas): horneados, cuestan 0 por cuadro
  for(let i=0;i<2600;i++){
    const x = rnd()*c.width, y = rnd()*c.height, t = rnd();
    g.fillStyle = t<0.5 ? "#2a5426" : t<0.85 ? "#6a9c48" : "#8cc060";
    g.fillRect(x|0, y|0, 1, 3); g.fillRect((x|0)+2, (y|0)+1, 1, 2); g.fillRect((x|0)-2, (y|0)+1, 1, 2);
  }
  const FL = ["#f2e27a","#e88ab8","#b9a0f0","#f4f0e0","#7ad0e8"];
  for(let i=0;i<260;i++){ const x = rnd()*c.width, y = rnd()*c.height; g.fillStyle = FL[(rnd()*FL.length)|0]; g.fillRect(x|0, y|0, 2, 2); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x|0, (y|0)-1, 1, 1); }
  // 4. arroyo (agua poco profunda: se cruza caminando; el vado de piedras marca el paso)
  const sp = bsvCurvePts(BSV.stream, 10);
  const band = (col, lw, dy)=>{ g.strokeStyle = col; g.lineWidth = lw*K; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); sp.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1]+(dy||0))):g.moveTo(X(p[0]),Y(p[1]+(dy||0)))); g.stroke(); };
  band("#2c4a26", 96); band("#6a5a3a", 82); band("#2f6f78", 66); band("#4a9aa0", 44); band("rgba(190,240,236,0.45)", 10, -8);
  for(let i=0;i<70;i++){ const p = sp[(rnd()*sp.length)|0]; g.fillStyle = "rgba(230,255,250,0.55)"; g.fillRect(X(p[0]+(rnd()-0.5)*40)|0, Y(p[1]+(rnd()-0.5)*20)|0, 4, 1); }
  // 5. senderos: borde oscuro, tierra clara, huellas y piedritas (se leen como camino a seguir)
  const pathStroke = (col, lw)=>{ g.strokeStyle = col; g.lineWidth = lw*K; g.lineJoin = "round"; g.lineCap = "round"; for(const P of BSV.paths){ const L = bsvCurvePts(P, 10); g.beginPath(); L.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1]))); g.stroke(); } };
  pathStroke("#2c3a1e", 112); pathStroke("#6d5d3c", 100); pathStroke("#a08e5e", 84); pathStroke("#b8a672", 52);
  for(const P of BSV.paths){ const L = bsvCurvePts(P, 10);
    for(let i=0;i<L.length;i+=1){ const p = L[i];
      for(let k=0;k<2;k++){ g.fillStyle = rnd()<0.5 ? "#8a7848" : "#d2c48c"; g.fillRect(X(p[0]+(rnd()-0.5)*70)|0, Y(p[1]+(rnd()-0.5)*50)|0, 2, 1); }
      if(i%5===0){ g.fillStyle = "#7c7a6c"; g.fillRect(X(p[0]+(rnd()-0.5)*80)|0, Y(p[1]+(rnd()-0.5)*60)|0, 3, 2); }
    }
  }
  // vado: piedras planas donde el sendero sur cruza el arroyo
  let ford = null, bd = 1e9; for(const p of sp){ const d = Math.abs(p[0]-10); if(d < bd && p[1] > 500){ bd = d; ford = p; } }
  if(ford) for(let i=-3;i<=3;i++){ const px = X(ford[0]+i*14), py = Y(ford[1]-30+i*10+(i%2)*6); g.fillStyle = "#1c2a24"; g.fillRect(px-5, py-2, 11, 6); g.fillStyle = "#9a9a8c"; g.fillRect(px-5, py-3, 11, 5); g.fillStyle = "#c8c8b6"; g.fillRect(px-5, py-3, 11, 1); }
  // 6. claros de luz: manchas cálidas suaves (luz que baja entre las copas)
  for(let i=0;i<9;i++){ const x = rnd()*c.width, y = rnd()*c.height; const rg = g.createRadialGradient(x, y, 4, x, y, 70+rnd()*40); rg.addColorStop(0, "rgba(255,244,170,0.20)"); rg.addColorStop(1, "rgba(255,244,170,0)"); g.fillStyle = rg; g.fillRect(x-130, y-130, 260, 260); }
  return c;
}
// Dibuja el recorte visible del suelo horneado. Devuelve false si no hay capa (el motor usa su piso de siempre).
function bsvDrawGround(){
  const G = BSV.ground; if(!G) return false;
  const K = BSV.K, hw = VW/2/CAM_ZOOM + 40, hh = VH/2/CAM_ZOOM + 40;
  const cy = camCenterY(), cx = camSub().x;
  const wx0 = Math.max(BSV.X0, cx-hw), wy0 = Math.max(BSV.Y0, cy-hh), wx1 = Math.min(BSV.X0+BSV.W, cx+hw), wy1 = Math.min(BSV.Y0+BSV.H, cy+hh);
  ctx.fillStyle = "#2c4e26"; ctx.fillRect(-ARENA_RADIUS*1.3, -ARENA_RADIUS*1.3, ARENA_RADIUS*2.6, ARENA_RADIUS*2.6);
  if(wx1 <= wx0 || wy1 <= wy0) return true;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(G, (wx0-BSV.X0)*K, (wy0-BSV.Y0)*K, (wx1-wx0)*K, (wy1-wy0)*K, wx0, wy0, wx1-wx0, wy1-wy0);
  ctx.restore();
  return true;
}

/* ---------------- Arte de las piezas nuevas ---------------- */
// Contorno oscuro de 1 px alrededor de la silueta (lectura: lo que bloquea se separa del piso claro).
function bsvOutline(g, w, h, col){
  const src = document.createElement("canvas"); src.width = w; src.height = h; src.getContext("2d").drawImage(g.canvas, 0, 0);
  const o = document.createElement("canvas"); o.width = w; o.height = h; const og = o.getContext("2d");
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) og.drawImage(src, dx, dy);
  og.globalCompositeOperation = "source-in"; og.fillStyle = col || "#0a1608"; og.fillRect(0, 0, w, h);
  g.clearRect(0, 0, w, h); g.drawImage(o, 0, 0); g.drawImage(src, 0, 0);
}
function bsvArtBoulder(v){
  return aidArt("bsvBoulder"+v, 44, 36, (g,w,h)=>{
    const rnd = aidRng(810+v*13), cx = w/2;
    const top = 6 + (v%2)*2, bot = h-5;
    for(let y=top; y<bot; y++){
      const t = (y-top)/(bot-top), hw = (w/2-5)*Math.pow(Math.sin(Math.min(1, t*1.25+0.12)*Math.PI/2), 0.8)*(0.92+0.08*Math.sin(y*0.8+v));
      const x0 = cx-hw;
      aidPx(g, x0, y, hw*2, 1, t<0.3 ? "#9c9c8c" : t<0.7 ? "#7c7c6c" : "#5c5c50");
      aidPx(g, x0, y, Math.max(2, hw*0.45), 1, t<0.5 ? "#b4b4a2" : "#8e8e7e");
      aidPx(g, x0+hw*2-Math.max(2, hw*0.3), y, Math.max(2, hw*0.3), 1, "#464a40");
    }
    for(let i=0;i<4;i++){ const x = cx-8+rnd()*16, y = top+4+rnd()*12; g.fillStyle = "#3a3a30"; g.fillRect(x|0, y|0, 1, 3+(rnd()*4|0)); }
    aidBlob(g, cx, top+3, 13, 4, "#4f8a34", rnd, 7); aidBlob(g, cx-4, top+2, 7, 2, "#7fb24e", rnd, 4);
    for(let i=0;i<6;i++) aidPx(g, cx-14+rnd()*28, bot-6+rnd()*5, 2, 2, "#3f6a2a");
    bsvOutline(g, w, h);
  });
}
function bsvArtThicket(v){
  return aidArt("bsvThicket"+v, 48, 38, (g,w,h)=>{
    const rnd = aidRng(910+v*7), cx = w/2;
    aidBlob(g, cx, h-12, 20, 10, "#17381c", rnd, 10);
    aidBlob(g, cx, h-14, 20, 12, "#245a2a", rnd, 12);
    aidBlob(g, cx-4, h-19, 15, 9, "#337a36", rnd, 9);
    aidBlob(g, cx+6, h-22, 10, 6, "#4a9a42", rnd, 6);
    for(let i=0;i<22;i++){ const x = 6+rnd()*36, y = 8+rnd()*20; aidPx(g, x, y, 2, 2, rnd()<0.5?"#5aae4c":"#8ccc66"); }
    for(let i=0;i<9;i++){ const a = rnd()*6.283, r = 10+rnd()*8; aidPx(g, cx+Math.cos(a)*r*1.1, h-15+Math.sin(a)*r*0.5, 1, 3, "#d8caa0"); }
    for(let i=0;i<6;i++) aidPx(g, 8+rnd()*32, 12+rnd()*18, 2, 2, "#e0485a");
    bsvOutline(g, w, h);
  });
}
function bsvArtLog(v){
  return aidArt("bsvLog"+v, 72, 26, (g,w,h)=>{
    const rnd = aidRng(1010+v*5);
    for(let y=4; y<h-4; y++){ const t = (y-4)/(h-8), col = t<0.25 ? "#8a6a42" : t<0.7 ? "#6a4c2e" : "#46301c"; aidPx(g, 8, y, w-14, 1, col); }
    for(let x=14; x<w-8; x+=7) aidPx(g, x, 5, 1, h-10, "rgba(30,18,8,0.55)");
    aidPx(g, 8, 4, w-14, 2, "#a8845a");
    g.fillStyle = "#c9a46a"; g.beginPath(); g.ellipse(9, h/2, 5, (h-8)/2, 0, 0, 6.283); g.fill();
    g.strokeStyle = "#8a6a42"; g.lineWidth = 1; g.beginPath(); g.ellipse(9, h/2, 3, 5, 0, 0, 6.283); g.stroke();
    aidBlob(g, w*0.55, 6, 22, 3, "#4f8a34", rnd, 8); aidBlob(g, w*0.4, 5, 10, 2, "#7fb24e", rnd, 4);
    aidPx(g, w-14, 8, 6, 3, "#6a4c2e"); aidPx(g, w-10, 12, 4, 3, "#3a2814");
    for(let i=0;i<4;i++) aidPx(g, 20+rnd()*40, h-6, 3, 3, "#c85a7a");
    bsvOutline(g, w, h);
  });
}
function bsvArtBrokenColumn(v){
  return aidArt("bsvColumn"+v, 26, 54, (g,w,h)=>{
    const rnd = aidRng(1110+v*9), cx = w/2, top = 8 + v*10;
    aidPx(g, 3, h-8, 20, 6, "#6a6a5c"); aidPx(g, 3, h-8, 20, 1, "#a2a290"); aidPx(g, 5, h-10, 16, 2, "#8a8a7a");
    for(let y=top; y<h-10; y++){ const jag = y<top+4 ? (rnd()*3|0) : 0;
      aidPx(g, 7+jag, y, 12-jag, 1, "#82826f"); aidPx(g, 7+jag, y, 3, 1, "#a8a894"); aidPx(g, 16, y, 3, 1, "#52524a");
      if(y%8===0) aidPx(g, 7, y, 12, 1, "#5e5e52"); }
    for(let x=8; x<18; x+=3) aidPx(g, x, top+8, 1, h-top-20, "rgba(40,40,32,0.35)");
    for(let i=0;i<14;i++){ const y = top+rnd()*(h-top-14); aidPx(g, 6+rnd()*12, y, 2, 2, rnd()<0.5?"#3f6a2a":"#5a8a36"); }
    for(let k=0;k<(h-top-16);k+=2){ if(k%6<4) aidPx(g, 8+((k*0.4)|0)%8, top+k, 1, 2, "#2f5a22"); }
    bsvOutline(g, w, h);
  });
}
function bsvArtFlagstones(){
  return aidArt("bsvFlagstones", 240, 150, (g,w,h)=>{
    const rnd = aidRng(1211), cx = w/2, cy = h/2;
    g.fillStyle = "rgba(24,30,18,0.55)"; g.beginPath(); g.ellipse(cx, cy+4, 112, 68, 0, 0, 6.283); g.fill();
    for(let j=0;j<9;j++) for(let i=0;i<14;i++){
      const x = 14+i*16+(j%2)*8, y = 10+j*14;
      if(((x-cx)/108)**2 + ((y+6-cy)/64)**2 > 1) continue;
      const tone = 0.82+rnd()*0.3;
      g.fillStyle = `rgb(${110*tone|0},${112*tone|0},${98*tone|0})`; g.fillRect(x, y, 14, 12);
      g.fillStyle = `rgba(190,190,170,${0.3+rnd()*0.2})`; g.fillRect(x, y, 14, 1);
      g.fillStyle = "rgba(20,24,16,0.5)"; g.fillRect(x, y+11, 14, 1); g.fillRect(x+13, y, 1, 12);
      if(rnd()<0.25) aidBlob(g, x+7, y+6, 8, 5, "rgba(70,120,46,0.7)", rnd, 4);
    }
    g.strokeStyle = "rgba(150,230,110,0.5)"; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, 60, 34, 0, 0, 6.283); g.stroke();
    for(let i=0;i<8;i++){ const a = i/8*6.283; g.fillStyle = "rgba(150,230,110,0.7)"; g.fillRect(cx+Math.cos(a)*60-1, cy+Math.sin(a)*34-1, 2, 2); }
  });
}
function bsvArtGlowShrooms(v){
  return aidArt("bsvShrooms"+v, 44, 28, (g,w,h)=>{
    const rnd = aidRng(1311+v*3), cols = [["#46c8d8","#a8f4f0"],["#8a6ae0","#d0baff"]][v%2];
    for(let i=0;i<5;i++){ const x = 6+i*8+rnd()*3, hh = 6+rnd()*10; aidPx(g, x, h-4-hh, 2, hh, "#d8d4c0");
      g.fillStyle = cols[0]; g.beginPath(); g.ellipse(x+1, h-4-hh, 5, 3, 0, Math.PI, 0); g.fill(); aidPx(g, x-2, h-5-hh, 3, 1, cols[1]); }
    bsvOutline(g, w, h, "#0a1420");
  });
}

/* ---------------- Colocación segura de obstáculos ---------------- */
// Dónde vive cada pieza nueva; el resultado queda en BSV.info (pruebas y capturas).
function bsvTry(x, y, r, opt){
  opt = opt || {};
  x = Math.round(x); y = Math.round(y);
  const no = why=>{ const w = BSV.info.why; w[why] = (w[why]||0) + 1; return false; };
  if(!aidInside(x, y, r + (opt.edge===undefined ? 110 : opt.edge))) return no("borde");
  if(Math.hypot(x/1.18, y/0.82) < (opt.center || 330)) return no("centro");     // salida de héroes y jefe
  if(!opt.onPath && bsvPathDist(x, y) < 70 + r) return no("sendero");            // los senderos quedan libres
  const clr = opt.clear===undefined ? 70 : opt.clear;
  if(aidSolids.some(s=>Math.hypot(s.x-x, s.y-y) < s.r + r + clr)) return no("solido");
  if(labyrinthWalls.some(w=>aidPointInWall(w, x, y, r + clr))) return no("muro");
  const s = {x, y, r, bsv:true}; if(opt.low) s.low = true;
  aidSolids.push(s);
  // navegación: nada de lo que se alcanzaba antes puede quedar encerrado
  const now = _layReach(AID_LAYOUT_PAD), base = BSV._base;
  for(let c=0;c<base.seen.length;c++) if(base.seen[c] && !now.blocked[c] && !now.seen[c]){ aidSolids.pop(); return no("encierra"); }
  return true;
}
function bsvPut(art, x, y, r, opt){
  opt = opt || {};
  if(!bsvTry(x, y, r, opt)){ BSV.info.rejected++; return false; }
  // el arte no repite la solidez: ya se agregó en bsvTry
  aidProp(art, Math.round(x), Math.round(y), {flip: !!opt.flip, light: opt.light});
  BSV.info.placed++;
  return true;
}
function bsvBuild(rnd){
  const info = BSV.info = {placed:0, rejected:0, boulders:0, thickets:0, logs:0, columns:0, trees:0, why:{}};
  const salt = _aidSalt();
  const key = String(salt);
  if(!BSV.ground || BSV.groundKey !== key){ BSV.ground = bsvBakeGround(salt); BSV.groundKey = key; }
  BSV._base = _layReach(AID_LAYOUT_PAD);
  // --- templo en ruinas (noroeste): losas, altar bajo, columnas rotas con hueco de entrada al sur ---
  const T = {x:-560, y:-350};
  aidDecal(bsvArtFlagstones(), T.x, T.y, {scale:1.6});
  aidLights.push({x:T.x, y:T.y-10, r:150, rgb:"150,230,110", a:0.34, flick:0.1, ph:1.3});
  [[-150,-70,0],[-90,-110,1],[0,-120,0],[90,-110,1],[150,-70,0],[-165,10,1],[165,10,0]].forEach(([dx,dy,v])=>{
    if(bsvPut(bsvArtBrokenColumn(v), T.x+dx, T.y+dy, 14, {clear:30, edge:60, onPath:true, center:200})) info.columns++;
  });
  // --- árboles antiguos extra en los huecos del borde (copas altas, paran los tiros) ---
  [0.75, 1.65, 2.55, 3.45, 4.35, 5.2, 6.1].forEach((a,i)=>{
    const p = aidOnRing(795, 795, a);
    if(bsvPut(aidArtAncientTree(i%3), p.x, p.y, 26, {flip:i%2===1, clear:60, edge:50, center:200})) info.trees++;
  });
  // --- rocas: solas y en pares, repartidas por anillos ---
  const place = (n, fn, ring, arc0)=>{
    for(let i=0;i<n*3 && fn.count<n;i++){
      const a = arc0 + (rnd()*6.283), rr = ring[0] + rnd()*(ring[1]-ring[0]);
      const p = aidOnRing(rr, rr, a);
      if(fn(p.x, p.y, i)) fn.count++;
    }
  };
  const fBoulder = (x,y,i)=>{ const ok = bsvPut(bsvArtBoulder(i%3), x, y, 24, {flip:i%2===1}); if(ok) info.boulders++; return ok; }; fBoulder.count = 0;
  place(11, fBoulder, [420, 760], 0);
  const fThick = (x,y,i)=>{ const ok = bsvPut(bsvArtThicket(i%2), x, y, 24, {low:true, clear:46, flip:i%3===1}); if(ok) info.thickets++; return ok; }; fThick.count = 0;
  place(16, fThick, [380, 780], 1.1);
  const fLog = (x,y,i)=>{
    // tronco caído: tres círculos bajos a lo largo del tronco (colisión real, no frena los tiros)
    const flip = i%2===1, ok = bsvTry(x, y, 14, {low:true, clear:60}) && bsvTry(x-24, y, 14, {low:true, clear:-8, onPath:true}) && bsvTry(x+24, y, 14, {low:true, clear:-8, onPath:true});
    if(!ok){ BSV.info.rejected++; return false; }
    aidProp(bsvArtLog(i%2), Math.round(x), Math.round(y), {flip});
    info.logs++; info.placed++; return true;
  }; fLog.count = 0;
  place(6, fLog, [430, 740], 2.4);
  // --- luz de hongos bioluminiscentes (decorado sin colisión: pocos, con brillo propio) ---
  for(let i=0;i<7;i++){
    const a = rnd()*6.283, rr = 380 + rnd()*380, p = aidOnRing(rr, rr, a);
    if(!aidInside(p.x, p.y, 120) || aidBlocked(p.x, p.y, 40) || bsvPathDist(p.x, p.y) < 70) continue;
    aidProp(bsvArtGlowShrooms(i%2), Math.round(p.x), Math.round(p.y), {passThrough:true, light:{r:70, rgb:i%2?"150,120,255":"90,220,230", a:0.3, flick:0.2, dy:-14}});
  }
  // los tiros se frenan en: árboles, menhires, rocas, columnas, muros (ver bosBlockProjectile)
}

/* ---------------- Proyectiles: los obstáculos altos los frenan ---------------- */
function bosBlockProjectile(p, x0, y0){
  if(p.lob || p.ignoreTerrain) return false;
  const pr = (p.radius||6)*0.5;
  const mx = (x0+p.x)/2, my = (y0+p.y)/2;
  for(const s of aidSolids){
    if(s.low || s.r < 14) continue;
    const m = s.r + pr, m2 = m*m;
    let dx = p.x-s.x, dy = p.y-s.y;
    if(dx*dx+dy*dy < m2){ _bosShotStop(p); return true; }
    dx = mx-s.x; dy = my-s.y;
    if(dx*dx+dy*dy < m2){ _bosShotStop(p); return true; }
  }
  for(const w of labyrinthWalls){
    const c = Math.cos(-w.rot), sn = Math.sin(-w.rot);
    for(let k=0;k<2;k++){
      const px = k ? mx : p.x, py = k ? my : p.y;
      const dx = px-w.x, dy = py-w.y, lx = dx*c - dy*sn, ly = dx*sn + dy*c;
      if(Math.abs(lx) < w.len/2 + pr && Math.abs(ly) < w.thick/2 + pr){ _bosShotStop(p); return true; }
    }
  }
  return false;
}
function _bosShotStop(p){
  p.life = 0;
  if(typeof vfxBurst==="function" && inView(p.x, p.y, 40)) vfxBurst(p.x, p.y, 4, "spark", 60, 160, 2, 0, -10, 1);
  BSV.shotsStopped = (BSV.shotsStopped||0) + 1;
}
