"use strict";
/* ============================================================
   js/ui/codex/codex-book-art.js
   ILUSTRACIONES DEL LIBRO DE LA HORDA — arte propio, dibujado en vivo sobre canvas (sin imágenes de terceros).
   bookArtDraw(ctx, art, W, H, t): `art` es un nombre ("tapa", "horda", "modos"...) o "arena:<id>", que usa la
   panorámica real de esa arena (assets/ui/codex/arenas/<id>.jpg, la misma del Códice) teñida de tinta y
   pergamino. Todo se anima con `t` (segundos) y se recorta a un marco grabado. Si no hay imagen todavía, se
   dibuja un fondo de la paleta de la arena: el libro nunca queda vacío ni espera una descarga.
   Paleta: tinta #2b1a0e, pergamino #e9d7ad, oro #e0b060, brasa #ff9a4a.
   ============================================================ */
const BOOK_ART_NAMES = ["tapa", "guardianes", "horda", "cicatriz", "hechicero", "mision", "libro", "modos", "progreso",
  "equipo", "maestria", "talentos", "dificultad", "cooperativo", "tienda", "brasas", "postgame", "recap"];
const BOOK_ARENA_TINT = {ciudad:"#ff9a4a", fortaleza:"#d98a4a", bosque:"#7ad08a", micelial:"#b8e070", hielo:"#8fd8ff",
  acuatica:"#5fb0e8", laberinto:"#e0a84a", abismo:"#9a6bff", minas:"#ffb84a", infernal:"#ff4a2a"};
// foco horizontal del recorte (0..1): esquiva las marcas numeradas que traen algunas panorámicas del Códice
const BOOK_ARENA_FOCUS = {minas:0.78};
const _bkImgs = {};
function bookArtImage(id){
  let im = _bkImgs[id];
  if(!im){ im = _bkImgs[id] = new Image(); im.onload = ()=>{ im._ok = true; }; im.onerror = ()=>{ im._bad = true; }; im.src = "assets/ui/codex/arenas/" + id + ".jpg"; }
  return im._ok ? im : null;
}
function _bkRand(seed){ let s = (seed>>>0) || 1; return ()=>((s = (s*1664525 + 1013904223)>>>0)/4294967296); }
function _bkGlow(c, x, y, r, rgb, a){
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.fillRect(x - r, y - r, r*2, r*2); c.globalCompositeOperation = "source-over";
}
function _bkBg(c, W, H, top, bot){ const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function _bkPerson(c, x, y, h, col, o){
  o = o || {}; const hr = h*0.13; c.fillStyle = col;
  c.beginPath(); c.arc(x, y - h + hr, hr, 0, 7); c.fill();
  c.beginPath(); c.moveTo(x - h*0.22, y - h*0.72); c.lineTo(x + h*0.22, y - h*0.72); c.lineTo(x + h*0.16, y - h*0.1); c.lineTo(x + h*0.2, y); c.lineTo(x - h*0.2, y); c.lineTo(x - h*0.16, y - h*0.1); c.closePath(); c.fill();
  if(o.cape){ c.beginPath(); c.moveTo(x - h*0.2, y - h*0.7); c.quadraticCurveTo(x - h*0.55 - (o.sway||0), y - h*0.3, x - h*0.35, y); c.lineTo(x - h*0.1, y); c.closePath(); c.fill(); }
  if(o.shield){ c.fillStyle = o.shield; c.beginPath(); c.ellipse(x + h*0.26, y - h*0.45, h*0.1, h*0.17, 0, 0, 7); c.fill(); c.fillStyle = col; }
  if(o.sword){ c.strokeStyle = o.sword; c.lineWidth = Math.max(1.5, h*0.03); c.beginPath(); c.moveTo(x - h*0.28, y - h*0.4); c.lineTo(x - h*0.45, y - h*0.95); c.stroke(); }
}
function _bkCrystal(c, x, y, r, rgb, t){
  _bkGlow(c, x, y, r*3, rgb, 0.55 + 0.15*Math.sin(t*3));
  c.fillStyle = `rgb(${rgb})`; c.beginPath(); c.moveTo(x, y - r*1.4); c.lineTo(x + r*0.8, y); c.lineTo(x, y + r*1.4); c.lineTo(x - r*0.8, y); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.moveTo(x, y - r*1.4); c.lineTo(x + r*0.8, y); c.lineTo(x, y); c.closePath(); c.fill();
}
function _bkEyes(c, x, y, s, a){ c.fillStyle = `rgba(255,70,40,${a})`; c.shadowColor = "#ff2a10"; c.shadowBlur = s*3; c.fillRect(x - s*1.6, y, s, s*0.6); c.fillRect(x + s*0.6, y, s, s*0.6); c.shadowBlur = 0; }
function _bkText(c, s, x, y, size, col, align){ c.font = size + "px 'VT323', monospace"; c.fillStyle = col; c.textAlign = align || "center"; c.fillText(s, x, y); }
function _bkEmbers(c, W, H, t, rgb, n){
  const r = _bkRand(77);
  for(let i = 0; i < n; i++){ const x0 = r()*W, sp = 8 + r()*22, ph = r()*10, y = (H + 10) - ((t*sp + ph*30) % (H + 20)), x = x0 + Math.sin(t + ph)*8;
    c.fillStyle = `rgba(${rgb},${0.25 + 0.5*r()})`; c.fillRect(x, y, 2, 2); }
}

/* ---------------- escenas ---------------- */
const BOOK_SCENES = {
  tapa(c, W, H, t, u){
    _bkBg(c, W, H, "#3a2314", "#150b06");
    c.strokeStyle = "#e0b060"; c.lineWidth = 2; c.strokeRect(14, 14, W - 28, H - 28); c.lineWidth = 1; c.strokeRect(20, 20, W - 40, H - 40);
    for(const [sx, sy] of [[20, 20], [W - 20, 20], [20, H - 20], [W - 20, H - 20]]){ c.beginPath(); c.arc(sx, sy, 7, 0, 7); c.stroke(); }
    const cx = W/2, cy = H*0.46;
    _bkGlow(c, cx, cy, 90*u, "255,90,40", 0.35 + 0.1*Math.sin(t*2));
    c.strokeStyle = "#e0b060"; c.lineWidth = 2;
    for(let i = 0; i < 3; i++){ c.beginPath(); c.arc(cx, cy, (26 + i*14)*u, 0, 7); c.stroke(); }
    for(let i = 0; i < 24; i++){ const a = i/24*6.283 + t*0.2; c.beginPath(); c.moveTo(cx + Math.cos(a)*54*u, cy + Math.sin(a)*54*u); c.lineTo(cx + Math.cos(a)*(i%2 ? 60 : 64)*u, cy + Math.sin(a)*(i%2 ? 60 : 64)*u); c.stroke(); }
    c.strokeStyle = "#ff6a3a"; c.lineWidth = 3; c.shadowColor = "#ff4a1a"; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(cx - 6*u, cy - 38*u); c.lineTo(cx + 5*u, cy - 14*u); c.lineTo(cx - 4*u, cy + 2*u); c.lineTo(cx + 7*u, cy + 40*u); c.stroke(); c.shadowBlur = 0;
    _bkText(c, "CÓDICE DE LOS GUARDIANES", W/2, H - 30, Math.max(13, 10.5*u), "#e0b060");
    _bkEmbers(c, W, H, t, "255,150,70", 26);
  },
  guardianes(c, W, H, t, u){
    _bkBg(c, W, H, "#16224a", "#070a14");
    const cx = W/2, cy = H*0.56, rx = 62*u, ry = 40*u;
    const cols = ["120,230,150", "140,216,255", "224,168,74", "255,241,192"];
    c.strokeStyle = "rgba(255,230,170,0.55)"; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(cx, cy, rx*0.55, ry*0.55, 0, 0, 7); c.stroke();
    c.setLineDash([4, 6]); c.lineDashOffset = -t*10; c.beginPath(); c.ellipse(cx, cy, rx*0.8, ry*0.8, 0, 0, 7); c.stroke(); c.setLineDash([]);
    _bkGlow(c, cx, cy, rx*0.7, "255,230,170", 0.28 + 0.08*Math.sin(t*2));
    const order = [0, 1, 3, 2]; // dibuja primero a los de atrás
    [0, 2, 1, 3].forEach(i=>{
      const rgb = cols[i], a = -Math.PI/2 + i*Math.PI/2, x = cx + Math.cos(a)*rx, y = cy + Math.sin(a)*ry + 14*u, h = 46*u;
      c.strokeStyle = `rgba(${rgb},${0.35 + 0.15*Math.sin(t*2 + i)})`; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - h*0.5); c.lineTo(cx, cy); c.stroke();
      _bkGlow(c, x, y - h*0.5, h*0.8, rgb, 0.18);
      _bkPerson(c, x, y, h, "#222c48", {cape:true, sway:Math.sin(t*1.5 + i)*3});
      c.strokeStyle = `rgba(${rgb},0.85)`; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y - h*0.87, h*0.13, 0, 7); c.stroke();
      _bkCrystal(c, x, y - h - 8*u + Math.sin(t*2 + i)*3, 5*u, rgb, t + i);
    });
    _bkCrystal(c, cx, cy, 6*u, "255,230,170", t);
  },
  horda(c, W, H, t, u){
    _bkBg(c, W, H, "#2a0c0c", "#070203");
    c.fillStyle = "rgba(240,225,200,0.85)"; c.beginPath(); c.arc(W*0.2, H*0.2, 20*u, 0, 7); c.fill();
    _bkGlow(c, W*0.2, H*0.2, 60*u, "255,200,160", 0.3);
    const gy = H*0.84; c.fillStyle = "#050202"; c.fillRect(0, gy, W, H - gy);
    const r = _bkRand(9);
    for(let i = 0; i < 20; i++){
      const sp = 7 + r()*9, lay = r(), s = (20 + lay*34)*u*0.8, x0 = r()*W*1.4;
      const x = W + s - ((x0 + t*sp*(0.5 + lay)) % (W*1.4 + s*2)), y = gy + (lay - 0.5)*18*u - 2 + Math.abs(Math.sin(t*3 + i))*2;
      c.fillStyle = `rgb(${10 + lay*18},${3 + lay*4},${3 + lay*4})`;
      c.beginPath(); c.ellipse(x, y - s*0.5, s*0.38, s*0.5, 0, 0, 7); c.fill();
      c.beginPath(); c.arc(x, y - s*1.05, s*0.26, 0, 7); c.fill();
      if(i % 3 === 0){ c.beginPath(); c.moveTo(x - s*0.22, y - s*1.2); c.lineTo(x - s*0.38, y - s*1.6); c.lineTo(x - s*0.06, y - s*1.28); c.fill(); c.beginPath(); c.moveTo(x + s*0.22, y - s*1.2); c.lineTo(x + s*0.38, y - s*1.6); c.lineTo(x + s*0.06, y - s*1.28); c.fill(); }
      _bkEyes(c, x, y - s*1.1, Math.max(1.5, s*0.07), 0.7 + 0.3*Math.sin(t*2 + i));
    }
    _bkPerson(c, W*0.14, gy + 6, 34*u, "#05070d", {shield:"#2a4a6a", sword:"#9ac8ff"});
    _bkGlow(c, W*0.14, gy - 16*u, 36*u, "110,170,255", 0.28);
    for(let i = 0; i < 3; i++){ const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "rgba(60,10,10,0)"); g.addColorStop(0.5, "rgba(90,20,20,0.25)"); g.addColorStop(1, "rgba(60,10,10,0)");
      c.fillStyle = g; c.fillRect((((t*8*(i + 1)) % W) - W/2) - W*0.2, gy - 30*u + i*12*u, W*1.2, 14*u); }
  },
  cicatriz(c, W, H, t, u){
    _bkBg(c, W, H, "#d9c28f", "#b79a62");
    const r = _bkRand(5); c.strokeStyle = "rgba(80,50,20,0.18)"; c.lineWidth = 1;
    for(let i = 0; i < 40; i++){ const x = r()*W, y = r()*H; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8 + r()*26, y + (r() - 0.5)*10); c.stroke(); }
    const ys = [0.3, 0.52, 0.28, 0.55, 0.3, 0.58, 0.32, 0.6, 0.36, 0.66], pts = ys.map((y, i)=>[W*(0.1 + 0.8*i/9), H*y]);
    c.strokeStyle = "#2b1a0e"; c.lineWidth = 3; c.shadowColor = "#ff5a2a"; c.shadowBlur = 8; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for(let i = 1; i < 10; i++){ const [px, py] = pts[i - 1], [x, y] = pts[i]; c.lineTo((px + x)/2 + Math.sin(i*5)*8, (py + y)/2 + Math.cos(i*3)*8); c.lineTo(x, y); }
    c.stroke(); c.shadowBlur = 0;
    const lit = Math.floor((t*1.1) % 12);
    pts.forEach(([x, y], i)=>{ const on = i < lit; c.fillStyle = on ? "#c0391a" : "#e8d7ad"; c.strokeStyle = "#2b1a0e"; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, 9*u + (i === lit - 1 ? 2*Math.sin(t*8) : 0), 0, 7); c.fill(); c.stroke();
      _bkText(c, String(i + 1), x, y + 4, 13*u, on ? "#fff1d0" : "#2b1a0e"); });
    _bkText(c, "LA CICATRIZ", W/2, H - 18, 15*u, "#5a3a1a");
  },
  hechicero(c, W, H, t, u){
    _bkBg(c, W, H, "#3a3328", "#0e0c09");
    const cx = W/2, cy = H*0.46;
    _bkGlow(c, cx, cy, 100*u, "255,215,120", 0.4 + 0.08*Math.sin(t*2));
    for(const sgn of [-1, 1]) for(let i = 0; i < 7; i++){
      const f = i/6, ang = -0.5 + f*1.4 + Math.sin(t*1.6 + i*0.3)*0.05, len = (58 - f*14)*u;
      c.strokeStyle = `rgba(255,${230 - f*40},${150 - f*60},${0.85 - f*0.35})`; c.lineWidth = Math.max(1.5, (5 - f*2.5)*u*0.5);
      c.beginPath(); c.moveTo(cx + sgn*10*u, cy - 6*u + f*10*u); c.quadraticCurveTo(cx + sgn*(len*0.7), cy - len*0.9*Math.cos(ang) , cx + sgn*Math.cos(ang)*len, cy + Math.sin(ang)*len*0.7 - 12*u); c.stroke(); }
    c.fillStyle = "#1a1408"; c.beginPath(); c.moveTo(cx, cy - 34*u); c.quadraticCurveTo(cx + 20*u, cy - 26*u, cx + 22*u, cy + 6*u); c.quadraticCurveTo(cx + 12*u, cy + 40*u, cx, cy + 62*u); c.quadraticCurveTo(cx - 12*u, cy + 40*u, cx - 22*u, cy + 6*u); c.quadraticCurveTo(cx - 20*u, cy - 26*u, cx, cy - 34*u); c.fill();
    c.fillStyle = "#050402"; c.beginPath(); c.ellipse(cx, cy - 20*u, 8*u, 10*u, 0, 0, 7); c.fill();
    c.strokeStyle = "rgba(255,215,120,0.9)"; c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx, cy - 44*u + Math.sin(t*2)*1.5, 12*u, 3.2*u, 0, 0, 7); c.stroke();
    const r = _bkRand(21);
    for(let i = 0; i < 12; i++){ const x = cx + (r() - 0.5)*80*u + Math.sin(t*0.8 + i)*8, y = cy + 58*u + r()*18*u, s = (12 + r()*14)*u;
      c.fillStyle = `rgba(120,110,95,${0.25 + 0.15*Math.sin(t + i)})`; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
  },
  mision(c, W, H, t, u){
    _bkBg(c, W, H, "#1d2438", "#08090e");
    const cx = W*0.42, cy = H*0.56, rr = (46 + 4*Math.sin(t*1.5))*u;
    c.fillStyle = "#0b0a08"; c.beginPath(); c.ellipse(cx, cy + 20*u, 54*u, 12*u, 0, 0, 7); c.fill();
    for(let i = 0; i < 14; i++){ const a = i/14*6.283 + t*0.15, x = cx + Math.cos(a)*rr*1.1, y = cy + 8*u + Math.sin(a)*rr*0.45; _bkEyes(c, x, y - 4*u, 2*u*0.7, 0.55 + 0.4*Math.sin(t*3 + i)); }
    _bkGlow(c, cx, cy - 10*u, 40*u, "120,170,255", 0.3);
    _bkPerson(c, cx, cy + 20*u, 46*u, "#0a0d16", {shield:"#3a5a86", sword:"#cfe4ff", cape:true, sway:Math.sin(t*2)*2});
    const kx = W*0.82, ky = H*0.28, kr = 24*u;
    c.strokeStyle = "#e0b060"; c.lineWidth = 2; c.beginPath(); c.arc(kx, ky, kr, 0, 7); c.stroke();
    for(let i = 0; i < 12; i++){ const a = i/12*6.283; c.beginPath(); c.moveTo(kx + Math.cos(a)*kr*0.85, ky + Math.sin(a)*kr*0.85); c.lineTo(kx + Math.cos(a)*kr, ky + Math.sin(a)*kr); c.stroke(); }
    const ph = (t % 6)/6; c.fillStyle = "rgba(224,176,96,0.35)"; c.beginPath(); c.moveTo(kx, ky); c.arc(kx, ky, kr*0.9, -Math.PI/2, -Math.PI/2 + (1 - ph)*6.283); c.closePath(); c.fill();
    c.strokeStyle = "#ffd98a"; c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx + Math.cos(-Math.PI/2 + ph*6.283)*kr*0.85, ky + Math.sin(-Math.PI/2 + ph*6.283)*kr*0.85); c.stroke();
    _bkText(c, "10 NIVELES", kx, ky + kr + 16, 14*u, "#ffd98a"); _bkText(c, "SOBREVIVÍ", W*0.42, H - 14, 15*u, "#cfe4ff");
  },
  libro(c, W, H, t, u){
    _bkBg(c, W, H, "#2a1a10", "#0c0705");
    const cx = W/2, cy = H*0.56, bw = 70*u, bh = 46*u;
    _bkGlow(c, W*0.84, H*0.24, 50*u, "255,170,70", 0.45 + 0.1*Math.sin(t*9));
    c.fillStyle = "#f3e2b8"; c.strokeStyle = "#5a3a1a"; c.lineWidth = 2;
    for(const sgn of [-1, 1]){ c.beginPath(); c.moveTo(cx, cy - bh); c.quadraticCurveTo(cx + sgn*bw*0.5, cy - bh - 8*u, cx + sgn*bw, cy - bh + 6*u); c.lineTo(cx + sgn*bw, cy + bh); c.quadraticCurveTo(cx + sgn*bw*0.5, cy + bh - 6*u, cx, cy + bh + 2*u); c.closePath(); c.fill(); c.stroke(); }
    const written = (t*1.4) % 9;
    for(let i = 0; i < 8; i++){ const k = Math.max(0, Math.min(1, written - i)); const y = cy - bh + 16*u + i*8*u;
      c.strokeStyle = "#4a2e14"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx - bw + 8*u, y); c.lineTo(cx - bw + 8*u + (bw - 16*u)*k*(0.75 + 0.25*Math.sin(i)), y); c.stroke();
      if(i < 5){ c.strokeStyle = "rgba(70,40,18,0.35)"; c.beginPath(); c.moveTo(cx + 8*u, y); c.lineTo(cx + 8*u + (bw - 16*u)*(0.5 + 0.4*Math.sin(i*2)), y); c.stroke(); } }
    const qi = Math.min(7, Math.floor(written)), qy = cy - bh + 16*u + qi*8*u, qx = cx - bw + 8*u + (bw - 16*u)*(written % 1)*0.8;
    c.strokeStyle = "#d9c9a0"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + 22*u, qy - 34*u); c.stroke();
    c.fillStyle = "#cfe0f0"; c.beginPath(); c.moveTo(qx + 22*u, qy - 34*u); c.quadraticCurveTo(qx + 40*u, qy - 50*u, qx + 36*u, qy - 22*u); c.closePath(); c.fill();
    _bkEmbers(c, W, H, t, "255,190,100", 14);
  },
  modos(c, W, H, t, u){
    _bkBg(c, W, H, "#16202c", "#080b10");
    const tiles = [["CAMPAÑA", "#e0b060"], ["CONVERGENCIA", "#6fc3ef"], ["COLISEO", "#ff7a5a"], ["HORDA INFINITA", "#b48aff"]];
    const pw = W*0.4, ph = H*0.36;
    tiles.forEach(([name, col], i)=>{
      const x = W*0.07 + (i % 2)*(pw + W*0.06), y = H*0.1 + Math.floor(i/2)*(ph + H*0.1), on = Math.floor(t*0.8) % 4 === i;
      c.fillStyle = on ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"; c.strokeStyle = col; c.lineWidth = on ? 2.5 : 1.2;
      c.fillRect(x, y, pw, ph); c.strokeRect(x, y, pw, ph);
      const mx = x + pw/2, my = y + ph*0.45; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2;
      if(i === 0){ c.beginPath(); c.moveTo(mx - 14*u, my + 12*u); c.lineTo(mx + 14*u, my - 14*u); c.stroke(); c.beginPath(); c.moveTo(mx - 14*u, my - 14*u); c.lineTo(mx + 14*u, my + 12*u); c.stroke(); }
      else if(i === 1){ for(let k = -1; k <= 1; k++){ c.beginPath(); c.moveTo(mx - 20*u, my + k*9*u); c.lineTo(mx + 20*u, my + k*9*u); c.stroke(); } _bkCrystal(c, mx - 22*u, my, 4*u, "111,195,239", t); _bkCrystal(c, mx + 22*u, my, 4*u, "255,122,90", t); }
      else if(i === 2){ _bkPerson(c, mx - 12*u, my + 14*u, 26*u, col); _bkPerson(c, mx + 12*u, my + 14*u, 26*u, col); c.beginPath(); c.ellipse(mx, my + 14*u, 24*u, 6*u, 0, 0, 7); c.stroke(); }
      else { c.lineWidth = 3; c.beginPath(); for(let a = 0; a <= 6.3; a += 0.15){ const px = mx + Math.sin(a)*22*u, py = my + Math.sin(a*2)*10*u; a ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
      _bkText(c, name, mx, y + ph - 7, Math.max(12, 12.5*u), col);
    });
  },
  progreso(c, W, H, t, u){
    _bkBg(c, W, H, "#1c2a1c", "#080d08");
    const base = H*0.78;
    for(let i = 0; i < 5; i++){ c.fillStyle = `rgb(${50 + i*10},${70 + i*12},${46 + i*8})`; c.fillRect(W*0.1 + i*W*0.14, base - i*H*0.1, W*0.14, i*H*0.1 + H*0.08); c.strokeStyle = "#0a120a"; c.strokeRect(W*0.1 + i*W*0.14, base - i*H*0.1, W*0.14, i*H*0.1 + H*0.08); }
    const k = (t*0.35) % 1, step = Math.min(4, Math.floor(k*5)), hx = W*0.17 + step*W*0.14 + (k*5 % 1)*W*0.14*0.9, hy = base - Math.min(4, k*5)*H*0.1;
    _bkPerson(c, hx, hy, 30*u, "#06100a", {shield:"#5a8a5a"});
    _bkGlow(c, hx, hy - 20*u, 28*u, "150,255,150", 0.25);
    c.strokeStyle = "#e0b060"; c.lineWidth = 2; c.strokeRect(W*0.1, H*0.08, W*0.5, 12*u);
    c.fillStyle = "#e0b060"; c.fillRect(W*0.1 + 2, H*0.08 + 2, (W*0.5 - 4)*((t*0.3) % 1), 12*u - 4); _bkText(c, "XP", W*0.1 + W*0.5 + 20, H*0.08 + 11*u, 15*u, "#e0b060");
    for(let i = 0; i < 6; i++){ const ph = ((t*0.6 + i*0.17) % 1), x = W*0.74 + (i % 3)*10*u, y = H*0.2 + ph*H*0.3; c.fillStyle = "#ffcf5c"; c.beginPath(); c.arc(x, y, 5*u, 0, 7); c.fill(); c.strokeStyle = "#8a5a10"; c.stroke(); }
    c.fillStyle = "#6a4a22"; c.fillRect(W*0.7, H*0.52, 50*u, 22*u); c.fillStyle = "#8a6232"; c.fillRect(W*0.7, H*0.52, 50*u, 7*u);
    _bkText(c, "ORO", W*0.7 + 25*u, H*0.52 + 40*u, 14*u, "#ffcf5c");
    c.fillStyle = "#7ad0f0"; c.beginPath(); c.moveTo(W*0.86, H*0.7); c.lineTo(W*0.9, H*0.76); c.lineTo(W*0.86, H*0.84); c.lineTo(W*0.82, H*0.76); c.closePath(); c.fill(); _bkText(c, "GEMAS", W*0.86, H*0.93, 13*u, "#7ad0f0");
  },
  equipo(c, W, H, t, u){
    _bkBg(c, W, H, "#241a2e", "#0a070d");
    const items = [["#9aa0a8", "154,160,168"], ["#5a9aff", "90,154,255"], ["#e0b060", "224,176,96"]], r = [W*0.22, W*0.5, W*0.78];
    items.forEach(([col, rgb], i)=>{
      const x = r[i], y = H*0.48 + Math.sin(t*1.6 + i)*3; _bkGlow(c, x, y, 48*u, rgb, 0.3 + 0.1*Math.sin(t*2 + i));
      c.fillStyle = col; c.strokeStyle = "#0a070d"; c.lineWidth = 2;
      if(i === 0){ c.beginPath(); c.moveTo(x, y - 40*u); c.lineTo(x + 6*u, y + 14*u); c.lineTo(x - 6*u, y + 14*u); c.closePath(); c.fill(); c.stroke(); c.fillRect(x - 14*u, y + 14*u, 28*u, 5*u); c.fillRect(x - 3*u, y + 19*u, 6*u, 16*u); }
      else if(i === 1){ c.beginPath(); c.moveTo(x - 22*u, y - 28*u); c.lineTo(x + 22*u, y - 28*u); c.lineTo(x + 20*u, y + 8*u); c.quadraticCurveTo(x, y + 40*u, x - 20*u, y + 8*u); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.moveTo(x, y - 24*u); c.lineTo(x, y + 24*u); c.stroke(); }
      else { c.beginPath(); c.arc(x, y - 4*u, 22*u, Math.PI, 0); c.lineTo(x + 22*u, y + 18*u); c.lineTo(x - 22*u, y + 18*u); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#0a070d"; c.fillRect(x - 12*u, y - 2*u, 24*u, 5*u); }
    });
    c.setLineDash([3, 5]); c.lineDashOffset = -t*12; c.strokeStyle = "rgba(255,230,170,0.7)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r[0], H*0.72); c.lineTo(r[1], H*0.78); c.lineTo(r[2], H*0.72); c.stroke(); c.setLineDash([]);
    _bkText(c, "SET", r[1], H*0.9, 14*u, "#ffd98a"); _bkText(c, "COMÚN", r[0], H*0.16, 12*u, "#9aa0a8"); _bkText(c, "RARO", r[1], H*0.16, 12*u, "#5a9aff"); _bkText(c, "LEGENDARIO", r[2], H*0.16, 12*u, "#e0b060");
  },
  maestria(c, W, H, t, u){
    _bkBg(c, W, H, "#10222a", "#05090c");
    const cx = W/2, cy = H*0.5, R = 44*u, lvl = 1 + Math.floor((t*1.2) % 10);
    _bkGlow(c, cx, cy, R*1.9, "120,220,255", 0.25 + lvl*0.03);
    for(let i = 0; i < 10; i++){ const a = -Math.PI/2 + i/10*6.283, on = i < lvl; c.strokeStyle = on ? "#7ad8ff" : "rgba(122,216,255,0.2)"; c.lineWidth = on ? 5*u*0.7 : 2;
      c.beginPath(); c.arc(cx, cy, R, a + 0.06, a + 6.283/10 - 0.06); c.stroke(); }
    c.fillStyle = "#0a161c"; c.beginPath(); c.arc(cx, cy, R*0.7, 0, 7); c.fill();
    c.strokeStyle = "#cfefff"; c.lineWidth = 2.5; c.beginPath(); for(let k = 0; k < 5; k++){ const a = -Math.PI/2 + k*6.283*2/5, x = cx + Math.cos(a)*R*0.5, y = cy + Math.sin(a)*R*0.5; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.stroke();
    _bkText(c, String(lvl), cx, cy + 6*u, 18*u, "#cfefff");
    _bkText(c, "USO: sube solo", W*0.2, H*0.9, 13*u, "#9ab8c4"); _bkText(c, "PUNTOS: hasta 10", W*0.76, H*0.9, 13*u, "#7ad8ff");
  },
  talentos(c, W, H, t, u){
    _bkBg(c, W, H, "#1a1626", "#07050c");
    const nodes = [[0.5, 0.9, -1], [0.3, 0.74, 0], [0.7, 0.74, 0], [0.18, 0.56, 1], [0.42, 0.56, 1], [0.58, 0.56, 2], [0.82, 0.56, 2], [0.3, 0.38, 3], [0.7, 0.38, 5], [0.5, 0.26, 4], [0.5, 0.1, 7]];
    const link = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7], [4, 7], [5, 8], [6, 8], [7, 9], [8, 9], [9, 10]];
    const lit = Math.floor((t*1.3) % 13);
    link.forEach(([a, b], i)=>{ c.strokeStyle = i < lit ? "#ffd98a" : "rgba(255,255,255,0.18)"; c.lineWidth = i < lit ? 2.5 : 1.2; c.beginPath(); c.moveTo(nodes[a][0]*W, nodes[a][1]*H); c.lineTo(nodes[b][0]*W, nodes[b][1]*H); c.stroke(); });
    nodes.forEach(([x, y], i)=>{ const on = i <= Math.min(10, Math.floor(lit*0.8)); if(on) _bkGlow(c, x*W, y*H, 22*u, "255,217,138", 0.5);
      c.fillStyle = on ? "#ffd98a" : "#2a2438"; c.strokeStyle = on ? "#fff1c0" : "#6a5a88"; c.lineWidth = 2; c.beginPath(); c.arc(x*W, y*H, (i === 10 ? 11 : 7.5)*u, 0, 7); c.fill(); c.stroke(); });
    _bkText(c, "NIVEL 40", W*0.18, H*0.92, 13*u, "#ffd98a");
  },
  dificultad(c, W, H, t, u){
    _bkBg(c, W, H, "#241012", "#080304");
    const defs = [["NORMAL", "#d8cfb8", "216,207,184", 0.4], ["PESADILLA", "#b48aff", "180,138,255", 0.65], ["INFIERNO", "#ff4a2a", "255,74,42", 0.92]];
    defs.forEach(([name, col, rgb, hh], i)=>{
      const x = W*(0.2 + i*0.3), base = H*0.82, h = H*hh*0.62; _bkGlow(c, x, base - h*0.5, h*0.8, rgb, 0.22);
      c.fillStyle = col; c.beginPath(); c.moveTo(x - 16*u, base);
      c.bezierCurveTo(x - 24*u, base - h*0.4, x - 6*u + Math.sin(t*5 + i)*6, base - h*0.7, x + Math.sin(t*6 + i)*4, base - h);
      c.bezierCurveTo(x + 6*u + Math.sin(t*4 + i)*5, base - h*0.7, x + 24*u, base - h*0.4, x + 16*u, base); c.closePath(); c.fill();
      c.fillStyle = "rgba(0,0,0,0.35)"; c.beginPath(); c.ellipse(x, base - h*0.2, 7*u, h*0.2, 0, 0, 7); c.fill();
      c.fillStyle = "#0a0405"; c.fillRect(x - 24*u, base, 48*u, 5); _bkText(c, name, x, base + 22, 13*u, col);
    });
  },
  cooperativo(c, W, H, t, u){
    _bkBg(c, W, H, "#1a2230", "#070a10");
    const gy = H*0.72, cols = ["#6fc3ef", "#ffcf5c", "#ff7a5a", "#9ab08a"], xs = [0.15, 0.38, 0.62, 0.85];
    c.fillStyle = "#05070c"; c.fillRect(0, gy, W, H - gy);
    xs.forEach((fx, i)=>{
      const x = W*fx;
      if(i === 2){ c.save(); c.translate(x, gy - 4); c.rotate(-1.35); _bkPerson(c, 0, 0, 40*u, "#06080e"); c.restore(); c.strokeStyle = cols[i]; c.lineWidth = 2; c.setLineDash([3, 4]); c.beginPath(); c.ellipse(x, gy + 4, 22*u, 5*u, 0, 0, 7); c.stroke(); c.setLineDash([]); return; }
      _bkPerson(c, x, gy, 40*u, "#06080e", {shield:i === 0 ? cols[i] : null, sword:i === 1 ? cols[i] : null});
      c.strokeStyle = cols[i]; c.lineWidth = 1.5; c.beginPath(); c.arc(x, gy - 40*u*0.87, 40*u*0.13, 0, 7); c.stroke();
    });
    const px = W*0.38 + 14*u, hx = W*0.62 - 22*u, k = 0.5 + 0.5*Math.sin(t*2.4);
    c.strokeStyle = `rgba(120,255,160,${0.35 + 0.4*k})`; c.lineWidth = 3; c.beginPath(); c.moveTo(px, gy - 22*u); c.quadraticCurveTo((px + hx)/2, gy - 40*u, hx, gy - 10*u); c.stroke();
    _bkGlow(c, W*0.62, gy - 14*u, 32*u, "120,255,160", 0.2 + 0.3*k);
    _bkText(c, "✚", W*0.62, gy - 44*u - k*6, 22*u, "#8dffb0");
    _bkText(c, "BOT", W*0.85, gy - 52*u, 12*u, "#9ab08a"); _bkText(c, "mantené ✚ para levantarlo", W/2, H*0.12, 14*u, "#8dffb0");
  },
  tienda(c, W, H, t, u){
    _bkBg(c, W, H, "#2a1c10", "#0b0704");
    const x0 = W*0.14, w = W*0.72;
    for(let i = 0; i < 8; i++){ c.fillStyle = i % 2 ? "#a8321e" : "#e8d7ad"; c.beginPath(); c.moveTo(x0 + i*w/8, H*0.16); c.lineTo(x0 + (i + 1)*w/8, H*0.16); c.lineTo(x0 + (i + 1)*w/8 + 3, H*0.3 + Math.sin(t*2 + i)*1.5); c.lineTo(x0 + i*w/8 - 3, H*0.3 + Math.sin(t*2 + i)*1.5); c.closePath(); c.fill(); }
    c.fillStyle = "#4a2e16"; c.fillRect(x0 + 6, H*0.3, 5, H*0.5); c.fillRect(x0 + w - 11, H*0.3, 5, H*0.5); c.fillRect(x0, H*0.62, w, 10);
    const stuff = [["#5a9aff", 0.3], ["#e0b060", 0.5], ["#b48aff", 0.7]];
    stuff.forEach(([col, fx], i)=>{ const x = x0 + w*fx, y = H*0.55 + Math.sin(t*2 + i)*2; _bkGlow(c, x, y, 22*u, col === "#5a9aff" ? "90,154,255" : col === "#e0b060" ? "224,176,96" : "180,138,255", 0.35);
      c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 14*u); c.lineTo(x + 9*u, y); c.lineTo(x, y + 8*u); c.lineTo(x - 9*u, y); c.closePath(); c.fill(); });
    for(let i = 0; i < 5; i++){ c.fillStyle = "#ffcf5c"; c.strokeStyle = "#8a5a10"; c.beginPath(); c.ellipse(x0 + w*0.5, H*0.86 - i*4*u, 12*u, 4*u, 0, 0, 7); c.fill(); c.stroke(); }
    _bkText(c, "TIENDA", W/2, H*0.09 + 6, 16*u, "#ffd98a");
    _bkText(c, "ORO", x0 + w*0.5 + 30*u, H*0.88, 13*u, "#ffcf5c");
  },
  brasas(c, W, H, t, u){
    _bkBg(c, W, H, "#1c0e0e", "#070303");
    const mid = W/2; c.strokeStyle = "rgba(255,217,138,0.6)"; c.lineWidth = 2; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(mid, H*0.08); c.lineTo(mid, H*0.92); c.stroke(); c.setLineDash([]);
    const lx = W*0.25, rx = W*0.75, cy = H*0.46;
    c.fillStyle = "#cfd6de"; c.beginPath(); c.moveTo(lx, cy - 40*u); c.lineTo(lx + 5*u, cy + 6*u); c.lineTo(lx - 5*u, cy + 6*u); c.closePath(); c.fill(); c.fillRect(lx - 12*u, cy + 6*u, 24*u, 4*u); c.fillRect(lx - 2.5*u, cy + 10*u, 5*u, 14*u);
    c.fillStyle = "#ffcf5c"; c.beginPath(); c.arc(lx + 22*u, cy + 22*u, 8*u, 0, 7); c.fill(); _bkText(c, "ORO", lx, H*0.82, 15*u, "#ffcf5c"); _bkText(c, "se gana jugando", lx, H*0.92, 11*u, "#b39a84");
    const f = 0.8 + 0.2*Math.sin(t*5); _bkGlow(c, rx - 22*u, cy - 6*u, 38*u, "255,140,60", 0.5*f);
    c.fillStyle = "#ff9a4a"; c.beginPath(); c.moveTo(rx - 22*u, cy - 30*u*f); c.lineTo(rx - 14*u, cy - 6*u); c.lineTo(rx - 22*u, cy + 16*u); c.lineTo(rx - 30*u, cy - 6*u); c.closePath(); c.fill();
    _bkText(c, "✦", rx - 22*u, cy - 38*u, 18*u, "#ffd98a");
    c.strokeStyle = "#b48aff"; c.fillStyle = "rgba(180,138,255,0.25)"; c.lineWidth = 2; c.beginPath(); c.moveTo(rx + 10*u, cy - 26*u); c.lineTo(rx + 34*u, cy - 26*u); c.lineTo(rx + 40*u + Math.sin(t*2)*2, cy + 22*u); c.lineTo(rx + 4*u, cy + 22*u); c.closePath(); c.fill(); c.stroke();
    _bkText(c, "BRASAS ✦", rx, H*0.82, 15*u, "#ff9a4a"); _bkText(c, "solo apariencia", rx, H*0.92, 11*u, "#b39a84");
  },
  postgame(c, W, H, t, u){
    _bkBg(c, W, H, "#2a2210", "#0a0803");
    const cx = W*0.3;
    for(let i = 0; i < 9; i++){ const a = -Math.PI/2 + (i - 4)*0.2; c.strokeStyle = `rgba(255,225,140,${0.18 + 0.1*Math.sin(t*2 + i)})`; c.lineWidth = 6*u*0.5; c.beginPath(); c.moveTo(cx, H*0.5); c.lineTo(cx + Math.cos(a)*H, H*0.5 + Math.sin(a)*H); c.stroke(); }
    c.fillStyle = "#e0c070"; c.strokeStyle = "#5a4010"; c.lineWidth = 2;
    for(const dx of [-26, 26]){ c.fillRect(cx + dx*u - 6*u, H*0.3, 12*u, H*0.5); c.strokeRect(cx + dx*u - 6*u, H*0.3, 12*u, H*0.5); }
    c.beginPath(); c.moveTo(cx - 36*u, H*0.3); c.quadraticCurveTo(cx, H*0.12, cx + 36*u, H*0.3); c.lineTo(cx + 36*u, H*0.34); c.lineTo(cx - 36*u, H*0.34); c.closePath(); c.fill(); c.stroke();
    _bkGlow(c, cx, H*0.56, 30*u, "255,240,190", 0.5);
    _bkText(c, "DIVINA", cx, H*0.9, 14*u, "#ffe9a0");
    const ix = W*0.72, iy = H*0.46; c.strokeStyle = "#b48aff"; c.lineWidth = 4; c.shadowColor = "#b48aff"; c.shadowBlur = 8; c.beginPath();
    for(let a = 0; a <= 6.3; a += 0.12){ const px = ix + Math.sin(a)*30*u, py = iy + Math.sin(a*2)*14*u; a ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.shadowBlur = 0;
    for(let i = 0; i < 4; i++) _bkEyes(c, ix - 30*u + i*20*u, iy + 30*u + Math.sin(t*3 + i)*3, 2, 0.8);
    _bkText(c, "INFINITA", ix, H*0.9, 14*u, "#d8c4ff");
  },
  recap(c, W, H, t, u){
    _bkBg(c, W, H, "#1c1830", "#06050c");
    const seals = [[0.5, 0.28, "HISTORIA", "255,217,138"], [0.24, 0.7, "MODOS", "111,195,239"], [0.76, 0.7, "PROGRESIÓN", "120,230,150"]];
    c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(seals[0][0]*W, seals[0][1]*H); c.lineTo(seals[1][0]*W, seals[1][1]*H); c.lineTo(seals[2][0]*W, seals[2][1]*H); c.closePath(); c.stroke();
    const on = Math.floor(t*0.9) % 4;
    seals.forEach(([fx, fy, name, rgb], i)=>{ const x = fx*W, y = fy*H, lit = on > i || on === 0 && false || on === 3; _bkGlow(c, x, y, 42*u, rgb, lit ? 0.5 : 0.15);
      c.strokeStyle = `rgb(${rgb})`; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, 20*u, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y, 14*u, 0, 7); c.stroke();
      _bkText(c, lit ? "✔" : "·", x, y + 7*u, 20*u, `rgb(${rgb})`); _bkText(c, name, x, y + 36*u, 13*u, `rgb(${rgb})`); });
    _bkCrystal(c, W/2, H*0.55, 6*u, "255,241,192", t);
  }
};

/* ---------------- panorámicas de arena teñidas de tinta ---------------- */
function _bkArena(c, W, H, t, u, id){
  const im = bookArtImage(id), tint = BOOK_ARENA_TINT[id] || "#e0b060";
  if(im){
    const s = Math.max(W/im.width, H/im.height)*1.3, dw = im.width*s, dh = im.height*s, pan = Math.sin(t*0.2)*(dw - W)*0.12, fx = BOOK_ARENA_FOCUS[id] || 0.5;
    c.save(); c.filter = "sepia(0.75) contrast(1.08) brightness(0.92) saturate(1.2)"; c.drawImage(im, -(dw - W)*fx + pan, (H - dh)/2, dw, dh); c.restore();
  } else { _bkBg(c, W, H, "#2a1c10", "#0a0704"); }
  c.globalCompositeOperation = "multiply"; c.fillStyle = "rgba(214,189,134,0.35)"; c.fillRect(0, 0, W, H); c.globalCompositeOperation = "source-over";
  const g = c.createRadialGradient(W/2, H/2, Math.min(W, H)*0.3, W/2, H/2, Math.max(W, H)*0.75); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(12,6,2,0.72)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  _bkGlow(c, W*0.5, H*0.9, W*0.5, tint.replace("#", "").match(/../g).map(h=>parseInt(h, 16)).join(","), 0.18);
  _bkEmbers(c, W, H, t, "255,200,120", 16);
}

// Dibuja una ilustración completa (fondo + escena + marco grabado) dentro de un canvas de W×H píxeles CSS.
function bookArtDraw(c, art, W, H, t){
  c.save(); c.clearRect(0, 0, W, H);
  const m = 8, u = Math.max(0.6, Math.min(W - 2*m, H - 2*m)/200);
  c.beginPath(); c.rect(m, m, W - 2*m, H - 2*m); c.clip(); c.translate(m, m);
  const iw = W - 2*m, ih = H - 2*m;
  try{
    if(art && art.indexOf("arena:") === 0) _bkArena(c, iw, ih, t, u, art.slice(6));
    else (BOOK_SCENES[art] || BOOK_SCENES.libro)(c, iw, ih, t, u);
  }catch(e){ c.fillStyle = "#1a0f08"; c.fillRect(0, 0, iw, ih); }
  c.restore();
  // marco grabado de tinta, con esquinas
  c.save(); c.strokeStyle = "#2b1a0e"; c.lineWidth = 3; c.strokeRect(m, m, W - 2*m, H - 2*m);
  c.strokeStyle = "rgba(224,176,96,0.8)"; c.lineWidth = 1; c.strokeRect(m + 3, m + 3, W - 2*m - 6, H - 2*m - 6);
  c.fillStyle = "#2b1a0e"; for(const [x, y] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]){ c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
  c.restore();
}
