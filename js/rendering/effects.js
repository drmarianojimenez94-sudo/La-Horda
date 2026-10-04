"use strict";
/* ============================================================
   js/rendering/effects.js
   Efectos simples del mundo: textos flotantes, rayos encadenados, chispas,
   pociones, sigilos en el piso y auras divinas.
   ============================================================ */

// Textos flotantes (daño, curación, avisos) dibujados en el canvas con un pool fijo. Antes
// cada número era un <div> nuevo en el DOM (con su propio temporizador): en las peleas grandes
// eso eran cientos de nodos por segundo y trabas en el teléfono. Ahora siguen a la cámara y
// no crean basura.
const FT_MAX = 70;
const FT_WORD_CAP = 3; // textos flotantes de palabras a la vez (los números van aparte, agrupados)
// Letra del texto dibujado en el canvas: la misma fuente pixel que el HUD (antes era Georgia en negrita).
// VT323 es un 20 % más chica que Georgia a igual tamaño: se agranda para que se lea igual (ver base.css).
function pxFont(size){ return `${(size*1.22).toFixed(1)}px 'VT323', monospace`; }
// Íconos chicos dibujados en el lienzo (acciones contextuales, marcas de la Ciudad y del Abismo). Antes eran
// emojis con fillText: el celular los pinta con SU fuente de emojis (a color, otro estilo en cada teléfono).
// Ahora: si el emoji tiene ícono pixel (js/ui/pixel-icons.js) se dibuja ese; una persona (🧍 🤝: civil,
// prisionero) es una silueta hecha con dos formas; el resto queda como texto en la letra pixel.
const _cvIcoCache = {};
const CV_PERSON = {"🧍":1, "🤝":1, "🧍‍♂️":1};
function drawCanvasIcon(c, icon, x, y, size, col){
  size = size || 16;
  const id = typeof PXI_EMOJI!=="undefined" ? PXI_EMOJI[String(icon).replace(/️/g, "")] : null;
  if(id && typeof _pxiCanvas==="function"){
    let cv = _cvIcoCache[id]; if(cv===undefined){ try{ cv = _pxiCanvas(id); }catch(e){ cv = null; } _cvIcoCache[id] = cv; }
    if(cv){ const s = Math.round(size), sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = false; c.drawImage(cv, Math.round(x - s/2), Math.round(y - s/2), s, s); c.imageSmoothingEnabled = sm; return; }
  }
  if(CV_PERSON[icon]){
    const u = size/16; c.save(); c.fillStyle = col || "#fff";
    c.beginPath(); c.arc(x, y - 4*u, 3.2*u, 0, Math.PI*2); c.fill();
    c.fillRect(Math.round(x - 3.5*u), Math.round(y - 0.5*u), Math.round(7*u), Math.round(7.5*u));
    c.restore(); return;
  }
  c.save(); if(col) c.fillStyle = col; c.font = pxFont(Math.round(size*0.8)); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(icon, x, y); c.restore();
}
const floatTexts = [];
for(let i=0;i<FT_MAX;i++) floatTexts.push({on:false, x:0, y:0, text:"", kind:0, t:0, dur:900, vx:0, val:0, dk:null, key:null, pop:0, sc:1});
let _ftNext = 0, _ftAvg = 40;
// Ocupación en coordenadas del mundo calculada con el tamaño real de pantalla.
// No cambia daño/acumulación: sólo evita dibujar etiquetas ilegibles una encima de otra.
const _ftRects = Array.from({length:FT_MAX},()=>({x:0,y:0,w:0,h:0}));
let _ftRectCount = 0;
const FT_DRAW_ORDER = [4,3,2,5,1,0,6]; // avisos, daño recibido, curación, escudo, críticos, daño común, DoT
const FT_PRIORITY = [0,1,3,4,5,3,0];
function _ftTake(kind){
  let best=null;
  for(let i=0;i<FT_MAX;i++){
    const index=(_ftNext+i)%FT_MAX, f=floatTexts[index];
    if(!f.on){ _ftNext=(index+1)%FT_MAX; return f; }
    if(FT_PRIORITY[f.kind]>FT_PRIORITY[kind]) continue;
    if(!best || FT_PRIORITY[f.kind]<FT_PRIORITY[best.kind] || (f.kind===best.kind && f.t/f.dur>best.t/best.dur)) best=f;
  }
  return best; // daño saliente nunca borra una advertencia/curación por saturación
}
function _ftPlace(x,y,w,h){
  const gap = 4/CAM_ZOOM;
  for(let row=0;row<3;row++){
    const top = y - row*(h+gap) - h/2, left = x-w/2;
    let overlaps = false;
    for(let i=0;i<_ftRectCount;i++){
      const r = _ftRects[i];
      if(left < r.x+r.w+gap && left+w+gap > r.x && top < r.y+r.h+gap && top+h+gap > r.y){ overlaps = true; break; }
    }
    if(!overlaps){
      const r = _ftRects[_ftRectCount++]; r.x=left;r.y=top;r.w=w;r.h=h;
      return top+h/2;
    }
  }
  return null; // conservar el valor en el pool; reaparece cuando haya espacio
}
// Colores por tipo de daño (los números de TUS golpes): se lee qué elemento está pegando sin mirar el ícono.
const FT_DMG_COL = {physical:"#fff1d6", fire:"#ff9a3c", ice:"#8fdcff", lightning:"#ffe84a", bleed:"#ff6a7e", poison:"#9be35a", arcane:"#c9a0ff", holy:"#ffe9a0"};
// Tope de números chicos a la vez (en el teléfono tapaban la acción): los críticos siempre entran.
const FT_NUM_CAP = (function(){ try{ return window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? 14 : 22; }catch(e){ return 22; } })();
// kind: 0 daño, 1 crítico, 2 curación, 3 daño recibido, 4 aviso/etiqueta, 5 escudo, 6 daño en el tiempo (DoT)
// Lenguaje visual (js/data/combat-language.js): cada tipo se distingue también SIN color: "!" crítico,
// "+" curación, "-" recibido, "◈" escudo, número chico y corto para DoT.
// dk (opcional): tipo de daño -> color. key (opcional): el enemigo golpeado -> golpes seguidos al mismo
// objetivo se AGRUPAN en un solo número que crece (sin key se agrupan por cercanía: invitados).
function floatText(x,y,text,cls,dk,key){
  let kind = 0;
  let s = String(text);
  if(cls==="shield" || cls==="dot") return _ftNumberAgg(x, y, +String(text).replace(/[^0-9.]/g,""), cls==="shield" ? 5 : 6, dk, key);
  if(cls==="crit") kind = /^[0-9]+$/.test(s) ? 1 : 4;
  else if(cls==="heal") kind = 2;
  else if(s.charAt(0)==="-") kind = 3;
  else if(!/^[0-9]+$/.test(s)) kind = 4;
  // palabra flotante con el cartel grande de arena/jefe arriba: si caería encima, se corre por debajo del cartel
  // (zonas del HUD, hud-text.js; tools/audit/center_text.js lo mide)
  if(kind===4 && typeof _hudTitleOn==="function" && _hudTitleOn(performance.now()) && typeof worldToScreen==="function"){
    const card = document.getElementById("arena-title-card"), r = card && card.getBoundingClientRect();
    if(r && r.height){ const sp = worldToScreen(x, y); if(sp.x > r.left - 60 && sp.x < r.right + 60 && sp.y > r.top - 24 && sp.y < r.bottom + 24) y += (r.bottom + 28 - sp.y)/(CAM_ZOOM||1); }
  }
  if(kind<=1){
    const n = +s;
    _ftAvg = _ftAvg*0.96 + n*0.04;
    dk = dk || null; key = (key && typeof key==="object") ? key : null;
    // agrupar: mismo objetivo (o muy cerca), mismo tipo, número todavía "fresco"
    let best = null, nNum = 0;
    for(let i=0;i<FT_MAX;i++){
      const f = floatTexts[i];
      if(!f.on || f.kind>1) continue;
      nNum++;
      if(best || f.t > 300 || f.dk !== dk) continue;
      if(key ? f.key===key : (Math.abs(f.x - x) < 30 && Math.abs(f.y - y) < 28)) best = f;
    }
    if(best){
      best.val += n; best.kind = Math.max(best.kind, kind);
      best.text = String(Math.round(best.val)) + (best.kind===1 ? "!" : "");
      best.t = Math.min(best.t, 80); best.pop = 1; best.dur = best.kind===1 ? 1000 : 760;
      best.sc = _ftScale(best.val, best.kind);
      return;
    }
    if(kind===0 && nNum >= FT_NUM_CAP && n < _ftAvg*1.5) return; // pantalla llena: el número chico no suma nada
    const f = _ftTake(kind); if(!f) return;
    f.on = true; f.kind = kind; f.t = 0; f.val = n; f.dk = dk; f.key = key; f.pop = kind===1 ? 1 : 0.5;
    f.text = s + (kind===1 ? "!" : ""); f.sc = _ftScale(n, kind);
    f.x = x + (Math.random()-0.5)*14; f.y = y;
    f.vx = (Math.random()-0.5)*20;
    // no taparle la cabeza al jugador: el número se abre hacia el costado contrario
    if(player && Math.abs(x - player.x) < 60 && Math.abs(y - (player.y - 40)) < 60){ const side = x >= player.x ? 1 : -1; f.x += side*14; f.vx = side*(22 + Math.random()*14); }
    // apilado: si ya hay un número fresco justo ahí (otro enemigo pegado), este sale un renglón más arriba
    for(let pass=0; pass<3; pass++){
      let hit = false;
      for(let i=0;i<FT_MAX;i++){ const o = floatTexts[i]; if(o!==f && o.on && o.kind<=1 && o.t < 260 && Math.abs(o.x - f.x) < 34 && Math.abs(o.y - f.y) < 13){ hit = true; break; } }
      if(!hit) break;
      f.y -= 15;
    }
    f.dur = kind===1 ? 1000 : 760;
    f.cls = cls;
    return;
  }
  // textos de palabras ("¡se desdobla!", "Inventario lleno"): el mismo repetido no se apila, y a lo sumo
  // FT_WORD_CAP a la vez (el más viejo deja su lugar). Jerarquía de textos: js/ui/hud-text.js
  let words = 0, oldest = null;
  for(let i=0;i<FT_MAX;i++){
    const o = floatTexts[i]; if(!o.on || o.kind!==4) continue;
    if(kind===4 && o.text===s && o.t < 600 && Math.abs(o.x - x) < 80){ o.t = 0; o.x = x; o.y = y; return; }
    words++; if(!oldest || o.t > oldest.t) oldest = o;
  }
  if(kind===4 && words >= FT_WORD_CAP && oldest){ oldest.on = false; oldest.key = null; }
  const f = _ftTake(kind); if(!f) return;
  f.on = true; f.x = x; f.y = y; f.text = s; f.kind = kind; f.t = 0; f.val = 0; f.dk = null; f.key = null; f.pop = 0; f.sc = 1;
  f.dur = kind===4 ? 1300 : 820;
  f.vx = 0;
  f.cls = cls;
}
// Escudo (5) y DoT (6): números agrupados por objetivo con ventana propia. El DoT se agrupa más
// tiempo y se dibuja más chico y con menor prioridad: informa sin tapar los golpes directos.
function _ftNumberAgg(x, y, n, kind, dk, key){
  if(!(n >= 1)) return;
  key = (key && typeof key==="object") ? key : null;
  const win = kind===6 ? 700 : 400;
  for(let i=0;i<FT_MAX;i++){
    const f = floatTexts[i];
    if(!f.on || f.kind!==kind || f.t > win || f.dk !== (dk||null)) continue;
    if(key ? f.key===key : (Math.abs(f.x - x) < 30 && Math.abs(f.y - y) < 28)){
      f.val += n; f.text = (kind===5 ? "◈" : "") + Math.round(f.val); f.t = Math.min(f.t, 120); f.pop = 0.6; return;
    }
  }
  if(kind===6){ let nNum = 0; for(let i=0;i<FT_MAX;i++){ const f = floatTexts[i]; if(f.on && (f.kind<=1 || f.kind===6)) nNum++; } if(nNum >= FT_NUM_CAP) return; }
  const f = _ftTake(kind); if(!f) return;
  f.on = true; f.kind = kind; f.t = 0; f.val = n; f.dk = dk||null; f.key = key; f.pop = 0.5; f.sc = 1;
  f.text = (kind===5 ? "◈" : "") + Math.round(n);
  f.x = x + (Math.random()-0.5)*10; f.y = y; f.vx = kind===6 ? (Math.random()-0.5)*10 : 0;
  f.dur = kind===6 ? 640 : 900; f.cls = kind===5 ? "shield" : "dot";
}
// tamaño según el peso del golpe respecto de lo que venís pegando (los golpes grandes se leen grandes)
function _ftScale(n, kind){
  const r = Math.log2(Math.max(0.25, n/Math.max(1, _ftAvg)));
  return Math.max(0.85, Math.min(kind===1 ? 1.6 : 1.4, 1 + 0.18*r));
}
const FT_STYLE = [
  {size:14, fill:"#fff1d6", stroke:"rgba(0,0,0,0.85)"},
  {size:21, fill:"#fff4c8", stroke:"rgba(150,14,0,0.95)"},
  {size:16, fill:"#6fdc8c", stroke:"rgba(0,40,10,0.9)"},
  {size:17, fill:"#ff5a4a", stroke:"rgba(40,0,0,0.95)"},
  {size:15, fill:"#ffe7a8", stroke:"rgba(0,0,0,0.9)"},
  {size:16, fill:"#8fd0ff", stroke:"rgba(0,20,50,0.95)"},
  {size:12, fill:"#c9b8a0", stroke:"rgba(0,0,0,0.8)"}
];
// Escudo ganado (cualquier fuente: habilidades, sets, objetos): "◈N" celeste sobre el héroe. Corre
// también en el invitado (net-game.js llama a updateFloatTexts), así cada uno lo ve sin red extra.
function _ftTrackShields(){
  if(typeof heroes==="undefined" || !heroes || !heroes.length) return;
  for(const h of heroes){
    if(!h) continue;
    const sh = (h.shield||0) + (h.itemShield||0);
    if(h._ftSh!==undefined && h.alive && sh > h._ftSh + 1 && inView(h.x, h.y, 80)){
      const quiet = typeof netQuiet==="function" ? netQuiet : (fn)=>fn();
      quiet(()=>floatText(h.x, h.y-74, Math.round(sh - h._ftSh), "shield", null, h));
    }
    h._ftSh = sh;
  }
}
// DoT (quemadura, sangrado, veneno, maldición): el motor lo resta cuadro a cuadro sin número.
// update.js acumula por enemigo y lo muestra cada ~0,65 s agrupado (chico, color del elemento).
function ftDotTick(e, amount, dk, dt){
  if(!(amount > 0)) return;
  e._dotAcc = (e._dotAcc||0) + amount; e._dotT = (e._dotT||0) + dt; e._dotK = dk;
  if(e._dotT < 650) return;
  const n = e._dotAcc; e._dotAcc = 0; e._dotT = 0;
  if(n >= 1 && inView(e.x, e.y, 60)){
    const quiet = typeof netQuiet==="function" ? netQuiet : (fn)=>fn();
    quiet(()=>floatText(e.x, e.y-16-(e.radius||20)*0.6, Math.round(n), "dot", e._dotK, e));
  }
}
function updateFloatTexts(dt){
  _ftTrackShields();
  for(const f of floatTexts){ if(!f.on) continue; f.t += dt; if(f.pop>0) f.pop = Math.max(0, f.pop - dt/160); if(f.t >= f.dur){ f.on = false; f.key = null; } }
}
function _drawFloatText(f){
  const q = f.t/f.dur, st = FT_STYLE[f.kind];
  // subida con desaceleración + "pop" al aparecer o al sumar otro golpe
  // el daño recibido CAE (se lee como pérdida); el resto sube; el DoT sube poco
  const rise = (f.kind===3 ? -22 : f.kind===6 ? 18 : f.kind===4 ? 30 : (f.kind===1 ? 40 : 34)) * (1-(1-q)*(1-q));
  const pop = f.kind===1 ? 1 + 0.6*f.pop*f.pop : 1 + 0.3*f.pop*f.pop;
  const a = q < 0.65 ? 1 : (1-q)/0.35;
  // tamaño en pasos de 1 px de pantalla: pocas cadenas de fuente distintas (el cambio de fuente es lo caro)
  const size = Math.max(8, Math.round(st.size*(f.sc||1)*pop))/CAM_ZOOM;
  ctx.globalAlpha = a;
  if(size !== _ftFontSize){ _ftFontSize = size; ctx.font = pxFont(size); }
  const x = f.x + f.vx*q;
  const y = _ftPlace(x, f.y - rise/CAM_ZOOM*0.9, ctx.measureText(f.text).width + 5/CAM_ZOOM, size*1.22 + 5/CAM_ZOOM);
  if(y===null) return;
  ctx.lineWidth = (f.kind===1 ? 4.5 : 3.5)/CAM_ZOOM; ctx.strokeStyle = st.stroke; ctx.strokeText(f.text, x, y);
  ctx.fillStyle = ((f.kind<=1 || f.kind===6) && f.dk && FT_DMG_COL[f.dk]) ? (f.kind===1 && f.dk==="physical" ? st.fill : FT_DMG_COL[f.dk]) : st.fill;
  ctx.fillText(f.text, x, y);
}
let _ftFontSize = 0;
function drawFloatTexts(){
  ctx.save(); _ftFontSize = 0; _ftRectCount = 0;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  // Reservar espacio a información vital antes del daño saliente; nunca tapar un aviso con AoE.
  for(const kind of FT_DRAW_ORDER) for(const f of floatTexts){
    if(f.on && f.kind===kind && inView(f.x, f.y, 120)) _drawFloatText(f);
  }
  ctx.restore();
}

// Cadena de Relámpagos y ráfagas eléctricas: efectos con sprites reales (paquete CadenaRelampagos).
// pushChainBolt: un segmento de rayo entre dos puntos (un salto de la cadena).
// pushSpark: una animación puntual del mismo atlas (impacto, carga, aura "electrificado").
function pushChainBolt(x1,y1,x2,y2,thickness,durationMs){
  chainFX.push({x1,y1,x2,y2,thickness,start:performance.now(),duration:durationMs||420});
}
function pushSpark(name,x,y,size,durationMs){
  sparkFX.push({name,x,y,size,start:performance.now(),duration:durationMs||400});
}
function drawChainFX(){
  const now = performance.now();
  for(let i=chainFX.length-1;i>=0;i--){
    const f = chainFX[i];
    const age = now-f.start;
    if(age>f.duration){ chainFX.splice(i,1); continue; }
    // Deterministic lightning backbone stays readable even if its atlas is still loading.
    const dx=f.x2-f.x1,dy=f.y2-f.y1,len=Math.hypot(dx,dy)||1;
    ctx.save();ctx.globalAlpha=Math.max(0,1-age/f.duration);
    ctx.beginPath();ctx.moveTo(f.x1,f.y1);
    for(let j=1;j<8;j++){
      const t=j/8,off=(j%2?1:-1)*Math.min(12,len*.1);
      ctx.lineTo(f.x1+dx*t-dy/len*off,f.y1+dy*t+dx/len*off);
    }
    ctx.lineTo(f.x2,f.y2);
    ctx.strokeStyle='#101b35';ctx.lineWidth=9;ctx.stroke();
    ctx.strokeStyle='#71cfff';ctx.lineWidth=5;ctx.stroke();
    ctx.strokeStyle='#fff5c0';ctx.lineWidth=2;ctx.stroke();ctx.restore();
    CadenaRelampagos.drawLink(ctx, age/1000, {x:f.x1,y:f.y1}, {x:f.x2,y:f.y2}, f.thickness);
  }
  for(let i=sparkFX.length-1;i>=0;i--){
    const f = sparkFX[i];
    const age = now-f.start;
    if(age>f.duration){ sparkFX.splice(i,1); continue; }
    CadenaRelampagos.draw(ctx, f.name, age/1000, f.x, f.y, f.size);
  }
  for(let i=asesinoFx.length-1;i>=0;i--){
    const f = asesinoFx[i];
    const age = now-f.start;
    if(age>f.duration){ asesinoFx.splice(i,1); continue; }
    drawAsesinoHab(f.skill, f.anim, age, f.x, f.y, f.size, f.flip);
  }
}
// Empuja un efecto de habilidad real del Asesino (sprite) para que se dibuje unos instantes
function pushAsesinoFx(skill, anim, x, y, size, durationMs, flip){
  asesinoFx.push({skill, anim, x, y, size, start:performance.now(), duration:durationMs, flip:!!flip});
}

function drawPotion(p){
  const bob = Math.sin(p.phase)*3;
  const x = Math.round(p.x), y = Math.round(p.y+bob);
  const isMana = p.type==="mana";
  const liquid = isMana ? "#3f8fe0" : "#e0343f";
  const liquidHi = isMana ? "#7ec8ff" : "#ff8090";
  const glow = isMana ? "70,150,255" : "255,70,90";
  ctx.save();
  // parpadea los últimos 3 s antes de desaparecer, y se ve apagada si al jugador no le sirve
  // (barra llena): así nunca parece una poción "trabada" en el piso
  let a = 1;
  if(p.life < 3000) a = (Math.floor(p.life/150)%2) ? 0.35 : 1;
  if(player && typeof potionUseful==="function" && !potionUseful(player, p)) a *= 0.55;
  ctx.globalAlpha = a;
  ctx.fillStyle = "#0e0608";
  ctx.fillRect(x-8, y-16, 16, 20);
  ctx.fillStyle = "#c9c2d6";
  ctx.fillRect(x-6, y-14, 12, 16);
  ctx.fillStyle = liquid;
  ctx.fillRect(x-4, y-8, 8, 9);
  ctx.fillStyle = liquidHi;
  ctx.fillRect(x-4, y-8, 3, 9);
  ctx.fillStyle = "#0e0608";
  ctx.fillRect(x-3, y-22, 6, 7);
  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(x-2, y-21, 4, 5);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y-8, 2, x, y-8, 34);
  g.addColorStop(0, `rgba(${glow},0.22)`);
  g.addColorStop(1, `rgba(${glow},0)`);
  ctx.fillStyle = g; ctx.fillRect(x-34, y-42, 68, 68);
  ctx.restore();
}

function heroFrame(h){
  const sp = SPRITES[h.classKey];
  if(!sp) return null;
  if(h.attackAnim>0) return sp.attack;
  if(h.hurtTimer>0 && sp.hurt) return sp.hurt;
  // mirando hacia arriba se ve la espalda del personaje
  const set = (h.fy < -0.45 && sp.back) ? sp.back : sp.walk;
  if(!h.moving) return set[0];
  return set[Math.floor(h.animT/130)%4];
}

// Sello mágico persistente en el piso mientras dura un buff propio o de equipo: crece en
// complejidad según el nivel de talento, como en las hojas de referencia (Escudenzima/Bufenzima/
// Ulti-zima): hexágono simple -> + anillo interior -> + triángulo -> + nodos brillantes.
function drawGroundSigil(h){
  if(!(h.sigilTimer>0)) return;
  const t = performance.now()/1000;
  const R = h.sigilRadius||46;
  const tier = h.sigilTier||1;
  const col = h.sigilColor||"#8fd0ff";
  const fadeIn = Math.min(1, (h.sigilMaxTimer-h.sigilTimer)/250);
  const fadeOut = h.sigilTimer < 400 ? h.sigilTimer/400 : 1;
  ctx.save();
  ctx.globalAlpha = (0.32 + 0.14*tier)*fadeIn*fadeOut; // más nivel = sello más presente
  ctx.translate(h.x, h.y+6);
  ctx.scale(1, 0.55);
  if(tier>=3){ ctx.save(); ctx.globalCompositeOperation = "lighter"; const gr = R*(1.1 + 0.1*tier); ctx.drawImage(glowSprite(hexToRgb(col)), -gr, -gr, gr*2, gr*2); ctx.restore(); }
  ctx.strokeStyle = col; ctx.lineWidth = 1.5 + 0.5*tier;
  ctx.save();
  ctx.rotate(t*0.6);
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=(i/6)*Math.PI*2, px=Math.cos(a)*R, py=Math.sin(a)*R;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath(); ctx.stroke();
  ctx.restore();
  if(tier>=2){
    ctx.save();
    ctx.rotate(-t*1.1);
    ctx.beginPath(); ctx.arc(0,0,R*0.65,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  if(tier>=3){
    ctx.save();
    ctx.rotate(t*0.35);
    ctx.beginPath();
    for(let i=0;i<3;i++){
      const a=(i/3)*Math.PI*2, px=Math.cos(a)*R*0.85, py=Math.sin(a)*R*0.85;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  if(tier>=4){
    ctx.save();
    ctx.rotate(t*0.6);
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2, px=Math.cos(a)*R, py=Math.sin(a)*R;
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// Fase 5 — Arena Divina: aura sagrada sobre los 4 enemigos "divinos". No toca su sprite (el
// mismo guardián, la misma silueta, tal como pide el diseño): solo agrega resplandor pulsante
// y un anillo de runas rotando bajo los pies, dibujado ANTES del sprite para que quede detrás.
function drawDivineAura(h){
  const now = performance.now()/1000;
  const pulse = 0.6+0.4*Math.sin(now*2.2 + h.x*0.01);
  // El aura crece con el nivel de la Arena Divina (y por lo tanto con el nivel de personaje
  // del equipo enemigo, 10 por nivel): en el nivel 10 (guardián nivel 100) debe notarse mucho
  // más grande e intensa que en el nivel 1. Tope en 2.5x para que no se descontrole.
  const lvlScale = Math.min(2.5, 1 + (divinaLevel-1)*0.17);
  const R = 58*lvlScale;
  ctx.save();
  ctx.translate(h.x, h.y-6);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(0,0,4,0,0,R);
  g.addColorStop(0, `rgba(255,230,150,${(0.32*pulse+0.14)*Math.min(1.6,lvlScale)})`);
  g.addColorStop(0.6, `rgba(255,200,100,${0.14*pulse*Math.min(1.6,lvlScale)})`);
  g.addColorStop(1, "rgba(255,200,100,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fill();
  // A partir de nivel 5 de Arena Divina, un segundo aro exterior más intenso -la escalada se
  // nota de un vistazo, no solo por el tamaño del resplandor principal.
  if(divinaLevel>=5){
    ctx.globalAlpha = 0.18+0.12*pulse;
    ctx.strokeStyle = "#ffcf5c"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0,0,R*0.72,0,Math.PI*2); ctx.stroke();
  }
  ctx.restore();
  // anillo de runas sagradas, rotando despacio bajo los pies (también crece con el nivel)
  ctx.save();
  ctx.translate(h.x, h.y+6);
  ctx.rotate(now*0.6);
  ctx.globalAlpha = 0.55+0.25*pulse;
  ctx.strokeStyle = "#ffe8a0"; ctx.lineWidth = 1.4*Math.min(1.8,lvlScale);
  ctx.beginPath(); ctx.ellipse(0,0,24*lvlScale,10*lvlScale,0,0,Math.PI*2); ctx.stroke();
  const nRunes = divinaLevel>=6 ? 9 : 6; // más runas en niveles altos
  for(let i=0;i<nRunes;i++){
    const a = (i/nRunes)*Math.PI*2;
    const rx = Math.cos(a)*24*lvlScale, ry = Math.sin(a)*10*lvlScale;
    ctx.save();
    ctx.translate(rx,ry); ctx.rotate(a+Math.PI/2);
    ctx.fillStyle = "#ffe8a0";
    ctx.fillRect(-1,-4*Math.min(1.6,lvlScale),2,8*Math.min(1.6,lvlScale)); // trazo simple tipo runa, nítido, sin blur
    ctx.restore();
  }
  ctx.restore();
}
