"use strict";
/* ============================================================
   js/rendering/gore.js
   GORE DARK-FANTASY (pixel art, sin realismo gráfico):
   - MANCHAS en el suelo (sangre, quemaduras, escarcha, astillas de hueso/piedra), con fundido y
     tope por dispositivo. Se pre-dibujan una vez en canvases chicos (pixel blobs) y se estampan.
   - CADÁVERES que quedan un rato en el suelo (pose final de la animación de muerte) y se
     desvanecen; el Nigromante los usa (corpseList / consumeCorpse).
   - MUERTES POR TIPO DE DAÑO: quemado (carbonizado + humo), congelado (se hace añicos, sin cuerpo),
     electrocutado (destello + humo), golpe pesado (desmembramiento: trozos y, a veces, la cabeza
     sale volando), sangrado (charco grande).
   El material del enemigo decide el color: carne = rojo; hueso = astillas sin sangre; piedra =
   cascotes; agua = salpicadura; micelio = savia rosada; espectros = se disuelven (sin cuerpo).
   Presupuestos: GORE_BUDGET (celular menos). Todo lo decorativo se recorta primero con vfxLoad.
   ============================================================ */
const IS_TOUCH_DEVICE = (typeof matchMedia==="function") && matchMedia("(pointer:coarse)").matches;
const GORE_BUDGET = IS_TOUCH_DEVICE ? {decals:90, corpses:18, corpseMs:9000, decalMs:12000} : {decals:170, corpses:34, corpseMs:12000, decalMs:16000};
// Colores por material (sangre/fluido principal, oscuro, astilla)
const GORE_MAT = {
  flesh:{blood:"#8e1414", dark:"#4e0808", chip:"#b0402c", bleeds:true},
  rot:{blood:"#4e5e22", dark:"#2c3614", chip:"#6d7d55", bleeds:true},
  wood:{blood:"#3e5a1e", dark:"#24351a", chip:"#8a6a42", bleeds:false},
  leaf:{blood:"#3e6a24", dark:"#24401a", chip:"#8fd46a", bleeds:true},
  bone:{blood:null, dark:"#3a3528", chip:"#ece4cc", bleeds:false},
  rock:{blood:null, dark:"#3a3a36", chip:"#8a8a82", bleeds:false},
  stone:{blood:null, dark:"#3a403a", chip:"#8a9a8a", bleeds:false},
  ice:{blood:"#9fd8f0", dark:"#5a8aa8", chip:"#dff4ff", bleeds:false},
  water:{blood:"#2a5a6e", dark:"#163644", chip:"#7fd0e0", bleeds:true},
  chitin:{blood:"#8a7a1e", dark:"#4a4210", chip:"#c99a4a", bleeds:true},
  shell:{blood:"#6a1a10", dark:"#3a0e08", chip:"#ff8a5a", bleeds:true},
  ink:{blood:"#3a1a4a", dark:"#1a0a24", chip:"#c98fe0", bleeds:true},
  sand:{blood:null, dark:"#6a5a30", chip:"#e0c070", bleeds:false},
  micBlood:{blood:"#9a1848", dark:"#4a0a24", chip:"#ff5a9a", bleeds:true},
  shadow:{blood:null, dark:"#1a1a22", chip:"#5a5a62", bleeds:false, noCorpse:true},
  spirit:{blood:null, dark:"#2a2a3a", chip:"#c9d8ff", bleeds:false, noCorpse:true}
};
function goreMatOf(e){ const m = animProfileOf(e).material; return GORE_MAT[m] ? m : "flesh"; }

/* ---------------- manchas ---------------- */
const _decals = []; // {x,y,img,rot,t,dur,s}
const _blobCache = {};
// Blob de píxeles con semilla (charco irregular + gotas), cacheado por color/forma.
function _goreBlob(color, dark, kind, variant){
  const key = color+"|"+dark+"|"+kind+"|"+variant;
  if(_blobCache[key]) return _blobCache[key];
  const S = kind==="pool" ? 24 : (kind==="drip" ? 10 : 14), px = 2;
  const cv = document.createElement("canvas"); cv.width = S*px; cv.height = S*px;
  const g = cv.getContext("2d");
  let seed = (variant+1)*9301 + kind.length*49297; const rnd = ()=>{ seed = (seed*233280 + 49297) % 1e7; return seed/1e7; };
  const cx = S/2, cy = S/2, R = kind==="pool" ? S*0.36 : (kind==="drip" ? S*0.2 : S*0.3);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const dx = (x-cx)/R, dy = (y-cy)/(R*0.7);
    const n = Math.sin(x*1.7+variant)*0.18 + Math.cos(y*1.3+variant*2)*0.18 + (rnd()-0.5)*0.35;
    const d = dx*dx + dy*dy + n;
    if(kind==="chips"){ if(rnd() < 0.07 && d < 2.2){ g.fillStyle = color; g.fillRect(x*px, y*px, px, px); } continue; }
    if(d < 0.75){ g.fillStyle = d < 0.35 ? dark : color; g.fillRect(x*px, y*px, px, px); }
    else if(d < 1.6 && rnd() < (kind==="pool" ? 0.12 : 0.08)){ g.fillStyle = color; g.fillRect(x*px, y*px, px, px); } // gotas sueltas
  }
  return (_blobCache[key] = cv);
}
function addDecal(x, y, color, dark, kind, scale){
  if(!color) return;
  if(_decals.length >= GORE_BUDGET.decals) _decals.shift();
  const img = _goreBlob(color, dark||color, kind, (Math.random()*5)|0);
  _decals.push({x, y, img, rot:(Math.random()<0.5?0:Math.PI)*0, t:0, dur:GORE_BUDGET.decalMs*(0.8+Math.random()*0.4), s:scale||1, flip:Math.random()<0.5});
}
function updateGore(dt){
  for(let i=_decals.length-1;i>=0;i--){ const d = _decals[i]; d.t += dt; if(d.t >= d.dur) _decals.splice(i,1); }
  for(let i=corpseList.length-1;i>=0;i--){ const c = corpseList[i]; c.t += dt; if(c.t >= c.dur) corpseList.splice(i,1); }
}
function drawGoreDecals(){
  if(!_decals.length) return;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for(const d of _decals){
    const w = d.img.width*d.s, h = d.img.height*d.s*0.62; // aplastado en perspectiva (el piso)
    if(!inView(d.x, d.y, w)) continue;
    const left = d.dur - d.t;
    ctx.globalAlpha = Math.min(0.85, left/2500);
    if(d.flip){ ctx.save(); ctx.translate(d.x, d.y); ctx.scale(-1,1); ctx.drawImage(d.img, -w/2, -h/2, w, h); ctx.restore(); }
    else ctx.drawImage(d.img, d.x-w/2, d.y-h/2, w, h);
  }
  ctx.restore();
}

/* ---------------- cadáveres ---------------- */
const corpseList = []; // {e, style, side, t, dur, kind, charred}
function addCorpse(e, style, side, kind){
  const mat = GORE_MAT[goreMatOf(e)];
  if(mat.noCorpse || style==="dissolve" || style==="sink" || kind==="shatter") return null;
  if(e.rank==="jefe" || e.rank==="subjefe" || (e.radius||20) > 60) return null; // los grandes tienen su propia muerte
  if(corpseList.length >= GORE_BUDGET.corpses) corpseList.shift();
  const c = {e, style, side:side||1, t:0, dur:GORE_BUDGET.corpseMs*(0.85+Math.random()*0.3), kind, charred: kind==="burn", x:e.x, y:e.y};
  corpseList.push(c);
  return c;
}
// El Nigromante (y quien lo necesite) toma un cadáver cercano: lo saca del suelo.
function consumeCorpse(x, y, r){
  let best = -1, bd = r;
  for(let i=0;i<corpseList.length;i++){ const c = corpseList[i]; const d = Math.hypot(c.x-x, c.y-y); if(d < bd && !c.claimed){ bd = d; best = i; } }
  if(best < 0) return null;
  return corpseList.splice(best, 1)[0];
}
function corpsesNear(x, y, r){ let n = 0; for(const c of corpseList) if(Math.hypot(c.x-x, c.y-y) < r) n++; return n; }
function drawCorpses(){
  for(const c of corpseList){
    const e = c.e; if(!inView(c.x, c.y, (e.radius||20)*3)) continue;
    const left = c.dur - c.t;
    const alpha = Math.min(0.9, left/1800);
    let sx = 1, sy = 1, rot = 0, oy = 0;
    switch(c.style){
      case "crumble": sy = 0.35; sx = 1.2; break;
      case "collapse": case "boss": sy = 0.5; sx = 1.12; oy = 4; break;
      case "frames": break;
      default: rot = c.side*1.35; oy = 3; break;
    }
    ctx.save();
    ctx.translate(c.x, c.y+oy); if(rot) ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-c.x, -c.y);
    const m = ANIM_ALPHA_MUL;
    ANIM_ALPHA_MUL = alpha; ctx.globalAlpha = alpha;
    if(c.charred) ctx.filter = "brightness(0.28) saturate(0.4)";
    e._dyingP = 1; e.hitFlash = 0; e.attackAnim = 0;
    const ox = e.x, oy2 = e.y; e.x = c.x; e.y = c.y;
    drawEnemyBody(e);
    e.x = ox; e.y = oy2;
    ctx.filter = "none";
    ANIM_ALPHA_MUL = m;
    ctx.restore();
    if(c.charred && Math.random() < 0.04*vfxLoad) vfxBurst(c.x+(Math.random()-0.5)*16, c.y-8, 1, "rock", 8, 900, 3, 0, -26, 1);
  }
}
function resetGore(){ _decals.length = 0; corpseList.length = 0; }

/* ---------------- sangre al golpear ---------------- */
function goreOnHit(e, pow, dx, dy){
  const mat = GORE_MAT[goreMatOf(e)];
  const n = pow>=3 ? 6 : (pow===2 ? 3 : 2);
  if(mat.blood) vfxBurst(e.x, e.y-(e.radius||20)*0.6, n, _goreParticlePal(mat), 80+pow*30, 260, 2.5+pow*0.3, 0, -18, 0);
  else vfxBurst(e.x, e.y-(e.radius||20)*0.6, n, _goreChipPal(mat), 80+pow*25, 240, 2.5, 0, -24, 0);
  if(mat.bleeds && Math.random() < [0,0.18,0.35,0.9,1][pow]*Math.max(0.4, vfxLoad)){
    addDecal(e.x + dx*(8+pow*6) + (Math.random()-0.5)*10, e.y + 4 + dy*4 + (Math.random()-0.5)*6, mat.blood, mat.dark, pow>=3 ? "pool" : "drip", pow>=3 ? 1.0 : 0.9);
  }
}
function _goreParticlePal(mat){ return mat===GORE_MAT.micBlood ? "micBlood" : (mat===GORE_MAT.water ? "water" : (mat===GORE_MAT.rot||mat===GORE_MAT.leaf||mat===GORE_MAT.wood ? "rot" : "blood")); }
function _goreChipPal(mat){ return mat===GORE_MAT.bone ? "bone" : (mat===GORE_MAT.ice ? "ice" : (mat===GORE_MAT.sand ? "sand" : "rock")); }

/* ---------------- muerte según el tipo de daño ---------------- */
// kind: "burn" | "shatter" | "shock" | "gib" | "bleed" | "normal"
function goreDeathKind(e){
  if(e.frozenTimer>0 || (e.slowAmt||0) > 0.7) return "shatter";
  const k = e._lastDmgKind;
  if(k==="fire" || (e.burnTimer>0 && k!=="physical")) return "burn";
  if(k==="lightning") return "shock";
  if(e._lastHitPow >= 3 && (e._lastOverkill||0) > (e.maxHp||1)*0.25) return "gib";
  if(e._lastHitPow >= 4) return "gib";
  if(e.bleedTimer>0) return "bleed";
  return "normal";
}
function goreOnDeath(e, kind, dx, dy){
  const mat = GORE_MAT[goreMatOf(e)], R = e.radius||20, big = R > 30;
  const cx = e.x, cy = e.y - R*0.6;
  if(!inView(e.x, e.y, 120)) return;
  if(kind==="shatter"){
    vfxBurst(cx, cy, big?22:14, "ice", 190, 520, 4, 1, -40, 0);
    vfxBurst(cx, cy, 6, "ice", 60, 700, 3, 0, -10, 1);
    addDecal(e.x, e.y+2, "#bfe8ff", "#7fb8d8", "chips", big?1.3:1);
    addDecal(e.x, e.y+4, GORE_MAT.ice.blood, GORE_MAT.ice.dark, "drip", big?1.2:0.9);
    playSfx("shatter"); return;
  }
  if(kind==="burn"){
    vfxBurst(cx, cy, big?14:9, "ember", 120, 520, 3, 1, -50, 0);
    vfxBurst(cx, cy-6, 5, "rock", 30, 1100, 4, 0, -35, 1); // humo
    addDecal(e.x, e.y+3, "#1e1410", "#0c0806", "pool", big?1.2:0.85);
    playSfx("burnDeath"); return;
  }
  if(kind==="shock"){
    vfxBurst(cx, cy, 10, "shock", 150, 300, 3, 1, -20, 1);
    vfxBurst(cx, cy-8, 4, "rock", 24, 900, 3.5, 0, -30, 1);
    if(mat.blood) addDecal(e.x, e.y+3, mat.blood, mat.dark, "drip", 0.9);
    addDecal(e.x, e.y+3, "#221c18", "#100c0a", "drip", 0.8);
    playSfx("zap"); return;
  }
  if(kind==="gib"){
    const pal = mat.blood ? _goreParticlePal(mat) : _goreChipPal(mat);
    goreChunks(cx, cy, dx, dy, big?10:7, pal, (!big && Math.random() < 0.35) ? (e.color || mat.chip || "#b0402c") : null, Math.max(6, R*0.42), e.x, e.y - R*1.3);
    if(mat.blood){ addDecal(e.x + dx*14, e.y + 4 + dy*6, mat.blood, mat.dark, "pool", big?1.5:1.15); addDecal(e.x + dx*34, e.y + 6 + dy*14, mat.blood, mat.dark, "drip", 1); }
    else addDecal(e.x, e.y+3, mat.chip, mat.dark, "chips", 1.2);
    playSfx("gib"); return;
  }
  // normal / sangrado
  if(mat.blood){ addDecal(e.x + dx*6, e.y + 4, mat.blood, mat.dark, "pool", kind==="bleed" ? (big?1.5:1.2) : (big?1.1:0.8)); if(Math.random()<0.5) playSfx("splat"); }
  else addDecal(e.x, e.y + 3, mat.chip, mat.dark, "chips", big?1.2:0.9);
}

// Trozos que salen volando en la dirección del golpe (pixeles grandes con gravedad) y, a veces, la
// cabeza (un bloque más grande del color del cuerpo). Función aparte para poder repetirla en los invitados.
function goreChunks(cx, cy, dx, dy, n, pal, headColor, headSize, hx, hy){
  for(let i=0;i<n;i++){
    if(vCount >= VFX_MAX*0.9) break;
    const j = vCount++, a = Math.atan2(dy, dx) + (Math.random()-0.5)*1.6, s = 140 + Math.random()*170;
    vX[j] = cx; vY[j] = cy; vVX[j] = Math.cos(a)*s; vVY[j] = Math.sin(a)*s*0.7 - 120 - Math.random()*80;
    vLife[j] = vMax[j] = 520 + Math.random()*260; vSize[j] = 3.5 + Math.random()*2.5; vGrav[j] = 420; vKind[j] = 0; vPrio[j] = 1;
    vCol[j] = (VFX_PAL[pal]||VFX_PAL.blood)[(Math.random()*2)|0];
  }
  if(headColor && vCount < VFX_MAX*0.9){
    const j = vCount++, a = Math.atan2(dy, dx) - 0.6;
    vX[j] = hx; vY[j] = hy; vVX[j] = Math.cos(a)*190; vVY[j] = -230; vLife[j] = vMax[j] = 800; vSize[j] = headSize; vGrav[j] = 520; vKind[j] = 0; vPrio[j] = 1;
    vCol[j] = headColor;
  }
}
