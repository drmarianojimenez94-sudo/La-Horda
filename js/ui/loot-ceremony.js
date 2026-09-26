"use strict";
/* ============================================================
   js/ui/loot-ceremony.js
   CEREMONIA DEL BOTÍN: el cofre del final de la partida.
     cae el cofre (su calidad depende de la calificación) -> tiembla (más cuanto más raro es lo
     mejor que trae) -> se abre con un haz del color de esa rareza -> los objetos aparecen de a uno,
     del menos al más raro. Común/Raro: rápido. Muy Raro: más presencia. Legendario: haz naranja,
     destello y sonido propio. Mítico: momento grande (temblor, rojo). Set: momento extraordinario
     (verde). Único: JACKPOT (pantalla oscura, violeta, letras grandes, fanfarria).
   La calificación mejora las probabilidades pero NO garantiza nada: el cofre de una S+ puede traer
   solo comunes, y uno de una C, con suerte extrema, algo extraordinario.
   El cofre se dibuja en pixel art procedural (sin arte pintado todavía: ver
   LA_HORDA_COMBAT_MISSING_ASSETS.md, "Cofres").
   ============================================================ */
const TIER_ORDER = {comun:0, raro:1, muyraro:2, legendario:3, mitico:4, set:5, unico:6};
const CEREMONY_TIER = {
  comun:     {hold:320,  sfx:"lootCommon",   label:"",                 beam:null},
  raro:      {hold:420,  sfx:"lootRare",     label:"",                 beam:"79,168,240"},
  muyraro:   {hold:700,  sfx:"lootVeryRare", label:"MUY RARO",         beam:"255,225,74"},
  legendario:{hold:1300, sfx:"lootLegend",   label:"¡LEGENDARIO!",     beam:"255,176,32", flash:0.35},
  mitico:    {hold:2000, sfx:"lootMythic",   label:"¡¡MÍTICO!!",       beam:"255,77,77",  flash:0.5, shake:true},
  set:       {hold:2100, sfx:"lootSet",      label:"✦ PIEZA DE SET ✦", beam:"61,220,113", flash:0.5},
  unico:     {hold:3400, sfx:"lootUnique",   label:"◆ ÚNICO ◆",        beam:"176,106,255", flash:0.8, shake:true, jackpot:true}
};
// Calidad del cofre según la calificación (solo presentación: no decide el botín).
const CHEST_BY_GRADE = {C:0, B:1, A:2, S:3, "S+":4};
const CHEST_NAMES = ["Cofre de madera", "Cofre reforzado", "Cofre de hierro", "Cofre dorado", "Cofre de la Horda"];
// Paletas del cofre (madera, herraje, borde claro, sombra, runa)
const CHEST_PAL = [
  {wood:"#6b4424", wood2:"#4e3019", band:"#6d6a64", edge:"#8a6a44", lock:"#9a8a6a", rune:null},
  {wood:"#6b4424", wood2:"#4e3019", band:"#8a8f96", edge:"#9a7a50", lock:"#b8b0a0", rune:null},
  {wood:"#3e2a1c", wood2:"#2a1c12", band:"#a9b3bd", edge:"#c9d1d8", lock:"#d8dde2", rune:null},
  {wood:"#4a1f16", wood2:"#321510", band:"#d8a632", edge:"#ffd76a", lock:"#ffe9a0", rune:"255,210,90"},
  {wood:"#1e1418", wood2:"#140c10", band:"#b83a2a", edge:"#ff7a4a", lock:"#ffb070", rune:"255,90,60"}
];
// Dibuja el cofre en píxeles enteros. openT 0..1 (tapa), glowRgb = color del haz.
function drawLootChest(cv, variant, openT, glowRgb, shakeX){
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height; g.clearRect(0,0,W,H);
  const P = CHEST_PAL[variant] || CHEST_PAL[0];
  const px = Math.max(3, Math.floor(W/34)); // tamaño del píxel del cofre
  const cw = 24*px, ch = 14*px, x0 = Math.round((W-cw)/2 + (shakeX||0)), y0 = Math.round(H - ch - px*3);
  const R = (x,y,w,h,c)=>{ g.fillStyle = c; g.fillRect(x0+x*px, y0+y*px, w*px, h*px); };
  // sombra
  g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(x0+px, y0+ch, cw-2*px, px*2);
  // haz de luz al abrirse
  if(glowRgb && openT > 0){
    const a = Math.min(1, openT*1.4);
    const grd = g.createLinearGradient(0, y0, 0, 0);
    grd.addColorStop(0, `rgba(${glowRgb},${0.75*a})`); grd.addColorStop(1, `rgba(${glowRgb},0)`);
    g.fillStyle = grd; g.fillRect(x0+4*px, 0, cw-8*px, y0+2*px);
    g.fillStyle = `rgba(${glowRgb},${0.35*a})`; g.fillRect(x0+2*px, y0-px, cw-4*px, px*2);
  }
  // cuerpo
  R(0,5,24,9,P.wood2); R(1,5,22,8,P.wood);
  for(let i=0;i<5;i++) R(1+i*5, 6, 1, 7, P.wood2); // tablones
  R(0,5,24,1,P.band); R(0,12,24,1,P.band); R(3,5,2,9,P.band); R(19,5,2,9,P.band);
  R(0,13,24,1,P.wood2);
  // cerradura
  R(10,6,4,4,P.band); R(11,7,2,2,P.lock); R(11,9,2,1,P.wood2);
  if(P.rune){ g.fillStyle = `rgba(${P.rune},${0.55+0.35*Math.sin(performance.now()/180)})`; g.fillRect(x0+7*px, y0+8*px, px, px); g.fillRect(x0+16*px, y0+8*px, px, px); }
  // tapa (sube al abrirse)
  const lift = Math.round(openT*6);
  const ly = 5 - 4 - lift;
  R(0,ly,24,4,P.wood2); R(1,ly,22,3,P.wood); R(0,ly,24,1,P.edge);
  R(3,ly,2,4,P.band); R(19,ly,2,4,P.band); R(0,ly+3,24,1,P.band);
  // interior: la luz del botín sale de adentro
  if(openT > 0.15){
    g.fillStyle = "#0b0706"; g.fillRect(x0+px, y0+(4-lift)*px, cw-2*px, (lift+1)*px);
    if(glowRgb){ g.fillStyle = `rgba(${glowRgb},${0.55+0.25*Math.sin(performance.now()/120)})`; g.fillRect(x0+2*px, y0+(5-lift)*px, cw-4*px, Math.max(1,lift)*px); }
  }
}
// Corre la ceremonia dentro de `host` (un div). items: objetos ya guardados. onDone(): al terminar.
let _ceremony = null;
function runLootCeremony(host, items, grade, onDone){
  const sorted = items.slice().sort((a,b)=> TIER_ORDER[itemTier(a)] - TIER_ORDER[itemTier(b)]);
  const best = sorted.length ? itemTier(sorted[sorted.length-1]) : "comun";
  const variant = CHEST_BY_GRADE[grade] !== undefined ? CHEST_BY_GRADE[grade] : 1;
  host.innerHTML = `<div class="chest-stage">
      <div class="chest-name">${CHEST_NAMES[variant]} · calificación ${grade||"—"}</div>
      <canvas class="chest-cv" width="204" height="150"></canvas>
      <div class="chest-banner"></div>
      <button class="btn chest-open-btn">Abrir</button>
    </div>
    <div class="loot-reveal chest-items"></div>
    <div class="chest-skip">tocá para adelantar</div>`;
  const cv = host.querySelector(".chest-cv"), banner = host.querySelector(".chest-banner"), list = host.querySelector(".chest-items");
  const btn = host.querySelector(".chest-open-btn");
  const C = _ceremony = {t:0, phase:"drop", openT:0, shake:0, host, done:false, speed:1};
  const tierBeam = (CEREMONY_TIER[best]||{}).beam;
  let raf = 0, last = performance.now();
  const frame = (now)=>{
    if(C.done || !host.isConnected){ cancelAnimationFrame(raf); return; }
    const dt = Math.min(50, now-last)*C.speed; last = now; C.t += dt;
    let sx = 0;
    if(C.phase==="drop"){ const k = Math.min(1, C.t/420); cv.style.transform = `translateY(${Math.round((1-k*k)*-120)}px)`; if(k>=1){ C.phase = "idle"; playSfx("chestDrop"); cv.style.transform = ""; } }
    else if(C.phase==="shake"){ const dur = 350 + TIER_ORDER[best]*230; const k = C.t/dur; sx = Math.round(Math.sin(C.t/28)*Math.min(6, 1+k*5)); if(Math.random()<0.12) playSfx("chestShake"); if(k>=1){ C.phase = "open"; C.t = 0; playSfx("chestOpen"); if(TIER_ORDER[best] >= 3) flashChest(host, tierBeam, 0.3); } }
    else if(C.phase==="open"){ C.openT = Math.min(1, C.t/380); if(C.openT>=1){ C.phase = "reveal"; C.t = 0; revealNext(0); } }
    drawLootChest(cv, variant, C.openT, C.phase==="open"||C.phase==="reveal" ? tierBeam : null, sx);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const startOpen = ()=>{ if(C.phase==="idle" || C.phase==="drop"){ C.phase = "shake"; C.t = 0; btn.style.display = "none"; } };
  btn.addEventListener("click", startOpen);
  setTimeout(()=>{ if(!C.done && C.phase==="idle") startOpen(); }, 1400); // se abre solo si nadie toca
  host.addEventListener("click", (ev)=>{ if(ev.target.closest("button")) return; if(C.phase==="reveal") C.speed = 3; else startOpen(); });
  function revealNext(i){
    if(C.done) return;
    if(i >= sorted.length){ finish(); return; }
    const it = sorted[i], tier = itemTier(it), T = CEREMONY_TIER[tier];
    if(T.jackpot) host.classList.add("jackpot");
    const wrap = document.createElement("div");
    wrap.innerHTML = lootCardHTML(it, victoryData ? victoryData.classKey : player.classKey, 0);
    const card = wrap.firstElementChild; card.style.animationDelay = "0s";
    list.appendChild(card);
    try{ card.scrollIntoView({block:"nearest", behavior:"smooth"}); }catch(e){}
    playSfx(T.sfx);
    if(T.label){ banner.textContent = T.label; banner.style.setProperty("--bc", `rgb(${T.beam})`); banner.classList.remove("show"); void banner.offsetWidth; banner.classList.add("show"); }
    if(T.flash) flashChest(host, T.beam, T.flash);
    if(T.shake) host.classList.add("chest-quake"), setTimeout(()=>host.classList.remove("chest-quake"), 600);
    if(C._bindCard) C._bindCard(card);
    setTimeout(()=>revealNext(i+1), T.hold / C.speed);
  }
  function finish(){ C.done = true; host.classList.add("chest-finished"); const sk = host.querySelector(".chest-skip"); if(sk) sk.remove(); if(onDone) onDone(); }
  return C;
}
function flashChest(host, rgb, a){
  const f = document.createElement("div"); f.className = "chest-flash"; f.style.background = `radial-gradient(circle, rgba(${rgb},${a}) 0%, rgba(${rgb},0) 70%)`;
  host.appendChild(f); setTimeout(()=>f.remove(), 900);
}
// Un objeto suelto (Mítico fabricado): la misma revelación en una capa sobre la pantalla actual.
function showLootCeremonyForItem(item){
  const ov = document.createElement("div"); ov.className = "loot-overlay";
  ov.innerHTML = `<div class="loot-overlay-box"><div class="loot-overlay-body"></div><button class="btn loot-overlay-close">Cerrar</button></div>`;
  document.body.appendChild(ov);
  const body = ov.querySelector(".loot-overlay-body");
  runLootCeremony(body, [item], "S+", null);
  ov.querySelector(".loot-overlay-close").addEventListener("click", ()=>{ if(_ceremony) _ceremony.done = true; ov.remove(); });
}
