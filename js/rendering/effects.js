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
const floatTexts = [];
for(let i=0;i<FT_MAX;i++) floatTexts.push({on:false, x:0, y:0, text:"", kind:0, t:0, dur:900, vx:0});
let _ftNext = 0;
// kind: 0 daño, 1 crítico, 2 curación, 3 daño recibido, 4 aviso/etiqueta
function floatText(x,y,text,cls){
  let kind = 0;
  const s = String(text);
  if(cls==="crit") kind = /^[0-9]+$/.test(s) ? 1 : 4;
  else if(cls==="heal") kind = 2;
  else if(s.charAt(0)==="-") kind = 3;
  else if(!/^[0-9]+$/.test(s)) kind = 4;
  const f = floatTexts[_ftNext]; _ftNext = (_ftNext+1)%FT_MAX;
  f.on = true; f.x = x + (kind<=1 ? (Math.random()-0.5)*18 : 0); f.y = y; f.text = s; f.kind = kind; f.t = 0;
  f.dur = kind===4 ? 1300 : (kind===1 ? 1000 : 820);
  f.vx = kind<=1 ? (Math.random()-0.5)*20 : 0;
  f.cls = cls;
}
const FT_STYLE = [
  {size:15, fill:"#ffcf5c", stroke:"rgba(0,0,0,0.85)"},
  {size:22, fill:"#ffffff", stroke:"rgba(160,20,0,0.95)"},
  {size:16, fill:"#6fdc8c", stroke:"rgba(0,40,10,0.9)"},
  {size:17, fill:"#ff5a4a", stroke:"rgba(40,0,0,0.95)"},
  {size:15, fill:"#ffe7a8", stroke:"rgba(0,0,0,0.9)"}
];
function updateFloatTexts(dt){
  for(const f of floatTexts){ if(!f.on) continue; f.t += dt; if(f.t >= f.dur) f.on = false; }
}
function drawFloatTexts(){
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  for(const f of floatTexts){
    if(!f.on || !inView(f.x, f.y, 120)) continue;
    const q = f.t/f.dur, st = FT_STYLE[f.kind];
    // subida con desaceleración + "pop" inicial de los críticos
    const rise = (f.kind===4 ? 30 : 46) * (1-(1-q)*(1-q));
    const pop = f.kind===1 ? 1 + 0.5*Math.max(0, 1-q*6) : 1;
    const a = q < 0.7 ? 1 : (1-q)/0.3;
    const size = st.size*pop/CAM_ZOOM;
    ctx.globalAlpha = a;
    ctx.font = `bold ${size.toFixed(1)}px Georgia, serif`;
    const x = f.x + f.vx*q, y = f.y - rise/CAM_ZOOM*0.9;
    ctx.lineWidth = 3.5/CAM_ZOOM; ctx.strokeStyle = st.stroke; ctx.strokeText(f.text, x, y);
    ctx.fillStyle = st.fill; ctx.fillText(f.text, x, y);
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
  ctx.globalAlpha = 0.4*fadeIn*fadeOut;
  ctx.translate(h.x, h.y+6);
  ctx.scale(1, 0.55);
  ctx.strokeStyle = col; ctx.lineWidth = 2;
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
// mismo campeón, la misma silueta, tal como pide el diseño): solo agrega resplandor pulsante
// y un anillo de runas rotando bajo los pies, dibujado ANTES del sprite para que quede detrás.
function drawDivineAura(h){
  const now = performance.now()/1000;
  const pulse = 0.6+0.4*Math.sin(now*2.2 + h.x*0.01);
  // El aura crece con el nivel de la Arena Divina (y por lo tanto con el nivel de personaje
  // del equipo enemigo, 10 por nivel): en el nivel 10 (campeón nivel 100) debe notarse mucho
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
