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
  ciudad: {
    say:"Esta es tu ciudad, guardián, y la Horda volvió. No podés salvarlos a todos, pero vas a intentarlo. Cuando esto termine, te voy a mostrar el camino.",
    kill:"La horda que derriba las ESTRUCTURAS: si caen todas las críticas, la ciudad cae y perdés. En el nivel 9, los subjefes; en el 10, El Presentador.",
    help:"Los CIVILES escondidos: acercate y MANTENÉ RESCATAR, y llevalos a un refugio (escudo verde). Cada rescate da oro y XP.",
    goal:"Sobreviví 10 niveles, protegé la ciudad y derrotá a El Presentador."},
  fortaleza: {
    say:"La Ciudad Maldita resistió, pero la Horda dejó una CICATRIZ. Seguila: empieza en esta fábrica que no para nunca. Los que la construyeron desaparecieron; sus máquinas todavía no se enteraron.",
    kill:"Trampas (vapor, rejillas al rojo, prensas y cadenas), puentes que se mueven, el Dragón de la Forja y el Caballero Oxidado.",
    help:"Mirá el piso: las marcas avisan. Al Caballero NO le pegues cuando brilla azul (contraataca).",
    goal:"Cruzá la Fábrica Sin Fin y derrotá al Caballero de la Armadura Oxidada."},
  bosque: {
    say:"Acá duerme el PRIMERO de los Cuatro Guardianes, y lo que duerme ya no es él. Liberalo y traé su cristal. Yo sé cómo cuidarlo.",
    kill:"Enemigos que se regeneran, emboscadas en la maleza que se sacude y el Guardián Ancestral, que se corrompe en la Bestia del Bosque.",
    help:"Las RUNAS de piedra: mantené ✚ junto a una que brille y las raíces atrapan a la horda.",
    goal:"Sobreviví 10 niveles, vencé al Guardián Ancestral y recuperá el PRIMER CRISTAL."},
  micelial: {
    say:"Una caverna viva, que crece y repite voces que escuchó hace siglos. Si la dejás, la infección se come el mapa. No escuches a las esporas: mienten con voces conocidas.",
    kill:"Esporas, zonas infectadas que te debilitan, el Micelio Primigenio y la Madre Espora en el centro.",
    help:"Rompé los NÚCLEOS MICELIALES: cada uno que cae limpia la infección de su zona.",
    goal:"Frená la colonia y derrotá a la Madre Espora."},
  hielo: {
    say:"Acá espera el SEGUNDO Guardián. Resistió solo más que nadie, esperando a alguien que no volvió. No le debas nada: tomá el cristal.",
    kill:"El frío que se acumula si no te movés, las novas de hielo y el Mago Gélido, que se corrompe en su forma demoníaca.",
    help:"Los BRASEROS: mantené 🔥 junto a uno (o prendelo con fuego) y el frío baja. Seguí moviéndote.",
    goal:"Derrotá al Mago Gélido en sus dos formas y recuperá el SEGUNDO CRISTAL."},
  acuatica: {
    say:"Este mar no estaba acá antes de que tomaras el segundo cristal. Es el precio: la realidad se dobla alrededor de ellos. Protegelos. Son lo único que importa.",
    kill:"Charcos que brillan antes de dar una descarga, el Kraken Joven (nivel 6) y el Leviatán que ataca desde el borde.",
    help:"Las CORRIENTES: seguilas para moverte rápido o para arrastrar a la horda lejos de vos.",
    goal:"Llegá al nivel 10 y vencé al Leviatán en sus 3 fases."},
  laberinto: {
    say:"El TERCER Guardián levantó estos muros para esconderse de la Horda… y de otros. Si te habla, no le creas: la piedra le comió el juicio. Traeme… traé el tercer cristal.",
    kill:"Quedarte encerrado entre muros, los sismos, el Guardián del Laberinto (nivel 6) y el Minotauro.",
    help:"Los SELLOS del piso, en orden I → II → III: aturden a la horda y te curan. Hacé chocar al Minotauro contra un muro.",
    goal:"Activá los sellos, derrotá al Minotauro y recuperá el TERCER CRISTAL."},
  abismo: {
    say:"Tres cristales, y el mundo ya no los aguanta: se abre debajo tuyo. Es el punto de no retorno. Tuviste dudas, es natural. Seguí igual.",
    kill:"El borde (si caés, quedás colgado: un compañero te sube), el Jinete que carga en línea, el Carcelero y sus cadenas y lo que vive debajo.",
    help:"Mirá las GRIETAS: una plataforma crítica tiembla y larga piedras antes de caer. Empujá a la horda al vacío y usá al Jinete como arma.",
    goal:"Sobreviví a las ruinas, vencé al Carcelero del Vacío y enfrentá a El Que Mora Debajo."},
  minas: {
    say:"Debajo del Abismo hay minas, y debajo de las minas, una puerta. Acá la LUZ ES TERRITORIO. Otros bajaron antes que vos: no leas lo que dejaron escrito.",
    kill:"La oscuridad (recibís más daño y te emboscan), el Devoraluz que apaga las lámparas, el Titán de Piedra (nivel 8) y Cerbero.",
    help:"Si una luz se apaga, acercate y MANTENÉ ENCENDER. Cerbero se expone a la luz y se enfurece en la oscuridad.",
    goal:"Derrotá a Cerbero y ATRAVESÁ el Portal Infernal que se abre: recién ahí termina la arena."},
  infernal: {
    say:"La dimensión de la Horda. Tus habilidades pegan menos acá: jugá con cuidado. Alguien está encadenado en el fondo; no le hagas caso. Y traeme los cristales.",
    kill:"Las FISURAS de donde sale la horda, el fuego del piso y lo que te espera en el nivel 9.",
    help:"Cerrá las fisuras: mantené ✖ junto a una (quema un poco, pero corta la horda). Alguien está encadenado en el fondo.",
    goal:"Llegá al corazón del Infierno. Ahí te voy a estar esperando."}
};
const RUN_INTRO = { open:false, raf:0, t0:0, onGo:null, prologue:false, pages:[], arena:null };

function runIntroShow(arena, onGo){
  const el = document.getElementById("run-intro"); const B = ARENA_BRIEF[arena];
  if(!el || !B){
    // sin ficha: igual se espera a que termine de bajar el arte de las arenas (preload.js)
    if(typeof assetsAllReady==="function" && !assetsAllReady()){ if(typeof showNetToast==="function") showNetToast("Preparando la arena…"); whenAssetsReady(onGo); }
    else onGo();
    return;
  }
  // Pantallas de historia antes de la ficha (con la partida todavía sin empezar, en vez de taparte la
  // pantalla en pleno combate): el PRÓLOGO la primera vez en la primera arena, y el cartel de cada ACTO
  // la primera vez que entrás a la arena que lo abre (STORY_ACTS, js/data/story-text.js).
  const pages = [];
  if(typeof save!=="undefined" && !save.storyPrologueSeen && typeof ARENA_ORDER!=="undefined" && arena===ARENA_ORDER[0] && typeof CAMPAIGN_PROLOGUE==="string"){
    save.storyPrologueSeen = true;
    pages.push(...(typeof CAMPAIGN_PROLOGUE_PAGES!=="undefined" ? CAMPAIGN_PROLOGUE_PAGES : [{who:"PRÓLOGO", title:"LA NOCHE EN QUE VOLVIÓ LA HORDA", text:CAMPAIGN_PROLOGUE}]));
  }
  const act = typeof storyActOf==="function" ? storyActOf(arena) : null;
  if(act && act.arenas[0]===arena && typeof save!=="undefined" && !(save.storyActsSeen && save.storyActsSeen[act.n])){
    save.storyActsSeen = save.storyActsSeen || {}; save.storyActsSeen[act.n] = 1;
    pages.push({who:"ACTO " + act.n, title:act.name, text:act.intro});
  }
  if(pages.length && typeof persist==="function") persist();
  RUN_INTRO.pages = pages; RUN_INTRO.prologue = pages.length > 0;
  runIntroFill(el, arena, B);
  el.classList.remove("hidden");
  RUN_INTRO.open = true; RUN_INTRO.onGo = onGo; RUN_INTRO.t0 = performance.now(); RUN_INTRO.arena = arena;
  cancelAnimationFrame(RUN_INTRO.raf);
  const cv = el.querySelector("canvas");
  const draw = ()=>{ if(!RUN_INTRO.open) return; runIntroDraw(cv, (performance.now()-RUN_INTRO.t0)/1000); RUN_INTRO.raf = requestAnimationFrame(draw); };
  draw();
  if(typeof playSfx==="function") playSfx("ready");
}
function runIntroFill(el, arena, B){
  const M = ARENA_MODS[arena] || {};
  const pro = !!RUN_INTRO.prologue;
  el.classList.toggle("ri-prologue", pro);
  const go = el.querySelector(".ri-go");
  go.textContent = pro ? "SEGUIR ▸" : "¡A LA BATALLA!"; go.disabled = false;
  // todavía baja el arte de las arenas: el botón lo dice y se habilita solo al terminar
  if(!pro && typeof assetsAllReady==="function" && !assetsAllReady()){
    go.disabled = true; go.textContent = "Preparando la arena… " + assetsRestPct() + "%";
    whenAssetsReady(()=>{ if(!RUN_INTRO.prologue){ go.disabled = false; go.textContent = "¡A LA BATALLA!"; } },
      pct=>{ if(!RUN_INTRO.prologue && go.disabled) go.textContent = "Preparando la arena… " + pct + "%"; });
  }
  const tap = el.querySelector(".ri-tap"); if(tap) tap.textContent = pro ? "tocá para seguir" : "tocá en cualquier lado para empezar";
  // "Saltar ▸▸" (arriba a la izquierda, sobre el arte): con la historia en pantalla, un toque lleva directo a la
  // ficha de la arena (primer arranque corto)
  let skip = el.querySelector(".ri-skip");
  if(!skip){
    skip = document.createElement("button"); skip.type = "button"; skip.className = "btn secondary small ri-skip"; skip.textContent = "Saltar ▸▸";
    skip.setAttribute("aria-label", "Saltar la historia");
    skip.addEventListener("click", ev=>{
      ev.stopPropagation(); if(!RUN_INTRO.open || !RUN_INTRO.prologue) return;
      RUN_INTRO.pages = []; RUN_INTRO.prologue = false; RUN_INTRO.t0 = performance.now();
      runIntroFill(el, RUN_INTRO.arena, ARENA_BRIEF[RUN_INTRO.arena]);
    });
    el.appendChild(skip);
  }
  skip.classList.toggle("hidden", !pro);
  const who = el.querySelector(".ri-who"), hero = runIntroHeroEl(el), actEl = el.querySelector(".ri-act");
  if(pro){
    const P = RUN_INTRO.pages[0];
    if(who) who.textContent = P.who;
    el.querySelector(".ri-arena").textContent = P.title;
    el.querySelector(".ri-say").textContent = P.text;
    hero.textContent = ""; hero.style.display = "none"; if(actEl) actEl.textContent = "";
    return;
  }
  if(who) who.textContent = "EL HECHICERO SUPREMO";
  // en qué acto de la historia estás, y lo que dice tu guardián al entrar (HERO_VOICES, story-text.js)
  const act = typeof storyActOf==="function" ? storyActOf(arena) : null;
  if(actEl) actEl.textContent = act ? "ACTO " + act.n + " · " + act.name : "";
  const HV = typeof HERO_VOICES!=="undefined" && typeof selectedClass!=="undefined" ? HERO_VOICES[selectedClass] : null;
  const cls = typeof CLASSES!=="undefined" && typeof selectedClass!=="undefined" ? CLASSES[selectedClass] : null;
  if(HV && HV.pick && cls){ hero.innerHTML = ""; const b = document.createElement("b"); b.textContent = cls.name; b.style.color = cls.color || ""; hero.appendChild(b); hero.appendChild(document.createTextNode(" «" + HV.pick + "»")); hero.style.display = ""; }
  else { hero.textContent = ""; hero.style.display = "none"; }
  el.querySelector(".ri-arena").textContent = (M.icon ? M.icon + " " : "") + (typeof campaignNumberLabel==="function" && campaignNumberLabel(arena) ? campaignNumberLabel(arena) + " — " : "") + (M.label || arena).toUpperCase();
  el.querySelector(".ri-say").textContent = "«" + B.say + "»";
  el.querySelector(".ri-kill").textContent = B.kill;
  el.querySelector(".ri-help").textContent = B.help;
  el.querySelector(".ri-goal").textContent = B.goal;
  const cr = el.querySelector(".ri-crystals");
  if(cr){ const show = typeof crystalRowHtml==="function" && (crystalsOwned().length > 0 || CRYSTAL_BY_ARENA[arena] || arena==="infernal"); cr.innerHTML = show ? crystalRowHtml() + (typeof resonancePickerHtml==="function" ? '<div class="res-wrap">' + resonancePickerHtml() + '</div>' : "") : ""; if(show && typeof resonanceBindPicker==="function") resonanceBindPicker(cr); cr.style.display = show ? "" : "none"; }
}
// Línea del guardián elegido y rótulo del acto (se crean una vez dentro de la tarjeta de la ficha).
function runIntroHeroEl(el){
  let h = el.querySelector(".ri-hero");
  if(!h){
    h = document.createElement("div"); h.className = "ri-hero";
    const say = el.querySelector(".ri-say"); say.parentNode.insertBefore(h, say.nextSibling);
    const a = document.createElement("div"); a.className = "ri-act";
    const ar = el.querySelector(".ri-arena"); ar.parentNode.insertBefore(a, ar);
  }
  return h;
}
function runIntroGo(){
  if(!RUN_INTRO.open) return;
  if(performance.now() - RUN_INTRO.t0 < 450) return; // un toque apurado del botón "Comenzar" no la saltea
  if(RUN_INTRO.prologue){ // pantalla de historia → la siguiente, y al final la ficha de la arena
    RUN_INTRO.pages.shift(); RUN_INTRO.prologue = RUN_INTRO.pages.length > 0; RUN_INTRO.t0 = performance.now();
    runIntroFill(document.getElementById("run-intro"), RUN_INTRO.arena, ARENA_BRIEF[RUN_INTRO.arena]);
    return;
  }
  if(typeof assetsAllReady==="function" && !assetsAllReady()) return; // "Preparando la arena…"
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
