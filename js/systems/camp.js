"use strict";
/* ============================================================
   js/systems/camp.js
   EL CAMPAMENTO DE LOS PORTADORES (reseña del crítico, #30) y LA CRÓNICA LEGIBLE AL LEVANTARLA (#31).
   Textos: js/data/camp-text.js. Canon: docs/lore/LA_HORDA_LORE_BIBLE.md §15.

   CAMPAMENTO — una pantalla entre arena y arena de la campaña (nunca en la Divina ni en la Horda
   Infinita), dibujada con arte que ya existe: el arte de la arena recién ganada (Códice), la fogata de
   la Ciudad, el Hechicero Supremo como proyección dorada en el humo (nunca toca el suelo), el herrero
   (el minero de las Minas, sin el brillo de la corrupción), la vidente (la plañidera de la Ciudad,
   recoloreada en ceniza y violeta) y tu guardián, quieto frente al fuego.
   - Tocás a cada uno y dice su línea (la segunda vez, la que reacciona a tu partida). "Seguir" está
     siempre a la vista: un toque y seguís (Escape/Enter también).
   - Si la arena cierra un acto, el campamento abre con el cartel "FIN DEL ACTO" y su cierre (STORY_ACTS.outro).
   - Todo lo que se escucha queda en el Códice › CRÓNICAS › "Voces del Campamento" (save.campHeard).
   Cuándo aparece:
   - SOLO: en el último paso de la victoria, "Continuar ▶" abre el campamento, y "Seguir" lleva a la Sala
     con la próxima arena elegida (end-screens.js → campOpenFromVictory). "Repetir" o "Menú": sin campamento.
   - COOPERATIVO: cada uno ve SU campamento, local, recién cuando vuelve a la Sala (o al menú) desde la
     victoria (screens.js → campOnState). No traba la vuelta de nadie; si la partida siguiente arranca con
     el campamento abierto, se cierra solo.

   CRÓNICA LEGIBLE — al pisar una página, su texto aparece 3-4 s en una tarjeta (story.js → campChronCard).
   Solo: el tiempo se frena casi del todo mientras se lee (pausa suave). Cooperativo: sin pausa (la
   simulación es de todos). "Leer en el Códice" (solo) abre la página entera, en pergamino, en el lugar;
   en red ese botón no está: la página queda en el Códice para después.
   ============================================================ */
const CAMP = {open:false, pending:null, ctx:null, lines:null, idx:{}, cur:null, onDone:null, raf:0, t0:0, lastState:null, img:{}, spr:{}, sparks:[]};
const CAMP_ORDER = ["seer", "hech", "smith"];

/* ---------------- qué se dice ---------------- */
function _campFill(t, c){ return String(t).replace("{n}", c && c.lost != null ? c.lost : ""); }
function campPostFinal(c){ return !!(c && c.post); }
// Las líneas de este campamento, por personaje. Cada una: {id, who, t, arena}. id = clave del Códice.
function campLines(c){
  const a = c.arena, M = CAMP_LINES[a]; if(!M) return null;
  const L = {hech:[], smith:[], seer:[]};
  const mk = (id, who, t)=>({id, who, t:_campFill(t, c), arena:a});
  // el Hechicero (o, después del final, el humo que repite lo que dijo)
  if(a==="infernal") L.hech.push(mk("infernal_hech", "smoke", M.hech));
  else if(campPostFinal(c)) L.hech.push({id:null, who:"smoke", t:CAMP_SMOKE.replace("{t}", M.hech), arena:a});
  else {
    L.hech.push(mk(a + "_hech", "hech", M.hech));
    if(c.crystals > 0){ const k = c.worn && CAMP_HECH_CRYSTAL[c.worn] ? c.worn : (c.worn ? null : "none"); if(k) L.hech.push(mk("x_hech_" + k, "hech", CAMP_HECH_CRYSTAL[k])); }
  }
  // el herrero: la pista de botín de la arena y lo que ve en tu guardián
  L.smith.push(mk(a + "_smith", "smith", M.smith));
  if(CAMP_SMITH_HERO[c.classKey]) L.smith.push(mk("x_smith_" + c.classKey, "smith", CAMP_SMITH_HERO[c.classKey]));
  // la vidente: la profecía, y los civiles perdidos (Ciudad) o los Guardianes que ya duermen
  L.seer.push(mk(a + "_seer", "seer", M.seer));
  if(a==="ciudad" && c.lost != null) L.seer.push(c.lost > 0 ? mk("x_seer_civ_lost", "seer", CAMP_SEER_CIVILIANS.lost) : mk("x_seer_civ_none", "seer", CAMP_SEER_CIVILIANS.none));
  else if(a==="infernal" || campPostFinal(c)) L.seer.push(mk("x_seer_after", "seer", CAMP_SEER_AFTER));
  else if(a!=="ciudad"){ const n = Math.max(0, Math.min(3, c.crystals|0)); L.seer.push(mk("x_seer_fallen_" + n, "seer", CAMP_SEER_FALLEN[n])); }
  return L;
}
// Todas las claves que pueden quedar en el Códice (para el "N / total").
function campAllIds(){
  const ids = [];
  for(const a of Object.keys(CAMP_LINES)){ ids.push(a==="infernal" ? "infernal_hech" : a + "_hech", a + "_smith", a + "_seer"); }
  Object.keys(CAMP_HECH_CRYSTAL).forEach(k=>ids.push("x_hech_" + k));
  Object.keys(CAMP_SMITH_HERO).forEach(k=>ids.push("x_smith_" + k));
  ids.push("x_seer_civ_lost", "x_seer_civ_none", "x_seer_after");
  CAMP_SEER_FALLEN.forEach((t, n)=>ids.push("x_seer_fallen_" + n));
  return ids;
}
function campHeardSave(){ if(!save.campHeard || typeof save.campHeard!=="object") save.campHeard = {}; return save.campHeard; }
function campHeardCount(){ const H = save.campHeard || {}; return campAllIds().filter(id=>H[id]).length; }
function campRecord(L){
  if(!L || !L.id) return;
  const H = campHeardSave(); if(H[L.id] && H[L.id].t===L.t) return;
  H[L.id] = {t:L.t, w:L.who, a:L.arena, at:Date.now()};
  try{ persist(); }catch(err){}
}

/* ---------------- cuándo aparece ---------------- */
// Pantalla de victoria (story.js → storyVictoryHtml): se anota el campamento de esta victoria con lo que
// pasó en la partida (quién jugó, qué cristal llevaba, cuántos civiles se perdieron en la Ciudad).
function campNoteVictory(vd){
  if(!vd || typeof ARENA_ORDER==="undefined" || !ARENA_ORDER.includes(vd.arena) || !CAMP_LINES[vd.arena]) { CAMP.pending = null; return; }
  if(typeof endlessOn==="function" && endlessOn()){ CAMP.pending = null; return; }
  let lost = null;
  if(vd.arena==="ciudad" && typeof cmS!=="undefined" && cmS) lost = Math.max(0, cmS.lost|0);
  const worn = typeof resonanceChosen==="function" ? resonanceChosen() : null;
  CAMP.pending = {arena:vd.arena, classKey:vd.classKey, lost, worn:worn==="juicio" ? null : worn,
    crystals:typeof crystalsOwned==="function" ? crystalsOwned().length : 0,
    post:vd.arena!=="infernal" && !!(save.arenasCleared && save.arenasCleared.infernal && save.storyEpilogueSeen),
    online:!!((typeof netMatch!=="undefined" && netMatch) || (typeof netInRoom==="function" && netInRoom()))};
}
// SOLO: "Continuar ▶" del último paso de la victoria. Devuelve true si el campamento se hizo cargo.
function campOpenFromVictory(then){
  const P = CAMP.pending; CAMP.pending = null;
  if(!P || P.online) return false;
  campOpen(P, then);
  return true;
}
// Cada cambio de pantalla (screens.js → setState).
function campOnState(s){
  const prev = CAMP.lastState; CAMP.lastState = s;
  if(s!=="playing" && s!=="paused" && typeof chronCardReset==="function") chronCardReset();
  if(s==="playing"){ if(CAMP.open) campClose(true); CAMP.pending = null; return; }
  if(prev==="victory" && s!=="victory"){
    const P = CAMP.pending; CAMP.pending = null;
    // cooperativo: cada uno ve su campamento al volver a la Sala (sin frenar a nadie)
    if(P && P.online && (s==="prep" || s==="mainmenu")) campOpen(P, null);
  }
}

/* ---------------- la pantalla ---------------- */
function campEl(){
  let el = document.getElementById("camp");
  if(el) return el;
  el = document.createElement("div"); el.id = "camp"; el.className = "hidden";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "El Campamento de los Portadores");
  el.innerHTML = `<canvas class="camp-art"></canvas>
    <div class="camp-head"><div class="camp-k">EL CAMPAMENTO DE LOS PORTADORES</div><div class="camp-sub"></div></div>
    <button type="button" class="btn camp-go">Seguir ▸</button>
    ${CAMP_ORDER.map(w=>`<button type="button" class="camp-who" data-camp-who="${w}"><span class="cw-n"></span><span class="cw-r"></span><i class="cw-new" aria-hidden="true"></i></button>`).join("")}
    <div class="camp-box"><div class="camp-box-who"></div><div class="camp-box-t"></div><div class="camp-box-tip">tocá a cada uno para escucharlo</div></div>`;
  document.body.appendChild(el);
  el.querySelector(".camp-go").addEventListener("click", (ev)=>{ ev.stopPropagation(); campClose(); });
  el.querySelectorAll("[data-camp-who]").forEach(b=>b.addEventListener("click", (ev)=>{ ev.stopPropagation(); campTalk(b.dataset.campWho); }));
  el.querySelector(".camp-box").addEventListener("click", ()=>{ if(CAMP.cur && CAMP.cur.act) campTalk("hech"); });
  document.addEventListener("keydown", (e)=>{ if(!CAMP.open) return; if(e.key==="Escape" || e.key==="Enter"){ e.preventDefault(); campClose(); } });
  window.addEventListener("resize", ()=>{ if(CAMP.open) campPlace(); });
  return el;
}
function campOpen(c, onDone){
  const lines = campLines(c); if(!lines){ if(onDone) onDone(); return; }
  const el = campEl();
  CAMP.open = true; CAMP.ctx = c; CAMP.lines = lines; CAMP.idx = {hech:0, smith:0, seer:0}; CAMP.onDone = onDone || null; CAMP.t0 = performance.now();
  CAMP.seen = {}; CAMP.sparks.length = 0;
  campLoadArt(c.arena);
  const A = typeof ARENA_MODS!=="undefined" && ARENA_MODS[c.arena] ? ARENA_MODS[c.arena].label : c.arena;
  const act = typeof storyActClosing==="function" ? storyActClosing(c.arena) : null;
  el.querySelector(".camp-sub").textContent = (act ? "FIN DEL ACTO " + act.n + " · " + act.name + " · " : "") + "tras " + A;
  el.classList.toggle("act-end", !!act);
  el.classList.toggle("post", c.arena==="infernal" || campPostFinal(c));
  for(const w of CAMP_ORDER){
    const b = el.querySelector(`[data-camp-who="${w}"]`), first = lines[w][0], W = CAMP_WHO[first ? first.who : w];
    b.querySelector(".cw-n").textContent = W.name; b.querySelector(".cw-r").textContent = W.role; b.style.setProperty("--wc", W.color);
  }
  el.classList.remove("hidden");
  // abre con el cierre del acto (si lo hay) y, si no, con el Hechicero (o el humo)
  if(act && act.outro) campShow({act:true, who:null, t:act.outro, head:"FIN DEL ACTO " + act.n + " · " + act.name});
  else campTalk("hech");
  campPlace();
  campMarks();
  cancelAnimationFrame(CAMP.raf);
  const cv = el.querySelector(".camp-art");
  const tick = ()=>{ if(!CAMP.open) return; try{ campDraw(cv); }catch(err){} CAMP.raf = requestAnimationFrame(tick); };
  tick();
  if(typeof playSfx==="function") try{ playSfx("ready"); }catch(err){}
}
function campClose(silent){
  if(!CAMP.open) return;
  CAMP.open = false; cancelAnimationFrame(CAMP.raf);
  campEl().classList.add("hidden");
  const fn = CAMP.onDone; CAMP.onDone = null;
  if(!silent && fn) fn();
}
// Tocar a un personaje: su próxima línea (la primera vez, la de la arena; después, la que reacciona).
function campTalk(w){
  const list = CAMP.lines && CAMP.lines[w]; if(!list || !list.length) return;
  const i = CAMP.idx[w] % list.length; CAMP.idx[w] = i + 1;
  campShow(list[i]);
}
function campShow(L){
  const el = campEl(); CAMP.cur = L; CAMP.speakT = performance.now();
  const W = L.who ? CAMP_WHO[L.who] : null;
  const who = el.querySelector(".camp-box-who");
  who.textContent = L.head || (W ? W.name + " · " + W.role : "");
  who.style.color = W ? W.color : "#ffd98a";
  el.querySelector(".camp-box-t").textContent = L.act ? L.t : "«" + L.t + "»";
  el.classList.toggle("act-card", !!L.act);
  const box = el.querySelector(".camp-box"); box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
  if(!L.act){ CAMP.seen[L.id || (L.who + L.t.length)] = 1; campRecord(L); }
  el.querySelectorAll("[data-camp-who]").forEach(b=>b.classList.toggle("talking", !L.act && CAMP.lines[b.dataset.campWho].includes(L)));
  campMarks();
}
// El puntito sobre quien todavía tiene algo para decirte en este campamento.
function campMarks(){
  const el = campEl();
  el.querySelectorAll("[data-camp-who]").forEach(b=>{
    const list = CAMP.lines[b.dataset.campWho] || [];
    b.classList.toggle("has-new", list.some(L=>!CAMP.seen[L.id || (L.who + L.t.length)]));
  });
}

/* ---------------- arte (todo existente: recortado, espejado, recoloreado) ---------------- */
const CAMP_ART = {
  fire:"assets/vfx/ciudad/fogata_0.png",
  hech:"assets/sprites/bosses/infernal/hechicero/portrait.png",
  smith:{src:"assets/sprites/arenas/minas/mn_minero/atlas.png", w:84, h:85, cols:8, frames:[0,1,2,3], feet:0.94},
  seer:{src:"assets/sprites/arenas/ciudad/cm_planidera/atlas.png", w:29, h:61, cols:8, frames:[1,4], feet:0.9}
};
function campImg(src){
  let im = CAMP.img[src];
  if(!im){ im = new Image(); im.src = src; CAMP.img[src] = im; }
  return im.complete && im.naturalWidth ? im : null;
}
function campLoadArt(arena){
  campImg("assets/ui/codex/arenas/" + arena + ".jpg"); campImg(CAMP_ART.fire); campImg(CAMP_ART.hech);
  campImg(CAMP_ART.smith.src); campImg(CAMP_ART.seer.src);
}
// Recolorea los cuadros de un personaje una sola vez (canvas propio por cuadro).
function campFrames(key){
  if(CAMP.spr[key]) return CAMP.spr[key];
  const D = CAMP_ART[key], im = campImg(D.src); if(!im) return null;
  const out = D.frames.map(f=>{
    const c = document.createElement("canvas"); c.width = D.w; c.height = D.h;
    const x = c.getContext("2d"); x.drawImage(im, (f % D.cols)*D.w, Math.floor(f / D.cols)*D.h, D.w, D.h, 0, 0, D.w, D.h);
    const px = x.getImageData(0, 0, D.w, D.h), d = px.data;
    for(let i=0;i<d.length;i+=4){
      if(!d[i+3]) continue;
      let r = d[i], g = d[i+1], b = d[i+2];
      if(key==="seer"){
        // la plañidera de la Ciudad sin la sangre: rojos → ceniza violeta; blancos → gris frío
        if(r > g + 24 && r > b + 16){ const l = (r + g + b)/3; r = l*0.7 + 30; g = l*0.6 + 22; b = l*1.05 + r*0.2 + 40; }
        else { const l = (r + g + b)/3; r = r*0.82 + l*0.1; g = g*0.84 + l*0.1; b = b*0.9 + l*0.22; }
      } else if(key==="smith"){
        // el minero sin la brasa de la corrupción: los naranjas más quemados vuelven a cuero y hollín
        if(r > 180 && g < 150 && b < 90){ r = r*0.72; g = g*0.66; b = b*0.7 + 10; }
      }
      d[i] = Math.min(255, r); d[i+1] = Math.min(255, g); d[i+2] = Math.min(255, b);
    }
    x.putImageData(px, 0, 0);
    return c;
  });
  return (CAMP.spr[key] = out);
}
// La llama de la fogata de la Ciudad sin el resplandor pintado alrededor (ese fondo es opaco en el
// sprite): se vuelven transparentes los pardos oscuros y queda la llama sola.
function campFlame(){
  if(CAMP.spr.fire) return CAMP.spr.fire;
  const im = campImg(CAMP_ART.fire); if(!im) return null;
  const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext("2d"); x.drawImage(im, 0, 0);
  const px = x.getImageData(0, 0, c.width, c.height), d = px.data;
  for(let i=0;i<d.length;i+=4){
    const r = d[i], g = d[i+1], b = d[i+2], L = (r + g + b)/3;
    if(L < 95 && r - g > 6 && b >= g - 2) d[i+3] = 0;
    else if(L < 95 && r - g > 6) d[i+3] = Math.round(d[i+3]*Math.max(0, (L - 40)/55));
  }
  x.putImageData(px, 0, 0);
  return (CAMP.spr.fire = c);
}
// Leña y piedras de la fogata, en píxeles (como la página de las Crónicas en story.js).
function campFirePit(c, x, y, s){
  const u = Math.max(2, Math.round(3*s));
  c.fillStyle = "#2a170a"; c.fillRect(Math.round(x - 9*u), Math.round(y - 2*u), 18*u, 3*u);
  c.fillStyle = "#5a3418"; c.fillRect(Math.round(x - 8*u), Math.round(y - 2*u), 16*u, u);
  c.fillStyle = "#3e2210"; c.fillRect(Math.round(x - 6*u), Math.round(y - 3*u), 5*u, u); c.fillRect(Math.round(x + u), Math.round(y - 3*u), 5*u, u);
  const stones = [-11, -7, 7, 11, -3, 3];
  stones.forEach((k, i)=>{ const sy = y - (i > 3 ? 0 : u) + (Math.abs(k) > 9 ? -u : 0);
    c.fillStyle = "#1a1412"; c.fillRect(Math.round(x + k*u - 1.5*u), Math.round(sy - u), 3*u, 2*u);
    c.fillStyle = "#4a3e38"; c.fillRect(Math.round(x + k*u - 1.5*u), Math.round(sy - u), 3*u, u); });
}
// Dónde va cada uno (en px CSS del lienzo): la misma cuenta ubica los botones.
function campLayout(W, H){
  const s = Math.max(0.7, Math.min(1.6, H/390)), gy = Math.round(H*0.66);
  return {s, gy, seer:{x:W*0.2, y:gy}, hero:{x:W*0.36, y:gy + 2}, fire:{x:W*0.5, y:gy + 4}, hech:{x:W*0.5, y:gy - 58*s}, smith:{x:W*0.7, y:gy + 2}};
}
function campPlace(){
  const el = campEl(), W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight, P = campLayout(W, H);
  const size = {seer:[64, 92], hech:[92, 150], smith:[80, 118]};
  for(const w of CAMP_ORDER){
    const b = el.querySelector(`[data-camp-who="${w}"]`), p = P[w], sz = size[w];
    b.style.left = Math.round(p.x - sz[0]*P.s/2) + "px"; b.style.top = Math.round(p.y - sz[1]*P.s) + "px";
    b.style.width = Math.round(sz[0]*P.s) + "px"; b.style.height = Math.round(sz[1]*P.s) + "px";
  }
}
function campDraw(cv){
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  if(!W || !H) return;
  if(cv.width !== Math.round(W*dpr) || cv.height !== Math.round(H*dpr)){ cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); campPlace(); }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
  const now = performance.now(), t = (now - CAMP.t0)/1000, P = campLayout(W, H), s = P.s, C = CAMP.ctx || {};
  const flick = 0.82 + 0.1*Math.sin(t*7.3) + 0.06*Math.sin(t*13.1 + 1.3);
  // fondo: el arte de la arena recién ganada, lejos y a oscuras
  c.fillStyle = "#070403"; c.fillRect(0, 0, W, H);
  const bg = campImg("assets/ui/codex/arenas/" + C.arena + ".jpg");
  if(bg){
    const k = Math.max(W/bg.naturalWidth, H/bg.naturalHeight)*1.3, bw = bg.naturalWidth*k, bh = bg.naturalHeight*k;
    c.globalAlpha = 0.36; c.imageSmoothingEnabled = true;
    c.drawImage(bg, (W - bw)/2 + Math.sin(t*0.05)*6, (H - bh)/2 - H*0.06, bw, bh);
    c.imageSmoothingEnabled = false; c.globalAlpha = 1;
  }
  let g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(6,3,8,0.92)"); g.addColorStop(0.25, "rgba(6,3,8,0.7)"); g.addColorStop(0.55, "rgba(10,5,4,0.45)"); g.addColorStop(1, "rgba(4,2,2,0.92)");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // el suelo del campamento
  g = c.createLinearGradient(0, P.gy - 20*s, 0, H);
  g.addColorStop(0, "rgba(28,16,10,0)"); g.addColorStop(0.25, "rgba(28,16,10,0.9)"); g.addColorStop(1, "#0b0604");
  c.fillStyle = g; c.fillRect(0, P.gy - 20*s, W, H);
  // la luz de la fogata
  c.globalCompositeOperation = "lighter";
  g = c.createRadialGradient(P.fire.x, P.fire.y - 18*s, 6, P.fire.x, P.fire.y - 18*s, Math.max(W, H)*0.42);
  g.addColorStop(0, `rgba(255,150,60,${0.42*flick})`); g.addColorStop(0.35, `rgba(200,80,30,${0.18*flick})`); g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = "source-over";
  // el Hechicero: proyección dorada en el humo (antes del final). Nunca toca el suelo.
  const hech = campImg(CAMP_ART.hech), post = C.arena==="infernal" || campPostFinal(C);
  const talking = (w)=> CAMP.cur && !CAMP.cur.act && CAMP.lines && CAMP.lines[w] && CAMP.lines[w].includes(CAMP.cur);
  if(hech){
    const hs = 1.25*s, hw = hech.naturalWidth*hs, hh = hech.naturalHeight*hs, hx = P.hech.x - hw/2, hy = P.hech.y - hh + Math.sin(t*1.3)*3*s;
    const a = post ? (talking("hech") ? 0.16 + 0.1*Math.sin(t*2) : 0.05) : (talking("hech") ? 0.62 : 0.4) + 0.08*Math.sin(t*2.1);
    c.globalAlpha = a; c.drawImage(hech, hx, hy, hw, hh);
    c.globalCompositeOperation = "lighter"; c.globalAlpha = a*0.55; c.drawImage(hech, hx, hy, hw, hh);
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  }
  // humo que sube de la fogata y lo envuelve
  for(let i=0;i<14;i++){
    const u = ((t*0.16 + i/14) % 1), x = P.fire.x + Math.sin(u*6 + i*1.7)*16*s*(0.4 + u), y = P.fire.y - 24*s - u*150*s, r = (8 + u*26)*s;
    c.fillStyle = `rgba(${post ? "150,146,140" : "190,170,130"},${0.16*(1 - u)})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
  }
  // la vidente, arrodillada del lado de la sombra
  const seer = campFrames("seer");
  if(seer){ const D = CAMP_ART.seer, f = seer[Math.floor(t*1.6) % seer.length], k = 3.4*s;
    campShadow(c, P.seer.x, P.seer.y, 18*s);
    c.drawImage(f, Math.round(P.seer.x - D.w*k/2), Math.round(P.seer.y - D.h*D.feet*k), Math.round(D.w*k), Math.round(D.h*k)); }
  // tu guardián, quieto frente al fuego
  if(C.classKey && typeof drawChampFigure==="function"){
    campShadow(c, P.hero.x, P.hero.y, 16*s);
    const save0 = c.getTransform();
    try{ drawChampFigure(c, C.classKey, P.hero.x, P.hero.y, 2.1*s, 1, now % 100000, false); }catch(err){}
    c.setTransform(save0);
  }
  // el herrero, mirando al fuego (espejado)
  const smith = campFrames("smith");
  if(smith){ const D = CAMP_ART.smith, f = smith[Math.floor(t*4) % smith.length], k = 1.75*s, w = D.w*k, h = D.h*k;
    campShadow(c, P.smith.x, P.smith.y, 26*s);
    c.save(); c.translate(Math.round(P.smith.x), 0); c.scale(-1, 1); c.drawImage(f, Math.round(-w/2), Math.round(P.smith.y - h*D.feet), Math.round(w), Math.round(h)); c.restore(); }
  // la fogata (el sprite de la Ciudad, con el latido de la llama)
  campFirePit(c, P.fire.x, P.fire.y, s);
  const fire = campFlame();
  if(fire){ const k = 3*s, w = fire.width*k, h = fire.height*k*(0.96 + 0.05*Math.sin(t*9));
    c.drawImage(fire, Math.round(P.fire.x - w/2), Math.round(P.fire.y - h + 7*k), Math.round(w), Math.round(h));
    c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.35*flick; c.drawImage(fire, Math.round(P.fire.x - w/2), Math.round(P.fire.y - h + 7*k), Math.round(w), Math.round(h));
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; }
  // chispas
  if(CAMP.sparks.length < 18 && Math.random() < 0.35) CAMP.sparks.push({x:P.fire.x + (Math.random() - 0.5)*20*s, y:P.fire.y - 30*s, vx:(Math.random() - 0.5)*18, vy:-30 - Math.random()*40, life:1});
  c.globalCompositeOperation = "lighter";
  for(let i=CAMP.sparks.length-1;i>=0;i--){ const p = CAMP.sparks[i]; p.x += p.vx/60*s; p.y += p.vy/60*s; p.life -= 0.012;
    if(p.life <= 0){ CAMP.sparks.splice(i, 1); continue; }
    c.fillStyle = `rgba(255,${160 + Math.round(80*p.life)},80,${p.life})`; c.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(2*s)), Math.max(1, Math.round(2*s))); }
  c.globalCompositeOperation = "source-over";
  // viñeta
  g = c.createRadialGradient(W/2, H*0.55, Math.min(W, H)*0.3, W/2, H*0.55, Math.max(W, H)*0.75);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.7)");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function campShadow(c, x, y, r){ c.fillStyle = "rgba(0,0,0,0.45)"; c.beginPath(); c.ellipse(x, y + 1, r, r*0.32, 0, 0, Math.PI*2); c.fill(); }

/* ============================================================
   CRÓNICA LEGIBLE AL LEVANTARLA (#31)
   ============================================================ */
const CHRON_CARD = {el:null, timer:0, id:null, paused:false, reading:false};
const CHRON_CARD_MS = 3800;
function _ccEsc(s){ return String(s==null ? "" : s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function _ccOnline(){ return !!((typeof netMatch!=="undefined" && netMatch) || (typeof juiceNet==="function" && juiceNet())); }
function chronCardEl(){
  if(CHRON_CARD.el) return CHRON_CARD.el;
  const el = document.createElement("div"); el.id = "chron-card"; el.className = "hidden"; el.setAttribute("role", "status");
  el.innerHTML = `<div class="cc-k"></div><div class="cc-title"></div><div class="cc-t"></div><button type="button" class="cc-read">Leer en el Códice</button>`;
  document.body.appendChild(el);
  el.querySelector(".cc-read").addEventListener("click", (ev)=>{ ev.stopPropagation(); chronReadOpen(CHRON_CARD.id); });
  CHRON_CARD.el = el; return el;
}
// El primer párrafo, cortado en una frase (la tarjeta se lee en 3-4 s).
function chronExcerpt(P){
  const p = String(P.text).split("\n\n")[0].replace(/\n/g, " ");
  if(p.length <= 200) return p;
  const cut = p.slice(0, 200), i = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(": "));
  return (i > 90 ? cut.slice(0, i + 1) : cut.replace(/\s+\S*$/, "")) + " …";
}
// story.js → storyCollect: la página que acabás de levantar.
function campChronCard(id){
  const P = typeof chroniclePage==="function" ? chroniclePage(id) : null; if(!P) return false;
  const B = chronicleBook(P.book), el = chronCardEl();
  el.querySelector(".cc-k").textContent = "CRÓNICA · " + (B ? B.name : "");
  el.querySelector(".cc-title").textContent = "«" + P.title + "»";
  el.querySelector(".cc-t").textContent = chronExcerpt(P);
  // en red la partida no se detiene por nadie: la página entera queda para el Códice, después
  el.querySelector(".cc-read").style.display = _ccOnline() ? "none" : "";
  CHRON_CARD.id = id;
  el.classList.remove("hidden", "out"); void el.offsetWidth; el.classList.add("in"); document.body.classList.add("chron-card-on");
  clearTimeout(CHRON_CARD.timer);
  CHRON_CARD.timer = setTimeout(chronCardHide, CHRON_CARD_MS);
  chronSoftPause(CHRON_CARD_MS);
  return true;
}
function chronCardHide(){
  const el = CHRON_CARD.el; if(!el || el.classList.contains("hidden")) return;
  clearTimeout(CHRON_CARD.timer);
  el.classList.remove("in"); el.classList.add("out"); document.body.classList.remove("chron-card-on");
  setTimeout(()=>{ if(el.classList.contains("out")) el.classList.add("hidden"); }, 320);
  if(!CHRON_CARD.reading) chronSoftPause(0);
}
// Pausa suave (solo): el mundo sigue, pero casi quieto, mientras se lee. En red no se toca el tiempo.
function chronSoftPause(ms){
  if(_ccOnline() || typeof slowMoTimer==="undefined") return;
  if(ms > 0){ slowMoScale = 0.1; slowMoTimer = Math.max(slowMoTimer, ms); CHRON_CARD.paused = true; }
  else if(CHRON_CARD.paused){ slowMoTimer = 0; slowMoScale = 1; CHRON_CARD.paused = false; }
}
// "Leer en el Códice": la página entera en pergamino, en el lugar (solo: con el tiempo detenido).
function chronReadOpen(id){
  const P = chroniclePage(id); if(!P) return;
  let el = document.getElementById("chron-read");
  if(!el){
    el = document.createElement("div"); el.id = "chron-read"; el.className = "hidden"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Crónica");
    el.innerHTML = `<div class="cr-bar"><span class="cr-crumb">CÓDICE › CRÓNICAS</span><button type="button" class="btn cr-close">Volver a la pelea ▸</button></div><div class="cr-body"></div>`;
    document.body.appendChild(el);
    el.querySelector(".cr-close").addEventListener("click", chronReadClose);
    el.addEventListener("click", (ev)=>{ if(ev.target===el) chronReadClose(); });
  }
  const B = chronicleBook(P.book), roman = ["", "I", "II", "III", "IV", "V", "VI"][P.n] || P.n;
  el.querySelector(".cr-body").innerHTML = `<article class="cx-parchment"><div class="cxp-book">${_ccEsc(B.name.toUpperCase())} · ${roman}</div>
    <h2>${_ccEsc(P.title)}</h2>${P.text.split("\n\n").map(t=>`<p>${_ccEsc(t)}</p>`).join("")}<div class="cxp-sign">— ${_ccEsc(B.author)}</div><span class="cxp-seal" aria-hidden="true"></span></article>`;
  el.classList.remove("hidden");
  CHRON_CARD.reading = true;
  chronCardHide();
  if(!_ccOnline() && typeof slowMoTimer!=="undefined"){ slowMoScale = 0.001; slowMoTimer = 1e9; CHRON_CARD.paused = true; }
}
function chronReadClose(){
  const el = document.getElementById("chron-read"); if(el) el.classList.add("hidden");
  if(!CHRON_CARD.reading) return;
  CHRON_CARD.reading = false; chronSoftPause(0);
}
// Si la partida termina con la tarjeta o el pergamino abiertos, se cierran sin dejar el tiempo frenado.
function chronCardReset(){ clearTimeout(CHRON_CARD.timer); if(CHRON_CARD.el) CHRON_CARD.el.classList.add("hidden"); chronReadClose(); chronSoftPause(0); document.body.classList.remove("chron-card-on"); }
