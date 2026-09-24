"use strict";
/* ============================================================
   js/rendering/arena-props.js
   Arena Identity: arte procedural de escenario (columnas, estatuas, árboles,
   corales...) generado una vez en canvas y cacheado.
   ============================================================ */

/* ============================================================
   ARENA IDENTITY V1 — arte procedural de escenario (pixel art generado una sola vez en canvas
   offscreen y cacheado; en cada frame solo se hace drawImage de lo que está en cámara).
   Cada arena tiene su propio set de piezas: nada de esto es un recoloreo de otra arena.
   ============================================================ */
const AID_ART = {};
// Generador pseudoaleatorio con semilla: el mismo arte/distribución en cada partida de una arena
// (así el jugador aprende el escenario y los tests son reproducibles).
function aidRng(seed){ let s = seed>>>0 || 1; return ()=>{ s ^= s<<13; s>>>=0; s ^= s>>>17; s ^= s<<5; s>>>=0; return (s%100000)/100000; }; }
function aidArt(key, w, h, draw){
  if(AID_ART[key]) return AID_ART[key];
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  draw(g, w, h);
  AID_ART[key] = c;
  return c;
}
function aidPx(g, x, y, w, h, col){ g.fillStyle = col; g.fillRect(x|0, y|0, w|0, h|0); }
function aidShade(rgb, f){ return `rgb(${Math.min(255,rgb[0]*f)|0},${Math.min(255,rgb[1]*f)|0},${Math.min(255,rgb[2]*f)|0})`; }
// Mancha orgánica rellena (musgo, nieve, charcos): unión de círculos con borde pixelado
function aidBlob(g, cx, cy, rx, ry, col, rnd, n){
  g.fillStyle = col;
  for(let i=0;i<(n||9);i++){
    const a = rnd()*6.283, d = rnd()*0.55;
    const x = cx + Math.cos(a)*rx*d, y = cy + Math.sin(a)*ry*d;
    const r = (0.35+rnd()*0.45);
    g.beginPath(); g.ellipse(x|0, y|0, (rx*r)|0 || 1, (ry*r)|0 || 1, 0, 0, 6.283); g.fill();
  }
}

// ---------------- INFERNAL ----------------
function aidArtInfColumn(v){
  return aidArt("infColumn"+v, 30, 70, (g,w,h)=>{
    const rnd = aidRng(11+v*7);
    const top = 6 + (rnd()*14|0);           // altura a la que está quebrada
    aidPx(g, 4, h-8, 22, 8, "#1a1110");     // basa
    aidPx(g, 5, h-9, 20, 2, "#3a2622");
    for(let y=top; y<h-8; y++){
      const shade = 0.75 + 0.25*Math.sin(y*0.4);
      aidPx(g, 8, y, 14, 1, aidShade([104,70,58], shade));
      aidPx(g, 8, y, 3, 1, aidShade([150,98,74], shade));
      aidPx(g, 19, y, 3, 1, aidShade([200,80,30], shade*0.8));
    }
    // estrías verticales
    for(let x=11; x<19; x+=3) aidPx(g, x, top, 1, h-8-top, "rgba(0,0,0,0.35)");
    // borde quebrado irregular
    for(let x=8; x<22; x++){ const d = (rnd()*6)|0; aidPx(g, x, top-1, 1, d, "rgba(0,0,0,0)"); g.clearRect(x, top-2, 1, d+2); }
    // grietas con brasa
    for(let i=0;i<3;i++){
      let x = 10+(rnd()*10|0), y = top+6+(rnd()*(h-24-top)|0);
      for(let k=0;k<7;k++){ aidPx(g, x, y, 1, 1, k%2?"#ff7a2a":"#c7300f"); x += (rnd()*3|0)-1; y += 1; }
    }
    // escombros en la base
    for(let i=0;i<5;i++) aidPx(g, 2+(rnd()*24|0), h-4-(rnd()*3|0), 3, 2, i%2?"#2e1f1b":"#4a3128");
  });
}
function aidArtInfAltar(){
  return aidArt("infAltar", 64, 44, (g,w,h)=>{
    const rnd = aidRng(5);
    aidPx(g, 4, 20, 56, 22, "#140c0b");
    aidPx(g, 6, 18, 52, 20, "#3a2420");
    aidPx(g, 6, 18, 52, 4, "#5a3a30");
    aidPx(g, 6, 34, 52, 4, "#241612");
    // runas grabadas brillando
    for(let i=0;i<7;i++){ const x = 10+i*7; aidPx(g, x, 26, 3, 5, "#b3260c"); aidPx(g, x+1, 27, 1, 3, "#ff8a3a"); }
    // cráneo central con cuernos
    aidPx(g, 27, 6, 10, 10, "#d9ceb3"); aidPx(g, 29, 9, 2, 3, "#1a0a08"); aidPx(g, 33, 9, 2, 3, "#1a0a08");
    aidPx(g, 30, 14, 4, 2, "#8a7f6a");
    aidPx(g, 22, 4, 5, 2, "#d9ceb3"); aidPx(g, 20, 1, 3, 4, "#d9ceb3"); aidPx(g, 37, 4, 5, 2, "#d9ceb3"); aidPx(g, 41, 1, 3, 4, "#d9ceb3");
    // velas
    for(const x of [9, 16, 46, 53]){ aidPx(g, x, 12, 3, 7, "#cbb89a"); aidPx(g, x+1, 9, 1, 3, "#ffcf6a"); aidPx(g, x+1, 10, 1, 1, "#ff6a1a"); }
    // cadenas colgando a los costados
    for(const x of [3, 59]) for(let y=16; y<40; y+=3){ aidPx(g, x, y, 2, 2, "#6a6060"); aidPx(g, x, y+1, 1, 1, "#2a2424"); }
    for(let i=0;i<14;i++) aidPx(g, rnd()*60|0, 40+(rnd()*3|0), 2, 1, "#2a1a16");
  });
}
function aidArtInfStatue(){
  return aidArt("infStatue", 34, 62, (g,w,h)=>{
    aidPx(g, 6, h-10, 22, 10, "#1a1110"); aidPx(g, 7, h-11, 20, 2, "#3a2622");
    aidPx(g, 10, 22, 14, 30, "#5a3c32"); aidPx(g, 11, 22, 4, 30, "#8a5e4a"); aidPx(g, 22, 22, 2, 30, "#c0501e");
    aidPx(g, 12, 12, 10, 11, "#5a3c32"); aidPx(g, 13, 12, 3, 11, "#8a5e4a");
    // cuernos
    aidPx(g, 8, 6, 3, 8, "#1c1210"); aidPx(g, 6, 2, 3, 6, "#1c1210"); aidPx(g, 23, 6, 3, 8, "#1c1210"); aidPx(g, 25, 2, 3, 6, "#1c1210");
    // alas plegadas
    aidPx(g, 3, 20, 7, 22, "#3a2622"); aidPx(g, 24, 20, 7, 22, "#3a2622"); aidPx(g, 3, 20, 7, 1, "#8a5e4a"); aidPx(g, 24, 20, 7, 1, "#8a5e4a");
    // ojos encendidos
    aidPx(g, 14, 16, 2, 2, "#ff4a1a"); aidPx(g, 18, 16, 2, 2, "#ff4a1a");
    aidPx(g, 14, 34, 6, 2, "#b3260c");
  });
}
function aidArtInfBrazier(){
  return aidArt("infBrazier", 18, 26, (g,w,h)=>{
    aidPx(g, 3, 8, 12, 5, "#2a2222"); aidPx(g, 2, 7, 14, 2, "#5a4a44"); aidPx(g, 4, 12, 10, 2, "#161010");
    aidPx(g, 8, 13, 2, 9, "#2a2222"); aidPx(g, 4, 21, 10, 2, "#2a2222"); aidPx(g, 3, 23, 2, 3, "#161010"); aidPx(g, 13, 23, 2, 3, "#161010");
    aidPx(g, 4, 6, 10, 2, "#ff7a2a"); aidPx(g, 6, 5, 6, 1, "#ffd27a");
  });
}
function aidArtInfPentagram(){
  return aidArt("infPentagram", 280, 200, (g,w,h)=>{
    const cx = w/2, cy = h/2;
    g.fillStyle = "rgba(10,4,3,0.75)"; g.beginPath(); g.ellipse(cx, cy, 134, 94, 0, 0, 6.283); g.fill();
    g.strokeStyle = "#2a1410"; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, 128, 90, 0, 0, 6.283); g.stroke();
    g.strokeStyle = "#8a1e0c"; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, 120, 84, 0, 0, 6.283); g.stroke();
    g.beginPath(); g.ellipse(cx, cy, 100, 70, 0, 0, 6.283); g.stroke();
    // estrella de 5 puntas
    g.strokeStyle = "#c2310e"; g.lineWidth = 3; g.beginPath();
    for(let i=0;i<=5;i++){ const a = -Math.PI/2 + i*(Math.PI*4/5); const x = cx+Math.cos(a)*98, y = cy+Math.sin(a)*68; if(i===0) g.moveTo(x,y); else g.lineTo(x,y); }
    g.stroke();
    // glifos en el anillo
    g.fillStyle = "#ff6a2a";
    for(let i=0;i<16;i++){ const a = i/16*6.283; const x = cx+Math.cos(a)*110, y = cy+Math.sin(a)*77; g.fillRect(x-2, y-3, 4, 6); g.fillRect(x-3, y-1, 6, 2); }
  });
}
function aidArtInfFissure(v){
  return aidArt("infFissure"+v, 150, 60, (g,w,h)=>{
    const rnd = aidRng(40+v*13);
    let x = 6, y = h/2 + (rnd()-0.5)*16;
    const pts = [];
    while(x < w-6){ pts.push([x,y]); x += 8+rnd()*12; y += (rnd()-0.5)*16; y = Math.max(10, Math.min(h-10, y)); }
    const stroke = (col, lw)=>{ g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.stroke(); };
    stroke("rgba(0,0,0,0.9)", 14); stroke("#5a0e04", 9); stroke("#d23a0c", 5); stroke("#ffb050", 2);
    for(const p of pts){ if(rnd()<0.5){ g.fillStyle = "#1a0806"; g.fillRect(p[0]-6+rnd()*4, p[1]+5, 5, 3); } }
  });
}
function aidArtScorch(v){
  return aidArt("scorch"+v, 90, 50, (g,w,h)=>{ const rnd = aidRng(70+v); aidBlob(g, w/2, h/2, 40, 20, "rgba(8,4,3,0.55)", rnd, 10); aidBlob(g, w/2, h/2, 20, 10, "rgba(20,8,4,0.5)", rnd, 6); });
}

// ---------------- HIELO ----------------
function aidArtIcePillar(v){
  return aidArt("icePillar"+v, 30, 80, (g,w,h)=>{
    const rnd = aidRng(90+v*5);
    // varias agujas de hielo de distinta altura
    const spikes = [[9,10,16],[4,26,10],[18,20,10],[13,36,8]];
    spikes.forEach(([x,top,wd],i)=>{
      for(let y=top; y<h-4; y++){
        const t = (y-top)/(h-4-top); const ww = Math.max(2, wd*Math.min(1, t*2.2));
        const x0 = x + (wd-ww)/2;
        aidPx(g, x0, y, ww, 1, i===0 ? "#6fb6e8" : "#5aa0d8");
        aidPx(g, x0, y, Math.max(1,ww*0.35), 1, "#cfeeff");
        aidPx(g, x0+ww-1, y, 1, 1, "#2d6aa0");
      }
    });
    aidPx(g, 2, h-5, 26, 5, "#e8f6ff"); aidPx(g, 4, h-6, 22, 2, "#ffffff");
    for(let i=0;i<6;i++) aidPx(g, 6+(rnd()*18|0), 20+(rnd()*50|0), 1, 3, "#ffffff");
  });
}
function aidArtIceCluster(v){
  return aidArt("iceCluster"+v, 44, 36, (g,w,h)=>{
    const rnd = aidRng(120+v*3);
    for(let i=0;i<6;i++){
      const x = 6+rnd()*30, top = 4+rnd()*18, wd = 4+rnd()*6;
      for(let y=top|0; y<h-3; y++){ const t=(y-top)/(h-3-top), ww=Math.max(1,wd*Math.min(1,t*2)); aidPx(g, x+(wd-ww)/2, y, ww, 1, "#7cc3ee"); aidPx(g, x+(wd-ww)/2, y, Math.max(1,ww*0.3), 1, "#e4f7ff"); }
    }
    aidPx(g, 2, h-4, 40, 4, "#dff2ff");
  });
}
function aidArtIceArch(){
  return aidArt("iceArch", 110, 80, (g,w,h)=>{
    // arco de piedra en ruinas atrapado en un bloque de hielo
    const st = "#6a6f7a", st2 = "#8a909a", st3 = "#40444c";
    aidPx(g, 14, 22, 16, 54, st); aidPx(g, 14, 22, 5, 54, st2); aidPx(g, 26, 22, 4, 54, st3);
    aidPx(g, 80, 30, 16, 46, st); aidPx(g, 80, 30, 5, 46, st2); aidPx(g, 92, 30, 4, 46, st3);
    for(let x=14; x<70; x++){ const y = 22 - Math.sin((x-14)/112*Math.PI)*16; aidPx(g, x, y, 1, 10, st); aidPx(g, x, y, 1, 2, st2); }
    for(let y=6; y<16; y+=3) aidPx(g, 66, y, 8, 2, st3); // arco partido
    // hielo envolvente
    g.fillStyle = "rgba(150,210,245,0.42)";
    g.beginPath(); g.moveTo(6,h-2); g.lineTo(10,30); g.lineTo(24,10); g.lineTo(52,2); g.lineTo(78,14); g.lineTo(102,26); g.lineTo(106,h-2); g.closePath(); g.fill();
    g.strokeStyle = "rgba(230,248,255,0.7)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(10,30); g.lineTo(24,10); g.lineTo(52,2); g.lineTo(78,14); g.lineTo(102,26); g.stroke();
    for(let i=0;i<8;i++){ aidPx(g, 20+i*10, 20+(i%3)*14, 1, 6, "rgba(255,255,255,0.8)"); }
    aidPx(g, 2, h-6, 106, 6, "#e8f6ff");
  });
}
function aidArtIceStatue(){
  return aidArt("iceStatue", 32, 66, (g,w,h)=>{
    aidPx(g, 6, h-9, 20, 9, "#5a5e68");
    aidPx(g, 10, 22, 12, 36, "#7a7e88"); aidPx(g, 10, 22, 4, 36, "#9aa0a8");
    aidPx(g, 11, 12, 10, 11, "#7a7e88"); aidPx(g, 11, 12, 3, 11, "#9aa0a8");
    aidPx(g, 6, 24, 4, 18, "#6a6e78"); aidPx(g, 22, 24, 4, 18, "#6a6e78");   // brazos
    aidPx(g, 23, 6, 2, 22, "#8a8e98"); aidPx(g, 21, 6, 6, 2, "#8a8e98");      // espada alzada
    g.fillStyle = "rgba(160,215,245,0.45)"; g.fillRect(3, 4, 26, h-6);
    g.fillStyle = "rgba(235,250,255,0.6)"; g.fillRect(4, 5, 2, h-10); g.fillRect(3, 4, 26, 2);
  });
}
function aidArtFrozenLake(){
  return aidArt("frozenLake", 300, 200, (g,w,h)=>{
    const rnd = aidRng(7);
    const cx=w/2, cy=h/2;
    g.fillStyle = "rgba(40,90,140,0.55)"; g.beginPath(); g.ellipse(cx,cy,146,96,0,0,6.283); g.fill();
    g.fillStyle = "rgba(120,190,235,0.55)"; g.beginPath(); g.ellipse(cx,cy-4,136,86,0,0,6.283); g.fill();
    g.fillStyle = "rgba(200,235,255,0.35)"; g.beginPath(); g.ellipse(cx-30,cy-24,60,22,-0.3,0,6.283); g.fill();
    // grietas del hielo
    g.strokeStyle = "rgba(245,252,255,0.75)"; g.lineWidth = 1.2;
    for(let i=0;i<9;i++){
      let x = cx+(rnd()-0.5)*40, y = cy+(rnd()-0.5)*30, a = rnd()*6.283; g.beginPath(); g.moveTo(x,y);
      for(let k=0;k<6;k++){ a += (rnd()-0.5)*0.9; x += Math.cos(a)*18; y += Math.sin(a)*12; g.lineTo(x,y); }
      g.stroke();
    }
    // borde de nieve
    g.strokeStyle = "rgba(240,250,255,0.9)"; g.lineWidth = 5; g.beginPath(); g.ellipse(cx,cy,142,93,0,0,6.283); g.stroke();
  });
}
function aidArtSnowDrift(v){
  return aidArt("snowDrift"+v, 110, 50, (g,w,h)=>{ const rnd = aidRng(200+v); aidBlob(g, w/2, h/2, 50, 20, "rgba(235,246,255,0.55)", rnd, 11); aidBlob(g, w/2, h/2-3, 30, 10, "rgba(255,255,255,0.55)", rnd, 6); });
}
function aidArtIceCrack(v){
  return aidArt("iceCrack"+v, 120, 70, (g,w,h)=>{
    const rnd = aidRng(300+v*9);
    g.strokeStyle = "rgba(10,40,70,0.8)"; g.lineWidth = 3;
    const draw = (x,y,a,n,lw)=>{ g.lineWidth = lw; g.beginPath(); g.moveTo(x,y); for(let k=0;k<n;k++){ a += (rnd()-0.5)*0.8; x += Math.cos(a)*10; y += Math.sin(a)*7; g.lineTo(x,y); if(rnd()<0.25 && lw>1) draw(x,y,a+(rnd()<0.5?1:-1),3,lw-1); } g.stroke(); };
    g.strokeStyle = "rgba(20,60,100,0.85)"; draw(10, h/2, 0, 10, 3);
    g.strokeStyle = "rgba(170,225,255,0.55)"; g.lineWidth = 1; draw(10, h/2-1, 0, 10, 1);
  });
}

// ---------------- BOSQUE ----------------
function aidArtMenhir(v){
  return aidArt("menhir"+v, 24, 60, (g,w,h)=>{
    const rnd = aidRng(400+v*11);
    const top = 4 + (rnd()*6|0);
    for(let y=top; y<h-4; y++){
      const t = (y-top)/(h-4-top); const ww = 10 + t*8 + Math.sin(y*0.3+v)*1.5;
      const x0 = (w-ww)/2;
      aidPx(g, x0, y, ww, 1, "#6a6a62"); aidPx(g, x0, y, 3, 1, "#8a8a80"); aidPx(g, x0+ww-3, y, 3, 1, "#46463f");
    }
    // espiral celta tallada, con brillo de runa
    const cx = w/2, cy = top+18;
    g.strokeStyle = "#9ae07a"; g.lineWidth = 1; g.beginPath();
    for(let a=0; a<12; a+=0.35){ const r = a*0.55; const x = cx+Math.cos(a)*r, y = cy+Math.sin(a)*r; if(a===0) g.moveTo(x,y); else g.lineTo(x,y); }
    g.stroke();
    // musgo
    for(let i=0;i<16;i++){ const y = top + (rnd()*(h-top-6)); const x = (w-14)/2 + rnd()*14; aidPx(g, x, y, 2+(rnd()*3|0), 2, rnd()<0.5?"#3f6a2a":"#5a8a36"); }
    aidPx(g, 2, h-5, 20, 5, "#2e4a22"); aidPx(g, 4, h-6, 16, 2, "#4a7a30");
  });
}
function aidArtAncientTree(v){
  return aidArt("ancientTree"+v, 100, 130, (g,w,h)=>{
    const rnd = aidRng(500+v*17);
    // raíces
    for(let i=0;i<6;i++){ const dir = i<3?-1:1; let x = w/2+dir*(4+i%3*3), y = h-18; g.strokeStyle = "#3a2618"; g.lineWidth = 4-(i%3); g.beginPath(); g.moveTo(x,y); for(let k=0;k<5;k++){ x += dir*(4+rnd()*5); y += 2+rnd()*2; g.lineTo(x,y); } g.stroke(); }
    // tronco grueso y retorcido
    for(let y=48; y<h-14; y++){
      const t = (y-48)/(h-62); const ww = 16 + t*12 + Math.sin(y*0.15)*2;
      const x0 = w/2 - ww/2 + Math.sin(y*0.06+v)*3;
      aidPx(g, x0, y, ww, 1, "#4a3222"); aidPx(g, x0, y, 4, 1, "#6a4a30"); aidPx(g, x0+ww-4, y, 4, 1, "#2a1a10");
      if(y%9===0) aidPx(g, x0+5, y, ww-10, 1, "#3a2618");
    }
    // copa: capas de follaje
    const blobs = [[50,34,40,26,"#1f3a1a"],[34,40,24,18,"#2a4a20"],[66,40,24,18,"#2a4a20"],[50,26,30,18,"#35602a"],[40,20,16,11,"#4a7a34"],[62,24,14,10,"#4a7a34"]];
    for(const [x,y,rx,ry,c] of blobs) aidBlob(g, x, y, rx, ry, c, rnd, 12);
    for(let i=0;i<40;i++){ aidPx(g, 14+rnd()*72, 6+rnd()*50, 2, 2, rnd()<0.5?"#6aa04a":"#8ac060"); }
    // musgos colgantes
    for(let i=0;i<7;i++){ const x = 20+rnd()*60; for(let y=44; y<50+rnd()*14; y++) aidPx(g, x, y, 1, 1, "#4a7a34"); }
  });
}
function aidArtCelticStatue(){
  return aidArt("celticStatue", 30, 64, (g,w,h)=>{
    aidPx(g, 5, h-8, 20, 8, "#4a4a44");
    aidPx(g, 12, 8, 6, h-16, "#727268"); aidPx(g, 12, 8, 2, h-16, "#90907f");
    aidPx(g, 4, 16, 22, 6, "#727268"); aidPx(g, 4, 16, 22, 2, "#90907f");
    g.strokeStyle = "#5a5a52"; g.lineWidth = 2; g.beginPath(); g.arc(15, 19, 9, 0, 6.283); g.stroke();
    g.strokeStyle = "#9ae07a"; g.lineWidth = 1; g.beginPath(); g.arc(15, 19, 4, 0, 6.283); g.stroke();
    for(let i=0;i<14;i++) aidPx(g, 6+Math.random()*18, 10+Math.random()*48, 2, 2, Math.random()<0.5?"#3f6a2a":"#5a8a36");
  });
}
function aidArtRuinArch(){
  return aidArt("ruinArch", 96, 80, (g,w,h)=>{
    const rnd = aidRng(61);
    const st = "#6e6c60", st2 = "#8c8a7c", st3 = "#4a4840";
    aidPx(g, 10, 20, 14, 58, st); aidPx(g, 10, 20, 4, 58, st2); aidPx(g, 20, 20, 4, 58, st3);
    aidPx(g, 72, 34, 14, 44, st); aidPx(g, 72, 34, 4, 44, st2); aidPx(g, 82, 34, 4, 44, st3);
    for(let x=10; x<60; x++){ const y = 20 - Math.sin((x-10)/100*Math.PI)*14; aidPx(g, x, y, 1, 9, st); aidPx(g, x, y, 1, 2, st2); }
    // enredaderas
    for(let i=0;i<5;i++){ let x = 12+rnd()*70, y = 8+rnd()*10; for(let k=0;k<22;k++){ aidPx(g, x, y, 2, 2, k%3?"#3f6a2a":"#6aa04a"); x += (rnd()-0.5)*3; y += 2; } }
    for(let i=0;i<10;i++) aidPx(g, 4+rnd()*88, h-4-rnd()*3, 4, 3, i%2?st3:st);
  });
}
function aidArtRitualCircle(){
  return aidArt("ritualCircle", 300, 210, (g,w,h)=>{
    const rnd = aidRng(3), cx=w/2, cy=h/2;
    g.fillStyle = "rgba(60,62,52,0.8)"; g.beginPath(); g.ellipse(cx,cy,142,98,0,0,6.283); g.fill();
    // losas en anillo
    for(let i=0;i<24;i++){ const a0 = i/24*6.283, a1 = (i+1)/24*6.283-0.03;
      g.fillStyle = i%2 ? "rgba(96,96,84,0.9)" : "rgba(84,84,72,0.9)";
      g.beginPath(); g.ellipse(cx,cy,140,96,0,a0,a1); g.ellipse(cx,cy,104,72,0,a1,a0,true); g.closePath(); g.fill(); }
    g.fillStyle = "rgba(54,56,46,0.95)"; g.beginPath(); g.ellipse(cx,cy,100,69,0,0,6.283); g.fill();
    // nudo celta / trisquel luminoso
    g.strokeStyle = "rgba(150,230,110,0.8)"; g.lineWidth = 3;
    for(let k=0;k<3;k++){ g.beginPath(); for(let a=0; a<9; a+=0.3){ const r=a*5; const ang = a + k*2.094; const x = cx+Math.cos(ang)*r, y = cy+Math.sin(ang)*r*0.69; if(a===0) g.moveTo(x,y); else g.lineTo(x,y); } g.stroke(); }
    g.strokeStyle = "rgba(120,200,90,0.55)"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx,cy,122,84,0,0,6.283); g.stroke();
    // musgo que se come las losas
    for(let i=0;i<10;i++) aidBlob(g, cx+(rnd()-0.5)*260, cy+(rnd()-0.5)*170, 18, 10, "rgba(60,110,40,0.55)", rnd, 5);
  });
}
function aidArtMoss(v){
  return aidArt("moss"+v, 100, 54, (g,w,h)=>{ const rnd = aidRng(600+v); aidBlob(g, w/2, h/2, 46, 22, "rgba(52,96,36,0.55)", rnd, 12); aidBlob(g, w/2, h/2, 24, 12, "rgba(90,140,60,0.45)", rnd, 7);
    for(let i=0;i<12;i++) aidPx(g, 10+rnd()*80, 8+rnd()*38, 2, 2, rnd()<0.3?"#e8e070":(rnd()<0.5?"#d86ab0":"#9ad07a")); });
}
function aidArtRoots(v){
  return aidArt("roots"+v, 160, 80, (g,w,h)=>{
    const rnd = aidRng(700+v*3);
    for(let i=0;i<5;i++){
      let x = 4, y = 20+rnd()*40, a = (rnd()-0.5)*0.4, lw = 5-i*0.6;
      g.strokeStyle = "#2e1e12"; g.lineCap = "round";
      for(let k=0;k<14;k++){ const nx = x+Math.cos(a)*11, ny = y+Math.sin(a)*6; g.lineWidth = Math.max(1, lw*(1-k/16)); g.beginPath(); g.moveTo(x,y); g.lineTo(nx,ny); g.stroke();
        g.strokeStyle = "#4a3222"; g.lineWidth = Math.max(1, lw*(1-k/16)*0.4); g.beginPath(); g.moveTo(x,y-1); g.lineTo(nx,ny-1); g.stroke(); g.strokeStyle = "#2e1e12";
        x = nx; y = ny; a += (rnd()-0.5)*0.7; }
    }
  });
}
function aidArtStream(){
  return aidArt("stream", 420, 90, (g,w,h)=>{
    const pts=[]; for(let x=0;x<=w;x+=14) pts.push([x, h/2 + Math.sin(x/60)*16]);
    const band = (col, lw)=>{ g.strokeStyle = col; g.lineWidth = lw; g.lineJoin="round"; g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.stroke(); };
    band("rgba(30,40,24,0.9)", 40); band("rgba(40,90,90,0.9)", 30); band("rgba(70,140,140,0.6)", 16); band("rgba(180,230,220,0.35)", 3);
    // puente natural de raíces a mitad del arroyo
    const bx = w/2;
    for(let i=0;i<5;i++){ g.strokeStyle = i%2?"#4a3222":"#2e1e12"; g.lineWidth = 5; g.beginPath(); g.moveTo(bx-24+i*2, h/2-30); g.quadraticCurveTo(bx+i*3-6, h/2, bx-20+i*9, h/2+30); g.stroke(); }
    for(let i=0;i<8;i++){ g.fillStyle = "#3f6a2a"; g.fillRect(bx-26+i*6, h/2-6+(i%3)*4, 4, 3); }
  });
}

// ---------------- LABERINTO ----------------
function aidArtObelisk(){
  return aidArt("obelisk", 26, 90, (g,w,h)=>{
    aidPx(g, 3, h-8, 20, 8, "#5a4a32"); aidPx(g, 3, h-9, 20, 2, "#8a7450");
    for(let y=12; y<h-8; y++){ const t=(y-12)/(h-20); const ww = 8+t*6; const x0=(w-ww)/2; aidPx(g, x0, y, ww, 1, "#a88a5a"); aidPx(g, x0, y, 2, 1, "#c8a870"); aidPx(g, x0+ww-2, y, 2, 1, "#7a6040"); }
    g.fillStyle = "#e0c070"; g.beginPath(); g.moveTo(w/2, 2); g.lineTo(w/2+4, 12); g.lineTo(w/2-4, 12); g.closePath(); g.fill();
    // jeroglíficos
    for(let y=20; y<h-16; y+=7){ aidPx(g, w/2-2, y, 4, 1, "#5a4428"); aidPx(g, w/2-1, y+2, 2, 2, "#5a4428"); }
  });
}
function aidArtMinotaurChamber(){
  return aidArt("minoChamber", 420, 290, (g,w,h)=>{
    const cx=w/2, cy=h/2, rnd = aidRng(9);
    g.fillStyle = "rgba(60,44,28,0.9)"; g.beginPath(); g.ellipse(cx,cy,204,140,0,0,6.283); g.fill();
    // mosaico de losas radiales
    for(let i=0;i<32;i++){ const a0=i/32*6.283, a1=(i+1)/32*6.283-0.02; g.fillStyle = i%2?"rgba(150,118,72,0.85)":"rgba(128,100,62,0.85)";
      g.beginPath(); g.ellipse(cx,cy,196,134,0,a0,a1); g.ellipse(cx,cy,120,82,0,a1,a0,true); g.closePath(); g.fill(); }
    // disco solar y cuernos de toro (sello del Minotauro)
    g.fillStyle = "rgba(90,60,30,0.95)"; g.beginPath(); g.ellipse(cx,cy,116,80,0,0,6.283); g.fill();
    g.strokeStyle = "#e0b060"; g.lineWidth = 4; g.beginPath(); g.ellipse(cx,cy,70,48,0,0,6.283); g.stroke();
    for(let i=0;i<16;i++){ const a=i/16*6.283; g.beginPath(); g.moveTo(cx+Math.cos(a)*76, cy+Math.sin(a)*52); g.lineTo(cx+Math.cos(a)*104, cy+Math.sin(a)*71); g.stroke(); }
    g.strokeStyle = "#c89048"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(cx-36, cy+6); g.quadraticCurveTo(cx-60, cy-40, cx-20, cy-46); g.stroke();
    g.beginPath(); g.moveTo(cx+36, cy+6); g.quadraticCurveTo(cx+60, cy-40, cx+20, cy-46); g.stroke();
    g.fillStyle = "#c89048"; g.beginPath(); g.ellipse(cx, cy+8, 26, 18, 0, 0, 6.283); g.fill();
    g.fillStyle = "#3a2410"; g.fillRect(cx-12, cy+2, 6, 5); g.fillRect(cx+6, cy+2, 6, 5);
    // grietas y arena acumulada
    g.strokeStyle = "rgba(20,12,6,0.7)"; g.lineWidth = 2;
    for(let i=0;i<8;i++){ let x=cx+(rnd()-0.5)*300, y=cy+(rnd()-0.5)*200; g.beginPath(); g.moveTo(x,y); for(let k=0;k<4;k++){ x+=(rnd()-0.5)*40; y+=(rnd()-0.5)*26; g.lineTo(x,y); } g.stroke(); }
    for(let i=0;i<6;i++) aidBlob(g, cx+(rnd()-0.5)*340, cy+(rnd()-0.5)*220, 30, 14, "rgba(200,170,110,0.35)", rnd, 6);
  });
}
function aidArtSandDrift(v){
  return aidArt("sandDrift"+v, 120, 50, (g,w,h)=>{ const rnd = aidRng(800+v); aidBlob(g, w/2, h/2, 54, 20, "rgba(196,160,100,0.35)", rnd, 10);
    g.strokeStyle = "rgba(230,200,140,0.35)"; g.lineWidth = 1; for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(20+i*6, 14+i*6); g.quadraticCurveTo(60, 8+i*6, 100-i*6, 16+i*6); g.stroke(); } });
}
function aidArtBrokenTiles(v){
  return aidArt("brokenTiles"+v, 80, 50, (g,w,h)=>{ const rnd = aidRng(900+v);
    for(let i=0;i<9;i++){ const x=6+rnd()*60, y=6+rnd()*34, s=6+rnd()*8; aidPx(g, x, y, s, s*0.6, rnd()<0.5?"rgba(150,118,72,0.8)":"rgba(110,86,52,0.8)"); aidPx(g, x, y, s, 1, "rgba(200,170,110,0.6)"); } });
}

// ---------------- ACUÁTICA ----------------
function aidArtSunkColumn(v){
  return aidArt("sunkColumn"+v, 30, 76, (g,w,h)=>{
    const rnd = aidRng(1000+v*7);
    const top = 8 + (rnd()*20|0);
    aidPx(g, 3, h-8, 24, 8, "#3a5054"); aidPx(g, 4, h-9, 22, 2, "#6a8a8a");
    for(let y=top; y<h-8; y++){ aidPx(g, 8, y, 14, 1, "#7a9a98"); aidPx(g, 8, y, 3, 1, "#a0bcb8"); aidPx(g, 19, y, 3, 1, "#4a6664"); }
    for(let x=11; x<19; x+=3) aidPx(g, x, top, 1, h-8-top, "rgba(20,40,40,0.35)");
    for(let x=8; x<22; x++){ const d = (rnd()*5)|0; g.clearRect(x, top-1, 1, d+1); }
    // algas y percebes
    for(let i=0;i<14;i++) aidPx(g, 7+rnd()*16, top+rnd()*(h-top-10), 2, 3, rnd()<0.6?"#2e7a5a":"#4aa07a");
    for(let i=0;i<5;i++) aidPx(g, 7+rnd()*16, top+rnd()*(h-top-10), 2, 2, "#d88aa8");
  });
}
function aidArtTomb(){
  return aidArt("tomb", 56, 36, (g,w,h)=>{
    aidPx(g, 4, 12, 48, 22, "#34484a"); aidPx(g, 4, 10, 48, 6, "#5a7474"); aidPx(g, 4, 10, 48, 2, "#7a9696");
    aidPx(g, 8, 18, 40, 1, "#22302f"); for(let x=10; x<46; x+=6) aidPx(g, x, 22, 3, 6, "#22302f");
    // tapa corrida
    aidPx(g, 2, 6, 44, 6, "#4a6464"); aidPx(g, 2, 6, 44, 2, "#6a8888");
    aidPx(g, 20, 12, 10, 3, "#0a1414");
    for(let i=0;i<10;i++) aidPx(g, 4+Math.random()*48, 10+Math.random()*22, 2, 2, Math.random()<0.5?"#2e7a5a":"#c87aa0");
  });
}
function aidArtCoral(v){
  return aidArt("coral"+v, 44, 40, (g,w,h)=>{
    const rnd = aidRng(1100+v*5);
    const cols = [["#e0607a","#ff9aaa"],["#e08a3a","#ffc070"],["#8a5ae0","#c0a0ff"],["#3ab0a0","#8ae8d8"]][v%4];
    for(let i=0;i<6;i++){ let x = 8+rnd()*28, y = h-3, a = -Math.PI/2+(rnd()-0.5)*0.8; for(let k=0;k<7;k++){ aidPx(g, x, y, 3, 3, k%2?cols[0]:cols[1]); x += Math.cos(a)*4; y += Math.sin(a)*4; a += (rnd()-0.5)*0.7; if(rnd()<0.25){ aidPx(g, x+3, y, 2, 2, cols[1]); } } }
    aidPx(g, 4, h-3, 36, 3, "#4a5a50");
  });
}
function aidArtShipwreck(){
  return aidArt("shipwreck", 150, 80, (g,w,h)=>{
    const wood = "#4a3424", wood2 = "#6a4a30", wood3 = "#2a1c12";
    g.fillStyle = wood3; g.beginPath(); g.moveTo(8,h-6); g.quadraticCurveTo(20,30,70,24); g.lineTo(140,20); g.lineTo(144,h-6); g.closePath(); g.fill();
    for(let y=28; y<h-8; y+=6){ g.strokeStyle = y%12?wood:wood2; g.lineWidth = 4; g.beginPath(); g.moveTo(18,y+(h-y)*0.1); g.lineTo(140,y); g.stroke(); }
    for(let x=30; x<140; x+=18){ aidPx(g, x, 24, 3, h-30, wood3); }
    // mástil partido
    aidPx(g, 92, 2, 5, 26, wood2); aidPx(g, 88, 10, 14, 3, wood);
    // agujeros y algas
    aidPx(g, 60, 40, 14, 10, "#0a1418"); aidPx(g, 104, 44, 10, 8, "#0a1418");
    for(let i=0;i<24;i++) aidPx(g, 14+Math.random()*126, 24+Math.random()*44, 2, 3, Math.random()<0.6?"#2e7a5a":"#4aa07a");
    aidPx(g, 4, h-6, 144, 6, "#3a4e4a");
  });
}
function aidArtSunkTemple(){
  return aidArt("sunkTemple", 340, 230, (g,w,h)=>{
    const cx=w/2, cy=h/2, rnd = aidRng(13);
    g.fillStyle = "rgba(40,66,66,0.85)"; g.beginPath(); g.ellipse(cx,cy,164,110,0,0,6.283); g.fill();
    // mosaico hundido: ondas y un tritón/concha en el centro
    for(let r=0;r<5;r++){ g.strokeStyle = r%2?"rgba(90,150,150,0.7)":"rgba(60,110,110,0.7)"; g.lineWidth = 6; g.beginPath(); g.ellipse(cx,cy,150-r*24,100-r*16,0,0,6.283); g.stroke(); }
    g.fillStyle = "rgba(200,180,130,0.85)";
    for(let i=0;i<9;i++){ const a = -Math.PI + i/8*Math.PI; g.beginPath(); g.moveTo(cx, cy+20); g.lineTo(cx+Math.cos(a)*44, cy+Math.sin(a)*34); g.lineTo(cx+Math.cos(a+0.2)*44, cy+Math.sin(a+0.2)*34); g.closePath(); g.fill(); }
    // losas faltantes y arena encima
    for(let i=0;i<8;i++) aidBlob(g, cx+(rnd()-0.5)*260, cy+(rnd()-0.5)*170, 22, 12, "rgba(170,150,100,0.45)", rnd, 6);
    for(let i=0;i<10;i++) aidPx(g, cx+(rnd()-0.5)*260, cy+(rnd()-0.5)*170, 10, 6, "rgba(10,24,26,0.8)");
  });
}
function aidArtSandRipples(v){
  return aidArt("sandRipples"+v, 130, 60, (g,w,h)=>{ const rnd = aidRng(1200+v); aidBlob(g, w/2, h/2, 60, 24, "rgba(150,140,100,0.30)", rnd, 9);
    g.strokeStyle = "rgba(210,200,150,0.30)"; g.lineWidth = 1.5; for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(14, 12+i*9); g.bezierCurveTo(40, 6+i*9, 80, 18+i*9, 116, 10+i*9); g.stroke(); }
    for(let i=0;i<4;i++){ aidPx(g, 20+rnd()*90, 10+rnd()*40, 4, 3, "#e8d8c0"); } });
}

// ---------------- DIVINA ----------------
function aidArtAngelStatue(){
  return aidArt("angelStatue", 40, 70, (g,w,h)=>{
    aidPx(g, 8, h-10, 24, 10, "#c8c0a8"); aidPx(g, 8, h-11, 24, 2, "#f0e8d0"); aidPx(g, 10, h-7, 20, 2, "#e0b050");
    aidPx(g, 16, 24, 8, 36, "#e8e0cc"); aidPx(g, 16, 24, 3, 36, "#fffaf0");
    aidPx(g, 16, 14, 8, 10, "#e8e0cc");
    // alas
    for(let i=0;i<14;i++){ aidPx(g, 14-i*0.7, 20+i, 3+i*0.4, 2, "#f4f0e4"); aidPx(g, 23+i*0.3, 20+i, 3+i*0.4, 2, "#f4f0e4"); }
    aidPx(g, 18, 8, 4, 2, "#ffd76a"); aidPx(g, 16, 6, 8, 1, "#ffd76a"); // halo
  });
}
function aidArtInfernalSpike(v){
  return aidArt("infSpike"+v, 30, 64, (g,w,h)=>{
    const rnd = aidRng(1300+v);
    for(let i=0;i<3;i++){ const x = 6+i*8+rnd()*3, top = 6+rnd()*20; for(let y=top|0; y<h-4; y++){ const t=(y-top)/(h-4-top), ww=Math.max(1, 7*Math.min(1,t*1.6)); aidPx(g, x+(7-ww)/2, y, ww, 1, "#2a1426"); aidPx(g, x+(7-ww)/2, y, 1, 1, "#5a2448"); } }
    for(let i=0;i<5;i++) aidPx(g, 8+rnd()*14, 20+rnd()*36, 1, 4, "#e02a3a");
    aidPx(g, 2, h-5, 26, 5, "#1a0c16");
  });
}
