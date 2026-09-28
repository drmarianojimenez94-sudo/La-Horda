"use strict";
/* ============================================================
   js/systems/story.js
   LA HISTORIA JUGANDO: voces de los jefes, Crónicas coleccionables, escenas de salida y el epílogo.
   Los textos están en js/data/story-text.js (canon: docs/lore/LA_HORDA_LORE_BIBLE.md §11-§14).
   - VOCES: cada jefe se presenta (al aparecer su barra: bossHudShow), habla al cambiar de fase
     (bossHudPhase) y al caer (killEnemy → storyOnKill). Usa el cuadro de voz del tutorial (tutSay) con
     otro nombre y otro retrato, en una COLA: una línea por vez, y nunca más de 2 textos en pantalla
     (el cuadro espera si ya están el cartel grande y el del centro, o la guía del jefe). Las líneas viejas
     se descartan: una presentación que no se pudo leer a tiempo no aparece tarde.
   - CRÓNICAS: páginas en el piso de la arena (niveles 4 y 7), que sueltan los subjefes (y rara vez un
     élite) o que se encuentran al completar la arena. Se guardan en save.chronicles y se leen en el
     Códice › CRÓNICAS. No dan poder, oro ni XP: no tocan la economía.
   - PANTALLAS: la victoria muestra las últimas palabras del jefe y la voz de tu guardián (paso 1) y la
     Cicatriz hacia la próxima arena (último paso); la derrota, la voz de tu guardián al caer. Al completar
     la Arena Infernal por primera vez, el EPÍLOGO por pantallas y un post-créditos (se repite desde el Códice).
   Red: la simulación decide (un jugador o el anfitrión). storyVoice y storyPageDrop se repiten en los
   invitados como el resto de los efectos (NET_EVENT_FNS); cada uno junta SUS páginas en SU guardado.
   ============================================================ */
const STORY = {run:null, voiced:{}, q:[], seq:0, gateT:0, gateOk:true, pages:[], lvl:0, subDrop:false};
const STORY_PAGE_PICK_R = 54;
const STORY_ELITE_PAGE_CHANCE = 0.04;
const STORY_WORLD_PAGE_LEVELS = {4:1, 7:1};
const STORY_SRC_LABEL = {world:"aparece en el piso de la arena", sub:"la suelta un subjefe", boss:"se encuentra al completar la arena"};

function _stEsc(s){ return String(s==null ? "" : s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function _stQuiet(fn){ return typeof netQuiet==="function" ? netQuiet(fn) : fn(); } // efectos solo míos (no viajan por la red)
function storyCampaignOn(){
  return typeof currentArena!=="undefined" && typeof ARENA_ORDER!=="undefined" && ARENA_ORDER.includes(currentArena) &&
    !(typeof divinaMode!=="undefined" && divinaMode);
}
function storyEnsureRun(){
  if(typeof runStats==="undefined" || STORY.run === runStats) return;
  STORY.run = runStats; STORY.voiced = {}; STORY.q.length = 0; STORY.pages = []; STORY.lvl = 0; STORY.subDrop = false;
}
function storyWho(w){ if(!w) return STORY_WHO.hech; if(typeof w==="string") return STORY_WHO[w] || {name:w, face:"boss"}; return w; }

/* ============================================================
   CUADRO DE VOZ (cola sobre tutSay)
   ============================================================ */
function storyReadMs(t){ return Math.max(3600, Math.min(9500, 2200 + String(t).length*52)); }
// who: clave de STORY_WHO o {name, face}. o.key: clave persistente (se dice una vez por perfil).
// o.wait: cuánto puede esperar su turno antes de descartarse.
function storySay(who, text, o){
  o = o || {}; storyEnsureRun();
  if(!text || (o.key && typeof tutSeen==="function" && tutSeen(o.key))) return false;
  if(STORY.q.some(x=>x.text===text)) return false;
  const L = {who:storyWho(who), text, key:o.key || null, ms:o.ms || storyReadMs(text), exp:performance.now() + (o.wait || 9000)};
  if(o.front){ let i = 0; while(i < STORY.q.length && STORY.q[i].front) i++; L.front = true; STORY.q.splice(i, 0, L); } // (en orden entre ellas)
  else STORY.q.push(L);
  if(STORY.q.length > 5) STORY.q.shift();
  return true;
}
// Cuántos OTROS textos hay en pantalla: el cartel grande (arenaTitleCard), la guía del jefe y el cartel del centro.
function storyOtherTexts(){
  let n = 0;
  if(typeof _arenaTitleUntil!=="undefined" && performance.now() < _arenaTitleUntil) n++;
  const bi = document.getElementById("boss-intro"); if(bi && !bi.classList.contains("hidden") && !bi.classList.contains("fade")) n++;
  const cb = document.getElementById("center-banner");
  if(cb && cb.classList.contains("show")){
    // recién mostrado arranca con opacidad 0: cuenta mientras su animación siga corriendo
    const run = typeof cb.getAnimations==="function" ? cb.getAnimations().some(a=>a.playState==="running") : parseFloat(getComputedStyle(cb).opacity) > 0.08;
    if(run) n++;
  }
  return n;
}
function storyQueueTick(){
  const q = STORY.q; if(!q.length || typeof tutSay!=="function") return;
  const now = performance.now();
  while(q.length && q[0].exp < now) q.shift();
  if(!q.length) return;
  if(TUT.key && TUT.key.charAt(0)==="~" && now < TUT.until - 250) return; // otra línea todavía se está leyendo
  if(now >= STORY.gateT){ STORY.gateT = now + 200; STORY.gateOk = storyOtherTexts() <= 1; }
  if(!STORY.gateOk) return;
  const L = q.shift();
  tutSay(L.key || ("~" + (++STORY.seq)), L.text, null, L.ms, true, L.who);
  STORY.gateT = 0;
}
// Cada cuadro, desde tutTick (anfitrión e invitado).
function storyTick(){
  storyEnsureRun();
  if(typeof state==="undefined" || state!=="playing" || !player) return;
  storyWorldDrops();
  storyPagesTick();
  storyQueueTick();
}

/* ============================================================
   VOCES DE LOS JEFES
   ============================================================ */
function storyVoiceId(e){
  if(!e || !e.type) return null;
  if(typeof divinaMode!=="undefined" && divinaMode && e.type!=="jinete_sin_cabeza") return null;
  if(e.designKey==="demonio_final" || (e.type==="demonio_mayor" && typeof currentArena!=="undefined" && currentArena==="infernal")) return "rey_horda";
  const id = STORY_VOICE_ALIAS[e.type] || e.type;
  return BOSS_VOICES[id] ? id : null;
}
function storyLines(id, part, n){
  const V = BOSS_VOICES[id]; if(!V) return [];
  let L = part==="phase" ? (V.phase && V.phase[n]) : V[part];
  if(!L) return [];
  if(!Array.isArray(L)) L = [L];
  return L.map(x=> typeof x==="string" ? {who:V.who, t:x} : {who:x.who || V.who, t:x.t});
}
function storySpeak(id, part, n){
  const V = BOSS_VOICES[id]; if(!V) return false;
  const tag = id + ":" + part + (n || "");
  if(STORY.voiced[tag]) return false;
  STORY.voiced[tag] = 1;
  const lines = storyLines(id, part, n);
  // la muerte cierra la forma anterior: pasa adelante de la presentación de la forma que nace (Mago → Demonio)
  lines.forEach((L, i)=> storySay(L.who, L.t, {key:V.once ? "sv_" + tag + "_" + i : null, wait:part==="intro" ? 9000 : 8000, front:part==="death"}));
  return lines.length > 0;
}
// Al aparecer la barra de un jefe/subjefe (boss-hud.js): también corre en los invitados.
function storyBossIntro(e){ storyEnsureRun(); const id = storyVoiceId(e); if(id) storySpeak(id, "intro"); }
// Al cambiar de fase (boss-hud.js → bossHudPhase): la fase 0 es la de entrada.
function storyBossPhase(ph){
  storyEnsureRun();
  if(!(ph > 0) || typeof hudBoss==="undefined" || !hudBoss) return;
  const id = storyVoiceId(hudBoss); if(id) storySpeak(id, "phase", ph);
}
// Evento de red: una línea de un jefe (hoy, su muerte). Lo dispara la simulación.
function storyVoice(id, part){ storyEnsureRun(); if(BOSS_VOICES[id]) storySpeak(id, part); }
// Muerte de un enemigo (combat.js → killEnemy; solo simulación). Una muerte que el jefe "revive"
// (Leviatán, Jinete) no llega acá: killEnemy lo llama solo si quedó muerto de verdad.
function storyOnKill(e){
  if(!e || !e.type) return;
  const id = storyVoiceId(e);
  if(id && storyLines(id, "death").length) storyVoice(id, "death");
  if(!storyCampaignOn()) return;
  if(e.rank==="subjefe" && !STORY.subDrop){ STORY.subDrop = true; storyDropPageNear(e.x, e.y, "sub"); }
  else if(e.rank==="elite" && Math.random() < STORY_ELITE_PAGE_CHANCE) storyDropPageNear(e.x, e.y, "any");
}

/* ============================================================
   CRÓNICAS
   ============================================================ */
function chroniclesSave(){ if(!save.chronicles || typeof save.chronicles!=="object") save.chronicles = {}; return save.chronicles; }
function chronicleHas(id){ return !!(save.chronicles && save.chronicles[id]); }
function chronicleCount(){ return CHRONICLE_PAGES.filter(p=>chronicleHas(p.id)).length; }
function chronicleBook(id){ return CHRONICLE_BOOKS.find(b=>b.id===id) || null; }
function chroniclePage(id){ return CHRONICLE_PAGES.find(p=>p.id===id) || null; }
// La próxima página que este jugador encuentra en `arena` por la vía `src` ("any" = cualquiera que falte).
function storyPageNext(arena, src){
  const miss = CHRONICLE_PAGES.filter(p=>p.arena===arena && !chronicleHas(p.id));
  const m = src==="any" ? miss : miss.filter(p=>p.src===src);
  return m.length ? m[0].id : null;
}
function storyMissingCount(arena, src){ return CHRONICLE_PAGES.filter(p=>p.arena===arena && !chronicleHas(p.id) && (src==="any" || p.src===src)).length; }
// Simulación: suelta una página cerca de (x,y), en un lugar alcanzable (como las pociones).
function storyDropPageNear(x, y, src){
  if(typeof netIsGuest==="function" && netIsGuest()) return;
  const a = Math.random()*Math.PI*2, p = {x:x + Math.cos(a)*50, y:y + Math.sin(a)*50, radius:14};
  try{ clampToArena(p); if(typeof resolveWallCollision==="function") resolveWallCollision(p); clampToArena(p); }catch(err){}
  storyPageDrop(Math.round(p.x), Math.round(p.y), currentArena, src);
}
// Evento de red: aparece una página. Cada cliente la muestra solo si a SU guardado le falta alguna.
function storyPageDrop(x, y, arena, src){
  storyEnsureRun();
  if(!storyPageNext(arena, src)) return;
  const onFloor = STORY.pages.filter(p=>p.arena===arena && (p.src===src || src==="any")).length;
  if(onFloor >= storyMissingCount(arena, src)) return;
  STORY.pages.push({x, y, arena, src, t0:performance.now()});
}
// Simulación: las páginas del piso aparecen al empezar los niveles 4 y 7, cerca del jugador.
function storyWorldDrops(){
  if(typeof runLevel==="undefined" || STORY.lvl === runLevel) return;
  STORY.lvl = runLevel;
  if(!STORY_WORLD_PAGE_LEVELS[runLevel] || !storyCampaignOn() || (typeof netIsGuest==="function" && netIsGuest())) return;
  if(!CHRONICLE_PAGES.some(p=>p.arena===currentArena && p.src==="world")) return;
  const a = Math.random()*Math.PI*2, d = 230 + Math.random()*90;
  storyDropPageNear(player.x + Math.cos(a)*d, player.y + Math.sin(a)*d, "world");
}
function storyPagesTick(){
  if(!STORY.pages.length || !player.alive) return;
  for(let i=STORY.pages.length-1;i>=0;i--){
    const p = STORY.pages[i];
    if(Math.hypot(player.x - p.x, player.y - p.y) < STORY_PAGE_PICK_R){ STORY.pages.splice(i, 1); storyCollect(p); }
  }
}
function storyCollect(p){
  const id = storyPageNext(p.arena, p.src); if(!id) return null;
  chroniclesSave()[id] = Date.now();
  try{ persist(); }catch(err){}
  const P = chroniclePage(id), B = chronicleBook(P.book);
  _stQuiet(()=>{
    if(typeof playSfx==="function") playSfx("crystal");
    if(typeof floatText==="function") floatText(player.x, player.y - 70, "✦ CRÓNICA", "crit");
    if(typeof vfxShock==="function") vfxShock(p.x, p.y, 8, 70, "255,214,140", 520, 2);
  });
  storySay("chron", `Encontraste «${P.title}», de ${B.name}. Leela en el Códice, sección Crónicas.`, {wait:12000, ms:5200});
  return id;
}
// Al completar una arena: la página que "se encuentra al completarla" (una vez, en la pantalla de victoria).
function storyGrantBoss(arena){
  const id = storyPageNext(arena, "boss"); if(!id) return null;
  chroniclesSave()[id] = Date.now();
  try{ persist(); }catch(err){}
  return id;
}
// Página de pergamino dibujada en vivo (pixel art procedural, sin arte nuevo): hoja con esquina doblada,
// renglones y lacre, que flota sobre una columna de luz tenue para verse desde lejos.
function storyPagesDraw(){
  if(!STORY.pages.length || typeof ctx==="undefined") return;
  const t = (typeof animNow!=="undefined" ? animNow : performance.now())/1000;
  ctx.save();
  for(const p of STORY.pages){
    if(typeof inView==="function" && !inView(p.x, p.y, 120)) continue;
    const bob = Math.sin(t*2.4 + p.x*0.013)*4, cy = p.y - 34 + bob, pulse = 0.75 + 0.25*Math.sin(t*3.1 + p.y*0.01);
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(0, p.y - 170, 0, p.y);
    g.addColorStop(0, "rgba(255,214,140,0)"); g.addColorStop(1, `rgba(255,214,140,${0.3*pulse})`);
    ctx.fillStyle = g; ctx.fillRect(p.x - 8, p.y - 170, 16, 170);
    if(typeof glowSprite==="function"){ ctx.globalAlpha = 0.85*pulse; ctx.drawImage(glowSprite("255,210,130"), p.x - 42, cy - 42, 84, 84); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 14, 5, 0, 0, Math.PI*2); ctx.fill();
    const s = 2, w = 11*s, h = 14*s, x0 = Math.round(p.x - w/2), y0 = Math.round(cy - h/2);
    ctx.fillStyle = "#2a170a"; ctx.fillRect(x0 - s, y0 - s, w + 2*s, h + 2*s);            // contorno
    ctx.fillStyle = "#ead6a4"; ctx.fillRect(x0, y0, w, h);                               // hoja
    ctx.fillStyle = "#cdb07a"; ctx.fillRect(x0, y0 + h - 2*s, w, 2*s); ctx.fillRect(x0 + w - 2*s, y0 + 3*s, 2*s, h - 3*s); // sombra de la hoja
    ctx.fillStyle = "#a9844c"; ctx.fillRect(x0 + w - 3*s, y0, 3*s, 3*s);                 // esquina doblada
    ctx.fillStyle = "#2a170a"; ctx.fillRect(x0 + w - 3*s, y0 + 3*s, 3*s, s); ctx.fillRect(x0 + w - 3*s - s, y0, s, 3*s);
    ctx.fillStyle = "#fff4d8"; ctx.fillRect(x0 + s, y0 + s, 3*s, s);                     // brillo
    ctx.fillStyle = "#6b4a28"; for(let i=0;i<4;i++) ctx.fillRect(x0 + 2*s, y0 + (4 + i*2)*s, (i%2 ? 5 : 7)*s, s); // renglones
    ctx.fillStyle = "#8e1b16"; ctx.fillRect(x0 + w - 5*s, y0 + h - 5*s, 3*s, 3*s);       // lacre
    ctx.fillStyle = "#d8453a"; ctx.fillRect(x0 + w - 5*s, y0 + h - 5*s, s, s);
  }
  ctx.restore();
}

/* ============================================================
   PANTALLAS DE FIN DE PARTIDA
   ============================================================ */
function storyArenaLastWords(arena){
  const ck = typeof CRYSTAL_BY_ARENA!=="undefined" ? CRYSTAL_BY_ARENA[arena] : null;
  if(ck && typeof GUARDIAN_LAST_WORDS!=="undefined" && GUARDIAN_LAST_WORDS[ck])
    return {who:CRYSTAL_DEFS[ck].guardian.replace(/^el /, "").toUpperCase(), text:GUARDIAN_LAST_WORDS[ck].replace(/^«|»$/g, "")};
  const id = STORY_ARENA_LAST[arena], L = id ? storyLines(id, "death") : [];
  return L.length ? {who:storyWho(L[0].who).name, text:L[0].t} : null;
}
// Paso 1 de la victoria: las últimas palabras del jefe y la voz de tu guardián. También entrega la página
// "de jefe" de la arena (una vez por victoria) y, la primera vez que cae la Infernal, abre el epílogo.
function storyVictoryHtml(vd){
  if(!vd || typeof ARENA_ORDER==="undefined" || !ARENA_ORDER.includes(vd.arena)) return "";
  if(!vd._story){
    vd._story = {page:storyGrantBoss(vd.arena)};
    if(vd.arena==="infernal" && !save.storyEpilogueSeen) setTimeout(()=>{ if(state==="victory") storyPlayEpilogue(); }, 700);
  }
  const last = storyArenaLastWords(vd.arena), H = HERO_VOICES[vd.classKey], cls = CLASSES[vd.classKey];
  let html = "";
  if(last) html += `<div class="sv-k">LAS ÚLTIMAS PALABRAS · ${_stEsc(last.who)}</div><div class="sv-q">«${_stEsc(last.text)}»</div>`;
  if(H && H.win && cls) html += `<div class="sv-hero" style="--hc:${cls.color||"#ffd98a"}"><b>${_stEsc(cls.name)}</b> «${_stEsc(H.win)}»</div>`;
  return html ? `<div class="story-vic">${html}</div>` : "";
}
// Último paso de la victoria: la escena de salida — la Cicatriz, el Hechicero y la Crónica encontrada.
function storyVictoryScarHtml(vd){
  if(!vd || typeof ARENA_ORDER==="undefined" || !ARENA_ORDER.includes(vd.arena)) return "";
  const S = (typeof CAMPAIGN_STORY!=="undefined" && CAMPAIGN_STORY[vd.arena]) || {}, act = storyActOf(vd.arena);
  let html = `<div class="sv-k">✦ ${act ? "ACTO " + act.n + " · " + act.name + " · " : ""}${vd.arena==="infernal" ? "EL FINAL" : "LA CICATRIZ"}</div>`;
  if(vd.arena==="infernal"){
    html += `<div class="sv-scar">El Rey de la Horda cayó. Los cristales siguen necesitando portadores.</div>`;
    html += `<button class="btn secondary sv-epi" data-story-epilogue>▶ Ver el epílogo</button>`;
  } else {
    // en las arenas de los Guardianes, el Hechicero habla del cristal (lo que antes decía en plena ceremonia)
    const ck = typeof CRYSTAL_BY_ARENA!=="undefined" ? CRYSTAL_BY_ARENA[vd.arena] : null;
    const say = ck && typeof crystalLine==="function" ? crystalLine(ck) : S.say;
    if(S.scar) html += `<div class="sv-scar">${_stEsc(S.scar)}</div>`;
    if(say) html += `<div class="sv-say"><b>EL HECHICERO</b> «${_stEsc(say)}»</div>`;
  }
  const pg = vd._story && vd._story.page ? chroniclePage(vd._story.page) : null;
  if(pg) html += `<div class="sv-chron">✒ Crónica encontrada: <b>«${_stEsc(pg.title)}»</b> · ${_stEsc(chronicleBook(pg.book).name)} <span>(Códice › Crónicas)</span></div>`;
  return `<div class="story-vic scar">${html}</div>`;
}
function storyDefeatHtml(classKey){
  const H = HERO_VOICES[classKey], cls = CLASSES[classKey];
  return H && H.fall && cls ? `<div class="story-def" style="--hc:${cls.color||"#ffd98a"}">«${_stEsc(H.fall)}» <b>— ${_stEsc(cls.name)}</b></div>` : "";
}

/* ============================================================
   EPÍLOGO (pantallas de texto sobre el arte de las arenas)
   ============================================================ */
const STORY_CINE = {open:false, list:null, i:0, t0:0, raf:0, onEnd:null};
function storyPlayEpilogue(){
  save.storyEpilogueSeen = true; try{ persist(); }catch(err){}
  storyPlayCine(STORY_EPILOGUE.concat(STORY_POSTCREDITS));
}
function storyCineEl(){
  let el = document.getElementById("story-cine");
  if(el) return el;
  el = document.createElement("div"); el.id = "story-cine"; el.className = "hidden"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Epílogo");
  el.innerHTML = `<div class="sc-bg"></div><canvas class="sc-art"></canvas><div class="sc-veil"></div>
    <div class="sc-box"><div class="sc-kicker"></div><div class="sc-text"></div><div class="sc-line"><div class="sc-who"></div><div class="sc-say"></div></div><div class="sc-note"></div></div>
    <div class="sc-tap">tocá para seguir</div><button class="sc-skip" type="button">Saltar ▸▸</button>`;
  document.body.appendChild(el);
  el.addEventListener("click", (ev)=>{ if(ev.target.closest(".sc-skip")) storyCineClose(); else storyCineNext(); });
  document.addEventListener("keydown", (e)=>{ if(!STORY_CINE.open) return; if(e.key==="Escape") storyCineClose(); else if(e.key==="Enter" || e.key===" "){ e.preventDefault(); storyCineNext(); } });
  return el;
}
function storyPlayCine(list, onEnd){
  const el = storyCineEl();
  STORY_CINE.open = true; STORY_CINE.list = list; STORY_CINE.i = 0; STORY_CINE.onEnd = onEnd || null;
  el.classList.remove("hidden");
  storyCineShow();
  cancelAnimationFrame(STORY_CINE.raf);
  const cv = el.querySelector(".sc-art");
  const draw = ()=>{ if(!STORY_CINE.open) return; storyCineDraw(cv); STORY_CINE.raf = requestAnimationFrame(draw); };
  draw();
}
function storyCineShow(){
  const el = storyCineEl(), S = STORY_CINE.list[STORY_CINE.i]; if(!S) return;
  STORY_CINE.t0 = performance.now();
  const bg = el.querySelector(".sc-bg");
  const art = S.art && S.art!=="black" && S.art!=="crystals" ? `url('assets/ui/codex/arenas/${S.art}.jpg')` : "none";
  if(bg.dataset.art !== S.art){ bg.dataset.art = S.art || ""; bg.style.backgroundImage = art; bg.classList.remove("pan"); void bg.offsetWidth; bg.classList.add("pan"); }
  el.classList.toggle("final", !!S.final);
  el.querySelector(".sc-kicker").textContent = S.kicker || "";
  el.querySelector(".sc-text").textContent = S.text || "";
  el.querySelector(".sc-who").textContent = S.who || "";
  el.querySelector(".sc-say").textContent = S.say ? "«" + S.say + "»" : "";
  el.querySelector(".sc-line").style.display = S.say ? "" : "none";
  el.querySelector(".sc-note").textContent = S.note || "";
  el.querySelector(".sc-tap").textContent = STORY_CINE.i >= STORY_CINE.list.length - 1 ? "tocá para cerrar" : "tocá para seguir";
  const box = el.querySelector(".sc-box"); box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
}
function storyCineNext(){
  if(!STORY_CINE.open || performance.now() - STORY_CINE.t0 < 700) return; // un toque apurado no saltea una pantalla sin leer
  if(STORY_CINE.i >= STORY_CINE.list.length - 1){ storyCineClose(); return; }
  STORY_CINE.i++; storyCineShow();
}
function storyCineClose(){
  if(!STORY_CINE.open) return;
  STORY_CINE.open = false; cancelAnimationFrame(STORY_CINE.raf);
  storyCineEl().classList.add("hidden");
  const fn = STORY_CINE.onEnd; STORY_CINE.onEnd = null; if(fn) fn();
}
// Arte en vivo: los cuatro cristales (los tres de los Guardianes y el del Juicio) girando en la oscuridad.
function storyCineDraw(cv){
  const S = STORY_CINE.list && STORY_CINE.list[STORY_CINE.i];
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  if(cv.width !== Math.round(W*dpr) || cv.height !== Math.round(H*dpr)){ cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  if(!S || S.art!=="crystals" || typeof crystalDrawGem!=="function") return;
  const t = (performance.now() - STORY_CINE.t0)/1000, cx = W/2, cy = H*0.36, R = Math.min(W, H)*0.2;
  const defs = CRYSTAL_ORDER.map(k=>CRYSTAL_DEFS[k]).concat([CRYSTAL_JUICIO]);
  defs.forEach((D, i)=>{
    const a = i/defs.length*Math.PI*2 + t*0.35, x = cx + Math.cos(a)*R, y = cy + Math.sin(a)*R*0.45;
    const g = c.createRadialGradient(x, y, 2, x, y, 60); g.addColorStop(0, `rgba(${D.rgb},0.55)`); g.addColorStop(1, `rgba(${D.rgb},0)`);
    c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.fillRect(x - 60, y - 60, 120, 120);
    c.globalCompositeOperation = "source-over";
    crystalDrawGem(c, x, y, Math.max(14, R*0.22), D, t*1.6 + i, Math.min(1, t*1.5));
  });
}
document.addEventListener("click", (ev)=>{ if(ev.target && ev.target.closest && ev.target.closest("[data-story-epilogue]")) storyPlayEpilogue(); });

/* ---------------- red: estos eventos se repiten en los invitados ---------------- */
if(typeof NET_EVENT_FNS!=="undefined" && typeof netHookEvents==="function"){
  for(const n of ["storyVoice", "storyPageDrop"]) if(!NET_EVENT_FNS.includes(n)) NET_EVENT_FNS.push(n);
  netHookEvents();
}
