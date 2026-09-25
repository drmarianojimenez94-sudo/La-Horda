"use strict";
/* ============================================================
   js/rendering/arena.js
   Dibujo del escenario: piso, lava, foso, muro perimetral, acentos y decorado.
   ============================================================ */

/* ============================================================
   ARENA INFERNAL — ESCENARIO PIXEL ART
   ============================================================ */
let floorPattern = null;
let lavaPools = [], floorDecor = [], braziers = [], wallBlocks = [], deadTrees = [], smokePuffs = [];

const FLOOR_THEME = {
  bosque:   { bg:"#0c1208", stoneR:46, stoneG:56,  stoneB:34,  joint:"rgba(6,10,4,0.85)",  dirt:"rgba(10,16,6,",   fleckA:"rgba(120,170,70,0.26)", fleckB:"rgba(180,220,120,0.16)" },
  hielo:    { bg:"#0d2038", stoneR:118,stoneG:158, stoneB:196, joint:"rgba(4,14,28,0.82)", dirt:"rgba(225,240,255,",fleckA:"rgba(170,220,255,0.32)", fleckB:"rgba(235,250,255,0.22)" },
  laberinto:{ bg:"#181022", stoneR:96, stoneG:78,  stoneB:64,  joint:"rgba(8,4,10,0.85)",  dirt:"rgba(120,70,150,",fleckA:"rgba(150,90,190,0.22)", fleckB:"rgba(90,60,140,0.16)" },
  infernal: { bg:"#0e0a09", stoneR:58, stoneG:39,  stoneB:31,  joint:"rgba(0,0,0,0.85)",   dirt:"rgba(0,0,0,",     fleckA:"rgba(200,75,20,0.22)",  fleckB:"rgba(255,160,65,0.14)" },
  divina:   { bg:"#150a24", stoneR:108,stoneG:84,  stoneB:140, joint:"rgba(10,4,20,0.85)", dirt:"rgba(200,140,255,",fleckA:"rgba(210,140,255,0.28)", fleckB:"rgba(140,230,200,0.20)" },
  // Arena sedimentada de ruinas hundidas: piedra grisácea con un tinte verde-azulado profundo
  // -distinta de la piedra fría/blanca del Hielo-, con vetas de coral/musgo bioluminiscente.
  acuatica: { bg:"#081a20", stoneR:52, stoneG:78,  stoneB:82,  joint:"rgba(2,10,12,0.85)", dirt:"rgba(20,70,60,",  fleckA:"rgba(70,200,180,0.26)", fleckB:"rgba(160,90,120,0.16)" }
};
let floorPatterns = {};
function buildFloorTile(){
  const theme = FLOOR_THEME[currentArena] || FLOOR_THEME.infernal;
  const S = 160;
  const t = document.createElement("canvas"); t.width = S; t.height = S;
  const g = t.getContext("2d");
  g.fillStyle = theme.bg; g.fillRect(0,0,S,S);

  // Placas de piedra irregulares (estilo roca resquebrajada, sin patrón de ladrillo)
  const seeds = [];
  for(let i=0;i<26;i++) seeds.push({x:Math.random()*S, y:Math.random()*S, tone:0.75+Math.random()*0.5});
  const step = 4;
  for(let y=0;y<S;y+=step){
    for(let x=0;x<S;x+=step){
      let best=null, bd=1e9, bd2=1e9;
      for(const s of seeds){
        // distancia envolvente para que el mosaico se repita sin costuras
        let dx = Math.abs(s.x-x); if(dx>S/2) dx = S-dx;
        let dy = Math.abs(s.y-y); if(dy>S/2) dy = S-dy;
        const d = dx*dx+dy*dy;
        if(d<bd){ bd2=bd; bd=d; best=s; } else if(d<bd2){ bd2=d; }
      }
      const edge = Math.sqrt(bd2)-Math.sqrt(bd);
      if(edge < 3){
        g.fillStyle = theme.joint;           // junta / grieta
      } else {
        const v = best.tone * (0.9 + Math.random()*0.2);
        const r = Math.round(theme.stoneR*v), gg = Math.round(theme.stoneG*v), b = Math.round(theme.stoneB*v);
        g.fillStyle = `rgb(${r},${gg},${b})`;
      }
      g.fillRect(x, y, step, step);
    }
  }

  // desgaste y suciedad (o escarcha, según la arena)
  for(let i=0;i<420;i++){
    g.fillStyle = `${theme.dirt}${0.08+Math.random()*0.22})`;
    g.fillRect((Math.random()*S)|0, (Math.random()*S)|0, 4, 4);
  }
  // Hielo: parches de escarcha más grandes y sólidos encima de la piedra, para que se note
  // de entrada que está todo congelado y no quede a medio camino entre piedra y hielo.
  if(currentArena==="hielo"){
    for(let i=0;i<14;i++){
      const cx=Math.random()*S, cy=Math.random()*S, r=10+Math.random()*16;
      g.fillStyle = `rgba(210,235,255,${0.10+Math.random()*0.12})`;
      g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.fill();
    }
    g.fillStyle = "rgba(180,220,255,0.06)";
    g.fillRect(0,0,S,S);
  }
  // Arena Acuática: parches de luz caústica (reflejo del agua) sobre la arena del fondo,
  // más un tinte azul profundo general para que se lea "bajo el agua" de entrada.
  if(currentArena==="acuatica"){
    for(let i=0;i<16;i++){
      const cx=Math.random()*S, cy=Math.random()*S, r=8+Math.random()*14;
      g.fillStyle = `rgba(140,230,220,${0.06+Math.random()*0.10})`;
      g.beginPath(); g.ellipse(cx,cy,r,r*0.5,Math.random()*Math.PI,0,Math.PI*2); g.fill();
    }
    g.fillStyle = "rgba(10,40,55,0.14)";
    g.fillRect(0,0,S,S);
  }
  // detalle atrapado entre las piedras: brasas (Infernal), cristales de escarcha (Hielo) o musgo luminoso (Bosque)
  for(let i=0;i<70;i++){
    const x=(Math.random()*S)|0, y=(Math.random()*S)|0;
    g.fillStyle = theme.fleckA; g.fillRect(x, y, 5, 3);
    g.fillStyle = theme.fleckB; g.fillRect(x+1, y+1, 3, 1);
  }
  floorPatterns[currentArena] = ctx.createPattern(t, "repeat");
  floorPattern = floorPatterns[currentArena];
}
function aidDrawWall(w, now){
  const b = aidWallAABB(w);
  const H = AID_WALL_H, W = b.x1-b.x0, D = b.y1-b.y0;
  ctx.save();
  // sombra proyectada hacia el sur
  ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fillRect(b.x0+6, b.y1-4, W, 14);
  // cara frontal (lado sur, lo que se ve de frente en la vista 3/4)
  ctx.fillStyle = "#6a5234"; ctx.fillRect(b.x0, b.y1-H, W, H);
  ctx.fillStyle = "#57422a";
  for(let y=b.y1-H+10; y<b.y1; y+=12) ctx.fillRect(b.x0, y, W, 2);                 // hiladas de sillares
  for(let row=0; row<4; row++){ const off = row%2 ? 14 : 0; for(let x=b.x0+off; x<b.x1; x+=28) ctx.fillRect(x, b.y1-H+row*12, 2, 10); }
  // friso de meandro (greca) en la parte alta del frente
  ctx.fillStyle = "#b8904e"; ctx.fillRect(b.x0, b.y1-H, W, 5);
  ctx.fillStyle = "#3a2a18";
  for(let x=b.x0+2; x<b.x1-8; x+=12){ ctx.fillRect(x, b.y1-H+1, 8, 1); ctx.fillRect(x+7, b.y1-H+1, 1, 3); ctx.fillRect(x+3, b.y1-H+3, 5, 1); }
  // cara superior (toda la planta, desplazada hacia arriba el alto del muro)
  ctx.fillStyle = "#a88758"; ctx.fillRect(b.x0, b.y0-H, W, D);
  ctx.fillStyle = "#c4a06a"; ctx.fillRect(b.x0, b.y0-H, W, 3);
  ctx.fillStyle = "rgba(60,40,20,0.35)";
  for(let x=b.x0+20; x<b.x1-4; x+=40) ctx.fillRect(x, b.y0-H+4, 2, D-6);
  if(w.axis==="v") for(let y=b.y0-H+30; y<b.y1-H-4; y+=40) ctx.fillRect(b.x0+3, y, W-6, 2);
  // pilastras en las puntas
  for(const px of [b.x0, b.x1-12]){ ctx.fillStyle = "#7e6240"; ctx.fillRect(px, b.y1-H-6, 12, H+6); ctx.fillStyle = "#c8a46c"; ctx.fillRect(px, b.y1-H-8, 12, 4); }
  // antorcha
  if(w.torch){
    const f = 0.65+0.35*Math.sin(now*9+w.x*0.1);
    const tx = w.torch.x, ty = b.y1-H+14;
    ctx.fillStyle = "#3a2410"; ctx.fillRect(tx-2, ty, 4, 12);
    ctx.fillStyle = `rgba(255,${130+80*f|0},40,0.95)`; ctx.fillRect(tx-4, ty-8*f-4, 8, 8*f+4);
    ctx.fillStyle = "rgba(255,240,170,0.9)"; ctx.fillRect(tx-2, ty-5*f-2, 4, 5*f);
  }
  ctx.restore();
}

// ---------------- Dibujo ----------------
function aidDrawDecals(){
  for(const d of aidDecals){
    if(!inView(d.x, d.y, Math.max(d.w, d.h)*0.5+20)) continue;
    ctx.save();
    if(d.alpha!==1) ctx.globalAlpha = d.alpha;
    ctx.imageSmoothingEnabled = false;
    if(d.flip){ ctx.translate(d.x, d.y); ctx.scale(-1,1); ctx.drawImage(d.img, -d.w/2, -d.h/2, d.w, d.h); }
    else ctx.drawImage(d.img, d.x-d.w/2, d.y-d.h/2, d.w, d.h);
    ctx.restore();
  }
}
function aidDrawLights(now){
  if(!aidLights.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const rich = vfxLoad > 0.8; // con carga, solo las luces principales (braseros, altar, antorchas)
  for(const L of aidLights){
    if(!rich && L.a < 0.4) continue;
    if(!inView(L.x, L.y, L.r)) continue;
    const f = 1 - L.flick*0.5 + L.flick*0.5*Math.sin(now*(L.torch?11:3.2)+L.ph)*Math.sin(now*1.7+L.ph*2);
    ctx.globalAlpha = Math.max(0, L.a*f);
    const r = L.r*(0.92+0.08*f);
    ctx.drawImage(glowSprite(L.rgb), L.x-r, L.y-r*0.62, r*2, r*1.24);
  }
  ctx.restore();
}
function aidDrawProp(p){
  ctx.save();
  if(p.alpha!==1) ctx.globalAlpha = p.alpha;
  ctx.imageSmoothingEnabled = false;
  // sombra de contacto
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath(); ctx.ellipse(p.x, p.y+2, p.w*0.34, Math.max(5, p.w*0.1), 0, 0, 6.283); ctx.fill();
  if(p.flip){ ctx.translate(p.x, p.y); ctx.scale(-1,1); ctx.drawImage(p.img, -p.w/2, -p.h*p.ay, p.w, p.h); }
  else ctx.drawImage(p.img, p.x-p.w/2, p.y-p.h*p.ay, p.w, p.h);
  ctx.restore();
}
function aidDrawKelp(k, now){
  ctx.save();
  ctx.lineCap = "round";
  for(let j=0;j<k.n;j++){
    const ox = (j-(k.n-1)/2)*8;
    ctx.strokeStyle = j%2 ? "rgba(40,120,80,0.85)" : "rgba(60,150,100,0.85)";
    ctx.lineWidth = 4-j*0.6;
    ctx.beginPath(); ctx.moveTo(k.x+ox, k.y);
    const segs = 6;
    for(let s=1;s<=segs;s++){ const t = s/segs; const sw = Math.sin(now*1.3 + k.ph + t*2.4 + j)*14*t; ctx.lineTo(k.x+ox+sw, k.y - k.h*t); }
    ctx.stroke();
  }
  ctx.restore();
}
// piezas altas que están en cámara → al orden por profundidad de render()
function aidPushTall(){
  if(arenaHas("pushTall")) arenaHook("pushTall");
  for(const p of aidProps){ if(inView(p.x, p.y-p.h*0.5, Math.max(p.w, p.h))) _entPush(p.y, null, null, null, p); }
  for(const w of labyrinthWalls){ const b = aidWallAABB(w); if(inView(w.x, w.y, Math.max(b.x1-b.x0, b.y1-b.y0)*0.5+80)) _entPush(b.y1, null, null, null, w); }
  for(const k of aidKelp){ if(inView(k.x, k.y-k.h*0.5, k.h)) _entPush(k.y, null, null, null, k); }
  // Divina: torres y castillos se ordenan con los personajes (antes se dibujaban siempre debajo)
  if(currentArena==="divina") for(const s of divinaStructures){ if(inView(s.x, s.y, 200)) _entPush(s.y, null, null, null, {divStruct:s}); }
}
function aidDrawTall(it, now){
  if(it.arena){ arenaHook("drawTall", it, now); return; }
  if(it.divStruct){ const s = it.divStruct; if(s.type==="castle") drawDivinaCastle(s, now); else drawDivinaTower(s, now); return; }
  if(it.img) aidDrawProp(it);
  else if(it.axis) aidDrawWall(it, now);
  else if(it.h && it.n) aidDrawKelp(it, now);
}

// ---------------- Estilo de cada arena: terreno exterior, foso, muro perimetral y acentos ----------------
const AID_STYLE = {
  infernal: { outer:"#140b09", outerLines:"rgba(170,45,15,0.34)", rings:true,  moat:"lava", wall:["#0b0706","#3a2820","rgba(140,104,80,0.55)"], smoke:"80,66,62",    accent:"flame", trees:true,  veins:true,  floorDecor:true  },
  hielo:    { outer:"#1a2632", outerLines:"rgba(220,240,255,0.14)", rings:false, moat:"ice",  wall:["#0c1824","#7a9cbc","rgba(235,248,255,0.75)"], smoke:"215,232,248", accent:"ice", trees:true, veins:false, floorDecor:false },
  bosque:   { outer:"#060c05", outerLines:null, rings:false, moat:"moss", wall:["#0a1208","#4e5a40","rgba(120,170,80,0.45)"], smoke:"150,190,140", accent:"moss", trees:false, veins:false, floorDecor:false, canopy:true },
  laberinto:{ outer:"#15100a", outerLines:"rgba(210,170,110,0.10)", rings:false, moat:"none", wall:["#1a120a","#8a6a42","rgba(225,195,135,0.6)"], smoke:"180,150,100", accent:"torch", trees:false, veins:false, floorDecor:true },
  acuatica: { outer:"#030d14", outerLines:null, rings:false, moat:"bio",  wall:["#04121a","#2e5a5e","rgba(120,220,210,0.38)"], smoke:null, accent:"coral", trees:false, veins:false, floorDecor:false },
  divina:   { outer:"#0e0a1c", outerLines:null, rings:false, moat:"divina", wall:["#0a0612","#4a3a6a","rgba(220,190,255,0.5)"], smoke:null, accent:"divina", trees:false, veins:false, floorDecor:false },
};
function aidStyle(){ return AID_STYLE[currentArena] || AID_STYLE.infernal; }
let aidOuterBlobs = [];
function aidBuildOuter(){
  aidOuterBlobs = [];
  const st = aidStyle();
  if(!st.canopy && currentArena!=="hielo" && currentArena!=="acuatica") return;
  const rnd = aidRng(55);
  for(let i=0;i<70;i++){
    const a = i/70*6.283 + rnd()*0.05, r = ARENA_RADIUS*(1.06 + rnd()*0.35);
    aidOuterBlobs.push({x:Math.cos(a)*r*1.18, y:Math.sin(a)*r*0.82, r:70+rnd()*90, t:rnd()});
  }
}
function aidDrawOuter(now){
  const st = aidStyle();
  ctx.save();
  ctx.fillStyle = st.outer;
  ctx.fillRect(player.x-VW, player.y-VH, VW*2/CAM_ZOOM+ARENA_RADIUS*2, VH*2/CAM_ZOOM+ARENA_RADIUS*2);
  if(st.outerLines){
    ctx.strokeStyle = st.outerLines; ctx.lineWidth = 3;
    for(let i=0;i<14;i++){
      const a = i*0.449, r0 = ARENA_RADIUS*1.22, r1 = ARENA_RADIUS*1.9;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*r0*1.18, Math.sin(a)*r0*0.82); ctx.lineTo(Math.cos(a+0.08)*r1*1.18, Math.sin(a+0.08)*r1*0.82); ctx.stroke();
    }
  }
  // bosque: copas de árboles cerrando el claro; hielo: montículos de nieve; acuática: rocas del arrecife
  for(const b of aidOuterBlobs){
    if(!inView(b.x, b.y, b.r)) continue;
    if(currentArena==="bosque"){
      ctx.fillStyle = b.t<0.5 ? "#0f1d0c" : "#142610"; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r*0.72, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(60,100,40,0.35)"; ctx.beginPath(); ctx.ellipse(b.x-b.r*0.2, b.y-b.r*0.2, b.r*0.5, b.r*0.34, 0, 0, 6.283); ctx.fill();
    } else if(currentArena==="hielo"){
      ctx.fillStyle = "rgba(200,222,240,0.55)"; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r*0.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(245,252,255,0.45)"; ctx.beginPath(); ctx.ellipse(b.x-b.r*0.15, b.y-b.r*0.12, b.r*0.6, b.r*0.26, 0, 0, 6.283); ctx.fill();
    } else {
      ctx.fillStyle = "#0a1c24"; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r*0.8, b.r*0.55, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(60,140,140,0.25)"; ctx.beginPath(); ctx.ellipse(b.x, b.y-b.r*0.2, b.r*0.5, b.r*0.2, 0, 0, 6.283); ctx.fill();
    }
  }
  ctx.restore();
}
// Foso pegado al muro: lava (Infernal), grieta helada (Hielo), zanja con musgo (Bosque),
// veta bioluminiscente tenue (Acuática), mitad corrupta / mitad sagrada (Divina); el Laberinto no tiene.
function aidDrawMoat(now){
  const st = aidStyle();
  if(st.moat==="none") return;
  ctx.save();
  octPath(ARENA_RADIUS); ctx.clip();
  if(st.moat==="lava"){
    const mvc = arenaVeinColors(0.6 + 0.25*Math.sin(now*1.8));
    ctx.strokeStyle = mvc.core; ctx.lineWidth = 26; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.strokeStyle = mvc.bright; ctx.lineWidth = 10; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = mvc.glow; ctx.lineWidth = 80; octPath(ARENA_RADIUS*0.96); ctx.stroke();
  } else if(st.moat==="ice"){
    ctx.strokeStyle = "#0e2a44"; ctx.lineWidth = 30; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.strokeStyle = "rgba(150,210,245,0.8)"; ctx.lineWidth = 6; octPath(ARENA_RADIUS*0.962); ctx.stroke();
    ctx.strokeStyle = "rgba(240,250,255,0.9)"; ctx.lineWidth = 2; octPath(ARENA_RADIUS*0.955); ctx.stroke();
  } else if(st.moat==="moss"){
    ctx.strokeStyle = "rgba(10,20,8,0.9)"; ctx.lineWidth = 34; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.strokeStyle = "rgba(60,100,40,0.7)"; ctx.lineWidth = 12; octPath(ARENA_RADIUS*0.955); ctx.stroke();
  } else if(st.moat==="bio"){
    const p = 0.5+0.5*Math.sin(now*1.1);
    ctx.strokeStyle = "rgba(4,18,22,0.9)"; ctx.lineWidth = 30; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(60,200,190,${0.10+0.08*p})`; ctx.lineWidth = 40; octPath(ARENA_RADIUS*0.96); ctx.stroke();
  } else if(st.moat==="divina"){
    ctx.strokeStyle = "rgba(10,6,18,0.9)"; ctx.lineWidth = 28; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.save(); ctx.beginPath(); ctx.rect(-2000,-2000,4000,2000); ctx.clip(); ctx.strokeStyle = "rgba(230,40,80,0.22)"; ctx.lineWidth = 50; octPath(ARENA_RADIUS*0.96); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-2000,0,4000,2000); ctx.clip(); ctx.strokeStyle = "rgba(255,220,140,0.20)"; ctx.lineWidth = 50; octPath(ARENA_RADIUS*0.96); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
function aidDrawWallRing(now){
  const st = aidStyle();
  ctx.save();
  const thick = currentArena==="laberinto" ? 40 : 30;
  ctx.strokeStyle = st.wall[0]; ctx.lineWidth = thick; octPath(ARENA_RADIUS); ctx.stroke();
  ctx.strokeStyle = st.wall[1]; ctx.lineWidth = thick-10; octPath(ARENA_RADIUS); ctx.stroke();
  ctx.strokeStyle = st.wall[2]; ctx.lineWidth = 5; octPath(ARENA_RADIUS*0.985); ctx.stroke();
  if(currentArena==="laberinto"){ ctx.strokeStyle = "rgba(60,40,20,0.8)"; ctx.setLineDash([4,10]); ctx.lineWidth = 12; octPath(ARENA_RADIUS); ctx.stroke(); ctx.setLineDash([]); }
  if(currentArena==="bosque"){ ctx.strokeStyle = "rgba(50,90,34,0.8)"; ctx.setLineDash([22,14]); ctx.lineWidth = 16; octPath(ARENA_RADIUS*0.995); ctx.stroke(); ctx.setLineDash([]); }
  if(currentArena==="hielo"){ ctx.strokeStyle = "rgba(245,252,255,0.85)"; ctx.setLineDash([30,12]); ctx.lineWidth = 8; octPath(ARENA_RADIUS*1.005); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
// Acento que trepa el muro en cada uno de los puntos de "braziers" (mismos puntos de siempre)
function aidDrawAccent(br, f, ox, oy, i){
  const A = aidStyle().accent;
  if(A==="moss"){
    // hongos luminosos
    if(i%2) return;
    const cols = ["#9ae07a","#e0d06a","#7ad0e0"][i%3];
    ctx.fillStyle = "#d8d0b8"; ctx.fillRect(br.x-1+ox*4, br.y-10+oy*4, 3, 10);
    ctx.fillStyle = cols; ctx.beginPath(); ctx.ellipse(br.x+ox*4, br.y-11+oy*4, 7, 4, 0, Math.PI, 0); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12+0.1*f; ctx.drawImage(glowSprite("150,230,120"), br.x-30, br.y-40, 60, 60); ctx.restore();
  } else if(A==="torch"){
    // almenas de piedra y, cada tanto, una antorcha
    ctx.fillStyle = "#6a5234"; ctx.fillRect(br.x-7+ox*6, br.y-16+oy*6, 14, 16);
    ctx.fillStyle = "#b8904e"; ctx.fillRect(br.x-7+ox*6, br.y-18+oy*6, 14, 3);
    if(i%8===0){
      ctx.fillStyle = `rgba(255,${130+80*f|0},40,0.95)`; ctx.fillRect(br.x-4+ox*6, br.y-30-6*f+oy*6, 8, 10+6*f);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.25+0.15*f; ctx.drawImage(glowSprite("255,170,80"), br.x-70, br.y-80, 140, 140); ctx.restore();
    }
  } else if(A==="coral"){
    if(i%2) return;
    const c = ["#e0607a","#e08a3a","#8a5ae0","#3ab0a0"][i%4];
    ctx.fillStyle = c;
    for(let k=0;k<3;k++){ ctx.fillRect(br.x-6+k*5+ox*4, br.y-8-k*3-(k%2)*4+oy*4, 3, 10+k*3); }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.10+0.06*f; ctx.drawImage(glowSprite("90,220,210"), br.x-26, br.y-36, 52, 52); ctx.restore();
  } else if(A==="divina"){
    const north = br.y < 0;
    if(north){ ctx.fillStyle = "#2a1426"; ctx.beginPath(); ctx.moveTo(br.x-6, br.y+2); ctx.lineTo(br.x+ox*6, br.y-24-6*f); ctx.lineTo(br.x+6, br.y+2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(230,40,70,${0.5+0.4*f})`; ctx.fillRect(br.x-1+ox*6, br.y-14+oy*2, 2, 6); }
    else { ctx.fillStyle = "#e8e0c8"; ctx.fillRect(br.x-3+ox*4, br.y-20+oy*4, 6, 20); ctx.fillStyle = "#e0b050"; ctx.fillRect(br.x-4+ox*4, br.y-23+oy*4, 8, 3);
      if(i%3===0){ ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12+0.08*f; ctx.drawImage(glowSprite("255,220,140"), br.x-30, br.y-44, 60, 60); ctx.restore(); } }
  } else {
    return false; // flame / ice: se dibujan con el código de siempre
  }
  return true;
}
// Divina: el suelo se parte en dos facciones, con una calzada central y ramales a las torres
function aidArtCelRune(){
  return aidArt("celRune", 70, 50, (g,w,h)=>{ const cx=w/2, cy=h/2;
    g.strokeStyle = "rgba(255,215,120,0.8)"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx,cy,32,22,0,0,6.283); g.stroke();
    g.beginPath(); g.ellipse(cx,cy,22,15,0,0,6.283); g.stroke();
    g.fillStyle = "rgba(160,220,255,0.8)"; for(let i=0;i<6;i++){ const a=i/6*6.283; g.fillRect(cx+Math.cos(a)*27-1, cy+Math.sin(a)*18.5-2, 3, 4); }
    g.fillStyle = "rgba(255,240,200,0.9)"; g.fillRect(cx-1, cy-8, 3, 16); g.fillRect(cx-6, cy-2, 13, 3); });
}
function aidArtCorruptPool(v){
  return aidArt("corruptPool"+v, 110, 60, (g,w,h)=>{ const rnd = aidRng(1400+v);
    aidBlob(g, w/2, h/2, 50, 24, "rgba(40,6,24,0.75)", rnd, 11); aidBlob(g, w/2, h/2, 26, 12, "rgba(110,10,50,0.6)", rnd, 6);
    g.strokeStyle = "rgba(230,40,70,0.7)"; g.lineWidth = 1.5;
    for(let i=0;i<5;i++){ let x=w/2, y=h/2, a=rnd()*6.283; g.beginPath(); g.moveTo(x,y); for(let k=0;k<5;k++){ a+=(rnd()-0.5)*0.8; x+=Math.cos(a)*9; y+=Math.sin(a)*5; g.lineTo(x,y); } g.stroke(); } });
}
function aidDrawDivinaGround(now){
  ctx.save();
  // tinte de cada mitad
  ctx.fillStyle = "rgba(60,4,28,0.38)"; ctx.fillRect(-1500,-1100,3000,1100);
  ctx.fillStyle = "rgba(255,240,205,0.22)"; ctx.fillRect(-1500,0,3000,1100);
  // calzada central (castillo a castillo) y ramales a las torres de base
  const road = (x0,y0,x1,y1,w)=>{ ctx.lineCap = "round"; ctx.strokeStyle = "rgba(10,8,16,0.55)"; ctx.lineWidth = w+14; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    ctx.strokeStyle = "rgba(120,110,140,0.55)"; ctx.lineWidth = w; ctx.stroke(); };
  road(0,-720,0,720,130);
  road(0,-470,-260,-560,70); road(0,-470,260,-560,70); road(0,470,-260,560,70); road(0,470,260,560,70);
  // losas: obsidiana quebrada al norte, mármol con ribete dorado al sur
  for(let y=-700; y<700; y+=36){
    const north = y < 0;
    ctx.fillStyle = north ? "rgba(30,12,30,0.5)" : "rgba(240,230,210,0.22)";
    ctx.fillRect(-60, y, 120, 2);
    if(!north && (y/36)%3===0){ ctx.fillStyle = "rgba(230,180,80,0.55)"; ctx.fillRect(-64, y, 4, 36); ctx.fillRect(60, y, 4, 36); }
    if(north && (y/36)%2===0){ ctx.fillStyle = "rgba(230,40,70,0.35)"; ctx.fillRect(-30+((y*7)%50), y+8, 18, 2); }
  }
  // frente de choque en el centro: la línea donde se encuentran las dos facciones
  const p = 0.5+0.5*Math.sin(now*2.2);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(0,-40,0,40);
  g.addColorStop(0, `rgba(230,40,80,${0.10+0.08*p})`); g.addColorStop(0.5, `rgba(255,240,220,${0.10+0.06*p})`); g.addColorStop(1, `rgba(255,210,120,${0.10+0.08*p})`);
  ctx.fillStyle = g; ctx.fillRect(-1300,-40,2600,80);
  ctx.restore();
}

let aidLavaLayer = null;
function aidBuildLavaLayer(){
  aidLavaLayer = null;
  const st = aidStyle();
  if(!(st.veins && lavaPools.length) && !(st.floorDecor && floorDecor.length)) return;
  const k = 0.5, x0 = -1300, y0 = -900, w = 2600, h = 1800;
  const c = document.createElement("canvas"); c.width = w*k; c.height = h*k;
  const g = c.getContext("2d");
  g.scale(k, k); g.translate(-x0, -y0);
  // detalles secos del suelo (grietas, piedras, huesos): estáticos, se hornean acá
  if(st.floorDecor) for(const d of floorDecor){
    if(d.kind==="crack"){ g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 3; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x+Math.cos(d.rot)*d.len, d.y+Math.sin(d.rot)*d.len); g.stroke(); }
    else if(d.kind==="rock"){ g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(d.x, d.y, 12, 9); g.fillStyle = "rgba(96,72,60,0.85)"; g.fillRect(d.x+2, d.y, 9, 6); }
    else { g.save(); g.translate(d.x, d.y); g.rotate(d.rot); g.fillStyle = "rgba(188,176,150,0.30)"; g.fillRect(-7, -1, 14, 3);
      g.beginPath(); g.arc(-7, 0, 2.6, 0, Math.PI*2); g.fill(); g.beginPath(); g.arc(7, 0, 2.6, 0, Math.PI*2); g.fill(); g.restore(); }
  }
  aidLavaLayer = {c, k, x0, y0, w, h, lava: !!(st.veins && lavaPools.length)};
  if(!aidLavaLayer.lava) return;
  const vc = arenaVeinColors(0.7);
  g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); for(const pool of lavaPools){ if(!pool.pts) continue; pool.pts.forEach((p,i)=> i===0 ? g.moveTo(p.x,p.y) : g.lineTo(p.x,p.y)); }
  g.strokeStyle = "rgba(0,0,0,0.85)"; g.lineWidth = 8; g.stroke();
  g.strokeStyle = vc.core; g.lineWidth = 4; g.stroke();
  g.strokeStyle = vc.bright; g.lineWidth = 1.5; g.stroke();
  g.globalCompositeOperation = "lighter"; g.strokeStyle = vc.glow; g.lineWidth = 21; g.stroke(); g.globalCompositeOperation = "source-over";
  g.beginPath(); for(const pool of lavaPools){ if(pool.blocks) for(const b of pool.blocks) g.rect(pool.x+b.x, pool.y+b.y, 10, 10); } g.fillStyle = vc.core; g.fill();
  g.beginPath(); for(const pool of lavaPools){ if(pool.blocks) for(const b of pool.blocks){ if(((b.x/10)+(b.y/10)) % 3 === 0) g.rect(pool.x+b.x+2, pool.y+b.y+2, 6, 6); } } g.fillStyle = vc.bright; g.fill();
  g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.16;
  const gs = glowSprite("255,120,40"); for(const pool of lavaPools){ if(pool.blocks) g.drawImage(gs, pool.x-120, pool.y-120, 240, 240); }
}

// Punto sobre el perímetro de un octágono alargado (como el coliseo de referencia)
function octPoint(R, ang){
  const N = 8, rot = Math.PI/8;
  const a = ang - rot;
  const seg = Math.floor(a/(Math.PI*2/N));
  const a0 = seg*(Math.PI*2/N)+rot, a1 = (seg+1)*(Math.PI*2/N)+rot;
  const p0 = {x:Math.cos(a0)*R*1.18, y:Math.sin(a0)*R*0.82};
  const p1 = {x:Math.cos(a1)*R*1.18, y:Math.sin(a1)*R*0.82};
  const t = (ang - a0)/(a1 - a0);
  return {x:p0.x+(p1.x-p0.x)*t, y:p0.y+(p1.y-p0.y)*t};
}

function octPath(R){
  ctx.beginPath();
  const N = 8;
  for(let i=0;i<N;i++){
    const a = i*(Math.PI*2/N)+Math.PI/8;
    const x = Math.cos(a)*R*1.18, y = Math.sin(a)*R*0.82;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath();
}

function drawDeadTree(t){
  const now = performance.now()/1000;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(0, 4, 16, 6, 0, 0, Math.PI*2); ctx.fill();

  // brasas al pie del tronco (solo tiene sentido en la Infernal)
  if(t.burning && currentArena==="infernal"){
    const f = 0.6+0.4*Math.sin(now*5+t.phase);
    ctx.fillStyle = `rgba(255,${110+70*f|0},30,0.75)`;
    ctx.fillRect(-9, -2, 18, 5);
    ctx.fillStyle = `rgba(255,220,130,${0.35*f+0.2})`;
    ctx.fillRect(-5, -1, 10, 3);
  }

  const barkDark = currentArena==="hielo" ? "#182226" : "#1a100b";
  const barkLight = currentArena==="hielo" ? "#324450" : "#33211a";
  ctx.strokeStyle = barkDark; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(t.lean*18, -t.h); ctx.stroke();
  ctx.strokeStyle = barkLight; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-1, 2); ctx.lineTo(t.lean*18-1, -t.h); ctx.stroke();

  const nb = t.branches;
  for(let i=0;i<nb;i++){
    const along = 0.32 + (i/nb)*0.6;
    const bx = t.lean*18*along, by = 2-(t.h+4)*along;
    const dir = (i%2===0) ? 1 : -1;
    const len = 12+((t.seed*7+i*5)%14);
    ctx.strokeStyle = barkDark; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+dir*len, by-len*0.8); ctx.stroke();
    ctx.strokeStyle = barkLight; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+dir*len, by-len*0.8); ctx.stroke();
    // ramita secundaria
    ctx.strokeStyle = barkDark; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx+dir*len*0.6, by-len*0.48);
    ctx.lineTo(bx+dir*len*1.1, by-len*0.35);
    ctx.stroke();
    if(currentArena==="bosque"){
      // follaje vivo: un manojo de hojas en la punta de cada rama (acá NO están muertos)
      ctx.fillStyle = "rgba(60,120,45,0.55)";
      ctx.beginPath(); ctx.ellipse(bx+dir*len*1.1, by-len*0.35, 7, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(110,190,80,0.45)";
      ctx.beginPath(); ctx.ellipse(bx+dir*len*1.1-2, by-len*0.35-2, 4, 3, 0, 0, Math.PI*2); ctx.fill();
    } else if(currentArena==="hielo"){
      // carámbano colgando de la rama
      ctx.fillStyle = "rgba(190,225,245,0.55)";
      ctx.beginPath();
      ctx.moveTo(bx+dir*len*1.05, by-len*0.32);
      ctx.lineTo(bx+dir*len*1.05+2, by-len*0.32+9);
      ctx.lineTo(bx+dir*len*1.05-2, by-len*0.32+9);
      ctx.closePath(); ctx.fill();
    }
  }
  // resplandor sobre el tronco: rojizo (Infernal), escarcha (Hielo) o nada (Bosque, ya tiene follaje)
  if(currentArena==="hielo"){
    ctx.strokeStyle = "rgba(180,220,255,0.28)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(1, 2); ctx.lineTo(t.lean*18+1, -t.h); ctx.stroke();
  } else if(currentArena!=="bosque"){
    ctx.strokeStyle = "rgba(255,90,40,0.18)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(1, 2); ctx.lineTo(t.lean*18+1, -t.h); ctx.stroke();
  }
  ctx.restore();
}

// Colores de las venas/charcos luminosos del suelo, según el tema de la arena actual:
// fuego (Infernal), grietas de hielo (Hielo) o musgo luminoso (Bosque).
function arenaVeinColors(pulse){
  if(currentArena==="hielo"){
    return {
      core:   `rgba(60,${150+40*pulse|0},220,0.95)`,
      bright: `rgba(180,${220+30*pulse|0},255,${0.5*pulse+0.3})`,
      glow:   `rgba(120,200,255,${0.18*pulse})`,
      pool0:  `rgba(140,210,255,${0.26*pulse})`,
      pool1:  "rgba(140,210,255,0)"
    };
  }
  if(currentArena==="bosque"){
    return {
      core:   `rgba(40,${120+40*pulse|0},30,0.95)`,
      bright: `rgba(140,${220+30*pulse|0},90,${0.5*pulse+0.3})`,
      glow:   `rgba(110,220,90,${0.16*pulse})`,
      pool0:  `rgba(120,220,100,${0.22*pulse})`,
      pool1:  "rgba(120,220,100,0)"
    };
  }
  if(currentArena==="laberinto"){
    // Vetas de oro/arena viva en la piedra, no fuego: identidad greco-egipcia-desértica del
    // Laberinto (sección "IDENTIDAD DE ARENAS"), separada del tema infernal que antes heredaba
    // por defecto.
    return {
      core:   `rgba(180,${140+40*pulse|0},60,0.95)`,
      bright: `rgba(240,${210+30*pulse|0},150,${0.5*pulse+0.3})`,
      glow:   `rgba(230,190,110,${0.16*pulse})`,
      pool0:  `rgba(230,190,110,${0.22*pulse})`,
      pool1:  "rgba(230,190,110,0)"
    };
  }
  if(currentArena==="acuatica"){
    // Vetas bioluminiscentes azul-verdosas en las ruinas hundidas -no fuego ni hielo,
    // identidad propia de la Arena Acuática (sección "IDENTIDAD VISUAL")-.
    return {
      core:   `rgba(30,${140+50*pulse|0},170,0.95)`,
      bright: `rgba(120,${230+25*pulse|0},220,${0.5*pulse+0.3})`,
      glow:   `rgba(90,220,210,${0.18*pulse})`,
      pool0:  `rgba(90,220,210,${0.24*pulse})`,
      pool1:  "rgba(90,220,210,0)"
    };
  }
  // Infernal (por defecto)
  return {
    core:   `rgba(190,${40+35*pulse|0},10,0.95)`,
    bright: `rgba(255,${150+60*pulse|0},50,${0.5*pulse+0.3})`,
    glow:   `rgba(255,120,40,${0.15*pulse})`,
    pool0:  `rgba(255,120,40,${0.22*pulse})`,
    pool1:  "rgba(255,120,40,0)"
  };
}

function drawArena(){
  const now = performance.now()/1000;

  // Musashi — Último Duelo: mientras la cámara sigue a `player` dentro de la arena de
  // bolsillo, se dibuja el dojo en vez del coliseo real (que además está a decenas de miles
  // de píxeles de distancia -no se vería nada útil igual-). Si el que está en duelo es un
  // aliado/bot, la cámara sigue centrada en `player` como siempre y esto ni se ejecuta.
  if(player.duelActive){ drawLastDuelArena(player); return; }
  if(arenaHas("drawWorld")){ arenaHook("drawWorld", now); return; } // escenario propio (La Fortaleza)
  const st = aidStyle();

  // ---------- Terreno exterior propio de cada arena ----------
  aidDrawOuter(now);

  // ---------- Plataforma ----------
  ctx.save();
  octPath(ARENA_RADIUS);
  ctx.clip();

  if(floorPattern){ ctx.fillStyle = floorPattern; ctx.fillRect(-ARENA_RADIUS*1.3,-ARENA_RADIUS*1.3,ARENA_RADIUS*2.6,ARENA_RADIUS*2.6); }
  else { ctx.fillStyle="#1d130e"; ctx.fillRect(-ARENA_RADIUS*1.3,-ARENA_RADIUS*1.3,ARENA_RADIUS*2.6,ARENA_RADIUS*2.6); }

  if(st.rings){
    // Infernal: coliseo caído -nervaduras octogonales concéntricas y radios de piedra-
    ctx.strokeStyle = "rgba(20,13,10,0.75)"; ctx.lineWidth = 9;
    [0.45, 0.72, 0.92].forEach(f=>{ octPath(ARENA_RADIUS*f); ctx.stroke(); });
    ctx.strokeStyle = "rgba(96,72,56,0.35)"; ctx.lineWidth = 2;
    [0.45, 0.72, 0.92].forEach(f=>{ octPath(ARENA_RADIUS*f); ctx.stroke(); });
    ctx.strokeStyle = "rgba(20,13,10,0.7)"; ctx.lineWidth = 7;
    for(let i=0;i<8;i++){
      const a = i*(Math.PI*2/8)+Math.PI/8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*ARENA_RADIUS*0.30*1.18, Math.sin(a)*ARENA_RADIUS*0.30*0.82);
      ctx.lineTo(Math.cos(a)*ARENA_RADIUS*1.18, Math.sin(a)*ARENA_RADIUS*0.82);
      ctx.stroke();
    }
  }
  if(currentArena==="divina") aidDrawDivinaGround(now);

  // ---------- Piezas planas propias de la arena (hitos, fisuras, nieve, musgo, arena...) ----------
  aidDrawDecals();

  // (los detalles secos del suelo de la Infernal y el Laberinto van horneados en aidLavaLayer)
  // ---------- Lava (solo la Infernal): capa pre-renderizada una vez (ver aidBuildLavaLayer) ----------
  if(aidLavaLayer){
    const L = aidLavaLayer, hw = VW/2/CAM_ZOOM + 40, hh = VH/2/CAM_ZOOM + 40;
    const wx0 = Math.max(L.x0, player.x-hw), wy0 = Math.max(L.y0, player.y-hh);
    const wx1 = Math.min(L.x0+L.w, player.x+hw), wy1 = Math.min(L.y0+L.h, player.y+hh);
    if(wx1 > wx0 && wy1 > wy0){
      const sx = (wx0-L.x0)*L.k, sy = (wy0-L.y0)*L.k, sw = (wx1-wx0)*L.k, sh = (wy1-wy0)*L.k;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(L.c, sx, sy, sw, sh, wx0, wy0, wx1-wx0, wy1-wy0);
      if(L.lava && vfxLoad > 0.7){ // latido de la lava: segunda pasada aditiva tenue
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.18+0.14*Math.sin(now*2);
        ctx.drawImage(L.c, sx, sy, sw, sh, wx0, wy0, wx1-wx0, wy1-wy0);
      }
      ctx.restore();
    }
  }

  // ---------- Árboles muertos (quemados en la Infernal, congelados en el Hielo) ----------
  if(st.trees) for(const tr of deadTrees){
    if(!inView(tr.x, tr.y, 90)) continue;
    drawDeadTree(tr);
  }

  // ---------- Luces del escenario (braseros, antorchas, cristales, runas) ----------
  aidDrawLights(now);

  // ---------- Niebla / humo / polvo en suspensión (color propio de cada arena) ----------
  if(st.smoke) for(const s of smokePuffs){
    if(!inView(s.x, s.y, s.r+40)) continue;
    const drift = Math.sin(now*0.5 + s.phase)*22;
    ctx.save(); ctx.globalAlpha = 0.13; ctx.drawImage(glowSprite(st.smoke), s.x+drift-s.r, s.y-s.r, s.r*2, s.r*2); ctx.restore();
  }

  // ---------- Viñeta ----------
  const vg = ctx.createRadialGradient(0,0,ARENA_RADIUS*0.30,0,0,ARENA_RADIUS*1.15);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.70)");
  ctx.fillStyle = vg; ctx.fillRect(-ARENA_RADIUS*1.3,-ARENA_RADIUS*1.3,ARENA_RADIUS*2.6,ARENA_RADIUS*2.6);
  ctx.restore();

  // ---------- Foso y muro perimetral (material propio de cada arena) ----------
  aidDrawMoat(now);
  aidDrawWallRing(now);
  const mvc = arenaVeinColors(0.6 + 0.25*Math.sin(now*1.8));
  if(st.moat==="lava"){ ctx.save(); ctx.strokeStyle = mvc.bright; ctx.lineWidth = 3; octPath(ARENA_RADIUS*0.955); ctx.stroke(); ctx.restore(); }

  // ---------- Acentos del borde: llamas y púas (Infernal), esquirlas (Hielo), hongos (Bosque),
  // almenas y antorchas (Laberinto), corales (Acuática), púas / agujas doradas (Divina) ----------
  let bi = 0;
  for(const br of braziers){
    bi++;
    if(vfxLoad < 0.8 && (bi&1)) continue; // con carga, la mitad de los acentos del borde
    if(!inView(br.x, br.y, 120)) continue;
    const f = 0.55 + 0.45*Math.sin(now*7 + br.phase);
    const outAng = Math.atan2(br.y, br.x);
    const ox = Math.cos(outAng), oy = Math.sin(outAng);
    if(aidDrawAccent(br, f, ox, oy, bi)) continue;

    if(br.spike && currentArena==="infernal"){
      ctx.save();
      ctx.translate(br.x, br.y);
      ctx.rotate(outAng + Math.PI/2);
      ctx.fillStyle = "#0e0907";
      ctx.beginPath();
      ctx.moveTo(-7, 6); ctx.lineTo(0, -30); ctx.lineTo(7, 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#3a2820";
      ctx.beginPath();
      ctx.moveTo(-4, 4); ctx.lineTo(0, -25); ctx.lineTo(4, 4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const h = br.h*(0.8+0.5*f);
    if(currentArena==="hielo"){
      ctx.fillStyle = `rgba(40,110,170,0.92)`;
      ctx.fillRect(br.x-6+ox*4, br.y-h*0.7+oy*4, 12, h);
      ctx.fillStyle = `rgba(${110+60*f|0},200,255,0.95)`;
      ctx.fillRect(br.x-4+ox*4, br.y-h*0.9+oy*4, 8, h*0.85);
      ctx.fillStyle = `rgba(230,250,255,${0.65*f+0.3})`;
      ctx.fillRect(br.x-2+ox*4, br.y-h*0.75+oy*4, 4, h*0.5);
      if(bi%3===0){
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.10*f+0.05;
        ctx.drawImage(glowSprite("120,200,255"), br.x-80, br.y-80, 160, 160);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = `rgba(210,45,12,0.92)`;
      ctx.fillRect(br.x-6+ox*4, br.y-h*0.7+oy*4, 12, h);
      ctx.fillStyle = `rgba(255,${115+65*f|0},25,0.95)`;
      ctx.fillRect(br.x-4+ox*4, br.y-h*0.9+oy*4, 8, h*0.85);
      ctx.fillStyle = `rgba(255,230,150,${0.65*f+0.3})`;
      ctx.fillRect(br.x-2+ox*4, br.y-h*0.75+oy*4, 4, h*0.5);
      if(bi%2===0){
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.13*f+0.05;
        ctx.drawImage(glowSprite("255,120,40"), br.x-80, br.y-80, 160, 160);
        ctx.restore();
      }
    }
  }
}
