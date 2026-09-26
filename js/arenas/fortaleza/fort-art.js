"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-art.js
   Arte del ESCENARIO de la Fortaleza, pintado por código en pixel art (1 píxel = 2 unidades de
   mundo, el mismo grano que el resto de los escenarios). La hoja de referencia del mapa es una
   ilustración isométrica sin recortes limpios: de ella salen la PALETA y los MOTIVOS (adoquín
   gris-pardo, almenas oscuras, lava, estandartes rojos, braseros, engranajes de bronce, cadenas,
   rejas), no píxeles. Los personajes y FX sí son recortes reales de las hojas (fort-render.js).
   Todo se genera UNA vez por partida y queda en caché (aidArt / FORT_ART).
   ============================================================ */
const FORT_K = 0.5;          // canvas px por unidad de mundo
const FORT_CLIFF = 50;       // alto de la cara del risco bajo el borde sur de cada plataforma
const FORT_PAL = {
  mortar:"#17110e", stone:[[74,64,56],[86,74,64],[64,56,50],[96,84,72]], dirt:"#3a2e24",
  rim:"#a08a72", rimDark:"#2a211b", wall:"#231b16", wallLit:"#3a2f27", brick:"#140f0c",
  iron:"#3c3c42", ironLit:"#6a6a72", ironDark:"#1e1e22", rust:"#7a3a22", rustLit:"#a0522d",
  brass:"#b08040", brassLit:"#e0b060", brassDark:"#5a3e1c", lava:"#ff6a1a", lavaHot:"#ffd24a",
  banner:"#8a1a1a", bannerLit:"#c02a2a", wood:"#5a3e26", woodLit:"#7a5634"
};
const FORT_ART = {};
function _fortCanvas(w, h){ const c = document.createElement("canvas"); c.width = Math.max(1, w|0); c.height = Math.max(1, h|0); const g = c.getContext("2d"); g.imageSmoothingEnabled = false; return [c, g]; }
function _rgb(a, f){ return `rgb(${Math.min(255,a[0]*f)|0},${Math.min(255,a[1]*f)|0},${Math.min(255,a[2]*f)|0})`; }

/* ---------------- pisos por tema ---------------- */
// Adoquín irregular (patio / puentes de piedra): piedras de 5-8 px con mortero y brillo arriba.
// Dirección de arte: antes era mortero casi negro + filas regulares con luz y sombra en cada piedra,
// que en pantalla se leía como una PARED de ladrillo (no se distinguía piso de muro). Ahora:
// piedras más grandes e irregulares, mortero cercano al tono de la piedra (poco contraste) y
// manchas amplias de tierra: una superficie para caminar, no un paramento.
function _fortCobble(g, w, h, rnd, tint, big){
  g.fillStyle = "#3a322b"; g.fillRect(0, 0, w, h);
  const sw = big ? 15 : 11, sh = big ? 11 : 8;
  for(let y=0, row=0; y<h; y+=sh, row++){
    for(let x=-(row%2)*sw*0.45 - rnd()*3; x<w; x+=sw + (rnd()*3|0)){
      const ww = sw - 1 - (rnd()*3|0), hh = sh - 1 - (rnd()*2|0);
      const base = FORT_PAL.stone[(rnd()*4)|0], f = (0.9 + rnd()*0.14)*(tint||1);
      g.fillStyle = _rgb(base, f); g.fillRect(x+1, y+1, ww, hh);
      g.fillStyle = _rgb(base, f*1.07); g.fillRect(x+1, y+1, ww, 1);
      if(rnd() < 0.05){ g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(x+2+(rnd()*3|0), y+2, 2, 1); }
    }
  }
  // manchas amplias de tierra/desgaste: rompen la grilla y dicen "suelo pisado"
  for(let i=0;i<Math.max(4, w*h/2600);i++){ const x = rnd()*w, y = rnd()*h; g.fillStyle = `rgba(${40+rnd()*20|0},${30+rnd()*14|0},${22+rnd()*10|0},${0.18+rnd()*0.18})`; g.beginPath(); g.ellipse(x, y, 10+rnd()*26, 5+rnd()*12, rnd()*3, 0, Math.PI*2); g.fill(); }
}
// Losas grandes (prisión / cámara): cuadradas, con manchas.
function _fortFlags(g, w, h, rnd, cols, s){
  g.fillStyle = FORT_PAL.mortar; g.fillRect(0, 0, w, h);
  for(let y=0; y<h; y+=s) for(let x=0; x<w; x+=s){
    const c = cols[(rnd()*cols.length)|0], f = 0.85 + rnd()*0.25;
    g.fillStyle = _rgb(c, f); g.fillRect(x+1, y+1, s-2, s-2);
    g.fillStyle = _rgb(c, f*1.15); g.fillRect(x+1, y+1, s-2, 1);
    g.fillStyle = _rgb(c, f*0.7); g.fillRect(x+1, y+s-2, s-2, 1);
    if(rnd() < 0.18){ g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x+2+(rnd()*(s-6)|0), y+2+(rnd()*(s-6)|0), 3, 2); }
  }
}
// Planchas de hierro remachadas (forja / interior)
function _fortPlates(g, w, h, rnd, base, s){
  g.fillStyle = FORT_PAL.ironDark; g.fillRect(0, 0, w, h);
  for(let y=0; y<h; y+=s) for(let x=0; x<w; x+=s*1.5){
    const f = 0.85 + rnd()*0.25, pw = s*1.5-2, ph = s-2;
    g.fillStyle = _rgb(base, f); g.fillRect(x+1, y+1, pw, ph);
    g.fillStyle = _rgb(base, f*1.25); g.fillRect(x+1, y+1, pw, 1);
    g.fillStyle = _rgb(base, f*0.65); g.fillRect(x+1, y+ph, pw, 1);
    g.fillStyle = "#8a8078"; for(const [rx,ry] of [[3,3],[pw-3,3],[3,ph-2],[pw-3,ph-2]]) g.fillRect(x+rx, y+ry, 1, 1);
    if(rnd() < 0.3){ g.fillStyle = "rgba(122,58,34,0.45)"; g.fillRect(x+2+(rnd()*(pw-8)|0), y+2+(rnd()*(ph-5)|0), 4+(rnd()*5|0), 2+(rnd()*2|0)); }
  }
}
function _fortGrate(g, x, y, w, h, bars){
  g.fillStyle = "#0c0806"; g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(255,90,20,0.35)"; g.fillRect(x+1, y+1, w-2, h-2);
  g.fillStyle = FORT_PAL.iron;
  for(let i=0;i<=w;i+=bars) g.fillRect(x+i, y, 1, h);
  for(let j=0;j<=h;j+=bars) g.fillRect(x, y+j, w, 1);
  g.strokeStyle = FORT_PAL.ironDark; g.lineWidth = 1; g.strokeRect(x+0.5, y+0.5, w-1, h-1);
}
function _fortGearShape(g, cx, cy, R, teeth, col, colLit, colDark, hole){
  g.fillStyle = colDark; g.beginPath();
  for(let i=0;i<teeth*2;i++){ const a = i/(teeth*2)*Math.PI*2, r = i%2 ? R : R*0.82; g.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); }
  g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(cx, cy, R*0.78, 0, Math.PI*2); g.fill();
  g.strokeStyle = colLit; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R*0.72, Math.PI*1.1, Math.PI*1.9); g.stroke();
  g.fillStyle = colDark;
  for(let i=0;i<5;i++){ const a = i/5*Math.PI*2+0.3; g.beginPath(); g.arc(cx + Math.cos(a)*R*0.45, cy + Math.sin(a)*R*0.45, R*0.14, 0, Math.PI*2); g.fill(); }
  g.fillStyle = hole||"#0c0806"; g.beginPath(); g.arc(cx, cy, R*0.16, 0, Math.PI*2); g.fill();
}

// Plataforma completa (piso + detalles + borde + cara del risco + almenas) en un canvas.
// `gaps`: rectángulos de mundo donde el borde queda abierto (puentes, puertas, otras plataformas).
function fortArtPlatform(p, gaps){
  const key = "plat_"+p.id; if(FORT_ART[key]) return FORT_ART[key];
  const W = p.hw*2*FORT_K, Hf = p.hh*2*FORT_K, Hc = FORT_CLIFF*FORT_K;
  const [c, g] = _fortCanvas(W, Hf + Hc);
  const rnd = aidRng(0x5eed + p.id.length*977 + (p.cx|0) + (p.cy|0)*3);
  const th = p.theme;
  // cara del risco (piedra oscura con hiladas y arcos)
  g.fillStyle = FORT_PAL.wall; g.fillRect(0, Hf, W, Hc);
  for(let y=Hf+2; y<Hf+Hc; y+=4){ g.fillStyle = FORT_PAL.brick; g.fillRect(0, y, W, 1); for(let x=((y/4)%2)*5; x<W; x+=10) g.fillRect(x, y-3, 1, 3); }
  for(let x=6; x<W-10; x+=34){ g.fillStyle = "#0e0a08"; g.fillRect(x, Hf+Hc*0.45, 12, Hc*0.55); g.beginPath(); g.arc(x+6, Hf+Hc*0.45, 6, Math.PI, 0); g.fill(); }
  const grad = g.createLinearGradient(0, Hf, 0, Hf+Hc); grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(255,90,20,0.28)");
  g.fillStyle = grad; g.fillRect(0, Hf, W, Hc);
  // piso
  const fg = document.createElement("canvas"); fg.width = W; fg.height = Hf; const f = fg.getContext("2d"); f.imageSmoothingEnabled = false;
  if(th==="patio") _fortCobble(f, W, Hf, rnd, 1.0, false);
  else if(th==="bridge") _fortCobble(f, W, Hf, rnd, 0.92, true);
  else if(th==="hub") _fortCobble(f, W, Hf, rnd, 0.9, true);
  else if(th==="prison") _fortFlags(f, W, Hf, rnd, [[62,56,52],[70,62,56],[56,50,48]], 16);
  else if(th==="forge") _fortPlates(f, W, Hf, rnd, [70,62,58], 14);
  else if(th==="interior") _fortPlates(f, W, Hf, rnd, [78,72,68], 12);
  else if(th==="core" || th==="coreDisc") _fortPlates(f, W, Hf, rnd, [96,78,52], 12);
  else if(th==="chamber") _fortFlags(f, W, Hf, rnd, [[44,38,40],[56,48,50]], 20);
  else _fortCobble(f, W, Hf, rnd, 1, false);
  // detalles de cada tema
  if(th==="patio"){
    for(let i=0;i<14;i++){ const x = rnd()*W, y = rnd()*Hf; f.fillStyle = "rgba(58,46,36,0.5)"; f.beginPath(); f.ellipse(x, y, 6+rnd()*14, 3+rnd()*6, 0, 0, Math.PI*2); f.fill(); }
    _fortGrate(f, W*0.5-8, Hf*0.35, 16, 10, 3);
    // rosa de los vientos grabada al centro (hito de la entrada)
    f.strokeStyle = "rgba(20,14,10,0.7)"; f.lineWidth = 2; f.beginPath(); f.arc(W/2, Hf*0.55, 26, 0, Math.PI*2); f.stroke();
    f.fillStyle = "rgba(20,14,10,0.6)"; for(let i=0;i<4;i++){ const a = i*Math.PI/2; f.beginPath(); f.moveTo(W/2 + Math.cos(a)*30, Hf*0.55 + Math.sin(a)*30); f.lineTo(W/2 + Math.cos(a+1.3)*6, Hf*0.55 + Math.sin(a+1.3)*6); f.lineTo(W/2 + Math.cos(a-1.3)*6, Hf*0.55 + Math.sin(a-1.3)*6); f.fill(); }
  } else if(th==="prison"){
    // canaletas, manchas oscuras y grilletes en el piso
    f.fillStyle = "rgba(10,8,6,0.55)"; f.fillRect(0, Hf*0.5-2, W, 4);
    for(let i=0;i<10;i++){ const x = rnd()*W, y = rnd()*Hf; f.fillStyle = "rgba(70,14,10,0.35)"; f.beginPath(); f.ellipse(x, y, 4+rnd()*8, 2+rnd()*4, rnd()*3, 0, Math.PI*2); f.fill(); }
    for(let i=0;i<6;i++) _fortGrate(f, 10 + rnd()*(W-30), 10 + rnd()*(Hf-24), 12, 8, 3);
  } else if(th==="forge"){
    // canales de lava que cruzan el piso (bajo rejillas)
    for(let i=0;i<3;i++){ const y = Hf*(0.25+0.25*i); f.fillStyle = "#1a0a04"; f.fillRect(0, y-3, W, 6); f.fillStyle = "rgba(255,110,30,0.75)"; f.fillRect(0, y-1, W, 2); }
    for(let i=0;i<18;i++){ const x = rnd()*W, y = rnd()*Hf; f.fillStyle = "rgba(0,0,0,0.3)"; f.beginPath(); f.arc(x, y, 3+rnd()*6, 0, Math.PI*2); f.fill(); }
  } else if(th==="interior"){
    for(let x=10; x<W; x+=48){ f.fillStyle = "rgba(20,16,14,0.8)"; f.fillRect(x, 0, 3, Hf); f.fillStyle = "rgba(160,82,45,0.35)"; f.fillRect(x+1, 0, 1, Hf); }
  } else if(th==="coreDisc" || th==="core"){
    const R = Math.min(W, Hf)*0.46;
    f.strokeStyle = "rgba(40,26,10,0.8)"; f.lineWidth = 3; f.beginPath(); f.arc(W/2, Hf/2, R, 0, Math.PI*2); f.stroke();
    f.strokeStyle = "rgba(224,176,96,0.35)"; f.lineWidth = 1; f.beginPath(); f.arc(W/2, Hf/2, R-3, 0, Math.PI*2); f.stroke();
    if(th==="coreDisc"){ f.globalAlpha = 0.55; _fortGearShape(f, W/2, Hf/2, R*0.72, 16, "#6a4a22", FORT_PAL.brassLit, "#3a2810", "#1a1008"); f.globalAlpha = 1; }
  } else if(th==="chamber"){
    // alfombra roja de la puerta al trono
    f.fillStyle = "#3a0a0a"; f.fillRect(W/2-24, 0, 48, Hf);
    f.fillStyle = FORT_PAL.banner; f.fillRect(W/2-21, 0, 42, Hf);
    f.fillStyle = "#b08040"; f.fillRect(W/2-21, 0, 2, Hf); f.fillRect(W/2+19, 0, 2, Hf);
    for(let y=8; y<Hf; y+=22){ f.fillStyle = "rgba(0,0,0,0.25)"; f.fillRect(W/2-21, y, 42, 2); }
    f.strokeStyle = "rgba(160,30,20,0.45)"; f.lineWidth = 2; f.beginPath(); f.arc(W/2, Hf*0.35, 90, 0, Math.PI*2); f.stroke();
  }
  // viñeta suave del piso (bordes más oscuros)
  const vg = f.createRadialGradient(W/2, Hf/2, Math.min(W,Hf)*0.2, W/2, Hf/2, Math.max(W,Hf)*0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.32)");
  f.fillStyle = vg; f.fillRect(0, 0, W, Hf);
  g.drawImage(fg, 0, 0);
  // borde (canto de piedra) y almenas donde no hay conexión
  const inGap = (wx, wy)=>gaps.some(q=>wx >= q.x0-14 && wx <= q.x1+14 && wy >= q.y0-14 && wy <= q.y1+14);
  const x0 = p.cx - p.hw, y0 = p.cy - p.hh;
  g.fillStyle = FORT_PAL.rim; g.fillRect(0, 0, W, 1); g.fillRect(0, 0, 1, Hf); g.fillRect(W-1, 0, 1, Hf);
  g.fillStyle = FORT_PAL.rimDark; g.fillRect(0, Hf-1, W, 1);
  const merlon = (x, y, w, h)=>{ g.fillStyle = FORT_PAL.wall; g.fillRect(x, y, w, h); g.fillStyle = FORT_PAL.wallLit; g.fillRect(x, y, w, 1); g.fillStyle = "#0e0a08"; g.fillRect(x, y+h-1, w, 1); };
  for(let x=2; x<W-6; x+=12){ const wx = x0 + (x+3)/FORT_K; if(!inGap(wx, y0)) merlon(x, 0, 6, 4); if(!inGap(wx, y0 + p.hh*2)) merlon(x, Hf-3, 6, 3); }
  for(let y=6; y<Hf-6; y+=12){ const wy = y0 + (y+3)/FORT_K; if(!inGap(x0, wy)) merlon(0, y, 3, 6); if(!inGap(x0 + p.hw*2, wy)) merlon(W-3, y, 3, 6); }
  FORT_ART[key] = c;
  return c;
}

/* ---------------- piezas móviles ---------------- */
// Brazo de puente (tablones + barandas de hierro + vigas). Horizontal: de r0 (x=0) a r1 (x=L).
function fortArtArm(L, hw, key){
  key = "arm_"+key; if(FORT_ART[key]) return FORT_ART[key];
  const W = L*FORT_K, H = hw*2*FORT_K;
  const [c, g] = _fortCanvas(W, H + 8);
  const rnd = aidRng(L*7 + hw);
  // vigas por debajo (se asoman: dan volumen)
  g.fillStyle = "#120c08"; g.fillRect(0, 4, W, H + 4);
  // tablones
  for(let x=0; x<W; x+=5){ const f = 0.85 + rnd()*0.3; g.fillStyle = _rgb([90,62,38], f); g.fillRect(x, 3, 4, H-6); g.fillStyle = _rgb([90,62,38], f*0.7); g.fillRect(x+3, 3, 1, H-6); if(rnd() < 0.2){ g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x+1, 3 + rnd()*(H-10), 2, 2); } }
  // barandas de hierro remachadas
  for(const y of [0, H-3]){ g.fillStyle = FORT_PAL.iron; g.fillRect(0, y, W, 3); g.fillStyle = FORT_PAL.ironLit; g.fillRect(0, y, W, 1); g.fillStyle = "#9a8a70"; for(let x=4; x<W; x+=10) g.fillRect(x, y+1, 1, 1); }
  for(let x=10; x<W; x+=40){ g.fillStyle = FORT_PAL.ironDark; g.fillRect(x, 0, 3, H); g.fillStyle = FORT_PAL.ironLit; g.fillRect(x, 0, 1, H); }
  FORT_ART[key] = c;
  return c;
}
function fortArtGear(R, teeth, key, tone){
  key = "gear_"+key; if(FORT_ART[key]) return FORT_ART[key];
  const S = Math.ceil(R*2*FORT_K) + 4;
  const [c, g] = _fortCanvas(S, S);
  if(tone==="iron") _fortGearShape(g, S/2, S/2, R*FORT_K, teeth, "#4a4a50", "#8a8a92", "#1e1e22");
  else _fortGearShape(g, S/2, S/2, R*FORT_K, teeth, FORT_PAL.brass, FORT_PAL.brassLit, FORT_PAL.brassDark);
  FORT_ART[key] = c;
  return c;
}
function fortArtSlide(w, h){
  const key = "slide"; if(FORT_ART[key]) return FORT_ART[key];
  const W = w*FORT_K, H = h*FORT_K;
  const [c, g] = _fortCanvas(W, H + 10);
  g.fillStyle = "#100c0a"; g.fillRect(0, 6, W, H + 4);
  _fortPlates(g, W, H, aidRng(77), [72,66,62], 12);
  g.strokeStyle = FORT_PAL.rustLit; g.lineWidth = 2; g.strokeRect(1, 1, W-2, H-2);
  for(const [x,y] of [[4,4],[W-8,4],[4,H-8],[W-8,H-8]]){ g.fillStyle = FORT_PAL.ironLit; g.fillRect(x, y, 4, 4); }
  FORT_ART[key] = c;
  return c;
}
// Riel del engranaje: canaleta con pernos
function fortArtRail(len){
  const key = "rail_"+(len|0); if(FORT_ART[key]) return FORT_ART[key];
  const W = len*FORT_K, [c, g] = _fortCanvas(W + 20, 16);
  g.fillStyle = "#0c0806"; g.fillRect(4, 5, W+12, 6);
  g.fillStyle = FORT_PAL.iron; g.fillRect(4, 4, W+12, 1); g.fillRect(4, 11, W+12, 1);
  g.fillStyle = "#8a7a60"; for(let x=8; x<W+12; x+=12){ g.fillRect(x, 3, 2, 2); g.fillRect(x, 11, 2, 2); }
  FORT_ART[key] = c;
  return c;
}

/* ---------------- utilería (props altos) ---------------- */
function fortArtProp(kind){
  const key = "prop_"+kind; if(FORT_ART[key]) return FORT_ART[key];
  let c, g;
  if(kind==="pillar"){
    [c, g] = _fortCanvas(22, 64);
    g.fillStyle = "#120e0c"; g.fillRect(3, 6, 16, 56);
    g.fillStyle = FORT_PAL.wallLit; g.fillRect(4, 6, 14, 56);
    g.fillStyle = "#4a3e35"; g.fillRect(5, 6, 5, 56);
    for(let y=10; y<60; y+=8){ g.fillStyle = "#1a1410"; g.fillRect(4, y, 14, 1); }
    g.fillStyle = "#2a211b"; g.fillRect(1, 0, 20, 7); g.fillRect(1, 57, 20, 7);
    g.fillStyle = "#5a4c40"; g.fillRect(1, 0, 20, 1); g.fillRect(1, 57, 20, 1);
  } else if(kind==="brazier"){
    [c, g] = _fortCanvas(18, 30);
    g.fillStyle = FORT_PAL.ironDark; g.fillRect(7, 12, 4, 16); g.fillRect(3, 27, 12, 3);
    g.fillStyle = FORT_PAL.iron; g.fillRect(1, 9, 16, 5); g.fillStyle = FORT_PAL.ironLit; g.fillRect(1, 9, 16, 1);
    g.fillStyle = "#ff6a1a"; g.fillRect(3, 4, 12, 6); g.fillStyle = "#ffd24a"; g.fillRect(6, 1, 6, 7); g.fillStyle = "#fff3b0"; g.fillRect(8, 3, 2, 4);
  } else if(kind==="banner"){
    [c, g] = _fortCanvas(20, 46);
    g.fillStyle = FORT_PAL.ironDark; g.fillRect(0, 0, 20, 3);
    g.fillStyle = FORT_PAL.banner; g.fillRect(2, 3, 16, 36);
    g.beginPath(); g.moveTo(2, 39); g.lineTo(10, 45); g.lineTo(18, 39); g.fill();
    g.fillStyle = FORT_PAL.bannerLit; g.fillRect(3, 3, 3, 36);
    g.fillStyle = "#e0c090"; g.fillRect(9, 12, 2, 18); g.fillRect(6, 16, 8, 2); g.fillRect(7, 12, 1, 3); g.fillRect(12, 12, 1, 3);
    g.fillStyle = "#b08040"; g.fillRect(2, 3, 16, 1);
  } else if(kind==="furnace"){
    [c, g] = _fortCanvas(70, 62);
    g.fillStyle = "#1a1310"; g.fillRect(4, 10, 62, 52);
    for(let y=12; y<60; y+=6){ g.fillStyle = "#0e0a08"; g.fillRect(4, y, 62, 1); for(let x=4+((y/6)%2)*6; x<66; x+=12) g.fillRect(x, y-5, 1, 5); }
    g.fillStyle = "#2a1f1a"; g.fillRect(0, 4, 70, 8); g.fillStyle = "#4a3a30"; g.fillRect(0, 4, 70, 1);
    g.fillStyle = "#0a0604"; g.fillRect(18, 26, 34, 30); g.beginPath(); g.arc(35, 26, 17, Math.PI, 0); g.fill();
    g.fillStyle = "#ff6a1a"; g.fillRect(21, 36, 28, 20); g.fillStyle = "#ffd24a"; g.fillRect(25, 42, 20, 14); g.fillStyle = "#fff3b0"; g.fillRect(30, 48, 10, 8);
    g.fillStyle = FORT_PAL.iron; for(let x=20; x<52; x+=5) g.fillRect(x, 24, 2, 32);
    g.fillStyle = "#2a1f1a"; g.fillRect(28, 0, 14, 6);
  } else if(kind==="furnace_broken"){
    [c, g] = _fortCanvas(70, 62);
    g.drawImage(fortArtProp("furnace"), 0, 0);
    g.fillStyle = "#0a0604"; g.fillRect(12, 18, 46, 42);
    g.fillStyle = "#ff6a1a"; g.fillRect(16, 38, 38, 22); g.fillStyle = "#ffd24a"; g.fillRect(22, 46, 26, 14);
    g.fillStyle = "#3a2e26"; for(const [x,y,w,h] of [[8,54,8,6],[54,52,10,8],[30,58,12,4]]) g.fillRect(x, y, w, h);
  } else if(kind==="anvil"){
    [c, g] = _fortCanvas(28, 20);
    g.fillStyle = FORT_PAL.ironDark; g.fillRect(10, 10, 8, 6); g.fillRect(6, 15, 16, 5);
    g.fillStyle = FORT_PAL.iron; g.fillRect(2, 4, 24, 7); g.beginPath(); g.moveTo(26, 4); g.lineTo(28, 7); g.lineTo(26, 11); g.fill();
    g.fillStyle = FORT_PAL.ironLit; g.fillRect(2, 4, 24, 1);
  } else if(kind==="cage"){
    [c, g] = _fortCanvas(26, 50);
    g.fillStyle = FORT_PAL.ironDark; g.fillRect(12, 0, 2, 12);
    g.fillStyle = "#0e0a08"; g.fillRect(3, 14, 20, 30);
    g.fillStyle = FORT_PAL.iron; for(let x=3; x<=23; x+=4) g.fillRect(x, 14, 1, 32);
    g.fillRect(2, 13, 22, 2); g.fillRect(2, 44, 22, 3);
    g.fillStyle = "#cfc4a4"; g.fillRect(10, 36, 5, 3); g.fillRect(9, 32, 3, 3);
  } else if(kind==="chainpost"){
    [c, g] = _fortCanvas(16, 34);
    g.fillStyle = "#1a1410"; g.fillRect(3, 6, 10, 28); g.fillStyle = "#3a2f27"; g.fillRect(4, 6, 3, 28);
    g.fillStyle = FORT_PAL.iron; g.fillRect(1, 2, 14, 5); g.fillStyle = FORT_PAL.ironLit; g.fillRect(1, 2, 14, 1);
    g.strokeStyle = "#8a8a92"; g.lineWidth = 1; g.beginPath(); g.arc(8, 12, 3, 0, Math.PI*2); g.stroke();
  } else if(kind==="pipes"){
    [c, g] = _fortCanvas(34, 50);
    for(const [x,w,col] of [[2,8,"#5a4a3a"],[12,10,"#6a5040"],[24,8,"#4a3e34"]]){ g.fillStyle = col; g.fillRect(x, 4, w, 46); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x+1, 4, 2, 46); g.fillStyle = FORT_PAL.brassDark; g.fillRect(x-1, 14, w+2, 3); g.fillRect(x-1, 36, w+2, 3); }
    g.fillStyle = FORT_PAL.rustLit; g.beginPath(); g.arc(17, 26, 6, 0, Math.PI*2); g.fill(); g.fillStyle = FORT_PAL.brassLit; g.fillRect(11, 25, 12, 2); g.fillRect(16, 20, 2, 12);
  } else if(kind==="throne"){
    [c, g] = _fortCanvas(80, 96);
    g.fillStyle = "#1a1310"; g.fillRect(4, 70, 72, 26); g.fillStyle = "#3a2f27"; g.fillRect(4, 70, 72, 2);
    g.fillStyle = "#120c0a"; g.fillRect(14, 6, 52, 70);
    g.beginPath(); g.moveTo(14, 8); g.lineTo(40, 0); g.lineTo(66, 8); g.fill();
    g.fillStyle = "#2a1c18"; g.fillRect(18, 12, 44, 58);
    g.fillStyle = FORT_PAL.banner; g.fillRect(24, 16, 32, 44); g.fillStyle = "#5a0e0e"; g.fillRect(24, 56, 32, 4);
    g.fillStyle = FORT_PAL.rust; for(const x of [14, 62]){ g.fillRect(x-4, 4, 8, 70); g.fillStyle = FORT_PAL.rustLit; g.fillRect(x-4, 4, 2, 70); g.fillStyle = FORT_PAL.rust; }
    for(const x of [10, 70]){ g.fillStyle = "#0e0a08"; g.beginPath(); g.moveTo(x-4, 4); g.lineTo(x, -6+6); g.lineTo(x+4, 4); g.fill(); }
    g.fillStyle = "#2a1f1a"; g.fillRect(8, 60, 64, 12); g.fillStyle = "#4a3e35"; g.fillRect(8, 60, 64, 2);
    g.fillStyle = FORT_PAL.iron; for(let x=10; x<72; x+=8) g.fillRect(x, 72, 2, 24);
  } else if(kind==="barrel"){
    [c, g] = _fortCanvas(16, 20);
    g.fillStyle = FORT_PAL.wood; g.fillRect(2, 2, 12, 18); g.fillStyle = FORT_PAL.woodLit; g.fillRect(3, 2, 3, 18);
    g.fillStyle = FORT_PAL.iron; g.fillRect(1, 5, 14, 2); g.fillRect(1, 14, 14, 2);
    g.fillStyle = "#3a2a1a"; g.fillRect(2, 0, 12, 3);
  } else if(kind==="statue"){
    [c, g] = _fortCanvas(30, 70);
    g.fillStyle = "#1a1410"; g.fillRect(3, 56, 24, 14); g.fillStyle = "#3a2f27"; g.fillRect(3, 56, 24, 2);
    g.fillStyle = "#2e2622"; g.fillRect(9, 16, 12, 40); g.fillRect(6, 22, 18, 16); g.fillRect(11, 6, 8, 10);
    g.fillStyle = "#4a3e35"; g.fillRect(9, 16, 3, 40); g.fillRect(11, 6, 2, 10);
    g.fillStyle = "#6a6a72"; g.fillRect(22, 2, 2, 54); g.fillRect(19, 38, 8, 2);
  } else if(kind==="cellbars"){
    [c, g] = _fortCanvas(60, 40);
    g.fillStyle = "#0a0706"; g.fillRect(0, 4, 60, 36);
    g.fillStyle = "#2a211b"; g.fillRect(0, 0, 60, 5); g.fillStyle = "#3a2f27"; g.fillRect(0, 0, 60, 1);
    g.fillStyle = FORT_PAL.iron; for(let x=3; x<60; x+=6) g.fillRect(x, 5, 2, 35);
    g.fillRect(0, 18, 60, 2);
    g.fillStyle = "rgba(255,120,40,0.2)"; g.fillRect(24, 26, 10, 12);
  }
  FORT_ART[key] = c;
  return c;
}

/* ---------------- fondo: el abismo de lava ---------------- */
function fortArtChasm(){
  if(FORT_ART.chasm) return FORT_ART.chasm;
  const S = 256, [c, g] = _fortCanvas(S, S);
  const rnd = aidRng(4242);
  g.fillStyle = "#120806"; g.fillRect(0, 0, S, S);
  // roca oscura a lo lejos
  for(let i=0;i<160;i++){ const x = rnd()*S, y = rnd()*S, r = 4 + rnd()*16; g.fillStyle = `rgba(${30+rnd()*20|0},${16+rnd()*10|0},${12},${0.6})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill(); }
  // ríos de lava allá abajo (grietas que se repiten sin costura)
  for(let k=0;k<7;k++){
    let x = rnd()*S, y = rnd()*S, a = rnd()*Math.PI*2;
    for(let s=0;s<30;s++){
      a += (rnd()-0.5)*0.9; const nx = x + Math.cos(a)*6, ny = y + Math.sin(a)*6;
      for(const [ox,oy] of [[0,0],[S,0],[-S,0],[0,S],[0,-S]]){
        g.strokeStyle = "rgba(255,90,20,0.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x+ox, y+oy); g.lineTo(nx+ox, ny+oy); g.stroke();
        g.strokeStyle = "rgba(255,210,74,0.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x+ox, y+oy); g.lineTo(nx+ox, ny+oy); g.stroke();
      }
      x = nx; y = ny;
    }
  }
  FORT_ART.chasm = c;
  return c;
}
