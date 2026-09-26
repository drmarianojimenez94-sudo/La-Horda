"use strict";
/* ============================================================
   js/ui/run-intro.js
   PANTALLA PREVIA A LA PARTIDA — el Hechicero Supremo, todavía "angelical".
   Antes de cada partida (modo solo) aparece el guía: tapado, dorado, con alas de luz (dibujadas
   en vivo, estilo "alas de luz" de los ángeles de Diablo) y una FICHA CLARA de la arena:
   qué es, qué te mata, qué te ayuda y cuál es el objetivo. Sin acertijos: frases cortas que se
   entienden a la primera. Se toca en cualquier lado (o el botón) para empezar.
   En cooperativo online no se muestra (bloquearía a los demás): ahí el Hechicero habla en
   el panel del tutorial, como siempre.
   Ojo de la historia: acá parece un ángel. En la Arena Infernal se revela (inf-hechicero.js).
   ============================================================ */
const ARENA_BRIEF = {
  bosque: {
    say:"Esta es la entrada. Acá aprendés a pelear: la horda es débil, pero se cura sola si la dejás.",
    kill:"Enemigos que se regeneran, emboscadas en la maleza que se sacude y el Jinete Sin Cabeza, que revive una vez.",
    help:"Las RUNAS de piedra: mantené ✚ junto a una que brille y las raíces atrapan a la horda.",
    goal:"Sobreviví 10 niveles y derrotá al Jinete Sin Cabeza (dos veces)."},
  acuatica: {
    say:"Ruinas bajo el agua. El agua te mueve: aprovechala o te va a cansar.",
    kill:"Charcos que brillan antes de dar una descarga, el Kraken Joven (nivel 6) y el Leviatán que ataca desde el borde.",
    help:"Las CORRIENTES: seguilas para moverte rápido o para arrastrar a la horda lejos de vos.",
    goal:"Llegá al nivel 10 y vencé al Leviatán en sus 3 fases."},
  fortaleza: {
    say:"Una fortaleza viva. Todo lo que te mata avisa en el piso antes de golpear.",
    kill:"Trampas (vapor, rejillas al rojo, prensas y cadenas), puentes que se mueven y el Caballero Oxidado.",
    help:"Mirá el piso: las marcas avisan. Al Caballero NO le pegues cuando brilla azul (contraataca).",
    goal:"Cruzá los sectores y derrotá al Caballero de la Armadura Oxidada."},
  micelial: {
    say:"Una caverna que está viva y crece. Si la dejás, la infección se come el mapa.",
    kill:"Esporas, zonas infectadas que te debilitan, el Micelio Primigenio y la Madre Espora en el centro.",
    help:"Rompé los NÚCLEOS MICELIALES: cada uno que cae limpia la infección de su zona.",
    goal:"Frená la colonia y derrotá a la Madre Espora."},
  hielo: {
    say:"Acá el frío es el enemigo. Quedarte quieto te congela.",
    kill:"El frío que se acumula si no te movés, las novas de hielo y el Mago de Hielo, que se vuelve Ángel Caído.",
    help:"Los BRASEROS: mantené 🔥 junto a uno (o prendelo con fuego) y el frío baja. Seguí moviéndote.",
    goal:"Derrotá al Mago de Hielo y a su forma de Ángel Caído."},
  laberinto: {
    say:"Muros, sismos y poco maná. Acá gana el que piensa antes de correr.",
    kill:"Quedarte encerrado entre muros, los sismos, el Guardián (nivel 6) y el Minotauro.",
    help:"Los SELLOS del piso, en orden I → II → III: aturden a la horda y te curan. Hacé chocar al Minotauro contra un muro.",
    goal:"Activá los sellos y derrotá al Minotauro."},
  infernal: {
    say:"La última arena. Tus habilidades pegan menos acá: jugá con cuidado… y confiá en mí.",
    kill:"Las FISURAS de donde sale la horda, el fuego del piso y lo que te espera en el nivel 9.",
    help:"Cerrá las fisuras: mantené ✖ junto a una (quema un poco, pero corta la horda).",
    goal:"Llegá al corazón del Infierno. Ahí te voy a estar esperando."}
};
const RUN_INTRO = { open:false, raf:0, t0:0, onGo:null };

function runIntroShow(arena, onGo){
  const el = document.getElementById("run-intro"); const B = ARENA_BRIEF[arena];
  if(!el || !B){ onGo(); return; }
  const M = ARENA_MODS[arena] || {};
  el.querySelector(".ri-arena").textContent = (M.icon ? M.icon + " " : "") + (M.label || arena).toUpperCase();
  el.querySelector(".ri-say").textContent = "«" + B.say + "»";
  el.querySelector(".ri-kill").textContent = B.kill;
  el.querySelector(".ri-help").textContent = B.help;
  el.querySelector(".ri-goal").textContent = B.goal;
  const cr = el.querySelector(".ri-crystals");
  if(cr){ const show = typeof crystalRowHtml==="function" && (crystalsOwned().length > 0 || CRYSTAL_BY_ARENA[arena] || arena==="infernal"); cr.innerHTML = show ? crystalRowHtml() : ""; cr.style.display = show ? "" : "none"; }
  el.classList.remove("hidden");
  RUN_INTRO.open = true; RUN_INTRO.onGo = onGo; RUN_INTRO.t0 = performance.now();
  cancelAnimationFrame(RUN_INTRO.raf);
  const cv = el.querySelector("canvas");
  const draw = ()=>{ if(!RUN_INTRO.open) return; runIntroDraw(cv, (performance.now()-RUN_INTRO.t0)/1000); RUN_INTRO.raf = requestAnimationFrame(draw); };
  draw();
  if(typeof playSfx==="function") playSfx("ready");
}
function runIntroGo(){
  if(!RUN_INTRO.open) return;
  if(performance.now() - RUN_INTRO.t0 < 450) return; // un toque apurado del botón "Comenzar" no la saltea
  RUN_INTRO.open = false; cancelAnimationFrame(RUN_INTRO.raf);
  document.getElementById("run-intro").classList.add("hidden");
  const fn = RUN_INTRO.onGo; RUN_INTRO.onGo = null; if(fn) fn();
}
// Alas de luz (estilo ángel de Diablo): cintas de luz que nacen en la espalda, suben un poco y
// caen hacia afuera; cada cinta se afina hacia la punta (relleno, no trazo) y flamea despacio.
function _bz(p0, p1, p2, p3, u){ const v = 1-u; return v*v*v*p0 + 3*v*v*u*p1 + 3*v*u*u*p2 + u*u*u*p3; }
function _riWing(c, cx, cy, side, t, s){
  c.save(); c.globalCompositeOperation = "lighter";
  const N = 9, SEG = 22;
  for(let i=0;i<N;i++){
    const k = i/(N-1);
    const fl = Math.sin(t*1.4 + i*0.8), fl2 = Math.sin(t*0.9 + i*0.5);
    const P = [[cx + side*6*s, cy],
               [cx + side*(55 + k*25)*s, cy - (95 - k*55)*s + fl2*5*s],
               [cx + side*(140 + k*35)*s + side*fl*6*s, cy - (60 - k*110)*s],
               [cx + side*(170 + k*20)*s + side*fl*12*s, cy + (25 + k*120)*s]];
    const wid = (13 - k*5)*s;
    const L = [], R = [];
    for(let j=0;j<=SEG;j++){
      const u = j/SEG;
      const x = _bz(P[0][0],P[1][0],P[2][0],P[3][0],u), y = _bz(P[0][1],P[1][1],P[2][1],P[3][1],u);
      const u2 = Math.min(1, u+0.02), x2 = _bz(P[0][0],P[1][0],P[2][0],P[3][0],u2), y2 = _bz(P[0][1],P[1][1],P[2][1],P[3][1],u2);
      let nx = -(y2-y), ny = (x2-x); const nl = Math.hypot(nx, ny)||1; nx/=nl; ny/=nl;
      const w = wid*Math.sin(Math.PI*Math.min(1, u*1.15 + 0.04))*(1 - u*0.55) + 0.6*s;
      L.push([x + nx*w, y + ny*w]); R.push([x - nx*w, y - ny*w]);
    }
    const g = c.createLinearGradient(P[0][0], P[0][1], P[3][0], P[3][1]);
    g.addColorStop(0, "rgba(255,252,236,0.9)"); g.addColorStop(0.4, "rgba(255,228,160,0.55)"); g.addColorStop(1, "rgba(255,180,90,0)");
    c.fillStyle = g; c.globalAlpha = 0.85 - k*0.25;
    c.beginPath(); c.moveTo(L[0][0], L[0][1]);
    for(const p of L) c.lineTo(p[0], p[1]);
    for(let j=R.length-1;j>=0;j--) c.lineTo(R[j][0], R[j][1]);
    c.closePath(); c.fill();
    // núcleo brillante de cada pluma
    c.strokeStyle = "rgba(255,255,245,0.8)"; c.lineWidth = 1.2*s; c.globalAlpha = 0.7 - k*0.3;
    c.beginPath(); c.moveTo(P[0][0], P[0][1]); c.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]); c.stroke();
  }
  c.restore();
}
function runIntroDraw(cv, t){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if(cv.width !== Math.round(W*dpr) || cv.height !== Math.round(H*dpr)){ cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const scale = Math.min(W/360, H/330);
  const cx = W/2, cy = H*0.5;
  // resplandor de fondo
  const rg = c.createRadialGradient(cx, cy, 10, cx, cy, Math.min(W, H)*0.5);
  rg.addColorStop(0, "rgba(255,226,150,0.35)"); rg.addColorStop(0.4, "rgba(170,110,60,0.12)"); rg.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  // rayos de luz detrás
  c.save(); c.globalCompositeOperation = "lighter"; c.translate(cx, cy - 40*scale);
  for(let i=0;i<14;i++){
    const a = i/14*Math.PI*2 + t*0.08;
    c.rotate(Math.PI*2/14); c.globalAlpha = 0.05 + 0.04*Math.sin(t*1.7 + i);
    c.fillStyle = "#ffe7a8"; c.beginPath(); c.moveTo(0, 0); c.lineTo(-9*scale, -150*scale); c.lineTo(9*scale, -150*scale); c.closePath(); c.fill();
  }
  c.restore();
  // alas (detrás del cuerpo)
  const shY = cy - 62*scale;
  _riWing(c, cx - 6*scale, shY, -1, t, scale);
  _riWing(c, cx + 6*scale, shY, 1, t, scale);
  // el Hechicero (retrato real de su hoja), aclarado para que se vea "santo"
  const img = HECH_PORTRAIT;
  if(img && img.complete && img.naturalWidth){
    const h = 250*scale, w = img.naturalWidth/img.naturalHeight*h;
    const bob = Math.sin(t*1.6)*4*scale;
    c.save(); c.imageSmoothingEnabled = false;
    c.filter = "brightness(1.28) saturate(0.7) contrast(1.08)";
    c.drawImage(img, cx - w/2, cy - h*0.62 + bob, w, h);
    c.filter = "none";
    // halo: brillo aditivo encima
    c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.35 + 0.15*Math.sin(t*2.2);
    const hg = c.createRadialGradient(cx, cy - h*0.47 + bob, 2, cx, cy - h*0.47 + bob, 60*scale);
    hg.addColorStop(0, "rgba(255,240,190,0.9)"); hg.addColorStop(1, "rgba(255,200,100,0)");
    c.fillStyle = hg; c.fillRect(cx - 70*scale, cy - h*0.47 + bob - 70*scale, 140*scale, 140*scale);
    c.restore();
  }
  // motas de luz que suben
  c.save(); c.globalCompositeOperation = "lighter";
  for(let i=0;i<26;i++){
    const ph = (t*0.18 + i*0.137) % 1, x = cx + Math.sin(i*12.9)*150*scale + Math.sin(t + i)*6, y = cy + 120*scale - ph*260*scale;
    c.globalAlpha = Math.sin(ph*Math.PI)*0.8; c.fillStyle = "#fff0c0"; c.fillRect(x, y, 2*scale, 2*scale);
  }
  c.restore();
}
(()=>{
  const el = document.getElementById("run-intro"); if(!el) return;
  el.addEventListener("click", runIntroGo);
  document.addEventListener("keydown", (e)=>{ if(RUN_INTRO.open && (e.key==="Enter" || e.key===" ")) runIntroGo(); });
})();
